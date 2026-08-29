const DEFAULT_RANGE_DAYS = 30;
const PENDING_STATUSES = new Set(['pendente', 'rascunho', 'enviada']);
const COMPLETED_STATUSES = new Set(['finalizada', 'entregue', 'historico-manual']);
const STATUS_LABELS = {
    pendente: 'Aguardando aprovação',
    rascunho: 'Rascunho',
    enviada: 'Enviada',
    aprovada: 'Aprovada / aguardando envio',
    'em-transito': 'Em trânsito',
    finalizada: 'Finalizada',
    entregue: 'Entregue',
    rejeitada: 'Rejeitada',
    'historico-manual': 'Histórico'
};

const safeArray = (value) => Array.isArray(value) ? value : [];

function normalizeStatus(value) {
    return window.AnalyticsHelper?.normalizeStatus
        ? AnalyticsHelper.normalizeStatus(value)
        : String(value || '').trim().toLowerCase();
}

function getDate(record) {
    if (window.AnalyticsHelper?.getSolicitationDate) {
        return AnalyticsHelper.getSolicitationDate(record);
    }
    const raw = record?.data || record?.createdAt;
    const date = raw ? new Date(raw) : null;
    return date && !Number.isNaN(date.getTime()) ? date : null;
}

function getCost(record) {
    const explicit = Number(record?._analysisCost ?? record?.total);
    if (Number.isFinite(explicit)) return explicit;
    return safeArray(record?.itens).reduce((sum, item) => {
        return sum + ((Number(item?.quantidade) || 0) * (Number(item?.valorUnit) || 0));
    }, 0);
}

function getVisibleSource() {
    const rows = safeArray(window.DataManager?.getSolicitations?.());
    const role = String(window.Auth?.getRole?.() || '').toLowerCase();

    // Administrador e gestor precisam enxergar a mesma base consolidada dos Relatórios.
    if (role === 'administrador' || role === 'gestor') return rows;

    if (typeof window.Dashboard?.canAccessDashboardRecord === 'function') {
        return rows.filter((row) => Dashboard.canAccessDashboardRecord(row));
    }
    return rows;
}

function getPeriod(days) {
    if (window.AnalyticsHelper?.normalizePeriod) {
        return AnalyticsHelper.normalizePeriod({ rangeDays: days });
    }
    const end = new Date();
    const start = new Date(end);
    start.setDate(end.getDate() - Math.max(days - 1, 0));
    return {
        dateFrom: start.toISOString().slice(0, 10),
        dateTo: end.toISOString().slice(0, 10),
        rangeDays: days
    };
}

function buildAnalysis(source, days) {
    const period = getPeriod(days);
    if (window.AnalyticsHelper?.buildOperationalAnalysis) {
        return {
            period,
            analysis: AnalyticsHelper.buildOperationalAnalysis(source, {
                moduleKey: 'dashboard-wwm-v58',
                period: {
                    dateFrom: period.dateFrom,
                    dateTo: period.dateTo,
                    rangeDays: period.rangeDays
                },
                useDefaultPeriod: false,
                cacheKey: `dashboard-wwm-v58:${window.Auth?.getRole?.() || 'anon'}:${period.dateFrom}:${period.dateTo}`
            })
        };
    }

    const totalCost = source.reduce((sum, row) => sum + getCost(row), 0);
    return {
        period,
        analysis: {
            solicitations: source,
            totalRequests: source.length,
            totalCost,
            averageCostPerSolicitation: source.length ? totalCost / source.length : 0,
            totalPieces: source.reduce((sum, row) => sum + safeArray(row.itens).reduce((acc, item) => acc + (Number(item?.quantidade) || 0), 0), 0),
            byStatus: {},
            byMonth: [],
            topPieces: []
        }
    };
}

function getSlaHours() {
    const value = Number(window.DataManager?.getSettings?.()?.slaHours);
    return Number.isFinite(value) && value > 0 ? value : 48;
}

function isOverdue(record) {
    if (!PENDING_STATUSES.has(normalizeStatus(record?.status))) return false;
    const date = getDate(record);
    return Boolean(date && ((Date.now() - date.getTime()) / 3600000) >= getSlaHours());
}

function buildOperational(source) {
    const normalized = source.map((record) => ({
        record,
        status: normalizeStatus(record?.status),
        timestamp: getDate(record)?.getTime() || 0
    }));
    const pending = normalized.filter((entry) => PENDING_STATUSES.has(entry.status));
    const completed = normalized.filter((entry) => COMPLETED_STATUSES.has(entry.status));
    return {
        pendingCount: pending.length,
        overdueCount: pending.filter((entry) => isOverdue(entry.record)).length,
        completedCount: completed.length,
        latestPending: pending.sort((a, b) => b.timestamp - a.timestamp).slice(0, 3)
    };
}

function roleLabel() {
    const role = window.Auth?.getRole?.() || '';
    return window.Auth?.getRoleLabel?.(role) || role || 'Usuário';
}

function lastUpdate() {
    return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    }).format(new Date());
}

function renderPendingRows(entries) {
    if (!entries.length) {
        return '<div class="wwm58-empty-inline"><i class="fas fa-circle-check"></i><span>Nenhuma pendência ativa.</span></div>';
    }
    return entries.map(({ record, status }) => {
        const number = Utils.escapeHtml(String(record?.numero || 'Sem número').replace(/^#/, ''));
        return `<div class="wwm58-pending-row">
            <span class="wwm58-dot"></span>
            <strong>${number}</strong>
            <span>${Utils.escapeHtml(STATUS_LABELS[status] || status)}</span>
            <time>${Utils.formatDate(record?.data || record?.createdAt)}</time>
        </div>`;
    }).join('');
}

function quickActions() {
    const actions = [];
    if (window.Auth?.hasPermission?.('solicitacoes', 'create')) {
        actions.push('<button class="wwm58-action is-primary" onclick="App.navigate(\'nova-solicitacao\')"><i class="fas fa-plus"></i><div><strong>Nova solicitação</strong><span>Criar nova requisição</span></div></button>');
    }
    if (window.Auth?.hasPermission?.('aprovacoes', 'view')) {
        actions.push('<button class="wwm58-action" onclick="App.navigate(\'aprovacoes\')"><i class="fas fa-inbox"></i><div><strong>Pendências</strong><span>Aguardando ação</span></div></button>');
    }
    if (window.Auth?.hasPermission?.('relatorios', 'view')) {
        actions.push('<button class="wwm58-action" onclick="App.navigate(\'relatorios\')"><i class="fas fa-chart-line"></i><div><strong>Histórico e análises</strong><span>Relatórios completos</span></div></button>');
    }
    return actions.join('');
}

function statusTiles(operational) {
    const tiles = [
        ['pending', operational.pendingCount, 'Pendentes', 'fa-clock'],
        ['overdue', operational.overdueCount, 'Atrasadas', 'fa-clock-rotate-left'],
        ['completed', operational.completedCount, 'Concluídas', 'fa-circle-check']
    ];
    return tiles.map(([tone, value, label, icon]) => `<article class="wwm58-status-tile is-${tone}"><div><strong>${Utils.formatNumber(value)}</strong><i class="fas ${icon}"></i></div><span>${label}</span></article>`).join('');
}

function metricCard(label, value, note, icon, tone) {
    return `<article class="wwm58-metric is-${tone}"><div class="wwm58-metric-head"><span>${label}</span><i class="fas ${icon}"></i></div><strong>${value}</strong><small>${note}</small></article>`;
}

function renderTopParts(items) {
    if (!items?.length) return '<div class="wwm58-empty-card">Sem custo de peças no período.</div>';
    return `<div class="wwm58-impact-list">${items.slice(0, 5).map((item) => `<div><span>${Utils.escapeHtml(item.descricao || item.codigo || 'Peça')}</span><strong>${Utils.formatCurrency(item.totalCost || 0)}</strong><i class="fas fa-chevron-right"></i></div>`).join('')}</div>`;
}

function renderRecent(rows) {
    if (!rows?.length) return '<div class="wwm58-empty-card">Nenhuma solicitação no período selecionado.</div>';
    return `<div class="wwm58-table-wrap"><table class="wwm58-table"><thead><tr><th>Nº solicitação</th><th>Data</th><th>Cliente</th><th>Técnico</th><th>Status</th><th>Valor</th></tr></thead><tbody>${rows.slice(0, 8).map((row) => `<tr><td><strong>${Utils.escapeHtml(String(row.numero || 'Sem número').replace(/^#/, ''))}</strong></td><td>${Utils.formatDate(row.data || row.createdAt)}</td><td>${Utils.escapeHtml(row.cliente || row.clienteNome || 'Não informado')}</td><td>${Utils.escapeHtml(row.tecnicoNome || row.requesterName || 'Não informado')}</td><td>${Utils.renderStatusBadge(row.status)}</td><td>${Utils.formatCurrency(getCost(row))}</td></tr>`).join('')}</tbody></table></div>`;
}

function renderLoading() {
    return `<div class="wwm-dashboard-v58" data-dashboard-state="loading"><section class="wwm58-loading"><i class="fas fa-arrows-rotate fa-spin"></i><div><span>PORTAL DE PEÇAS WWM</span><h1>Sincronizando dados operacionais</h1><p>Carregando solicitações, pendências, custos e movimentações.</p></div></section></div>`;
}

function renderEmpty() {
    return `<div class="wwm-dashboard-v58" data-dashboard-state="empty"><section class="wwm58-empty-base"><i class="fas fa-database"></i><div><strong>Nenhuma solicitação disponível para este perfil.</strong><span>Atualize a sincronização para consultar a base corporativa.</span></div><button id="wwm58-empty-refresh">Atualizar agora</button></section></div>`;
}

function renderPeriodNotice(source, analysis) {
    if (!source.length || Number(analysis?.totalRequests || 0) > 0) return '';
    return `<div class="wwm58-period-notice"><i class="fas fa-circle-info"></i><span>Existem ${Utils.formatNumber(source.length)} solicitações na base, mas nenhuma nos últimos ${Dashboard.focusRangeDays} dias.</span><button data-wwm58-period="90">Ver 90 dias</button></div>`;
}

function dashboardHtml(source, period, analysis, operational) {
    const rows = safeArray(analysis?.solicitations);
    const approvedCount = Number(analysis?.byStatus?.aprovada || 0);
    return `<div class="wwm-dashboard-v58" data-testid="wwm-dashboard-v58" data-dashboard-state="ready" data-dashboard-source-count="${source.length}" data-dashboard-period-count="${Number(analysis?.totalRequests || 0)}">
        <section class="wwm58-hero">
            <div class="wwm58-title-row">
                <div><span>PLATAFORMA DE CONTROLE DE PEÇAS</span><h1>Portal de Peças WWM</h1><p>Solenis Brasil</p></div>
                <label class="wwm58-period"><span>PERÍODO</span><select id="wwm58-period-select"><option value="7" ${Dashboard.focusRangeDays === 7 ? 'selected' : ''}>Últimos 7 dias</option><option value="30" ${Dashboard.focusRangeDays === 30 ? 'selected' : ''}>Últimos 30 dias</option><option value="90" ${Dashboard.focusRangeDays === 90 ? 'selected' : ''}>Últimos 90 dias</option></select></label>
            </div>
            <div class="wwm58-meta"><span><i class="fas fa-user"></i> Perfil: ${Utils.escapeHtml(roleLabel())}</span><span><i class="fas fa-database"></i> Base: ${Utils.formatNumber(source.length)} solicitações</span><span><i class="fas fa-clock"></i> Atualizado ${Utils.escapeHtml(lastUpdate())}</span></div>
            <div class="wwm58-operation-grid">
                <article class="wwm58-panel wwm58-pending-panel"><header><span>ÚLTIMAS PENDÊNCIAS</span></header>${renderPendingRows(operational.latestPending)}<button onclick="App.navigate('aprovacoes')">Ver todas as pendências <i class="fas fa-arrow-right"></i></button></article>
                <div class="wwm58-operation-side"><div class="wwm58-status-row">${statusTiles(operational)}</div><div class="wwm58-action-row">${quickActions()}</div></div>
            </div>
        </section>
        <section class="wwm58-body">
            ${renderPeriodNotice(source, analysis)}
            <div class="wwm58-metrics">
                ${metricCard('Custo do período', Utils.formatCurrency(analysis?.totalCost || 0), 'Total no período', 'fa-dollar-sign', 'green')}
                ${metricCard('Ticket médio', Utils.formatCurrency(analysis?.averageCostPerSolicitation || 0), 'Por solicitação', 'fa-receipt', 'teal')}
                ${metricCard('Peças movimentadas', Utils.formatNumber(analysis?.totalPieces || 0), 'Total de peças', 'fa-cube', 'blue')}
                ${metricCard('Aprovações', Utils.formatNumber(approvedCount), 'Solicitações aprovadas', 'fa-check', 'green')}
            </div>
            <div class="wwm58-analytics-row">
                <article class="wwm58-panel"><header><div><span>EVOLUÇÃO DO CUSTO MENSAL</span><small>Somatório por mês (R$)</small></div></header><div class="wwm58-chart">${safeArray(analysis?.byMonth).length ? '<canvas id="wwm58-cost-chart"></canvas>' : '<div class="wwm58-empty-card">Sem dados mensais.</div>'}</div></article>
                <article class="wwm58-panel"><header><div><span>DISTRIBUIÇÃO POR STATUS</span><small>Quantidade de solicitações</small></div></header><div class="wwm58-chart is-donut">${Object.values(analysis?.byStatus || {}).some((v) => Number(v) > 0) ? '<canvas id="wwm58-status-chart"></canvas>' : '<div class="wwm58-empty-card">Sem solicitações.</div>'}</div></article>
                <article class="wwm58-panel"><header><div><span>PEÇAS DE MAIOR IMPACTO</span><small>Por valor total (R$)</small></div></header>${renderTopParts(analysis?.topPieces || [])}<button class="wwm58-link" onclick="App.navigate('relatorios')">Ver relatório completo <i class="fas fa-arrow-right"></i></button></article>
            </div>
            <article class="wwm58-panel wwm58-recent"><header><span>SOLICITAÇÕES RECENTES</span></header>${renderRecent(rows)}<button class="wwm58-link" onclick="App.navigate('solicitacoes')">Ver todas as solicitações <i class="fas fa-arrow-right"></i></button></article>
        </section>
    </div>`;
}

function destroyCharts() {
    Object.values(Dashboard._wwm58Charts || {}).forEach((chart) => chart?.destroy?.());
    Dashboard._wwm58Charts = {};
}

function drawCharts(analysis) {
    destroyCharts();
    if (!window.Chart) return;
    const monthly = safeArray(analysis?.byMonth);
    const costCanvas = document.getElementById('wwm58-cost-chart');
    if (costCanvas && monthly.length) {
        Dashboard._wwm58Charts.cost = new Chart(costCanvas, {
            type: 'line',
            data: { labels: monthly.map((item) => item.label), datasets: [{ data: monthly.map((item) => Number(item.totalCost) || 0), borderColor: '#72e0d3', backgroundColor: 'rgba(114,224,211,.08)', pointBackgroundColor: '#ffffff', pointBorderColor: '#72e0d3', borderWidth: 2.5, tension: .32, fill: false, pointRadius: 3 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (context) => Utils.formatCurrency(context.parsed.y || 0) } } }, scales: { x: { grid: { display: false }, ticks: { color: '#b9d8d4' } }, y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,.09)' }, ticks: { color: '#b9d8d4', callback: (v) => Utils.formatCurrency(v) } } } }
        });
    }
    const statusEntries = Object.entries(analysis?.byStatus || {}).filter(([, value]) => Number(value) > 0);
    const statusCanvas = document.getElementById('wwm58-status-chart');
    if (statusCanvas && statusEntries.length) {
        Dashboard._wwm58Charts.status = new Chart(statusCanvas, {
            type: 'doughnut',
            data: { labels: statusEntries.map(([key]) => STATUS_LABELS[key] || key), datasets: [{ data: statusEntries.map(([, value]) => Number(value) || 0), backgroundColor: ['#ffb31f', '#49bd66', '#2d87d8', '#8ca6b3', '#ec5d60', '#8b73dc'], borderColor: '#075e59', borderWidth: 3 }] },
            options: { responsive: true, maintainAspectRatio: false, cutout: '62%', plugins: { legend: { position: 'right', labels: { color: '#dff1ef', usePointStyle: true, boxWidth: 8, padding: 12 } } } }
        });
    }
}

function isHydrating() {
    return Boolean(DataManager?.initializing || DataManager?.initialized === false || DataManager?.isCloudConnecting?.() || Dashboard._wwm58Syncing);
}

async function syncData() {
    if (Dashboard._wwm58SyncPromise || !window.DataManager?.syncAll) return Dashboard._wwm58SyncPromise;
    Dashboard._wwm58Syncing = true;
    Dashboard._wwm58SyncPromise = Promise.resolve(DataManager.syncAll('dashboard_wwm_v58'))
        .catch(() => false)
        .finally(() => {
            Dashboard._wwm58Syncing = false;
            Dashboard._wwm58SyncPromise = null;
            if (window.App?.currentPage === 'dashboard') Dashboard.render();
        });
    return Dashboard._wwm58SyncPromise;
}

function bindControls() {
    document.getElementById('wwm58-period-select')?.addEventListener('change', (event) => {
        Dashboard.focusRangeDays = Number(event.target.value) || DEFAULT_RANGE_DAYS;
        Dashboard.render();
    });
    document.querySelector('[data-wwm58-period="90"]')?.addEventListener('click', () => {
        Dashboard.focusRangeDays = 90;
        Dashboard.render();
    });
    document.getElementById('wwm58-empty-refresh')?.addEventListener('click', () => syncData());
}

function bindRefreshEvents() {
    if (Dashboard.__wwm58EventsBound) return;
    Dashboard.__wwm58EventsBound = true;
    let timer = null;
    const refresh = () => {
        if (window.App?.currentPage !== 'dashboard') return;
        clearTimeout(timer);
        timer = setTimeout(() => Dashboard.render(), 100);
    };
    ['data:updated', 'storage:ready', 'firebase:ready', 'firebase:sync-complete'].forEach((name) => window.addEventListener(name, refresh));
    window.addEventListener('online', () => window.App?.currentPage === 'dashboard' && syncData());
}

export function applyDashboardWwmV58() {
    if (!window.Dashboard || Dashboard.__wwmDashboardV58) return;
    Dashboard.__wwmDashboardV58 = true;
    Dashboard.focusRangeDays = Number(Dashboard.focusRangeDays) || DEFAULT_RANGE_DAYS;
    Dashboard._wwm58Charts = {};
    Dashboard._wwm58Syncing = false;
    Dashboard._wwm58SyncPromise = null;
    Dashboard._wwm58ZeroSyncAttempted = false;
    bindRefreshEvents();

    Dashboard.render = function renderWwmV58() {
        const content = document.getElementById('content-area');
        if (!content) return;
        document.body.classList.add('wwm-dashboard-v58-active');
        document.body.classList.remove('wwm-dashboard-active');
        destroyCharts();

        const source = getVisibleSource();
        if (!source.length && !Dashboard._wwm58ZeroSyncAttempted && navigator.onLine !== false && DataManager?.syncAll) {
            Dashboard._wwm58ZeroSyncAttempted = true;
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

        Dashboard._wwm58ZeroSyncAttempted = false;
        const { period, analysis } = buildAnalysis(source, Dashboard.focusRangeDays);
        const operational = buildOperational(source);
        content.innerHTML = dashboardHtml(source, period, analysis, operational);
        bindControls();
        requestAnimationFrame(() => drawCharts(analysis));
    };
}
