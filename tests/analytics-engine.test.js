/**
 * Unit tests for the analytics engine.
 * Validates canonical filtering, metric consistency and module-local filter persistence.
 */

const fs = require('fs');
const path = require('path');

const createStorage = () => {
    let store = {};
    return {
        getItem: (key) => Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null,
        setItem: (key, value) => { store[key] = String(value); },
        removeItem: (key) => { delete store[key]; },
        clear: () => { store = {}; }
    };
};

const localStorageMock = createStorage();
const sessionStorageMock = createStorage();

Object.defineProperty(global, 'localStorage', { value: localStorageMock });
Object.defineProperty(global, 'sessionStorage', { value: sessionStorageMock });
Object.defineProperty(global, 'navigator', {
    value: {
        userAgent: 'jest',
        platform: 'win32',
        language: 'pt-BR'
    }
});

global.window = global;
global.APP_CONFIG = { version: 'test-version' };
global.Logger = {
    CATEGORY: {
        ANALYTICS: 'analytics',
        SYSTEM: 'system'
    },
    info: jest.fn()
};
global.DataManager = {
    getSettings: () => ({
        preferredRangeDays: 30,
        statsRangeDays: 30,
        slaHours: 24
    }),
    saveSetting: jest.fn(),
    getTechnicianById: (id) => {
        const technicians = {
            tech1: { id: 'tech1', nome: 'Carlos', regiao: 'Sul' },
            tech2: { id: 'tech2', nome: 'Marina', regiao: 'Sudeste' }
        };
        return technicians[id] || null;
    },
    normalizeWorkflowStatus: (status) => {
        const value = String(status || '').trim().toLowerCase().replace(/_/g, '-');
        const aliases = {
            aprovado: 'aprovada',
            aprovada: 'aprovada',
            'em-transito': 'em-transito',
            entregue: 'entregue',
            finalizada: 'finalizada',
            rejeitada: 'rejeitada',
            pendente: 'pendente'
        };
        return aliases[value] || value;
    }
};

const utilsCode = fs.readFileSync(path.join(__dirname, '../js/utils.js'), 'utf8');
const analyticsEngineCode = fs.readFileSync(path.join(__dirname, '../js/analytics-engine.js'), 'utf8');

const loadUtils = new Function(`${utilsCode}; return Utils;`);
global.Utils = loadUtils();

const loadAnalyticsEngine = new Function(`${analyticsEngineCode}; return window.AnalyticsEngine;`);
const AnalyticsEngine = loadAnalyticsEngine();

describe('AnalyticsEngine', () => {
    beforeEach(() => {
        localStorage.clear();
        sessionStorage.clear();
        global.Logger.info.mockClear();
        global.DataManager.saveSetting.mockClear();
    });

    it('normalizes status aliases into canonical workflow values', () => {
        expect(AnalyticsEngine.normalizeStatus('aprovado')).toBe('aprovada');
        expect(AnalyticsEngine.normalizeStatus('em_transito')).toBe('em-transito');
        expect(AnalyticsEngine.normalizeStatus('rejeitada')).toBe('rejeitada');

        const singleStatusState = AnalyticsEngine.buildFilterState({
            status: 'aprovado'
        }, {
            moduleKey: 'fornecedor-portal',
            useDefaultPeriod: false
        });
        expect(singleStatusState.statuses).toEqual(['aprovada']);
        expect(singleStatusState.status).toBe('aprovada');
    });

    it('uses persisted total when available and recomputes from items otherwise', () => {
        const persisted = AnalyticsEngine.normalizeSolicitation({
            id: 'req-1',
            total: 950.4,
            frete: 10,
            desconto: 20,
            itens: [
                { codigo: 'P1', quantidade: 2, valorUnit: 100 }
            ]
        });

        const recomputed = AnalyticsEngine.normalizeSolicitation({
            id: 'req-2',
            frete: 40,
            desconto: 15,
            itens: [
                { codigo: 'P2', quantidade: 3, valorUnit: 50 },
                { codigo: 'P3', quantidade: 1, valorUnit: 100 }
            ]
        });

        expect(persisted._analysisCost).toBe(950.4);
        expect(persisted._analysisCostSource).toBe('persisted_total');
        expect(recomputed._analysisCost).toBe(275);
        expect(recomputed._analysisCostSource).toBe('recomputed_items');
    });

    it('applies canonical search, status and period filters consistently', () => {
        const records = [
            {
                id: 'req-a',
                numero: 'REQ-001',
                cliente: 'Cliente A',
                tecnicoId: 'tech1',
                tecnicoNome: 'Carlos',
                status: 'aprovado',
                createdAt: new Date('2026-03-05T10:00:00Z').getTime(),
                itens: [{ codigo: 'ABC', descricao: 'Valvula', quantidade: 1, valorUnit: 120 }]
            },
            {
                id: 'req-b',
                numero: 'REQ-002',
                cliente: 'Cliente B',
                tecnicoId: 'tech2',
                tecnicoNome: 'Marina',
                status: 'pendente',
                createdAt: new Date('2026-02-01T10:00:00Z').getTime(),
                itens: [{ codigo: 'XYZ', descricao: 'Motor', quantidade: 1, valorUnit: 500 }]
            }
        ];

        const filtered = AnalyticsEngine.applyFilters(records, {
            moduleKey: 'relatorios',
            search: 'cliente a abc',
            statuses: ['aprovada'],
            tecnico: 'tech1',
            dateFrom: '2026-03-01',
            dateTo: '2026-03-31',
            useDefaultPeriod: false
        }, {
            moduleKey: 'relatorios',
            useDefaultPeriod: false
        });

        expect(filtered).toHaveLength(1);
        expect(filtered[0].id).toBe('req-a');
        expect(filtered[0]._analysisRegion).toBe('Sul');
    });

    it('does not inject an implicit period into modules that use only local non-temporal filters', () => {
        const state = AnalyticsEngine.buildFilterState({
            search: 'cliente'
        }, {
            moduleKey: 'solicitacoes',
            defaults: {
                search: '',
                statuses: [],
                tecnico: '',
                dateFrom: '',
                dateTo: '',
                useDefaultPeriod: false
            },
            useDefaultPeriod: false
        });

        expect(state.period).toBeNull();
        expect(state.rangeDays).toBe('');
        expect(state.dateFrom).toBe('');
        expect(state.dateTo).toBe('');
    });

    it('persists module filter state with app-version isolation and restores it', () => {
        const persisted = AnalyticsEngine.persistModuleFilterState('dashboard', {
            search: 'cliente premium',
            statuses: ['aprovada'],
            dateFrom: '2026-03-01',
            dateTo: '2026-03-31',
            rangeDays: 31
        }, {
            defaults: AnalyticsEngine.getModuleDefaults('dashboard'),
            useDefaultPeriod: true
        });

        const restored = AnalyticsEngine.restoreModuleFilterState('dashboard', {
            defaults: AnalyticsEngine.getModuleDefaults('dashboard'),
            useDefaultPeriod: true
        });

        expect(persisted.search).toBe('cliente premium');
        expect(restored.search).toBe('cliente premium');
        expect(restored.statuses).toEqual(['aprovada']);
        expect(restored.dateFrom).toBe('2026-03-01');
        expect(sessionStorage.getItem('diversey_filter_state:test-version:dashboard')).toContain('cliente premium');
    });

    it('computes metrics and preserves consistency between filtered dataset and indicators', () => {
        const records = [
            {
                id: 'req-1',
                numero: 'REQ-101',
                cliente: 'Cliente A',
                tecnicoId: 'tech1',
                tecnicoNome: 'Carlos',
                status: 'aprovada',
                createdAt: new Date('2026-03-02T10:00:00Z').getTime(),
                itens: [{ codigo: 'P1', descricao: 'Bomba', quantidade: 2, valorUnit: 100 }]
            },
            {
                id: 'req-2',
                numero: 'REQ-102',
                cliente: 'Cliente B',
                tecnicoId: 'tech2',
                tecnicoNome: 'Marina',
                status: 'em-transito',
                total: 900,
                createdAt: new Date('2026-03-08T10:00:00Z').getTime(),
                itens: [{ codigo: 'P2', descricao: 'Sensor', quantidade: 3, valorUnit: 50 }]
            },
            {
                id: 'req-3',
                numero: 'REQ-103',
                cliente: 'Cliente C',
                tecnicoId: 'tech2',
                tecnicoNome: 'Marina',
                status: 'rejeitada',
                createdAt: new Date('2026-03-06T10:00:00Z').getTime(),
                itens: [{ codigo: 'P3', descricao: 'Filtro', quantidade: 1, valorUnit: 80 }]
            }
        ];

        const dataset = AnalyticsEngine.buildDataset(records, {
            moduleKey: 'dashboard',
            dateFrom: '2026-03-01',
            dateTo: '2026-03-31',
            rangeDays: 31
        }, {
            moduleKey: 'dashboard',
            useDefaultPeriod: true,
            cacheKey: 'dashboard-test'
        });

        const metrics = AnalyticsEngine.computeMetrics(dataset, {
            moduleKey: 'dashboard',
            allRecords: records
        });

        expect(dataset.totalCount).toBe(3);
        expect(metrics.totalRequests).toBe(3);
        expect(metrics.totalApproved).toBe(2);
        expect(metrics.totalCost).toBe(1100);
        expect(metrics.totalPieces).toBe(5);
        expect(metrics.byStatus.aprovada).toBe(1);
        expect(metrics.byStatus['em-transito']).toBe(1);
        expect(metrics.highCostSolicitations[0].id).toBe('req-2');
    });
});
