import { ensureClassicScript } from './load-script.js';

let ready = false;

export async function ensureLoaded() {
    if (ready && typeof window.Pecas !== 'undefined') {
        return;
    }
    await ensureClassicScript(new URL('../pecas.js', import.meta.url).href, 'Pecas');
    ready = true;
}

