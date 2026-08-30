const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const navigationPath = path.join(root, 'js/navigation-master.js');
const runtimePath = path.join(root, 'js/navigation-consolidation-runtime.js');
const swPath = path.join(root, 'service-worker.js');
const navigationSource = fs.readFileSync(navigationPath, 'utf8');
const runtimeSource = fs.readFileSync(runtimePath, 'utf8');
const swSource = fs.readFileSync(swPath, 'utf8');

function loadNavigation() {
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(navigationSource, sandbox, { filename: 'navigation-master.js' });
  return sandbox.window.NavigationMaster;
}

test('NavigationMaster expõe Histórico no grupo CONSULTA do técnico', () => {
  const nav = loadNavigation();
  const consulta = nav.getGroups('tecnico').find((group) => group.key === 'consulta');
  assert.ok(consulta, 'grupo CONSULTA deve existir');
  assert.deepEqual(Array.from(consulta.items, (item) => item.id), ['historico', 'pecas']);
  assert.equal(consulta.items[0].label, 'Histórico');
  assert.equal(consulta.items[0].icon, 'fa-clock-rotate-left');
});

test('rota Histórico resolve para Solicitações com ação de foco', () => {
  const nav = loadNavigation();
  const route = nav.resolveRoute('historico');
  assert.equal(route.pageId, 'solicitacoes');
  assert.equal(route.action, 'focus-technician-history');
});

test('Histórico é acessível somente ao técnico com permissão de Solicitações', () => {
  const nav = loadNavigation();
  const technician = {
    getRole: () => 'tecnico',
    hasPermission: (module, action) => module === 'solicitacoes' && action === 'view'
  };
  const gestor = {
    getRole: () => 'gestor',
    hasPermission: () => true
  };
  assert.equal(nav.canAccessRoute(technician, 'historico'), true);
  assert.equal(nav.canAccessRoute(gestor, 'historico'), false);
});

test('runtime preserva alias acionável sem removê-lo como duplicata e foca o painel', () => {
  assert.match(runtimeSource, /focus-technician-history/);
  assert.match(runtimeSource, /data-route-action/);
  assert.match(runtimeSource, /item\.dataset\.routeAction/);
  assert.match(runtimeSource, /sol-technician-history/);
  assert.match(runtimeSource, /scrollIntoView/);
});

test('PWA força atualização da navegação corrigida', () => {
  assert.match(swSource, /const CACHE_VERSION = 'v52-history-navigation-master'/);
});
