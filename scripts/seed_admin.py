#!/usr/bin/env python3
import argparse
import getpass
import hashlib
import os
import time
import uuid
from datetime import datetime, timezone

DEFAULT_PASSWORD_SALT = 'diversey_salt_v1'
USERS_PATH = '/data/diversey_users'
VALID_ROLES = {'administrador', 'gestor', 'tecnico', 'fornecedor'}


def iso_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace('+00:00', 'Z')


def now_ms() -> int:
    return int(time.time() * 1000)


def normalize_username(value: str) -> str:
    return str(value or '').strip().casefold()


def canonical_role(value: str) -> str:
    role = str(value or '').strip().casefold()
    if role == 'admin':
        role = 'administrador'
    if role not in VALID_ROLES:
        raise ValueError(f'role invalido: {value}')
    return role


def portal_password_hash(password: str, username: str, password_salt: str = DEFAULT_PASSWORD_SALT) -> str:
    canonical_username = str(username or '').strip()
    if not canonical_username:
        raise ValueError('username invalido')
    if not password:
        raise ValueError('password vazio')
    suffix = f'{password_salt}:{canonical_username}'
    return hashlib.sha256((str(password) + suffix).encode('utf-8')).hexdigest()


def extract_collection(payload):
    if isinstance(payload, dict) and isinstance(payload.get('data'), list):
        return [item for item in payload['data'] if isinstance(item, dict)], dict(payload)
    if isinstance(payload, list):
        return [item for item in payload if isinstance(item, dict)], {}
    if isinstance(payload, dict):
        legacy_records = [value for value in payload.values() if isinstance(value, dict) and ('username' in value or 'id' in value)]
        if legacy_records:
            return legacy_records, {}
    return [], {}


def upsert_user_payload(payload, *, username: str, password_hash: str, display_name: str, role: str, email: str = ''):
    users, wrapper = extract_collection(payload)
    normalized = normalize_username(username)
    timestamp = now_ms()

    index = next((i for i, user in enumerate(users) if normalize_username(user.get('username')) == normalized), -1)
    existing = dict(users[index]) if index >= 0 else {}
    user_id = str(existing.get('id') or normalized or username).strip()

    record = {
        **existing,
        'id': user_id,
        'username': str(username).strip(),
        'name': str(display_name).strip(),
        'role': canonical_role(role),
        'email': str(email or existing.get('email') or '').strip(),
        'passwordHash': password_hash,
        'active': True,
        'disabled': False,
        'updatedAt': timestamp,
    }
    record.pop('password', None)
    record.pop('passHash', None)
    record.pop('salt', None)
    record.pop('displayName', None)
    if not record.get('createdAt'):
        record['createdAt'] = iso_now()

    if index >= 0:
        users[index] = record
    else:
        users.append(record)

    wrapper.update({
        'data': users,
        'updatedAt': timestamp,
        'updatedBy': 'seed_admin.py',
        'opId': f'python-seed-{uuid.uuid4().hex}',
    })
    return wrapper


def ensure_app(service_account: str, database_url: str):
    import firebase_admin
    from firebase_admin import credentials

    try:
        return firebase_admin.get_app()
    except ValueError:
        cred = credentials.Certificate(service_account)
        return firebase_admin.initialize_app(cred, {'databaseURL': database_url})


def main():
    parser = argparse.ArgumentParser(description='Cria ou atualiza um usuario do portal em /data/diversey_users')
    parser.add_argument('--service-account', required=True, help='Path do serviceAccountKey.json fora do repositorio')
    parser.add_argument('--database-url', required=True, help='URL do Firebase Realtime Database')
    parser.add_argument('--username', required=True)
    parser.add_argument('--password', default=None, help='Evite este argumento em ambientes compartilhados; omita para prompt seguro')
    parser.add_argument('--password-salt', default=os.getenv('DIVERSEY_PASSWORD_SALT', DEFAULT_PASSWORD_SALT), help='Deve ser igual a Utils.PASSWORD_SALT do portal')
    parser.add_argument('--display-name', required=True)
    parser.add_argument('--email', default='')
    parser.add_argument('--role', required=True, choices=['admin', 'administrador', 'gestor', 'tecnico', 'fornecedor'])
    parser.add_argument('--dry-run', action='store_true', help='Valida e monta o registro sem gravar no RTDB')
    args = parser.parse_args()

    if not os.path.isfile(args.service_account):
        raise SystemExit(f'Service account nao encontrado: {args.service_account}')

    username = args.username.strip()
    if not username:
        raise SystemExit('username invalido')

    password = args.password if args.password is not None else getpass.getpass('Senha: ')
    try:
        password_hash = portal_password_hash(password, username, args.password_salt)
        role = canonical_role(args.role)
    except ValueError as exc:
        raise SystemExit(str(exc)) from exc

    if args.dry_run:
        preview = upsert_user_payload({}, username=username, password_hash=password_hash, display_name=args.display_name, role=role, email=args.email)
        safe_user = dict(preview['data'][0])
        safe_user['passwordHash'] = '<redacted>'
        print({'path': USERS_PATH, 'user': safe_user})
        return

    ensure_app(args.service_account, args.database_url)
    from firebase_admin import db

    users_ref = db.reference(USERS_PATH)
    users_ref.transaction(lambda current: upsert_user_payload(
        current,
        username=username,
        password_hash=password_hash,
        display_name=args.display_name,
        role=role,
        email=args.email,
    ))

    print(f'OK: usuario {username!r} atualizado em {USERS_PATH} com schema compativel com o portal')


if __name__ == '__main__':
    main()
