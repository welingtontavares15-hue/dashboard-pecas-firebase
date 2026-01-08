/**
 * Firebase security and configuration policy helpers.
 * - Prefers runtime-provided Firebase configs (window.__ENV.firebaseConfig)
 * - Disables anonymous auth by default in production
 * - Allows explicit overrides for local development and testing
 */
(function (global) {
    const getEnv = (overrides = {}) => {
        if (overrides.environment) {
            return overrides.environment;
        }
        if (global.APP_CONFIG && typeof global.APP_CONFIG.environment === 'string') {
            return global.APP_CONFIG.environment;
        }
        if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV) {
            return process.env.NODE_ENV;
        }
        return undefined;
    };

    /**
     * Determines whether anonymous authentication is allowed.
     * Default: disabled for production, enabled for non-production.
     * @param {Object} overrides
     * @param {boolean} overrides.allowAnonymous Explicit override flag
     * @param {string} overrides.environment Environment name
     * @returns {boolean}
     */
    const allowAnonymousAuth = (overrides = {}) => {
        const explicit = typeof overrides.allowAnonymous === 'boolean'
            ? overrides.allowAnonymous
            : typeof global.FIREBASE_ALLOW_ANONYMOUS === 'boolean'
                ? global.FIREBASE_ALLOW_ANONYMOUS
                : undefined;

        if (typeof explicit === 'boolean') {
            return explicit;
        }

        const env = getEnv(overrides);
        if (!env) {
            // Default to secure posture when environment is unknown
            return false;
        }

        return env !== 'production';
    };

    /**
     * Returns a runtime-provided Firebase configuration when available.
     * Prefers window.__ENV.firebaseConfig, then FIREBASE_RUNTIME_CONFIG/FIREBASE_CONFIG.
     * @param {Object} overrides
     * @param {Object} overrides.config Explicit configuration to return
     * @returns {Object|null}
     */
    const getRuntimeFirebaseConfig = (overrides = {}) => {
        if (overrides.config) {
            return overrides.config;
        }
        if (global.__ENV && global.__ENV.firebaseConfig) {
            return global.__ENV.firebaseConfig;
        }
        if (global.FIREBASE_RUNTIME_CONFIG) {
            return global.FIREBASE_RUNTIME_CONFIG;
        }
        if (global.FIREBASE_CONFIG) {
            return global.FIREBASE_CONFIG;
        }
        return null;
    };

    const FirebasePolicy = { allowAnonymousAuth, getRuntimeFirebaseConfig };

    // Expose for browser
    global.FirebasePolicy = FirebasePolicy;
    // Expose for CommonJS/testing
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = FirebasePolicy;
    }
})(typeof window !== 'undefined' ? window : globalThis);
