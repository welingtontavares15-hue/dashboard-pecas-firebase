const fs = require('fs');
const path = require('path');

describe('Navegação consolidada', () => {
    const root = path.resolve(__dirname, '..');
    const navigation = fs.readFileSync(path.join(root, 'js/navigation-master.js'), 'utf8');
    const premiumPlus = fs.readFileSync(path.join(root, 'js/premium-plus.js'), 'utf8');
    const serviceWorker = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');

    test('remove atalhos repetidos de relatórios do menu lateral', () => {
        expect(navigation).toContain("{ id: 'relatorios', label: 'Relatórios'");
        expect(navigation).not.toContain('Custo por Peça');
        expect(navigation).not.toContain('Custo por Técnico');
        expect(navigation).not.toContain('Custo por Mês');
    });

    test('mantém os cinco módulos administrativos essenciais', () => {
        ['INÍCIO', 'OPERAÇÃO', 'CADASTROS', 'ANÁLISES', 'SISTEMA'].forEach((label) => {
            expect(navigation).toContain(label);
        });
    });

    test('preserva todas as rotas administrativas', () => {
        ['dashboard', 'solicitacoes', 'aprovacoes', 'pecas', 'tecnicos', 'fornecedores', 'relatorios', 'configuracoes'].forEach((route) => {
            expect(navigation).toContain(`id: '${route}'`);
        });
    });

    test('carrega a navegação após a camada moderna existente', () => {
        expect(premiumPlus).toContain("script.src = 'js/navigation-master.js?v=20260729a'");
        expect(premiumPlus).toContain('Auth.renderMenu(activePage)');
    });

    test('mantém suporte offline', () => {
        expect(serviceWorker).toContain("const CACHE_VERSION = 'v49-navigation-master'");
        expect(serviceWorker).toContain("'./js/navigation-master.js'");
    });
});
