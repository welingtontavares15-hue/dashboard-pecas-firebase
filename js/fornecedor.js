/**
 * Portal do Fornecedor
 * Exibe somente solicitações aprovadas e em trânsito para o fornecedor logado.
 */

const FORNECEDOR_VISIBLE_STATUSES = ['aprovada', 'em-transito'];
const FORNECEDOR_TRACKING_MIN_LENGTH = 4;
const FORNECEDOR_TRACKING_REGEX = /^[A-Za-z0-9._\-/]+$/;

const FornecedorPortal = {
    currentPage: 1,
    itemsPerPage: 10,
    activeDetailId: null,
    pendingTrackingUpdates: {},
    filters: {
        search: '',
        status: '',
        dateFrom: '',
        dateTo: ''
    },
    _filtersInitialized: false,

    getDefaultFilters() {
        return {
            search: '',
            status: '',
            dateFrom: '',
            dateTo: '',
            useDefaultPeriod: false
        };
    },

    ensureFilters() {
        if (this._filtersInitialized) {
            return;
        }

        const defaults = this.getDefaultFilters();
        const restored = AnalyticsHelper.restoreModuleFilterState('fornecedor-portal', {
            defaults,
            useDefaultPeriod: false
        });
        this.filters = {
            ...defaults,
            ...restored,
            status: restored.status || (Array.isArray(restored.statuses) ? restored.statuses[0] || '' : '')
        };
        this._filtersInitialized = true;
    },

    persistFilters() {
        const persisted = AnalyticsHelper.persistModuleFilterState('fornecedor-portal', {
            ...this.filters,
            status: this.filters.status
        }, {
            defaults: this.getDefaultFilters(),
            useDefaultPeriod: false
        });
        this.filters = {
            ...this.filters,
            ...persisted,
            status: persisted.status || (Array.isArray(persisted.statuses) ? persisted.statuses[0] || '' : '')
        };
        return persisted;
    },

    render() {
        this.ensureFilters();
        const content = document.getElementById('content-area');
        if (!content) {
            return;
        }

        if (Auth.getRole() !== 'fornecedor') {
            content.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-lock"></i>
                    <h4>Acesso restrito</h4>
                    <p>Este módulo é exclusivo para usuários com perfil de fornecedor.</p>
                </div>
            `;
            return;
        }

        content.innerHTML = `
            <div class="page-header supplier-header">
                <div>
                    <h2><i class="fas fa-truck"></i> Operação do Fornecedor</h2>
                    <p class="text-muted">Pedidos aprovados para envio, registro de rastreio e geração de PDF operacional.</p>
                </div>
            </div>
            <div class="filter-context-summary" id="supplier-filter-context">
                <span class="helper-text">${this.getResultsSummary()}</span>
                ${this.renderActiveFilterChips()}
            </div>

            <div class="card supplier-flow-card">
                <div class="card-body">
                    <h4 class="mb-2">Fluxo oficial do pedido</h4>
                    <div class="supplier-flow-track">
                        <div class="supplier-flow-stage done"><span>1</span><small>Técnico cria</small></div>
                        <div class="supplier-flow-stage done"><span>2</span><small>Gestor aprova</small></div>
                        <div class="supplier-flow-stage active"><span>3</span><small>Fornecedor envia</small></div>
                        <div class="supplier-flow-stage"><span>4</span><small>Técnico confirma</small></div>
                        <div class="supplier-flow-stage"><span>5</span><small>Finalizada</small></div>
                    </div>
                </div>
            </div>

            <details class="filter-panel compact" id="supplier-filter-panel" ${this.hasActiveFilters() ? 'open' : ''}>
                <summary class="filter-panel-toggle" id="supplier-filter-panel-toggle">${this.hasActiveFilters() ? 'Filtros ativos' : 'Filtros'}</summary>
                <div class="filters-bar supplier-filters-bar filter-panel-body">
                <div class="search-box">
                    <input type="text" id="supplier-portal-search" class="form-control"
                           placeholder="Buscar por número, cliente, técnico, peça ou rastreio..."
                           value="${Utils.escapeHtml(this.filters.search)}">
                </div>
                <div class="filter-group">
                    <label for="supplier-portal-status">Status:</label>
                    <select id="supplier-portal-status" class="form-control">
                        <option value="">Todos</option>
                        <option value="aprovada" ${this.filters.status === 'aprovada' ? 'selected' : ''}>Aprovado / aguardando envio</option>
                        <option value="em-transito" ${this.filters.status === 'em-transito' ? 'selected' : ''}>Em trânsito</option>
                    </select>
                </div>
                <div class="filter-group">
                    <label for="supplier-portal-date-from">De:</label>
                    <input type="date" id="supplier-portal-date-from" class="form-control" value="${this.filters.dateFrom}">
                </div>
                <div class="filter-group">
                    <label for="supplier-portal-date-to">Até:</label>
                    <input type="date" id="supplier-portal-date-to" class="form-control" value="${this.filters.dateTo}">
                </div>
                <button class="btn btn-outline" onclick="FornecedorPortal.clearFilters()">
                    <i class="fas fa-times"></i> Limpar
                </button>
                </div>
            </details>

            <div id="supplier-portal-summary">
                ${this.renderSummaryCards()}
            </div>

            <div class="card">
                <div class="card-body">
                    <div id="supplier-portal-table-container">
                        ${this.renderTable()}
                    </div>
                </div>
            </div>
        `;

        this.bindFilters();
    },

    bindFilters() {
        const search = document.getElementById('supplier-portal-search');
        const status = document.getElementById('supplier-portal-status');
        const dateFrom = document.getElementById('supplier-portal-date-from');
        const dateTo = document.getElementById('supplier-portal-date-to');

        if (search) {
            search.addEventListener('input', Utils.debounce(() => {
                this.applyFilters();
            }, 250));
        }

        if (status) {
            status.addEventListener('change', () => this.applyFilters());
        }

        [dateFrom, dateTo].forEach((element) => {
            if (element) {
                element.addEventListener('change', () => this.applyFilters());
            }
        });
    },

    normalizeEmail(value) {
        if (typeof DataManager.normalizeEmail === 'function') {
            return DataManager.normalizeEmail(value);
        }
        return String(value || '').trim().toLowerCase();
    },

    normalizeStatus(status) {
        if (typeof DataManager.normalizeWorkflowStatus === 'function') {
            return DataManager.normalizeWorkflowStatus(status);
        }
        return String(status || '').trim();
    },

    normalizeTrackingCode(value) {
        return String(value || '').trim().toUpperCase();
    },

    getSupplierScope() {
        const currentUser = Auth.getCurrentUser() || {};
        return {
            fornecedorId: Auth.getFornecedorId(),
            email: this.normalizeEmail(currentUser.email)
        };
    },

    belongsToCurrentSupplier(sol, scope = this.getSupplierScope()) {
        if (!sol || !sol.fornecedorId) {
            return false;
        }

        if (scope.fornecedorId) {
            return sol.fornecedorId === scope.fornecedorId;
        }

        if (!scope.email) {
            return false;
        }

        const supplier = DataManager.getSupplierById(sol.fornecedorId);
        if (typeof Utils.supplierHasOperationalEmail === 'function') {
            return Utils.supplierHasOperationalEmail(supplier, scope.email);
        }
        if (typeof Utils.extractOperationalEmailRecipients === 'function') {
            return Utils.extractOperationalEmailRecipients(
                supplier?.email || '',
                supplier?.emails || [],
                supplier?.notificationEmails || []
            ).includes(scope.email);
        }
        return this.normalizeEmail(supplier?.email) === scope.email;
    },

    getFilteredSolicitations() {
        const scope = this.getSupplierScope();
        return AnalyticsHelper.filterSolicitations(DataManager.getSolicitations().slice(), {
            moduleKey: 'fornecedor-portal',
            search: this.filters.search,
            status: this.filters.status,
            fornecedor: scope.fornecedorId || scope.email || '',
            period: {
                dateFrom: this.filters.dateFrom,
                dateTo: this.filters.dateTo
            },
            useDefaultPeriod: false,
            recordPredicate: (sol) => {
                const status = this.normalizeStatus(sol.status);
                return FORNECEDOR_VISIBLE_STATUSES.includes(status) && this.belongsToCurrentSupplier(sol, scope);
            }
        }).sort((a, b) => {
            const aDate = a.trackingUpdatedAt || a.approvedAt || a._analysisDate?.getTime() || a.createdAt || 0;
            const bDate = b.trackingUpdatedAt || b.approvedAt || b._analysisDate?.getTime() || b.createdAt || 0;
            return bDate - aDate;
        });
    },

    getResultsSummary() {
        const solicitations = this.getFilteredSolicitations();
        return `Base atual: ${Utils.formatNumber(solicitations.length)} pedidos filtrados do fornecedor.`;
    },

    renderActiveFilterChips() {
        const chips = AnalyticsHelper.buildFilterChips(this.filters, {
            moduleKey: 'fornecedor-portal',
            useDefaultPeriod: false
        });

        if (!chips.length) {
            return '';
        }

        return `
            <div class="filter-chip-bar">
                ${chips.map((chip) => `
                    <button type="button" class="filter-chip" onclick="FornecedorPortal.removeFilterChip('${chip.key}')">
                        <span>${Utils.escapeHtml(chip.label)}: ${Utils.escapeHtml(chip.displayValue || chip.value || '')}</span>
                        <i class="fas fa-times"></i>
                    </button>
                `).join('')}
            </div>
        `;
    },

    removeFilterChip(key) {
        if (key === 'period') {
            this.filters.dateFrom = '';
            this.filters.dateTo = '';
        } else if (Object.prototype.hasOwnProperty.call(this.filters, key)) {
            this.filters[key] = '';
        }

        this.currentPage = 1;
        this.persistFilters();
        this.render();
    },

    hasActiveFilters() {
        const defaults = this.getDefaultFilters();
        return Object.keys(defaults).some((key) => {
            if (key === 'useDefaultPeriod') {
                return false;
            }
            return (this.filters[key] || '') !== (defaults[key] || '');
        });
    },
    getTechnicianName(sol) {
        if (sol?.tecnicoNome) {
            return sol.tecnicoNome;
        }
        if (sol?.tecnicoId) {
            return DataManager.getTechnicianById(sol.tecnicoId)?.nome || 'Não identificado';
        }
        return 'Não identificado';
    },

    getSupplierName(sol) {
        if (!sol?.fornecedorId) {
            return 'Não definido';
        }
        return DataManager.getSupplierById(sol.fornecedorId)?.nome || 'Não definido';
    },

    hasTotal(sol) {
        return sol && sol.total !== null && sol.total !== undefined && !Number.isNaN(Number(sol.total));
    },

    countItemsQuantity(items = []) {
        return (items || []).reduce((sum, item) => sum + (Number(item.quantidade) || 0), 0);
    },

    getShippingSituation(sol) {
        const status = this.normalizeStatus(sol?.status);
        if (status === 'aprovada') {
            return 'Aguardando envio do fornecedor';
        }
        if (status === 'em-transito') {
            return sol?.trackingCode
                ? 'Pedido em trânsito com rastreio informado'
                : 'Pedido em trânsito sem rastreio válido';
        }
        return 'Fluxo concluído';
    },

    canEditTracking(sol, scope = this.getSupplierScope()) {
        if (!this.belongsToCurrentSupplier(sol, scope)) {
            return false;
        }
        const status = this.normalizeStatus(sol.status);
        return status === 'aprovada' || status === 'em-transito';
    },

    isTrackingCodeValid(code) {
        const normalized = this.normalizeTrackingCode(code);
        if (normalized.length < FORNECEDOR_TRACKING_MIN_LENGTH) {
            return false;
        }
        return FORNECEDOR_TRACKING_REGEX.test(normalized);
    },

    getTrackingValidationMessage() {
        return `Informe ao menos ${FORNECEDOR_TRACKING_MIN_LENGTH} caracteres (letras, números, ., _, - ou /).`;
    },

    renderPartsSummary(items = []) {
        if (!Array.isArray(items) || items.length === 0) {
            return '<span class="text-muted">Sem itens aprovados</span>';
        }

        const quantity = this.countItemsQuantity(items);
        const preview = items
            .slice(0, 2)
            .map(item => `${Utils.escapeHtml(item.codigo || '-')}: ${Utils.formatNumber(Number(item.quantidade) || 0)}`)
            .join(' • ');

        const suffix = items.length > 2 ? ' • ...' : '';
        return `
            <div class="supplier-parts-summary">
                <strong>${Utils.formatNumber(items.length)} item(ns) | ${Utils.formatNumber(quantity)} peça(s)</strong>
                <small>${preview}${suffix}</small>
            </div>
        `;
    },

    getSummaryCounters(solicitations) {
        return solicitations.reduce((acc, sol) => {
            const status = this.normalizeStatus(sol.status);
            if (status === 'aprovada') {
                acc.awaitingDispatch += 1;
            }
            if (status === 'em-transito') {
                acc.inTransit += 1;
            }
            if (sol.trackingCode) {
                acc.withTracking += 1;
            } else {
                acc.withoutTracking += 1;
            }
            return acc;
        }, {
            awaitingDispatch: 0,
            inTransit: 0,
            withTracking: 0,
            withoutTracking: 0
        });
    },

    renderSummaryCards() {
        const solicitations = this.getFilteredSolicitations();
        const counters = this.getSummaryCounters(solicitations);

        return `
            <div class="kpi-grid supplier-summary-grid">
                <div class="kpi-card supplier-summary-card">
                    <div class="kpi-icon warning"><i class="fas fa-hourglass-half"></i></div>
                    <div class="kpi-content">
                        <h4>Aguardando envio</h4>
                        <div class="kpi-value">${Utils.formatNumber(counters.awaitingDispatch)}</div>
                        <div class="kpi-change">Pedidos aprovados sem despacho</div>
                    </div>
                </div>
                <div class="kpi-card supplier-summary-card">
                    <div class="kpi-icon info"><i class="fas fa-truck"></i></div>
                    <div class="kpi-content">
                        <h4>Em trânsito</h4>
                        <div class="kpi-value">${Utils.formatNumber(counters.inTransit)}</div>
                        <div class="kpi-change">Pedidos com envio em andamento</div>
                    </div>
                </div>
                <div class="kpi-card supplier-summary-card">
                    <div class="kpi-icon success"><i class="fas fa-barcode"></i></div>
                    <div class="kpi-content">
                        <h4>Com rastreio</h4>
                        <div class="kpi-value">${Utils.formatNumber(counters.withTracking)}</div>
                        <div class="kpi-change">Pedidos com código válido</div>
                    </div>
                </div>
                <div class="kpi-card supplier-summary-card">
                    <div class="kpi-icon primary"><i class="fas fa-list-check"></i></div>
                    <div class="kpi-content">
                        <h4>No portal</h4>
                        <div class="kpi-value">${Utils.formatNumber(solicitations.length)}</div>
                        <div class="kpi-change">Total de pedidos visíveis</div>
                    </div>
                </div>
            </div>
        `;
    },

    renderTrackingCell(sol, scope = this.getSupplierScope()) {
        const normalizedTracking = this.normalizeTrackingCode(sol.trackingCode || '');
        if (!this.canEditTracking(sol, scope)) {
            return `<span><strong>${normalizedTracking || '-'}</strong></span>`;
        }

        return `
            <div class="supplier-tracking-input">
                <input type="text" class="form-control"
                       data-supplier-tracking="${Utils.escapeHtml(sol.id)}"
                       value="${Utils.escapeHtml(normalizedTracking)}"
                       placeholder="Informar rastreio">
                <button class="btn btn-sm btn-primary" onclick="FornecedorPortal.saveTracking('${sol.id}')">
                    ${normalizedTracking ? 'Atualizar' : 'Salvar'}
                </button>
            </div>
            <small class="supplier-tracking-help">Ao salvar rastreio válido o status muda para <strong>Em trânsito</strong>.</small>
        `;
    },

    renderTable() {
        const solicitations = this.getFilteredSolicitations();

        if (solicitations.length === 0) {
            return `
                <div class="empty-state">
                    <i class="fas fa-box-open"></i>
                    <h4>Sem pedidos no fluxo do fornecedor</h4>
                    <p>${this.hasActiveFilters() ? 'Nenhum pedido atende aos filtros atuais. Revise busca, status ou período.' : 'Este perfil exibe somente solicitações aprovadas e em trânsito vinculadas ao seu fornecedor.'}</p>
                </div>
            `;
        }

        const total = solicitations.length;
        const totalPages = Math.max(Math.ceil(total / this.itemsPerPage), 1);
        this.currentPage = Math.min(this.currentPage, totalPages);

        const start = (this.currentPage - 1) * this.itemsPerPage;
        const paginated = solicitations.slice(start, start + this.itemsPerPage);
        const scope = this.getSupplierScope();

        return `
            <div class="table-info">
                Exibindo ${start + 1}-${Math.min(start + this.itemsPerPage, total)} de ${total} pedidos do fornecedor
            </div>
            <div class="table-container supplier-table-container">
                <table class="table supplier-table">
                    <thead>
                        <tr>
                            <th>Pedido</th>
                            <th>Cliente / Técnico</th>
                            <th>Itens solicitados</th>
                            <th>Valor total</th>
                            <th>Status atual</th>
                            <th>Rastreio</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${paginated.map((sol) => {
        const status = this.normalizeStatus(sol.status);
        return `
                            <tr>
                                <td>
                                    <div class="supplier-order-meta">
                                        <strong>#${Utils.escapeHtml(sol.numero || '-')}</strong>
                                        <small>${Utils.formatDate(sol.data || sol.createdAt)}</small>
                                    </div>
                                </td>
                                <td>
                                    <div class="supplier-order-meta">
                                        <strong>${Utils.escapeHtml(sol.cliente || 'Não informado')}</strong>
                                        <small>Técnico: ${Utils.escapeHtml(this.getTechnicianName(sol))}</small>
                                    </div>
                                </td>
                                <td>${this.renderPartsSummary(sol.itens || [])}</td>
                                <td>${this.hasTotal(sol) || Number.isFinite(Number(sol._analysisCost)) ? Utils.formatCurrency(Number(sol._analysisCost ?? sol.total) || 0) : '-'}</td>
                                <td>
                                    <div class="supplier-status-cell">
                                        ${Utils.renderStatusBadge(status)}
                                        <small>${Utils.escapeHtml(this.getShippingSituation(sol))}</small>
                                    </div>
                                </td>
                                <td>${this.renderTrackingCell(sol, scope)}</td>
                                <td>
                                    <div class="actions supplier-actions">
                                        <button class="btn btn-sm btn-outline" onclick="FornecedorPortal.openHistory('${sol.id}')" title="Visualizar pedido">
                                            <i class="fas fa-eye"></i> Detalhes
                                        </button>
                                        <button class="btn btn-sm btn-outline" onclick="FornecedorPortal.generateSolicitationPdf('${sol.id}')" title="Gerar PDF">
                                            <i class="fas fa-file-pdf"></i> PDF
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        `;
    }).join('')}
                    </tbody>
                </table>
            </div>
            ${Utils.renderPagination(this.currentPage, totalPages, (page) => {
        this.currentPage = page;
        this.refreshTable();
    })}
        `;
    },
    refreshTable() {
        const filterPanel = document.getElementById('supplier-filter-panel');
        const filterToggle = document.getElementById('supplier-filter-panel-toggle');
        if (filterPanel && filterToggle) {
            const hasActive = this.hasActiveFilters();
            filterToggle.textContent = hasActive ? 'Filtros ativos' : 'Filtros';
            filterPanel.open = hasActive;
        }

        const context = document.getElementById('supplier-filter-context');
        if (context) {
            context.innerHTML = `
                <span class="helper-text">${this.getResultsSummary()}</span>
                ${this.renderActiveFilterChips()}
            `;
        }

        const summaryContainer = document.getElementById('supplier-portal-summary');
        if (summaryContainer) {
            summaryContainer.innerHTML = this.renderSummaryCards();
        }

        const tableContainer = document.getElementById('supplier-portal-table-container');
        if (tableContainer) {
            tableContainer.innerHTML = this.renderTable();
        }
    },

    applyFilters() {
        const normalized = AnalyticsHelper.buildFilterState({
            search: document.getElementById('supplier-portal-search')?.value || '',
            status: document.getElementById('supplier-portal-status')?.value || '',
            dateFrom: document.getElementById('supplier-portal-date-from')?.value || '',
            dateTo: document.getElementById('supplier-portal-date-to')?.value || ''
        }, {
            moduleKey: 'fornecedor-portal',
            defaults: this.getDefaultFilters(),
            useDefaultPeriod: false
        });
        this.filters = {
            ...this.filters,
            search: normalized.search,
            status: normalized.status || '',
            dateFrom: normalized.dateFrom,
            dateTo: normalized.dateTo
        };
        this.currentPage = 1;
        this.persistFilters();
        this.refreshTable();
    },

    clearFilters() {
        this.filters = this.getDefaultFilters();
        this.currentPage = 1;
        this.persistFilters();
        this.render();
    },

    getTrackingInput(id, preferModal = false) {
        const tableInput = document.querySelector(`[data-supplier-tracking="${id}"]`);
        const modalInput = document.querySelector(`[data-supplier-tracking-modal="${id}"]`);

        if (preferModal) {
            return modalInput || tableInput || null;
        }
        return tableInput || modalInput || null;
    },

    isDetailModalOpen(id) {
        if (!id) {
            return false;
        }
        const marker = document.querySelector(`[data-supplier-detail-id="${id}"]`);
        const modal = document.getElementById('modal-container');
        return !!marker && !!modal && !modal.classList.contains('hidden');
    },

    async saveTracking(id, options = {}) {
        if (this.pendingTrackingUpdates[id]) {
            return;
        }

        if (Auth.getRole() !== 'fornecedor') {
            Utils.showToast('Apenas fornecedores podem registrar rastreio', 'warning');
            return;
        }

        const sol = DataManager.getSolicitationById(id);
        if (!sol) {
            Utils.showToast('Solicitação não encontrada', 'error');
            return;
        }

        const scope = this.getSupplierScope();
        if (!this.belongsToCurrentSupplier(sol, scope)) {
            Utils.showToast('Você não tem acesso a esta solicitação', 'error');
            return;
        }

        if (!this.canEditTracking(sol, scope)) {
            Utils.showToast('O rastreio só pode ser informado em solicitações aprovadas ou em trânsito', 'warning');
            return;
        }

        const input = this.getTrackingInput(id, !!options.preferModal);
        const trackingCode = this.normalizeTrackingCode(input?.value || options.trackingCode || '');

        if (!trackingCode) {
            Utils.showToast('Informe o código de rastreio', 'warning');
            if (input) {
                input.focus();
            }
            return;
        }

        if (!this.isTrackingCodeValid(trackingCode)) {
            Utils.showToast(this.getTrackingValidationMessage(), 'warning');
            if (input) {
                input.focus();
                input.select();
            }
            return;
        }

        const currentUser = Auth.getCurrentUser();
        const userName = currentUser?.name || 'Fornecedor';
        const now = Date.now();
        this.pendingTrackingUpdates[id] = true;
        try {
            const result = await DataManager.updateSolicitationStatus(id, 'em-transito', {
                trackingCode,
                trackingUpdatedAt: now,
                trackingBy: userName,
                trackingByEmail: currentUser?.email || null,
                supplierResponseAt: now,
                by: userName,
                byUserId: currentUser?.id || null,
                byUsername: currentUser?.username || null,
                byEmail: currentUser?.email || null,
                byRole: currentUser?.role || null
            });
            const success = result === true || (result && result.success !== false && !result.error);

            if (!success) {
                Utils.showToast(result?.message || result?.error || 'Não foi possível salvar o rastreio', 'error');
                return;
            }

            if (input) {
                input.value = trackingCode;
            }

            const tableInput = document.querySelector(`[data-supplier-tracking="${id}"]`);
            if (tableInput) {
                tableInput.value = trackingCode;
            }

            const modalInput = document.querySelector(`[data-supplier-tracking-modal="${id}"]`);
            if (modalInput) {
                modalInput.value = trackingCode;
            }

            Utils.showToast('Rastreio salvo. Pedido atualizado para Em trânsito.', 'success');

            const updatedSolicitation = result?.solicitation || DataManager.getSolicitationById(id) || { ...sol, status: 'em-transito', trackingCode };
            this.notifyTechnicianTrackingEmail(updatedSolicitation, trackingCode, userName);

            this.refreshTable();

            if (this.isDetailModalOpen(id)) {
                this.openHistory(id);
            }

            if (typeof Auth.renderMenu === 'function') {
                Auth.renderMenu(App.currentPage);
            }
        } finally {
            delete this.pendingTrackingUpdates[id];
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

            if (result?.success) {
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
        return map[String(status || '').trim()] || 'Atualização de status';
    },

    buildHistoryEntries(sol) {
        const entries = [];

        if (Array.isArray(sol.timeline) && sol.timeline.length > 0) {
            sol.timeline.forEach((event) => {
                if (!event) {
                    return;
                }

                let label = 'Registro operacional';
                if (event.event === 'created') {
                    label = 'Técnico abriu a solicitação';
                } else if (event.event === 'status_changed') {
                    label = this.getTimelineStatusLabel(event.to || sol.status);
                }

                entries.push({
                    at: event.at || sol.createdAt || Date.now(),
                    by: event.by || 'Sistema',
                    label,
                    note: event.comment || null
                });
            });
        }

        if (entries.length === 0 && Array.isArray(sol.statusHistory)) {
            sol.statusHistory.forEach((event) => {
                entries.push({
                    at: event.at || sol.createdAt || Date.now(),
                    by: event.by || 'Sistema',
                    label: this.getTimelineStatusLabel(event.status),
                    note: null
                });
            });
        }

        if (entries.length === 0) {
            entries.push({
                at: sol.createdAt || sol.data || Date.now(),
                by: sol.createdBy || 'Sistema',
                label: 'Técnico abriu a solicitação',
                note: null
            });
        }

        return entries.sort((a, b) => (b.at || 0) - (a.at || 0));
    },
    openHistory(id) {
        const sol = DataManager.getSolicitationById(id);
        if (!sol) {
            Utils.showToast('Solicitação não encontrada', 'error');
            return;
        }

        const scope = this.getSupplierScope();
        if (!FORNECEDOR_VISIBLE_STATUSES.includes(this.normalizeStatus(sol.status)) || !this.belongsToCurrentSupplier(sol, scope)) {
            Utils.showToast('Você não tem acesso a este pedido', 'error');
            return;
        }

        this.activeDetailId = id;

        const entries = this.buildHistoryEntries(sol);
        const items = Array.isArray(sol.itens) ? sol.itens : [];
        const canEditTracking = this.canEditTracking(sol, scope);

        const itemsRows = items.length > 0
            ? items.map((item) => {
                const quantity = Number(item.quantidade) || 0;
                const unitValue = Number(item.valorUnit) || 0;
                const totalValue = quantity * unitValue;
                return `
                    <tr>
                        <td><strong>${Utils.escapeHtml(item.codigo || '-')}</strong></td>
                        <td>${Utils.escapeHtml(item.descricao || '-')}</td>
                        <td>${Utils.formatNumber(quantity)}</td>
                        <td>${Utils.formatCurrency(unitValue)}</td>
                        <td>${Utils.formatCurrency(totalValue)}</td>
                    </tr>
                `;
            }).join('')
            : `
                <tr>
                    <td colspan="5" class="text-muted">Nenhum item informado para esta solicitação.</td>
                </tr>
            `;

        const content = `
            <div class="modal-header" data-supplier-detail-id="${Utils.escapeHtml(sol.id)}">
                <h3>Pedido #${Utils.escapeHtml(sol.numero || '-')}</h3>
                <button class="modal-close" onclick="FornecedorPortal.activeDetailId = null; Utils.closeModal()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body supplier-detail-modal-body">
                <div class="supplier-detail-grid">
                    <div class="supplier-detail-card">
                        <label>Data</label>
                        <strong>${Utils.formatDate(sol.data || sol.createdAt)}</strong>
                    </div>
                    <div class="supplier-detail-card">
                        <label>Status atual</label>
                        <div>${Utils.renderStatusBadge(this.normalizeStatus(sol.status))}</div>
                    </div>
                    <div class="supplier-detail-card">
                        <label>Cliente</label>
                        <strong>${Utils.escapeHtml(sol.cliente || 'Não informado')}</strong>
                    </div>
                    <div class="supplier-detail-card">
                        <label>Técnico</label>
                        <strong>${Utils.escapeHtml(this.getTechnicianName(sol))}</strong>
                    </div>
                    <div class="supplier-detail-card">
                        <label>Fornecedor</label>
                        <strong>${Utils.escapeHtml(this.getSupplierName(sol))}</strong>
                    </div>
                    <div class="supplier-detail-card">
                        <label>Total</label>
                        <strong>${this.hasTotal(sol) ? Utils.formatCurrency(Number(sol.total) || 0) : '-'}</strong>
                    </div>
                    <div class="supplier-detail-card supplier-detail-card-wide">
                        <label>Rastreio atual</label>
                        <strong>${sol.trackingCode ? Utils.escapeHtml(sol.trackingCode) : 'Aguardando rastreio'}</strong>
                        ${sol.trackingUpdatedAt ? `<small>Atualizado em ${Utils.formatDate(sol.trackingUpdatedAt, true)}${sol.trackingBy ? ` por ${Utils.escapeHtml(sol.trackingBy)}` : ''}</small>` : ''}
                    </div>
                </div>

                ${canEditTracking ? `
                    <div class="supplier-detail-tracking-box">
                        <label for="supplier-modal-tracking">Atualizar rastreio</label>
                        <div class="supplier-tracking-input">
                            <input type="text" id="supplier-modal-tracking" class="form-control"
                                   data-supplier-tracking-modal="${Utils.escapeHtml(sol.id)}"
                                   value="${Utils.escapeHtml(this.normalizeTrackingCode(sol.trackingCode || ''))}"
                                   placeholder="Informe o código de rastreio">
                            <button class="btn btn-primary" onclick="FornecedorPortal.saveTracking('${sol.id}', { preferModal: true })">
                                <i class="fas fa-truck"></i> Salvar rastreio
                            </button>
                        </div>
                        <small class="text-muted">${this.getTrackingValidationMessage()}</small>
                    </div>
                ` : ''}

                <h4 class="mt-3 mb-2">Itens/peças solicitadas</h4>
                <div class="table-container">
                    <table class="table supplier-items-table">
                        <thead>
                            <tr>
                                <th>Código</th>
                                <th>Descrição</th>
                                <th>Quantidade</th>
                                <th>Valor unitário</th>
                                <th>Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemsRows}
                        </tbody>
                    </table>
                </div>

                <h4 class="mt-3 mb-2">Histórico do pedido</h4>
                <div class="supplier-history-list">
                    ${entries.map(item => `
                        <div class="supplier-history-item">
                            <div class="supplier-history-title">${Utils.escapeHtml(item.label)}</div>
                            <div class="supplier-history-meta">${Utils.formatDate(item.at, true)} • ${Utils.escapeHtml(item.by || 'Sistema')}</div>
                            ${item.note ? `<div class="supplier-history-note">${Utils.escapeHtml(item.note)}</div>` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-outline" onclick="FornecedorPortal.generateSolicitationPdf('${sol.id}')">
                    <i class="fas fa-file-pdf"></i> Gerar PDF
                </button>
                <button class="btn btn-primary" onclick="FornecedorPortal.activeDetailId = null; Utils.closeModal()">Fechar</button>
            </div>
        `;

        Utils.showModal(content, { size: 'lg' });
    },

    generateSolicitationPdf(id) {
        if (Auth.getRole() !== 'fornecedor') {
            Utils.showToast('Apenas fornecedores podem gerar PDF nesta área', 'warning');
            return;
        }

        const sol = DataManager.getSolicitationById(id);
        if (!sol) {
            Utils.showToast('Solicitação não encontrada', 'error');
            return;
        }

        const scope = this.getSupplierScope();
        if (!FORNECEDOR_VISIBLE_STATUSES.includes(this.normalizeStatus(sol.status)) || !this.belongsToCurrentSupplier(sol, scope)) {
            Utils.showToast('Você não tem acesso a esta solicitação', 'error');
            return;
        }

        if (typeof Utils.generatePDF !== 'function') {
            Utils.showToast('Função de PDF indisponível no momento', 'error');
            return;
        }

        const filename = Utils.generatePDF(sol, { source: 'fornecedor' });
        if (filename) {
            Utils.showToast('PDF gerado com sucesso', 'success');
        }
    }
};

if (typeof window !== 'undefined') {
    window.FornecedorPortal = FornecedorPortal;
}



