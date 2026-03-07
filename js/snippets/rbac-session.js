// js/snippets/rbac-session.js
// Exemplo (client-side) para habilitar Rules Nível 2
// Requer: FirebaseInit (Auth anônimo já autenticado) + window.firebaseModules.set
// Grava a sessão em: /data/diversey_sessions/<auth.uid>

export async function upsertRbacSession({ username, role, tecnicoId, displayName }, ttlMs = 8 * 60 * 60 * 1000) {
  try {
    if (typeof FirebaseInit === 'undefined') throw new Error('FirebaseInit indisponível');
    if (!FirebaseInit.isReady()) await FirebaseInit.waitForReady();

    const uid = FirebaseInit.auth?.currentUser?.uid;
    if (!uid) throw new Error('auth.uid ausente');

    const { set } = window.firebaseModules;
    const expiresAt = Date.now() + ttlMs;

    const ref = FirebaseInit.getRef(`data/diversey_sessions/${uid}`);
    await set(ref, {
      username,
      role,              // 'admin'|'administrador'|'gestor'|'tecnico'
      tecnicoId: tecnicoId || null,
      displayName: displayName || null,
      expiresAt,
      updatedAt: Date.now()
    });
    return true;
  } catch (e) {
    console.warn('[RBAC] Falha ao gravar sessão para Rules Nível 2:', e);
    return false;
  }
}

export async function clearRbacSession() {
  try {
    if (typeof FirebaseInit === 'undefined') return;
    if (!FirebaseInit.isReady()) await FirebaseInit.waitForReady();
    const uid = FirebaseInit.auth?.currentUser?.uid;
    if (!uid) return;
    const { set } = window.firebaseModules;
    const ref = FirebaseInit.getRef(`data/diversey_sessions/${uid}`);
    await set(ref, { expiresAt: 0, updatedAt: Date.now() });
  } catch (e) {
    console.warn('[RBAC] Falha ao limpar sessão:', e);
  }
}
