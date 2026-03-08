/**
 * Cloud Storage Module
 * Handles data synchronization across devices using Firebase Realtime Database
 * Falls back to localStorage when Firebase is unavailable
 */

const CloudStorage = {
    // Connection state is now managed centrally by FirebaseInit
    isInitialized: false,
    isInitializing: false,
    cloudReady: false,
    database: null,

    // Listeners for real-time updates
    listeners: {},

    // Retry configuration
    maxRetries: 3,
    retryDelay: 1000,
    queueStore: 'queue',
    queueLocalKey: 'cloud_sync_queue',
    outboxMaxAttempts: 8,
    outboxBackoffBaseMs: 2000,

    // Keys persisted as record-per-entity to avoid collection-level overwrites.
    entityConfig: {
        diversey_users: { idField: 'id' },
        diversey_solicitacoes: { idField: 'id' }
    },

    /**
     * Initialize Firebase and cloud storage
     */
    async init() {
        try {
            this.isInitializing = true;
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
                this.isInitializing = false;
                return false;
            }

            // Initialize Firebase through centralized module
            if (typeof FirebaseInit === 'undefined') {
                console.warn('FirebaseInit module not loaded');
                this.isInitialized = false;
                this.isInitializing = false;
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
                this.cloudReady = isConnected && FirebaseInit.isReady();
                
                // If we just connected, sync from cloud
                if (isConnected && !wasConnected) {
                    if (typeof DataManager !== 'undefined' && typeof DataManager.scheduleSync === 'function') {
                        DataManager.scheduleSync('rtdb_reconnected');
                    } else {
                        this.syncFromCloud();
                        this.flushQueue();
                    }
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
            this.cloudReady = await this.waitForCloudReady(10000);
            
            console.log('CloudStorage initialized with Firebase and authenticated');
            
            // Initial sync from cloud if connected (using centralized state)
            if (initiallyConnected && FirebaseInit.isRTDBConnected()) {
                this.cloudReady = true;
                await this.syncFromCloud();
                await this.flushQueue();
            }
            
            return true;
        } catch (error) {
            console.error('Error initializing CloudStorage:', error);
            this.isInitialized = false;
            return false;
        } finally {
            this.isInitializing = false;
        }
    },

    /**
     * Wait until Firebase auth is ready AND RTDB is connected.
     * Uses FirebaseInit waitForCloudReady and sets cloudReady flag.
     */
    async waitForCloudReady(timeoutMs = 10000) {
        if (!this.isInitialized) {
            if (this.isInitializing) {
                // Already initializing via another call; allow loop below to wait.
            } else {
                const initialized = await this.init();
                if (!initialized) {
                    return false;
                }
            }
        }

        if (this.isInitialized && this.cloudReady) {
            return true;
        }

        if (typeof FirebaseInit !== 'undefined' && typeof FirebaseInit.waitForCloudReady === 'function') {
            const ready = await FirebaseInit.waitForCloudReady(timeoutMs);
            this.cloudReady = ready && this.isInitialized;
            return this.cloudReady;
        }

        // Fallback polling when helper is unavailable
        const start = Date.now();
        while (Date.now() - start < timeoutMs) {
            if (this.isInitialized &&
                typeof FirebaseInit !== 'undefined' &&
                FirebaseInit.isReady() &&
                FirebaseInit.isRTDBConnected()) {
                this.cloudReady = true;
                return true;
            }
            await new Promise(resolve => setTimeout(resolve, 150));
        }
        return false;
    },

    isEntityKey(key) {
        const sanitizedKey = this.sanitizeKey(key);
        return Object.prototype.hasOwnProperty.call(this.entityConfig, sanitizedKey);
    },

    getEntityIdField(key) {
        const sanitizedKey = this.sanitizeKey(key);
        return this.entityConfig?.[sanitizedKey]?.idField || 'id';
    },

    getEntityCollectionPath(key) {
        const sanitizedKey = this.sanitizeKey(key);
        return `entities/${sanitizedKey}`;
    },

    getEntityRecordPath(key, entityId) {
        const sanitizedKey = this.sanitizeKey(key);
        const safeEntityId = this.sanitizeKey(String(entityId || '').trim());
        return `entities/${sanitizedKey}/${safeEntityId}`;
    },

    normalizeEntityArray(key, items) {
        if (!Array.isArray(items)) {
            return [];
        }

        const idField = this.getEntityIdField(key);
        return items
            .filter(Boolean)
            .map((item) => ({ ...item }))
            .filter((item) => item && item[idField]);
    },

    collectionFromEntitySnapshot(key, rawCollection) {
        if (!rawCollection || typeof rawCollection !== 'object') {
            return [];
        }

        const list = [];
        Object.keys(rawCollection).forEach((recordId) => {
            const entry = rawCollection[recordId];
            if (!entry || entry.data === undefined || entry.data === null) {
                return;
            }
            const payload = { ...entry.data };
            if (!payload.id) {
                payload.id = recordId;
            }
            list.push(payload);
        });

        return list;
    },

    buildEntityDiff(key, previousItems, nextItems) {
        const idField = this.getEntityIdField(key);
        const previous = this.normalizeEntityArray(key, previousItems);
        const next = this.normalizeEntityArray(key, nextItems);

        const previousMap = new Map(previous.map((item) => [String(item[idField]), item]));
        const nextMap = new Map(next.map((item) => [String(item[idField]), item]));

        const upserts = [];
        const deletes = [];

        nextMap.forEach((nextItem, entityId) => {
            const prevItem = previousMap.get(entityId);
            const prevSerialized = prevItem ? JSON.stringify(prevItem) : null;
            const nextSerialized = JSON.stringify(nextItem);
            if (!prevItem || prevSerialized !== nextSerialized) {
                upserts.push(nextItem);
            }
        });

        previousMap.forEach((_prevItem, entityId) => {
            if (!nextMap.has(entityId)) {
                deletes.push(entityId);
            }
        });

        return { upserts, deletes };
    },

    async writeEntityRecord(key, record, meta = {}) {
        if (!record) {
            return false;
        }

        const idField = this.getEntityIdField(key);
        const entityId = record[idField];
        if (!entityId) {
            return false;
        }

        const { set } = window.firebaseModules;
        const opId = meta.opId || this.generateOpId(`${key}:${entityId}`);
        const now = Date.now();
        const dataRef = FirebaseInit.getRef(this.getEntityRecordPath(key, entityId));

        await set(dataRef, {
            data: { ...record },
            updatedAt: now,
            updatedBy: this.getDeviceId(),
            opId
        });

        return true;
    },

    async deleteEntityRecord(key, entityId, meta = {}) {
        if (!entityId) {
            return false;
        }

        const { set } = window.firebaseModules;
        const dataRef = FirebaseInit.getRef(this.getEntityRecordPath(key, entityId));
        await set(dataRef, null);

        if (typeof Logger !== 'undefined' && typeof Logger.logSync === 'function') {
            Logger.logSync('entity_record_deleted', {
                key,
                entityId,
                opId: meta.opId || null
            });
        }

        return true;
    },

    async saveEntityCollectionDiff(key, nextItems, previousItems = [], options = {}) {
        const diff = this.buildEntityDiff(key, previousItems, nextItems);
        const opId = options.opId || this.generateOpId(key);

        try {
            for (const item of diff.upserts) {
                await this.writeEntityRecord(key, item, { opId });
            }
            for (const entityId of diff.deletes) {
                await this.deleteEntityRecord(key, entityId, { opId });
            }
            return true;
        } catch (error) {
            console.error('Error saving entity diff:', error);
            return false;
        }
    },

    async loadEntityCollection(key) {
        const { get } = window.firebaseModules;
        const collectionRef = FirebaseInit.getRef(this.getEntityCollectionPath(key));
        const snapshot = await get(collectionRef);
        const value = snapshot.val();
        return this.collectionFromEntitySnapshot(key, value);
    },
    /**
     * Save data to cloud storage - Online-only mode
     * Requires cloud connection; does NOT fallback to local storage.
     * For configured entity keys, applies record-level persistence/diff.
     * @param {string} key - Storage key
     * @param {any} data - Data to save
     * @param {object} options - Persistence options
     * @returns {Promise<boolean>} - Success status
     */
    async saveData(key, data, options = {}) {
        const opId = options?.opId || (data && data.opId) || this.generateOpId(key);

        // Ensure Firebase is authenticated and initialized
        if (typeof FirebaseInit === 'undefined' || typeof FirebaseInit.isReady !== 'function' || !FirebaseInit.isReady()) {
            console.warn('[ONLINE-ONLY] Cannot save - Firebase not authenticated');
            return false;
        }

        // Online-only mode: Require cloud connection
        if (!this.isInitialized || !this.database ||
            typeof FirebaseInit === 'undefined' ||
            typeof FirebaseInit.isRTDBConnected !== 'function' ||
            !FirebaseInit.isRTDBConnected()) {
            console.warn('[ONLINE-ONLY] Cannot save - cloud not connected');
            return false;
        }

        try {
            const sanitizedKey = this.sanitizeKey(key);

            if (this.isEntityKey(sanitizedKey) && Array.isArray(data)) {
                let previous = Array.isArray(options?.previousData) ? options.previousData : null;
                if (!Array.isArray(previous)) {
                    try {
                        previous = await this.loadEntityCollection(sanitizedKey);
                    } catch (_error) {
                        previous = [];
                    }
                }

                const saved = await this.saveEntityCollectionDiff(sanitizedKey, data, previous || [], { opId });
                if (saved) {
                    console.log(`Entity collection diff saved to cloud: ${sanitizedKey}`);
                }
                return saved;
            }

            const { set } = window.firebaseModules;
            const dataRef = FirebaseInit.getRef(`data/${sanitizedKey}`);

            await set(dataRef, {
                data,
                updatedAt: Date.now(),
                updatedBy: this.getDeviceId(),
                opId
            });

            console.log(`Data saved to cloud: ${sanitizedKey}`);
            return true;
        } catch (error) {
            console.error('Error saving to cloud:', error);
            return false;
        }
    },

    /**
     * Load data from cloud storage - Online-only mode
     * Loads directly from cloud; no local fallback.
     * For configured entity keys, loads from record-per-entity path.
     * @param {string} key - Storage key
     * @returns {Promise<any>} - Retrieved data
     */
    async loadData(key) {
        if (!(this.isInitialized && this.database && typeof FirebaseInit !== 'undefined' && FirebaseInit.isReady() && FirebaseInit.isRTDBConnected())) {
            console.warn('[ONLINE-ONLY] Cloud not available for load operation');
            return null;
        }

        try {
            const sanitizedKey = this.sanitizeKey(key);

            if (this.isEntityKey(sanitizedKey)) {
                const entityCollection = await this.loadEntityCollection(sanitizedKey);
                if (Array.isArray(entityCollection) && entityCollection.length > 0) {
                    return entityCollection;
                }
            }

            const { get } = window.firebaseModules;
            const dataRef = FirebaseInit.getRef(`data/${sanitizedKey}`);
            const snapshot = await get(dataRef);
            const cloudData = snapshot.val();

            if (cloudData && cloudData.data !== undefined) {
                return cloudData.data;
            }
        } catch (error) {
            console.error('Error loading from cloud:', error);
        }

        return null;
    },

    /**
     * Synchronize data from cloud - Online-only mode
     * Loads authoritative cloud data into DataManager session cache.
     */
    async syncFromCloud() {
        if (!this.isInitialized || !this.database) {
            console.debug('CloudStorage not initialized, skipping sync');
            return;
        }

        if (typeof FirebaseInit === 'undefined' || typeof FirebaseInit.isReady !== 'function' || !FirebaseInit.isReady()) {
            console.debug('Firebase not authenticated, skipping sync');
            return;
        }

        if (typeof DataManager === 'undefined' || !DataManager._sessionCache) {
            console.warn('DataManager not initialized, skipping sync');
            return;
        }

        if (typeof Logger !== 'undefined' && typeof Logger.logSync === 'function') {
            Logger.logSync('sync_start', { direction: 'cloud_to_session' });
        }

        try {
            const keys = Object.values(DataManager.KEYS || {});
            let keysUpdated = 0;

            for (const key of keys) {
                if (!key || key === DataManager.KEYS.PARTS_VERSION) {
                    continue;
                }
                const value = await this.loadData(key);
                if (value !== null && value !== undefined) {
                    DataManager._sessionCache[key] = value;
                    keysUpdated++;
                }
            }

            if (typeof Logger !== 'undefined' && typeof Logger.logSync === 'function') {
                Logger.logSync('sync_complete', {
                    direction: 'cloud_to_session',
                    keysUpdated
                });
            }
        } catch (error) {
            if (typeof Logger !== 'undefined' && typeof Logger.logSync === 'function') {
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
        if (!Array.isArray(localUsers)) {
            localUsers = [];
        }
        if (!Array.isArray(cloudUsers)) {
            cloudUsers = [];
        }

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
            if (!user || !user.id) {
                return;
            }

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
     * Determine if merged users differ from cloud snapshot and need to be written back.
     * Uses length and updatedAt comparison to avoid unnecessary writes.
     */
    usersNeedCloudUpdate(cloudUsers, mergedUsers) {
        if (!Array.isArray(cloudUsers) || !Array.isArray(mergedUsers)) {
            return false;
        }
        if (cloudUsers.length !== mergedUsers.length) {
            return true;
        }
        const cloudMap = new Map();
        cloudUsers.forEach(u => {
            if (u && u.id) {
                cloudMap.set(u.id, u.updatedAt || 0);
            }
        });
        return mergedUsers.some(u => {
            if (!u || !u.id) {
                return false;
            }
            const cloudUpdated = cloudMap.get(u.id);
            return cloudUpdated === undefined || (u.updatedAt || 0) !== (cloudUpdated || 0);
        });
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
        const refPath = this.isEntityKey(sanitizedKey)
            ? this.getEntityCollectionPath(sanitizedKey)
            : `data/${sanitizedKey}`;
        const dataRef = FirebaseInit.getRef(refPath);

        if (this.listeners[key]) {
            off(dataRef, 'value', this.listeners[key]);
        }

        this.listeners[key] = onValue(dataRef, async (snapshot) => {
            const cloudData = snapshot.val();
            if (cloudData === null || cloudData === undefined) {
                return;
            }

            if (this.isEntityKey(sanitizedKey)) {
                const collection = this.collectionFromEntitySnapshot(sanitizedKey, cloudData);
                if (typeof DataManager !== 'undefined' && DataManager._sessionCache) {
                    DataManager._sessionCache[key] = collection;
                }
                callback(collection);
                return;
            }

            if (cloudData && cloudData.data !== undefined) {
                if (typeof DataManager !== 'undefined' && DataManager._sessionCache) {
                    DataManager._sessionCache[key] = cloudData.data;
                }
                callback(cloudData.data);
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
        const refPath = this.isEntityKey(sanitizedKey)
            ? this.getEntityCollectionPath(sanitizedKey)
            : `data/${sanitizedKey}`;
        const dataRef = FirebaseInit.getRef(refPath);

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

    // Queue/outbox operations for transient failures
    async enqueueOperation(key, data, error, opId = null, options = {}) {
        if (!key) {
            return false;
        }

        const queue = await this.loadQueue();
        const now = Date.now();
        const operation = {
            opId: opId || this.generateOpId(key),
            key,
            data,
            options: { ...options, skipQueue: true },
            attempts: 0,
            createdAt: now,
            updatedAt: now,
            nextRetryAt: now,
            lastError: error?.message || String(error || 'save_failed')
        };

        const existingIndex = queue.findIndex((item) => item?.opId === operation.opId);
        if (existingIndex >= 0) {
            queue[existingIndex] = operation;
        } else {
            queue.push(operation);
        }

        await this.persistQueue(queue);

        if (typeof Logger !== 'undefined' && typeof Logger.logSync === 'function') {
            Logger.logSync('outbox_queued', {
                opId: operation.opId,
                key,
                nextRetryAt: operation.nextRetryAt,
                reason: operation.lastError
            });
        }

        return true;
    },

    async loadQueue() {
        try {
            const queue = JSON.parse(localStorage.getItem(this.queueLocalKey) || '[]');
            return Array.isArray(queue) ? queue : [];
        } catch (_error) {
            return [];
        }
    },

    async persistQueue(queue) {
        try {
            const safeQueue = Array.isArray(queue) ? queue : [];
            localStorage.setItem(this.queueLocalKey, JSON.stringify(safeQueue));
            return true;
        } catch (_error) {
            return false;
        }
    },

    getOutboxRetryAt(attempts = 1) {
        const exponent = Math.max(0, Number(attempts) - 1);
        const delay = Math.min(5 * 60 * 1000, this.outboxBackoffBaseMs * Math.pow(2, exponent));
        return Date.now() + delay;
    },

    async flushQueue() {
        if (!this.isCloudAvailable()) {
            return false;
        }

        const queue = await this.loadQueue();
        if (!Array.isArray(queue) || queue.length === 0) {
            return true;
        }

        const now = Date.now();
        const remaining = [];

        for (const item of queue) {
            if (!item || !item.key || !item.opId) {
                continue;
            }

            if (Number(item.nextRetryAt || 0) > now) {
                remaining.push(item);
                continue;
            }

            const saved = await this.saveData(item.key, item.data, {
                ...(item.options || {}),
                opId: item.opId,
                skipQueue: true
            });

            if (saved) {
                if (typeof Logger !== 'undefined' && typeof Logger.logSync === 'function') {
                    Logger.logSync('outbox_operation_success', {
                        opId: item.opId,
                        key: item.key,
                        attempts: item.attempts || 0
                    });
                }
                continue;
            }

            const attempts = Number(item.attempts || 0) + 1;
            if (attempts >= this.outboxMaxAttempts) {
                if (typeof Logger !== 'undefined' && typeof Logger.logSync === 'function') {
                    Logger.logSync('outbox_operation_failed', {
                        opId: item.opId,
                        key: item.key,
                        attempts,
                        reason: 'max_attempts_reached'
                    });
                }
                continue;
            }

            remaining.push({
                ...item,
                attempts,
                updatedAt: Date.now(),
                nextRetryAt: this.getOutboxRetryAt(attempts),
                lastError: 'save_failed'
            });
        }

        await this.persistQueue(remaining);
        return remaining.length === 0;
    },

    /**
     * Check if cloud storage is available
     */
    isCloudAvailable() {
        // Use centralized connection state from FirebaseInit
        return this.isInitialized &&
            this.cloudReady &&
            typeof FirebaseInit !== 'undefined' &&
            typeof FirebaseInit.isRTDBConnected === 'function' &&
            FirebaseInit.isRTDBConnected();
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










