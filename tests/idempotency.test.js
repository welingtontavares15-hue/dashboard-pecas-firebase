/**
 * Idempotency Tests
 * Tests for CloudStorage operations in online-only mode
 * Note: Offline queue functionality is disabled in online-only mode
 */

const fs = require('fs');
const path = require('path');

// Mock localStorage
const localStorageMock = (() => {
    let store = {};
    return {
        getItem: (key) => store[key] || null,
        setItem: (key, value) => { store[key] = String(value); },
        removeItem: (key) => { delete store[key]; },
        clear: () => { store = {}; }
    };
})();
Object.defineProperty(global, 'localStorage', { value: localStorageMock });

// Mock sessionStorage for online-only mode
const sessionStorageMock = (() => {
    let store = {};
    return {
        getItem: (key) => store[key] || null,
        setItem: (key, value) => { store[key] = String(value); },
        removeItem: (key) => { delete store[key]; },
        clear: () => { store = {}; }
    };
})();
Object.defineProperty(global, 'sessionStorage', { value: sessionStorageMock });

// Mock IndexedDB (not available in Node.js)
global.indexedDB = undefined;

// Mock crypto
const mockCrypto = {
    randomUUID: jest.fn(() => 'test-uuid-' + Math.random().toString(36).substring(2)),
    getRandomValues: jest.fn((array) => {
        for (let i = 0; i < array.length; i++) {
            array[i] = Math.floor(Math.random() * 256);
        }
        return array;
    })
};
global.crypto = mockCrypto;
global.window = { crypto: mockCrypto };

// Load Utils first
const utilsCode = fs.readFileSync(path.join(__dirname, '../js/utils.js'), 'utf8');
const loadUtils = new Function(`${utilsCode}; return Utils;`);
global.Utils = loadUtils();

// Load CloudStorage
const storageCode = fs.readFileSync(path.join(__dirname, '../js/storage.js'), 'utf8');

describe('CloudStorage Online-Only Mode', () => {
    let CloudStorage;

    beforeEach(() => {
        localStorageMock.clear();
        sessionStorageMock.clear();
        // Create a fresh CloudStorage instance
        const factory = new Function(`
            ${storageCode}
            return CloudStorage;
        `);
        CloudStorage = factory();
        // Set as not initialized for testing
        CloudStorage.isInitialized = false;
        CloudStorage.isConnected = false;
    });

    describe('Operation ID Generation', () => {
        it('generates unique operation IDs', () => {
            const opId1 = CloudStorage.generateOpId('test_key');
            const opId2 = CloudStorage.generateOpId('test_key');
            expect(opId1).not.toBe(opId2);
        });

        it('includes key in operation ID', () => {
            const opId = CloudStorage.generateOpId('my_special_key');
            expect(opId).toContain('my_special_key');
        });

        it('has op: prefix in operation ID format', () => {
            const opId = CloudStorage.generateOpId('test_key');
            expect(opId).toMatch(/^op:/);
        });
    });

    describe('Offline Queue Disabled (Online-Only Mode)', () => {
        it('enqueueOperation is disabled in online-only mode', async () => {
            // In online-only mode, enqueue should be a no-op
            await CloudStorage.enqueueOperation('test_key', { value: 1 }, new Error('offline'), 'op:test');
            const queue = await CloudStorage.loadQueue();
            // Queue should always be empty in online-only mode
            expect(queue.length).toBe(0);
        });

        it('loadQueue always returns empty array in online-only mode', async () => {
            const queue = await CloudStorage.loadQueue();
            expect(Array.isArray(queue)).toBe(true);
            expect(queue.length).toBe(0);
        });

        it('flushQueue always returns true in online-only mode', async () => {
            const result = await CloudStorage.flushQueue();
            expect(result).toBe(true);
        });
    });

    describe('Device ID (Session-Scoped)', () => {
        it('generates device ID on first access', () => {
            sessionStorageMock.clear();
            const deviceId = CloudStorage.getDeviceId();
            expect(deviceId).toMatch(/^device_/);
        });

        it('persists device ID across calls within session', () => {
            sessionStorageMock.clear();
            const id1 = CloudStorage.getDeviceId();
            const id2 = CloudStorage.getDeviceId();
            expect(id1).toBe(id2);
        });

        it('stores device ID in sessionStorage (not localStorage)', () => {
            sessionStorageMock.clear();
            const deviceId = CloudStorage.getDeviceId();
            const storedInSession = sessionStorage.getItem('diversey_device_id');
            const storedInLocal = localStorage.getItem('diversey_device_id');
            expect(storedInSession).toBe(deviceId);
            // localStorage should not be used for device ID in online-only mode
            expect(storedInLocal).toBeNull();
        });
    });

    describe('Save Operations (Online-Only)', () => {
        it('returns false when cloud is not connected', async () => {
            CloudStorage.isInitialized = false;
            CloudStorage.isConnected = false;
            const result = await CloudStorage.saveData('test_key', { value: 'test' });
            expect(result).toBe(false);
        });

        it('does not persist data locally when cloud unavailable', async () => {
            await CloudStorage.saveData('test_key', { value: 'test' });
            const stored = localStorage.getItem('test_key');
            expect(stored).toBeNull();
        });
    });

    describe('Local Persistence Disabled', () => {
        it('persistLocally is a no-op in online-only mode', async () => {
            const result = await CloudStorage.persistLocally('test_key', { data: 'test' });
            // Should return true (success) but not actually persist
            expect(result).toBe(true);
            expect(localStorage.getItem('test_key')).toBeNull();
        });

        it('isIndexedDBAvailable returns false in online-only mode', () => {
            expect(CloudStorage.isIndexedDBAvailable()).toBe(false);
        });
    });
});
