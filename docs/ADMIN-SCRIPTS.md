# ADMIN-SCRIPTS.md

Scripts administrativos em Python para automação no Realtime Database.

## Requisitos
- Python 3.10+
- Um Service Account do Firebase (arquivo `serviceAccountKey.json`) **fora do repositório**
- URL do RTDB (ex: `https://SEU-PROJETO-default-rtdb.firebaseio.com`)

Instale:
```bash
cd scripts
python -m venv .venv
# Windows: .venv\Scripts\activate
source .venv/bin/activate
pip install -r requirements.txt
```

## 1) seed_admin.py
Cria a estrutura mínima em `/data` e um usuário inicial em `/data/diversey_users`.

```bash
python seed_admin.py \
  --service-account ../serviceAccountKey.json \
  --database-url https://SEU-PROJETO-default-rtdb.firebaseio.com \
  --username admin \
  --password "TroqueEssaSenha!" \
  --display-name "Administrador" \
  --role admin
```

## 2) backup_rtdb.py
Faz backup de `/data` em JSON.

```bash
python backup_rtdb.py \
  --service-account ../serviceAccountKey.json \
  --database-url https://SEU-PROJETO-default-rtdb.firebaseio.com \
  --out backup.json
```

## 3) restore_rtdb.py
Restaura `/data` a partir de JSON (sobrescreve). Use `--force`.

```bash
python restore_rtdb.py \
  --service-account ../serviceAccountKey.json \
  --database-url https://SEU-PROJETO-default-rtdb.firebaseio.com \
  --in backup.json \
  --force
```

## 4) import_pecas_xlsx.py
Importa peças via XLSX/CSV para `/data/diversey_pecas`.

Colunas esperadas (mínimo):
- `codigo`, `descricao`, `unidade`
Opcionais:
- `precoRefOpcional`, `fornecedorIdOpcional`, `ativo`

```bash
python import_pecas_xlsx.py \
  --service-account ../serviceAccountKey.json \
  --database-url https://SEU-PROJETO-default-rtdb.firebaseio.com \
  --file pecas.xlsx \
  --sheet Pecas
```

