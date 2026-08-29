(function () {
    'use strict';

    const ROUTE_DEFINITIONS = Object.freeze({
        dashboard: { label: 'Início', icon: 'fa-house', roles: ['administrador', 'gestor'] },
        solicitacoes: { label: 'Solicitações', icon: 'fa-file-lines', permission: ['solicitacoes', 'view'] },
        historico: { label: 'Histórico', icon: 'fa-clock-rotate-left', permission: ['solicitacoes', 'view'], roles: ['tecnico'] },
        aprovacoes: { label: 'Pendências', icon: 'fa-clock', badge: true, permission: ['aprovacoes', 'view'] },
        pecas: { label: 'Peças', icon: 'fa-boxes-stacked', permission: ['pecas', 'view'] },
        tecnicos: { label: 'Técnicos', icon: 'fa-users-gear', permission: ['tecnicos', 'view'] },
        fornecedores: { label: 'Fornecedores', icon: 'fa-truck-field', permission: ['fornecedores', 'view'] },
        relatorios: { label: 'Histórico e análises', icon: 'fa-chart-line', permission: ['relatorios', 'view'] },
        configuracoes: { label: 'Administração', icon: 'fa-gear', permission: ['configuracoes', 'view'] },
        fornecedor: { label: 'Pedidos Aprovados', icon: 'fa-truck-fast', permission: ['fornecedor', 'view'] },
        perfil: { label: 'Meu Perfil', icon: 'fa-user-gear', roles: ['tecnico', 'fornecedor'] },
        ajuda: { label: 'Ajuda', icon: 'fa-circle-question', roles: ['tecnico'] }
    });

    const ROUTE_ALIASES = Object.freeze({
        'visao-geral': { pageId: 'dashboard' },
        'minhas-solicitacoes': { pageId: 'solicitacoes' },
        'nova-solicitacao': { pageId: 'solicitacoes', action: 'create-solicitacao' },
        catalogo: { pageId: 'pecas' },
        historico: { pageId: 'solicitacoes', action: 'focus-technician-history' }
    });

    const NAVIGATION_MODEL = Object.freeze({
        administrador: [
            { key: 'principal', title: 'MENU PRINCIPAL', items: ['dashboard', 'solicitacoes', 'aprovacoes', 'relatorios'] },
            { key: 'cadastros', title: 'CADASTROS', items: ['pecas', 'tecnicos', 'fornecedores'] },
            { key: 'sistema', title: 'SISTEMA', items: ['configuracoes'] }
        ],
        gestor: [
            { key: 'principal', title: 'MENU PRINCIPAL', items: ['dashboard', 'solicitacoes', 'aprovacoes', 'relatorios'] },
            { key: 'sistema', title: 'SISTEMA', items: ['configuracoes'] }
        ],
        tecnico: [
            { key: 'operacao', title: 'OPERAÇÃO', items: [{ id: 'solicitacoes', label: 'Minhas Solicitações' }] },
            { key: 'consulta', title: 'CONSULTA', items: [
                { id: 'historico', label: 'Histórico', icon: 'fa-clock-rotate-left' },
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
        return { requestedId, pageId: alias?.pageId || requestedId, action: alias?.action || null };
    }

    function normalizeItem(item) {
        const override = typeof item === 'string' ? { id: item } : item;
        const definition = ROUTE_DEFINITIONS[override.id];
        if (!definition) return null;
        return { ...definition, ...override };
    }

    function getGroups(role) {
        const groups = NAVIGATION_MODEL[role] || NAVIGATION_MODEL.gestor;
        return groups.map((group) => ({ ...group, items: group.items.map(normalizeItem).filter(Boolean) }));
    }

    function getMenuItems(role) {
        return getGroups(role).flatMap((group) => group.items.map((item) => ({ ...item, section: group.title })));
    }

    function getRouteLabel(routeId, role) {
        const { requestedId, pageId } = resolveRoute(routeId);
        const menuItem = getMenuItems(role).find((item) => item.id === requestedId)
            || getMenuItems(role).find((item) => item.id === pageId);
        return menuItem?.label || ROUTE_DEFINITIONS[requestedId]?.label || ROUTE_DEFINITIONS[pageId]?.label || pageId;
    }

    function canAccessRoute(auth, routeId) {
        if (!auth) return false;
        const { requestedId, pageId, action } = resolveRoute(routeId);
        const role = auth.getRole();
        const pageDefinition = ROUTE_DEFINITIONS[pageId];
        const requestedDefinition = ROUTE_DEFINITIONS[requestedId];
        const definition = requestedDefinition || pageDefinition;
        if (!role || !pageDefinition || !definition) return false;

        const visibilityId = requestedDefinition ? requestedId : pageId;
        const visibleForRole = getMenuItems(role).some((item) => item.id === visibilityId || item.id === pageId);
        if (!visibleForRole) return false;
        if (Array.isArray(definition.roles) && !definition.roles.includes(role)) return false;
        if (Array.isArray(definition.permission)) {
            const [module, permissionAction] = definition.permission;
            if (!auth.hasPermission(module, permissionAction)) return false;
        }
        if (action === 'create-solicitacao' && !auth.hasPermission('solicitacoes', 'create')) return false;
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
        [['user-name', currentUser?.name || 'Usuário'], ['user-role', roleLabel], ['header-user-name', currentUser?.name || 'Usuário'], ['header-user-role', roleLabel]].forEach(([id, value]) => {
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
        auth._menuGroupsCollapsed = auth._menuGroupsCollapsed || {};

        const buildItem = (item) => {
            const active = item.id === activePageId;
            const badge = item.badge && pendingCount > 0 ? `<span class="nav-badge" aria-label="${pendingCount} pendente(s)">${pendingCount}</span>` : '';
            const historyMarker = item.id === 'historico' ? ' data-technician-history-nav="true"' : '';
            const homeMarker = item.id === 'dashboard' ? ' nav-item-home' : '';
            return `<a class="nav-item${homeMarker} ${active ? 'active' : ''}" data-page="${item.id}" title="${item.label}"${historyMarker}${active ? ' aria-current="page"' : ''}><i class="fas ${item.icon}" aria-hidden="true"></i><span>${item.label}</span>${badge}</a>`;
        };

        nav.innerHTML = groups.map((group) => {
            const alwaysOpen = group.key === 'principal';
            const collapsed = alwaysOpen ? false : Boolean(auth._menuGroupsCollapsed[group.key]);
            return `<section class="nav-group ${collapsed ? 'collapsed' : ''}" data-nav-group="${group.key}">
                <button type="button" class="nav-group-toggle" data-group-toggle="${group.key}" aria-expanded="${collapsed ? 'false' : 'true'}"><span>${group.title}</span><i class="fas fa-chevron-down" aria-hidden="true"></i></button>
                <div class="nav-group-items">${group.items.map(buildItem).join('')}</div>
            </section>`;
        }).join('');

        nav.querySelectorAll('[data-group-toggle]').forEach((button) => {
            button.addEventListener('click', () => {
                const key = button.dataset.groupToggle;
                if (key === 'principal') return;
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

    window.NavigationMaster = Object.freeze({ model: NAVIGATION_MODEL, routes: ROUTE_DEFINITIONS, aliases: ROUTE_ALIASES, resolveRoute, getGroups, getMenuItems, getRouteLabel, canAccessRoute, render });
})();
