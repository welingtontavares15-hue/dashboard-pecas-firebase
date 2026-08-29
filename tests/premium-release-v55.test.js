const fs = require('fs');
const path = require('path');

describe('Release WWM v57', () => {
    const root = path.resolve(__dirname, '..');
    const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    const navigation = fs.readFileSync(path.join(root, 'js/navigation-master-v55.js'), 'utf8');
    const release = fs.readFileSync(path.join(root, 'js/premium-release-v55.js'), 'utf8');
    const dashboard = fs.readFileSync(path.join(root, 'js/components/dashboard-wwm-v57.js'), 'utf8');
    const reports = fs.readFileSync(path.join(root, 'js/components/reports-chart-hardening-v55.js'), 'utf8');
    const loginCss = fs.readFileSync(path.join(root, 'css/premium-login-v55.css'), 'utf8');
    const dashboardCss = fs.readFileSync(path.join(root, 'css/wwm-dashboard-v57.css'), 'utf8');
    const serviceWorker = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');

    test('mantém o login WWM proporcional aprovado', () => {
        expect(index).toContain('premium-login-shell');
        expect(index).toContain('css/premium-login-v55.css?v=20260828e');
        expect(release).toContain("const RELEASE_VERSION = 'v57-wwm-dashboard'");
        expect(release).toContain('Central operacional AS&amp;TS · Solenis Brasil');
        expect(release).toContain("title.textContent = 'Acesso corporativo'");
        expect(release).toContain('WWM · Warewashing Machine Request');
        expect(loginCss).toContain('width: min(500px, 100%)');
    });

    test('registra dashboard como rota real e retorno permanente pela lateral global', () => {
        expect(navigation).toContain("dashboard: { label: 'Visão Operacional'");
        expect(navigation).toContain("title: 'VISÃO OPERACIONAL', items: ['dashboard']");
        expect(navigation).toContain('nav-item-home');
        expect(navigation).not.toContain("dashboard: { pageId: 'solicitacoes' }");
    });

    test('aplica a home WWM e corrige o carregamento pós-sincronização', () => {
        expect(dashboard).toContain('WAREWASHING MACHINE REQUEST');
        expect(dashboard).toContain('DataManager.syncAll');
        expect(dashboard).toContain('data-dashboard-state="loading"');
        expect(dashboard).toContain('data-dashboard-state="ready"');
        expect(dashboard).toContain("'data:updated'");
        expect(release).toContain("App.lazyModules.dashboard = `./pages/dashboard-v55.js");
        expect(dashboardCss).toContain('body.wwm-dashboard-active .content-area');
        expect(dashboardCss).toContain('background: #006e66');
    });

    test('preserva o hardening dos gráficos dos relatórios', () => {
        expect(reports).toContain("indexAxis: 'y'");
        expect(reports).toContain('suggestedMax: maximum > 0 ? maximum * 1.12');
        expect(reports).toContain('setChartHeight(canvas, series.labels.length)');
        expect(reports).not.toContain("chart.options.indexAxis = 'y'");
        expect(release).toContain("App.lazyModules.relatorios = `./pages/relatorios-v55.js");
    });

    test('publica cache v57 com os ativos críticos', () => {
        expect(serviceWorker).toContain("const CACHE_VERSION = 'v57-wwm-dashboard'");
        [
            './css/premium-login-v55.css',
            './css/wwm-dashboard-v57.css',
            './js/navigation-master-v55.js',
            './js/premium-release-v55.js',
            './js/pages/dashboard-v55.js',
            './js/components/dashboard-wwm-v57.js',
            './js/pages/relatorios-v55.js',
            './js/components/reports-chart-hardening-v55.js'
        ].forEach((asset) => expect(serviceWorker).toContain(`'${asset}'`));
        expect(serviceWorker).toContain("fetch(request, { cache: 'no-store' })");
    });
});
