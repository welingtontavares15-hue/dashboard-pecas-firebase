(function (root) {
    'use strict';

    // Rascunho efemero: permanece somente na memoria desta aba. Nao e enviado
    // ao Firebase nem gravado em localStorage/IndexedDB antes do envio.
    let memoryDraft = null;
    const steps = ['Identificação', 'Peças', 'Revisão'];

    function escape(value) {
        return root.Utils.escapeHtml(String(value ?? ''));
    }

    function currentOwner() {
        const user = root.Auth?.getCurrentUser?.();
        return String(user?.id || user?.username || '');
    }

    function value(id) {
        return root.document.getElementById(id)?.value || '';
    }

    function formNode() {
        return root.document.getElementById('sol-form');
    }

    function snapshot(s) {
        const record = s.currentSolicitation || {};
        return {
            owner: currentOwner(),
            savedAt: Date.now(),
            data: {
                tecnicoId: value('sol-tecnico'),
                data: value('sol-data'),
                cliente: value('sol-cliente').trim().slice(0, 300),
                equipamento: value('sol-equipamento').trim().slice(0, 200),
                divisao: value('sol-divisao'),
                fornecedorId: value('sol-fornecedor'),
                observacoes: value('sol-observacoes').slice(0, 4000),
                // Estes valores permanecem no modelo para compatibilidade com
                // aprovacoes e edicao administrativa, mas nao sao solicitados ao tecnico.
                desconto: Number(record.desconto) || 0,
                frete: Number(record.frete) || 0,
                itens: (record.itens || []).map((item) => ({
                    codigo: item.codigo, descricao: item.descricao,
                    valorUnit: item.valorUnit, quantidade: item.quantidade
                }))
            }
        };
    }

    function findGroup(form, selector) {
        return form.querySelector(selector)?.closest('.form-group') || null;
    }

    function put(parent, node) {
        if (node) parent.appendChild(node);
    }

    function buildStage(index) {
        const div = root.document.createElement('section');
        div.className = 'wwm-request-stage';
        div.dataset.step = String(index);
        div.hidden = index !== 0;
        const headings = [
            ['Identifique a solicitação', 'Informe os dados do atendimento e o fornecedor.'],
            ['Selecione as peças', 'Busque por código ou descrição e confira as quantidades.'],
            ['Confira antes de enviar', 'Revise os dados. O pedido será enviado para aprovação.']
        ];
        div.innerHTML = '<div class="wwm-request-stage-heading"><span>ETAPA ' + (index + 1)
            + ' DE 3</span><h4>' + headings[index][0] + '</h4><p>' + headings[index][1] + '</p></div>';
        return div;
    }

    function makeEquipmentField() {
        const div = root.document.createElement('div');
        div.className = 'form-group';
        div.innerHTML = '<label for="sol-equipamento">Equipamento (opcional)</label>'
            + '<input type="text" id="sol-equipamento" class="form-control" maxlength="200" '
            + 'placeholder="Ex.: lava-louças, modelo ou patrimônio">';
        return div;
    }

    function progress(step) {
        // O contêiner #wwm-request-progress já é a grade de três colunas.
        // Criar outro <div> aqui deslocava os rótulos e os sobrepunha no celular.
        return steps.map((label, i) => '<span class="' + (i === step ? 'is-current' : i < step ? 'is-done' : '')
            + '" ' + (i === step ? 'aria-current="step"' : '') + '><b>' + (i + 1)
            + '</b><span class="wwm-request-step-label">' + label + '</span></span>').join('');
    }

    function review(s) {
        const record = snapshot(s).data;
        const count = record.itens.reduce((sum, item) => sum + (Number(item.quantidade) || 0), 0);
        const supplier = record.fornecedorId === 'sup-hobart' ? 'Hobart'
            : record.fornecedorId === 'sup-ebst' ? 'EBST' : 'Não selecionado';
        const tech = root.document.getElementById('sol-tecnico');
        const techLabel = tech?.tagName === 'SELECT'
            ? tech.options[tech.selectedIndex]?.textContent?.trim() : s.currentSolicitation?.tecnicoNome;
        const rows = [
            ['Técnico', techLabel || 'Não identificado'],
            ['Data', record.data],
            ['Cliente', record.cliente || 'Não informado'],
            ['Equipamento', record.equipamento || 'Não informado'],
            ['Divisão', record.divisao || 'Não informada'],
            ['Fornecedor', supplier],
            ['Peças', count + ' unidade(s) em ' + record.itens.length + ' item(ns)'],
            ['Total estimado', root.Utils.formatCurrency(s.currentSolicitation.total)]
        ];
        const details = rows.map(([label, data]) => '<div><span>' + escape(label)
            + '</span><strong>' + escape(data) + '</strong></div>').join('');
        const partRows = record.itens.map(item => '<li><strong>' + escape(item.codigo)
            + '</strong><span>' + escape(item.descricao) + ' · '
            + escape(item.quantidade) + ' un.</span></li>').join('');
        return '<div class="wwm-request-review"><div class="wwm-request-review-grid">' + details
            + '</div><h5>Peças selecionadas</h5><ul>' + partRows + '</ul>'
            + (record.observacoes ? '<h5>Observações</h5><p>' + escape(record.observacoes) + '</p>' : '')
            + '<p class="wwm-request-review-note">Ao confirmar, o pedido será registrado e enviado ao fluxo de aprovação.</p></div>';
    }

    function validateStep(s, step) {
        if (step === 0) {
            const required = [
                ['sol-tecnico', 'Selecione o técnico.'],
                ['sol-data', 'Informe a data da solicitação.'],
                ['sol-fornecedor', 'Selecione o fornecedor.'],
                ['sol-divisao', 'Selecione a divisão F&B ou IN.']
            ];
            for (const [id, message] of required) {
                const el = root.document.getElementById(id);
                if (id === 'sol-divisao' && !el) continue;
                if (!el?.value) {
                    root.Utils.showToast(message, 'warning');
                    (id === 'sol-fornecedor' ? root.document.getElementById('sol-fornecedor-sel') : el)?.focus?.();
                    return false;
                }
            }
            return true;
        }
        if (step === 1) {
            if (!s.currentSolicitation?.itens?.length) {
                root.Utils.showToast('Selecione pelo menos uma peça.', 'warning');
                root.document.getElementById('parts-autocomplete-input')?.focus();
                return false;
            }
            if (s.currentSolicitation.itens.some(item =>
                !Number.isFinite(Number(item.quantidade)) || Number(item.quantidade) <= 0
                || !Number.isFinite(Number(item.valorUnit)) || Number(item.valorUnit) <= 0)) {
                root.Utils.showToast('Verifique quantidade e valor das peças.', 'warning');
                return false;
            }
            const discount = Number(value('sol-desconto') || 0);
            const freight = Number(value('sol-frete') || 0);
            if (!Number.isFinite(discount) || discount < 0 || !Number.isFinite(freight) || freight < 0) {
                root.Utils.showToast('Desconto e frete devem ser valores válidos.', 'warning');
                return false;
            }
            s.recalculateTotals();
            return true;
        }
        return true;
    }

    function setStep(s, next) {
        if (!formNode() || !root.document.getElementById('wwm-request-flow')) return;
        const index = Math.min(2, Math.max(0, next));
        if (index > s._requestStep && !validateStep(s, s._requestStep)) return;
        s._requestStep = index;
        const form = formNode();
        form.querySelectorAll('.wwm-request-stage').forEach((stage, i) => {
            stage.hidden = i !== index;
        });
        const indicator = root.document.getElementById('wwm-request-progress');
        if (indicator) indicator.innerHTML = progress(index);
        if (index === 2) {
            s.currentSolicitation.equipamento = value('sol-equipamento').trim();
            const summary = root.document.getElementById('wwm-request-review');
            if (summary) summary.innerHTML = review(s);
        }
        const back = root.document.getElementById('wwm-request-back');
        const nextButton = root.document.getElementById('wwm-request-next');
        const send = root.document.getElementById('wwm-request-send');
        if (back) back.hidden = index === 0;
        if (nextButton) nextButton.hidden = index === 2;
        if (send) send.hidden = index !== 2;
        root.document.getElementById('wwm-request-flow')?.scrollIntoView?.({ block: 'nearest', behavior: 'instant' });
    }

    function restore(s) {
        if (!memoryDraft || memoryDraft.owner !== currentOwner()) return;
        const data = memoryDraft.data;
        const form = formNode();
        if (!form) return;
        s.currentSolicitation = {
            ...s.currentSolicitation, ...data, id: null,
            itens: data.itens.map(item => ({ ...item }))
        };
        const fields = {
            'sol-tecnico': data.tecnicoId, 'sol-data': data.data,
            'sol-cliente': data.cliente, 'sol-equipamento': data.equipamento,
            'sol-divisao': data.divisao, 'sol-fornecedor-sel': data.fornecedorId,
            'sol-fornecedor': data.fornecedorId, 'sol-observacoes': data.observacoes,
            'sol-desconto': data.desconto, 'sol-frete': data.frete
        };
        Object.entries(fields).forEach(([id, val]) => {
            const node = root.document.getElementById(id);
            if (node) node.value = val == null ? '' : String(val);
        });
        if (root.document.getElementById('sol-tecnico')?.tagName === 'SELECT') s.updateTecnicoName?.();
        s.refreshItemsList();
        s.recalculateTotals();
        if (data.fornecedorId) s._initAutocomplete(data.fornecedorId);
        const banner = root.document.getElementById('wwm-request-resume');
        if (banner) banner.remove();
        root.Utils.showToast('Rascunho recuperado nesta aba.', 'success');
        setStep(s, 1);
    }

    function success(s, saved) {
        const number = escape(saved.numero || saved.id || 'Não disponível');
        const id = String(saved.id || '');
        const modal = '<div class="modal-header"><h3>Solicitação enviada</h3>'
            + '<button type="button" class="modal-close" aria-label="Fechar" onclick="Utils.closeModal()">'
            + '<i class="fas fa-times" aria-hidden="true"></i></button></div>'
            + '<div class="modal-body wwm-request-success"><div class="wwm-request-success-symbol">'
            + '<i class="fas fa-check-circle" aria-hidden="true"></i></div>'
            + '<h4>Pedido registrado com sucesso</h4><p>Número da solicitação</p>'
            + '<strong class="wwm-request-number">#' + number + '</strong>'
            + '<p><b>Status:</b> Pendente de aprovação</p>'
            + '<p>Próxima etapa: análise pelo responsável pela aprovação.</p></div>'
            + '<div class="modal-footer"><button type="button" class="btn btn-outline" onclick="Utils.closeModal()">Fechar</button>'
            + (id ? '<button type="button" class="btn btn-primary" id="wwm-request-open-record">'
                + 'Ver solicitação</button>' : '') + '</div>';
        root.Utils.showModal(modal, { size: 'md', closeOnBackdrop: false });
        const button = root.document.getElementById('wwm-request-open-record');
        if (button) button.addEventListener('click', () => {
            root.Utils.closeModal();
            s.viewDetails(id);
        });
    }

    function enhance(s) {
        const form = formNode();
        const modal = form?.closest('.modal-content');
        if (!form || !modal || !s.currentSolicitation || s.currentSolicitation.id) return;
        if (form.querySelector('#wwm-request-flow')) return;

        const sections = [buildStage(0), buildStage(1), buildStage(2)];
        const row = form.querySelector(':scope > .form-row');
        if (!row) return;
        const clientGroup = findGroup(row, '#sol-cliente');
        if (clientGroup) clientGroup.after(makeEquipmentField());
        const parts = form.querySelector('#parts-section');
        const items = form.querySelector('#items-list')?.closest('.form-group');
        const totals = form.querySelector('#totals-display');
        const values = form.querySelector('#sol-desconto')?.closest('.form-row');
        const obs = form.querySelector('#sol-observacoes')?.closest('.form-group');
        const technician = root.Auth?.getRole?.() === 'tecnico';
        put(sections[0], row);
        if (obs) {
            obs.classList.add('wwm-request-observacoes');
            const label = obs.querySelector('label[for="sol-observacoes"]');
            if (label) label.textContent = 'Observações (opcional)';
            const comment = obs.querySelector('#sol-observacoes');
            if (comment) comment.placeholder = 'Descreva a necessidade da peça ou orientações para aprovação...';
        }
        // Observacoes ficam imediatamente depois dos itens; o total e o
        // ultimo elemento antes de Continuar, sempre atualizado pelo catalogo.
        [parts, items, obs].forEach(node => put(sections[1], node));
        if (technician) {
            // No fluxo de NOVA solicitacao do tecnico nao existem frete/desconto.
            // Zerar apenas o registro novo; edicoes e valores historicos nao mudam.
            s.currentSolicitation.desconto = 0;
            s.currentSolicitation.frete = 0;
            values?.remove();
        } else {
            put(sections[1], values);
        }
        put(sections[1], totals);

        const reviewBody = root.document.createElement('div');
        reviewBody.id = 'wwm-request-review';
        sections[2].appendChild(reviewBody);
        const flow = root.document.createElement('div');
        flow.id = 'wwm-request-flow';
        const indicator = root.document.createElement('div');
        indicator.id = 'wwm-request-progress';
        indicator.setAttribute('role', 'group');
        indicator.setAttribute('aria-label', 'Etapas da solicitação');
        indicator.innerHTML = progress(0);
        flow.appendChild(indicator);
        sections.forEach(section => flow.appendChild(section));
        form.prepend(flow);
        s._requestStep = 0;
        // Renderizar o resumo ja na primeira visita, com uma linha para o tecnico.
        s.recalculateTotals();

        const header = modal.querySelector('.modal-header h3');
        if (header) header.textContent = 'Nova solicitação de peças';
        const footer = modal.querySelector('.modal-footer');
        if (footer) {
            footer.classList.add('wwm-request-footer');
            footer.innerHTML = '<button type="button" class="btn btn-outline" id="wwm-request-draft">'
                + '<i class="fas fa-save" aria-hidden="true"></i> Guardar rascunho</button>'
                + '<button type="button" class="btn btn-outline" id="wwm-request-back" hidden>Voltar</button>'
                + '<button type="button" class="btn btn-primary" id="wwm-request-next">Continuar</button>'
                + '<button type="button" class="btn btn-success" id="wwm-request-send" hidden>'
                + '<i class="fas fa-paper-plane" aria-hidden="true"></i> Confirmar e enviar</button>';
        }
        root.document.getElementById('wwm-request-back')?.addEventListener('click', () => setStep(s, s._requestStep - 1));
        root.document.getElementById('wwm-request-next')?.addEventListener('click', () => setStep(s, s._requestStep + 1));
        root.document.getElementById('wwm-request-draft')?.addEventListener('click', () => {
            memoryDraft = snapshot(s);
            root.Utils.closeModal();
            root.Utils.showToast('Rascunho guardado temporariamente nesta aba.', 'info');
        });
        root.document.getElementById('wwm-request-send')?.addEventListener('click', async event => {
            const sendButton = event.currentTarget;
            if (s.isSaveSubmitting || sendButton.disabled) return;
            if (!validateStep(s, 1)) {
                setStep(s, 1);
                return;
            }
            s.currentSolicitation.equipamento = value('sol-equipamento').trim();
            sendButton.disabled = true;
            try {
                // Mantém a validação de divisão e a autorização já existentes.
                const saved = await s.saveSolicitation('pendente');
                if (saved?.id) {
                    if (memoryDraft?.owner === currentOwner()) memoryDraft = null;
                    success(s, saved);
                }
            } finally {
                if (sendButton.isConnected) sendButton.disabled = false;
            }
        });

        if (memoryDraft && memoryDraft.owner === currentOwner()) {
            const banner = root.document.createElement('div');
            banner.id = 'wwm-request-resume';
            banner.className = 'wwm-request-resume';
            banner.innerHTML = '<span>Há um rascunho desta aba.</span>'
                + '<button type="button" class="btn btn-sm btn-outline">Retomar rascunho</button>';
            banner.querySelector('button').addEventListener('click', () => restore(s));
            form.prepend(banner);
        }
    }

    function patch() {
        const s = root.Solicitacoes;
        if (!s || s.__requestFormUxPatched) return false;
        const renderTotalsBase = s.renderTotalsDisplay.bind(s);
        s.renderTotalsDisplay = function requestTotalsDisplay() {
            if (root.Auth?.getRole?.() === 'tecnico'
                && !this.currentSolicitation?.id
                && formNode()?.querySelector('#wwm-request-flow')) {
                return '<div class="total-row grand-total">'
                    + '<span>Total estimado:</span><span>'
                    + root.Utils.formatCurrency(this.currentSolicitation.total)
                    + '</span></div>';
            }
            return renderTotalsBase();
        };
        const openBase = s.openForm.bind(s);
        s.openForm = function requestOpenForm(id = null) {
            const result = openBase(id);
            if (!id && this.currentSolicitation && !this.currentSolicitation.id) enhance(this);
            return result;
        };
        s.__requestFormUxPatched = true;
        return true;
    }

    root.SolicitacoesFormUx = Object.freeze({ patch });
})(typeof window !== 'undefined' ? window : globalThis);
