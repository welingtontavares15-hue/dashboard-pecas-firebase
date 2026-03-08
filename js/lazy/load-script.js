const cache = new Map();
const SCRIPT_LOAD_TIMEOUT_MS = 15000;

function normalizeScriptSrc(src) {
    try {
        return new URL(src, window.location.href).href;
    } catch (_error) {
        return String(src || '');
    }
}

function resolveGlobalSymbol(globalName) {
    if (!globalName || typeof window === 'undefined') {
        return null;
    }

    if (typeof window[globalName] !== 'undefined') {
        return window[globalName];
    }

    try {
        const resolved = Function(`return (typeof ${globalName} !== 'undefined') ? ${globalName} : null;`)();
        if (typeof resolved !== 'undefined' && resolved !== null) {
            window[globalName] = resolved;
            return resolved;
        }
    } catch (_error) {
        // Ignore unsafe evaluation issues and fallback to null.
    }

    return null;
}

export function ensureClassicScript(src, checkGlobalName = '') {
    const normalizedSrc = normalizeScriptSrc(src);
    const resolvedGlobal = checkGlobalName ? resolveGlobalSymbol(checkGlobalName) : null;
    if (checkGlobalName && resolvedGlobal) {
        return Promise.resolve(resolvedGlobal);
    }

    if (cache.has(normalizedSrc)) {
        return cache.get(normalizedSrc);
    }

    const promise = new Promise((resolve, reject) => {
        let timeoutHandle = null;

        const clearLoadTimeout = () => {
            if (timeoutHandle) {
                clearTimeout(timeoutHandle);
                timeoutHandle = null;
            }
        };

        const resolveOrRejectByGlobal = () => {
            if (!checkGlobalName) {
                resolve(true);
                return;
            }

            const moduleRef = resolveGlobalSymbol(checkGlobalName);
            if (moduleRef) {
                resolve(moduleRef);
                return;
            }

            reject(new Error(`Global ${checkGlobalName} indisponível após carregar ${normalizedSrc}`));
        };

        const existing = document.querySelector(`script[data-lazy-src="${normalizedSrc}"]`);
        if (existing) {
            if (existing.dataset.loaded === 'true') {
                resolveOrRejectByGlobal();
                return;
            }
            existing.addEventListener('load', () => {
                clearLoadTimeout();
                resolveOrRejectByGlobal();
            }, { once: true });
            existing.addEventListener('error', () => {
                clearLoadTimeout();
                reject(new Error(`Falha ao carregar ${normalizedSrc}`));
            }, { once: true });
            timeoutHandle = setTimeout(() => {
                reject(new Error(`Timeout ao carregar ${normalizedSrc}`));
            }, SCRIPT_LOAD_TIMEOUT_MS);
            return;
        }

        const script = document.createElement('script');
        script.src = normalizedSrc;
        script.async = true;
        script.dataset.lazySrc = normalizedSrc;
        script.onload = () => {
            clearLoadTimeout();
            script.dataset.loaded = 'true';
            resolveOrRejectByGlobal();
        };
        script.onerror = () => {
            clearLoadTimeout();
            reject(new Error(`Falha ao carregar ${normalizedSrc}`));
        };

        timeoutHandle = setTimeout(() => {
            reject(new Error(`Timeout ao carregar ${normalizedSrc}`));
        }, SCRIPT_LOAD_TIMEOUT_MS);

        document.head.appendChild(script);
    });

    const wrappedPromise = promise.catch((error) => {
        cache.delete(normalizedSrc);
        throw error;
    });

    cache.set(normalizedSrc, wrappedPromise);
    return wrappedPromise;
}
