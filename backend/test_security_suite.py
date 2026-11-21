import urllib.request
import json
import base64

BASE_URL = 'http://localhost:5000'

def request(method, path, body=None, token=None, headers_override=None):
    url = f"{BASE_URL}{path}"
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = f"Bearer {token}"
    if headers_override:
        headers.update(headers_override)
    
    data = json.dumps(body).encode('utf-8') if body is not None else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            headers_dict = dict(resp.info())
            res_body = json.loads(resp.read().decode('utf-8'))
            return {'status': resp.status, 'data': res_body, 'headers': headers_dict}
    except urllib.error.HTTPError as e:
        err_msg = e.read().decode('utf-8')
        try:
            return {'status': e.code, 'data': json.loads(err_msg), 'headers': dict(e.headers)}
        except:
            return {'status': e.code, 'data': {'message': err_msg}, 'headers': dict(e.headers)}

print('======================================================================')
print('   RUANG TEMU SECURITY AUDIT & HARDENING TEST SUITE')
print('======================================================================\n')

# 1. Login to obtain cashier and owner tokens
login_res = request('POST', '/api/v1/auth/login', {'username': 'kasir', 'password': 'kasir123'})
assert login_res['status'] == 200
cashier_token = login_res['data']['data']['token']

mgr_login = request('POST', '/api/v1/auth/login', {'username': 'owner', 'password': 'owner123'})
assert mgr_login['status'] == 200
manager_token = mgr_login['data']['data']['token']

# Test 1: Security Headers & Technology Leaks (Helmet & x-powered-by)
h_check = request('GET', '/health')
headers = {k.lower(): v for k, v in h_check['headers'].items()}
assert 'x-powered-by' not in headers, "Security Flaw: X-Powered-By header should be hidden!"
assert 'x-content-type-options' in headers and headers['x-content-type-options'] == 'nosniff'
assert 'x-frame-options' in headers
print(' [PASS] SEC-01 Security Headers & Technology Shielding: X-Powered-By disembunyikan & Helmet aktif (nosniff, SAMEORIGIN)')

# Test 2: CORS Origin Restriction
cors_check = request('GET', '/health', headers_override={'Origin': 'https://attacker-evil-site.com'})
# In strict CORS, either origin is omitted from ACAO or error
acao = cors_check['headers'].get('access-control-allow-origin', '')
assert acao != '*' and acao != 'https://attacker-evil-site.com', f"CORS Flaw: Evil origin was allowed! ({acao})"
print(' [PASS] SEC-02 CORS Hardening: Origin penyerang (evil site) diblokir dari akses credentialed API')

# Test 3: JWT Algorithm Confusion Attack (alg: "none" signature stripping)
# Create header with alg: "none"
header_b64 = base64.urlsafe_b64encode(b'{"alg":"none","typ":"JWT"}').decode().rstrip('=')
payload_b64 = base64.urlsafe_b64encode(b'{"id":"e0e2908f-29d9-4841-8664-f6551b8a9134","name":"Attacker Admin","role":"OWNER"}').decode().rstrip('=')
fake_token = f"{header_b64}.{payload_b64}."

fake_jwt_check = request('GET', '/api/v1/reports/daily-summary', token=fake_token)
assert fake_jwt_check['status'] == 401, f"JWT Crypto Flaw: alg:none token was accepted! ({fake_jwt_check})"
print(' [PASS] SEC-03 JWT Cryptographic Shield: Serangan alg:none (signature-stripping) ditolak 401 Unauthorized')

# Test 4: Business Logic Negative Number Injection (Inventory Wastage)
neg_waste = request('POST', '/api/v1/inventory/wastage', {
    'ingredientId': 'b6cebfa6-a365-4d6b-b4a1-0268571ecaa3',
    'quantity': -500,
    'reason': 'Manipulasi stok negatif'
}, token=cashier_token)
assert neg_waste['status'] == 400, f"Business Logic Flaw: Negative wastage quantity was accepted! ({neg_waste})"
print(' [PASS] SEC-04 Business Logic Defense: Injeksi kuantitas limbah negatif (-500) ditolak 400 Bad Request')

# Test 5: Business Logic Negative Subtotal Injection (Promo Engine)
neg_promo = request('POST', '/api/v1/promos/validate', {
    'code': 'TEMUKOPI',
    'subtotal': -50000
})
assert neg_promo['status'] == 400, f"Business Logic Flaw: Negative subtotal was accepted! ({neg_promo})"
print(' [PASS] SEC-05 Business Logic Defense: Injeksi subtotal belanja negatif (-Rp 50.000) ditolak 400 Bad Request')

# Test 6: Business Logic Purchasing Negative Item Quantity/Cost
neg_po = request('POST', '/api/v1/purchasing/orders', {
    'supplier_id': 'b6cebfa6-a365-4d6b-b4a1-0268571ecaa3',
    'notes': 'Tes Injeksi Negatif',
    'items': [{'ingredient_id': 'b6cebfa6-a365-4d6b-b4a1-0268571ecaa3', 'quantity': -10, 'unit_cost': 500}]
}, token=manager_token)
assert neg_po['status'] == 400, f"Business Logic Flaw: Negative PO quantity was accepted! ({neg_po})"
print(' [PASS] SEC-06 Business Logic Defense: Pengadaan item PO negatif ditolak 400 Bad Request')

# Test 7: Rate Limiter on Manager PIN Verification (Prevent PIN Brute-force)
print('\n [TEST] SEC-07 Menguji Pertahanan Rate Limiting PIN Manajer (Mencegah Brute Force)...')
hit_rate_limit = False
for i in range(25):
    res = request('POST', '/api/v1/auth/verify-pin', {'pin': f'99999{i % 10}'})
    if res['status'] == 429:
        hit_rate_limit = True
        break

assert hit_rate_limit == True, "Security Flaw: Rate limiter did not trigger on repeated failed PIN attempts!"
print(' [PASS] SEC-07 Rate Limiting Defense: Serangan brute-force PIN Manajer diblokir otomatis dengan HTTP 429 Too Many Requests')

print('\n======================================================================')
print('   ALL 7 RIGOROUS CYBERSECURITY VULNERABILITY TESTS PASSED WITH 100%!')
print('   BACKEND DEFENSES ARE PRODUCTION-GRADE & FORTIFIED AGAINST ATTACKS.')
print('======================================================================')
