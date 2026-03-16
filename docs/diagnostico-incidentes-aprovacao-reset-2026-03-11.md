# Diagnóstico Técnico - Aprovação do Gestor e Reset com Falha de E-mail

Data da análise: 11/03/2026

## 1. Escopo real do sistema

O repositório analisado não possui back-end tradicional com `controllers`, `services`, `middlewares`, `endpoints REST` ou fila SMTP própria.

Arquitetura efetiva encontrada:

- Front-end estático em `HTML/CSS/JS`.
- Autenticação técnica do cliente com Firebase Auth anônimo.
- Autorização e persistência principal em Firebase Realtime Database.
- Regras de acesso centralizadas em `firebase/database.rules.level2.json`.
- Envio de e-mail operacional via chamada HTTP client-side para `FormSubmit`.
- Backup opcional via OneDrive.

Conclusão importante: os dois incidentes não estavam em um servidor Node/SMTP interno inexistente no repositório. O "back-end" relevante aqui é a combinação de regras do Firebase, persistência em nuvem e integração externa FormSubmit.

## 2. Evidências e limitações da análise

- O código-fonte foi analisado integralmente nas áreas de autenticação, solicitações, aprovação, storage em nuvem, regras Firebase e envio de e-mail.
- O workspace não contém logs operacionais persistidos do incidente real do usuário. Há instrumentação de log em código, mas não havia artefato local que permitisse reproduzir o erro histórico exato já ocorrido em produção.
- Por isso, a análise de causa raiz foi feita sobre o fluxo real implementado, os contratos entre front-end e Firebase, e o comportamento previsto do provedor externo de e-mail.

## 3. Incidente 1 - Gestor não consegue aprovar solicitações

### Erro identificado

O fluxo de aprovação do gestor em `js/aprovacoes.js` enviava para `DataManager.updateSolicitationStatus()` um payload com:

- `status = aprovada`
- `fornecedorId`
- itens editados
- `subtotal`, `desconto`, `frete`, `total`
- comentário e metadados de aprovação

As regras do Firebase em `firebase/database.rules.level2.json` bloqueavam essa escrita.

### Causa raiz

Foram encontradas duas causas técnicas simultâneas:

1. Divergência entre o payload gravado e a regra exigida

As regras exigiam:

```js
newData.child('aprovacao/status').val() == newData.child('status').val()
```

Mas `DataManager.updateSolicitationStatus()` não preenchia `solicitation.aprovacao.status`.

2. Regras congelavam os valores que a UI precisa alterar na aprovação

As regras exigiam igualdade total entre valores antigos e novos para:

- `itens`
- `subtotal`
- `frete`
- `desconto`
- `total`

Porém a modal de aprovação em `js/aprovacoes.js` recalcula exatamente esses campos antes de aprovar. Ou seja: a interface permitia ajuste, mas o Firebase negava a persistência.

### Impacto no sistema

- Gestor ficava impedido de aprovar ou rejeitar em cenários legítimos.
- Aprovações com ajuste de quantidades, desconto, frete ou total eram rejeitadas pela regra.
- O erro chegava ao usuário como falha genérica de persistência, sem indicar claramente que era `permission denied`.
- Fluxos dependentes da aprovação não eram disparados de forma consistente:
  - PDF automático
  - notificação ao técnico
  - notificação ao fornecedor
  - backup OneDrive subsequente

### Correções implementadas

1. Alinhamento do payload de aprovação no `DataManager`

Arquivo: `js/data.js`

- Passou a preencher `solicitation.aprovacao`.
- Passou a registrar `approvedAt`, `approvedBy`, `rejectedAt`, `rejectedBy` e `rejectionReason`.
- Mantém trilha legada em `approvals[]`.
- Mantém itens e totais editados pela modal.

Trecho ajustado:

```js
solicitation.aprovacao = {
    ...(solicitation.aprovacao || {}),
    status: nextStatus,
    at: decisionAt,
    by: decisionBy,
    updatedAt: now,
    comment: decisionComment,
    approvedAt: nextStatus === this.STATUS.APROVADA ? decisionAt : null,
    approvedBy: nextStatus === this.STATUS.APROVADA ? (payload.approvedBy || decisionBy) : null,
    rejectedAt: nextStatus === this.STATUS.REJEITADA ? decisionAt : null,
    rejectedBy: nextStatus === this.STATUS.REJEITADA ? (payload.rejectedBy || decisionBy) : null,
    rejectionReason: nextStatus === this.STATUS.REJEITADA ? (payload.rejectionReason || null) : null
};
```

2. Correção das regras do Firebase

Arquivo: `firebase/database.rules.level2.json`

- Removida a exigência de igualdade para `itens`, `subtotal`, `frete`, `desconto` e `total`.
- Mantidas invariantes corretas para `tecnicoId`, `numero` e `createdAt`.
- Mantida exigência de transição apenas a partir de estados pendentes.
- Exigido `fornecedorId` válido para aprovação.
- Mantido `aprovacao/status` compatível com `status`.

Trecho ajustado:

```js
(data.child('status').val() == 'pendente' || data.child('status').val() == 'enviada' || data.child('status').val() == 'criado' || data.child('status').val() == 'criada' || data.child('status').val() == 'pendente_aprovacao') &&
(((newData.child('status').val() == 'aprovada') && newData.child('aprovacao/status').val() == 'aprovada' && newData.child('fornecedorId').isString() && newData.child('fornecedorId').val() != '') ||
((newData.child('status').val() == 'rejeitada') && newData.child('aprovacao/status').val() == 'rejeitada'))
```

3. Diagnóstico melhorado para falhas de escrita

Arquivos: `js/storage.js`, `js/data.js`

- O `CloudStorage` agora preserva o último erro de persistência.
- O `DataManager` traduz falhas de escrita em mensagens específicas para:
  - `permission_denied`
  - indisponibilidade de nuvem
  - falha genérica de persistência

## 4. Incidente 2 - Reset com erro de servidor dizendo que o e-mail não foi enviado

### Erro identificado

O reset de senha do gestor concluía a alteração da senha, mas o envio automático do e-mail falhava ou não recebia confirmação do provedor.

O fluxo estava em:

- `js/app.js` -> `handleResetGestorPassword`
- `js/data.js` -> `resetUserPasswordById`
- `js/utils.js` -> `sendPasswordResetEmail` / `sendOperationalEmail`

### Causa raiz

Foram encontradas múltiplas causas:

1. Não existe SMTP/queue/back-end de e-mail no sistema

O envio é feito do navegador para `FormSubmit` via HTTP:

```js
const endpoint = `https://formsubmit.co/ajax/${encodeURIComponent(deliveryTarget.endpointRecipient)}`;
```

Ou seja, o problema não está em credenciais SMTP internas porque o projeto não usa SMTP nativo.

2. A instrumentação antiga era insuficiente

Antes da correção:

- o método retornava apenas `true` ou `false`
- não expunha `statusCode`
- não expunha resposta do provedor
- não distinguia:
  - timeout
  - offline
  - HTTP 422
  - HTTP 429
  - recusa explícita do provedor
  - exceção de rede

3. O front-end registrava o evento como `info` mesmo quando o envio falhava

Isso dificultava correlação operacional do incidente.

4. Há dependência externa obrigatória do FormSubmit

Se o formulário não estiver ativado, houver limitação, indisponibilidade, timeout, rejeição da requisição ou restrição do endpoint, o reset fica sem confirmação de e-mail.

5. Há um risco adicional de configuração

Existe fallback de gateway em `js/utils.js` baseado em um destinatário operacional. Isso é útil como contingência, mas é também uma dependência externa que precisa estar válida para funcionar.

### Impacto no sistema

- Administrador recebe retorno incompleto sobre a falha.
- Senha pode ser redefinida com sucesso sem confirmação de entrega do e-mail.
- Diagnóstico operacional fica pobre para suporte e homologação.
- A equipe pode investigar SMTP/servidor sem necessidade, porque o envio real depende de FormSubmit.

### Correções implementadas

1. Resultado detalhado do envio operacional

Arquivo: `js/utils.js`

Foram criados:

- `sendPasswordResetEmailDetailed()`
- `sendOperationalEmailDetailed()`
- `createOperationalEmailResult()`
- `getOperationalEmailFailureMessage()`

Agora o fluxo retorna:

- `success`
- `reason`
- `statusCode`
- `providerMessage`
- `deliveryMode`
- `gatewayRecipient`
- `error`

Razões tratadas:

- `invalid_payload`
- `offline`
- `fetch_unavailable`
- `timeout`
- `connection_error`
- `provider_negative_ack`
- `http_422`
- `http_429`
- `http_<status>`

2. Logging correto por severidade

Arquivo: `js/app.js`

- sucesso continua em `Logger.info`
- falha passou a ser registrada em `Logger.warn`
- agora inclui `statusCode`, `providerMessage`, `deliveryReason` e `error`

3. Mensagem operacional mais precisa para o usuário

Arquivo: `js/app.js`

Em vez de aviso genérico, o front agora informa a razão técnica resumida:

- dispositivo offline
- timeout do provedor
- provedor recusou requisição
- limite temporário
- erro HTTP específico

4. Correção sistêmica nas telas equivalentes

Arquivos: `js/fornecedores.js`, `js/tecnicos.js`

Os fluxos de reset de fornecedor e técnico tinham a mesma deficiência estrutural de diagnóstico. Foram ajustados com a mesma abordagem para evitar reincidência do problema em outros perfis.

## 5. Arquivos alterados

- `firebase/database.rules.level2.json`
- `js/app.js`
- `js/data.js`
- `js/storage.js`
- `js/utils.js`
- `js/fornecedores.js`
- `js/tecnicos.js`
- `tests/incident-regressions.test.js`

## 6. Testes automatizados adicionados

Arquivo: `tests/incident-regressions.test.js`

Coberturas incluídas:

1. Aprovação do gestor persiste:

- `status = aprovada`
- `aprovacao.status = aprovada`
- itens/totais editados
- trilha `approvals[]`

2. Aprovação bloqueada por regra do Firebase retorna erro específico:

- `permission_denied`
- mensagem orientando publicação das regras

3. Reset de senha bloqueado por regra do Firebase retorna erro específico:

- `permission_denied`
- mensagem orientando publicação das regras

4. Envio de e-mail retorna diagnóstico detalhado para `HTTP 422`.

5. Timeout do provedor é classificado corretamente e o wrapper booleano continua compatível.

## 7. Testes recomendados em homologação

### Aprovação do gestor

1. Publicar as regras:

```bash
npm run firebase:rules:deploy
```

2. Logar como gestor.
3. Aprovar solicitação pendente sem editar itens.
4. Aprovar solicitação pendente editando:
   - quantidade
   - subtotal
   - desconto
   - frete
   - total
5. Confirmar no Realtime Database:
   - `status = aprovada`
   - `aprovacao.status = aprovada`
   - `fornecedorId` preenchido
   - itens e totais persistidos
6. Validar disparos pós-aprovação:
   - PDF gerado
   - e-mail para técnico
   - e-mail para fornecedor

### Reset de senha

1. Resetar senha de gestor com e-mail válido.
2. Confirmar:
   - senha atualizada no banco
   - log `password_reset_applied`
   - log `password_reset_email_status`
3. Simular falhas:
   - navegador offline
   - endpoint rejeitado
   - timeout do FormSubmit
4. Verificar se a UI informa a razão correta.
5. Validar abertura do modal de contingência com credenciais quando o e-mail falhar.

## 8. Validação recomendada em produção

- Publicar as regras do Firebase antes da janela operacional.
- Validar se o formulário do FormSubmit está ativado e aceitando chamadas do ambiente atual.
- Confirmar se o destinatário operacional/gateway configurado continua válido.
- Monitorar logs para:
  - `password_reset_email_status`
  - `password_reset_cloud_save_failed`
  - erros de `permission_denied`
- Executar um teste controlado de reset após publicação.

## 9. Dependências externas que impactam diretamente os incidentes

- Firebase Realtime Database Rules
- Sessão válida em `diversey_sessions`
- FormSubmit
- Conectividade do navegador até o provedor
- Gateway operacional de e-mail configurado

## 10. Pendências operacionais após o ajuste

As correções de código não publicam automaticamente a regra do Firebase em produção. Para o incidente 1 deixar de ocorrer no ambiente real, é obrigatório publicar a regra corrigida.

Comando:

```bash
npm run firebase:rules:deploy
```

Sem essa publicação, o front-end continuará correto, mas o Firebase seguirá bloqueando aprovações conforme a regra antiga já implantada.
