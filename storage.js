/**
 * Cloud Storage Module
 * Handles data synchronization across devices using Firebase Realtime Database
 * Falls back to localStorage when Firebase is unavailable
 */

const CloudStorage = {
    // Firebase configuration for "Solicitações de Peças" project
    // This enables cross-device data synchronization
    firebaseConfig: {
        apiKey: "AIzaSyD0Z56ZTk2cBg8xWI12j8s67de9oIMJ2Y0",
        authDomain: "solicitacoes-de-pecas.firebaseapp.com",
        databaseURL: "https://solicitacoes-de-pecas-default-rtdb.firebaseio.com",
        projectId: "solicitacoes-de-pecas",
        storageBucket: "solicitacoes-de-pecas.firebasestorage.app",
        messagingSenderId: "782693023312",
        appId: "1:782693023312:web:f22340c11c8c96cd4e9b55"
    },

    // Connection state
    isConnected: false,
    isInitialized: false,
    database: null,

    // Cache for offline support
    localCache: {},

    // Listeners for real-time updates
    listeners: {},

    // Retry configuration
    maxRetries: 3,
    retryDelay: 1000,

    /**
     * Initialize Firebase and cloud storage
     */
    async init() {
        try {
            // Check if Firebase SDK is available
            if (typeof firebase === 'undefined') {
                console.warn('Firebase SDK not loaded, using localStorage only');
                this.isInitialized = false;
                return false;
            }

            // Check if firebase.database is available
            if (!firebase.database) {
                console.warn('Firebase Database SDK not loaded, using localStorage only');
                this.isInitialized = false;
                return false;
            }

            // Initialize Firebase if not already initialized
            if (!firebase.apps.length) {
                try {
                    firebase.initializeApp(this.firebaseConfig);
                } catch (initError) {
                    console.warn('Firebase initialization failed:', initError.message);
                    this.isInitialized = false;
                    return false;
                }
            }
            
            this.database = firebase.database();
            
            // Test connection with timeout
            try {
                const connectedRef = this.database.ref('.info/connected');
                
                // Set up connection listener
                connectedRef.on('value', (snapshot) => {
                    const wasConnected = this.isConnected;
                    this.isConnected = snapshot.val() === true;
                    
                    console.log('Firebase connection status:', this.isConnected ? 'Connected' : 'Disconnected');
                    
                    // If we just connected, sync from cloud
                    if (this.isConnected && !wasConnected) {
                        this.syncFromCloud();
                    }
                });

                // Wait for initial connection check with timeout
                const connectionPromise = new Promise((resolve) => {
                    const timeout = setTimeout(() => {
                        console.warn('Firebase connection timeout');
                        resolve(false);
                    }, 5000);

                    connectedRef.once('value', (snapshot) => {
                        clearTimeout(timeout);
                        resolve(snapshot.val() === true);
                    });
                });

                this.isConnected = await connectionPromise;
                this.isInitialized = true;
                
                console.log('CloudStorage initialized with Firebase');
                
                // Initial sync from cloud if connected
                if (this.isConnected) {
                    await this.syncFromCloud();
                }
                
                return true;
            } catch (connError) {
                console.warn('Firebase connection test failed:', connError.message);
                this.isInitialized = false;
                return false;
            }
        } catch (error) {
            console.error('Error initializing CloudStorage:', error);
            this.isInitialized = false;
            return false;
        }
    },

    /**
     * Save data to cloud storage
     * @param {string} key - Storage key
     * @param {any} data - Data to save
     * @returns {Promise<boolean>} - Success status
     */
    async saveData(key, data) {
        // Always save to localStorage first (for offline support)
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (e) {
            console.error('Error saving to localStorage:', e);
        }

        // Save to cloud if connected
        if (this.isInitialized && this.database) {
            try {
                const sanitizedKey = this.sanitizeKey(key);
                await this.database.ref(`data/${sanitizedKey}`).set({
                    data: data,
                    updatedAt: Date.now(),
                    updatedBy: this.getDeviceId()
                });
                console.log(`Data saved to cloud: ${key}`);
                return true;
            } catch (error) {
                console.error('Error saving to cloud:', error);
                // Data is still saved locally
                return true;
            }
        }
        
        return true;
    },

    /**
     * Load data from cloud storage
     * @param {string} key - Storage key
     * @returns {Promise<any>} - Retrieved data
     */
    async loadData(key) {
        // If cloud is available, try to load from cloud first
        if (this.isInitialized && this.database && this.isConnected) {
            try {
                const sanitizedKey = this.sanitizeKey(key);
                const snapshot = await this.database.ref(`data/${sanitizedKey}`).once('value');
                const cloudData = snapshot.val();
                
                if (cloudData && cloudData.data !== undefined) {
                    // Update local cache
                    localStorage.setItem(key, JSON.stringify(cloudData.data));
                    return cloudData.data;
                }
            } catch (error) {
                console.error('Error loading from cloud:', error);
            }
        }

        // Fallback to localStorage
        try {
            const localData = localStorage.getItem(key);
            return localData ? JSON.parse(localData) : null;
        } catch (e) {
            console.error('Error loading from localStorage:', e);
            return null;
        }
    },

    /**
     * Synchronize data from cloud to local storage
     */
    async syncFromCloud() {
        if (!this.isInitialized || !this.database) return;

        try {
            const snapshot = await this.database.ref('data').once('value');
            const cloudData = snapshot.val();
            
            if (cloudData) {
                Object.keys(cloudData).forEach(sanitizedKey => {
                    const originalKey = this.unsanitizeKey(sanitizedKey);
                    const entry = cloudData[sanitizedKey];
                    
                    if (entry && entry.data !== undefined) {
                        // Check if cloud data is newer than local
                        const localUpdatedAt = this.getLocalUpdatedAt(originalKey);
                        
                        if (!localUpdatedAt || entry.updatedAt > localUpdatedAt) {
                            localStorage.setItem(originalKey, JSON.stringify(entry.data));
                            this.setLocalUpdatedAt(originalKey, entry.updatedAt);
                            console.log(`Synced from cloud: ${originalKey}`);
                        }
                    }
                });
            }
            
            console.log('Cloud sync completed');
        } catch (error) {
            console.error('Error syncing from cloud:', error);
        }
    },

    /**
     * Sync local data to cloud (push local changes)
     */
    async syncToCloud() {
        if (!this.isInitialized || !this.database) return;

        // Get keys from DataManager if available, otherwise use fallback list
        const keys = (typeof DataManager !== 'undefined' && DataManager.KEYS) 
            ? Object.values(DataManager.KEYS)
            : [
                'diversey_users',
                'diversey_tecnicos',
                'diversey_fornecedores',
                'diversey_pecas',
                'diversey_solicitacoes',
                'diversey_settings',
                'diversey_recent_parts'
            ];

        for (const key of keys) {
            try {
                const localData = localStorage.getItem(key);
                if (localData) {
                    const sanitizedKey = this.sanitizeKey(key);
                    await this.database.ref(`data/${sanitizedKey}`).set({
                        data: JSON.parse(localData),
                        updatedAt: Date.now(),
                        updatedBy: this.getDeviceId()
                    });
                }
            } catch (error) {
                console.error(`Error syncing ${key} to cloud:`, error);
            }
        }
        
        console.log('Local data synced to cloud');
    },

    /**
     * Subscribe to real-time updates for a key
     * @param {string} key - Storage key
     * @param {function} callback - Callback function when data changes
     */
    subscribe(key, callback) {
        if (!this.isInitialized || !this.database) return;

        const sanitizedKey = this.sanitizeKey(key);
        const ref = this.database.ref(`data/${sanitizedKey}`);
        
        // Remove existing listener
        if (this.listeners[key]) {
            ref.off('value', this.listeners[key]);
        }

        // Add new listener
        this.listeners[key] = ref.on('value', (snapshot) => {
            const cloudData = snapshot.val();
            if (cloudData && cloudData.data !== undefined) {
                // Check if update came from different device
                if (cloudData.updatedBy !== this.getDeviceId()) {
                    localStorage.setItem(key, JSON.stringify(cloudData.data));
                    callback(cloudData.data);
                }
            }
        });
    },

    /**
     * Unsubscribe from real-time updates
     * @param {string} key - Storage key
     */
    unsubscribe(key) {
        if (!this.isInitialized || !this.database) return;

        const sanitizedKey = this.sanitizeKey(key);
        const ref = this.database.ref(`data/${sanitizedKey}`);
        
        if (this.listeners[key]) {
            ref.off('value', this.listeners[key]);
            delete this.listeners[key];
        }
    },

    /**
     * Get unique device identifier
     * Uses crypto.randomUUID() if available, falls back to timestamp + random
     */
    getDeviceId() {
        let deviceId = localStorage.getItem('diversey_device_id');
        if (!deviceId) {
            // Use crypto.randomUUID() if available (more secure)
            if (typeof crypto !== 'undefined' && crypto.randomUUID) {
                deviceId = 'device_' + crypto.randomUUID();
            } else {
                // Fallback for older browsers
                deviceId = 'device_' + Date.now().toString(36) + '_' + 
                    Math.random().toString(36).substring(2) + 
                    Math.random().toString(36).substring(2);
            }
            localStorage.setItem('diversey_device_id', deviceId);
        }
        return deviceId;
    },

    /**
     * Sanitize key for Firebase path (Firebase doesn't allow . # $ [ ] characters)
     * Note: Our application keys use underscores (e.g., diversey_users) which are valid in Firebase,
     * so no transformation is typically needed. This function is here for safety if new keys are added.
     */
    sanitizeKey(key) {
        // Our keys (diversey_users, diversey_tecnicos, etc.) don't contain forbidden characters
        // Just return the key as-is since underscores are allowed in Firebase paths
        return key;
    },

    /**
     * Unsanitize key from Firebase path
     * Since we don't transform keys (see sanitizeKey), this is an identity function
     */
    unsanitizeKey(sanitizedKey) {
        // No transformation needed - keys are preserved as-is
        return sanitizedKey;
    },

    /**
     * Get local updated timestamp
     */
    getLocalUpdatedAt(key) {
        try {
            const timestamps = JSON.parse(localStorage.getItem('diversey_timestamps') || '{}');
            return timestamps[key] || 0;
        } catch (e) {
            return 0;
        }
    },

    /**
     * Set local updated timestamp
     */
    setLocalUpdatedAt(key, timestamp) {
        try {
            const timestamps = JSON.parse(localStorage.getItem('diversey_timestamps') || '{}');
            timestamps[key] = timestamp;
            localStorage.setItem('diversey_timestamps', JSON.stringify(timestamps));
        } catch (e) {
            console.error('Error saving timestamp:', e);
        }
    },

    /**
     * Check if cloud storage is available
     */
    isCloudAvailable() {
        return this.isInitialized && this.isConnected;
    },

    /**
     * Force refresh from cloud
     */
    async forceRefresh() {
        await this.syncFromCloud();
        // Trigger page refresh to show updated data
        if (typeof App !== 'undefined' && App.currentPage) {
            App.navigate(App.currentPage);
        }
    }
};

// Export for use in other modules
window.CloudStorage = CloudStorage;
