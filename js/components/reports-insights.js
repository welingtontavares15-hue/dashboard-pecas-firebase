/**
 * Relatórios — camada de apresentação "Insights" (v2).
 *
 * Reorganiza a aba Relatórios para leitura executiva sem repetir informação:
 * - Indicadores: 4 cartões voltados à decisão (custo aprovado com comparação ao
 *   período anterior, custo médio, volume e concentração na peça de maior impacto).
 * - Visão Geral: resumo (evolução mensal com média, solicitações por status e
 *   top 5 de peças/técnicos com atalho para a análise completa). Não repete as
 *   tabelas completas das outras sub-abas.
 * - Custo por Peça: curva ABC (Pareto) + tabela com participação em barra.
 * - Custo por Técnico: custo médio por solicitação comparado à média geral
 *   (o custo total já aparece na tabela, sem gráfico duplicado).
 * - Custo por Mês: custo aprovado (barras), volume (linha) e média mensal.
 * - Filtros: período e status sempre visíveis; os demais em "Mais filtros".
 *
 * Somente apresentação: todos os números vêm de Relatorios.buildCostAnalysis(),
 * getFilteredSolicitations() e dos exportadores já existentes. Nenhum cálculo,
 * filtro ou integração com o Firebase foi alterado.
 */

const PALETTE = {
    primary: '#2fd4c4',
    primarySoft: 'rgba(47, 212, 196, .82)',
    primaryFill: 'rgba(47, 212, 196, .16)',
    accent: '#16df94',
    accentSoft: 'rgba(22, 223, 148, .82)',
    average: '#ffc21c',
    text: '#cfe6e5',
    muted: '#9fc4c2',
    grid: 'rgba(255, 255, 255, .08)',
    surface: '#053c41'
};

const STATUS_SERIES = [
    { key: 'pendente', label: 'Em aprovação', color: '#ffc21c', statuses: ['pendente', 'rascunho', 'enviada'] },
    { key: 'aprovada', label: 'Aguardando envio', color: '#5b95ff', statuses: ['aprovada'] },
    { key: 'em-transito', label: 'Em trânsito', color: '#15a8ff', statuses: ['em-transito'] },
    { key: 'finalizada', label: 'Finalizadas', color: '#16df94', statuses: ['finalizada', 'entregue', 'historico-manual'] },
    { key: 'rejeitada', label: 'Rejeitadas', color: '#ff4a54', statuses: ['rejeitada'] }
];

const FILTERS_EXPANDED_KEY = 'wwm.reports.filtersExpanded';
const TOP_OVERVIEW = 5;
const PARETO_LIMIT = 15;

const esc = (value) => (window.Utils?.escapeHtml ? Utils.escapeHtml(String(value ?? '')) : String(value ?? ''));
const money = (value) => Utils.formatCurrency(Number(value) || 0);
const num = (value, digits) => Utils.formatNumber(Number(value) || 0, digits);
const pct = (value) => `${Utils.formatNumber(Number(value) || 0, 1)}%`;
const byCostDesc = (rows = []) => [...rows].sort((a, b) => (Number(b?.totalCost) || 0) - (Number(a?.totalCost) || 0));

function shortLabel(text, max = 28) {
    const value = String(text || '');
    return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function compactCurrency(value) {
    const n = Number(value) || 0;
    if (Math.abs(n) >= 1e6) {
        return `R$ ${(n / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`;
    }
    if (Math.abs(n) >= 1e3) {
        return `R$ ${(n / 1e3).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil`;
    }
    return money(n);
}

function monthCountFor(relatorios) {
    let from = relatorios?.filters?.dateFrom;
    let to = relatorios?.filters?.dateTo;
    try {
        const state = relatorios.buildFilterState?.();
        if (state?.period) {
            from = state.period.dateFrom || from;
            to = state.period.dateTo || to;
        }
    } catch (_error) { /* usa os filtros diretos */ }
    const start = Utils.parseAsLocalDate(from);
    const end = Utils.parseAsLocalDate(to);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return 1;
    }
    const [a, b] = start <= end ? [start, end] : [end, start];
    return Math.max(((b.getFullYear() - a.getFullYear()) * 12) + (b.getMonth() - a.getMonth()) + 1, 1);
}

function statusBreakdown(solicitations = []) {
    const normalize = (status) => (typeof DataManager?.normalizeWorkflowStatus === 'function'
        ? DataManager.normalizeWorkflowStatus(status)
        : String(status || '').toLowerCase());
    const counts = STATUS_SERIES.map((series) => ({ ...series, value: 0 }));
    solicitations.forEach((sol) => {
        const status = normalize(sol?.status);
        const target = counts.find((series) => series.statuses.includes(status));
        if (target) {
            target.value += 1;
        }
    });
    return counts;
}

function emptyState(message = 'Sem dados no período selecionado.', hint = 'Ajuste os filtros para continuar.') {
    return `<div class="ri-empty"><i class="fas fa-chart-simple" aria-hidden="true"></i><strong>${esc(message)}</strong><span>${esc(hint)}</span></div>`;
}

function card({ id, title, subtitle, actions = '', body, wide = false, extraClass = '' }) {
    return `
        <article class="ri-card ${wide ? 'ri-card--wide' : ''} ${extraClass}" ${id ? `id="${id}"` : ''}>
            <header class="ri-card-head">
                <div>
                    <h3>${esc(title)}</h3>
                    ${subtitle ? `<p>${subtitle}</p>` : ''}
                </div>
                ${actions ? `<div class="ri-card-actions">${actions}</div>` : ''}
            </header>
            <div class="ri-card-body">${body}</div>
        </article>`;
}

function chartBox(id, size = 'md', label = '') {
    return `<div class="ri-chart ri-chart--${size}"><canvas id="${id}" role="img" aria-label="${esc(label)}"></canvas></div>`;
}

function exportButton(handler, label = 'Exportar') {
    return `<button class="btn btn-outline btn-sm" onclick="${handler}"><i class="fas fa-file-excel" aria-hidden="true"></i> ${esc(label)}</button>`;
}

function linkButton(report, label) {
    return `<button class="ri-link" onclick="Relatorios.switchReport('${report}')">${esc(label)} <i class="fas fa-arrow-right" aria-hidden="true"></i></button>`;
}

function shareBar(share) {
    const width = Math.max(0, Math.min(100, Number(share) || 0));
    return `<div class="ri-share"><span class="ri-share-track"><span class="ri-share-fill" style="width:${width.toFixed(1)}%"></span></span><span class="ri-share-value">${pct(share)}</span></div>`;
}

function variationBadge(variation, { first = false, invert = true } = {}) {
    if (first || !Number.isFinite(variation)) {
        return '<span class="ri-delta ri-delta--neutral">—</span>';
    }
    if (Math.abs(variation) < 0.05) {
        return '<span class="ri-delta ri-delta--neutral">0,0%</span>';
    }
    const up = variation > 0;
    // Para custo, subir é ponto de atenção (invert=true) e cair é favorável.
    const tone = up === invert ? 'warn' : 'ok';
    return `<span class="ri-delta ri-delta--${tone}"><i class="fas fa-arrow-${up ? 'up' : 'down'}" aria-hidden="true"></i>${Utils.formatNumber(Math.abs(variation), 1)}%</span>`;
}

/* ------------------------------------------------------------------ */
/* Indicadores                                                         */
/* ------------------------------------------------------------------ */

function renderExecutiveSummary(relatorios) {
    const analysis = relatorios.buildCostAnalysis();
    const totalCost = Number(analysis.totalCost) || 0;
    const previous = Number(analysis.previousTotalCost) || 0;
    const parts = byCostDesc(analysis.byPiece || []);
    const topPart = parts[0];
    const topShare = topPart && totalCost > 0 ? ((Number(topPart.totalCost) || 0) / totalCost) * 100 : 0;
    const months = monthCountFor(relatorios);
    const avgMonthly = months > 0 ? totalCost / months : 0;
    const requests = Number(analysis.totalRequests) || relatorios.getFilteredSolicitations().length;
    const pending = Number(analysis.pendingCount) || 0;

    const comparison = previous > 0
        ? `${variationBadge(Number(analysis.costVariation))} <span>vs. período anterior (${compactCurrency(previous)})</span>`
        : `<span>Média de ${compactCurrency(avgMonthly)} por mês</span>`;

    const cards = [
        {
            tone: 'primary', icon: 'fa-sack-dollar', title: 'Custo aprovado',
            value: money(totalCost), note: comparison,
            hint: 'Soma das solicitações aprovadas, em trânsito ou finalizadas no período, pela data de aprovação.'
        },
        {
            tone: 'success', icon: 'fa-receipt', title: 'Custo médio por solicitação',
            value: money(analysis.costPerAttendance),
            note: `<span>${num(analysis.totalCalls)} ${Number(analysis.totalCalls) === 1 ? 'solicitação com custo' : 'solicitações com custo'}</span>`
        },
        {
            tone: 'info', icon: 'fa-clipboard-list', title: 'Solicitações no período',
            value: num(requests),
            note: `<span>${num(pending)} ${pending === 1 ? 'aguardando' : 'aguardando'} aprovação</span>`
        },
        {
            tone: 'warning', icon: 'fa-bullseye', title: 'Peça de maior impacto',
            value: topPart ? pct(topShare) : '—',
            note: topPart ? `<span title="${esc(topPart.descricao || '')}">${esc(topPart.codigo || '')} · ${esc(shortLabel(topPart.descricao || 'Sem descrição', 26))}</span>` : '<span>Sem custo no período</span>',
            hint: 'Participação da peça mais cara no custo aprovado do período.'
        }
    ];

    return `
        <div class="reports-summary-grid ri-kpis">
            ${cards.map((item) => `
                <article class="report-summary-card ri-kpi" ${item.hint ? `title="${esc(item.hint)}"` : ''}>
                    <span class="report-summary-icon ${item.tone}"><i class="fas ${item.icon}" aria-hidden="true"></i></span>
                    <div>
                        <h4>${esc(item.title)}</h4>
                        <strong>${item.value}</strong>
                        <small class="ri-kpi-note">${item.note}</small>
                    </div>
                </article>`).join('')}
        </div>`;
}

/* ------------------------------------------------------------------ */
/* Sub-abas                                                            */
/* ------------------------------------------------------------------ */

function renderOverview(relatorios) {
    const analysis = relatorios.buildCostAnalysis();
    const solicitations = relatorios.getFilteredSolicitations();
    if (!(Number(analysis.totalCost) > 0) && solicitations.length === 0) {
        return emptyState();
    }

    const parts = byCostDesc(analysis.byPiece || []);
    const techs = byCostDesc(analysis.byTechnician || []);
    const statuses = statusBreakdown(solicitations);
    const total = statuses.reduce((sum, item) => sum + item.value, 0) || 1;

    const legend = `
        <ul class="ri-legend">
            ${statuses.map((item) => `
                <li>
                    <span class="ri-legend-dot" style="background:${item.color}"></span>
                    <span class="ri-legend-label">${esc(item.label)}</span>
                    <span class="ri-legend-value">${num(item.value)} <em>${pct((item.value / total) * 100)}</em></span>
                </li>`).join('')}
        </ul>`;

    return `
        <section class="ri-grid ri-grid--overview">
            ${card({
        title: 'Custo aprovado por mês',
        subtitle: 'Barras: custo do mês · Linha tracejada: média mensal do período',
        actions: exportButton('Relatorios.exportCustos()'),
        body: chartBox('riMonthlyChart', 'lg', 'Custo aprovado por mês'),
        extraClass: 'ri-card--trend'
    })}
            ${card({
        title: 'Solicitações por status',
        subtitle: `${num(solicitations.length)} solicitações no período`,
        body: `<div class="ri-status">${chartBox('riStatusChart', 'donut', 'Solicitações por status')}${legend}</div>`,
        extraClass: 'ri-card--status'
    })}
            ${card({
        title: `Top ${TOP_OVERVIEW} peças por custo`,
        subtitle: 'Participação no custo aprovado do período',
        actions: linkButton('pecas', 'Curva ABC completa'),
        body: parts.length ? chartBox('riTopPartsChart', 'rank', 'Peças com maior custo') : emptyState('Nenhuma peça com custo no período.')
    })}
            ${card({
        title: `Top ${TOP_OVERVIEW} técnicos por custo`,
        subtitle: 'Custo aprovado das solicitações de cada técnico',
        actions: linkButton('tecnicos', 'Análise por técnico'),
        body: techs.length ? chartBox('riTopTechChart', 'rank', 'Técnicos com maior custo') : emptyState('Nenhum técnico com custo no período.')
    })}
        </section>`;
}

function renderParts(relatorios) {
    const analysis = relatorios.buildCostAnalysis();
    const parts = byCostDesc(analysis.byPiece || []);
    const totalCost = Number(analysis.totalCost) || 0;
    if (!parts.length) {
        return card({ title: 'Custo por peça', body: emptyState('Nenhuma peça com custo no período.'), actions: exportButton('Relatorios.exportPecas()') });
    }

    let cumulative = 0;
    const counts = { A: 0, B: 0, C: 0 };
    const rows = parts.map((part, index) => {
        const cost = Number(part.totalCost) || 0;
        const share = totalCost > 0 ? (cost / totalCost) * 100 : 0;
        const before = cumulative;
        cumulative += share;
        const klass = before < 80 ? 'A' : (before < 95 ? 'B' : 'C');
        counts[klass] += 1;
        return `
            <tr>
                <td class="ri-rank">${index + 1}</td>
                <td><strong>${esc(part.codigo || '-')}</strong><div class="ri-sub">${esc(part.descricao || 'Sem descrição')}</div></td>
                <td><span class="ri-abc ri-abc--${klass}">${klass}</span></td>
                <td class="ri-num">${num(part.quantidade)}</td>
                <td class="ri-num">${money(part.averageUnitCost)}</td>
                <td class="ri-num"><strong>${money(cost)}</strong></td>
                <td>${shareBar(share)}</td>
                <td class="ri-num">${pct(cumulative)}</td>
            </tr>`;
    }).join('');

    const summary = `
        <div class="ri-chips">
            <span class="ri-chip ri-chip--A"><b>A</b> ${num(counts.A)} ${counts.A === 1 ? 'peça' : 'peças'} · ~80% do custo</span>
            <span class="ri-chip ri-chip--B"><b>B</b> ${num(counts.B)} · próximos 15%</span>
            <span class="ri-chip ri-chip--C"><b>C</b> ${num(counts.C)} · últimos 5%</span>
        </div>`;

    return `
        <section class="ri-grid">
            ${card({
        title: 'Curva ABC de peças',
        subtitle: `Barras: custo por peça · Linha: participação acumulada${parts.length > PARETO_LIMIT ? ` · ${PARETO_LIMIT} maiores de ${num(parts.length)}` : ''}`,
        actions: exportButton('Relatorios.exportPecas()'),
        body: `${summary}${chartBox('riParetoChart', 'lg', 'Curva ABC de peças')}`,
        wide: true
    })}
            ${card({
        title: 'Detalhamento por peça',
        subtitle: 'Classe A concentra o maior impacto: prioridade para negociação e estoque',
        body: `
                    <div class="table-container dashboard-compact-table ri-table">
                        <table class="table">
                            <thead><tr><th>#</th><th>Peça</th><th>Classe</th><th>Qtd.</th><th>Custo médio</th><th>Custo total</th><th>Participação</th><th>Acumulado</th></tr></thead>
                            <tbody>${rows}</tbody>
                        </table>
                    </div>`,
        wide: true
    })}
        </section>`;
}

function renderTechnicians(relatorios) {
    const analysis = relatorios.buildCostAnalysis();
    const techs = byCostDesc(analysis.byTechnician || []);
    const totalCost = techs.reduce((sum, tech) => sum + (Number(tech.totalCost) || 0), 0);
    const overallAvg = Number(analysis.costPerAttendance) || 0;
    if (!techs.length) {
        return card({ title: 'Custo por técnico', body: emptyState('Nenhum técnico com custo no período.'), actions: exportButton('Relatorios.exportTecnicos()') });
    }

    const rows = techs.map((tech, index) => {
        const cost = Number(tech.totalCost) || 0;
        const share = totalCost > 0 ? (cost / totalCost) * 100 : 0;
        const avg = Number(tech.costPerCall) || 0;
        const vsAvg = overallAvg > 0 ? ((avg - overallAvg) / overallAvg) * 100 : NaN;
        return `
            <tr>
                <td class="ri-rank">${index + 1}</td>
                <td><strong>${esc(tech.nome)}</strong>${tech.regiao ? `<div class="ri-sub">${esc(tech.regiao)}</div>` : ''}</td>
                <td class="ri-num">${num(tech.calls)}</td>
                <td class="ri-num"><strong>${money(cost)}</strong></td>
                <td>${shareBar(share)}</td>
                <td class="ri-num">${money(avg)}</td>
                <td class="ri-num">${variationBadge(vsAvg)}</td>
            </tr>`;
    }).join('');

    return `
        <section class="ri-grid">
            ${card({
        title: 'Custo médio por solicitação',
        subtitle: `Linha tracejada: média geral (${money(overallAvg)}) · acima dela indica pedidos mais caros`,
        actions: exportButton('Relatorios.exportTecnicos()'),
        body: chartBox('riTechAvgChart', 'rank', 'Custo médio por solicitação por técnico'),
        wide: true
    })}
            ${card({
        title: 'Ranking de custo por técnico',
        subtitle: 'Ordenado pelo custo aprovado total',
        body: `
                    <div class="table-container dashboard-compact-table ri-table">
                        <table class="table">
                            <thead><tr><th>#</th><th>Técnico</th><th>Solicitações</th><th>Custo total</th><th>Participação</th><th>Custo médio</th><th>vs. média geral</th></tr></thead>
                            <tbody>${rows}</tbody>
                        </table>
                    </div>`,
        wide: true
    })}
        </section>`;
}

function renderMonths(relatorios) {
    const analysis = relatorios.buildCostAnalysis();
    const months = Array.isArray(analysis.byMonth) ? analysis.byMonth : [];
    const totalCost = Number(analysis.totalCost) || 0;
    const monthCount = monthCountFor(relatorios);
    const avgMonthly = monthCount > 0 ? totalCost / monthCount : 0;
    if (!months.length) {
        return card({ title: 'Custo por mês', body: emptyState(), actions: exportButton('Relatorios.exportCustos()') });
    }

    const peak = months.reduce((best, month) => ((Number(month.totalCost) || 0) > (Number(best?.totalCost) || 0) ? month : best), null);
    const rows = months.map((month, index) => {
        const value = Number(month.totalCost) || 0;
        const prev = Number(months[index - 1]?.totalCost) || 0;
        const variation = index === 0 ? NaN : (prev > 0 ? ((value - prev) / prev) * 100 : (value > 0 ? NaN : 0));
        const avgReq = Number(month.requestCount) > 0 ? value / Number(month.requestCount) : 0;
        const vsAvg = avgMonthly > 0 ? ((value - avgMonthly) / avgMonthly) * 100 : NaN;
        return `
            <tr class="${peak && month.key === peak.key ? 'ri-row--peak' : ''}">
                <td><strong>${esc(month.label)}</strong>${peak && month.key === peak.key && value > 0 ? ' <span class="ri-tag">pico</span>' : ''}</td>
                <td class="ri-num">${num(month.requestCount)}</td>
                <td class="ri-num"><strong>${money(value)}</strong></td>
                <td class="ri-num">${money(avgReq)}</td>
                <td class="ri-num">${variationBadge(variation, { first: index === 0 || (prev === 0 && value > 0) })}</td>
                <td class="ri-num">${variationBadge(vsAvg)}</td>
            </tr>`;
    }).join('');

    return `
        <section class="ri-grid">
            ${card({
        title: 'Custo aprovado e volume por mês',
        subtitle: `Barras: custo · Linha: solicitações no mês · Tracejado: média mensal (${money(avgMonthly)} em ${num(monthCount)} ${monthCount === 1 ? 'mês' : 'meses'})`,
        actions: exportButton('Relatorios.exportCustos()'),
        body: chartBox('riMonthsChart', 'lg', 'Custo aprovado e volume por mês'),
        wide: true
    })}
            ${card({
        title: 'Comparativo mensal',
        subtitle: 'Variação contra o mês anterior e contra a média do período',
        body: `
                    <div class="table-container dashboard-compact-table ri-table">
                        <table class="table">
                            <thead><tr><th>Mês</th><th>Solicitações</th><th>Custo aprovado</th><th>Custo médio</th><th>vs. mês anterior</th><th>vs. média</th></tr></thead>
                            <tbody>${rows}</tbody>
                        </table>
                    </div>`,
        wide: true
    })}
        </section>`;
}

/* ------------------------------------------------------------------ */
/* Gráficos                                                            */
/* ------------------------------------------------------------------ */

const baseScales = {
    x: { grid: { display: false }, border: { display: false }, ticks: { color: PALETTE.text, font: { family: 'Inter', size: 12 } } },
    y: { beginAtZero: true, grid: { color: PALETTE.grid }, border: { display: false }, ticks: { color: PALETTE.text, font: { family: 'Inter', size: 12 }, callback: (value) => compactCurrency(value) } }
};

const tooltip = {
    backgroundColor: 'rgba(2, 30, 33, .96)',
    borderColor: 'rgba(137, 203, 201, .3)',
    borderWidth: 1,
    titleColor: '#ffffff',
    bodyColor: PALETTE.text,
    padding: 10,
    cornerRadius: 8,
    titleFont: { family: 'Inter', weight: '700' },
    bodyFont: { family: 'Inter' }
};

// Escreve o valor no fim de cada barra horizontal (leitura sem depender do tooltip).
const barValueLabels = {
    id: 'riBarValueLabels',
    afterDatasetsDraw(chart, _args, options) {
        const { ctx } = chart;
        const meta = chart.getDatasetMeta(0);
        const data = chart.data.datasets[0]?.data || [];
        const formatter = options?.formatter || ((value) => compactCurrency(value));
        ctx.save();
        ctx.font = '600 12px Inter, Segoe UI, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textBaseline = 'middle';
        meta.data.forEach((bar, index) => {
            const label = formatter(data[index], index);
            const width = ctx.measureText(label).width;
            const inside = bar.x - chart.chartArea.left > width + 18;
            ctx.textAlign = inside ? 'right' : 'left';
            ctx.fillStyle = inside ? '#021e21' : '#ffffff';
            ctx.fillText(label, inside ? bar.x - 8 : bar.x + 8, bar.y);
        });
        ctx.restore();
    }
};

const donutCenter = {
    id: 'riDonutCenter',
    afterDraw(chart, _args, options) {
        const { ctx, chartArea } = chart;
        if (!chartArea) {
            return;
        }
        const x = (chartArea.left + chartArea.right) / 2;
        const y = (chartArea.top + chartArea.bottom) / 2;
        ctx.save();
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffffff';
        ctx.font = '800 26px Inter, Segoe UI, sans-serif';
        ctx.fillText(options?.value ?? '', x, y + 2);
        ctx.fillStyle = PALETTE.muted;
        ctx.font = '600 12px Inter, Segoe UI, sans-serif';
        ctx.fillText(options?.label ?? '', x, y + 22);
        ctx.restore();
    }
};

function setRankHeight(canvas, rows) {
    const box = canvas?.parentElement;
    if (box) {
        box.style.height = `${Math.max(180, rows * 46 + 36)}px`;
    }
}

function rankingChart(relatorios, id, labels, values, { color = PALETTE.primarySoft, formatter, averageLine, fullLabels } = {}) {
    const canvas = document.getElementById(id);
    if (!canvas) {
        return;
    }
    setRankHeight(canvas, labels.length);
    const datasets = [{ data: values, backgroundColor: color, hoverBackgroundColor: PALETTE.primary, borderRadius: 6, borderSkipped: false, barThickness: 22 }];
    const plugins = [barValueLabels];
    if (Number.isFinite(averageLine) && averageLine > 0) {
        plugins.push({
            id: 'riAvgLine',
            afterDatasetsDraw(chart) {
                const { ctx, chartArea, scales } = chart;
                const x = scales.x.getPixelForValue(averageLine);
                ctx.save();
                ctx.strokeStyle = PALETTE.average;
                ctx.setLineDash([5, 4]);
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(x, chartArea.top - 4);
                ctx.lineTo(x, chartArea.bottom);
                ctx.stroke();
                ctx.restore();
            }
        });
    }
    relatorios.charts[id] = new Chart(canvas, {
        type: 'bar',
        data: { labels, datasets },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 250 },
            layout: { padding: { right: 72 } },
            plugins: {
                legend: { display: false },
                tooltip: { ...tooltip, callbacks: { title: (items) => (fullLabels ? fullLabels[items[0].dataIndex] : items[0].label), label: (ctx) => ` ${money(ctx.parsed.x)}` } },
                riBarValueLabels: { formatter }
            },
            scales: {
                x: { ...baseScales.y, grid: { color: PALETTE.grid }, ticks: { ...baseScales.y.ticks, maxTicksLimit: 5 } },
                y: { grid: { display: false }, border: { display: false }, ticks: { color: PALETTE.text, font: { family: 'Inter', size: 12, weight: '600' } } }
            }
        },
        plugins
    });
}

function drawCharts(relatorios) {
    const analysis = relatorios.buildCostAnalysis();
    const months = Array.isArray(analysis.byMonth) ? analysis.byMonth : [];
    const totalCost = Number(analysis.totalCost) || 0;
    const monthCount = monthCountFor(relatorios);
    const avgMonthly = monthCount > 0 ? totalCost / monthCount : 0;
    const parts = byCostDesc(analysis.byPiece || []);
    const techs = byCostDesc(analysis.byTechnician || []);

    const monthly = document.getElementById('riMonthlyChart');
    if (monthly) {
        relatorios.charts.riMonthlyChart = new Chart(monthly, {
            type: 'bar',
            data: {
                labels: months.map((m) => m.label),
                datasets: [
                    { type: 'bar', label: 'Custo aprovado', data: months.map((m) => Number(m.totalCost) || 0), backgroundColor: PALETTE.primarySoft, hoverBackgroundColor: PALETTE.primary, borderRadius: 6, maxBarThickness: 44, order: 2 },
                    { type: 'line', label: 'Média mensal', data: months.map(() => avgMonthly), borderColor: PALETTE.average, borderDash: [6, 5], borderWidth: 2, pointRadius: 0, pointHoverRadius: 0, fill: false, order: 1 }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false, animation: { duration: 250 },
                interaction: { mode: 'index', intersect: false },
                plugins: { legend: { display: false }, tooltip: { ...tooltip, callbacks: { label: (ctx) => ` ${ctx.dataset.label}: ${money(ctx.parsed.y)}` } } },
                scales: baseScales
            }
        });
    }

    const status = document.getElementById('riStatusChart');
    if (status) {
        const breakdown = statusBreakdown(relatorios.getFilteredSolicitations()).filter((item) => item.value > 0);
        const total = breakdown.reduce((sum, item) => sum + item.value, 0);
        relatorios.charts.riStatusChart = new Chart(status, {
            type: 'doughnut',
            data: { labels: breakdown.map((i) => i.label), datasets: [{ data: breakdown.map((i) => i.value), backgroundColor: breakdown.map((i) => i.color), borderColor: PALETTE.surface, borderWidth: 3, hoverOffset: 6 }] },
            options: {
                responsive: true, maintainAspectRatio: false, cutout: '70%', animation: { duration: 250 },
                plugins: { legend: { display: false }, tooltip: { ...tooltip, callbacks: { label: (ctx) => ` ${ctx.label}: ${num(ctx.parsed)} (${pct(total ? (ctx.parsed / total) * 100 : 0)})` } }, riDonutCenter: { value: num(total), label: 'solicitações' } }
            },
            plugins: [donutCenter]
        });
    }

    const topParts = parts.slice(0, TOP_OVERVIEW);
    rankingChart(relatorios, 'riTopPartsChart',
        topParts.map((p) => shortLabel(`${p.codigo || ''} · ${p.descricao || ''}`, 30)),
        topParts.map((p) => Number(p.totalCost) || 0),
        { fullLabels: topParts.map((p) => `${p.codigo || ''} — ${p.descricao || ''}`), formatter: (value) => `${compactCurrency(value)} · ${pct(totalCost ? (value / totalCost) * 100 : 0)}` });

    const topTechs = techs.slice(0, TOP_OVERVIEW);
    const techTotal = techs.reduce((sum, t) => sum + (Number(t.totalCost) || 0), 0);
    rankingChart(relatorios, 'riTopTechChart',
        topTechs.map((t) => shortLabel(t.nome, 24)),
        topTechs.map((t) => Number(t.totalCost) || 0),
        { color: PALETTE.accentSoft, fullLabels: topTechs.map((t) => t.nome), formatter: (value) => `${compactCurrency(value)} · ${pct(techTotal ? (value / techTotal) * 100 : 0)}` });

    const byAvg = [...techs].sort((a, b) => (Number(b.costPerCall) || 0) - (Number(a.costPerCall) || 0));
    rankingChart(relatorios, 'riTechAvgChart',
        byAvg.map((t) => shortLabel(t.nome, 24)),
        byAvg.map((t) => Number(t.costPerCall) || 0),
        { color: PALETTE.accentSoft, fullLabels: byAvg.map((t) => `${t.nome} · ${num(t.calls)} solicitações`), averageLine: Number(analysis.costPerAttendance) || 0, formatter: (value) => compactCurrency(value) });

    const pareto = document.getElementById('riParetoChart');
    if (pareto && parts.length) {
        const slice = parts.slice(0, PARETO_LIMIT);
        let running = 0;
        const cumulative = slice.map((p) => {
            running += totalCost > 0 ? ((Number(p.totalCost) || 0) / totalCost) * 100 : 0;
            return Math.min(100, running);
        });
        relatorios.charts.riParetoChart = new Chart(pareto, {
            type: 'bar',
            data: {
                labels: slice.map((p) => p.codigo || shortLabel(p.descricao, 12)),
                datasets: [
                    { type: 'bar', label: 'Custo', data: slice.map((p) => Number(p.totalCost) || 0), backgroundColor: cumulative.map((c, i) => ((i === 0 ? 0 : cumulative[i - 1]) < 80 ? PALETTE.primarySoft : 'rgba(47, 212, 196, .38)')), borderRadius: 6, maxBarThickness: 42, yAxisID: 'y', order: 2 },
                    { type: 'line', label: 'Acumulado', data: cumulative, borderColor: PALETTE.average, backgroundColor: PALETTE.average, borderWidth: 2, pointRadius: 3, tension: 0.2, yAxisID: 'y1', order: 1 }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false, animation: { duration: 250 },
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: { display: false },
                    tooltip: { ...tooltip, callbacks: { title: (items) => {
                        const p = slice[items[0].dataIndex]; return `${p.codigo || ''} — ${p.descricao || ''}`; 
                    }, label: (ctx) => (ctx.dataset.yAxisID === 'y1' ? ` Acumulado: ${pct(ctx.parsed.y)}` : ` Custo: ${money(ctx.parsed.y)}`) } }
                },
                scales: {
                    x: baseScales.x,
                    y: baseScales.y,
                    y1: { position: 'right', min: 0, max: 100, grid: { display: false }, border: { display: false }, ticks: { color: PALETTE.average, callback: (v) => `${v}%`, stepSize: 20 } }
                }
            },
            plugins: [{
                id: 'riPareto80',
                afterDatasetsDraw(chart) {
                    const { ctx, chartArea, scales } = chart;
                    const y = scales.y1.getPixelForValue(80);
                    ctx.save();
                    ctx.strokeStyle = 'rgba(255, 194, 28, .45)';
                    ctx.setLineDash([4, 4]);
                    ctx.beginPath(); ctx.moveTo(chartArea.left, y); ctx.lineTo(chartArea.right, y); ctx.stroke();
                    ctx.fillStyle = PALETTE.average; ctx.font = '600 11px Inter, sans-serif'; ctx.textAlign = 'right';
                    ctx.fillText('80%', chartArea.right - 4, y - 6);
                    ctx.restore();
                }
            }]
        });
    }

    const monthsChart = document.getElementById('riMonthsChart');
    if (monthsChart && months.length) {
        relatorios.charts.riMonthsChart = new Chart(monthsChart, {
            type: 'bar',
            data: {
                labels: months.map((m) => m.label),
                datasets: [
                    { type: 'bar', label: 'Custo aprovado', data: months.map((m) => Number(m.totalCost) || 0), backgroundColor: PALETTE.primarySoft, hoverBackgroundColor: PALETTE.primary, borderRadius: 6, maxBarThickness: 48, yAxisID: 'y', order: 3 },
                    { type: 'line', label: 'Solicitações', data: months.map((m) => Number(m.requestCount) || 0), borderColor: PALETTE.accent, backgroundColor: PALETTE.accent, borderWidth: 2, pointRadius: 3, tension: 0.25, yAxisID: 'y1', order: 1 },
                    { type: 'line', label: 'Média mensal', data: months.map(() => avgMonthly), borderColor: PALETTE.average, borderDash: [6, 5], borderWidth: 2, pointRadius: 0, yAxisID: 'y', order: 2 }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false, animation: { duration: 250 },
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: { display: true, position: 'bottom', labels: { color: PALETTE.text, usePointStyle: true, boxWidth: 8, padding: 16, font: { family: 'Inter', size: 12 }, sort: (a, b) => a.datasetIndex - b.datasetIndex } },
                    tooltip: { ...tooltip, callbacks: { label: (ctx) => (ctx.dataset.yAxisID === 'y1' ? ` Solicitações: ${num(ctx.parsed.y)}` : ` ${ctx.dataset.label}: ${money(ctx.parsed.y)}`) } }
                },
                scales: {
                    x: baseScales.x,
                    y: baseScales.y,
                    y1: { position: 'right', beginAtZero: true, grid: { display: false }, border: { display: false }, ticks: { color: PALETTE.accent, precision: 0 } }
                }
            }
        });
    }
}

/* ------------------------------------------------------------------ */
/* Filtros recolhíveis                                                 */
/* ------------------------------------------------------------------ */

function readExpanded() {
    try {
        return window.localStorage.getItem(FILTERS_EXPANDED_KEY) === '1'; 
    } catch (_error) {
        return false; 
    }
}

function writeExpanded(value) {
    try {
        window.localStorage.setItem(FILTERS_EXPANDED_KEY, value ? '1' : '0'); 
    } catch (_error) { /* preferência opcional */ }
}

function advancedFilterCount(relatorios) {
    const multi = relatorios._premiumMultiFilters || {};
    const lists = ['clientes', 'tecnicos', 'fornecedores', 'regioes', 'pecas', 'categorias']
        .reduce((sum, key) => sum + (Array.isArray(multi[key]) && multi[key].length ? 1 : 0), 0);
    const division = relatorios._divisionFilter && !/^(all|todos|todas)$/i.test(String(relatorios._divisionFilter)) ? 1 : 0;
    return lists + division;
}

function decorateFilters(html, relatorios) {
    const active = advancedFilterCount(relatorios);
    const expanded = readExpanded() || false;
    const toggle = `<button type="button" class="btn btn-outline ri-filters-toggle" aria-expanded="${expanded}" onclick="Relatorios.toggleAdvancedFilters()"><i class="fas fa-sliders" aria-hidden="true"></i> Mais filtros${active ? ` <span class="ri-count">${active}</span>` : ''}</button>`;
    return html
        .replace('premium-report-filter-shell"', `premium-report-filter-shell ri-filters ${expanded ? 'is-expanded' : 'is-collapsed'}"`)
        .replace('<div class="report-filter-actions-row">', `<div class="report-filter-actions-row">${toggle}`);
}

/* ------------------------------------------------------------------ */
/* Instalação                                                          */
/* ------------------------------------------------------------------ */

export function applyReportsInsights() {
    const Relatorios = window.Relatorios;
    if (!Relatorios || Relatorios.__reportsInsightsV2) {
        return;
    }
    Relatorios.__reportsInsightsV2 = true;

    const baseRenderCostFilters = Relatorios.renderCostFilters.bind(Relatorios);

    Relatorios.renderExecutiveSummary = function () {
        return renderExecutiveSummary(this); 
    };
    Relatorios.renderOverviewModernReport = function () {
        return renderOverview(this); 
    };
    Relatorios.renderPecasModernReport = function () {
        return renderParts(this); 
    };
    Relatorios.renderTecnicosModernReport = function () {
        return renderTechnicians(this); 
    };
    Relatorios.renderMesesModernReport = function () {
        return renderMonths(this); 
    };
    Relatorios.renderCostFilters = function () {
        return decorateFilters(baseRenderCostFilters(), this); 
    };

    Relatorios.toggleAdvancedFilters = function () {
        const shell = document.querySelector('.ri-filters');
        if (!shell) {
            return;
        }
        const expanded = !shell.classList.contains('is-expanded');
        shell.classList.toggle('is-expanded', expanded);
        shell.classList.toggle('is-collapsed', !expanded);
        shell.querySelector('.ri-filters-toggle')?.setAttribute('aria-expanded', String(expanded));
        writeExpanded(expanded);
    };

    Relatorios.initCharts = function initInsightCharts() {
        this.destroyCharts?.();
        this.charts = this.charts || {};
        if (typeof window.Chart === 'undefined') {
            document.querySelectorAll('.ri-chart canvas').forEach((canvas) => {
                canvas.parentElement.innerHTML = '<div class="chart-fallback">Gráfico indisponível no momento</div>';
            });
            return;
        }
        drawCharts(this);
    };
}

export { statusBreakdown, variationBadge, monthCountFor };
