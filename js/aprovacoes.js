/**
 * Aprovações (Approvals) Module
 * Handles approval/rejection workflow for gestors and administrators
 */

const Aprovacoes = {
    currentPage: 1,
    itemsPerPage: 10,
    selectedIds: [],
    editingSolicitation: null,
    isApproveSubmitting: false,
    isRejectSubmitting: false,
    isBatchApproveSubmitting: false,
    filters: {
        search: '',
        minValue: '',
        tecnico: '',
        regiao: '',
        prioridade: '',
        dateFrom: '',
        dateTo: ''
    },
    _filtersInitialized: false,

    getDefaultFilters() {
        return {
            search: '',
            minValue: '',
            tecnico: '',
            regiao: '',
            prioridade: '',
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
        const restored = AnalyticsHelper.restoreModuleFilterState('aprovacoes', {
            defaults,
            useDefaultPeriod: false
        });
        this.filters = {
            ...defaults,
            ...restored
        };
        this._filtersInitialized = true;
    },

    persistFilters() {
        const persisted = AnalyticsHelper.persistModuleFilterState('aprovacoes', this.filters, {
            defaults: this.getDefaultFilters(),
            useDefaultPeriod: false
        });
        this.filters = {
            ...this.filters,
            ...persisted
        };
        return persisted;
    },

    /**
     * Render approvals page
     */
    render() {
        this.ensureFilters();
        const content = document.getElementById('content-area');
        const pending = DataManager.getPendingSolicitations();

        content.innerHTML = `
            <div class="page-header">
                <h2><i class="fas fa-check-double"></i> Aprovações</h2>
                ${pending.length > 0 && Auth.hasPermission('aprovacoes', 'batch') ? `
                    <div class="btn-group">
                        <button class="btn btn-success" onclick="Aprovacoes.batchApprove()" id="batch-approve-btn" disabled>
                            <i class="fas fa-check-double"></i> Aprovar Selecionados (<span id="selected-count">0</span>)
                        </button>
                    </div>
                ` : ''}
            </div>
            <div class="filter-context-summary" id="approval-filter-context">
                <span class="helper-text">${this.getResultsSummary()}</span>
                ${this.renderActiveFilterChips()}
            </div>

            ${pending.length > 0 ? `
                <div class="alert alert-warning mb-3" style="display: flex; align-items: center; gap: 1rem; padding: 1rem; background-color: rgba(255, 193, 7, 0.1); border-left: 4px solid var(--warning-color); border-radius: var(--radius-md);">
                    <i class="fas fa-clock" style="font-size: 1.5rem; color: var(--warning-color);"></i>
                    <div>
                        <strong>${pending.length} solicitação(ões) aguardando aprovação</strong>
                        <p class="mb-0 text-muted" style="font-size: 0.875rem;">
                            Fila priorizada por maior custo. SLA: ${DataManager.getSettings().slaHours || 24} horas
                        </p>
                    </div>
                </div>
            ` : ''}

            <details class="filter-panel compact" id="approval-filter-panel" ${this.hasActiveFilters() ? 'open' : ''}>
                <summary class="filter-panel-toggle" id="approval-filter-panel-toggle">${this.hasActiveFilters() ? 'Filtros ativos' : 'Filtros'}</summary>
                <div class="filters-bar filter-panel-body">
                    <div class="search-box">
                        <input type="text" id="approval-search" class="form-control" placeholder="Buscar por número, cliente, técnico ou peça..." value="${Utils.escapeHtml(this.filters.search)}">
                    </div>
                    <div class="filter-group">
                        <label>Valor mínimo:</label>
                        <input type="number" min="0" step="0.01" id="approval-min-value" class="form-control" value="${this.filters.minValue}" placeholder="R$ 0,00">
                    </div>
                    <div class="filter-group">
                        <label>Técnico:</label>
                        <select id="approval-tecnico" class="form-control">
                            <option value="">Todos</option>
                            ${DataManager.getTechnicians().map(t => `
                                <option value="${t.id}" ${this.filters.tecnico === t.id ? 'selected' : ''}>${Utils.escapeHtml(t.nome)}</option>
                            `).join('')}
                        </select>
                    </div>
                    <div class="filter-group">
                        <label>Região:</label>
                        <select id="approval-regiao" class="form-control">
                            <option value="">Todas</option>
                            ${this.getRegionOptions().map(regiao => `
                                <option value="${Utils.escapeHtml(regiao)}" ${this.filters.regiao === regiao ? 'selected' : ''}>${Utils.escapeHtml(regiao)}</option>
                            `).join('')}
                        </select>
                    </div>
                    <div class="filter-group">
                        <label>Prioridade:</label>
                        <select id="approval-prioridade" class="form-control">
                            <option value="">Todas</option>
                            <option value="alta" ${this.filters.prioridade === 'alta' ? 'selected' : ''}>Alta</option>
                            <option value="media" ${this.filters.prioridade === 'media' ? 'selected' : ''}>Média</option>
                            <option value="baixa" ${this.filters.prioridade === 'baixa' ? 'selected' : ''}>Baixa</option>
                        </select>
                    </div>
                    <div class="filter-group">
                        <label>De:</label>
                        <input type="date" id="approval-date-from" class="form-control" value="${this.filters.dateFrom}">
                    </div>
                    <div class="filter-group">
                        <label>Até:</label>
                        <input type="date" id="approval-date-to" class="form-control" value="${this.filters.dateTo}">
                    </div>
                    <button class="btn btn-outline" onclick="Aprovacoes.clearFilters()">
                        <i class="fas fa-times"></i> Limpar
                    </button>
                </div>
            </details>

            <div class="card">
                <div class="card-body">
                    <div id="approvals-table-container">
                        ${this.renderTable()}
                    </div>
                </div>
            </div>
        `;

        this.bindFilters();
        this.updateSelectedCount();
    },

    getResultsSummary() {
        const pending = this.getFilteredPendingSolicitations();
        return `Base atual: ${Utils.formatNumber(pending.length)} solicitações pendentes filtradas.`;
    },

    renderActiveFilterChips() {
        const chips = AnalyticsHelper.buildFilterChips(this.filters, {
            moduleKey: 'aprovacoes',
            useDefaultPeriod: false,
            labels: {
                tecnico: 'Tecnico',
                regiao: 'Regiao',
                prioridade: 'Prioridade'
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
                    <button type="button" class="filter-chip" onclick="Aprovacoes.removeFilterChip('${chip.key}')">
                        <span>${Utils.escapeHtml(chip.label)}: ${Utils.escapeHtml(chip.displayValue || chip.value || '')}</span>
                        <i class="fas fa-times"></i>
                    </button>
                `).join('')}
            </div>
        `;
    },

    removeFilterChip(key) {
        if (Object.prototype.hasOwnProperty.call(this.filters, key)) {
            this.filters[key] = '';
        }

        this.persistFilters();
        this.selectedIds = [];
        this.currentPage = 1;
        this.render();
    },

    hasActiveFilters() {
        return Object.values(this.filters).some((value) => {
            if (Array.isArray(value)) {
                return value.length > 0;
            }
            return value !== '' && value !== null && value !== undefined;
        });
    },

    /**
     * Render approvals table
     */
    renderTable() {
        const pending = this.getFilteredPendingSolicitations();

        if (pending.length === 0) {
            return `
                <div class="empty-state">
                    <i class="fas fa-check-circle"></i>
                    <h4>Sem solicitações pendentes</h4>
                    <p>${Object.values(this.filters).some(Boolean) ? 'Nenhuma solicitação atende aos filtros atuais. Revise o período, técnico ou prioridade selecionados.' : 'Todas as solicitações já foram tratadas. Novos pedidos que exigirem aprovação aparecerão aqui.'}</p>
                    ${Auth.hasPermission('solicitacoes', 'create') ? `
                        <button class="btn btn-primary" onclick="Solicitacoes.openForm()">
                            <i class="fas fa-plus"></i> Nova Solicitação
                        </button>
                    ` : ''}
                </div>
            `;
        }

        const total = pending.length;
        const totalPages = Math.max(Math.ceil(total / this.itemsPerPage), 1);
        this.currentPage = Math.min(this.currentPage, totalPages);
        const start = (this.currentPage - 1) * this.itemsPerPage;
        const paginated = pending.slice(start, start + this.itemsPerPage);

        const settings = DataManager.getSettings();
        const slaHours = settings.slaHours || 24;

        return `
            <div class="table-info">
                Exibindo ${start + 1}-${Math.min(start + this.itemsPerPage, total)} de ${total} pendentes
            </div>
            <div class="table-container">
                <table class="table">
                    <thead>
                        <tr>
                            ${Auth.hasPermission('aprovacoes', 'batch') ? `
                                <th style="width: 40px;">
                                    <input type="checkbox" id="select-all" onchange="Aprovacoes.toggleSelectAll()">
                                </th>
                            ` : ''}
                            <th>Número</th>
                            <th>Técnico</th>
                            <th>Cliente</th>
                            <th>Região</th>
                            <th>Prioridade</th>
                            <th>Total</th>
                            <th>Tempo Aguardando</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${paginated.map(sol => {
        const waitingHours = Utils.getHoursDiff(sol.createdAt, Date.now());
        const isOverSLA = waitingHours > slaHours;
        const priority = this.getSolicitationPriority(sol);

        return `
                                <tr class="${isOverSLA ? 'sla-alert' : ''}">
                                    ${Auth.hasPermission('aprovacoes', 'batch') ? `
                                        <td>
                                            <input type="checkbox" class="row-checkbox"
                                                   data-id="${sol.id}"
                                                   ${this.selectedIds.includes(sol.id) ? 'checked' : ''}
                                                   onchange="Aprovacoes.toggleSelection('${sol.id}')">
                                        </td>
                                    ` : ''}
                                    <td><strong>#${sol.numero}</strong></td>
                                    <td>${Utils.escapeHtml(sol.tecnicoNome || '-')}</td>
                                    <td>${Utils.escapeHtml(sol.cliente || 'Não informado')}</td>
                                    <td>${Utils.escapeHtml(this.getSolicitationRegion(sol))}</td>
                                    <td>${this.renderPriorityBadge(priority)}</td>
                                    <td>${Utils.formatCurrency(sol.total)}</td>
                                    <td>
                                        <span class="${isOverSLA ? 'text-danger' : 'text-warning'}">
                                            <i class="fas ${isOverSLA ? 'fa-exclamation-triangle' : 'fa-clock'}"></i>
                                            ${Utils.formatDuration(waitingHours)}
                                            ${isOverSLA ? ' (SLA excedido)' : ''}
                                        </span>
                                    </td>
                                    <td>
                                        <div class="actions">
                                            <button class="btn btn-sm btn-outline" onclick="Solicitacoes.viewDetails('${sol.id}')" title="Visualizar">
                                                <i class="fas fa-eye"></i>
                                            </button>
                                            <button class="btn btn-sm btn-success" onclick="Aprovacoes.openApproveModal('${sol.id}')" title="Aprovar">
                                                <i class="fas fa-check"></i>
                                            </button>
                                            <button class="btn btn-sm btn-danger" onclick="Aprovacoes.openRejectModal('${sol.id}')" title="Rejeitar">
                                                <i class="fas fa-times"></i>
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

    getFilteredPendingSolicitations() {
        const pending = AnalyticsHelper.filterSolicitations(DataManager.getPendingSolicitations().slice(), {
            moduleKey: 'aprovacoes',
            search: this.filters.search,
            tecnico: this.filters.tecnico,
            regiao: this.filters.regiao,
            prioridade: this.filters.prioridade,
            minValue: this.filters.minValue,
            period: {
                dateFrom: this.filters.dateFrom,
                dateTo: this.filters.dateTo
            },
            statuses: ['pendente'],
            useDefaultPeriod: false
        });

        return pending.sort((a, b) => {
            const totalDiff = (Number(b._analysisCost ?? b.total) || 0) - (Number(a._analysisCost ?? a.total) || 0);
            if (totalDiff !== 0) {
                return totalDiff;
            }
            return (a._analysisDate?.getTime() || a.createdAt || 0) - (b._analysisDate?.getTime() || b.createdAt || 0);
        });
    },

    getRegionOptions() {
        return DataManager.getTechnicians()
            .map(tech => (tech.regiao || tech.estado || '').trim())
            .filter(Boolean)
            .filter((value, index, array) => array.indexOf(value) === index)
            .sort((a, b) => a.localeCompare(b));
    },

    getSolicitationRegion(sol) {
        const technician = sol?.tecnicoId ? DataManager.getTechnicianById(sol.tecnicoId) : null;
        return (technician?.regiao || technician?.estado || '').trim() || 'Sem região';
    },

    getSolicitationPriority(sol) {
        const total = Number(sol?._analysisCost ?? sol?.total) || 0;
        const waitingHours = Utils.getHoursDiff(sol?._analysisDate?.getTime() || sol?.createdAt || sol?.data, Date.now());
        const slaHours = DataManager.getSettings().slaHours || 24;

        if (total >= 1500 || waitingHours >= slaHours) {
            return 'alta';
        }
        if (total >= 500 || waitingHours >= (slaHours / 2)) {
            return 'media';
        }
        return 'baixa';
    },

    renderPriorityBadge(priority) {
        const config = {
            alta: { label: 'Alta', css: 'danger' },
            media: { label: 'Média', css: 'warning' },
            baixa: { label: 'Baixa', css: 'success' }
        };
        const item = config[priority] || config.media;
        return `<span class="tag-soft ${item.css}">${item.label}</span>`;
    },

    bindFilters() {
        const search = document.getElementById('approval-search');
        if (search) {
            search.addEventListener('input', Utils.debounce(() => this.applyFilters(), 250));
        }

        ['approval-min-value', 'approval-tecnico', 'approval-regiao', 'approval-prioridade', 'approval-date-from', 'approval-date-to'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('change', () => this.applyFilters());
            }
        });
    },

    applyFilters() {
        const normalized = AnalyticsHelper.buildFilterState({
            search: document.getElementById('approval-search')?.value || '',
            minValue: document.getElementById('approval-min-value')?.value || '',
            tecnico: document.getElementById('approval-tecnico')?.value || '',
            regiao: document.getElementById('approval-regiao')?.value || '',
            prioridade: document.getElementById('approval-prioridade')?.value || '',
            dateFrom: document.getElementById('approval-date-from')?.value || '',
            dateTo: document.getElementById('approval-date-to')?.value || ''
        }, {
            moduleKey: 'aprovacoes',
            defaults: this.getDefaultFilters(),
            useDefaultPeriod: false
        });
        this.filters = {
            ...this.filters,
            search: normalized.search,
            minValue: normalized.minValue === '' ? '' : String(normalized.minValue),
            tecnico: normalized.tecnico,
            regiao: normalized.regiao,
            prioridade: normalized.prioridade,
            dateFrom: normalized.dateFrom,
            dateTo: normalized.dateTo
        };
        this.selectedIds = [];
        this.currentPage = 1;
        this.persistFilters();
        this.refreshTable();
    },

    clearFilters() {
        this.filters = this.getDefaultFilters();
        this.selectedIds = [];
        this.currentPage = 1;
        this.persistFilters();
        this.render();
    },

    /**
     * Refresh table
     */
    refreshTable() {
        const filterPanel = document.getElementById('approval-filter-panel');
        const filterToggle = document.getElementById('approval-filter-panel-toggle');
        if (filterPanel && filterToggle) {
            const hasActive = this.hasActiveFilters();
            filterToggle.textContent = hasActive ? 'Filtros ativos' : 'Filtros';
            filterPanel.open = hasActive;
        }

        const context = document.getElementById('approval-filter-context');
        if (context) {
            context.innerHTML = `
                <span class="helper-text">${this.getResultsSummary()}</span>
                ${this.renderActiveFilterChips()}
            `;
        }
        const container = document.getElementById('approvals-table-container');
        if (container) {
            container.innerHTML = this.renderTable();
        }
        this.updateSelectedCount();
    },

    /**
     * Toggle selection
     */
    toggleSelection(id) {
        const index = this.selectedIds.indexOf(id);
        if (index >= 0) {
            this.selectedIds.splice(index, 1);
        } else {
            this.selectedIds.push(id);
        }
        this.updateSelectedCount();
    },

    /**
     * Toggle select all
     */
    toggleSelectAll() {
        const selectAll = document.getElementById('select-all');
        const checkboxes = document.querySelectorAll('.row-checkbox');
        
        if (selectAll.checked) {
            this.selectedIds = Array.from(checkboxes).map(cb => cb.dataset.id);
        } else {
            this.selectedIds = [];
        }
        
        checkboxes.forEach(cb => {
            cb.checked = selectAll.checked;
        });
        
        this.updateSelectedCount();
    },

    /**
     * Update selected count display
     */
    updateSelectedCount() {
        const countSpan = document.getElementById('selected-count');
        const batchBtn = document.getElementById('batch-approve-btn');
        
        if (countSpan) {
            countSpan.textContent = this.selectedIds.length;
        }
        
        if (batchBtn) {
            batchBtn.disabled = this.selectedIds.length === 0;
        }
    },

    /**
     * Prepare editable copy of solicitation for approval modal
     */
    setEditingSolicitation(sol) {
        this.editingSolicitation = sol ? { 
            ...sol, 
            itens: (sol.itens || []).map(item => ({ ...item }))
        } : null;
        this.recalculateApprovalTotals();
    },

    /**
     * Recalculate totals for approval modal
     */
    recalculateApprovalTotals() {
        if (!this.editingSolicitation) {
            return;
        }
        const desconto = Number(this.editingSolicitation.desconto) || 0;
        const frete = Number(this.editingSolicitation.frete) || 0;
        const subtotal = (this.editingSolicitation.itens || []).reduce((sum, item) => {
            const qty = Number(item.quantidade) || 0;
            const valor = Number(item.valorUnit) || 0;
            return sum + (qty * valor);
        }, 0);
        this.editingSolicitation.subtotal = parseFloat(subtotal.toFixed(2));
        this.editingSolicitation.total = parseFloat((subtotal - desconto + frete).toFixed(2));
    },

    /**
     * Render editable items for approval modal
     */
    renderApprovalItems() {
        const items = (this.editingSolicitation?.itens) || [];
        if (items.length === 0) {
            return '<p class="text-muted">Nenhum item disponível para aprovação.</p>';
        }

        return `
            <div class="table-container compact">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Código</th>
                            <th>Descrição</th>
                            <th style="width: 120px;">Qtd</th>
                            <th>Valor Unit.</th>
                            <th>Total</th>
                            <th style="width: 50px;"></th>
                        </tr>
                    </thead>
                    <tbody>
                        ${items.map((item, idx) => `
                            <tr>
                                <td><strong>${Utils.escapeHtml(item.codigo || '')}</strong></td>
                                <td>${Utils.escapeHtml(item.descricao || '')}</td>
                                <td>
                                    <input type="number" class="form-control" min="1"
                                           value="${item.quantidade}"
                                           onchange="Aprovacoes.updateApprovalItemQuantity(${idx}, this.value)">
                                </td>
                                <td>${Utils.formatCurrency(item.valorUnit || 0)}</td>
                                <td>${Utils.formatCurrency((item.quantidade || 0) * (item.valorUnit || 0))}</td>
                                <td>
                                    <button class="btn-icon" title="Remover" onclick="Aprovacoes.removeApprovalItem(${idx})">
                                        <i class="fas fa-times"></i>
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    /**
     * Update approval items container and totals
     */
    refreshApprovalItems() {
        const container = document.getElementById('approve-items-container');
        if (container) {
            container.innerHTML = this.renderApprovalItems();
        }
        const count = document.getElementById('approve-items-count');
        if (count) {
            count.textContent = (this.editingSolicitation?.itens || []).length;
        }
        this.updateTotalsDisplay();
    },

    /**
     * Update quantity for specific item
     */
    updateApprovalItemQuantity(index, qty) {
        if (!this.editingSolicitation) {
            return;
        }
        const quantity = parseInt(qty, 10);
        if (!quantity || quantity <= 0) {
            this.removeApprovalItem(index);
            return;
        }
        if (this.editingSolicitation.itens[index]) {
            this.editingSolicitation.itens[index].quantidade = quantity;
        }
        this.recalculateApprovalTotals();
        this.refreshApprovalItems();
    },

    /**
     * Remove item from approval list
     */
    removeApprovalItem(index) {
        if (!this.editingSolicitation) {
            return;
        }
        this.editingSolicitation.itens.splice(index, 1);
        this.recalculateApprovalTotals();
        this.refreshApprovalItems();
    },

    /**
     * Render totals section for approval modal
     */
    renderApprovalTotals() {
        if (!this.editingSolicitation) {
            return '';
        }
        return `
            <div class="total-row">
                <span>Subtotal:</span>
                <span>${Utils.formatCurrency(this.editingSolicitation.subtotal || 0)}</span>
            </div>
            <div class="total-row">
                <span>Desconto:</span>
                <span>- ${Utils.formatCurrency(this.editingSolicitation.desconto || 0)}</span>
            </div>
            <div class="total-row">
                <span>Frete:</span>
                <span>+ ${Utils.formatCurrency(this.editingSolicitation.frete || 0)}</span>
            </div>
            <div class="total-row grand-total">
                <span>Total:</span>
                <span>${Utils.formatCurrency(this.editingSolicitation.total || 0)}</span>
            </div>
        `;
    },

    /**
     * Update totals display in modal
     */
    updateTotalsDisplay() {
        const totals = document.getElementById('approve-totals');
        if (totals) {
            totals.innerHTML = this.renderApprovalTotals();
        }
        const totalDisplay = document.getElementById('approve-total-display');
        if (totalDisplay && this.editingSolicitation) {
            totalDisplay.textContent = Utils.formatCurrency(this.editingSolicitation.total || 0);
        }
    },

    /**
     * Open approve modal
     */
    openApproveModal(id) {
        const sol = DataManager.getSolicitationById(id);
        if (!sol) {
            Utils.showToast('Solicitação não encontrada', 'error');
            return;
        }
        
        const suppliers = DataManager.getSuppliers().filter(s => s.ativo !== false);
        this.setEditingSolicitation(sol);
        
        const content = `
            <div class="modal-header">
                <h3>Aprovar Solicitação #${sol.numero}</h3>
                <button class="modal-close" onclick="Utils.closeModal()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <div class="form-row">
                    <div class="form-group">
                        <label>Técnico</label>
                        <p><strong>${Utils.escapeHtml(sol.tecnicoNome)}</strong></p>
                    </div>
                    <div class="form-group">
                        <label>Total</label>
                        <p><strong id="approve-total-display">${Utils.formatCurrency(this.editingSolicitation.total || 0)}</strong></p>
                    </div>
                </div>
                
                <div class="form-group">
                    <label>Itens (<span id="approve-items-count">${(sol.itens || []).length}</span>)</label>
                    <div id="approve-items-container">
                        ${this.renderApprovalItems()}
                    </div>
                    <small class="text-muted">Ajuste as quantidades ou remova itens antes de aprovar.</small>
                </div>

                <div id="approve-totals" class="totals-section">
                    ${this.renderApprovalTotals()}
                </div>

                <div class="form-group">
                    <label for="approve-comment">Comentário (opcional)</label>
                    <textarea id="approve-comment" class="form-control" rows="2" placeholder="Observações para registro interno"></textarea>
                </div>
                
                ${sol.fornecedorId ? (() => {
        const sup = DataManager.getSupplierById(sol.fornecedorId);
        const nome = sup ? sup.nome : (sol.fornecedorId === 'sup-hobart' ? 'Hobart' : 'EBST');
        const isHobart = sol.fornecedorId === 'sup-hobart';
        const iconBg = isHobart ? '#d97706' : '#2563eb';
        const tagBg  = isHobart ? '#fef3c7' : '#dbeafe';
        const tagTxt = isHobart ? '#92400e'  : '#1d4ed8';
        return `
                    <div class="form-group">
                        <label style="font-weight:700;font-size:0.85rem;color:#374151;text-transform:uppercase;letter-spacing:.4px"><i class="fas fa-building" style="margin-right:5px;color:#6b7280"></i>Fornecedor</label>
                        <div style="display:flex;align-items:center;gap:12px;padding:12px 14px;background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:8px">
                            <div style="width:38px;height:38px;border-radius:50%;background:${iconBg};display:flex;align-items:center;justify-content:center;flex-shrink:0">
                                <i class="fas fa-industry" style="color:#fff;font-size:1rem"></i>
                            </div>
                            <div>
                                <div style="font-weight:700;font-size:0.97rem;color:#111">${Utils.escapeHtml(nome)}</div>
                                <div style="font-size:0.75rem;color:#9ca3af;margin-top:1px">Definido pelo técnico na abertura</div>
                            </div>
                            <span style="margin-left:auto;display:inline-flex;align-items:center;gap:4px;background:${tagBg};color:${tagTxt};border-radius:20px;padding:3px 10px;font-size:0.75rem;font-weight:600">
                                <i class="fas fa-lock" style="font-size:0.65rem"></i> Bloqueado
                            </span>
                        </div>
                        <input type="hidden" id="approve-supplier" value="${Utils.escapeHtml(sol.fornecedorId)}">
                    </div>`;
    })() : `
                <div class="form-group">
                    <label for="approve-supplier">Fornecedor * <small class="text-muted">(legado — sem fornecedor pré-definido)</small></label>
                    <select id="approve-supplier" class="form-control" required>
                        <option value="">Selecione um fornecedor...</option>
                        ${suppliers.map(s => `<option value="${s.id}">${Utils.escapeHtml(s.nome)}</option>`).join('')}
                    </select>
                </div>`}

                <input type="hidden" id="approve-id" value="${sol.id}">
            </div>
            <div class="modal-footer">
                <button class="btn btn-outline" onclick="Utils.closeModal()">Cancelar</button>
                <button id="approve-confirm-btn" class="btn btn-success" onclick="Aprovacoes.confirmApprove()">
                    <i class="fas fa-check"></i> Aprovar
                </button>
            </div>
        `;
        
        Utils.showModal(content);
        this.updateTotalsDisplay();
    },

    setActionButtonState(buttonId, isLoading, loadingLabel = 'Processando...') {
        const button = document.getElementById(buttonId);
        if (!button) {
            return;
        }

        if (isLoading) {
            if (!button.dataset.originalLabel) {
                button.dataset.originalLabel = button.innerHTML;
            }
            button.disabled = true;
            button.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${loadingLabel}`;
            return;
        }

        button.disabled = false;
        if (button.dataset.originalLabel) {
            button.innerHTML = button.dataset.originalLabel;
            delete button.dataset.originalLabel;
        }
    },

    /**
     * Confirm approval
     */
    async confirmApprove() {
        if (this.isApproveSubmitting) {
            return;
        }

        const id = document.getElementById('approve-id').value;
        const sol = (this.editingSolicitation && this.editingSolicitation.id === id)
            ? this.editingSolicitation
            : DataManager.getSolicitationById(id);
        // Use pre-selected fornecedorId (set by technician) or fallback to legacy select
        const fornecedorId = sol?.fornecedorId || document.getElementById('approve-supplier')?.value || '';
        const approveComment = document.getElementById('approve-comment')?.value.trim() || '';

        if (!fornecedorId) {
            Utils.showToast('Fornecedor não identificado nesta solicitação', 'warning');
            return;
        }

        if (!sol || !sol.itens || sol.itens.length === 0) {
            Utils.showToast('A solicitação precisa ter pelo menos um item para aprovação', 'warning');
            return;
        }

        this.isApproveSubmitting = true;
        this.setActionButtonState('approve-confirm-btn', true, 'Aprovando...');

        try {
            this.recalculateApprovalTotals();
            const desconto = Number(sol.desconto) || 0;
            const frete = Number(sol.frete) || 0;
            const subtotal = Number(this.editingSolicitation?.subtotal ?? 0);
            const total = Number(this.editingSolicitation?.total ?? 0);

            const currentUser = Auth.getCurrentUser();
            const userName = currentUser?.name || 'Sistema';

            const result = await DataManager.updateSolicitationStatus(id, 'aprovada', {
                fornecedorId,
                approvedAt: Date.now(),
                approvedBy: userName,
                by: userName,
                byUserId: currentUser?.id || null,
                byUsername: currentUser?.username || null,
                byEmail: currentUser?.email || null,
                byRole: currentUser?.role || null,
                itens: this.editingSolicitation?.itens || sol.itens,
                subtotal: parseFloat(subtotal.toFixed(2)),
                desconto,
                frete,
                total,
                approvalComment: approveComment
            });
            const success = result === true || (result && result.success !== false && !result.error);

            if (success) {
                Utils.showToast('Solicitação aprovada com sucesso', 'success');
                Utils.closeModal();

                // Generate PDF automatically
                const updatedSol = result?.solicitation || DataManager.getSolicitationById(id);
                if (updatedSol) {
                    Utils.generatePDF(updatedSol);
                    if (window.SheetIntegration) {
                        const sheetConfig = DataManager.getSettings().sheetIntegration;
                        const recorded = SheetIntegration.recordApproval(updatedSol, { approver: userName, comment: approveComment, config: sheetConfig });
                        if (!recorded) {
                            console.warn('SheetIntegration: failed to record approval for', updatedSol.id);
                        }
                    }

                    this.sendTechnicianApprovalNotification(updatedSol, userName, { silent: false });
                    this.sendSupplierApprovalNotification(updatedSol, userName, { silent: false });
                }

                // Refresh views
                this.editingSolicitation = null;
                this.refreshTable();
                Auth.renderMenu(App.currentPage);
            } else {
                Utils.showToast(result?.message || result?.error || 'Erro ao aprovar solicitação', 'error');
            }
        } finally {
            this.isApproveSubmitting = false;
            this.setActionButtonState('approve-confirm-btn', false);
        }
    },
    getTechnicianNotificationFailureMessage(reason) {
        if (reason === 'missing_email') {
            return 'o técnico solicitante está sem e-mail cadastrado na base de Técnicos.';
        }
        if (reason === 'invalid_email') {
            return 'o e-mail do técnico solicitante está inválido no cadastro de Técnicos.';
        }
        if (reason === 'invalid_technician_link' || reason === 'technician_not_found') {
            return 'não foi possível validar o vínculo da solicitação com o técnico solicitante.';
        }
        return 'houve falha no envio automático. Verifique o log.';
    },

    showManagerCopyNotificationStatus(result, emptyMessage = 'Não há gestor válido configurado para receber a cópia automática.') {
        const managerCopySentCount = Number(result?.managerCopySentCount) || 0;
        const managerCopyFailedCount = Number(result?.managerCopyFailedCount) || 0;
        const managerCopyTotalRecipients = Number(result?.managerCopyTotalRecipients) || 0;

        if (managerCopySentCount > 0) {
            Utils.showToast(`${managerCopySentCount} cópia(s) para gestor enviadas por e-mail.`, 'info');
        } else if (managerCopyTotalRecipients === 0) {
            Utils.showToast(emptyMessage, 'warning');
        }

        if (managerCopyFailedCount > 0) {
            Utils.showToast(`${managerCopyFailedCount} cópia(s) de e-mail para gestor falharam. Verifique o log.`, 'warning');
        }
    },

    sendTechnicianApprovalNotification(solicitation, approvedBy, options = {}) {
        if (!solicitation || typeof Utils.sendApprovalNotificationToTechnician !== 'function') {
            return Promise.resolve({
                success: false,
                sentCount: 0,
                failedCount: solicitation ? 1 : 0,
                totalRecipients: solicitation ? 1 : 0,
                results: []
            });
        }

        const silent = options?.silent === true;
        return Utils.sendApprovalNotificationToTechnician({
            solicitation,
            approvedBy
        }).then((result) => {
            const success = !!result?.success;
            const summary = {
                success,
                sentCount: Number(result?.sentCount) || 0,
                failedCount: Number(result?.failedCount) || 0,
                totalRecipients: Number(result?.totalRecipients) || 0,
                results: Array.isArray(result?.results) ? result.results : [result]
            };

            if (!silent) {
                if (success) {
                    Utils.showToast(`Técnico notificado por e-mail (${result.recipient})`, 'info');
                } else {
                    const reasonMessage = this.getTechnicianNotificationFailureMessage(result?.reason);
                    Utils.showToast(`Solicitação aprovada, mas ${reasonMessage}`, 'warning');
                }
            }

            return summary;
        }).catch((error) => {
            if (typeof Logger !== 'undefined' && typeof Logger.warn === 'function') {
                Logger.warn(Logger.CATEGORY.APPROVAL, 'technician_approval_email_dispatch', {
                    eventType: 'aprovação',
                    solicitationNumber: solicitation?.numero || null,
                    success: false,
                    sentAt: new Date().toISOString(),
                    error: error?.message || 'unknown_error'
                });
            }

            if (!silent) {
                Utils.showToast('Solicitação aprovada, mas houve falha no envio de e-mail para o técnico.', 'warning');
            }

            return {
                success: false,
                sentCount: 0,
                failedCount: 1,
                totalRecipients: 1,
                results: []
            };
        });
    },

    sendTechnicianRejectionNotification(solicitation, rejectedBy, rejectionReason, options = {}) {
        if (!solicitation || typeof Utils.sendRejectionNotificationToTechnician !== 'function') {
            return Promise.resolve({
                success: false,
                sentCount: 0,
                failedCount: solicitation ? 1 : 0,
                totalRecipients: solicitation ? 1 : 0,
                results: []
            });
        }

        const silent = options?.silent === true;
        return Utils.sendRejectionNotificationToTechnician({
            solicitation,
            rejectedBy,
            rejectionReason
        }).then((result) => {
            const success = !!result?.success;
            const summary = {
                success,
                sentCount: Number(result?.sentCount) || 0,
                failedCount: Number(result?.failedCount) || 0,
                totalRecipients: Number(result?.totalRecipients) || 0,
                results: Array.isArray(result?.results) ? result.results : [result]
            };

            if (!silent) {
                if (success) {
                    Utils.showToast(`Técnico notificado da rejeição por e-mail (${result.recipient})`, 'info');
                    this.showManagerCopyNotificationStatus(result);
                } else {
                    this.showManagerCopyNotificationStatus(result);
                    const reasonMessage = this.getTechnicianNotificationFailureMessage(result?.reason);
                    Utils.showToast(`Solicitação rejeitada, mas ${reasonMessage}`, 'warning');
                }
            }

            return summary;
        }).catch((error) => {
            if (typeof Logger !== 'undefined' && typeof Logger.warn === 'function') {
                Logger.warn(Logger.CATEGORY.APPROVAL, 'technician_rejection_email_dispatch', {
                    eventType: 'rejeição',
                    solicitationNumber: solicitation?.numero || null,
                    success: false,
                    sentAt: new Date().toISOString(),
                    error: error?.message || 'unknown_error'
                });
            }

            if (!silent) {
                Utils.showToast('Solicitação rejeitada, mas houve falha no envio de e-mail para o técnico.', 'warning');
            }

            return {
                success: false,
                sentCount: 0,
                failedCount: 1,
                totalRecipients: 1,
                results: []
            };
        });
    },

    sendSupplierApprovalNotification(solicitation, approvedBy, options = {}) {
        if (!solicitation || typeof Utils.sendSupplierApprovalEmail !== 'function') {
            return Promise.resolve({
                success: false,
                sentCount: 0,
                failedCount: 0,
                totalRecipients: 0,
                results: []
            });
        }

        const silent = options?.silent === true;
        return Utils.sendSupplierApprovalEmail({
            solicitation,
            approvedBy
        }).then((summary) => {
            const sentCount = Number(summary?.sentCount) || 0;
            const failedCount = Number(summary?.failedCount) || 0;
            const totalRecipients = Number(summary?.totalRecipients) || (sentCount + failedCount);
            const missingSupplierEmail = summary?.reason === 'missing_supplier_email_configuration';

            if (!silent) {
                if (missingSupplierEmail) {
                    Utils.showToast('Aprovação concluída, mas o fornecedor selecionado está sem e-mail cadastrado. O gestor foi avisado para correção.', 'warning');
                } else if (totalRecipients === 0) {
                    Utils.showToast('Aprovação concluída. Nenhum destinatário de fornecedor válido para notificação.', 'warning');
                } else {
                    if (sentCount > 0) {
                        Utils.showToast(`${sentCount} destinatário(s) de fornecedor notificado(s) por e-mail.`, 'info');
                    }
                    if (failedCount > 0) {
                        Utils.showToast(`${failedCount} envio(s) de e-mail para fornecedor falharam. Verifique o log.`, 'warning');
                    }
                }
                this.showManagerCopyNotificationStatus(
                    summary,
                    'Aprovação concluída, mas não há gestor válido configurado para receber a cópia automática.'
                );
            }

            return {
                success: failedCount === 0,
                sentCount,
                failedCount,
                totalRecipients,
                results: Array.isArray(summary?.results) ? summary.results : []
            };
        }).catch((error) => {
            if (typeof Logger !== 'undefined' && typeof Logger.warn === 'function') {
                Logger.warn(Logger.CATEGORY.APPROVAL, 'supplier_approval_email_dispatch', {
                    eventType: 'aprovação',
                    solicitationNumber: solicitation?.numero || null,
                    success: false,
                    sentAt: new Date().toISOString(),
                    error: error?.message || 'unknown_error'
                });
            }

            if (!silent) {
                Utils.showToast('Aprovação concluída. Falha ao processar notificação dos fornecedores por e-mail.', 'warning');
            }

            return {
                success: false,
                sentCount: 0,
                failedCount: 1,
                totalRecipients: 1,
                results: []
            };
        });
    },
    /**
     * Open reject modal
     */
    openRejectModal(id) {
        const sol = DataManager.getSolicitationById(id);
        if (!sol) {
            Utils.showToast('Solicitação não encontrada', 'error');
            return;
        }
        
        const content = `
            <div class="modal-header">
                <h3>Rejeitar Solicitação #${sol.numero}</h3>
                <button class="modal-close" onclick="Utils.closeModal()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <div class="form-row">
                    <div class="form-group">
                        <label>Técnico</label>
                        <p><strong>${Utils.escapeHtml(sol.tecnicoNome)}</strong></p>
                    </div>
                    <div class="form-group">
                        <label>Total</label>
                        <p><strong>${Utils.formatCurrency(sol.total)}</strong></p>
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="reject-reason">Motivo da Rejeição *</label>
                    <textarea id="reject-reason" class="form-control" rows="3" required
                              placeholder="Informe o motivo da rejeição..."></textarea>
                </div>
                
                <input type="hidden" id="reject-id" value="${sol.id}">
            </div>
            <div class="modal-footer">
                <button class="btn btn-outline" onclick="Utils.closeModal()">Cancelar</button>
                <button id="reject-confirm-btn" class="btn btn-danger" onclick="Aprovacoes.confirmReject()">
                    <i class="fas fa-times"></i> Rejeitar
                </button>
            </div>
        `;
        
        Utils.showModal(content);
    },

    /**
     * Confirm rejection
     */
    async confirmReject() {
        if (this.isRejectSubmitting) {
            return;
        }

        const id = document.getElementById('reject-id').value;
        const reason = document.getElementById('reject-reason').value.trim();

        if (!reason) {
            Utils.showToast('Informe o motivo da rejeição', 'warning');
            return;
        }

        this.isRejectSubmitting = true;
        this.setActionButtonState('reject-confirm-btn', true, 'Rejeitando...');

        try {
            const currentUser = Auth.getCurrentUser();
            const userName = currentUser?.name || 'Sistema';

            const result = await DataManager.updateSolicitationStatus(id, 'rejeitada', {
                rejectionReason: reason,
                rejectedAt: Date.now(),
                rejectedBy: userName,
                by: userName,
                byUserId: currentUser?.id || null,
                byUsername: currentUser?.username || null,
                byEmail: currentUser?.email || null,
                byRole: currentUser?.role || null
            });
            const success = result === true || (result && result.success !== false && !result.error);

            if (success) {
                Utils.showToast('Solicitação rejeitada', 'success');
                Utils.closeModal();

                const updatedSol = result?.solicitation || DataManager.getSolicitationById(id);
                if (updatedSol) {
                    this.sendTechnicianRejectionNotification(updatedSol, userName, reason, { silent: false });
                }

                this.refreshTable();
                Auth.renderMenu(App.currentPage);
            } else {
                Utils.showToast(result?.message || result?.error || 'Erro ao rejeitar solicitação', 'error');
            }
        } finally {
            this.isRejectSubmitting = false;
            this.setActionButtonState('reject-confirm-btn', false);
        }
    },

    /**
     * Batch approve
     */
    async batchApprove() {
        if (this.selectedIds.length === 0) {
            Utils.showToast('Selecione pelo menos uma solicitação', 'warning');
            return;
        }
        
        const suppliers = DataManager.getSuppliers().filter(s => s.ativo !== false);
        
        const content = `
            <div class="modal-header">
                <h3>Aprovar ${this.selectedIds.length} Solicitações</h3>
                <button class="modal-close" onclick="Utils.closeModal()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <p>Você está prestes a aprovar <strong>${this.selectedIds.length}</strong> solicitações.</p>
                
                <div class="form-group">
                    <label for="batch-supplier">Fornecedor *</label>
                    <select id="batch-supplier" class="form-control" required>
                        <option value="">Selecione um fornecedor...</option>
                        ${suppliers.map(s => 
        `<option value="${s.id}">${Utils.escapeHtml(s.nome)}</option>`
    ).join('')}
                    </select>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-outline" onclick="Utils.closeModal()">Cancelar</button>
                <button id="batch-approve-confirm-btn" class="btn btn-success" onclick="Aprovacoes.confirmBatchApprove()">
                    <i class="fas fa-check-double"></i> Aprovar Todas
                </button>
            </div>
        `;
        
        Utils.showModal(content);
    },

    /**
     * Confirm batch approve
     */
    async confirmBatchApprove() {
        if (this.isBatchApproveSubmitting) {
            return;
        }

        const fornecedorId = document.getElementById('batch-supplier').value;

        if (!fornecedorId) {
            Utils.showToast('Selecione um fornecedor', 'warning');
            return;
        }

        this.isBatchApproveSubmitting = true;
        this.setActionButtonState('batch-approve-confirm-btn', true, 'Aprovando...');

        try {
            const currentUser = Auth.getCurrentUser();
            const userName = currentUser?.name || 'Sistema';
            const emailPromises = [];
            let failed = 0;

            let approved = 0;

            for (const id of this.selectedIds) {
                const result = await DataManager.updateSolicitationStatus(id, 'aprovada', {
                    fornecedorId,
                    approvedAt: Date.now(),
                    approvedBy: userName,
                    by: userName,
                    byUserId: currentUser?.id || null,
                    byUsername: currentUser?.username || null,
                    byEmail: currentUser?.email || null,
                    byRole: currentUser?.role || null,
                    approvalComment: 'Aprovação em lote'
                });
                const success = result === true || (result && result.success !== false && !result.error);

                if (success) {
                    approved++;

                    // Generate PDF for each
                    const sol = result?.solicitation || DataManager.getSolicitationById(id);
                    if (sol) {
                        Utils.generatePDF(sol);
                        if (window.SheetIntegration) {
                            const sheetConfig = DataManager.getSettings().sheetIntegration;
                            const recorded = SheetIntegration.recordApproval(sol, { approver: userName, comment: 'Aprovação em lote', config: sheetConfig });
                            if (!recorded) {
                                console.warn('SheetIntegration: failed to record approval for', sol.id);
                            }
                        }

                        emailPromises.push(this.sendTechnicianApprovalNotification(sol, userName, { silent: true }));
                        emailPromises.push(this.sendSupplierApprovalNotification(sol, userName, { silent: true }));
                    }
                } else {
                    failed++;
                }
            }

            if (approved > 0) {
                Utils.showToast(`${approved} solicitações aprovadas com sucesso`, 'success');
            }
            if (failed > 0) {
                Utils.showToast(`${failed} solicitação(ões) não puderam ser aprovadas. Revise conflitos ou conectividade.`, 'warning');
            }
            if (emailPromises.length > 0) {
                Promise.allSettled(emailPromises).then((results) => {
                    const summary = results.reduce((acc, result) => {
                        if (result.status === 'fulfilled' && result.value) {
                            acc.sentCount += Number(result.value.sentCount) || 0;
                            acc.failedCount += Number(result.value.failedCount) || 0;
                            acc.totalRecipients += Number(result.value.totalRecipients) || 0;
                            return acc;
                        }

                        acc.failedCount += 1;
                        acc.totalRecipients += 1;
                        return acc;
                    }, { sentCount: 0, failedCount: 0, totalRecipients: 0 });

                    if (summary.totalRecipients === 0) {
                        Utils.showToast('Aprovações concluídas. Nenhum destinatário válido para notificação.', 'warning');
                        return;
                    }

                    if (summary.sentCount > 0) {
                        Utils.showToast(`${summary.sentCount} notificação(ões) por e-mail enviada(s).`, 'info');
                    }
                    if (summary.failedCount > 0) {
                        Utils.showToast(`${summary.failedCount} notificação(ões) por e-mail falharam. Verifique o log.`, 'warning');
                    }
                });
            }
            Utils.closeModal();

            this.selectedIds = [];
            this.refreshTable();
            Auth.renderMenu(App.currentPage);
        } finally {
            this.isBatchApproveSubmitting = false;
            this.setActionButtonState('batch-approve-confirm-btn', false);
        }
    }
};

if (typeof window !== 'undefined') {
    window.Aprovacoes = Aprovacoes;
}



























