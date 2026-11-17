// Uji /api/receipts/scan (T-OWN-8).
//  - Bagian 1 (selalu jalan): otorisasi & validasi unggahan; tidak pernah sampai memanggil Gemini.
//  - Bagian 2 (hanya bila RECEIPT_FAKE=1): memakai server Gemini TIRUAN. Jalankan server dengan
//      RECEIPT_PROVIDER=gemini GEMINI_BASE_URL=http://localhost:9998 GEMINI_API_KEY=fake npm run dev
//    lalu:  RECEIPT_FAKE=1 npm run test:api
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import bcrypt from 'bcryptjs';
import prisma from '../../lib/db';

const BASE = process.env.TEST_BASE_URL || 'http://localhost:3000';
const PW = 'UjiScan12345!';
const run = Date.now().toString(36);
const JPEG = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0, 16, 0x4a, 0x46, 0x49, 0x46, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0, 0xff, 0xd9]);
const ip = () => `10.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`;

async function mk(key: string, plan: 'FREE' | 'PRO') {
  const u = await prisma.user.create({ data: { username: `uji_api_scan_${key}_${run}`, email: `scan_${key}_${run}@t.test`, password: await bcrypt.hash(PW, 6), plan } });
  const myIp = ip();
  const res = await fetch(BASE + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-forwarded-for': myIp }, body: JSON.stringify({ username: u.username, password: PW }) });
  const cookie = (res.headers.get('set-cookie') ?? '').split(';')[0];
  return { u, cookie, ip: myIp };
}
const upload = (c: { cookie: string; ip: string }, bytes: Uint8Array | null, name = 'nota.jpg', type = 'image/jpeg') => {
  const fd = new FormData();
  if (bytes) fd.append('file', new Blob([new Uint8Array(bytes)], { type }), name);
  return fetch(BASE + '/api/receipts/scan', { method: 'POST', body: fd, headers: { cookie: c.cookie, 'x-forwarded-for': c.ip } });
};

after(async () => {
  await prisma.user.deleteMany({ where: { username: { startsWith: 'uji_api_scan_' } } });
  await prisma.$disconnect();
});

test('Scan nota: tanpa login 401, FREE 403, unggahan tidak valid ditolak', async () => {
  const anon = await fetch(BASE + '/api/receipts/scan', { method: 'POST', body: new FormData() });
  assert.equal(anon.status, 401);

  const free = await mk('free', 'FREE');
  const f = await upload(free, JPEG);
  assert.equal(f.status, 403);
  assert.equal((await f.json()).code, 'PRO_REQUIRED');

  const pro = await mk('pro', 'PRO');
  const prov = await fetch(BASE + '/api/receipts/scan', { headers: { cookie: pro.cookie, 'x-forwarded-for': pro.ip } });
  assert.equal(prov.status, 200);
  assert.ok(['ondevice', 'gemini', 'groq', 'openrouter', 'mistral', 'openai'].includes((await prov.json()).provider));
  assert.equal((await fetch(BASE + '/api/receipts/scan', { headers: { cookie: free.cookie, 'x-forwarded-for': free.ip } })).status, 403);
  assert.equal((await upload(pro, null)).status, 400, 'tanpa file');
  assert.equal((await upload(pro, new TextEncoder().encode('<svg onload=alert(1)>'), 'x.jpg', 'image/jpeg')).status, 400, 'SVG menyamar jadi jpg');
  assert.equal((await upload(pro, new TextEncoder().encode('%PDF-1.7 ...'), 'x.pdf', 'application/pdf')).status, 400, 'PDF');
  assert.equal((await upload(pro, new Uint8Array(0))).status, 400, 'kosong');
  const big = new Uint8Array(4 * 1024 * 1024 + 10); big.set(JPEG);
  assert.equal((await upload(pro, big)).status, 413, 'terlalu besar');
});

const fake = process.env.RECEIPT_FAKE === '1';

test('Scan nota (Gemini tiruan): hasil dinormalisasi, tidak menyimpan apa pun, kunci di header', { skip: !fake && 'set RECEIPT_FAKE=1 dan jalankan server dengan GEMINI_BASE_URL tiruan' }, async () => {
  let seen: { url?: string; key?: string; body?: any } = {};
  let reply: any = { merchant: 'Toko Uji', date: '2026-11-16', total: 54300, category: 'Makan & Minum', items: [{ name: 'Teh', amount: 5000 }] };
  const srv = http.createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      seen = { url: req.url, key: String(req.headers['x-goog-api-key']), body: JSON.parse(Buffer.concat(chunks).toString()) };
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ candidates: [{ content: { parts: [{ text: typeof reply === 'string' ? reply : JSON.stringify(reply) }] } }] }));
    });
  }).listen(9998);
  try {
    const pro = await mk('fake', 'PRO');
    await prisma.category.create({ data: { userId: pro.u.id, name: 'Makan & Minum', type: 'expense' } });
    const before = await prisma.transaction.count({ where: { userId: pro.u.id } });

    const ok = await upload(pro, JPEG);
    assert.equal(ok.status, 200);
    const j: any = await ok.json();
    assert.equal(j.draft.amount, 54300);
    assert.equal(j.draft.category, 'Makan & Minum');
    assert.equal(j.draft.merchant, 'Toko Uji');
    assert.ok(seen.url?.includes('/v1beta/models/') && !seen.url.includes('key='), 'kunci tidak boleh ada di URL');
    assert.equal(seen.key, 'fake');
    assert.ok(seen.body.contents[0].parts[1].inline_data.mime_type === 'image/jpeg');
    assert.ok(String(seen.body.contents[0].parts[0].text).includes('"Makan & Minum"'), 'kategori user ikut di prompt');
    assert.equal(await prisma.transaction.count({ where: { userId: pro.u.id } }), before, 'scan tidak boleh menyimpan transaksi');

    // output model berbahaya: kategori asing, total teks Rupiah, tanggal masa depan
    reply = { merchant: 'X<script>', date: '2099-01-01', total: 'Rp 1.250.000', category: 'DROP TABLE' };
    const j2: any = await (await upload(pro, JPEG)).json();
    assert.equal(j2.draft.amount, 1250000);
    assert.equal(j2.draft.category, 'Lainnya');
    assert.ok(j2.warnings.includes('date_invalid') && j2.warnings.includes('category_unknown'));

    reply = { total: 0 };
    const un = await upload(pro, JPEG);
    assert.equal(un.status, 422);
    assert.equal((await un.json()).code, 'UNREADABLE');

    reply = 'bukan json {{{';
    assert.equal((await upload(pro, JPEG)).status, 502);
  } finally { srv.close(); }
});

const compat = process.env.RECEIPT_FAKE === 'compat';

test('Scan nota (penyedia kompatibel-OpenAI tiruan): kunci di header, gambar data-URL, jawaban berpagar ``` diterima, fallback json_mode', { skip: !compat && 'set RECEIPT_FAKE=compat; server: RECEIPT_PROVIDER=groq RECEIPT_API_BASE=http://localhost:9998 RECEIPT_API_KEY=fake' }, async () => {
  const seen: { url?: string; auth?: string; body?: any }[] = [];
  let mode: 'ok' | 'fence' | 'no-json-mode' | 'down' = 'ok';
  const good = { merchant: 'Toko Groq', date: '2026-11-16', total: 'Rp 54.300', category: 'Makan & Minum', items: [] };
  const srv = http.createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const body = JSON.parse(Buffer.concat(chunks).toString());
      seen.push({ url: req.url, auth: String(req.headers.authorization), body });
      res.setHeader('Content-Type', 'application/json');
      if (mode === 'down') { res.statusCode = 503; return res.end('{}'); }
      if (mode === 'no-json-mode' && body.response_format) { res.statusCode = 400; return res.end('{"error":"response_format unsupported"}'); }
      const fenceOpen = '```json', fenceClose = '```';
      const content = mode === 'fence' ? ['Ini hasilnya:', fenceOpen, JSON.stringify(good), fenceClose].join('\n') : JSON.stringify(good);
      res.end(JSON.stringify({ choices: [{ message: { content } }] }));
    });
  }).listen(9998);
  try {
    const pro = await mk('compat', 'PRO');
    const prov: any = await (await fetch(BASE + '/api/receipts/scan', { headers: { cookie: pro.cookie, 'x-forwarded-for': pro.ip } })).json();
    assert.equal(prov.provider, 'groq');

    const r1 = await upload(pro, JPEG);
    assert.equal(r1.status, 200);
    const j: any = await r1.json();
    assert.equal(j.draft.amount, 54300);
    assert.equal(seen[0].url, '/chat/completions');
    assert.equal(seen[0].auth, 'Bearer fake');
    assert.ok(seen[0].body.messages[0].content[1].image_url.url.startsWith('data:image/jpeg;base64,'));
    assert.deepEqual(seen[0].body.response_format, { type: 'json_object' });

    mode = 'fence';
    assert.equal(((await (await upload(pro, JPEG)).json()) as any).draft.amount, 54300, 'jawaban berpagar ``` diterima');

    mode = 'no-json-mode'; seen.length = 0;
    assert.equal((await upload(pro, JPEG)).status, 200);
    assert.equal(seen.length, 2, 'dicoba ulang tanpa response_format');
    assert.equal(seen[1].body.response_format, undefined);

    mode = 'down';
    assert.equal((await upload(pro, JPEG)).status, 502, 'penyedia mati -> 502 (UI jatuh ke OCR di perangkat)');
  } finally { srv.close(); }
});
