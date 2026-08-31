const fs = require('fs');
const path = require('path');

describe('Release WWM v72 reference layout', () => {
    const root = path.resolve(__dirname, '..');
    const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    const navigation = fs.readFileSync(path.join(root, 'js/navigation-master-v55.js'), 'utf8');
    const release = fs.readFileSync(path.join(root, 'js/premium-release-v55.js'), 'utf8');
    const referenceUi = fs.readFileSync(path.join(root, 'js/wwm-reference-ui.js'), 'utf8');
    const uiModern = fs.readFileSync(path.join(root, 'js/ui-modern.js'), 'utf8');
    const dashboard = fs.readFileSync(path.join(root, 'js/components/dashboard-wwm-v59.js'), 'utf8');
    const reports = fs.readFileSync(path.join(root, 'js/components/reports-chart-hardening-v55.js'), 'utf8');
    const loginCss = fs.readFileSync(path.join(root, 'css/premium-login-v55.css'), 'utf8');
    const dashboardCss = fs.readFileSync(path.join(root, 'css/wwm-dashboard-v59.css'), 'utf8');
    const referenceCss = fs.readFileSync(path.join(root, 'css/wwm-reference-theme.css'), 'utf8');
    const responsiveCss = fs.readFileSync(path.join(root, 'css/responsive-system.css'), 'utf8');
    const visualCss = fs.readFileSync(path.join(root, 'css/wwm-visual-standard.css'), 'utf8');
    const visualArchitecture = fs.readFileSync(path.join(root, 'css/visual-architecture-v72.css'), 'utf8');
    const serviceWorker = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');

    test('mantém o login WWM proporcional à referência', () => {
        expect(index).toContain('premium-login-shell');
        expect(index).toContain('css/premium-login-v55.css');
        expect(release).toContain("const RELEASE_VERSION = 'v61-wwm-portal-exact'");
        expect(release).toContain('Portal de Peças WWM');
        expect(release).toContain("title.textContent = 'Acesso ao ambiente corporativo'");
        expect(release).toContain('Portal de Solicitação de Peças WWM');
        expect(loginCss).toContain('width: min(500px, 100%)');
        expect(referenceCss).toContain('width: min(850px, 92vw)');
        expect(index).toContain('css/responsive-system.css?v=20260830b');
        expect(responsiveCss).toContain('width: min(720px, calc(100vw - 32px))');
    });

    test('registra dashboard como início real do WWM', () => {
        expect(navigation).toContain("dashboard: { label: 'Visão Geral'");
        expect(navigation).toContain("title: 'PRINCIPAL', items: ['dashboard', 'solicitacoes', 'aprovacoes', 'relatorios']");
        expect(navigation).toContain('nav-item-home');
        expect(navigation).not.toContain("dashboard: { pageId: 'solicitacoes' }");
    });

    test('mantém uma camada visual final autoritativa sobre o portal', () => {
        expect(referenceUi).toContain('keepReferenceThemeLast');
        expect(referenceUi).toContain("document.body.classList.remove('light-mode')");
        expect(referenceUi).toContain('visual-architecture-v72.css');
        expect(referenceUi).not.toContain('visual-integrity-v71.css');
        expect(uiModern).toContain("document.body.classList.contains('wwm-reference-theme')");
        expect(referenceCss).toContain('.premium-dashboard-side-nav');
        expect(referenceCss).toContain('display: none !important');
        expect(referenceCss).not.toContain('background: #eef6f6 !important');
        expect(visualCss).toContain('Contrato visual final e compartilhado do portal');
        expect(visualArchitecture).toContain('WWM Visual Architecture v72');
    });

    test('aplica home WWM v59 aprovada e hidratação da base consolidada', () => {
        expect(dashboard).toContain('Visão operacional e financeira');
        expect(dashboard).toContain('Nova solicitação');
        expect(dashboard).toContain('DataManager.syncAll');
        expect(dashboard).toContain('data-dashboard-state="loading"');
        expect(dashboard).toContain('data-dashboard-state="ready"');
        expect(dashboard).toContain("role === 'administrador' || role === 'gestor'");
        expect(dashboard).toContain("'data:updated'");
        expect(release).toContain("window.App.lazyModules.dashboard = `./pages/dashboard-v55.js");
        expect(dashboardCss).toContain('body.wwm-dashboard-v59-active .content-area');
        expect(referenceCss).toContain('.v59-hero-toolbar');
    });

    test('preserva hardening dos gráficos de relatórios', () => {
        expect(reports).toContain("indexAxis: 'y'");
        expect(reports).toContain('suggestedMax: maximum > 0 ? maximum * 1.12');
        expect(reports).toContain('setChartHeight(canvas, series.labels.length)');
        expect(reports).not.toContain("chart.options.indexAxis = 'y'");
        expect(release).toContain("window.App.lazyModules.relatorios = `./pages/relatorios-v55.js");
    });

    test('publica cache v72 com os ativos críticos e a camada visual final', () => {
        expect(serviceWorker).toContain("const CACHE_VERSION = 'v73-tabelas-resumo'");
        [
            './css/premium-login-v55.css',
            './js/navigation-master-v55.js',
            './js/premium-release-v55.js',
            './js/pages/dashboard-v55.js',
            './js/components/dashboard-wwm-v59.js',
            './js/pages/relatorios-v55.js',
            './js/components/reports-chart-hardening-v55.js',
            './css/wwm-reference-theme.css',
            './css/responsive-system.css',
            './css/brand-slogan.css',
            './css/wwm-visual-standard.css',
            './css/visual-premium-v4.css',
            './css/desktop-mobile-premium.css',
            './css/visual-architecture-v72.css',
            './js/wwm-reference-ui.js'
        ].forEach((asset) => expect(serviceWorker).toContain(`'${asset}'`));
        expect(serviceWorker).not.toContain("'./css/visual-integrity-v71.css'");
        expect(serviceWorker).toContain("fetch(request, { cache: 'no-store' })");
    });
});
