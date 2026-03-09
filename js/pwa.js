(function () {
    if (!('serviceWorker' in navigator)) {
        return;
    }

    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./service-worker.js')
            .then(() => {
                if (typeof Logger !== 'undefined' && typeof Logger.info === 'function') {
                    Logger.info(Logger.CATEGORY.SYSTEM, 'service_worker_registered');
                }
            })
            .catch((err) => console.warn('Falha ao registrar Service Worker', err));
    });
})();

