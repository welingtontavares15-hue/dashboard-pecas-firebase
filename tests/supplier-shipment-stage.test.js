/**
 * Portal do fornecedor: ao registrar o envio, a etapa do pedido muda
 * visivelmente — não é só um aviso de 5 segundos.
 */
const fs = require('fs');
const path = require('path');
const read = (file) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const portal = read('js/fornecedor.js');
const css = read('css/wwm-design-system.css');

describe('fornecedor: transição visível de etapa', () => {
    it('cada pedido mostra um mini fluxo com as 5 etapas', () => {
        expect(portal).toContain('renderOrderPipeline(sol)');
        expect(portal).toContain('data-pipeline-order=');
        expect(portal).toContain('aria-current="step"');
        [1, 2, 3, 4, 5].forEach((n) => expect(portal).toContain(`n: ${n}`));
        expect(portal).toContain('this.renderOrderPipeline(sol)');
        expect(css).toContain('.supplier-order-pipeline');
        expect(css).toContain('.supplier-order-pipeline li.active');
        expect(css).toContain('.supplier-order-pipeline li.done');
    });

    it('substitui o formulário pelo painel "Envio registrado" após despachar', () => {
        expect(portal).toContain('alreadyShipped');
        expect(portal).toContain('class="supplier-shipment-confirmed"');
        expect(portal).toContain('Etapa 3 de 5 — <strong>Fornecedor envia</strong>');
        expect(portal).toContain('openShipmentEditor(');
        expect(css).toContain('.supplier-shipment-confirmed');
        expect(css).toContain('.supplier-shipment-edit');
    });

    it('a mensagem indica a troca de etapa (não "mercadoria registrada")', () => {
        expect(portal).toContain('Pedido avançou para Em trânsito — enviado em');
        expect(portal).toContain('Envio atualizado —');
        expect(portal).not.toMatch(/registrado em \$\{Utils\.formatDate\(dataEnvio\)\}\. Pedido em trânsito/);
    });

    it('destaca a linha com um flash curto e permite voltar ao formulário para corrigir', () => {
        expect(portal).toContain('supplier-row-just-shipped');
        expect(css).toContain('@keyframes wwm-supplier-shipped-flash');
        expect(portal).toContain('openShipmentEditor(id, options');
        expect(portal).toContain("supplierShipmentEditing");
    });

    it('o editor volta o formulário sem desfazer o envio (status continua em-transito)', () => {
        expect(portal).toContain("const draft = { ...sol, status: 'aprovada' };");
        expect(portal).toContain('this.renderShipmentFields(draft, options.preferModal');
    });
});
