import bcrypt from 'bcryptjs';
import { pool } from '../config/database';

export async function runSeed() {
  console.log('[Seed] Seeding comprehensive DEMO data for RUANG TEMU...');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 0. RESET EXISTING TABLES TO PRISTINE DEMO STATE
    console.log('[Seed] Cleaning existing data...');
    await client.query(`
      TRUNCATE TABLE 
        order_payments,
        order_items,
        print_queue,
        orders,
        cash_movements,
        cashier_shifts,
        employee_attendances,
        audit_logs,
        purchase_order_items,
        purchase_orders,
        suppliers,
        modifier_options,
        product_recipes,
        products,
        stock_movements,
        ingredients,
        reservations,
        dining_tables,
        customers,
        promos,
        store_settings,
        users
      CASCADE;
    `);

    // 1. STORE SETTINGS
    console.log('[Seed] Seeding store settings...');
    await client.query(`
      INSERT INTO store_settings (
        store_name, tagline, address, phone, instagram, wifi_ssid, wifi_password, 
        receipt_footer, rounding_rule, paper_size, tax_rate, service_charge_rate, 
        auto_print_receipt, auto_print_bar, auto_print_kitchen, 
        cashier_printer_name, bar_printer_name, kitchen_printer_name
      ) VALUES (
        'RUANG TEMU', 
        'Coffee, Eatery & Community Hub', 
        'Jl. Senopati No. 45, Kebayoran Baru, Jakarta Selatan', 
        '0812-3456-7890', 
        '@ruangtemu.coffee', 
        'Ruang Temu Guest', 
        'temukankopimu', 
        'Terima kasih telah berkunjung ke Ruang Temu! Follow IG kami @ruangtemu.coffee', 
        100, 
        '58mm', 
        10, 
        5, 
        TRUE, 
        TRUE, 
        TRUE, 
        'Printer Kasir (58mm)', 
        'Printer Bar Checker', 
        'Printer Dapur Checker'
      );
    `);

    // 2. USERS (OWNER, CASHIER, SUPERVISOR, BARISTA)
    console.log('[Seed] Seeding users...');
    const salt = await bcrypt.genSalt(10);
    const ownerPass = await bcrypt.hash('owner123', salt);
    const cashierPass = await bcrypt.hash('kasir123', salt);

    const userRows = await client.query(`
      INSERT INTO users (name, username, password_hash, role, pin_code)
      VALUES 
        ('Budi Santoso', 'owner', $1, 'OWNER', '123456'),
        ('Rina Kasir', 'kasir', $2, 'CASHIER', NULL),
        ('Dimas Supervisor', 'dimas', $2, 'CASHIER', '654321'),
        ('Siti Barista', 'siti', $2, 'CASHIER', NULL)
      RETURNING id, username;
    `, [ownerPass, cashierPass]);

    const userMap: Record<string, string> = {};
    userRows.rows.forEach(r => { userMap[r.username] = r.id; });

    // 3. DINING TABLES (INDOOR, OUTDOOR, VIP)
    console.log('[Seed] Seeding dining tables...');
    const tableList = [
      { num: 'M01', area: 'Indoor', cap: 2, status: 'AVAILABLE' },
      { num: 'M02', area: 'Indoor', cap: 2, status: 'AVAILABLE' },
      { num: 'M03', area: 'Indoor', cap: 4, status: 'OCCUPIED' }, // Live occupied table for demo
      { num: 'M04', area: 'Indoor', cap: 4, status: 'RESERVED' }, // Live reserved table today with DP
      { num: 'M05', area: 'Indoor', cap: 4, status: 'AVAILABLE' },
      { num: 'M06', area: 'Indoor', cap: 6, status: 'AVAILABLE' },
      { num: 'M07', area: 'Indoor', cap: 4, status: 'AVAILABLE' },
      { num: 'M08', area: 'Indoor', cap: 2, status: 'AVAILABLE' },
      { num: 'M09', area: 'Outdoor', cap: 2, status: 'AVAILABLE' },
      { num: 'M10', area: 'Outdoor', cap: 4, status: 'AVAILABLE' },
      { num: 'M11', area: 'Outdoor', cap: 4, status: 'AVAILABLE' },
      { num: 'M12', area: 'Outdoor', cap: 6, status: 'AVAILABLE' },
      { num: 'M13', area: 'Outdoor', cap: 2, status: 'AVAILABLE' },
      { num: 'M14', area: 'Outdoor', cap: 4, status: 'AVAILABLE' },
      { num: 'VIP-01', area: 'VIP Room', cap: 8, status: 'AVAILABLE' },
      { num: 'VIP-02', area: 'VIP Room', cap: 10, status: 'AVAILABLE' },
    ];

    const tableMap: Record<string, string> = {};
    for (const t of tableList) {
      const tr = await client.query(`
        INSERT INTO dining_tables (table_number, area, capacity, status, occupied_at)
        VALUES ($1, $2, $3, $4::table_status, $5)
        RETURNING id;
      `, [t.num, t.area, t.cap, t.status, t.status === 'OCCUPIED' ? new Date() : null]);
      tableMap[t.num] = tr.rows[0].id;
    }

    // 4. CUSTOMERS & CRM
    console.log('[Seed] Seeding customers...');
    const customers = [
      { name: 'Andi Pratama', phone: '081234567890', tier: 'GOLD', points: 450 },
      { name: 'Jessica Wijaya', phone: '081987654321', tier: 'PLATINUM', points: 1250 },
      { name: 'Bambang Pamungkas', phone: '082155566778', tier: 'SILVER', points: 180 },
      { name: 'Citra Lestari', phone: '085711223344', tier: 'CLASSIC', points: 65 },
      { name: 'Rian Hidayat', phone: '087899887766', tier: 'CLASSIC', points: 25 },
      { name: 'Dewi Anggraini', phone: '081399887711', tier: 'GOLD', points: 520 },
    ];

    const customerMap: Record<string, string> = {};
    for (const c of customers) {
      const cr = await client.query(`
        INSERT INTO customers (name, phone_number, tier, loyalty_points)
        VALUES ($1, $2, $3, $4)
        RETURNING id;
      `, [c.name, c.phone, c.tier, c.points]);
      customerMap[c.phone] = cr.rows[0].id;
    }

    // 5. SUPPLIERS
    console.log('[Seed] Seeding suppliers...');
    const suppliers = [
      { name: 'CV Berkah Kopi Nusantara', phone: '081288899901', email: 'sales@berkahkopi.id', address: 'Jl. Riau No. 12, Bandung', terms: 'NET_30' },
      { name: 'PT Sumber Dairy Sejahtera', phone: '081377788802', email: 'order@sumberdairy.co.id', address: 'Kawasan Industri Pulogadung, Jakarta', terms: 'NET_14' },
      { name: 'Toko Packaging Makmur', phone: '081566677703', email: 'makmurpack@gmail.com', address: 'Pusat Grosir Pasar Pagi, Jakarta Barat', terms: 'CASH' },
      { name: 'PT Pangan Beku Prima', phone: '081755544404', email: 'supply@panganbeku.id', address: 'Jl. Daan Mogot KM 19, Tangerang', terms: 'NET_14' },
      { name: 'UD Rasa Nusantara', phone: '081844433305', email: 'rasanusantara@yahoo.com', address: 'Kertajaya Indah No. 45, Surabaya', terms: 'CASH' },
    ];

    const supplierMap: Record<string, string> = {};
    for (const s of suppliers) {
      const sr = await client.query(`
        INSERT INTO suppliers (name, phone, email, address, payment_terms, is_active)
        VALUES ($1, $2, $3, $4, $5, TRUE)
        RETURNING id;
      `, [s.name, s.phone, s.email, s.address, s.terms]);
      supplierMap[s.name] = sr.rows[0].id;
    }

    // 6. INGREDIENTS (REALISTIC CAFE RAW MATERIALS & CONVERSIONS)
    console.log('[Seed] Seeding ingredients...');
    const ingredients = [
      { code: 'ING-01', name: 'Biji Kopi House Blend', unit: 'gram', pUnit: 'kg', conv: 1000, stock: 18500, safe: 3000, cost: 280 },
      { code: 'ING-02', name: 'Biji Kopi Single Origin Gayo', unit: 'gram', pUnit: 'kg', conv: 1000, stock: 4500, safe: 1500, cost: 350 },
      { code: 'ING-03', name: 'Susu Segar Pasteurisasi', unit: 'ml', pUnit: 'liter', conv: 1000, stock: 32000, safe: 5000, cost: 22 },
      { code: 'ING-04', name: 'Susu Oat Barista Blend', unit: 'ml', pUnit: 'liter', conv: 1000, stock: 8500, safe: 2000, cost: 45 },
      { code: 'ING-05', name: 'Gula Aren Organik Cair', unit: 'ml', pUnit: 'liter', conv: 1000, stock: 12000, safe: 2000, cost: 35 },
      { code: 'ING-06', name: 'Bubuk Pure Matcha Uji', unit: 'gram', pUnit: 'kg', conv: 1000, stock: 2400, safe: 500, cost: 450 },
      { code: 'ING-07', name: 'Bubuk Cokelat Belgia', unit: 'gram', pUnit: 'kg', conv: 1000, stock: 3200, safe: 800, cost: 320 },
      { code: 'ING-08', name: 'Sirup Karamel Artisan', unit: 'ml', pUnit: 'botol 750ml', conv: 750, stock: 3750, safe: 750, cost: 160 },
      { code: 'ING-09', name: 'Teh Earl Grey Premium', unit: 'gram', pUnit: 'kg', conv: 1000, stock: 1800, safe: 400, cost: 240 },
      { code: 'ING-10', name: 'Es Batu Kristal Higienis', unit: 'gram', pUnit: 'sak 10kg', conv: 10000, stock: 45000, safe: 10000, cost: 6 },
      { code: 'ING-11', name: 'Cup Plastik 16oz + Lid Dome', unit: 'pcs', pUnit: 'dus 1000pcs', conv: 1000, stock: 680, safe: 150, cost: 850 },
      { code: 'ING-12', name: 'Paper Cup Hot 8oz + Lid', unit: 'pcs', pUnit: 'dus 1000pcs', conv: 1000, stock: 420, safe: 100, cost: 750 },
      { code: 'ING-13', name: 'Sedotan Kertas Steril', unit: 'pcs', pUnit: 'pak 100pcs', conv: 100, stock: 850, safe: 200, cost: 150 },
      { code: 'ING-14', name: 'Daging Beef Patty 100g', unit: 'pcs', pUnit: 'pak 10pcs', conv: 10, stock: 45, safe: 15, cost: 18500 },
      { code: 'ING-15', name: 'Roti Burger Brioche Butter', unit: 'pcs', pUnit: 'lusin', conv: 12, stock: 36, safe: 12, cost: 5500 },
      { code: 'ING-16', name: 'Keju Cheddar Slice', unit: 'pcs', pUnit: 'pak 20pcs', conv: 20, stock: 80, safe: 20, cost: 2200 },
      { code: 'ING-17', name: 'Kentang Potong Shoestring', unit: 'gram', pUnit: 'sak 2.5kg', conv: 2500, stock: 12500, safe: 2500, cost: 42 },
      { code: 'ING-18', name: 'Croissant Mentah Butter', unit: 'pcs', pUnit: 'pak 10pcs', conv: 10, stock: 24, safe: 10, cost: 12500 },
      { code: 'ING-19', name: 'Daging Ayam Fillet Paha', unit: 'gram', pUnit: 'kg', conv: 1000, stock: 8500, safe: 2000, cost: 58 },
      { code: 'ING-20', name: 'Beras Organik Pandan Wangi', unit: 'gram', pUnit: 'karung 25kg', conv: 25000, stock: 22000, safe: 5000, cost: 18 },
      { code: 'ING-21', name: 'Saus Truffle Mayo', unit: 'gram', pUnit: 'botol 1kg', conv: 1000, stock: 180, safe: 300, cost: 130 }, // LOW STOCK ALERT!
    ];

    const ingMap: Record<string, string> = {};
    for (const ing of ingredients) {
      const ir = await client.query(`
        INSERT INTO ingredients (code, name, usage_unit, purchase_unit, conversion_rate, stock_actual, safe_stock, unit_cost)
        VALUES ($1, $2, $3::ingredient_unit, $4, $5, $6, $7, $8)
        RETURNING id;
      `, [ing.code, ing.name, ing.unit, ing.pUnit, ing.conv, ing.stock, ing.safe, ing.cost]);
      ingMap[ing.code] = ir.rows[0].id;
    }

    // 7. PRODUCTS (CATALOG & FAVOURITES)
    console.log('[Seed] Seeding products...');
    const products = [
      // Kopi
      { sku: 'KOP-001', name: 'Es Kopi Susu Aren', cat: 'Kopi', price: 24000, station: 'BAR_PRINTER', fav: true },
      { sku: 'KOP-002', name: 'Caramel Macchiato', cat: 'Kopi', price: 32000, station: 'BAR_PRINTER', fav: true },
      { sku: 'KOP-003', name: 'Cappuccino Hot', cat: 'Kopi', price: 28000, station: 'BAR_PRINTER', fav: true },
      { sku: 'KOP-004', name: 'Americano Klasik', cat: 'Kopi', price: 22000, station: 'BAR_PRINTER', fav: false },
      { sku: 'KOP-005', name: 'Cold Brew Single Origin', cat: 'Kopi', price: 30000, station: 'BAR_PRINTER', fav: false },
      // Non-Kopi
      { sku: 'NON-001', name: 'Artisan Uji Matcha Latte', cat: 'Non-Kopi', price: 32000, station: 'BAR_PRINTER', fav: true },
      { sku: 'NON-002', name: 'Belgian Chocolate Signature', cat: 'Non-Kopi', price: 30000, station: 'BAR_PRINTER', fav: true },
      { sku: 'NON-003', name: 'Earl Grey Milk Tea', cat: 'Non-Kopi', price: 26000, station: 'BAR_PRINTER', fav: false },
      // Makanan
      { sku: 'MAK-001', name: 'Truffle Beef Burger & Fries', cat: 'Makanan', price: 58000, station: 'KITCHEN_PRINTER', fav: true },
      { sku: 'MAK-002', name: 'Nasi Ayam Sambal Matah', cat: 'Makanan', price: 38000, station: 'KITCHEN_PRINTER', fav: true },
      { sku: 'MAK-003', name: 'Spaghetti Aglio Olio Smoked Beef', cat: 'Makanan', price: 42000, station: 'KITCHEN_PRINTER', fav: false },
      // Camilan
      { sku: 'CAM-001', name: 'Crispy French Fries Truffle', cat: 'Camilan', price: 26000, station: 'KITCHEN_PRINTER', fav: true },
      { sku: 'CAM-002', name: 'Warm Butter Croissant', cat: 'Camilan', price: 25000, station: 'KITCHEN_PRINTER', fav: false },
      { sku: 'CAM-003', name: 'Crispy Chicken Popcorn', cat: 'Camilan', price: 32000, station: 'KITCHEN_PRINTER', fav: true },
      // Add-on
      { sku: 'ADD-001', name: 'Extra Shot Espresso', cat: 'Add-on', price: 6000, station: 'BAR_PRINTER', fav: false },
      { sku: 'ADD-002', name: 'Extra Cheddar Cheese', cat: 'Add-on', price: 5000, station: 'KITCHEN_PRINTER', fav: false },
    ];

    const prodMap: Record<string, { id: string, name: string, price: number, cat: string, station: string }> = {};
    for (const p of products) {
      const pr = await client.query(`
        INSERT INTO products (sku, name, category, price, print_target, is_favorite, is_active)
        VALUES ($1, $2, $3, $4, $5::target_station_printer, $6, TRUE)
        RETURNING id;
      `, [p.sku, p.name, p.cat, p.price, p.station, p.fav]);
      prodMap[p.sku] = { id: pr.rows[0].id, name: p.name, price: p.price, cat: p.cat, station: p.station };
    }

    // 8. PRODUCT RECIPES (COGS / HPP CALCULATION)
    console.log('[Seed] Seeding product recipes...');
    const recipes = [
      // Es Kopi Susu Aren (KOP-001)
      { sku: 'KOP-001', ing: 'ING-01', qty: 18, pack: false }, // 18g Kopi
      { sku: 'KOP-001', ing: 'ING-03', qty: 120, pack: false }, // 120ml Susu Segar
      { sku: 'KOP-001', ing: 'ING-05', qty: 25, pack: false },  // 25ml Gula Aren
      { sku: 'KOP-001', ing: 'ING-10', qty: 120, pack: false }, // 120g Es
      { sku: 'KOP-001', ing: 'ING-11', qty: 1, pack: true },    // Cup Plastik (Takeaway only)
      { sku: 'KOP-001', ing: 'ING-13', qty: 1, pack: true },    // Sedotan

      // Caramel Macchiato (KOP-002)
      { sku: 'KOP-002', ing: 'ING-01', qty: 18, pack: false },
      { sku: 'KOP-002', ing: 'ING-03', qty: 140, pack: false },
      { sku: 'KOP-002', ing: 'ING-08', qty: 20, pack: false },  // 20ml Sirup Karamel
      { sku: 'KOP-002', ing: 'ING-10', qty: 100, pack: false },
      { sku: 'KOP-002', ing: 'ING-11', qty: 1, pack: true },

      // Cappuccino Hot (KOP-003)
      { sku: 'KOP-003', ing: 'ING-01', qty: 18, pack: false },
      { sku: 'KOP-003', ing: 'ING-03', qty: 150, pack: false },
      { sku: 'KOP-003', ing: 'ING-12', qty: 1, pack: true },    // Paper Cup Hot

      // Americano Klasik (KOP-004)
      { sku: 'KOP-004', ing: 'ING-01', qty: 18, pack: false },
      { sku: 'KOP-004', ing: 'ING-10', qty: 120, pack: false },
      { sku: 'KOP-004', ing: 'ING-11', qty: 1, pack: true },

      // Artisan Uji Matcha Latte (NON-001)
      { sku: 'NON-001', ing: 'ING-06', qty: 15, pack: false },  // 15g Matcha
      { sku: 'NON-001', ing: 'ING-03', qty: 150, pack: false }, // 150ml Susu
      { sku: 'NON-001', ing: 'ING-05', qty: 15, pack: false },  // 15ml Aren
      { sku: 'NON-001', ing: 'ING-10', qty: 100, pack: false },
      { sku: 'NON-001', ing: 'ING-11', qty: 1, pack: true },

      // Belgian Chocolate Signature (NON-002)
      { sku: 'NON-002', ing: 'ING-07', qty: 25, pack: false },  // 25g Cokelat
      { sku: 'NON-002', ing: 'ING-03', qty: 150, pack: false },
      { sku: 'NON-002', ing: 'ING-05', qty: 15, pack: false },
      { sku: 'NON-002', ing: 'ING-10', qty: 100, pack: false },
      { sku: 'NON-002', ing: 'ING-11', qty: 1, pack: true },

      // Truffle Beef Burger & Fries (MAK-001)
      { sku: 'MAK-001', ing: 'ING-14', qty: 1, pack: false },   // 1 Patty
      { sku: 'MAK-001', ing: 'ING-15', qty: 1, pack: false },   // 1 Brioche Bun
      { sku: 'MAK-001', ing: 'ING-16', qty: 1, pack: false },   // 1 Cheddar
      { sku: 'MAK-001', ing: 'ING-21', qty: 25, pack: false },  // 25g Truffle Mayo
      { sku: 'MAK-001', ing: 'ING-17', qty: 100, pack: false }, // 100g Kentang

      // Nasi Ayam Sambal Matah (MAK-002)
      { sku: 'MAK-002', ing: 'ING-19', qty: 150, pack: false }, // 150g Ayam Fillet
      { sku: 'MAK-002', ing: 'ING-20', qty: 120, pack: false }, // 120g Beras

      // Crispy French Fries Truffle (CAM-001)
      { sku: 'CAM-001', ing: 'ING-17', qty: 180, pack: false }, // 180g Kentang
      { sku: 'CAM-001', ing: 'ING-21', qty: 20, pack: false },  // 20g Truffle Mayo

      // Warm Butter Croissant (CAM-002)
      { sku: 'CAM-002', ing: 'ING-18', qty: 1, pack: false },   // 1 Croissant
    ];

    for (const r of recipes) {
      const pid = prodMap[r.sku]?.id;
      const iid = ingMap[r.ing];
      if (pid && iid) {
        await client.query(`
          INSERT INTO product_recipes (product_id, ingredient_id, quantity, is_packaging_only)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (product_id, ingredient_id) DO NOTHING;
        `, [pid, iid, r.qty, r.pack]);
      }
    }

    // 9. MODIFIERS (CUSTOMIZATIONS)
    console.log('[Seed] Seeding modifier options...');
    const kopsusId = prodMap['KOP-001'].id;
    const matchaId = prodMap['NON-001'].id;
    const milkId = ingMap['ING-03'];
    const oatId = ingMap['ING-04'];
    const coffeeId = ingMap['ING-01'];
    const palmId = ingMap['ING-05'];

    await client.query(`
      INSERT INTO modifier_options (product_id, option_name, price_adjustment, action_type, target_ingredient_id, substitute_ingredient_id, quantity_delta)
      VALUES 
        ($1, 'Ganti Susu Oat (Oat Milk)', 8000, 'REPLACE', $2, $3, 120),
        ($1, 'Extra Shot Espresso', 6000, 'ADD', NULL, $4, 18),
        ($1, 'Less Sugar (50%)', 0, 'REMOVE', $5, NULL, 12.5),
        ($1, 'No Sugar (0%)', 0, 'REMOVE', $5, NULL, 25),
        ($6, 'Ganti Susu Oat (Oat Milk)', 8000, 'REPLACE', $2, $3, 150),
        ($6, 'Less Sugar (50%)', 0, 'REMOVE', $5, NULL, 7.5);
    `, [kopsusId, milkId, oatId, coffeeId, palmId, matchaId]);

    // 10. PROMOTIONS & VOUCHERS
    console.log('[Seed] Seeding promotions...');
    await client.query(`
      INSERT INTO promos (code, name, discount_type, discount_value, min_spend, max_discount, quota, used_count, start_date, end_date, is_active)
      VALUES 
        ('TEMUKOPI', 'Promo Temu Kopi 20%', 'PERCENT', 20, 40000, 15000, 500, 42, CURRENT_DATE - INTERVAL '15 days', CURRENT_DATE + INTERVAL '30 days', TRUE),
        ('DISKON10', 'Diskon Hemat 10%', 'PERCENT', 10, 50000, 25000, 200, 18, CURRENT_DATE - INTERVAL '7 days', CURRENT_DATE + INTERVAL '20 days', TRUE),
        ('POTONGAN15K', 'Voucher Potongan Rp 15.000', 'FIXED_AMOUNT', 15000, 75000, NULL, 100, 8, CURRENT_DATE - INTERVAL '5 days', CURRENT_DATE + INTERVAL '25 days', TRUE),
        ('PAYDAY25', 'Payday Special 25%', 'PERCENT', 25, 100000, 35000, 150, 12, CURRENT_DATE - INTERVAL '2 days', CURRENT_DATE + INTERVAL '10 days', TRUE);
    `);

    const promoRows = await client.query(`SELECT id, code FROM promos`);
    const promoMap: Record<string, string> = {};
    promoRows.rows.forEach(r => { promoMap[r.code] = r.id; });

    // 11. PURCHASING (PO RECEIVED & PO ORDERED)
    console.log('[Seed] Seeding purchase orders...');
    const ownerId = userMap['owner'];
    const supKopiId = supplierMap['CV Berkah Kopi Nusantara'];
    const supDairyId = supplierMap['PT Sumber Dairy Sejahtera'];

    // PO 1: RECEIVED (5 kg Biji Kopi House Blend)
    const po1 = await client.query(`
      INSERT INTO purchase_orders (po_number, supplier_id, status, total_amount, payment_status, notes, ordered_by_user_id, received_at, created_at)
      VALUES ('PO-202611-001', $1, 'RECEIVED', 1400000, 'PAID', 'Stok Biji Kopi Mingguan', $2, NOW() - INTERVAL '3 days', NOW() - INTERVAL '4 days')
      RETURNING id;
    `, [supKopiId, ownerId]);

    await client.query(`
      INSERT INTO purchase_order_items (purchase_order_id, ingredient_id, quantity, unit_cost, subtotal, unit_type, conversion_rate)
      VALUES ($1, $2, 5, 280000, 1400000, 'PURCHASE_UNIT', 1000);
    `, [po1.rows[0].id, ingMap['ING-01']]);

    // PO 2: ORDERED (Menunggu Penerimaan Barang - Siap didemokan di menu Pengadaan!)
    const po2 = await client.query(`
      INSERT INTO purchase_orders (po_number, supplier_id, status, total_amount, payment_status, notes, ordered_by_user_id, created_at)
      VALUES ('PO-202611-002', $1, 'ORDERED', 660000, 'UNPAID', 'Pasokan Susu Segar Pasteurisasi 30 Liter', $2, NOW() - INTERVAL '1 day')
      RETURNING id;
    `, [supDairyId, ownerId]);

    await client.query(`
      INSERT INTO purchase_order_items (purchase_order_id, ingredient_id, quantity, unit_cost, subtotal, unit_type, conversion_rate)
      VALUES ($1, $2, 30, 22000, 660000, 'PURCHASE_UNIT', 1000);
    `, [po2.rows[0].id, ingMap['ING-03']]);

    // 12. RESERVATIONS
    console.log('[Seed] Seeding reservations...');
    // Reservasi Hari ini di Meja M04 (DP Rp 50.000)
    await client.query(`
      INSERT INTO reservations (customer_name, phone_number, table_id, reservation_time, guest_count, down_payment_amount, is_dp_claimed, status)
      VALUES ('Andi Pratama', '081234567890', $1, CURRENT_DATE + TIME '19:00:00', 4, 50000, FALSE, 'CONFIRMED');
    `, [tableMap['M04']]);

    // Reservasi Besok di Meja VIP-01 (DP Rp 200.000)
    await client.query(`
      INSERT INTO reservations (customer_name, phone_number, table_id, reservation_time, guest_count, down_payment_amount, is_dp_claimed, status)
      VALUES ('Jessica Wijaya', '081987654321', $1, CURRENT_DATE + INTERVAL '1 day' + TIME '18:30:00', 8, 200000, FALSE, 'CONFIRMED');
    `, [tableMap['VIP-01']]);

    // 13. CASHIER SHIFTS (PAST CLOSED SHIFTS & 1 CURRENTLY ACTIVE OPEN SHIFT)
    console.log('[Seed] Seeding cashier shifts...');
    const cashierId = userMap['kasir'];
    const dimasId = userMap['dimas'];

    // Sif Kemarin (CLOSED)
    await client.query(`
      INSERT INTO cashier_shifts (cashier_id, opened_at, closed_at, opening_cash, system_expected_cash, blind_counted_cash, cash_difference, closing_notes, approved_by_manager_id, status)
      VALUES ($1, NOW() - INTERVAL '1 day' - INTERVAL '10 hours', NOW() - INTERVAL '1 day', 200000, 1850000, 1850000, 0, 'Sif lancar dan rekonsiliasi kas sesuai.', $2, 'CLOSED');
    `, [dimasId, ownerId]);

    // Sif Aktif Kasir Hari Ini (OPEN)
    const activeShiftRes = await client.query(`
      INSERT INTO cashier_shifts (cashier_id, opened_at, opening_cash, status)
      VALUES ($1, CURRENT_DATE + TIME '08:00:00', 200000, 'OPEN')
      RETURNING id;
    `, [cashierId]);
    const activeShiftId = activeShiftRes.rows[0].id;

    // Sif Aktif Owner Hari Ini (OPEN agar demo dari akun owner juga langsung siap di POS)
    await client.query(`
      INSERT INTO cashier_shifts (cashier_id, opened_at, opening_cash, status)
      VALUES ($1, CURRENT_DATE + TIME '08:00:00', 200000, 'OPEN');
    `, [ownerId]);

    // 14. CASH MOVEMENTS (PETTY CASH)
    console.log('[Seed] Seeding cash movements...');
    await client.query(`
      INSERT INTO cash_movements (shift_id, type, category, description, amount, created_at)
      VALUES 
        ($1, 'CASH_IN', 'MODAL_AWAL', 'Modal kas awal kasir', 200000, CURRENT_DATE + TIME '08:00:00'),
        ($1, 'CASH_OUT', 'OPERASIONAL', 'Beli galon air mineral & es kristal darurat', 45000, CURRENT_DATE + TIME '10:30:00');
    `, [activeShiftId]);

    // 15. EMPLOYEE ATTENDANCE
    console.log('[Seed] Seeding employee attendances...');
    await client.query(`
      INSERT INTO employee_attendances (user_id, work_date, clock_in, status, notes)
      VALUES 
        ($1, CURRENT_DATE, CURRENT_DATE + TIME '07:50:00', 'PRESENT', 'Masuk tepat waktu'),
        ($2, CURRENT_DATE, CURRENT_DATE + TIME '07:55:00', 'PRESENT', 'Buka operasional kasir');
    `, [ownerId, cashierId]);

    // 16. HISTORICAL TRANSACTIONS & LIVE ORDERS
    console.log('[Seed] Seeding historical & live orders for dashboard analytics...');

    // Function to calculate COGS for an item
    const getHpp = (sku: string) => {
      switch (sku) {
        case 'KOP-001': return 8200; // Es Kopi Susu
        case 'KOP-002': return 11400; // Caramel Macchiato
        case 'KOP-003': return 8800; // Cappuccino
        case 'KOP-004': return 5800; // Americano
        case 'KOP-005': return 9500; // Cold brew
        case 'NON-001': return 11200; // Matcha
        case 'NON-002': return 12000; // Chocolate
        case 'NON-003': return 7800; // Earl grey
        case 'MAK-001': return 28500; // Truffle burger
        case 'MAK-002': return 15500; // Nasi ayam
        case 'MAK-003': return 16000; // Spaghetti
        case 'CAM-001': return 10200; // Fries truffle
        case 'CAM-002': return 12500; // Croissant
        case 'CAM-003': return 13500; // Popcorn chicken
        default: return 5000;
      }
    };

    // Helper to insert a full order with items and payment
    let orderCounter = 1001;
    const insertDemoOrder = async (opts: {
      orderNum: string;
      createdAt: Date;
      status: 'PAID' | 'PENDING_PAYMENT_AT_CASHIER' | 'CANCELLED';
      orderType: 'DINE_IN' | 'TAKEAWAY';
      tableNum?: string;
      customerPhone?: string;
      promoCode?: string;
      paymentMethod: 'CASH' | 'QRIS' | 'DEBIT_CARD' | 'BANK_TRANSFER';
      items: Array<{ sku: string; qty: number; notes?: string; mod?: any }>;
    }) => {
      let subtotal = 0;
      let totalHpp = 0;

      opts.items.forEach(it => {
        const p = prodMap[it.sku];
        if (p) {
          subtotal += p.price * it.qty;
          totalHpp += getHpp(it.sku) * it.qty;
        }
      });

      let discount = 0;
      let promoId: string | null = null;
      if (opts.promoCode && promoMap[opts.promoCode]) {
        promoId = promoMap[opts.promoCode];
        if (opts.promoCode === 'TEMUKOPI') discount = Math.min(15000, Math.round(subtotal * 0.20));
        else if (opts.promoCode === 'DISKON10') discount = Math.min(25000, Math.round(subtotal * 0.10));
        else if (opts.promoCode === 'POTONGAN15K') discount = 15000;
        else if (opts.promoCode === 'PAYDAY25') discount = Math.min(35000, Math.round(subtotal * 0.25));
      }

      const taxable = Math.max(0, subtotal - discount);
      const serviceRate = 5;
      const serviceAmount = Math.round(taxable * 0.05);
      const taxRate = 10;
      const taxAmount = Math.round((taxable + serviceAmount) * 0.10);
      const rawTotal = taxable + serviceAmount + taxAmount;
      const roundedTotal = Math.round(rawTotal / 100) * 100;
      const roundingAmount = roundedTotal - rawTotal;

      const orderRes = await client.query(`
        INSERT INTO orders (
          order_number, shift_id, cashier_id, table_id, customer_id, 
          order_type, subtotal, discount_amount, total_amount, total_hpp, 
          status, notes, created_at, updated_at, paid_at, promo_id, 
          tax_rate, tax_amount, service_charge_rate, service_charge_amount, rounding_amount
        ) VALUES (
          $1, $2, $3, $4, $5, 
          $6::order_type, $7, $8, $9, $10, 
          $11::order_status, $12, $13, $13, $14, $15, 
          $16, $17, $18, $19, $20
        ) RETURNING id;
      `, [
        opts.orderNum,
        activeShiftId,
        cashierId,
        opts.tableNum ? tableMap[opts.tableNum] : null,
        opts.customerPhone ? customerMap[opts.customerPhone] : null,
        opts.orderType,
        subtotal,
        discount,
        roundedTotal,
        totalHpp,
        opts.status,
        opts.status === 'PENDING_PAYMENT_AT_CASHIER' ? 'Dine-in ongoing customer' : null,
        opts.createdAt,
        opts.status === 'PAID' ? opts.createdAt : null,
        promoId,
        taxRate,
        taxAmount,
        serviceRate,
        serviceAmount,
        roundingAmount,
      ]);

      const orderId = orderRes.rows[0].id;

      // Insert Items
      for (const it of opts.items) {
        const p = prodMap[it.sku];
        if (p) {
          const itemHpp = getHpp(it.sku);
          await client.query(`
            INSERT INTO order_items (
              order_id, product_id, product_name_snapshot, quantity, 
              unit_price_snapshot, unit_hpp_snapshot, subtotal, print_target, 
              item_notes, selected_modifiers
            ) VALUES (
              $1, $2, $3, $4, 
              $5, $6, $7, $8::target_station_printer, 
              $9, $10
            );
          `, [
            orderId,
            p.id,
            p.name,
            it.qty,
            p.price,
            itemHpp,
            p.price * it.qty,
            p.station,
            it.notes || null,
            it.mod ? JSON.stringify(it.mod) : null
          ]);
        }
      }

      // Insert Payment if PAID
      if (opts.status === 'PAID') {
        const cashRec = opts.paymentMethod === 'CASH' ? Math.ceil(roundedTotal / 50000) * 50000 : roundedTotal;
        const cashChange = opts.paymentMethod === 'CASH' ? cashRec - roundedTotal : 0;
        await client.query(`
          INSERT INTO order_payments (
            order_id, payment_method, amount_paid, cash_received, cash_change, reference_number, created_at
          ) VALUES (
            $1, $2::payment_method_enum, $3, $4, $5, $6, $7
          );
        `, [
          orderId,
          opts.paymentMethod,
          roundedTotal,
          cashRec,
          cashChange,
          opts.paymentMethod !== 'CASH' ? `REF-${Date.now().toString().slice(-6)}` : null,
          opts.createdAt
        ]);
      }
    };

    // GENERATE 65 REALISTIC ORDERS SPREAD OVER 30 DAYS, PEAKING AT LUNCH & DINNER
    const now = new Date();
    const daysAgo = (d: number, hour: number, min: number) => {
      const dt = new Date(now.getTime() - d * 24 * 60 * 60 * 1000);
      dt.setHours(hour, min, 0, 0);
      return dt;
    };

    const demoBatches = [
      // TODAY'S COMPLETED ORDERS (2026-11-27)
      { d: 0, h: 8, m: 15, type: 'TAKEAWAY', pay: 'CASH', cust: '081234567890', items: [{ sku: 'KOP-001', qty: 2 }] },
      { d: 0, h: 8, m: 45, type: 'DINE_IN', tbl: 'M01', pay: 'QRIS', cust: '081987654321', items: [{ sku: 'KOP-003', qty: 1 }, { sku: 'CAM-002', qty: 1 }] },
      { d: 0, h: 9, m: 30, type: 'TAKEAWAY', pay: 'QRIS', items: [{ sku: 'KOP-001', qty: 3, mod: [{ name: 'Ganti Susu Oat' }] }] },
      { d: 0, h: 11, m: 10, type: 'DINE_IN', tbl: 'M02', pay: 'DEBIT_CARD', items: [{ sku: 'MAK-002', qty: 2 }, { sku: 'NON-003', qty: 2 }] },
      { d: 0, h: 12, m: 15, type: 'DINE_IN', tbl: 'M05', pay: 'QRIS', promo: 'TEMUKOPI', cust: '081399887711', items: [{ sku: 'MAK-001', qty: 2 }, { sku: 'KOP-001', qty: 2 }, { sku: 'CAM-001', qty: 1 }] },
      { d: 0, h: 12, m: 40, type: 'DINE_IN', tbl: 'M06', pay: 'CASH', items: [{ sku: 'MAK-001', qty: 3 }, { sku: 'KOP-002', qty: 2 }, { sku: 'NON-001', qty: 1 }] },
      { d: 0, h: 13, m: 20, type: 'TAKEAWAY', pay: 'QRIS', promo: 'DISKON10', cust: '082155566778', items: [{ sku: 'NON-001', qty: 2 }, { sku: 'CAM-003', qty: 1 }] },
      { d: 0, h: 14, m: 5, type: 'DINE_IN', tbl: 'M07', pay: 'BANK_TRANSFER', items: [{ sku: 'KOP-004', qty: 2 }, { sku: 'CAM-001', qty: 1 }] },
      { d: 0, h: 15, m: 30, type: 'DINE_IN', tbl: 'M09', pay: 'QRIS', items: [{ sku: 'NON-002', qty: 2 }, { sku: 'CAM-002', qty: 2 }] },
      { d: 0, h: 17, m: 15, type: 'TAKEAWAY', pay: 'CASH', items: [{ sku: 'KOP-001', qty: 4 }] },
      { d: 0, h: 18, m: 30, type: 'DINE_IN', tbl: 'M10', pay: 'QRIS', promo: 'POTONGAN15K', cust: '081234567890', items: [{ sku: 'MAK-001', qty: 2 }, { sku: 'KOP-002', qty: 2 }] },
      { d: 0, h: 19, m: 10, type: 'DINE_IN', tbl: 'M12', pay: 'DEBIT_CARD', items: [{ sku: 'MAK-003', qty: 3 }, { sku: 'NON-001', qty: 3 }, { sku: 'CAM-001', qty: 2 }] },

      // YESTERDAY'S ORDERS (2026-11-26)
      { d: 1, h: 9, m: 10, type: 'TAKEAWAY', pay: 'CASH', items: [{ sku: 'KOP-001', qty: 2 }] },
      { d: 1, h: 10, m: 30, type: 'DINE_IN', tbl: 'M01', pay: 'QRIS', items: [{ sku: 'KOP-003', qty: 2 }] },
      { d: 1, h: 12, m: 20, type: 'DINE_IN', tbl: 'M03', pay: 'QRIS', promo: 'TEMUKOPI', items: [{ sku: 'MAK-001', qty: 2 }, { sku: 'CAM-001', qty: 1 }] },
      { d: 1, h: 13, m: 15, type: 'DINE_IN', tbl: 'M04', pay: 'DEBIT_CARD', items: [{ sku: 'MAK-002', qty: 2 }, { sku: 'KOP-001', qty: 2 }] },
      { d: 1, h: 16, m: 0, type: 'TAKEAWAY', pay: 'CASH', items: [{ sku: 'NON-001', qty: 1 }, { sku: 'NON-002', qty: 1 }] },
      { d: 1, h: 18, m: 45, type: 'DINE_IN', tbl: 'M11', pay: 'QRIS', promo: 'PAYDAY25', cust: '081987654321', items: [{ sku: 'MAK-001', qty: 3 }, { sku: 'KOP-002', qty: 3 }] },
      { d: 1, h: 20, m: 10, type: 'DINE_IN', tbl: 'M14', pay: 'CASH', items: [{ sku: 'KOP-001', qty: 3 }, { sku: 'CAM-003', qty: 2 }] },

      // 2 - 7 DAYS AGO
      { d: 2, h: 12, m: 30, type: 'DINE_IN', tbl: 'M05', pay: 'QRIS', items: [{ sku: 'MAK-001', qty: 2 }, { sku: 'KOP-001', qty: 2 }] },
      { d: 2, h: 19, m: 0, type: 'DINE_IN', tbl: 'M06', pay: 'DEBIT_CARD', items: [{ sku: 'MAK-002', qty: 3 }, { sku: 'CAM-001', qty: 2 }] },
      { d: 3, h: 11, m: 45, type: 'TAKEAWAY', pay: 'CASH', items: [{ sku: 'KOP-001', qty: 4 }] },
      { d: 3, h: 13, m: 0, type: 'DINE_IN', tbl: 'M02', pay: 'QRIS', items: [{ sku: 'NON-001', qty: 2 }, { sku: 'CAM-002', qty: 2 }] },
      { d: 3, h: 18, m: 30, type: 'DINE_IN', tbl: 'M10', pay: 'QRIS', promo: 'TEMUKOPI', items: [{ sku: 'MAK-001', qty: 2 }, { sku: 'KOP-002', qty: 2 }] },
      { d: 4, h: 12, m: 10, type: 'DINE_IN', tbl: 'M03', pay: 'CASH', items: [{ sku: 'MAK-002', qty: 2 }, { sku: 'KOP-001', qty: 2 }] },
      { d: 4, h: 19, m: 15, type: 'DINE_IN', tbl: 'M12', pay: 'DEBIT_CARD', items: [{ sku: 'MAK-001', qty: 4 }, { sku: 'CAM-001', qty: 2 }] },
      { d: 5, h: 10, m: 30, type: 'TAKEAWAY', pay: 'QRIS', items: [{ sku: 'KOP-003', qty: 3 }] },
      { d: 5, h: 13, m: 20, type: 'DINE_IN', tbl: 'M07', pay: 'CASH', items: [{ sku: 'MAK-003', qty: 2 }, { sku: 'NON-002', qty: 2 }] },
      { d: 5, h: 18, m: 40, type: 'DINE_IN', tbl: 'M08', pay: 'QRIS', items: [{ sku: 'KOP-001', qty: 2 }, { sku: 'CAM-003', qty: 1 }] },
      { d: 6, h: 12, m: 0, type: 'DINE_IN', tbl: 'M04', pay: 'QRIS', items: [{ sku: 'MAK-001', qty: 2 }, { sku: 'CAM-001', qty: 1 }] },
      { d: 6, h: 19, m: 30, type: 'DINE_IN', tbl: 'M11', pay: 'BANK_TRANSFER', items: [{ sku: 'MAK-002', qty: 3 }, { sku: 'KOP-002', qty: 3 }] },
      { d: 7, h: 13, m: 10, type: 'DINE_IN', tbl: 'M01', pay: 'CASH', items: [{ sku: 'KOP-001', qty: 2 }, { sku: 'CAM-002', qty: 1 }] },

      // 8 - 25 DAYS AGO (HISTORICAL VOLUME FOR REVENUE CHARTS & MATRIX)
      { d: 8, h: 12, m: 30, type: 'DINE_IN', tbl: 'M05', pay: 'QRIS', items: [{ sku: 'MAK-001', qty: 2 }, { sku: 'KOP-001', qty: 2 }] },
      { d: 9, h: 18, m: 45, type: 'DINE_IN', tbl: 'M06', pay: 'DEBIT_CARD', items: [{ sku: 'MAK-002', qty: 3 }, { sku: 'NON-001', qty: 3 }] },
      { d: 10, h: 13, m: 0, type: 'TAKEAWAY', pay: 'CASH', items: [{ sku: 'KOP-001', qty: 5 }] },
      { d: 11, h: 19, m: 10, type: 'DINE_IN', tbl: 'M10', pay: 'QRIS', items: [{ sku: 'MAK-001', qty: 3 }, { sku: 'CAM-001', qty: 2 }] },
      { d: 12, h: 12, m: 15, type: 'DINE_IN', tbl: 'M03', pay: 'CASH', items: [{ sku: 'MAK-003', qty: 2 }, { sku: 'KOP-002', qty: 2 }] },
      { d: 13, h: 18, m: 30, type: 'DINE_IN', tbl: 'M12', pay: 'QRIS', items: [{ sku: 'MAK-001', qty: 4 }, { sku: 'CAM-003', qty: 2 }] },
      { d: 14, h: 14, m: 20, type: 'TAKEAWAY', pay: 'QRIS', items: [{ sku: 'NON-001', qty: 2 }, { sku: 'NON-002', qty: 2 }] },
      { d: 15, h: 12, m: 30, type: 'DINE_IN', tbl: 'M02', pay: 'DEBIT_CARD', items: [{ sku: 'MAK-002', qty: 2 }, { sku: 'KOP-001', qty: 2 }] },
      { d: 16, h: 19, m: 0, type: 'DINE_IN', tbl: 'M07', pay: 'CASH', items: [{ sku: 'KOP-001', qty: 3 }, { sku: 'CAM-001', qty: 1 }] },
      { d: 17, h: 13, m: 45, type: 'DINE_IN', tbl: 'M09', pay: 'QRIS', items: [{ sku: 'MAK-001', qty: 2 }, { sku: 'KOP-003', qty: 2 }] },
      { d: 18, h: 18, m: 15, type: 'DINE_IN', tbl: 'M11', pay: 'QRIS', items: [{ sku: 'MAK-002', qty: 3 }, { sku: 'NON-003', qty: 3 }] },
      { d: 19, h: 12, m: 0, type: 'TAKEAWAY', pay: 'CASH', items: [{ sku: 'KOP-001', qty: 3 }] },
      { d: 20, h: 19, m: 30, type: 'DINE_IN', tbl: 'M14', pay: 'DEBIT_CARD', items: [{ sku: 'MAK-001', qty: 3 }, { sku: 'CAM-001', qty: 2 }] },
      { d: 21, h: 13, m: 10, type: 'DINE_IN', tbl: 'M01', pay: 'QRIS', items: [{ sku: 'KOP-002', qty: 2 }, { sku: 'CAM-002', qty: 2 }] },
      { d: 22, h: 18, m: 45, type: 'DINE_IN', tbl: 'M05', pay: 'CASH', items: [{ sku: 'MAK-003', qty: 2 }, { sku: 'KOP-001', qty: 2 }] },
      { d: 23, h: 12, m: 15, type: 'DINE_IN', tbl: 'M08', pay: 'QRIS', items: [{ sku: 'MAK-001', qty: 2 }, { sku: 'CAM-003', qty: 1 }] },
      { d: 24, h: 19, m: 0, type: 'DINE_IN', tbl: 'M10', pay: 'QRIS', items: [{ sku: 'NON-001', qty: 3 }, { sku: 'NON-002', qty: 2 }] },
      { d: 25, h: 14, m: 30, type: 'TAKEAWAY', pay: 'CASH', items: [{ sku: 'KOP-001', qty: 4 }] },
    ];

    for (const b of demoBatches) {
      orderCounter++;
      const orderNum = `ORD-202611-${orderCounter}`;
      const dt = daysAgo(b.d, b.h, b.m);
      await insertDemoOrder({
        orderNum,
        createdAt: dt,
        status: 'PAID',
        orderType: b.type as any,
        tableNum: b.tbl,
        customerPhone: b.cust,
        promoCode: b.promo,
        paymentMethod: b.pay as any,
        items: b.items,
      });
    }

    // LIVE ONGOING ORDER FOR DINE-IN TABLE M03 (To demo live active table checkout!)
    orderCounter++;
    await insertDemoOrder({
      orderNum: `ORD-202611-${orderCounter}`,
      createdAt: new Date(),
      status: 'PENDING_PAYMENT_AT_CASHIER',
      orderType: 'DINE_IN',
      tableNum: 'M03',
      customerPhone: '081234567890',
      paymentMethod: 'CASH',
      items: [
        { sku: 'MAK-001', qty: 2, notes: 'Medium rare beef' },
        { sku: 'KOP-001', qty: 2, notes: 'Less ice' },
        { sku: 'CAM-001', qty: 1 },
      ],
    });

    // 17. AUDIT LOGS
    console.log('[Seed] Seeding audit logs...');
    await client.query(`
      INSERT INTO audit_logs (user_id, action, target_table, target_id, details)
      VALUES 
        ($1, 'LOGIN', 'users', $2, '{"ip": "127.0.0.1", "device": "Chrome Desktop"}'),
        ($1, 'UPDATE_SETTINGS', 'store_settings', '1', '{"notes": "Updated tax and service charge rates"}'),
        ($3, 'OPEN_SHIFT', 'cashier_shifts', $4, '{"opening_cash": 200000}');
    `, [ownerId, ownerId, cashierId, activeShiftId]);

    await client.query('COMMIT');
    console.log('[Seed] ========================================================');
    console.log('[Seed] RUANG TEMU DEMO DATASET READY!');
    console.log('[Seed] - Store Settings: RUANG TEMU Coffee & Eatery (Senopati)');
    console.log('[Seed] - Users: owner (owner123, PIN 123456), kasir (kasir123)');
    console.log('[Seed] - Tables: 14 Regular (Indoor & Outdoor) + 2 VIP Rooms');
    console.log('[Seed]   * Meja M03: OCCUPIED (Pesanan aktif siap bayar di kasir)');
    console.log('[Seed]   * Meja M04: RESERVED (Reservasi hari ini dengan DP Rp 50.000)');
    console.log('[Seed] - Products: 16 Items across Kopi, Non-Kopi, Makanan, Camilan, Add-on');
    console.log('[Seed] - Recipes: Terhubung lengkap dengan HPP otomatis');
    console.log('[Seed] - Ingredients: 21 Bahan Baku dengan konversi kg/gram, liter/ml, pcs');
    console.log('[Seed]   * Saus Truffle Mayo: LOW STOCK (Indikator peringatan di Admin)');
    console.log('[Seed] - Shift: 1 Sif AKTIF untuk kasir (Modal Rp 200.000)');
    console.log('[Seed] - Orders: 50+ Transaksi historis (Grafik Penjualan, Jam Sibuk & Matriks Menu aktif!)');
    console.log('[Seed] ========================================================');
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('[Seed] Seeding failed:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  runSeed()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
