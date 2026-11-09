(function () {
    'use strict';

    let scheduled = false;
    let observerReady = false;

    function ensurePolishStyles() {
        if (document.documentElement.dataset.wwmStylesBundled === 'true' || document.querySelector('link[data-premium-ui-v3-polish]')) {
            return;
        }
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'css/premium-ui-v3-polish.css?v=20260828b';
        link.dataset.premiumUiV3Polish = 'true';
        document.head.appendChild(link);
    }

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
            if (body) {
                body.classList.add('premium-filter-grid');
            }
        });
    }

    function labelActionButton(button) {
        const title = button.getAttribute('title') || button.getAttribute('aria-label') || '';
        const normalized = title.trim();
        if (!normalized) {
            return;
        }
        button.setAttribute('aria-label', normalized);
    }

    function moveButtonsIntoMenu(actions, buttons) {
        if (!buttons.length || actions.querySelector('.premium-row-menu')) {
            return;
        }

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
        if (!['solicitacoes', 'minhas-solicitacoes'].includes(page)) {
            return;
        }

        document.querySelectorAll('.table tbody .actions').forEach((actions) => {
            if (actions.dataset.premiumCompacted === 'true') {
                return;
            }
            const buttons = Array.from(actions.querySelectorAll(':scope > button.btn'));
            const viewButton = buttons.find((button) => button.classList.contains('solicitation-view-action')) || buttons[0] || null;
            if (viewButton) {
                labelActionButton(viewButton);
                viewButton.querySelector(':scope > span')?.remove();
            }
            if (buttons.length <= 2) {
                buttons.forEach(labelActionButton);
                actions.dataset.premiumCompacted = 'true';
                return;
            }

            buttons.forEach(labelActionButton);
            const primaryButton = buttons.slice(1).find((button) => button.classList.contains('btn-success')) || null;
            const keep = new Set([viewButton, primaryButton].filter(Boolean));
            const overflow = buttons.filter((button) => !keep.has(button));
            moveButtonsIntoMenu(actions, overflow);
            actions.dataset.premiumCompacted = 'true';
        });
    }

    function improveApprovalSelection() {
        const page = getCurrentPage();
        if (page !== 'aprovacoes') {
            return;
        }

        const button = document.getElementById('batch-approve-btn');
        const count = document.getElementById('selected-count');
        if (!button || !count) {
            return;
        }

        const selected = Number.parseInt(count.textContent || '0', 10) || 0;
        button.classList.toggle('premium-selection-empty', selected === 0);
        button.setAttribute('aria-hidden', selected === 0 ? 'true' : 'false');
    }

    function improveTables() {
        document.querySelectorAll('.table-container').forEach((container) => {
            container.classList.add('premium-table-shell');
            const table = container.querySelector('table.table');
            if (!table) {
                return;
            }
            table.querySelectorAll('thead th').forEach((th) => th.setAttribute('scope', 'col'));
        });
    }

    function polishReportChartOrientation() {
        if (getCurrentPage() !== 'relatorios' || typeof Relatorios === 'undefined') {
            return;
        }
        ['reportOverviewTechChart', 'reportTechnicianCostChart'].forEach((id) => {
            const chart = Relatorios.charts?.[id];
            if (!chart || chart.options?.indexAxis === 'y') {
                return;
            }
            chart.options.indexAxis = 'y';
            if (chart.options.scales?.x) {
                chart.options.scales.x.beginAtZero = true;
            }
            if (chart.options.scales?.y?.ticks) {
                chart.options.scales.y.ticks.maxRotation = 0;
                chart.options.scales.y.ticks.minRotation = 0;
                chart.options.scales.y.ticks.autoSkip = false;
            }
            chart.update('none');
        });
    }

    function improveReportCharts() {
        if (getCurrentPage() !== 'relatorios') {
            return;
        }

        document.querySelectorAll('.charts-grid').forEach((grid) => {
            grid.classList.add('premium-report-grid');
        });

        document.querySelectorAll('.chart-container').forEach((container) => {
            container.classList.add('premium-report-chart');
        });

        setTimeout(polishReportChartOrientation, 90);
    }

    // O menu "…" das linhas fica dentro da tabela e do cartão, que recortam o
    // que passa das bordas: nas últimas linhas as opções ficavam cortadas.
    // Enquanto aberto, o menu é levado para o <body> e posicionado junto ao
    // botão; ao fechar, volta para o lugar de origem.
    const floatingMenus = new Map();

    function restoreRowMenu(details) {
        const popover = floatingMenus.get(details);
        if (!popover) {
            return;
        }
        floatingMenus.delete(details);
        popover.classList.remove('is-floating');
        popover.removeAttribute('style');
        if (details.isConnected) {
            details.appendChild(popover);
        } else {
            popover.remove();
        }
    }

    function placeRowMenu(details) {
        const popover = details.querySelector('.premium-row-menu-popover');
        const summary = details.querySelector('summary');
        if (!popover || !summary) {
            return;
        }
        floatingMenus.set(details, popover);
        document.body.appendChild(popover);
        popover.classList.add('is-floating');
        const anchor = summary.getBoundingClientRect();
        const box = popover.getBoundingClientRect();
        const margin = 8;
        let left = anchor.right - box.width;
        left = Math.max(margin, Math.min(left, window.innerWidth - box.width - margin));
        let top = anchor.bottom + 6;
        if (top + box.height > window.innerHeight - margin) {
            top = Math.max(margin, anchor.top - box.height - 6);
        }
        popover.style.left = `${Math.round(left)}px`;
        popover.style.top = `${Math.round(top)}px`;
        details.dataset.menuAnchor = `${Math.round(anchor.left)},${Math.round(anchor.top)}`;
    }

    function closeMenus(except) {
        document.querySelectorAll('details.premium-row-menu[open], details.action-menu[open]').forEach((menu) => {
            if (menu !== except) {
                menu.removeAttribute('open');
            }
        });
        Array.from(floatingMenus.keys()).forEach((menu) => {
            if (menu !== except) {
                restoreRowMenu(menu);
            }
        });
    }

    function handleMenuToggle(event) {
        const details = event.target;
        if (!(details instanceof HTMLDetailsElement) || !details.matches('.premium-row-menu, .action-menu')) {
            return;
        }
        if (!details.open) {
            restoreRowMenu(details);
            return;
        }
        closeMenus(details);
        if (details.matches('.premium-row-menu')) {
            placeRowMenu(details);
        }
    }

    function closeMenusOnScroll(event) {
        if (event.target instanceof Element && event.target.closest('.premium-row-menu-popover, .action-menu-dropdown')) {
            return;
        }
        // Fecha quando o botão saiu do lugar (o menu é fixo na tela) ou sumiu.
        Array.from(floatingMenus.keys()).forEach((menu) => {
            const summary = menu.querySelector('summary');
            const [x, y] = String(menu.dataset.menuAnchor || '').split(',').map(Number);
            const now = menu.isConnected ? summary?.getBoundingClientRect() : null;
            if (!now || !Number.isFinite(x) || Math.abs(now.left - x) > 6 || Math.abs(now.top - y) > 6) {
                menu.removeAttribute('open');
                restoreRowMenu(menu);
            }
        });
    }

    function closeOpenMenusOnOutsideClick(event) {
        const target = event.target instanceof Element ? event.target : null;
        const insideMenu = target?.closest('.premium-row-menu, .action-menu, .premium-row-menu-popover');
        // Dentro do menu só fecha ao escolher uma opção.
        if (insideMenu && !target.closest('.premium-row-menu-popover .btn, .action-menu-item')) {
            return;
        }
        closeMenus(null);
    }

    function enhance() {
        // Lista re-renderizada com um menu aberto: remove o menu órfão.
        Array.from(floatingMenus.keys()).forEach((menu) => {
            if (!menu.isConnected) {
                restoreRowMenu(menu);
            }
        });
        markBody();
        improveFilterPanels();
        improveTables();
        compactSolicitationActions();
        improveApprovalSelection();
        improveReportCharts();
    }

    function scheduleEnhance() {
        if (scheduled) {
            return;
        }
        scheduled = true;
        requestAnimationFrame(() => {
            scheduled = false;
            enhance();
        });
    }

    function patchLifecycle() {
        if (typeof App === 'undefined' || App.__premiumUiV3Patched) {
            return;
        }

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
        if (observerReady) {
            return;
        }
        const content = document.getElementById('content-area');
        if (!content) {
            return;
        }

        observerReady = true;
        const observer = new MutationObserver(scheduleEnhance);
        observer.observe(content, { childList: true, subtree: true, characterData: true });
    }

    function init() {
        ensurePolishStyles();
        markBody();
        patchLifecycle();
        setupObserver();
        scheduleEnhance();
        document.addEventListener('click', closeOpenMenusOnOutsideClick);
        // "toggle" não borbulha: captura no documento.
        document.addEventListener('toggle', handleMenuToggle, true);
        window.addEventListener('scroll', closeMenusOnScroll, true);
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                closeMenus(null);
            }
        });
        window.addEventListener('resize', scheduleEnhance);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
})();
