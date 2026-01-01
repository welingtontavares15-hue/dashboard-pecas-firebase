## Credenciais de Acesso - Dashboard de Peças

### Produção
- Autenticação via IdP (OAuth2/OIDC — Entra ID/Google).  
- Solicite inclusão ao time de identidade/segurança.  
- Nenhuma senha padrão é publicada ou distribuída por este repositório.

### Usuário de Recuperação "gestor"
O sistema possui uma conta especial `gestor` para recuperação de acesso em emergências.

**Configuração da senha recovery:**
1. A senha do usuário `gestor` deve ser definida durante o deploy
2. Defina via variável global no `index.html` ANTES de carregar os scripts:
   ```html
   <script>
     window.DIVERSEY_BOOTSTRAP_GESTOR_PASSWORD = 'SuaSenhaForteAqui';
   </script>
   ```
3. Ou defina em `js/config.js`:
   ```javascript
   APP_CONFIG.security.bootstrap.gestorPassword = 'SuaSenhaForteAqui';
   ```

**Segurança:**
- Esta senha deve ser forte e única
- Deve ser rotacionada regularmente (atualize e re-publique)
- Mantenha registrada em sistema seguro de gerenciamento de credenciais
- NÃO comite a senha em repositórios públicos
- Se não configurada, uma senha padrão será usada (NÃO RECOMENDADO para produção)

**Recuperação:**
- Para habilitar a UI de recuperação na tela de login, defina:
  ```javascript
  APP_CONFIG.security.enableRecovery = true;
  ```
- Recomenda-se deixar desabilitado em produção e habilitar apenas quando necessário

### Desenvolvimento / Homologação
- Ative `APP_CONFIG.environment = 'development'` para usar o mock local.
- As credenciais de teste ficam em cofre seguro; peça ao administrador responsável.
- O painel de credenciais da tela de login só aparece em dev/staging e é bloqueado em produção por flag de ambiente.

### Técnicos e Gestores
- Usuário no formato `nome.sobrenome` (minúsculas, sem acentos).
- Senhas são entregues individualmente e devem ser trocadas no primeiro acesso.
- Para reset de senha, acione o administrador; o envio é feito fora do repositório.

**Normalização de username:**
- O sistema agora normaliza usernames automaticamente, removendo:
  - Acentos e caracteres especiais
  - Pontos no início e no fim
  - Múltiplos pontos consecutivos
- Exemplo: `"welington.tavares."` é normalizado para `"welington.tavares"`

### Suporte
- Nome: Welington Tavares
- Email: wbastostavares@solenis.com
- Telefone: 62998124727
