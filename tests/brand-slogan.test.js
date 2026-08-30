const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css/brand-slogan.css'), 'utf8');

describe('Padrao do slogan Diversey / Solenis', () => {
    test('carrega a camada de slogan depois das demais folhas de tema', () => {
        const reference = index.indexOf('css/wwm-reference-theme.css');
        const responsive = index.indexOf('css/responsive-system.css');
        const slogan = index.indexOf('css/brand-slogan.css');
        expect(reference).toBeGreaterThan(-1);
        expect(responsive).toBeGreaterThan(reference);
        expect(slogan).toBeGreaterThan(responsive);
    });

    test('padroniza sidebar e login com o verde corporativo da referencia', () => {
        expect(css).toContain('body.wwm-reference-theme .logo-subtitle');
        expect(css).toContain('body.wwm-reference-theme #login-screen .wwm-brand-copy span');
        expect(css).toContain('body.wwm-reference-theme #login-screen .premium-login-brand-meta span');
        expect(css).toContain('--diversey-solenis-slogan: #00cc99');
        expect(css).toContain('text-transform: uppercase');
    });

    test('mantem o slogan proporcional e subordinado ao wordmark', () => {
        const sidebar = css.match(/body\.wwm-reference-theme \.logo-subtitle\s*\{([\s\S]*?)\}/)?.[1] || '';
        expect(sidebar).toMatch(/font-size:\s*6px\s*!important/);
        expect(sidebar).toMatch(/text-align:\s*center\s*!important/);
        expect(sidebar).toMatch(/width:\s*100%\s*!important/);

        const login = css.match(/body\.wwm-reference-theme #login-screen \.wwm-brand-copy span,[\s\S]*?premium-login-brand-meta span\s*\{([\s\S]*?)\}/)?.[1] || '';
        expect(login).toMatch(/font-size:\s*7px\s*!important/);
        expect(login).toMatch(/text-align:\s*center\s*!important/);
    });

    test('mantem o texto corporativo existente sem alterar logotipo ou navegacao', () => {
        expect(index).toContain('<small class="logo-subtitle">A Solenis Company</small>');
        expect(index).toContain('<span>A Solenis Company</span>');
        expect(css).not.toContain('.logo-title');
        expect(css).not.toContain('.sidebar-brand');
        expect(css).not.toContain('.nav-item');
    });
});
