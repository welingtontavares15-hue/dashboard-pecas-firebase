// Teste de layout em navegador real: nenhuma tela principal pode ter conteúdo
// saindo da área visível (o body usa overflow-x: clip, então o problema fica
// escondido em vez de gerar rolagem). Usa dados sintéticos e não acessa o Firebase.
const test = require('node:test');
const assert = require('node:assert/strict');
const { existsSync, createReadStream, statSync } = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const puppeteer = require('puppeteer');

const ROOT = process.env.WWM_TEST_ROOT ? path.resolve(process.env.WWM_TEST_ROOT) : path.join(__dirname, '..');
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
        tecnicoId: i % 2 ? 't2' : 't1', tecnicoNome: i % 2 ? 'Técnica Sintética' : 'Técnico Sintético', fornecedorId: 'sup-ebst', fornecedorNome: 'Fornecedor Sintético',
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
        [K.TECHNICIANS]: [{ id: 't1', nome: 'Técnico Sintético', regiao: 'SP', ativo: true }, { id: 't2', nome: 'Técnica Sintética', regiao: 'MG', ativo: true }],
        [K.SUPPLIERS]: [{ id: 'sup-ebst', nome: 'Fornecedor Sintético', ativo: true }],
        [K.PARTS]: Array.from({ length: 12 }, (_, i) => ({ id: 'p' + i, codigo: 'P10' + i, descricao: 'Peça sintética ' + i, valor: 150 + i * 30, fornecedorId: 'sup-ebst', ativo: true })),
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
    // Valores dos indicadores precisam aparecer inteiros (ex.: "R$ 12.360,0" cortado).
    document.querySelectorAll('#content-area :is(.kpi-value, .report-summary-card strong, .v59-kpi > strong)').forEach((value) => {
        const card = value.closest('.kpi-card, .report-summary-card, .v59-kpi');
        if (!card || !value.textContent.trim()) return;
        const range = document.createRange();
        range.selectNodeContents(value);
        const textRight = range.getBoundingClientRect().right;
        const innerRight = card.getBoundingClientRect().right - parseFloat(getComputedStyle(card).paddingRight);
        if (textRight > innerRight + 1) issues.push(`indicador cortado: "${value.textContent.trim()}" (+${Math.round(textRight - innerRight)}px)`);
    });
    return issues;
}

test('real browser: telas principais sem conteúdo cortado em celular, tablet e desktop', { timeout: 480000 }, async () => {
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
            { role: 'tecnico', pages: ['solicitacoes'] },
            { role: 'fornecedor', pages: ['fornecedor'] }
        ];
        // 1024: notebook pequeno/tablet na horizontal (o menu sumia e deixava faixa vazia).
        const widths = [390, 768, 1024, 1280, 1440];
        const failures = [];

        // Valida o login como uma tela própria. A versão anterior aparecia
        // achatada no desktop apesar dos testes de páginas autenticadas.
        for (const width of widths) {
            const loginPage = await browser.newPage();
            await loginPage.setViewport({ width, height: 900 });
            await loginPage.evaluateOnNewDocument(() => {
                if (navigator.serviceWorker) navigator.serviceWorker.register = () => new Promise(() => {});
            });
            await loginPage.setRequestInterception(true);
            loginPage.on('request', req => (req.url().startsWith('http://127.0.0.1') ? req.continue() : req.abort()));
            await loginPage.goto(base, { waitUntil: 'load' });
            // Espera o App.init terminar: ele chama showLogin()/showApp() de forma assíncrona e,
            // se ainda estiver rodando, sobrescreve a tela no meio da medição.
            await loginPage.waitForFunction(() => typeof App !== 'undefined' && App.isBootstrapping === false, { timeout: 20000 });
            await loginPage.evaluate(() => App.showLogin());
            // No modo fonte, wwm-reference-ui reordena os <link> do <head>; reinserir uma
            // folha de estilo a recarrega e por alguns ms suas regras não valem. Espera
            // todas as folhas carregadas e dois quadros antes de medir.
            await loginPage.evaluate(() => new Promise((resolve) => {
                const settle = () => requestAnimationFrame(() => requestAnimationFrame(resolve));
                const pending = [...document.querySelectorAll('link[rel="stylesheet"]')].filter((link) => !link.sheet);
                if (!pending.length) return setTimeout(settle, 250);
                Promise.all(pending.map((link) => new Promise((done) => { link.addEventListener('load', done, { once: true }); link.addEventListener('error', done, { once: true }); })))
                    .then(() => setTimeout(settle, 250));
            }));
            const geometry = await loginPage.evaluate(() => {
                const card = document.querySelector('#login-screen .login-card');
                const header = card?.querySelector('.wwm-login-header');
                const shell = document.querySelector('#login-screen .premium-login-shell');
                const field = document.querySelector('#login-username');
                const submit = document.querySelector('#login-submit');
                const footer = card?.querySelector('.premium-login-form-footer');
                const screen = document.querySelector('#login-screen');
                if (![card, header, shell, field, submit, footer, screen].every(Boolean)) return { missing: true };
                const bounds = el => el.getBoundingClientRect();
                return {
                    width: bounds(card).width,
                    height: bounds(card).height,
                    headerHeight: bounds(header).height,
                    left: bounds(card).left,
                    right: bounds(card).right,
                    bottom: bounds(card).bottom,
                    shellWidth: bounds(shell).width,
                    screenWidth: bounds(screen).width,
                    fieldHeight: bounds(field).height,
                    submitHeight: bounds(submit).height,
                    footerBottom: bounds(footer).bottom
                };
            });
            if (geometry.missing) failures.push(`${width}px login: estrutura do cartão incompleta`);
            else {
                if (geometry.left < -1 || geometry.right > width + 1) failures.push(`${width}px login: cartão sai da viewport`);
                if (geometry.footerBottom > geometry.bottom + 2) failures.push(`${width}px login: rodapé além da borda inferior`);
                if (geometry.fieldHeight < 43 || geometry.submitHeight < 43) failures.push(`${width}px login: campos ou botão comprimidos`);
                if (width >= 721) {
                    if (geometry.width < 570 || geometry.width > 602) failures.push(`${width}px login: largura desktop incorreta ${Math.round(geometry.width)}px`);
                    if (geometry.height < 560) failures.push(`${width}px login: cartão ainda achatado (${Math.round(geometry.height)}px)`);
                    if (geometry.headerHeight < 91) failures.push(`${width}px login: cabeçalho comprimido (${Math.round(geometry.headerHeight)}px)`);
                }
            }
            await loginPage.close();
        }

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
                await page.waitForFunction(() => typeof App !== 'undefined' && typeof DataManager !== 'undefined' && App.isBootstrapping === false, { timeout: 20000 });
                await page.evaluate(`(${seedSyntheticData.toString()})()`);
                await page.evaluate((currentRole) => {
                    const users = {
                        tecnico: { id: 'u2', username: 'tecnico.sintetico', name: 'Técnico Sintético', role: 'tecnico', tecnicoId: 't1' },
                        fornecedor: { id: 'u3', username: 'fornecedor.sintetico', name: 'Fornecedor Sintético', role: 'fornecedor', fornecedorId: 'sup-ebst' },
                        administrador: { id: 'u1', username: 'gestor.sintetico', name: 'Gestor Sintético', role: 'administrador' }
                    };
                    Auth.currentUser = { ...users[currentRole], expiresAt: Date.now() + 1e7 };
                    App.showApp();
                }, role);

                // Estrutura: ou o menu lateral está visível e o conteúdo começa depois
                // dele, ou o menu está fechado, o conteúdo ocupa a largura e existe o
                // botão para abri-lo. Também valida o selo de sincronização real.
                await new Promise(resolve => setTimeout(resolve, 600));
                const shell = await page.evaluate(() => {
                    const problems = [];
                    const sidebar = document.getElementById('sidebar').getBoundingClientRect();
                    const main = document.querySelector('.main-content').getBoundingClientRect();
                    const menuBtn = document.getElementById('mobile-menu-btn').getBoundingClientRect();
                    const sidebarVisible = sidebar.right > 1 && sidebar.width > 0;
                    if (sidebarVisible && main.left < sidebar.right - 1) problems.push('conteúdo por baixo do menu lateral');
                    if (!sidebarVisible && main.left > 1) problems.push(`faixa vazia de ${Math.round(main.left)}px sem menu`);
                    if (!sidebarVisible && !(menuBtn.width > 0 && menuBtn.height > 0)) problems.push('menu fechado e sem botão para abrir');
                    const sync = document.querySelector('.main-header .sync-status');
                    if (sync && sync.dataset.syncState !== 'ok' && /Sincronizado/.test(sync.textContent)) problems.push('selo diz "Sincronizado" sem nuvem');
                    return problems;
                });
                shell.forEach((problem) => failures.push(`${width}px ${role} estrutura: ${problem}`));

                for (const pageId of pages) {
                    await page.evaluate(id => App.navigate(id), pageId);
                    await new Promise(resolve => setTimeout(resolve, 700));
                    const issues = await page.evaluate(`(${collectOverflow.toString()})()`);
                    if (issues.length) failures.push(`${width}px ${role} ${pageId}: ${issues.slice(0, 3).join(' | ')}`);

                    // Contagem não pode aparecer duplicada ("X encontradas" + "Exibindo X de Y").
                    const duplicateCount = await page.evaluate(() => [...document.querySelectorAll('#content-area .filter-context-summary .helper-text')]
                        .some((node) => /encontrad/.test(node.textContent)));
                    if (duplicateCount) failures.push(`${width}px ${role} ${pageId}: contagem de resultados duplicada`);

                    // Regressão mobile: os checkboxes dos filtros de relatórios não
                    // podem ocupar 100% e empurrar os rótulos para fora da lista.
                    if (pageId === 'relatorios' && role === 'administrador' && width <= 768) {
                        const filterProblems = await page.evaluate(() => {
                            const problems = [];
                            const validate = (selector, label) => {
                                const filter = document.querySelector(selector);
                                const options = filter?.querySelector('.status-filter-options, .premium-multi-filter-options');
                                if (!filter || !options || !options.children.length) {
                                    problems.push(label + ': lista de opções ausente');
                                    return;
                                }
                                if (options.scrollWidth > options.clientWidth + 2) {
                                    problems.push(label + ': rolagem horizontal na lista');
                                }
                                options.querySelectorAll('label').forEach((row) => {
                                    const checkbox = row.querySelector('input[type="checkbox"]');
                                    const text = row.querySelector('span:not(.status-badge)');
                                    if (!checkbox || !text || !text.textContent.trim()) {
                                        problems.push(label + ': checkbox ou texto ausente');
                                        return;
                                    }
                                    const box = checkbox.getBoundingClientRect();
                                    const words = text.getBoundingClientRect();
                                    const bounds = options.getBoundingClientRect();
                                    if (box.width > 24 || box.height > 24) problems.push(label + ': checkbox ampliado');
                                    if (words.width < 12 || words.right > bounds.right + 2 || words.left < bounds.left - 2) {
                                        problems.push(label + ': rótulo cortado ou deslocado');
                                    }
                                });
                            };
                            const status = document.querySelector('[data-status-filter="report-status"]');
                            if (!status) problems.push('status: seletor ausente');
                            else {
                                status.classList.add('open');
                                validate('[data-status-filter="report-status"]', 'status');
                                status.classList.remove('open');
                            }
                            const shell = document.querySelector('.ri-filters');
                            shell?.classList.replace('is-collapsed', 'is-expanded');
                            const technician = document.querySelector('[data-premium-multi-filter="report-tecnicos"]');
                            if (!technician) problems.push('técnico: seletor ausente');
                            else {
                                technician.classList.add('open');
                                validate('[data-premium-multi-filter="report-tecnicos"]', 'técnico');
                                technician.classList.remove('open');
                            }
                            shell?.classList.replace('is-expanded', 'is-collapsed');
                            return [...new Set(problems)];
                        });
                        filterProblems.forEach(problem => failures.push(`${width}px relatorios: ${problem}`));
                    }

                    // Cada lista de filtro (Cliente, Técnico, Fornecedor, Região...) precisa
                    // abrir inteira dentro da tela e logo abaixo do próprio botão. No celular a
                    // da coluna direita saía da tela; no tablet/desktop, a do último campo.
                    if (pageId === 'relatorios' && role === 'administrador') {
                        const popoverProblems = await page.evaluate(async () => {
                            const problems = [];
                            const toggle = document.querySelector('.ri-filters.is-collapsed .ri-filters-toggle');
                            toggle?.click();
                            await new Promise((resolve) => setTimeout(resolve, 300));
                            for (const trigger of document.querySelectorAll('.premium-report-filter-grid [data-premium-multi-trigger]')) {
                                trigger.click();
                                await new Promise((resolve) => setTimeout(resolve, 120));
                                const filter = trigger.closest('[data-premium-multi-filter]');
                                const popover = filter?.querySelector('[data-premium-multi-popover]');
                                const name = filter?.querySelector('label')?.textContent.trim() || filter?.dataset.premiumMultiFilter;
                                const box = popover?.getBoundingClientRect();
                                const button = trigger.getBoundingClientRect();
                                if (!box || !box.width) problems.push(`${name}: lista não abriu`);
                                else {
                                    if (box.left < -1 || box.right > window.innerWidth + 1) problems.push(`${name}: lista sai da tela (${Math.round(box.left)}–${Math.round(box.right)})`);
                                    if (box.top < button.bottom - 2) problems.push(`${name}: lista abre por cima do botão`);
                                }
                                document.body.click();
                                await new Promise((resolve) => setTimeout(resolve, 60));
                            }
                            if (toggle) document.querySelector('.ri-filters.is-expanded .ri-filters-toggle')?.click();
                            return problems;
                        });
                        popoverProblems.forEach(problem => failures.push(`${width}px relatorios: ${problem}`));
                    }

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

                if (role === 'administrador' && width >= 1280) {
                    // Rodapé do menu: o nome não pode quebrar no meio nem ser cortado
                    // ("Administrad/or"), e com o menu recolhido nada pode sair da moldura.
                    const footer = await page.evaluate(async () => {
                        const problems = [];
                        const name = document.getElementById('user-name');
                        name.textContent = 'Administrador';
                        await new Promise((resolve) => setTimeout(resolve, 50));
                        if (name.getClientRects().length > 1 || name.getBoundingClientRect().height > 22) problems.push('nome do usuário quebrou em mais de uma linha');
                        if (name.scrollWidth > name.clientWidth + 1) problems.push('nome do usuário cortado');
                        App.toggleSidebar();
                        await new Promise((resolve) => setTimeout(resolve, 400));
                        const box = document.querySelector('#sidebar .sidebar-footer').getBoundingClientRect();
                        document.querySelectorAll('#sidebar .sidebar-footer :is(button, .user-avatar)').forEach((node) => {
                            const rect = node.getBoundingClientRect();
                            if (rect.width && (rect.left < box.left - 1 || rect.right > box.right + 1)) problems.push('menu recolhido: botão fora do rodapé');
                        });
                        App.toggleSidebar();
                        await new Promise((resolve) => setTimeout(resolve, 300));
                        return [...new Set(problems)];
                    });
                    footer.forEach((problem) => failures.push(`${width}px rodapé do menu: ${problem}`));
                }

                if (role === 'administrador') {
                    // Sub-abas de Relatórios também não podem cortar conteúdo.
                    for (const tab of ['pecas', 'tecnicos', 'meses', 'historico']) {
                        await page.evaluate(id => App.navigate('relatorios').then(() => Relatorios.switchReport(id)), tab);
                        await new Promise(resolve => setTimeout(resolve, 700));
                        const issues = await page.evaluate(`(${collectOverflow.toString()})()`);
                        if (issues.length) failures.push(`${width}px relatorios/${tab}: ${issues.slice(0, 3).join(' | ')}`);
                    }

                    if (width === 1440) {
                        // Custo aprovado precisa respeitar o filtro de técnico (antes ignorava
                        // os filtros de seleção múltipla e mostrava o total geral).
                        const result = await page.evaluate(async () => {
                            Relatorios.switchReport('visao-geral');
                            const all = Relatorios.buildCostAnalysis();
                            const expected = (all.byTechnician || []).find((row) => row.nome === 'Técnica Sintética');
                            Relatorios.toggleAdvancedFilters?.();
                            const box = [...document.querySelectorAll('input[type="checkbox"]')].find((input) => input.value === 't2');
                            if (!box || !expected) return { error: 'filtro de técnico ou dados indisponíveis' };
                            box.checked = true;
                            Relatorios.applyFilters();
                            await new Promise((resolve) => setTimeout(resolve, 300));
                            const filtered = Relatorios.buildCostAnalysis();
                            Relatorios.clearFilters();
                            return { expected: expected.totalCost, got: filtered.totalCost, total: all.totalCost };
                        });
                        if (result.error) failures.push(`relatorios: ${result.error}`);
                        else if (result.got !== result.expected || result.got === result.total) {
                            failures.push(`relatorios: custo com filtro de técnico = ${result.got}, esperado ${result.expected} (total ${result.total})`);
                        }
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
                    if (opened) {
                        // Testa precisamente o indicador que ficava com
                        // "Identificação / Peças / Revisão" sobrepostos.
                        for (const step of [0, 1]) {
                            if (step === 1) {
                                await page.evaluate(() => document.getElementById('wwm-request-next')?.click());
                                await new Promise(resolve => setTimeout(resolve, 100));
                            }
                            const overlap = await page.evaluate(() => {
                                const indicator = document.getElementById('wwm-request-progress');
                                if (!indicator) return ['indicador de etapas ausente'];
                                const cells = Array.from(indicator.children);
                                if (cells.length !== 3) return ['indicador não contém exatamente 3 etapas'];
                                const errors = [];
                                const row = indicator.getBoundingClientRect();
                                cells.forEach((cell, i) => {
                                    const bounds = cell.getBoundingClientRect();
                                    const label = cell.querySelector('.wwm-request-step-label');
                                    const labelBounds = label?.getBoundingClientRect();
                                    if (!label || !label.textContent.trim()) errors.push('rótulo da etapa ' + i + ' ausente');
                                    if (bounds.left < row.left - 1 || bounds.right > row.right + 1) errors.push('etapa ' + i + ' fora da grade');
                                    if (labelBounds && (labelBounds.left < bounds.left - 1 || labelBounds.right > bounds.right + 1)) errors.push('texto da etapa ' + i + ' sai da célula');
                                    if (i > 0 && bounds.left < cells[i - 1].getBoundingClientRect().right - 1) errors.push('etapas ' + (i - 1) + ' e ' + i + ' sobrepostas');
                                });
                                return errors;
                            });
                            for (const error of overlap) failures.push(`${width}px tecnico etapa ${step + 1}: ${error}`);
                        }
                    }
                }
                if (role === 'administrador') {
                    // Estados interativos de Solicitações: lista de status, menu "…" da
                    // linha e janela de detalhes (regressões da revisão v97).
                    await page.evaluate(() => { Utils.closeModal(); return App.navigate('solicitacoes'); });
                    await new Promise(resolve => setTimeout(resolve, 800));
                    const interactive = await page.evaluate(async () => {
                        const problems = [];
                        const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
                        // 1) Filtro de status: nome inteiro, sem repetir o texto na etiqueta.
                        const panel = document.getElementById('sol-filter-panel');
                        if (panel) panel.open = true;
                        Solicitacoes.toggleStatusDropdown('sol-status-filter');
                        await pause(150);
                        document.querySelectorAll('[data-status-dropdown="sol-status-filter"] .status-filter-option').forEach((option) => {
                            const text = option.querySelector('span:not(.status-badge)');
                            const badge = option.querySelector('.status-badge');
                            const box = option.getBoundingClientRect();
                            if (!text || !text.textContent.trim()) problems.push('status: opção sem nome');
                            else if (text.getBoundingClientRect().right > box.right + 1) problems.push(`status: "${text.textContent.trim()}" cortado`);
                            if (badge && badge.getBoundingClientRect().width > 14) problems.push('status: nome repetido na etiqueta');
                        });
                        document.body.click();
                        await pause(100);
                        // 2) Menu "…" de uma linha: inteiro na tela, por cima da lista, com os nomes.
                        const summary = document.querySelector('#sol-table-container details.premium-row-menu > summary');
                        if (summary) {
                            summary.scrollIntoView({ block: 'center', behavior: 'instant' });
                            await pause(250);
                            summary.click();
                            await pause(250);
                            const menu = document.querySelector('.premium-row-menu-popover.is-floating');
                            if (!menu) problems.push('menu da linha: não abriu');
                            else {
                                const box = menu.getBoundingClientRect();
                                if (box.left < 0 || box.right > window.innerWidth || box.top < 0 || box.bottom > window.innerHeight) problems.push('menu da linha: sai da tela');
                                const top = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
                                if (!top || !top.closest('.premium-row-menu-popover')) problems.push('menu da linha: encoberto');
                                menu.querySelectorAll('.btn').forEach((button) => {
                                    const label = button.querySelector('span');
                                    if (!label || label.getBoundingClientRect().width < 20) problems.push('menu da linha: opção só com ícone');
                                });
                            }
                            document.body.click();
                            await pause(100);
                            if (document.querySelector('.premium-row-menu-popover.is-floating')) problems.push('menu da linha: não fechou');
                        }
                        // 3) Detalhes: tabela de itens cabe na janela e não há vazio sob "Itens".
                        const first = DataManager.getSolicitations()[0];
                        Solicitacoes.viewDetails(first.id);
                        await pause(350);
                        const modal = document.getElementById('modal-content');
                        const body = modal.querySelector('.modal-body');
                        if (body.scrollWidth > body.clientWidth + 2) problems.push('detalhes: conteúdo mais largo que a janela');
                        const itemsTable = [...modal.querySelectorAll('.table-container')].pop();
                        if (itemsTable && itemsTable.scrollWidth > itemsTable.clientWidth + 2) problems.push('detalhes: tabela de itens cortada na lateral');
                        const heading = [...modal.querySelectorAll('.modal-body h4')].find((node) => node.textContent.trim() === 'Itens');
                        if (heading && itemsTable && itemsTable.getBoundingClientRect().top - heading.getBoundingClientRect().bottom > 48) problems.push('detalhes: espaço vazio entre "Itens" e a tabela');
                        const close = modal.querySelector('.modal-close');
                        if (!close || !close.getAttribute('aria-label')) problems.push('detalhes: botão fechar sem nome');
                        Utils.closeModal();
                        return [...new Set(problems)];
                    });
                    interactive.forEach((problem) => failures.push(`${width}px solicitacoes: ${problem}`));
                }

                if (role === 'fornecedor') {
                    // Portal do fornecedor: cada pedido a despachar tem os dois campos
                    // (data do envio e nº do rastreio) e o botão, inteiros na tela.
                    const shipment = await page.evaluate(() => {
                        const problems = [];
                        const forms = [...document.querySelectorAll('#content-area .supplier-shipment-form')];
                        if (!forms.length) return ['nenhum pedido com campos de envio'];
                        const limit = document.getElementById('content-area').getBoundingClientRect();
                        forms.forEach((form) => {
                            const date = form.querySelector('input[type="date"][data-supplier-shipping-date]');
                            const code = form.querySelector('input[type="text"][data-supplier-tracking]');
                            const save = form.querySelector('.supplier-shipment-save');
                            if (!date || !code || !save) { problems.push('faltam data do envio, rastreio ou botão'); return; }
                            if (!date.value || date.max !== Utils.getLocalDateString()) problems.push('data do envio sem valor inicial ou sem limite em hoje');
                            [['data do envio', date, 128], ['rastreio', code, 110], ['botão', save, 100]].forEach(([name, node, minWidth]) => {
                                const rect = node.getBoundingClientRect();
                                if (rect.width < minWidth) problems.push(`${name} estreito (${Math.round(rect.width)}px)`);
                                if (rect.left < limit.left - 1 || rect.right > limit.right + 1) problems.push(`${name} fora da área visível`);
                            });
                            if (!form.querySelector(`label[for="${date.id}"]`) || !form.querySelector(`label[for="${code.id}"]`)) problems.push('campo sem rótulo');
                        });
                        return [...new Set(problems)];
                    });
                    shipment.forEach((problem) => failures.push(`${width}px fornecedor: ${problem}`));
                }

                if (role === 'tecnico') {
                    // Itens do pedido no formulário: campo de quantidade utilizável e
                    // nada saindo do cartão (ficava espremido/cortado).
                    const itemProblems = await page.evaluate(async () => {
                        const problems = [];
                        const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
                        Utils.closeModal();
                        Solicitacoes.openForm();
                        await pause(500);
                        const set = (id, value) => {
                            const el = document.getElementById(id);
                            if (!el) return;
                            el.value = value;
                            el.dispatchEvent(new Event('input', { bubbles: true }));
                            el.dispatchEvent(new Event('change', { bubbles: true }));
                        };
                        set('sol-cliente', 'Cliente sintético');
                        set('sol-divisao', 'IN');
                        set('sol-fornecedor-sel', 'sup-ebst');
                        await pause(150);
                        document.getElementById('wwm-request-next')?.click();
                        await pause(250);
                        const part = DataManager.getParts()[0];
                        Solicitacoes.addItem({ ...part, descricao: 'Sensor de capô conjunto completo com chicote sintético', valorUnit: part.valor });
                        await pause(250);
                        const row = document.querySelector('#items-list .wwm-item-row');
                        if (!row || !row.getBoundingClientRect().width) return ['formulário: item adicionado não aparece na etapa Peças'];
                        const bounds = row.getBoundingClientRect();
                        row.querySelectorAll('*').forEach((node) => {
                            const rect = node.getBoundingClientRect();
                            if (rect.width && (rect.left < bounds.left - 1 || rect.right > bounds.right + 1)) problems.push('formulário: conteúdo do item sai do cartão');
                        });
                        const qty = row.querySelector('.item-qty').getBoundingClientRect();
                        const desc = row.querySelector('.item-desc').getBoundingClientRect();
                        if (qty.width < 56 || qty.width > 140) problems.push(`formulário: campo de quantidade com ${Math.round(qty.width)}px`);
                        if (desc.width < 150) problems.push(`formulário: descrição do item espremida (${Math.round(desc.width)}px)`);
                        Utils.closeModal();
                        return [...new Set(problems)];
                    });
                    itemProblems.forEach((problem) => failures.push(`${width}px tecnico ${problem}`));
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
