const fs = require('fs');
const path = require('path');

const utilsCode = fs.readFileSync(path.join(__dirname, '../js/utils.js'), 'utf8');

const buildLocalStorage = () => {
    let store = {};
    return {
        getItem: (key) => store[key] || null,
        setItem: (key, value) => { store[key] = String(value); },
        removeItem: (key) => { delete store[key]; },
        clear: () => { store = {}; }
    };
};

const buildCrypto = () => ({
    subtle: {
        digest: jest.fn(async () => {
            const buffer = new ArrayBuffer(32);
            const view = new Uint8Array(buffer);
            for (let index = 0; index < view.length; index += 1) {
                view[index] = index;
            }
            return buffer;
        })
    },
    getRandomValues: jest.fn((array) => array)
});

const loadUtils = () => {
    const factory = new Function(`${utilsCode}; return Utils;`);
    const Utils = factory();
    Utils.OP_EMAIL_MAX_RETRIES = 0;
    Utils.OP_EMAIL_TIMEOUT_MS = 50;
    Utils.OP_EMAIL_RETRY_DELAY_MS = 1;
    Utils._operationalEmailQueue = Promise.resolve();
    return Utils;
};

const buildTestData = () => {
    const suppliers = {
        'sup-ebst': {
            id: 'sup-ebst',
            nome: 'EBST',
            email: 'pedidos@ebstecnologica.com.br'
        },
        'sup-hobart': {
            id: 'sup-hobart',
            nome: 'Hobart',
            email: 'pedidos@hobart.com.br'
        }
    };

    const technicians = {
        'tec-1': {
            id: 'tec-1',
            nome: 'Joao Tecnico',
            email: 'joao.tecnico@solenis.com'
        },
        'tec-2': {
            id: 'tec-2',
            nome: 'Carlos Tecnico',
            email: 'carlos.tecnico@solenis.com'
        }
    };

    const users = [
        {
            id: 'gestor_wb',
            username: 'welington.tavares',
            name: 'Welington Bastos Tavares',
            role: 'gestor',
            email: 'wbastostavares@solenis.com',
            disabled: false
        },
        {
            id: 'gestor_legado',
            username: 'gestor.legado',
            name: 'Gestor Legado',
            role: 'gestor',
            email: 'gestor@diversey.com',
            disabled: false
        },
        {
            id: 'fornecedor_ebst',
            username: 'fornecedor.ebst',
            name: 'Fornecedor EBST',
            role: 'fornecedor',
            email: 'stale-ebst@example.com',
            fornecedorId: 'sup-ebst',
            disabled: false
        },
        {
            id: 'fornecedor_hobart',
            username: 'fornecedor.hobart',
            name: 'Fornecedor Hobart',
            role: 'fornecedor',
            email: 'stale-hobart@example.com',
            fornecedorId: 'sup-hobart',
            disabled: false
        },
        {
            id: 'tec-user-1',
            username: 'joao',
            name: 'Joao Tecnico',
            role: 'tecnico',
            email: 'joao.tecnico@solenis.com',
            tecnicoId: 'tec-1',
            disabled: false
        },
        {
            id: 'tec-user-2',
            username: 'carlos',
            name: 'Carlos Tecnico',
            role: 'tecnico',
            email: 'carlos.tecnico@solenis.com',
            tecnicoId: 'tec-2',
            disabled: false
        }
    ];

    return { suppliers, technicians, users };
};

describe('Email routing rules', () => {
    let suppliers;
    let technicians;
    let users;

    beforeEach(() => {
        const crypto = buildCrypto();
        const state = buildTestData();
        suppliers = state.suppliers;
        technicians = state.technicians;
        users = state.users;

        Object.defineProperty(global, 'localStorage', {
            value: buildLocalStorage(),
            configurable: true
        });
        Object.defineProperty(global, 'crypto', {
            value: crypto,
            configurable: true
        });
        Object.defineProperty(global, 'window', {
            value: {
                crypto,
                location: {
                    origin: 'https://portal.example.com',
                    pathname: '/index.html'
                }
            },
            configurable: true
        });
        Object.defineProperty(global, 'navigator', {
            value: {
                onLine: true,
                language: 'pt-BR',
                userAgent: 'jest'
            },
            configurable: true
        });

        global.Logger = {
            CATEGORY: {
                REQUEST: 'request',
                APPROVAL: 'approval'
            },
            info: jest.fn(),
            warn: jest.fn()
        };
        global.fetch = jest.fn();
        global.DataManager = {
            getSettings: jest.fn(() => ({})),
            normalizeEmail: jest.fn((value) => String(value || '').trim().toLowerCase()),
            getSupplierById: jest.fn((id) => suppliers[id] || null),
            getSuppliers: jest.fn(() => Object.values(suppliers)),
            getUsers: jest.fn(() => users),
            getTechnicians: jest.fn(() => Object.values(technicians)),
            getTechnicianById: jest.fn((id) => technicians[id] || null),
            getUserById: jest.fn((id) => users.find((user) => user.id === id) || null)
        };
    });

    afterEach(() => {
        delete global.Logger;
        delete global.DataManager;
        delete global.fetch;
    });

    it('sends password reset only to the affected technician without gateway fallback', async () => {
        const Utils = loadUtils();
        Utils.OP_EMAIL_GATEWAY_RECIPIENT = 'legacy-gateway@example.com';
        Utils.executeOperationalEmailRequest = jest.fn().mockRejectedValue(new Error('failed to fetch'));

        const result = await Utils.sendPasswordResetEmailDetailed({
            to: 'tecnico@example.com',
            username: 'marlon',
            password: 'Nova1234',
            name: 'Marlon',
            roleLabel: 'tecnico'
        });

        expect(result.success).toBe(false);
        expect(Utils.executeOperationalEmailRequest).toHaveBeenCalledTimes(1);
        expect(Utils.executeOperationalEmailRequest.mock.calls[0][0]).toContain(encodeURIComponent('tecnico@example.com'));
        expect(Utils.executeOperationalEmailRequest.mock.calls[0][0]).not.toContain(encodeURIComponent('legacy-gateway@example.com'));
    });

    it('normalizes supplier recipient lists from string, array and object values', () => {
        const Utils = loadUtils();

        const recipients = Utils.extractOperationalEmailRecipients(
            'compras@ebst.com.br; fiscal@ebst.com.br',
            ['pedidos@ebst.com.br', 'compras@ebst.com.br'],
            {
                notificationEmails: ['logistica@ebst.com.br', 'pedidos@ebst.com.br']
            }
        );

        expect(recipients).toEqual([
            'compras@ebst.com.br',
            'fiscal@ebst.com.br',
            'pedidos@ebst.com.br',
            'logistica@ebst.com.br'
        ]);
    });

    it('routes new solicitation notifications only to the fixed manager for review', async () => {
        const Utils = loadUtils();
        Utils.sendOperationalEmailDetailed = jest.fn(async ({ recipient }) => Utils.createOperationalEmailResult(true, {
            recipient
        }));

        const solicitation = {
            id: 'sol-1',
            numero: 'REQ-20260312-0001',
            tecnicoId: 'tec-1',
            requesterTecnicoId: 'tec-1',
            requesterRole: 'tecnico',
            requesterEmail: 'joao.tecnico@solenis.com',
            requesterName: 'Joao Tecnico',
            tecnicoNome: 'Joao Tecnico',
            cliente: 'Cliente XPTO',
            status: 'pendente',
            fornecedorId: 'sup-ebst',
            fornecedorNome: 'EBST',
            itens: [{ quantidade: 1, descricao: 'Bomba de lavagem' }],
            total: 250
        };

        const result = await Utils.sendSolicitationApprovalEmail({
            solicitation,
            submittedBy: 'Joao Tecnico'
        });

        expect(result.success).toBe(true);
        expect(result.recipients).toEqual(['wbastostavares@solenis.com']);
        expect(Utils.sendOperationalEmailDetailed).toHaveBeenCalledTimes(1);
        expect(Utils.sendOperationalEmailDetailed).toHaveBeenCalledWith(expect.objectContaining({
            recipient: 'wbastostavares@solenis.com',
            eventLabel: 'manager_request_review_email',
            allowGatewayFallback: false
        }));
    });

    it('notifies the linked technician after approval without copying the manager in this step', async () => {
        const Utils = loadUtils();
        Utils.sendOperationalEmail = jest.fn().mockResolvedValue(true);

        const solicitation = {
            id: 'sol-2',
            numero: 'REQ-20260312-0002',
            tecnicoId: 'tec-1',
            requesterTecnicoId: 'tec-1',
            requesterRole: 'tecnico',
            requesterEmail: 'joao.tecnico@solenis.com',
            requesterName: 'Joao Tecnico',
            tecnicoNome: 'Joao Tecnico',
            cliente: 'Cliente XPTO',
            status: 'aprovada',
            fornecedorId: 'sup-ebst',
            fornecedorNome: 'EBST',
            itens: [{ quantidade: 2, descricao: 'Sensor de nivel' }],
            total: 300
        };

        const result = await Utils.sendApprovalNotificationToTechnician({
            solicitation,
            approvedBy: 'Gestor QA'
        });

        expect(result.success).toBe(true);
        expect(result.recipient).toBe('joao.tecnico@solenis.com');
        expect(result.managerCopyRecipients).toEqual([]);
        expect(result.managerCopySentCount).toBe(0);
        expect(Utils.sendOperationalEmail).toHaveBeenCalledWith(expect.objectContaining({
            recipient: 'joao.tecnico@solenis.com',
            eventLabel: 'technician_approval_email',
            allowGatewayFallback: false
        }));
    });

    it('uses only supplier registry emails and copies the fixed manager after approval', async () => {
        const Utils = loadUtils();
        suppliers['sup-ebst'] = {
            ...suppliers['sup-ebst'],
            email: 'pedidos@ebstecnologica.com.br; compras@ebstecnologica.com.br, fiscal@ebstecnologica.com.br'
        };
        Utils.sendOperationalEmailDetailed = jest.fn(async ({ recipient }) => Utils.createOperationalEmailResult(true, {
            recipient
        }));

        const solicitation = {
            id: 'sol-3',
            numero: 'REQ-20260312-0003',
            tecnicoId: 'tec-2',
            requesterTecnicoId: 'tec-2',
            requesterRole: 'tecnico',
            requesterEmail: 'carlos.tecnico@solenis.com',
            requesterName: 'Carlos Tecnico',
            tecnicoNome: 'Carlos Tecnico',
            cliente: 'Cliente XPTO',
            status: 'aprovada',
            fornecedorId: 'sup-ebst',
            fornecedorNome: 'EBST',
            itens: [{ quantidade: 1, descricao: 'Resistencia NT-300' }],
            total: 5100
        };

        const result = await Utils.sendSupplierApprovalEmail({
            solicitation,
            approvedBy: 'Gestor QA'
        });

        expect(result.success).toBe(true);
        expect(result.recipients).toEqual([
            'pedidos@ebstecnologica.com.br',
            'compras@ebstecnologica.com.br',
            'fiscal@ebstecnologica.com.br'
        ]);
        expect(result.managerCopyRecipients).toEqual(['wbastostavares@solenis.com']);

        const calledRecipients = Utils.sendOperationalEmailDetailed.mock.calls.map(([payload]) => payload.recipient);
        expect(calledRecipients).toEqual([
            'pedidos@ebstecnologica.com.br',
            'compras@ebstecnologica.com.br',
            'fiscal@ebstecnologica.com.br',
            'wbastostavares@solenis.com'
        ]);
        expect(calledRecipients).not.toContain('stale-ebst@example.com');

        const eventLabels = Utils.sendOperationalEmailDetailed.mock.calls.map(([payload]) => payload.eventLabel);
        expect(eventLabels).toEqual([
            'supplier_approval_email',
            'supplier_approval_email',
            'supplier_approval_email',
            'supplier_approval_manager_copy_email'
        ]);
    });

    it('alerts only the fixed manager when the selected supplier has no e-mail configured', async () => {
        const Utils = loadUtils();
        suppliers['sup-hobart'] = {
            ...suppliers['sup-hobart'],
            email: '',
            emails: [],
            notificationEmails: []
        };
        Utils.sendOperationalEmailDetailed = jest.fn(async ({ recipient }) => Utils.createOperationalEmailResult(true, {
            recipient
        }));

        const result = await Utils.sendSupplierApprovalEmail({
            solicitation: {
                id: 'sol-4',
                numero: 'REQ-20260312-0004',
                tecnicoId: 'tec-1',
                requesterTecnicoId: 'tec-1',
                requesterRole: 'tecnico',
                requesterEmail: 'joao.tecnico@solenis.com',
                requesterName: 'Joao Tecnico',
                tecnicoNome: 'Joao Tecnico',
                cliente: 'Cliente XPTO',
                status: 'aprovada',
                fornecedorId: 'sup-hobart',
                fornecedorNome: 'Hobart',
                itens: [{ quantidade: 1, descricao: 'Painel IHM' }],
                total: 3200
            },
            approvedBy: 'Gestor QA'
        });

        expect(result.success).toBe(false);
        expect(result.reason).toBe('missing_supplier_email_configuration');
        expect(result.sentCount).toBe(0);
        expect(result.totalRecipients).toBe(0);
        expect(result.managerCopyRecipients).toEqual(['wbastostavares@solenis.com']);
        expect(result.managerCopySentCount).toBe(1);
        expect(Utils.sendOperationalEmailDetailed).toHaveBeenCalledTimes(1);
        expect(Utils.sendOperationalEmailDetailed).toHaveBeenCalledWith(expect.objectContaining({
            recipient: 'wbastostavares@solenis.com',
            eventLabel: 'supplier_email_configuration_alert',
            allowGatewayFallback: false
        }));
    });
});
