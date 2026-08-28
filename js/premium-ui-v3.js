(function () {
    'use strict';

    let scheduled = false;
    let observerReady = false;

    function getCurrentPage() {
        return (typeof App !== 'undefined' && App.currentPage)
            ? String(App.currentPage)
            : String(document.body.dataset.currentPage || '');
    }

    function markBody() {
        document.body.classList.add('premium-ui-v3-enabled');
        const page = getCurrentPage();
        if (page) {
            document.body.dataset.currentPage = page;
        }
    }

    function improveFilterPanels() {
        document.querySelectorAll('details.filter-panel').forEach((panel) => {
            panel.classList.add('premium-filter-panel');
            const body = panel.querySelector('.filter-panel-body');
            if (body) body.classList.add('premium-filter-grid');
        });
    }

    function labelActionButton(button) {
        const title = button.getAttribute('title') || button.getAttribute('aria-label') || '';
        const normalized = title.trim();
        if (!normalized) return;
        button.setAttribute('aria-label', normalized);
    }

    function moveButtonsIntoMenu(actions, buttons) {
        if (!buttons.length || actions.querySelector('.premium-row-menu')) return;

        const details = document.createElement('details');
        details.className = 'premium-row-menu';

        const summary = document.createElement('summary');
        summary.setAttribute('aria-label', 'Mais ações');
        summary.setAttribute('title', 'Mais ações');
        summary.innerHTML = '<i class="fas fa-ellipsis-h" aria-hidden="true"></i>';

        const popover = document.createElement('div');
        popover.className = 'premium-row-menu-popover';

        buttons.forEach((button) => {
            labelActionButton(button);
            const clone = button;
            clone.classList.remove('btn-sm');
            const label = clone.getAttribute('title') || clone.getAttribute('aria-label') || 'Ação';
            const icon = clone.querySelector('i');
            const iconHtml = icon ? icon.outerHTML : '';
            clone.innerHTML = `${iconHtml}<span>${label}</span>`;
            popover.appendChild(clone);
        });

        details.appendChild(summary);
        details.appendChild(popover);
        actions.appendChild(details);
    }

    function compactSolicitationActions() {
        const page = getCurrentPage();
        if (!['solicitacoes', 'minhas-solicitacoes'].includes(page)) return;

        document.querySelectorAll('.table tbody .actions').forEach((actions) => {
            if (actions.dataset.premiumCompacted === 'true') return;
            const buttons = Array.from(actions.querySelectorAll(':scope > button.btn'));
            if (buttons.length <= 2) {
                buttons.forEach(labelActionButton);
                actions.dataset.premiumCompacted = 'true';
                return;
            }

            buttons.forEach(labelActionButton);
            const viewButton = buttons[0];
            const primaryButton = buttons.slice(1).find((button) => button.classList.contains('btn-success')) || null;
            const keep = new Set([viewButton, primaryButton].filter(Boolean));
            const overflow = buttons.filter((button) => !keep.has(button));
            moveButtonsIntoMenu(actions, overflow);
            actions.dataset.premiumCompacted = 'true';
        });
    }

    function improveApprovalSelection() {
        const page = getCurrentPage();
        if (page !== 'aprovacoes') return;

        const button = document.getElementById('batch-approve-btn');
        const count = document.getElementById('selected-count');
        if (!button || !count) return;

        const selected = Number.parseInt(count.textContent || '0', 10) || 0;
        button.classList.toggle('premium-selection-empty', selected === 0);
        button.setAttribute('aria-hidden', selected === 0 ? 'true' : 'false');
    }

    function improveTables() {
        document.querySelectorAll('.table-container').forEach((container) => {
            container.classList.add('premium-table-shell');
            const table = container.querySelector('table.table');
            if (!table) return;
            table.querySelectorAll('thead th').forEach((th) => th.setAttribute('scope', 'col'));
        });
    }

    function improveReportCharts() {
        if (getCurrentPage() !== 'relatorios') return;

        document.querySelectorAll('.charts-grid').forEach((grid) => {
            grid.classList.add('premium-report-grid');
        });

        document.querySelectorAll('.chart-container').forEach((container) => {
            container.classList.add('premium-report-chart');
        });
    }

    function closeOpenMenusOnOutsideClick(event) {
        if (event.target.closest('.premium-row-menu')) return;
        document.querySelectorAll('.premium-row-menu[open]').forEach((menu) => menu.removeAttribute('open'));
    }

    function enhance() {
        markBody();
        improveFilterPanels();
        improveTables();
        compactSolicitationActions();
        improveApprovalSelection();
        improveReportCharts();
    }

    function scheduleEnhance() {
        if (scheduled) return;
        scheduled = true;
        requestAnimationFrame(() => {
            scheduled = false;
            enhance();
        });
    }

    function patchLifecycle() {
        if (typeof App === 'undefined' || App.__premiumUiV3Patched) return;

        const originalRenderPage = App.renderPage.bind(App);
        const originalNavigate = App.navigate.bind(App);

        App.renderPage = async function (pageId, renderSequence) {
            const result = await originalRenderPage(pageId, renderSequence);
            document.body.dataset.currentPage = pageId;
            scheduleEnhance();
            return result;
        };

        App.navigate = async function (pageId) {
            const result = await originalNavigate(pageId);
            document.body.dataset.currentPage = pageId;
            scheduleEnhance();
            return result;
        };

        App.__premiumUiV3Patched = true;
    }

    function setupObserver() {
        if (observerReady) return;
        const content = document.getElementById('content-area');
        if (!content) return;

        observerReady = true;
        const observer = new MutationObserver(scheduleEnhance);
        observer.observe(content, { childList: true, subtree: true, characterData: true });
    }

    function init() {
        markBody();
        patchLifecycle();
        setupObserver();
        scheduleEnhance();
        document.addEventListener('click', closeOpenMenusOnOutsideClick);
        window.addEventListener('resize', scheduleEnhance);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
})();
