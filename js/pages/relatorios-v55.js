import { ensureClassicScript } from '../lazy/load-script.js';
import { applyReportsModernization } from '../components/reports-modern.js?v=20260828b';
import { applyReportsMultiSelect } from '../components/reports-multi-select.js?v=20260828b';
import { applyReportsChartHardeningV55 } from '../components/reports-chart-hardening-v55.js?v=20260828c';

let ready = false;

function applyEnhancements() {
    applyReportsModernization();
    applyReportsMultiSelect();
    applyReportsChartHardeningV55();
}

export async function ensureLoaded() {
    if (ready && typeof window.Relatorios !== 'undefined') {
        applyEnhancements();
        return;
    }

    await ensureClassicScript(new URL('../relatorios.js?v=20260828b', import.meta.url).href, 'Relatorios');
    applyEnhancements();
    ready = true;
}

export function render() {
    if (typeof window.Relatorios?.render === 'function') {
        applyEnhancements();
        window.Relatorios.render();
    }
}
