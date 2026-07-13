(function () {
    function setDrawerState(open) {
        const sidebar = document.getElementById('sidebar');
        const backdrop = document.getElementById('sidebar-backdrop');
        const menuButtons = [
            document.getElementById('mobile-menu-btn'),
            document.getElementById('sidebar-toggle')
        ].filter(Boolean);

        if (!sidebar) return;
        sidebar.classList.remove('collapsed');
        sidebar.classList.toggle('active', !!open);
        backdrop?.classList.toggle('active', !!open);
        document.body.classList.toggle('sidebar-open', !!open);
        menuButtons.forEach((button) => button.setAttribute('aria-expanded', open ? 'true' : 'false'));
    }

    function init() {
        document.body.classList.add('focus-ui');

        if (typeof App === 'undefined' || App.__focusUiPatched) return;

        App.toggleSidebar = function toggleFocusMenu(forceState = null) {
            const sidebar = document.getElementById('sidebar');
            const shouldOpen = forceState === null
                ? !sidebar?.classList.contains('active')
                : !!forceState;
            setDrawerState(shouldOpen);
        };

        const originalNavigate = App.navigate.bind(App);
        App.navigate = async function navigateFocus(pageId) {
            setDrawerState(false);
            return originalNavigate(pageId);
        };

        document.addEventListener('click', (event) => {
            const sidebar = document.getElementById('sidebar');
            const menuButton = document.getElementById('mobile-menu-btn');
            if (!sidebar?.classList.contains('active')) return;
            if (sidebar.contains(event.target) || menuButton?.contains(event.target)) return;
            setDrawerState(false);
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') setDrawerState(false);
        });

        window.addEventListener('resize', () => setDrawerState(false));
        App.__focusUiPatched = true;
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
})();
