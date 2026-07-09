# Redesign visual — Clean UI (2026-07-09)

## Objetivo

Interface mais limpa, moderna e objetiva, com hierarquia visual clara,
espaçamento consistente, cores padronizadas e menos ruído — mantendo os
fluxos e a lógica de negócio intactos.

## O que mudou

### Nova camada `css/clean-ui.css` (carregada por último)

Sistema visual único baseado em tokens (`--cui-*`), com tema escuro por
redefinição de tokens:

- **Tipografia**: Manrope em toda a aplicação (a base anterior declarava
  `Roboto`, que nem era carregada), base 14px, escala consistente
  (título de página 21px/800, título de card 14px/800, rótulos 10.5px
  maiúsculos, valores de KPI 21px/800 com números tabulares).
- **Paleta**: azul corporativo `#0b5cab` como cor primária única de ação,
  neutros slate, cores de status suaves (soft backgrounds) para badges.
- **Superfícies**: cards brancos, borda `#e3e9f1`, raio 12px, sombra única
  e sutil (sem gradientes e barras decorativas das camadas anteriores).
- **KPIs**: cartões compactos horizontais (ícone à esquerda, rótulo
  maiúsculo, valor forte) em grade responsiva.
- **Filtros padronizados**: um único padrão para todas as telas — cartão
  branco, rótulos maiúsculos acima dos controles, altura de controle 36px,
  foco com anel azul.
- **Tabelas**: cabeçalho 10.5px maiúsculo sobre fundo neutro, linhas de
  42px, hover suave, sem zebra (menos ruído).
- **Sidebar**: fundo escuro chapado, grupos maiúsculos, item ativo com
  trilho azul à esquerda; **header**: branco com borda inferior, busca em
  pílula, status de sincronização como ponto colorido discreto.
- **Login**: fundo em gradiente navy com radial sutil, cartão 16px de raio.

### Ruído removido

- Sino duplicado no header (`#pending-badge`) — a notificação oficial é o
  painel de notificações; o menu lateral segue mostrando o contador de
  aprovações pendentes.
- Pílula de contexto ("GESTÃO OPERACIONAL") e botão de densidade do
  corporate-platform — chrome decorativo sem função clara.
- Chip "Ctrl K" dentro da busca global (o atalho continua funcionando).
- Texto técnico "Para exportar, certifique-se de que a biblioteca XLSX…"
  na tela de Solicitações.
- "Filtro rápido da tabela" era injetado em TODA tabela, inclusive nos
  rankings Top 5 (5 linhas); agora só aparece em tabelas com 8+ linhas.
- Dashboard: filtros de Estado e Cliente removidos (análises detalhadas
  vivem em Relatórios); o 5º KPI "Técnico com maior custo" (que duplicava
  a primeira linha do ranking ao lado) virou "Solicitações abertas".
- `dashboard-modern.js`: código morto removido (resumo executivo e fluxo
  visual não renderizados).
- Kickers do corporate-platform corrigidos com acentuação apropriada
  ("Inteligência operacional", "Controle de aprovação"…).

### Padronização de botões

`.btn-success` passou a renderizar como a ação primária azul — um único
acento de cor para CTAs em todo o sistema; vermelho permanece reservado
para ações destrutivas.

## Cache

- `service-worker.js`: `CACHE_VERSION` → `v40-clean-ui`; `clean-ui.css`
  adicionado ao precache.
- Query strings atualizadas (`?v=20260709b`) em `index.html`, wrappers
  lazy (`js/pages/*.js`) e `js/app.js` para os módulos alterados.

## Compatibilidade

Nenhuma mudança de lógica de negócio, permissões ou dados. Os testes
existentes (24 suítes) continuam passando; lint limpo.
