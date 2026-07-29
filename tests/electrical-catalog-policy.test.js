const fs = require('fs');
const path = require('path');
const vm = require('vm');

describe('ElectricalCatalogPolicy', () => {
    function loadPolicy() {
        const source = fs.readFileSync(path.join(__dirname, '../js/electrical-catalog-policy.js'), 'utf8');
        const document = {
            readyState: 'loading',
            addEventListener: jest.fn(),
            documentElement: {},
            querySelectorAll: () => []
        };
        const window = {
            document,
            setInterval: jest.fn(() => 1),
            clearInterval: jest.fn(),
            setTimeout: jest.fn()
        };
        const context = {
            window,
            document,
            MutationObserver: function MutationObserver() { this.observe = jest.fn(); }
        };
        vm.runInNewContext(source, context);
        return window.ElectricalCatalogPolicy;
    }

    test('reconhece variações acentuadas e de gênero', () => {
        const policy = loadPolicy();
        expect(policy.isElectricalCategory('Elétrica')).toBe(true);
        expect(policy.isElectricalCategory('ELETRICOS')).toBe(true);
        expect(policy.isElectricalCategory('Mecânica')).toBe(false);
    });

    test('filtra itens elétricos sem alterar o array de origem', () => {
        const policy = loadPolicy();
        const source = [
            { codigo: 'A', categoria: 'Elétrica' },
            { codigo: 'B', categoria: 'Hidráulica' }
        ];
        const result = policy.filterParts(source);
        expect(result).toEqual([{ codigo: 'B', categoria: 'Hidráulica' }]);
        expect(source).toHaveLength(2);
    });
});
