const fs = require('fs');
const path = require('path');

describe('WWM Smart Layout v67', () => {
    const root = path.resolve(__dirname, '..');
    const css = fs.readFileSync(path.join(root, 'css/wwm-smart-layout.css'), 'utf8');
    const runtime = fs.readFileSync(path.join(root, 'js/wwm-smart-layout.js'), 'utf8');
    const referenceUi = fs.readFileSync(path.join(root, 'js/wwm-reference-ui.js'), 'utf8');
    const serviceWorker = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');

    test('carrega a camada inteligente depois do contrato visual autoritativo', () => {
        expect(referenceUi).toContain("smartCss.href = 'css/wwm-smart-layout.css?v=20260830a'");
        expect(referenceUi).toContain("smartScript.src = 'js/wwm-smart-layout.js?v=20260830a'");
        expect(referenceUi).toContain('document.head.append(smartLayoutLink)');
        expect(serviceWorker).toContain("'./css/wwm-smart-layout.css'");
        expect(serviceWorker).toContain("'./js/wwm-smart-layout.js'");
    });

    test('define densidade adaptativa para desktop amplo, standard e compacto', () => {
        expect(runtime).toContain("width >= 1600 ? 'comfortable'");
        expect(runtime).toContain("width < 1180 ? 'compact' : 'standard'");
        expect(css).toContain('data-wwm-density="comfortable"');
        expect(css).toContain('data-wwm-density="compact"');
    });

    test('unifica filtros de relatorios sem recriar os controles nem seus ids', () => {
        expect(runtime).toContain('normalizeReportFilters');
        expect(runtime).toContain('[...primary.children, ...secondary.children]');
        expect(runtime).toContain("shell.classList.add('wwm-filters-unified')");
        expect(css).toContain('.wwm-smart-filter-grid');
        expect(css).toContain('grid-template-columns: repeat(5, minmax(0, 1fr))');
    });

    test('impede quebra de identificadores, datas, valores e numeros curtos', () => {
        expect(css).toContain('.wwm-cell-id, .wwm-cell-date, .wwm-cell-money, .wwm-cell-number');
        expect(css).toContain('white-space: nowrap !important');
        expect(css).toContain('font-variant-numeric: tabular-nums');
        expect(runtime).toContain('cleanMidnight');
    });

    test('trata tabelas de overview como compactas e remove coluna auxiliar somente no resumo', () => {
        expect(runtime).toContain("table.classList.add('wwm-parts-overview-table')");
        expect(runtime).toContain("row.children[5]?.classList.add('wwm-column-auxiliary')");
        expect(css).toContain('.wwm-table--overview .wwm-column-auxiliary');
        expect(css).toContain('display: none !important');
        expect(css).toContain('.wwm-parts-overview-table th:nth-child(1) { width: 38%; }');
    });

    test('historico atualiza painel contextual por clique e teclado', () => {
        expect(runtime).toContain('selectHistoryRow');
        expect(runtime).toContain("row.setAttribute('role', 'button')");
        expect(runtime).toContain("event.key === 'Enter' || event.key === ' '");
        expect(runtime).toContain('Relatorios.renderHistoryDetail(sol)');
        expect(runtime).toContain('wwm-history-context-item');
        expect(css).toContain('.wwm-history-context');
        expect(css).toContain('.wwm-history-state-note.is-rejected');
    });

    test('historico e relatorios removem altura artificial e preenchem largura util', () => {
        expect(css).toContain('.wwm-history-summary-grid');
        expect(css).toContain('grid-template-columns: repeat(4, minmax(0, 1fr)) !important');
        expect(css).toContain('.reports-two-column > .report-panel-card');
        expect(css).toContain('height: auto !important');
        expect(css).toContain('.wwm-history-grid');
        expect(css).toContain('grid-template-columns: minmax(0, 1.7fr) minmax(330px, .9fr) !important');
    });

    test('dashboard ocupa espaco de forma contextual sem criar dados inexistentes', () => {
        expect(runtime).toContain('dashboardInsightFromRows');
        expect(runtime).toContain('Maior impacto');
        expect(runtime).toContain('Custo dos itens exibidos');
        expect(runtime).toContain('rows.reduce');
        expect(css).toContain('.wwm-dashboard-insight');
    });

    test('preserva responsividade e scroll somente quando o viewport exige', () => {
        ['@media (max-width: 1320px)', '@media (max-width: 980px)', '@media (max-width: 620px)']
            .forEach((query) => expect(css).toContain(query));
        expect(css).toContain('overflow-x: auto !important');
        expect(css).toContain('min-width: 760px !important');
    });

    test('padroniza menu de acoes secundarias sem branco divergente', () => {
        expect(css).toContain('.actions .premium-row-menu > summary');
        expect(css).toContain('background: rgba(0, 55, 62, .42) !important');
        expect(css).toContain('border-radius: 8px !important');
        expect(css).toContain('width: 34px');
        expect(css).toContain('height: 34px');
    });
});
