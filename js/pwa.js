(function () {
    if (!('serviceWorker' in navigator)) {
        return;
    }

    let controllerRefreshPending = false;

    function log(level, event, payload = {}) {
        if (typeof Logger !== 'undefined' && typeof Logger[level] === 'function') {
            Logger[level](Logger.CATEGORY.SYSTEM, event, payload);
        }
    }

    function notifyUpdate(message, type = 'info') {
        if (typeof Utils !== 'undefined' && typeof Utils.showToast === 'function') {
            Utils.showToast(message, type);
        }
    }

    function requestActivation(worker) {
        if (!worker || typeof worker.postMessage !== 'function') {
            return;
        }

        worker.postMessage('SKIP_WAITING');
    }

    function bindRegistration(registration) {
        if (!registration) {
            return;
        }

        if (registration.waiting) {
            log('info', 'service_worker_update_waiting', {
                scope: registration.scope || 'unknown'
            });
            notifyUpdate('Nova versão disponível. Atualizando o aplicativo...', 'info');
            requestActivation(registration.waiting);
        }

        registration.addEventListener('updatefound', () => {
            const worker = registration.installing;
            if (!worker) {
                return;
            }

            worker.addEventListener('statechange', () => {
                if (worker.state !== 'installed') {
                    return;
                }

                if (!navigator.serviceWorker.controller) {
                    log('debug', 'service_worker_cached_for_offline', {
                        scope: registration.scope || 'unknown'
                    });
                    return;
                }

                log('info', 'service_worker_update_installed', {
                    scope: registration.scope || 'unknown'
                });
                notifyUpdate('Nova versão detectada. Atualizando o aplicativo...', 'info');
                requestActivation(worker);
            });
        });
    }

    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./service-worker.js')
            .then((registration) => {
                log('info', 'service_worker_registered', {
                    scope: registration.scope || 'unknown'
                });
                bindRegistration(registration);

                if (typeof registration.update === 'function') {
                    registration.update().catch((error) => {
                        log('warn', 'service_worker_update_check_failed', {
                            error: error?.message || String(error)
                        });
                    });
                }
            })
            .catch((error) => {
                log('warn', 'service_worker_register_failed', {
                    error: error?.message || String(error)
                });
                console.warn('Falha ao registrar Service Worker', error);
            });
    });

    navigator.serviceWorker.addEventListener('message', (event) => {
        if (!event?.data || event.data.type !== 'CACHE_UPDATED') {
            return;
        }

        log('info', 'service_worker_cache_updated', {
            version: event.data.version || 'unknown'
        });
        notifyUpdate('Arquivos atualizados. Recarregando a aplicação...', 'info');
    });

    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (controllerRefreshPending) {
            return;
        }

        controllerRefreshPending = true;
        window.location.reload();
    });
})();
