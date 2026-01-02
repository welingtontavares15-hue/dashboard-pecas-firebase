# 📖 Instruções de Login - Dashboard Diversey

## 🎯 Objetivo
Este guia explica como usar as ferramentas de autenticação e fazer login no sistema Dashboard de Peças Diversey.

---

## 🔧 Ferramentas Disponíveis

O sistema possui ferramentas na pasta `scripts/`:

### 1. 🔍 `diagnose-auth.html` - Diagnóstico de Autenticação
**Use quando:** Precisar verificar o estado dos usuários e testar senhas

**Funcionalidades:**
- Conecta ao Firebase Realtime Database
- Lista todos os usuários cadastrados
- Mostra informações de cada usuário (role, email, status do hash)
- Permite testar login com username e senha
- Identifica problemas de configuração

**Como usar:**
1. Abra o arquivo `scripts/diagnose-auth.html` no navegador
2. Clique em "Executar Diagnóstico"
3. Verifique a lista de usuários
4. Para testar login:
   - Digite username e senha
   - Clique em "Testar Login"
   - O sistema mostrará se a autenticação foi bem-sucedida

### 2. 🔐 `reset-user-passwords.html` - Resetar Senhas (Ferramenta Principal)
**Use quando:** Esquecer senha ou precisar resetar credenciais

**Funcionalidades:**
- Conecta ao Firebase com autenticação
- Reseta senha de um usuário específico
- Usa hashes SHA-256 corretos
- Mantém as senhas padrão do ambiente (produção ou desenvolvimento)

**Como usar:**
1. Abra o arquivo `scripts/reset-user-passwords.html` no navegador
2. Clique em "Conectar Firebase"
3. Aguarde conexão ser estabelecida
4. Escolha o usuário para resetar
5. Confirme a operação

### 3. Outras Ferramentas
- `seed-users.html` - Cria usuários iniciais (desenvolvimento)
- `fix-passwords.html` - Correção de senhas (legado)
- `reset-passwords.html` - Reset de senhas (legado)

---

## 🔐 Credenciais Padrão

### ⚠️ IMPORTANTE: Diferença entre Ambientes

O sistema utiliza **senhas diferentes** conforme o ambiente configurado em `js/config.js`:

#### 🔧 Modo Desenvolvimento (`environment: 'development'`)

Usado para testes locais e desenvolvimento:

**Administrador:**
```
Username: admin
Senha: admin123
```

**Gestor:**
```
Username: gestor
Senha: gestor123
```

**Permissões:**
- Admin: Acesso completo ao sistema, gestão de usuários, configurações
- Gestor: Aprovação de solicitações, visualização de relatórios

#### 🚀 Modo Produção (`environment: 'production'`)

Usado em deploy de produção com senhas mais complexas:

**Administrador:**
```
Username: admin
Senha: AdminRecovery2025!
```

**Gestor:**
```
Username: gestor
Senha: GestorRecovery2025!
```

**Permissões:**
- Admin: Acesso completo ao sistema, gestão de usuários, configurações
- Gestor: Aprovação de solicitações, visualização de relatórios

> **Nota de Segurança**: 
> - As senhas de produção são mais complexas por segurança
> - É altamente recomendado alterar essas senhas após o primeiro login
> - Use senhas fortes com pelo menos 12 caracteres
> - Inclua letras maiúsculas, minúsculas, números e símbolos
> - O sistema identifica automaticamente o ambiente e aplica a senha correta

#### 📋 Como Identificar o Ambiente

1. Abra o console do navegador (F12)
2. Digite: `APP_CONFIG.environment`
3. Retornará: `'development'` ou `'production'`

Ou verifique no arquivo `js/config.js`:
```javascript
const APP_CONFIG = {
    environment: 'production',  // ou 'development'
    // ...
}
```

---

## 🚀 Como Fazer Login

### Passo 1: Identificar o Ambiente
1. Verifique se está em produção ou desenvolvimento
2. Use as credenciais correspondentes (veja seção "Credenciais Padrão" acima)

### Passo 2: Acessar o Dashboard
1. Abra `index.html` no navegador
2. Você verá a tela de login

### Passo 3: Fazer Login
1. Digite o username (ex: `admin`)
2. Digite a senha correspondente ao ambiente:
   - Desenvolvimento: `admin123`
   - Produção: `AdminRecovery2025!`
3. Clique em "Entrar"

### Passo 4: Confirmar Acesso
- Se bem-sucedido, você será direcionado ao dashboard
- O menu lateral mostrá opções baseadas no seu perfil

---

## 🔄 Procedimento de Reset de Senhas

### Ferramenta Principal: reset-user-passwords.html

Esta é a ferramenta recomendada para reset de senhas, pois:
- ✅ Conecta ao Firebase com autenticação adequada
- ✅ Identifica automaticamente o ambiente (produção/desenvolvimento)
- ✅ Aplica a senha correta baseada no ambiente
- ✅ Usa a fórmula canônica de hash
- ✅ Atualiza o campo `updatedAt` do usuário

### Como Usar:

1. **Abrir a ferramenta:**
   ```
   Abra scripts/reset-user-passwords.html no navegador
   ```

2. **Conectar ao Firebase:**
   - Clique em "Conectar Firebase"
   - Aguarde mensagem de confirmação

3. **Selecionar usuário:**
   - A ferramenta listará os usuários disponíveis
   - Selecione o usuário que deseja resetar

4. **Confirmar reset:**
   - Revise as informações
   - Confirme a operação
   - Aguarde a mensagem de sucesso

5. **Testar login:**
   - Use as credenciais do ambiente atual
   - Faça login no sistema principal

### Senhas Aplicadas Automaticamente:

A ferramenta identifica o ambiente e aplica:

| Usuário | Desenvolvimento | Produção |
|---------|----------------|----------|
| admin   | admin123       | AdminRecovery2025! |
| gestor  | gestor123      | GestorRecovery2025! |

### Fórmula do Hash

As senhas são sempre hasheadas usando:
```
SHA256(password + 'diversey_salt_v1:' + usernameCanonical)
```

Onde:
- `password` = senha em texto plano
- `diversey_salt_v1` = salt constante do sistema
- `usernameCanonical` = username normalizado (lowercase, sem acentos, apenas [a-z0-9.])

### Path do Firebase RTDB

Os usuários estão armazenados em:
```
data/diversey_users
```

---

## ❌ Troubleshooting - Problemas Comuns

### Problema: "Usuário não encontrado"
**Causa:** Usuário não existe no Firebase

**Solução:**
1. Execute `diagnose-auth.html` para ver usuários existentes
2. Se o usuário não estiver listado, contate o administrador
3. Em desenvolvimento, pode executar `seed-users.html` para criar usuários base

### Problema: "Senha incorreta"
**Causa:** Hash da senha não corresponde ou senha do ambiente errado

**Solução:**
1. Verifique se está usando a senha correta para o ambiente:
   - Desenvolvimento: use `admin123` ou `gestor123`
   - Produção: use `AdminRecovery2025!` ou `GestorRecovery2025!`
2. Se ainda não funcionar, execute `reset-user-passwords.html`:
   - Conecte ao Firebase
   - Selecione o usuário
   - Confirme o reset
   - Tente fazer login novamente com a senha do ambiente

### Problema: "Conta temporariamente bloqueada"
**Causa:** Muitas tentativas de login falhadas (proteção de segurança)

**Solução:**
- Aguarde 15 minutos
- Ou limpe o cache do navegador
- Ou use navegação anônima

### Problema: Firebase não conecta
**Causa:** Problema de rede ou configuração

**Solução:**
1. Verifique conexão com internet
2. Abra console do navegador (F12)
3. Verifique mensagens de erro
4. Confirme que Firebase está configurado corretamente em `js/firebase-init.js`
5. Sistema mostrará "Firebase SDK not loaded" se houver problema de carregamento

### Problema: Usuário desabilitado
**Causa:** Conta foi desativada por um administrador

**Solução:**
- Contate o administrador do sistema
- Ou acesse como administrador e reative a conta em Configurações > Gestores
- Ou acesse o Firebase Console diretamente

### Problema: Sistema mostra "Degradado" constantemente
**Causa:** Erros de sync repetidos quando Firebase está offline

**Solução:**
1. Verifique sua conexão com internet
2. Verifique se o Firebase está configurado corretamente
3. O sistema agora evita logs repetidos de erro
4. Status "Degradado" só aparece se houver erros reais, não apenas desconexões temporárias

---

## 🔒 Segurança

### Como as Senhas São Armazenadas
- As senhas são hasheadas com SHA-256
- O hash inclui um salt único por usuário baseado no username
- Salt padrão: `diversey_salt_v1`
- **Fórmula canônica**: `SHA256(password + 'diversey_salt_v1:' + usernameCanonical)`
  - O `usernameCanonical` é o username normalizado armazenado no registro do usuário
  - A normalização remove acentos, converte para minúsculas, e mantém apenas [a-z0-9.]

### Função Centralizada
O sistema utiliza uma função centralizada `Utils.computePasswordHash(password, usernameCanonical)` para garantir consistência em todo o código.

### Hashes Esperados
Para os usuários padrão com usernames normalizados:
```
admin123 (para username 'admin'):
  Fórmula: SHA256('admin123' + 'diversey_salt_v1:admin')

gestor123 (para username 'gestor'):
  Fórmula: SHA256('gestor123' + 'diversey_salt_v1:gestor')

tecnico123 (para username 'tecnico'):
  Fórmula: SHA256('tecnico123' + 'diversey_salt_v1:tecnico')
```

### Normalização de Username
O username é normalizado antes de ser usado no hash:
1. Converte para minúsculas
2. Remove acentos (NFD normalization)
3. Remove caracteres inválidos (mantém apenas a-z, 0-9, e ponto)
4. Colapsa múltiplos pontos consecutivos em um único ponto
5. Remove pontos no início e fim

Exemplos:
- `"Admin"` → `"admin"`
- `"Welington.Tavares."` → `"welington.tavares"`
- `"José.Silva"` → `"jose.silva"`

### Boas Práticas
1. ✅ Altere as senhas padrão em produção
2. ✅ Use senhas fortes (mínimo 8 caracteres)
3. ✅ Não compartilhe credenciais
4. ✅ Faça logout após usar o sistema
5. ✅ Verifique que está usando HTTPS em produção

---

## 📊 Estrutura do Firebase

### Localização dos Usuários
```
Firebase Realtime Database
└── data
    └── diversey_users
        └── data (array)
            ├── [0] { id, username, passwordHash, role, ... }
            ├── [1] { id, username, passwordHash, role, ... }
            └── ...
```

### Estrutura de um Usuário
```json
{
  "id": "l7x8k9m0...",
  "username": "admin",
  "passwordHash": "240be518fabd...",
  "role": "administrador",
  "email": "admin@diversey.com",
  "name": "Administrador",
  "disabled": false,
  "createdAt": 1234567890000,
  "updatedAt": 1234567890000
}
```

---

## 💡 Dicas Úteis

### Verificar se Tudo Está OK
1. Execute `diagnose-auth.html`
2. Clique em "Executar Diagnóstico"
3. Verifique se:
   - ✅ Firebase está conectado
   - ✅ Usuários foram carregados
   - ✅ Todos têm hash de senha
   - ✅ Status está "Ativo"

### Testar Senha Antes de Fazer Login
1. Use `diagnose-auth.html`
2. Digite username e senha
3. Clique em "Testar Login"
4. Se passar, faça login no sistema principal

### Resetar Sistema Completo
Se tiver muitos problemas:
1. Execute `seed-users.html` - Cria usuários limpos
2. Execute `diagnose-auth.html` - Verifica criação
3. Faça login no sistema principal

---

## 📞 Suporte

Se nenhuma solução funcionar:

1. **Verifique os logs:**
   - Abra o console do navegador (F12)
   - Vá para aba "Console"
   - Procure por mensagens de erro em vermelho

2. **Exporte os dados:**
   - Execute `diagnose-auth.html`
   - Copie o conteúdo do log
   - Compartilhe com o suporte técnico

3. **Acesse Firebase Console:**
   - Vá para console.firebase.google.com
   - Selecione o projeto "solicitacoes-de-pecas"
   - Navegue para Realtime Database
   - Verifique `data/diversey_users`

---

## ✅ Checklist de Funcionamento

Antes de considerar o sistema pronto:

### Desenvolvimento:
- [ ] Firebase conecta com sucesso
- [ ] Usuários existem no caminho `data/diversey_users`
- [ ] Todos os usuários têm `passwordHash`
- [ ] Hash SHA-256 está correto
- [ ] Login com admin/admin123 funciona
- [ ] Login com gestor/gestor123 funciona
- [ ] Sem erros repetidos no console do navegador
- [ ] Ferramenta `reset-user-passwords.html` funciona corretamente

### Produção:
- [ ] Firebase conecta com sucesso
- [ ] Usuários existem no caminho `data/diversey_users`
- [ ] Todos os usuários têm `passwordHash`
- [ ] Hash SHA-256 está correto
- [ ] Login com admin/AdminRecovery2025! funciona
- [ ] Login com gestor/GestorRecovery2025! funciona
- [ ] Sem erros repetidos no console do navegador
- [ ] Sistema não mostra "Degradado" desnecessariamente
- [ ] Ferramenta `reset-user-passwords.html` funciona corretamente

### Funcionalidades Gerais:
- [ ] Modal de Editar Gestor tem layout correto
- [ ] Alterar senha de gestor funciona
- [ ] Gestores podem ser criados/editados/excluídos
- [ ] CRUDs funcionam sem erros
- [ ] Relatórios carregam corretamente
- [ ] Aprovações funcionam

---

**Última atualização:** 2026-01-02
**Versão:** 2.0 - Review Completo
