// Cache version incremented to force refresh of cached assets after code changes
// Update this version for every release to ensure users get the latest code
const CACHE_VERSION = 'v6-optimized';
const CACHE_PREFIX = 'dashboard-pecas';
const OFFLINE_URL = './offline.html';

const MODULE_CACHES = {
  core: `${CACHE_PREFIX}-core-${CACHE_VERSION}`,
  dashboard: `${CACHE_PREFIX}-dashboard-${CACHE_VERSION}`,
  solicitacoes: `${CACHE_PREFIX}-solicitacoes-${CACHE_VERSION}`,
  catalogo: `${CACHE_PREFIX}-catalogo-${CACHE_VERSION}`,
  relatorios: `${CACHE_PREFIX}-relatorios-${CACHE_VERSION}`,
  runtime: `${CACHE_PREFIX}-runtime-${CACHE_VERSION}`
};

// Cache strategy configuration
const CACHE_STRATEGIES = {
  CACHE_FIRST: 'cache-first',
  NETWORK_FIRST: 'network-first',
  STALE_WHILE_REVALIDATE: 'stale-while-revalidate',
  NETWORK_ONLY: 'network-only'
};

// Cache max age in milliseconds
const CACHE_MAX_AGE = {
  static: 7 * 24 * 60 * 60 * 1000, // 7 days
  dynamic: 1 * 60 * 60 * 1000, // 1 hour
  api: 5 * 60 * 1000 // 5 minutes
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
    './js/logger.js',
    './js/pwa.js',
    './js/module-loader.js',
    './js/performance-monitor.js',
    './js/indexeddb-storage.js',
    './js/storage.js',
    './js/firebase-init.js',
    './js/data.js',
    './js/auth.js',
    './js/app.js'
  ],
  // These modules will be lazy-loaded on demand
  dashboard: [],
  solicitacoes: [],
  catalogo: [],
  relatorios: []
};

const ASSET_CACHE_MAP = {};
Object.entries(PRECACHE).forEach(([module, assets]) => {
  const cacheName = MODULE_CACHES[module] || MODULE_CACHES.core;
  assets.forEach((asset) => {
    ASSET_CACHE_MAP[new URL(asset, self.location.origin).href] = cacheName;
  });
});

const ALL_CACHES = Object.values(MODULE_CACHES);

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
  
  // Helper function to check if hostname ends with a specific domain
  const isHostnameEndsWith = (hostname, domain) => {
    return hostname === domain || hostname.endsWith('.' + domain);
  };
  
  // Handle Firebase API requests with network-first strategy
  if (requestUrl.hostname.includes('firebasestorage') || 
      isHostnameEndsWith(requestUrl.hostname, 'firebaseio.com') ||
      isHostnameEndsWith(requestUrl.hostname, 'googleapis.com')) {
    event.respondWith(networkFirst(event.request, MODULE_CACHES.runtime));
    return;
  }
  
  // Handle CDN resources with stale-while-revalidate
  if (isHostnameEndsWith(requestUrl.hostname, 'cdnjs.cloudflare.com') ||
      isHostnameEndsWith(requestUrl.hostname, 'fonts.googleapis.com') ||
      isHostnameEndsWith(requestUrl.hostname, 'fonts.gstatic.com')) {
    event.respondWith(staleWhileRevalidate(event.request, MODULE_CACHES.runtime));
    return;
  }
  
  const matchedCache = ASSET_CACHE_MAP[requestUrl.href];

  // Handle precached assets with cache-first strategy
  if (matchedCache) {
    event.respondWith(cacheFirst(event.request, matchedCache));
    return;
  }

  // Handle navigation requests
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }
  
  // Handle other requests with stale-while-revalidate
  event.respondWith(staleWhileRevalidate(event.request, MODULE_CACHES.runtime));
});

/**
 * Cache-first strategy: Serve from cache, fallback to network
 */
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      // Clone response before caching
      const responseToCache = networkResponse.clone();
      cache.put(request, responseToCache).catch(err => {
        // Log cache errors in development only
        if (self.location.hostname === 'localhost') {
          console.warn('[SW] Cache put failed:', err.message);
        }
      });
    }
    return networkResponse;
  } catch (error) {
    return caches.match(OFFLINE_URL);
  }
}

/**
 * Network-first strategy: Try network, fallback to cache
 */
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const responseToCache = networkResponse.clone();
      cache.put(request, responseToCache).catch(err => {
        if (self.location.hostname === 'localhost') {
          console.warn('[SW] Cache put failed:', err.message);
        }
      });
    }
    return networkResponse;
  } catch (error) {
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
}

/**
 * Stale-while-revalidate strategy: Return cache immediately, update in background
 */
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  const fetchPromise = fetch(request).then(networkResponse => {
    if (networkResponse.ok) {
      const responseToCache = networkResponse.clone();
      cache.put(request, responseToCache).catch(err => {
        if (self.location.hostname === 'localhost') {
          console.warn('[SW] Cache put failed:', err.message);
        }
      });
    }
    return networkResponse;
  }).catch(() => null);
  
  return cachedResponse || fetchPromise;
}

/**
 * Check if cached response is fresh
 */
function isCacheFresh(response, maxAge) {
  const cachedDate = response.headers.get('date');
  if (!cachedDate) return false;
  
  const cacheTime = new Date(cachedDate).getTime();
  const now = Date.now();
  return (now - cacheTime) < maxAge;
}

async function notifyClientsUpdated() {
  const clients = await self.clients.matchAll({ includeUncontrolled: true });
  clients.forEach((client) => client.postMessage({ type: 'CACHE_UPDATED', version: CACHE_VERSION }));
}
