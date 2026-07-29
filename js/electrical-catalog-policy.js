/**
 * Política premium do catálogo: oculta categorias elétricas sem apagar histórico.
 * Camada reversível carregada após data.js e antes dos módulos de interface.
 */
(function installElectricalCatalogPolicy(global) {
    'use strict';

    const EXCLUDED = new Set(['eletrica', 'eletrico', 'eletricas', 'eletricos']);

    function normalize(value) {
        return String(value || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .trim()
            .toLowerCase();
    }

    function isElectricalCategory(value) {
        return EXCLUDED.has(normalize(value));
    }

    function isElectricalPart(part) {
        return Boolean(part && isElectricalCategory(part.categoria || part.category));
    }

    function filterParts(parts) {
        return Array.isArray(parts) ? parts.filter((part) => !isElectricalPart(part)) : [];
    }

    const policy = Object.freeze({
        id: 'catalog-no-electrical-v1',
        excludedCategories: Object.freeze(Array.from(EXCLUDED)),
        normalize,
        isElectricalCategory,
        isElectricalPart,
        filterParts
    });

    global.ElectricalCatalogPolicy = policy;

    function patchDataManager() {
        const manager = global.DataManager;
        if (!manager || manager.__electricalPolicyInstalled) return false;

        const readMethods = ['getParts', 'getPecas', 'getPartsCatalog', 'getCatalogParts'];
        readMethods.forEach((name) => {
            if (typeof manager[name] !== 'function') return;
            const original = manager[name].bind(manager);
            manager[name] = function filteredCatalogReader(...args) {
                return filterParts(original(...args));
            };
        });

        const writeMethods = ['addPart', 'addPeca', 'savePart', 'savePeca', 'createPart', 'updatePart'];
        writeMethods.forEach((name) => {
            if (typeof manager[name] !== 'function') return;
            const original = manager[name].bind(manager);
            manager[name] = function guardedCatalogWriter(part, ...args) {
                if (isElectricalPart(part)) {
                    return { success: false, error: 'A categoria elétrica foi excluída do catálogo ativo.' };
                }
                return original(part, ...args);
            };
        });

        Object.defineProperty(manager, '__electricalPolicyInstalled', {
            value: true,
            configurable: false,
            enumerable: false,
            writable: false
        });
        return true;
    }

    function sanitizeCategoryControls(root = document) {
        root.querySelectorAll('select').forEach((select) => {
            Array.from(select.options).forEach((option) => {
                if (isElectricalCategory(option.value) || isElectricalCategory(option.textContent)) {
                    option.remove();
                }
            });
        });
    }

    function installDomGuard() {
        sanitizeCategoryControls();
        const observer = new MutationObserver(() => sanitizeCategoryControls());
        observer.observe(document.documentElement, { childList: true, subtree: true });
    }

    if (!patchDataManager()) {
        const timer = global.setInterval(() => {
            if (patchDataManager()) global.clearInterval(timer);
        }, 50);
        global.setTimeout(() => global.clearInterval(timer), 10000);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', installDomGuard, { once: true });
    } else {
        installDomGuard();
    }
})(window);
