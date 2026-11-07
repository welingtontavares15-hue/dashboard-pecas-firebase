const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync, existsSync } = require('node:fs');
const http = require('node:http');
const puppeteer = require('puppeteer');

test('real browser: PRF encryption, persisted vault, device unlock and existing password validation', { timeout: 90000 }, async () => {
    const server = http.createServer((_req, res) => res.end('<!doctype html><title>WWM synthetic biometric test</title>'));
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: true,
            executablePath: process.env.PORTAL_CHROME_PATH || (existsSync('/usr/bin/google-chrome') ? '/usr/bin/google-chrome' : '/usr/bin/chromium'),
            args: ['--no-sandbox'] // Isolated synthetic test browser; no user profile or production data.
        });
        const page = await browser.newPage();
        await page.goto('http://localhost:' + server.address().port);
        const cdp = await page.createCDPSession();
        await cdp.send('WebAuthn.enable');
        await cdp.send('WebAuthn.addVirtualAuthenticator', { options: {
            protocol: 'ctap2', ctap2Version: 'ctap2_1', transport: 'internal',
            hasResidentKey: true, hasUserVerification: true, isUserVerified: true,
            hasPrf: true, automaticPresenceSimulation: true
        } });
        const install = async () => {
            await page.addScriptTag({ content: readFileSync('js/device-biometric.js', 'utf8') });
            await page.evaluate(() => {
                document.body.innerHTML = '<div id="login-screen"><form id="login-form"><input id="login-username"><input id="login-password" type="password"><button id="login-submit"></button></form><div id="login-error" class="hidden"></div><div id="device-biometric-panel" data-state="checking"><p id="device-biometric-greeting" hidden></p><button id="device-biometric-login"><strong id="device-biometric-label"></strong><small id="device-biometric-hint"></small></button></div><div id="device-biometric-status"></div><details id="device-biometric-help"></details></div><div id="app-container" class="hidden"></div><input id="device-biometric-password" type="password"><button id="device-biometric-enroll"></button><p id="device-biometric-profile-status"></p>';
                window.testState = { accepted: false, opened: false, logins: 0, messages: [] };
                window.Auth = {
                    getCurrentUser: () => ({ id: 'test-id', username: 'synthetic.tech', name: 'Synthetic' }),
                    login: async (username, password) => {
                        window.testState.logins++;
                        return { success: window.testState.accepted && username === 'synthetic.tech' && password === 'Synthetic-Password-827', user: { id: 'test-id', username: 'synthetic.tech', name: 'Synthetic' } };
                    },
                    logout: () => { window.testState.opened = false; }
                };
                window.Utils = { showToast: message => window.testState.messages.push(message), confirm: async () => true };
                window.PasskeyAuth = { configured: () => false, enabled: () => false, availability: () => ({ available: false }) };
            });
            await page.addScriptTag({ content: readFileSync('js/app.js', 'utf8') });
            await page.evaluate(() => { App.showApp = () => { window.testState.opened = true; }; App.navigate = async () => {}; });
        };
        await install();
        assert.equal(await page.evaluate(() => DeviceBiometric.available()), true);
        await page.evaluate(async () => {
            document.getElementById('device-biometric-password').value = 'Synthetic-Password-827';
            await App.enrollDeviceBiometric();
        });
        assert.equal(await page.evaluate(() => DeviceBiometric.hasEnrollment()), false, 'Rejected password cannot enroll');
        assert.match(await page.$eval('#device-biometric-profile-status', el => el.textContent), /Senha atual inválida/);
        await page.evaluate(async () => {
            document.getElementById('login-username').value = 'synthetic.tech';
            document.getElementById('login-password').value = 'Synthetic-Password-827';
            await App.handleDeviceBiometric();
        });
        assert.equal(await page.evaluate(() => DeviceBiometric.hasEnrollment()), false, 'Inline activation cannot bypass password validation');
        await page.evaluate(async () => {
            window.testState.accepted = true;
            await App.handleDeviceBiometric();
        });
        assert.equal(await page.evaluate(() => DeviceBiometric.hasEnrollment()), true);
        assert.match(await page.$eval('#device-biometric-profile-status', el => el.textContent), /Digital ativada e verificada/);
        assert.equal(await page.evaluate(async () => JSON.stringify(await DeviceBiometric.storage('get')).includes('Synthetic-Password-827')), false);
        // Saudação no login: só o primeiro nome fica em claro; nunca a senha nem o usuário.
        const record = await page.evaluate(async () => DeviceBiometric.storage('get'));
        assert.equal(record.displayName, 'Synthetic');
        assert.equal(JSON.stringify(record).includes('synthetic.tech'), false, 'Username stays inside the ciphertext');
        await page.evaluate(() => App.refreshDeviceBiometric());
        assert.equal(await page.$eval('#device-biometric-panel', el => el.dataset.state), 'ready');
        assert.match(await page.$eval('#device-biometric-greeting', el => el.textContent), /Olá, Synthetic/);
        await page.evaluate(() => App.handleLogout());
        assert.equal(await page.evaluate(() => DeviceBiometric.hasEnrollment()), true, 'Logout preserves the encrypted enrollment');
        await page.reload(); await install();
        assert.equal(await page.evaluate(() => DeviceBiometric.hasEnrollment()), true, 'Encrypted vault survives reload');
        await page.evaluate(() => App.handleDeviceBiometric());
        assert.equal(await page.evaluate(() => window.testState.opened), false, 'Biometric unlock alone cannot authorize login');
        await page.evaluate(async () => { window.testState.accepted = true; await App.handleDeviceBiometric(); });
        assert.equal(await page.evaluate(() => window.testState.opened), true);
        await page.evaluate(async () => {
            window.testState.opened = false;
            const record = await DeviceBiometric.storage('get');
            const bytes = DeviceBiometric.decode(record.ciphertext); bytes[0] ^= 1;
            record.ciphertext = DeviceBiometric.encode(bytes); await DeviceBiometric.storage('put', record);
            await App.handleDeviceBiometric();
        });
        assert.equal(await page.evaluate(() => window.testState.opened), false, 'Tampering cannot authorize login');
        await page.evaluate(() => DeviceBiometric.forget());
        assert.equal(await page.evaluate(() => DeviceBiometric.hasEnrollment()), false);
    } finally {
        await browser?.close();
        await new Promise(resolve => server.close(resolve));
    }
});
