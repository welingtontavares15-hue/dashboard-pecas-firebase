import { randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { activeUser, checkLegacyPassword, firebaseUid, normalizeUsername, publicProfile } from './passkey-utils.js';

const scrypt = promisify(scryptCallback);
export const IDENTITY_PATH = 'portalIdentity';
export function reject(message, status = 400) {
  const error = new Error(message); error.status = status; throw error;
}
export async function protectPassword(password, minLength = 4) {
  if (typeof password !== 'string' || password.length < minLength || password.length > 512) reject('A senha deve ter de 4 a 512 caracteres.');
  const salt = randomBytes(32).toString('hex');
  const digest = await scrypt(password, salt, 64);
  return { scheme: 'scrypt-v1', salt, digest: digest.toString('hex') };
}
export async function verifyPassword(user, password) {
  if (!activeUser(user) || typeof password !== 'string' || !password || password.length > 512) return false;
  if (!user.passwordRecord) return checkLegacyPassword(user, password);
  const record = user.passwordRecord;
  if (record.scheme !== 'scrypt-v1' || !/^[a-f0-9]{64}$/.test(record.salt) || !/^[a-f0-9]{128}$/.test(record.digest)) return false;
  const actual = await scrypt(password, record.salt, 64);
  return timingSafeEqual(actual, Buffer.from(record.digest, 'hex'));
}
export const safeProfile = (user) => ({ ...publicProfile(user), disabled: user.disabled === true, updatedAt: user.updatedAt || 0 });

export function validateRegistry(users) {
  const names = new Set(); const ids = new Set(); const emails = new Set();
  for (const [uid, user] of Object.entries(users || {})) {
    const name = normalizeUsername(user?.username);
    if (!user || !name || name === 'adm' || uid !== firebaseUid(user.id) || !activeUser({ ...user, disabled: false })) reject('Identidade inválida ou ambígua.', 409);
    if (ids.has(String(user.id)) || names.has(name)) reject('Usuário ou ID duplicado.', 409);
    const email = String(user.email || '').trim().toLowerCase();
    if (email && emails.has(email)) reject('E-mail já cadastrado.', 409);
    if ((user.role === 'tecnico' && !user.tecnicoId) || (user.role === 'fornecedor' && !user.fornecedorId)) reject('Vínculo operacional obrigatório.', 409);
    ids.add(String(user.id)); names.add(name); if (email) emails.add(email);
  }
  if (!Object.values(users || {}).some(u => u.role === 'administrador' && !u.disabled)) reject('É necessário manter um administrador ativo.', 409);
}

// Every mutation changes version. RTDB rules compare this value on EVERY
// operation, so even an already-issued ID token loses access immediately.
export function identityStore(db) {
  const root = db.ref(IDENTITY_PATH);
  async function state() {
    const value = (await root.get()).val();
    if (value?.status !== 'ready') reject('Migração de identidades ainda não concluída.', 503);
    return value;
  }
  async function mutate(actor, operation, linked = false) {
    const ref = linked ? db.ref() : root;
    let transactionError;
    const result = await ref.transaction(value => {
      try {
      if (value === null) return null; // Fetch uncached server state before validating.
      const current = linked ? value?.portalIdentity : value;
      if (current?.status !== 'ready') reject('Identidades indisponíveis.', 503);
      const currentActor = current.users?.[firebaseUid(actor.id)];
      if (!currentActor || currentActor.version !== actor.version || !activeUser(currentActor)) reject('Sessão revogada.', 403);
      const whole = linked ? structuredClone(value) : null;
      const next = operation(structuredClone(current), whole);
      validateRegistry(next.users);
      if (linked) { whole.portalIdentity = next; return whole; }
      return next;
      } catch (error) { transactionError = error; return undefined; }
    }, undefined, false);
    if (transactionError) throw transactionError;
    if (!result.committed || !result.snapshot.exists()) reject('Não foi possível atualizar a identidade.', 409);
    return linked ? result.snapshot.val().portalIdentity : result.snapshot.val();
  }
  async function save(actor, input, linked) {
    if (actor.role !== 'administrador') reject('Apenas administradores podem gerenciar usuários.', 403);
    if (!input || typeof input.username !== 'string' || input.username.length > 120) reject('Usuário inválido.');
    if (Object.hasOwn(input, 'passwordHash') || Object.hasOwn(input, 'passwordRecord')) reject('Envie a senha, nunca um hash de cliente.');
    const passwordRecord = input.password ? await protectPassword(input.password) : null;
    const id = input.id == null ? randomUUID() : String(input.id);
    const uid = firebaseUid(id);
    const version = randomUUID();
    const next = await mutate(actor, (current, whole) => {
      const old = current.users?.[uid];
      if (!old && !passwordRecord) reject('Senha obrigatória para novo usuário.');
      if (old && old.username !== input.username.trim() && !passwordRecord) reject('Informe uma nova senha ao alterar o usuário.');
      const user = {
        ...old, id, username: input.username.trim(), name: String(input.name || input.username).slice(0, 120),
        email: String(input.email || '').trim().toLowerCase().slice(0, 160), role: input.role || old?.role || 'gestor',
        tecnicoId: input.tecnicoId ?? old?.tecnicoId ?? null, fornecedorId: input.fornecedorId ?? old?.fornecedorId ?? null,
        disabled: input.disabled ?? old?.disabled ?? false, version, updatedAt: Date.now()
      };
      const securityFields = ['username', 'role', 'tecnicoId', 'fornecedorId', 'disabled'];
      if (old && !passwordRecord && securityFields.every(field => (user[field] ?? null) === (old[field] ?? null))) user.version = old.version;
      if (passwordRecord) { user.passwordRecord = passwordRecord; delete user.passwordHash; delete user.password; }
      current.users ||= {}; current.users[uid] = user;
      if (linked) {
        const type = linked.type;
        if (!['technician', 'supplier'].includes(type) || !linked.record?.id || !linked.record.nome) reject('Cadastro associado inválido.');
        const role = type === 'technician' ? 'tecnico' : 'fornecedor';
        const field = type === 'technician' ? 'tecnicoId' : 'fornecedorId';
        if (user.role !== role || String(user[field]) !== String(linked.record.id)) reject('Vínculo de identidade inconsistente.');
        const key = type === 'technician' ? 'diversey_tecnicos' : 'diversey_fornecedores';
        whole.data ||= {};
        const payload = whole.data[key];
        const records = Array.isArray(payload) ? payload : payload?.data;
        if (!Array.isArray(records)) reject('Formato do cadastro associado não homologado.', 409);
        const items = records.filter(item => item && String(item.id) !== String(linked.record.id));
        items.push(linked.record);
        whole.data[key] = Array.isArray(payload) ? items : { ...payload, data: items, updatedAt: Date.now() };
      }
      return current;
    }, !!linked);
    return safeProfile(next.users[uid]);
  }
  async function remove(actor, id, linked) {
    if (actor.role !== 'administrador') reject('Apenas administradores podem gerenciar usuários.', 403);
    await mutate(actor, (current, whole) => {
      if (linked) {
        if (!['technician', 'supplier'].includes(linked.type) || !linked.id) reject('Cadastro associado inválido.');
        const key = linked.type === 'technician' ? 'diversey_tecnicos' : 'diversey_fornecedores';
        const field = linked.type === 'technician' ? 'tecnicoId' : 'fornecedorId';
        const payload = whole.data?.[key];
        const records = Array.isArray(payload) ? payload : payload?.data;
        if (!Array.isArray(records)) reject('Formato do cadastro associado não homologado.', 409);
        const items = records.filter(item => item && String(item.id) !== String(linked.id));
        whole.data[key] = Array.isArray(payload) ? items : { ...payload, data: items, updatedAt: Date.now() };
        for (const [uid, user] of Object.entries(current.users)) if (String(user[field] || '') === String(linked.id)) delete current.users[uid];
      } else { delete current.users[firebaseUid(id)]; }
      return current;
    }, !!linked);
  }
  async function changePassword(actor, oldPassword, newPassword, targetId = actor.id) {
    const same = String(actor.id) === String(targetId);
    if (!same && actor.role !== 'administrador') reject('Sem permissão para redefinir senhas.', 403);
    if (same && !(await verifyPassword(actor, oldPassword))) reject('Senha atual incorreta.', 401);
    const passwordRecord = await protectPassword(newPassword);
    await mutate(actor, current => {
      const target = current.users[firebaseUid(targetId)];
      if (!target) reject('Usuário não encontrado.', 404);
      target.passwordRecord = passwordRecord; target.version = randomUUID(); target.updatedAt = Date.now();
      delete target.passwordHash; delete target.password;
      return current;
    });
  }
  async function upgrade(user, password) {
    if (user.passwordRecord) return user;
    const passwordRecord = await protectPassword(password, 1);
    const next = await mutate(user, current => {
      const target = current.users[firebaseUid(user.id)];
      target.passwordRecord = passwordRecord; delete target.passwordHash; delete target.password;
      return current;
    });
    return next.users[firebaseUid(user.id)];
  }
  return { state, save, remove, changePassword, upgrade };
}
