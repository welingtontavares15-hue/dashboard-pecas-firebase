/**
 * Relatorios (Reports) Module
 * Focused on operational and cost analysis for field requests.
 */

const Relatorios = {
    currentReport: 'custos',
    filters: {
        search: '',
        dateFrom: '',
        dateTo: '',
        /**
         * Selected status values for reports. Uses plural to clarify multiple selections.
         */
        statuses: [],
        tecnico: '',
        regiao: '',
        cliente: '',
        rangeDays: '',
        useDefaultPeriod: true
    },
    chartWarningShown: false,
    charts: {},
    costStatuses: ['aprovada', 'em-transito', 'entregue', 'finalizada', 'historico-manual'],
    _filtersInitialized: false,
    _activeReportData: null,

    getDefaultFilters() {
        // Utilize sempre um período dinâmico baseado no intervalo padrão ao invés de um filtro global possivelmente fixo.
        const defaultRange = AnalyticsHelper.getDefaultRangeDays();
        const period = AnalyticsHelper.normalizePeriod({ rangeDays: defaultRange });
        return {
            search: '',
            dateFrom: period.dateFrom,
            dateTo: period.dateTo,
            /**
             * Default selected statuses (nenhum).
             */
            statuses: [],
            tecnico: '',
            regiao: '',
            cliente: '',
            rangeDays: period.rangeDays || defaultRange,
            useDefaultPeriod: true
        };
    },

    ensureFilters() {
        if (this._filtersInitialized) {
            return;
        }

        const defaults = this.getDefaultFilters();
        const restored = AnalyticsHelper.restoreModuleFilterState('relatorios', {
            defaults,
            useDefaultPeriod: true
        });
        // Merge defaults with restored state. Always place status arrays into the plural property.
        this.filters = {
            ...defaults,
            ...restored,
            statuses: Array.isArray(restored?.statuses)
                ? restored.statuses.slice()
                : (Array.isArray(restored?.status) ? restored.status.slice() : []),
            useDefaultPeriod: restored?.useDefaultPeriod !== false
        };
        this._filtersInitialized = true;
    },

    buildFilterState() {
        this.ensureFilters();
        const useDefaultPeriod = this.filters.useDefaultPeriod !== false;
        return AnalyticsHelper.buildFilterState({
            search: this.filters.search,
            statuses: this.filters.statuses,
            tecnico: this.filters.tecnico,
            regiao: this.filters.regiao,
            cliente: this.filters.cliente,
            dateFrom: this.filters.dateFrom,
            dateTo: this.filters.dateTo,
            rangeDays: useDefaultPeriod ? this.filters.rangeDays : '',
            useDefaultPeriod
        }, {
            moduleKey: 'relatorios',
            defaults: this.getDefaultFilters(),
            useDefaultPeriod
        });
    },

    persistFilters() {
        const useDefaultPeriod = this.filters.useDefaultPeriod !== false;
        const persisted = AnalyticsHelper.persistModuleFilterState('relatorios', {
            search: this.filters.search,
            statuses: this.filters.statuses,
            tecnico: this.filters.tecnico,
            regiao: this.filters.regiao,
            cliente: this.filters.cliente,
            dateFrom: this.filters.dateFrom,
            dateTo: this.filters.dateTo,
            rangeDays: useDefaultPeriod ? this.filters.rangeDays : '',
            useDefaultPeriod
        }, {
            defaults: this.getDefaultFilters(),
            useDefaultPeriod
        });
        this.filters = {
            ...this.filters,
            search: persisted?.search || '',
            statuses: Array.isArray(persisted?.statuses) ? persisted.statuses.slice() : [],
            tecnico: persisted?.tecnico || '',
            regiao: persisted?.regiao || '',
            cliente: persisted?.cliente || '',
            dateFrom: persisted?.dateFrom || '',
            dateTo: persisted?.dateTo || '',
            rangeDays: persisted?.rangeDays || '',
            useDefaultPeriod: persisted?.useDefaultPeriod !== false
        };
        return persisted;
    },

    getReportData() {
        const filterState = this.buildFilterState();
        const allSolicitations = DataManager.getSolicitations().slice();
        const dataset = AnalyticsHelper.buildDataset(allSolicitations, filterState, {
            moduleKey: 'relatorios',
            useDefaultPeriod: filterState.useDefaultPeriod,
            cacheKey: `relatorios:${this.currentReport}`
        });
        const analysis = AnalyticsHelper.computeMetrics(dataset, {
            moduleKey: 'relatorios',
            allRecords: allSolicitations,
            costStatuses: Array.isArray(filterState.statuses) && filterState.statuses.length > 0
                ? filterState.statuses
                : this.costStatuses
        });
        const monthlySummary = this.buildMonthlyAverageSummary(dataset.records, filterState.period);

        return {
            dataset,
            analysis,
            solicitations: dataset.records,
            monthlySummary,
            summaryLabel: `Base atual: ${Utils.formatNumber(dataset.totalCount)} solicitações filtradas.`
        };
    },

    /**
     * Render reports page
     */
    render() {
        this.ensureFilters();
        this._activeReportData = this.getReportData();
        const content = document.getElementById('content-area');

        content.innerHTML = `
            <div class="page-header">
                <h2><i class="fas fa-file-alt"></i> Relatórios</h2>
                <p class="text-muted">Analise custos de peças, técnicos e solicitações no mesmo painel.</p>
                <div class="filter-context-summary">
                    <span class="helper-text">${this._activeReportData.summaryLabel}</span>
                    ${this.renderActiveFilterChips()}
                </div>
            </div>

            <div class="tabs">
                <button class="tab-btn ${this.currentReport === 'custos' ? 'active' : ''}"
                        onclick="Relatorios.switchReport('custos')">
                    <i class="fas fa-coins"></i> Relatório de Custos
                </button>
                <button class="tab-btn ${this.currentReport === 'solicitacoes' ? 'active' : ''}"
                        onclick="Relatorios.switchReport('solicitacoes')">
                    <i class="fas fa-clipboard-list"></i> Solicitações
                </button>
                <button class="tab-btn ${this.currentReport === 'tecnicos' ? 'active' : ''}"
                        onclick="Relatorios.switchReport('tecnicos')">
                    <i class="fas fa-users"></i> Custo por Técnico
                </button>
                <button class="tab-btn ${this.currentReport === 'pecas' ? 'active' : ''}"
                        onclick="Relatorios.switchReport('pecas')">
                    <i class="fas fa-box-open"></i> Custo por Peça
                </button>
            </div>

            <div id="report-content">
                ${this.renderReportContent()}
            </div>

        `;
        this.afterRender();
    },

    /**
     * Switch report type
     */
    switchReport(report) {
        this.currentReport = report;
        this.render();
    },

    /**
     * Render report content based on current selection
     */
    renderReportContent() {
        switch (this.currentReport) {
        case 'custos':
            return this.renderCustosReport();
        case 'solicitacoes':
            return this.renderSolicitacoesReport();
        case 'tecnicos':
            return this.renderTecnicosReport();
        case 'pecas':
            return this.renderPecasReport();
        default:
            return '<p>Selecione um relatório.</p>';
        }
    },

    renderActiveFilterChips() {
        const chips = AnalyticsHelper.buildFilterChips(this.buildFilterState(), {
            moduleKey: 'relatorios',
            statusOptions: this.getStatusOptions(),
            labels: {
                tecnico: 'Tecnico',
                regiao: 'Regiao',
                cliente: 'Cliente'
            },
            resolvers: {
                tecnico: (value) => DataManager.getTechnicianById(value)?.nome || value
            }
        });

        if (!chips.length) {
            return '';
        }

        return `
            <div class="filter-chip-bar">
                ${chips.map((chip) => `
                    <button type="button" class="filter-chip" onclick="Relatorios.removeFilterChip('${chip.key}'${chip.key === 'status' ? `, '${Utils.escapeHtml(String(chip.value || ''))}'` : ''})">
                        <span>${Utils.escapeHtml(chip.label)}: ${Utils.escapeHtml(chip.displayValue || chip.value || '')}</span>
                        <i class="fas fa-times"></i>
                    </button>
                `).join('')}
            </div>
        `;
    },

    removeFilterChip(key, value = '') {
        if (key === 'search') {
            this.filters.search = '';
        } else if (key === 'status') {
            // Remove a single status value from the plural statuses property. The chip key remains singular for backwards compatibility.
            this.filters.statuses = (this.filters.statuses || []).filter((status) => status !== value);
        } else if (key === 'period') {
            const defaults = this.getDefaultFilters();
            this.filters.dateFrom = defaults.dateFrom;
            this.filters.dateTo = defaults.dateTo;
            this.filters.rangeDays = defaults.rangeDays;
            this.filters.useDefaultPeriod = true;
        } else if (Object.prototype.hasOwnProperty.call(this.filters, key)) {
            this.filters[key] = '';
        }

        this.persistFilters();
        this.render();
    },

    /**
     * Render solicitations report
     */
    renderSolicitacoesReport() {
        return `
            <div class="card">
                <div class="card-header">
                    <h4>Relatório de Solicitações</h4>
                    <button class="btn btn-outline" onclick="Relatorios.exportSolicitacoes()">
                        <i class="fas fa-file-excel"></i> Exportar Excel
                    </button>
                </div>
                <div class="card-body">
                    ${this.renderCostFilters()}
                    <div id="solicitacoes-report-results">
                        ${this.generateSolicitacoesTable()}
                    </div>
                </div>
            </div>

        `;
    },
    /**
     * Generate solicitations table
     */
    generateSolicitacoesTable() {
        const reportData = this._activeReportData || this.getReportData();
        const solicitations = reportData.solicitations;
        const analysis = reportData.analysis;
        const monthlySummary = reportData.monthlySummary;
        const highCostIds = new Set(analysis.highCostSolicitations.map(sol => sol.id));

        if (solicitations.length === 0) {
            return this.renderEmptyState(
                'Nenhuma solicitação encontrada',
                'Ajuste os filtros para visualizar os registros do período.'
            );
        }

        const totalValue = solicitations.reduce((sum, s) => sum + (Number(s._analysisCost ?? s.total) || 0), 0);
        const totalItems = solicitations.reduce((sum, s) => sum + (Number(s._analysisPieces) || (s.itens || []).reduce((itemSum, item) => itemSum + (Number(item?.quantidade) || 0), 0)), 0);
        const byStatus = {};

        solicitations.forEach((solicitation) => {
            byStatus[solicitation.status] = (byStatus[solicitation.status] || 0) + 1;
        });

        return `
            <div class="kpi-grid mb-3 report-kpi-grid">
                <div class="kpi-card metric-card">
                    <div class="kpi-content">
                        <h4>Total de solicitações</h4>
                        <div class="kpi-value">${Utils.formatNumber(solicitations.length)}</div>
                    </div>
                </div>
                <div class="kpi-card metric-card">
                    <div class="kpi-content">
                        <h4>Total financeiro</h4>
                        <div class="kpi-value metric-nowrap" title="${Utils.formatCurrency(totalValue)}">${Utils.formatCurrency(totalValue)}</div>
                    </div>
                </div>
                <div class="kpi-card metric-card">
                    <div class="kpi-content">
                        <h4>Total de peças</h4>
                        <div class="kpi-value">${Utils.formatNumber(totalItems)}</div>
                    </div>
                </div>
                <div class="kpi-card metric-card">
                    <div class="kpi-content">
                        <h4>Média mensal de custo</h4>
                        <div class="kpi-value metric-nowrap" title="${Utils.formatCurrency(monthlySummary.averageMonthlyCost)}">${Utils.formatCurrency(monthlySummary.averageMonthlyCost)}</div>
                        <div class="kpi-change">${Utils.formatNumber(monthlySummary.monthCount)} mês(es) no período</div>
                    </div>
                </div>
                <div class="kpi-card metric-card">
                    <div class="kpi-content">
                        <h4>Solicitações com custo elevado</h4>
                        <div class="kpi-value">${Utils.formatNumber(analysis.highCostSolicitations.length)}</div>
                        <div class="kpi-change">Acima de 30% da média do período</div>
                    </div>
                </div>
                ${Object.entries(byStatus).map(([status, count]) => `
                    <div class="kpi-card metric-card">
                        <div class="kpi-content">
                            <h4>${Utils.getStatusInfo(status).label}</h4>
                            <div class="kpi-value">${Utils.formatNumber(count)}</div>
                        </div>
                    </div>
                `).join('')}
            </div>

            <div class="table-container">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Número</th>
                            <th>Técnico</th>
                            <th>Cliente</th>
                            <th>Região</th>
                            <th>Data</th>
                            <th>Peças</th>
                            <th>Total</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${solicitations.slice(0, 50).map(sol => `
                            <tr class="${highCostIds.has(sol.id) ? 'cost-alert-row' : ''}">
                                <td>
                                    <strong>#${sol.numero}</strong>
                                    ${highCostIds.has(sol.id) ? '<div class="helper-text text-danger">Solicitação com custo elevado</div>' : ''}
                                </td>
                                <td>${Utils.escapeHtml(sol.tecnicoNome || 'Não identificado')}</td>
                                <td>${Utils.escapeHtml(this.getSolicitationClientName(sol))}</td>
                                <td>${Utils.escapeHtml(this.getSolicitationRegion(sol))}</td>
                                <td>${Utils.formatDate(sol.data || sol.createdAt)}</td>
                                <td>${Utils.formatNumber(Number(sol._analysisPieces) || 0)}</td>
                                <td>${Utils.formatCurrency(sol._analysisCost || 0)}</td>
                                <td>${Utils.renderStatusBadge(sol.status)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                    <tfoot>
                        <tr style="background: var(--bg-tertiary); font-weight: bold;">
                            <td colspan="6">Total Geral</td>
                            <td>${Utils.formatCurrency(totalValue)}</td>
                            <td></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
            ${solicitations.length > 50 ? `<p class="text-muted text-center mt-2">Mostrando 50 de ${solicitations.length} registros. Exporte para ver todos.</p>` : ''}
        `;
    },

        /**
     * Render cost dashboard report
     */
    renderCustosReport() {
        const reportData = this._activeReportData || this.getReportData();
        const analysis = reportData.analysis;
        const latestMonth = analysis.latestMonth;
        const topTechnicians = analysis.byTechnician.slice(0, 8)
            .sort((a, b) => (Number(b.totalCost) || 0) - (Number(a.totalCost) || 0));
        const topParts = analysis.byPiece.slice(0, 8)
            .sort((a, b) => (Number(b.totalCost) || 0) - (Number(a.totalCost) || 0));
        const monthlySummary = reportData.monthlySummary;

        return `
            <div class="card">
                <div class="card-header">
                    <div>
                        <h4>Relatório de Custos</h4>
                        <p class="text-muted" style="margin: 0; font-size: 0.9rem;">Painel executivo para leitura rápida de custo, tendência e concentração por técnico.</p>
                    </div>
                    <button class="btn btn-outline" onclick="Relatorios.exportCustos()">
                        <i class="fas fa-file-excel"></i> Exportar Excel
                    </button>
                </div>
                <div class="card-body">
                    ${this.renderCostFilters()}
                    ${analysis.totalCalls === 0 ? this.renderEmptyState(
        'Sem dados no período selecionado.',
        'Ajuste os filtros para visualizar o relatório de custos.'
    ) : `
                        <div class="kpi-grid mb-4 report-kpi-grid">
                            <div class="kpi-card metric-card">
                                <div class="kpi-icon primary"><i class="fas fa-coins"></i></div>
                                <div class="kpi-content">
                                    <h4>Custo total de peças</h4>
                                    <div class="kpi-value metric-nowrap" title="${Utils.formatCurrency(analysis.totalCost)}">${Utils.formatCurrency(analysis.totalCost)}</div>
                                    <div class="kpi-change">Base do período filtrado</div>
                                </div>
                            </div>
                            <div class="kpi-card metric-card">
                                <div class="kpi-icon info"><i class="fas fa-receipt"></i></div>
                                <div class="kpi-content">
                                    <h4>Custo médio por solicitação</h4>
                                    <div class="kpi-value metric-nowrap" title="${Utils.formatCurrency(analysis.costPerAttendance)}">${Utils.formatCurrency(analysis.costPerAttendance)}</div>
                                    <div class="kpi-change">${Utils.formatNumber(analysis.totalCalls)} solicitações com custo</div>
                                </div>
                            </div>
                            <div class="kpi-card metric-card">
                                <div class="kpi-icon success"><i class="fas fa-user-gear"></i></div>
                                <div class="kpi-content">
                                    <h4>Custo médio por técnico</h4>
                                    <div class="kpi-value metric-nowrap" title="${Utils.formatCurrency(analysis.avgCostPerTech)}">${Utils.formatCurrency(analysis.avgCostPerTech)}</div>
                                    <div class="kpi-change">${Utils.formatNumber(analysis.uniqueTechCount)} técnico(s) no período</div>
                                </div>
                            </div>
                            <div class="kpi-card metric-card">
                                <div class="kpi-icon warning"><i class="fas fa-calendar-alt"></i></div>
                                <div class="kpi-content">
                                    <h4>Custo do mês mais recente</h4>
                                    <div class="kpi-value metric-nowrap" title="${Utils.formatCurrency(latestMonth?.totalCost || 0)}">${Utils.formatCurrency(latestMonth?.totalCost || 0)}</div>
                                    <div class="kpi-change">${Utils.escapeHtml(latestMonth?.label || 'Sem dados mensais')}</div>
                                </div>
                            </div>
                            <div class="kpi-card metric-card">
                                <div class="kpi-icon info"><i class="fas fa-chart-line"></i></div>
                                <div class="kpi-content">
                                    <h4>Média mensal</h4>
                                    <div class="kpi-value metric-nowrap" title="${Utils.formatCurrency(monthlySummary.averageMonthlyCost)}">${Utils.formatCurrency(monthlySummary.averageMonthlyCost)}</div>
                                    <div class="kpi-change">${Utils.formatNumber(monthlySummary.monthCount)} mês(es) no período</div>
                                </div>
                            </div>
                        </div>

                        <div class="card compact-card">
                            <div class="card-header">
                                <h4>Resumo Financeiro</h4>
                            </div>
                            <div class="card-body">
                                <div class="table-container">
                                    <table class="table compact-table">
                                        <thead>
                                            <tr>
                                                <th>Indicador</th>
                                                <th>Valor</th>
                                                <th>Leitura</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <td>Custo total de peças</td>
                                                <td>${Utils.formatCurrency(analysis.totalCost)}</td>
                                                <td>Somatório de peça x quantidade no período.</td>
                                            </tr>
                                            <tr>
                                                <td>Custo médio por solicitação</td>
                                                <td>${Utils.formatCurrency(analysis.costPerAttendance)}</td>
                                                <td>Mede o custo médio por solicitação com material.</td>
                                            </tr>
                                            <tr>
                                                <td>Custo médio por técnico</td>
                                                <td>${Utils.formatCurrency(analysis.avgCostPerTech)}</td>
                                                <td>Mostra a distribuição média de custo entre técnicos.</td>
                                            </tr>
                                            <tr>
                                                <td>Custo do mês mais recente</td>
                                                <td>${Utils.formatCurrency(latestMonth?.totalCost || 0)}</td>
                                                <td>${Utils.escapeHtml(latestMonth?.label || 'Sem dados mensais')}</td>
                                            </tr>
                                            <tr>
                                                <td>Média mensal</td>
                                                <td>${Utils.formatCurrency(monthlySummary.averageMonthlyCost)}</td>
                                                <td>Custo total do período dividido pela quantidade de meses filtrados.</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        <div class="card mt-3">
                            <div class="card-header">
                                <h4>Evolução e concentração de custos</h4>
                            </div>
                            <div class="card-body">
                                <div class="charts-grid">
                                    <div class="chart-container">
                                        <h4 class="mb-3">Evolução mensal</h4>
                                        <div class="chart-wrapper">
                                            <canvas id="costMonthlyChart"></canvas>
                                        </div>
                                    </div>

                                    <div class="chart-container">
                                        <h4 class="mb-3">Custo total por técnico</h4>
                                        <div class="chart-wrapper">
                                            <canvas id="costTechniciansChart"></canvas>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="card mt-3">
                            <div class="card-header">
                                <h4>Ranking de técnicos</h4>
                            </div>
                            <div class="card-body">
                                <div class="table-container">
                                    <table class="table compact-table">
                                        <thead>
                                            <tr>
                                                <th>#</th>
                                                <th>Técnico</th>
                                                <th>Solicitações</th>
                                                <th>Custo total</th>
                                                <th>Custo médio por solicitação</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${topTechnicians.map((tech, index) => `
                                                <tr>
                                                    <td><strong>${index + 1}</strong></td>
                                                    <td><strong>${Utils.escapeHtml(tech.nome)}</strong></td>
                                                    <td>${Utils.formatNumber(tech.calls)}</td>
                                                    <td>${Utils.formatCurrency(tech.totalCost)}</td>
                                                    <td>${Utils.formatCurrency(tech.costPerCall)}</td>
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        <div class="card mt-3">
                            <div class="card-header">
                                <h4>Custo por peça</h4>
                            </div>
                            <div class="card-body">
                                <div class="charts-grid">
                                    <div class="chart-container">
                                        <h4 class="mb-3">Ranking de peças por custo total</h4>
                                        <div class="chart-wrapper">
                                            <canvas id="costPartsChart"></canvas>
                                        </div>
                                    </div>

                                    <div class="chart-container">
                                        <h4 class="mb-3">Peças com maior impacto financeiro</h4>
                                        <div class="table-container">
                                            <table class="table compact-table">
                                                <thead>
                                                    <tr>
                                                        <th>Peça</th>
                                                        <th>Quantidade</th>
                                                        <th>Custo total</th>
                                                        <th>Custo médio</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    ${topParts.map(part => `
                                                        <tr>
                                                            <td><strong>${Utils.escapeHtml(part.codigo || part.descricao || '-')}</strong></td>
                                                            <td>${Utils.formatNumber(part.quantidade)}</td>
                                                            <td>${Utils.formatCurrency(part.totalCost)}</td>
                                                            <td>${Utils.formatCurrency(part.averageUnitCost)}</td>
                                                        </tr>
                                                    `).join('')}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `}
                </div>
            </div>

        `;
    },
    /**
     * Render technician costs report
     */
    renderTecnicosReport() {
        const analysis = this.buildCostAnalysis();
        const techData = analysis.byTechnician.slice()
            .sort((a, b) => (Number(b.totalCost) || 0) - (Number(a.totalCost) || 0));

        return `
            <div class="card">
                <div class="card-header">
                    <h4>Custo por Técnico</h4>
                    <button class="btn btn-outline" onclick="Relatorios.exportTecnicos()">
                        <i class="fas fa-file-excel"></i> Exportar Excel
                    </button>
                </div>
                <div class="card-body">
                    ${this.renderCostFilters()}
                    ${techData.length === 0 ? this.renderEmptyState(
        'Sem dados no período selecionado.',
        'Não há dados suficientes para montar o ranking de técnicos com os filtros aplicados.'
    ) : `
                        <div class="charts-grid">
                            <div class="chart-container">
                                <h4 class="mb-3">Custo total por técnico (maior para menor)</h4>
                                <div class="chart-wrapper">
                                    <canvas id="costTechniciansDetailChart"></canvas>
                                </div>
                            </div>

                            <div class="chart-container">
                                <h4 class="mb-3">Tabela executiva</h4>
                                <div class="table-container">
                                    <table class="table">
                                        <thead>
                                            <tr>
                                                <th>#</th>
                                                <th>Técnico</th>
                                                <th>Solicitações</th>
                                                <th>Custo total</th>
                                                <th>Custo médio por solicitação</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${techData.map((tech, index) => `
                                                <tr>
                                                    <td><strong>${index + 1}</strong></td>
                                                    <td><strong>${Utils.escapeHtml(tech.nome)}</strong></td>
                                                    <td>${Utils.formatNumber(tech.calls)}</td>
                                                    <td>${Utils.formatCurrency(tech.totalCost)}</td>
                                                    <td>${Utils.formatCurrency(tech.costPerCall)}</td>
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    `}
                </div>
            </div>

        `;
    },
/**
     * Render part costs report
     */
    renderPecasReport() {
        const analysis = this.buildCostAnalysis();
        const partsData = analysis.byPiece.slice().sort((a, b) => (Number(b.totalCost) || 0) - (Number(a.totalCost) || 0));

        return `
            <div class="card">
                <div class="card-header">
                    <h4>Custo por Peça</h4>
                    <button class="btn btn-outline" onclick="Relatorios.exportPecas()">
                        <i class="fas fa-file-excel"></i> Exportar Excel
                    </button>
                </div>
                <div class="card-body">
                    ${this.renderCostFilters()}
                    ${partsData.length === 0 ? this.renderEmptyState(
        'Nenhuma peça no período',
        'Não há itens elegíveis para montar o ranking de peças com os filtros atuais.'
    ) : `
                        <div class="charts-grid">
                            <div class="chart-container">
                                <h4 class="mb-3">Ranking de peças por custo total</h4>
                                <div class="chart-wrapper">
                                    <canvas id="costPartsDetailChart"></canvas>
                                </div>
                            </div>

                            <div class="chart-container">
                                <h4 class="mb-3">Detalhamento por custo total</h4>
                                <div class="table-container">
                                    <table class="table">
                                        <thead>
                                            <tr>
                                                <th>#</th>
                                                <th>Código</th>
                                                <th>Descrição</th>
                                                <th>Categoria</th>
                                                <th>Quantidade</th>
                                                <th>Custo total</th>
                                                <th>Custo médio</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${partsData.map((part, index) => `
                                                <tr>
                                                    <td><strong>${index + 1}</strong></td>
                                                    <td><strong>${Utils.escapeHtml(part.codigo)}</strong></td>
                                                    <td>${Utils.escapeHtml(part.descricao)}</td>
                                                    <td>${Utils.escapeHtml(part.categoria)}</td>
                                                    <td>${Utils.formatNumber(part.quantidade)}</td>
                                                    <td>${Utils.formatCurrency(part.totalCost)}</td>
                                                    <td>${Utils.formatCurrency(part.averageUnitCost)}</td>
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    `}
                </div>
            </div>

        `;
    },

    /**
     * Render shared filters for cost views
     */
    renderCostFilters() {
        const options = this.getAvailableCostFilters();
        const filterState = this.buildFilterState();
        const defaults = this.getDefaultFilters();
        const periodLabel = filterState.period ? AnalyticsHelper.getRangeLabel(filterState.period) : 'Todos os registros';
        const selectedStatuses = this.getSelectedStatusSummary();
        const hasActiveFilters = Boolean(
            this.filters.search ||
            this.filters.tecnico ||
            this.filters.regiao ||
            this.filters.cliente ||
            selectedStatuses.length > 0 ||
            this.filters.useDefaultPeriod === false ||
            this.filters.dateFrom !== defaults.dateFrom ||
            this.filters.dateTo !== defaults.dateTo
        );

        return `
            <details class="filter-panel compact report-filter-panel" ${hasActiveFilters ? 'open' : ''}>
                <summary class="filter-panel-toggle">${hasActiveFilters ? 'Filtros ativos' : 'Filtros do relatório'}</summary>
                <div class="filters-bar mb-3 filter-panel-body" style="background: var(--bg-tertiary);">
                    <div class="search-box">
                        <input type="text" id="report-search" class="form-control" placeholder="Buscar por número, cliente, técnico, peça ou rastreio..." value="${Utils.escapeHtml(this.filters.search)}">
                    </div>
                    <div class="filter-group">
                        <label>De:</label>
                        <input type="date" id="report-date-from" class="form-control" value="${this.filters.dateFrom}">
                    </div>
                    <div class="filter-group">
                        <label>Até:</label>
                        <input type="date" id="report-date-to" class="form-control" value="${this.filters.dateTo}">
                    </div>
                    <div class="filter-group">
                        <label>Status:</label>
                        ${this.renderStatusMultiSelect('report-status')}
                    </div>
                    <div class="filter-group">
                        <label>Região:</label>
                        <select id="report-regiao" class="form-control">
                            <option value="">Todas</option>
                            ${options.regioes.map(regiao => `
                                <option value="${Utils.escapeHtml(regiao)}" ${this.filters.regiao === regiao ? 'selected' : ''}>
                                    ${Utils.escapeHtml(regiao)}
                                </option>
                            `).join('')}
                        </select>
                    </div>
                    <div class="filter-group">
                        <label>Técnico:</label>
                        <select id="report-tecnico" class="form-control">
                            <option value="">Todos</option>
                            ${options.tecnicos.map(tecnico => `
                                <option value="${tecnico.id}" ${this.filters.tecnico === tecnico.id ? 'selected' : ''}>
                                    ${Utils.escapeHtml(tecnico.nome)}
                                </option>
                            `).join('')}
                        </select>
                    </div>
                    <div class="filter-group">
                        <label>Cliente:</label>
                        <select id="report-cliente" class="form-control">
                            <option value="">Todos</option>
                            ${options.clientes.map(cliente => `
                                <option value="${Utils.escapeHtml(cliente)}" ${this.filters.cliente === cliente ? 'selected' : ''}>
                                    ${Utils.escapeHtml(cliente)}
                                </option>
                            `).join('')}
                        </select>
                    </div>
                    <button class="btn btn-primary" onclick="Relatorios.applyFilters()">
                        <i class="fas fa-filter"></i> Filtrar
                    </button>
                    <button class="btn btn-outline" onclick="Relatorios.clearFilters()">
                        <i class="fas fa-times"></i> Limpar
                    </button>
                    <div class="filter-group filter-period-pill">
                        <label>Base do relatório</label>
                        <div class="helper-text">${Utils.escapeHtml(periodLabel)}</div>
                    </div>
                </div>
            </details>

        `;
    },

    afterRender() {
        this.bindFilterControls();
        setTimeout(() => this.initCharts(), 50);
    },

    bindFilterControls() {
        const search = document.getElementById('report-search');
        if (search) {
            search.addEventListener('input', Utils.debounce(() => this.applyFilters(), 250));
        }

        ['report-date-from', 'report-date-to', 'report-tecnico', 'report-regiao', 'report-cliente'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('change', () => this.applyFilters());
            }
        });

        const trigger = document.querySelector('[data-status-trigger="report-status"]');
        if (trigger) {
            trigger.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                this.toggleStatusDropdown('report-status');
            });
        }

        document.querySelectorAll('[data-status-group="report-status"]').forEach(input => {
            input.addEventListener('change', () => this.applyFilters());
            input.addEventListener('click', (event) => event.stopPropagation());
        });

        document.querySelectorAll('[data-status-dropdown="report-status"]').forEach(panel => {
            panel.addEventListener('click', (event) => event.stopPropagation());
        });

        this.bindStatusDropdownClose();
    },

    getStatusOptions() {
        return [
            { value: 'pendente', label: 'Em aprovação' },
            { value: 'rejeitada', label: 'Rejeitado' },
            { value: 'aprovada', label: 'Aprovado / aguardando envio' },
            { value: 'em-transito', label: 'Em trânsito' },
            { value: 'finalizada', label: 'Finalizada' }
        ];
    },

    renderStatusMultiSelect(controlId) {
        const selected = this.getSelectedStatusSummary();
        const summaryText = selected.length > 0
            ? `${selected.length} status selecionado(s)`
            : 'Todos os status';

        return `
            <div class="status-filter" data-status-filter="${controlId}" role="group" aria-label="Filtro de status">
                <button type="button" class="status-filter-trigger" data-status-trigger="${controlId}">
                    <span class="status-filter-label">
                        <i class="fas fa-filter"></i>
                        <span class="status-filter-label-text">${Utils.escapeHtml(summaryText)}</span>
                    </span>
                    <i class="fas fa-chevron-down"></i>
                </button>
                <div class="status-filter-dropdown" data-status-dropdown="${controlId}">
                    <div class="status-filter-summary">
                        ${selected.length > 0
                            ? selected.map(status => `<span class="tag-soft info"><i class="fas fa-check-square"></i>${Utils.escapeHtml(status.label)}</span>`).join('')
                            : '<span class="status-filter-empty">Selecione um ou mais status</span>'}
                    </div>
                    <div class="status-filter-options">
                        ${this.getStatusOptions().map(option => `
                            <label class="status-filter-option">
                                <input type="checkbox" data-status-group="${controlId}" value="${option.value}" ${this.isStatusSelected(option.value) ? 'checked' : ''}>
                                <span>${option.label}</span>
                                ${Utils.renderStatusBadge(option.value)}
                            </label>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    },

    isStatusSelected(value) {
        return Array.isArray(this.filters.statuses) && this.filters.statuses.includes(value);
    },

    getSelectedStatusValues(controlId = 'report-status') {
        return Array.from(document.querySelectorAll(`[data-status-group="${controlId}"]:checked`)).map(option => option.value);
    },

    getSelectedStatusSummary() {
        const selectedValues = Array.isArray(this.filters.statuses) ? this.filters.statuses : [];
        return this.getStatusOptions().filter(option => selectedValues.includes(option.value));
    },

    toggleStatusDropdown(controlId = 'report-status') {
        const filter = document.querySelector(`[data-status-filter="${controlId}"]`);
        if (!filter) {
            return;
        }

        const shouldOpen = !filter.classList.contains('open');
        this.closeStatusDropdowns();
        if (shouldOpen) {
            filter.classList.add('open');
        }
    },

    closeStatusDropdowns() {
        document.querySelectorAll('.status-filter.open').forEach(filter => {
            filter.classList.remove('open');
        });
    },

    bindStatusDropdownClose() {
        if (this._statusDropdownCloseBound) {
            return;
        }

        document.addEventListener('click', () => this.closeStatusDropdowns());
        this._statusDropdownCloseBound = true;
    },

    buildMonthlyAverageSummary(solicitations = [], period = null) {
        const fromRaw = period?.dateFrom || this.filters.dateFrom;
        const toRaw = period?.dateTo || this.filters.dateTo;
        const from = Utils.parseAsLocalDate(fromRaw);
        const to = Utils.parseAsLocalDate(toRaw);
        let monthCount = 1;

        if (!isNaN(from.getTime()) && !isNaN(to.getTime())) {
            const start = from.getTime() <= to.getTime() ? from : to;
            const end = from.getTime() <= to.getTime() ? to : from;
            monthCount = Math.max(((end.getFullYear() - start.getFullYear()) * 12) + (end.getMonth() - start.getMonth()) + 1, 1);
        }

        const totalCost = solicitations.reduce((sum, sol) => sum + (Number(sol?._analysisCost ?? sol?.total) || 0), 0);

        return {
            monthCount,
            totalCost,
            averageMonthlyCost: monthCount > 0 ? totalCost / monthCount : 0
        };
    },

    /**
     * Apply filters
     */
    applyFilters() {
        this.filters.search = document.getElementById('report-search')?.value || '';
        this.filters.dateFrom = document.getElementById('report-date-from')?.value || '';
        this.filters.dateTo = document.getElementById('report-date-to')?.value || '';
        this.filters.statuses = this.getSelectedStatusValues('report-status');
        this.filters.tecnico = document.getElementById('report-tecnico')?.value || '';
        this.filters.regiao = document.getElementById('report-regiao')?.value || '';
        this.filters.cliente = document.getElementById('report-cliente')?.value || '';
        const hasManualPeriod = Boolean(this.filters.dateFrom || this.filters.dateTo);
        this.filters.useDefaultPeriod = !hasManualPeriod;
        if (hasManualPeriod) {
            this.filters.rangeDays = '';
        }
        const normalized = AnalyticsHelper.buildFilterState({
            search: this.filters.search,
            statuses: this.filters.statuses,
            tecnico: this.filters.tecnico,
            regiao: this.filters.regiao,
            cliente: this.filters.cliente,
            dateFrom: this.filters.dateFrom,
            dateTo: this.filters.dateTo,
            rangeDays: this.filters.useDefaultPeriod !== false ? this.filters.rangeDays : '',
            useDefaultPeriod: this.filters.useDefaultPeriod
        }, {
            moduleKey: 'relatorios',
            defaults: this.getDefaultFilters(),
            useDefaultPeriod: this.filters.useDefaultPeriod
        });
        this.filters = {
            ...this.filters,
            search: normalized.search,
            statuses: normalized.statuses,
            tecnico: normalized.tecnico,
            regiao: normalized.regiao,
            cliente: normalized.cliente,
            dateFrom: normalized.dateFrom,
            dateTo: normalized.dateTo,
            rangeDays: normalized.useDefaultPeriod ? normalized.rangeDays : '',
            useDefaultPeriod: normalized.useDefaultPeriod
        };
        this.persistFilters();

        this.render();
    },

    clearFilters() {
        this.filters = this.getDefaultFilters();
        this.persistFilters();
        this.render();
    },
    /**
     * Get filtered solicitations for the generic report
     */
    getFilteredSolicitations() {
        return (this._activeReportData || this.getReportData()).solicitations.slice();
    },

    getFilteredCostSolicitations() {
        return (this._activeReportData || this.getReportData()).analysis.costSolicitations.slice();
    },

    buildCostAnalysis() {
        const analysis = (this._activeReportData || this.getReportData()).analysis;
        return {
            ...analysis,
            totalCalls: analysis.totalApproved,
            totalItems: analysis.totalPieces,
            partsPerAttendance: analysis.partsPerSolicitation,
            costPerAttendance: analysis.averageCostPerSolicitation
        };
    },

    getAvailableCostFilters() {
        const relevantSolicitations = DataManager.getSolicitations().filter(s => this.isCostRelevantStatus(s.status));
        const allTechnicians = this.getSortedTechnicians();
        const relevantTechnicianIds = new Set(relevantSolicitations.map(s => s.tecnicoId).filter(Boolean));
        const technicians = allTechnicians.filter(tech => relevantTechnicianIds.size === 0 || relevantTechnicianIds.has(tech.id));
        const regionsSet = new Set();
        const clientsSet = new Set();
        let hasMissingClient = false;

        relevantSolicitations.forEach((solicitation) => {
            const region = AnalyticsHelper.getSolicitationRegion(solicitation);
            if (region) {
                regionsSet.add(region);
            }
            const client = AnalyticsHelper.getSolicitationClientName(solicitation);
            if (client && client !== 'Não informado') {
                clientsSet.add(client);
            } else {
                hasMissingClient = true;
            }
        });

        const clients = Array.from(clientsSet).sort((a, b) => a.localeCompare(b, 'pt-BR'));
        if (hasMissingClient) {
            clients.unshift('Não informado');
        }
        if (this.filters.cliente && !clients.includes(this.filters.cliente)) {
            clients.unshift(this.filters.cliente);
        }

        const regions = Array.from(regionsSet).sort((a, b) => a.localeCompare(b, 'pt-BR'));
        if (this.filters.regiao && !regions.includes(this.filters.regiao)) {
            regions.unshift(this.filters.regiao);
        }

        if (this.filters.tecnico && !technicians.some(tech => tech.id === this.filters.tecnico)) {
            const selectedTechnician = DataManager.getTechnicianById(this.filters.tecnico);
            if (selectedTechnician) {
                technicians.unshift(selectedTechnician);
            }
        }

        return {
            tecnicos: technicians,
            regioes: regions,
            clientes: clients
        };
    },
    /**
     * Export solicitations report
     */
    exportSolicitacoes() {
        const solicitations = this.getFilteredSolicitations();

        if (solicitations.length === 0) {
            Utils.showToast('Não há dados para exportar', 'warning');
            return;
        }

        const data = [];
        const placeholderItem = {
            codigo: '',
            descricao: 'Sem itens',
            quantidade: 0,
            valorUnit: 0
        };

        solicitations.forEach((solicitation) => {
            const subtotal = Number(solicitation.subtotal) || 0;
            const desconto = Number(solicitation.desconto) || 0;
            const frete = Number(solicitation.frete) || 0;
            const totalPedido = Number(solicitation.total) || 0;
            const items = (solicitation.itens?.length > 0) ? solicitation.itens : [placeholderItem];

            items.forEach((item) => {
                const quantity = Number(item.quantidade) || 0;
                const unitValue = Number(item.valorUnit) || 0;
                const totalItem = Math.round((quantity * unitValue) * 100) / 100;

                data.push({
                    Numero: solicitation.numero,
                    Técnico: solicitation.tecnicoNome,
                    Cliente: this.getSolicitationClientName(solicitation),
                    Região: this.getSolicitationRegion(solicitation),
                    Data: Utils.formatDate(solicitation.data),
                    Código: item.codigo || '',
                    Descricao: item.descricao || '',
                    Quantidade: quantity,
                    ValorUnitario: unitValue,
                    ValorTotalItem: totalItem,
                    Subtotal: subtotal,
                    Desconto: desconto,
                    Frete: frete,
                    TotalPedido: totalPedido,
                    Status: Utils.getStatusInfo(solicitation.status).label,
                    AprovadoPor: solicitation.approvedBy || '',
                    DataAprovacao: solicitation.approvedAt ? Utils.formatDate(solicitation.approvedAt, true) : ''
                });
            });
        });

        Utils.exportToExcel(data, 'relatorio_solicitacoes.xlsx', 'Solicitacoes');
        Utils.showToast('Relatório exportado com sucesso', 'success');
    },

    /**
     * Export costs report
     */
    exportCustos() {
        // Use the filtered solicitations (cost-relevant) instead of relying on buildCostAnalysis().
        const solicitations = typeof this.getFilteredCostSolicitations === 'function'
            ? this.getFilteredCostSolicitations()
            : this.getFilteredSolicitations();

        if (!Array.isArray(solicitations) || solicitations.length === 0) {
            Utils.showToast('Não há dados para exportar', 'warning');
            return;
        }

        const rows = [];
        solicitations.forEach((solicitation) => {
            const date = this.getSolicitationDate(solicitation);
            const monthLabel = date ? this.formatMonthLabel(date) : 'Sem data';
            const items = Array.isArray(solicitation.itens) ? solicitation.itens : [];

            items.forEach((item) => {
                const quantity = Number(item?.quantidade) || 0;
                const unitValue = Number(item?.valorUnit) || 0;
                const totalItem = Math.round((quantity * unitValue) * 100) / 100;
                rows.push({
                    Numero: solicitation.numero,
                    Mes: monthLabel,
                    Data: Utils.formatDate(solicitation.data || solicitation.createdAt),
                    Técnico: solicitation.tecnicoNome || 'Não identificado',
                    Cliente: this.getSolicitationClientName(solicitation),
                    Região: this.getSolicitationRegion(solicitation),
                    Código: item?.codigo || '',
                    Descricao: item?.descricao || '',
                    Quantidade: quantity,
                    ValorUnitario: unitValue,
                    CustoTotal: totalItem,
                    Status: Utils.getStatusInfo(solicitation.status).label
                });
            });
        });

        Utils.exportToExcel(rows, 'relatorio_custos.xlsx', 'Custos');
        Utils.showToast('Relatório exportado com sucesso', 'success');
    },

    /**
     * Export technician costs report
     */
    exportTecnicos() {
        const analysis = this.buildCostAnalysis();

        if (analysis.byTechnician.length === 0) {
            Utils.showToast('Não há dados para exportar', 'warning');
            return;
        }

        const data = analysis.byTechnician
            .slice()
            .sort((a, b) => (Number(b.totalCost) || 0) - (Number(a.totalCost) || 0))
            .map(tech => ({
                Técnico: tech.nome,
                Solicitações: tech.calls,
                CustoTotal: tech.totalCost,
                CustoMedioPorSolicitacao: tech.costPerCall
            }));

        Utils.exportToExcel(data, 'relatorio_tecnicos_custos.xlsx', 'CustosTécnicos');
        Utils.showToast('Relatório exportado com sucesso', 'success');
    },

    /**
     * Export part costs report
     */
    exportPecas() {
        const analysis = this.buildCostAnalysis();

        if (analysis.byPiece.length === 0) {
            Utils.showToast('Não há dados para exportar', 'warning');
            return;
        }

        const data = analysis.byPiece.map((part, index) => ({
            Posicao: index + 1,
            Código: part.codigo,
            Descricao: part.descricao,
            Categoria: part.categoria,
            Quantidade: part.quantidade,
            CustoTotal: part.totalCost,
            CustoMedio: part.averageUnitCost
        }));

        Utils.exportToExcel(data, 'relatorio_pecas_custos.xlsx', 'CustosPeças');
        Utils.showToast('Relatório exportado com sucesso', 'success');
    },

    /**
     * Destroy existing charts before re-rendering
     */
    destroyCharts() {
        Object.values(this.charts).forEach((chart) => {
            if (chart && typeof chart.destroy === 'function') {
                chart.destroy();
            }
        });
        this.charts = {};
    },

    /**
     * Initialize charts after page render
     */
    initCharts() {
        this.destroyCharts();

        const renderFallback = (canvasId) => {
            const canvas = document.getElementById(canvasId);
            if (canvas && canvas.parentElement) {
                canvas.parentElement.innerHTML = '<div class="chart-fallback">Grafico indisponivel (biblioteca nao carregada).</div>';
            }
        };

        const chartIds = [
            'costMonthlyChart',
            'costPartsChart',
            'costTechniciansChart',
            'costTechniciansDetailChart',
            'costPartsDetailChart'
        ];

        if (typeof Chart === 'undefined') {
            chartIds.forEach(renderFallback);
            if (!this.chartWarningShown && typeof Utils !== 'undefined' && Utils.showToast) {
                Utils.showToast('Biblioteca de graficos nao carregada. Exibindo dados sem graficos.', 'warning');
                this.chartWarningShown = true;
            }
            return;
        }

        const analysis = this.buildCostAnalysis();
        const byTechnician = analysis.byTechnician
            .slice()
            .sort((a, b) => (Number(b.totalCost) || 0) - (Number(a.totalCost) || 0));
        const byPiece = analysis.byPiece
            .slice()
            .sort((a, b) => (Number(b.totalCost) || 0) - (Number(a.totalCost) || 0));
        const byMonth = analysis.byMonth || [];

        const isDark = document.body.classList.contains('dark-mode');
        const textColor = isDark ? '#e4e6eb' : '#212529';
        const gridColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
        const currencyTick = (value) => Utils.formatCurrency(Number(value) || 0);

        const createHorizontalBarChart = (id, labels, data, color, datasetLabel) => {
            const ctx = document.getElementById(id);
            if (!ctx || labels.length === 0) {
                return;
            }

            this.charts[id] = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels,
                    datasets: [{
                        label: datasetLabel,
                        data,
                        backgroundColor: color,
                        borderRadius: 6,
                        maxBarThickness: 30
                    }]
                },
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: (context) => `${datasetLabel}: ${Utils.formatCurrency(context.parsed.x || 0)}`
                            }
                        }
                    },
                    scales: {
                        x: {
                            beginAtZero: true,
                            ticks: { color: textColor, callback: currencyTick },
                            grid: { color: gridColor }
                        },
                        y: {
                            ticks: { color: textColor },
                            grid: { display: false }
                        }
                    }
                }
            });
        };

        const createVerticalBarChart = (id, labels, data, color, datasetLabel) => {
            const ctx = document.getElementById(id);
            if (!ctx || labels.length === 0) {
                return;
            }

            this.charts[id] = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels,
                    datasets: [{
                        label: datasetLabel,
                        data,
                        backgroundColor: color,
                        borderRadius: 8,
                        maxBarThickness: 42
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: (context) => `${datasetLabel}: ${Utils.formatCurrency(context.parsed.y || 0)}`
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: { color: textColor, callback: currencyTick },
                            grid: { color: gridColor }
                        },
                        x: {
                            ticks: {
                                color: textColor,
                                autoSkip: false,
                                maxRotation: 40,
                                minRotation: 30
                            },
                            grid: { display: false }
                        }
                    }
                }
            });
        };

        const monthlyCtx = document.getElementById('costMonthlyChart');
        if (monthlyCtx && byMonth.length > 0) {
            this.charts.costMonthlyChart = new Chart(monthlyCtx, {
                type: 'line',
                data: {
                    labels: byMonth.map(month => month.label),
                    datasets: [{
                        label: 'Custo mensal',
                        data: byMonth.map(month => month.totalCost),
                        borderColor: '#0066b3',
                        backgroundColor: 'rgba(0, 102, 179, 0.12)',
                        fill: true,
                        tension: 0.3,
                        pointRadius: 4,
                        pointHoverRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: (context) => `Custo: ${Utils.formatCurrency(context.parsed.y || 0)}`
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: { color: textColor, callback: currencyTick },
                            grid: { color: gridColor }
                        },
                        x: {
                            ticks: { color: textColor },
                            grid: { display: false }
                        }
                    }
                }
            });
        }

        createHorizontalBarChart(
            'costPartsChart',
            byPiece.slice(0, 10).map(part => part.codigo),
            byPiece.slice(0, 10).map(part => part.totalCost),
            '#00a859',
            'Custo da peça'
        );

        createVerticalBarChart(
            'costTechniciansChart',
            byTechnician.slice(0, 10).map(tech => tech.nome),
            byTechnician.slice(0, 10).map(tech => tech.totalCost),
            '#ff8a00',
            'Custo do técnico'
        );

        createVerticalBarChart(
            'costTechniciansDetailChart',
            byTechnician.slice(0, 12).map(tech => tech.nome),
            byTechnician.slice(0, 12).map(tech => tech.totalCost),
            '#0066b3',
            'Custo do técnico'
        );

        createHorizontalBarChart(
            'costPartsDetailChart',
            byPiece.slice(0, 12).map(part => part.codigo),
            byPiece.slice(0, 12).map(part => part.totalCost),
            '#00a859',
            'Custo da peça'
        );
    },
/**
     * Check whether a status should be included in financial cost reports
     */
    isCostRelevantStatus(status) {
        return this.costStatuses.includes(status);
    },

    /**
     * Get normalized solicitation date
     */
    getSolicitationDate(solicitation) {
        if (solicitation?.data) {
            const parsed = Utils.parseAsLocalDate(solicitation.data);
            if (!isNaN(parsed.getTime())) {
                return parsed;
            }
        }

        if (solicitation?.createdAt) {
            const fallback = new Date(solicitation.createdAt);
            if (!isNaN(fallback.getTime())) {
                return fallback;
            }
        }

        return null;
    },

    /**
     * Resolve client name for a solicitation
     */
    getSolicitationClientName(solicitation) {
        const client = String(solicitation?.cliente || solicitation?.clienteNome || '').trim();
        return client || 'Não informado';
    },

    /**
     * Resolve region for a solicitation through the technician registry
     */
    getSolicitationRegion(solicitation) {
        const technician = solicitation?.tecnicoId ? DataManager.getTechnicianById(solicitation.tecnicoId) : null;
        return String(technician?.regiao || technician?.estado || '').trim() || 'Sem região';
    },

    /**
     * Format a month label for charts and tables
     */
    formatMonthLabel(date) {
        return new Intl.DateTimeFormat('pt-BR', {
            month: 'long',
            year: 'numeric'
        }).format(date);
    },

    /**
     * Get sorted technicians list
     */
    getSortedTechnicians() {
        return DataManager.getTechnicians()
            .filter(tech => tech.ativo !== false)
            .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    },

    /**
     * Render a generic empty state
     */
    renderEmptyState(title, description) {
        return `
            <div class="empty-state">
                <i class="fas fa-chart-line"></i>
                <h4>${Utils.escapeHtml(title)}</h4>
                <p>${Utils.escapeHtml(description)}</p>
            </div>
        `;
    }
};

if (typeof window !== 'undefined') {
    window.Relatorios = Relatorios;
}































