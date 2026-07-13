# Premium Ultra Experience

## Objetivo

Elevar o portal para uma experiência corporativa mais limpa, consistente, responsiva e segura sem alterar os fluxos operacionais existentes.

## Interface

- Hierarquia visual mais clara e redução de ruído.
- Superfícies, tabelas, formulários e modais com linguagem visual consistente.
- Login corporativo redesenhado.
- Melhor adaptação para notebooks, tablets e celulares.
- Estados de foco visíveis e suporte a navegação por teclado.
- Respeito a `prefers-reduced-motion` e melhorias de contraste.
- Atalho para pular diretamente ao conteúdo principal.

## Segurança no navegador

- Sessão limitada a 8 horas.
- Timeout por inatividade de 30 minutos.
- Sessão tab-scoped em vez de persistência de 30 dias no `localStorage`.
- Logout propagado entre abas.
- Respostas de autenticação menos informativas para reduzir enumeração.
- CSP e políticas restritivas de recursos do navegador.

## PWA

O cache foi versionado para `v41-premium-ultra-security`, incluindo as novas camadas visuais e de segurança, para garantir atualização dos clientes instalados.

## Observação

A autorização corporativa forte exige a migração descrita em `docs/SECURITY-PREMIUM-ROADMAP.md`. O frontend sozinho não pode garantir atribuição confiável de perfis.
