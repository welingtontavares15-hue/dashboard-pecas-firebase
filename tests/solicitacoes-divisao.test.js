const fs = require('fs');
const path = require('path');

describe('Classificação de divisão das solicitações', () => {
    const root = path.resolve(__dirname, '..');
    const patch = fs.readFileSync(path.join(root, 'js/solicitacoes-divisao.js'), 'utf8');
    const solicitacoesPage = fs.readFileSync(path.join(root, 'js/pages/solicitacoes.js'), 'utf8');
    const aprovacoesPage = fs.readFileSync(path.join(root, 'js/pages/aprovacoes.js'), 'utf8');
    const serviceWorker = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');

    test('exige F&B ou IN em novos pedidos', () => {
        expect(patch).toContain("const VALID = new Set(['F&B', 'IN'])");
        expect(patch).toContain('id="sol-divisao"');
        expect(patch).toContain('Selecione a divisão F&B ou IN antes de enviar a solicitação.');
        expect(patch).toContain('this.currentSolicitation.divisao = division');
    });

    test('transforma a edição de pedidos existentes em classificação somente da divisão', () => {
        expect(patch).toContain('if (id) return this.openDivisionClassifier(id)');
        expect(patch).toContain('somente a divisão será alterada');
        expect(patch).toContain('saveDivisionClassification');
        expect(patch).toContain('divisaoClassificacaoHistorico');
        expect(patch).toContain('divisaoClassificadaEm');
        expect(patch).toContain('divisaoClassificadaPor');
    });

    test('mostra a divisão na consulta e inclui na exportação', () => {
        expect(patch).toContain('Não classificado');
        expect(patch).toContain('Classificar divisão');
        expect(patch).toContain('Divisao: label(sol.divisao)');
        expect(patch).toContain('data-division-details');
    });

    test('carrega o patch nas rotas de solicitações e aprovações e no cache PWA', () => {
        expect(solicitacoesPage).toContain('solicitacoes-divisao.js?v=20260903a');
        expect(aprovacoesPage).toContain('solicitacoes-divisao.js?v=20260903a');
        expect(serviceWorker).toContain("'./js/solicitacoes-divisao.js'");
        expect(serviceWorker).toContain("const CACHE_VERSION = 'v75-divisao-solicitacoes'");
    });
});