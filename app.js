/**
 * Main Application Controller
 * Orchestrates the entire application
 */

const App = {
    currentPage: null,

    /**
     * Get default landing page based on role
     */
    getDefaultPage() {
        const role = Auth.getRole();
        return role === 'tecnico' ? 'minhas-solicitacoes' : 'dashboard';
    },

    /**
     * Initialize application
     */
    async init() {
        // Initialize data (now async for cloud storage)
        await DataManager.init();
        this.renderLoginCredentials();
        
        // Check if user is logged in
        if (Auth.init()) {
            this.showApp();
        } else {
            this.showLogin();
        }
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Apply saved theme
        this.applyTheme();
    },

    /**
     * Set up global event listeners
     */
    setupEventListeners() {
        // Login form
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleLogin();
            });
        }
        
        // Logout button
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.handleLogout());
        }
        
        // Theme toggle
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => this.toggleTheme());
        }
        
        // Sidebar toggle
        const sidebarToggle = document.getElementById('sidebar-toggle');
        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', () => this.toggleSidebar());
        }
        
        // Mobile menu toggle
        const mobileMenuBtn = document.getElementById('mobile-menu-btn');
        if (mobileMenuBtn) {
            mobileMenuBtn.addEventListener('click', () => this.toggleSidebar());
        }

        // Mobile quick home
        const mobileHomeBtn = document.getElementById('mobile-home-btn');
        if (mobileHomeBtn) {
            mobileHomeBtn.addEventListener('click', () => this.navigate(this.getDefaultPage()));
        }

        const sidebarBackdrop = document.getElementById('sidebar-backdrop');
        if (sidebarBackdrop) {
            sidebarBackdrop.addEventListener('click', () => this.toggleSidebar(false));
        }

        // Pending badge click
        const pendingBadge = document.getElementById('pending-badge');
        if (pendingBadge) {
            pendingBadge.addEventListener('click', () => {
                if (Auth.hasPermission('aprovacoes', 'view')) {
                    this.navigate('aprovacoes');
                }
            });
        }

        const syncBtn = document.getElementById('sync-btn');
        if (syncBtn) {
            syncBtn.addEventListener('click', () => this.syncData());
        }
        
        // Close modal on escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                Utils.closeModal();
            }
        });

        // Breadcrumb home click
        const breadcrumb = document.getElementById('breadcrumb');
        if (breadcrumb) {
            breadcrumb.addEventListener('click', (e) => {
                if (e.target.closest('.breadcrumb-home')) {
                    this.navigate(this.getDefaultPage());
                }
            });
        }

        // Toggle password visibility
        const togglePassword = document.getElementById('toggle-password');
        if (togglePassword) {
            togglePassword.addEventListener('click', () => {
                const passwordInput = document.getElementById('login-password');
                if (!passwordInput) return;
                const icon = togglePassword.querySelector('i');
                const isHidden = passwordInput.type === 'password';
                passwordInput.type = isHidden ? 'text' : 'password';
                if (icon) {
                    icon.className = `fas ${isHidden ? 'fa-eye-slash' : 'fa-eye'}`;
                }
                togglePassword.setAttribute('aria-label', isHidden ? 'Ocultar senha' : 'Mostrar senha');
            });
        }
        
        // Handle mobile sidebar
        this.handleMobileSidebar();
    },

    /**
     * Handle mobile sidebar behavior
     */
    handleMobileSidebar() {
        // Close sidebar when clicking outside on mobile
        document.addEventListener('click', (e) => {
            const sidebar = document.getElementById('sidebar');
            const sidebarToggle = document.getElementById('sidebar-toggle');
            const mobileMenuBtn = document.getElementById('mobile-menu-btn');
            const sidebarBackdrop = document.getElementById('sidebar-backdrop');
            
            if (window.innerWidth <= 992 && sidebar) {
                const clickedToggle = (sidebarToggle && sidebarToggle.contains(e.target)) || (mobileMenuBtn && mobileMenuBtn.contains(e.target));
                const clickedInsideSidebar = sidebar.contains(e.target);
                const clickedBackdrop = sidebarBackdrop && sidebarBackdrop.contains(e.target);
                
                if (!clickedInsideSidebar && !clickedToggle && !clickedBackdrop) {
                    this.toggleSidebar(false);
                }
            }
        });
        
        // Handle resize
        window.addEventListener('resize', () => {
            const sidebar = document.getElementById('sidebar');
            const sidebarBackdrop = document.getElementById('sidebar-backdrop');
            if (window.innerWidth > 992) {
                sidebar.classList.remove('active');
                document.body.classList.remove('sidebar-open');
                if (sidebarBackdrop) sidebarBackdrop.classList.remove('active');
            }
        });
    },

    /**
     * Render credentials table on login screen
     */
    renderLoginCredentials() {
        const container = document.getElementById('login-credentials');
        const tbody = document.getElementById('login-credentials-body');
        
        if (!container || !tbody || typeof DataManager === 'undefined') return;
        
        const users = DataManager.getUsers();
        if (!Array.isArray(users) || users.length === 0) return;

        const sortedUsers = [...users].sort((a, b) => {
            const roleA = Auth.getRoleLabel(a.role || '') || '';
            const roleB = Auth.getRoleLabel(b.role || '') || '';
            const roleCompare = roleA.localeCompare(roleB, 'pt-BR');
            if (roleCompare !== 0) return roleCompare;
            const nameA = (a.name || a.username || '').toLowerCase();
            const nameB = (b.name || b.username || '').toLowerCase();
            return nameA.localeCompare(nameB, 'pt-BR');
        });

        const roleIcon = (role) => {
            if (role === 'administrador') return 'fa-user-shield';
            if (role === 'gestor') return 'fa-briefcase';
            return 'fa-user';
        };

        tbody.innerHTML = sortedUsers.map(user => {
            const roleLabel = Auth.getRoleLabel(user.role || '') || '';
            return `
                <tr>
                    <td>${Utils.escapeHtml(user.name || user.username || '')}</td>
                    <td><code>${Utils.escapeHtml(user.username || '')}</code></td>
                    <td><span class="role-chip"><i class="fas ${roleIcon(user.role)}"></i>${Utils.escapeHtml(roleLabel)}</span></td>
                </tr>
            `;
        }).join('');

        container.classList.remove('hidden');
    },

    /**
     * Show login screen
     */
    showLogin() {
        document.getElementById('login-screen').classList.remove('hidden');
        document.getElementById('app-container').classList.add('hidden');
        document.getElementById('login-username').focus();
    },

    /**
     * Show main application
     */
    showApp() {
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('app-container').classList.remove('hidden');
        
        // Determine default page based on role
        const defaultPage = this.getDefaultPage();
        
        // Render menu and navigate to default page
        Auth.renderMenu(defaultPage);
        this.navigate(defaultPage);
        
        // Set up navigation click handlers
        this.setupNavigation();
    },

    /**
     * Set up navigation handlers
     */
    setupNavigation() {
        document.getElementById('sidebar-nav').addEventListener('click', (e) => {
            const navItem = e.target.closest('.nav-item');
            if (navItem) {
                const pageId = navItem.dataset.page;
                if (pageId) {
                    this.navigate(pageId);
                    
                    // Close mobile sidebar
                    if (window.innerWidth <= 992) {
                        this.toggleSidebar(false);
                    }
                }
            }
        });
    },

    /**
     * Navigate to a page
     */
    navigate(pageId) {
        // Check access
        if (!Auth.canAccessRoute(pageId)) {
            Utils.showToast('Você não tem permissão para acessar esta página', 'error');
            return;
        }
        
        this.currentPage = pageId;
        
        // Update menu active state
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.page === pageId);
        });
        
        // Update breadcrumb
        this.updateBreadcrumb(pageId);
        
        // Render page content
        this.renderPage(pageId);
    },

    /**
     * Update breadcrumb
     */
    updateBreadcrumb(pageId) {
        const breadcrumb = document.getElementById('breadcrumb');
        const labels = {
            'dashboard': 'Dashboard',
            'solicitacoes': 'Solicitações',
            'minhas-solicitacoes': 'Minhas Solicitações',
            'nova-solicitacao': 'Nova Solicitação',
            'aprovacoes': 'Aprovações',
            'tecnicos': 'Técnicos',
            'fornecedores': 'Fornecedores',
            'pecas': 'Peças',
            'catalogo': 'Catálogo de Peças',
            'relatorios': 'Relatórios',
            'configuracoes': 'Configurações',
            'ajuda': 'Ajuda',
            'perfil': 'Meu Perfil'
        };
        
        breadcrumb.innerHTML = `
            <button type="button" class="breadcrumb-home" aria-label="Voltar para início">
                <i class="fas fa-home"></i>
                <span>Início</span>
            </button>
            <i class="fas fa-chevron-right" style="font-size: 0.7rem; margin: 0 0.5rem; opacity: 0.5;"></i>
            <span>${labels[pageId] || pageId}</span>
        `;
    },

    /**
     * Render page content
     */
    renderPage(pageId) {
        Utils.showLoading();
        
        // Simulate async loading for UX
        setTimeout(() => {
            switch (pageId) {
                case 'dashboard':
                    Dashboard.render();
                    break;
                    
                case 'solicitacoes':
                case 'minhas-solicitacoes':
                    Solicitacoes.render();
                    break;
                    
                case 'nova-solicitacao':
                    Solicitacoes.openForm();
                    // Navigate to solicitations after modal closes
                    Solicitacoes.render();
                    break;
                    
                case 'aprovacoes':
                    Aprovacoes.render();
                    break;
                    
                case 'tecnicos':
                    Tecnicos.render();
                    break;
                    
                case 'fornecedores':
                    Fornecedores.render();
                    break;
                    
                case 'pecas':
                case 'catalogo':
                    Pecas.render();
                    break;
                    
                case 'relatorios':
                    Relatorios.render();
                    setTimeout(() => Relatorios.initCharts(), 100);
                    break;
                    
                case 'configuracoes':
                    this.renderConfiguracoes();
                    break;
                    
                case 'ajuda':
                    this.renderAjuda();
                    break;
                    
                case 'perfil':
                    this.renderPerfil();
                    break;
                    
                default:
                    this.renderNotFound();
            }
            
            Utils.hideLoading();
        }, 100);
    },

    /**
     * Handle login
     */
    async handleLogin() {
        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value;
        const errorDiv = document.getElementById('login-error');
        
        if (!username || !password) {
            errorDiv.textContent = 'Preencha usuário e senha';
            errorDiv.classList.remove('hidden');
            return;
        }
        
        let result;
        try {
            result = await Auth.login(username, password);
        } catch (error) {
            console.error('Erro de autenticação', error);
            errorDiv.textContent = 'Erro ao autenticar. Tente novamente.';
            errorDiv.classList.remove('hidden');
            return;
        }
        
        if (result.success) {
            errorDiv.classList.add('hidden');
            document.getElementById('login-form').reset();
            Utils.showToast(`Bem-vindo, ${result.user.name}!`, 'success');
            this.showApp();
        } else {
            errorDiv.textContent = result.error;
            errorDiv.classList.remove('hidden');
        }
    },

    /**
     * Handle logout
     */
    async handleLogout() {
        const confirmed = await Utils.confirm('Deseja realmente sair?', 'Sair');
        
        if (confirmed) {
            Auth.logout();
            Utils.showToast('Sessão encerrada', 'info');
            this.showLogin();
        }
    },

    /**
     * Toggle theme
     */
    toggleTheme() {
        const body = document.body;
        const isDark = body.classList.contains('dark-mode');
        
        if (isDark) {
            body.classList.remove('dark-mode');
            body.classList.add('light-mode');
            DataManager.saveSetting('theme', 'light');
        } else {
            body.classList.remove('light-mode');
            body.classList.add('dark-mode');
            DataManager.saveSetting('theme', 'dark');
        }
        
        // Update icon
        const themeIcon = document.querySelector('#theme-toggle i');
        if (themeIcon) {
            themeIcon.className = isDark ? 'fas fa-moon' : 'fas fa-sun';
        }
        
        // Refresh charts if on dashboard or reports
        if (this.currentPage === 'dashboard') {
            Dashboard.render();
        } else if (this.currentPage === 'relatorios') {
            Relatorios.render();
            setTimeout(() => Relatorios.initCharts(), 100);
        }
    },

    /**
     * Apply saved theme
     */
    applyTheme() {
        const settings = DataManager.getSettings();
        const theme = settings.theme || 'light';
        const body = document.body;
        
        body.classList.remove('light-mode', 'dark-mode');
        body.classList.add(`${theme}-mode`);
        
        // Update icon
        const themeIcon = document.querySelector('#theme-toggle i');
        if (themeIcon) {
            themeIcon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        }
    },

    /**
     * Toggle sidebar
     */
    toggleSidebar(forceState = null) {
        const sidebar = document.getElementById('sidebar');
        const sidebarBackdrop = document.getElementById('sidebar-backdrop');
        if (!sidebar) return;
        
        if (window.innerWidth <= 992) {
            // Mobile: toggle active class
            const shouldOpen = forceState !== null ? forceState : !sidebar.classList.contains('active');
            sidebar.classList.toggle('active', shouldOpen);
            document.body.classList.toggle('sidebar-open', shouldOpen);
            if (sidebarBackdrop) {
                sidebarBackdrop.classList.toggle('active', shouldOpen);
            }
        } else {
            // Desktop: toggle collapsed class
            sidebar.classList.toggle('collapsed');
        }
    },

    /**
     * Render settings page
     */
    renderConfiguracoes() {
        const content = document.getElementById('content-area');
        const settings = DataManager.getSettings();
        const canEdit = Auth.hasPermission('configuracoes', 'edit');
        const isCloudAvailable = DataManager.isCloudAvailable();
        const canManageGestores = Auth.getRole() === 'administrador';
        
        content.innerHTML = `
            <div class="page-header">
                <h2><i class="fas fa-cog"></i> Configurações</h2>
            </div>
            
            <!-- Cloud Storage Status -->
            <div class="cloud-status ${isCloudAvailable ? 'connected' : 'disconnected'}">
                <i class="fas ${isCloudAvailable ? 'fa-cloud' : 'fa-cloud-slash'}"></i>
                <div>
                    <strong>${isCloudAvailable ? 'Conectado à Nuvem' : 'Armazenamento Local'}</strong>
                    <p class="mb-0" style="font-size: 0.875rem;">
                        ${isCloudAvailable 
                            ? 'Os dados são sincronizados automaticamente entre dispositivos.' 
                            : 'Os dados estão sendo salvos apenas neste dispositivo. A sincronização em nuvem não está disponível.'}
                    </p>
                </div>
                ${isCloudAvailable ? `
                    <button class="btn btn-sm btn-outline" onclick="App.syncData()" style="margin-left: auto;">
                        <i class="fas fa-sync-alt"></i> Sincronizar Agora
                    </button>
                ` : ''}
            </div>
            
            <div class="card">
                <div class="card-header">
                    <h4>Parâmetros do Sistema</h4>
                </div>
                <div class="card-body">
                    <form id="settings-form">
                        <div class="form-row">
                            <div class="form-group">
                                <label for="sla-hours">SLA de Aprovação (horas)</label>
                                <input type="number" id="sla-hours" class="form-control" 
                                       value="${settings.slaHours || 24}" min="1" max="168"
                                       ${!canEdit ? 'disabled' : ''}>
                                <small class="text-muted">Tempo máximo esperado para aprovar uma solicitação</small>
                            </div>
                            <div class="form-group">
                                <label for="items-per-page">Itens por Página</label>
                                <select id="items-per-page" class="form-control" ${!canEdit ? 'disabled' : ''}>
                                    <option value="10" ${settings.itemsPerPage == 10 ? 'selected' : ''}>10</option>
                                    <option value="20" ${settings.itemsPerPage == 20 ? 'selected' : ''}>20</option>
                                    <option value="30" ${settings.itemsPerPage == 30 ? 'selected' : ''}>30</option>
                                    <option value="50" ${settings.itemsPerPage == 50 ? 'selected' : ''}>50</option>
                                </select>
                            </div>
                        </div>
                        
                        ${canEdit ? `
                            <button type="button" class="btn btn-primary" onclick="App.saveSettings()">
                                <i class="fas fa-save"></i> Salvar Configurações
                            </button>
                        ` : ''}
                    </form>
                </div>
            </div>
            
            ${canManageGestores ? `
                <div class="card mt-3">
                    <div class="card-header">
                        <h4>Gestores</h4>
                    </div>
                    <div class="card-body">
                        <form id="gestor-form">
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="gestor-name">Nome *</label>
                                    <input type="text" id="gestor-name" class="form-control" placeholder="Nome completo do gestor" required>
                                </div>
                                <div class="form-group">
                                    <label for="gestor-email">Email *</label>
                                    <input type="email" id="gestor-email" class="form-control" placeholder="email@empresa.com" required>
                                </div>
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="gestor-username">Usuário *</label>
                                    <input type="text" id="gestor-username" class="form-control" placeholder="login do gestor" required>
                                </div>
                                <div class="form-group">
                                    <label for="gestor-password">Senha *</label>
                                    <input type="password" id="gestor-password" class="form-control" placeholder="Senha inicial" required>
                                </div>
                            </div>
                            <button type="button" class="btn btn-primary" onclick="App.handleCreateGestor()">
                                <i class="fas fa-user-plus"></i> Adicionar Gestor
                            </button>
                        </form>

                        <div class="table-container mt-3">
                            <table class="table">
                                <thead>
                                    <tr>
                                        <th>Nome</th>
                                        <th>Usuário</th>
                                        <th>Email</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${(() => {
                                        const gestores = DataManager.getGestorUsers();
                                        if (!gestores || gestores.length === 0) {
                                            return '<tr><td colspan="3" class="text-muted">Nenhum gestor cadastrado.</td></tr>';
                                        }
                                        return gestores.map(g => `
                                            <tr>
                                                <td>${Utils.escapeHtml(g.name || '-')}</td>
                                                <td><code>${Utils.escapeHtml(g.username || '-')}</code></td>
                                                <td>${Utils.escapeHtml(g.email || '-')}</td>
                                            </tr>
                                        `).join('');
                                    })()}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            ` : ''}

            <div class="card mt-3">
                <div class="card-header">
                    <h4>Sincronização de Dados</h4>
                </div>
                <div class="card-body">
                    <p class="text-muted">
                        ${isCloudAvailable 
                            ? 'Os dados são armazenados na nuvem e sincronizados automaticamente entre todos os dispositivos. Pedidos feitos em um dispositivo móvel serão visíveis em qualquer outro dispositivo.' 
                            : 'Este sistema está configurado para usar armazenamento local. Para habilitar a sincronização entre dispositivos, é necessário configurar o Firebase.'}
                    </p>
                    
                    <div class="btn-group">
                        <button class="btn btn-primary" onclick="App.syncData()">
                            <i class="fas fa-sync-alt"></i> Sincronizar Dados
                        </button>
                        <button class="btn btn-warning" onclick="App.resetData()">
                            <i class="fas fa-undo"></i> Resetar Dados
                        </button>
                        <button class="btn btn-danger" onclick="App.clearAllData()">
                            <i class="fas fa-trash"></i> Limpar Todos os Dados
                        </button>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Save settings
     */
    saveSettings() {
        const slaHours = parseInt(document.getElementById('sla-hours').value);
        const itemsPerPage = parseInt(document.getElementById('items-per-page').value);
        
        DataManager.saveSetting('slaHours', slaHours);
        DataManager.saveSetting('itemsPerPage', itemsPerPage);
        
        Utils.showToast('Configurações salvas com sucesso', 'success');
    },

    /**
     * Add new gestor account (admin only)
     */
    async handleCreateGestor() {
        if (Auth.getRole() !== 'administrador') {
            Utils.showToast('Apenas administradores podem adicionar gestores', 'error');
            return;
        }

        const name = document.getElementById('gestor-name')?.value.trim();
        const username = document.getElementById('gestor-username')?.value.trim();
        const password = document.getElementById('gestor-password')?.value;
        const email = document.getElementById('gestor-email')?.value.trim();
        const emailInput = document.getElementById('gestor-email');

        if (emailInput && !emailInput.checkValidity()) {
            emailInput.reportValidity();
            return;
        }

        if (!name || !username || !password) {
            Utils.showToast('Informe nome, usuário, e-mail e senha do gestor', 'warning');
            return;
        }

        let passwordHash;
        try {
            passwordHash = await Utils.hashSHA256(password, `${Utils.PASSWORD_SALT}:${username}`);
        } catch (error) {
            console.error('Erro ao gerar hash da senha do gestor', error);
            Utils.showToast('Não foi possível gerar a senha com segurança', 'error');
            return;
        }

        const result = await DataManager.saveUser({
            name,
            username,
            passwordHash,
            email,
            role: 'gestor'
        });

        if (!result.success) {
            Utils.showToast(result.error || 'Erro ao salvar gestor', 'error');
            return;
        }

        Utils.showToast('Gestor adicionado com sucesso', 'success');
        const form = document.getElementById('gestor-form');
        if (form) form.reset();
        this.renderConfiguracoes();
        Auth.renderMenu(this.currentPage);
    },

    /**
     * Reset data to defaults
     */
    async resetData() {
        if (Auth.getRole() !== 'administrador') {
            Utils.showToast('Apenas administradores podem resetar dados', 'error');
            return;
        }
        const confirmed = await Utils.confirm(
            'Isso irá resetar todos os dados para os valores padrão oficiais. Continuar?',
            'Resetar Dados'
        );
        
        if (!confirmed) return;

        const confirmedAgain = await Utils.confirm(
            'Confirme novamente: deseja realmente resetar todos os dados?',
            'Confirmar Reset'
        );
        
        if (!confirmedAgain) return;

        // Clear all keys and reinitialize
        Object.values(DataManager.KEYS).forEach(key => {
            localStorage.removeItem(key);
        });
        
        DataManager.init();
        
        Utils.showToast('Dados resetados com sucesso', 'success');
        
        // Refresh current page
        this.navigate(this.currentPage);
        Auth.renderMenu(this.currentPage);
    },

    /**
     * Sync data with cloud storage
     */
    async syncData() {
        const syncBtn = document.getElementById('sync-btn');
        if (syncBtn) {
            syncBtn.classList.add('rotating');
        }
        
        try {
            if (typeof CloudStorage !== 'undefined' && DataManager.isCloudAvailable()) {
                await CloudStorage.syncFromCloud();
                Utils.showToast('Dados sincronizados com sucesso', 'success');
                
                // Refresh current page
                this.renderPage(this.currentPage);
                Auth.renderMenu(this.currentPage);
            } else {
                Utils.showToast('Sincronização em nuvem não disponível', 'warning');
            }
        } catch (error) {
            console.error('Sync error:', error);
            Utils.showToast('Erro ao sincronizar dados', 'error');
        } finally {
            if (syncBtn) {
                syncBtn.classList.remove('rotating');
            }
        }
    },

    /**
     * Clear all data
     */
    async clearAllData() {
        if (Auth.getRole() !== 'administrador') {
            Utils.showToast('Apenas administradores podem limpar todos os dados', 'error');
            return;
        }
        const confirmed = await Utils.confirm(
            'Isso irá APAGAR TODOS OS DADOS permanentemente. Esta ação não pode ser desfeita. Continuar?',
            'Limpar Dados'
        );
        
        if (!confirmed) return;

        const confirmedAgain = await Utils.confirm(
            'Confirme novamente para remover todos os dados. Esta ação é irreversível.',
            'Confirmar Limpeza'
        );
        if (!confirmedAgain) return;

        // Clear all localStorage
        localStorage.clear();
        
        Utils.showToast('Todos os dados foram limpos', 'info');
        
        // Logout and show login
        Auth.logout();
        this.showLogin();
    },

    /**
     * Render help page
     */
    renderAjuda() {
        const content = document.getElementById('content-area');
        
        content.innerHTML = `
            <div class="page-header">
                <h2><i class="fas fa-question-circle"></i> Ajuda</h2>
            </div>
            
            <div class="card">
                <div class="card-header">
                    <h4>Guia Rápido</h4>
                </div>
                <div class="card-body">
                    <h5>Como criar uma solicitação?</h5>
                    <ol>
                        <li>Clique em "Nova Solicitação" no menu</li>
                        <li>Selecione a data e, se aplicável, o técnico</li>
                        <li>Use o campo de busca para encontrar e adicionar peças</li>
                        <li>Ajuste as quantidades conforme necessário</li>
                        <li>Adicione desconto e frete se aplicável</li>
                        <li>Clique em "Enviar para Aprovação" ou "Salvar Rascunho"</li>
                    </ol>
                    
                    <h5 class="mt-4">Como buscar peças rapidamente?</h5>
                    <ul>
                        <li>Digite o código ou parte da descrição no campo de busca</li>
                        <li>O sistema busca por prefixo primeiro (mais relevante)</li>
                        <li>Use as setas ↑↓ para navegar e Enter para selecionar</li>
                        <li>Peças recentes aparecem abaixo do campo para acesso rápido</li>
                    </ul>
                    
                    <h5 class="mt-4">Status das Solicitações</h5>
                    <table class="table">
                        <tbody>
                            <tr>
                                <td>${Utils.renderStatusBadge('rascunho')}</td>
                                <td>Solicitação salva mas não enviada</td>
                            </tr>
                            <tr>
                                <td>${Utils.renderStatusBadge('pendente')}</td>
                                <td>Aguardando aprovação do gestor</td>
                            </tr>
                            <tr>
                                <td>${Utils.renderStatusBadge('aprovada')}</td>
                                <td>Aprovada e encaminhada ao fornecedor</td>
                            </tr>
                            <tr>
                                <td>${Utils.renderStatusBadge('rejeitada')}</td>
                                <td>Rejeitada pelo gestor</td>
                            </tr>
                            <tr>
                                <td>${Utils.renderStatusBadge('em-transito')}</td>
                                <td>Rastreio informado e material enviado pelo fornecedor</td>
                            </tr>
                            <tr>
                                <td>${Utils.renderStatusBadge('entregue')}</td>
                                <td>Entrega confirmada pelo técnico</td>
                            </tr>
                            <tr>
                                <td>${Utils.renderStatusBadge('finalizada')}</td>
                                <td>Solicitação concluída</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
            
            <div class="card mt-3">
                <div class="card-header">
                    <h4>Contato</h4>
                </div>
                <div class="card-body">
                    <p>Para suporte técnico, entre em contato:</p>
                    <p>
                        <i class="fas fa-envelope"></i> suporte@diversey.com<br>
                        <i class="fas fa-phone"></i> (11) 3000-0000
                    </p>
                </div>
            </div>
        `;
    },

    /**
     * Render profile page
     */
    renderPerfil() {
        const content = document.getElementById('content-area');
        const user = Auth.getCurrentUser();
        if (!user) {
            Utils.showToast('Sessão expirada. Faça login novamente.', 'warning');
            this.showLogin();
            return;
        }
        
        content.innerHTML = `
            <div class="page-header">
                <h2><i class="fas fa-user-cog"></i> Meu Perfil</h2>
            </div>
            
            <div class="card">
                <div class="card-body">
                    <div class="form-row">
                        <div class="form-group">
                            <label>Nome</label>
                            <p><strong>${Utils.escapeHtml(user.name)}</strong></p>
                        </div>
                        <div class="form-group">
                            <label>Email</label>
                            <p><strong>${Utils.escapeHtml(user.email || '-')}</strong></p>
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label>Usuário</label>
                            <p><strong>${Utils.escapeHtml(user.username)}</strong></p>
                        </div>
                        <div class="form-group">
                            <label>Perfil</label>
                            <p><strong>${Auth.getRoleLabel(user.role)}</strong></p>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="card mt-3">
                <div class="card-header">
                    <h4>Alterar Senha</h4>
                </div>
                <div class="card-body">
                    <form id="password-form">
                        <div class="form-group">
                            <label for="current-password">Senha Atual</label>
                            <input type="password" id="current-password" class="form-control">
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="new-password">Nova Senha</label>
                                <input type="password" id="new-password" class="form-control">
                            </div>
                            <div class="form-group">
                                <label for="confirm-password">Confirmar Nova Senha</label>
                                <input type="password" id="confirm-password" class="form-control">
                            </div>
                        </div>
                        <button type="button" class="btn btn-primary" onclick="App.changePassword()">
                            <i class="fas fa-key"></i> Alterar Senha
                        </button>
                    </form>
                </div>
            </div>
        `;
    },

    /**
     * Change password
     */
    async changePassword() {
        const current = document.getElementById('current-password').value;
        const newPass = document.getElementById('new-password').value;
        const confirm = document.getElementById('confirm-password').value;
        
        if (!current || !newPass || !confirm) {
            Utils.showToast('Preencha todos os campos', 'warning');
            return;
        }
        
        if (newPass !== confirm) {
            Utils.showToast('As senhas não conferem', 'error');
            return;
        }
        
        if (newPass.length < 4) {
            Utils.showToast('A senha deve ter pelo menos 4 caracteres', 'warning');
            return;
        }
        
        // Verify current password
        const user = Auth.getCurrentUser();
        if (!user) {
            Utils.showToast('Sessão expirada. Faça login novamente.', 'error');
            return;
        }
        const users = DataManager.getUsers();
        const dbUser = users.find(u => u.id === user.id);
        
        if (!dbUser) {
            Utils.showToast('Usuário não encontrado', 'error');
            return;
        }

        let currentHash;
        try {
            currentHash = await Auth.hashPassword(current, user.username);
        } catch (error) {
            console.error('Erro ao validar senha atual', error);
            Utils.showToast('Erro ao validar senha atual', 'error');
            return;
        }
        if (dbUser.passwordHash !== currentHash) {
            Utils.showToast('Senha atual incorreta', 'error');
            return;
        }
        
        // Update password
        try {
            dbUser.passwordHash = await Auth.hashPassword(newPass, user.username);
        } catch (error) {
            console.error('Erro ao atualizar senha', error);
            Utils.showToast('Erro ao atualizar senha', 'error');
            return;
        }
        delete dbUser.password;
        DataManager.saveData(DataManager.KEYS.USERS, users);
        
        Utils.showToast('Senha alterada com sucesso', 'success');
        
        // Clear form
        document.getElementById('password-form').reset();
    },

    /**
     * Render 404 page
     */
    renderNotFound() {
        const content = document.getElementById('content-area');
        
        content.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h4>Página não encontrada</h4>
                <p>A página que você está procurando não existe.</p>
                <button class="btn btn-primary" onclick="App.navigate('dashboard')">
                    <i class="fas fa-home"></i> Voltar ao Início
                </button>
            </div>
        `;
    }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await App.init();
    } catch (error) {
        console.error('Application initialization error:', error);
        // Show error message to user
        if (typeof Utils !== 'undefined' && Utils.showToast) {
            Utils.showToast('Erro ao inicializar aplicação', 'error');
        }
    }
});
