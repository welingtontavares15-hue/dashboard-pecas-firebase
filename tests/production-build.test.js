const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

describe('production build: CSS and canonical routes', () => {
    const root = path.join(__dirname, '..');

    test('generates deterministic, ordered CSS bundles without modifying source files', () => {
        const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'wwm-build-'));
        try {
            const output = path.join(temp, 'dist');
            execFileSync(process.execPath, [path.join(root, 'scripts/build-site.mjs'), '--out', output], {
                cwd: root,
                timeout: 45000,
                stdio: 'pipe'
            });
            const html = fs.readFileSync(path.join(output, 'index.html'), 'utf8');
            const cssCore = fs.readFileSync(path.join(output, 'css/wwm-core.bundle.css'), 'utf8');
            const cssTheme = fs.readFileSync(path.join(output, 'css/wwm-theme.bundle.css'), 'utf8');
            const worker = fs.readFileSync(path.join(output, 'service-worker.js'), 'utf8');
            expect(html).toContain('data-wwm-styles-bundled="true"');
            expect(html).toContain('wwm-core.bundle.css');
            expect(html).toContain('wwm-theme.bundle.css');
            expect(html).not.toContain('<link rel="stylesheet" href="css/style.css');
            expect(cssCore.indexOf('/* BEGIN css/style.css */'))
                .toBeLessThan(cssCore.indexOf('/* BEGIN css/clean-ui.css */'));
            expect(cssTheme.indexOf('/* BEGIN css/wwm-reference-theme.css */'))
                .toBeLessThan(cssTheme.indexOf('/* BEGIN css/responsive-system.css */'));
            expect(cssTheme.indexOf('/* BEGIN css/visual-architecture-v72.css */'))
                .toBeLessThan(cssTheme.indexOf('/* BEGIN css/desktop-mobile-premium.css */'));
            expect(cssTheme.trimEnd()).toContain('/* END css/desktop-mobile-premium.css */');
            expect(worker).toContain("'./css/wwm-core.bundle.css'");
            expect(worker).toContain("'./css/wwm-theme.bundle.css'");
            expect(worker).not.toContain("'./js/pages/dashboard.js'");
            expect(worker).not.toContain("'./js/pages/relatorios.js'");
            expect(worker).toContain("'./js/pages/dashboard-v55.js'");
            expect(worker).toContain("'./js/pages/relatorios-v55.js'");
            expect(fs.existsSync(path.join(output, 'js/config.js'))).toBe(true);
        } finally {
            fs.rmSync(temp, { recursive: true, force: true });
        }
    }, 60000);
});
