/**
 * Portal do Fornecedor
 * Exibe apenas solicitações aprovadas e em fluxo de envio do fornecedor.
 */

const FORNECEDOR_VISIBLE_STATUSES = ['aprovada', 'em-transito'];

const FornecedorPortal = {
    currentPage: 1,
    itemsPerPage: 10,
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
            <div class="page-header">
                <h2><i class="fas fa-truck"></i> Portal do Fornecedor</h2>
                <p class="text-muted">Acompanhe pedidos aprovados, informe rastreios e consulte o histórico operacional.</p>
            </div>

            <div class="card supplier-flow-card">
                <div class="card-body">
                    <h4 class="mb-2">Fluxo operacional</h4>
                    <ol class="supplier-flow-list">
                        <li>Técnico faz a solicitação</li>
                        <li>Gestor avalia e aprova</li>
                        <li>Fornecedor recebe somente solicitações aprovadas</li>
                        <li>Fornecedor separa o material e informa rastreio</li>
                        <li>Pedido retorna ao técnico para recebimento</li>
                        <li>Técnico confirma o recebimento</li>
                        <li>Solicitação é finalizada</li>
                    </ol>
                </div>
            </div>

            <div class="filters-bar supplier-filters-bar">
                <div class="search-box">
                    <input type="text" id="supplier-portal-search" class="form-control"
                           placeholder="Buscar por número, técnico, cliente ou peça..."
                           value="${Utils.escapeHtml(this.filters.search)}">
                    <button class="btn btn-primary" onclick="FornecedorPortal.applyFilters()">
                        <i class="fas fa-search"></i>
                    </button>
                </div>
                <div class="filter-group">
                    <label>Status:</label>
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
        let solicitations = DataManager.getSolicitations().filter(sol =>
            FORNECEDOR_VISIBLE_STATUSES.includes(sol.status) && this.belongsToCurrentSupplier(sol, scope)
        );

        if (this.filters.status) {
            solicitations = solicitations.filter(sol => sol.status === this.filters.status);
        }

        if (this.filters.search) {
            const term = this.filters.search;
            solicitations = solicitations.filter(sol => {
                const itemText = (sol.itens || []).map(item => `${item.codigo || ''} ${item.descricao || ''}`).join(' ');
                return (
                    Utils.matchesSearch(sol.numero, term) ||
                    Utils.matchesSearch(sol.tecnicoNome, term) ||
                    Utils.matchesSearch(sol.cliente, term) ||
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

    renderPartsSummary(items = []) {
        if (!Array.isArray(items) || items.length === 0) {
            return '<span class="text-muted">Sem itens aprovados</span>';
        }

        const preview = items
            .slice(0, 2)
            .map(item => `${Utils.escapeHtml(item.codigo || '-')}: ${Utils.formatNumber(Number(item.quantidade) || 0)}`)
            .join(' • ');

        const suffix = items.length > 2 ? ' • ...' : '';
        return `
            <div class="supplier-parts-summary">
                <strong>${Utils.formatNumber(items.length)} item(ns)</strong>
                <small>${preview}${suffix}</small>
            </div>
        `;
    },

    hasTotal(sol) {
        return sol && sol.total !== null && sol.total !== undefined && !Number.isNaN(Number(sol.total));
    },

    getShippingSituation(sol) {
        const status = sol?.status;
        if (status === 'aprovada') {
            return 'Aguardando envio do fornecedor';
        }
        if (status === 'em-transito') {
            return sol?.trackingCode
                ? 'Pedido em trânsito com rastreio informado'
                : 'Rastreio pendente de preenchimento';
        }
        return 'Fluxo concluído';
    },

    canEditTracking(sol, scope = this.getSupplierScope()) {
        if (!this.belongsToCurrentSupplier(sol, scope)) {
            return false;
        }
        return sol.status === 'aprovada' || sol.status === 'em-transito';
    },

    renderTrackingCell(sol, scope = this.getSupplierScope()) {
        if (!this.canEditTracking(sol, scope)) {
            return `<span>${sol.trackingCode ? Utils.escapeHtml(sol.trackingCode) : '-'}</span>`;
        }

        return `
            <div class="supplier-tracking-input">
                <input type="text" class="form-control"
                       data-supplier-tracking="${Utils.escapeHtml(sol.id)}"
                       value="${Utils.escapeHtml(sol.trackingCode || '')}"
                       placeholder="Informar rastreio">
                <button class="btn btn-sm btn-primary" onclick="FornecedorPortal.saveTracking('${sol.id}')">
                    Salvar
                </button>
            </div>
        `;
    },

    renderTable() {
        const solicitations = this.getFilteredSolicitations();

        if (solicitations.length === 0) {
            return `
                <div class="empty-state">
                    <i class="fas fa-box-open"></i>
                    <h4>Sem pedidos no fluxo do fornecedor</h4>
                    <p>Este perfil exibe somente solicitações aprovadas e em trânsito.</p>
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
                Exibindo ${start + 1}-${Math.min(start + this.itemsPerPage, total)} de ${total} pedidos no fluxo do fornecedor
            </div>
            <div class="table-container">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Solicitação</th>
                            <th>Status</th>
                            <th>Técnico</th>
                            <th>Cliente</th>
                            <th>Data</th>
                            <th>Peças aprovadas</th>
                            <th>Valor total</th>
                            <th>Situação do envio</th>
                            <th>Rastreio</th>
                            <th>Histórico</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${paginated.map(sol => `
                            <tr>
                                <td><strong>#${Utils.escapeHtml(sol.numero || '-')}</strong></td>
                                <td>${Utils.renderStatusBadge(sol.status)}</td>
                                <td>${Utils.escapeHtml(this.getTechnicianName(sol))}</td>
                                <td>${Utils.escapeHtml(sol.cliente || 'Não informado')}</td>
                                <td>${Utils.formatDate(sol.data || sol.createdAt)}</td>
                                <td>${this.renderPartsSummary(sol.itens || [])}</td>
                                <td>${this.hasTotal(sol) ? Utils.formatCurrency(Number(sol.total) || 0) : '-'}</td>
                                <td>${Utils.escapeHtml(this.getShippingSituation(sol))}</td>
                                <td>${this.renderTrackingCell(sol, scope)}</td>
                                <td>
                                    <button class="btn btn-sm btn-outline" onclick="FornecedorPortal.openHistory('${sol.id}')">
                                        <i class="fas fa-clock-rotate-left"></i> Ver
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
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
        const container = document.getElementById('supplier-portal-table-container');
        if (container) {
            container.innerHTML = this.renderTable();
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

    getTrackingInput(id) {
        const inputs = Array.from(document.querySelectorAll('[data-supplier-tracking]'));
        return inputs.find(input => input.dataset.supplierTracking === id) || null;
    },

    saveTracking(id) {
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

        const input = this.getTrackingInput(id);
        const trackingCode = String(input?.value || '').trim();
        if (!trackingCode) {
            Utils.showToast('Informe o código de rastreio', 'warning');
            if (input) {
                input.focus();
            }
            return;
        }

        const currentUser = Auth.getCurrentUser();
        const userName = currentUser?.name || 'Fornecedor';

        const success = DataManager.updateSolicitationStatus(id, 'em-transito', {
            trackingCode,
            trackingUpdatedAt: Date.now(),
            trackingBy: userName,
            supplierResponseAt: Date.now(),
            by: userName
        });

        if (!success) {
            Utils.showToast('Não foi possível salvar o rastreio', 'error');
            return;
        }

        Utils.showToast('Rastreio registrado com sucesso', 'success');
        this.refreshTable();

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
            entregue: 'Técnico confirmou entrega',
            finalizada: 'Solicitação finalizada',
            'historico-manual': 'Solicitação finalizada'
        };
        return map[String(status || '').trim()] || 'Atualização de status';
    },

    buildHistoryEntries(sol) {
        const entries = [];

        if (Array.isArray(sol.timeline) && sol.timeline.length > 0) {
            sol.timeline.forEach((event) => {
                let label = '';
                if (event.event === 'created') {
                    label = 'Técnico abriu a solicitação';
                } else if (event.event === 'status_changed') {
                    label = this.getTimelineStatusLabel(event.to || sol.status);
                } else {
                    label = 'Registro operacional';
                }

                entries.push({
                    at: event.at,
                    by: event.by || 'Sistema',
                    label,
                    note: event.comment || null
                });
            });
        }

        if (entries.length === 0 && Array.isArray(sol.statusHistory)) {
            sol.statusHistory.forEach((event) => {
                entries.push({
                    at: event.at,
                    by: event.by || 'Sistema',
                    label: this.getTimelineStatusLabel(event.status),
                    note: null
                });
            });
        }

        if (entries.length === 0) {
            entries.push({
                at: sol.createdAt || sol.data,
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
        if (!FORNECEDOR_VISIBLE_STATUSES.includes(sol.status) || !this.belongsToCurrentSupplier(sol, scope)) {
            Utils.showToast('Você não tem acesso a este histórico', 'error');
            return;
        }

        const entries = this.buildHistoryEntries(sol);

        const content = `
            <div class="modal-header">
                <h3>Histórico da Solicitação #${Utils.escapeHtml(sol.numero || '-')}</h3>
                <button class="modal-close" onclick="Utils.closeModal()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <div class="form-row">
                    <div class="form-group">
                        <label>Status atual</label>
                        <p>${Utils.renderStatusBadge(sol.status)}</p>
                    </div>
                    <div class="form-group">
                        <label>Situação do envio</label>
                        <p><strong>${Utils.escapeHtml(this.getShippingSituation(sol))}</strong></p>
                    </div>
                </div>

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
                <button class="btn btn-primary" onclick="Utils.closeModal()">Fechar</button>
            </div>
        `;

        Utils.showModal(content, { size: 'md' });
    }
};





