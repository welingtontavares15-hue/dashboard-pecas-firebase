const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

describe('Login WWM - refinamento visual responsivo', () => {
  const html = read('index.html');
  const css = read('css/login-wwm-refinement.css');
  const release = read('js/premium-release-v55.js');
  const worker = read('service-worker.js');

  test('identidade aprovada, acesso e campos preservados', () => {
    expect(html).toContain('css/login-wwm-refinement.css?v=20261108-login1');
    expect(html).toContain('id="login-form"');
    expect(html).toContain('id="login-username"');
    expect(html).toContain('id="login-password"');
    expect(html).toContain('id="toggle-password"');
    expect(html).toContain('id="device-biometric-login"');
    expect(html).toContain('id="passkey-login-btn"');
    expect(html).toContain('id="login-submit"');
    expect(html).toContain('wwm-login-heading-icon');
    expect(release).toContain("title.textContent = 'Entrar no portal'");
    expect(release).toContain('Acesse o sistema para solicitar peças');
    expect(release).toContain('wwm-login-footer-support');
  });

  test('visibilidade da digital continua dependente da prontidao', () => {
    expect(css).toContain('data-state="ready"');
    expect(css).toContain('data-state="busy"');
    expect(css).not.toContain('.device-biometric-panel.hidden { display: flex');
    expect(css).toContain('min-height: 52px');
    expect(css).toContain('min-height: 54px');
    expect(css).toContain('max-width: 560px');
    expect(css).toContain('max-width: 355px');
  });

  test('CSS isolado no login e pre-cache atualizado', () => {
    expect(css).toContain('@layer wwm-ds');
    expect(css).toContain('body.wwm-reference-theme.wwm-ds #login-screen');
    expect(css).not.toContain('body.wwm-ds #sidebar');
    expect(worker).toContain("'./css/login-wwm-refinement.css'");
    expect(html).toContain('Uso interno e seguro');
    expect(html).toContain('Contate o administrador.');
  });
});
