import type { Metadata } from 'next';
import Link from 'next/link';
import {
  BarChart3, Wallet, TrendingUp, Target, CreditCard, PieChart, CalendarDays, Bot,
  Landmark, Check, X, ShieldCheck, Lock, KeyRound, Database, Sparkles, Zap, Plus,
  NotebookPen, LineChart, Flag, Smartphone, Languages, MessageCircle, ArrowRight,
} from 'lucide-react';
import AuthCta from './components/landing/AuthCta';
import {
  FREE_FEATURES, PRO_FEATURES, PRICING, YEARLY_SAVING_PERCENT, YEARLY_PER_MONTH, formatRupiah,
} from '@/lib/plans';

export const metadata: Metadata = {
  title: 'FinancePro — Aplikasi Manajemen Keuangan Pribadi untuk Indonesia',
  description:
    'Catat transaksi, pantau utang & investasi, atur budget, dan capai target tabungan dalam satu dashboard berbahasa Indonesia. Mulai gratis.',
  openGraph: {
    title: 'FinancePro — Tahu ke mana uangmu pergi',
    description:
      'Satu tempat untuk transaksi, rekening, utang, investasi, budget, dan goals. Mulai gratis, upgrade PRO mulai Rp29.000/bulan.',
    type: 'website',
    locale: 'id_ID',
    siteName: 'FinancePro',
  },
};

// Kelas Tailwind harus literal agar ter-generate di production build (tidak boleh `bg-${color}-500`).
const TONES = {
  blue:    { box: 'bg-[#3b82f6]/15 ring-[#3b82f6]/30', icon: 'text-[#60a5fa]' },
  emerald: { box: 'bg-[#10b981]/15 ring-[#10b981]/30', icon: 'text-[#34d399]' },
  amber:   { box: 'bg-[#f59e0b]/15 ring-[#f59e0b]/30', icon: 'text-[#fbbf24]' },
  violet:  { box: 'bg-[#8b5cf6]/15 ring-[#8b5cf6]/30', icon: 'text-[#a78bfa]' },
  rose:    { box: 'bg-[#f43f5e]/15 ring-[#f43f5e]/30', icon: 'text-[#fb7185]' },
  cyan:    { box: 'bg-[#06b6d4]/15 ring-[#06b6d4]/30', icon: 'text-[#22d3ee]' },
  indigo:  { box: 'bg-[#6366f1]/15 ring-[#6366f1]/30', icon: 'text-[#818cf8]' },
  green:   { box: 'bg-[#22c55e]/15 ring-[#22c55e]/30', icon: 'text-[#4ade80]' },
  sky:     { box: 'bg-[#0ea5e9]/15 ring-[#0ea5e9]/30', icon: 'text-[#38bdf8]' },
} as const;
type Tone = keyof typeof TONES;

function IconBox({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <div className={`flex h-11 w-11 items-center justify-center rounded-xl ring-1 ${TONES[tone].box} ${TONES[tone].icon}`}>
      {children}
    </div>
  );
}

function SectionHead({ eyebrow, title, desc }: { eyebrow: string; title: React.ReactNode; desc?: string }) {
  return (
    <div className="mx-auto mb-12 max-w-2xl text-center sm:mb-16">
      <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-[#38bdf8]">{eyebrow}</p>
      <h2 className="text-3xl font-extrabold leading-tight tracking-tight text-[#f8fafc] sm:text-4xl">{title}</h2>
      {desc && <p className="mt-4 text-base leading-relaxed text-[#94a3b8] sm:text-lg">{desc}</p>}
    </div>
  );
}

const card = 'rounded-2xl border border-[#1c2942] bg-[#0b1324]/80';

/* ------------------------------ Hero mockup ------------------------------ */

const BARS: [number, number][] = [
  [58, 40], [64, 46], [52, 50], [72, 44], [68, 52], [80, 48],
  [62, 56], [76, 42], [70, 54], [88, 46], [74, 50], [92, 44],
];

function DashboardMockup() {
  return (
    <div className="relative mx-auto mt-16 w-full max-w-5xl sm:mt-20">
      <div className="absolute -inset-x-10 -top-10 bottom-0 -z-10 rounded-[3rem] bg-gradient-to-b from-[#2563eb]/25 via-[#06b6d4]/10 to-transparent blur-3xl" />

      <div className="overflow-hidden rounded-2xl border border-[#243456] bg-[#0a1122] shadow-2xl shadow-[#000000]/60">
        {/* window bar */}
        <div className="flex items-center gap-2 border-b border-[#1c2942] bg-[#0d1628] px-4 py-3">
          <span className="h-3 w-3 rounded-full bg-[#ef4444]/80" />
          <span className="h-3 w-3 rounded-full bg-[#f59e0b]/80" />
          <span className="h-3 w-3 rounded-full bg-[#22c55e]/80" />
          <span className="ml-3 hidden rounded-md bg-[#0a1122] px-3 py-1 text-xs text-[#64748b] sm:block">financepro.grexion.ai/dashboard</span>
          <span className="ml-auto text-[11px] text-[#64748b]">Contoh tampilan</span>
        </div>

        <div className="space-y-4 p-4 sm:p-6">
          {/* KPI */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { l: 'Total Saldo', v: 'Rp48.250.000', d: '+12,4%', c: 'text-[#34d399]' },
              { l: 'Pemasukan', v: 'Rp15.000.000', d: 'bulan ini', c: 'text-[#94a3b8]' },
              { l: 'Pengeluaran', v: 'Rp8.730.000', d: '-5,1%', c: 'text-[#34d399]' },
              { l: 'Tabungan', v: 'Rp6.270.000', d: '42% dari gaji', c: 'text-[#38bdf8]' },
            ].map((k) => (
              <div key={k.l} className="rounded-xl border border-[#1c2942] bg-[#0d1628] p-3 sm:p-4">
                <p className="text-[11px] text-[#64748b] sm:text-xs">{k.l}</p>
                <p className="mt-1 text-sm font-bold text-[#f1f5f9] sm:text-lg">{k.v}</p>
                <p className={`mt-0.5 text-[11px] sm:text-xs ${k.c}`}>{k.d}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-3 lg:grid-cols-5">
            {/* Chart */}
            <div className="rounded-xl border border-[#1c2942] bg-[#0d1628] p-4 lg:col-span-3">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm font-semibold text-[#e2e8f0]">Arus Kas 12 Bulan</p>
                <div className="flex items-center gap-3 text-[11px] text-[#94a3b8]">
                  <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-sm bg-[#3b82f6]" />Masuk</span>
                  <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-sm bg-[#f472b6]" />Keluar</span>
                </div>
              </div>
              <div className="flex h-40 items-end gap-1.5 sm:gap-2.5">
                {BARS.map(([inc, exp], i) => (
                  <div key={i} className="flex h-full flex-1 items-end gap-[3px]">
                    <div className="lp-bar w-1/2 rounded-t bg-gradient-to-t from-[#1d4ed8] to-[#60a5fa]" style={{ height: `${inc}%`, animationDelay: `${0.4 + i * 0.05}s` }} />
                    <div className="lp-bar w-1/2 rounded-t bg-gradient-to-t from-[#be185d] to-[#f472b6]" style={{ height: `${exp}%`, animationDelay: `${0.45 + i * 0.05}s` }} />
                  </div>
                ))}
              </div>
            </div>

            {/* Donut + list */}
            <div className="rounded-xl border border-[#1c2942] bg-[#0d1628] p-4 lg:col-span-2">
              <p className="mb-4 text-sm font-semibold text-[#e2e8f0]">Pengeluaran per Kategori</p>
              <div className="flex items-center gap-5">
                <div
                  className="relative h-28 w-28 shrink-0 rounded-full"
                  style={{ background: 'conic-gradient(#3b82f6 0 38%, #8b5cf6 38% 61%, #f59e0b 61% 78%, #10b981 78% 91%, #f43f5e 91% 100%)' }}
                >
                  <div className="absolute inset-[22%] flex items-center justify-center rounded-full bg-[#0d1628] text-center">
                    <span className="text-[10px] leading-tight text-[#94a3b8]">Total<br /><b className="text-xs text-[#f1f5f9]">8,7 jt</b></span>
                  </div>
                </div>
                <ul className="min-w-0 flex-1 space-y-2 text-xs">
                  {[
                    ['Makan', '38%', 'bg-[#3b82f6]'], ['Transport', '23%', 'bg-[#8b5cf6]'],
                    ['Tagihan', '17%', 'bg-[#f59e0b]'], ['Hiburan', '13%', 'bg-[#10b981]'],
                  ].map(([n, p, c]) => (
                    <li key={n} className="flex items-center gap-2 text-[#cbd5e1]">
                      <i className={`h-2 w-2 shrink-0 rounded-full ${c}`} />
                      <span className="flex-1 truncate">{n}</span>
                      <b className="text-[#f1f5f9]">{p}</b>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* floating chips */}
      <div className="lp-float absolute -left-3 top-24 hidden w-56 rounded-xl border border-[#243456] bg-[#0d1628]/95 p-3.5 shadow-xl shadow-[#000000]/50 backdrop-blur md:block lg:-left-10">
        <div className="mb-2 flex items-center justify-between text-xs">
          <span className="font-semibold text-[#e2e8f0]">Budget Makan</span>
          <span className="text-[#fbbf24]">72%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-[#1c2942]"><div className="h-full w-[72%] rounded-full bg-gradient-to-r from-[#f59e0b] to-[#fbbf24]" /></div>
        <p className="mt-2 text-[11px] text-[#94a3b8]">Sisa Rp560.000 untuk 9 hari</p>
      </div>
      <div className="lp-float-slow absolute -right-3 bottom-16 hidden w-60 rounded-xl border border-[#243456] bg-[#0d1628]/95 p-3.5 shadow-xl shadow-[#000000]/50 backdrop-blur md:block lg:-right-10">
        <div className="mb-2 flex items-center gap-2 text-xs">
          <Flag className="h-3.5 w-3.5 text-[#fb7185]" />
          <span className="font-semibold text-[#e2e8f0]">Dana Darurat</span>
          <span className="ml-auto text-[#34d399]">64%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-[#1c2942]"><div className="h-full w-[64%] rounded-full bg-gradient-to-r from-[#10b981] to-[#34d399]" /></div>
        <p className="mt-2 text-[11px] text-[#94a3b8]">Rp19,2 jt dari target Rp30 jt</p>
      </div>
    </div>
  );
}

/* --------------------------------- Page ---------------------------------- */

const FEATURES: { icon: typeof Wallet; title: string; desc: string; tone: Tone; tag: 'FREE' | 'PRO'; note?: string }[] = [
  { icon: Wallet, title: 'Transaksi', desc: 'Catat pemasukan dan pengeluaran dalam hitungan detik, lengkap dengan kategori, rekening, dan catatan.', tone: 'blue', tag: 'FREE', note: 'Unlimited' },
  { icon: BarChart3, title: 'Dashboard', desc: 'KPI, arus kas, dan kategori terbesar tampil sekilas. Cukup buka, langsung paham kondisi keuanganmu.', tone: 'indigo', tag: 'FREE', note: 'Bulan berjalan' },
  { icon: Landmark, title: 'Rekening & Transfer', desc: 'Bank, e-wallet, dan tunai dalam satu tempat. Pindahkan dana antar rekening tanpa merusak laporan.', tone: 'sky', tag: 'FREE', note: '1 rekening · PRO tak terbatas' },
  { icon: TrendingUp, title: 'Nabung, Investasi & Aset', desc: 'Pantau modal, nilai saat ini, serta untung-rugi tiap instrumen: reksa dana, saham, emas, dan lainnya.', tone: 'emerald', tag: 'PRO' },
  { icon: CreditCard, title: 'Hutang & Piutang', desc: 'Kartu kredit, cicilan, dan pinjaman teman. Lihat sisa pokok dan riwayat pembayaran tanpa lupa.', tone: 'amber', tag: 'PRO' },
  { icon: PieChart, title: 'Budget', desc: 'Tetapkan batas per kategori tiap bulan, lalu pantau sisa anggaranmu sebelum kebablasan.', tone: 'violet', tag: 'PRO' },
  { icon: Target, title: 'Goals', desc: 'Dana darurat, liburan, atau DP rumah. Tentukan target dan tenggat, lihat progresnya bertambah.', tone: 'rose', tag: 'PRO' },
  { icon: CalendarDays, title: 'Laporan Lengkap', desc: 'Ringkasan harian, mingguan, dan bulanan untuk melihat pola kebiasaan finansialmu dari waktu ke waktu.', tone: 'cyan', tag: 'PRO' },
  { icon: Bot, title: 'Telegram Bot', desc: 'Tambah dan lihat transaksi langsung dari chat, tanpa perlu membuka aplikasi.', tone: 'green', tag: 'FREE', note: 'Basic · PRO lengkap' },
];

const BENEFITS: { icon: typeof Wallet; title: string; desc: string; tone: Tone }[] = [
  { icon: LineChart, title: 'Semua di satu tempat', desc: 'Tidak lagi berpindah antara catatan HP, spreadsheet, dan m-banking untuk tahu posisi uangmu.', tone: 'blue' },
  { icon: Languages, title: 'Dibuat untuk Indonesia', desc: 'Bahasa Indonesia, format Rupiah, dan istilah yang kamu pakai sehari-hari: pemasukan, piutang, cicilan.', tone: 'emerald' },
  { icon: Zap, title: 'Cepat dicatat', desc: 'Form ringkas dan input lewat Telegram membuat mencatat tidak terasa seperti tugas tambahan.', tone: 'amber' },
  { icon: Target, title: 'Dari mencatat ke mencapai', desc: 'Bukan sekadar daftar transaksi. Budget dan goals mengubah data jadi keputusan nyata.', tone: 'violet' },
  { icon: Smartphone, title: 'Nyaman di HP dan laptop', desc: 'Tampilan responsif dengan mode gelap dan terang. Buka dari browser mana saja.', tone: 'cyan' },
  { icon: ShieldCheck, title: 'Datamu milikmu', desc: 'Setiap akun terisolasi. Tidak ada iklan dan tidak ada jual-beli data keuanganmu.', tone: 'rose' },
];

const STEPS = [
  { n: '01', icon: KeyRound, title: 'Daftar gratis', desc: 'Buat akun dengan username dan password. Selesai dalam kurang dari satu menit, tanpa kartu kredit.' },
  { n: '02', icon: NotebookPen, title: 'Catat transaksi pertama', desc: 'Masukkan pemasukan dan pengeluaranmu. Kategori dan rekening langsung terbentuk saat dipakai.' },
  { n: '03', icon: LineChart, title: 'Pahami & atur', desc: 'Lihat dashboard, pasang budget, dan tetapkan goals. Upgrade ke PRO kapan pun kamu butuh fitur penuh.' },
];

const SUBSCRIBE_STEPS = [
  { t: 'Daftar akun gratis', d: 'Mulai dari paket FREE. Tidak ada biaya dan tidak ada batas waktu.' },
  { t: 'Pilih PRO di menu Upgrade', d: 'Tentukan paket bulanan atau tahunan, lalu lihat petunjuk pembayaran.' },
  { t: 'Transfer & kirim bukti', d: 'Bayar lewat transfer bank, kemudian kirim bukti pembayaran lewat WhatsApp.' },
  { t: 'Akun PRO aktif', d: 'Diaktifkan maksimal 1×24 jam. Perpanjang manual kapan saja, tanpa tagihan otomatis.' },
];

const FAQ = [
  { q: 'Apakah FinancePro benar-benar gratis?', a: 'Ya. Paket FREE gratis tanpa batas waktu dan sudah mencakup pencatatan transaksi tak terbatas, dashboard bulan berjalan, satu rekening, laporan bulanan sederhana, dan Telegram bot dasar. PRO bersifat opsional.' },
  { q: 'Apa bedanya paket FREE dan PRO?', a: 'FREE cocok untuk mulai mencatat. PRO membuka rekening tak terbatas, laporan harian-mingguan-bulanan, tracker nabung & investasi, hutang & piutang, aset, goals, budget, riwayat tanpa batas, serta semua fitur Telegram bot.' },
  { q: 'Bagaimana cara berlangganan PRO?', a: 'Daftar akun, buka menu Upgrade, lakukan transfer bank, lalu kirim bukti lewat WhatsApp. Admin mengaktifkan akunmu maksimal 1×24 jam. Tidak ada perpanjangan otomatis, jadi kamu yang menentukan kapan memperpanjang.' },
  { q: 'Apa yang terjadi kalau masa PRO saya berakhir?', a: 'Akunmu kembali ke paket FREE. Datamu tetap tersimpan; fitur PRO terkunci sampai kamu memperpanjang.' },
  { q: 'Apakah data keuangan saya aman?', a: 'Data tiap akun dipisahkan dan hanya bisa diakses oleh pemiliknya. Password disimpan dalam bentuk hash, sesi memakai cookie httpOnly, dan percobaan login dibatasi untuk mencegah tebak-tebakan password.' },
  { q: 'Bisa dipakai di HP?', a: 'Bisa. Tampilannya responsif dan nyaman dibuka dari browser HP, lengkap dengan mode gelap dan terang.' },
];

export default function HomePage() {
  return (
    <div className="min-h-screen overflow-x-clip bg-[#060b18] text-[#e8eefc] selection:bg-[#3b82f6]/40">
      {/* ------------------------------ Navbar ------------------------------ */}
      <header className="sticky top-0 z-50 border-b border-[#1c2942]/70 bg-[#060b18]/80 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6" aria-label="Navigasi utama">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#2563eb] to-[#06b6d4] shadow-lg shadow-[#2563eb]/30">
              <BarChart3 className="h-5 w-5 text-[#ffffff]" />
            </span>
            <span className="text-lg font-bold tracking-tight text-[#f8fafc]">FinancePro</span>
          </Link>
          <div className="hidden items-center gap-8 text-sm font-medium text-[#94a3b8] md:flex">
            <a href="#apa" className="transition hover:text-[#f8fafc]">Apa itu</a>
            <a href="#kenapa" className="transition hover:text-[#f8fafc]">Kenapa</a>
            <a href="#fitur" className="transition hover:text-[#f8fafc]">Fitur</a>
            <a href="#harga" className="transition hover:text-[#f8fafc]">Harga</a>
            <a href="#faq" className="transition hover:text-[#f8fafc]">FAQ</a>
          </div>
          <AuthCta variant="nav" />
        </nav>
      </header>

      <main>
        {/* ------------------------------- Hero ------------------------------- */}
        <section className="relative px-4 pb-20 pt-16 sm:px-6 sm:pb-28 sm:pt-24">
          <div className="lp-grid pointer-events-none absolute inset-0 -z-10" />
          <div className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-[#2563eb]/20 blur-[120px]" />

          <div className="mx-auto max-w-4xl text-center">
            <div className="lp-rise inline-flex items-center gap-2 rounded-full border border-[#2563eb]/30 bg-[#2563eb]/10 px-4 py-1.5 text-sm text-[#93c5fd]">
              <Sparkles className="h-4 w-4" />
              Aplikasi keuangan pribadi untuk Indonesia
            </div>
            <h1 className="lp-rise mt-7 text-4xl font-extrabold leading-[1.08] tracking-tight text-[#f8fafc] sm:text-6xl lg:text-7xl" style={{ animationDelay: '0.08s' }}>
              Tahu ke mana uangmu pergi.{' '}
              <span className="bg-gradient-to-r from-[#60a5fa] via-[#22d3ee] to-[#34d399] bg-clip-text text-transparent">
                Atur ke mana ia harus pergi.
              </span>
            </h1>
            <p className="lp-rise mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-[#94a3b8] sm:text-xl" style={{ animationDelay: '0.16s' }}>
              FinancePro menyatukan transaksi, rekening, utang, investasi, budget, dan target tabunganmu dalam satu
              dashboard yang rapi. Dalam Bahasa Indonesia dan format Rupiah.
            </p>
            <div className="lp-rise mt-10 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center sm:gap-4" style={{ animationDelay: '0.24s' }}>
              <AuthCta variant="hero" />
            </div>
            <ul className="lp-rise mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-[#94a3b8]" style={{ animationDelay: '0.32s' }}>
              {['Gratis tanpa batas waktu', 'Tanpa kartu kredit', 'Siap dipakai dalam 1 menit'].map((t) => (
                <li key={t} className="flex items-center gap-2"><Check className="h-4 w-4 text-[#34d399]" />{t}</li>
              ))}
            </ul>
          </div>

          <DashboardMockup />
        </section>

        {/* ----------------------------- 1. Apa itu ----------------------------- */}
        <section id="apa" className="scroll-mt-20 px-4 py-20 sm:px-6 sm:py-28">
          <div className="mx-auto max-w-6xl">
            <SectionHead
              eyebrow="1 · Apa itu FinancePro"
              title={<>Satu tempat untuk <span className="text-[#38bdf8]">seluruh keuanganmu</span></>}
              desc="FinancePro adalah aplikasi web manajemen keuangan pribadi. Kamu mencatat, FinancePro merangkum: saldo semua rekening, arus kas, sisa utang, nilai investasi, hingga progres target tabungan."
            />
            <div className="grid gap-5 md:grid-cols-3">
              {[
                { icon: NotebookPen, tone: 'blue' as Tone, t: 'Catat', d: 'Setiap pemasukan dan pengeluaran tersimpan rapi dengan kategori, rekening, dan tanggal. Cepat, tanpa ribet.' },
                { icon: LineChart, tone: 'emerald' as Tone, t: 'Pahami', d: 'Dashboard dan laporan otomatis menunjukkan ke mana uangmu mengalir dan kategori mana yang paling boros.' },
                { icon: Flag, tone: 'violet' as Tone, t: 'Capai', d: 'Pasang budget dan goals. Pantau progresnya sampai dana darurat, liburan, atau cicilan lunas.' },
              ].map((p) => (
                <div key={p.t} className={`${card} p-7 transition hover:-translate-y-1 hover:border-[#2d4270]`}>
                  <IconBox tone={p.tone}><p.icon className="h-5 w-5" /></IconBox>
                  <h3 className="mt-5 text-xl font-bold text-[#f8fafc]">{p.t}</h3>
                  <p className="mt-2 leading-relaxed text-[#94a3b8]">{p.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ------------------------------ 2. Kenapa ------------------------------ */}
        <section id="kenapa" className="scroll-mt-20 border-y border-[#1c2942]/70 bg-[#080f20] px-4 py-20 sm:px-6 sm:py-28">
          <div className="mx-auto max-w-6xl">
            <SectionHead
              eyebrow="2 · Kenapa harus FinancePro"
              title={<>Gaji selalu habis, <span className="text-[#38bdf8]">tapi habis ke mana?</span></>}
              desc="Kebanyakan orang bukan boros. Mereka hanya tidak punya gambaran yang jelas. Itulah yang diselesaikan FinancePro."
            />

            <div className="mb-14 grid gap-5 lg:grid-cols-2">
              <div className="rounded-2xl border border-[#3b1d2a] bg-[#1a0c14]/60 p-7">
                <p className="mb-5 text-sm font-semibold uppercase tracking-wider text-[#fb7185]">Tanpa sistem</p>
                <ul className="space-y-4">
                  {[
                    'Tidak tahu uang habis ke mana di akhir bulan',
                    'Catatan tersebar di notes, spreadsheet, dan ingatan',
                    'Lupa sisa cicilan dan utang yang masih berjalan',
                    'Menabung tanpa target dan tenggat yang jelas',
                  ].map((t) => (
                    <li key={t} className="flex gap-3 text-[#cbd5e1]"><X className="mt-0.5 h-5 w-5 shrink-0 text-[#fb7185]" />{t}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border border-[#14532d]/70 bg-[#07170f]/60 p-7">
                <p className="mb-5 text-sm font-semibold uppercase tracking-wider text-[#4ade80]">Dengan FinancePro</p>
                <ul className="space-y-4">
                  {[
                    'Tahu persis kategori mana yang paling menguras dompet',
                    'Semua transaksi, rekening, dan aset di satu dashboard',
                    'Sisa utang dan riwayat pembayaran selalu terlihat',
                    'Goals dengan progres nyata yang bisa kamu kejar',
                  ].map((t) => (
                    <li key={t} className="flex gap-3 text-[#e2e8f0]"><Check className="mt-0.5 h-5 w-5 shrink-0 text-[#4ade80]" />{t}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {BENEFITS.map((b) => (
                <div key={b.title} className={`${card} p-6 transition hover:-translate-y-1 hover:border-[#2d4270]`}>
                  <IconBox tone={b.tone}><b.icon className="h-5 w-5" /></IconBox>
                  <h3 className="mt-4 text-lg font-bold text-[#f8fafc]">{b.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-[#94a3b8]">{b.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ------------------------------- Fitur ------------------------------- */}
        <section id="fitur" className="scroll-mt-20 px-4 py-20 sm:px-6 sm:py-28">
          <div className="mx-auto max-w-6xl">
            <SectionHead
              eyebrow="Fitur lengkap"
              title={<>Semua yang kamu butuhkan untuk <span className="text-[#38bdf8]">mengelola uang</span></>}
              desc="Mulai dari pencatatan dasar yang gratis, sampai alat perencanaan lengkap di paket PRO."
            />
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f) => (
                <div key={f.title} className={`${card} group relative p-6 transition hover:-translate-y-1 hover:border-[#2d4270]`}>
                  <div className="flex items-start justify-between">
                    <IconBox tone={f.tone}><f.icon className="h-5 w-5" /></IconBox>
                    {f.tag === 'PRO' ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-[#f59e0b] to-[#f97316] px-2.5 py-1 text-[11px] font-bold text-[#ffffff]">
                        <Zap className="h-3 w-3" />PRO
                      </span>
                    ) : (
                      <span className="rounded-full border border-[#1f6f4a] bg-[#10b981]/10 px-2.5 py-1 text-[11px] font-bold text-[#34d399]">GRATIS</span>
                    )}
                  </div>
                  <h3 className="mt-4 text-lg font-bold text-[#f8fafc]">{f.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-[#94a3b8]">{f.desc}</p>
                  {f.note && <p className="mt-3 text-xs font-medium text-[#64748b]">{f.note}</p>}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ----------------------------- Cara kerja ----------------------------- */}
        <section className="border-y border-[#1c2942]/70 bg-[#080f20] px-4 py-20 sm:px-6 sm:py-28">
          <div className="mx-auto max-w-6xl">
            <SectionHead eyebrow="Cara kerja" title={<>Mulai dalam <span className="text-[#38bdf8]">3 langkah</span></>} />
            <div className="relative grid gap-6 md:grid-cols-3">
              <div className="pointer-events-none absolute left-[16%] right-[16%] top-9 hidden h-px bg-gradient-to-r from-transparent via-[#2d4270] to-transparent md:block" />
              {STEPS.map((s) => (
                <div key={s.n} className="relative text-center">
                  <div className="relative mx-auto flex h-[72px] w-[72px] items-center justify-center rounded-2xl border border-[#2d4270] bg-[#0b1324] shadow-lg shadow-[#2563eb]/10">
                    <s.icon className="h-7 w-7 text-[#60a5fa]" />
                    <span className="absolute -right-2 -top-2 rounded-full bg-gradient-to-r from-[#2563eb] to-[#06b6d4] px-2 py-0.5 text-[11px] font-bold text-[#ffffff]">{s.n}</span>
                  </div>
                  <h3 className="mt-5 text-lg font-bold text-[#f8fafc]">{s.title}</h3>
                  <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-[#94a3b8]">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* -------------------------- 3. Harga & langganan -------------------------- */}
        <section id="harga" className="relative scroll-mt-20 px-4 py-20 sm:px-6 sm:py-28">
          <div className="pointer-events-none absolute left-1/2 top-40 -z-10 h-[420px] w-[700px] -translate-x-1/2 rounded-full bg-[#f59e0b]/10 blur-[120px]" />
          <div className="mx-auto max-w-5xl">
            <SectionHead
              eyebrow="3 · Harga & langganan"
              title={<>Mulai gratis. <span className="text-[#fbbf24]">Upgrade saat siap.</span></>}
              desc="Tanpa kontrak, tanpa perpanjangan otomatis. Bayar hanya kalau kamu butuh fitur lengkap."
            />

            <div className="grid items-stretch gap-6 md:grid-cols-2">
              {/* FREE */}
              <div className={`${card} flex flex-col p-8`}>
                <h3 className="text-lg font-bold text-[#f8fafc]">Free</h3>
                <p className="mt-1 text-sm text-[#94a3b8]">Untuk mulai mencatat keuangan</p>
                <p className="mt-6 flex items-baseline gap-1.5">
                  <span className="text-5xl font-extrabold tracking-tight text-[#f8fafc]">Rp0</span>
                  <span className="text-[#94a3b8]">selamanya</span>
                </p>
                <ul className="mt-8 flex-1 space-y-3.5">
                  {FREE_FEATURES.map((f) => (
                    <li key={f} className="flex gap-3 text-sm text-[#cbd5e1]"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#94a3b8]" />{f}</li>
                  ))}
                </ul>
                <Link href="/register" className="mt-8 inline-flex items-center justify-center rounded-xl border border-[#2a3a5c] bg-[#0d1526] py-3.5 font-semibold text-[#e8eefc] transition hover:border-[#3b82f6]/60 hover:bg-[#13203a]">
                  Daftar Gratis
                </Link>
              </div>

              {/* PRO */}
              <div className="relative flex flex-col rounded-2xl border border-[#f59e0b]/50 bg-gradient-to-b from-[#f59e0b]/10 via-[#0b1324] to-[#0b1324] p-8 shadow-2xl shadow-[#f59e0b]/10">
                <span className="absolute -top-3.5 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-gradient-to-r from-[#f59e0b] to-[#f97316] px-4 py-1.5 text-xs font-bold text-[#ffffff] shadow-lg shadow-[#f59e0b]/30">
                  <Zap className="h-3.5 w-3.5" />PALING POPULER
                </span>
                <h3 className="text-lg font-bold text-[#f8fafc]">PRO</h3>
                <p className="mt-1 text-sm text-[#94a3b8]">Kontrol penuh atas seluruh keuanganmu</p>

                <p className="mt-6 flex items-baseline gap-1.5">
                  <span className="text-5xl font-extrabold tracking-tight text-[#f8fafc]">{formatRupiah(PRICING.proMonthly)}</span>
                  <span className="text-[#94a3b8]">/ bulan</span>
                </p>
                <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-[#f59e0b]/30 bg-[#f59e0b]/10 px-4 py-3">
                  <div>
                    <p className="text-sm text-[#e2e8f0]">Paket tahunan <b className="text-[#fbbf24]">{formatRupiah(PRICING.proYearly)}</b> / tahun</p>
                    <p className="text-xs text-[#94a3b8]">Setara {formatRupiah(YEARLY_PER_MONTH)} per bulan</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-[#fbbf24] px-2.5 py-1 text-xs font-extrabold text-[#451a03]">HEMAT {YEARLY_SAVING_PERCENT}%</span>
                </div>

                <ul className="mt-8 flex-1 space-y-3.5">
                  {PRO_FEATURES.map((f) => (
                    <li key={f} className="flex gap-3 text-sm text-[#e2e8f0]"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#fbbf24]" />{f}</li>
                  ))}
                </ul>
                <Link href="/register" className="mt-8 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#f59e0b] to-[#f97316] py-3.5 font-semibold text-[#ffffff] shadow-lg shadow-[#f59e0b]/25 transition hover:brightness-110">
                  Mulai lalu Upgrade ke PRO <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            {/* Cara berlangganan */}
            <div className={`${card} mt-14 p-8 sm:p-10`}>
              <h3 className="text-xl font-bold text-[#f8fafc]">Bagaimana cara berlangganan?</h3>
              <p className="mt-1 text-sm text-[#94a3b8]">Sederhana, jelas, dan tanpa tagihan otomatis.</p>
              <ol className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {SUBSCRIBE_STEPS.map((s, i) => (
                  <li key={s.t} className="relative">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#2563eb] to-[#06b6d4] text-sm font-bold text-[#ffffff]">{i + 1}</span>
                    <p className="mt-3 font-semibold text-[#f8fafc]">{s.t}</p>
                    <p className="mt-1 text-sm leading-relaxed text-[#94a3b8]">{s.d}</p>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* ------------------------------ Keamanan ------------------------------ */}
        <section className="border-y border-[#1c2942]/70 bg-[#080f20] px-4 py-20 sm:px-6 sm:py-28">
          <div className="mx-auto max-w-6xl">
            <SectionHead
              eyebrow="Keamanan & privasi"
              title={<>Datamu <span className="text-[#38bdf8]">hanya milikmu</span></>}
              desc="Data keuangan itu sensitif. Karena itu keamanan dirancang sejak awal, bukan tambahan belakangan."
            />
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { icon: Database, tone: 'blue' as Tone, t: 'Terisolasi per akun', d: 'Setiap data terikat ke akunmu. Pengguna lain tidak bisa melihat atau mengubahnya.' },
                { icon: Lock, tone: 'emerald' as Tone, t: 'Password ter-hash', d: 'Password disimpan dengan hashing bcrypt, tidak pernah dalam bentuk teks asli.' },
                { icon: KeyRound, tone: 'amber' as Tone, t: 'Sesi aman', d: 'Login memakai cookie httpOnly sehingga token tidak bisa dibaca skrip di halaman.' },
                { icon: ShieldCheck, tone: 'violet' as Tone, t: 'Anti tebak password', d: 'Percobaan login dibatasi otomatis untuk menghentikan serangan brute-force.' },
              ].map((s) => (
                <div key={s.t} className={`${card} p-6`}>
                  <IconBox tone={s.tone}><s.icon className="h-5 w-5" /></IconBox>
                  <h3 className="mt-4 font-bold text-[#f8fafc]">{s.t}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-[#94a3b8]">{s.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* -------------------------------- FAQ -------------------------------- */}
        <section id="faq" className="scroll-mt-20 px-4 py-20 sm:px-6 sm:py-28">
          <div className="mx-auto max-w-3xl">
            <SectionHead eyebrow="FAQ" title={<>Pertanyaan yang <span className="text-[#38bdf8]">sering ditanyakan</span></>} />
            <div className="space-y-3">
              {FAQ.map((f) => (
                <details key={f.q} className={`${card} group px-6 py-5 open:border-[#2d4270]`}>
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-[#f8fafc] [&::-webkit-details-marker]:hidden">
                    {f.q}
                    <Plus className="h-5 w-5 shrink-0 text-[#60a5fa] transition-transform group-open:rotate-45" />
                  </summary>
                  <p className="mt-3 leading-relaxed text-[#94a3b8]">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ------------------------------ CTA akhir ------------------------------ */}
        <section className="px-4 pb-20 sm:px-6 sm:pb-28">
          <div className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl border border-[#2d4270] bg-gradient-to-br from-[#10234d] via-[#0b1730] to-[#0a1f2e] px-6 py-16 text-center sm:px-12 sm:py-20">
            <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-[#06b6d4]/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-[#2563eb]/25 blur-3xl" />
            <div className="relative">
              <h2 className="mx-auto max-w-2xl text-3xl font-extrabold leading-tight tracking-tight text-[#f8fafc] sm:text-5xl">
                Mulai ambil kendali keuanganmu hari ini
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-lg text-[#b6c4e0]">
                Gratis untuk memulai. Satu menit untuk daftar. Setiap rupiah yang kamu catat membuat keputusan besok lebih baik.
              </p>
              <div className="mt-9 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center sm:gap-4">
                <AuthCta variant="final" />
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ------------------------------- Footer ------------------------------- */}
      <footer className="border-t border-[#1c2942]/70 px-4 py-12 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 md:flex-row">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#2563eb] to-[#06b6d4]">
              <BarChart3 className="h-4 w-4 text-[#ffffff]" />
            </span>
            <span className="font-bold text-[#f8fafc]">FinancePro</span>
          </div>
          <nav className="flex flex-wrap items-center justify-center gap-x-7 gap-y-2 text-sm text-[#94a3b8]" aria-label="Footer">
            <a href="#fitur" className="transition hover:text-[#f8fafc]">Fitur</a>
            <a href="#harga" className="transition hover:text-[#f8fafc]">Harga</a>
            <a href="#faq" className="transition hover:text-[#f8fafc]">FAQ</a>
            <Link href="/login" className="transition hover:text-[#f8fafc]">Masuk</Link>
            <Link href="/register" className="transition hover:text-[#f8fafc]">Daftar</Link>
            <a href="mailto:hello@grexion.ai" className="inline-flex items-center gap-1.5 transition hover:text-[#f8fafc]"><MessageCircle className="h-4 w-4" />Kontak</a>
          </nav>
          <p className="text-sm text-[#64748b]">&copy; {new Date().getFullYear()} FinancePro. Dibuat di Indonesia.</p>
        </div>
      </footer>
    </div>
  );
}
