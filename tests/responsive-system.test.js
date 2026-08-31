const fs = require('fs');
const path = require('path');

describe('WWM global responsive system v66', () => {
    const root = path.resolve(__dirname, '..');
    const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    const css = fs.readFileSync(path.join(root, 'css/responsive-system.css'), 'utf8');
    const visualStandard = fs.readFileSync(path.join(root, 'css/wwm-visual-standard.css'), 'utf8');
    const solicitacoes = fs.readFileSync(path.join(root, 'js/solicitacoes.js'), 'utf8');
    const referenceUi = fs.readFileSync(path.join(root, 'js/wwm-reference-ui.js'), 'utf8');
    const serviceWorker = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');

    test('loads the authoritative responsive and visual layers in the final cascade', () => {
        const referenceIndex = index.indexOf('css/wwm-reference-theme.css');
        const responsiveIndex = index.indexOf('css/responsive-system.css');
        const visualIndex = index.indexOf('css/wwm-visual-standard.css');
        expect(referenceIndex).toBeGreaterThan(-1);
        expect(responsiveIndex).toBeGreaterThan(referenceIndex);
        expect(visualIndex).toBeGreaterThan(responsiveIndex);
        expect(referenceUi).toContain('document.head.append(referenceLink, responsiveLink)');
        expect(referenceUi).toContain('document.head.append(visualStandardLink)');
    });

    test('keeps dropdowns above following cards without clipping', () => {
        expect(css).toContain('.premium-multi-filter.open');
        expect(css).toContain('overflow: visible !important');
        expect(css).toContain('z-index: 950 !important');
        expect(css).toContain('overscroll-behavior: contain');
    });

    test('keeps every required solicitation column reachable', () => {
        ['<th>Nº</th>', '<th>Técnico</th>', '<th>Cliente</th>', '<th>Peça</th>', '<th>Valor</th>', '<th>Status</th>', '<th>Data</th>', '<th>Ações</th>']
            .forEach((header) => expect(solicitacoes).toContain(header));
        expect(css).toContain('width: max(100%, 1080px)');
        expect(css).toContain('position: sticky');
        expect(css).toContain('overflow-x: auto !important');
    });

    test('standardizes dashboard preview tables without desktop horizontal scroll', () => {
        expect(visualStandard).toContain('.wwm-page-dashboard .v59-detail-grid .v59-table-wrap');
        expect(visualStandard).toContain('overflow-x: hidden !important');
        expect(visualStandard).toContain('.wwm-page-dashboard .v59-detail-grid .v59-table');
        expect(visualStandard).toContain('table-layout: fixed !important');
        expect(visualStandard).toContain('.v59-table--recent .status-badge');
    });

    test('standardizes report filters, KPI cards and paired panels', () => {
        expect(visualStandard).toContain('.wwm-page-relatorios .premium-report-filter-grid');
        expect(visualStandard).toContain('grid-template-columns: repeat(6, minmax(0, 1fr)) !important');
        expect(visualStandard).toContain('.wwm-page-relatorios .report-summary-card');
        expect(visualStandard).toContain('.wwm-page-relatorios .reports-two-column');
        expect(visualStandard).toContain('align-items: stretch !important');
        expect(visualStandard).toContain('.wwm-page-relatorios .report-panel-card > .card-body');
        expect(visualStandard).toContain('display: grid !important');
    });

    test('keeps compact report tables fluid on desktop and scrollable on mobile', () => {
        expect(visualStandard).toContain('.reports-two-column:not(.report-detail-grid) .dashboard-compact-table');
        expect(visualStandard).toContain('min-width: 0 !important');
        expect(visualStandard).toContain('@media (max-width: 760px)');
        expect(visualStandard).toContain('min-width: 680px !important');
    });

    test('defines one global geometry contract for page headers, controls and operational tables', () => {
        expect(visualStandard).toContain('--wwm-content-max: 1600px');
        expect(visualStandard).toContain('.wwm-page-title');
        expect(visualStandard).toContain('.corporate-page-header');
        expect(visualStandard).toContain('.form-control');
        expect(visualStandard).toContain('.wwm-page-solicitacoes, .wwm-page-aprovacoes');
        expect(visualStandard).toContain('overscroll-behavior-inline: contain');
        expect(visualStandard).toContain('@media (max-width: 900px)');
    });

    test('covers desktop, tablet, mobile, short-height and reduced-motion viewports', () => {
        ['@media (max-width: 1440px)', '@media (max-width: 1180px)', '@media (max-width: 760px)', '@media (max-width: 520px)', '@media (max-height: 700px)']
            .forEach((query) => expect(css).toContain(query));
        expect(css).toContain('@media (prefers-reduced-motion: reduce)');
        ['@media (max-width: 1480px)', '@media (max-width: 1180px)', '@media (max-width: 900px)', '@media (max-width: 760px)', '@media (max-width: 520px)', '@media (max-height: 700px)', '@media (prefers-reduced-motion: reduce)']
            .forEach((query) => expect(visualStandard).toContain(query));
    });

    test('uses the Visão Geral teal surfaces as the global colour standard', () => {
        expect(index).toContain('responsive-system.css?v=20260830b');
        expect(index).toContain('wwm-visual-standard.css?v=20260830d');
        expect(index).toContain('<meta name="theme-color" content="#004449">');
        expect(css).toContain('--wwm-panel-gradient: linear-gradient(160deg, rgba(4, 86, 91, .46), rgba(0, 62, 72, .25))');
        expect(css).toContain('--cui-surface: var(--wwm-panel-surface)');
        expect(css).toContain('--pv3-surface: var(--wwm-panel-surface)');
        expect(css).toContain('--corp-surface: var(--wwm-panel-surface)');
        expect(css).toContain('.corporate-filter-surface');
        expect(css).toContain('.corporate-stat-card');
        expect(css).toContain('.corporate-grid-shell');
        expect(css).toContain('.modal-content');
        expect(css).toContain('.premium-multi-filter-popover');
        expect(serviceWorker).toContain("'./css/wwm-visual-standard.css'");
    });
});
