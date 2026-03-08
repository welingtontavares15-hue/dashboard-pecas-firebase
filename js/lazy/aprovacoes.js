import { ensureClassicScript } from './load-script.js?v=20260308h';

let ready = false;

export async function ensureLoaded() {
    if (ready && typeof window.Aprovacoes !== 'undefined') {
        return;
    }
    await ensureClassicScript(new URL('../solicitacoes.js?v=20260308h', import.meta.url).href, 'Solicitacoes');
    await ensureClassicScript(new URL('../aprovacoes.js?v=20260308h', import.meta.url).href, 'Aprovacoes');
    ready = true;
}



