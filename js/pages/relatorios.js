import { ensureClassicScript } from '../lazy/load-script.js?v=20260308f';
import { applyReportsModernization } from '../components/reports-modern.js?v=20260308f';

let ready = false;

export async function ensureLoaded() {
    if (ready && typeof window.Relatorios !== 'undefined') {
        applyReportsModernization();
        return;
    }

    await ensureClassicScript(new URL('../relatorios.js?v=20260308f', import.meta.url).href, 'Relatorios');
    applyReportsModernization();
    ready = true;
}

export function render() {
    if (typeof window.Relatorios !== 'undefined' && typeof window.Relatorios.render === 'function') {
        window.Relatorios.render();
    }
}





