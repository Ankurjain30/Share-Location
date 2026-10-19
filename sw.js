const CACHE_NAME = 'share-location-v3';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './app.js',
    './manifest.json',
    './icon.png',
    'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&display=swap'
];

// Install: Cache all core assets and activate immediately
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
    );
    self.skipWaiting();
});

// Activate: Remove stale caches and take control immediately
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

// Fetch: NETWORK-FIRST strategy for maximum reliability during testing/updates
self.addEventListener('fetch', (event) => {
    if (!event.request.url.startsWith(self.location.origin) && !event.request.url.includes('fonts.googleapis.com')) {
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then((networkResponse) => {
                // If network is available, fetch the latest file, update cache, and return it
                return caches.open(CACHE_NAME).then((cache) => {
                    if (event.request.method === 'GET' && networkResponse.status === 200) {
                        cache.put(event.request, networkResponse.clone());
                    }
                    return networkResponse;
                });
            })
            .catch(() => {
                // If offline, fallback to the cache
                return caches.match(event.request).then((cachedResponse) => {
                    if (cachedResponse) {
                        return cachedResponse;
                    }
                    if (event.request.headers.get('accept')?.includes('text/html')) {
                        return caches.match('./index.html');
                    }
                });
            })
    );
});