(function () {
    'use strict';

    function normalizeStatus(value) {
        if (typeof DataManager !== 'undefined' && typeof DataManager.normalizeWorkflowStatus === 'function') {
            return DataManager.normalizeWorkflowStatus(value);
        }
        return String(value || '').trim().toLowerCase();
    }

    function canDeleteRejectedTestSolicitation(sol) {
        if (!sol || typeof Auth === 'undefined') return false;
        return Auth.getRole?.() === 'administrador'
            && Auth.hasPermission?.('solicitacoes', 'delete') === true
            && normalizeStatus(sol.status) === 'rejeitada';
    }

    function renderRejectedDeleteAction(sol) {
        if (!canDeleteRejectedTestSolicitation(sol)) return '';
        const safeId = Utils.escapeHtml(String(sol.id || ''));
        return `
            <button type="button"
                    class="btn btn-sm btn-danger rejected-test-delete-action"
                    data-rejected-test-delete="true"
                    data-solicitation-id="${safeId}"
                    onclick="Solicitacoes.confirmRejectedTestDelete('${safeId}')"
                    title="Excluir rejeitado (teste)"
                    aria-label="Excluir pedido rejeitado de teste">
                <i class="fas fa-trash" aria-hidden="true"></i><span>Excluir rejeitado (teste)</span>
            </button>
        `;
    }

    async function confirmRejectedTestDelete(id) {
        if (this.isDeleteSubmitting) return false;

        const sol = DataManager.getSolicitationById(id);
        if (!sol) {
            Utils.showToast('Solicitação não encontrada', 'error');
            return false;
        }

        if (!canDeleteRejectedTestSolicitation(sol)) {
            Utils.showToast('Somente o Administrador pode excluir solicitações rejeitadas de teste.', 'error');
            return false;
        }

        const firstConfirmation = await Utils.confirm(
            `A solicitação #${sol.numero || sol.id} está rejeitada. Use esta opção somente para registros de teste. Um backup automático será criado antes da remoção. Deseja continuar?`,
            'Excluir rejeitado de teste'
        );
        if (!firstConfirmation) return false;

        const finalConfirmation = await Utils.confirm(
            `Confirma a exclusão definitiva da solicitação #${sol.numero || sol.id} da base ativa?`,
            'Confirmação final'
        );
        if (!finalConfirmation) return false;

        this.isDeleteSubmitting = true;
        try {
            const result = await DataManager.deleteSolicitation(id);
            const success = result === true || (result && result.success !== false && !result.error);
            if (!success) {
                Utils.showToast(result?.message || result?.error || 'Não foi possível excluir a solicitação', 'error');
                return false;
            }

            Utils.showToast('Solicitação rejeitada de teste excluída com sucesso', 'success');
            this.refreshTable?.();
            Auth.renderMenu?.(typeof App !== 'undefined' ? App.currentPage : 'solicitacoes');
            return true;
        } finally {
            this.isDeleteSubmitting = false;
        }
    }

    function patch() {
        const solicitacoes = window.Solicitacoes;
        if (!solicitacoes || solicitacoes.__rejectedTestDeletePatchApplied) return false;

        const baseRenderDivisionEditAction = typeof solicitacoes.renderDivisionEditAction === 'function'
            ? solicitacoes.renderDivisionEditAction.bind(solicitacoes)
            : () => '';

        solicitacoes.renderDivisionEditAction = function renderDivisionEditActionWithRejectedDelete(sol) {
            return `${baseRenderDivisionEditAction(sol)}${renderRejectedDeleteAction(sol)}`;
        };

        solicitacoes.confirmRejectedTestDelete = confirmRejectedTestDelete;
        solicitacoes.__rejectedTestDeletePatchApplied = true;
        return true;
    }

    window.SolicitacoesRejectedDeletePatch = Object.freeze({
        patch,
        normalizeStatus,
        canDeleteRejectedTestSolicitation,
        renderRejectedDeleteAction
    });
})();
