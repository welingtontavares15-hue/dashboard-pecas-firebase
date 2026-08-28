const fs = require('fs');
const path = require('path');

function loadHelpers() {
    const file = path.resolve(__dirname, '../js/components/report-multi-filter-utils.js');
    const source = fs.readFileSync(file, 'utf8').replace(/export\s+function\s+/g, 'function ');
    const factory = new Function(`${source}\nreturn { normalizeMultiValues, normalizeComparable, matchesAnySelected, getRecordSupplierCandidates, scopeRecordToSuppliers };`);
    return factory();
}

describe('report multi-filter utilities', () => {
    const {
        normalizeMultiValues,
        normalizeComparable,
        matchesAnySelected,
        getRecordSupplierCandidates,
        scopeRecordToSuppliers
    } = loadHelpers();

    test('normalizes and de-duplicates selected values', () => {
        expect(normalizeMultiValues([' a ', 'b', 'a', '', null])).toEqual(['a', 'b']);
    });

    test('matches selections ignoring accents and case when requested', () => {
        expect(matchesAnySelected(['Região Sul'], ['regiao sul'], normalizeComparable)).toBe(true);
        expect(matchesAnySelected(['Norte'], ['Sul'], normalizeComparable)).toBe(false);
        expect(matchesAnySelected(['Norte'], [], normalizeComparable)).toBe(true);
    });

    test('collects supplier ids from solicitation and items', () => {
        const record = {
            fornecedorId: 'F1',
            itens: [
                { fornecedorId: 'F2' },
                { supplierId: 'F3' },
                { fornecedorId: 'F2' }
            ]
        };
        expect(getRecordSupplierCandidates(record)).toEqual(['F1', 'F2', 'F3']);
    });

    test('scopes mixed-supplier solicitation cost and pieces to selected suppliers', () => {
        const record = {
            total: 330,
            _analysisCost: 330,
            _analysisPieces: 3,
            itens: [
                { fornecedorId: 'F1', quantidade: 1, valorUnit: 100 },
                { fornecedorId: 'F2', quantidade: 2, valorUnit: 100 }
            ]
        };

        const scoped = scopeRecordToSuppliers(record, ['F2']);
        expect(scoped.itens).toHaveLength(1);
        expect(scoped._analysisPieces).toBe(2);
        expect(scoped._analysisCost).toBe(220);
    });

    test('drops records that do not match selected suppliers', () => {
        const record = {
            fornecedorId: 'F1',
            itens: [{ fornecedorId: 'F1', quantidade: 1, valorUnit: 100 }]
        };
        expect(scopeRecordToSuppliers(record, ['F2'])).toBeNull();
    });
});
