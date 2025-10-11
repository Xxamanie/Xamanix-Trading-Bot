const CACHE_NAME = 'xamanix-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/index.tsx',
  '/App.tsx',
  '/types.ts',
  '/constants.ts',
  '/components/icons.tsx',
  '/components/RecommendationsPanel.tsx',
  '/components/BacktestResults.tsx',
  '/components/CodeViewer.tsx',
  '/contexts/APIContext.tsx',
  '/services/geminiService.ts',
  '/services/bybitService.ts',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.2/dist/chart.umd.min.js'
];

self.addEventListener('install', (event) => {
  // Perform install steps
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        // Use a more resilient addAll by fetching requests individually
        const promises = urlsToCache.map((url) => {
          return fetch(new Request(url, { mode: 'no-cors' })).then(response => {
            if (response.status === 200) {
              return cache.put(url, response);
            }
            return Promise.resolve();
          }).catch(err => {
            console.warn(`Skipping caching for ${url}:`, err);
          });
        });
        return Promise.all(promises);
      })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return response
        if (response) {
          return response;
        }

        // Not in cache - fetch from network
        return fetch(event.request).then(
          (response) => {
            // Check if we received a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              if (response && response.type === 'opaque') {
                 // Don't cache opaque responses (no-cors)
                 return response;
              }
            }
            
            // IMPORTANT: Clone the response. A response is a stream
            // and because we want the browser to consume the response
            // as well as the cache consuming the response, we need
            // to clone it so we have two streams.
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then((cache) => {
                // We don't cache POST requests or chrome-extension requests
                if (event.request.method !== 'GET' || event.request.url.startsWith('chrome-extension://')) {
                    return;
                }
                cache.put(event.request, responseToCache);
              });

            return response;
          }
        );
      })
  );
});

self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});