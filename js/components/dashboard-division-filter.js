const STORAGE_KEY = 'dashboard_division_filter_v1';
const MODE = Object.freeze({ ALL: 'all', BOTH: 'both', FB: 'F&B', IN: 'IN', UNCLASSIFIED: 'unclassified' });

function normalizeDivision(value) {
    const raw = String(value || '').trim().toUpperCase().replace(/\s+/g, '');
    if (['F&B', 'FB', 'F-E-B', 'F_E_B'].includes(raw)) return MODE.FB;
    return raw === MODE.IN ? MODE.IN : '';
}

function normalizeMode(value) {
    const raw = String(value || '').trim();
    return [MODE.ALL, MODE.BOTH, MODE.FB, MODE.IN, MODE.UNCLASSIFIED].includes(raw) ? raw : MODE.ALL;
}

function readMode() {
    try {
        return normalizeMode(window.sessionStorage?.getItem(STORAGE_KEY) || window.localStorage?.getItem(STORAGE_KEY) || MODE.ALL);
    } catch (_error) {
        return MODE.ALL;
    }
}

function writeMode(mode) {
    const safeMode = normalizeMode(mode);
    try {
        window.sessionStorage?.setItem(STORAGE_KEY, safeMode);
    } catch (_error) {
        try { window.localStorage?.setItem(STORAGE_KEY, safeMode); } catch (_ignored) { /* no-op */ }
    }
    return safeMode;
}

function matches(record, mode) {
    const division = normalizeDivision(record?.divisao);
    switch (normalizeMode(mode)) {
    case MODE.BOTH: return division === MODE.FB || division === MODE.IN;
    case MODE.FB: return division === MODE.FB;
    case MODE.IN: return division === MODE.IN;
    case MODE.UNCLASSIFIED: return !division;
    default: return true;
    }
}

function injectControl() {
    const toolbar = document.querySelector('.v59-hero-toolbar');
    if (!toolbar || document.getElementById('v59-division')) return;

    const range = document.querySelector('.v59-period-control');
    const currentMode = normalizeMode(Dashboard._divisionFilter || readMode());
    const control = document.createElement('label');
    control.className = 'v59-period-control v59-division-control';
    control.innerHTML = `
        <span>Divisão</span>
        <i class="fas fa-layer-group" aria-hidden="true"></i>
        <select id="v59-division" aria-label="Filtrar dashboard por divisão">
            <option value="all" ${currentMode === MODE.ALL ? 'selected' : ''}>Todos</option>
            <option value="both" ${currentMode === MODE.BOTH ? 'selected' : ''}>F&amp;B + IN</option>
            <option value="F&amp;B" ${currentMode === MODE.FB ? 'selected' : ''}>F&amp;B</option>
            <option value="IN" ${currentMode === MODE.IN ? 'selected' : ''}>IN</option>
            <option value="unclassified" ${currentMode === MODE.UNCLASSIFIED ? 'selected' : ''}>Não classificado</option>
        </select>
    `;
    range?.insertAdjacentElement('afterend', control) || toolbar.prepend(control);
    control.querySelector('select')?.addEventListener('change', (event) => {
        Dashboard._divisionFilter = writeMode(event.target.value);
        Dashboard.render();
    });
}

export function applyDashboardDivisionFilter() {
    if (!window.Dashboard || Dashboard.__divisionFilterApplied || typeof Dashboard.render !== 'function') return;

    Dashboard._divisionFilter = readMode();
    const baseRender = Dashboard.render.bind(Dashboard);

    Dashboard.render = function renderWithDivisionFilter(...args) {
        const dataManager = window.DataManager;
        const originalGetSolicitations = dataManager?.getSolicitations;
        const mode = normalizeMode(this._divisionFilter || readMode());

        if (dataManager && typeof originalGetSolicitations === 'function' && mode !== MODE.ALL) {
            dataManager.getSolicitations = function getSolicitationsByDivision() {
                return originalGetSolicitations.call(dataManager).filter((record) => matches(record, mode));
            };
        }

        try {
            return baseRender(...args);
        } finally {
            if (dataManager && originalGetSolicitations) dataManager.getSolicitations = originalGetSolicitations;
            injectControl();
        }
    };

    Dashboard.__divisionFilterApplied = true;
}

export const DashboardDivisionFilter = Object.freeze({ MODE, normalizeDivision, normalizeMode, matches });
