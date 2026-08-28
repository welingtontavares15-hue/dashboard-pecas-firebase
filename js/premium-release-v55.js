(function () {
    'use strict';

    const RELEASE_VERSION = 'v55-premium-production';
    const ASSET_VERSION = '20260828c';

    function installAnalyticsContract() {
        if (!window.AnalyticsHelper && window.AnalyticsEngine) {
            window.AnalyticsHelper = window.AnalyticsEngine;
        }
        return Boolean(window.AnalyticsHelper || window.AnalyticsEngine);
    }

    function installAppContract() {
        if (!window.App || window.App.__premiumReleaseV55Installed) return false;

        window.App.lazyModules.dashboard = `./pages/dashboard-v55.js?v=${ASSET_VERSION}`;
        window.App.lazyModules.relatorios = `./pages/relatorios-v55.js?v=${ASSET_VERSION}`;
        delete window.App._lazyLoaded.dashboard;
        delete window.App._lazyLoaded.relatorios;

        const originalUpdateBreadcrumb = window.App.updateBreadcrumb.bind(window.App);
        window.App.updateBreadcrumb = function updateBreadcrumbV55(pageId) {
            if (pageId !== 'dashboard' && pageId !== 'visao-geral') {
                return originalUpdateBreadcrumb(pageId);
            }
            const breadcrumb = document.getElementById('breadcrumb');
            if (breadcrumb) {
                breadcrumb.innerHTML = '<span>Visão Operacional</span>';
            }
        };

        const originalShowApp = window.App.showApp.bind(window.App);
        window.App.showApp = function showAppV55() {
            originalShowApp();
            window.setTimeout(() => {
                if (typeof window.Auth?.renderMenu === 'function') {
                    window.Auth.renderMenu(window.App.currentPage || window.App.getDefaultPage());
                }
            }, 0);
        };

        window.App.__premiumReleaseV55Installed = true;
        return true;
    }

    function installNavigationContract() {
        if (!window.Auth || !window.NavigationMaster) return false;
        window.Auth.renderMenu = function renderMenuV55(activeId) {
            window.NavigationMaster.render(this, window.NavigationMaster.resolveRoute(activeId).pageId);
        };
        window.Auth.canAccessRoute = function canAccessRouteV55(routeId) {
            return window.NavigationMaster.canAccessRoute(this, routeId);
        };
        window.Auth.getMenuItems = function getMenuItemsV55() {
            return window.NavigationMaster.getMenuItems(this.getRole());
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
        installAnalyticsContract();
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
        if ((window.App && window.Auth && window.NavigationMaster && (window.AnalyticsHelper || window.AnalyticsEngine)) || attempts >= 40) {
            window.clearInterval(timer);
        }
    }, 100);
})();
