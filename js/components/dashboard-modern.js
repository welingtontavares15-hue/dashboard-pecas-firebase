import { renderKpiCard } from './kpi-card.js';
import { renderFilterField } from './filters.js';
import { renderDataTable } from './data-table.js';
import { normalizePipelineStatus, badgeClassByPipelineStatus } from './status-badge.js';

const DASHBOARD_TEXTS = {
    title: 'Painel de Custos de Pe\u00e7as',
    subtitle: 'Acompanhe custos, volume e desempenho financeiro das solicita\u00e7\u00f5es.',
    emptyGeneral: 'Sem dados no per\u00edodo selecionado.',
    emptyRanking: 'Sem dados no per\u00edodo selecionado.',
    emptyHistory: 'Sem dados no per\u00edodo selecionado.'
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

const FLOW_STATUSES = ['PENDENTE_APROVACAO', 'APROVADO', 'EM_COMPRA', 'CONCLUIDO', 'REPROVADO'];

function getPipelineStatusLabel(status) {
    const labels = {
        PENDENTE_APROVACAO: 'Em aprovação',
        APROVADO: 'Aprovado / aguardando envio',
        EM_COMPRA: 'Em trânsito',
        CONCLUIDO: 'Finalizada',
        REPROVADO: 'Rejeitado'
    };

    return labels[status] || labels.PENDENTE_APROVACAO;
}

function getDefaultFilters() {
    // Em vez de depender exclusivamente de um período persistido (que pode conter datas fixas
    // muito antigas), normalizamos sempre um período a partir do número de dias padrão.
    // Isso garante que, ao abrir o painel, os filtros reflitam uma janela móvel em relação
    // à data atual (ex.: últimos 30 dias) e elimina qualquer data fixa pré-configurada.
    const defaultRange = AnalyticsHelper.getDefaultRangeDays ? AnalyticsHelper.getDefaultRangeDays() : 30;
    const period = AnalyticsHelper.normalizePeriod({ rangeDays: defaultRange });
    return {
        periodPreset: String(period.rangeDays || 30),
        dateFrom: period.dateFrom,
        dateTo: period.dateTo,
        estado: '',
        cliente: '',
        tecnico: '',
        fornecedor: '',
        status: ''
    };
}

function getStatusOptions() {
    return [
        { label: 'Todos', value: '' },
        ...FLOW_STATUSES.map((status) => ({
            label: getPipelineStatusLabel(status),
            value: status
        }))
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

function filterBaseSolicitations(filters) {
    const statusList = filters.status ? getMappedStatuses(filters.status) : [];

    let data = AnalyticsHelper.filterSolicitations(DataManager.getSolicitations().slice(), {
        period: {
            dateFrom: filters.dateFrom,
            dateTo: filters.dateTo
        },
        statuses: statusList,
        tecnico: filters.tecnico,
        regiao: filters.estado,
        fornecedor: filters.fornecedor || ''
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
        cliente: filters.cliente,
        fornecedor: filters.fornecedor || ''
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

/**
 * Renderiza a tabela de peças com maior custo.
 * Exibe as 5 primeiras peças ordenadas pelo custo total, mostrando
 * código/descrição, quantidade utilizada, custo total e custo médio.
 * Esta visão executiva ajuda a identificar rapidamente quais itens
 * impactam mais o orçamento sem recorrer aos relatórios analíticos.
 *
 * @param {Array} items Lista de peças contendo as propriedades `codigo`,
 * `descricao`, `quantidade`, `totalCost` e `averageUnitCost`.
 * @returns {string} HTML da tabela ou estado vazio.
 */
function renderTopPartsTable(items = []) {
    if (!items.length) {
        return renderCompactEmpty(DASHBOARD_TEXTS.emptyRanking);
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
                    </tr>
                </thead>
                <tbody>
                    ${items.map((part, index) => {
                        const label = Utils.escapeHtml(part.descricao || part.codigo || 'Sem dados');
                        const qty = Utils.formatNumber(part.quantidade || 0);
                        const total = Utils.formatCurrency(part.totalCost || 0);
                        const avg = Utils.formatCurrency(part.averageUnitCost || 0);
                        return `
                            <tr>
                                <td><strong>${index + 1}. ${label}</strong></td>
                                <td>${qty}</td>
                                <td>${total}</td>
                                <td>${avg}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function renderExecutiveSummary(analysis, topTechnician) {
    return `
        <div class="dashboard-executive-panel">
            <div class="dashboard-executive-grid">
                <div class="dashboard-summary-item primary">
                    <span>Total gasto no per\u00edodo</span>
                    <strong>${Utils.formatCurrency(analysis.totalCost || 0)}</strong>
                    <small>${Utils.formatNumber(analysis.totalApproved || 0)} solicita\u00e7\u00e3o(\u00f5es) com custo</small>
                </div>
                <div class="dashboard-summary-item primary">
                    <span>Custo m\u00e9dio por solicita\u00e7\u00e3o</span>
                    <strong>${Utils.formatCurrency(analysis.averageCostPerSolicitation || 0)}</strong>
                    <small>Base de ${Utils.formatNumber(analysis.totalApproved || 0)} solicita\u00e7\u00e3o(\u00f5es)</small>
                </div>
                <div class="dashboard-summary-item primary">
                    <span>Custo m\u00e9dio por t\u00e9cnico</span>
                    <strong>${Utils.formatCurrency(analysis.avgCostPerTech || 0)}</strong>
                    <small>${Utils.formatNumber(analysis.uniqueTechCount || 0)} t\u00e9cnico(s) com custo</small>
                </div>
                <div class="dashboard-summary-item primary">
                    <span>T\u00e9cnico com maior custo</span>
                    <strong>${Utils.escapeHtml(topTechnician?.nome || 'Sem dados')}</strong>
                    <small>${topTechnician ? Utils.formatCurrency(topTechnician.totalCost || 0) : DASHBOARD_TEXTS.emptyGeneral}</small>
                </div>
            </div>

            <div class="dashboard-flow-head">Fluxo visual da solicita\u00e7\u00e3o</div>
            <p class="dashboard-flow-support">Abertura t\u00e9cnica, avalia\u00e7\u00e3o do gestor, envio ao fornecedor, rastreio e entrega final.</p>
            <ol class="dashboard-flow-list">
                ${FLOW_STEPS.map((step, index) => `
                    <li class="dashboard-flow-item">
                        <span class="dashboard-flow-index">${index + 1}</span>
                        <span>${Utils.escapeHtml(step)}</span>
                    </li>
                `).join('')}
            </ol>

            <div class="dashboard-flow-status-head">Status acompanhados na vis\u00e3o geral</div>
            <div class="dashboard-flow-status-list">
                ${FLOW_STATUSES.map((status) => `
                    <span>${Utils.escapeHtml(getPipelineStatusLabel(status))}</span>
                `).join('')}
            </div>
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
        // Calcular as peças com maior custo para a visão executiva
        const topParts = (analysis.byPiece || []).slice(0, 5);
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
                    ${renderFilterField('Fornecedor', `
                        <select id="saas-fornecedor" class="form-control">
                            <option value="">Todos</option>
                            ${(typeof DataManager !== 'undefined' ? DataManager.getSuppliers().filter((s) => s.ativo !== false) : []).map((s) => `<option value="${Utils.escapeHtml(s.id)}" ${filters.fornecedor === s.id ? 'selected' : ''}>${Utils.escapeHtml(s.nome)}</option>`).join('')}
                        </select>
                    `)}
                </div>

                <div class="page-kpis">
                    <div class="kpi-grid dashboard-kpi-grid">
                        ${renderKpiCard({ title: 'Custo total de pe\u00e7as', value: Utils.formatCurrency(analysis.totalCost || 0), subtitle: 'Somat\u00f3rio do per\u00edodo filtrado', icon: 'fa-sack-dollar', tone: 'primary' })}
                        ${renderKpiCard({ title: 'Solicita\u00e7\u00f5es com custo', value: Utils.formatNumber(analysis.totalApproved || 0), subtitle: 'Chamados com custo no per\u00edodo', icon: 'fa-clipboard-list', tone: 'info' })}
                        ${renderKpiCard({ title: 'Custo m\u00e9dio por solicita\u00e7\u00e3o', value: Utils.formatCurrency(analysis.averageCostPerSolicitation || 0), subtitle: `${Utils.formatNumber(analysis.totalApproved || 0)} solicita\u00e7\u00f5es com custo`, icon: 'fa-receipt', tone: 'success' })}
                        ${renderKpiCard({ title: 'Custo m\u00e9dio por t\u00e9cnico', value: Utils.formatCurrency(analysis.avgCostPerTech || 0), subtitle: `${Utils.formatNumber(analysis.uniqueTechCount || 0)} t\u00e9cnicos no per\u00edodo`, icon: 'fa-user-gear', tone: 'info' })}
                        ${renderKpiCard({ title: 'T\u00e9cnico com maior custo', value: Utils.escapeHtml(topTechnician?.nome || 'Sem dados'), subtitle: topTechnician ? Utils.formatCurrency(topTechnician.totalCost || 0) : DASHBOARD_TEXTS.emptyGeneral, icon: 'fa-medal', tone: 'warning' })}
                        
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
                                    <h4>Top 5 pe\u00e7as com maior custo</h4>
                                    <p class="text-muted">Pe\u00e7a, quantidade, custo total e custo m\u00e9dio.</p>
                                </div>
                            </div>
                            <div class="card-body">
                                ${renderTopPartsTable(topParts)}
                            </div>
                        </article>
                    </section>

                    <section class="dashboard-insight-grid dashboard-history-grid">
                        <article class="card dashboard-panel-card">
                            <div class="card-header dashboard-panel-header">
                                <div>
                                    <h4>Hist\u00f3rico recente de maior valor</h4>
                                    <p class="text-muted">Data, n\u00famero, cliente, t\u00e9cnico, pe\u00e7a, valor e status atual do fluxo.</p>
                                </div>
                            </div>
                            <div class="card-body">
                                ${highValueSolicitations.length === 0
        ? renderCompactEmpty(DASHBOARD_TEXTS.emptyGeneral)
        : renderDataTable({
            headers: ['Data', 'N\u00famero da solicita\u00e7\u00e3o', 'Cliente', 'T\u00e9cnico', 'Pe\u00e7a', 'Valor', 'Status'],
            rows: renderHistoryRows(highValueSolicitations)
        })}
                            </div>
                        </article>
                    </section>
                </div>
            </div>
        `;

        this.bindSaasFilters();
    };

    window.Dashboard.bindSaasFilters = function bindSaasFilters() {
        const apply = () => {
            // Read current selections from the form controls
            let periodPreset = document.getElementById('saas-period')?.value || '30';
            const dateFromInput = document.getElementById('saas-date-from')?.value || this.saasFilters.dateFrom;
            const dateToInput = document.getElementById('saas-date-to')?.value || this.saasFilters.dateTo;

            let dateFrom = dateFromInput;
            let dateTo = dateToInput;

            // When the user selects a preset (e.g., 7/30/90 days), the date inputs should reflect
            // that range. However, if the user manually adjusts either date field while a preset
            // other than "custom" is selected, the preset should automatically switch to
            // "custom" so that the chosen dates are respected. We detect this by comparing the
            // date inputs with the expected range for the selected preset. If they differ, we
            // force the preset to custom and use the manual dates.
            if (periodPreset !== 'custom') {
                const expectedPeriod = AnalyticsHelper.setGlobalPeriodByDays(Number(periodPreset) || 30);
                const expectedFrom = expectedPeriod.dateFrom;
                const expectedTo = expectedPeriod.dateTo;
                const userChanged = (dateFromInput && dateFromInput !== expectedFrom) || (dateToInput && dateToInput !== expectedTo);
                if (userChanged) {
                    periodPreset = 'custom';
                }
            }

            // If a preset (not custom) is selected after the above adjustment, override the date
            // inputs with the computed range; otherwise respect the manual values.
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
                fornecedor: document.getElementById('saas-fornecedor')?.value || '',
                status: document.getElementById('saas-status')?.value || ''
            };

            // Persist the chosen period globally so other modules stay in sync
            AnalyticsHelper.saveGlobalPeriodFilter({
                dateFrom: this.saasFilters.dateFrom,
                dateTo: this.saasFilters.dateTo
            });

            this.render();
        };

        ['saas-period', 'saas-date-from', 'saas-date-to', 'saas-estado', 'saas-tecnico', 'saas-fornecedor', 'saas-status'].forEach((id) => {
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


