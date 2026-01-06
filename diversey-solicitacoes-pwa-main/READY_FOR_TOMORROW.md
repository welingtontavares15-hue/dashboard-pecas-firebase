# Ready for Tomorrow - Checklist rápido

Use esta lista na manhã da operação para confirmar que o painel está pronto:

1. **Acesso Firebase**
   - Variáveis de ambiente/API keys carregadas
   - Service account disponível localmente (`GOOGLE_APPLICATION_CREDENTIALS` ou `FIREBASE_SERVICE_ACCOUNT_BASE64`)
2. **Saúde do app**
   - `npm ci`
   - `npm run healthcheck` (terminal) ou `npm run healthcheck:web` para abrir `/firebase-healthcheck.html`
3. **Sincronização e gestores**
   - Criar gestor de teste e confirmar que ele permanece após atualizar a página
   - Abrir em outra aba/navegador e validar que o novo gestor aparece
4. **Limpeza de dados de teste**
   - Dry-run: `npm run cleanup:test:dry`
   - Se estiver correto, aplicar: `npm run cleanup:test`
5. **Regras e produção**
   - RTDB regras ativas exigindo `auth != null`
   - Offline/erro de nuvem não quebra a UI (ver console por erros)
6. **Exportações e solicitações**
   - Criar solicitação e exportar (CSV/PDF/Excel) para garantir rotas funcionando
7. **Logs**
   - Ver painel de saúde (Configurações) para erros e limpar logs se necessário
8. **Deploy**
   - Confirmar PWA/manifest/service-worker carregados (modo offline básico)
