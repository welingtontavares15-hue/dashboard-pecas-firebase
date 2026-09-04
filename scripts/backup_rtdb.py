#!/usr/bin/env python3
import argparse
import json
import os
import tempfile


def ensure_app(service_account: str, database_url: str):
    import firebase_admin
    from firebase_admin import credentials

    try:
        return firebase_admin.get_app()
    except ValueError:
        cred = credentials.Certificate(service_account)
        return firebase_admin.initialize_app(cred, {'databaseURL': database_url})


def atomic_write_json(output_path: str, payload) -> None:
    absolute = os.path.abspath(output_path)
    parent = os.path.dirname(absolute) or '.'
    os.makedirs(parent, exist_ok=True)
    fd, temp_path = tempfile.mkstemp(prefix='.rtdb-backup-', suffix='.json.tmp', dir=parent)
    try:
        with os.fdopen(fd, 'w', encoding='utf-8') as handle:
            json.dump(payload, handle, ensure_ascii=False, indent=2)
            handle.flush()
            os.fsync(handle.fileno())
        try:
            os.chmod(temp_path, 0o600)
        except OSError:
            pass
        os.replace(temp_path, absolute)
    except Exception:
        try:
            os.unlink(temp_path)
        except OSError:
            pass
        raise


def main():
    parser = argparse.ArgumentParser(description='Backup atomico do RTDB em JSON (node /data)')
    parser.add_argument('--service-account', required=True)
    parser.add_argument('--database-url', required=True)
    parser.add_argument('--out', required=True, help='Arquivo JSON de saida')
    args = parser.parse_args()

    if not os.path.isfile(args.service_account):
        raise SystemExit(f'Service account nao encontrado: {args.service_account}')

    ensure_app(args.service_account, args.database_url)
    from firebase_admin import db

    data = db.reference('/data').get() or {}
    atomic_write_json(args.out, data)
    print(f'OK: backup salvo atomicamente em {os.path.abspath(args.out)}')


if __name__ == '__main__':
    main()
