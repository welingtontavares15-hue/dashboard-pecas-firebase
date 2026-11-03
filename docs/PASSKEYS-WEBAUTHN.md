# Login biométrico (Passkeys / WebAuthn)

## Status
Implementação proposta para homologação na branch feature/passkeys-webauthn-portal.
**Não habilitada na produção.** O login tradicional permanece disponível.
WebAuthn não fornece digitais ao site: o dispositivo usa digital, rosto ou PIN para liberar uma chave privada.

## Arquitetura
- `js/passkeys.js`: `navigator.credentials.create/get`; nenhum login é aceito apenas com resultado da API local.
- `functions/index.js`: registra desafio aleatório com expiração de cinco minutos, consome-o uma única vez por transação, confere RP ID/origem, assinatura, verificação de usuário e contador antes de emitir Firebase Custom Token.
- `passkeys/credentials` e `passkeys/userIndex`: credenciais públicas e índices, acessados **somente pelo Firebase Admin SDK**. Jamais liberar regras públicas/cliente para esses nós.
- Cadastro inicial: confirmação do usuário e senha existentes, verificados pelo backend contra o hash legado; depois criação da Passkey no dispositivo.
- Login: seleciona **Entrar com digital** sem informar nome ou senha, utiliza a Passkey descoberta pelo dispositivo e recebe token Firebase somente após verificação da assinatura no servidor.
- O backend exige o **domínio configurado em PASSKEY_ORIGIN**; RP ID deve ser o domínio correspondente.

## Bloqueadores antes do deploy
1. A coleção `data/diversey_users` ainda está legível para qualquer identidade Firebase anônima conforme regras versionadas. Os hashes SHA-256 do portal **não são adequados para autenticação de produção**. Migrar identidade/senhas para provedor ou backend seguro com hash adaptativo (Argon2id/scrypt), restringir leitura de credenciais, remover autenticação/autorizações sensíveis controladas pelo navegador e proteger RBAC nas regras.
2. `data/diversey_sessions` possui gravação controlada por `auth.uid` sem exigir claims confiáveis. Isso permite autoatribuição de papéis nas regras atuais: corrigir com claims server-side e testes de negação antes de habilitar Passkeys.
3. Não implementar fallback que marque usuário autenticado somente por `navigator.credentials`. Os custom tokens precisam estar vinculados ao perfil cadastrado e as regras do Firebase devem usar claims verificados.
4. Resolver armazenamento e política de revogação de Passkeys, recuperação de conta, bloqueio por IP/conta, rate limits duráveis e logs protegidos.
5. Executar testes de ponta a ponta em Firebase Emulator/homologação: cadastro, login, replay de desafio, usuário desativado, credentialId duplicado, origem incorreta, troca de papel, dois dispositivos e Android/iOS. Verificar versão e dependências com `npm install` e `npm run check` em `functions/`.

## Ativação condicionada (após resolver os bloqueadores)
1. Configurar um projeto Firebase separado de produção para homologação, Functions v2 Node 22, RTDB e domínio autorizado.
2. Definir `PASSKEY_RP_ID=welingtontavares15-hue.github.io` e `PASSKEY_ORIGIN=https://welingtontavares15-hue.github.io` na função. A origem é apenas o domínio, não inclui caminho do GitHub Pages.
3. Instalar dependências de `functions/`; adicionar seção `functions` em firebase.json, configurar build/deploy e publicar a função com autenticação por origem **mais controles de rate limit/proteção de identidade**.
4. Preencher `APP_CONFIG.passkeyEndpoint` com a URL HTTPS da Cloud Function publicada.
5. Verificar o fluxo em homologação e apenas então habilitar para produção.

**Não configurar passkeyEndpoint nem alterar main sem liberação de segurança.** O frontend oculta os botões quando o endpoint não está preenchido ou o dispositivo não oferece WebAuthn.

## Atualização de implementação (02/11/2026)
- A função de login solicita credenciais descobríveis (sem campo de usuário). O servidor identifica a conta a partir do ID de credencial registrado, não de um nome fornecido pelo navegador.
- Cadastro da credencial usa uma transação para impedir uso simultâneo do mesmo ID de Passkey por dois perfis.
- O token customizado inclui claims assinadas para ID, usuário, perfil e IDs operacionais. A interface confirma método passkey e identidade/role/username antes da sessão.
- O CI contém validação de sintaxe e testes unitários dos utilitários, mas **não** constitui teste E2E com Firebase implantado.
- A URL de backend permanece vazia de propósito. A integração com Firebase precisa de conta conectada e revisão da migração da arquitetura de permissões antes de ativação.

## Preparação adicional da migração (02/11/2026)
- Cloud Function passou a incluir login de recuperação via senha validada **no servidor** (rota `login/password`) e exige token Firebase emitido pelo servidor para iniciar e concluir cadastro de Passkeys.
- O fluxo de login por senha passa a usar o servidor quando `APP_CONFIG.passkeyEndpoint` estiver configurado; com endpoint vazio, mantém-se a versão legado no modo seguro de transição **não habilitado**.
- A emissão de custom token cria concessão curta em `authz/users/<uid>`; **as regras atuais ainda não confiam nessas concessões e precisam ser migradas e testadas antes de ativar o endpoint**.
- O registro de passkey exige autenticação de conta e revalidação da senha atual. Usuário desabilitado é recusado pelo backend.
- A instalação Firebase e autorização do projeto são dependências externas de uma conta conectada. Não ativar endpoint ou mesclar PR sem validação de regras RTDB e de endpoints no emulador e no Firebase real.

## Regras de autorização preparadas
- Criado `firebase/database.rules.passkeys.json` **isolado**, sem alterar `firebase.json` ou as regras legadas de produção.
- O modelo passa a negar sessões gravadas pelo cliente, exige grants em `authz/users/{uid}` e claims verificadas nos tokens do Firebase para operações de RTDB.
- Nós de autenticação e Passkeys ficam inacessíveis a clientes; coleção de usuários fica restrita a administradores autenticados.
- CI executa `node scripts/check-passkey-rules.mjs` para validações estruturais; **não substitui teste real de regras no Firebase Emulator com cenário negativo**.
- **Bloqueio operacional:** o frontend ainda depende de leitura de usuários e rotinas de sessão legadas; implantar essas regras sem migração completa quebraria o acesso. Há necessidade de realizar migração de frontend, testes negativos, homologação e autorização do projeto Firebase. Não publicar esse arquivo diretamente.
