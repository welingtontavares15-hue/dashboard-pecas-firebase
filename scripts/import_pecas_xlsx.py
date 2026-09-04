#!/usr/bin/env python3
import argparse
import math
import os
import re
import time
import uuid
from typing import Any, Dict, Iterable, List, Tuple

PARTS_PATH = '/data/diversey_pecas'
REQUIRED_COLS = ['codigo', 'descricao', 'unidade']
FIREBASE_FORBIDDEN_KEY_CHARS = re.compile(r'[.#$\[\]/]')


def is_missing(value: Any) -> bool:
    if value is None:
        return True
    if isinstance(value, float) and math.isnan(value):
        return True
    text = str(value).strip()
    return text == '' or text.casefold() in {'nan', '<na>', 'none'}


def clean_text(value: Any) -> str:
    return '' if is_missing(value) else str(value).strip()


def sanitize_id(value: Any) -> str:
    raw = clean_text(value)
    if not raw:
        return ''
    normalized = re.sub(r'\s+', '-', raw)
    normalized = FIREBASE_FORBIDDEN_KEY_CHARS.sub('-', normalized)
    normalized = re.sub(r'[^a-zA-Z0-9_-]', '-', normalized)
    normalized = re.sub(r'-{2,}', '-', normalized).strip('-_')
    return normalized[:120]


def to_bool(value: Any) -> bool:
    if is_missing(value):
        return True
    if isinstance(value, bool):
        return value
    return str(value).strip().casefold() not in {'0', 'false', 'nao', 'não', 'n', 'off'}


def extract_collection(payload: Any) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    if isinstance(payload, dict) and isinstance(payload.get('data'), list):
        return [dict(item) for item in payload['data'] if isinstance(item, dict)], dict(payload)
    if isinstance(payload, list):
        return [dict(item) for item in payload if isinstance(item, dict)], {}
    if isinstance(payload, dict):
        legacy = [dict(item) for item in payload.values() if isinstance(item, dict) and ('codigo' in item or 'id' in item)]
        if legacy:
            return legacy, {}
    return [], {}


def parse_row(row: Dict[str, Any]) -> Dict[str, Any] | None:
    codigo = clean_text(row.get('codigo'))
    descricao = clean_text(row.get('descricao'))
    unidade = clean_text(row.get('unidade'))
    if not codigo or not descricao or not unidade:
        return None

    item_id = sanitize_id(codigo) or sanitize_id(descricao)
    if not item_id:
        return None
    if FIREBASE_FORBIDDEN_KEY_CHARS.search(item_id):
        raise ValueError(f'ID invalido para Firebase: {item_id}')

    obj: Dict[str, Any] = {
        'id': item_id,
        'codigo': codigo,
        'descricao': descricao,
        'unidade': unidade,
        'ativo': to_bool(row.get('ativo', True)),
    }

    price = row.get('precoRefOpcional')
    if not is_missing(price):
        try:
            obj['precoRefOpcional'] = float(price)
        except (TypeError, ValueError) as exc:
            raise ValueError(f'precoRefOpcional invalido para codigo {codigo}: {price!r}') from exc

    supplier = clean_text(row.get('fornecedorIdOpcional'))
    if supplier:
        obj['fornecedorIdOpcional'] = supplier

    return obj


def build_records(rows: Iterable[Dict[str, Any]]) -> List[Dict[str, Any]]:
    records: List[Dict[str, Any]] = []
    seen_ids: Dict[str, str] = {}
    for row_number, row in enumerate(rows, start=2):
        record = parse_row(row)
        if record is None:
            continue
        item_id = record['id']
        if item_id in seen_ids:
            raise ValueError(f'ID duplicado apos normalizacao: {item_id!r} (linhas {seen_ids[item_id]} e {row_number})')
        seen_ids[item_id] = str(row_number)
        records.append(record)
    return records


def merge_catalog_payload(payload: Any, incoming: List[Dict[str, Any]], *, op_id: str) -> Dict[str, Any]:
    current, wrapper = extract_collection(payload)
    by_id = {str(item.get('id')): dict(item) for item in current if item.get('id')}
    order = [str(item.get('id')) for item in current if item.get('id')]

    for item in incoming:
        item_id = str(item['id'])
        if item_id not in by_id:
            order.append(item_id)
        by_id[item_id] = {**by_id.get(item_id, {}), **item}

    timestamp = int(time.time() * 1000)
    wrapper.update({
        'data': [by_id[item_id] for item_id in order if item_id in by_id],
        'updatedAt': timestamp,
        'updatedBy': 'import_pecas_xlsx.py',
        'opId': op_id,
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


def read_rows(file_path: str, sheet: str | None = None) -> List[Dict[str, Any]]:
    import pandas as pd

    if file_path.lower().endswith('.csv'):
        df = pd.read_csv(file_path)
    else:
        df = pd.read_excel(file_path, sheet_name=sheet)

    df.columns = [str(column).strip() for column in df.columns]
    missing_columns = [column for column in REQUIRED_COLS if column not in df.columns]
    if missing_columns:
        raise ValueError(f'Colunas obrigatorias ausentes: {", ".join(missing_columns)}')
    return df.to_dict(orient='records')


def main():
    parser = argparse.ArgumentParser(description='Importa pecas via XLSX/CSV para o schema atual de /data/diversey_pecas')
    parser.add_argument('--service-account', required=True)
    parser.add_argument('--database-url', required=True)
    parser.add_argument('--file', required=True)
    parser.add_argument('--sheet', default=None, help='Nome da aba XLSX; vazio usa a primeira')
    parser.add_argument('--dry-run', action='store_true', help='Valida sem gravar no RTDB')
    args = parser.parse_args()

    if not os.path.isfile(args.service_account):
        raise SystemExit(f'Service account nao encontrado: {args.service_account}')
    if not os.path.isfile(args.file):
        raise SystemExit(f'Arquivo nao encontrado: {args.file}')

    try:
        records = build_records(read_rows(args.file, args.sheet))
    except ValueError as exc:
        raise SystemExit(str(exc)) from exc

    if not records:
        raise SystemExit('Nenhuma linha valida encontrada')

    print(f'Linhas validas: {len(records)}')
    if args.dry_run:
        print('DRY RUN: nenhuma alteracao gravada')
        return

    ensure_app(args.service_account, args.database_url)
    from firebase_admin import db

    op_id = f'python-import-{uuid.uuid4().hex}'
    parts_ref = db.reference(PARTS_PATH)
    parts_ref.transaction(lambda current: merge_catalog_payload(current, records, op_id=op_id))
    print(f'OK: {len(records)} pecas mescladas em {PARTS_PATH} por uma unica transacao')


if __name__ == '__main__':
    main()
