/**
 * Dashboard Module
 * Renders KPIs and charts for gestor/administrador
 */

const Dashboard = {
    // Number of pending approvals to show in the dashboard preview
    approvalsPreviewLimit: 5,
    rangeDays: null,
    MAX_NAV_RETRY: 20,
    NAV_RETRY_INTERVAL_MS: 75,
    charts: {},
    recentFilters: {
        search: '',
        status: '',
        tecnico: '',
        dateFrom: '',
        dateTo: ''
    },
    chartWarningShown: false,

    /**
     * Render dashboard
     */
    render() {
        const pending = DataManager.getPendingSolicitations();
        const currentRange = this.getRangeDays();
        const stats = DataManager.getStatistics(currentRange, { includeHistoricalManual: true });
        const content = document.getElementById('content-area');
        const slaHours = DataManager.getSettings().slaHours || 24;
        const topTechHighlight = (stats.topTechniciansByValue || [])[0];
        
        content.innerHTML = `
            <div class="page-header">
                <h2><i class="fas fa-clipboard-check"></i> Painel de Solicitações</h2>
                <p class="text-muted">Acompanhe KPIs, pendências e aprove as últimas solicitações sem sair do painel.</p>
                <div class="kpi-controls">
                    <span class="text-muted">Período:</span>
                    ${[7, 30, 90].map(days => `
                        <button class="btn btn-sm ${currentRange === days ? 'btn-primary' : 'btn-outline'}"
                                onclick="Dashboard.setRange(${days})">
                            ${days}d
                        </button>
                    `).join('')}
                </div>
            </div>

            <div class="kpi-grid">
                <div class="kpi-card clickable" role="button" tabindex="0" onclick="Dashboard.handleCardClick('pendentes')" onkeydown="Dashboard.handleCardKey(event, 'pendentes')" title="Ver solicitações pendentes">
                    <div class="kpi-icon warning">
                        <i class="fas fa-clock"></i>
                    </div>
                    <div class="kpi-content">
                        <h4>Solicitações pendentes</h4>
                        <div class="kpi-value">${Utils.formatNumber(stats.pending || 0)}</div>
                        <div class="kpi-change ${stats.pending > 0 ? 'negative' : 'positive'}">
                            ${stats.pending > 0 ? `${stats.pending} aguardando (SLA ${slaHours}h)` : 'Nenhuma pendência'}
                        </div>
                    </div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-icon info">
                        <i class="fas fa-stopwatch"></i>
                    </div>
                    <div class="kpi-content">
                        <h4>Tempo médio de aprovação</h4>
                        <div class="kpi-value">${Utils.formatNumber(stats.avgApprovalTimeHours || 0, 1)}h</div>
                        <div class="kpi-change" title="${Utils.escapeHtml(stats.rangeLabel)}">
                            ${Utils.escapeHtml(stats.rangeLabel)}
                        </div>
                    </div>
                </div>
                <div class="kpi-card clickable" role="button" tabindex="0" onclick="Dashboard.handleCardClick('aprovacoes')" onkeydown="Dashboard.handleCardKey(event, 'aprovacoes')" title="Abrir aprovação de solicitações">
                    <div class="kpi-icon success">
                        <i class="fas fa-money-bill-wave"></i>
                    </div>
                    <div class="kpi-content">
                        <h4>Valor total em aberto</h4>
                        <div class="kpi-value">${Utils.formatCurrency(stats.totalPendingValue || 0)}</div>
                        <div class="kpi-change">
                            ${stats.pending || 0} solicitações em análise
                        </div>
                    </div>
                </div>
                <div class="kpi-card clickable" role="button" tabindex="0" onclick="Dashboard.handleCardClick('relatorios')" onkeydown="Dashboard.handleCardKey(event, 'relatorios')" title="Ver detalhes por técnico">
                    <div class="kpi-icon primary">
                        <i class="fas fa-user-tie"></i>
                    </div>
                    <div class="kpi-content">
                        <h4>Top técnico</h4>
                        <div class="kpi-value">${Utils.escapeHtml(topTechHighlight?.name || '—')}</div>
                        <div class="kpi-change">
                            ${topTechHighlight ? Utils.formatCurrency(topTechHighlight.total || 0) : 'Sem solicitações'}
                        </div>
                    </div>
                </div>
            </div>

            <div class="card compact-card">
                <div class="card-header">
                    <h4><i class="fas fa-user-tie"></i> Top 5 técnicos por valor solicitado</h4>
                </div>
                <div class="card-body">
                    ${this.renderTopTechnicians(stats.topTechniciansByValue)}
                </div>
            </div>
            
            <div class="card">
                <div class="card-header">
                    <h4><i class="fas fa-check-double"></i> Aprovações de Solicitações</h4>
                    <button class="btn btn-sm btn-outline" onclick="App.navigate('aprovacoes')">
                        Gerenciar Aprovações <i class="fas fa-arrow-right"></i>
                    </button>
                </div>
                <div class="card-body">
                    ${this.renderApprovalsPreview(pending)}
                </div>
            </div>
            
            <!-- Recent Solicitations -->
            <div class="card">
                <div class="card-header">
                    <div>
                        <h4><i class="fas fa-history"></i> Solicitações Recentes</h4>
                        <p class="text-muted" style="margin: 0; font-size: 0.85rem;">Busca rápida, filtros e ações diretas.</p>
                    </div>
                    <div class="dashboard-filters">
                        <div class="search-box">
                            <input type="text" id="recent-search" class="form-control" placeholder="Buscar por número ou técnico..." value="${Utils.escapeHtml(this.recentFilters.search)}">
                            <button class="btn btn-primary" onclick="Dashboard.applyRecentFilters()">
                                <i class="fas fa-search"></i>
                            </button>
                        </div>
                        <select id="recent-status" class="form-control">
                            <option value="">Status</option>
                            <option value="pendente" ${this.recentFilters.status === 'pendente' ? 'selected' : ''}>Pendente</option>
                            <option value="aprovada" ${this.recentFilters.status === 'aprovada' ? 'selected' : ''}>Aprovada</option>
                            <option value="rejeitada" ${this.recentFilters.status === 'rejeitada' ? 'selected' : ''}>Rejeitada</option>
                            <option value="em-transito" ${this.recentFilters.status === 'em-transito' ? 'selected' : ''}>Rastreio</option>
                            <option value="entregue" ${this.recentFilters.status === 'entregue' ? 'selected' : ''}>Entregue</option>
                            <option value="finalizada" ${this.recentFilters.status === 'finalizada' ? 'selected' : ''}>Finalizada</option>
                            <option value="historico-manual" ${this.recentFilters.status === 'historico-manual' ? 'selected' : ''}>Histórico/Manual</option>
                        </select>
                        <select id="recent-tecnico" class="form-control">
                            <option value="">Técnico</option>
                            ${DataManager.getTechnicians().map(t => `
                                <option value="${t.id}" ${this.recentFilters.tecnico === t.id ? 'selected' : ''}>${Utils.escapeHtml(t.nome)}</option>
                            `).join('')}
                        </select>
                        <input type="date" id="recent-date-from" class="form-control" value="${this.recentFilters.dateFrom}">
                        <input type="date" id="recent-date-to" class="form-control" value="${this.recentFilters.dateTo}">
                        <button class="btn btn-outline btn-sm" id="recent-clear" title="Limpar filtros">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
                <div class="card-body">
                    <div id="recent-table-container">
                        ${this.renderRecentTable()}
                    </div>
                </div>
            </div>
        `;

        this.bindRecentFilters();
    },

    /**
     * Render approvals preview
     */
    renderApprovalsPreview(pendingSolicitations = []) {
        const pending = [...pendingSolicitations]
            .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))
            .slice(0, this.approvalsPreviewLimit);
        const totalPending = pendingSolicitations.length;
        const slaHours = (DataManager.getSettings().slaHours || 24);
        const lastActivity = DataManager.getSolicitations()
            .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))[0];
        
        if (pending.length === 0) {
            return `
                <div class="empty-state compact">
                    <i class="fas fa-check-circle"></i>
                    <div>
                        <h4>Sem pendências</h4>
                        <p class="text-muted" style="margin: 0;">Tudo aprovado dentro do SLA.</p>
                    </div>
                </div>
                ${lastActivity ? `
                    <div class="last-activity">
                        <i class="fas fa-history"></i>
                        <div>
                            <div class="recent-meta">
                                <strong>#${lastActivity.numero}</strong> • ${Utils.escapeHtml(lastActivity.tecnicoNome || 'Técnico')}
                            </div>
                            <div class="recent-tags">
                                <span class="tag-soft info"><i class="fas fa-calendar"></i> ${Utils.formatDate(lastActivity.data || lastActivity.createdAt)}</span>
                                <span class="tag-soft"><i class="fas fa-box-open"></i> ${(lastActivity.itens || []).length} itens</span>
                                ${Utils.renderStatusBadge(lastActivity.status)}
                            </div>
                        </div>
                    </div>
                ` : ''}
            `;
        }
        
        return `
            <div class="table-info">
                Exibindo ${pending.length} de ${totalPending} solicitações pendentes
            </div>
            <div class="table-container">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Número</th>
                            <th>Técnico</th>
                            <th>Data</th>
                            <th>Total</th>
                            <th>Tempo aguardando</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${pending.map(sol => {
        const referenceDate = sol.createdAt || (sol.data ? Utils.parseAsLocalDate(sol.data).getTime() : null) || Date.now();
        const waitingHours = Utils.getHoursDiff(referenceDate, Date.now());
        const isOverSLA = waitingHours > slaHours;
        return `
                                <tr class="${isOverSLA ? 'sla-alert' : ''}">
                                    <td><strong>#${sol.numero}</strong></td>
                                    <td>${Utils.escapeHtml(sol.tecnicoNome)}</td>
                                    <td>${Utils.formatDate(sol.data)}</td>
                                    <td>${Utils.formatCurrency(sol.total)}</td>
                                    <td>
                                        <span class="${isOverSLA ? 'text-danger' : 'text-warning'}">
                                            ${Utils.formatDuration(waitingHours)}
                                            ${isOverSLA ? ' (SLA excedido)' : ''}
                                        </span>
                                    </td>
                                </tr>
                            `;
    }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    renderTopTechnicians(topTechs = []) {
        if (!topTechs || topTechs.length === 0) {
            return `
                <div class="empty-state compact">
                    <i class="fas fa-users"></i>
                    <div>
                        <h4>Sem dados suficientes</h4>
                        <p class="text-muted" style="margin: 0;">As solicitações aparecerão aqui assim que forem criadas.</p>
                    </div>
                </div>
            `;
        }

        return `
            <div class="top-tech-list">
                ${topTechs.map(t => `
                    <div class="top-tech-item">
                        <div>
                            <strong>${Utils.escapeHtml(t.name)}</strong>
                            <div class="meta">${Utils.formatNumber(t.count || 0)} solicitações aprovadas</div>
                        </div>
                        <div style="text-align: right;">
                            <div><strong>${Utils.formatCurrency(t.total || 0)}</strong></div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    },

    /**
     * Render recent solicitations table
     */
    renderRecentTable() {
        const solicitations = this.getFilteredRecentSolicitations();
        const slaHours = DataManager.getSettings().slaHours || 24;
        const visible = solicitations.slice(0, 8);

        if (visible.length === 0) {
            return `
                <div class="empty-state">
                    <i class="fas fa-inbox"></i>
                    <h4>Nenhuma solicitação</h4>
                    <p>${Object.values(this.recentFilters).some(Boolean) ? 'Ajuste os filtros para ver mais resultados.' : 'As solicitações recentes aparecerão aqui.'}</p>
                </div>
            `;
        }
        
        return `
            <div class="table-info">
                Exibindo ${visible.length} de ${solicitations.length} registros filtrados
            </div>
            <div class="table-container">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Solicitação</th>
                            <th>Total</th>
                            <th>Status</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${visible.map(sol => {
        const referenceDate = sol.createdAt || (sol.data ? Utils.parseAsLocalDate(sol.data).getTime() : null) || Date.now();
        const waitingHours = Utils.getHoursDiff(referenceDate, Date.now());
        const slaAlert = sol.status === 'pendente' && waitingHours > slaHours;
        const obsPreview = sol.observacoes ? Utils.escapeHtml(sol.observacoes).slice(0, 60) : '';
        return `
                                <tr class="${slaAlert ? 'sla-alert' : ''}">
                                    <td>
                                        <div class="recent-title">#${sol.numero}</div>
                                        <div class="recent-meta">
                                            <i class="fas fa-user"></i> ${Utils.escapeHtml(sol.tecnicoNome)}
                                            <span class="separator">•</span>
                                            <i class="fas fa-calendar-alt"></i> ${Utils.formatDate(sol.data || sol.createdAt)}
                                        </div>
                                        <div class="recent-tags">
                                            <span class="tag-soft"><i class="fas fa-box-open"></i> ${(sol.itens || []).length} itens</span>
                                            ${sol.status === 'pendente' ? `<span class="tag-soft warning"><i class="fas fa-clock"></i> ${Utils.formatDuration(waitingHours)}</span>` : ''}
                                            ${slaAlert ? '<span class="tag-soft danger"><i class="fas fa-bolt"></i> SLA</span>' : ''}
                                            ${obsPreview ? `<span class="tag-soft info"><i class="fas fa-tag"></i> ${obsPreview}${sol.observacoes.length > 60 ? '...' : ''}</span>` : ''}
                                        </div>
                                    </td>
                                    <td>${Utils.formatCurrency(sol.total)}</td>
                                    <td>${Utils.renderStatusBadge(sol.status)}</td>
                                    <td>
                                        <div class="actions actions-stretch">
                                            <button class="btn btn-sm btn-outline" onclick="Solicitacoes.viewDetails('${sol.id}')" title="Visualizar">
                                                <i class="fas fa-eye"></i>
                                            </button>
                                            ${sol.status === 'pendente' && Auth.hasPermission('aprovacoes', 'approve') ? `
                                                <button class="btn btn-sm btn-success" onclick="Aprovacoes.openApproveModal('${sol.id}')" title="Aprovar">
                                                    <i class="fas fa-check"></i>
                                                </button>
                                                <button class="btn btn-sm btn-danger" onclick="Aprovacoes.openRejectModal('${sol.id}')" title="Rejeitar">
                                                    <i class="fas fa-times"></i>
                                                </button>
                                            ` : ''}
                                        </div>
                                    </td>
                                </tr>
                            `;
    }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    getFilteredRecentSolicitations() {
        const normalizeDate = (value) => {
            const parsed = Utils.parseAsLocalDate(value);
            return isNaN(parsed) ? null : parsed.getTime();
        };

        const { search, status, tecnico, dateFrom, dateTo } = this.recentFilters;
        let solicitations = DataManager.getSolicitations()
            .slice()
            .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

        if (search) {
            solicitations = solicitations.filter(s => 
                Utils.matchesSearch(s.numero, search) || Utils.matchesSearch(s.tecnicoNome, search)
            );
        }

        if (status) {
            solicitations = solicitations.filter(s => s.status === status);
        }

        if (tecnico) {
            solicitations = solicitations.filter(s => s.tecnicoId === tecnico);
        }

        if (dateFrom) {
            const fromTs = normalizeDate(dateFrom);
            solicitations = solicitations.filter(s => {
                const ref = normalizeDate(s.data) || normalizeDate(s.createdAt);
                return ref ? ref >= fromTs : false;
            });
        }

        if (dateTo) {
            const toTs = normalizeDate(dateTo);
            solicitations = solicitations.filter(s => {
                const ref = normalizeDate(s.data) || normalizeDate(s.createdAt);
                return ref ? ref <= toTs + 24 * 60 * 60 * 1000 : false;
            });
        }

        return solicitations;
    },

    bindRecentFilters() {
        const searchInput = document.getElementById('recent-search');
        if (searchInput) {
            searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    this.applyRecentFilters();
                }
            });
        }

        ['recent-status', 'recent-tecnico', 'recent-date-from', 'recent-date-to'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('change', () => this.applyRecentFilters());
            }
        });

        const clearBtn = document.getElementById('recent-clear');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.clearRecentFilters();
            });
        }
    },

    applyRecentFilters() {
        this.recentFilters.search = document.getElementById('recent-search')?.value || '';
        this.recentFilters.status = document.getElementById('recent-status')?.value || '';
        this.recentFilters.tecnico = document.getElementById('recent-tecnico')?.value || '';
        this.recentFilters.dateFrom = document.getElementById('recent-date-from')?.value || '';
        this.recentFilters.dateTo = document.getElementById('recent-date-to')?.value || '';
        this.refreshRecentTable();
    },

    clearRecentFilters() {
        this.recentFilters = { search: '', status: '', tecnico: '', dateFrom: '', dateTo: '' };
        if (document.getElementById('recent-search')) {
            document.getElementById('recent-search').value = '';
        }
        if (document.getElementById('recent-status')) {
            document.getElementById('recent-status').value = '';
        }
        if (document.getElementById('recent-tecnico')) {
            document.getElementById('recent-tecnico').value = '';
        }
        if (document.getElementById('recent-date-from')) {
            document.getElementById('recent-date-from').value = '';
        }
        if (document.getElementById('recent-date-to')) {
            document.getElementById('recent-date-to').value = '';
        }
        this.refreshRecentTable();
    },

    refreshRecentTable() {
        const container = document.getElementById('recent-table-container');
        if (container) {
            container.innerHTML = this.renderRecentTable();
        }
    },

    /**
     * Initialize Chart.js charts
     */
    initCharts(stats) {
        const renderFallback = (canvasId) => {
            const canvas = document.getElementById(canvasId);
            if (canvas && canvas.parentElement) {
                canvas.parentElement.innerHTML = '<div class="chart-fallback">Gráfico indisponível (biblioteca não carregada).</div>';
            }
        };

        if (typeof Chart === 'undefined') {
            ['statusChart', 'dailyChart', 'monthlyChart', 'topPartsChart'].forEach(renderFallback);
            if (!this.chartWarningShown && typeof Utils !== 'undefined' && Utils.showToast) {
                Utils.showToast('Biblioteca de gráficos não carregada. Gráficos foram desativados.', 'warning');
                this.chartWarningShown = true;
            }
            return;
        }

        // Destroy existing charts
        Object.values(this.charts).forEach(chart => {
            if (chart) {
                chart.destroy();
            }
        });
        
        const isDark = document.body.classList.contains('dark-mode');
        const textColor = isDark ? '#e4e6eb' : '#212529';
        const gridColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
        
        // Status Pie Chart
        const statusCtx = document.getElementById('statusChart');
        if (statusCtx) {
            const statusData = stats.byStatus || {};
            const statusConfig = [
                { key: 'pendente', label: 'Pendentes', color: '#ffc107' },
                { key: 'aprovada', label: 'Aprovadas', color: '#28a745' },
                { key: 'rejeitada', label: 'Rejeitadas', color: '#dc3545' },
                { key: 'em-transito', label: 'Rastreio', color: '#0066b3' },
                { key: 'entregue', label: 'Entregues', color: '#00a859' },
                { key: 'finalizada', label: 'Finalizadas', color: '#6f42c1' }
            ];
            this.charts.status = new Chart(statusCtx, {
                type: 'doughnut',
                data: {
                    labels: statusConfig.map(s => s.label),
                    datasets: [{
                        data: statusConfig.map(s => statusData[s.key] || 0),
                        backgroundColor: statusConfig.map(s => s.color),
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'right',
                            labels: { color: textColor }
                        }
                    }
                }
            });
        }
        
        // Daily Bar Chart
        const dailyCtx = document.getElementById('dailyChart');
        if (dailyCtx) {
            this.charts.daily = new Chart(dailyCtx, {
                type: 'bar',
                data: {
                    labels: stats.last7Days.map(d => d.day),
                    datasets: [{
                        label: 'Solicitações',
                        data: stats.last7Days.map(d => d.count),
                        backgroundColor: '#0066b3',
                        borderRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: { 
                                stepSize: 1, 
                                color: textColor 
                            },
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
        
        // Monthly Line Chart
        const monthlyCtx = document.getElementById('monthlyChart');
        if (monthlyCtx) {
            this.charts.monthly = new Chart(monthlyCtx, {
                type: 'line',
                data: {
                    labels: stats.last6Months.map(m => m.month),
                    datasets: [{
                        label: 'Solicitações',
                        data: stats.last6Months.map(m => m.count),
                        borderColor: '#0066b3',
                        backgroundColor: 'rgba(0, 102, 179, 0.1)',
                        fill: true,
                        tension: 0.3
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: { 
                                stepSize: 1, 
                                color: textColor 
                            },
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
        
        // Top Parts Horizontal Bar Chart
        const topPartsCtx = document.getElementById('topPartsChart');
        if (topPartsCtx) {
            this.charts.topParts = new Chart(topPartsCtx, {
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
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        x: {
                            beginAtZero: true,
                            ticks: { 
                                stepSize: 1, 
                                color: textColor 
                            },
                            grid: { color: gridColor }
                        },
                        y: {
                            ticks: { color: textColor },
                            grid: { display: false }
                        }
                    }
                }
            });
        }
    },

    /**
     * Refresh dashboard data
     */
    refresh() {
        this.render();
    },

    setRange(days) {
        this.rangeDays = days;
        DataManager.saveSetting('statsRangeDays', days);
        this.render();
    },

    getRangeDays() {
        if (!this.rangeDays) {
            this.rangeDays = DataManager.getSettings().statsRangeDays || 30;
        }
        return this.rangeDays;
    },

    handleCardClick(target) {
        if (target === 'pendentes') {
            App.navigate('solicitacoes');
            let navRetry = 0;
            const applyFilterAfterNav = () => {
                if (App.currentPage === 'solicitacoes') {
                    const statusSelect = document.getElementById('sol-status-filter');
                    if (statusSelect) {
                        statusSelect.value = 'pendente';
                        Solicitacoes.applyFilters();
                    }
                } else if (navRetry < this.MAX_NAV_RETRY) {
                    navRetry += 1;
                    setTimeout(applyFilterAfterNav, this.NAV_RETRY_INTERVAL_MS);
                } else {
                    console.warn('Não foi possível aplicar filtro de pendentes após navegar para Solicitações.');
                }
            };
            setTimeout(applyFilterAfterNav, this.NAV_RETRY_INTERVAL_MS);
            return;
        }
        if (target === 'aprovacoes') {
            App.navigate('aprovacoes');
            return;
        }
        if (target === 'relatorios') {
            App.navigate('relatorios');
            return;
        }
        App.navigate('dashboard');
    },

    handleCardKey(event, target) {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            this.handleCardClick(target);
        }
    }
};
