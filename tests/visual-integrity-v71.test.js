const fs = require('fs');
const path = require('path');

describe('WWM visual integrity v71', () => {
    const root = path.resolve(__dirname, '..');
    const css = fs.readFileSync(path.join(root, 'css/visual-integrity-v71.css'), 'utf8');
    const referenceUi = fs.readFileSync(path.join(root, 'js/wwm-reference-ui.js'), 'utf8');
    const serviceWorker = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');

    test('keeps the integrity stylesheet as the last visual layer', () => {
        expect(referenceUi).toContain('ensureVisualIntegrityLayer');
        expect(referenceUi).toContain("integrityCss.href = 'css/visual-integrity-v71.css?v=20260830a'");
        expect(referenceUi).toContain('visualIntegrityLink');
        expect(referenceUi).toContain('document.head.append(visualIntegrityLink)');
    });

    test('cleans every real visual route class before activating the next page', () => {
        ['wwm-page-dashboard', 'wwm-page-solicitacoes', 'wwm-page-aprovacoes', 'wwm-page-relatorios', 'wwm-page-pecas', 'wwm-page-tecnicos', 'wwm-page-fornecedores', 'wwm-page-sistema', 'wwm-page-fornecedor', 'wwm-page-perfil', 'wwm-page-ajuda', 'wwm-page-historico']
            .forEach((pageClass) => expect(referenceUi).toContain(`'${pageClass}'`));
        expect(referenceUi).toContain('document.body.classList.remove(...pageClasses)');
    });

    test('prevents horizontal document overflow and constrains overlays', () => {
        expect(css).toContain('overflow-x: clip');
        expect(css).toContain('.notification-panel');
        expect(css).toContain('width: min(420px, calc(100vw - 24px))');
        expect(css).toContain('.modal-content');
        expect(css).toContain('width: min(920px, calc(100vw - 24px))');
        expect(css).toContain('overflow-x: auto !important');
        expect(css).toContain('-webkit-overflow-scrolling: touch');
    });

    test('covers notebook, mobile and narrow mobile breakpoints', () => {
        ['@media (max-width: 1180px)', '@media (max-width: 767px)', '@media (max-width: 520px)', '@media (prefers-reduced-motion: reduce)']
            .forEach((query) => expect(css).toContain(query));
        expect(css).toContain('.mobile-nav-buttons');
        expect(css).toContain('.report-tabs-modern');
        expect(css).toContain('.supplier-summary-grid');
    });

    test('keeps supplier actions readable without overlap on desktop and mobile', () => {
        expect(css).toContain('.wwm-page-fornecedor .supplier-actions');
        expect(css).toContain('grid-template-columns: minmax(0, 1fr) !important');
        expect(css).toContain('grid-template-columns: repeat(2, minmax(0, 1fr)) !important');
        expect(css).toContain('white-space: nowrap');
        expect(css).toContain('min-height: 34px !important');
    });

    test('pre-caches every final visual layer under a new cache generation', () => {
        expect(serviceWorker).toContain("const CACHE_VERSION = 'v71-visual-integrity'");
        ['./css/visual-premium-v4.css', './css/desktop-mobile-premium.css', './css/visual-integrity-v71.css']
            .forEach((asset) => expect(serviceWorker).toContain(`'${asset}'`));
    });
});
