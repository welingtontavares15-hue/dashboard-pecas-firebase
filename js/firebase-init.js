import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import { getAuth, onAuthStateChanged, signInAnonymously } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js';
import { getDatabase, ref, set, get, onValue, off } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js';
import './firebase-policy.js';

/**
 * Firebase Initialization Module
 * Centralizes Firebase app initialization and authentication
 * Prevents multiple initialization and ensures authentication before database access
 */

// Default Firebase configuration for this PWA.
// NOTE: These values act as a fallback; when available, the configuration
// is pulled from window.FIREBASE_CONFIG which is populated by js/firebase-config.js
// and should reflect your actual Firebase project settings.
const firebaseConfig = {
    apiKey: 'AIzaSyDQZ56ZTk2cBg8xWI2j8s67de9oIMJ2Y0',
    authDomain: 'solicitacoes-de-pecas.firebaseapp.com',
    databaseURL: 'https://solicitacoes-de-pecas-default-rtdb.firebaseio.com',
    projectId: 'solicitacoes-de-pecas',
    // Storage bucket configured in Firebase console.
    storageBucket: 'solicitacoes-de-pecas.firebasestorage.app',
    messagingSenderId: '782693023312',
    appId: '1:782693023312:web:f22340c11c8c96cd4e9b55',
    measurementId: 'G-QVTQ20HN39'
};

const firebasePolicy = (typeof window !== 'undefined' && window.FirebasePolicy) || {
    allowAnonymousAuth: () => false,
    getRuntimeFirebaseConfig: () => null
};

// Expose firebase modules globally to preserve backward compatibility
if (typeof window !== 'undefined') {
    // Expose only the Firebase modules that are safe to use.  Anonymous
    // authentication has been removed to comply with tightened security
    // policies; callers must handle their own authentication (e.g. via
    // signInWithEmailAndPassword) before using the Realtime Database.
    window.firebaseModules = {
        initializeApp,
        getDatabase,
        getAuth,
        onAuthStateChanged,
        ref,
        set,
        get,
        onValue,
        off
    };
    // Store the fallback configuration on the global object.  When js/firebase-config.js
    // is loaded, it will override this with the environment-specific config.
    window.FIREBASE_CONFIG = firebaseConfig;
    window.firebaseApp = null;
    window.firebaseAuth = null;
    window.firebaseDB = null;
    window.firebaseUser = null;
}

const FirebaseInit = {
    app: null,
    database: null,
    auth: null,
    isInitialized: false,
    isAuthenticated: false,
    isConnected: false,
    authPromise: null,
    connectionListener: null,
    connectionCallbacks: [],
    cloudReadyCallbacks: [],

    /**
     * Firebase configuration from environment or hardcoded values
     * In production, use environment variables
     */
    getConfig() {
        const runtimeConfig = firebasePolicy.getRuntimeFirebaseConfig();
        if (runtimeConfig) {
            return runtimeConfig;
        }

        // Prefer config fornecida em js/firebase-config.js
        if (typeof window !== 'undefined' && window.FIREBASE_CONFIG) {
            return window.FIREBASE_CONFIG;
        }

        // Fallback para configuração padrão usada no PWA
        return firebaseConfig;
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

            // Initialize Firebase app
            const config = this.getConfig();
            this.app = initializeApp(config);
            this.database = getDatabase(this.app, config.databaseURL);
            this.auth = getAuth(this.app);

            if (typeof window !== 'undefined') {
                window.firebaseApp = this.app;
                window.firebaseDB = this.database;
                window.firebaseAuth = this.auth;
            }

            this.isInitialized = true;
            console.log('Firebase initialized successfully');

            // Authenticate immediately
            await this.authenticate();

            // Initialize RTDB connection monitoring
            this.initConnectionMonitoring();

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
        const anonymousAllowed = firebasePolicy.allowAnonymousAuth();
        this.anonymousAllowed = anonymousAllowed;

        // If already authenticated, no further action needed
        if (this.isAuthenticated) {
            return true;
        }

        // If an authentication attempt is already in progress, return that promise
        if (this.authPromise) {
            return this.authPromise;
        }

        // Create a promise that resolves when a user is detected or rejects on timeout
        this.authPromise = (async () => {
            try {
                if (!this.auth) {
                    console.warn('Firebase Auth not initialized');
                    return false;
                }

                return new Promise((resolve, reject) => {
                    let settled = false;
                    let timeout = null;
                    const settle = (cb) => {
                        if (settled) {
                            return;
                        }
                        settled = true;
                        if (timeout) {
                            clearTimeout(timeout);
                        }
                        cb();
                    };

                    // Timeout to avoid waiting indefinitely when no user ever signs in
                    timeout = setTimeout(() => {
                        console.warn('No authenticated user detected within timeout');
                        settle(() => resolve(false));
                    }, 10000);

                    onAuthStateChanged(this.auth, (user) => {
                        if (!user) {
                            if (!anonymousAllowed) {
                                console.warn('Firebase Auth: anonymous login blocked by policy; awaiting interactive auth.');
                                settle(() => resolve(false));
                                return;
                            }
                            // When no user is logged in automatically sign in anonymously to satisfy
                            // RTDB rules that require auth != null. This call is idempotent if the user
                            // is already signed in anonymously or via another method.
                            console.warn('Firebase Auth: no user detected. Attempting anonymous sign‑in.');
                            signInAnonymously(this.auth).catch((err) => {
                                this.authPromise = null;
                                settle(() => {
                                    console.error('Failed to sign in anonymously:', err);
                                    reject(err);
                                });
                            });
                            this.isAuthenticated = false;
                            return;
                        }
                        settle(() => {
                            clearTimeout(timeout);
                            // A user is logged in (either anonymously or via email/password); mark authenticated and notify listeners
                            this.isAuthenticated = true;
                            if (typeof window !== 'undefined') {
                                window.firebaseUser = user;
                                window.dispatchEvent(new CustomEvent('firebase-ready', { detail: { uid: user.uid } }));
                            }
                            console.log('Firebase user authenticated:', user.uid);
                            this._notifyCloudReady();
                            resolve(true);
                        });
                    }, (error) => {
                        settle(() => {
                            clearTimeout(timeout);
                            console.error('Auth state change error:', error);
                            reject(error);
                        });
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
    },

    /**
     * Initialize RTDB connection monitoring
     * Sets up .info/connected listener to track real-time connection status
     */
    initConnectionMonitoring() {
        if (this.connectionListener || !this.database) {
            return;
        }

        try {
            const { onValue } = window.firebaseModules;
            const connectedRef = this.getRef('.info/connected');
            
            // Set up connection listener
            this.connectionListener = onValue(connectedRef, (snapshot) => {
                const wasConnected = this.isConnected;
                this.isConnected = snapshot.val() === true;
                
                if (this.isConnected && !wasConnected) {
                    console.log('RTDB connection established: cloudConnected = true');
                } else if (!this.isConnected && wasConnected) {
                    console.log('RTDB connection lost: cloudConnected = false');
                }

                if (this.isReady() && this.isRTDBConnected()) {
                    this._notifyCloudReady();
                }

                // Notify registered callbacks of connection state change
                this.connectionCallbacks.forEach(callback => {
                    try {
                        callback(this.isConnected, wasConnected);
                    } catch (error) {
                        console.warn('Connection callback error:', error);
                    }
                });
            });

            console.log('RTDB connection monitoring initialized');
        } catch (error) {
            console.warn('Failed to initialize RTDB connection monitoring:', error);
        }
    },

    /**
     * Register a callback to be notified of connection state changes
     * @param {function} callback - Callback function(isConnected, wasConnected)
     */
    onConnectionChange(callback) {
        if (typeof callback === 'function') {
            this.connectionCallbacks.push(callback);
        }
    },

    /**
     * Check if RTDB is connected
     * @returns {boolean}
     */
    isRTDBConnected() {
        return this.isConnected;
    },

    /**
     * Wait until Firebase is authenticated AND RTDB is connected.
     * Resolves true when ready, false on timeout.
     */
    async waitForCloudReady(timeoutMs = 10000) {
        // Ensure initialization has been attempted
        if (!this.isInitialized) {
            await this.init();
        }

        if (this.isReady() && this.isRTDBConnected()) {
            return true;
        }

        return new Promise((resolve) => {
            const onReady = () => {
                cleanup();
                resolve(true);
            };

            const timeout = setTimeout(() => {
                cleanup();
                resolve(false);
            }, timeoutMs);

            const cleanup = () => {
                clearTimeout(timeout);
                this.cloudReadyCallbacks = this.cloudReadyCallbacks.filter(cb => cb !== onReady);
            };

            this.cloudReadyCallbacks.push(onReady);
        });
    },

    /**
     * Resolve any pending cloud-ready waiters when both auth and RTDB are ready.
     */
    _notifyCloudReady() {
        if (!this.isReady() || !this.isRTDBConnected()) {
            return;
        }
        const callbacks = [...this.cloudReadyCallbacks];
        this.cloudReadyCallbacks = [];
        callbacks.forEach(cb => {
            try {
                cb();
            } catch (error) {
                console.warn('Cloud ready callback error:', error);
            }
        });
    }
};

// Export for use in other modules
window.FirebaseInit = FirebaseInit;
