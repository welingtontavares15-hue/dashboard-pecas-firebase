import { renderKpiCard } from './kpi-card.js';
import { renderFilterField } from './filters.js';

const DASHBOARD_TEXTS = {
    title: 'Painel Executivo de Pecas',
    subtitle: 'Leitura objetiva de custo, volume e pendencias operacionais.',
    empty: 'Sem dados no periodo selecionado.'
};

const PIPELINE_STATUSES = [
    'PENDENTE_APROVACAO',
    'APROVADO',
    'EM_COMPRA',
    'CONCLUIDO',
    'REPROVADO'
];

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
        { label: 'Em aprovacao', value: 'PENDENTE_APROVACAO' },
        { label: 'Aprovado', value: 'APROVADO' },
        { label: 'Em transito', value: 'EM_COMPRA' },
        { label: 'Finalizada', value: 'CONCLUIDO' },
        { label: 'Rejeitado', value: 'REPROVADO' }
    ];
}

function getMappedStatuses(pipelineStatus) {
    const map = {
        PENDENTE_APROVACAO: ['pendente', 'rascunho', 'enviada'],
        APROVADO: ['aprovada'],
        EM_COMPRA: ['em-transito'],
        CONCLUIDO: ['finalizada', 'entregue', 'historico-manual'],
        REPROVADO: ['rejeitada']
    };

    return map[pipelineStatus] || [];
}

function getPeriodLabel(filters) {
    return AnalyticsHelper.getRangeLabel({
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        rangeDays: AnalyticsHelper.getGlobalPeriodFilter().rangeDays
    });
}

function hasAdvancedDashboardFilters(filters) {
    return !!(
        filters.estado ||
        filters.cliente ||
        filters.tecnico ||
        filters.status ||
        String(filters.periodPreset) === 'custom'
    );
}

function buildDashboardFilterChips(filters) {
    const chips = [];
    const statusOption = getStatusOptions().find((option) => option.value === filters.status);
    const technician = filters.tecnico ? DataManager.getTechnicianById(filters.tecnico) : null;

    if (String(filters.periodPreset) === 'custom') {
        chips.push('Periodo personalizado');
    }
    if (filters.estado) {
        chips.push(`Regiao: ${filters.estado}`);
    }
    if (filters.cliente) {
        chips.push(`Cliente: ${filters.cliente}`);
    }
    if (technician?.nome) {
        chips.push(`Tecnico: ${technician.nome}`);
    }
    if (statusOption?.label && filters.status) {
        chips.push(`Status: ${statusOption.label}`);
    }

    return chips;
}

function filterBaseSolicitations(filters) {
    const statusList = filters.status ? getMappedStatuses(filters.status) : [];

    let data = AnalyticsHelper.filterSolicitations(DataManager.getSolicitations().slice(), {
        period: {
            dateFrom: filters.dateFrom,
            dateTo: filters.dateTo
        },
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
    return solicitations.filter((sol) => !closedStatuses.has(String(AnalyticsHelper.normalizeStatus(sol.status || '') || '').toUpperCase())).length;
}

function renderCompactEmpty(message = DASHBOARD_TEXTS.empty) {
    return `
        <div class="empty-state compact-empty-state">
            <i class="fas fa-chart-line"></i>
            <h4>Sem dados suficientes</h4>
            <p>${Utils.escapeHtml(message)}</p>
        </div>
    `;
}

function renderTopTechniciansTable(items = []) {
    if (!items.length) {
        return renderCompactEmpty();
    }

    return `
        <div class="table-container dashboard-compact-table" data-skip-quick-filter="true">
            <table class="table compact-table">
                <thead>
                    <tr>
                        <th>Tecnico</th>
                        <th>Solicitacoes</th>
                        <th>Custo total</th>
                        <th>Ticket medio</th>
                    </tr>
                </thead>
                <tbody>
                    ${items.map((tech, index) => `
                        <tr>
                            <td>
                                <strong>${index + 1}. ${Utils.escapeHtml(tech.nome || 'Sem dados')}</strong>
                            </td>
                            <td>${Utils.formatNumber(tech.calls || 0)}</td>
                            <td>${Utils.formatCurrency(tech.totalCost || 0)}</td>
                            <td>${Utils.formatCurrency(tech.costPerCall || 0)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function renderTopPiecesTable(items = []) {
    if (!items.length) {
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
                    </tr>
                </thead>
                <tbody>
                    ${items.map((piece) => `
                        <tr>
                            <td>
                                <strong>${Utils.escapeHtml(piece.descricao || piece.codigo || 'Sem descricao')}</strong>
                            </td>
                            <td>${Utils.formatNumber(piece.quantidade || 0)}</td>
                            <td>${Utils.formatCurrency(piece.totalCost || 0)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function renderExecutiveSummary(analysis, pendingCount, periodLabel) {
    const topTechnician = (analysis.byTechnician || []).slice().sort((a, b) => (Number(b.totalCost) || 0) - (Number(a.totalCost) || 0))[0] || null;
    const latestMonth = analysis.latestMonth || (analysis.byMonth || []).slice(-1)[0] || null;
    const monthCount = Math.max((analysis.byMonth || []).length, 1);
    const monthlyAverage = monthCount > 0 ? (Number(analysis.totalCost) || 0) / monthCount : 0;

    return `
        <div class="summary-inline-grid summary-inline-grid-compact">
            <article class="summary-inline-card">
                <span>Fila de aprovacao</span>
                <strong>${Utils.formatNumber(pendingCount)}</strong>
                <small>Itens aguardando decisao</small>
            </article>
            <article class="summary-inline-card">
                <span>Media mensal</span>
                <strong>${Utils.formatCurrency(monthlyAverage)}</strong>
                <small>${Utils.escapeHtml(periodLabel)}</small>
            </article>
            <article class="summary-inline-card">
                <span>Maior concentracao</span>
                <strong>${Utils.escapeHtml(topTechnician?.nome || 'Sem dados')}</strong>
                <small>${topTechnician ? Utils.formatCurrency(topTechnician.totalCost || 0) : 'Sem custos no filtro'}</small>
            </article>
            <article class="summary-inline-card">
                <span>Ultimo mes</span>
                <strong>${Utils.formatCurrency(latestMonth?.totalCost || 0)}</strong>
                <small>${Utils.escapeHtml(latestMonth?.label || 'Sem consolidacao mensal')}</small>
            </article>
        </div>
        <div class="dashboard-status-strip">
            ${PIPELINE_STATUSES.map((status) => {
        const label = getStatusOptions().find((option) => option.value === status)?.label || status;
        return `<span class="dashboard-status-pill">${Utils.escapeHtml(label)}</span>`;
    }).join('')}
        </div>
    `;
}

function buildPeriodOptions(filters) {
    return [
        { value: '7', label: 'Ultimos 7 dias' },
        { value: '30', label: 'Ultimos 30 dias' },
        { value: '90', label: 'Ultimos 90 dias' },
        { value: 'custom', label: 'Personalizado' }
    ].map((option) => `<option value="${option.value}" ${String(filters.periodPreset) === option.value ? 'selected' : ''}>${option.label}</option>`).join('');
}

export function applyDashboardModernization() {
    if (typeof window.Dashboard === 'undefined' || window.Dashboard.__visualRefined) {
        return;
    }

    window.Dashboard.__visualRefined = true;
    window.Dashboard.__saasModernized = true;
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
                        <p>Seu perfil possui acesso somente as suas solicitacoes.</p>
                    </div>
                </div>
            `;
            return;
        }

        const filters = this.saasFilters || getDefaultFilters();
        this.saasFilters = filters;

        const solicitations = filterBaseSolicitations(filters);
        const analysis = buildAnalysis(filters);
        const pending = DataManager.getPendingSolicitations();
        const technicians = DataManager.getTechnicians().filter((t) => t.ativo !== false);
        const regions = Array.from(new Set(technicians.map((t) => (t.regiao || t.estado || '').trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b));
        const activeChips = buildDashboardFilterChips(filters);
        const periodLabel = getPeriodLabel(filters);
        const openCount = getOpenSolicitationsCount(solicitations);
        const topTechnicians = (analysis.byTechnician || []).slice().sort((a, b) => (Number(b.totalCost) || 0) - (Number(a.totalCost) || 0)).slice(0, 6);
        const topPieces = (analysis.byPiece || []).slice().sort((a, b) => (Number(b.totalCost) || 0) - (Number(a.totalCost) || 0)).slice(0, 6);
        const advancedOpen = hasAdvancedDashboardFilters(filters);

        content.innerHTML = `
            <div class="page-container dashboard-refined-shell dashboard-cost-shell">
                <div class="page-header executive-page-header">
                    <div class="page-heading">
                        <h2><i class="fas fa-chart-line"></i> ${DASHBOARD_TEXTS.title}</h2>
                        <p class="text-muted">${DASHBOARD_TEXTS.subtitle}</p>
                    </div>
                </div>

                <section class="page-filters dashboard-filter-shell">
                    <div class="filter-shell-primary">
                        <div class="filter-inline-group filter-inline-group-main">
                            ${renderFilterField('Periodo', `
                                <select id="saas-period" class="form-control">
                                    ${buildPeriodOptions(filters)}
                                </select>
                            `)}
                            <div class="filter-group filter-period-pill">
                                <label>Base atual</label>
                                <div class="helper-text">${Utils.escapeHtml(periodLabel)}</div>
                            </div>
                        </div>
                        <div class="filter-inline-group filter-inline-group-actions">
                            <details class="filter-panel compact" ${advancedOpen ? 'open' : ''}>
                                <summary class="filter-panel-toggle">Mais filtros${activeChips.length ? ` <span class="filter-summary-count">${activeChips.length}</span>` : ''}</summary>
                                <div class="filter-panel-body">
                                    <div class="filters-bar dashboard-advanced-filters">
                                        ${renderFilterField('De', `<input id="saas-date-from" type="date" class="form-control" value="${filters.dateFrom}">`)}
                                        ${renderFilterField('Ate', `<input id="saas-date-to" type="date" class="form-control" value="${filters.dateTo}">`)}
                                        ${renderFilterField('Regiao', `
                                            <select id="saas-estado" class="form-control">
                                                <option value="">Todas</option>
                                                ${regions.map((region) => `<option value="${Utils.escapeHtml(region)}" ${filters.estado === region ? 'selected' : ''}>${Utils.escapeHtml(region)}</option>`).join('')}
                                            </select>
                                        `)}
                                        ${renderFilterField('Cliente', `<input id="saas-cliente" class="form-control" placeholder="Nome do cliente" value="${Utils.escapeHtml(filters.cliente)}">`)}
                                        ${renderFilterField('Tecnico', `
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
                                </div>
                            </details>
                            <button class="btn btn-outline btn-sm" type="button" onclick="Dashboard.resetSaasFilters()">
                                <i class="fas fa-rotate-left"></i> Limpar
                            </button>
                        </div>
                    </div>
                    <div class="filter-summary-row">
                        ${activeChips.length
        ? activeChips.map((chip) => `<span class="filter-summary-chip">${Utils.escapeHtml(chip)}</span>`).join('')
        : '<span class="filter-summary-empty">Visao executiva sem filtros adicionais.</span>'}
                    </div>
                </section>

                <section class="summary-inline-grid summary-inline-grid-dashboard">
                    <article class="summary-inline-card">
                        <span>Solicitacoes abertas</span>
                        <strong>${Utils.formatNumber(openCount)}</strong>
                        <small>Itens em andamento no filtro atual</small>
                    </article>
                    <article class="summary-inline-card">
                        <span>Solicitacoes no periodo</span>
                        <strong>${Utils.formatNumber(solicitations.length)}</strong>
                        <small>${Utils.escapeHtml(periodLabel)}</small>
                    </article>
                    <article class="summary-inline-card">
                        <span>Solicitacoes com custo</span>
                        <strong>${Utils.formatNumber(analysis.totalApproved || 0)}</strong>
                        <small>Base considerada nos indicadores financeiros</small>
                    </article>
                </section>

                <div class="page-kpis">
                    <div class="kpi-grid dashboard-primary-grid">
                        ${renderKpiCard({ title: 'Solicitacoes abertas', value: Utils.formatNumber(openCount), subtitle: 'Itens em andamento no filtro', icon: 'fa-folder-open', tone: 'warning' })}
                        ${renderKpiCard({ title: 'Custo total de pecas', value: Utils.formatCurrency(analysis.totalCost || 0), subtitle: `${Utils.formatNumber(analysis.totalApproved || 0)} solicitacao(oes) com custo`, icon: 'fa-sack-dollar', tone: 'primary' })}
                        ${renderKpiCard({ title: 'Ticket medio', value: Utils.formatCurrency(analysis.averageCostPerSolicitation || 0), subtitle: 'Leitura financeira media por atendimento', icon: 'fa-receipt', tone: 'success' })}
                        ${renderKpiCard({ title: 'Custo medio por tecnico', value: Utils.formatCurrency(analysis.avgCostPerTech || 0), subtitle: `${Utils.formatNumber(analysis.uniqueTechCount || 0)} tecnico(s) com custo`, icon: 'fa-user-gear', tone: 'info' })}
                    </div>
                </div>

                <div class="page-content dashboard-content-stack">
                    <section class="dashboard-focus-grid">
                        <article class="card dashboard-panel-card">
                            <div class="card-header compact-card-header">
                                <div>
                                    <h4>Tendencia de custos e volume</h4>
                                    <p class="text-muted">Grafico principal para leitura mensal de custo, solicitacoes e pecas.</p>
                                </div>
                            </div>
                            <div class="card-body">
                                ${(analysis.byMonth || []).length > 0
        ? '<div class="chart-wrapper executive-chart-wrapper"><canvas id="dashboardTrendChart"></canvas></div>'
        : renderCompactEmpty()}
                            </div>
                        </article>

                        <article class="card dashboard-panel-card">
                            <div class="card-header compact-card-header">
                                <div>
                                    <h4>Resumo executivo</h4>
                                    <p class="text-muted">Concentracao de custo, fila e status acompanhados pela operacao.</p>
                                </div>
                            </div>
                            <div class="card-body">
                                ${renderExecutiveSummary(analysis, pending.length, periodLabel)}
                            </div>
                        </article>
                    </section>

                    <section class="dashboard-secondary-grid">
                        <article class="card dashboard-panel-card">
                            <div class="card-header compact-card-header">
                                <div>
                                    <h4>Ranking de tecnicos</h4>
                                    <p class="text-muted">Prioridade para os maiores custos totais no periodo.</p>
                                </div>
                            </div>
                            <div class="card-body">
                                ${renderTopTechniciansTable(topTechnicians)}
                            </div>
                        </article>

                        <article class="card dashboard-panel-card">
                            <div class="card-header compact-card-header">
                                <div>
                                    <h4>Pecas com maior impacto</h4>
                                    <p class="text-muted">Visao concentrada das pecas que mais pesam no custo filtrado.</p>
                                </div>
                            </div>
                            <div class="card-body">
                                ${renderTopPiecesTable(topPieces)}
                            </div>
                        </article>
                    </section>

                    <section class="dashboard-secondary-grid dashboard-secondary-grid-balanced">
                        <article class="card dashboard-panel-card">
                            <div class="card-header compact-card-header">
                                <div>
                                    <h4>Alertas de custo elevado</h4>
                                    <p class="text-muted">Solicitacoes acima de 30% da media do periodo.</p>
                                </div>
                            </div>
                            <div class="card-body">
                                ${typeof this.renderHighCostAlerts === 'function' ? this.renderHighCostAlerts(analysis) : renderCompactEmpty()}
                            </div>
                        </article>

                        <article class="card dashboard-panel-card">
                            <div class="card-header compact-card-header">
                                <div>
                                    <h4>Fila de aprovacoes</h4>
                                    <p class="text-muted">Acompanhe rapidamente o que exige decisao imediata.</p>
                                </div>
                                <button class="btn btn-outline btn-sm" onclick="App.navigate('aprovacoes')">
                                    <i class="fas fa-arrow-right"></i> Abrir fila
                                </button>
                            </div>
                            <div class="card-body">
                                ${typeof this.renderApprovalsPreview === 'function' ? this.renderApprovalsPreview(pending) : renderCompactEmpty()}
                            </div>
                        </article>
                    </section>
                </div>
            </div>
        `;

        this.bindSaasFilters();
        setTimeout(() => {
            if (typeof this.initCharts === 'function' && (analysis.byMonth || []).length > 0) {
                this.initCharts(analysis);
            }
        }, 60);
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
        const defaults = getDefaultFilters();
        this.saasFilters = defaults;
        AnalyticsHelper.saveGlobalPeriodFilter({
            dateFrom: defaults.dateFrom,
            dateTo: defaults.dateTo
        });
        this.render();
    };
}

