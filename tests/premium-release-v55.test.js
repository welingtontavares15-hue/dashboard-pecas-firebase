const fs = require('fs');
const path = require('path');

describe('Release WWM v59 approved exact', () => {
    const root = path.resolve(__dirname, '..');
    const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    const navigation = fs.readFileSync(path.join(root, 'js/navigation-master-v55.js'), 'utf8');
    const release = fs.readFileSync(path.join(root, 'js/premium-release-v55.js'), 'utf8');
    const dashboard = fs.readFileSync(path.join(root, 'js/components/dashboard-wwm-v59.js'), 'utf8');
    const reports = fs.readFileSync(path.join(root, 'js/components/reports-chart-hardening-v55.js'), 'utf8');
    const loginCss = fs.readFileSync(path.join(root, 'css/premium-login-v55.css'), 'utf8');
    const dashboardCss = fs.readFileSync(path.join(root, 'css/wwm-dashboard-v59.css'), 'utf8');
    const serviceWorker = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');

    test('mantém o login WWM proporcional aprovado', () => {
        expect(index).toContain('premium-login-shell');
        expect(index).toContain('css/premium-login-v55.css');
        expect(release).toContain("const RELEASE_VERSION = 'v58-wwm-hardwired'");
        expect(release).toContain('Central operacional AS&amp;TS · Solenis Brasil');
        expect(release).toContain("title.textContent = 'Acesso corporativo'");
        expect(release).toContain('WWM · Warewashing Machine Request');
        expect(loginCss).toContain('width: min(500px, 100%)');
    });

    test('registra dashboard como início real do WWM', () => {
        expect(navigation).toContain("dashboard: { label: 'Início'");
        expect(navigation).toContain("title: 'MENU PRINCIPAL', items: ['dashboard', 'solicitacoes', 'aprovacoes', 'relatorios']");
        expect(navigation).toContain('nav-item-home');
        expect(navigation).not.toContain("dashboard: { pageId: 'solicitacoes' }");
    });

    test('aplica home WWM v59 aprovada e hidratação da base consolidada', () => {
        expect(dashboard).toContain('Visão operacional e financeira');
        expect(dashboard).toContain('Nova solicitação de peça');
        expect(dashboard).toContain('DataManager.syncAll');
        expect(dashboard).toContain('data-dashboard-state="loading"');
        expect(dashboard).toContain('data-dashboard-state="ready"');
        expect(dashboard).toContain("role === 'administrador' || role === 'gestor'");
        expect(dashboard).toContain("'data:updated'");
        expect(release).toContain("window.App.lazyModules.dashboard = `./pages/dashboard-v55.js");
        expect(dashboardCss).toContain('body.wwm-dashboard-v59-active .content-area');
        expect(dashboardCss).toContain('.v59-context-nav');
    });

    test('preserva hardening dos gráficos de relatórios', () => {
        expect(reports).toContain("indexAxis: 'y'");
        expect(reports).toContain('suggestedMax: maximum > 0 ? maximum * 1.12');
        expect(reports).toContain('setChartHeight(canvas, series.labels.length)');
        expect(reports).not.toContain("chart.options.indexAxis = 'y'");
        expect(release).toContain("window.App.lazyModules.relatorios = `./pages/relatorios-v55.js");
    });

    test('publica cache v59 com os ativos críticos', () => {
        expect(serviceWorker).toContain("const CACHE_VERSION = 'v59-approved-exact'");
        [
            './css/premium-login-v55.css',
            './css/wwm-dashboard-v59.css',
            './js/navigation-master-v55.js',
            './js/premium-release-v55.js',
            './js/pages/dashboard-v55.js',
            './js/components/dashboard-wwm-v59.js',
            './js/pages/relatorios-v55.js',
            './js/components/reports-chart-hardening-v55.js'
        ].forEach((asset) => expect(serviceWorker).toContain(`'${asset}'`));
        expect(serviceWorker).toContain("fetch(request, { cache: 'no-store' })");
    });
});
