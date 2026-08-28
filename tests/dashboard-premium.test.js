const fs = require('fs');
const path = require('path');

describe('Dashboard premium', () => {
    const root = path.join(__dirname, '..');
    const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    const css = fs.readFileSync(path.join(root, 'css/premium-dashboard-v2.css'), 'utf8');
    const polish = fs.readFileSync(path.join(root, 'css/premium-ui-v3-polish.css'), 'utf8');
    const dashboard = fs.readFileSync(path.join(root, 'js/components/dashboard-focus.js'), 'utf8');
    const serviceWorker = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');

    test('carrega a camada visual premium após os estilos existentes', () => {
        expect(index).toContain('css/premium-dashboard-v2.css?v=20260729a');
        expect(index.indexOf('sidebar-pro.css')).toBeLessThan(index.indexOf('premium-dashboard-v2.css'));
    });

    test('entrega KPIs, gráficos, ranking e tabela recente', () => {
        expect(dashboard).toContain('premium-kpi-grid');
        expect(dashboard).toContain('premium-cost-trend-chart');
        expect(dashboard).toContain('premium-status-chart');
        expect(dashboard).toContain('Peças com maior impacto');
        expect(dashboard).toContain('Solicitações recentes');
    });

    test('inclui menu lateral interno da visão operacional com navegação por seções', () => {
        expect(dashboard).toContain('premium-dashboard-side-nav');
        expect(dashboard).toContain('Menu da visão operacional');
        expect(dashboard).toContain('Resumo executivo');
        expect(dashboard).toContain('Indicadores');
        expect(dashboard).toContain('Custos e tendência');
        expect(dashboard).toContain('Solicitações recentes');
        expect(dashboard).toContain('scrollIntoView');
        expect(polish).toContain('.premium-dashboard-layout');
        expect(polish).toContain('.premium-dashboard-side-nav');
        expect(polish).toContain('position: sticky');
    });

    test('possui resumo textual acessível para os gráficos', () => {
        expect(dashboard).toContain('premium-chart-summary');
        expect(css).toContain('.premium-chart-summary');
    });

    test('mantém responsividade e os ativos no cache offline', () => {
        expect(css).toContain('@media (max-width: 700px)');
        expect(polish).toContain('@media (max-width: 1180px)');
        expect(serviceWorker).toContain("'./css/premium-dashboard-v2.css'");
        expect(serviceWorker).toContain("'./js/components/dashboard-focus.js'");
        expect(serviceWorker).toContain("'./js/electrical-catalog-policy.js'");
    });
});
