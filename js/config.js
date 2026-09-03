/**
 * Application Configuration
 * Environment-specific settings for the Diversey parts portal.
 *
 * Production is online-first for business operations. The service worker may
 * cache the application shell, but business writes require cloud availability.
 */

const APP_CONFIG = {
    /**
     * Current environment: 'development' | 'staging' | 'production'
     * Production keeps the credentials panel blocked and bootstrap users
     * disabled unless explicitly enabled in a controlled non-production run.
     */
    environment: 'production',

    /**
     * Application version aligned with service-worker.js CACHE_VERSION.
     */
    version: 'v76-divisao-historicos',

    /**
     * Runtime timestamp. A future build pipeline may replace this with a fixed
     * artifact timestamp without changing application behavior.
     */
    buildTime: new Date().toISOString(),

    features: {
        showLoginCredentials: false,
        exportMetadataTracking: true,
        exportCloudStorage: true,
        batchApproval: true,
        offlineDrafts: false,
        onlineOnly: true
    },

    isProduction() {
        return this.environment === 'production';
    },

    isDevelopment() {
        return this.environment === 'development';
    },

    shouldShowLoginCredentials(overrides = {}) {
        const effectiveEnv = overrides.environment || this.environment;
        const showFlag = typeof overrides.showLoginCredentials === 'boolean'
            ? overrides.showLoginCredentials
            : this.features.showLoginCredentials;

        if (effectiveEnv === 'production') {
            return false; // Always blocked in production
        }
        return !!showFlag;
    },

    getEnvironmentLabel() {
        const labels = {
            development: 'Desenvolvimento',
            staging: 'Homologação',
            production: 'Produção'
        };
        return labels[this.environment] || this.environment;
    }
};

Object.freeze(APP_CONFIG.features);
Object.freeze(APP_CONFIG);
