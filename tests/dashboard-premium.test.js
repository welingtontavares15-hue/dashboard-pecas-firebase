const fs = require('fs');
const path = require('path');

describe('Dashboard WWM v58', () => {
    const root = path.join(__dirname, '..');
    const css = fs.readFileSync(path.join(root, 'css/wwm-dashboard-v58.css'), 'utf8');
    const dashboard = fs.readFileSync(path.join(root, 'js/components/dashboard-wwm-v58.js'), 'utf8');
    const page = fs.readFileSync(path.join(root, 'js/pages/dashboard-v55.js'), 'utf8');
    const serviceWorker = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');

    test('segue a home WWM sem a segunda navegação interna', () => {
        expect(dashboard).toContain('Portal de Peças WWM');
        expect(dashboard).toContain('ÚLTIMAS PENDÊNCIAS');
        expect(dashboard).toContain('Pendentes');
        expect(dashboard).toContain('Atrasadas');
        expect(dashboard).toContain('Concluídas');
        expect(dashboard).not.toContain('premium-dashboard-side-nav');
        expect(dashboard).not.toContain('renderSideNavigation');
    });

    test('prioriza operação e mantém a camada financeira', () => {
        expect(dashboard).toContain('Nova solicitação');
        expect(dashboard).toContain('Histórico e análises');
        expect(dashboard).toContain('Custo do período');
        expect(dashboard).toContain('Ticket médio');
        expect(dashboard).toContain('wwm58-cost-chart');
        expect(dashboard).toContain('wwm58-status-chart');
        expect(dashboard).toContain('PEÇAS DE MAIOR IMPACTO');
        expect(dashboard).toContain('SOLICITAÇÕES RECENTES');
    });

    test('não usa zero como substituto de carregamento', () => {
        expect(dashboard).toContain('data-dashboard-state="loading"');
        expect(dashboard).toContain('Sincronizando dados operacionais');
        expect(dashboard).toContain('DataManager.syncAll');
        expect(dashboard).toContain('data-dashboard-source-count');
        expect(dashboard).toContain('data-dashboard-period-count');
        expect(dashboard).toContain('Existem ${Utils.formatNumber(source.length)} solicitações na base');
    });

    test('carrega exclusivamente o renderer WWM v58 no entrypoint', () => {
        expect(page).toContain('dashboard-wwm-v58.js?v=20260829b');
        expect(page).toContain('wwm-dashboard-v58.css?v=20260829b');
        expect(page).toContain('applyDashboardWwmV58');
        expect(page).not.toContain('applyDashboardWwmV57');
        expect(page).not.toContain('applyDashboardPremiumV55');
        expect(page).not.toContain('dashboard-focus.js');
    });

    test('mantém responsividade e cache offline da experiência v58', () => {
        expect(css).toContain('body.wwm-dashboard-v58-active .content-area');
        expect(css).toContain('background: #006e66');
        expect(css).toContain('@media (max-width: 680px)');
        expect(serviceWorker).toContain("'./css/wwm-dashboard-v58.css'");
        expect(serviceWorker).toContain("'./js/components/dashboard-wwm-v58.js'");
        expect(serviceWorker).toContain("const CACHE_VERSION = 'v58-wwm-hardwired'");
    });
});
