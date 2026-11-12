/**
 * Encaminhamento ao fornecedor.
 *
 * O fornecedor é escolhido na abertura da solicitação. A aprovação em lote
 * pedia um único fornecedor e o gravava em todos os pedidos selecionados, então
 * um pedido aberto para a Hobart era entregue à EBST. Estes testes garantem que
 * nenhuma aprovação troca o fornecedor e cobrem a correção dos pedidos afetados.
 */
const fs = require('fs');
const path = require('path');

const read = (file) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const utilsCode = read('js/utils.js');
const dataCode = read('js/data.js');
const approvalsCode = read('js/aprovacoes.js');

const buildLocalStorage = () => {
    let store = {};
    return {
        getItem: (key) => store[key] || null,
        setItem: (key, value) => { store[key] = String(value); },
        removeItem: (key) => { delete store[key]; },
        clear: () => { store = {}; }
    };
};

const suppliers = () => [
    { id: 'sup-ebst', nome: 'EBST', email: 'pedidos@ebstecnologica.com.br', ativo: true },
    { id: 'sup-hobart', nome: 'Hobart', email: 'pedidos@hobart.com.br', ativo: true }
];

const order = (extra = {}) => ({
    id: 'sol-1', numero: 'REQ-20261112-0001', tecnicoId: 'tec-1', fornecedorId: 'sup-hobart', fornecedorNome: 'Hobart',
    status: 'pendente', createdAt: 1000, updatedAt: 1000,
    itens: [{ codigo: 'HB001', quantidade: 1, valorUnit: 10 }], subtotal: 10, desconto: 0, frete: 0, total: 10,
    timeline: [], audit: { version: 1 }, ...extra
});

const actor = { by: 'Gestor', byUserId: 'gestor-1', byUsername: 'gestor', byRole: 'gestor' };

const load = (role = 'gestor') => {
    const Utils = new Function(`${utilsCode}; return Utils;`)();
    const CloudStorage = { getLastOperationError: jest.fn(() => null) };
    const Auth = {
        currentUser: null,
        getCurrentUser: jest.fn(() => ({ id: 'user-1', name: 'Gestor', username: 'gestor', role })),
        getRole: jest.fn(() => role),
        buildSessionUser: jest.fn((user) => user),
        persistSession: jest.fn(),
        renderMenu: jest.fn()
    };
    const Logger = { CATEGORY: { AUTH: 'auth', REQUEST: 'request', APPROVAL: 'approval' }, info: jest.fn(), warn: jest.fn(), error: jest.fn() };
    const sanitized = dataCode.replace('DataManager.init();', '// DataManager.init();');
    const DataManager = new Function('Utils', 'CloudStorage', 'Auth', 'Logger', `${sanitized}; return DataManager;`)(Utils, CloudStorage, Auth, Logger);
    DataManager.persistCriticalCollection = jest.fn(async (key, list) => { DataManager._sessionCache[key] = list; return true; });
    DataManager.queueOneDriveBackup = jest.fn();
    DataManager.createSolicitationsBackup = jest.fn();
    DataManager._sessionCache[DataManager.KEYS.SUPPLIERS] = suppliers();
    return { DataManager, Utils, Auth, Logger };
};

describe('encaminhamento ao fornecedor', () => {
    beforeEach(() => {
        Object.defineProperty(global, 'localStorage', { value: buildLocalStorage(), configurable: true });
        Object.defineProperty(global, 'navigator', { value: { onLine: true, language: 'pt-BR', userAgent: 'jest' }, configurable: true });
        jest.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
        document.body.innerHTML = '';
    });

    describe('gravação', () => {
        it('a aprovação não troca o fornecedor escolhido na abertura', async () => {
            const { DataManager } = load();
            DataManager._sessionCache[DataManager.KEYS.SOLICITATIONS] = [order()];

            const result = await DataManager.updateSolicitationStatus('sol-1', 'aprovada', { fornecedorId: 'sup-ebst', approvalComment: 'Aprovação em lote', ...actor });

            expect(result.success).toBe(true);
            const saved = DataManager.getSolicitationById('sol-1');
            expect(saved.status).toBe('aprovada');
            expect(saved.fornecedorId).toBe('sup-hobart');
            expect(saved.fornecedorNome).toBe('Hobart');
        });

        it('pedido antigo sem fornecedor recebe o fornecedor informado na aprovação', async () => {
            const { DataManager } = load();
            DataManager._sessionCache[DataManager.KEYS.SOLICITATIONS] = [order({ fornecedorId: '', fornecedorNome: '' })];

            const result = await DataManager.updateSolicitationStatus('sol-1', 'aprovada', { fornecedorId: 'sup-hobart', ...actor });

            expect(result.success).toBe(true);
            expect(DataManager.getSolicitationById('sol-1').fornecedorId).toBe('sup-hobart');
        });

        it('identifica o pedido aprovado que foi parar no fornecedor errado', () => {
            const { DataManager } = load();

            expect(DataManager.getSupplierRoutingMismatch(order({ fornecedorId: 'sup-ebst', fornecedorNome: 'Hobart' })))
                .toEqual({ expectedId: 'sup-hobart', expectedName: 'Hobart', currentId: 'sup-ebst', currentName: 'EBST' });
            expect(DataManager.getSupplierRoutingMismatch(order())).toBeNull();
            expect(DataManager.getSupplierRoutingMismatch(order({ fornecedorId: 'sup-ebst', fornecedorNome: 'EBST' }))).toBeNull();
            // sem nome gravado, ou nome que não identifica um único fornecedor: não conclui nada
            expect(DataManager.getSupplierRoutingMismatch(order({ fornecedorId: 'sup-ebst', fornecedorNome: '' }))).toBeNull();
            expect(DataManager.getSupplierRoutingMismatch(order({ fornecedorId: 'sup-ebst', fornecedorNome: 'EBST / Hobart' }))).toBeNull();
        });

        it('a correção devolve o pedido aprovado ao fornecedor certo e registra no histórico', async () => {
            const { DataManager } = load('administrador');
            DataManager._sessionCache[DataManager.KEYS.SOLICITATIONS] = [order({ status: 'aprovada', fornecedorId: 'sup-ebst', approvedAt: 2000 })];

            const result = await DataManager.updateSolicitationStatus('sol-1', 'aprovada', { supplierCorrection: true, fornecedorId: 'sup-hobart', by: 'Administrador' });

            expect(result.success).toBe(true);
            const saved = DataManager.getSolicitationById('sol-1');
            expect(saved.fornecedorId).toBe('sup-hobart');
            expect(saved.fornecedorNome).toBe('Hobart');
            expect(saved.status).toBe('aprovada');
            expect(saved.approvedAt).toBe(2000);
            expect(saved.audit.version).toBe(2);
            expect(saved.supplierCorrection).toBeUndefined();
            expect(saved.timeline[saved.timeline.length - 1]).toMatchObject({ event: 'supplier_corrected', by: 'Administrador', comment: 'Fornecedor corrigido: EBST → Hobart' });
            expect(DataManager.getSupplierRoutingMismatch(saved)).toBeNull();
        });

        it('a correção não vale para pedido já enviado nem para fornecedor inexistente', async () => {
            const { DataManager } = load('administrador');
            DataManager._sessionCache[DataManager.KEYS.SOLICITATIONS] = [
                order({ status: 'em-transito', fornecedorId: 'sup-ebst', trackingCode: 'BR1' }),
                order({ id: 'sol-2', status: 'aprovada', fornecedorId: 'sup-ebst' })
            ];

            const shipped = await DataManager.updateSolicitationStatus('sol-1', 'em-transito', { supplierCorrection: true, fornecedorId: 'sup-hobart', by: 'Administrador' });
            expect(shipped.success).toBe(false);
            expect(DataManager.getSolicitationById('sol-1').fornecedorId).toBe('sup-ebst');

            const unknown = await DataManager.updateSolicitationStatus('sol-2', 'aprovada', { supplierCorrection: true, fornecedorId: 'sup-inexistente', by: 'Administrador' });
            expect(unknown).toMatchObject({ success: false, error: 'invalid_supplier' });
            expect(DataManager.getSolicitationById('sol-2').fornecedorId).toBe('sup-ebst');
            expect(DataManager.persistCriticalCollection).not.toHaveBeenCalled();
        });
    });

    describe('aprovação em lote', () => {
        const loadApprovals = () => {
            const env = load();
            const { DataManager, Utils, Auth, Logger } = env;
            Utils.generatePDF = jest.fn();
            Utils.showToast = jest.fn();
            Utils.closeModal = jest.fn();
            Utils.showSupplierEmailFailureDialog = jest.fn();
            const App = { currentPage: 'aprovacoes' };
            const AnalyticsHelper = {};
            const Aprovacoes = new Function('Utils', 'DataManager', 'Auth', 'Logger', 'App', 'AnalyticsHelper', `${approvalsCode}; return Aprovacoes;`)(Utils, DataManager, Auth, Logger, App, AnalyticsHelper);
            Aprovacoes.refreshTable = jest.fn();
            Aprovacoes.setActionButtonState = jest.fn();
            Aprovacoes.sendTechnicianApprovalNotification = jest.fn(async () => ({ sentCount: 1, failedCount: 0, totalRecipients: 1 }));
            Aprovacoes.sendSupplierApprovalNotification = jest.fn(async () => ({ sentCount: 1, failedCount: 0, totalRecipients: 1, failures: [] }));
            return { ...env, Aprovacoes };
        };

        it('cada pedido segue para o fornecedor escolhido na abertura', async () => {
            const { DataManager, Aprovacoes } = loadApprovals();
            DataManager._sessionCache[DataManager.KEYS.SOLICITATIONS] = [
                order({ id: 'hob-1', numero: 'REQ-1' }),
                order({ id: 'ebst-1', numero: 'REQ-2', fornecedorId: 'sup-ebst', fornecedorNome: 'EBST' }),
                order({ id: 'hob-2', numero: 'REQ-3' })
            ];
            Aprovacoes.selectedIds = ['hob-1', 'ebst-1', 'hob-2'];

            expect(Aprovacoes.getBatchSupplierRouting(Aprovacoes.selectedIds)).toEqual({
                groups: [{ id: 'sup-hobart', nome: 'Hobart', count: 2 }, { id: 'sup-ebst', nome: 'EBST', count: 1 }],
                withoutSupplier: 0
            });

            await Aprovacoes.confirmBatchApprove();

            expect(DataManager.getSolicitationById('hob-1')).toMatchObject({ status: 'aprovada', fornecedorId: 'sup-hobart' });
            expect(DataManager.getSolicitationById('hob-2')).toMatchObject({ status: 'aprovada', fornecedorId: 'sup-hobart' });
            expect(DataManager.getSolicitationById('ebst-1')).toMatchObject({ status: 'aprovada', fornecedorId: 'sup-ebst' });
            const notified = Aprovacoes.sendSupplierApprovalNotification.mock.calls.map(([sol]) => `${sol.id}:${sol.fornecedorId}`);
            expect(notified).toEqual(['hob-1:sup-hobart', 'ebst-1:sup-ebst', 'hob-2:sup-hobart']);
        });

        it('só pede fornecedor para pedido antigo sem fornecedor, e não altera os demais', async () => {
            const { DataManager, Aprovacoes, Utils } = loadApprovals();
            DataManager._sessionCache[DataManager.KEYS.SOLICITATIONS] = [
                order({ id: 'hob-1' }),
                order({ id: 'old-1', fornecedorId: '', fornecedorNome: '' })
            ];
            Aprovacoes.selectedIds = ['hob-1', 'old-1'];

            await Aprovacoes.confirmBatchApprove();
            expect(Utils.showToast).toHaveBeenCalledWith('Selecione o fornecedor dos pedidos sem fornecedor definido', 'warning');
            expect(DataManager.getSolicitationById('hob-1').status).toBe('pendente');

            document.body.innerHTML = '<select id="batch-supplier"><option value="sup-ebst" selected>EBST</option></select>';
            await Aprovacoes.confirmBatchApprove();

            expect(DataManager.getSolicitationById('hob-1')).toMatchObject({ status: 'aprovada', fornecedorId: 'sup-hobart' });
            expect(DataManager.getSolicitationById('old-1')).toMatchObject({ status: 'aprovada', fornecedorId: 'sup-ebst' });
        });

        it('a janela do lote não oferece mais um fornecedor único para todos os pedidos', () => {
            expect(approvalsCode).toContain('Cada pedido segue para o fornecedor escolhido na abertura');
            expect(approvalsCode).toContain('routing.withoutSupplier > 0 ? `');
            expect(approvalsCode).not.toContain("document.getElementById('batch-supplier').value");
        });
    });

    describe('e-mail ao fornecedor', () => {
        it('explica quando o endereço ainda não foi ativado no serviço de envio', () => {
            const { Utils } = load();
            const message = Utils.getOperationalEmailFailureMessage({
                reason: 'provider_negative_ack',
                providerMessage: 'This form needs Activation. We\'ve sent you an email containing an \'Activate Form\' link.'
            });
            expect(message).toContain('ainda não foi ativado');
            expect(message).toContain('Activate Form');
        });

        it('lista cada envio não entregue com fornecedor, pedido, endereço e motivo', () => {
            const { Utils } = load();
            const approved = order({ status: 'aprovada' });
            const failures = Utils.collectSupplierEmailFailures({
                supplierName: 'Hobart',
                results: [
                    { success: true, recipientEmail: 'ok@hobart.com.br' },
                    { success: false, recipientEmail: 'pedidos@hobart.com.br', reason: 'timeout' }
                ]
            }, approved);

            expect(failures).toEqual([{
                solicitationId: 'sol-1', numero: 'REQ-20261112-0001', supplierName: 'Hobart',
                recipient: 'pedidos@hobart.com.br', message: 'o provedor de e-mail excedeu o tempo limite de resposta.'
            }]);
        });

        it('avisa quando o fornecedor está sem e-mail cadastrado', () => {
            const { Utils, DataManager } = load();
            DataManager._sessionCache[DataManager.KEYS.SUPPLIERS] = [{ id: 'sup-hobart', nome: 'Hobart', email: '', ativo: true }];
            globalThis.DataManager = DataManager;
            try {
                const failures = Utils.collectSupplierEmailFailures({ reason: 'missing_supplier_email_configuration', results: [] }, order({ status: 'aprovada' }));
                expect(failures).toHaveLength(1);
                expect(failures[0]).toMatchObject({ supplierName: 'Hobart', recipient: null });
                expect(failures[0].message).toContain('sem e-mail cadastrado');
            } finally {
                delete globalThis.DataManager;
            }
        });

        it('o aviso de falha fica na tela e o gestor pode reenviar pelo pedido', () => {
            expect(utilsCode).toContain('<h3>Fornecedor não recebeu o e-mail</h3>');
            expect(approvalsCode).toContain('Utils.showSupplierEmailFailureDialog(failures)');
            expect(read('js/solicitacoes.js')).toContain('Utils.resendSupplierApprovalEmail(');
            expect(read('js/solicitacoes.js')).toContain('Utils.correctSolicitationSupplier(');
        });
    });
});
