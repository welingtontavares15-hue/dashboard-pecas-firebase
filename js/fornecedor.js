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
    filters: {
        search: '',
        status: ''
    },

    render() {
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

            <div class="filters-bar supplier-filters-bar">
                <div class="search-box">
                    <input type="text" id="supplier-portal-search" class="form-control"
                           placeholder="Buscar por número, cliente, técnico, peça ou rastreio..."
                           value="${Utils.escapeHtml(this.filters.search)}">
                    <button class="btn btn-primary" onclick="FornecedorPortal.applyFilters()">
                        <i class="fas fa-search"></i>
                    </button>
                </div>
                <div class="filter-group">
                    <label for="supplier-portal-status">Status:</label>
                    <select id="supplier-portal-status" class="form-control">
                        <option value="">Todos</option>
                        <option value="aprovada" ${this.filters.status === 'aprovada' ? 'selected' : ''}>Aprovado / aguardando envio</option>
                        <option value="em-transito" ${this.filters.status === 'em-transito' ? 'selected' : ''}>Em trânsito</option>
                    </select>
                </div>
                <button class="btn btn-outline" onclick="FornecedorPortal.clearFilters()">
                    <i class="fas fa-times"></i> Limpar
                </button>
            </div>

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

        if (search) {
            search.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    this.applyFilters();
                }
            });

            search.addEventListener('input', Utils.debounce(() => {
                this.filters.search = search.value || '';
                this.currentPage = 1;
                this.refreshTable();
            }, 250));
        }

        if (status) {
            status.addEventListener('change', () => this.applyFilters());
        }
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
        return this.normalizeEmail(supplier?.email) === scope.email;
    },

    getFilteredSolicitations() {
        const scope = this.getSupplierScope();
        let solicitations = DataManager.getSolicitations().filter((sol) => {
            const status = this.normalizeStatus(sol.status);
            return FORNECEDOR_VISIBLE_STATUSES.includes(status) && this.belongsToCurrentSupplier(sol, scope);
        });

        if (this.filters.status) {
            solicitations = solicitations.filter(sol => this.normalizeStatus(sol.status) === this.filters.status);
        }

        if (this.filters.search) {
            const term = this.filters.search;
            solicitations = solicitations.filter((sol) => {
                const itemText = (sol.itens || []).map(item => `${item.codigo || ''} ${item.descricao || ''}`).join(' ');
                return (
                    Utils.matchesSearch(sol.numero, term) ||
                    Utils.matchesSearch(sol.tecnicoNome, term) ||
                    Utils.matchesSearch(sol.cliente, term) ||
                    Utils.matchesSearch(sol.trackingCode, term) ||
                    Utils.matchesSearch(itemText, term)
                );
            });
        }

        return solicitations.sort((a, b) => {
            const aDate = a.trackingUpdatedAt || a.approvedAt || a.createdAt || 0;
            const bDate = b.trackingUpdatedAt || b.approvedAt || b.createdAt || 0;
            return bDate - aDate;
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
                    <p>Este perfil exibe somente solicitações aprovadas e em trânsito vinculadas ao seu fornecedor.</p>
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
                                <td>${this.hasTotal(sol) ? Utils.formatCurrency(Number(sol.total) || 0) : '-'}</td>
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
        this.filters.search = document.getElementById('supplier-portal-search')?.value || '';
        this.filters.status = document.getElementById('supplier-portal-status')?.value || '';
        this.currentPage = 1;
        this.refreshTable();
    },

    clearFilters() {
        this.filters = { search: '', status: '' };
        this.currentPage = 1;
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

    saveTracking(id, options = {}) {
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

        const success = DataManager.updateSolicitationStatus(id, 'em-transito', {
            trackingCode,
            trackingUpdatedAt: now,
            trackingBy: userName,
            supplierResponseAt: now,
            by: userName
        });

        if (!success) {
            Utils.showToast('Não foi possível salvar o rastreio', 'error');
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
        this.refreshTable();

        if (this.isDetailModalOpen(id)) {
            this.openHistory(id);
        }

        if (typeof Auth.renderMenu === 'function') {
            Auth.renderMenu(App.currentPage);
        }
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


