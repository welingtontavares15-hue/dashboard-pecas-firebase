/**
 * Unit tests for gestor recovery password functionality
 * Tests that the gestor account password is stable and not session-dependent
 */

// Mock localStorage and sessionStorage
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

// Mock crypto
const mockCrypto = {
    subtle: {
        digest: jest.fn(async (algorithm, data) => {
            // Simulate real SHA-256 hash with a deterministic result
            const text = new TextDecoder().decode(data);
            // Create a simple deterministic hash based on the input
            const mockBuffer = new ArrayBuffer(32);
            const view = new Uint8Array(mockBuffer);
            for (let i = 0; i < 32; i++) {
                let charCode = 0;
                for (let j = 0; j < text.length; j++) {
                    charCode += text.charCodeAt(j) * (j + 1);
                }
                view[i] = (charCode + i) % 256;
            }
            return mockBuffer;
        })
    },
    getRandomValues: jest.fn((array) => {
        for (let i = 0; i < array.length; i++) {
            array[i] = Math.floor(Math.random() * 256);
        }
        return array;
    })
};
global.crypto = mockCrypto;
global.window = { crypto: mockCrypto };

// Mock navigator
Object.defineProperty(global, 'navigator', {
    value: {
        userAgent: 'test-agent',
        platform: 'test-platform',
        language: 'pt-BR'
    }
});

// Load dependencies
const fs = require('fs');
const path = require('path');

// Load Utils first
const utilsCode = fs.readFileSync(path.join(__dirname, '../js/utils.js'), 'utf8');
const loadUtils = new Function(`${utilsCode}; return Utils;`);
global.Utils = loadUtils();

// Mock APP_CONFIG for tests
global.APP_CONFIG = {
    environment: 'development',
    security: {
        bootstrap: {
            gestorPassword: 'TestGestorPassword123!'
        }
    }
};

// Mock CloudStorage
global.CloudStorage = {
    init: jest.fn(async () => true),
    saveData: jest.fn(async () => true),
    loadData: jest.fn(async () => null),
    isCloudAvailable: jest.fn(() => false),
    waitForCloudReady: jest.fn(async () => false),
    subscribe: jest.fn(), // Add subscribe mock
    syncFromCloud: jest.fn(async () => {}) // Add syncFromCloud mock
};

// Load DataManager
const dataCode = fs.readFileSync(path.join(__dirname, '../js/data.js'), 'utf8');
// Prevent auto-init by removing the init call at the end
const dataCodeWithoutAutoInit = dataCode.replace(/DataManager\.init\(\);?\s*$/, '');
const loadDataManager = new Function(`${dataCodeWithoutAutoInit}; return DataManager;`);
const DataManager = loadDataManager();

describe('Gestor Recovery Password', () => {
    beforeEach(() => {
        localStorage.clear();
        sessionStorage.clear();
        jest.clearAllMocks();
        // Reset DataManager state
        DataManager._sessionCache = {};
        DataManager.initialized = false;
    });

    describe('getGestorPassword', () => {
        it('should read password from window.DIVERSEY_BOOTSTRAP_GESTOR_PASSWORD', () => {
            global.window.DIVERSEY_BOOTSTRAP_GESTOR_PASSWORD = 'WindowPassword123!';
            const password = DataManager.getGestorPassword();
            expect(password).toBe('WindowPassword123!');
        });

        it('should read password from APP_CONFIG when window variable not set', () => {
            delete global.window.DIVERSEY_BOOTSTRAP_GESTOR_PASSWORD;
            global.APP_CONFIG.security.bootstrap.gestorPassword = 'ConfigPassword456!';
            const password = DataManager.getGestorPassword();
            expect(password).toBe('ConfigPassword456!');
        });

        it('should return fallback password when no configuration exists', () => {
            delete global.window.DIVERSEY_BOOTSTRAP_GESTOR_PASSWORD;
            delete global.APP_CONFIG.security.bootstrap.gestorPassword;
            const password = DataManager.getGestorPassword();
            expect(password).toBe('GestorRecovery2025!');
        });

        it('should return same password on multiple calls (stable)', () => {
            global.window.DIVERSEY_BOOTSTRAP_GESTOR_PASSWORD = 'StablePassword789!';
            const password1 = DataManager.getGestorPassword();
            const password2 = DataManager.getGestorPassword();
            expect(password1).toBe(password2);
        });

        it('should NOT depend on sessionStorage', () => {
            global.window.DIVERSEY_BOOTSTRAP_GESTOR_PASSWORD = 'NoSessionStorage!';
            sessionStorage.clear();
            
            const password1 = DataManager.getGestorPassword();
            
            // Clear sessionStorage (simulating new browser session)
            sessionStorage.clear();
            
            const password2 = DataManager.getGestorPassword();
            
            // Password should be the same across sessions
            expect(password1).toBe(password2);
            expect(password1).toBe('NoSessionStorage!');
        });
    });

    describe('ensureDefaultGestor', () => {
        it('should create gestor user if not exists', async () => {
            global.window.DIVERSEY_BOOTSTRAP_GESTOR_PASSWORD = 'CreateTest123!';
            DataManager._sessionCache[DataManager.KEYS.USERS] = [];
            
            await DataManager.ensureDefaultGestor();
            
            const users = DataManager._sessionCache[DataManager.KEYS.USERS];
            const gestorUser = users.find(u => DataManager.normalizeUsername(u.username) === 'gestor');
            
            expect(gestorUser).toBeDefined();
            expect(gestorUser.username).toBe('gestor');
            expect(gestorUser.role).toBe('gestor');
            expect(gestorUser.passwordHash).toBeDefined();
        });

        it('should update gestor password hash even when hash exists', async () => {
            global.window.DIVERSEY_BOOTSTRAP_GESTOR_PASSWORD = 'NewPassword123!';
            
            // Create gestor with old password hash
            const oldPasswordHash = await Utils.hashSHA256('OldPassword', `${Utils.PASSWORD_SALT}:gestor`);
            DataManager._sessionCache[DataManager.KEYS.USERS] = [{
                id: 'gestor',
                username: 'gestor',
                name: 'Gestor',
                role: 'gestor',
                passwordHash: oldPasswordHash
            }];
            
            await DataManager.ensureDefaultGestor();
            
            const users = DataManager._sessionCache[DataManager.KEYS.USERS];
            const gestorUser = users.find(u => u.username === 'gestor');
            
            // Password hash should be updated to match new password
            const expectedHash = await Utils.hashSHA256('NewPassword123!', `${Utils.PASSWORD_SALT}:gestor`);
            expect(gestorUser.passwordHash).toBe(expectedHash);
            expect(gestorUser.passwordHash).not.toBe(oldPasswordHash);
        });

        it('should persist updated gestor to cloud', async () => {
            global.window.DIVERSEY_BOOTSTRAP_GESTOR_PASSWORD = 'CloudTest123!';
            CloudStorage.saveData = jest.fn(async () => true);
            DataManager.cloudInitialized = true;
            DataManager._sessionCache[DataManager.KEYS.USERS] = [];
            
            await DataManager.ensureDefaultGestor();
            
            // Should have called _persistUsersToCloud which calls CloudStorage.saveData
            expect(CloudStorage.saveData).toHaveBeenCalled();
        });

        it('should work consistently across multiple calls', async () => {
            global.window.DIVERSEY_BOOTSTRAP_GESTOR_PASSWORD = 'ConsistentTest123!';
            DataManager._sessionCache[DataManager.KEYS.USERS] = [];
            
            await DataManager.ensureDefaultGestor();
            const users1 = DataManager._sessionCache[DataManager.KEYS.USERS];
            const hash1 = users1.find(u => u.username === 'gestor')?.passwordHash;
            
            await DataManager.ensureDefaultGestor();
            const users2 = DataManager._sessionCache[DataManager.KEYS.USERS];
            const hash2 = users2.find(u => u.username === 'gestor')?.passwordHash;
            
            // Hash should be consistent
            expect(hash1).toBe(hash2);
        });
    });
});

describe('Username Normalization', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('normalizeUsername', () => {
        it('should remove trailing dots', () => {
            const normalized = DataManager.normalizeUsername('welington.tavares.');
            expect(normalized).toBe('welington.tavares');
        });

        it('should remove leading dots', () => {
            const normalized = DataManager.normalizeUsername('.welington.tavares');
            expect(normalized).toBe('welington.tavares');
        });

        it('should collapse multiple consecutive dots', () => {
            const normalized = DataManager.normalizeUsername('user..name...test');
            expect(normalized).toBe('user.name.test');
        });

        it('should remove invalid characters', () => {
            const normalized = DataManager.normalizeUsername('user@name#test');
            expect(normalized).toBe('usernametest');
        });

        it('should convert to lowercase', () => {
            const normalized = DataManager.normalizeUsername('Welington.Tavares');
            expect(normalized).toBe('welington.tavares');
        });

        it('should remove accents', () => {
            const normalized = DataManager.normalizeUsername('José.María');
            expect(normalized).toBe('jose.maria');
        });

        it('should trim whitespace', () => {
            const normalized = DataManager.normalizeUsername('  welington.tavares  ');
            expect(normalized).toBe('welington.tavares');
        });

        it('should handle empty string', () => {
            const normalized = DataManager.normalizeUsername('');
            expect(normalized).toBe('');
        });

        it('should handle null/undefined', () => {
            const normalized1 = DataManager.normalizeUsername(null);
            const normalized2 = DataManager.normalizeUsername(undefined);
            expect(normalized1).toBe('');
            expect(normalized2).toBe('');
        });

        it('should keep valid characters (a-z, 0-9, dots)', () => {
            const normalized = DataManager.normalizeUsername('user123.name456');
            expect(normalized).toBe('user123.name456');
        });

        it('should handle complex real-world case', () => {
            const normalized = DataManager.normalizeUsername('  Welington..Tavavres.  ');
            expect(normalized).toBe('welington.tavavres');
        });
    });
});
