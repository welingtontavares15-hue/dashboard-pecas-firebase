# Plano de Rollback - Dashboard de Peças

Este documento descreve como reverter código publicado no GitHub Pages e, separadamente, como restaurar dados do Firebase Realtime Database.

## Quando executar rollback

Considere rollback imediato quando houver:
- falha crítica de login ou autorização;
- criação/aprovação/finalização de solicitação indisponível;
- corrupção ou perda de integridade de dados;
- vulnerabilidade crítica introduzida pela release;
- erro de runtime generalizado após o deploy.

## Rollback do site publicado (GitHub Pages)

O site é publicado pelo workflow `.github/workflows/deploy.yml` quando `main` recebe uma alteração e o job de qualidade passa. Não use comandos de Firebase Hosting para reverter o frontend deste repositório.

### 1. Identificar o último SHA estável

```bash
git log --oneline -20
```

Confirme no histórico do GitHub Actions qual SHA foi implantado com sucesso antes do incidente.

### 2. Reverter a mudança defeituosa

Preferência: crie um PR de revert, preservando trilha de auditoria.

```bash
git checkout main
git pull --ff-only
git checkout -b hotfix/rollback-<identificador>
git revert <sha-ou-merge-commit-defeituoso>
git push -u origin hotfix/rollback-<identificador>
```

Após revisão, mescle o PR na `main`. O workflow de Pages publicará o estado revertido automaticamente.

### 3. Verificar o redeploy

- [ ] Job `quality` concluiu com sucesso
- [ ] Job `deploy` concluiu com sucesso
- [ ] SHA publicado corresponde ao commit de rollback
- [ ] Site abre sem erro crítico
- [ ] Login funciona com conta autorizada
- [ ] Fluxos críticos funcionam
- [ ] Console do navegador não apresenta erro crítico nos fluxos exercitados

## Rollback de dados do Firebase

Rollback de código e rollback de dados são operações independentes. Não restaure o RTDB apenas porque uma versão do frontend foi revertida.

### 1. Preservar o estado atual

Antes de qualquer restauração, faça um backup novo:

```bash
cd scripts
python backup_rtdb.py \
  --service-account ../serviceAccountKey.json \
  --database-url https://SEU-PROJETO-default-rtdb.firebaseio.com \
  --out backup-pre-rollback.json
```

### 2. Validar o backup que será restaurado

O arquivo deve representar o conteúdo de `/data` e ter origem conhecida. Revise especialmente usuários, solicitações, técnicos, fornecedores e catálogo de peças.

### 3. Restaurar somente com autorização explícita

```bash
python restore_rtdb.py \
  --service-account ../serviceAccountKey.json \
  --database-url https://SEU-PROJETO-default-rtdb.firebaseio.com \
  --in backup-estavel.json \
  --force
```

O script faz readback de `/data` e falha se o conteúdo persistido divergir do arquivo.

### 4. Validar integridade após restore

- [ ] Usuários e perfis esperados existem
- [ ] Solicitações críticas estão íntegras
- [ ] Técnicos e fornecedores estão íntegros
- [ ] Catálogo de peças está íntegro
- [ ] Regras de acesso continuam funcionando
- [ ] Fluxos principais foram testados

## Cache do cliente / Service Worker

Se um cliente permanecer preso em uma versão incompatível:

1. Acesse `/clear-cache.html` e execute a limpeza indicada pela própria página; ou
2. faça hard refresh (`Ctrl+Shift+R` no Windows/Linux, `Cmd+Shift+R` no macOS).

Não oriente limpeza indiscriminada de dados locais se houver informação do usuário que ainda não foi sincronizada; valide primeiro o modo de persistência da versão afetada.

## Pós-rollback

- [ ] Registrar o incidente e o SHA revertido
- [ ] Preservar logs/evidências
- [ ] Identificar causa raiz
- [ ] Criar correção em branch isolada
- [ ] Executar testes automatizados e smoke tests
- [ ] Revisar o plano de prevenção de recorrência

---

**Versão do documento:** 2.0  
**Última atualização:** Setembro 2026
