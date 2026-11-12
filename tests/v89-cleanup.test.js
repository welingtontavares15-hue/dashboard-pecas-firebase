const fs = require('node:fs');
const path = require('node:path');

describe('v89 cleanup release', () => {
    const read = (file) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

    test('precache has no duplicate asset paths and keeps operational entries', () => {
        const sw = read('service-worker.js');
        const list = sw.slice(sw.indexOf('const PRECACHE = {'), sw.indexOf('function normalizeAssetUrl'));
        const urls = [...list.matchAll(/'\.\/([^']+)'/g)].map((entry) => entry[1]);
        expect(urls.length).toBeGreaterThan(60);
        expect(new Set(urls).size).toBe(urls.length);
        for (const essential of [
            'js/pages/dashboard-v55.js',
            'js/pages/relatorios-v55.js',
            'js/solicitacoes.js',
            'js/aprovacoes.js',
            'js/relatorios.js',
            'js/auth.js'
        ]) {
            expect(urls).toContain(essential);
        }
    });

    test('asset failures do not return offline HTML in place of scripts or styles', () => {
        const sw = read('service-worker.js');
        const assetHandler = sw.slice(sw.indexOf('async function handleAssetRequest('));
        expect(assetHandler).toContain('return await cache.match(cacheKey) || Response.error();');
        expect(assetHandler).not.toContain('cache.match(normalizeAssetUrl(OFFLINE_URL))');
        const navigationHandler = sw.slice(sw.indexOf('async function handleNavigationRequest('), sw.indexOf('async function handleAssetRequest('));
        expect(navigationHandler).toContain('OFFLINE_URL');
    });

    test('app and worker release versions agree', () => {
        const app = read('js/config.js');
        const sw = read('service-worker.js');
        expect(app).toContain("version: 'v98-data-envio'");
        expect(sw).toContain("const CACHE_VERSION = 'v98-data-envio'");
    });

    test('active navigation routes are unchanged', () => {
        const app = read('js/app.js');
        expect(app).toContain("dashboard: './pages/dashboard-v55.js?v=20261108a'");
        expect(app).toContain("relatorios: './pages/relatorios-v55.js?v=20261110a'");
    });
});
