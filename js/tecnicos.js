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
            if (e.key === 'Enter') {
                this.search();
            }
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
                    <h4>${this.searchQuery ? 'Nenhum técnico encontrado' : 'Nenhum técnico cadastrado'}</h4>
                    <p>${this.searchQuery ? 'Tente outro termo para localizar um técnico já cadastrado.' : 'Cadastre a equipe técnica para acompanhar chamados, custos e desempenho operacional.'}</p>
                    ${Auth.hasPermission('tecnicos', 'create') ? `
                        <button class="btn btn-primary" onclick="Tecnicos.openForm()">
                            <i class="fas fa-plus"></i> Novo Técnico
                        </button>
                    ` : ''}
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
                                                <button class="btn btn-sm btn-outline" onclick="Tecnicos.resetPassword('${tech.id}')" title="Resetar senha">
                                                    <i class="fas fa-key"></i>
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
            Utils.showToast('E-mail inválido', 'warning');
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

        const normalizedEmail = (typeof DataManager.normalizeEmail === 'function')
            ? DataManager.normalizeEmail(email)
            : email.toLowerCase();
        const normalizedUsername = (typeof DataManager.normalizeUsername === 'function')
            ? DataManager.normalizeUsername(username)
            : Utils.normalizeText(username);

        const existingTech = id ? DataManager.getTechnicianById(id) : null;
        const previousUsername = existingTech?.username || '';
        const previousNormalizedUsername = (typeof DataManager.normalizeUsername === 'function')
            ? DataManager.normalizeUsername(previousUsername)
            : Utils.normalizeText(previousUsername);

        if (existingTech && previousNormalizedUsername !== normalizedUsername && !password) {
            Utils.showToast('Ao alterar o usuário, informe uma nova senha para manter o acesso válido.', 'warning');
            return;
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

        const users = DataManager.getUsers();
        const linkedUser = users.find(u =>
            (id && u.tecnicoId === id) ||
            (existingTech && u.role === 'tecnico' && ((typeof DataManager.normalizeUsername === 'function')
                ? DataManager.normalizeUsername(u.username) === previousNormalizedUsername
                : Utils.normalizeText(u.username) === previousNormalizedUsername))
        );

        const conflicts = (typeof DataManager.findUserConflicts === 'function')
            ? DataManager.findUserConflicts({ id: linkedUser?.id || null, username, email: normalizedEmail }, users)
            : { duplicateUsernameUser: null, duplicateEmailUser: null };

        if (conflicts.duplicateUsernameUser) {
            Utils.showToast('Nome de usuário já cadastrado. Escolha outro usuário.', 'warning');
            return;
        }

        if (conflicts.duplicateEmailUser) {
            Utils.showToast('E-mail já cadastrado. Use outro e-mail.', 'warning');
            return;
        }

        const technician = {
            id: id || Utils.generateId(),
            nome,
            email: normalizedEmail,
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

        // Create or update user credentials
        const existingUserIndex = users.findIndex(u =>
            u.tecnicoId === technician.id ||
            (u.role === 'tecnico' && ((typeof DataManager.normalizeUsername === 'function')
                ? DataManager.normalizeUsername(u.username) === previousNormalizedUsername
                : Utils.normalizeText(u.username) === previousNormalizedUsername))
        );

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

        const existingUser = existingUserIndex >= 0 ? users[existingUserIndex] : null;

        const persistResult = await DataManager.saveTechnicianAndUser(technician, {
            id: existingUser?.id || (`user_${technician.id}`),
            username,
            passwordHash,
            name: nome,
            email: normalizedEmail,
            tecnicoId: technician.id,
            disabled: technician.ativo === false
        });

        if (!persistResult?.success) {
            if (persistResult.errorCode === 'duplicate_username') {
                Utils.showToast('Nome de usuário já cadastrado. Escolha outro usuário.', 'warning');
                return;
            }
            if (persistResult.errorCode === 'duplicate_email') {
                Utils.showToast('E-mail já cadastrado. Use outro e-mail.', 'warning');
                return;
            }
            Utils.showToast(persistResult.error || 'Não foi possível salvar técnico e credenciais de acesso', 'error');
            return;
        }

        if (password && notifyByEmail) {
            const sent = Utils.sendCredentialsEmail({
                to: normalizedEmail,
                username,
                password,
                name: nome,
                roleLabel: 'técnico'
            });
            if (sent) {
                Utils.showToast('E-mail de orientação preparado com login e senha temporária', 'info');
            }
        }

        Utils.showToast(id ? 'Técnico atualizado com sucesso' : 'Técnico cadastrado com sucesso', 'success');
        Utils.closeModal();
        this.refreshTable();
        if (password && typeof Utils.showCredentialDeliveryModal === 'function') {
            Utils.showCredentialDeliveryModal({
                title: id ? 'Credencial temporária do técnico' : 'Credencial inicial do técnico',
                username,
                password,
                email: normalizedEmail,
                name: nome,
                roleLabel: 'técnico'
            });
        }
    },

    /**
     * Confirm delete
     */
    async confirmDelete(id) {
        const tech = DataManager.getTechnicianById(id);
        if (!tech) {
            return;
        }

        // Check if technician has solicitations
        const solicitations = DataManager.getSolicitationsByTechnician(id);

        if (solicitations.length > 0) {
            Utils.showToast(`Este técnico possui ${solicitations.length} solicitação(ões) e não pode ser excluído`, 'error');
            return;
        }

        const confirmed = await Utils.confirm(
            `Deseja realmente excluir o técnico "${tech.nome}"? Esta ação remove o técnico da interface, base e autenticação.`,
            'Excluir Técnico'
        );

        if (!confirmed) {
            return;
        }

        const result = await DataManager.deleteTechnicianAndUser(id);
        if (!result?.success) {
            Utils.showToast(result?.error || 'Não foi possível excluir o técnico', 'error');
            return;
        }

        Utils.showToast('Técnico excluído com sucesso', 'success');
        this.refreshTable();
    },

    async resetPassword(id) {
        const tech = DataManager.getTechnicianById(id);
        if (!tech) {
            Utils.showToast('Técnico não encontrado', 'warning');
            return;
        }

        const users = DataManager.getUsers();
        const normalizedUsername = (typeof DataManager.normalizeUsername === 'function')
            ? DataManager.normalizeUsername(tech.username)
            : Utils.normalizeText(tech.username);

        const user = users.find(u =>
            u.tecnicoId === id ||
            (u.role === 'tecnico' && ((typeof DataManager.normalizeUsername === 'function')
                ? DataManager.normalizeUsername(u.username) === normalizedUsername
                : Utils.normalizeText(u.username) === normalizedUsername))
        );

        if (!user) {
            Utils.showToast('Usuário de acesso do técnico não encontrado', 'warning');
            return;
        }

        const suggested = `Tecnico@${Math.floor(1000 + Math.random() * 9000)}`;
        const newPassword = await Utils.prompt(
            `Informe a nova senha para ${tech.nome}:`,
            'Resetar Senha do Técnico',
            suggested
        );

        if (newPassword === null) {
            return;
        }

        const sanitizedPassword = String(newPassword || '').trim();
        if (sanitizedPassword.length < 4) {
            Utils.showToast('A nova senha deve ter pelo menos 4 caracteres', 'warning');
            return;
        }

        const result = await DataManager.resetUserPasswordById(user.id, sanitizedPassword);
        if (!result.success) {
            if (typeof Logger !== 'undefined' && typeof Logger.warn === 'function') {
                Logger.warn(Logger.CATEGORY.AUTH, 'password_reset_rejected', {
                    profile: 'tecnico',
                    tecnicoId: id,
                    userId: user.id,
                    reason: result.code || 'reset_failed',
                    error: result.error || null
                });
            }
            Utils.showToast(result.error || 'Não foi possível resetar a senha do técnico', 'error');
            return;
        }

        const authUser = result.user || DataManager.getUserById(user.id) || user;
        const loginUsername = String(authUser.username || user.username || '').trim();
        const targetEmail = String(tech.email || authUser.email || '').trim();
        const displayName = authUser.name || tech.nome || loginUsername;

        if (!loginUsername) {
            Utils.showToast('Senha redefinida, mas o usuário de login do técnico está inválido.', 'error');
            return;
        }

        if (typeof Logger !== 'undefined' && typeof Logger.info === 'function') {
            Logger.info(Logger.CATEGORY.AUTH, 'password_reset_applied', {
                profile: 'tecnico',
                tecnicoId: id,
                userId: user.id,
                username: loginUsername,
                affectedUsers: result.affectedUsers || 1,
                validated: result.validated === true
            });
        }

        let resetEmailSent = false;
        let resetEmailResult = null;

        if (targetEmail) {
            try {
                if (typeof Utils.sendPasswordResetEmailDetailed === 'function') {
                    resetEmailResult = await Utils.sendPasswordResetEmailDetailed({
                        to: targetEmail,
                        username: loginUsername,
                        password: sanitizedPassword,
                        name: displayName,
                        roleLabel: 'técnico'
                    });
                    resetEmailSent = resetEmailResult?.success === true;
                } else if (typeof Utils.sendPasswordResetEmail === 'function') {
                    resetEmailSent = await Utils.sendPasswordResetEmail({
                        to: targetEmail,
                        username: loginUsername,
                        password: sanitizedPassword,
                        name: displayName,
                        roleLabel: 'técnico'
                    });
                    resetEmailResult = {
                        success: resetEmailSent,
                        reason: resetEmailSent ? null : 'send_failed'
                    };
                }
            } catch (emailError) {
                resetEmailSent = false;
                resetEmailResult = {
                    success: false,
                    reason: 'request_exception',
                    error: emailError?.message || 'send_failed'
                };
            }

        }

        if (typeof Logger !== 'undefined') {
            const loggerFn = resetEmailSent
                ? Logger.info?.bind(Logger)
                : Logger.warn?.bind(Logger);
            loggerFn?.(Logger.CATEGORY.AUTH, 'password_reset_email_status', {
                profile: 'tecnico',
                tecnicoId: id,
                userId: user.id,
                username: loginUsername,
                recipient: targetEmail || null,
                emailSent: resetEmailSent,
                fallbackPrepared: false,
                hasRecipient: !!targetEmail,
                deliveryMode: resetEmailResult?.deliveryMode || null,
                deliveryReason: resetEmailResult?.reason || null,
                provider: resetEmailResult?.provider || null,
                statusCode: resetEmailResult?.statusCode || null,
                providerMessage: resetEmailResult?.providerMessage || null,
                error: resetEmailResult?.error || null
            });
        }

        if (resetEmailSent) {
            Utils.showToast(`E-mail de orientação enviado para ${targetEmail}`, 'info');
        } else if (targetEmail) {
            const reasonMessage = (typeof Utils.getOperationalEmailFailureMessage === 'function')
                ? Utils.getOperationalEmailFailureMessage(resetEmailResult)
                : 'o provedor não confirmou o envio automático.';
            Utils.showToast(`Senha redefinida, mas ${reasonMessage} Confira os dados exibidos.`, 'warning');
        }

        Utils.showToast('Senha do técnico redefinida com sucesso', 'success');
        if (!resetEmailSent && typeof Utils.showCredentialDeliveryModal === 'function') {
            Utils.showCredentialDeliveryModal({
                title: 'Senha temporária do técnico',
                username: loginUsername,
                password: sanitizedPassword,
                email: targetEmail,
                name: displayName,
                roleLabel: 'técnico'
            });
        }
    }
};

if (typeof window !== 'undefined') {
    window.Tecnicos = Tecnicos;
}









