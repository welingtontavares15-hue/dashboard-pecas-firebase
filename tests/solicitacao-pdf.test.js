jest.mock('puppeteer', () => {
    const pdfBuffer = Buffer.from('%PDF-mock%');
    const setContentMock = jest.fn().mockResolvedValue();
    const emulateMediaTypeMock = jest.fn().mockResolvedValue();
    const pdfMock = jest.fn().mockResolvedValue(pdfBuffer);
    const newPageMock = jest.fn().mockResolvedValue({
        setContent: setContentMock,
        emulateMediaType: emulateMediaTypeMock,
        pdf: pdfMock
    });
    const closeMock = jest.fn().mockResolvedValue();
    const browserMock = { newPage: newPageMock, close: closeMock };

    return {
        launch: jest.fn().mockResolvedValue(browserMock),
        __mock: { pdfBuffer, setContentMock, emulateMediaTypeMock, pdfMock, newPageMock, closeMock }
    };
});

const puppeteer = require('puppeteer');
const { generateSolicitacaoPdf } = require('../scripts/generateSolicitacaoPdf');

describe('generateSolicitacaoPdf', () => {
    it('gera buffer de PDF e calcula totais corretamente', async () => {
        const data = {
            numero: 'REQ-20251218-0010',
            tecnico: 'Welington Bastos Tavares',
            data: '2025-12-18',
            endereco: 'AV Morumbi Qd 34 Lt 11',
            cidadeUf: 'Anápolis / GO',
            envio: 'Normal',
            cep: '75134-550',
            itens: [
                { codigo: 'CS008', idMaquina: '-', qtd: 1, descricao: 'Bicos Injetores Do Braço HD-50/HD-80', valorUnit: 114.48 },
                { codigo: 'CS020', idMaquina: '-', qtd: 1, descricao: 'Capa Do Filtro De Resíduo HD-50', valorUnit: 150.60 }
            ],
            desconto: 0,
            frete: 0,
            fluxoAprovacao: 'Supervisor Diversey',
            solicitanteLabel: 'Solicitante',
            recebidoPorLabel: 'Recebido por'
        };

        const result = await generateSolicitacaoPdf(data);

        expect(result.path).toContain(`Solicitacao_${data.numero}.pdf`);
        expect(result.subtotal).toBeCloseTo(265.08);
        expect(result.total).toBeCloseTo(265.08);
        expect(puppeteer.launch).toHaveBeenCalled();
        expect(puppeteer.__mock.pdfMock).toHaveBeenCalledWith(
            expect.objectContaining({
                path: expect.stringContaining(`Solicitacao_${data.numero}.pdf`),
                format: 'A4',
                printBackground: true,
                preferCSSPageSize: true
            })
        );
        expect(puppeteer.__mock.newPageMock).toHaveBeenCalled();
    });
});
