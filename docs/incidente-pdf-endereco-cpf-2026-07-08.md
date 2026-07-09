# Incidente — PDF sem endereço e CPF do solicitante (2026-07-08)

## Sintoma

Em alguns casos, o PDF da solicitação era gerado sem o endereço de entrega
e sem o CPF do solicitante ("Não informado" / "Endereço não informado"),
mesmo com o técnico corretamente cadastrado.

## Causa raiz (três fatores combinados)

1. **Escopo de leitura do portal do fornecedor.** As regras do Firebase
   (`firebase/database.rules.level2.json`) não permitem que o papel
   `fornecedor` leia `data/diversey_tecnicos`. No portal do fornecedor,
   `DataManager.getTechnicianById()` sempre retorna vazio e o PDF depende
   exclusivamente do snapshot gravado na própria solicitação
   (`tecnicoCpf`, `enderecoEntrega`, `bairro`, `cidade`, ...). Solicitações
   antigas — criadas antes do snapshot existir — não têm esses campos.
2. **Comparação estrita de id.** `getTechnicianById` usava `t.id === id`;
   registros legados com id numérico não eram encontrados quando o id
   chegava como string do formulário (e vice-versa), silenciosamente.
3. **Corrida assíncrona.** PDF gerado logo após o login, antes de o sync do
   Firebase popular o cache local de técnicos, também produzia lookup vazio
   para perfis privilegiados.

## Correções aplicadas

- `js/data.js` — `getTechnicianById` passou a normalizar os ids
  (`String(...).trim()`) antes de comparar.
- `js/data.js` — novo `applyTechnicianSnapshotBackfill(solicitation)`:
  preenche (sem sobrescrever) os campos de snapshot do técnico a partir do
  cadastro. Executado em `saveSolicitation` e em `updateSolicitationStatus`.
  Como aprovações rodam em sessões admin/gestor (que enxergam o cadastro),
  todo registro aprovado passa a carregar CPF/endereço embutidos — inclusive
  registros legados, que são reparados permanentemente na próxima transição
  de status.
- `js/utils.js` — `resolveSolicitationTechnicianDetails` aceita
  `requesterTecnicoId` como fallback de lookup e passou a expor `email` e
  `phone`; a ordem de resolução por campo segue: cadastro → snapshot.
- `js/utils.js` — `generatePDF` redesenhado (layout corporativo A4):
  bloco "Solicitante" (nome, CPF, e-mail, telefone), bloco "Endereço de
  entrega", dados operacionais, tabela de itens paginada, resumo financeiro,
  observações, assinaturas e rodapé com numeração de páginas. Dados ausentes
  são sinalizados em destaque ("Não informado") em vez de omitidos.
- `js/fornecedor.js` — modal de detalhes do fornecedor ganhou o cartão
  "Endereço de entrega" com CPF do solicitante (mesmo resolvedor do PDF).
- Cache: `service-worker.js` (`v38-pdf-corporativo`) e query strings de
  `js/utils.js`, `js/data.js` e `js/fornecedor.js` atualizados — sem isso o
  service worker continuaria servindo o código anterior.

## Regressão coberta por testes

`tests/pdf-solicitante-dados.test.js`:

- lookup com id numérico legado vs string;
- backfill preenche lacunas e não sobrescreve dados existentes;
- fallback por `requesterTecnicoId` + exposição de e-mail/telefone;
- PDF renderiza CPF/endereço a partir do snapshot com cadastro inacessível
  (cenário do portal do fornecedor);
- PDF sinaliza dados ausentes em vez de omitir.

## Operação

Solicitações legadas sem snapshot são reparadas automaticamente na próxima
gravação/transição de status feita por admin/gestor. Para reparo em massa
imediato, basta um admin abrir e salvar (ou aprovar) os registros pendentes;
não há migração destrutiva envolvida.
