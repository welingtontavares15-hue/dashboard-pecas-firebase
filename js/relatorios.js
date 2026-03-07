/**
 * Relatorios (Reports) Module
 * Focused on operational and cost analysis for field requests.
 */

const Relatorios = {
    currentReport: 'custos',
    filters: {
        dateFrom: '',
        dateTo: '',
        status: [],
        tecnico: '',
        regiao: '',
        cliente: ''
    },
    chartWarningShown: false,
    charts: {},
    costStatuses: ['aprovada', 'em-transito', 'entregue', 'finalizada', 'historico-manual'],

    /**
     * Render reports page
     */
    render() {
        const content = document.getElementById('content-area');

        content.innerHTML = `
            <div class="page-header">
                <h2><i class="fas fa-file-alt"></i> Relatorios</h2>
                <p class="text-muted">Analise custos de pecas, tecnicos e solicitacoes no mesmo painel.</p>
            </div>

            <div class="tabs">
                <button class="tab-btn ${this.currentReport === 'custos' ? 'active' : ''}"
                        onclick="Relatorios.switchReport('custos')">
                    <i class="fas fa-coins"></i> Relatorio de Custos
                </button>
                <button class="tab-btn ${this.currentReport === 'solicitacoes' ? 'active' : ''}"
                        onclick="Relatorios.switchReport('solicitacoes')">
                    <i class="fas fa-clipboard-list"></i> Solicitacoes
                </button>
                <button class="tab-btn ${this.currentReport === 'tecnicos' ? 'active' : ''}"
                        onclick="Relatorios.switchReport('tecnicos')">
                    <i class="fas fa-users"></i> Custo por Tecnico
                </button>
                <button class="tab-btn ${this.currentReport === 'pecas' ? 'active' : ''}"
                        onclick="Relatorios.switchReport('pecas')">
                    <i class="fas fa-box-open"></i> Custo por Peca
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
            return '<p>Selecione um relatorio.</p>';
        }
    },

    /**
     * Render solicitations report
     */
    renderSolicitacoesReport() {
        const technicians = this.getSortedTechnicians();

        return `
            <div class="card">
                <div class="card-header">
                    <h4>Relatorio de Solicitacoes</h4>
                    <button class="btn btn-outline" onclick="Relatorios.exportSolicitacoes()">
                        <i class="fas fa-file-excel"></i> Exportar Excel
                    </button>
                </div>
                <div class="card-body">
                    <div class="filters-bar mb-3" style="background: var(--bg-tertiary);">
                        <div class="filter-group">
                            <label>De:</label>
                            <input type="date" id="report-date-from" class="form-control" value="${this.filters.dateFrom}">
                        </div>
                        <div class="filter-group">
                            <label>Ate:</label>
                            <input type="date" id="report-date-to" class="form-control" value="${this.filters.dateTo}">
                        </div>
                        <div class="filter-group">
                            <label>Status:</label>
                            ${this.renderStatusMultiSelect('report-status')}
                        </div>
                        <div class="filter-group">
                            <label>Tecnico:</label>
                            <select id="report-tecnico" class="form-control">
                                <option value="">Todos</option>
                                ${technicians.map(t => `
                                    <option value="${t.id}" ${this.filters.tecnico === t.id ? 'selected' : ''}>
                                        ${Utils.escapeHtml(t.nome)}
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
                    </div>

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
        const solicitations = this.getFilteredSolicitations();
        const monthlySummary = this.buildMonthlyAverageSummary(solicitations);

        if (solicitations.length === 0) {
            return this.renderEmptyState(
                'Nenhuma solicitacao encontrada',
                'Ajuste os filtros para visualizar os registros do periodo.'
            );
        }

        const totalValue = solicitations.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
        const totalItems = solicitations.reduce((sum, s) => sum + ((s.itens || []).length), 0);
        const byStatus = {};

        solicitations.forEach((solicitation) => {
            byStatus[solicitation.status] = (byStatus[solicitation.status] || 0) + 1;
        });

        return `
            <div class="kpi-grid mb-3" style="grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));">
                <div class="kpi-card">
                    <div class="kpi-content">
                        <h4>Total de solicitacoes</h4>
                        <div class="kpi-value">${Utils.formatNumber(solicitations.length)}</div>
                    </div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-content">
                        <h4>Total financeiro</h4>
                        <div class="kpi-value">${Utils.formatCurrency(totalValue)}</div>
                    </div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-content">
                        <h4>Total de itens</h4>
                        <div class="kpi-value">${Utils.formatNumber(totalItems)}</div>
                    </div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-content">
                        <h4>Media mensal</h4>
                        <div class="kpi-value">${Utils.formatNumber(monthlySummary.averagePerMonth, 2)}</div>
                        <div class="kpi-change">${Utils.formatNumber(monthlySummary.monthCount)} mes(es) no periodo</div>
                    </div>
                </div>
                ${Object.entries(byStatus).map(([status, count]) => `
                    <div class="kpi-card">
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
                            <th>Numero</th>
                            <th>Tecnico</th>
                            <th>Cliente</th>
                            <th>Regiao</th>
                            <th>Data</th>
                            <th>Itens</th>
                            <th>Total</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${solicitations.slice(0, 50).map(sol => `
                            <tr>
                                <td><strong>#${sol.numero}</strong></td>
                                <td>${Utils.escapeHtml(sol.tecnicoNome || 'Nao identificado')}</td>
                                <td>${Utils.escapeHtml(this.getSolicitationClientName(sol))}</td>
                                <td>${Utils.escapeHtml(this.getSolicitationRegion(sol))}</td>
                                <td>${Utils.formatDate(sol.data || sol.createdAt)}</td>
                                <td>${Utils.formatNumber((sol.itens || []).length)}</td>
                                <td>${Utils.formatCurrency(sol.total || 0)}</td>
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
     */    renderCustosReport() {
        const analysis = this.buildCostAnalysis();
        const latestMonth = analysis.latestMonth;
        const topClients = analysis.byClient.slice(0, 6);
        const topTechnicians = analysis.byTechnician.slice(0, 8);
        const topParts = analysis.byPiece.slice(0, 8);

        return `
            <div class="card">
                <div class="card-header">
                    <div>
                        <h4>Relatorio de Custos</h4>
                        <p class="text-muted" style="margin: 0; font-size: 0.9rem;">Calculos em memoria, sem alterar colecoes ou sincronizacao do Firebase.</p>
                    </div>
                    <button class="btn btn-outline" onclick="Relatorios.exportCustos()">
                        <i class="fas fa-file-excel"></i> Exportar Excel
                    </button>
                </div>
                <div class="card-body">
                    ${this.renderCostFilters()}
                    ${analysis.totalCalls === 0 ? this.renderEmptyState(
        'Sem custos no periodo',
        'Nao ha solicitacoes elegiveis para montar o relatorio de custos com os filtros atuais.'
    ) : `
                        <div class="kpi-grid mb-4">
                            <div class="kpi-card">
                                <div class="kpi-icon primary">
                                    <i class="fas fa-coins"></i>
                                </div>
                                <div class="kpi-content">
                                    <h4>Custo total de pecas</h4>
                                    <div class="kpi-value">${Utils.formatCurrency(analysis.totalCost)}</div>
                                    <div class="kpi-change">Base do periodo filtrado</div>
                                </div>
                            </div>
                            <div class="kpi-card">
                                <div class="kpi-icon info">
                                    <i class="fas fa-hand-holding-dollar"></i>
                                </div>
                                <div class="kpi-content">
                                    <h4>Custo medio por atendimento</h4>
                                    <div class="kpi-value">${Utils.formatCurrency(analysis.costPerAttendance)}</div>
                                    <div class="kpi-change">${Utils.formatNumber(analysis.totalCalls)} chamados no filtro</div>
                                </div>
                            </div>
                            <div class="kpi-card">
                                <div class="kpi-icon success">
                                    <i class="fas fa-boxes-stacked"></i>
                                </div>
                                <div class="kpi-content">
                                    <h4>Total de pecas usadas</h4>
                                    <div class="kpi-value">${Utils.formatNumber(analysis.totalItems)}</div>
                                    <div class="kpi-change">Quantidade consolidada</div>
                                </div>
                            </div>
                            <div class="kpi-card">
                                <div class="kpi-icon warning">
                                    <i class="fas fa-clipboard-list"></i>
                                </div>
                                <div class="kpi-content">
                                    <h4>Total de chamados</h4>
                                    <div class="kpi-value">${Utils.formatNumber(analysis.totalCalls)}</div>
                                    <div class="kpi-change">Solicitacoes com custo</div>
                                </div>
                            </div>
                            <div class="kpi-card">
                                <div class="kpi-icon info">
                                    <i class="fas fa-screwdriver-wrench"></i>
                                </div>
                                <div class="kpi-content">
                                    <h4>Pecas por atendimento</h4>
                                    <div class="kpi-value">${Utils.formatNumber(analysis.partsPerAttendance, 2)}</div>
                                    <div class="kpi-change">Media de pecas por chamado</div>
                                </div>
                            </div>
                            <div class="kpi-card">
                                <div class="kpi-icon warning">
                                    <i class="fas fa-calendar-alt"></i>
                                </div>
                                <div class="kpi-content">
                                    <h4>Custo mensal</h4>
                                    <div class="kpi-value">${Utils.formatCurrency(latestMonth?.totalCost || 0)}</div>
                                    <div class="kpi-change">${Utils.escapeHtml(latestMonth?.label || 'Sem dados mensais')}</div>
                                </div>
                            </div>
                        </div>

                        <div class="card compact-card">
                            <div class="card-header">
                                <h4>Resumo Financeiro</h4>
                            </div>
                            <div class="card-body">
                                <div class="table-container">
                                    <table class="table">
                                        <thead>
                                            <tr>
                                                <th>Indicador</th>
                                                <th>Valor</th>
                                                <th>Leitura</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <td>Custo total de pecas</td>
                                                <td>${Utils.formatCurrency(analysis.totalCost)}</td>
                                                <td>Somatorio de peca x quantidade no periodo.</td>
                                            </tr>
                                            <tr>
                                                <td>Custo medio por atendimento</td>
                                                <td>${Utils.formatCurrency(analysis.costPerAttendance)}</td>
                                                <td>Ajuda a medir eficiencia financeira por chamado.</td>
                                            </tr>
                                            <tr>
                                                <td>Total de pecas usadas</td>
                                                <td>${Utils.formatNumber(analysis.totalItems)}</td>
                                                <td>Volume total de itens aplicados na operacao.</td>
                                            </tr>
                                            <tr>
                                                <td>Total de chamados</td>
                                                <td>${Utils.formatNumber(analysis.totalCalls)}</td>
                                                <td>Base usada para todos os indicadores do periodo.</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        <div class="card mt-3">
                            <div class="card-header">
                                <h4>Custo Operacional</h4>
                            </div>
                            <div class="card-body">
                                <div class="charts-grid">
                                    <div class="chart-container">
                                        <h4 class="mb-3">Custo mensal</h4>
                                        <div class="chart-wrapper">
                                            <canvas id="costMonthlyChart"></canvas>
                                        </div>
                                    </div>

                                    <div class="chart-container">
                                        <h4 class="mb-3">Custo por tecnico</h4>
                                        <div class="chart-wrapper">
                                            <canvas id="costTechniciansChart"></canvas>
                                        </div>
                                    </div>

                                    <div class="chart-container">
                                        <h4 class="mb-3">Custo por cliente</h4>
                                        <div class="chart-wrapper">
                                            <canvas id="costClientsChart"></canvas>
                                        </div>
                                    </div>

                                    <div class="chart-container">
                                        <h4 class="mb-3">Top clientes</h4>
                                        <div class="table-container">
                                            <table class="table">
                                                <thead>
                                                    <tr>
                                                        <th>Cliente</th>
                                                        <th>Chamados</th>
                                                        <th>Custo</th>
                                                        <th>Custo por Atendimento</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    ${topClients.map(client => `
                                                        <tr>
                                                            <td><strong>${Utils.escapeHtml(client.nome)}</strong></td>
                                                            <td>${Utils.formatNumber(client.calls)}</td>
                                                            <td>${Utils.formatCurrency(client.totalCost)}</td>
                                                            <td>${Utils.formatCurrency(client.costPerCall)}</td>
                                                        </tr>
                                                    `).join('')}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="card mt-3">
                            <div class="card-header">
                                <h4>Performance Tecnica</h4>
                            </div>
                            <div class="card-body">
                                <div class="table-container">
                                    <table class="table">
                                        <thead>
                                            <tr>
                                                <th>Tecnico</th>
                                                <th>Regiao</th>
                                                <th>Chamados</th>
                                                <th>Pecas Usadas</th>
                                                <th>Pecas por Atendimento</th>
                                                <th>Custo</th>
                                                <th>Custo por Atendimento</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${topTechnicians.map(tech => `
                                                <tr>
                                                    <td><strong>${Utils.escapeHtml(tech.nome)}</strong></td>
                                                    <td>${Utils.escapeHtml(tech.regiao)}</td>
                                                    <td>${Utils.formatNumber(tech.calls)}</td>
                                                    <td>${Utils.formatNumber(tech.totalPieces)}</td>
                                                    <td>${Utils.formatNumber(tech.partsPerCall, 2)}</td>
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
                                <h4>Analise de Pecas</h4>
                            </div>
                            <div class="card-body">
                                <div class="charts-grid">
                                    <div class="chart-container">
                                        <h4 class="mb-3">Ranking de pecas por custo</h4>
                                        <div class="chart-wrapper">
                                            <canvas id="costPartsChart"></canvas>
                                        </div>
                                    </div>

                                    <div class="chart-container">
                                        <h4 class="mb-3">Pecas mais impactantes</h4>
                                        <div class="table-container">
                                            <table class="table">
                                                <thead>
                                                    <tr>
                                                        <th>Peca</th>
                                                        <th>Qtd</th>
                                                        <th>Custo Total</th>
                                                        <th>Custo Medio</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    ${topParts.map(part => `
                                                        <tr>
                                                            <td><strong>${Utils.escapeHtml(part.descricao)}</strong></td>
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
        const techData = analysis.byTechnician;

        return `
            <div class="card">
                <div class="card-header">
                    <h4>Custo por Tecnico</h4>
                    <button class="btn btn-outline" onclick="Relatorios.exportTecnicos()">
                        <i class="fas fa-file-excel"></i> Exportar Excel
                    </button>
                </div>
                <div class="card-body">
                    ${this.renderCostFilters()}
                    ${techData.length === 0 ? this.renderEmptyState(
        'Nenhum tecnico com custo',
        'Nao ha dados suficientes para montar o ranking de tecnicos com os filtros informados.'
    ) : `
                        <div class="charts-grid">
                            <div class="chart-container">
                                <h4 class="mb-3">Ranking de tecnicos</h4>
                                <div class="chart-wrapper">
                                    <canvas id="costTechniciansDetailChart"></canvas>
                                </div>
                            </div>

                            <div class="chart-container">
                                <h4 class="mb-3">Tabela detalhada</h4>
                                <div class="table-container">
                                    <table class="table">
                                        <thead>
                                            <tr>
                                                <th>Tecnico</th>
                                                <th>Regiao</th>
                                                <th>Chamados</th>
                                                <th>Pecas Usadas</th>
                                                <th>Pecas por Atendimento</th>
                                                <th>Custo Pecas</th>
                                                <th>Custo por Atendimento</th>
                                                <th>Clientes</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${techData.map(tech => `
                                                <tr>
                                                    <td><strong>${Utils.escapeHtml(tech.nome)}</strong></td>
                                                    <td>${Utils.escapeHtml(tech.regiao)}</td>
                                                    <td>${Utils.formatNumber(tech.calls)}</td>
                                                    <td>${Utils.formatNumber(tech.totalPieces)}</td>
                                                    <td>${Utils.formatNumber(tech.partsPerCall, 2)}</td>
                                                    <td>${Utils.formatCurrency(tech.totalCost)}</td>
                                                    <td>${Utils.formatCurrency(tech.costPerCall)}</td>
                                                    <td>${Utils.formatNumber(tech.clientCount)}</td>
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
        const partsData = analysis.byPiece;

        return `
            <div class="card">
                <div class="card-header">
                    <h4>Custo por Peca</h4>
                    <button class="btn btn-outline" onclick="Relatorios.exportPecas()">
                        <i class="fas fa-file-excel"></i> Exportar Excel
                    </button>
                </div>
                <div class="card-body">
                    ${this.renderCostFilters()}
                    ${partsData.length === 0 ? this.renderEmptyState(
        'Nenhuma peca no periodo',
        'Nao ha itens elegiveis para montar o ranking de pecas com os filtros atuais.'
    ) : `
                        <div class="charts-grid">
                            <div class="chart-container">
                                <h4 class="mb-3">Ranking de pecas por custo</h4>
                                <div class="chart-wrapper">
                                    <canvas id="costPartsDetailChart"></canvas>
                                </div>
                            </div>

                            <div class="chart-container">
                                <h4 class="mb-3">Detalhamento</h4>
                                <div class="table-container">
                                    <table class="table">
                                        <thead>
                                            <tr>
                                                <th>#</th>
                                                <th>Codigo</th>
                                                <th>Descricao</th>
                                                <th>Categoria</th>
                                                <th>Quantidade</th>
                                                <th>Custo Total</th>
                                                <th>Custo Medio</th>
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

        return `
            <div class="filters-bar mb-3" style="background: var(--bg-tertiary);">
                <div class="filter-group">
                    <label>De:</label>
                    <input type="date" id="report-date-from" class="form-control" value="${this.filters.dateFrom}">
                </div>
                <div class="filter-group">
                    <label>Ate:</label>
                    <input type="date" id="report-date-to" class="form-control" value="${this.filters.dateTo}">
                </div>
                <div class="filter-group">
                    <label>Status:</label>
                    ${this.renderStatusMultiSelect('report-status')}
                </div>
                <div class="filter-group">
                    <label>Regiao:</label>
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
                    <label>Tecnico:</label>
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
            </div>

        `;
    },

    afterRender() {
        this.bindFilterControls();
        setTimeout(() => this.initCharts(), 50);
    },

    bindFilterControls() {
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
            { value: 'pendente', label: 'Pendente' },
            { value: 'aprovada', label: 'Aprovada' },
            { value: 'rejeitada', label: 'Rejeitada' },
            { value: 'em-transito', label: 'Rastreio' },
            { value: 'entregue', label: 'Entregue' },
            { value: 'finalizada', label: 'Finalizada' },
            { value: 'historico-manual', label: 'Historico/Manual' }
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
        return Array.isArray(this.filters.status) && this.filters.status.includes(value);
    },

    getSelectedStatusValues(controlId = 'report-status') {
        return Array.from(document.querySelectorAll(`[data-status-group="${controlId}"]:checked`)).map(option => option.value);
    },

    getSelectedStatusSummary() {
        const selectedValues = Array.isArray(this.filters.status) ? this.filters.status : [];
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

    matchesDateRange(date) {
        if (!date || isNaN(date)) {
            return false;
        }

        let isValid = true;
        if (this.filters.dateFrom) {
            const from = Utils.parseAsLocalDate(this.filters.dateFrom);
            from.setHours(0, 0, 0, 0);
            isValid = isValid && date.getTime() >= from.getTime();
        }

        if (this.filters.dateTo) {
            const to = Utils.parseAsLocalDate(this.filters.dateTo);
            to.setHours(23, 59, 59, 999);
            isValid = isValid && date.getTime() <= to.getTime();
        }

        return isValid;
    },

    buildMonthlyAverageSummary(solicitations = []) {
        const monthlyGroups = new Map();

        solicitations.forEach(sol => {
            const date = this.getSolicitationDate(sol);
            if (!date || isNaN(date)) {
                return;
            }
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            monthlyGroups.set(key, (monthlyGroups.get(key) || 0) + 1);
        });

        const monthCount = monthlyGroups.size;
        const total = Array.from(monthlyGroups.values()).reduce((sum, count) => sum + count, 0);

        return {
            monthCount,
            averagePerMonth: monthCount > 0 ? total / monthCount : 0
        };
    },

    /**
     * Apply filters
     */
    applyFilters() {
        this.filters.dateFrom = document.getElementById('report-date-from')?.value || '';
        this.filters.dateTo = document.getElementById('report-date-to')?.value || '';
        this.filters.status = this.getSelectedStatusValues('report-status');
        this.filters.tecnico = document.getElementById('report-tecnico')?.value || '';
        this.filters.regiao = document.getElementById('report-regiao')?.value || '';
        this.filters.cliente = document.getElementById('report-cliente')?.value || '';

        const reportContent = document.getElementById('report-content');
        if (reportContent) {
            reportContent.innerHTML = this.renderReportContent();
            this.afterRender();
        }
    },

    /**
     * Clear report filters
     */
    clearFilters() {
        this.filters = {
            dateFrom: '',
            dateTo: '',
            status: [],
            tecnico: '',
            regiao: '',
            cliente: ''
        };

        const reportContent = document.getElementById('report-content');
        if (reportContent) {
            reportContent.innerHTML = this.renderReportContent();
            this.afterRender();
        }
    },
    /**
     * Get filtered solicitations for the generic report
     */
    getFilteredSolicitations() {
        const selectedStatuses = Array.isArray(this.filters.status) ? this.filters.status : [];
        let solicitations = [...DataManager.getSolicitations()];

        solicitations = solicitations.filter(s => this.matchesDateRange(this.getSolicitationDate(s)));

        if (selectedStatuses.length > 0) {
            solicitations = solicitations.filter(s => selectedStatuses.includes(s.status));
        }

        if (this.filters.tecnico) {
            solicitations = solicitations.filter(s => s.tecnicoId === this.filters.tecnico);
        }

        return solicitations.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    },

    /**
     * Get solicitations used in cost reports
     */
    getFilteredCostSolicitations() {
        const selectedStatuses = Array.isArray(this.filters.status) && this.filters.status.length > 0
            ? this.filters.status
            : this.costStatuses;

        let solicitations = DataManager.getSolicitations().filter(s => selectedStatuses.includes(s.status));
        solicitations = solicitations.filter(s => this.matchesDateRange(this.getSolicitationDate(s)));

        if (this.filters.tecnico) {
            solicitations = solicitations.filter(s => s.tecnicoId === this.filters.tecnico);
        }

        if (this.filters.regiao) {
            solicitations = solicitations.filter(s => this.getSolicitationRegion(s) === this.filters.regiao);
        }

        if (this.filters.cliente) {
            solicitations = solicitations.filter(s => this.getSolicitationClientName(s) === this.filters.cliente);
        }

        return solicitations.sort((a, b) => {
            const dateA = this.getSolicitationDate(a)?.getTime() || 0;
            const dateB = this.getSolicitationDate(b)?.getTime() || 0;
            return dateB - dateA;
        });
    },

    /**
     * Build aggregated analysis for cost reports
     */
    buildCostAnalysis() {
        const solicitations = this.getFilteredCostSolicitations();
        const partsMap = new Map(DataManager.getParts().map(part => [part.codigo, part]));
        const techniciansMap = new Map(DataManager.getTechnicians().map(tech => [tech.id, tech]));
        const byPiece = Object.create(null);
        const byTechnician = Object.create(null);
        const byClient = Object.create(null);
        const byMonth = Object.create(null);

        let totalCost = 0;
        let totalCalls = 0;
        let totalItems = 0;

        solicitations.forEach((solicitation) => {
            const technician = techniciansMap.get(solicitation.tecnicoId) || null;
            const technicianName = (solicitation.tecnicoNome || technician?.nome || 'Nao identificado').trim();
            const region = (technician?.regiao || technician?.estado || '').trim() || 'Sem regiao';
            const clientName = this.getSolicitationClientName(solicitation);
            const items = Array.isArray(solicitation.itens) ? solicitation.itens : [];
            const solicitationDate = this.getSolicitationDate(solicitation);
            const monthKey = solicitationDate ? `${solicitationDate.getFullYear()}-${String(solicitationDate.getMonth() + 1).padStart(2, '0')}` : 'sem-data';
            const monthLabel = solicitationDate ? this.formatMonthLabel(solicitationDate) : 'Sem data';
            let solicitationCost = 0;
            let solicitationPieces = 0;

            items.forEach((item) => {
                const quantity = Number(item?.quantidade) || 0;
                const unitValue = Number(item?.valorUnit) || 0;
                const totalItem = Math.round((quantity * unitValue) * 100) / 100;
                const partCatalog = partsMap.get(item?.codigo) || null;
                const pieceKey = item?.codigo || item?.descricao || 'SEM-CODIGO';

                if (!byPiece[pieceKey]) {
                    byPiece[pieceKey] = {
                        codigo: item?.codigo || '-',
                        descricao: item?.descricao || partCatalog?.descricao || 'Peca sem descricao',
                        categoria: partCatalog?.categoria || '-',
                        quantidade: 0,
                        totalCost: 0,
                        averageUnitCost: 0
                    };
                }

                byPiece[pieceKey].quantidade += quantity;
                byPiece[pieceKey].totalCost += totalItem;

                solicitationCost += totalItem;
                solicitationPieces += quantity;
                totalItems += quantity;
            });

            if (!byTechnician[technicianName]) {
                byTechnician[technicianName] = {
                    nome: technicianName,
                    regiao: region,
                    calls: 0,
                    totalPieces: 0,
                    totalCost: 0,
                    clients: new Set()
                };
            }

            if (!byClient[clientName]) {
                byClient[clientName] = {
                    nome: clientName,
                    calls: 0,
                    totalCost: 0
                };
            }

            if (!byMonth[monthKey]) {
                byMonth[monthKey] = {
                    key: monthKey,
                    label: monthLabel,
                    calls: 0,
                    totalCost: 0
                };
            }

            byTechnician[technicianName].calls += 1;
            byTechnician[technicianName].totalPieces += solicitationPieces;
            byTechnician[technicianName].totalCost += solicitationCost;
            byTechnician[technicianName].clients.add(clientName);

            byClient[clientName].calls += 1;
            byClient[clientName].totalCost += solicitationCost;

            byMonth[monthKey].calls += 1;
            byMonth[monthKey].totalCost += solicitationCost;

            totalCost += solicitationCost;
            totalCalls += 1;
        });

        const pieceRanking = Object.values(byPiece)
            .map(part => ({
                ...part,
                averageUnitCost: part.quantidade > 0 ? part.totalCost / part.quantidade : 0
            }))
            .sort((a, b) => b.totalCost - a.totalCost);

        const technicianRanking = Object.values(byTechnician)
            .map(tech => ({
                nome: tech.nome,
                regiao: tech.regiao,
                calls: tech.calls,
                totalPieces: tech.totalPieces,
                partsPerCall: tech.calls > 0 ? tech.totalPieces / tech.calls : 0,
                totalCost: tech.totalCost,
                costPerCall: tech.calls > 0 ? tech.totalCost / tech.calls : 0,
                clientCount: tech.clients.size
            }))
            .sort((a, b) => b.totalCost - a.totalCost);

        const clientRanking = Object.values(byClient)
            .map(client => ({
                nome: client.nome,
                calls: client.calls,
                totalCost: client.totalCost,
                costPerCall: client.calls > 0 ? client.totalCost / client.calls : 0
            }))
            .sort((a, b) => b.totalCost - a.totalCost);

        const monthlyCosts = Object.values(byMonth)
            .sort((a, b) => a.key.localeCompare(b.key));

        return {
            solicitations,
            totalCost,
            totalCalls,
            totalItems,
            partsPerAttendance: totalCalls > 0 ? totalItems / totalCalls : 0,
            uniqueTechCount: technicianRanking.length,
            avgCostPerTech: technicianRanking.length > 0 ? totalCost / technicianRanking.length : 0,
            costPerAttendance: totalCalls > 0 ? totalCost / totalCalls : 0,
            byPiece: pieceRanking,
            byTechnician: technicianRanking,
            byClient: clientRanking,
            byMonth: monthlyCosts,
            latestMonth: monthlyCosts[monthlyCosts.length - 1] || null
        };
    },

    /**
     * Build filter options used by cost reports
     */
    getAvailableCostFilters() {
        const relevantSolicitations = DataManager.getSolicitations().filter(s => this.isCostRelevantStatus(s.status));
        const allTechnicians = this.getSortedTechnicians();
        const relevantTechnicianIds = new Set(relevantSolicitations.map(s => s.tecnicoId).filter(Boolean));
        const technicians = allTechnicians.filter(tech => relevantTechnicianIds.size === 0 || relevantTechnicianIds.has(tech.id));
        const regionsSet = new Set();
        const clientsSet = new Set();
        let hasMissingClient = false;

        technicians.forEach((tech) => {
            const region = (tech.regiao || tech.estado || '').trim();
            if (region) {
                regionsSet.add(region);
            }
        });

        relevantSolicitations.forEach((solicitation) => {
            const client = String(solicitation?.cliente || solicitation?.clienteNome || '').trim();
            if (client) {
                clientsSet.add(client);
            } else {
                hasMissingClient = true;
            }
        });

        const clients = Array.from(clientsSet).sort((a, b) => a.localeCompare(b, 'pt-BR'));
        if (hasMissingClient) {
            clients.unshift('Nao informado');
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
            Utils.showToast('Nao ha dados para exportar', 'warning');
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
                    Tecnico: solicitation.tecnicoNome,
                    Cliente: this.getSolicitationClientName(solicitation),
                    Regiao: this.getSolicitationRegion(solicitation),
                    Data: Utils.formatDate(solicitation.data),
                    Codigo: item.codigo || '',
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
        Utils.showToast('Relatorio exportado com sucesso', 'success');
    },

    /**
     * Export costs report
     */
    exportCustos() {
        const analysis = this.buildCostAnalysis();

        if (analysis.solicitations.length === 0) {
            Utils.showToast('Nao ha dados para exportar', 'warning');
            return;
        }

        const rows = [];

        analysis.solicitations.forEach((solicitation) => {
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
                    Tecnico: solicitation.tecnicoNome || 'Nao identificado',
                    Cliente: this.getSolicitationClientName(solicitation),
                    Regiao: this.getSolicitationRegion(solicitation),
                    Codigo: item?.codigo || '',
                    Descricao: item?.descricao || '',
                    Quantidade: quantity,
                    ValorUnitario: unitValue,
                    CustoTotal: totalItem,
                    Status: Utils.getStatusInfo(solicitation.status).label
                });
            });
        });

        Utils.exportToExcel(rows, 'relatorio_custos.xlsx', 'Custos');
        Utils.showToast('Relatorio exportado com sucesso', 'success');
    },

    /**
     * Export technician costs report
     */
    exportTecnicos() {
        const analysis = this.buildCostAnalysis();

        if (analysis.byTechnician.length === 0) {
            Utils.showToast('Nao ha dados para exportar', 'warning');
            return;
        }

        const data = analysis.byTechnician.map(tech => ({
            Tecnico: tech.nome,
            Regiao: tech.regiao,
            Chamados: tech.calls,
            TotalPecas: tech.totalPieces,
            PecasPorAtendimento: tech.partsPerCall,
            CustoPecas: tech.totalCost,
            CustoPorAtendimento: tech.costPerCall,
            Clientes: tech.clientCount
        }));

        Utils.exportToExcel(data, 'relatorio_tecnicos_custos.xlsx', 'CustosTecnicos');
        Utils.showToast('Relatorio exportado com sucesso', 'success');
    },

    /**
     * Export part costs report
     */
    exportPecas() {
        const analysis = this.buildCostAnalysis();

        if (analysis.byPiece.length === 0) {
            Utils.showToast('Nao ha dados para exportar', 'warning');
            return;
        }

        const data = analysis.byPiece.map((part, index) => ({
            Posicao: index + 1,
            Codigo: part.codigo,
            Descricao: part.descricao,
            Categoria: part.categoria,
            Quantidade: part.quantidade,
            CustoTotal: part.totalCost,
            CustoMedio: part.averageUnitCost
        }));

        Utils.exportToExcel(data, 'relatorio_pecas_custos.xlsx', 'CustosPecas');
        Utils.showToast('Relatorio exportado com sucesso', 'success');
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
            'costClientsChart',
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
                        borderRadius: 4
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

        const monthlyCtx = document.getElementById('costMonthlyChart');
        if (monthlyCtx && analysis.byMonth.length > 0) {
            this.charts.costMonthlyChart = new Chart(monthlyCtx, {
                type: 'line',
                data: {
                    labels: analysis.byMonth.map(month => month.label),
                    datasets: [{
                        label: 'Custo mensal',
                        data: analysis.byMonth.map(month => month.totalCost),
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
            analysis.byPiece.slice(0, 10).map(part => part.codigo),
            analysis.byPiece.slice(0, 10).map(part => part.totalCost),
            '#00a859',
            'Custo da peca'
        );

        createHorizontalBarChart(
            'costTechniciansChart',
            analysis.byTechnician.slice(0, 10).map(tech => tech.nome),
            analysis.byTechnician.slice(0, 10).map(tech => tech.totalCost),
            '#ff8a00',
            'Custo do tecnico'
        );

        createHorizontalBarChart(
            'costClientsChart',
            analysis.byClient.slice(0, 10).map(client => client.nome),
            analysis.byClient.slice(0, 10).map(client => client.totalCost),
            '#7a5af8',
            'Custo do cliente'
        );

        createHorizontalBarChart(
            'costTechniciansDetailChart',
            analysis.byTechnician.slice(0, 12).map(tech => tech.nome),
            analysis.byTechnician.slice(0, 12).map(tech => tech.totalCost),
            '#0066b3',
            'Custo do tecnico'
        );

        createHorizontalBarChart(
            'costPartsDetailChart',
            analysis.byPiece.slice(0, 12).map(part => part.codigo),
            analysis.byPiece.slice(0, 12).map(part => part.totalCost),
            '#00a859',
            'Custo da peca'
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
        return client || 'Nao informado';
    },

    /**
     * Resolve region for a solicitation through the technician registry
     */
    getSolicitationRegion(solicitation) {
        const technician = solicitation?.tecnicoId ? DataManager.getTechnicianById(solicitation.tecnicoId) : null;
        return String(technician?.regiao || technician?.estado || '').trim() || 'Sem regiao';
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












