const fs = require('fs');
const path = require('path');

describe('Classificação de divisão das solicitações', () => {
    const root = path.resolve(__dirname, '..');
    const patch = fs.readFileSync(path.join(root, 'js/solicitacoes-divisao.js'), 'utf8');
    const auth = fs.readFileSync(path.join(root, 'js/auth.js'), 'utf8');
    const solicitacoesPage = fs.readFileSync(path.join(root, 'js/pages/solicitacoes.js'), 'utf8');
    const aprovacoesPage = fs.readFileSync(path.join(root, 'js/pages/aprovacoes.js'), 'utf8');
    const serviceWorker = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');

    test('exige F&B ou IN em novos pedidos', () => {
        expect(patch).toContain("const VALID = new Set(['F&B', 'IN'])");
        expect(patch).toContain('id="sol-divisao"');
        expect(patch).toContain('Selecione a divisão F&B ou IN antes de enviar a solicitação.');
        expect(patch).toContain('this.currentSolicitation.divisao = division');
    });

    test('administrador pode classificar e reclassificar pedidos históricos', () => {
        expect(auth).toContain("administrador: {");
        expect(auth).toContain("solicitacoes: { view: true, create: true, edit: true, delete: true, viewAll: true }");
        expect(patch).toContain("=== 'administrador'");
        expect(patch).toContain('Editar Divisão - Solicitação');
        expect(patch).toContain('Classificação administrativa de pedido existente.');
        expect(patch).toContain('Somente a Divisão será alterada. Técnico, cliente, peças, valores, datas e status permanecem inalterados.');
        expect(patch).toContain('saveDivisionClassification');
        expect(patch).toContain('divisaoClassificacaoHistorico');
        expect(patch).toContain('divisaoAnterior');
        expect(patch).toContain('divisaoClassificadaEm');
        expect(patch).toContain('divisaoClassificadaPor');
    });

    test('preserva edição normal para perfis que não usam classificação administrativa', () => {
        expect(patch).toContain('if (sol && canClassify(sol)) return this.openDivisionClassifier(id)');
        expect(patch).toContain('return originalOpenForm(id)');
        expect(patch).toContain('Somente o Administrador pode classificar pedidos históricos por divisão.');
    });

    test('mostra ação administrativa na lista e nos detalhes', () => {
        expect(patch).toContain('Editar divisão (Administrador)');
        expect(patch).toContain('data-admin-division-edit');
        expect(patch).toContain('Editar Divisão');
        expect(patch).toContain('Não classificado');
        expect(patch).toContain('Divisao: label(sol.divisao)');
        expect(patch).toContain('data-division-details');
    });

    test('carrega o patch atualizado nas rotas de solicitações e aprovações e no cache PWA', () => {
        expect(solicitacoesPage).toContain('solicitacoes-divisao.js?v=20260903b');
        expect(aprovacoesPage).toContain('solicitacoes-divisao.js?v=20260903b');
        expect(serviceWorker).toContain("'./js/solicitacoes-divisao.js'");
        expect(serviceWorker).toContain("const CACHE_VERSION = 'v75-divisao-solicitacoes'");
    });
});