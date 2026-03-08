function normalizeReport(report) {
    const map = {
        custos: 'custos',
        'visao-geral': 'custos',
        solicitacoes: 'solicitacoes',
        historico: 'solicitacoes',
        tecnicos: 'tecnicos',
        pecas: 'pecas',
        meses: 'custos'
    };

    return map[String(report || '').trim().toLowerCase()] || 'custos';
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
    return String(sol?.cliente || sol?.clienteNome || '').trim() || 'Nao informado';
}

function renderCompactEmpty(message = 'Sem dados no periodo selecionado.', description = 'Ajuste os filtros para continuar.') {
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
            title: 'Custo total de pecas',
            value: Utils.formatCurrency(analysis.totalCost || 0),
            note: 'Base financeira do filtro atual',
            icon: 'fa-sack-dollar',
            tone: 'primary'
        },
        {
            title: 'Ticket medio',
            value: Utils.formatCurrency(analysis.costPerAttendance || 0),
            note: `${Utils.formatNumber(analysis.totalCalls || 0)} solicitacao(oes) com custo`,
            icon: 'fa-receipt',
            tone: 'success'
        },
        {
            title: 'Media por tecnico',
            value: Utils.formatCurrency(analysis.avgCostPerTech || 0),
            note: `${Utils.formatNumber(analysis.uniqueTechCount || 0)} tecnico(s) no periodo`,
            icon: 'fa-user-gear',
            tone: 'info'
        },
        {
            title: 'Media mensal',
            value: Utils.formatCurrency(monthly.averageMonthlyCost),
            note: `${Utils.formatNumber(monthly.monthCount)} mes(es) no filtro`,
            icon: 'fa-chart-line',
            tone: 'warning'
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
function buildReportFilterChips(relatorios) {
    const chips = [];
    const filters = relatorios.filters || {};
    const statuses = Array.isArray(filters.status) ? filters.status : [];
    const statusLabels = relatorios.getStatusOptions()
        .filter((option) => statuses.includes(option.value))
        .map((option) => option.label);
    const technician = filters.tecnico ? DataManager.getTechnicianById(filters.tecnico) : null;

    if (statusLabels.length > 0) {
        chips.push(`Status: ${statusLabels.join(', ')}`);
    }
    if (filters.regiao) {
        chips.push(`Regiao: ${filters.regiao}`);
    }
    if (technician?.nome) {
        chips.push(`Tecnico: ${technician.nome}`);
    }
    if (filters.cliente) {
        chips.push(`Cliente: ${filters.cliente}`);
    }

    return chips;
}

function renderPartsTable(parts, totalCost) {
    if (!parts.length) {
        return renderCompactEmpty();
    }

    return `
        <div class="table-container dashboard-compact-table" data-skip-quick-filter="true">
            <table class="table compact-table">
                <thead>
                    <tr>
                        <th>Peca</th>
                        <th>Quantidade</th>
                        <th>Custo total</th>
                        <th>Participacao</th>
                    </tr>
                </thead>
                <tbody>
                    ${parts.map((part) => {
        const share = totalCost > 0 ? ((Number(part.totalCost) || 0) / totalCost) * 100 : 0;
        return `
                            <tr>
                                <td>
                                    <strong>${Utils.escapeHtml(part.descricao || part.codigo || 'Sem descricao')}</strong>
                                    <div class="helper-text">${Utils.escapeHtml(part.codigo || '-')}</div>
                                </td>
                                <td>${Utils.formatNumber(part.quantidade || 0)}</td>
                                <td>${Utils.formatCurrency(part.totalCost || 0)}</td>
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
        <div class="table-container dashboard-compact-table" data-skip-quick-filter="true">
            <table class="table compact-table">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Tecnico</th>
                        <th>Solicitacoes</th>
                        <th>Custo total</th>
                        <th>Ticket medio</th>
                    </tr>
                </thead>
                <tbody>
                    ${technicians.map((technician, index) => `
                        <tr>
                            <td><strong>${index + 1}</strong></td>
                            <td><strong>${Utils.escapeHtml(technician.nome)}</strong></td>
                            <td>${Utils.formatNumber(technician.calls || 0)}</td>
                            <td>${Utils.formatCurrency(technician.totalCost || 0)}</td>
                            <td>${Utils.formatCurrency(technician.costPerCall || 0)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function renderSolicitationRows(solicitations) {
    return solicitations.slice(0, 60).map((sol) => `
        <tr>
            <td>${Utils.formatDate(sol.data || sol.createdAt)}</td>
            <td><strong>#${sol.numero}</strong></td>
            <td>${Utils.escapeHtml(sol.tecnicoNome || 'Nao informado')}</td>
            <td>${Utils.escapeHtml(relatoriosSafeClient(sol))}</td>
            <td>${Utils.formatCurrency(sol.total || 0)}</td>
            <td>${Utils.renderStatusBadge(sol.status)}</td>
        </tr>
    `).join('');
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
                <td>${Utils.formatNumber(month.requestCount || 0)}</td>
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
            replaceChartFallback(id, 'Sem dados no periodo selecionado');
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
            replaceChartFallback(id, 'Sem dados no periodo selecionado');
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
        window.__reportTarget = this.currentReport;
        this.syncDateFiltersFromGlobal();

        const content = document.getElementById('content-area');
        if (!content) {
            return;
        }

        const periodLabel = AnalyticsHelper.getRangeLabel({
            dateFrom: this.filters.dateFrom,
            dateTo: this.filters.dateTo,
            rangeDays: AnalyticsHelper.getGlobalPeriodFilter().rangeDays
        });

        content.innerHTML = `
            <div class="page-container reports-shell">
                <div class="page-header reports-header-compact">
                    <div class="page-heading">
                        <h2><i class="fas fa-file-alt"></i> Relatorios</h2>
                        <p class="text-muted">Leitura objetiva de custos, solicitacoes e concentracao por tecnico ou peca.</p>
                    </div>
                    <span class="report-period-chip">${Utils.escapeHtml(periodLabel)}</span>
                </div>

                <div class="page-filters reports-filter-shell">
                    ${this.renderCostFilters()}
                </div>

                ${this.currentReport === 'custos' ? `
                    <div class="page-kpis">
                        ${buildExecutiveCards(this)}
                    </div>
                ` : ''}

                <div class="page-content reports-content-stack">
                    <div class="report-tabs-modern">
                        <button class="report-tab-btn ${this.currentReport === 'custos' ? 'active' : ''}" onclick="Relatorios.switchReport('custos')">
                            <i class="fas fa-chart-pie"></i> Custos
                        </button>
                        <button class="report-tab-btn ${this.currentReport === 'solicitacoes' ? 'active' : ''}" onclick="Relatorios.switchReport('solicitacoes')">
                            <i class="fas fa-clipboard-list"></i> Solicitacoes
                        </button>
                        <button class="report-tab-btn ${this.currentReport === 'tecnicos' ? 'active' : ''}" onclick="Relatorios.switchReport('tecnicos')">
                            <i class="fas fa-user-gear"></i> Por tecnico
                        </button>
                        <button class="report-tab-btn ${this.currentReport === 'pecas' ? 'active' : ''}" onclick="Relatorios.switchReport('pecas')">
                            <i class="fas fa-box-open"></i> Por peca
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
        case 'solicitacoes':
            return this.renderSolicitacoesExecutiveReport();
        case 'tecnicos':
            return this.renderTecnicosExecutiveReport();
        case 'pecas':
            return this.renderPecasExecutiveReport();
        case 'custos':
        default:
            return this.renderCustosExecutiveReport();
        }
    };

    Relatorios.renderCostFilters = function renderCostFilters() {
        const options = this.getAvailableCostFilters();
        const activeChips = buildReportFilterChips(this);
        const advancedOpen = !!(this.filters.regiao || this.filters.tecnico || this.filters.cliente);

        return `
            <div class="report-filters-modern">
                <div class="filter-shell-primary">
                    <div class="report-filters-primary">
                        <div class="filter-group">
                            <label>De</label>
                            <input type="date" id="report-date-from" class="form-control" value="${this.filters.dateFrom}">
                        </div>
                        <div class="filter-group">
                            <label>Ate</label>
                            <input type="date" id="report-date-to" class="form-control" value="${this.filters.dateTo}">
                        </div>
                        <div class="filter-group filter-group-wide">
                            <label>Status</label>
                            ${this.renderStatusMultiSelect('report-status')}
                        </div>
                    </div>
                    <div class="filter-inline-group filter-inline-group-actions">
                        <details class="filter-panel compact" ${advancedOpen ? 'open' : ''}>
                            <summary class="filter-panel-toggle">Mais filtros${activeChips.length ? ` <span class="filter-summary-count">${activeChips.length}</span>` : ''}</summary>
                            <div class="filter-panel-body">
                                <div class="filters-bar report-filters-advanced">
                                    <div class="filter-group">
                                        <label>Regiao</label>
                                        <select id="report-regiao" class="form-control">
                                            <option value="">Todas</option>
                                            ${options.regioes.map((regiao) => `<option value="${Utils.escapeHtml(regiao)}" ${this.filters.regiao === regiao ? 'selected' : ''}>${Utils.escapeHtml(regiao)}</option>`).join('')}
                                        </select>
                                    </div>
                                    <div class="filter-group">
                                        <label>Tecnico</label>
                                        <select id="report-tecnico" class="form-control">
                                            <option value="">Todos</option>
                                            ${options.tecnicos.map((tecnico) => `<option value="${tecnico.id}" ${this.filters.tecnico === tecnico.id ? 'selected' : ''}>${Utils.escapeHtml(tecnico.nome)}</option>`).join('')}
                                        </select>
                                    </div>
                                    <div class="filter-group">
                                        <label>Cliente</label>
                                        <select id="report-cliente" class="form-control">
                                            <option value="">Todos</option>
                                            ${options.clientes.map((cliente) => `<option value="${Utils.escapeHtml(cliente)}" ${this.filters.cliente === cliente ? 'selected' : ''}>${Utils.escapeHtml(cliente)}</option>`).join('')}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </details>
                        <button class="btn btn-outline btn-sm" onclick="Relatorios.clearFilters()">
                            <i class="fas fa-eraser"></i> Limpar
                        </button>
                    </div>
                </div>
                <div class="filter-summary-row">
                    ${activeChips.length
        ? activeChips.map((chip) => `<span class="filter-summary-chip">${Utils.escapeHtml(chip)}</span>`).join('')
        : '<span class="filter-summary-empty">Usando somente periodo e status como filtros visiveis.</span>'}
                </div>
            </div>
        `;
    };

    Relatorios.renderCustosExecutiveReport = function renderCustosExecutiveReport() {
        const analysis = this.buildCostAnalysis();
        const topParts = sortPartsByCost(analysis.byPiece || []).slice(0, 8);
        const topTechnicians = sortTechniciansByCost(analysis.byTechnician || []).slice(0, 8);
        const monthly = buildMonthlyCostSummary(this, analysis);
        const months = analysis.byMonth || [];

        if ((analysis.totalCost || 0) === 0 && months.length === 0) {
            return renderCompactEmpty();
        }

        return `
            <section class="report-stack-grid">
                <article class="card report-panel-card">
                    <div class="card-header compact-card-header">
                        <div>
                            <h4>Relatorio de Custos</h4>
                            <p class="text-muted">Tendencia mensal, ranking por tecnico e consolidacao financeira.</p>
                        </div>
                        <button class="btn btn-outline btn-sm" onclick="Relatorios.exportCustos()">
                            <i class="fas fa-file-excel"></i> Exportar
                        </button>
                    </div>
                    <div class="card-body">
                        <div class="reports-inline-summary">
                            <span class="tag-soft info"><i class="fas fa-calendar-days"></i> ${Utils.escapeHtml(monthly.latestMonthLabel)}</span>
                            <span class="tag-soft success"><i class="fas fa-chart-line"></i> Media mensal ${Utils.formatCurrency(monthly.averageMonthlyCost)}</span>
                            <span class="tag-soft warning"><i class="fas fa-sack-dollar"></i> Ultimo mes ${Utils.formatCurrency(monthly.latestMonthCost)}</span>
                        </div>
                        <div class="reports-two-column report-detail-grid">
                            <div class="chart-container report-chart-card">
                                <div class="chart-wrapper compact-chart-wrapper">
                                    <canvas id="reportCostMonthlyChart"></canvas>
                                </div>
                            </div>
                            <div class="chart-container report-chart-card">
                                <div class="chart-wrapper compact-chart-wrapper">
                                    <canvas id="reportCostTechChart"></canvas>
                                </div>
                            </div>
                        </div>
                    </div>
                </article>

                <div class="reports-two-column report-detail-grid">
                    <article class="card report-panel-card">
                        <div class="card-header compact-card-header">
                            <div>
                                <h4>Pecas com maior custo</h4>
                                <p class="text-muted">Concentracao financeira por peca dentro do filtro atual.</p>
                            </div>
                        </div>
                        <div class="card-body">
                            ${renderPartsTable(topParts, analysis.totalCost || 0)}
                        </div>
                    </article>

                    <article class="card report-panel-card">
                        <div class="card-header compact-card-header">
                            <div>
                                <h4>Resumo mensal</h4>
                                <p class="text-muted">Tabela executiva para leitura rapida da evolucao de custos.</p>
                            </div>
                        </div>
                        <div class="card-body">
                            ${months.length === 0 ? renderCompactEmpty() : `
                                <div class="table-container" data-skip-quick-filter="true">
                                    <table class="table compact-table">
                                        <thead>
                                            <tr>
                                                <th>Mes</th>
                                                <th>Solicitacoes</th>
                                                <th>Custo total</th>
                                                <th>Ticket medio</th>
                                                <th>Comparativo</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${buildMonthlyRows(months)}
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
    Relatorios.renderSolicitacoesExecutiveReport = function renderSolicitacoesExecutiveReport() {
        const solicitations = this.getFilteredSolicitations();
        const analysis = this.buildCostAnalysis();
        const statusSummary = buildStatusDistribution(solicitations);
        const totalItems = solicitations.reduce((sum, sol) => sum + ((sol.itens || []).reduce((itemSum, item) => itemSum + (Number(item?.quantidade) || 0), 0)), 0);

        return `
            <article class="card report-panel-card">
                <div class="card-header compact-card-header">
                    <div>
                        <h4>Solicitacoes</h4>
                        <p class="text-muted">Volume, custo e status do fluxo em uma leitura mais limpa.</p>
                    </div>
                    <button class="btn btn-outline btn-sm" onclick="Relatorios.exportSolicitacoes()">
                        <i class="fas fa-file-excel"></i> Exportar
                    </button>
                </div>
                <div class="card-body">
                    ${solicitations.length === 0 ? renderCompactEmpty() : `
                        <div class="summary-inline-grid summary-inline-grid-compact">
                            <article class="summary-inline-card">
                                <span>Total de solicitacoes</span>
                                <strong>${Utils.formatNumber(solicitations.length)}</strong>
                                <small>Base filtrada atual</small>
                            </article>
                            <article class="summary-inline-card">
                                <span>Total financeiro</span>
                                <strong>${Utils.formatCurrency(analysis.totalCost || 0)}</strong>
                                <small>Custo agregado do periodo</small>
                            </article>
                            <article class="summary-inline-card">
                                <span>Total de pecas</span>
                                <strong>${Utils.formatNumber(totalItems)}</strong>
                                <small>Itens consolidados no filtro</small>
                            </article>
                        </div>
                        ${statusSummary.length ? `
                            <div class="reports-status-row">
                                ${statusSummary.map((item) => `
                                    <span class="reports-status-chip">
                                        <span>${Utils.escapeHtml(item.label)}</span>
                                        <strong>${Utils.formatNumber(item.count)}</strong>
                                    </span>
                                `).join('')}
                            </div>
                        ` : ''}
                        <div class="table-container">
                            <table class="table">
                                <thead>
                                    <tr>
                                        <th>Data</th>
                                        <th>Numero</th>
                                        <th>Tecnico</th>
                                        <th>Cliente</th>
                                        <th>Total</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${renderSolicitationRows(solicitations)}
                                </tbody>
                            </table>
                        </div>
                        ${solicitations.length > 60 ? `<p class="text-muted text-center mt-2">Mostrando 60 de ${solicitations.length} registros. Exporte para ver tudo.</p>` : ''}
                    `}
                </div>
            </article>
        `;
    };

    Relatorios.renderTecnicosExecutiveReport = function renderTecnicosExecutiveReport() {
        const analysis = this.buildCostAnalysis();
        const technicians = sortTechniciansByCost(analysis.byTechnician || []);
        const topTechnician = technicians[0] || null;

        return `
            <article class="card report-panel-card">
                <div class="card-header compact-card-header">
                    <div>
                        <h4>Custo por Tecnico</h4>
                        <p class="text-muted">Concentracao financeira por tecnico com grafico e tabela alinhados.</p>
                    </div>
                    <button class="btn btn-outline btn-sm" onclick="Relatorios.exportTecnicos()">
                        <i class="fas fa-file-excel"></i> Exportar
                    </button>
                </div>
                <div class="card-body">
                    ${technicians.length === 0 ? renderCompactEmpty() : `
                        <div class="summary-inline-grid summary-inline-grid-compact">
                            <article class="summary-inline-card">
                                <span>Tecnicos com custo</span>
                                <strong>${Utils.formatNumber(technicians.length)}</strong>
                                <small>Quantidade no filtro atual</small>
                            </article>
                            <article class="summary-inline-card">
                                <span>Maior custo total</span>
                                <strong>${Utils.escapeHtml(topTechnician?.nome || 'Sem dados')}</strong>
                                <small>${topTechnician ? Utils.formatCurrency(topTechnician.totalCost || 0) : 'Sem custos'}</small>
                            </article>
                            <article class="summary-inline-card">
                                <span>Media por tecnico</span>
                                <strong>${Utils.formatCurrency(analysis.avgCostPerTech || 0)}</strong>
                                <small>Base financeira media da equipe</small>
                            </article>
                        </div>
                        <div class="reports-two-column report-detail-grid">
                            <div class="chart-container report-chart-card">
                                <div class="chart-wrapper compact-chart-wrapper">
                                    <canvas id="reportTechnicianChart"></canvas>
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

    Relatorios.renderPecasExecutiveReport = function renderPecasExecutiveReport() {
        const analysis = this.buildCostAnalysis();
        const parts = sortPartsByCost(analysis.byPiece || []);
        const topPart = parts[0] || null;

        return `
            <article class="card report-panel-card">
                <div class="card-header compact-card-header">
                    <div>
                        <h4>Custo por Peca</h4>
                        <p class="text-muted">Participacao de custo por item com menos ruido visual.</p>
                    </div>
                    <button class="btn btn-outline btn-sm" onclick="Relatorios.exportPecas()">
                        <i class="fas fa-file-excel"></i> Exportar
                    </button>
                </div>
                <div class="card-body">
                    ${parts.length === 0 ? renderCompactEmpty() : `
                        <div class="summary-inline-grid summary-inline-grid-compact">
                            <article class="summary-inline-card">
                                <span>Pecas no filtro</span>
                                <strong>${Utils.formatNumber(parts.length)}</strong>
                                <small>Itens distintos com custo</small>
                            </article>
                            <article class="summary-inline-card">
                                <span>Peca de maior impacto</span>
                                <strong>${Utils.escapeHtml(topPart?.descricao || topPart?.codigo || 'Sem dados')}</strong>
                                <small>${topPart ? Utils.formatCurrency(topPart.totalCost || 0) : 'Sem custos'}</small>
                            </article>
                            <article class="summary-inline-card">
                                <span>Custo total</span>
                                <strong>${Utils.formatCurrency(analysis.totalCost || 0)}</strong>
                                <small>Base consolidada do periodo</small>
                            </article>
                        </div>
                        <div class="reports-two-column report-detail-grid">
                            <div class="chart-container report-chart-card">
                                <div class="chart-wrapper compact-chart-wrapper">
                                    <canvas id="reportPartChart"></canvas>
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
            'reportCostMonthlyChart',
            'reportCostTechChart',
            'reportTechnicianChart',
            'reportPartChart'
        ];

        if (typeof Chart === 'undefined') {
            chartIds.forEach((id) => replaceChartFallback(id, 'Grafico indisponivel no momento'));
            return;
        }

        const analysis = this.buildCostAnalysis();
        const topParts = sortPartsByCost(analysis.byPiece || []).slice(0, 10);
        const topTechnicians = sortTechniciansByCost(analysis.byTechnician || []).slice(0, 10);
        const months = analysis.byMonth || [];
        const chartTheme = getReportChartTheme();

        const monthlyCanvas = document.getElementById('reportCostMonthlyChart');
        if (monthlyCanvas && months.some((month) => Number(month.totalCost) > 0)) {
            this.charts.reportCostMonthlyChart = new Chart(monthlyCanvas, {
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
            replaceChartFallback('reportCostMonthlyChart', 'Sem dados no periodo selecionado');
        }

        createVerticalCostChart(
            this,
            'reportCostTechChart',
            topTechnicians.slice(0, 8).map((technician) => technician.nome),
            topTechnicians.slice(0, 8).map((technician) => Number(technician.totalCost) || 0),
            'rgba(14, 116, 144, 0.85)'
        );

        createVerticalCostChart(
            this,
            'reportTechnicianChart',
            topTechnicians.map((technician) => technician.nome),
            topTechnicians.map((technician) => Number(technician.totalCost) || 0),
            'rgba(37, 99, 235, 0.85)'
        );

        createHorizontalCostChart(
            this,
            'reportPartChart',
            topParts.map((part) => part.codigo || part.descricao || 'Peca'),
            topParts.map((part) => Number(part.totalCost) || 0),
            'rgba(245, 158, 11, 0.85)'
        );
    };
}
