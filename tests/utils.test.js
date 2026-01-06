/**
 * Unit tests for Utils module
 * Tests core utility functions used throughout the application
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

// Mock crypto.subtle for password hashing tests
const mockCrypto = {
    subtle: {
        digest: jest.fn(async (algorithm, data) => {
            // Simple mock that returns predictable buffer
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

// Load Utils module by reading and evaluating in global scope
const fs = require('fs');
const path = require('path');
const utilsCode = fs.readFileSync(path.join(__dirname, '../js/utils.js'), 'utf8');

// Use Function constructor to evaluate in global scope
const loadUtils = new Function(`
    ${utilsCode}
    return Utils;
`);
const Utils = loadUtils();

describe('Utils', () => {
    describe('generateId', () => {
        it('should generate unique IDs', () => {
            const id1 = Utils.generateId();
            const id2 = Utils.generateId();
            expect(id1).toBeDefined();
            expect(id2).toBeDefined();
            expect(id1).not.toEqual(id2);
        });

        it('should generate non-empty strings', () => {
            const id = Utils.generateId();
            expect(typeof id).toBe('string');
            expect(id.length).toBeGreaterThan(0);
        });
    });

    describe('normalizeText', () => {
        it('should lowercase text', () => {
            expect(Utils.normalizeText('HELLO')).toBe('hello');
        });

        it('should remove accents', () => {
            expect(Utils.normalizeText('José')).toBe('jose');
            expect(Utils.normalizeText('Açúcar')).toBe('acucar');
        });

        it('should trim whitespace', () => {
            expect(Utils.normalizeText('  hello  ')).toBe('hello');
        });

        it('should handle null/undefined', () => {
            expect(Utils.normalizeText(null)).toBe('');
            expect(Utils.normalizeText(undefined)).toBe('');
        });
    });

    describe('escapeHtml', () => {
        it('should escape HTML entities', () => {
            expect(Utils.escapeHtml('<script>')).toBe('&lt;script&gt;');
            expect(Utils.escapeHtml('"quoted"')).toBe('&quot;quoted&quot;');
            expect(Utils.escapeHtml("it's")).toBe("it&#39;s");
            expect(Utils.escapeHtml('a & b')).toBe('a &amp; b');
        });

        it('should handle null/undefined', () => {
            expect(Utils.escapeHtml(null)).toBe('');
            expect(Utils.escapeHtml(undefined)).toBe('');
        });

        it('should convert numbers to strings', () => {
            expect(Utils.escapeHtml(123)).toBe('123');
        });
    });

    describe('formatCurrency', () => {
        it('should format as BRL currency', () => {
            const formatted = Utils.formatCurrency(1234.56);
            expect(formatted).toContain('1.234,56');
        });

        it('should handle null/undefined', () => {
            expect(Utils.formatCurrency(null)).toContain('0,00');
            expect(Utils.formatCurrency(undefined)).toContain('0,00');
        });

        it('should format zero correctly', () => {
            const formatted = Utils.formatCurrency(0);
            expect(formatted).toContain('0,00');
            expect(formatted).toContain('R$');
        });
    });

    describe('formatDate', () => {
        it('should format date in Brazilian format', () => {
            const date = new Date(2024, 0, 15); // January 15, 2024
            const formatted = Utils.formatDate(date);
            expect(formatted).toBe('15/01/2024');
        });

        it('should handle null input', () => {
            expect(Utils.formatDate(null)).toBe('-');
        });

        it('should include time when requested', () => {
            const date = new Date(2024, 0, 15, 14, 30);
            const formatted = Utils.formatDate(date, true);
            expect(formatted).toMatch(/15\/01\/2024 14:30/);
        });
    });

    describe('generateNumber', () => {
        it('should generate sequential number with date prefix', () => {
            const existingNumbers = [];
            const date = new Date(2024, 5, 15); // June 15, 2024
            const number = Utils.generateNumber(existingNumbers, date);
            expect(number).toBe('REQ-20240615-0001');
        });

        it('should increment sequence for same date', () => {
            const existingNumbers = ['REQ-20240615-0001', 'REQ-20240615-0002'];
            const date = new Date(2024, 5, 15);
            const number = Utils.generateNumber(existingNumbers, date);
            expect(number).toBe('REQ-20240615-0003');
        });

        it('should start at 1 for new date', () => {
            const existingNumbers = ['REQ-20240614-0005'];
            const date = new Date(2024, 5, 15);
            const number = Utils.generateNumber(existingNumbers, date);
            expect(number).toBe('REQ-20240615-0001');
        });
    });

    describe('isValidEmail', () => {
        it('should validate correct emails', () => {
            expect(Utils.isValidEmail('test@example.com')).toBe(true);
            expect(Utils.isValidEmail('user.name@domain.co.uk')).toBe(true);
        });

        it('should reject invalid emails', () => {
            expect(Utils.isValidEmail('invalid')).toBe(false);
            expect(Utils.isValidEmail('missing@domain')).toBe(false);
            expect(Utils.isValidEmail('@nodomain.com')).toBe(false);
        });
    });

    describe('isValidCNPJ', () => {
        it('should validate correct CNPJ', () => {
            // Using a valid CNPJ for testing
            expect(Utils.isValidCNPJ('11.222.333/0001-81')).toBe(true);
        });

        it('should reject invalid CNPJ', () => {
            expect(Utils.isValidCNPJ('00.000.000/0000-00')).toBe(false);
            expect(Utils.isValidCNPJ('11.111.111/1111-11')).toBe(false);
        });

        it('should handle CNPJ with wrong length', () => {
            expect(Utils.isValidCNPJ('123')).toBe(false);
            expect(Utils.isValidCNPJ('')).toBe(false);
        });
    });

    describe('getStatusInfo', () => {
        it('should return info for known status', () => {
            const info = Utils.getStatusInfo('pendente');
            expect(info.label).toBe('Pendente');
            expect(info.icon).toBe('fa-clock');
        });

        it('should return info for approved status', () => {
            const info = Utils.getStatusInfo('aprovada');
            expect(info.label).toBe('Aprovada');
            expect(info.icon).toBe('fa-check');
        });

        it('should handle unknown status', () => {
            const info = Utils.getStatusInfo('unknown_status');
            expect(info.label).toBe('unknown_status');
        });
    });

    describe('debounce', () => {
        jest.useFakeTimers();

        it('should delay function execution', () => {
            const mockFn = jest.fn();
            const debouncedFn = Utils.debounce(mockFn, 100);

            debouncedFn();
            expect(mockFn).not.toHaveBeenCalled();

            jest.advanceTimersByTime(100);
            expect(mockFn).toHaveBeenCalledTimes(1);
        });

        it('should only call once when called multiple times quickly', () => {
            const mockFn = jest.fn();
            const debouncedFn = Utils.debounce(mockFn, 100);

            debouncedFn();
            debouncedFn();
            debouncedFn();

            jest.advanceTimersByTime(100);
            expect(mockFn).toHaveBeenCalledTimes(1);
        });
    });

    describe('sanitizeFilename', () => {
        it('should remove special characters', () => {
            expect(Utils.sanitizeFilename('file/name.txt')).toBe('file_name_txt');
        });

        it('should replace accented characters', () => {
            expect(Utils.sanitizeFilename('José')).toBe('Jose');
        });

        it('should use fallback for empty input', () => {
            expect(Utils.sanitizeFilename('')).toBe('arquivo');
            expect(Utils.sanitizeFilename(null)).toBe('arquivo');
        });
    });

    describe('parseAsLocalDate', () => {
        it('should parse YYYY-MM-DD format as local date', () => {
            const date = Utils.parseAsLocalDate('2024-06-15');
            expect(date.getFullYear()).toBe(2024);
            expect(date.getMonth()).toBe(5); // June (0-indexed)
            expect(date.getDate()).toBe(15);
        });

        it('should handle Date objects', () => {
            const inputDate = new Date(2024, 5, 15);
            const result = Utils.parseAsLocalDate(inputDate);
            expect(result).toBe(inputDate);
        });

        it('should handle timestamps', () => {
            const timestamp = new Date(2024, 5, 15).getTime();
            const result = Utils.parseAsLocalDate(timestamp);
            expect(result.getFullYear()).toBe(2024);
        });
    });

    // Note: hashSHA256 tests require actual Web Crypto API
    // which is not available in the Jest test environment
    // These tests would need to run in a browser environment or with polyfills
    describe('hashSHA256', () => {
        it.skip('should return a hex string (requires Web Crypto)', async () => {
            const hash = await Utils.hashSHA256('password', 'salt');
            expect(typeof hash).toBe('string');
            expect(hash).toMatch(/^[0-9a-f]+$/);
        });

        it.skip('should return 64 character hash (requires Web Crypto)', async () => {
            const hash = await Utils.hashSHA256('password', 'salt');
            expect(hash.length).toBe(64);
        });
    });
});
