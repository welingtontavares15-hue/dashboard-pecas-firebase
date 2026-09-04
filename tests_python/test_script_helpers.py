import importlib.util
import json
import os
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def load(name):
    path = ROOT / 'scripts' / f'{name}.py'
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


seed = load('seed_admin')
parts = load('import_pecas_xlsx')
backup = load('backup_rtdb')
restore = load('restore_rtdb')


class SeedAdminTests(unittest.TestCase):
    def test_hash_matches_portal_contract(self):
        value = seed.portal_password_hash('secret', 'admin', 'diversey_salt_v1')
        import hashlib
        expected = hashlib.sha256('secretdiversey_salt_v1:admin'.encode('utf-8')).hexdigest()
        self.assertEqual(value, expected)

    def test_upsert_migrates_legacy_shape_and_removes_stale_fields(self):
        legacy = {'admin': {'username': 'Admin', 'passHash': 'old', 'salt': 'old', 'displayName': 'Old', 'role': 'admin'}}
        result = seed.upsert_user_payload(legacy, username='Admin', password_hash='newhash', display_name='Administrador', role='administrador', email='admin@example.com')
        self.assertIsInstance(result['data'], list)
        self.assertEqual(len(result['data']), 1)
        user = result['data'][0]
        self.assertEqual(user['passwordHash'], 'newhash')
        self.assertEqual(user['role'], 'administrador')
        self.assertNotIn('passHash', user)
        self.assertNotIn('salt', user)
        self.assertNotIn('displayName', user)

    def test_admin_alias_is_canonicalized(self):
        self.assertEqual(seed.canonical_role('admin'), 'administrador')


class ImportPartsTests(unittest.TestCase):
    def test_nan_is_missing(self):
        self.assertTrue(parts.is_missing(float('nan')))
        self.assertTrue(parts.is_missing('nan'))
        self.assertIsNone(parts.parse_row({'codigo': float('nan'), 'descricao': 'X', 'unidade': 'UN'}))

    def test_firebase_forbidden_characters_are_removed_from_id(self):
        item_id = parts.sanitize_id('ABC.12/#$[]')
        for char in '.#$[]/':
            self.assertNotIn(char, item_id)
        self.assertTrue(item_id)

    def test_duplicate_normalized_ids_are_rejected(self):
        rows = [
            {'codigo': 'ABC.1', 'descricao': 'A', 'unidade': 'UN'},
            {'codigo': 'ABC/1', 'descricao': 'B', 'unidade': 'UN'},
        ]
        with self.assertRaises(ValueError):
            parts.build_records(rows)

    def test_merge_preserves_existing_and_updates_matching_record(self):
        payload = {'data': [{'id': 'A', 'codigo': 'A', 'descricao': 'Old', 'unidade': 'UN'}, {'id': 'B', 'codigo': 'B', 'descricao': 'Keep', 'unidade': 'UN'}], 'updatedBy': 'portal'}
        result = parts.merge_catalog_payload(payload, [{'id': 'A', 'codigo': 'A', 'descricao': 'New', 'unidade': 'UN', 'ativo': True}], op_id='op-test')
        self.assertEqual(len(result['data']), 2)
        by_id = {item['id']: item for item in result['data']}
        self.assertEqual(by_id['A']['descricao'], 'New')
        self.assertEqual(by_id['B']['descricao'], 'Keep')
        self.assertEqual(result['opId'], 'op-test')


class BackupRestoreTests(unittest.TestCase):
    def test_atomic_backup_roundtrip(self):
        with tempfile.TemporaryDirectory() as tmp:
            target = os.path.join(tmp, 'backup.json')
            payload = {'a': {'b': 1}}
            backup.atomic_write_json(target, payload)
            with open(target, 'r', encoding='utf-8') as handle:
                self.assertEqual(json.load(handle), payload)
            if os.name == 'posix':
                self.assertEqual(os.stat(target).st_mode & 0o777, 0o600)

    def test_restore_rejects_non_object_root(self):
        with tempfile.TemporaryDirectory() as tmp:
            target = os.path.join(tmp, 'invalid.json')
            with open(target, 'w', encoding='utf-8') as handle:
                json.dump([], handle)
            with self.assertRaises(ValueError):
                restore.load_payload(target)


if __name__ == '__main__':
    unittest.main()
