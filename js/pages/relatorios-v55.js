import { ensureClassicScript } from '../lazy/load-script.js';
import { applyReportsModernization } from '../components/reports-modern.js?v=20260829c';
import { applyReportsMultiSelect } from '../components/reports-multi-select.js?v=20260830a';
import { applyReportsChartHardeningV55 } from '../components/reports-chart-hardening-v55.js?v=20260829c';

let ready = false;

function resolveApprovalDate(solicitation = {}) {
    const engine = window.AnalyticsEngine;
    if (engine && typeof engine.getCostRecognitionDate === 'function') {
        const resolved = engine.getCostRecognitionDate(solicitation);
        if (resolved instanceof Date && !Number.isNaN(resolved.getTime())) {
            return resolved;
        }
    }

    const raw = solicitation?.approvedAt;
    if (!raw) {
        return null;
    }

    const parsed = window.Utils?.parseAsLocalDate
        ? window.Utils.parseAsLocalDate(raw)
        : new Date(raw);
    return parsed instanceof Date && !Number.isNaN(parsed.getTime()) ? parsed : null;
}

function formatApprovalDate(solicitation = {}) {
    const approvalDate = resolveApprovalDate(solicitation);
    if (!approvalDate) {
        return '';
    }

    return typeof window.Utils?.formatDate === 'function'
        ? window.Utils.formatDate(approvalDate, true)
        : approvalDate.toISOString();
}

function transformExportRows(rows = [], solicitations = []) {
    const byNumber = new Map(
        (Array.isArray(solicitations) ? solicitations : [])
            .filter((solicitation) => solicitation?.numero !== undefined && solicitation?.numero !== null)
            .map((solicitation) => [String(solicitation.numero), solicitation])
    );

    return (Array.isArray(rows) ? rows : []).map((row = {}) => {
        const solicitation = byNumber.get(String(row.Numero ?? '')) || null;
        const requestDate = row.DataSolicitacao ?? row.Data ?? '';
        const approvalDate = solicitation
            ? formatApprovalDate(solicitation)
            : (row.DataAprovacao || '');
        const transformed = {};
        let datesInserted = false;

        Object.entries(row).forEach(([key, value]) => {
            if (key === 'Data' || key === 'DataSolicitacao' || key === 'DataAprovacao') {
                if (!datesInserted) {
                    transformed.DataSolicitacao = requestDate;
                    transformed.DataAprovacao = approvalDate;
                    datesInserted = true;
                }
                return;
            }
            transformed[key] = value;
        });

        if (!datesInserted) {
            transformed.DataSolicitacao = requestDate;
            transformed.DataAprovacao = approvalDate;
        }

        return transformed;
    });
}

function wrapExportMethod(relatorios, methodName, getSolicitations) {
    if (!relatorios || typeof relatorios[methodName] !== 'function') {
        return;
    }

    const original = relatorios[methodName];
    if (original.__approvalDateColumnsWrapped) {
        return;
    }

    const patched = function patchedExportWithApprovalDate(...args) {
        const solicitations = getSolicitations.call(this);
        const originalExportToExcel = window.Utils?.exportToExcel;

        if (typeof originalExportToExcel !== 'function') {
            return original.apply(this, args);
        }

        window.Utils.exportToExcel = (rows, filename, sheetName) => originalExportToExcel.call(
            window.Utils,
            transformExportRows(rows, solicitations),
            filename,
            sheetName
        );

        try {
            return original.apply(this, args);
        } finally {
            window.Utils.exportToExcel = originalExportToExcel;
        }
    };

    patched.__approvalDateColumnsWrapped = true;
    patched.__originalExport = original;
    relatorios[methodName] = patched;
}

function installApprovalDateColumns() {
    const relatorios = window.Relatorios;
    if (!relatorios || relatorios.__approvalDateColumnsInstalled) {
        return;
    }

    wrapExportMethod(relatorios, 'exportSolicitacoes', function getSolicitationRows() {
        return typeof this.getFilteredSolicitations === 'function'
            ? this.getFilteredSolicitations()
            : [];
    });

    wrapExportMethod(relatorios, 'exportCustos', function getCostRows() {
        if (typeof this.getFilteredCostSolicitations === 'function') {
            return this.getFilteredCostSolicitations();
        }
        return typeof this.getFilteredSolicitations === 'function'
            ? this.getFilteredSolicitations()
            : [];
    });

    relatorios.__approvalDateColumnsInstalled = true;
}

function applyEnhancements() {
    installApprovalDateColumns();
    applyReportsModernization();
    applyReportsMultiSelect();
    applyReportsChartHardeningV55();
}

export async function ensureLoaded() {
    if (ready && typeof window.Relatorios !== 'undefined') {
        applyEnhancements();
        return;
    }

    await ensureClassicScript(new URL('../relatorios.js?v=20260901b', import.meta.url).href, 'Relatorios');
    applyEnhancements();
    ready = true;
}

export function render() {
    if (typeof window.Relatorios?.render === 'function') {
        applyEnhancements();
        window.Relatorios.render();
    }
}
