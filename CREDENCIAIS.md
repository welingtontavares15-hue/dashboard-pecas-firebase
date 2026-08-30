## Credenciais de Acesso - Dashboard de Peças

### Produção
- Autenticação corporativa deve ser provisionada pelo administrador responsável.
- Nenhuma senha padrão é publicada ou distribuída por este repositório.
- Contas, recuperação de acesso e suporte devem usar os canais corporativos aprovados da operação.

### Desenvolvimento / Homologação
- Ative `APP_CONFIG.environment = 'development'` somente em ambiente local ou de homologação controlado.
- As credenciais de teste devem permanecer em cofre seguro.
- O painel de credenciais da tela de login só pode aparecer em dev/staging e permanece bloqueado em produção por flag de ambiente.

### Técnicos e Gestores
- O identificador de usuário deve seguir o padrão definido pelo administrador do ambiente.
- Senhas e mecanismos de recuperação não devem ser enviados por arquivos versionados, issues ou pull requests.
- Dados pessoais de colaboradores não devem ser mantidos como fallback no frontend público.

### Suporte
Use o canal corporativo oficial definido para a operação do Portal de Peças MWW. Não publique e-mail pessoal, telefone pessoal, senha, token ou dados residenciais neste repositório.
