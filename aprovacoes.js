/**
 * Aprovações (Approvals) Module
 * Handles approval/rejection workflow for gestors and administrators
 */

const Aprovacoes = {
    currentPage: 1,
    itemsPerPage: 10,
    selectedIds: [],
    editingSolicitation: null,

    /**
     * Render approvals page
     */
    render() {
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
            
            <!-- Pending Count Alert -->
            ${pending.length > 0 ? `
                <div class="alert alert-warning mb-3" style="display: flex; align-items: center; gap: 1rem; padding: 1rem; background-color: rgba(255, 193, 7, 0.1); border-left: 4px solid var(--warning-color); border-radius: var(--radius-md);">
                    <i class="fas fa-clock" style="font-size: 1.5rem; color: var(--warning-color);"></i>
                    <div>
                        <strong>${pending.length} solicitação(ões) aguardando aprovação</strong>
                        <p class="mb-0 text-muted" style="font-size: 0.875rem;">
                            SLA: ${DataManager.getSettings().slaHours || 24} horas
                        </p>
                    </div>
                </div>
            ` : ''}
            
            <!-- Approvals Table -->
            <div class="card">
                <div class="card-body">
                    <div id="approvals-table-container">
                        ${this.renderTable()}
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Render approvals table
     */
    renderTable() {
        const pending = DataManager.getPendingSolicitations()
            .sort((a, b) => a.createdAt - b.createdAt); // Oldest first (FIFO)
        
        if (pending.length === 0) {
            return `
                <div class="empty-state">
                    <i class="fas fa-check-circle"></i>
                    <h4>Nenhuma solicitação pendente</h4>
                    <p>Todas as solicitações foram processadas.</p>
                </div>
            `;
        }
        
        const total = pending.length;
        const totalPages = Math.ceil(total / this.itemsPerPage);
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
                            <th>Data</th>
                            <th>Itens</th>
                            <th>Total</th>
                            <th>Tempo Aguardando</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${paginated.map(sol => {
                            const waitingHours = Utils.getHoursDiff(sol.createdAt, Date.now());
                            const isOverSLA = waitingHours > slaHours;
                            
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
                                    <td>${Utils.escapeHtml(sol.tecnicoNome)}</td>
                                    <td>${Utils.formatDate(sol.data)}</td>
                                    <td>${(sol.itens || []).length} itens</td>
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

    /**
     * Refresh table
     */
    refreshTable() {
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
        if (!this.editingSolicitation) return;
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
        if (!this.editingSolicitation) return;
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
        if (!this.editingSolicitation) return;
        this.editingSolicitation.itens.splice(index, 1);
        this.recalculateApprovalTotals();
        this.refreshApprovalItems();
    },

    /**
     * Render totals section for approval modal
     */
    renderApprovalTotals() {
        if (!this.editingSolicitation) return '';
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
                    <label for="approve-supplier">Fornecedor *</label>
                    <select id="approve-supplier" class="form-control" required>
                        <option value="">Selecione um fornecedor...</option>
                        ${suppliers.map(s => 
                            `<option value="${s.id}">${Utils.escapeHtml(s.nome)}</option>`
                        ).join('')}
                    </select>
                </div>
                
                <input type="hidden" id="approve-id" value="${sol.id}">
            </div>
            <div class="modal-footer">
                <button class="btn btn-outline" onclick="Utils.closeModal()">Cancelar</button>
                <button class="btn btn-success" onclick="Aprovacoes.confirmApprove()">
                    <i class="fas fa-check"></i> Aprovar
                </button>
            </div>
        `;
        
        Utils.showModal(content);
        this.updateTotalsDisplay();
    },

    /**
     * Confirm approval
     */
    confirmApprove() {
        const id = document.getElementById('approve-id').value;
        const fornecedorId = document.getElementById('approve-supplier').value;
        const sol = (this.editingSolicitation && this.editingSolicitation.id === id) 
            ? this.editingSolicitation 
            : DataManager.getSolicitationById(id);
        
        if (!fornecedorId) {
            Utils.showToast('Selecione um fornecedor', 'warning');
            return;
        }

        if (!sol || !sol.itens || sol.itens.length === 0) {
            Utils.showToast('A solicitação precisa ter pelo menos um item para aprovação', 'warning');
            return;
        }

        this.recalculateApprovalTotals();
        const desconto = Number(sol.desconto) || 0;
        const frete = Number(sol.frete) || 0;
        const subtotal = Number(this.editingSolicitation?.subtotal ?? 0);
        const total = Number(this.editingSolicitation?.total ?? 0);
        
        const currentUser = Auth.getCurrentUser();
        const userName = currentUser?.name || 'Sistema';
        
        const success = DataManager.updateSolicitationStatus(id, 'aprovada', {
            fornecedorId,
            approvedAt: Date.now(),
            approvedBy: userName,
            by: userName,
            itens: this.editingSolicitation?.itens || sol.itens,
            subtotal: parseFloat(subtotal.toFixed(2)),
            desconto,
            frete,
            total
        });
        
        if (success) {
            Utils.showToast('Solicitação aprovada com sucesso', 'success');
            Utils.closeModal();
            
            // Generate PDF automatically
            const updatedSol = DataManager.getSolicitationById(id);
            if (updatedSol) {
                Utils.generatePDF(updatedSol);
            }
            
            // Refresh views
            this.editingSolicitation = null;
            this.refreshTable();
            Auth.renderMenu(App.currentPage);
        } else {
            Utils.showToast('Erro ao aprovar solicitação', 'error');
        }
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
                <button class="btn btn-danger" onclick="Aprovacoes.confirmReject()">
                    <i class="fas fa-times"></i> Rejeitar
                </button>
            </div>
        `;
        
        Utils.showModal(content);
    },

    /**
     * Confirm rejection
     */
    confirmReject() {
        const id = document.getElementById('reject-id').value;
        const reason = document.getElementById('reject-reason').value.trim();
        
        if (!reason) {
            Utils.showToast('Informe o motivo da rejeição', 'warning');
            return;
        }
        
        const currentUser = Auth.getCurrentUser();
        const userName = currentUser?.name || 'Sistema';
        
        const success = DataManager.updateSolicitationStatus(id, 'rejeitada', {
            rejectionReason: reason,
            rejectedAt: Date.now(),
            rejectedBy: userName,
            by: userName
        });
        
        if (success) {
            Utils.showToast('Solicitação rejeitada', 'success');
            Utils.closeModal();
            this.refreshTable();
            Auth.renderMenu(App.currentPage);
        } else {
            Utils.showToast('Erro ao rejeitar solicitação', 'error');
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
                <button class="btn btn-success" onclick="Aprovacoes.confirmBatchApprove()">
                    <i class="fas fa-check-double"></i> Aprovar Todas
                </button>
            </div>
        `;
        
        Utils.showModal(content);
    },

    /**
     * Confirm batch approve
     */
    confirmBatchApprove() {
        const fornecedorId = document.getElementById('batch-supplier').value;
        
        if (!fornecedorId) {
            Utils.showToast('Selecione um fornecedor', 'warning');
            return;
        }
        
        const currentUser = Auth.getCurrentUser();
        const userName = currentUser?.name || 'Sistema';
        
        let approved = 0;
        
        this.selectedIds.forEach(id => {
            const success = DataManager.updateSolicitationStatus(id, 'aprovada', {
                fornecedorId,
                approvedAt: Date.now(),
                approvedBy: userName,
                by: userName
            });
            
            if (success) {
                approved++;
                
                // Generate PDF for each
                const sol = DataManager.getSolicitationById(id);
                if (sol) {
                    Utils.generatePDF(sol);
                }
            }
        });
        
        Utils.showToast(`${approved} solicitações aprovadas com sucesso`, 'success');
        Utils.closeModal();
        
        this.selectedIds = [];
        this.refreshTable();
        Auth.renderMenu(App.currentPage);
    }
};
