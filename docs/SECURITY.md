# 🔒 Guia de Segurança

## Medidas Implementadas

### 1. Proteção contra XSS (Cross-Site Scripting)
- ✅ DOMPurify para sanitização de HTML
- ✅ Escape de texto em todas as renderizações
- ✅ CSP headers configurados

### 2. Proteção contra Brute Force
- ✅ Rate limiting progressivo (5 tentativas → lockout 15min)
- ✅ Bloqueio crescente (15min → 30min → 1h → 24h)
- ✅ Monitoramento de tentativas por usuário

### 3. Proteção de Dados
- ✅ Firebase Security Rules granulares por role
- ✅ Validação de campos obrigatórios
- ✅ Controle de acesso baseado em função

### 4. Proteção de Credenciais
- ✅ Senhas hasheadas com SHA-256
- ✅ Variáveis de ambiente para secrets
- ✅ .gitignore configurado

### 5. Headers de Segurança
- ✅ Content-Security-Policy
- ✅ X-Frame-Options: DENY
- ✅ X-Content-Type-Options: nosniff
- ✅ X-XSS-Protection

## Deploy de Regras de Segurança

```bash
# Deploy apenas das regras do database
firebase deploy --only database

# Verificar regras atuais
firebase database:get
```

## Checklist de Produção

- [ ] Atualizar `.env` com valores reais
- [ ] Remover console.log em produção (Vite faz automaticamente)
- [ ] Fazer deploy das Security Rules
- [ ] Testar rate limiting
- [ ] Validar CSP headers
- [ ] Testar sanitização em todos os formulários

## Módulos de Segurança

### Sanitizer (`js/security/sanitizer.js`)
Sanitiza inputs para prevenir XSS:
- `sanitizeHTML(dirty)` - Limpa HTML mantendo tags seguras
- `sanitizeText(text)` - Remove todas as tags HTML
- `sanitizeURL(url)` - Bloqueia URIs maliciosos
- `sanitizeObject(obj)` - Sanitiza objetos recursivamente

### RateLimiter (`js/security/rate-limiter.js`)
Protege contra brute force:
- `check(key, action)` - Verifica se ação é permitida
- `reset(key, action)` - Reseta contador após sucesso
- `cleanup()` - Remove entradas antigas do cache

### Validator (`js/security/validator.js`)
Validação de formulários:
- `validateField(value, rules)` - Valida campo individual
- `validateForm(formData, schema)` - Valida formulário completo
- Regras: required, email, minLength, maxLength, numeric, positiveNumber, username, noSpecialChars

## Exemplos de Uso

### Sanitização
```javascript
// Sanitizar HTML
const clean = Sanitizer.sanitizeHTML(userInput);

// Sanitizar texto puro
const text = Sanitizer.sanitizeText(userInput);

// Sanitizar URL
const safeUrl = Sanitizer.sanitizeURL(userProvidedUrl);
```

### Rate Limiting
```javascript
// Verificar antes de login
const check = RateLimiter.check(username, 'login');
if (!check.allowed) {
    throw new Error(check.message);
}

// Resetar após sucesso
RateLimiter.reset(username, 'login');
```

### Validação
```javascript
// Validar formulário
const validation = Validator.validateForm(
    { username, password },
    {
        username: ['required', ['minLength', 3], 'username'],
        password: ['required', ['minLength', 6]]
    }
);

if (!validation.valid) {
    console.error(validation.errors);
}
```

## Contato

Para reportar vulnerabilidades: security@diversey.com
