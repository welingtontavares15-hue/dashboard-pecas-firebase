import { randomUUID } from 'node:crypto';
import { onRequest } from 'firebase-functions/v2/https';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';
import { getAuth } from 'firebase-admin/auth';
import { generateRegistrationOptions, verifyRegistrationResponse, generateAuthenticationOptions, verifyAuthenticationResponse } from '@simplewebauthn/server';
import { activeUser, checkLegacyPassword, credentialKey, firebaseUid, publicProfile, unpackUsers, userById, userByName, userKey } from './passkey-utils.js';

if (!getApps().length) initializeApp();
const rpID = process.env.PASSKEY_RP_ID || 'welingtontavares15-hue.github.io';
const rpName = 'Portal de Peças WWM';
const expectedOrigin = process.env.PASSKEY_ORIGIN || 'https://welingtontavares15-hue.github.io';
const allowedOrigin = new URL(expectedOrigin).origin;
const db = () => getDatabase();
const usersRef = () => db().ref('data/diversey_users');
const challengesRef = () => db().ref('passkeys/challenges');
const credentialsRef = () => db().ref('passkeys/credentials');
const userIndexRef = () => db().ref('passkeys/userIndex');
const limitsRef = () => db().ref('passkeys/limits');
const expirationMs = 5 * 60 * 1000;
const encode = (value) => Buffer.from(value).toString('base64url');

function invalid(message, status = 400) { const error = new Error(message); error.status = status; throw error; }
async function getUser(username) {
  const users = unpackUsers((await usersRef().get()).val());
  return userByName(users, username);
}
async function getUserId(id) {
  return userById(unpackUsers((await usersRef().get()).val()), id);
}
async function throttle(key, max = 10) {
  const bucket = Math.floor(Date.now() / 60000);
  const ref = limitsRef().child(credentialKey(key + ':' + bucket));
  const result = await ref.transaction((old) => (Number(old || 0) >= max ? undefined : Number(old || 0) + 1));
  if (!result.committed) invalid('Muitas tentativas. Tente novamente mais tarde.', 429);
}
async function storeChallenge(payload) {
  const id = randomUUID();
  await challengesRef().child(id).set({ ...payload, expiresAt: Date.now() + expirationMs });
  return id;
}
async function consumeChallenge(id, type) {
  if (typeof id !== 'string' || !/^[0-9a-f-]{36}$/i.test(id)) invalid('Desafio inválido');
  const ref = challengesRef().child(id);
  let saved;
  const result = await ref.transaction((current) => {
    if (!current || current.type !== type || current.expiresAt <= Date.now()) return;
    saved = current;
    return null;
  });
  if (!result.committed || !saved) invalid('Desafio expirado ou já utilizado', 401);
  return saved;
}
async function credentialsFor(userId) {
  const keys = (await userIndexRef().child(userKey(userId)).get()).val() || {};
  const credentials = await Promise.all(Object.keys(keys).map((key) => credentialsRef().child(key).get()));
  return credentials.map((snap) => snap.val()).filter((item) => item && item.userId === String(userId));
}
function credentialForWebauthn(c) {
  return { id: c.id, publicKey: Buffer.from(c.publicKey, 'base64url'), counter: Number(c.counter || 0), transports: c.transports || [] };
}
async function createToken(user) {
  // Only backend-verified identities receive short-lived, server-owned grants.
  const uid = firebaseUid(user.id);
  await db().ref('authz/users/' + uid).set({
    allowed: true, userId: String(user.id), role: user.role,
    tecnicoId: String(user.tecnicoId || ''), fornecedorId: String(user.fornecedorId || ''),
    expiresAt: Date.now() + (60 * 60 * 1000), updatedAt: Date.now()
  });
  return getAuth().createCustomToken(uid, {
    portal_user_id: String(user.id),
    portal_role: user.role,
    portal_username: String(user.username),
    portal_name: String(user.name || user.username).slice(0, 120),
    portal_email: String(user.email || '').slice(0, 160),
    portal_tecnico_id: String(user.tecnicoId || ''),
    portal_fornecedor_id: String(user.fornecedorId || ''),
    portal_auth_method: 'passkey'
  });
}
async function authenticatedAccount(req) {
  const header = String(req.get('authorization') || '');
  const match = /^Bearer ([A-Za-z0-9._~-]+)$/.exec(header);
  if (!match) invalid('Sessão autenticada obrigatória', 401);
  let decoded;
  try { decoded = await getAuth().verifyIdToken(match[1], true); }
  catch { invalid('Sessão expirada ou inválida', 401); }
  const user = await getUserId(decoded.portal_user_id);
  const grant = (await db().ref('authz/users/' + decoded.uid).get()).val();
  if (!activeUser(user) || decoded.uid !== firebaseUid(user.id)
    || decoded.portal_role !== user.role || decoded.portal_username !== user.username
    || !['passkey', 'password'].includes(decoded.portal_auth_method)
    || grant?.allowed !== true || grant.role !== user.role || grant.userId !== String(user.id)
    || Number(grant.expiresAt) <= Date.now()) invalid('Sessão sem autorização', 403);
  return user;
}
async function logoutSession(_body, req) {
  const user = await authenticatedAccount(req);
  const token = String(req.get('authorization') || '').slice(7);
  const decoded = await getAuth().verifyIdToken(token, true);
  await db().ref('authz/users/' + decoded.uid).remove();
  await getAuth().revokeRefreshTokens(decoded.uid);
  return { success: true };
}
async function beginPasswordLogin(body, req) {
  const { username, password } = body;
  const normalized = String(username || '').trim().toLowerCase();
  await throttle('password-ip:' + String(req.ip || 'unknown'), 20);
  await throttle('password-account:' + normalized, 5);
  const user = await getUser(username);
  if (!activeUser(user) || !checkLegacyPassword(user, password)) invalid('Credenciais inválidas', 401);
  return { token: await createToken(user), user: publicProfile(user) };
}
async function beginRegistration(body, req) {
  const { username, password } = body;
  const user = await authenticatedAccount(req);
  await throttle('registration-ip:' + String(req.ip || 'unknown'), 20);
  await throttle('registration:' + String(user.id), 5);
  if (String(username) !== user.username || !checkLegacyPassword(user, password)) invalid('Credenciais inválidas', 401);
  const existing = await credentialsFor(user.id);
  const options = await generateRegistrationOptions({
    rpID, rpName, userName: user.username, userDisplayName: user.name || user.username,
    userID: Buffer.from(userKey(user.id).slice(0,32), 'hex'),
    attestationType: 'none',
    excludeCredentials: existing.map((c) => ({ id: c.id, transports: c.transports || [] })),
    authenticatorSelection: { residentKey: 'required', userVerification: 'required' }
  });
  const challengeId = await storeChallenge({ type: 'register', challenge: options.challenge, userId: String(user.id) });
  return { challengeId, options };
}
async function finishRegistration(body, req) {
  const user = await authenticatedAccount(req);
  const challenge = await consumeChallenge(body.challengeId, 'register');
  if (String(user.id) !== String(challenge.userId)) invalid('Desafio pertence a outro usuário', 403);
  const verification = await verifyRegistrationResponse({
    response: body.response, expectedChallenge: challenge.challenge,
    expectedOrigin: allowedOrigin, expectedRPID: rpID, requireUserVerification: true
  });
  if (!verification.verified || !verification.registrationInfo) invalid('Registro biométrico não validado', 401);
  const { credential } = verification.registrationInfo;
  const id = credential.id;
  const key = credentialKey(id);
  const record = {
    id, publicKey: encode(credential.publicKey), counter: credential.counter,
    transports: body.response?.response?.transports || [], userId: String(user.id),
    createdAt: Date.now()
  };
  // Transaction makes a credential globally unique even under concurrent requests.
  const inserted = await credentialsRef().child(key).transaction((previous) => previous ? undefined : record, undefined, false);
  if (!inserted.committed) invalid('Esta credencial já está cadastrada', 409);
  await userIndexRef().child(userKey(user.id)).child(key).set(true);
  return { success: true };
}
async function beginAuthentication(_body, req) {
  await throttle('authentication-ip:' + String(req.ip || 'unknown'), 40);
  // An empty allowCredentials list enables discoverable (usernameless) passkeys.
  // The user account is determined only AFTER server-side assertion verification.
  const options = await generateAuthenticationOptions({
    rpID, userVerification: 'required', allowCredentials: []
  });
  const challengeId = await storeChallenge({ type: 'login', challenge: options.challenge });
  return { challengeId, options };
}
async function finishAuthentication(body) {
  const challenge = await consumeChallenge(body.challengeId, 'login');
  const recordKey = credentialKey(body.response?.id || '');
  const record = (await credentialsRef().child(recordKey).get()).val();
  if (!record) invalid('Credencial não autorizada', 401);
  const user = await getUserId(record.userId);
  if (!activeUser(user)) invalid('Usuário desativado ou ausente', 403);
  const result = await verifyAuthenticationResponse({
    response: body.response, expectedChallenge: challenge.challenge,
    expectedOrigin: allowedOrigin, expectedRPID: rpID,
    requireUserVerification: true, credential: credentialForWebauthn(record)
  });
  if (!result.verified) invalid('Biometria não validada', 401);
  const newCount = result.authenticationInfo.newCounter;
  const changed = await credentialsRef().child(recordKey).transaction((now) => {
    if (!now || now.userId !== String(user.id) || Number(now.counter) !== Number(record.counter)) return;
    return { ...now, counter: newCount, lastUsedAt: Date.now() };
  });
  if (!changed.committed) invalid('Credencial utilizada simultaneamente. Tente novamente.', 409);
  return { token: await createToken(user), user: publicProfile(user) };
}
export const portalPasskeys = onRequest({ region: 'southamerica-east1', cors: [allowedOrigin], maxInstances: 5 }, async (req, res) => {
  res.set('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });
  if (req.get('origin') !== allowedOrigin) return res.status(403).json({ error: 'Origem não autorizada' });
  if (!req.is('application/json')) return res.status(415).json({ error: 'Envie JSON' });
  try {
    const body = req.body || {};
    if (JSON.stringify(body).length > 25000) invalid('Requisição excede o limite', 413);
    const routes = {
      'register/options': beginRegistration, 'register/verify': finishRegistration,
      'login/password': beginPasswordLogin, 'session/logout': logoutSession,
      'login/options': beginAuthentication, 'login/verify': finishAuthentication
    };
    if (!Object.hasOwn(routes, body.action)) invalid('Ação inválida', 404);
    const result = await routes[body.action](body, req);
    return res.status(200).json(result);
  } catch (error) {
    console.error('portalPasskeys:', error?.message || 'unknown');
    return res.status(error.status || 500).json({ error: error.status ? error.message : 'Não foi possível validar a autenticação.' });
  }
});
