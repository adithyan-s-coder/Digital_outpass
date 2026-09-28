// Smart Outpass PWA Service Worker (Optimized Stale-While-Revalidate)
const CACHE_NAME = 'outpass-cache-v4';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/index.css?v=1.3',
  '/js/app.js?v=1.4',
  '/js/student.js?v=1.4',
  '/js/staff.js?v=1.4',
  '/js/hod.js?v=1.4',
  '/js/security.js?v=1.4',
  '/js/admin.js?v=1.4',
  '/assets/images/favicon.svg'
];

// Install event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Activate event
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
    }).then(() => self.clients.claim())
  );
});

// Fetch event: Bypass API calls; Stale-While-Revalidate for static assets
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Never intercept or cache dynamic API endpoints in the Service Worker
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200 && (url.origin === self.location.origin || url.hostname.includes('unpkg.com') || url.hostname.includes('fonts.g'))) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        // Return cached asset immediately if available, otherwise wait for network
        return cachedResponse || fetchPromise;
      });
    })
  );
});
