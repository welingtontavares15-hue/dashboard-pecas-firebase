const cache = new Map();
const SCRIPT_LOAD_TIMEOUT_MS = 15000;
const SCRIPT_LOAD_RETRY_LIMIT = 2;

function normalizeScriptSrc(src) {
    try {
        return new URL(src, window.location.href).href;
    } catch (_error) {
        return String(src || '');
    }
}

function getBuildVersion() {
    if (typeof window === 'undefined') {
        return 'dev';
    }
    return String(window.__APP_BUILD_VERSION__ || 'dev');
}

function buildScriptAttemptSrc(src, retryCount = 0) {
    try {
        const url = new URL(src, window.location.href);
        if (retryCount > 0) {
            url.searchParams.set('__retry', String(retryCount));
            url.searchParams.set('__build', getBuildVersion());
        }
        return url.href;
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

function removeScriptNode(node) {
    if (node && node.parentNode) {
        node.parentNode.removeChild(node);
    }
}

function createScriptError(code, message, originalError = null) {
    const error = new Error(message || code);
    error.code = code;
    error.originalError = originalError;
    return error;
}

function loadScriptAttempt(normalizedSrc, checkGlobalName, attempt = 0) {
    return new Promise((resolve, reject) => {
        let timeoutHandle = null;

        const clearLoadTimeout = () => {
            if (timeoutHandle) {
                clearTimeout(timeoutHandle);
                timeoutHandle = null;
            }
        };

        const fail = (code, message, originalError = null, scriptNode = null) => {
            clearLoadTimeout();
            if (scriptNode) {
                scriptNode.dataset.loadState = 'error';
            }
            reject(createScriptError(code, message, originalError));
        };

        const resolveOrRejectByGlobal = (scriptNode = null) => {
            if (!checkGlobalName) {
                resolve(true);
                return;
            }

            const moduleRef = resolveGlobalSymbol(checkGlobalName);
            if (moduleRef) {
                resolve(moduleRef);
                return;
            }

            fail(
                `module_export_missing:${checkGlobalName}`,
                `Global ${checkGlobalName} indisponível após carregar ${normalizedSrc}`,
                null,
                scriptNode
            );
        };

        const selector = `script[data-lazy-base="${normalizedSrc}"]`;
        let existing = document.querySelector(selector)
            || document.querySelector(`script[data-lazy-src="${normalizedSrc}"]`);

        if (existing) {
            const currentState = String(existing.dataset.loadState || '');
            const resolvedGlobal = checkGlobalName ? resolveGlobalSymbol(checkGlobalName) : true;

            if (existing.dataset.loaded === 'true' && resolvedGlobal) {
                resolve(resolvedGlobal);
                return;
            }

            if (currentState === 'error' || (existing.dataset.loaded === 'true' && checkGlobalName && !resolvedGlobal)) {
                removeScriptNode(existing);
                existing = null;
            }
        }

        if (existing) {
            existing.addEventListener('load', () => {
                clearLoadTimeout();
                resolveOrRejectByGlobal(existing);
            }, { once: true });
            existing.addEventListener('error', (event) => {
                fail(
                    `module_load_failed:${checkGlobalName || normalizedSrc}`,
                    `Falha ao carregar ${normalizedSrc}`,
                    event,
                    existing
                );
            }, { once: true });
            timeoutHandle = setTimeout(() => {
                fail(
                    `module_load_timeout:${checkGlobalName || normalizedSrc}`,
                    `Timeout ao carregar ${normalizedSrc}`,
                    null,
                    existing
                );
            }, SCRIPT_LOAD_TIMEOUT_MS);
            return;
        }

        const script = document.createElement('script');
        script.src = buildScriptAttemptSrc(normalizedSrc, attempt);
        script.async = true;
        script.dataset.lazyBase = normalizedSrc;
        script.dataset.lazySrc = script.src;
        script.dataset.loaded = 'false';
        script.dataset.loadState = 'loading';
        script.onload = () => {
            clearLoadTimeout();
            script.dataset.loaded = 'true';
            script.dataset.loadState = 'loaded';
            resolveOrRejectByGlobal(script);
        };
        script.onerror = (event) => {
            fail(
                `module_load_failed:${checkGlobalName || normalizedSrc}`,
                `Falha ao carregar ${normalizedSrc}`,
                event,
                script
            );
        };

        timeoutHandle = setTimeout(() => {
            fail(
                `module_load_timeout:${checkGlobalName || normalizedSrc}`,
                `Timeout ao carregar ${normalizedSrc}`,
                null,
                script
            );
        }, SCRIPT_LOAD_TIMEOUT_MS);

        document.head.appendChild(script);
    });
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

    const promise = (async () => {
        let lastError = null;

        for (let attempt = 0; attempt < SCRIPT_LOAD_RETRY_LIMIT; attempt += 1) {
            try {
                return await loadScriptAttempt(normalizedSrc, checkGlobalName, attempt);
            } catch (error) {
                lastError = error;
                const existing = document.querySelector(`script[data-lazy-base="${normalizedSrc}"]`);
                if (existing && existing.dataset.loadState === 'error') {
                    removeScriptNode(existing);
                }
            }
        }

        throw createScriptError(
            lastError?.code || `module_load_failed:${checkGlobalName || normalizedSrc}`,
            lastError?.message || `Falha ao carregar ${normalizedSrc}`,
            lastError?.originalError || lastError?.message || null
        );
    })();

    const wrappedPromise = promise.catch((error) => {
        cache.delete(normalizedSrc);
        throw error;
    });

    cache.set(normalizedSrc, wrappedPromise);
    return wrappedPromise;
}
