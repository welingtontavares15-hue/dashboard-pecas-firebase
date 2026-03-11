import { ensureClassicScript } from '../lazy/load-script.js';

let ready = false;

export async function ensureLoaded() {
    if (ready && typeof window.FornecedorPortal !== 'undefined') {
        return;
    }

    await ensureClassicScript(new URL('../fornecedor.js?v=20260311c', import.meta.url).href, 'FornecedorPortal');
    ready = true;
}

export function render() {
    if (typeof window.FornecedorPortal !== 'undefined' && typeof window.FornecedorPortal.render === 'function') {
        window.FornecedorPortal.render();
    }
}
