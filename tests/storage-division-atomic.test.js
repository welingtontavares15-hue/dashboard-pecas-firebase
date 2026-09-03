const fs = require('fs');
const path = require('path');

describe('CloudStorage.updateSolicitationDivision', () => {
    test('envia ao Firebase somente os quatro campos permitidos', async () => {
        const storageCode = fs.readFileSync(path.join(__dirname, '../js/storage.js'), 'utf8');
        const update = jest.fn().mockResolvedValue();
        global.window.firebaseModules = { update };
        global.FirebaseInit = {
            getRef: jest.fn((value) => value)
        };

        const storage = new Function(`${storageCode}; return CloudStorage;`)();
        storage.getScopedSessionUser = () => ({ role: 'administrador' });
        storage.ensureWriteReady = jest.fn().mockResolvedValue(true);
        storage.generateOpId = () => 'op-division';
        storage.logSyncEvent = jest.fn();
        storage.clearLastOperationError = jest.fn();
        storage.rememberSyntheticOperationError = jest.fn();
        storage.rememberOperationError = jest.fn();

        const result = await storage.updateSolicitationDivision('historic-finalized-001', {
            divisao: 'IN',
            divisaoClassificadaEm: 1788451200000,
            divisaoClassificadaPor: 'Administrador Teste',
            divisaoClassificacaoHistorico: [{ divisaoAnterior: 'F&B', novaDivisao: 'IN' }],
            status: 'pendente',
            total: 0,
            timeline: []
        });

        expect(result).toBe(true);
        expect(update).toHaveBeenCalledWith('data/diversey_solicitacoes/historic-finalized-001', {
            divisao: 'IN',
            divisaoClassificadaEm: 1788451200000,
            divisaoClassificadaPor: 'Administrador Teste',
            divisaoClassificacaoHistorico: [{ divisaoAnterior: 'F&B', novaDivisao: 'IN' }]
        });
    });
});
