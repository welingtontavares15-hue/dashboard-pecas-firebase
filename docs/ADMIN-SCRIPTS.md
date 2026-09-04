# Scripts administrativos

Scripts Python para operacoes controladas no Firebase Realtime Database.

## Requisitos
- Python 3.10+
- Service Account do Firebase mantido **fora do repositorio**
- URL do RTDB

```bash
cd scripts
python -m venv .venv
# Windows: .venv\Scripts\activate
# Linux/macOS: source .venv/bin/activate
pip install -r requirements.txt
```

## 1) seed_admin.py

Cria ou atualiza um usuario em `/data/diversey_users` usando o mesmo schema e o mesmo contrato de hash do portal atual. A operacao usa transacao e converte formatos legados para o wrapper `{ data: [...] }` utilizado pelo frontend.

Por padrao a senha e solicitada de forma interativa para evitar exposicao no historico do shell:

```bash
python seed_admin.py \
  --service-account ../serviceAccountKey.json \
  --database-url https://SEU-PROJETO-default-rtdb.firebaseio.com \
  --username admin \
  --display-name "Administrador" \
  --email admin@example.com \
  --role administrador
```

Use `--dry-run` para validar o registro sem gravar no RTDB. O argumento `--password` existe apenas para automacao controlada; evite usa-lo em terminais compartilhados. Se a instalacao sobrescrever `Utils.PASSWORD_SALT`, defina o mesmo valor em `DIVERSEY_PASSWORD_SALT` durante o seed.

## 2) backup_rtdb.py

Faz backup atomico de `/data` em JSON. Em sistemas POSIX o arquivo temporario/final recebe permissao `0600` quando suportado.

```bash
python backup_rtdb.py \
  --service-account ../serviceAccountKey.json \
  --database-url https://SEU-PROJETO-default-rtdb.firebaseio.com \
  --out backup.json
```

## 3) restore_rtdb.py

Restaura `/data` a partir de JSON. A raiz deve ser um objeto JSON, `--force` e obrigatorio e o script faz readback apos a escrita para confirmar que o conteudo persistido coincide com o arquivo.

```bash
python restore_rtdb.py \
  --service-account ../serviceAccountKey.json \
  --database-url https://SEU-PROJETO-default-rtdb.firebaseio.com \
  --in backup.json \
  --force
```

## 4) import_pecas_xlsx.py

Importa XLSX/CSV para `/data/diversey_pecas` sem substituir itens nao presentes no arquivo. A importacao valida campos obrigatorios, valores ausentes, preco, caracteres proibidos em chaves Firebase e colisoes de ID; a gravacao ocorre em uma unica transacao.

Colunas obrigatorias:
- `codigo`
- `descricao`
- `unidade`

Colunas opcionais:
- `precoRefOpcional`
- `fornecedorIdOpcional`
- `ativo`

```bash
python import_pecas_xlsx.py \
  --service-account ../serviceAccountKey.json \
  --database-url https://SEU-PROJETO-default-rtdb.firebaseio.com \
  --file pecas.xlsx \
  --sheet Pecas \
  --dry-run
```

Remova `--dry-run` somente apos a validacao concluir sem erros.
