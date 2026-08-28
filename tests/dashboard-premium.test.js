const fs = require('fs');
const path = require('path');

describe('Dashboard premium', () => {
    const root = path.join(__dirname, '..');
    const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    const css = fs.readFileSync(path.join(root, 'css/premium-dashboard-v2.css'), 'utf8');
    const releaseCss = fs.readFileSync(path.join(root, 'css/premium-release-v55.css'), 'utf8');
    const dashboard = fs.readFileSync(path.join(root, 'js/components/dashboard-premium-v55.js'), 'utf8');
    const page = fs.readFileSync(path.join(root, 'js/pages/dashboard-v55.js'), 'utf8');
    const serviceWorker = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');

    test('carrega as camadas premium na ordem correta', () => {
        expect(index).toContain('css/premium-dashboard-v2.css?v=20260729a');
        expect(index).toContain('css/premium-release-v55.css?v=20260828c');
        expect(index.indexOf('premium-dashboard-v2.css')).toBeLessThan(index.indexOf('premium-release-v55.css'));
    });

    test('entrega KPIs, gráficos, ranking, tabela e estados de dados', () => {
        expect(dashboard).toContain('premium-kpi-grid');
        expect(dashboard).toContain('premium-cost-trend-chart');
        expect(dashboard).toContain('premium-status-chart');
        expect(dashboard).toContain('Peças com maior impacto');
        expect(dashboard).toContain('Solicitações recentes');
        expect(dashboard).toContain('data-dashboard-state="loading"');
        expect(dashboard).toContain('data-dashboard-state="ready"');
        expect(dashboard).toContain('Há dados no sistema, mas nenhum registro está dentro deste período');
    });

    test('inclui menu lateral interno e mantém retorno global pela rota dashboard', () => {
        expect(dashboard).toContain('premium-dashboard-side-nav');
        expect(dashboard).toContain('Menu da visão operacional');
        expect(dashboard).toContain('Resumo executivo');
        expect(dashboard).toContain('Custos e tendência');
        expect(dashboard).toContain('scrollIntoView');
        expect(dashboard).toContain("Auth.renderMenu('dashboard')");
        expect(releaseCss).toContain('.premium-dashboard-layout');
        expect(releaseCss).toContain('.premium-dashboard-side-nav');
        expect(releaseCss).toContain('position: sticky');
    });

    test('usa a análise operacional real e atualiza após sincronização', () => {
        expect(dashboard).toContain('AnalyticsHelper.buildOperationalAnalysis');
        expect(dashboard).toContain('accessibleSolicitations');
        expect(dashboard).toContain('data-dashboard-source-count');
        expect(dashboard).toContain("'data:updated'");
        expect(dashboard).toContain("'storage:ready'");
        expect(page).toContain('dashboard-premium-v55.js?v=20260828c');
    });

    test('mantém responsividade e os ativos no cache offline', () => {
        expect(css).toContain('@media (max-width: 700px)');
        expect(releaseCss).toContain('@media (max-width: 1180px)');
        expect(serviceWorker).toContain("'./css/premium-dashboard-v2.css'");
        expect(serviceWorker).toContain("'./js/pages/dashboard-v55.js'");
        expect(serviceWorker).toContain("'./js/components/dashboard-premium-v55.js'");
        expect(serviceWorker).toContain("'./js/electrical-catalog-policy.js'");
    });
});
