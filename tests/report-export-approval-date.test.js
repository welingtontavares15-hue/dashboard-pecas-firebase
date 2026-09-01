const fs = require('fs');
const path = require('path');

describe('Report Excel approval date columns', () => {
    const source = fs.readFileSync(path.join(__dirname, '../js/lazy/relatorios.js'), 'utf8')
        .replace(/^\uFEFF?import .*$/m, '')
        .replace('export async function ensureLoaded()', 'async function ensureLoaded()');

    const loadHelpers = (windowMock) => {
        const factory = new Function(
            'window',
            `${source}; return { transformExportRows, installApprovalDateColumns };`
        );
        return factory(windowMock);
    };

    const makeWindow = () => ({
        Utils: {
            parseAsLocalDate: (value) => new Date(value),
            formatDate: (value, includeTime = false) => {
                const date = value instanceof Date ? value : new Date(value);
                const day = String(date.getDate()).padStart(2, '0');
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const year = date.getFullYear();
                if (!includeTime) {
                    return `${day}/${month}/${year}`;
                }
                const hour = String(date.getHours()).padStart(2, '0');
                const minute = String(date.getMinutes()).padStart(2, '0');
                return `${day}/${month}/${year} ${hour}:${minute}`;
            }
        },
        AnalyticsEngine: {
            getCostRecognitionDate: (solicitation = {}) => {
                const candidates = [];
                if (solicitation.approvedAt) {
                    candidates.push(new Date(solicitation.approvedAt));
                }
                (solicitation.approvals || []).forEach((entry) => {
                    const decision = String(entry?.decision || '').toLowerCase();
                    if (['approved', 'aprovada', 'aprovado'].includes(decision) && entry?.at) {
                        candidates.push(new Date(entry.at));
                    }
                });
                return candidates.length
                    ? new Date(Math.max(...candidates.map((date) => date.getTime())))
                    : null;
            }
        }
    });

    it('replaces generic Data with DataSolicitacao and canonical DataAprovacao', () => {
        const windowMock = makeWindow();
        const { transformExportRows } = loadHelpers(windowMock);
        const rows = transformExportRows([
            { Numero: '100', Data: '30/08/2026', Status: 'Aprovada', DataAprovacao: 'valor-antigo' }
        ], [
            { numero: '100', approvedAt: '2026-09-01T10:15:00-03:00' }
        ]);

        expect(rows).toHaveLength(1);
        expect(Object.keys(rows[0])).toEqual(['Numero', 'DataSolicitacao', 'DataAprovacao', 'Status']);
        expect(rows[0].DataSolicitacao).toBe('30/08/2026');
        expect(rows[0].DataAprovacao).toMatch(/^01\/09\/2026/);
        expect(rows[0].Data).toBeUndefined();
    });

    it('recovers approval date from approval history for legacy records', () => {
        const windowMock = makeWindow();
        const { transformExportRows } = loadHelpers(windowMock);
        const rows = transformExportRows([
            { Numero: '101', Mes: 'setembro de 2026', Data: '30/08/2026', CustoTotal: 450 }
        ], [
            { numero: '101', approvals: [{ decision: 'approved', at: '2026-09-04T09:00:00-03:00' }] }
        ]);

        expect(Object.keys(rows[0])).toEqual([
            'Numero',
            'Mes',
            'DataSolicitacao',
            'DataAprovacao',
            'CustoTotal'
        ]);
        expect(rows[0].DataSolicitacao).toBe('30/08/2026');
        expect(rows[0].DataAprovacao).toMatch(/^04\/09\/2026/);
    });

    it('leaves DataAprovacao blank when no approval evidence exists', () => {
        const windowMock = makeWindow();
        const { transformExportRows } = loadHelpers(windowMock);
        const rows = transformExportRows([
            { Numero: '102', Data: '01/09/2026', Status: 'Pendente' }
        ], [
            { numero: '102', status: 'pendente' }
        ]);

        expect(rows[0].DataSolicitacao).toBe('01/09/2026');
        expect(rows[0].DataAprovacao).toBe('');
    });

    it('installs wrappers on both solicitation and cost exports', () => {
        const windowMock = makeWindow();
        windowMock.Relatorios = {
            exportSolicitacoes: jest.fn(),
            exportCustos: jest.fn(),
            getFilteredSolicitations: () => [],
            getFilteredCostSolicitations: () => []
        };
        const { installApprovalDateColumns } = loadHelpers(windowMock);

        installApprovalDateColumns();

        expect(windowMock.Relatorios.__approvalDateColumnsInstalled).toBe(true);
        expect(windowMock.Relatorios.exportSolicitacoes.__approvalDateColumnsWrapped).toBe(true);
        expect(windowMock.Relatorios.exportCustos.__approvalDateColumnsWrapped).toBe(true);
    });
});
