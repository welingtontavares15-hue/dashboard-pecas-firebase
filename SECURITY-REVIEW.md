# Security Review — Portal de Solicitação de Peças WWM

## Estado deste documento

Este documento descreve o **código da branch v68**. Não prova que Functions, Firebase Database Rules ou outras configurações externas já estejam publicadas no ambiente live.

- Baseline de produção antes da v68: `f5f2bc13d0e6b89ecb4da63ded6b12541795b604`.
- Release candidata: `v68-security-hardening`.
- Rollout: `docs/security-v68-rollout.md`.

## Modelo de segurança da v68

### Autenticação

- O navegador não valida mais a senha corporativa como autoridade final.
- `loginWithLegacyCredentials` valida a credencial em Cloud Functions usando Admin SDK.
- A função emite Firebase Custom Token com claims assinadas.
- Claims suportadas: `role`, `appUserId`, `username` e, conforme o perfil, `tecnicoId` ou `fornecedorId`.
- Perfis suportados: `administrador`, `gestor`, `tecnico`, `fornecedor`.
- Senha legada SHA-256 continua sendo aceita somente durante migração compatível.
- Após login válido, a credencial é migrada para PBKDF2-SHA256 com salt aleatório por conta e 210.000 iterações.
- A sessão de aplicação é limitada a 8 horas na v68.
- Tentativas de login são limitadas no backend, não apenas na memória do navegador.

### Autorização

O ruleset estrito `firebase/database.rules.v68.json` usa `auth.token.*` como fonte de autorização.

- `diversey_sessions` não concede autorização e fica sem acesso de cliente.
- `diversey_users` é restrito a administradores.
- Técnicos são limitados por `tecnicoId` assinado.
- Fornecedores são limitados por `fornecedorId` assinado.
- Gestores podem decidir solicitações, mas regras preservam campos críticos de origem ao alterar status.
- Fornecedores podem registrar transição/rastreio permitido sem alterar itens, custo, técnico, número ou data original.
- O estado server-side de rate limiting fica sob `server_auth`, inacessível ao cliente.

### Janela de migração

A Function de login grava temporariamente uma sessão de compatibilidade emitida pelo servidor para permitir que o frontend v68 funcione durante o intervalo entre sua publicação e a ativação do ruleset estrito. Essa compatibilidade não deve ser tratada como arquitetura permanente e deve ser removida após o rollout estabilizar.

## Proteção de dados

### Confirmado no código da v68

- perfil retornado pelo backend não contém senha, hash ou salt;
- dados de negócio não são carregados antes da autenticação corporativa v68;
- logout limpa cache de negócio e listeners do cliente;
- produção continua online-first: escrita de negócio offline permanece bloqueada;
- painel de credenciais do login permanece bloqueado em produção;
- fallback de endereço residencial dos técnicos continua redigido pelo privacy guard.

### Pendências externas / governança

- o repositório ainda é público; a classificação de nomes de técnicos, catálogo e preços deve ser decidida pelo proprietário do sistema;
- histórico Git pode conter informações antigas mesmo após remoção de arquivos atuais;
- App Check ainda não é obrigatório nas callables da v68; habilitar somente após provider e rollout controlado;
- MFA/SSO corporativo não é implementado por esta migração; OIDC/SAML continua sendo a direção preferida de longo prazo;
- backup, retenção e recuperação precisam de política operacional formal fora do código do frontend.

## Testes e gates

A v68 introduz cobertura executável para:

- verificação e migração de credenciais legadas;
- geração de claims e sanitização de perfil;
- contrato estático das regras RTDB;
- transições críticas de solicitação;
- integração do runtime seguro com PWA/release;
- privacy guard;
- lint estrito dos módulos críticos;
- não regressão da dívida ESLint histórica;
- auditoria de dependências de produção do site estático e das Functions.

A CI não substitui teste live. Antes da ativação das regras estritas, executar os smoke tests de todos os perfis descritos no runbook.

## Riscos residuais conhecidos

1. **App Check não obrigatório** — callables de login podem ser chamadas sem attestation; rate limiting server-side reduz abuso por conta, mas não substitui App Check.
2. **Credenciais legadas ainda armazenadas durante migração** — hashes antigos devem ser removidos depois que a cobertura PBKDF2 das contas ativas for confirmada.
3. **Repositório público** — dados operacionais embarcados no bundle precisam de classificação formal e, se internos, remoção do bundle e eventual saneamento de histórico.
4. **Dívida frontend histórica** — centenas de violações ESLint e múltiplas camadas CSS antigas ainda existem; o gate v68 impede crescimento, mas a remoção deve ocorrer incrementalmente com regressão visual/funcional.
5. **Observabilidade técnica local** — parte relevante da telemetria ainda reside no navegador; não há prova de monitoramento central completo.
6. **E2E live não executado nesta branch** — autenticação real e regras publicadas exigem provider readback durante rollout autorizado.

## Critério de aceite de segurança

A v68 só pode ser considerada implantada quando:

- Functions publicadas e lidas de volta no projeto correto;
- frontend v68 publicado e GitHub Pages concluído com sucesso;
- ruleset estrito v68 publicado e lido de volta;
- Admin, Gestor, Técnico e Fornecedor passam smoke test no ambiente live;
- testes negativos confirmam isolamento entre técnicos e fornecedores;
- rollback foi preservado durante toda a janela de mudança.

## Última revisão

2026-08-30 — candidato v68, ainda sem alegação de implantação live.
