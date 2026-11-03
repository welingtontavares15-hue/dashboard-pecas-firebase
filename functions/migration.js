import { createHash, randomUUID } from 'node:crypto';
import { firebaseUid, unpackUsers } from './passkey-utils.js';
import { protectPassword, safeProfile, validateRegistry } from './identity-store.js';

export const fingerprint = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
export async function prepareMigration(source) {
  const records = unpackUsers(source);
  if (!records.length) throw Error('Nenhum usuário encontrado no formato esperado.');
  const users = {};
  for (const item of records) {
    const user = { ...item, role: item.role === 'admin' ? 'administrador' : item.role, version: randomUUID() };
    if (item.id == null || Object.hasOwn(users, firebaseUid(item.id))) throw Error('IDs duplicados ou ausentes.');
    if (item.passwordRecord) throw Error('Registro já migrado em origem legada.');
    if (typeof item.password === 'string' && item.password) {
      user.passwordRecord = await protectPassword(item.password, 1); delete user.passwordHash;
    } else if (!/^[a-f0-9]{64}$/i.test(String(item.passwordHash || ''))) {
      throw Error('Credencial ausente ou formato não suportado: ' + item.id);
    }
    delete user.password;
    users[firebaseUid(item.id)] = user;
  }
  validateRegistry(users);
  return { status: 'ready', schema: 1, migrationId: randomUUID(), sourceFingerprint: fingerprint(source), migratedAt: Date.now(), users };
}
export const migrationInventory = state => ({
  count: Object.keys(state.users).length, sourceFingerprint: state.sourceFingerprint,
  accounts: Object.values(state.users).map(safeProfile)
});
