const cache = new Map();

export function ensureClassicScript(src, checkGlobalName = '') {
    if (checkGlobalName && typeof window[checkGlobalName] !== 'undefined') {
        return Promise.resolve(window[checkGlobalName]);
    }

    if (cache.has(src)) {
        return cache.get(src);
    }

    const promise = new Promise((resolve, reject) => {
        const resolveOrRejectByGlobal = () => {
            if (!checkGlobalName) {
                resolve(true);
                return;
            }

            if (typeof window[checkGlobalName] !== 'undefined') {
                resolve(window[checkGlobalName]);
                return;
            }

            reject(new Error(`Global ${checkGlobalName} indisponível após carregar ${src}`));
        };

        const existing = document.querySelector(`script[data-lazy-src="${src}"]`);
        if (existing) {
            if (existing.dataset.loaded === 'true') {
                resolveOrRejectByGlobal();
                return;
            }
            existing.addEventListener('load', () => resolveOrRejectByGlobal(), { once: true });
            existing.addEventListener('error', () => reject(new Error(`Falha ao carregar ${src}`)), { once: true });
            return;
        }

        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.dataset.lazySrc = src;
        script.onload = () => {
            script.dataset.loaded = 'true';
            resolveOrRejectByGlobal();
        };
        script.onerror = () => reject(new Error(`Falha ao carregar ${src}`));
        document.head.appendChild(script);
    });

    const wrappedPromise = promise.catch((error) => {
        cache.delete(src);
        throw error;
    });

    cache.set(src, wrappedPromise);
    return wrappedPromise;
}
