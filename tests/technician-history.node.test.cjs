const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');

function loadApi() {
  const source = fs.readFileSync(path.join(root, 'js/technician-experience.js'), 'utf8');
  const context = { window: {}, document: null, console, setInterval(){return 1;}, clearInterval(){}, setTimeout(fn){fn();} };
  context.window.setInterval=context.setInterval;
  context.window.clearInterval=context.clearInterval;
  context.window.setTimeout=context.setTimeout;
  context.window.addEventListener=()=>{};
  context.globalThis=context.window;
  vm.createContext(context);
  vm.runInContext(source, context);
  return context.window.TechnicianExperience;
}

const requests=[
 {id:'1',numero:'1001',status:'pendente',createdAt:1000,itens:[{codigo:'ABC-10',descricao:'Bomba',quantidade:2}]},
 {id:'2',numero:'1002',status:'em-transito',createdAt:3000,itens:[{codigo:'abc-10',descricao:'Bomba',quantidade:3}]},
 {id:'3',numero:'1003',status:'finalizada',createdAt:2000,itens:[{codigo:'',descricao:'Vedação <script>alert(1)</script>',quantidade:4}]}
];

test('agrega histórico por peça e preserva último pedido',()=>{
  const api=loadApi();
  const h=api.aggregatePartHistory(requests);
  const p=h.find(x=>x.code==='ABC-10');
  assert.equal(p.totalQuantity,5);
  assert.equal(p.requestCount,2);
  assert.equal(p.lastRequestNumber,'1002');
});

test('KPIs do técnico exibem valor acumulado e valor do mês corrente',()=>{
  const api=loadApi();
  const financial=[
    {id:'a',status:'pendente',data:'2026-08-12T10:00:00',total:100,itens:[{codigo:'A',descricao:'A',quantidade:1,valorUnit:100}]},
    {id:'b',status:'finalizada',data:'2026-08-20T10:00:00',itens:[{codigo:'B',descricao:'B',quantidade:2,valorUnit:25}]},
    {id:'c',status:'rejeitada',data:'2026-07-31T10:00:00',total:200,itens:[{codigo:'C',descricao:'C',quantidade:1,valorUnit:200}]}
  ];
  const summary=api.buildSummary(financial,'2026-08-30T12:00:00');
  assert.equal(summary.totalValue,350);
  assert.equal(summary.monthValue,150);
  assert.equal(summary.monthRequests,2);
  const html=api.renderSummaryCards(financial,'2026-08-30T12:00:00');
  assert.match(html,/Total solicitado/);
  assert.match(html,/Solicitado no mês/);
  assert.match(html,/3 pedidos acumulados/);
  assert.match(html,/2 pedidos neste mês/);
});

test('histórico escapa HTML potencialmente malicioso',()=>{
  const html=loadApi().renderHistoryPanel(requests);
  assert.doesNotMatch(html,/<script>alert/);
  assert.match(html,/&lt;script&gt;alert/);
});

test('loader exige módulo do histórico',()=>{
  const s=fs.readFileSync(path.join(root,'js/pages/solicitacoes.js'),'utf8');
  assert.match(s,/technician-experience\.js/);
  assert.match(s,/TechnicianExperience/);
});

test('service worker guarda JS e CSS do histórico com cache atual',()=>{
  const s=fs.readFileSync(path.join(root,'service-worker.js'),'utf8');
  assert.match(s,/v52-history-navigation-master|v64-color-standard/);
  assert.match(s,/technician-experience\.js/);
  assert.match(s,/technician-history\.css/);
});

test('integração restringe backup a administrador sem alterar solicitacoes.js',()=>{
  const s=fs.readFileSync(path.join(root,'js/technician-experience.js'),'utf8');
  assert.match(s,/canManageSolicitationBackup/);
  assert.match(s,/administrador/);
  assert.match(s,/downloadBackup/);
  assert.match(s,/triggerRestoreBackup/);
});

test('estilos ficam isolados em arquivo próprio',()=>{
  const css=fs.readFileSync(path.join(root,'css/technician-history.css'),'utf8');
  assert.match(css,/technician-history-panel/);
  assert.match(css,/@media \(max-width: 820px\)/);
});
