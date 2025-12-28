/**
 * Firebase Initialization Module
 * Centralizes Firebase app initialization and authentication
 * Prevents multiple initialization and ensures authentication before database access
 */

const FirebaseInit = {
    app: null,
    database: null,
    auth: null,
    isInitialized: false,
    isAuthenticated: false,
    authPromise: null,

    /**
     * Firebase configuration from environment or hardcoded values
     * In production, use environment variables
     */
    getConfig() {
        return {
            apiKey: typeof FIREBASE_API_KEY !== 'undefined' ? FIREBASE_API_KEY : 'AIzaSyD0Z56ZTk2cBg8xWI12j8s67de9oIMJ2Y0',
            authDomain: typeof FIREBASE_AUTH_DOMAIN !== 'undefined' ? FIREBASE_AUTH_DOMAIN : 'solicitacoes-de-pecas.firebaseapp.com',
            databaseURL: typeof FIREBASE_DATABASE_URL !== 'undefined' ? FIREBASE_DATABASE_URL : 'https://solicitacoes-de-pecas-default-rtdb.firebaseio.com',
            projectId: typeof FIREBASE_PROJECT_ID !== 'undefined' ? FIREBASE_PROJECT_ID : 'solicitacoes-de-pecas',
            storageBucket: typeof FIREBASE_STORAGE_BUCKET !== 'undefined' ? FIREBASE_STORAGE_BUCKET : 'solicitacoes-de-pecas.firebasestorage.app',
            messagingSenderId: typeof FIREBASE_MESSAGING_SENDER_ID !== 'undefined' ? FIREBASE_MESSAGING_SENDER_ID : '782693023312',
            appId: typeof FIREBASE_APP_ID !== 'undefined' ? FIREBASE_APP_ID : '1:782693023312:web:f22340c11c8c96cd4e9b55'
        };
    },

    /**
     * Initialize Firebase app
     * @returns {Promise<boolean>} Success status
     */
    async init() {
        if (this.isInitialized) {
            return true;
        }

        try {
            // Check if Firebase modules are available
            if (typeof window.firebaseModules === 'undefined') {
                console.warn('Firebase modules not loaded');
                return false;
            }

            const { initializeApp, getDatabase, getAuth } = window.firebaseModules;

            // Initialize Firebase app
            const config = this.getConfig();
            this.app = initializeApp(config);
            this.database = getDatabase(this.app);
            this.auth = getAuth(this.app);

            this.isInitialized = true;
            console.log('Firebase initialized successfully');

            // Authenticate immediately
            await this.authenticate();

            return true;
        } catch (error) {
            console.error('Failed to initialize Firebase:', error);
            this.isInitialized = false;
            return false;
        }
    },

    /**
     * Authenticate with Firebase using Anonymous Auth
     * This is required because RTDB rules require auth != null
     * @returns {Promise<boolean>} Success status
     */
    async authenticate() {
        if (this.isAuthenticated) {
            return true;
        }

        // Return existing promise if authentication is in progress
        if (this.authPromise) {
            return this.authPromise;
        }

        this.authPromise = (async () => {
            try {
                if (!this.auth) {
                    console.warn('Firebase Auth not initialized');
                    return false;
                }

                const { signInAnonymously, onAuthStateChanged } = window.firebaseModules;

                // Set up auth state listener
                return new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => {
                        reject(new Error('Authentication timeout'));
                    }, 10000);

                    onAuthStateChanged(this.auth, (user) => {
                        clearTimeout(timeout);
                        if (user) {
                            this.isAuthenticated = true;
                            console.log('Firebase authenticated successfully (anonymous)');
                            resolve(true);
                        }
                    }, (error) => {
                        clearTimeout(timeout);
                        console.error('Auth state change error:', error);
                        reject(error);
                    });

                    // Trigger anonymous sign in
                    signInAnonymously(this.auth).catch((error) => {
                        clearTimeout(timeout);
                        console.error('Anonymous sign in failed:', error);
                        reject(error);
                    });
                });
            } catch (error) {
                console.error('Failed to authenticate with Firebase:', error);
                this.isAuthenticated = false;
                this.authPromise = null;
                return false;
            }
        })();

        return this.authPromise;
    },

    /**
     * Get database reference
     * @param {string} path - Database path
     * @returns {Object|null} Database reference or null if not initialized
     */
    getRef(path) {
        if (!this.database) {
            return null;
        }

        const { ref } = window.firebaseModules;
        return ref(this.database, path);
    },

    /**
     * Check if Firebase is ready for database operations
     * @returns {boolean}
     */
    isReady() {
        return this.isInitialized && this.isAuthenticated;
    },

    /**
     * Wait for Firebase to be ready
     * @param {number} timeoutMs - Timeout in milliseconds
     * @returns {Promise<boolean>}
     */
    async waitForReady(timeoutMs = 10000) {
        const startTime = Date.now();
        
        while (!this.isReady()) {
            if (Date.now() - startTime > timeoutMs) {
                console.warn('Firebase ready timeout');
                return false;
            }
            
            if (!this.isInitialized) {
                await this.init();
            }
            
            if (this.isInitialized && !this.isAuthenticated) {
                await this.authenticate();
            }
            
            // Small delay to prevent tight loop
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        return true;
    }
};

// Export for use in other modules
window.FirebaseInit = FirebaseInit;
