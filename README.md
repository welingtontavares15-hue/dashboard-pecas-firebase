# Dashboard de Solicitações de Peças - Diversey

Sistema web/PWA offline-first para gerenciamento de solicitações de peças com sincronização Firebase.

## 🚀 Quick Start

### Pré-requisitos
- Node.js (para desenvolvimento local)
- Navegador web moderno
- Acesso à internet (para sincronização Firebase)

### Configuração Rápida

1. **Habilitar Autenticação Anônima no Firebase Console**
   ```
   - Acesse: https://console.firebase.google.com/
   - Projeto: solicitacoes-de-pecas
   - Vá em: Authentication → Sign-in method
   - Habilite: Anonymous provider
   - Salve as mudanças
   ```

2. **Verificar Regras do Banco de Dados**
   ```json
   {
     "rules": {
       "data": {
         ".read": "auth != null",
         ".write": "auth != null"
       }
     }
   }
   ```

3. **Testar Conexão Firebase**
   ```bash
   # Teste via web (recomendado)
   npm run healthcheck:web
   
   # Ou informações via CLI
   npm run healthcheck
   ```

4. **Executar a Aplicação**
   ```bash
   # Iniciar servidor de desenvolvimento
   npx http-server -p 8080
   
   # Abrir no navegador
   # macOS: open http://localhost:8080
   # Windows: start http://localhost:8080
   # Linux: xdg-open http://localhost:8080
   # Ou abra manualmente: http://localhost:8080
   ```

## 📋 Variáveis de Ambiente

### Firebase Configuration

As configurações do Firebase estão definidas em `js/firebase-init.js`. Para sobrescrever, você pode definir estas variáveis:

```javascript
// Configuração padrão (já configurada no código)
FIREBASE_API_KEY="AIzaSyD0Z56ZTk2cBg8xWI12j8s67de9oIMJ2Y0"
FIREBASE_AUTH_DOMAIN="solicitacoes-de-pecas.firebaseapp.com"
FIREBASE_DATABASE_URL="https://solicitacoes-de-pecas-default-rtdb.firebaseio.com"
FIREBASE_PROJECT_ID="solicitacoes-de-pecas"
FIREBASE_STORAGE_BUCKET="solicitacoes-de-pecas.firebasestorage.app"
FIREBASE_MESSAGING_SENDER_ID="782693023312"
FIREBASE_APP_ID="1:782693023312:web:f22340c11c8c96cd4e9b55"
```

> **Nota de Segurança**: Firebase API keys são seguras para exposição em aplicações client-side. A segurança é garantida através das Firebase Security Rules no servidor. Para produção, certifique-se de que as regras de segurança estão adequadamente configuradas.

### Estrutura do Banco de Dados

Todos os dados são armazenados sob o prefixo `/data/`:

```
/data
  /diversey_users         → Contas de usuário
  /diversey_tecnicos      → Cadastro de técnicos
  /diversey_fornecedores  → Cadastro de fornecedores
  /diversey_pecas         → Catálogo de peças
  /diversey_solicitacoes  → Solicitações de peças
  /diversey_settings      → Configurações do sistema
  /healthcheck            → Dados de teste de conexão
```

## 🔧 Comandos NPM Disponíveis

```bash
# Testes
npm test              # Executar testes unitários
npm run test:watch    # Executar testes em modo watch

# Linting
npm run lint          # Corrigir problemas de código
npm run lint:check    # Apenas verificar problemas

# Healthcheck Firebase
npm run healthcheck       # Informações de configuração
npm run healthcheck:web   # Teste completo via navegador
```

## 📖 Passo a Passo de Configuração

### 1. Primeiro Acesso

Ao abrir a aplicação pela primeira vez:

1. O Firebase SDK v9 será carregado automaticamente
2. Autenticação anônima será executada (`signInAnonymously`)
3. Conexão com Realtime Database será estabelecida
4. Dados serão sincronizados de `/data/*`

Você verá no console do navegador (F12):
```
✓ Firebase initialized successfully
✓ Firebase authenticated successfully (anonymous)
✓ CloudStorage initialized with Firebase and authenticated
✓ Firebase connection status: Connected
```

### 2. Teste de Healthcheck

Execute o healthcheck para verificar se tudo está funcionando:

**Opção A: Via Navegador (Recomendado)**
```bash
npm run healthcheck:web
```

Isso abrirá `firebase-healthcheck.html` que testa:
- ✅ Carregamento do Firebase SDK
- ✅ Inicialização do Firebase
- ✅ Autenticação Anônima
- ✅ Conexão com o banco
- ✅ Escrita em `/data/healthcheck`
- ✅ Leitura de `/data/healthcheck`

**Opção B: Via Terminal**
```bash
npm run healthcheck
```

Mostra informações de configuração e troubleshooting.

### 3. Login na Aplicação

> **⚠️ IMPORTANTE - Segurança de Credenciais**:
> - Credenciais padrão existem apenas para desenvolvimento e testes locais
> - **NUNCA** use credenciais padrão em produção
> - Para obter acesso, contate o administrador do sistema
> - Consulte o arquivo `CREDENCIAIS.md` (não versionado) para credenciais de ambiente específicas

**Ambiente de Produção**:
- Credenciais devem ser provisionadas pelo administrador
- Sistema de gerenciamento de usuários está disponível para gestores
- Todas as credenciais usam hash SHA-256 para segurança

### 4. Estrutura da Aplicação

```
dashboard-pecas-firebase/
├── index.html                 # Página principal
├── firebase-healthcheck.html  # Página de teste Firebase
├── healthcheck.js            # Script CLI de healthcheck
├── package.json              # Dependências e scripts
├── js/
│   ├── firebase-init.js      # Inicialização centralizada do Firebase
│   ├── storage.js            # Camada de armazenamento em nuvem
│   ├── data.js               # Gerenciamento de dados
│   ├── auth.js               # Autenticação de usuários
│   └── ...                   # Outros módulos
├── css/
│   └── style.css             # Estilos da aplicação
└── docs/
    ├── QUICKSTART.md         # Guia de início rápido
    ├── FIREBASE-SETUP.md     # Documentação detalhada do Firebase
    └── ...                   # Outras documentações
```

## 🔒 Segurança

### Autenticação Atual

A aplicação usa **Firebase Anonymous Authentication**:
- Autenticação automática ao carregar a página
- Não requer ação do usuário
- Necessária para atender às regras de segurança (`auth != null`)

### Regras do Realtime Database

```json
{
  "rules": {
    "data": {
      ".read": "auth != null",
      ".write": "auth != null"
    }
  }
}
```

### Considerações para Produção

Para ambientes de produção, considere:

1. **Autenticação Customizada**: Migrar de anonymous para autenticação real (OAuth2/OIDC)
2. **Regras Mais Restritivas**: Implementar controle baseado em roles
3. **Firebase App Check**: Proteger contra clientes não autorizados
4. **Monitoramento**: Configurar alertas de uso e quotas
5. **Backups**: Implementar backups automatizados regulares

## 🐛 Troubleshooting

### Erro: PERMISSION_DENIED

**Causa**: Autenticação anônima não está habilitada

**Solução**:
1. Acesse Firebase Console
2. Vá em Authentication → Sign-in method
3. Habilite o provedor "Anonymous"
4. Aguarde alguns segundos para propagação

### Erro: Connection Timeout

**Causa**: Problemas de rede ou projeto Firebase inativo

**Solução**:
1. Verifique sua conexão com internet
2. Confirme que o projeto Firebase está ativo
3. Limpe o cache do navegador
4. Tente novamente

### Erro: Authentication Failed

**Causa**: Autenticação não completa

**Solução**:
1. Verifique se Anonymous Auth está habilitado
2. Confirme que a API key está correta
3. Verifique se o projeto não atingiu limites de quota

### Dados não sincronizam

**Causa**: Modo online-only requer conexão

**Solução**:
1. Verifique conexão com internet
2. Veja console do navegador para erros
3. Execute `npm run healthcheck:web` para diagnóstico
4. Confirme que Firebase está acessível

## 📚 Documentação Adicional

- [QUICKSTART.md](QUICKSTART.md) - Guia rápido de início
- [FIREBASE-SETUP.md](FIREBASE-SETUP.md) - Configuração detalhada do Firebase
- [FIREBASE-CONSOLE-SETUP.md](FIREBASE-CONSOLE-SETUP.md) - Setup via console Firebase
- [DEPLOYMENT.md](DEPLOYMENT.md) - Guia de implantação
- [PRODUCTION-CHECKLIST.md](PRODUCTION-CHECKLIST.md) - Checklist para produção

## 🏗️ Arquitetura

### Fluxo de Dados

```
Navegador do Usuário
    ↓
Firebase Web SDK v9 (modular)
    ↓
signInAnonymously (automático)
    ↓
Firebase Realtime Database
    ↓
/data/diversey_* (coleções)
    ↓
DataManager (cache de sessão)
    ↓
Interface da Aplicação
```

### Módulos Principais

- **firebase-init.js**: Inicialização centralizada do Firebase
- **storage.js**: Wrapper do CloudStorage com Firebase v9
- **data.js**: Gerenciador de dados com cache de sessão
- **auth.js**: Sistema de autenticação local (usuário/senha)
- **app.js**: Controlador principal da aplicação

### Modo Online-Only

A aplicação opera em **modo online-only**:
- Escritas requerem conexão ativa
- Leituras são da nuvem ou cache de sessão
- Sem fila de operações offline
- Bloqueio automático quando offline

## 🤝 Contribuindo

Para contribuir com o projeto:

1. Clone o repositório
2. Crie uma branch para sua feature
3. Execute os testes: `npm test`
4. Execute o linter: `npm run lint`
5. Faça commit das mudanças
6. Abra um Pull Request

## 📄 Licença

MIT License - veja o arquivo LICENSE para detalhes

## 🆘 Suporte

Para problemas ou dúvidas:

1. Verifique a documentação em `/docs`
2. Execute `npm run healthcheck:web` para diagnóstico
3. Consulte os logs do navegador (F12 → Console)
4. Revise a documentação oficial do Firebase

---

**Versão**: 1.0.0  
**Última Atualização**: Dezembro 2024  
**Desenvolvido para**: Diversey - A Solenis Company
