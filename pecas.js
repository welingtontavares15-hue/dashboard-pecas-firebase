/**
 * Peças (Parts) Module
 * Handles parts catalog with scalable auto-complete (20k+ items support)
 */

const Pecas = {
    currentPage: 1,
    itemsPerPage: 10,
    searchQuery: '',
    categoryFilter: '',

    /**
     * Render parts catalog page
     */
    render() {
        const content = document.getElementById('content-area');
        const canEdit = Auth.hasPermission('pecas', 'create');
        
        content.innerHTML = `
            <div class="page-header">
                <h2><i class="fas fa-cogs"></i> Catálogo de Peças</h2>
                <div class="btn-group">
                    ${canEdit ? `
                        <button class="btn btn-success" onclick="Pecas.openForm()">
                            <i class="fas fa-plus"></i> Nova Peça
                        </button>
                        <button class="btn btn-outline" onclick="Pecas.openImportModal()">
                            <i class="fas fa-file-import"></i> Importar
                        </button>
                    ` : ''}
                    <button class="btn btn-outline" onclick="Pecas.exportCatalog()">
                        <i class="fas fa-file-export"></i> Exportar
                    </button>
                </div>
            </div>
            
            <!-- Filters -->
            <div class="filters-bar">
                <div class="search-box">
                    <input type="text" id="parts-search" class="form-control" 
                           placeholder="Buscar por código ou descrição..." 
                           value="${Utils.escapeHtml(this.searchQuery)}">
                    <button class="btn btn-primary" onclick="Pecas.search()">
                        <i class="fas fa-search"></i>
                    </button>
                </div>
                <div class="filter-group">
                    <label>Categoria:</label>
                    <select id="category-filter" class="form-control" onchange="Pecas.filterByCategory()">
                        <option value="">Todas</option>
                        ${this.getCategoryOptions()}
                    </select>
                </div>
            </div>
            
            <!-- Parts Table -->
            <div class="card">
                <div class="card-body">
                    <div id="parts-table-container">
                        ${this.renderTable()}
                    </div>
                </div>
            </div>
        `;
        
        // Set up search debounce
        const searchInput = document.getElementById('parts-search');
        searchInput.addEventListener('input', Utils.debounce(() => {
            this.searchQuery = searchInput.value;
            this.currentPage = 1;
            this.refreshTable();
        }, 300));
        
        // Enter key search
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.search();
            }
        });
        
        // Set category filter value
        document.getElementById('category-filter').value = this.categoryFilter;
    },

    /**
     * Get category options
     */
    getCategoryOptions() {
        const parts = DataManager.getParts();
        const categories = [...new Set(parts.map(p => p.categoria).filter(Boolean))].sort();
        return categories.map(cat => 
            `<option value="${Utils.escapeHtml(cat)}" ${this.categoryFilter === cat ? 'selected' : ''}>
                ${Utils.escapeHtml(cat)}
            </option>`
        ).join('');
    },

    /**
     * Render parts table
     */
    renderTable() {
        let parts = DataManager.getParts();
        
        // Apply search filter
        if (this.searchQuery) {
            const query = Utils.normalizeText(this.searchQuery);
            parts = parts.filter(p => 
                Utils.normalizeText(p.codigo).includes(query) ||
                Utils.normalizeText(p.descricao).includes(query)
            );
        }
        
        // Apply category filter
        if (this.categoryFilter) {
            parts = parts.filter(p => p.categoria === this.categoryFilter);
        }
        
        const total = parts.length;
        const totalPages = Math.ceil(total / this.itemsPerPage);
        const start = (this.currentPage - 1) * this.itemsPerPage;
        const paginated = parts.slice(start, start + this.itemsPerPage);
        
        if (parts.length === 0) {
            return `
                <div class="empty-state">
                    <i class="fas fa-cogs"></i>
                    <h4>Nenhuma peça encontrada</h4>
                    <p>${this.searchQuery ? 'Tente uma busca diferente.' : 'O catálogo está vazio.'}</p>
                </div>
            `;
        }
        
        const canEdit = Auth.hasPermission('pecas', 'edit');
        const canDelete = Auth.hasPermission('pecas', 'delete');
        
        return `
            <div class="table-info">
                Exibindo ${start + 1}-${Math.min(start + this.itemsPerPage, total)} de ${total} peças
            </div>
            <div class="table-container">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Código</th>
                            <th>Descrição</th>
                            <th>Categoria</th>
                            <th>Valor</th>
                            <th>Unidade</th>
                            ${canEdit || canDelete ? '<th>Ações</th>' : ''}
                        </tr>
                    </thead>
                    <tbody>
                        ${paginated.map(part => `
                            <tr>
                                <td><strong>${Utils.escapeHtml(part.codigo)}</strong></td>
                                <td>${Utils.escapeHtml(part.descricao)}</td>
                                <td>${Utils.escapeHtml(part.categoria || '-')}</td>
                                <td>${Utils.formatCurrency(part.valor)}</td>
                                <td>${Utils.escapeHtml(part.unidade || 'UN')}</td>
                                ${canEdit || canDelete ? `
                                    <td>
                                        <div class="actions">
                                            ${canEdit ? `
                                                <button class="btn btn-sm btn-outline" onclick="Pecas.openForm('${part.id}')" title="Editar">
                                                    <i class="fas fa-edit"></i>
                                                </button>
                                            ` : ''}
                                            ${canDelete ? `
                                                <button class="btn btn-sm btn-danger" onclick="Pecas.confirmDelete('${part.id}')" title="Excluir">
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
        const container = document.getElementById('parts-table-container');
        if (container) {
            container.innerHTML = this.renderTable();
        }
    },

    /**
     * Search parts
     */
    search() {
        const searchInput = document.getElementById('parts-search');
        this.searchQuery = searchInput.value;
        this.currentPage = 1;
        this.refreshTable();
    },

    /**
     * Filter by category
     */
    filterByCategory() {
        const select = document.getElementById('category-filter');
        this.categoryFilter = select.value;
        this.currentPage = 1;
        this.refreshTable();
    },

    /**
     * Open part form modal
     */
    openForm(id = null) {
        const part = id ? DataManager.getPartById(id) : null;
        const isEdit = !!part;
        
        const categories = ['Elétrica', 'Mecânica', 'Hidráulica', 'Eletrônica', 'Pneumática', 'Segurança', 'Química', 'Ferramental', 'Geral'];
        
        const content = `
            <div class="modal-header">
                <h3>${isEdit ? 'Editar Peça' : 'Nova Peça'}</h3>
                <button class="modal-close" onclick="Utils.closeModal()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <form id="part-form">
                    <input type="hidden" id="part-id" value="${part?.id || ''}">
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="part-codigo">Código *</label>
                            <input type="text" id="part-codigo" class="form-control" 
                                   value="${Utils.escapeHtml(part?.codigo || '')}" required>
                        </div>
                        <div class="form-group">
                            <label for="part-categoria">Categoria</label>
                            <select id="part-categoria" class="form-control">
                                ${categories.map(cat => 
        `<option value="${cat}" ${part?.categoria === cat ? 'selected' : ''}>${cat}</option>`
    ).join('')}
                            </select>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="part-descricao">Descrição *</label>
                        <input type="text" id="part-descricao" class="form-control" 
                               value="${Utils.escapeHtml(part?.descricao || '')}" required>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="part-valor">Valor Unitário *</label>
                            <input type="number" id="part-valor" class="form-control" 
                                   step="0.01" min="0" value="${part?.valor || 0}" required>
                        </div>
                        <div class="form-group">
                            <label for="part-unidade">Unidade</label>
                            <select id="part-unidade" class="form-control">
                                <option value="UN" ${part?.unidade === 'UN' ? 'selected' : ''}>UN - Unidade</option>
                                <option value="PC" ${part?.unidade === 'PC' ? 'selected' : ''}>PC - Peça</option>
                                <option value="CX" ${part?.unidade === 'CX' ? 'selected' : ''}>CX - Caixa</option>
                                <option value="KG" ${part?.unidade === 'KG' ? 'selected' : ''}>KG - Quilograma</option>
                                <option value="MT" ${part?.unidade === 'MT' ? 'selected' : ''}>MT - Metro</option>
                                <option value="LT" ${part?.unidade === 'LT' ? 'selected' : ''}>LT - Litro</option>
                            </select>
                        </div>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button class="btn btn-outline" onclick="Utils.closeModal()">Cancelar</button>
                <button class="btn btn-primary" onclick="Pecas.savePart()">
                    <i class="fas fa-save"></i> Salvar
                </button>
            </div>
        `;
        
        Utils.showModal(content);
    },

    /**
     * Save part
     */
    savePart() {
        const id = document.getElementById('part-id').value;
        const codigo = (document.getElementById('part-codigo').value || '').trim().toUpperCase();
        const descricao = (document.getElementById('part-descricao').value || '').replace(/\s+/g, ' ').trim();
        const categoria = (document.getElementById('part-categoria').value || '').trim();
        const valorInput = (document.getElementById('part-valor').value || '').toString().replace(',', '.');
        const valor = parseFloat(valorInput);
        const unidade = (document.getElementById('part-unidade').value || '').trim();
        
        if (!codigo || !descricao) {
            Utils.showToast('Preencha todos os campos obrigatórios', 'warning');
            return;
        }
        if (!Number.isFinite(valor) || valor <= 0) {
            Utils.showToast('Informe um valor unitário válido e maior que zero', 'warning');
            return;
        }
        
        const part = {
            id: id || null,
            codigo,
            descricao,
            categoria,
            valor,
            unidade,
            ativo: true
        };
        
        const result = DataManager.savePart(part);
        
        if (result.success) {
            Utils.showToast(id ? 'Peça atualizada com sucesso' : 'Peça cadastrada com sucesso', 'success');
            Utils.closeModal();
            this.refreshTable();
        } else {
            Utils.showToast(result.error || 'Erro ao salvar peça', 'error');
        }
    },

    /**
     * Confirm delete
     */
    async confirmDelete(id) {
        const part = DataManager.getPartById(id);
        if (!part) {
            return;
        }
        
        // Check if part is used in any solicitation
        const solicitations = DataManager.getSolicitations();
        const usedInSolicitations = solicitations.filter(sol => 
            (sol.itens || []).some(item => item.codigo === part.codigo)
        );
        
        if (usedInSolicitations.length > 0) {
            Utils.showToast(`Esta peça está sendo usada em ${usedInSolicitations.length} solicitação(ões) e não pode ser excluída`, 'error');
            return;
        }
        
        const confirmed = await Utils.confirm(
            `Deseja realmente excluir a peça "${part.codigo}"?`,
            'Excluir Peça'
        );
        
        if (confirmed) {
            part.ativo = false;
            DataManager.savePart(part);
            Utils.showToast('Peça inativada com sucesso', 'success');
            this.refreshTable();
        }
    },

    /**
     * Open import modal
     */
    openImportModal() {
        const content = `
            <div class="modal-header">
                <h3>Importar Peças</h3>
                <button class="modal-close" onclick="Utils.closeModal()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label>Selecione um arquivo CSV ou Excel (XLSX)</label>
                    <input type="file" id="import-file" class="form-control" accept=".csv,.xlsx,.xls">
                </div>
                <div class="mt-3">
                    <p class="text-muted"><strong>Formato esperado:</strong></p>
                    <ul class="text-muted" style="font-size: 0.85rem;">
                        <li>Coluna: <code>codigo</code> - Código da peça (obrigatório)</li>
                        <li>Coluna: <code>descricao</code> - Descrição (obrigatório)</li>
                        <li>Coluna: <code>categoria</code> - Categoria</li>
                        <li>Coluna: <code>valor</code> - Valor unitário</li>
                        <li>Coluna: <code>unidade</code> - Unidade de medida</li>
                    </ul>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-outline" onclick="Utils.closeModal()">Cancelar</button>
                <button class="btn btn-primary" onclick="Pecas.processImport()">
                    <i class="fas fa-upload"></i> Importar
                </button>
            </div>
        `;
        
        Utils.showModal(content);
    },

    /**
     * Process import
     */
    async processImport() {
        const fileInput = document.getElementById('import-file');
        const file = fileInput.files[0];
        
        if (!file) {
            Utils.showToast('Selecione um arquivo', 'warning');
            return;
        }
        
        try {
            Utils.showLoading();
            const data = await Utils.parseImportFile(file);
            const result = DataManager.importParts(data);
            Utils.hideLoading();
            
            let message = `Importação concluída: ${result.imported} novas, ${result.updated} atualizadas`;
            if (result.errors.length > 0) {
                message += `, ${result.errors.length} erros`;
            }
            
            Utils.showToast(message, result.errors.length > 0 ? 'warning' : 'success');
            Utils.closeModal();
            this.refreshTable();
        } catch (error) {
            Utils.hideLoading();
            Utils.showToast(`Erro na importação: ${error.message}`, 'error');
        }
    },

    /**
     * Export catalog
     */
    exportCatalog() {
        const parts = DataManager.getParts();
        
        if (parts.length === 0) {
            Utils.showToast('Não há peças para exportar', 'warning');
            return;
        }
        
        const data = parts.map(p => ({
            codigo: p.codigo,
            descricao: p.descricao,
            categoria: p.categoria || '',
            valor: p.valor,
            unidade: p.unidade || 'UN'
        }));
        
        Utils.exportToExcel(data, 'catalogo_pecas.xlsx', 'Peças');
        Utils.showToast('Catálogo exportado com sucesso', 'success');
    },

    // ========== AUTO-COMPLETE COMPONENT ==========
    
    /**
     * Create auto-complete component for part selection
     * Scalable for 20k+ items with debounce, pagination, and virtualization
     */
    createAutocomplete(containerId, options = {}) {
        const container = document.getElementById(containerId);
        if (!container) {
            return;
        }
        
        const tecnicoId = options.tecnicoId || Auth.getTecnicoId();
        const onSelect = options.onSelect || (() => {});
        
        container.innerHTML = `
            <div class="autocomplete-container">
                <input type="text" id="${containerId}-input" class="form-control autocomplete-input" 
                       placeholder="Digite código ou descrição da peça..." autocomplete="off">
                <div id="${containerId}-dropdown" class="autocomplete-dropdown hidden"></div>
            </div>
            ${tecnicoId ? `
                <div class="recent-items" id="${containerId}-recent">
                    <div class="recent-items-title">
                        <i class="fas fa-history"></i> Peças recentes
                    </div>
                    <div class="recent-items-list" id="${containerId}-recent-list"></div>
                </div>
            ` : ''}
        `;
        
        const input = document.getElementById(`${containerId}-input`);
        const dropdown = document.getElementById(`${containerId}-dropdown`);
        let selectedIndex = -1;
        let currentResults = [];
        let _isLoading = false;
        
        // Load recent parts
        if (tecnicoId) {
            this.renderRecentParts(containerId, tecnicoId, onSelect);
        }
        
        // Debounced search
        const debouncedSearch = Utils.debounce((query) => {
            if (query.length < 1) {
                dropdown.classList.add('hidden');
                return;
            }
            
            _isLoading = true;
            dropdown.classList.remove('hidden');
            dropdown.innerHTML = `
                <div class="autocomplete-loading">
                    <i class="fas fa-spinner fa-spin"></i> Buscando...
                </div>
            `;
            
            // Simulate async for large datasets (actual search is sync but this provides UX feedback)
            setTimeout(() => {
                const result = DataManager.searchParts(query, 1, 30);
                currentResults = result.items;
                selectedIndex = -1;
                _isLoading = false;
                
                if (result.items.length === 0) {
                    dropdown.innerHTML = `
                        <div class="autocomplete-empty">
                            <i class="fas fa-search"></i> Nenhum resultado encontrado
                        </div>
                    `;
                } else {
                    this.renderDropdownItems(dropdown, result.items, selectedIndex, onSelect, containerId, tecnicoId);
                    
                    if (result.total > 30) {
                        dropdown.innerHTML += `
                            <div class="autocomplete-empty">
                                Mostrando 30 de ${result.total} resultados. Digite mais para refinar.
                            </div>
                        `;
                    }
                }
            }, 50);
        }, 250);
        
        // Input event
        input.addEventListener('input', (e) => {
            debouncedSearch(e.target.value);
        });
        
        // Keyboard navigation
        input.addEventListener('keydown', (e) => {
            if (!currentResults.length) {
                return;
            }
            
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                selectedIndex = Math.min(selectedIndex + 1, currentResults.length - 1);
                this.updateSelection(dropdown, selectedIndex);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                selectedIndex = Math.max(selectedIndex - 1, 0);
                this.updateSelection(dropdown, selectedIndex);
            } else if (e.key === 'Enter' && selectedIndex >= 0) {
                e.preventDefault();
                const part = currentResults[selectedIndex];
                this.selectPart(part, input, dropdown, onSelect, tecnicoId);
            } else if (e.key === 'Escape') {
                dropdown.classList.add('hidden');
                selectedIndex = -1;
            }
        });
        
        // Focus events
        input.addEventListener('focus', () => {
            if (input.value.length >= 1 && currentResults.length > 0) {
                dropdown.classList.remove('hidden');
            }
        });
        
        // Click outside to close
        document.addEventListener('click', (e) => {
            if (!container.contains(e.target)) {
                dropdown.classList.add('hidden');
            }
        });
        
        return {
            clear: () => {
                input.value = '';
                dropdown.classList.add('hidden');
                currentResults = [];
                selectedIndex = -1;
            },
            focus: () => input.focus()
        };
    },

    /**
     * Render dropdown items
     */
    renderDropdownItems(dropdown, items, selectedIndex, onSelect, containerId, tecnicoId) {
        dropdown.innerHTML = items.map((part, idx) => `
            <div class="autocomplete-item ${idx === selectedIndex ? 'selected' : ''}" 
                 data-index="${idx}"
                 onclick="Pecas.handleItemClick(event, ${idx})">
                <span class="autocomplete-item-code">${Utils.escapeHtml(part.codigo)}</span>
                <span class="autocomplete-item-desc">${Utils.escapeHtml(part.descricao)}</span>
                <span class="autocomplete-item-price">${Utils.formatCurrency(part.valor)}</span>
            </div>
        `).join('');
        
        // Store references for click handler
        dropdown._items = items;
        dropdown._onSelect = onSelect;
        dropdown._containerId = containerId;
        dropdown._tecnicoId = tecnicoId;
    },

    /**
     * Handle item click
     */
    handleItemClick(event, index) {
        const dropdown = event.target.closest('.autocomplete-dropdown');
        const part = dropdown._items[index];
        const _container = document.getElementById(dropdown._containerId);
        const input = document.getElementById(`${dropdown._containerId}-input`);
        
        this.selectPart(part, input, dropdown, dropdown._onSelect, dropdown._tecnicoId);
    },

    /**
     * Update selection highlight
     */
    updateSelection(dropdown, selectedIndex) {
        dropdown.querySelectorAll('.autocomplete-item').forEach((item, idx) => {
            item.classList.toggle('selected', idx === selectedIndex);
        });
        
        // Scroll into view
        const selected = dropdown.querySelector('.autocomplete-item.selected');
        if (selected) {
            selected.scrollIntoView({ block: 'nearest' });
        }
    },

    /**
     * Select a part
     */
    selectPart(part, input, dropdown, onSelect, tecnicoId) {
        input.value = '';
        dropdown.classList.add('hidden');
        
        // Add to recent parts
        if (tecnicoId) {
            DataManager.addRecentPart(tecnicoId, part.codigo);
        }
        
        // Call callback
        onSelect(part);
    },

    /**
     * Render recent parts
     */
    renderRecentParts(containerId, tecnicoId, onSelect) {
        const listContainer = document.getElementById(`${containerId}-recent-list`);
        if (!listContainer) {
            return;
        }
        
        const recentCodes = DataManager.getRecentParts(tecnicoId);
        const parts = DataManager.getParts();
        
        const recentParts = recentCodes
            .map(code => parts.find(p => p.codigo === code))
            .filter(Boolean)
            .slice(0, 10);
        
        if (recentParts.length === 0) {
            document.getElementById(`${containerId}-recent`).classList.add('hidden');
            return;
        }
        
        listContainer.innerHTML = recentParts.map(part => `
            <span class="recent-item-chip" onclick="Pecas.selectRecentPart('${containerId}', '${part.codigo}')" 
                  title="${Utils.escapeHtml(part.descricao)}">
                ${Utils.escapeHtml(part.codigo)}
            </span>
        `).join('');
        
        // Store reference for selection
        listContainer._onSelect = onSelect;
    },

    /**
     * Select recent part
     */
    selectRecentPart(containerId, codigo) {
        const listContainer = document.getElementById(`${containerId}-recent-list`);
        const part = DataManager.getPartByCode(codigo);
        
        if (part && listContainer._onSelect) {
            listContainer._onSelect(part);
        }
    }
};
