import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { protectPassword, verifyPassword } from '../identity-store.js';
import { prepareMigration, migrationInventory } from '../migration.js';
const passwordHash = createHash('sha256').update('Valid-123diversey_salt_v1:admin').digest('hex');
const user = { id: 'admin', username: 'admin', role: 'administrador', passwordHash };

test('scrypt aleatorio, valida senha exata e nao aceita hash como senha', async () => {
  const first = await protectPassword('Valid-123');
  const second = await protectPassword('Valid-123');
  assert.notEqual(first.salt, second.salt);
  assert.equal(await verifyPassword({ ...user, passwordRecord: first }, 'Valid-123'), true);
  assert.equal(await verifyPassword({ ...user, passwordRecord: first }, passwordHash), false);
  assert.equal(await verifyPassword({ ...user, disabled: true, passwordRecord: first }, 'Valid-123'), false);
});
test('migra ambos formatos legados preservando IDs e senhas, sem expor credenciais no inventario', async () => {
  for (const source of [[user], { data: [user] }]) {
    const state = await prepareMigration(source);
    const record = Object.values(state.users)[0];
    assert.equal(record.id, 'admin');
    assert.equal(await verifyPassword(record, 'Valid-123'), true);
    assert.equal(JSON.stringify(migrationInventory(state)).includes(passwordHash), false);
  }
});
test('migra plaintext apenas para scrypt privado; rejeita duplicatas e vinculos ausentes', async () => {
  const state = await prepareMigration([{ ...user, password: 'Plain-123' }]);
  const record = Object.values(state.users)[0];
  assert.equal(record.password, undefined); assert.equal(record.passwordHash, undefined);
  assert.equal(await verifyPassword(record, 'Plain-123'), true);
  await assert.rejects(prepareMigration([user, user]), /duplicados/);
  await assert.rejects(prepareMigration([user, { ...user, id: 'other', username: 'ÁDMIN' }]), /duplicado/);
  await assert.rejects(prepareMigration([user, { ...user, id: 'tec', username: 'tec', role: 'tecnico' }]), /Vínculo/);
});
