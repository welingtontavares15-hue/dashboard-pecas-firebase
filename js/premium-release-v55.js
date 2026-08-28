(function () {
    'use strict';

    const RELEASE_VERSION = 'v55-premium-production';
    const ASSET_VERSION = '20260828c';

    function installAppContract() {
        if (!window.App || App.__premiumReleaseV55Installed) return false;

        App.lazyModules.dashboard = `./pages/dashboard-v55.js?v=${ASSET_VERSION}`;
        App.lazyModules.relatorios = `./pages/relatorios-v55.js?v=${ASSET_VERSION}`;
        delete App._lazyLoaded.dashboard;
        delete App._lazyLoaded.relatorios;

        const originalUpdateBreadcrumb = App.updateBreadcrumb.bind(App);
        App.updateBreadcrumb = function updateBreadcrumbV55(pageId) {
            if (pageId !== 'dashboard' && pageId !== 'visao-geral') {
                return originalUpdateBreadcrumb(pageId);
            }
            const breadcrumb = document.getElementById('breadcrumb');
            if (breadcrumb) {
                breadcrumb.innerHTML = '<span>Visão Operacional</span>';
            }
        };

        const originalShowApp = App.showApp.bind(App);
        App.showApp = function showAppV55() {
            originalShowApp();
            window.setTimeout(() => {
                if (typeof Auth?.renderMenu === 'function') {
                    Auth.renderMenu(App.currentPage || App.getDefaultPage());
                }
            }, 0);
        };

        App.__premiumReleaseV55Installed = true;
        return true;
    }

    function installNavigationContract() {
        if (!window.Auth || !window.NavigationMaster) return false;
        Auth.renderMenu = function renderMenuV55(activeId) {
            NavigationMaster.render(this, NavigationMaster.resolveRoute(activeId).pageId);
        };
        Auth.canAccessRoute = function canAccessRouteV55(routeId) {
            return NavigationMaster.canAccessRoute(this, routeId);
        };
        Auth.getMenuItems = function getMenuItemsV55() {
            return NavigationMaster.getMenuItems(this.getRole());
        };
        return true;
    }

    function markRelease() {
        document.documentElement.dataset.uiRelease = RELEASE_VERSION;
        document.body?.classList.add('premium-release-v55');
        window.PREMIUM_RELEASE_VERSION = RELEASE_VERSION;
    }

    function install() {
        markRelease();
        installNavigationContract();
        installAppContract();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', install, { once: true });
    } else {
        install();
    }

    let attempts = 0;
    const timer = window.setInterval(() => {
        attempts += 1;
        install();
        if ((window.App && window.Auth && window.NavigationMaster) || attempts >= 40) {
            window.clearInterval(timer);
        }
    }, 100);
})();
