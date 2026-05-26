const fs = require('fs');
const path = require('path');

const authCode = fs.readFileSync(path.join(__dirname, '../js/auth.js'), 'utf8');

const loadAuth = () => {
    const factory = new Function(`${authCode}; return Auth;`);
    return factory();
};

describe('Auth supplier session fallback', () => {
    beforeEach(() => {
        global.Utils = {
            normalizeText: (value) => String(value || '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase(),
            supplierHasOperationalEmail: (supplier, email) => String(supplier?.email || '').trim().toLowerCase() === String(email || '').trim().toLowerCase()
        };
        global.DataManager = {
            getSuppliers: jest.fn(() => [
                { id: 'sup-ebst', nome: 'EBST', email: 'pedidos@ebstecnologica.com.br' },
                { id: 'sup-hobart', nome: 'Hobart', email: 'pedidos@hobart.com.br' }
            ]),
            normalizeEmail: jest.fn((value) => String(value || '').trim().toLowerCase())
        };
    });

    afterEach(() => {
        delete global.Utils;
        delete global.DataManager;
    });

    it('infers fornecedorId from supplier email when the user record is stale', () => {
        const Auth = loadAuth();
        const sessionUser = Auth.buildSessionUser({
            id: 'fornecedor_hobart',
            username: 'fornecedor.hobart',
            name: 'Fornecedor Hobart',
            role: 'fornecedor',
            email: 'pedidos@hobart.com.br'
        });

        expect(sessionUser.fornecedorId).toBe('sup-hobart');
    });

    it('persists the inferred fornecedorId on the active session', () => {
        const Auth = loadAuth();
        Auth.currentUser = {
            id: 'fornecedor_hobart',
            username: 'fornecedor.hobart',
            name: 'Fornecedor Hobart',
            role: 'fornecedor',
            email: 'pedidos@hobart.com.br',
            fornecedorId: ''
        };
        Auth.persistSession = jest.fn();

        expect(Auth.getFornecedorId()).toBe('sup-hobart');
        expect(Auth.currentUser.fornecedorId).toBe('sup-hobart');
        expect(Auth.persistSession).toHaveBeenCalled();
    });

    it('falls back to supplier aliases when the supplier registry is not loaded yet', () => {
        global.DataManager.getSuppliers.mockReturnValue([]);

        const Auth = loadAuth();
        const sessionUser = Auth.buildSessionUser({
            id: 'fornecedor_hobart',
            username: 'fornecedor.hobart',
            name: 'Operacao Fornecedor',
            role: 'fornecedor',
            email: 'stale-hobart@example.com'
        });

        expect(sessionUser.fornecedorId).toBe('sup-hobart');
    });

    it('rewrites a legacy Hobart supplierId to the canonical supplier scope during session bootstrap', () => {
        const Auth = loadAuth();
        const sessionUser = Auth.buildSessionUser({
            id: 'fornecedor_hobart_legacy',
            username: 'Hobart',
            name: 'Hobart',
            role: 'fornecedor',
            email: 'tavarespatricia845@gmail.com',
            fornecedorId: 'mmqo7gg5i4oke5xgel'
        });

        expect(sessionUser.fornecedorId).toBe('sup-hobart');
    });
});
