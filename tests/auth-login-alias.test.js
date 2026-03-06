/**
 * Auth login compatibility tests
 * Ensures default admin accepts documented password alias
 */

const fs = require('fs');
const path = require('path');

const createStorageMock = () => {
    let store = {};
    return {
        getItem: (key) => store[key] || null,
        setItem: (key, value) => { store[key] = String(value); },
        removeItem: (key) => { delete store[key]; },
        clear: () => { store = {}; }
    };
};

describe('Auth login aliases', () => {
    let Auth;
    let adminUser;

    beforeEach(async () => {
        const sessionStorageMock = createStorageMock();
        const localStorageMock = createStorageMock();
        Object.defineProperty(global, 'sessionStorage', { value: sessionStorageMock, configurable: true });
        Object.defineProperty(global, 'localStorage', { value: localStorageMock, configurable: true });

        global.navigator = { userAgent: 'test-agent', platform: 'test-platform', language: 'pt-BR' };
        global.window = { };

        const utilsCode = fs.readFileSync(path.join(__dirname, '../js/utils.js'), 'utf8');
        const loadUtils = new Function(`${utilsCode}; return Utils;`);
        global.Utils = loadUtils();
        Utils.hashSHA256 = jest.fn(async (value, salt = '') => `${value}|${salt}`);

        const canonicalUsername = 'admin';
        const storedHash = await Utils.hashSHA256('admin', `${Utils.PASSWORD_SALT}:${canonicalUsername}`);
        adminUser = { id: 'admin', username: 'admin', role: 'administrador', passwordHash: storedHash, email: 'admin@example.com' };

        global.DataManager = {
            getUserByUsername: jest.fn(() => adminUser),
            getUsers: jest.fn(() => [adminUser]),
            saveData: jest.fn(),
            normalizeUsername: (u) => Utils.normalizeText(u),
            syncUsersFromCloud: jest.fn(),
            isCloudAvailable: jest.fn(() => false),
            KEYS: { USERS: 'users' }
        };

        global.CloudStorage = { getDeviceId: jest.fn(() => 'device') };
        global.Logger = { logAuth: jest.fn() };

        const authCode = fs.readFileSync(path.join(__dirname, '../js/auth.js'), 'utf8');
        const loadAuth = new Function(`${authCode}; return Auth;`);
        Auth = loadAuth();
        Auth._rateLimitCache = {};
    });

    it('allows admin login when the user enters the alias \"adim\" password', async () => {
        const result = await Auth.login('admin', 'adim');
        expect(result.success).toBe(true);
        expect(result.user?.username).toBe('admin');
        expect(result.user?.role).toBe('administrador');
    });
});
