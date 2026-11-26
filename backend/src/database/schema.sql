-- SCHEMA DEFINITION FOR RUANG TEMU INTEGRATED CAFE MANAGEMENT SYSTEM
-- Target: PostgreSQL 16+

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PENGGUNA & PERAN (2 ROLES ONLY: OWNER & CASHIER)
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('OWNER', 'CASHIER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'CASHIER',
    pin_code VARCHAR(6) NULL, -- PIN 6 angka untuk otorisasi void & diskon oleh Owner
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. SIF KASIR & BLIND CLOSE RECONCILIATION
CREATE TABLE IF NOT EXISTS cashier_shifts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cashier_id UUID NOT NULL REFERENCES users(id),
    opened_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMP WITH TIME ZONE NULL,
    opening_cash NUMERIC(12, 2) NOT NULL DEFAULT 0,
    system_expected_cash NUMERIC(12, 2) NULL,
    blind_counted_cash NUMERIC(12, 2) NULL,
    cash_difference NUMERIC(12, 2) NULL,
    closing_notes TEXT NULL,
    approved_by_manager_id UUID NULL REFERENCES users(id),
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED'))
);

-- 3. MEJA KAFE
DO $$ BEGIN
    CREATE TYPE table_status AS ENUM ('AVAILABLE', 'OCCUPIED', 'RESERVED', 'CLEANING');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS dining_tables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_number VARCHAR(20) UNIQUE NOT NULL,
    area VARCHAR(50) NOT NULL DEFAULT 'Indoor',
    capacity INT NOT NULL DEFAULT 4,
    status table_status NOT NULL DEFAULT 'AVAILABLE',
    occupied_at TIMESTAMP WITH TIME ZONE NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. MASTER BAHAN BAKU
DO $$ BEGIN
    CREATE TYPE ingredient_unit AS ENUM ('gram', 'ml', 'pcs');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS ingredients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    usage_unit ingredient_unit NOT NULL,
    purchase_unit VARCHAR(50) NOT NULL,
    conversion_rate NUMERIC(10, 4) NOT NULL DEFAULT 1000,
    stock_actual NUMERIC(12, 3) NOT NULL DEFAULT 0,
    safe_stock NUMERIC(12, 3) NOT NULL DEFAULT 0,
    unit_cost NUMERIC(12, 4) NOT NULL DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. MASTER PRODUK & TARGET PRINTER
DO $$ BEGIN
    CREATE TYPE product_category AS ENUM ('Kopi', 'Non-Kopi', 'Makanan', 'Camilan', 'Add-on');
    CREATE TYPE target_station_printer AS ENUM ('BAR_PRINTER', 'KITCHEN_PRINTER', 'NONE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sku VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    category product_category NOT NULL,
    price NUMERIC(12, 2) NOT NULL, -- Harga Bersih (Nett)
    image_url TEXT NULL,
    print_target target_station_printer NOT NULL DEFAULT 'BAR_PRINTER',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_force_sold_out BOOLEAN NOT NULL DEFAULT FALSE,
    is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. RESEP PRODUK (MEMBEDAKAN BAHAN RESEP VS KEMASAN TAKEAWAY)
CREATE TABLE IF NOT EXISTS product_recipes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    ingredient_id UUID NOT NULL REFERENCES ingredients(id),
    quantity NUMERIC(10, 3) NOT NULL,
    is_packaging_only BOOLEAN NOT NULL DEFAULT FALSE,
    UNIQUE (product_id, ingredient_id)
);

-- 7. KUSTOMISASI MODIFIERS
CREATE TABLE IF NOT EXISTS modifier_options (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NULL REFERENCES products(id) ON DELETE CASCADE,
    option_name VARCHAR(100) NOT NULL,
    price_adjustment NUMERIC(12, 2) NOT NULL DEFAULT 0,
    action_type VARCHAR(20) NOT NULL DEFAULT 'NONE', -- 'REPLACE', 'ADD', 'REMOVE'
    target_ingredient_id UUID NULL REFERENCES ingredients(id),
    substitute_ingredient_id UUID NULL REFERENCES ingredients(id),
    quantity_delta NUMERIC(10, 3) NOT NULL DEFAULT 0
);

-- 8. PELANGGAN & CRM
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    tier VARCHAR(20) NOT NULL DEFAULT 'CLASSIC',
    loyalty_points INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. RESERVASI & UANG MUKA (DOWN PAYMENT)
CREATE TABLE IF NOT EXISTS reservations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    table_id UUID NOT NULL REFERENCES dining_tables(id),
    reservation_time TIMESTAMP WITH TIME ZONE NOT NULL,
    guest_count INT NOT NULL DEFAULT 2,
    down_payment_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    is_dp_claimed BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(20) NOT NULL DEFAULT 'CONFIRMED' CHECK (status IN ('CONFIRMED', 'COMPLETED', 'CANCELLED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. TRANSAKSI PESANAN
DO $$ BEGIN
    CREATE TYPE order_type AS ENUM ('DINE_IN', 'TAKEAWAY');
    CREATE TYPE order_status AS ENUM ('PENDING_PAYMENT_AT_CASHIER', 'PAID', 'CANCELLED', 'EXPIRED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number VARCHAR(50) UNIQUE NOT NULL,
    shift_id UUID NOT NULL REFERENCES cashier_shifts(id),
    cashier_id UUID NULL REFERENCES users(id),
    table_id UUID NULL REFERENCES dining_tables(id),
    customer_id UUID NULL REFERENCES customers(id),
    reservation_id UUID NULL REFERENCES reservations(id),
    order_type order_type NOT NULL DEFAULT 'DINE_IN',
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0,
    discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    claimed_down_payment NUMERIC(12, 2) NOT NULL DEFAULT 0,
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    total_hpp NUMERIC(12, 2) NOT NULL DEFAULT 0,
    status order_status NOT NULL DEFAULT 'PENDING_PAYMENT_AT_CASHIER',
    notes TEXT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    paid_at TIMESTAMP WITH TIME ZONE NULL
);

CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    product_name_snapshot VARCHAR(100) NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price_snapshot NUMERIC(12, 2) NOT NULL,
    unit_hpp_snapshot NUMERIC(12, 2) NOT NULL,
    subtotal NUMERIC(12, 2) NOT NULL,
    print_target target_station_printer NOT NULL,
    item_notes TEXT NULL,
    selected_modifiers JSONB NULL
);

-- 11. PEMBAYARAN TRANSAKSI (MENDUKUNG SPLIT PAYMENT)
DO $$ BEGIN
    CREATE TYPE payment_method_enum AS ENUM ('CASH', 'QRIS', 'DEBIT_CARD', 'BANK_TRANSFER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS order_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    payment_method payment_method_enum NOT NULL,
    amount_paid NUMERIC(12, 2) NOT NULL,
    cash_received NUMERIC(12, 2) NULL,
    cash_change NUMERIC(12, 2) NULL,
    reference_number VARCHAR(100) NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 12. ANTREAN CETAK TAHAN GAGAL (PRINT QUEUE)
DO $$ BEGIN
    CREATE TYPE print_job_status AS ENUM ('PENDING', 'SENT', 'FAILED');
    CREATE TYPE print_doc_type AS ENUM ('CHECKER_BAR', 'CHECKER_KITCHEN', 'VOID_BAR', 'VOID_KITCHEN');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS print_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    doc_type print_doc_type NOT NULL,
    target_ip VARCHAR(50) NOT NULL,
    target_port INT NOT NULL DEFAULT 9100,
    payload_escpos BYTEA NOT NULL,
    status print_job_status NOT NULL DEFAULT 'PENDING',
    retry_count INT NOT NULL DEFAULT 0,
    error_message TEXT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 13. MUTASI STOK
CREATE TABLE IF NOT EXISTS stock_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ingredient_id UUID NOT NULL REFERENCES ingredients(id),
    movement_type VARCHAR(30) NOT NULL,
    quantity_change NUMERIC(12, 3) NOT NULL,
    resulting_balance NUMERIC(12, 3) NOT NULL,
    reference_id VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 14. BUKU KAS OPERASIONAL (PETTY CASH)
CREATE TABLE IF NOT EXISTS cash_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shift_id UUID NOT NULL REFERENCES cashier_shifts(id),
    type VARCHAR(20) NOT NULL CHECK (type IN ('CASH_IN', 'CASH_OUT')),
    category VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 15. AUDIT LOG LENGKAP
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NULL REFERENCES users(id),
    action VARCHAR(50) NOT NULL,
    target_table VARCHAR(50) NOT NULL,
    target_id VARCHAR(100) NOT NULL,
    details JSONB NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 16. PROMOSI & VOUCHER LOYALITAS
CREATE TABLE IF NOT EXISTS promos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('PERCENT', 'FIXED_AMOUNT', 'BOGO')),
    discount_value NUMERIC(12, 2) NOT NULL DEFAULT 0,
    min_spend NUMERIC(12, 2) NOT NULL DEFAULT 0,
    max_discount NUMERIC(12, 2) NULL,
    quota INT NULL,
    used_count INT NOT NULL DEFAULT 0,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 17. PEMASOK & PEMBELIAN (PURCHASING)
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(100) NULL,
    address TEXT NULL,
    payment_terms VARCHAR(50) DEFAULT 'CASH',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS purchase_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    po_number VARCHAR(50) UNIQUE NOT NULL,
    supplier_id UUID NOT NULL REFERENCES suppliers(id),
    status VARCHAR(20) NOT NULL DEFAULT 'ORDERED' CHECK (status IN ('DRAFT', 'ORDERED', 'RECEIVED', 'CANCELLED')),
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    payment_status VARCHAR(20) NOT NULL DEFAULT 'UNPAID' CHECK (payment_status IN ('UNPAID', 'PAID')),
    notes TEXT NULL,
    ordered_by_user_id UUID NOT NULL REFERENCES users(id),
    received_at TIMESTAMP WITH TIME ZONE NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS purchase_order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    ingredient_id UUID NOT NULL REFERENCES ingredients(id),
    quantity NUMERIC(10, 3) NOT NULL,
    unit_cost NUMERIC(12, 4) NOT NULL,
    subtotal NUMERIC(12, 2) NOT NULL
);

-- 18. ABSENSI KARYAWAN
CREATE TABLE IF NOT EXISTS employee_attendances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    work_date DATE NOT NULL DEFAULT CURRENT_DATE,
    clock_in TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    clock_out TIMESTAMP WITH TIME ZONE NULL,
    total_hours NUMERIC(5, 2) NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PRESENT' CHECK (status IN ('PRESENT', 'LATE', 'PERMIT', 'SICK')),
    notes TEXT NULL,
    UNIQUE(user_id, work_date)
);

-- 19. PENGATURAN TOKO (STORE SETTINGS)
CREATE TABLE IF NOT EXISTS store_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_name VARCHAR(100) NOT NULL DEFAULT 'RUANG TEMU',
    tagline VARCHAR(100) DEFAULT 'Coffee, Eatery, Community',
    address TEXT DEFAULT 'Jl. Raya Pamekasan No. 24, Madura',
    phone VARCHAR(20) DEFAULT '081234567890',
    instagram VARCHAR(100) DEFAULT '@ruangtemu.cafe',
    wifi_ssid VARCHAR(100) DEFAULT 'Ruang Temu Cafe',
    wifi_password VARCHAR(100) DEFAULT '',
    receipt_footer TEXT DEFAULT 'Terima kasih telah berkunjung ke Ruang Temu! Follow IG: @ruangtemu.cafe',
    rounding_rule INT NOT NULL DEFAULT 100,
    paper_size VARCHAR(10) NOT NULL DEFAULT '58mm',
    tax_rate NUMERIC(5, 2) NOT NULL DEFAULT 0,
    service_charge_rate NUMERIC(5, 2) NOT NULL DEFAULT 0,
    auto_print_receipt BOOLEAN NOT NULL DEFAULT TRUE,
    auto_print_bar BOOLEAN NOT NULL DEFAULT TRUE,
    auto_print_kitchen BOOLEAN NOT NULL DEFAULT TRUE,
    cashier_printer_name VARCHAR(100) DEFAULT 'Printer Kasir',
    bar_printer_name VARCHAR(100) DEFAULT 'Printer Bar Checker',
    kitchen_printer_name VARCHAR(100) DEFAULT 'Printer Dapur Checker',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Schema Additions & Upgrades
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS instagram VARCHAR(100) DEFAULT '@ruangtemu.cafe';
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS wifi_ssid VARCHAR(100) DEFAULT 'Ruang Temu Cafe';
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS wifi_password VARCHAR(100) DEFAULT '';
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS paper_size VARCHAR(10) NOT NULL DEFAULT '58mm';
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(5, 2) NOT NULL DEFAULT 0;
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS service_charge_rate NUMERIC(5, 2) NOT NULL DEFAULT 0;
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS auto_print_receipt BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS auto_print_bar BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS auto_print_kitchen BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS cashier_printer_name VARCHAR(100) DEFAULT 'Printer Kasir';
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS bar_printer_name VARCHAR(100) DEFAULT 'Printer Bar Checker';
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS kitchen_printer_name VARCHAR(100) DEFAULT 'Printer Dapur Checker';

ALTER TABLE orders ADD COLUMN IF NOT EXISTS promo_id UUID NULL REFERENCES promos(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(5, 2) NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(12, 2) NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS service_charge_rate NUMERIC(5, 2) NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS service_charge_amount NUMERIC(12, 2) NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS rounding_amount NUMERIC(12, 2) NOT NULL DEFAULT 0;

ALTER TABLE purchase_order_items ADD COLUMN IF NOT EXISTS unit_type VARCHAR(20) NOT NULL DEFAULT 'PURCHASE_UNIT';
ALTER TABLE purchase_order_items ADD COLUMN IF NOT EXISTS conversion_rate NUMERIC(10, 3) NOT NULL DEFAULT 1;
