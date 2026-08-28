const DEFAULT_RANGE_DAYS = 30;

const STATUS_GROUPS = [
    { key: 'pending', label: 'Em aprovação', statuses: ['pendente', 'rascunho', 'enviada'], tone: 'warning' },
    { key: 'approved', label: 'Aprovadas', statuses: ['aprovada'], tone: 'success' },
    { key: 'transit', label: 'Em trânsito', statuses: ['em-transito'], tone: 'info' },
    { key: 'completed', label: 'Finalizadas', statuses: ['finalizada', 'entregue', 'historico-manual'], tone: 'neutral' },
    { key: 'rejected', label: 'Rejeitadas', statuses: ['rejeitada'], tone: 'danger' }
];

const DASHBOARD_SECTIONS = [
    { id: 'operational-overview', label: 'Resumo executivo', icon: 'fa-gauge-high' },
    { id: 'operational-indicators', label: 'Indicadores', icon: 'fa-chart-simple' },
    { id: 'operational-flow', label: 'Fluxo operacional', icon: 'fa-diagram-project' },
    { id: 'operational-costs', label: 'Custos e tendência', icon: 'fa-chart-line' },
    { id: 'operational-impact', label: 'Peças de maior impacto', icon: 'fa-boxes-stacked' },
    { id: 'operational-recent', label: 'Solicitações recentes', icon: 'fa-clock-rotate-left' }
];

function safeRows() {
    const rows = window.DataManager?.getSolicitations?.();
    return Array.isArray(rows) ? rows : [];
}

function accessibleSolicitations() {
    return safeRows().filter((row) => (
        typeof Dashboard.canAccessDashboardRecord !== 'function'
        || Dashboard.canAccessDashboardRecord(row)
    ));
}

function normalizePeriod(days) {
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

function buildAnalysis(days) {
    const period = normalizePeriod(days);
    const source = accessibleSolicitations();
    const role = window.Auth?.getRole?.() || 'anon';

    const analysis = window.AnalyticsHelper?.buildOperationalAnalysis
        ? AnalyticsHelper.buildOperationalAnalysis(source, {
            moduleKey: 'dashboard',
            period: {
                dateFrom: period.dateFrom,
                dateTo: period.dateTo,
                rangeDays: period.rangeDays
            },
            useDefaultPeriod: false,
            cacheKey: `dashboard-v55:${role}:${period.dateFrom}:${period.dateTo}`
        })
        : {
            solicitations: source,
            totalRequests: source.length,
            totalCost: 0,
            averageCostPerSolicitation: 0,
            totalPieces: 0,
            byStatus: {},
            byMonth: [],
            topPieces: []
        };

    return { period, source, analysis };
}

function isSynchronizing() {
    const cloudStatus = String(window.__cloudSyncStatus || '').toLowerCase();
    const connecting = Boolean(window.DataManager?.isCloudConnecting?.());
    return connecting || ['connecting', 'syncing', 'loading', 'initializing'].includes(cloudStatus);
}

function statusDistribution(analysis) {
    const raw = analysis.byStatus || {};
    return STATUS_GROUPS.map((group) => ({
        ...group,
        value: group.statuses.reduce((sum, status) => sum + (Number(raw[status]) || 0), 0)
    }));
}

function renderMetric(label, value, note, icon, tone = 'primary') {
    return `<article class="premium-kpi premium-kpi-v55 is-${tone}">
        <div class="premium-kpi-heading">
            <span class="premium-kpi-label">${Utils.escapeHtml(label)}</span>
            <span class="premium-kpi-icon" aria-hidden="true"><i class="fas ${icon}"></i></span>
        </div>
        <strong class="premium-kpi-value">${value}</strong>
        <div class="premium-kpi-footer"><span>${Utils.escapeHtml(note)}</span></div>
    </article>`;
}

function renderGlobalActions() {
    const actions = [];
    if (window.Auth?.hasPermission?.('solicitacoes', 'create')) {
        actions.push('<button class="btn btn-primary btn-sm" onclick="App.navigate(\'nova-solicitacao\')"><i class="fas fa-plus"></i> Nova solicitação</button>');
    }
    if (window.Auth?.hasPermission?.('aprovacoes', 'view')) {
        actions.push('<button class="btn btn-outline btn-sm" onclick="App.navigate(\'aprovacoes\')"><i class="fas fa-check-double"></i> Aprovações</button>');
    }
    return actions.join('');
}

function renderSideNavigation() {
    const shortcuts = [];
    if (window.Auth?.hasPermission?.('aprovacoes', 'view')) {
        shortcuts.push('<button type="button" class="premium-dashboard-side-action" onclick="App.navigate(\'aprovacoes\')"><i class="fas fa-check-double"></i><span>Aprovações</span></button>');
    }
    if (window.Auth?.hasPermission?.('relatorios', 'view')) {
        shortcuts.push('<button type="button" class="premium-dashboard-side-action" onclick="App.navigate(\'relatorios\')"><i class="fas fa-chart-column"></i><span>Relatórios</span></button>');
    }

    return `<aside class="premium-dashboard-side-nav" aria-label="Menu da visão operacional">
        <div class="premium-dashboard-side-heading">
            <span>VISÃO OPERACIONAL</span>
            <small>Navegação do painel</small>
        </div>
        <nav class="premium-dashboard-side-links">
            ${DASHBOARD_SECTIONS.map((item, index) => `<a href="#${item.id}" class="premium-dashboard-side-link ${index === 0 ? 'active' : ''}" data-dashboard-anchor="${item.id}"><i class="fas ${item.icon}" aria-hidden="true"></i><span>${Utils.escapeHtml(item.label)}</span></a>`).join('')}
        </nav>
        ${shortcuts.length ? `<div class="premium-dashboard-side-shortcuts"><span>ATALHOS</span>${shortcuts.join('')}</div>` : ''}
    </aside>`;
}

function bindSideNavigation() {
    const nav = document.querySelector('.premium-dashboard-side-nav');
    if (!nav) return;

    const links = Array.from(nav.querySelectorAll('[data-dashboard-anchor]'));
    const sections = links
        .map((link) => document.getElementById(link.dataset.dashboardAnchor))
        .filter(Boolean);

    const activate = (id) => {
        links.forEach((link) => {
            const active = link.dataset.dashboardAnchor === id;
            link.classList.toggle('active', active);
            if (active) link.setAttribute('aria-current', 'location');
            else link.removeAttribute('aria-current');
        });
    };

    links.forEach((link) => {
        link.addEventListener('click', (event) => {
            const target = document.getElementById(link.dataset.dashboardAnchor);
            if (!target) return;
            event.preventDefault();
            activate(link.dataset.dashboardAnchor);
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    });

    Dashboard._premiumSectionObserver?.disconnect?.();
    if (!('IntersectionObserver' in window) || sections.length === 0) return;

    Dashboard._premiumSectionObserver = new IntersectionObserver((entries) => {
        const visible = entries
            .filter((entry) => entry.isIntersecting)
            .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target?.id) activate(visible.target.id);
    }, { rootMargin: '-18% 0px -62% 0px', threshold: [0.05, 0.2, 0.45] });

    sections.forEach((section) => Dashboard._premiumSectionObserver.observe(section));
}

function renderStatusStrip(statuses) {
    return statuses.map((item) => `<div class="premium-status-item is-${item.tone}">
        <span>${Utils.escapeHtml(item.label)}</span>
        <strong>${Utils.formatNumber(item.value)}</strong>
    </div>`).join('');
}

function renderTopParts(items = []) {
    if (!items.length) {
        return '<div class="premium-empty premium-empty-compact"><i class="fas fa-chart-bar"></i><span>Sem custos de peças no período.</span></div>';
    }

    const max = Math.max(...items.map((item) => Number(item.totalCost) || 0), 1);
    return `<div class="premium-ranking-list">${items.slice(0, 6).map((item, index) => {
        const width = Math.max(6, Math.round(((Number(item.totalCost) || 0) / max) * 100));
        return `<div class="premium-ranking-item">
            <div class="premium-ranking-topline">
                <span><b>${index + 1}</b>${Utils.escapeHtml(item.descricao || item.codigo || 'Sem descrição')}</span>
                <strong>${Utils.formatCurrency(item.totalCost || 0)}</strong>
            </div>
            <div class="premium-ranking-track"><span style="width:${width}%"></span></div>
            <small>${Utils.formatNumber(item.quantidade || 0)} unidade(s)</small>
        </div>`;
    }).join('')}</div>`;
}

function solicitationCost(row) {
    return Number(row?._analysisCost ?? row?.total) || 0;
}

function renderRecentRows(rows = []) {
    return rows.slice(0, 8).map((row) => `<tr>
        <td>${Utils.formatDate(row.data || row.createdAt)}</td>
        <td><strong>#${Utils.escapeHtml(String(row.numero || 'Sem número'))}</strong></td>
        <td>${Utils.escapeHtml(row.cliente || row.clienteNome || 'Não informado')}</td>
        <td>${Utils.escapeHtml(row.tecnicoNome || row.requesterName || 'Não informado')}</td>
        <td class="premium-money-cell">${Utils.formatCurrency(solicitationCost(row))}</td>
        <td>${Utils.renderStatusBadge(row.status)}</td>
    </tr>`).join('');
}

function renderRecentTable(rows = []) {
    if (!rows.length) {
        return '<div class="premium-empty premium-empty-compact"><i class="fas fa-inbox"></i><span>Nenhuma solicitação encontrada no período.</span></div>';
    }

    return `<div class="premium-table-wrap"><table class="premium-table">
        <thead><tr><th>Data</th><th>Solicitação</th><th>Cliente</th><th>Técnico</th><th>Valor</th><th>Status</th></tr></thead>
        <tbody>${renderRecentRows(rows)}</tbody>
    </table></div>`;
}

function destroyCharts() {
    Object.values(Dashboard._premiumCharts || {}).forEach((chart) => chart?.destroy?.());
    Dashboard._premiumCharts = {};
}

function chartPalette() {
    const styles = getComputedStyle(document.body);
    return {
        primary: styles.getPropertyValue('--premium-accent').trim() || '#1261a6',
        teal: styles.getPropertyValue('--premium-teal').trim() || '#0b7d78',
        warning: styles.getPropertyValue('--premium-warning').trim() || '#c87800',
        danger: styles.getPropertyValue('--premium-danger').trim() || '#bd3f4b',
        muted: styles.getPropertyValue('--premium-muted').trim() || '#66758a',
        surface: styles.getPropertyValue('--premium-surface').trim() || '#ffffff',
        grid: 'rgba(148, 163, 184, 0.20)',
        text: '#475569'
    };
}

function drawCharts(analysis, statuses) {
    destroyCharts();
    if (!window.Chart) return;

    const colors = chartPalette();
    const months = Array.isArray(analysis.byMonth) ? analysis.byMonth : [];
    const trendCanvas = document.getElementById('premium-cost-trend-chart');

    if (trendCanvas && months.length) {
        Dashboard._premiumCharts.trend = new Chart(trendCanvas, {
            type: 'line',
            data: {
                labels: months.map((item) => item.label),
                datasets: [{
                    label: 'Custo de peças',
                    data: months.map((item) => Number(item.totalCost) || 0),
                    borderColor: colors.primary,
                    backgroundColor: `${colors.primary}1f`,
                    fill: true,
                    tension: 0.32,
                    borderWidth: 3,
                    pointRadius: 3,
                    pointHoverRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (context) => `Custo: ${Utils.formatCurrency(context.parsed.y || 0)}`
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { color: colors.text, callback: (value) => Utils.formatCurrency(Number(value) || 0) },
                        grid: { color: colors.grid }
                    },
                    x: { ticks: { color: colors.text }, grid: { display: false } }
                }
            }
        });
    }

    const activeStatuses = statuses.filter((item) => item.value > 0);
    const statusCanvas = document.getElementById('premium-status-chart');
    if (statusCanvas && activeStatuses.length) {
        Dashboard._premiumCharts.status = new Chart(statusCanvas, {
            type: 'doughnut',
            data: {
                labels: activeStatuses.map((item) => item.label),
                datasets: [{
                    data: activeStatuses.map((item) => item.value),
                    backgroundColor: [colors.warning, colors.teal, colors.primary, colors.muted, colors.danger],
                    borderColor: colors.surface,
                    borderWidth: 4,
                    hoverOffset: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '68%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { usePointStyle: true, boxWidth: 8, color: colors.text, padding: 16 }
                    }
                }
            }
        });
    }
}

function renderSyncState(period) {
    return `<div class="premium-dashboard premium-dashboard-with-side-nav" data-testid="premium-dashboard" data-dashboard-state="loading">
        <div class="premium-dashboard-layout">
            ${renderSideNavigation()}
            <main class="premium-dashboard-main">
                <section class="premium-dashboard-loading-panel">
                    <span class="premium-dashboard-loading-icon"><i class="fas fa-arrows-rotate fa-spin"></i></span>
                    <div><span class="premium-panel-kicker">SINCRONIZAÇÃO</span><h1>Carregando a visão operacional</h1><p>Estamos consolidando solicitações, custos, peças e status do período de ${Utils.formatDate(period.dateFrom)} a ${Utils.formatDate(period.dateTo)}.</p></div>
                </section>
                <section class="premium-dashboard-skeleton-grid" aria-hidden="true">${Array.from({ length: 4 }, () => '<span></span>').join('')}</section>
            </main>
        </div>
    </div>`;
}

function renderDashboardContent(period, source, analysis) {
    const statuses = statusDistribution(analysis);
    const pending = statuses.find((item) => item.key === 'pending')?.value || 0;
    const periodRows = Array.isArray(analysis.solicitations) ? analysis.solicitations : [];
    const parts = window.ElectricalCatalogPolicy?.filterParts(window.DataManager?.getParts?.() || []) || window.DataManager?.getParts?.() || [];
    const periodEmpty = source.length > 0 && Number(analysis.totalRequests || 0) === 0;

    return `<div class="premium-dashboard premium-dashboard-with-side-nav" data-testid="premium-dashboard" data-dashboard-state="ready" data-dashboard-source-count="${source.length}" data-dashboard-period-count="${Number(analysis.totalRequests || 0)}">
        <div class="premium-dashboard-layout">
            ${renderSideNavigation()}
            <main class="premium-dashboard-main">
                <header id="operational-overview" class="premium-dashboard-hero premium-dashboard-section">
                    <div class="premium-hero-copy">
                        <span class="premium-eyebrow"><i class="fas fa-sparkles"></i> Gestão executiva de peças</span>
                        <h1>Visão operacional e financeira</h1>
                        <p>Indicadores consolidados para priorizar aprovações, controlar custos e antecipar desvios.</p>
                        <div class="premium-hero-meta">
                            <span><i class="fas fa-calendar-days"></i>${Utils.formatDate(period.dateFrom)} a ${Utils.formatDate(period.dateTo)}</span>
                            <span><i class="fas fa-database"></i>${Utils.formatNumber(source.length)} solicitações disponíveis</span>
                            <span><i class="fas fa-shield-halved"></i>${Utils.formatNumber(parts.length)} peças ativas</span>
                        </div>
                    </div>
                    <div class="premium-hero-controls">
                        <label for="focus-period">Período</label>
                        <select id="focus-period" class="form-control">
                            <option value="7" ${Dashboard.focusRangeDays === 7 ? 'selected' : ''}>Últimos 7 dias</option>
                            <option value="30" ${Dashboard.focusRangeDays === 30 ? 'selected' : ''}>Últimos 30 dias</option>
                            <option value="90" ${Dashboard.focusRangeDays === 90 ? 'selected' : ''}>Últimos 90 dias</option>
                        </select>
                        <div class="premium-hero-actions">${renderGlobalActions()}</div>
                    </div>
                </header>

                ${periodEmpty ? `<div class="premium-dashboard-period-alert"><i class="fas fa-circle-info"></i><div><strong>Há dados no sistema, mas nenhum registro está dentro deste período.</strong><span>Amplie o período para 90 dias ou consulte os Relatórios para uma análise histórica.</span></div><button class="btn btn-outline btn-sm" type="button" data-dashboard-range="90">Ver 90 dias</button></div>` : ''}

                <section id="operational-indicators" class="premium-kpi-grid premium-dashboard-section" aria-label="Indicadores principais">
                    ${renderMetric('Solicitações no período', Utils.formatNumber(analysis.totalRequests || 0), `${Utils.formatNumber(source.length)} registros disponíveis`, 'fa-clipboard-list', 'primary')}
                    ${renderMetric('Custo no período', Utils.formatCurrency(analysis.totalCost || 0), `${Utils.formatNumber(analysis.totalApproved || 0)} solicitações com custo`, 'fa-sack-dollar', 'success')}
                    ${renderMetric('Aguardando aprovação', Utils.formatNumber(pending), 'Itens que exigem decisão', 'fa-clock', 'warning')}
                    ${renderMetric('Peças movimentadas', Utils.formatNumber(analysis.totalPieces || 0), `Ticket médio ${Utils.formatCurrency(analysis.averageCostPerSolicitation || 0)}`, 'fa-boxes-stacked', 'info')}
                </section>

                <section id="operational-flow" class="premium-status-strip premium-dashboard-section" aria-label="Resumo por status">${renderStatusStrip(statuses)}</section>

                ${pending && window.Auth?.hasPermission?.('aprovacoes', 'view') ? `<div class="premium-action-alert"><div><span class="premium-alert-icon"><i class="fas fa-bolt"></i></span><div><strong>${Utils.formatNumber(pending)} solicitação(ões) aguardando análise</strong><small>Priorize os itens mais antigos para reduzir o tempo de ciclo.</small></div></div><button class="btn btn-primary btn-sm" onclick="App.navigate('aprovacoes')">Revisar aprovações</button></div>` : ''}

                <section id="operational-costs" class="premium-chart-grid premium-dashboard-section">
                    <article class="premium-panel premium-panel-wide">
                        <div class="premium-panel-header"><div><span class="premium-panel-kicker">TENDÊNCIA</span><h2>Evolução do custo mensal</h2><p>Somatório financeiro dos registros no período selecionado.</p></div></div>
                        <div class="premium-chart-shell">${analysis.byMonth?.length ? '<canvas id="premium-cost-trend-chart" role="img" aria-label="Gráfico de evolução do custo mensal"></canvas>' : '<div class="premium-empty">Sem dados mensais no período.</div>'}</div>
                    </article>
                    <article class="premium-panel">
                        <div class="premium-panel-header"><div><span class="premium-panel-kicker">FLUXO</span><h2>Distribuição por status</h2><p>Volume em cada etapa operacional.</p></div></div>
                        <div class="premium-chart-shell premium-chart-shell-donut">${statuses.some((item) => item.value) ? '<canvas id="premium-status-chart" role="img" aria-label="Gráfico de distribuição por status"></canvas>' : '<div class="premium-empty">Sem solicitações no período.</div>'}</div>
                    </article>
                </section>

                <section class="premium-detail-grid">
                    <article id="operational-impact" class="premium-panel premium-dashboard-section">
                        <div class="premium-panel-header"><div><span class="premium-panel-kicker">CONCENTRAÇÃO</span><h2>Peças com maior impacto</h2></div><button class="btn btn-outline btn-sm" onclick="App.navigate('relatorios')">Abrir relatórios</button></div>
                        ${renderTopParts(analysis.topPieces || [])}
                    </article>
                    <article id="operational-recent" class="premium-panel premium-dashboard-section">
                        <div class="premium-panel-header"><div><span class="premium-panel-kicker">MOVIMENTAÇÃO</span><h2>Solicitações recentes</h2></div><button class="btn btn-outline btn-sm" onclick="App.navigate('solicitacoes')">Ver todas</button></div>
                        ${renderRecentTable(periodRows)}
                    </article>
                </section>
            </main>
        </div>
    </div>`;
}

function bindDashboardControls() {
    document.getElementById('focus-period')?.addEventListener('change', (event) => {
        Dashboard.focusRangeDays = Number(event.target.value) || DEFAULT_RANGE_DAYS;
        Dashboard.render();
    });

    document.querySelector('[data-dashboard-range="90"]')?.addEventListener('click', () => {
        Dashboard.focusRangeDays = 90;
        Dashboard.render();
    });

    bindSideNavigation();
}

function installRefreshEvents() {
    if (Dashboard.__premiumV55RefreshBound) return;
    Dashboard.__premiumV55RefreshBound = true;
    let timer = null;

    const refresh = () => {
        const currentPage = String(window.App?.currentPage || document.body.dataset.currentPage || '');
        const dashboardVisible = currentPage === 'dashboard' || Boolean(document.querySelector('[data-testid="premium-dashboard"]'));
        if (!dashboardVisible) return;
        window.clearTimeout(timer);
        timer = window.setTimeout(() => Dashboard.render(), 120);
    };

    ['data:updated', 'storage:ready', 'firebase:ready', 'firebase:sync-complete'].forEach((eventName) => {
        window.addEventListener(eventName, refresh);
    });
    window.addEventListener('online', refresh);

    [250, 700, 1500, 3000].forEach((delay) => window.setTimeout(refresh, delay));
}

export function applyDashboardPremiumV55() {
    if (!window.Dashboard || Dashboard.__premiumDashboardV55) return;

    Dashboard.__premiumDashboardV55 = true;
    Dashboard.focusRangeDays = Number(Dashboard.focusRangeDays) || DEFAULT_RANGE_DAYS;
    Dashboard._premiumCharts = Dashboard._premiumCharts || {};
    Dashboard._premiumSectionObserver = Dashboard._premiumSectionObserver || null;

    Dashboard.render = function renderPremiumDashboardV55() {
        const content = document.getElementById('content-area');
        if (!content) return;

        const rangeDays = Number(this.focusRangeDays) || DEFAULT_RANGE_DAYS;
        const { period, source, analysis } = buildAnalysis(rangeDays);
        destroyCharts();
        this._premiumSectionObserver?.disconnect?.();

        if (source.length === 0 && isSynchronizing()) {
            content.innerHTML = renderSyncState(period);
            bindSideNavigation();
        } else {
            content.innerHTML = renderDashboardContent(period, source, analysis);
            bindDashboardControls();
            requestAnimationFrame(() => drawCharts(analysis, statusDistribution(analysis)));
        }

        document.body.dataset.currentPage = 'dashboard';
        if (typeof window.Auth?.renderMenu === 'function') {
            Auth.renderMenu('dashboard');
        }
    };

    Dashboard.refreshOperationalData = () => Dashboard.render();
    installRefreshEvents();
}
