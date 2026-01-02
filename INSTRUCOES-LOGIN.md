# 📖 Instruções de Login - Dashboard Diversey

## 🎯 Objetivo
Este guia explica como usar as ferramentas de autenticação e fazer login no sistema Dashboard de Peças Diversey.

---

## 🔧 Ferramentas Disponíveis

O sistema possui 3 ferramentas principais na pasta `scripts/`:

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

### 2. 🌱 `seed-users.html` - Criar Usuários Padrão
**Use quando:** Precisar criar usuários iniciais no sistema

**Funcionalidades:**
- Cria usuários padrão se não existirem
- Não sobrescreve usuários existentes
- Gera hashes SHA-256 automaticamente

**Usuários criados:**
| Username | Senha | Role | Email |
|----------|-------|------|-------|
| admin | admin123 | administrador | admin@diversey.com |
| gestor | gestor123 | gestor | gestor@diversey.com |
| tecnico | tecnico123 | tecnico | tecnico@diversey.com |

**Como usar:**
1. Abra o arquivo `scripts/seed-users.html` no navegador
2. Clique em "Criar Usuários Padrão"
3. Aguarde o processo completar
4. Verifique o log para confirmar criação

### 3. 🔐 `fix-passwords.html` - Resetar Senhas
**Use quando:** Esquecer senha ou precisar resetar credenciais

**Funcionalidades:**
- Reseta senha de um usuário específico
- Reseta senha de todos os usuários de uma vez
- Usa hashes SHA-256 corretos
- Mantém as senhas padrão

**Como usar:**
1. Abra o arquivo `scripts/fix-passwords.html` no navegador
2. Clique em "Conectar Firebase"
3. Aguarde conexão ser estabelecida
4. Escolha uma opção:
   - "Resetar Admin" - Reseta apenas admin
   - "Resetar Gestor" - Reseta apenas gestor
   - "Resetar Técnico" - Reseta apenas tecnico
   - "Resetar Todos" - Reseta todos de uma vez

---

## 🔐 Credenciais Padrão

### Modo Desenvolvimento (Development)

Após usar as ferramentas de seed ou reset, as credenciais padrão para desenvolvimento são:

#### Administrador
```
Username: admin
Senha: admin123
```
**Permissões:** Acesso completo ao sistema

#### Gestor
```
Username: gestor
Senha: gestor123
```
**Permissões:** Aprovação de solicitações, visualização de relatórios

#### Técnico
```
Username: tecnico
Senha: tecnico123
```
**Permissões:** Criar e gerenciar solicitações próprias

### Modo Produção (Production)

⚠️ **IMPORTANTE**: Em produção, o sistema utiliza senhas mais complexas para maior segurança:

#### Administrador (Produção)
```
Username: admin
Senha: AdminRecovery2025!
```
**Permissões:** Acesso completo ao sistema

#### Gestor (Produção)
```
Username: gestor
Senha: GestorRecovery2025!
```
**Permissões:** Aprovação de solicitações, visualização de relatórios

> **Nota de Segurança**: É altamente recomendado alterar essas senhas padrão após o primeiro login em produção. Use senhas fortes com pelo menos 12 caracteres, incluindo letras maiúsculas, minúsculas, números e símbolos.

---

## 🚀 Como Fazer Login

### Passo 1: Preparar o Sistema
Se for primeira vez ou tiver problemas:

1. Execute `seed-users.html` para criar usuários iniciais
   - OU -
2. Execute `fix-passwords.html` para resetar senhas existentes

### Passo 2: Acessar o Dashboard
1. Abra `index.html` no navegador
2. Você verá a tela de login

### Passo 3: Fazer Login
1. Digite o username (ex: `admin`)
2. Digite a senha (ex: `admin123`)
3. Clique em "Entrar"

### Passo 4: Confirmar Acesso
- Se bem-sucedido, você será direcionado ao dashboard
- O menu lateral mostrá opções baseadas no seu perfil

---

## ❌ Troubleshooting - Problemas Comuns

### Problema: "Usuário não encontrado"
**Causa:** Usuário não existe no Firebase

**Solução:**
1. Execute `diagnose-auth.html` para ver usuários existentes
2. Se vazio, execute `seed-users.html` para criar usuários
3. Tente fazer login novamente

### Problema: "Senha incorreta"
**Causa:** Hash da senha não corresponde

**Solução:**
1. Execute `fix-passwords.html`
2. Clique em "Conectar Firebase"
3. Clique no botão de reset do seu usuário
4. Use a senha padrão para fazer login

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
4. Confirme que Firebase está configurado corretamente

### Problema: Usuário desabilitado
**Causa:** Conta foi desativada

**Solução:**
- Contate o administrador do sistema
- Ou acesse o Firebase Console diretamente
- Ou use outro usuário com permissões de admin

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

- [ ] Firebase conecta com sucesso
- [ ] Usuários existem no caminho `data/diversey_users`
- [ ] Todos os usuários têm `passwordHash`
- [ ] Hash SHA-256 está correto
- [ ] Login com admin/admin123 funciona
- [ ] Login com gestor/gestor123 funciona
- [ ] Login com tecnico/tecnico123 funciona
- [ ] Sem erros no console do navegador
- [ ] Ferramentas de reset funcionam corretamente

---

**Última atualização:** 2026-01-01
**Versão:** 1.0
