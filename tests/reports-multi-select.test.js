const fs = require('fs');
const path = require('path');

describe('reports multi-select enhancement', () => {
    const root = path.resolve(__dirname, '..');
    const source = fs.readFileSync(path.join(root, 'js/components/reports-multi-select.js'), 'utf8');
    const pageLoader = fs.readFileSync(path.join(root, 'js/pages/relatorios.js'), 'utf8');
    const polishCss = fs.readFileSync(path.join(root, 'css/premium-ui-v3-polish.css'), 'utf8');

    test('declares checkbox multi-select controls for all requested dimensions', () => {
        ['report-clientes', 'report-tecnicos', 'report-fornecedores', 'report-regioes'].forEach((controlId) => {
            expect(source).toContain(`renderMultiSelect('${controlId}'`);
        });
        expect(source).toContain('type="checkbox"');
        expect(source).toContain('Selecionar todos');
        expect(source).toContain('Limpar');
        expect(source).toContain('premium_reports_multi_filters_v1');
    });

    test('activates the enhancement from the reports page loader', () => {
        expect(pageLoader).toContain("import { applyReportsMultiSelect } from '../components/reports-multi-select.js?v=20260828b'");
        expect(pageLoader).toContain('applyReportsMultiSelect();');
    });

    test('ships premium checkbox popover styling and responsive filter grid', () => {
        expect(polishCss).toContain('.premium-multi-filter-popover');
        expect(polishCss).toContain('.premium-multi-filter-option input');
        expect(polishCss).toContain('.premium-report-filter-grid');
    });
});
