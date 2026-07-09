export function renderKpiCard({ title, value, subtitle = '', icon = 'fa-chart-line', tone = 'info' }) {
    return `
        <div class="kpi-card metric-card">
            <div class="kpi-icon ${tone}" aria-hidden="true"><i class="fas ${icon}"></i></div>
            <div class="kpi-content">
                <h4 class="kpi-label">${title}</h4>
                <div class="kpi-value">${value}</div>
                ${subtitle ? `<div class="kpi-change">${subtitle}</div>` : ''}
            </div>
        </div>
    `;
}
