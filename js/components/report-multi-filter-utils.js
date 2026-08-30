export function normalizeMultiValues(values = []) {
    const source = Array.isArray(values) ? values : (values ? [values] : []);
    return Array.from(new Set(source.map((value) => String(value || '').trim()).filter(Boolean)));
}

export function normalizeComparable(value = '') {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
}

export function matchesAnySelected(candidates = [], selected = [], normalizer = normalizeComparable) {
    const selectedValues = normalizeMultiValues(selected).map(normalizer);
    if (selectedValues.length === 0) {
        return true;
    }

    const candidateValues = normalizeMultiValues(candidates).map(normalizer);
    return candidateValues.some((candidate) => selectedValues.includes(candidate));
}

export function getRecordSupplierCandidates(record = {}) {
    const candidates = [record.fornecedorId, record.supplierId];
    const items = Array.isArray(record.itens) ? record.itens : [];
    items.forEach((item) => {
        candidates.push(item?.fornecedorId, item?.supplierId);
    });
    return normalizeMultiValues(candidates);
}

export function scopeRecordToSuppliers(record = {}, selectedSupplierIds = []) {
    const selected = normalizeMultiValues(selectedSupplierIds);
    if (selected.length === 0) {
        return record;
    }

    const selectedSet = new Set(selected);
    const items = Array.isArray(record.itens) ? record.itens : [];
    const recordSupplier = String(record.fornecedorId || record.supplierId || '').trim();

    if (items.length === 0) {
        return selectedSet.has(recordSupplier) ? record : null;
    }

    let allItemsCost = 0;
    let selectedItemsCost = 0;
    let selectedPieces = 0;
    const selectedItems = [];

    items.forEach((item) => {
        const quantity = Number(item?.quantidade) || 0;
        const unitValue = Number(item?.valorUnit) || 0;
        const itemCost = quantity * unitValue;
        const supplierId = String(item?.fornecedorId || item?.supplierId || recordSupplier || '').trim();
        allItemsCost += itemCost;

        if (selectedSet.has(supplierId)) {
            selectedItems.push(item);
            selectedItemsCost += itemCost;
            selectedPieces += quantity;
        }
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
        _analysisPieces: selectedPieces,
        _premiumSupplierScoped: true
    };
}
