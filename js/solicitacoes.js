/**
 * Solicitações (Solicitations) Module
 * Handles CRUD operations for parts requests
 */

const Solicitacoes = {
    currentPage: 1,
    itemsPerPage: 10,
    filters: {
        /**
         * Selected status values for solicitations. Uses plural to clarify multiple selections.
         * This property replaces the previous singular `status` key which could lead to
         * inconsistencies when persisting and restoring filter state.
         */
        statuses: [],
        tecnico: '',
        dateFrom: '',
        dateTo: '',
        search: ''
    },
    _filtersInitialized: false,

    // Current solicitation being edited
    currentSolicitation: null,
    autocompleteInstance: null,
    isSaveSubmitting: false,
    isTrackingSubmitting: false,
    isDeliverySubmitting: false,
    isDeleteSubmitting: false,

    getDefaultFilters() {
        // Always return the plural `statuses` property. Leaving a singular `status` property
        // causes duplication and breaks the persisted filter state restoration.
        return {
            statuses: [],
            tecnico: '',
            dateFrom: '',
            dateTo: '',
            search: '',
            useDefaultPeriod: false
        };
    },

    ensureFilters() {
        if (this._filtersInitialized) {
            return;
        }

        const defaults = this.getDefaultFilters();
        const restored = AnalyticsHelper.restoreModuleFilterState('solicitacoes', {
            defaults,
            useDefaultPeriod: false
        });
        // Merge defaults with restored state. Always place status arrays into the plural
        // `statuses` property. Avoid assigning into a singular `status` property here.
        this.filters = {
            ...defaults,
            ...restored,
            statuses: Array.isArray(restored?.statuses)
                ? restored.statuses.slice()
                : (Array.isArray(restored?.status) ? restored.status.slice() : [])
        };
        this._filtersInitialized = true;
    },

    persistFilters() {
        const persisted = AnalyticsHelper.persistModuleFilterState('solicitacoes', {
            search: this.filters.search,
            statuses: this.filters.statuses,
            tecnico: this.filters.tecnico,
            dateFrom: this.filters.dateFrom,
            dateTo: this.filters.dateTo
        }, {
            defaults: this.getDefaultFilters(),
            useDefaultPeriod: false
        });
        // After persisting, normalize the filter state back into our local object. Always
        // assign the array into `statuses`. If persisted data still uses the old
        // `status` property we convert it to `statuses`.
        this.filters = {
            ...this.filters,
            search: persisted?.search || '',
            statuses: Array.isArray(persisted?.statuses)
                ? persisted.statuses.slice()
                : (Array.isArray(persisted?.status) ? persisted.status.slice() : []),
            tecnico: persisted?.tecnico || '',
            dateFrom: persisted?.dateFrom || '',
            dateTo: persisted?.dateTo || ''
        };
        return persisted;
    },

    /**
     * Render solicitations list
     */
    render() {
        this.ensureFilters();
        const content = document.getElementById('content-area');
        const canCreate = Auth.hasPermission('solicitacoes', 'create');
        const canManageBackup = Auth.hasPermission('solicitacoes', 'edit') || canCreate;
        const isTecnico = Auth.getRole() === 'tecnico';
        const canExport = !!(window && window.XLSX);

        content.innerHTML = `
            <div class="page-header">
                <h2><i class="fas fa-clipboard-list"></i> ${isTecnico ? 'Minhas Solicitações' : 'Solicitações'}</h2>
                <div class="page-actions">
                    ${canCreate ? `
                        <button class="btn btn-success" onclick="Solicitacoes.openForm()">
                            <i class="fas fa-plus"></i> Nova Solicitação
                        </button>
                    ` : ''}
                    ${(canManageBackup || canExport) ? `
                        <details class="action-menu">
                            <summary class="btn btn-outline">
                                <i class="fas fa-ellipsis-v"></i> Mais ações
                            </summary>
                            <div class="action-menu-dropdown">
                                ${canManageBackup ? `
                                    <button class="action-menu-item" onclick="Solicitacoes.downloadBackup()">
                                        <i class="fas fa-database"></i> Backup
                                    </button>
                                    <button class="action-menu-item" onclick="Solicitacoes.triggerRestoreBackup()">
                                        <i class="fas fa-upload"></i> Restaurar
                                    </button>
                                ` : ''}
                                ${canExport ? `
                                    <button class="action-menu-item" onclick="Solicitacoes.exportList()">
                                        <i class="fas fa-file-excel"></i> Exportar
                                    </button>
                                ` : ''}
                            </div>
                        </details>
                    ` : ''}
                </div>
            </div>
            <div class="filter-context-summary" id="sol-filter-context">
                <span class="helper-text">${this.getResultsSummary()}</span>
                ${this.renderActiveFilterChips()}
            </div>
            ${canExport ? '' : '<p class="text-muted mt-1 helper-text">Para exportar, certifique-se de que a biblioteca XLSX esteja disponível.</p>'}
            <input type="file" id="sol-backup-file" accept="application/json,.json" style="display:none;" onchange="Solicitacoes.handleRestoreBackup(event)">

            <details class="filter-panel compact" id="sol-filter-panel" ${this.hasActiveFilters() ? 'open' : ''}>
                <summary class="filter-panel-toggle" id="sol-filter-panel-toggle">${this.hasActiveFilters() ? 'Filtros ativos' : 'Filtros'}</summary>
                <div class="filters-bar filter-panel-body">
                    <div class="search-box">
                        <input type="text" id="sol-search" class="form-control"
                               placeholder="Buscar por número, cliente, técnico ou peça..."
                               value="${Utils.escapeHtml(this.filters.search)}">
                    </div>
                    <div class="filter-group">
                        <label>Status:</label>
                        ${this.renderStatusFilter('sol-status-filter')}
                    </div>
                    ${!isTecnico ? `
                        <div class="filter-group">
                            <label>Técnico:</label>
                            <select id="sol-tecnico-filter" class="form-control">
                                <option value="">Todos</option>
                                ${DataManager.getTechnicians().map(t =>
        `<option value="${t.id}" ${this.filters.tecnico === t.id ? 'selected' : ''}>
                                        ${Utils.escapeHtml(t.nome)}
                                    </option>`
    ).join('')}
                            </select>
                        </div>
                    ` : ''}
                    <div class="filter-group">
                        <label>De:</label>
                        <input type="date" id="sol-date-from" class="form-control" value="${this.filters.dateFrom}">
                    </div>
                    <div class="filter-group">
                        <label>Até:</label>
                        <input type="date" id="sol-date-to" class="form-control" value="${this.filters.dateTo}">
                    </div>
                    <button class="btn btn-outline" onclick="Solicitacoes.clearFilters()">
                        <i class="fas fa-times"></i> Limpar
                    </button>
                </div>
            </details>

            <div id="sol-summary-container">
                ${this.renderSummaryCards()}
            </div>

            <div class="card">
                <div class="card-body">
                    <div id="sol-table-container">
                        ${this.renderTable()}
                    </div>
                </div>
            </div>
        `;

        document.getElementById('sol-search').addEventListener('input', Utils.debounce(() => {
            this.applyFilters();
        }, 250));

        ['sol-date-from', 'sol-date-to'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('change', () => this.applyFilters());
            }
        });

        const statusTrigger = document.querySelector('[data-status-trigger="sol-status-filter"]');
        if (statusTrigger) {
            statusTrigger.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                this.toggleStatusDropdown('sol-status-filter');
            });
        }

        document.querySelectorAll('[data-status-group="sol-status-filter"]').forEach(input => {
            input.addEventListener('change', () => this.applyFilters());
            input.addEventListener('click', (event) => event.stopPropagation());
        });

        document.querySelectorAll('[data-status-dropdown="sol-status-filter"]').forEach(panel => {
            panel.addEventListener('click', (event) => event.stopPropagation());
        });

        this.bindStatusDropdownClose();

        if (!isTecnico) {
            const tecnicoFilter = document.getElementById('sol-tecnico-filter');
            if (tecnicoFilter) {
                tecnicoFilter.addEventListener('change', () => this.applyFilters());
            }
        }
    },

    getResultsSummary() {
        const solicitations = this.getFilteredSolicitations();
        return `Base atual: ${Utils.formatNumber(solicitations.length)} solicitações filtradas.`;
    },

    renderActiveFilterChips() {
        const chips = AnalyticsHelper.buildFilterChips({
            search: this.filters.search,
            statuses: this.filters.statuses,
            tecnico: this.filters.tecnico,
            dateFrom: this.filters.dateFrom,
            dateTo: this.filters.dateTo
        }, {
            moduleKey: 'solicitacoes',
            useDefaultPeriod: false,
            statusOptions: this.getStatusOptions(),
            labels: {
                tecnico: 'Tecnico'
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
                    <button type="button" class="filter-chip" onclick="Solicitacoes.removeFilterChip('${chip.key}'${chip.key === 'status' ? `, '${Utils.escapeHtml(String(chip.value || ''))}'` : ''})">
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
            this.filters.statuses = (this.filters.statuses || []).filter((status) => status !== value);
        } else if (key === 'period') {
            this.filters.dateFrom = '';
            this.filters.dateTo = '';
        } else if (Object.prototype.hasOwnProperty.call(this.filters, key)) {
            this.filters[key] = '';
        }

        this.persistFilters();
        this.currentPage = 1;
        this.render();
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

    renderStatusFilter(controlId) {
        const selected = this.getSelectedStatusSummary();
        const summaryText = selected.length > 0 ? `${selected.length} status selecionado(s)` : 'Todos os status';
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
                                <input type="checkbox" data-status-group="${controlId}" value="${option.value}" ${Array.isArray(this.filters.statuses) && this.filters.statuses.includes(option.value) ? 'checked' : ''}>
                                <span>${option.label}</span>
                                ${Utils.renderStatusBadge(option.value)}
                            </label>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    },

    getSelectedStatusValues(controlId = 'sol-status-filter') {
        return Array.from(document.querySelectorAll(`[data-status-group="${controlId}"]:checked`)).map(option => option.value);
    },

    getSelectedStatusSummary() {
        const selectedValues = Array.isArray(this.filters.statuses) ? this.filters.statuses : [];
        return this.getStatusOptions().filter(option => selectedValues.includes(option.value));
    },

    toggleStatusDropdown(controlId = 'sol-status-filter') {
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
        document.querySelectorAll('[data-status-filter].open').forEach(filter => {
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

    getTimelineStatusLabel(status) {
        const map = {
            rascunho: 'Técnico abriu a solicitação',
            pendente: 'Solicitação em aprovação com o gestor',
            aprovada: 'Gestor aprovou. Aguardando envio do fornecedor',
            rejeitada: 'Gestor rejeitou e retornou ao técnico',
            'em-transito': 'Fornecedor informou rastreio. Pedido em trânsito',
            entregue: 'Técnico confirmou recebimento. Solicitação finalizada',
            finalizada: 'Solicitação finalizada',
            'historico-manual': 'Solicitação finalizada'
        };
        const key = String(status || '').trim();
        if (map[key]) {
            return map[key];
        }
        const info = Utils.getStatusInfo(status);
        return info?.label || 'Atualização da solicitação';
    },

    buildTimelineEvents(sol) {
        const events = [];

        if (Array.isArray(sol.timeline) && sol.timeline.length > 0) {
            sol.timeline.forEach((event) => {
                if (!event) {
                    return;
                }
                let label = 'Atualização da solicitação';
                if (event.event === 'created') {
                    label = 'Técnico abriu a solicitação';
                } else if (event.event === 'status_changed') {
                    label = this.getTimelineStatusLabel(event.to || sol.status);
                }
                events.push({
                    label,
                    by: event.by || 'Sistema',
                    at: event.at || sol.createdAt || Date.now()
                });
            });
        }

        if (events.length === 0 && Array.isArray(sol.statusHistory) && sol.statusHistory.length > 0) {
            sol.statusHistory.forEach((statusEvent) => {
                events.push({
                    label: this.getTimelineStatusLabel(statusEvent.status),
                    by: statusEvent.by || 'Sistema',
                    at: statusEvent.at || sol.createdAt || Date.now()
                });
            });
        }

        if (events.length === 0) {
            events.push({
                label: 'Técnico abriu a solicitação',
                by: sol.createdBy || sol.tecnicoNome || 'Sistema',
                at: sol.createdAt || Date.now()
            });
        }

        events.sort((a, b) => (a.at || 0) - (b.at || 0));
        return events;
    },

    renderTimeline(sol) {
        const events = this.buildTimelineEvents(sol);
        if (!events.length) {
            return '';
        }
        return `
            <h4 class="mt-4 mb-2">Histórico do fluxo da solicitação</h4>
            <div class="timeline">
                ${events.map((event) => `
                    <div class="timeline-item">
                        <div class="timeline-marker"></div>
                        <div class="timeline-content">
                            <strong>${Utils.escapeHtml(event.label)}</strong>
                            por ${Utils.escapeHtml(event.by)}
                            <div class="timeline-date">${Utils.formatDate(event.at, true)}</div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    },


    hasActiveFilters() {
        return !!(
            this.filters.search ||
            this.filters.tecnico ||
            this.filters.dateFrom ||
            this.filters.dateTo ||
            (Array.isArray(this.filters.statuses) && this.filters.statuses.length > 0)
        );
    },

    setStatusFilter(statuses = []) {
        this.filters.statuses = Array.isArray(statuses) ? statuses : (statuses ? [statuses] : []);
        this.currentPage = 1;
        this.persistFilters();
        this.render();
    },

    /**
     * Render solicitations table
     */
    renderTable() {
        const solicitations = this.getFilteredSolicitations();

        const total = solicitations.length;
        const totalPages = Math.max(Math.ceil(total / this.itemsPerPage), 1);
        this.currentPage = Math.min(this.currentPage, totalPages);
        const start = (this.currentPage - 1) * this.itemsPerPage;
        const paginated = solicitations.slice(start, start + this.itemsPerPage);

        if (solicitations.length === 0) {
            return `
                <div class="empty-state">
                    <i class="fas fa-clipboard-list"></i>
                    <h4>Nenhuma solicitação encontrada</h4>
                    <p>${this.hasActiveFilters() ? 'Tente ajustar os filtros.' : 'Crie sua primeira solicitação.'}</p>
                    ${Auth.hasPermission('solicitacoes', 'create') ? `
                        <button class="btn btn-primary" onclick="Solicitacoes.openForm()">
                            <i class="fas fa-plus"></i> Nova Solicitação
                        </button>
                    ` : ''}
                </div>
            `;
        }

        const canEdit = Auth.hasPermission('solicitacoes', 'edit');
        const canDelete = Auth.hasPermission('solicitacoes', 'delete');
        const canApprove = Auth.hasPermission('aprovacoes', 'approve');
        const canManageTracking = Auth.getRole() === 'fornecedor';
        const isTecnico = Auth.getRole() === 'tecnico';
        const currentTecnicoId = Auth.getTecnicoId();

        const tableHeaders = isTecnico
            ? `
                <tr>
                    <th>Nº</th>
                    <th>Data</th>
                    <th>Cliente</th>
                    <th>Itens/Peças</th>
                    <th>Quantidade</th>
                    <th>Status</th>
                    <th>Rastreio</th>
                    <th>Ações</th>
                </tr>
            `
            : `
                <tr>
                    <th>Nº</th>
                    <th>Técnico</th>
                    <th>Cliente</th>
                    <th>Peça</th>
                    <th>Valor</th>
                    <th>Status</th>
                    <th>Data</th>
                    <th>Ações</th>
                </tr>
            `;

        const rows = paginated.map(sol => {
            const normalizedStatus = (typeof DataManager.normalizeWorkflowStatus === 'function')
                ? DataManager.normalizeWorkflowStatus(sol.status)
                : String(sol.status || '').trim();
            const pieceSummary = this.getPieceSummary(sol.itens || []);
            const itemQuantity = this.getItemsQuantity(sol.itens || []);

            if (isTecnico) {
                return `
                    <tr>
                        <td><strong>#${sol.numero}</strong></td>
                        <td>${Utils.formatDate(sol.data || sol.createdAt)}</td>
                        <td>${Utils.escapeHtml(sol.cliente || 'Não informado')}</td>
                        <td title="${Utils.escapeHtml(pieceSummary.full)}">${Utils.escapeHtml(pieceSummary.short)}</td>
                        <td>${Utils.formatNumber(itemQuantity)}</td>
                        <td>${Utils.renderStatusBadge(normalizedStatus)}</td>
                        <td>${sol.trackingCode ? Utils.escapeHtml(sol.trackingCode) : '-'}</td>
                        <td>
                            <div class="actions">
                                <button class="btn btn-sm btn-outline" onclick="Solicitacoes.viewDetails('${sol.id}')" title="Visualizar">
                                    <i class="fas fa-eye"></i>
                                </button>
                                ${canEdit && normalizedStatus === 'pendente' ? `
                                    <button class="btn btn-sm btn-outline" onclick="Solicitacoes.openForm('${sol.id}')" title="Editar">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                ` : ''}
                                <button class="btn btn-sm btn-outline" onclick="Solicitacoes.duplicate('${sol.id}')" title="Duplicar">
                                    <i class="fas fa-copy"></i>
                                </button>
                                ${sol.tecnicoId === currentTecnicoId && normalizedStatus === 'em-transito' ? `
                                    <button class="btn btn-sm btn-success" onclick="Solicitacoes.confirmDelivery('${sol.id}')" title="Confirmar recebimento">
                                        <i class="fas fa-check-circle"></i>
                                    </button>
                                ` : ''}
                                <button class="btn btn-sm btn-outline" onclick="Solicitacoes.downloadPDF('${sol.id}')" title="PDF">
                                    <i class="fas fa-file-pdf"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            }

            return `
                <tr>
                    <td><strong>#${sol.numero}</strong></td>
                    <td>${Utils.escapeHtml(sol.tecnicoNome || '-')}</td>
                    <td>${Utils.escapeHtml(sol.cliente || 'Não informado')}</td>
                    <td title="${Utils.escapeHtml(pieceSummary.full)}">${Utils.escapeHtml(pieceSummary.short)}</td>
                    <td>${Utils.formatCurrency(sol.total)}</td>
                    <td>${Utils.renderStatusBadge(normalizedStatus)}</td>
                    <td>${Utils.formatDate(sol.data || sol.createdAt)}</td>
                    <td>
                        <div class="actions">
                            <button class="btn btn-sm btn-outline" onclick="Solicitacoes.viewDetails('${sol.id}')" title="Visualizar">
                                <i class="fas fa-eye"></i>
                            </button>
                            ${canEdit && normalizedStatus === 'pendente' ? `
                                <button class="btn btn-sm btn-outline" onclick="Solicitacoes.openForm('${sol.id}')" title="Editar">
                                    <i class="fas fa-edit"></i>
                                </button>
                            ` : ''}
                            <button class="btn btn-sm btn-outline" onclick="Solicitacoes.duplicate('${sol.id}')" title="Duplicar">
                                <i class="fas fa-copy"></i>
                            </button>
                            ${canManageTracking && (normalizedStatus === 'aprovada' || normalizedStatus === 'em-transito') ? `
                                <button class="btn btn-sm btn-outline" onclick="Solicitacoes.openTrackingModal('${sol.id}')" title="${sol.trackingCode ? 'Atualizar rastreio' : 'Registrar rastreio'}">
                                    <i class="fas fa-truck"></i>
                                </button>
                            ` : ''}
                            ${canApprove && normalizedStatus === 'pendente' ? `
                                <button class="btn btn-sm btn-success" onclick="Aprovacoes.openApproveModal('${sol.id}')" title="Aprovar">
                                    <i class="fas fa-check"></i>
                                </button>
                            ` : ''}
                            ${isTecnico && sol.tecnicoId === currentTecnicoId && normalizedStatus === 'em-transito' ? `
                                <button class="btn btn-sm btn-success" onclick="Solicitacoes.confirmDelivery('${sol.id}')" title="Confirmar entrega">
                                    <i class="fas fa-check-circle"></i>
                                </button>
                            ` : ''}
                            <button class="btn btn-sm btn-outline" onclick="Solicitacoes.downloadPDF('${sol.id}')" title="PDF">
                                <i class="fas fa-file-pdf"></i>
                            </button>
                            ${canDelete && normalizedStatus === 'rascunho' ? `
                                <button class="btn btn-sm btn-danger" onclick="Solicitacoes.confirmDelete('${sol.id}')" title="Excluir">
                                    <i class="fas fa-trash"></i>
                                </button>
                            ` : ''}
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        return `
            <div class="table-info">
                Exibindo ${start + 1}-${Math.min(start + this.itemsPerPage, total)} de ${total} solicitações
            </div>
            <div class="table-container">
                <table class="table">
                    <thead>
                        ${tableHeaders}
                    </thead>
                    <tbody>
                        ${rows}
                    </tbody>
                </table>
            </div>
            ${Utils.renderPagination(this.currentPage, totalPages, (page) => {
        this.currentPage = page;
        this.refreshTable();
    })}
        `;
    },

    renderSummaryCards() {
        const solicitations = this.getFilteredSolicitations();
        const totalValue = solicitations.reduce((sum, sol) => sum + (Number(sol._analysisCost ?? sol.total) || 0), 0);
        const totalParts = solicitations.reduce((sum, sol) => sum + (Number(sol._analysisPieces) || 0), 0);
        const uniqueClients = new Set(solicitations.map(sol => (sol.cliente || '').trim()).filter(Boolean)).size;
        const avgValue = solicitations.length > 0 ? totalValue / solicitations.length : 0;

        return `
            <div class="kpi-grid">
                <div class="kpi-card">
                    <div class="kpi-icon info"><i class="fas fa-list"></i></div>
                    <div class="kpi-content">
                        <h4>Total de solicitações</h4>
                        <div class="kpi-value">${Utils.formatNumber(solicitations.length)}</div>
                        <div class="kpi-change">Base filtrada atual</div>
                    </div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-icon success"><i class="fas fa-money-bill-wave"></i></div>
                    <div class="kpi-content">
                        <h4>Valor total solicitado</h4>
                        <div class="kpi-value">${Utils.formatCurrency(totalValue)}</div>
                        <div class="kpi-change">Soma das solicitações filtradas</div>
                    </div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-icon warning"><i class="fas fa-boxes"></i></div>
                    <div class="kpi-content">
                        <h4>Total de peças usadas</h4>
                        <div class="kpi-value">${Utils.formatNumber(totalParts)}</div>
                        <div class="kpi-change">Quantidade consolidada de itens</div>
                    </div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-icon primary"><i class="fas fa-users"></i></div>
                    <div class="kpi-content">
                        <h4>Ticket médio</h4>
                        <div class="kpi-value">${Utils.formatCurrency(avgValue)}</div>
                        <div class="kpi-change">${Utils.formatNumber(uniqueClients)} clientes na seleção</div>
                    </div>
                </div>
            </div>
        `;
    },

    getItemsQuantity(items = []) {
        return (items || []).reduce((sum, item) => sum + (Number(item?.quantidade) || 0), 0);
    },

    getPieceSummary(items = []) {
        const labels = items
            .map(item => item?.descricao || item?.codigo || '')
            .filter(Boolean);

        if (labels.length === 0) {
            return { short: 'Sem peça', full: 'Sem peça informada' };
        }

        return {
            short: labels.length > 1 ? `${labels[0]} +${labels.length - 1}` : labels[0],
            full: labels.join(', ')
        };
    },

    buildDecisionHistory(sol) {
        const allSolicitations = DataManager.getSolicitations() || [];
        const parseDate = (record) => Utils.parseAsLocalDate(record?.data || record?.createdAt || Date.now());
        const isValidDate = (date) => date instanceof Date && !Number.isNaN(date.getTime());

        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

        const tecnicoId = sol.tecnicoId;
        const tecnicoMonth = allSolicitations.filter((item) => {
            if (item.tecnicoId !== tecnicoId) {
                return false;
            }
            const date = parseDate(item);
            return isValidDate(date) && date >= monthStart && date <= monthEnd;
        });

        const tecnicoTotal = tecnicoMonth.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
        const tecnicoTicket = tecnicoMonth.length > 0 ? tecnicoTotal / tecnicoMonth.length : 0;

        const mainPiece = (sol.itens || [])[0] || null;
        const pieceCode = mainPiece?.codigo || '';
        const pieceSolicitations = pieceCode
            ? allSolicitations.filter((item) => (item.itens || []).some((part) => String(part.codigo || '') === String(pieceCode)))
            : [];

        const pieceValues = pieceSolicitations.map((item) => {
            const part = (item.itens || []).find((p) => String(p.codigo || '') === String(pieceCode));
            return part ? ((Number(part.quantidade) || 0) * (Number(part.valorUnit) || 0)) : 0;
        });
        const pieceValueTotal = pieceValues.reduce((sum, value) => sum + value, 0);
        const pieceAvg = pieceValues.length > 0 ? pieceValueTotal / pieceValues.length : 0;
        const pieceLast = pieceSolicitations
            .slice()
            .sort((a, b) => parseDate(b).getTime() - parseDate(a).getTime())[0] || null;

        const clienteName = String(sol.cliente || '').trim();
        const clienteNorm = Utils.normalizeText(clienteName);
        const clienteSolicitations = clienteNorm
            ? allSolicitations.filter((item) => Utils.normalizeText(item.cliente || '') === clienteNorm)
            : [];
        const clienteTotal = clienteSolicitations.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
        const clienteLast = clienteSolicitations
            .slice()
            .sort((a, b) => parseDate(b).getTime() - parseDate(a).getTime())[0] || null;

        return {
            tecnico: {
                solicitacoesMes: tecnicoMonth.length,
                custoTotal: tecnicoTotal,
                ticketMedio: tecnicoTicket
            },
            peca: {
                codigo: pieceCode,
                descricao: mainPiece?.descricao || '',
                solicitacoes: pieceSolicitations.length,
                valorMedio: pieceAvg,
                ultimaSolicitacao: pieceLast ? (pieceLast.data || pieceLast.createdAt) : null
            },
            cliente: {
                nome: clienteName || 'Não informado',
                totalSolicitacoes: clienteSolicitations.length,
                custoAcumulado: clienteTotal,
                ultimaSolicitacao: clienteLast ? (clienteLast.data || clienteLast.createdAt) : null
            }
        };
    },

    renderDecisionSidePanel(sol) {
        const history = this.buildDecisionHistory(sol);

        return `
            <aside class="decision-side-panel">
                <div class="decision-side-section">
                    <h4><i class="fas fa-user-gear"></i> Histórico do técnico</h4>
                    <div class="decision-side-list">
                        <div><span>Solicitações no mês</span><strong>${Utils.formatNumber(history.tecnico.solicitacoesMes)}</strong></div>
                        <div><span>Custo total</span><strong>${Utils.formatCurrency(history.tecnico.custoTotal)}</strong></div>
                        <div><span>Ticket médio</span><strong>${Utils.formatCurrency(history.tecnico.ticketMedio)}</strong></div>
                    </div>
                </div>

                <div class="decision-side-section">
                    <h4><i class="fas fa-box"></i> Histórico da peça</h4>
                    <p class="text-muted">${history.peca.codigo ? `${Utils.escapeHtml(history.peca.codigo)} - ${Utils.escapeHtml(history.peca.descricao || '')}` : 'Sem peça principal definida'}</p>
                    <div class="decision-side-list">
                        <div><span>Solicitações</span><strong>${Utils.formatNumber(history.peca.solicitacoes)}</strong></div>
                        <div><span>Valor médio</span><strong>${Utils.formatCurrency(history.peca.valorMedio)}</strong></div>
                        <div><span>Última solicitação</span><strong>${history.peca.ultimaSolicitacao ? Utils.formatDate(history.peca.ultimaSolicitacao) : '-'}</strong></div>
                    </div>
                </div>

                <div class="decision-side-section">
                    <h4><i class="fas fa-building"></i> Histórico do cliente</h4>
                    <p class="text-muted">${Utils.escapeHtml(history.cliente.nome)}</p>
                    <div class="decision-side-list">
                        <div><span>Total de solicitações</span><strong>${Utils.formatNumber(history.cliente.totalSolicitacoes)}</strong></div>
                        <div><span>Custo acumulado</span><strong>${Utils.formatCurrency(history.cliente.custoAcumulado)}</strong></div>
                        <div><span>Última solicitação</span><strong>${history.cliente.ultimaSolicitacao ? Utils.formatDate(history.cliente.ultimaSolicitacao) : '-'}</strong></div>
                    </div>
                </div>
            </aside>
        `;
    },

    /**
     * Get filtered solicitations
     */
    getFilteredSolicitations() {
        this.ensureFilters();
        let solicitations = DataManager.getSolicitations();
        const role = Auth.getRole();

        if (role === 'tecnico') {
            const tecnicoId = Auth.getTecnicoId();
            solicitations = solicitations.filter(s => s.tecnicoId === tecnicoId);
        }

        if (role === 'fornecedor') {
            solicitations = solicitations.filter((sol) => this.canCurrentUserAccessSolicitation(sol));
        }

        return AnalyticsHelper.filterSolicitations(solicitations, {
            moduleKey: 'solicitacoes',
            search: this.filters.search,
            // Use the plural property when passing statuses to the analytics engine
            statuses: this.filters.statuses,
            tecnico: this.filters.tecnico,
            period: {
                dateFrom: this.filters.dateFrom,
                dateTo: this.filters.dateTo
            },
            useDefaultPeriod: false
        }).sort((a, b) => (b._analysisDate?.getTime() || b.createdAt || 0) - (a._analysisDate?.getTime() || a.createdAt || 0));
    },

    /**
     * Apply filters
     */
    applyFilters() {
        const normalized = AnalyticsHelper.buildFilterState({
            search: document.getElementById('sol-search').value,
            statuses: this.getSelectedStatusValues('sol-status-filter'),
            dateFrom: document.getElementById('sol-date-from').value,
            dateTo: document.getElementById('sol-date-to').value,
            tecnico: document.getElementById('sol-tecnico-filter')?.value || ''
        }, {
            moduleKey: 'solicitacoes',
            defaults: this.getDefaultFilters(),
            useDefaultPeriod: false
        });

        this.filters.search = normalized.search;
        this.filters.statuses = normalized.statuses;
        this.filters.dateFrom = normalized.dateFrom;
        this.filters.dateTo = normalized.dateTo;
        this.filters.tecnico = normalized.tecnico;
        
        this.currentPage = 1;
        this.persistFilters();
        this.refreshTable();
    },

    /**
     * Clear filters
     */
    clearFilters() {
        this.filters = this.getDefaultFilters();
        this.currentPage = 1;
        this.persistFilters();
        this.render();
    },

    /**
     * Refresh table
     */
    refreshTable() {
        const filterPanel = document.getElementById('sol-filter-panel');
        const filterToggle = document.getElementById('sol-filter-panel-toggle');
        if (filterPanel && filterToggle) {
            const hasActive = this.hasActiveFilters();
            filterToggle.textContent = hasActive ? 'Filtros ativos' : 'Filtros';
            filterPanel.open = hasActive;
        }

        const context = document.getElementById('sol-filter-context');
        if (context) {
            context.innerHTML = `
                <span class="helper-text">${this.getResultsSummary()}</span>
                ${this.renderActiveFilterChips()}
            `;
        }
        const summaryContainer = document.getElementById('sol-summary-container');
        if (summaryContainer) {
            summaryContainer.innerHTML = this.renderSummaryCards();
        }
        const container = document.getElementById('sol-table-container');
        if (container) {
            container.innerHTML = this.renderTable();
        }
    },

    canCurrentUserAccessSolicitation(sol) {
        if (!sol) {
            return false;
        }

        const role = Auth.getRole();
        if (role === 'administrador' || role === 'gestor') {
            return true;
        }

        if (role === 'tecnico') {
            return sol.tecnicoId === Auth.getTecnicoId();
        }

        if (role === 'fornecedor') {
            const normalizedStatus = (typeof DataManager.normalizeWorkflowStatus === 'function')
                ? DataManager.normalizeWorkflowStatus(sol.status)
                : String(sol.status || '').trim();
            if (!['aprovada', 'em-transito'].includes(normalizedStatus) || !sol.fornecedorId) {
                return false;
            }

            const fornecedorId = (typeof Auth.getFornecedorId === 'function') ? Auth.getFornecedorId() : null;
            if (fornecedorId) {
                return sol.fornecedorId === fornecedorId;
            }

            const normalizeEmail = (value) => {
                if (typeof DataManager.normalizeEmail === 'function') {
                    return DataManager.normalizeEmail(value);
                }
                return String(value || '').trim().toLowerCase();
            };

            const currentEmail = normalizeEmail(Auth.getCurrentUser()?.email);
            const supplier = DataManager.getSupplierById(sol.fornecedorId);
            if (!currentEmail) {
                return false;
            }
            if (typeof Utils.supplierHasOperationalEmail === 'function') {
                return Utils.supplierHasOperationalEmail(supplier, currentEmail);
            }
            if (typeof Utils.extractOperationalEmailRecipients === 'function') {
                return Utils.extractOperationalEmailRecipients(
                    supplier?.email || '',
                    supplier?.emails || [],
                    supplier?.notificationEmails || []
                ).includes(currentEmail);
            }
            return normalizeEmail(supplier?.email) === currentEmail;
        }

        return false;
    },

    /**
     * View solicitation details
     */
    viewDetails(id) {
        const sol = DataManager.getSolicitationById(id);
        if (!sol) {
            Utils.showToast('Solicitação não encontrada', 'error');
            return;
        }

        if (!this.canCurrentUserAccessSolicitation(sol)) {
            Utils.showToast('Você não tem acesso a esta solicitação', 'error');
            return;
        }

        const isTecnicoOwner = Auth.getRole() === 'tecnico' && sol.tecnicoId === Auth.getTecnicoId();
        const supplier = sol.fornecedorId ? DataManager.getSupplierById(sol.fornecedorId) : null;
        const canManageTracking = Auth.getRole() === 'fornecedor' && this.canCurrentUserAccessSolicitation(sol);
        const canConfirmDelivery = Auth.getRole() === 'tecnico' && sol.tecnicoId === Auth.getTecnicoId();
        const normalizedStatus = (typeof DataManager.normalizeWorkflowStatus === 'function')
            ? DataManager.normalizeWorkflowStatus(sol.status)
            : String(sol.status || '').trim();

        if (isTecnicoOwner) {
            const items = Array.isArray(sol.itens) ? sol.itens : [];
            const itemQuantity = this.getItemsQuantity(items);
            const content = `
                <div class="modal-header">
                    <h3>Solicitação #${sol.numero}</h3>
                    <button class="modal-close" onclick="Utils.closeModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body technician-summary-modal">
                    <div class="technician-summary-grid">
                        <div class="technician-summary-card">
                            <label>Número da solicitação</label>
                            <strong>#${Utils.escapeHtml(sol.numero || '-')}</strong>
                        </div>
                        <div class="technician-summary-card">
                            <label>Data</label>
                            <strong>${Utils.formatDate(sol.data || sol.createdAt)}</strong>
                        </div>
                        <div class="technician-summary-card technician-summary-card-wide">
                            <label>Cliente</label>
                            <strong>${Utils.escapeHtml(sol.cliente || 'Não informado')}</strong>
                        </div>
                        <div class="technician-summary-card">
                            <label>Status atual</label>
                            <div>${Utils.renderStatusBadge(normalizedStatus)}</div>
                        </div>
                        <div class="technician-summary-card technician-summary-card-wide">
                            <label>Rastreio</label>
                            <strong>${sol.trackingCode ? Utils.escapeHtml(sol.trackingCode) : 'Aguardando rastreio do fornecedor'}</strong>
                        </div>
                        <div class="technician-summary-card">
                            <label>Quantidade total</label>
                            <strong>${Utils.formatNumber(itemQuantity)} peça(s)</strong>
                        </div>
                    </div>

                    <h4 class="mt-3 mb-2">Itens/peças solicitadas</h4>
                    <div class="table-container">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Peça</th>
                                    <th>Quantidade</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${items.length > 0 ? items.map(item => `
                                    <tr>
                                        <td>${Utils.escapeHtml(item.descricao || item.codigo || '-')}</td>
                                        <td>${Utils.formatNumber(Number(item.quantidade) || 0)}</td>
                                    </tr>
                                `).join('') : `
                                    <tr>
                                        <td colspan="2" class="text-muted">Sem itens registrados nesta solicitação.</td>
                                    </tr>
                                `}
                            </tbody>
                        </table>
                    </div>

                    ${this.renderTimeline(sol)}
                </div>
                <div class="modal-footer">
                    ${canConfirmDelivery && normalizedStatus === 'em-transito' ? `
                        <button class="btn btn-success" onclick="Solicitacoes.confirmDelivery('${sol.id}')">
                            <i class="fas fa-check-circle"></i> Confirmar Recebimento
                        </button>
                    ` : ''}
                    <button class="btn btn-outline" onclick="Solicitacoes.downloadPDF('${sol.id}'); Utils.closeModal();">
                        <i class="fas fa-file-pdf"></i> Download PDF
                    </button>
                    <button class="btn btn-primary" onclick="Utils.closeModal()">Fechar</button>
                </div>
            `;

            Utils.showModal(content, { size: 'md' });
            return;
        }

        const content = `
            <div class="modal-header">
                <h3>Solicitação #${sol.numero}</h3>
                <button class="modal-close" onclick="Utils.closeModal()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <!-- Info Grid -->
                <div class="form-row">
                    <div class="form-group">
                        <label>Técnico</label>
                        <p><strong>${Utils.escapeHtml(sol.tecnicoNome)}</strong></p>
                    </div>
                    <div class="form-group">
                        <label>Data</label>
                        <p><strong>${Utils.formatDate(sol.data)}</strong></p>
                    </div>
                    <div class="form-group">
                        <label>Status</label>
                        <p>${Utils.renderStatusBadge(normalizedStatus)}</p>
                    </div>
                    <div class="form-group">
                        <label>Cliente</label>
                        <p><strong>${Utils.escapeHtml(sol.cliente || 'Nao informado')}</strong></p>
                    </div>
                </div>

                ${this.renderDecisionSidePanel(sol)}

                ${supplier ? `
                    <div class="form-group">
                        <label>Fornecedor</label>
                        <p><strong>${Utils.escapeHtml(supplier.nome)}</strong></p>
                    </div>
                ` : ''}

                <div class="form-group">
                    <label>Código de Rastreio</label>
                    <div class="tracking-box">
                        <div>
                            <p><strong>${sol.trackingCode ? Utils.escapeHtml(sol.trackingCode) : 'Aguardando código do fornecedor'}</strong></p>
                            ${sol.trackingUpdatedAt ? `
                                <p class="text-muted" style="font-size: 0.85rem;">
                                    Atualizado em ${Utils.formatDate(sol.trackingUpdatedAt, true)}${sol.trackingBy ? ` por ${Utils.escapeHtml(sol.trackingBy)}` : ''}
                                </p>
                            ` : ''}
                        </div>
                        <div class="tracking-actions">
                            ${canManageTracking && (normalizedStatus === 'aprovada' || normalizedStatus === 'em-transito') ? `
                                <button class="btn btn-sm btn-outline" onclick="Solicitacoes.openTrackingModal('${sol.id}')">
                                    <i class="fas fa-truck"></i> ${sol.trackingCode ? 'Atualizar' : 'Registrar'} Rastreio
                                </button>
                            ` : ''}
                            ${canConfirmDelivery && normalizedStatus === 'em-transito' ? `
                                <button class="btn btn-sm btn-success" onclick="Solicitacoes.confirmDelivery('${sol.id}');">
                                    <i class="fas fa-check-circle"></i> Confirmar Entrega
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>

                ${sol.rejectionReason ? `
                    <div class="form-group">
                        <label>Motivo da Rejeição</label>
                        <p class="text-danger"><strong>${Utils.escapeHtml(sol.rejectionReason)}</strong></p>
                    </div>
                ` : ''}

                <!-- Items -->
                <h4 class="mt-4 mb-2">Itens</h4>
                <div class="table-container">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Código</th>
                                <th>Descrição</th>
                                <th>Qtd</th>
                                <th>Valor Unit.</th>
                                <th>Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${(sol.itens || []).map(item => `
                                <tr>
                                    <td><strong>${Utils.escapeHtml(item.codigo)}</strong></td>
                                    <td>${Utils.escapeHtml(item.descricao)}</td>
                                    <td>${item.quantidade}</td>
                                    <td>${Utils.formatCurrency(item.valorUnit)}</td>
                                    <td>${Utils.formatCurrency(item.quantidade * item.valorUnit)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>

                <!-- Totals -->
                <div class="totals-section">
                    <div class="total-row">
                        <span>Subtotal:</span>
                        <span>${Utils.formatCurrency(sol.subtotal)}</span>
                    </div>
                    <div class="total-row">
                        <span>Desconto:</span>
                        <span>- ${Utils.formatCurrency(sol.desconto)}</span>
                    </div>
                    <div class="total-row">
                        <span>Frete:</span>
                        <span>+ ${Utils.formatCurrency(sol.frete)}</span>
                    </div>
                    <div class="total-row grand-total">
                        <span>Total:</span>
                        <span>${Utils.formatCurrency(sol.total)}</span>
                    </div>
                </div>

                ${sol.observacoes ? `
                    <div class="form-group mt-3">
                        <label>Observações</label>
                        <p>${Utils.escapeHtml(sol.observacoes)}</p>
                    </div>
                ` : ''}

                <div class="decision-panel-clear"></div>
                ${this.renderTimeline(sol)}
            </div>
            <div class="modal-footer">
                <button class="btn btn-outline" onclick="Solicitacoes.downloadPDF('${sol.id}'); Utils.closeModal();">
                    <i class="fas fa-file-pdf"></i> Download PDF
                </button>
                <button class="btn btn-primary" onclick="Utils.closeModal()">Fechar</button>
            </div>
        `;

        Utils.showModal(content, { size: 'lg' });
    },

    /**
     * Open tracking modal for gestors/administrators
     */
    openTrackingModal(id) {
        if (Auth.getRole() !== 'fornecedor') {
            Utils.showToast('Somente o fornecedor pode registrar rastreio', 'error');
            return;
        }

        const sol = DataManager.getSolicitationById(id);
        if (!sol) {
            Utils.showToast('Solicitação não encontrada', 'error');
            return;
        }

        if (!this.canCurrentUserAccessSolicitation(sol)) {
            Utils.showToast('Você não tem acesso a esta solicitação', 'error');
            return;
        }

        const normalizedStatus = (typeof DataManager.normalizeWorkflowStatus === 'function')
            ? DataManager.normalizeWorkflowStatus(sol.status)
            : sol.status;

        if (!['aprovada', 'em-transito'].includes(normalizedStatus)) {
            Utils.showToast('O rastreio só pode ser informado após a aprovação', 'warning');
            return;
        }

        const content = `
            <div class="modal-header">
                <h3>Rastreio da Solicitação #${sol.numero}</h3>
                <button class="modal-close" onclick="Utils.closeModal()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label for="tracking-code">Código de Rastreio *</label>
                    <input type="text" id="tracking-code" class="form-control" 
                           placeholder="Informe o código enviado pelo fornecedor"
                           value="${Utils.escapeHtml(sol.trackingCode || '')}" required>
                </div>
                <input type="hidden" id="tracking-id" value="${sol.id}">
            </div>
            <div class="modal-footer">
                <button class="btn btn-outline" onclick="Utils.closeModal()">Cancelar</button>
                <button class="btn btn-primary" onclick="Solicitacoes.saveTracking()">
                    <i class="fas fa-truck"></i> Salvar Rastreio
                </button>
            </div>
        `;

        Utils.showModal(content);
    },

    /**
     * Save tracking code and move solicitation to transit status
     */
    async saveTracking() {
        if (this.isTrackingSubmitting) {
            return;
        }

        const id = document.getElementById('tracking-id').value;
        const codeInput = document.getElementById('tracking-code');
        const trackingCode = codeInput.value.trim();

        if (!trackingCode) {
            Utils.showToast('Informe o código de rastreio', 'warning');
            codeInput.focus();
            return;
        }

        const sol = DataManager.getSolicitationById(id);
        if (!sol) {
            Utils.showToast('Solicitação não encontrada', 'error');
            return;
        }

        if (Auth.getRole() !== 'fornecedor') {
            Utils.showToast('Somente o fornecedor pode registrar rastreio', 'error');
            return;
        }

        if (!this.canCurrentUserAccessSolicitation(sol)) {
            Utils.showToast('Você não tem acesso a esta solicitação', 'error');
            return;
        }

        const normalizedStatus = (typeof DataManager.normalizeWorkflowStatus === 'function')
            ? DataManager.normalizeWorkflowStatus(sol.status)
            : sol.status;

        if (!['aprovada', 'em-transito'].includes(normalizedStatus)) {
            Utils.showToast('O rastreio só pode ser informado em solicitações aprovadas ou em trânsito', 'warning');
            return;
        }

        const currentUser = Auth.getCurrentUser();
        const userName = currentUser?.name || 'Sistema';

        this.isTrackingSubmitting = true;
        try {
            const result = await DataManager.updateSolicitationStatus(id, 'em-transito', {
                trackingCode,
                trackingUpdatedAt: Date.now(),
                trackingBy: userName,
                trackingByEmail: currentUser?.email || null,
                supplierResponseAt: Date.now(),
                by: userName,
                byUserId: currentUser?.id || null,
                byUsername: currentUser?.username || null,
                byEmail: currentUser?.email || null,
                byRole: currentUser?.role || null
            });
            const success = result === true || (result && result.success !== false && !result.error);

            if (!success) {
                Utils.showToast(result?.message || result?.error || 'Erro ao salvar rastreio', 'error');
                return;
            }

            Utils.showToast('Rastreio salvo com sucesso', 'success');

            const updatedSolicitation = result?.solicitation || DataManager.getSolicitationById(id) || { ...sol, status: 'em-transito', trackingCode };
            this.notifyTechnicianTrackingEmail(updatedSolicitation, trackingCode, userName);

            Utils.closeModal();
            this.refreshTable();
            Auth.renderMenu(App.currentPage);
        } finally {
            this.isTrackingSubmitting = false;
        }
    },

    notifyTechnicianTrackingEmail(solicitation, trackingCode, updatedBy) {
        if (!solicitation || typeof Utils.sendTrackingNotificationToTechnician !== 'function') {
            return;
        }

        Utils.sendTrackingNotificationToTechnician({
            solicitation,
            trackingCode,
            updatedBy
        }).then((result) => {
            const managerCopySentCount = Number(result?.managerCopySentCount) || 0;
            const managerCopyFailedCount = Number(result?.managerCopyFailedCount) || 0;
            const managerCopyTotalRecipients = Number(result?.managerCopyTotalRecipients) || 0;
            const showManagerCopyStatus = () => {
                if (managerCopySentCount > 0) {
                    Utils.showToast(`${managerCopySentCount} cópia(s) para gestor enviadas por e-mail.`, 'info');
                } else if (managerCopyTotalRecipients === 0) {
                    Utils.showToast('Não há gestor válido configurado para cópia automática do rastreio.', 'warning');
                }

                if (managerCopyFailedCount > 0) {
                    Utils.showToast(`${managerCopyFailedCount} cópia(s) de e-mail para gestor falharam. Verifique o log.`, 'warning');
                }
            };

            const sent = result === true || result?.success === true;
            if (sent) {
                Utils.showToast(`Técnico notificado por e-mail (${result.recipient})`, 'info');
                showManagerCopyStatus();
                return;
            }

            if (result?.reason === 'missing_email') {
                showManagerCopyStatus();
                Utils.showToast('Rastreio salvo, mas o técnico solicitante está sem e-mail cadastrado na base de Técnicos.', 'warning');
                return;
            }

            if (result?.reason === 'invalid_email') {
                showManagerCopyStatus();
                Utils.showToast('Rastreio salvo, mas o e-mail cadastrado do técnico é inválido. Atualize o cadastro de Técnicos.', 'warning');
                return;
            }

            if (result?.reason === 'invalid_technician_link' || result?.reason === 'technician_not_found') {
                showManagerCopyStatus();
                Utils.showToast('Rastreio salvo, mas não foi possível validar o vínculo da solicitação com o técnico para envio de e-mail.', 'warning');
                return;
            }

            showManagerCopyStatus();
            Utils.showToast('Rastreio salvo, mas falhou o envio de e-mail ao técnico solicitante. Verifique o log.', 'warning');
        }).catch(() => {
            Utils.showToast('Rastreio salvo, mas falhou o envio de e-mail ao técnico solicitante. Verifique o log.', 'warning');
        });
    },

    /**
     * Confirm delivery by technician
     */
    async confirmDelivery(id) {
        if (this.isDeliverySubmitting) {
            return;
        }

        const sol = DataManager.getSolicitationById(id);
        if (!sol) {
            Utils.showToast('Solicitação não encontrada', 'error');
            return;
        }

        if (!(Auth.getRole() === 'tecnico' && sol.tecnicoId === Auth.getTecnicoId())) {
            Utils.showToast('Apenas o técnico responsável pode confirmar a entrega', 'warning');
            return;
        }

        const normalizedStatus = (typeof DataManager.normalizeWorkflowStatus === 'function')
            ? DataManager.normalizeWorkflowStatus(sol.status)
            : String(sol.status || '').trim();

        if (normalizedStatus !== 'em-transito') {
            Utils.showToast('Confirme a entrega somente após o envio pelo fornecedor', 'warning');
            return;
        }

        const confirmed = await Utils.confirm('Confirmar que o material foi entregue?', 'Confirmar Entrega');
        if (!confirmed) {
            return;
        }

        const currentUser = Auth.getCurrentUser();
        const userName = currentUser?.name || 'Sistema';

        const deliveredAt = Date.now();
        this.isDeliverySubmitting = true;
        try {
            const result = await DataManager.updateSolicitationStatus(id, 'finalizada', {
                deliveredAt,
                deliveredBy: userName,
                finalizedAt: deliveredAt,
                finalizedBy: userName,
                by: userName
            });
            const success = result === true || (result && result.success !== false && !result.error);

            if (!success) {
                Utils.showToast(result?.message || result?.error || 'Não foi possível atualizar o status', 'error');
                return;
            }

            Utils.showToast('Entrega confirmada e solicitação finalizada', 'success');
            Utils.closeModal();
            this.refreshTable();
            Auth.renderMenu(App.currentPage);
        } finally {
            this.isDeliverySubmitting = false;
        }
    },

    /**
     * Open solicitation form
     */
    openForm(id = null) {
        const sol = id ? DataManager.getSolicitationById(id) : null;
        const isEdit = !!sol;
        
        // Store current solicitation for editing
        this.currentSolicitation = sol ? { ...sol, itens: [...(sol.itens || [])] } : {
            id: null,
            tecnicoId: Auth.getTecnicoId() || '',
            tecnicoNome: '',
            data: Utils.getLocalDateString(),
            cliente: '',
            observacoes: '',
            itens: [],
            subtotal: 0,
            desconto: 0,
            frete: 0,
            total: 0,
            status: 'pendente',
            fornecedorId: ''
        };
        
        const technicians = DataManager.getTechnicians();
        const isTecnico = Auth.getRole() === 'tecnico';
        
        // If technician, set their info
        if (isTecnico && !isEdit) {
            const tech = technicians.find(t => t.id === this.currentSolicitation.tecnicoId);
            if (tech) {
                this.currentSolicitation.tecnicoNome = tech.nome;
            }
        }
        
        const content = `
            <div class="modal-header">
                <h3>${isEdit ? 'Editar Solicitação #' + sol.numero : 'Nova Solicitação'}</h3>
                <button class="modal-close" onclick="Utils.closeModal()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <form id="sol-form">
                    <div class="form-row">
                        ${!isTecnico ? `
                            <div class="form-group">
                                <label for="sol-tecnico">Técnico *</label>
                                <select id="sol-tecnico" class="form-control" required onchange="Solicitacoes.updateTecnicoName()">
                                    <option value="">Selecione...</option>
                                    ${technicians.filter(t => t.ativo !== false).map(t => 
        `<option value="${t.id}" ${this.currentSolicitation.tecnicoId === t.id ? 'selected' : ''}>
                                            ${Utils.escapeHtml(t.nome)}
                                        </option>`
    ).join('')}
                                </select>
                            </div>
                        ` : `
                            <input type="hidden" id="sol-tecnico" value="${this.currentSolicitation.tecnicoId}">
                            <div class="form-group">
                                <label>Técnico</label>
                                <p><strong>${Utils.escapeHtml(this.currentSolicitation.tecnicoNome || Auth.getCurrentUser()?.name || 'Não identificado')}</strong></p>
                            </div>
                        `}
                        <div class="form-group">
                            <label for="sol-data">Data *</label>
                            <input type="date" id="sol-data" class="form-control" 
                                   value="${this.currentSolicitation.data}" required>
                        </div>
                        <div class="form-group">
                            <label for="sol-cliente">Cliente</label>
                            <input type="text" id="sol-cliente" class="form-control"
                                   value="${Utils.escapeHtml(this.currentSolicitation.cliente || '')}"
                                   placeholder="Cliente / unidade">
                        </div>
                        <div class="form-group">
                            <label for="sol-fornecedor-sel">Fornecedor *</label>
                            ${isEdit && this.currentSolicitation.fornecedorId ? `
                                <p><strong>${this.currentSolicitation.fornecedorId === 'sup-hobart' ? 'Hobart' : 'EBST'}</strong></p>
                                <input type="hidden" id="sol-fornecedor" value="${this.currentSolicitation.fornecedorId}">
                            ` : `
                                <select id="sol-fornecedor-sel" class="form-control"
                                        onchange="Solicitacoes.selectFornecedor(this.value)" required>
                                    <option value="">Selecione...</option>
                                    <option value="sup-ebst"   ${this.currentSolicitation.fornecedorId === 'sup-ebst'   ? 'selected' : ''}>EBST</option>
                                    <option value="sup-hobart" ${this.currentSolicitation.fornecedorId === 'sup-hobart' ? 'selected' : ''}>Hobart</option>
                                </select>
                                <input type="hidden" id="sol-fornecedor" value="${this.currentSolicitation.fornecedorId || ''}">
                                <small style="display:flex;align-items:center;gap:5px;margin-top:5px;color:#6b7280;font-size:0.75rem">
                                    <i class="fas fa-info-circle" style="color:#3b82f6;flex-shrink:0"></i>
                                    Peças de fornecedores diferentes requerem solicitações separadas.
                                </small>
                            `}
                        </div>
                    </div>

                    <!-- Parts Selection with Auto-complete -->
                    <div class="form-group" id="parts-section">
                        <label>Adicionar Peça</label>
                        <div id="parts-autocomplete"></div>
                    </div>

                    <!-- Items List -->
                    <div class="form-group">
                        <label>Itens da Solicitação</label>
                        <div id="items-list" class="items-list">
                            ${this.renderItemsList()}
                        </div>
                    </div>
                    
                    <!-- Totals -->
                    <div class="form-row">
                        <div class="form-group">
                            <label for="sol-desconto">Desconto (R$)</label>
                            <input type="number" id="sol-desconto" class="form-control" 
                                   step="0.01" min="0" value="${this.currentSolicitation.desconto}"
                                   onchange="Solicitacoes.recalculateTotals()">
                        </div>
                        <div class="form-group">
                            <label for="sol-frete">Frete (R$)</label>
                            <input type="number" id="sol-frete" class="form-control" 
                                   step="0.01" min="0" value="${this.currentSolicitation.frete}"
                                   onchange="Solicitacoes.recalculateTotals()">
                        </div>
                    </div>
                    
                    <div id="totals-display" class="totals-section">
                        ${this.renderTotalsDisplay()}
                    </div>
                    
                    <div class="form-group">
                        <label for="sol-observacoes">Observações</label>
                        <textarea id="sol-observacoes" class="form-control" rows="3"
                                  placeholder="Observações adicionais...">${Utils.escapeHtml(this.currentSolicitation.observacoes || '')}</textarea>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button class="btn btn-outline" onclick="Utils.closeModal()">Cancelar</button>
                <button class="btn btn-primary" onclick="Solicitacoes.saveSolicitation('pendente')">
                    <i class="fas fa-paper-plane"></i> Enviar para Aprovação
                </button>
            </div>
        `;
        
        Utils.showModal(content, { size: 'lg' });
        
        // Initialize auto-complete only if supplier already selected (edit mode)
        setTimeout(() => {
            if (this.currentSolicitation.fornecedorId) {
                this._initAutocomplete(this.currentSolicitation.fornecedorId);
            }
        }, 100);
    },

    /**
     * Init / reinit autocomplete filtered by supplier
     */
    _initAutocomplete(fornecedorId) {
        const pecasModule = typeof window !== 'undefined' ? window.Pecas : null;
        if (!pecasModule || typeof pecasModule.createAutocomplete !== 'function') {
            Utils.showToast('Catálogo de peças ainda está carregando. Tente novamente em instantes.', 'warning');
            return;
        }
        this.autocompleteInstance = pecasModule.createAutocomplete('parts-autocomplete', {
            tecnicoId: this.currentSolicitation.tecnicoId,
            fornecedorId,
            onSelect: (part) => this.addItem(part)
        });
    },

    /**
     * Called when the Fornecedor <select> changes.
     * Filters the parts autocomplete and unlocks the parts section.
     */
    selectFornecedor(fornecedorId) {
        if (!fornecedorId) {
            return;
        }

        const hasItems = this.currentSolicitation.itens && this.currentSolicitation.itens.length > 0;
        const prev = this.currentSolicitation.fornecedorId;

        // Warn if switching supplier with existing items
        if (hasItems && prev && prev !== fornecedorId) {
            if (!confirm('Trocar o fornecedor removerá todos os itens já adicionados.\n\nLembre-se: cada solicitação deve conter peças de um único fornecedor. Para solicitar peças da EBST e da Hobart, abra duas solicitações separadas.\n\nDeseja continuar e limpar os itens?')) {
                // Revert the select back to previous value
                const sel = document.getElementById('sol-fornecedor-sel');
                if (sel) {
                    sel.value = prev;
                }
                return;
            }
            this.currentSolicitation.itens = [];
            this.currentSolicitation.subtotal = 0;
            this.currentSolicitation.desconto = 0;
            this.currentSolicitation.frete = 0;
            this.currentSolicitation.total = 0;
            this.refreshItemsList();
            this.recalculateTotals();
        }

        this.currentSolicitation.fornecedorId = fornecedorId;

        // Keep hidden input in sync
        const hidden = document.getElementById('sol-fornecedor');
        if (hidden) {
            hidden.value = fornecedorId;
        }

        // Reinit autocomplete filtered to the chosen supplier
        this._initAutocomplete(fornecedorId);
    },

    /**
     * Update technician name when selection changes
     */
    updateTecnicoName() {
        const select = document.getElementById('sol-tecnico');
        const option = select.options[select.selectedIndex];
        if (option && option.value) {
            this.currentSolicitation.tecnicoId = option.value;
            this.currentSolicitation.tecnicoNome = option.text;
        }
    },

    /**
     * Add item to solicitation
     */
    addItem(part) {
        // Check if already exists
        const existing = this.currentSolicitation.itens.find(i => i.codigo === part.codigo);
        
        if (existing) {
            existing.quantidade++;
        } else {
            this.currentSolicitation.itens.unshift({
                codigo: part.codigo,
                descricao: part.descricao,
                quantidade: 1,
                valorUnit: part.valor
            });
        }
        
        this.refreshItemsList();
        this.recalculateTotals();
        
        // Clear and focus autocomplete
        if (this.autocompleteInstance) {
            this.autocompleteInstance.clear();
            this.autocompleteInstance.focus();
        }
    },

    /**
     * Update item quantity
     */
    updateItemQuantity(index, qty) {
        const quantity = parseInt(qty);
        if (quantity > 0) {
            this.currentSolicitation.itens[index].quantidade = quantity;
        } else {
            this.currentSolicitation.itens.splice(index, 1);
        }
        this.refreshItemsList();
        this.recalculateTotals();
    },

    /**
     * Remove item
     */
    removeItem(index) {
        this.currentSolicitation.itens.splice(index, 1);
        this.refreshItemsList();
        this.recalculateTotals();
    },

    /**
     * Render items list
     */
    renderItemsList() {
        if (this.currentSolicitation.itens.length === 0) {
            return '<p class="text-muted">Nenhum item adicionado. Use o campo acima para buscar e adicionar peças.</p>';
        }
        
        return this.currentSolicitation.itens.map((item, idx) => `
            <div class="item-row">
                <span class="item-code">${Utils.escapeHtml(item.codigo)}</span>
                <span class="item-desc">${Utils.escapeHtml(item.descricao)}</span>
                <input type="number" class="form-control item-qty" value="${item.quantidade}" 
                       min="1" onchange="Solicitacoes.updateItemQuantity(${idx}, this.value)">
                <span class="item-price">${Utils.formatCurrency(item.valorUnit)}</span>
                <span class="item-total">${Utils.formatCurrency(item.quantidade * item.valorUnit)}</span>
                <button class="btn-icon" onclick="Solicitacoes.removeItem(${idx})" title="Remover">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `).join('');
    },

    /**
     * Refresh items list display
     */
    refreshItemsList() {
        const container = document.getElementById('items-list');
        if (container) {
            container.innerHTML = this.renderItemsList();
        }
    },

    /**
     * Recalculate totals
     */
    recalculateTotals() {
        const desconto = parseFloat(document.getElementById('sol-desconto')?.value) || 0;
        const frete = parseFloat(document.getElementById('sol-frete')?.value) || 0;
        
        const subtotal = this.currentSolicitation.itens.reduce((sum, item) => 
            sum + (item.quantidade * item.valorUnit), 0);
        
        this.currentSolicitation.subtotal = parseFloat(subtotal.toFixed(2));
        this.currentSolicitation.desconto = desconto;
        this.currentSolicitation.frete = frete;
        this.currentSolicitation.total = parseFloat((subtotal - desconto + frete).toFixed(2));
        
        const display = document.getElementById('totals-display');
        if (display) {
            display.innerHTML = this.renderTotalsDisplay();
        }
    },

    /**
     * Render totals display
     */
    renderTotalsDisplay() {
        return `
            <div class="total-row">
                <span>Subtotal:</span>
                <span>${Utils.formatCurrency(this.currentSolicitation.subtotal)}</span>
            </div>
            <div class="total-row">
                <span>Desconto:</span>
                <span>- ${Utils.formatCurrency(this.currentSolicitation.desconto)}</span>
            </div>
            <div class="total-row">
                <span>Frete:</span>
                <span>+ ${Utils.formatCurrency(this.currentSolicitation.frete)}</span>
            </div>
            <div class="total-row grand-total">
                <span>Total:</span>
                <span>${Utils.formatCurrency(this.currentSolicitation.total)}</span>
            </div>
        `;
    },

    /**
     * Save solicitation
     */
    async saveSolicitation(status = 'pendente') {
        if (this.isSaveSubmitting) {
            return;
        }

        const tecnicoId = document.getElementById('sol-tecnico').value;
        const dataInput = document.getElementById('sol-data').value;
        const observacoes = (document.getElementById('sol-observacoes').value || '').trim();
        const cliente = (document.getElementById('sol-cliente')?.value || '').trim();
        const fornecedorId = document.getElementById('sol-fornecedor')?.value || this.currentSolicitation.fornecedorId || '';

        if (!tecnicoId) {
            Utils.showToast('Selecione um técnico', 'warning');
            return;
        }

        if (!fornecedorId) {
            Utils.showToast('Selecione o fornecedor antes de continuar. Caso precise solicitar peças de ambos os fornecedores, abra uma solicitação para cada um.', 'warning');
            return;
        }

        const parsedDate = Utils.parseAsLocalDate(dataInput);
        if (!dataInput || isNaN(parsedDate.getTime())) {
            Utils.showToast('Informe a data', 'warning');
            return;
        }
        const normalizedDate = Utils.getLocalDateString(parsedDate);

        if (this.currentSolicitation.itens.length === 0) {
            Utils.showToast('Adicione pelo menos um item antes de salvar', 'warning');
            return;
        }

        let invalidItem = false;
        const validatedItems = [];
        for (const item of this.currentSolicitation.itens) {
            const qty = parseFloat(item?.quantidade);
            const unit = parseFloat(item?.valorUnit);
            if (!Number.isFinite(qty) || qty <= 0 || !Number.isFinite(unit) || unit <= 0) {
                invalidItem = true;
                break;
            }
            validatedItems.push({ qty, unit });
        }
        if (invalidItem) {
            Utils.showToast('Itens precisam de quantidade (>0) e valor válido', 'warning');
            return;
        }

        const subtotal = validatedItems.reduce((sum, { qty, unit }) => sum + (qty * unit), 0);
        const desconto = parseFloat(this.currentSolicitation.desconto);
        const frete = parseFloat(this.currentSolicitation.frete);
        if (!Number.isFinite(desconto) || !Number.isFinite(frete)) {
            Utils.showToast('Valores de desconto e frete precisam ser numéricos', 'warning');
            return;
        }
        if (desconto < 0 || frete < 0) {
            Utils.showToast('Desconto e frete não podem ser negativos', 'warning');
            return;
        }

        const total = parseFloat((subtotal - desconto + frete).toFixed(2));
        this.currentSolicitation.subtotal = parseFloat(subtotal.toFixed(2));
        this.currentSolicitation.total = total;

        const tech = DataManager.getTechnicianById(tecnicoId);
        const currentUser = Auth.getCurrentUser();
        const userName = currentUser?.name || 'Sistema';
        const isNewSolicitation = !this.currentSolicitation?.id;
        const shouldSendManagerEmail = (
            status === 'pendente' &&
            Auth.getRole() === 'tecnico' &&
            (isNewSolicitation || this.currentSolicitation?.status !== 'pendente')
        );

        const solicitation = {
            ...this.currentSolicitation,
            tecnicoId,
            tecnicoNome: tech?.nome || this.currentSolicitation.tecnicoNome,
            tecnicoEmail: tech?.email || this.currentSolicitation.tecnicoEmail || currentUser?.email || '',
            data: normalizedDate,
            cliente,
            observacoes,
            status,
            fornecedorId: fornecedorId || this.currentSolicitation.fornecedorId || '',
            createdBy: this.currentSolicitation?.createdBy || userName,
            updatedBy: userName
        };

        if (Auth.getRole() === 'tecnico') {
            solicitation.requesterUserId = currentUser?.id || this.currentSolicitation?.requesterUserId || null;
            solicitation.requesterUsername = currentUser?.username || this.currentSolicitation?.requesterUsername || null;
            solicitation.requesterName = currentUser?.name || tech?.nome || this.currentSolicitation?.requesterName || null;
            solicitation.requesterEmail = currentUser?.email || tech?.email || this.currentSolicitation?.requesterEmail || '';
            solicitation.requesterRole = currentUser?.role || 'tecnico';
            solicitation.requesterTecnicoId = currentUser?.tecnicoId || tecnicoId;
        }

        if (!solicitation.statusHistory) {
            solicitation.statusHistory = [];
        }

        if (status !== this.currentSolicitation.status) {
            solicitation.statusHistory.push({
                status,
                at: Date.now(),
                by: userName
            });
        }

        this.isSaveSubmitting = true;
        try {
            const result = await DataManager.saveSolicitation(solicitation);
            const saved = result === true || (result && result.success !== false && !result.error);

            if (!saved) {
                const errorMsg = (result && result.error === 'conflict')
                    ? 'Conflito de versão. Recarregue a página e tente novamente.'
                    : (result?.message || result?.error || 'Erro ao salvar solicitação');
                Utils.showToast(errorMsg, 'error');
                return;
            }

            const persistedSolicitation = result?.solicitation || this.resolvePersistedSolicitation(solicitation) || solicitation;
            Utils.showToast('Solicitação enviada para aprovação', 'success');

            Utils.closeModal();

            if (document.getElementById('sol-table-container')) {
                this.refreshTable();
            }

            Auth.renderMenu(App.currentPage);

            if (shouldSendManagerEmail && typeof Utils.sendSolicitationApprovalEmail === 'function') {
                try {
                    const notification = await Utils.sendSolicitationApprovalEmail({
                        solicitation: persistedSolicitation,
                        submittedBy: userName
                    });
                    const managerSentCount = Number(notification?.sentCount) || 0;
                    const managerFailedCount = Number(notification?.failedCount) || 0;
                    const managerTotalRecipients = Number(notification?.totalRecipients) || 0;
                    if (notification?.success) {
                        Utils.showToast(`${managerSentCount} gestor(es) notificado(s) para análise da solicitação.`, 'info');
                    } else if (notification?.reason === 'manager_not_configured' || managerTotalRecipients === 0) {
                        Utils.showToast('Solicitação enviada, mas não há gestor válido configurado para receber a análise.', 'warning');
                    } else {
                        Utils.showToast('Solicitação enviada, mas a notificação automática ao gestor falhou. Verifique o log.', 'warning');
                    }
                    if (managerFailedCount > 0) {
                        Utils.showToast(`${managerFailedCount} envio(s) para o gestor falharam. Verifique o log.`, 'warning');
                    }
                } catch (_error) {
                    Utils.showToast('Solicitação enviada, mas a notificação automática ao gestor não foi disparada.', 'warning');
                }
            }
        } finally {
            this.isSaveSubmitting = false;
        }
    },

    resolvePersistedSolicitation(snapshot) {
        if (!snapshot || typeof DataManager === 'undefined') {
            return null;
        }

        if (snapshot.id) {
            const byId = DataManager.getSolicitationById(snapshot.id);
            if (byId) {
                return byId;
            }
        }

        const targetTotal = Number(snapshot.total) || 0;
        const matches = DataManager.getSolicitations().filter((sol) => {
            if (!sol) {
                return false;
            }
            if (sol.tecnicoId !== snapshot.tecnicoId) {
                return false;
            }
            if ((sol.data || '') !== (snapshot.data || '')) {
                return false;
            }
            if ((sol.status || '') !== (snapshot.status || '')) {
                return false;
            }
            const currentTotal = Number(sol.total) || 0;
            return Math.abs(currentTotal - targetTotal) < 0.01;
        });

        if (!matches.length) {
            return null;
        }

        return matches.sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0))[0];
    },
    /**
     * Duplicate solicitation
     */
    duplicate(id) {
        const sol = DataManager.getSolicitationById(id);
        if (!sol) {
            return;
        }
        
        const currentUser = Auth.getCurrentUser();
        
        // Create a copy without ID and with reset status
        this.currentSolicitation = {
            id: null,
            tecnicoId: Auth.getRole() === 'tecnico' ? Auth.getTecnicoId() : sol.tecnicoId,
            tecnicoNome: Auth.getRole() === 'tecnico' ? (currentUser?.name || 'Não identificado') : sol.tecnicoNome,
            data: Utils.getLocalDateString(),
            cliente: sol.cliente || '',
            observacoes: sol.observacoes,
            itens: sol.itens.map(item => ({ ...item })),
            subtotal: sol.subtotal,
            desconto: sol.desconto,
            frete: sol.frete,
            total: sol.total,
            status: 'pendente'
        };
        
        // Open the form with duplicated data
        this.openForm();
        
        Utils.showToast('Solicitação duplicada. Faça as alterações necessárias.', 'info');
    },

    downloadBackup() {
        const result = DataManager.createSolicitationsBackup({ download: true, reason: 'manual-ui' });
        if (result?.success) {
            Utils.showToast(`Backup gerado com ${result.count} solicitações`, 'success');
        } else {
            Utils.showToast('Não foi possível gerar o backup', 'error');
        }
    },

    triggerRestoreBackup() {
        const input = document.getElementById('sol-backup-file');
        if (input) {
            input.value = '';
            input.click();
        }
    },

    handleRestoreBackup(event) {
        const file = event?.target?.files?.[0];
        if (!file) {
            return;
        }

        const reader = new FileReader();
        reader.onload = async () => {
            try {
                const payload = JSON.parse(reader.result);
                const confirmed = await Utils.confirm(
                    'Deseja restaurar este backup e mesclar as solicitações ao histórico atual?',
                    'Restaurar Backup'
                );

                if (!confirmed) {
                    return;
                }

                const result = await DataManager.restoreSolicitationsBackup(payload);
                if (result?.success) {
                    Utils.showToast(`${result.restoredCount} solicitações restauradas`, 'success');
                    this.currentPage = 1;
                    this.render();
                } else {
                    Utils.showToast(result?.message || 'Não foi possível restaurar o backup', 'error');
                }
            } catch (_error) {
                Utils.showToast('Arquivo de backup inválido', 'error');
            }
        };
        reader.readAsText(file);
    },

    /**
     * Download PDF
     */    downloadPDF(id) {
        const sol = DataManager.getSolicitationById(id);
        if (!sol) {
            Utils.showToast('Solicitação não encontrada', 'error');
            return;
        }
        
        Utils.generatePDF(sol);
        Utils.showToast('PDF gerado com sucesso', 'success');
    },

    /**
     * Confirm delete
     */
    async confirmDelete(id) {
        if (this.isDeleteSubmitting) {
            return;
        }

        const sol = DataManager.getSolicitationById(id);
        if (!sol) {
            return;
        }
        
        const confirmed = await Utils.confirm(
            `Deseja realmente excluir a solicitação #${sol.numero}?`,
            'Excluir Solicitação'
        );
        
        if (confirmed) {
            this.isDeleteSubmitting = true;
            try {
                const result = await DataManager.deleteSolicitation(id);
                const success = result === true || (result && result.success !== false && !result.error);
                if (!success) {
                    Utils.showToast(result?.message || result?.error || 'Não foi possível excluir a solicitação', 'error');
                    return;
                }
                Utils.showToast('Solicitação excluída com sucesso', 'success');
                this.refreshTable();
                Auth.renderMenu(App.currentPage);
            } finally {
                this.isDeleteSubmitting = false;
            }
        }
    },

    /**
     * Export list
     */
    exportList() {
        if (!window.XLSX) {
            Utils.showToast('Exportação indisponível: biblioteca XLSX não carregada', 'warning');
            return;
        }
        const solicitations = this.getFilteredSolicitations();

        if (solicitations.length === 0) {
            Utils.showToast('Não há dados para exportar', 'warning');
            return;
        }

        const data = solicitations.map(sol => ({
            Numero: sol.numero,
            Tecnico: sol.tecnicoNome,
            Cliente: sol.cliente || 'Nao informado',
            Peca: this.getPieceSummary(sol.itens || []).full,
            Data: Utils.formatDate(sol.data),
            QtdItens: (sol.itens || []).length,
            Subtotal: sol.subtotal,
            Desconto: sol.desconto,
            Frete: sol.frete,
            Total: sol.total,
            Rastreio: sol.trackingCode || '',
            Status: Utils.getStatusInfo(sol.status).label,
            Observacoes: sol.observacoes || ''
        }));

        Utils.exportToExcel(data, 'solicitacoes.xlsx', 'Solicitações');
        Utils.showToast('Lista exportada com sucesso', 'success');
    }
};

if (typeof window !== 'undefined') {
    window.Solicitacoes = Solicitacoes;
}














































