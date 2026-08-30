# WWM v68 — rollout de autenticação e RBAC

## Objetivo

Migrar o portal de autenticação corporativa validada no navegador para autenticação server-authoritative com Firebase Custom Token e claims assinadas, sem interromper usuários durante o corte.

## Baseline e rollback

- Baseline do frontend: `f5f2bc13d0e6b89ecb4da63ded6b12541795b604`.
- Antes de qualquer alteração live, exportar/registrar as regras RTDB atuais e confirmar backup do banco.
- Não aplicar `firebase/database.rules.v68.json` antes do frontend v68 estar publicado e validado.
- Em falha do frontend, reverter GitHub Pages para o baseline e manter as regras legadas durante a investigação.
- Em falha das regras estritas, restaurar imediatamente o ruleset anterior; Functions podem permanecer publicadas porque a v67 não as chama.

## Ordem obrigatória de rollout

### 1. Publicar Functions primeiro

Publicar somente as Functions:

```bash
firebase deploy --only functions
```

Funções esperadas:

- `loginWithLegacyCredentials`
- `getCurrentProfile`

Esse passo não altera o frontend atual. A função de login cria Custom Token/claims e também grava uma sessão de compatibilidade curta, emitida pelo servidor, para que o frontend v68 ainda funcione com o ruleset legado durante a janela de migração.

### 2. Healthcheck das Functions

Antes de tocar no frontend:

- confirmar que as duas Functions existem na região configurada;
- autenticar uma conta controlada de cada perfil necessário;
- confirmar que senha inválida não recebe token;
- confirmar bloqueio após excesso de tentativas;
- confirmar que o perfil retornado não contém senha, hash ou salt;
- confirmar que claims contêm somente o escopo esperado.

Se qualquer item falhar, parar o rollout. O frontend v67 permanece funcionando.

### 3. Publicar frontend v68

Somente após o healthcheck das Functions, promover o PR da v68 ao `main` e aguardar o GitHub Pages terminar com sucesso.

Durante essa etapa, as regras legadas ainda permanecem ativas. O backend v68 grava a sessão de compatibilidade para o UID do Custom Token; isso evita uma janela de indisponibilidade entre frontend e rules.

Smoke test obrigatório, em navegador limpo:

- Administrador: login, dashboard, solicitações e cadastros autorizados.
- Gestor: login, dashboard, solicitações, aprovações e relatórios; cadastros bloqueados.
- Técnico: login, catálogo, criação e próprias solicitações; sem acesso administrativo.
- Fornecedor: login, somente pedidos do fornecedor vinculado e atualização permitida de rastreio.
- Logout: dados de negócio removidos da sessão do navegador e retorno à tela de login.

### 4. Publicar regras estritas v68

Após os smoke tests do frontend:

```bash
firebase deploy --only database
```

`firebase.json` aponta para `firebase/database.rules.v68.json`.

Depois do deploy das regras, repetir os smoke tests dos quatro perfis. Confirmar especialmente:

- usuário anônimo sem claims não consegue ler coleções de negócio;
- técnico não consegue consultar solicitação de outro técnico;
- fornecedor não consegue consultar/alterar solicitação de outro fornecedor;
- gestor não consegue alterar itens/total/número/data original ao aprovar;
- fornecedor não consegue alterar itens/total/técnico/número ao registrar rastreio;
- `diversey_users` fica inacessível para perfis não administradores;
- `diversey_sessions` fica inacessível a clientes.

### 5. Encerrar janela de compatibilidade

Depois de uma janela operacional estável e evidência de que os usuários migraram:

- remover a escrita `writeLegacyCompatibilitySession` das Functions;
- remover registros antigos de `data/diversey_sessions` por rotina administrativa controlada;
- remover hashes SHA-256 legados após confirmar que todas as contas ativas possuem `passwordHashV2`;
- habilitar App Check para as callables após provisionar o provider adequado;
- avaliar migração futura para IdP corporativo/OIDC/SAML.

## Detecção de falha

Sinais de bloqueio do rollout:

- crescimento de `permission_denied` após uma etapa;
- login válido sem Custom Token;
- perfil retornado diferente do usuário autenticado;
- claim de role ou escopo ausente/incorreta;
- técnico/fornecedor enxergando registros fora do próprio escopo;
- falha de leitura generalizada imediatamente após rules deploy.

Qualquer um desses sinais exige parada e rollback da última etapa, não avanço para a próxima.

## O que não é provado pela CI

A CI valida código, contratos estáticos, regressões, lint crítico e dependências. Ela não prova que:

- as Functions estão publicadas no projeto Firebase correto;
- o ruleset versionado é o mesmo ruleset live;
- App Check está provisionado;
- um login real de produção funciona;
- os quatro perfis passam E2E no ambiente live.

Esses pontos exigem readback/smoke test no provider durante o rollout autorizado.
