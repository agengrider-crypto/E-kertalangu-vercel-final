"""Regression tests after Vercel restructure (bootstrap() + /api/health + BACKEND_URL refactor).

Covers: health, admin login (JWT + role), and read-only GETs for all major
modules (participants, activities, dashboard, announcements, users, musyawarah,
activity-log, reports). Plus peserta role-guard checks when creds available.
"""
import os
import uuid

import pytest
import requests
from dotenv import dotenv_values

_env = dotenv_values('/app/frontend/.env')
BASE_URL = (os.environ.get('REACT_APP_BACKEND_URL') or _env.get('REACT_APP_BACKEND_URL') or '').rstrip('/')
if not BASE_URL:
    raise RuntimeError('REACT_APP_BACKEND_URL missing')
API = f'{BASE_URL}/api'

ADMIN_ID = 'agengpadma8@gmail.com'
ADMIN_PASS = 'jokam354'
PESERTA_ID = '6282233776643'
PESERTA_PASS = 'frengky123'


@pytest.fixture(scope='session')
def s():
    ses = requests.Session()
    ses.headers.update({'Content-Type': 'application/json'})
    return ses


@pytest.fixture(scope='session')
def admin_headers(s):
    r = s.post(f'{API}/auth/login', json={'identifier': ADMIN_ID, 'password': ADMIN_PASS})
    if r.status_code != 200:
        pytest.fail(f'admin login failed {r.status_code}: {r.text[:300]}')
    d = r.json()
    assert d['user']['role'] == 'admin'
    assert isinstance(d['token'], str) and len(d['token']) > 20
    return {'Authorization': f"Bearer {d['token']}", 'Content-Type': 'application/json'}


@pytest.fixture(scope='session')
def peserta_headers(s, admin_headers):
    # Coba login peserta lama; kalau gagal, buat akun peserta TEST_ via admin.
    r = s.post(f'{API}/auth/login', json={'identifier': PESERTA_ID, 'password': PESERTA_PASS})
    if r.status_code == 200:
        yield {'Authorization': f"Bearer {r.json()['token']}", 'Content-Type': 'application/json'}
        return

    uname = f'test_peserta_{uuid.uuid4().hex[:8]}'
    cr = s.post(f'{API}/users', headers=admin_headers, json={
        'username': uname, 'name': 'TEST_Peserta QA', 'password': 'Test1234!', 'role': 'peserta',
    })
    if cr.status_code not in (200, 201):
        yield None
        return
    uid = cr.json().get('id')
    lr = s.post(f'{API}/auth/login', json={'identifier': uname, 'password': 'Test1234!'})
    headers = None
    if lr.status_code == 200:
        headers = {'Authorization': f"Bearer {lr.json()['token']}", 'Content-Type': 'application/json'}
    yield headers
    # teardown: hapus user TEST_ langsung dari mongo (tidak ada endpoint DELETE /users)
    try:
        from pymongo import MongoClient
        benv = dotenv_values('/app/backend/.env')
        cli = MongoClient(benv.get('MONGO_URL'))
        cli[benv.get('DB_NAME')].users.delete_one({'_id': uid})
        cli.close()
    except Exception as e:  # pragma: no cover
        print(f'cleanup warning: {e}')


# ---------------- health / bootstrap ----------------
def test_health(s):
    r = s.get(f'{API}/health')
    assert r.status_code == 200
    assert r.json() == {'status': 'ok'}


def test_api_root(s):
    r = s.get(f'{API}/')
    assert r.status_code == 200
    assert r.json().get('ok') is True


def test_public_config(s):
    r = s.get(f'{API}/config/public')
    assert r.status_code == 200
    assert 'admin_wa' in r.json()


# ---------------- auth ----------------
def test_login_by_username(s):
    r = s.post(f'{API}/auth/login', json={'identifier': 'admin', 'password': ADMIN_PASS})
    assert r.status_code == 200
    assert r.json()['user']['role'] == 'admin'


def test_login_wrong_password(s):
    r = s.post(f'{API}/auth/login', json={'identifier': ADMIN_ID, 'password': 'wrong-pass'})
    assert r.status_code in (400, 401)


def test_auth_me(s, admin_headers):
    r = s.get(f'{API}/auth/me', headers=admin_headers)
    assert r.status_code == 200
    assert r.json()['user']['email'] == ADMIN_ID
    assert r.json()['user']['role'] == 'admin'


def test_no_token_401(s):
    r = requests.get(f'{API}/participants')
    assert r.status_code in (401, 403)


# ---------------- module GET regression ----------------
@pytest.mark.parametrize('path,checker', [
    ('/participants', lambda d: isinstance(d, (list, dict))),
    ('/activities', lambda d: isinstance(d, (list, dict))),
    ('/dashboard/stats', lambda d: isinstance(d, dict)),
    ('/dashboard/kpi', lambda d: isinstance(d, dict)),
    ('/announcements', lambda d: isinstance(d, (list, dict))),
    ('/users', lambda d: isinstance(d, (list, dict))),
    ('/musyawarah', lambda d: isinstance(d, (list, dict))),
    ('/activity-log', lambda d: isinstance(d, (list, dict))),
    ('/attendance/summary', lambda d: d is not None),
    ('/wa/templates', lambda d: d is not None),
    ('/notifications', lambda d: d is not None),
    ('/auth/pending-count', lambda d: isinstance(d, dict)),
    ('/analytics/alpha-alert', lambda d: d is not None),
    ('/reminders/tomorrow', lambda d: d is not None),
])
def test_admin_get_endpoints(s, admin_headers, path, checker):
    r = s.get(f'{API}{path}', headers=admin_headers)
    assert r.status_code == 200, f'{path} -> {r.status_code} {r.text[:200]}'
    assert checker(r.json()), f'{path} unexpected payload shape'


def test_reports_attendance(s, admin_headers):
    r = s.get(f'{API}/reports/attendance', headers=admin_headers,
              params={'start': '2026-01-01', 'end': '2026-12-31'})
    assert r.status_code == 200, r.text[:300]
    assert isinstance(r.json(), dict)


def test_reports_monthly(s, admin_headers):
    r = s.get(f'{API}/reports/monthly', headers=admin_headers, params={'month': '2026-07'})
    assert r.status_code == 200, r.text[:300]
    assert isinstance(r.json(), dict)


def test_no_mongo_object_id_leak(s, admin_headers):
    for path in ['/participants', '/activities', '/users', '/announcements']:
        r = s.get(f'{API}{path}', headers=admin_headers)
        assert '"_id"' not in r.text, f'{path} leaks _id'


# ---------------- role guard ----------------
def test_peserta_forbidden_on_admin_routes(s, peserta_headers):
    if not peserta_headers:
        pytest.skip('peserta credentials unavailable')
    for path in ['/participants', '/users', '/activity-log', '/attendance/summary']:
        r = s.get(f'{API}{path}', headers=peserta_headers)
        assert r.status_code == 403, f'{path} expected 403 got {r.status_code}'
