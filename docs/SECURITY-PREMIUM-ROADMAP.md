# Segurança Premium — situação atual e roteiro recomendado

## Entregue nesta versão

- Sessões do portal limitadas a 8 horas e mantidas somente na aba do navegador (`sessionStorage`).
- Encerramento automático após 30 minutos sem atividade.
- Logout sincronizado entre abas.
- Mensagem de login genérica para reduzir enumeração de usuários.
- Limites explícitos de tamanho para usuário e senha.
- Content Security Policy, Permissions Policy e política de referrer aplicadas no documento.
- Proteção `noopener`/`noreferrer` para links externos.
- Indicadores visuais de sessão protegida.
- Nova camada visual Premium Ultra, responsiva e com melhor acessibilidade.

## Limite de segurança que permanece

O aplicativo ainda usa Firebase Anonymous Authentication e cria o registro de sessão RBAC a partir de dados calculados no navegador. Portanto, o frontend não pode ser considerado uma autoridade confiável para atribuir perfis administrativos.

As melhorias desta versão reduzem exposição e risco de sessão no navegador, mas não substituem autorização do lado servidor.

## Migração necessária para nível corporativo real

1. Substituir autenticação anônima por Firebase Authentication com contas individuais ou SSO/OIDC corporativo.
2. Atribuir perfis por Custom Claims usando ambiente administrativo confiável (Cloud Functions/Admin SDK).
3. Reescrever as regras do Realtime Database para usar `auth.token.role`, sem aceitar perfil gravado pelo cliente.
4. Remover hashes e cadastros de senha do Realtime Database.
5. Habilitar Firebase App Check.
6. Criar trilha de auditoria imutável no backend para login, aprovação, rejeição, edição e exportação.
7. Configurar cabeçalhos HTTP no Firebase Hosting, incluindo CSP em modo enforcement, HSTS, `X-Content-Type-Options` e `frame-ancestors`.
8. Adicionar testes automatizados das regras com Firebase Emulator Suite.

## Critério de conclusão

O sistema só deve ser classificado como autorização corporativa forte quando nenhum cliente puder criar ou elevar o próprio perfil, e todas as decisões de acesso forem derivadas de identidade validada e claims emitidas no servidor.
