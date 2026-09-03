(function (root) {
    'use strict';

    const STORAGE_KEY = 'solicitacoes_division_filter_v1';
    const MODE = Object.freeze({ ALL: 'all', BOTH: 'both', FB: 'F&B', IN: 'IN', UNCLASSIFIED: 'unclassified' });

    const normalizeDivision = (value) => {
        const raw = String(value || '').trim().toUpperCase().replace(/\s+/g, '');
        if (['F&B', 'FB', 'F-E-B', 'F_E_B'].includes(raw)) return MODE.FB;
        return raw === MODE.IN ? MODE.IN : '';
    };

    const normalizeMode = (value) => {
        const raw = String(value || '').trim();
        return [MODE.ALL, MODE.BOTH, MODE.FB, MODE.IN, MODE.UNCLASSIFIED].includes(raw) ? raw : MODE.ALL;
    };

    function readMode() {
        try {
            return normalizeMode(root.sessionStorage?.getItem(STORAGE_KEY) || root.localStorage?.getItem(STORAGE_KEY) || MODE.ALL);
        } catch (_error) {
            return MODE.ALL;
        }
    }

    function writeMode(mode) {
        const safeMode = normalizeMode(mode);
        try {
            root.sessionStorage?.setItem(STORAGE_KEY, safeMode);
        } catch (_error) {
            try { root.localStorage?.setItem(STORAGE_KEY, safeMode); } catch (_ignored) { /* no-op */ }
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

    function label(mode) {
        switch (normalizeMode(mode)) {
        case MODE.BOTH: return 'F&B + IN';
        case MODE.FB: return 'F&B';
        case MODE.IN: return 'IN';
        case MODE.UNCLASSIFIED: return 'Não classificado';
        default: return 'Todas';
        }
    }

    function injectControl(s) {
        const bar = root.document?.querySelector('#sol-filter-panel .filters-bar');
        if (!bar || root.document.getElementById('sol-divisao-filter')) return;

        const group = root.document.createElement('div');
        group.className = 'filter-group';
        const mode = normalizeMode(s._divisionFilter || readMode());
        group.innerHTML = `
            <label for="sol-divisao-filter">Divisão:</label>
            <select id="sol-divisao-filter" class="form-control" aria-label="Filtrar solicitações por divisão">
                <option value="all" ${mode === MODE.ALL ? 'selected' : ''}>Todas</option>
                <option value="both" ${mode === MODE.BOTH ? 'selected' : ''}>F&amp;B + IN</option>
                <option value="F&amp;B" ${mode === MODE.FB ? 'selected' : ''}>F&amp;B</option>
                <option value="IN" ${mode === MODE.IN ? 'selected' : ''}>IN</option>
                <option value="unclassified" ${mode === MODE.UNCLASSIFIED ? 'selected' : ''}>Não classificado</option>
            </select>
        `;

        const clearButton = bar.querySelector('button.btn');
        clearButton ? bar.insertBefore(group, clearButton) : bar.appendChild(group);
        group.querySelector('select')?.addEventListener('change', (event) => {
            s._divisionFilter = writeMode(event.target.value);
            s.currentPage = 1;
            s.refreshTable?.();
        });
    }

    function patch() {
        const s = root.Solicitacoes;
        if (!s || s.__divisionListFilterPatched) return false;

        const baseRender = s.render.bind(s);
        const baseGetFiltered = s.getFilteredSolicitations.bind(s);
        const baseClearFilters = s.clearFilters.bind(s);
        const baseHasActiveFilters = s.hasActiveFilters?.bind(s);
        const baseRenderActiveFilterChips = s.renderActiveFilterChips?.bind(s);

        s._divisionFilter = readMode();

        s.getFilteredSolicitations = function getFilteredSolicitationsByDivision() {
            const rows = baseGetFiltered();
            const mode = normalizeMode(this._divisionFilter || readMode());
            return mode === MODE.ALL ? rows : rows.filter((record) => matches(record, mode));
        };

        s.render = function renderWithDivisionFilter() {
            const result = baseRender();
            injectControl(this);
            return result;
        };

        s.clearFilters = function clearFiltersWithDivision() {
            this._divisionFilter = writeMode(MODE.ALL);
            return baseClearFilters();
        };

        if (baseHasActiveFilters) {
            s.hasActiveFilters = function hasActiveFiltersWithDivision() {
                return baseHasActiveFilters() || normalizeMode(this._divisionFilter || readMode()) !== MODE.ALL;
            };
        }

        if (baseRenderActiveFilterChips) {
            s.renderActiveFilterChips = function renderActiveFilterChipsWithDivision() {
                const html = baseRenderActiveFilterChips();
                const mode = normalizeMode(this._divisionFilter || readMode());
                if (mode === MODE.ALL) return html;
                const chip = `<span class="filter-chip"><span>Divisão: ${root.Utils.escapeHtml(label(mode))}</span></span>`;
                if (!html) return `<div class="filter-chip-bar">${chip}</div>`;
                const closing = html.lastIndexOf('</div>');
                return closing >= 0 ? `${html.slice(0, closing)}${chip}${html.slice(closing)}` : `${html}${chip}`;
            };
        }

        s.__divisionListFilterPatched = true;
        return true;
    }

    function init() {
        if (patch()) return;
        let attempts = 0;
        const timer = root.setInterval?.(() => {
            attempts += 1;
            if (patch() || attempts >= 120) root.clearInterval?.(timer);
        }, 100);
    }

    root.SolicitacoesDivisaoFiltroPatch = Object.freeze({ patch, normalizeDivision, normalizeMode, matches, label, MODE });
    if (root.document) root.document.readyState === 'loading'
        ? root.document.addEventListener('DOMContentLoaded', init, { once: true })
        : init();
})(typeof window !== 'undefined' ? window : globalThis);
