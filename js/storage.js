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
    accessSession: null,
    lastOperationError: null,

    // Listeners for real-time updates
    listeners: {},

    // Retry configuration
    maxRetries: 3,
    retryDelay: 1000,
    queueStore: 'queue',
    queueLocalKey: 'cloud_sync_queue',
    recordCollectionKeys: ['diversey_solicitacoes'],

    logSyncEvent(level, message, data = {}) {
        if (typeof Logger === 'undefined' || typeof Logger[level] !== 'function') {
            return;
        }

        Logger[level](Logger.CATEGORY.SYNC, message, data);
    },

    clearLastOperationError() {
        this.lastOperationError = null;
    },

    rememberOperationError(error, context = {}) {
        this.lastOperationError = {
            code: String(error?.code || '').toLowerCase(),
            message: String(error?.message || error || 'unknown_error'),
            permissionDenied: this.isPermissionDeniedError(error),
            retryable: this.isRetryableSaveError(error),
            at: Date.now(),
            ...context
        };
        return this.lastOperationError;
    },

    rememberSyntheticOperationError(reason, context = {}) {
        this.lastOperationError = {
            code: String(reason || 'operation_failed').toLowerCase(),
            message: String(reason || 'operation_failed'),
            permissionDenied: false,
            retryable: false,
            at: Date.now(),
            ...context
        };
        return this.lastOperationError;
    },

    getLastOperationError() {
        return this.lastOperationError ? { ...this.lastOperationError } : null;
    },

    async waitForFirebaseBootstrap(timeoutMs = 15000) {
        if (typeof window !== 'undefined' && window.firebaseModules && window.FirebaseInit) {
            return true;
        }

        if (typeof window === 'undefined') {
            return false;
        }

        return new Promise((resolve) => {
            let settled = false;
            const cleanup = () => {
                if (settled) {
                    return;
                }
                settled = true;
                clearTimeout(timeout);
                clearInterval(interval);
                window.removeEventListener('firebase-modules-ready', handleReady);
            };

            const finish = (value) => {
                cleanup();
                resolve(value);
            };

            const checkReady = () => {
                if (window.firebaseModules && window.FirebaseInit) {
                    finish(true);
                }
            };

            const handleReady = () => checkReady();
            const timeout = setTimeout(() => finish(false), timeoutMs);
            const interval = setInterval(checkReady, 100);

            window.addEventListener('firebase-modules-ready', handleReady);
            checkReady();
        });
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

            const firebaseBootstrapReady = await this.waitForFirebaseBootstrap(15000);
            if (!firebaseBootstrapReady) {
                console.warn('Firebase bootstrap did not finish loading');
                this.isInitialized = false;
                return false;
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
                this.logSyncEvent('info', 'firebase_connection_status_changed', {
                    connected: isConnected === true
                });
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
                }, 8000);

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
            this.cloudReady = await this.waitForCloudReady(15000);
            
            this.logSyncEvent('info', 'cloud_storage_initialized', {
                initiallyConnected: initiallyConnected === true
            });
            
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

    delay(ms = 0) {
        return new Promise((resolve) => setTimeout(resolve, Math.max(0, Number(ms) || 0)));
    },

    isRetryableSaveError(error) {
        const message = String(error?.message || '').toLowerCase();
        const code = String(error?.code || '').toLowerCase();
        return [
            'network',
            'timeout',
            'unavailable',
            'disconnected',
            'failed-precondition',
            'connection'
        ].some((token) => message.includes(token) || code.includes(token));
    },

    isPermissionDeniedError(error) {
        const message = String(error?.message || '').toLowerCase();
        const code = String(error?.code || '').toLowerCase();
        return code.includes('permission-denied') || message.includes('permission_denied') || message.includes('permission denied');
    },

    isRecordCollectionKey(key) {
        return this.recordCollectionKeys.includes(String(key || ''));
    },

    getManagedKeys() {
        if (typeof DataManager === 'undefined' || !DataManager.KEYS) {
            return [];
        }
        return Object.values(DataManager.KEYS).filter((value) => typeof value === 'string' && value.length > 0);
    },

    getCollectionRefForRead(key) {
        const sanitizedKey = this.sanitizeKey(key);
        const baseRef = FirebaseInit.getRef(`data/${sanitizedKey}`);
        if (!baseRef) {
            return null;
        }

        if (!this.isRecordCollectionKey(key)) {
            return baseRef;
        }

        const sessionUser = typeof Auth !== 'undefined' && typeof Auth.getCurrentUser === 'function'
            ? Auth.getCurrentUser()
            : null;
        const { query, orderByChild, equalTo } = window.firebaseModules || {};

        if (sessionUser?.role === 'tecnico' && sessionUser?.tecnicoId && typeof query === 'function') {
            return query(baseRef, orderByChild('tecnicoId'), equalTo(sessionUser.tecnicoId));
        }

        if (sessionUser?.role === 'fornecedor' && sessionUser?.fornecedorId && typeof query === 'function') {
            return query(baseRef, orderByChild('fornecedorId'), equalTo(sessionUser.fornecedorId));
        }

        return baseRef;
    },

    getSolicitationRecordVersion(record) {
        return Number(record?.audit?.version) || Number(record?.updatedAt) || Number(record?.createdAt) || 0;
    },

    mergeSolicitationCollections(previousRecords, nextRecords) {
        const previousMap = new Map();
        const nextMap = new Map();

        (Array.isArray(previousRecords) ? previousRecords : []).filter(Boolean).forEach((record) => {
            const key = record?.id || record?.numero;
            if (key) {
                previousMap.set(key, record);
            }
        });

        (Array.isArray(nextRecords) ? nextRecords : []).filter(Boolean).forEach((record) => {
            const key = record?.id || record?.numero;
            if (key) {
                nextMap.set(key, record);
            }
        });

        const merged = [];
        nextMap.forEach((record, key) => {
            const previous = previousMap.get(key);
            if (!previous) {
                merged.push(record);
                return;
            }

            if (this.getSolicitationRecordVersion(record) >= this.getSolicitationRecordVersion(previous)) {
                merged.push(record);
                return;
            }

            merged.push(previous);
        });

        return merged;
    },

    normalizeCloudPayload(key, cloudData) {
        if (this.isRecordCollectionKey(key)) {
            if (!cloudData || typeof cloudData !== 'object') {
                return [];
            }

            return Object.values(cloudData)
                .filter((item) => item
                    && typeof item === 'object'
                    && !Array.isArray(item)
                    && (item.id || item.numero))
                .sort((left, right) => {
                    const leftStamp = Number(left?.updatedAt || left?.createdAt) || 0;
                    const rightStamp = Number(right?.updatedAt || right?.createdAt) || 0;
                    return rightStamp - leftStamp;
                });
        }

        if (cloudData && cloudData.data !== undefined) {
            return cloudData.data;
        }

        return cloudData ?? null;
    },

    async saveRecordCollection(key, records, options = {}, opId) {
        const sanitizedKey = this.sanitizeKey(key);
        const collectionRef = FirebaseInit.getRef(`data/${sanitizedKey}`);
        const { set, remove } = window.firebaseModules;

        if (!collectionRef || typeof set !== 'function' || typeof remove !== 'function') {
            return false;
        }

        const nextRecords = Array.isArray(records)
            ? records.filter(Boolean).map((record) => ({ ...record }))
            : [];
        const previousSessionRecords = (typeof DataManager !== 'undefined' && Array.isArray(DataManager._sessionCache?.[key]))
            ? DataManager._sessionCache[key]
            : [];
        const previousRecords = Array.isArray(previousSessionRecords)
            ? previousSessionRecords.filter(Boolean).map((record) => ({ ...record }))
            : [];

        const previousMap = new Map();
        previousRecords.forEach((record) => {
            const recordId = record?.id || record?.numero;
            if (recordId) {
                previousMap.set(recordId, record);
            }
        });

        const nextMap = new Map();
        nextRecords.forEach((record) => {
            const recordId = record?.id || record?.numero;
            if (recordId) {
                nextMap.set(recordId, record);
            }
        });

        const explicitChangedIds = Array.isArray(options.changedIds)
            ? new Set(options.changedIds.filter(Boolean))
            : null;
        const explicitRemovedIds = Array.isArray(options.removedIds)
            ? new Set(options.removedIds.filter(Boolean))
            : null;

        const changedIds = explicitChangedIds || new Set();
        const removedIds = explicitRemovedIds || new Set();

        if (options.replaceCollection === true && nextRecords.length === 0) {
            await remove(collectionRef);
            this.logSyncEvent('debug', 'cloud_record_collection_cleared', {
                key,
                opId
            });
            return true;
        }

        if (!explicitChangedIds) {
            nextMap.forEach((record, recordId) => {
                const previous = previousMap.get(recordId);
                if (!previous || JSON.stringify(previous) !== JSON.stringify(record)) {
                    changedIds.add(recordId);
                }
            });
        }

        if (!explicitRemovedIds || options.replaceCollection === true) {
            previousMap.forEach((_record, recordId) => {
                if (!nextMap.has(recordId)) {
                    removedIds.add(recordId);
                }
            });
        }

        for (const recordId of changedIds) {
            const record = nextMap.get(recordId);
            if (!record) {
                continue;
            }

            await set(FirebaseInit.getRef(`data/${sanitizedKey}/${recordId}`), {
                ...record,
                updatedAt: Number(record.updatedAt) || Date.now(),
                opId
            });
        }

        for (const recordId of removedIds) {
            await remove(FirebaseInit.getRef(`data/${sanitizedKey}/${recordId}`));
        }

        this.logSyncEvent('debug', 'cloud_record_collection_saved', {
            key,
            opId,
            changedCount: changedIds.size,
            removedCount: removedIds.size
        });
        return true;
    },

    getFirebaseUserId() {
        return window?.firebaseUser?.uid || null;
    },

    async persistAccessSession(sessionUser = null) {
        const activeUser = sessionUser || (typeof Auth !== 'undefined' && typeof Auth.getCurrentUser === 'function' ? Auth.getCurrentUser() : null);
        const uid = this.getFirebaseUserId();
        const { set } = window.firebaseModules || {};

        if (!uid || !activeUser || typeof set !== 'function') {
            return false;
        }

        await set(FirebaseInit.getRef(`data/diversey_sessions/${uid}`), {
            username: activeUser.username,
            role: activeUser.role,
            tecnicoId: activeUser.tecnicoId || null,
            fornecedorId: activeUser.fornecedorId || null,
            expiresAt: Number(activeUser.expiresAt) || (Date.now() + (30 * 24 * 60 * 60 * 1000)),
            updatedAt: Date.now()
        });
        this.accessSession = {
            userId: uid,
            username: activeUser.username,
            role: activeUser.role,
            tecnicoId: activeUser.tecnicoId || null,
            fornecedorId: activeUser.fornecedorId || null,
            expiresAt: Number(activeUser.expiresAt) || (Date.now() + (30 * 24 * 60 * 60 * 1000))
        };
        return true;
    },

    async recoverAccessSession(reason = 'cloud_write_recovery', context = {}) {
        const activeUser = typeof Auth !== 'undefined' && typeof Auth.getCurrentUser === 'function'
            ? Auth.getCurrentUser()
            : null;

        if (!activeUser) {
            return false;
        }

        try {
            if (typeof FirebaseInit !== 'undefined' && typeof FirebaseInit.waitForCloudReady === 'function') {
                const ready = await FirebaseInit.waitForCloudReady(8000);
                if (!ready) {
                    return false;
                }
            }

            const persisted = await this.persistAccessSession(activeUser);
            if (persisted) {
                this.logSyncEvent('info', 'cloud_access_session_recovered', {
                    reason,
                    ...context
                });
            }
            return persisted;
        } catch (error) {
            this.logSyncEvent('warn', 'cloud_access_session_recovery_failed', {
                reason,
                error: error?.message || 'session_recovery_failed',
                ...context
            });
            return false;
        }
    },

    async clearAccessSession() {
        const uid = this.getFirebaseUserId();
        const { remove } = window.firebaseModules || {};

        if (!uid || typeof remove !== 'function') {
            return false;
        }

        await remove(FirebaseInit.getRef(`data/diversey_sessions/${uid}`));
        this.accessSession = null;
        return true;
    },

    async ensureWriteReady(key = 'unknown', opId = null, options = {}) {
        const timeoutMs = Math.max(5000, Number(options.timeoutMs) || 20000);

        if ((!this.isInitialized || !this.database) && typeof this.init === 'function') {
            const initialized = await this.init();
            if (!initialized) {
                this.logSyncEvent('warn', 'cloud_write_init_failed', { key, opId });
                return false;
            }
        }

        if ((!this.database || !this.isInitialized) && typeof FirebaseInit !== 'undefined' && FirebaseInit.database) {
            this.database = FirebaseInit.database;
            this.isInitialized = true;
        }

        if (typeof FirebaseInit === 'undefined' || typeof FirebaseInit.waitForReady !== 'function') {
            return false;
        }

        const firebaseReady = await FirebaseInit.waitForReady(timeoutMs);
        if (!firebaseReady) {
            this.logSyncEvent('warn', 'cloud_write_auth_not_ready', { key, opId });
            return false;
        }

        let cloudReady = await this.waitForCloudReady(timeoutMs);
        if (cloudReady) {
            return true;
        }

        const activeUser = typeof Auth !== 'undefined' && typeof Auth.getCurrentUser === 'function'
            ? Auth.getCurrentUser()
            : null;
        if (activeUser) {
            try {
                await this.recoverAccessSession('write_precondition_retry', { key, opId });
            } catch (_error) {
                // retry path below handles final result
            }
        }

        cloudReady = await this.waitForCloudReady(Math.max(8000, Math.floor(timeoutMs / 2)));
        if (!cloudReady) {
            this.logSyncEvent('warn', 'cloud_write_connection_pending', {
                key,
                opId
            });
        }

        // Em rede móvel/PWA o .info/connected pode atrasar mesmo com Auth e RTDB aptos para write.
        // A gravação real fará o veredito com retry e tratamento de erro.
        return true;
    },

    async saveRecentPartsForTechnician(tecnicoId, partCodes = [], options = {}) {
        const normalizedTecnicoId = String(tecnicoId || '').trim();
        if (!normalizedTecnicoId) {
            return false;
        }

        this.clearLastOperationError();

        const opId = options.opId || this.generateOpId(`recent_parts:${normalizedTecnicoId}`);
        const ready = await this.ensureWriteReady('diversey_recent_parts', opId, options);
        if (!ready) {
            this.rememberSyntheticOperationError('cloud_not_ready', {
                key: 'diversey_recent_parts',
                opId
            });
            return false;
        }

        const { set } = window.firebaseModules || {};
        if (typeof set !== 'function') {
            return false;
        }

        const payload = Array.isArray(partCodes)
            ? partCodes.filter(Boolean).map((code) => String(code).trim()).filter(Boolean).slice(0, 10)
            : [];

        let lastError = null;
        for (let attempt = 1; attempt <= Math.max(1, this.maxRetries); attempt++) {
            try {
                await set(FirebaseInit.getRef(`data/diversey_recent_parts/${normalizedTecnicoId}`), payload);
                this.logSyncEvent('debug', 'cloud_recent_parts_saved', {
                    tecnicoId: normalizedTecnicoId,
                    opId,
                    count: payload.length
                });
                return true;
            } catch (error) {
                lastError = error;
                if (this.isPermissionDeniedError(error)) {
                    const recovered = await this.recoverAccessSession('recent_parts_permission_denied', {
                        tecnicoId: normalizedTecnicoId,
                        opId,
                        attempt
                    });
                    if (recovered) {
                        continue;
                    }
                }
                if (attempt >= this.maxRetries || !this.isRetryableSaveError(error)) {
                    break;
                }
                await this.delay(this.retryDelay * attempt);
            }
        }

        this.logSyncEvent('warn', 'cloud_recent_parts_save_failed', {
            tecnicoId: normalizedTecnicoId,
            opId,
            error: lastError?.message || 'recent_parts_save_failed'
        });
        this.rememberOperationError(lastError || 'recent_parts_save_failed', {
            key: 'diversey_recent_parts',
            opId
        });
        return false;
    },

    /**
     * Save data to cloud storage - Online-only mode
     * Requires cloud connection; does NOT fallback to local storage.
     * @param {string} key - Storage key
     * @param {any} data - Data to save
     * @returns {Promise<boolean>} - Success status
     */
    async saveData(key, data, options = {}) {
        const opId = (data && data.opId) || this.generateOpId(key);
        this.clearLastOperationError();

        const ready = await this.ensureWriteReady(key, opId, options);
        if (!ready) {
            console.warn('[ONLINE-ONLY] Cannot save - cloud not connected');
            this.rememberSyntheticOperationError('cloud_not_ready', { key, opId });
            return false;
        }

        // Save to cloud
        if (this.isRecordCollectionKey(key)) {
            let recordSaveError = null;
            for (let attempt = 1; attempt <= Math.max(1, this.maxRetries); attempt++) {
                try {
                    await this.saveRecordCollection(key, data, options, opId);
                    this.clearLastOperationError();
                    return true;
                } catch (error) {
                    recordSaveError = error;
                    if (this.isPermissionDeniedError(error)) {
                        const recovered = await this.recoverAccessSession('record_collection_permission_denied', { key, opId, attempt });
                        if (recovered) {
                            continue;
                        }
                    }
                    if (attempt >= this.maxRetries || !this.isRetryableSaveError(error)) {
                        break;
                    }
                    await this.delay(this.retryDelay * attempt);
                }
            }

            console.error('Error saving record collection to cloud:', recordSaveError);
            this.rememberOperationError(recordSaveError || 'record_collection_save_failed', {
                key,
                opId,
                scope: 'record_collection'
            });
            return false;
        }

        const { set } = window.firebaseModules;
        const sanitizedKey = this.sanitizeKey(key);
        const dataRef = FirebaseInit.getRef(`data/${sanitizedKey}`);
        let lastError = null;

        for (let attempt = 1; attempt <= Math.max(1, this.maxRetries); attempt++) {
            try {
                await set(dataRef, {
                    data: data,
                    updatedAt: Date.now(),
                    updatedBy: this.getDeviceId(),
                    opId
                });
                this.logSyncEvent('debug', 'cloud_data_saved', { key, opId });
                this.clearLastOperationError();
                return true;
            } catch (error) {
                lastError = error;
                if (this.isPermissionDeniedError(error)) {
                    const recovered = await this.recoverAccessSession('collection_permission_denied', { key, opId, attempt });
                    if (recovered) {
                        continue;
                    }
                }
                if (attempt >= this.maxRetries || !this.isRetryableSaveError(error)) {
                    break;
                }
                await this.delay(this.retryDelay * attempt);
            }
        }

        console.error('Error saving to cloud:', lastError);
        this.rememberOperationError(lastError || 'collection_save_failed', {
            key,
            opId,
            scope: 'collection'
        });
        return false;
    },

    /**
     * Load data from cloud storage - Online-only mode
     * Loads directly from cloud; no local fallback.
     * @param {string} key - Storage key
     * @returns {Promise<any>} - Retrieved data
     */
    async loadData(key) {
        // Online-only mode: Load from cloud only
        if (this.isInitialized && this.database && typeof FirebaseInit !== 'undefined' && FirebaseInit.isReady() && FirebaseInit.isRTDBConnected()) {
            try {
                const { get } = window.firebaseModules;
                const dataRef = this.getCollectionRefForRead(key);
                if (!dataRef) {
                    this.logSyncEvent('debug', 'cloud_collection_read_skipped_missing_scope', { key });
                    return null;
                }

                const snapshot = await get(dataRef);
                const cloudData = snapshot.val();
                return this.normalizeCloudPayload(key, cloudData);
            } catch (error) {
                if (this.isPermissionDeniedError(error)) {
                    this.logSyncEvent('debug', 'cloud_collection_read_denied', { key });
                    return null;
                }
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
        if (typeof FirebaseInit === 'undefined' || typeof FirebaseInit.isReady !== 'function' || !FirebaseInit.isReady()) {
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
            let keysUpdated = 0;
            const managedKeys = this.getManagedKeys();

            for (const originalKey of managedKeys) {
                let entryData = null;
                try {
                    entryData = await this.loadData(originalKey);
                } catch (loadError) {
                    this.logSyncEvent('warn', 'cloud_collection_sync_failed', {
                        key: originalKey,
                        error: loadError?.message || 'load_failed'
                    });
                    continue;
                }

                if (entryData === null || entryData === undefined) {
                    continue;
                }

                if (originalKey === 'diversey_users' && Array.isArray(entryData)) {
                    const localUsers = DataManager._sessionCache[originalKey] || [];
                    const cloudUsers = entryData;
                    const mergedUsers = this.mergeUsers(localUsers, cloudUsers);
                    const needsCloudUpdate = this.usersNeedCloudUpdate(cloudUsers, mergedUsers);
                    DataManager._sessionCache[originalKey] = mergedUsers;
                    keysUpdated++;
                    // Merged users from cloud to session
                    this.logSyncEvent('debug', 'users_merged_from_cloud', {
                        key: originalKey,
                        count: mergedUsers.length
                    });
                    if (needsCloudUpdate) {
                        this.saveData(originalKey, mergedUsers)
                            .then(() => this.logSyncEvent('debug', 'merged_users_pushed_to_cloud', {
                                key: originalKey,
                                count: mergedUsers.length
                            }))
                            .catch((pushErr) => console.warn('Failed to push merged users to cloud', pushErr));
                    }
                    continue;
                }

                if (originalKey === 'diversey_solicitacoes' && Array.isArray(entryData)) {
                    const localSolicitations = DataManager._sessionCache[originalKey] || [];
                    DataManager._sessionCache[originalKey] = this.mergeSolicitationCollections(localSolicitations, entryData);
                    keysUpdated++;
                    this.logSyncEvent('debug', 'cloud_record_collection_synced_to_session', {
                        key: originalKey,
                        count: DataManager._sessionCache[originalKey].length
                    });
                    continue;
                }

                DataManager._sessionCache[originalKey] = entryData;
                keysUpdated++;
                this.logSyncEvent('debug', 'cloud_collection_synced_to_session', { key: originalKey });
            }

            if (typeof Logger !== 'undefined') {
                Logger.logSync('sync_complete', {
                    direction: 'cloud_to_session',
                    keysUpdated
                });
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
                this.logSyncEvent('debug', 'merge_kept_local_only_user', {
                    userId: user.id,
                    username: user.username
                });
            } else {
                // User exists in both, use updatedAt to determine which is newer
                const localUpdatedAt = user.updatedAt || 0;
                const cloudUpdatedAt = existingUser.updatedAt || 0;

                if (localUpdatedAt > cloudUpdatedAt) {
                    // Local version is newer
                    userMap.set(user.id, { ...user });
                    this.logSyncEvent('debug', 'merge_local_user_newer', {
                        userId: user.id,
                        username: user.username
                    });
                } else {
                    // Cloud version is newer or same, keep cloud
                    this.logSyncEvent('debug', 'merge_cloud_user_kept', {
                        userId: existingUser.id,
                        username: existingUser.username
                    });
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
        this.logSyncEvent('debug', 'sync_to_cloud_skipped_online_only');
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
        const dataRef = this.getCollectionRefForRead(key);
        if (!dataRef) {
            this.logSyncEvent('debug', 'cloud_subscription_skipped_missing_scope', { key });
            return;
        }
        
        // Remove existing listener
        if (this.listeners[key]) {
            off(this.listeners[key].ref, 'value', this.listeners[key].callback);
        }

        // Add new listener - Online-only mode: No local persistence
        const listenerCallback = async (snapshot) => {
            const cloudData = snapshot.val();
            const normalized = this.normalizeCloudPayload(key, cloudData);
            if (normalized !== null && normalized !== undefined) {
                if (typeof DataManager !== 'undefined' && DataManager._sessionCache) {
                    DataManager._sessionCache[key] = normalized;
                }
                callback(normalized);
            }
        };

        onValue(dataRef, listenerCallback);
        this.listeners[key] = { ref: dataRef, callback: listenerCallback };
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
        if (this.listeners[key]) {
            off(this.listeners[key].ref, 'value', this.listeners[key].callback);
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
        this.logSyncEvent('debug', 'local_persistence_skipped_online_only');
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
