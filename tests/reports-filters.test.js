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

function createRelatoriosEnvironment() {
    const technicians = [
        { id: 'tech-1', nome: 'Ana', regiao: 'Sul', ativo: true },
        { id: 'tech-2', nome: 'Bruno', regiao: 'Sudeste', ativo: true }
    ];
    const suppliers = [
        { id: 'sup-ebst', nome: 'EBST', ativo: true },
        { id: 'sup-hobart', nome: 'Hobart', ativo: true },
        { id: 'sup-parceiro', nome: 'Parceiro X', ativo: true }
    ];
    const solicitations = [
        {
            id: 'sol-1',
            numero: 'REQ-001',
            status: 'aprovada',
            tecnicoId: 'tech-1',
            tecnicoNome: 'Ana',
            fornecedorId: 'sup-ebst',
            cliente: 'Cliente A',
            createdAt: new Date('2026-03-10T10:00:00Z').getTime(),
            itens: [
                { codigo: 'P1', quantidade: 1, valorUnit: 100, fornecedorId: 'sup-ebst' }
            ]
        },
        {
            id: 'sol-2',
            numero: 'REQ-002',
            status: 'finalizada',
            tecnicoId: 'tech-2',
            tecnicoNome: 'Bruno',
            cliente: 'Cliente B',
            createdAt: new Date('2026-03-11T10:00:00Z').getTime(),
            itens: [
                { codigo: 'P2', quantidade: 2, valorUnit: 75, fornecedorId: 'sup-hobart' }
            ]
        },
        {
            id: 'sol-3',
            numero: 'REQ-003',
            status: 'pendente',
            tecnicoId: 'tech-1',
            tecnicoNome: 'Ana',
            fornecedorId: 'sup-parceiro',
            cliente: 'Cliente C',
            createdAt: new Date('2026-03-12T10:00:00Z').getTime(),
            itens: [
                { codigo: 'P3', quantidade: 1, valorUnit: 50, fornecedorId: 'sup-parceiro' }
            ]
        }
    ];

    global.window = global;
    global.localStorage = createStorage();
    global.sessionStorage = createStorage();
    global.APP_CONFIG = { version: 'test-version' };
    global.Logger = { info: jest.fn(), CATEGORY: { ANALYTICS: 'analytics' } };
    global.Auth = { renderMenu: jest.fn() };
    global.Chart = function Chart() {};
    global.DataManager = {
        getSettings: () => ({
            preferredRangeDays: 30,
            statsRangeDays: 30,
            slaHours: 24
        }),
        getSolicitations: () => solicitations.slice(),
        getTechnicians: () => technicians.slice(),
        getTechnicianById: (id) => technicians.find((tech) => tech.id === id) || null,
        getSuppliers: () => suppliers.slice(),
        getSupplierById: (id) => suppliers.find((supplier) => supplier.id === id) || null,
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
    const analyticsCode = fs.readFileSync(path.join(__dirname, '../js/analytics-engine.js'), 'utf8');
    const relatoriosCode = fs.readFileSync(path.join(__dirname, '../js/relatorios.js'), 'utf8');
    const reportsModernCode = fs.readFileSync(path.join(__dirname, '../js/components/reports-modern.js'), 'utf8')
        .replace('export function applyReportsModernization()', 'function applyReportsModernization()');

    global.Utils = new Function(`${utilsCode}; return Utils;`)();
    global.AnalyticsEngine = new Function(`${analyticsCode}; return window.AnalyticsEngine;`)();
    global.AnalyticsHelper = global.window.AnalyticsHelper;
    const relatorios = new Function(`${relatoriosCode}; return window.Relatorios;`)();
    const applyReportsModernization = new Function(`${reportsModernCode}; return applyReportsModernization;`)();

    return { relatorios, applyReportsModernization };
}

describe('Report filters', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
    });

    it('returns supplier options only for relevant cost solicitations while preserving the selected supplier', () => {
        const { relatorios } = createRelatoriosEnvironment();

        relatorios.filters = relatorios.getDefaultFilters();
        relatorios.filters.fornecedor = 'sup-parceiro';

        const options = relatorios.getAvailableCostFilters();

        expect(options.fornecedores.map((supplier) => supplier.id)).toEqual([
            'sup-ebst',
            'sup-hobart',
            'sup-parceiro'
        ]);
    });

    it('renders the modern report filters with the same structure used by the overview layout', () => {
        const { relatorios, applyReportsModernization } = createRelatoriosEnvironment();
        applyReportsModernization();

        relatorios.ensureFilters();
        relatorios.filters = {
            ...relatorios.filters,
            cliente: 'Cliente B',
            fornecedor: 'sup-hobart'
        };

        document.body.innerHTML = relatorios.renderCostFilters();

        const periodSelect = document.getElementById('report-period');
        const supplierSelect = document.getElementById('report-fornecedor');
        const clientInput = document.getElementById('report-cliente');

        expect(periodSelect).not.toBeNull();
        expect(Array.from(periodSelect.options).map((option) => option.value)).toEqual(['7', '30', '90', 'custom']);
        expect(supplierSelect).not.toBeNull();
        expect(clientInput).not.toBeNull();
        expect(clientInput.getAttribute('placeholder')).toBe('Nome do cliente');
        expect(clientInput.value).toBe('Cliente B');
        expect(Array.from(supplierSelect.options).map((option) => option.textContent.trim())).toEqual([
            'Todos',
            'EBST',
            'Hobart'
        ]);
        expect(supplierSelect.value).toBe('sup-hobart');
        expect(document.querySelector('.report-filters-compact')).not.toBeNull();
        expect(document.querySelector('.report-filters-row--primary')).not.toBeNull();
        expect(document.querySelector('.report-filters-row--secondary')).not.toBeNull();
        expect(document.querySelector('.report-filter-field--status')).not.toBeNull();
        expect(document.querySelector('.report-filter-field--supplier')).not.toBeNull();
        expect(document.querySelector('.report-filter-spacer')).not.toBeNull();
        expect(document.querySelector('.report-filter-actions-inline')).not.toBeNull();
        expect(document.querySelector('.report-filter-actions-row')).not.toBeNull();
        expect(document.querySelector('.report-filter-period-chip')).toBeNull();
    });
});
