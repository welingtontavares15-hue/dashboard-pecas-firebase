# Digital neste navegador

Este modo usa WebAuthn/PRF para liberar uma senha criptografada no navegador e a envia ao fluxo de autenticação já existente do portal. Não emite sessão apenas porque `navigator.credentials.get()` terminou. Não muda plano, regras, usuários ou configurações do Firebase e não substitui a migração de segurança do backend descrita nos documentos de Passkeys.

## Uso

1. Sem cadastro local, preencha usuário e senha na tela de acesso e selecione **Entrar e ativar digital**. Também é possível ativar em **Meu Perfil**, disponível para todos os papéis. O login comum, sozinho, não cria uma chave.
2. O sistema cria uma chave de acesso do próprio aparelho e pede confirmação para obter o segredo de criptografia. Pode solicitar duas confirmações durante a ativação. O sucesso só é mostrado após salvar, reler e descriptografar o registro local; o resultado fica visível no perfil.
3. Nos acessos seguintes, o botão circular **Entrar com digital** solicita verificação no aparelho, recupera a senha em memória e chama `Auth.login`. Senha inválida, conta desativada ou vínculo de identidade divergente não recebem acesso por esse caminho.
4. Se trocar a senha, limpar os dados do site ou trocar de navegador, entre com senha e ative novamente. **Remover digital deste navegador** apaga somente o vínculo criptografado local; não elimina a chave da lista de Passkeys do provedor.

O site não lê a impressão digital nem controla o desenho do diálogo do Android. A biometria é realizada pelo sensor do aparelho. O sistema pode oferecer o PIN ou mostrar uma seleção de chave de acesso antes da confirmação. O site pode exigir verificação do usuário, mas não escolher exclusivamente a impressão digital entre os métodos aceitos pelo sistema.

## Proteção e limites

- Cadastro exige sessão existente e revalidação da senha pelo fluxo normal. O registro local só é substituído após concluir as confirmações nativas e a criptografia.
- Criação da chave pede autenticador `platform`, chave residente e `userVerification: required`. Desbloqueio usa credencial específica com transporte interno, requer verificação e rejeita retorno explicitamente identificado como autenticador externo. O campo de attachment pode ser nulo conforme WebAuthn; o código exige o resultado PRF de 32 bytes mesmo quando metadados opcionais são omitidos.
- O segredo da extensão PRF passa por HKDF/SHA-256 com propósito e origem associados. A chave AES-GCM de 256 bits é não exportável. IV de 96 bits e salts são aleatórios. O registro criptografado é autenticado com a origem, RP ID, versão e ID da credencial.
- O código valida tipo, desafio novo, origem, RP ID, presença e verificação do usuário antes de usar o resultado PRF. O registro contém somente metadados públicos e ciphertext; não contém senha em texto, segredo PRF ou chave de criptografia.
- Não existe fallback criptográfico se PRF faltar. O login comum continua disponível. O registro fica em um IndexedDB separado dos dados operacionais.
- Este é um desbloqueio local de credencial, não autenticação Passkey verificada por servidor. A autorização final conserva as propriedades e os limites do login atual. Não protege contra código malicioso executado na própria origem enquanto a senha estiver sendo utilizada. O domínio GitHub Pages é a fronteira de origem, compartilhada com outros caminhos desse mesmo domínio.
- Suporte depende do navegador, sistema operacional e provedor. O Chrome com Google Password Manager em Android é um ambiente documentado com PRF; a função recusa ativação quando o recurso não é retornado. Não tratar teste virtual como prova de funcionamento em um celular físico.

## Verificação

`node --test functions/test/device-biometric.test.js` verifica criptografia real, novo desafio, cancelamento, origem/ciphertext adulterados, segredo incorreto, falta de PRF e ausência de verificação do usuário.

`npm run test:device-biometric` usa Chrome, IndexedDB real e um autenticador CTAP2 virtual com PRF. Exercita senha inválida antes de cadastrar, cadastro, persistência após recarga, liberação da senha, recusa do acesso quando o login normal falha, acesso após login válido, adulteração do ciphertext e remoção local. Opera exclusivamente com dados sintéticos em localhost, sem Firebase.

Fontes primárias:

- https://developers.yubico.com/WebAuthn/Concepts/PRF_Extension/Developers_Guide_to_PRF.html
- https://www.w3.org/TR/webauthn-3/
- https://developers.google.com/identity/passkeys/supported-environments
