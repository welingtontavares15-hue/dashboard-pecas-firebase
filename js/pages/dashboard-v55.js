import { ensureClassicScript } from '../lazy/load-script.js';
import { applyDashboardPremiumV55 } from '../components/dashboard-premium-v55.js?v=20260828c';

let ready = false;

export async function ensureLoaded() {
    if (ready && typeof window.Dashboard !== 'undefined') {
        applyDashboardPremiumV55();
        return;
    }

    await ensureClassicScript(new URL('../solicitacoes.js', import.meta.url).href, 'Solicitacoes');
    await ensureClassicScript(new URL('../aprovacoes.js', import.meta.url).href, 'Aprovacoes');
    await ensureClassicScript(new URL('../dashboard.js', import.meta.url).href, 'Dashboard');

    const modernPatch = await import(new URL('../components/dashboard-modern.js?v=20260709b', import.meta.url).href);
    modernPatch?.applyDashboardModernization?.();

    const focusPatch = await import(new URL('../components/dashboard-focus.js?v=20260828b', import.meta.url).href);
    focusPatch?.applyDashboardFocus?.();

    const stabilityPatch = await import(new URL('../components/dashboard-stability.js?v=20260828b', import.meta.url).href);
    stabilityPatch?.applyDashboardStability?.();

    applyDashboardPremiumV55();
    ready = true;
}

export function render() {
    if (typeof window.Dashboard?.render === 'function') {
        window.Dashboard.render();
    }
}
