/**
 * Main Application Controller
 * Orchestrates the entire application
 */

const CHART_INIT_DELAY_MS = 100;
const PAGE_RENDER_TIMEOUT_MS = 15000;
const BOOTSTRAP_TIMEOUT_MS = 20000;
const MODULE_LOAD_RETRY_LIMIT = 2;
const APP_BUILD_VERSION = (typeof window !== 'undefined' && window.__APP_BUILD_VERSION__)
    ? String(window.__APP_BUILD_VERSION__)
    : '20260308i';
const APP_CACHE_VERSION = (typeof window !== 'undefined' && window.__APP_CACHE_VERSION__)
    ? String(window.__APP_CACHE_VERSION__)
    : 'v15';
const MODULE_REGISTRY = {
    dashboard: {
        routeIds: ['dashboard'],
        lazyModule: `./js/pages/dashboard.js?v=${APP_BUILD_VERSION}`,
        fallbackScripts: [`js/pecas.js?v=${APP_BUILD_VERSION}`, `js/solicitacoes.js?v=${APP_BUILD_VERSION}`, `js/aprovacoes.js?v=${APP_BUILD_VERSION}`, `js/dashboard.js?v=${APP_BUILD_VERSION}`],
        globals: ['Dashboard'],
        primaryGlobal: 'Dashboard'
    },
    solicitacoes: {
        routeIds: ['solicitacoes', 'minhas-solicitacoes', 'nova-solicitacao'],
        lazyModule: `./js/pages/solicitacoes.js?v=${APP_BUILD_VERSION}`,
        fallbackScripts: [`js/pecas.js?v=${APP_BUILD_VERSION}`, `js/solicitacoes.js?v=${APP_BUILD_VERSION}`],
        globals: ['Solicitacoes'],
        primaryGlobal: 'Solicitacoes'
    },
    aprovacoes: {
        routeIds: ['aprovacoes'],
        lazyModule: `./js/pages/aprovacoes.js?v=${APP_BUILD_VERSION}`,
        fallbackScripts: [`js/solicitacoes.js?v=${APP_BUILD_VERSION}`, `js/aprovacoes.js?v=${APP_BUILD_VERSION}`],
        globals: ['Aprovacoes'],
        primaryGlobal: 'Aprovacoes'
    },
    pecas: {
        routeIds: ['pecas', 'catalogo'],
        lazyModule: `./js/pages/pecas.js?v=${APP_BUILD_VERSION}`,
        fallbackScripts: [`js/pecas.js?v=${APP_BUILD_VERSION}`],
        globals: ['Pecas'],
        primaryGlobal: 'Pecas'
    },
    relatorios: {
        routeIds: ['relatorios'],
        lazyModule: `./js/pages/relatorios.js?v=${APP_BUILD_VERSION}`,
        fallbackScripts: [`js/relatorios.js?v=${APP_BUILD_VERSION}`],
        globals: ['Relatorios'],
        primaryGlobal: 'Relatorios'
    },
    fornecedor: {
        routeIds: ['fornecedor'],
        lazyModule: `./js/pages/fornecedor.js?v=${APP_BUILD_VERSION}`,
        fallbackScripts: [`js/fornecedor.js?v=${APP_BUILD_VERSION}`],
        globals: ['FornecedorPortal'],
        primaryGlobal: 'FornecedorPortal'
    },
    usuarios: {
        routeIds: ['tecnicos', 'fornecedores', 'usuarios'],
        lazyModule: `./js/pages/usuarios.js?v=${APP_BUILD_VERSION}`,
        fallbackScripts: [`js/tecnicos.js?v=${APP_BUILD_VERSION}`, `js/fornecedores.js?v=${APP_BUILD_VERSION}`, `js/usuarios.js?v=${APP_BUILD_VERSION}`],
        globals: ['Tecnicos', 'Fornecedores', 'Usuarios'],
        primaryGlobal: 'Usuarios'
    }
};

const App = {
    currentPage: null,
    moduleRegistry: MODULE_REGISTRY,
    lazyModules: Object.fromEntries(Object.entries(MODULE_REGISTRY).map(([key, descriptor]) => [key, descriptor.lazyModule])),
    fallbackScripts: Object.fromEntries(Object.entries(MODULE_REGISTRY).map(([key, descriptor]) => [key, descriptor.fallbackScripts.slice()])),
    _lazyLoaded: {},
    _navigationBound: false,
    _lastRenderToken: 0,

    /**
     * Get default landing page based on role
     */
    getDefaultPage() {
        const role = Auth.getRole();
        if (role === 'tecnico') {
            return 'minhas-solicitacoes';
        }
        if (role === 'fornecedor') {
            return 'fornecedor';
        }
        return 'dashboard';
    },

    /**
     * Initialize application
     */
    async init() {
        // Set up event listeners FIRST to prevent form from submitting before handlers are attached
        this.setupEventListeners();

        let initialized = false;
        try {
            initialized = await this.runWithTimeout(
                DataManager.init(),
                BOOTSTRAP_TIMEOUT_MS,
                'bootstrap_timeout'
            );
        } catch (error) {
            initialized = false;
            this.logUiFailure('bootstrap_failed', {
                requestId: 'bootstrap:init',
                action: 'bootstrap',
                stage: 'bootstrap',
                route: 'init',
                module: 'app',
                source: 'app',
                errorCode: error?.code || error?.message || 'bootstrap_failed',
                originalError: error?.message || String(error || 'bootstrap_failed'),
                retryCount: 0
            });
            this.showBootstrapFailure(error);
            return false;
        }

        if (!initialized) {
            this.logUiFailure('bootstrap_failed', {
                requestId: 'bootstrap:init',
                action: 'bootstrap',
                stage: 'bootstrap',
                route: 'init',
                module: 'app',
                source: 'app',
                errorCode: 'bootstrap_failed',
                originalError: 'data_manager_init_failed',
                retryCount: 0
            });
            this.showBootstrapFailure(new Error('bootstrap_failed'));
            return false;
        }

        if (Auth.init()) {
            this.showApp();
        } else {
            this.showLogin();
        }

        this.applyTheme();
        return true;
    },

    showBootstrapFailure(error) {
        const code = error?.code || error?.message || 'bootstrap_failed';
        const message = code === 'bootstrap_timeout'
            ? 'A inicialização excedeu o tempo limite. Recarregue a página para buscar a versão correta dos arquivos.'
            : 'A aplicação não conseguiu concluir o bootstrap. Recarregue a página e tente novamente.';

        this.showLogin();

        const errorDiv = document.getElementById('login-error');
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.classList.remove('hidden');
        }

        if (typeof Utils !== 'undefined' && typeof Utils.hideLoading === 'function') {
            Utils.hideLoading(true);
        }
        if (typeof Utils !== 'undefined' && typeof Utils.showToast === 'function') {
            Utils.showToast(message, 'error');
        }
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
                if (!passwordInput) {
                    return;
                }
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

        // Data update events refresh only the active view without navigation
        window.addEventListener('data:updated', (event) => {
            this.refreshActiveView(event?.detail?.keys || []);
        });

        window.addEventListener('sync:operation', (event) => {
            this.updateSyncIndicator(event?.detail || {});
            const dashboardModule = this.getGlobalModule('Dashboard');
            if (this.currentPage === 'dashboard' && dashboardModule && typeof dashboardModule.render === 'function') {
                const state = String(event?.detail?.state || '').toLowerCase();
                if (['saving', 'synced', 'failed', 'pending', 'error'].includes(state)) {
                    dashboardModule.render();
                }
            }
        });

        window.addEventListener('sync:status', (event) => {
            this.updateSyncIndicator(event?.detail || {});
        });

        window.addEventListener('ui:loading-timeout', (event) => {
            const activePage = this.currentPage || this.getDefaultPage();
            const timeoutContext = event?.detail?.context || activePage;
            const timeoutReason = event?.detail?.reason || 'ui_loading_timeout';
            this.renderPageFallback(
                activePage,
                `A leitura da tela demorou mais que o esperado (${timeoutContext}).`,
                timeoutReason
            );
        });

        if (typeof DataManager !== 'undefined' && typeof DataManager.getSyncStatus === 'function') {
            this.updateSyncIndicator(DataManager.getSyncStatus());
        }
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
                if (sidebarBackdrop) {
                    sidebarBackdrop.classList.remove('active');
                }
            }
        });
    },

    /**
     * Show login screen
     * Credentials panel is BLOCKED in production environment.
     */
    showLogin() {
        document.getElementById('login-screen').classList.remove('hidden');
        document.getElementById('app-container').classList.add('hidden');
        document.getElementById('login-username').focus();
        
        // Control credentials panel visibility based on environment
        const credentialsPanel = document.getElementById('login-credentials');
        if (credentialsPanel) {
            // Check if credentials should be shown (blocked in production)
            const shouldShow = typeof APP_CONFIG !== 'undefined' 
                ? APP_CONFIG.shouldShowLoginCredentials() 
                : false;
            
            if (shouldShow) {
                credentialsPanel.classList.remove('hidden');
                this.populateCredentialsPanel();
            } else {
                // Ensure panel is hidden and cleared in production
                credentialsPanel.classList.add('hidden');
                const tbody = document.getElementById('login-credentials-body');
                if (tbody) {
                    tbody.innerHTML = '';
                }
            }
        }
    },

    /**
     * Populate credentials panel with available accounts (dev/staging only)
     * This method is only called when shouldShowLoginCredentials() returns true.
     */
    populateCredentialsPanel() {
        const tbody = document.getElementById('login-credentials-body');
        if (!tbody) {
            return;
        }
        
        // Sample credentials for dev/staging - NOT real production credentials
        const sampleCredentials = [
            { name: 'Administrador', username: 'admin', role: 'administrador' },
            { name: 'Welington Tavares', username: 'gestor', role: 'gestor' },
            { name: 'Técnico (recuperação)', username: 'tecnico', role: 'tecnico' },
            { name: 'Fornecedor EBST', username: 'fornecedor', role: 'fornecedor' }
        ];
        
        tbody.innerHTML = sampleCredentials.map(cred => `
            <tr>
                <td>${Utils.escapeHtml(cred.name)}</td>
                <td><code>${Utils.escapeHtml(cred.username)}</code></td>
                <td><span class="badge badge-${cred.role === 'administrador' ? 'danger' : 'warning'}">${Utils.escapeHtml(Auth.getRoleLabel(cred.role))}</span></td>
            </tr>
        `).join('');
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

        if (typeof DataManager !== 'undefined' && typeof DataManager.getSyncStatus === 'function') {
            this.updateSyncIndicator(DataManager.getSyncStatus());
        }
    },

    /**
     * Set up navigation handlers
     */
    setupNavigation() {
        if (this._navigationBound) {
            return;
        }

        const sidebarNav = document.getElementById('sidebar-nav');
        if (!sidebarNav) {
            return;
        }

        this._navigationBound = true;
        sidebarNav.addEventListener('click', (e) => {
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
    async navigate(pageId) {
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
        const renderToken = ++this._lastRenderToken;
        await this.renderPage(pageId, renderToken);
    },

    resolveLazyModuleKey(pageId) {
        const targetRoute = String(pageId || '').trim().toLowerCase();
        const entry = Object.entries(this.moduleRegistry).find(([, descriptor]) => (
            Array.isArray(descriptor?.routeIds) && descriptor.routeIds.includes(targetRoute)
        ));
        if (entry) {
            return entry[0];
        }
        return null;
    },

    getModuleDescriptor(keyOrPageId) {
        const directKey = String(keyOrPageId || '').trim();
        const key = this.moduleRegistry[directKey]
            ? directKey
            : this.resolveLazyModuleKey(directKey);
        if (!key || !this.moduleRegistry[key]) {
            return null;
        }
        return {
            key,
            ...this.moduleRegistry[key]
        };
    },

    isLazyKeyReady(key) {
        const descriptor = this.getModuleDescriptor(key);
        if (!descriptor) {
            return true;
        }
        return (descriptor.globals || []).every((globalName) => !!this.getGlobalModule(globalName));
    },

    normalizeAssetUrl(value) {
        try {
            return new URL(String(value || ''), window.location.href).href;
        } catch (_error) {
            return String(value || '');
        }
    },

    buildRetryAssetUrl(value, retryCount = 0) {
        try {
            const url = new URL(String(value || ''), window.location.href);
            if (retryCount > 0) {
                url.searchParams.set('__retry', String(retryCount));
                url.searchParams.set('__build', this.getBuildVersion());
            }
            return url.href;
        } catch (_error) {
            return String(value || '');
        }
    },

    getBuildVersion() {
        return APP_BUILD_VERSION;
    },

    getCacheVersion() {
        return APP_CACHE_VERSION;
    },

    createModuleError(code, details = {}) {
        const error = new Error(details?.message || code);
        error.code = code;
        Object.assign(error, details);
        return error;
    },

    async loadTrackedScript(baseSrc, options = {}) {
        const actualSrc = options?.actualSrc || baseSrc;
        const selectorBase = options?.selectorBase || 'data-fallback-base';
        const selectorSrc = options?.selectorSrc || 'data-fallback-src';
        const normalizedBaseSrc = this.normalizeAssetUrl(baseSrc);
        const normalizedActualSrc = this.normalizeAssetUrl(actualSrc);
        const selector = `script[${selectorBase}="${normalizedBaseSrc}"]`;

        const removeNode = (node) => {
            if (node && node.parentNode) {
                node.parentNode.removeChild(node);
            }
        };

        return new Promise((resolve, reject) => {
            let timeoutHandle = null;

            const clearTimeoutHandle = () => {
                if (timeoutHandle) {
                    clearTimeout(timeoutHandle);
                    timeoutHandle = null;
                }
            };

            const fail = (code, message, originalError = null, scriptNode = null) => {
                clearTimeoutHandle();
                if (scriptNode) {
                    scriptNode.dataset.loadState = 'error';
                }
                reject(this.createModuleError(code, {
                    message,
                    originalError,
                    src: normalizedBaseSrc,
                    actualSrc: normalizedActualSrc
                }));
            };

            let existing = document.querySelector(selector)
                || document.querySelector(`script[${selectorSrc}="${normalizedBaseSrc}"]`);

            if (existing) {
                const state = String(existing.dataset.loadState || '');
                if (existing.dataset.loaded === 'true') {
                    resolve();
                    return;
                }
                if (state === 'error') {
                    removeNode(existing);
                    existing = null;
                }
            }

            if (existing) {
                existing.addEventListener('load', () => {
                    clearTimeoutHandle();
                    resolve();
                }, { once: true });
                existing.addEventListener('error', (event) => {
                    fail(`module_load_failed:${normalizedBaseSrc}`, `Falha ao carregar ${normalizedBaseSrc}`, event, existing);
                }, { once: true });
                timeoutHandle = setTimeout(() => {
                    fail(`module_load_timeout:${normalizedBaseSrc}`, `Timeout ao carregar ${normalizedBaseSrc}`, null, existing);
                }, PAGE_RENDER_TIMEOUT_MS);
                return;
            }

            const script = document.createElement('script');
            script.src = normalizedActualSrc;
            script.async = true;
            script.dataset.fallbackBase = normalizedBaseSrc;
            script.dataset.fallbackSrc = normalizedActualSrc;
            script.dataset.loaded = 'false';
            script.dataset.loadState = 'loading';
            script.onload = () => {
                clearTimeoutHandle();
                script.dataset.loaded = 'true';
                script.dataset.loadState = 'loaded';
                resolve();
            };
            script.onerror = (event) => {
                fail(`module_load_failed:${normalizedBaseSrc}`, `Falha ao carregar ${normalizedBaseSrc}`, event, script);
            };

            timeoutHandle = setTimeout(() => {
                fail(`module_load_timeout:${normalizedBaseSrc}`, `Timeout ao carregar ${normalizedBaseSrc}`, null, script);
            }, PAGE_RENDER_TIMEOUT_MS);

            document.head.appendChild(script);
        });
    },

    clearTrackedScripts(sources = []) {
        const stripQuery = (value) => String(value || '').replace(/[?#].*$/, '');
        const candidates = (Array.isArray(sources) ? sources : [])
            .reduce((acc, source) => acc.concat([source, stripQuery(source)]), [])
            .filter((value, index, arr) => value && arr.indexOf(value) === index);

        candidates.forEach((source) => {
            const normalized = this.normalizeAssetUrl(source);
            document.querySelectorAll(`script[data-fallback-base="${normalized}"]`).forEach((node) => {
                if (node.parentNode) {
                    node.parentNode.removeChild(node);
                }
            });
        });
    },

    async loadFallbackScripts(keyOrPageId) {
        const descriptor = this.getModuleDescriptor(keyOrPageId);
        if (!descriptor) {
            throw this.createModuleError(`module_registry_missing:${keyOrPageId}`, {
                route: keyOrPageId,
                module: keyOrPageId
            });
        }

        const scripts = descriptor.fallbackScripts || [];
        const stripQuery = (value) => String(value || '').replace(/[?#].*$/, '');

        for (const originalSrc of scripts) {
            const sourceCandidates = [originalSrc, stripQuery(originalSrc)]
                .filter((value, index, arr) => value && arr.indexOf(value) === index);
            let lastError = null;
            let loaded = false;

            for (let attempt = 0; attempt < MODULE_LOAD_RETRY_LIMIT; attempt += 1) {
                for (const srcCandidate of sourceCandidates) {
                    try {
                        await this.loadTrackedScript(srcCandidate, {
                            actualSrc: this.buildRetryAssetUrl(srcCandidate, attempt)
                        });
                        loaded = true;
                        break;
                    } catch (error) {
                        lastError = error;
                    }
                }
                if (loaded) {
                    break;
                }
            }

            if (!loaded && lastError) {
                throw lastError;
            }
        }

        if (!this.isLazyKeyReady(descriptor.key)) {
            this.clearTrackedScripts(scripts);
        }
    },

    async ensurePageModule(pageId) {
        const descriptor = this.getModuleDescriptor(pageId);
        if (!descriptor) {
            return;
        }

        const { key, lazyModule, primaryGlobal } = descriptor;
        const dashboardNeedsModernPatch = key === 'dashboard' && typeof window.Dashboard !== 'undefined' && !window.Dashboard.__saasModernized;
        if (this._lazyLoaded[key] || (this.isLazyKeyReady(key) && !dashboardNeedsModernPatch)) {
            this._lazyLoaded[key] = true;
            return;
        }

        if (!lazyModule) {
            throw this.createModuleError(`module_registry_missing:${primaryGlobal || key}`, {
                route: pageId,
                module: primaryGlobal || key
            });
        }

        let lastError = null;
        for (let attempt = 0; attempt < MODULE_LOAD_RETRY_LIMIT; attempt += 1) {
            try {
                const moduleUrl = this.buildRetryAssetUrl(lazyModule, attempt);
                const mod = await import(moduleUrl);
                if (mod && typeof mod.ensureLoaded === 'function') {
                    await mod.ensureLoaded();
                }
            } catch (error) {
                lastError = error;
            }

            if (!this.isLazyKeyReady(key)) {
                try {
                    await this.loadFallbackScripts(key);
                } catch (error) {
                    lastError = error;
                }
            }

            if (this.isLazyKeyReady(key)) {
                this._lazyLoaded[key] = true;
                return;
            }
        }

        throw this.createModuleError(`module_load_failed:${primaryGlobal || key}`, {
            route: pageId,
            module: primaryGlobal || key,
            moduleKey: key,
            originalError: lastError?.code || lastError?.message || 'module_load_failed'
        });
    },

    /**
     * Update breadcrumb
     */
    updateBreadcrumb(pageId) {
        const breadcrumb = document.getElementById('breadcrumb');
        if (!breadcrumb) {
            return;
        }
        const labels = {
            'dashboard': 'Visão Geral',
            'solicitacoes': 'Solicitações',
            'minhas-solicitacoes': 'Minhas Solicitações',
            'nova-solicitacao': 'Nova Solicitação',
            'aprovacoes': 'Aprovações',
            'tecnicos': 'Técnicos',
            'fornecedores': 'Fornecedores',
            'fornecedor': 'Portal do Fornecedor',
            'pecas': 'Peças',
            'catalogo': 'Catálogo de Peças',
            'relatorios': 'Relatórios',
            'configuracoes': 'Configurações',
            'ajuda': 'Ajuda',
            'perfil': 'Meu Perfil'
        };

        breadcrumb.innerHTML = `<span>${labels[pageId] || pageId}</span>`;
    },
    /**
     * Execute asynchronous operation with timeout guard.
     */
    async runWithTimeout(operationPromise, timeoutMs = PAGE_RENDER_TIMEOUT_MS, timeoutCode = 'operation_timeout') {
        let timeoutHandle = null;
        const safeTimeout = Math.max(1000, Number(timeoutMs) || PAGE_RENDER_TIMEOUT_MS);
        try {
            const timeoutPromise = new Promise((_, reject) => {
                timeoutHandle = setTimeout(() => {
                    const timeoutError = new Error(timeoutCode);
                    timeoutError.code = timeoutCode;
                    reject(timeoutError);
                }, safeTimeout);
            });
            return await Promise.race([operationPromise, timeoutPromise]);
        } finally {
            if (timeoutHandle) {
                clearTimeout(timeoutHandle);
            }
        }
    },

    getGlobalModule(moduleName) {
        if (!moduleName || typeof window === 'undefined') {
            return null;
        }

        if (typeof window[moduleName] !== 'undefined' && window[moduleName] !== null) {
            return window[moduleName];
        }

        try {
            const resolved = Function(`return (typeof ${moduleName} !== 'undefined') ? ${moduleName} : null;`)();
            if (typeof resolved !== 'undefined' && resolved !== null) {
                window[moduleName] = resolved;
                return resolved;
            }
        } catch (_error) {
            // Ignore fallback evaluation errors and keep null response.
        }

        return null;
    },

    requireGlobalModule(moduleName, pageId) {
        const moduleRef = this.getGlobalModule(moduleName);
        if (!moduleRef) {
            throw this.createModuleError(`module_registry_missing:${moduleName}`, {
                route: pageId,
                module: moduleName
            });
        }
        return moduleRef;
    },

    logUiFailure(message, data = {}) {
        const currentUser = (typeof Auth !== 'undefined' && typeof Auth.getCurrentUser === 'function')
            ? Auth.getCurrentUser()
            : null;
        const payload = {
            ...data,
            userId: data?.userId || currentUser?.id || null,
            route: data?.route || this.currentPage || null,
            source: data?.source || 'app',
            cacheVersion: data?.cacheVersion || this.getCacheVersion(),
            buildVersion: data?.buildVersion || this.getBuildVersion(),
            retryCount: Number(data?.retryCount || 0)
        };

        if (typeof Logger !== 'undefined' && typeof Logger.error === 'function') {
            Logger.error((Logger.CATEGORY && Logger.CATEGORY.UI) || 'ui', message, payload);
        }
    },

    /**
     * Execute page-specific render function.
     */
    executePageRender(pageId) {
        switch (pageId) {
        case 'dashboard': {
            const dashboardModule = this.requireGlobalModule('Dashboard', pageId);
            dashboardModule.render();
            break;
        }

        case 'solicitacoes':
        case 'minhas-solicitacoes': {
            const solicitacoesModule = this.requireGlobalModule('Solicitacoes', pageId);
            solicitacoesModule.render();
            break;
        }

        case 'nova-solicitacao': {
            const solicitacoesModule = this.requireGlobalModule('Solicitacoes', pageId);
            solicitacoesModule.openForm();
            solicitacoesModule.render();
            break;
        }

        case 'aprovacoes': {
            const aprovacoesModule = this.requireGlobalModule('Aprovacoes', pageId);
            aprovacoesModule.render();
            break;
        }

        case 'tecnicos': {
            const tecnicosModule = this.requireGlobalModule('Tecnicos', pageId);
            tecnicosModule.render();
            break;
        }

        case 'fornecedores': {
            const fornecedoresModule = this.requireGlobalModule('Fornecedores', pageId);
            fornecedoresModule.render();
            break;
        }

        case 'fornecedor': {
            const fornecedorModule = this.requireGlobalModule('FornecedorPortal', pageId);
            fornecedorModule.render();
            break;
        }

        case 'pecas':
        case 'catalogo': {
            const pecasModule = this.requireGlobalModule('Pecas', pageId);
            pecasModule.render();
            break;
        }

        case 'relatorios': {
            const relatoriosModule = this.requireGlobalModule('Relatorios', pageId);
            relatoriosModule.render();
            setTimeout(() => relatoriosModule.initCharts(), CHART_INIT_DELAY_MS);
            break;
        }

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
    },

    /**
     * Render controlled fallback when page load fails.
     */
    renderPageFallback(pageId, reasonMessage = '', reasonCode = 'page_render_failed') {
        const content = document.getElementById('content-area');
        if (!content) {
            return;
        }

        const safeReasonCode = String(reasonCode || '').toLowerCase();
        const isSyncIssue = /sync_|sync|cloud|offline|read_failed|write_failed/.test(safeReasonCode);
        const isCacheIssue = /stale_cache|asset_version_mismatch|cache/.test(safeReasonCode);
        const title = isCacheIssue
            ? 'Versão inconsistente de arquivos detectada'
            : (isSyncIssue ? 'Falha ao sincronizar dados desta tela' : 'Falha ao carregar esta tela');
        const message = reasonMessage
            || (isCacheIssue
                ? 'Os arquivos da aplicação ficaram fora de versão. Recarregue para baixar os assets corretos.'
                : (isSyncIssue
                ? 'Não foi possível concluir a sincronização inicial. Tente novamente.'
                : 'Ocorreu um erro ao montar a tela solicitada.'));

        content.innerHTML = `
            <div class="page-fallback card">
                <div class="card-body">
                    <div class="page-fallback-icon ${isSyncIssue || isCacheIssue ? 'warning' : 'danger'}">
                        <i class="fas ${isSyncIssue || isCacheIssue ? 'fa-triangle-exclamation' : 'fa-circle-xmark'}"></i>
                    </div>
                    <h3>${Utils.escapeHtml(title)}</h3>
                    <p>${Utils.escapeHtml(message)}</p>
                    <div class="page-fallback-actions">
                        <button class="btn btn-primary" onclick="App.retryCurrentPage({ syncFirst: true })">
                            <i class="fas fa-rotate-right"></i> Tentar novamente
                        </button>
                        <button class="btn btn-outline" onclick="App.navigate('${Utils.escapeHtml(pageId || this.getDefaultPage())}')">
                            <i class="fas fa-house"></i> Recarregar tela
                        </button>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Retry rendering the current page with optional sync first.
     */
    async retryCurrentPage(options = {}) {
        const activePage = this.currentPage || this.getDefaultPage();
        const shouldSyncFirst = options?.syncFirst !== false;
        if (shouldSyncFirst) {
            await this.syncData();
        }
        await this.navigate(activePage);
    },

    /**
     * Render page content
     */
    async renderPage(pageId, renderToken = this._lastRenderToken) {
        Utils.showLoading(`render:${pageId}`);

        try {
            await this.runWithTimeout((async () => {
                if (renderToken !== this._lastRenderToken || pageId !== this.currentPage) {
                    return;
                }
                await this.ensurePageModule(pageId);
                if (renderToken !== this._lastRenderToken || pageId !== this.currentPage) {
                    return;
                }
                this.executePageRender(pageId);
            })(), PAGE_RENDER_TIMEOUT_MS, `page_render_timeout:${pageId}`);
        } catch (error) {
            if (renderToken !== this._lastRenderToken || pageId !== this.currentPage) {
                return;
            }
            console.error('Erro ao carregar módulo da página', pageId, error);
            const descriptor = this.getModuleDescriptor(pageId);
            if (descriptor?.key) {
                this._lazyLoaded[descriptor.key] = false;
            }
            const syncStatus = (typeof DataManager !== 'undefined' && typeof DataManager.getSyncStatus === 'function')
                ? DataManager.getSyncStatus()
                : {};
            const reasonCode = error?.code || error?.message || 'page_render_failed';
            const syncFailed = ['failed', 'error'].includes(String(syncStatus?.state || '').toLowerCase());
            const normalizedReasonCode = String(reasonCode || '').toLowerCase();
            const timeoutError = normalizedReasonCode.includes('timeout');
            const cacheIssue = /stale_cache|asset_version_mismatch|cache/.test(normalizedReasonCode);
            const routeIssue = normalizedReasonCode.startsWith('route_resolution_failed');
            const registryIssue = normalizedReasonCode.startsWith('module_registry_missing');
            const moduleLoadIssue = normalizedReasonCode.startsWith('module_load_failed');
            const reasonMessage = cacheIssue
                ? 'Arquivos desatualizados foram detectados. Recarregue a página para baixar a versão correta.'
                : (timeoutError
                    ? 'Tempo de resposta excedido durante a leitura da página. Verifique a conexão e tente novamente.'
                    : (syncFailed
                        ? 'A sincronização falhou e os dados desta tela não puderam ser carregados.'
                        : (routeIssue
                            ? 'A rota solicitada não pôde ser resolvida.'
                            : ((registryIssue || moduleLoadIssue)
                                ? 'Não foi possível carregar este módulo agora.'
                                : 'Falha ao montar a tela solicitada.'))));

            this.logUiFailure(reasonCode, {
                requestId: `ui_render:${pageId}:${renderToken}`,
                action: 'render_page',
                stage: 'ui_render',
                entityId: pageId,
                route: pageId,
                module: descriptor?.primaryGlobal || descriptor?.module || descriptor?.key || pageId,
                source: 'app',
                originalError: error?.originalError || error?.message || String(error || reasonCode),
                retryCount: 0
            });

            Utils.showToast(reasonMessage, 'error');
            this.renderPageFallback(pageId, reasonMessage, reasonCode);
        } finally {
            Utils.hideLoading();
        }
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
            const browserOffline = (typeof navigator !== 'undefined' && navigator.onLine === false);
            const networkLikeError = (typeof Utils !== 'undefined' && typeof Utils.isConnectionError === 'function')
                ? Utils.isConnectionError(error)
                : false;

            errorDiv.textContent = browserOffline
                ? 'Sem conexão com a internet. Tente novamente quando reconectar.'
                : (networkLikeError
                    ? 'Falha momentânea de comunicação com o serviço. Tente novamente em instantes.'
                    : 'Erro ao autenticar. Verifique usuário e senha e tente novamente.');
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
        const nextTheme = isDark ? 'light' : 'dark';
        
        if (isDark) {
            body.classList.remove('dark-mode');
            body.classList.add('light-mode');
            DataManager.saveSetting('theme', 'light');
        } else {
            body.classList.remove('light-mode');
            body.classList.add('dark-mode');
            DataManager.saveSetting('theme', 'dark');
        }

        body.dataset.theme = nextTheme;
        document.documentElement.setAttribute('data-theme', nextTheme);
        
        // Update icon
        const themeIcon = document.querySelector('#theme-toggle i');
        if (themeIcon) {
            themeIcon.className = isDark ? 'fas fa-moon' : 'fas fa-sun';
        }
        
        // Refresh charts if on dashboard or reports
        if (this.currentPage === 'dashboard') {
            const dashboardModule = this.getGlobalModule('Dashboard');
            if (dashboardModule && typeof dashboardModule.render === 'function') {
                dashboardModule.render();
            }
        } else if (this.currentPage === 'relatorios') {
            const relatoriosModule = this.getGlobalModule('Relatorios');
            if (relatoriosModule && typeof relatoriosModule.render === 'function') {
                relatoriosModule.render();
                setTimeout(() => relatoriosModule.initCharts(), 100);
            }
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
        body.dataset.theme = theme;
        document.documentElement.setAttribute('data-theme', theme);
        
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
        if (!sidebar) {
            return;
        }
        
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
        const syncStatus = (typeof DataManager !== 'undefined' && typeof DataManager.getSyncStatus === 'function')
            ? DataManager.getSyncStatus()
            : { state: 'idle' };
        const cloudReady = DataManager.isCloudReady();
        const isConnecting = (!cloudReady) && DataManager.isCloudConnecting();
        const isCloudAvailable = cloudReady || DataManager.isCloudAvailable();
        const syncStateLabelMap = {
            idle: 'ociosa',
            saving: 'salvando',
            synced: 'sincronizada',
            pending: 'com pendências',
            failed: 'com falha',
            start: 'em progresso',
            done: 'sincronizada',
            error: 'com falha'
        };
        const syncStateLabel = syncStateLabelMap[syncStatus?.state] || 'ociosa';
        const cloudStatusLabel = cloudReady ? 'Sincronização em nuvem: ATIVA' : (isConnecting ? 'Conectando à nuvem...' : 'Sincronização indisponível');
        const cloudStatusDesc = cloudReady
            ? `Dados sincronizados automaticamente via Firebase (estado atual: ${syncStateLabel}).`
            : (isConnecting
                ? 'Aguardando autenticação e conexão segura com a nuvem.'
                : 'A sincronização em nuvem está indisponível. Operações críticas serão enfileiradas para retry.');
        const canManageGestores = Auth.getRole() === 'administrador';
        
        content.innerHTML = `
            <div class="page-header">
                <h2><i class="fas fa-cog"></i> Configurações</h2>
            </div>
            
            <!-- Cloud Storage Status -->
            <div class="cloud-status ${cloudReady ? 'connected' : 'disconnected'}">
                <i class="fas ${cloudReady ? 'fa-cloud' : 'fa-cloud-slash'} ${isConnecting && !cloudReady ? 'fa-spin' : ''}"></i>
                <div>
                    <strong>${cloudStatusLabel}</strong>
                    <p class="mb-0" style="font-size: 0.875rem;">
                        ${cloudStatusDesc}
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
                                    <option value="10" ${settings.itemsPerPage === 10 ? 'selected' : ''}>10</option>
                                    <option value="20" ${settings.itemsPerPage === 20 ? 'selected' : ''}>20</option>
                                    <option value="30" ${settings.itemsPerPage === 30 ? 'selected' : ''}>30</option>
                                    <option value="50" ${settings.itemsPerPage === 50 ? 'selected' : ''}>50</option>
                                </select>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="stats-range">Período padrão dos KPIs</label>
                                <select id="stats-range" class="form-control" ${!canEdit ? 'disabled' : ''}>
                                    <option value="7" ${settings.statsRangeDays === 7 ? 'selected' : ''}>7 dias</option>
                                    <option value="30" ${settings.statsRangeDays === 30 ? 'selected' : ''}>30 dias</option>
                                    <option value="90" ${settings.statsRangeDays === 90 ? 'selected' : ''}>90 dias</option>
                                </select>
                                <small class="text-muted">Usado para calcular os indicadores do dashboard.</small>
                            </div>
                            <div class="form-group">
                                <label for="sheet-provider">Destino da planilha</label>
                                <select id="sheet-provider" class="form-control" ${!canEdit ? 'disabled' : ''}>
                                    <option value="onedrive" ${settings.sheetIntegration?.provider === 'onedrive' ? 'selected' : ''}>Excel / OneDrive</option>
                                    <option value="google" ${settings.sheetIntegration?.provider === 'google' ? 'selected' : ''}>Google Sheets</option>
                                </select>
                                <small class="text-muted">Usado para auditoria automática de aprovações.</small>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="orcamento-mensal-pecas">Orçamento mensal de peças (R$)</label>
                                <input type="number" id="orcamento-mensal-pecas" class="form-control"
                                       value="${Number(settings.orcamentoMensalPecas || 0)}" min="0" step="0.01"
                                       ${!canEdit ? 'disabled' : ''}>
                                <small class="text-muted">Use 0 para desabilitar o alerta de orçamento mensal.</small>
                            </div>
                        </div>
                        <div class="form-group">
                            <label for="sheet-target">ID ou link da planilha</label>
                            <input type="text" id="sheet-target" class="form-control" 
                                   value="${settings.sheetIntegration?.target || ''}" ${!canEdit ? 'disabled' : ''}>
                            <small class="text-muted">Informe o ID ou URL da planilha existente.</small>
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
                            <table class="table" id="gestores-table">
                                <thead>
                                    <tr>
                                        <th>Nome</th>
                                        <th>Usuário</th>
                                        <th>Email</th>
                                        <th style="width: 260px;">Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${(() => {
        const gestores = DataManager.getGestorUsers();
        if (!gestores || gestores.length === 0) {
            return '<tr><td colspan="4" class="text-muted">Nenhum gestor cadastrado.</td></tr>';
        }
        return gestores.map(g => `
                                            <tr>
                                                <td>${Utils.escapeHtml(g.name || '-')}</td>
                                                <td><code>${Utils.escapeHtml(g.username || '-')}</code></td>
                                                <td>${Utils.escapeHtml(g.email || '-')}</td>
                                                <td>
                                                    <div class="actions" style="justify-content: flex-end; gap: 0.4rem;">
                                                        <button class="btn btn-sm btn-outline reset-gestor-password-btn" data-gestor-id="${Utils.escapeHtml(g.id)}" title="Resetar senha">
                                                            <i class="fas fa-key"></i> Resetar Senha
                                                        </button>
                                                        <button class="btn btn-danger btn-sm delete-gestor-btn" data-gestor-id="${Utils.escapeHtml(g.id)}" title="Excluir gestor">
                                                            <i class="fas fa-trash-alt"></i> Excluir
                                                        </button>
                                                    </div>
                                                </td>
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

            ${canEdit ? this.renderHealthPanel() : ''}
        `;

        const gestoresTable = document.getElementById('gestores-table');
        if (gestoresTable) {
            gestoresTable.addEventListener('click', (event) => {
                const resetBtn = event.target.closest('.reset-gestor-password-btn');
                if (resetBtn?.dataset?.gestorId) {
                    this.handleResetGestorPassword(resetBtn.dataset.gestorId);
                    return;
                }

                const deleteBtn = event.target.closest('.delete-gestor-btn');
                if (deleteBtn?.dataset?.gestorId) {
                    this.handleDeleteGestor(deleteBtn.dataset.gestorId);
                }
            });
        }
    },

    /**
     * Save settings
     */
    saveSettings() {
        const slaHours = parseInt(document.getElementById('sla-hours').value);
        const itemsPerPage = parseInt(document.getElementById('items-per-page').value);
        const statsRangeInput = document.getElementById('stats-range');
        const sheetProviderInput = document.getElementById('sheet-provider');
        const sheetTargetInput = document.getElementById('sheet-target');
        const budgetInput = document.getElementById('orcamento-mensal-pecas');
        const statsRangeDays = parseInt(statsRangeInput && statsRangeInput.value) || 30;
        const sheetProvider = (sheetProviderInput && sheetProviderInput.value) || 'onedrive';
        const sheetTarget = (sheetTargetInput && sheetTargetInput.value.trim()) || '';
        const orcamentoMensalPecas = Math.max(parseFloat((budgetInput && budgetInput.value) || 0) || 0, 0);
        
        DataManager.saveSetting('slaHours', slaHours);
        DataManager.saveSetting('itemsPerPage', itemsPerPage);
        DataManager.saveSetting('statsRangeDays', statsRangeDays);
        DataManager.saveSetting('orcamentoMensalPecas', orcamentoMensalPecas);
        DataManager.saveSetting('sheetIntegration', { provider: sheetProvider, target: sheetTarget });
        if (typeof OneDriveIntegration !== 'undefined' && typeof OneDriveIntegration.clearCache === 'function') {
            OneDriveIntegration.clearCache();
        }
        
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
        const usernameInput = document.getElementById('gestor-username');
        const passwordInput = document.getElementById('gestor-password');
        const emailInput = document.getElementById('gestor-email');

        const username = usernameInput?.value.trim() || '';
        const password = passwordInput?.value || '';
        const email = (typeof DataManager.normalizeEmail === 'function')
            ? DataManager.normalizeEmail(emailInput?.value)
            : (emailInput?.value || '').trim().toLowerCase();

        if (emailInput && !emailInput.checkValidity()) {
            emailInput.reportValidity();
            return;
        }

        if (!name || !username || !email || !password) {
            Utils.showToast('Informe nome, usuário, e-mail e senha do gestor', 'warning');
            return;
        }

        if (password.trim().length < 4) {
            Utils.showToast('A senha deve ter pelo menos 4 caracteres', 'warning');
            return;
        }

        const conflicts = (typeof DataManager.findUserConflicts === 'function')
            ? DataManager.findUserConflicts({ username, email })
            : { duplicateUsernameUser: null, duplicateEmailUser: null };

        if (conflicts.duplicateUsernameUser) {
            Utils.showToast('Nome de usuário já cadastrado. Escolha outro usuário.', 'warning');
            usernameInput?.focus();
            return;
        }

        if (conflicts.duplicateEmailUser) {
            Utils.showToast('E-mail já cadastrado. Use outro e-mail.', 'warning');
            emailInput?.focus();
            return;
        }

        let passwordHash;
        try {
            passwordHash = await Auth.hashPassword(password, username);
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
            if (result.errorCode === 'duplicate_username') {
                Utils.showToast('Nome de usuário já cadastrado. Escolha outro usuário.', 'warning');
                usernameInput?.focus();
                return;
            }
            if (result.errorCode === 'duplicate_email') {
                Utils.showToast('E-mail já cadastrado. Use outro e-mail.', 'warning');
                emailInput?.focus();
                return;
            }

            Utils.showToast(result.error || 'Erro ao salvar gestor', 'error');
            return;
        }

        Utils.showToast('Gestor adicionado com sucesso', 'success');
        const form = document.getElementById('gestor-form');
        if (form) {
            form.reset();
        }
        this.refreshGestorView();
    },

    async handleResetGestorPassword(gestorId) {
        if (Auth.getRole() !== 'administrador') {
            Utils.showToast('Apenas administradores podem resetar senha de gestores', 'error');
            return;
        }

        const gestor = DataManager.getUserById(gestorId);
        if (!gestor || gestor.role !== 'gestor') {
            Utils.showToast('Gestor não encontrado', 'warning');
            return;
        }

        const suggested = `Gestor@${Math.floor(1000 + Math.random() * 9000)}`;
        const newPassword = await Utils.prompt(
            `Informe a nova senha para ${gestor.name || gestor.username}:`,
            'Resetar Senha do Gestor',
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

        const result = await DataManager.resetUserPasswordById(gestor.id, sanitizedPassword);
        if (!result.success) {
            if (typeof Logger !== 'undefined' && typeof Logger.warn === 'function') {
                Logger.warn(Logger.CATEGORY.AUTH, 'password_reset_rejected', {
                    profile: 'gestor',
                    gestorId: gestor.id,
                    reason: result.code || 'reset_failed',
                    error: result.error || null
                });
            }
            Utils.showToast(result.error || 'Não foi possível resetar a senha do gestor', 'error');
            return;
        }

        const authUser = result.user || DataManager.getUserById(gestor.id) || gestor;
        const loginUsername = String(authUser.username || gestor.username || '').trim();
        const targetEmail = String(gestor.email || authUser.email || '').trim();
        const displayName = authUser.name || gestor.name || loginUsername;

        if (!loginUsername) {
            Utils.showToast('Senha redefinida, mas o usuário de login do gestor está inválido.', 'error');
            return;
        }

        if (typeof Logger !== 'undefined' && typeof Logger.info === 'function') {
            Logger.info(Logger.CATEGORY.AUTH, 'password_reset_applied', {
                profile: 'gestor',
                gestorId: gestor.id,
                username: loginUsername,
                affectedUsers: result.affectedUsers || 1,
                validated: result.validated === true
            });
        }

        let resetEmailSent = false;
        let resetFallbackPrepared = false;

        if (targetEmail) {
            try {
                if (typeof Utils.sendPasswordResetEmail === 'function') {
                    resetEmailSent = await Utils.sendPasswordResetEmail({
                        to: targetEmail,
                        username: loginUsername,
                        password: sanitizedPassword,
                        name: displayName,
                        roleLabel: 'gestor'
                    });
                }
            } catch (_emailError) {
                resetEmailSent = false;
            }

            if (!resetEmailSent && typeof Utils.sendCredentialsEmail === 'function') {
                resetFallbackPrepared = Utils.sendCredentialsEmail({
                    to: targetEmail,
                    username: loginUsername,
                    password: sanitizedPassword,
                    name: displayName,
                    roleLabel: 'gestor'
                });
            }
        }

        if (typeof Logger !== 'undefined' && typeof Logger.info === 'function') {
            Logger.info(Logger.CATEGORY.AUTH, 'password_reset_email_status', {
                profile: 'gestor',
                gestorId: gestor.id,
                username: loginUsername,
                recipient: targetEmail || null,
                emailSent: resetEmailSent,
                fallbackPrepared: resetFallbackPrepared,
                hasRecipient: !!targetEmail
            });
        }

        if (resetEmailSent) {
            Utils.showToast(`Senha redefinida e e-mail enviado para ${targetEmail}`, 'info');
        } else if (resetFallbackPrepared) {
            Utils.showToast('Senha redefinida. E-mail preparado para envio manual.', 'warning');
        } else if (targetEmail) {
            Utils.showToast('Senha redefinida, mas não foi possível enviar o e-mail automático.', 'warning');
        }

        Utils.showToast('Senha do gestor redefinida com sucesso', 'success');
    },
    async handleDeleteGestor(gestorId) {
        if (Auth.getRole() !== 'administrador') {
            Utils.showToast('Apenas administradores podem excluir gestores', 'error');
            return;
        }

        const gestor = DataManager.getUserById(gestorId);
        if (!gestor || gestor.role !== 'gestor') {
            Utils.showToast('Gestor não encontrado', 'warning');
            return;
        }

        const currentUser = Auth.getCurrentUser();
        if (currentUser?.id === gestorId) {
            Utils.showToast('Você não pode excluir seu próprio usuário', 'warning');
            return;
        }

        const confirmed = await Utils.confirm(
            `Deseja excluir o gestor "${gestor.name || gestor.username}"?`,
            'Excluir Gestor'
        );
        if (!confirmed) {
            return;
        }

        const success = await DataManager.deleteUserById(gestorId);
        if (!success) {
            Utils.showToast('Não foi possível excluir o gestor', 'error');
            return;
        }

        Utils.showToast('Gestor excluído com sucesso', 'success');
        this.refreshGestorView();
    },

    /**
     * Render system health panel for admins
     */
    renderHealthPanel() {
        // Check if Logger is available
        if (typeof Logger === 'undefined') {
            return '';
        }

        const health = Logger.getHealthSummary();
        const recentErrors = Logger.getRecentErrors(10);
        
        const statusColors = {
            healthy: '#10b981',
            degraded: '#f59e0b',
            critical: '#ef4444'
        };
        const statusLabels = {
            healthy: 'Saudável',
            degraded: 'Degradado',
            critical: 'Crítico'
        };
        const statusIcons = {
            healthy: 'fa-check-circle',
            degraded: 'fa-exclamation-triangle',
            critical: 'fa-times-circle'
        };

        const statusColor = statusColors[health.status] || statusColors.healthy;
        const statusLabel = statusLabels[health.status] || 'Desconhecido';
        const statusIcon = statusIcons[health.status] || 'fa-question-circle';

        const categoryStats = Object.entries(health.categoryBreakdown || {}).map(([cat, stats]) => `
            <tr>
                <td><code>${Utils.escapeHtml(cat)}</code></td>
                <td>${stats.total || 0}</td>
                <td>${stats.errors || 0}</td>
                <td>${stats.lastHour || 0}</td>
                <td>${stats.lastDay || 0}</td>
            </tr>
        `).join('') || '<tr><td colspan="5" class="text-muted">Nenhum evento registrado</td></tr>';

        const errorRows = recentErrors.map(err => {
            const action = err?.data?.action || err?.data?.operation || '-';
            const entityId = err?.data?.entityId || err?.data?.key || '-';
            const stage = err?.data?.stage || err?.data?.status || '-';
            const origin = err?.data?.origin || '-';
            const errorCode = err?.data?.errorCode || err?.data?.error || err?.data?.reason || '-';
            return `
            <tr>
                <td><small>${Utils.formatDate(err.timestamp, true)}</small></td>
                <td><code>${Utils.escapeHtml(err.requestId || '-')}</code></td>
                <td><span class="badge badge-${err.level === 'error' ? 'danger' : 'warning'}">${Utils.escapeHtml(err.level)}</span></td>
                <td>${Utils.escapeHtml(err.category || '-')}</td>
                <td>${Utils.escapeHtml(err.message || '-')}</td>
                <td>
                    <div><strong>${Utils.escapeHtml(action)}</strong></div>
                    <small class="text-muted">Etapa: ${Utils.escapeHtml(stage)} | Origem: ${Utils.escapeHtml(origin)}</small><br>
                    <small class="text-muted">Entidade: ${Utils.escapeHtml(String(entityId))} | Motivo: ${Utils.escapeHtml(String(errorCode))}</small>
                </td>
            </tr>
        `;
        }).join('') || '<tr><td colspan="6" class="text-muted">Nenhum erro recente</td></tr>';

        return `
            <div class="card mt-3">
                <div class="card-header">
                    <h4><i class="fas fa-heartbeat"></i> Saúde do Sistema</h4>
                </div>
                <div class="card-body">
                    <div class="health-status" style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem; padding: 1rem; background: ${statusColor}15; border-radius: 8px; border-left: 4px solid ${statusColor};">
                        <i class="fas ${statusIcon}" style="font-size: 2rem; color: ${statusColor};"></i>
                        <div>
                            <strong style="color: ${statusColor};">${statusLabel}</strong>
                            <p class="mb-0" style="font-size: 0.875rem;">
                                ${health.errorsLastHour} erros na última hora | ${health.errorsLastDay} nas últimas 24h
                            </p>
                        </div>
                    </div>

                    <h5>Eventos por Categoria</h5>
                    <div class="table-container">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Categoria</th>
                                    <th>Total</th>
                                    <th>Erros</th>
                                    <th>Última Hora</th>
                                    <th>Últimas 24h</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${categoryStats}
                            </tbody>
                        </table>
                    </div>

                    <h5 class="mt-3">Erros Recentes</h5>
                    <div class="table-container" style="max-height: 300px; overflow-y: auto;">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Data/Hora</th>
                                    <th>Request ID</th>
                                    <th>Nível</th>
                                    <th>Categoria</th>
                                    <th>Mensagem</th>
                                    <th>Contexto</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${errorRows}
                            </tbody>
                        </table>
                    </div>

                    <div class="btn-group mt-3">
                        <button class="btn btn-outline" onclick="App.refreshHealthPanel()">
                            <i class="fas fa-sync-alt"></i> Atualizar
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="App.clearSystemLogs()">
                            <i class="fas fa-trash-alt"></i> Limpar Logs
                        </button>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Refresh health panel
     */
    refreshHealthPanel() {
        this.renderConfiguracoes();
        Utils.showToast('Dados de saúde atualizados', 'info');
    },

    /**
     * Clear system logs (admin only)
     */
    async clearSystemLogs() {
        if (Auth.getRole() !== 'administrador') {
            Utils.showToast('Apenas administradores podem limpar logs', 'error');
            return;
        }

        const confirmed = await Utils.confirm(
            'Deseja limpar todos os logs do sistema? Esta ação não pode ser desfeita.',
            'Limpar Logs'
        );

        if (!confirmed) {
            return;
        }

        if (typeof Logger !== 'undefined') {
            Logger.clearLogs();
        }

        Utils.showToast('Logs do sistema limpos', 'success');
        this.refreshHealthPanel();
    },

    refreshGestorView() {
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
        
        if (!confirmed) {
            return;
        }

        const confirmedAgain = await Utils.confirm(
            'Confirme novamente: deseja realmente resetar todos os dados?',
            'Confirmar Reset'
        );
        
        if (!confirmedAgain) {
            return;
        }

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
     * Refresh only the active view when data changes without altering navigation
     */
    refreshActiveView(updatedKeys = []) {
        const keys = Array.isArray(updatedKeys) ? updatedKeys : [];
        const shouldUpdate = (...expectedKeys) => {
            if (!expectedKeys.length || !keys.length) {
                return true;
            }
            return expectedKeys.some(key => keys.includes(key));
        };

        switch (this.currentPage) {
        case 'dashboard':
            if (shouldUpdate(DataManager?.KEYS?.SOLICITATIONS)) {
                const dashboardModule = this.getGlobalModule('Dashboard');
                if (dashboardModule && typeof dashboardModule.render === 'function') {
                    dashboardModule.render();
                }
            }
            break;
        case 'solicitacoes':
        case 'minhas-solicitacoes':
            if (shouldUpdate(DataManager?.KEYS?.SOLICITATIONS)) {
                const solicitacoesModule = this.getGlobalModule('Solicitacoes');
                if (solicitacoesModule && typeof solicitacoesModule.render === 'function') {
                    solicitacoesModule.render();
                }
            }
            break;
        case 'aprovacoes':
            if (shouldUpdate(DataManager?.KEYS?.SOLICITATIONS)) {
                const aprovacoesModule = this.getGlobalModule('Aprovacoes');
                if (aprovacoesModule && typeof aprovacoesModule.render === 'function') {
                    aprovacoesModule.render();
                }
            }
            break;
        case 'pecas':
        case 'catalogo':
            if (shouldUpdate(DataManager?.KEYS?.PARTS)) {
                const pecasModule = this.getGlobalModule('Pecas');
                if (pecasModule && typeof pecasModule.render === 'function') {
                    pecasModule.render();
                }
            }
            break;
        case 'relatorios':
            if (shouldUpdate(DataManager?.KEYS?.SOLICITATIONS)) {
                const relatoriosModule = this.getGlobalModule('Relatorios');
                if (relatoriosModule && typeof relatoriosModule.render === 'function') {
                    relatoriosModule.render();
                    setTimeout(() => relatoriosModule.initCharts(), CHART_INIT_DELAY_MS);
                }
            }
            break;
        case 'tecnicos':
            if (shouldUpdate(DataManager?.KEYS?.TECHNICIANS, DataManager?.KEYS?.USERS)) {
                const tecnicosModule = this.getGlobalModule('Tecnicos');
                if (tecnicosModule && typeof tecnicosModule.render === 'function') {
                    tecnicosModule.render();
                }
            }
            break;
        case 'fornecedores':
            if (shouldUpdate(DataManager?.KEYS?.SUPPLIERS, DataManager?.KEYS?.USERS)) {
                const fornecedoresModule = this.getGlobalModule('Fornecedores');
                if (fornecedoresModule && typeof fornecedoresModule.render === 'function') {
                    fornecedoresModule.render();
                }
            }
            break;
        case 'fornecedor':
            if (shouldUpdate(DataManager?.KEYS?.SOLICITATIONS, DataManager?.KEYS?.SUPPLIERS, DataManager?.KEYS?.USERS)) {
                const fornecedorModule = this.getGlobalModule('FornecedorPortal');
                if (fornecedorModule && typeof fornecedorModule.render === 'function') {
                    fornecedorModule.render();
                }
            }
            break;
        case 'configuracoes':
            if (shouldUpdate(DataManager?.KEYS?.SETTINGS, DataManager?.KEYS?.USERS)) {
                this.renderConfiguracoes();
            }
            break;
        default:
            break;
        }

        if (typeof Auth !== 'undefined' && typeof Auth.renderMenu === 'function' && this.currentPage) {
            Auth.renderMenu(this.currentPage);
        }
    },

    /**
     * Sync data with cloud storage
     */
    async syncData() {
        const syncBtn = document.getElementById('sync-btn');
        if (syncBtn) {
            syncBtn.classList.add('rotating');
        }

        const emitSyncStatus = (state, error = null) => {
            window.dispatchEvent(new CustomEvent('sync:status', { detail: { state, error } }));
        };

        emitSyncStatus('start');
        if (typeof Utils !== 'undefined' && typeof Utils.showToast === 'function') {
            Utils.showToast('Sincronizando...', 'info');
        }
        
        try {
            const synced = typeof DataManager !== 'undefined'
                ? await DataManager.syncAll('manual')
                : false;
            const syncDetail = (typeof DataManager !== 'undefined' && typeof DataManager.getSyncStatus === 'function')
                ? DataManager.getSyncStatus()
                : {};
            const queueCount = this.getOutboxPendingCount();
            const effectiveState = this.getEffectiveSyncState(syncDetail, queueCount);

            if (synced && effectiveState !== 'pending') {
                emitSyncStatus('done');
                window.dispatchEvent(new CustomEvent('data:updated', {
                    detail: {
                        keys: Object.values((DataManager && DataManager.KEYS) || {})
                    }
                }));
                if (typeof Utils !== 'undefined' && typeof Utils.showToast === 'function') {
                    Utils.showToast('Sincronizado', 'success');
                }
                this.refreshActiveView();
            } else if (effectiveState === 'pending') {
                emitSyncStatus('pending');
                if (typeof Utils !== 'undefined' && typeof Utils.showToast === 'function') {
                    Utils.showToast(
                        queueCount > 0
                            ? `Sincronização pendente: ${queueCount} operação(ões) aguardando confirmação`
                            : 'Sincronização pendente: houve escrita sem confirmação final',
                        'warning'
                    );
                }
            } else {
                emitSyncStatus('error');
                if (typeof Utils !== 'undefined' && typeof Utils.showToast === 'function') {
                    Utils.showToast('Sincronização em nuvem não disponível', 'warning');
                }
            }

        } catch (error) {
            console.error('Sync error:', error);
            emitSyncStatus('error', error);
            if (typeof Utils !== 'undefined' && typeof Utils.showToast === 'function') {
                Utils.showToast('Erro ao sincronizar dados', 'error');
            }
        } finally {
            if (syncBtn) {
                syncBtn.classList.remove('rotating');
            }
        }
    },

    getOutboxPendingCount() {
        if (typeof CloudStorage !== 'undefined' && typeof CloudStorage.getOutboxPendingCount === 'function') {
            return CloudStorage.getOutboxPendingCount();
        }
        try {
            const queue = JSON.parse(localStorage.getItem('cloud_sync_queue') || '[]');
            return Array.isArray(queue) ? queue.length : 0;
        } catch (_error) {
            return 0;
        }
    },

    getEffectiveSyncState(detail = {}, queueCount = this.getOutboxPendingCount()) {
        const rawState = String(detail?.state || detail?.status || 'idle').toLowerCase();
        if (queueCount > 0 && ['idle', 'synced', 'done', 'success'].includes(rawState)) {
            return 'pending';
        }
        return rawState;
    },

    updateSyncIndicator(detail = {}) {
        const indicator = document.getElementById('sync-indicator');
        if (!indicator) {
            return;
        }

        const queueCount = this.getOutboxPendingCount();
        const state = this.getEffectiveSyncState(detail, queueCount);
        const updatedAt = Number(detail?.updatedAt || Date.now());

        const stateConfig = {
            idle: { css: 'sync-idle', icon: 'fa-circle', label: 'Sem atividade' },
            saving: { css: 'sync-saving', icon: 'fa-cloud-upload-alt', label: 'Salvando...' },
            start: { css: 'sync-saving', icon: 'fa-cloud-upload-alt', label: 'Sincronizando...' },
            synced: { css: 'sync-synced', icon: 'fa-check-circle', label: 'Sincronizado' },
            done: { css: 'sync-synced', icon: 'fa-check-circle', label: 'Sincronizado' },
            pending: { css: 'sync-pending', icon: 'fa-clock', label: 'Pendente de envio' },
            failed: { css: 'sync-failed', icon: 'fa-exclamation-triangle', label: 'Falha de sincronização' },
            error: { css: 'sync-failed', icon: 'fa-exclamation-triangle', label: 'Falha de sincronização' }
        };

        const config = stateConfig[state] || stateConfig.idle;
        indicator.classList.remove('sync-idle', 'sync-saving', 'sync-synced', 'sync-pending', 'sync-failed');
        indicator.classList.add(config.css);
        indicator.setAttribute('data-sync-state', state);

        const formattedTime = new Date(updatedAt).toLocaleString('pt-BR');
        const queueSuffix = queueCount > 0 ? ` | pendências: ${queueCount}` : '';
        indicator.title = `Estado: ${config.label} | Última atualização: ${formattedTime}${queueSuffix}`;
        indicator.innerHTML = `<i class="fas ${config.icon}"></i><span>${config.label}</span>`;
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
        
        if (!confirmed) {
            return;
        }

        const confirmedAgain = await Utils.confirm(
            'Confirme novamente para remover todos os dados. Esta ação é irreversível.',
            'Confirmar Limpeza'
        );
        if (!confirmedAgain) {
            return;
        }

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
                        <li>Clique em "Enviar para Aprovação"</li>
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
                                <td>${Utils.renderStatusBadge('pendente')}</td>
                                <td>Em análise do gestor</td>
                            </tr>
                            <tr>
                                <td>${Utils.renderStatusBadge('rejeitada')}</td>
                                <td>Solicitação rejeitada e devolvida ao técnico</td>
                            </tr>
                            <tr>
                                <td>${Utils.renderStatusBadge('aprovada')}</td>
                                <td>Aprovada e aguardando envio do fornecedor</td>
                            </tr>
                            <tr>
                                <td>${Utils.renderStatusBadge('em-transito')}</td>
                                <td>Rastreio informado e material em trânsito</td>
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
                        Welington Tavares<br>
                        <i class="fas fa-envelope"></i> <a href="mailto:wbastostavares@solenis.com">wbastostavares@solenis.com</a><br>
                        <i class="fas fa-phone"></i> <a href="tel:+5562998124727">62998124727</a>
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
        const usersSnapshot = DataManager.getUsers();
        const previousUsers = JSON.parse(JSON.stringify(usersSnapshot || []));
        const users = JSON.parse(JSON.stringify(usersSnapshot || []));
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

        const saveResult = await DataManager.saveDataAsync(DataManager.KEYS.USERS, users, {
            allowQueue: true,
            action: 'change_password_self',
            reason: 'profile_password_change',
            entityId: dbUser.id,
            previousData: previousUsers
        });

        if (saveResult?.success !== true) {
            const pendingMessage = saveResult?.pending
                ? 'Não foi possível confirmar a alteração agora. A operação entrou em fila para retry.'
                : 'Não foi possível confirmar a alteração da senha na nuvem.';
            Utils.showToast(pendingMessage, saveResult?.pending ? 'warning' : 'error');
            return;
        }
        
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
                <button class="btn btn-primary" onclick="App.navigate(App.getDefaultPage())">
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
        App.logUiFailure(error?.code || 'bootstrap_failed', {
            requestId: 'bootstrap:dom_content_loaded',
            action: 'bootstrap',
            stage: 'bootstrap',
            route: 'init',
            module: 'app',
            source: 'app',
            originalError: error?.message || String(error || 'bootstrap_failed')
        });
        App.showBootstrapFailure(error);
    }
});






















































