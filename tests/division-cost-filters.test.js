const fs = require('fs');
const path = require('path');

describe('Filtros de custo por divisão F&B/IN', () => {
    const root = path.resolve(__dirname, '..');
    const reportsFilter = fs.readFileSync(path.join(root, 'js/components/reports-division-filter.js'), 'utf8');
    const dashboardFilter = fs.readFileSync(path.join(root, 'js/components/dashboard-division-filter.js'), 'utf8');
    const solicitationFilter = fs.readFileSync(path.join(root, 'js/solicitacoes-divisao-filtro.js'), 'utf8');
    const reportsPage = fs.readFileSync(path.join(root, 'js/pages/relatorios-v55.js'), 'utf8');
    const dashboardPage = fs.readFileSync(path.join(root, 'js/pages/dashboard-v55.js'), 'utf8');
    const solicitationsPage = fs.readFileSync(path.join(root, 'js/pages/solicitacoes.js'), 'utf8');
    const serviceWorker = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');

    test('relatórios permitem custo F&B, IN, ambos e não classificados', () => {
        ['F&B + IN', 'F&amp;B', 'IN', 'Não classificado'].forEach((label) => expect(reportsFilter).toContain(label));
        expect(reportsFilter).toContain("case MODE.BOTH");
        expect(reportsFilter).toContain("case MODE.FB");
        expect(reportsFilter).toContain("case MODE.IN");
        expect(reportsFilter).toContain('AnalyticsHelper.computeMetrics');
        expect(reportsPage).toContain('applyReportsDivisionFilter');
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
