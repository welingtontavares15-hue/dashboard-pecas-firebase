<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard de Solicitações de Peças - Diversey</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;600;700&family=Open+Sans:wght@400;600;700&family=Lato:wght@400;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="css/style.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" integrity="sha512-iecdLmaskl7CVkqkXNQ/ZH/XLlvWZOJyj7Yy7tcenmpD1ypASozpmT/E0iPtmFIB46ZmdtAc9eNBvH0H/ZpiBw==" crossorigin="anonymous" referrerpolicy="no-referrer">
    <link rel="manifest" href="manifest.webmanifest">
    <script src="js/vendor/chart.umd.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js" integrity="sha512-qZvrmS2ekKPF2mSznTQsxqPgnpkI4DNTlrdUmTzrDgektczlKNRRhy5X5AAOnx5S09ydFYWWNSfcEqDTTHgtNA==" crossorigin="anonymous" referrerpolicy="no-referrer"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js" integrity="sha512-r22gChDnGvBylk90+2e/ycr3RVrDi8DIOkIGNhJlKfuyQM4tIRAI062MaV8sfjQKYVGjOBaZBOA87z+IhZE9DA==" crossorigin="anonymous" referrerpolicy="no-referrer"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js" integrity="sha512-CNgIRecGo7nphbeZ04Sc13ka07paqdeTu0WR1IM4kNcpmBAUSHSQX0FslNhTDadL4O5SAGapGt4FodqL8My0mA==" crossorigin="anonymous" referrerpolicy="no-referrer"></script>
    <!-- Firebase SDK for cloud storage synchronization -->
    <script src="https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js"></script>
    <script src="https://www.gstatic.com/firebasejs/8.10.1/firebase-database.js"></script>
</head>
<body class="light-mode">
    <!-- Login Screen -->
    <div id="login-screen" class="login-container">
        <div class="login-card">
            <div class="login-logo">
                <i class="fas fa-tools"></i>
                <h1>Diversey</h1>
                <div class="login-slogan">A Solenis Company</div>
                <p>Dashboard de Solicitações de Peças</p>
            </div>
            <form id="login-form" class="login-form">
                <div class="form-group">
                    <label for="login-username">Usuário</label>
                    <input type="text" id="login-username" class="form-control" placeholder="Digite seu usuário" required autocomplete="username" autocapitalize="none" spellcheck="false">
                </div>
                <div class="form-group">
                    <label for="login-password">Senha</label>
                    <div class="password-field">
                        <input type="password" id="login-password" class="form-control" placeholder="Digite sua senha" required autocomplete="current-password">
                        <button type="button" id="toggle-password" class="toggle-password" aria-label="Mostrar senha">
                            <i class="fas fa-eye"></i>
                        </button>
                    </div>
                </div>
                <button type="submit" class="btn btn-primary btn-block">
                    <i class="fas fa-sign-in-alt"></i> Entrar
                </button>
                <div id="login-error" class="error-message hidden"></div>
            </form>
            <div class="demo-info">
                <p><strong>Versão oficial:</strong></p>
                <p>O ambiente está pronto para uso em produção. Solicite suas credenciais ao administrador responsável.</p>
                <p style="margin-top: 0.5rem; font-size: 0.75rem;"><i class="fas fa-info-circle"></i> Dados sincronizados via Firebase para garantir estabilidade e suporte.</p>
            </div>
            <div id="login-credentials" class="credentials-panel hidden">
                <div class="credentials-header">
                    <div>
                        <h3><i class="fas fa-user-lock"></i> Credenciais disponíveis</h3>
                        <p>Use um dos usuários abaixo para acessar imediatamente.</p>
                    </div>
                    <span class="badge-info"><i class="fas fa-shield-alt"></i> RBAC ativo</span>
                </div>
                <div class="credentials-table-wrapper">
                    <table class="credentials-table">
                        <thead>
                            <tr>
                                <th>Nome</th>
                                <th>Usuário</th>
                                <th>Perfil</th>
                            </tr>
                        </thead>
                        <tbody id="login-credentials-body"></tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>

    <!-- Main Application -->
    <div id="app-container" class="app-container hidden">
        <!-- Sidebar -->
        <aside id="sidebar" class="sidebar">
            <div class="sidebar-header">
                <div class="logo">
                    <i class="fas fa-tools"></i>
                    <span>Diversey</span>
                </div>
                <button id="sidebar-toggle" class="sidebar-toggle">
                    <i class="fas fa-bars"></i>
                </button>
            </div>
            <nav id="sidebar-nav" class="sidebar-nav">
                <!-- Menu items will be dynamically inserted based on user role -->
            </nav>
            <div class="sidebar-footer">
                <div class="user-info">
                    <div class="user-avatar">
                        <i class="fas fa-user"></i>
                    </div>
                    <div class="user-details">
                        <span id="user-name">Usuário</span>
                        <span id="user-role" class="user-role">Perfil</span>
                    </div>
                </div>
                <div class="sidebar-actions">
                    <button id="theme-toggle" class="btn-icon" title="Alternar tema">
                        <i class="fas fa-moon"></i>
                    </button>
                    <button id="logout-btn" class="btn-icon" title="Sair">
                        <i class="fas fa-sign-out-alt"></i>
                    </button>
                </div>
            </div>
        </aside>
        <div id="sidebar-backdrop" class="sidebar-backdrop"></div>

        <!-- Main Content -->
        <main class="main-content">
            <!-- Header -->
            <header class="main-header">
                <div class="header-left">
                    <div class="mobile-nav-buttons">
                        <button id="mobile-menu-btn" class="btn-icon" aria-label="Abrir menu">
                            <i class="fas fa-bars"></i>
                        </button>
                        <button id="mobile-home-btn" class="btn-icon" aria-label="Voltar para início">
                            <i class="fas fa-home"></i>
                        </button>
                    </div>
                    <div class="breadcrumb" id="breadcrumb">
                        <span>Dashboard</span>
                    </div>
                </div>
                <div class="header-actions">
                    <button id="sync-btn" class="btn-icon" title="Sincronizar dados">
                        <i class="fas fa-sync-alt"></i>
                    </button>
                    <div id="pending-badge" class="notification-badge hidden">
                        <i class="fas fa-bell"></i>
                        <span id="pending-count">0</span>
                    </div>
                </div>
            </header>

            <!-- Content Area -->
            <div id="content-area" class="content-area">
                <!-- Dynamic content will be loaded here -->
            </div>
        </main>
    </div>

    <!-- Toast Container -->
    <div id="toast-container" class="toast-container"></div>

    <!-- Modal Container -->
    <div id="modal-container" class="modal-container hidden">
        <div class="modal-backdrop"></div>
        <div id="modal-content" class="modal-content">
            <!-- Modal content will be dynamically inserted -->
        </div>
    </div>

    <!-- Loading Overlay -->
    <div id="loading-overlay" class="loading-overlay hidden">
        <div class="spinner"></div>
        <span>Carregando...</span>
    </div>

    <!-- Scripts -->
    <script src="js/config.js"></script>
    <script src="js/pwa.js"></script>
    <script src="js/utils.js"></script>
    <script src="js/logger.js"></script>
    <script src="js/indexeddb-storage.js"></script>
    <script src="js/sheets.js"></script>
    <script src="js/onedrive.js"></script>
    <script src="js/storage.js"></script>
    <script src="js/data.js"></script>
    <script src="js/auth.js"></script>
    <script src="js/pecas.js"></script>
    <script src="js/dashboard.js"></script>
    <script src="js/solicitacoes.js"></script>
    <script src="js/aprovacoes.js"></script>
    <script src="js/tecnicos.js"></script>
    <script src="js/fornecedores.js"></script>
    <script src="js/relatorios.js"></script>
    <script src="js/app.js"></script>
</body>
</html>





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
