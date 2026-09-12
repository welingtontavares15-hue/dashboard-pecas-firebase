/**
 * Catalog compatibility policy.
 *
 * Historical versions of this file hid electrical parts from the active catalog.
 * Electrical parts are valid requestable items and must remain visible. The legacy
 * filename is intentionally preserved because index.html and the service worker
 * already load/cache it.
 *
 * The policy now has two responsibilities only:
 * 1) preserve every catalog category, including "Elétrica";
 * 2) canonicalize CS codes such as "CS 135" to "CS135" on reads and writes.
 */
(function installCatalogCompatibilityPolicy(global) {
    'use strict';

    function normalize(value) {
        return String(value || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .trim()
            .toLowerCase();
    }

    function isElectricalCategory(value) {
        return ['eletrica', 'eletrico', 'eletricas', 'eletricos'].includes(normalize(value));
    }

    function isElectricalPart(part) {
        return Boolean(part && isElectricalCategory(part.categoria || part.category));
    }

    function canonicalizePartCode(value) {
        const raw = String(value ?? '').trim();
        if (!raw) return '';

        const csMatch = raw.match(/^cs\s*[-_ ]?\s*(\d{1,4})$/i);
        if (!csMatch) return raw;

        return `CS${csMatch[1].padStart(3, '0')}`;
    }

    function normalizePart(part) {
        if (!part || typeof part !== 'object') return part;
        const codigo = canonicalizePartCode(part.codigo);
        return codigo && codigo !== part.codigo ? { ...part, codigo } : { ...part };
    }

    function filterParts(parts) {
        // Backward-compatible method name. No category is filtered anymore.
        return Array.isArray(parts) ? parts.map(normalizePart) : [];
    }

    function normalizeImportRow(row) {
        if (!row || typeof row !== 'object') return row;
        const code = row.codigo ?? row.Código ?? row.CODIGO;
        const canonical = canonicalizePartCode(code);
        if (!canonical) return { ...row };
        return { ...row, codigo: canonical };
    }

    const policy = Object.freeze({
        id: 'catalog-all-categories-v2',
        excludedCategories: Object.freeze([]),
        allowsElectricalParts: true,
        normalize,
        isElectricalCategory,
        isElectricalPart,
        canonicalizePartCode,
        normalizePart,
        filterParts
    });

    global.ElectricalCatalogPolicy = policy;
    global.CatalogCompatibilityPolicy = policy;

    function patchDataManager() {
        const manager = global.DataManager;
        if (!manager || manager.__electricalPolicyInstalled) return false;

        const readMethods = ['getParts', 'getPecas', 'getPartsCatalog', 'getCatalogParts'];
        readMethods.forEach((name) => {
            if (typeof manager[name] !== 'function') return;
            const original = manager[name].bind(manager);
            manager[name] = function visibleNormalizedCatalogReader(...args) {
                return filterParts(original(...args));
            };
        });

        if (typeof manager.savePart === 'function') {
            const originalSavePart = manager.savePart.bind(manager);
            manager.savePart = function saveNormalizedPart(part, ...args) {
                return originalSavePart(normalizePart(part), ...args);
            };
        }

        if (typeof manager.importParts === 'function') {
            const originalImportParts = manager.importParts.bind(manager);
            manager.importParts = function importNormalizedParts(rows, ...args) {
                const normalizedRows = Array.isArray(rows) ? rows.map(normalizeImportRow) : rows;
                return originalImportParts(normalizedRows, ...args);
            };
        }

        Object.defineProperty(manager, '__electricalPolicyInstalled', {
            value: true,
            configurable: false,
            enumerable: false,
            writable: false
        });
        return true;
    }

    if (!patchDataManager()) {
        const timer = global.setInterval(() => {
            if (patchDataManager()) global.clearInterval(timer);
        }, 50);
        global.setTimeout(() => global.clearInterval(timer), 10000);
    }
})(window);
