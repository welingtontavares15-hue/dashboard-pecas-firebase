# FIREBASE-RULES (Bloco 08)

Este bloco entrega **Rules Nível 1 (mínimo funcional)** e **Rules Nível 2 (recomendado)** para o Realtime Database, mantendo o padrão de nós:

- `/data/diversey_users`
- `/data/diversey_tecnicos`
- `/data/diversey_fornecedores`
- `/data/diversey_pecas`
- `/data/diversey_solicitacoes`
- `/data/diversey_settings`
- `/data/diversey_recent_parts`
- `/data/diversey_export_log`
- `/data/diversey_export_files`

## Nível 1 (mínimo funcional)

Permite leitura/escrita em qualquer `/data/*` desde que o usuário esteja autenticado (Auth anônimo).

Arquivo: `firebase/database.rules.level1.json`

### Quando usar
- Primeiro deploy / smoke test
- Diagnosticar conectividade

## Nível 2 (recomendado)

Regras mais restritivas por papel (**admin/gestor/tecnico**) e com tentativas de limitar escopo de escrita.

Arquivo: `firebase/database.rules.level2.json`

### Requisito para Nível 2: sessão RBAC
As Rules do RTDB não “enxergam” o login do app automaticamente. Para habilitar RBAC no servidor, o app precisa gravar uma sessão simples por `auth.uid` em:

`/data/diversey_sessions/<auth.uid>`

Exemplo de payload:
```json
{
  "username": "joao",
  "role": "gestor",
  "tecnicoId": "TEC001",
  "expiresAt": 1739999999999
}
```

Você tem um snippet pronto em: `js/snippets/rbac-session.js`.

### O que o Nível 2 aplica
- **admin/administrador**: pode ler/escrever tudo em `/data/diversey_*`
- **gestor**: pode ler tudo de solicitações e **aprovar/rejeitar**; pode ler cadastros
- **tecnico**: pode criar/editar **apenas as próprias solicitações** (somente `rascunho`/`pendente`) e ler catálogo de peças

### Observação importante (segurança)
Como o “login do app” é client-side, RBAC via Rules pode ficar limitado contra um atacante que modifique o client.  
Para segurança forte, a abordagem recomendada é:
- usar **Firebase Auth por usuário** (e-mail/senha) + **Custom Claims**; ou
- um **gate com Cloud Functions** para operações sensíveis.

## Como aplicar no Firebase Console
1. Firebase Console → Realtime Database → aba **Rules**
2. Cole o JSON do nível desejado:
   - Nível 1: `firebase/database.rules.level1.json`
   - Nível 2: `firebase/database.rules.level2.json`
3. Clique **Publish**

## Checklist de validação
- [ ] Auth Anônimo habilitado
- [ ] Healthcheck passa (read/write em `/data`)
- [ ] No Nível 2: o app grava `/data/diversey_sessions/<uid>` após login do app
- [ ] Técnico não consegue aprovar/rejeitar
- [ ] Técnico não consegue editar solicitação aprovada/rejeitada
