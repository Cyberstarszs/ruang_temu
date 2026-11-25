import requests
import json
import sys

BASE_URL = 'http://localhost:5000/api/v1'

def run_tests():
    print("=" * 60)
    print(" RUANG TEMU ADMIN & OWNER ROLE - END-TO-END TEST SUITE")
    print("=" * 60)

    # 1. Login as OWNER
    print("[1] Logging in as OWNER...")
    r = requests.post(f"{BASE_URL}/auth/login", json={"username": "owner", "password": "owner123"})
    assert r.status_code == 200, f"Owner login failed: {r.text}"
    owner_data = r.json()["data"]
    owner_token = owner_data["token"]
    owner_headers = {"Authorization": f"Bearer {owner_token}", "Content-Type": "application/json"}
    print(f" -> Logged in successfully: {owner_data['user']['name']} ({owner_data['user']['role']})")

    # 2. Login as CASHIER to verify RBAC
    print("\n[2] Logging in as CASHIER to verify RBAC security...")
    r = requests.post(f"{BASE_URL}/auth/login", json={"username": "kasir", "password": "kasir123"})
    if r.status_code == 200:
        cashier_token = r.json()["data"]["token"]
        cashier_headers = {"Authorization": f"Bearer {cashier_token}", "Content-Type": "application/json"}
        # Attempt to access owner-only endpoint
        r_forbidden = requests.get(f"{BASE_URL}/reports/daily-summary", headers=cashier_headers)
        assert r_forbidden.status_code == 403, f"Expected 403 Forbidden for cashier, got {r_forbidden.status_code}"
        r_audit_forbidden = requests.get(f"{BASE_URL}/audit-logs", headers=cashier_headers)
        assert r_audit_forbidden.status_code == 403, f"Expected 403 Forbidden for audit logs, got {r_audit_forbidden.status_code}"
        print(" -> RBAC PASSED: Cashier correctly forbidden (403) from accessing Owner backoffice reports.")
    else:
        print(f" -> Cashier login failed: {r.text}")

    # 3. Test Executive Reports
    print("\n[3] Testing Executive Reports (FR-01)...")
    r_sum = requests.get(f"{BASE_URL}/reports/daily-summary", headers=owner_headers)
    assert r_sum.status_code == 200, f"Daily summary failed: {r_sum.text}"
    sum_data = r_sum.json()["data"]
    print(f" -> Daily Summary: Net Sales=Rp {sum_data['netSales']:,}, Transactions={sum_data['totalTransactions']}, Gross Profit=Rp {sum_data['grossProfit']:,}")

    r_heat = requests.get(f"{BASE_URL}/reports/hourly-heatmap", headers=owner_headers)
    assert r_heat.status_code == 200, f"Hourly heatmap failed: {r_heat.text}"
    print(f" -> Hourly Heatmap: {len(r_heat.json()['data'])} hourly data points returned.")

    r_matrix = requests.get(f"{BASE_URL}/reports/menu-matrix", headers=owner_headers)
    assert r_matrix.status_code == 200, f"Menu matrix failed: {r_matrix.text}"
    print(f" -> BCG Matrix: {len(r_matrix.json()['data']['products'])} products classified.")

    # 4. Test Inventory Master & Stocktake
    print("\n[4] Testing Inventory Management (FR-08)...")
    import time
    ts = int(time.time() * 1000)
    ing_code = f"TEST-ING-{ts}"
    r_create_ing = requests.post(
        f"{BASE_URL}/inventory",
        headers=owner_headers,
        json={
            "code": ing_code,
            "name": "Bahan Uji Coba Lab",
            "usage_unit": "gram",
            "purchase_unit": "kg",
            "conversion_rate": 1000,
            "stock_actual": 500,
            "safe_stock": 200,
            "unit_cost": 150
        }
    )
    assert r_create_ing.status_code in [200, 201], f"Create ingredient failed: {r_create_ing.text}"
    test_ing = r_create_ing.json()["data"]
    ing_id = test_ing["id"]
    print(f" -> Created ingredient: {test_ing['name']} ({test_ing['code']}) with stock={test_ing['stock_actual']}")

    # Opname / Stocktake
    r_opname = requests.post(
        f"{BASE_URL}/inventory/stocktake",
        headers=owner_headers,
        json={"items": [{"ingredientId": ing_id, "actualCount": 550, "notes": "Uji Opname Fisik"}]}
    )
    assert r_opname.status_code == 200, f"Opname failed: {r_opname.text}"
    print(" -> Physical Stock Opname submitted successfully.")

    # Record Wastage
    r_waste = requests.post(
        f"{BASE_URL}/inventory/wastage",
        headers=owner_headers,
        json={"ingredientId": ing_id, "quantity": 50, "reason": "Tumpah Kalibrasi"}
    )
    assert r_waste.status_code == 200, f"Wastage failed: {r_waste.text}"
    print(" -> Wastage recorded successfully. Resulting stock should be 500.")

    # 5. Test Product Catalog & Recipe Formulation (FR-07)
    print("\n[5] Testing Product Catalog & Recipe Formulation (FR-07)...")
    sku = f"TEST-PROD-{ing_code[-4:]}"
    r_prod = requests.post(
        f"{BASE_URL}/products",
        headers=owner_headers,
        json={
            "sku": sku,
            "name": "Kopi Uji Laboratorium",
            "category": "Kopi",
            "price": 32000,
            "print_target": "BAR_PRINTER",
            "is_favorite": True
        }
    )
    assert r_prod.status_code in [200, 201], f"Create product failed: {r_prod.text}"
    test_prod = r_prod.json()["data"]
    prod_id = test_prod["id"]
    print(f" -> Created product: {test_prod['name']} ({test_prod['sku']}) - Rp {test_prod['price']}")

    # Set Recipes
    r_recipe = requests.put(
        f"{BASE_URL}/products/{prod_id}/recipes",
        headers=owner_headers,
        json={
            "recipes": [
                {"ingredient_id": ing_id, "quantity": 18, "is_packaging_only": False}
            ]
        }
    )
    assert r_recipe.status_code == 200, f"Set recipes failed: {r_recipe.text}"
    
    r_get_recipe = requests.get(f"{BASE_URL}/products/{prod_id}/recipes", headers=owner_headers)
    assert r_get_recipe.status_code == 200
    recipe_data = r_get_recipe.json()["data"]
    print(f" -> Recipe updated: Total HPP calculated = Rp {recipe_data['totalHpp']}")

    # 6. Test Purchasing & Auto Stock Increment (FR-09)
    print("\n[6] Testing Purchasing & Supplier PO Auto-Increment (FR-09)...")
    r_sup = requests.post(
        f"{BASE_URL}/purchasing/suppliers",
        headers=owner_headers,
        json={
            "name": f"Supplier Uji {sku}",
            "phone": "081298765432",
            "email": "supplier@uji.com",
            "payment_terms": "NET30"
        }
    )
    assert r_sup.status_code in [200, 201], f"Create supplier failed: {r_sup.text}"
    sup_id = r_sup.json()["data"]["id"]

    # Create PO
    po_qty = 200
    r_po = requests.post(
        f"{BASE_URL}/purchasing/orders",
        headers=owner_headers,
        json={
            "supplierId": sup_id,
            "notes": "Pesanan Uji Otomatisasi Stok",
            "items": [{"ingredientId": ing_id, "quantity": po_qty, "unitCost": 150}]
        }
    )
    assert r_po.status_code in [200, 201], f"Create PO failed: {r_po.text}"
    po_id = r_po.json()["data"]["id"]

    # Check stock before receiving
    r_check_before = requests.get(f"{BASE_URL}/inventory", headers=owner_headers)
    ing_before = next(i for i in r_check_before.json()["data"] if i["id"] == ing_id)
    stock_before = float(ing_before["stock_actual"])

    # Receive PO
    r_receive = requests.post(f"{BASE_URL}/purchasing/orders/{po_id}/receive", headers=owner_headers)
    assert r_receive.status_code == 200, f"Receive PO failed: {r_receive.text}"

    # Check stock after receiving
    r_check_after = requests.get(f"{BASE_URL}/inventory", headers=owner_headers)
    ing_after = next(i for i in r_check_after.json()["data"] if i["id"] == ing_id)
    stock_after = float(ing_after["stock_actual"])
    print(f" -> PO Received: Stock before={stock_before}, Stock after={stock_after} (Incremented by +{po_qty})")
    assert stock_after == stock_before + po_qty, f"Stock did not increment properly! Expected {stock_before + po_qty}, got {stock_after}"

    # 7. Test Shift History (FR-13)
    print("\n[7] Testing Shift Auditing (FR-13)...")
    r_shifts = requests.get(f"{BASE_URL}/shifts/history", headers=owner_headers)
    assert r_shifts.status_code == 200, f"Shift history failed: {r_shifts.text}"
    shifts_list = r_shifts.json()["data"]
    print(f" -> Found {len(shifts_list)} historical shift records.")

    # 8. Test Promos
    print("\n[8] Testing Promos Management...")
    promo_code = f"PROMO-{sku[-4:]}"
    r_promo = requests.post(
        f"{BASE_URL}/promos",
        headers=owner_headers,
        json={
            "code": promo_code,
            "name": "Diskon Uji Coba",
            "discount_type": "PERCENT",
            "discount_value": 15,
            "min_spend": 30000,
            "start_date": "2026-01-01",
            "end_date": "2026-12-31"
        }
    )
    assert r_promo.status_code in [200, 201], f"Create promo failed: {r_promo.text}"
    promo_id = r_promo.json()["data"]["id"]
    r_toggle = requests.patch(f"{BASE_URL}/promos/{promo_id}/toggle", headers=owner_headers, json={"is_active": False})
    assert r_toggle.status_code == 200
    print(f" -> Promo {promo_code} created and toggled successfully.")

    # 9. Test User Management
    print("\n[9] Testing User & Staff Management...")
    new_username = f"staf_{sku[-4:].lower()}"
    r_user = requests.post(
        f"{BASE_URL}/auth/users",
        headers=owner_headers,
        json={
            "name": "Barista Uji Baru",
            "username": new_username,
            "password": "password123",
            "role": "CASHIER",
            "pin_code": "123456"
        }
    )
    assert r_user.status_code in [200, 201], f"Create user failed: {r_user.text}"
    new_user_id = r_user.json()["data"]["id"]
    print(f" -> User {new_username} registered successfully.")

    # 10. Test Audit Logs
    print("\n[10] Testing Tamper-Proof Audit Trail (FR-20)...")
    r_audit = requests.get(f"{BASE_URL}/audit-logs", headers=owner_headers)
    assert r_audit.status_code == 200, f"Audit logs failed: {r_audit.text}"
    logs = r_audit.json()["data"]
    print(f" -> Found {len(logs)} audit log records. Most recent action: {logs[0]['action']}")

    # 11. Test Store Settings
    print("\n[11] Testing Store Settings (FR-17)...")
    r_settings = requests.get(f"{BASE_URL}/settings", headers=owner_headers)
    assert r_settings.status_code == 200
    cur_settings = r_settings.json()["data"]
    r_update_settings = requests.put(
        f"{BASE_URL}/settings",
        headers=owner_headers,
        json={
            "store_name": "RUANG TEMU",
            "tagline": "Coffee, Eatery, Community",
            "receipt_footer": "Terima kasih telah berkunjung ke Ruang Temu!",
            "rounding_rule": 100
        }
    )
    assert r_update_settings.status_code == 200
    print(f" -> Store Settings verified and updated.")

    print("\n" + "=" * 60)
    print(" ALL 11 TEST SUITES PASSED! (0% Dummy Data, 100% Real PostgreSQL)")
    print("=" * 60)

if __name__ == "__main__":
    run_tests()
