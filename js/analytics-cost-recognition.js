(function (global) {
    'use strict';

    const engine = global.AnalyticsEngine;
    if (!engine || engine.__approvalCostRecognitionInstalled) {
        return;
    }

    const originalComputeMetrics = engine.computeMetrics.bind(engine);
    const originalBuildDataset = engine.buildDataset.bind(engine);

    const COST_METRIC_KEYS = [
        'costSolicitations',
        'totalApproved',
        'totalCost',
        'previousTotalCost',
        'totalPieces',
        'costPerPiece',
        'averageCostPerSolicitation',
        'costVariation',
        'uniqueTechCount',
        'avgCostPerTech',
        'byTechnician',
        'efficiencyRanking',
        'byPiece',
        'topPieces',
        'byRegion',
        'topByCalls',
        'topByCost',
        'mostEfficient',
        'highCostSolicitations',
        'highCostThreshold'
    ];

    function parseEventDate(value) {
        if (value instanceof Date) {
            return Number.isNaN(value.getTime()) ? null : new Date(value.getTime());
        }

        if (value === null || value === undefined || value === '') {
            return null;
        }

        if (typeof value === 'number') {
            const parsedNumber = new Date(value);
            return Number.isNaN(parsedNumber.getTime()) ? null : parsedNumber;
        }

        if (typeof value === 'string' && /^\d+$/.test(value.trim())) {
            const parsedNumericString = new Date(Number(value.trim()));
            return Number.isNaN(parsedNumericString.getTime()) ? null : parsedNumericString;
        }

        const parsed = global.Utils?.parseAsLocalDate
            ? global.Utils.parseAsLocalDate(value)
            : new Date(value);
        return parsed instanceof Date && !Number.isNaN(parsed.getTime()) ? parsed : null;
    }

    engine.getCostRecognitionDate = function getCostRecognitionDate(solicitation = {}) {
        const candidates = [];
        const collect = (value) => {
            const parsed = parseEventDate(value);
            if (parsed) {
                candidates.push(parsed.getTime());
            }
        };

        collect(solicitation.approvedAt);

        if (Array.isArray(solicitation.approvals)) {
            solicitation.approvals.forEach((entry) => {
                const decision = String(entry?.decision || '').trim().toLowerCase();
                if (['approved', 'aprovada', 'aprovado'].includes(decision)) {
                    collect(entry.approvedAt);
                    collect(entry.at);
                }
            });
        }

        if (Array.isArray(solicitation.statusHistory)) {
            solicitation.statusHistory.forEach((entry) => {
                if (this.normalizeStatus(entry?.status) === 'aprovada') {
                    collect(entry.at);
                }
            });
        }

        if (candidates.length === 0) {
            return null;
        }

        return new Date(Math.max(...candidates));
    };

    function mergeMonthlySeries(requestMonths = [], costMonths = []) {
        const merged = new Map();

        requestMonths.forEach((entry) => {
            if (!entry?.key) {
                return;
            }
            merged.set(entry.key, {
                ...entry,
                requestCount: Number(entry.requestCount) || 0,
                totalCost: 0,
                totalPieces: 0
            });
        });

        costMonths.forEach((entry) => {
            if (!entry?.key) {
                return;
            }
            const current = merged.get(entry.key) || {
                key: entry.key,
                label: entry.label,
                requestCount: 0,
                totalCost: 0,
                totalPieces: 0
            };
            current.label = entry.label || current.label;
            current.totalCost = Number(entry.totalCost) || 0;
            current.totalPieces = Number(entry.totalPieces) || 0;
            merged.set(entry.key, current);
        });

        return Array.from(merged.values()).sort((a, b) => a.key.localeCompare(b.key));
    }

    engine.computeMetrics = function computeMetricsByApprovalDate(dataset, options = {}) {
        const operationalMetrics = originalComputeMetrics(dataset, options);
        const filterState = dataset?.filterState || null;
        const period = filterState?.period || dataset?.period || null;
        const allRecords = Array.isArray(options.allRecords) ? options.allRecords : [];

        if (!period || allRecords.length === 0) {
            return operationalMetrics;
        }

        const canonicalCostStatuses = new Set(
            (this.COST_STATUSES || [])
                .map((status) => this.normalizeStatus(status))
                .filter(Boolean)
        );
        const requestedCostStatuses = new Set(
            (Array.isArray(options.costStatuses) ? options.costStatuses : this.COST_STATUSES || [])
                .map((status) => this.normalizeStatus(status))
                .filter((status) => canonicalCostStatuses.has(status))
        );

        const costSource = [];
        allRecords.forEach((record) => {
            const normalizedStatus = this.normalizeStatus(record?.status);
            if (!requestedCostStatuses.has(normalizedStatus)) {
                return;
            }

            const recognitionDate = this.getCostRecognitionDate(record);
            if (!recognitionDate) {
                return;
            }

            costSource.push({
                ...record,
                _analysisDate: recognitionDate
            });
        });

        const costDataset = originalBuildDataset(costSource, {
            ...this.stripFilterState(filterState || {}),
            dateFrom: period.dateFrom,
            dateTo: period.dateTo,
            rangeDays: period.rangeDays,
            useDefaultPeriod: false
        }, {
            moduleKey: dataset?.moduleKey || filterState?.moduleKey || options.moduleKey || 'analytics',
            useDefaultPeriod: false,
            recordPredicate: dataset?.recordPredicate || options.recordPredicate || null,
            cacheKey: ''
        });

        const costMetrics = originalComputeMetrics(costDataset, {
            ...options,
            allRecords: costSource,
            costStatuses: Array.from(requestedCostStatuses)
        });

        const mergedMetrics = {
            ...operationalMetrics
        };

        COST_METRIC_KEYS.forEach((key) => {
            mergedMetrics[key] = costMetrics[key];
        });

        mergedMetrics.partsPerSolicitation = mergedMetrics.totalRequests > 0
            ? mergedMetrics.totalPieces / mergedMetrics.totalRequests
            : 0;
        mergedMetrics.byMonth = mergeMonthlySeries(operationalMetrics.byMonth, costMetrics.byMonth);
        mergedMetrics.monthSpan = Math.max(mergedMetrics.byMonth.length, 1);
        mergedMetrics.monthlyAverageRequests = mergedMetrics.monthSpan > 0
            ? mergedMetrics.totalRequests / mergedMetrics.monthSpan
            : 0;
        mergedMetrics.latestMonth = mergedMetrics.byMonth[mergedMetrics.byMonth.length - 1] || null;

        this.logAnalytics('approval_cost_recognition_recomputed', {
            moduleKey: dataset?.moduleKey || options.moduleKey || 'analytics',
            totalRequests: mergedMetrics.totalRequests,
            totalApproved: mergedMetrics.totalApproved,
            totalCost: mergedMetrics.totalCost,
            recognitionBasis: 'approvedAt'
        });

        return mergedMetrics;
    };

    engine.__approvalCostRecognitionInstalled = true;
})(typeof window !== 'undefined' ? window : globalThis);
