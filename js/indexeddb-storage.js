/**
 * IndexedDB Storage Helper
 * Simple key/value store used as the primary offline cache,
 * with graceful fallback when IndexedDB is unavailable.
 */
const IndexedDBStorage = {
    dbName: 'dashboard-pecas',
    storeName: 'kv_store',
    DB_VERSION: 2,
    STORE_DEFINITIONS: {
        kv_store: {
            keyPath: 'key',
            indexes: [{ name: 'updatedAt', keyPath: 'updatedAt', options: { unique: false } }]
        },
        requests: {
            keyPath: 'numero',
            indexes: [
                { name: 'status', keyPath: 'status' },
                { name: 'createdAt', keyPath: 'createdAt' },
                { name: 'createdBy', keyPath: 'createdBy.id' },
                { name: 'supplier', keyPath: 'supplier.id' },
                { name: 'region', keyPath: 'region' }
            ]
        },
        parts: {
            keyPath: 'codigo',
            indexes: [
                { name: 'categoria', keyPath: 'categoria' },
                { name: 'descricao', keyPath: 'descricao' }
            ]
        },
        users: {
            keyPath: 'id',
            indexes: [
                { name: 'username', keyPath: 'username', options: { unique: true } },
                { name: 'role', keyPath: 'role' },
                { name: 'region', keyPath: 'region' }
            ]
        },
        suppliers: {
            keyPath: 'id',
            indexes: [
                { name: 'cnpj', keyPath: 'cnpj', options: { unique: true } },
                { name: 'status', keyPath: 'status' }
            ]
        },
        reports: {
            keyPath: 'id',
            indexes: [{ name: 'type', keyPath: 'type' }]
        },
        queue: {
            keyPath: 'id',
            indexes: [
                { name: 'status', keyPath: 'status' },
                { name: 'createdAt', keyPath: 'createdAt' }
            ]
        }
    },
    db: null,
    initialized: false,
    initializing: false,

    async init() {
        if (this.initialized) {
            return true;
        }
        if (this.initializing && this._initPromise) {
            return this._initPromise;
        }
        if (typeof indexedDB === 'undefined') {
            console.warn('IndexedDB not available; falling back to localStorage only');
            return false;
        }

        this.initializing = true;
        this._initPromise = new Promise((resolve) => {
            const request = indexedDB.open(this.dbName, this.DB_VERSION);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                Object.entries(this.STORE_DEFINITIONS).forEach(([name, def]) => {
                    const store = db.objectStoreNames.contains(name)
                        ? event.target.transaction.objectStore(name)
                        : db.createObjectStore(name, { keyPath: def.keyPath });

                    (def.indexes || []).forEach((index) => {
                        if (!store.indexNames.contains(index.name)) {
                            store.createIndex(index.name, index.keyPath, index.options || { unique: false });
                        }
                    });
                });
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                this.initialized = true;
                this.initializing = false;
                resolve(true);
            };

            request.onerror = () => {
                console.warn('IndexedDB initialization failed', request.error);
                this.initialized = false;
                this.initializing = false;
                resolve(false);
            };
        });

        return this._initPromise;
    },

    isAvailable() {
        return this.initialized && this.db;
    },

    getRequestResult(request) {
        // Only access .result if request is an IDBRequest with a valid result
        if (request && typeof request === 'object' && 'result' in request) {
            try {
                return request.result;
            } catch (e) {
                // IDBRequest.result throws InvalidStateError if accessed before completion
                // Log for debugging and return the original request to avoid breaking callers
                console.debug('IndexedDB request result not ready:', e.name || e.message);
                return undefined;
            }
        }
        return request;
    },

    async ensureInitialized() {
        if (this.initialized) {
            return true;
        }
        if (this.initializing && this._initPromise) {
            await this._initPromise;
            return this.initialized;
        }
        return this.init();
    },

    async set(key, value, metadata = {}) {
        try {
            const ok = await this.ensureInitialized();
            if (!ok) {
                return false;
            }
            return await this._tx('readwrite', (store) => {
                store.put({
                    key,
                    value,
                    updatedAt: metadata.updatedAt || Date.now()
                });
            });
        } catch (error) {
            console.warn('IndexedDB set failed for key', key, error);
            return false;
        }
    },

    async get(key) {
        try {
            const ok = await this.ensureInitialized();
            if (!ok) {
                return null;
            }
            return await this._tx('readonly', (store) => store.get(key));
        } catch (error) {
            console.warn('IndexedDB get failed for key', key, error);
            return null;
        }
    },

    async remove(key) {
        try {
            const ok = await this.ensureInitialized();
            if (!ok) {
                return false;
            }
            return await this._tx('readwrite', (store) => store.delete(key));
        } catch (error) {
            console.warn('IndexedDB delete failed for key', key, error);
            return false;
        }
    },

    async getAll(storeName) {
        try {
            const ok = await this.ensureInitialized();
            if (!ok) {
                return [];
            }
            return await this._txOnStore(storeName, 'readonly', (store) => store.getAll());
        } catch (error) {
            console.warn('IndexedDB getAll failed for store', storeName, error);
            return [];
        }
    },

    async bulkPut(storeName, records = []) {
        if (!Array.isArray(records) || !records.length) {
            return true;
        }
        try {
            const ok = await this.ensureInitialized();
            if (!ok) {
                return false;
            }
            return await this._txOnStore(storeName, 'readwrite', (store) => {
                records.forEach((record) => store.put(record));
                return true;
            });
        } catch (error) {
            console.warn('IndexedDB bulkPut failed for store', storeName, error);
            return false;
        }
    },

    async replaceStore(storeName, records = []) {
        try {
            const ok = await this.ensureInitialized();
            if (!ok) {
                return false;
            }
            return await this._txOnStore(storeName, 'readwrite', (store) => {
                store.clear();
                (records || []).forEach((record) => store.put(record));
                return true;
            });
        } catch (error) {
            console.warn('IndexedDB replaceStore failed for', storeName, error);
            return false;
        }
    },

    async _txOnStore(storeName, mode, runner) {
        return new Promise((resolve, reject) => {
            const targetStore = storeName || this.storeName;
            const tx = this.db.transaction(targetStore, mode);
            const store = tx.objectStore(targetStore);
            const request = runner(store);

            tx.oncomplete = () => resolve(this.getRequestResult(request));
            tx.onerror = () => reject(tx.error || (request && request.error));
            tx.onabort = () => reject(tx.error || new Error('IndexedDB transaction aborted'));
            if (request && request.addEventListener) {
                request.addEventListener('error', () => reject(request.error));
            }
        });
    },

    async _tx(mode, runner) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(this.storeName, mode);
            const store = tx.objectStore(this.storeName);
            const request = runner(store);

            tx.oncomplete = () => resolve(this.getRequestResult(request));
            tx.onerror = () => reject(tx.error || (request && request.error));
            tx.onabort = () => reject(tx.error || new Error('IndexedDB transaction aborted'));
            if (request && request.addEventListener) {
                request.addEventListener('error', () => reject(request.error));
            }
        });
    }
};
