const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');

function mount({ server = false, passkeyAvailable = false, deviceAvailable = false, enrolled = false } = {}) {
    document.body.innerHTML = `
        <div id="login-screen" class="hidden">
            <input id="login-username">
            <input id="login-password">
            <button id="login-submit"></button>
            <div id="login-error" class="hidden"></div>
            <div id="login-status" class="hidden"></div>
            <div id="device-biometric-panel" class="hidden" data-state="checking">
                <p id="device-biometric-greeting" hidden></p>
                <button id="device-biometric-login" disabled></button>
                <strong id="device-biometric-label"></strong>
                <small id="device-biometric-hint"></small>
                <p id="device-biometric-status" hidden></p>
                <details id="device-biometric-help"></details>
            </div>
            <div id="device-biometric-divider"></div>
            <div id="passkey-login-panel" class="hidden">
                <button id="passkey-login-btn" disabled></button>
                <p id="passkey-login-status" hidden></p>
            </div>
            <div id="login-credentials" class="hidden"><tbody id="login-credentials-body"></tbody></div>
        </div>
        <div id="app-container"></div>`.replace(/\\`/g, '`');
    const appWindow = {
        addEventListener() {},
        firebaseUser: null,
        PasskeyAuth: {
            configured: () => server,
            availability: () => ({ available: passkeyAvailable, message: passkeyAvailable ? 'Pronto.' : 'Indisponível.' })
        },
        DeviceBiometric: {
            available: async () => deviceAvailable,
            enrollmentInfo: async () => ({ enrolled, displayName: 'Técnico' })
        }
    };
    const fakeDocument = {
        getElementById: id => document.getElementById(id),
        addEventListener() {}
    };
    vm.runInNewContext(source, {
        window: appWindow, document: fakeDocument, console,
        setTimeout, clearTimeout
    }, { timeout: 1000 });
    appWindow.App.isBootstrapping = false;
    return { app: appWindow.App, el: id => document.getElementById(id) };
}

describe('WWM login v90 — apresentação e disponibilidade', () => {
    test('sem digital disponível: não mostra ação biométrica nem opção desativada', async () => {
        const { app, el } = mount();
        app.showLogin();
        await app.refreshDeviceBiometric();
        expect(el('device-biometric-panel').classList.contains('hidden')).toBe(true);
        expect(el('passkey-login-panel').classList.contains('hidden')).toBe(true);
        expect(el('login-screen').classList.contains('hidden')).toBe(false);
    });

    test('dispositivo compatível: exibe apenas ativação com instrução curta', async () => {
        const { app, el } = mount({ deviceAvailable: true });
        app.showLogin();
        await app.refreshDeviceBiometric();
        expect(el('device-biometric-panel').classList.contains('hidden')).toBe(false);
        expect(el('device-biometric-panel').dataset.state).toBe('enroll');
        expect(el('device-biometric-label').textContent).toBe('Entrar e ativar digital');
        expect(el('passkey-login-panel').classList.contains('hidden')).toBe(true);
    });

    test('digital cadastrada: exibe acesso rápido e não mostra passkey', async () => {
        const { app, el } = mount({ deviceAvailable: true, enrolled: true });
        app.showLogin();
        await app.refreshDeviceBiometric();
        expect(el('device-biometric-panel').dataset.state).toBe('ready');
        expect(el('device-biometric-label').textContent).toBe('Entrar com digital');
        expect(el('passkey-login-panel').classList.contains('hidden')).toBe(true);
    });

    test('backend de passkeys configurado mas indisponível: apenas senha', () => {
        const { app, el } = mount({ server: true, passkeyAvailable: false, deviceAvailable: true });
        app.showLogin();
        expect(el('passkey-login-panel').classList.contains('hidden')).toBe(true);
        expect(el('device-biometric-panel').classList.contains('hidden')).toBe(true);
    });

    test('passkey disponível: um único método biométrico ativo', () => {
        const { app, el } = mount({ server: true, passkeyAvailable: true, deviceAvailable: true });
        app.showLogin();
        expect(el('passkey-login-panel').classList.contains('hidden')).toBe(false);
        expect(el('passkey-login-btn').disabled).toBe(false);
        expect(el('device-biometric-panel').classList.contains('hidden')).toBe(true);
    });

    test('identidade institucional preservada, conteúdo do login simplificado', () => {
        const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
        const design = fs.readFileSync(path.join(root, 'css/wwm-design-system.css'), 'utf8');
        expect(html).toContain('Entrar no portal');
        expect(html).toContain('Diversey');
        expect(html).toContain('A Solenis Company');
        expect(html).toContain('Como ativar a digital');
        expect(html).not.toContain('premium-login-capabilities');
        expect(design).toContain('#passkey-login-panel.hidden');
        expect(design).toContain('#device-biometric-panel.hidden');
    });
});
