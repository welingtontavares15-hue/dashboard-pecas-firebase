'use strict';

const crypto = require('node:crypto');

const ALLOWED_ROLES = new Set(['administrador', 'gestor', 'tecnico', 'fornecedor']);
const LEGACY_SALT = 'diversey_salt_v1';
const PBKDF2_ITERATIONS = 210000;
const PBKDF2_KEY_LENGTH = 32;
const PBKDF2_DIGEST = 'sha256';

function normalizeUsername(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function resolveLoginUsername(value) {
  const normalized = normalizeUsername(value);
  return normalized === 'adm' ? 'admin' : normalized;
}

function sha256Hex(value) {
  return crypto.createHash('sha256').update(String(value || ''), 'utf8').digest('hex');
}

function legacyPasswordHash(password, username) {
  return sha256Hex(`${String(password || '')}${LEGACY_SALT}:${String(username || '')}`);
}

function legacySharedSaltHash(password) {
  return sha256Hex(`${String(password || '')}${LEGACY_SALT}`);
}

function pbkdf2Hash(password, salt, iterations = PBKDF2_ITERATIONS) {
  return crypto.pbkdf2Sync(
    String(password || ''),
    Buffer.from(String(salt || ''), 'base64'),
    Number(iterations) || PBKDF2_ITERATIONS,
    PBKDF2_KEY_LENGTH,
    PBKDF2_DIGEST
  ).toString('base64');
}

function createStrongPasswordRecord(password) {
  const salt = crypto.randomBytes(24).toString('base64');
  return {
    passwordHashV2: pbkdf2Hash(password, salt, PBKDF2_ITERATIONS),
    passwordSaltV2: salt,
    passwordIterations: PBKDF2_ITERATIONS,
    passwordAlgorithm: 'pbkdf2-sha256'
  };
}

function timingSafeEqualText(left, right) {
  const a = Buffer.from(String(left || ''), 'utf8');
  const b = Buffer.from(String(right || ''), 'utf8');
  if (a.length !== b.length || a.length === 0) return false;
  return crypto.timingSafeEqual(a, b);
}

function verifyPassword(user, password) {
  if (!user || !password) return { valid: false, scheme: null };

  if (user.passwordHashV2 && user.passwordSaltV2) {
    const candidate = pbkdf2Hash(password, user.passwordSaltV2, user.passwordIterations);
    return {
      valid: timingSafeEqualText(candidate, user.passwordHashV2),
      scheme: 'pbkdf2-sha256'
    };
  }

  if (user.passwordHash) {
    const perUser = legacyPasswordHash(password, user.username || user.id || '');
    if (timingSafeEqualText(perUser, user.passwordHash)) {
      return { valid: true, scheme: 'legacy-per-user-sha256' };
    }
    const shared = legacySharedSaltHash(password);
    return {
      valid: timingSafeEqualText(shared, user.passwordHash),
      scheme: 'legacy-shared-sha256'
    };
  }

  if (typeof user.password === 'string' && user.password.length > 0) {
    return {
      valid: timingSafeEqualText(user.password, password),
      scheme: 'legacy-plaintext'
    };
  }

  return { valid: false, scheme: null };
}

function sanitizeProfile(user) {
  if (!user || !ALLOWED_ROLES.has(String(user.role || '').toLowerCase())) return null;
  return {
    id: String(user.id || ''),
    username: String(user.username || ''),
    name: String(user.name || user.username || ''),
    role: String(user.role || '').toLowerCase(),
    email: String(user.email || ''),
    tecnicoId: user.tecnicoId ? String(user.tecnicoId) : null,
    fornecedorId: user.fornecedorId ? String(user.fornecedorId) : null,
    disabled: user.disabled === true
  };
}

function buildClaims(user) {
  const profile = sanitizeProfile(user);
  if (!profile || profile.disabled) return null;
  const claims = {
    role: profile.role,
    appUserId: profile.id,
    username: profile.username
  };
  if (profile.tecnicoId) claims.tecnicoId = profile.tecnicoId;
  if (profile.fornecedorId) claims.fornecedorId = profile.fornecedorId;
  return claims;
}

function authUidFor(user) {
  const stableKey = String(user?.id || user?.username || '').trim();
  return `wwm_${sha256Hex(stableKey).slice(0, 48)}`;
}

function locateUsers(rawValue) {
  if (Array.isArray(rawValue)) {
    return rawValue.map((user, index) => ({ user, path: String(index) }));
  }
  if (rawValue && Array.isArray(rawValue.data)) {
    return rawValue.data.map((user, index) => ({ user, path: `data/${index}` }));
  }
  if (rawValue && typeof rawValue === 'object') {
    return Object.entries(rawValue)
      .filter(([, user]) => user && typeof user === 'object' && !Array.isArray(user))
      .map(([key, user]) => ({ user, path: key }));
  }
  return [];
}

function findUser(rawValue, username) {
  const wanted = resolveLoginUsername(username);
  return locateUsers(rawValue).find(({ user }) => resolveLoginUsername(user?.username) === wanted) || null;
}

function validateLoginInput(username, password) {
  const normalized = resolveLoginUsername(username);
  return normalized.length >= 2 && normalized.length <= 120
    && typeof password === 'string'
    && password.length >= 4
    && password.length <= 256;
}

function attemptKey(username) {
  return sha256Hex(resolveLoginUsername(username));
}

module.exports = {
  ALLOWED_ROLES,
  LEGACY_SALT,
  PBKDF2_ITERATIONS,
  normalizeUsername,
  resolveLoginUsername,
  sha256Hex,
  legacyPasswordHash,
  legacySharedSaltHash,
  pbkdf2Hash,
  createStrongPasswordRecord,
  timingSafeEqualText,
  verifyPassword,
  sanitizeProfile,
  buildClaims,
  authUidFor,
  locateUsers,
  findUser,
  validateLoginInput,
  attemptKey
};
