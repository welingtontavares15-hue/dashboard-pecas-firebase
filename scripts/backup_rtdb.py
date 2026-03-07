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
    p = argparse.ArgumentParser(description="Backup do RTDB em JSON (node /data)")
    p.add_argument("--service-account", required=True)
    p.add_argument("--database-url", required=True)
    p.add_argument("--out", required=True, help="Arquivo JSON de saída")
    args = p.parse_args()

    if not os.path.exists(args.service_account):
        raise SystemExit(f"Service account não encontrado: {args.service_account}")

    ensure_app(args.service_account, args.database_url)

    data = db.reference("/data").get() or {}
    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"OK: backup salvo em {args.out}")


if __name__ == "__main__":
    main()
