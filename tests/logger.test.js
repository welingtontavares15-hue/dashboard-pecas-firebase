/**
 * Logger Module Tests
 * Tests for structured logging and health panel functionality
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

// Mock navigator
Object.defineProperty(global, 'navigator', {
    value: {
        platform: 'test-platform',
        language: 'pt-BR',
        onLine: true
    },
    writable: true
});

// Suppress console output during tests
const mockConsole = {
    log: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
};
global.console = { ...console, ...mockConsole };

// Load Logger module
const loggerCode = fs.readFileSync(path.join(__dirname, '../js/logger.js'), 'utf8');
const loadLogger = () => {
    const factory = new Function(`${loggerCode}; return Logger;`);
    return factory();
};

describe('Logger Module', () => {
    let Logger;

    beforeEach(() => {
        localStorageMock.clear();
        Logger = loadLogger();
        jest.clearAllMocks();
    });

    describe('Request ID Generation', () => {
        it('generates unique request IDs', () => {
            const id1 = Logger.generateRequestId();
            const id2 = Logger.generateRequestId();
            expect(id1).not.toBe(id2);
        });

        it('request IDs have correct format', () => {
            const id = Logger.generateRequestId();
            expect(id).toMatch(/^req_[a-z0-9]+_[a-z0-9]+$/);
        });
    });

    describe('Request Context', () => {
        it('creates new request context', () => {
            const context = Logger.startRequest({ user: 'test' });
            expect(context.requestId).toBeDefined();
            expect(context.startTime).toBeDefined();
            expect(context.user).toBe('test');
        });

        it('returns existing context when not ended', () => {
            const context1 = Logger.startRequest();
            const context2 = Logger.getRequestContext();
            expect(context1.requestId).toBe(context2.requestId);
        });

        it('clears context when ended', () => {
            Logger.startRequest();
            const firstId = Logger.getRequestContext().requestId;
            Logger.endRequest();
            const secondId = Logger.getRequestContext().requestId;
            expect(firstId).not.toBe(secondId);
        });
    });

    describe('Log Entry Creation', () => {
        it('creates structured log entry with all fields', () => {
            Logger.startRequest();
            const entry = Logger.createEntry('info', 'auth', 'User logged in', { userId: '123' });

            expect(entry.id).toBeDefined();
            expect(entry.timestamp).toBeDefined();
            expect(entry.level).toBe('info');
            expect(entry.category).toBe('auth');
            expect(entry.message).toBe('User logged in');
            expect(entry.requestId).toBeDefined();
            expect(entry.duration).toBeGreaterThanOrEqual(0);
            expect(entry.data.userId).toBe('123');
            expect(entry.device).toBeDefined();
        });
    });

    describe('Logging Methods', () => {
        it('persists info log', () => {
            Logger.info('system', 'Test info message');
            const logs = Logger.getLogs();
            expect(logs.length).toBe(1);
            expect(logs[0].level).toBe('info');
            expect(logs[0].message).toBe('Test info message');
        });

        it('persists warn log', () => {
            Logger.warn('auth', 'Test warning');
            const logs = Logger.getLogs();
            expect(logs.length).toBe(1);
            expect(logs[0].level).toBe('warn');
        });

        it('persists error log', () => {
            Logger.error('sync', 'Test error');
            const logs = Logger.getLogs();
            expect(logs.length).toBe(1);
            expect(logs[0].level).toBe('error');
        });

        it('respects log limit', () => {
            const originalLimit = Logger.LOG_LIMIT;
            try {
                Logger.LOG_LIMIT = 5;
                for (let i = 0; i < 10; i++) {
                    Logger.info('test', `Message ${i}`);
                }
                const logs = Logger.getLogs();
                expect(logs.length).toBe(5);
            } finally {
                Logger.LOG_LIMIT = originalLimit;
            }
        });
    });

    describe('Domain-Specific Logging', () => {
        it('logAuth creates auth category log', () => {
            Logger.logAuth('login_success', { username: 'test' });
            const logs = Logger.getLogsByCategory('auth');
            expect(logs.length).toBe(1);
            expect(logs[0].message).toBe('login_success');
        });

        it('logAuth uses warn level for failed events', () => {
            Logger.logAuth('login_failed', { username: 'test' });
            const logs = Logger.getLogs();
            expect(logs[0].level).toBe('warn');
        });

        it('logSync creates sync category log', () => {
            Logger.logSync('sync_complete', { items: 10 });
            const logs = Logger.getLogsByCategory('sync');
            expect(logs.length).toBe(1);
        });

        it('logExport creates export category log', () => {
            Logger.logExport('export_complete', { type: 'pdf' });
            const logs = Logger.getLogsByCategory('export');
            expect(logs.length).toBe(1);
        });

        it('logApproval creates approval category log', () => {
            Logger.logApproval('approved', { requestId: 'REQ-001' });
            const logs = Logger.getLogsByCategory('approval');
            expect(logs.length).toBe(1);
        });
    });

    describe('Health Statistics', () => {
        it('updates health stats on log persist', () => {
            Logger.info('auth', 'Test');
            const stats = Logger.getHealthStats();
            expect(stats.byCategory.auth).toBeDefined();
            expect(stats.byCategory.auth.total).toBe(1);
        });

        it('tracks errors in health stats', () => {
            Logger.error('sync', 'Sync failed');
            const stats = Logger.getHealthStats();
            expect(stats.byCategory.sync.errors).toBe(1);
            expect(stats.totalErrors).toBe(1);
        });

        it('provides health summary', () => {
            Logger.info('auth', 'Login');
            Logger.error('sync', 'Error');
            Logger.warn('export', 'Warning');

            const summary = Logger.getHealthSummary();
            expect(summary.status).toBeDefined();
            expect(summary.errorsLastHour).toBeGreaterThanOrEqual(0);
            expect(summary.errorsLastDay).toBeGreaterThanOrEqual(0);
            expect(summary.categoryBreakdown).toBeDefined();
        });

        it('determines healthy status with no errors', () => {
            Logger.info('auth', 'Login');
            const summary = Logger.getHealthSummary();
            expect(summary.status).toBe('healthy');
        });
    });

    describe('Log Filtering', () => {
        beforeEach(() => {
            Logger.info('auth', 'Info 1');
            Logger.warn('sync', 'Warn 1');
            Logger.error('export', 'Error 1');
            Logger.info('auth', 'Info 2');
        });

        it('filters by category', () => {
            const authLogs = Logger.getLogsByCategory('auth');
            expect(authLogs.length).toBe(2);
        });

        it('filters by level', () => {
            const errorLogs = Logger.getLogsByLevel('error');
            expect(errorLogs.length).toBe(1);
        });

        it('filters by multiple levels', () => {
            const logs = Logger.getLogsByLevel(['error', 'warn']);
            expect(logs.length).toBe(2);
        });

        it('gets recent errors', () => {
            const errors = Logger.getRecentErrors();
            expect(errors.length).toBe(2); // error + warn
        });
    });

    describe('Log Management', () => {
        it('clears all logs', () => {
            Logger.info('test', 'Message');
            expect(Logger.getLogs().length).toBe(1);
            
            Logger.clearLogs();
            expect(Logger.getLogs().length).toBe(0);
        });

        it('clears health stats on clear', () => {
            Logger.error('test', 'Error');
            Logger.clearLogs();
            const stats = Logger.getHealthStats();
            expect(stats.totalErrors).toBe(0);
        });
    });
});
