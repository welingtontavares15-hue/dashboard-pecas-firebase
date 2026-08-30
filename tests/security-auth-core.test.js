const {
  PBKDF2_ITERATIONS,
  authUidFor,
  buildClaims,
  createStrongPasswordRecord,
  findUser,
  legacyPasswordHash,
  legacySharedSaltHash,
  resolveLoginUsername,
  sanitizeProfile,
  verifyPassword
} = require('../functions/lib/auth-core');

describe('v68 server-authoritative authentication core', () => {
  test('normalizes the historical adm alias without fuzzy matching', () => {
    expect(resolveLoginUsername(' ADM ')).toBe('admin');
    expect(resolveLoginUsername('administrator')).toBe('administrator');
  });

  test('verifies current per-user legacy hashes for backwards-compatible cutover', () => {
    const user = {
      id: 'u1',
      username: 'gestor',
      role: 'gestor',
      passwordHash: legacyPasswordHash('SenhaSegura123', 'gestor')
    };
    expect(verifyPassword(user, 'SenhaSegura123')).toEqual({
      valid: true,
      scheme: 'legacy-per-user-sha256'
    });
    expect(verifyPassword(user, 'errada').valid).toBe(false);
  });

  test('accepts old shared-salt hash only for migration compatibility', () => {
    const user = {
      id: 'u1',
      username: 'gestor',
      role: 'gestor',
      passwordHash: legacySharedSaltHash('SenhaSegura123')
    };
    expect(verifyPassword(user, 'SenhaSegura123').scheme).toBe('legacy-shared-sha256');
  });

  test('upgrades credentials to PBKDF2 with a random per-user salt', () => {
    const first = createStrongPasswordRecord('SenhaSegura123');
    const second = createStrongPasswordRecord('SenhaSegura123');
    expect(first.passwordAlgorithm).toBe('pbkdf2-sha256');
    expect(first.passwordIterations).toBe(PBKDF2_ITERATIONS);
    expect(first.passwordSaltV2).not.toBe(second.passwordSaltV2);
    expect(first.passwordHashV2).not.toBe(second.passwordHashV2);
    expect(verifyPassword({ username: 'x', role: 'gestor', ...first }, 'SenhaSegura123').valid).toBe(true);
    expect(verifyPassword({ username: 'x', role: 'gestor', ...first }, 'errada').valid).toBe(false);
  });

  test('emits claims only for supported, enabled roles', () => {
    const claims = buildClaims({
      id: 'tech-user',
      username: 'tecnico.01',
      name: 'Técnico 01',
      role: 'tecnico',
      tecnicoId: 'tec-01'
    });
    expect(claims).toMatchObject({
      role: 'tecnico',
      appUserId: 'tech-user',
      username: 'tecnico.01',
      tecnicoId: 'tec-01'
    });
    expect(buildClaims({ id: 'x', username: 'x', role: 'root' })).toBeNull();
    expect(buildClaims({ id: 'x', username: 'x', role: 'administrador', disabled: true })).toBeNull();
  });

  test('never returns password material in the client profile', () => {
    const profile = sanitizeProfile({
      id: 'admin',
      username: 'admin',
      name: 'Administrador',
      role: 'administrador',
      password: 'plain',
      passwordHash: 'legacy',
      passwordHashV2: 'strong',
      passwordSaltV2: 'salt'
    });
    expect(profile).toEqual({
      id: 'admin',
      username: 'admin',
      name: 'Administrador',
      role: 'administrador',
      email: '',
      tecnicoId: null,
      fornecedorId: null,
      disabled: false
    });
    expect(JSON.stringify(profile)).not.toMatch(/password|salt/i);
  });

  test('finds users in legacy array and wrapped storage shapes', () => {
    expect(findUser([{ username: 'admin', role: 'administrador' }], 'adm')?.path).toBe('0');
    expect(findUser({ data: [{ username: 'gestor', role: 'gestor' }] }, 'gestor')?.path).toBe('data/0');
  });

  test('creates stable Firebase UIDs without exposing username', () => {
    const first = authUidFor({ id: 'user-123', username: 'secret.name' });
    const second = authUidFor({ id: 'user-123', username: 'changed.name' });
    expect(first).toBe(second);
    expect(first).toMatch(/^wwm_[a-f0-9]{48}$/);
    expect(first).not.toContain('secret');
  });
});
