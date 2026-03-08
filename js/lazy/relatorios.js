import { ensureClassicScript } from './load-script.js';

let ready = false;

export async function ensureLoaded() {
    if (ready && typeof window.Relatorios !== 'undefined') {
        return;
    }
    await ensureClassicScript(new URL('../relatorios.js', import.meta.url).href, 'Relatorios');
    ready = true;
}

