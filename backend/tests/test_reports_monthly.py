"""Backend tests for /api/reports/monthly and /api/musyawarah (used by Reports UI).

- GET /api/reports/monthly?month=YYYY-MM (admin/pengurus)
  * by_activity aggregation is correct
  * totals consistent with by_activity
- Role 'peserta' -> 403
- GET /api/musyawarah?kind=4S|TIM7 (admin/pengurus) - used by Musyawarah tab
"""
import os
import uuid
from datetime import date

import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')
API = f"{BASE_URL}/api"

ADMIN_EMAIL = 'agengpadma8@gmail.com'
ADMIN_PASS = 'jokam354'


@pytest.fixture(scope='module')
def admin_headers():
    r = requests.post(f'{API}/auth/login', json={'identifier': ADMIN_EMAIL, 'password': ADMIN_PASS})
    assert r.status_code == 200, r.text
    return {'Authorization': f"Bearer {r.json()['token']}", 'Content-Type': 'application/json'}


@pytest.fixture(scope='module')
def peserta_headers(admin_headers):
    uname = f'test_mo_p_{uuid.uuid4().hex[:6]}'
    pw = 'Peserta123!'
    r = requests.post(f'{API}/users', headers=admin_headers, json={
        'name': 'TEST Peserta Monthly', 'username': uname, 'password': pw, 'role': 'peserta',
    })
    assert r.status_code == 200, r.text
    uid = r.json()['id']
    tok = requests.post(f'{API}/auth/login', json={'identifier': uname, 'password': pw}).json()['token']
    yield {'Authorization': f'Bearer {tok}', 'Content-Type': 'application/json'}
    requests.delete(f'{API}/users/{uid}', headers=admin_headers)


@pytest.fixture(scope='module')
def seeded_monthly(admin_headers):
    """Seed 2 activities on today's month with different attendance patterns."""
    today = date.today().isoformat()  # YYYY-MM-DD
    month = today[:7]

    # Activity 1: 2 hadir, 1 izin
    a1 = requests.post(f'{API}/activities', headers=admin_headers, json={
        'name': f'__QA_MO_A1__{uuid.uuid4().hex[:6]}',
        'type': 'pengajian_rutin', 'date': today,
        'start_time': '19:00', 'end_time': '20:30', 'location': 'QA'
    }).json()
    # Activity 2: 1 hadir, 1 alpha
    a2 = requests.post(f'{API}/activities', headers=admin_headers, json={
        'name': f'__QA_MO_A2__{uuid.uuid4().hex[:6]}',
        'type': 'pengajian_rutin', 'date': today,
        'start_time': '19:00', 'end_time': '20:30', 'location': 'QA'
    }).json()

    pids = []
    for label in ['P1', 'P2', 'P3']:
        p = requests.post(f'{API}/participants', headers=admin_headers, json={
            'name': f'__QA_MO__{label}_{uuid.uuid4().hex[:4]}', 'gender': 'L',
            'duplicate_action': 'append'
        }).json()
        pids.append(p['id'])

    # A1: p1=hadir, p2=hadir, p3=izin
    for pid, st in zip(pids, ['hadir', 'hadir', 'izin']):
        requests.post(f'{API}/attendance/manual', headers=admin_headers,
                      json={'activity_id': a1['id'], 'participant_id': pid, 'status': st})
    # A2: p1=hadir, p2=alpha (only 2 rows)
    for pid, st in zip(pids[:2], ['hadir', 'alpha']):
        requests.post(f'{API}/attendance/manual', headers=admin_headers,
                      json={'activity_id': a2['id'], 'participant_id': pid, 'status': st})

    yield {'month': month, 'a1': a1['id'], 'a2': a2['id'], 'pids': pids}

    requests.delete(f'{API}/activities/{a1["id"]}', headers=admin_headers)
    requests.delete(f'{API}/activities/{a2["id"]}', headers=admin_headers)
    for pid in pids:
        requests.delete(f'{API}/participants/{pid}', headers=admin_headers)


# ---------------- Monthly report tests ----------------
def test_monthly_requires_auth():
    r = requests.get(f'{API}/reports/monthly', params={'month': '2025-01'})
    assert r.status_code in (401, 403)


def test_monthly_forbidden_for_peserta(peserta_headers):
    r = requests.get(f'{API}/reports/monthly', headers=peserta_headers, params={'month': '2025-01'})
    assert r.status_code == 403


def test_monthly_missing_month_400(admin_headers):
    r = requests.get(f'{API}/reports/monthly', headers=admin_headers)
    assert r.status_code in (400, 422)


def test_monthly_shape_and_aggregation(admin_headers, seeded_monthly):
    r = requests.get(f'{API}/reports/monthly', headers=admin_headers,
                     params={'month': seeded_monthly['month']})
    assert r.status_code == 200, r.text
    d = r.json()
    assert d['month'] == seeded_monthly['month']
    assert 'by_activity' in d and 'totals' in d

    # Filter down to our seeded activities
    a1 = next((r for r in d['by_activity'] if r['activity_id'] == seeded_monthly['a1']), None)
    a2 = next((r for r in d['by_activity'] if r['activity_id'] == seeded_monthly['a2']), None)
    assert a1 is not None and a2 is not None

    # a1: 2 hadir, 1 izin, 0 alpha, total 3, rate = 2/3
    assert a1['hadir'] == 2 and a1['izin'] == 1 and a1['alpha'] == 0
    assert a1['total'] == 3
    assert a1['rate'] == round(2 / 3 * 100, 1)

    # a2: 1 hadir, 0 izin, 1 alpha
    assert a2['hadir'] == 1 and a2['izin'] == 0 and a2['alpha'] == 1
    assert a2['total'] == 2
    assert a2['rate'] == 50.0

    # totals must be consistent: sum across by_activity >= what we seeded
    tots = d['totals']
    # sums across all activities
    sum_h = sum(x['hadir'] for x in d['by_activity'])
    sum_i = sum(x['izin'] for x in d['by_activity'])
    sum_a = sum(x['alpha'] for x in d['by_activity'])
    assert tots['hadir'] == sum_h
    assert tots['izin'] == sum_i
    assert tots['alpha'] == sum_a
    assert tots['total'] == sum_h + sum_i + sum_a
    assert tots['activities'] == len(d['by_activity'])
    if tots['total']:
        assert tots['rate_hadir'] == round(sum_h / tots['total'] * 100, 1)


def test_monthly_empty_month(admin_headers):
    # far past month with no data
    r = requests.get(f'{API}/reports/monthly', headers=admin_headers, params={'month': '2000-01'})
    assert r.status_code == 200
    d = r.json()
    assert d['by_activity'] == []
    t = d['totals']
    assert t['activities'] == 0 and t['total'] == 0 and t['rate_hadir'] == 0


# ---------------- Musyawarah listing tests ----------------
@pytest.fixture(scope='module')
def seeded_musyawarah(admin_headers):
    today = date.today().isoformat()
    ids = []
    for kind in ['4S', 'TIM7']:
        r = requests.post(f'{API}/musyawarah', headers=admin_headers, json={
            'kind': kind, 'title': f'__QA_MU__{kind}_{uuid.uuid4().hex[:5]}',
            'content': 'QA content', 'date': today,
        })
        assert r.status_code == 200, r.text
        ids.append(r.json()['id'])
    yield {'ids': ids, 'today': today, 'month': today[:7]}
    for i in ids:
        requests.delete(f'{API}/musyawarah/{i}', headers=admin_headers)


def test_musyawarah_forbidden_for_peserta(peserta_headers):
    r = requests.get(f'{API}/musyawarah', headers=peserta_headers, params={'kind': '4S'})
    assert r.status_code == 403


def test_musyawarah_kind_filter(admin_headers, seeded_musyawarah):
    r = requests.get(f'{API}/musyawarah', headers=admin_headers, params={'kind': '4S'})
    assert r.status_code == 200
    items = r.json().get('items', [])
    assert any(m['id'] == seeded_musyawarah['ids'][0] for m in items)
    # all must be kind 4S
    assert all(m.get('kind') == '4S' for m in items)


def test_musyawarah_kind_tim7(admin_headers, seeded_musyawarah):
    r = requests.get(f'{API}/musyawarah', headers=admin_headers, params={'kind': 'TIM7'})
    assert r.status_code == 200
    items = r.json().get('items', [])
    assert any(m['id'] == seeded_musyawarah['ids'][1] for m in items)
    assert all(m.get('kind') == 'TIM7' for m in items)
    # date field present so UI can filter by month
    for m in items:
        assert 'date' in m
