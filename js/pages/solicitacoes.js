import { ensureClassicScript } from '../lazy/load-script.js';

let ready = false;

export async function ensureLoaded() {
    if (ready
        && typeof window.Solicitacoes !== 'undefined'
        && typeof window.TechnicianExperience !== 'undefined'
        && typeof window.SolicitacoesDivisaoPatch !== 'undefined'
        && typeof window.SolicitacoesDivisaoFiltroPatch !== 'undefined') {
        return;
    }

    await ensureClassicScript(new URL('../pecas.js?v=20260315i', import.meta.url).href, 'Pecas');
    await ensureClassicScript(new URL('../solicitacoes.js?v=20260903a', import.meta.url).href, 'Solicitacoes');
    await ensureClassicScript(new URL('../technician-experience.js?v=20260830b', import.meta.url).href, 'TechnicianExperience');
    await ensureClassicScript(new URL('../solicitacoes-divisao.js?v=20260903b', import.meta.url).href, 'SolicitacoesDivisaoPatch');
    await ensureClassicScript(new URL('../solicitacoes-divisao-filtro.js?v=20260903a', import.meta.url).href, 'SolicitacoesDivisaoFiltroPatch');

    window.SolicitacoesDivisaoPatch?.patch?.();
    window.SolicitacoesDivisaoFiltroPatch?.patch?.();
    ready = true;
}

export function render() {
    if (typeof window.Solicitacoes !== 'undefined' && typeof window.Solicitacoes.render === 'function') {
        window.Solicitacoes.render();
    }
}