(function (global) {
    const STORAGE_PREFIX = 'diversey_filter_state';

    function safeClone(value, fallback) {
        try {
            return JSON.parse(JSON.stringify(value));
        } catch (_error) {
            return fallback;
        }
    }

    function toFiniteNumber(value, fallback = 0) {
        const numeric = Number(value);
        return Number.isFinite(numeric) ? numeric : fallback;
    }

    function roundCurrency(value) {
        return Math.round((toFiniteNumber(value, 0) + Number.EPSILON) * 100) / 100;
    }

    function hasOwn(source, key) {
        return Boolean(source) && Object.prototype.hasOwnProperty.call(source, key);
    }

    const AnalyticsEngine = {
        COST_STATUSES: ['aprovada', 'em-transito', 'entregue', 'finalizada', 'historico-manual'],
        _datasetCache: new Map(),

        getStorage() {
            try {
                return global.sessionStorage || global.localStorage || null;
            } catch (_error) {
                return null;
            }
        },

        getAppVersion() {
            return global.APP_CONFIG?.version || 'dev';
        },

        normalizeText(value) {
            if (global.Utils && typeof global.Utils.normalizeText === 'function') {
                return global.Utils.normalizeText(value);
            }

            return String(value || '')
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .toLowerCase()
                .trim();
        },

        getSettings() {
            if (global.DataManager && typeof global.DataManager.getSettings === 'function') {
                return global.DataManager.getSettings() || {};
            }
            return {};
        },

        getDefaultRangeDays() {
            const settings = this.getSettings();
            return Math.max(
                toFiniteNumber(settings.preferredRangeDays, 0)
                || toFiniteNumber(settings.statsRangeDays, 0)
                || 30,
                1
            );
        },

        normalizePeriod(period = {}, fallbackRangeDays = this.getDefaultRangeDays()) {
            const today = new Date();
            today.setHours(23, 59, 59, 999);

            const rangeDays = Math.max(toFiniteNumber(period.rangeDays, fallbackRangeDays), 1);
            let dateFrom = String(period.dateFrom || '').trim();
            let dateTo = String(period.dateTo || '').trim();
            let explicitDateBounds = null;

            if (!dateFrom || !dateTo) {
                const end = new Date(today);
                const start = new Date(today);
                start.setHours(0, 0, 0, 0);
                start.setDate(start.getDate() - Math.max(rangeDays - 1, 0));
                dateFrom = global.Utils?.getLocalDateString ? global.Utils.getLocalDateString(start) : start.toISOString().slice(0, 10);
                dateTo = global.Utils?.getLocalDateString ? global.Utils.getLocalDateString(end) : end.toISOString().slice(0, 10);
            } else {
                explicitDateBounds = dateFrom <= dateTo
                    ? { dateFrom, dateTo }
                    : { dateFrom: dateTo, dateTo: dateFrom };
                dateFrom = explicitDateBounds.dateFrom;
                dateTo = explicitDateBounds.dateTo;
            }

            const from = global.Utils?.parseAsLocalDate ? global.Utils.parseAsLocalDate(dateFrom) : new Date(dateFrom);
            const to = global.Utils?.parseAsLocalDate ? global.Utils.parseAsLocalDate(dateTo) : new Date(dateTo);
            from.setHours(0, 0, 0, 0);
            to.setHours(23, 59, 59, 999);

            const diffDays = Math.max(Math.floor((to.getTime() - from.getTime()) / 86400000) + 1, 1);
            const normalizedRange = period.rangeDays && diffDays === toFiniteNumber(period.rangeDays, diffDays)
                ? toFiniteNumber(period.rangeDays, diffDays)
                : diffDays;

            return {
                dateFrom: explicitDateBounds?.dateFrom || (global.Utils?.getLocalDateString ? global.Utils.getLocalDateString(from) : from.toISOString().slice(0, 10)),
                dateTo: explicitDateBounds?.dateTo || (global.Utils?.getLocalDateString ? global.Utils.getLocalDateString(to) : to.toISOString().slice(0, 10)),
                rangeDays: normalizedRange,
                from,
                to,
                isCustom: ![7, 30, 90].includes(normalizedRange)
            };
        },

        buildExplicitPeriod(period = {}, fallbackRangeDays = this.getDefaultRangeDays()) {
            const rawDateFrom = String(period.dateFrom || '').trim();
            const rawDateTo = String(period.dateTo || '').trim();
            const hasDateFrom = Boolean(rawDateFrom);
            const hasDateTo = Boolean(rawDateTo);
            const explicitRangeDays = period.rangeDays !== ''
                && period.rangeDays !== null
                && period.rangeDays !== undefined;

            if (!hasDateFrom && !hasDateTo && !explicitRangeDays) {
                return null;
            }

            if (hasDateFrom || hasDateTo) {
                const normalizedDateFrom = hasDateFrom ? rawDateFrom : rawDateTo;
                const normalizedDateTo = hasDateTo ? rawDateTo : rawDateFrom;
                const fromKey = normalizedDateFrom <= normalizedDateTo ? normalizedDateFrom : normalizedDateTo;
                const toKey = normalizedDateFrom <= normalizedDateTo ? normalizedDateTo : normalizedDateFrom;
                const parsedFrom = global.Utils?.parseAsLocalDate ? global.Utils.parseAsLocalDate(fromKey) : new Date(fromKey);
                const parsedTo = global.Utils?.parseAsLocalDate ? global.Utils.parseAsLocalDate(toKey) : new Date(toKey);

                if (!Number.isNaN(parsedFrom.getTime()) && !Number.isNaN(parsedTo.getTime())) {
                    parsedFrom.setHours(0, 0, 0, 0);
                    parsedTo.setHours(23, 59, 59, 999);
                    const diffDays = Math.max(Math.floor((parsedTo.getTime() - parsedFrom.getTime()) / 86400000) + 1, 1);

                    return {
                        dateFrom: fromKey,
                        dateTo: toKey,
                        rangeDays: diffDays,
                        from: parsedFrom,
                        to: parsedTo,
                        isCustom: true
                    };
                }
            }

            return this.normalizePeriod({
                rangeDays: explicitRangeDays ? period.rangeDays : fallbackRangeDays
            }, fallbackRangeDays);
        },

        getDefaultPeriod() {
            const settings = this.getSettings();
            const saved = settings.defaultPeriodFilter || settings.globalPeriodFilter || {};
            return this.normalizePeriod(saved, this.getDefaultRangeDays());
        },

        saveDefaultPeriodFilter(period = {}) {
            const normalized = this.normalizePeriod(period, this.getDefaultRangeDays());
            if (global.DataManager && typeof global.DataManager.saveSetting === 'function') {
                global.DataManager.saveSetting('preferredRangeDays', normalized.rangeDays);
                global.DataManager.saveSetting('statsRangeDays', normalized.rangeDays);
                global.DataManager.saveSetting('defaultPeriodFilter', {
                    dateFrom: normalized.dateFrom,
                    dateTo: normalized.dateTo,
                    rangeDays: normalized.rangeDays
                });
                global.DataManager.saveSetting('globalPeriodFilter', {
                    dateFrom: normalized.dateFrom,
                    dateTo: normalized.dateTo,
                    rangeDays: normalized.rangeDays
                });
            }
            return normalized;
        },

        saveDefaultRangeDays(days) {
            return this.saveDefaultPeriodFilter({ rangeDays: days });
        },

        getRangeLabel(period = this.getDefaultPeriod()) {
            if (!period) {
                return 'Todos os registros';
            }

            const normalized = this.normalizePeriod(period);
            if ([7, 30, 90].includes(normalized.rangeDays)) {
                return `Ultimos ${normalized.rangeDays} dias`;
            }

            if (global.Utils && typeof global.Utils.formatDate === 'function') {
                return `${global.Utils.formatDate(normalized.dateFrom)} a ${global.Utils.formatDate(normalized.dateTo)}`;
            }

            return `${normalized.dateFrom} a ${normalized.dateTo}`;
        },

        getPreviousPeriod(period = this.getDefaultPeriod()) {
            const normalized = this.normalizePeriod(period);
            const previousEnd = new Date(normalized.from);
            previousEnd.setDate(previousEnd.getDate() - 1);
            previousEnd.setHours(23, 59, 59, 999);
            const previousStart = new Date(previousEnd);
            previousStart.setDate(previousStart.getDate() - Math.max(normalized.rangeDays - 1, 0));
            previousStart.setHours(0, 0, 0, 0);

            return {
                dateFrom: global.Utils?.getLocalDateString ? global.Utils.getLocalDateString(previousStart) : previousStart.toISOString().slice(0, 10),
                dateTo: global.Utils?.getLocalDateString ? global.Utils.getLocalDateString(previousEnd) : previousEnd.toISOString().slice(0, 10),
                rangeDays: normalized.rangeDays,
                from: previousStart,
                to: previousEnd,
                isCustom: normalized.isCustom
            };
        },

        matchesPeriod(date, period = this.getDefaultPeriod()) {
            if (!period) {
                return true;
            }

            if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
                return false;
            }

            const normalized = this.normalizePeriod(period);
            return date.getTime() >= normalized.from.getTime() && date.getTime() <= normalized.to.getTime();
        },

        normalizeStatus(status) {
            if (global.DataManager && typeof global.DataManager.normalizeWorkflowStatus === 'function') {
                return global.DataManager.normalizeWorkflowStatus(status);
            }

            const raw = this.normalizeText(String(status || '').replace(/-/g, '_'));
            const aliases = {
                aprovado: 'aprovada',
                aprovada: 'aprovada',
                entregue: 'entregue',
                em_transito: 'em-transito',
                emtransito: 'em-transito',
                em_compra: 'aprovada',
                finalizado: 'finalizada',
                finalizada: 'finalizada',
                historico_manual: 'historico-manual',
                pendente: 'pendente',
                rejeitado: 'rejeitada',
                rejeitada: 'rejeitada'
            };

            return aliases[raw] || String(status || '').trim();
        },

        getSolicitationDate(solicitation) {
            if (solicitation?._analysisDate instanceof Date && !Number.isNaN(solicitation._analysisDate.getTime())) {
                return solicitation._analysisDate;
            }

            if (solicitation?.data) {
                const parsedData = global.Utils?.parseAsLocalDate ? global.Utils.parseAsLocalDate(solicitation.data) : new Date(solicitation.data);
                if (!Number.isNaN(parsedData.getTime())) {
                    return parsedData;
                }
            }

            if (solicitation?.createdAt) {
                const parsedCreated = global.Utils?.parseAsLocalDate ? global.Utils.parseAsLocalDate(solicitation.createdAt) : new Date(solicitation.createdAt);
                if (!Number.isNaN(parsedCreated.getTime())) {
                    return parsedCreated;
                }
            }

            return null;
        },

        getSolicitationClientName(solicitation) {
            const client = String(solicitation?.cliente || solicitation?.clienteNome || '').trim();
            return client || 'Nao informado';
        },

        getSolicitationRegion(solicitation) {
            const technician = solicitation?.tecnicoId && global.DataManager?.getTechnicianById
                ? global.DataManager.getTechnicianById(solicitation.tecnicoId)
                : null;
            return String(technician?.regiao || technician?.estado || solicitation?.regiao || '').trim() || 'Sem regiao';
        },

        getStatusKeyValue(state) {
            if (Array.isArray(state.statuses) && state.statuses.length > 0) {
                return state.statuses;
            }
            if (state.status) {
                return [state.status];
            }
            return [];
        },

        getModuleDefaults(moduleKey = 'default', overrides = {}) {
            const preferredPeriod = this.getDefaultPeriod();
            const base = {
                search: '',
                statuses: [],
                status: '',
                tecnico: '',
                fornecedor: '',
                regiao: '',
                cliente: '',
                prioridade: '',
                minValue: '',
                dateFrom: '',
                dateTo: '',
                rangeDays: '',
                useDefaultPeriod: false,
                moduleKey
            };

            if (moduleKey === 'dashboard' || moduleKey === 'relatorios') {
                base.dateFrom = preferredPeriod.dateFrom;
                base.dateTo = preferredPeriod.dateTo;
                base.rangeDays = preferredPeriod.rangeDays;
                base.useDefaultPeriod = true;
            }

            return {
                ...base,
                ...safeClone(overrides, {})
            };
        },

        buildFilterState(raw = {}, scope = {}) {
            const options = typeof scope === 'string' ? { moduleKey: scope } : (scope || {});
            const moduleKey = options.moduleKey || raw.moduleKey || 'default';
            const defaults = this.getModuleDefaults(moduleKey, options.defaults || {});
            const merged = {
                ...defaults,
                ...safeClone(raw, {})
            };

            const hasRawStatuses = hasOwn(raw, 'statuses');
            const hasRawStatus = hasOwn(raw, 'status');
            const statusSource = hasRawStatuses
                ? raw.statuses
                : (hasRawStatus ? raw.status : (merged.statuses !== undefined ? merged.statuses : merged.status));
            const rawStatuses = Array.isArray(statusSource)
                ? statusSource
                : (statusSource ? [statusSource] : []);
            const statuses = Array.from(new Set(rawStatuses.map((value) => this.normalizeStatus(value)).filter(Boolean)));

            const rawDateFrom = hasOwn(raw, 'dateFrom') ? String(raw.dateFrom || '').trim() : String(merged.dateFrom || '').trim();
            const rawDateTo = hasOwn(raw, 'dateTo') ? String(raw.dateTo || '').trim() : String(merged.dateTo || '').trim();
            const explicitRangeDays = hasOwn(raw, 'rangeDays')
                && raw.rangeDays !== ''
                && raw.rangeDays !== null
                && raw.rangeDays !== undefined;
            const requestedUseDefaultPeriod = typeof options.useDefaultPeriod === 'boolean'
                ? options.useDefaultPeriod
                : Boolean(hasOwn(raw, 'useDefaultPeriod') ? raw.useDefaultPeriod : merged.useDefaultPeriod);
            const shouldUseDefaultPeriod = requestedUseDefaultPeriod;
            const period = shouldUseDefaultPeriod
                ? this.normalizePeriod({
                    dateFrom: defaults.dateFrom,
                    dateTo: defaults.dateTo,
                    rangeDays: defaults.rangeDays
                }, defaults.rangeDays || this.getDefaultRangeDays())
                : this.buildExplicitPeriod({
                    dateFrom: rawDateFrom,
                    dateTo: rawDateTo,
                    rangeDays: explicitRangeDays ? raw.rangeDays : ''
                }, defaults.rangeDays || this.getDefaultRangeDays());

            return {
                moduleKey,
                search: String(merged.search || '').trim(),
                statuses,
                status: statuses.length === 1 ? statuses[0] : '',
                tecnico: String(merged.tecnico || '').trim(),
                fornecedor: String(merged.fornecedor || '').trim(),
                regiao: String(merged.regiao || '').trim(),
                cliente: String(merged.cliente || '').trim(),
                prioridade: String(merged.prioridade || '').trim(),
                minValue: merged.minValue === '' || merged.minValue === null || merged.minValue === undefined
                    ? ''
                    : toFiniteNumber(merged.minValue, 0),
                dateFrom: period ? period.dateFrom : rawDateFrom,
                dateTo: period ? period.dateTo : rawDateTo,
                rangeDays: period
                    ? period.rangeDays
                    : (explicitRangeDays ? Math.max(toFiniteNumber(raw.rangeDays, this.getDefaultRangeDays()), 1) : ''),
                period,
                useDefaultPeriod: shouldUseDefaultPeriod
            };
        },

        getFilterStorageKey(moduleKey) {
            return `${STORAGE_PREFIX}:${this.getAppVersion()}:${moduleKey}`;
        },

        stripFilterState(filterState) {
            return {
                search: filterState.search || '',
                statuses: Array.isArray(filterState.statuses) ? filterState.statuses.slice() : [],
                tecnico: filterState.tecnico || '',
                fornecedor: filterState.fornecedor || '',
                regiao: filterState.regiao || '',
                cliente: filterState.cliente || '',
                prioridade: filterState.prioridade || '',
                minValue: filterState.minValue === '' ? '' : toFiniteNumber(filterState.minValue, 0),
                dateFrom: filterState.dateFrom || '',
                dateTo: filterState.dateTo || '',
                rangeDays: filterState.rangeDays === '' || filterState.rangeDays === null || filterState.rangeDays === undefined
                    ? ''
                    : toFiniteNumber(filterState.rangeDays, this.getDefaultRangeDays()),
                useDefaultPeriod: Boolean(filterState.useDefaultPeriod)
            };
        },

        persistModuleFilterState(moduleKey, filterState, options = {}) {
            const storage = this.getStorage();
            const state = this.buildFilterState(filterState, {
                moduleKey,
                defaults: options.defaults,
                useDefaultPeriod: options.useDefaultPeriod
            });

            if (storage) {
                storage.setItem(this.getFilterStorageKey(moduleKey), JSON.stringify({
                    version: this.getAppVersion(),
                    state: this.stripFilterState(state)
                }));
            }

            this.logAnalytics('filter_applied', {
                moduleKey,
                filterState: this.summarizeFilterState(state)
            });

            return state;
        },

        restoreModuleFilterState(moduleKey, options = {}) {
            const storage = this.getStorage();
            const defaults = this.getModuleDefaults(moduleKey, options.defaults || {});

            if (!storage) {
                return this.buildFilterState(defaults, {
                    moduleKey,
                    defaults,
                    useDefaultPeriod: defaults.useDefaultPeriod
                });
            }

            try {
                const raw = storage.getItem(this.getFilterStorageKey(moduleKey));
                if (!raw) {
                    return this.buildFilterState(defaults, {
                        moduleKey,
                        defaults,
                        useDefaultPeriod: defaults.useDefaultPeriod
                    });
                }

                const parsed = JSON.parse(raw);
                const state = this.buildFilterState({
                    ...defaults,
                    ...(parsed?.state || {})
                }, {
                    moduleKey,
                    defaults,
                    useDefaultPeriod: typeof parsed?.state?.useDefaultPeriod === 'boolean'
                        ? parsed.state.useDefaultPeriod
                        : defaults.useDefaultPeriod
                });

                this.logAnalytics('filter_state_restored', {
                    moduleKey,
                    filterState: this.summarizeFilterState(state)
                });

                return state;
            } catch (_error) {
                storage.removeItem(this.getFilterStorageKey(moduleKey));
                return this.buildFilterState(defaults, {
                    moduleKey,
                    defaults,
                    useDefaultPeriod: defaults.useDefaultPeriod
                });
            }
        },

        clearModuleFilterState(moduleKey) {
            const storage = this.getStorage();
            if (storage) {
                storage.removeItem(this.getFilterStorageKey(moduleKey));
            }
        },

        getPriority(solicitation) {
            const explicit = this.normalizeText(solicitation?.prioridade || solicitation?.priority || '');
            if (['alta', 'media', 'baixa'].includes(explicit)) {
                return explicit;
            }

            const total = toFiniteNumber(solicitation?._analysisCost, toFiniteNumber(solicitation?.total, 0));
            const createdAt = solicitation?._analysisDate?.getTime()
                || toFiniteNumber(solicitation?.createdAt, 0)
                || Date.now();
            const slaHours = toFiniteNumber(this.getSettings().slaHours, 24);
            const waitingHours = global.Utils?.getHoursDiff
                ? global.Utils.getHoursDiff(createdAt, Date.now())
                : 0;

            if (total >= 1500 || waitingHours >= slaHours) {
                return 'alta';
            }
            if (total >= 500 || waitingHours >= (slaHours / 2)) {
                return 'media';
            }
            return 'baixa';
        },

        buildSearchIndex(solicitation) {
            const items = Array.isArray(solicitation?.itens) ? solicitation.itens : [];
            const partsSummary = items.map((item) => `${item?.codigo || ''} ${item?.descricao || ''}`).join(' ');

            return [
                solicitation?.numero,
                solicitation?.tecnicoNome,
                solicitation?.cliente,
                solicitation?.clienteNome,
                solicitation?.trackingCode,
                solicitation?.fornecedorNome,
                solicitation?.fornecedorEmail,
                solicitation?.observacoes,
                this.getSolicitationRegion(solicitation),
                partsSummary
            ].filter(Boolean).join(' ');
        },

        normalizeSolicitation(solicitation = {}) {
            const normalizedStatus = this.normalizeStatus(solicitation.status);
            const analysisDate = this.getSolicitationDate(solicitation);
            const clientName = this.getSolicitationClientName(solicitation);
            const region = this.getSolicitationRegion(solicitation);
            const items = Array.isArray(solicitation.itens) ? solicitation.itens : [];

            let itemsCost = 0;
            let totalPieces = 0;

            items.forEach((item) => {
                const quantity = toFiniteNumber(item?.quantidade, 0);
                const unitValue = toFiniteNumber(item?.valorUnit, 0);
                itemsCost += quantity * unitValue;
                totalPieces += quantity;
            });

            const hasExplicitTotal = solicitation.total !== undefined
                && solicitation.total !== null
                && String(solicitation.total).trim() !== ''
                && Number.isFinite(Number(solicitation.total));
            const freight = toFiniteNumber(solicitation.frete, 0);
            const discount = toFiniteNumber(solicitation.desconto, 0);

            let analysisCost = 0;
            let costSource = 'empty';

            if (hasExplicitTotal) {
                analysisCost = toFiniteNumber(solicitation.total, 0);
                costSource = 'persisted_total';
            } else {
                analysisCost = itemsCost + freight - discount;
                costSource = items.length > 0 ? 'recomputed_items' : 'recomputed_empty';
            }

            const normalized = {
                ...solicitation,
                status: normalizedStatus,
                _normalizedStatus: normalizedStatus,
                _analysisDate: analysisDate,
                _analysisCost: roundCurrency(analysisCost),
                _analysisPieces: totalPieces,
                _analysisCostSource: costSource,
                _analysisRegion: region,
                _analysisClientName: clientName,
                _analysisSearchIndex: this.normalizeText(this.buildSearchIndex(solicitation))
            };

            return normalized;
        },

        matchesSearchIndex(searchIndex, searchTerm) {
            if (!searchTerm) {
                return true;
            }

            const haystack = this.normalizeText(searchIndex);
            const tokens = this.normalizeText(searchTerm).split(/\s+/).filter(Boolean);
            return tokens.every((token) => haystack.includes(token));
        },

        applyFilters(records = [], filterState = {}, options = {}) {
            const state = this.buildFilterState(filterState, {
                moduleKey: options.moduleKey || filterState.moduleKey || 'default',
                defaults: options.defaults,
                useDefaultPeriod: options.useDefaultPeriod
            });
            const normalizedRecords = options.preNormalized
                ? records
                : records.map((record) => this.normalizeSolicitation(record));

            const statuses = this.getStatusKeyValue(state);
            const normalizedRegion = this.normalizeText(state.regiao);
            const normalizedClient = this.normalizeText(state.cliente);
            const searchTerm = this.normalizeText(state.search);

            return normalizedRecords.filter((record) => {
                if (typeof options.recordPredicate === 'function' && !options.recordPredicate(record, state)) {
                    return false;
                }

                if (state.period && !this.matchesPeriod(record._analysisDate, state.period)) {
                    return false;
                }

                if (statuses.length > 0 && !statuses.includes(record._normalizedStatus)) {
                    return false;
                }

                if (state.tecnico && String(record.tecnicoId || '').trim() !== state.tecnico) {
                    return false;
                }

                if (state.fornecedor) {
                    const supplierCandidates = [
                        record.fornecedorId,
                        record.supplierId,
                        record.fornecedorEmail,
                        record.emailFornecedor
                    ].map((value) => String(value || '').trim()).filter(Boolean);
                    if (!supplierCandidates.includes(state.fornecedor)) {
                        return false;
                    }
                }

                if (normalizedRegion && this.normalizeText(record._analysisRegion) !== normalizedRegion) {
                    return false;
                }

                if (normalizedClient && this.normalizeText(record._analysisClientName) !== normalizedClient) {
                    return false;
                }

                if (state.prioridade && this.getPriority(record) !== state.prioridade) {
                    return false;
                }

                if (state.minValue !== '' && toFiniteNumber(record._analysisCost, 0) < toFiniteNumber(state.minValue, 0)) {
                    return false;
                }

                if (searchTerm && !this.matchesSearchIndex(record._analysisSearchIndex, searchTerm)) {
                    return false;
                }

                return true;
            });
        },

        getRecordsStamp(records = []) {
            return records.reduce((accumulator, record) => {
                const candidate = Math.max(
                    toFiniteNumber(record?.updatedAt, 0),
                    toFiniteNumber(record?.createdAt, 0),
                    toFiniteNumber(record?.approvedAt, 0),
                    toFiniteNumber(record?.trackingUpdatedAt, 0),
                    toFiniteNumber(record?.audit?.version, 0)
                );
                return Math.max(accumulator, candidate);
            }, records.length);
        },

        summarizeFilterState(filterState) {
            const statuses = this.getStatusKeyValue(filterState);
            return {
                search: filterState.search || '',
                statuses,
                tecnico: filterState.tecnico || '',
                fornecedor: filterState.fornecedor || '',
                regiao: filterState.regiao || '',
                cliente: filterState.cliente || '',
                prioridade: filterState.prioridade || '',
                minValue: filterState.minValue === '' ? '' : toFiniteNumber(filterState.minValue, 0),
                dateFrom: filterState.dateFrom || '',
                dateTo: filterState.dateTo || '',
                rangeDays: filterState.rangeDays === '' || filterState.rangeDays === null || filterState.rangeDays === undefined
                    ? ''
                    : toFiniteNumber(filterState.rangeDays, this.getDefaultRangeDays())
            };
        },

        buildDataset(records = [], filterState = {}, datasetScope = {}) {
            if (filterState?.moduleKey && datasetScope?.moduleKey && filterState.moduleKey !== datasetScope.moduleKey) {
                this.logAnalytics('filter_scope_mismatch', {
                    filterModuleKey: filterState.moduleKey,
                    datasetModuleKey: datasetScope.moduleKey
                });
            }

            const state = this.buildFilterState(filterState, {
                moduleKey: datasetScope.moduleKey || filterState.moduleKey || 'default',
                defaults: datasetScope.defaults,
                useDefaultPeriod: datasetScope.useDefaultPeriod
            });
            const cacheKey = datasetScope.cacheKey
                ? `${datasetScope.cacheKey}|${JSON.stringify(this.summarizeFilterState(state))}|${this.getRecordsStamp(records)}`
                : '';

            if (cacheKey && this._datasetCache.has(cacheKey)) {
                return this._datasetCache.get(cacheKey);
            }

            let filteredRecords = this.applyFilters(records, state, {
                preNormalized: false,
                recordPredicate: datasetScope.recordPredicate
            });

            const comparator = typeof datasetScope.sortComparator === 'function'
                ? datasetScope.sortComparator
                : ((a, b) => {
                    const dateDiff = (b._analysisDate?.getTime() || 0) - (a._analysisDate?.getTime() || 0);
                    if (dateDiff !== 0) {
                        return dateDiff;
                    }
                    return toFiniteNumber(b.createdAt, 0) - toFiniteNumber(a.createdAt, 0);
                });

            filteredRecords = filteredRecords.slice().sort(comparator);

            const dataset = {
                records: filteredRecords,
                filterState: state,
                period: state.period,
                totalCount: filteredRecords.length,
                moduleKey: datasetScope.moduleKey || state.moduleKey || 'default',
                recordPredicate: datasetScope.recordPredicate || null
            };

            if (cacheKey) {
                this._datasetCache.set(cacheKey, dataset);
            }

            this.logAnalytics('dataset_built', {
                moduleKey: dataset.moduleKey,
                totalCount: dataset.totalCount,
                filterState: this.summarizeFilterState(state)
            });

            return dataset;
        },

        formatMonthLabel(date) {
            return new Intl.DateTimeFormat('pt-BR', { month: 'short', year: 'numeric' }).format(date);
        },

        computeMetrics(dataset, options = {}) {
            const records = Array.isArray(dataset?.records) ? dataset.records : [];
            const filterState = dataset?.filterState || this.buildFilterState({}, { moduleKey: options.moduleKey || 'analytics', useDefaultPeriod: true });
            const period = filterState.period;
            const costStatuses = Array.from(new Set((options.costStatuses || this.COST_STATUSES).map((status) => this.normalizeStatus(status)).filter(Boolean)));
            const costSolicitations = records.filter((record) => costStatuses.includes(record._normalizedStatus));
            const allRecords = Array.isArray(options.allRecords) ? options.allRecords : [];

            let previousTotalCost = 0;
            if (period && allRecords.length > 0) {
                const previousPeriod = this.getPreviousPeriod(period);
                const previousDataset = this.buildDataset(allRecords, {
                    ...this.stripFilterState(filterState),
                    dateFrom: previousPeriod.dateFrom,
                    dateTo: previousPeriod.dateTo,
                    rangeDays: previousPeriod.rangeDays
                }, {
                    moduleKey: filterState.moduleKey || options.moduleKey || 'analytics',
                    useDefaultPeriod: false,
                    recordPredicate: dataset?.recordPredicate || options.recordPredicate || null
                });
                const previousCostSolicitations = previousDataset.records.filter((record) => costStatuses.includes(record._normalizedStatus));
                previousTotalCost = previousCostSolicitations.reduce((sum, record) => sum + toFiniteNumber(record._analysisCost, 0), 0);
            }

            const technicianMap = new Map();
            const pieceMap = new Map();
            const regionMap = new Map();
            const monthlyMap = new Map();
            const statusMap = {};
            let totalCost = 0;
            let totalPieces = 0;

            // When filtering by supplier (fornecedor), adjust cost and item-level metrics.  We derive the
            // supplierFilter from the current filterState.  If supplierFilter is empty, the default
            // behaviour (aggregate all items) is preserved.  When it is set, only items whose
            // fornecedorId/supplierId matches the filter contribute to cost and quantity.  Any
            // solicitation-level freight or discount is prorated proportionally across the selected
            // supplier's items, based on the ratio of supplier-specific item cost to the total item cost.
            const supplierFilter = String(filterState?.fornecedor || '').trim();

            const ensureMonth = (date) => {
                const monthDate = date || period?.from || new Date();
                const key = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;
                if (!monthlyMap.has(key)) {
                    monthlyMap.set(key, {
                        key,
                        label: this.formatMonthLabel(monthDate),
                        requestCount: 0,
                        totalCost: 0,
                        totalPieces: 0
                    });
                }
                return monthlyMap.get(key);
            };

            records.forEach((record) => {
                const status = record._normalizedStatus;
                const date = record._analysisDate || period?.from || new Date();
                ensureMonth(date).requestCount += 1;
                statusMap[status] = (statusMap[status] || 0) + 1;
            });

            costSolicitations.forEach((record) => {
                const date = record._analysisDate || period?.from || new Date();
                const monthEntry = ensureMonth(date);
                const technicianName = String(record.tecnicoNome || 'Nao identificado').trim() || 'Nao identificado';
                const region = record._analysisRegion || this.getSolicitationRegion(record);
                const clientName = record._analysisClientName || this.getSolicitationClientName(record);
                const items = Array.isArray(record.itens) ? record.itens : [];

                // Original solicitation-level totals
                const originalCost = toFiniteNumber(record._analysisCost, 0);
                const originalPieces = toFiniteNumber(record._analysisPieces, 0);

                // Compute supplier-specific cost and pieces when a supplier filter is active
                let analysisCost = originalCost;
                let analysisPieces = originalPieces;

                if (supplierFilter) {
                    let totalItemsCost = 0;
                    let supplierItemsCost = 0;
                    let supplierItemsPieces = 0;

                    items.forEach((item) => {
                        const quantity = toFiniteNumber(item?.quantidade, 0);
                        const unitValue = toFiniteNumber(item?.valorUnit, 0);
                        const itemCost = quantity * unitValue;
                        // Attempt to derive the supplier for this item.  Fallback to the solicitation's
                        // fornecedorId when item-level supplier is missing.
                        const itemSupplier = String(item?.fornecedorId || item?.supplierId || record.fornecedorId || '').trim();
                        totalItemsCost += itemCost;
                        if (itemSupplier === supplierFilter) {
                            supplierItemsCost += itemCost;
                            supplierItemsPieces += quantity;
                        }
                    });
                    // Prorate freight/discount across supplier items proportionally
                    const remainder = originalCost - totalItemsCost;
                    const ratio = totalItemsCost > 0 ? (supplierItemsCost / totalItemsCost) : 0;
                    analysisCost = supplierItemsCost + ratio * remainder;
                    analysisPieces = supplierItemsPieces;
                }

                // If a supplier filter is set but no items belong to the supplier in this
                // solicitation, skip cost and call contributions entirely.  This prevents
                // solicitations from other suppliers from diluting averages or counts.
                if (supplierFilter && analysisPieces === 0) {
                    return;
                }

                // Populate piece ranking.  When supplierFilter is active, include only items
                // belonging to the filtered supplier.
                items.forEach((item) => {
                    const quantity = toFiniteNumber(item?.quantidade, 0);
                    const unitValue = toFiniteNumber(item?.valorUnit, 0);
                    const totalItem = roundCurrency(quantity * unitValue);
                    const itemSupplier = String(item?.fornecedorId || item?.supplierId || record.fornecedorId || '').trim();
                    if (!supplierFilter || itemSupplier === supplierFilter) {
                        const pieceKey = String(item?.codigo || item?.descricao || 'SEM-CODIGO').trim();
                        const currentPiece = pieceMap.get(pieceKey) || {
                            codigo: item?.codigo || '-',
                            descricao: item?.descricao || 'Peca sem descricao',
                            quantidade: 0,
                            totalCost: 0,
                            averageUnitCost: 0
                        };
                        currentPiece.quantidade += quantity;
                        currentPiece.totalCost += totalItem;
                        pieceMap.set(pieceKey, currentPiece);
                    }
                });

                // Update technician-level aggregation
                const currentTech = technicianMap.get(technicianName) || {
                    nome: technicianName,
                    regiao: region,
                    calls: 0,
                    totalCost: 0,
                    totalPieces: 0,
                    clients: new Set()
                };
                currentTech.calls += 1;
                currentTech.totalCost += analysisCost;
                currentTech.totalPieces += analysisPieces;
                currentTech.clients.add(clientName);
                technicianMap.set(technicianName, currentTech);

                // Update region-level aggregation
                const currentRegion = regionMap.get(region) || {
                    regiao: region,
                    requestCount: 0,
                    totalCost: 0,
                    totalPieces: 0
                };
                currentRegion.requestCount += 1;
                currentRegion.totalCost += analysisCost;
                currentRegion.totalPieces += analysisPieces;
                regionMap.set(region, currentRegion);

                // Update monthly and global totals
                monthEntry.totalCost += analysisCost;
                monthEntry.totalPieces += analysisPieces;
                totalCost += analysisCost;
                totalPieces += analysisPieces;
            });

            const byTechnician = Array.from(technicianMap.values())
                .map((tech) => ({
                    nome: tech.nome,
                    regiao: tech.regiao,
                    calls: tech.calls,
                    totalCost: tech.totalCost,
                    totalPieces: tech.totalPieces,
                    partsPerCall: tech.calls > 0 ? tech.totalPieces / tech.calls : 0,
                    costPerCall: tech.calls > 0 ? tech.totalCost / tech.calls : 0,
                    clientCount: tech.clients.size
                }))
                .sort((a, b) => (b.totalCost - a.totalCost) || (b.calls - a.calls) || a.nome.localeCompare(b.nome, 'pt-BR'));

            const efficiencyRanking = byTechnician
                .filter((tech) => tech.calls > 0)
                .slice()
                .sort((a, b) => (a.costPerCall - b.costPerCall) || (b.calls - a.calls) || a.nome.localeCompare(b.nome, 'pt-BR'));

            // Construímos o ranking de peças com base no custo total acumulado. A quantidade
            // é exibida apenas como informação complementar e não interfere na ordenação
            // principal. Primeiro calculamos o custo médio por unidade e depois ordenamos
            // pelo custo total de forma decrescente. Caso dois itens tenham o mesmo custo
            // total, utilizamos a quantidade apenas como critério secundário para manter
            // uma ordenação estável. Isso garante que o ranking "Top 5 peças com maior
            // custo" reflita corretamente as peças mais onerosas no período filtrado.
            const byPiece = Array.from(pieceMap.values())
                .map((piece) => ({
                    ...piece,
                    averageUnitCost: piece.quantidade > 0 ? piece.totalCost / piece.quantidade : 0
                }))
                .sort((a, b) => {
                    const costDiff = (b.totalCost - a.totalCost);
                    if (costDiff !== 0) {
                        return costDiff;
                    }
                    return b.quantidade - a.quantidade;
                });

            const byRegion = Array.from(regionMap.values())
                .map((region) => ({
                    ...region,
                    costPerRequest: region.requestCount > 0 ? region.totalCost / region.requestCount : 0
                }))
                .sort((a, b) => (b.totalCost - a.totalCost) || (b.requestCount - a.requestCount));

            const byMonth = Array.from(monthlyMap.values()).sort((a, b) => a.key.localeCompare(b.key));
            const monthSpan = Math.max(byMonth.length, 1);
            const averageCostPerSolicitation = costSolicitations.length > 0 ? totalCost / costSolicitations.length : 0;
            const highCostThreshold = averageCostPerSolicitation * 1.3;
            const highCostSolicitations = costSolicitations
                .filter((record) => record._analysisCost > 0 && record._analysisCost >= highCostThreshold)
                .map((record) => ({
                    ...record,
                    analysisCost: record._analysisCost,
                    analysisPieces: record._analysisPieces,
                    region: record._analysisRegion,
                    costDeltaPct: averageCostPerSolicitation > 0 ? ((record._analysisCost / averageCostPerSolicitation) - 1) * 100 : 0
                }))
                .sort((a, b) => b.analysisCost - a.analysisCost);

            const metrics = {
                period,
                periodLabel: period ? this.getRangeLabel(period) : 'Todos os registros',
                solicitations: records.slice(),
                costSolicitations: costSolicitations.slice(),
                totalRequests: records.length,
                openCount: records.filter((record) => !['rejeitada', 'finalizada', 'historico-manual'].includes(record._normalizedStatus)).length,
                pendingCount: records.filter((record) => record._normalizedStatus === 'pendente').length,
                totalApproved: costSolicitations.length,
                totalCost,
                previousTotalCost,
                totalPieces,
                partsPerSolicitation: records.length > 0 ? totalPieces / records.length : 0,
                costPerPiece: totalPieces > 0 ? totalCost / totalPieces : 0,
                averageCostPerSolicitation,
                costVariation: previousTotalCost > 0 ? ((totalCost - previousTotalCost) / previousTotalCost) * 100 : (totalCost > 0 ? 100 : 0),
                uniqueTechCount: byTechnician.length,
                avgCostPerTech: byTechnician.length > 0 ? totalCost / byTechnician.length : 0,
                monthlyAverageRequests: monthSpan > 0 ? records.length / monthSpan : 0,
                monthSpan,
                byStatus: statusMap,
                byTechnician,
                efficiencyRanking,
                byPiece,
                topPieces: byPiece.slice(0, 5),
                byRegion,
                byMonth,
                latestMonth: byMonth[byMonth.length - 1] || null,
                topByCalls: byTechnician.slice().sort((a, b) => (b.calls - a.calls) || (b.totalCost - a.totalCost))[0] || { nome: '-', calls: 0, totalCost: 0, costPerCall: 0 },
                topByCost: byTechnician[0] || { nome: '-', calls: 0, totalCost: 0, costPerCall: 0 },
                mostEfficient: efficiencyRanking[0] || { nome: '-', calls: 0, totalCost: 0, costPerCall: 0 },
                highCostSolicitations,
                highCostThreshold
            };

            this.logAnalytics('metrics_recomputed', {
                moduleKey: dataset?.moduleKey || options.moduleKey || 'analytics',
                totalRequests: metrics.totalRequests,
                totalApproved: metrics.totalApproved,
                totalCost: metrics.totalCost
            });

            return metrics;
        },

        buildOperationalAnalysis(records = [], options = {}) {
            const explicitRangeDays = options.period && Object.prototype.hasOwnProperty.call(options.period, 'rangeDays')
                ? options.period.rangeDays
                : (Object.prototype.hasOwnProperty.call(options, 'rangeDays') ? options.rangeDays : undefined);
            const hasExplicitPeriod = Boolean(
                options.period?.dateFrom
                || options.period?.dateTo
                || options.dateFrom
                || options.dateTo
                || explicitRangeDays
            );
            const filterState = this.buildFilterState({
                search: options.search || '',
                statuses: options.statuses || options.status || [],
                tecnico: options.tecnico || '',
                fornecedor: options.fornecedor || '',
                regiao: options.regiao || '',
                cliente: options.cliente || '',
                prioridade: options.prioridade || '',
                minValue: options.minValue || '',
                dateFrom: options.period?.dateFrom || options.dateFrom || '',
                dateTo: options.period?.dateTo || options.dateTo || '',
                rangeDays: explicitRangeDays
            }, {
                moduleKey: options.moduleKey || 'analytics',
                useDefaultPeriod: typeof options.useDefaultPeriod === 'boolean'
                    ? options.useDefaultPeriod
                    : !hasExplicitPeriod
            });

            const dataset = this.buildDataset(records, filterState, {
                moduleKey: options.moduleKey || 'analytics',
                useDefaultPeriod: filterState.useDefaultPeriod,
                recordPredicate: options.recordPredicate || null,
                cacheKey: options.cacheKey || ''
            });

            return this.computeMetrics(dataset, {
                moduleKey: options.moduleKey || 'analytics',
                allRecords: records,
                recordPredicate: options.recordPredicate || null,
                costStatuses: options.costStatuses || this.COST_STATUSES
            });
        },

        buildFilterChips(filterState, options = {}) {
            const chips = [];
            const state = this.buildFilterState(filterState, {
                moduleKey: options.moduleKey || filterState.moduleKey || 'default',
                defaults: options.defaults,
                useDefaultPeriod: options.useDefaultPeriod
            });
            const statusOptions = Array.isArray(options.statusOptions) ? options.statusOptions : [];
            const statusMap = new Map(statusOptions.map((option) => [this.normalizeStatus(option.value), option.label]));

            if (state.search) {
                chips.push({ key: 'search', label: 'Busca', value: state.search });
            }

            const shouldShowDefaultPeriodChip = options.showDefaultPeriodChip === true;
            if (state.period && (state.dateFrom || state.dateTo) && (state.useDefaultPeriod === false || shouldShowDefaultPeriodChip)) {
                chips.push({ key: 'period', label: 'Periodo', value: this.getRangeLabel(state.period) });
            }

            state.statuses.forEach((status) => {
                chips.push({
                    key: 'status',
                    value: status,
                    label: 'Status',
                    displayValue: statusMap.get(status) || status
                });
            });

            ['tecnico', 'regiao', 'cliente', 'fornecedor', 'prioridade'].forEach((field) => {
                if (!state[field]) {
                    return;
                }

                const resolver = options.resolvers?.[field];
                chips.push({
                    key: field,
                    value: state[field],
                    label: options.labels?.[field] || field,
                    displayValue: typeof resolver === 'function' ? resolver(state[field], state) : state[field]
                });
            });

            if (state.minValue !== '') {
                chips.push({
                    key: 'minValue',
                    value: state.minValue,
                    label: 'Valor minimo',
                    displayValue: global.Utils?.formatCurrency
                        ? global.Utils.formatCurrency(state.minValue)
                        : String(state.minValue)
                });
            }

            return chips;
        },

        logAnalytics(event, data = {}) {
            if (!global.Logger || typeof global.Logger.info !== 'function') {
                return;
            }

            const category = global.Logger.CATEGORY?.ANALYTICS || global.Logger.CATEGORY?.SYSTEM || 'system';
            global.Logger.info(category, event, data);
        }
    };

    global.AnalyticsEngine = AnalyticsEngine;
})(typeof window !== 'undefined' ? window : globalThis);
