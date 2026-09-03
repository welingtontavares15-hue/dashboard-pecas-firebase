const STORAGE_KEY = 'premium_reports_division_filter_v1';
const MODE = Object.freeze({
    ALL: 'all',
    BOTH: 'both',
    FB: 'F&B',
    IN: 'IN',
    UNCLASSIFIED: 'unclassified'
});

function normalizeDivision(value) {
    const raw = String(value || '').trim().toUpperCase().replace(/\s+/g, '');
    if (['F&B', 'FB', 'F-E-B', 'F_E_B'].includes(raw)) return MODE.FB;
    return raw === MODE.IN ? MODE.IN : '';
}

function normalizeMode(value) {
    const raw = String(value || '').trim();
    return [MODE.ALL, MODE.BOTH, MODE.FB, MODE.IN, MODE.UNCLASSIFIED].includes(raw)
        ? raw
        : MODE.ALL;
}

function readMode() {
    try {
        return normalizeMode(window.sessionStorage?.getItem(STORAGE_KEY)
            || window.localStorage?.getItem(STORAGE_KEY)
            || MODE.ALL);
    } catch (_error) {
        return MODE.ALL;
    }
}

function writeMode(mode) {
    const safeMode = normalizeMode(mode);
    try {
        window.sessionStorage?.setItem(STORAGE_KEY, safeMode);
    } catch (_error) {
        try {
            window.localStorage?.setItem(STORAGE_KEY, safeMode);
        } catch (_ignored) { /* no-op */ }
    }
    return safeMode;
}

function matchesDivision(record, mode) {
    const division = normalizeDivision(record?.divisao);
    switch (normalizeMode(mode)) {
    case MODE.BOTH:
        return division === MODE.FB || division === MODE.IN;
    case MODE.FB:
        return division === MODE.FB;
    case MODE.IN:
        return division === MODE.IN;
    case MODE.UNCLASSIFIED:
        return !division;
    default:
        return true;
    }
}

function modeLabel(mode) {
    switch (normalizeMode(mode)) {
    case MODE.BOTH: return 'F&B + IN';
    case MODE.FB: return 'F&B';
    case MODE.IN: return 'IN';
    case MODE.UNCLASSIFIED: return 'Não classificado';
    default: return 'Todos';
    }
}

function renderDivisionControl(currentMode) {
    const mode = normalizeMode(currentMode);
    return `
        <div class="filter-group report-filter-field report-filter-field--division">
            <label>Divisão</label>
            <select id="report-divisao" class="form-control" aria-label="Filtrar custos por divisão">
                <option value="all" ${mode === MODE.ALL ? 'selected' : ''}>Todos</option>
                <option value="both" ${mode === MODE.BOTH ? 'selected' : ''}>F&amp;B + IN</option>
                <option value="F&amp;B" ${mode === MODE.FB ? 'selected' : ''}>F&amp;B</option>
                <option value="IN" ${mode === MODE.IN ? 'selected' : ''}>IN</option>
                <option value="unclassified" ${mode === MODE.UNCLASSIFIED ? 'selected' : ''}>Não classificado</option>
            </select>
        </div>
    `;
}

function insertDivisionChip(html, mode) {
    if (normalizeMode(mode) === MODE.ALL) return html;
    const chip = `
        <button type="button" class="filter-chip" onclick="Relatorios.removeFilterChip('divisao')">
            <span>Divisão: ${Utils.escapeHtml(modeLabel(mode))}</span>
            <i class="fas fa-times"></i>
        </button>
    `;
    if (!html) return `<div class="filter-chip-bar">${chip}</div>`;
    const closing = html.lastIndexOf('</div>');
    return closing >= 0 ? `${html.slice(0, closing)}${chip}${html.slice(closing)}` : `${html}${chip}`;
}

export function applyReportsDivisionFilter() {
    if (!window.Relatorios || Relatorios.__divisionFilterApplied) return;

    const baseGetReportData = Relatorios.getReportData.bind(Relatorios);
    const baseRenderCostFilters = Relatorios.renderCostFilters.bind(Relatorios);
    const baseApplyFilters = Relatorios.applyFilters.bind(Relatorios);
    const baseClearFilters = Relatorios.clearFilters.bind(Relatorios);
    const baseRenderActiveFilterChips = Relatorios.renderActiveFilterChips?.bind(Relatorios);
    const baseRemoveFilterChip = Relatorios.removeFilterChip?.bind(Relatorios);

    Relatorios._divisionFilter = readMode();

    Relatorios.getReportData = function getReportDataWithDivision() {
        const reportData = baseGetReportData();
        const mode = normalizeMode(this._divisionFilter || readMode());
        if (mode === MODE.ALL) return reportData;

        const records = (reportData?.dataset?.records || reportData?.solicitations || [])
            .filter((record) => matchesDivision(record, mode));
        const dataset = {
            ...(reportData?.dataset || {}),
            records,
            totalCount: records.length
        };
        const filterState = typeof this.buildFilterState === 'function' ? this.buildFilterState() : {};
        const allRecords = (DataManager.getSolicitations?.() || []).filter((record) => matchesDivision(record, mode));
        const analysis = AnalyticsHelper.computeMetrics(dataset, {
            moduleKey: 'relatorios',
            allRecords,
            costStatuses: Array.isArray(filterState?.statuses) && filterState.statuses.length > 0
                ? filterState.statuses
                : this.costStatuses
        });
        const monthlySummary = typeof this.buildMonthlyAverageSummary === 'function'
            ? this.buildMonthlyAverageSummary(records, filterState?.period || dataset.period)
            : reportData?.monthlySummary;

        return {
            ...reportData,
            dataset,
            analysis,
            solicitations: records,
            monthlySummary,
            summaryLabel: `Resumo atual: ${Utils.formatNumber(records.length)} solicitações filtradas · Divisão: ${modeLabel(mode)}.`
        };
    };

    Relatorios.renderCostFilters = function renderCostFiltersWithDivision() {
        const html = baseRenderCostFilters();
        const control = renderDivisionControl(this._divisionFilter || readMode());
        const marker = '<div class="filter-group report-filter-field premium-report-filter-actions">';
        if (html.includes(marker)) return html.replace(marker, `${control}${marker}`);
        return `${html}${control}`;
    };

    Relatorios.applyFilters = function applyFiltersWithDivision() {
        this._divisionFilter = writeMode(document.getElementById('report-divisao')?.value || this._divisionFilter || MODE.ALL);
        return baseApplyFilters();
    };

    Relatorios.clearFilters = function clearFiltersWithDivision() {
        this._divisionFilter = writeMode(MODE.ALL);
        return baseClearFilters();
    };

    if (baseRenderActiveFilterChips) {
        Relatorios.renderActiveFilterChips = function renderActiveFilterChipsWithDivision() {
            return insertDivisionChip(baseRenderActiveFilterChips(), this._divisionFilter || readMode());
        };
    }

    if (baseRemoveFilterChip) {
        Relatorios.removeFilterChip = function removeFilterChipWithDivision(key, value = '') {
            if (key === 'divisao') {
                this._divisionFilter = writeMode(MODE.ALL);
                this.render();
                return;
            }
            return baseRemoveFilterChip(key, value);
        };
    }

    Relatorios.__divisionFilterApplied = true;
}

export const ReportsDivisionFilter = Object.freeze({
    MODE,
    normalizeDivision,
    normalizeMode,
    matchesDivision,
    modeLabel
});
