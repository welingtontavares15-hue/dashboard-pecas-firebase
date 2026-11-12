import { createHash, timingSafeEqual } from 'node:crypto';

export const PORTAL_ROLES = new Set(['administrador', 'gestor', 'tecnico', 'fornecedor']);
export const normalizeUsername = (value) => String(value || '')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .trim().toLowerCase();

export function unpackUsers(value) {
  const users = value?.data ?? value;
  return Array.isArray(users) ? users.filter((user) => user && typeof user === 'object') : [];
}

export function userByName(users, input) {
  const normalized = normalizeUsername(input) === 'adm' ? 'admin' : normalizeUsername(input);
  if (!normalized) return null;
  const matching = users.filter((user) => normalizeUsername(user.username) === normalized);
  // Never guess account identity when duplicate usernames exist.
  return matching.length === 1 ? matching[0] : null;
}

export function userById(users, id) {
  if (id == null || String(id).trim() === '') return null;
  const matches = users.filter((user) => user && user.id != null && String(user.id) === String(id));
  return matches.length === 1 ? matches[0] : null;
}

export function activeUser(user) {
  return !!(user && user.disabled !== true && user.id != null
    && typeof user.username === 'string' && PORTAL_ROLES.has(user.role));
}

export function checkLegacyPassword(user, password, salt = 'diversey_salt_v1') {
  if (!activeUser(user) || typeof password !== 'string' || !password || password.length > 512
    || !/^[a-f0-9]{64}$/i.test(String(user.passwordHash || ''))) return false;
  const expected = Buffer.from(String(user.passwordHash).toLowerCase(), 'hex');
  const salted = createHash('sha256').update(password + salt + ':' + user.username).digest();
  const legacy = createHash('sha256').update(password + salt).digest();
  return timingSafeEqual(expected, salted) || timingSafeEqual(expected, legacy);
}

export function userKey(userId) {
  return createHash('sha256').update(String(userId)).digest('hex');
}

export function credentialKey(credentialId) {
  return createHash('sha256').update(String(credentialId)).digest('hex');
}

export function firebaseUid(userId) {
  return 'portal-' + userKey(userId).slice(0, 48);
}

export function publicProfile(user) {
  return {
    id: user.id, username: user.username, name: user.name || user.username,
    email: user.email || '', role: user.role,
    tecnicoId: user.tecnicoId || null, fornecedorId: user.fornecedorId || null
  };
}

/**
 * Data do envio informada pelo fornecedor (AAAA-MM-DD). Opcional: clientes
 * antigos ainda enviam só o rastreio. Retorna '' quando ausente e lança
 * `Error` com `status` 400 quando inválida ou futura. A folga de um dia cobre
 * fusos à frente do UTC, onde "hoje" já é o dia seguinte para o servidor.
 */
export function shippingDateOf(value, now = Date.now()) {
  if (value === undefined || value === null || value === '') return '';
  const fail = (message) => { const error = new Error(message); error.status = 400; throw error; };
  const match = typeof value === 'string' ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(value) : null;
  if (!match) fail('Data do envio inválida.');
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) fail('Data do envio inválida.');
  if (date.getTime() > now + 86400000) fail('A data do envio não pode ser futura.');
  return value;
}
