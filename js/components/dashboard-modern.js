import { renderKpiCard } from './kpi-card.js';
import { renderFilterField } from './filters.js';
import { renderDataTable } from './data-table.js';
import { normalizePipelineStatus, badgeClassByPipelineStatus } from './badge-status.js';

const PIPELINE = ['CRIADO', 'PENDENTE_APROVACAO', 'APROVADO', 'EM_COMPRA', 'ENVIADO', 'CONCLUIDO', 'REPROVADO'];

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

function buildPipelineCount(solicitations = []) {
    const count = {
        CRIADO: 0,
        PENDENTE_APROVACAO: 0,
        APROVADO: 0,
        EM_COMPRA: 0,
        ENVIADO: 0,
        CONCLUIDO: 0,
        REPROVADO: 0
    };

    solicitations.forEach((sol) => {
        count[normalizePipelineStatus(sol.status)] += 1;
    });

    return count;
}

function getMonthRange() {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return {
        dateFrom: Utils.getLocalDateString(start),
        dateTo: Utils.getLocalDateString(end)
    };
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
        data = data.filter((sol) => Utils.normalizeText(sol.cliente || '').includes(query));
    }

    return data.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

function renderPipeline(count) {
    return `
        <div class="pipeline-board">
            ${PIPELINE.map((step) => `
                <div class="pipeline-stage">
                    <div class="pipeline-stage-label">${step.replaceAll('_', ' ')}</div>
                    <div class="pipeline-stage-count">${Utils.formatNumber(count[step] || 0)}</div>
                </div>
            `).join('')}
        </div>
    `;
}

function renderAlerts(analysis, baseSolicitations) {
    const pending = baseSolicitations.filter((s) => normalizePipelineStatus(s.status) === 'PENDENTE_APROVACAO').length;
    const topCostPiece = analysis.byPiece[0];
    const aboveAverage = analysis.averageCostPerSolicitation > 0
        ? analysis.costSolicitations.filter((sol) => (sol._analysisCost || Number(sol.total) || 0) > analysis.averageCostPerSolicitation).length
        : 0;

    return `
        <div class="alert-grid">
            <div class="alert-card">
                <h4><i class="fas fa-clock"></i> Aguardando aprovação</h4>
                <p>${Utils.formatNumber(pending)} solicitações</p>
            </div>
            <div class="alert-card">
                <h4><i class="fas fa-money-bill-wave"></i> Peça de maior custo no mês</h4>
                <p>${topCostPiece ? `${Utils.escapeHtml(topCostPiece.codigo)} • ${Utils.formatCurrency(topCostPiece.totalCost)}` : 'Sem dados no período'}</p>
            </div>
            <div class="alert-card">
                <h4><i class="fas fa-triangle-exclamation"></i> Acima da média</h4>
                <p>${Utils.formatNumber(aboveAverage)} solicitações acima do ticket médio</p>
            </div>
        </div>
    `;
}

function renderOperationalRows(solicitations) {
    const canEdit = Auth.hasPermission('solicitacoes', 'edit');
    const canApprove = Auth.hasPermission('aprovacoes', 'approve');

    return solicitations.slice(0, 30).map((sol) => {
        const qty = calcItemQty(sol.itens || []);
        const piece = (sol.itens || [])[0];
        const pipelineStatus = normalizePipelineStatus(sol.status);
        const badgeClass = badgeClassByPipelineStatus(pipelineStatus);

        return `
            <tr>
                <td><strong>#${sol.numero}</strong></td>
                <td>${Utils.formatDate(sol.data || sol.createdAt)}</td>
                <td>${Utils.escapeHtml(sol.cliente || 'Não informado')}</td>
                <td>${Utils.escapeHtml(sol.tecnicoNome || '-')}</td>
                <td title="${Utils.escapeHtml((piece && piece.descricao) || '-')}">${Utils.escapeHtml((piece && piece.codigo) || '-')}</td>
                <td>${Utils.formatNumber(qty)}</td>
                <td>${Utils.formatCurrency(sol.total || 0)}</td>
                <td><span class="status-badge ${badgeClass}">${pipelineStatus.replaceAll('_', ' ')}</span></td>
                <td>
                    <div class="actions">
                        <button class="btn btn-sm btn-outline" onclick="Solicitacoes.viewDetails('${sol.id}')" title="Visualizar"><i class="fas fa-eye"></i></button>
                        ${canEdit ? `<button class="btn btn-sm btn-outline" onclick="Solicitacoes.openForm('${sol.id}')" title="Editar"><i class="fas fa-edit"></i></button>` : ''}
                        ${canApprove && sol.status === 'pendente' ? `<button class="btn btn-sm btn-success" onclick="Aprovacoes.openApproveModal('${sol.id}')" title="Aprovar"><i class="fas fa-check"></i></button>` : ''}
                        ${canApprove && sol.status === 'pendente' ? `<button class="btn btn-sm btn-danger" onclick="Aprovacoes.openRejectModal('${sol.id}')" title="Reprovar"><i class="fas fa-times"></i></button>` : ''}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function chartDestroy(ref) {
    Object.values(ref).forEach((chart) => {
        if (chart && typeof chart.destroy === 'function') {
            chart.destroy();
        }
    });
}

function initDashboardCharts(dashboard, analysis) {
    if (typeof Chart === 'undefined') {
        return;
    }

    dashboard._saasCharts = dashboard._saasCharts || {};
    chartDestroy(dashboard._saasCharts);

    const solicitacoesByMonth = document.getElementById('saasSolicitacoesMesChart');
    const topPecas = document.getElementById('saasTopPecasChart');
    const topTecnicos = document.getElementById('saasTopTecnicosChart');

    const common = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } }
    };

    if (solicitacoesByMonth) {
        dashboard._saasCharts.solicitacoesByMonth = new Chart(solicitacoesByMonth, {
            type: 'line',
            data: {
                labels: analysis.byMonth.map((m) => m.label),
                datasets: [{
                    data: analysis.byMonth.map((m) => m.requestCount),
                    borderColor: '#2563EB',
                    backgroundColor: 'rgba(37,99,235,0.15)',
                    fill: true,
                    tension: 0.25
                }]
            },
            options: common
        });
    }

    if (topPecas) {
        dashboard._saasCharts.topPecas = new Chart(topPecas, {
            type: 'bar',
            data: {
                labels: analysis.byPiece.slice(0, 8).map((p) => p.codigo),
                datasets: [{
                    data: analysis.byPiece.slice(0, 8).map((p) => p.quantidade),
                    backgroundColor: 'rgba(22,163,74,0.65)',
                    borderRadius: 6
                }]
            },
            options: common
        });
    }

    if (topTecnicos) {
        const ranking = analysis.byTechnician.slice().sort((a, b) => (b.calls - a.calls)).slice(0, 8);
        dashboard._saasCharts.topTecnicos = new Chart(topTecnicos, {
            type: 'bar',
            data: {
                labels: ranking.map((t) => t.nome),
                datasets: [{
                    data: ranking.map((t) => t.calls),
                    backgroundColor: 'rgba(245,158,11,0.75)',
                    borderRadius: 6
                }]
            },
            options: {
                ...common,
                indexAxis: 'y'
            }
        });
    }
}

export function applyDashboardModernization() {
    if (typeof window.Dashboard === 'undefined' || window.Dashboard.__saasModernized) {
        return;
    }

    window.Dashboard.__saasModernized = true;
    window.Dashboard.saasFilters = getDefaultFilters();

    window.Dashboard.render = function renderSaaSDashboard() {
        const content = document.getElementById('content-area');
        if (!content) {
            return;
        }

        const filters = this.saasFilters || getDefaultFilters();
        this.saasFilters = filters;

        const base = filterBaseSolicitations(filters);
        const analysis = AnalyticsHelper.buildOperationalAnalysis(base.slice(), {
            period: { dateFrom: filters.dateFrom, dateTo: filters.dateTo }
        });

        const monthRange = getMonthRange();
        const monthData = AnalyticsHelper.filterSolicitations(base.slice(), {
            period: monthRange
        });
        const monthCost = monthData.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
        const approvedMonth = monthData.filter((s) => normalizePipelineStatus(s.status) === 'APROVADO').length;
        const ticket = analysis.averageCostPerSolicitation || 0;

        const totalPieces = analysis.totalPieces || 0;
        const avgCostPiece = totalPieces > 0 ? (analysis.totalCost / totalPieces) : 0;
        const avgCostTech = (analysis.uniqueTechCount || 0) > 0 ? (analysis.totalCost / analysis.uniqueTechCount) : 0;

        const statuses = buildPipelineCount(base);
        const technicians = DataManager.getTechnicians().filter((t) => t.ativo !== false);
        const regions = Array.from(new Set(technicians.map((t) => (t.regiao || t.estado || '').trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b));

        content.innerHTML = `
            <div class="page-container">
                <div class="page-header">
                    <h2><i class="fas fa-chart-pie"></i> Dashboard Operacional</h2>
                    <p class="text-muted">Painel objetivo para gestão de solicitações, custos e aprovação.</p>
                </div>

                <div class="page-actions">
                    <button class="btn btn-outline" onclick="Dashboard.resetSaasFilters()"><i class="fas fa-rotate-left"></i> Limpar filtros</button>
                    <button class="btn btn-primary" onclick="App.navigate('solicitacoes')"><i class="fas fa-list"></i> Ir para operação</button>
                </div>

                <div class="page-filters dashboard-filters-grid">
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
                            ${regions.map((r) => `<option value="${Utils.escapeHtml(r)}" ${filters.estado === r ? 'selected' : ''}>${Utils.escapeHtml(r)}</option>`).join('')}
                        </select>
                    `)}
                    ${renderFilterField('Cliente', `<input id="saas-cliente" class="form-control" placeholder="Nome do cliente" value="${Utils.escapeHtml(filters.cliente)}">`)}
                    ${renderFilterField('Técnico', `
                        <select id="saas-tecnico" class="form-control">
                            <option value="">Todos</option>
                            ${technicians.map((t) => `<option value="${t.id}" ${filters.tecnico === t.id ? 'selected' : ''}>${Utils.escapeHtml(t.nome)}</option>`).join('')}
                        </select>
                    `)}
                    ${renderFilterField('Status', `
                        <select id="saas-status" class="form-control">
                            ${getStatusOptions().map((s) => `<option value="${s.value}" ${filters.status === s.value ? 'selected' : ''}>${s.label}</option>`).join('')}
                        </select>
                    `)}
                </div>

                <div class="page-kpis">
                    <div class="kpi-grid">
                        ${renderKpiCard({ title: 'Solicitações pendentes', value: Utils.formatNumber(statuses.PENDENTE_APROVACAO), subtitle: 'Fila de aprovação', icon: 'fa-clock', tone: 'warning' })}
                        ${renderKpiCard({ title: 'Aprovadas no mês', value: Utils.formatNumber(approvedMonth), subtitle: 'Mês corrente', icon: 'fa-check', tone: 'success' })}
                        ${renderKpiCard({ title: 'Solicitações no período', value: Utils.formatNumber(base.length), subtitle: `${Utils.formatDate(filters.dateFrom)} a ${Utils.formatDate(filters.dateTo)}`, icon: 'fa-calendar', tone: 'info' })}
                        ${renderKpiCard({ title: 'Custo total do mês', value: Utils.formatCurrency(monthCost), subtitle: 'Solicitações do mês', icon: 'fa-money-bill-wave', tone: 'primary' })}
                        ${renderKpiCard({ title: 'Ticket médio', value: Utils.formatCurrency(ticket), subtitle: 'Por solicitação', icon: 'fa-receipt', tone: 'info' })}
                    </div>
                    <div class="kpi-grid secondary-kpi-grid">
                        ${renderKpiCard({ title: 'Custo médio por peça', value: Utils.formatCurrency(avgCostPiece), icon: 'fa-boxes-stacked', tone: 'warning' })}
                        ${renderKpiCard({ title: 'Custo médio por técnico', value: Utils.formatCurrency(avgCostTech), icon: 'fa-user-gear', tone: 'success' })}
                    </div>
                </div>

                <div class="page-content">
                    <div class="card">
                        <div class="card-header"><h4><i class="fas fa-timeline"></i> Pipeline de solicitações</h4></div>
                        <div class="card-body">${renderPipeline(statuses)}</div>
                    </div>

                    <div class="charts-grid saas-charts-grid">
                        <div class="chart-container"><h4>Solicitações por mês</h4><div class="chart-wrapper"><canvas id="saasSolicitacoesMesChart"></canvas></div></div>
                        <div class="chart-container"><h4>Top peças solicitadas</h4><div class="chart-wrapper"><canvas id="saasTopPecasChart"></canvas></div></div>
                        <div class="chart-container"><h4>Técnicos com mais solicitações</h4><div class="chart-wrapper"><canvas id="saasTopTecnicosChart"></canvas></div></div>
                    </div>

                    <div class="card mt-3">
                        <div class="card-header"><h4><i class="fas fa-bell"></i> Alertas operacionais</h4></div>
                        <div class="card-body">${renderAlerts(analysis, base)}</div>
                    </div>

                    <div class="card mt-3">
                        <div class="card-header"><h4><i class="fas fa-table"></i> Tabela operacional</h4></div>
                        <div class="card-body">
                            ${renderDataTable({
                                headers: ['Número', 'Data', 'Cliente', 'Técnico', 'Peça', 'Quantidade', 'Valor', 'Status', 'Ações'],
                                rows: renderOperationalRows(base)
                            })}
                        </div>
                    </div>
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
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('change', apply);
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

