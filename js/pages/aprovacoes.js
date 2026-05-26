import { ensureClassicScript } from '../lazy/load-script.js';

let ready = false;

export async function ensureLoaded() {
    if (ready && typeof window.Aprovacoes !== 'undefined') {
        return;
    }

    await ensureClassicScript(new URL('../solicitacoes.js?v=20260315i', import.meta.url).href, 'Solicitacoes');
    await ensureClassicScript(new URL('../aprovacoes.js?v=20260315i', import.meta.url).href, 'Aprovacoes');

    ready = true;
}

export function render() {
    if (typeof window.Aprovacoes !== 'undefined' && typeof window.Aprovacoes.render === 'function') {
        window.Aprovacoes.render();
    }
}
