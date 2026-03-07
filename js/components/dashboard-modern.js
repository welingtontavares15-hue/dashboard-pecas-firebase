import { renderKpiCard } from './kpi-card.js';
import { renderFilterField } from './filters.js';
import { renderDataTable } from './data-table.js';
import { normalizePipelineStatus, badgeClassByPipelineStatus } from './status-badge.js';

const DASHBOARD_TEXTS = {
    title: 'Painel de Custos de Pe\u00e7as',
    subtitle: 'Acompanhe custos, volume e desempenho financeiro das solicita\u00e7\u00f5es.',
    emptyGeneral: 'Sem dados no per\u00edodo selecionado.',
    emptyRanking: 'Sem dados suficientes para exibir o ranking.',
    emptyHistory: 'Nenhuma solicita\u00e7\u00e3o encontrada no per\u00edodo.',
    emptyAlert: 'Nenhum desvio de custo identificado.'
};

const FLOW_STEPS = [
    'T\u00e9cnico abre a solicita\u00e7\u00e3o.',
    'Gestor avalia a solicita\u00e7\u00e3o.',
    'Se rejeitar, retorna para o t\u00e9cnico.',
    'Se aprovar, a solicita\u00e7\u00e3o \u00e9 enviada ao fornecedor em PDF por e-mail.',
    'Fornecedor responde com os dados do envio.',
    'Gestor registra o rastreio no sistema.',
    'Quando o material chega, o t\u00e9cnico marca como entregue.',
    'A solicita\u00e7\u00e3o \u00e9 finalizada.'
];

function getPipelineStatusLabel(status) {
    const labels = {
        CRIADO: 'Aberta pelo t\u00e9cnico',
        PENDENTE_APROVACAO: 'Em avalia\u00e7\u00e3o do gestor',
        APROVADO: 'Aprovada e enviada ao fornecedor (PDF)',
        EM_COMPRA: 'Fornecedor respondeu / rastreio registrado',
        ENVIADO: 'Material entregue ao t\u00e9cnico',
        CONCLUIDO: 'Finalizada',
        REPROVADO: 'Rejeitada e devolvida ao t\u00e9cnico'
    };
    return labels[status] || labels.CRIADO;
}

function getDefaultFilters() {
    const period = AnalyticsHelper.getGlobalPeriodFilter();
    return {
        periodPreset: String(period.rangeDays || 30),
        dateFrom: period.dateFrom,
        dateTo: period.dateTo,
        estado: '',
        cliente: '',
        tecnico: '',
        status: ''
    };
}

function getStatusOptions() {
    return [
        { label: 'Todos', value: '' },
        { label: getPipelineStatusLabel('CRIADO'), value: 'CRIADO' },
        { label: getPipelineStatusLabel('PENDENTE_APROVACAO'), value: 'PENDENTE_APROVACAO' },
        { label: getPipelineStatusLabel('APROVADO'), value: 'APROVADO' },
        { label: getPipelineStatusLabel('EM_COMPRA'), value: 'EM_COMPRA' },
        { label: getPipelineStatusLabel('ENVIADO'), value: 'ENVIADO' },
        { label: getPipelineStatusLabel('CONCLUIDO'), value: 'CONCLUIDO' },
        { label: getPipelineStatusLabel('REPROVADO'), value: 'REPROVADO' }
    ];
}

function getMappedStatuses(pipelineStatus) {
    const map = {
        CRIADO: ['rascunho', 'enviada'],
        PENDENTE_APROVACAO: ['pendente'],
        APROVADO: ['aprovada'],
        EM_COMPRA: ['em-transito'],
        ENVIADO: ['entregue'],
        CONCLUIDO: ['finalizada', 'historico-manual'],
        REPROVADO: ['rejeitada']
    };
    return map[pipelineStatus] || [];
}

function calcItemQty(items = []) {
    return items.reduce((sum, item) => sum + (Number(item.quantidade) || 0), 0);
}

function filterBaseSolicitations(filters) {
    const period = {
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo
    };

    const statusList = filters.status ? getMappedStatuses(filters.status) : [];

    let data = AnalyticsHelper.filterSolicitations(DataManager.getSolicitations().slice(), {
        period,
        statuses: statusList,
        tecnico: filters.tecnico,
        regiao: filters.estado
    });

    if (filters.cliente) {
        const query = Utils.normalizeText(filters.cliente);
        data = data.filter((sol) => Utils.normalizeText(sol.cliente || sol.clienteNome || '').includes(query));
    }

    return data.sort((a, b) => {
        const dateA = new Date(a.createdAt || a.data || 0).getTime();
        const dateB = new Date(b.createdAt || b.data || 0).getTime();
        return dateB - dateA;
    });
}

function buildAnalysis(filters) {
    const statusList = filters.status ? getMappedStatuses(filters.status) : [];

    return AnalyticsHelper.buildOperationalAnalysis(DataManager.getSolicitations().slice(), {
        period: {
            dateFrom: filters.dateFrom,
            dateTo: filters.dateTo
        },
        statuses: statusList,
        tecnico: filters.tecnico,
        regiao: filters.estado,
        cliente: filters.cliente
    });
}

function getOpenSolicitationsCount(solicitations = []) {
    const closedStatuses = new Set(['CONCLUIDO', 'REPROVADO']);
    return solicitations.filter((sol) => !closedStatuses.has(normalizePipelineStatus(sol.status))).length;
}

function getPartLabel(part) {
    const description = String(part?.descricao || '').trim();
    const code = String(part?.codigo || '').trim();
    return description || code || 'Sem dados';
}

function getSolicitationTotalCost(solicitation = {}) {
    const items = Array.isArray(solicitation.itens) ? solicitation.itens : [];
    const itemsCost = items.reduce((sum, item) => {
        const quantity = Number(item?.quantidade) || 0;
        const unitValue = Number(item?.valorUnit) || 0;
        return sum + (quantity * unitValue);
    }, 0);

    if (itemsCost > 0) {
        return Math.round(itemsCost * 100) / 100;
    }
    return Number(solicitation.total) || 0;
}

function getHighValueSolicitations(solicitations = []) {
    return solicitations.slice().sort((a, b) => {
        const totalDiff = getSolicitationTotalCost(b) - getSolicitationTotalCost(a);
        if (totalDiff !== 0) {
            return totalDiff;
        }
        const dateA = new Date(a.createdAt || a.data || 0).getTime();
        const dateB = new Date(b.createdAt || b.data || 0).getTime();
        return dateB - dateA;
    });
}

function renderCompactEmpty(message = DASHBOARD_TEXTS.emptyGeneral) {
    return `
        <div class="empty-state compact-empty-state">
            <i class="fas fa-chart-line"></i>
            <p>${Utils.escapeHtml(message)}</p>
        </div>
    `;
}

function renderTopTechniciansTable(items = []) {
    if (!items.length) {
        return renderCompactEmpty(DASHBOARD_TEXTS.emptyRanking);
    }

    return `
        <div class="table-container dashboard-compact-table">
            <table class="table">
                <thead>
                    <tr>
                        <th>T\u00e9cnico</th>
                        <th>Solicita\u00e7\u00f5es</th>
                        <th>Custo total</th>
                        <th>Custo m\u00e9dio</th>
                    </tr>
                </thead>
                <tbody>
                    ${items.map((tech, index) => `
                        <tr>
                            <td><strong>${index + 1}. ${Utils.escapeHtml(tech.nome || 'Sem dados')}</strong></td>
                            <td>${Utils.formatNumber(tech.calls)}</td>
                            <td>${Utils.formatCurrency(tech.totalCost || 0)}</td>
                            <td>${Utils.formatCurrency(tech.costPerCall || 0)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function renderExecutiveSummary(analysis, topTechnician, topPart) {
    const monthlyAverage = (analysis.byMonth || []).length > 0 ? (analysis.totalCost || 0) / analysis.byMonth.length : 0;
    const deviations = analysis.highCostSolicitations || [];

    return `
        <div class="dashboard-executive-panel">
            <div class="dashboard-executive-grid">
                <div class="dashboard-summary-item primary">
                    <span>Total gasto</span>
                    <strong>${Utils.formatCurrency(analysis.totalCost || 0)}</strong>
                    <small>Custo acumulado no per\u00edodo</small>
                </div>
                <div class="dashboard-summary-item primary">
                    <span>Ticket m\u00e9dio</span>
                    <strong>${Utils.formatCurrency(analysis.averageCostPerSolicitation || 0)}</strong>
                    <small>Custo m\u00e9dio por solicita\u00e7\u00e3o</small>
                </div>
                <div class="dashboard-summary-item primary">
                    <span>T\u00e9cnico com maior custo</span>
                    <strong>${Utils.escapeHtml(topTechnician?.nome || 'Sem dados')}</strong>
                    <small>${topTechnician ? Utils.formatCurrency(topTechnician.totalCost || 0) : DASHBOARD_TEXTS.emptyGeneral}</small>
                </div>
                <div class="dashboard-summary-item primary">
                    <span>Pe\u00e7a com maior custo</span>
                    <strong>${Utils.escapeHtml(getPartLabel(topPart))}</strong>
                    <small>${topPart ? Utils.formatCurrency(topPart.totalCost || 0) : DASHBOARD_TEXTS.emptyGeneral}</small>
                </div>
            </div>

            <div class="dashboard-highlights-head">Destaques financeiros</div>
            <div class="dashboard-highlights-list">
                <div class="dashboard-highlight-item">
                    <span>Maior volume no per\u00edodo</span>
                    <strong>${Utils.escapeHtml(analysis.topByCalls?.nome || 'Sem dados')}</strong>
                    <small>${analysis.topByCalls?.calls ? `${Utils.formatNumber(analysis.topByCalls.calls)} solicita\u00e7\u00e3o(\u00f5es)` : DASHBOARD_TEXTS.emptyGeneral}</small>
                </div>
                <div class="dashboard-highlight-item">
                    <span>Maior custo no per\u00edodo</span>
                    <strong>${Utils.escapeHtml(analysis.topByCost?.nome || 'Sem dados')}</strong>
                    <small>${analysis.topByCost?.totalCost ? Utils.formatCurrency(analysis.topByCost.totalCost) : DASHBOARD_TEXTS.emptyGeneral}</small>
                </div>
                <div class="dashboard-highlight-item">
                    <span>M\u00e9dia de custo mensal</span>
                    <strong>${Utils.formatCurrency(monthlyAverage)}</strong>
                    <small>${(analysis.byMonth || []).length > 0 ? `${Utils.formatNumber(analysis.byMonth.length)} m\u00eas(es) analisados` : DASHBOARD_TEXTS.emptyGeneral}</small>
                </div>
                <div class="dashboard-highlight-item ${deviations.length > 0 ? 'warning' : ''}">
                    <span>Desvio de custo</span>
                    <strong>${Utils.formatNumber(deviations.length)}</strong>
                    <small>${deviations.length > 0 ? 'Solicita\u00e7\u00f5es acima de 30% da m\u00e9dia.' : DASHBOARD_TEXTS.emptyAlert}</small>
                </div>
            </div>

            <div class="dashboard-flow-head">Acompanhamento do fluxo operacional</div>
            <ol class="dashboard-flow-list">
                ${FLOW_STEPS.map((step, index) => `
                    <li class="dashboard-flow-item">
                        <span class="dashboard-flow-index">${index + 1}</span>
                        <span>${Utils.escapeHtml(step)}</span>
                    </li>
                `).join('')}
            </ol>
        </div>
    `;
}

function renderTopPartsTable(parts = []) {
    if (!parts.length) {
        return renderCompactEmpty(DASHBOARD_TEXTS.emptyRanking);
    }

    return `
        <div class="table-container dashboard-compact-table">
            <table class="table">
                <thead>
                    <tr>
                        <th>Pe\u00e7a</th>
                        <th>Quantidade</th>
                        <th>Custo total</th>
                    </tr>
                </thead>
                <tbody>
                    ${parts.map((part, index) => `
                        <tr>
                            <td><strong>${index + 1}. ${Utils.escapeHtml(getPartLabel(part))}</strong></td>
                            <td>${Utils.formatNumber(part.quantidade || 0)}</td>
                            <td>${Utils.formatCurrency(part.totalCost || 0)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function renderHistoryRows(solicitations = []) {
    return solicitations.slice(0, 10).map((sol) => {
        const piece = (sol.itens || [])[0];
        const pipelineStatus = normalizePipelineStatus(sol.status);
        const badgeClass = badgeClassByPipelineStatus(pipelineStatus);
        const statusLabel = getPipelineStatusLabel(pipelineStatus);
        const solicitationCost = getSolicitationTotalCost(sol);

        return `
            <tr>
                <td>${Utils.formatDate(sol.data || sol.createdAt)}</td>
                <td><strong>#${sol.numero}</strong></td>
                <td>${Utils.escapeHtml(sol.cliente || sol.clienteNome || 'N\u00e3o informado')}</td>
                <td>${Utils.escapeHtml(sol.tecnicoNome || 'N\u00e3o informado')}</td>
                <td><strong>${Utils.escapeHtml(getPartLabel(piece))}</strong></td>
                <td>${Utils.formatCurrency(solicitationCost)}</td>
                <td class="dashboard-history-status"><span class="status-badge ${badgeClass}">${Utils.escapeHtml(statusLabel)}</span></td>
            </tr>
        `;
    }).join('');
}

function destroyCharts(collection) {
    Object.values(collection || {}).forEach((chart) => {
        if (chart && typeof chart.destroy === 'function') {
            chart.destroy();
        }
    });
}

function replaceChartWithFallback(canvasId, message) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || !canvas.parentElement) {
        return;
    }
    canvas.parentElement.innerHTML = `<div class="chart-fallback">${Utils.escapeHtml(message)}</div>`;
}

function initDashboardCharts(dashboard, analysis) {
    dashboard._uiCharts = dashboard._uiCharts || {};
    destroyCharts(dashboard._uiCharts);

    if (typeof Chart === 'undefined') {
        replaceChartWithFallback('dashboardMonthlyCostChart', DASHBOARD_TEXTS.emptyGeneral);
        return;
    }

    const monthlyCanvas = document.getElementById('dashboardMonthlyCostChart');
    const byMonth = Array.isArray(analysis.byMonth) ? analysis.byMonth : [];

    if (monthlyCanvas && byMonth.some((item) => Number(item.totalCost) > 0)) {
        dashboard._uiCharts.monthly = new Chart(monthlyCanvas, {
            type: 'bar',
            data: {
                labels: byMonth.map((item) => item.label),
                datasets: [{
                    data: byMonth.map((item) => Number(item.totalCost) || 0),
                    backgroundColor: 'rgba(37, 99, 235, 0.82)',
                    borderRadius: 8,
                    maxBarThickness: 44
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: (value) => Utils.formatCurrency(Number(value) || 0)
                        },
                        grid: {
                            color: 'rgba(148, 163, 184, 0.18)'
                        }
                    },
                    x: {
                        grid: { display: false }
                    }
                }
            }
        });
    } else {
        replaceChartWithFallback('dashboardMonthlyCostChart', DASHBOARD_TEXTS.emptyGeneral);
    }
}

export function applyDashboardModernization() {
    if (typeof window.Dashboard === 'undefined' || window.Dashboard.__visualRefined) {
        return;
    }

    window.Dashboard.__visualRefined = true;
    window.Dashboard.saasFilters = getDefaultFilters();

    window.Dashboard.render = function renderExecutiveDashboard() {
        const content = document.getElementById('content-area');
        if (!content) {
            return;
        }

        if (Auth.getRole() === 'tecnico') {
            content.innerHTML = `
                <div class="page-container">
                    <div class="empty-state compact-empty-state">
                        <i class="fas fa-lock"></i>
                        <h4>Dashboard restrito</h4>
                        <p>Seu perfil possui acesso somente \u00e0s suas solicita\u00e7\u00f5es.</p>
                    </div>
                </div>
            `;
            return;
        }

        const filters = this.saasFilters || getDefaultFilters();
        this.saasFilters = filters;

        const solicitations = filterBaseSolicitations(filters);
        const highValueSolicitations = getHighValueSolicitations(solicitations);
        const analysis = buildAnalysis(filters);
        const technicians = DataManager.getTechnicians().filter((t) => t.ativo !== false);
        const regions = Array.from(new Set(technicians.map((t) => (t.regiao || t.estado || '').trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b));
        const openCount = getOpenSolicitationsCount(solicitations);
        const topTechnicians = (analysis.byTechnician || []).slice(0, 5);
        const topTechnician = topTechnicians[0] || null;
        const topParts = (analysis.byPiece || []).slice().sort((a, b) => (Number(b.totalCost) || 0) - (Number(a.totalCost) || 0)).slice(0, 5);
        const topPart = topParts[0] || null;

        content.innerHTML = `
            <div class="page-container dashboard-refined-shell dashboard-cost-shell">
                <div class="page-header dashboard-header-compact">
                    <div>
                        <h2><i class="fas fa-sack-dollar"></i> ${DASHBOARD_TEXTS.title}</h2>
                        <p class="text-muted">${DASHBOARD_TEXTS.subtitle}</p>
                    </div>
                </div>

                <div class="page-filters dashboard-filters-grid dashboard-filters-compact">
                    ${renderFilterField('Per\u00edodo', `
                        <select id="saas-period" class="form-control">
                            <option value="7" ${filters.periodPreset === '7' ? 'selected' : ''}>\u00daltimos 7 dias</option>
                            <option value="30" ${filters.periodPreset === '30' ? 'selected' : ''}>\u00daltimos 30 dias</option>
                            <option value="90" ${filters.periodPreset === '90' ? 'selected' : ''}>\u00daltimos 90 dias</option>
                            <option value="custom" ${filters.periodPreset === 'custom' ? 'selected' : ''}>Personalizado</option>
                        </select>
                    `)}
                    ${renderFilterField('De', `<input id="saas-date-from" type="date" class="form-control" value="${filters.dateFrom}">`)}
                    ${renderFilterField('At\u00e9', `<input id="saas-date-to" type="date" class="form-control" value="${filters.dateTo}">`)}
                    ${renderFilterField('Estado', `
                        <select id="saas-estado" class="form-control">
                            <option value="">Todos</option>
                            ${regions.map((region) => `<option value="${Utils.escapeHtml(region)}" ${filters.estado === region ? 'selected' : ''}>${Utils.escapeHtml(region)}</option>`).join('')}
                        </select>
                    `)}
                    ${renderFilterField('Cliente', `<input id="saas-cliente" class="form-control" placeholder="Nome do cliente" value="${Utils.escapeHtml(filters.cliente)}">`)}
                    ${renderFilterField('T\u00e9cnico', `
                        <select id="saas-tecnico" class="form-control">
                            <option value="">Todos</option>
                            ${technicians.map((technician) => `<option value="${technician.id}" ${filters.tecnico === technician.id ? 'selected' : ''}>${Utils.escapeHtml(technician.nome)}</option>`).join('')}
                        </select>
                    `)}
                    ${renderFilterField('Status', `
                        <select id="saas-status" class="form-control">
                            ${getStatusOptions().map((status) => `<option value="${status.value}" ${filters.status === status.value ? 'selected' : ''}>${status.label}</option>`).join('')}
                        </select>
                    `)}
                </div>

                <div class="page-kpis">
                    <div class="kpi-grid dashboard-kpi-grid">
                        ${renderKpiCard({ title: 'Solicita\u00e7\u00f5es abertas', value: Utils.formatNumber(openCount), subtitle: 'Em andamento no filtro atual', icon: 'fa-folder-open', tone: 'warning' })}
                        ${renderKpiCard({ title: 'Solicita\u00e7\u00f5es no per\u00edodo', value: Utils.formatNumber(solicitations.length), subtitle: `${Utils.formatDate(filters.dateFrom)} a ${Utils.formatDate(filters.dateTo)}`, icon: 'fa-clipboard-list', tone: 'info' })}
                        ${renderKpiCard({ title: 'Custo total de pe\u00e7as', value: Utils.formatCurrency(analysis.totalCost || 0), subtitle: `${Utils.formatNumber(analysis.totalApproved || 0)} solicita\u00e7\u00e3o(\u00f5es) com custo`, icon: 'fa-sack-dollar', tone: 'primary' })}
                        ${renderKpiCard({ title: 'Custo m\u00e9dio por solicita\u00e7\u00e3o', value: Utils.formatCurrency(analysis.averageCostPerSolicitation || 0), subtitle: `${Utils.formatNumber(analysis.totalApproved || 0)} solicita\u00e7\u00e3o(\u00f5es) com custo`, icon: 'fa-receipt', tone: 'success' })}
                        ${renderKpiCard({ title: 'Custo m\u00e9dio por t\u00e9cnico', value: Utils.formatCurrency(analysis.avgCostPerTech || 0), subtitle: `${Utils.formatNumber(analysis.uniqueTechCount || 0)} t\u00e9cnico(s) com custo`, icon: 'fa-user-gear', tone: 'info' })}
                    </div>
                </div>

                <div class="page-content dashboard-content-stack">
                    <section class="dashboard-insight-grid dashboard-cost-overview-grid">
                        <article class="card dashboard-panel-card">
                            <div class="card-header dashboard-panel-header">
                                <div>
                                    <h4>Top 5 t\u00e9cnicos com maior custo</h4>
                                    <p class="text-muted">T\u00e9cnico, quantidade de solicita\u00e7\u00f5es, custo total e custo m\u00e9dio.</p>
                                </div>
                            </div>
                            <div class="card-body">
                                ${renderTopTechniciansTable(topTechnicians)}
                            </div>
                        </article>

                        <article class="card dashboard-panel-card">
                            <div class="card-header dashboard-panel-header">
                                <div>
                                    <h4>Resumo executivo / Destaques financeiros</h4>
                                    <p class="text-muted">Destaques financeiros e acompanhamento do fluxo operacional.</p>
                                </div>
                            </div>
                            <div class="card-body">
                                ${renderExecutiveSummary(analysis, topTechnician, topPart)}
                            </div>
                        </article>
                    </section>

                    <section class="dashboard-insight-grid dashboard-cost-detail-grid">
                        <article class="card dashboard-panel-card">
                            <div class="card-header dashboard-panel-header">
                                <div>
                                    <h4>Top 5 pe\u00e7as com maior custo</h4>
                                    <p class="text-muted">Nome da pe\u00e7a, quantidade e custo total.</p>
                                </div>
                            </div>
                            <div class="card-body">
                                ${renderTopPartsTable(topParts)}
                            </div>
                        </article>

                        <article class="card dashboard-panel-card">
                            <div class="card-header dashboard-panel-header">
                                <div>
                                    <h4>Hist\u00f3rico recente de maior valor</h4>
                                    <p class="text-muted">Data, n\u00famero, cliente, t\u00e9cnico, pe\u00e7a, valor e status do fluxo.</p>
                                </div>
                            </div>
                            <div class="card-body">
                                ${highValueSolicitations.length === 0
        ? renderCompactEmpty(DASHBOARD_TEXTS.emptyHistory)
        : renderDataTable({
            headers: ['Data', 'N\u00famero da solicita\u00e7\u00e3o', 'Cliente', 'T\u00e9cnico', 'Pe\u00e7a', 'Valor', 'Status'],
            rows: renderHistoryRows(highValueSolicitations)
        })}
                            </div>
                        </article>
                    </section>

                    <section class="card dashboard-panel-card dashboard-monthly-card">
                        <div class="card-header dashboard-panel-header">
                            <div>
                                <h4>Custo total por m\u00eas</h4>
                                <p class="text-muted">Somente custo total de pe\u00e7as por m\u00eas.</p>
                            </div>
                        </div>
                        <div class="card-body">
                            <div class="chart-container dashboard-chart-card dashboard-monthly-chart-card">
                                <div class="chart-wrapper compact-chart-wrapper dashboard-monthly-chart-wrapper">
                                    <canvas id="dashboardMonthlyCostChart"></canvas>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        `;

        this.bindSaasFilters();
        setTimeout(() => initDashboardCharts(this, analysis), 60);
    };

    window.Dashboard.bindSaasFilters = function bindSaasFilters() {
        const apply = () => {
            const periodPreset = document.getElementById('saas-period')?.value || '30';
            const dateFromInput = document.getElementById('saas-date-from')?.value || this.saasFilters.dateFrom;
            const dateToInput = document.getElementById('saas-date-to')?.value || this.saasFilters.dateTo;

            let dateFrom = dateFromInput;
            let dateTo = dateToInput;
            if (periodPreset !== 'custom') {
                const period = AnalyticsHelper.setGlobalPeriodByDays(Number(periodPreset) || 30);
                dateFrom = period.dateFrom;
                dateTo = period.dateTo;
            }

            this.saasFilters = {
                periodPreset,
                dateFrom,
                dateTo,
                estado: document.getElementById('saas-estado')?.value || '',
                cliente: document.getElementById('saas-cliente')?.value || '',
                tecnico: document.getElementById('saas-tecnico')?.value || '',
                status: document.getElementById('saas-status')?.value || ''
            };

            AnalyticsHelper.saveGlobalPeriodFilter({
                dateFrom: this.saasFilters.dateFrom,
                dateTo: this.saasFilters.dateTo
            });

            this.render();
        };

        ['saas-period', 'saas-date-from', 'saas-date-to', 'saas-estado', 'saas-tecnico', 'saas-status'].forEach((id) => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('change', apply);
            }
        });

        const clientInput = document.getElementById('saas-cliente');
        if (clientInput) {
            clientInput.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    apply();
                }
            });
            clientInput.addEventListener('blur', apply);
        }
    };

    window.Dashboard.resetSaasFilters = function resetSaasFilters() {
        this.saasFilters = getDefaultFilters();
        this.render();
    };
}