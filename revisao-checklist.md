# Checklist de Revisão (HTML/CSS/JS + Dados/PDF)

Legenda: **OK** = sem bloqueios críticos | **Ajustar** = precisa de melhoria | **Crítico** = risco de falha

## Front-end
- Login e RBAC: **OK** — sessão com expiração e rate limiting progressivo implementado.
- Layout/Responsividade: **Ajustar** — tabelas ainda exigem rolagem horizontal em telas menores.
- Fluxo de Solicitações: **OK** — validações presentes com audit.version para controle de conflitos.
- Geração de PDF: **OK** — layout ajustado para respeitar quebras de página e rodapé mesmo com textos longos.

## Back-end / Integrações
- API dedicada: **Não aplicável** — aplicação opera como SPA com armazenamento local/cloud.
- Firebase Sync: **Ajustar** — fallback local funciona; é preciso endurecer detecção de falhas de conexão.
- Integração Planilhas/OneDrive: **Ajustar** — depende de configuração externa e cache local.

## Dados / Banco
- Armazenamento (IndexedDB/Firebase): **OK** — stores dedicados: requests, parts, users, suppliers, reports, queue.
- Auditoria de ações: **OK** — audit.version + timeline[] + approvals[] implementados nas solicitações.
- Controle de versão: **OK** — optimistic concurrency com validação de version antes de gravar.

## Segurança
- Hash de senha com salt: **OK** — usa SHA-256 com salt por usuário.
- Rate limiting: **OK** — bloqueio progressivo após falhas de login implementado.
- Autorização por rota: **Ajustar** — checagem no front; reforçar validação no back quando houver API.

## Testes/Qualidade
- Testes automatizados: **OK** — estrutura básica de testes com Jest implementada (tests/*.test.js).
- Cobertura: **Ajustar** — expandir testes para cobrir mais módulos.
