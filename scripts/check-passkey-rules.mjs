import fs from 'node:fs';
import assert from 'node:assert/strict';
const file = 'firebase/database.rules.passkeys.json';
const rules = JSON.parse(fs.readFileSync(file, 'utf8')).rules;
assert.equal(rules['.read'], false);
assert.equal(rules['.write'], false);
assert.equal(rules.authz['.read'], false);
assert.equal(rules.authz['.write'], false);
assert.equal(rules.passkeys['.read'], false);
assert.equal(rules.passkeys['.write'], false);
assert.equal(rules.data.diversey_sessions['.read'], false);
assert.equal(rules.data.diversey_sessions['.write'], false);
const str = JSON.stringify(rules.data);
assert.ok(!str.includes("root.child('data/diversey_sessions/"), 'Legacy client sessions still used by rules');
assert.ok(!str.includes('"auth != null"'), 'Unscoped authentication detected');
for (const [name, record] of Object.entries(rules.data)) {
  if (name.startsWith('.') || name.startsWith('$') || name === 'diversey_sessions') continue;
  const current = JSON.stringify(record);
  assert.ok(current.includes('portal_role') || current.includes('portal_user_id'), 'Collection missing signed identity: ' + name);
}
const userRules = rules.data.diversey_users;
assert.ok(userRules['.read'].includes("portal_role == 'administrador'"));
assert.ok(userRules['.write'].includes("portal_role == 'administrador'"));
console.log('Rules structure and authorization guard assertions passed.');
