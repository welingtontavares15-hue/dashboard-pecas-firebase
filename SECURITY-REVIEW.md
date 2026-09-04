# Security Review and Compliance

## Status

**Revisão técnica atualizada em setembro de 2026.**

O sistema possui controles de interface, rate limiting client-side, trilha de auditoria e regras do Firebase, mas **não deve ser considerado com autorização forte enquanto a autenticação/RBAC atual depender de atributos de sessão originados no cliente**.

Detalhes de exploração não devem ser publicados neste repositório público. O mecanismo completo deve ser tratado em canal restrito de segurança.

## Arquitetura observada

### Autenticação
- O navegador estabelece Firebase Auth anônimo para acesso ao RTDB.
- O login do portal usa cadastro próprio em `diversey_users` e comparação de `passwordHash` no cliente.
- O hash atual é SHA-256 determinístico com salt configurado no frontend e identificador do usuário; isso não substitui um provedor de autenticação confiável nem um password KDF moderno.
- A sessão do portal tem duração configurada de 30 dias (`Auth.SESSION_DURATION_MS`).
- O rate limiting atual é uma proteção de UX/client-side e não deve ser tratado como barreira suficiente contra um cliente malicioso.

### Autorização
- O frontend possui guards por perfil.
- O RTDB possui regras por coleção e sessão.
- Existe um **bloqueador crítico de confiança** entre a identidade Firebase anônima, a sessão do portal e o RBAC. A decisão de autorização precisa ser migrada para identidade/claims verificadas por um componente confiável antes de considerar o modelo seguro para produção.

### Dados e integridade
- Solicitações possuem trilha/timeline e vários fluxos usam gravações atômicas/controle de versão.
- Scripts administrativos de backup, restore, seed e importação possuem validações e testes automatizados na branch de hardening.
- O frontend é predominantemente client-side; não declarar cálculos ou validações como server-side sem evidência de backend efetivamente responsável por eles.

### Entrada e saída
- `Utils.escapeHtml` é utilizado em vários renderizadores para reduzir risco de XSS.
- Existem validadores para CPF, CNPJ, e-mail e nomes de arquivo.
- A presença desses helpers não prova que todos os sinks estejam protegidos; novos usos de `innerHTML` devem manter escaping explícito ou usar APIs de DOM seguras.

## Bloqueadores e riscos conhecidos

### Crítico — arquitetura de autenticação/RBAC
**Status: aberto / release blocker.**

A autorização atual depende de estado que não possui uma fronteira de confiança adequada. A correção segura exige migrar a autenticação para um verificador confiável (por exemplo Firebase Auth com identidade não-anônima e claims administradas fora do cliente, ou backend equivalente), migrar perfis e somente depois endurecer as regras do RTDB.

Não endurecer isoladamente as regras atuais sem plano de migração: o login existente depende do desenho client-side atual e uma alteração parcial pode indisponibilizar o sistema sem resolver a causa raiz.

### Alto — cadeia de dependências de desenvolvimento
Na execução de CI de 04/09/2026, `npm ci` reportou 32 vulnerabilidades conhecidas na árvore de desenvolvimento: 2 low, 11 moderate, 15 high e 4 critical. Como o deploy publica somente arquivos estáticos selecionados e não publica `node_modules`, isso é principalmente risco de supply chain/CI, mas deve ser tratado por atualização controlada de dependências e reexecução integral dos testes.

### Médio — dívida de lint
O lint histórico contém centenas de violações, majoritariamente de estilo/estrutura. O CI de hardening separa um gate bloqueante de defeitos críticos do relatório completo legado para impedir novas falhas relevantes sem mascarar a dívida existente.

## Controles automatizados observados

- Testes JavaScript abrangendo autenticação, autorização de interface, sincronização, solicitações, aprovações, fornecedores, relatórios, exportações, idempotência e arquitetura responsiva.
- Testes de segurança de configuração de produção e rate limiting.
- Privacy guard para evitar fallback de dados pessoais no frontend público.
- Testes Python para schema/hash do seed, importação transacional, sanitização de chaves, backup atômico e restore com validação.
- Lint crítico bloqueante para código JavaScript first-party; `js/vendor/**` é tratado como código de terceiro e não é reformatado pelo projeto.

## Requisitos para fechar o bloqueador crítico

- [ ] Escolher provedor de identidade confiável para usuários reais.
- [ ] Definir estratégia de migração/reset de credenciais existentes; hashes atuais não permitem recuperar senhas em texto claro.
- [ ] Vincular perfil/role a UID/claims administrados por processo confiável.
- [ ] Remover dependência de leitura client-side da coleção de credenciais para autenticar.
- [ ] Impedir que o cliente determine atributos de autorização privilegiados.
- [ ] Reescrever e testar regras do RTDB em emulador/staging antes de produção.
- [ ] Adicionar testes negativos de autorização e tentativa de escalada de privilégio.
- [ ] Reduzir duração de sessão conforme política corporativa e risco operacional.
- [ ] Invalidar sessões antigas durante a migração.

## Segurança de release

Uma release somente deve ser considerada candidata quando:
- testes JS e Python estiverem verdes;
- `npm run lint:critical` estiver verde;
- privacy guard estiver verde;
- dependency audit tiver sido revisado;
- regras Firebase tiverem evidência de teste no modelo de identidade adotado;
- o bloqueador crítico de autenticação/RBAC estiver encerrado para produção.

## Compliance / LGPD

Pendências de governança continuam fora do escopo do código atual e precisam de validação jurídica/processual:
- base legal e transparência do tratamento;
- retenção e descarte;
- direito de acesso/correção/eliminação quando aplicável;
- minimização de dados pessoais;
- resposta a incidente e registro de evidências.

---

**Última atualização:** 04/09/2026
