/**
 * Técnicos (Technicians) Module
 * Handles CRUD operations for technicians
 */

const Tecnicos = {
    currentPage: 1,
    itemsPerPage: 10,
    searchQuery: '',

    /**
     * Render technicians page
     */
    render() {
        const content = document.getElementById('content-area');
        const canCreate = Auth.hasPermission('tecnicos', 'create');
        
        content.innerHTML = `
            <div class="page-header">
                <h2><i class="fas fa-users"></i> Técnicos</h2>
                ${canCreate ? `
                    <button class="btn btn-success" onclick="Tecnicos.openForm()">
                        <i class="fas fa-plus"></i> Novo Técnico
                    </button>
                ` : ''}
            </div>
            
            <!-- Filters -->
            <div class="filters-bar">
                <div class="search-box">
                    <input type="text" id="tech-search" class="form-control" 
                           placeholder="Buscar por nome, email ou região..." 
                           value="${Utils.escapeHtml(this.searchQuery)}">
                    <button class="btn btn-primary" onclick="Tecnicos.search()">
                        <i class="fas fa-search"></i>
                    </button>
                </div>
            </div>
            
            <!-- Technicians Table -->
            <div class="card">
                <div class="card-body">
                    <div id="tech-table-container">
                        ${this.renderTable()}
                    </div>
                </div>
            </div>
        `;
        
        // Set up search on enter
        document.getElementById('tech-search').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.search();
        });
        
        // Debounced search
        document.getElementById('tech-search').addEventListener('input', Utils.debounce(() => {
            this.searchQuery = document.getElementById('tech-search').value;
            this.currentPage = 1;
            this.refreshTable();
        }, 300));
    },

    /**
     * Render technicians table
     */
    renderTable() {
        let technicians = DataManager.getTechnicians();
        
        // Apply search filter
        if (this.searchQuery) {
            const query = Utils.normalizeText(this.searchQuery);
            technicians = technicians.filter(t => 
                Utils.normalizeText(t.nome).includes(query) ||
                Utils.normalizeText(t.email).includes(query) ||
                Utils.normalizeText(t.regiao).includes(query)
            );
        }
        
        const total = technicians.length;
        const totalPages = Math.ceil(total / this.itemsPerPage);
        const start = (this.currentPage - 1) * this.itemsPerPage;
        const paginated = technicians.slice(start, start + this.itemsPerPage);
        
        if (technicians.length === 0) {
            return `
                <div class="empty-state">
                    <i class="fas fa-users"></i>
                    <h4>Nenhum técnico encontrado</h4>
                    <p>${this.searchQuery ? 'Tente uma busca diferente.' : 'Cadastre o primeiro técnico.'}</p>
                </div>
            `;
        }
        
        const canEdit = Auth.hasPermission('tecnicos', 'edit');
        const canDelete = Auth.hasPermission('tecnicos', 'delete');
        
        return `
            <div class="table-info">
                Exibindo ${start + 1}-${Math.min(start + this.itemsPerPage, total)} de ${total} técnicos
            </div>
            <div class="table-container">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Nome</th>
                            <th>Email</th>
                            <th>Telefone</th>
                            <th>Cidade/UF</th>
                            <th>Região</th>
                            <th>Status</th>
                            ${canEdit || canDelete ? '<th>Ações</th>' : ''}
                        </tr>
                    </thead>
                    <tbody>
                        ${paginated.map(tech => `
                            <tr>
                                <td>
                                    <strong>${Utils.escapeHtml(tech.nome)}</strong>
                                    ${tech.username ? `<br><small class="text-muted">@${Utils.escapeHtml(tech.username)}</small>` : ''}
                                </td>
                                <td>
                                    <a href="mailto:${Utils.escapeHtml(tech.email)}">
                                        ${Utils.escapeHtml(tech.email)}
                                    </a>
                                </td>
                                <td>${Utils.escapeHtml(tech.telefone || '-')}</td>
                                <td>${tech.cidade && tech.estado ? Utils.escapeHtml(tech.cidade + '/' + tech.estado) : '-'}</td>
                                <td>${Utils.escapeHtml(tech.regiao || '-')}</td>
                                <td>
                                    ${tech.ativo !== false 
                                        ? '<span class="status-badge status-aprovada"><i class="fas fa-check"></i> Ativo</span>'
                                        : '<span class="status-badge status-rejeitada"><i class="fas fa-times"></i> Inativo</span>'
                                    }
                                </td>
                                ${canEdit || canDelete ? `
                                    <td>
                                        <div class="actions">
                                            ${canEdit ? `
                                                <button class="btn btn-sm btn-outline" onclick="Tecnicos.openForm('${tech.id}')" title="Editar">
                                                    <i class="fas fa-edit"></i>
                                                </button>
                                            ` : ''}
                                            ${canDelete ? `
                                                <button class="btn btn-sm btn-danger" onclick="Tecnicos.confirmDelete('${tech.id}')" title="Excluir">
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
        const container = document.getElementById('tech-table-container');
        if (container) {
            container.innerHTML = this.renderTable();
        }
    },

    /**
     * Search
     */
    search() {
        this.searchQuery = document.getElementById('tech-search').value;
        this.currentPage = 1;
        this.refreshTable();
    },

    /**
     * Open technician form
     */
    openForm(id = null) {
        const tech = id ? DataManager.getTechnicianById(id) : null;
        const isEdit = !!tech;
        
        const regions = ['Norte', 'Sul', 'Leste', 'Oeste', 'Centro', 'Sudeste', 'Nordeste'];
        const states = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];
        
        const content = `
            <div class="modal-header">
                <h3>${isEdit ? 'Editar Técnico' : 'Novo Técnico'}</h3>
                <button class="modal-close" onclick="Utils.closeModal()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <form id="tech-form">
                    <input type="hidden" id="tech-id" value="${tech?.id || ''}">
                    
                    <h4 style="margin-bottom: 1rem; color: var(--primary-color);"><i class="fas fa-user"></i> Dados Pessoais</h4>
                    
                    <div class="form-group">
                        <label for="tech-nome">Nome *</label>
                        <input type="text" id="tech-nome" class="form-control" 
                               value="${Utils.escapeHtml(tech?.nome || '')}" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="tech-email">Email *</label>
                        <input type="email" id="tech-email" class="form-control" 
                               value="${Utils.escapeHtml(tech?.email || '')}" required>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="tech-telefone">Telefone</label>
                            <input type="text" id="tech-telefone" class="form-control" 
                                   value="${Utils.escapeHtml(tech?.telefone || '')}"
                                   placeholder="(00) 00000-0000">
                        </div>
                        <div class="form-group">
                            <label for="tech-regiao">Região</label>
                            <select id="tech-regiao" class="form-control">
                                <option value="">Selecione...</option>
                                ${regions.map(r => 
                                    `<option value="${r}" ${tech?.regiao === r ? 'selected' : ''}>${r}</option>`
                                ).join('')}
                            </select>
                        </div>
                    </div>
                    
                    <h4 style="margin: 1.5rem 0 1rem; color: var(--primary-color);"><i class="fas fa-map-marker-alt"></i> Endereço para Envio</h4>
                    
                    <div class="form-row">
                        <div class="form-group" style="flex: 2;">
                            <label for="tech-endereco">Logradouro *</label>
                            <input type="text" id="tech-endereco" class="form-control" 
                                   value="${Utils.escapeHtml(tech?.endereco || '')}"
                                   placeholder="Rua, Avenida, etc." required>
                        </div>
                        <div class="form-group" style="flex: 1;">
                            <label for="tech-numero">Número</label>
                            <input type="text" id="tech-numero" class="form-control" 
                                   value="${Utils.escapeHtml(tech?.numero || '')}"
                                   placeholder="123">
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="tech-complemento">Complemento</label>
                            <input type="text" id="tech-complemento" class="form-control" 
                                   value="${Utils.escapeHtml(tech?.complemento || '')}"
                                   placeholder="Apto, Sala, etc.">
                        </div>
                        <div class="form-group">
                            <label for="tech-bairro">Bairro *</label>
                            <input type="text" id="tech-bairro" class="form-control" 
                                   value="${Utils.escapeHtml(tech?.bairro || '')}" required>
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group" style="flex: 2;">
                            <label for="tech-cidade">Cidade *</label>
                            <input type="text" id="tech-cidade" class="form-control" 
                                   value="${Utils.escapeHtml(tech?.cidade || '')}" required>
                        </div>
                        <div class="form-group" style="flex: 1;">
                            <label for="tech-estado">Estado *</label>
                            <select id="tech-estado" class="form-control" required>
                                <option value="">UF</option>
                                ${states.map(s => 
                                    `<option value="${s}" ${tech?.estado === s ? 'selected' : ''}>${s}</option>`
                                ).join('')}
                            </select>
                        </div>
                        <div class="form-group" style="flex: 1;">
                            <label for="tech-cep">CEP *</label>
                            <input type="text" id="tech-cep" class="form-control" 
                                   value="${Utils.escapeHtml(tech?.cep || '')}"
                                   placeholder="00000-000" required>
                        </div>
                    </div>
                    
                    <h4 style="margin: 1.5rem 0 1rem; color: var(--primary-color);"><i class="fas fa-key"></i> Credenciais de Acesso</h4>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="tech-username">Usuário *</label>
                            <input type="text" id="tech-username" class="form-control" 
                                   value="${Utils.escapeHtml(tech?.username || '')}"
                                   placeholder="Nome de usuário para login" required>
                        </div>
                        <div class="form-group">
                            <label for="tech-password">${isEdit ? 'Nova Senha (deixe em branco para manter)' : 'Senha *'}</label>
                            <input type="password" id="tech-password" class="form-control" 
                                   placeholder="${isEdit ? '••••••••' : 'Senha de acesso'}"
                                   ${isEdit ? '' : 'required'}>
                        </div>
                    </div>

                    <div class="form-check">
                        <input type="checkbox" id="tech-notify-email" checked>
                        <label for="tech-notify-email">Enviar login e nova senha por e-mail</label>
                        <small class="text-muted">O e-mail será preparado com os dados informados acima.</small>
                    </div>
                    
                    <div class="form-check">
                        <input type="checkbox" id="tech-ativo" ${tech?.ativo !== false ? 'checked' : ''}>
                        <label for="tech-ativo">Técnico ativo</label>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button class="btn btn-outline" onclick="Utils.closeModal()">Cancelar</button>
                <button class="btn btn-primary" onclick="Tecnicos.save()">
                    <i class="fas fa-save"></i> Salvar
                </button>
            </div>
        `;
        
        Utils.showModal(content, { size: 'lg' });
    },

    /**
     * Save technician
     */
    async save() {
        const id = document.getElementById('tech-id').value;
        const nome = document.getElementById('tech-nome').value.trim();
        const email = document.getElementById('tech-email').value.trim();
        const telefone = document.getElementById('tech-telefone').value.trim();
        const regiao = document.getElementById('tech-regiao').value;
        const ativo = document.getElementById('tech-ativo').checked;
        const notifyByEmail = document.getElementById('tech-notify-email')?.checked;
        
        // Address fields
        const endereco = document.getElementById('tech-endereco').value.trim();
        const numero = document.getElementById('tech-numero').value.trim();
        const complemento = document.getElementById('tech-complemento').value.trim();
        const bairro = document.getElementById('tech-bairro').value.trim();
        const cidade = document.getElementById('tech-cidade').value.trim();
        const estado = document.getElementById('tech-estado').value;
        const cep = document.getElementById('tech-cep').value.trim();
        
        // Credentials
        const username = document.getElementById('tech-username').value.trim();
        const password = document.getElementById('tech-password').value;
        
        // Validation
        if (!nome || !email) {
            Utils.showToast('Preencha todos os campos obrigatórios', 'warning');
            return;
        }
        
        if (!Utils.isValidEmail(email)) {
            Utils.showToast('Email inválido', 'warning');
            return;
        }
        
        if (!endereco || !bairro || !cidade || !estado || !cep) {
            Utils.showToast('Preencha o endereço completo para envio de materiais', 'warning');
            return;
        }
        
        if (!username) {
            Utils.showToast('Informe um nome de usuário para login', 'warning');
            return;
        }
        
        if (!id && !password) {
            Utils.showToast('Informe uma senha para o técnico', 'warning');
            return;
        }
        
        // Check if username already exists (for new technician or changed username)
        const existingTech = id ? DataManager.getTechnicianById(id) : null;
        if (!existingTech || existingTech.username !== username) {
            const users = DataManager.getUsers();
            const existingUser = users.find(u => u.username === username);
            if (existingUser) {
                Utils.showToast('Este nome de usuário já está em uso', 'warning');
                return;
            }
        }
        
        // Format and validate CEP
        const cleanCep = cep.replace(/[^\d]/g, '');
        let formattedCep = cleanCep;
        if (cleanCep.length === 8) {
            formattedCep = cleanCep.replace(/^(\d{5})(\d{3})$/, '$1-$2');
        } else if (cleanCep.length > 0) {
            Utils.showToast('CEP deve ter 8 dígitos', 'warning');
            return;
        }
        
        const technician = {
            id: id || null,
            nome,
            email,
            telefone: telefone ? Utils.formatPhone(telefone) : '',
            regiao,
            endereco,
            numero,
            complemento,
            bairro,
            cidade,
            estado,
            cep: formattedCep,
            username,
            ativo
        };
        
        // Save technician
        DataManager.saveTechnician(technician);
        
        // Get the saved technician to get the ID (in case it was new)
        const savedTech = DataManager.getTechnicians().find(t => t.username === username);
        
        // Create or update user credentials
        const users = DataManager.getUsers();
        const existingUserIndex = users.findIndex(u => u.tecnicoId === savedTech.id);
        let passwordHash = existingUserIndex >= 0 ? users[existingUserIndex].passwordHash : null;
        if (password) {
            try {
                passwordHash = await Utils.hashSHA256(password, `${Utils.PASSWORD_SALT}:${username}`);
            } catch (error) {
                console.error('Erro ao gerar hash de senha do técnico', error);
                Utils.showToast('Não foi possível salvar a senha com segurança', 'error');
                return;
            }
        }
        if (!passwordHash) {
            const message = password ? 'Não foi possível proteger a senha informada' : 'Informe uma senha válida para o técnico';
            Utils.showToast(message, 'warning');
            return;
        }
        
        if (existingUserIndex >= 0) {
            // Update existing user
            users[existingUserIndex].username = username;
            users[existingUserIndex].name = nome;
            users[existingUserIndex].email = email;
            users[existingUserIndex].passwordHash = passwordHash;
            users[existingUserIndex].disabled = technician.ativo === false;
            delete users[existingUserIndex].password;
        } else {
            // Create new user
            users.push({
                id: 'user_' + savedTech.id,
                username: username,
                passwordHash,
                name: nome,
                role: 'tecnico',
                email: email,
                tecnicoId: savedTech.id,
                disabled: technician.ativo === false
            });
        }
        
        DataManager.saveData(DataManager.KEYS.USERS, users);
        
        if (password && notifyByEmail) {
            const sent = Utils.sendCredentialsEmail({
                to: email,
                username,
                password,
                name: nome
            });
            if (sent) {
                Utils.showToast('E-mail com nova senha preparado para envio', 'info');
            }
        }

        Utils.showToast(id ? 'Técnico atualizado com sucesso' : 'Técnico cadastrado com sucesso', 'success');
        Utils.closeModal();
        this.refreshTable();
    },

    /**
     * Confirm delete
     */
    async confirmDelete(id) {
        const tech = DataManager.getTechnicianById(id);
        if (!tech) return;
        
        // Check if technician has solicitations
        const solicitations = DataManager.getSolicitationsByTechnician(id);
        
        if (solicitations.length > 0) {
            Utils.showToast(`Este técnico possui ${solicitations.length} solicitação(ões) e não pode ser excluído`, 'error');
            return;
        }
        
        const confirmed = await Utils.confirm(
            `Deseja realmente excluir o técnico "${tech.nome}"?`,
            'Excluir Técnico'
        );
        
        if (confirmed) {
            // Soft delete: mark inactive and disable login
            tech.ativo = false;
            DataManager.saveTechnician(tech);

            const users = DataManager.getUsers();
            const updatedUsers = users.map(u => u.tecnicoId === id ? { ...u, disabled: true } : u);
            DataManager.saveData(DataManager.KEYS.USERS, updatedUsers);
            
            Utils.showToast('Técnico inativado com sucesso', 'success');
            this.refreshTable();
        }
    }
};
