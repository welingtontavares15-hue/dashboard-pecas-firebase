#!/usr/bin/env python3
import argparse
import json
import os


def ensure_app(service_account: str, database_url: str):
    import firebase_admin
    from firebase_admin import credentials

    try:
        return firebase_admin.get_app()
    except ValueError:
        cred = credentials.Certificate(service_account)
        return firebase_admin.initialize_app(cred, {'databaseURL': database_url})


def load_payload(input_path: str):
    with open(input_path, 'r', encoding='utf-8') as handle:
        payload = json.load(handle)
    if not isinstance(payload, dict):
        raise ValueError('JSON invalido: esperado objeto na raiz')
    return payload


def main():
    parser = argparse.ArgumentParser(description='Restaura /data do RTDB a partir de JSON')
    parser.add_argument('--service-account', required=True)
    parser.add_argument('--database-url', required=True)
    parser.add_argument('--in', dest='inp', required=True, help='Arquivo JSON de entrada')
    parser.add_argument('--force', action='store_true', help='Obrigatorio para sobrescrever /data')
    args = parser.parse_args()

    if not args.force:
        raise SystemExit('Bloqueado: use --force para sobrescrever /data')
    if not os.path.isfile(args.service_account):
        raise SystemExit(f'Service account nao encontrado: {args.service_account}')
    if not os.path.isfile(args.inp):
        raise SystemExit(f'Arquivo nao encontrado: {args.inp}')

    try:
        payload = load_payload(args.inp)
    except (OSError, json.JSONDecodeError, ValueError) as exc:
        raise SystemExit(str(exc)) from exc

    ensure_app(args.service_account, args.database_url)
    from firebase_admin import db

    db.reference('/data').set(payload)
    readback = db.reference('/data').get()
    if readback != payload:
        raise SystemExit('Falha de verificacao: readback do RTDB diverge do arquivo restaurado')
    print('OK: restore concluido e verificado por readback')


if __name__ == '__main__':
    main()
