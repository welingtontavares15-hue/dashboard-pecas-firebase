import { ensureClassicScript } from '../lazy/load-script.js';

let ready = false;

export async function ensureLoaded() {
    if (ready && typeof window.Pecas !== 'undefined') {
        return;
    }

    await ensureClassicScript(new URL('../pecas.js', import.meta.url).href, 'Pecas');
    ready = true;
}

export function render() {
    if (typeof window.Pecas !== 'undefined' && typeof window.Pecas.render === 'function') {
        window.Pecas.render();
    }
}
