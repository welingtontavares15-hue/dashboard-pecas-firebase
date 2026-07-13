const DEFAULT_RANGE_DAYS = 30;

function normalizeStatus(value) {
    if (typeof AnalyticsHelper !== 'undefined' && typeof AnalyticsHelper.normalizeStatus === 'function') {
        return AnalyticsHelper.normalizeStatus(value);
    }
    return String(value || '').trim().toLowerCase().replace(/_/g, '-');
}

function getSolicitationCost(solicitation = {}) {
    const items = Array.isArray(solicitation.itens) ? solicitation.itens : [];
    const itemsTotal = items.reduce((sum, item) => {
        const quantity = Number(item?.quantidade) || 0;
        const unitValue = Number(item?.valorUnit) || 0;
        return sum + (quantity * unitValue);
    }, 0);
    return itemsTotal > 0 ? itemsTotal : (Number(solicitation.total) || 0);
}

function getPeriod(days) {
    if (typeof AnalyticsHelper !== 'undefined' && typeof AnalyticsHelper.normalizePeriod === 'function') {
        return AnalyticsHelper.normalizePeriod({ rangeDays: days });
    }
    const end = new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - Math.max(days - 1, 0));
    const toInput = (date) => date.toISOString().slice(0, 10);
    return { dateFrom: toInput(start), dateTo: toInput(end), rangeDays: days };
}

function getDateValue(solicitation = {}) {
    const value = solicitation.createdAt || solicitation.data || solicitation.updatedAt || 0;
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function getVisibleSolicitations(days) {
    const period = getPeriod(days);
    const from = new Date(`${period.dateFrom}T00:00:00`).getTime();
    const to = new Date(`${period.dateTo}T23:59:59.999`).getTime();
    const all = DataManager.getSolicitations().filter((item) => {
        return typeof Dashboard.canAccessDashboardRecord !== 'function' || Dashboard.canAccessDashboardRecord(item);
    });

    return all.filter((item) => {
        const timestamp = getDateValue(item);
        return timestamp >= from && timestamp <= to;
    }).sort((a, b) => getDateValue(b) - getDateValue(a));
}

function metricCard(label, value, note, icon) {
    return `
        <article class="focus-kpi">
            <div class="focus-kpi-top">
                <span class="focus-kpi-label">${Utils.escapeHtml(label)}</span>
                <span class="focus-kpi-icon"><i class="fas ${icon}"></i></span>
            </div>
            <div class="focus-kpi-value">${value}</div>
            <div class="focus-kpi-note">${Utils.escapeHtml(note)}</div>
        </article>
    `;
}

function renderActions() {
    const actions = [];
    if (Auth.hasPermission('solicitacoes', 'create')) {
        actions.push('<button class="btn btn-primary btn-sm" onclick="App.navigate(\'nova-solicitacao\')"><i class="fas fa-plus"></i> Nova solicitação</button>');
    }
    if (Auth.hasPermission('solicitacoes', 'view')) {
        actions.push('<button class="btn btn-outline btn-sm" onclick="App.navigate(\'solicitacoes\')"><i class="fas fa-list"></i> Solicitações</button>');
    }
    if (Auth.hasPermission('aprovacoes', 'view')) {
        actions.push('<button class="btn btn-outline btn-sm" onclick="App.navigate(\'aprovacoes\')"><i class="fas fa-check-double"></i> Aprovações</button>');
    }
    return actions.join('');
}

function renderRecentRows(items = []) {
    return items.slice(0, 6).map((item) => `
        <tr>
            <td>${Utils.formatDate(item.data || item.createdAt)}</td>
            <td><strong>#${Utils.escapeHtml(String(item.numero || 'Sem número'))}</strong></td>
            <td>${Utils.escapeHtml(item.tecnicoNome || 'Não informado')}</td>
            <td>${Utils.renderStatusBadge(item.status)}</td>
        </tr>
    `).join('');
}

export function applyDashboardFocus() {
    if (typeof window.Dashboard === 'undefined' || window.Dashboard.__focusDashboard) return;

    window.Dashboard.__focusDashboard = true;
    window.Dashboard.focusRangeDays = Number(window.Dashboard.focusRangeDays) || DEFAULT_RANGE_DAYS;

    window.Dashboard.render = function renderFocusDashboard() {
        const content = document.getElementById('content-area');
        if (!content) return;

        const rangeDays = Number(this.focusRangeDays) || DEFAULT_RANGE_DAYS;
        const items = getVisibleSolicitations(rangeDays);
        const pendingStatuses = new Set(['pendente', 'rascunho', 'enviada']);
        const transitStatuses = new Set(['em-transito']);
        const completedStatuses = new Set(['finalizada', 'entregue', 'historico-manual']);
        const pending = items.filter((item) => pendingStatuses.has(normalizeStatus(item.status))).length;
        const transit = items.filter((item) => transitStatuses.has(normalizeStatus(item.status))).length;
        const completed = items.filter((item) => completedStatuses.has(normalizeStatus(item.status))).length;
        const totalCost = items.reduce((sum, item) => sum + getSolicitationCost(item), 0);
        const recentRows = renderRecentRows(items);

        content.innerHTML = `
            <div class="focus-dashboard">
                <header class="focus-dashboard-header">
                    <div class="focus-dashboard-title">
                        <small>Visão geral</small>
                        <h2>Resumo operacional</h2>
                        <p>Somente os indicadores necessários para decidir e agir.</p>
                    </div>
                    <div class="focus-dashboard-actions">${renderActions()}</div>
                </header>

                <div class="focus-dashboard-toolbar">
                    <label for="focus-period">Período dos indicadores</label>
                    <select id="focus-period" class="form-control" aria-label="Período dos indicadores">
                        <option value="7" ${rangeDays === 7 ? 'selected' : ''}>Últimos 7 dias</option>
                        <option value="30" ${rangeDays === 30 ? 'selected' : ''}>Últimos 30 dias</option>
                        <option value="90" ${rangeDays === 90 ? 'selected' : ''}>Últimos 90 dias</option>
                    </select>
                </div>

                <section class="focus-kpi-grid" aria-label="Indicadores principais">
                    ${metricCard('Aguardando aprovação', Utils.formatNumber(pending), 'Itens que exigem decisão', 'fa-clock')}
                    ${metricCard('Em trânsito', Utils.formatNumber(transit), 'Pedidos em deslocamento', 'fa-truck-fast')}
                    ${metricCard('Concluídas', Utils.formatNumber(completed), `No período de ${rangeDays} dias`, 'fa-circle-check')}
                    ${metricCard('Custo no período', Utils.formatCurrency(totalCost), `${Utils.formatNumber(items.length)} solicitações consideradas`, 'fa-sack-dollar')}
                </section>

                ${pending > 0 && Auth.hasPermission('aprovacoes', 'view') ? `
                    <div class="focus-alert">
                        <div><strong>${Utils.formatNumber(pending)} solicitação(ões)</strong> aguardando análise.</div>
                        <button class="btn btn-outline btn-sm" onclick="App.navigate('aprovacoes')">Revisar agora</button>
                    </div>
                ` : ''}

                <section class="focus-panel">
                    <div class="focus-panel-header">
                        <div>
                            <h3>Solicitações recentes</h3>
                            <p>As seis movimentações mais recentes do período.</p>
                        </div>
                        <button class="btn btn-outline btn-sm" onclick="App.navigate('solicitacoes')">Ver todas</button>
                    </div>
                    ${recentRows ? `
                        <div class="focus-table-wrap">
                            <table class="focus-table">
                                <thead><tr><th>Data</th><th>Solicitação</th><th>Técnico</th><th>Status</th></tr></thead>
                                <tbody>${recentRows}</tbody>
                            </table>
                        </div>
                    ` : '<div class="focus-empty">Nenhuma solicitação encontrada neste período.</div>'}
                </section>
            </div>
        `;

        document.getElementById('focus-period')?.addEventListener('change', (event) => {
            this.focusRangeDays = Number(event.target.value) || DEFAULT_RANGE_DAYS;
            this.render();
        });
    };
}
