# Dashboard de Solicitações de Peças - Diversey

Aplicação web/PWA para gestão de solicitações de peças, com frontend estático e sincronização pelo Firebase Realtime Database.

## Estado atual da arquitetura

- Frontend: HTML, CSS e JavaScript sem framework de build obrigatório.
- Persistência operacional: Firebase Realtime Database sob `/data/*`.
- Firebase no navegador: inicialização e autenticação anônima para a conexão técnica atual.
- Login do portal: cadastro próprio de usuários no RTDB e validação no cliente.
- Escritas operacionais: **online-only**; a fila offline de gravações não é suportada pelo runtime atual.
- PWA/Service Worker: cache de recursos e fallback de navegação não equivalem a suporte de escrita offline.
- Deploy do frontend: GitHub Pages por `.github/workflows/deploy.yml`.
- Scripts administrativos: Python em `scripts/` para backup, restore, seed e importação.

> **Segurança:** a auditoria de setembro de 2026 identificou um bloqueador crítico no modelo de confiança de autenticação/RBAC atual. Não trate Firebase Anonymous Auth nem dados de sessão produzidos no navegador como identidade confiável para autorização privilegiada. Consulte `SECURITY-REVIEW.md` e não promova mudanças de regras para produção sem migração/teste de identidade confiável.

## Pré-requisitos de desenvolvimento

- Node.js 24 recomendado para reproduzir o CI atual.
- Python 3.12 recomendado para reproduzir os testes dos scripts administrativos.
- Navegador moderno.
- Projeto Firebase de desenvolvimento/homologação separado de produção para testes de integração.

## Execução local

```bash
npm ci
npx http-server -p 8080
```

A aplicação pode então ser aberta em `http://localhost:8080`.

## Verificações obrigatórias

```bash
# Testes JavaScript
npm test -- --runInBand

# Testes Python
npm run test:python

# Erros críticos de JavaScript first-party
npm run lint:critical

# Relatório completo de dívida de lint
npm run lint:check

# Privacy guard
node scripts/redact-technician-fallback.mjs --check

# Dependências
npm audit --audit-level=high
```

O lint completo ainda contém dívida legada e é mantido visível no CI; o gate `lint:critical` é bloqueante para defeitos first-party de maior risco. Código vendorizado em `js/vendor/**` não é reformatado pelo projeto.

## Firebase

As chaves de configuração do Firebase usadas por aplicações web são valores client-side e não devem ser confundidas com credenciais administrativas. **Service Account Keys, tokens privados e segredos nunca devem ser versionados.**

A segurança dos dados depende de regras do RTDB compatíveis com uma identidade confiável. Não use regras genéricas do tipo “qualquer usuário autenticado pode ler/escrever tudo” como configuração de produção.

Arquivos relevantes:

- `js/firebase-init.js` — inicialização Firebase atual.
- `js/storage.js` — sincronização e persistência cloud.
- `js/auth.js` — login/sessão do portal.
- `firebase/database.rules.level2.json` — regras RTDB atualmente versionadas.
- `SECURITY-REVIEW.md` — postura de segurança observada e bloqueadores.

## Estrutura de dados observada

Os principais conjuntos ficam sob `/data/`, incluindo:

```text
/data
  /diversey_users
  /diversey_tecnicos
  /diversey_fornecedores
  /diversey_pecas
  /diversey_solicitacoes
  /diversey_sessions
  /diversey_settings
```

Coleções gerenciadas pelo frontend podem usar wrapper de metadados no formato:

```json
{
  "data": [],
  "updatedAt": 0,
  "updatedBy": "...",
  "opId": "..."
}
```

Scripts administrativos devem preservar esse contrato; consulte `docs/ADMIN-SCRIPTS.md`.

## Scripts administrativos Python

```bash
cd scripts
python -m venv .venv
# Linux/macOS: source .venv/bin/activate
# Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

Operações disponíveis:

- `seed_admin.py` — cria/atualiza usuário no schema atual do portal.
- `import_pecas_xlsx.py` — valida e mescla catálogo por transação.
- `backup_rtdb.py` — backup atômico de `/data`.
- `restore_rtdb.py` — restore explícito com `--force` e readback.

Use Service Account fora do repositório e valide `--dry-run` quando disponível.

## Deploy

O frontend é publicado no GitHub Pages a partir de `main` somente após o job de qualidade do workflow `Deploy to GitHub Pages` passar. O artefato publicado é montado em `dist/` com arquivos estáticos selecionados; `node_modules`, testes, scripts administrativos e credenciais não fazem parte do site publicado.

Procedimentos de release e rollback:

- `PRODUCTION-CHECKLIST.md`
- `ROLLBACK-PLAN.md`

## Responsividade e interface

A interface possui múltiplas camadas históricas de CSS. A ordem final de cascata é protegida por testes de regressão, incluindo:

- `tests/responsive-system.test.js`
- `tests/wwm-smart-layout.test.js`
- `tests/visual-architecture-v72.test.js`
- `tests/technician-request-layout.test.js`

Evite remover ou reordenar folhas de estilo apenas por aparência de duplicidade sem validar os contratos acima e executar smoke test real em múltiplos viewports.

## Limitações conhecidas / release blockers

1. **Autenticação/RBAC:** exige migração para identidade confiável antes de considerar autorização privilegiada robusta em produção.
2. **Dependências de desenvolvimento:** o CI de 04/09/2026 reportou vulnerabilidades na árvore npm; atualizar de forma controlada e repetir toda a regressão.
3. **Dívida de lint:** o relatório completo ainda possui violações legadas; não introduzir novos defeitos críticos.
4. **Testes visuais:** os testes automatizados validam contratos de layout/cascata, mas não substituem smoke test autenticado em navegador real para toda release relevante.

## Documentação técnica

- `SECURITY-REVIEW.md`
- `arquitetura-e-modelo.md`
- `docs/ADMIN-SCRIPTS.md`
- `PRODUCTION-CHECKLIST.md`
- `ROLLBACK-PLAN.md`
