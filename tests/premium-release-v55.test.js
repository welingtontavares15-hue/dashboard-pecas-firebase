const fs = require('fs');
const path = require('path');

describe('Release premium v55 + WWM reference v56', () => {
    const root = path.resolve(__dirname, '..');
    const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    const navigation = fs.readFileSync(path.join(root, 'js/navigation-master-v55.js'), 'utf8');
    const release = fs.readFileSync(path.join(root, 'js/premium-release-v55.js'), 'utf8');
    const dashboard = fs.readFileSync(path.join(root, 'js/components/dashboard-premium-v55.js'), 'utf8');
    const reports = fs.readFileSync(path.join(root, 'js/components/reports-chart-hardening-v55.js'), 'utf8');
    const loginCss = fs.readFileSync(path.join(root, 'css/premium-login-v55.css'), 'utf8');
    const serviceWorker = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');

    test('mantém a estrutura de autenticação e aplica a referência visual oficial do WWM', () => {
        expect(index).toContain('premium-login-shell');
        expect(index).toContain('css/premium-login-v55.css?v=20260828c');
        expect(release).toContain("const RELEASE_VERSION = 'v56-wwm-reference-login'");
        expect(release).toContain('Central operacional AS&amp;TS · Solenis Brasil');
        expect(release).toContain("title.textContent = 'Acesso ao ambiente corporativo'");
        expect(release).toContain('WWM · Warewashing Machine Request');
        expect(release).toContain('Acesso indisponível? Solicite a liberação ao administrador.');
        expect(loginCss).toContain('background: #006e66 !important');
        expect(loginCss).toContain('background: #08111f');
        expect(loginCss).toContain('#login-screen .login-brand-panel');
        expect(loginCss).toContain('display: none !important');
    });

    test('registra dashboard como rota real e botão permanente da visão operacional', () => {
        expect(navigation).toContain("dashboard: { label: 'Visão Operacional'");
        expect(navigation).toContain("title: 'VISÃO OPERACIONAL', items: ['dashboard']");
        expect(navigation).toContain('nav-item-home');
        expect(navigation).toContain('nav-group-pinned');
        expect(navigation).not.toContain("dashboard: { pageId: 'solicitacoes' }");
        expect(index).toContain('js/navigation-master-v55.js?v=20260828c');
    });

    test('corrige o carregamento e a atualização da visão operacional', () => {
        expect(dashboard).toContain('AnalyticsHelper.buildOperationalAnalysis');
        expect(dashboard).toContain('data-dashboard-source-count');
        expect(dashboard).toContain('data-dashboard-period-count');
        expect(dashboard).toContain('data-dashboard-state="loading"');
        expect(dashboard).toContain("Auth.renderMenu('dashboard')");
        expect(dashboard).toContain("'data:updated'");
        expect(release).toContain("App.lazyModules.dashboard = `./pages/dashboard-v55.js");
    });

    test('cria gráficos de ranking horizontalmente desde a inicialização', () => {
        expect(reports).toContain("indexAxis: 'y'");
        expect(reports).toContain('suggestedMax: maximum > 0 ? maximum * 1.12');
        expect(reports).toContain('setChartHeight(canvas, series.labels.length)');
        expect(reports).toContain("'reportTechnicianCostChart'");
        expect(reports).not.toContain("chart.options.indexAxis = 'y'");
        expect(release).toContain("App.lazyModules.relatorios = `./pages/relatorios-v55.js");
    });

    test('publica uma versão de cache nova com todos os ativos críticos', () => {
        expect(serviceWorker).toContain("const CACHE_VERSION = 'v56-wwm-reference-login'");
        [
            './css/premium-login-v55.css',
            './css/premium-release-v55.css',
            './js/navigation-master-v55.js',
            './js/premium-release-v55.js',
            './js/pages/dashboard-v55.js',
            './js/pages/relatorios-v55.js',
            './js/components/dashboard-premium-v55.js',
            './js/components/reports-chart-hardening-v55.js'
        ].forEach((asset) => expect(serviceWorker).toContain(`'${asset}'`));
        expect(serviceWorker).toContain("fetch(request, { cache: 'no-store' })");
    });
});
