const fs = require('fs');
const path = require('path');

const read = (file) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

describe('Relatórios v2 (reports-insights)', () => {
    const insights = read('js/components/reports-insights.js');
    const loader = read('js/pages/relatorios-v55.js');

    test('é carregado por último, depois das demais camadas de relatórios', () => {
        expect(loader).toMatch(/import \{ applyReportsInsights \} from '\.\.\/components\/reports-insights\.js\?v=[0-9a-z]+'/);
        const calls = loader.slice(loader.indexOf('function applyEnhancements'));
        expect(calls.indexOf('applyReportsChartHardeningV55()')).toBeLessThan(calls.indexOf('applyReportsInsights()'));
    });

    test('cada gráfico aparece em uma única sub-aba (sem repetição entre abas)', () => {
        const ids = insights.match(/chartBox\('([a-zA-Z]+)'/g).map((match) => match.replace("chartBox('", '').replace("'", ''));
        expect(new Set(ids).size).toBe(ids.length);
        // A Visão Geral não repete as tabelas completas das outras sub-abas.
        const overview = insights.slice(insights.indexOf('function renderOverview'), insights.indexOf('function renderParts'));
        expect(overview).not.toContain('<table');
    });

    test('usa os formatos adequados: Pareto para peças, média geral para técnicos, barras + volume para meses', () => {
        expect(insights).toContain('riParetoChart');
        expect(insights).toContain("yAxisID: 'y1'");
        expect(insights).toContain('averageLine: Number(analysis.costPerAttendance)');
        expect(insights).toContain("label: 'Solicitações'");
    });

    test('não recalcula números: tudo vem de buildCostAnalysis/getFilteredSolicitations', () => {
        expect(insights).toContain('relatorios.buildCostAnalysis()');
        expect(insights).not.toMatch(/DataManager\.getSolicitations\(/);
    });

    test('mantém os exportadores existentes', () => {
        ['exportCustos', 'exportPecas', 'exportTecnicos'].forEach((name) => expect(insights).toContain(`Relatorios.${name}()`));
    });
});

describe('Relatórios: custo respeita os filtros de seleção múltipla', () => {
    const multi = read('js/components/reports-multi-select.js');
    const division = read('js/components/reports-division-filter.js');

    test('o recálculo por data de aprovação recebe os registros já filtrados', () => {
        expect(multi).toContain('allRecords: costScopeRecords');
        expect(multi).toContain('Relatorios.applyPremiumMultiFilters = function');
    });

    test('o filtro de Divisão reaplica os filtros múltiplos antes de calcular o custo', () => {
        expect(division).toContain('this.applyPremiumMultiFilters(divisionRecords)');
    });
});
