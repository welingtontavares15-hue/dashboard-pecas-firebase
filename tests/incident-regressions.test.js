const fs = require('fs');
const path = require('path');

const utilsCode = fs.readFileSync(path.join(__dirname, '../js/utils.js'), 'utf8');
const dataCode = fs.readFileSync(path.join(__dirname, '../js/data.js'), 'utf8');

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
    Utils._operationalEmailQueue = Promise.resolve();
    Utils.OP_EMAIL_MAX_RETRIES = 0;
    Utils.OP_EMAIL_TIMEOUT_MS = 50;
    Utils.OP_EMAIL_RETRY_DELAY_MS = 1;
    return Utils;
};

const loadDataManager = ({ cloudError = null } = {}) => {
    const Utils = loadUtils();
    Utils.hashSHA256 = jest.fn(async (value, salt = '') => `${value}|${salt}`);

    const CloudStorage = {
        getLastOperationError: jest.fn(() => cloudError)
    };

    const Auth = {
        currentUser: null,
        getCurrentUser: jest.fn(() => ({ id: 'admin-1', role: 'administrador' })),
        buildSessionUser: jest.fn((user) => user),
        persistSession: jest.fn(),
        hashPassword: jest.fn(async (password, username) => `${password}|${Utils.PASSWORD_SALT}:${username}`)
    };

    const Logger = {
        CATEGORY: {
            AUTH: 'auth',
            REQUEST: 'request'
        },
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
    };

    const sanitizedCode = dataCode.replace('DataManager.init();', '// DataManager.init();');
    const factory = new Function('Utils', 'CloudStorage', 'Auth', 'Logger', `${sanitizedCode}; return DataManager;`);
    const DataManager = factory(Utils, CloudStorage, Auth, Logger);

    DataManager.queueOneDriveBackup = jest.fn();
    DataManager.createSolicitationsBackup = jest.fn();
    DataManager.emitDataUpdated = jest.fn();
    DataManager.refreshAuthenticatedSession = jest.fn();

    return { DataManager, Utils, CloudStorage, Auth, Logger };
};

describe('Incident regressions', () => {
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
            value: { crypto },
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
        global.fetch = jest.fn();
    });

    afterEach(() => {
        delete global.fetch;
        delete global.Logger;
        delete global.DataManager;
    });

    describe('approval flow', () => {
        it('persists approval data compatible with the Firebase gestor rule and keeps edited totals', async () => {
            const { DataManager } = loadDataManager();

            DataManager._sessionCache[DataManager.KEYS.SOLICITATIONS] = [
                {
                    id: 'sol-1',
                    numero: 'REQ-20260311-0001',
                    tecnicoId: 'tec-1',
                    status: 'pendente',
                    createdAt: 1000,
                    updatedAt: 1000,
                    itens: [
                        { codigo: 'CS001', quantidade: 1, valor: 10 },
                        { codigo: 'CS002', quantidade: 2, valor: 20 }
                    ],
                    subtotal: 50,
                    desconto: 0,
                    frete: 0,
                    total: 50
                }
            ];
            DataManager.persistCriticalCollection = jest.fn().mockResolvedValue(true);

            const result = await DataManager.updateSolicitationStatus('sol-1', 'aprovada', {
                fornecedorId: 'forn-1',
                approvedAt: 2000,
                approvedBy: 'Gestor QA',
                by: 'Gestor QA',
                approvalComment: 'Aprovacao com ajuste de quantidades',
                itens: [
                    { codigo: 'CS001', quantidade: 3, valor: 10 }
                ],
                subtotal: 30,
                desconto: 5,
                frete: 7,
                total: 32
            });

            expect(result.success).toBe(true);
            expect(DataManager.persistCriticalCollection).toHaveBeenCalledWith(
                DataManager.KEYS.SOLICITATIONS,
                expect.any(Array),
                expect.objectContaining({ changedIds: ['sol-1'] })
            );

            const persistedSolicitation = DataManager.persistCriticalCollection.mock.calls[0][1][0];
            expect(persistedSolicitation.status).toBe(DataManager.STATUS.APROVADA);
            expect(persistedSolicitation.fornecedorId).toBe('forn-1');
            expect(persistedSolicitation.itens).toEqual([{ codigo: 'CS001', quantidade: 3, valor: 10 }]);
            expect(persistedSolicitation.subtotal).toBe(30);
            expect(persistedSolicitation.desconto).toBe(5);
            expect(persistedSolicitation.frete).toBe(7);
            expect(persistedSolicitation.total).toBe(32);
            expect(persistedSolicitation.aprovacao).toEqual(expect.objectContaining({
                status: DataManager.STATUS.APROVADA,
                at: 2000,
                by: 'Gestor QA',
                approvedAt: 2000,
                approvedBy: 'Gestor QA',
                comment: 'Aprovacao com ajuste de quantidades'
            }));
            expect(persistedSolicitation.approvals).toEqual(expect.arrayContaining([
                expect.objectContaining({
                    decision: 'approved',
                    at: 2000,
                    by: 'Gestor QA',
                    comment: 'Aprovacao com ajuste de quantidades'
                })
            ]));
        });

        it('returns a permission-specific error when Firebase rules block the approval write', async () => {
            const { DataManager } = loadDataManager({
                cloudError: {
                    code: 'permission_denied',
                    permissionDenied: true,
                    message: 'Write denied by rules'
                }
            });

            DataManager._sessionCache[DataManager.KEYS.SOLICITATIONS] = [
                {
                    id: 'sol-2',
                    numero: 'REQ-20260311-0002',
                    tecnicoId: 'tec-2',
                    status: 'pendente',
                    createdAt: 1000,
                    updatedAt: 1000,
                    itens: [{ codigo: 'CS003', quantidade: 1, valor: 15 }],
                    total: 15
                }
            ];
            DataManager.persistCriticalCollection = jest.fn().mockResolvedValue(false);

            const result = await DataManager.updateSolicitationStatus('sol-2', 'aprovada', {
                fornecedorId: 'forn-2',
                by: 'Gestor QA'
            });

            expect(result).toMatchObject({
                success: false,
                error: 'permission_denied'
            });
            expect(result.message).toContain('regras de aprovação do Firebase');
        });

        it('canonicalizes Hobart approvals to sup-hobart even when production still stores the supplier registry with a legacy ID', async () => {
            const { DataManager } = loadDataManager();

            DataManager._sessionCache[DataManager.KEYS.SUPPLIERS] = [
                {
                    id: 'sup-ebst',
                    nome: 'EBST',
                    email: 'pedidos@ebstecnologica.com.br',
                    ativo: true
                },
                {
                    id: 'mmqo7gg5i4oke5xgel',
                    nome: 'Hobart',
                    email: 'tavarespatricia845@gmail.com',
                    ativo: true
                }
            ];
            DataManager._sessionCache[DataManager.KEYS.SOLICITATIONS] = [
                {
                    id: 'sol-hobart',
                    numero: 'REQ-20260316-0001',
                    tecnicoId: 'tec-1',
                    status: 'pendente',
                    createdAt: 1000,
                    updatedAt: 1000,
                    itens: [{ codigo: 'CS001', quantidade: 1, valor: 10 }],
                    total: 10
                }
            ];
            DataManager.persistCriticalCollection = jest.fn().mockResolvedValue(true);

            const result = await DataManager.updateSolicitationStatus('sol-hobart', 'aprovada', {
                fornecedorId: 'mmqo7gg5i4oke5xgel',
                fornecedorNome: 'Hobart',
                approvedAt: 2000,
                approvedBy: 'Gestor QA',
                by: 'Gestor QA'
            });

            expect(result.success).toBe(true);
            const persistedSolicitation = DataManager.persistCriticalCollection.mock.calls[0][1][0];
            expect(persistedSolicitation.fornecedorId).toBe('sup-hobart');
            expect(persistedSolicitation.fornecedorNome).toBe('Hobart');
        });
    });

    describe('reset flow', () => {
        it('maps user password reset persistence failures to a permission-aware message', async () => {
            const { DataManager } = loadDataManager({
                cloudError: {
                    code: 'permission_denied',
                    permissionDenied: true,
                    message: 'Write denied by rules'
                }
            });

            DataManager._sessionCache[DataManager.KEYS.USERS] = [
                {
                    id: 'gestor-1',
                    username: 'gestor.user',
                    role: 'gestor',
                    email: 'gestor@example.com',
                    passwordHash: 'old-hash'
                }
            ];
            DataManager._persistUsersToCloud = jest.fn().mockResolvedValue(false);

            const result = await DataManager.resetUserPasswordById('gestor-1', 'Nova1234');

            expect(result).toMatchObject({
                success: false,
                code: 'permission_denied'
            });
            expect(result.error).toContain('regras de segurança do Firebase');
        });
    });

    describe('operational e-mail diagnostics', () => {
        it('routes Hobart approval emails through the legacy production registry record without leaking EBST recipients', async () => {
            const { DataManager } = loadDataManager();
            global.DataManager = DataManager;
            global.Logger = {
                CATEGORY: {
                    REQUEST: 'request'
                },
                info: jest.fn(),
                warn: jest.fn()
            };

            DataManager._sessionCache[DataManager.KEYS.SUPPLIERS] = [
                {
                    id: 'sup-ebst',
                    nome: 'EBST',
                    email: 'pedidos@ebstecnologica.com.br',
                    ativo: true
                },
                {
                    id: 'mmqo7gg5i4oke5xgel',
                    nome: 'Hobart',
                    email: 'tavarespatricia845@gmail.com',
                    ativo: true
                }
            ];

            const Utils = loadUtils();
            Utils.sendOperationalEmailDetailed = jest.fn(async ({ recipient }) => Utils.createOperationalEmailResult(true, {
                recipient
            }));

            const result = await Utils.sendSupplierApprovalEmail({
                solicitation: {
                    id: 'sol-hobart-email',
                    numero: 'REQ-20260316-0002',
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

            expect(result.success).toBe(true);
            expect(result.recipients).toEqual(['tavarespatricia845@gmail.com']);

            const calledRecipients = Utils.sendOperationalEmailDetailed.mock.calls.map(([payload]) => payload.recipient);
            expect(calledRecipients).toEqual([
                'tavarespatricia845@gmail.com',
                'wbastostavares@solenis.com'
            ]);
            expect(calledRecipients).not.toContain('pedidos@ebstecnologica.com.br');
        });

        it('returns detailed FormSubmit diagnostics for 422 provider failures', async () => {
            const Utils = loadUtils();
            global.Logger = {
                CATEGORY: {
                    REQUEST: 'request'
                },
                info: jest.fn(),
                warn: jest.fn()
            };

            Utils.getOperationalEmailGatewayRecipient = jest.fn(() => null);
            Utils.executeOperationalEmailRequest = jest.fn().mockResolvedValue({
                response: { ok: false, status: 422 },
                payload: { message: 'Activate your FormSubmit form first' }
            });

            const result = await Utils.sendPasswordResetEmailDetailed({
                to: 'gestor@example.com',
                username: 'gestor.user',
                password: 'Nova1234',
                name: 'Gestor Teste',
                roleLabel: 'gestor'
            });

            expect(result).toMatchObject({
                success: false,
                provider: 'formsubmit',
                reason: 'http_422',
                statusCode: 422,
                providerMessage: 'Activate your FormSubmit form first'
            });
            expect(Utils.getOperationalEmailFailureMessage(result)).toContain('Activate your FormSubmit form first');
        });

        it('classifies timeout failures and preserves boolean wrapper compatibility', async () => {
            const Utils = loadUtils();
            global.Logger = {
                CATEGORY: {
                    REQUEST: 'request'
                },
                info: jest.fn(),
                warn: jest.fn()
            };

            const timeoutError = new Error('The operation was aborted.');
            timeoutError.name = 'AbortError';

            Utils.getOperationalEmailGatewayRecipient = jest.fn(() => null);
            Utils.executeOperationalEmailRequest = jest.fn().mockRejectedValue(timeoutError);

            const detailed = await Utils.sendOperationalEmailDetailed({
                recipient: 'gestor@example.com',
                subject: 'Reset',
                message: 'Teste de envio'
            });

            expect(detailed).toMatchObject({
                success: false,
                reason: 'timeout'
            });

            Utils.executeOperationalEmailRequest.mockRejectedValue(timeoutError);
            const sent = await Utils.sendOperationalEmail({
                recipient: 'gestor@example.com',
                subject: 'Reset',
                message: 'Teste de envio'
            });
            expect(sent).toBe(false);
        });
    });
});
