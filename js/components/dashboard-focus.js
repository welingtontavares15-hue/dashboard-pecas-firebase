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

function metric(label, value, note, icon) {
    return `<article class="premium-kpi"><div class="premium-kpi-heading"><span class="premium-kpi-label">${Utils.escapeHtml(label)}</span><span class="premium-kpi-icon" aria-hidden="true"><i class="fas ${icon}"></i></span></div><strong class="premium-kpi-value">${value}</strong><div class="premium-kpi-footer"><span>${Utils.escapeHtml(note)}</span></div></article>`;
}

function actions() {
    const html = [];
    if (Auth.hasPermission('solicitacoes', 'create')) html.push('<button class="btn btn-primary btn-sm" onclick="App.navigate(\'nova-solicitacao\')"><i class="fas fa-plus"></i> Nova solicitação</button>');
    if (Auth.hasPermission('aprovacoes', 'view')) html.push('<button class="btn btn-outline btn-sm" onclick="App.navigate(\'aprovacoes\')"><i class="fas fa-check-double"></i> Aprovações</button>');
    return html.join('');
}

function dashboardSideNavigation() {
    const shortcuts = [];
    if (Auth.hasPermission('aprovacoes', 'view')) {
        shortcuts.push('<button type="button" class="premium-dashboard-side-action" onclick="App.navigate(\'aprovacoes\')"><i class="fas fa-check-double"></i><span>Aprovações</span></button>');
    }
    if (Auth.hasPermission('relatorios', 'view')) {
        shortcuts.push('<button type="button" class="premium-dashboard-side-action" onclick="App.navigate(\'relatorios\')"><i class="fas fa-chart-column"></i><span>Relatórios</span></button>');
    }

    return `<aside class="premium-dashboard-side-nav" aria-label="Menu da visão operacional">
        <div class="premium-dashboard-side-heading"><span>VISÃO OPERACIONAL</span><small>Navegação do painel</small></div>
        <nav class="premium-dashboard-side-links">
            ${DASHBOARD_SECTIONS.map((item, index) => `<a href="#${item.id}" class="premium-dashboard-side-link ${index === 0 ? 'active' : ''}" data-dashboard-anchor="${item.id}"><i class="fas ${item.icon}" aria-hidden="true"></i><span>${Utils.escapeHtml(item.label)}</span></a>`).join('')}
        </nav>
        ${shortcuts.length ? `<div class="premium-dashboard-side-shortcuts"><span>ATALHOS</span>${shortcuts.join('')}</div>` : ''}
    </aside>`;
}

function bindDashboardSideNavigation() {
    const nav = document.querySelector('.premium-dashboard-side-nav');
    if (!nav) return;

    const links = Array.from(nav.querySelectorAll('[data-dashboard-anchor]'));
    const sections = links.map((link) => document.getElementById(link.dataset.dashboardAnchor)).filter(Boolean);

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

    if (!('IntersectionObserver' in window) || sections.length === 0) return;
    Dashboard._premiumSectionObserver?.disconnect?.();
    Dashboard._premiumSectionObserver = new IntersectionObserver((entries) => {
        const visible = entries
            .filter((entry) => entry.isIntersecting)
            .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target?.id) activate(visible.target.id);
    }, { rootMargin: '-18% 0px -62% 0px', threshold: [0.05, 0.2, 0.45] });
    sections.forEach((section) => Dashboard._premiumSectionObserver.observe(section));
}

function solicitationCost(row) {
    const items = Array.isArray(row?.itens) ? row.itens : [];
    const total = items.reduce((sum, item) => sum + (Number(item?.quantidade) || 0) * (Number(item?.valorUnit) || 0), 0);
    return total || Number(row?.total) || 0;
}

function recentRows(rows) {
    return (rows || []).slice(0, 7).map((row) => `<tr><td>${Utils.formatDate(row.data || row.createdAt)}</td><td><strong>#${Utils.escapeHtml(String(row.numero || 'Sem número'))}</strong></td><td>${Utils.escapeHtml(row.cliente || row.clienteNome || 'Não informado')}</td><td>${Utils.escapeHtml(row.tecnicoNome || 'Não informado')}</td><td class="premium-money-cell">${Utils.formatCurrency(solicitationCost(row))}</td><td>${Utils.renderStatusBadge(row.status)}</td></tr>`).join('');
}

function topParts(items) {
    if (!items?.length) return '<div class="premium-empty"><i class="fas fa-chart-bar"></i><span>Sem custos de peças no período.</span></div>';
    const max = Number(items[0]?.totalCost) || 1;
    return `<div class="premium-ranking-list">${items.slice(0, 5).map((item, index) => {
        const width = Math.max(8, Math.round(((Number(item.totalCost) || 0) / max) * 100));
        return `<div class="premium-ranking-item"><div class="premium-ranking-topline"><span><b>${index + 1}</b>${Utils.escapeHtml(item.descricao || item.codigo || 'Sem descrição')}</span><strong>${Utils.formatCurrency(item.totalCost || 0)}</strong></div><div class="premium-ranking-track"><span style="width:${width}%"></span></div><small>${Utils.formatNumber(item.quantidade || 0)} unidade(s)</small></div>`;
    }).join('')}</div>`;
}

function destroyCharts(dashboard) {
    Object.values(dashboard._premiumCharts || {}).forEach((chart) => chart?.destroy?.());
    dashboard._premiumCharts = {};
}

function palette() {
    const styles = getComputedStyle(document.body);
    return {
        primary: styles.getPropertyValue('--premium-accent').trim() || '#1261a6',
        secondary: styles.getPropertyValue('--premium-teal').trim() || '#0b7d78',
        warning: styles.getPropertyValue('--premium-warning').trim() || '#c87800',
        danger: styles.getPropertyValue('--premium-danger').trim() || '#bd3f4b',
        muted: styles.getPropertyValue('--premium-muted').trim() || '#66758a',
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
        data: { labels: monthly.map((item) => item.label), datasets: [{ label: 'Custo de peças', data: monthly.map((item) => Number(item.totalCost) || 0), borderColor: colors.primary, backgroundColor: `${colors.primary}1f`, fill: true, tension: .35, borderWidth: 3 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true }, x: { grid: { display: false } } } }
    });
    const active = statuses.filter((item) => item.value > 0);
    const status = document.getElementById('premium-status-chart');
    if (status && active.length) dashboard._premiumCharts.status = new Chart(status, {
        type: 'doughnut',
        data: { labels: active.map((item) => item.label), datasets: [{ data: active.map((item) => item.value), backgroundColor: [colors.warning, colors.secondary, colors.primary, colors.muted, colors.danger], borderColor: colors.surface, borderWidth: 4 }] },
        options: { responsive: true, maintainAspectRatio: false, cutout: '68%', plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8 } } } }
    });
}

function textualSummary(label, rows, value) {
    return `<ul class="premium-chart-summary" aria-label="${Utils.escapeHtml(label)}">${rows.map((row) => `<li>${Utils.escapeHtml(row.label || 'Período')}: ${value(row)}</li>`).join('')}</ul>`;
}

export function applyDashboardFocus() {
    if (!window.Dashboard || Dashboard.__premiumDashboard) return;
    Dashboard.__premiumDashboard = true;
    Dashboard.focusRangeDays = Number(Dashboard.focusRangeDays) || DEFAULT_RANGE_DAYS;
    Dashboard._premiumCharts = {};
    Dashboard._premiumSectionObserver = null;

    Dashboard.render = function renderPremiumDashboard() {
        const content = document.getElementById('content-area');
        if (!content) return;
        const rangeDays = Number(this.focusRangeDays) || DEFAULT_RANGE_DAYS;
        const { period, analysis } = analyse(rangeDays);
        const statuses = statusDistribution(analysis);
        const pending = statuses.find((item) => item.key === 'pending')?.value || 0;
        const rows = recentRows(analysis.solicitations || []);
        const parts = window.ElectricalCatalogPolicy?.filterParts(window.DataManager?.getParts?.() || []) || window.DataManager?.getParts?.() || [];
        destroyCharts(this);
        this._premiumSectionObserver?.disconnect?.();

        content.innerHTML = `<div class="premium-dashboard premium-dashboard-with-side-nav" data-testid="premium-dashboard">
            <div class="premium-dashboard-layout">
                ${dashboardSideNavigation()}
                <main class="premium-dashboard-main">
                    <header id="operational-overview" class="premium-dashboard-hero premium-dashboard-section"><div class="premium-hero-copy"><span class="premium-eyebrow"><i class="fas fa-sparkles"></i> Gestão executiva de peças</span><h1>Visão operacional e financeira</h1><p>Indicadores consolidados para priorizar aprovações, controlar custos e antecipar desvios.</p><div class="premium-hero-meta"><span><i class="fas fa-calendar-days"></i>${Utils.formatDate(period.dateFrom)} a ${Utils.formatDate(period.dateTo)}</span><span><i class="fas fa-shield-halved"></i>${Utils.formatNumber(parts.length)} peças ativas no catálogo</span></div></div><div class="premium-hero-controls"><label for="focus-period">Período</label><select id="focus-period" class="form-control"><option value="7" ${rangeDays === 7 ? 'selected' : ''}>Últimos 7 dias</option><option value="30" ${rangeDays === 30 ? 'selected' : ''}>Últimos 30 dias</option><option value="90" ${rangeDays === 90 ? 'selected' : ''}>Últimos 90 dias</option></select><div class="premium-hero-actions">${actions()}</div></div></header>
                    <section id="operational-indicators" class="premium-kpi-grid premium-dashboard-section" aria-label="Indicadores principais">${metric('Custo no período', Utils.formatCurrency(analysis.totalCost || 0), `${Utils.formatNumber(analysis.totalRequests || 0)} solicitações`, 'fa-sack-dollar')}${metric('Aguardando aprovação', Utils.formatNumber(pending), 'Itens que exigem decisão', 'fa-clock')}${metric('Custo médio', Utils.formatCurrency(analysis.averageCostPerSolicitation || 0), 'Por solicitação', 'fa-receipt')}${metric('Peças movimentadas', Utils.formatNumber(analysis.totalPieces || 0), 'No período selecionado', 'fa-boxes-stacked')}</section>
                    <section id="operational-flow" class="premium-status-strip premium-dashboard-section" aria-label="Resumo por status">${statuses.map((item) => `<div class="premium-status-item is-${item.tone}"><span>${Utils.escapeHtml(item.label)}</span><strong>${Utils.formatNumber(item.value)}</strong></div>`).join('')}</section>
                    ${pending && Auth.hasPermission('aprovacoes', 'view') ? `<div class="premium-action-alert"><div><span class="premium-alert-icon"><i class="fas fa-bolt"></i></span><div><strong>${Utils.formatNumber(pending)} solicitação(ões) aguardando análise</strong><small>Priorize os itens mais antigos para reduzir o tempo de ciclo.</small></div></div><button class="btn btn-primary btn-sm" onclick="App.navigate('aprovacoes')">Revisar aprovações</button></div>` : ''}
                    <section id="operational-costs" class="premium-chart-grid premium-dashboard-section"><article class="premium-panel premium-panel-wide"><div class="premium-panel-header"><div><span class="premium-panel-kicker">Tendência</span><h2>Evolução do custo mensal</h2><p>Somatório do período selecionado.</p></div></div><div class="premium-chart-shell">${analysis.byMonth?.length ? `<canvas id="premium-cost-trend-chart" role="img" aria-label="Gráfico de evolução do custo mensal"></canvas>${textualSummary('Resumo textual do custo mensal', analysis.byMonth, (item) => Utils.formatCurrency(Number(item.totalCost) || 0))}` : '<div class="premium-empty">Sem dados mensais.</div>'}</div></article><article class="premium-panel"><div class="premium-panel-header"><div><span class="premium-panel-kicker">Fluxo</span><h2>Distribuição por status</h2><p>Volume em cada etapa operacional.</p></div></div><div class="premium-chart-shell premium-chart-shell-donut">${statuses.some((item) => item.value) ? `<canvas id="premium-status-chart" role="img" aria-label="Gráfico de distribuição por status"></canvas>${textualSummary('Resumo textual da distribuição por status', statuses, (item) => Utils.formatNumber(item.value || 0))}` : '<div class="premium-empty">Sem solicitações.</div>'}</div></article></section>
                    <section class="premium-detail-grid"><article id="operational-impact" class="premium-panel premium-dashboard-section"><div class="premium-panel-header"><div><span class="premium-panel-kicker">Concentração</span><h2>Peças com maior impacto</h2></div><button class="btn btn-outline btn-sm" onclick="App.navigate('relatorios')">Abrir relatórios</button></div>${topParts(analysis.topPieces || [])}</article><article id="operational-recent" class="premium-panel premium-dashboard-section"><div class="premium-panel-header"><div><span class="premium-panel-kicker">Movimentação</span><h2>Solicitações recentes</h2></div><button class="btn btn-outline btn-sm" onclick="App.navigate('solicitacoes')">Ver todas</button></div>${rows ? `<div class="premium-table-wrap"><table class="premium-table"><thead><tr><th>Data</th><th>Solicitação</th><th>Cliente</th><th>Técnico</th><th>Valor</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></div>` : '<div class="premium-empty">Nenhuma solicitação encontrada.</div>'}</article></section>
                </main>
            </div>
        </div>`;

        document.getElementById('focus-period')?.addEventListener('change', (event) => {
            this.focusRangeDays = Number(event.target.value) || DEFAULT_RANGE_DAYS;
            this.render();
        });
        bindDashboardSideNavigation();
        requestAnimationFrame(() => drawCharts(this, analysis, statuses));
    };
}
