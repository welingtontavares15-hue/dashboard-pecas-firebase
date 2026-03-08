// Cache version incremented to force refresh of cached assets after code changes
// Update this version for every release to ensure users get the latest code
const BUILD_VERSION = '20260308i';
const CACHE_VERSION = 'v15';
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
    './BUILD_INFO.txt',
    './css/style.css',
    './manifest.webmanifest',
    './icons/icon.svg',
    './js/config.js',
    './health/firebase-healthcheck.html',
    './js/firebase-config.js',
    './js/firebase-init.js',
    './js/utils.js',
    './js/pwa.js',
    './js/logger.js',
    './js/indexeddb-storage.js',
    './js/storage.js',
    './js/data.js',
    './js/auth.js',
    './js/audit-log.js',
    './js/app.js',
    './js/ui-modern.js',
    './js/pages/dashboard.js',
    './js/pages/solicitacoes.js',
    './js/pages/aprovacoes.js',
    './js/pages/fornecedor.js',
    './js/pages/pecas.js',
    './js/pages/relatorios.js',
    './js/pages/usuarios.js',
    './js/lazy/load-script.js'
  ],
  dashboard: [
    './js/dashboard.js',
    './js/sheets.js',
    './js/onedrive.js',
    './js/relatorios.js',
    './js/vendor/chart.umd.js',
    './js/components/dashboard-modern.js',
    './js/components/reports-modern.js'
  ],
  solicitacoes: [
    './js/solicitacoes.js',
    './js/aprovacoes.js',
    './js/fornecedor.js',
    './js/tecnicos.js',
    './js/fornecedores.js',
    './js/usuarios.js',
    './js/pecas.js'
  ],
  catalogo: [
    './js/components/data-table.js',
    './js/components/filters.js',
    './js/components/badge-status.js',
    './js/components/status-badge.js'
  ],
  relatorios: [
    './js/components/header.js',
    './js/components/kpi-card.js',
    './js/components/loader.js',
    './js/components/modal.js',
    './js/components/sidebar.js',
    './js/components/toast.js'
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

function resolveCacheRoute(requestUrl) {
  const normalizedAssetUrl = new URL(requestUrl.href);
  normalizedAssetUrl.search = '';
  normalizedAssetUrl.hash = '';

  const matchedCache = ASSET_CACHE_MAP[requestUrl.href] || ASSET_CACHE_MAP[normalizedAssetUrl.href];
  const normalizedAssetHref = ASSET_CACHE_MAP[normalizedAssetUrl.href] ? normalizedAssetUrl.href : null;

  return {
    matchedCache,
    normalizedAssetHref,
    normalizedPathname: normalizedAssetUrl.pathname
  };
}

async function putInCache(cache, request, response, normalizedAssetHref = null) {
  if (!response || response.status >= 400) {
    return;
  }

  try {
    await cache.put(request, response.clone());
  } catch (error) {
    console.warn('Cache put failed', error);
  }

  if (normalizedAssetHref) {
    try {
      await cache.put(normalizedAssetHref, response.clone());
    } catch (error) {
      console.warn('Cache put failed', error);
    }
  }
}

async function findCachedResponse(cache, request, normalizedAssetHref = null) {
  const direct = await cache.match(request);
  if (direct) {
    return direct;
  }

  if (normalizedAssetHref) {
    const normalized = await cache.match(normalizedAssetHref);
    if (normalized) {
      return normalized;
    }
  }

  return null;
}

async function networkFirst({ request, cacheName, normalizedAssetHref = null, fallbackOffline = false }) {
  const cache = await caches.open(cacheName);

  try {
    const networkResponse = await fetch(request);
    await putInCache(cache, request, networkResponse, normalizedAssetHref);
    return networkResponse;
  } catch (_error) {
    const cached = await findCachedResponse(cache, request, normalizedAssetHref);
    if (cached) {
      return cached;
    }

    if (fallbackOffline) {
      return caches.match(OFFLINE_URL);
    }

    throw _error;
  }
}

async function cacheFirst({ request, cacheName, normalizedAssetHref = null, fallbackOffline = false }) {
  const cache = await caches.open(cacheName);
  const cached = await findCachedResponse(cache, request, normalizedAssetHref);
  if (cached) {
    return cached;
  }

  try {
    const networkResponse = await fetch(request);
    await putInCache(cache, request, networkResponse, normalizedAssetHref);
    return networkResponse;
  } catch (_error) {
    if (fallbackOffline) {
      return caches.match(OFFLINE_URL);
    }

    throw _error;
  }
}

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  const requestUrl = new URL(event.request.url);
  const { matchedCache, normalizedAssetHref, normalizedPathname } = resolveCacheRoute(requestUrl);

  if (!matchedCache) {
    if (event.request.mode === 'navigate') {
      event.respondWith(
        fetch(event.request).catch(() => caches.match(OFFLINE_URL))
      );
    }
    return;
  }

  const destination = String(event.request.destination || '').toLowerCase();
  const isNavigation = event.request.mode === 'navigate' || destination === 'document';
  const isScriptRequest = destination === 'script' || /\.m?js$/i.test(normalizedPathname || '');
  const isCoreShell = normalizedPathname === '/' || /\/index\.html$/i.test(normalizedPathname || '');
  const isBuildInfo = /\/BUILD_INFO\.txt$/i.test(normalizedPathname || '');
  const preferNetwork = isNavigation
    || isScriptRequest
    || isCoreShell
    || isBuildInfo
    || event.request.cache === 'no-store'
    || event.request.cache === 'reload';

  event.respondWith(
    preferNetwork
      ? networkFirst({
        request: event.request,
        cacheName: matchedCache,
        normalizedAssetHref,
        fallbackOffline: isNavigation || isCoreShell
      })
      : cacheFirst({
        request: event.request,
        cacheName: matchedCache,
        normalizedAssetHref,
        fallbackOffline: isNavigation
      })
  );
});

async function notifyClientsUpdated() {
  const clients = await self.clients.matchAll({ includeUncontrolled: true });
  clients.forEach((client) => client.postMessage({
    type: 'CACHE_UPDATED',
    version: CACHE_VERSION,
    buildVersion: BUILD_VERSION
  }));
}
