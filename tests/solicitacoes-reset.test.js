const fs = require('fs');
const path = require('path');

describe('Solicitações - limpeza de dados de teste', () => {
    const dataCode = fs.readFileSync(path.join(__dirname, '../js/data.js'), 'utf8');

    const buildDataManager = (saveDataMock) => {
        const sanitizedCode = dataCode.replace('DataManager.init();', '// DataManager.init();');
        const factory = new Function('Utils', 'CloudStorage', `${sanitizedCode}; return DataManager;`);
        return factory({}, { saveData: saveDataMock });
    };

    beforeEach(() => {
        let storage = {};
        global.localStorage = {
            getItem: (key) => storage[key] || null,
            setItem: (key, value) => { storage[key] = String(value); },
            removeItem: (key) => { delete storage[key]; },
            clear: () => { storage = {}; }
        };
    });

    it('remove solicitações marcadas como teste e preserva as válidas', async () => {
        const saveData = jest.fn().mockResolvedValue(true);
        const manager = buildDataManager(saveData);
        manager.cloudInitialized = true;
        manager._sessionCache[manager.KEYS.SOLICITATIONS] = [
            { id: 'TEST-001', numero: 'TEST-001', source: 'test', observacoes: 'solicitação de teste' },
            { id: 'REAL-001', numero: 'REAL-001', descricao: 'Peça real', createdBy: 'tecnico' }
        ];

        const resetApplied = await manager.applySolicitationsReset();

        expect(resetApplied).toBe(true);
        expect(manager.getSolicitations()).toEqual([
            expect.objectContaining({ id: 'REAL-001' })
        ]);
        expect(saveData).toHaveBeenCalledWith(
            manager.KEYS.SOLICITATIONS,
            expect.arrayContaining([expect.objectContaining({ id: 'REAL-001' })])
        );
        expect(localStorage.getItem(manager.SOLICITATIONS_RESET_KEY)).toBe(manager.SOLICITATIONS_RESET_VERSION);
    });
});
