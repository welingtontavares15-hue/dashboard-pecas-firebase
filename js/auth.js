/**
 * Authentication and RBAC Module
 * Handles login, logout, and role-based access control
 */

const Auth = {
    // Current user
    currentUser: null,
    SESSION_DURATION_MS: 1000 * 60 * 60 * 8,
    // Auth logging disabled - online-only mode does not persist logs locally
    AUTH_LOG_KEY: null,
    AUTH_LOG_LIMIT: 100,
    
    // In-memory rate limiting (no localStorage persistence in online-only mode)
    _rateLimitCache: {},
    
    // Rate limiting configuration for security compliance
    // Note: In online-only mode, rate limit state is kept in memory only
    RATE_LIMIT: {
        MAX_ATTEMPTS: 5,
        LOCKOUT_DURATION_MS: 15 * 60 * 1000, // 15 minutes
        // Removed: ATTEMPTS_KEY - no localStorage in online-only mode
        PROGRESSIVE_MULTIPLIER: 2, // Each lockout doubles the duration
        MAX_LOCKOUT_DURATION_MS: 24 * 60 * 60 * 1000 // Maximum lockout: 24 hours
    },

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
            { id: 'user-management', icon: 'fa-users-cog', label: 'Gerenciar Usuários', section: 'Sistema' },
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
        if (!user) {
            return null;
        }
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
     * Online-only mode: Session is stored in sessionStorage (temporary).
     * On page reload, session is validated against cloud data.
     */
    init() {
        // Check for saved session in sessionStorage (temporary, clears on browser close)
        const savedUser = sessionStorage.getItem('diversey_current_user');
        if (savedUser) {
            try {
                const sessionUser = JSON.parse(savedUser);
                if (!sessionUser || typeof sessionUser.username !== 'string' || !sessionUser.id) {
                    console.warn('Sessão removida: dados de sessão inválidos');
                    sessionStorage.removeItem('diversey_current_user');
                    return false;
                }

                const latestUser = DataManager.getUserByUsername(sessionUser.username);

                if (!latestUser) {
                    console.warn('Sessão removida: usuário não encontrado na base');
                    sessionStorage.removeItem('diversey_current_user');
                    return false;
                }

                // Check session expiration
                if (sessionUser.expiresAt && sessionUser.expiresAt < Date.now()) {
                    console.warn('Sessão expirada');
                    sessionStorage.removeItem('diversey_current_user');
                    return false;
                }

                if (latestUser.disabled) {
                    console.warn('Sessão removida: usuário inativo');
                    sessionStorage.removeItem('diversey_current_user');
                    return false;
                }

                // Always refresh session with latest profile/role data and renew expiration
                this.currentUser = { ...this.buildSessionUser(latestUser) };
                sessionStorage.setItem('diversey_current_user', JSON.stringify(this.currentUser));
                return true;
            } catch (e) {
                console.error('Erro ao restaurar sessão do usuário', e);
                sessionStorage.removeItem('diversey_current_user');
            }
        }
        return false;
    },

    /**
     * Attempt login
     */
    async login(username, password) {
        const inputUsername = (username || '').trim();
        const normalizedUsername = DataManager.normalizeUsername(inputUsername);
        
        // Rate limiting check - progressive lockout for security
        const rateLimitCheck = this.checkRateLimit(normalizedUsername);
        if (!rateLimitCheck.allowed) {
            const remainingMinutes = Math.ceil(rateLimitCheck.remainingMs / 60000);
            this.logAuthAttempt({
                username: inputUsername,
                normalizedUsername,
                userRole: null,
                statusCode: 429,
                success: false,
                reason: 'rate_limited',
                message: `Conta bloqueada. Tente novamente em ${remainingMinutes} minuto(s).`,
                syncInfo: { attempted: false, succeeded: false }
            });
            return { 
                success: false, 
                error: `Conta temporariamente bloqueada por excesso de tentativas. Tente novamente em ${remainingMinutes} minuto(s).`
            };
        }
        
        const syncInfo = {
            attempted: false,
            succeeded: false,
            cloudAvailable: typeof DataManager !== 'undefined' && typeof DataManager.isCloudAvailable === 'function'
                ? DataManager.isCloudAvailable()
                : false
        };

        // Sync users from cloud before login to ensure we have the latest user data
        // This allows users created on other devices to log in on this device
        if (typeof DataManager !== 'undefined' && typeof DataManager.syncUsersFromCloud === 'function') {
            try {
                syncInfo.attempted = true;
                await DataManager.syncUsersFromCloud();
                syncInfo.succeeded = true;
            } catch (e) {
                console.warn('Failed to sync users before login:', e);
                syncInfo.error = e?.message || 'sync_failed';
                // Continue with local data if sync fails
            }
        }

        const user = DataManager.getUserByUsername(inputUsername);
        
        if (!user) {
            this.logAuthAttempt({
                username: inputUsername,
                normalizedUsername,
                userRole: 'gestor',
                statusCode: 404,
                success: false,
                reason: 'user_not_found',
                message: 'Usuário não encontrado',
                syncInfo
            });
            // Record failed attempt even for non-existent users to prevent enumeration
            this.recordFailedAttempt(normalizedUsername);
            return { success: false, error: 'Usuário não encontrado' };
        }

        if (user.disabled) {
            this.logAuthAttempt({
                username: user.username,
                normalizedUsername,
                userRole: user.role,
                statusCode: 403,
                success: false,
                reason: 'user_disabled',
                message: 'Usuário inativo. Contate o administrador.',
                syncInfo
            });
            return { success: false, error: 'Usuário inativo. Contate o administrador.' };
        }

        const effectiveRole = user.role || 'gestor';
        if (!this.permissions[effectiveRole]) {
            this.logAuthAttempt({
                username: user.username,
                normalizedUsername,
                userRole: effectiveRole,
                statusCode: 403,
                success: false,
                reason: 'role_not_allowed',
                message: 'Perfil não autorizado. Contate o administrador.',
                syncInfo
            });
            return { success: false, error: 'Perfil não autorizado. Contate o administrador.' };
        }
        user.role = effectiveRole;
        
        const canonicalUsername = user.username || inputUsername;
        const passwordHash = await this.hashPassword(password, canonicalUsername);
        let storedHash = user.passwordHash || null;

        if (!storedHash && user.password) {
            try {
                storedHash = await this.hashPassword(user.password, canonicalUsername);
                user.passwordHash = storedHash;
                delete user.password;
                const targetUsername = DataManager.normalizeUsername(user.username);
                const users = DataManager.getUsers();
                const idx = users.findIndex(u => DataManager.normalizeUsername(u.username) === targetUsername);
                if (idx >= 0) {
                    users[idx] = { ...user };
                }
                DataManager.saveData(DataManager.KEYS.USERS, users);
            } catch (e) {
                console.error('Falha ao migrar senha para hash seguro', e);
                return { success: false, error: 'Erro ao validar credenciais' };
            }
        }

        if (!storedHash) {
            this.logAuthAttempt({
                username: user.username,
                normalizedUsername,
                userRole: user.role,
                statusCode: 401,
                success: false,
                reason: 'missing_password_hash',
                message: 'Senha incorreta',
                syncInfo
            });
            this.recordFailedAttempt(normalizedUsername);
            return { success: false, error: 'Senha incorreta' };
        }

        if (storedHash !== passwordHash) {
            // Compatibilidade com hashes anteriores (sem salt por usuário)
            const legacyHash = await Utils.hashSHA256(password, Utils.PASSWORD_SALT);

            if (storedHash !== legacyHash) {
                this.logAuthAttempt({
                    username: user.username,
                    normalizedUsername,
                    userRole: user.role,
                    statusCode: 401,
                    success: false,
                    reason: 'invalid_password',
                    message: 'Senha incorreta',
                    syncInfo
                });
                this.recordFailedAttempt(normalizedUsername);
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
        
        // Online-only mode: Use sessionStorage instead of localStorage
        sessionStorage.setItem('diversey_current_user', JSON.stringify(this.currentUser));
        
        // Clear rate limit on successful login
        this.clearRateLimit(normalizedUsername);

        this.logAuthAttempt({
            username: user.username,
            normalizedUsername,
            userRole: user.role,
            statusCode: 200,
            success: true,
            reason: 'login_success',
            message: 'Autenticação bem-sucedida',
            syncInfo
        });

        return { success: true, user: this.currentUser };
    },

    /**
     * Logout
     */
    logout() {
        this.currentUser = null;
        // Online-only mode: Clear sessionStorage instead of localStorage
        sessionStorage.removeItem('diversey_current_user');
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
        if (!role) {
            return false;
        }
        
        const perms = this.permissions[role];
        if (!perms) {
            return false;
        }
        
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
        
        if (!nav) {
            return;
        }
        
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
        if (hasMenuItem) {
            return true;
        }
        
        // Special cases for technician
        if (role === 'tecnico') {
            if (routeId === 'solicitacoes' || routeId === 'minhas-solicitacoes') {
                return true;
            }
            if (routeId === 'nova-solicitacao') {
                return true;
            }
            if (routeId === 'catalogo' || routeId === 'pecas') {
                return true;
            }
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
    },

    /**
     * Persist authentication attempt for diagnostics
     * Online-only mode: Logs only to console and structured Logger (no localStorage)
     */
    logAuthAttempt({ username, normalizedUsername = null, userRole, statusCode, success, reason, message: _message, syncInfo = {} }) {
        try {
            const deviceId = (typeof CloudStorage !== 'undefined' && typeof CloudStorage.getDeviceId === 'function')
                ? CloudStorage.getDeviceId()
                : 'device_local';

            const payload = {
                username: username || '',
                normalizedUsername: normalizedUsername || (typeof DataManager !== 'undefined' ? DataManager.normalizeUsername(username || '') : Utils.normalizeText(username || '')),
                role: userRole || null,
                syncInfo,
                device: {
                    id: deviceId,
                    userAgent: (typeof navigator !== 'undefined' && navigator.userAgent) ? navigator.userAgent : 'unknown',
                    platform: (typeof navigator !== 'undefined' && navigator.platform) ? navigator.platform : 'unknown',
                    language: (typeof navigator !== 'undefined' && navigator.language) ? navigator.language : 'unknown'
                }
            };

            // Online-only mode: Do not persist auth logs to localStorage
            // Only log to structured Logger for health panel and console

            // Integrate with structured Logger for health panel
            if (typeof Logger !== 'undefined') {
                Logger.logAuth(reason, {
                    username: payload.username,
                    role: payload.role,
                    statusCode,
                    success,
                    deviceId
                });
            }

            const logFn = success ? console.info : console.warn;
            logFn('[AUTH]', statusCode, reason, payload);
        } catch (e) {
            console.warn('Falha ao registrar tentativa de autenticação', e);
        }
    },

    /**
     * Check if user is rate limited due to failed login attempts.
     * Implements progressive lockout: each lockout period doubles.
     * Online-only mode: Uses in-memory cache instead of localStorage.
     * @param {string} normalizedUsername - Normalized username
     * @returns {object} { allowed: boolean, remainingMs: number }
     */
    checkRateLimit(normalizedUsername) {
        try {
            const userAttempts = this._rateLimitCache[normalizedUsername];
            
            if (!userAttempts) {
                return { allowed: true, remainingMs: 0 };
            }
            
            const now = Date.now();
            
            // Check if currently locked out
            if (userAttempts.lockedUntil && userAttempts.lockedUntil > now) {
                return { 
                    allowed: false, 
                    remainingMs: userAttempts.lockedUntil - now 
                };
            }
            
            // If lockout expired, reset attempts but keep lockout count for progressive
            if (userAttempts.lockedUntil && userAttempts.lockedUntil <= now) {
                userAttempts.count = 0;
                userAttempts.lockedUntil = null;
            }
            
            return { allowed: true, remainingMs: 0 };
        } catch (e) {
            console.warn('Erro ao verificar rate limit', e);
            return { allowed: true, remainingMs: 0 };
        }
    },

    /**
     * Record a failed login attempt and apply lockout if threshold exceeded.
     * Online-only mode: Uses in-memory cache instead of localStorage.
     * @param {string} normalizedUsername - Normalized username
     */
    recordFailedAttempt(normalizedUsername) {
        try {
            if (!this._rateLimitCache[normalizedUsername]) {
                this._rateLimitCache[normalizedUsername] = {
                    count: 0,
                    lockoutCount: 0,
                    lockedUntil: null,
                    firstAttempt: Date.now()
                };
            }
            
            const userAttempts = this._rateLimitCache[normalizedUsername];
            userAttempts.count++;
            userAttempts.lastAttempt = Date.now();
            
            // Check if threshold exceeded
            if (userAttempts.count >= this.RATE_LIMIT.MAX_ATTEMPTS) {
                userAttempts.lockoutCount++;
                // Progressive lockout: each lockout doubles the duration
                const lockoutDuration = this.RATE_LIMIT.LOCKOUT_DURATION_MS * 
                    Math.pow(this.RATE_LIMIT.PROGRESSIVE_MULTIPLIER, userAttempts.lockoutCount - 1);
                // Cap at maximum lockout duration
                userAttempts.lockedUntil = Date.now() + Math.min(lockoutDuration, this.RATE_LIMIT.MAX_LOCKOUT_DURATION_MS);
                console.warn(`[AUTH] Usuario ${normalizedUsername} bloqueado por ${Math.ceil(lockoutDuration / 60000)} minutos`);
            }
        } catch (e) {
            console.warn('Erro ao registrar tentativa falha', e);
        }
    },

    /**
     * Clear rate limit for a user after successful login.
     * Online-only mode: Clears from in-memory cache.
     * @param {string} normalizedUsername - Normalized username
     */
    clearRateLimit(normalizedUsername) {
        try {
            delete this._rateLimitCache[normalizedUsername];
        } catch (e) {
            console.warn('Erro ao limpar rate limit', e);
        }
    },

    /**
     * Get all login attempts from in-memory cache.
     * Online-only mode: Returns in-memory rate limit data.
     * @returns {object} Attempts by username
     */
    getAttempts() {
        return this._rateLimitCache || {};
    },

    /**
     * Save login attempts - no-op in online-only mode.
     * Rate limit state is kept in memory only.
     * @param {object} _attempts - Attempts object (ignored)
     */
    saveAttempts(_attempts) {
        // Online-only mode: Rate limit state is in-memory only, no persistence
    }
};
