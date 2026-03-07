# Plano de Rollback - Dashboard de Peças

Este documento descreve os procedimentos para reverter uma release em caso de problemas críticos.

## Quando Fazer Rollback

Execute rollback imediatamente se:

- ❌ Funcionalidade crítica está quebrada (login, criação de solicitação, aprovação)
- ❌ Corrupção de dados detectada
- ❌ Vulnerabilidade de segurança descoberta
- ❌ Reclamações de usuários excedem threshold (>10% de erro)
- ❌ Performance degradada significativamente (>50% mais lento)

## Procedimento Rápido (Firebase Hosting)

### 1. Rollback Automático

```bash
# Listar deploys anteriores
firebase hosting:channel:list

# Executar rollback para versão anterior
firebase hosting:rollback

# Verificar que versão anterior está ativa
firebase hosting:channel:list
```

### 2. Verificação Pós-Rollback

- [ ] Sistema está acessível
- [ ] Login funciona
- [ ] Dados estão intactos
- [ ] Fluxos críticos funcionam

### 3. Comunicação

1. Notificar equipe técnica imediatamente
2. Atualizar status page (se houver)
3. Documentar incidente

## Procedimento Manual

Se o rollback automático falhar:

### 1. Identificar Versão Estável

```bash
# Ver histórico de tags
git log --oneline -10

# Identificar última tag estável
git tag -l "v*" --sort=-version:refname | head -5
```

### 2. Checkout e Deploy

```bash
# Checkout da versão anterior
git checkout <tag-anterior>

# Deploy manual
firebase use production
firebase deploy --only hosting

# Verificar deploy
curl -I https://dashboard-pecas.example.com
```

### 3. Criar Tag de Rollback

```bash
# Documentar o rollback
git tag -a "v$(date +'%Y.%m.%d')-rollback" -m "Rollback para versão anterior"
git push origin --tags
```

## Rollback de Dados (Firebase)

### ATENÇÃO: Procedimento de Alto Risco

Rollback de dados deve ser último recurso. Pode causar perda de dados novos.

### 1. Backup Atual

```bash
# Fazer backup do estado atual antes de qualquer ação
firebase database:get / > backup-pre-rollback-$(date +%Y%m%d-%H%M%S).json
```

### 2. Restaurar Backup

```bash
# Acessar Firebase Console
# https://console.firebase.google.com
# Realtime Database → Import JSON

# OU via CLI (CUIDADO: substitui todos os dados)
firebase database:set / backup-anterior.json
```

### 3. Validar Dados

- [ ] Verificar integridade das solicitações
- [ ] Verificar usuários e permissões
- [ ] Testar fluxos com dados restaurados

## Cache do Cliente (Service Worker)

Se usuários estiverem presos em versão antiga:

### 1. Forçar Atualização

Instruir usuários a:

1. Acessar `/clear-cache.html`
2. Clicar em "Limpar Cache e Dados Locais"
3. Recarregar a aplicação

### 2. Hard Refresh

Alternativamente:

- **Windows/Linux:** `Ctrl + Shift + R`
- **Mac:** `Cmd + Shift + R`

### 3. Via Console do Navegador

```javascript
// Limpar Service Worker e caches
navigator.serviceWorker.getRegistrations().then(regs => {
    regs.forEach(reg => reg.unregister());
});
caches.keys().then(names => {
    names.forEach(name => caches.delete(name));
});
localStorage.clear();
location.reload(true);
```

## Comunicação de Incidente

### Template de Notificação

```
🚨 ROLLBACK EXECUTADO

Sistema: Dashboard de Peças
Hora: [HORA]
Versão revertida: [VERSÃO]
Motivo: [BREVE DESCRIÇÃO]

Status: Sistema operacional com versão anterior
Próximos passos: [AÇÕES]

Contato: [RESPONSÁVEL]
```

### Canais de Comunicação

1. Slack/Teams (equipe técnica)
2. Email (stakeholders)
3. Status page (se houver)

## Pós-Rollback

### Documentação

1. [ ] Criar issue detalhando o problema
2. [ ] Documentar timeline do incidente
3. [ ] Identificar root cause
4. [ ] Definir ações corretivas

### Correção

1. [ ] Criar branch de hotfix
2. [ ] Corrigir o problema
3. [ ] Testar extensivamente em staging
4. [ ] Seguir processo normal de deploy

### Retrospectiva

1. [ ] O que causou o problema?
2. [ ] Como foi detectado?
3. [ ] O rollback foi eficiente?
4. [ ] O que pode ser melhorado?

## Contatos de Emergência

| Função | Nome | Contato | Horário |
|--------|------|---------|---------|
| Tech Lead | [Nome] | [Telefone] | 24/7 |
| DevOps | [Nome] | [Telefone] | Horário comercial |
| DBA | [Nome] | [Telefone] | Sob demanda |

## Histórico de Rollbacks

| Data | Versão | Motivo | Duração | Impacto |
|------|--------|--------|---------|---------|
| - | - | - | - | - |

---

**Versão do documento:** 1.0  
**Última atualização:** Dezembro 2024  
**Próxima revisão:** Trimestral
