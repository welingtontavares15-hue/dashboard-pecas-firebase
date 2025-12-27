/**
 * Application Configuration
 * Environment-specific settings for the Dashboard de Peças application.
 * 
 * Build-time configuration:
 * - Development: Credentials panel visible on login screen
 * - Staging: Credentials panel visible (for testing)
 * - Production: Credentials panel BLOCKED
 * 
 * IMPORTANT: APP_CONFIG.environment defaults to 'production'. 
 * Set explicitly per deployment (dev/staging/prod) to control security features.
 * 
 * Deployment script should:
 * 1. Set environment to target stage (production must stay 'production')
 * 2. Update version
 * 3. Update buildTime
 */

const APP_CONFIG = {
    /**
     * Current environment: 'development' | 'staging' | 'production'
     * 
     * ⚠️ PRODUCTION REQUIREMENT:
     * Set this to 'production' before deploying to production.
     * When set to 'production', the credentials panel on the login screen
     * will be completely blocked, regardless of feature flags.
     */
    environment: 'production',
    
    /**
     * Application version (should match service-worker.js CACHE_VERSION)
     */
    version: 'v5',
    
    /**
     * Build timestamp (set during build/deploy)
     */
    buildTime: new Date().toISOString(),
    
    /**
     * Feature flags for controlled rollout
     */
    features: {
        /**
         * Show credentials panel on login screen (dev/staging only)
         * This is automatically disabled in production.
         */
        showLoginCredentials: false,
        
        /**
         * Enable export metadata tracking (cloud-first exports)
         * When enabled, all exports log metadata to the system.
         */
        exportMetadataTracking: true,
        
        /**
         * Enable export cloud storage (save exports to cloud)
         */
        exportCloudStorage: true,
        
        /**
         * Enable batch approval feature
         */
        batchApproval: true,
        
        /**
         * Enable offline draft creation - DISABLED in online-only mode
         * System requires internet connection for all operations.
         */
        offlineDrafts: false,
        
        /**
         * Online-only mode - System requires internet connection
         * No business data is saved locally (localStorage/IndexedDB prohibited)
         */
        onlineOnly: true
    },
    
    /**
     * Check if running in production environment
     * @returns {boolean}
     */
    isProduction() {
        return this.environment === 'production';
    },
    
    /**
     * Check if running in development environment
     * @returns {boolean}
     */
    isDevelopment() {
        return this.environment === 'development';
    },
    
    /**
     * Check if credentials panel should be shown on login
     * BLOCKED in production regardless of feature flag
     * @returns {boolean}
     */
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
    
    /**
     * Get environment label for display
     * @returns {string}
     */
    getEnvironmentLabel() {
        const labels = {
            'development': 'Desenvolvimento',
            'staging': 'Homologação',
            'production': 'Produção'
        };
        return labels[this.environment] || this.environment;
    }
};

// Freeze configuration to prevent accidental modification
Object.freeze(APP_CONFIG.features);
Object.freeze(APP_CONFIG);
