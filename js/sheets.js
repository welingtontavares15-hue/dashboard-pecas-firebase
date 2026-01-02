/**
 * Sheet Integration (local log)
 * Keeps a lightweight audit of approvals so they can be exported to Google Sheets or OneDrive later.
 * This is intentionally simple and offline-friendly.
 */

const SHEET_LOG_KEY = 'diversey_sheet_log';
const SHEET_LOG_LIMIT = 200;
const SheetIntegration = {
    recordApproval(solicitation, { approver = '', comment = '', config = null } = {}) {
        if (!solicitation) {
            return false;
        }
        try {
            const itemsLabel = (solicitation.itens || [])
                .map(i => {
                    const label = i.descricao || i.codigo || 'Item';
                    return `${i.quantidade || 0}x ${label}`;
                })
                .join(' | ');
            const entry = {
                numero: solicitation.numero || '',
                tecnico: solicitation.tecnicoNome || '',
                data: solicitation.data || solicitation.createdAt || '',
                itens: itemsLabel,
                total: Number(solicitation.total) || 0,
                status: solicitation.status || '',
                aprovador: approver || solicitation.approvedBy || '',
                aprovadoEm: solicitation.approvedAt || null,
                comentarios: comment || solicitation.approvalComment || '',
                provider: config?.provider || '',
                destino: config?.target || ''
            };
            const log = JSON.parse(localStorage.getItem(SHEET_LOG_KEY) || '[]');
            log.unshift(entry);
            localStorage.setItem(SHEET_LOG_KEY, JSON.stringify(log.slice(0, SHEET_LOG_LIMIT)));
            return true;
        } catch (error) {
            console.warn('Unable to record approval in local sheet log:', error?.message || error);
            return false;
        }
    },

    getLog() {
        try {
            return JSON.parse(localStorage.getItem(SHEET_LOG_KEY) || '[]');
        } catch (_e) {
            return [];
        }
    }
};

window.SheetIntegration = SheetIntegration;
