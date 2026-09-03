import { ensureClassicScript } from '../lazy/load-script.js';

let ready = false;

export async function ensureLoaded() {
    if (ready && typeof window.Aprovacoes !== 'undefined' && typeof window.SolicitacoesDivisaoPatch !== 'undefined') {
        return;
    }

    await ensureClassicScript(new URL('../solicitacoes.js?v=20260903a', import.meta.url).href, 'Solicitacoes');
    await ensureClassicScript(new URL('../solicitacoes-divisao.js?v=20260903a', import.meta.url).href, 'SolicitacoesDivisaoPatch');
    await ensureClassicScript(new URL('../aprovacoes.js?v=20260709a', import.meta.url).href, 'Aprovacoes');

    window.SolicitacoesDivisaoPatch?.patch?.();
    ready = true;
}

export function render() {
    if (typeof window.Aprovacoes !== 'undefined' && typeof window.Aprovacoes.render === 'function') {
        window.Aprovacoes.render();
    }
}