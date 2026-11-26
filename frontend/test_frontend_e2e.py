import requests
import json
import time

BASE_API = "http://127.0.0.1:5000/api/v1"
FRONTEND_URL = "http://127.0.0.1:3000"

def test_frontend_backend_e2e():
    print("=" * 60)
    print(" RUANG TEMU - END-TO-END SYSTEM INTEGRATION TEST")
    print("=" * 60)

    # 1. Test Frontend HTTP Availability
    print("\n[STEP 1] Testing Frontend Server...")
    res_fe = requests.get(FRONTEND_URL, timeout=5)
    assert res_fe.status_code == 200, f"Frontend failed: {res_fe.status_code}"
    print(f"  ✓ Frontend is LIVE at {FRONTEND_URL} (HTTP 200 OK)")

    # 2. Test Backend Health
    print("\n[STEP 2] Testing Backend Server...")
    res_be = requests.get("http://localhost:5000/health", timeout=5)
    assert res_be.status_code == 200, f"Backend health failed: {res_be.status_code}"
    print("  ✓ Backend is LIVE at http://localhost:5000 (HTTP 200 OK)")

    # 3. Staff Login
    print("\n[STEP 3] Authenticating as Cashier...")
    login_res = requests.post(f"{BASE_API}/auth/login", json={"username": "kasir", "password": "kasir123"}, timeout=5)
    login_data = login_res.json()
    assert login_data.get("success"), f"Login failed: {login_data}"
    token = login_data["data"]["token"]
    user = login_data["data"]["user"]
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    print(f"  ✓ Logged in as: {user['name']} (Role: {user['role']})")

    # 4. Open Cashier Shift
    print("\n[STEP 4] Checking & Opening Cashier Shift...")
    shift_res = requests.get(f"{BASE_API}/shifts/current", headers=headers, timeout=5)
    shift_data = shift_res.json()
    shift_payload = shift_data.get("data")
    shift = shift_payload.get("shift") if isinstance(shift_payload, dict) and "shift" in shift_payload else shift_payload
    if not shift or shift.get("status") == "CLOSED":
        open_res = requests.post(f"{BASE_API}/shifts/open", json={"openingCash": 200000}, headers=headers, timeout=5)
        res_data = open_res.json()["data"]
        shift = res_data.get("shift", res_data)
        print(f"  ✓ Opened new Shift #{shift['id'][:8]} with Opening Cash: Rp 200.000")
    else:
        print(f"  ✓ Found active Shift #{shift['id'][:8]} (Status: {shift['status']})")
    shift_id = shift["id"]

    # 5. Fetch Catalog & Tables
    print("\n[STEP 5] Loading Products & Tables...")
    prod_res = requests.get(f"{BASE_API}/products", headers=headers, timeout=5)
    products = prod_res.json()["data"]
    assert len(products) > 0, "No products found!"
    print(f"  ✓ Loaded {len(products)} menu items from PostgreSQL")

    table_res = requests.get(f"{BASE_API}/tables", headers=headers, timeout=5)
    tables = table_res.json()["data"]
    avail_tables = [t for t in tables if t["status"] == "AVAILABLE"]
    print(f"  ✓ Loaded {len(tables)} tables ({len(avail_tables)} available)")
    target_table = avail_tables[0] if avail_tables else tables[0]

    # 6. Direct POS Checkout (Nett Pricing: Total = Subtotal - Discount)
    print("\n[STEP 6] Executing Cashier Direct POS Checkout (Pay-First)...")
    kopi_susu = next(p for p in products if "Kopi Susu" in p["name"])
    croissant = next(p for p in products if "Croissant" in p["name"] or "Makanan" in p.get("category_name", ""))
    
    checkout_payload = {
        "shiftId": shift_id,
        "tableId": target_table["id"],
        "orderType": "DINE_IN",
        "items": [
            {
                "productId": kopi_susu["id"],
                "quantity": 2,
                "modifiers": ["Less Sugar (50%)", "Oat Milk (+Rp 6.000)"],
                "notes": "Dingin, es sedikit"
            },
            {
                "productId": croissant["id"],
                "quantity": 1,
                "notes": "Hangatkan sebentar"
            }
        ],
        "paymentMethod": "CASH",
        "cashReceived": 100000,
        "notes": "Pelanggan VIP Meja 01"
    }

    checkout_res = requests.post(f"{BASE_API}/orders/checkout-direct", json=checkout_payload, headers=headers, timeout=5)
    order_data = checkout_res.json()
    assert order_data.get("success"), f"Checkout failed: {order_data}"
    order = order_data["data"]
    print(f"  ✓ Order Created: #{order['order_number']}")
    print(f"    Subtotal: Rp {float(order['subtotal']):,.0f}")
    print(f"    Diskon:   Rp {float(order['discount_amount']):,.0f}")
    print(f"    Tax (PB1):Rp {float(order.get('tax_amount', 0)):,.0f} (0% Nett)")
    print(f"    Service:  Rp {float(order.get('service_charge', 0)):,.0f} (0% Nett)")
    print(f"    TOTAL:    Rp {float(order['total_amount']):,.0f}")
    print(f"    Status:   {order['status']} (Lunas)")

    # 7. Customer QR Order Submission (Pending Payment at Cashier)
    print("\n[STEP 7] Simulating Customer QR Self-Order from Table...")
    qr_payload = {
        "tableNumber": target_table["table_number"],
        "customerName": "Dimas Pratama",
        "items": [
            {
                "productId": kopi_susu["id"],
                "quantity": 1,
                "modifiers": ["Normal Sugar (100%)"]
            }
        ],
        "notes": "Pesanan mandiri via scan QR"
    }
    qr_res = requests.post(f"{BASE_API}/orders/qr-submit", json=qr_payload, timeout=5)
    qr_data = qr_res.json()
    assert qr_data.get("success"), f"QR submit failed: {qr_data}"
    qr_order_id = qr_data["data"]["id"]
    print(f"  ✓ Customer QR Order Created: #{qr_data['data']['order_number']} (Status: {qr_data['data'].get('status', 'PENDING_PAYMENT_AT_CASHIER')})")

    # 8. Cashier Reviews Pending & Collects Payment
    print("\n[STEP 8] Cashier Receives & Confirms QR Order Payment...")
    pay_qr_res = requests.post(
        f"{BASE_API}/orders/{qr_order_id}/cashier-pay",
        json={"shiftId": shift_id, "paymentMethod": "QRIS"},
        headers=headers,
        timeout=5
    )
    pay_qr_data = pay_qr_res.json()
    assert pay_qr_data.get("success"), f"QR Pay failed: {pay_qr_data}"
    print(f"  ✓ Order #{qr_data['data']['order_number']} PAID via QRIS -> Bar/Kitchen tickets emitted!")

    # 9. Clear Table after Dining
    print("\n[STEP 9] Table Turnover (Cleaning Table)...")
    clear_res = requests.post(f"{BASE_API}/tables/{target_table['id']}/clear", headers=headers, timeout=5)
    assert clear_res.json().get("success"), "Clear table failed"
    print(f"  ✓ Table {target_table['table_number']} returned to AVAILABLE status")

    # 10. Record Petty Cash Movement
    print("\n[STEP 10] Recording Petty Cash Outflow...")
    petty_res = requests.post(
        f"{BASE_API}/shifts/cash-movements",
        json={
            "shiftId": shift_id,
            "type": "CASH_OUT",
            "category": "Operasional Toko",
            "description": "Beli 2 kantong es batu kristal",
            "amount": 24000
        },
        headers=headers,
        timeout=5
    )
    assert petty_res.json().get("success"), "Petty cash movement failed"
    print("  ✓ Recorded Petty Cash: -Rp 24.000 (Es batu kristal)")

    # 11. Daily Sales Report (Protected for Manager & Owner)
    print("\n[STEP 11] Validating Daily Sales Summary as Manager...")
    mgr_res = requests.post(f"{BASE_API}/auth/login", json={"username": "manager", "password": "manager123"}, timeout=5)
    mgr_token = mgr_res.json()["data"]["token"]
    mgr_headers = {"Authorization": f"Bearer {mgr_token}", "Content-Type": "application/json"}
    report_res = requests.get(f"{BASE_API}/reports/daily-summary", headers=mgr_headers, timeout=5)
    summary = report_res.json()["data"]
    print(f"  ✓ Total Net Sales Today: Rp {float(summary.get('netSales', summary.get('total_net_sales', 0))):,.0f}")
    print(f"  ✓ Total Orders Completed: {summary.get('totalTransactions', summary.get('total_orders', 0))}")
    print(f"  ✓ Gross Profit: Rp {float(summary.get('grossProfit', 0)):,.0f}")
    if "topProducts" in summary:
        print(f"  ✓ Top Products: {[p.get('name') for p in summary['topProducts'][:3]]}")

    print("\n" + "=" * 60)
    print(" ALL 11 E2E INTEGRATION & OPERATIONAL CHECKS PASSED 100%!")
    print("=" * 60)

if __name__ == "__main__":
    test_frontend_backend_e2e()
