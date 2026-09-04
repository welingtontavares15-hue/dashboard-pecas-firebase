const fs = require('fs');
const path = require('path');

describe('Filtros de custo por divisão F&B/IN', () => {
    const root = path.resolve(__dirname, '..');
    const reportsFilter = fs.readFileSync(path.join(root, 'js/components/reports-division-filter.js'), 'utf8');
    const dashboardFilter = fs.readFileSync(path.join(root, 'js/components/dashboard-division-filter.js'), 'utf8');
    const solicitationFilter = fs.readFileSync(path.join(root, 'js/solicitacoes-divisao-filtro.js'), 'utf8');
    const premiumUi = fs.readFileSync(path.join(root, 'js/premium-ui-v3.js'), 'utf8');
    const visualArchitecture = fs.readFileSync(path.join(root, 'css/visual-architecture-v72.css'), 'utf8');
    const reportsPage = fs.readFileSync(path.join(root, 'js/pages/relatorios-v55.js'), 'utf8');
    const dashboardPage = fs.readFileSync(path.join(root, 'js/pages/dashboard-v55.js'), 'utf8');
    const solicitationsPage = fs.readFileSync(path.join(root, 'js/pages/solicitacoes.js'), 'utf8');
    const serviceWorker = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');

    test('usa Todos como visão combinada sem opção F&B + IN redundante', () => {
        ['Todos', 'F&amp;B', 'IN', 'Não classificado'].forEach((label) => expect(reportsFilter).toContain(label));
        expect(reportsFilter).not.toContain('F&amp;B + IN');
        expect(reportsFilter).not.toContain('case MODE.BOTH');
        expect(reportsFilter).toContain("if (raw === 'both') return MODE.ALL;");
        expect(reportsFilter).toContain('AnalyticsHelper.computeMetrics');
        expect(reportsPage).toContain('applyReportsDivisionFilter');

        [dashboardFilter, solicitationFilter].forEach((source) => {
            expect(source).not.toContain('F&amp;B + IN');
            expect(source).not.toContain('case MODE.BOTH');
            expect(source).toContain("if (raw === 'both') return MODE.ALL;");
        });
    });

    test('mantém ações dos filtros alinhadas e visualização compacta por ícone', () => {
        // O JS não deve reintroduzir geometria inline; o layout pertence à camada CSS responsiva.
        expect(reportsFilter).not.toContain('style="grid-column:');

        // Valida o contrato estrutural que evita colisão sem acoplar o teste ao número
        // de colunas externas do grid de filtros.
        expect(visualArchitecture).toContain('.premium-report-filter-actions .report-filter-actions-row');
        expect(visualArchitecture).toContain('grid-template-columns: repeat(2, minmax(0, 1fr)) !important;');
        expect(visualArchitecture).toContain('.premium-report-filter-actions .btn');
        expect(visualArchitecture).toContain('min-width: 0 !important;');
        expect(visualArchitecture).toContain('@media (max-width: 760px)');
        expect(visualArchitecture).toContain('grid-template-columns: minmax(0, 1fr) !important;');

        expect(premiumUi).toContain("button.classList.contains('solicitation-view-action')");
        expect(premiumUi).toContain("viewButton.querySelector(':scope > span')?.remove();");
        expect(premiumUi).toContain("button.setAttribute('aria-label', normalized)");
    });

    test('dashboard recalcula indicadores e custos conforme a divisão', () => {
        expect(dashboardFilter).toContain("dataManager.getSolicitations = function getSolicitationsByDivision()");
        expect(dashboardFilter).toContain("Dashboard.render()");
        expect(dashboardPage).toContain('applyDashboardDivisionFilter');
    });

    test('lista de solicitações também aceita filtro de divisão', () => {
        expect(solicitationFilter).toContain('sol-divisao-filter');
        expect(solicitationFilter).toContain("case MODE.UNCLASSIFIED");
        expect(solicitationsPage).toContain('SolicitacoesDivisaoFiltroPatch');
    });

    test('novos módulos ficam disponíveis no cache PWA', () => {
        expect(serviceWorker).toContain("'./js/components/reports-division-filter.js'");
        expect(serviceWorker).toContain("'./js/components/dashboard-division-filter.js'");
        expect(serviceWorker).toContain("'./js/solicitacoes-divisao-filtro.js'");
    });
});
