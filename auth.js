/**
 * Authentication and RBAC Module
 * Handles login, logout, and role-based access control
 */

const Auth = {
    // Current user
    currentUser: null,
    SESSION_DURATION_MS: 1000 * 60 * 60 * 8,

    // Role permissions
    permissions: {
        administrador: {
            dashboard: true,
            solicitacoes: { view: true, create: true, edit: true, delete: true, viewAll: true },
            aprovacoes: { view: true, approve: true, reject: true, batch: true },
            tecnicos: { view: true, create: true, edit: true, delete: true },
            fornecedores: { view: true, create: true, edit: true, delete: true },
            pecas: { view: true, create: true, edit: true, delete: true, import: true },
            relatorios: { view: true, export: true },
            configuracoes: { view: true, edit: true }
        },
        gestor: {
            dashboard: true,
            solicitacoes: { view: true, create: false, edit: false, delete: false, viewAll: true },
            aprovacoes: { view: true, approve: true, reject: true, batch: true },
            tecnicos: { view: true, create: false, edit: false, delete: false },
            fornecedores: { view: true, create: false, edit: false, delete: false },
            pecas: { view: true, create: false, edit: false, delete: false, import: false },
            relatorios: { view: true, export: true },
            configuracoes: { view: true, edit: false }
        },
        tecnico: {
            dashboard: false,
            solicitacoes: { view: true, create: true, edit: true, delete: true, viewAll: false },
            aprovacoes: { view: false, approve: false, reject: false, batch: false },
            tecnicos: { view: false, create: false, edit: false, delete: false },
            fornecedores: { view: false, create: false, edit: false, delete: false },
            pecas: { view: true, create: false, edit: false, delete: false, import: false },
            relatorios: { view: false, export: false },
            configuracoes: { view: false, edit: false }
        }
    },

    // Menu items by role
    menus: {
        administrador: [
            { id: 'dashboard', icon: 'fa-chart-pie', label: 'Dashboard', section: 'Principal' },
            { id: 'aprovacoes', icon: 'fa-check-double', label: 'Aprovações', section: 'Principal', badge: true },
            { id: 'solicitacoes', icon: 'fa-clipboard-list', label: 'Solicitações', section: 'Principal' },
            { id: 'tecnicos', icon: 'fa-users', label: 'Técnicos', section: 'Cadastros' },
            { id: 'fornecedores', icon: 'fa-truck', label: 'Fornecedores', section: 'Cadastros' },
            { id: 'pecas', icon: 'fa-cogs', label: 'Peças', section: 'Cadastros' },
            { id: 'relatorios', icon: 'fa-file-alt', label: 'Relatórios', section: 'Análises' },
            { id: 'configuracoes', icon: 'fa-cog', label: 'Configurações', section: 'Sistema' }
        ],
        gestor: [
            { id: 'dashboard', icon: 'fa-chart-pie', label: 'Dashboard', section: 'Principal' },
            { id: 'aprovacoes', icon: 'fa-check-double', label: 'Aprovações', section: 'Principal', badge: true },
            { id: 'solicitacoes', icon: 'fa-clipboard-list', label: 'Solicitações', section: 'Principal' },
            { id: 'tecnicos', icon: 'fa-users', label: 'Técnicos', section: 'Cadastros' },
            { id: 'fornecedores', icon: 'fa-truck', label: 'Fornecedores', section: 'Cadastros' },
            { id: 'pecas', icon: 'fa-cogs', label: 'Peças', section: 'Cadastros' },
            { id: 'relatorios', icon: 'fa-file-alt', label: 'Relatórios', section: 'Análises' },
            { id: 'configuracoes', icon: 'fa-cog', label: 'Configurações', section: 'Sistema' }
        ],
        tecnico: [
            { id: 'nova-solicitacao', icon: 'fa-plus-circle', label: 'Nova Solicitação', section: 'Principal' },
            { id: 'minhas-solicitacoes', icon: 'fa-clipboard-list', label: 'Minhas Solicitações', section: 'Principal' },
            { id: 'catalogo', icon: 'fa-search', label: 'Catálogo de Peças', section: 'Consulta' },
            { id: 'ajuda', icon: 'fa-question-circle', label: 'Ajuda', section: 'Suporte' },
            { id: 'perfil', icon: 'fa-user-cog', label: 'Meu Perfil', section: 'Suporte' }
        ]
    },

    /**
     * Normalize user object for session storage
     */
    buildSessionUser(user) {
        if (!user) return null;
        return {
            id: user.id,
            username: user.username,
            name: user.name,
            role: user.role,
            email: user.email,
            tecnicoId: user.tecnicoId,
            expiresAt: Date.now() + this.SESSION_DURATION_MS
        };
    },

    /**
     * Hash password using shared util
     */
    async hashPassword(password, username = '') {
        return Utils.hashSHA256(password, `${Utils.PASSWORD_SALT}:${username}`);
    },

    /**
     * Initialize auth
     */
    init() {
        // Check for saved session
        const savedUser = localStorage.getItem('diversey_current_user');
        if (savedUser) {
            try {
                const sessionUser = JSON.parse(savedUser);
                if (!sessionUser || typeof sessionUser.username !== 'string' || !sessionUser.id) {
                    console.warn('Sessão removida: dados de sessão inválidos');
                    localStorage.removeItem('diversey_current_user');
                    return false;
                }

                const latestUser = DataManager.getUserByUsername(sessionUser.username);

                if (!latestUser) {
                    console.warn('Sessão removida: usuário não encontrado na base local');
                    localStorage.removeItem('diversey_current_user');
                    return false;
                }

                // Check session expiration
                if (sessionUser.expiresAt && sessionUser.expiresAt < Date.now()) {
                    console.warn('Sessão expirada');
                    localStorage.removeItem('diversey_current_user');
                    return false;
                }

                if (latestUser.disabled) {
                    console.warn('Sessão removida: usuário inativo');
                    localStorage.removeItem('diversey_current_user');
                    return false;
                }

                // Always refresh session with latest profile/role data and renew expiration
                this.currentUser = { ...this.buildSessionUser(latestUser) };
                localStorage.setItem('diversey_current_user', JSON.stringify(this.currentUser));
                return true;
            } catch (e) {
                console.error('Erro ao restaurar sessão do usuário', e);
                localStorage.removeItem('diversey_current_user');
            }
        }
        return false;
    },

    /**
     * Attempt login
     */
    async login(username, password) {
        const user = DataManager.getUserByUsername(username);
        
        if (!user) {
            return { success: false, error: 'Usuário não encontrado' };
        }

        if (user.disabled) {
            return { success: false, error: 'Usuário inativo. Contate o administrador.' };
        }
        
        const passwordHash = await this.hashPassword(password, username);
        let storedHash = user.passwordHash || null;

        if (!storedHash && user.password) {
            try {
                storedHash = await this.hashPassword(user.password, user.username);
                user.passwordHash = storedHash;
                delete user.password;
                DataManager.saveData(DataManager.KEYS.USERS, DataManager.getUsers().map(u => u.username === user.username ? { ...user } : u));
            } catch (e) {
                console.error('Falha ao migrar senha para hash seguro', e);
                return { success: false, error: 'Erro ao validar credenciais' };
            }
        }

        if (!storedHash) {
            return { success: false, error: 'Senha incorreta' };
        }

        if (storedHash !== passwordHash) {
            // Compatibilidade com hashes anteriores (sem salt por usuário)
            const legacyHash = await Utils.hashSHA256(password, Utils.PASSWORD_SALT);

            if (storedHash !== legacyHash) {
                return { success: false, error: 'Senha incorreta' };
            }

            try {
                const users = DataManager.getUsers();
                const updatedUsers = users.map(u => u.username === user.username ? { ...u, passwordHash, password: undefined } : u);
                user.passwordHash = passwordHash;
                DataManager.saveData(DataManager.KEYS.USERS, updatedUsers);
            } catch (e) {
                console.warn('Falha ao migrar hash legado', e);
            }
        }
        
        // Don't store password in session
        this.currentUser = this.buildSessionUser(user);
        
        localStorage.setItem('diversey_current_user', JSON.stringify(this.currentUser));
        
        return { success: true, user: this.currentUser };
    },

    /**
     * Logout
     */
    logout() {
        this.currentUser = null;
        localStorage.removeItem('diversey_current_user');
    },

    /**
     * Check if user is logged in
     */
    isLoggedIn() {
        return this.currentUser !== null && (!this.currentUser.expiresAt || this.currentUser.expiresAt > Date.now());
    },

    /**
     * Get current user
     */
    getCurrentUser() {
        if (this.currentUser?.expiresAt && this.currentUser.expiresAt <= Date.now()) {
            this.logout();
            return null;
        }
        return this.currentUser;
    },

    /**
     * Get user role
     */
    getRole() {
        return this.currentUser?.role || null;
    },

    /**
     * Get role label
     */
    getRoleLabel(role) {
        const labels = {
            administrador: 'Administrador',
            gestor: 'Gestor',
            tecnico: 'Técnico'
        };
        return labels[role] || role;
    },

    /**
     * Check permission
     */
    hasPermission(module, action = null) {
        const role = this.getRole();
        if (!role) return false;
        
        const perms = this.permissions[role];
        if (!perms) return false;
        
        if (action === null) {
            return !!perms[module];
        }
        
        const modulePerms = perms[module];
        if (typeof modulePerms === 'boolean') {
            return modulePerms;
        }
        
        return modulePerms && modulePerms[action] === true;
    },

    /**
     * Get menu items for current user
     */
    getMenuItems() {
        const role = this.getRole();
        return this.menus[role] || [];
    },

    /**
     * Render sidebar menu
     */
    renderMenu(activeId = null) {
        const items = this.getMenuItems();
        const nav = document.getElementById('sidebar-nav');
        
        if (!nav) return;
        
        // Group by section
        const sections = {};
        items.forEach(item => {
            if (!sections[item.section]) {
                sections[item.section] = [];
            }
            sections[item.section].push(item);
        });
        
        let html = '';
        
        Object.entries(sections).forEach(([section, sectionItems]) => {
            html += `
                <div class="nav-section">
                    <div class="nav-section-title">${section}</div>
                    ${sectionItems.map(item => {
                        const isActive = item.id === activeId;
                        const badgeCount = item.badge ? DataManager.getPendingSolicitations().length : 0;
                        return `
                            <a class="nav-item ${isActive ? 'active' : ''}" data-page="${item.id}">
                                <i class="fas ${item.icon}"></i>
                                <span>${item.label}</span>
                                ${item.badge && badgeCount > 0 ? `<span class="nav-badge">${badgeCount}</span>` : ''}
                            </a>
                        `;
                    }).join('')}
                </div>
            `;
        });
        
        nav.innerHTML = html;
        
        // Update user info
        document.getElementById('user-name').textContent = this.currentUser?.name || 'Usuário';
        document.getElementById('user-role').textContent = this.getRoleLabel(this.getRole());
        
        // Update pending badge in header
        const pendingBadge = document.getElementById('pending-badge');
        const pendingCount = DataManager.getPendingSolicitations().length;
        
        if (this.hasPermission('aprovacoes', 'view') && pendingCount > 0) {
            pendingBadge.classList.remove('hidden');
            document.getElementById('pending-count').textContent = pendingCount;
        } else {
            pendingBadge.classList.add('hidden');
        }
    },

    /**
     * Check route access
     */
    canAccessRoute(routeId) {
        const role = this.getRole();
        const menuItems = this.menus[role] || [];
        
        // Check if route is in user's menu
        const hasMenuItem = menuItems.some(item => item.id === routeId);
        if (hasMenuItem) return true;
        
        // Special cases for technician
        if (role === 'tecnico') {
            if (routeId === 'solicitacoes' || routeId === 'minhas-solicitacoes') return true;
            if (routeId === 'nova-solicitacao') return true;
            if (routeId === 'catalogo' || routeId === 'pecas') return true;
        }
        
        return false;
    },

    /**
     * Get technician ID for current user (if applicable)
     */
    getTecnicoId() {
        if (this.currentUser?.role === 'tecnico') {
            return this.currentUser.tecnicoId || this.currentUser.id;
        }
        return null;
    }
};
