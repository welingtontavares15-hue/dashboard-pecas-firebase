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
                <button class="tab-btn ${this.currentReport === 'sla' ? 'active' : ''}" 
                        onclick="Relatorios.switchReport('sla')">
                    <i class="fas fa-clock"></i> Tempo de Aprovação / SLA
                </button>
                <button class="tab-btn ${this.currentReport === 'tecnicos' ? 'active' : ''}" 
                        onclick="Relatorios.switchReport('tecnicos')">
                    <i class="fas fa-users"></i> Performance por Técnico
                </button>
                <button class="tab-btn ${this.currentReport === 'pecas' ? 'active' : ''}" 
                        onclick="Relatorios.switchReport('pecas')">
                    <i class="fas fa-trophy"></i> Top Peças Solicitadas
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
        case 'sla':
            return this.renderSLAReport();
        case 'tecnicos':
            return this.renderTecnicosReport();
        case 'pecas':
            return this.renderPecasReport();
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
            ['slaDistributionChart', 'techVolumeChart', 'topPartsReportChart'].forEach(renderFallback);
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
    }
};
