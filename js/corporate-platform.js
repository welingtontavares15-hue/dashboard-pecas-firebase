(function () {
    const PAGE_CONFIG = {
        dashboard: { icon: 'fa-chart-pie', kicker: 'Visão executiva' },
        solicitacoes: { icon: 'fa-clipboard-list', kicker: 'Fluxo operacional' },
        'minhas-solicitacoes': { icon: 'fa-clipboard-list', kicker: 'Fluxo operacional' },
        'nova-solicitacao': { icon: 'fa-plus-circle', kicker: 'Abertura de chamado' },
        aprovacoes: { icon: 'fa-check-double', kicker: 'Controle de aprovação' },
        pecas: { icon: 'fa-cogs', kicker: 'Catálogo operacional' },
        catalogo: { icon: 'fa-cogs', kicker: 'Catálogo operacional' },
        tecnicos: { icon: 'fa-users', kicker: 'Equipe técnica' },
        fornecedores: { icon: 'fa-truck', kicker: 'Rede de fornecimento' },
        relatorios: { icon: 'fa-chart-line', kicker: 'Inteligência operacional' },
        fornecedor: { icon: 'fa-truck-loading', kicker: 'Atendimento ao fornecedor' },
        configuracoes: { icon: 'fa-cog', kicker: 'Parâmetros da plataforma' },
        perfil: { icon: 'fa-user-circle', kicker: 'Perfil de acesso' }
    };

    let enhancementScheduled = false;
    let observersReady = false;

    function forceLoginViewportCenter() {
        const loginScreen = document.getElementById('login-screen');
        const loginCard = loginScreen?.querySelector('.login-card');

        if (!loginScreen || !loginCard || loginScreen.classList.contains('hidden')) {
            return;
        }

        const screenStyles = {
            position: 'fixed',
            inset: '0',
            width: '100vw',
            height: '100dvh',
            minHeight: '100dvh',
            margin: '0',
            padding: '0',
            overflow: 'hidden'
        };

        Object.entries(screenStyles).forEach(([property, value]) => {
            const cssProperty = property.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
            loginScreen.style.setProperty(cssProperty, value, 'important');
        });

        const cardStyles = {
            position: 'fixed',
            top: '50%',
            left: '50%',
            right: 'auto',
            bottom: 'auto',
            width: 'min(calc(100vw - 32px), 440px)',
            maxHeight: 'calc(100dvh - 32px)',
            margin: '0',
            padding: '0',
            overflowX: 'hidden',
            overflowY: 'auto',
            translate: 'none',
            transform: 'translate(-50%, -50%)'
        };

        Object.entries(cardStyles).forEach(([property, value]) => {
            const cssProperty = property.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
            loginCard.style.setProperty(cssProperty, value, 'important');
        });
    }

    function currentPage() {
        if (typeof App !== 'undefined' && App.currentPage) {
            return App.currentPage;
        }
        return document.body.dataset.currentPage || 'dashboard';
    }

    function getConfig(pageId = currentPage()) {
        return PAGE_CONFIG[pageId] || { icon: 'fa-layer-group', kicker: 'Gestão corporativa' };
    }

    function enhanceNavigation() {
        document.querySelectorAll('.nav-item').forEach((item) => {
            const label = item.querySelector('span')?.textContent?.trim() || item.dataset.page || '';
            item.setAttribute('title', label);
            item.setAttribute('aria-current', item.classList.contains('active') ? 'page' : 'false');
        });
    }

    function enhancePageHeader() {
        const content = document.getElementById('content-area');
        if (!content) {
            return;
        }

        const pageId = currentPage();
        const config = getConfig(pageId);
        document.body.dataset.corporatePage = pageId;
        content.dataset.corporatePage = pageId;

        const header = content.querySelector('.page-header, .dashboard-header-compact, .reports-header-compact, .supplier-header');
        if (!header || header.dataset.corporateEnhanced === 'true') {
            return;
        }

        const heading = header.querySelector('h2');
        if (!heading) {
            return;
        }

        header.dataset.corporateEnhanced = 'true';
        header.classList.add('corporate-page-header');

        const titleBlock = document.createElement('div');
        titleBlock.className = 'corporate-page-title-block';

        const kicker = document.createElement('span');
        kicker.className = 'corporate-page-kicker';
        kicker.textContent = config.kicker;

        let headingShell = heading.parentElement;
        while (headingShell && headingShell.parentElement !== header) {
            headingShell = headingShell.parentElement;
        }

        const referenceNode = headingShell || heading;
        header.insertBefore(titleBlock, referenceNode);
        titleBlock.appendChild(kicker);
        titleBlock.appendChild(heading);

        Array.from(headingShell?.children || header.children).forEach((child) => {
            if (child !== titleBlock && child.tagName === 'P') {
                titleBlock.appendChild(child);
            }
        });

        if (headingShell && headingShell !== titleBlock && !headingShell.textContent.trim() && headingShell.children.length === 0) {
            headingShell.remove();
        }

        const actionNodes = Array.from(header.children).filter((child) => child !== titleBlock);
        if (actionNodes.length > 0) {
            const actionWrap = document.createElement('div');
            actionWrap.className = 'corporate-page-actions';
            header.appendChild(actionWrap);
            actionNodes.forEach((node) => actionWrap.appendChild(node));
        }
    }

    function enhanceFilters() {
        document.querySelectorAll('.filter-panel, .filters-bar, .report-filters-modern, .dashboard-filters-compact, .supplier-filters-bar').forEach((panel) => {
            panel.classList.add('corporate-filter-surface');
        });

        document.querySelectorAll('.filter-panel-toggle').forEach((summary) => {
            if (summary.dataset.corporateIcon === 'true') {
                return;
            }

            const icon = document.createElement('i');
            icon.className = 'fas fa-sliders-h';
            summary.insertBefore(icon, summary.firstChild);
            summary.dataset.corporateIcon = 'true';
        });
    }

    function cleanLabel(value) {
        return String(value || '')
            .replace(/\s+/g, ' ')
            .replace(/[▲▼↕]/g, '')
            .trim() || 'Campo';
    }

    function enhanceTables() {
        document.querySelectorAll('.table-container').forEach((container) => {
            container.classList.add('corporate-grid-shell');
            const table = container.querySelector('table.table');
            if (!table) {
                return;
            }

            container.classList.add('corporate-adaptive-table');
            table.classList.add('corporate-data-grid');

            const headers = Array.from(table.querySelectorAll('thead th')).map((header) => {
                header.setAttribute('scope', 'col');
                return cleanLabel(header.textContent);
            });

            table.querySelectorAll('tbody tr').forEach((row) => {
                Array.from(row.children).forEach((cell, index) => {
                    if (!cell.hasAttribute('data-label')) {
                        cell.setAttribute('data-label', headers[index] || 'Campo');
                    }
                });
            });
        });
    }

    function enhanceCards() {
        document.querySelectorAll('.kpi-card, .metric-card, .report-summary-card, .supplier-summary-card').forEach((card) => {
            card.classList.add('corporate-stat-card');
        });

        document.querySelectorAll('.card, .dashboard-panel-card, .report-panel-card, .dashboard-chart-card, .report-chart-card').forEach((card) => {
            card.classList.add('corporate-surface');
        });
    }

    function enhanceFormsAndActions() {
        document.querySelectorAll('.btn-group, .page-actions, .actions, .modal-footer').forEach((group) => {
            group.classList.add('corporate-action-row');
        });

        document.querySelectorAll('.form-row').forEach((row) => {
            row.classList.add('corporate-form-row');
        });

        document.querySelectorAll('.modal-content').forEach((modal) => {
            modal.classList.add('corporate-modal');
        });
    }

    function enhanceAll() {
        document.body.classList.add('corporate-platform-enabled');
        forceLoginViewportCenter();
        enhanceNavigation();
        enhancePageHeader();
        enhanceFilters();
        enhanceTables();
        enhanceCards();
        enhanceFormsAndActions();
    }

    function scheduleEnhancement() {
        if (enhancementScheduled) {
            return;
        }

        enhancementScheduled = true;
        requestAnimationFrame(() => {
            enhancementScheduled = false;
            enhanceAll();
        });
    }

    function patchLifecycle() {
        if (typeof App === 'undefined' || App.__corporatePlatformPatched) {
            return;
        }

        const originalShowApp = App.showApp.bind(App);
        const originalRenderPage = App.renderPage.bind(App);
        const originalNavigate = App.navigate.bind(App);

        App.showApp = function () {
            const result = originalShowApp();
            setTimeout(scheduleEnhancement, 0);
            return result;
        };

        App.renderPage = async function (pageId, renderSequence) {
            const result = await originalRenderPage(pageId, renderSequence);
            scheduleEnhancement();
            return result;
        };

        App.navigate = async function (pageId) {
            const result = await originalNavigate(pageId);
            scheduleEnhancement();
            return result;
        };

        App.__corporatePlatformPatched = true;
    }

    function setupObservers() {
        if (observersReady) {
            return;
        }

        observersReady = true;
        const targets = [
            document.getElementById('content-area'),
            document.getElementById('modal-container'),
            document.getElementById('sidebar-nav')
        ].filter(Boolean);

        targets.forEach((target) => {
            const observer = new MutationObserver(scheduleEnhancement);
            observer.observe(target, {
                childList: true,
                subtree: true
            });
        });

        const loginScreen = document.getElementById('login-screen');
        if (loginScreen) {
            const loginObserver = new MutationObserver(() => {
                if (!loginScreen.classList.contains('hidden')) {
                    requestAnimationFrame(forceLoginViewportCenter);
                }
            });
            loginObserver.observe(loginScreen, {
                attributes: true,
                attributeFilter: ['class']
            });
        }
    }

    function init() {
        document.body.classList.add('corporate-platform-enabled');
        forceLoginViewportCenter();
        patchLifecycle();
        setupObservers();
        scheduleEnhancement();
        window.addEventListener('resize', forceLoginViewportCenter);
        window.addEventListener('resize', scheduleEnhancement);
        window.CorporatePlatform = {
            enhance: scheduleEnhancement,
            centerLogin: forceLoginViewportCenter
        };
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
})();