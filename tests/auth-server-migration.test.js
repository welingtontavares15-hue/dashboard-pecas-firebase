const fs = require('fs');
const path = require('path');
const load = (file, name) => new Function(fs.readFileSync(path.join(__dirname, '..', file), 'utf8') + ';return ' + name)();

describe('Fronteira de identidade no modo servidor', () => {
    beforeEach(() => {
        window.PasskeyAuth = { configured: () => true, passwordLogin: jest.fn(async () => { throw Error('Servidor indisponível'); }) };
        global.APP_CONFIG = { authMode: 'server', passkeyEndpoint: '' };
    });
    afterEach(() => { delete window.PasskeyAuth; delete global.APP_CONFIG; delete global.CloudStorage; });
    test('sessão local adulterada não é restaurada e não há fallback quando o servidor falha', async () => {
        const auth = load('js/auth.js', 'Auth');
        localStorage.setItem(auth.SESSION_KEY, JSON.stringify({ id: 'admin', username: 'admin', role: 'administrador' }));
        expect(auth.init()).toBe(false);
        expect(auth.currentUser).toBeNull();
        const result = await auth.login('admin', 'senha');
        expect(result.success).toBe(false);
        expect(result.error).toBe('Servidor indisponível');
        expect(window.PasskeyAuth.passwordLogin).toHaveBeenCalledWith('admin', 'senha');
    });
    test('escopo de fornecedor usa somente vínculo confirmado pelo servidor', () => {
        const auth = load('js/auth.js', 'Auth');
        expect(auth.resolveSupplierId({ role: 'fornecedor', fornecedorId: 'verified', username: 'fornecedor.hobart' })).toBe('verified');
        expect(auth.resolveSupplierId({ role: 'fornecedor', fornecedorId: 7, username: 'fornecedor.hobart' })).toBe(7);
        expect(auth.resolveSupplierId({ role: 'fornecedor', username: 'fornecedor.hobart' })).toBeNull();
    });
    test('bootstrap não carrega hashes, contas padrão ou sessões legadas', async () => {
        global.CloudStorage = { init: jest.fn(async () => true) };
        const data = load('js/data.js', 'DataManager');
        data._initConnectionMonitoring = jest.fn();
        data.getDefaultUsers = jest.fn(() => { throw Error('Default seeding forbidden'); });
        data.migrateUserPasswords = jest.fn(() => { throw Error('Client migration forbidden'); });
        expect(await data.init()).toBe(true);
        expect(data.getUsers()).toEqual([]);
        expect(data.getDefaultUsers).not.toHaveBeenCalled();
        expect(data.migrateUserPasswords).not.toHaveBeenCalled();
    });
});
