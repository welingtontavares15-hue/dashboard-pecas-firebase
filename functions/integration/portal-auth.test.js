import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import http from 'node:http';
import puppeteer from 'puppeteer';
import { initializeApp } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { readFileSync } from 'node:fs';
import { execFile as execFileCallback } from 'node:child_process';
import { promisify } from 'node:util';
import { prepareMigration } from '../migration.js';
import { firebaseUid } from '../passkey-utils.js';

const projectId = 'demo-wwm-rules';
const origin = 'http://localhost:5000';
const endpoint = `http://127.0.0.1:5001/${projectId}/southamerica-east1/portalPasskeys`;
const password = 'Demo-Valid-123';
function record(id, role, extra = {}) {
  return { id, username: id, name: id, role, passwordHash: createHash('sha256').update(password + 'diversey_salt_v1:' + id).digest('hex'), ...extra };
}
async function api(action, payload = {}, token, requestOrigin = origin) {
  const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: requestOrigin, ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: JSON.stringify({ action, ...payload }) });
  return { status: response.status, data: await response.json() };
}
async function exchange(token) {
  const response = await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=demo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, returnSecureToken: true }) });
  const data = await response.json(); assert.equal(response.status, 200, JSON.stringify(data)); return data.idToken;
}
async function login(username, inputPassword = password) {
  const result = await api('login/password', { username, password: inputPassword });
  assert.equal(result.status, 200, JSON.stringify(result.data));
  assert.equal(result.data.user.passwordHash, undefined);
  return { token: await exchange(result.data.token), profile: result.data.user };
}
async function databaseStatus(path, token, method = 'GET', value) {
  const response = await fetch(`http://127.0.0.1:9000/${path}.json?ns=${projectId}&auth=${encodeURIComponent(token)}`, { method, ...(value ? { body: JSON.stringify(value) } : {}) });
  return response.status;
}

test('HTTP functions + Auth + RTDB + real WebAuthn verification with virtual authenticator', { timeout: 120000 }, async () => {
  assert.ok(process.env.FIREBASE_AUTH_EMULATOR_HOST && process.env.FIREBASE_DATABASE_EMULATOR_HOST, 'Emulators required');
  initializeApp({ projectId, databaseURL: `https://${projectId}.firebaseio.com` });
  const rulesEnv = await initializeTestEnvironment({ projectId, database: { rules: readFileSync('firebase/database.rules.passkeys.json', 'utf8') } });
  const db = getDatabase();
  const run = promisify(execFileCallback);
  const migrationEnv = { ...process.env, PORTAL_PROJECT_ID: projectId, PORTAL_DATABASE_URL: `https://${projectId}.firebaseio.com` };
  await db.ref().set({ data: { diversey_users: { data: [record('admin', 'administrador')] }, diversey_sessions: { old: { role: 'administrador' } } } });
  const dryRun = await run(process.execPath, ['functions/migrate-identities.js'], { env: migrationEnv });
  const inventory = JSON.parse(dryRun.stdout);
  assert.equal(inventory.count, 1);
  assert.equal(dryRun.stdout.includes('passwordHash'), false);
  assert.equal((await db.ref('portalIdentity').get()).exists(), false, 'Dry run must not mutate identities');
  await run(process.execPath, ['functions/migrate-identities.js', '--apply', '--source-fingerprint=' + inventory.sourceFingerprint], { env: migrationEnv });
  assert.equal((await db.ref('portalIdentity/status').get()).val(), 'ready');
  assert.equal((await db.ref('data/diversey_sessions').get()).exists(), false);
  assert.equal((await db.ref('data/diversey_users/data/0/passwordHash').get()).exists(), false);
  await db.ref().set({ portalIdentity: await prepareMigration([
    record('admin', 'administrador'), record('manager', 'gestor'),
    record('tech', 'tecnico', { tecnicoId: 'tec1' }), record('supplier', 'fornecedor', { fornecedorId: 'sup1' }),
    record('disabled', 'gestor', { disabled: true })
  ]), data: { diversey_settings: { theme: 'light' }, diversey_tecnicos: { data: [{ id: 'tec1', nome: 'Demo' }] },
    diversey_fornecedores: { data: [{ id: 'sup1', nome: 'Demo supplier' }] }, diversey_solicitacoes: {
      own: { id: 'own', tecnicoId: 'tec1', fornecedorId: 'sup1', status: 'aprovada', createdAt: 1, updatedAt: 1, itens: { a: 1 }, total: 10 },
      other: { id: 'other', tecnicoId: 'tec2', fornecedorId: 'sup2', status: 'aprovada', createdAt: 1, updatedAt: 1, itens: { a: 1 }, total: 50 }
    } } });
  let browser; let server;
  try {
    assert.equal((await api('login/password', { username: 'disabled', password })).status, 401);
    assert.equal((await api('login/password', { username: 'admin', password: 'wrong' })).status, 401);
    assert.equal((await api('login/options', {}, null, 'https://evil.example')).status, 403);
    const admin = await login('adm'); const manager = await login('manager'); const tech = await login('tech'); const supplier = await login('supplier');
    const privateUser = (await db.ref('portalIdentity/users/' + firebaseUid('admin')).get()).val();
    assert.equal(privateUser.passwordHash, undefined); assert.equal(privateUser.passwordRecord.scheme, 'scrypt-v1');
    for (const session of [admin, manager, tech, supplier]) {
      assert.equal(await databaseStatus('data/diversey_users', session.token), 401);
      assert.equal(await databaseStatus('portalIdentity', session.token), 401);
      assert.equal(await databaseStatus('authz/users/fake', session.token, 'PUT', { role: 'administrador' }), 401);
    }
    assert.equal((await api('users/save', { user: record('evil', 'administrador') }, manager.token)).status, 403);
    assert.equal((await api('users/password', { userId: 'admin', newPassword: 'Other-123' }, tech.token)).status, 403);
    assert.equal((await api('solicitations/tracking', { id: 'other', trackingCode: 'DEMO123' }, supplier.token)).status, 403);
    assert.equal((await api('solicitations/tracking', { id: 'own', trackingCode: 'DEMO123', dataEnvio: '2026-02-31' }, supplier.token)).status, 400);
    assert.equal((await api('solicitations/tracking', { id: 'own', trackingCode: 'DEMO123', dataEnvio: '2020-01-15', total: 0 }, supplier.token)).status, 200);
    assert.equal((await db.ref('data/diversey_solicitacoes/own/total').get()).val(), 10);
    assert.equal((await db.ref('data/diversey_solicitacoes/own/dataEnvio').get()).val(), '2020-01-15');
    assert.equal((await api('solicitations/receipt', { id: 'other' }, tech.token)).status, 403);
    assert.equal((await api('solicitations/receipt', { id: 'own', total: 0 }, tech.token)).status, 200);
    assert.equal((await db.ref('data/diversey_solicitacoes/own/total').get()).val(), 10);
    assert.equal((await api('users/list', {}, tech.token)).data.users.length, 1);
    const linked = { type: 'technician', record: { id: 'tec-new', nome: 'New technician', ativo: true } };
    assert.equal((await api('users/save', { user: { id: 'new', username: 'new', role: 'tecnico', tecnicoId: 'tec-new', password: 'New-123' }, linked }, admin.token)).status, 200);
    const updated = await api('users/save', { user: { id: 'new', username: 'new', name: 'Updated', role: 'tecnico', tecnicoId: 'tec-new' } }, admin.token);
    assert.equal(updated.status, 200); await login('new', 'New-123');
    assert.equal((await api('users/delete', { linked: { type: 'technician', id: 'tec-new' } }, admin.token)).status, 200);
    assert.equal((await db.ref('portalIdentity/users/' + firebaseUid('new')).get()).exists(), false);
    assert.equal((await api('users/save', { user: { ...manager.profile, disabled: true } }, admin.token)).status, 200);
    assert.equal(await databaseStatus('data/diversey_settings', manager.token), 401);
    assert.equal((await api('session/profile', {}, manager.token)).status, 403);

    // Chrome uses a synthetic CTAP2 authenticator; backend verifies actual signatures.
    server = http.createServer((_req, res) => res.end('<!doctype html><title>WebAuthn emulator test</title>'));
    await new Promise(resolve => server.listen(5000, '127.0.0.1', resolve));
    browser = await puppeteer.launch({ headless: true, executablePath: process.env.PORTAL_CHROME_PATH || (process.platform === 'win32' ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' : '/usr/bin/google-chrome') });
    const page = await browser.newPage(); await page.goto(origin);
    const cdp = await page.createCDPSession(); await cdp.send('WebAuthn.enable');
    await cdp.send('WebAuthn.addVirtualAuthenticator', { options: { protocol: 'ctap2', transport: 'internal', hasResidentKey: true, hasUserVerification: true, isUserVerified: true, automaticPresenceSimulation: true } });
    const registration = await api('register/options', { username: 'tech', password }, tech.token);
    assert.equal(registration.status, 200, JSON.stringify(registration.data));
    const createCredential = options => page.evaluate(async options => {
      const bytes = value => Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/')), x => x.charCodeAt(0));
      const encoded = value => btoa(String.fromCharCode(...new Uint8Array(value))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      const c = await navigator.credentials.create({ publicKey: { ...options, challenge: bytes(options.challenge), user: { ...options.user, id: bytes(options.user.id) }, excludeCredentials: (options.excludeCredentials || []).map(item => ({ ...item, id: bytes(item.id) })) } });
      return { id: c.id, rawId: encoded(c.rawId), type: c.type, response: { clientDataJSON: encoded(c.response.clientDataJSON), attestationObject: encoded(c.response.attestationObject), transports: c.response.getTransports() }, clientExtensionResults: c.getClientExtensionResults() };
    }, options);
    const credential = await createCredential(registration.data.options);
    const verifyBody = { challengeId: registration.data.challengeId, response: credential };
    assert.equal((await api('register/verify', verifyBody, tech.token)).status, 200);
    assert.equal((await api('register/verify', verifyBody, tech.token)).status, 401);
    const authentication = await api('login/options');
    const assertion = await page.evaluate(async options => {
      const bytes = value => Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/')), x => x.charCodeAt(0));
      const encoded = value => btoa(String.fromCharCode(...new Uint8Array(value))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      const c = await navigator.credentials.get({ publicKey: { ...options, challenge: bytes(options.challenge) } });
      return { id: c.id, rawId: encoded(c.rawId), type: c.type, response: { clientDataJSON: encoded(c.response.clientDataJSON), authenticatorData: encoded(c.response.authenticatorData), signature: encoded(c.response.signature), userHandle: encoded(c.response.userHandle) }, clientExtensionResults: c.getClientExtensionResults() };
    }, authentication.data.options);
    const concurrent = await Promise.all([1, 2].map(() => api('login/verify', { challengeId: authentication.data.challengeId, response: assertion })));
    assert.deepEqual(concurrent.map(result => result.status).sort(), [200, 401]);
    const result = concurrent.find(result => result.status === 200);
    assert.equal(result.status, 200, JSON.stringify(result.data));
    assert.equal((await api('login/verify', { challengeId: authentication.data.challengeId, response: assertion })).status, 401);
    const invalidChallenge = '00000000-0000-4000-8000-000000000001';
    await db.ref('passkeys/challenges/' + invalidChallenge).set({ type: 'login', challenge: authentication.data.options.challenge, expiresAt: Date.now() + 60000 });
    const badSignature = Buffer.from(assertion.response.signature, 'base64url'); badSignature[0] ^= 255;
    assert.equal((await api('login/verify', { challengeId: invalidChallenge, response: { ...assertion, response: { ...assertion.response, signature: badSignature.toString('base64url') } } })).status, 401);
    const passkeyToken = await exchange(result.data.token);
    assert.equal((await api('session/profile', {}, passkeyToken)).status, 200);
    assert.equal((await api('session/logout', {}, passkeyToken)).status, 200);
    assert.equal(await databaseStatus('data/diversey_settings', passkeyToken), 401);
    assert.notEqual((await api('session/profile', {}, passkeyToken)).status, 200);
    const relogin = await login('tech');
    assert.equal(await databaseStatus('data/diversey_settings', passkeyToken), 401);
    assert.equal((await api('session/profile', {}, tech.token)).status, 200, 'Logout of one session must preserve a second session');
    assert.equal((await api('users/password', { userId: 'tech', newPassword: 'Replacement-123' }, admin.token)).status, 200);
    assert.equal(await databaseStatus('data/diversey_settings', relogin.token), 401);
    const resetSession = await login('tech', 'Replacement-123');
    const newRegistration = await api('register/options', { username: 'tech', password: 'Replacement-123' }, resetSession.token);
    assert.equal(newRegistration.status, 200);
    assert.equal(newRegistration.data.options.excludeCredentials.length, 0, 'Revoked passkeys must not block re-enrollment');
    const replacementCredential = await createCredential(newRegistration.data.options);
    assert.equal((await api('register/verify', { challengeId: newRegistration.data.challengeId, response: replacementCredential }, resetSession.token)).status, 200);
    const expired = await login('tech', 'Replacement-123');
    const claims = JSON.parse(Buffer.from(expired.token.split('.')[1], 'base64url'));
    await db.ref('authz/sessions/' + claims.portal_session_id + '/expiresAt').set(Date.now() - 1000);
    assert.equal((await api('session/profile', {}, expired.token)).status, 403,
      'An expired server grant must never be renewed');
    assert.equal(await databaseStatus('data/diversey_settings', expired.token), 401,
      'Expired server grants must also be rejected by RTDB rules');
    assert.equal((await api('session/logout', {}, expired.token)).status, 200);
    assert.equal((await api('session/profile', {}, expired.token)).status, 403);
  } finally {
    if (browser) await browser.close();
    if (server) await new Promise(resolve => server.close(resolve));
    db.goOffline();
    await rulesEnv.cleanup();
  }
});
