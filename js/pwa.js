(function () {
    if (!('serviceWorker' in navigator)) {
        return;
    }

    const BUILD_VERSION = String(window.__APP_BUILD_VERSION__ || '20260308i');
    const CACHE_VERSION = String(window.__APP_CACHE_VERSION__ || 'v15');
    const BUILD_INFO_URL = `./BUILD_INFO.txt?v=${BUILD_VERSION}`;
    let refreshing = false;

    const logCacheIssue = (message, extra = {}) => {
        if (typeof Logger !== 'undefined' && typeof Logger.error === 'function') {
            Logger.error((Logger.CATEGORY && Logger.CATEGORY.CACHE) || 'cache', message, {
                requestId: `pwa:${message}`,
                action: 'pwa_cache_validation',
                stage: 'asset_validation',
                route: window.location.pathname,
                source: 'pwa',
                buildVersion: BUILD_VERSION,
                cacheVersion: CACHE_VERSION,
                ...extra
            });
        }
    };

    const clearStaleCaches = async () => {
        if (!('caches' in window)) {
            return;
        }

        const keys = await caches.keys();
        await Promise.all(keys
            .filter((key) => key.startsWith('dashboard-pecas-') && !key.includes(CACHE_VERSION))
            .map((key) => caches.delete(key)));
    };

    const hardReload = async (reason = 'asset_version_mismatch') => {
        if (refreshing) {
            return;
        }

        refreshing = true;
        logCacheIssue(reason);

        try {
            await clearStaleCaches();
        } catch (_error) {
            // Ignore cache cleanup failures and continue with reload.
        }

        window.location.reload();
    };

    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) {
            return;
        }
        refreshing = true;
        window.location.reload();
    });

    navigator.serviceWorker.addEventListener('message', (event) => {
        const payload = event?.data || {};
        if (payload.type !== 'CACHE_UPDATED') {
            return;
        }

        const cacheMismatch = payload.version && payload.version !== CACHE_VERSION;
        const buildMismatch = payload.buildVersion && payload.buildVersion !== BUILD_VERSION;
        if (cacheMismatch || buildMismatch) {
            hardReload(cacheMismatch ? 'asset_version_mismatch' : 'stale_cache_detected');
        }
    });

    const verifyBuildInfo = async () => {
        try {
            const response = await fetch(BUILD_INFO_URL, { cache: 'no-store' });
            if (!response.ok) {
                return;
            }

            const text = await response.text();
            if (!text.includes(`buildVersion=${BUILD_VERSION}`)) {
                await hardReload('stale_cache_detected');
            }
        } catch (_error) {
            // Skip build verification when offline.
        }
    };

    window.addEventListener('load', () => {
        navigator.serviceWorker.register(`./service-worker.js?v=${BUILD_VERSION}`)
            .then((registration) => {
                if (registration && registration.waiting) {
                    registration.waiting.postMessage('SKIP_WAITING');
                }

                registration.addEventListener('updatefound', () => {
                    const installingWorker = registration.installing;
                    if (!installingWorker) {
                        return;
                    }

                    installingWorker.addEventListener('statechange', () => {
                        if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            installingWorker.postMessage('SKIP_WAITING');
                        }
                    });
                });

                registration.update().catch(() => {});
                verifyBuildInfo().catch(() => {});
                console.log('Service Worker registrado para PWA offline-first');
            })
            .catch((err) => console.warn('Falha ao registrar Service Worker', err));
    });
})();
