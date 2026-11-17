// Uji chatbot pencatat Telegram (T-OWN-6), DI DALAM PROSES: bot dijalankan lewat bot.handleUpdate dengan API Telegram dan
// penyedia AI TIRUAN. Tidak memanggil Telegram/AI sungguhan. Butuh DB di .env (data uji berawalan uji_bot_ dihapus otomatis).
//   npm run test:bot
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import bcrypt from 'bcryptjs';
import prisma from '../../lib/db';
import { createBot } from '../../lib/telegramBot';
import { seedDefaultCategories } from '../../lib/onboarding';

const PORT = 9997;
const TOKEN = '123:fake';
const run = Date.now().toString(36);
const JPEG = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0, 16, 0x4a, 0x46, 0x49, 0x46, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0, 0xff, 0xd9]);

// ---------- server tiruan (file Telegram + penyedia AI kompatibel-OpenAI) ----------
let llmMode: 'ok' | 'down' | 'evil' = 'ok';
let llmCalls = 0;
let photoBytes: Uint8Array = JPEG;
const server = http.createServer((req, res) => {
  const chunks: Buffer[] = [];
  req.on('data', (c) => chunks.push(c));
  req.on('end', () => {
    if (req.url?.startsWith(`/file/bot${TOKEN}/`)) { res.setHeader('Content-Type', 'image/jpeg'); return res.end(Buffer.from(photoBytes)); }
    if (req.url === '/chat/completions') {
      llmCalls++;
      const body = JSON.parse(Buffer.concat(chunks).toString());
      const isImage = JSON.stringify(body).includes('image_url');
      res.setHeader('Content-Type', 'application/json');
      if (llmMode === 'down') { res.statusCode = 503; return res.end('{}'); }
      const out = isImage
        ? { merchant: 'Toko Fake', date: '2026-11-16', total: 48500, category: 'Belanja' }
        : llmMode === 'evil'
          ? { type: 'Pengeluaran', amount: 77000, description: 'Beli sesuatu', category: 'Kategori Karangan', account: 'Rekening Karangan', date: '2099-01-01' }
          : { type: 'Pengeluaran', amount: 25000, description: 'Makan siang', category: 'Makan & Minum', account: 'BCA', date: '' };
      return res.end(JSON.stringify({ choices: [{ message: { content: JSON.stringify(out) } }] }));
    }
    res.statusCode = 404; res.end();
  });
});

// ---------- bot dengan API Telegram tiruan ----------
const sent: { chat: number; method: string; text: string; markup?: any }[] = [];
const bot = createBot({
  token: TOKEN, apiRoot: `http://localhost:${PORT}`,
  botInfo: { id: 1, is_bot: true, first_name: 'T', username: 'tbot', can_join_groups: true, can_read_all_group_messages: false, supports_inline_queries: false, can_connect_to_business: false, has_main_web_app: false } as any,
  transformer: async (_p, method, payload: any) => {
    if (method === 'getFile') return { ok: true, result: { file_id: payload.file_id, file_unique_id: 'u', file_path: 'photos/n.jpg' } } as any;
    if (method === 'sendMessage') sent.push({ chat: payload.chat_id, method, text: payload.text, markup: payload.reply_markup });
    return { ok: true, result: method === 'sendMessage' ? { message_id: 1, date: 0, chat: { id: payload.chat_id, type: 'private' } } : true } as any;
  },
});

let uid = 5000;
const msgBase = (chat: number, extra: object) => ({ update_id: ++uid, message: { message_id: uid, date: 0, chat: { id: chat, type: 'private' }, from: { id: chat, is_bot: false, first_name: 'x' }, ...extra } });
async function say(chat: number, text: string) { sent.length = 0; await bot.handleUpdate(msgBase(chat, { text }) as any); return sent.map((s) => s.text).join('\n'); }
async function photo(chat: number, size = 1000) { sent.length = 0; await bot.handleUpdate(msgBase(chat, { photo: [{ file_id: 'f1', file_unique_id: 'u1', width: 10, height: 10, file_size: size }] }) as any); return sent.map((s) => s.text).join('\n'); }
async function tap(chat: number, data: string) {
  sent.length = 0;
  await bot.handleUpdate({ update_id: ++uid, callback_query: { id: String(uid), from: { id: chat, is_bot: false, first_name: 'x' }, chat_instance: 'c', data, message: { message_id: 1, date: 0, chat: { id: chat, type: 'private' } } } } as any);
  return sent.map((s) => s.text).join('\n');
}

const CA = 920001, CF = 920002, CX = 920003;
let proId = '', freeId = '';
const setProvider = (p: string | null) => {
  if (p === null) { delete process.env.RECEIPT_PROVIDER; return; }
  process.env.RECEIPT_PROVIDER = p; process.env.RECEIPT_API_BASE = `http://localhost:${PORT}`; process.env.RECEIPT_API_KEY = 'fake';
};

before(async () => {
  await new Promise<void>((r) => server.listen(PORT, r));
  const pw = await bcrypt.hash('x', 4);
  const pro = await prisma.user.create({ data: { username: `uji_bot_pro_${run}`, password: pw, plan: 'PRO', email: `b1_${run}@t.test`, telegramChatId: String(CA) } });
  const free = await prisma.user.create({ data: { username: `uji_bot_free_${run}`, password: pw, plan: 'FREE', email: `b2_${run}@t.test`, telegramChatId: String(CF) } });
  proId = pro.id; freeId = free.id;
  await seedDefaultCategories(proId); await seedDefaultCategories(freeId);
  await prisma.account.createMany({ data: [{ userId: proId, name: 'Tunai' }, { userId: proId, name: 'BCA' }] });
});
after(async () => {
  server.close();
  await prisma.user.deleteMany({ where: { username: { startsWith: 'uji_bot_' } } });
  await prisma.$disconnect();
});

const txs = () => prisma.transaction.findMany({ where: { userId: proId }, include: { category: true, account: true }, orderBy: { createdAt: 'asc' } });
const pendingOf = async (id: string) => (await prisma.user.findUnique({ where: { id }, select: { telegramPending: true } }))?.telegramPending;

test('chat asing: hanya diberi petunjuk menautkan akun, tanpa membaca/menulis data apa pun', async () => {
  setProvider(null);
  assert.ok((await say(CX, 'makan siang 25rb')).includes('belum terhubung'));
  assert.ok((await photo(CX)).includes('belum terhubung'));
  assert.equal(await tap(CX, 'ai:save'), '', 'tombol dari chat asing: tidak ada efek');
  assert.equal((await txs()).length, 0, 'tidak ada transaksi yang tercipta');
});

test('akun FREE: kalimat bebas dan foto mengarah ke PRO, tidak ada draf', async () => {
  const r = await say(CF, 'makan siang 25rb');
  assert.ok(r.includes('PRO'), r);
  assert.equal(await pendingOf(freeId), null);
  assert.ok((await photo(CF)).includes('PRO'));
});

test('PRO + tanpa AI: parser aturan menyusun draf, tidak menyimpan sebelum konfirmasi', async () => {
  setProvider(null);
  const r = await say(CA, 'makan siang 25rb pakai BCA');
  assert.ok(r.includes('Simpan transaksi ini?') && r.includes('Rp25.000') && r.includes('BCA') && r.includes('Makan &amp; Minum'), r);
  assert.deepEqual(sent[0].markup.inline_keyboard[0].map((b: any) => b.callback_data), ['ai:save', 'ai:cancel']);
  assert.equal((await txs()).length, 0, 'belum disimpan');
  assert.ok((await pendingOf(proId))?.startsWith('ai:'));
});

test('konfirmasi menyimpan tepat satu transaksi; klik ganda tidak menggandakan', async () => {
  const ok = await tap(CA, 'ai:save');
  assert.ok(ok.includes('Tersimpan'), ok);
  const t = await txs();
  assert.equal(t.length, 1);
  assert.deepEqual([t[0].amount, t[0].type, t[0].category.name, t[0].account.name], [25000, 'Pengeluaran', 'Makan & Minum', 'BCA']);
  assert.equal((await prisma.account.findFirst({ where: { userId: proId, name: 'BCA' } }))!.balance, -25000);
  assert.equal(await tap(CA, 'ai:save'), '', 'klik kedua: tidak ada balasan simpan');
  assert.equal((await txs()).length, 1, 'tetap satu transaksi');
});

test('batal membuang draf; draf kedaluwarsa tidak bisa disimpan', async () => {
  await say(CA, 'gaji masuk 5jt');
  assert.ok((await pendingOf(proId))?.startsWith('ai:'));
  assert.ok((await tap(CA, 'ai:cancel')).includes('Dibatalkan'));
  assert.equal(await pendingOf(proId), null);
  assert.equal((await txs()).length, 1);

  await say(CA, 'kopi 18rb');
  await prisma.user.update({ where: { id: proId }, data: { telegramPendingAt: new Date(Date.now() - 11 * 60 * 1000) } });
  assert.equal(await tap(CA, 'ai:save'), '', 'draf kedaluwarsa tidak menyimpan');
  assert.equal((await txs()).length, 1);
});

test('pesan tanpa nominal: bantuan contoh; draf baru menggantikan yang lama', async () => {
  assert.ok((await say(CA, 'halo apa kabar')).includes('belum menemukan nominal'));
  await say(CA, 'bensin 50rb');
  await say(CA, 'parkir 5rb');
  const p = JSON.parse((await pendingOf(proId))!.slice(3));
  assert.equal(p.amount, 5000, 'hanya draf terakhir yang berlaku');
  await tap(CA, 'ai:cancel');
});

test('dengan AI: hasil model divalidasi (kategori/rekening karangan & tanggal masa depan ditolak)', async () => {
  setProvider('groq'); llmMode = 'evil'; llmCalls = 0;
  const r = await say(CA, 'beli sesuatu 77rb');
  assert.equal(llmCalls, 1);
  const d = JSON.parse((await pendingOf(proId))!.slice(3));
  assert.equal(d.amount, 77000);
  assert.equal(d.category, 'Lainnya');
  assert.equal(d.account, 'Tunai');
  assert.notEqual(d.date, '2099-01-01');
  assert.ok(r.includes('Simpan transaksi ini?'));
  const before = await prisma.category.count({ where: { userId: proId } });
  await tap(CA, 'ai:save');
  assert.equal(await prisma.category.count({ where: { userId: proId } }), before, 'tidak membuat kategori baru dari output AI');
  assert.equal(await prisma.account.count({ where: { userId: proId } }), 2, 'tidak membuat rekening baru dari output AI');
});

test('AI mati: jatuh ke parser aturan (gratis)', async () => {
  setProvider('groq'); llmMode = 'down';
  const r = await say(CA, 'makan siang 30rb pakai BCA');
  assert.ok(r.includes('Simpan transaksi ini?') && r.includes('Rp30.000'), r);
  await tap(CA, 'ai:cancel');
});

test('foto nota: tanpa AI mengarah ke web; dengan AI menyusun draf; format/ukuran salah ditolak', async () => {
  setProvider(null);
  assert.ok((await photo(CA)).includes('Scan Nota'));

  setProvider('groq'); llmMode = 'ok'; photoBytes = JPEG;
  const r = await photo(CA);
  assert.ok(r.includes('Simpan transaksi ini?') && r.includes('Rp48.500'), r);
  const d = JSON.parse((await pendingOf(proId))!.slice(3));
  assert.deepEqual([d.type, d.amount, d.category, d.date], ['Pengeluaran', 48500, 'Belanja', '2026-11-16']);
  await tap(CA, 'ai:cancel');

  photoBytes = new TextEncoder().encode('<svg onload=alert(1)>');
  assert.ok((await photo(CA)).includes('tidak terbaca') || (await photo(CA)).includes('Format foto'));
  photoBytes = JPEG;
  assert.ok((await photo(CA, 5 * 1024 * 1024)).includes('terlalu besar'));
  assert.equal(await pendingOf(proId), null, 'kegagalan tidak meninggalkan draf');
});

test('dua ketukan "Simpan" BERSAMAAN: hanya satu yang berhasil (klaim atomik)', async () => {
  setProvider(null);
  const before = (await txs()).length;
  await say(CA, 'jajan 12rb');
  const results = await Promise.all([tap(CA, 'ai:save'), tap(CA, 'ai:save'), tap(CA, 'ai:save')]);
  assert.equal((await txs()).length, before + 1, `harus tepat satu transaksi baru; balasan: ${JSON.stringify(results)}`);
});
