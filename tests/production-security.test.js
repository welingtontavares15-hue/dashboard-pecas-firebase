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
    const dataCode = fs.readFileSync(path.join(__dirname, '../js/data.js'), 'utf8');

    beforeEach(() => {
        localStorageMock.clear();
        sessionStorageMock.clear();
    });

    const loadProductionConfig = () => {
        const factory = new Function(`${configCode}; return APP_CONFIG;`);
        return factory();
    };

    const loadDevelopmentConfig = () => {
        const modifiedConfig = configCode.replace(
            "environment: 'production'",
            "environment: 'development'"
        );
        const factory = new Function(`${modifiedConfig}; return APP_CONFIG;`);
        return factory();
    };

    it('production config blocks bootstrap user seeding by default', () => {
        const APP_CONFIG = loadProductionConfig();

        expect(APP_CONFIG.isProduction()).toBe(true);
        expect(dataCode).toContain('isBootstrapUserProvisioningEnabled()');
        expect(dataCode).toContain("if (typeof APP_CONFIG.isProduction === 'function' && APP_CONFIG.isProduction()) {");
        expect(dataCode).toContain("return typeof window !== 'undefined' && window.__ENABLE_USER_BOOTSTRAP === true;");
        expect(dataCode).toContain('if (!this.isBootstrapUserProvisioningEnabled()) {');
        expect(dataCode).toContain('return [];');
    });

    it('development config keeps controlled bootstrap available', () => {
        const APP_CONFIG = loadDevelopmentConfig();

        expect(APP_CONFIG.isProduction()).toBe(false);
        expect(dataCode).toContain('return true;');
    });

    it('production does not expose credentials in login panel', () => {
        const APP_CONFIG = loadProductionConfig();

        expect(APP_CONFIG.shouldShowLoginCredentials()).toBe(false);
    });

    it('production blocks credentials even if feature flag is tampered', () => {
        const APP_CONFIG = loadProductionConfig();

        expect(APP_CONFIG.shouldShowLoginCredentials({
            showLoginCredentials: true
        })).toBe(false);
    });
});

describe('Production Environment Validation', () => {
    const configCode = fs.readFileSync(path.join(__dirname, '../js/config.js'), 'utf8');
    const dataCode = fs.readFileSync(path.join(__dirname, '../js/data.js'), 'utf8');

    it('config.js defaults to production environment', () => {
        expect(configCode).toContain("environment: 'production'");
    });

    it('config.js defaults showLoginCredentials to false', () => {
        expect(configCode).toContain('showLoginCredentials: false');
    });

    it('shouldShowLoginCredentials always returns false for production', () => {
        expect(configCode).toContain("if (effectiveEnv === 'production')");
        expect(configCode).toContain('return false; // Always blocked in production');
    });

    it('getDefaultUsers exits early when bootstrap is disabled', () => {
        expect(dataCode).toContain('if (!this.isBootstrapUserProvisioningEnabled()) {');
        expect(dataCode).toContain('return [];');
    });
});
