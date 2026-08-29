import { ensureClassicScript } from '../lazy/load-script.js';
import { applyDashboardWwmV59 } from '../components/dashboard-wwm-v59.js?v=20260829c';

let ready = false;

function ensureWwmDashboardStyles() {
    const id = 'wwm-dashboard-v59-styles';
    if (document.getElementById(id)) return;
    document.getElementById('wwm-dashboard-v58-styles')?.remove();
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = new URL('../../css/wwm-dashboard-v59.css?v=20260829c', import.meta.url).href;
    document.head.appendChild(link);
}

export async function ensureLoaded() {
    ensureWwmDashboardStyles();
    if (ready && typeof window.Dashboard !== 'undefined') {
        applyDashboardWwmV59();
        return;
    }

    await ensureClassicScript(new URL('../solicitacoes.js', import.meta.url).href, 'Solicitacoes');
    await ensureClassicScript(new URL('../aprovacoes.js', import.meta.url).href, 'Aprovacoes');
    await ensureClassicScript(new URL('../dashboard.js', import.meta.url).href, 'Dashboard');

    applyDashboardWwmV59();
    ready = true;
}

export function render() {
    if (typeof window.Dashboard?.render === 'function') {
        window.Dashboard.render();
    }
}
