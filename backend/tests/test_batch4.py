"""Batch 4 backend tests: archive/restore/bulk-delete/reset-pw/RBAC/activity-log."""
import os
import pytest
import requests

BASE = os.environ.get('REACT_APP_BACKEND_URL', 'https://bertanya-hub.preview.emergentagent.com').rstrip('/')
API = f"{BASE}/api"

ADMIN = {"identifier": "agengpadma8@gmail.com", "password": "jokam354"}
PESERTA = {"identifier": "frengky123@gmail.com", "password": "frengky123"}


def _login(creds):
    r = requests.post(f"{API}/auth/login", json=creds, timeout=15)
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    return r.json()['token']


@pytest.fixture(scope='module')
def admin_token():
    return _login(ADMIN)


@pytest.fixture(scope='module')
def peserta_token():
    return _login(PESERTA)


@pytest.fixture(scope='module')
def h_admin(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture(scope='module')
def h_peserta(peserta_token):
    return {"Authorization": f"Bearer {peserta_token}"}


@pytest.fixture(scope='module')
def test_participants(h_admin):
    """Create 3 test participants, cleanup after."""
    created = []
    for i in range(3):
        payload = {"name": f"__QA_TEST__B4_{i}", "phone": f"628999000{i:03d}", "gender": "L", "kelompok": "QA"}
        r = requests.post(f"{API}/participants", json=payload, headers=h_admin, timeout=15)
        assert r.status_code in (200, 201), r.text
        created.append(r.json()['id'])
    yield created
    # Cleanup - bulk delete any remaining
    requests.post(f"{API}/participants/bulk-delete", json={"ids": created}, headers=h_admin, timeout=15)


class TestRBAC:
    def test_peserta_cannot_archive(self, h_peserta, test_participants):
        pid = test_participants[0]
        r = requests.patch(f"{API}/participants/{pid}/archive", headers=h_peserta, timeout=10)
        assert r.status_code == 403

    def test_peserta_cannot_restore(self, h_peserta, test_participants):
        pid = test_participants[0]
        r = requests.patch(f"{API}/participants/{pid}/restore", headers=h_peserta, timeout=10)
        assert r.status_code == 403

    def test_peserta_cannot_reset_pw(self, h_peserta, test_participants):
        pid = test_participants[0]
        r = requests.post(f"{API}/participants/{pid}/reset-password", headers=h_peserta, timeout=10)
        assert r.status_code == 403

    def test_peserta_cannot_bulk_delete(self, h_peserta, test_participants):
        r = requests.post(f"{API}/participants/bulk-delete", json={"ids": [test_participants[0]]}, headers=h_peserta, timeout=10)
        assert r.status_code == 403

    def test_peserta_cannot_list_arsip(self, h_peserta):
        r = requests.get(f"{API}/participants?status=arsip", headers=h_peserta, timeout=10)
        assert r.status_code == 403

    def test_peserta_cannot_read_activity_log(self, h_peserta):
        r = requests.get(f"{API}/activity-log", headers=h_peserta, timeout=10)
        assert r.status_code == 403

    def test_admin_can_list_arsip(self, h_admin):
        r = requests.get(f"{API}/participants?status=arsip", headers=h_admin, timeout=10)
        assert r.status_code == 200
        body = r.json()
        items = body if isinstance(body, list) else body.get('items', [])
        assert isinstance(items, list)

    def test_admin_can_read_activity_log(self, h_admin):
        r = requests.get(f"{API}/activity-log", headers=h_admin, timeout=10)
        assert r.status_code == 200


class TestArchiveFlow:
    def test_archive_and_restore(self, h_admin, test_participants):
        pid = test_participants[1]
        def ids_from(resp):
            b = resp.json()
            items = b if isinstance(b, list) else b.get('items', [])
            return [p['id'] for p in items]
        # Archive
        r = requests.patch(f"{API}/participants/{pid}/archive", headers=h_admin, timeout=10)
        assert r.status_code == 200
        # Should NOT appear in default list (aktif)
        r = requests.get(f"{API}/participants", headers=h_admin, timeout=10)
        assert r.status_code == 200
        assert pid not in ids_from(r)
        # Should appear in arsip list
        r = requests.get(f"{API}/participants?status=arsip", headers=h_admin, timeout=10)
        assert r.status_code == 200
        assert pid in ids_from(r)
        # Restore
        r = requests.patch(f"{API}/participants/{pid}/restore", headers=h_admin, timeout=10)
        assert r.status_code == 200
        r = requests.get(f"{API}/participants", headers=h_admin, timeout=10)
        assert pid in ids_from(r)

    def test_bulk_delete(self, h_admin, test_participants):
        pid = test_participants[2]
        r = requests.post(f"{API}/participants/bulk-delete", json={"ids": [pid]}, headers=h_admin, timeout=10)
        assert r.status_code == 200
        assert r.json().get('deleted', 0) >= 1

    def test_bulk_delete_empty_returns_400(self, h_admin):
        r = requests.post(f"{API}/participants/bulk-delete", json={"ids": []}, headers=h_admin, timeout=10)
        assert r.status_code == 400


class TestActivityLog:
    def test_activity_log_no_passwords(self, h_admin):
        r = requests.get(f"{API}/activity-log", headers=h_admin, timeout=15)
        assert r.status_code == 200
        text = r.text.lower()
        # ensure temp_password field is never exposed via activity log
        assert 'temp_password' not in text
        assert 'password_hash' not in text

    def test_activity_log_contains_archive_event(self, h_admin, test_participants):
        # trigger archive
        pid = test_participants[0]
        requests.patch(f"{API}/participants/{pid}/archive", headers=h_admin, timeout=10)
        requests.patch(f"{API}/participants/{pid}/restore", headers=h_admin, timeout=10)
        r = requests.get(f"{API}/activity-log", headers=h_admin, timeout=15)
        assert r.status_code == 200
        events = r.json() if isinstance(r.json(), list) else r.json().get('items', [])
        actions = [e.get('action', '') for e in events]
        assert any('archive_participant' in a for a in actions), f"Actions seen: {set(actions)}"
