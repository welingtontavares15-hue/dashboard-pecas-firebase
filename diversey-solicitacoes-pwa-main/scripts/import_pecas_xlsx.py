#!/usr/bin/env python3
import argparse
import os
import re
from typing import Dict, Any

import pandas as pd
import firebase_admin
from firebase_admin import credentials, db


REQUIRED_COLS = ["codigo", "descricao", "unidade"]
OPTIONAL_COLS = ["precoRefOpcional", "fornecedorIdOpcional", "ativo"]


def ensure_app(service_account: str, database_url: str):
    if not firebase_admin._apps:
        cred = credentials.Certificate(service_account)
        firebase_admin.initialize_app(cred, {"databaseURL": database_url})


def sanitize_id(value: str) -> str:
    v = (value or "").strip()
    v = re.sub(r"\s+", "-", v)
    v = re.sub(r"[^a-zA-Z0-9_\-\.]", "", v)
    return v[:120] or ""


def to_bool(v):
    if pd.isna(v):
        return True
    if isinstance(v, bool):
        return v
    s = str(v).strip().lower()
    return s not in ("0", "false", "não", "nao", "n", "off")


def main():
    p = argparse.ArgumentParser(description="Importar peças via XLSX/CSV para /data/diversey_pecas")
    p.add_argument("--service-account", required=True)
    p.add_argument("--database-url", required=True)
    p.add_argument("--file", required=True)
    p.add_argument("--sheet", default=None, help="Nome da aba (XLSX). Se vazio, usa a primeira.")
    p.add_argument("--dry-run", action="store_true", help="Não grava no RTDB, só valida")
    args = p.parse_args()

    if not os.path.exists(args.service_account):
        raise SystemExit(f"Service account não encontrado: {args.service_account}")
    if not os.path.exists(args.file):
        raise SystemExit(f"Arquivo não encontrado: {args.file}")

    # read file
    if args.file.lower().endswith(".csv"):
        df = pd.read_csv(args.file)
    else:
        df = pd.read_excel(args.file, sheet_name=args.sheet)

    df.columns = [str(c).strip() for c in df.columns]

    for c in REQUIRED_COLS:
        if c not in df.columns:
            raise SystemExit(f"Coluna obrigatória ausente: {c}")

    # normalize
    rows = []
    for _, row in df.iterrows():
        codigo = str(row.get("codigo", "")).strip()
        descricao = str(row.get("descricao", "")).strip()
        unidade = str(row.get("unidade", "")).strip()

        if not codigo or not descricao or not unidade:
            continue

        item_id = sanitize_id(codigo) or sanitize_id(descricao)
        if not item_id:
            continue

        obj: Dict[str, Any] = {
            "id": item_id,
            "codigo": codigo,
            "descricao": descricao,
            "unidade": unidade,
            "ativo": to_bool(row.get("ativo", True)),
        }

        if "precoRefOpcional" in df.columns and not pd.isna(row.get("precoRefOpcional")):
            try:
                obj["precoRefOpcional"] = float(row.get("precoRefOpcional"))
            except Exception:
                pass

        if "fornecedorIdOpcional" in df.columns and not pd.isna(row.get("fornecedorIdOpcional")):
            obj["fornecedorIdOpcional"] = str(row.get("fornecedorIdOpcional")).strip() or None

        rows.append(obj)

    if not rows:
        raise SystemExit("Nenhuma linha válida encontrada.")

    print(f"Linhas válidas: {len(rows)}")

    if args.dry_run:
        print("DRY RUN: não gravou nada.")
        return

    ensure_app(args.service_account, args.database_url)
    ref_base = db.reference("/data/diversey_pecas")
    for obj in rows:
        ref_base.child(obj["id"]).set(obj)

    print("OK: import concluído.")


if __name__ == "__main__":
    main()
