import { ensureClassicScript } from './load-script.js';

let ready = false;

export async function ensureLoaded() {
    if (ready && typeof window.Solicitacoes !== 'undefined') {
        return;
    }
    await ensureClassicScript(new URL('../pecas.js', import.meta.url).href, 'Pecas');
    await ensureClassicScript(new URL('../solicitacoes.js', import.meta.url).href, 'Solicitacoes');
    ready = true;
}


