"""BATCH 5 - Dashboard overview stats role-based tests"""
import os
import requests
import pytest

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')
API = f"{BASE_URL}/api"

ADMIN = {"identifier": "agengpadma8@gmail.com", "password": "jokam354"}
PESERTA = {"identifier": "frengky123@gmail.com", "password": "frengky123"}


def _login(creds):
    r = requests.post(f"{API}/auth/login", json=creds, timeout=15)
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    j = r.json()
    return j.get("token") or j.get("access_token")


@pytest.fixture(scope="module")
def admin_token():
    return _login(ADMIN)


@pytest.fixture(scope="module")
def peserta_token():
    return _login(PESERTA)


def test_admin_dashboard_stats_has_overview(admin_token):
    r = requests.get(f"{API}/dashboard/stats", headers={"Authorization": f"Bearer {admin_token}"}, timeout=15)
    assert r.status_code == 200
    data = r.json()
    # legacy fields present
    for k in ("gender", "last30", "today", "series_hadir_14d", "pending_users"):
        assert k in data, f"missing legacy field {k}"
    # overview block
    assert "overview" in data
    ov = data["overview"]
    for k in ("total_participants", "activated_participants", "unactivated_participants",
              "total_activities", "monthly_activities", "total_attendance", "attendance_rate"):
        assert k in ov, f"missing overview field {k}"
        # types
        assert isinstance(ov[k], (int, float)), f"{k} not numeric: {ov[k]}"
    # invariant
    assert ov["activated_participants"] + ov["unactivated_participants"] == ov["total_participants"]


def test_peserta_dashboard_stats_no_overview(peserta_token):
    r = requests.get(f"{API}/dashboard/stats", headers={"Authorization": f"Bearer {peserta_token}"}, timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert "overview" not in data, "peserta should NOT get overview block"
    # standard fields still there
    for k in ("gender", "last30", "today", "series_hadir_14d"):
        assert k in data


def test_dashboard_stats_unauth():
    r = requests.get(f"{API}/dashboard/stats", timeout=15)
    assert r.status_code in (401, 403)
