import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { activeUser, checkLegacyPassword, credentialKey, firebaseUid, unpackUsers, userByName, publicProfile } from '../passkey-utils.js';

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
