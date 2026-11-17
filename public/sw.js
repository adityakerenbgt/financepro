// Service worker minimal (PWA "installable"). SENGAJA tidak menyimpan cache data/halaman terautentikasi:
// aplikasi keuangan tidak boleh menampilkan data lama atau milik sesi lain dari cache.
// Yang disimpan hanya halaman offline statis; navigasi selalu ke jaringan dulu.
const CACHE = 'financepro-offline-v1';
const OFFLINE_URL = '/offline.html';

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.add(OFFLINE_URL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.mode !== 'navigate') return; // selain navigasi (API, aset) langsung ke jaringan
  event.respondWith(fetch(req).catch(() => caches.match(OFFLINE_URL)));
});
