import { ensureClassicScript } from '../lazy/load-script.js';
import { applyReportsModernization } from '../components/reports-modern.js?v=20260709a';
import { applyReportsMultiSelect } from '../components/reports-multi-select.js?v=20260828b';

let ready = false;

export async function ensureLoaded() {
    if (ready && typeof window.Relatorios !== 'undefined') {
        applyReportsModernization();
        applyReportsMultiSelect();
        return;
    }

    await ensureClassicScript(new URL('../relatorios.js?v=20260709a', import.meta.url).href, 'Relatorios');
    applyReportsModernization();
    applyReportsMultiSelect();
    ready = true;
}

export function render() {
    if (typeof window.Relatorios !== 'undefined' && typeof window.Relatorios.render === 'function') {
        window.Relatorios.render();
    }
}
