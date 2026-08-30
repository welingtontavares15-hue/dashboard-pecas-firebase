'use strict';

const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getDatabase } = require('firebase-admin/database');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { setGlobalOptions } = require('firebase-functions/v2');
const {
  ALLOWED_ROLES,
  attemptKey,
  authUidFor,
  buildClaims,
  createStrongPasswordRecord,
  findUser,
  locateUsers,
  sanitizeProfile,
  validateLoginInput,
  verifyPassword
} = require('./lib/auth-core');

initializeApp();
setGlobalOptions({ region: 'us-central1', maxInstances: 10 });

const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_LOCKOUT_MS = 15 * 60 * 1000;
const LEGACY_BRIDGE_TTL_MS = 8 * 60 * 60 * 1000;

function genericAuthError() {
  return new HttpsError('unauthenticated', 'Usuário ou senha inválidos.');
}

async function readAttemptState(username) {
  const ref = getDatabase().ref(`server_auth/login_attempts/${attemptKey(username)}`);
  const snapshot = await ref.get();
  return { ref, value: snapshot.val() || null };
}

async function assertNotLocked(username) {
  const { ref, value } = await readAttemptState(username);
  const now = Date.now();
  if (value?.lockedUntil && Number(value.lockedUntil) > now) {
    throw new HttpsError('resource-exhausted', 'Muitas tentativas. Aguarde antes de tentar novamente.');
  }
  if (value?.windowStartedAt && (now - Number(value.windowStartedAt)) > LOGIN_WINDOW_MS) {
    await ref.remove();
  }
}

async function recordFailedAttempt(username) {
  const key = attemptKey(username);
  const ref = getDatabase().ref(`server_auth/login_attempts/${key}`);
  const now = Date.now();
  await ref.transaction((current) => {
    const state = current && typeof current === 'object' ? current : {};
    const windowStartedAt = Number(state.windowStartedAt) || now;
    const expired = (now - windowStartedAt) > LOGIN_WINDOW_MS;
    const failures = expired ? 1 : (Number(state.failures) || 0) + 1;
    const next = {
      failures,
      windowStartedAt: expired ? now : windowStartedAt,
      updatedAt: now
    };
    if (failures >= LOGIN_MAX_ATTEMPTS) {
      next.lockedUntil = now + LOGIN_LOCKOUT_MS;
    }
    return next;
  });
}

async function clearAttempts(username) {
  await getDatabase().ref(`server_auth/login_attempts/${attemptKey(username)}`).remove();
}

async function ensureFirebaseIdentity(user, claims) {
  const auth = getAuth();
  const uid = authUidFor(user);
  try {
    await auth.getUser(uid);
  } catch (error) {
    if (error?.code !== 'auth/user-not-found') {
      throw error;
    }
    await auth.createUser({
      uid,
      displayName: String(user.name || user.username || '').slice(0, 128),
      disabled: user.disabled === true
    });
  }
  await auth.setCustomUserClaims(uid, claims);
  return { uid, token: await auth.createCustomToken(uid, claims) };
}

async function writeLegacyCompatibilitySession(uid, profile) {
  const now = Date.now();
  const payload = {
    username: profile.username,
    role: profile.role,
    expiresAt: now + LEGACY_BRIDGE_TTL_MS,
    issuedAt: now,
    issuedBy: 'server-auth-v68',
    authVersion: 2
  };
  if (profile.tecnicoId) {
    payload.tecnicoId = profile.tecnicoId;
  }
  if (profile.fornecedorId) {
    payload.fornecedorId = profile.fornecedorId;
  }
  await getDatabase().ref(`data/diversey_sessions/${uid}`).set(payload);
}

exports.loginWithLegacyCredentials = onCall({ enforceAppCheck: false }, async (request) => {
  const username = String(request.data?.username || '').trim();
  const password = String(request.data?.password || '');
  if (!validateLoginInput(username, password)) {
    throw genericAuthError();
  }

  await assertNotLocked(username);

  const usersRef = getDatabase().ref('data/diversey_users');
  const usersSnapshot = await usersRef.get();
  const located = findUser(usersSnapshot.val(), username);
  const user = located?.user || null;
  const profile = sanitizeProfile(user);

  if (!user || !profile || profile.disabled || !ALLOWED_ROLES.has(profile.role)) {
    await recordFailedAttempt(username);
    throw genericAuthError();
  }

  const verification = verifyPassword(user, password);
  if (!verification.valid) {
    await recordFailedAttempt(username);
    throw genericAuthError();
  }

  const claims = buildClaims(user);
  if (!claims) {
    await recordFailedAttempt(username);
    throw genericAuthError();
  }

  const identity = await ensureFirebaseIdentity(user, claims);
  await writeLegacyCompatibilitySession(identity.uid, profile);

  if (verification.scheme !== 'pbkdf2-sha256' && located?.path) {
    const stronger = createStrongPasswordRecord(password);
    await getDatabase().ref(`data/diversey_users/${located.path}`).update({
      ...stronger,
      passwordMigratedAt: Date.now()
    });
  }

  await clearAttempts(username);

  return {
    customToken: identity.token,
    profile,
    authVersion: 2
  };
});

exports.getCurrentProfile = onCall({ enforceAppCheck: false }, async (request) => {
  if (!request.auth?.token?.appUserId || !request.auth?.token?.role) {
    throw new HttpsError('unauthenticated', 'Sessão corporativa inválida.');
  }
  const usersSnapshot = await getDatabase().ref('data/diversey_users').get();
  const entries = locateUsers(usersSnapshot.val());
  const entry = entries.find(({ user }) => String(user?.id || '') === String(request.auth.token.appUserId));
  const profile = sanitizeProfile(entry?.user);
  if (!profile || profile.disabled) {
    throw new HttpsError('permission-denied', 'Usuário inativo ou não encontrado.');
  }
  return { profile };
});
