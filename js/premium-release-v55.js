(function () {
    'use strict';

    const RELEASE_VERSION = 'v61-wwm-portal-exact';
    const ASSET_VERSION = '20260829e';

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
                        <span class="wwm-brand-symbol" aria-hidden="true"></span>
                        <div class="wwm-brand-copy">
                            <strong>Diversey</strong>
                            <span>A Solenis Company</span>
                        </div>
                    </div>
                    <span class="wwm-login-divider" aria-hidden="true"></span>
                    <p><i class="fas fa-cube" aria-hidden="true"></i> Portal de Peças WWM</p>
                </header>
            `);
        }

        const kicker = inner.querySelector('.login-form-kicker');
        const title = inner.querySelector('#login-title');
        const description = inner.querySelector('.login-logo > p');
        const submit = inner.querySelector('#login-submit');
        const footer = inner.querySelector('.premium-login-form-footer');

        if (kicker) kicker.textContent = '';
        if (title) title.textContent = 'Acesso ao ambiente corporativo';
        if (description) description.textContent = 'Informe seu usuário e senha para acessar o Portal de Solicitação de Peças WWM.';
        if (submit && !submit.dataset.wwmLabelApplied) {
            submit.innerHTML = 'Entrar <i class="fas fa-arrow-right" aria-hidden="true"></i>';
            submit.dataset.wwmLabelApplied = 'true';
        }
        if (footer) footer.innerHTML = '<i class="fas fa-shield-halved" aria-hidden="true"></i> Acesso seguro e monitorado. <span>Solicite acesso à TI.</span>';

        if (!inner.querySelector('.wwm-login-support')) {
            const support = document.createElement('p');
            support.className = 'wwm-login-support';
            support.textContent = '';
            inner.appendChild(support);
        }

        if (!inner.querySelector('.wwm-login-meta')) {
            const meta = document.createElement('div');
            meta.className = 'wwm-login-meta';
            meta.innerHTML = '';
            inner.appendChild(meta);
        }

        return true;
    }

    function installAppContract() {
        if (!window.App || window.App.__premiumReleaseV58Installed) return false;

        window.App.lazyModules.dashboard = `./pages/dashboard-v55.js?v=${ASSET_VERSION}`;
        window.App.lazyModules.relatorios = `./pages/relatorios-v55.js?v=${ASSET_VERSION}`;
        delete window.App._lazyLoaded.dashboard;
        delete window.App._lazyLoaded.relatorios;

        const originalUpdateBreadcrumb = window.App.updateBreadcrumb.bind(window.App);
        window.App.updateBreadcrumb = function updateBreadcrumbV58(pageId) {
            const isDashboard = pageId === 'dashboard' || pageId === 'visao-geral';
            document.body?.classList.toggle('wwm-dashboard-v58-active', isDashboard);
            document.body?.classList.remove('wwm-dashboard-active');
            const breadcrumb = document.getElementById('breadcrumb');
            const labels = {
                dashboard: 'Visão Geral',
                'visao-geral': 'Visão Geral',
                solicitacoes: 'Solicitações',
                'minhas-solicitacoes': 'Solicitações',
                'nova-solicitacao': 'Nova solicitação',
                aprovacoes: 'Aprovações',
                relatorios: 'Relatórios',
                pecas: 'Peças',
                tecnicos: 'Técnicos',
                fornecedores: 'Fornecedores',
                configuracoes: 'Sistema'
            };
            if (breadcrumb) breadcrumb.innerHTML = `<span>Portal de Solicitação de Peças WWM</span><i class="fas fa-chevron-right" aria-hidden="true"></i><strong>${labels[pageId] || pageId}</strong>`;
            if (!labels[pageId] && !isDashboard) originalUpdateBreadcrumb(pageId);
        };

        const originalShowApp = window.App.showApp.bind(window.App);
        window.App.showApp = function showAppV58() {
            originalShowApp();
            window.setTimeout(() => {
                if (typeof window.Auth?.renderMenu === 'function') {
                    window.Auth.renderMenu(window.App.currentPage || window.App.getDefaultPage());
                }
            }, 0);
        };

        window.App.__premiumReleaseV58Installed = true;
        return true;
    }

    function installNavigationContract() {
        if (!window.Auth || !window.NavigationMaster) return false;
        window.Auth.renderMenu = function renderMenuV58(activeId) {
            window.NavigationMaster.render(this, window.NavigationMaster.resolveRoute(activeId).pageId);
        };
        window.Auth.canAccessRoute = function canAccessRouteV58(routeId) {
            return window.NavigationMaster.canAccessRoute(this, routeId);
        };
        window.Auth.getMenuItems = function getMenuItemsV58() {
            return window.NavigationMaster.getMenuItems(this.getRole());
        };
        return true;
    }

    function markRelease() {
        document.documentElement.dataset.uiRelease = RELEASE_VERSION;
        document.body?.classList.add('premium-release-v55', 'wwm-reference-release-v56', 'wwm-reference-release-v58');
        document.body?.classList.remove('wwm-reference-release-v57');
        window.PREMIUM_RELEASE_VERSION = RELEASE_VERSION;
    }

    function install() {
        markRelease();
        installWwmLoginReference();
        installAnalyticsContract();
        installNavigationContract();
        installAppContract();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
    else install();

    let attempts = 0;
    const timer = window.setInterval(() => {
        attempts += 1;
        install();
        if ((window.App && window.Auth && window.NavigationMaster && (window.AnalyticsHelper || window.AnalyticsEngine)) || attempts >= 40) {
            window.clearInterval(timer);
        }
    }, 100);
})();
