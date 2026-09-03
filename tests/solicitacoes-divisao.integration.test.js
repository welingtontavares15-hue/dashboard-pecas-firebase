const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const solicitacoesCode = fs.readFileSync(path.join(projectRoot, 'js/solicitacoes.js'), 'utf8');
const divisionPatchCode = fs.readFileSync(path.join(projectRoot, 'js/solicitacoes-divisao.js'), 'utf8');
const dataCode = fs.readFileSync(path.join(projectRoot, 'js/data.js'), 'utf8').replace('DataManager.init();', '');

const clone = (value) => JSON.parse(JSON.stringify(value));

function buildHistoricalRequest(overrides = {}) {
    return {
        id: 'historic-finalized-001',
        numero: 'SOL-20260303-0001',
        tecnicoId: 'tec-01',
        tecnicoNome: 'Técnico Histórico',
        cliente: 'Cliente Histórico',
        fornecedorId: 'forn-01',
        fornecedorNome: 'Fornecedor Histórico',
        itens: [{ codigo: 'P-01', descricao: 'Peça histórica', quantidade: 2, valorUnit: 125 }],
        subtotal: 250,
        desconto: 10,
        frete: 20,
        total: 260,
        data: '2026-03-03',
        createdAt: 1772496000000,
        updatedAt: 1772496000000,
        status: 'finalizada',
        aprovacao: { status: 'aprovada', at: 1772582400000, by: 'Gestor' },
        approvals: [{ decision: 'approved', at: 1772582400000, by: 'Gestor' }],
        trackingCode: 'BR123',
        deliveredAt: 1772668800000,
        observacoes: 'Registro legado preservado',
        timeline: [{ event: 'created', at: 1772496000000 }],
        audit: { version: 4, createdAt: 1772496000000, lastUpdatedAt: 1772668800000 },
        ...overrides
    };
}

describe('ADMINISTRADOR + pedido histórico: classificação de divisão', () => {
    let currentUser;
    let request;
    let DataManager;
    let Solicitacoes;

    beforeEach(() => {
        document.body.innerHTML = `
            <div id="sol-table-container"></div>
            <div id="modal-container" class="hidden"><div id="modal-content"></div></div>
        `;

        currentUser = {
            id: 'admin-01',
            username: 'admin',
            name: 'Administrador Teste',
            email: 'admin@empresa.test',
            role: 'administrador'
        };
        request = buildHistoricalRequest();

        global.Auth = window.Auth = {
            getRole: jest.fn(() => currentUser.role),
            getCurrentUser: jest.fn(() => currentUser),
            getTecnicoId: jest.fn(() => null),
            hasPermission: jest.fn((module, action) => module === 'solicitacoes' && action === 'edit')
        };
        global.CloudStorage = window.CloudStorage = {
            updateSolicitationDivision: jest.fn().mockResolvedValue(true)
        };
        global.Utils = window.Utils = {
            escapeHtml: (value) => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;'),
            normalizeText: (value) => String(value || '').trim().toLowerCase(),
            formatDate: (value) => String(value || '-'),
            formatCurrency: (value) => `R$ ${Number(value || 0).toFixed(2)}`,
            formatNumber: (value) => String(value || 0),
            renderStatusBadge: (status) => `<span>${status}</span>`,
            renderPagination: () => '',
            getStatusInfo: (status) => ({ label: status }),
            showToast: jest.fn(),
            showModal: jest.fn((html) => {
                document.getElementById('modal-content').innerHTML = html;
                document.getElementById('modal-container').classList.remove('hidden');
            }),
            closeModal: jest.fn(() => document.getElementById('modal-container').classList.add('hidden'))
        };
        global.AnalyticsHelper = window.AnalyticsHelper = {
            restoreModuleFilterState: () => ({ statuses: [], tecnico: '', dateFrom: '', dateTo: '', search: '' }),
            persistModuleFilterState: (filters) => filters,
            filterSolicitations: (records) => records,
            buildFilterState: (filters) => filters
        };

        DataManager = new Function(`${dataCode}; return DataManager;`)();
        DataManager._sessionCache[DataManager.KEYS.SOLICITATIONS] = [clone(request)];
        DataManager.queueOneDriveBackup = jest.fn();
        DataManager.createSolicitationsBackup = jest.fn();
        global.DataManager = window.DataManager = DataManager;

        new Function(solicitacoesCode)();
        Solicitacoes = window.Solicitacoes;
        Solicitacoes.getFilteredSolicitations = () => DataManager.getSolicitations();
        Solicitacoes.getRequesterName = (sol) => sol.tecnicoNome;
        Solicitacoes.renderRequesterDeliveryCard = () => '';
        Solicitacoes.renderDecisionSidePanel = () => '';
        Solicitacoes.renderTimeline = () => '';
        new Function(divisionPatchCode)();
    });

    afterEach(() => {
        delete global.Auth;
        delete global.CloudStorage;
        delete global.DataManager;
        delete global.Utils;
        delete global.AnalyticsHelper;
        delete window.Solicitacoes;
        delete window.SolicitacoesDivisaoPatch;
    });

    test('insere no DOM a ação visível em pedido finalizado antigo e abre o modal específico', () => {
        document.getElementById('sol-table-container').innerHTML = Solicitacoes.renderTable();

        const buttons = document.querySelectorAll('[data-admin-division-edit="true"][data-solicitation-id="historic-finalized-001"]');
        expect(buttons).toHaveLength(1);
        expect(buttons[0].textContent).toContain('Editar Divisão');
        expect(document.querySelector('.solicitation-view-action').textContent).toContain('Visualizar');
        expect(document.querySelector('[data-division-badge-for="historic-finalized-001"]').textContent).toContain('Não classificado');

        const clickHandler = buttons[0].getAttribute('onclick');
        expect(clickHandler).toBe("Solicitacoes.openDivisionClassifier('historic-finalized-001')");
        new Function('Solicitacoes', clickHandler)(Solicitacoes);

        const modal = document.getElementById('modal-content');
        expect(modal.textContent).toContain('Editar Divisão');
        expect(modal.textContent).toContain('Não classificado');
        expect(modal.querySelectorAll('select')).toHaveLength(1);
        expect(modal.querySelectorAll('input:not([type="hidden"]), textarea')).toHaveLength(0);
        expect(modal.querySelector('#sol-divisao-classificacao').options).toHaveLength(3);
        expect(modal.textContent).toContain('Salvar Classificação');
    });

    test('mostra a mesma ação dentro dos detalhes do pedido', () => {
        Solicitacoes.viewDetails(request.id);

        const modal = document.getElementById('modal-content');
        const detailButton = modal.querySelector('[data-admin-division-edit="true"]');
        expect(modal.querySelector('[data-division-details]').textContent).toContain('Não classificado');
        expect(detailButton).not.toBeNull();
        expect(detailButton.textContent).toContain('Editar Divisão');
    });

    test('salva F&B por atualização atômica e preserva todos os demais dados', async () => {
        const before = clone(DataManager.getSolicitationById(request.id));
        const dataUpdated = jest.fn();
        window.addEventListener('data:updated', dataUpdated, { once: true });
        Solicitacoes.openDivisionClassifier(request.id);
        document.getElementById('sol-divisao-classificacao').value = 'F&B';

        await Solicitacoes.saveDivisionClassification();

        const after = DataManager.getSolicitationById(request.id);
        const cloudPatch = CloudStorage.updateSolicitationDivision.mock.calls[0][1];
        expect(CloudStorage.updateSolicitationDivision).toHaveBeenCalledWith(request.id, expect.any(Object));
        expect(Object.keys(cloudPatch).sort()).toEqual([
            'divisao',
            'divisaoClassificadaEm',
            'divisaoClassificadaPor',
            'divisaoClassificacaoHistorico'
        ].sort());
        expect(after.divisao).toBe('F&B');
        expect(after.divisaoClassificacaoHistorico.at(-1)).toEqual(expect.objectContaining({
            divisaoAnterior: null,
            novaDivisao: 'F&B',
            usuarioAdministrador: 'Administrador Teste',
            usuarioId: 'admin-01',
            usuarioEmail: 'admin@empresa.test'
        }));

        const allowedChangedFields = new Set([
            'divisao',
            'divisaoClassificadaEm',
            'divisaoClassificadaPor',
            'divisaoClassificacaoHistorico'
        ]);
        Object.keys(before).forEach((field) => {
            if (!allowedChangedFields.has(field)) {
                expect(after[field]).toEqual(before[field]);
            }
        });
        expect(after.timeline).toEqual(before.timeline);
        expect(after.audit).toEqual(before.audit);
        expect(after.status).toBe('finalizada');
        expect(dataUpdated).toHaveBeenCalledWith(expect.objectContaining({
            detail: expect.objectContaining({
                keys: [DataManager.KEYS.SOLICITATIONS],
                source: 'local'
            })
        }));
    });

    test('permite reclassificar IN para F&B com auditoria da divisão anterior', async () => {
        request = buildHistoricalRequest({ divisao: 'IN' });
        DataManager._sessionCache[DataManager.KEYS.SOLICITATIONS] = [clone(request)];
        Solicitacoes.openDivisionClassifier(request.id);
        document.getElementById('sol-divisao-classificacao').value = 'F&B';

        await Solicitacoes.saveDivisionClassification();

        expect(DataManager.getSolicitationById(request.id).divisaoClassificacaoHistorico.at(-1)).toEqual(expect.objectContaining({
            divisaoAnterior: 'IN',
            novaDivisao: 'F&B'
        }));
    });

    test.each(['gestor', 'tecnico', 'fornecedor'])('não renderiza a ação nem permite persistir para %s', async (role) => {
        currentUser.role = role;
        document.getElementById('sol-table-container').innerHTML = Solicitacoes.renderTable();

        expect(document.querySelector('[data-admin-division-edit="true"]')).toBeNull();
        await expect(DataManager.updateSolicitationDivision(request.id, 'IN', currentUser)).resolves.toEqual(expect.objectContaining({
            success: false,
            error: 'forbidden'
        }));
        expect(CloudStorage.updateSolicitationDivision).not.toHaveBeenCalled();
    });
});
