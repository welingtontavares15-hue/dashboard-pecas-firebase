const fs = require('fs');
const path = require('path');

describe('Exclusão administrativa de solicitações rejeitadas de teste', () => {
    const code = fs.readFileSync(path.join(__dirname, '../js/solicitacoes-rejected-delete.js'), 'utf8');

    function loadPatch({ role = 'administrador', canDelete = true, status = 'rejeitada' } = {}) {
        const solicitation = { id: 'REQ-ID-1', numero: 'REQ-20260904-0001', status };
        global.DataManager = {
            normalizeWorkflowStatus: (value) => String(value || '').trim().toLowerCase(),
            getSolicitationById: jest.fn(() => solicitation),
            deleteSolicitation: jest.fn().mockResolvedValue({ success: true })
        };
        global.Auth = {
            getRole: jest.fn(() => role),
            hasPermission: jest.fn((_module, permission) => permission === 'delete' && canDelete),
            renderMenu: jest.fn()
        };
        global.Utils = {
            escapeHtml: (value) => String(value ?? ''),
            confirm: jest.fn().mockResolvedValue(true),
            showToast: jest.fn()
        };
        global.App = { currentPage: 'solicitacoes' };
        global.Solicitacoes = {
            isDeleteSubmitting: false,
            renderDivisionEditAction: jest.fn(() => ''),
            refreshTable: jest.fn()
        };
        window.Solicitacoes = global.Solicitacoes;
        window.eval(code);
        window.SolicitacoesRejectedDeletePatch.patch();
        return { solicitation };
    }

    afterEach(() => {
        delete window.SolicitacoesRejectedDeletePatch;
        delete window.Solicitacoes;
        delete global.Solicitacoes;
        delete global.DataManager;
        delete global.Auth;
        delete global.Utils;
        delete global.App;
        jest.clearAllMocks();
    });

    test('exibe a lixeira apenas para administrador com permissão e pedido rejeitado', () => {
        const { solicitation } = loadPatch();
        expect(Solicitacoes.renderDivisionEditAction(solicitation)).toContain('data-rejected-test-delete="true"');
        expect(Solicitacoes.renderDivisionEditAction(solicitation)).toContain('confirmRejectedTestDelete');
    });

    test.each([
        ['gestor', true, 'rejeitada'],
        ['tecnico', true, 'rejeitada'],
        ['administrador', false, 'rejeitada'],
        ['administrador', true, 'aprovada'],
        ['administrador', true, 'em-transito'],
        ['administrador', true, 'finalizada']
    ])('não expõe exclusão para role=%s delete=%s status=%s', (role, canDelete, status) => {
        const { solicitation } = loadPatch({ role, canDelete, status });
        expect(Solicitacoes.renderDivisionEditAction(solicitation)).not.toContain('data-rejected-test-delete="true"');
    });

    test('exige duas confirmações antes de excluir e reutiliza o backup do DataManager', async () => {
        loadPatch();
        const result = await Solicitacoes.confirmRejectedTestDelete('REQ-ID-1');

        expect(result).toBe(true);
        expect(Utils.confirm).toHaveBeenCalledTimes(2);
        expect(DataManager.deleteSolicitation).toHaveBeenCalledTimes(1);
        expect(DataManager.deleteSolicitation).toHaveBeenCalledWith('REQ-ID-1');
        expect(Solicitacoes.refreshTable).toHaveBeenCalledTimes(1);
        expect(Utils.showToast).toHaveBeenCalledWith('Solicitação rejeitada de teste excluída com sucesso', 'success');
    });

    test('cancela sem excluir quando a segunda confirmação é recusada', async () => {
        loadPatch();
        Utils.confirm
            .mockResolvedValueOnce(true)
            .mockResolvedValueOnce(false);

        const result = await Solicitacoes.confirmRejectedTestDelete('REQ-ID-1');

        expect(result).toBe(false);
        expect(DataManager.deleteSolicitation).not.toHaveBeenCalled();
    });

    test('bloqueia chamada direta quando o pedido não está rejeitado', async () => {
        loadPatch({ status: 'aprovada' });
        const result = await Solicitacoes.confirmRejectedTestDelete('REQ-ID-1');

        expect(result).toBe(false);
        expect(Utils.confirm).not.toHaveBeenCalled();
        expect(DataManager.deleteSolicitation).not.toHaveBeenCalled();
    });
});
