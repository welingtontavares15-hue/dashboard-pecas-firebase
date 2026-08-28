const DEFAULT_RANGE_DAYS = 30;
const STATUS_GROUPS = [
    { key: 'pending', label: 'Em aprovação', statuses: ['pendente', 'rascunho', 'enviada'], tone: 'warning' },
    { key: 'approved', label: 'Aprovadas', statuses: ['aprovada'], tone: 'success' },
    { key: 'transit', label: 'Em trânsito', statuses: ['em-transito'], tone: 'info' },
    { key: 'completed', label: 'Finalizadas', statuses: ['finalizada', 'entregue', 'historico-manual'], tone: 'neutral' },
    { key: 'rejected', label: 'Rejeitadas', statuses: ['rejeitada'], tone: 'danger' }
];

function periodFor(days) {
    if (window.AnalyticsHelper?.normalizePeriod) return AnalyticsHelper.normalizePeriod({ rangeDays: days });
    const end = new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - Math.max(days - 1, 0));
    return { dateFrom: start.toISOString().slice(0, 10), dateTo: end.toISOString().slice(0, 10), rangeDays: days };
}

function accessibleSolicitations() {
    const rows = window.DataManager?.getSolicitations?.() || [];
    return rows.filter((row) => typeof Dashboard.canAccessDashboardRecord !== 'function' || Dashboard.canAccessDashboardRecord(row));
}

function analyse(days) {
    const period = periodFor(days);
    const source = accessibleSolicitations();
    const analysis = window.AnalyticsHelper?.buildOperationalAnalysis
        ? AnalyticsHelper.buildOperationalAnalysis(source, {
            moduleKey: 'dashboard-premium',
            period: { dateFrom: period.dateFrom, dateTo: period.dateTo },
            useDefaultPeriod: false,
            cacheKey: `dashboard-premium:${window.Auth?.getRole?.() || 'anon'}`
        })
        : { solicitations: source, totalRequests: source.length, byStatus: {}, byMonth: [], topPieces: [] };
    return { period, analysis };
}

function statusDistribution(analysis) {
    const raw = analysis.byStatus || {};
    return STATUS_GROUPS.map((group) => ({
        ...group,
        value: group.statuses.reduce((sum, status) => sum + (Number(raw[status]) || 0), 0)
    }));
}

function metric(label, value, note, icon, tone = 'blue') {
    return `<article class="premium-kpi premium-kpi-v3 is-${tone}">
        <div class="premium-kpi-heading">
            <span class="premium-kpi-icon" aria-hidden="true"><i class="fas ${icon}"></i></span>
            <span class="premium-kpi-label">${Utils.escapeHtml(label)}</span>
        </div>
        <strong class="premium-kpi-value">${value}</strong>
        <div class="premium-kpi-footer"><span>${Utils.escapeHtml(note)}</span><i class="fas fa-arrow-trend-up" aria-hidden="true"></i></div>
    </article>`;
}

function actions() {
    const html = [];
    if (Auth.hasPermission('solicitacoes', 'create')) html.push('<button class="btn btn-primary btn-sm premium-primary-action" onclick="App.navigate(\'nova-solicitacao\')"><i class="fas fa-plus"></i> Nova solicitação</button>');
    if (Auth.hasPermission('aprovacoes', 'view')) html.push('<button class="btn btn-outline btn-sm" onclick="App.navigate(\'aprovacoes\')"><i class="fas fa-check-double"></i> Aprovações</button>');
    return html.join('');
}

function solicitationCost(row) {
    const items = Array.isArray(row?.itens) ? row.itens : [];
    const total = items.reduce((sum, item) => sum + (Number(item?.quantidade) || 0) * (Number(item?.valorUnit) || 0), 0);
    return total || Number(row?.total) || 0;
}

function recentRows(rows) {
    return (rows || []).slice(0, 7).map((row) => `<tr>
        <td><span class="premium-table-date">${Utils.formatDate(row.data || row.createdAt)}</span></td>
        <td><strong>#${Utils.escapeHtml(String(row.numero || 'Sem número'))}</strong></td>
        <td>${Utils.escapeHtml(row.cliente || row.clienteNome || 'Não informado')}</td>
        <td>${Utils.escapeHtml(row.tecnicoNome || 'Não informado')}</td>
        <td class="premium-money-cell">${Utils.formatCurrency(solicitationCost(row))}</td>
        <td>${Utils.renderStatusBadge(row.status)}</td>
    </tr>`).join('');
}

function topParts(items) {
    if (!items?.length) return '<div class="premium-empty"><i class="fas fa-chart-bar"></i><span>Sem custos de peças no período.</span></div>';
    const max = Number(items[0]?.totalCost) || 1;
    return `<div class="premium-ranking-list">${items.slice(0, 5).map((item, index) => {
        const width = Math.max(8, Math.round(((Number(item.totalCost) || 0) / max) * 100));
        return `<div class="premium-ranking-item">
            <div class="premium-ranking-topline"><span><b>${String(index + 1).padStart(2, '0')}</b>${Utils.escapeHtml(item.descricao || item.codigo || 'Sem descrição')}</span><strong>${Utils.formatCurrency(item.totalCost || 0)}</strong></div>
            <div class="premium-ranking-track"><span style="width:${width}%"></span></div>
            <small>${Utils.formatNumber(item.quantidade || 0)} unidade(s) movimentada(s)</small>
        </div>`;
    }).join('')}</div>`;
}

function destroyCharts(dashboard) {
    Object.values(dashboard._premiumCharts || {}).forEach((chart) => chart?.destroy?.());
    dashboard._premiumCharts = {};
}

function palette() {
    const styles = getComputedStyle(document.body);
    return {
        primary: styles.getPropertyValue('--premium-accent').trim() || '#2563eb',
        secondary: styles.getPropertyValue('--premium-teal').trim() || '#0f9f8f',
        warning: styles.getPropertyValue('--premium-warning').trim() || '#d98a00',
        danger: styles.getPropertyValue('--premium-danger').trim() || '#d9485f',
        muted: styles.getPropertyValue('--premium-muted').trim() || '#718096',
        surface: styles.getPropertyValue('--premium-surface').trim() || '#fff'
    };
}

function drawCharts(dashboard, analysis, statuses) {
    destroyCharts(dashboard);
    if (!window.Chart) return;
    const colors = palette();
    const monthly = analysis.byMonth || [];
    const trend = document.getElementById('premium-cost-trend-chart');
    if (trend && monthly.length) dashboard._premiumCharts.trend = new Chart(trend, {
        type: 'line',
        data: { labels: monthly.map((item) => item.label), datasets: [{ label: 'Custo de peças', data: monthly.map((item) => Number(item.totalCost) || 0), borderColor: colors.primary, backgroundColor: `${colors.primary}16`, fill: true, tension: .38, borderWidth: 3, pointRadius: 2.5, pointHoverRadius: 5 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, border: { display: false }, grid: { color: 'rgba(100,116,139,.10)' } }, x: { border: { display: false }, grid: { display: false } } } }
    });
    const active = statuses.filter((item) => item.value > 0);
    const status = document.getElementById('premium-status-chart');
    if (status && active.length) dashboard._premiumCharts.status = new Chart(status, {
        type: 'doughnut',
        data: { labels: active.map((item) => item.label), datasets: [{ data: active.map((item) => item.value), backgroundColor: [colors.warning, colors.secondary, colors.primary, colors.muted, colors.danger], borderColor: colors.surface, borderWidth: 5 }] },
        options: { responsive: true, maintainAspectRatio: false, cutout: '72%', plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, pointStyle: 'circle', boxWidth: 7, padding: 18 } } } }
    });
}

function textualSummary(label, rows, value) {
    return `<ul class="premium-chart-summary" aria-label="${Utils.escapeHtml(label)}">${rows.map((row) => `<li>${Utils.escapeHtml(row.label || 'Período')}: ${value(row)}</li>`).join('')}</ul>`;
}

function statusCards(statuses) {
    return statuses.map((item) => `<div class="premium-status-item is-${item.tone}">
        <span class="premium-status-dot" aria-hidden="true"></span>
        <div><span>${Utils.escapeHtml(item.label)}</span><small>Fluxo operacional</small></div>
        <strong>${Utils.formatNumber(item.value)}</strong>
    </div>`).join('');
}

export function applyDashboardFocus() {
    if (!window.Dashboard || Dashboard.__premiumDashboard) return;
    Dashboard.__premiumDashboard = true;
    Dashboard.focusRangeDays = Number(Dashboard.focusRangeDays) || DEFAULT_RANGE_DAYS;
    Dashboard._premiumCharts = {};

    Dashboard.render = function renderPremiumDashboard() {
        const content = document.getElementById('content-area');
        if (!content) return;
        const rangeDays = Number(this.focusRangeDays) || DEFAULT_RANGE_DAYS;
        const { period, analysis } = analyse(rangeDays);
        const statuses = statusDistribution(analysis);
        const pending = statuses.find((item) => item.key === 'pending')?.value || 0;
        const approved = statuses.find((item) => item.key === 'approved')?.value || 0;
        const rows = recentRows(analysis.solicitations || []);
        const parts = window.ElectricalCatalogPolicy?.filterParts(window.DataManager?.getParts?.() || []) || window.DataManager?.getParts?.() || [];
        destroyCharts(this);

        content.innerHTML = `<div class="premium-dashboard premium-dashboard-v3" data-testid="premium-dashboard">
            <section class="premium-dashboard-toolbar" aria-label="Controles do painel">
                <div>
                    <span class="premium-toolbar-eyebrow">Dashboard executivo</span>
                    <h1>Operação de peças</h1>
                    <p>Acompanhe custo, volume e decisões pendentes em uma visão consolidada.</p>
                </div>
                <div class="premium-toolbar-actions">
                    <label class="premium-period-control" for="focus-period"><span>Período</span><select id="focus-period" class="form-control"><option value="7" ${rangeDays === 7 ? 'selected' : ''}>7 dias</option><option value="30" ${rangeDays === 30 ? 'selected' : ''}>30 dias</option><option value="90" ${rangeDays === 90 ? 'selected' : ''}>90 dias</option></select></label>
                    <div class="premium-hero-actions">${actions()}</div>
                </div>
            </section>

            <section class="premium-dashboard-hero premium-dashboard-hero-v3">
                <div class="premium-hero-copy">
                    <span class="premium-eyebrow"><i class="fas fa-wave-square"></i> Central de performance</span>
                    <h2>Decisão rápida.<br><span>Operação sob controle.</span></h2>
                    <p>Indicadores financeiros e operacionais para direcionar aprovações, acompanhar movimentações e agir antes dos desvios.</p>
                    <div class="premium-hero-meta"><span><i class="fas fa-calendar-days"></i>${Utils.formatDate(period.dateFrom)} — ${Utils.formatDate(period.dateTo)}</span><span><i class="fas fa-database"></i>${Utils.formatNumber(parts.length)} peças ativas</span></div>
                </div>
                <div class="premium-hero-summary-card">
                    <span class="premium-summary-label">Solicitações no período</span>
                    <strong>${Utils.formatNumber(analysis.totalRequests || 0)}</strong>
                    <div class="premium-summary-split"><span><b>${Utils.formatNumber(pending)}</b> aguardando</span><span><b>${Utils.formatNumber(approved)}</b> aprovadas</span></div>
                    <div class="premium-summary-foot"><span class="premium-live-dot"></span> Dados operacionais sincronizados</div>
                </div>
            </section>

            <section class="premium-kpi-grid" aria-label="Indicadores principais">
                ${metric('Custo no período', Utils.formatCurrency(analysis.totalCost || 0), `${Utils.formatNumber(analysis.totalRequests || 0)} solicitações`, 'fa-wallet', 'blue')}
                ${metric('Em aprovação', Utils.formatNumber(pending), 'Requerem decisão', 'fa-hourglass-half', 'amber')}
                ${metric('Custo médio', Utils.formatCurrency(analysis.averageCostPerSolicitation || 0), 'Por solicitação', 'fa-chart-simple', 'teal')}
                ${metric('Peças movimentadas', Utils.formatNumber(analysis.totalPieces || 0), 'No período selecionado', 'fa-box-open', 'violet')}
            </section>

            <section class="premium-status-strip premium-status-strip-v3" aria-label="Resumo por status">${statusCards(statuses)}</section>

            ${pending && Auth.hasPermission('aprovacoes', 'view') ? `<div class="premium-action-alert premium-action-alert-v3"><div><span class="premium-alert-icon"><i class="fas fa-bolt"></i></span><div><span class="premium-alert-kicker">Ação recomendada</span><strong>${Utils.formatNumber(pending)} solicitação(ões) aguardando análise</strong><small>Priorize as solicitações mais antigas para reduzir o tempo de ciclo.</small></div></div><button class="btn btn-primary btn-sm" onclick="App.navigate('aprovacoes')">Revisar agora <i class="fas fa-arrow-right"></i></button></div>` : ''}

            <section class="premium-chart-grid premium-chart-grid-v3">
                <article class="premium-panel premium-panel-wide">
                    <div class="premium-panel-header"><div><span class="premium-panel-kicker">Performance financeira</span><h2>Evolução do custo</h2><p>Comportamento do custo de peças no intervalo selecionado.</p></div><span class="premium-panel-badge"><i class="fas fa-chart-line"></i> Tendência</span></div>
                    <div class="premium-chart-shell">${analysis.byMonth?.length ? `<canvas id="premium-cost-trend-chart" role="img" aria-label="Gráfico de evolução do custo mensal"></canvas>${textualSummary('Resumo textual do custo mensal', analysis.byMonth, (item) => Utils.formatCurrency(Number(item.totalCost) || 0))}` : '<div class="premium-empty">Sem dados mensais.</div>'}</div>
                </article>
                <article class="premium-panel premium-status-panel">
                    <div class="premium-panel-header"><div><span class="premium-panel-kicker">Pipeline</span><h2>Status da operação</h2><p>Distribuição das solicitações por etapa.</p></div></div>
                    <div class="premium-chart-shell premium-chart-shell-donut">${statuses.some((item) => item.value) ? `<canvas id="premium-status-chart" role="img" aria-label="Gráfico de distribuição por status"></canvas>${textualSummary('Resumo textual da distribuição por status', statuses, (item) => Utils.formatNumber(item.value || 0))}` : '<div class="premium-empty">Sem solicitações.</div>'}</div>
                </article>
            </section>

            <section class="premium-detail-grid premium-detail-grid-v3">
                <article class="premium-panel">
                    <div class="premium-panel-header"><div><span class="premium-panel-kicker">Impacto financeiro</span><h2>Peças de maior custo</h2><p>Itens que mais pressionam o gasto no período.</p></div><button class="btn btn-outline btn-sm" onclick="App.navigate('relatorios')">Relatórios <i class="fas fa-arrow-up-right-from-square"></i></button></div>
                    ${topParts(analysis.topPieces || [])}
                </article>
                <article class="premium-panel">
                    <div class="premium-panel-header"><div><span class="premium-panel-kicker">Últimas movimentações</span><h2>Solicitações recentes</h2><p>Visão rápida dos registros mais recentes.</p></div><button class="btn btn-outline btn-sm" onclick="App.navigate('solicitacoes')">Ver todas <i class="fas fa-arrow-right"></i></button></div>
                    ${rows ? `<div class="premium-table-wrap"><table class="premium-table"><thead><tr><th>Data</th><th>Solicitação</th><th>Cliente</th><th>Técnico</th><th>Valor</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></div>` : '<div class="premium-empty">Nenhuma solicitação encontrada.</div>'}
                </article>
            </section>
        </div>`;

        document.getElementById('focus-period')?.addEventListener('change', (event) => {
            this.focusRangeDays = Number(event.target.value) || DEFAULT_RANGE_DAYS;
            this.render();
        });
        requestAnimationFrame(() => drawCharts(this, analysis, statuses));
    };
}
