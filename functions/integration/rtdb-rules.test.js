import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';

test('Realtime Database denies forged sessions and authorizes only signed grants', async () => {
  assert.ok(process.env.FIREBASE_DATABASE_EMULATOR_HOST, 'Firebase Database emulator required');
  const env = await initializeTestEnvironment({
    projectId: 'demo-wwm-rules',
    database: { rules: fs.readFileSync('firebase/database.rules.passkeys.json', 'utf8') }
  });
  const grants = [
    { uid: 'manager-1', userId: 'u-1', role: 'gestor', tecnicoId: '', fornecedorId: '' },
    { uid: 'admin-1', userId: 'u-2', role: 'administrador', tecnicoId: '', fornecedorId: '' },
    { uid: 'tech-1', userId: 'u-3', role: 'tecnico', tecnicoId: 'tec-3', fornecedorId: '' },
    { uid: 'numeric-tech', userId: 'u-5', role: 'tecnico', tecnicoId: 7, fornecedorId: '' },
    { uid: 'expired-1', userId: 'u-4', role: 'gestor', tecnicoId: '', fornecedorId: '' }
  ];
  try {
    await env.withSecurityRulesDisabled(async (admin) => {
      const db = admin.database();
      for (const grant of grants) {
        await db.ref('portalIdentity/status').set('ready');
        await db.ref('portalIdentity/users/' + grant.uid).set({ version: 'v1', disabled: false });
        await db.ref('authz/sessions/' + grant.uid).set({
          ...grant, version: 'v1', allowed: true, expiresAt: Date.now() + (grant.uid === 'expired-1' ? -1000 : 3600000)
        });
      }
      await db.ref('data/diversey_settings').set({ theme: 'light' });
      await db.ref('data/diversey_users').set({ data: [{ id: 'u-1', username: 'manager', passwordHash: 'private' }] });
    });
    const context = (uid, userId, role, opts = {}) => env.authenticatedContext(uid, {
      portal_user_id: userId, portal_role: role, portal_username: uid,
      portal_tecnico_id: opts.tecnicoId ?? '', portal_fornecedor_id: '',
      portal_auth_method: 'passkey', portal_version: 'v1', portal_session_id: uid
    }).database();
    const manager = context('manager-1', 'u-1', 'gestor');
    const admin = context('admin-1', 'u-2', 'administrador');
    const technician = context('tech-1', 'u-3', 'tecnico', { tecnicoId: 'tec-3' });
    await assertSucceeds(manager.ref('data/diversey_settings').once('value'));
    await assertFails(manager.ref('data/diversey_settings').set({ theme: 'altered' }));
    await assertFails(admin.ref('data/diversey_users').once('value'));
    await assertFails(admin.ref('portalIdentity').once('value'));
    await assertFails(admin.ref('portalIdentity/users/admin-1/role').set('gestor'));
    await assertFails(manager.ref('data/diversey_users').once('value'));
    await assertFails(technician.ref('data/diversey_users').once('value'));
    await assertFails(env.unauthenticatedContext().database().ref('data/diversey_settings').once('value'));
    await assertFails(env.authenticatedContext('anonymous-1').database().ref('data/diversey_settings').once('value'));
    // Attacker cannot promote a manager by changing claims without a matching server grant.
    await assertFails(context('manager-1', 'u-1', 'administrador').ref('data/diversey_users').once('value'));
    await assertFails(context('manager-1', 'u-other', 'gestor').ref('data/diversey_settings').once('value'));
    await assertFails(context('expired-1', 'u-4', 'gestor').ref('data/diversey_settings').once('value'));
    await assertFails(manager.ref('data/diversey_sessions/manager-1').set({
      username: 'manager', role: 'administrador', expiresAt: Date.now() + 86400000
    }));
    await assertFails(manager.ref('passkeys/credentials/fake').set({ id: 'fake' }));
    await assertFails(manager.ref('authz/users/manager-1/role').set('administrador'));
    const request = { id: 's1', tecnicoId: 'tec-other', status: 'pendente', createdAt: 1, updatedAt: 1, itens: { a: 1 }, total: 10 };
    await env.withSecurityRulesDisabled(async ctx => ctx.database().ref('data/diversey_solicitacoes/s1').set(request));
    await assertFails(technician.ref('data/diversey_solicitacoes/s1').set({ ...request, tecnicoId: 'tec-3' }));
    await assertSucceeds(technician.ref('data/diversey_solicitacoes/s2').set({ ...request, id: 's2', tecnicoId: 'tec-3' }));
    await assertFails(technician.ref('data/diversey_solicitacoes').once('value'));
    await assertSucceeds(technician.ref('data/diversey_solicitacoes').orderByChild('tecnicoId').equalTo('tec-3').once('value'));
    const numericTech = context('numeric-tech', 'u-5', 'tecnico', { tecnicoId: 7 });
    await assertSucceeds(numericTech.ref('data/diversey_solicitacoes/s7').set({ ...request, id: 's7', tecnicoId: 7 }));
    await assertSucceeds(numericTech.ref('data/diversey_solicitacoes').orderByChild('tecnicoId').equalTo(7).once('value'));
    await assertFails(numericTech.ref('data/diversey_solicitacoes').orderByChild('tecnicoId').equalTo('7').once('value'));
    await env.withSecurityRulesDisabled(async ctx => ctx.database().ref('portalIdentity/users/manager-1/version').set('v2'));
    await assertFails(manager.ref('data/diversey_settings').once('value'));
  } finally {
    await env.cleanup();
  }
});
