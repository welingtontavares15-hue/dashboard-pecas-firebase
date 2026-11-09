/**
 * Ordenação das tabelas (clique no título da coluna).
 * Regressão: "09/11/2026" era interpretado como o número 9112026 e a coluna
 * Data ordenava pelo dia do mês em vez da data.
 */
const fs = require('fs');
const path = require('path');

describe('ordenação das tabelas', () => {
    let sort;

    beforeAll(() => {
        const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'ui-modern.js'), 'utf8');
        // Executa só o módulo; sem Utils/Auth/App os "patches" não fazem nada.
        // eslint-disable-next-line no-new-func
        new Function('window', 'document', source)(window, document);
        sort = window.WwmTableSort;
    });

    const sorted = (values) => values.slice().sort(sort.compare);

    it('ordena datas dd/mm/aaaa pela data, não pelo dia', () => {
        expect(sorted(['09/11/2026', '30/09/2026', '04/11/2026', '15/10/2026', '10/10/2026']))
            .toEqual(['30/09/2026', '10/10/2026', '15/10/2026', '04/11/2026', '09/11/2026']);
    });

    it('considera a hora quando presente', () => {
        expect(sorted(['09/11/2026 14:30', '09/11/2026 08:05'])).toEqual(['09/11/2026 08:05', '09/11/2026 14:30']);
    });

    it('ordena valores em reais, inclusive com mais de um separador de milhar', () => {
        expect(sorted(['R$ 1.234.567,89', 'R$ 420,75', 'R$ 11.605,00', 'R$ 740,75']))
            .toEqual(['R$ 420,75', 'R$ 740,75', 'R$ 11.605,00', 'R$ 1.234.567,89']);
    });

    it('ordena números e percentuais', () => {
        expect(sorted(['12', '3', '100'])).toEqual(['3', '12', '100']);
        expect(sorted(['19,5%', '2,0%', '100%'])).toEqual(['2,0%', '19,5%', '100%']);
    });

    it('trata texto com dígitos como texto (ordem natural)', () => {
        expect(sort.key('Sensor Capô HD-80 conjunto 0 +5').number).toBeUndefined();
        expect(sorted(['HD-80-1010', 'HD-80-1002', 'HD-80-200'])).toEqual(['HD-80-200', 'HD-80-1002', 'HD-80-1010']);
        expect(sorted(['Zé Roberto', 'ademir', 'Carlos'])).toEqual(['ademir', 'Carlos', 'Zé Roberto']);
    });

    it('deixa células vazias por último', () => {
        expect(sorted(['-', 'R$ 10,00', '', 'R$ 5,00'])).toEqual(['R$ 5,00', 'R$ 10,00', '-', '']);
    });
});
