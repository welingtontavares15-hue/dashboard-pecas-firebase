const fs = require('fs');
const path = require('path');

const read = (file) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

describe('WWM design system 2027', () => {
    const css = read('css/wwm-design-system.css');
    const html = read('index.html');

    test('é carregado pelo index.html e ativado pela classe wwm-ds no body', () => {
        expect(html).toMatch(/<link rel="stylesheet" href="css\/wwm-design-system\.css\?v=[0-9a-z]+" data-wwm-design-system="true">/);
        expect(html).toMatch(/<body class="[^"]*\bwwm-ds\b[^"]*"/);
    });

    test('fica dentro de uma cascade layer para vencer as camadas históricas sem disputar especificidade', () => {
        expect(css).toContain('@layer wwm-ds {');
        // tokens ficam fora da camada e usam prefixo próprio
        expect(css).toMatch(/:root\s*{[\s\S]*--ds-navy-900:[\s\S]*--ds-green-500:/);
    });

    test('preserva a identidade Diversey/Solenis: azul-marinho, verdes e a tag em verde', () => {
        expect(css).toMatch(/--ds-navy-900:\s*#[0-9a-f]{6}/i);
        expect(css).toMatch(/--ds-lime:\s*#[0-9a-f]{6}/i);
        expect(css).toMatch(/\.dvy-tag,\s*\n\s*body\.wwm-ds \.logo-subtitle\s*{[\s\S]*?color:\s*var\(--ds-lime\)/);
    });

    test('padroniza os cinco status do fluxo com cores próprias', () => {
        ['status-pendente-aprovacao', 'status-aprovado', 'status-em-compra', 'status-concluido', 'status-reprovado']
            .forEach((status) => expect(css).toContain(`.status-badge.${status}`));
    });

    test('não define display em elementos que o JS esconde com .hidden', () => {
        // modais, painel de notificações e overlay de carregamento são alternados via .hidden
        expect(css).not.toMatch(/\.modal-container\s*{[^}]*display:/);
        expect(css).not.toMatch(/\.notification-panel\s*{[^}]*display:/);
        expect(css).not.toMatch(/\.loading-overlay\s*{[^}]*display:/);
    });

    test('é pré-carregado pelo service worker', () => {
        expect(read('service-worker.js')).toContain("'./css/wwm-design-system.css'");
    });

    test('mantém o fundo verde-petróleo do portal (identidade preferida pelos usuários)', () => {
        expect(css).toMatch(/--ds-bg:\s*#01383b/);
        expect(css).toContain('color-scheme: dark !important;');
        const v59 = read('js/components/dashboard-wwm-v59.js');
        expect(v59).toContain('const CHART_THEME = {');
    });
});
