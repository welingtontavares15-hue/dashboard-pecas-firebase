# Checklist de Produção - Dashboard de Peças

Este checklist deve ser completado antes de cada deploy para produção.

## Pré-Deploy

### Código e Qualidade

- [ ] Todos os testes automatizados passaram (`npm test`)
- [ ] Linting passou sem erros (`npm run lint:check`)
- [ ] Code review completado e aprovado
- [ ] PR mergeado na branch target
- [ ] Sem vulnerabilidades críticas (`npm audit`)

### Versionamento

- [ ] `CACHE_VERSION` atualizado em `service-worker.js`
- [ ] `version` atualizado em `js/config.js` (deve coincidir)
- [ ] `package.json` version atualizado (se aplicável)
- [ ] `RELEASE-NOTES.md` atualizado com mudanças

### Configuração de Ambiente

- [ ] `APP_CONFIG.environment` definido como `'production'`
- [ ] Credenciais de login NÃO visíveis na tela de login (produção)
- [ ] Firebase configurado para projeto de produção
- [ ] Variáveis de ambiente corretas

### Smoke Tests

- [ ] Smoke tests executados em staging
- [ ] Todos os fluxos críticos passaram
- [ ] Evidências documentadas
- [ ] `SMOKE-TEST-CHECKLIST.md` preenchido e assinado

---

## Deploy

### Staging (Obrigatório antes de Produção)

- [ ] Deploy para staging executado
- [ ] Aguardar 15 minutos de monitoramento
- [ ] Verificar logs de erro
- [ ] Testar fluxos críticos manualmente

### Produção

- [ ] Tag de release criada
- [ ] Deploy para produção executado
- [ ] Verificar disponibilidade do sistema
- [ ] Testar login com usuário real
- [ ] Verificar que dados existentes estão intactos

---

## Pós-Deploy

### Monitoramento Imediato (0-15 min)

- [ ] Verificar logs de erro no Firebase Console
- [ ] Monitorar taxa de sucesso de login
- [ ] Verificar que Service Worker atualizou
- [ ] Testar criação de solicitação
- [ ] Testar exportação (PDF/Excel)

### Monitoramento Curto Prazo (0-24h)

- [ ] Acompanhar feedback de usuários
- [ ] Verificar tendências de erro
- [ ] Monitorar performance do banco
- [ ] Verificar logs de auditoria

### Monitoramento Longo Prazo (1 semana)

- [ ] Analisar padrões de uso
- [ ] Verificar métricas de performance
- [ ] Revisar logs de exportação
- [ ] Validar integridade de dados

---

## Rollback

Se qualquer problema crítico for detectado:

1. Executar rollback imediato:
   ```bash
   firebase hosting:rollback
   ```

2. Notificar equipe via canal de comunicação

3. Documentar o problema em issue

4. Seguir `ROLLBACK-PLAN.md` para procedimentos detalhados

---

## Contatos de Emergência

| Função | Nome | Contato |
|--------|------|---------|
| Tech Lead | [Nome] | [Email/Telefone] |
| DevOps | [Nome] | [Email/Telefone] |
| On-Call | [Rotação] | [Contato] |

---

## Aprovações

| Etapa | Responsável | Assinatura | Data |
|-------|-------------|------------|------|
| Code Review | | | |
| QA/Testes | | | |
| Deploy Staging | | | |
| Deploy Produção | | | |

---

## Notas da Release

**Versão:** _______________

**Data do Deploy:** _______________

**Principais Mudanças:**
1. 
2. 
3. 

**Riscos Identificados:**
1. 
2. 

**Plano de Mitigação:**
1. 
2. 

---

**Versão do documento:** 1.0  
**Última atualização:** Dezembro 2024
