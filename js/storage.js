/**
 * Cloud Storage Module
 * Handles data synchronization across devices using Firebase Realtime Database
 * Falls back to localStorage when Firebase is unavailable
 */

const CloudStorage = {
    // Connection state is now managed centrally by FirebaseInit
    isInitialized: false,
    database: null,

    // Listeners for real-time updates
    listeners: {},

    // Retry configuration
    maxRetries: 3,
    retryDelay: 1000,
    queueStore: 'queue',
    queueLocalKey: 'cloud_sync_queue',

    /**
     * Initialize Firebase and cloud storage
     */
    async init() {
        try {
            if (typeof IndexedDBStorage !== 'undefined') {
                const idbReady = await IndexedDBStorage.init();
                if (!idbReady) {
                    console.warn('IndexedDB initialization failed; offline cache will use localStorage only.');
                    if (typeof Utils !== 'undefined' && typeof Utils.showToast === 'function') {
                        Utils.showToast('IndexedDB indisponível; cache offline foi reduzido.', 'warning');
                    }
                }
            }

            // Check if Firebase modules are available
            if (typeof window.firebaseModules === 'undefined') {
                console.warn('Firebase SDK not loaded, using localStorage only');
                this.isInitialized = false;
                return false;
            }

            // Initialize Firebase through centralized module
            if (typeof FirebaseInit === 'undefined') {
                console.warn('FirebaseInit module not loaded');
                this.isInitialized = false;
                return false;
            }

            // Initialize Firebase and authenticate
            const firebaseReady = await FirebaseInit.init();
            if (!firebaseReady) {
                console.warn('Firebase initialization failed');
                this.isInitialized = false;
                return false;
            }

            // Wait for authentication to complete (required for RTDB rules)
            const authReady = await FirebaseInit.waitForReady(10000);
            if (!authReady) {
                console.warn('Firebase authentication failed or timed out');
                this.isInitialized = false;
                return false;
            }

            this.database = FirebaseInit.database;
            
            // Register callback for connection state changes
            FirebaseInit.onConnectionChange((isConnected, wasConnected) => {
                console.log('Firebase connection status:', isConnected ? 'Connected' : 'Disconnected');
                
                // If we just connected, sync from cloud
                if (isConnected && !wasConnected) {
                    this.syncFromCloud();
                    this.flushQueue();
                }
            });
            
            // Wait for initial connection check with timeout
            // Connection monitoring is now handled by FirebaseInit
            const { get } = window.firebaseModules;
            const connectedRef = FirebaseInit.getRef('.info/connected');
            const connectionPromise = new Promise((resolve) => {
                const timeout = setTimeout(() => {
                    console.warn('Firebase connection timeout');
                    resolve(false);
                }, 5000);

                get(connectedRef).then((snapshot) => {
                    clearTimeout(timeout);
                    resolve(snapshot.val() === true);
                }).catch(() => {
                    clearTimeout(timeout);
                    resolve(false);
                });
            });

            // Wait for initial connection (not stored, just for initial sync check)
            const initiallyConnected = await connectionPromise;
            this.isInitialized = true;
            
            console.log('CloudStorage initialized with Firebase and authenticated');
            
            // Initial sync from cloud if connected (using centralized state)
            if (initiallyConnected && FirebaseInit.isRTDBConnected()) {
                await this.syncFromCloud();
                await this.flushQueue();
            }
            
            return true;
        } catch (error) {
            console.error('Error initializing CloudStorage:', error);
            this.isInitialized = false;
            return false;
        }
    },

    /**
     * Save data to cloud storage - Online-only mode
     * Requires cloud connection; does NOT fallback to local storage.
     * @param {string} key - Storage key
     * @param {any} data - Data to save
     * @returns {Promise<boolean>} - Success status
     */
    async saveData(key, data) {
        const opId = (data && data.opId) || this.generateOpId(key);
        
        // Ensure Firebase is authenticated and initialized
        if (!FirebaseInit.isReady()) {
            console.warn('[ONLINE-ONLY] Cannot save - Firebase not authenticated');
            return false;
        }

        // Online-only mode: Require cloud connection (optimized check order)
        if (!this.isInitialized || !this.database || !FirebaseInit.isRTDBConnected()) {
            console.warn('[ONLINE-ONLY] Cannot save - cloud not connected');
            return false;
        }

        // Save to cloud
        try {
            const { set } = window.firebaseModules;
            const sanitizedKey = this.sanitizeKey(key);
            const dataRef = FirebaseInit.getRef(`data/${sanitizedKey}`);
            
            await set(dataRef, {
                data: data,
                updatedAt: Date.now(),
                updatedBy: this.getDeviceId(),
                opId
            });
            console.log(`Data saved to cloud: ${key}`);
            return true;
        } catch (error) {
            console.error('Error saving to cloud:', error);
            return false;
        }
    },

    /**
     * Load data from cloud storage - Online-only mode
     * Loads directly from cloud; no local fallback.
     * @param {string} key - Storage key
     * @returns {Promise<any>} - Retrieved data
     */
    async loadData(key) {
        // Online-only mode: Load from cloud only
        if (this.isInitialized && this.database && FirebaseInit.isReady() && FirebaseInit.isRTDBConnected()) {
            try {
                const { get } = window.firebaseModules;
                const sanitizedKey = this.sanitizeKey(key);
                const dataRef = FirebaseInit.getRef(`data/${sanitizedKey}`);
                
                const snapshot = await get(dataRef);
                const cloudData = snapshot.val();
                
                if (cloudData && cloudData.data !== undefined) {
                    return cloudData.data;
                }
            } catch (error) {
                console.error('Error loading from cloud:', error);
            }
        }

        // Online-only mode: Return null if cloud not available (no local fallback)
        console.warn('[ONLINE-ONLY] Cloud not available for load operation');
        return null;
    },

    /**
     * Synchronize data from cloud - Online-only mode
     * Does not persist locally; data is loaded into DataManager session cache.
     * For users (gestores), implements merge logic to prevent data loss.
     */
    async syncFromCloud() {
        // Early return if cloud is not initialized - this is not an error, just not ready yet
        if (!this.isInitialized || !this.database) {
            console.debug('CloudStorage not initialized, skipping sync');
            return;
        }

        // Ensure Firebase is authenticated
        if (!FirebaseInit.isReady()) {
            console.debug('Firebase not authenticated, skipping sync');
            return;
        }

        // Validate DataManager is available and has session cache
        if (typeof DataManager === 'undefined' || !DataManager._sessionCache) {
            console.warn('DataManager not initialized, skipping sync');
            return;
        }

        // Log sync start
        if (typeof Logger !== 'undefined') {
            Logger.logSync('sync_start', { direction: 'cloud_to_session' });
        }

        try {
            const { get } = window.firebaseModules;
            const dataRef = FirebaseInit.getRef('data');
            
            const snapshot = await get(dataRef);
            const cloudData = snapshot.val();
            
            if (cloudData) {
                let keysUpdated = 0;
                for (const sanitizedKey in cloudData) {
                    if (!Object.prototype.hasOwnProperty.call(cloudData, sanitizedKey)) {
                        continue;
                    }
                    const originalKey = this.unsanitizeKey(sanitizedKey);
                    const entry = cloudData[sanitizedKey];
                    
                    if (entry && entry.data !== undefined) {
                        // Special merge logic for users to prevent data loss
                        if (originalKey === 'diversey_users' && Array.isArray(entry.data)) {
                            const localUsers = DataManager._sessionCache[originalKey] || [];
                            const cloudUsers = entry.data;
                            const mergedUsers = this.mergeUsers(localUsers, cloudUsers);
                            DataManager._sessionCache[originalKey] = mergedUsers;
                            keysUpdated++;
                            console.log(`Merged users from cloud to session: ${mergedUsers.length} total users`);
                        } else {
                            // For other data types, use direct replacement
                            DataManager._sessionCache[originalKey] = entry.data;
                            keysUpdated++;
                            console.log(`Synced from cloud to session: ${originalKey}`);
                        }
                    }
                }
                
                // Log sync complete
                if (typeof Logger !== 'undefined') {
                    Logger.logSync('sync_complete', { 
                        direction: 'cloud_to_session',
                        keysUpdated
                    });
                }
            } else {
                // No cloud data is not an error - could be first-time sync or empty Firebase collection
                console.debug('Cloud sync completed: no data in cloud (first-time sync or empty collection)');
                if (typeof Logger !== 'undefined') {
                    Logger.logSync('sync_complete', { 
                        direction: 'cloud_to_session',
                        keysUpdated: 0
                    });
                }
            }
        } catch (error) {
            // Log sync failure only for actual errors (not initialization issues)
            if (typeof Logger !== 'undefined') {
                Logger.logSync('sync_failed', { 
                    direction: 'cloud_to_session',
                    error: error?.message || 'unknown',
                    errorCode: error?.code || 'unknown'
                });
            }
            console.error('Error syncing from cloud:', error);
        }
    },

    /**
     * Merge users using last-write-wins strategy based on updatedAt timestamp
     * @param {Array} localUsers - Users in local session cache
     * @param {Array} cloudUsers - Users from cloud
     * @returns {Array} Merged user list
     */
    mergeUsers(localUsers, cloudUsers) {
        if (!Array.isArray(localUsers)) localUsers = [];
        if (!Array.isArray(cloudUsers)) cloudUsers = [];

        // Create maps by user ID for efficient lookup
        const userMap = new Map();

        // Add cloud users first
        cloudUsers.forEach(user => {
            if (user && user.id) {
                userMap.set(user.id, { ...user });
            }
        });

        // Merge local users using last-write-wins based on updatedAt
        localUsers.forEach(user => {
            if (!user || !user.id) return;

            const existingUser = userMap.get(user.id);
            if (!existingUser) {
                // User only exists locally, add it
                userMap.set(user.id, { ...user });
                console.log(`Keeping local-only user: ${user.username}`);
            } else {
                // User exists in both, use updatedAt to determine which is newer
                const localUpdatedAt = user.updatedAt || 0;
                const cloudUpdatedAt = existingUser.updatedAt || 0;

                if (localUpdatedAt > cloudUpdatedAt) {
                    // Local version is newer
                    userMap.set(user.id, { ...user });
                    console.log(`Local user is newer: ${user.username}`);
                } else {
                    // Cloud version is newer or same, keep cloud
                    console.log(`Cloud user is newer or same: ${existingUser.username}`);
                }
            }
        });

        return Array.from(userMap.values());
    },

    /**
     * Sync to cloud - Online-only mode
     * In online-only mode, all writes go directly to cloud (no local-to-cloud sync needed)
     */
    async syncToCloud() {
        // Online-only mode: All writes go directly to cloud via saveData()
        // This method is a no-op in online-only mode
        console.log('[ONLINE-ONLY] syncToCloud is no-op - writes go directly to cloud');
    },

    /**
     * Subscribe to real-time updates for a key
     * @param {string} key - Storage key
     * @param {function} callback - Callback function when data changes
     */
    subscribe(key, callback) {
        if (!this.isInitialized || !this.database || !FirebaseInit.isReady()) {
            return;
        }

        const { onValue, off } = window.firebaseModules;
        const sanitizedKey = this.sanitizeKey(key);
        const dataRef = FirebaseInit.getRef(`data/${sanitizedKey}`);
        
        // Remove existing listener
        if (this.listeners[key]) {
            off(dataRef, 'value', this.listeners[key]);
        }

        // Add new listener - Online-only mode: No local persistence
        this.listeners[key] = onValue(dataRef, async (snapshot) => {
            const cloudData = snapshot.val();
            if (cloudData && cloudData.data !== undefined) {
                // Check if update came from different device
                if (cloudData.updatedBy !== this.getDeviceId()) {
                    // Online-only mode: Update DataManager session cache directly
                    if (typeof DataManager !== 'undefined' && DataManager._sessionCache) {
                        DataManager._sessionCache[key] = cloudData.data;
                    }
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
        if (!this.isInitialized || !this.database) {
            return;
        }

        const { off } = window.firebaseModules;
        const sanitizedKey = this.sanitizeKey(key);
        const dataRef = FirebaseInit.getRef(`data/${sanitizedKey}`);
        
        if (this.listeners[key]) {
            off(dataRef, 'value', this.listeners[key]);
            delete this.listeners[key];
        }
    },

    /**
     * Get unique device identifier
     * Online-only mode: Uses sessionStorage (temporary) instead of localStorage
     * Uses crypto.randomUUID() if available, falls back to timestamp + random
     */
    getDeviceId() {
        // Online-only mode: Use sessionStorage for device ID (session-scoped)
        let deviceId = sessionStorage.getItem('diversey_device_id');
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
            sessionStorage.setItem('diversey_device_id', deviceId);
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
     * Generate an idempotent operation id to correlate retries and cloud saves.
     */
    generateOpId(key) {
        const deviceId = this.getDeviceId();
        const baseId = (typeof Utils !== 'undefined' && typeof Utils.generateId === 'function')
            ? Utils.generateId()
            : Date.now().toString(36);
        return `op:${deviceId}:${key}:${baseId}`;
    },

    /**
     * Get local updated timestamp - No-op in online-only mode
     */
    getLocalUpdatedAt(_key) {
        // Online-only mode: No local timestamps needed
        return 0;
    },

    /**
     * Set local updated timestamp - No-op in online-only mode
     */
    setLocalUpdatedAt(_key, _timestamp) {
        // Online-only mode: No local timestamps stored
    },

    /**
     * Persist data locally - Disabled in online-only mode
     * All data goes directly to cloud.
     */
    async persistLocally(_key, _data, _updatedAt = Date.now()) {
        // Online-only mode: No local persistence for business data
        console.log('[ONLINE-ONLY] persistLocally skipped - cloud is source of truth');
        return true;
    },

    isIndexedDBAvailable() {
        // Online-only mode: IndexedDB is not used for business data
        return false;
    },

    // Online-only mode: Queue operations disabled - writes fail immediately if offline
    async enqueueOperation(_key, _data, _error, _opId = null) {
        console.warn('[ONLINE-ONLY] enqueueOperation disabled - writes require connection');
    },

    async loadQueue() {
        // Online-only mode: No offline queue
        return [];
    },

    async persistQueue(_queue) {
        // Online-only mode: No offline queue
    },

    async flushQueue() {
        // Online-only mode: No offline queue
        return true;
    },

    /**
     * Check if cloud storage is available
     */
    isCloudAvailable() {
        // Use centralized connection state from FirebaseInit
        return this.isInitialized && FirebaseInit.isRTDBConnected();
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
