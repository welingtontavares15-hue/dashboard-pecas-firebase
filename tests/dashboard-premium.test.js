const fs = require('fs');
const path = require('path');

describe('Dashboard WWM v59 exact', () => {
    const root = path.join(__dirname, '..');
    const css = fs.readFileSync(path.join(root, 'css/wwm-dashboard-v59.css'), 'utf8');
    const dashboard = fs.readFileSync(path.join(root, 'js/components/dashboard-wwm-v59.js'), 'utf8');
    const page = fs.readFileSync(path.join(root, 'js/pages/dashboard-v55.js'), 'utf8');
    const serviceWorker = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');

    test('replica a composição visual aprovada sem itens de contrato ou checklist', () => {
        expect(dashboard).toContain('Visão operacional e financeira');
        expect(dashboard).toContain('Nova solicitação de peça');
        expect(dashboard).toContain('Aprovações');
        expect(dashboard).toContain('Histórico de solicitações');
        expect(dashboard).toContain('Relatórios de custos');
        expect(dashboard).not.toContain('minuta');
        expect(dashboard).not.toContain('checklist');
        expect(dashboard).not.toContain('contrato');
    });

    test('mantém a navegação contextual exatamente como no modelo aprovado', () => {
        expect(dashboard).toContain('Resumo executivo');
        expect(dashboard).toContain('Indicadores');
        expect(dashboard).toContain('Fluxo operacional');
        expect(dashboard).toContain('Custos e tendência');
        expect(dashboard).toContain('Peças de maior impacto');
        expect(dashboard).toContain('Solicitações recentes');
    });

    test('mantém indicadores, status, gráficos e tabelas do modelo aprovado', () => {
        expect(dashboard).toContain('Custo no período');
        expect(dashboard).toContain('Aguardando aprovação');
        expect(dashboard).toContain('Custo médio');
        expect(dashboard).toContain('Peças movimentadas');
        expect(dashboard).toContain('EVOLUÇÃO DO CUSTO MENSAL');
        expect(dashboard).toContain('DISTRIBUIÇÃO POR STATUS');
        expect(dashboard).toContain('PEÇAS COM MAIOR IMPACTO');
        expect(dashboard).toContain('SOLICITAÇÕES RECENTES');
    });

    test('carrega somente o renderer v59 no entrypoint', () => {
        expect(page).toContain('dashboard-wwm-v59.js?v=20260829c');
        expect(page).toContain('wwm-dashboard-v59.css?v=20260829c');
        expect(page).toContain('applyDashboardWwmV59');
        expect(page).not.toContain('applyDashboardWwmV58');
        expect(page).not.toContain('applyDashboardWwmV57');
    });

    test('mantém responsividade e cache v59', () => {
        expect(css).toContain('body.wwm-dashboard-v59-active .content-area');
        expect(css).toContain('.v59-context-nav');
        expect(css).toContain('@media (max-width: 680px)');
        expect(serviceWorker).toContain("'./css/wwm-dashboard-v59.css'");
        expect(serviceWorker).toContain("'./js/components/dashboard-wwm-v59.js'");
        expect(serviceWorker).toContain("const CACHE_VERSION = 'v59-approved-exact'");
    });
});
