"""Backend tests for E-Kertalangu.

Covers auth, RBAC, participants, activities, attendance, musyawarah,
activity-log, WA templates, backup xlsx, dashboard KPIs.
"""
import os
import re
import uuid
import time
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8001').rstrip('/')
API = f"{BASE_URL}/api"

ADMIN_EMAIL = 'ageng.rider@gmail.com'
ADMIN_USER = 'ageng'
ADMIN_PHONE = '081937718541'
ADMIN_PASS = 'Admin123!'


# ---------------- Fixtures ----------------
@pytest.fixture(scope='session')
def s():
    ses = requests.Session()
    ses.headers.update({'Content-Type': 'application/json'})
    return ses


@pytest.fixture(scope='session')
def admin_token(s):
    r = s.post(f'{API}/auth/login', json={'identifier': ADMIN_EMAIL, 'password': ADMIN_PASS})
    assert r.status_code == 200, r.text
    return r.json()['token']


@pytest.fixture(scope='session')
def admin_headers(admin_token):
    return {'Authorization': f'Bearer {admin_token}', 'Content-Type': 'application/json'}


@pytest.fixture(scope='session')
def created_ids():
    return {'participants': [], 'activities': [], 'musyawarah': [], 'users': []}


# ---------------- Config / Health ----------------
def test_root(s):
    r = s.get(f'{API}/')
    assert r.status_code == 200
    assert r.json().get('ok') is True


def test_public_config(s):
    r = s.get(f'{API}/config/public')
    assert r.status_code == 200
    d = r.json()
    assert d.get('admin_wa') == '6281937718541'


# ---------------- Auth ----------------
def test_login_email(s):
    r = s.post(f'{API}/auth/login', json={'identifier': ADMIN_EMAIL, 'password': ADMIN_PASS})
    assert r.status_code == 200
    j = r.json()
    assert 'token' in j and j['user']['role'] == 'admin'


def test_login_username(s):
    r = s.post(f'{API}/auth/login', json={'identifier': ADMIN_USER, 'password': ADMIN_PASS})
    assert r.status_code == 200


def test_login_phone(s):
    r = s.post(f'{API}/auth/login', json={'identifier': ADMIN_PHONE, 'password': ADMIN_PASS})
    assert r.status_code == 200


def test_login_wrong_password(s):
    # Use a unique identifier to avoid lockout on the shared user
    r = s.post(f'{API}/auth/login', json={'identifier': f'noexist_{uuid.uuid4().hex[:6]}@x.com', 'password': 'nope'})
    assert r.status_code in (401, 429)
    assert 'detail' in r.json()


def test_brute_force_lockout(s):
    ident = f'brute_{uuid.uuid4().hex[:6]}@x.com'
    codes = []
    for _ in range(6):
        r = s.post(f'{API}/auth/login', json={'identifier': ident, 'password': 'bad'})
        codes.append(r.status_code)
    assert 429 in codes, f'Expected lockout, got {codes}'


def test_auth_me(admin_headers):
    r = requests.get(f'{API}/auth/me', headers=admin_headers)
    assert r.status_code == 200
    assert r.json()['user']['role'] == 'admin'


# ---------------- Participants ----------------
def test_create_participant(admin_headers, created_ids):
    name = f'TEST_Peserta_{uuid.uuid4().hex[:6]}'
    body = {'name': name, 'gender': 'L', 'phone': '081234567890', 'duplicate_action': 'append'}
    r = requests.post(f'{API}/participants', headers=admin_headers, json=body)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d['name'] == name
    assert re.match(r'^KTL-\d{4}$', d['code'])
    assert d['qr_payload'] == f"EKTL:P:{d['code']}"
    created_ids['participants'].append(d['id'])
    created_ids['first_name'] = name
    return d


def test_duplicate_append(admin_headers, created_ids):
    name = created_ids['first_name']
    r = requests.post(f'{API}/participants', headers=admin_headers, json={'name': name, 'gender': 'P', 'duplicate_action': 'append'})
    assert r.status_code == 200
    assert '(2)' in r.json()['name']
    created_ids['participants'].append(r.json()['id'])


def test_duplicate_reject(admin_headers, created_ids):
    name = created_ids['first_name']
    r = requests.post(f'{API}/participants', headers=admin_headers, json={'name': name, 'gender': 'P', 'duplicate_action': 'reject'})
    assert r.status_code == 409


def test_bulk_create(admin_headers, created_ids):
    items = [
        {'name': f'TEST_Bulk_{uuid.uuid4().hex[:4]}', 'gender': 'L'},
        {'name': f'TEST_Bulk_{uuid.uuid4().hex[:4]}', 'gender': 'P'},
    ]
    r = requests.post(f'{API}/participants/bulk', headers=admin_headers, json=items)
    assert r.status_code == 200
    res = r.json()['results']
    assert len(res) == 2 and all(x['ok'] for x in res)
    for x in res:
        created_ids['participants'].append(x['id'])


def test_search(admin_headers):
    r = requests.get(f'{API}/participants?q=TE', headers=admin_headers)
    assert r.status_code == 200
    assert isinstance(r.json()['items'], list)


def test_get_participant_qr(admin_headers, created_ids):
    pid = created_ids['participants'][0]
    r = requests.get(f'{API}/participants/{pid}', headers=admin_headers)
    assert r.status_code == 200
    assert r.json()['qr_datauri'].startswith('data:image/png;base64,')


def test_patch_participant(admin_headers, created_ids):
    pid = created_ids['participants'][0]
    r = requests.patch(f'{API}/participants/{pid}', headers=admin_headers, json={'education': 'S1'})
    assert r.status_code == 200
    r2 = requests.get(f'{API}/participants/{pid}', headers=admin_headers)
    assert r2.json()['education'] == 'S1'


def test_participant_attendance_and_stats(admin_headers, created_ids):
    pid = created_ids['participants'][0]
    r = requests.get(f'{API}/participants/{pid}/attendance', headers=admin_headers)
    assert r.status_code == 200 and 'items' in r.json()
    r2 = requests.get(f'{API}/participants/{pid}/stats', headers=admin_headers)
    assert r2.status_code == 200 and 'rate_hadir' in r2.json()


# ---------------- Activities ----------------
def test_create_activity(admin_headers, created_ids):
    from datetime import date
    body = {
        'name': f'TEST_Pengajian_{uuid.uuid4().hex[:4]}',
        'type': 'pengajian_rutin',
        'date': date.today().isoformat(),
        'start_time': '19:00',
        'end_time': '20:30',
        'location': 'Kertalangu',
    }
    r = requests.post(f'{API}/activities', headers=admin_headers, json=body)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d['qr_payload'].startswith('EKTL:A:')
    created_ids['activities'].append(d['id'])


def test_get_activity_qr(admin_headers, created_ids):
    aid = created_ids['activities'][0]
    r = requests.get(f'{API}/activities/{aid}', headers=admin_headers)
    assert r.status_code == 200
    assert r.json()['qr_datauri'].startswith('data:image/png;base64,')


def test_list_activities_upcoming(admin_headers):
    r = requests.get(f'{API}/activities?upcoming=true', headers=admin_headers)
    assert r.status_code == 200
    assert isinstance(r.json()['items'], list)


# ---------------- Attendance ----------------
def test_attendance_scan(admin_headers, created_ids):
    aid = created_ids['activities'][0]
    pid = created_ids['participants'][0]
    # get code
    p = requests.get(f'{API}/participants/{pid}', headers=admin_headers).json()
    r = requests.post(f'{API}/attendance/scan', headers=admin_headers, json={'activity_id': aid, 'participant_qr': p['qr_payload']})
    assert r.status_code == 200, r.text
    assert r.json()['status'] == 'hadir'


def test_attendance_manual(admin_headers, created_ids):
    aid = created_ids['activities'][0]
    pid = created_ids['participants'][1]
    r = requests.post(f'{API}/attendance/manual', headers=admin_headers, json={'activity_id': aid, 'participant_id': pid, 'status': 'izin'})
    assert r.status_code == 200
    assert r.json()['status'] == 'izin'


def test_attendance_by_activity(admin_headers, created_ids):
    aid = created_ids['activities'][0]
    r = requests.get(f'{API}/attendance/by-activity/{aid}', headers=admin_headers)
    assert r.status_code == 200
    d = r.json()
    assert 'items' in d and 'all_participants' in d
    assert len(d['items']) >= 2


def test_attendance_summary_daily(admin_headers):
    r = requests.get(f'{API}/attendance/summary?range_key=daily', headers=admin_headers)
    assert r.status_code == 200
    assert 'counts' in r.json()


def test_attendance_summary_weekly(admin_headers):
    r = requests.get(f'{API}/attendance/summary?range_key=weekly', headers=admin_headers)
    assert r.status_code == 200


# ---------------- Musyawarah ----------------
def test_musyawarah_crud_export(admin_headers, created_ids):
    r = requests.post(f'{API}/musyawarah', headers=admin_headers, json={'kind': '4S', 'title': 'TEST notulen', 'content': 'baris1\nbaris2'})
    assert r.status_code == 200
    mid = r.json()['id']
    created_ids['musyawarah'].append(mid)

    r2 = requests.patch(f'{API}/musyawarah/{mid}', headers=admin_headers, json={'content': 'baris1\nbaris2\nbaris3'})
    assert r2.status_code == 200 and 'updated_at' in r2.json()

    r3 = requests.get(f'{API}/musyawarah/{mid}/export/xlsx', headers=admin_headers)
    assert r3.status_code == 200
    assert 'spreadsheetml' in r3.headers.get('content-type', '')


def test_musyawarah_tim7(admin_headers, created_ids):
    r = requests.post(f'{API}/musyawarah', headers=admin_headers, json={'kind': 'TIM7', 'title': 'TEST tim7'})
    assert r.status_code == 200
    created_ids['musyawarah'].append(r.json()['id'])


# ---------------- Activity log / WA / Dashboard / Backup ----------------
def test_activity_log(admin_headers):
    r = requests.get(f'{API}/activity-log', headers=admin_headers)
    assert r.status_code == 200
    assert isinstance(r.json()['items'], list)


def test_wa_templates(admin_headers):
    r = requests.get(f'{API}/wa/templates', headers=admin_headers)
    assert r.status_code == 200
    assert len(r.json()['templates']) == 4


def test_dashboard_kpi(admin_headers):
    r = requests.get(f'{API}/dashboard/kpi', headers=admin_headers)
    assert r.status_code == 200
    for k in ('peserta_aktif', 'kegiatan_upcoming', 'hadir_hari_ini', 'today'):
        assert k in r.json()


def test_backup_xlsx(admin_headers):
    r = requests.get(f'{API}/backup/xlsx', headers=admin_headers)
    assert r.status_code == 200
    cd = r.headers.get('content-disposition', '')
    assert 'e kertalangu' in cd and '.xlsx' in cd


# ---------------- Users / RBAC ----------------
@pytest.fixture(scope='session')
def peserta_user(admin_headers, created_ids):
    """Create peserta user and return token."""
    uname = f'test_p_{uuid.uuid4().hex[:6]}'
    pw = 'Peserta123!'
    r = requests.post(f'{API}/users', headers=admin_headers, json={
        'name': 'TEST Peserta', 'username': uname, 'password': pw, 'role': 'peserta'
    })
    assert r.status_code == 200, r.text
    uid = r.json()['id']
    created_ids['users'].append(uid)
    tok = requests.post(f'{API}/auth/login', json={'identifier': uname, 'password': pw}).json()['token']
    return {'id': uid, 'headers': {'Authorization': f'Bearer {tok}', 'Content-Type': 'application/json'}}


def test_create_user_and_login(peserta_user):
    assert 'Authorization' in peserta_user['headers']


def test_rbac_peserta_cannot_create_participant(peserta_user):
    r = requests.post(f'{API}/participants', headers=peserta_user['headers'], json={'name': 'X', 'gender': 'L'})
    assert r.status_code == 403


def test_rbac_peserta_cannot_delete_activity(peserta_user, created_ids):
    aid = created_ids['activities'][0]
    r = requests.delete(f'{API}/activities/{aid}', headers=peserta_user['headers'])
    assert r.status_code == 403


def test_role_update(admin_headers, peserta_user):
    r = requests.patch(f'{API}/users/{peserta_user["id"]}/role', headers=admin_headers, json={'role': 'pengurus'})
    assert r.status_code == 200


def test_toggle_active(admin_headers, peserta_user):
    r = requests.patch(f'{API}/users/{peserta_user["id"]}/toggle-active', headers=admin_headers)
    assert r.status_code == 200
    # toggle back
    requests.patch(f'{API}/users/{peserta_user["id"]}/toggle-active', headers=admin_headers)


def test_secret_allow(admin_headers, created_ids):
    aid = created_ids['activities'][0]
    r = requests.post(f'{API}/activities/{aid}/secret-allow', headers=admin_headers, json={'participant_ids': [created_ids['participants'][0]]})
    assert r.status_code == 200
    d = requests.get(f'{API}/activities/{aid}', headers=admin_headers).json()
    assert d['is_secret'] is True and created_ids['participants'][0] in d['secret_allow']


# ---------------- Cleanup ----------------
def test_zz_cleanup(admin_headers, created_ids):
    # Delete activities (also drops attendance)
    for aid in created_ids['activities']:
        requests.delete(f'{API}/activities/{aid}', headers=admin_headers)
    for pid in created_ids['participants']:
        requests.delete(f'{API}/participants/{pid}', headers=admin_headers)
    for mid in created_ids['musyawarah']:
        requests.delete(f'{API}/musyawarah/{mid}', headers=admin_headers)
