const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

// Sigla oficial: WWM (WareWashing Machine), igual ao app Power Apps "WWM - Request".
// Variações erradas já publicadas no portal: MWW, MMW e WMW.
const WRONG_ABBREVIATION = /\b(MWW|MMW|WMW)\b/;

const listFiles = (dir, extensions) => fs.readdirSync(path.join(root, dir), { withFileTypes: true })
    .flatMap((entry) => {
        const relative = path.join(dir, entry.name);
        if (entry.isDirectory()) return entry.name === 'vendor' ? [] : listFiles(relative, extensions);
        return extensions.includes(path.extname(entry.name)) ? [relative] : [];
    });

describe('sigla oficial WWM alinhada ao app WWM - Request', () => {
    test('nome do portal usado em e-mails, PDFs e cabeçalhos usa WWM', () => {
        expect(read('js/utils.js')).toContain("PORTAL_DISPLAY_NAME: 'Portal de Solicitação de Peças WWM'");
    });

    test('tela de login exibe a sigla WWM', () => {
        const index = read('index.html');
        expect(index).toContain('Portal corporativo WWM');
        expect(index).toContain('<title>Portal de Solicitação de Peças WWM</title>');
    });

    test('nenhum arquivo do portal exibe MWW, MMW ou WMW', () => {
        const files = ['index.html', 'offline.html', 'manifest.webmanifest', 'CREDENCIAIS.md',
            ...listFiles('js', ['.js']), ...listFiles('css', ['.css']), ...listFiles('templates', ['.html', '.json', '.js'])];
        const offenders = files.filter((file) => WRONG_ABBREVIATION.test(read(file)));
        expect(offenders).toEqual([]);
    });
});
