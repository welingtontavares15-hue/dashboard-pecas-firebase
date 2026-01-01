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
     * Security configuration for bootstrap and recovery
     */
    security: {
        /**
         * Bootstrap configuration for initial system setup
         */
        bootstrap: {
            /**
             * Gestor recovery password
             * This password is used for the 'gestor' account which is the system recovery account.
             * 
             * Set this during deployment via:
             * - window.DIVERSEY_BOOTSTRAP_GESTOR_PASSWORD (highest priority - set in index.html)
             * - Or this config property
             * 
             * If not set, a default fallback password is used (NOT RECOMMENDED for production).
             * 
             * Security note: This password should be:
             * - Strong and unique
             * - Rotated regularly (update and re-deploy)
             * - Not shared in public repositories
             * - Documented in secure credential management system
             */
            gestorPassword: undefined, // Set during deployment; fallback exists but not recommended

            /**
             * Admin recovery password
             * Ensures the 'admin' account remains accessible for access management.
             * Defaults to admin123 when not set; override in production deployments.
             */
            adminPassword: undefined // Set during deployment; fallback exists but not recommended
        },
        
        /**
         * Enable recovery features on login screen
         * When true, shows "Recuperar acesso do Gestor" link and recovery button
         * Should only be enabled in staging/dev or when explicitly needed
         */
        enableRecovery: false
    },
    
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
