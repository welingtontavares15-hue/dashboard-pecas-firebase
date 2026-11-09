/**
 * Build reproduzivel do site estatico. Mantem a entrada de desenvolvimento
 * inalterada, mas entrega dois bundles CSS na ordem efetiva do layout WWM.
 * Nenhum dado, autenticacao ou configuracao Firebase e modificado.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputArg = process.argv.indexOf('--out');
if (outputArg >= 0 && !process.argv[outputArg + 1]) {
    throw new Error('Uso: node scripts/build-site.mjs [--out diretorio]');
}
const OUT = outputArg >= 0 ? path.resolve(process.argv[outputArg + 1]) : path.join(ROOT, 'dist');
if (OUT === ROOT || ROOT.startsWith(OUT + path.sep)) {
    throw new Error('O diretorio de destino nao pode conter o repositorio.');
}

const ROOT_FILES = [
    'index.html', 'offline.html', 'clear-cache.html', 'manifest.webmanifest',
    'firebase-healthcheck.html', 'service-worker.js'
];
const RUNTIME_DIRS = ['css', 'js', 'icons', 'health', 'templates'];

const TAIL_CSS = [
    'css/wwm-reference-theme.css',
    'css/responsive-system.css',
    'css/wwm-visual-standard.css',
    'css/wwm-smart-layout.css',
    'css/visual-premium-v4.css',
    'css/visual-architecture-v72.css',
    'css/desktop-mobile-premium.css'
];
const RUNTIME_CSS_BEFORE_TAIL = [
    'css/navigation-consolidation.css',
    'css/premium-ui-v3-polish.css',
    'css/technician-history.css'
];

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const worker = fs.readFileSync(path.join(ROOT, 'service-worker.js'), 'utf8');
const config = fs.readFileSync(path.join(ROOT, 'js/config.js'), 'utf8');
const version = config.match(/version:\s*'([^']+)'/)?.[1];
if (!version || !worker.includes("const CACHE_VERSION = '" + version + "'")) {
    throw new Error('Versao do aplicativo e do Service Worker devem ser identicas.');
}
const iconPosition = html.indexOf('font-awesome/6.4.0/css/all.min.css');
if (iconPosition === -1) {
    throw new Error('A posicao do Font Awesome nao foi encontrada no HTML.');
}

const LINK_RE = /<link\b[^>]*\brel="stylesheet"[^>]*>/g;
function pathFromTag(tag) {
    const href = tag.match(/\bhref="([^"]+)"/)?.[1] || '';
    return href.startsWith('css/') ? href.split('?')[0] : null;
}
const beforeIcons = [];
const afterIcons = [];
for (const match of html.matchAll(LINK_RE)) {
    const cssPath = pathFromTag(match[0]);
    if (!cssPath) continue;
    (match.index < iconPosition ? beforeIcons : afterIcons).push(cssPath);
}

const missingTail = TAIL_CSS.filter((file) => file !== 'css/wwm-smart-layout.css' && !afterIcons.includes(file));
if (missingTail.length) {
    throw new Error('Camadas visuais obrigatorias ausentes do HTML: ' + missingTail.join(', '));
}
const themeFiles = [
    ...afterIcons.filter((file) => !TAIL_CSS.includes(file)),
    ...RUNTIME_CSS_BEFORE_TAIL,
    ...TAIL_CSS
];
const bundleFiles = [...beforeIcons, ...themeFiles];
if (!beforeIcons.length || !afterIcons.length || new Set(bundleFiles).size !== bundleFiles.length) {
    throw new Error('Manifesto CSS vazio ou contendo arquivos duplicados.');
}

function renderBundle(files) {
    return files.map((file) => {
        const source = fs.readFileSync(path.join(ROOT, file), 'utf8').replace(/^\uFEFF/, '');
        if (/^\s*@import\s/m.test(source) || /^\s*@charset\s/m.test(source)) {
            throw new Error('CSS com @import/@charset exige tratamento explicito: ' + file);
        }
        return '/* BEGIN ' + file + ' */\n' + source + '\n/* END ' + file + ' */\n';
    }).join('\n');
}

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
for (const file of ROOT_FILES) {
    fs.copyFileSync(path.join(ROOT, file), path.join(OUT, file));
}
for (const dir of RUNTIME_DIRS) {
    fs.cpSync(path.join(ROOT, dir), path.join(OUT, dir), { recursive: true });
}
fs.writeFileSync(path.join(OUT, 'css/wwm-core.bundle.css'), renderBundle(beforeIcons));
fs.writeFileSync(path.join(OUT, 'css/wwm-theme.bundle.css'), renderBundle(themeFiles));

// Folhas-fonte continuam versionadas no repositorio para manutencao, mas
// nao devem ser publicadas novamente depois de incorporadas aos bundles.
// As injecoes dinamicas correspondentes ja possuem o guard
// data-wwm-styles-bundled no runtime de producao.
for (const file of bundleFiles) {
    const duplicate = path.join(OUT, file);
    if (!fs.existsSync(duplicate)) {
        throw new Error('CSS consolidado ausente do artefato: ' + file);
    }
    fs.rmSync(duplicate);
}

const emitted = { core: false, theme: false };
let builtHtml = html.replace(LINK_RE, (tag, offset) => {
    if (!pathFromTag(tag)) return tag;
    const group = offset < iconPosition ? 'core' : 'theme';
    if (emitted[group]) return '';
    emitted[group] = true;
    return '<link rel="stylesheet" href="css/wwm-' + group + '.bundle.css?v=' + version + '" data-wwm-css-bundle="' + group + '">';
});
if (!emitted.core || !emitted.theme || !builtHtml.includes('<html lang="pt-BR">')) {
    throw new Error('Falha ao criar as referencias dos bundles CSS.');
}
builtHtml = builtHtml.replace('<html lang="pt-BR">', '<html lang="pt-BR" data-wwm-styles-bundled="true">');
fs.writeFileSync(path.join(OUT, 'index.html'), builtHtml);

let insertedBundles = false;
let builtWorker = worker.replace(/^\s*'\.\/css\/[^']+\.css',\r?\n/gm, () => {
    if (insertedBundles) return '';
    insertedBundles = true;
    return "    './css/wwm-core.bundle.css',\n    './css/wwm-theme.bundle.css',\n";
});
if (!insertedBundles) {
    throw new Error('Precache CSS do Service Worker nao foi identificado.');
}
// O Service Worker carrega apenas os entrypoints de producao ativos.
const inactivePages = new Set([
    './js/pages/dashboard.js',
    './js/pages/relatorios.js'
]);
// O navigation-master.js continua sendo carregado pelo fallback de
// premium-plus.js e deve permanecer disponivel no cache offline.
builtWorker = builtWorker.split('\n').filter((line) => {
    const entry = line.trim().replace(/,$/, '').replace(/^['"]|['"]$/g, '');
    // Arquivos CSS ja estao nos bundles e nao existem em dist/css separadamente.
    if (entry.startsWith('./css/') && entry.endsWith('.css')
        && bundleFiles.includes(entry.slice(2))) return false;
    return !inactivePages.has(entry);
}).join('\n');
// Folhas de versoes antigas sem importacao no HTML, precache ou carregador
// de producao. Os fontes permanecem no Git para auditoria e rollback.
const inactiveStyles = [
    'css/wwm-dashboard-v57.css',
    'css/wwm-dashboard-v58.css'
];
for (const obsolete of inactiveStyles) {
    const relative = './' + obsolete;
    if (html.includes(obsolete) || worker.includes(relative) || bundleFiles.includes(obsolete)) {
        throw new Error('Estilo historico ainda referenciado: ' + obsolete);
    }
    const target = path.join(OUT, obsolete);
    if (fs.existsSync(target)) fs.rmSync(target);
}

// Rotas antigas sem consumidores no mapa do App nao devem compor o deploy.
// Os fontes antigos permanecem no Git para rollback e comparacao funcional.
for (const legacyPage of ['js/pages/dashboard.js', 'js/pages/relatorios.js']) {
    const legacy = path.join(OUT, legacyPage);
    if (fs.existsSync(legacy)) fs.rmSync(legacy);
}
fs.writeFileSync(path.join(OUT, 'service-worker.js'), builtWorker);

console.log('Build ' + version + ': ' + bundleFiles.length + ' CSS consolidados em 2 bundles.');
