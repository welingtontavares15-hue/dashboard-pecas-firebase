import { renderKpiCard } from './kpi-card.js';
import { renderFilterField } from './filters.js';
import { renderDataTable } from './data-table.js';
import { normalizePipelineStatus, badgeClassByPipelineStatus } from './status-badge.js';

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
        { label: 'Criado', value: 'CRIADO' },
        { label: 'Pendente aprovação', value: 'PENDENTE_APROVACAO' },
        { label: 'Aprovado', value: 'APROVADO' },
        { label: 'Em compra', value: 'EM_COMPRA' },
        { label: 'Enviado', value: 'ENVIADO' },
        { label: 'Concluído', value: 'CONCLUIDO' },
        { label: 'Reprovado', value: 'REPROVADO' }
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

function formatVariation(value) {
    const number = Number(value) || 0;
    if (number === 0) {
        return 'Sem variação relevante no período';
    }
    const signal = number > 0 ? '↑' : '↓';
    return `${signal} ${Utils.formatNumber(Math.abs(number), 1)}% vs período anterior`;
}

function getPartLabel(part) {
    const description = String(part?.descricao || '').trim();
    const code = String(part?.codigo || '').trim();
    return description || code || 'Sem dados';
}

function getHighValueSolicitations(solicitations = []) {
    return solicitations.slice().sort((a, b) => {
        const totalDiff = (Number(b.total) || 0) - (Number(a.total) || 0);
        if (totalDiff !== 0) {
            return totalDiff;
        }
        const dateA = new Date(a.createdAt || a.data || 0).getTime();
        const dateB = new Date(b.createdAt || b.data || 0).getTime();
        return dateB - dateA;
    });
}

function renderCompactEmpty(message = 'Sem dados no período selecionado.') {
    return `
        <div class="empty-state compact-empty-state">
            <i class="fas fa-chart-line"></i>
            <p>${Utils.escapeHtml(message)}</p>
        </div>
    `;
}

function renderTopTechniciansTable(items = []) {
    if (!items.length) {
        return renderCompactEmpty('Sem dados suficientes para exibir o ranking.');
    }

    return `
        <div class="table-container dashboard-compact-table">
            <table class="table">
                <thead>
                    <tr>
                        <th>Técnico</th>
                        <th>Solicitações</th>
                        <th>Custo total</th>
                        <th>Custo médio</th>
                    </tr>
                </thead>
                <tbody>
                    ${items.map((tech, index) => `
                        <tr>
                            <td>
                                <strong>${index + 1}. ${Utils.escapeHtml(tech.nome || 'Sem dados')}</strong>
                                <div class="helper-text">${Utils.escapeHtml(tech.regiao || 'Sem região')}</div>
                            </td>
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
                    <small>Custo acumulado no período</small>
                </div>
                <div class="dashboard-summary-item primary">
                    <span>Ticket médio</span>
                    <strong>${Utils.formatCurrency(analysis.averageCostPerSolicitation || 0)}</strong>
                    <small>Custo médio por solicitação</small>
                </div>
                <div class="dashboard-summary-item primary">
                    <span>Técnico com maior custo</span>
                    <strong>${Utils.escapeHtml(topTechnician?.nome || 'Sem dados')}</strong>
                    <small>${topTechnician ? Utils.formatCurrency(topTechnician.totalCost || 0) : 'Sem dados no período selecionado.'}</small>
                </div>
                <div class="dashboard-summary-item primary">
                    <span>Peça com maior custo</span>
                    <strong>${Utils.escapeHtml(getPartLabel(topPart))}</strong>
                    <small>${topPart ? Utils.formatCurrency(topPart.totalCost || 0) : 'Sem dados no período selecionado.'}</small>
                </div>
            </div>
            <div class="dashboard-highlights-list">
                <div class="dashboard-highlight-item">
                    <span>Maior volume no período</span>
                    <strong>${Utils.escapeHtml(analysis.topByCalls?.nome || 'Sem dados')}</strong>
                    <small>${analysis.topByCalls?.calls ? `${Utils.formatNumber(analysis.topByCalls.calls)} solicitação(ões)` : 'Sem dados no período selecionado.'}</small>
                </div>
                <div class="dashboard-highlight-item">
                    <span>Maior custo no período</span>
                    <strong>${Utils.escapeHtml(analysis.topByCost?.nome || 'Sem dados')}</strong>
                    <small>${analysis.topByCost?.totalCost ? Utils.formatCurrency(analysis.topByCost.totalCost) : 'Sem dados no período selecionado.'}</small>
                </div>
                <div class="dashboard-highlight-item">
                    <span>Média de custo mensal</span>
                    <strong>${Utils.formatCurrency(monthlyAverage)}</strong>
                    <small>${(analysis.byMonth || []).length > 0 ? `${Utils.formatNumber(analysis.byMonth.length)} mês(es) analisados` : 'Sem dados no período selecionado.'}</small>
                </div>
                <div class="dashboard-highlight-item ${deviations.length > 0 ? 'warning' : ''}">
                    <span>Desvio de custo</span>
                    <strong>${Utils.formatNumber(deviations.length)}</strong>
                    <small>${deviations.length > 0 ? 'Solicitações acima de 30% da média.' : 'Nenhum desvio de custo identificado.'}</small>
                </div>
            </div>
        </div>
    `;
}

function renderTopPartsTable(parts = []) {
    if (!parts.length) {
        return renderCompactEmpty('Sem dados no período selecionado.');
    }

    return `
        <div class="table-container dashboard-compact-table">
            <table class="table">
                <thead>
                    <tr>
                        <th>Peça</th>
                        <th>Quantidade</th>
                        <th>Custo total</th>
                    </tr>
                </thead>
                <tbody>
                    ${parts.map((part, index) => `
                        <tr>
                            <td>
                                <strong>${index + 1}. ${Utils.escapeHtml(getPartLabel(part))}</strong>
                                <div class="helper-text">${Utils.escapeHtml(part.codigo || '')}</div>
                            </td>
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

        return `
            <tr>
                <td>${Utils.formatDate(sol.data || sol.createdAt)}</td>
                <td><strong>#${sol.numero}</strong></td>
                <td>${Utils.escapeHtml(sol.cliente || sol.clienteNome || 'Não informado')}</td>
                <td>${Utils.escapeHtml(sol.tecnicoNome || 'Não informado')}</td>
                <td>
                    <strong>${Utils.escapeHtml(getPartLabel(piece))}</strong>
                    <div class="helper-text">${Utils.escapeHtml(piece?.codigo || '')}</div>
                </td>
                <td>${Utils.formatCurrency(sol.total || 0)}</td>
                <td><span class="status-badge ${badgeClass}">${pipelineStatus.replaceAll('_', ' ')}</span></td>
                <td>
                    <button class="btn btn-sm btn-outline" onclick="Solicitacoes.viewDetails('${sol.id}')" title="Visualizar">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
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
        replaceChartWithFallback('dashboardMonthlyCostChart', 'Gráfico indisponível no momento');
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
        replaceChartWithFallback('dashboardMonthlyCostChart', 'Sem dados no período selecionado.');
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
                        <p>Seu perfil possui acesso somente às suas solicitações.</p>
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
                        <h2><i class="fas fa-sack-dollar"></i> Painel de Custos de Peças</h2>
                        <p class="text-muted">Acompanhe custos, volume e desempenho financeiro das solicitações.</p>
                    </div>
                </div>

                <div class="page-filters dashboard-filters-grid dashboard-filters-compact">
                    ${renderFilterField('Período', `
                        <select id="saas-period" class="form-control">
                            <option value="7" ${filters.periodPreset === '7' ? 'selected' : ''}>Últimos 7 dias</option>
                            <option value="30" ${filters.periodPreset === '30' ? 'selected' : ''}>Últimos 30 dias</option>
                            <option value="90" ${filters.periodPreset === '90' ? 'selected' : ''}>Últimos 90 dias</option>
                            <option value="custom" ${filters.periodPreset === 'custom' ? 'selected' : ''}>Personalizado</option>
                        </select>
                    `)}
                    ${renderFilterField('De', `<input id="saas-date-from" type="date" class="form-control" value="${filters.dateFrom}">`)}
                    ${renderFilterField('Até', `<input id="saas-date-to" type="date" class="form-control" value="${filters.dateTo}">`)}
                    ${renderFilterField('Estado', `
                        <select id="saas-estado" class="form-control">
                            <option value="">Todos</option>
                            ${regions.map((region) => `<option value="${Utils.escapeHtml(region)}" ${filters.estado === region ? 'selected' : ''}>${Utils.escapeHtml(region)}</option>`).join('')}
                        </select>
                    `)}
                    ${renderFilterField('Cliente', `<input id="saas-cliente" class="form-control" placeholder="Nome do cliente" value="${Utils.escapeHtml(filters.cliente)}">`)}
                    ${renderFilterField('Técnico', `
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
                        ${renderKpiCard({ title: 'Solicitações abertas', value: Utils.formatNumber(openCount), subtitle: 'Em andamento no filtro atual', icon: 'fa-folder-open', tone: 'warning' })}
                        ${renderKpiCard({ title: 'Solicitações no período', value: Utils.formatNumber(solicitations.length), subtitle: `${Utils.formatDate(filters.dateFrom)} a ${Utils.formatDate(filters.dateTo)}`, icon: 'fa-clipboard-list', tone: 'info' })}
                        ${renderKpiCard({ title: 'Custo total de peças', value: Utils.formatCurrency(analysis.totalCost || 0), subtitle: formatVariation(analysis.costVariation), icon: 'fa-sack-dollar', tone: 'primary' })}
                        ${renderKpiCard({ title: 'Custo médio por solicitação', value: Utils.formatCurrency(analysis.averageCostPerSolicitation || 0), subtitle: `${Utils.formatNumber(analysis.totalApproved || 0)} solicitação(ões) com custo`, icon: 'fa-receipt', tone: 'success' })}
                        ${renderKpiCard({ title: 'Custo médio por técnico', value: Utils.formatCurrency(analysis.avgCostPerTech || 0), subtitle: `${Utils.formatNumber(analysis.uniqueTechCount || 0)} técnico(s) com custo`, icon: 'fa-user-gear', tone: 'info' })}
                    </div>
                </div>

                <div class="page-content dashboard-content-stack">
                    <section class="dashboard-insight-grid dashboard-cost-overview-grid">
                        <article class="card dashboard-panel-card">
                            <div class="card-header dashboard-panel-header">
                                <div>
                                    <h4>Top 5 técnicos com maior custo</h4>
                                    <p class="text-muted">Solicitações, custo total e custo médio por técnico.</p>
                                </div>
                            </div>
                            <div class="card-body">
                                ${renderTopTechniciansTable(topTechnicians)}
                            </div>
                        </article>

                        <article class="card dashboard-panel-card">
                            <div class="card-header dashboard-panel-header">
                                <div>
                                    <h4>Resumo executivo do período</h4>
                                    <p class="text-muted">Leitura financeira objetiva das solicitações.</p>
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
                                    <h4>Top 5 peças com maior custo</h4>
                                    <p class="text-muted">Nome da peça, quantidade e custo total.</p>
                                </div>
                            </div>
                            <div class="card-body">
                                ${renderTopPartsTable(topParts)}
                            </div>
                        </article>

                        <article class="card dashboard-panel-card">
                            <div class="card-header dashboard-panel-header">
                                <div>
                                    <h4>Histórico recente de maior valor</h4>
                                    <p class="text-muted">Solicitações com maior valor no período filtrado.</p>
                                </div>
                            </div>
                            <div class="card-body">
                                ${highValueSolicitations.length === 0
        ? renderCompactEmpty('Nenhuma solicitação encontrada no período.')
        : renderDataTable({
            headers: ['Data', 'Número', 'Cliente', 'Técnico', 'Peça', 'Valor', 'Status', 'Ações'],
            rows: renderHistoryRows(highValueSolicitations)
        })}
                            </div>
                        </article>
                    </section>

                    <section class="card dashboard-panel-card dashboard-monthly-card">
                        <div class="card-header dashboard-panel-header">
                            <div>
                                <h4>Custo total por mês</h4>
                                <p class="text-muted">Comparativo mensal do gasto com peças.</p>
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



