/**
 * Unit tests for Auth module rate limiting
 * Tests the progressive lockout security feature
 */

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

// Mock crypto
const mockCrypto = {
    subtle: {
        digest: jest.fn(async (algorithm, data) => {
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

// Load Utils first (Auth depends on it)
const utilsCode = fs.readFileSync(path.join(__dirname, '../js/utils.js'), 'utf8');
const loadUtils = new Function(`${utilsCode}; return Utils;`);
global.Utils = loadUtils();

// Mock DataManager
global.DataManager = {
    getUserByUsername: jest.fn(),
    getUsers: jest.fn(() => []),
    saveData: jest.fn()
};

// Mock CloudStorage
global.CloudStorage = {
    getDeviceId: jest.fn(() => 'test-device')
};

// Load Auth module
const authCode = fs.readFileSync(path.join(__dirname, '../js/auth.js'), 'utf8');
const loadAuth = new Function(`${authCode}; return Auth;`);
const Auth = loadAuth();

describe('Auth Rate Limiting', () => {
    beforeEach(() => {
        localStorage.clear();
        // Online-only mode: Clear in-memory rate limit cache
        Auth._rateLimitCache = {};
        jest.clearAllMocks();
    });

    describe('checkRateLimit', () => {
        it('should allow login when no previous attempts', () => {
            const result = Auth.checkRateLimit('testuser');
            expect(result.allowed).toBe(true);
            expect(result.remainingMs).toBe(0);
        });

        it('should allow login when attempts are below threshold', () => {
            // Record some failed attempts but below threshold
            for (let i = 0; i < Auth.RATE_LIMIT.MAX_ATTEMPTS - 1; i++) {
                Auth.recordFailedAttempt('testuser');
            }

            const result = Auth.checkRateLimit('testuser');
            expect(result.allowed).toBe(true);
        });

        it('should block login when threshold exceeded', () => {
            // Record enough failed attempts to trigger lockout
            for (let i = 0; i < Auth.RATE_LIMIT.MAX_ATTEMPTS; i++) {
                Auth.recordFailedAttempt('testuser');
            }

            const result = Auth.checkRateLimit('testuser');
            expect(result.allowed).toBe(false);
            expect(result.remainingMs).toBeGreaterThan(0);
        });
    });

    describe('recordFailedAttempt', () => {
        it('should increment attempt count', () => {
            Auth.recordFailedAttempt('testuser');
            const attempts = Auth.getAttempts();
            expect(attempts['testuser'].count).toBe(1);

            Auth.recordFailedAttempt('testuser');
            const attempts2 = Auth.getAttempts();
            expect(attempts2['testuser'].count).toBe(2);
        });

        it('should set lockout when threshold reached', () => {
            for (let i = 0; i < Auth.RATE_LIMIT.MAX_ATTEMPTS; i++) {
                Auth.recordFailedAttempt('testuser');
            }

            const attempts = Auth.getAttempts();
            expect(attempts['testuser'].lockedUntil).toBeDefined();
            expect(attempts['testuser'].lockedUntil).toBeGreaterThan(Date.now());
        });

        it('should track lockout count for progressive lockout', () => {
            // First lockout
            for (let i = 0; i < Auth.RATE_LIMIT.MAX_ATTEMPTS; i++) {
                Auth.recordFailedAttempt('testuser');
            }

            const attempts = Auth.getAttempts();
            expect(attempts['testuser'].lockoutCount).toBe(1);
        });
    });

    describe('clearRateLimit', () => {
        it('should remove all attempts for user', () => {
            Auth.recordFailedAttempt('testuser');
            Auth.recordFailedAttempt('testuser');
            
            let attempts = Auth.getAttempts();
            expect(attempts['testuser']).toBeDefined();

            Auth.clearRateLimit('testuser');

            attempts = Auth.getAttempts();
            expect(attempts['testuser']).toBeUndefined();
        });

        it('should not affect other users', () => {
            Auth.recordFailedAttempt('user1');
            Auth.recordFailedAttempt('user2');

            Auth.clearRateLimit('user1');

            const attempts = Auth.getAttempts();
            expect(attempts['user1']).toBeUndefined();
            expect(attempts['user2']).toBeDefined();
        });
    });

    describe('progressive lockout', () => {
        it('should double lockout duration on subsequent lockouts', () => {
            const baseDuration = Auth.RATE_LIMIT.LOCKOUT_DURATION_MS;

            // First lockout
            for (let i = 0; i < Auth.RATE_LIMIT.MAX_ATTEMPTS; i++) {
                Auth.recordFailedAttempt('testuser');
            }
            const firstLockout = Auth.getAttempts()['testuser'];
            const firstDuration = firstLockout.lockedUntil - Date.now();

            // Reset count but keep lockout count (simulating expired lockout)
            const attempts = Auth.getAttempts();
            attempts['testuser'].count = 0;
            attempts['testuser'].lockedUntil = null;
            Auth.saveAttempts(attempts);

            // Second lockout
            for (let i = 0; i < Auth.RATE_LIMIT.MAX_ATTEMPTS; i++) {
                Auth.recordFailedAttempt('testuser');
            }
            const secondLockout = Auth.getAttempts()['testuser'];
            const secondDuration = secondLockout.lockedUntil - Date.now();

            // Second lockout should be approximately double the first
            expect(secondLockout.lockoutCount).toBe(2);
            expect(secondDuration).toBeGreaterThan(firstDuration * 1.5);
        });
    });

    describe('RATE_LIMIT configuration', () => {
        it('should have default configuration values', () => {
            expect(Auth.RATE_LIMIT.MAX_ATTEMPTS).toBe(5);
            expect(Auth.RATE_LIMIT.LOCKOUT_DURATION_MS).toBe(15 * 60 * 1000);
            expect(Auth.RATE_LIMIT.PROGRESSIVE_MULTIPLIER).toBe(2);
        });
    });
});
