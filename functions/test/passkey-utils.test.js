import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { activeUser, checkLegacyPassword, credentialKey, firebaseUid, unpackUsers, userByName, publicProfile, shippingDateOf } from '../passkey-utils.js';

const password = 'Exemplo-Senha-123';
const user = { id: 'id-1', username: 'tecnico', name: 'Técnico Teste', role: 'tecnico', passwordHash: createHash('sha256').update(password + 'diversey_salt_v1:tecnico').digest('hex'), tecnicoId: 'tecnico-1' };
test('verifica apenas a senha correta com hash do portal', () => {
  assert.equal(checkLegacyPassword(user, password), true);
  assert.equal(checkLegacyPassword(user, 'incorreta'), false);
  assert.equal(checkLegacyPassword({ ...user, disabled: true }, password), false);
  assert.equal(checkLegacyPassword({ ...user, passwordHash: 'senha' }, password), false);
});
test('aceita hash legado sem salt por usuario', () => {
  const old = createHash('sha256').update(password + 'diversey_salt_v1').digest('hex');
  assert.equal(checkLegacyPassword({ ...user, passwordHash: old }, password), true);
});
test('identidade duplicada ou desativada nao pode ser associada a uma passkey', () => {
  assert.equal(userByName([user], 'TÉCNICO'), user);
  assert.equal(userByName([user, { ...user, id: 'id-2' }], 'tecnico'), null);
  assert.equal(activeUser({ ...user, role: 'superadmin' }), false);
});
test('suporta wrapper RTDB e omite hash no perfil publico', () => {
  assert.equal(unpackUsers({ data: [user] }).length, 1);
  const profile = publicProfile(user);
  assert.equal(profile.passwordHash, undefined);
  assert.equal(profile.tecnicoId, 'tecnico-1');
  assert.equal(firebaseUid('id-1').startsWith('portal-'), true);
  assert.equal(credentialKey('passkey').length, 64);
});

test('data do envio: aceita AAAA-MM-DD real, é opcional e rejeita inválida ou futura', () => {
  const now = Date.UTC(2026, 10, 11, 15, 0, 0);
  assert.equal(shippingDateOf('2026-11-10', now), '2026-11-10');
  assert.equal(shippingDateOf('2026-11-11', now), '2026-11-11');
  // fuso à frente do UTC: o "hoje" do fornecedor pode ser o dia seguinte do servidor
  assert.equal(shippingDateOf('2026-11-12', now), '2026-11-12');
  for (const empty of [undefined, null, '']) assert.equal(shippingDateOf(empty, now), '');
  for (const bad of ['2026-02-31', '11/11/2026', '2026-1-5', 20261111, {}, '2026-11-11T10:00']) {
    assert.throws(() => shippingDateOf(bad, now), (error) => error.status === 400 && /inválida/.test(error.message));
  }
  assert.throws(() => shippingDateOf('2026-11-13', now), (error) => error.status === 400 && /futura/.test(error.message));
});
