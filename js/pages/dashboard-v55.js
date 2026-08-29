import { ensureClassicScript } from '../lazy/load-script.js';
import { applyDashboardWwmV57 } from '../components/dashboard-wwm-v57.js?v=20260829a';

let ready = false;

function ensureWwmDashboardStyles() {
    const id = 'wwm-dashboard-v57-styles';
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = new URL('../../css/wwm-dashboard-v57.css?v=20260829a', import.meta.url).href;
    document.head.appendChild(link);
}

export async function ensureLoaded() {
    ensureWwmDashboardStyles();
    if (ready && typeof window.Dashboard !== 'undefined') {
        applyDashboardWwmV57();
        return;
    }

    await ensureClassicScript(new URL('../solicitacoes.js', import.meta.url).href, 'Solicitacoes');
    await ensureClassicScript(new URL('../aprovacoes.js', import.meta.url).href, 'Aprovacoes');
    await ensureClassicScript(new URL('../dashboard.js', import.meta.url).href, 'Dashboard');

    applyDashboardWwmV57();
    ready = true;
}

export function render() {
    if (typeof window.Dashboard?.render === 'function') {
        window.Dashboard.render();
    }
}
