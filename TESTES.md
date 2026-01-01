# 🧪 Guia de Testes - Sistema de Autenticação

## 📋 Índice
1. [Preparação](#preparação)
2. [Teste 1: Diagnóstico do Sistema](#teste-1-diagnóstico-do-sistema)
3. [Teste 2: Criar Usuários Padrão](#teste-2-criar-usuários-padrão)
4. [Teste 3: Reset de Senha Individual](#teste-3-reset-de-senha-individual)
5. [Teste 4: Reset de Todas as Senhas](#teste-4-reset-de-todas-as-senhas)
6. [Teste 5: Login com Admin](#teste-5-login-com-admin)
7. [Teste 6: Login com Gestor](#teste-6-login-com-gestor)
8. [Teste 7: Login com Técnico](#teste-7-login-com-técnico)
9. [Teste 8: Teste de Autenticação](#teste-8-teste-de-autenticação)
10. [Teste 9: Validação de Hashes](#teste-9-validação-de-hashes)
11. [Checklist Final](#checklist-final)

---

## Preparação

### Requisitos
- Navegador web moderno (Chrome, Firefox, Edge, Safari)
- Conexão com internet
- Acesso ao projeto no sistema de arquivos

### Antes de Começar
1. Abra o console do navegador (tecla F12)
2. Mantenha a aba "Console" visível para ver logs
3. Tenha este guia aberto para referência

---

## Teste 1: Diagnóstico do Sistema

### Objetivo
Verificar o estado atual do sistema de autenticação

### Passos

1. **Abrir ferramenta**
   ```
   Navegue até: scripts/diagnose-auth.html
   Abra no navegador
   ```

2. **Executar diagnóstico**
   ```
   Clique no botão: "🔍 Executar Diagnóstico"
   ```

3. **Verificar status**
   - ✅ Card "Firebase" deve mostrar: `✅ OK`
   - ✅ Card "Usuários" deve mostrar: número > 0
   - ✅ Card "Caminho" deve mostrar: `data/diversey_users`

4. **Analisar usuários**
   - ✅ Tabela deve listar usuários
   - ✅ Coluna "Password Hash" deve ter hashes
   - ✅ Coluna "Status" deve mostrar "Hash OK" e "Ativo"

5. **Verificar log**
   ```
   Log deve mostrar:
   - ✅ Firebase inicializado com sucesso
   - ✅ X usuário(s) carregado(s)
   - ✅ Diagnóstico concluído com sucesso
   ```

### Resultado Esperado
✅ **PASSOU** se:
- Firebase conectou
- Usuários foram listados
- Todos têm hash de senha
- Nenhum erro no console

❌ **FALHOU** se:
- Firebase não conectou
- Nenhum usuário encontrado
- Erros no console

### Ações em Caso de Falha
- Se nenhum usuário: Execute Teste 2 (Criar Usuários)
- Se erro de conexão: Verifique internet e Firebase config
- Se usuários sem hash: Execute Teste 3 ou 4 (Reset)

---

## Teste 2: Criar Usuários Padrão

### Objetivo
Criar usuários iniciais no sistema (admin, gestor, tecnico)

### Passos

1. **Abrir ferramenta**
   ```
   Navegue até: scripts/seed-users.html
   Abra no navegador
   ```

2. **Verificar usuários a criar**
   ```
   Caixa amarela deve listar:
   - admin / admin123 / administrador
   - gestor / gestor123 / gestor
   - tecnico / tecnico123 / tecnico
   ```

3. **Executar seed**
   ```
   Clique no botão: "🌱 Criar Usuários Padrão"
   ```

4. **Aguardar processamento**
   ```
   Acompanhe o log:
   - Conectando ao Firebase...
   - Carregando usuários existentes...
   - Criando usuário: admin (se não existir)
   - Criando usuário: gestor (se não existir)
   - Criando usuário: tecnico (se não existir)
   - Salvando no Firebase...
   ```

5. **Verificar resultado**
   ```
   Resumo deve mostrar:
   - ✅ Criados: X
   - ⏭️ Já existiam: Y
   - 📋 Total final: Z
   ```

### Resultado Esperado
✅ **PASSOU** se:
- Processo completou sem erros
- Log mostra "Seed concluído com sucesso"
- Usuários foram criados ou já existiam

❌ **FALHOU** se:
- Erro de conexão
- Erro ao salvar
- Nenhum usuário criado

---

## Teste 3: Reset de Senha Individual

### Objetivo
Resetar senha de um usuário específico

### Passos

1. **Abrir ferramenta**
   ```
   Navegue até: scripts/fix-passwords.html
   Abra no navegador
   ```

2. **Conectar ao Firebase**
   ```
   Clique no botão: "🔌 Conectar Firebase"
   ```

3. **Aguardar conexão**
   ```
   Verificar:
   - Status "Firebase" muda para "Conectado" (verde)
   - "Usuários Encontrados" mostra número > 0
   - Botões de reset ficam habilitados
   ```

4. **Resetar senha do Admin**
   ```
   Clique no botão: "👤 Resetar Admin"
   ```

5. **Verificar log**
   ```
   Log deve mostrar:
   - 🔄 Iniciando reset de senha para: admin
   - 📍 Usuário encontrado: admin (ID: ...)
   - 🔐 Hash SHA-256 gerado...
   - ✅ Senha resetada com sucesso para: admin
   - Nova senha: admin123
   ```

6. **Repetir para outros usuários (opcional)**
   ```
   - Clique em "👔 Resetar Gestor"
   - Clique em "🔧 Resetar Técnico"
   ```

### Resultado Esperado
✅ **PASSOU** se:
- Conexão estabelecida
- Reset executado sem erros
- Log confirma senha resetada
- Nova senha é mostrada

❌ **FALHOU** se:
- Não conectou ao Firebase
- Usuário não encontrado
- Erro ao salvar

---

## Teste 4: Reset de Todas as Senhas

### Objetivo
Resetar senhas de todos os usuários de uma vez

### Passos

1. **Conectar ao Firebase** (se ainda não conectado)
   ```
   Clique no botão: "🔌 Conectar Firebase"
   ```

2. **Iniciar reset completo**
   ```
   Clique no botão: "🔄 Resetar Todos"
   ```

3. **Confirmar ação**
   ```
   Janela de confirmação aparecerá:
   "Deseja realmente resetar a senha de TODOS os usuários?"
   Clique em: OK
   ```

4. **Aguardar processamento**
   ```
   Log mostrará:
   - Processando cada usuário
   - Hash gerado para cada um
   - Salvando alterações no Firebase
   ```

5. **Verificar resumo**
   ```
   Resumo final deve mostrar:
   - ✅ Sucesso: X
   - ❌ Erros: 0
   - ⏭️ Pulados: Y
   - 📋 Total processado: Z
   ```

### Resultado Esperado
✅ **PASSOU** se:
- Todos os usuários foram processados
- Nenhum erro ocorreu
- Alterações salvas no Firebase

❌ **FALHOU** se:
- Erros durante processamento
- Falha ao salvar no Firebase

---

## Teste 5: Login com Admin

### Objetivo
Verificar que é possível fazer login com credenciais de administrador

### Passos

1. **Abrir dashboard**
   ```
   Navegue até: index.html
   Abra no navegador
   ```

2. **Verificar tela de login**
   ```
   Deve estar visível:
   - Logo Diversey
   - Campo "Usuário"
   - Campo "Senha"
   - Botão "Entrar"
   ```

3. **Preencher credenciais**
   ```
   Username: admin
   Senha: admin123
   ```

4. **Fazer login**
   ```
   Clique no botão: "Entrar"
   ```

5. **Verificar acesso**
   ```
   Você deve:
   - Ser redirecionado para o dashboard
   - Ver menu lateral com todas as opções
   - Ver nome "Administrador" no rodapé do menu
   - Ver perfil "Administrador"
   ```

6. **Verificar permissões**
   ```
   Menu deve incluir:
   - Dashboard
   - Aprovações
   - Solicitações
   - Técnicos
   - Fornecedores
   - Peças
   - Relatórios
   - Configurações
   ```

### Resultado Esperado
✅ **PASSOU** se:
- Login bem-sucedido
- Dashboard carregado
- Menu completo visível
- Perfil correto mostrado

❌ **FALHOU** se:
- Mensagem "Usuário não encontrado"
- Mensagem "Senha incorreta"
- Erro ao carregar dashboard

---

## Teste 6: Login com Gestor

### Objetivo
Verificar login com perfil de gestor

### Passos

1. **Fazer logout** (se ainda logado)
   ```
   Clique no ícone de saída (canto inferior do menu)
   ```

2. **Preencher credenciais de gestor**
   ```
   Username: gestor
   Senha: gestor123
   ```

3. **Fazer login**
   ```
   Clique no botão: "Entrar"
   ```

4. **Verificar acesso**
   ```
   Dashboard deve carregar com:
   - Nome "Gestor" no menu
   - Perfil "Gestor"
   - Menu com opções de gestor
   ```

5. **Verificar permissões limitadas**
   ```
   Menu inclui visualização mas pode ter ações limitadas:
   - Dashboard (leitura)
   - Aprovações (aprovar/rejeitar)
   - Solicitações (visualizar todas)
   - Relatórios (visualizar/exportar)
   ```

### Resultado Esperado
✅ **PASSOU** se:
- Login bem-sucedido
- Perfil "Gestor" visível
- Menu apropriado para gestor

❌ **FALHOU** se:
- Erro de login
- Permissões incorretas

---

## Teste 7: Login com Técnico

### Objetivo
Verificar login com perfil de técnico

### Passos

1. **Fazer logout**
   ```
   Clique no ícone de saída
   ```

2. **Preencher credenciais de técnico**
   ```
   Username: tecnico
   Senha: tecnico123
   ```

3. **Fazer login**
   ```
   Clique no botão: "Entrar"
   ```

4. **Verificar acesso**
   ```
   Dashboard deve carregar com:
   - Nome "Técnico" no menu
   - Perfil "Técnico"
   - Menu simplificado
   ```

5. **Verificar menu de técnico**
   ```
   Menu deve incluir:
   - Nova Solicitação
   - Minhas Solicitações
   - Catálogo de Peças
   - Ajuda
   - Meu Perfil
   ```

### Resultado Esperado
✅ **PASSOU** se:
- Login bem-sucedido
- Menu de técnico visível
- Acesso limitado às próprias solicitações

❌ **FALHOU** se:
- Erro de login
- Menu incorreto

---

## Teste 8: Teste de Autenticação

### Objetivo
Usar ferramenta de diagnóstico para testar credenciais

### Passos

1. **Abrir ferramenta de diagnóstico**
   ```
   Navegue até: scripts/diagnose-auth.html
   ```

2. **Executar diagnóstico completo**
   ```
   Clique em: "Executar Diagnóstico"
   ```

3. **Testar credenciais de Admin**
   ```
   Na seção "Testar Autenticação":
   Username: admin
   Senha: admin123
   Clique em: "Testar Login"
   ```

4. **Verificar resultado**
   ```
   Deve aparecer mensagem verde:
   "✅ Autenticação Bem-Sucedida!"
   Usuário: admin
   Role: administrador
   Senha está correta e hash corresponde.
   ```

5. **Testar outros usuários**
   ```
   Repita para:
   - gestor / gestor123
   - tecnico / tecnico123
   ```

### Resultado Esperado
✅ **PASSOU** se:
- Todos os testes de autenticação passaram
- Mensagens de sucesso para cada usuário
- Hashes correspondem

❌ **FALHOU** se:
- Mensagem "Senha incorreta"
- Hashes não correspondem

---

## Teste 9: Validação de Hashes

### Objetivo
Confirmar que hashes SHA-256 estão corretos

### Passos

1. **Abrir diagnóstico**
   ```
   scripts/diagnose-auth.html
   ```

2. **Executar diagnóstico**
   ```
   Clique em: "Executar Diagnóstico"
   ```

3. **Verificar hashes na tabela**
   ```
   Para cada usuário, hash deve começar com:
   - admin: 240be518fabd...
   - gestor: 8c6976e5b541...
   - tecnico: ee26b0dd4af7...
   ```

4. **Comparar hashes completos**
   ```
   Hover sobre hash na tabela para ver completo
   
   Hashes esperados:
   admin123 → 240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9
   gestor123 → 8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918
   tecnico123 → ee26b0dd4af7e749aa1a8ee3c10ae9923f618980772e473f8819a5d4940e0db2
   ```

### Resultado Esperado
✅ **PASSOU** se:
- Todos os hashes correspondem aos esperados
- Formato SHA-256 (64 caracteres hexadecimais)

❌ **FALHOU** se:
- Hashes diferentes
- Formato incorreto

---

## Checklist Final

Use esta checklist para confirmar que tudo está funcionando:

### Ferramentas
- [ ] `diagnose-auth.html` conecta ao Firebase
- [ ] `diagnose-auth.html` lista usuários
- [ ] `diagnose-auth.html` testa autenticação
- [ ] `seed-users.html` cria usuários
- [ ] `fix-passwords.html` conecta ao Firebase
- [ ] `fix-passwords.html` reseta senhas individuais
- [ ] `fix-passwords.html` reseta todas as senhas

### Firebase
- [ ] Firebase Realtime Database está acessível
- [ ] Caminho `data/diversey_users` existe
- [ ] Usuários têm campo `passwordHash`
- [ ] Hashes SHA-256 estão corretos
- [ ] Estrutura de dados está correta

### Autenticação
- [ ] Login com admin/admin123 funciona
- [ ] Login com gestor/gestor123 funciona
- [ ] Login com tecnico/tecnico123 funciona
- [ ] Perfis são exibidos corretamente
- [ ] Menus são filtrados por role
- [ ] Logout funciona

### Sistema
- [ ] Sem erros no console do navegador
- [ ] Código de autenticação (auth.js) funciona
- [ ] Mensagens de erro são claras
- [ ] Documentação está completa
- [ ] Testes passam todos

### Segurança
- [ ] Senhas não são armazenadas em texto plano
- [ ] Hashes incluem salt por usuário
- [ ] Rate limiting funciona (trava após 5 tentativas)
- [ ] Usuários desabilitados não conseguem logar

---

## 📊 Relatório de Testes

Use este template para documentar seus resultados:

```
Data do Teste: _______________
Testador: _______________

Teste 1 (Diagnóstico): [ ] PASSOU [ ] FALHOU
Teste 2 (Seed): [ ] PASSOU [ ] FALHOU
Teste 3 (Reset Individual): [ ] PASSOU [ ] FALHOU
Teste 4 (Reset Todos): [ ] PASSOU [ ] FALHOU
Teste 5 (Login Admin): [ ] PASSOU [ ] FALHOU
Teste 6 (Login Gestor): [ ] PASSOU [ ] FALHOU
Teste 7 (Login Técnico): [ ] PASSOU [ ] FALHOU
Teste 8 (Teste Auth): [ ] PASSOU [ ] FALHOU
Teste 9 (Hashes): [ ] PASSOU [ ] FALHOU

Observações:
_________________________________
_________________________________
_________________________________

Problemas Encontrados:
_________________________________
_________________________________
_________________________________
```

---

## 🐛 Problemas Comuns e Soluções

### Problema: Teste 1 falha - Firebase não conecta
**Solução:**
1. Verifique conexão com internet
2. Abra F12 e veja erros no console
3. Confirme configuração do Firebase

### Problema: Teste 5/6/7 falha - "Senha incorreta"
**Solução:**
1. Execute Teste 4 (Reset Todos)
2. Aguarde conclusão
3. Tente login novamente

### Problema: Teste 2 falha - Não cria usuários
**Solução:**
1. Verifique permissões do Firebase
2. Confirme que database está em modo de teste
3. Veja console para erros específicos

---

**Última atualização:** 2026-01-01
**Versão:** 1.0
