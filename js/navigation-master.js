(function () {
    'use strict';

    const NAVIGATION_MODEL = {
        administrador: [
            { key: 'inicio', title: 'INÍCIO', items: [
                { id: 'dashboard', label: 'Visão Geral', icon: 'fa-chart-pie' }
            ] },
            { key: 'operacao', title: 'OPERAÇÃO', items: [
                { id: 'solicitacoes', label: 'Solicitações', icon: 'fa-clipboard-list' },
                { id: 'aprovacoes', label: 'Aprovações', icon: 'fa-check-double', badge: true }
            ] },
            { key: 'cadastros', title: 'CADASTROS', items: [
                { id: 'pecas', label: 'Peças', icon: 'fa-boxes-stacked' },
                { id: 'tecnicos', label: 'Técnicos', icon: 'fa-users-gear' },
                { id: 'fornecedores', label: 'Fornecedores', icon: 'fa-truck-field' }
            ] },
            { key: 'analises', title: 'ANÁLISES', items: [
                { id: 'relatorios', label: 'Relatórios', icon: 'fa-chart-column' }
            ] },
            { key: 'sistema', title: 'SISTEMA', items: [
                { id: 'configuracoes', label: 'Configurações', icon: 'fa-sliders' }
            ] }
        ],
        gestor: [
            { key: 'inicio', title: 'INÍCIO', items: [
                { id: 'dashboard', label: 'Visão Geral', icon: 'fa-chart-pie' }
            ] },
            { key: 'operacao', title: 'OPERAÇÃO', items: [
                { id: 'solicitacoes', label: 'Solicitações', icon: 'fa-clipboard-list' },
                { id: 'aprovacoes', label: 'Aprovações', icon: 'fa-check-double', badge: true }
            ] },
            { key: 'analises', title: 'ANÁLISES', items: [
                { id: 'relatorios', label: 'Relatórios', icon: 'fa-chart-column' }
            ] },
            { key: 'sistema', title: 'SISTEMA', items: [
                { id: 'configuracoes', label: 'Configurações', icon: 'fa-sliders' }
            ] }
        ],
        tecnico: [
            { key: 'solicitacoes', title: 'SOLICITAÇÕES', items: [
                { id: 'minhas-solicitacoes', label: 'Minhas Solicitações', icon: 'fa-clipboard-list' },
                { id: 'nova-solicitacao', label: 'Nova Solicitação', icon: 'fa-circle-plus' }
            ] },
            { key: 'consulta', title: 'CONSULTA', items: [
                { id: 'catalogo', label: 'Catálogo de Peças', icon: 'fa-magnifying-glass' }
            ] },
            { key: 'conta', title: 'CONTA', items: [
                { id: 'perfil', label: 'Meu Perfil', icon: 'fa-user-gear' },
                { id: 'ajuda', label: 'Ajuda', icon: 'fa-circle-question' }
            ] }
        ],
        fornecedor: [
            { key: 'pedidos', title: 'PEDIDOS', items: [
                { id: 'fornecedor', label: 'Pedidos Aprovados', icon: 'fa-truck-fast' }
            ] },
            { key: 'conta', title: 'CONTA', items: [
                { id: 'perfil', label: 'Meu Perfil', icon: 'fa-user-gear' }
            ] }
        ]
    };

    const ROUTE_GROUP = {
        dashboard: 'inicio',
        solicitacoes: 'operacao',
        aprovacoes: 'operacao',
        pecas: 'cadastros',
        tecnicos: 'cadastros',
        fornecedores: 'cadastros',
        relatorios: 'analises',
        configuracoes: 'sistema',
        'minhas-solicitacoes': 'solicitacoes',
        'nova-solicitacao': 'solicitacoes',
        catalogo: 'consulta',
        ajuda: 'conta',
        perfil: 'conta',
        fornecedor: 'pedidos'
    };

    function getPendingCount() {
        try {
            return Array.isArray(DataManager.getPendingSolicitations())
                ? DataManager.getPendingSolicitations().length
                : 0;
        } catch (_error) {
            return 0;
        }
    }

    function updateIdentity(auth) {
        const currentUser = auth.getCurrentUser();
        const roleLabel = auth.getRoleLabel(auth.getRole());
        const bindings = [
            ['user-name', currentUser?.name || 'Usuário'],
            ['user-role', roleLabel],
            ['header-user-name', currentUser?.name || 'Usuário'],
            ['header-user-role', roleLabel]
        ];
        bindings.forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) element.textContent = value;
        });
    }

    function install() {
        if (typeof Auth === 'undefined') return;

        Auth.renderMenu = function (activeId) {
            const nav = document.getElementById('sidebar-nav');
            if (!nav) return;

            const role = this.getRole();
            const groups = NAVIGATION_MODEL[role] || NAVIGATION_MODEL.gestor;
            const pendingCount = getPendingCount();
            const activeGroup = ROUTE_GROUP[activeId] || groups[0]?.key;
            this._menuGroupsCollapsed = this._menuGroupsCollapsed || {};

            const buildItem = (item) => {
                const active = item.id === activeId;
                const badge = item.badge && pendingCount > 0
                    ? `<span class="nav-badge" aria-label="${pendingCount} pendente(s)">${pendingCount}</span>`
                    : '';
                return `<a class="nav-item ${active ? 'active' : ''}" data-page="${item.id}" title="${item.label}">`
                    + `<i class="fas ${item.icon}" aria-hidden="true"></i>`
                    + `<span>${item.label}</span>${badge}</a>`;
            };

            nav.innerHTML = groups.map((group) => {
                const manuallyCollapsed = this._menuGroupsCollapsed[group.key];
                const collapsed = manuallyCollapsed === undefined
                    ? group.key !== activeGroup
                    : manuallyCollapsed;
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
                    this._menuGroupsCollapsed[key] = collapsed;
                });
            });

            updateIdentity(this);
        };
    }

    install();
    window.NavigationMaster = { model: NAVIGATION_MODEL, routeGroup: ROUTE_GROUP };
})();
