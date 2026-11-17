// Penyiapan bot Telegram "cukup token" (server saja). Admin hanya mengisi TELEGRAM_BOT_TOKEN; sisanya dibuat otomatis:
//  - rahasia webhook diturunkan dari token (HMAC dengan JWT_SECRET), jadi tidak perlu env TELEGRAM_WEBHOOK_SECRET
//  - webhook, menu perintah, dan deskripsi bot didaftarkan lewat satu tombol di Panel Admin
//  - username bot dibaca dari Telegram (getMe)
// Token tidak pernah dicatat ke log atau dikirim ke browser.
import { createHmac } from 'crypto';
import { JWT_SECRET } from './env';

const TOKEN_RE = /^\d{6,}:[A-Za-z0-9_-]{20,}$/;
const apiRoot = () => (process.env.TELEGRAM_API_ROOT || 'https://api.telegram.org').replace(/\/+$/, ''); // TELEGRAM_API_ROOT: hanya pengujian

export function getBotToken(): string | null {
  const t = process.env.TELEGRAM_BOT_TOKEN?.trim();
  return t && TOKEN_RE.test(t) ? t : null;
}

// TELEGRAM_WEBHOOK_SECRET (opsional) menimpa; bila kosong diturunkan dari token. 64 karakter hex (hanya A-Za-z0-9 yang diizinkan Telegram).
export function webhookSecret(): string | null {
  const env = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (env && /^[A-Za-z0-9_-]{16,256}$/.test(env)) return env;
  const token = getBotToken();
  if (!token) return null;
  return createHmac('sha256', JWT_SECRET).update(`telegram-webhook:${token}`).digest('hex');
}

export const BOT_COMMANDS: { command: string; description: string }[] = [
  { command: 'start', description: 'Mulai dan bantuan' },
  { command: 'help', description: 'Daftar perintah' },
  { command: 'link', description: 'Hubungkan akun FinancePro' },
  { command: 'unlink', description: 'Putuskan akun' },
  { command: 'add', description: 'Tambah transaksi' },
  { command: 'transaksi', description: '10 transaksi terakhir' },
  { command: 'templatetransaksi', description: 'Contoh format input' },
  { command: 'nabung', description: 'Catat tabungan/investasi (PRO)' },
  { command: 'hutang', description: 'Ringkasan utang (PRO)' },
  { command: 'aset', description: 'Ringkasan aset (PRO)' },
  { command: 'budget', description: 'Budget vs aktual (PRO)' },
  { command: 'goals', description: 'Progres goals (PRO)' },
  { command: 'harian', description: 'Laporan harian (PRO)' },
  { command: 'mingguan', description: 'Laporan mingguan (PRO)' },
  { command: 'bulanan', description: 'Laporan bulanan (PRO)' },
  { command: 'dashboard', description: 'Buka dashboard web' },
];
const DESCRIPTION = 'Catat keuangan dari chat: ketik "makan siang 25rb pakai BCA" atau kirim foto nota. Hubungkan akunmu dengan /link KODE dari Pengaturan di FinancePro.';
const SHORT_DESCRIPTION = 'Catat transaksi FinancePro dari chat.';

interface TgResponse<T> { ok: boolean; result?: T; description?: string }

// Memanggil Bot API. Pesan error tidak memuat token.
export async function telegramApi<T = unknown>(method: string, body: Record<string, unknown> = {}): Promise<TgResponse<T>> {
  const token = getBotToken();
  if (!token) return { ok: false, description: 'TELEGRAM_BOT_TOKEN belum diisi atau formatnya salah' };
  try {
    const res = await fetch(`${apiRoot()}/bot${token}/${method}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(10_000),
    });
    const json = (await res.json().catch(() => null)) as TgResponse<T> | null;
    return json ?? { ok: false, description: `Telegram HTTP ${res.status}` };
  } catch (e) {
    return { ok: false, description: e instanceof Error && e.name === 'TimeoutError' ? 'Telegram tidak merespons (timeout)' : 'Telegram tidak terjangkau' };
  }
}

export interface BotStatus {
  configured: boolean;
  tokenValid?: boolean;
  bot?: { username: string; name: string };
  webhook?: { url: string; matches: boolean; pending: number; lastError: string | null };
  expectedUrl: string;
  httpsReady: boolean;
  error?: string;
}

export function webhookUrl(baseUrl: string): string { return `${baseUrl.replace(/\/+$/, '')}/api/webhook`; }
export const isHttpsPublic = (baseUrl: string): boolean => {
  try { const u = new URL(baseUrl); return u.protocol === 'https:' && !/^(localhost|127\.|0\.0\.0\.0|\[::1\])/.test(u.hostname); } catch { return false; }
};

export async function getBotStatus(baseUrl: string): Promise<BotStatus> {
  const expectedUrl = webhookUrl(baseUrl);
  const base = { expectedUrl, httpsReady: isHttpsPublic(baseUrl) };
  if (!getBotToken()) return { configured: false, ...base };
  const [me, wh] = await Promise.all([
    telegramApi<{ username: string; first_name: string }>('getMe'),
    telegramApi<{ url: string; pending_update_count: number; last_error_message?: string }>('getWebhookInfo'),
  ]);
  if (!me.ok || !me.result) return { configured: true, tokenValid: false, ...base, error: me.description ?? 'Token ditolak Telegram' };
  return {
    configured: true, tokenValid: true, ...base,
    bot: { username: me.result.username, name: me.result.first_name },
    webhook: wh.ok && wh.result
      ? { url: wh.result.url, matches: wh.result.url === expectedUrl, pending: wh.result.pending_update_count, lastError: wh.result.last_error_message ?? null }
      : undefined,
  };
}

export type SetupResult = { ok: true } | { ok: false; reason: 'no_token' | 'not_https' | 'telegram'; message: string };

// Mendaftarkan webhook (+ rahasia turunan), menu perintah, dan deskripsi. Idempoten.
export async function activateBot(baseUrl: string): Promise<SetupResult> {
  const secret = webhookSecret();
  if (!secret) return { ok: false, reason: 'no_token', message: 'TELEGRAM_BOT_TOKEN belum diisi atau formatnya salah' };
  if (!isHttpsPublic(baseUrl)) {
    return { ok: false, reason: 'not_https', message: 'Webhook hanya bisa didaftarkan pada alamat HTTPS publik (setelah deploy). Untuk uji lokal pakai: npm run telegram:poll' };
  }
  const set = await telegramApi('setWebhook', { url: webhookUrl(baseUrl), secret_token: secret, allowed_updates: ['message', 'callback_query'], drop_pending_updates: false });
  if (!set.ok) return { ok: false, reason: 'telegram', message: set.description ?? 'setWebhook gagal' };
  // Pelengkap (gagal di sini tidak membatalkan aktivasi)
  await Promise.all([
    telegramApi('setMyCommands', { commands: BOT_COMMANDS }),
    telegramApi('setMyDescription', { description: DESCRIPTION }),
    telegramApi('setMyShortDescription', { short_description: SHORT_DESCRIPTION }),
  ]);
  return { ok: true };
}

export async function deactivateBot(): Promise<SetupResult> {
  if (!getBotToken()) return { ok: false, reason: 'no_token', message: 'TELEGRAM_BOT_TOKEN belum diisi atau formatnya salah' };
  const r = await telegramApi('deleteWebhook', { drop_pending_updates: false });
  return r.ok ? { ok: true } : { ok: false, reason: 'telegram', message: r.description ?? 'deleteWebhook gagal' };
}

// Username bot dari Telegram (di-cache 1 jam); cadangan: env TELEGRAM_BOT_USERNAME.
let cachedUsername: { value: string | null; at: number } | null = null;
export async function getBotUsername(): Promise<string | null> {
  const envName = process.env.TELEGRAM_BOT_USERNAME?.replace(/^@/, '') || null;
  if (cachedUsername && Date.now() - cachedUsername.at < 3600_000) return cachedUsername.value ?? envName;
  if (!getBotToken()) return envName;
  const me = await telegramApi<{ username: string }>('getMe');
  cachedUsername = { value: me.ok && me.result ? me.result.username : null, at: Date.now() };
  return cachedUsername.value ?? envName;
}
export function resetBotUsernameCache(): void { cachedUsername = null; }
