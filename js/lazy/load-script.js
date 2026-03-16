const cache = new Map();

function resolveClassicGlobal(checkGlobalName = '') {
    if (!checkGlobalName) {
        return true;
    }
    return window[checkGlobalName];
}

export function ensureClassicScript(src, checkGlobalName = '') {
    if (checkGlobalName && typeof window[checkGlobalName] !== 'undefined') {
        return Promise.resolve(window[checkGlobalName]);
    }

    const existing = document.querySelector(`script[data-lazy-src="${src}"]`);
    if (existing?.dataset.loaded === 'true') {
        return Promise.resolve(resolveClassicGlobal(checkGlobalName));
    }

    if (cache.has(src)) {
        return cache.get(src);
    }

    const promise = new Promise((resolve, reject) => {
        const resolveLoadedScript = () => {
            resolve(resolveClassicGlobal(checkGlobalName));
        };

        const rejectLoad = (error) => {
            cache.delete(src);
            reject(error);
        };

        if (existing) {
            existing.addEventListener('load', () => {
                existing.dataset.loaded = 'true';
                resolveLoadedScript();
            }, { once: true });
            existing.addEventListener('error', () => {
                rejectLoad(new Error(`Falha ao carregar ${src}`));
            }, { once: true });
            return;
        }

        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.dataset.lazySrc = src;
        script.onload = () => {
            script.dataset.loaded = 'true';
            resolveLoadedScript();
        };
        script.onerror = () => {
            script.remove();
            rejectLoad(new Error(`Falha ao carregar ${src}`));
        };
        document.head.appendChild(script);
    });

    cache.set(src, promise);
    return promise;
}
