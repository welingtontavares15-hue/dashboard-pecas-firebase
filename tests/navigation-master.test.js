const fs = require('fs');
const path = require('path');

describe('Navegação consolidada WWM v72', () => {
    const root = path.resolve(__dirname, '..');
    const navigation = fs.readFileSync(path.join(root, 'js/navigation-master-v55.js'), 'utf8');
    const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    const serviceWorker = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');

    test('mantém relatórios como módulo único e sem atalhos duplicados', () => {
        expect(navigation).toContain("relatorios: { label: 'Relatórios'");
        expect(navigation).not.toContain('Custo por Peça');
        expect(navigation).not.toContain('Custo por Técnico');
        expect(navigation).not.toContain('Custo por Mês');
    });

    test('segue a organização WWM na navegação global', () => {
        ['PRINCIPAL', 'GESTÃO', 'SISTEMA'].forEach((label) => expect(navigation).toContain(label));
        expect(navigation).toContain("dashboard: { label: 'Visão Geral'");
        expect(navigation).toContain("aprovacoes: { label: 'Aprovações'");
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

    test('mantém suporte offline sincronizado com o contrato visual v72', () => {
        expect(serviceWorker).toContain("const CACHE_VERSION = 'v73-tabelas-resumo'");
        expect(serviceWorker).toContain("'./js/navigation-master-v55.js'");
        expect(serviceWorker).toContain("'./js/components/dashboard-wwm-v59.js'");
        expect(serviceWorker).not.toContain("'./css/wwm-dashboard-v59.css'");
        expect(serviceWorker).toContain("'./js/components/reports-multi-select.js'");
        expect(serviceWorker).toContain("'./css/wwm-reference-theme.css'");
        expect(serviceWorker).toContain("'./css/wwm-visual-standard.css'");
        expect(serviceWorker).toContain("'./css/brand-slogan.css'");
        expect(serviceWorker).toContain("'./css/visual-premium-v4.css'");
        expect(serviceWorker).toContain("'./css/desktop-mobile-premium.css'");
        expect(serviceWorker).toContain("'./css/visual-architecture-v72.css'");
        expect(serviceWorker).toContain("'./js/wwm-reference-ui.js'");
    });
});
