import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const source = readFileSync(new URL('../../js/passkeys.js', import.meta.url), 'utf8');
function harness({ supportsBiometric = false } = {}) {
  const auth = { currentUser: { isAnonymous: false, async getIdToken() { return 'valid-test-token'; } } };
  const calls = [];
  const ctx = {
    APP_CONFIG: { passkeyEndpoint: 'https://example.test/auth' },
    window: {
      isSecureContext: true,
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
    console
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
