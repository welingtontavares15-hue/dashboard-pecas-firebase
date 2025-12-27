// Cache version incremented to force refresh of cached assets after code changes
// Update this version for every release to ensure users get the latest code
const CACHE_VERSION = 'v5';
const CACHE_PREFIX = 'dashboard-pecas';
const OFFLINE_URL = './offline.html';

const MODULE_CACHES = {
  core: `${CACHE_PREFIX}-core-${CACHE_VERSION}`,
  dashboard: `${CACHE_PREFIX}-dashboard-${CACHE_VERSION}`,
  solicitacoes: `${CACHE_PREFIX}-solicitacoes-${CACHE_VERSION}`,
  catalogo: `${CACHE_PREFIX}-catalogo-${CACHE_VERSION}`,
  relatorios: `${CACHE_PREFIX}-relatorios-${CACHE_VERSION}`
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
    './js/app.js'
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
  const matchedCache = ASSET_CACHE_MAP[requestUrl.href];

  if (!matchedCache) {
    if (event.request.mode === 'navigate') {
      event.respondWith(
        fetch(event.request).catch(() => caches.match(OFFLINE_URL))
      );
    }
    return;
  }

  event.respondWith(
    caches.open(matchedCache).then((cache) =>
      cache.match(event.request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        return fetch(event.request)
          .then((networkResponse) => {
            cache.put(event.request, networkResponse.clone()).catch((err) => console.warn('Cache put failed', err));
            return networkResponse;
          })
          .catch(() => caches.match(OFFLINE_URL));
      })
    )
  );
});

async function notifyClientsUpdated() {
  const clients = await self.clients.matchAll({ includeUncontrolled: true });
  clients.forEach((client) => client.postMessage({ type: 'CACHE_UPDATED', version: CACHE_VERSION }));
}
