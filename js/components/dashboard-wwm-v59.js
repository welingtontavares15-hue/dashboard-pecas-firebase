const DEFAULT_RANGE_DAYS = 180;
const STATUS_GROUPS = [
    { key: 'pending', label: 'Em aprovação', statuses: ['pendente', 'rascunho', 'enviada'], tone: 'warning', icon: 'fa-hourglass-half' },
    { key: 'approved', label: 'Aprovadas', statuses: ['aprovada'], tone: 'success', icon: 'fa-circle-check' },
    { key: 'transit', label: 'Em trânsito', statuses: ['em-transito'], tone: 'info', icon: 'fa-truck' },
    { key: 'completed', label: 'Finalizadas', statuses: ['finalizada', 'entregue', 'historico-manual'], tone: 'neutral', icon: 'fa-flag' },
    { key: 'rejected', label: 'Rejeitadas', statuses: ['rejeitada'], tone: 'danger', icon: 'fa-circle-xmark' }
];

const safeArray = (value) => Array.isArray(value) ? value : [];

function recordCost(record) {
    const explicit = Number(record?._analysisCost ?? record?.total);
    if (Number.isFinite(explicit)) return explicit;
    return safeArray(record?.itens).reduce((sum, item) => sum + ((Number(item?.quantidade) || 0) * (Number(item?.valorUnit) || 0)), 0);
}

function visibleSource() {
    const rows = safeArray(window.DataManager?.getSolicitations?.());
    const role = String(window.Auth?.getRole?.() || '').toLowerCase();
    if (role === 'administrador' || role === 'gestor') return rows;
    if (typeof window.Dashboard?.canAccessDashboardRecord === 'function') return rows.filter((row) => Dashboard.canAccessDashboardRecord(row));
    return rows;
}

function periodFor(days) {
    if (window.AnalyticsHelper?.normalizePeriod) return AnalyticsHelper.normalizePeriod({ rangeDays: days });
    const end = new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - Math.max(days - 1, 0));
    return { dateFrom: start.toISOString().slice(0, 10), dateTo: end.toISOString().slice(0, 10), rangeDays: days };
}

function buildAnalysis(source, days) {
    const period = periodFor(days);
    if (window.AnalyticsHelper?.buildOperationalAnalysis) {
        return {
            period,
            analysis: AnalyticsHelper.buildOperationalAnalysis(source, {
                moduleKey: 'dashboard-wwm-v59-exact',
                period: { dateFrom: period.dateFrom, dateTo: period.dateTo, rangeDays: period.rangeDays },
                useDefaultPeriod: false,
                cacheKey: `dashboard-wwm-v59:${window.Auth?.getRole?.() || 'anon'}:${period.dateFrom}:${period.dateTo}`
            })
        };
    }

    const totalCost = source.reduce((sum, row) => sum + recordCost(row), 0);
    return {
        period,
        analysis: {
            solicitations: source,
            totalRequests: source.length,
            totalCost,
            averageCostPerSolicitation: source.length ? totalCost / source.length : 0,
            totalPieces: source.reduce((sum, row) => sum + safeArray(row?.itens).reduce((acc, item) => acc + (Number(item?.quantidade) || 0), 0), 0),
            byStatus: {},
            byMonth: [],
            topPieces: []
        }
    };
}

function statusDistribution(analysis) {
    const raw = analysis?.byStatus || {};
    return STATUS_GROUPS.map((group) => ({
        ...group,
        value: group.statuses.reduce((sum, status) => sum + (Number(raw[status]) || 0), 0)
    }));
}

function heroActions() {
    const actions = [];
    if (window.Auth?.hasPermission?.('solicitacoes', 'create')) {
        actions.push('<button class="v59-hero-action is-primary" onclick="App.navigate(\'nova-solicitacao\')"><i class="fas fa-plus"></i>Nova solicitação</button>');
    }
    if (window.Auth?.hasPermission?.('aprovacoes', 'view')) {
        actions.push('<button class="v59-hero-action" onclick="App.navigate(\'aprovacoes\')"><i class="fas fa-check-double"></i>Aprovações</button>');
    }
    return actions.join('');
}

function metricCard(label, value, note, icon, tone) {
    return `<article class="v59-kpi is-${tone}">
        <div class="v59-kpi-top"><span>${label}</span><i class="fas ${icon}"></i></div>
        <strong>${value}</strong>
        <small>${note}</small>
    </article>`;
}

function statusStrip(statuses) {
    const total = statuses.reduce((sum, item) => sum + item.value, 0) || 1;
    return statuses.map((item) => `<article class="v59-status is-${item.tone}">
        <div><i class="fas ${item.icon}"></i><span>${item.label}</span></div>
        <strong>${Utils.formatNumber(item.value)}</strong>
        <small>${Math.round((item.value / total) * 100)}%</small>
    </article>`).join('');
}

function topPiecesTable(items) {
    if (!items?.length) return '<div class="v59-empty">Sem peças com custo no período.</div>';
    return `<div class="v59-table-wrap"><table class="v59-table"><thead><tr><th>#</th><th>Peça</th><th>Categoria</th><th>Qtd.</th><th>Custo total</th></tr></thead><tbody>${items.slice(0, 5).map((item, index) => `<tr>
        <td>${index + 1}</td>
        <td><strong>${Utils.escapeHtml(item.descricao || item.codigo || 'Peça')}</strong></td>
        <td>${Utils.escapeHtml(item.categoria || item.category || '—')}</td>
        <td>${Utils.formatNumber(item.quantidade || 0)}</td>
        <td>${Utils.formatCurrency(item.totalCost || 0)}</td>
    </tr>`).join('')}</tbody></table></div>`;
}

function recentTable(rows) {
    if (!rows?.length) return '<div class="v59-empty">Nenhuma solicitação no período selecionado.</div>';
    return `<div class="v59-table-wrap"><table class="v59-table"><thead><tr><th>Data</th><th>Nº solicitação</th><th>Técnico</th><th>Cliente</th><th>Custo</th><th>Status</th></tr></thead><tbody>${rows.slice(0, 7).map((row) => `<tr>
        <td>${Utils.formatDate(row.data || row.createdAt)}</td>
        <td><strong>#${Utils.escapeHtml(String(row.numero || 'Sem número').replace(/^#/, ''))}</strong></td>
        <td>${Utils.escapeHtml(row.tecnicoNome || row.requesterName || 'Não informado')}</td>
        <td>${Utils.escapeHtml(row.cliente || row.clienteNome || 'Não informado')}</td>
        <td>${Utils.formatCurrency(recordCost(row))}</td>
        <td>${Utils.renderStatusBadge(row.status)}</td>
    </tr>`).join('')}</tbody></table></div>`;
}

function renderReady(source, period, analysis) {
    const statuses = statusDistribution(analysis);
    const pending = statuses.find((item) => item.key === 'pending')?.value || 0;
    return `<div class="wwm-dashboard-v59" data-dashboard-state="ready" data-dashboard-source-count="${source.length}" data-dashboard-period-count="${Number(analysis?.totalRequests || 0)}">
        <div class="v59-layout">
            <main class="v59-main">
                <section id="v59-summary" class="v59-hero v59-section">
                    <div class="v59-hero-copy">
                        <h1>Visão operacional e financeira</h1>
                        <p>Acompanhe aprovações, custos, peças e o andamento das solicitações em tempo real.</p>
                    </div>
                    <div class="v59-hero-toolbar">
                        <label class="v59-period-control"><span>Período</span><i class="fas fa-calendar-days" aria-hidden="true"></i><select id="v59-range"><option value="90" ${Dashboard.focusRangeDays === 90 ? 'selected' : ''}>Últimos 3 meses</option><option value="180" ${Dashboard.focusRangeDays === 180 ? 'selected' : ''}>Últimos 6 meses</option><option value="365" ${Dashboard.focusRangeDays === 365 ? 'selected' : ''}>Últimos 12 meses</option></select></label>
                        <div class="v59-hero-actions">${heroActions()}</div>
                    </div>
                </section>

                <section id="v59-indicators" class="v59-kpi-grid v59-section">
                    ${metricCard('Custo no período', Utils.formatCurrency(analysis?.totalCost || 0), `${Utils.formatNumber(analysis?.totalRequests || 0)} solicitações`, 'fa-sack-dollar', 'blue')}
                    ${metricCard('Aguardando aprovação', Utils.formatNumber(pending), 'Solicitações pendentes', 'fa-clock', 'teal')}
                    ${metricCard('Custo médio', Utils.formatCurrency(analysis?.averageCostPerSolicitation || 0), 'Por solicitação', 'fa-calculator', 'blue')}
                    ${metricCard('Peças movimentadas', Utils.formatNumber(analysis?.totalPieces || 0), 'No período selecionado', 'fa-boxes-stacked', 'teal')}
                </section>

                <section id="v59-flow" class="v59-status-grid v59-section">${statusStrip(statuses)}</section>

                <section id="v59-costs" class="v59-chart-grid v59-section">
                    <article class="v59-card">
                        <header class="v59-card-head"><div><strong>Evolução do custo mensal</strong><span>Somatório por mês (R$)</span></div><i class="fas fa-circle-info" aria-hidden="true"></i></header>
                        <div class="v59-chart-box">${safeArray(analysis?.byMonth).length ? '<canvas id="v59-cost-chart"></canvas>' : '<div class="v59-empty">Sem dados mensais.</div>'}</div>
                    </article>
                    <article class="v59-card">
                        <header class="v59-card-head"><div><strong>Distribuição por status</strong><span>Quantidade de solicitações</span></div><i class="fas fa-circle-info" aria-hidden="true"></i></header>
                        <div class="v59-chart-box is-donut">${statuses.some((item) => item.value > 0) ? '<canvas id="v59-status-chart"></canvas>' : '<div class="v59-empty">Sem solicitações.</div>'}</div>
                    </article>
                </section>

                <section class="v59-detail-grid">
                    <article id="v59-impact" class="v59-card v59-section">
                        <header class="v59-card-head"><div><strong>Peças com maior impacto</strong><span>Ranking por impacto financeiro</span></div><i class="fas fa-circle-info" aria-hidden="true"></i></header>
                        ${topPiecesTable(analysis?.topPieces || [])}
                        <button class="v59-card-link" onclick="App.navigate('relatorios')">Ver relatório completo <i class="fas fa-arrow-right"></i></button>
                    </article>
                    <article id="v59-recent" class="v59-card v59-section">
                        <header class="v59-card-head"><div><strong>Solicitações recentes</strong><span>Últimas solicitações dentro do período</span></div><i class="fas fa-circle-info" aria-hidden="true"></i></header>
                        ${recentTable(safeArray(analysis?.solicitations))}
                        <button class="v59-card-link" onclick="App.navigate('solicitacoes')">Ver todas as solicitações <i class="fas fa-arrow-right"></i></button>
                    </article>
                </section>
            </main>
        </div>
    </div>`;
}

function renderLoading() {
    return `<div class="wwm-dashboard-v59" data-dashboard-state="loading"><div class="v59-loading"><i class="fas fa-arrows-rotate fa-spin"></i><div><strong>Carregando visão operacional</strong><span>Sincronizando solicitações e indicadores.</span></div></div></div>`;
}

function renderEmpty() {
    return `<div class="wwm-dashboard-v59" data-dashboard-state="empty"><div class="v59-loading"><i class="fas fa-database"></i><div><strong>Nenhuma solicitação disponível</strong><span>A base será atualizada automaticamente quando houver dados acessíveis.</span></div><button id="v59-refresh">Atualizar</button></div></div>`;
}

function destroyCharts() {
    Object.values(Dashboard._v59Charts || {}).forEach((chart) => chart?.destroy?.());
    Dashboard._v59Charts = {};
}

function drawCharts(analysis) {
    destroyCharts();
    if (!window.Chart) return;

    const months = safeArray(analysis?.byMonth);
    const costCanvas = document.getElementById('v59-cost-chart');
    if (costCanvas && months.length) {
        Dashboard._v59Charts.cost = new Chart(costCanvas, {
            type: 'line',
            data: { labels: months.map((item) => item.label), datasets: [{ data: months.map((item) => Number(item.totalCost) || 0), borderColor: '#078a83', backgroundColor: 'rgba(7,138,131,.13)', fill: true, tension: .34, borderWidth: 2.5, pointRadius: 3, pointHoverRadius: 5 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => Utils.formatCurrency(ctx.parsed.y || 0) } } }, scales: { x: { grid: { display: false }, ticks: { color: '#64748b' } }, y: { beginAtZero: true, grid: { color: 'rgba(15,35,55,.08)' }, ticks: { color: '#64748b', callback: (value) => Utils.formatCurrency(value) } } } }
        });
    }

    const statuses = statusDistribution(analysis).filter((item) => item.value > 0);
    const statusCanvas = document.getElementById('v59-status-chart');
    if (statusCanvas && statuses.length) {
        Dashboard._v59Charts.status = new Chart(statusCanvas, {
            type: 'doughnut',
            data: { labels: statuses.map((item) => item.label), datasets: [{ data: statuses.map((item) => item.value), backgroundColor: ['#f4a51c', '#3aae73', '#2f7dc7', '#138a86', '#d9535f'], borderColor: '#ffffff', borderWidth: 4 }] },
            options: { responsive: true, maintainAspectRatio: false, cutout: '66%', plugins: { legend: { position: 'right', labels: { usePointStyle: true, boxWidth: 8, padding: 14, color: '#44566c' } } } }
        });
    }
}

function bindNavigation() {
    const links = Array.from(document.querySelectorAll('[data-v59-anchor]'));
    links.forEach((link) => link.addEventListener('click', (event) => {
        const id = link.dataset.v59Anchor;
        const target = document.getElementById(id);
        if (!target) return;
        event.preventDefault();
        links.forEach((item) => item.classList.toggle('active', item === link));
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }));
}

function bindControls() {
    document.getElementById('v59-range')?.addEventListener('change', (event) => {
        Dashboard.focusRangeDays = Number(event.target.value) || DEFAULT_RANGE_DAYS;
        Dashboard.render();
    });
    document.getElementById('v59-refresh')?.addEventListener('click', () => syncData());
    bindNavigation();
}

function isHydrating() {
    return Boolean(window.DataManager?.initializing || window.DataManager?.initialized === false || window.DataManager?.isCloudConnecting?.() || Dashboard._v59Syncing);
}

async function syncData() {
    if (Dashboard._v59SyncPromise || !window.DataManager?.syncAll) return Dashboard._v59SyncPromise;
    Dashboard._v59Syncing = true;
    Dashboard._v59SyncPromise = Promise.resolve(DataManager.syncAll('dashboard_wwm_v59'))
        .catch(() => false)
        .finally(() => {
            Dashboard._v59Syncing = false;
            Dashboard._v59SyncPromise = null;
            if (window.App?.currentPage === 'dashboard') Dashboard.render();
        });
    return Dashboard._v59SyncPromise;
}

function bindRefreshEvents() {
    if (Dashboard.__v59EventsBound) return;
    Dashboard.__v59EventsBound = true;
    let timer = null;
    const refresh = () => {
        if (window.App?.currentPage !== 'dashboard') return;
        clearTimeout(timer);
        timer = setTimeout(() => Dashboard.render(), 100);
    };
    ['data:updated', 'storage:ready', 'firebase:ready', 'firebase:sync-complete'].forEach((name) => window.addEventListener(name, refresh));
}

export function applyDashboardWwmV59() {
    if (!window.Dashboard || Dashboard.__wwmDashboardV59) return;
    Dashboard.__wwmDashboardV59 = true;
    Dashboard.focusRangeDays = Number(Dashboard.focusRangeDays) || DEFAULT_RANGE_DAYS;
    Dashboard._v59Charts = {};
    Dashboard._v59Syncing = false;
    Dashboard._v59SyncPromise = null;
    Dashboard._v59ZeroSyncAttempted = false;
    bindRefreshEvents();

    Dashboard.render = function renderWwmV59() {
        const content = document.getElementById('content-area');
        if (!content) return;
        document.body.classList.add('wwm-dashboard-v59-active');
        document.body.classList.remove('wwm-dashboard-v58-active', 'wwm-dashboard-active');
        destroyCharts();

        const source = visibleSource();
        if (!source.length && !Dashboard._v59ZeroSyncAttempted && navigator.onLine !== false && window.DataManager?.syncAll) {
            Dashboard._v59ZeroSyncAttempted = true;
            syncData();
        }
        if (!source.length && isHydrating()) {
            content.innerHTML = renderLoading();
            return;
        }
        if (!source.length) {
            content.innerHTML = renderEmpty();
            bindControls();
            return;
        }

        Dashboard._v59ZeroSyncAttempted = false;
        const { period, analysis } = buildAnalysis(source, Dashboard.focusRangeDays);
        content.innerHTML = renderReady(source, period, analysis);
        bindControls();
        requestAnimationFrame(() => drawCharts(analysis));
    };
}
