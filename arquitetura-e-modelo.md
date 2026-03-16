# Arquitetura e Modelo de Dados

Documento de referência rápida para a visão de arquitetura, modelo de dados e fluxos críticos do **Dashboard de Solicitação de Peças**.

## 1) Arquitetura base (Core)
- **PWA + Service Worker**: instalação no dispositivo, cache seletivo e fallback offline via `service-worker.js` + `offline.html`.
- **Persistência offline com IndexedDB**: `IndexedDBStorage` mantém o cache principal (dados, versões, sessão), com localStorage apenas como compatibilidade. Stores dedicados: `requests`, `parts`, `users`, `suppliers`, `reports` e `queue`, com índices para status/region/cnpj/username e versão da coleção.
- **Fila e retry offline**: gravações vão para IndexedDB e, se a conexão Firebase cair, entram na store `queue`; ao reconectar o listener `.info/connected` dispara `flushQueue()` com backoff.
- **Cache por módulo**: o Service Worker usa caches versionados por módulo (`core`, `dashboard`, `solicitacoes`, `catalogo`, `relatorios`) e publica `CACHE_UPDATED` ao ativar para habilitar refresh seguro.
- **Backend**: Firestore + Cloud Functions (ou RTDB + Functions) para validações server-side, auditoria, sequenciais e integrações.
- **RBAC em camadas**: claims no token, regras no banco e guarda de rota no front (menus dinâmicos e checagens de permissão).

## 2) Collections e relacionamentos (Data Model)
### 2.1 requests (Solicitações)
- ID sequencial `REQ-YYYYMMDD-####` (imutável, gerado em função transacional).
- Auditoria: `audit.version`, `lastUpdatedBy`, `lastUpdatedAt`.
- Status: `draft | pending | approved | rejected | in_transit | delivered | finalized`.
- Trilhas: `approvals[]` e `timeline[]`.
- Totais: `totals.amount`, `itemsCount`, `currency`.

### 2.2 parts (Peças)
- Catálogo: `code`, `description`, `category`, `unitPrice`, `status`.
- Metadados: unidade (`uom`) e estoque mínimo (`minStock`).

### 2.3 users (Admin / Gestor / Técnico / Fornecedor)
- `role` define acesso; `region` define escopo (ex.: GO).
- Claims para permissões e limite de orçamento.

### 2.4 suppliers (Fornecedores)
- Cadastro com `cnpj`, `contacts[]`, `status`.

### 2.5 reports (Cache materializado de KPIs)
- Coleção de KPIs prontos (pendências, tempo médio, valor em aberto, top técnicos) para evitar agregações pesadas no client.

## 3) Sequenciais e consistência (Regras de integridade)
- Sequencial imutável: gerado em Cloud Function transacional com prefixo de data + contador diário.
- Controle de versão (optimistic concurrency): validar `audit.version` antes de gravar.
- Totais sempre server-side: cálculo e validação no back, cliente apenas exibe.

## 4) Segurança e compliance
- Auth confiável: OAuth2/OIDC (Microsoft Entra ID ou Google); MFA opcional para gestores/admin.
- Regras por perfil: Técnico cria/lê suas solicitações; Gestor aprova/rejeita no próprio escopo; Admin com confirmações críticas em dois passos.
- Privacidade/logs: TLS, criptografia at-rest, mascarar CNPJ em telas públicas, logs sem dados sensíveis.
- Proteções: rate limiting + bloqueio progressivo em tentativas falhas; backups incrementais diários + snapshots semanais (restauração em staging).

### 4.1 Rate Limiting (Implementado)
- **Limite de tentativas**: 5 tentativas falhas por usuário antes de bloqueio.
- **Bloqueio progressivo**: Primeira vez = 15 minutos; cada bloqueio subsequente dobra o tempo (até 24h máx).
- **Prevenção de enumeração**: Tentativas para usuários inexistentes também contam.
- **Reset automático**: O contador é limpo após login bem-sucedido.
- Implementação em `js/auth.js`: `checkRateLimit()`, `recordFailedAttempt()`, `clearRateLimit()`.

## 5) Offline, sync e performance
- **Offline-first**: IndexedDB + Service Worker com cache seletivo por módulo.
- **Fila de envio**: operações offline viram deltas com retry exponencial; conflitos resolvidos com prioridade do servidor (last-write-wins + alerta).
- **Performance**: paginação por cursor e índices (status, createdAt, createdBy, supplier); lazy load de libs pesadas (Chart.js, jsPDF, XLSX); KPIs materializados em `reports`.

## 6) Workflow e melhorias de UX
- **Solicitações**: formulário guiado (Itens → Revisão → Envio), autocomplete de peça, preço médio histórico, alerta de orçamento, anexos no storage com referência.
- **Aprovações**: matriz por valor/categoria/região, SLA visível (cronômetro + cores), histórico e contexto (consumo por técnico, peças recorrentes, orçamento do mês).
- **Dashboard**: KPIs “clicáveis” com filtro aplicado, filtros salvos/compartilháveis, ações rápidas com confirmação + comentário obrigatório.

## 7) Relatórios e analytics
- Filtros consistentes entre telas e exportações; exportação XLSX/CSV com sequencial e status.
- Métricas: SLA por etapa, retrabalho (rejeições), ranking por peça/região, alertas de anomalia.
- Agendamento de PDF/XLS semanal para gestores + logs de entrega/falha.

## 8) DevOps e qualidade
- Ambientes isolados (dev/staging/prod) + dados segregados.
- CI/CD: lint, type-check, unit/integração/e2e (Cypress/Playwright); migração gradual para TypeScript.
- Feature flags + rollback rápido; observabilidade com logs estruturados e correlação por `request.id`.
- Documentação viva + playbooks curtos.

## 9) Snippets (referência técnica)
### 9.1 Service Worker (cache + fallback)
```js
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open('v1').then((cache) => cache.addAll([
    '/', '/index.html', '/styles.css', '/app.js'
  ])));
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((cached) =>
      cached || fetch(e.request).catch(() => caches.match('/offline.html'))
    )
  );
});
```

### 9.2 Regras de segurança (Firestore – exemplo)
```js
match /requests/{id} {
  allow read: if isAdmin() || isManager() || isOwnerOfRequest(id);
  allow create: if isTechnician() && request.resource.data.status == 'pending';
  allow update: if isManager() && request.resource.data.status in ['approved','rejected','in_transit','delivered','finalized'];
  allow delete: if false;
}
```

### 9.3 Geração do sequencial (Cloud Function)
```js
exports.generateSeq = functions.firestore.document('requests/{id}')
  .onCreate(async (snap, ctx) => {
    const date = new Date().toISOString().slice(0,10).replace(/-/g,'');
    const counterRef = admin.firestore().doc(`counters/${date}`);
    await admin.firestore().runTransaction(async (tx) => {
      const doc = await tx.get(counterRef);
      const next = (doc.exists ? doc.data().count : 0) + 1;
      tx.set(counterRef, { count: next }, { merge: true });
      tx.update(snap.ref, { id: `REQ-${date}-${String(next).padStart(4,'0')}` });
    });
  });
```

## 10) Roadmap por fases
- **Fase 1 — Fundamentos**: PWA + IndexedDB, RBAC + guardas de rota, sequencial e totais server-side.
- **Fase 2 — Fluxos e UX**: Matriz de aprovação, dashboard materializado + filtros salvos, anexos + portal fornecedor (MVP).
- **Fase 3 — Observabilidade e escala**: Relatórios agendados + anomalias, CI/CD completo + feature flags, backups + retenção + auditoria avançada.
