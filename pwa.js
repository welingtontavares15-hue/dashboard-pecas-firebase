(function () {
    if (!('serviceWorker' in navigator)) {
        return;
    }

    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./service-worker.js')
            .then(() => console.log('Service Worker registrado para PWA offline-first'))
            .catch((err) => console.warn('Falha ao registrar Service Worker', err));
    });
})();
