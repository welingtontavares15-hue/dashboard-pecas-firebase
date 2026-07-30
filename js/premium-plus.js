(function () {
    const STORAGE_KEY_SIDEBAR = 'premiumPlus.sidebarCollapsed';

    function setBodyReady() {
        document.body.classList.add('premium-plus-enabled');
    }

    function ensureSystemUiMaster() {
        if (document.querySelector('link[data-system-ui-master]')) {
            return;
        }

        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'css/system-ui-master.css?v=20260729a';
        link.dataset.systemUiMaster = 'true';
        document.head.appendChild(link);
    }

    function getOnlineLabel() {
        if (typeof navigator !== 'undefined' && navigator.onLine === false) {
            return { label: 'Offline', className: 'offline' };
        }

        if (typeof DataManager !== 'undefined' && typeof DataManager.isCloudReady === 'function') {
            return DataManager.isCloudReady()
                ? { label: 'Sincronizado', className: '' }
                : { label: 'Conectando', className: 'syncing' };
        }

        return { label: 'Online', className: '' };
    }

    function ensureSystemStatus() {
        const controls = document.querySelector('.header-controls');
        if (!controls || document.getElementById('premium-system-status')) {
            return;
        }

        const status = document.createElement('div');
        status.id = 'premium-system-status';
        status.className = 'premium-system-status';
        status.setAttribute('aria-live', 'polite');
        controls.insertBefore(status, controls.firstChild);
        updateSystemStatus();
    }

    function updateSystemStatus() {
        const status = document.getElementById('premium-system-status');
        if (!status) {
            return;
        }

        const state = getOnlineLabel();
        status.textContent = state.label;
        status.classList.toggle('offline', state.className === 'offline');
        status.classList.toggle('syncing', state.className === 'syncing');
    }

    function bindGlobalSearchShortcut() {
        if (document.documentElement.dataset.premiumSearchBound === 'true') {
            return;
        }

        document.documentElement.dataset.premiumSearchBound = 'true';
        document.addEventListener('keydown', (event) => {
            const isShortcut = (event.ctrlKey || event.metaKey) && String(event.key || '').toLowerCase() === 'k';
            if (!isShortcut) {
                return;
            }

            const input = document.getElementById('global-search-input');
            if (!input || input.offsetParent === null) {
                return;
            }

            event.preventDefault();
            input.focus();
            input.select();
            input.closest('.global-search')?.classList.add('premium-focus-ring');
            setTimeout(() => input.closest('.global-search')?.classList.remove('premium-focus-ring'), 900);
        });
    }

    function bindSidebarPersistence() {
        if (document.documentElement.dataset.premiumSidebarBound === 'true') {
            return;
        }

        document.documentElement.dataset.premiumSidebarBound = 'true';
        const sidebar = document.getElementById('sidebar');
        if (!sidebar) {
            return;
        }

        if (localStorage.getItem(STORAGE_KEY_SIDEBAR) === 'true' && window.innerWidth > 992) {
            sidebar.classList.add('collapsed');
        }

        const toggle = document.getElementById('sidebar-toggle');
        if (toggle) {
            toggle.addEventListener('click', () => {
                setTimeout(() => {
                    if (window.innerWidth > 992) {
                        localStorage.setItem(STORAGE_KEY_SIDEBAR, sidebar.classList.contains('collapsed') ? 'true' : 'false');
                    }
                }, 0);
            });
        }
    }

    function markCurrentPage() {
        const page = (typeof App !== 'undefined' && App.currentPage) ? App.currentPage : 'login';
        document.body.dataset.currentPage = page;
    }

    function loadNavigationMaster() {
        if (window.NavigationMaster || document.querySelector('script[data-navigation-master]')) {
            return;
        }

        const script = document.createElement('script');
        script.src = 'js/navigation-master.js?v=20260729a';
        script.async = false;
        script.dataset.navigationMaster = 'true';
        script.addEventListener('load', () => {
            if (typeof Auth !== 'undefined' && typeof Auth.renderMenu === 'function') {
                const activePage = (typeof App !== 'undefined' && App.currentPage)
                    ? App.currentPage
                    : (typeof App !== 'undefined' && typeof App.getDefaultPage === 'function' ? App.getDefaultPage() : 'dashboard');
                Auth.renderMenu(activePage);
            }
        }, { once: true });
        document.head.appendChild(script);
    }

    function enhanceLifecycle() {
        if (typeof App === 'undefined' || App.__premiumPlusPatched) {
            return;
        }

        const originalShowApp = App.showApp.bind(App);
        const originalRenderPage = App.renderPage.bind(App);
        const originalSyncData = App.syncData ? App.syncData.bind(App) : null;

        App.showApp = function () {
            originalShowApp();
            setTimeout(() => {
                ensureSystemUiMaster();
                loadNavigationMaster();
                ensureSystemStatus();
                updateSystemStatus();
                bindSidebarPersistence();
                markCurrentPage();
            }, 0);
        };

        App.renderPage = async function (pageId, renderSequence) {
            await originalRenderPage(pageId, renderSequence);
            ensureSystemUiMaster();
            markCurrentPage();
            ensureSystemStatus();
            updateSystemStatus();
        };

        if (originalSyncData) {
            App.syncData = async function () {
                const status = document.getElementById('premium-system-status');
                status?.classList.add('syncing');
                if (status) {
                    status.textContent = 'Sincronizando';
                }
                try {
                    return await originalSyncData();
                } finally {
                    setTimeout(updateSystemStatus, 400);
                }
            };
        }

        App.__premiumPlusPatched = true;
    }

    function init() {
        setBodyReady();
        ensureSystemUiMaster();
        loadNavigationMaster();
        bindGlobalSearchShortcut();
        enhanceLifecycle();
        ensureSystemStatus();
        updateSystemStatus();
        bindSidebarPersistence();
        markCurrentPage();

        window.addEventListener('online', updateSystemStatus);
        window.addEventListener('offline', updateSystemStatus);
        window.addEventListener('data:updated', () => setTimeout(updateSystemStatus, 120));
        setInterval(updateSystemStatus, 15000);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
})();