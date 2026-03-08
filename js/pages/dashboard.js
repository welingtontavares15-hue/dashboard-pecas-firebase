import { ensureClassicScript } from '../lazy/load-script.js?v=20260308i';

let ready = false;

export async function ensureLoaded() {
    if (ready && typeof window.Dashboard !== 'undefined') {
        return;
    }

    await ensureClassicScript(new URL('../solicitacoes.js?v=20260308i', import.meta.url).href, 'Solicitacoes');
    await ensureClassicScript(new URL('../aprovacoes.js?v=20260308i', import.meta.url).href, 'Aprovacoes');
    await ensureClassicScript(new URL('../dashboard.js?v=20260308i', import.meta.url).href, 'Dashboard');

    const patch = await import(new URL('../components/dashboard-modern.js?v=20260308i', import.meta.url).href);
    if (patch && typeof patch.applyDashboardModernization === 'function') {
        patch.applyDashboardModernization();
    }

    ready = true;
}

export function render() {
    if (typeof window.Dashboard !== 'undefined' && typeof window.Dashboard.render === 'function') {
        window.Dashboard.render();
    }
}








