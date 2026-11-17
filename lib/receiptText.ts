// Mengubah teks hasil OCR (di perangkat) menjadi usulan data nota. Murni, tanpa Node/DB, jadi aman dijalankan di browser.
// Heuristik sengaja konservatif: bila tidak yakin, field dikosongkan (user mengisi di pratinjau) alih-alih menebak.
import { toRupiah } from './receiptCore';

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, mei: 5, may: 5, jun: 6, jul: 7, agu: 8, agt: 8, aug: 8, sep: 9, okt: 10, oct: 10, nov: 11, des: 12, dec: 12,
};

const pad = (n: number) => String(n).padStart(2, '0');
function ymd(y: number, m: number, d: number): string | null {
  if (y < 100) y += 2000;
  if (m < 1 || m > 12 || d < 1 || d > 31 || y < 2000 || y > 2100) return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return `${y}-${pad(m)}-${pad(d)}`;
}

// OCR sering salah baca huruf O/l/I di dalam angka; dibetulkan hanya bila menempel pada digit.
function fixDigits(line: string): string {
  let cur = line;
  // Berulang: pada "7O.O4O" huruf O kedua baru menempel pada digit setelah putaran pertama.
  for (let i = 0; i < 4; i++) {
    const next = cur.replace(/(?<=\d[\d.,]*)[Oo](?=[\d.,]|\b)/g, '0').replace(/(?<=\d[\d.,]*)[lI|](?=[\d.,]|\b)/g, '1');
    if (next === cur) break;
    cur = next;
  }
  return cur;
}

export function findDate(text: string): string | null {
  const t = fixDigits(text);
  let m: RegExpExecArray | null;
  const dmy = /(?<!\d)(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2}|\d{4})(?!\d)/g;
  while ((m = dmy.exec(t))) {
    const [d, mo, y] = [Number(m[1]), Number(m[2]), Number(m[3])];
    const r = ymd(y, mo, d) ?? (mo > 12 && d <= 12 ? ymd(y, d, mo) : null); // d/m (Indonesia); tukar bila bulan > 12
    if (r) return r;
  }
  const iso = /(?<!\d)(\d{4})[/.\-](\d{1,2})[/.\-](\d{1,2})(?!\d)/g;
  while ((m = iso.exec(t))) {
    const r = ymd(Number(m[1]), Number(m[2]), Number(m[3]));
    if (r) return r;
  }
  const named = /(?<!\d)(\d{1,2})\s*([A-Za-z]{3,9})\.?\s*(\d{2}|\d{4})(?!\d)/g;
  while ((m = named.exec(t))) {
    const mon = MONTHS[m[2].slice(0, 3).toLowerCase()];
    if (!mon) continue;
    const r = ymd(Number(m[3]), mon, Number(m[1]));
    if (r) return r;
  }
  return null;
}

const AMOUNT_RE = /(?:rp\.?\s*)?(\d{1,3}(?:[.,]\d{3})+(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?)/gi;
const TOTAL_KEY = /(grand\s*total|\btotal\b|jumlah\s*(bayar|total|tagihan)?|tagihan|harus\s*dibayar|amount\s*due|net\s*total|total\s*rp)/i;
// Baris yang memuat kata "total" tetapi BUKAN total akhir yang harus dibayar.
const TOTAL_NOT = /(sub\s*-?\s*total|tunai|cash|kembali|change|kartu|card|debit|kredit|credit|diskon|discount|hemat|ppn|pajak|tax|service|servis|item|qty|barang|poin|point|voucher)/i;

function amountsIn(line: string): number[] {
  const out: number[] = [];
  const t = fixDigits(line);
  for (const m of t.matchAll(AMOUNT_RE)) {
    const r = toRupiah(m[1]);
    if (r && r.value >= 100) out.push(r.value); // abaikan angka kecil (jumlah barang, persen)
  }
  return out;
}

export function findTotal(text: string): number | null {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const candidates: { value: number; grand: boolean }[] = [];
  lines.forEach((line, i) => {
    if (!TOTAL_KEY.test(line) || TOTAL_NOT.test(line.replace(/grand\s*total/i, 'GRAND'))) return;
    // Baris total sejati pendek ("TOTAL 71.040"); kalimat panjang yang kebetulan memuat kata "total" (mis. instruksi tersembunyi) diabaikan.
    if (line.split(/\s+/).filter((w) => /[A-Za-z]{2,}/.test(w)).length > 4) return;
    let amts = amountsIn(line);
    if (amts.length === 0 && lines[i + 1] && !TOTAL_KEY.test(lines[i + 1])) amts = amountsIn(lines[i + 1]); // nominal di baris berikutnya
    if (amts.length) candidates.push({ value: amts[amts.length - 1], grand: /grand\s*total/i.test(line) });
  });
  if (!candidates.length) return null;
  const grand = candidates.filter((c) => c.grand);
  const pool = grand.length ? grand : candidates;
  return Math.max(...pool.map((c) => c.value));
}

export function findMerchant(text: string): string {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).slice(0, 6);
  for (const l of lines) {
    const letters = (l.match(/[A-Za-z]/g) ?? []).length;
    if (letters < 3 || letters < l.replace(/\s/g, '').length / 2) continue; // terlalu banyak angka/simbol
    if (/^(jl\.?|jalan|telp|tel\b|npwp|no\.?|kasir|struk|nota|tanggal|date)/i.test(l)) continue;
    return l.replace(/[^\p{L}\p{N}&.,'\- ]/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, 60);
  }
  return '';
}

const CATEGORY_HINTS: [RegExp, string][] = [
  [/(resto|restoran|cafe|café|kopi|coffee|warung|warteg|bakso|mie|nasi|ayam|pizza|burger|kfc|mcd|starbucks|bakery|roti|makan|food|dapur)/i, 'Makan & Minum'],
  [/(grab|gojek|go-?jek|bluebird|taksi|parkir|spbu|pertamina|shell|bensin|tol|mrt|krl|transjakarta|kereta)/i, 'Transportasi'],
  [/(apotek|apotik|farma|klinik|rumah sakit|\brs\b|dokter|kimia farma|guardian|halodoc)/i, 'Kesehatan'],
  [/(bioskop|cinema|xxi|cgv|game|netflix|spotify|karaoke|tiket)/i, 'Hiburan'],
  [/(sekolah|kursus|buku|gramedia|kampus|spp|les\b)/i, 'Pendidikan'],
  [/(listrik|pln|pdam|telkom|indihome|internet|pulsa|token)/i, 'Tagihan'],
  [/(indomaret|alfamart|alfamidi|supermarket|hypermart|carrefour|transmart|lotte|mall|toko|shopee|tokopedia|minimarket|giant|superindo)/i, 'Belanja'],
];

export function guessCategory(text: string): string {
  // Nama tempat (baris awal) menentukan; isi barang baru dipakai bila nama tempat tidak dikenali.
  const head = text.split(/\r?\n/).slice(0, 3).join(' ');
  for (const [re, cat] of CATEGORY_HINTS) if (re.test(head)) return cat;
  for (const [re, cat] of CATEGORY_HINTS) if (re.test(text)) return cat;
  return '';
}

// Hasil mentah siap diberikan ke normalizeReceipt (dengan allowMissingTotal).
export function parseReceiptText(text: string): { merchant: string; date: string; total: number | null; category: string } {
  return { merchant: findMerchant(text), date: findDate(text) ?? '', total: findTotal(text), category: guessCategory(text) };
}
