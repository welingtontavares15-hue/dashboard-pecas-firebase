(function () {
    'use strict';

    const pageClasses = [
        'wwm-page-dashboard',
        'wwm-page-solicitacoes',
        'wwm-page-aprovacoes',
        'wwm-page-relatorios',
        'wwm-page-pecas',
        'wwm-page-tecnicos',
        'wwm-page-fornecedores',
        'wwm-page-sistema',
        'wwm-page-fornecedor',
        'wwm-page-perfil',
        'wwm-page-ajuda',
        'wwm-page-historico'
    ];
    let orderingTheme = false;

    function ensureSmartLayer() {
        let smartCss = document.querySelector('link[data-wwm-smart-layout]');
        if (!smartCss) {
            smartCss = document.createElement('link');
            smartCss.rel = 'stylesheet';
            smartCss.href = 'css/wwm-smart-layout.css?v=20260830a';
            smartCss.dataset.wwmSmartLayout = 'true';
            document.head.appendChild(smartCss);
        }

        if (!document.querySelector('script[data-wwm-smart-layout]')) {
            const smartScript = document.createElement('script');
            smartScript.src = 'js/wwm-smart-layout.js?v=20260830a';
            smartScript.defer = true;
            smartScript.dataset.wwmSmartLayout = 'true';
            document.body.appendChild(smartScript);
        }
    }

    function ensureDeviceLayoutLayer() {
        let deviceCss = document.querySelector('link[data-wwm-device-layout]');
        if (!deviceCss) {
            deviceCss = document.createElement('link');
            deviceCss.rel = 'stylesheet';
            deviceCss.href = 'css/desktop-mobile-premium.css?v=20260830a';
            deviceCss.dataset.wwmDeviceLayout = 'true';
            document.head.appendChild(deviceCss);
        }
    }

    function ensureVisualArchitectureLayer() {
        let architectureCss = document.querySelector('link[data-wwm-visual-architecture]');
        if (!architectureCss) {
            architectureCss = document.createElement('link');
            architectureCss.rel = 'stylesheet';
            architectureCss.href = 'css/visual-architecture-v72.css?v=20260830a';
            architectureCss.dataset.wwmVisualArchitecture = 'true';
            document.head.appendChild(architectureCss);
        }
    }

    function enhanceSolicitationLayout() {
        if (!document.body.classList.contains('wwm-page-solicitacoes')) {
            return;
        }

        const table = document.querySelector('#sol-table-container table.table');
        if (table) {
            const headers = Array.from(table.querySelectorAll('thead th')).map((cell) => cell.textContent.trim());
            table.querySelectorAll('tbody tr').forEach((row) => {
                Array.from(row.cells).forEach((cell, index) => {
                    if (headers[index]) {
                        cell.dataset.label = headers[index];
                    }
                });
            });
        }

        const filterPanel = document.getElementById('sol-filter-panel');
        if (filterPanel && !filterPanel.dataset.deviceLayoutReady) {
            const compact = window.matchMedia('(max-width: 767px)').matches;
            const hasActiveFilters = String(filterPanel.querySelector('summary')?.textContent || '').toLowerCase().includes('ativos');
            if (compact && !hasActiveFilters) {
                filterPanel.removeAttribute('open');
            }
            filterPanel.dataset.deviceLayoutReady = 'true';
        }
    }

    function keepReferenceThemeLast() {
        const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
        const referenceLink = links.find((item) => item.href.includes('/css/wwm-reference-theme.css'));
        const responsiveLink = links.find((item) => item.href.includes('/css/responsive-system.css'));
        const visualStandardLink = links.find((item) => item.href.includes('/css/wwm-visual-standard.css'));
        const smartLayoutLink = links.find((item) => item.href.includes('/css/wwm-smart-layout.css'));
        const premiumVisualLink = links.find((item) => item.href.includes('/css/visual-premium-v4.css'));
        const deviceLayoutLink = links.find((item) => item.href.includes('/css/desktop-mobile-premium.css'));
        const visualArchitectureLink = links.find((item) => item.href.includes('/css/visual-architecture-v72.css'));
        const expectedTail = [referenceLink, responsiveLink, visualStandardLink, smartLayoutLink, premiumVisualLink, deviceLayoutLink, visualArchitectureLink].filter(Boolean);
        const stylesheetTail = links.slice(-expectedTail.length);
        const alreadyOrdered = expectedTail.length >= 2
            && stylesheetTail.every((item, index) => item === expectedTail[index]);
        if (!referenceLink || !responsiveLink || alreadyOrdered || orderingTheme) {
            return;
        }
        orderingTheme = true;
        document.head.append(referenceLink, responsiveLink);
        if (visualStandardLink) {
            document.head.append(visualStandardLink);
        }
        if (smartLayoutLink) {
            document.head.append(smartLayoutLink);
        }
        if (premiumVisualLink) {
            document.head.append(premiumVisualLink);
        }
        if (deviceLayoutLink) {
            document.head.append(deviceLayoutLink);
        }
        if (visualArchitectureLink) {
            document.head.append(visualArchitectureLink);
        }
        window.requestAnimationFrame(() => {
            orderingTheme = false;
        });
    }

    function enforcePortalPalette() {
        document.body.classList.remove('light-mode');
        document.body.classList.add('dark-mode');
        document.body.dataset.theme = 'dark';
    }

    function getInitials(value) {
        const parts = String(value || 'WWM').trim().split(/\s+/).filter(Boolean);
        if (!parts.length) {
            return 'WW';
        }
        if (parts.length === 1) {
            return parts[0].slice(0, 2).toUpperCase();
        }
        return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }

    function syncProfile() {
        const source = document.getElementById('header-user-name');
        const target = document.getElementById('header-user-initials');
        const sidebarAvatar = document.querySelector('.sidebar-footer .user-avatar');
        const initials = getInitials(source?.textContent);
        if (target) {
            target.textContent = initials;
        }
        if (sidebarAvatar) {
            sidebarAvatar.innerHTML = `<span>${initials}</span>`;
        }
    }

    function markCurrentPage() {
        const page = String(window.App?.currentPage || 'dashboard')
            .replace('minhas-solicitacoes', 'solicitacoes')
            .replace('visao-geral', 'dashboard')
            .replace('configuracoes', 'sistema');
        document.body.classList.remove(...pageClasses);
        document.body.classList.add(`wwm-page-${page}`);
        document.body.dataset.currentPage = page;
        enforcePortalPalette();
        ensureSmartLayer();
        ensureDeviceLayoutLayer();
        ensureVisualArchitectureLayer();
        keepReferenceThemeLast();
        enhanceSolicitationLayout();
        syncProfile();
    }

    function enrichShell() {
        document.documentElement.setAttribute('data-ui-reference', 'wwm-2026');
        document.documentElement.setAttribute('data-visual-architecture', 'v72');
        document.body.classList.add('wwm-reference-theme');
        enforcePortalPalette();
        ensureSmartLayer();
        ensureDeviceLayoutLayer();
        ensureVisualArchitectureLayer();
        keepReferenceThemeLast();
        enhanceSolicitationLayout();
        document.querySelector('.global-search input')?.setAttribute('placeholder', 'Buscar peças, solicitações, fornecedores...');
        document.getElementById('notifications-toggle')?.setAttribute('aria-label', 'Abrir notificações');
        document.getElementById('sync-btn')?.setAttribute('aria-label', 'Atualizar dados');
        syncProfile();
        markCurrentPage();
    }

    function installAppVisualHook() {
        if (!window.App || window.App.__wwmReferenceUiInstalled) {
            return false;
        }
        const originalUpdateBreadcrumb = window.App.updateBreadcrumb.bind(window.App);
        window.App.updateBreadcrumb = function updateWwmReferenceBreadcrumb(pageId) {
            const result = originalUpdateBreadcrumb(pageId);
            window.requestAnimationFrame(markCurrentPage);
            return result;
        };
        window.App.__wwmReferenceUiInstalled = true;
        return true;
    }

    function installObservers() {
        const content = document.getElementById('content-area');
        const profileName = document.getElementById('header-user-name');
        if (content) {
            new MutationObserver(markCurrentPage).observe(content, { childList: true });
        }
        if (profileName) {
            new MutationObserver(syncProfile).observe(profileName, { childList: true, characterData: true, subtree: true });
        }
        new MutationObserver(keepReferenceThemeLast).observe(document.head, { childList: true });
        window.addEventListener('resize', () => window.requestAnimationFrame(enhanceSolicitationLayout));
    }

    function install() {
        enrichShell();
        installAppVisualHook();
        installObservers();
    }

    install();
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', install, { once: true });
    }

    let attempts = 0;
    const timer = window.setInterval(() => {
        attempts += 1;
        enrichShell();
        if (installAppVisualHook() || attempts >= 30) {
            window.clearInterval(timer);
        }
    }, 100);
})();