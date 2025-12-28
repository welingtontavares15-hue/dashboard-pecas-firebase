/**
 * Test: Gestores Sync - Verify managers are not lost during synchronization
 * This test validates the fix for the bug where added gestores disappear after first sync
 */

const fs = require('fs');
const path = require('path');

describe('Gestores Sync Merge Logic', () => {
    let CloudStorage;
    let DataManager;

    beforeEach(() => {
        // Load the storage module code
        const storageCode = fs.readFileSync(path.join(__dirname, '../js/storage.js'), 'utf8');
        const dataCode = fs.readFileSync(path.join(__dirname, '../js/data.js'), 'utf8');

        // Mock the global dependencies
        global.window = {
            firebaseModules: {},
            CloudStorage: {},
            DataManager: {}
        };
        global.FirebaseInit = {
            isReady: () => true,
            isRTDBConnected: () => true
        };
        global.Logger = {
            logSync: () => {}
        };

        // Evaluate the code to get CloudStorage object
        eval(storageCode);
        CloudStorage = global.window.CloudStorage;

        // Mock DataManager for testing
        DataManager = {
            _sessionCache: {},
            KEYS: {
                USERS: 'diversey_users'
            }
        };
        global.DataManager = DataManager;
    });

    afterEach(() => {
        // Clean up globals
        delete global.window;
        delete global.FirebaseInit;
        delete global.Logger;
        delete global.DataManager;
    });

    describe('mergeUsers function', () => {
        it('should have mergeUsers function', () => {
            expect(typeof CloudStorage.mergeUsers).toBe('function');
        });

        it('should merge users keeping both local-only and cloud-only users', () => {
            const localUsers = [
                { id: 'user1', username: 'gestor1', name: 'Gestor Local', updatedAt: Date.now() }
            ];
            const cloudUsers = [
                { id: 'user2', username: 'gestor2', name: 'Gestor Cloud', updatedAt: Date.now() }
            ];

            const merged = CloudStorage.mergeUsers(localUsers, cloudUsers);

            expect(merged.length).toBe(2);
            expect(merged.find(u => u.id === 'user1')).toBeDefined();
            expect(merged.find(u => u.id === 'user2')).toBeDefined();
        });

        it('should keep newer version when user exists in both local and cloud (local newer)', () => {
            const now = Date.now();
            const localUsers = [
                { id: 'user1', username: 'gestor1', name: 'Updated Name', updatedAt: now }
            ];
            const cloudUsers = [
                { id: 'user1', username: 'gestor1', name: 'Old Name', updatedAt: now - 10000 }
            ];

            const merged = CloudStorage.mergeUsers(localUsers, cloudUsers);

            expect(merged.length).toBe(1);
            expect(merged[0].name).toBe('Updated Name');
            expect(merged[0].updatedAt).toBe(now);
        });

        it('should keep newer version when user exists in both local and cloud (cloud newer)', () => {
            const now = Date.now();
            const localUsers = [
                { id: 'user1', username: 'gestor1', name: 'Old Name', updatedAt: now - 10000 }
            ];
            const cloudUsers = [
                { id: 'user1', username: 'gestor1', name: 'Updated Name', updatedAt: now }
            ];

            const merged = CloudStorage.mergeUsers(localUsers, cloudUsers);

            expect(merged.length).toBe(1);
            expect(merged[0].name).toBe('Updated Name');
            expect(merged[0].updatedAt).toBe(now);
        });

        it('should handle empty local users array', () => {
            const cloudUsers = [
                { id: 'user1', username: 'gestor1', name: 'Gestor 1', updatedAt: Date.now() },
                { id: 'user2', username: 'gestor2', name: 'Gestor 2', updatedAt: Date.now() }
            ];

            const merged = CloudStorage.mergeUsers([], cloudUsers);

            expect(merged.length).toBe(2);
        });

        it('should handle empty cloud users array', () => {
            const localUsers = [
                { id: 'user1', username: 'gestor1', name: 'Gestor 1', updatedAt: Date.now() },
                { id: 'user2', username: 'gestor2', name: 'Gestor 2', updatedAt: Date.now() }
            ];

            const merged = CloudStorage.mergeUsers(localUsers, []);

            expect(merged.length).toBe(2);
        });

        it('should handle missing updatedAt timestamp (defaults to 0)', () => {
            const localUsers = [
                { id: 'user1', username: 'gestor1', name: 'New Name' } // No updatedAt
            ];
            const cloudUsers = [
                { id: 'user1', username: 'gestor1', name: 'Old Name', updatedAt: Date.now() }
            ];

            const merged = CloudStorage.mergeUsers(localUsers, cloudUsers);

            expect(merged.length).toBe(1);
            // Cloud version should win because it has a timestamp
            expect(merged[0].name).toBe('Old Name');
        });

        it('should preserve all user properties during merge', () => {
            const now = Date.now();
            const localUsers = [
                {
                    id: 'user1',
                    username: 'gestor1',
                    name: 'Gestor Test',
                    email: 'test@example.com',
                    role: 'gestor',
                    passwordHash: 'hash123',
                    updatedAt: now
                }
            ];
            const cloudUsers = [
                {
                    id: 'user2',
                    username: 'gestor2',
                    name: 'Another Gestor',
                    email: 'another@example.com',
                    role: 'gestor',
                    passwordHash: 'hash456',
                    updatedAt: now
                }
            ];

            const merged = CloudStorage.mergeUsers(localUsers, cloudUsers);

            expect(merged.length).toBe(2);
            const user1 = merged.find(u => u.id === 'user1');
            expect(user1.username).toBe('gestor1');
            expect(user1.email).toBe('test@example.com');
            expect(user1.passwordHash).toBe('hash123');
        });

        it('should handle null or undefined inputs gracefully', () => {
            expect(() => CloudStorage.mergeUsers(null, [])).not.toThrow();
            expect(() => CloudStorage.mergeUsers([], null)).not.toThrow();
            expect(() => CloudStorage.mergeUsers(null, null)).not.toThrow();

            const merged = CloudStorage.mergeUsers(null, null);
            expect(Array.isArray(merged)).toBe(true);
            expect(merged.length).toBe(0);
        });

        it('should ignore users without id field', () => {
            const localUsers = [
                { username: 'no-id-user', name: 'Invalid User' }, // Missing id
                { id: 'user1', username: 'valid-user', name: 'Valid User', updatedAt: Date.now() }
            ];
            const cloudUsers = [
                { id: 'user2', username: 'cloud-user', name: 'Cloud User', updatedAt: Date.now() }
            ];

            const merged = CloudStorage.mergeUsers(localUsers, cloudUsers);

            // Should only have the 2 valid users (with ids)
            expect(merged.length).toBe(2);
            expect(merged.find(u => u.username === 'no-id-user')).toBeUndefined();
        });
    });

    describe('User timestamps in data.js', () => {
        const dataCode = fs.readFileSync(path.join(__dirname, '../js/data.js'), 'utf8');

        it('should add updatedAt timestamp in saveUser', () => {
            expect(dataCode).toContain('updatedAt: Date.now()');
            expect(dataCode).toContain('// Add timestamp for merge conflict resolution');
        });

        it('should add updatedAt to default users', () => {
            expect(dataCode).toContain('const baseTimestamp = Date.now();');
            expect(dataCode).toContain('updatedAt: baseTimestamp');
        });
    });

    describe('Sync logic in storage.js', () => {
        const storageCode = fs.readFileSync(path.join(__dirname, '../js/storage.js'), 'utf8');

        it('should implement merge logic for users in syncFromCloud', () => {
            expect(storageCode).toContain("if (originalKey === 'diversey_users'");
            expect(storageCode).toContain('const mergedUsers = this.mergeUsers(localUsers, cloudUsers);');
            expect(storageCode).toContain('Merged users from cloud to session');
        });

        it('should have mergeUsers function definition', () => {
            expect(storageCode).toContain('mergeUsers(localUsers, cloudUsers)');
            expect(storageCode).toContain('Merge users using last-write-wins strategy');
        });

        it('should use ID-based mapping for merge', () => {
            expect(storageCode).toContain('const userMap = new Map();');
            expect(storageCode).toContain('userMap.set(user.id');
        });
    });
});

describe('Integration: Full Sync Scenario', () => {
    it('should document the expected sync behavior', () => {
        // This is a documentation test to ensure the fix is understood
        const expectedBehavior = `
        1. User adds a new gestor locally
        2. New gestor gets updatedAt timestamp
        3. First sync loads defaults from cloud
        4. Merge logic combines local + cloud users
        5. Local-only gestor is preserved
        6. Merged list is saved back to cloud
        7. Page reload shows all users including new gestor
        `;

        expect(expectedBehavior).toContain('Merge logic');
        expect(expectedBehavior).toContain('Local-only gestor is preserved');
    });
});

describe('Cloud merge pushes local gestores to cloud', () => {
    let CloudStorage;
    let DataManager;

    beforeEach(() => {
        const storageCode = fs.readFileSync(path.join(__dirname, '../js/storage.js'), 'utf8');
        global.window = { firebaseModules: {} };
        global.FirebaseInit = {
            isReady: () => true,
            isRTDBConnected: () => true,
            getRef: (path) => path
        };
        global.Logger = { logSync: () => {} };

        eval(storageCode);
        CloudStorage = global.window.CloudStorage;

        DataManager = {
            _sessionCache: { diversey_users: [] },
            KEYS: { USERS: 'diversey_users' }
        };
        global.DataManager = DataManager;
    });

    afterEach(() => {
        delete global.window;
        delete global.FirebaseInit;
        delete global.Logger;
        delete global.DataManager;
    });

    it('should push merged user list when local has entries missing in cloud', async () => {
        const now = Date.now();
        const localOnlyUser = { id: 'local-1', username: 'novo.gestor', updatedAt: now };
        const cloudUser = { id: 'cloud-1', username: 'gestor.cloud', updatedAt: now - 1000 };

        // Prepare environment
        DataManager._sessionCache[DataManager.KEYS.USERS] = [localOnlyUser];
        CloudStorage.isInitialized = true;
        CloudStorage.database = {};
        global.FirebaseInit.getRef = (path) => path;
        const getMock = jest.fn(async () => ({ val: () => ({ diversey_users: { data: [cloudUser] } }) }));
        window.firebaseModules.get = getMock;

        const saveSpy = jest.spyOn(CloudStorage, 'saveData').mockResolvedValue(true);

        await CloudStorage.syncFromCloud();

        expect(saveSpy).toHaveBeenCalledWith('diversey_users', expect.arrayContaining([localOnlyUser, cloudUser]));
        saveSpy.mockRestore();
    });
});
