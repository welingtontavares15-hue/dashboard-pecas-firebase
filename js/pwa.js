(function () {
    if (!('serviceWorker' in navigator)) {
        return;
    }

    let refreshing = false;

    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) {
            return;
        }
        refreshing = true;
        window.location.reload();
    });

    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./service-worker.js')
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
                console.log('Service Worker registrado para PWA offline-first');
            })
            .catch((err) => console.warn('Falha ao registrar Service Worker', err));
    });
})();
