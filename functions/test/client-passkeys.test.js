import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const source = readFileSync(new URL('../../js/passkeys.js', import.meta.url), 'utf8');
function harness({ supportsBiometric = false, endpoint = 'https://example.test/auth', secure = true } = {}) {
  const auth = { currentUser: { isAnonymous: false, async getIdToken() { return 'valid-test-token'; } } };
  const calls = [];
  const ctx = {
    APP_CONFIG: { passkeyEndpoint: endpoint },
    window: {
      isSecureContext: secure,
      PublicKeyCredential: supportsBiometric ? function Credential() {} : undefined,
      crypto: { subtle: {} },
      firebaseAuth: auth,
      firebaseModules: {
        signInWithCustomToken: async () => {},
        signOut: async () => { calls.push('signOut'); }
      }
    },
    navigator: { credentials: supportsBiometric ? {} : undefined },
    Uint8Array, atob, btoa, AbortSignal, fetch: async () => ({ ok: true, json: async () => ({}) }),
    console, setTimeout, clearTimeout
  };
  const client = vm.runInNewContext(source + '\nPasskeyAuth;', ctx);
  return { client, calls };
}
test('password fallback is enabled without biometric hardware', async () => {
  const { client } = harness();
  assert.equal(client.enabled(), true);
  assert.equal(client.supported(), false);
  client.request = async (action, body) => {
    assert.equal(action, 'login/password');
    assert.equal(body.username, 'tecnico');
    assert.equal(body.password, '1234');
    return { token: 'server-issued', user: { id: 'u1' } };
  };
  client.exchangeToken = async (data) => ({ success: data.token === 'server-issued' });
  assert.equal((await client.passwordLogin('tecnico', '1234')).success, true);
});
test('WebAuthn support is evaluated independently', () => {
  const { client } = harness({ supportsBiometric: true });
  assert.equal(client.supported(), true);
});
test('logout asks server to revoke then signs out of Firebase', async () => {
  const { client, calls } = harness();
  client.request = async (route) => {
    calls.push(route);
    return { success: true };
  };
  await client.logout();
  assert.deepEqual(calls, ['session/logout', 'signOut']);
});
test('logout still signs out locally if server is unreachable', async () => {
  const { client, calls } = harness();
  client.request = async () => { throw Error('offline'); };
  await client.logout();
  assert.deepEqual(calls, ['signOut']);
});

test('biometric option reports unconfigured service without implying successful login', () => {
  const { client } = harness({ supportsBiometric: true, endpoint: '' });
  const state = client.availability();
  assert.equal(state.available, false);
  assert.match(state.message, /em configuração/i);
  assert.equal(client.supported(), false);
});
test('biometric option reports device capability and HTTPS requirements', () => {
  const unsupported = harness({ supportsBiometric: false }).client.availability();
  assert.equal(unsupported.available, false);
  assert.match(unsupported.message, /celular/i);
  const insecure = harness({ supportsBiometric: true, secure: false }).client.availability();
  assert.equal(insecure.available, false);
  assert.match(insecure.message, /HTTPS/);
  const available = harness({ supportsBiometric: true }).client.availability();
  assert.equal(available.available, true);
});
test('login offers device unlock and reserves the server passkey panel for a configured backend', () => {
  const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
  const panel = html.match(/<div id="passkey-login-panel"[^>]*>/)?.[0] || '';
  assert.ok(panel, 'biometric panel is missing');
  assert.match(panel, /class="[^"]*hidden/);
  assert.match(html, /id="device-biometric-login"[^>]*aria-describedby="device-biometric-status"/);
  assert.match(html, /id="passkey-login-btn"[^>]*aria-describedby="passkey-login-status"/);
  assert.match(html, /id="passkey-login-status"[^>]*role="status"/);
  const app = readFileSync(new URL('../../js/app.js', import.meta.url), 'utf8');
  assert.match(app, /passkeyPanel\.classList\.toggle\('hidden', !serverIdentity\)/);
  assert.match(app, /passkeyButton\.disabled\s*=\s*this\.isBootstrapping\s*\|\|\s*!readiness\.available/);
});
