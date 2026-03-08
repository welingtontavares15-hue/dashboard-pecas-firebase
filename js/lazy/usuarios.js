import { ensureClassicScript } from './load-script.js';

let ready = false;

export async function ensureLoaded() {
    if (ready && typeof window.Tecnicos !== 'undefined' && typeof window.Fornecedores !== 'undefined') {
        return;
    }

    await ensureClassicScript(new URL('../tecnicos.js', import.meta.url).href, 'Tecnicos');
    await ensureClassicScript(new URL('../fornecedores.js', import.meta.url).href, 'Fornecedores');
    await ensureClassicScript(new URL('../usuarios.js', import.meta.url).href, 'Usuarios');
    ready = true;
}

