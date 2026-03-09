const fs = require('fs');
const path = require('path');

describe('DataManager export artifacts', () => {
    const dataCode = fs.readFileSync(path.join(__dirname, '../js/data.js'), 'utf8');

    const loadDataManager = (authMock = { getCurrentUser: () => ({ role: 'gestor' }) }) => {
        const sanitizedCode = dataCode.replace('DataManager.init();', '// DataManager.init();');
        const factory = new Function('Utils', 'CloudStorage', 'Auth', `${sanitizedCode}; return DataManager;`);
        return factory({ generateId: () => 'generated-id' }, {}, authMock);
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

    it('keeps export artifact only in session cache for roles sem permissão de cloud', () => {
        const manager = loadDataManager({ getCurrentUser: () => ({ role: 'tecnico' }) });
        manager.loadData = jest.fn(() => ({}));
        manager.saveData = jest.fn();

        const entry = { id: 'exp124', filename: 'file.pdf', source: 'tests', timestamp: 1001 };
        const artifact = { payloadBase64: 'YmFy', filename: 'file.pdf', contentType: 'application/pdf' };

        const saved = manager.saveExportArtifact(entry, artifact);

        expect(saved.opId).toBe('exp124');
        expect(manager._sessionCache[manager.KEYS.EXPORT_FILES].exp124.filename).toBe('file.pdf');
        expect(manager.saveData).not.toHaveBeenCalled();
    });
});
