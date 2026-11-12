/**
 * Portal do fornecedor: data do envio + número do rastreio.
 *
 * O fornecedor informa as duas informações ao despachar o pedido. A data é
 * guardada como AAAA-MM-DD (dia do calendário) no campo `dataEnvio`.
 */
const fs = require('fs');
const path = require('path');

const read = (file) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const utilsCode = read('js/utils.js');
const dataCode = read('js/data.js');

const buildLocalStorage = () => {
    let store = {};
    return {
        getItem: (key) => store[key] || null,
        setItem: (key, value) => { store[key] = String(value); },
        removeItem: (key) => { delete store[key]; },
        clear: () => { store = {}; }
    };
};

const loadUtils = () => new Function(`${utilsCode}; return Utils;`)();

const loadDataManager = () => {
    const Utils = loadUtils();
    const CloudStorage = { getLastOperationError: jest.fn(() => null) };
    const Auth = {
        currentUser: null,
        getCurrentUser: jest.fn(() => ({ id: 'forn-1', role: 'fornecedor' })),
        getRole: jest.fn(() => 'fornecedor'),
        buildSessionUser: jest.fn((user) => user),
        persistSession: jest.fn()
    };
    const Logger = { CATEGORY: { AUTH: 'auth', REQUEST: 'request' }, info: jest.fn(), warn: jest.fn(), error: jest.fn() };
    const sanitized = dataCode.replace('DataManager.init();', '// DataManager.init();');
    const DataManager = new Function('Utils', 'CloudStorage', 'Auth', 'Logger', `${sanitized}; return DataManager;`)(Utils, CloudStorage, Auth, Logger);
    DataManager.persistCriticalCollection = jest.fn(async (key, list) => { DataManager._sessionCache[key] = list; return true; });
    DataManager.queueOneDriveBackup = jest.fn();
    DataManager.createSolicitationsBackup = jest.fn();
    return { DataManager, Utils };
};

const approvedOrder = (extra = {}) => ({
    id: 'sol-1', numero: 'REQ-20261101-0001', tecnicoId: 'tec-1', fornecedorId: 'sup-ebst', status: 'aprovada',
    createdAt: 1000, updatedAt: 1000, approvedAt: new Date(2026, 10, 1, 9).getTime(),
    itens: [{ codigo: 'CS001', quantidade: 1, valorUnit: 10 }], subtotal: 10, desconto: 0, frete: 0, total: 10,
    timeline: [], audit: { version: 1 }, ...extra
});

describe('data do envio do fornecedor', () => {
    beforeEach(() => {
        Object.defineProperty(global, 'localStorage', { value: buildLocalStorage(), configurable: true });
        Object.defineProperty(global, 'navigator', { value: { onLine: true, language: 'pt-BR', userAgent: 'jest' }, configurable: true });
        jest.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('validação', () => {
        const today = new Date(2026, 10, 11, 14, 30);
        const approvedAt = new Date(2026, 10, 1, 9).getTime();
        let Utils;

        beforeEach(() => {
            Utils = loadUtils();
        });

        it('normaliza apenas datas reais no formato AAAA-MM-DD', () => {
            expect(Utils.normalizeShippingDate('2026-11-10')).toBe('2026-11-10');
            expect(Utils.normalizeShippingDate(' 2026-11-10 ')).toBe('2026-11-10');
            ['2026-02-31', '10/11/2026', '2026-11-10T08:00', '', null, undefined, 20261110].forEach((value) => {
                expect(Utils.normalizeShippingDate(value)).toBe('');
            });
        });

        it('exige a data', () => {
            expect(Utils.validateShippingDate('', { today })).toEqual({ valid: false, value: '', message: 'Informe a data do envio.' });
        });

        it('recusa data inexistente', () => {
            expect(Utils.validateShippingDate('2026-02-31', { today }).message).toBe('Data do envio inválida.');
        });

        it('recusa data futura e aceita o próprio dia', () => {
            expect(Utils.validateShippingDate('2026-11-12', { today }).valid).toBe(false);
            expect(Utils.validateShippingDate('2026-11-12', { today }).message).toBe('A data do envio não pode ser futura.');
            expect(Utils.validateShippingDate('2026-11-11', { today })).toEqual({ valid: true, value: '2026-11-11', message: '' });
        });

        it('recusa data anterior à aprovação e aceita o dia da aprovação', () => {
            const before = Utils.validateShippingDate('2026-10-31', { today, approvedAt });
            expect(before.valid).toBe(false);
            expect(before.message).toContain('anterior à aprovação');
            expect(before.message).toContain('01/11/2026');
            expect(Utils.validateShippingDate('2026-11-01', { today, approvedAt }).valid).toBe(true);
        });

        it('sem data de aprovação conhecida, só impede data futura', () => {
            expect(Utils.validateShippingDate('2020-01-01', { today }).valid).toBe(true);
            expect(Utils.validateShippingDate('2020-01-01', { today, approvedAt: null }).valid).toBe(true);
        });
    });

    describe('gravação', () => {
        const actor = { by: 'Fornecedor EBST', byUserId: 'forn-1', byUsername: 'ebst', byRole: 'fornecedor' };

        it('grava data do envio e rastreio ao despachar e registra no histórico', async () => {
            const { DataManager } = loadDataManager();
            DataManager._sessionCache[DataManager.KEYS.SOLICITATIONS] = [approvedOrder()];

            const result = await DataManager.updateSolicitationStatus('sol-1', 'em-transito', { trackingCode: 'BR123456789BR', dataEnvio: '2026-11-03', ...actor });

            expect(result.success).toBe(true);
            const saved = DataManager.getSolicitationById('sol-1');
            expect(saved.status).toBe('em-transito');
            expect(saved.trackingCode).toBe('BR123456789BR');
            expect(saved.dataEnvio).toBe('2026-11-03');
            expect(saved.timeline[saved.timeline.length - 1]).toMatchObject({ event: 'status_changed', to: 'em-transito', comment: 'BR123456789BR · envio em 03/11/2026' });
        });

        it('permite corrigir só a data do envio de um pedido já em trânsito', async () => {
            const { DataManager } = loadDataManager();
            DataManager._sessionCache[DataManager.KEYS.SOLICITATIONS] = [approvedOrder({ status: 'em-transito', trackingCode: 'BR123456789BR', dataEnvio: '2026-11-03' })];

            const result = await DataManager.updateSolicitationStatus('sol-1', 'em-transito', { trackingCode: 'BR123456789BR', dataEnvio: '2026-11-05', ...actor });

            expect(result.success).toBe(true);
            const saved = DataManager.getSolicitationById('sol-1');
            expect(saved.dataEnvio).toBe('2026-11-05');
            expect(saved.trackingCode).toBe('BR123456789BR');
            expect(saved.audit.version).toBe(2);
            expect(saved.timeline[saved.timeline.length - 1]).toMatchObject({ event: 'tracking_updated', comment: 'BR123456789BR · envio em 05/11/2026' });
        });

        it('não regrava quando data e rastreio não mudaram', async () => {
            const { DataManager } = loadDataManager();
            DataManager._sessionCache[DataManager.KEYS.SOLICITATIONS] = [approvedOrder({ status: 'em-transito', trackingCode: 'BR123456789BR', dataEnvio: '2026-11-03' })];

            const result = await DataManager.updateSolicitationStatus('sol-1', 'em-transito', { trackingCode: 'BR123456789BR', dataEnvio: '2026-11-03', ...actor });

            expect(result).toMatchObject({ success: false, error: 'already_applied' });
            expect(DataManager.persistCriticalCollection).not.toHaveBeenCalled();
        });

        it('data inválida não apaga a data já gravada', async () => {
            const { DataManager } = loadDataManager();
            DataManager._sessionCache[DataManager.KEYS.SOLICITATIONS] = [approvedOrder({ status: 'em-transito', trackingCode: 'BR123456789BR', dataEnvio: '2026-11-03' })];

            await DataManager.updateSolicitationStatus('sol-1', 'em-transito', { trackingCode: 'BR999999999BR', dataEnvio: '2026-02-31', ...actor });

            const saved = DataManager.getSolicitationById('sol-1');
            expect(saved.trackingCode).toBe('BR999999999BR');
            expect(saved.dataEnvio).toBe('2026-11-03');
        });

        it('continua aceitando rastreio sem data (versões antigas do app em cache)', async () => {
            const { DataManager } = loadDataManager();
            DataManager._sessionCache[DataManager.KEYS.SOLICITATIONS] = [approvedOrder()];

            const result = await DataManager.updateSolicitationStatus('sol-1', 'em-transito', { trackingCode: 'BR123456789BR', ...actor });

            expect(result.success).toBe(true);
            const saved = DataManager.getSolicitationById('sol-1');
            expect(saved.trackingCode).toBe('BR123456789BR');
            expect(saved.dataEnvio).toBeUndefined();
        });
    });

    describe('telas e saídas', () => {
        const portal = read('js/fornecedor.js');
        const requests = read('js/solicitacoes.js');

        it('o portal do fornecedor pede data do envio e rastreio juntos', () => {
            expect(portal).toContain('data-supplier-shipping-date');
            expect(portal).toContain('<label for="${dateId}">Data do envio</label>');
            expect(portal).toContain('<label for="${codeId}">Nº do rastreio</label>');
            expect(portal).toContain('Utils.validateShippingDate(');
            expect(portal).toMatch(/updateSolicitationStatus\(id, 'em-transito', \{\s*trackingCode,\s*dataEnvio,/);
        });

        it('gestor e técnico veem a data do envio nos detalhes', () => {
            expect(requests).toContain('<dt>Data do envio</dt>');
            expect(requests).toContain('<label>Data do envio</label>');
        });

        it('exportações, PDF e e-mail incluem a data do envio', () => {
            expect(requests).toContain('DataEnvio: sol.dataEnvio');
            expect(read('js/solicitacoes-divisao.js')).toContain('DataEnvio: sol.dataEnvio');
            expect(utilsCode).toContain("{ label: 'Data do envio', value: solicitation.dataEnvio");
            expect(utilsCode).toContain('`Data do envio: ${details.shippingDate');
            expect(utilsCode).toContain('data_envio: details.shippingDate');
        });

        it('a função na nuvem valida e grava a data do envio', () => {
            const fn = read('functions/index.js');
            expect(fn).toContain('shippingDateOf(body.dataEnvio)');
            expect(fn).toContain('...(dataEnvio ? { dataEnvio } : {})');
            expect(dataCode).toContain('dataEnvio: extra.dataEnvio || undefined');
        });
    });
});
