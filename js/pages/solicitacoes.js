import { ensureClassicScript } from '../lazy/load-script.js';

let ready = false;

export async function ensureLoaded() {
    if (ready
        && typeof window.Solicitacoes !== 'undefined'
        && typeof window.TechnicianExperience !== 'undefined') {
        return;
    }

    await ensureClassicScript(new URL('../pecas.js?v=20260315i', import.meta.url).href, 'Pecas');
    await ensureClassicScript(new URL('../solicitacoes.js?v=20260811a', import.meta.url).href, 'Solicitacoes');
    await ensureClassicScript(new URL('../technician-experience.js?v=20260811a', import.meta.url).href, 'TechnicianExperience');

    ready = true;
}

export function render() {
    if (typeof window.Solicitacoes !== 'undefined' && typeof window.Solicitacoes.render === 'function') {
        window.Solicitacoes.render();
    }
}
