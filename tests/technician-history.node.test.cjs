const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');

function loadApi() {
  const source = fs.readFileSync(path.join(root, 'js/technician-experience.js'), 'utf8');
  const context = { window: {}, document: null, console, setInterval(){return 1;}, clearInterval(){}, setTimeout(fn){fn();} };
  context.window.setInterval=context.setInterval; context.window.clearInterval=context.clearInterval; context.window.setTimeout=context.setTimeout; context.window.addEventListener=()=>{};
  context.globalThis=context.window; vm.createContext(context); vm.runInContext(source, context);
  return context.window.TechnicianExperience;
}
const requests=[
 {id:'1',numero:'1001',status:'pendente',createdAt:1000,itens:[{codigo:'ABC-10',descricao:'Bomba',quantidade:2}]},
 {id:'2',numero:'1002',status:'em-transito',createdAt:3000,itens:[{codigo:'abc-10',descricao:'Bomba',quantidade:3}]},
 {id:'3',numero:'1003',status:'finalizada',createdAt:2000,itens:[{codigo:'',descricao:'Vedação <script>alert(1)</script>',quantidade:4}]}
];
test('agrega histórico por peça e preserva último pedido',()=>{const api=loadApi();const h=api.aggregatePartHistory(requests);const p=h.find(x=>x.code==='ABC-10');assert.equal(p.totalQuantity,5);assert.equal(p.requestCount,2);assert.equal(p.lastRequestNumber,'1002');});
test('KPIs do técnico não exibem valores financeiros',()=>{const html=loadApi().renderSummaryCards(requests);assert.match(html,/Meus pedidos/);assert.match(html,/Peças solicitadas/);assert.doesNotMatch(html,/Ticket médio|Valor total/);});
test('histórico escapa HTML potencialmente malicioso',()=>{const html=loadApi().renderHistoryPanel(requests);assert.doesNotMatch(html,/<script>alert/);assert.match(html,/&lt;script&gt;alert/);});
test('loader exige módulo do histórico',()=>{const s=fs.readFileSync(path.join(root,'js/pages/solicitacoes.js'),'utf8');assert.match(s,/technician-experience\.js/);assert.match(s,/TechnicianExperience/);});
test('service worker guarda JS e CSS do histórico com cache v50',()=>{const s=fs.readFileSync(path.join(root,'service-worker.js'),'utf8');assert.match(s,/v50-technician-history/);assert.match(s,/technician-experience\.js/);assert.match(s,/technician-history\.css/);});
test('integração restringe backup a administrador sem alterar solicitacoes.js',()=>{const s=fs.readFileSync(path.join(root,'js/technician-experience.js'),'utf8');assert.match(s,/canManageSolicitationBackup/);assert.match(s,/administrador/);assert.match(s,/downloadBackup/);assert.match(s,/triggerRestoreBackup/);});
test('estilos ficam isolados em arquivo próprio',()=>{const css=fs.readFileSync(path.join(root,'css/technician-history.css'),'utf8');assert.match(css,/technician-history-panel/);assert.match(css,/@media \(max-width: 820px\)/);});
