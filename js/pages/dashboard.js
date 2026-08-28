import { ensureClassicScript } from '../lazy/load-script.js';

let ready = false;

export async function ensureLoaded() {
    if (ready && typeof window.Dashboard !== 'undefined') {
        return;
    }

    await ensureClassicScript(new URL('../solicitacoes.js', import.meta.url).href, 'Solicitacoes');
    await ensureClassicScript(new URL('../aprovacoes.js', import.meta.url).href, 'Aprovacoes');
    await ensureClassicScript(new URL('../dashboard.js', import.meta.url).href, 'Dashboard');

    const patch = await import(new URL('../components/dashboard-modern.js?v=20260709b', import.meta.url).href);
    if (patch && typeof patch.applyDashboardModernization === 'function') {
        patch.applyDashboardModernization();
    }

    const focusPatch = await import(new URL('../components/dashboard-focus.js?v=20260729a', import.meta.url).href);
    if (focusPatch && typeof focusPatch.applyDashboardFocus === 'function') {
        focusPatch.applyDashboardFocus();
    }

    const stabilityPatch = await import(new URL('../components/dashboard-stability.js?v=20260828a', import.meta.url).href);
    if (stabilityPatch && typeof stabilityPatch.applyDashboardStability === 'function') {
        stabilityPatch.applyDashboardStability();
    }

    ready = true;
}

export function render() {
    if (typeof window.Dashboard !== 'undefined' && typeof window.Dashboard.render === 'function') {
        window.Dashboard.render();
    }
}
