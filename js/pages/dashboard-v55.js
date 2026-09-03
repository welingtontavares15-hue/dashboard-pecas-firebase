import { ensureClassicScript } from '../lazy/load-script.js';
import { applyDashboardWwmV59 } from '../components/dashboard-wwm-v59.js?v=20260829e';
import { applyDashboardDivisionFilter } from '../components/dashboard-division-filter.js?v=20260903a';

let ready = false;

function ensureWwmDashboardStyles() {
    // A composição v61 é definida pela camada visual global. O stylesheet v59
    // continha o antigo painel lateral claro e sobrescrevia o portal ao ser
    // injetado depois do tema principal.
    document.getElementById('wwm-dashboard-v59-styles')?.remove();
    document.getElementById('wwm-dashboard-v58-styles')?.remove();
}

function applyEnhancements() {
    applyDashboardWwmV59();
    applyDashboardDivisionFilter();
}

export async function ensureLoaded() {
    ensureWwmDashboardStyles();
    if (ready && typeof window.Dashboard !== 'undefined') {
        applyEnhancements();
        return;
    }

    await ensureClassicScript(new URL('../solicitacoes.js', import.meta.url).href, 'Solicitacoes');
    await ensureClassicScript(new URL('../aprovacoes.js', import.meta.url).href, 'Aprovacoes');
    await ensureClassicScript(new URL('../dashboard.js', import.meta.url).href, 'Dashboard');

    applyEnhancements();
    ready = true;
}

export function render() {
    if (typeof window.Dashboard?.render === 'function') {
        applyEnhancements();
        window.Dashboard.render();
    }
}