// Teste de layout em navegador real: nenhuma tela principal pode ter conteúdo
// saindo da área visível (o body usa overflow-x: clip, então o problema fica
// escondido em vez de gerar rolagem). Usa dados sintéticos e não acessa o Firebase.
const test = require('node:test');
const assert = require('node:assert/strict');
const { existsSync, createReadStream, statSync } = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const puppeteer = require('puppeteer');

const ROOT = path.join(__dirname, '..');
const MIME = {
    '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript',
    '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json',
    '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2'
};

function startStaticServer() {
    const server = http.createServer((req, res) => {
        const urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
        const filePath = path.normalize(path.join(ROOT, urlPath === '/' ? 'index.html' : urlPath));
        if (!filePath.startsWith(ROOT) || !existsSync(filePath) || statSync(filePath).isDirectory()) {
            res.statusCode = 404;
            return res.end('not found');
        }
        res.setHeader('Content-Type', MIME[path.extname(filePath)] || 'application/octet-stream');
        createReadStream(filePath).pipe(res);
    });
    return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server)));
}

function seedSyntheticData() {
    const now = Date.now();
    const day = 864e5;
    const statuses = ['pendente', 'pendente', 'aprovada', 'em-transito', 'finalizada', 'rejeitada', 'finalizada', 'pendente'];
    const solicitations = statuses.map((status, i) => ({
        id: 's' + i, numero: 'REQ-20261107-000' + (i + 1), status,
        tecnicoId: 't1', tecnicoNome: 'Técnico Sintético', fornecedorId: 'f1', fornecedorNome: 'Fornecedor Sintético',
        cliente: 'Cliente ' + (i + 1), data: new Date(now - i * day).toISOString().slice(0, 10),
        createdAt: now - i * day, updatedAt: now - i * day,
        approvedAt: ['aprovada', 'em-transito', 'finalizada'].includes(status) ? now - i * day : null,
        itens: [{ codigo: 'P10' + i, descricao: 'Peça sintética ' + i, quantidade: 2, valorUnit: 150 + i * 30 }],
        subtotal: 300 + i * 60, desconto: 0, frete: 0, total: 300 + i * 60, divisao: 'F&B',
        timeline: [{ event: 'created', at: now - i * day, by: 'Técnico Sintético' }], audit: { version: 1 }
    }));
    const K = DataManager.KEYS;
    Object.assign(DataManager._sessionCache, {
        [K.USERS]: [
            { id: 'u1', username: 'gestor.sintetico', name: 'Gestor Sintético', role: 'administrador' },
            { id: 'u2', username: 'tecnico.sintetico', name: 'Técnico Sintético', role: 'tecnico', tecnicoId: 't1' }
        ],
        [K.TECHNICIANS]: [{ id: 't1', nome: 'Técnico Sintético', regiao: 'SP', ativo: true }],
        [K.SUPPLIERS]: [{ id: 'f1', nome: 'Fornecedor Sintético', ativo: true }],
        [K.PARTS]: Array.from({ length: 12 }, (_, i) => ({ id: 'p' + i, codigo: 'P10' + i, descricao: 'Peça sintética ' + i, valor: 150 + i * 30, fornecedorId: 'f1', ativo: true })),
        [K.SOLICITATIONS]: solicitations,
        [K.SETTINGS]: {},
        [K.RECENT_PARTS]: {}
    });
}

// Elementos que passam da borda direita da área de conteúdo (ou do cabeçalho)
// sem estarem dentro de um contêiner com rolagem horizontal própria.
function collectOverflow() {
    const issues = [];
    const describe = el => `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}.${[...el.classList].slice(0, 3).join('.')}`;
    const check = (boundary) => {
        if (!boundary) return;
        const limit = boundary.getBoundingClientRect().right + 1;
        boundary.querySelectorAll('*').forEach(el => {
            const rect = el.getBoundingClientRect();
            if (!rect.width || rect.right <= limit) return;
            const style = getComputedStyle(el);
            if (style.position === 'fixed' || style.visibility === 'hidden') return;
            // Conteúdo de menus <details> fechados não é exibido.
            const closedMenu = el.closest('details:not([open])');
            if (closedMenu && !el.closest('summary')) return;
            for (let anc = el.parentElement; anc && anc !== boundary; anc = anc.parentElement) {
                const ox = getComputedStyle(anc).overflowX;
                if ((ox === 'auto' || ox === 'scroll' || ox === 'hidden' || ox === 'clip') && anc.getBoundingClientRect().right <= limit) return;
            }
            issues.push(`${describe(el)} right=${Math.round(rect.right)} > ${Math.round(limit)}`);
        });
    };
    check(document.querySelector('#content-area'));
    check(document.querySelector('.main-header'));
    // A busca do cabeçalho não pode passar por baixo dos controles ao lado.
    const zone = document.querySelector('.main-header .header-search-zone');
    const search = zone?.querySelector('.global-search');
    if (zone && search && zone.getBoundingClientRect().width > 0 && search.getBoundingClientRect().right > zone.getBoundingClientRect().right + 1) {
        issues.push(`global-search right=${Math.round(search.getBoundingClientRect().right)} > zona ${Math.round(zone.getBoundingClientRect().right)}`);
    }
    return issues;
}

test('real browser: telas principais sem conteúdo cortado em celular, tablet e desktop', { timeout: 240000 }, async () => {
    const server = await startStaticServer();
    const base = `http://127.0.0.1:${server.address().port}/index.html`;
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: true,
            executablePath: process.env.PORTAL_CHROME_PATH || (existsSync('/usr/bin/google-chrome') ? '/usr/bin/google-chrome' : '/usr/bin/chromium'),
            args: ['--no-sandbox'] // Navegador isolado e sintético; sem perfil de usuário nem dados reais.
        });

        const scenarios = [
            { role: 'administrador', pages: ['dashboard', 'solicitacoes', 'aprovacoes', 'relatorios', 'pecas', 'configuracoes'] },
            { role: 'tecnico', pages: ['solicitacoes'] }
        ];
        const widths = [390, 768, 1280, 1440];
        const failures = [];

        for (const width of widths) {
            for (const { role, pages } of scenarios) {
                const page = await browser.newPage();
                await page.setViewport({ width, height: 900 });
                // Sem Service Worker: na primeira visita o PWA assume a página e chama
                // location.reload() (controllerchange), o que destrói o contexto no meio
                // do teste e o deixa instável. O layout não depende do SW.
                await page.evaluateOnNewDocument(() => {
                    if (navigator.serviceWorker) navigator.serviceWorker.register = () => new Promise(() => {});
                });
                await page.setRequestInterception(true);
                // Somente arquivos locais: nada de Firebase, CDN ou rede externa.
                page.on('request', req => (req.url().startsWith('http://127.0.0.1') ? req.continue() : req.abort()));
                await page.goto(base, { waitUntil: 'load' });
                await page.waitForFunction(() => typeof App !== 'undefined' && typeof DataManager !== 'undefined', { timeout: 20000 });
                await page.evaluate(`(${seedSyntheticData.toString()})()`);
                await page.evaluate((currentRole) => {
                    Auth.currentUser = currentRole === 'tecnico'
                        ? { id: 'u2', username: 'tecnico.sintetico', name: 'Técnico Sintético', role: 'tecnico', tecnicoId: 't1', expiresAt: Date.now() + 1e7 }
                        : { id: 'u1', username: 'gestor.sintetico', name: 'Gestor Sintético', role: 'administrador', expiresAt: Date.now() + 1e7 };
                    App.showApp();
                }, role);

                for (const pageId of pages) {
                    await page.evaluate(id => App.navigate(id), pageId);
                    await new Promise(resolve => setTimeout(resolve, 700));
                    const issues = await page.evaluate(`(${collectOverflow.toString()})()`);
                    if (issues.length) failures.push(`${width}px ${role} ${pageId}: ${issues.slice(0, 3).join(' | ')}`);

                    if (pageId === 'solicitacoes' && role === 'administrador' && width >= 1280) {
                        // A coluna Ações não pode invadir a coluna Data.
                        const overlap = await page.evaluate(() => {
                            const row = document.querySelector('#sol-table-container tbody tr');
                            const actions = row?.querySelector('.actions');
                            const cell = actions?.closest('td');
                            if (!actions || !cell) return 'tabela de solicitações não renderizada';
                            const a = actions.getBoundingClientRect();
                            const c = cell.getBoundingClientRect();
                            return a.left >= c.left - 1 ? null : `ações começam em ${Math.round(a.left)}, célula em ${Math.round(c.left)}`;
                        });
                        if (overlap) failures.push(`${width}px solicitacoes: ${overlap}`);
                    }
                }

                if (role === 'tecnico' && width < 768) {
                    // O botão "Nova" da barra inferior precisa abrir o formulário,
                    // mesmo depois de a navegação reprocessar os botões várias vezes.
                    await new Promise(resolve => setTimeout(resolve, 600));
                    await page.click('#technician-bottom-navigation button:first-child');
                    await new Promise(resolve => setTimeout(resolve, 900));
                    const opened = await page.evaluate(() => !document.getElementById('modal-container').classList.contains('hidden')
                        && /Nova Solicita/i.test(document.querySelector('#modal-content')?.textContent || ''));
                    if (!opened) failures.push(`${width}px tecnico: botão "Nova" da barra inferior não abriu o formulário`);
                }
                await page.close();
            }
        }

        assert.deepEqual(failures, [], 'Conteúdo cortado/sobreposto:\n' + failures.join('\n'));
    } finally {
        await browser?.close();
        server.close();
    }
});
