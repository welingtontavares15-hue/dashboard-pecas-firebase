import fs from 'node:fs';
const legacy = JSON.parse(fs.readFileSync('firebase/database.rules.level2.json', 'utf8').replace(/^\uFEFF/, ''));
const grant = "auth != null && auth.token.portal_user_id != null && auth.token.portal_session_id != null && root.child('authz/sessions/' + auth.token.portal_session_id + '/uid').val() == auth.uid && (auth.token.portal_auth_method == 'passkey' || auth.token.portal_auth_method == 'password') && root.child('portalIdentity/status').val() == 'ready' && root.child('portalIdentity/users/' + auth.uid + '/version').val() == auth.token.portal_version && root.child('portalIdentity/users/' + auth.uid + '/disabled').val() != true && root.child('authz/sessions/' + auth.token.portal_session_id + '/allowed').val() == true && root.child('authz/sessions/' + auth.token.portal_session_id + '/version').val() == auth.token.portal_version && root.child('authz/sessions/' + auth.token.portal_session_id + '/userId').val() == auth.token.portal_user_id && root.child('authz/sessions/' + auth.token.portal_session_id + '/role').val() == auth.token.portal_role && root.child('authz/sessions/' + auth.token.portal_session_id + '/tecnicoId').val() == auth.token.portal_tecnico_id && root.child('authz/sessions/' + auth.token.portal_session_id + '/fornecedorId').val() == auth.token.portal_fornecedor_id && root.child('authz/sessions/' + auth.token.portal_session_id + '/expiresAt').val() > now";
function convert(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, convert(item)]));
  if (typeof value !== 'string') return value;
  return value.replaceAll("root.child('data/diversey_sessions/' + auth.uid + '/expiresAt').val() > now", '(' + grant + ')')
    .replace(/root\.child\('data\/diversey_sessions\/' \+ auth\.uid \+ '\/(role|tecnicoId|fornecedorId)'\)\.val\(\)/g,
      (_, field) => ({ role: 'auth.token.portal_role', tecnicoId: 'auth.token.portal_tecnico_id', fornecedorId: 'auth.token.portal_fornecedor_id' })[field]);
}
const rules = convert(legacy).rules;
for (const key of ['portalIdentity', 'authz', 'passkeys']) rules[key] = { '.read': false, '.write': false };
rules.data.diversey_users = { '.read': false, '.write': false };
rules.data.diversey_sessions = { '.read': false, '.write': false };
const solicitation = rules.data.diversey_solicitacoes;
const admin = "(auth.token.portal_role == 'administrador')";
const manager = "(auth.token.portal_role == 'gestor')";
solicitation['.read'] = `(${grant}) && (${admin} || ${manager} || (auth.token.portal_role == 'tecnico' && query.orderByChild == 'tecnicoId' && query.equalTo == auth.token.portal_tecnico_id) || (auth.token.portal_role == 'fornecedor' && query.orderByChild == 'fornecedorId' && query.equalTo == auth.token.portal_fornecedor_id))`;
const item = solicitation.$id;
// Suppliers update tracking through a server route with an exact field allowlist.
const previous = item['.write'];
const supplierStart = previous.lastIndexOf(' || (auth != null &&');
if (supplierStart < 0 || !previous.slice(supplierStart).includes("portal_role == 'fornecedor'")) throw Error('Legacy supplier rule layout changed');
item['.write'] = previous.slice(0, supplierStart).replace("auth.token.portal_role == 'tecnico' && newData", "auth.token.portal_role == 'tecnico' && (!data.exists() || data.child('tecnicoId').val() == auth.token.portal_tecnico_id) && newData");
item['.write'] = item['.write'].replace(" || (data.exists() && data.child('status').val() == 'em-transito' && newData.child('status').val() == 'finalizada')", '');
rules.data.diversey_recent_parts['.read'] = `(${grant}) && (${admin} || ${manager})`;
rules.data.diversey_recent_parts.$tecnicoId['.read'] = `(${grant}) && (${admin} || ${manager} || (auth.token.portal_role == 'tecnico' && $tecnicoId == auth.token.portal_tecnico_id))`;
const result = JSON.stringify({ rules }, null, 2) + '\n';
if (process.argv.includes('--check')) {
  if (fs.readFileSync('firebase/database.rules.passkeys.json', 'utf8').replaceAll('\r\n', '\n') !== result) throw Error('Rebuild staged rules');
} else fs.writeFileSync('firebase/database.rules.passkeys.json', result);
