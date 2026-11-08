import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../../js/device-biometric.js', import.meta.url), 'utf8');
function harness() {
  let saved = null;
  const calls = [];
  const state = { prf: true, createEnabled: true, cancelled: false, uv: true, correctChallenge: true, attachment: 'platform', secret: 31 };
  const id = new Uint8Array([1, 2, 3, 4]);
  const encode = value => Buffer.from(value).toString('base64url');
  const ctx = {
    window: {
      isSecureContext: true, crypto: webcrypto, indexedDB: {},
      location: { origin: 'https://portal.example', hostname: 'portal.example' },
      PublicKeyCredential: { isUserVerifyingPlatformAuthenticatorAvailable: async () => true }
    },
    navigator: { credentials: {
      create: async options => {
        calls.push({ type: 'create', options });
        if (state.cancelled) throw new DOMException('Cancelled', 'NotAllowedError');
        return { type: 'public-key', rawId: id, authenticatorAttachment: state.attachment, getClientExtensionResults: () => ({ prf: { enabled: state.prf ? state.createEnabled : false } }) };
      },
      get: async options => {
        calls.push({ type: 'get', options });
        if (state.cancelled) throw new DOMException('Cancelled', 'NotAllowedError');
        const authData = new Uint8Array(37);
        authData.set(new Uint8Array(await webcrypto.subtle.digest('SHA-256', new TextEncoder().encode('portal.example'))));
        authData[32] = state.uv ? 5 : 1;
        return {
          type: 'public-key', rawId: id, authenticatorAttachment: state.attachment,
          response: {
            authenticatorData: authData,
            clientDataJSON: new TextEncoder().encode(JSON.stringify({ type: 'webauthn.get', origin: 'https://portal.example', challenge: state.correctChallenge ? encode(options.publicKey.challenge) : 'wrong' }))
          },
          getClientExtensionResults: () => state.prf ? { prf: { results: { first: new Uint8Array(32).fill(state.secret).buffer } } } : {}
        };
      }
    } },
    Uint8Array, TextEncoder, TextDecoder, btoa, atob
  };
  const client = vm.runInNewContext(source + '\nDeviceBiometric;', ctx);
  client.storage = async (operation, value) => {
    if (operation === 'put') saved = structuredClone(value);
    if (operation === 'delete') saved = null;
    return saved;
  };
  return { client, calls, state, ctx, record: () => saved };
}
const user = { username: 'synthetic.tech', password: 'Synthetic-Password-827', userId: 'test-id', name: 'Synthetic' };

test('roundtrip uses device WebAuthn with UV, PRF and nonextractable encryption; stores no password or key', async () => {
  const { client, calls, record } = harness();
  await client.enroll(user);
  const stored = JSON.stringify(record());
  assert.ok(!stored.includes(user.password) && !stored.includes(user.username));
  // displayName é a única informação em claro: o primeiro nome, para a saudação do login.
  assert.deepEqual(Object.keys(record()).sort(), ['version', 'origin', 'rpId', 'credentialId', 'salt', 'kdfSalt', 'iv', 'ciphertext', 'displayName'].sort());
  assert.equal(record().displayName, 'Synthetic');
  assert.equal((await client.keyFromAssertion(record())).extractable, false);
  const unlocked = await client.unlock();
  assert.equal(unlocked.username, user.username); assert.equal(unlocked.password, user.password); assert.equal(unlocked.userId, user.userId);
  assert.equal(calls[0].options.publicKey.authenticatorSelection.authenticatorAttachment, 'platform');
  assert.equal(calls[0].options.publicKey.authenticatorSelection.userVerification, 'required');
  const getCalls = calls.filter(call => call.type === 'get');
  for (const call of getCalls) assert.equal(call.options.publicKey.userVerification, 'required');
  assert.notEqual(Buffer.from(getCalls[0].options.publicKey.challenge).toString('hex'), Buffer.from(getCalls[1].options.publicKey.challenge).toString('hex'));
  await client.forget(); assert.equal(await client.hasEnrollment(), false);
});

test('plaintext displayName keeps only the first name, never credentials', async () => {
  const { client, record } = harness();
  await client.enroll({ ...user, name: '  Maria   da Silva Souza  ' });
  assert.equal(record().displayName, 'Maria');
  const { client: other, record: otherRecord } = harness();
  await other.enroll({ ...user, name: undefined });
  assert.equal(otherRecord().displayName, '');
  assert.ok(!JSON.stringify(otherRecord()).includes(user.username) && !JSON.stringify(otherRecord()).includes(user.password));
  const info = await other.enrollmentInfo();
  assert.equal(info.enrolled, true); assert.equal(info.displayName, '');
});

test('unsupported PRF never creates a fallback vault', async () => {
  const { client, state, record } = harness(); state.prf = false;
  await assert.rejects(client.enroll(user), /não está disponível/);
  assert.equal(record(), null);
});

test('cancelled re-enrollment preserves the previous vault and cancelled unlock returns no credentials', async () => {
  const { client, state, record } = harness(); await client.enroll(user);
  const before = JSON.stringify(record()); state.cancelled = true;
  await assert.rejects(client.enroll(user), /Cancelled/);
  await assert.rejects(client.unlock(), /Cancelled/);
  assert.equal(JSON.stringify(record()), before);
});

for (const field of ['uv', 'correctChallenge', 'prf', 'attachment', 'secret']) {
  test('unlock rejects invalid verification: ' + field, async () => {
    const { client, state } = harness(); await client.enroll(user);
    state[field] = field === 'attachment' ? 'cross-platform' : (field === 'secret' ? 42 : false);
    await assert.rejects(client.unlock());
  });
}

test('tampered ciphertext and origin are rejected without overwriting the vault', async () => {
  const { client, record } = harness(); await client.enroll(user);
  const bytes = client.decode(record().ciphertext); bytes[0] ^= 1; record().ciphertext = client.encode(bytes);
  await assert.rejects(client.unlock(), /Não foi possível liberar/);
  record().origin = 'https://other.example';
  await assert.rejects(client.unlock(), /Ative a digital/);
});

test('missing local enrollment and absent platform support fail closed', async () => {
  const { client, ctx, calls } = harness();
  await assert.rejects(client.unlock(), /Ative a digital/);
  ctx.window.isSecureContext = false;
  await assert.rejects(client.enroll(user), /indisponível/);
  assert.equal(calls.length, 0);
});

test('nullable browser metadata and an omitted creation marker still require real PRF output', async () => {
  const { client, state } = harness(); state.attachment = null; state.createEnabled = undefined;
  await client.enroll(user);
  assert.equal((await client.unlock()).password, user.password);
  state.prf = false;
  await assert.rejects(client.unlock(), /proteção necessária/);
});

test('unconfirmed storage never reports successful enrollment', async () => {
  const { client } = harness(); client.storage = async () => null;
  await assert.rejects(client.enroll(user), /não confirmou o salvamento/);
});

test('storage read failures are not misreported as a missing enrollment', async () => {
  const { client } = harness(); client.storage = async () => { throw Error('Storage unavailable'); };
  await assert.rejects(client.hasEnrollment(), /Storage unavailable/);
});
