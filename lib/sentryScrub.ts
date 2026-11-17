// Pembersih PII untuk event Sentry (dipakai di server, edge, dan browser; tanpa dependency Node).
// Prinsip: kirim sesedikit mungkin. Body request, cookie, header, query string, IP, dan email TIDAK dikirim.
// Satu-satunya identitas yang boleh ada adalah ID user yang sudah di-hash (lihat lib/sentryUser.ts).

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const BEARER_RE = /\b(Bearer|Basic)\s+[A-Za-z0-9._~+/=-]{8,}/gi;
const JWT_RE = /\beyJ[A-Za-z0-9_-]{6,}\.[A-Za-z0-9_-]{6,}\.[A-Za-z0-9_-]*/g;
const KV_SECRET_RE = /\b(password|passwd|pwd|token|secret|api[_-]?key|authorization|cookie|service_role)\b\s*[:=]\s*("[^"]*"|'[^']*'|[^\s,;&]+)/gi;
const DB_URL_RE = /\b(postgres(?:ql)?|mysql|redis|https?):\/\/[^\s'"]*:[^\s'"@]*@[^\s'"]+/gi;
const MAX_MESSAGE = 500;

export function scrubText(s: string): string {
  return s
    .replace(DB_URL_RE, '[url-redacted]')
    .replace(BEARER_RE, '$1 [redacted]')
    .replace(JWT_RE, '[jwt-redacted]')
    .replace(KV_SECRET_RE, '$1=[redacted]')
    .replace(EMAIL_RE, '[email-redacted]')
    .slice(0, MAX_MESSAGE);
}

type AnyEvent = Record<string, any>;

// Mengembalikan event yang sudah dibersihkan (mengubah objek yang diberikan).
export function scrubEvent<T extends AnyEvent>(event: T): T {
  const e: AnyEvent = event;

  if (typeof e.message === 'string') e.message = scrubText(e.message);
  if (e.logentry?.message) e.logentry.message = scrubText(String(e.logentry.message));
  for (const ex of e.exception?.values ?? []) {
    if (typeof ex.value === 'string') ex.value = scrubText(ex.value);
    // Nilai variabel lokal pada stack frame bisa memuat data pengguna
    for (const fr of ex.stacktrace?.frames ?? []) delete fr.vars;
  }

  if (e.request) {
    const url = typeof e.request.url === 'string' ? e.request.url.split('?')[0].split('#')[0] : undefined;
    e.request = { ...(url ? { url } : {}), ...(e.request.method ? { method: e.request.method } : {}) };
  }

  // Hanya ID ter-hash yang boleh tersisa; buang email, username, IP.
  if (e.user) e.user = e.user.id ? { id: String(e.user.id) } : undefined;
  delete e.extra;
  delete e.server_name; // nama host mesin
  if (e.contexts) {
    // Pertahankan konteks teknis (browser/os/runtime); buang sisanya
    const keep = ['browser', 'os', 'runtime', 'device', 'trace'];
    e.contexts = Object.fromEntries(Object.entries(e.contexts).filter(([k]) => keep.includes(k)));
  }
  if (e.tags && typeof e.tags === 'object') delete e.tags.url;

  if (Array.isArray(e.breadcrumbs)) {
    e.breadcrumbs = e.breadcrumbs.map((b: AnyEvent) => ({
      type: b.type, category: b.category, level: b.level, timestamp: b.timestamp,
      ...(typeof b.message === 'string' ? { message: scrubText(b.message) } : {}),
    }));
  }
  return event;
}
