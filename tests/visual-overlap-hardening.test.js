const fs = require('fs');
const path = require('path');

describe('Visual overlap hardening', () => {
    const root = path.resolve(__dirname, '..');
    const visual = fs.readFileSync(path.join(root, 'css/visual-architecture-v72.css'), 'utf8');
    const divisionFilter = fs.readFileSync(path.join(root, 'js/components/reports-division-filter.js'), 'utf8');

    test('report action buttons shrink inside their grid cell instead of overlapping', () => {
        expect(visual).toContain('.premium-report-filter-actions .report-filter-actions-row');
        expect(visual).toContain('grid-template-columns: repeat(2, minmax(0, 1fr)) !important');
        expect(visual).toContain('.premium-report-filter-actions .btn');
        expect(visual).toContain('min-width: 0 !important');
        expect(divisionFilter).not.toContain('style="grid-column: span 1 !important;"');
    });

    test('division control remains a real selectable control with visible affordance', () => {
        expect(visual).toContain('.report-filter-field--division select.form-control');
        expect(visual).toContain('appearance: auto !important');
        expect(divisionFilter).toContain('<select id="report-divisao"');
        expect(divisionFilter).toContain('<option value="all"');
    });

    test('solicitation table separates division badge, technician, status, date and actions', () => {
        expect(visual).toContain('min-width: 1120px !important');
        expect(visual).toContain('#sol-table-container .solicitation-division-badge');
        expect(visual).toContain('margin: 4px 0 0 !important');
        expect(visual).toContain('#sol-table-container .table td:nth-child(6) .status-badge');
        expect(visual).toContain('white-space: normal !important');
        expect(visual).toContain('#sol-table-container .table :is(th, td):nth-child(7)');
        expect(visual).toContain('#sol-table-container .table :is(th, td):nth-child(8)');
    });

    test('analytical cost tables reserve more room for piece and technician names', () => {
        expect(visual).toContain('.table:has(thead th:nth-child(6):last-child)');
        expect(visual).toContain('th:nth-child(1) { width: 32% !important; }');
        expect(visual).toContain('.table:has(thead th:nth-child(7):last-child)');
        expect(visual).toContain('th:nth-child(2) { width: 25% !important; }');
    });

    test('mobile filter actions stack to avoid compressed labels', () => {
        expect(visual).toContain('@media (max-width: 760px)');
        expect(visual).toContain('.premium-report-filter-actions .report-filter-actions-row');
        expect(visual).toContain('grid-template-columns: minmax(0, 1fr) !important');
    });
});
