export function applyDashboardStability() {
    if (!window.Dashboard || Dashboard.__premiumStabilityApplied) return;

    Dashboard.__premiumStabilityApplied = true;
    let refreshTimer = null;

    const scheduleRefresh = () => {
        const current = String(window.App?.currentPage || document.body.dataset.currentPage || '');
        if (!['dashboard', 'visao-geral'].includes(current)) return;
        clearTimeout(refreshTimer);
        refreshTimer = setTimeout(() => {
            if (typeof Dashboard.render === 'function') Dashboard.render();
        }, 120);
    };

    window.addEventListener('data:updated', scheduleRefresh);
    window.addEventListener('storage:ready', scheduleRefresh);

    setTimeout(() => {
        const rows = window.DataManager?.getSolicitations?.() || [];
        if (rows.length > 0) scheduleRefresh();
    }, 500);
}
