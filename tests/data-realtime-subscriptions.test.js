const fs = require('fs');
const path = require('path');

describe('DataManager realtime subscriptions', () => {
    let DataManager;

    beforeEach(() => {
        const dataCode = fs.readFileSync(path.join(__dirname, '../js/data.js'), 'utf8')
            .replace('DataManager.init();', '');
        const factory = new Function(`
            ${dataCode}
            return DataManager;
        `);
        DataManager = factory();

        global.CloudStorage = {
            init: jest.fn().mockResolvedValue(true),
            waitForCloudReady: jest.fn().mockResolvedValue(true),
            syncFromCloud: jest.fn().mockResolvedValue(true),
            subscribe: jest.fn(),
            unsubscribe: jest.fn()
        };

        // Prevent side effects during sync
        DataManager._loadInitialDataFromCloud = jest.fn().mockResolvedValue();
    });

    afterEach(() => {
        delete global.CloudStorage;
        DataManager = null;
    });

    it('re-attaches realtime listeners after a manual sync', async () => {
        await DataManager.syncAll('manual');

        expect(global.CloudStorage.subscribe).toHaveBeenCalledWith(
            DataManager.KEYS.SOLICITATIONS,
            expect.any(Function)
        );
        expect(global.CloudStorage.subscribe).toHaveBeenCalledWith(
            DataManager.KEYS.USERS,
            expect.any(Function)
        );
        expect(global.CloudStorage.unsubscribe).toHaveBeenCalledWith(DataManager.KEYS.SOLICITATIONS);
        expect(global.CloudStorage.unsubscribe).toHaveBeenCalledWith(DataManager.KEYS.USERS);
        expect(DataManager.realtimeSubscribed).toBe(true);
    });
});
