# Checklist de Produção - Dashboard de Peças

Este checklist deve ser completado antes de cada deploy para produção.

## Pré-Deploy

### Código e Qualidade

- [ ] Todos os testes JavaScript passaram (`npm test`)
- [ ] Todos os testes Python passaram (`npm run test:python`)
- [ ] Lint crítico passou sem erros (`npm run lint:critical`)
- [ ] Lint completo foi revisado (`npm run lint:check`); a dívida legada deve permanecer visível até ser eliminada
- [ ] Privacy guard passou (`node scripts/redact-technician-fallback.mjs --check`)
- [ ] Code review completado e aprovado
- [ ] PR mergeado na branch target
- [ ] `npm audit` revisado; nenhuma vulnerabilidade crítica nova aceita sem avaliação de risco

### Versionamento

- [ ] `CACHE_VERSION` atualizado em `service-worker.js` quando arquivos cacheados mudarem
- [ ] `version` atualizado em `js/config.js` quando aplicável
- [ ] `package.json` atualizado quando aplicável
- [ ] Notas de release atualizadas quando aplicável

### Configuração de Ambiente

- [ ] `APP_CONFIG.environment` definido como `production`
- [ ] Credenciais de login não visíveis na tela de login em produção
- [ ] Firebase configurado para o projeto correto
- [ ] Regras do Realtime Database revisadas e validadas
- [ ] Nenhum segredo ou service account versionado

### Smoke Tests

- [ ] Smoke tests executados em staging ou ambiente controlado equivalente
- [ ] Login validado com conta autorizada
- [ ] Criação, aprovação/rejeição, trânsito e finalização de solicitação validados conforme o perfil
- [ ] Filtros, busca e ordenação principais validados
- [ ] Exportações principais validadas
- [ ] Layout conferido em desktop, tablet e mobile
- [ ] Console do navegador sem erro crítico nos fluxos exercitados
- [ ] Evidências documentadas

---

## Deploy

O deploy atual é feito pelo workflow `.github/workflows/deploy.yml` para GitHub Pages após o job `quality` concluir com sucesso.

### Produção

- [ ] Commit/PR aprovado está em `main`
- [ ] Workflow `Deploy to GitHub Pages` concluiu com sucesso
- [ ] SHA implantado corresponde ao SHA aprovado
- [ ] URL publicada responde corretamente
- [ ] Login e fluxos críticos foram revalidados
- [ ] Dados existentes permanecem íntegros

---

## Pós-Deploy

### Verificação imediata

- [ ] GitHub Actions sem falhas de deploy
- [ ] Logs relevantes do Firebase revisados
- [ ] Service Worker atualizado sem prender clientes em versão incompatível
- [ ] Criação de solicitação validada
- [ ] Aprovação/rejeição validada com perfil autorizado
- [ ] Exportação principal validada

### Monitoramento curto prazo

- [ ] Feedback de usuários acompanhado
- [ ] Erros de sincronização e autorização acompanhados
- [ ] Performance do banco acompanhada
- [ ] Logs de auditoria revisados

---

## Rollback

Se um problema crítico for detectado:

1. Identificar o último commit estável publicado no GitHub Pages.
2. Criar um revert do commit/PR defeituoso na `main` ou reaplicar o commit estável por PR controlado.
3. Confirmar que o workflow `Deploy to GitHub Pages` republicou o SHA de rollback.
4. Validar disponibilidade, login, integridade dos dados e fluxos críticos.
5. Para rollback de dados, usar o procedimento específico em `ROLLBACK-PLAN.md`; não restaurar RTDB como efeito colateral de rollback de código.

---

## Aprovações

| Etapa | Responsável | Evidência/Data |
|-------|-------------|---------------|
| Code Review | | |
| QA/Testes | | |
| Deploy Produção | | |
| Verificação Pós-Deploy | | |

---

**Versão do documento:** 2.0  
**Última atualização:** Setembro 2026
