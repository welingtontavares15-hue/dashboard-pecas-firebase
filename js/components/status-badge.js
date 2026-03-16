export { normalizePipelineStatus, badgeClassByPipelineStatus } from './badge-status.js';

export const PIPELINE_STATUSES = [
    'PENDENTE_APROVACAO',
    'APROVADO',
    'EM_COMPRA',
    'CONCLUIDO',
    'REPROVADO'
];

export function getStatusToneByPipelineStatus(status) {
    const toneMap = {
        CRIADO: 'neutral',
        PENDENTE_APROVACAO: 'warning',
        APROVADO: 'success',
        EM_COMPRA: 'warning',
        ENVIADO: 'info',
        CONCLUIDO: 'success',
        REPROVADO: 'danger'
    };
    return toneMap[status] || 'neutral';
}

