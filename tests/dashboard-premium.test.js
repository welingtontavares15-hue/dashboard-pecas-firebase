const fs = require('fs');
const path = require('path');

describe('Dashboard premium', () => {
    const root = path.join(__dirname, '..');
    const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    const css = fs.readFileSync(path.join(root, 'css/premium-dashboard-v2.css'), 'utf8');
    const shellCss = fs.readFileSync(path.join(root, 'css/app-shell-v3.css'), 'utf8');
    const dashboard = fs.readFileSync(path.join(root, 'js/components/dashboard-focus.js'), 'utf8');
    const serviceWorker = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');

    test('carrega a camada visual estrutural v3 por último', () => {
        expect(index).toContain('css/premium-dashboard-v2.css?v=20260729a');
        expect(index).toContain('css/app-shell-v3.css?v=20260827a');
        expect(index.indexOf('premium-dashboard-v2.css')).toBeLessThan(index.indexOf('app-shell-v3.css'));
        expect(index).toContain('class="login-brand-panel"');
        expect(index).toContain('class="sidebar-context"');
        expect(index).toContain('class="header-context"');
    });

    test('entrega KPIs, gráficos, ranking e tabela recente no dashboard v3', () => {
        expect(dashboard).toContain('premium-dashboard-v3');
        expect(dashboard).toContain('premium-dashboard-toolbar');
        expect(dashboard).toContain('premium-hero-summary-card');
        expect(dashboard).toContain('premium-kpi-grid');
        expect(dashboard).toContain('premium-cost-trend-chart');
        expect(dashboard).toContain('premium-status-chart');
        expect(dashboard).toContain('Peças de maior custo');
        expect(dashboard).toContain('Solicitações recentes');
    });

    test('possui resumo textual acessível para os gráficos', () => {
        expect(dashboard).toContain('premium-chart-summary');
        expect(css).toContain('.premium-chart-summary');
    });

    test('mantém responsividade e os ativos visuais no cache offline', () => {
        expect(css).toContain('@media (max-width: 700px)');
        expect(shellCss).toContain('@media (max-width: 680px)');
        expect(serviceWorker).toContain("'./css/premium-dashboard-v2.css'");
        expect(serviceWorker).toContain("'./css/app-shell-v3.css'");
        expect(serviceWorker).toContain("'./js/components/dashboard-focus.js'");
        expect(serviceWorker).toContain("'./js/electrical-catalog-policy.js'");
    });
});
