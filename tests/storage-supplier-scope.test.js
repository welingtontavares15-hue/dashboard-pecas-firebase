const fs = require('fs');
const path = require('path');

const storageCode = fs.readFileSync(path.join(__dirname, '../js/storage.js'), 'utf8');

const loadCloudStorage = (Auth, FirebaseInit, DataManager, Logger, windowObj) => {
    const factory = new Function('Auth', 'FirebaseInit', 'DataManager', 'Logger', 'window', `${storageCode}; return CloudStorage;`);
    return factory(Auth, FirebaseInit, DataManager, Logger, windowObj);
};

describe('CloudStorage supplier scope bootstrap', () => {
    let windowObj;
    let FirebaseInit;
    let Logger;

    beforeEach(() => {
        windowObj = {
            firebaseModules: {
                query: jest.fn((ref, order, equal) => ({ ref, order, equal })),
                orderByChild: jest.fn((field) => ({ type: 'orderByChild', field })),
                equalTo: jest.fn((value) => ({ type: 'equalTo', value }))
            }
        };
        FirebaseInit = {
            getRef: jest.fn((value) => `ref:${value}`)
        };
        Logger = {
            CATEGORY: {
                SYNC: 'sync'
            },
            debug: jest.fn(),
            info: jest.fn(),
            warn: jest.fn()
        };
    });

    it('builds the Hobart solicitation query from the stored session before Auth.init restores currentUser', () => {
        const Auth = {
            getCurrentUser: jest.fn(() => null),
            getStoredSession: jest.fn(() => JSON.stringify({
                id: 'fornecedor_hobart',
                username: 'fornecedor.hobart',
                name: 'Operacao Hobart',
                role: 'fornecedor',
                email: 'stale-hobart@example.com',
                fornecedorId: ''
            })),
            resolveSupplierId: jest.fn((user) => (String(user?.username || '').includes('hobart') ? 'sup-hobart' : null))
        };
        const DataManager = {};

        const CloudStorage = loadCloudStorage(Auth, FirebaseInit, DataManager, Logger, windowObj);
        const ref = CloudStorage.getCollectionRefForRead('diversey_solicitacoes');

        expect(windowObj.firebaseModules.orderByChild).toHaveBeenCalledWith('fornecedorId');
        expect(windowObj.firebaseModules.equalTo).toHaveBeenCalledWith('sup-hobart');
        expect(ref).toEqual({
            ref: 'ref:data/diversey_solicitacoes',
            order: { type: 'orderByChild', field: 'fornecedorId' },
            equal: { type: 'equalTo', value: 'sup-hobart' }
        });
    });

    it('skips supplier solicitation reads when there is no scoped supplier session yet', () => {
        const Auth = {
            getCurrentUser: jest.fn(() => null),
            getStoredSession: jest.fn(() => null),
            resolveSupplierId: jest.fn(() => null)
        };
        const DataManager = {};

        const CloudStorage = loadCloudStorage(Auth, FirebaseInit, DataManager, Logger, windowObj);
        const ref = CloudStorage.getCollectionRefForRead('diversey_solicitacoes');

        expect(ref).toBeNull();
        expect(windowObj.firebaseModules.query).not.toHaveBeenCalled();
    });
});
