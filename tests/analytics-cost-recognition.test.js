/**
 * Cost-recognition regression tests.
 * Monthly expense is recognized on approval date, not request creation date.
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

Object.defineProperty(global, 'localStorage', { value: createStorage(), configurable: true });
Object.defineProperty(global, 'sessionStorage', { value: createStorage(), configurable: true });

global.window = global;
global.APP_CONFIG = { version: 'approval-cost-test' };
global.Logger = {
    CATEGORY: { ANALYTICS: 'analytics', SYSTEM: 'system' },
    info: jest.fn()
};
global.DataManager = {
    getSettings: () => ({ preferredRangeDays: 30, statsRangeDays: 30, slaHours: 24 }),
    saveSetting: jest.fn(),
    getTechnicianById: () => null,
    normalizeWorkflowStatus: (status) => {
        const value = String(status || '').trim().toLowerCase().replace(/_/g, '-');
        const aliases = {
            aprovado: 'aprovada',
            aprovada: 'aprovada',
            'em-transito': 'em-transito',
            entregue: 'entregue',
            finalizada: 'finalizada',
            rejeitada: 'rejeitada',
            pendente: 'pendente',
            'historico-manual': 'historico-manual'
        };
        return aliases[value] || value;
    }
};

const utilsCode = fs.readFileSync(path.join(__dirname, '../js/utils.js'), 'utf8');
const analyticsEngineCode = fs.readFileSync(path.join(__dirname, '../js/analytics-engine.js'), 'utf8');
const approvalCostCode = fs.readFileSync(path.join(__dirname, '../js/analytics-cost-recognition.js'), 'utf8');

const loadUtils = new Function(`${utilsCode}; return Utils;`);
global.Utils = loadUtils();

const loadAnalyticsEngine = new Function(`${analyticsEngineCode}; return window.AnalyticsEngine;`);
global.AnalyticsEngine = loadAnalyticsEngine();

const installApprovalCostRecognition = new Function(approvalCostCode);
installApprovalCostRecognition();

function buildSeptemberDataset(records) {
    const filterState = AnalyticsEngine.buildFilterState({
        dateFrom: '2026-09-01',
        dateTo: '2026-09-30',
        useDefaultPeriod: false
    }, {
        moduleKey: 'dashboard',
        defaults: AnalyticsEngine.getModuleDefaults('dashboard'),
        useDefaultPeriod: false
    });

    return AnalyticsEngine.buildDataset(records, filterState, {
        moduleKey: 'dashboard',
        useDefaultPeriod: false,
        cacheKey: ''
    });
}

describe('approval-date cost recognition', () => {
    it('books an August request approved in September as a September expense', () => {
        const records = [
            {
                id: 'aug-approved-sep',
                numero: 'REQ-20260830-0001',
                status: 'aprovada',
                data: '2026-08-30',
                createdAt: new Date('2026-08-30T12:00:00Z').getTime(),
                approvedAt: new Date('2026-09-01T12:00:00Z').getTime(),
                total: 100,
                itens: [{ codigo: 'P1', descricao: 'Peca A', quantidade: 1, valorUnit: 100 }]
            },
            {
                id: 'sep-approved-sep',
                numero: 'REQ-20260902-0001',
                status: 'em-transito',
                data: '2026-09-02',
                createdAt: new Date('2026-09-02T12:00:00Z').getTime(),
                approvedAt: new Date('2026-09-03T12:00:00Z').getTime(),
                total: 200,
                itens: [{ codigo: 'P2', descricao: 'Peca B', quantidade: 1, valorUnit: 200 }]
            },
            {
                id: 'sep-approved-oct',
                numero: 'REQ-20260930-0001',
                status: 'aprovada',
                data: '2026-09-30',
                createdAt: new Date('2026-09-30T12:00:00Z').getTime(),
                approvedAt: new Date('2026-10-01T12:00:00Z').getTime(),
                total: 300,
                itens: [{ codigo: 'P3', descricao: 'Peca C', quantidade: 1, valorUnit: 300 }]
            },
            {
                id: 'sep-pending',
                numero: 'REQ-20260905-0001',
                status: 'pendente',
                data: '2026-09-05',
                createdAt: new Date('2026-09-05T12:00:00Z').getTime(),
                total: 999,
                itens: [{ codigo: 'P4', descricao: 'Peca D', quantidade: 1, valorUnit: 999 }]
            }
        ];

        const dataset = buildSeptemberDataset(records);
        const metrics = AnalyticsEngine.computeMetrics(dataset, {
            moduleKey: 'dashboard',
            allRecords: records
        });

        expect(dataset.records.map((record) => record.id).sort()).toEqual([
            'sep-approved-oct',
            'sep-approved-sep',
            'sep-pending'
        ]);
        expect(metrics.totalRequests).toBe(3);
        expect(metrics.totalApproved).toBe(2);
        expect(metrics.totalCost).toBe(300);
        expect(metrics.costSolicitations.map((record) => record.id).sort()).toEqual([
            'aug-approved-sep',
            'sep-approved-sep'
        ]);
        expect(metrics.byMonth).toHaveLength(1);
        expect(metrics.byMonth[0].key).toBe('2026-09');
        expect(metrics.byMonth[0].requestCount).toBe(3);
        expect(metrics.byMonth[0].totalCost).toBe(300);
    });

    it('recovers approval date from approval history for legacy records', () => {
        const records = [
            {
                id: 'legacy-finalized',
                status: 'finalizada',
                createdAt: new Date('2026-08-10T12:00:00Z').getTime(),
                total: 450,
                approvals: [
                    {
                        decision: 'approved',
                        at: new Date('2026-09-04T12:00:00Z').getTime()
                    }
                ],
                itens: [{ codigo: 'P5', descricao: 'Peca E', quantidade: 1, valorUnit: 450 }]
            }
        ];

        const metrics = AnalyticsEngine.computeMetrics(buildSeptemberDataset(records), {
            moduleKey: 'dashboard',
            allRecords: records
        });

        expect(metrics.totalRequests).toBe(0);
        expect(metrics.totalApproved).toBe(1);
        expect(metrics.totalCost).toBe(450);
        expect(metrics.costSolicitations[0].id).toBe('legacy-finalized');
    });

    it('does not recognize cost without evidence of approval', () => {
        const records = [
            {
                id: 'missing-approval-date',
                status: 'aprovada',
                createdAt: new Date('2026-09-10T12:00:00Z').getTime(),
                total: 700,
                itens: [{ codigo: 'P6', descricao: 'Peca F', quantidade: 1, valorUnit: 700 }]
            }
        ];

        const metrics = AnalyticsEngine.computeMetrics(buildSeptemberDataset(records), {
            moduleKey: 'dashboard',
            allRecords: records
        });

        expect(metrics.totalRequests).toBe(1);
        expect(metrics.totalApproved).toBe(0);
        expect(metrics.totalCost).toBe(0);
        expect(metrics.costSolicitations).toEqual([]);
    });
});
