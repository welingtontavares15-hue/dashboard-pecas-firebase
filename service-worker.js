const CACHE_VERSION = 'v34';
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
    './health/firebase-healthcheck.html',
    './js/config.js',
    './js/firebase-config.js',
    './js/firebase-init.js',
    './js/firebase-sync.js',
    './js/pwa.js',
    './js/utils.js',
    './js/analytics-engine.js',
    './js/logger.js',
    './js/indexeddb-storage.js',
    './js/storage.js',
    './js/data.js',
    './js/auth.js',
    './js/audit-log.js',
    './js/app.js',
    './js/ui-modern.js',
    './js/lazy/load-script.js',
    './js/pages/dashboard.js',
    './js/pages/solicitacoes.js',
    './js/pages/aprovacoes.js',
    './js/pages/pecas.js',
    './js/pages/relatorios.js',
    './js/pages/fornecedor.js',
    './js/pages/usuarios.js',
    './js/components/reports-modern.js'
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
    './js/fornecedor.js',
    './js/tecnicos.js'
  ],
  catalogo: [
    './js/pecas.js',
    './js/fornecedores.js'
  ],
  relatorios: [
    './js/relatorios.js',
    './js/components/reports-modern.js'
  ]
};

function normalizeAssetUrl(asset) {
  const url = new URL(asset, self.location.href);
  if (url.origin !== self.location.origin) {
    return url.href;
  }
  url.hash = '';
  url.search = '';
  return url.href;
}

const ASSET_CACHE_MAP = {};
Object.entries(PRECACHE).forEach(([module, assets]) => {
  const cacheName = MODULE_CACHES[module] || MODULE_CACHES.core;
  assets.forEach((asset) => {
    ASSET_CACHE_MAP[normalizeAssetUrl(asset)] = cacheName;
  });
});

const ALL_CACHES = Object.values(MODULE_CACHES);

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    await Promise.all(
      Object.entries(PRECACHE).map(([module, assets]) => precacheModule(module, assets))
    );
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => !ALL_CACHES.includes(key)).map((key) => caches.delete(key)));
    await self.clients.claim();
    await notifyClientsUpdated();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) {
    return;
  }

  if (event.request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(event.request));
    return;
  }

  const matchedCache = ASSET_CACHE_MAP[normalizeAssetUrl(event.request.url)];
  if (!matchedCache) {
    return;
  }

  event.respondWith(handleAssetRequest(matchedCache, event.request));
});

async function precacheModule(module, assets) {
  const cacheName = MODULE_CACHES[module] || MODULE_CACHES.core;
  const cache = await caches.open(cacheName);
  const results = await Promise.allSettled(
    assets.map(async (asset) => {
      const request = new Request(asset, { cache: 'reload' });
      const response = await fetch(request);
      if (!response.ok) {
        throw new Error(`${asset} (${response.status})`);
      }
      await cache.put(normalizeAssetUrl(asset), response);
    })
  );

  const failures = results
    .filter((result) => result.status === 'rejected')
    .map((result) => result.reason?.message || 'unknown_error');

  if (failures.length > 0) {
    console.warn(`Precache parcial com falhas em ${cacheName}:`, failures);
  }
}

async function handleNavigationRequest(request) {
  try {
    const response = await fetch(request);
    const cache = await caches.open(MODULE_CACHES.core);
    cache.put(normalizeAssetUrl('./index.html'), response.clone()).catch(() => {});
    return response;
  } catch (_error) {
    return (
      await caches.match(normalizeAssetUrl(request.url)) ||
      await caches.match(normalizeAssetUrl('./index.html')) ||
      await caches.match(normalizeAssetUrl(OFFLINE_URL))
    );
  }
}

async function handleAssetRequest(cacheName, request) {
  const cache = await caches.open(cacheName);
  const cacheKey = normalizeAssetUrl(request.url);
  const cachedResponse = await cache.match(cacheKey);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.ok) {
      cache.put(cacheKey, networkResponse.clone()).catch(() => {});
    }
    return networkResponse;
  } catch (_error) {
    return await cache.match(cacheKey) || await caches.match(normalizeAssetUrl(OFFLINE_URL));
  }
}

async function notifyClientsUpdated() {
  const clients = await self.clients.matchAll({ includeUncontrolled: true });
  clients.forEach((client) => client.postMessage({ type: 'CACHE_UPDATED', version: CACHE_VERSION }));
}
