const fs = require('node:fs');
const path = require('node:path');

describe('PWA - approved dishwasher gear emblem', () => {
    const root = path.resolve(__dirname, '..');
    const read = file => fs.readFileSync(path.join(root, file), 'utf8');

    test('manifest, favicon and precache reference the approved updated icon', () => {
        const manifest = JSON.parse(read('manifest.webmanifest'));
        const html = read('index.html');
        const worker = read('service-worker.js');
        expect(manifest.short_name).toBe('Peças WWM');
        expect(manifest.theme_color).toBe('#004449');
        expect(manifest.icons[0]).toEqual({
            src: './icons/icon.svg?v=20261108-washer-v94',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any'
        });
        expect(manifest.icons[1]).toEqual({
            src: './icons/icon-maskable.svg?v=20261108-washer-v94',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'maskable'
        });
        expect(manifest.icons[2].src).toBe('./icons/wwm-industrial-washer.webp');
        expect(manifest.icons[2].sizes).toBe('128x128');
        expect(html).toContain('rel="manifest" href="manifest.webmanifest?v=20261108-washer-v94"');
        expect(html).toContain('rel="icon" type="image/svg+xml" href="icons/icon.svg?v=20261108-washer-v94"');
        for (const asset of [
            './icons/icon.svg?v=20261108-washer-v94',
            './icons/icon-maskable.svg?v=20261108-washer-v94',
            './icons/wwm-industrial-washer.webp'
        ]) {
            expect(worker).toContain("'" + asset + "'");
        }
        expect(worker).toContain("const CACHE_VERSION = 'v94-washer-icon'");
    });

    test('standard and adaptive icons embed exactly the same approved washer illustration', () => {
        const source = fs.readFileSync(path.join(root, 'icons/wwm-industrial-washer.webp'));
        const regular = read('icons/icon.svg');
        const adaptive = read('icons/icon-maskable.svg');
        expect(source.toString('ascii', 0, 4)).toBe('RIFF');
        expect(source.toString('ascii', 8, 12)).toBe('WEBP');
        expect(source.length).toBeGreaterThan(4000);
        for (const svg of [regular, adaptive]) {
            const data = svg.match(/data:image\/webp;base64,([A-Za-z0-9+/=]+)/)?.[1];
            expect(data).toBeTruthy();
            expect(Buffer.from(data, 'base64').equals(source)).toBe(true);
            expect(svg).toContain('Peças WWM');
        }
        expect(adaptive).toContain('x="58" y="58" width="396" height="396"');
        expect(regular).toContain('clip-path="url(#round)"');
    });
});
