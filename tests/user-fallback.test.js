/**
 * Fallback user seeding when cloud is unavailable
 * Ensures Admin, Gestor, and Technician accounts remain accessible locally
 */

const fs = require('fs');
const path = require('path');

// Mock storages
const localStorageMock = (() => {
    let store = {};
    return {
        getItem: (key) => store[key] || null,
        setItem: (key, value) => { store[key] = String(value); },
        removeItem: (key) => { delete store[key]; },
        clear: () => { store = {}; }
    };
})();

const sessionStorageMock = (() => {
    let store = {};
    return {
        getItem: (key) => store[key] || null,
        setItem: (key, value) => { store[key] = String(value); },
        removeItem: (key) => { delete store[key]; },
        clear: () => { store = {}; }
    };
})();

Object.defineProperty(global, 'localStorage', { value: localStorageMock });
Object.defineProperty(global, 'sessionStorage', { value: sessionStorageMock });

// Mock crypto for hashing
const mockCrypto = {
    subtle: {
        digest: jest.fn(async () => {
            const buffer = new ArrayBuffer(32);
            const view = new Uint8Array(buffer);
            for (let i = 0; i < view.length; i++) {
                view[i] = i;
            }
            return buffer;
        })
    },
    getRandomValues: jest.fn((array) => {
        for (let i = 0; i < array.length; i++) {
            array[i] = i;
        }
        return array;
    })
};

global.crypto = mockCrypto;

// Minimal window/navigator mocks used by DataManager
global.window = {
    crypto: mockCrypto,
    addEventListener: jest.fn(),
    navigator: { onLine: true }
};
global.navigator = { onLine: true };

const utilsCode = fs.readFileSync(path.join(__dirname, '../js/utils.js'), 'utf8');
const dataCode = fs.readFileSync(path.join(__dirname, '../js/data.js'), 'utf8');

// Factory to create a fresh DataManager instance
const createDataManager = () => {
    const loadUtils = new Function(`${utilsCode}; return Utils;`);
    const Utils = loadUtils();
    Utils.hashSHA256 = jest.fn(async (value, salt = '') => {
        const input = `${value ?? ''}:${salt ?? ''}`;
        return Buffer.from(input).toString('hex').slice(0, 64) || 'hash';
    });
    const factory = new Function('Utils', `
        ${dataCode}
        return DataManager;
    `);
    return factory(Utils);
};

describe('Fallback seeding without cloud', () => {
    let DataManager;

    beforeEach(async () => {
        localStorageMock.clear();
        sessionStorageMock.clear();
        mockCrypto.subtle.digest.mockClear();
        // Simulate offline/without Firebase
        global.CloudStorage = undefined;
        global.FirebaseInit = undefined;

        DataManager = createDataManager();
        // reset init flags to force init within tests
        DataManager.initialized = false;
        DataManager.initializing = false;
        DataManager.initPromise = null;
        DataManager._sessionCache = {};
        await DataManager.init();
    });

    it('keeps Admin and Gestor accounts available without CloudStorage', async () => {
        const admin = DataManager.getUserByUsername('admin');
        const gestor = DataManager.getUserByUsername('gestor');

        expect(admin?.role).toBe('administrador');
        expect(gestor?.role).toBe('gestor');
    });

    it('seeds technician accounts locally for login', () => {
        const technicians = DataManager.getTechnicians();
        expect(Array.isArray(technicians)).toBe(true);
        expect(technicians.length).toBeGreaterThan(0);

        const techUser = DataManager.getUserByUsername(technicians[0].username);
        expect(techUser?.role).toBe('tecnico');
    });
});
