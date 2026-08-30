"""Tests for /api/activation flow (BUG FIX: peserta tanpa No. HP boleh aktivasi mandiri)."""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    # try frontend .env
    try:
        with open('/app/frontend/.env') as f:
            for line in f:
                if line.startswith('REACT_APP_BACKEND_URL='):
                    BASE_URL = line.split('=', 1)[1].strip().rstrip('/')
                    break
    except Exception:
        pass

API = f"{BASE_URL}/api"

ADMIN = {"identifier": "agengpadma8@gmail.com", "password": "jokam354"}
FRENGKY = {"identifier": "frengky123@gmail.com", "password": "frengky123"}


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{API}/auth/login", json=ADMIN, timeout=15)
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


def _create_participant(headers, name, phone=""):
    body = {
        "name": name,
        "gender": "L",
        "phone": phone,
        "status": "aktif",
        "duplicate_action": "append",
    }
    r = requests.post(f"{API}/participants", json=body, headers=headers, timeout=15)
    assert r.status_code in (200, 201), f"create participant: {r.status_code} {r.text}"
    return r.json()


created_ids = []
created_user_phones = []


@pytest.fixture(scope="module", autouse=True)
def cleanup(admin_headers):
    yield
    # Cleanup participants
    for pid in created_ids:
        try:
            requests.delete(f"{API}/participants/{pid}", headers=admin_headers, timeout=10)
        except Exception:
            pass
    # Cleanup users created via activation (by phone)
    try:
        # Try to search & delete users
        r = requests.get(f"{API}/users", headers=admin_headers, timeout=15)
        if r.status_code == 200:
            data = r.json()
            users = data if isinstance(data, list) else data.get("items", [])
            for u in users:
                if u.get("phone") in created_user_phones or (u.get("name", "").startswith("__QA_ACT")):
                    uid = u.get("id") or u.get("_id")
                    if uid:
                        requests.delete(f"{API}/users/{uid}", headers=admin_headers, timeout=10)
    except Exception:
        pass


def test_regression_admin_login():
    r = requests.post(f"{API}/auth/login", json=ADMIN, timeout=15)
    assert r.status_code == 200
    assert "token" in r.json()


def test_regression_frengky_login():
    r = requests.post(f"{API}/auth/login", json=FRENGKY, timeout=15)
    assert r.status_code == 200, f"frengky login: {r.status_code} {r.text}"


def test_bugfix_activation_without_phone(admin_headers):
    """MAIN BUG FIX: peserta tanpa No. HP dapat aktivasi mandiri."""
    ts = int(time.time() * 1000)
    name = f"__QA_ACT__NoPhone_{ts}"
    p = _create_participant(admin_headers, name, phone="")
    pid = p["id"]
    created_ids.append(pid)

    # Search
    r = requests.get(f"{API}/activation/search", params={"q": "__QA_ACT__NoPhone"}, timeout=15)
    assert r.status_code == 200
    items = r.json().get("items", [])
    found = [it for it in items if it["id"] == pid]
    assert found, f"peserta tidak ditemukan via search: {items}"
    assert found[0]["has_phone"] is False

    phone = f"08120000{ts % 10000:04d}"
    created_user_phones.append(phone)
    r = requests.post(f"{API}/activation/activate",
                      json={"participant_id": pid, "phone": phone, "password": "rahasia123"},
                      timeout=15)
    assert r.status_code == 200, f"activation should succeed: {r.status_code} {r.text}"
    data = r.json()
    assert "token" in data and "user" in data
    norm = "62" + phone[1:] if phone.startswith("0") else phone
    assert data["user"]["phone"] in (phone, norm)
    stored = data["user"]["phone"]
    assert data["user"]["participant_id"] == pid

    # Verify participant.phone updated
    r2 = requests.get(f"{API}/participants/{pid}", headers=admin_headers, timeout=15)
    assert r2.status_code == 200
    assert r2.json().get("phone") == stored

    # Verify login with new phone (using stored form)
    r3 = requests.post(f"{API}/auth/login", json={"identifier": stored, "password": "rahasia123"}, timeout=15)
    assert r3.status_code == 200, f"login after activation: {r3.status_code} {r3.text}"


def test_sec002_wrong_phone_rejected(admin_headers):
    """Peserta yang sudah punya phone -> nomor salah ditolak, nomor benar diterima."""
    ts = int(time.time() * 1000)
    correct_phone = f"08120000{(ts % 10000):04d}"
    # avoid collision with previous test
    correct_phone = "0812" + str(ts)[-8:]
    name = f"__QA_ACT2__WithPhone_{ts}"
    p = _create_participant(admin_headers, name, phone=correct_phone)
    pid = p["id"]
    created_ids.append(pid)

    wrong = "081299999999"
    r = requests.post(f"{API}/activation/activate",
                      json={"participant_id": pid, "phone": wrong, "password": "rahasia123"},
                      timeout=15)
    assert r.status_code == 400
    assert "tidak cocok" in r.text.lower()

    # Correct phone
    created_user_phones.append(correct_phone)
    r2 = requests.post(f"{API}/activation/activate",
                       json={"participant_id": pid, "phone": correct_phone, "password": "rahasia123"},
                       timeout=15)
    assert r2.status_code == 200, f"correct phone: {r2.status_code} {r2.text}"


def test_password_too_short(admin_headers):
    ts = int(time.time() * 1000)
    p = _create_participant(admin_headers, f"__QA_ACT__ShortPw_{ts}", phone="")
    created_ids.append(p["id"])
    r = requests.post(f"{API}/activation/activate",
                      json={"participant_id": p["id"], "phone": "0812" + str(ts)[-8:], "password": "abc"},
                      timeout=15)
    assert r.status_code == 400
    assert "6 karakter" in r.text or "minimal" in r.text.lower()


def test_phone_already_used(admin_headers):
    ts = int(time.time() * 1000)
    phone = "0812" + str(ts)[-8:]
    # Peserta A -> aktivasi dengan phone
    pA = _create_participant(admin_headers, f"__QA_ACT__A_{ts}", phone="")
    created_ids.append(pA["id"])
    created_user_phones.append(phone)
    r = requests.post(f"{API}/activation/activate",
                      json={"participant_id": pA["id"], "phone": phone, "password": "rahasia123"},
                      timeout=15)
    assert r.status_code == 200

    # Peserta B -> phone sama harus 400 'sudah digunakan'
    pB = _create_participant(admin_headers, f"__QA_ACT__B_{ts}", phone="")
    created_ids.append(pB["id"])
    r2 = requests.post(f"{API}/activation/activate",
                       json={"participant_id": pB["id"], "phone": phone, "password": "rahasia123"},
                       timeout=15)
    assert r2.status_code == 400
    assert "sudah digunakan" in r2.text.lower() or "digunakan" in r2.text.lower()


def test_already_has_account_409(admin_headers):
    ts = int(time.time() * 1000)
    p = _create_participant(admin_headers, f"__QA_ACT__Dup_{ts}", phone="")
    created_ids.append(p["id"])
    phone1 = "0812" + str(ts)[-8:]
    created_user_phones.append(phone1)
    r = requests.post(f"{API}/activation/activate",
                      json={"participant_id": p["id"], "phone": phone1, "password": "rahasia123"},
                      timeout=15)
    assert r.status_code == 200
    # Second attempt
    phone2 = "0813" + str(ts)[-8:]
    r2 = requests.post(f"{API}/activation/activate",
                       json={"participant_id": p["id"], "phone": phone2, "password": "rahasia123"},
                       timeout=15)
    assert r2.status_code == 409
