# 🔐 Sistema de Autenticação - Resumo Técnico

## 📌 Visão Geral

Este documento descreve o sistema de autenticação completo do Dashboard de Peças Diversey, incluindo a arquitetura, implementação e ferramentas de manutenção.

## 🏗️ Arquitetura

### Stack Tecnológica
- **Frontend:** HTML5, JavaScript (ES6+)
- **Backend:** Firebase Realtime Database
- **Autenticação:** SHA-256 com salt por usuário
- **Armazenamento:** Firebase RTDB em `data/diversey_users`

### Estrutura de Dados

#### Localização no Firebase
```
Firebase Realtime Database
└── data
    └── diversey_users
        ├── data (array)
        ├── updatedAt (timestamp)
        └── updatedBy (string)
```

#### Estrutura de Usuário
```json
{
  "id": "l7x8k9m0n1p2",
  "username": "admin",
  "passwordHash": "c08ab1a7671509ccb5ecdf9868eb30df793ce5104b404d11cfa82d4b84029283",
  "role": "administrador",
  "email": "admin@diversey.com",
  "name": "Administrador",
  "disabled": false,
  "createdAt": 1704067200000,
  "updatedAt": 1704067200000
}
```

## 🔒 Segurança

### Hashing de Senhas

O sistema usa SHA-256 com salt personalizado por usuário:

```javascript
// Formato do hash
hash = SHA256(password + 'diversey_salt_v1:' + username)
```

**Exemplo:**
```javascript
// Para usuário 'admin' com senha 'admin123'
input = 'admin123' + 'diversey_salt_v1:' + 'admin'
hash = SHA256(input)
// Resultado: c08ab1a7671509ccb5ecdf9868eb30df793ce5104b404d11cfa82d4b84029283
```

### Hashes Padrão

| Username | Senha | Hash SHA-256 |
|----------|-------|--------------|
| admin | admin123 | c08ab1a7671509ccb5ecdf9868eb30df793ce5104b404d11cfa82d4b84029283 |
| gestor | gestor123 | ca762c2ec7cdcc2fb79450121aba3642873df25ed035810c8f6a12b76f9f42fa |
| tecnico | tecnico123 | e343cbd1e3d223ee96c21a2b18a61b10d35549cdecae770e36b2c598100f3c02 |

### Proteções de Segurança

1. **Rate Limiting**
   - Máximo de 5 tentativas de login
   - Bloqueio progressivo (15 min, 30 min, 1h, 2h, 4h, 8h, 24h)
   - Armazenado em memória (limpa ao recarregar página)

2. **Validação de Sessão**
   - Sessão expira em 8 horas
   - Validação contra dados mais recentes do Firebase
   - Verifica se usuário está ativo

3. **Normalização de Username**
   - Case-insensitive
   - Remove espaços extras
   - Previne duplicatas

## 📂 Arquivos do Sistema

### Código Principal

#### `js/auth.js`
Sistema de autenticação principal:
- Login/logout
- Verificação de permissões (RBAC)
- Gerenciamento de sessão
- Rate limiting
- Hashing de senhas

**Métodos principais:**
```javascript
Auth.login(username, password)      // Fazer login
Auth.logout()                         // Fazer logout
Auth.isLoggedIn()                     // Verificar se está logado
Auth.hasPermission(module, action)    // Verificar permissão
Auth.hashPassword(password, username) // Gerar hash
```

#### `js/utils.js`
Utilitários incluindo função de hash:
```javascript
Utils.hashSHA256(value, salt)  // Hash SHA-256
Utils.PASSWORD_SALT             // Salt padrão: 'diversey_salt_v1'
```

#### `js/data.js`
Gerenciamento de dados:
```javascript
DataManager.getUserByUsername(username)  // Buscar usuário
DataManager.normalizeUsername(username)  // Normalizar username
DataManager.getUsers()                    // Listar todos
```

#### `js/storage.js`
Integração com Firebase:
```javascript
CloudStorage.saveData(key, data)  // Salvar no Firebase
CloudStorage.loadData(key)         // Carregar do Firebase
CloudStorage.syncFromCloud()       // Sincronizar
```

### Ferramentas de Manutenção

#### `scripts/diagnose-auth.html`
**Propósito:** Diagnóstico completo do sistema de autenticação

**Funcionalidades:**
- Conecta ao Firebase RTDB
- Lista todos os usuários
- Mostra estrutura de cada usuário
- Valida presença de hashes
- Testa autenticação sem fazer login
- Logs detalhados

**Quando usar:**
- Troubleshooting de problemas de login
- Verificar estado dos usuários
- Confirmar hashes estão corretos
- Testar credenciais antes do login

#### `scripts/seed-users.html`
**Propósito:** Criar usuários padrão iniciais

**Funcionalidades:**
- Cria admin, gestor, tecnico
- Verifica duplicatas
- Gera hashes corretos
- Não sobrescreve existentes

**Quando usar:**
- Primeira configuração do sistema
- Após limpar banco de dados
- Criar ambiente de teste

#### `scripts/fix-passwords.html`
**Propósito:** Reset de senhas para valores padrão

**Funcionalidades:**
- Reset individual por usuário
- Reset em lote (todos)
- Conecta ao Firebase RTDB
- Atualiza hashes corretamente
- Logs detalhados de cada operação

**Quando usar:**
- Usuário esqueceu senha
- Hash corrompido/incorreto
- Resetar para configuração padrão
- Troubleshooting de autenticação

#### `scripts/reset-passwords.html` (Legado)
**Status:** ⚠️ Obsoleto - usa Firestore ao invés de RTDB

**Nota:** Use `fix-passwords.html` ao invés deste arquivo.

## 📖 Documentação

### `INSTRUCOES-LOGIN.md`
Guia completo para usuários finais:
- Como usar cada ferramenta
- Credenciais padrão
- Passo a passo para login
- Troubleshooting detalhado
- Estrutura do Firebase
- Boas práticas de segurança

### `TESTES.md`
Guia de testes abrangente:
- 9 casos de teste detalhados
- Procedimentos passo a passo
- Resultados esperados
- Checklist de validação
- Template de relatório
- Problemas comuns e soluções

## 🎯 Fluxo de Autenticação

### Login Normal

```
1. Usuário preenche username e senha
   ↓
2. Sistema normaliza username
   ↓
3. Verifica rate limiting
   ↓
4. Sincroniza usuários do Firebase
   ↓
5. Busca usuário por username
   ↓
6. Verifica se usuário existe e está ativo
   ↓
7. Gera hash da senha digitada
   ↓
8. Compara com hash armazenado
   ↓
9. Se válido: cria sessão, redireciona
10. Se inválido: registra falha, mostra erro
```

### Verificação de Sessão

```
1. Ao carregar página
   ↓
2. Lê sessão do sessionStorage
   ↓
3. Verifica expiração (8h)
   ↓
4. Busca dados atualizados no Firebase
   ↓
5. Valida se usuário ainda existe e está ativo
   ↓
6. Renova sessão se válido
7. Limpa sessão se inválido
```

## 🔧 Manutenção e Troubleshooting

### Problemas Comuns

#### 1. "Usuário não encontrado"

**Causa:** Usuário não existe no Firebase

**Diagnóstico:**
```bash
1. Abrir scripts/diagnose-auth.html
2. Executar diagnóstico
3. Verificar lista de usuários
```

**Solução:**
```bash
1. Abrir scripts/seed-users.html
2. Clicar "Criar Usuários Padrão"
3. Aguardar conclusão
```

#### 2. "Senha incorreta"

**Causa:** Hash não corresponde

**Diagnóstico:**
```bash
1. Abrir scripts/diagnose-auth.html
2. Executar diagnóstico
3. Testar autenticação com username/senha
4. Verificar se hash corresponde
```

**Solução:**
```bash
1. Abrir scripts/fix-passwords.html
2. Conectar ao Firebase
3. Resetar senha do usuário específico
4. Tentar login com senha padrão
```

#### 3. "Conta bloqueada"

**Causa:** Muitas tentativas falhadas

**Solução:**
- Aguardar tempo do bloqueio (15 min inicial)
- Ou limpar cache do navegador
- Ou usar navegação anônima

#### 4. Firebase não conecta

**Causa:** Problema de rede ou configuração

**Diagnóstico:**
```bash
1. Abrir console do navegador (F12)
2. Verificar erros na aba Console
3. Verificar aba Network
```

**Solução:**
1. Verificar internet
2. Confirmar Firebase config está correta
3. Verificar regras do Firebase permitem acesso

### Comandos Úteis

#### Verificar hash de uma senha
```javascript
// No console do navegador (após carregar página)
const password = 'admin123';
const username = 'admin';
const salt = 'diversey_salt_v1';
const input = password + salt + ':' + username;
const encoder = new TextEncoder();
const data = encoder.encode(input);
crypto.subtle.digest('SHA-256', data).then(hashBuffer => {
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    console.log('Hash:', hashHex);
});
```

#### Limpar sessão manualmente
```javascript
// No console do navegador
sessionStorage.removeItem('diversey_current_user');
location.reload();
```

#### Ver usuário atual
```javascript
// No console do navegador
console.log(JSON.parse(sessionStorage.getItem('diversey_current_user')));
```

## 🚀 Guia de Início Rápido

### Setup Inicial (Nova Instalação)

1. **Criar usuários padrão**
   ```
   Abra: scripts/seed-users.html
   Clique: "Criar Usuários Padrão"
   ```

2. **Verificar criação**
   ```
   Abra: scripts/diagnose-auth.html
   Clique: "Executar Diagnóstico"
   ```

3. **Fazer login**
   ```
   Abra: index.html
   Username: admin
   Senha: admin123
   ```

### Reset Completo (Problemas)

1. **Reset todas as senhas**
   ```
   Abra: scripts/fix-passwords.html
   Clique: "Conectar Firebase"
   Clique: "Resetar Todos"
   ```

2. **Verificar reset**
   ```
   Abra: scripts/diagnose-auth.html
   Teste autenticação com senhas padrão
   ```

3. **Fazer login**
   ```
   Use credenciais padrão
   ```

## 📊 Permissões por Role

### Administrador
- ✅ Acesso completo ao sistema
- ✅ Criar, editar, deletar tudo
- ✅ Gerenciar usuários
- ✅ Configurações do sistema

### Gestor
- ✅ Visualizar dashboard
- ✅ Aprovar/rejeitar solicitações
- ✅ Ver todas as solicitações
- ✅ Exportar relatórios
- ❌ Criar/editar cadastros
- ❌ Configurações do sistema

### Técnico
- ✅ Criar solicitações
- ✅ Ver suas próprias solicitações
- ✅ Consultar catálogo de peças
- ❌ Ver solicitações de outros
- ❌ Aprovar solicitações
- ❌ Acesso a relatórios

## 🔍 Referências de Código

### Hash de Senha
```javascript
// auth.js linha 113-115
async hashPassword(password, username = '') {
    return Utils.hashSHA256(password, `${Utils.PASSWORD_SALT}:${username}`);
}

// utils.js linha 23-36
async hashSHA256(value, salt = '') {
    const text = String(value || '');
    const input = text + salt;
    const cryptoObj = (typeof window !== 'undefined' && window.crypto) || 
                      (typeof crypto !== 'undefined' ? crypto : null);
    if (!cryptoObj?.subtle) {
        throw new Error('Web Crypto not available for secure hashing');
    }
    const encoder = new TextEncoder();
    const buffer = await cryptoObj.subtle.digest('SHA-256', encoder.encode(input));
    return Array.from(new Uint8Array(buffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}
```

### Login
```javascript
// auth.js linha 170-351
async login(username, password) {
    // 1. Normalizar username
    const normalizedUsername = DataManager.normalizeUsername(username);
    
    // 2. Rate limiting
    const rateLimitCheck = this.checkRateLimit(normalizedUsername);
    if (!rateLimitCheck.allowed) { /* ... */ }
    
    // 3. Sync from cloud
    await DataManager.syncUsersFromCloud();
    
    // 4. Get user
    const user = DataManager.getUserByUsername(username);
    if (!user) { /* return error */ }
    if (user.disabled) { /* return error */ }
    
    // 5. Hash password and compare
    const passwordHash = await this.hashPassword(password, username);
    if (storedHash !== passwordHash) { /* return error */ }
    
    // 6. Create session
    this.currentUser = this.buildSessionUser(user);
    sessionStorage.setItem('diversey_current_user', JSON.stringify(this.currentUser));
    
    return { success: true, user: this.currentUser };
}
```

## ✅ Checklist de Funcionamento

Antes de considerar o sistema pronto:

### Firebase
- [ ] Firebase RTDB está acessível
- [ ] Caminho `data/diversey_users` existe
- [ ] Estrutura está correta (wrapper com array data)
- [ ] Permissões de leitura/escrita configuradas

### Usuários
- [ ] Usuários têm campo `passwordHash`
- [ ] Hashes estão no formato SHA-256 (64 chars hex)
- [ ] Todos os campos obrigatórios presentes
- [ ] Nenhum usuário tem `disabled: true`

### Ferramentas
- [ ] diagnose-auth.html conecta e lista usuários
- [ ] seed-users.html cria usuários com sucesso
- [ ] fix-passwords.html reseta senhas corretamente
- [ ] Todas as ferramentas mostram logs claros

### Autenticação
- [ ] Login com admin/admin123 funciona
- [ ] Login com gestor/gestor123 funciona
- [ ] Login com tecnico/tecnico123 funciona
- [ ] Mensagens de erro são claras
- [ ] Rate limiting funciona após 5 tentativas

### Sistema
- [ ] Sem erros no console do navegador
- [ ] Sessão persiste em sessionStorage
- [ ] Logout limpa sessão corretamente
- [ ] Permissões RBAC funcionam
- [ ] Menu é filtrado por role

## 📞 Suporte

### Logs e Debug

Para coletar informações para suporte:

1. **Console do navegador**
   ```
   F12 → Console tab
   Copiar todos os logs vermelhos
   ```

2. **Diagnóstico completo**
   ```
   scripts/diagnose-auth.html
   Copiar todo o log da ferramenta
   ```

3. **Estado atual**
   ```javascript
   // No console
   console.log('User:', sessionStorage.getItem('diversey_current_user'));
   console.log('Rate limits:', Auth.getAttempts());
   ```

### Contato

- **Documentação:** Ver `INSTRUCOES-LOGIN.md` e `TESTES.md`
- **Firebase Console:** https://console.firebase.google.com
- **Projeto:** solicitacoes-de-pecas

---

**Última atualização:** 2026-01-01  
**Versão do Sistema:** 5.0  
**Autor:** Diversey Development Team
