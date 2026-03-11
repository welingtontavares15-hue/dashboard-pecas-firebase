import { ensureClassicScript } from '../lazy/load-script.js';

let ready = false;

export async function ensureLoaded() {
    if (ready && typeof window.Solicitacoes !== 'undefined') {
        return;
    }

    await ensureClassicScript(new URL('../pecas.js?v=20260311c', import.meta.url).href, 'Pecas');
    await ensureClassicScript(new URL('../solicitacoes.js?v=20260311c', import.meta.url).href, 'Solicitacoes');

    ready = true;
}

export function render() {
    if (typeof window.Solicitacoes !== 'undefined' && typeof window.Solicitacoes.render === 'function') {
        window.Solicitacoes.render();
    }
}
