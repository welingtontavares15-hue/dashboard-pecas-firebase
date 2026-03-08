import { ensureClassicScript } from './load-script.js?v=20260308h';

let ready = false;

export async function ensureLoaded() {
    if (ready && typeof window.Tecnicos !== 'undefined' && typeof window.Fornecedores !== 'undefined') {
        return;
    }

    await ensureClassicScript(new URL('../tecnicos.js?v=20260308h', import.meta.url).href, 'Tecnicos');
    await ensureClassicScript(new URL('../fornecedores.js?v=20260308h', import.meta.url).href, 'Fornecedores');
    await ensureClassicScript(new URL('../usuarios.js?v=20260308h', import.meta.url).href, 'Usuarios');
    ready = true;
}


