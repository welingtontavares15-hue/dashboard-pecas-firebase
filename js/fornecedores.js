/**
 * Fornecedores (Suppliers) Module
 * Handles CRUD operations for suppliers and supplier access accounts.
 */

const Fornecedores = {
    currentPage: 1,
    itemsPerPage: 10,
    searchQuery: '',

    getLinkedUserBySupplier(supplier, users = DataManager.getUsers()) {
        if (!supplier) {
            return null;
        }

        const normalizeUsername = (value) => {
            if (typeof DataManager.normalizeUsername === 'function') {
                return DataManager.normalizeUsername(value);
            }
            return Utils.normalizeText(value || '');
        };

        const normalizeEmail = (value) => {
            if (typeof DataManager.normalizeEmail === 'function') {
                return DataManager.normalizeEmail(value);
            }
            return String(value || '').trim().toLowerCase();
        };

        const supplierUsername = normalizeUsername(supplier.username || '');
        const supplierEmail = normalizeEmail(supplier.email || '');

        return (users || []).find((user) => {
            if (!user || user.role !== 'fornecedor') {
                return false;
            }

            if (user.fornecedorId && user.fornecedorId === supplier.id) {
                return true;
            }

            if (supplierUsername && normalizeUsername(user.username) === supplierUsername) {
                return true;
            }

            return !!supplierEmail && normalizeEmail(user.email) === supplierEmail;
        }) || null;
    },

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

            <div class="filters-bar">
                <div class="search-box">
                    <input type="text" id="supplier-search" class="form-control"
                           placeholder="Buscar por nome, email, CNPJ ou usuário..."
                           value="${Utils.escapeHtml(this.searchQuery)}">
                    <button class="btn btn-primary" onclick="Fornecedores.search()">
                        <i class="fas fa-search"></i>
                    </button>
                </div>
            </div>

            <div class="card">
                <div class="card-body">
                    <div id="supplier-table-container">
                        ${this.renderTable()}
                    </div>
                </div>
            </div>
        `;

        const searchInput = document.getElementById('supplier-search');
        if (searchInput) {
            searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    this.search();
                }
            });

            searchInput.addEventListener('input', Utils.debounce(() => {
                this.searchQuery = searchInput.value;
                this.currentPage = 1;
                this.refreshTable();
            }, 300));
        }
    },

    /**
     * Render suppliers table
     */
    renderTable() {
        let suppliers = DataManager.getSuppliers();
        const users = DataManager.getUsers();

        if (this.searchQuery) {
            const query = Utils.normalizeText(this.searchQuery);
            suppliers = suppliers.filter((supplier) => {
                const linkedUser = this.getLinkedUserBySupplier(supplier, users);
                return (
                    Utils.normalizeText(supplier.nome).includes(query) ||
                    Utils.normalizeText(supplier.email).includes(query) ||
                    Utils.normalizeText(supplier.cnpj).includes(query) ||
                    Utils.normalizeText(linkedUser?.username || '').includes(query)
                );
            });
        }

        const total = suppliers.length;
        const totalPages = Math.max(Math.ceil(total / this.itemsPerPage), 1);
        this.currentPage = Math.min(this.currentPage, totalPages);
        const start = (this.currentPage - 1) * this.itemsPerPage;
        const paginated = suppliers.slice(start, start + this.itemsPerPage);

        if (suppliers.length === 0) {
            return `
                <div class="empty-state">
                    <i class="fas fa-truck"></i>
                    <h4>${this.searchQuery ? 'Nenhum fornecedor encontrado' : 'Nenhum fornecedor cadastrado'}</h4>
                    <p>${this.searchQuery
        ? 'Tente outro termo para localizar um fornecedor cadastrado.'
        : 'Cadastre o primeiro fornecedor para organizar compras, peças e histórico de abastecimento.'}</p>
                    ${Auth.hasPermission('fornecedores', 'create') ? `
                        <button class="btn btn-primary" onclick="Fornecedores.openForm()">
                            <i class="fas fa-plus"></i> Novo Fornecedor
                        </button>
                    ` : ''}
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
                            <th>Usuário</th>
                            <th>Status</th>
                            ${canEdit || canDelete ? '<th>Ações</th>' : ''}
                        </tr>
                    </thead>
                    <tbody>
                        ${paginated.map((supplier) => {
        const linkedUser = this.getLinkedUserBySupplier(supplier, users);
        return `
                                <tr>
                                    <td><strong>${Utils.escapeHtml(supplier.nome)}</strong></td>
                                    <td>
                                        <a href="mailto:${Utils.escapeHtml(supplier.email)}">
                                            ${Utils.escapeHtml(supplier.email)}
                                        </a>
                                    </td>
                                    <td>${Utils.escapeHtml(supplier.telefone || '-')}</td>
                                    <td>${Utils.escapeHtml(supplier.cnpj || '-')}</td>
                                    <td><code>${Utils.escapeHtml(linkedUser?.username || supplier.username || '-')}</code></td>
                                    <td>
                                        ${supplier.ativo !== false
            ? '<span class="status-badge status-aprovada"><i class="fas fa-check"></i> Ativo</span>'
            : '<span class="status-badge status-rejeitada"><i class="fas fa-times"></i> Inativo</span>'}
                                    </td>
                                    ${canEdit || canDelete ? `
                                        <td>
                                            <div class="actions">
                                                ${canEdit ? `
                                                    <button class="btn btn-sm btn-outline" onclick="Fornecedores.openForm('${supplier.id}')" title="Editar">
                                                        <i class="fas fa-edit"></i>
                                                    </button>
                                                    <button class="btn btn-sm btn-outline" onclick="Fornecedores.resetPassword('${supplier.id}')" title="Resetar senha">
                                                        <i class="fas fa-key"></i>
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
        const container = document.getElementById('supplier-table-container');
        if (container) {
            container.innerHTML = this.renderTable();
        }
    },

    search() {
        this.searchQuery = document.getElementById('supplier-search').value;
        this.currentPage = 1;
        this.refreshTable();
    },

    openForm(id = null) {
        const supplier = id ? DataManager.getSupplierById(id) : null;
        const linkedUser = this.getLinkedUserBySupplier(supplier);
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

                    <h4 style="margin: 1rem 0; color: var(--primary-color);"><i class="fas fa-key"></i> Credenciais de Acesso</h4>

                    <div class="form-row">
                        <div class="form-group">
                            <label for="supplier-username">Usuário *</label>
                            <input type="text" id="supplier-username" class="form-control"
                                   value="${Utils.escapeHtml(linkedUser?.username || supplier?.username || '')}"
                                   placeholder="Usuário do fornecedor" required>
                        </div>
                        <div class="form-group">
                            <label for="supplier-password">${isEdit ? 'Nova senha (opcional)' : 'Senha *'}</label>
                            <input type="password" id="supplier-password" class="form-control"
                                   placeholder="${isEdit ? 'Deixe em branco para manter' : 'Senha inicial'}"
                                   ${isEdit ? '' : 'required'}>
                        </div>
                    </div>

                    <div class="form-check">
                        <input type="checkbox" id="supplier-notify-email" checked>
                        <label for="supplier-notify-email">Preparar e-mail com as credenciais</label>
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

    async save() {
        const id = document.getElementById('supplier-id').value;
        const nome = document.getElementById('supplier-nome').value.trim();
        const email = document.getElementById('supplier-email').value.trim();
        const telefone = document.getElementById('supplier-telefone').value.trim();
        const cnpj = document.getElementById('supplier-cnpj').value.trim();
        const username = document.getElementById('supplier-username').value.trim();
        const password = document.getElementById('supplier-password').value;
        const ativo = document.getElementById('supplier-ativo').checked;
        const notifyByEmail = document.getElementById('supplier-notify-email')?.checked;

        if (!nome || !email || !username) {
            Utils.showToast('Preencha nome, e-mail e usuário', 'warning');
            return;
        }

        if (!Utils.isValidEmail(email)) {
            Utils.showToast('Email inválido', 'warning');
            return;
        }

        if (cnpj && !Utils.isValidCNPJ(cnpj)) {
            Utils.showToast('CNPJ inválido', 'warning');
            return;
        }

        const existingSupplier = id ? DataManager.getSupplierById(id) : null;
        const linkedUser = this.getLinkedUserBySupplier(existingSupplier);
        const previousUsername = linkedUser?.username || existingSupplier?.username || '';
        const normalizeUsername = typeof DataManager.normalizeUsername === 'function'
            ? DataManager.normalizeUsername.bind(DataManager)
            : (value) => Utils.normalizeText(value || '');

        if (linkedUser && normalizeUsername(previousUsername) !== normalizeUsername(username) && !password) {
            Utils.showToast('Ao alterar o usuário, informe uma nova senha para manter o acesso.', 'warning');
            return;
        }

        if (!id && !password) {
            Utils.showToast('Informe uma senha inicial para o fornecedor', 'warning');
            return;
        }

        const normalizedEmail = (typeof DataManager.normalizeEmail === 'function')
            ? DataManager.normalizeEmail(email)
            : email.toLowerCase();

        const conflicts = (typeof DataManager.findUserConflicts === 'function')
            ? DataManager.findUserConflicts({ id: linkedUser?.id || null, username, email: normalizedEmail }, DataManager.getUsers())
            : { duplicateUsernameUser: null, duplicateEmailUser: null };

        if (conflicts.duplicateUsernameUser) {
            Utils.showToast('Nome de usuário já cadastrado. Escolha outro.', 'warning');
            return;
        }

        if (conflicts.duplicateEmailUser) {
            Utils.showToast('E-mail já cadastrado. Use outro e-mail.', 'warning');
            return;
        }

        const supplier = {
            id: id || null,
            nome,
            email: normalizedEmail,
            telefone: telefone ? Utils.formatPhone(telefone) : '',
            cnpj: cnpj ? Utils.formatCNPJ(cnpj) : '',
            username,
            ativo
        };

        let passwordHash = linkedUser?.passwordHash || null;
        if (password) {
            try {
                passwordHash = await Utils.hashSHA256(password, `${Utils.PASSWORD_SALT}:${username}`);
            } catch (error) {
                console.error('Erro ao gerar hash de senha do fornecedor', error);
                Utils.showToast('Não foi possível salvar a senha com segurança', 'error');
                return;
            }
        }

        if (!passwordHash) {
            Utils.showToast('Senha inválida para o usuário do fornecedor', 'warning');
            return;
        }

        const persistResult = await DataManager.saveSupplierAndUser(supplier, {
            id: linkedUser?.id || null,
            username,
            passwordHash,
            name: nome,
            email: normalizedEmail,
            fornecedorId: supplier.id,
            disabled: ativo === false
        });

        if (!persistResult?.success) {
            if (persistResult.errorCode === 'duplicate_username') {
                Utils.showToast('Nome de usuário já cadastrado. Escolha outro.', 'warning');
                return;
            }
            if (persistResult.errorCode === 'duplicate_email') {
                Utils.showToast('E-mail já cadastrado. Use outro e-mail.', 'warning');
                return;
            }
            Utils.showToast(persistResult.error || 'Não foi possível salvar fornecedor e credenciais', 'error');
            return;
        }

        if (password && notifyByEmail) {
            const sent = Utils.sendCredentialsEmail({
                to: normalizedEmail,
                username,
                password,
                name: nome,
                roleLabel: 'fornecedor'
            });
            if (sent) {
                Utils.showToast('E-mail de orientação preparado com login e senha temporária', 'info');
            }
        }

        Utils.showToast(id ? 'Fornecedor atualizado com sucesso' : 'Fornecedor cadastrado com sucesso', 'success');
        Utils.closeModal();
        this.refreshTable();
        if (password && typeof Utils.showCredentialDeliveryModal === 'function') {
            Utils.showCredentialDeliveryModal({
                title: id ? 'Credencial temporária do fornecedor' : 'Credencial inicial do fornecedor',
                username,
                password,
                email: normalizedEmail,
                name: nome,
                roleLabel: 'fornecedor'
            });
        }
    },

    async resetPassword(id) {
        const supplier = DataManager.getSupplierById(id);
        if (!supplier) {
            Utils.showToast('Fornecedor não encontrado', 'warning');
            return;
        }

        const user = this.getLinkedUserBySupplier(supplier);
        if (!user) {
            Utils.showToast('Usuário de acesso do fornecedor não encontrado', 'warning');
            return;
        }

        const suggested = `Fornecedor@${Math.floor(1000 + Math.random() * 9000)}`;
        const newPassword = await Utils.prompt(
            `Informe a nova senha para ${supplier.nome}:`,
            'Resetar Senha do Fornecedor',
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
                    profile: 'fornecedor',
                    fornecedorId: id,
                    userId: user.id,
                    reason: result.code || 'reset_failed',
                    error: result.error || null
                });
            }
            Utils.showToast(result.error || 'Não foi possível resetar a senha do fornecedor', 'error');
            return;
        }

        const authUser = result.user || DataManager.getUserById(user.id) || user;
        const loginUsername = String(authUser.username || user.username || '').trim();
        const targetEmail = String(supplier.email || authUser.email || '').trim();
        const displayName = authUser.name || supplier.nome || loginUsername;

        if (!loginUsername) {
            Utils.showToast('Senha redefinida, mas o usuário de login do fornecedor está inválido.', 'error');
            return;
        }

        if (typeof Logger !== 'undefined' && typeof Logger.info === 'function') {
            Logger.info(Logger.CATEGORY.AUTH, 'password_reset_applied', {
                profile: 'fornecedor',
                fornecedorId: id,
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
                        roleLabel: 'fornecedor'
                    });
                    resetEmailSent = resetEmailResult?.success === true;
                } else if (typeof Utils.sendPasswordResetEmail === 'function') {
                    resetEmailSent = await Utils.sendPasswordResetEmail({
                        to: targetEmail,
                        username: loginUsername,
                        password: sanitizedPassword,
                        name: displayName,
                        roleLabel: 'fornecedor'
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
                profile: 'fornecedor',
                fornecedorId: id,
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

        Utils.showToast('Senha do fornecedor redefinida com sucesso', 'success');
        if (!resetEmailSent && typeof Utils.showCredentialDeliveryModal === 'function') {
            Utils.showCredentialDeliveryModal({
                title: 'Senha temporária do fornecedor',
                username: loginUsername,
                password: sanitizedPassword,
                email: targetEmail,
                name: displayName,
                roleLabel: 'fornecedor'
            });
        }
    },

    async confirmDelete(id) {
        const supplier = DataManager.getSupplierById(id);
        if (!supplier) {
            return;
        }

        const solicitations = DataManager.getSolicitations().filter(s => s.fornecedorId === id);
        if (solicitations.length > 0) {
            Utils.showToast(`Este fornecedor está vinculado a ${solicitations.length} solicitação(ões) e não pode ser excluído`, 'error');
            return;
        }

        const confirmed = await Utils.confirm(
            `Deseja realmente excluir o fornecedor "${supplier.nome}"? Esta ação remove da interface, base e autenticação.`,
            'Excluir Fornecedor'
        );

        if (!confirmed) {
            return;
        }

        const result = await DataManager.deleteSupplierAndUser(id);
        if (!result?.success) {
            Utils.showToast(result?.error || 'Não foi possível excluir o fornecedor', 'error');
            return;
        }

        Utils.showToast('Fornecedor excluído com sucesso', 'success');
        this.refreshTable();
    }
};

if (typeof window !== 'undefined') {
    window.Fornecedores = Fornecedores;
}


