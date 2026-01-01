# 🚀 Deployment Security Checklist

## Antes do Deploy

### Variáveis de Ambiente
- [ ] Criar arquivo `.env` com valores reais
- [ ] Verificar que `.env` está no `.gitignore`
- [ ] Configurar secrets no GitHub Actions (se usar CI/CD)

### Firebase Console
- [ ] Fazer deploy das Security Rules: `firebase deploy --only database`
- [ ] Verificar Authentication providers habilitados
- [ ] Confirmar quotas e limites

### Código
- [ ] Remover credenciais hardcoded
- [ ] Verificar que DOMPurify está carregando
- [ ] Testar validação de formulários
- [ ] Confirmar rate limiting ativo

## Pós-Deploy

### Testes de Segurança
- [ ] Testar login com credenciais inválidas (verificar rate limit)
- [ ] Testar injeção de HTML em campos de texto
- [ ] Verificar CSP headers (F12 → Network → Headers)
- [ ] Confirmar que dados sensíveis não aparecem em logs

### Monitoramento
- [ ] Configurar alertas de erro no Firebase
- [ ] Monitorar uso de quota
- [ ] Revisar logs de autenticação

## Rotina de Manutenção

### Mensal
- [ ] Revisar logs de autenticação
- [ ] Verificar tentativas de brute force
- [ ] Atualizar dependências de segurança

### Trimestral
- [ ] Rotacionar senha do gestor bootstrap
- [ ] Revisar e atualizar Security Rules
- [ ] Audit de permissões de usuários

## Comandos de Deploy

```bash
# 1. Instalar dependências (se usar npm)
npm install dompurify

# 2. Deploy das Security Rules
firebase deploy --only database

# 3. Build e deploy do app
npm run build
firebase deploy --only hosting

# 4. Verificar
firebase hosting:channel:open live
```

## Testes de Segurança

### 1. Teste de XSS
Tentar inserir em campo de texto:
```html
<script>alert('XSS')</script>
<img src=x onerror=alert('XSS')>
```
**Esperado:** Script não executa, HTML sanitizado

### 2. Teste de Rate Limiting
- Fazer 5 logins com senha errada
- Verificar mensagem de bloqueio
- Aguardar 15 minutos ou resetar cache

### 3. Teste de Security Rules
- Tentar acessar dados sem autenticação
- Tentar modificar dados de outro usuário
- Verificar permissões por role

## Validação de Headers

Abrir DevTools (F12) → Network → Selecionar recurso → Headers

Verificar presença de:
- `Content-Security-Policy`
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`

## Troubleshooting

### DOMPurify não carrega
1. Verificar se script está no `<head>` do `index.html`
2. Verificar integridade do CDN
3. Testar fallback em `sanitizer.js`

### Rate limiting não funciona
1. Verificar se `rate-limiter.js` está carregado antes de `auth.js`
2. Verificar console para erros
3. Cache é em memória (reseta ao recarregar página)

### CSP bloqueia recursos
1. Adicionar domínio necessário ao `firebase.json`
2. Evitar inline scripts quando possível
3. Usar nonces ou hashes para scripts críticos

## Contato

Para suporte técnico: devops@diversey.com
