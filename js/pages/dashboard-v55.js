import { ensureClassicScript } from '../lazy/load-script.js';
import { applyDashboardWwmV59 } from '../components/dashboard-wwm-v59.js?v=20260829e';

let ready = false;

function ensureWwmDashboardStyles() {
    // A composição v61 é definida pela camada visual global. O stylesheet v59
    // continha o antigo painel lateral claro e sobrescrevia o portal ao ser
    // injetado depois do tema principal.
    document.getElementById('wwm-dashboard-v59-styles')?.remove();
    document.getElementById('wwm-dashboard-v58-styles')?.remove();
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
