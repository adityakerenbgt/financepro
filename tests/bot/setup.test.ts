// Uji penyiapan bot "cukup token" (lib/telegramSetup.ts) dengan API Telegram TIRUAN (TELEGRAM_API_ROOT). Tanpa DB/jaringan nyata.
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

const PORT = 9996;
const TOKEN_A = '1234567890:AAH_fake-token-aaaaaaaaaaaaaaaaaaaaaaaaaaa';
const TOKEN_B = '1234567890:AAH_fake-token-bbbbbbbbbbbbbbbbbbbbbbbbbbb';
process.env.TELEGRAM_API_ROOT = `http://localhost:${PORT}`;
process.env.TELEGRAM_BOT_TOKEN = TOKEN_A;
delete process.env.TELEGRAM_WEBHOOK_SECRET;

type Call = { method: string; body: any };
const calls: Call[] = [];
let webhookUrlSet = '';
let failMethod = '';
const server = http.createServer((req, res) => {
  const chunks: Buffer[] = [];
  req.on('data', (c) => chunks.push(c));
  req.on('end', () => {
    const body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : {};
    const m = /^\/bot([^/]+)\/(\w+)$/.exec(req.url ?? '');
    const method = m ? m[2] : 'unknown';
    calls.push({ method, body });
    res.setHeader('Content-Type', 'application/json');
    if (failMethod === method) return res.end(JSON.stringify({ ok: false, description: 'Bad Request: simulasi gagal' }));
    if (method === 'getMe') return res.end(JSON.stringify({ ok: true, result: { id: 1, is_bot: true, first_name: 'Fake Bot', username: 'FakeBot' } }));
    if (method === 'setWebhook') webhookUrlSet = body.url;
    if (method === 'deleteWebhook') webhookUrlSet = '';
    if (method === 'getWebhookInfo') return res.end(JSON.stringify({ ok: true, result: { url: webhookUrlSet, pending_update_count: 3 } }));
    res.end(JSON.stringify({ ok: true, result: true }));
  });
});
before(async () => { await new Promise<void>((r) => server.listen(PORT, r)); });
after(() => { server.close(); });

test('rahasia webhook diturunkan dari token: deterministik, 64 hex, beda token beda rahasia, env menimpa', async () => {
  const { webhookSecret } = await import('../../lib/telegramSetup');
  const a1 = webhookSecret()!, a2 = webhookSecret()!;
  assert.match(a1, /^[0-9a-f]{64}$/);
  assert.equal(a1, a2);
  process.env.TELEGRAM_BOT_TOKEN = TOKEN_B;
  assert.notEqual(webhookSecret(), a1);
  process.env.TELEGRAM_WEBHOOK_SECRET = 'rahasia_manual_1234567890';
  assert.equal(webhookSecret(), 'rahasia_manual_1234567890');
  process.env.TELEGRAM_WEBHOOK_SECRET = 'pendek';
  assert.match(webhookSecret()!, /^[0-9a-f]{64}$/, 'env tidak valid diabaikan');
  delete process.env.TELEGRAM_WEBHOOK_SECRET;
  process.env.TELEGRAM_BOT_TOKEN = 'bukan-token';
  assert.equal(webhookSecret(), null, 'token berformat salah -> tidak ada rahasia (webhook tertutup)');
  process.env.TELEGRAM_BOT_TOKEN = TOKEN_A;
});

test('activateBot: wajib HTTPS publik; mendaftarkan webhook+rahasia, menu perintah, dan deskripsi', async () => {
  const { activateBot, webhookSecret, BOT_COMMANDS } = await import('../../lib/telegramSetup');
  calls.length = 0;
  for (const bad of ['http://localhost:3000', 'http://example.com', 'https://localhost', 'https://127.0.0.1', 'bukan url']) {
    const r = await activateBot(bad);
    assert.equal(r.ok, false, bad);
    assert.equal((r as any).reason, 'not_https', bad);
  }
  assert.equal(calls.length, 0, 'tidak ada panggilan ke Telegram untuk alamat tidak valid');

  const r = await activateBot('https://financepro.example.com/');
  assert.equal(r.ok, true);
  const sw = calls.find((c) => c.method === 'setWebhook')!;
  assert.equal(sw.body.url, 'https://financepro.example.com/api/webhook');
  assert.equal(sw.body.secret_token, webhookSecret());
  assert.deepEqual(sw.body.allowed_updates, ['message', 'callback_query']);
  const sc = calls.find((c) => c.method === 'setMyCommands')!;
  assert.equal(sc.body.commands.length, BOT_COMMANDS.length);
  assert.ok(sc.body.commands.every((c: any) => /^[a-z_]{1,32}$/.test(c.command) && c.description.length >= 3 && c.description.length <= 256));
  assert.ok(calls.some((c) => c.method === 'setMyDescription'));
});

test('activateBot: kegagalan Telegram dilaporkan; tanpa token -> no_token', async () => {
  const { activateBot } = await import('../../lib/telegramSetup');
  failMethod = 'setWebhook';
  const r = await activateBot('https://financepro.example.com');
  assert.deepEqual([r.ok, (r as any).reason], [false, 'telegram']);
  failMethod = '';
  delete process.env.TELEGRAM_BOT_TOKEN;
  const n = await activateBot('https://financepro.example.com');
  assert.equal((n as any).reason, 'no_token');
  process.env.TELEGRAM_BOT_TOKEN = TOKEN_A;
});

test('getBotStatus: belum aktif -> aktif -> dimatikan; username bot dibaca otomatis', async () => {
  const { activateBot, deactivateBot, getBotStatus, getBotUsername, resetBotUsernameCache } = await import('../../lib/telegramSetup');
  await deactivateBot();
  const base = 'https://financepro.example.com';
  let s = await getBotStatus(base);
  assert.deepEqual([s.configured, s.tokenValid, s.bot?.username, s.webhook?.matches, s.httpsReady], [true, true, 'FakeBot', false, true]);
  await activateBot(base);
  s = await getBotStatus(base);
  assert.equal(s.webhook?.matches, true);
  assert.equal(s.webhook?.pending, 3);
  await deactivateBot();
  assert.equal((await getBotStatus(base)).webhook?.url, '');
  resetBotUsernameCache();
  assert.equal(await getBotUsername(), 'FakeBot');

  delete process.env.TELEGRAM_BOT_TOKEN;
  assert.equal((await getBotStatus(base)).configured, false);
  process.env.TELEGRAM_BOT_TOKEN = TOKEN_A;
});

test('route webhook: tanpa token 503; rahasia salah/kosong 401 (tanpa menyentuh bot)', async () => {
  const { POST } = await import('../../app/api/webhook/route');
  const mk = (secret?: string) => new Request('http://x/api/webhook', { method: 'POST', headers: { 'content-type': 'application/json', ...(secret ? { 'x-telegram-bot-api-secret-token': secret } : {}) }, body: '{"update_id":1}' }) as any;
  assert.equal((await POST(mk())).status, 401);
  assert.equal((await POST(mk('salah'))).status, 401);
  assert.equal((await POST(mk('0'.repeat(64)))).status, 401);
  delete process.env.TELEGRAM_BOT_TOKEN;
  assert.equal((await POST(mk('apa-saja'))).status, 503);
  process.env.TELEGRAM_BOT_TOKEN = TOKEN_A;
});
