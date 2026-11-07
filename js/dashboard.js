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
        fornecedor: '',
        dateFrom: '',
        dateTo: '',
        rangeDays: null,
        useDefaultPeriod: true
    },
    chartWarningShown: false,
    _filtersInitialized: false,
    _activeDashboardData: null,

    getDefaultFilters() {
        // Normaliza sempre um período baseado no range padrão para evitar datas fixas persistidas
        const defaultRange = AnalyticsHelper.getDefaultRangeDays();
        const period = AnalyticsHelper.normalizePeriod({ rangeDays: defaultRange });
        return {
            search: '',
            status: [],
            tecnico: '',
            fornecedor: '',
            dateFrom: period.dateFrom,
            dateTo: period.dateTo,
            rangeDays: period.rangeDays || defaultRange,
            useDefaultPeriod: true
        };
    },

    ensureFilters() {
        if (this._filtersInitialized) {
            return;
        }

        const defaults = this.getDefaultFilters();
        const restored = AnalyticsHelper.restoreModuleFilterState('dashboard', {
            defaults,
            useDefaultPeriod: true
        });
        this.recentFilters = {
            ...defaults,
            ...restored,
            status: Array.isArray(restored?.statuses) ? restored.statuses.slice() : [],
            useDefaultPeriod: restored?.useDefaultPeriod !== false
        };
        this.rangeDays = Number(this.recentFilters.rangeDays || defaults.rangeDays) || defaults.rangeDays;
        this._filtersInitialized = true;
    },

    buildFilterState() {
        this.ensureFilters();
        const useDefaultPeriod = this.recentFilters.useDefaultPeriod !== false;
        return AnalyticsHelper.buildFilterState({
            search: this.recentFilters.search,
            statuses: this.recentFilters.status,
            tecnico: this.recentFilters.tecnico,
            fornecedor: this.recentFilters.fornecedor,
            dateFrom: this.recentFilters.dateFrom,
            dateTo: this.recentFilters.dateTo,
            rangeDays: useDefaultPeriod ? (this.recentFilters.rangeDays || this.rangeDays) : '',
            useDefaultPeriod
        }, {
            moduleKey: 'dashboard',
            defaults: this.getDefaultFilters(),
            useDefaultPeriod
        });
    },

    persistFilters() {
        const useDefaultPeriod = this.recentFilters.useDefaultPeriod !== false;
        const persisted = AnalyticsHelper.persistModuleFilterState('dashboard', {
            search: this.recentFilters.search,
            statuses: this.recentFilters.status,
            tecnico: this.recentFilters.tecnico,
            fornecedor: this.recentFilters.fornecedor,
            dateFrom: this.recentFilters.dateFrom,
            dateTo: this.recentFilters.dateTo,
            rangeDays: useDefaultPeriod ? (this.recentFilters.rangeDays || this.rangeDays) : '',
            useDefaultPeriod
        }, {
            defaults: this.getDefaultFilters(),
            useDefaultPeriod
        });
        this.recentFilters = {
            ...this.recentFilters,
            status: Array.isArray(persisted?.statuses) ? persisted.statuses.slice() : [],
            fornecedor: persisted?.fornecedor || '',
            dateFrom: persisted?.dateFrom || '',
            dateTo: persisted?.dateTo || '',
            rangeDays: persisted?.rangeDays || '',
            useDefaultPeriod: persisted?.useDefaultPeriod !== false
        };
        if (this.recentFilters.useDefaultPeriod !== false) {
            this.rangeDays = Number(this.recentFilters.rangeDays || this.rangeDays) || this.rangeDays;
        }
        return persisted;
    },

    canAccessDashboardRecord(solicitation) {
        const role = Auth.getRole();
        if (role === 'administrador' || role === 'gestor') {
            return true;
        }
        if (role === 'tecnico') {
            return solicitation?.tecnicoId === Auth.getTecnicoId();
        }
        if (role === 'fornecedor' && typeof FornecedorPortal !== 'undefined'
            && typeof FornecedorPortal.belongsToCurrentSupplier === 'function'
            && typeof FornecedorPortal.getSupplierScope === 'function') {
            const normalizedStatus = AnalyticsHelper.normalizeStatus(solicitation?.status);
            return ['aprovada', 'em-transito'].includes(normalizedStatus)
                && FornecedorPortal.belongsToCurrentSupplier(solicitation, FornecedorPortal.getSupplierScope());
        }
        return true;
    },

    getDashboardData() {
        const filterState = this.buildFilterState();
        const accessible = DataManager.getSolicitations().filter((solicitation) => this.canAccessDashboardRecord(solicitation));
        const dataset = AnalyticsHelper.buildDataset(accessible, filterState, {
            moduleKey: 'dashboard',
            useDefaultPeriod: filterState.useDefaultPeriod,
            cacheKey: `dashboard:${Auth.getRole() || 'anon'}`
        });
        const analysis = AnalyticsHelper.computeMetrics(dataset, {
            moduleKey: 'dashboard',
            allRecords: accessible
        });
        const summaryLabel = `Indicadores calculados sobre ${Utils.formatNumber(dataset.totalCount)} solicitações filtradas.`;

        return {
            ...analysis,
            dataset,
            filterState,
            summaryLabel
        };
    },

    /**
     * Render dashboard
     */
    render() {
        this.ensureFilters();
        const pending = DataManager.getPendingSolicitations();
        const currentRange = this.getRangeDays();
        const content = document.getElementById('content-area');
        const solicitations = DataManager.getSolicitations();
        const dashboardData = this.getDashboardData();
        this._activeDashboardData = dashboardData;
        const recentStatusSummary = this.getRecentSelectedStatusSummary();
        const hasRecentFilters = this.hasActiveRecentFilters();

        if (!Array.isArray(solicitations) || solicitations.length === 0 || dashboardData.totalRequests === 0) {
            content.innerHTML = `
                <div class="page-header">
                    <h2><i class="fas fa-clipboard-check"></i> Painel de Custos de Peças</h2>
                    <p class="text-muted">Acompanhe custos, volume e desempenho financeiro das solicitações.</p>
                </div>
                <div class="empty-state">
                    <i class="fas fa-inbox"></i>
                    <h4>Sem solicitações no conjunto atual</h4>
                    <p>${this.hasActiveRecentFilters() ? 'Revise os filtros do painel para exibir indicadores e solicitações.' : 'O painel executivo será exibido assim que houver solicitações visíveis para o seu perfil.'}</p>
                </div>
            `;
            return;
        }

        content.innerHTML = `
            <div class="page-header">
                <h2><i class="fas fa-clipboard-check"></i> Painel de Custos de Peças</h2>
                <p class="text-muted">Acompanhe custos, volume e desempenho financeiro das solicitações.</p>
                <div class="kpi-controls">
                    <span class="text-muted">Período padrão do painel:</span>
                    ${[7, 30, 90].map(days => `
                        <button class="btn btn-sm ${currentRange === days ? 'btn-primary' : 'btn-outline'}"
                                onclick="Dashboard.setRange(${days})">
                            ${days}d
                        </button>
                    `).join('')}
                </div>
                <div class="filter-context-summary">
                    <span class="helper-text">${dashboardData.summaryLabel}</span>
                    ${this.renderActiveFilterChips()}
                </div>
            </div>

            <div class="kpi-grid dashboard-primary-grid">
                ${this.renderPrimaryKpis(dashboardData)}
            </div>
            <div class="insight-grid">
                <div class="card compact-card">
                    <div class="card-header">
                        <h4><i class="fas fa-gauge-high"></i> Ranking de eficiência técnica</h4>
                    </div>
                    <div class="card-body">
                        ${this.renderTopTechnicians(dashboardData.efficiencyRanking, dashboardData.rangeLabel)}
                    </div>
                </div>
                <div class="card compact-card">
                    <div class="card-header">
                        <h4><i class="fas fa-box-open"></i> Top 5 peças utilizadas</h4>
                    </div>
                    <div class="card-body">
                        ${this.renderTopPieces(dashboardData.topPieces)}
                    </div>
                </div>
                <div class="card compact-card">
                    <div class="card-header">
                        <h4><i class="fas fa-industry"></i> Por Fornecedor</h4>
                    </div>
                    <div class="card-body">
                        ${this.renderSupplierBreakdown(dashboardData)}
                    </div>
                </div>
            </div>

            <div class="card mt-3 compact-card"> 
                <div class="card-header">
                    <div>
                        <h4><i class="fas fa-triangle-exclamation"></i> Alertas de custo elevado</h4>
                        <p class="text-muted" style="margin: 0; font-size: 0.85rem;">Solicitações acima de 30% do custo médio do período.</p>
                    </div>
                </div>
                <div class="card-body">
                    ${this.renderHighCostAlerts(dashboardData)}
                </div>
            </div>

            <div class="card mt-3">
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
                        <p class="text-muted" style="margin: 0; font-size: 0.85rem;">Os mesmos filtros do painel controlam indicadores, alertas, gráficos e a tabela recente.</p>
                    </div>
                    <details class="filter-panel compact" ${hasRecentFilters ? 'open' : ''}>
                        <summary class="filter-panel-toggle">${hasRecentFilters ? 'Filtros ativos' : 'Filtros'}</summary>
                        <div class="dashboard-filters filter-panel-body">
                            <div class="search-box">
                                <input type="text" id="recent-search" class="form-control" placeholder="Buscar por número, cliente, técnico, peça ou rastreio..." value="${Utils.escapeHtml(this.recentFilters.search)}">
                            </div>
                            <div class="status-filter" data-status-filter="recent-status" role="group" aria-label="Filtro rápido de status">
                                <button type="button" class="status-filter-trigger" data-status-trigger="recent-status">
                                    <span class="status-filter-label">
                                        <i class="fas fa-filter"></i>
                                        <span class="status-filter-label-text">${recentStatusSummary.length > 0 ? `${recentStatusSummary.length} status selecionado(s)` : 'Todos os status'}</span>
                                    </span>
                                    <i class="fas fa-chevron-down"></i>
                                </button>
                                <div class="status-filter-dropdown" data-status-dropdown="recent-status">
                                    <div class="status-filter-summary">
                                        ${recentStatusSummary.length > 0
        ? recentStatusSummary.map(status => `<span class="tag-soft info"><i class="fas fa-check-square"></i>${Utils.escapeHtml(status.label)}</span>`).join('')
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
                            <select id="recent-fornecedor" class="form-control">
                                <option value="">Fornecedor</option>
                                <option value="sup-ebst" ${this.recentFilters.fornecedor === 'sup-ebst' ? 'selected' : ''}>EBST</option>
                                <option value="sup-hobart" ${this.recentFilters.fornecedor === 'sup-hobart' ? 'selected' : ''}>Hobart</option>
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
        setTimeout(() => this.initCharts(dashboardData), 50);
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
                title: 'Solicitações no período',
                value: Utils.formatNumber(dashboardData.totalRequests),
                change: dashboardData.rangeLabel,
                icon: 'fa-calendar-days',
                tone: 'info',
                target: 'solicitacoes'
            },
            {
                title: 'Custo total de peças',
                value: Utils.formatCurrency(dashboardData.totalCost),
                change: `${Utils.formatNumber(dashboardData.totalApproved)} solicitações com custo`,
                icon: 'fa-money-bill-wave',
                tone: 'success',
                target: 'relatorios',
                nowrap: true
            },
            {
                title: 'Custo médio por solicitação',
                value: Utils.formatCurrency(dashboardData.averageTicket),
                change: dashboardData.costVariation >= 0 ? 'Acima do período anterior' : 'Abaixo do período anterior',
                icon: 'fa-receipt',
                tone: 'primary',
                target: 'relatorios',
                nowrap: true,
                changeClass: dashboardData.costVariation >= 0 ? 'negative' : 'positive'
            },
            {
                title: 'Custo médio por técnico',
                value: Utils.formatCurrency(dashboardData.avgCostPerTech),
                change: `${Utils.formatNumber(dashboardData.uniqueTechCount)} técnico(s) com solicitações`,
                icon: 'fa-user-gear',
                tone: 'info',
                target: 'relatorios',
                nowrap: true
            },
        ];

        return cards.map(card => `
            <div class="kpi-card metric-card clickable" role="button" tabindex="0" onclick="Dashboard.handleCardClick('${card.target}')" onkeydown="Dashboard.handleCardKey(event, '${card.target}')" title="${card.title}">
                <div class="kpi-icon ${card.tone}">
                    <i class="fas ${card.icon}"></i>
                </div>
                <div class="kpi-content">
                    <h4>${card.title}</h4>
                    <div class="kpi-value ${card.nowrap ? 'metric-nowrap' : ''}" ${card.nowrap ? `title="${card.value}"` : ''}>${card.value}</div>
                    <div class="kpi-change ${card.changeClass || ''}">${card.change}</div>
                </div>
            </div>
        `).join('');
    },

    renderActiveFilterChips() {
        const chips = AnalyticsHelper.buildFilterChips(this.buildFilterState(), {
            moduleKey: 'dashboard',
            statusOptions: this.getRecentStatusOptions(),
            labels: {
                tecnico: 'Técnico',
                fornecedor: 'Fornecedor'
            },
            resolvers: {
                tecnico: (value) => DataManager.getTechnicianById(value)?.nome || value,
                fornecedor: (value) => value === 'sup-hobart' ? 'Hobart' : 'EBST'
            }
        });

        if (!chips.length) {
            return '';
        }

        return `
            <div class="filter-chip-bar">
                ${chips.map((chip) => `
                    <button type="button" class="filter-chip" onclick="Dashboard.removeFilterChip('${chip.key}'${chip.key === 'status' ? `, '${Utils.escapeHtml(String(chip.value || ''))}'` : ''})">
                        <span>${Utils.escapeHtml(chip.label)}: ${Utils.escapeHtml(chip.displayValue || chip.value || '')}</span>
                        <i class="fas fa-times"></i>
                    </button>
                `).join('')}
            </div>
        `;
    },

    removeFilterChip(key, value = '') {
        if (key === 'search') {
            this.recentFilters.search = '';
        } else if (key === 'status') {
            this.recentFilters.status = (this.recentFilters.status || []).filter((status) => status !== value);
        } else if (key === 'period') {
            const defaults = this.getDefaultFilters();
            this.recentFilters.dateFrom = defaults.dateFrom;
            this.recentFilters.dateTo = defaults.dateTo;
            this.recentFilters.rangeDays = defaults.rangeDays;
            this.recentFilters.useDefaultPeriod = true;
            this.rangeDays = defaults.rangeDays;
        } else if (key === 'tecnico') {
            this.recentFilters.tecnico = '';
        } else if (key === 'fornecedor') {
            this.recentFilters.fornecedor = '';
        }

        this.persistFilters();
        this.render();
    },

    buildDashboardMetrics(solicitations = []) {
        const accessible = solicitations.filter((solicitation) => this.canAccessDashboardRecord(solicitation));
        const analysis = AnalyticsHelper.buildOperationalAnalysis(accessible, {
            moduleKey: 'dashboard',
            search: this.recentFilters.search,
            statuses: this.recentFilters.status,
            tecnico: this.recentFilters.tecnico,
            period: {
                dateFrom: this.recentFilters.dateFrom,
                dateTo: this.recentFilters.dateTo,
                rangeDays: this.recentFilters.rangeDays || this.getRangeDays()
            }
        });

        const slaSamples = analysis.costSolicitations
            .map(sol => {
                const createdAt = AnalyticsHelper.getSolicitationDate(sol);
                const completedAt = Utils.parseAsLocalDate(sol.approvedAt || sol.updatedAt || sol.data);
                if (isNaN(createdAt) || isNaN(completedAt.getTime())) {
                    return null;
                }
                return Math.max((completedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60), 0);
            })
            .filter(value => value !== null);
        const slaAverageHours = slaSamples.length > 0
            ? slaSamples.reduce((sum, value) => sum + value, 0) / slaSamples.length
            : 0;

        return {
            ...analysis,
            averageTicket: analysis.averageCostPerSolicitation,
            currentMonthCost: analysis.totalCost,
            currentMonthCalls: analysis.totalApproved,
            currentMonthRequests: analysis.totalRequests,
            approvedThisMonth: analysis.totalApproved,
            rangeLabel: analysis.periodLabel,
            slaAverageHours,
            slaBaseCount: slaSamples.length,
            topTechniciansByCost: analysis.byTechnician.slice(0, 5)
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
                ${topTechs.slice(0, 5).map(t => `
                    <div class="top-tech-item top-tech-item-rich">
                        <div>
                            <strong>${Utils.escapeHtml(t.nome || t.name)}</strong>
                            <div class="meta">${Utils.formatNumber(t.calls || t.count || 0)} solicitações em ${Utils.escapeHtml(rangeLabel)}</div>
                        </div>
                        <div style="text-align: right;">
                            <div><strong>${Utils.formatCurrency(t.costPerCall || 0)}</strong></div>
                            <div class="meta">Custo médio por solicitação</div>
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
                    <span class="metric-list-label">Maior volume de solicitações</span>
                    <strong>${Utils.escapeHtml(dashboardData.topByCalls.nome)}</strong>
                    <span class="metric-list-meta">${Utils.formatNumber(dashboardData.topByCalls.calls)} solicitações em ${Utils.escapeHtml(dashboardData.rangeLabel)}</span>
                </div>
                <div class="metric-list-item">
                    <span class="metric-list-label">Maior custo total</span>
                    <strong>${Utils.escapeHtml(dashboardData.topByCost.nome)}</strong>
                    <span class="metric-list-meta">${Utils.formatCurrency(dashboardData.topByCost.totalCost)} no período</span>
                </div>
                <div class="metric-list-item">
                    <span class="metric-list-label">Melhor eficiência</span>
                    <strong>${Utils.escapeHtml(dashboardData.mostEfficient.nome)}</strong>
                    <span class="metric-list-meta">${Utils.formatCurrency(dashboardData.mostEfficient.costPerCall)} por solicitação</span>
                </div>
                <div class="metric-list-item">
                    <span class="metric-list-label">Média mensal do período</span>
                    <strong>${Utils.formatNumber(dashboardData.monthlyAverageRequests, 1)}</strong>
                    <span class="metric-list-meta">${Utils.formatNumber(dashboardData.monthSpan)} mês(es) cobertos</span>
                </div>
            </div>
        `;
    },

    renderTopPieces(topPieces = []) {
        if (!topPieces.length) {
            return '<p class="text-muted">Sem peças utilizadas no período.</p>';
        }

        return `
            <div class="table-container">
                <table class="table compact-table">
                    <thead>
                        <tr>
                            <th>Peça</th>
                            <th>Quantidade</th>
                            <th>Custo total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${topPieces.map(piece => `
                            <tr>
                                <td><strong>${Utils.escapeHtml(piece.descricao)}</strong></td>
                                <td>${Utils.formatNumber(piece.quantidade)}</td>
                                <td>${Utils.formatCurrency(piece.totalCost)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    renderSupplierBreakdown(dashboardData) {
        const dataset = dashboardData.dataset || { records: [] };
        const solicitations = dataset.records || [];

        // Build dynamic stats per supplier from DataManager
        const suppliers = DataManager.getSuppliers ? DataManager.getSuppliers() : [];
        const fallbackSuppliers = [
            { id: 'sup-ebst', nome: 'EBST' },
            { id: 'sup-hobart', nome: 'Hobart' }
        ];
        const supplierList = suppliers.length ? suppliers : fallbackSuppliers;

        const statsMap = {};
        supplierList.forEach(s => {
            statsMap[s.id] = { nome: s.nome, count: 0, total: 0 };
        });
        // Guarantee both known suppliers are present even if not in DataManager
        if (!statsMap['sup-ebst']) {
            statsMap['sup-ebst'] = { nome: 'EBST', count: 0, total: 0 };
        }
        if (!statsMap['sup-hobart']) {
            statsMap['sup-hobart'] = { nome: 'Hobart', count: 0, total: 0 };
        }

        solicitations.forEach(sol => {
            // Use solicitation-level fornecedorId first, fallback to item-level
            const solFornecedor = sol.fornecedorId || '';
            if (solFornecedor && statsMap[solFornecedor]) {
                statsMap[solFornecedor].count += 1;
                const cost = (sol.itens || [])
                    .reduce((sum, item) => sum + (Number(item.valor || 0) * Number(item.quantidade || 1)), 0);
                statsMap[solFornecedor].total += cost;
            } else {
                // Legacy: infer from item-level fornecedorId
                const supplierIds = [...new Set((sol.itens || [])
                    .map(item => item.fornecedorId || 'sup-ebst'))];
                supplierIds.forEach(sid => {
                    if (!statsMap[sid]) {
                        return;
                    }
                    statsMap[sid].count += 1;
                    const cost = (sol.itens || [])
                        .filter(item => (item.fornecedorId || 'sup-ebst') === sid)
                        .reduce((sum, item) => sum + (Number(item.valor || 0) * Number(item.quantidade || 1)), 0);
                    statsMap[sid].total += cost;
                });
            }
        });

        const totalAll = Object.values(statsMap).reduce((s, v) => s + v.total, 0);

        const rows = Object.values(statsMap).map(stat => {
            const pct = totalAll > 0 ? Math.round((stat.total / totalAll) * 100) : 0;
            return `
                <div class="supplier-item">
                    <div class="supplier-label">
                        <i class="fas fa-industry"></i>
                        <span><strong>${Utils.escapeHtml(stat.nome)}</strong></span>
                    </div>
                    <div class="supplier-stats">
                        <div class="supplier-stat-item">
                            <span class="text-muted">Solicitações:</span>
                            <strong>${Utils.formatNumber(stat.count)}</strong>
                        </div>
                        <div class="supplier-stat-item">
                            <span class="text-muted">Total:</span>
                            <strong>${Utils.formatCurrency(stat.total)}</strong>
                        </div>
                        <div class="supplier-stat-item" style="width:100%;margin-top:6px;">
                            <div style="background:var(--border-color);border-radius:4px;height:5px;overflow:hidden;">
                                <div style="width:${pct}%;height:100%;background:var(--primary-color);border-radius:4px;transition:width 0.4s;"></div>
                            </div>
                            <span class="text-muted" style="font-size:0.72rem;">${pct}% do total</span>
                        </div>
                    </div>
                </div>`;
        }).join('');

        return `<div class="supplier-breakdown-list">${rows}</div>`;
    },

    renderRegionRanking(regions = []) {
        if (!regions.length) {
            return '<p class="text-muted">Sem regiões com solicitações no período.</p>';
        }

        return `
            <div class="table-container">
                <table class="table compact-table">
                    <thead>
                        <tr>
                            <th>Região</th>
                            <th>Solicitações</th>
                            <th>Custo total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${regions.slice(0, 8).map(region => `
                            <tr>
                                <td><strong>${Utils.escapeHtml(region.regiao)}</strong></td>
                                <td>${Utils.formatNumber(region.requestCount)}</td>
                                <td>${Utils.formatCurrency(region.totalCost)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    renderHighCostAlerts(dashboardData) {
        if (!dashboardData.highCostSolicitations.length) {
            return `
                <div class="empty-state compact">
                    <i class="fas fa-circle-check"></i>
                    <div>
                        <h4>Nenhum alerta crítico</h4>
                        <p class="text-muted" style="margin: 0;">Nenhuma solicitação ultrapassou 30% da média do período.</p>
                    </div>
                </div>
            `;
        }

        return `
            <div class="table-container">
                <table class="table compact-table">
                    <thead>
                        <tr>
                            <th>Solicitação</th>
                            <th>Técnico</th>
                            <th>Região</th>
                            <th>Custo</th>
                            <th>Alerta</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${dashboardData.highCostSolicitations.slice(0, 8).map(sol => `
                            <tr class="cost-alert-row">
                                <td><strong>#${sol.numero}</strong></td>
                                <td>${Utils.escapeHtml(sol.tecnicoNome || 'Não identificado')}</td>
                                <td>${Utils.escapeHtml(sol.region)}</td>
                                <td>${Utils.formatCurrency(sol.analysisCost)}</td>
                                <td><span class="tag-soft danger"><i class="fas fa-triangle-exclamation"></i> +${Utils.formatNumber(sol.costDeltaPct, 1)}%</span></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    renderRecentTable() {
        const dashboardData = this._activeDashboardData || this.getDashboardData();
        const solicitations = dashboardData.dataset?.records || [];
        const slaHours = DataManager.getSettings().slaHours || 24;
        const visible = solicitations.slice(0, 8);
        const highCostIds = new Set(dashboardData.highCostSolicitations.map(sol => sol.id));

        if (visible.length === 0) {
            return `
                <div class="empty-state">
                    <i class="fas fa-inbox"></i>
                    <h4>Sem solicitações recentes</h4>
                    <p>${this.hasActiveRecentFilters() ? 'Revise os filtros para exibir as solicitações do período desejado.' : 'As solicitações mais recentes aparecerão aqui assim que a operação começar a registrar solicitações.'}</p>
                </div>
            `;
        }
        
        return `
            <div class="table-info">
                Exibindo ${visible.length} de ${solicitations.length} registros filtrados. ${Utils.escapeHtml(dashboardData.summaryLabel)}
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
        const costAlert = highCostIds.has(sol.id);
        const obsPreview = sol.observacoes ? Utils.escapeHtml(sol.observacoes).slice(0, 60) : '';
        return `
                                <tr class="${slaAlert || costAlert ? 'sla-alert' : ''}">
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
                                            ${costAlert ? '<span class="tag-soft danger"><i class="fas fa-triangle-exclamation"></i> Solicitação com custo elevado</span>' : ''}
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
        return this.getDashboardData().dataset?.records || [];
    },

    bindRecentFilters() {
        const searchInput = document.getElementById('recent-search');
        if (searchInput) {
            searchInput.addEventListener('input', Utils.debounce(() => this.applyRecentFilters(), 250));
        }

        ['recent-tecnico', 'recent-fornecedor', 'recent-date-from', 'recent-date-to'].forEach(id => {
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
        this.recentFilters.fornecedor = document.getElementById('recent-fornecedor')?.value || '';
        this.recentFilters.dateFrom = document.getElementById('recent-date-from')?.value || '';
        this.recentFilters.dateTo = document.getElementById('recent-date-to')?.value || '';
        const hasManualPeriod = Boolean(this.recentFilters.dateFrom || this.recentFilters.dateTo);
        this.recentFilters.useDefaultPeriod = !hasManualPeriod;
        if (hasManualPeriod) {
            this.recentFilters.rangeDays = '';
        }
        const normalized = AnalyticsHelper.buildFilterState({
            search: this.recentFilters.search,
            statuses: this.recentFilters.status,
            tecnico: this.recentFilters.tecnico,
            fornecedor: this.recentFilters.fornecedor,
            dateFrom: this.recentFilters.dateFrom,
            dateTo: this.recentFilters.dateTo,
            rangeDays: this.recentFilters.useDefaultPeriod !== false ? (this.recentFilters.rangeDays || this.rangeDays) : '',
            useDefaultPeriod: this.recentFilters.useDefaultPeriod
        }, {
            moduleKey: 'dashboard',
            defaults: this.getDefaultFilters(),
            useDefaultPeriod: this.recentFilters.useDefaultPeriod
        });
        this.recentFilters = {
            ...this.recentFilters,
            status: normalized.statuses,
            fornecedor: normalized.fornecedor || this.recentFilters.fornecedor,
            dateFrom: normalized.dateFrom,
            dateTo: normalized.dateTo,
            rangeDays: normalized.useDefaultPeriod ? normalized.rangeDays : '',
            useDefaultPeriod: normalized.useDefaultPeriod
        };
        if (normalized.useDefaultPeriod) {
            this.rangeDays = normalized.rangeDays;
        }
        this.persistFilters();
        this.render();
    },

    clearRecentFilters() {
        this.recentFilters = this.getDefaultFilters();
        this.rangeDays = this.recentFilters.rangeDays;
        this.persistFilters();
        this.render();
    },

    refreshRecentTable() {
        this._activeDashboardData = this.getDashboardData();
        const container = document.getElementById('recent-table-container');
        if (container) {
            container.innerHTML = this.renderRecentTable();
        }
    },

    getRecentStatusOptions() {
        return [
            { value: 'pendente', label: 'Em aprovação' },
            { value: 'rejeitada', label: 'Rejeitado' },
            { value: 'aprovada', label: 'Aprovado / aguardando envio' },
            { value: 'em-transito', label: 'Em trânsito' },
            { value: 'finalizada', label: 'Finalizada' }
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
        const defaults = this.getDefaultFilters();
        return !!(
            this.recentFilters.search ||
            this.recentFilters.tecnico ||
            this.recentFilters.fornecedor ||
            (Array.isArray(this.recentFilters.status) && this.recentFilters.status.length > 0) ||
            this.recentFilters.dateFrom !== defaults.dateFrom ||
            this.recentFilters.dateTo !== defaults.dateTo ||
            Number(this.recentFilters.rangeDays || defaults.rangeDays) !== Number(defaults.rangeDays)
        );
    },

    /**
     * Initialize Chart.js charts
     */
    initCharts(stats) {
        const canvas = document.getElementById('dashboardTrendChart');
        if (!canvas) {
            return;
        }

        if (typeof Chart === 'undefined') {
            if (canvas.parentElement) {
                canvas.parentElement.innerHTML = '<div class="chart-fallback">Gráfico indisponível (biblioteca não carregada).</div>';
            }
            return;
        }

        Object.values(this.charts).forEach(chart => {
            if (chart && typeof chart.destroy === 'function') {
                chart.destroy();
            }
        });
        this.charts = {};

        const isDark = document.body.classList.contains('dark-mode');
        const textColor = isDark ? '#e4e6eb' : '#212529';
        const gridColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';

        this.charts.dashboardTrendChart = new Chart(canvas, {
            type: 'line',
            data: {
                labels: stats.byMonth.map(month => month.label),
                datasets: [
                    {
                        label: 'Custo de peças',
                        data: stats.byMonth.map(month => month.totalCost),
                        borderColor: '#0066cc',
                        backgroundColor: 'rgba(0, 102, 204, 0.12)',
                        yAxisID: 'y',
                        tension: 0.3,
                        fill: true
                    },
                    {
                        label: 'Solicitações',
                        data: stats.byMonth.map(month => month.requestCount),
                        borderColor: '#f59e0b',
                        backgroundColor: 'rgba(245, 158, 11, 0.12)',
                        yAxisID: 'y1',
                        tension: 0.3
                    },
                    {
                        label: 'Peças utilizadas',
                        data: stats.byMonth.map(month => month.totalPieces),
                        borderColor: '#16a34a',
                        backgroundColor: 'rgba(22, 163, 74, 0.12)',
                        yAxisID: 'y1',
                        tension: 0.3
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                plugins: {
                    legend: {
                        labels: { color: textColor }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        position: 'left',
                        ticks: {
                            color: textColor,
                            callback: (value) => Utils.formatCurrency(Number(value) || 0)
                        },
                        grid: { color: gridColor }
                    },
                    y1: {
                        beginAtZero: true,
                        position: 'right',
                        ticks: { color: textColor },
                        grid: { drawOnChartArea: false }
                    },
                    x: {
                        ticks: { color: textColor },
                        grid: { display: false }
                    }
                }
            }
        });
    },

    /**
     * Refresh dashboard data
     */
    refresh() {
        this.render();
    },

    setRange(days) {
        this.rangeDays = days;
        const preferredPeriod = AnalyticsHelper.setGlobalPeriodByDays(days);
        this.recentFilters.rangeDays = preferredPeriod.rangeDays;
        this.recentFilters.dateFrom = preferredPeriod.dateFrom;
        this.recentFilters.dateTo = preferredPeriod.dateTo;
        this.recentFilters.useDefaultPeriod = true;
        this.persistFilters();
        this.render();
    },

    getRangeDays() {
        this.ensureFilters();
        this.rangeDays = Number(this.rangeDays) || this.getDefaultFilters().rangeDays;
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

if (typeof window !== 'undefined') {
    window.Dashboard = Dashboard;
}



























