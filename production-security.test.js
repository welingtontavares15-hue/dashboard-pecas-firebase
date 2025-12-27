/**
 * Production Security Tests
 * Ensures that credentials and sensitive data are properly protected in production
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

// Mock sessionStorage
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

// Mock crypto
const mockCrypto = {
    subtle: {
        digest: jest.fn(async () => {
            const mockBuffer = new ArrayBuffer(32);
            const view = new Uint8Array(mockBuffer);
            for (let i = 0; i < 32; i++) {
                view[i] = i;
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

describe('Production Credential Seeding', () => {
    const configCode = fs.readFileSync(path.join(__dirname, '../js/config.js'), 'utf8');
    const utilsCode = fs.readFileSync(path.join(__dirname, '../js/utils.js'), 'utf8');

    beforeEach(() => {
        localStorageMock.clear();
        sessionStorageMock.clear();
    });

    const loadProductionConfig = () => {
        // Load config with production environment
        const factory = new Function(`${configCode}; return APP_CONFIG;`);
        return factory();
    };

    const loadDevelopmentConfig = () => {
        // Load config and override environment for testing
        const modifiedConfig = configCode.replace(
            "environment: 'production'",
            "environment: 'development'"
        );
        const factory = new Function(`${modifiedConfig}; return APP_CONFIG;`);
        return factory();
    };

    it('production config blocks default user seeding', async () => {
        const APP_CONFIG = loadProductionConfig();
        const Utils = new Function(`${utilsCode}; return Utils;`)();

        // Simulate DataManager.getDefaultUsers() check
        const allowSeedCredentials = !APP_CONFIG.isProduction();
        expect(allowSeedCredentials).toBe(false);
    });

    it('development config allows default user seeding', async () => {
        const APP_CONFIG = loadDevelopmentConfig();

        // Simulate DataManager.getDefaultUsers() check
        const allowSeedCredentials = !APP_CONFIG.isProduction();
        expect(allowSeedCredentials).toBe(true);
    });

    it('production does not expose credentials in login panel', () => {
        const APP_CONFIG = loadProductionConfig();

        // This is the check App.showLogin() uses
        const shouldShow = APP_CONFIG.shouldShowLoginCredentials();
        expect(shouldShow).toBe(false);
    });

    it('production blocks credentials even if feature flag is tampered', () => {
        const APP_CONFIG = loadProductionConfig();

        // Even with explicit override, production blocks credentials
        const shouldShow = APP_CONFIG.shouldShowLoginCredentials({
            showLoginCredentials: true
        });
        expect(shouldShow).toBe(false);
    });
});

describe('Production Environment Validation', () => {
    const configCode = fs.readFileSync(path.join(__dirname, '../js/config.js'), 'utf8');

    it('config.js defaults to production environment', () => {
        // Verify the actual file content defaults to production
        expect(configCode).toContain("environment: 'production'");
    });

    it('config.js defaults showLoginCredentials to false', () => {
        expect(configCode).toContain('showLoginCredentials: false');
    });

    it('shouldShowLoginCredentials always returns false for production', () => {
        // Parse the function and verify its logic
        expect(configCode).toContain("if (effectiveEnv === 'production')");
        expect(configCode).toContain('return false; // Always blocked in production');
    });
});
