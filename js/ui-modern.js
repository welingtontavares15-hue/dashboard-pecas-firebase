(function () {
    const STATUS_TOKENS = {
        criado: { label: 'Em aprovação', icon: 'fa-clock', css: 'status-pendente-aprovacao' },
        pendente_aprovacao: { label: 'Em aprovação', icon: 'fa-clock', css: 'status-pendente-aprovacao' },
        aprovado: { label: 'Aprovado / aguardando envio', icon: 'fa-check', css: 'status-aprovado' },
        reprovado: { label: 'Rejeitado', icon: 'fa-times', css: 'status-reprovado' },
        em_compra: { label: 'Em trânsito', icon: 'fa-cart-shopping', css: 'status-em-compra' },
        enviado: { label: 'Finalizada', icon: 'fa-truck-fast', css: 'status-concluido' },
        concluido: { label: 'Finalizada', icon: 'fa-check-double', css: 'status-concluido' }
    };

    const STATUS_ALIAS = {
        rascunho: 'pendente_aprovacao',
        criada: 'pendente_aprovacao',
        criado: 'pendente_aprovacao',
        enviada: 'pendente_aprovacao',
        pendente: 'pendente_aprovacao',
        pendente_aprovacao: 'pendente_aprovacao',
        aprovada: 'aprovado',
        aprovado: 'aprovado',
        rejeitada: 'reprovado',
        reprovado: 'reprovado',
        em_transito: 'em_compra',
        'em-transito': 'em_compra',
        em_compra: 'em_compra',
        entregue: 'concluido',
        finalizada: 'concluido',
        concluido: 'concluido',
        'historico-manual': 'concluido'
    };

    function normalizeStatus(status) {
        const raw = String(status || '').trim().toLowerCase().replace(/\s+/g, '_');
        return STATUS_ALIAS[raw] || 'pendente_aprovacao';
    }

    function debounce(fn, wait) {
        let timeout;
        return function () {
            const args = arguments;
            clearTimeout(timeout);
            timeout = setTimeout(() => fn.apply(this, args), wait);
        };
    }

    function enhanceTable(tableContainer) {
        if (!tableContainer || tableContainer.dataset.enhanced === 'true') {
            return;
        }

        const table = tableContainer.querySelector('table.table');
        if (!table) {
            tableContainer.dataset.enhanced = 'true';
            return;
        }

        const toolbar = document.createElement('div');
        toolbar.className = 'table-toolbar';
        toolbar.innerHTML = '<input type="text" class="table-quick-filter form-control" placeholder="Filtro rápido da tabela">';

        tableContainer.parentElement.insertBefore(toolbar, tableContainer);

        const filterInput = toolbar.querySelector('.table-quick-filter');
        const tbody = table.querySelector('tbody');
        if (filterInput && tbody) {
            filterInput.addEventListener('input', debounce(() => {
                const query = (filterInput.value || '').toLowerCase().trim();
                Array.from(tbody.rows).forEach((row) => {
                    const text = (row.textContent || '').toLowerCase();
                    row.style.display = text.includes(query) ? '' : 'none';
                });
            }, 120));
        }

        const headers = Array.from(table.querySelectorAll('thead th'));
        headers.forEach((header, index) => {
            const label = (header.textContent || '').toLowerCase();
            const hasActions = label.includes('ações') || !!header.querySelector('input[type="checkbox"]');
            if (hasActions) {
                return;
            }

            header.classList.add('sortable');
            header.setAttribute('role', 'button');
            header.setAttribute('tabindex', '0');
            header.dataset.sort = 'none';

            const sortFn = () => {
                const rows = Array.from((table.tBodies[0] || {}).rows || []);
                const nextDir = header.dataset.sort === 'asc' ? 'desc' : 'asc';
                headers.forEach((th) => {
                    th.dataset.sort = 'none';
                    th.classList.remove('sort-asc', 'sort-desc');
                });
                header.dataset.sort = nextDir;
                header.classList.toggle('sort-asc', nextDir === 'asc');
                header.classList.toggle('sort-desc', nextDir === 'desc');

                rows.sort((a, b) => {
                    const rawA = (a.cells[index]?.textContent || '').trim();
                    const rawB = (b.cells[index]?.textContent || '').trim();
                    const currencyA = Number(rawA.replace(/[^0-9,-]+/g, '').replace('.', '').replace(',', '.'));
                    const currencyB = Number(rawB.replace(/[^0-9,-]+/g, '').replace('.', '').replace(',', '.'));
                    const dateA = /^\d{2}\/\d{2}\/\d{4}/.test(rawA) ? new Date(rawA.split('/').reverse().join('-')).getTime() : NaN;
                    const dateB = /^\d{2}\/\d{2}\/\d{4}/.test(rawB) ? new Date(rawB.split('/').reverse().join('-')).getTime() : NaN;

                    let result;
                    if (!Number.isNaN(currencyA) && !Number.isNaN(currencyB) && /[0-9]/.test(rawA) && /[0-9]/.test(rawB)) {
                        result = currencyA - currencyB;
                    } else if (!Number.isNaN(dateA) && !Number.isNaN(dateB)) {
                        result = dateA - dateB;
                    } else {
                        result = rawA.localeCompare(rawB, 'pt-BR', { sensitivity: 'base' });
                    }

                    return nextDir === 'asc' ? result : -result;
                });

                rows.forEach((row) => table.tBodies[0].appendChild(row));
            };

            header.addEventListener('click', sortFn);
            header.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    sortFn();
                }
            });
        });

        tableContainer.dataset.enhanced = 'true';
    }

    function patchUtils() {
        if (typeof Utils === 'undefined') {
            return;
        }

        const originalShowToast = Utils.showToast.bind(Utils);
        const originalShowModal = Utils.showModal.bind(Utils);
        const originalCloseModal = Utils.closeModal.bind(Utils);
        const originalShowLoading = Utils.showLoading.bind(Utils);
        const originalHideLoading = Utils.hideLoading.bind(Utils);

        Utils.getStatusInfo = function (status) {
            const token = normalizeStatus(status);
            return STATUS_TOKENS[token];
        };

        Utils.renderStatusBadge = function (status) {
            const info = this.getStatusInfo(status);
            return '<span class="status-badge ' + info.css + '"><i class="fas ' + info.icon + '"></i>' + info.label + '</span>';
        };

        Utils.showToast = function (message, type) {
            originalShowToast(message, type);
            const container = document.getElementById('toast-container');
            if (!container) {
                return;
            }
            const toasts = container.querySelectorAll('.toast');
            if (toasts.length > 5) {
                toasts[0].remove();
            }
        };

        Utils.showModal = function (content, options) {
            document.body.classList.add('modal-open');
            originalShowModal(content, options);
        };

        Utils.closeModal = function () {
            document.body.classList.remove('modal-open');
            originalCloseModal();
        };

        Utils.showLoading = function () {
            originalShowLoading();
            const overlay = document.getElementById('loading-overlay');
            if (overlay) {
                overlay.classList.add('loading-modern');
            }
        };

        Utils.hideLoading = function () {
            originalHideLoading();
            const overlay = document.getElementById('loading-overlay');
            if (overlay) {
                overlay.classList.remove('loading-modern');
            }
        };

        Utils.enhanceTables = function (root) {
            const scope = root || document;
            scope.querySelectorAll('.table-container').forEach(enhanceTable);
        };
    }

    function patchAuth() {
        if (typeof Auth === 'undefined') {
            return;
        }

        Auth.renderMenu = function (activeId) {
            const nav = document.getElementById('sidebar-nav');
            if (!nav) {
                return;
            }

            const items = this.getMenuItems();
            const itemMap = new Map(items.map((item) => [item.id, item]));
            const pendingCount = DataManager.getPendingSolicitations().length;
            const reportAliases = {
                custos: 'visao-geral',
                solicitacoes: 'historico',
                pecas: 'pecas',
                tecnicos: 'tecnicos',
                meses: 'meses',
                historico: 'historico'
            };
            const currentReportRaw = activeId === 'relatorios'
                ? ((window.Relatorios && window.Relatorios.currentReport) || window.__reportTarget || 'visao-geral')
                : '';
            const currentReport = reportAliases[String(currentReportRaw || '').toLowerCase()] || currentReportRaw || 'visao-geral';

            this._menuGroupsCollapsed = this._menuGroupsCollapsed || {};

            const reportShortcuts = itemMap.has('relatorios') ? [
                { id: 'relatorios', pageId: 'relatorios', label: 'Relatórios', icon: 'fa-file-alt', reportTarget: 'visao-geral' },
                { id: 'relatorios_pecas', pageId: 'relatorios', label: 'Custo por Peça', icon: 'fa-box-open', reportTarget: 'pecas', isSubItem: true },
                { id: 'relatorios_tecnicos', pageId: 'relatorios', label: 'Custo por Técnico', icon: 'fa-user-gear', reportTarget: 'tecnicos', isSubItem: true },
                { id: 'relatorios_meses', pageId: 'relatorios', label: 'Custo por Mês', icon: 'fa-chart-line', reportTarget: 'meses', isSubItem: true },
                { id: 'relatorios_historico', pageId: 'relatorios', label: 'Histórico', icon: 'fa-clock-rotate-left', reportTarget: 'historico', isSubItem: true }
            ] : [];

            const role = this.getRole();
            const groups = role === 'tecnico'
                ? [
                    { key: 'operacao', title: 'OPERAÇÃO', items: [itemMap.get('nova-solicitacao'), itemMap.get('minhas-solicitacoes')] },
                    { key: 'consulta', title: 'CONSULTA', items: [itemMap.get('catalogo')] },
                    { key: 'suporte', title: 'SUPORTE', items: [itemMap.get('ajuda'), itemMap.get('perfil')] }
                ]
                : (role === 'fornecedor'
                    ? [
                        { key: 'fornecedor', title: 'FORNECEDOR', items: [itemMap.get('fornecedor')] },
                        { key: 'suporte', title: 'SUPORTE', items: [itemMap.get('perfil')] }
                    ]
                    : [
                        { key: 'visao-geral', title: 'VISÃO GERAL', items: [itemMap.get('dashboard')] },
                        { key: 'operacao', title: 'OPERAÇÃO', items: [itemMap.get('solicitacoes'), itemMap.get('aprovacoes')] },
                        { key: 'custos', title: 'CUSTOS E ANÁLISES', items: reportShortcuts },
                        // O grupo de cadastros deve existir apenas para administradores.
                        ...(role === 'administrador'
                            ? [{ key: 'cadastros', title: 'CADASTROS', items: [itemMap.get('pecas'), itemMap.get('tecnicos'), itemMap.get('fornecedores')] }]
                            : []),
                        { key: 'configuracoes', title: 'CONFIGURAÇÕES', items: [itemMap.get('configuracoes')] }
                    ]);
            const buildEntry = (entry) => {
                if (!entry) {
                    return '';
                }

                const pageId = entry.pageId || entry.id;
                const reportTarget = entry.reportTarget || '';
                const badgeCount = entry.badge ? pendingCount : 0;
                const isReportMain = pageId === 'relatorios' && (!reportTarget || reportTarget === 'visao-geral');
                const isActive = reportTarget
                    ? (activeId === 'relatorios' && currentReport === reportTarget)
                    : (isReportMain ? (activeId === 'relatorios' && (!currentReport || currentReport === 'visao-geral')) : pageId === activeId);
                const reportSeed = reportTarget || (pageId === 'relatorios' ? 'visao-geral' : '');
                const className = 'nav-item ' + (entry.isSubItem ? 'nav-item-sub ' : '') + (isActive ? 'active' : '');
                const onclickAttr = ` onclick="window.__reportTarget='${reportSeed}'"`;
                const dataReport = reportTarget ? ` data-report-target="${reportTarget}"` : '';

                return `<a class="${className}" data-page="${pageId}"${dataReport}${onclickAttr}>`
                    + `<i class="fas ${entry.icon}"></i>`
                    + `<span>${entry.label}</span>`
                    + ((entry.badge && badgeCount > 0) ? `<span class="nav-badge">${badgeCount}</span>` : '')
                    + '</a>';
            };

            nav.innerHTML = groups
                .map((group) => {
                    const entries = (group.items || []).filter(Boolean);
                    if (entries.length === 0) {
                        return '';
                    }
                    const collapsed = this._menuGroupsCollapsed[group.key] === true;
                    return `<section class="nav-group ${collapsed ? 'collapsed' : ''}" data-nav-group="${group.key}">`
                        + `<button type="button" class="nav-group-toggle" data-group-toggle="${group.key}">`
                        + `<span>${group.title}</span><i class="fas fa-chevron-down"></i>`
                        + '</button>'
                        + `<div class="nav-group-items">${entries.map(buildEntry).join('')}</div>`
                        + '</section>';
                })
                .join('');

            nav.querySelectorAll('[data-group-toggle]').forEach((button) => {
                button.addEventListener('click', (event) => {
                    event.preventDefault();
                    const key = button.getAttribute('data-group-toggle');
                    const container = nav.querySelector(`[data-nav-group="${key}"]`);
                    if (!container) {
                        return;
                    }
                    const collapsed = !container.classList.contains('collapsed');
                    container.classList.toggle('collapsed', collapsed);
                    this._menuGroupsCollapsed[key] = collapsed;
                });
            });

            const pendingBadge = document.getElementById('pending-badge');
            if (pendingBadge) {
                if (this.hasPermission('aprovacoes', 'view') && pendingCount > 0) {
                    pendingBadge.classList.remove('hidden');
                    const countEl = document.getElementById('pending-count');
                    if (countEl) {
                        countEl.textContent = String(pendingCount);
                    }
                } else {
                    pendingBadge.classList.add('hidden');
                }
            }

            const currentUser = this.getCurrentUser();
            const userName = document.getElementById('user-name');
            const userRole = document.getElementById('user-role');
            const headerUserName = document.getElementById('header-user-name');
            const headerUserRole = document.getElementById('header-user-role');
            if (userName) { userName.textContent = currentUser?.name || 'Usuário'; }
            if (userRole) { userRole.textContent = this.getRoleLabel(this.getRole()); }
            if (headerUserName) { headerUserName.textContent = currentUser?.name || 'Usuário'; }
            if (headerUserRole) { headerUserRole.textContent = this.getRoleLabel(this.getRole()); }
        };
    }

    function patchApp() {
        if (typeof App === 'undefined') {
            return;
        }

        const originalSetupEventListeners = App.setupEventListeners.bind(App);
        const originalShowApp = App.showApp.bind(App);
        const originalRenderPage = App.renderPage.bind(App);
        const originalRefreshActiveView = App.refreshActiveView.bind(App);

        App.setupEventListeners = function () {
            originalSetupEventListeners();

            const globalSearchInput = document.getElementById('global-search-input');
            if (globalSearchInput && !globalSearchInput.dataset.bound) {
                globalSearchInput.dataset.bound = 'true';
                globalSearchInput.addEventListener('keydown', (event) => {
                    if (event.key === 'Enter') {
                        event.preventDefault();
                        this.handleGlobalSearch(globalSearchInput.value);
                    }
                });
            }

            const notificationsToggle = document.getElementById('notifications-toggle');
            const notificationPanelClose = document.getElementById('notification-panel-close');
            if (notificationsToggle && !notificationsToggle.dataset.bound) {
                notificationsToggle.dataset.bound = 'true';
                notificationsToggle.addEventListener('click', (event) => {
                    event.stopPropagation();
                    this.toggleNotificationPanel();
                });
            }

            if (notificationPanelClose && !notificationPanelClose.dataset.bound) {
                notificationPanelClose.dataset.bound = 'true';
                notificationPanelClose.addEventListener('click', () => this.toggleNotificationPanel(false));
            }

            if (!this._notificationOutsideCloseBound) {
                document.addEventListener('click', (event) => {
                    const panel = document.getElementById('notification-panel');
                    const toggle = document.getElementById('notifications-toggle');
                    if (!panel || panel.classList.contains('hidden')) {
                        return;
                    }
                    if (!panel.contains(event.target) && (!toggle || !toggle.contains(event.target))) {
                        this.toggleNotificationPanel(false);
                    }
                });
                this._notificationOutsideCloseBound = true;
            }
        };

        App.showApp = function () {
            originalShowApp();
            this.renderNotificationPanel();
            this.applyPageScaffold();
            if (typeof Utils !== 'undefined' && typeof Utils.enhanceTables === 'function') {
                Utils.enhanceTables(document.getElementById('content-area'));
            }
            this.initContentObserver();
        };

        App.renderPage = async function (pageId) {
            await originalRenderPage(pageId);
            this.applyPageScaffold();
            this.renderNotificationPanel();
            if (typeof Auth !== 'undefined' && typeof Auth.renderMenu === 'function') {
                Auth.renderMenu(pageId);
            }
            if (typeof Utils !== 'undefined' && typeof Utils.enhanceTables === 'function') {
                Utils.enhanceTables(document.getElementById('content-area'));
            }
        };

        App.refreshActiveView = function (updatedKeys) {
            originalRefreshActiveView(updatedKeys);
            setTimeout(() => {
                this.applyPageScaffold();
                this.renderNotificationPanel();
                if (typeof Auth !== 'undefined' && typeof Auth.renderMenu === 'function') {
                    Auth.renderMenu(this.currentPage);
                }
                if (typeof Utils !== 'undefined' && typeof Utils.enhanceTables === 'function') {
                    Utils.enhanceTables(document.getElementById('content-area'));
                }
            }, 160);
        };

        App.updateBreadcrumb = function (pageId) {
            const breadcrumb = document.getElementById('breadcrumb');
            if (!breadcrumb) {
                return;
            }

            const labels = {
                dashboard: 'Visão Geral',
                solicitacoes: 'Solicitações',
                'minhas-solicitacoes': 'Minhas Solicitações',
                'nova-solicitacao': 'Nova Solicitação',
                aprovacoes: 'Aprovações',
                tecnicos: 'Técnicos',
                fornecedores: 'Fornecedores',
                fornecedor: 'Portal do Fornecedor',
                pecas: 'Peças',
                catalogo: 'Peças',
                relatorios: 'Relatórios',
                configuracoes: 'Configurações',
                ajuda: 'Ajuda',
                perfil: 'Meu Perfil'
            };

            breadcrumb.innerHTML = '<button class="breadcrumb-home" type="button"><i class="fas fa-house"></i> Início</button><span class="breadcrumb-separator">/</span><span>' + (labels[pageId] || pageId) + '</span>';
        };

        App.applyPageScaffold = function () {
            const content = document.getElementById('content-area');
            if (!content) {
                return;
            }

            const first = content.firstElementChild;
            if (!first) {
                return;
            }

            if (first.classList.contains('page-container')) {
                return;
            }

            const nodes = Array.from(content.children);
            if (nodes.length === 0) {
                return;
            }

            const pageContainer = document.createElement('div');
            pageContainer.className = 'page-container page-transition';

            const pageHeader = document.createElement('div');
            pageHeader.className = 'page-header-group';
            const pageFilters = document.createElement('div');
            pageFilters.className = 'page-filters';
            const pageKpis = document.createElement('div');
            pageKpis.className = 'page-kpis';
            const pageContent = document.createElement('div');
            pageContent.className = 'page-content';

            nodes.forEach((node) => {
                if (node.classList.contains('page-header')) {
                    pageHeader.appendChild(node);
                    return;
                }

                if (
                    node.classList.contains('filters-bar') ||
                    node.classList.contains('filter-panel') ||
                    node.classList.contains('tabs')
                ) {
                    pageFilters.appendChild(node);
                    return;
                }

                if (
                    node.classList.contains('kpi-grid') ||
                    node.classList.contains('dashboard-primary-grid') ||
                    node.classList.contains('insight-grid') ||
                    node.classList.contains('report-kpi-grid')
                ) {
                    pageKpis.appendChild(node);
                    return;
                }

                pageContent.appendChild(node);
            });

            if (pageHeader.childElementCount > 0) {
                pageContainer.appendChild(pageHeader);
            }
            if (pageFilters.childElementCount > 0) {
                pageContainer.appendChild(pageFilters);
            }
            if (pageKpis.childElementCount > 0) {
                pageContainer.appendChild(pageKpis);
            }
            if (pageContent.childElementCount > 0) {
                pageContainer.appendChild(pageContent);
            }

            content.innerHTML = '';
            content.appendChild(pageContainer);
        };

        App.renderNotificationPanel = function () {
            const list = document.getElementById('notification-list');
            const dot = document.getElementById('header-notification-dot');
            if (!list || typeof DataManager === 'undefined') {
                return;
            }

            const role = (typeof Auth !== 'undefined' && typeof Auth.getRole === 'function') ? Auth.getRole() : null;
            const currentUser = (typeof Auth !== 'undefined' && typeof Auth.getCurrentUser === 'function') ? (Auth.getCurrentUser() || {}) : {};
            const normalizeEmail = (value) => {
                if (typeof DataManager.normalizeEmail === 'function') {
                    return DataManager.normalizeEmail(value);
                }
                return String(value || '').trim().toLowerCase();
            };

            let notifications = [];

            if (role === 'fornecedor') {
                const allowedStatuses = ['aprovada', 'em-transito'];
                const currentSupplierId = (typeof Auth.getFornecedorId === 'function') ? Auth.getFornecedorId() : (currentUser.fornecedorId || null);
                const currentEmail = normalizeEmail(currentUser.email);

                notifications = DataManager.getSolicitations()
                    .filter((sol) => {
                        if (!allowedStatuses.includes(sol.status)) {
                            return false;
                        }
                        if (!sol.fornecedorId) {
                            return false;
                        }
                        if (currentSupplierId) {
                            return sol.fornecedorId === currentSupplierId;
                        }
                        const supplier = DataManager.getSupplierById(sol.fornecedorId);
                        return !!currentEmail && normalizeEmail(supplier?.email) === currentEmail;
                    })
                    .sort((a, b) => (b.trackingUpdatedAt || b.approvedAt || b.createdAt || 0) - (a.trackingUpdatedAt || a.approvedAt || a.createdAt || 0))
                    .slice(0, 8);
            } else if (role === 'tecnico') {
                const tecnicoId = (typeof Auth.getTecnicoId === 'function') ? Auth.getTecnicoId() : null;
                notifications = DataManager.getSolicitations()
                    .filter((sol) => sol.tecnicoId === tecnicoId)
                    .sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0))
                    .slice(0, 8);
            } else {
                notifications = DataManager.getPendingSolicitations()
                    .slice()
                    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
                    .slice(0, 8);
            }

            if (notifications.length === 0) {
                list.innerHTML = '<div class="notification-empty"><i class="fas fa-check-circle"></i><p>Sem alertas pendentes.</p></div>';
                if (dot) {
                    dot.classList.add('hidden');
                }
                return;
            }

            list.innerHTML = notifications.map((item) => {
                return '<button class="notification-item" type="button" data-id="' + item.id + '">' 
                    + '<div class="notification-item-title">Solicitação #' + item.numero + '</div>'
                    + '<div class="notification-item-meta">' + Utils.escapeHtml(item.tecnicoNome || 'Técnico') + ' • ' + Utils.formatDate(item.data || item.createdAt) + '</div>'
                    + '<div class="notification-item-status">' + Utils.renderStatusBadge(item.status) + '</div>'
                    + '</button>';
            }).join('');

            const targetPage = role === 'fornecedor'
                ? 'fornecedor'
                : (Auth.hasPermission('aprovacoes', 'view') ? 'aprovacoes' : (role === 'tecnico' ? 'minhas-solicitacoes' : 'solicitacoes'));

            list.querySelectorAll('.notification-item').forEach((button) => {
                button.addEventListener('click', () => {
                    this.toggleNotificationPanel(false);
                    this.navigate(targetPage);
                });
            });

            if (dot) {
                dot.classList.remove('hidden');
            }
        };
        App.toggleNotificationPanel = function (force) {
            const panel = document.getElementById('notification-panel');
            if (!panel) {
                return;
            }
            const shouldOpen = force === null || typeof force === 'undefined'
                ? panel.classList.contains('hidden')
                : !!force;
            panel.classList.toggle('hidden', !shouldOpen);
        };

        App.handleGlobalSearch = function (query) {
            const term = String(query || '').trim();
            if (!term) {
                return;
            }

            const role = (typeof Auth !== 'undefined' && typeof Auth.getRole === 'function') ? Auth.getRole() : null;
            const targetPage = role === 'tecnico'
                ? 'minhas-solicitacoes'
                : (role === 'fornecedor' ? 'fornecedor' : 'solicitacoes');

            if (this.currentPage !== targetPage) {
                this.navigate(targetPage);
            }

            setTimeout(() => {
                if (role === 'fornecedor' && typeof FornecedorPortal !== 'undefined') {
                    FornecedorPortal.filters.search = term;
                    FornecedorPortal.currentPage = 1;
                    FornecedorPortal.render();
                    Utils.showToast('Busca aplicada no portal do fornecedor', 'info');
                    return;
                }

                if (typeof Solicitacoes !== 'undefined') {
                    Solicitacoes.filters.search = term;
                    Solicitacoes.currentPage = 1;
                    Solicitacoes.render();
                }
                Utils.showToast('Busca aplicada na lista de solicitações', 'info');
            }, 180);
        };
        App.initContentObserver = function () {
            if (this._contentObserverBound) {
                return;
            }

            const content = document.getElementById('content-area');
            if (!content) {
                return;
            }

            const refreshUI = debounce(() => {
                this.applyPageScaffold();
                this.renderNotificationPanel();
                if (typeof Utils !== 'undefined' && typeof Utils.enhanceTables === 'function') {
                    Utils.enhanceTables(content);
                }
            }, 140);

            this._contentObserver = new MutationObserver(refreshUI);
            this._contentObserver.observe(content, { childList: true, subtree: true });
            this._contentObserverBound = true;
        };
    }

    patchUtils();
    patchAuth();
    patchApp();
})();













