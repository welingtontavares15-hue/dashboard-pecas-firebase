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

function safeArray(value) {
    return Array.isArray(value) ? value : [];
}

function normalizeStatus(value) {
    if (window.AnalyticsHelper?.normalizeStatus) {
        return AnalyticsHelper.normalizeStatus(value);
    }
    return String(value || '').trim().toLowerCase();
}

function getRecordDate(record) {
    if (window.AnalyticsHelper?.getSolicitationDate) {
        return AnalyticsHelper.getSolicitationDate(record);
    }
    const value = record?.data || record?.createdAt;
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

function recordTimestamp(record) {
    return getRecordDate(record)?.getTime() || Number(record?.createdAt) || 0;
}

function recordCost(record) {
    if (Number.isFinite(Number(record?._analysisCost))) {
        return Number(record._analysisCost);
    }
    if (Number.isFinite(Number(record?.total))) {
        return Number(record.total);
    }
    return safeArray(record?.itens).reduce((sum, item) => {
        const quantity = Number(item?.quantidade) || 0;
        const unit = Number(item?.valorUnit) || 0;
        return sum + (quantity * unit);
    }, 0);
}

function getSource() {
    const rows = safeArray(window.DataManager?.getSolicitations?.());
    if (typeof window.Dashboard?.canAccessDashboardRecord !== 'function') {
        return rows;
    }
    return rows.filter((row) => Dashboard.canAccessDashboardRecord(row));
}

function getPeriod(days) {
    if (window.AnalyticsHelper?.normalizePeriod) {
        return AnalyticsHelper.normalizePeriod({ rangeDays: days });
    }
    const end = new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - Math.max(days - 1, 0));
    return {
        dateFrom: start.toISOString().slice(0, 10),
        dateTo: end.toISOString().slice(0, 10),
        rangeDays: days,
        from: start,
        to: end
    };
}

function buildAnalysis(source, days) {
    const period = getPeriod(days);
    if (window.AnalyticsHelper?.buildOperationalAnalysis) {
        const analysis = AnalyticsHelper.buildOperationalAnalysis(source, {
            moduleKey: 'dashboard-wwm-v57',
            period: {
                dateFrom: period.dateFrom,
                dateTo: period.dateTo,
                rangeDays: period.rangeDays
            },
            useDefaultPeriod: false,
            cacheKey: `dashboard-wwm-v57:${window.Auth?.getRole?.() || 'anon'}:${period.dateFrom}:${period.dateTo}`
        });
        return { period, analysis };
    }

    return {
        period,
        analysis: {
            solicitations: source,
            totalRequests: source.length,
            totalCost: source.reduce((sum, row) => sum + recordCost(row), 0),
            averageCostPerSolicitation: source.length ? source.reduce((sum, row) => sum + recordCost(row), 0) / source.length : 0,
            totalPieces: source.reduce((sum, row) => sum + safeArray(row.itens).reduce((itemSum, item) => itemSum + (Number(item?.quantidade) || 0), 0), 0),
            byStatus: {},
            byMonth: [],
            topPieces: []
        }
    };
}

function getSlaHours() {
    const configured = Number(window.DataManager?.getSettings?.()?.slaHours);
    return Number.isFinite(configured) && configured > 0 ? configured : 48;
}

function isOverdue(record, now = Date.now()) {
    const status = normalizeStatus(record?.status);
    if (!PENDING_STATUSES.has(status)) return false;
    const date = getRecordDate(record);
    if (!date) return false;
    return ((now - date.getTime()) / 3600000) >= getSlaHours();
}

function buildOperationalSummary(source) {
    const now = Date.now();
    const normalized = source.map((record) => ({
        record,
        status: normalizeStatus(record?.status),
        timestamp: recordTimestamp(record)
    }));

    const pending = normalized.filter((entry) => PENDING_STATUSES.has(entry.status));
    const completed = normalized.filter((entry) => COMPLETED_STATUSES.has(entry.status));
    const overdue = pending.filter((entry) => isOverdue(entry.record, now));
    const latestPending = pending.slice().sort((a, b) => b.timestamp - a.timestamp).slice(0, 3);

    return {
        pendingCount: pending.length,
        overdueCount: overdue.length,
        completedCount: completed.length,
        latestPending
    };
}

function getRoleLabel() {
    const role = window.Auth?.getRole?.() || '';
    if (typeof window.Auth?.getRoleLabel === 'function') {
        return Auth.getRoleLabel(role) || role || 'Usuário';
    }
    return role || 'Usuário';
}

function formatLastUpdate() {
    return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(new Date());
}

function latestPendingText(entries) {
    if (!entries.length) {
        return '<span class="wwm-latest-empty">Nenhuma pendência ativa no momento.</span>';
    }

    return entries.map(({ record, status }) => {
        const number = Utils.escapeHtml(String(record?.numero || 'Sem número').replace(/^#/, ''));
        const label = Utils.escapeHtml(STATUS_LABELS[status] || status || 'Pendente');
        return `<span><strong>${number}</strong> · ${label}</span>`;
    }).join('<span class="wwm-latest-separator">|</span>');
}

function renderStatusCard(icon, value, label, tone) {
    return `<article class="wwm-status-card is-${tone}">
        <div class="wwm-status-number"><i class="fas ${icon}" aria-hidden="true"></i><strong>${Utils.formatNumber(value)}</strong></div>
        <span>${Utils.escapeHtml(label)}</span>
    </article>`;
}

function renderQuickActions() {
    const actions = [];
    if (window.Auth?.hasPermission?.('solicitacoes', 'create')) {
        actions.push('<button type="button" class="wwm-quick-action is-primary" onclick="App.navigate(\'nova-solicitacao\')"><i class="fas fa-plus"></i><span>Nova solicitação</span></button>');
    }
    if (window.Auth?.hasPermission?.('aprovacoes', 'view')) {
        actions.push('<button type="button" class="wwm-quick-action" onclick="App.navigate(\'aprovacoes\')"><i class="fas fa-clock"></i><span>Pendências</span></button>');
    }
    if (window.Auth?.hasPermission?.('relatorios', 'view')) {
        actions.push('<button type="button" class="wwm-quick-action" onclick="App.navigate(\'relatorios\')"><i class="fas fa-chart-column"></i><span>Histórico e análises</span></button>');
    }
    return actions.join('');
}

function renderHomeStage(source, summary) {
    return `<section class="wwm-home-stage" aria-labelledby="wwm-home-title">
        <div class="wwm-stage-brandline">
            <span>Plataforma de Controle de Peças MWW — Solenis Brasil</span>
            <span class="wwm-stage-sync"><i class="fas fa-circle" aria-hidden="true"></i> Sistema sincronizado</span>
        </div>
        <div class="wwm-stage-content">
            <span class="wwm-stage-kicker">PORTAL DE PEÇAS WWM</span>
            <h1 id="wwm-home-title">WAREWASHING MACHINE REQUEST</h1>
            <div class="wwm-stage-meta">
                <span>Perfil ${Utils.escapeHtml(getRoleLabel())}</span>
                <span>Base ${Utils.formatNumber(source.length)} solicitações</span>
                <span>Atualizado ${Utils.escapeHtml(formatLastUpdate())}</span>
            </div>
            <div class="wwm-latest-line"><strong>Últimas pendências</strong>${latestPendingText(summary.latestPending)}</div>
            <div class="wwm-status-grid">
                ${renderStatusCard('fa-clock', summary.pendingCount, 'Pendentes', 'pending')}
                ${renderStatusCard('fa-triangle-exclamation', summary.overdueCount, 'Atrasadas', 'overdue')}
                ${renderStatusCard('fa-check', summary.completedCount, 'Concluídas', 'completed')}
            </div>
            <div class="wwm-quick-actions">${renderQuickActions()}</div>
        </div>
    </section>`;
}

function renderMetric(label, value, note, icon, tone) {
    return `<article class="wwm-management-kpi is-${tone}">
        <div><span>${Utils.escapeHtml(label)}</span><i class="fas ${icon}" aria-hidden="true"></i></div>
        <strong>${value}</strong>
        <small>${Utils.escapeHtml(note)}</small>
    </article>`;
}

function renderTopParts(items = []) {
    if (!items.length) {
        return '<div class="wwm-empty-state"><i class="fas fa-box-open"></i><span>Sem custo de peças no período selecionado.</span></div>';
    }
    const max = Math.max(...items.map((item) => Number(item.totalCost) || 0), 1);
    return `<div class="wwm-impact-list">${items.slice(0, 6).map((item, index) => {
        const percent = Math.max(6, Math.round(((Number(item.totalCost) || 0) / max) * 100));
        return `<div class="wwm-impact-item">
            <div class="wwm-impact-row"><span><b>${index + 1}</b>${Utils.escapeHtml(item.descricao || item.codigo || 'Peça')}</span><strong>${Utils.formatCurrency(item.totalCost || 0)}</strong></div>
            <div class="wwm-impact-track"><span style="width:${percent}%"></span></div>
        </div>`;
    }).join('')}</div>`;
}

function renderRecentRows(rows = []) {
    if (!rows.length) {
        return '<div class="wwm-empty-state"><i class="fas fa-inbox"></i><span>Nenhuma solicitação no período selecionado.</span></div>';
    }
    return `<div class="wwm-recent-table-wrap"><table class="wwm-recent-table">
        <thead><tr><th>Data</th><th>Solicitação</th><th>Cliente</th><th>Técnico</th><th>Valor</th><th>Status</th></tr></thead>
        <tbody>${rows.slice(0, 8).map((row) => `<tr>
            <td>${Utils.formatDate(row.data || row.createdAt)}</td>
            <td><strong>#${Utils.escapeHtml(String(row.numero || 'Sem número').replace(/^#/, ''))}</strong></td>
            <td>${Utils.escapeHtml(row.cliente || row.clienteNome || 'Não informado')}</td>
            <td>${Utils.escapeHtml(row.tecnicoNome || row.requesterName || 'Não informado')}</td>
            <td>${Utils.formatCurrency(recordCost(row))}</td>
            <td>${Utils.renderStatusBadge(row.status)}</td>
        </tr>`).join('')}</tbody>
    </table></div>`;
}

function renderPeriodAlert(source, analysis) {
    if (!source.length || Number(analysis?.totalRequests || 0) > 0) return '';
    return `<div class="wwm-period-alert"><i class="fas fa-circle-info"></i><div><strong>Existem ${Utils.formatNumber(source.length)} solicitações na base, mas nenhuma está dentro deste período.</strong><span>Amplie o período para visualizar indicadores financeiros e movimentações anteriores.</span></div><button type="button" data-wwm-period="90">Ver 90 dias</button></div>`;
}

function renderManagementSection(source, period, analysis) {
    const rows = safeArray(analysis?.solicitations);
    const totalRequests = Number(analysis?.totalRequests || 0);
    const totalCost = Number(analysis?.totalCost || 0);
    const totalPieces = Number(analysis?.totalPieces || 0);
    const avg = Number(analysis?.averageCostPerSolicitation || 0);

    return `<section class="wwm-management-shell" aria-labelledby="wwm-management-title">
        <div class="wwm-management-heading">
            <div><span>GESTÃO E INTELIGÊNCIA</span><h2 id="wwm-management-title">Visão operacional e financeira</h2><p>Indicadores do período selecionado, preservando a prioridade operacional do WWM.</p></div>
            <div class="wwm-period-control"><label for="wwm-period-select">Período</label><select id="wwm-period-select"><option value="7" ${Dashboard.focusRangeDays === 7 ? 'selected' : ''}>Últimos 7 dias</option><option value="30" ${Dashboard.focusRangeDays === 30 ? 'selected' : ''}>Últimos 30 dias</option><option value="90" ${Dashboard.focusRangeDays === 90 ? 'selected' : ''}>Últimos 90 dias</option></select><button type="button" id="wwm-refresh-dashboard" title="Atualizar dados"><i class="fas fa-rotate"></i></button></div>
        </div>
        ${renderPeriodAlert(source, analysis)}
        <div class="wwm-management-kpis">
            ${renderMetric('Solicitações no período', Utils.formatNumber(totalRequests), `${Utils.formatNumber(source.length)} na base total`, 'fa-clipboard-list', 'blue')}
            ${renderMetric('Custo do período', Utils.formatCurrency(totalCost), `${Utils.formatNumber(rows.length)} registros analisados`, 'fa-sack-dollar', 'green')}
            ${renderMetric('Ticket médio', Utils.formatCurrency(avg), 'Custo médio por solicitação', 'fa-receipt', 'teal')}
            ${renderMetric('Peças movimentadas', Utils.formatNumber(totalPieces), `${Utils.formatDate(period.dateFrom)} a ${Utils.formatDate(period.dateTo)}`, 'fa-boxes-stacked', 'amber')}
        </div>
        <div class="wwm-analytics-grid">
            <article class="wwm-analytics-card is-wide"><div class="wwm-card-heading"><div><span>TENDÊNCIA</span><h3>Evolução do custo mensal</h3></div></div><div class="wwm-chart-area">${safeArray(analysis?.byMonth).length ? '<canvas id="wwm-cost-trend-chart"></canvas>' : '<div class="wwm-empty-state"><i class="fas fa-chart-line"></i><span>Sem dados mensais no período.</span></div>'}</div></article>
            <article class="wwm-analytics-card"><div class="wwm-card-heading"><div><span>FLUXO</span><h3>Distribuição por status</h3></div></div><div class="wwm-chart-area is-donut">${Object.keys(analysis?.byStatus || {}).length ? '<canvas id="wwm-status-chart"></canvas>' : '<div class="wwm-empty-state"><i class="fas fa-chart-pie"></i><span>Sem solicitações no período.</span></div>'}</div></article>
        </div>
        <div class="wwm-detail-grid">
            <article class="wwm-analytics-card"><div class="wwm-card-heading"><div><span>CONCENTRAÇÃO</span><h3>Peças de maior impacto</h3></div><button type="button" onclick="App.navigate('relatorios')">Abrir relatórios</button></div>${renderTopParts(analysis?.topPieces || [])}</article>
            <article class="wwm-analytics-card"><div class="wwm-card-heading"><div><span>MOVIMENTAÇÃO</span><h3>Solicitações recentes</h3></div><button type="button" onclick="App.navigate('solicitacoes')">Ver todas</button></div>${renderRecentRows(rows)}</article>
        </div>
    </section>`;
}

function renderLoading() {
    return `<div class="wwm-dashboard-v57" data-testid="wwm-dashboard-v57" data-dashboard-state="loading"><section class="wwm-home-stage is-loading"><div class="wwm-loading-block"><i class="fas fa-arrows-rotate fa-spin"></i><div><span>PORTAL DE PEÇAS WWM</span><h1>Sincronizando dados operacionais</h1><p>Carregando solicitações, pendências, custos e movimentações da base corporativa.</p></div></div></section></div>`;
}

function renderEmpty() {
    return `<div class="wwm-dashboard-v57" data-testid="wwm-dashboard-v57" data-dashboard-state="empty"><section class="wwm-home-stage"><div class="wwm-stage-content"><span class="wwm-stage-kicker">PORTAL DE PEÇAS WWM</span><h1>WAREWASHING MACHINE REQUEST</h1><div class="wwm-empty-base"><i class="fas fa-database"></i><div><strong>Nenhuma solicitação disponível para este perfil.</strong><span>Quando a base corporativa receber registros, a visão operacional será atualizada automaticamente.</span></div><button type="button" id="wwm-empty-refresh">Atualizar agora</button></div></div></section></div>`;
}

function isDataHydrating() {
    return Boolean(
        window.DataManager?.initializing
        || window.DataManager?.initialized === false
        || window.DataManager?.isCloudConnecting?.()
        || Dashboard._wwmHydrationPending
    );
}

function destroyCharts() {
    Object.values(Dashboard._wwmCharts || {}).forEach((chart) => chart?.destroy?.());
    Dashboard._wwmCharts = {};
}

function drawCharts(analysis) {
    destroyCharts();
    if (!window.Chart) return;

    const months = safeArray(analysis?.byMonth);
    const trend = document.getElementById('wwm-cost-trend-chart');
    if (trend && months.length) {
        Dashboard._wwmCharts.trend = new Chart(trend, {
            type: 'line',
            data: {
                labels: months.map((item) => item.label),
                datasets: [{
                    label: 'Custo de peças',
                    data: months.map((item) => Number(item.totalCost) || 0),
                    borderColor: '#0a776f',
                    backgroundColor: 'rgba(10,119,111,.12)',
                    fill: true,
                    tension: .3,
                    borderWidth: 3,
                    pointRadius: 3,
                    pointHoverRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: { callbacks: { label: (context) => ` ${Utils.formatCurrency(context.parsed.y || 0)}` } } },
                scales: { y: { beginAtZero: true, ticks: { callback: (value) => Utils.formatCurrency(Number(value) || 0) }, grid: { color: 'rgba(15,35,55,.08)' } }, x: { grid: { display: false } } }
            }
        });
    }

    const statusEntries = Object.entries(analysis?.byStatus || {}).filter(([, value]) => Number(value) > 0);
    const status = document.getElementById('wwm-status-chart');
    if (status && statusEntries.length) {
        Dashboard._wwmCharts.status = new Chart(status, {
            type: 'doughnut',
            data: {
                labels: statusEntries.map(([key]) => STATUS_LABELS[key] || key),
                datasets: [{ data: statusEntries.map(([, value]) => Number(value) || 0), backgroundColor: ['#f1b82d', '#2fc7a5', '#2c7be5', '#8ea0b5', '#e45b64', '#7559d9'], borderColor: '#ffffff', borderWidth: 4 }]
            },
            options: { responsive: true, maintainAspectRatio: false, cutout: '66%', plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8, padding: 14 } } } }
        });
    }
}

async function requestHydration() {
    if (Dashboard._wwmHydrationPromise || !window.DataManager?.syncAll) return Dashboard._wwmHydrationPromise;
    Dashboard._wwmHydrationPending = true;
    Dashboard._wwmHydrationPromise = Promise.resolve()
        .then(() => DataManager.syncAll('dashboard_wwm_v57'))
        .catch(() => false)
        .finally(() => {
            Dashboard._wwmHydrationPending = false;
            Dashboard._wwmHydrationPromise = null;
            if (String(window.App?.currentPage || '') === 'dashboard') {
                Dashboard.render();
            }
        });
    return Dashboard._wwmHydrationPromise;
}

function bindControls() {
    document.getElementById('wwm-period-select')?.addEventListener('change', (event) => {
        Dashboard.focusRangeDays = Number(event.target.value) || DEFAULT_RANGE_DAYS;
        Dashboard.render();
    });
    document.querySelector('[data-wwm-period="90"]')?.addEventListener('click', () => {
        Dashboard.focusRangeDays = 90;
        Dashboard.render();
    });
    document.getElementById('wwm-refresh-dashboard')?.addEventListener('click', async () => {
        Dashboard._wwmForceSync = true;
        await requestHydration();
    });
    document.getElementById('wwm-empty-refresh')?.addEventListener('click', () => requestHydration());
}

function installRefreshEvents() {
    if (Dashboard.__wwmV57RefreshBound) return;
    Dashboard.__wwmV57RefreshBound = true;
    let refreshTimer = null;
    const refresh = () => {
        if (String(window.App?.currentPage || '') !== 'dashboard') return;
        window.clearTimeout(refreshTimer);
        refreshTimer = window.setTimeout(() => Dashboard.render(), 120);
    };
    ['data:updated', 'storage:ready', 'firebase:ready', 'firebase:sync-complete'].forEach((eventName) => window.addEventListener(eventName, refresh));
    window.addEventListener('online', () => {
        if (String(window.App?.currentPage || '') === 'dashboard') {
            requestHydration();
        }
    });
    [250, 800, 1800, 3500, 6500, 10000].forEach((delay) => window.setTimeout(refresh, delay));
}

function installDashboardBodyState() {
    if (window.App && !App.__wwmV57NavigateWrapped) {
        const originalNavigate = App.navigate.bind(App);
        App.navigate = async function navigateWwmV57(pageId) {
            const resolved = window.NavigationMaster?.resolveRoute?.(pageId)?.pageId || pageId;
            document.body.classList.toggle('wwm-dashboard-active', resolved === 'dashboard');
            return originalNavigate(pageId);
        };
        App.__wwmV57NavigateWrapped = true;
    }
}

export function applyDashboardWwmV57() {
    if (!window.Dashboard || Dashboard.__wwmDashboardV57) return;
    Dashboard.__wwmDashboardV57 = true;
    Dashboard.focusRangeDays = Number(Dashboard.focusRangeDays) || DEFAULT_RANGE_DAYS;
    Dashboard._wwmCharts = Dashboard._wwmCharts || {};
    Dashboard._wwmHydrationPending = false;
    Dashboard._wwmHydrationPromise = null;
    Dashboard._wwmZeroSyncAttempted = false;

    installDashboardBodyState();
    installRefreshEvents();

    Dashboard.render = function renderWwmDashboardV57() {
        const content = document.getElementById('content-area');
        if (!content) return;
        document.body.classList.add('wwm-dashboard-active');
        destroyCharts();

        const source = getSource();
        const hydrating = isDataHydrating();

        if (source.length === 0 && !Dashboard._wwmZeroSyncAttempted && navigator.onLine !== false && window.DataManager?.syncAll) {
            Dashboard._wwmZeroSyncAttempted = true;
            requestHydration();
        }

        if (source.length === 0 && (hydrating || Dashboard._wwmHydrationPending)) {
            content.innerHTML = renderLoading();
            return;
        }

        if (source.length === 0) {
            content.innerHTML = renderEmpty();
            bindControls();
            return;
        }

        Dashboard._wwmZeroSyncAttempted = false;
        const { period, analysis } = buildAnalysis(source, Number(Dashboard.focusRangeDays) || DEFAULT_RANGE_DAYS);
        const summary = buildOperationalSummary(source);
        content.innerHTML = `<div class="wwm-dashboard-v57" data-testid="wwm-dashboard-v57" data-dashboard-state="ready" data-dashboard-source-count="${source.length}" data-dashboard-period-count="${Number(analysis?.totalRequests || 0)}">${renderHomeStage(source, summary)}${renderManagementSection(source, period, analysis)}</div>`;
        bindControls();
        requestAnimationFrame(() => drawCharts(analysis));
        document.body.dataset.currentPage = 'dashboard';
        if (typeof window.Auth?.renderMenu === 'function') {
            Auth.renderMenu('dashboard');
        }
    };
}
