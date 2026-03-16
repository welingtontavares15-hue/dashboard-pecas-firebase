const fs = require('fs');
const path = require('path');

const portalCode = fs.readFileSync(path.join(__dirname, '../js/fornecedor.js'), 'utf8');

const loadPortal = () => {
    const factory = new Function(`${portalCode}; return FornecedorPortal;`);
    return factory();
};

describe('Fornecedor portal scope isolation', () => {
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

    beforeEach(() => {
        global.Utils = {
            escapeHtml: (value) => String(value || ''),
            formatNumber: (value) => String(value),
            supplierHasOperationalEmail: (supplier, email) => String(supplier?.email || '').trim().toLowerCase() === String(email || '').trim().toLowerCase(),
            extractOperationalEmailRecipients: (...values) => values.flat(Infinity).filter(Boolean).map((value) => String(value).trim().toLowerCase())
        };
        global.AnalyticsHelper = {
            restoreModuleFilterState: jest.fn(() => ({})),
            persistModuleFilterState: jest.fn((value) => value),
            buildFilterChips: jest.fn(() => []),
            filterSolicitations: jest.fn((records, options) => records.filter((record) => options.recordPredicate(record)))
        };
        global.DataManager = {
            getSolicitations: jest.fn(() => ([
                { id: 'hob-approved', numero: 'REQ-1', status: 'aprovada', fornecedorId: 'sup-hobart' },
                { id: 'hob-transit', numero: 'REQ-2', status: 'em-transito', fornecedorId: 'sup-hobart' },
                { id: 'ebst-approved', numero: 'REQ-3', status: 'aprovada', fornecedorId: 'sup-ebst' },
                { id: 'hob-final', numero: 'REQ-4', status: 'finalizada', fornecedorId: 'sup-hobart' }
            ])),
            getSupplierById: jest.fn((id) => suppliers[id] || null),
            normalizeWorkflowStatus: jest.fn((status) => String(status || '').trim().toLowerCase())
        };
    });

    afterEach(() => {
        delete global.Utils;
        delete global.AnalyticsHelper;
        delete global.DataManager;
        delete global.Auth;
    });

    it('shows only Hobart approved or in-transit orders when the supplier session resolves to Hobart', () => {
        global.Auth = {
            getCurrentUser: jest.fn(() => ({ role: 'fornecedor', email: 'stale-hobart@example.com' })),
            getFornecedorId: jest.fn(() => 'sup-hobart')
        };

        const portal = loadPortal();
        portal.ensureFilters();

        const solicitations = portal.getFilteredSolicitations();

        expect(solicitations.map((item) => item.id)).toEqual(['hob-approved', 'hob-transit']);
        expect(solicitations.some((item) => item.fornecedorId === 'sup-ebst')).toBe(false);
    });

    it('falls back to the supplier registry e-mail without leaking EBST orders into Hobart scope', () => {
        global.Auth = {
            getCurrentUser: jest.fn(() => ({ role: 'fornecedor', email: 'pedidos@hobart.com.br' })),
            getFornecedorId: jest.fn(() => null)
        };

        const portal = loadPortal();
        portal.ensureFilters();

        const solicitations = portal.getFilteredSolicitations();

        expect(solicitations.map((item) => item.id)).toEqual(['hob-approved', 'hob-transit']);
        expect(solicitations.some((item) => item.fornecedorId === 'sup-ebst')).toBe(false);
    });
});
