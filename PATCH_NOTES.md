# PATCH_NOTES (Bloco 08)

Este ZIP contém apenas os artefatos do Bloco 08 (Rules + snippet).

## Arquivos incluídos
- firebase/database.rules.level1.json
- firebase/database.rules.level2.json
- docs/FIREBASE-RULES.md
- js/snippets/rbac-session.js

## Como integrar no seu projeto
1) Copie a pasta `firebase/` para o repositório
2) Copie `docs/FIREBASE-RULES.md` para o seu `/docs/` (ou substitua)
3) No fluxo de login do app, chame:
   - `upsertRbacSession({ username, role, tecnicoId, displayName })` após login OK
   - `clearRbacSession()` no logout

Pronto: você pode ativar Rules Nível 2 no Console.
