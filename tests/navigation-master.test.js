const fs = require('fs');
const path = require('path');

describe('Navegação consolidada', () => {
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

    test('inclui os grupos administrativos e a visão operacional fixa', () => {
        ['VISÃO OPERACIONAL', 'OPERAÇÃO', 'CUSTOS E ANÁLISES', 'CADASTROS', 'CONFIGURAÇÕES'].forEach((label) => {
            expect(navigation).toContain(label);
        });
        expect(navigation).toContain('nav-group-pinned');
        expect(navigation).toContain('nav-item-home');
    });

    test('trata dashboard como rota canônica e preserva rotas administrativas', () => {
        ['dashboard', 'solicitacoes', 'aprovacoes', 'pecas', 'tecnicos', 'fornecedores', 'relatorios', 'configuracoes'].forEach((route) => {
            expect(navigation).toContain(`${route}: {`);
        });
        expect(navigation).not.toContain("dashboard: { pageId: 'solicitacoes' }");
        expect(navigation).toContain("'visao-geral': { pageId: 'dashboard' }");
    });

    test('carrega a navegação v55 antes do controlador da aplicação', () => {
        expect(index).toContain('js/navigation-master-v55.js?v=20260828c');
        expect(index.indexOf('navigation-master-v55.js')).toBeLessThan(index.indexOf('js/app.js'));
        expect(index).toContain('js/premium-release-v55.js?v=20260828c');
    });

    test('mantém suporte offline na versão de cache v55', () => {
        expect(serviceWorker).toContain("const CACHE_VERSION = 'v55-premium-production'");
        expect(serviceWorker).toContain("'./js/navigation-master-v55.js'");
        expect(serviceWorker).toContain("'./js/components/reports-multi-select.js'");
        expect(serviceWorker).toContain("'./css/premium-release-v55.css'");
        expect(serviceWorker).toContain("'./js/components/dashboard-premium-v55.js'");
    });
});
