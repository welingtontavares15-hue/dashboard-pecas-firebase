const fs = require('fs');
const path = require('path');

describe('APP_CONFIG credential gating', () => {
    const configCode = fs.readFileSync(path.join(__dirname, '../js/config.js'), 'utf8');
    const loadConfig = () => {
        const factory = new Function(`${configCode}; return APP_CONFIG;`);
        return factory();
    };

    it('blocks credential display in production even when explicitly enabled', () => {
        const config = loadConfig();
        expect(config.shouldShowLoginCredentials({
            environment: 'production',
            showLoginCredentials: true
        })).toBe(false);
    });

    it('allows credential display only in non-production when enabled', () => {
        const config = loadConfig();
        expect(config.shouldShowLoginCredentials({
            environment: 'development',
            showLoginCredentials: true
        })).toBe(true);
    });

    it('blocks credential display in staging when flag is false', () => {
        const config = loadConfig();
        expect(config.shouldShowLoginCredentials({
            environment: 'staging',
            showLoginCredentials: false
        })).toBe(false);
    });

    it('allows credential display in staging when flag is true', () => {
        const config = loadConfig();
        expect(config.shouldShowLoginCredentials({
            environment: 'staging',
            showLoginCredentials: true
        })).toBe(true);
    });

    it('defaults environment to production for maximum security', () => {
        const config = loadConfig();
        expect(config.environment).toBe('production');
    });

    it('defaults showLoginCredentials feature flag to false', () => {
        const config = loadConfig();
        expect(config.features.showLoginCredentials).toBe(false);
    });

    it('isProduction returns true when environment is production', () => {
        const config = loadConfig();
        expect(config.isProduction()).toBe(true);
    });
});

describe('APP_CONFIG security immutability', () => {
    const configCode = fs.readFileSync(path.join(__dirname, '../js/config.js'), 'utf8');
    const loadConfig = () => {
        const factory = new Function(`${configCode}; return APP_CONFIG;`);
        return factory();
    };

    it('config object is frozen and cannot be modified', () => {
        const config = loadConfig();
        expect(Object.isFrozen(config)).toBe(true);
    });

    it('features object is frozen and cannot be modified', () => {
        const config = loadConfig();
        expect(Object.isFrozen(config.features)).toBe(true);
    });

    it('attempting to modify environment throws in strict mode', () => {
        const config = loadConfig();
        expect(() => {
            'use strict';
            config.environment = 'development';
        }).toThrow();
    });
});
