# Arquitetura e Modelo de Dados

Este documento separa **arquitetura observada** de **arquitetura-alvo**. Não trate itens de roadmap como controles já implementados.

## 1. Arquitetura observada

### Frontend
- HTML, CSS e JavaScript executados diretamente no navegador.
- PWA com Service Worker para cache de recursos e fallback de navegação.
- Interface construída por módulos JavaScript globais e múltiplas camadas históricas de CSS.

### Dados
- Firebase Realtime Database é a persistência operacional observada.
- Dados principais ficam sob `/data/*`.
- `CloudStorage` em `js/storage.js` normaliza coleções e usa metadados como `updatedAt`, `updatedBy` e `opId`.
- Escritas operacionais estão em modo **online-only**. `enqueueOperation()` não mantém fila offline de gravação no runtime atual.

### Autenticação e autorização
- O navegador estabelece Firebase Anonymous Auth para a conexão técnica atual com o RTDB.
- O portal possui login próprio em `js/auth.js` e registros de usuário em `diversey_users`.
- Guards de interface aplicam permissões por perfil.
- As regras RTDB aplicam restrições adicionais.
- A auditoria de setembro de 2026 identificou um bloqueador crítico na fronteira de confiança entre identidade Firebase, sessão do portal e RBAC. Consulte `SECURITY-REVIEW.md`.

### Backend
- Não foi observado backend de aplicação responsável por autenticação, cálculo de totais, sequenciais ou autorização crítica no fluxo principal do frontend.
- Scripts Python em `scripts/` são ferramentas administrativas executadas separadamente; não constituem backend online do portal.

### Deploy
- O site estático é publicado no GitHub Pages por `.github/workflows/deploy.yml`.
- O deploy monta um artefato `dist/` com arquivos de runtime selecionados.

## 2. Modelo de dados observado

Principais conjuntos:

```text
/data
  /diversey_users
  /diversey_tecnicos
  /diversey_fornecedores
  /diversey_pecas
  /diversey_solicitacoes
  /diversey_sessions
  /diversey_settings
```

Algumas coleções usam o wrapper:

```json
{
  "data": [],
  "updatedAt": 0,
  "updatedBy": "identificador",
  "opId": "identificador-da-operacao"
}
```

Os scripts administrativos devem preservar esse formato quando operarem sobre coleções consumidas pelo frontend.

## 3. Solicitações e consistência

O código atual mantém campos de status, timeline, aprovação e snapshots compatíveis com registros legados. Há testes específicos para:

- reconhecimento de custo por data de aprovação;
- classificação de divisão F&B/IN;
- atualização atômica de divisão;
- escopo de fornecedor;
- idempotência de escrita;
- sincronização em tempo real;
- PDFs e artefatos de exportação.

Não assumir geração server-side de sequencial ou cálculo server-side de totais sem implementação e evidência específicas.

## 4. Modo online-only

O Service Worker continua útil para shell/cache PWA, porém o comportamento de escrita deve ser entendido separadamente:

- falta de conexão cloud faz a gravação falhar de forma explícita;
- o runtime não deve prometer fila persistente de alterações offline;
- testes de idempotência verificam que os dados não são persistidos localmente como substituto de uma escrita cloud indisponível.

Esse contrato é protegido por `tests/idempotency.test.js` e pelo manifesto `tests/critical-flows.test.js`.

## 5. Responsividade e arquitetura visual

A UI possui camadas de estilo acumuladas ao longo de várias versões. As camadas finais autoritativas e sua ordem de carregamento são verificadas por testes de regressão.

Testes relevantes:

- `tests/responsive-system.test.js`
- `tests/premium-release-v55.test.js`
- `tests/wwm-smart-layout.test.js`
- `tests/visual-architecture-v72.test.js`
- `tests/technician-request-layout.test.js`
- `tests/navigation-master.test.js`

A existência de CSS histórico é dívida arquitetural, mas remoção/reordenação exige prova de não uso e validação visual em múltiplos viewports.

## 6. Segurança observada

Controles existentes incluem:

- hash de senha do portal;
- rate limiting client-side;
- expiração de sessão do portal;
- guards por perfil;
- regras RTDB;
- escaping e sanitizadores em diversos fluxos;
- privacy guard no CI;
- trilhas e metadados de auditoria em operações relevantes.

Esses controles **não eliminam** o bloqueador crítico de confiança de autenticação/RBAC descrito em `SECURITY-REVIEW.md`.

## 7. Scripts administrativos Python

- `seed_admin.py`: cria/atualiza usuário usando schema compatível com o portal e transação.
- `import_pecas_xlsx.py`: valida dados e mescla catálogo em transação única.
- `backup_rtdb.py`: gera backup atômico de `/data`.
- `restore_rtdb.py`: exige confirmação explícita e valida o restore por readback.

Os helpers possuem testes em `tests_python/`.

## 8. CI/CD e qualidade

O CI executa:

1. instalação npm;
2. testes JavaScript;
3. compilação sintática Python;
4. testes Python;
5. lint crítico first-party;
6. privacy guard;
7. verificação dos arquivos necessários ao artefato;
8. relatório de lint legado;
9. relatório de dependências vulneráveis.

O deploy em `main` repete os gates críticos antes de publicar no GitHub Pages.

## 9. Arquitetura-alvo recomendada

Os itens abaixo são **recomendações**, não estado atual:

### Identidade e RBAC
- Migrar usuários para provedor de identidade confiável.
- Associar perfis a UID/claims administrados fora do navegador.
- Remover autenticação do portal baseada em leitura client-side da coleção de credenciais.
- Reescrever regras RTDB contra identidade verificada.
- Testar tentativas negativas de autorização em emulador/staging.

### Dados
- Considerar funções/backend confiável para operações que necessitem invariantes impossíveis de garantir apenas no cliente.
- Manter transações e idempotência para atualizações concorrentes.
- Definir política formal de backup, retenção e restauração.

### Qualidade
- Reduzir progressivamente a dívida de lint completo.
- Manter testes de regressão por módulo.
- Adicionar smoke/E2E autenticado em navegador real para fluxos críticos e múltiplos viewports.
- Atualizar dependências npm de forma controlada, evitando `--force` sem regressão completa.

## 10. Princípios de manutenção

- Diferenciar claramente código observado de roadmap.
- Não declarar controle server-side quando a decisão é tomada no navegador.
- Não confundir cache PWA com capacidade de gravação offline.
- Não alterar regras Firebase isoladamente sem testar o fluxo de autenticação completo.
- Não remover CSS histórico sem evidência de não uso e regressão visual.
- Toda mudança de dados deve ter rollback e readback quando aplicável.

---

**Última atualização:** setembro de 2026
