#!/usr/bin/env python3
"""
Backend API Tests for E-Kertalangu
Tests registration without admin approval, permanent login (365-day JWT),
and public report feature (Laporan Kegiatan Rutin)
"""

import requests
import jwt
import time
import random
import string
from datetime import datetime, timezone, timedelta, date

# Base URL from frontend/.env REACT_APP_BACKEND_URL
BASE_URL = "https://bertanya-hub.preview.emergentagent.com/api"

# Admin credentials from test_credentials.md
ADMIN_EMAIL = "agengpadma8@gmail.com"
ADMIN_PASSWORD = "jokam354"

def generate_unique_email():
    """Generate a unique email for testing"""
    random_suffix = ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))
    return f"testuser_{random_suffix}@example.com"

def test_registration_without_approval():
    """
    TEST 1: Registration WITHOUT admin approval (auto-active + auto-login)
    - POST /api/auth/register with unique identifier
    - Expect HTTP 200 with pending=false, token, user.active=true, user.pending_approval=false
    - Then POST /api/auth/login with same credentials
    - Expect HTTP 200 with token (NOT 403 'menunggu persetujuan admin')
    - Then GET /api/auth/me with register token
    """
    print("\n" + "="*80)
    print("TEST 1: Registration WITHOUT admin approval (auto-active + auto-login)")
    print("="*80)
    
    # Generate unique test data
    test_email = generate_unique_email()
    test_data = {
        "name": "Test User Auto",
        "email": test_email,
        "password": "test123",
        "gender": "L"
    }
    
    print(f"\n1.1 Testing POST /api/auth/register with email: {test_email}")
    
    try:
        response = requests.post(f"{BASE_URL}/auth/register", json=test_data, timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ FAILED: Expected 200, got {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        data = response.json()
        print(f"Response JSON: {data}")
        
        # Verify pending=false
        if data.get('pending') is not False:
            print(f"❌ FAILED: Expected pending=false, got pending={data.get('pending')}")
            return False
        print("✅ pending=false")
        
        # Verify token exists and is non-empty
        token = data.get('token')
        if not token or not isinstance(token, str) or len(token) == 0:
            print(f"❌ FAILED: Expected non-empty token string, got: {token}")
            return False
        print(f"✅ token exists (length: {len(token)})")
        
        # Verify user object
        user = data.get('user')
        if not user:
            print(f"❌ FAILED: No user object in response")
            return False
        
        # Verify user.active=true
        if user.get('active') is not True:
            print(f"❌ FAILED: Expected user.active=true, got user.active={user.get('active')}")
            return False
        print("✅ user.active=true")
        
        # Verify user.pending_approval=false
        if user.get('pending_approval') is not False:
            print(f"❌ FAILED: Expected user.pending_approval=false, got user.pending_approval={user.get('pending_approval')}")
            return False
        print("✅ user.pending_approval=false")
        
        print("\n1.2 Testing POST /api/auth/login with same credentials")
        login_data = {
            "identifier": test_email,
            "password": "test123"
        }
        
        login_response = requests.post(f"{BASE_URL}/auth/login", json=login_data, timeout=10)
        print(f"Status Code: {login_response.status_code}")
        
        if login_response.status_code == 403:
            print(f"❌ FAILED: Got 403 (menunggu persetujuan admin) - user should be auto-approved")
            print(f"Response: {login_response.text}")
            return False
        
        if login_response.status_code != 200:
            print(f"❌ FAILED: Expected 200, got {login_response.status_code}")
            print(f"Response: {login_response.text}")
            return False
        
        login_data_response = login_response.json()
        print(f"Response JSON: {login_data_response}")
        
        # Verify login returns token
        login_token = login_data_response.get('token')
        if not login_token:
            print(f"❌ FAILED: No token in login response")
            return False
        print(f"✅ Login successful with token (length: {len(login_token)})")
        
        # Verify login returns user object
        login_user = login_data_response.get('user')
        if not login_user:
            print(f"❌ FAILED: No user object in login response")
            return False
        print("✅ Login returned user object")
        
        print("\n1.3 Testing GET /api/auth/me with register token")
        headers = {"Authorization": f"Bearer {token}"}
        me_response = requests.get(f"{BASE_URL}/auth/me", headers=headers, timeout=10)
        print(f"Status Code: {me_response.status_code}")
        
        if me_response.status_code != 200:
            print(f"❌ FAILED: Expected 200, got {me_response.status_code}")
            print(f"Response: {me_response.text}")
            return False
        
        me_data = me_response.json()
        print(f"Response JSON: {me_data}")
        
        # Verify user data is returned
        me_user = me_data.get('user')
        if not me_user:
            print(f"❌ FAILED: No user object in /auth/me response")
            return False
        
        if me_user.get('email') != test_email:
            print(f"❌ FAILED: Email mismatch. Expected {test_email}, got {me_user.get('email')}")
            return False
        
        print(f"✅ GET /auth/me successful, returned user: {me_user.get('name')} ({me_user.get('email')})")
        
        print("\n" + "="*80)
        print("✅ TEST 1 PASSED: Registration without admin approval works correctly")
        print("="*80)
        return True
        
    except requests.exceptions.RequestException as e:
        print(f"❌ FAILED: Request error: {e}")
        return False
    except Exception as e:
        print(f"❌ FAILED: Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_permanent_login_365_days():
    """
    TEST 2: Permanent login (JWT exp = 365 days)
    - POST /api/auth/login as admin
    - Expect 200 with token
    - Decode JWT payload WITHOUT verifying signature
    - Confirm 'exp' claim is roughly 365 days from now (>300 days in future)
    - Confirm GET /api/auth/me works with admin token
    """
    print("\n" + "="*80)
    print("TEST 2: Permanent login (JWT exp = 365 days)")
    print("="*80)
    
    print(f"\n2.1 Testing POST /api/auth/login as admin")
    login_data = {
        "identifier": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    }
    
    try:
        response = requests.post(f"{BASE_URL}/auth/login", json=login_data, timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ FAILED: Expected 200, got {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        data = response.json()
        print(f"Response JSON keys: {list(data.keys())}")
        
        # Verify token exists
        token = data.get('token')
        if not token:
            print(f"❌ FAILED: No token in response")
            return False
        print(f"✅ Admin login successful, token received (length: {len(token)})")
        
        print("\n2.2 Decoding JWT to verify expiry (365 days)")
        
        # Decode WITHOUT verification to check payload
        try:
            payload = jwt.decode(token, options={"verify_signature": False})
            print(f"JWT Payload: {payload}")
            
            # Get exp claim
            exp_timestamp = payload.get('exp')
            if not exp_timestamp:
                print(f"❌ FAILED: No 'exp' claim in JWT payload")
                return False
            
            # Convert to datetime
            exp_datetime = datetime.fromtimestamp(exp_timestamp, tz=timezone.utc)
            now = datetime.now(timezone.utc)
            
            # Calculate days until expiry
            time_until_exp = exp_datetime - now
            days_until_exp = time_until_exp.total_seconds() / (24 * 3600)
            
            print(f"Current time (UTC): {now.isoformat()}")
            print(f"Token expiry (UTC): {exp_datetime.isoformat()}")
            print(f"Days until expiry: {days_until_exp:.2f}")
            
            # Verify it's roughly 365 days (must be >300 days)
            if days_until_exp < 300:
                print(f"❌ FAILED: Token expiry is only {days_until_exp:.2f} days, expected ~365 days (>300)")
                return False
            
            if days_until_exp > 370:
                print(f"⚠️  WARNING: Token expiry is {days_until_exp:.2f} days, expected ~365 days")
            
            print(f"✅ JWT expiry is {days_until_exp:.2f} days (~365 days as expected)")
            
        except jwt.DecodeError as e:
            print(f"❌ FAILED: Could not decode JWT: {e}")
            return False
        
        print("\n2.3 Testing GET /api/auth/me with admin token")
        headers = {"Authorization": f"Bearer {token}"}
        me_response = requests.get(f"{BASE_URL}/auth/me", headers=headers, timeout=10)
        print(f"Status Code: {me_response.status_code}")
        
        if me_response.status_code != 200:
            print(f"❌ FAILED: Expected 200, got {me_response.status_code}")
            print(f"Response: {me_response.text}")
            return False
        
        me_data = me_response.json()
        print(f"Response JSON: {me_data}")
        
        # Verify user data
        user = me_data.get('user')
        if not user:
            print(f"❌ FAILED: No user object in response")
            return False
        
        if user.get('email') != ADMIN_EMAIL:
            print(f"❌ FAILED: Email mismatch. Expected {ADMIN_EMAIL}, got {user.get('email')}")
            return False
        
        print(f"✅ GET /auth/me successful, returned admin user: {user.get('name')} ({user.get('email')})")
        
        print("\n" + "="*80)
        print("✅ TEST 2 PASSED: Permanent login (365-day JWT) works correctly")
        print("="*80)
        return True
        
    except requests.exceptions.RequestException as e:
        print(f"❌ FAILED: Request error: {e}")
        return False
    except Exception as e:
        print(f"❌ FAILED: Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_public_report_feature():
    """
    TEST 3: Public Report (Laporan Kegiatan Rutin) - daily/monthly/activity
    
    Steps:
    1. Login as admin to get Bearer token
    2. Create a participant (POST /api/participants) - capture code and qr_payload
    3. Create an activity for TODAY (POST /api/activities) - capture activity id
    4. Record attendance (POST /api/attendance/scan with participant QR)
    5. Test A: Daily report - POST /api/share/attendance with kind=daily, then GET public share
    6. Test B: Monthly report - POST /api/share/attendance with kind=monthly, then GET public share
    7. Test C: Activity report - POST /api/share/attendance with kind=activity
    8. Test D: Invalid token - GET with nonexistent token
    """
    print("\n" + "="*80)
    print("TEST 3: Public Report (Laporan Kegiatan Rutin)")
    print("="*80)
    
    try:
        # Step 1: Login as admin
        print("\n3.1 Login as admin to get Bearer token")
        login_data = {
            "identifier": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        }
        
        response = requests.post(f"{BASE_URL}/auth/login", json=login_data, timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ FAILED: Admin login failed with status {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        data = response.json()
        admin_token = data.get('token')
        if not admin_token:
            print(f"❌ FAILED: No token in admin login response")
            return False
        
        print(f"✅ Admin login successful, token received")
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Step 2: Create a participant
        print("\n3.2 Create a participant")
        participant_name = f"Peserta Uji {random.randint(1000, 9999)}"
        participant_data = {
            "name": participant_name,
            "gender": "L"
        }
        
        response = requests.post(f"{BASE_URL}/participants", json=participant_data, headers=headers, timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ FAILED: Create participant failed with status {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        participant = response.json()
        participant_code = participant.get('code')
        participant_qr = participant.get('qr_payload')
        participant_id = participant.get('id')
        
        if not participant_code or not participant_qr:
            print(f"❌ FAILED: Participant response missing code or qr_payload")
            print(f"Response: {participant}")
            return False
        
        print(f"✅ Participant created: {participant_name}")
        print(f"   Code: {participant_code}")
        print(f"   QR: {participant_qr}")
        print(f"   ID: {participant_id}")
        
        # Step 3: Create an activity for TODAY
        print("\n3.3 Create an activity for TODAY")
        today = date.today().isoformat()
        activity_name = f"Kegiatan Test {random.randint(1000, 9999)}"
        activity_data = {
            "name": activity_name,
            "type": "pengajian_rutin",
            "date": today,
            "start_time": "08:00",
            "end_time": "10:00",
            "location": "Kertalangu"
        }
        
        response = requests.post(f"{BASE_URL}/activities", json=activity_data, headers=headers, timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ FAILED: Create activity failed with status {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        activity = response.json()
        activity_id = activity.get('id')
        
        if not activity_id:
            print(f"❌ FAILED: Activity response missing id")
            print(f"Response: {activity}")
            return False
        
        print(f"✅ Activity created: {activity_name}")
        print(f"   Date: {today}")
        print(f"   ID: {activity_id}")
        
        # Step 4: Record attendance
        print("\n3.4 Record attendance (scan)")
        attendance_data = {
            "activity_id": activity_id,
            "participant_qr": participant_qr,
            "status": "hadir"
        }
        
        response = requests.post(f"{BASE_URL}/attendance/scan", json=attendance_data, headers=headers, timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print(f"⚠️  Scan failed, trying manual attendance...")
            # Try manual attendance as fallback
            manual_data = {
                "activity_id": activity_id,
                "participant_id": participant_id,
                "status": "hadir"
            }
            response = requests.post(f"{BASE_URL}/attendance/manual", json=manual_data, headers=headers, timeout=10)
            print(f"Manual Status Code: {response.status_code}")
            
            if response.status_code != 200:
                print(f"❌ FAILED: Both scan and manual attendance failed")
                print(f"Response: {response.text}")
                return False
        
        attendance = response.json()
        print(f"✅ Attendance recorded: {participant_name} - hadir")
        print(f"   Attendance data: {attendance}")
        
        # TEST A: Daily report
        print("\n" + "-"*80)
        print("TEST A: Daily report")
        print("-"*80)
        
        print("\nA.1 Create daily share token")
        share_data = {
            "kind": "daily",
            "date": today
        }
        
        response = requests.post(f"{BASE_URL}/share/attendance", json=share_data, headers=headers, timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ FAILED: Create daily share failed with status {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        share_response = response.json()
        daily_token = share_response.get('token')
        
        if not daily_token:
            print(f"❌ FAILED: No token in share response")
            print(f"Response: {share_response}")
            return False
        
        print(f"✅ Daily share token created: {daily_token}")
        
        print("\nA.2 Get daily public report (NO AUTH)")
        response = requests.get(f"{BASE_URL}/share/attendance/{daily_token}", timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ FAILED: Get daily share failed with status {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        daily_report = response.json()
        print(f"Daily report response keys: {list(daily_report.keys())}")
        
        # Verify required fields
        if 'counts' not in daily_report:
            print(f"❌ FAILED: Missing 'counts' in daily report")
            return False
        
        if 'activities' not in daily_report:
            print(f"❌ FAILED: Missing 'activities' in daily report")
            return False
        
        if 'rows' not in daily_report:
            print(f"❌ FAILED: Missing 'rows' in daily report")
            return False
        
        counts = daily_report['counts']
        activities = daily_report['activities']
        rows = daily_report['rows']
        
        print(f"✅ Daily report structure valid")
        print(f"   Counts: {counts}")
        print(f"   Activities count: {len(activities)}")
        print(f"   Rows count: {len(rows)}")
        
        # Verify hadir count >= 1
        hadir_count = counts.get('hadir', 0)
        if hadir_count < 1:
            print(f"❌ FAILED: Expected hadir count >= 1, got {hadir_count}")
            return False
        
        print(f"✅ Hadir count >= 1: {hadir_count}")
        
        # Verify rows contain our participant
        found_participant = False
        for row in rows:
            if row.get('name') == participant_name and row.get('status') == 'hadir':
                found_participant = True
                print(f"✅ Found participant in rows: {row}")
                break
        
        if not found_participant:
            print(f"❌ FAILED: Participant '{participant_name}' with status 'hadir' not found in rows")
            print(f"   Rows: {rows}")
            return False
        
        print(f"✅ TEST A PASSED: Daily report works correctly")
        
        # TEST B: Monthly report
        print("\n" + "-"*80)
        print("TEST B: Monthly report")
        print("-"*80)
        
        print("\nB.1 Create monthly share token")
        share_data = {
            "kind": "monthly",
            "date": today
        }
        
        response = requests.post(f"{BASE_URL}/share/attendance", json=share_data, headers=headers, timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ FAILED: Create monthly share failed with status {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        share_response = response.json()
        monthly_token = share_response.get('token')
        
        if not monthly_token:
            print(f"❌ FAILED: No token in share response")
            print(f"Response: {share_response}")
            return False
        
        print(f"✅ Monthly share token created: {monthly_token}")
        
        print("\nB.2 Get monthly public report (NO AUTH)")
        response = requests.get(f"{BASE_URL}/share/attendance/{monthly_token}", timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ FAILED: Get monthly share failed with status {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        monthly_report = response.json()
        print(f"Monthly report response keys: {list(monthly_report.keys())}")
        
        # Verify required fields
        if 'counts' not in monthly_report:
            print(f"❌ FAILED: Missing 'counts' in monthly report")
            return False
        
        if 'activities' not in monthly_report:
            print(f"❌ FAILED: Missing 'activities' in monthly report")
            return False
        
        if 'rows' not in monthly_report:
            print(f"❌ FAILED: Missing 'rows' in monthly report")
            return False
        
        if 'range_start' not in monthly_report:
            print(f"❌ FAILED: Missing 'range_start' in monthly report")
            return False
        
        if 'range_end' not in monthly_report:
            print(f"❌ FAILED: Missing 'range_end' in monthly report")
            return False
        
        range_start = monthly_report['range_start']
        range_end = monthly_report['range_end']
        
        print(f"✅ Monthly report structure valid")
        print(f"   Range: {range_start} to {range_end}")
        print(f"   Counts: {monthly_report['counts']}")
        print(f"   Activities count: {len(monthly_report['activities'])}")
        print(f"   Rows count: {len(monthly_report['rows'])}")
        
        # Verify range covers the whole current month
        today_date = date.today()
        expected_start = today_date.replace(day=1).isoformat()
        
        # Calculate last day of month
        if today_date.month == 12:
            next_month = today_date.replace(year=today_date.year + 1, month=1, day=1)
        else:
            next_month = today_date.replace(month=today_date.month + 1, day=1)
        expected_end = (next_month - timedelta(days=1)).isoformat()
        
        if range_start != expected_start:
            print(f"❌ FAILED: range_start mismatch. Expected {expected_start}, got {range_start}")
            return False
        
        if range_end != expected_end:
            print(f"❌ FAILED: range_end mismatch. Expected {expected_end}, got {range_end}")
            return False
        
        print(f"✅ Monthly range correct: {range_start} to {range_end}")
        print(f"✅ TEST B PASSED: Monthly report works correctly")
        
        # TEST C: Activity report
        print("\n" + "-"*80)
        print("TEST C: Activity report")
        print("-"*80)
        
        print("\nC.1 Create activity share token")
        share_data = {
            "kind": "activity",
            "activity_id": activity_id
        }
        
        response = requests.post(f"{BASE_URL}/share/attendance", json=share_data, headers=headers, timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ FAILED: Create activity share failed with status {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        share_response = response.json()
        activity_token = share_response.get('token')
        
        if not activity_token:
            print(f"❌ FAILED: No token in share response")
            print(f"Response: {share_response}")
            return False
        
        print(f"✅ Activity share token created: {activity_token}")
        
        print("\nC.2 Get activity public report (NO AUTH)")
        response = requests.get(f"{BASE_URL}/share/attendance/{activity_token}", timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ FAILED: Get activity share failed with status {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        activity_report = response.json()
        print(f"Activity report response keys: {list(activity_report.keys())}")
        
        # Verify required fields
        if 'activity_name' not in activity_report:
            print(f"❌ FAILED: Missing 'activity_name' in activity report")
            return False
        
        if 'counts' not in activity_report:
            print(f"❌ FAILED: Missing 'counts' in activity report")
            return False
        
        if 'rows' not in activity_report:
            print(f"❌ FAILED: Missing 'rows' in activity report")
            return False
        
        print(f"✅ Activity report structure valid")
        print(f"   Activity name: {activity_report['activity_name']}")
        print(f"   Counts: {activity_report['counts']}")
        print(f"   Rows count: {len(activity_report['rows'])}")
        
        # Verify activity name matches
        if activity_report['activity_name'] != activity_name:
            print(f"⚠️  WARNING: Activity name mismatch. Expected '{activity_name}', got '{activity_report['activity_name']}'")
        
        print(f"✅ TEST C PASSED: Activity report works correctly")
        
        # TEST D: Invalid token
        print("\n" + "-"*80)
        print("TEST D: Invalid token")
        print("-"*80)
        
        print("\nD.1 Get share with nonexistent token")
        invalid_token = "nonexistenttoken123"
        response = requests.get(f"{BASE_URL}/share/attendance/{invalid_token}", timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 404:
            print(f"❌ FAILED: Expected 404 for invalid token, got {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        print(f"✅ Invalid token correctly returns 404")
        print(f"✅ TEST D PASSED: Invalid token handling works correctly")
        
        print("\n" + "="*80)
        print("✅ TEST 3 PASSED: Public Report feature works correctly")
        print("="*80)
        return True
        
    except requests.exceptions.RequestException as e:
        print(f"❌ FAILED: Request error: {e}")
        return False
    except Exception as e:
        print(f"❌ FAILED: Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_multi_role_accounts():
    """
    TEST 4: Multi-role accounts + role selection at login
    
    Steps:
    1. Login as admin to get Bearer token
    2. Create a user with role 'peserta'
    3. Assign multiple roles ['pengurus', 'peserta'] via PATCH /api/users/{id}/role
    4. Login WITHOUT role - expect needs_role=true, roles array, NO token
    5. Login WITH role 'pengurus' - expect token with user.role='pengurus'
    6. GET /api/auth/me - verify role from token is 'pengurus'
    7. Login WITH invalid role 'admin' - expect 403
    8. Admin single-role login WITHOUT role - expect token directly
    9. GET /api/users - verify each user has 'roles' array field
    """
    print("\n" + "="*80)
    print("TEST 4: Multi-role accounts + role selection at login")
    print("="*80)
    
    created_user_id = None
    
    try:
        # Step 1: Login as admin
        print("\n4.1 Login as admin to get Bearer token")
        login_data = {
            "identifier": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        }
        
        response = requests.post(f"{BASE_URL}/auth/login", json=login_data, timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ FAILED: Admin login failed with status {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        data = response.json()
        admin_token = data.get('token')
        if not admin_token:
            print(f"❌ FAILED: No token in admin login response")
            return False
        
        print(f"✅ Admin login successful")
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Step 2: Create a user with role 'peserta'
        print("\n4.2 Create a user with role 'peserta'")
        unique_username = f"multiuser_{random.randint(10000, 99999)}"
        user_data = {
            "name": "Multi User",
            "username": unique_username,
            "password": "multi123",
            "role": "peserta"
        }
        
        response = requests.post(f"{BASE_URL}/users", json=user_data, headers=headers, timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ FAILED: Create user failed with status {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        user_response = response.json()
        created_user_id = user_response.get('id')
        
        if not created_user_id:
            print(f"❌ FAILED: No user id in create response")
            print(f"Response: {user_response}")
            return False
        
        print(f"✅ User created: {unique_username} (id: {created_user_id})")
        
        # Step 3: Assign multiple roles
        print("\n4.3 Assign multiple roles ['pengurus', 'peserta']")
        role_data = {
            "roles": ["pengurus", "peserta"]
        }
        
        response = requests.patch(f"{BASE_URL}/users/{created_user_id}/role", json=role_data, headers=headers, timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ FAILED: Update role failed with status {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        role_response = response.json()
        print(f"Response: {role_response}")
        
        # Verify response
        if not role_response.get('ok'):
            print(f"❌ FAILED: Expected ok=true in response")
            return False
        
        returned_roles = role_response.get('roles')
        if returned_roles != ["pengurus", "peserta"]:
            print(f"❌ FAILED: Expected roles=['pengurus', 'peserta'], got {returned_roles}")
            return False
        
        print(f"✅ Roles assigned: {returned_roles}")
        
        # Step 4: Login WITHOUT role - expect needs_role=true, NO token
        print("\n4.4 Login WITHOUT role (multi-role user)")
        login_data = {
            "identifier": unique_username,
            "password": "multi123"
        }
        
        response = requests.post(f"{BASE_URL}/auth/login", json=login_data, timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ FAILED: Login failed with status {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        login_response = response.json()
        print(f"Response: {login_response}")
        
        # Verify NO token
        if 'token' in login_response:
            print(f"❌ FAILED: Expected NO token, but got token: {login_response.get('token')}")
            return False
        
        print(f"✅ No token returned (as expected)")
        
        # Verify needs_role=true
        if login_response.get('needs_role') is not True:
            print(f"❌ FAILED: Expected needs_role=true, got needs_role={login_response.get('needs_role')}")
            return False
        
        print(f"✅ needs_role=true")
        
        # Verify roles array
        returned_roles = login_response.get('roles')
        if not returned_roles or set(returned_roles) != {"pengurus", "peserta"}:
            print(f"❌ FAILED: Expected roles=['pengurus', 'peserta'], got {returned_roles}")
            return False
        
        print(f"✅ roles={returned_roles}")
        
        # Step 5: Login WITH role 'pengurus'
        print("\n4.5 Login WITH role 'pengurus'")
        login_data = {
            "identifier": unique_username,
            "password": "multi123",
            "role": "pengurus"
        }
        
        response = requests.post(f"{BASE_URL}/auth/login", json=login_data, timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ FAILED: Login with role failed with status {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        login_response = response.json()
        print(f"Response keys: {list(login_response.keys())}")
        
        # Verify token exists
        multiuser_token = login_response.get('token')
        if not multiuser_token:
            print(f"❌ FAILED: Expected token, got none")
            return False
        
        print(f"✅ Token received (length: {len(multiuser_token)})")
        
        # Verify user.role='pengurus'
        user = login_response.get('user')
        if not user:
            print(f"❌ FAILED: No user object in response")
            return False
        
        if user.get('role') != 'pengurus':
            print(f"❌ FAILED: Expected user.role='pengurus', got user.role={user.get('role')}")
            return False
        
        print(f"✅ user.role='pengurus'")
        
        # Verify user.roles array
        user_roles = user.get('roles')
        if not user_roles or set(user_roles) != {"pengurus", "peserta"}:
            print(f"❌ FAILED: Expected user.roles=['pengurus', 'peserta'], got {user_roles}")
            return False
        
        print(f"✅ user.roles={user_roles}")
        
        # Step 6: GET /api/auth/me - verify role from token
        print("\n4.6 GET /api/auth/me with pengurus token")
        me_headers = {"Authorization": f"Bearer {multiuser_token}"}
        response = requests.get(f"{BASE_URL}/auth/me", headers=me_headers, timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ FAILED: GET /auth/me failed with status {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        me_response = response.json()
        me_user = me_response.get('user')
        
        if not me_user:
            print(f"❌ FAILED: No user object in /auth/me response")
            return False
        
        # Verify role from token (should be 'pengurus')
        if me_user.get('role') != 'pengurus':
            print(f"❌ FAILED: Expected role='pengurus' from token, got role={me_user.get('role')}")
            return False
        
        print(f"✅ role='pengurus' (from token)")
        
        # Verify roles array present
        if 'roles' not in me_user:
            print(f"❌ FAILED: No 'roles' field in user object")
            return False
        
        print(f"✅ roles array present: {me_user.get('roles')}")
        
        # Step 7: Login WITH invalid role 'admin'
        print("\n4.7 Login WITH invalid role 'admin' (not assigned)")
        login_data = {
            "identifier": unique_username,
            "password": "multi123",
            "role": "admin"
        }
        
        response = requests.post(f"{BASE_URL}/auth/login", json=login_data, timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 403:
            print(f"❌ FAILED: Expected 403 for invalid role, got {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        print(f"✅ 403 returned for invalid role (as expected)")
        
        # Step 8: Admin single-role login WITHOUT role
        print("\n4.8 Admin single-role login WITHOUT role parameter")
        login_data = {
            "identifier": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        }
        
        response = requests.post(f"{BASE_URL}/auth/login", json=login_data, timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ FAILED: Admin login failed with status {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        admin_login_response = response.json()
        
        # Verify token is returned directly (no needs_role)
        admin_token_direct = admin_login_response.get('token')
        if not admin_token_direct:
            print(f"❌ FAILED: Expected token directly, got none")
            return False
        
        print(f"✅ Token returned directly (length: {len(admin_token_direct)})")
        
        # Verify needs_role is absent or false
        needs_role = admin_login_response.get('needs_role')
        if needs_role is True:
            print(f"❌ FAILED: Expected needs_role absent or false, got needs_role=true")
            return False
        
        print(f"✅ needs_role is absent/false (single-role user gets token directly)")
        
        # Step 9: GET /api/users - verify roles array field
        print("\n4.9 GET /api/users - verify 'roles' array field present")
        response = requests.get(f"{BASE_URL}/users", headers=headers, timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ FAILED: GET /users failed with status {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        users_response = response.json()
        users = users_response.get('users', [])
        
        if not users:
            print(f"❌ FAILED: No users in response")
            return False
        
        print(f"✅ Retrieved {len(users)} users")
        
        # Verify each user has 'roles' array
        missing_roles = []
        for user in users:
            if 'roles' not in user:
                missing_roles.append(user.get('name', user.get('id', 'unknown')))
        
        if missing_roles:
            print(f"❌ FAILED: Users missing 'roles' field: {missing_roles}")
            return False
        
        print(f"✅ All users have 'roles' array field")
        
        # Show sample user
        sample_user = users[0]
        print(f"   Sample user: {sample_user.get('name')} - roles={sample_user.get('roles')}")
        
        print("\n" + "="*80)
        print("✅ TEST 4 PASSED: Multi-role accounts + role selection works correctly")
        print("="*80)
        return True
        
    except requests.exceptions.RequestException as e:
        print(f"❌ FAILED: Request error: {e}")
        return False
    except Exception as e:
        print(f"❌ FAILED: Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        # Note: Cleanup of created user is left to admin (as per review request)
        if created_user_id:
            print(f"\nNote: Created test user (id: {created_user_id}) - cleanup can be done by admin if needed")


def test_in_app_notifications():
    """
    TEST 5: In-app notifications + auto-notify on new activity
    
    Steps:
    1. Login as admin to get Bearer token
    2. Create a peserta user (POST /api/users)
    3. Create an activity (POST /api/activities) - should trigger notification
    4. Login as the peserta user
    5. GET /api/notifications - expect unread >= 1 with title "Kegiatan Baru"
    6. POST /api/notifications/{id}/read - mark as read
    7. GET /api/notifications - verify read=true and unread decreased
    8. POST /api/notifications/read-all - mark all as read
    9. GET /api/notifications - verify unread=0
    10. SECURITY CHECK: Admin should NOT receive this notification
    """
    print("\n" + "="*80)
    print("TEST 5: In-app notifications + auto-notify on new activity")
    print("="*80)
    
    created_user_id = None
    notification_id = None
    
    try:
        # Step 1: Login as admin
        print("\n5.1 Login as admin to get Bearer token")
        login_data = {
            "identifier": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        }
        
        response = requests.post(f"{BASE_URL}/auth/login", json=login_data, timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ FAILED: Admin login failed with status {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        data = response.json()
        admin_token = data.get('token')
        if not admin_token:
            print(f"❌ FAILED: No token in admin login response")
            return False
        
        print(f"✅ Admin login successful")
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Step 2: Create a peserta user
        print("\n5.2 Create a peserta user")
        unique_username = f"notifpeserta_{random.randint(10000, 99999)}"
        user_data = {
            "name": "Notif Peserta",
            "username": unique_username,
            "password": "notif123",
            "role": "peserta"
        }
        
        response = requests.post(f"{BASE_URL}/users", json=user_data, headers=admin_headers, timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ FAILED: Create user failed with status {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        user_response = response.json()
        created_user_id = user_response.get('id')
        
        if not created_user_id:
            print(f"❌ FAILED: No user id in create response")
            print(f"Response: {user_response}")
            return False
        
        print(f"✅ Peserta user created: {unique_username} (id: {created_user_id})")
        
        # Step 3: Create an activity (should trigger notification)
        print("\n5.3 Create an activity (should trigger notification)")
        today = date.today().isoformat()
        activity_name = "Kegiatan Notif"
        activity_data = {
            "name": activity_name,
            "type": "pengajian_rutin",
            "date": today,
            "start_time": "19:30",
            "end_time": "21:00",
            "location": "Kertalangu",
            "radius_m": 100
        }
        
        response = requests.post(f"{BASE_URL}/activities", json=activity_data, headers=admin_headers, timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ FAILED: Create activity failed with status {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        activity = response.json()
        activity_id = activity.get('id')
        
        if not activity_id:
            print(f"❌ FAILED: Activity response missing id")
            print(f"Response: {activity}")
            return False
        
        print(f"✅ Activity created: {activity_name} (id: {activity_id})")
        
        # Step 4: Login as the peserta user
        print("\n5.4 Login as the peserta user")
        peserta_login_data = {
            "identifier": unique_username,
            "password": "notif123"
        }
        
        response = requests.post(f"{BASE_URL}/auth/login", json=peserta_login_data, timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ FAILED: Peserta login failed with status {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        peserta_login_response = response.json()
        peserta_token = peserta_login_response.get('token')
        
        if not peserta_token:
            print(f"❌ FAILED: No token in peserta login response")
            return False
        
        print(f"✅ Peserta login successful")
        peserta_headers = {"Authorization": f"Bearer {peserta_token}"}
        
        # Step 5: GET /api/notifications - expect unread >= 1
        print("\n5.5 GET /api/notifications (peserta token)")
        response = requests.get(f"{BASE_URL}/notifications", headers=peserta_headers, timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ FAILED: GET notifications failed with status {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        notifications_data = response.json()
        print(f"Response keys: {list(notifications_data.keys())}")
        
        # Verify structure
        if 'items' not in notifications_data or 'unread' not in notifications_data:
            print(f"❌ FAILED: Missing 'items' or 'unread' in response")
            print(f"Response: {notifications_data}")
            return False
        
        items = notifications_data['items']
        unread_count = notifications_data['unread']
        
        print(f"   Items count: {len(items)}")
        print(f"   Unread count: {unread_count}")
        
        # Verify unread >= 1
        if unread_count < 1:
            print(f"❌ FAILED: Expected unread >= 1, got {unread_count}")
            return False
        
        print(f"✅ Unread count >= 1: {unread_count}")
        
        # Find the notification with title "Kegiatan Baru"
        target_notification = None
        for item in items:
            if item.get('title') == 'Kegiatan Baru' and activity_name in item.get('body', ''):
                target_notification = item
                break
        
        if not target_notification:
            print(f"❌ FAILED: No notification found with title='Kegiatan Baru' and body containing '{activity_name}'")
            print(f"   Items: {items}")
            return False
        
        print(f"✅ Found notification with title='Kegiatan Baru'")
        print(f"   Notification: {target_notification}")
        
        # Verify notification fields
        notification_id = target_notification.get('id')
        if not notification_id:
            print(f"❌ FAILED: Notification missing 'id' field")
            return False
        
        if target_notification.get('type') != 'activity':
            print(f"❌ FAILED: Expected type='activity', got type={target_notification.get('type')}")
            return False
        
        print(f"✅ type='activity'")
        
        if not target_notification.get('activity_id'):
            print(f"❌ FAILED: activity_id is null or missing")
            return False
        
        print(f"✅ activity_id is set: {target_notification.get('activity_id')}")
        
        if target_notification.get('read') is not False:
            print(f"❌ FAILED: Expected read=false, got read={target_notification.get('read')}")
            return False
        
        print(f"✅ read=false")
        
        if activity_name not in target_notification.get('body', ''):
            print(f"❌ FAILED: Body does not contain activity name '{activity_name}'")
            print(f"   Body: {target_notification.get('body')}")
            return False
        
        print(f"✅ Body contains activity name: {target_notification.get('body')}")
        
        # Step 6: POST /api/notifications/{id}/read
        print(f"\n5.6 POST /api/notifications/{notification_id}/read")
        response = requests.post(f"{BASE_URL}/notifications/{notification_id}/read", headers=peserta_headers, timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ FAILED: Mark as read failed with status {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        print(f"✅ Notification marked as read")
        
        # Step 7: GET /api/notifications again - verify read=true and unread decreased
        print("\n5.7 GET /api/notifications again (verify read=true)")
        response = requests.get(f"{BASE_URL}/notifications", headers=peserta_headers, timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ FAILED: GET notifications failed with status {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        notifications_data_after = response.json()
        items_after = notifications_data_after['items']
        unread_count_after = notifications_data_after['unread']
        
        print(f"   Unread count after: {unread_count_after}")
        
        # Verify unread decreased by 1
        if unread_count_after != unread_count - 1:
            print(f"❌ FAILED: Expected unread to decrease by 1 (from {unread_count} to {unread_count - 1}), got {unread_count_after}")
            return False
        
        print(f"✅ Unread count decreased by 1: {unread_count} -> {unread_count_after}")
        
        # Find the notification again and verify read=true
        target_notification_after = None
        for item in items_after:
            if item.get('id') == notification_id:
                target_notification_after = item
                break
        
        if not target_notification_after:
            print(f"❌ FAILED: Notification {notification_id} not found in items")
            return False
        
        if target_notification_after.get('read') is not True:
            print(f"❌ FAILED: Expected read=true, got read={target_notification_after.get('read')}")
            return False
        
        print(f"✅ Notification read=true")
        
        # Step 8: POST /api/notifications/read-all
        print("\n5.8 POST /api/notifications/read-all")
        response = requests.post(f"{BASE_URL}/notifications/read-all", headers=peserta_headers, timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ FAILED: Mark all as read failed with status {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        print(f"✅ All notifications marked as read")
        
        # Step 9: GET /api/notifications - verify unread=0
        print("\n5.9 GET /api/notifications (verify unread=0)")
        response = requests.get(f"{BASE_URL}/notifications", headers=peserta_headers, timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ FAILED: GET notifications failed with status {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        notifications_data_final = response.json()
        unread_count_final = notifications_data_final['unread']
        
        print(f"   Unread count final: {unread_count_final}")
        
        if unread_count_final != 0:
            print(f"❌ FAILED: Expected unread=0, got {unread_count_final}")
            return False
        
        print(f"✅ Unread count is 0")
        
        # Step 10: SECURITY CHECK - Admin should NOT receive this notification
        print("\n5.10 SECURITY CHECK: Admin should NOT receive this notification")
        response = requests.get(f"{BASE_URL}/notifications", headers=admin_headers, timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ FAILED: GET admin notifications failed with status {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        admin_notifications_data = response.json()
        admin_items = admin_notifications_data['items']
        
        print(f"   Admin notifications count: {len(admin_items)}")
        
        # Check if admin has the "Kegiatan Notif" notification
        admin_has_notification = False
        for item in admin_items:
            if item.get('title') == 'Kegiatan Baru' and activity_name in item.get('body', ''):
                admin_has_notification = True
                print(f"❌ FAILED: Admin received the notification (should NOT receive it)")
                print(f"   Admin notification: {item}")
                return False
        
        print(f"✅ Admin did NOT receive the notification (correct - admin role should not get activity notifications)")
        
        print("\n" + "="*80)
        print("✅ TEST 5 PASSED: In-app notifications + auto-notify works correctly")
        print("="*80)
        return True
        
    except requests.exceptions.RequestException as e:
        print(f"❌ FAILED: Request error: {e}")
        return False
    except Exception as e:
        print(f"❌ FAILED: Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        # Note: Cleanup of created user and activity is left to admin
        if created_user_id:
            print(f"\nNote: Created test user '{unique_username}' (id: {created_user_id}) and activity '{activity_name}' for testing")


def test_batch2_import_xlsx_activation():
    """
    TEST 6: BATCH2 - Import XLSX single-source + Activation (link account to existing participant, no duplicate)
    
    Steps:
    1. Admin login
    2. Create activity TODAY - capture activity code
    3. Import XLSX with "Budi Test" participant
    4. GET /api/participants - verify Budi has code and account_status == "belum_aktivasi", record count N
    5. Activation search (NO auth): GET /api/activation/search?q=Budi
    6. Activation activate (NO auth): POST /api/activation/activate
    7. Verify NO duplicate: GET /api/participants count still N
    8. Login as imported user (phone)
    9. Self-absen with imported user token: POST /api/attendance/self-v2
    10. Verify account_status now "aktif"
    11. Double-activate guard: POST /api/activation/activate again -> expect 409
    """
    print("\n" + "="*80)
    print("TEST 6: BATCH2 - Import XLSX + Activation (single-source, no duplicate)")
    print("="*80)
    
    budi_participant_id = None
    budi_user_token = None
    activity_code = None
    
    try:
        # Step 1: Admin login
        print("\n6.1 Admin login")
        login_data = {
            "identifier": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        }
        
        response = requests.post(f"{BASE_URL}/auth/login", json=login_data, timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ FAILED: Admin login failed with status {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        data = response.json()
        admin_token = data.get('token')
        if not admin_token:
            print(f"❌ FAILED: No token in admin login response")
            return False
        
        print(f"✅ Admin login successful")
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Step 2: Create activity TODAY
        print("\n6.2 Create activity TODAY")
        today = date.today().isoformat()
        activity_data = {
            "name": "Kegiatan B2",
            "type": "pengajian_rutin",
            "date": today,
            "start_time": "19:30",
            "end_time": "21:00",
            "location": "Kertalangu",
            "radius_m": 0
        }
        
        response = requests.post(f"{BASE_URL}/activities", json=activity_data, headers=admin_headers, timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ FAILED: Create activity failed with status {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        activity = response.json()
        activity_code = activity.get('code')
        activity_qr = activity.get('qr_payload')
        
        if not activity_code:
            print(f"❌ FAILED: Activity response missing code")
            print(f"Response: {activity}")
            return False
        
        print(f"✅ Activity created: Kegiatan B2")
        print(f"   Code: {activity_code}")
        print(f"   QR: {activity_qr}")
        
        # Step 3: Import XLSX with "Budi Test"
        print("\n6.3 Import XLSX with 'Budi Test' participant")
        
        # Create XLSX in memory using openpyxl
        from openpyxl import Workbook
        import io
        
        wb = Workbook()
        ws = wb.active
        
        # Header row
        ws.append(["Nama Lengkap", "L/P", "No HP"])
        
        # Data row
        ws.append(["Budi Test", "L", "081200000001"])
        
        # Save to BytesIO
        xlsx_buffer = io.BytesIO()
        wb.save(xlsx_buffer)
        xlsx_buffer.seek(0)
        
        # POST as multipart/form-data
        files = {'file': ('budi.xlsx', xlsx_buffer, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')}
        
        response = requests.post(f"{BASE_URL}/participants/import-xlsx", files=files, headers=admin_headers, timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ FAILED: Import XLSX failed with status {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        import_result = response.json()
        print(f"Import result: {import_result}")
        
        # Verify count >= 1
        import_count = import_result.get('count', 0)
        if import_count < 1:
            print(f"❌ FAILED: Expected import count >= 1, got {import_count}")
            return False
        
        print(f"✅ XLSX imported successfully, count: {import_count}")
        
        # Step 4: GET /api/participants - find Budi Test
        print("\n6.4 GET /api/participants - find 'Budi Test'")
        
        response = requests.get(f"{BASE_URL}/participants", headers=admin_headers, timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ FAILED: GET participants failed with status {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        participants_data = response.json()
        participants = participants_data.get('items', [])
        
        # Record CURRENT TOTAL count
        participant_count_before = len(participants)
        print(f"   Total participants count (N): {participant_count_before}")
        
        # Find Budi Test
        budi_participant = None
        for p in participants:
            if p.get('name') == 'Budi Test':
                budi_participant = p
                break
        
        if not budi_participant:
            print(f"❌ FAILED: Participant 'Budi Test' not found in participants list")
            return False
        
        print(f"✅ Found participant 'Budi Test'")
        print(f"   Participant: {budi_participant}")
        
        # Verify has code
        budi_code = budi_participant.get('code')
        if not budi_code:
            print(f"❌ FAILED: Budi Test has no 'code' field")
            return False
        
        print(f"✅ Budi has code: {budi_code}")
        
        # Verify account_status == "belum_aktivasi"
        account_status = budi_participant.get('account_status')
        if account_status != 'belum_aktivasi':
            print(f"❌ FAILED: Expected account_status='belum_aktivasi', got '{account_status}'")
            return False
        
        print(f"✅ account_status='belum_aktivasi'")
        
        # Capture participant id
        budi_participant_id = budi_participant.get('id')
        if not budi_participant_id:
            print(f"❌ FAILED: Budi Test has no 'id' field")
            return False
        
        print(f"✅ Budi participant_id: {budi_participant_id}")
        
        # Step 5: Activation search (NO auth)
        print("\n6.5 Activation search (NO AUTH): GET /api/activation/search?q=Budi")
        
        response = requests.get(f"{BASE_URL}/activation/search?q=Budi", timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ FAILED: Activation search failed with status {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        search_result = response.json()
        search_items = search_result.get('items', [])
        
        print(f"   Search results count: {len(search_items)}")
        
        # Find Budi Test in search results
        budi_search_item = None
        for item in search_items:
            if item.get('name') == 'Budi Test':
                budi_search_item = item
                break
        
        if not budi_search_item:
            print(f"❌ FAILED: 'Budi Test' not found in activation search results")
            print(f"   Search items: {search_items}")
            return False
        
        print(f"✅ Found 'Budi Test' in activation search")
        print(f"   Search item: {budi_search_item}")
        
        # Verify id matches
        search_id = budi_search_item.get('id')
        if search_id != budi_participant_id:
            print(f"❌ FAILED: Search id mismatch. Expected {budi_participant_id}, got {search_id}")
            return False
        
        print(f"✅ Search id matches participant_id: {search_id}")
        
        # Step 6: Activation activate (NO auth)
        print("\n6.6 Activation activate (NO AUTH): POST /api/activation/activate")
        
        activate_data = {
            "participant_id": budi_participant_id,
            "phone": "081200000001",
            "password": "budi123"
        }
        
        response = requests.post(f"{BASE_URL}/activation/activate", json=activate_data, timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ FAILED: Activation failed with status {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        activate_result = response.json()
        print(f"Activation result: {activate_result}")
        
        # Verify token returned
        budi_user_token = activate_result.get('token')
        if not budi_user_token:
            print(f"❌ FAILED: No token in activation response")
            return False
        
        print(f"✅ Activation successful, token received (length: {len(budi_user_token)})")
        
        # Verify user.participant_id matches
        activate_user = activate_result.get('user')
        if not activate_user:
            print(f"❌ FAILED: No user object in activation response")
            return False
        
        activate_participant_id = activate_user.get('participant_id')
        if activate_participant_id != budi_participant_id:
            print(f"❌ FAILED: user.participant_id mismatch. Expected {budi_participant_id}, got {activate_participant_id}")
            return False
        
        print(f"✅ user.participant_id matches: {activate_participant_id}")
        
        # Step 7: Verify NO duplicate - count still N
        print("\n6.7 Verify NO duplicate: GET /api/participants count still N")
        
        response = requests.get(f"{BASE_URL}/participants", headers=admin_headers, timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ FAILED: GET participants failed with status {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        participants_data_after = response.json()
        participants_after = participants_data_after.get('items', [])
        participant_count_after = len(participants_after)
        
        print(f"   Participant count after activation: {participant_count_after}")
        print(f"   Participant count before activation: {participant_count_before}")
        
        if participant_count_after != participant_count_before:
            print(f"❌ FAILED: Participant count changed! Expected {participant_count_before}, got {participant_count_after}")
            print(f"   Activation should NOT create a new participant record")
            return False
        
        print(f"✅ Participant count unchanged: {participant_count_after} (NO duplicate created)")
        
        # Step 8: Login as imported user (phone)
        print("\n6.8 Login as imported user: POST /api/auth/login (phone)")
        
        login_data = {
            "identifier": "081200000001",
            "password": "budi123"
        }
        
        response = requests.post(f"{BASE_URL}/auth/login", json=login_data, timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ FAILED: Login as imported user failed with status {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        login_result = response.json()
        print(f"Login result keys: {list(login_result.keys())}")
        
        # Verify token
        login_token = login_result.get('token')
        if not login_token:
            print(f"❌ FAILED: No token in login response")
            return False
        
        print(f"✅ Login successful, token received (length: {len(login_token)})")
        
        # Verify user.participant_id
        login_user = login_result.get('user')
        if not login_user:
            print(f"❌ FAILED: No user object in login response")
            return False
        
        login_participant_id = login_user.get('participant_id')
        if login_participant_id != budi_participant_id:
            print(f"❌ FAILED: user.participant_id mismatch. Expected {budi_participant_id}, got {login_participant_id}")
            return False
        
        print(f"✅ user.participant_id matches: {login_participant_id}")
        
        # Step 9: Self-absen with imported user token
        print("\n6.9 Self-absen with imported user token: POST /api/attendance/self-v2")
        
        budi_headers = {"Authorization": f"Bearer {login_token}"}
        
        self_absen_data = {
            "activity_qr": f"EKTL:A:{activity_code}"
        }
        
        response = requests.post(f"{BASE_URL}/attendance/self-v2", json=self_absen_data, headers=budi_headers, timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ FAILED: Self-absen failed with status {response.status_code}")
            print(f"Response: {response.text}")
            
            # Check for specific error messages
            error_text = response.text.lower()
            if 'database peserta belum terhubung' in error_text or 'akun belum terhubung ke peserta' in error_text:
                print(f"❌ CRITICAL: Got 'Database peserta belum terhubung' error - activation did NOT link account properly")
            
            return False
        
        absen_result = response.json()
        print(f"Self-absen result: {absen_result}")
        
        print(f"✅ Self-absen successful (attendance recorded)")
        
        # Step 10: Verify account_status now "aktif"
        print("\n6.10 Verify account_status now 'aktif': GET /api/participants")
        
        response = requests.get(f"{BASE_URL}/participants", headers=admin_headers, timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ FAILED: GET participants failed with status {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        participants_data_final = response.json()
        participants_final = participants_data_final.get('items', [])
        
        # Find Budi Test again
        budi_participant_final = None
        for p in participants_final:
            if p.get('id') == budi_participant_id:
                budi_participant_final = p
                break
        
        if not budi_participant_final:
            print(f"❌ FAILED: Budi Test participant not found")
            return False
        
        # Verify account_status == "aktif"
        account_status_final = budi_participant_final.get('account_status')
        if account_status_final != 'aktif':
            print(f"❌ FAILED: Expected account_status='aktif', got '{account_status_final}'")
            return False
        
        print(f"✅ account_status='aktif' (changed from 'belum_aktivasi' to 'aktif')")
        
        # Step 11: Double-activate guard
        print("\n6.11 Double-activate guard: POST /api/activation/activate again (expect 409)")
        
        activate_data_2 = {
            "participant_id": budi_participant_id,
            "phone": "081200000002",
            "password": "x123456"
        }
        
        response = requests.post(f"{BASE_URL}/activation/activate", json=activate_data_2, timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 409:
            print(f"❌ FAILED: Expected 409 (already has account), got {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        print(f"✅ Double-activate correctly returns 409 (already has account)")
        
        print("\n" + "="*80)
        print("✅ TEST 6 PASSED: BATCH2 Import XLSX + Activation works correctly")
        print("="*80)
        print(f"\nTest data created:")
        print(f"  - Participant: Budi Test (id: {budi_participant_id}, code: {budi_code})")
        print(f"  - User: phone 081200000001 (linked to Budi Test)")
        print(f"  - Activity: Kegiatan B2 (code: {activity_code})")
        print(f"  - Attendance: Budi Test attended Kegiatan B2")
        return True
        
    except requests.exceptions.RequestException as e:
        print(f"❌ FAILED: Request error: {e}")
        return False
    except Exception as e:
        print(f"❌ FAILED: Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """Run all backend tests"""
    print("\n" + "="*80)
    print("E-KERTALANGU BACKEND API TESTS")
    print("="*80)
    print(f"Base URL: {BASE_URL}")
    print(f"Admin: {ADMIN_EMAIL}")
    
    results = []
    
    # Test 1: Registration without admin approval
    test1_passed = test_registration_without_approval()
    results.append(("Registration without admin approval", test1_passed))
    
    # Test 2: Permanent login (365-day JWT)
    test2_passed = test_permanent_login_365_days()
    results.append(("Permanent login (365-day JWT)", test2_passed))
    
    # Test 3: Public Report feature
    test3_passed = test_public_report_feature()
    results.append(("Public Report (Laporan Kegiatan Rutin)", test3_passed))
    
    # Test 4: Multi-role accounts + role selection
    test4_passed = test_multi_role_accounts()
    results.append(("Multi-role accounts + role selection", test4_passed))
    
    # Test 5: In-app notifications
    test5_passed = test_in_app_notifications()
    results.append(("In-app notifications + auto-notify", test5_passed))
    
    # Test 6: BATCH2 - Import XLSX + Activation
    test6_passed = test_batch2_import_xlsx_activation()
    results.append(("BATCH2 - Import XLSX + Activation", test6_passed))
    
    # Summary
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    
    for test_name, passed in results:
        status = "✅ PASSED" if passed else "❌ FAILED"
        print(f"{status}: {test_name}")
    
    all_passed = all(passed for _, passed in results)
    
    print("\n" + "="*80)
    if all_passed:
        print("✅ ALL TESTS PASSED")
    else:
        print("❌ SOME TESTS FAILED")
    print("="*80)
    
    return 0 if all_passed else 1


if __name__ == "__main__":
    exit(main())
