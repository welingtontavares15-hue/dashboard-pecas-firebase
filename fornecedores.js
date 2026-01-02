/**
 * Fornecedores (Suppliers) Module
 * Handles CRUD operations for suppliers
 */

const Fornecedores = {
    currentPage: 1,
    itemsPerPage: 10,
    searchQuery: '',

    /**
     * Render suppliers page
     */
    render() {
        const content = document.getElementById('content-area');
        const canCreate = Auth.hasPermission('fornecedores', 'create');
        
        content.innerHTML = `
            <div class="page-header">
                <h2><i class="fas fa-truck"></i> Fornecedores</h2>
                ${canCreate ? `
                    <button class="btn btn-success" onclick="Fornecedores.openForm()">
                        <i class="fas fa-plus"></i> Novo Fornecedor
                    </button>
                ` : ''}
            </div>
            
            <!-- Filters -->
            <div class="filters-bar">
                <div class="search-box">
                    <input type="text" id="supplier-search" class="form-control" 
                           placeholder="Buscar por nome, email ou CNPJ..." 
                           value="${Utils.escapeHtml(this.searchQuery)}">
                    <button class="btn btn-primary" onclick="Fornecedores.search()">
                        <i class="fas fa-search"></i>
                    </button>
                </div>
            </div>
            
            <!-- Suppliers Table -->
            <div class="card">
                <div class="card-body">
                    <div id="supplier-table-container">
                        ${this.renderTable()}
                    </div>
                </div>
            </div>
        `;
        
        // Set up search on enter
        document.getElementById('supplier-search').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.search();
        });
        
        // Debounced search
        document.getElementById('supplier-search').addEventListener('input', Utils.debounce(() => {
            this.searchQuery = document.getElementById('supplier-search').value;
            this.currentPage = 1;
            this.refreshTable();
        }, 300));
    },

    /**
     * Render suppliers table
     */
    renderTable() {
        let suppliers = DataManager.getSuppliers();
        
        // Apply search filter
        if (this.searchQuery) {
            const query = Utils.normalizeText(this.searchQuery);
            suppliers = suppliers.filter(s => 
                Utils.normalizeText(s.nome).includes(query) ||
                Utils.normalizeText(s.email).includes(query) ||
                Utils.normalizeText(s.cnpj).includes(query)
            );
        }
        
        const total = suppliers.length;
        const totalPages = Math.ceil(total / this.itemsPerPage);
        const start = (this.currentPage - 1) * this.itemsPerPage;
        const paginated = suppliers.slice(start, start + this.itemsPerPage);
        
        if (suppliers.length === 0) {
            return `
                <div class="empty-state">
                    <i class="fas fa-truck"></i>
                    <h4>Nenhum fornecedor encontrado</h4>
                    <p>${this.searchQuery ? 'Tente uma busca diferente.' : 'Cadastre o primeiro fornecedor.'}</p>
                </div>
            `;
        }
        
        const canEdit = Auth.hasPermission('fornecedores', 'edit');
        const canDelete = Auth.hasPermission('fornecedores', 'delete');
        
        return `
            <div class="table-info">
                Exibindo ${start + 1}-${Math.min(start + this.itemsPerPage, total)} de ${total} fornecedores
            </div>
            <div class="table-container">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Nome</th>
                            <th>Email</th>
                            <th>Telefone</th>
                            <th>CNPJ</th>
                            <th>Status</th>
                            ${canEdit || canDelete ? '<th>Ações</th>' : ''}
                        </tr>
                    </thead>
                    <tbody>
                        ${paginated.map(supplier => `
                            <tr>
                                <td><strong>${Utils.escapeHtml(supplier.nome)}</strong></td>
                                <td>
                                    <a href="mailto:${Utils.escapeHtml(supplier.email)}">
                                        ${Utils.escapeHtml(supplier.email)}
                                    </a>
                                </td>
                                <td>${Utils.escapeHtml(supplier.telefone || '-')}</td>
                                <td>${Utils.escapeHtml(supplier.cnpj || '-')}</td>
                                <td>
                                    ${supplier.ativo !== false 
                                        ? '<span class="status-badge status-aprovada"><i class="fas fa-check"></i> Ativo</span>'
                                        : '<span class="status-badge status-rejeitada"><i class="fas fa-times"></i> Inativo</span>'
                                    }
                                </td>
                                ${canEdit || canDelete ? `
                                    <td>
                                        <div class="actions">
                                            ${canEdit ? `
                                                <button class="btn btn-sm btn-outline" onclick="Fornecedores.openForm('${supplier.id}')" title="Editar">
                                                    <i class="fas fa-edit"></i>
                                                </button>
                                            ` : ''}
                                            ${canDelete ? `
                                                <button class="btn btn-sm btn-danger" onclick="Fornecedores.confirmDelete('${supplier.id}')" title="Excluir">
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
        const container = document.getElementById('supplier-table-container');
        if (container) {
            container.innerHTML = this.renderTable();
        }
    },

    /**
     * Search
     */
    search() {
        this.searchQuery = document.getElementById('supplier-search').value;
        this.currentPage = 1;
        this.refreshTable();
    },

    /**
     * Open supplier form
     */
    openForm(id = null) {
        const supplier = id ? DataManager.getSupplierById(id) : null;
        const isEdit = !!supplier;
        
        const content = `
            <div class="modal-header">
                <h3>${isEdit ? 'Editar Fornecedor' : 'Novo Fornecedor'}</h3>
                <button class="modal-close" onclick="Utils.closeModal()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <form id="supplier-form">
                    <input type="hidden" id="supplier-id" value="${supplier?.id || ''}">
                    
                    <div class="form-group">
                        <label for="supplier-nome">Nome *</label>
                        <input type="text" id="supplier-nome" class="form-control" 
                               value="${Utils.escapeHtml(supplier?.nome || '')}" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="supplier-email">Email *</label>
                        <input type="email" id="supplier-email" class="form-control" 
                               value="${Utils.escapeHtml(supplier?.email || '')}" required>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="supplier-telefone">Telefone</label>
                            <input type="text" id="supplier-telefone" class="form-control" 
                                   value="${Utils.escapeHtml(supplier?.telefone || '')}"
                                   placeholder="(00) 0000-0000">
                        </div>
                        <div class="form-group">
                            <label for="supplier-cnpj">CNPJ</label>
                            <input type="text" id="supplier-cnpj" class="form-control" 
                                   value="${Utils.escapeHtml(supplier?.cnpj || '')}"
                                   placeholder="00.000.000/0000-00">
                        </div>
                    </div>
                    
                    <div class="form-check">
                        <input type="checkbox" id="supplier-ativo" ${supplier?.ativo !== false ? 'checked' : ''}>
                        <label for="supplier-ativo">Fornecedor ativo</label>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button class="btn btn-outline" onclick="Utils.closeModal()">Cancelar</button>
                <button class="btn btn-primary" onclick="Fornecedores.save()">
                    <i class="fas fa-save"></i> Salvar
                </button>
            </div>
        `;
        
        Utils.showModal(content);
    },

    /**
     * Save supplier
     */
    save() {
        const id = document.getElementById('supplier-id').value;
        const nome = document.getElementById('supplier-nome').value.trim();
        const email = document.getElementById('supplier-email').value.trim();
        const telefone = document.getElementById('supplier-telefone').value.trim();
        const cnpj = document.getElementById('supplier-cnpj').value.trim();
        const ativo = document.getElementById('supplier-ativo').checked;
        
        if (!nome || !email) {
            Utils.showToast('Preencha todos os campos obrigatórios', 'warning');
            return;
        }
        
        if (!Utils.isValidEmail(email)) {
            Utils.showToast('Email inválido', 'warning');
            return;
        }
        
        // Validate CNPJ if provided
        if (cnpj && !Utils.isValidCNPJ(cnpj)) {
            Utils.showToast('CNPJ inválido', 'warning');
            return;
        }
        
        const supplier = {
            id: id || null,
            nome,
            email,
            telefone: telefone ? Utils.formatPhone(telefone) : '',
            cnpj: cnpj ? Utils.formatCNPJ(cnpj) : '',
            ativo
        };
        
        DataManager.saveSupplier(supplier);
        
        Utils.showToast(id ? 'Fornecedor atualizado com sucesso' : 'Fornecedor cadastrado com sucesso', 'success');
        Utils.closeModal();
        this.refreshTable();
    },

    /**
     * Confirm delete
     */
    async confirmDelete(id) {
        const supplier = DataManager.getSupplierById(id);
        if (!supplier) return;
        
        // Check if supplier is used in any solicitation
        const solicitations = DataManager.getSolicitations().filter(s => s.fornecedorId === id);
        
        if (solicitations.length > 0) {
            Utils.showToast(`Este fornecedor está vinculado a ${solicitations.length} solicitação(ões) e não pode ser excluído`, 'error');
            return;
        }
        
        const confirmed = await Utils.confirm(
            `Deseja realmente excluir o fornecedor "${supplier.nome}"?`,
            'Excluir Fornecedor'
        );
        
        if (confirmed) {
            supplier.ativo = false;
            DataManager.saveSupplier(supplier);
            Utils.showToast('Fornecedor inativado com sucesso', 'success');
            this.refreshTable();
        }
    }
};
