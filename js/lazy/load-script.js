const cache = new Map();

export function ensureClassicScript(src, checkGlobalName = '') {
    if (checkGlobalName && typeof window[checkGlobalName] !== 'undefined') {
        return Promise.resolve(window[checkGlobalName]);
    }

    if (cache.has(src)) {
        return cache.get(src);
    }

    const promise = new Promise((resolve, reject) => {
        const existing = document.querySelector(`script[data-lazy-src="${src}"]`);
        if (existing) {
            existing.addEventListener('load', () => resolve(window[checkGlobalName]));
            existing.addEventListener('error', () => reject(new Error(`Falha ao carregar ${src}`)));
            return;
        }

        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.dataset.lazySrc = src;
        script.onload = () => resolve(window[checkGlobalName]);
        script.onerror = () => reject(new Error(`Falha ao carregar ${src}`));
        document.head.appendChild(script);
    });

    cache.set(src, promise);
    return promise;
}
