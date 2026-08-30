const fs = require('fs');
const path = require('path');

const rulesPath = path.join(__dirname, '../firebase/database.rules.v68.json');
const firebasePath = path.join(__dirname, '../firebase.json');
const rawRules = fs.readFileSync(rulesPath, 'utf8');
const rules = JSON.parse(rawRules).rules;
const firebaseConfig = JSON.parse(fs.readFileSync(firebasePath, 'utf8'));

describe('Firebase RTDB rules v68', () => {
  test('firebase.json deploys the hardened ruleset', () => {
    expect(firebaseConfig.database.rules).toBe('firebase/database.rules.v68.json');
    expect(firebaseConfig.functions.source).toBe('functions');
  });

  test('client-controlled access sessions no longer authorize anything', () => {
    const sessions = rules.data.diversey_sessions;
    expect(sessions['.read']).toBe(false);
    expect(sessions['.write']).toBe(false);
    expect(rawRules).not.toContain("data/diversey_sessions/' + auth.uid + '/role");
  });

  test('authorization is based on signed Firebase token claims', () => {
    expect(rawRules).toContain('auth.token.role');
    expect(rawRules).toContain('auth.token.tecnicoId');
    expect(rawRules).toContain('auth.token.fornecedorId');
  });

  test('user credential records are visible only to administrators', () => {
    const usersRead = rules.data.diversey_users['.read'];
    expect(usersRead).toContain("auth.token.role == 'administrador'");
    expect(usersRead).not.toContain("auth.token.role == 'gestor'");
    expect(usersRead).not.toContain("auth.token.role == 'tecnico'");
    expect(usersRead).not.toContain("auth.token.role == 'fornecedor'");
  });

  test('anonymous Firebase authentication alone grants no business data access', () => {
    expect(rules.data['.read']).toBe(false);
    expect(rules.data['.write']).toBe(false);
    const serialized = JSON.stringify(rules.data);
    expect(serialized).not.toMatch(/"\.read":"auth != null"/);
  });

  test('technicians can read the parts catalog but cannot mutate it', () => {
    expect(rules.data.diversey_pecas['.read']).toContain("auth.token.role == 'tecnico'");
    expect(rules.data.diversey_pecas['.write']).not.toContain("auth.token.role == 'tecnico'");
  });

  test('supplier writes preserve business-critical request fields', () => {
    const writeRule = rules.data.diversey_solicitacoes.$id['.write'];
    expect(writeRule).toContain("auth.token.role == 'fornecedor'");
    expect(writeRule).toContain("newData.child('itens').val() == data.child('itens').val()");
    expect(writeRule).toContain("newData.child('total').val() == data.child('total').val()");
    expect(writeRule).toContain("newData.child('tecnicoId').val() == data.child('tecnicoId').val()");
    expect(writeRule).toContain("newData.child('numero').val() == data.child('numero').val()");
  });

  test('server-only brute-force state is unreachable from clients', () => {
    expect(rules.server_auth['.read']).toBe(false);
    expect(rules.server_auth['.write']).toBe(false);
  });
});
