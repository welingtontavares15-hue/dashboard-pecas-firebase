/**
 * Solicitações (Solicitations) Module
 * Handles CRUD operations for parts requests
 */

const Solicitacoes = {
    currentPage: 1,
    itemsPerPage: 10,
    filters: {
        status: '',
        tecnico: '',
        dateFrom: '',
        dateTo: '',
        search: ''
    },

    // Current solicitation being edited
    currentSolicitation: null,
    autocompleteInstance: null,

    /**
     * Render solicitations list
     */
    render() {
        const content = document.getElementById('content-area');
        const canCreate = Auth.hasPermission('solicitacoes', 'create');
        const isTecnico = Auth.getRole() === 'tecnico';
        const canExport = !!(window && window.XLSX);
        const exportAttrs = canExport ? '' : 'disabled aria-disabled="true"';
        const exportTitle = canExport ? '' : 'title="Exportação indisponível: biblioteca XLSX não carregada"';
        
        content.innerHTML = `
            <div class="page-header">
                <h2><i class="fas fa-clipboard-list"></i> ${isTecnico ? 'Minhas Solicitações' : 'Solicitações'}</h2>
                <div class="btn-group">
                    ${canCreate ? `
                        <button class="btn btn-success" onclick="Solicitacoes.openForm()">
                            <i class="fas fa-plus"></i> Nova Solicitação
                        </button>
                    ` : ''}
                    <button class="btn btn-outline" ${exportAttrs} ${exportTitle} onclick="Solicitacoes.exportList()">
                        <i class="fas fa-file-excel"></i> Exportar
                    </button>
                </div>
            </div>
            ${canExport ? '' : '<p class="text-muted mt-1 helper-text">Para exportar, certifique-se de que a biblioteca XLSX esteja disponível.</p>'}
            
            <!-- Filters -->
            <div class="filters-bar">
                <div class="search-box">
                    <input type="text" id="sol-search" class="form-control" 
                           placeholder="Buscar por número..." 
                           value="${Utils.escapeHtml(this.filters.search)}">
                    <button class="btn btn-primary" onclick="Solicitacoes.applyFilters()">
                        <i class="fas fa-search"></i>
                    </button>
                </div>
                <div class="filter-group">
                    <label>Status:</label>
                    <select id="sol-status-filter" class="form-control">
                        <option value="">Todos</option>
                        <option value="rascunho" ${this.filters.status === 'rascunho' ? 'selected' : ''}>Rascunho</option>
                        <option value="pendente" ${this.filters.status === 'pendente' ? 'selected' : ''}>Pendente</option>
                        <option value="aprovada" ${this.filters.status === 'aprovada' ? 'selected' : ''}>Aprovada</option>
                        <option value="rejeitada" ${this.filters.status === 'rejeitada' ? 'selected' : ''}>Rejeitada</option>
                        <option value="em-transito" ${this.filters.status === 'em-transito' ? 'selected' : ''}>Rastreio</option>
                        <option value="entregue" ${this.filters.status === 'entregue' ? 'selected' : ''}>Entregue</option>
                        <option value="finalizada" ${this.filters.status === 'finalizada' ? 'selected' : ''}>Finalizada</option>
                        <option value="historico-manual" ${this.filters.status === 'historico-manual' ? 'selected' : ''}>Histórico/Manual</option>
                    </select>
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
            
            <!-- Solicitations Table -->
            <div class="card">
                <div class="card-body">
                    <div id="sol-table-container">
                        ${this.renderTable()}
                    </div>
                </div>
            </div>
        `;
        
        // Set up search on enter
        document.getElementById('sol-search').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.applyFilters();
            }
        });
        
        // Auto-apply filters on change
        ['sol-status-filter', 'sol-date-from', 'sol-date-to'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('change', () => this.applyFilters());
            }
        });
        
        if (!isTecnico) {
            const tecnicoFilter = document.getElementById('sol-tecnico-filter');
            if (tecnicoFilter) {
                tecnicoFilter.addEventListener('change', () => this.applyFilters());
            }
        }
    },

    /**
     * Render solicitations table
     */
    renderTable() {
        const solicitations = this.getFilteredSolicitations();
        
        const total = solicitations.length;
        const totalPages = Math.ceil(total / this.itemsPerPage);
        const start = (this.currentPage - 1) * this.itemsPerPage;
        const paginated = solicitations.slice(start, start + this.itemsPerPage);
        
        if (solicitations.length === 0) {
            return `
                <div class="empty-state">
                    <i class="fas fa-clipboard-list"></i>
                    <h4>Nenhuma solicitação encontrada</h4>
                    <p>${Object.values(this.filters).some(Boolean) ? 'Tente ajustar os filtros.' : 'Crie sua primeira solicitação.'}</p>
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
        const canManageTracking = Auth.hasPermission('aprovacoes', 'approve');
        const isTecnico = Auth.getRole() === 'tecnico';
        const currentTecnicoId = Auth.getTecnicoId();
        
        return `
            <div class="table-info">
                Exibindo ${start + 1}-${Math.min(start + this.itemsPerPage, total)} de ${total} solicitações
            </div>
            <div class="table-container">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Número</th>
                            <th>Técnico</th>
                            <th>Data</th>
                            <th>Itens</th>
                            <th>Total</th>
                            <th>Status</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${paginated.map(sol => `
                            <tr>
                                <td><strong>#${sol.numero}</strong></td>
                                <td>${Utils.escapeHtml(sol.tecnicoNome)}</td>
                                <td>${Utils.formatDate(sol.data)}</td>
                                <td>${(sol.itens || []).length} itens</td>
                                <td>${Utils.formatCurrency(sol.total)}</td>
                                <td>${Utils.renderStatusBadge(sol.status)}</td>
                                <td>
                                    <div class="actions">
                                        <button class="btn btn-sm btn-outline" onclick="Solicitacoes.viewDetails('${sol.id}')" title="Visualizar">
                                            <i class="fas fa-eye"></i>
                                        </button>
                                        ${canEdit && (sol.status === 'rascunho' || sol.status === 'pendente') ? `
                                            <button class="btn btn-sm btn-outline" onclick="Solicitacoes.openForm('${sol.id}')" title="Editar">
                                                <i class="fas fa-edit"></i>
                                            </button>
                                        ` : ''}
                                        <button class="btn btn-sm btn-outline" onclick="Solicitacoes.duplicate('${sol.id}')" title="Duplicar">
                                            <i class="fas fa-copy"></i>
                                        </button>
                                        ${canManageTracking && (sol.status === 'aprovada' || sol.status === 'em-transito') ? `
                                            <button class="btn btn-sm btn-outline" onclick="Solicitacoes.openTrackingModal('${sol.id}')" title="${sol.trackingCode ? 'Atualizar rastreio' : 'Registrar rastreio'}">
                                                <i class="fas fa-truck"></i>
                                            </button>
                                        ` : ''}
                                        ${canApprove && sol.status === 'pendente' ? `
                                            <button class="btn btn-sm btn-success" onclick="Aprovacoes.openApproveModal('${sol.id}')" title="Aprovar">
                                                <i class="fas fa-check"></i>
                                            </button>
                                        ` : ''}
                                        ${isTecnico && sol.tecnicoId === currentTecnicoId && sol.status === 'em-transito' ? `
                                            <button class="btn btn-sm btn-success" onclick="Solicitacoes.confirmDelivery('${sol.id}')" title="Confirmar entrega">
                                                <i class="fas fa-check-circle"></i>
                                            </button>
                                        ` : ''}
                                        <button class="btn btn-sm btn-outline" onclick="Solicitacoes.downloadPDF('${sol.id}')" title="PDF">
                                            <i class="fas fa-file-pdf"></i>
                                        </button>
                                        ${canDelete && sol.status === 'rascunho' ? `
                                            <button class="btn btn-sm btn-danger" onclick="Solicitacoes.confirmDelete('${sol.id}')" title="Excluir">
                                                <i class="fas fa-trash"></i>
                                            </button>
                                        ` : ''}
                                    </div>
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

    /**
     * Get filtered solicitations
     */
    getFilteredSolicitations() {
        let solicitations = DataManager.getSolicitations();
        
        // Filter by technician if user is a technician
        if (Auth.getRole() === 'tecnico') {
            const tecnicoId = Auth.getTecnicoId();
            solicitations = solicitations.filter(s => s.tecnicoId === tecnicoId);
        }
        
        // Apply filters
        if (this.filters.status) {
            solicitations = solicitations.filter(s => s.status === this.filters.status);
        }
        
        if (this.filters.tecnico) {
            solicitations = solicitations.filter(s => s.tecnicoId === this.filters.tecnico);
        }
        
        if (this.filters.search) {
            const search = Utils.normalizeText(this.filters.search);
            solicitations = solicitations.filter(s => 
                Utils.normalizeText(s.numero).includes(search)
            );
        }
        
        if (this.filters.dateFrom) {
            const from = Utils.parseAsLocalDate(this.filters.dateFrom);
            solicitations = solicitations.filter(s => Utils.parseAsLocalDate(s.data) >= from);
        }
        
        if (this.filters.dateTo) {
            const to = Utils.parseAsLocalDate(this.filters.dateTo);
            to.setHours(23, 59, 59, 999);
            solicitations = solicitations.filter(s => Utils.parseAsLocalDate(s.data) <= to);
        }
        
        // Sort by date descending
        return solicitations.sort((a, b) => b.createdAt - a.createdAt);
    },

    /**
     * Apply filters
     */
    applyFilters() {
        this.filters.search = document.getElementById('sol-search').value;
        this.filters.status = document.getElementById('sol-status-filter').value;
        this.filters.dateFrom = document.getElementById('sol-date-from').value;
        this.filters.dateTo = document.getElementById('sol-date-to').value;
        
        const tecnicoFilter = document.getElementById('sol-tecnico-filter');
        if (tecnicoFilter) {
            this.filters.tecnico = tecnicoFilter.value;
        }
        
        this.currentPage = 1;
        this.refreshTable();
    },

    /**
     * Clear filters
     */
    clearFilters() {
        this.filters = { status: '', tecnico: '', dateFrom: '', dateTo: '', search: '' };
        this.currentPage = 1;
        this.render();
    },

    /**
     * Refresh table
     */
    refreshTable() {
        const container = document.getElementById('sol-table-container');
        if (container) {
            container.innerHTML = this.renderTable();
        }
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
        
        const supplier = sol.fornecedorId ? DataManager.getSupplierById(sol.fornecedorId) : null;
        const canManageTracking = Auth.hasPermission('aprovacoes', 'approve');
        const canConfirmDelivery = Auth.getRole() === 'tecnico' && sol.tecnicoId === Auth.getTecnicoId();
        
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
                        <p>${Utils.renderStatusBadge(sol.status)}</p>
                    </div>
                </div>
                
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
                            ${canManageTracking && (sol.status === 'aprovada' || sol.status === 'em-transito') ? `
                                <button class="btn btn-sm btn-outline" onclick="Solicitacoes.openTrackingModal('${sol.id}')">
                                    <i class="fas fa-truck"></i> ${sol.trackingCode ? 'Atualizar' : 'Registrar'} Rastreio
                                </button>
                            ` : ''}
                            ${canConfirmDelivery && sol.status === 'em-transito' ? `
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
                
                <!-- Status History -->
                ${(sol.statusHistory && sol.statusHistory.length > 0) ? `
                    <h4 class="mt-4 mb-2">Histórico</h4>
                    <div class="timeline">
                        ${sol.statusHistory.map(h => `
                            <div class="timeline-item">
                                <div class="timeline-marker"></div>
                                <div class="timeline-content">
                                    <strong>${Utils.getStatusInfo(h.status).label}</strong>
                                    por ${Utils.escapeHtml(h.by)}
                                    <div class="timeline-date">${Utils.formatDate(h.at, true)}</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
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
        if (!Auth.hasPermission('aprovacoes', 'approve')) {
            Utils.showToast('Você não tem permissão para registrar rastreio', 'error');
            return;
        }

        const sol = DataManager.getSolicitationById(id);
        if (!sol) {
            Utils.showToast('Solicitação não encontrada', 'error');
            return;
        }

        if (!['aprovada', 'em-transito'].includes(sol.status)) {
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
    saveTracking() {
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

        const currentUser = Auth.getCurrentUser();
        const userName = currentUser?.name || 'Sistema';

        const success = DataManager.updateSolicitationStatus(id, 'em-transito', {
            trackingCode,
            trackingUpdatedAt: Date.now(),
            trackingBy: userName,
            by: userName
        });

        if (success) {
            Utils.showToast('Rastreio salvo com sucesso', 'success');
            Utils.closeModal();
            this.refreshTable();
            Auth.renderMenu(App.currentPage);
        } else {
            Utils.showToast('Erro ao salvar rastreio', 'error');
        }
    },

    /**
     * Confirm delivery by technician
     */
    async confirmDelivery(id) {
        const sol = DataManager.getSolicitationById(id);
        if (!sol) {
            Utils.showToast('Solicitação não encontrada', 'error');
            return;
        }

        if (!(Auth.getRole() === 'tecnico' && sol.tecnicoId === Auth.getTecnicoId())) {
            Utils.showToast('Apenas o técnico responsável pode confirmar a entrega', 'warning');
            return;
        }

        if (sol.status !== 'em-transito') {
            Utils.showToast('Confirme a entrega somente após o envio pelo fornecedor', 'warning');
            return;
        }

        const confirmed = await Utils.confirm('Confirmar que o material foi entregue?', 'Confirmar Entrega');
        if (!confirmed) {
            return;
        }

        const currentUser = Auth.getCurrentUser();
        const userName = currentUser?.name || 'Sistema';

        const success = DataManager.updateSolicitationStatus(id, 'entregue', {
            deliveredAt: Date.now(),
            deliveredBy: userName,
            by: userName
        });

        if (success) {
            Utils.showToast('Entrega confirmada', 'success');
            Utils.closeModal();
            this.refreshTable();
            Auth.renderMenu(App.currentPage);
        } else {
            Utils.showToast('Não foi possível atualizar o status', 'error');
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
            observacoes: '',
            itens: [],
            subtotal: 0,
            desconto: 0,
            frete: 0,
            total: 0,
            status: 'rascunho'
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
                    </div>
                    
                    <!-- Parts Selection with Auto-complete -->
                    <div class="form-group">
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
                <button class="btn btn-secondary" onclick="Solicitacoes.saveSolicitation('rascunho')">
                    <i class="fas fa-save"></i> Salvar Rascunho
                </button>
                <button class="btn btn-primary" onclick="Solicitacoes.saveSolicitation('pendente')">
                    <i class="fas fa-paper-plane"></i> Enviar para Aprovação
                </button>
            </div>
        `;
        
        Utils.showModal(content, { size: 'lg' });
        
        // Initialize auto-complete
        setTimeout(() => {
            this.autocompleteInstance = Pecas.createAutocomplete('parts-autocomplete', {
                tecnicoId: this.currentSolicitation.tecnicoId,
                onSelect: (part) => this.addItem(part)
            });
        }, 100);
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
    saveSolicitation(status = 'rascunho') {
        const tecnicoId = document.getElementById('sol-tecnico').value;
        const dataInput = document.getElementById('sol-data').value;
        const observacoes = (document.getElementById('sol-observacoes').value || '').trim();
        
        if (!tecnicoId) {
            Utils.showToast('Selecione um técnico', 'warning');
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
        
        // Update technician name
        const tech = DataManager.getTechnicianById(tecnicoId);
        const currentUser = Auth.getCurrentUser();
        const userName = currentUser?.name || 'Sistema';
        
        const solicitation = {
            ...this.currentSolicitation,
            tecnicoId,
            tecnicoNome: tech?.nome || this.currentSolicitation.tecnicoNome,
            data: normalizedDate,
            observacoes,
            status,
            createdBy: userName
        };
        
        // Add status history entry
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
        
        const result = DataManager.saveSolicitation(solicitation);
        
        // Handle both boolean and object return types for backward compatibility
        const saved = result === true || (result && result.success !== false && !result.error);
        
        if (!saved) {
            const errorMsg = (result && result.error === 'conflict') 
                ? 'Conflito de versão. Recarregue a página e tente novamente.'
                : 'Erro ao salvar solicitação';
            Utils.showToast(errorMsg, 'error');
            return;
        }
        
        Utils.showToast(
            status === 'pendente' 
                ? 'Solicitação enviada para aprovação' 
                : 'Rascunho salvo com sucesso', 
            'success'
        );
        
        Utils.closeModal();
        
        // Refresh the list
        if (document.getElementById('sol-table-container')) {
            this.refreshTable();
        }
        
        // Update menu badge
        Auth.renderMenu(App.currentPage);
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
            observacoes: sol.observacoes,
            itens: sol.itens.map(item => ({ ...item })),
            subtotal: sol.subtotal,
            desconto: sol.desconto,
            frete: sol.frete,
            total: sol.total,
            status: 'rascunho'
        };
        
        // Open the form with duplicated data
        this.openForm();
        
        Utils.showToast('Solicitação duplicada. Faça as alterações necessárias.', 'info');
    },

    /**
     * Download PDF
     */
    async downloadPDF(id) {
        const sol = DataManager.getSolicitationById(id);
        if (!sol) {
            Utils.showToast('Solicitação não encontrada', 'error');
            return;
        }
        
        await Utils.generatePDF(sol);
        Utils.showToast('PDF gerado com sucesso', 'success');
    },

    /**
     * Confirm delete
     */
    async confirmDelete(id) {
        const sol = DataManager.getSolicitationById(id);
        if (!sol) {
            return;
        }
        
        const confirmed = await Utils.confirm(
            `Deseja realmente excluir a solicitação #${sol.numero}?`,
            'Excluir Solicitação'
        );
        
        if (confirmed) {
            DataManager.deleteSolicitation(id);
            Utils.showToast('Solicitação excluída com sucesso', 'success');
            this.refreshTable();
            Auth.renderMenu(App.currentPage);
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
