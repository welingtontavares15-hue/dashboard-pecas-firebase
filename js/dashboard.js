const Dashboard = {
    // Number of pending approvals to show in the dashboard preview
    approvalsPreviewLimit: 5,
    rangeDays: null,
    MAX_NAV_RETRY: 20,
    NAV_RETRY_INTERVAL_MS: 75,
    charts: {},
    recentFilters: {
        search: '',
        status: [],
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
        const content = document.getElementById('content-area');
        const dashboardData = this.buildDashboardMetrics(DataManager.getSolicitations(), currentRange);

        content.innerHTML = `
            <div class="page-header">
                <h2><i class="fas fa-clipboard-check"></i> Painel de Solicitações</h2>
                <p class="text-muted">Acompanhe operação, custo e performance da equipe em um único painel.</p>
                <div class="kpi-controls">
                    <span class="text-muted">Período técnico:</span>
                    ${[7, 30, 90].map(days => `
                        <button class="btn btn-sm ${currentRange === days ? 'btn-primary' : 'btn-outline'}"
                                onclick="Dashboard.setRange(${days})">
                            ${days}d
                        </button>
                    `).join('')}
                </div>
            </div>

            <div class="kpi-grid dashboard-primary-grid">
                ${this.renderPrimaryKpis(dashboardData)}
            </div>

            <div class="insight-grid">
                <div class="card compact-card">
                    <div class="card-header">
                        <h4><i class="fas fa-users"></i> Ranking técnico por custo</h4>
                    </div>
                    <div class="card-body">
                        ${this.renderTopTechnicians(dashboardData.topTechniciansByCost, dashboardData.rangeLabel)}
                    </div>
                </div>
                <div class="card compact-card">
                    <div class="card-header">
                        <h4><i class="fas fa-wave-square"></i> Destaques operacionais</h4>
                    </div>
                    <div class="card-body">
                        ${this.renderOperationalHighlights(dashboardData)}
                    </div>
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

            <div class="card">
                <div class="card-header">
                    <div>
                        <h4><i class="fas fa-history"></i> Solicitações Recentes</h4>
                        <p class="text-muted" style="margin: 0; font-size: 0.85rem;">Busca rápida, filtros e ações diretas.</p>
                    </div>
                    <details class="filter-panel compact" open>
                        <summary class="filter-panel-toggle">Filtros</summary>
                        <div class="dashboard-filters filter-panel-body">
                            <div class="search-box">
                                <input type="text" id="recent-search" class="form-control" placeholder="Buscar por número, cliente ou técnico..." value="${Utils.escapeHtml(this.recentFilters.search)}">
                                <button class="btn btn-primary" onclick="Dashboard.applyRecentFilters()">
                                    <i class="fas fa-search"></i>
                                </button>
                            </div>
                            <div class="status-filter" data-status-filter="recent-status" role="group" aria-label="Filtro rápido de status">
                                <button type="button" class="status-filter-trigger" data-status-trigger="recent-status">
                                    <span class="status-filter-label">
                                        <i class="fas fa-filter"></i>
                                        <span class="status-filter-label-text">${this.getRecentSelectedStatusSummary().length > 0 ? `${this.getRecentSelectedStatusSummary().length} status selecionado(s)` : 'Todos os status'}</span>
                                    </span>
                                    <i class="fas fa-chevron-down"></i>
                                </button>
                                <div class="status-filter-dropdown" data-status-dropdown="recent-status">
                                    <div class="status-filter-summary">
                                        ${this.getRecentSelectedStatusSummary().length > 0
                                            ? this.getRecentSelectedStatusSummary().map(status => `<span class="tag-soft info"><i class="fas fa-check-square"></i>${Utils.escapeHtml(status.label)}</span>`).join('')
                                            : '<span class="status-filter-empty">Selecione um ou mais status</span>'}
                                    </div>
                                    <div class="status-filter-options">
                                        ${this.getRecentStatusOptions().map(option => `
                                            <label class="status-filter-option">
                                                <input type="checkbox" data-status-group="recent-status" value="${option.value}" ${Array.isArray(this.recentFilters.status) && this.recentFilters.status.includes(option.value) ? 'checked' : ''}>
                                                <span>${option.label}</span>
                                                ${Utils.renderStatusBadge(option.value)}
                                            </label>
                                        `).join('')}
                                    </div>
                                </div>
                            </div>
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
                    </details>
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
    renderPrimaryKpis(dashboardData) {
        const cards = [
            {
                title: 'Solicitações abertas',
                value: Utils.formatNumber(dashboardData.openCount),
                change: `${Utils.formatNumber(dashboardData.pendingCount)} pendentes de aprovação`,
                icon: 'fa-inbox',
                tone: 'warning',
                target: 'pendentes'
            },
            {
                title: 'Solicitações no mês',
                value: Utils.formatNumber(dashboardData.currentMonthRequests),
                change: `${Utils.formatNumber(dashboardData.approvedThisMonth)} aprovadas no mês`,
                icon: 'fa-calendar-days',
                tone: 'info',
                target: 'solicitacoes'
            },
            {
                title: 'Custo total do mês',
                value: Utils.formatCurrency(dashboardData.currentMonthCost),
                change: `${Utils.formatNumber(dashboardData.currentMonthCalls)} atendimentos aprovados`,
                icon: 'fa-money-bill-wave',
                tone: 'success',
                target: 'relatorios'
            },
            {
                title: 'Ticket médio',
                value: Utils.formatCurrency(dashboardData.averageTicket),
                change: 'Média por solicitação aprovada',
                icon: 'fa-receipt',
                tone: 'primary',
                target: 'relatorios'
            },
            {
                title: 'Variação vs mês anterior',
                value: `${Utils.formatNumber(dashboardData.costVariation, 1)}%`,
                change: dashboardData.costVariation >= 0 ? 'Acima do mês anterior' : 'Abaixo do mês anterior',
                icon: 'fa-chart-line',
                tone: dashboardData.costVariation >= 0 ? 'warning' : 'success',
                changeClass: dashboardData.costVariation >= 0 ? 'negative' : 'positive',
                target: 'relatorios'
            },
            {
                title: 'SLA médio',
                value: Utils.formatDuration(dashboardData.slaAverageHours),
                change: `${Utils.formatNumber(dashboardData.slaBaseCount)} solicitação(ões) analisadas`,
                icon: 'fa-stopwatch',
                tone: 'info',
                target: 'aprovacoes'
            }
        ];

        return cards.map(card => `
            <div class="kpi-card clickable" role="button" tabindex="0" onclick="Dashboard.handleCardClick('${card.target}')" onkeydown="Dashboard.handleCardKey(event, '${card.target}')" title="${card.title}">
                <div class="kpi-icon ${card.tone}">
                    <i class="fas ${card.icon}"></i>
                </div>
                <div class="kpi-content">
                    <h4>${card.title}</h4>
                    <div class="kpi-value">${card.value}</div>
                    <div class="kpi-change ${card.changeClass || ''}">${card.change}</div>
                </div>
            </div>
        `).join('');
    },

    buildDashboardMetrics(solicitations = [], rangeDays = 30) {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const rangeStart = new Date(today);
        rangeStart.setDate(rangeStart.getDate() - Math.max((rangeDays || 30) - 1, 0));
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

        const getReferenceTime = (sol) => {
            const preferred = sol.approvedAt || sol.createdAt || sol.updatedAt || sol.data;
            const date = Utils.parseAsLocalDate(preferred);
            return isNaN(date) ? null : date.getTime();
        };

        const approvedInPeriod = (start, end) => solicitations.filter(sol => {
            const reference = getReferenceTime(sol);
            return reference && reference >= start.getTime() && reference < end.getTime() && ['aprovada', 'em-transito', 'entregue', 'finalizada'].includes(sol.status);
        });

        const currentMonthApproved = approvedInPeriod(currentMonthStart, nextMonthStart);
        const previousMonthApproved = approvedInPeriod(previousMonthStart, currentMonthStart);
        const currentMonthRequests = solicitations.filter(sol => {
            const reference = Utils.parseAsLocalDate(sol.data || sol.createdAt);
            return !isNaN(reference) && reference.getTime() >= currentMonthStart.getTime() && reference.getTime() < nextMonthStart.getTime();
        });
        const rangeSolicitations = solicitations.filter(sol => {
            const reference = Utils.parseAsLocalDate(sol.data || sol.createdAt);
            return !isNaN(reference) && reference.getTime() >= rangeStart.getTime() && reference.getTime() <= now.getTime();
        });

        const rangeMonthKeys = new Set(rangeSolicitations.map(sol => {
            const reference = Utils.parseAsLocalDate(sol.data || sol.createdAt);
            return `${reference.getFullYear()}-${String(reference.getMonth() + 1).padStart(2, '0')}`;
        }));
        const monthSpan = Math.max(rangeMonthKeys.size, rangeSolicitations.length > 0 ? 1 : 0);

        const technicianMap = new Map();
        rangeSolicitations.forEach(sol => {
            const name = sol.tecnicoNome || DataManager.getTechnicianById(sol.tecnicoId)?.nome || 'Sem técnico';
            if (!technicianMap.has(name)) {
                technicianMap.set(name, { name, count: 0, total: 0 });
            }
            const entry = technicianMap.get(name);
            entry.count += 1;
            entry.total += Number(sol.total) || 0;
        });

        const technicianStats = Array.from(technicianMap.values()).map(item => ({
            ...item,
            costPerCall: item.count > 0 ? item.total / item.count : 0
        })).sort((a, b) => (b.total - a.total) || (b.count - a.count) || a.name.localeCompare(b.name));

        const topByCalls = technicianStats.slice().sort((a, b) => (b.count - a.count) || (b.total - a.total))[0] || { name: '-', count: 0, total: 0, costPerCall: 0 };
        const topByCost = technicianStats[0] || { name: '-', count: 0, total: 0, costPerCall: 0 };
        const mostEfficient = technicianStats
            .filter(item => item.count > 0)
            .sort((a, b) => (a.costPerCall - b.costPerCall) || (b.count - a.count))[0] || { name: '-', count: 0, total: 0, costPerCall: 0 };

        const currentMonthCost = currentMonthApproved.reduce((sum, sol) => sum + (Number(sol.total) || 0), 0);
        const previousMonthCost = previousMonthApproved.reduce((sum, sol) => sum + (Number(sol.total) || 0), 0);
        const averageTicket = currentMonthApproved.length > 0 ? currentMonthCost / currentMonthApproved.length : 0;
        const slaSamples = currentMonthApproved
            .map(sol => {
                const createdAt = Utils.parseAsLocalDate(sol.createdAt || sol.data);
                const completedAt = Utils.parseAsLocalDate(sol.approvedAt || sol.updatedAt || sol.data);
                if (isNaN(createdAt) || isNaN(completedAt)) {
                    return null;
                }
                return Math.max((completedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60), 0);
            })
            .filter(value => value !== null);
        const slaAverageHours = slaSamples.length > 0 ? slaSamples.reduce((sum, value) => sum + value, 0) / slaSamples.length : 0;

        return {
            openCount: solicitations.filter(sol => !['rejeitada', 'finalizada', 'historico-manual'].includes(sol.status)).length,
            pendingCount: solicitations.filter(sol => sol.status === 'pendente').length,
            currentMonthRequests: currentMonthRequests.length,
            approvedThisMonth: currentMonthApproved.length,
            rejectedCount: solicitations.filter(sol => sol.status === 'rejeitada').length,
            completedCount: solicitations.filter(sol => sol.status === 'finalizada').length,
            deliveredCount: solicitations.filter(sol => sol.status === 'entregue').length,
            currentMonthCost,
            currentMonthCalls: currentMonthApproved.length,
            previousMonthCost,
            previousMonthCalls: previousMonthApproved.length,
            costVariation: previousMonthCost > 0 ? ((currentMonthCost - previousMonthCost) / previousMonthCost) * 100 : (currentMonthCost > 0 ? 100 : 0),
            averageTicket,
            slaAverageHours,
            slaBaseCount: slaSamples.length,
            monthlyAverageRequests: monthSpan > 0 ? rangeSolicitations.length / monthSpan : 0,
            monthSpan,
            topByCalls,
            topByCost,
            mostEfficient,
            topTechniciansByCost: technicianStats.slice(0, 5),
            rangeLabel: `Últimos ${rangeDays || 30} dias`
        };
    },

    /**
     * Render approvals preview
     */    renderApprovalsPreview(pendingSolicitations = []) {
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

    renderTopTechnicians(topTechs = [], rangeLabel = 'Últimos 30 dias') {
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
                            <div class="meta">${Utils.formatNumber(t.count || 0)} chamados em ${Utils.escapeHtml(rangeLabel)}</div>
                        </div>
                        <div style="text-align: right;">
                            <div><strong>${Utils.formatCurrency(t.total || 0)}</strong></div>
                            <div class="meta">Média ${Utils.formatCurrency(t.costPerCall || 0)}</div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    },

    /**
     * Render recent solicitations table     */
    renderOperationalHighlights(dashboardData) {
        return `
            <div class="metric-list">
                <div class="metric-list-item">
                    <span class="metric-list-label">Maior volume de chamados</span>
                    <strong>${Utils.escapeHtml(dashboardData.topByCalls.name)}</strong>
                    <span class="metric-list-meta">${Utils.formatNumber(dashboardData.topByCalls.count)} chamados em ${Utils.escapeHtml(dashboardData.rangeLabel)}</span>
                </div>
                <div class="metric-list-item">
                    <span class="metric-list-label">Maior custo</span>
                    <strong>${Utils.escapeHtml(dashboardData.topByCost.name)}</strong>
                    <span class="metric-list-meta">${Utils.formatCurrency(dashboardData.topByCost.total)} no período</span>
                </div>
                <div class="metric-list-item">
                    <span class="metric-list-label">Melhor eficiência</span>
                    <strong>${Utils.escapeHtml(dashboardData.mostEfficient.name)}</strong>
                    <span class="metric-list-meta">${Utils.formatCurrency(dashboardData.mostEfficient.costPerCall)} por chamado</span>
                </div>
                <div class="metric-list-item">
                    <span class="metric-list-label">Média mensal do período</span>
                    <strong>${Utils.formatNumber(dashboardData.monthlyAverageRequests, 1)}</strong>
                    <span class="metric-list-meta">${Utils.formatNumber(dashboardData.monthSpan)} mês(es) cobertos</span>
                </div>
            </div>
        `;
    },

    renderRecentTable() {
        const solicitations = this.getFilteredRecentSolicitations();
        const slaHours = DataManager.getSettings().slaHours || 24;
        const visible = solicitations.slice(0, 8);

        if (visible.length === 0) {
            return `
                <div class="empty-state">
                    <i class="fas fa-inbox"></i>
                    <h4>Sem solicitações recentes</h4>
                    <p>${this.hasActiveRecentFilters() ? 'Revise os filtros para exibir as solicitações do período desejado.' : 'As solicitações mais recentes aparecerão aqui assim que a operação começar a registrar atendimentos.'}</p>
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
        const selectedStatuses = Array.isArray(status) ? status : (status ? [status] : []);
        let solicitations = DataManager.getSolicitations()
            .slice()
            .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

        if (search) {
            solicitations = solicitations.filter(s => 
                Utils.matchesSearch(s.numero, search) || Utils.matchesSearch(s.tecnicoNome, search) || Utils.matchesSearch(s.cliente, search)
            );
        }

        if (selectedStatuses.length > 0) {
            solicitations = solicitations.filter(s => selectedStatuses.includes(s.status));
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

        ['recent-tecnico', 'recent-date-from', 'recent-date-to'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('change', () => this.applyRecentFilters());
            }
        });

        const trigger = document.querySelector('[data-status-trigger="recent-status"]');
        if (trigger) {
            trigger.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                this.toggleRecentStatusDropdown();
            });
        }

        document.querySelectorAll('[data-status-group="recent-status"]').forEach(input => {
            input.addEventListener('change', () => this.applyRecentFilters());
            input.addEventListener('click', (event) => event.stopPropagation());
        });

        document.querySelectorAll('[data-status-dropdown="recent-status"]').forEach(panel => {
            panel.addEventListener('click', (event) => event.stopPropagation());
        });

        this.bindRecentStatusDropdownClose();

        const clearBtn = document.getElementById('recent-clear');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.clearRecentFilters();
            });
        }
    },

    applyRecentFilters() {
        this.recentFilters.search = document.getElementById('recent-search')?.value || '';
        this.recentFilters.status = Array.from(document.querySelectorAll('[data-status-group="recent-status"]:checked')).map(option => option.value);
        this.recentFilters.tecnico = document.getElementById('recent-tecnico')?.value || '';
        this.recentFilters.dateFrom = document.getElementById('recent-date-from')?.value || '';
        this.recentFilters.dateTo = document.getElementById('recent-date-to')?.value || '';
        this.refreshRecentTable();
    },

    clearRecentFilters() {
        this.recentFilters = { search: '', status: [], tecnico: '', dateFrom: '', dateTo: '' };
        if (document.getElementById('recent-search')) {
            document.getElementById('recent-search').value = '';
        }
        document.querySelectorAll('[data-status-group="recent-status"]').forEach(option => {
            option.checked = false;
        });
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

    getRecentStatusOptions() {
        return [
            { value: 'pendente', label: 'Pendente' },
            { value: 'aprovada', label: 'Aprovada' },
            { value: 'rejeitada', label: 'Rejeitada' },
            { value: 'em-transito', label: 'Rastreio' },
            { value: 'entregue', label: 'Entregue' },
            { value: 'finalizada', label: 'Finalizada' },
            { value: 'historico-manual', label: 'Histórico/Manual' }
        ];
    },

    getRecentSelectedStatusSummary() {
        const selectedValues = Array.isArray(this.recentFilters.status) ? this.recentFilters.status : [];
        return this.getRecentStatusOptions().filter(option => selectedValues.includes(option.value));
    },

    toggleRecentStatusDropdown() {
        const filter = document.querySelector('[data-status-filter="recent-status"]');
        if (!filter) {
            return;
        }

        const shouldOpen = !filter.classList.contains('open');
        this.closeRecentStatusDropdowns();
        if (shouldOpen) {
            filter.classList.add('open');
        }
    },

    closeRecentStatusDropdowns() {
        document.querySelectorAll('[data-status-filter="recent-status"].open').forEach(filter => {
            filter.classList.remove('open');
        });
    },

    bindRecentStatusDropdownClose() {
        if (this._recentStatusDropdownCloseBound) {
            return;
        }

        document.addEventListener('click', () => this.closeRecentStatusDropdowns());
        this._recentStatusDropdownCloseBound = true;
    },

    hasActiveRecentFilters() {
        return !!(
            this.recentFilters.search ||
            this.recentFilters.tecnico ||
            this.recentFilters.dateFrom ||
            this.recentFilters.dateTo ||
            (Array.isArray(this.recentFilters.status) && this.recentFilters.status.length > 0)
        );
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
                    if (typeof Solicitacoes !== 'undefined') {
                        Solicitacoes.setStatusFilter(['pendente']);
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
        if (target === 'solicitacoes') {
            App.navigate('solicitacoes');
            return;
        }
        if (target === 'solicitacoes-rejeitadas') {
            App.navigate('solicitacoes');
            let navRetry = 0;
            const applyRejectedFilterAfterNav = () => {
                if (App.currentPage === 'solicitacoes') {
                    if (typeof Solicitacoes !== 'undefined') {
                        Solicitacoes.setStatusFilter(['rejeitada']);
                    }
                } else if (navRetry < this.MAX_NAV_RETRY) {
                    navRetry += 1;
                    setTimeout(applyRejectedFilterAfterNav, this.NAV_RETRY_INTERVAL_MS);
                }
            };
            setTimeout(applyRejectedFilterAfterNav, this.NAV_RETRY_INTERVAL_MS);
            return;
        }
        if (target === 'solicitacoes-finalizadas') {
            App.navigate('solicitacoes');
            let navRetry = 0;
            const applyFinalizedFilterAfterNav = () => {
                if (App.currentPage === 'solicitacoes') {
                    if (typeof Solicitacoes !== 'undefined') {
                        Solicitacoes.setStatusFilter(['finalizada']);
                    }
                } else if (navRetry < this.MAX_NAV_RETRY) {
                    navRetry += 1;
                    setTimeout(applyFinalizedFilterAfterNav, this.NAV_RETRY_INTERVAL_MS);
                }
            };
            setTimeout(applyFinalizedFilterAfterNav, this.NAV_RETRY_INTERVAL_MS);
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















