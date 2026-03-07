#!/usr/bin/env python3
import argparse
import json
import os

import firebase_admin
from firebase_admin import credentials, db


def ensure_app(service_account: str, database_url: str):
    if not firebase_admin._apps:
        cred = credentials.Certificate(service_account)
        firebase_admin.initialize_app(cred, {"databaseURL": database_url})


def main():
    p = argparse.ArgumentParser(description="Restore do RTDB a partir de JSON (sobrescreve /data)")
    p.add_argument("--service-account", required=True)
    p.add_argument("--database-url", required=True)
    p.add_argument("--in", dest="inp", required=True, help="Arquivo JSON de entrada")
    p.add_argument("--force", action="store_true", help="Obrigatório para sobrescrever /data")
    args = p.parse_args()

    if not args.force:
        raise SystemExit("Bloqueado: use --force para sobrescrever /data")

    if not os.path.exists(args.service_account):
        raise SystemExit(f"Service account não encontrado: {args.service_account}")
    if not os.path.exists(args.inp):
        raise SystemExit(f"Arquivo não encontrado: {args.inp}")

    ensure_app(args.service_account, args.database_url)

    with open(args.inp, "r", encoding="utf-8") as f:
        payload = json.load(f)

    if not isinstance(payload, dict):
        raise SystemExit("JSON inválido: esperado objeto (dict) na raiz")

    db.reference("/data").set(payload)
    print("OK: restore concluído")


if __name__ == "__main__":
    main()
