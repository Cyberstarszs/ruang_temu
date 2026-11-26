/**
 * Service Worker untuk Ruang Temu POS Offline Cache
 * Meng-cache aset statis aplikasi agar halaman kasir tetap dapat dimuat
 * saat router Wi-Fi lokal atau koneksi internet kafe terputus.
 */

const CACHE_NAME = 'ruang-temu-pos-v1';
const STATIC_ASSETS = [
  '/',
  '/pos',
  '/manifest.json',
  '/brand/ruang-temu-navbar.png',
  '/favicon.png',
  '/favicon.svg',
  '/icons.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[ServiceWorker] Gagal precache beberapa aset:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Hanya tangani permintaan GET
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Jangan tangani API requests di service worker (ditangani oleh IndexedDB queue di application layer)
  if (url.pathname.startsWith('/api/') || url.port === '5000') {
    return;
  }

  // Network First, Fallback to Cache Strategy untuk halaman & aset statis
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Jika route navigasi HTML offline, fallback ke cached root / pos
          if (event.request.mode === 'navigate') {
            return caches.match('/pos') || caches.match('/');
          }
          return new Response('Offline - Ruang Temu POS', {
            status: 503,
            statusText: 'Service Unavailable (Offline)',
          });
        });
      })
  );
});
