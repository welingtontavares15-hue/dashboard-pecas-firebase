import { ensureClassicScript } from '../lazy/load-script.js';

let ready = false;

export async function ensureLoaded() {
    if (ready && typeof window.Tecnicos !== 'undefined' && typeof window.Fornecedores !== 'undefined' && typeof window.Usuarios !== 'undefined') {
        return;
    }

    await ensureClassicScript(new URL('../tecnicos.js?v=20261110a', import.meta.url).href, 'Tecnicos');
    await ensureClassicScript(new URL('../fornecedores.js?v=20261109a', import.meta.url).href, 'Fornecedores');
    await ensureClassicScript(new URL('../usuarios.js', import.meta.url).href, 'Usuarios');

    ready = true;
}

export function render() {
    if (typeof window.Usuarios !== 'undefined' && typeof window.Usuarios.render === 'function') {
        window.Usuarios.render();
        return;
    }
    if (typeof window.Tecnicos !== 'undefined' && typeof window.Tecnicos.render === 'function') {
        window.Tecnicos.render();
    }
}
