Painel de Solicitação de Peças — Revisão + Implantação ponta a ponta
Objetivo

Padronizar e consolidar o Painel de Solicitação de Peças como um sistema web/PWA offline-first, com rastreabilidade completa, RBAC real, modelo de dados consistente, sequencial imutável, cálculos e totais server-side, sync confiável, KPIs materializados, relatórios consistentes e pipeline de qualidade (CI/CD + testes).

Entrega final obrigatória: tudo funcionando em desktop e mobile, testado, documentado e com governança (logs/auditoria).

Escopo do sistema (o que precisa existir e ficar redondo)
Módulos

Dashboard gerencial (KPIs + lista de recentes + ações rápidas)

Solicitações (criar, editar rascunho, enviar, acompanhar status)

Aprovações (aprovar/rejeitar com comentários + SLA)

Catálogo de Peças (busca, filtro, grande volume)

Técnicos/Usuários (cadastro, região, status ativo/inativo)

Fornecedores (cadastro, CNPJ, contatos, vínculo com solicitações quando aplicável)

Relatórios (SLA, solicitações, performance técnico, ranking peças, exportações)

Offline + sincronização (IndexedDB + fila + retry)

PDF / Excel / CSV (exportação consistente)

Auditoria e trilhas (tudo que muda fica registrado)

1) Arquitetura base (Core)

Implementar/ajustar PWA completo:

Service Worker com cache inteligente por módulo (Dashboard, Solicitações, Catálogo)

atualização controlada (versionamento + estratégia segura de refresh)

offline-first de verdade (app utilizável sem internet, inclusive consulta e rascunho).

Substituir localStorage por IndexedDB (Dexie/idb):

tabelas e índices: requests, parts, users, suppliers, reports, queue

camada de repositório com estratégia offline → online (sincroniza quando tiver rede).

Backend via Firebase:

Preferência: Firestore + Cloud Functions

Alternativa aceita: RTDB + Functions
Obrigatório ter no backend:

validações server-side (regras e funções)

auditoria e trilhas de eventos (timeline/approvals)

geração de sequencial transacional

pontos de integração pluggáveis (webhooks/API) para fornecedor/OneDrive etc.

RBAC em camadas obrigatório:

claims no token

rules no banco (Firestore/RTDB rules)

guards no front (rotas e componentes)
Regra de ouro: nada de “bloquear só no front”.

2) Modelo de dados (Collections e relacionamento) — padrão oficial

Padronizar e congelar (evitar “cada tela cria um formato”).

2.1 requests (Solicitações)

id: REQ-YYYYMMDD-#### imutável

status: draft | pending | approved | rejected | in_transit | delivered | finalized

audit: audit.version, lastUpdatedBy, lastUpdatedAt

trilhas obrigatórias:

approvals[] (decisão, usuário, data, comentário)

timeline[] (eventos de status/ações)

totalização:

totals.amount (sempre do backend)

itemsCount

currency

índices: status, createdAt, createdBy.userId, supplier.supplierId, region

2.2 parts (Peças)

code, description, category, unitPrice, status

uom, minStock

garantir performance para grande volume:

busca rápida por code e por texto (onde aplicável)

paginação e filtros.

2.3 users (Admin/Gestor/Técnico/Fornecedor)

role define permissões

region define escopo

claims com permissões e limite de orçamento (quando aplicável)

status: ativo/inativo

2.4 suppliers (Fornecedores)

cnpj, contacts[], status

vinculação opcional com requests quando aplicável

2.5 reports (KPIs materializados)

KPIs pré-calculados (não calcular pesado no client)

Top técnicos: somente requests aprovadas

rejeitadas não entram no ranking

3) Sequenciais e consistência (regras inegociáveis)

REQ-YYYYMMDD-#### gerado em Cloud Function transacional:

contador diário

sem duplicidade, mesmo com concorrência.

Optimistic concurrency:

atualizar somente se audit.version bater

se divergir, bloquear update e retornar “conflito”.

Totais server-side:

backend calcula e grava totals.amount

front nunca grava total “calculado local”.

4) Segurança e compliance

Login via OAuth2/OIDC (Entra ID ou Google). MFA opcional (gestor/admin).

Regras por perfil (aplicar em rules + backend + front):

Técnico: cria/lê as próprias; não muda status após pending

Gestor: aprova/rejeita apenas no escopo (região/unidade)

Admin: acesso amplo; ações críticas com 2 confirmações.

Privacidade e logs:

TLS + criptografia at-rest

mascarar CNPJ onde não for necessário completo

logs sem dados sensíveis

Proteções:

rate limit

bloqueio progressivo após falhas.

Backup/recuperação:

incremental diário + snapshot semanal

restauração testada em staging antes de produção.

5) Offline, Sync e performance
5.1 Offline-first real

cache seletivo por módulo

queue de deltas offline (create/update/attach)

sync com retry exponencial + retomada

conflitos:

last-write-wins com alerta apenas para campos “não críticos”

status/totais: servidor prevalece sempre

5.2 Performance e escalabilidade

paginação por cursor

índices revisados

lazy load (Chart.js, jsPDF, XLSX)

KPIs via reports com job agendado (Scheduler/Function)

6) Workflow e UX (sem quebrar regra)
Solicitações (Técnico)

fluxo guiado: Itens → Revisão → Envio

validação inline

autocomplete de peça + histórico de preço + alerta de orçamento

anexos (foto/OS/NF) em storage, referenciado no request

Aprovações (Gestor)

matriz por valor/categoria/região (ex.: até R$ 1.000 local; acima regional)

SLA visível (tempo + lembretes)

aprovação com contexto (histórico, recorrência, orçamento)

Dashboard

KPIs clicáveis (abre lista filtrada)

filtros salvos e compartilháveis

ações rápidas com confirmação + comentário obrigatório

7) Relatórios e analytics

consistência total de filtros entre telas e exportações

exportação XLSX/CSV confiável (encoding/separador)

relatórios: SLA, retrabalho (rejeições), ranking por peça/região

top técnicos: somente aprovadas

alertas de anomalia

agendamento semanal PDF/XLS + log de entrega/falha

8) DevOps e qualidade

dev/staging/prod isolados

CI/CD: unit + integração + e2e (Cypress/Playwright), lint, type-check

TypeScript onde fizer sentido (começar por módulos críticos)

feature flags + rollback

observabilidade: logs estruturados com correlação por request.id

documentação viva + playbooks e tutoriais curtos

9) Entregáveis obrigatórios (sem conversa)

Sistema funcionando: PWA + offline + sync + RBAC + sequencial + totais server-side

Rules do Firebase fechadas e testadas

Cloud Functions: sequencial, totais, materialização de KPIs, jobs agendados

Testes unit + e2e dos fluxos críticos:

criar request, enviar, aprovar, rejeitar, offline, sync, conflito

Documentação final:

modelo de dados, permissões, workflow, deploy, rollback, backup/restore

## 🔐 Acesso e Credenciais

### Produção
- Contas provisionadas via IdP (OAuth2/OIDC — Entra ID/Google).  
- Solicite acesso diretamente ao administrador de identidade ou ao time de segurança.
- Nenhuma credencial é distribuída ou documentada no repositório.

### Desenvolvimento/Homologação
- Use `APP_CONFIG.environment = 'development'` para habilitar o mock de autenticação.
- Credenciais de teste ficam fora do repositório (cofre/gestor). Consulte o administrador para recebê-las.
- O painel de “credenciais” da tela de login é bloqueado em produção por código e teste automatizado.

### 🔧 Solução de Problemas de Login

Se você está tendo problemas para fazer login:

1. **Limpar Cache Automaticamente**: Acesse [clear-cache.html](clear-cache.html) para limpar dados locais
2. **Manual**: Abra o Console (F12) e execute:
   ```javascript
   localStorage.clear();
   sessionStorage.clear();
   location.reload();
   ```
3. **Verificar Credenciais**: Confirme que está usando o usuário e senha corretos
4. **Bloqueio de Tentativas**: Após 5 tentativas incorretas, aguarde 15 minutos

### ✅ Sistema de Autenticação

O sistema de autenticação está **totalmente funcional**:
- ✅ OAuth2/OIDC (Entra/Google) como padrão em produção; SHA-256 local apenas para mock dev/staging
- ✅ Rate limiting (5 tentativas)
- ✅ RBAC (Admin, Gestor, Técnico)
- ✅ Sessão de 8 horas
- ✅ Mensagens de erro claras
- ✅ Sincronização com Firebase

**Nota**: Todos os testes de autenticação estão passando. Se houver problemas de login, geralmente são relacionados a cache do navegador.
