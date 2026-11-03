# Migração do login — implementação e limites de ativação

Continuação do PR #121, integrado à main em 02/11/2026. Esta alteração prepara a migração; não publica o backend nem modifica o endpoint de produção.

## Fronteira implementada

- `portalIdentity/users/<uid>` é o registro privado, acessível somente ao Admin SDK. Nenhuma resposta contém hashes. Até o navegador administrador usa a API de usuários.
- Senhas SHA-256 antigas são verificadas exclusivamente no servidor e convertidas para scrypt com salt aleatório no primeiro login correto. Senhas novas/resetadas já usam scrypt. IDs e tipos de vínculos existentes são preservados.
- Claims assinadas incluem papel, identidade, vínculos, versão e uma sessão aleatória. Regras exigem a versão atual da identidade e concessão correspondente em `authz/sessions`. Desativação, exclusão, reset e troca de papel/vínculo invalidam tokens antigos. Edição de nome/e-mail preserva a versão.
- Logout remove a sessão específica, mesmo expirada; outra sessão legítima não é removida. Relogar cria outro ID e não ressuscita tokens antigos. Concessões duram uma hora, renováveis pelo backend dentro de uma sessão de até 12 horas.
- Cadastros de técnico/fornecedor e identidade são alterados atomicamente no backend. O último administrador ativo não pode ser removido/desativado. Duplicidades e vínculos ausentes são recusados.
- Fornecedor registra rastreio e técnico confirma recebimento por rotas que atualizam somente os campos permitidos. Técnico não pode assumir pedido alheio. Regras não aceitam sessões autodeclaradas pelo cliente.
- No modo servidor, bootstrap, restauração, senha e administração não usam contas padrão ou hashes no navegador. Falha no endpoint/SDK não reativa o login legado.
- WebAuthn confere desafio, origem, RP ID, assinatura e verificação do usuário. Desafios são de uso único inclusive sob concorrência. Reset revoga chaves anteriores e permite cadastrar uma nova no mesmo autenticador.

## Configuração isolada

`firebase.passkeys.json` seleciona a função Node 22 e as regras novas. O `firebase.json` padrão e o endpoint vazio permanecem como antes porque não existe inventário validado da produção. Não tratar um deploy padrão do repositório como implantação desta migração.

`functions/.env.demo-wwm-rules` destina-se exclusivamente ao projeto demonstrativo local. Em produção, definir `PASSKEY_RP_ID=welingtontavares15-hue.github.io` e `PASSKEY_ORIGIN=https://welingtontavares15-hue.github.io` (valores padrão da função); não copiar as variáveis localhost.

## Verificação reproduzível

Pré-requisitos locais: Node 22, Java 21, Chrome, dependências do repositório e de `functions/`. Em Windows o teste usa a instalação padrão do Chrome; `PORTAL_CHROME_PATH` permite informar outro caminho.

```sh
npm ci
npm ci --prefix functions
npm test -- --runInBand
npm run lint:critical
npm run test:python
node --test functions/test/*.test.js
node scripts/redact-technician-fallback.mjs --check
node scripts/build-passkey-rules.mjs --check
node scripts/check-passkey-rules.mjs
npx -y firebase-tools@latest emulators:exec --only auth,database,functions --project demo-wwm-rules --config firebase.passkeys.emulator.json "node --test --test-concurrency=1 functions/integration/*.test.js"
```

O teste integrado usa usuários sintéticos e autenticador CTAP2 virtual no Chrome, com verificação criptográfica real no backend. Cobre senha, migração, CRUD associado, papéis, isolamento operacional, assinatura inválida, replay/concorrência, reset/reinscrição, logout expirado e revogação RTDB. Não demonstra IAM, faturamento, operação cloud ou biometria em um aparelho físico.

## Dependências para ativar

1. Autenticar o Firebase CLI/plugin em uma conta com acesso a `diversey-solicitacoes-pwa`. Instalação do plugin não significa autenticação. Verificar IAM, billing, região, serviços e permissão de assinatura do Custom Token (signBlob).
2. Ler regras e versão atuais no projeto e manter backup privado. Inventariar usuários reais, papéis privilegiados, vínculos de técnicos/fornecedores e formatos dos cadastros. Confirmar legitimidade das contas privilegiadas: o cadastro legado podia ser alterado pelo cliente. Identificar senhas padrão/divulgadas e concluir recuperação antes de cadastrar chaves dessas contas.
3. O inventário não destrutivo está em `functions/migrate-identities.js`. Exige `PORTAL_PROJECT_ID=diversey-solicitacoes-pwa`, `PORTAL_DATABASE_URL` correto e credencial administrativa autorizada. Sem `--apply`, imprime perfis sem hashes e fingerprint da origem; não grava dados. O apply exige esse fingerprint e, fora do emulador, `PORTAL_ALLOW_LIVE_MIGRATION=true`. Recusa sobrescrever identidades existentes e cria backup privado na mesma transação em que remove hashes do nó antigo e apaga sessões legadas.
4. Homologar em ambiente cloud isolado com credenciais sintéticas, regras novas e a mesma origem/RP. Não usar preview de frontend como isolamento de banco. Inventário e homologação ainda não foram executados no projeto real.
5. Preparar a versão do frontend com `authMode: 'server'` e `passkeyEndpoint` retornado pelo deploy efetivo da função; atualizar versão do cache PWA e URLs dos ativos alterados. Coordenar regras, migração e frontend em janela validada; clientes com sessão legada precisarão autenticar novamente. Não há prova de transição sem interrupção enquanto a base real não for inventariada.
6. Verificar a implantação por leitura de regras/estado, endpoint HTTPS, login por senha de conta controlada, cadastro/entrada/saída com Passkey e negativas por perfil. Testar Android/iOS reais e recuperação. Somente então ativar e comunicar disponibilidade.

Não usar reversão que reabra hashes ou aceite permissões autodeclaradas. Se a publicação falhar após fechar a fronteira, manter os dados privados e corrigir a implantação com o backup protegido.
