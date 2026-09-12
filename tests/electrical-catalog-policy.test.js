const fs = require('fs');
const path = require('path');
const vm = require('vm');

describe('ElectricalCatalogPolicy', () => {
    function loadPolicy(dataManager = null) {
        const source = fs.readFileSync(path.join(__dirname, '../js/electrical-catalog-policy.js'), 'utf8');
        const document = { readyState: 'loading', addEventListener: jest.fn(), documentElement: {}, querySelectorAll: () => [] };
        const window = {
            document,
            DataManager: dataManager,
            setInterval: jest.fn(() => 1),
            clearInterval: jest.fn(),
            setTimeout: jest.fn()
        };
        const context = { window, document };
        vm.runInNewContext(source, context);
        return { policy: window.ElectricalCatalogPolicy, dataManager: window.DataManager };
    }

    test('mantém peças elétricas visíveis e não altera o array de origem', () => {
        const { policy } = loadPolicy();
        const source = [
            { codigo: 'CS 072', categoria: 'Elétrica' },
            { codigo: 'CS075', categoria: 'Mecânica' }
        ];
        const result = policy.filterParts(source);

        expect(result).toEqual([
            { codigo: 'CS072', categoria: 'Elétrica' },
            { codigo: 'CS075', categoria: 'Mecânica' }
        ]);
        expect(source).toEqual([
            { codigo: 'CS 072', categoria: 'Elétrica' },
            { codigo: 'CS075', categoria: 'Mecânica' }
        ]);
        expect(policy.allowsElectricalParts).toBe(true);
        expect(policy.excludedCategories).toEqual([]);
    });

    test('normaliza códigos CS com espaço, hífen ou poucos dígitos', () => {
        const { policy } = loadPolicy();
        expect(policy.canonicalizePartCode('CS 135')).toBe('CS135');
        expect(policy.canonicalizePartCode('cs-72')).toBe('CS072');
        expect(policy.canonicalizePartCode(' CS 5 ')).toBe('CS005');
        expect(policy.canonicalizePartCode('ABC 123')).toBe('ABC 123');
    });

    test('patch do DataManager preserva elétricas e normaliza importação e gravação', async () => {
        const savedParts = [];
        const importedRows = [];
        const manager = {
            getParts: jest.fn(() => [
                { id: 'a', codigo: 'CS 135', categoria: 'Elétrica' },
                { id: 'b', codigo: 'CS075', categoria: 'Mecânica' }
            ]),
            savePart: jest.fn(async (part) => {
                savedParts.push(part);
                return { success: true, part };
            }),
            importParts: jest.fn(async (rows) => {
                importedRows.push(...rows);
                return { success: true, imported: rows.length, updated: 0, errors: [] };
            })
        };

        const { dataManager } = loadPolicy(manager);

        expect(dataManager.getParts()).toEqual([
            { id: 'a', codigo: 'CS135', categoria: 'Elétrica' },
            { id: 'b', codigo: 'CS075', categoria: 'Mecânica' }
        ]);

        await dataManager.savePart({ codigo: 'CS 135', descricao: 'Roldana', categoria: 'Mecânica' });
        expect(savedParts[0].codigo).toBe('CS135');

        await dataManager.importParts([{ Código: 'CS 072', descricao: 'Resistência', categoria: 'Elétrica' }]);
        expect(importedRows[0].codigo).toBe('CS072');
    });
});
