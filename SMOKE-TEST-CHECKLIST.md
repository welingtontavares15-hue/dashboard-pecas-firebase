# Smoke Test Checklist - Dashboard de Peças

Este documento define os testes de fumaça (smoke tests) obrigatórios que devem ser executados antes de qualquer deploy para produção.

**Regra:** Se um teste falhar, o deploy NÃO pode prosseguir.

## Pré-requisitos

- [ ] Todos os testes automatizados passaram (`npm test`)
- [ ] Linting passou sem erros (`npm run lint:check`)
- [ ] Cache version atualizado em `service-worker.js`
- [ ] Build verificado em ambiente de staging

---

## 1. Login Flows (Autenticação)

### 1.1 Login Administrador
- [ ] Acessar a tela de login
- [ ] Inserir credenciais de administrador
- [ ] Verificar redirecionamento para Dashboard
- [ ] Verificar menu completo disponível (todas as opções)
- [ ] Verificar badge de aprovações pendentes

**Evidência:** Screenshot da tela após login

### 1.2 Login Gestor
- [ ] Acessar a tela de login
- [ ] Inserir credenciais de gestor
- [ ] Verificar redirecionamento para Dashboard
- [ ] Verificar menu com opções de gestor (sem Configurações editáveis)
- [ ] Verificar acesso a Aprovações

**Evidência:** Screenshot da tela após login

### 1.3 Login Técnico
- [ ] Acessar a tela de login
- [ ] Inserir credenciais de técnico
- [ ] Verificar redirecionamento para "Minhas Solicitações"
- [ ] Verificar menu reduzido (Nova Solicitação, Minhas Solicitações, Catálogo)

**Evidência:** Screenshot da tela após login

### 1.4 Rate Limiting
- [ ] Tentar login com senha incorreta 5 vezes
- [ ] Verificar bloqueio temporário (mensagem de erro)
- [ ] Aguardar tempo de bloqueio expirar
- [ ] Verificar que login funciona novamente

**Evidência:** Screenshot da mensagem de bloqueio

---

## 2. Fluxo de Solicitação

### 2.1 Criar Solicitação (Rascunho)
- [ ] Logado como técnico
- [ ] Clicar em "Nova Solicitação"
- [ ] Adicionar itens do catálogo
- [ ] Salvar como rascunho
- [ ] Verificar que rascunho aparece em "Minhas Solicitações"

**Evidência:** Screenshot do rascunho salvo

### 2.2 Enviar Solicitação
- [ ] Abrir rascunho
- [ ] Completar dados obrigatórios
- [ ] Clicar em "Enviar"
- [ ] Verificar status alterado para "Pendente"
- [ ] Verificar número sequencial gerado

**Evidência:** Screenshot da solicitação enviada

---

## 3. Fluxo de Aprovação

### 3.1 Aprovar Solicitação
- [ ] Logado como gestor/admin
- [ ] Acessar "Aprovações"
- [ ] Selecionar solicitação pendente
- [ ] Adicionar comentário
- [ ] Aprovar solicitação
- [ ] Verificar status alterado para "Aprovada"
- [ ] Verificar PDF gerado automaticamente

**Evidência:** Screenshot da aprovação + PDF

### 3.2 Rejeitar Solicitação
- [ ] Logado como gestor/admin
- [ ] Acessar "Aprovações"
- [ ] Selecionar solicitação pendente
- [ ] Adicionar motivo da rejeição
- [ ] Rejeitar solicitação
- [ ] Verificar status alterado para "Rejeitada"
- [ ] Verificar que técnico pode ver motivo

**Evidência:** Screenshot da rejeição

---

## 4. Status Changes (se aplicável)

### 4.1 Fluxo Completo
- [ ] Status: pendente → aprovada
- [ ] Status: aprovada → em-transito
- [ ] Status: em-transito → entregue
- [ ] Status: entregue → finalizada
- [ ] Verificar timeline com todas as mudanças

**Evidência:** Screenshot da timeline completa

---

## 5. Modo Offline

### 5.1 Criar Rascunho Offline
- [ ] Desconectar da internet (modo avião/desligar WiFi)
- [ ] Criar nova solicitação como rascunho
- [ ] Verificar que dados são salvos localmente
- [ ] Reconectar à internet
- [ ] Verificar sincronização automática

**Evidência:** Screenshot do rascunho offline + sync

### 5.2 Cache do Service Worker
- [ ] Carregar aplicação com internet
- [ ] Desconectar da internet
- [ ] Recarregar a página
- [ ] Verificar que aplicação carrega (offline.html se necessário)

**Evidência:** Screenshot da tela offline

---

## 6. Relatórios/KPIs

### 6.1 Dashboard
- [ ] Logado como admin/gestor
- [ ] Acessar Dashboard
- [ ] Verificar que KPIs carregam sem erros
- [ ] Verificar que gráficos renderizam
- [ ] Verificar "Top Técnicos" mostra apenas aprovados

**Evidência:** Screenshot do Dashboard

### 6.2 Relatórios
- [ ] Acessar módulo de Relatórios
- [ ] Aplicar filtros
- [ ] Verificar que dados carregam corretamente
- [ ] Exportar relatório

**Evidência:** Screenshot do relatório filtrado

---

## 7. Exportação (Cloud-First)

### 7.1 PDF
- [ ] Gerar PDF de solicitação
- [ ] Verificar download do arquivo
- [ ] Verificar log de exportação (export log)

**Evidência:** PDF gerado + log

### 7.2 Excel/XLSX
- [ ] Exportar lista para Excel
- [ ] Verificar download do arquivo
- [ ] Abrir arquivo e validar conteúdo

**Evidência:** Excel gerado

### 7.3 CSV
- [ ] Exportar dados para CSV
- [ ] Verificar download do arquivo
- [ ] Verificar encoding UTF-8

**Evidência:** CSV gerado

---

## 8. Limpeza de Cache (Plan B)

### 8.1 Clear Cache Page
- [ ] Acessar `/clear-cache.html`
- [ ] Clicar em "Limpar Cache e Dados Locais"
- [ ] Verificar mensagem de sucesso
- [ ] Verificar redirecionamento para login

**Evidência:** Screenshot da página clear-cache

---

## Resultado Final

| Categoria | Status | Observações |
|-----------|--------|-------------|
| Login Flows | ⬜ Pass / ⬜ Fail | |
| Solicitação | ⬜ Pass / ⬜ Fail | |
| Aprovação | ⬜ Pass / ⬜ Fail | |
| Status Changes | ⬜ Pass / ⬜ Fail | |
| Modo Offline | ⬜ Pass / ⬜ Fail | |
| Relatórios/KPIs | ⬜ Pass / ⬜ Fail | |
| Exportação | ⬜ Pass / ⬜ Fail | |
| Clear Cache | ⬜ Pass / ⬜ Fail | |

**Aprovado para Deploy:** ⬜ Sim / ⬜ Não

**Executor:** _______________

**Data:** _______________

**Ambiente:** ⬜ Staging / ⬜ Production

---

## Anexos

Adicionar screenshots e logs como evidência de cada teste realizado.

---

**Versão do documento:** 1.0  
**Última atualização:** Dezembro 2024
