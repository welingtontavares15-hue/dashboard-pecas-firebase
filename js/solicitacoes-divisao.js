(function (root) {
    'use strict';

    const VERSION = '20260903a';
    const VALID = new Set(['F&B', 'IN']);
    const normalize = (value) => {
        const raw = String(value || '').trim().toUpperCase().replace(/\s+/g, '');
        if (['F&B', 'FB', 'F-E-B', 'F_E_B'].includes(raw)) return 'F&B';
        return raw === 'IN' ? 'IN' : '';
    };
    const label = (value) => normalize(value) || 'Não classificado';
    const esc = (value) => root.Utils?.escapeHtml
        ? root.Utils.escapeHtml(String(value ?? ''))
        : String(value ?? '')
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
    const badge = (value) => {
        const division = normalize(value);
        const muted = division ? '' : 'opacity:.68;';
        return `<span title="Divisão" style="display:inline-flex;align-items:center;gap:4px;margin-left:7px;padding:2px 7px;border-radius:999px;border:1px solid rgba(20,184,166,.28);font-size:11px;font-weight:700;${muted}"><i class="fas fa-layer-group"></i>${esc(division || 'Não classificado')}</span>`;
    };

    function canClassify(sol) {
        if (!root.Auth?.hasPermission?.('solicitacoes', 'edit')) return false;
        return !root.Solicitacoes?.canCurrentUserAccessSolicitation
            || root.Solicitacoes.canCurrentUserAccessSolicitation(sol);
    }

    function injectNewDivisionField(s) {
        const form = root.document?.getElementById('sol-form');
        if (!form || root.document.getElementById('sol-divisao')) return;
        const row = form.querySelector('.form-row');
        if (!row) return;

        const current = normalize(s.currentSolicitation?.divisao);
        const group = root.document.createElement('div');
        group.className = 'form-group';
        group.innerHTML = `
            <label for="sol-divisao">Divisão *</label>
            <select id="sol-divisao" class="form-control" required>
                <option value="">Selecione...</option>
                <option value="F&amp;B" ${current === 'F&B' ? 'selected' : ''}>F&amp;B</option>
                <option value="IN" ${current === 'IN' ? 'selected' : ''}>IN</option>
            </select>
            <small style="display:block;margin-top:5px;color:#6b7280;font-size:.75rem">Obrigatório para novos pedidos.</small>
        `;

        const supplierGroup = row.querySelector('[for="sol-fornecedor-sel"]')?.closest('.form-group')
            || row.querySelector('#sol-fornecedor')?.closest('.form-group');
        supplierGroup ? row.insertBefore(group, supplierGroup) : row.appendChild(group);
        group.querySelector('select')?.addEventListener('change', (event) => {
            if (s.currentSolicitation) s.currentSolicitation.divisao = normalize(event.target.value);
        });
    }

    function enhanceList(s, html) {
        if (typeof html !== 'string' || !html) return html;
        const rows = s.getFilteredSolicitations?.() || [];
        const size = Number(s.itemsPerPage || 10);
        const start = Math.max(0, (Number(s.currentPage || 1) - 1) * size);
        let output = html;

        rows.slice(start, start + size).forEach((sol) => {
            const id = String(sol?.id || '');
            if (!id) return;
            const number = String(sol?.numero || '');
            if (number) {
                const needle = `<strong>#${esc(number)}</strong>`;
                if (output.includes(needle)) output = output.replace(needle, `${needle}${badge(sol.divisao)}`);
            }

            const safeId = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            output = output.replace(
                new RegExp(`<button[^>]*onclick="Solicitacoes\\.openForm\\('${safeId}'\\)"[^>]*>[\\s\\S]*?<\\/button>`, 'g'),
                ''
            );
            if (!canClassify(sol)) return;

            const tableView = new RegExp(`(<button class="btn btn-sm btn-outline" onclick="Solicitacoes\\.viewDetails\\('${safeId}'\\)" title="Visualizar">[\\s\\S]*?<\\/button>)`);
            if (tableView.test(output)) {
                output = output.replace(tableView, `$1<button class="btn btn-sm btn-outline" onclick="Solicitacoes.openDivisionClassifier('${esc(id)}')" title="Classificar divisão"><i class="fas fa-layer-group"></i></button>`);
                return;
            }

            const techView = new RegExp(`(<button class="primary" type="button" onclick="Solicitacoes\\.viewDetails\\('${safeId}'\\)"><i class="fas fa-eye"><\\/i><span>Detalhes<\\/span><\\/button>)`);
            if (techView.test(output)) {
                output = output.replace(techView, `$1<button type="button" onclick="Solicitacoes.openDivisionClassifier('${esc(id)}')"><i class="fas fa-layer-group"></i><span>Divisão</span></button>`);
            }
        });
        return output;
    }

    function injectDetails(sol) {
        if (!root.document || !sol) return;
        const bodies = Array.from(root.document.querySelectorAll('.modal-body'));
        const body = bodies[bodies.length - 1];
        if (!body || body.querySelector('[data-division-details]')) return;
        const group = root.document.createElement('div');
        group.className = 'form-group';
        group.dataset.divisionDetails = 'true';
        group.innerHTML = `<label>Divisão</label><p><strong>${esc(label(sol.divisao))}</strong></p>`;
        const row = body.querySelector('.form-row');
        row ? row.appendChild(group) : body.prepend(group);
    }

    function patch() {
        const s = root.Solicitacoes;
        if (!s || s.__divisionClassificationPatched) return false;

        const originalOpenForm = s.openForm.bind(s);
        const originalSave = s.saveSolicitation.bind(s);
        const originalTable = s.renderTable.bind(s);
        const originalDetails = s.viewDetails.bind(s);

        s.normalizeDivision = normalize;
        s.getDivisionLabel = label;

        s.openForm = function (id = null) {
            if (id) return this.openDivisionClassifier(id);
            const result = originalOpenForm();
            injectNewDivisionField(this);
            return result;
        };

        s.saveSolicitation = async function (status = 'pendente') {
            if (!this.currentSolicitation?.id) {
                const select = root.document?.getElementById('sol-divisao');
                const division = normalize(select?.value || this.currentSolicitation?.divisao);
                if (!VALID.has(division)) {
                    root.Utils?.showToast?.('Selecione a divisão F&B ou IN antes de enviar a solicitação.', 'warning');
                    select?.focus?.();
                    return;
                }
                this.currentSolicitation.divisao = division;
            }
            return originalSave(status);
        };

        s.openDivisionClassifier = function (id) {
            const sol = root.DataManager?.getSolicitationById?.(id);
            if (!sol) return root.Utils?.showToast?.('Solicitação não encontrada', 'error');
            if (!canClassify(sol)) return root.Utils?.showToast?.('Você não tem permissão para classificar esta solicitação.', 'error');

            const current = normalize(sol.divisao);
            const technician = this.getRequesterName?.(sol, 'Não informado') || sol.tecnicoNome || 'Não informado';
            root.Utils.showModal(`
                <div class="modal-header">
                    <h3>Classificar Divisão - Solicitação #${esc(sol.numero || id)}</h3>
                    <button class="modal-close" onclick="Utils.closeModal()"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body">
                    <div style="margin-bottom:16px;padding:11px 13px;border:1px solid rgba(20,184,166,.22);border-radius:8px">
                        Em pedidos já existentes, somente a divisão será alterada. Os demais dados permanecem bloqueados.
                    </div>
                    <div class="form-row">
                        <div class="form-group"><label>Pedido</label><p><strong>#${esc(sol.numero || '-')}</strong></p></div>
                        <div class="form-group"><label>Data</label><p><strong>${esc(root.Utils?.formatDate?.(sol.data || sol.createdAt) || '-')}</strong></p></div>
                        <div class="form-group"><label>Técnico</label><p><strong>${esc(technician)}</strong></p></div>
                        <div class="form-group"><label>Cliente</label><p><strong>${esc(sol.cliente || 'Não informado')}</strong></p></div>
                    </div>
                    <div class="form-group">
                        <label for="sol-divisao-classificacao">Divisão *</label>
                        <select id="sol-divisao-classificacao" class="form-control" required>
                            <option value="">Selecione...</option>
                            <option value="F&amp;B" ${current === 'F&B' ? 'selected' : ''}>F&amp;B</option>
                            <option value="IN" ${current === 'IN' ? 'selected' : ''}>IN</option>
                        </select>
                    </div>
                    <input type="hidden" id="sol-divisao-classificacao-id" value="${esc(id)}">
                </div>
                <div class="modal-footer">
                    <button class="btn btn-outline" onclick="Utils.closeModal()">Cancelar</button>
                    <button class="btn btn-primary" onclick="Solicitacoes.saveDivisionClassification()"><i class="fas fa-save"></i> Salvar Classificação</button>
                </div>
            `, { size: 'md' });
        };

        s.saveDivisionClassification = async function () {
            if (this.isDivisionClassificationSubmitting) return;
            const id = root.document?.getElementById('sol-divisao-classificacao-id')?.value || '';
            const select = root.document?.getElementById('sol-divisao-classificacao');
            const division = normalize(select?.value);
            if (!VALID.has(division)) {
                root.Utils?.showToast?.('Selecione F&B ou IN.', 'warning');
                select?.focus?.();
                return;
            }

            const sol = root.DataManager?.getSolicitationById?.(id);
            if (!sol) return root.Utils?.showToast?.('Solicitação não encontrada', 'error');
            if (!canClassify(sol)) return root.Utils?.showToast?.('Você não tem permissão para classificar esta solicitação.', 'error');

            const user = root.Auth?.getCurrentUser?.() || {};
            const now = Date.now();
            const history = Array.isArray(sol.divisaoClassificacaoHistorico) ? sol.divisaoClassificacaoHistorico.slice() : [];
            history.push({ divisao: division, at: now, by: user.name || 'Sistema', byUserId: user.id || null, byEmail: user.email || null, byRole: user.role || null });

            this.isDivisionClassificationSubmitting = true;
            try {
                const result = await root.DataManager.saveSolicitation({
                    ...sol,
                    divisao: division,
                    divisaoClassificadaEm: now,
                    divisaoClassificadaPor: user.name || 'Sistema',
                    divisaoClassificacaoHistorico: history,
                    updatedBy: user.name || sol.updatedBy || 'Sistema'
                });
                const saved = result === true || (result && result.success !== false && !result.error);
                if (!saved) return root.Utils?.showToast?.(result?.message || result?.error || 'Não foi possível salvar a classificação.', 'error');

                root.Utils?.showToast?.(`Solicitação #${sol.numero || ''} classificada como ${division}.`, 'success');
                root.Utils?.closeModal?.();
                if (root.document?.getElementById('sol-table-container')) this.refreshTable?.();
                root.Auth?.renderMenu?.(root.App?.currentPage);
            } finally {
                this.isDivisionClassificationSubmitting = false;
            }
        };

        s.renderTable = function () { return enhanceList(this, originalTable()); };
        s.viewDetails = function (id) {
            const sol = root.DataManager?.getSolicitationById?.(id);
            const result = originalDetails(id);
            injectDetails(sol);
            return result;
        };

        s.exportList = function () {
            if (!root.XLSX) return root.Utils?.showToast?.('Exportação indisponível: biblioteca XLSX não carregada', 'warning');
            const solicitations = this.getFilteredSolicitations?.() || [];
            if (!solicitations.length) return root.Utils?.showToast?.('Não há dados para exportar', 'warning');
            const data = solicitations.map((sol) => ({
                Numero: sol.numero,
                Tecnico: this.getRequesterName(sol),
                Cliente: sol.cliente || 'Nao informado',
                Divisao: label(sol.divisao),
                Peca: this.getPieceSummary(sol.itens || []).full,
                Data: root.Utils.formatDate(sol.data),
                QtdItens: (sol.itens || []).length,
                Subtotal: sol.subtotal,
                Desconto: sol.desconto,
                Frete: sol.frete,
                Total: sol.total,
                Rastreio: sol.trackingCode || '',
                Status: root.Utils.getStatusInfo(sol.status).label,
                Observacoes: sol.observacoes || ''
            }));
            root.Utils.exportToExcel(data, 'solicitacoes.xlsx', 'Solicitações');
            root.Utils.showToast('Lista exportada com sucesso', 'success');
        };

        s.__divisionClassificationPatched = true;
        return true;
    }

    function init() {
        if (patch()) return;
        let attempts = 0;
        const timer = root.setInterval?.(() => {
            attempts += 1;
            if (patch() || attempts >= 120) root.clearInterval?.(timer);
        }, 100);
    }

    root.SolicitacoesDivisaoPatch = Object.freeze({ version: VERSION, normalize, label, patch });
    if (root.document) root.document.readyState === 'loading'
        ? root.document.addEventListener('DOMContentLoaded', init, { once: true })
        : init();
})(typeof window !== 'undefined' ? window : globalThis);
