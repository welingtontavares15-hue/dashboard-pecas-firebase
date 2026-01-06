const fs = require('fs');
const path = require('path');

describe('DataManager export artifacts', () => {
    const dataCode = fs.readFileSync(path.join(__dirname, '../js/data.js'), 'utf8');

    const loadDataManager = () => {
        const sanitizedCode = dataCode.replace('DataManager.init();', '// DataManager.init();');
        const factory = new Function('Utils', 'CloudStorage', `${sanitizedCode}; return DataManager;`);
        return factory({ generateId: () => 'generated-id' }, {});
    };

    beforeEach(() => {
        // Basic localStorage stub for any incidental access
        const storage = {};
        global.localStorage = {
            getItem: (key) => storage[key] || null,
            setItem: (key, value) => { storage[key] = String(value); },
            removeItem: (key) => { delete storage[key]; }
        };
    });

    it('persists base64 export payload with opId', () => {
        const manager = loadDataManager();
        manager.loadData = jest.fn(() => ({}));
        manager.saveData = jest.fn();

        const entry = { id: 'exp123', filename: 'file.xlsx', source: 'tests', timestamp: 1000 };
        const artifact = { payloadBase64: 'Zm9v', filename: 'file.xlsx', contentType: 'application/test' };

        const saved = manager.saveExportArtifact(entry, artifact);

        expect(saved.opId).toBe('exp123');
        expect(saved.filename).toBe('file.xlsx');
        expect(manager.saveData).toHaveBeenCalledWith(manager.KEYS.EXPORT_FILES, expect.any(Object));
    });
});
