const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'css/system-ui-master.css'), 'utf8');
const premiumPlus = fs.readFileSync(path.join(root, 'js/premium-plus.js'), 'utf8');
const serviceWorker = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');

describe('System UI Master', () => {
  test('cobre os principais grupos de interface', () => {
    [
      '.page-header',
      '.form-grid',
      '.filter-panel',
      '.table-container',
      '.modal-content',
      '.empty-state',
      '.kpi-grid'
    ].forEach((selector) => expect(css).toContain(selector));
  });

  test('inclui regras responsivas para tablet e celular', () => {
    expect(css).toContain('@media (max-width: 992px)');
    expect(css).toContain('@media (max-width: 680px)');
    expect(css).toContain('grid-template-columns: minmax(0, 1fr)');
  });

  test('preserva acessibilidade e preferencias do usuario', () => {
    expect(css).toContain(':focus');
    expect(css).toContain('prefers-reduced-motion');
    expect(css).toContain('@media print');
  });

  test('carrega a folha mestre somente uma vez', () => {
    expect(premiumPlus).toContain('data-system-ui-master');
    expect(premiumPlus).toContain("css/system-ui-master.css?v=20260729a");
    expect(premiumPlus).toContain('ensureSystemUiMaster()');
  });

  test('mantem o ativo disponivel offline', () => {
    expect(serviceWorker).toContain("const CACHE_VERSION = 'v50-system-ui-master'");
    expect(serviceWorker).toContain("'./css/system-ui-master.css'");
  });
});
