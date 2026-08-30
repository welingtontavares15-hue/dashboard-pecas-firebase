const fs = require('fs');
const path = require('path');

describe('WWM global responsive system', () => {
    const root = path.resolve(__dirname, '..');
    const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    const css = fs.readFileSync(path.join(root, 'css/responsive-system.css'), 'utf8');
    const solicitacoes = fs.readFileSync(path.join(root, 'js/solicitacoes.js'), 'utf8');
    const referenceUi = fs.readFileSync(path.join(root, 'js/wwm-reference-ui.js'), 'utf8');

    test('loads the authoritative responsive layer last', () => {
        const referenceIndex = index.indexOf('css/wwm-reference-theme.css');
        const responsiveIndex = index.indexOf('css/responsive-system.css');
        expect(referenceIndex).toBeGreaterThan(-1);
        expect(responsiveIndex).toBeGreaterThan(referenceIndex);
        expect(referenceUi).toContain('document.head.append(referenceLink, responsiveLink)');
    });

    test('keeps dropdowns above following cards without clipping', () => {
        expect(css).toContain('.premium-multi-filter.open');
        expect(css).toContain('overflow: visible !important');
        expect(css).toContain('z-index: 950 !important');
        expect(css).toContain('overscroll-behavior: contain');
    });

    test('keeps every required solicitation column reachable', () => {
        ['<th>Nº</th>', '<th>Técnico</th>', '<th>Cliente</th>', '<th>Peça</th>', '<th>Valor</th>', '<th>Status</th>', '<th>Data</th>', '<th>Ações</th>']
            .forEach((header) => expect(solicitacoes).toContain(header));
        expect(css).toContain('width: max(100%, 1080px)');
        expect(css).toContain('position: sticky');
        expect(css).toContain('overflow-x: auto !important');
    });

    test('covers desktop, tablet, mobile and short-height viewports', () => {
        ['@media (max-width: 1440px)', '@media (max-width: 1180px)', '@media (max-width: 760px)', '@media (max-width: 520px)', '@media (max-height: 700px)']
            .forEach((query) => expect(css).toContain(query));
        expect(css).toContain('@media (prefers-reduced-motion: reduce)');
    });
});
