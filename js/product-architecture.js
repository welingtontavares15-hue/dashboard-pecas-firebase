(function () {
    'use strict';

    const MODULES = {
        operation: ['solicitacoes', 'aprovacoes'],
        registries: ['pecas', 'tecnicos', 'fornecedores'],
        technicianWork: ['minhas-solicitacoes', 'nova-solicitacao']
    };

    function role() {
        return typeof Auth !== 'undefined' && typeof Auth.getRole === 'function' ? Auth.getRole() : '';
    }

    function pendingCount() {
        try {
            return typeof DataManager !== 'undefined' && typeof DataManager.getPendingSolicitations === 'function'
                ? DataManager.getPendingSolicitations().length
                : 0;
        } catch (_error) {
            return 0;
        }
    }

    function activeIn(pageId, routes) {
        return routes.includes(pageId);
    }

    function navItem(item, pageId) {
        const isActive = item.routes ? activeIn(pageId, item.routes) : item.page === pageId;
        const badge = item.badge ? pendingCount() : 0;
        return `<a class="nav-item ${isActive ? 'active' : ''}" data-page="${item.page}" title="${item.label}" aria-current="${isActive ? 'page' : 'false'}">
            <i class="fas ${item.icon}" aria-hidden="true"></i>
            <span>${item.label}</span>
            ${badge > 0 ? `<span class="nav-badge">${badge}</span>` : ''}
        </a>`;
    }

    function menuModel(currentRole) {
        if (currentRole === 'tecnico') {
            return [
                { title: 'TRABALHO', items: [
                    { page: 'minhas-solicitacoes', routes: MODULES.technicianWork, label: 'Solicitações', icon: 'fa-clipboard-list' },
                    { page: 'catalogo', label: 'Catálogo', icon: 'fa-magnifying-glass' },
                    { page: 'perfil', label: 'Conta', icon: 'fa-user-gear' }
                ] }
            ];
        }
        if (currentRole === 'fornecedor') {
            return [
                { title: 'ATENDIMENTO', items: [
                    { page: 'fornecedor', label: 'Pedidos', icon: 'fa-truck-fast' },
                    { page: 'perfil', label: 'Conta', icon: 'fa-user-gear' }
                ] }
            ];
        }
        const groups = [
            { title: 'INÍCIO', items: [{ page: 'dashboard', label: 'Visão Geral', icon: 'fa-chart-pie' }] },
            { title: 'OPERAÇÃO', items: [{ page: 'solicitacoes', routes: MODULES.operation, label: 'Solicitações', icon: 'fa-clipboard-check', badge: true }] }
        ];
        if (currentRole === 'administrador') {
            groups.push({ title: 'CADASTROS', items: [{ page: 'pecas', routes: MODULES.registries, label: 'Cadastros', icon: 'fa-layer-group' }] });
        }
        groups.push(
            { title: 'ANÁLISES', items: [{ page: 'relatorios', label: 'Relatórios', icon: 'fa-chart-line' }] },
            { title: 'SISTEMA', items: [{ page: 'configuracoes', label: 'Configurações', icon: 'fa-sliders' }] }
        );
        return groups;
    }

    function renderMenu(pageId) {
        const nav = document.getElementById('sidebar-nav');
        if (!nav || typeof Auth === 'undefined') return;
        const groups = menuModel(role());
        nav.innerHTML = groups.map((group) => `
            <section class="nav-group product-nav-group" data-product-nav="true">
                <div class="product-nav-label">${group.title}</div>
                <div class="nav-group-items">${group.items.map((item) => navItem(item, pageId)).join('')}</div>
            </section>
        `).join('');
        nav.dataset.productArchitecture = 'true';

        const currentUser = typeof Auth.getCurrentUser === 'function' ? Auth.getCurrentUser() : Auth.currentUser;
        const roleLabel = typeof Auth.getRoleLabel === 'function' ? Auth.getRoleLabel(role()) : role();
        ['user-name', 'header-user-name'].forEach((id) => {
            const node = document.getElementById(id);
            if (node) node.textContent = currentUser?.name || 'Usuário';
        });
        ['user-role', 'header-user-role'].forEach((id) => {
            const node = document.getElementById(id);
            if (node) node.textContent = roleLabel || 'Perfil';
        });
    }

    function moduleTabs(pageId) {
        if ((role() === 'administrador' || role() === 'gestor') && MODULES.operation.includes(pageId)) {
            return [
                { page: 'solicitacoes', label: 'Solicitações', icon: 'fa-list-check' },
                { page: 'aprovacoes', label: 'Aprovações', icon: 'fa-check-double', badge: pendingCount() }
            ];
        }
        if (role() === 'administrador' && MODULES.registries.includes(pageId)) {
            return [
                { page: 'pecas', label: 'Peças', icon: 'fa-gears' },
                { page: 'tecnicos', label: 'Técnicos', icon: 'fa-users-gear' },
                { page: 'fornecedores', label: 'Fornecedores', icon: 'fa-truck' }
            ];
        }
        return [];
    }

    function injectModuleTabs(pageId) {
        const content = document.getElementById('content-area');
        if (!content) return;
        const existing = content.querySelector('.product-module-tabs');
        const tabs = moduleTabs(pageId);
        if (!tabs.length) {
            existing?.remove();
            return;
        }
        if (existing?.dataset.page === pageId) return;
        existing?.remove();
        const nav = document.createElement('nav');
        nav.className = 'product-module-tabs';
        nav.dataset.page = pageId;
        nav.setAttribute('aria-label', pageId === 'aprovacoes' || pageId === 'solicitacoes' ? 'Seções da operação' : 'Seções dos cadastros');
        nav.innerHTML = tabs.map((tab) => {
            const current = tab.page === pageId;
            return `<button type="button" class="product-module-tab ${current ? 'active' : ''}" data-target-page="${tab.page}" aria-current="${current ? 'page' : 'false'}">
                <i class="fas ${tab.icon}" aria-hidden="true"></i><span>${tab.label}</span>${tab.badge ? `<strong>${tab.badge}</strong>` : ''}
            </button>`;
        }).join('');
        nav.addEventListener('click', (event) => {
            const button = event.target.closest('[data-target-page]');
            if (button && typeof App !== 'undefined') App.navigate(button.dataset.targetPage);
        });
        const header = content.querySelector('.page-header, .premium-dashboard-hero, .reports-header-compact, .supplier-header');
        if (header) header.insertAdjacentElement('afterend', nav);
        else content.prepend(nav);
    }

    function removeRedundantTableFilter() {
        const content = document.getElementById('content-area');
        if (!content) return;
        const primary = content.querySelector('.filters-bar input, .filter-panel input, .report-filters-modern input, .supplier-filters-bar input');
        content.classList.toggle('has-primary-filter', Boolean(primary));
        if (primary) content.querySelectorAll('.table-toolbar').forEach((toolbar) => toolbar.remove());
    }

    function markEmptyPanels() {
        document.querySelectorAll('.premium-chart-shell').forEach((shell) => {
            const empty = shell.querySelector('.premium-empty') || /sem dados|sem solicitações/i.test(shell.textContent || '');
            shell.classList.toggle('is-empty', Boolean(empty));
            shell.closest('.premium-panel')?.classList.toggle('is-empty-panel', Boolean(empty));
        });
    }

    function addTechnicianSupport() {
        if (role() !== 'tecnico' || (typeof App !== 'undefined' && App.currentPage !== 'perfil')) return;
        const content = document.getElementById('content-area');
        if (!content || content.querySelector('[data-technician-support]')) return;
        const support = document.createElement('section');
        support.className = 'product-support-card';
        support.dataset.technicianSupport = 'true';
        support.innerHTML = `<div><i class="fas fa-circle-question"></i><div><strong>Ajuda e sessão</strong><span>Consulte orientações de uso ou encerre o acesso com segurança.</span></div></div><div class="product-support-actions"><button class="btn btn-outline" type="button" data-support-action="help">Abrir ajuda</button><button class="btn btn-outline" type="button" data-support-action="logout"><i class="fas fa-right-from-bracket"></i>Sair</button></div>`;
        support.querySelector('[data-support-action="help"]').addEventListener('click', () => App.navigate('ajuda'));
        support.querySelector('[data-support-action="logout"]').addEventListener('click', () => App.handleLogout());
        content.appendChild(support);
    }

    function ensureTechnicianBottomNav(pageId) {
        let nav = document.getElementById('technician-mobile-nav');
        if (role() !== 'tecnico') {
            nav?.remove();
            document.body.classList.remove('has-technician-mobile-nav');
            return;
        }
        if (!nav) {
            nav = document.createElement('nav');
            nav.id = 'technician-mobile-nav';
            nav.className = 'technician-mobile-nav';
            nav.setAttribute('aria-label', 'Navegação rápida do técnico');
            nav.innerHTML = `
                <button type="button" data-page="nova-solicitacao"><i class="fas fa-plus"></i><span>Nova</span></button>
                <button type="button" data-page="minhas-solicitacoes"><i class="fas fa-clipboard-list"></i><span>Minhas</span></button>
                <button type="button" data-page="catalogo"><i class="fas fa-magnifying-glass"></i><span>Catálogo</span></button>
                <button type="button" data-page="perfil"><i class="fas fa-user"></i><span>Conta</span></button>`;
            nav.addEventListener('click', (event) => {
                const button = event.target.closest('[data-page]');
                if (button && typeof App !== 'undefined') App.navigate(button.dataset.page);
            });
            document.body.appendChild(nav);
        }
        nav.querySelectorAll('[data-page]').forEach((button) => {
            const target = button.dataset.page;
            const active = target === pageId || (target === 'minhas-solicitacoes' && MODULES.technicianWork.includes(pageId));
            button.classList.toggle('active', active);
            button.setAttribute('aria-current', active ? 'page' : 'false');
        });
        document.body.classList.add('has-technician-mobile-nav');
    }

    function updateBreadcrumb(pageId) {
        const breadcrumb = document.getElementById('breadcrumb');
        if (!breadcrumb) return;
        const map = {
            dashboard: ['Início', 'Visão Geral'],
            solicitacoes: ['Operação', 'Solicitações'],
            aprovacoes: ['Operação', 'Aprovações'],
            pecas: ['Cadastros', 'Peças'],
            tecnicos: ['Cadastros', 'Técnicos'],
            fornecedores: ['Cadastros', 'Fornecedores'],
            relatorios: ['Análises', 'Relatórios'],
            configuracoes: ['Sistema', 'Configurações'],
            'minhas-solicitacoes': ['Trabalho', 'Minhas Solicitações'],
            'nova-solicitacao': ['Trabalho', 'Nova Solicitação'],
            catalogo: ['Consulta', 'Catálogo'],
            perfil: ['Conta'],
            ajuda: ['Conta', 'Ajuda'],
            fornecedor: ['Atendimento', 'Pedidos']
        };
        const path = map[pageId] || [pageId];
        breadcrumb.innerHTML = path.map((label, index) => `<span>${label}</span>${index < path.length - 1 ? '<i class="fas fa-chevron-right" aria-hidden="true"></i>' : ''}`).join('');
    }

    function decorate(pageId) {
        const content = document.getElementById('content-area');
        if (!content) return;
        content.dataset.productPage = pageId;
        content.dataset.productModule = MODULES.operation.includes(pageId) ? 'operation' : MODULES.registries.includes(pageId) ? 'registries' : pageId;
        injectModuleTabs(pageId);
        removeRedundantTableFilter();
        markEmptyPanels();
        addTechnicianSupport();
        ensureTechnicianBottomNav(pageId);
        updateBreadcrumb(pageId);
        renderMenu(pageId);
    }

    function ensureStylesheet() {
        let link = document.querySelector('link[href*="product-architecture.css"]');
        if (!link) {
            link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'css/product-architecture.css?v=20260730a';
            link.dataset.productArchitectureStyle = 'true';
        }
        if (document.head.lastElementChild !== link) document.head.appendChild(link);
    }

    function patchRuntime() {
        if (typeof Auth === 'undefined' || typeof App === 'undefined') return false;
        ensureStylesheet();
        if (Auth.renderMenu !== renderMenu) Auth.renderMenu = renderMenu;
        Auth.__productArchitectureMenu = true;
        if (!App.__productArchitecturePatched) {
            const originalNavigate = App.navigate.bind(App);
            const originalRenderPage = App.renderPage.bind(App);
            App.navigate = async function (pageId) {
                const result = await originalNavigate(pageId);
                decorate(this.currentPage || pageId);
                return result;
            };
            App.renderPage = async function (pageId, renderSequence) {
                const result = await originalRenderPage(pageId, renderSequence);
                decorate(pageId);
                return result;
            };
            App.__productArchitecturePatched = true;
        }
        return true;
    }

    function init() {
        let attempts = 0;
        const timer = setInterval(() => {
            attempts += 1;
            if (patchRuntime()) {
                const pageId = App.currentPage || (typeof App.getDefaultPage === 'function' ? App.getDefaultPage() : 'dashboard');
                decorate(pageId);
            }
            if (attempts >= 80) clearInterval(timer);
        }, 100);

        const sidebarNav = document.getElementById('sidebar-nav');
        if (sidebarNav) {
            const navObserver = new MutationObserver(() => {
                if (sidebarNav.dataset.productArchitecture !== 'true' && typeof App !== 'undefined') {
                    renderMenu(App.currentPage || 'dashboard');
                }
            });
            navObserver.observe(sidebarNav, { childList: true, subtree: true });
        }

        const content = document.getElementById('content-area');
        if (content) {
            const observer = new MutationObserver(() => requestAnimationFrame(() => {
                if (typeof App !== 'undefined') decorate(App.currentPage || 'dashboard');
            }));
            observer.observe(content, { childList: true, subtree: true });
        }
        window.addEventListener('resize', () => {
            if (typeof App !== 'undefined') ensureTechnicianBottomNav(App.currentPage || 'dashboard');
        });
        window.ProductArchitecture = { decorate, renderMenu, modules: MODULES };
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
    else init();
})();
