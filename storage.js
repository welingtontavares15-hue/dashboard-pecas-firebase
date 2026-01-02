/**
 * Cloud Storage Module (Firestore)
 * Synchronizes application state across devices using Firebase Firestore,
 * with IndexedDB/localStorage fallback and an offline write queue.
 *
 * Collection: data/{key}
 * Document shape:
 *  - data: any (JSON-serializable)
 *  - updatedAt: number (Date.now())
 *  - updatedBy: string (deviceId)
 *  - opId: string (random)
 */

const CloudStorage = {
    isInitialized: false,
    isInitializing: false,
    cloudReady: false,
    firestore: null,

    listeners: {}, // key -> unsubscribe

    maxRetries: 3,
    retryDelay: 1000,
    queueLocalKey: 'cloud_sync_queue_v2',

    async init() {
        if (this.isInitialized) return true;
        if (this.isInitializing) return false;

        this.isInitializing = true;
        try {
            // Ensure offline cache is ready
            if (typeof IndexedDBStorage !== 'undefined') {
                await IndexedDBStorage.init();
            }

            // Initialize Firebase (anonymous auth handled inside FirebaseInit)
            if (typeof FirebaseInit === 'undefined') {
                console.warn('FirebaseInit not available');
                this.isInitializing = false;
                return false;
            }

            const ok = await FirebaseInit.init();
            if (!ok) {
                console.warn('FirebaseInit.init() failed; running in offline-only mode');
                this.isInitializing = false;
                this.isInitialized = true;
                this.cloudReady = false;
                return false;
            }

            this.firestore = FirebaseInit.firestore;

            // Enable Firestore offline persistence (best-effort; may fail in some browsers / multi-tab)
            try {
                const { enableIndexedDbPersistence } = window.firebaseModules || {};
                if (enableIndexedDbPersistence && this.firestore) {
                    await enableIndexedDbPersistence(this.firestore);
                }
            } catch (e) {
                // It's OK if this fails (e.g., multiple tabs)
                console.debug('Firestore persistence not enabled:', e?.message || e);
            }

            this.isInitialized = true;
            this.cloudReady = true;

            // Process any queued writes on startup
            await this.processQueue();

            // Re-process when coming back online
            if (typeof window !== 'undefined') {
                window.addEventListener('online', () => this.processQueue());
            }

            return true;
        } catch (err) {
            console.error('CloudStorage.init error:', err);
            this.isInitialized = true;
            this.cloudReady = false;
            return false;
        } finally {
            this.isInitializing = false;
        }
    },

    isCloudAvailable() {
        return !!(this.cloudReady && FirebaseInit && FirebaseInit.isInitialized && FirebaseInit.isAuthenticated && this.firestore);
    },

    async waitForCloudReady(timeoutMs = 8000) {
        const start = Date.now();
        while (!this.isCloudAvailable()) {
            if (Date.now() - start > timeoutMs) return false;
            await new Promise(r => setTimeout(r, 100));
        }
        return true;
    },

    async getDeviceId() {
        const key = 'device_id';
        try {
            const cached = (typeof localStorage !== 'undefined') ? localStorage.getItem(key) : null;
            if (cached) return cached;
        } catch (_) {}

        let id = null;
        try {
            if (typeof IndexedDBStorage !== 'undefined') {
                id = await IndexedDBStorage.get(key);
            }
        } catch (_) {}

        if (!id) {
            id = 'dev_' + Math.random().toString(36).slice(2) + '_' + Date.now().toString(36);
        }

        try {
            if (typeof localStorage !== 'undefined') localStorage.setItem(key, id);
        } catch (_) {}

        try {
            if (typeof IndexedDBStorage !== 'undefined') await IndexedDBStorage.set(key, id);
        } catch (_) {}

        return id;
    },

    _queueRead() {
        try {
            const raw = (typeof localStorage !== 'undefined') ? localStorage.getItem(this.queueLocalKey) : null;
            return raw ? JSON.parse(raw) : [];
        } catch (_) {
            return [];
        }
    },

    _queueWrite(queue) {
        try {
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem(this.queueLocalKey, JSON.stringify(queue || []));
            }
        } catch (_) {}
    },

    _queuePush(op) {
        const q = this._queueRead();
        q.push(op);
        this._queueWrite(q);
    },

    async processQueue() {
        if (!this.isCloudAvailable()) return false;

        const q = this._queueRead();
        if (!q.length) return true;

        const remaining = [];
        for (const op of q) {
            try {
                const ok = await this._applyOp(op);
                if (!ok) remaining.push(op);
            } catch (e) {
                remaining.push(op);
            }
        }
        this._queueWrite(remaining);
        return remaining.length === 0;
    },

    async _applyOp(op) {
        const { key, data, meta } = op || {};
        if (!key) return true;

        const { doc, setDoc } = window.firebaseModules || {};
        if (!doc || !setDoc) return false;

        const deviceId = await this.getDeviceId();
        const payload = {
            data: data ?? null,
            updatedAt: Date.now(),
            updatedBy: meta?.updatedBy || deviceId,
            opId: meta?.opId || ('op_' + Math.random().toString(36).slice(2))
        };

        try {
            await setDoc(doc(this.firestore, 'data', key), payload, { merge: true });
            return true;
        } catch (e) {
            console.warn('Queue write failed:', key, e?.message || e);
            return false;
        }
    },

    async loadData(key, fallback = null) {
        // First try IndexedDB cache for speed/offline
        try {
            if (typeof IndexedDBStorage !== 'undefined') {
                const cached = await IndexedDBStorage.get('data:' + key);
                if (cached !== undefined && cached !== null) return cached;
            }
        } catch (_) {}

        if (!this.isCloudAvailable()) return fallback;

        const { doc, getDoc } = window.firebaseModules || {};
        if (!doc || !getDoc) return fallback;

        try {
            const snap = await getDoc(doc(this.firestore, 'data', key));
            if (!snap.exists()) return fallback;
            const payload = snap.data();
            const value = payload?.data ?? fallback;

            // Cache it
            try {
                if (typeof IndexedDBStorage !== 'undefined') {
                    await IndexedDBStorage.set('data:' + key, value);
                }
            } catch (_) {}

            return value;
        } catch (e) {
            console.warn('CloudStorage.loadData failed:', key, e?.message || e);
            return fallback;
        }
    },

    async saveData(key, data, meta = {}) {
        // Always cache locally first
        try {
            if (typeof IndexedDBStorage !== 'undefined') {
                await IndexedDBStorage.set('data:' + key, data);
            } else if (typeof localStorage !== 'undefined') {
                localStorage.setItem('data:' + key, JSON.stringify(data));
            }
        } catch (_) {}

        if (!this.isCloudAvailable()) {
            // queue offline
            this._queuePush({ key, data, meta: { ...meta, queuedAt: Date.now() } });
            return { success: false, queued: true };
        }

        const { doc, setDoc } = window.firebaseModules || {};
        if (!doc || !setDoc) {
            this._queuePush({ key, data, meta: { ...meta, queuedAt: Date.now() } });
            return { success: false, queued: true };
        }

        const deviceId = await this.getDeviceId();
        const payload = {
            data: data ?? null,
            updatedAt: Date.now(),
            updatedBy: meta.updatedBy || deviceId,
            opId: meta.opId || ('op_' + Math.random().toString(36).slice(2))
        };

        try {
            await setDoc(doc(this.firestore, 'data', key), payload, { merge: true });
            return { success: true };
        } catch (e) {
            console.warn('CloudStorage.saveData failed, queued:', key, e?.message || e);
            this._queuePush({ key, data, meta: { ...meta, queuedAt: Date.now() } });
            return { success: false, queued: true, error: e?.message || String(e) };
        }
    },

    subscribe(key, callback) {
        if (!key || typeof callback !== 'function') return false;
        if (!this.isCloudAvailable()) return false;

        const { doc, onSnapshot } = window.firebaseModules || {};
        if (!doc || !onSnapshot) return false;

        // Remove existing
        if (this.listeners[key]) {
            try { this.listeners[key](); } catch (_) {}
            delete this.listeners[key];
        }

        const unsub = onSnapshot(doc(this.firestore, 'data', key), async (snap) => {
            if (!snap.exists()) return;
            const payload = snap.data() || {};
            const value = payload.data;

            // Update local cache
            try {
                if (typeof IndexedDBStorage !== 'undefined') {
                    await IndexedDBStorage.set('data:' + key, value);
                }
            } catch (_) {}

            try { callback(value, payload); } catch (e) { console.warn(e); }
        }, (err) => {
            console.warn('CloudStorage.subscribe error:', key, err?.message || err);
        });

        this.listeners[key] = unsub;
        return true;
    },

    async syncFromCloud(key) {
        return this.loadData(key, null);
    }
};

window.CloudStorage = CloudStorage;
