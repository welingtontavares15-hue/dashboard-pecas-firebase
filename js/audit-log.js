const AuditLog = {
    STORAGE_KEY: 'diversey_audit_log',
    MAX_ENTRIES: 1500,

    read() {
        try {
            return JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '[]');
        } catch (_err) {
            return [];
        }
    },

    write(entries) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(entries.slice(0, this.MAX_ENTRIES)));
    },

    add(entry) {
        const payload = {
            usuario: Auth?.getCurrentUser?.()?.username || 'sistema',
            acao: entry.acao || 'evento',
            data: Date.now(),
            solicitacao: entry.solicitacao || null,
            campo: entry.campo || null,
            valorAntigo: entry.valorAntigo ?? null,
            valorNovo: entry.valorNovo ?? null
        };

        const entries = this.read();
        entries.unshift(payload);
        this.write(entries);
    },

    installPatches() {
        if (this._patched || typeof DataManager === 'undefined') {
            return;
        }
        this._patched = true;

        const saveSolicitation = DataManager.saveSolicitation?.bind(DataManager);
        if (saveSolicitation) {
            DataManager.saveSolicitation = async (solicitation) => {
                const previous = solicitation?.id ? DataManager.getSolicitationById(solicitation.id) : null;
                const result = await saveSolicitation(solicitation);
                const success = result === true || (result && result.success !== false);
                if (success) {
                    const current = result?.solicitation || solicitation;
                    this.add({
                        acao: previous ? 'solicitacao_atualizada' : 'solicitacao_criada',
                        solicitacao: current?.numero || current?.id || solicitation?.numero || solicitation?.id || null,
                        campo: 'solicitacao',
                        valorAntigo: previous ? JSON.stringify({ status: previous.status, total: previous.total }) : null,
                        valorNovo: JSON.stringify({ status: current?.status || solicitation?.status, total: current?.total || solicitation?.total })
                    });
                }
                return result;
            };
        }

        const updateSolicitationStatus = DataManager.updateSolicitationStatus?.bind(DataManager);
        if (updateSolicitationStatus) {
            DataManager.updateSolicitationStatus = async (id, status, extra) => {
                const previous = DataManager.getSolicitationById(id);
                const result = await updateSolicitationStatus(id, status, extra);
                if (result === true || (result && result.success !== false)) {
                    const current = result?.solicitation || DataManager.getSolicitationById(id);
                    this.add({
                        acao: 'status_alterado',
                        solicitacao: current?.numero || id,
                        campo: 'status',
                        valorAntigo: previous?.status || null,
                        valorNovo: current?.status || status
                    });
                }
                return result;
            };
        }
    }
};

window.AuditLog = AuditLog;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => AuditLog.installPatches());
} else {
    AuditLog.installPatches();
}
