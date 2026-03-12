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

describe('Email routing rules', () => {
    beforeEach(() => {
        const crypto = buildCrypto();
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
                REQUEST: 'request'
            },
            info: jest.fn(),
            warn: jest.fn()
        };
        global.fetch = jest.fn();
        global.DataManager = {
            getSettings: jest.fn(() => ({}))
        };
    });

    afterEach(() => {
        delete global.Logger;
        delete global.DataManager;
        delete global.fetch;
    });

    it('sends password reset only to the affected technician without gateway fallback', async () => {
        const Utils = loadUtils();
        Utils.OP_EMAIL_GATEWAY_RECIPIENT = 'welingtontavares61m@gmail.com';
        Utils.executeOperationalEmailRequest = jest.fn().mockRejectedValue(new Error('failed to fetch'));

        const result = await Utils.sendPasswordResetEmailDetailed({
            to: 'tecnico@example.com',
            username: 'marlon',
            password: 'Nova1234',
            name: 'Marlon',
            roleLabel: 'técnico'
        });

        expect(result.success).toBe(false);
        expect(Utils.executeOperationalEmailRequest).toHaveBeenCalledTimes(1);
        expect(Utils.executeOperationalEmailRequest.mock.calls[0][0]).toContain(encodeURIComponent('tecnico@example.com'));
        expect(Utils.executeOperationalEmailRequest.mock.calls[0][0]).not.toContain(encodeURIComponent('welingtontavares61m@gmail.com'));
    });

    it('routes new solicitation notifications to the requesting technician and copies the manager', async () => {
        const Utils = loadUtils();
        Utils.sendOperationalEmail = jest.fn().mockResolvedValue(true);

        const solicitation = {
            numero: 'REQ-20260312-0001',
            tecnicoId: 'tec-1',
            requesterTecnicoId: 'tec-1',
            requesterRole: 'tecnico',
            requesterEmail: 'marlon@example.com',
            requesterName: 'Marlon',
            tecnicoNome: 'Marlon',
            cliente: 'Cliente XPTO',
            status: 'pendente',
            itens: [{ quantidade: 1, descricao: 'Bomba de lavagem' }],
            total: 250
        };

        const result = await Utils.sendSolicitationApprovalEmail({
            solicitation,
            submittedBy: 'Marlon'
        });

        expect(result.success).toBe(true);
        expect(result.recipient).toBe('marlon@example.com');
        expect(result.managerCopyRecipients).toEqual(['wbastostavares@solenis.com']);
        expect(Utils.sendOperationalEmail).toHaveBeenNthCalledWith(1, expect.objectContaining({
            recipient: 'marlon@example.com',
            eventLabel: 'technician_new_request_email'
        }));
        expect(Utils.sendOperationalEmail).toHaveBeenNthCalledWith(2, expect.objectContaining({
            recipient: 'wbastostavares@solenis.com',
            eventLabel: 'manager_new_request_copy_email'
        }));
    });

    it('keeps the manager copy on approval updates even when the technician cannot be resolved', async () => {
        const Utils = loadUtils();
        Utils.sendOperationalEmail = jest.fn().mockResolvedValue(true);

        const solicitation = {
            numero: 'REQ-20260312-0002',
            tecnicoId: 'tec-sem-email',
            tecnicoNome: 'Técnico sem vínculo',
            cliente: 'Cliente XPTO',
            status: 'aprovada',
            itens: [{ quantidade: 2, descricao: 'Sensor de nível' }],
            total: 300
        };

        const result = await Utils.sendApprovalNotificationToTechnician({
            solicitation,
            approvedBy: 'Gestor QA'
        });

        expect(result.success).toBe(false);
        expect(result.reason).toBe('technician_not_found');
        expect(result.managerCopySentCount).toBe(1);
        expect(result.managerCopyRecipients).toEqual(['wbastostavares@solenis.com']);
        expect(Utils.sendOperationalEmail).toHaveBeenCalledTimes(1);
        expect(Utils.sendOperationalEmail).toHaveBeenCalledWith(expect.objectContaining({
            recipient: 'wbastostavares@solenis.com',
            eventLabel: 'approval_manager_copy_email'
        }));
    });

    it('notifies the supplier only after approval has been released', async () => {
        const Utils = loadUtils();
        Utils.sendOperationalEmail = jest.fn().mockResolvedValue(true);

        const result = await Utils.sendSupplierApprovalEmail({
            solicitation: {
                numero: 'REQ-20260312-0003',
                status: 'pendente',
                fornecedorId: 'forn-1'
            },
            approvedBy: 'Gestor QA'
        });

        expect(result).toMatchObject({
            success: false,
            reason: 'supplier_notification_not_released',
            totalRecipients: 0
        });
        expect(Utils.sendOperationalEmail).not.toHaveBeenCalled();
    });
});
