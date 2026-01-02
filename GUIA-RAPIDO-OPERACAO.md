# 🚀 GUIA RÁPIDO DE OPERAÇÃO - Dashboard Diversey

**Versão:** 2.0 Final  
**Atualizado:** 2026-01-02

---

## 📋 ACESSO RÁPIDO

### Produção
```
URL: https://[seu-dominio].com
Admin: admin / AdminRecovery2025!
Gestor: gestor / GestorRecovery2025!
```

### Desenvolvimento
```
URL: http://localhost:[porta]
Admin: admin / admin123
Gestor: gestor / gestor123
```

---

## 🔧 FERRAMENTAS ESSENCIAIS

### 1. Diagnóstico de Autenticação
**Arquivo:** `scripts/diagnose-auth.html`  
**Quando usar:** Verificar usuários ou testar login

**Como usar:**
1. Abrir arquivo no navegador
2. Clicar "Executar Diagnóstico"
3. Testar login com username/senha

### 2. Reset de Senhas
**Arquivo:** `scripts/reset-user-passwords.html`  
**Quando usar:** Recuperar acesso ou resetar senha

**Como usar:**
1. Abrir arquivo no navegador
2. Clicar "Conectar Firebase"
3. Selecionar usuário
4. Confirmar reset

### 3. Validação do Sistema
**Arquivo:** `scripts/validate-system.html`  
**Quando usar:** Verificar integridade do sistema

**Como usar:**
1. Abrir arquivo no navegador
2. Executar cada teste
3. Verificar se todos passam

---

## 🎯 OPERAÇÕES COMUNS

### Criar Novo Gestor
1. Login como **admin**
2. Menu → **Configurações**
3. Tab → **Gestores**
4. Botão **Adicionar Gestor**
5. Preencher: Nome, Email, Username, Senha
6. Salvar

### Editar Gestor
1. Na lista de Gestores
2. Botão **Editar** (ícone lápis)
3. Alterar campos desejados
4. Salvar (senha não é alterada)

### Alterar Senha de Gestor
1. Na lista de Gestores
2. Botão **Senha** (ícone chave)
3. Digite nova senha (mín 6 caracteres)
4. Confirme senha
5. Salvar

### Excluir Gestor
1. Na lista de Gestores
2. Botão **Excluir** (ícone lixeira)
3. Confirmar exclusão

---

## ❌ PROBLEMAS COMUNS

### "Senha incorreta"
**Solução:** Use a senha correta para o ambiente
- Produção: AdminRecovery2025! / GestorRecovery2025!
- Desenvolvimento: admin123 / gestor123

### "Sistema mostra Degradado"
**Solução:**
1. Verifique conexão internet
2. Recarregue a página (F5)
3. Se persistir, veja console (F12) para erros reais

### "Não consigo fazer login"
**Solução:**
1. Execute `scripts/diagnose-auth.html`
2. Verifique se usuário existe
3. Use `scripts/reset-user-passwords.html` se necessário

### "Erro ao salvar gestor"
**Solução:**
1. Verifique conexão internet
2. Verifique se username já existe
3. Veja console (F12) para detalhes

---

## 🔍 VERIFICAÇÕES DE SAÚDE

### Checklist Diário
- [ ] Login funciona
- [ ] Criar solicitação funciona
- [ ] Aprovar solicitação funciona
- [ ] Relatórios carregam
- [ ] Sem erros repetidos no console

### Checklist Semanal
- [ ] Backup do Firebase
- [ ] Verificar logs de erro
- [ ] Validar integridade dos dados
- [ ] Testar ferramentas de diagnóstico

### Checklist Mensal
- [ ] Revisar usuários ativos
- [ ] Limpar dados de teste
- [ ] Atualizar documentação se necessário
- [ ] Revisar senhas (rotação)

---

## 📞 SUPORTE TÉCNICO

### Console do Navegador (F12)
- Aba Console: Ver erros JavaScript
- Aba Network: Ver requisições
- Aba Application: Ver dados armazenados

### Firebase Console
```
URL: https://console.firebase.google.com
Projeto: solicitacoes-de-pecas
Caminho Usuários: data/diversey_users
```

### Logs Estruturados
- Disponíveis em: Menu Admin → Saúde do Sistema
- Filtrar por categoria: auth, sync, export, etc.
- Exportar logs se necessário

---

## 🔒 SEGURANÇA

### Boas Práticas
- ✅ Altere senhas padrão em produção
- ✅ Use HTTPS em produção
- ✅ Não compartilhe credenciais
- ✅ Faça logout após usar
- ✅ Rotacione senhas a cada 90 dias

### Em Caso de Comprometimento
1. Acesse como admin
2. Vá em Configurações → Gestores
3. Clique em "Senha" no usuário afetado
4. Defina nova senha forte
5. Notifique o usuário

---

## 📚 DOCUMENTAÇÃO COMPLETA

### Arquivos Importantes
- **INSTRUCOES-LOGIN.md** - Guia completo de login e credenciais
- **REVISAO-COMPLETA-SUMMARY.md** - Resumo de todas as melhorias
- **README.md** - Documentação geral do projeto
- **CREDENCIAIS.md** - Informações de acesso

### Links Úteis
- Firebase Console: https://console.firebase.google.com
- Repositório GitHub: [seu-repositorio]
- Documentação Firebase: https://firebase.google.com/docs

---

## 📊 MÉTRICAS E RELATÓRIOS

### Dashboard Principal
- Solicitações Pendentes
- Aprovações na Última Semana
- Top 5 Técnicos
- Peças Mais Solicitadas

### Relatórios Disponíveis
- Solicitações por Status
- Solicitações por Técnico
- Solicitações por Período
- Exportar para Excel/PDF

### Exportações
- Todas exportações são logadas
- Ver logs em: Admin → Saúde do Sistema
- Exportações armazenadas na nuvem (se habilitado)

---

## 🆘 EMERGÊNCIA

### Sistema Totalmente Inacessível
1. Verifique se URL está correta
2. Verifique conexão internet
3. Tente navegação anônima
4. Acesse Firebase Console diretamente
5. Use scripts/reset-user-passwords.html

### Dados Corrompidos
1. Acesse Firebase Console
2. Verifique data/diversey_users
3. Verifique data/diversey_solicitacoes
4. Restaure do backup se necessário
5. Execute scripts/validate-system.html

### Firebase Offline
1. Aguarde reconexão automática
2. Sistema mostrará mensagem de offline
3. Operações de escrita serão bloqueadas
4. Dados carregados permanecem em cache
5. Tudo voltará ao normal quando reconectar

---

**Última Atualização:** 2026-01-02  
**Versão:** 2.0 - Final Review  
**Suporte:** [seu-email@empresa.com]
