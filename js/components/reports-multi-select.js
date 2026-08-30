import {
    normalizeMultiValues,
    normalizeComparable,
    matchesAnySelected,
    scopeRecordToSuppliers
} from './report-multi-filter-utils.js';

const STORAGE_KEY = 'premium_reports_multi_filters_v1';

function readStoredState() {
    try {
        const raw = window.sessionStorage?.getItem(STORAGE_KEY) || window.localStorage?.getItem(STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : {};
        return {
            tecnicos: normalizeMultiValues(parsed.tecnicos),
            regioes: normalizeMultiValues(parsed.regioes),
            clientes: normalizeMultiValues(parsed.clientes),
            fornecedores: normalizeMultiValues(parsed.fornecedores),
            pecas: normalizeMultiValues(parsed.pecas),
            categorias: normalizeMultiValues(parsed.categorias)
        };
    } catch (_error) {
        return { tecnicos: [], regioes: [], clientes: [], fornecedores: [], pecas: [], categorias: [] };
    }
}

function writeStoredState(state) {
    const safe = {
        tecnicos: normalizeMultiValues(state.tecnicos),
        regioes: normalizeMultiValues(state.regioes),
        clientes: normalizeMultiValues(state.clientes),
        fornecedores: normalizeMultiValues(state.fornecedores),
        pecas: normalizeMultiValues(state.pecas),
        categorias: normalizeMultiValues(state.categorias)
    };
    try {
        window.sessionStorage?.setItem(STORAGE_KEY, JSON.stringify(safe));
    } catch (_error) {
        try {
            window.localStorage?.setItem(STORAGE_KEY, JSON.stringify(safe));
        } catch (_ignored) { /* no-op */ }
    }
}

function renderMultiSelect(controlId, label, options, selectedValues = []) {
    const selected = new Set(normalizeMultiValues(selectedValues));
    const selectedCount = selected.size;
    const summary = selectedCount === 0 ? 'Todos' : (selectedCount === 1 ? '1 selecionado' : `${selectedCount} selecionados`);

    return `
        <div class="filter-group report-filter-field premium-multi-filter" data-premium-multi-filter="${controlId}">
            <label>${Utils.escapeHtml(label)}</label>
            <button type="button" class="premium-multi-filter-trigger" data-premium-multi-trigger="${controlId}" aria-haspopup="true" aria-expanded="false">
                <span class="premium-multi-filter-trigger-copy">
                    <i class="fas fa-list-check" aria-hidden="true"></i>
                    <span>${Utils.escapeHtml(summary)}</span>
                </span>
                <i class="fas fa-chevron-down" aria-hidden="true"></i>
            </button>
            <div class="premium-multi-filter-popover" data-premium-multi-popover="${controlId}">
                <div class="premium-multi-filter-toolbar">
                    <button type="button" data-premium-multi-all="${controlId}">Selecionar todos</button>
                    <button type="button" data-premium-multi-clear="${controlId}">Limpar</button>
                </div>
                <div class="premium-multi-filter-search-wrap">
                    <i class="fas fa-search" aria-hidden="true"></i>
                    <input type="search" class="premium-multi-filter-search" data-premium-multi-search="${controlId}" placeholder="Buscar..." autocomplete="off">
                </div>
                <div class="premium-multi-filter-options" data-premium-multi-options="${controlId}">
                    ${options.map((option) => {
        const value = String(option.value ?? '').trim();
        const text = String(option.label ?? value).trim();
        return `
                            <label class="premium-multi-filter-option" data-premium-multi-option-text="${Utils.escapeHtml(normalizeComparable(text))}">
                                <input type="checkbox" data-premium-multi-value="${controlId}" value="${Utils.escapeHtml(value)}" ${selected.has(value) ? 'checked' : ''}>
                                <span>${Utils.escapeHtml(text)}</span>
                            </label>
                        `;
    }).join('')}
                </div>
            </div>
        </div>
    `;
}

function getCheckedValues(controlId) {
    return Array.from(document.querySelectorAll(`[data-premium-multi-value="${controlId}"]:checked`))
        .map((input) => input.value)
        .filter(Boolean);
}

function updateTriggerSummary(controlId) {
    const trigger = document.querySelector(`[data-premium-multi-trigger="${controlId}"]`);
    if (!trigger) {
        return;
    }
    const values = getCheckedValues(controlId);
    const summary = values.length === 0 ? 'Todos' : (values.length === 1 ? '1 selecionado' : `${values.length} selecionados`);
    const label = trigger.querySelector('.premium-multi-filter-trigger-copy span');
    if (label) {
        label.textContent = summary;
    }
}

function closeAll(exceptId = '') {
    document.querySelectorAll('[data-premium-multi-filter].open').forEach((filter) => {
        if (filter.dataset.premiumMultiFilter === exceptId) {
            return;
        }
        filter.classList.remove('open');
        filter.querySelector('[data-premium-multi-trigger]')?.setAttribute('aria-expanded', 'false');
    });
}

function bindMultiSelectControls() {
    document.querySelectorAll('[data-premium-multi-trigger]').forEach((trigger) => {
        if (trigger.dataset.bound === 'true') {
            return;
        }
        trigger.dataset.bound = 'true';
        trigger.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            const id = trigger.dataset.premiumMultiTrigger;
            const filter = document.querySelector(`[data-premium-multi-filter="${id}"]`);
            if (!filter) {
                return;
            }
            const open = !filter.classList.contains('open');
            closeAll(open ? id : '');
            filter.classList.toggle('open', open);
            trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
        });
    });

    document.querySelectorAll('[data-premium-multi-popover]').forEach((popover) => {
        if (popover.dataset.bound === 'true') {
            return;
        }
        popover.dataset.bound = 'true';
        popover.addEventListener('click', (event) => event.stopPropagation());
    });

    document.querySelectorAll('[data-premium-multi-value]').forEach((input) => {
        if (input.dataset.bound === 'true') {
            return;
        }
        input.dataset.bound = 'true';
        input.addEventListener('change', () => updateTriggerSummary(input.dataset.premiumMultiValue));
    });

    document.querySelectorAll('[data-premium-multi-clear]').forEach((button) => {
        if (button.dataset.bound === 'true') {
            return;
        }
        button.dataset.bound = 'true';
        button.addEventListener('click', () => {
            const id = button.dataset.premiumMultiClear;
            document.querySelectorAll(`[data-premium-multi-value="${id}"]`).forEach((input) => {
                input.checked = false;
            });
            updateTriggerSummary(id);
        });
    });

    document.querySelectorAll('[data-premium-multi-all]').forEach((button) => {
        if (button.dataset.bound === 'true') {
            return;
        }
        button.dataset.bound = 'true';
        button.addEventListener('click', () => {
            const id = button.dataset.premiumMultiAll;
            document.querySelectorAll(`[data-premium-multi-value="${id}"]`).forEach((input) => {
                if (input.closest('.premium-multi-filter-option')?.style.display !== 'none') {
                    input.checked = true;
                }
            });
            updateTriggerSummary(id);
        });
    });

    document.querySelectorAll('[data-premium-multi-search]').forEach((input) => {
        if (input.dataset.bound === 'true') {
            return;
        }
        input.dataset.bound = 'true';
        input.addEventListener('input', () => {
            const id = input.dataset.premiumMultiSearch;
            const query = normalizeComparable(input.value);
            document.querySelectorAll(`[data-premium-multi-options="${id}"] .premium-multi-filter-option`).forEach((row) => {
                const text = row.dataset.premiumMultiOptionText || '';
                row.style.display = !query || text.includes(query) ? '' : 'none';
            });
        });
    });
}

function recordMatchesMultiFilters(record, state) {
    if (!matchesAnySelected([record.tecnicoId], state.tecnicos, String)) {
        return false;
    }
    if (!matchesAnySelected([record._analysisRegion || AnalyticsHelper.getSolicitationRegion(record)], state.regioes)) {
        return false;
    }
    if (!matchesAnySelected([record._analysisClientName || AnalyticsHelper.getSolicitationClientName(record)], state.clientes)) {
        return false;
    }
    return true;
}

function getRecordPieceCandidates(record) {
    return (Array.isArray(record?.itens) ? record.itens : []).flatMap((item) => [
        item?.codigo,
        item?.descricao,
        item?.peca,
        item?.nome
    ]).filter(Boolean);
}

function getRecordCategoryCandidates(record) {
    return (Array.isArray(record?.itens) ? record.itens : []).flatMap((item) => {
        const catalogPart = item?.codigo && typeof DataManager.getPartByCode === 'function'
            ? DataManager.getPartByCode(item.codigo)
            : null;
        return [item?.categoria, catalogPart?.categoria];
    }).filter(Boolean);
}

function getPieceAndCategoryOptions() {
    const pieces = new Map();
    const categories = new Set();

    DataManager.getSolicitations().forEach((record) => {
        (Array.isArray(record?.itens) ? record.itens : []).forEach((item) => {
            const code = String(item?.codigo || '').trim();
            const description = String(item?.descricao || item?.peca || item?.nome || '').trim();
            const value = code || description;
            if (value && !pieces.has(value)) {
                pieces.set(value, code && description ? `${code} — ${description}` : value);
            }

            const catalogPart = code && typeof DataManager.getPartByCode === 'function'
                ? DataManager.getPartByCode(code)
                : null;
            [item?.categoria, catalogPart?.categoria].forEach((category) => {
                const normalized = String(category || '').trim();
                if (normalized) {
                    categories.add(normalized);
                }
            });
        });
    });

    return {
        pecas: Array.from(pieces, ([value, label]) => ({ value, label }))
            .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR')),
        categorias: Array.from(categories)
            .sort((a, b) => a.localeCompare(b, 'pt-BR'))
            .map((value) => ({ value, label: value }))
    };
}

function scopeRecordToCatalogFilters(record, state) {
    const selectedPieces = normalizeMultiValues(state.pecas);
    const selectedCategories = normalizeMultiValues(state.categorias);
    if (selectedPieces.length === 0 && selectedCategories.length === 0) {
        return record;
    }

    const items = Array.isArray(record?.itens) ? record.itens : [];
    if (items.length === 0) {
        return null;
    }

    let allItemsCost = 0;
    let selectedItemsCost = 0;
    let selectedQuantity = 0;
    const selectedItems = [];

    items.forEach((item) => {
        const quantity = Number(item?.quantidade) || 0;
        const unitValue = Number(item?.valorUnit) || 0;
        const itemCost = quantity * unitValue;
        allItemsCost += itemCost;

        const itemRecord = { itens: [item] };
        const pieceMatches = matchesAnySelected(getRecordPieceCandidates(itemRecord), selectedPieces);
        const categoryMatches = matchesAnySelected(getRecordCategoryCandidates(itemRecord), selectedCategories);
        if (!pieceMatches || !categoryMatches) {
            return;
        }

        selectedItems.push(item);
        selectedItemsCost += itemCost;
        selectedQuantity += quantity;
    });

    if (selectedItems.length === 0) {
        return null;
    }

    const originalCost = Number(record._analysisCost ?? record.total) || allItemsCost;
    const nonItemAmount = originalCost - allItemsCost;
    const ratio = allItemsCost > 0 ? selectedItemsCost / allItemsCost : 0;
    const scopedCost = Math.round((selectedItemsCost + (ratio * nonItemAmount) + Number.EPSILON) * 100) / 100;

    return {
        ...record,
        itens: selectedItems,
        total: scopedCost,
        _analysisCost: scopedCost,
        _analysisPieces: selectedQuantity,
        _premiumCatalogScoped: true
    };
}

function buildPremiumReportData(relatorios) {
    const filterState = relatorios.buildFilterState();
    const allSolicitations = DataManager.getSolicitations().slice();
    const multi = relatorios._premiumMultiFilters || readStoredState();

    const baseState = {
        ...filterState,
        tecnico: '',
        regiao: '',
        cliente: '',
        fornecedor: ''
    };

    const baseDataset = AnalyticsHelper.buildDataset(allSolicitations, baseState, {
        moduleKey: 'relatorios',
        useDefaultPeriod: baseState.useDefaultPeriod,
        cacheKey: ''
    });

    const filteredRecords = baseDataset.records
        .filter((record) => recordMatchesMultiFilters(record, multi))
        .map((record) => scopeRecordToSuppliers(record, multi.fornecedores))
        .map((record) => record ? scopeRecordToCatalogFilters(record, multi) : null)
        .filter(Boolean);

    const dataset = {
        ...baseDataset,
        records: filteredRecords,
        totalCount: filteredRecords.length,
        filterState: baseState,
        period: baseState.period
    };

    const analysis = AnalyticsHelper.computeMetrics(dataset, {
        moduleKey: 'relatorios',
        allRecords: allSolicitations,
        costStatuses: Array.isArray(filterState.statuses) && filterState.statuses.length > 0
            ? filterState.statuses
            : relatorios.costStatuses
    });
    const monthlySummary = relatorios.buildMonthlyAverageSummary(dataset.records, filterState.period);

    return {
        dataset,
        analysis,
        solicitations: dataset.records,
        monthlySummary,
        summaryLabel: `Resumo atual: ${Utils.formatNumber(dataset.totalCount)} solicitações filtradas.`
    };
}

export function applyReportsMultiSelect() {
    if (!window.Relatorios || Relatorios.__premiumMultiSelectApplied) {
        return;
    }

    Relatorios.__premiumMultiSelectApplied = true;
    Relatorios._premiumMultiFilters = readStoredState();

    const modernAfterRender = Relatorios.afterRender?.bind(Relatorios);
    const modernClearFilters = Relatorios.clearFilters?.bind(Relatorios);

    Relatorios.getReportData = function getPremiumReportData() {
        return buildPremiumReportData(this);
    };

    Relatorios.renderCostFilters = function renderPremiumCostFilters() {
        const options = this.getAvailableCostFilters();
        const periodPreset = typeof this.getSelectedPeriodPreset === 'function' ? this.getSelectedPeriodPreset() : '30';
        const multi = this._premiumMultiFilters || readStoredState();
        const techOptions = options.tecnicos.map((item) => ({ value: item.id, label: item.nome }));
        const regionOptions = options.regioes.map((value) => ({ value, label: value }));
        const clientOptions = options.clientes.map((value) => ({ value, label: value }));
        const supplierOptions = options.fornecedores.map((item) => ({ value: item.id, label: item.nome }));
        const catalogOptions = getPieceAndCategoryOptions();

        return `
            <div class="page-filters dashboard-filters-compact report-filters-compact report-filters-enterprise premium-report-filter-shell">
                <div class="report-filters-row premium-report-filter-grid">
                    <div class="filter-group report-filter-field report-filter-field--period">
                        <label>Período</label>
                        <select id="report-period" class="form-control">
                            ${this.getPeriodOptions().map((option) => `<option value="${option.value}" ${periodPreset === option.value ? 'selected' : ''}>${option.label}</option>`).join('')}
                        </select>
                    </div>
                    <div class="filter-group report-filter-field report-filter-field--date"><label>De</label><input type="date" id="report-date-from" class="form-control" value="${this.filters.dateFrom}"></div>
                    <div class="filter-group report-filter-field report-filter-field--date"><label>Até</label><input type="date" id="report-date-to" class="form-control" value="${this.filters.dateTo}"></div>
                    <div class="filter-group report-filter-field report-filter-field--status"><label>Status</label>${this.renderStatusMultiSelect('report-status')}</div>
                    ${renderMultiSelect('report-clientes', 'Cliente', clientOptions, multi.clientes)}
                    ${renderMultiSelect('report-tecnicos', 'Técnico', techOptions, multi.tecnicos)}
                    ${renderMultiSelect('report-fornecedores', 'Fornecedor', supplierOptions, multi.fornecedores)}
                    ${renderMultiSelect('report-regioes', 'Região', regionOptions, multi.regioes)}
                    ${renderMultiSelect('report-pecas', 'Peça', catalogOptions.pecas, multi.pecas)}
                    ${renderMultiSelect('report-categorias', 'Categoria', catalogOptions.categorias, multi.categorias)}
                    <div class="filter-group report-filter-field premium-report-filter-actions">
                        <label>Ações</label>
                        <div class="report-filter-actions-row">
                            <button class="btn btn-primary" onclick="Relatorios.applyFilters()"><i class="fas fa-filter"></i> Aplicar filtros</button>
                            <button class="btn btn-outline" onclick="Relatorios.clearFilters()"><i class="fas fa-eraser"></i> Limpar</button>
                        </div>
                    </div>
                </div>
                <div class="premium-report-filter-hint"><i class="fas fa-circle-info"></i> Status, cliente, técnico, fornecedor, região, peça e categoria aceitam múltiplas seleções.</div>
            </div>
        `;
    };

    Relatorios.applyFilters = function applyPremiumFilters() {
        const defaults = this.getDefaultFilters();
        let periodPreset = document.getElementById('report-period')?.value || this.getSelectedPeriodPreset();
        const dateFromInput = document.getElementById('report-date-from')?.value || this.filters.dateFrom || defaults.dateFrom;
        const dateToInput = document.getElementById('report-date-to')?.value || this.filters.dateTo || defaults.dateTo;

        if (periodPreset !== 'custom') {
            const expected = AnalyticsHelper.normalizePeriod({ rangeDays: Number(periodPreset) || defaults.rangeDays }, defaults.rangeDays);
            if ((dateFromInput && dateFromInput !== expected.dateFrom) || (dateToInput && dateToInput !== expected.dateTo)) {
                periodPreset = 'custom';
            }
        }

        let dateFrom = dateFromInput;
        let dateTo = dateToInput;
        let rangeDays = defaults.rangeDays;
        let useDefaultPeriod = true;
        if (periodPreset !== 'custom') {
            const normalized = AnalyticsHelper.normalizePeriod({ rangeDays: Number(periodPreset) || defaults.rangeDays }, defaults.rangeDays);
            dateFrom = normalized.dateFrom;
            dateTo = normalized.dateTo;
            rangeDays = normalized.rangeDays;
        } else {
            useDefaultPeriod = false;
            rangeDays = '';
        }

        this.filters = {
            ...this.filters,
            search: '',
            statuses: this.getSelectedStatusValues('report-status'),
            tecnico: '',
            regiao: '',
            cliente: '',
            fornecedor: '',
            dateFrom,
            dateTo,
            rangeDays,
            useDefaultPeriod
        };
        this._premiumMultiFilters = {
            clientes: getCheckedValues('report-clientes'),
            tecnicos: getCheckedValues('report-tecnicos'),
            fornecedores: getCheckedValues('report-fornecedores'),
            regioes: getCheckedValues('report-regioes'),
            pecas: getCheckedValues('report-pecas'),
            categorias: getCheckedValues('report-categorias')
        };
        writeStoredState(this._premiumMultiFilters);
        this.persistFilters();
        this.render();
    };

    Relatorios.clearFilters = function clearPremiumFilters() {
        this._premiumMultiFilters = { tecnicos: [], regioes: [], clientes: [], fornecedores: [], pecas: [], categorias: [] };
        writeStoredState(this._premiumMultiFilters);
        if (modernClearFilters) {
            return modernClearFilters();
        }
        this.filters = this.getDefaultFilters();
        this.persistFilters();
        this.render();
    };

    Relatorios.afterRender = function afterPremiumRender() {
        if (modernAfterRender) {
            modernAfterRender();
        }
        bindMultiSelectControls();
    };

    if (!document.documentElement.dataset.premiumReportMultiOutsideBound) {
        document.documentElement.dataset.premiumReportMultiOutsideBound = 'true';
        document.addEventListener('click', () => closeAll());
    }
}
