const fs = require('fs');
const path = require('path');

describe('Navegação consolidada WWM v58', () => {
    const root = path.resolve(__dirname, '..');
    const navigation = fs.readFileSync(path.join(root, 'js/navigation-master-v55.js'), 'utf8');
    const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    const serviceWorker = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');

    test('mantém relatórios como módulo único e sem atalhos duplicados', () => {
        expect(navigation).toContain("relatorios: { label: 'Histórico e análises'");
        expect(navigation).not.toContain('Custo por Peça');
        expect(navigation).not.toContain('Custo por Técnico');
        expect(navigation).not.toContain('Custo por Mês');
    });

    test('segue a organização WWM na navegação global', () => {
        ['MENU PRINCIPAL', 'CADASTROS', 'SISTEMA'].forEach((label) => expect(navigation).toContain(label));
        expect(navigation).toContain("dashboard: { label: 'Início'");
        expect(navigation).toContain("aprovacoes: { label: 'Pendências'");
        expect(navigation).toContain('nav-item-home');
        expect(navigation).not.toContain('nav-group-pinned');
    });

    test('trata dashboard como rota canônica e preserva rotas administrativas', () => {
        ['dashboard', 'solicitacoes', 'aprovacoes', 'pecas', 'tecnicos', 'fornecedores', 'relatorios', 'configuracoes'].forEach((route) => {
            expect(navigation).toContain(`${route}: {`);
        });
        expect(navigation).not.toContain("dashboard: { pageId: 'solicitacoes' }");
        expect(navigation).toContain("'visao-geral': { pageId: 'dashboard' }");
    });

    test('carrega navegação antes do controlador da aplicação', () => {
        expect(index.indexOf('navigation-master-v55.js')).toBeLessThan(index.indexOf('js/app.js'));
        expect(index).toContain('js/navigation-master-v55.js');
        expect(index).toContain('js/premium-release-v55.js');
    });

    test('mantém suporte offline na versão v58', () => {
        expect(serviceWorker).toContain("const CACHE_VERSION = 'v58-wwm-hardwired'");
        expect(serviceWorker).toContain("'./js/navigation-master-v55.js'");
        expect(serviceWorker).toContain("'./js/components/dashboard-wwm-v58.js'");
        expect(serviceWorker).toContain("'./css/wwm-dashboard-v58.css'");
        expect(serviceWorker).toContain("'./js/components/reports-multi-select.js'");
    });
});
