const fs = require('fs');
const path = require('path');
const source = name => fs.readFileSync(path.join(__dirname, '..', name), 'utf8');
const load = (file, name) => new Function(source(file) + ';return ' + name)();

describe('Saved password login', () => {
    let passwords;
    let app;
    beforeEach(() => {
        document.body.innerHTML = new DOMParser().parseFromString(source('index.html'), 'text/html').body.innerHTML;
        Object.defineProperty(window, 'isSecureContext', { configurable: true, value: true });
        window.PasswordCredential = jest.fn(function (data) { Object.assign(this, data); });
        Object.defineProperty(navigator, 'credentials', { configurable: true, value: {
            get: jest.fn(async () => null), store: jest.fn(async () => {}),
            preventSilentAccess: jest.fn(async () => {})
        } });
        window.PasskeyAuth = { configured: () => false, enabled: () => false, availability: () => ({ available: false, message: 'Sem servidor' }) };
        passwords = load('js/saved-passwords.js', 'SavedPasswords');
        app = load('js/app.js', 'App');
        global.Auth = { login: jest.fn(), logout: jest.fn() };
        global.Utils = { showToast: jest.fn(), confirm: jest.fn(async () => true) };
        app.showApp = jest.fn();
    });
    afterEach(() => {
        delete window.SavedPasswords; delete window.PasskeyAuth; delete window.PasswordCredential;
        delete global.Auth; delete global.Utils; delete window.App;
    });

    test('uses native password autofill metadata and keeps secrets out of GET URLs', () => {
        const form = document.getElementById('login-form');
        expect(form.getAttribute('method')).toBe('post');
        expect(form.getAttribute('autocomplete')).toBe('on');
        expect(form.querySelector('[name="username"]').autocomplete).toBe('username');
        expect(form.querySelector('[name="password"]').autocomplete).toBe('current-password');
    });

    test('native choice enters only after the existing password validation succeeds', async () => {
        navigator.credentials.get.mockResolvedValue({ type: 'password', id: 'test.tech', password: 'Synthetic-123' });
        Auth.login.mockResolvedValueOnce({ success: false, error: 'Senha inválida' });
        await app.handleSavedPassword();
        expect(navigator.credentials.get).toHaveBeenCalledWith({ password: true, mediation: 'required' });
        expect(document.getElementById('login-username').value).toBe('test.tech');
        expect(document.getElementById('login-password').value).toBe('Synthetic-123');
        expect(Auth.login).toHaveBeenCalledWith('test.tech', 'Synthetic-123');
        expect(app.showApp).not.toHaveBeenCalled();
        expect(navigator.credentials.store).not.toHaveBeenCalled();
        expect(document.getElementById('login-error').textContent).toBe('Senha inválida');
        Auth.login.mockResolvedValueOnce({ success: true, user: { name: 'Test' } });
        await app.handleSavedPassword();
        expect(app.showApp).toHaveBeenCalledTimes(1);
    });

    test.each([null, { type: 'public-key', id: 'key' }])('no stored password leaves ordinary login available: %p', async credential => {
        navigator.credentials.get.mockResolvedValue(credential);
        await app.handleSavedPassword();
        expect(Auth.login).not.toHaveBeenCalled();
        expect(document.getElementById('saved-password-help').open).toBe(true);
        expect(document.getElementById('saved-password-btn').disabled).toBe(false);
    });

    test('a declined chooser never authenticates or clears the typed form', async () => {
        document.getElementById('login-username').value = 'typed.user';
        navigator.credentials.get.mockRejectedValue(new DOMException('Cancelled', 'NotAllowedError'));
        await app.handleSavedPassword();
        expect(document.getElementById('login-username').value).toBe('typed.user');
        expect(Auth.login).not.toHaveBeenCalled();
    });

    test.each(['insecure', 'unsupported'])('uses ordinary autofill when the API is %s', async mode => {
        if (mode === 'insecure') Object.defineProperty(window, 'isSecureContext', { value: false });
        else delete window.PasswordCredential;
        await app.handleSavedPassword();
        expect(navigator.credentials.get).not.toHaveBeenCalled();
        expect(document.activeElement.id).toBe('login-username');
        expect(document.getElementById('login-submit').disabled).toBe(false);
    });

    test('only an accepted password is offered to the native manager', async () => {
        document.getElementById('login-username').value = 'test.tech';
        document.getElementById('login-password').value = 'Synthetic-123';
        Auth.login.mockResolvedValueOnce({ success: false, error: 'Credenciais inválidas' });
        await app.handleLogin();
        expect(navigator.credentials.store).not.toHaveBeenCalled();
        Auth.login.mockResolvedValueOnce({ success: true, user: { name: 'Test' } });
        await app.handleLogin();
        expect(Auth.login).toHaveBeenLastCalledWith('test.tech', 'Synthetic-123');
        expect(navigator.credentials.store).toHaveBeenCalledWith(expect.objectContaining({ id: 'test.tech', password: 'Synthetic-123' }));
        expect(app.showApp).toHaveBeenCalledTimes(1);
        expect(document.getElementById('login-password').value).toBe('');
    });

    test('a rejected save does not block a valid login', async () => {
        document.getElementById('login-username').value = 'test.tech';
        document.getElementById('login-password').value = 'Synthetic-123';
        navigator.credentials.store.mockRejectedValue(Error('Declined'));
        Auth.login.mockResolvedValue({ success: true, user: { name: 'Test' } });
        await app.handleLogin();
        expect(app.showApp).toHaveBeenCalled();
    });

    test('shows only the appropriate convenience option and disables choice during bootstrap', () => {
        app.showLogin();
        expect(document.getElementById('passkey-login-panel').classList.contains('hidden')).toBe(true);
        expect(document.getElementById('saved-password-panel').classList.contains('hidden')).toBe(false);
        window.PasskeyAuth.configured = () => true;
        app.showLogin();
        expect(document.getElementById('saved-password-panel').classList.contains('hidden')).toBe(true);
        app.setLoginBootstrapState(true);
        expect(document.getElementById('saved-password-btn').disabled).toBe(true);
    });

    test('logout prevents silent password access even when saving is unavailable', async () => {
        await app.handleLogout();
        expect(Auth.logout).toHaveBeenCalled();
        expect(navigator.credentials.preventSilentAccess).toHaveBeenCalledTimes(1);
    });
});
