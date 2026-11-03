import { initializeApp } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';
import { fingerprint, migrationInventory, prepareMigration } from './migration.js';

const projectId = process.env.PORTAL_PROJECT_ID;
const emulator = !!process.env.FIREBASE_DATABASE_EMULATOR_HOST;
if (!projectId || (!emulator && projectId !== 'diversey-solicitacoes-pwa') || (emulator && !projectId.startsWith('demo-'))) throw Error('Defina explicitamente o projeto autorizado; emulador exige projeto demo-.');
initializeApp({ projectId, databaseURL: process.env.PORTAL_DATABASE_URL || `https://${projectId}-default-rtdb.firebaseio.com` });
const db = getDatabase();
const source = (await db.ref('data/diversey_users').get()).val();
const next = await prepareMigration(source);
console.log(JSON.stringify(migrationInventory(next), null, 2));
if (process.argv.includes('--apply')) {
  const approved = process.argv.find(arg => arg.startsWith('--source-fingerprint='))?.split('=')[1];
  if (approved !== next.sourceFingerprint) throw Error('O inventário revisado deve corresponder exatamente à origem.');
  if (!emulator && process.env.PORTAL_ALLOW_LIVE_MIGRATION !== 'true') throw Error('Migração ao vivo exige janela de implantação validada.');
  let transactionError;
  const result = await db.ref().transaction(current => {
    try {
    if (current === null) return null;
    if (current?.portalIdentity) throw Error('Identidades já existem; nenhuma sobrescrita permitida.');
    if (fingerprint(current?.data?.diversey_users) !== approved) throw Error('Origem mudou; repita o inventário.');
    // One atomic commit preserves a private backup and strips credentials/sessions.
    current.portalIdentityBackup = { migrationId: next.migrationId, source: current.data.diversey_users };
    current.portalIdentity = next;
    current.data.diversey_users = { data: Object.values(next.users).map(user => ({
      id: user.id, username: user.username, name: user.name || user.username,
      role: user.role, email: user.email || '', tecnicoId: user.tecnicoId || null,
      fornecedorId: user.fornecedorId || null, disabled: user.disabled === true
    })), updatedAt: Date.now() };
    delete current.data.diversey_sessions;
    return current;
    } catch (error) { transactionError = error; return undefined; }
  }, undefined, false);
  if (transactionError) throw transactionError;
  if (!result.snapshot.child('portalIdentity').exists()) throw Error('Migração não confirmada.');
  console.log(JSON.stringify({ migrated: result.committed, migrationId: next.migrationId }));
}
await db.goOffline();
