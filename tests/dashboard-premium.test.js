const fs = require('fs');
const path = require('path');

describe('Dashboard WWM v72 reference layout', () => {
    const root = path.join(__dirname, '..');
    const css = fs.readFileSync(path.join(root, 'css/wwm-dashboard-v59.css'), 'utf8');
    const visualStandard = fs.readFileSync(path.join(root, 'css/wwm-visual-standard.css'), 'utf8');
    const visualArchitecture = fs.readFileSync(path.join(root, 'css/visual-architecture-v72.css'), 'utf8');
    const dashboard = fs.readFileSync(path.join(root, 'js/components/dashboard-wwm-v59.js'), 'utf8');
    const page = fs.readFileSync(path.join(root, 'js/pages/dashboard-v55.js'), 'utf8');
    const serviceWorker = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');

    test('replica a composição visual aprovada sem itens de contrato ou checklist', () => {
        expect(dashboard).toContain('Visão operacional e financeira');
        expect(dashboard).toContain('Nova solicitação');
        expect(dashboard).toContain('Aprovações');
        expect(dashboard).not.toContain('minuta');
        expect(dashboard).not.toContain('checklist');
        expect(dashboard).not.toContain('contrato');
    });

    test('mantém as seções operacionais do modelo de referência', () => {
        expect(dashboard).toContain('v59-hero-toolbar');
        expect(dashboard).toContain('v59-kpi-grid');
        expect(dashboard).toContain('v59-status-grid');
        expect(dashboard).toContain('v59-chart-grid');
        expect(dashboard).toContain('Peças com maior impacto');
        expect(dashboard).toContain('Solicitações recentes');
    });

    test('mantém indicadores, status, gráficos e tabelas do modelo aprovado', () => {
        expect(dashboard).toContain('Custo no período');
        expect(dashboard).toContain('Aguardando aprovação');
        expect(dashboard).toContain('Custo médio');
        expect(dashboard).toContain('Peças movimentadas');
        expect(dashboard).toContain('Evolução do custo mensal');
        expect(dashboard).toContain('Distribuição por status');
        expect(dashboard).toContain('Peças com maior impacto');
        expect(dashboard).toContain('Solicitações recentes');
    });

    test('carrega somente o renderer v59 no entrypoint', () => {
        expect(page).toContain('dashboard-wwm-v59.js?v=20260829e');
        expect(page).not.toContain('wwm-dashboard-v59.css?v=20260829c');
        expect(page).toContain("document.getElementById('wwm-dashboard-v59-styles')?.remove()");
        expect(page).toContain('applyDashboardWwmV59');
        expect(page).not.toContain('applyDashboardWwmV58');
        expect(page).not.toContain('applyDashboardWwmV57');
    });

    test('mantém responsividade histórica sob a arquitetura visual v72', () => {
        expect(css).toContain('body.wwm-dashboard-v59-active .content-area');
        expect(css).toContain('@media (max-width: 680px)');
        expect(visualStandard).toContain('.wwm-page-dashboard .v59-detail-grid');
        expect(visualStandard).toContain('@media (max-width: 760px)');
        expect(visualArchitecture).toContain('@media (max-width: 767px)');
        expect(visualArchitecture).toContain('grid-template-columns: repeat(2, minmax(0, 1fr)) !important');
        expect(serviceWorker).not.toContain("'./css/wwm-dashboard-v59.css'");
        expect(serviceWorker).toContain("'./js/components/dashboard-wwm-v59.js'");
        expect(serviceWorker).toContain("const CACHE_VERSION = 'v75-divisao-solicitacoes'");
        expect(serviceWorker).toContain("'./css/wwm-visual-standard.css'");
        expect(serviceWorker).toContain("'./css/visual-architecture-v72.css'");
    });
});