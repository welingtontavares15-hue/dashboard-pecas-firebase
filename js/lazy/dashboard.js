import { ensureClassicScript } from './load-script.js';

let ready = false;

export async function ensureLoaded() {
    if (ready && typeof window.Dashboard !== 'undefined') {
        return;
    }

    await ensureClassicScript(new URL('../solicitacoes.js', import.meta.url).href, 'Solicitacoes');
    await ensureClassicScript(new URL('../aprovacoes.js', import.meta.url).href, 'Aprovacoes');
    await ensureClassicScript(new URL('../dashboard.js', import.meta.url).href, 'Dashboard');
    const patch = await import(new URL('../components/dashboard-modern.js', import.meta.url).href);
    if (patch && typeof patch.applyDashboardModernization === 'function') {
        patch.applyDashboardModernization();
    }
    ready = true;
}


