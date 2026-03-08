import { ensureClassicScript } from './load-script.js?v=20260308h';

let ready = false;

export async function ensureLoaded() {
    if (ready && typeof window.Relatorios !== 'undefined') {
        return;
    }
    await ensureClassicScript(new URL('../relatorios.js?v=20260308h', import.meta.url).href, 'Relatorios');
    ready = true;
}


