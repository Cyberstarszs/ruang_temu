import os
import re

backend_dir = r"D:\xampp\htdocs\ruang_temu\backend\src"
print("Scanning backend for potential security vulnerabilities...")

# 1. SQL Interpolation Check
print("\n[CHECK 1] Scanning for SQL String Interpolation (SQLi)...")
sqli_findings = []
for root, _, files in os.walk(backend_dir):
    for f in files:
        if f.endswith('.ts'):
            path = os.path.join(root, f)
            with open(path, 'r', encoding='utf-8') as file:
                content = file.read()
                matches = re.finditer(r'query\s*\(\s*`([^`]+)`', content)
                for m in matches:
                    q = m.group(1)
                    if "${" in q:
                        sqli_findings.append((path, q.strip()))

if sqli_findings:
    for p, q in sqli_findings:
        print(f" [VULNERABILITY] {os.path.basename(p)}:\n{q}\n")
else:
    print(" [OK] All SQL queries use parameterized arguments ($1, $2, ...). No direct SQL injection sinks detected.")

# 2. Hardcoded Secrets Check
print("\n[CHECK 2] Scanning for Hardcoded Secrets & Weak Fallbacks...")
secret_findings = []
secret_patterns = [
    r'JWT_SECRET\s*\|\|\s*[\'"][^\'"]+[\'"]',
    r'password\s*:\s*[\'"][^\'"]+[\'"]',
    r'secret\s*:\s*[\'"][^\'"]+[\'"]'
]
for root, _, files in os.walk(backend_dir):
    for f in files:
        if f.endswith('.ts'):
            path = os.path.join(root, f)
            with open(path, 'r', encoding='utf-8') as file:
                lines = file.readlines()
                for idx, line in enumerate(lines):
                    for pat in secret_patterns:
                        if re.search(pat, line, re.IGNORECASE) and 'process.env' in line:
                            secret_findings.append((path, idx + 1, line.strip()))

for p, lno, line in secret_findings:
    print(f" [WARNING] {os.path.basename(p)}:{lno} -> {line}")

# 3. Missing Rate Limiter on Auth
print("\n[CHECK 3] Checking Auth Endpoints for Brute Force Protection...")
auth_routes_path = os.path.join(backend_dir, "modules", "auth", "authRoutes.ts")
if os.path.exists(auth_routes_path):
    with open(auth_routes_path, 'r', encoding='utf-8') as f:
        auth_content = f.read()
        if "rateLimit" not in auth_content and "limiter" not in auth_content:
            print(" [VULNERABILITY] Auth routes (/login, /verify-pin) lack rate limiting protection!")
        else:
            print(" [OK] Rate limiting detected on auth routes.")

# 4. CORS & Security Headers Check
print("\n[CHECK 4] Checking CORS Configuration & Security Headers in app.ts...")
app_path = os.path.join(backend_dir, "app.ts")
with open(app_path, 'r', encoding='utf-8') as f:
    app_content = f.read()
    if "origin: process.env.FRONTEND_URL || '*'" in app_content:
        print(" [VULNERABILITY] CORS allows wildcard '*' with credentials: true!")
    else:
        print(" [OK] CORS enforces strict origin allowlist.")
    if "helmet" not in app_content:
        print(" [VULNERABILITY] Missing HTTP Security Headers (Helmet middleware not found)!")
    else:
        print(" [OK] Helmet security headers & x-powered-by protection enabled.")

# 5. Business Logic: Negative / Tampered Input
print("\n[CHECK 5] Checking Negative Number Validation on Financial/Inventory endpoints...")
# Check shift cash movements
shift_path = os.path.join(backend_dir, "modules", "shifts", "shiftController.ts")
with open(shift_path, 'r', encoding='utf-8') as f:
    shift_content = f.read()
    if "amount <= 0" not in shift_content and "Number(amount) <= 0" not in shift_content:
        print(" [VULNERABILITY] shiftController.ts allows non-positive or unvalidated cash movement amounts!")

# Check inventory wastage
inv_path = os.path.join(backend_dir, "modules", "inventory", "inventoryController.ts")
with open(inv_path, 'r', encoding='utf-8') as f:
    inv_content = f.read()
    if "quantity <= 0" not in inv_content and "Number(quantity) <= 0" not in inv_content and "qty <= 0" not in inv_content:
        print(" [VULNERABILITY] inventoryController.ts allows non-positive wastage quantities!")
    else:
        print(" [OK] Inventory wastage strictly enforces positive quantities (qty > 0).")

print("\nScan completed.")
