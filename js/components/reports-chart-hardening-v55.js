const TECH_OVERVIEW_LIMIT = 10;
const TECH_DETAIL_LIMIT = 14;
const PART_LIMIT = 12;

function sortByCost(rows = []) {
    return rows.slice().sort((a, b) => (Number(b.totalCost) || 0) - (Number(a.totalCost) || 0));
}

function sanitizeSeries(labels = [], values = []) {
    const safeLabels = Array.isArray(labels) ? labels.map((label) => String(label || 'Não informado')) : [];
    const safeValues = Array.isArray(values) ? values.map((value) => {
        const numeric = Number(value);
        return Number.isFinite(numeric) && numeric > 0 ? numeric : 0;
    }) : [];

    const size = Math.min(safeLabels.length, safeValues.length);
    return {
        labels: safeLabels.slice(0, size),
        values: safeValues.slice(0, size)
    };
}

function shortenLabel(label, maxLength = 30) {
    const value = String(label || '');
    return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;
}

function getTheme() {
    const isDark = document.body.classList.contains('dark-mode');
    return {
        text: isDark ? '#dce7f4' : '#475569',
        grid: isDark ? 'rgba(100, 116, 139, 0.34)' : 'rgba(148, 163, 184, 0.20)',
        surface: isDark ? '#0f1f34' : '#ffffff'
    };
}

function formatAxisCurrency(value) {
    const numeric = Number(value) || 0;
    if (Math.abs(numeric) >= 1000000) return `R$ ${(numeric / 1000000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`;
    if (Math.abs(numeric) >= 1000) return `R$ ${(numeric / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil`;
    return Utils.formatCurrency(numeric);
}

function replaceFallback(canvasId, message) {
    const canvas = document.getElementById(canvasId);
    if (!canvas?.parentElement) return;
    canvas.parentElement.innerHTML = `<div class="chart-fallback premium-chart-fallback"><i class="fas fa-chart-simple"></i><span>${Utils.escapeHtml(message)}</span></div>`;
}

function setChartHeight(canvas, itemCount, { min = 270, max = 620, rowHeight = 40 } = {}) {
    const wrapper = canvas?.closest('.chart-wrapper') || canvas?.parentElement;
    if (!wrapper) return;
    const height = Math.min(max, Math.max(min, (Math.max(itemCount, 1) * rowHeight) + 72));
    wrapper.style.height = `${height}px`;
    wrapper.style.minHeight = `${height}px`;
    wrapper.classList.add('premium-horizontal-chart');
}

function baseOptions() {
    return {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 180 },
        plugins: { legend: { display: false } }
    };
}

function createHorizontalCurrencyChart(relatorios, canvasId, labels, values, color, datasetLabel) {
    const canvas = document.getElementById(canvasId);
    const series = sanitizeSeries(labels, values);
    if (!canvas || series.labels.length === 0 || !series.values.some((value) => value > 0)) {
        if (canvas) replaceFallback(canvasId, 'Sem dados financeiros no período selecionado');
        return;
    }

    setChartHeight(canvas, series.labels.length);
    const theme = getTheme();
    const maximum = Math.max(...series.values, 0);

    relatorios.charts[canvasId] = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: series.labels,
            datasets: [{
                label: datasetLabel,
                data: series.values,
                backgroundColor: color,
                hoverBackgroundColor: color,
                borderRadius: 7,
                borderSkipped: false,
                barPercentage: 0.72,
                categoryPercentage: 0.82,
                maxBarThickness: 30
            }]
        },
        options: {
            ...baseOptions(),
            indexAxis: 'y',
            interaction: { mode: 'nearest', axis: 'y', intersect: false },
            layout: { padding: { left: 4, right: 18, top: 6, bottom: 4 } },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        title: (items) => series.labels[items[0]?.dataIndex] || '',
                        label: (context) => `${datasetLabel}: ${Utils.formatCurrency(context.parsed.x || 0)}`
                    }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    suggestedMax: maximum > 0 ? maximum * 1.12 : undefined,
                    ticks: {
                        color: theme.text,
                        callback: formatAxisCurrency,
                        maxTicksLimit: 7
                    },
                    grid: { color: theme.grid, drawBorder: false }
                },
                y: {
                    ticks: {
                        color: theme.text,
                        autoSkip: false,
                        callback(value) {
                            return shortenLabel(this.getLabelForValue(value), 32);
                        }
                    },
                    grid: { display: false },
                    border: { display: false }
                }
            }
        }
    });
}

function createMonthlyLineChart(relatorios, canvasId, months = []) {
    const canvas = document.getElementById(canvasId);
    const rows = Array.isArray(months) ? months : [];
    if (!canvas || rows.length === 0) {
        if (canvas) replaceFallback(canvasId, 'Sem dados mensais no período selecionado');
        return;
    }

    const wrapper = canvas.closest('.chart-wrapper') || canvas.parentElement;
    if (wrapper) {
        wrapper.style.height = '310px';
        wrapper.style.minHeight = '310px';
    }

    const theme = getTheme();
    relatorios.charts[canvasId] = new Chart(canvas, {
        type: 'line',
        data: {
            labels: rows.map((month) => month.label),
            datasets: [{
                label: 'Custo mensal',
                data: rows.map((month) => Number(month.totalCost) || 0),
                borderColor: '#1ee1ce',
                backgroundColor: 'rgba(30, 225, 206, 0.14)',
                fill: true,
                tension: 0.28,
                borderWidth: 3,
                pointRadius: 3,
                pointHoverRadius: 5
            }]
        },
        options: {
            ...baseOptions(),
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
                    ticks: { color: theme.text, callback: formatAxisCurrency, maxTicksLimit: 7 },
                    grid: { color: theme.grid }
                },
                x: { ticks: { color: theme.text }, grid: { display: false } }
            }
        }
    });
}

function createMonthlyBarChart(relatorios, canvasId, months = []) {
    const canvas = document.getElementById(canvasId);
    const rows = Array.isArray(months) ? months : [];
    if (!canvas || rows.length === 0) {
        if (canvas) replaceFallback(canvasId, 'Sem dados mensais no período selecionado');
        return;
    }

    const wrapper = canvas.closest('.chart-wrapper') || canvas.parentElement;
    if (wrapper) {
        wrapper.style.height = '330px';
        wrapper.style.minHeight = '330px';
    }

    const theme = getTheme();
    relatorios.charts[canvasId] = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: rows.map((month) => month.label),
            datasets: [{
                label: 'Custo mensal',
                data: rows.map((month) => Number(month.totalCost) || 0),
                backgroundColor: 'rgba(11, 183, 158, 0.85)',
                borderRadius: 8,
                borderSkipped: false,
                maxBarThickness: 42
            }]
        },
        options: {
            ...baseOptions(),
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: (context) => `Custo: ${Utils.formatCurrency(context.parsed.y || 0)}` } }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { color: theme.text, callback: formatAxisCurrency, maxTicksLimit: 7 },
                    grid: { color: theme.grid }
                },
                x: { ticks: { color: theme.text, maxRotation: 0, minRotation: 0 }, grid: { display: false } }
            }
        }
    });
}

export function applyReportsChartHardeningV55() {
    if (!window.Relatorios || Relatorios.__premiumChartHardeningV55) return;
    Relatorios.__premiumChartHardeningV55 = true;

    Relatorios.initCharts = function initChartsV55() {
        this.destroyCharts?.();
        this.charts = this.charts || {};

        const chartIds = [
            'reportOverviewMonthlyChart',
            'reportOverviewTechChart',
            'reportPartCostChart',
            'reportTechnicianCostChart',
            'reportMonthlyCostChart',
            'costMonthlyChart',
            'costPartsChart',
            'costTechniciansChart',
            'costTechniciansDetailChart',
            'costPartsDetailChart'
        ];

        if (typeof window.Chart === 'undefined') {
            chartIds.forEach((id) => replaceFallback(id, 'Gráfico indisponível no momento'));
            return;
        }

        const analysis = this.buildCostAnalysis();
        const technicians = sortByCost(analysis.byTechnician || []);
        const parts = sortByCost(analysis.byPiece || []);
        const months = Array.isArray(analysis.byMonth) ? analysis.byMonth : [];

        createMonthlyLineChart(this, 'reportOverviewMonthlyChart', months);
        createHorizontalCurrencyChart(
            this,
            'reportOverviewTechChart',
            technicians.slice(0, TECH_OVERVIEW_LIMIT).map((row) => row.nome),
            technicians.slice(0, TECH_OVERVIEW_LIMIT).map((row) => row.totalCost),
            'rgba(17, 191, 172, 0.86)',
            'Custo do técnico'
        );
        createHorizontalCurrencyChart(
            this,
            'reportTechnicianCostChart',
            technicians.slice(0, TECH_DETAIL_LIMIT).map((row) => row.nome),
            technicians.slice(0, TECH_DETAIL_LIMIT).map((row) => row.totalCost),
            'rgba(17, 191, 172, 0.86)',
            'Custo do técnico'
        );
        createHorizontalCurrencyChart(
            this,
            'reportPartCostChart',
            parts.slice(0, PART_LIMIT).map((row) => row.codigo || row.descricao),
            parts.slice(0, PART_LIMIT).map((row) => row.totalCost),
            'rgba(11, 183, 158, 0.86)',
            'Custo da peça'
        );
        createMonthlyBarChart(this, 'reportMonthlyCostChart', months);

        createMonthlyLineChart(this, 'costMonthlyChart', months);
        createHorizontalCurrencyChart(
            this,
            'costTechniciansChart',
            technicians.slice(0, TECH_OVERVIEW_LIMIT).map((row) => row.nome),
            technicians.slice(0, TECH_OVERVIEW_LIMIT).map((row) => row.totalCost),
            'rgba(17, 191, 172, 0.86)',
            'Custo do técnico'
        );
        createHorizontalCurrencyChart(
            this,
            'costTechniciansDetailChart',
            technicians.slice(0, TECH_DETAIL_LIMIT).map((row) => row.nome),
            technicians.slice(0, TECH_DETAIL_LIMIT).map((row) => row.totalCost),
            'rgba(17, 191, 172, 0.86)',
            'Custo do técnico'
        );
        createHorizontalCurrencyChart(
            this,
            'costPartsChart',
            parts.slice(0, PART_LIMIT).map((row) => row.codigo || row.descricao),
            parts.slice(0, PART_LIMIT).map((row) => row.totalCost),
            'rgba(11, 183, 158, 0.86)',
            'Custo da peça'
        );
        createHorizontalCurrencyChart(
            this,
            'costPartsDetailChart',
            parts.slice(0, PART_LIMIT).map((row) => row.codigo || row.descricao),
            parts.slice(0, PART_LIMIT).map((row) => row.totalCost),
            'rgba(11, 183, 158, 0.86)',
            'Custo da peça'
        );
    };
}

export { sanitizeSeries, shortenLabel, setChartHeight };
