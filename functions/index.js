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
  return getAuth().createCustomToken(firebaseUid(user.id), {
    portal_user_id: String(user.id), portal_role: user.role
  });
}
async function beginRegistration(body) {
  const { username, password } = body;
  await throttle('registration:' + String(username || '').toLowerCase(), 5);
  const user = await getUser(username);
  if (!activeUser(user) || !checkLegacyPassword(user, password)) invalid('Credenciais inválidas', 401);
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
async function finishRegistration(body) {
  const challenge = await consumeChallenge(body.challengeId, 'register');
  const user = await getUserId(challenge.userId);
  if (!activeUser(user)) invalid('Usuário indisponível', 403);
  const verification = await verifyRegistrationResponse({
    response: body.response, expectedChallenge: challenge.challenge,
    expectedOrigin: allowedOrigin, expectedRPID: rpID, requireUserVerification: true
  });
  if (!verification.verified || !verification.registrationInfo) invalid('Registro biométrico não validado', 401);
  const { credential } = verification.registrationInfo;
  const id = credential.id;
  const key = credentialKey(id);
  const previous = (await credentialsRef().child(key).get()).val();
  if (previous) invalid('Esta credencial já está cadastrada', 409);
  const record = {
    id, publicKey: encode(credential.publicKey), counter: credential.counter,
    transports: body.response?.response?.transports || [], userId: String(user.id),
    createdAt: Date.now()
  };
  await db().ref().update({
    ['passkeys/credentials/' + key]: record,
    ['passkeys/userIndex/' + userKey(user.id) + '/' + key]: true
  });
  return { success: true };
}
async function beginAuthentication(body) {
  await throttle('authentication:' + String(body.username || '').toLowerCase(), 15);
  const user = await getUser(body.username);
  const list = activeUser(user) ? await credentialsFor(user.id) : [];
  if (!list.length) invalid('Nenhuma chave de acesso cadastrada para este usuário', 404);
  const options = await generateAuthenticationOptions({
    rpID, userVerification: 'required',
    allowCredentials: list.map((c) => ({ id: c.id, transports: c.transports || [] }))
  });
  const challengeId = await storeChallenge({ type: 'login', challenge: options.challenge, userId: String(user.id) });
  return { challengeId, options };
}
async function finishAuthentication(body) {
  const challenge = await consumeChallenge(body.challengeId, 'login');
  const user = await getUserId(challenge.userId);
  if (!activeUser(user)) invalid('Usuário desativado ou ausente', 403);
  const recordKey = credentialKey(body.response?.id || '');
  const record = (await credentialsRef().child(recordKey).get()).val();
  if (!record || record.userId !== String(user.id)) invalid('Credencial não autorizada', 401);
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
      'login/options': beginAuthentication, 'login/verify': finishAuthentication
    };
    if (!Object.hasOwn(routes, body.action)) invalid('Ação inválida', 404);
    const result = await routes[body.action](body);
    return res.status(200).json(result);
  } catch (error) {
    console.error('portalPasskeys:', error?.message || 'unknown');
    return res.status(error.status || 500).json({ error: error.status ? error.message : 'Não foi possível validar a autenticação.' });
  }
});
