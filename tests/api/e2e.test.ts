// Uji integrasi API (T-6.3). Menjalankan skenario nyata terhadap server yang SEDANG BERJALAN dan DB di .env.
//   1) npm run dev   (atau npm start)     2) npm run test:api
// Semua data uji berawalan "uji_api" dan dihapus di akhir. Gunakan DB pengembangan, bukan produksi.
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import prisma from '../../lib/db';
import { createResetToken } from '../../lib/passwordReset';

const BASE = process.env.TEST_BASE_URL || 'http://localhost:3000';
const PW = 'UjiApi12345!';
const run = Date.now().toString(36);
const name = (s: string) => `uji_api_${s}_${run}`;

class Client {
  cookie = '';
  // IP unik per klien agar batas laju (per IP) antar-skenario & antar-run tidak saling mengganggu; header ini ditimpa oleh Vercel di produksi.
  ip = `10.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`;
  async req(method: string, path: string, body?: unknown, headers: Record<string, string> = {}) {
    const res = await fetch(BASE + path, {
      method, redirect: 'manual',
      headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(this.cookie ? { cookie: this.cookie } : {}), 'x-forwarded-for': this.ip, ...headers },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const set = res.headers.get('set-cookie');
    if (set && /auth-token=/.test(set)) this.cookie = set.split(';')[0];
    const text = await res.text();
    let json: any = null; try { json = JSON.parse(text); } catch { /* bukan JSON */ }
    return { status: res.status, json, text, headers: res.headers };
  }
  get = (p: string) => this.req('GET', p);
  post = (p: string, b: unknown) => this.req('POST', p, b);
  patch = (p: string, b: unknown) => this.req('PATCH', p, b);
  del = (p: string, b: unknown) => this.req('DELETE', p, b);
  async login(username: string, password = PW) { return this.post('/api/auth/login', { username, password }); }
}

const today = () => { const d = new Date(); return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`; };

async function mkUser(key: string, o: { role?: 'ADMIN' | 'USER'; plan?: 'FREE' | 'PRO'; trialEndsAt?: Date | null; planExpiresAt?: Date | null } = {}) {
  return prisma.user.create({
    data: { username: name(key), email: `${name(key)}@t.test`, password: await bcrypt.hash(PW, 6), role: o.role ?? 'USER', plan: o.plan ?? 'FREE', trialEndsAt: o.trialEndsAt ?? null, planExpiresAt: o.planExpiresAt ?? null },
  });
}

before(async () => {
  const r = await fetch(BASE + '/api/auth/verify').catch(() => null);
  assert.ok(r, `Server tidak berjalan di ${BASE}. Jalankan "npm run dev" dulu.`);
});
after(async () => {
  await prisma.user.deleteMany({ where: { username: { startsWith: 'uji_api_' } } });
  await prisma.$disconnect();
});

test('1. Register: validasi (email wajib, syarat wajib) dan sukses mendapat trial PRO', async () => {
  const c = new Client();
  const u = name('reg');
  const base = { username: u, displayName: 'Uji', password: PW, confirmPassword: PW, acceptTerms: true, email: `${u}@t.test` };
  const fresh = () => new Client();
  assert.equal((await fresh().post('/api/auth/register', { ...base, email: '' })).status, 400);
  assert.equal((await fresh().post('/api/auth/register', { ...base, acceptTerms: false })).status, 400);
  assert.equal((await fresh().post('/api/auth/register', { ...base, confirmPassword: 'x' })).status, 400);
  assert.equal((await fresh().post('/api/auth/register', { ...base, password: 'short', confirmPassword: 'short' })).status, 400);
  const ok = await c.post('/api/auth/register', base);
  assert.equal(ok.status, 201, ok.text);
  assert.equal((await fresh().post('/api/auth/register', base)).status, 409, 'username kembar');
  // batas laju register: 5 per jam per IP
  const rl = new Client(); const codes: number[] = [];
  for (let i = 0; i < 6; i++) codes.push((await rl.post('/api/auth/register', { ...base, username: name('rl' + i), email: '' })).status);
  assert.equal(codes[5], 429, `register harus dibatasi: ${codes}`);
  const row = await prisma.user.findUnique({ where: { username: u } });
  assert.ok(row?.trialEndsAt && row.trialEndsAt.getTime() > Date.now(), 'trial aktif');
  assert.equal(row?.termsAcceptedAt !== null, true);
  const l = await c.login(u);
  assert.equal(l.status, 200);
  const v = await c.get('/api/auth/verify');
  assert.equal(v.json.plan, 'PRO');
  assert.equal(v.json.isTrial, true);
});

test('2. Login: password salah 401, rate limit 429 setelah 5 kali gagal', async () => {
  const u = await mkUser('rl');
  const c = new Client();
  const codes: number[] = [];
  for (let i = 0; i < 7; i++) codes.push((await c.login(u.username, 'salah-banget')).status);
  assert.deepEqual(codes.slice(0, 5), [401, 401, 401, 401, 401]);
  assert.equal(codes[6], 429);
});

test('3. Tanpa login: API dilindungi (401)', async () => {
  const c = new Client();
  for (const p of ['/api/transactions', '/api/accounts', '/api/dashboard-data', '/api/export?format=csv', '/api/payments', '/api/telegram/link']) {
    assert.equal((await c.get(p)).status, 401, p);
  }
  assert.ok([401, 403].includes((await c.get('/api/admin/users')).status), 'admin API tertutup tanpa login');
  assert.ok([401, 403].includes((await c.get('/api/admin/payments')).status));
});

test('4. Transaksi: tambah → daftar → dashboard → ubah → hapus', async () => {
  await mkUser('tx', { plan: 'PRO' });
  const c = new Client(); await c.login(name('tx'));
  const add = await c.post('/api/transactions', { date: today(), category: 'Makan', description: 'Uji nasi', account: 'Tunai', type: 'Pengeluaran', amount: 25000 });
  assert.equal(add.status, 201, add.text);
  const list = await c.get('/api/transactions');
  assert.equal(list.json.total, 1);
  const dash = await c.get('/api/dashboard-data');
  assert.equal(dash.status, 200);
  assert.ok(JSON.stringify(dash.json).includes('25000'));
  const id = add.json.id;
  assert.equal((await c.patch('/api/transactions', { id, date: today(), category: 'Makan', description: 'Uji nasi', account: 'Tunai', type: 'Pengeluaran', amount: 30000 })).status, 200);
  const acc = (await c.get('/api/accounts')).json;
  const tunai = (Array.isArray(acc) ? acc : acc.accounts).find((a: any) => a.name === 'Tunai');
  assert.equal(tunai.balance, -30000, 'saldo mengikuti perubahan nominal');
  assert.equal((await c.del('/api/transactions', { id })).status, 200);
  assert.equal((await c.get('/api/transactions')).json.total, 0);
});

test('5. FREE ditolak di fitur PRO (API) tetapi boleh tambah transaksi; batas 1 rekening', async () => {
  await mkUser('free', { plan: 'FREE' });
  const c = new Client(); await c.login(name('free'));
  for (const p of ['/api/debts', '/api/goals', '/api/assets', '/api/budget', '/api/savings', '/api/recurring']) {
    const r = await c.get(p);
    assert.equal(r.status, 403, `${p} -> ${r.status}`);
    assert.equal(r.json?.code, 'PRO_REQUIRED', p);
  }
  assert.equal((await c.get('/api/export?kind=monthly&format=csv&month=Nov 2026')).status, 403);
  assert.equal((await c.post('/api/transactions', { date: today(), category: 'Makan', description: 'a', account: 'Tunai', type: 'Pengeluaran', amount: 1000 })).status, 201);
  const second = await c.post('/api/transactions', { date: today(), category: 'Makan', description: 'b', account: 'Bank2', type: 'Pengeluaran', amount: 1000 });
  assert.ok([402, 403].includes(second.status), `rekening ke-2 harus ditolak, dapat ${second.status}`);
});

test('6. Trial: PRO selama trial, kembali FREE seketika setelah trial berakhir', async () => {
  const ends = new Date(Date.now() + 3600_000);
  const u = await mkUser('trial', { plan: 'PRO', trialEndsAt: ends, planExpiresAt: ends });
  const c = new Client(); await c.login(u.username);
  assert.equal((await c.get('/api/debts')).status, 200);
  const past = new Date(Date.now() - 1000);
  await prisma.user.update({ where: { id: u.id }, data: { trialEndsAt: past, planExpiresAt: past } });
  assert.equal((await c.get('/api/debts')).status, 403, 'token lama tidak boleh memberi akses (plan dibaca dari DB)');
  assert.equal((await c.get('/api/auth/verify')).json.plan, 'FREE');
});

test('7. Admin menjadikan user PRO → akses terbuka; USER biasa tidak boleh memakai API admin', async () => {
  const target = await mkUser('tgt', { plan: 'FREE' });
  await mkUser('adm', { role: 'ADMIN', plan: 'PRO' });
  const a = new Client(); await a.login(name('adm'));
  const t = new Client(); await t.login(target.username);
  assert.equal((await t.get('/api/debts')).status, 403);
  assert.equal((await t.get('/api/admin/users')).status, 403);
  assert.equal((await t.patch('/api/admin/users', { id: target.id, plan: 'PRO' })).status, 403, 'user biasa tidak bisa upgrade dirinya');
  assert.equal((await a.patch('/api/admin/users', { id: target.id, plan: 'PRO' })).status, 200);
  assert.equal((await t.get('/api/debts')).status, 200);
});

test('8. IDOR: user B tidak bisa membaca/mengubah/menghapus data user A', async () => {
  await mkUser('ia', { plan: 'PRO' }); await mkUser('ib', { plan: 'PRO' });
  const A = new Client(), B = new Client(); await A.login(name('ia')); await B.login(name('ib'));
  const tx = (await A.post('/api/transactions', { date: today(), category: 'Makan', description: 'RAHASIA-A', account: 'Tunai', type: 'Pengeluaran', amount: 7000 })).json;
  const debt = (await A.post('/api/debts', { debtType: 'Fixed', debtName: 'Utang A', limitOrPrincipal: 1000000 })).json;
  const accA = (await A.get('/api/accounts')).json; const accId = (Array.isArray(accA) ? accA : accA.accounts)[0].id;
  assert.ok(tx?.id && debt?.id && accId);

  assert.equal((await B.patch('/api/transactions', { id: tx.id, date: today(), category: 'Makan', description: 'x', account: 'Tunai', type: 'Pengeluaran', amount: 1 })).status, 404);
  assert.equal((await B.del('/api/transactions', { id: tx.id })).status, 404);
  assert.equal((await B.patch('/api/debts', { id: debt.id, debtType: 'Fixed', debtName: 'x', limitOrPrincipal: 1 })).status, 404);
  assert.equal((await B.del('/api/debts', { id: debt.id })).status, 404);
  assert.equal((await B.patch('/api/accounts', { id: accId, balance: 99 })).status, 404);
  assert.equal((await B.del('/api/accounts', { id: accId })).status, 404);

  assert.ok(!(await B.get('/api/transactions')).text.includes('RAHASIA-A'));
  assert.ok(!(await B.get('/api/debts')).text.includes('Utang A'));
  assert.ok(!(await B.get('/api/export?format=csv')).text.includes('RAHASIA-A'));
  assert.ok(!(await B.get('/api/dashboard-data')).text.includes('RAHASIA-A'));
  assert.equal((await B.get('/api/transactions?search=RAHASIA')).json.total, 0);
  // data A utuh
  assert.equal((await A.get('/api/transactions')).json.total, 1);
  assert.equal((await A.get('/api/debts')).json.length ?? 1, 1);
});

test('9. Pembayaran: admin approve → PRO bertambah 1 bulan; approve ulang 409; tolak wajib alasan', async () => {
  const u = await mkUser('pay', { plan: 'FREE' });
  const pr = await prisma.paymentRequest.create({ data: { userId: u.id, plan: 'PRO_MONTHLY', amount: 29000, proofPath: `${u.id}/uji-${run}.png` } });
  await mkUser('padm', { role: 'ADMIN', plan: 'PRO' });
  const a = new Client(); await a.login(name('padm'));
  const c = new Client(); await c.login(u.username);
  assert.equal((await c.patch('/api/admin/payments', { id: pr.id, action: 'approve' })).status, 403, 'user biasa tidak bisa approve');
  assert.equal((await a.patch('/api/admin/payments', { id: pr.id, action: 'reject' })).status, 400, 'alasan wajib');
  const ok = await a.patch('/api/admin/payments', { id: pr.id, action: 'approve' });
  assert.equal(ok.status, 200, ok.text);
  assert.equal((await a.patch('/api/admin/payments', { id: pr.id, action: 'approve' })).status, 409);
  const row = await prisma.user.findUnique({ where: { id: u.id } });
  assert.equal(row?.plan, 'PRO');
  const days = (row!.planExpiresAt!.getTime() - Date.now()) / 86400_000;
  assert.ok(days > 27 && days < 32, `masa aktif ~1 bulan, dapat ${days.toFixed(1)} hari`);
  assert.equal((await c.get('/api/debts')).status, 200);
});

test('10. Reset password: token sekali pakai, password lama tidak berlaku lagi', async () => {
  const u = await mkUser('rst');
  const c = new Client();
  const token = await createResetToken(u.id);
  assert.equal((await c.post('/api/auth/reset-password', { token: 'bukan-token', password: 'PasswordBaru1', confirmPassword: 'PasswordBaru1' })).status, 400);
  assert.equal((await c.post('/api/auth/reset-password', { token, password: 'pendek', confirmPassword: 'pendek' })).status, 400);
  const ok = await c.post('/api/auth/reset-password', { token, password: 'PasswordBaru1', confirmPassword: 'PasswordBaru1' });
  assert.equal(ok.status, 200, ok.text);
  assert.equal((await c.post('/api/auth/reset-password', { token, password: 'LagiBaru123', confirmPassword: 'LagiBaru123' })).status, 400, 'token tidak boleh dipakai dua kali');
  assert.equal((await c.login(u.username, PW)).status, 401);
  assert.equal((await c.login(u.username, 'PasswordBaru1')).status, 200);
  // forgot-password tidak membocorkan apakah email terdaftar
  const f1 = await c.post('/api/auth/forgot-password', { email: u.email });
  const f2 = await c.post('/api/auth/forgot-password', { email: `tidak-ada-${run}@t.test` });
  assert.equal(f1.status, f2.status);
  assert.equal(f1.text, f2.text);
});

test('11. Cron & webhook: tertutup tanpa rahasia', async () => {
  const c = new Client();
  for (const p of ['expire-plans', 'recurring', 'renewal-reminders', 'weekly-digest']) {
    assert.equal((await c.get(`/api/cron/${p}`)).status, 401, p);
    assert.equal((await c.req('GET', `/api/cron/${p}`, undefined, { authorization: 'Bearer salah' })).status, 401, p);
  }
  if (process.env.CRON_SECRET) {
    assert.equal((await c.req('GET', '/api/cron/expire-plans', undefined, { authorization: `Bearer ${process.env.CRON_SECRET}` })).status, 200);
  }
  const wh = await c.req('POST', '/api/webhook', { update_id: 1 }, { 'x-telegram-bot-api-secret-token': 'salah' });
  assert.ok([401, 503].includes(wh.status), `webhook harus tertutup, dapat ${wh.status}`);
});

test('12. Tautan Telegram: kode 6 digit, sekali buat per user, putuskan', async () => {
  await mkUser('tg');
  const c = new Client(); await c.login(name('tg'));
  assert.equal((await c.get('/api/telegram/link')).json.linked, false);
  const code = await c.post('/api/telegram/link', {});
  assert.equal(code.status, 200);
  assert.match(code.json.code, /^\d{6}$/);
  assert.equal(await prisma.telegramLinkCode.count({ where: { user: { username: name('tg') } } }), 1);
  await c.post('/api/telegram/link', {});
  assert.equal(await prisma.telegramLinkCode.count({ where: { user: { username: name('tg') } } }), 1, 'kode lama diganti');
  assert.equal((await c.del('/api/telegram/link', {})).status, 200);
});

test('13. Ekspor: format salah 400; CSV memuat data sendiri', async () => {
  await mkUser('exp', { plan: 'PRO' });
  const c = new Client(); await c.login(name('exp'));
  await c.post('/api/transactions', { date: today(), category: 'Makan', description: '=2+2', account: 'Tunai', type: 'Pengeluaran', amount: 5000 });
  assert.equal((await c.get('/api/export?format=docx')).status, 400);
  const csv = await c.get('/api/export?format=csv');
  assert.equal(csv.status, 200);
  assert.ok(csv.text.includes("'=2+2"), 'formula injection dinetralkan');
  assert.match(csv.headers.get('content-disposition') ?? '', /attachment/);
});
