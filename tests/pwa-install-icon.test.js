const fs = require('node:fs');
const path = require('node:path');

describe('PWA - launcher artwork for dishwasher parts', () => {
    const root = path.resolve(__dirname, '..');
    const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

    test('manifest, favicon and precache point to the new installation icon', () => {
        const manifest = JSON.parse(read('manifest.webmanifest'));
        const html = read('index.html');
        const worker = read('service-worker.js');
        expect(manifest.short_name).toBe('Peças WWM');
        expect(manifest.theme_color).toBe('#004449');
        expect(manifest.icons[0].src).toBe('./icons/icon.svg?v=20261108-parts');
        expect(manifest.icons[0].purpose).toBe('any');
        expect(html).toContain('rel="icon" type="image/svg+xml" href="icons/icon.svg?v=20261108-parts"');
        expect(worker).toContain("'./icons/icon.svg?v=20261108-parts'");
    });

    test('logo file includes the approved artwork and no old DP monogram', () => {
        const svg = read('icons/icon.svg');
        expect(svg).toContain('data:image/webp;base64,');
        expect(svg).toContain('Peças para máquinas de lavar louças');
        expect(svg).not.toContain('DP monogram');
        const data = svg.match(/data:image\/webp;base64,([A-Za-z0-9+/=]+)/)?.[1];
        expect(data).toBeTruthy();
        const bytes = Buffer.from(data, 'base64');
        expect(bytes.toString('ascii', 0, 4)).toBe('RIFF');
        expect(bytes.toString('ascii', 8, 12)).toBe('WEBP');
        expect(bytes.length).toBeGreaterThan(5000);
    });
});
