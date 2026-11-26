/**
 * Service Worker untuk Ruang Temu POS Offline Cache
 * Meng-cache aset statis aplikasi & gambar katalog produk
 * agar terminal kasir tetap dapat menampilkan visual menu
 * saat router Wi-Fi lokal atau koneksi internet kafe terputus.
 */

const CACHE_NAME = 'ruang-temu-pos-v2';
const IMAGE_CACHE_NAME = 'ruang-temu-images-v1';
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
        console.warn('[ServiceWorker] Gagal precache beberapa aset statis:', err);
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
          if (key !== CACHE_NAME && key !== IMAGE_CACHE_NAME) {
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

  // 1. Image Caching Strategy (Cache First, Network Fallback + Opaque Response Support)
  const isImage =
    event.request.destination === 'image' ||
    url.hostname.includes('unsplash.com') ||
    url.pathname.match(/\.(png|jpg|jpeg|webp|svg|gif)$/i);

  if (isImage) {
    event.respondWith(
      caches.open(IMAGE_CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          return fetch(event.request)
            .then((networkResponse) => {
              if (
                networkResponse &&
                (networkResponse.status === 200 || networkResponse.type === 'opaque')
              ) {
                cache.put(event.request, networkResponse.clone());
              }
              return networkResponse;
            })
            .catch(() => {
              // Jika offline dan belum ter-cache, kembalikan cached jika ada
              return cachedResponse;
            });
        });
      })
    );
    return;
  }

  // 2. Network First, Fallback to Cache Strategy untuk halaman & app shell
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
