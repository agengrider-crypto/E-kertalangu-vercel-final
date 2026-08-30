"""SEC-001 backend security fix verification tests."""
import os
import datetime
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://bertanya-hub.preview.emergentagent.com').rstrip('/')
API = f"{BASE_URL}/api"

ADMIN = {"identifier": "agengpadma8@gmail.com", "password": "jokam354"}
PESERTA = {"identifier": "6282233776643", "password": "frengky123"}


def login(creds):
    r = requests.post(f"{API}/auth/login", json=creds, timeout=30)
    assert r.status_code == 200, f"Login failed {creds['identifier']}: {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="module")
def admin_token():
    return login(ADMIN)


@pytest.fixture(scope="module")
def peserta_token():
    return login(PESERTA)


def auth(tok):
    return {"Authorization": f"Bearer {tok}"}


@pytest.fixture(scope="module")
def activities(admin_token):
    today = datetime.date.today().isoformat()
    base = {"type": "pengajian_rutin", "date": today, "start_time": "08:00", "end_time": "10:00"}
    r1 = requests.post(f"{API}/activities", json={**base, "name": "TEST_SEC_NonRahasia"}, headers=auth(admin_token))
    assert r1.status_code in (200, 201), r1.text
    r2 = requests.post(f"{API}/activities", json={**base, "name": "TEST_SEC_Rahasia", "is_secret": True}, headers=auth(admin_token))
    assert r2.status_code in (200, 201), r2.text
    a1 = r1.json(); a2 = r2.json()
    aid_normal = a1.get("id") or a1.get("_id") or a1.get("activity_id")
    aid_secret = a2.get("id") or a2.get("_id") or a2.get("activity_id")
    assert aid_normal and aid_secret, f"Missing IDs: {a1} {a2}"
    yield {"normal": aid_normal, "secret": aid_secret}
    # cleanup
    for aid in (aid_normal, aid_secret):
        try:
            requests.delete(f"{API}/activities/{aid}", headers=auth(admin_token), timeout=15)
        except Exception:
            pass


# --- PESERTA forbidden ---
def test_peserta_forbidden_by_activity(peserta_token, activities):
    r = requests.get(f"{API}/attendance/by-activity/{activities['normal']}", headers=auth(peserta_token))
    assert r.status_code == 403, f"expected 403 got {r.status_code}: {r.text}"


def test_peserta_forbidden_summary(peserta_token):
    r = requests.get(f"{API}/attendance/summary?range_key=daily", headers=auth(peserta_token))
    assert r.status_code == 403, f"expected 403 got {r.status_code}: {r.text}"


def test_peserta_forbidden_secret_activity(peserta_token, activities):
    r = requests.get(f"{API}/activities/{activities['secret']}", headers=auth(peserta_token))
    assert r.status_code == 403, f"expected 403 got {r.status_code}: {r.text}"


def test_peserta_can_read_normal_activity(peserta_token, activities):
    r = requests.get(f"{API}/activities/{activities['normal']}", headers=auth(peserta_token))
    assert r.status_code == 200, f"expected 200 got {r.status_code}: {r.text}"
    data = r.json()
    assert data.get("name") == "TEST_SEC_NonRahasia"
    assert "date" in data and "start_time" in data


# --- ADMIN regression ---
def test_admin_by_activity_ok(admin_token, activities):
    r = requests.get(f"{API}/attendance/by-activity/{activities['normal']}", headers=auth(admin_token))
    assert r.status_code == 200, r.text
    d = r.json()
    assert "items" in d and "all_participants" in d


def test_admin_summary_ok(admin_token):
    r = requests.get(f"{API}/attendance/summary?range_key=daily", headers=auth(admin_token))
    assert r.status_code == 200, r.text


def test_admin_can_read_secret_activity(admin_token, activities):
    r = requests.get(f"{API}/activities/{activities['secret']}", headers=auth(admin_token))
    assert r.status_code == 200, r.text
    assert r.json().get("is_secret") is True
