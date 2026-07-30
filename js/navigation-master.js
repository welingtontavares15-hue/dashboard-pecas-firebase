(function () {
    'use strict';

    const ROUTE_DEFINITIONS = Object.freeze({
        dashboard: { label: 'Visão Geral', icon: 'fa-chart-pie', permission: ['dashboard', null] },
        solicitacoes: { label: 'Solicitações', icon: 'fa-clipboard-list', permission: ['solicitacoes', 'view'] },
        aprovacoes: { label: 'Aprovações', icon: 'fa-check-double', badge: true, permission: ['aprovacoes', 'view'] },
        pecas: { label: 'Peças', icon: 'fa-boxes-stacked', permission: ['pecas', 'view'] },
        tecnicos: { label: 'Técnicos', icon: 'fa-users-gear', permission: ['tecnicos', 'view'] },
        fornecedores: { label: 'Fornecedores', icon: 'fa-truck-field', permission: ['fornecedores', 'view'] },
        relatorios: { label: 'Relatórios', icon: 'fa-chart-column', permission: ['relatorios', 'view'] },
        configuracoes: { label: 'Configurações', icon: 'fa-sliders', permission: ['configuracoes', 'view'] },
        fornecedor: { label: 'Pedidos Aprovados', icon: 'fa-truck-fast', permission: ['fornecedor', 'view'] },
        perfil: { label: 'Meu Perfil', icon: 'fa-user-gear', roles: ['tecnico', 'fornecedor'] },
        ajuda: { label: 'Ajuda', icon: 'fa-circle-question', roles: ['tecnico'] }
    });

    // Compatibilidade: links antigos continuam válidos, mas não criam telas extras.
    const ROUTE_ALIASES = Object.freeze({
        'minhas-solicitacoes': { pageId: 'solicitacoes' },
        'nova-solicitacao': { pageId: 'solicitacoes', action: 'create-solicitacao' },
        catalogo: { pageId: 'pecas' }
    });

    const NAVIGATION_MODEL = Object.freeze({
        administrador: [
            { key: 'inicio', title: 'INÍCIO', items: ['dashboard'] },
            { key: 'operacao', title: 'OPERAÇÃO', items: ['solicitacoes', 'aprovacoes'] },
            { key: 'cadastros', title: 'CADASTROS', items: ['pecas', 'tecnicos', 'fornecedores'] },
            { key: 'analises', title: 'ANÁLISES', items: ['relatorios'] },
            { key: 'sistema', title: 'SISTEMA', items: ['configuracoes'] }
        ],
        gestor: [
            { key: 'inicio', title: 'INÍCIO', items: ['dashboard'] },
            { key: 'operacao', title: 'OPERAÇÃO', items: ['solicitacoes', 'aprovacoes'] },
            { key: 'analises', title: 'ANÁLISES', items: ['relatorios'] },
            { key: 'sistema', title: 'SISTEMA', items: ['configuracoes'] }
        ],
        tecnico: [
            { key: 'operacao', title: 'OPERAÇÃO', items: [
                { id: 'solicitacoes', label: 'Minhas Solicitações' }
            ] },
            { key: 'consulta', title: 'CONSULTA', items: [
                { id: 'pecas', label: 'Catálogo de Peças', icon: 'fa-magnifying-glass' }
            ] },
            { key: 'conta', title: 'CONTA', items: ['perfil', 'ajuda'] }
        ],
        fornecedor: [
            { key: 'pedidos', title: 'PEDIDOS', items: ['fornecedor'] },
            { key: 'conta', title: 'CONTA', items: ['perfil'] }
        ]
    });

    function resolveRoute(routeId) {
        const requestedId = String(routeId || '').trim();
        const alias = ROUTE_ALIASES[requestedId];
        return {
            requestedId,
            pageId: alias?.pageId || requestedId,
            action: alias?.action || null
        };
    }

    function normalizeItem(item) {
        const override = typeof item === 'string' ? { id: item } : item;
        const definition = ROUTE_DEFINITIONS[override.id];
        if (!definition) return null;
        return { ...definition, ...override };
    }

    function getGroups(role) {
        const groups = NAVIGATION_MODEL[role] || NAVIGATION_MODEL.gestor;
        return groups.map((group) => ({
            ...group,
            items: group.items.map(normalizeItem).filter(Boolean)
        }));
    }

    function getMenuItems(role) {
        return getGroups(role).flatMap((group) => group.items.map((item) => ({
            ...item,
            section: group.title
        })));
    }

    function getRouteLabel(routeId, role) {
        const { pageId } = resolveRoute(routeId);
        const menuItem = getMenuItems(role).find((item) => item.id === pageId);
        return menuItem?.label || ROUTE_DEFINITIONS[pageId]?.label || pageId;
    }

    function canAccessRoute(auth, routeId) {
        if (!auth) return false;
        const { pageId, action } = resolveRoute(routeId);
        const role = auth.getRole();
        const definition = ROUTE_DEFINITIONS[pageId];
        if (!role || !definition) return false;

        const visibleForRole = getMenuItems(role).some((item) => item.id === pageId);
        if (!visibleForRole) return false;

        if (Array.isArray(definition.roles) && !definition.roles.includes(role)) {
            return false;
        }

        if (Array.isArray(definition.permission)) {
            const [module, permissionAction] = definition.permission;
            if (!auth.hasPermission(module, permissionAction)) return false;
        }

        if (action === 'create-solicitacao' && !auth.hasPermission('solicitacoes', 'create')) {
            return false;
        }

        return true;
    }

    function getPendingCount() {
        try {
            const pending = DataManager.getPendingSolicitations();
            return Array.isArray(pending) ? pending.length : 0;
        } catch (_error) {
            return 0;
        }
    }

    function updateIdentity(auth) {
        const currentUser = auth.getCurrentUser();
        const roleLabel = auth.getRoleLabel(auth.getRole());
        [
            ['user-name', currentUser?.name || 'Usuário'],
            ['user-role', roleLabel],
            ['header-user-name', currentUser?.name || 'Usuário'],
            ['header-user-role', roleLabel]
        ].forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) element.textContent = value;
        });
    }

    function updatePendingHeader(auth, pendingCount) {
        const badge = document.getElementById('pending-badge');
        const count = document.getElementById('pending-count');
        if (!badge) return;

        const visible = auth.hasPermission('aprovacoes', 'view') && pendingCount > 0;
        badge.classList.toggle('hidden', !visible);
        badge.setAttribute('aria-hidden', visible ? 'false' : 'true');
        if (count) count.textContent = String(pendingCount);
    }

    function render(auth, activeId) {
        const nav = document.getElementById('sidebar-nav');
        if (!nav || !auth) return;

        const role = auth.getRole();
        const groups = getGroups(role);
        const activePageId = resolveRoute(activeId).pageId;
        const pendingCount = getPendingCount();
        const activeGroup = groups.find((group) => group.items.some((item) => item.id === activePageId))?.key || groups[0]?.key;
        auth._menuGroupsCollapsed = auth._menuGroupsCollapsed || {};

        const buildItem = (item) => {
            const active = item.id === activePageId;
            const badge = item.badge && pendingCount > 0
                ? `<span class="nav-badge" aria-label="${pendingCount} pendente(s)">${pendingCount}</span>`
                : '';
            return `<a class="nav-item ${active ? 'active' : ''}" data-page="${item.id}" title="${item.label}"${active ? ' aria-current="page"' : ''}>`
                + `<i class="fas ${item.icon}" aria-hidden="true"></i>`
                + `<span>${item.label}</span>${badge}</a>`;
        };

        nav.innerHTML = groups.map((group) => {
            const storedState = auth._menuGroupsCollapsed[group.key];
            const collapsed = storedState === undefined ? group.key !== activeGroup : storedState;
            return `<section class="nav-group ${collapsed ? 'collapsed' : ''}" data-nav-group="${group.key}">`
                + `<button type="button" class="nav-group-toggle" data-group-toggle="${group.key}" aria-expanded="${collapsed ? 'false' : 'true'}">`
                + `<span>${group.title}</span><i class="fas fa-chevron-down" aria-hidden="true"></i></button>`
                + `<div class="nav-group-items">${group.items.map(buildItem).join('')}</div></section>`;
        }).join('');

        nav.querySelectorAll('[data-group-toggle]').forEach((button) => {
            button.addEventListener('click', () => {
                const key = button.dataset.groupToggle;
                const group = nav.querySelector(`[data-nav-group="${key}"]`);
                if (!group) return;
                const collapsed = !group.classList.contains('collapsed');
                group.classList.toggle('collapsed', collapsed);
                button.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
                auth._menuGroupsCollapsed[key] = collapsed;
            });
        });

        updateIdentity(auth);
        updatePendingHeader(auth, pendingCount);
    }

    window.NavigationMaster = Object.freeze({
        model: NAVIGATION_MODEL,
        routes: ROUTE_DEFINITIONS,
        aliases: ROUTE_ALIASES,
        resolveRoute,
        getGroups,
        getMenuItems,
        getRouteLabel,
        canAccessRoute,
        render
    });
})();
