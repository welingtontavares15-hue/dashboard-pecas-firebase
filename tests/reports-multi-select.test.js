describe('reports multi-select enhancement', () => {
    let applyReportsMultiSelect;

    beforeAll(async () => {
        ({ applyReportsMultiSelect } = await import('../js/components/reports-multi-select.js'));
    });

    beforeEach(() => {
        document.body.innerHTML = '<div id="content-area"></div>';
        window.sessionStorage.clear();
        global.Utils = {
            escapeHtml: (value) => String(value ?? ''),
            normalizeText: (value) => String(value ?? '').toLowerCase(),
            formatNumber: (value) => String(value ?? 0)
        };
        global.AnalyticsHelper = {
            getSolicitationRegion: () => 'Sul',
            getSolicitationClientName: () => 'Cliente A',
            buildDataset: () => ({ records: [], totalCount: 0, period: null, filterState: {} }),
            computeMetrics: () => ({ totalCost: 0 })
        };
        global.DataManager = {
            getSolicitations: () => []
        };
        global.Relatorios = {
            filters: {
                statuses: [],
                tecnico: '',
                regiao: '',
                cliente: '',
                fornecedor: '',
                dateFrom: '2026-08-01',
                dateTo: '2026-08-28',
                rangeDays: '',
                useDefaultPeriod: false
            },
            costStatuses: ['aprovada'],
            getDefaultFilters: () => ({ dateFrom: '2026-08-01', dateTo: '2026-08-28', rangeDays: 30 }),
            getSelectedPeriodPreset: () => 'custom',
            getPeriodOptions: () => [{ value: 'custom', label: 'Personalizado' }],
            getAvailableCostFilters: () => ({
                tecnicos: [{ id: 'T1', nome: 'Técnico 1' }, { id: 'T2', nome: 'Técnico 2' }],
                regioes: ['Sul', 'Sudeste'],
                clientes: ['Cliente A', 'Cliente B'],
                fornecedores: [{ id: 'F1', nome: 'Fornecedor 1' }, { id: 'F2', nome: 'Fornecedor 2' }]
            }),
            renderStatusMultiSelect: () => '<div class="status-filter">status</div>',
            getSelectedStatusValues: () => [],
            buildFilterState: () => ({ statuses: [], period: null, useDefaultPeriod: false }),
            buildMonthlyAverageSummary: () => ({ monthCount: 1, totalCost: 0, averageMonthlyCost: 0 }),
            persistFilters: jest.fn(),
            render: jest.fn(),
            afterRender: jest.fn(),
            clearFilters: jest.fn()
        };
        window.Relatorios = global.Relatorios;
    });

    afterEach(() => {
        delete global.Relatorios;
        delete window.Relatorios;
        delete global.DataManager;
        delete global.AnalyticsHelper;
        delete global.Utils;
    });

    test('renders checkbox multi-select controls for all requested dimensions', () => {
        applyReportsMultiSelect();
        const html = window.Relatorios.renderCostFilters();

        expect(html).toContain('data-premium-multi-filter="report-clientes"');
        expect(html).toContain('data-premium-multi-filter="report-tecnicos"');
        expect(html).toContain('data-premium-multi-filter="report-fornecedores"');
        expect(html).toContain('data-premium-multi-filter="report-regioes"');
        expect(html).toContain('type="checkbox"');
        expect(html).toContain('Selecionar todos');
        expect(html).toContain('Limpar');
    });
});
