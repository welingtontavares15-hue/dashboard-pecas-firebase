/**
 * Custos (Manual Costs) Module
 * Handles CRUD of manual costs with RBAC controls
 */

const Custos = {
    filters: {
        dateFrom: '',
        dateTo: '',
        category: '',
        search: ''
    },

    render() {
        const content = document.getElementById('content-area');
        if (!content) {
            return;
        }

        if (!Auth.hasPermission('custos', 'view')) {
            content.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-lock"></i>
                    <h4>Acesso restrito</h4>
                    <p>Você não tem permissão para visualizar esta página.</p>
                </div>
            `;
            return;
        }

        const canManage = Auth.hasPermission('custos', 'create') || Auth.hasPermission('custos', 'edit');
        const costs = this.getFilteredCosts();
        const categories = this.getCategories();
        const isConnecting = typeof DataManager !== 'undefined' && typeof DataManager.isCloudConnecting === 'function' && DataManager.isCloudConnecting();
        const cloudReady = typeof DataManager !== 'undefined' && typeof DataManager.isCloudReady === 'function' && DataManager.isCloudReady();

        content.innerHTML = `
            <div class="page-header">
                <h2><i class="fas fa-coins"></i> Custos</h2>
                ${canManage ? `
                    <button class="btn btn-success" onclick="Custos.openForm()">
                        <i class="fas fa-plus"></i> Novo Custo
                    </button>
                ` : ''}
            </div>

            <div class="card">
                <div class="card-body">
                    <div class="filters-bar">
                        <div class="filter-group">
                            <label>De:</label>
                            <input type="date" id="custos-date-from" class="form-control" value="${Utils.escapeHtml(this.filters.dateFrom)}">
                        </div>
                        <div class="filter-group">
                            <label>Até:</label>
                            <input type="date" id="custos-date-to" class="form-control" value="${Utils.escapeHtml(this.filters.dateTo)}">
                        </div>
                        <div class="filter-group">
                            <label>Categoria:</label>
                            <select id="custos-category" class="form-control">
                                <option value="">Todas</option>
                                ${categories.map(cat => `
                                    <option value="${Utils.escapeHtml(cat)}" ${this.filters.category === cat ? 'selected' : ''}>${Utils.escapeHtml(cat)}</option>
                                `).join('')}
                            </select>
                        </div>
                        <div class="search-box">
                            <input type="text" id="custos-search" class="form-control" placeholder="Buscar descrição ou observação" value="${Utils.escapeHtml(this.filters.search)}">
                            <button class="btn btn-primary" onclick="Custos.applyFilters()">
                                <i class="fas fa-search"></i>
                            </button>
                        </div>
                    </div>

                    ${!cloudReady ? `
                        <div class="alert alert-warning" role="alert" style="margin-bottom: 1rem;">
                            <i class="fas fa-cloud-slash"></i> ${isConnecting ? 'Conectando à nuvem...' : 'Offline: operações de escrita podem falhar.'}
                        </div>
                    ` : ''}

                    <div id="custos-list">
                        ${this.renderList(costs, canManage)}
                    </div>
                </div>
            </div>
        `;

        this.bindFilterEvents();
    },

    bindFilterEvents() {
        const dateFrom = document.getElementById('custos-date-from');
        const dateTo = document.getElementById('custos-date-to');
        const category = document.getElementById('custos-category');
        const search = document.getElementById('custos-search');

        if (dateFrom) {
            dateFrom.addEventListener('change', () => {
                this.filters.dateFrom = dateFrom.value;
                this.render();
            });
        }
        if (dateTo) {
            dateTo.addEventListener('change', () => {
                this.filters.dateTo = dateTo.value;
                this.render();
            });
        }
        if (category) {
            category.addEventListener('change', () => {
                this.filters.category = category.value;
                this.render();
            });
        }
        if (search) {
            search.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    this.applyFilters();
                }
            });
        }
    },

    applyFilters() {
        this.filters.dateFrom = document.getElementById('custos-date-from')?.value || '';
        this.filters.dateTo = document.getElementById('custos-date-to')?.value || '';
        this.filters.category = document.getElementById('custos-category')?.value || '';
        this.filters.search = document.getElementById('custos-search')?.value || '';
        this.render();
    },

    getCategories() {
        const costs = DataManager.getCosts ? DataManager.getCosts() : [];
        return [...new Set(costs.filter(Boolean).map(c => c.categoria).filter(Boolean))].sort();
    },

    getFilteredCosts() {
        let costs = DataManager.getCosts ? DataManager.getCosts() : [];
        if (!Array.isArray(costs)) {
            return [];
        }

        if (this.filters.dateFrom) {
            const from = Utils.parseAsLocalDate(this.filters.dateFrom);
            costs = costs.filter(c => {
                const d = Utils.parseAsLocalDate(c.data || c.createdAt);
                return d >= from;
            });
        }

        if (this.filters.dateTo) {
            const to = Utils.parseAsLocalDate(this.filters.dateTo);
            to.setHours(23, 59, 59, 999);
            costs = costs.filter(c => {
                const d = Utils.parseAsLocalDate(c.data || c.createdAt);
                return d <= to;
            });
        }

        if (this.filters.category) {
            costs = costs.filter(c => c.categoria === this.filters.category);
        }

        if (this.filters.search) {
            const query = Utils.normalizeText(this.filters.search);
            costs = costs.filter(c => 
                Utils.normalizeText(c.descricao || '').includes(query) ||
                Utils.normalizeText(c.observacao || '').includes(query)
            );
        }

        return costs.sort((a, b) => {
            const da = Utils.parseAsLocalDate(a.data || a.createdAt).getTime();
            const db = Utils.parseAsLocalDate(b.data || b.createdAt).getTime();
            return db - da;
        });
    },

    renderList(costs, canManage) {
        if (!costs || costs.length === 0) {
            return `
                <div class="empty-state">
                    <i class="fas fa-wallet"></i>
                    <h4>Nenhum custo encontrado</h4>
                    <p>Registre um novo custo manual ou ajuste os filtros.</p>
                    ${canManage ? `
                        <button class="btn btn-primary" onclick="Custos.openForm()">
                            <i class="fas fa-plus"></i> Adicionar Custo
                        </button>
                    ` : ''}
                </div>
            `;
        }

        const total = costs.reduce((sum, c) => sum + (Number(c.valor) || 0), 0);

        return `
            <div class="table-info">
                ${costs.length} registro(s) · Total: <strong>${Utils.formatCurrency(total)}</strong>
            </div>
            <div class="table-container">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Data</th>
                            <th>Categoria</th>
                            <th>Descrição</th>
                            <th>Valor</th>
                            <th>Observação</th>
                            ${canManage ? '<th style="width: 120px;">Ações</th>' : ''}
                        </tr>
                    </thead>
                    <tbody>
                        ${costs.map(cost => `
                            <tr>
                                <td>${Utils.formatDate(cost.data || cost.createdAt)}</td>
                                <td>${Utils.escapeHtml(cost.categoria || '-')}</td>
                                <td>${Utils.escapeHtml(cost.descricao || '-')}</td>
                                <td>${Utils.formatCurrency(cost.valor)}</td>
                                <td>${Utils.escapeHtml(cost.observacao || '-')}</td>
                                ${canManage ? `
                                    <td>
                                        <div class="actions">
                                            <button class="btn btn-sm btn-outline" onclick="Custos.openForm('${cost.id}')">
                                                <i class="fas fa-edit"></i>
                                            </button>
                                            ${Auth.hasPermission('custos', 'delete') ? `
                                                <button class="btn btn-sm btn-danger" onclick="Custos.confirmDelete('${cost.id}')">
                                                    <i class="fas fa-trash"></i>
                                                </button>
                                            ` : ''}
                                        </div>
                                    </td>
                                ` : ''}
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    openForm(id = null) {
        if (!Auth.hasPermission('custos', 'create') && !Auth.hasPermission('custos', 'edit')) {
            Utils.showToast('Você não tem permissão para gerenciar custos', 'error');
            return;
        }

        const cost = id ? DataManager.getCostById(id) : null;
        const title = id ? 'Editar Custo' : 'Novo Custo';

        const content = `
            <div class="modal-header">
                <h3>${title}</h3>
                <button class="modal-close" onclick="Utils.closeModal();">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <div class="form-row">
                    <div class="form-group">
                        <label>Data *</label>
                        <input type="date" id="cost-date" class="form-control" value="${Utils.escapeHtml(cost?.data || Utils.getLocalDateString())}" required>
                    </div>
                    <div class="form-group">
                        <label>Categoria *</label>
                        <input type="text" id="cost-category" class="form-control" value="${Utils.escapeHtml(cost?.categoria || '')}" placeholder="Ex: Transporte" required>
                    </div>
                </div>
                <div class="form-group">
                    <label>Descrição *</label>
                    <input type="text" id="cost-description" class="form-control" value="${Utils.escapeHtml(cost?.descricao || '')}" placeholder="Descreva o custo" required>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Valor (R$) *</label>
                        <input type="number" id="cost-value" class="form-control" min="0" step="0.01" value="${cost ? Number(cost.valor).toFixed(2) : '0.00'}" required>
                    </div>
                    <div class="form-group">
                        <label>Vínculo Solicitação</label>
                        <input type="text" id="cost-link" class="form-control" value="${Utils.escapeHtml(cost?.vinculoSolicitacaoId || '')}" placeholder="Número ou ID (opcional)">
                    </div>
                </div>
                <div class="form-group">
                    <label>Observação</label>
                    <textarea id="cost-notes" class="form-control" rows="3" placeholder="Detalhes adicionais">${Utils.escapeHtml(cost?.observacao || '')}</textarea>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-outline" onclick="Utils.closeModal()">Cancelar</button>
                <button class="btn btn-primary" onclick="Custos.handleSave('${id || ''}')">
                    <i class="fas fa-save"></i> Salvar
                </button>
            </div>
        `;

        Utils.showModal(content, { closeOnBackdrop: false, size: 'lg' });
    },

    handleSave(id) {
        const data = document.getElementById('cost-date')?.value;
        const categoria = document.getElementById('cost-category')?.value.trim();
        const descricao = document.getElementById('cost-description')?.value.trim();
        const valorStr = document.getElementById('cost-value')?.value;
        const observacao = document.getElementById('cost-notes')?.value;
        const vinculo = document.getElementById('cost-link')?.value;

        const payload = {
            id: id || undefined,
            data: data || Utils.getLocalDateString(),
            categoria,
            descricao,
            valor: valorStr,
            observacao,
            vinculoSolicitacaoId: vinculo
        };

        const result = DataManager.saveCost(payload);
        if (!result?.success) {
            const message = result?.message || result?.error || 'Não foi possível salvar o custo';
            Utils.showToast(message, 'error');
            return;
        }

        Utils.showToast('Custo salvo com sucesso', 'success');
        Utils.closeModal();
        this.render();
    },

    async confirmDelete(id) {
        if (!Auth.hasPermission('custos', 'delete')) {
            Utils.showToast('Você não tem permissão para excluir custos', 'error');
            return;
        }

        const confirm = await Utils.confirm('Deseja excluir este custo?', 'Excluir Custo');
        if (!confirm) {
            return;
        }

        const result = DataManager.deleteCost(id);
        if (!result?.success) {
            const message = result?.message || result?.error || 'Não foi possível excluir o custo';
            Utils.showToast(message, 'error');
            return;
        }

        Utils.showToast('Custo excluído', 'success');
        this.render();
    }
};

if (typeof window !== 'undefined') {
    window.Custos = Custos;
}
