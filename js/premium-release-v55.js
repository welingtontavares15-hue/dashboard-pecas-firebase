(function () {
    'use strict';

    const RELEASE_VERSION = 'v56-1-wwm-proportional-login';
    const ASSET_VERSION = '20260828e';

    function installAnalyticsContract() {
        if (!window.AnalyticsHelper && window.AnalyticsEngine) {
            window.AnalyticsHelper = window.AnalyticsEngine;
        }
        return Boolean(window.AnalyticsHelper || window.AnalyticsEngine);
    }

    function installWwmLoginReference() {
        const screen = document.getElementById('login-screen');
        const card = screen?.querySelector('.login-card');
        const inner = screen?.querySelector('.login-card-inner');
        if (!screen || !card || !inner) return false;

        screen.classList.add('wwm-reference-login');

        if (!card.querySelector('.wwm-login-header')) {
            card.insertAdjacentHTML('afterbegin', `
                <header class="wwm-login-header" aria-label="Identidade WWM">
                    <div class="wwm-login-brand">
                        <span class="wwm-brand-symbol" aria-hidden="true">D</span>
                        <div class="wwm-brand-copy">
                            <strong>Diversey</strong>
                            <span>A Solenis Company</span>
                        </div>
                    </div>
                    <p>Central operacional AS&amp;TS · Solenis Brasil</p>
                </header>
            `);
        }

        const kicker = inner.querySelector('.login-form-kicker');
        const title = inner.querySelector('#login-title');
        const description = inner.querySelector('.login-logo > p');
        const submit = inner.querySelector('#login-submit');
        const footer = inner.querySelector('.premium-login-form-footer');

        if (kicker) kicker.textContent = 'WWM · Warewashing Machine Request';
        if (title) title.textContent = 'Acesso corporativo';
        if (description) description.textContent = 'Use seu usuário e senha para acessar o Portal de Peças WWM.';
        if (submit && !submit.dataset.wwmLabelApplied) {
            submit.innerHTML = '<i class="fas fa-arrow-right-to-bracket" aria-hidden="true"></i> Entrar';
            submit.dataset.wwmLabelApplied = 'true';
        }
        if (footer) {
            footer.innerHTML = '<i class="fas fa-shield-halved" aria-hidden="true"></i> Acesso protegido para usuários autorizados.';
        }

        if (!inner.querySelector('.wwm-login-support')) {
            const support = document.createElement('p');
            support.className = 'wwm-login-support';
            support.textContent = 'Sem acesso? Solicite liberação ao administrador.';
            inner.appendChild(support);
        }

        if (!inner.querySelector('.wwm-login-meta')) {
            const meta = document.createElement('div');
            meta.className = 'wwm-login-meta';
            meta.innerHTML = '<span>Solenis Brasil</span><span>Portal de Peças WWM</span>';
            inner.appendChild(meta);
        }

        return true;
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
        document.body?.classList.add('premium-release-v55', 'wwm-reference-release-v56');
        window.PREMIUM_RELEASE_VERSION = RELEASE_VERSION;
    }

    function install() {
        markRelease();
        installWwmLoginReference();
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
