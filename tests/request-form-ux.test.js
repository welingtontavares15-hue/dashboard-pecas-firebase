const fs = require('fs');
const path = require('path');
const vm = require('vm');

const rootDir = path.resolve(__dirname, '..');
const patchSource = fs.readFileSync(path.join(rootDir, 'js/solicitacoes-form-ux.js'), 'utf8');

function setup(role = 'tecnico') {
    const notices = [];
    let closed = 0;
    let views = [];
    const utils = {
        escapeHtml: v => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'),
        formatCurrency: v => 'R$ ' + Number(v || 0).toFixed(2),
        showToast: (message, type) => notices.push({ message, type }),
        closeModal: () => { closed += 1; },
        showModal: content => {
            document.querySelector('.modal-content').innerHTML = content;
        }
    };
    const solicitacoes = {
        currentSolicitation: null,
        isSaveSubmitting: false,
        _initAutocomplete: jest.fn(),
        updateTecnicoName: jest.fn(),
        refreshItemsList: jest.fn(),
        renderTotalsDisplay() {
            return '<div class="total-row"><span>Subtotal:</span></div>'
                + '<div class="total-row"><span>Desconto:</span></div>'
                + '<div class="total-row"><span>Frete:</span></div>'
                + '<div class="total-row grand-total"><span>Total:</span><span>'
                + utils.formatCurrency(this.currentSolicitation.total) + '</span></div>';
        },
        recalculateTotals() {
            const list = this.currentSolicitation.itens || [];
            this.currentSolicitation.total = list.reduce((sum, item) => sum + Number(item.quantidade) * Number(item.valorUnit), 0);
            const display = document.getElementById('totals-display');
            if (display) display.innerHTML = this.renderTotalsDisplay();
        },
        viewDetails: id => views.push(id),
        saveSolicitation: jest.fn(async function () {
            return { id: 'req-1', numero: 'REQ-001', status: 'pendente' };
        }),
        openForm(id = null) {
            this.currentSolicitation = {
                id,
                tecnicoId: 'tech-1', tecnicoNome: 'Técnico Sintético',
                data: '2026-11-08', cliente: '', observacoes: '',
                itens: [], desconto: 0, frete: 0, total: 0, fornecedorId: '',
                status: 'pendente'
            };
            document.body.innerHTML = '<div class="modal-content">'
                + '<div class="modal-header"><h3>Nova Solicitação</h3></div>'
                + '<div class="modal-body"><form id="sol-form">'
                + '<div class="form-row">'
                + '<div class="form-group"><input id="sol-tecnico" type="hidden" value="tech-1"></div>'
                + '<div class="form-group"><input id="sol-data" type="date" value="2026-11-08"></div>'
                + '<div class="form-group"><input id="sol-cliente" type="text"></div>'
                + '<div class="form-group"><select id="sol-fornecedor-sel"><option value="sup-ebst" selected>EBST</option></select>'
                + '<input id="sol-fornecedor" type="hidden" value="sup-ebst"></div>'
                + '<div class="form-group"><select id="sol-divisao"><option value="F&B" selected>F&B</option></select></div>'
                + '</div>'
                + '<div id="parts-section" class="form-group"><input id="parts-autocomplete-input"></div>'
                + '<div class="form-group"><div id="items-list"></div></div>'
                + '<div class="form-row"><input id="sol-desconto" value="0"><input id="sol-frete" value="0"></div>'
                + '<div id="totals-display"></div>'
                + '<div class="form-group"><textarea id="sol-observacoes"></textarea></div>'
                + '</form></div><div class="modal-footer"></div></div>';
        }
    };
    const runtime = {
        document,
        Utils: utils,
        Auth: {
            getCurrentUser: () => ({ id: 'tech-1', name: 'Técnico Sintético' }),
            getRole: () => role
        },
        Solicitacoes: solicitacoes
    };
    vm.runInNewContext(patchSource, { window: runtime }, { timeout: 2000 });
    expect(runtime.SolicitacoesFormUx.patch()).toBe(true);
    return { solicitacoes, notices, get closed() { return closed; }, get views() { return views; } };
}

describe('Nova solicitação: fluxo guiado', () => {
    test('preserva os campos existentes e distribui três etapas', () => {
        const { solicitacoes } = setup();
        solicitacoes.openForm();
        expect(document.querySelectorAll('.wwm-request-stage')).toHaveLength(3);
        expect(document.querySelector('[data-step="0"] #sol-divisao')).not.toBeNull();
        expect(document.querySelector('[data-step="0"] #sol-equipamento')).not.toBeNull();
        expect(document.querySelector('[data-step="1"] #parts-section')).not.toBeNull();
        expect(document.querySelector('[data-step="1"] #items-list')).not.toBeNull();
        expect(document.querySelector('[data-step="1"] #sol-desconto')).toBeNull();
        expect(document.querySelector('[data-step="1"] #sol-frete')).toBeNull();
        expect(document.querySelector('[data-step="1"] #sol-observacoes')).not.toBeNull();
        expect(document.getElementById('totals-display').textContent).toContain('Total estimado');
        expect(document.getElementById('totals-display').textContent).not.toContain('Desconto');
        expect(document.getElementById('totals-display').textContent).not.toContain('Frete');
        expect(document.querySelector('[data-step="2"]').hidden).toBe(true);
    });

    test('etapa do técnico: observações antes do total e sem frete ou desconto', () => {
        const { solicitacoes } = setup();
        solicitacoes.openForm();
        const stage = document.querySelector('[data-step="1"]');
        const observations = stage.querySelector('#sol-observacoes');
        const total = stage.querySelector('#totals-display');
        expect(observations).not.toBeNull();
        expect(observations.getAttribute('placeholder')).toContain('necessidade');
        expect(observations.closest('.wwm-request-observacoes')).not.toBeNull();
        expect(observations.compareDocumentPosition(total) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        expect(stage.querySelector('#sol-desconto')).toBeNull();
        expect(stage.querySelector('#sol-frete')).toBeNull();
        expect(solicitacoes.currentSolicitation.desconto).toBe(0);
        expect(solicitacoes.currentSolicitation.frete).toBe(0);
        solicitacoes.currentSolicitation.itens = [{ codigo: 'B-25', descricao: 'Peça', quantidade: 2, valorUnit: 100 }];
        solicitacoes.recalculateTotals();
        expect(total.textContent).toContain('R$ 200.00');
        expect(total.querySelectorAll('.total-row')).toHaveLength(1);
    });

    test('campos financeiros permanecem disponíveis para gestores', () => {
        const { solicitacoes } = setup('gestor');
        solicitacoes.openForm();
        const stage = document.querySelector('[data-step="1"]');
        expect(stage.querySelector('#sol-desconto')).not.toBeNull();
        expect(stage.querySelector('#sol-frete')).not.toBeNull();
        expect(stage.querySelector('#totals-display').textContent).toContain('Subtotal');
        expect(stage.querySelector('#totals-display').textContent).toContain('Desconto');
        expect(stage.querySelector('#totals-display').textContent).toContain('Frete');
    });

    test('barra de etapas usa três células diretas, sem grade aninhada', () => {
        const { solicitacoes } = setup();
        solicitacoes.openForm();
        const progress = document.getElementById('wwm-request-progress');
        expect(progress).not.toBeNull();
        expect(progress.getAttribute('aria-label')).toBe('Etapas da solicitação');
        expect(progress.children).toHaveLength(3);
        expect([...progress.children].every(element => element.tagName === 'SPAN')).toBe(true);
        expect([...progress.querySelectorAll('.wwm-request-step-label')].map(element => element.textContent))
            .toEqual(['Identificação', 'Peças', 'Revisão']);
        expect(progress.querySelector('.wwm-request-progress')).toBeNull();
        document.getElementById('wwm-request-next').click();
        expect(progress.children).toHaveLength(3);
        expect(progress.children[1].getAttribute('aria-current')).toBe('step');
    });

    test('exige peças antes de avançar à revisão', () => {
        const { solicitacoes, notices } = setup();
        solicitacoes.openForm();
        document.getElementById('wwm-request-next').click();
        expect(document.querySelector('[data-step="1"]').hidden).toBe(false);
        document.getElementById('wwm-request-next').click();
        expect(document.querySelector('[data-step="2"]').hidden).toBe(true);
        expect(notices.some(x => /pelo menos uma peça/.test(x.message))).toBe(true);
    });

    test('revisa os valores, envia uma vez e apresenta protocolo confirmado', async () => {
        const { solicitacoes } = setup();
        solicitacoes.openForm();
        solicitacoes.currentSolicitation.itens.push({
            codigo: 'P-101', descricao: 'Bomba de lavagem', quantidade: 2, valorUnit: 120
        });
        document.getElementById('sol-cliente').value = 'Cliente Sintético';
        document.getElementById('sol-equipamento').value = 'Lava-louças';
        document.getElementById('wwm-request-next').click();
        document.getElementById('wwm-request-next').click();
        expect(document.getElementById('wwm-request-review').textContent).toContain('Bomba de lavagem');
        expect(document.getElementById('wwm-request-review').textContent).toContain('R$ 240.00');
        document.getElementById('wwm-request-send').click();
        await new Promise(resolve => setTimeout(resolve, 0));
        expect(solicitacoes.saveSolicitation).toHaveBeenCalledTimes(1);
        expect(solicitacoes.currentSolicitation.equipamento).toBe('Lava-louças');
        expect(document.querySelector('.wwm-request-number').textContent).toContain('REQ-001');
        document.getElementById('wwm-request-open-record').click();
    });

    test('rascunho fica apenas em memória e é recuperável na mesma aba', () => {
        const { solicitacoes } = setup();
        solicitacoes.openForm();
        document.getElementById('sol-cliente').value = 'Unidade Sintética';
        solicitacoes.currentSolicitation.itens = [{ codigo: 'P-22', descricao: 'Peça', quantidade: 3, valorUnit: 10 }];
        document.getElementById('wwm-request-draft').click();
        solicitacoes.openForm();
        expect(document.getElementById('wwm-request-resume')).not.toBeNull();
        document.querySelector('#wwm-request-resume button').click();
        expect(document.getElementById('sol-cliente').value).toBe('Unidade Sintética');
        expect(solicitacoes.currentSolicitation.itens[0].codigo).toBe('P-22');
        expect(document.querySelector('[data-step="1"]').hidden).toBe(false);
    });

    test('o carregamento ocorre depois do patch de divisão obrigatório', () => {
        const route = fs.readFileSync(path.join(rootDir, 'js/pages/solicitacoes.js'), 'utf8');
        const division = route.indexOf("window.SolicitacoesDivisaoPatch?.patch?.()");
        const guided = route.indexOf("window.SolicitacoesFormUx?.patch?.()");
        expect(division).toBeGreaterThan(-1);
        expect(guided).toBeGreaterThan(division);
        expect(route).toContain("solicitacoes-form-ux.js?v=20261108b");
    });
});
