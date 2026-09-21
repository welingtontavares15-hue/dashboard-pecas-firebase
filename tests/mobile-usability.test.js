const fs = require('fs');
const path = require('path');

const read = (file) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

describe('mobile usability contract', () => {
    test('keeps app and service-worker release versions aligned', () => {
        const config = read('js/config.js');
        const serviceWorker = read('service-worker.js');
        const appVersion = config.match(/version:\s*'([^']+)'/)?.[1];
        const cacheVersion = serviceWorker.match(/const CACHE_VERSION = '([^']+)'/)?.[1];

        expect(appVersion).toBe('v77-mobile-usability');
        expect(cacheVersion).toBe(appVersion);
    });

    test('loads the device refinement after visual architecture for first paint', () => {
        const html = read('index.html');
        const architecture = html.indexOf('css/visual-architecture-v72.css');
        const device = html.indexOf('css/desktop-mobile-premium.css?v=20260920a');

        expect(architecture).toBeGreaterThan(-1);
        expect(device).toBeGreaterThan(architecture);
        expect(html).toContain('viewport-fit=cover');
        expect(html).toContain('interactive-widget=resizes-content');
    });

    test('keeps the runtime stylesheet ordering consistent with the HTML', () => {
        const runtime = read('js/wwm-reference-ui.js');
        const expected = 'premiumVisualLink, visualArchitectureLink, deviceLayoutLink';

        expect(runtime).toContain("desktop-mobile-premium.css?v=20260920a");
        expect(runtime).toContain(expected);
    });

    test('provides phone-safe touch, form, modal and adaptive-table rules', () => {
        const css = read('css/desktop-mobile-premium.css');

        expect(css).toContain('MOBILE USABILITY V73');
        expect(css).toContain('env(safe-area-inset-top)');
        expect(css).toContain('font-size: 16px !important');
        expect(css).toContain('min-height: 44px !important');
        expect(css).toContain('.wwm-page-aprovacoes');
        expect(css).toContain('.table-container.corporate-adaptive-table');
        expect(css).toContain('grid-template-columns: minmax(92px, 34%) minmax(0, 1fr)');
    });

    test('prevents nested report KPI grids from collapsing on phones', () => {
        const css = read('css/desktop-mobile-premium.css');

        expect(css).toContain('REPORTS MOBILE HOTFIX');
        expect(css).toContain('.wwm-page-relatorios .page-kpis');
        expect(css).toContain('grid-template-columns: none !important');
        expect(css).toContain('.wwm-page-relatorios .reports-summary-grid');
        expect(css).toContain('grid-template-columns: minmax(0, 1fr) !important');
        expect(css).toContain('.wwm-page-relatorios .report-summary-card');
        expect(css).toContain('word-break: normal !important');
        expect(css).toContain('.wwm-page-relatorios .report-tabs-modern');
        expect(css).toContain('overflow-x: auto !important');
    });

    test('keeps mobile menu accessibility state synchronized', () => {
        const html = read('index.html');
        const app = read('js/app.js');

        expect(html).toContain('id="mobile-menu-btn"');
        expect(html).toContain('aria-controls="sidebar"');
        expect(html).toContain('aria-expanded="false"');
        expect(app).toContain("mobileMenuBtn.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false')");
        expect(app).toContain("document.body.classList.contains('sidebar-open')");
    });
});
