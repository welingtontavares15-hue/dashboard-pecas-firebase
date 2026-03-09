function normalizeReport(report) {
    const map = {
        custos: 'visao-geral',
        solicitacoes: 'historico',
        tecnicos: 'tecnicos',
        pecas: 'pecas',
        meses: 'meses',
        historico: 'historico',
        'visao-geral': 'visao-geral'
    };

    return map[String(report || '').trim().toLowerCase()] || 'visao-geral';
}

function sortPartsByCost(parts = []) {
    return parts.slice().sort((a, b) => (Number(b.totalCost) || 0) - (Number(a.totalCost) || 0));
}

function sortTechniciansByCost(technicians = []) {
    return technicians.slice().sort((a, b) => (Number(b.totalCost) || 0) - (Number(a.totalCost) || 0));
}

function getFilteredPeriodMonthCount(relatorios) {
    const period = AnalyticsHelper.getGlobalPeriodFilter();
    const fromRaw = relatorios?.filters?.dateFrom || period?.dateFrom;
    const toRaw = relatorios?.filters?.dateTo || period?.dateTo;
    const from = Utils.parseAsLocalDate(fromRaw);
    const to = Utils.parseAsLocalDate(toRaw);

    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
        return 1;
    }

    const start = from.getTime() <= to.getTime() ? from : to;
    const end = from.getTime() <= to.getTime() ? to : from;
    return Math.max(((end.getFullYear() - start.getFullYear()) * 12) + (end.getMonth() - start.getMonth()) + 1, 1);
}

function buildMonthlyCostSummary(relatorios, analysis) {
    const monthCount = getFilteredPeriodMonthCount(relatorios);
    const totalCost = Number(analysis?.totalCost) || 0;
    const averageMonthlyCost = monthCount > 0 ? totalCost / monthCount : 0;
    const latestMonth = analysis?.latestMonth || (analysis?.byMonth || []).slice(-1)[0] || null;

    return {
        monthCount,
        averageMonthlyCost,
        latestMonthCost: Number(latestMonth?.totalCost) || 0,
        latestMonthLabel: latestMonth?.label || 'Sem dados mensais'
    };
}

function buildStatusDistribution(solicitations = []) {
    const byStatus = {};
    solicitations.forEach((sol) => {
        const key = String(sol?.status || '').trim();
        byStatus[key] = (byStatus[key] || 0) + 1;
    });

    const priority = ['pendente', 'aprovada', 'em-transito', 'entregue', 'finalizada', 'rejeitada', 'historico-manual'];
    const ordered = Object.entries(byStatus).sort((a, b) => {
        const idxA = priority.indexOf(a[0]);
        const idxB = priority.indexOf(b[0]);
        const rankA = idxA >= 0 ? idxA : priority.length + 1;
        const rankB = idxB >= 0 ? idxB : priority.length + 1;
        if (rankA !== rankB) {
            return rankA - rankB;
        }
        return b[1] - a[1];
    });

    return ordered.map(([status, count]) => ({
        status,
        label: Utils.getStatusInfo(status)?.label || status,
        count
    }));
}

function relatoriosSafeClient(sol) {
    return String(sol?.cliente || sol?.clienteNome || '').trim() || 'Não informado';
}

function renderCompactEmpty(message = 'Sem dados no período selecionado.', description = 'Ajuste os filtros para continuar.') {
    return `
        <div class="empty-state compact-empty-state">
            <i class="fas fa-chart-line"></i>
            <h4>${Utils.escapeHtml(message)}</h4>
            <p>${Utils.escapeHtml(description)}</p>
        </div>
    `;
}

function buildExecutiveCards(relatorios) {
    const analysis = relatorios.buildCostAnalysis();
    const monthly = buildMonthlyCostSummary(relatorios, analysis);

    const cards = [
        {
            title: 'Custo total de peças',
            value: Utils.formatCurrency(analysis.totalCost || 0),
            note: 'Somatório do período filtrado',
            icon: 'fa-sack-dollar',
            tone: 'primary'
        },
        {
            title: 'Custo médio por solicitação',
            value: Utils.formatCurrency(analysis.costPerAttendance || 0),
            note: `${Utils.formatNumber(analysis.totalCalls || 0)} solicitação(ões) com custo`,
            icon: 'fa-receipt',
            tone: 'success'
        },
        {
            title: 'Custo médio por técnico',
            value: Utils.formatCurrency(analysis.avgCostPerTech || 0),
            note: `${Utils.formatNumber(analysis.uniqueTechCount || 0)} técnico(s) no período`,
            icon: 'fa-user-gear',
            tone: 'info'
        },
        {
            title: 'Custo do mês mais recente',
            value: Utils.formatCurrency(monthly.latestMonthCost),
            note: monthly.latestMonthLabel,
            icon: 'fa-calendar-days',
            tone: 'warning'
        },
        {
            title: 'Média mensal (período)',
            value: Utils.formatCurrency(monthly.averageMonthlyCost),
            note: `${Utils.formatNumber(monthly.monthCount)} mês(es) no filtro`,
            icon: 'fa-chart-line',
            tone: 'success'
        }
    ];

    return `
        <div class="reports-summary-grid">
            ${cards.map((card) => `
                <article class="report-summary-card">
                    <span class="report-summary-icon ${card.tone}"><i class="fas ${card.icon}"></i></span>
                    <div>
                        <h4>${card.title}</h4>
                        <strong>${card.value}</strong>
                        <small>${card.note}</small>
                    </div>
                </article>
            `).join('')}
        </div>
    `;
}
function renderRecentRows(solicitations) {
    return solicitations.slice(0, 8).map((sol) => {
        return `
            <tr>
                <td>${Utils.formatDate(sol.data || sol.createdAt)}</td>
                <td><strong>#${sol.numero}</strong></td>
                <td>${Utils.escapeHtml(sol.tecnicoNome || 'Não informado')}</td>
                <td>${Utils.escapeHtml(relatoriosSafeClient(sol))}</td>
                <td>${Utils.formatCurrency(sol.total || 0)}</td>
                <td>${Utils.renderStatusBadge(sol.status)}</td>
            </tr>
        `;
    }).join('');
}
function renderPartsTable(parts, totalCost) {
    if (!parts.length) {
        return renderCompactEmpty();
    }

    return `
        <div class="table-container dashboard-compact-table">
            <table class="table">
                <thead>
                    <tr>
                        <th>Peça</th>
                        <th>Quantidade</th>
                        <th>Custo total</th>
                        <th>Custo médio</th>
                        <th>Participação</th>
                    </tr>
                </thead>
                <tbody>
                    ${parts.map((part) => {
        const share = totalCost > 0 ? ((Number(part.totalCost) || 0) / totalCost) * 100 : 0;
        return `
                            <tr>
                                <td>
                                    <strong>${Utils.escapeHtml(part.codigo || '-')}</strong>
                                    <div class="helper-text">${Utils.escapeHtml(part.descricao || 'Sem descrição')}</div>
                                </td>
                                <td>${Utils.formatNumber(part.quantidade)}</td>
                                <td>${Utils.formatCurrency(part.totalCost)}</td>
                                <td>${Utils.formatCurrency(part.averageUnitCost)}</td>
                                <td>${Utils.formatNumber(share, 1)}%</td>
                            </tr>
                        `;
    }).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function renderTechniciansTable(technicians) {
    if (!technicians.length) {
        return renderCompactEmpty();
    }

    return `
        <div class="table-container dashboard-compact-table">
            <table class="table">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Técnico</th>
                        <th>Solicitações</th>
                        <th>Custo total</th>
                        <th>Custo médio por solicitação</th>
                    </tr>
                </thead>
                <tbody>
                    ${technicians.map((technician, index) => `
                        <tr>
                            <td><strong>${index + 1}</strong></td>
                            <td><strong>${Utils.escapeHtml(technician.nome)}</strong></td>
                            <td>${Utils.formatNumber(technician.calls)}</td>
                            <td>${Utils.formatCurrency(technician.totalCost)}</td>
                            <td>${Utils.formatCurrency(technician.costPerCall)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}
function renderHistoryTable(relatorios, solicitations) {
    if (!solicitations.length) {
        return renderCompactEmpty();
    }

    return `
        <div class="table-container">
            <table class="table">
                <thead>
                    <tr>
                        <th>Data</th>
                        <th>Número</th>
                        <th>Técnico</th>
                        <th>Cliente</th>
                        <th>Custo</th>
                        <th>Status</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody>
                    ${solicitations.map((sol) => `
                            <tr>
                                <td>${Utils.formatDate(sol.data || sol.createdAt)}</td>
                                <td><strong>#${sol.numero}</strong></td>
                                <td>${Utils.escapeHtml(sol.tecnicoNome || 'Não informado')}</td>
                                <td>${Utils.escapeHtml(relatorios.getSolicitationClientName(sol))}</td>
                                <td>${Utils.formatCurrency(sol.total || 0)}</td>
                                <td>${Utils.renderStatusBadge(sol.status)}</td>
                                <td>
                                    <button class="btn btn-sm btn-outline" onclick="Solicitacoes.viewDetails('${sol.id}')" title="Visualizar">
                                        <i class="fas fa-eye"></i>
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                </tbody>
            </table>
        </div>
    `;
}
function buildMonthlyRows(byMonth = []) {
    return byMonth.map((month, index) => {
        const previous = byMonth[index - 1];
        const previousValue = Number(previous?.totalCost) || 0;
        const currentValue = Number(month.totalCost) || 0;
        const averageCostByRequest = Number(month.requestCount) > 0 ? currentValue / Number(month.requestCount) : 0;
        const variation = previousValue > 0 ? ((currentValue - previousValue) / previousValue) * 100 : (currentValue > 0 ? 100 : 0);

        return `
            <tr>
                <td><strong>${Utils.escapeHtml(month.label)}</strong></td>
                <td>${Utils.formatNumber(month.requestCount)}</td>
                <td>${Utils.formatCurrency(currentValue)}</td>
                <td>${Utils.formatCurrency(averageCostByRequest)}</td>
                <td>${index === 0 ? 'Base inicial' : `${variation >= 0 ? '↑' : '↓'} ${Utils.formatNumber(Math.abs(variation), 1)}%`}</td>
            </tr>
        `;
    }).join('');
}
function replaceChartFallback(canvasId, message) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || !canvas.parentElement) {
        return;
    }

    canvas.parentElement.innerHTML = `<div class="chart-fallback">${Utils.escapeHtml(message)}</div>`;
}


function getReportChartTheme() {
    const isDark = document.body.classList.contains('dark-mode');
    return {
        textColor: isDark ? '#D5DFEB' : '#334155',
        gridColor: isDark ? 'rgba(71, 85, 105, 0.42)' : 'rgba(148, 163, 184, 0.18)'
    };
}
function createHorizontalCostChart(relatorios, id, labels, data, color) {
    const canvas = document.getElementById(id);
    if (!canvas || labels.length === 0) {
        if (canvas) {
            replaceChartFallback(id, 'Sem dados no período selecionado');
        }
        return;
    }

    const chartTheme = getReportChartTheme();

    relatorios.charts[id] = new Chart(canvas, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                data,
                backgroundColor: color,
                borderRadius: 8,
                maxBarThickness: 28
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: {
                        color: chartTheme.textColor,
                        callback: (value) => Utils.formatCurrency(Number(value) || 0)
                    },
                    grid: {
                        color: chartTheme.gridColor
                    }
                },
                y: {
                    ticks: {
                        color: chartTheme.textColor
                    },
                    grid: { display: false }
                }
            }
        }
    });
}
function createVerticalCostChart(relatorios, id, labels, data, color) {
    const canvas = document.getElementById(id);
    if (!canvas || labels.length === 0) {
        if (canvas) {
            replaceChartFallback(id, 'Sem dados no período selecionado');
        }
        return;
    }

    const chartTheme = getReportChartTheme();

    relatorios.charts[id] = new Chart(canvas, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                data,
                backgroundColor: color,
                borderRadius: 8,
                maxBarThickness: 38
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
                        color: chartTheme.textColor,
                        callback: (value) => Utils.formatCurrency(Number(value) || 0)
                    },
                    grid: {
                        color: chartTheme.gridColor
                    }
                },
                x: {
                    ticks: {
                        color: chartTheme.textColor,
                        autoSkip: false,
                        maxRotation: 45,
                        minRotation: 35
                    },
                    grid: { display: false }
                }
            }
        }
    });
}
export function applyReportsModernization() {
    if (typeof window.Relatorios === 'undefined' || window.Relatorios.__visualRefined) {
        return;
    }

    const Relatorios = window.Relatorios;
    Relatorios.__visualRefined = true;
    Relatorios.currentReport = normalizeReport(Relatorios.currentReport);

    Relatorios.render = function renderModernReports() {
        this.currentReport = normalizeReport(window.__reportTarget || this.currentReport);
        if (typeof this.ensureFilters === 'function') {
            this.ensureFilters();
        }

        const content = document.getElementById('content-area');
        if (!content) {
            return;
        }

        const filterState = typeof this.buildFilterState === 'function'
            ? this.buildFilterState()
            : {
                dateFrom: this.filters.dateFrom,
                dateTo: this.filters.dateTo,
                rangeDays: this.filters.rangeDays
            };
        const periodLabel = AnalyticsHelper.getRangeLabel(filterState.period || {
            dateFrom: filterState.dateFrom,
            dateTo: filterState.dateTo,
            rangeDays: filterState.rangeDays
        });

        content.innerHTML = `
            <div class="page-container reports-shell">
                <div class="page-header reports-header-compact">
                    <div>
                        <h2><i class="fas fa-file-alt"></i> Relatórios</h2>
                        <p class="text-muted">Leitura objetiva de custos, histórico e desempenho operacional.</p>
                    </div>
                    <span class="report-period-chip">${Utils.escapeHtml(periodLabel)}</span>
                </div>

                <div class="page-filters">
                    ${this.renderCostFilters()}
                </div>

                <div class="page-kpis">
                    ${buildExecutiveCards(this)}
                </div>

                <div class="page-content reports-content-stack">
                    <div class="report-tabs-modern">
                        <button class="report-tab-btn ${this.currentReport === 'visao-geral' ? 'active' : ''}" onclick="Relatorios.switchReport('visao-geral')">
                            <i class="fas fa-chart-pie"></i> Visão Geral
                        </button>
                        <button class="report-tab-btn ${this.currentReport === 'pecas' ? 'active' : ''}" onclick="Relatorios.switchReport('pecas')">
                            <i class="fas fa-box-open"></i> Custo por Peça
                        </button>
                        <button class="report-tab-btn ${this.currentReport === 'tecnicos' ? 'active' : ''}" onclick="Relatorios.switchReport('tecnicos')">
                            <i class="fas fa-user-gear"></i> Custo por Técnico
                        </button>
                        <button class="report-tab-btn ${this.currentReport === 'meses' ? 'active' : ''}" onclick="Relatorios.switchReport('meses')">
                            <i class="fas fa-chart-line"></i> Custo por Mês
                        </button>
                        <button class="report-tab-btn ${this.currentReport === 'historico' ? 'active' : ''}" onclick="Relatorios.switchReport('historico')">
                            <i class="fas fa-clock-rotate-left"></i> Histórico
                        </button>
                    </div>

                    <div id="report-content">
                        ${this.renderReportContent()}
                    </div>
                </div>
            </div>
        `;

        this.afterRender();
    };

    Relatorios.switchReport = function switchReport(report) {
        this.currentReport = normalizeReport(report);
        window.__reportTarget = this.currentReport;
        this.render();
        if (typeof Auth !== 'undefined' && typeof Auth.renderMenu === 'function') {
            Auth.renderMenu('relatorios');
        }
    };

    Relatorios.renderReportContent = function renderReportContent() {
        switch (normalizeReport(this.currentReport)) {
        case 'pecas':
            return this.renderPecasModernReport();
        case 'tecnicos':
            return this.renderTecnicosModernReport();
        case 'meses':
            return this.renderMesesModernReport();
        case 'historico':
            return this.renderHistoricoModernReport();
        case 'visao-geral':
        default:
            return this.renderOverviewModernReport();
        }
    };

    Relatorios.renderCostFilters = function renderCostFilters() {
        const options = this.getAvailableCostFilters();

        return `
            <div class="report-filters-modern">
                <div class="report-filters-grid">
                    <div class="filter-group">
                        <label>De</label>
                        <input type="date" id="report-date-from" class="form-control" value="${this.filters.dateFrom}">
                    </div>
                    <div class="filter-group">
                        <label>Até</label>
                        <input type="date" id="report-date-to" class="form-control" value="${this.filters.dateTo}">
                    </div>
                    <div class="filter-group filter-group-span-2">
                        <label>Status</label>
                        ${this.renderStatusMultiSelect('report-status')}
                    </div>
                    <div class="filter-group">
                        <label>Região</label>
                        <select id="report-regiao" class="form-control">
                            <option value="">Todas</option>
                            ${options.regioes.map((regiao) => `
                                <option value="${Utils.escapeHtml(regiao)}" ${this.filters.regiao === regiao ? 'selected' : ''}>${Utils.escapeHtml(regiao)}</option>
                            `).join('')}
                        </select>
                    </div>
                    <div class="filter-group">
                        <label>Técnico</label>
                        <select id="report-tecnico" class="form-control">
                            <option value="">Todos</option>
                            ${options.tecnicos.map((tecnico) => `
                                <option value="${tecnico.id}" ${this.filters.tecnico === tecnico.id ? 'selected' : ''}>${Utils.escapeHtml(tecnico.nome)}</option>
                            `).join('')}
                        </select>
                    </div>
                    <div class="filter-group">
                        <label>Cliente</label>
                        <select id="report-cliente" class="form-control">
                            <option value="">Todos</option>
                            ${options.clientes.map((cliente) => `
                                <option value="${Utils.escapeHtml(cliente)}" ${this.filters.cliente === cliente ? 'selected' : ''}>${Utils.escapeHtml(cliente)}</option>
                            `).join('')}
                        </select>
                    </div>
                </div>
                <div class="report-filter-actions">
                    <button class="btn btn-primary report-primary-action" onclick="Relatorios.applyFilters()">
                        <i class="fas fa-filter"></i> Filtrar
                    </button>
                    <button class="btn btn-outline report-secondary-action" onclick="Relatorios.clearFilters()">
                        <i class="fas fa-eraser"></i> Limpar
                    </button>
                </div>
            </div>
        `;
    };

    Relatorios.renderOverviewModernReport = function renderOverviewModernReport() {
        const analysis = this.buildCostAnalysis();
        const topParts = sortPartsByCost(analysis.byPiece || []).slice(0, 8);
        const topTechnicians = sortTechniciansByCost(analysis.byTechnician || []).slice(0, 8);
        const recentSolicitations = this.getFilteredSolicitations().slice(0, 8);
        const monthly = buildMonthlyCostSummary(this, analysis);

        if ((analysis.totalCost || 0) === 0 && recentSolicitations.length === 0) {
            return renderCompactEmpty();
        }

        return `
            <section class="report-stack-grid">
                <div class="reports-two-column">
                    <article class="card report-panel-card">
                        <div class="card-header compact-card-header">
                            <div>
                                <h4>Evolução mensal de custos</h4>
                                <p class="text-muted">Visão temporal para identificar picos de gasto no período.</p>
                            </div>
                            <button class="btn btn-outline btn-sm" onclick="Relatorios.exportCustos()">
                                <i class="fas fa-file-excel"></i> Exportar
                            </button>
                        </div>
                        <div class="card-body">
                            <div class="reports-inline-summary">
                                <span class="tag-soft info"><i class="fas fa-calendar-days"></i> ${Utils.escapeHtml(monthly.latestMonthLabel)}</span>
                                <span class="tag-soft success"><i class="fas fa-chart-line"></i> Média mensal: ${Utils.formatCurrency(monthly.averageMonthlyCost)}</span>
                            </div>
                            <div class="chart-wrapper compact-chart-wrapper">
                                <canvas id="reportOverviewMonthlyChart"></canvas>
                            </div>
                        </div>
                    </article>

                    <article class="card report-panel-card">
                        <div class="card-header compact-card-header">
                            <div>
                                <h4>Ranking de custo por técnico</h4>
                                <p class="text-muted">Ordenado do maior custo total para o menor.</p>
                            </div>
                        </div>
                        <div class="card-body">
                            <div class="chart-wrapper compact-chart-wrapper">
                                <canvas id="reportOverviewTechChart"></canvas>
                            </div>
                        </div>
                    </article>
                </div>

                <div class="reports-two-column">
                    <article class="card report-panel-card">
                        <div class="card-header compact-card-header">
                            <div>
                                <h4>Peças com maior custo</h4>
                                <p class="text-muted">Ranking por impacto financeiro total no período.</p>
                            </div>
                        </div>
                        <div class="card-body">
                            ${renderPartsTable(topParts, analysis.totalCost || 0)}
                        </div>
                    </article>

                    <article class="card report-panel-card">
                        <div class="card-header compact-card-header">
                            <div>
                                <h4>Histórico recente</h4>
                                <p class="text-muted">Últimas solicitações dentro do filtro atual.</p>
                            </div>
                        </div>
                        <div class="card-body">
                            ${recentSolicitations.length === 0 ? renderCompactEmpty() : `
                                <div class="table-container dashboard-compact-table">
                                    <table class="table">
                                        <thead>
                                            <tr>
                                                <th>Data</th>
                                                <th>Número</th>
                                                <th>Técnico</th>
                                                <th>Cliente</th>
                                                <th>Custo</th>
                                                <th>Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${renderRecentRows(recentSolicitations)}
                                        </tbody>
                                    </table>
                                </div>
                            `}
                        </div>
                    </article>
                </div>
            </section>
        `;
    };

    Relatorios.renderPecasModernReport = function renderPecasModernReport() {
        const analysis = this.buildCostAnalysis();
        const parts = sortPartsByCost(analysis.byPiece || []);

        return `
            <article class="card report-panel-card">
                <div class="card-header compact-card-header">
                    <div>
                        <h4>Custo por Peça</h4>
                        <p class="text-muted">Ranking financeiro por peça com foco em custo total e custo médio.</p>
                    </div>
                    <button class="btn btn-outline btn-sm" onclick="Relatorios.exportPecas()">
                        <i class="fas fa-file-excel"></i> Exportar
                    </button>
                </div>
                <div class="card-body">
                    ${parts.length === 0 ? renderCompactEmpty() : `
                        <div class="reports-two-column report-detail-grid">
                            <div class="chart-container report-chart-card">
                                <div class="chart-wrapper compact-chart-wrapper">
                                    <canvas id="reportPartCostChart"></canvas>
                                </div>
                            </div>
                            <div>
                                ${renderPartsTable(parts, analysis.totalCost || 0)}
                            </div>
                        </div>
                    `}
                </div>
            </article>
        `;
    };

    Relatorios.renderTecnicosModernReport = function renderTecnicosModernReport() {
        const analysis = this.buildCostAnalysis();
        const technicians = sortTechniciansByCost(analysis.byTechnician || []);

        return `
            <article class="card report-panel-card">
                <div class="card-header compact-card-header">
                    <div>
                        <h4>Custo por Técnico</h4>
                        <p class="text-muted">Prioridade de leitura: maior custo total para menor custo total.</p>
                    </div>
                    <button class="btn btn-outline btn-sm" onclick="Relatorios.exportTecnicos()">
                        <i class="fas fa-file-excel"></i> Exportar
                    </button>
                </div>
                <div class="card-body">
                    ${technicians.length === 0 ? renderCompactEmpty() : `
                        <div class="reports-two-column report-detail-grid">
                            <div class="chart-container report-chart-card">
                                <h4 class="mb-2">Custo total por técnico</h4>
                                <div class="chart-wrapper compact-chart-wrapper">
                                    <canvas id="reportTechnicianCostChart"></canvas>
                                </div>
                            </div>
                            <div>
                                ${renderTechniciansTable(technicians)}
                            </div>
                        </div>
                    `}
                </div>
            </article>
        `;
    };

    Relatorios.renderMesesModernReport = function renderMesesModernReport() {
        const analysis = this.buildCostAnalysis();
        const months = analysis.byMonth || [];
        const monthly = buildMonthlyCostSummary(this, analysis);

        return `
            <article class="card report-panel-card">
                <div class="card-header compact-card-header">
                    <div>
                        <h4>Custo por Mês</h4>
                        <p class="text-muted">Evolução mensal com média mensal calculada pelo período filtrado.</p>
                    </div>
                    <button class="btn btn-outline btn-sm" onclick="Relatorios.exportCustos()">
                        <i class="fas fa-file-excel"></i> Exportar
                    </button>
                </div>
                <div class="card-body">
                    <div class="reports-inline-summary">
                        <span class="tag-soft info"><i class="fas fa-calendar-alt"></i> ${Utils.formatNumber(monthly.monthCount)} mês(es) no filtro</span>
                        <span class="tag-soft success"><i class="fas fa-chart-line"></i> Média mensal: ${Utils.formatCurrency(monthly.averageMonthlyCost)}</span>
                    </div>
                    ${months.length === 0 ? renderCompactEmpty() : `
                        <div class="report-stack-grid">
                            <div class="chart-container report-chart-card report-chart-card-full">
                                <div class="chart-wrapper compact-chart-wrapper">
                                    <canvas id="reportMonthlyCostChart"></canvas>
                                </div>
                            </div>
                            <div class="table-container">
                                <table class="table">
                                    <thead>
                                        <tr>
                                            <th>Mês</th>
                                            <th>Solicitações com custo</th>
                                            <th>Custo total</th>
                                            <th>Custo médio por solicitação</th>
                                            <th>Comparativo</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${buildMonthlyRows(months)}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    `}
                </div>
            </article>
        `;
    };

    Relatorios.renderHistoricoModernReport = function renderHistoricoModernReport() {
        const solicitations = this.getFilteredSolicitations();
        const analysis = this.buildCostAnalysis();
        const statusSummary = buildStatusDistribution(solicitations);

        return `
            <article class="card report-panel-card">
                <div class="card-header compact-card-header">
                    <div>
                        <h4>Relatório de Solicitações</h4>
                        <p class="text-muted">Leitura executiva com foco em volume, custo e status do fluxo operacional.</p>
                    </div>
                    <button class="btn btn-outline btn-sm" onclick="Relatorios.exportSolicitacoes()">
                        <i class="fas fa-file-excel"></i> Exportar
                    </button>
                </div>
                <div class="card-body">
                    <div class="reports-inline-summary reports-inline-summary-spread">
                        <span class="tag-soft info"><i class="fas fa-clipboard-list"></i> ${Utils.formatNumber(solicitations.length)} solicitação(ões)</span>
                        <span class="tag-soft primary"><i class="fas fa-sack-dollar"></i> ${Utils.formatCurrency(analysis.totalCost || 0)} em custos</span>
                        <span class="tag-soft success"><i class="fas fa-receipt"></i> Ticket médio ${Utils.formatCurrency(analysis.costPerAttendance || 0)}</span>
                    </div>
                    ${statusSummary.length > 0 ? `
                        <div class="reports-status-row">
                            ${statusSummary.map((item) => `
                                <span class="reports-status-chip"><span>${Utils.escapeHtml(item.label)}</span> <strong>${Utils.formatNumber(item.count)}</strong></span>
                            `).join('')}
                        </div>
                    ` : ''}
                    <p class="helper-text" style="margin: 0 0 10px;">Fluxo operacional: técnico abre, gestor avalia, aprovação envia PDF ao fornecedor, gestor registra rastreio, técnico confirma entrega e finaliza.</p>
                    ${renderHistoryTable(this, solicitations)}
                </div>
            </article>
        `;
    };

    Relatorios.afterRender = function afterRender() {
        this.bindFilterControls();
        setTimeout(() => this.initCharts(), 50);
        if (typeof Auth !== 'undefined' && typeof Auth.renderMenu === 'function') {
            Auth.renderMenu('relatorios');
        }
    };

    Relatorios.applyFilters = function applyFilters() {
        this.filters.dateFrom = document.getElementById('report-date-from')?.value || '';
        this.filters.dateTo = document.getElementById('report-date-to')?.value || '';
        this.filters.status = this.getSelectedStatusValues('report-status');
        this.filters.tecnico = document.getElementById('report-tecnico')?.value || '';
        this.filters.regiao = document.getElementById('report-regiao')?.value || '';
        this.filters.cliente = document.getElementById('report-cliente')?.value || '';

        AnalyticsHelper.saveGlobalPeriodFilter({
            dateFrom: this.filters.dateFrom,
            dateTo: this.filters.dateTo
        });

        this.render();
    };

    Relatorios.clearFilters = function clearFilters() {
        const period = AnalyticsHelper.setGlobalPeriodByDays(AnalyticsHelper.getDefaultRangeDays());
        this.filters = {
            dateFrom: period.dateFrom,
            dateTo: period.dateTo,
            status: [],
            tecnico: '',
            regiao: '',
            cliente: ''
        };

        this.render();
    };

    Relatorios.initCharts = function initCharts() {
        this.destroyCharts();

        const chartIds = [
            'reportOverviewMonthlyChart',
            'reportOverviewTechChart',
            'reportPartCostChart',
            'reportTechnicianCostChart',
            'reportMonthlyCostChart'
        ];

        if (typeof Chart === 'undefined') {
            chartIds.forEach((id) => replaceChartFallback(id, 'Gráfico indisponível no momento'));
            return;
        }

        const analysis = this.buildCostAnalysis();
        const topParts = sortPartsByCost(analysis.byPiece || []).slice(0, 10);
        const topTechnicians = sortTechniciansByCost(analysis.byTechnician || []).slice(0, 10);
        const months = analysis.byMonth || [];
        const chartTheme = getReportChartTheme();

        const overviewMonthlyCanvas = document.getElementById('reportOverviewMonthlyChart');
        if (overviewMonthlyCanvas && months.some((month) => Number(month.totalCost) > 0)) {
            this.charts.reportOverviewMonthlyChart = new Chart(overviewMonthlyCanvas, {
                type: 'line',
                data: {
                    labels: months.map((month) => month.label),
                    datasets: [{
                        data: months.map((month) => Number(month.totalCost) || 0),
                        borderColor: '#2563EB',
                        backgroundColor: 'rgba(37, 99, 235, 0.12)',
                        fill: true,
                        tension: 0.28,
                        pointRadius: 3,
                        pointHoverRadius: 4
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
                                color: chartTheme.textColor,
                                callback: (value) => Utils.formatCurrency(Number(value) || 0)
                            },
                            grid: {
                                color: chartTheme.gridColor
                            }
                        },
                        x: {
                            ticks: {
                                color: chartTheme.textColor
                            },
                            grid: { display: false }
                        }
                    }
                }
            });
        } else {
            replaceChartFallback('reportOverviewMonthlyChart', 'Sem dados no período selecionado');
        }

        createVerticalCostChart(
            this,
            'reportOverviewTechChart',
            topTechnicians.slice(0, 8).map((technician) => technician.nome),
            topTechnicians.slice(0, 8).map((technician) => Number(technician.totalCost) || 0),
            'rgba(14, 116, 144, 0.85)'
        );

        createHorizontalCostChart(
            this,
            'reportPartCostChart',
            topParts.map((part) => part.codigo),
            topParts.map((part) => Number(part.totalCost) || 0),
            'rgba(245, 158, 11, 0.85)'
        );

        createVerticalCostChart(
            this,
            'reportTechnicianCostChart',
            topTechnicians.map((technician) => technician.nome),
            topTechnicians.map((technician) => Number(technician.totalCost) || 0),
            'rgba(37, 99, 235, 0.85)'
        );

        const monthlyCanvas = document.getElementById('reportMonthlyCostChart');
        if (monthlyCanvas && months.length > 0) {
            this.charts.reportMonthlyCostChart = new Chart(monthlyCanvas, {
                type: 'bar',
                data: {
                    labels: months.map((month) => month.label),
                    datasets: [{
                        data: months.map((month) => Number(month.totalCost) || 0),
                        backgroundColor: 'rgba(22, 163, 74, 0.82)',
                        borderRadius: 8,
                        maxBarThickness: 40
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
                                color: chartTheme.textColor,
                                callback: (value) => Utils.formatCurrency(Number(value) || 0)
                            },
                            grid: {
                                color: chartTheme.gridColor
                            }
                        },
                        x: {
                            ticks: {
                                color: chartTheme.textColor
                            },
                            grid: { display: false }
                        }
                    }
                }
            });
        } else {
            replaceChartFallback('reportMonthlyCostChart', 'Sem dados no período selecionado');
        }
    };
}




























