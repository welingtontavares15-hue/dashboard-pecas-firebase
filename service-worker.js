// Cache version incremented to force refresh of cached assets after code changes
// Update this version for every release to ensure users get the latest code
const CACHE_VERSION = 'v6'; // Incremented for performance improvements
const CACHE_PREFIX = 'dashboard-pecas';
const OFFLINE_URL = './offline.html';
const CACHE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

const MODULE_CACHES = {
  core: `${CACHE_PREFIX}-core-${CACHE_VERSION}`,
  dashboard: `${CACHE_PREFIX}-dashboard-${CACHE_VERSION}`,
  solicitacoes: `${CACHE_PREFIX}-solicitacoes-${CACHE_VERSION}`,
  catalogo: `${CACHE_PREFIX}-catalogo-${CACHE_VERSION}`,
  relatorios: `${CACHE_PREFIX}-relatorios-${CACHE_VERSION}`,
  static: `${CACHE_PREFIX}-static-${CACHE_VERSION}` // New: for static assets
};

const PRECACHE = {
  core: [
    './',
    './index.html',
    './offline.html',
    './clear-cache.html',
    './css/style.css',
    './manifest.webmanifest',
    './icons/icon.svg',
    './js/config.js',
    './js/utils.js',
    './js/pwa.js',
    './js/indexeddb-storage.js',
    './js/storage.js',
    './js/data.js',
    './js/app.js',
    // Security modules
    './js/security/sanitizer.js',
    './js/security/rate-limiter.js',
    './js/security/validator.js'
  ],
  dashboard: [
    './js/dashboard.js',
    './js/sheets.js',
    './js/onedrive.js',
    './js/relatorios.js',
    './js/vendor/chart.umd.js'
  ],
  solicitacoes: [
    './js/solicitacoes.js',
    './js/aprovacoes.js',
    './js/auth.js',
    './js/tecnicos.js'
  ],
  catalogo: [
    './js/pecas.js',
    './js/fornecedores.js'
  ],
  relatorios: [
    './js/relatorios.js'
  ]
};

const ASSET_CACHE_MAP = {};
Object.entries(PRECACHE).forEach(([module, assets]) => {
  const cacheName = MODULE_CACHES[module] || MODULE_CACHES.core;
  assets.forEach((asset) => {
    ASSET_CACHE_MAP[new URL(asset, self.location.origin).href] = cacheName;
  });
});

const ALL_CACHES = Object.values(MODULE_CACHES);

// Helper function to check if cached response is too old
function isCacheFresh(response) {
  if (!response) return false;
  const cachedDate = response.headers.get('date');
  if (!cachedDate) return true; // If no date header, treat as fresh
  const cacheTime = new Date(cachedDate).getTime();
  const now = Date.now();
  return (now - cacheTime) < CACHE_MAX_AGE;
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all(
      Object.entries(PRECACHE).map(([module, assets]) =>
        caches.open(MODULE_CACHES[module]).then((cache) => cache.addAll(assets))
      )
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => !ALL_CACHES.includes(key)).map((key) => caches.delete(key)))
    ).then(() => self.clients.claim()).then(notifyClientsUpdated)
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const requestUrl = new URL(event.request.url);
  
  // Performance: Network-first strategy for Firebase API calls
  // Use strict domain matching to prevent URL substring attacks
  const isFirebaseAPI = (requestUrl.hostname === 'firebaseio.com' || 
                         requestUrl.hostname.endsWith('.firebaseio.com') ||
                         requestUrl.hostname === 'googleapis.com' ||
                         requestUrl.hostname.endsWith('.googleapis.com'));
  
  if (isFirebaseAPI) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache successful responses
          if (response.ok) {
            const clonedResponse = response.clone();
            caches.open(MODULE_CACHES.core).then((cache) => {
              cache.put(event.request, clonedResponse);
            });
          }
          return response;
        })
        .catch(() => {
          // Fallback to cache if network fails
          return caches.match(event.request);
        })
    );
    return;
  }
  
  const matchedCache = ASSET_CACHE_MAP[requestUrl.href];

  if (!matchedCache) {
    if (event.request.mode === 'navigate') {
      event.respondWith(
        fetch(event.request).catch(() => caches.match(OFFLINE_URL))
      );
    }
    return;
  }

  // Performance: Stale-while-revalidate strategy for cached assets
  event.respondWith(
    caches.open(matchedCache).then((cache) =>
      cache.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request)
          .then((networkResponse) => {
            // Update cache in the background
            cache.put(event.request, networkResponse.clone()).catch((err) => console.warn('Cache put failed', err));
            return networkResponse;
          })
          .catch(() => cachedResponse || caches.match(OFFLINE_URL));
        
        // Return cached response if fresh, otherwise wait for network
        if (cachedResponse && isCacheFresh(cachedResponse)) {
          return cachedResponse;
        }
        return fetchPromise;
      })
    )
  );
});

async function notifyClientsUpdated() {
  const clients = await self.clients.matchAll({ includeUncontrolled: true });
  clients.forEach((client) => client.postMessage({ type: 'CACHE_UPDATED', version: CACHE_VERSION }));
}
