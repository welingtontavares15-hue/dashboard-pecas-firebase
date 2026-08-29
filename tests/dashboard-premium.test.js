const fs = require('fs');
const path = require('path');

describe('Dashboard WWM v57', () => {
    const root = path.join(__dirname, '..');
    const css = fs.readFileSync(path.join(root, 'css/wwm-dashboard-v57.css'), 'utf8');
    const dashboard = fs.readFileSync(path.join(root, 'js/components/dashboard-wwm-v57.js'), 'utf8');
    const page = fs.readFileSync(path.join(root, 'js/pages/dashboard-v55.js'), 'utf8');
    const serviceWorker = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');

    test('segue a home oficial WWM com uma única navegação global', () => {
        expect(dashboard).toContain('PORTAL DE PEÇAS WWM');
        expect(dashboard).toContain('WAREWASHING MACHINE REQUEST');
        expect(dashboard).toContain('Últimas pendências');
        expect(dashboard).toContain('Pendentes');
        expect(dashboard).toContain('Atrasadas');
        expect(dashboard).toContain('Concluídas');
        expect(dashboard).not.toContain('premium-dashboard-side-nav');
        expect(dashboard).not.toContain('renderSideNavigation');
    });

    test('prioriza operação e mantém inteligência financeira em segunda camada', () => {
        expect(dashboard).toContain('Nova solicitação');
        expect(dashboard).toContain('Histórico e análises');
        expect(dashboard).toContain('GESTÃO E INTELIGÊNCIA');
        expect(dashboard).toContain('Visão operacional e financeira');
        expect(dashboard).toContain('wwm-cost-trend-chart');
        expect(dashboard).toContain('wwm-status-chart');
        expect(dashboard).toContain('Peças de maior impacto');
        expect(dashboard).toContain('Solicitações recentes');
    });

    test('não apresenta zero enquanto a base ainda está hidratando', () => {
        expect(dashboard).toContain('data-dashboard-state="loading"');
        expect(dashboard).toContain('Sincronizando dados operacionais');
        expect(dashboard).toContain('DataManager.syncAll');
        expect(dashboard).toContain('data-dashboard-source-count');
        expect(dashboard).toContain('data-dashboard-period-count');
        expect(dashboard).toContain('Existem ${Utils.formatNumber(source.length)} solicitações na base');
    });

    test('carrega somente o renderer WWM v57 na página do dashboard', () => {
        expect(page).toContain("dashboard-wwm-v57.js?v=20260829a");
        expect(page).toContain('wwm-dashboard-v57.css?v=20260829a');
        expect(page).toContain('applyDashboardWwmV57');
        expect(page).not.toContain('applyDashboardPremiumV55');
        expect(page).not.toContain('dashboard-focus.js');
        expect(page).not.toContain('dashboard-stability.js');
    });

    test('mantém responsividade e cache offline da nova experiência', () => {
        expect(css).toContain('background: #006e66');
        expect(css).toContain('@media (max-width: 760px)');
        expect(serviceWorker).toContain("'./css/wwm-dashboard-v57.css'");
        expect(serviceWorker).toContain("'./js/components/dashboard-wwm-v57.js'");
        expect(serviceWorker).toContain("const CACHE_VERSION = 'v57-wwm-dashboard'");
    });
});
