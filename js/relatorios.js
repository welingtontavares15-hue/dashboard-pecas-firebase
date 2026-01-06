/**
 * Relatórios (Reports) Module
 * Operational reports without financial/stock modules
 */

const Relatorios = {
    currentReport: 'solicitacoes',
    filters: {
        dateFrom: '',
        dateTo: '',
        status: '',
        tecnico: ''
    },
    chartWarningShown: false,

    /**
     * Render reports page
     */
    render() {
        const content = document.getElementById('content-area');
        
        content.innerHTML = `
            <div class="page-header">
                <h2><i class="fas fa-file-alt"></i> Relatórios</h2>
            </div>
            
            <!-- Report Tabs -->
            <div class="tabs">
                <button class="tab-btn ${this.currentReport === 'solicitacoes' ? 'active' : ''}" 
                        onclick="Relatorios.switchReport('solicitacoes')">
                    <i class="fas fa-clipboard-list"></i> Solicitações
                </button>
                <button class="tab-btn ${this.currentReport === 'pecas' ? 'active' : ''}" 
                        onclick="Relatorios.switchReport('pecas')">
                    <i class="fas fa-trophy"></i> Top Peças Solicitadas
                </button>
                <button class="tab-btn ${this.currentReport === 'custos' ? 'active' : ''}" 
                        onclick="Relatorios.switchReport('custos')">
                    <i class="fas fa-coins"></i> Custos
                </button>
            </div>
            
            <!-- Report Content -->
            <div id="report-content">
                ${this.renderReportContent()}
            </div>
        `;
    },

    /**
     * Switch report type
     */
    switchReport(report) {
        this.currentReport = report;
        this.render();
        setTimeout(() => this.initCharts(), 50);
    },

    /**
     * Render report content based on current selection
     */
    renderReportContent() {
        switch (this.currentReport) {
        case 'solicitacoes':
            return this.renderSolicitacoesReport();
        case 'pecas':
            return this.renderPecasReport();
        case 'custos':
            return this.renderCustosReport();
        default:
            return '<p>Selecione um relatório.</p>';
        }
    },

    /**
     * Render Solicitations Report
     */
    renderSolicitacoesReport() {
        const technicians = DataManager.getTechnicians();
        
        return `
            <div class="card">
                <div class="card-header">
                    <h4>Relatório de Solicitações</h4>
                    <button class="btn btn-outline" onclick="Relatorios.exportSolicitacoes()">
                        <i class="fas fa-file-excel"></i> Exportar Excel
                    </button>
                </div>
                <div class="card-body">
                    <!-- Filters -->
                    <div class="filters-bar mb-3" style="background: var(--bg-tertiary);">
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
                            <select id="report-status" class="form-control">
                                <option value="">Todos</option>
                                <option value="pendente">Pendente</option>
                                <option value="aprovada">Aprovada</option>
                                <option value="rejeitada">Rejeitada</option>
                                <option value="em-transito">Rastreio</option>
                                <option value="entregue">Entregue</option>
                                <option value="historico-manual">Histórico/Manual</option>
                            </select>
                        </div>
                        <div class="filter-group">
                            <label>Técnico:</label>
                            <select id="report-tecnico" class="form-control">
                                <option value="">Todos</option>
                                ${technicians.map(t => 
        `<option value="${t.id}">${Utils.escapeHtml(t.nome)}</option>`
    ).join('')}
                            </select>
                        </div>
                        <button class="btn btn-primary" onclick="Relatorios.applyFilters()">
                            <i class="fas fa-filter"></i> Filtrar
                        </button>
                    </div>
                    
                    <!-- Results -->
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
        let solicitations = DataManager.getSolicitations();
        
        // Apply filters
        if (this.filters.dateFrom) {
            const from = Utils.parseAsLocalDate(this.filters.dateFrom);
            solicitations = solicitations.filter(s => Utils.parseAsLocalDate(s.data) >= from);
        }
        if (this.filters.dateTo) {
            const to = Utils.parseAsLocalDate(this.filters.dateTo);
            to.setHours(23, 59, 59, 999);
            solicitations = solicitations.filter(s => Utils.parseAsLocalDate(s.data) <= to);
        }
        if (this.filters.status) {
            solicitations = solicitations.filter(s => s.status === this.filters.status);
        }
        if (this.filters.tecnico) {
            solicitations = solicitations.filter(s => s.tecnicoId === this.filters.tecnico);
        }
        
        // Sort by date
        solicitations.sort((a, b) => b.createdAt - a.createdAt);
        
        if (solicitations.length === 0) {
            return '<p class="text-muted text-center">Nenhuma solicitação encontrada com os filtros selecionados.</p>';
        }
        
        // Summary
        const total = solicitations.length;
        const totalValue = solicitations.reduce((sum, s) => sum + s.total, 0);
        const byStatus = {};
        solicitations.forEach(s => {
            byStatus[s.status] = (byStatus[s.status] || 0) + 1;
        });
        
        return `
            <div class="kpi-grid mb-3" style="grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));">
                <div class="kpi-card">
                    <div class="kpi-content">
                        <h4>Total</h4>
                        <div class="kpi-value">${total}</div>
                    </div>
                </div>
                ${Object.entries(byStatus).map(([status, count]) => `
                    <div class="kpi-card">
                        <div class="kpi-content">
                            <h4>${Utils.getStatusInfo(status).label}</h4>
                            <div class="kpi-value">${count}</div>
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
                                <td>${Utils.escapeHtml(sol.tecnicoNome)}</td>
                                <td>${Utils.formatDate(sol.data)}</td>
                                <td>${(sol.itens || []).length}</td>
                                <td>${Utils.formatCurrency(sol.total)}</td>
                                <td>${Utils.renderStatusBadge(sol.status)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                    <tfoot>
                        <tr style="background: var(--bg-tertiary); font-weight: bold;">
                            <td colspan="4">Total Geral</td>
                            <td>${Utils.formatCurrency(totalValue)}</td>
                            <td></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
            ${solicitations.length > 50 ? '<p class="text-muted text-center mt-2">Mostrando 50 de ' + solicitations.length + ' registros. Exporte para ver todos.</p>' : ''}
        `;
    },

    /**
     * Compute aggregated cost statistics across all solicitations.
     * Returns an object containing total cost, average cost per order,
     * cost grouped by technician, cost grouped by part, monthly cost
     * breakdown and top rankings. It excludes rejected solicitations
     * from the calculation to focus on pedidos aprovados ou em andamento.
     */
    computeCostStatistics() {
        const solicitations = DataManager.getSolicitations();
        const stats = {
            totalCost: 0,
            orderCount: 0,
            costByTechnician: {},
            costByPart: {},
            monthlyCosts: {}
        };
        solicitations.forEach(s => {
            // Skip rejected solicitations
            if (s.status === 'rejeitada') {
                return;
            }
            stats.orderCount++;
            const items = s.itens || [];
            // Determine reference date (prefer explicit 'data', fallback to 'createdAt')
            const dateRef = s.data || s.createdAt;
            let monthKey = null;
            if (dateRef) {
                const dateObj = Utils.parseAsLocalDate(dateRef);
                if (dateObj && !isNaN(dateObj.getTime())) {
                    const year = dateObj.getFullYear();
                    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
                    monthKey = `${year}-${month}`;
                }
            }
            items.forEach(item => {
                const qty = Number(item.quantidade) || 0;
                const unitVal = Number(item.valorUnit) || 0;
                const cost = qty * unitVal;
                stats.totalCost += cost;
                // group by technician
                const techName = s.tecnicoNome || 'Não identificado';
                if (!stats.costByTechnician[techName]) {
                    stats.costByTechnician[techName] = 0;
                }
                stats.costByTechnician[techName] += cost;
                // group by part
                const code = item.codigo || '';
                if (!stats.costByPart[code]) {
                    stats.costByPart[code] = { descricao: item.descricao || '', quantidade: 0, cost: 0 };
                }
                stats.costByPart[code].quantidade += qty;
                stats.costByPart[code].cost += cost;
                // monthly
                if (monthKey) {
                    if (!stats.monthlyCosts[monthKey]) {
                        stats.monthlyCosts[monthKey] = 0;
                    }
                    stats.monthlyCosts[monthKey] += cost;
                }
            });
        });
        stats.avgCost = stats.orderCount > 0 ? stats.totalCost / stats.orderCount : 0;
        // Cost by category: use parts catalog to map codes to categories
        const partsCatalog = DataManager.getParts ? DataManager.getParts() : [];
        const categoryMap = {};
        partsCatalog.forEach((p) => {
            categoryMap[p.codigo] = p.categoria || 'Outro';
        });
        stats.costByCategory = {};
        Object.entries(stats.costByPart).forEach(([codigo, info]) => {
            const categoria = categoryMap[codigo] || 'Outro';
            if (!stats.costByCategory[categoria]) {
                stats.costByCategory[categoria] = 0;
            }
            stats.costByCategory[categoria] += info.cost;
        });
        const categoryArray = Object.entries(stats.costByCategory)
            .map(([categoria, total]) => ({ categoria, total }))
            .sort((a, b) => b.total - a.total);
        stats.topCategories = categoryArray.slice(0, 10);
        // convert to sorted arrays
        const techArray = Object.entries(stats.costByTechnician)
            .map(([name, total]) => ({ name, total }))
            .sort((a, b) => b.total - a.total);
        stats.topCostByTech = techArray.slice(0, 10);
        const partArray = Object.entries(stats.costByPart)
            .map(([codigo, info]) => ({ codigo, descricao: info.descricao, quantidade: info.quantidade, cost: info.cost }))
            .sort((a, b) => b.cost - a.cost);
        stats.topPartsByCost = partArray.slice(0, 10);
        // sort by quantity for top quantity
        const qtyArray = [...partArray].sort((a, b) => b.quantidade - a.quantidade);
        stats.topPartsByQuantity = qtyArray.slice(0, 10);
        const monthlyKeys = Object.keys(stats.monthlyCosts).sort();
        stats.monthlyData = monthlyKeys.map(key => ({ month: key, cost: stats.monthlyCosts[key] }));
        return stats;
    },

    /**
     * Compute statistics for manual costs dataset
     */
    computeManualCostStatistics() {
        const costs = DataManager.getCosts ? DataManager.getCosts() : [];
        const stats = {
            total: 0,
            count: Array.isArray(costs) ? costs.length : 0,
            monthlyTotals: {},
            categoryTotals: {}
        };

        const now = new Date();
        const last12Months = [];
        for (let i = 11; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            last12Months.push(key);
            stats.monthlyTotals[key] = 0;
        }

        if (Array.isArray(costs)) {
            for (const cost of costs) {
                const value = Number(cost?.valor) || 0;
                if (value < 0) {
                    continue;
                }
                stats.total += value;

                const dateObj = Utils.parseAsLocalDate(cost?.data || cost?.createdAt);
                if (!isNaN(dateObj.getTime())) {
                    const key = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
                    if (stats.monthlyTotals[key] !== undefined) {
                        stats.monthlyTotals[key] += value;
                    }
                }

                const categoria = (cost?.categoria || 'Outros').trim() || 'Outros';
                stats.categoryTotals[categoria] = (stats.categoryTotals[categoria] || 0) + value;
            }
        }

        stats.monthlyData = last12Months.map((key) => ({ month: key, total: stats.monthlyTotals[key] || 0 }));
        const monthsDivisor = stats.monthlyData.length || 1;
        stats.monthlyAverage = stats.total / monthsDivisor;

        const topCategories = Object.entries(stats.categoryTotals)
            .map(([categoria, total]) => ({ categoria, total }))
            .sort((a, b) => b.total - a.total);
        stats.topCategories = topCategories.slice(0, 10);
        stats.topCategory = stats.topCategories[0]?.categoria || '-';

        return stats;
    },

    /**
     * Render SLA Report
     */
    renderSLAReport() {
        const stats = DataManager.getStatistics(null, { includeHistoricalManual: true });
        const settings = DataManager.getSettings();
        const slaHours = settings.slaHours || 24;
        
        // Get approval times
        const solicitations = DataManager.getSolicitations();
        const approved = solicitations.filter(s => s.approvedAt && s.createdAt);
        
        // Calculate SLA compliance
        const withinSLA = approved.filter(s => {
            const hours = (s.approvedAt - s.createdAt) / (1000 * 60 * 60);
            return hours <= slaHours;
        });
        
        const slaCompliance = approved.length > 0 
            ? (withinSLA.length / approved.length * 100).toFixed(1) 
            : 0;
        
        // Distribution by time ranges
        const ranges = [
            { label: '< 4h', min: 0, max: 4, count: 0 },
            { label: '4-8h', min: 4, max: 8, count: 0 },
            { label: '8-24h', min: 8, max: 24, count: 0 },
            { label: '24-48h', min: 24, max: 48, count: 0 },
            { label: '> 48h', min: 48, max: Infinity, count: 0 }
        ];
        
        approved.forEach(s => {
            const hours = (s.approvedAt - s.createdAt) / (1000 * 60 * 60);
            const range = ranges.find(r => hours >= r.min && hours < r.max);
            if (range) {
                range.count++;
            }
        });
        
        return `
            <div class="card">
                <div class="card-header">
                    <h4>Tempo de Aprovação / SLA</h4>
                    <button class="btn btn-outline" onclick="Relatorios.exportSLA()">
                        <i class="fas fa-file-excel"></i> Exportar Excel
                    </button>
                </div>
                <div class="card-body">
                    <!-- KPIs -->
                    <div class="kpi-grid mb-4">
                        <div class="kpi-card">
                            <div class="kpi-icon info">
                                <i class="fas fa-clock"></i>
                            </div>
                            <div class="kpi-content">
                                <h4>SLA Configurado</h4>
                                <div class="kpi-value">${slaHours}h</div>
                            </div>
                        </div>
                        <div class="kpi-card">
                            <div class="kpi-icon ${stats.avgApprovalTimeHours <= slaHours ? 'success' : 'danger'}">
                                <i class="fas fa-hourglass-half"></i>
                            </div>
                            <div class="kpi-content">
                                <h4>Tempo Médio</h4>
                                <div class="kpi-value">${Utils.formatDuration(stats.avgApprovalTimeHours)}</div>
                            </div>
                        </div>
                        <div class="kpi-card">
                            <div class="kpi-icon ${slaCompliance >= 80 ? 'success' : slaCompliance >= 50 ? 'warning' : 'danger'}">
                                <i class="fas fa-percentage"></i>
                            </div>
                            <div class="kpi-content">
                                <h4>Taxa de Conformidade</h4>
                                <div class="kpi-value">${slaCompliance}%</div>
                                <div class="kpi-change">${withinSLA.length} de ${approved.length} dentro do SLA</div>
                            </div>
                        </div>
                        <div class="kpi-card">
                            <div class="kpi-icon warning">
                                <i class="fas fa-exclamation-triangle"></i>
                            </div>
                            <div class="kpi-content">
                                <h4>Pendentes Agora</h4>
                                <div class="kpi-value">${stats.pending}</div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Distribution Chart -->
                    <div class="charts-grid">
                        <div class="chart-container">
                            <h4 class="mb-3">Distribuição por Tempo de Aprovação</h4>
                            <div class="chart-wrapper">
                                <canvas id="slaDistributionChart"></canvas>
                            </div>
                        </div>
                        
                        <div class="chart-container">
                            <h4 class="mb-3">Detalhamento</h4>
                            <div class="table-container">
                                <table class="table">
                                    <thead>
                                        <tr>
                                            <th>Faixa de Tempo</th>
                                            <th>Quantidade</th>
                                            <th>Percentual</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${ranges.map(r => `
                                            <tr>
                                                <td>${r.label}</td>
                                                <td>${r.count}</td>
                                                <td>${approved.length > 0 ? (r.count / approved.length * 100).toFixed(1) : 0}%</td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Render Technicians Performance Report
     */
    renderTecnicosReport() {
        const stats = DataManager.getStatistics(null, { includeHistoricalManual: true });
        const byTechnician = stats.byTechnician;
        
        // Convert to array and sort
        const techData = Object.entries(byTechnician)
            .map(([nome, data]) => ({ nome, ...data }))
            .sort((a, b) => b.total - a.total);
        
        return `
            <div class="card">
                <div class="card-header">
                    <h4>Performance por Técnico</h4>
                    <button class="btn btn-outline" onclick="Relatorios.exportTecnicos()">
                        <i class="fas fa-file-excel"></i> Exportar Excel
                    </button>
                </div>
                <div class="card-body">
                    ${techData.length === 0 ? '<p class="text-muted text-center">Nenhum dado disponível.</p>' : `
                        <div class="charts-grid">
                            <div class="chart-container">
                                <h4 class="mb-3">Volume por Técnico</h4>
                                <div class="chart-wrapper">
                                    <canvas id="techVolumeChart"></canvas>
                                </div>
                            </div>
                            
                            <div class="chart-container">
                                <h4 class="mb-3">Tabela Detalhada</h4>
                                <div class="table-container">
                                    <table class="table">
                                        <thead>
                                            <tr>
                                                <th>Técnico</th>
                                                <th>Total</th>
                                                <th>Aprovadas</th>
                                                <th>Rejeitadas</th>
                                                <th>Pendentes</th>
                                                <th>Taxa Aprovação</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${techData.map(t => {
        const rate = t.total > 0 ? (t.approved / t.total * 100).toFixed(1) : 0;
        return `
                                                    <tr>
                                                        <td><strong>${Utils.escapeHtml(t.nome)}</strong></td>
                                                        <td>${t.total}</td>
                                                        <td class="text-success">${t.approved}</td>
                                                        <td class="text-danger">${t.rejected}</td>
                                                        <td class="text-warning">${t.pending}</td>
                                                        <td>${rate}%</td>
                                                    </tr>
                                                `;
    }).join('')}
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
     * Render Top Parts Report
     */
    renderPecasReport() {
        const stats = DataManager.getStatistics(null, { includeHistoricalManual: true });
        const topParts = stats.topParts;
        
        // Get full part info
        const parts = DataManager.getParts();
        const enrichedParts = topParts.map(tp => {
            const part = parts.find(p => p.codigo === tp.codigo);
            return {
                ...tp,
                descricao: part?.descricao || 'Descrição não encontrada',
                categoria: part?.categoria || '-',
                valor: part?.valor || 0
            };
        });
        
        return `
            <div class="card">
                <div class="card-header">
                    <h4>Top Peças Mais Solicitadas</h4>
                    <button class="btn btn-outline" onclick="Relatorios.exportPecas()">
                        <i class="fas fa-file-excel"></i> Exportar Excel
                    </button>
                </div>
                <div class="card-body">
                    ${topParts.length === 0 ? '<p class="text-muted text-center">Nenhum dado disponível.</p>' : `
                        <div class="charts-grid">
                            <div class="chart-container">
                                <h4 class="mb-3">Ranking de Peças</h4>
                                <div class="chart-wrapper">
                                    <canvas id="topPartsReportChart"></canvas>
                                </div>
                            </div>
                            
                            <div class="chart-container">
                                <h4 class="mb-3">Detalhamento</h4>
                                <div class="table-container">
                                    <table class="table">
                                        <thead>
                                            <tr>
                                                <th>#</th>
                                                <th>Código</th>
                                                <th>Descrição</th>
                                                <th>Categoria</th>
                                                <th>Quantidade</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${enrichedParts.map((p, idx) => `
                                                <tr>
                                                    <td><strong>${idx + 1}</strong></td>
                                                    <td><strong>${Utils.escapeHtml(p.codigo)}</strong></td>
                                                    <td>${Utils.escapeHtml(p.descricao)}</td>
                                                    <td>${Utils.escapeHtml(p.categoria)}</td>
                                                    <td>${p.total}</td>
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
     * Render Cost Report
     */
    renderCustosReport() {
        const costStats = this.computeCostStatistics();
        const manualStats = this.computeManualCostStatistics();
        const hasManualData = (Array.isArray(manualStats.monthlyData) && manualStats.monthlyData.some((m) => m.total > 0)) || manualStats.total > 0;
        // Build table rows for top parts by cost
        const topPartRows = costStats.topPartsByCost.map((p, idx) => {
            const partNum = idx + 1;
            return `
                    <tr>
                        <td><strong>${partNum}</strong></td>
                        <td><strong>${Utils.escapeHtml(p.codigo)}</strong></td>
                        <td>${Utils.escapeHtml(p.descricao || '')}</td>
                        <td>${p.quantidade}</td>
                        <td>${Utils.formatCurrency(p.cost)}</td>
                    </tr>
                `;
        }).join('');
        return `
            <div class="card">
                <div class="card-header">
                    <h4>Relatório de Custos</h4>
                    <div class="card-actions">
                        <button class="btn btn-outline" onclick="Relatorios.exportCustos()">
                            <i class="fas fa-file-excel"></i> Exportar Excel
                        </button>
                        <button class="btn btn-outline" onclick="Relatorios.exportCustosPPT()">
                            <i class="fas fa-file-powerpoint"></i> Exportar PPT
                        </button>
                    </div>
                </div>
                <div class="card-body">
                    <section class="mb-4">
                        <h4 class="mb-3">Custos Manuais</h4>
                        <div class="kpi-grid mb-3" style="grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));">
                            <div class="kpi-card">
                                <div class="kpi-icon primary">
                                    <i class="fas fa-wallet"></i>
                                </div>
                                <div class="kpi-content">
                                    <h4>Total Custos</h4>
                                    <div class="kpi-value">${Utils.formatCurrency(manualStats.total)}</div>
                                </div>
                            </div>
                            <div class="kpi-card">
                                <div class="kpi-icon info">
                                    <i class="fas fa-calendar"></i>
                                </div>
                                <div class="kpi-content">
                                    <h4>Média Mensal</h4>
                                    <div class="kpi-value">${Utils.formatCurrency(manualStats.monthlyAverage)}</div>
                                </div>
                            </div>
                            <div class="kpi-card">
                                <div class="kpi-icon warning">
                                    <i class="fas fa-list"></i>
                                </div>
                                <div class="kpi-content">
                                    <h4>Top Categoria</h4>
                                    <div class="kpi-value">${Utils.escapeHtml(manualStats.topCategory)}</div>
                                </div>
                            </div>
                            <div class="kpi-card">
                                <div class="kpi-icon success">
                                    <i class="fas fa-receipt"></i>
                                </div>
                                <div class="kpi-content">
                                    <h4>Registros</h4>
                                    <div class="kpi-value">${manualStats.count}</div>
                                </div>
                            </div>
                        </div>
                        ${hasManualData ? `
                            <div class="charts-grid">
                                <div class="chart-container">
                                    <h4 class="mb-3">Custo Mensal (Últimos 12 meses)</h4>
                                    <div class="chart-wrapper">
                                        <canvas id="manualCostTrendChart"></canvas>
                                    </div>
                                </div>
                                <div class="chart-container">
                                    <h4 class="mb-3">Custos por Categoria (Top 10)</h4>
                                    <div class="chart-wrapper">
                                        <canvas id="manualCostCategoryChart"></canvas>
                                    </div>
                                </div>
                            </div>
                        ` : `
                            <div class="empty-state">
                                <i class="fas fa-info-circle"></i>
                                <h4>Sem custos manuais registrados</h4>
                                <p>Cadastre custos na aba Custos para visualizar gráficos.</p>
                            </div>
                        `}
                    </section>

                    <hr style="margin: 2rem 0;">

                    <section>
                        <h4 class="mb-3">Custos por Solicitações</h4>
                        <div class="kpi-grid mb-4" style="grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));">
                            <div class="kpi-card">
                                <div class="kpi-icon primary">
                                    <i class="fas fa-money-bill-wave"></i>
                                </div>
                                <div class="kpi-content">
                                    <h4>Montante Total</h4>
                                    <div class="kpi-value">${Utils.formatCurrency(costStats.totalCost)}</div>
                                </div>
                            </div>
                            <div class="kpi-card">
                                <div class="kpi-icon info">
                                    <i class="fas fa-receipt"></i>
                                </div>
                                <div class="kpi-content">
                                    <h4>Custo Médio por Pedido</h4>
                                    <div class="kpi-value">${Utils.formatCurrency(costStats.avgCost)}</div>
                                </div>
                            </div>
                            <div class="kpi-card">
                                <div class="kpi-icon warning">
                                    <i class="fas fa-box-open"></i>
                                </div>
                                <div class="kpi-content">
                                    <h4>Pedidos Analisados</h4>
                                    <div class="kpi-value">${costStats.orderCount}</div>
                                </div>
                            </div>
                        </div>
                        <div class="charts-grid">
                            <div class="chart-container">
                                <h4 class="mb-3">Custo por Técnico (Top 10)</h4>
                                <div class="chart-wrapper">
                                    <canvas id="costByTechChart"></canvas>
                                </div>
                            </div>
                            <div class="chart-container">
                                <h4 class="mb-3">Tendência de Custos Mensais</h4>
                                <div class="chart-wrapper">
                                    <canvas id="monthlyCostTrendChart"></canvas>
                                </div>
                            </div>
                            <div class="chart-container">
                                <h4 class="mb-3">Top 10 Peças por Custo</h4>
                                <div class="chart-wrapper">
                                    <canvas id="topPartsCostChart"></canvas>
                                </div>
                            </div>
                            <div class="chart-container">
                                <h4 class="mb-3">Top 10 Peças por Quantidade</h4>
                                <div class="chart-wrapper">
                                    <canvas id="topPartsQtyChart"></canvas>
                                </div>
                            </div>
                            <div class="chart-container">
                                <h4 class="mb-3">Custo por Categoria</h4>
                                <div class="chart-wrapper">
                                    <canvas id="costByCategoryChart"></canvas>
                                </div>
                            </div>
                        </div>
                        <h4 class="mt-4 mb-2">Peças com Maior Custo (Top 10)</h4>
                        <div class="table-container">
                            <table class="table">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Código</th>
                                        <th>Descrição</th>
                                        <th>Quantidade</th>
                                        <th>Custo Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${topPartRows}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </div>
            </div>
        `;
    },

    /**
     * Apply filters
     */
    applyFilters() {
        this.filters.dateFrom = document.getElementById('report-date-from')?.value || '';
        this.filters.dateTo = document.getElementById('report-date-to')?.value || '';
        this.filters.status = document.getElementById('report-status')?.value || '';
        this.filters.tecnico = document.getElementById('report-tecnico')?.value || '';
        
        const resultsContainer = document.getElementById('solicitacoes-report-results');
        if (resultsContainer) {
            resultsContainer.innerHTML = this.generateSolicitacoesTable();
        }
    },

    /**
     * Export solicitations report
     */
    exportSolicitacoes() {
        let solicitations = DataManager.getSolicitations();
        
        // Apply same filters
        if (this.filters.dateFrom) {
            const from = Utils.parseAsLocalDate(this.filters.dateFrom);
            solicitations = solicitations.filter(s => Utils.parseAsLocalDate(s.data) >= from);
        }
        if (this.filters.dateTo) {
            const to = Utils.parseAsLocalDate(this.filters.dateTo);
            to.setHours(23, 59, 59, 999);
            solicitations = solicitations.filter(s => Utils.parseAsLocalDate(s.data) <= to);
        }
        if (this.filters.status) {
            solicitations = solicitations.filter(s => s.status === this.filters.status);
        }
        if (this.filters.tecnico) {
            solicitations = solicitations.filter(s => s.tecnicoId === this.filters.tecnico);
        }
        
        const data = [];
        const placeholderItem = {
            codigo: '',
            descricao: 'Sem itens',
            quantidade: 0,
            valorUnit: 0
        };
        solicitations.forEach(s => {
            const subtotal = Number(s.subtotal) || 0;
            const desconto = Number(s.desconto) || 0;
            const frete = Number(s.frete) || 0;
            const totalPedido = Number(s.total) || 0;
            const itens = (s.itens?.length > 0) ? s.itens : [placeholderItem];
            
            itens.forEach(item => {
                const quantidade = Number(item.quantidade) || 0;
                const valorUnitario = Number(item.valorUnit) || 0;
                const totalItem = Math.round((quantidade * valorUnitario) * 100) / 100;
                
                data.push({
                    Numero: s.numero,
                    Tecnico: s.tecnicoNome,
                    Data: Utils.formatDate(s.data),
                    Codigo: item.codigo || '',
                    Descricao: item.descricao || '',
                    Quantidade: quantidade,
                    'Valor Unitário': valorUnitario,
                    'Valor Total': totalItem,
                    Subtotal: subtotal,
                    Desconto: desconto,
                    Frete: frete,
                    'Total do Pedido': totalPedido,
                    Status: Utils.getStatusInfo(s.status).label,
                    AprovadoPor: s.approvedBy || '',
                    DataAprovacao: s.approvedAt ? Utils.formatDate(s.approvedAt, true) : ''
                });
            });
        });
        
        Utils.exportToExcel(data, 'relatorio_solicitacoes.xlsx', 'Solicitações');
        Utils.showToast('Relatório exportado com sucesso', 'success');
    },

    /**
     * Export SLA report
     */
    exportSLA() {
        const solicitations = DataManager.getSolicitations();
        const approved = solicitations.filter(s => s.approvedAt && s.createdAt);
        
        const data = approved.map(s => {
            const hours = (s.approvedAt - s.createdAt) / (1000 * 60 * 60);
            return {
                Numero: s.numero,
                Tecnico: s.tecnicoNome,
                DataCriacao: Utils.formatDate(s.createdAt, true),
                DataAprovacao: Utils.formatDate(s.approvedAt, true),
                TempoHoras: hours.toFixed(2),
                DentroSLA: hours <= (DataManager.getSettings().slaHours || 24) ? 'Sim' : 'Não'
            };
        });
        
        Utils.exportToExcel(data, 'relatorio_sla.xlsx', 'SLA');
        Utils.showToast('Relatório exportado com sucesso', 'success');
    },

    /**
     * Export technicians report
     */
    exportTecnicos() {
        const stats = DataManager.getStatistics(null, { includeHistoricalManual: true });
        
        const data = Object.entries(stats.byTechnician).map(([nome, t]) => ({
            Tecnico: nome,
            TotalSolicitacoes: t.total,
            Aprovadas: t.approved,
            Rejeitadas: t.rejected,
            Pendentes: t.pending,
            TaxaAprovacao: t.total > 0 ? (t.approved / t.total * 100).toFixed(1) + '%' : '0%'
        }));
        
        Utils.exportToExcel(data, 'relatorio_tecnicos.xlsx', 'Técnicos');
        Utils.showToast('Relatório exportado com sucesso', 'success');
    },

    /**
     * Export parts report
     */
    exportPecas() {
        const stats = DataManager.getStatistics();
        const parts = DataManager.getParts();
        
        const data = stats.topParts.map((tp, idx) => {
            const part = parts.find(p => p.codigo === tp.codigo);
            return {
                Posicao: idx + 1,
                Codigo: tp.codigo,
                Descricao: part?.descricao || '',
                Categoria: part?.categoria || '',
                QuantidadeSolicitada: tp.total
            };
        });
        
        Utils.exportToExcel(data, 'relatorio_pecas.xlsx', 'Top Peças');
        Utils.showToast('Relatório exportado com sucesso', 'success');
    },

    /**
     * Export cost report to Excel
     */
    exportCustos() {
        // Generate a flat list of items with cost per piece per request
        const solicitations = DataManager.getSolicitations();
        const data = [];
        solicitations.forEach(s => {
            if (s.status === 'rejeitada') {
                return;
            }
            const items = s.itens && s.itens.length > 0 ? s.itens : [{ codigo: '', descricao: '', quantidade: 0, valorUnit: 0 }];
            items.forEach(item => {
                const qty = Number(item.quantidade) || 0;
                const unit = Number(item.valorUnit) || 0;
                const totalItem = qty * unit;
                data.push({
                    Numero: s.numero,
                    Tecnico: s.tecnicoNome || '',
                    Data: Utils.formatDate(s.data || s.createdAt),
                    Codigo: item.codigo || '',
                    Descricao: item.descricao || '',
                    Quantidade: qty,
                    'Valor Unitário': unit,
                    'Valor Total': totalItem
                });
            });
        });
        Utils.exportToExcel(data, 'relatorio_custos.xlsx', 'Custos');
        Utils.showToast('Relatório exportado com sucesso', 'success');
    },

    /**
     * Export cost report to PowerPoint
     */
    async exportCustosPPT() {
        try {
            const pptxFactory = window.pptxgen;
            if (typeof pptxFactory === 'undefined') {
                Utils.showToast('Biblioteca PPTXGenJS não carregada.', 'danger');
                return;
            }
            const costStats = this.computeCostStatistics();
            const technicians = DataManager.getTechnicians ? DataManager.getTechnicians() : [];
            const pptx = new pptxFactory();
            pptx.defineLayout({ name: '16x9', width: 10, height: 5.625 });
            pptx.layout = '16x9';
            // Load logo
            const logoUrl = 'icons/diversey-logo.png';
            let logoData = null;
            try {
                const resp = await fetch(logoUrl);
                const blob = await resp.blob();
                const reader = new FileReader();
                const dataUrlPromise = new Promise((resolve, reject) => {
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = reject;
                });
                reader.readAsDataURL(blob);
                logoData = await dataUrlPromise;
            } catch (_err) {
                // If logo fails to load, ignore and continue
                logoData = null;
            }
            const today = new Date();
            const dateStr = today.toLocaleDateString('pt-BR');
            const currencyFmt = (val) => {
                return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });
            };
            // Slide 1 – Capa
            let slide = pptx.addSlide();
            slide.background = { color: 'F5F5F5' };
            if (logoData) {
                slide.addImage({ data: logoData, x: 0.3, y: 0.3, w: 1.3, h: 0.6 });
            }
            slide.addText('Business Review – Solicitações de Peças', { x: 1.7, y: 1.1, w: 7.5, h: 0.8, color: '003366', fontSize: 24, bold: true });
            slide.addText('Análise de Custos e Eficiência Operacional', { x: 1.7, y: 2.0, w: 7.5, h: 0.6, color: '006699', fontSize: 16, italic: true });
            slide.addText([
                { text: 'Autor: ', options: { bold: true } },
                { text: 'Welington Bastos Tavares' }
            ], { x: 1.7, y: 3.0, w: 7.5, h: 0.4, fontSize: 12, color: '333333' });
            slide.addText([
                { text: 'Data: ', options: { bold: true } },
                { text: dateStr }
            ], { x: 1.7, y: 3.35, w: 7.5, h: 0.4, fontSize: 12, color: '333333' });
            // Slide 2 – Objetivo
            slide = pptx.addSlide();
            slide.background = { color: 'FFFFFF' };
            slide.addText('Objetivo', { x: 0.5, y: 0.5, w: 9, h: 0.5, fontSize: 20, bold: true, color: '003366' });
            slide.addText([
                { text: '• Apresentar os principais indicadores de custos relacionados às solicitações de peças\n', options: { fontSize: 14, color: '333333' } },
                { text: '• Identificar oportunidades de redução de gastos e melhoria na eficiência técnica\n', options: { fontSize: 14, color: '333333' } },
                { text: '• Propor ações para otimização de compras e controle por técnico', options: { fontSize: 14, color: '333333' } }
            ], { x: 0.7, y: 1.2, w: 8.5, h: 2.0, margin: 0 });
            // Slide 3 – Equipe de Atendimento
            slide = pptx.addSlide();
            slide.background = { color: 'FFFFFF' };
            slide.addText('Equipe de Atendimento', { x: 0.5, y: 0.5, w: 9, h: 0.5, fontSize: 20, bold: true, color: '003366' });
            // Build list of technicians
            const techLines = technicians.map((t) => {
                const name = t.nome || t.name || '';
                return `• ${name}`;
            });
            if (techLines.length > 0) {
                slide.addText(techLines.join('\n'), { x: 0.7, y: 1.1, w: 8.5, h: 3.0, fontSize: 14, color: '333333', valign: 'top' });
            } else {
                slide.addText('Nenhum técnico encontrado.', { x: 0.7, y: 1.1, w: 8.5, h: 1.0, fontSize: 14, color: '333333' });
            }
            // Slide 4 – Visão Geral dos Indicadores
            slide = pptx.addSlide();
            slide.background = { color: 'FFFFFF' };
            slide.addText('Visão Geral dos Indicadores', { x: 0.5, y: 0.5, w: 9, h: 0.5, fontSize: 20, bold: true, color: '003366' });
            const overviewItems = [
                { text: 'Montante total de custos: ', bold: true, value: currencyFmt(costStats.totalCost) },
                { text: 'Custo médio por pedido: ', bold: true, value: currencyFmt(costStats.avgCost) },
                { text: 'Total de pedidos analisados: ', bold: true, value: String(costStats.orderCount) }
            ];
            let yOff = 1.2;
            overviewItems.forEach(item => {
                slide.addText([
                    { text: item.text, options: { fontSize: 14, color: '333333', bold: item.bold } },
                    { text: item.value, options: { fontSize: 14, color: '003366' } }
                ], { x: 0.7, y: yOff, w: 8.5, h: 0.4 });
                yOff += 0.45;
            });
            // Slide 5 – Custos por Técnico
            slide = pptx.addSlide();
            slide.background = { color: 'FFFFFF' };
            slide.addText('Custos por Técnico', { x: 0.5, y: 0.5, w: 9, h: 0.5, fontSize: 20, bold: true, color: '003366' });
            const techLabels = costStats.topCostByTech.map(t => t.name);
            const techVals = costStats.topCostByTech.map(t => Number(t.total.toFixed(2)));
            if (techLabels.length > 0) {
                slide.addChart(pptx.ChartType.bar, [
                    {
                        name: 'Custo Total',
                        labels: techLabels,
                        values: techVals
                    }
                ], { x: 0.7, y: 1.3, w: 8.5, h: 3.0, barDir: 'bar', showLabel: true, showLegend: false });
            } else {
                slide.addText('Sem dados disponíveis', { x: 0.7, y: 2.5, w: 8.5, h: 1.0, fontSize: 14, color: '333333' });
            }
            slide.addText('Técnicos com maior impacto financeiro. Avaliar controle de gastos e eficiência.', { x: 0.7, y: 4.5, w: 8.5, h: 0.8, fontSize: 12, color: '666666', wrap: true });
            // Slide 6 – Tendência de Custos Mensais
            slide = pptx.addSlide();
            slide.background = { color: 'FFFFFF' };
            slide.addText('Tendência de Custos Mensais', { x: 0.5, y: 0.5, w: 9, h: 0.5, fontSize: 20, bold: true, color: '003366' });
            const monthLabels = costStats.monthlyData.map(d => d.month);
            const monthVals = costStats.monthlyData.map(d => Number(d.cost.toFixed(2)));
            if (monthLabels.length > 0) {
                slide.addChart(pptx.ChartType.line, [
                    {
                        name: 'Custo Total',
                        labels: monthLabels,
                        values: monthVals
                    }
                ], { x: 0.7, y: 1.3, w: 8.5, h: 3.0, showLegend: false, lineDataSymbol: 'circle' });
            } else {
                slide.addText('Sem dados disponíveis', { x: 0.7, y: 2.5, w: 8.5, h: 1.0, fontSize: 14, color: '333333' });
            }
            slide.addText('Evolução dos custos ao longo do tempo. Observar picos, quedas e sazonalidade.', { x: 0.7, y: 4.5, w: 8.5, h: 0.8, fontSize: 12, color: '666666', wrap: true });
            // Slide 7 – Custo por Peça
            slide = pptx.addSlide();
            slide.background = { color: 'FFFFFF' };
            slide.addText('Custo por Peça', { x: 0.5, y: 0.5, w: 9, h: 0.5, fontSize: 20, bold: true, color: '003366' });
            const partLabels = costStats.topPartsByCost.map(p => p.codigo);
            const partVals = costStats.topPartsByCost.map(p => Number(p.cost.toFixed(2)));
            if (partLabels.length > 0) {
                slide.addChart(pptx.ChartType.bar, [
                    {
                        name: 'Custo Total',
                        labels: partLabels,
                        values: partVals
                    }
                ], { x: 0.7, y: 1.3, w: 4.5, h: 2.5, barDir: 'bar', showLegend: false });
                // Table for top parts by cost
                const tblBody = [
                    [
                        { text: '#', options: { bold: true } },
                        { text: 'Código', options: { bold: true } },
                        { text: 'Descrição', options: { bold: true } },
                        { text: 'Qtd', options: { bold: true } },
                        { text: 'Custo', options: { bold: true } }
                    ],
                    ...costStats.topPartsByCost.map((p, idx) => ([
                        String(idx + 1),
                        p.codigo,
                        p.descricao || '',
                        String(p.quantidade),
                        currencyFmt(p.cost)
                    ]))
                ];
                slide.addTable(tblBody, { x: 5.4, y: 1.3, w: 4.0, h: 2.5, border: { pt: 0.5, color: 'CCCCCC' }, fontSize: 8 });
            } else {
                slide.addText('Sem dados disponíveis', { x: 0.7, y: 2.5, w: 8.5, h: 1.0, fontSize: 14, color: '333333' });
            }
            slide.addText('Peças com maior custo. Avaliar oportunidades de negociação e substituição.', { x: 0.7, y: 4.5, w: 8.5, h: 0.8, fontSize: 12, color: '666666', wrap: true });
            // Slide 8 – Custo por Categoria
            slide = pptx.addSlide();
            slide.background = { color: 'FFFFFF' };
            slide.addText('Custo por Categoria', { x: 0.5, y: 0.5, w: 9, h: 0.5, fontSize: 20, bold: true, color: '003366' });
            const catLabels = costStats.topCategories.map(c => c.categoria);
            const catVals = costStats.topCategories.map(c => Number(c.total.toFixed(2)));
            if (catLabels.length > 0) {
                slide.addChart(pptx.ChartType.bar, [
                    {
                        name: 'Custo Total',
                        labels: catLabels,
                        values: catVals
                    }
                ], { x: 1.0, y: 1.5, w: 8.0, h: 2.5, barDir: 'bar', showLegend: false });
            } else {
                slide.addText('Sem dados disponíveis', { x: 0.7, y: 2.5, w: 8.5, h: 1.0, fontSize: 14, color: '333333' });
            }
            slide.addText('Categorias com maior concentração de gastos. Avaliar políticas de compras e estoque.', { x: 0.7, y: 4.5, w: 8.5, h: 0.8, fontSize: 12, color: '666666', wrap: true });
            // Slide 9 – Peças por Quantidade
            slide = pptx.addSlide();
            slide.background = { color: 'FFFFFF' };
            slide.addText('Peças por Quantidade', { x: 0.5, y: 0.5, w: 9, h: 0.5, fontSize: 20, bold: true, color: '003366' });
            const qtyLabels = costStats.topPartsByQuantity.map(p => p.codigo);
            const qtyVals = costStats.topPartsByQuantity.map(p => Number(p.quantidade));
            if (qtyLabels.length > 0) {
                slide.addChart(pptx.ChartType.bar, [
                    {
                        name: 'Quantidade',
                        labels: qtyLabels,
                        values: qtyVals
                    }
                ], { x: 1.0, y: 1.5, w: 8.0, h: 2.5, barDir: 'bar', showLegend: false });
            } else {
                slide.addText('Sem dados disponíveis', { x: 0.7, y: 2.5, w: 8.5, h: 1.0, fontSize: 14, color: '333333' });
            }
            slide.addText('Itens mais solicitados em volume. Comparar volume e custo para otimizar estoque.', { x: 0.7, y: 4.5, w: 8.5, h: 0.8, fontSize: 12, color: '666666', wrap: true });
            // Slide 10 – Conclusões e Recomendações
            slide = pptx.addSlide();
            slide.background = { color: 'FFFFFF' };
            slide.addText('Conclusões e Recomendações', { x: 0.5, y: 0.5, w: 9, h: 0.5, fontSize: 20, bold: true, color: '003366' });
            slide.addText([
                { text: '• Principais achados: ', options: { fontSize: 14, bold: true, color: '333333' } },
                { text: 'Acompanhamento de custos revela técnicos e peças com maior impacto; custos variam mensalmente.\n', options: { fontSize: 14, color: '333333' } },
                { text: '• Propostas de melhoria:\n', options: { fontSize: 14, bold: true, color: '333333' } },
                { text: '  - Otimização de fornecedores\n', options: { fontSize: 14, color: '333333' } },
                { text: '  - Controle de custos por técnico\n', options: { fontSize: 14, color: '333333' } },
                { text: '  - Revisão de categorias de peças\n', options: { fontSize: 14, color: '333333' } }
            ], { x: 0.7, y: 1.2, w: 8.5, h: 3.0, wrap: true });
            // Slide 11 – Encerramento
            slide = pptx.addSlide();
            slide.background = { color: 'FFFFFF' };
            slide.addText('Encerramento', { x: 0.5, y: 0.5, w: 9, h: 0.5, fontSize: 20, bold: true, color: '003366' });
            const baseUrl = (typeof window !== 'undefined' && window.location && window.location.origin) ? window.location.origin : '';
            slide.addText([
                { text: 'Obrigado!', options: { fontSize: 16, bold: true, color: '003366' } },
                { text: '\nPara mais informações, entre em contato com o responsável.', options: { fontSize: 14, color: '333333' } },
                { text: '\nAcesse o dashboard online: ', options: { fontSize: 14, color: '333333' } },
                { text: baseUrl, options: { fontSize: 14, color: '0066CC', underline: true, hyperlink: { url: baseUrl } } }
            ], { x: 0.7, y: 1.2, w: 8.5, h: 2.5, wrap: true });
            await pptx.writeFile({ fileName: 'relatorio_custos.pptx' });
            Utils.showToast('Apresentação exportada com sucesso', 'success');
        } catch (err) {
            console.error(err);
            Utils.showToast('Erro ao exportar a apresentação', 'danger');
        }
    },

    /**
     * Initialize charts after page render
     */
    initCharts() {
        const renderFallback = (canvasId) => {
            const canvas = document.getElementById(canvasId);
            if (canvas && canvas.parentElement) {
                canvas.parentElement.innerHTML = '<div class="chart-fallback">Gráfico indisponível (biblioteca não carregada).</div>';
            }
        };

        if (typeof Chart === 'undefined') {
            ['slaDistributionChart', 'techVolumeChart', 'topPartsReportChart', 'manualCostTrendChart', 'manualCostCategoryChart'].forEach(renderFallback);
            if (!this.chartWarningShown && typeof Utils !== 'undefined' && Utils.showToast) {
                Utils.showToast('Biblioteca de gráficos não carregada. Exibindo dados sem gráficos.', 'warning');
                this.chartWarningShown = true;
            }
            return;
        }

        const isDark = document.body.classList.contains('dark-mode');
        const textColor = isDark ? '#e4e6eb' : '#212529';
        const gridColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
        
        // SLA Distribution Chart
        const slaCtx = document.getElementById('slaDistributionChart');
        if (slaCtx) {
            const solicitations = DataManager.getSolicitations();
            const approved = solicitations.filter(s => s.approvedAt && s.createdAt);
            
            const ranges = [
                { label: '< 4h', min: 0, max: 4, count: 0 },
                { label: '4-8h', min: 4, max: 8, count: 0 },
                { label: '8-24h', min: 8, max: 24, count: 0 },
                { label: '24-48h', min: 24, max: 48, count: 0 },
                { label: '> 48h', min: 48, max: Infinity, count: 0 }
            ];
            
            approved.forEach(s => {
                const hours = (s.approvedAt - s.createdAt) / (1000 * 60 * 60);
                const range = ranges.find(r => hours >= r.min && hours < r.max);
                if (range) {
                    range.count++;
                }
            });
            
            new Chart(slaCtx, {
                type: 'bar',
                data: {
                    labels: ranges.map(r => r.label),
                    datasets: [{
                        label: 'Solicitações',
                        data: ranges.map(r => r.count),
                        backgroundColor: ['#28a745', '#28a745', '#ffc107', '#ff6b00', '#dc3545'],
                        borderRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: { beginAtZero: true, ticks: { color: textColor }, grid: { color: gridColor } },
                        x: { ticks: { color: textColor }, grid: { display: false } }
                    }
                }
            });
        }
        
        // Tech Volume Chart
        const techCtx = document.getElementById('techVolumeChart');
        if (techCtx) {
            const stats = DataManager.getStatistics(null, { includeHistoricalManual: true });
            const techData = Object.entries(stats.byTechnician)
                .map(([nome, data]) => ({ nome, total: data.total }))
                .sort((a, b) => b.total - a.total)
                .slice(0, 10);
            
            new Chart(techCtx, {
                type: 'bar',
                data: {
                    labels: techData.map(t => t.nome),
                    datasets: [{
                        label: 'Solicitações',
                        data: techData.map(t => t.total),
                        backgroundColor: '#0066b3',
                        borderRadius: 4
                    }]
                },
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        x: { beginAtZero: true, ticks: { color: textColor }, grid: { color: gridColor } },
                        y: { ticks: { color: textColor }, grid: { display: false } }
                    }
                }
            });
        }
        
        // Top Parts Chart
        const partsCtx = document.getElementById('topPartsReportChart');
        if (partsCtx) {
            const stats = DataManager.getStatistics(null, { includeHistoricalManual: true });
            
            new Chart(partsCtx, {
                type: 'bar',
                data: {
                    labels: stats.topParts.slice(0, 10).map(p => p.codigo),
                    datasets: [{
                        label: 'Quantidade',
                        data: stats.topParts.slice(0, 10).map(p => p.total),
                        backgroundColor: '#00a859',
                        borderRadius: 4
                    }]
                },
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        x: { beginAtZero: true, ticks: { color: textColor }, grid: { color: gridColor } },
                        y: { ticks: { color: textColor }, grid: { display: false } }
                    }
                }
            });
        }

        // Cost Reports Charts
        // Only render if cost report elements exist
        const costTechCtx = document.getElementById('costByTechChart');
        const monthlyCostCtx = document.getElementById('monthlyCostTrendChart');
        const topPartsCostCtx = document.getElementById('topPartsCostChart');
        const topPartsQtyCtx = document.getElementById('topPartsQtyChart');
        const manualTrendCtx = document.getElementById('manualCostTrendChart');
        const manualCategoryCtx = document.getElementById('manualCostCategoryChart');

        if (manualTrendCtx || manualCategoryCtx) {
            const manualStats = this.computeManualCostStatistics();
            const manualLabels = manualStats.monthlyData.map((d) => d.month);
            const manualValues = manualStats.monthlyData.map((d) => d.total);
            if (manualTrendCtx) {
                new Chart(manualTrendCtx, {
                    type: 'line',
                    data: {
                        labels: manualLabels,
                        datasets: [{
                            label: 'Custos',
                            data: manualValues,
                            fill: false,
                            borderColor: '#1cc88a',
                            tension: 0.2
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: {
                            x: { ticks: { color: textColor }, grid: { display: false } },
                            y: { beginAtZero: true, ticks: { color: textColor }, grid: { color: gridColor } }
                        }
                    }
                });
            }

            if (manualCategoryCtx) {
                const catLabels = manualStats.topCategories.map((c) => c.categoria);
                const catValues = manualStats.topCategories.map((c) => c.total);
                new Chart(manualCategoryCtx, {
                    type: 'bar',
                    data: {
                        labels: catLabels,
                        datasets: [{
                            label: 'Custos',
                            data: catValues,
                            backgroundColor: '#4e73df',
                            borderRadius: 4
                        }]
                    },
                    options: {
                        indexAxis: 'y',
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: {
                            x: { beginAtZero: true, ticks: { color: textColor }, grid: { color: gridColor } },
                            y: { ticks: { color: textColor }, grid: { display: false } }
                        }
                    }
                });
            }
        }
        if (costTechCtx || monthlyCostCtx || topPartsCostCtx || topPartsQtyCtx) {
            const costStats = this.computeCostStatistics();
            const techLabels = costStats.topCostByTech.map(t => t.name);
            const techDataVals = costStats.topCostByTech.map(t => t.total);
            const monthLabels = costStats.monthlyData.map(d => d.month);
            const monthDataVals = costStats.monthlyData.map(d => d.cost);
            const partsCostLabels = costStats.topPartsByCost.map(p => p.codigo);
            const partsCostVals = costStats.topPartsByCost.map(p => p.cost);
            const partsQtyLabels = costStats.topPartsByQuantity.map(p => p.codigo);
            const partsQtyVals = costStats.topPartsByQuantity.map(p => p.quantidade);
            if (costTechCtx) {
                new Chart(costTechCtx, {
                    type: 'bar',
                    data: {
                        labels: techLabels,
                        datasets: [{
                            label: 'Custo Total',
                            data: techDataVals,
                            backgroundColor: '#4e73df',
                            borderRadius: 4
                        }]
                    },
                    options: {
                        indexAxis: 'y',
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: {
                            x: { beginAtZero: true, ticks: { color: textColor }, grid: { color: gridColor } },
                            y: { ticks: { color: textColor }, grid: { display: false } }
                        }
                    }
                });
            }
            if (monthlyCostCtx) {
                new Chart(monthlyCostCtx, {
                    type: 'line',
                    data: {
                        labels: monthLabels,
                        datasets: [{
                            label: 'Custo Total',
                            data: monthDataVals,
                            fill: false,
                            borderColor: '#20c997',
                            tension: 0.1
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: {
                            x: { ticks: { color: textColor }, grid: { display: false } },
                            y: { beginAtZero: true, ticks: { color: textColor }, grid: { color: gridColor } }
                        }
                    }
                });
            }
            if (topPartsCostCtx) {
                new Chart(topPartsCostCtx, {
                    type: 'bar',
                    data: {
                        labels: partsCostLabels,
                        datasets: [{
                            label: 'Custo Total',
                            data: partsCostVals,
                            backgroundColor: '#e74a3b',
                            borderRadius: 4
                        }]
                    },
                    options: {
                        indexAxis: 'y',
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: {
                            x: { beginAtZero: true, ticks: { color: textColor }, grid: { color: gridColor } },
                            y: { ticks: { color: textColor }, grid: { display: false } }
                        }
                    }
                });
            }
            if (topPartsQtyCtx) {
                new Chart(topPartsQtyCtx, {
                    type: 'bar',
                    data: {
                        labels: partsQtyLabels,
                        datasets: [{
                            label: 'Quantidade',
                            data: partsQtyVals,
                            backgroundColor: '#f6c23e',
                            borderRadius: 4
                        }]
                    },
                    options: {
                        indexAxis: 'y',
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: {
                            x: { beginAtZero: true, ticks: { color: textColor }, grid: { color: gridColor } },
                            y: { ticks: { color: textColor }, grid: { display: false } }
                        }
                    }
                });
            }
            // Render cost by category chart if available
            const costCategoryCtx = document.getElementById('costByCategoryChart');
            if (costCategoryCtx) {
                const catLabels = costStats.topCategories.map(c => c.categoria);
                const catDataVals = costStats.topCategories.map(c => c.total);
                new Chart(costCategoryCtx, {
                    type: 'bar',
                    data: {
                        labels: catLabels,
                        datasets: [{
                            label: 'Custo Total',
                            data: catDataVals,
                            backgroundColor: '#36b9cc',
                            borderRadius: 4
                        }]
                    },
                    options: {
                        indexAxis: 'y',
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: {
                            x: { beginAtZero: true, ticks: { color: textColor }, grid: { color: gridColor } },
                            y: { ticks: { color: textColor }, grid: { display: false } }
                        }
                    }
                });
            }
        }
    }
};
