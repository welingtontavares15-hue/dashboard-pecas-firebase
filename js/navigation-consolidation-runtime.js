(function () {
    'use strict';

    const LEGACY_ROUTE_ALIASES = Object.freeze({
        'minhas-solicitacoes': { pageId: 'solicitacoes' },
        'nova-solicitacao': { pageId: 'solicitacoes', action: 'create-solicitacao' },
        catalogo: { pageId: 'pecas' }
    });

    function resolveRoute(routeId) {
        if (window.NavigationMaster?.resolveRoute) {
            return window.NavigationMaster.resolveRoute(routeId);
        }
        const requestedId = String(routeId || '').trim();
        const alias = LEGACY_ROUTE_ALIASES[requestedId];
        return {
            requestedId,
            pageId: alias?.pageId || requestedId,
            action: alias?.action || null
        };
    }

    function runRouteAction(action) {
        if (action !== 'create-solicitacao') return;
        const openForm = () => {
            if (window.Solicitacoes && typeof window.Solicitacoes.openForm === 'function') {
                window.Solicitacoes.openForm();
                return true;
            }
            return false;
        };
        if (!openForm()) window.setTimeout(openForm, 150);
    }

    function installAuthAuthority() {
        if (!window.Auth || !window.NavigationMaster) return false;

        window.Auth.renderMenu = function (activeId) {
            window.NavigationMaster.render(this, resolveRoute(activeId).pageId);
        };

        window.Auth.canAccessRoute = function (routeId) {
            return window.NavigationMaster.canAccessRoute(this, routeId);
        };

        window.Auth.getMenuItems = function () {
            return window.NavigationMaster.getMenuItems(this.getRole());
        };

        return true;
    }

    function installAppAuthority() {
        if (!window.App || window.App.__navigationConsolidationInstalled) return !!window.App;

        const originalNavigate = window.App.navigate.bind(window.App);
        window.App.navigate = async function (routeId) {
            const resolved = resolveRoute(routeId);
            const result = await originalNavigate(resolved.pageId);
            runRouteAction(resolved.action);
            syncCanonicalState(resolved.pageId);
            return result;
        };

        const originalDefaultPage = window.App.getDefaultPage?.bind(window.App);
        window.App.getDefaultPage = function () {
            const current = originalDefaultPage ? originalDefaultPage() : 'dashboard';
            return resolveRoute(current).pageId;
        };

        window.App.__navigationConsolidationInstalled = true;
        return true;
    }

    function canonicalizeNode(node) {
        const routeId = node?.dataset?.page;
        if (!routeId) return;
        const resolved = resolveRoute(routeId);
        node.dataset.page = resolved.pageId;
        if (resolved.action) node.dataset.routeAction = resolved.action;
    }

    function canonicalizeNavigationNodes(root) {
        (root || document).querySelectorAll('[data-page]').forEach(canonicalizeNode);
    }

    function syncCanonicalState(pageId) {
        const canonicalPage = resolveRoute(pageId || window.App?.currentPage).pageId;
        canonicalizeNavigationNodes(document);

        document.querySelectorAll('.nav-item[data-page]').forEach((item) => {
            const active = item.dataset.page === canonicalPage;
            item.classList.toggle('active', active);
            if (active) item.setAttribute('aria-current', 'page');
            else item.removeAttribute('aria-current');
        });

        const technicianNav = document.getElementById('technician-bottom-navigation');
        if (technicianNav) {
            technicianNav.querySelectorAll('[data-page]').forEach((button) => {
                const action = button.dataset.routeAction;
                const active = button.dataset.page === canonicalPage && !action;
                button.classList.toggle('active', active);
                button.setAttribute('aria-current', active ? 'page' : 'false');
            });
        }
    }

    function bindDelegatedActions() {
        if (document.documentElement.dataset.navigationActionsBound === 'true') return;
        document.documentElement.dataset.navigationActionsBound = 'true';

        document.addEventListener('click', (event) => {
            const target = event.target.closest('[data-route-action]');
            if (!target) return;
            event.preventDefault();
            event.stopImmediatePropagation();
            const pageId = target.dataset.page || 'solicitacoes';
            if (window.App?.navigate) {
                Promise.resolve(window.App.navigate(pageId)).then(() => runRouteAction(target.dataset.routeAction));
            }
        }, true);
    }

    function removeDuplicateNavigation() {
        const sidebar = document.getElementById('sidebar-nav');
        if (!sidebar) return;

        const seen = new Set();
        sidebar.querySelectorAll('.nav-item[data-page]').forEach((item) => {
            canonicalizeNode(item);
            const key = item.dataset.page;
            if (seen.has(key)) item.remove();
            else seen.add(key);
        });
    }

    function reassertAuthority() {
        installAuthAuthority();
        installAppAuthority();
        canonicalizeNavigationNodes(document);
        removeDuplicateNavigation();
        syncCanonicalState();
    }

    function observeNavigation() {
        const observer = new MutationObserver(() => {
            window.requestAnimationFrame(reassertAuthority);
        });
        observer.observe(document.documentElement, { childList: true, subtree: true });
    }

    function init() {
        bindDelegatedActions();
        reassertAuthority();
        observeNavigation();

        let attempts = 0;
        const timer = window.setInterval(() => {
            attempts += 1;
            reassertAuthority();
            if (attempts >= 40 && window.Auth && window.App && window.NavigationMaster) {
                window.clearInterval(timer);
            }
        }, 125);

        window.addEventListener('data:updated', () => window.setTimeout(reassertAuthority, 0));
        window.addEventListener('resize', () => window.setTimeout(reassertAuthority, 0));
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
    else init();
})();
