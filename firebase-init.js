/**
 * Firebase Initialization Module (Firestore)
 * Centralizes Firebase app initialization and anonymous authentication.
 *
 * IMPORTANT: This project uses Firebase Auth (anonymous) only to satisfy Firestore rules
 * and enable cross-device sync. Application roles (ADM/GESTOR/TECNICO) remain managed by
 * the app's own Auth module and stored in cloud data.
 */

const FirebaseInit = {
    app: null,
    firestore: null,
    auth: null,

    isInitialized: false,
    isAuthenticated: false,
    isConnected: false,

    authPromise: null,
    connectionCallbacks: [],

    getConfig() {
        // Keep env override pattern
        return {
            apiKey: typeof FIREBASE_API_KEY !== 'undefined' ? FIREBASE_API_KEY : 'AIzaSyD0Z56ZTk2cBg8xWI12j8s67de9oIMJ2Y0',
            authDomain: typeof FIREBASE_AUTH_DOMAIN !== 'undefined' ? FIREBASE_AUTH_DOMAIN : 'solicitacoes-de-pecas.firebaseapp.com',
            projectId: typeof FIREBASE_PROJECT_ID !== 'undefined' ? FIREBASE_PROJECT_ID : 'solicitacoes-de-pecas'
        };
    },

    async init() {
        if (this.isInitialized) return true;

        if (typeof window.firebaseModules === 'undefined') {
            console.warn('Firebase modules not loaded (window.firebaseModules missing)');
            return false;
        }

        const {
            initializeApp,
            getFirestore,
            getAuth,
            signInAnonymously,
            onAuthStateChanged
        } = window.firebaseModules;

        if (!initializeApp || !getFirestore || !getAuth || !signInAnonymously || !onAuthStateChanged) {
            console.warn('Missing Firebase Firestore/Auth modules');
            return false;
        }

        try {
            const config = this.getConfig();
            this.app = initializeApp(config);
            this.firestore = getFirestore(this.app);
            this.auth = getAuth(this.app);
            this.isInitialized = true;

            // Basic connectivity signal
            this.isConnected = (typeof navigator !== 'undefined') ? navigator.onLine : true;
            if (typeof window !== 'undefined') {
                window.addEventListener('online', () => this._notifyConnectionChange(true));
                window.addEventListener('offline', () => this._notifyConnectionChange(false));
            }

            // Ensure anonymous auth
            this.authPromise = new Promise((resolve) => {
                let resolved = false;

                const finalize = (ok) => {
                    if (resolved) return;
                    resolved = true;
                    resolve(ok);
                };

                onAuthStateChanged(this.auth, (user) => {
                    this.isAuthenticated = !!user;
                    this._notifyConnectionChange(this.isConnected);
                    if (user) finalize(true);
                });

                // Trigger sign-in if needed
                signInAnonymously(this.auth)
                    .then(() => {
                        // onAuthStateChanged will resolve
                    })
                    .catch((err) => {
                        console.warn('Anonymous auth failed:', err?.message || err);
                        this.isAuthenticated = false;
                        this._notifyConnectionChange(this.isConnected);
                        finalize(false);
                    });
            });

            return await this.authPromise;
        } catch (err) {
            console.error('FirebaseInit.init failed:', err);
            this.isInitialized = false;
            this.isAuthenticated = false;
            return false;
        }
    },

    _notifyConnectionChange(online) {
        this.isConnected = !!online;
        const payload = {
            online: this.isConnected,
            authenticated: this.isAuthenticated,
            ready: this.isReady()
        };
        this.connectionCallbacks.forEach(cb => {
            try { cb(payload); } catch (_) {}
        });
    },

    onConnectionChange(callback) {
        if (typeof callback !== 'function') return;
        this.connectionCallbacks.push(callback);
        // Call immediately with current state
        callback({
            online: this.isConnected,
            authenticated: this.isAuthenticated,
            ready: this.isReady()
        });
    },

    isReady() {
        return !!(this.isInitialized && this.isAuthenticated && this.firestore);
    },

    // Backward-compatible name used by older modules
    isRTDBConnected() {
        return this.isConnected;
    },

    // Preferred name
    isFirestoreConnected() {
        return this.isConnected;
    },

    async waitForReady(timeoutMs = 8000) {
        const start = Date.now();
        if (!this.isInitialized) await this.init();

        while (!this.isReady() || !this.isConnected) {
            if (Date.now() - start > timeoutMs) return false;
            await new Promise(r => setTimeout(r, 100));
        }
        return true;
    }
};

window.FirebaseInit = FirebaseInit;
