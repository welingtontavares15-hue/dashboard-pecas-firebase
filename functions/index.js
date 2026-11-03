import { randomUUID } from 'node:crypto';
import { onRequest } from 'firebase-functions/v2/https';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';
import { getAuth } from 'firebase-admin/auth';
import { generateRegistrationOptions, verifyRegistrationResponse, generateAuthenticationOptions, verifyAuthenticationResponse } from '@simplewebauthn/server';
import { activeUser, credentialKey, firebaseUid, normalizeUsername, publicProfile, userById, userByName, userKey } from './passkey-utils.js';
import { identityStore, safeProfile, verifyPassword } from './identity-store.js';

if (!getApps().length) initializeApp(process.env.PORTAL_DATABASE_URL ? { databaseURL: process.env.PORTAL_DATABASE_URL } : undefined);
const rpID = process.env.PASSKEY_RP_ID || 'welingtontavares15-hue.github.io';
const rpName = 'Portal de Peças WWM';
const expectedOrigin = process.env.PASSKEY_ORIGIN || 'https://welingtontavares15-hue.github.io';
const allowedOrigin = new URL(expectedOrigin).origin;
const db = () => getDatabase();
const identities = () => identityStore(db());
const users = async () => Object.values((await identities().state()).users || {});
const challengesRef = () => db().ref('passkeys/challenges');
const credentialsRef = () => db().ref('passkeys/credentials');
const userIndexRef = () => db().ref('passkeys/userIndex');
const limitsRef = () => db().ref('passkeys/limits');
const expirationMs = 5 * 60 * 1000;
const encode = (value) => Buffer.from(value).toString('base64url');

function invalid(message, status = 400) { const error = new Error(message); error.status = status; throw error; }
async function getUser(username) {
  return userByName(await users(), username);
}
async function getUserId(id) {
  return userById(await users(), id);
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
    saved = undefined;
    if (current === null) return null;
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
async function createToken(user, method = 'passkey') {
  // Only backend-verified identities receive short-lived, server-owned grants.
  const uid = firebaseUid(user.id);
  const sessionId = randomUUID();
  await db().ref('authz/sessions/' + sessionId).set({
    allowed: true, uid, userId: String(user.id), role: user.role, version: user.version,
    tecnicoId: (user.tecnicoId ?? ''), fornecedorId: (user.fornecedorId ?? ''),
    expiresAt: Date.now() + (60 * 60 * 1000), updatedAt: Date.now()
  });
  return getAuth().createCustomToken(uid, {
    portal_user_id: String(user.id),
    portal_role: user.role,
    portal_username: String(user.username),
    portal_tecnico_id: (user.tecnicoId ?? ''),
    portal_fornecedor_id: (user.fornecedorId ?? ''),
    portal_auth_method: method, portal_version: user.version, portal_session_id: sessionId
  });
}
async function authenticatedAccount(req, allowExpiredGrant = false) {
  const header = String(req.get('authorization') || '');
  const match = /^Bearer ([A-Za-z0-9._~-]+)$/.exec(header);
  if (!match) invalid('Sessão autenticada obrigatória', 401);
  let decoded;
  try { decoded = await getAuth().verifyIdToken(match[1], true); }
  catch { invalid('Sessão expirada ou inválida', 401); }
  const user = await getUserId(decoded.portal_user_id);
  if (!/^[0-9a-f-]{36}$/.test(String(decoded.portal_session_id || ''))) invalid('Sessão inválida.', 403);
  const grant = (await db().ref('authz/sessions/' + decoded.portal_session_id).get()).val();
  if (!activeUser(user) || decoded.uid !== firebaseUid(user.id)
    || decoded.portal_role !== user.role || decoded.portal_username !== user.username
    || !['passkey', 'password'].includes(decoded.portal_auth_method)
    || grant?.allowed !== true || grant.role !== user.role || grant.userId !== String(user.id)
    || grant.uid !== decoded.uid || grant.version !== user.version || decoded.portal_version !== user.version
    || decoded.portal_tecnico_id !== (user.tecnicoId ?? '')
    || decoded.portal_fornecedor_id !== (user.fornecedorId ?? '')
    || grant.tecnicoId !== (user.tecnicoId ?? '') || grant.fornecedorId !== (user.fornecedorId ?? '')
    || (!allowExpiredGrant && Number(grant.expiresAt) <= Date.now())
    || Date.now() - Number(decoded.auth_time) * 1000 > 12 * 60 * 60 * 1000) invalid('Sessão sem autorização', 403);
  return { ...user, sessionId: decoded.portal_session_id };
}
async function sessionProfile(_body, req) {
  const user = await authenticatedAccount(req, true);
  // Renew only a still-existing, version-matched grant; logout cannot be undone.
  const renewed = await db().ref('authz/sessions/' + user.sessionId).transaction(grant => {
    if (grant === null) return null;
    if (!grant || grant.version !== user.version || grant.allowed !== true) return;
    return { ...grant, expiresAt: Date.now() + 3600000 };
  });
  if (!renewed.committed || !renewed.snapshot.exists()) invalid('Sessão revogada', 403);
  return { user: safeProfile(user) };
}
async function logoutSession(_body, req) {
  const user = await authenticatedAccount(req, true);
  await db().ref('authz/sessions/' + user.sessionId).remove();
  return { success: true };
}
async function beginPasswordLogin(body, req) {
  const { username, password } = body;
  const name = normalizeUsername(username);
  const normalized = name === 'adm' ? 'admin' : name;
  await throttle('password-ip:' + String(req.ip || 'unknown'), 20);
  await throttle('password-account:' + normalized, 5);
  const user = await getUser(username);
  if (!activeUser(user) || !(await verifyPassword(user, password))) invalid('Credenciais inválidas', 401);
  const upgraded = await identities().upgrade(user, password);
  return { token: await createToken(upgraded, 'password'), user: safeProfile(upgraded) };
}
async function beginRegistration(body, req) {
  const { username, password } = body;
  const user = await authenticatedAccount(req);
  await throttle('registration-ip:' + String(req.ip || 'unknown'), 20);
  await throttle('registration:' + String(user.id), 5);
  if (String(username) !== user.username || !(await verifyPassword(user, password))) invalid('Credenciais inválidas', 401);
  const existing = (await credentialsFor(user.id)).filter(credential => credential.version === user.version);
  const options = await generateRegistrationOptions({
    rpID, rpName, userName: user.username, userDisplayName: user.name || user.username,
    userID: Buffer.from(userKey(user.id).slice(0,32), 'hex'),
    attestationType: 'none',
    excludeCredentials: existing.map((c) => ({ id: c.id, transports: c.transports || [] })),
    authenticatorSelection: { residentKey: 'required', userVerification: 'required' }
  });
  const challengeId = await storeChallenge({ type: 'register', challenge: options.challenge, userId: String(user.id), version: user.version });
  return { challengeId, options };
}
async function finishRegistration(body, req) {
  const user = await authenticatedAccount(req);
  const challenge = await consumeChallenge(body.challengeId, 'register');
  if (String(user.id) !== String(challenge.userId) || user.version !== challenge.version) invalid('Desafio pertence a outra sessão', 403);
  const verification = await verifyRegistrationResponse({
    response: body.response, expectedChallenge: challenge.challenge,
    expectedOrigin: allowedOrigin, expectedRPID: rpID, requireUserVerification: true
  }).catch(() => invalid('Registro biométrico não validado', 401));
  if (!verification.verified || !verification.registrationInfo) invalid('Registro biométrico não validado', 401);
  const { credential } = verification.registrationInfo;
  const id = credential.id;
  const key = credentialKey(id);
  const record = {
    id, publicKey: encode(credential.publicKey), counter: credential.counter,
    transports: body.response?.response?.transports || [], userId: String(user.id),
    createdAt: Date.now(), version: user.version
  };
  // Transaction makes a credential globally unique even under concurrent requests.
  const inserted = await credentialsRef().child(key).transaction((previous) => {
    if (previous && (previous.userId !== record.userId || previous.version === user.version)) return;
    return record;
  }, undefined, false);
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
  if (!activeUser(user) || record.version !== user.version) invalid('Credencial revogada. Cadastre novamente após entrar com senha.', 403);
  const result = await verifyAuthenticationResponse({
    response: body.response, expectedChallenge: challenge.challenge,
    expectedOrigin: allowedOrigin, expectedRPID: rpID,
    requireUserVerification: true, credential: credentialForWebauthn(record)
  }).catch(() => invalid('Biometria não validada', 401));
  if (!result.verified) invalid('Biometria não validada', 401);
  const newCount = result.authenticationInfo.newCounter;
  const changed = await credentialsRef().child(recordKey).transaction((now) => {
    if (now === null) return null;
    if (!now || now.userId !== String(user.id) || Number(now.counter) !== Number(record.counter)) return;
    return { ...now, counter: newCount, lastUsedAt: Date.now() };
  });
  if (!changed.committed || !changed.snapshot.exists()) invalid('Credencial utilizada simultaneamente. Tente novamente.', 409);
  return { token: await createToken(user), user: publicProfile(user) };
}
async function listUsers(_body, req) {
  const actor = await authenticatedAccount(req);
  return { users: (actor.role === 'administrador' ? await users() : [actor]).map(safeProfile) };
}
async function saveUser(body, req) {
  const actor = await authenticatedAccount(req);
  const user = await identities().save(actor, body.user, body.linked);
  return { success: true, user, reauthenticate: String(user.id) === String(actor.id) };
}
async function deleteUser(body, req) {
  const actor = await authenticatedAccount(req);
  if (String(body.userId) === String(actor.id)) invalid('Não é permitido excluir a própria conta.', 409);
  await identities().remove(actor, body.userId, body.linked);
  return { success: true };
}
async function changePassword(body, req) {
  const actor = await authenticatedAccount(req);
  await identities().changePassword(actor, body.currentPassword, body.newPassword, body.userId ?? actor.id);
  return { success: true, reauthenticate: String(body.userId ?? actor.id) === String(actor.id) };
}
async function fulfillment(body, req, receipt = false) {
  const actor = await authenticatedAccount(req);
  if (actor.role !== (receipt ? 'tecnico' : 'fornecedor')) invalid('Perfil sem autorização para a operação.', 403);
  if (typeof body.id !== 'string' || /[.#$\[\]\/]/.test(body.id) || !body.id) invalid('Solicitação inválida.');
  const trackingCode = String(body.trackingCode || '').trim();
  if (!receipt && !/^[A-Za-z0-9][A-Za-z0-9 ._-]{2,119}$/.test(trackingCode)) invalid('Rastreio inválido.');
  // Root transaction makes the identity-version check and scoped mutation atomic.
  let solicitation;
  let transactionError;
  const result = await db().ref().transaction(current => {
    try {
    if (current === null) return null;
    if (current?.portalIdentity?.users?.[firebaseUid(actor.id)]?.version !== actor.version) invalid('Sessão revogada.', 403);
    const item = current?.data?.diversey_solicitacoes?.[body.id];
    const scope = receipt ? 'tecnicoId' : 'fornecedorId';
    if (!item || item[scope] !== actor[scope]) invalid('Solicitação sem autorização.', 403);
    if (!(receipt ? ['em-transito'] : ['aprovada', 'em-transito']).includes(item.status)) invalid('Transição não autorizada.', 409);
    const now = Date.now();
    const by = actor.name || actor.username;
    solicitation = {
      ...item, status: receipt ? 'finalizada' : 'em-transito', updatedAt: now,
      ...(receipt ? { deliveredAt: now, deliveredBy: by, finalizedAt: now, finalizedBy: by } : {
        trackingCode, trackingUpdatedAt: now,
        trackingUpdatedByUserId: String(actor.id), trackingUpdatedByUsername: actor.username,
        trackingUpdatedByEmail: actor.email || null, trackingUpdatedByRole: actor.role
      }),
      audit: { ...item.audit, version: Number(item.audit?.version || 0) + 1, lastUpdatedAt: now, lastUpdatedBy: by },
      timeline: [...(Array.isArray(item.timeline) ? item.timeline : []), { event: 'status_changed', from: item.status, to: receipt ? 'finalizada' : 'em-transito', at: now, by, comment: receipt ? null : trackingCode }]
    };
    current.data.diversey_solicitacoes[body.id] = solicitation;
    return current;
    } catch (error) { transactionError = error; return undefined; }
  }, undefined, false);
  if (transactionError) throw transactionError;
  if (!result.committed || !result.snapshot.exists()) invalid('Conflito ao atualizar rastreio.', 409);
  return { success: true, solicitation };
}
export async function portalHandler(req, res) {
  res.set('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });
  if (req.get('origin') !== allowedOrigin) return res.status(403).json({ error: 'Origem não autorizada' });
  if (!req.is('application/json')) return res.status(415).json({ error: 'Envie JSON' });
  try {
    const body = req.body || {};
    if (JSON.stringify(body).length > 25000) invalid('Requisição excede o limite', 413);
    const routes = {
      'register/options': beginRegistration, 'register/verify': finishRegistration,
      'login/password': beginPasswordLogin, 'session/logout': logoutSession, 'session/profile': sessionProfile,
      'users/list': listUsers, 'users/save': saveUser, 'users/delete': deleteUser, 'users/password': changePassword,
      'solicitations/tracking': (body, req) => fulfillment(body, req),
      'solicitations/receipt': (body, req) => fulfillment(body, req, true),
      'login/options': beginAuthentication, 'login/verify': finishAuthentication
    };
    if (!Object.hasOwn(routes, body.action)) invalid('Ação inválida', 404);
    const result = await routes[body.action](body, req);
    return res.status(200).json(result);
  } catch (error) {
    console.error('portalPasskeys:', error?.message || 'unknown');
    return res.status(error.status || 500).json({ error: error.status ? error.message : 'Não foi possível validar a autenticação.' });
  }
}
export const portalPasskeys = onRequest({ region: 'southamerica-east1', cors: [allowedOrigin], maxInstances: 5 }, portalHandler);
