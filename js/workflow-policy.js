(function (root, factory) {
    const api = factory();
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    if (root) root.WorkflowPolicy = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
    'use strict';

    const STATUS = Object.freeze({
        RASCUNHO: 'rascunho',
        PENDENTE: 'pendente',
        APROVADA: 'aprovada',
        REJEITADA: 'rejeitada',
        EM_TRANSITO: 'em-transito',
        FINALIZADA: 'finalizada',
        HISTORICO_MANUAL: 'historico-manual'
    });

    function normalizeText(value) {
        return String(value || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .trim()
            .toLowerCase();
    }

    function normalizeStatus(status) {
        const raw = normalizeText(String(status || '').replace(/-/g, '_'));
        const aliases = {
            rascunho: STATUS.RASCUNHO,
            enviada: STATUS.PENDENTE,
            criado: STATUS.PENDENTE,
            criada: STATUS.PENDENTE,
            pendente: STATUS.PENDENTE,
            pendente_aprovacao: STATUS.PENDENTE,
            aprovada: STATUS.APROVADA,
            aprovado: STATUS.APROVADA,
            rejeitada: STATUS.REJEITADA,
            reprovado: STATUS.REJEITADA,
            em_transito: STATUS.EM_TRANSITO,
            em_compra: STATUS.EM_TRANSITO,
            entregue: STATUS.FINALIZADA,
            finalizada: STATUS.FINALIZADA,
            concluido: STATUS.FINALIZADA,
            enviado: STATUS.FINALIZADA,
            historico_manual: STATUS.HISTORICO_MANUAL
        };
        return aliases[raw] || (String(status || '').trim() || STATUS.PENDENTE);
    }

    function canTransition(currentStatus, nextStatus) {
        const from = normalizeStatus(currentStatus);
        const to = normalizeStatus(nextStatus);
        if (!to) return false;
        if (from === to) return true;
        if (to === STATUS.HISTORICO_MANUAL) return true;

        const allowed = {
            [STATUS.RASCUNHO]: [STATUS.PENDENTE],
            [STATUS.PENDENTE]: [STATUS.APROVADA, STATUS.REJEITADA],
            [STATUS.APROVADA]: [STATUS.EM_TRANSITO],
            [STATUS.EM_TRANSITO]: [STATUS.FINALIZADA],
            [STATUS.REJEITADA]: [STATUS.PENDENTE],
            [STATUS.FINALIZADA]: []
        };
        if (!Object.prototype.hasOwnProperty.call(allowed, from)) return true;
        return allowed[from].includes(to);
    }

    return Object.freeze({ STATUS, normalizeStatus, canTransition });
});
