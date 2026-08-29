import { ensureClassicScript } from '../lazy/load-script.js';
import { applyDashboardWwmV58 } from '../components/dashboard-wwm-v58.js?v=20260829b';

let ready = false;

function ensureWwmDashboardStyles() {
    const id = 'wwm-dashboard-v58-styles';
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = new URL('../../css/wwm-dashboard-v58.css?v=20260829b', import.meta.url).href;
    document.head.appendChild(link);
}

export async function ensureLoaded() {
    ensureWwmDashboardStyles();
    if (ready && typeof window.Dashboard !== 'undefined') {
        applyDashboardWwmV58();
        return;
    }

    await ensureClassicScript(new URL('../solicitacoes.js', import.meta.url).href, 'Solicitacoes');
    await ensureClassicScript(new URL('../aprovacoes.js', import.meta.url).href, 'Aprovacoes');
    await ensureClassicScript(new URL('../dashboard.js', import.meta.url).href, 'Dashboard');

    applyDashboardWwmV58();
    ready = true;
}

export function render() {
    if (typeof window.Dashboard?.render === 'function') {
        window.Dashboard.render();
    }
}
