const fs = require('fs');
const path = require('path');

describe('WWM visual architecture v72', () => {
    const root = path.resolve(__dirname, '..');
    const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    const css = fs.readFileSync(path.join(root, 'css/visual-architecture-v72.css'), 'utf8');
    const referenceUi = fs.readFileSync(path.join(root, 'js/wwm-reference-ui.js'), 'utf8');
    const serviceWorker = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');

    test('makes v72 explicit in the HTML entrypoint and keeps JS as ordering fallback', () => {
        expect(index).toContain('css/visual-architecture-v72.css?v=20260830b');
        expect(index).toContain('data-wwm-visual-architecture="true"');
        expect(index.indexOf('css/visual-premium-v4.css')).toBeLessThan(index.indexOf('css/visual-architecture-v72.css'));
        expect(index).toContain('js/wwm-reference-ui.js?v=20260830b');
        expect(referenceUi).toContain('ensureVisualArchitectureLayer');
        expect(referenceUi).toContain('visualArchitectureLink');
        expect(referenceUi).toContain('document.head.append(visualArchitectureLink)');
        expect(referenceUi).toContain("data-visual-architecture', 'v72'");
        expect(referenceUi).not.toContain('visual-integrity-v71.css');
    });

    test('preserves every page class while changing only presentation', () => {
        ['wwm-page-dashboard', 'wwm-page-solicitacoes', 'wwm-page-aprovacoes', 'wwm-page-relatorios', 'wwm-page-pecas', 'wwm-page-tecnicos', 'wwm-page-fornecedores', 'wwm-page-sistema', 'wwm-page-fornecedor', 'wwm-page-perfil', 'wwm-page-ajuda', 'wwm-page-historico']
            .forEach((pageClass) => expect(referenceUi).toContain(`'${pageClass}'`));
        expect(referenceUi).toContain('document.body.classList.remove(...pageClasses)');
    });

    test('removes the narrow-mobile KPI regression and preserves solicitation actions', () => {
        expect(css).toContain('@media (max-width: 520px)');
        expect(css).toContain('v72 intentionally keeps KPI grids at two columns');
        expect(css).toContain('grid-template-columns: repeat(2, minmax(0, 1fr)) !important');
        expect(css).toContain('.wwm-page-solicitacoes .page-actions');
        expect(css).toContain('grid-template-columns: minmax(0, 1fr) auto auto !important');
    });

    test('keeps sync accessible on mobile and improves touch targets', () => {
        expect(css).toContain('.sync-status');
        expect(css).toContain('display: flex !important');
        expect(css).toContain('min-width: 40px !important');
        expect(css).toContain('min-height: 40px !important');
    });

    test('separates destructive system actions visually', () => {
        expect(css).toContain('.wwm-page-sistema .card:has(.btn-danger)');
        expect(css).toContain('border-color: color-mix');
        expect(css).toContain('.wwm-page-sistema .card:has(.btn-danger) .btn-group');
    });

    test('keeps document and overlay containment across device sizes', () => {
        expect(css).toContain('overflow-x: clip');
        expect(css).toContain('overflow-x: auto !important');
        expect(css).toContain('-webkit-overflow-scrolling: touch');
        expect(css).toContain('width: min(420px, calc(100vw - 24px))');
        expect(css).toContain('width: min(920px, calc(100vw - 24px))');
        ['@media (max-width: 1180px)', '@media (max-width: 767px)', '@media (max-width: 520px)', '@media (max-width: 360px)', '@media (prefers-reduced-motion: reduce)']
            .forEach((query) => expect(css).toContain(query));
    });

    test('pre-caches the authoritative visual layer under v72', () => {
        expect(serviceWorker).toContain("const CACHE_VERSION = 'v72-visual-architecture'");
        expect(serviceWorker).toContain("'./css/visual-architecture-v72.css'");
        expect(serviceWorker).not.toContain("'./css/visual-integrity-v71.css'");
    });
});
