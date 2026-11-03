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
                document.body.innerHTML = '<div id="login-screen"><form id="login-form"><input id="login-username"><input id="login-password" type="password"></form><div id="login-error" class="hidden"></div><button id="device-biometric-login"></button><div id="device-biometric-status"></div><details id="device-biometric-help"></details></div><div id="app-container" class="hidden"></div><input id="device-biometric-password" type="password"><button id="device-biometric-enroll"></button>';
                window.testState = { accepted: false, opened: false, logins: 0, messages: [] };
                window.Auth = {
                    getCurrentUser: () => ({ id: 'test-id', username: 'synthetic.tech', name: 'Synthetic' }),
                    login: async (username, password) => {
                        window.testState.logins++;
                        return { success: window.testState.accepted && username === 'synthetic.tech' && password === 'Synthetic-Password-827', user: { id: 'test-id' } };
                    },
                    logout: () => { window.testState.opened = false; }
                };
                window.Utils = { showToast: message => window.testState.messages.push(message) };
                window.PasskeyAuth = { configured: () => false };
            });
            await page.addScriptTag({ content: readFileSync('js/app.js', 'utf8') });
            await page.evaluate(() => { App.showApp = () => { window.testState.opened = true; }; });
        };
        await install();
        assert.equal(await page.evaluate(() => DeviceBiometric.available()), true);
        await page.evaluate(async () => {
            document.getElementById('device-biometric-password').value = 'Synthetic-Password-827';
            await App.enrollDeviceBiometric();
        });
        assert.equal(await page.evaluate(() => DeviceBiometric.hasEnrollment()), false, 'Rejected password cannot enroll');
        await page.evaluate(async () => {
            window.testState.accepted = true;
            document.getElementById('device-biometric-password').value = 'Synthetic-Password-827';
            await App.enrollDeviceBiometric();
        });
        assert.equal(await page.evaluate(() => DeviceBiometric.hasEnrollment()), true);
        assert.equal(await page.evaluate(async () => JSON.stringify(await DeviceBiometric.storage('get')).includes('Synthetic-Password-827')), false);
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
