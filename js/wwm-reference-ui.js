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
        'wwm-page-sistema'
    ];
    let orderingTheme = false;

    function keepReferenceThemeLast() {
        const link = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
            .find((item) => item.href.includes('/css/wwm-reference-theme.css'));
        if (!link || document.head.lastElementChild === link || orderingTheme) {
            return;
        }
        orderingTheme = true;
        document.head.appendChild(link);
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
        keepReferenceThemeLast();
        syncProfile();
    }

    function enrichShell() {
        document.documentElement.setAttribute('data-ui-reference', 'wwm-2026');
        document.body.classList.add('wwm-reference-theme');
        enforcePortalPalette();
        keepReferenceThemeLast();
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
    }

    function install() {
        enrichShell();
        installAppVisualHook();
        installObservers();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', install, { once: true });
    } else {
        install();
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
