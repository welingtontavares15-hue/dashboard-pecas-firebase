import { ensureClassicScript } from '../lazy/load-script.js';
import { applyDashboardWwmV57 } from '../components/dashboard-wwm-v57.js?v=20260829a';

let ready = false;

export async function ensureLoaded() {
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
