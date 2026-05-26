#!/usr/bin/env python3
import argparse
import hashlib
import json
import os
import secrets
from datetime import datetime, timezone

import firebase_admin
from firebase_admin import credentials, db


def iso_now():
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def sha256_hex(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def ensure_app(service_account: str, database_url: str):
    if not firebase_admin._apps:
        cred = credentials.Certificate(service_account)
        firebase_admin.initialize_app(cred, {"databaseURL": database_url})


def main():
    p = argparse.ArgumentParser(description="Seed admin user + estrutura /data/diversey_* no RTDB")
    p.add_argument("--service-account", required=True, help="Path do serviceAccountKey.json (fora do repo)")
    p.add_argument("--database-url", required=True, help="RTDB databaseURL (https://...-default-rtdb.firebaseio.com)")
    p.add_argument("--username", required=True)
    p.add_argument("--password", required=True)
    p.add_argument("--display-name", required=True)
    p.add_argument("--role", required=True, choices=["admin", "gestor", "tecnico"])
    args = p.parse_args()

    if not os.path.exists(args.service_account):
        raise SystemExit(f"Service account não encontrado: {args.service_account}")

    ensure_app(args.service_account, args.database_url)

    username = args.username.strip()
    if not username:
        raise SystemExit("username inválido")

    salt = secrets.token_hex(16)
    pass_hash = sha256_hex(salt + args.password)

    base = db.reference("/data")

    # estrutura mínima
    settings_ref = base.child("diversey_settings")
    settings_ref.transaction(lambda cur: cur or {
        "slaHoras": 48,
        "moeda": "BRL",
        "tema": "light",
        "flags": {"exportXlsx": True, "exportPdf": True, "loteAprovacao": False},
        "sequence": {"solicitacaoNumero": 0}
    })

    # nós compatíveis (cria vazios se não existirem)
    for node in [
        "diversey_export_files", "diversey_export_log", "diversey_fornecedores",
        "diversey_pecas", "diversey_recent_parts", "diversey_solicitacoes",
        "diversey_tecnicos", "diversey_users"
    ]:
        base.child(node).transaction(lambda cur: cur or {})

    # cria/atualiza usuário
    users_ref = base.child("diversey_users")
    user_key = username.lower()

    user_obj = {
        "username": username,
        "displayName": args.display_name,
        "role": args.role,
        "active": True,
        "salt": salt,
        "passHash": pass_hash,
        "createdAt": iso_now(),
        "lastLoginAt": None,
        "lockedUntil": None,
        "attempts": 0
    }

    users_ref.child(user_key).set(user_obj)

    print("OK: admin seed concluído")
    print(json.dumps({"userKey": user_key, "username": username, "role": args.role}, indent=2))


if __name__ == "__main__":
    main()
