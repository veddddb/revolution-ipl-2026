// ── Revolution IPL 2026 — Service Worker ──
// Caches the app shell for offline use.
// Google Sheets data always fetched live (no cache) so scores stay fresh.

const CACHE_NAME   = 'revo-ipl-v1';
const CACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  // External fonts/scripts are cached on first fetch
];

// ── Install: pre-cache app shell ──
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(CACHE_ASSETS).catch(err => {
        // Don't block install if an optional asset fails
        console.warn('[SW] Pre-cache failed for some assets:', err);
      });
    })
  );
  self.skipWaiting();
});

// ── Activate: clean up old caches ──
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME)
          .map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch: Network-first for sheets data, Cache-first for everything else ──
self.addEventListener('fetch', event => {
  const url = event.request.url;

  // Always go network-first for Google Sheets (live data)
  if (url.includes('docs.google.com') || url.includes('cricket.sportmonks.com')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        // Network failed — return a fake empty response so the app doesn't crash
        return new Response(JSON.stringify({ error: 'offline' }), {
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

  // Cache-first for app shell + static assets
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request).then(response => {
        // Cache valid GET responses from our origin + CDNs we trust
        if (
          response.ok &&
          event.request.method === 'GET' &&
          (
            url.includes('fonts.googleapis.com') ||
            url.includes('fonts.gstatic.com') ||
            url.includes('cdn.tailwindcss.com') ||
            url.startsWith(self.location.origin)
          )
        ) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // Offline and not cached — return the cached index as fallback
        return caches.match('/') || caches.match('/index.html');
      });
    })
  );
});
