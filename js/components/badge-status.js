export function normalizePipelineStatus(status) {
    const key = String(status || '').trim().toLowerCase();
    const map = {
        rascunho: 'PENDENTE_APROVACAO',
        enviada: 'PENDENTE_APROVACAO',
        pendente: 'PENDENTE_APROVACAO',
        aprovada: 'APROVADO',
        rejeitada: 'REPROVADO',
        'em-transito': 'EM_COMPRA',
        entregue: 'CONCLUIDO',
        finalizada: 'CONCLUIDO',
        'historico-manual': 'CONCLUIDO'
    };
    return map[key] || 'PENDENTE_APROVACAO';
}

export function badgeClassByPipelineStatus(pipelineStatus) {
    const cls = {
        CRIADO: 'status-criado',
        PENDENTE_APROVACAO: 'status-pendente-aprovacao',
        APROVADO: 'status-aprovado',
        EM_COMPRA: 'status-em-compra',
        ENVIADO: 'status-enviado',
        CONCLUIDO: 'status-concluido',
        REPROVADO: 'status-reprovado'
    };
    return cls[pipelineStatus] || 'status-criado';
}


