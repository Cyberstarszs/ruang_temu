import bcrypt from 'bcryptjs';
import { pool } from '../config/database';

export async function runSeed() {
  console.log('[Seed] Seeding initial data for RUANG TEMU...');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. SEED USERS (2 ROLES ONLY: OWNER & CASHIER)
    const salt = await bcrypt.genSalt(10);
    const ownerPass = await bcrypt.hash('owner123', salt);
    const cashierPass = await bcrypt.hash('kasir123', salt);

    await client.query(`
      INSERT INTO users (name, username, password_hash, role, pin_code)
      VALUES 
        ('Budi Santoso', 'owner', $1, 'OWNER', '123456'),
        ('Rina Kasir', 'kasir', $2, 'CASHIER', NULL)
      ON CONFLICT (username) DO NOTHING;
    `, [ownerPass, cashierPass]);

    // 2. SEED DINING TABLES
    const tables = [
      { num: 'M01', area: 'Indoor', cap: 2 },
      { num: 'M02', area: 'Indoor', cap: 2 },
      { num: 'M03', area: 'Indoor', cap: 4 },
      { num: 'M04', area: 'Indoor', cap: 4 },
      { num: 'M05', area: 'Indoor', cap: 4 },
      { num: 'M06', area: 'Indoor', cap: 6 },
      { num: 'M07', area: 'Indoor', cap: 4 },
      { num: 'M08', area: 'Indoor', cap: 2 },
      { num: 'M09', area: 'Outdoor', cap: 2 },
      { num: 'M10', area: 'Outdoor', cap: 4 },
      { num: 'M11', area: 'Outdoor', cap: 4 },
      { num: 'M12', area: 'Outdoor', cap: 6 },
      { num: 'M13', area: 'Outdoor', cap: 2 },
      { num: 'M14', area: 'Outdoor', cap: 4 },
    ];

    for (const t of tables) {
      await client.query(`
        INSERT INTO dining_tables (table_number, area, capacity, status)
        VALUES ($1, $2, $3, 'AVAILABLE')
        ON CONFLICT (table_number) DO NOTHING;
      `, [t.num, t.area, t.cap]);
    }

    // 3. SEED INGREDIENTS
    const ingredients = [
      { code: 'ING-01', name: 'Biji Kopi House Blend', unit: 'gram', pUnit: 'kg', conv: 1000, stock: 50000, safe: 3000, cost: 280 },
      { code: 'ING-02', name: 'Susu UHT Fresh', unit: 'ml', pUnit: 'liter', conv: 1000, stock: 40000, safe: 5000, cost: 20 },
      { code: 'ING-03', name: 'Gula Aren Cair', unit: 'ml', pUnit: 'liter', conv: 1000, stock: 15000, safe: 2000, cost: 35 },
      { code: 'ING-04', name: 'Es Batu Kristal', unit: 'gram', pUnit: 'kg', conv: 1000, stock: 20000, safe: 5000, cost: 5 },
      { code: 'ING-05', name: 'Cup Plastik 16oz + Lid', unit: 'pcs', pUnit: 'dus', conv: 1, stock: 500, safe: 100, cost: 800 },
      { code: 'ING-06', name: 'Bubuk Pure Matcha', unit: 'gram', pUnit: 'kg', conv: 1000, stock: 3000, safe: 500, cost: 450 },
      { code: 'ING-07', name: 'Susu Oat Barista', unit: 'ml', pUnit: 'liter', conv: 1000, stock: 10000, safe: 2000, cost: 45 },
      { code: 'ING-08', name: 'Daging Ayam Fillet', unit: 'gram', pUnit: 'kg', conv: 1000, stock: 15000, safe: 3000, cost: 55 },
      { code: 'ING-09', name: 'Beras Pandan Wangi', unit: 'gram', pUnit: 'kg', conv: 1000, stock: 30000, safe: 5000, cost: 18 },
      { code: 'ING-10', name: 'Kentang Potong Beku', unit: 'gram', pUnit: 'kg', conv: 1000, stock: 12000, safe: 2000, cost: 42 },
      { code: 'ING-11', name: 'Croissant Mentah Beku', unit: 'pcs', pUnit: 'pak', conv: 1, stock: 60, safe: 15, cost: 12000 },
    ];

    for (const ing of ingredients) {
      await client.query(`
        INSERT INTO ingredients (code, name, usage_unit, purchase_unit, conversion_rate, stock_actual, safe_stock, unit_cost)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (code) DO NOTHING;
      `, [ing.code, ing.name, ing.unit, ing.pUnit, ing.conv, ing.stock, ing.safe, ing.cost]);
    }

    // 4. SEED PRODUCTS
    const products = [
      { sku: 'KOP-001', name: 'Es Kopi Susu Aren', cat: 'Kopi', price: 24000, station: 'BAR_PRINTER', fav: true },
      { sku: 'KOP-002', name: 'Cappuccino Hot/Ice', cat: 'Kopi', price: 27000, station: 'BAR_PRINTER', fav: true },
      { sku: 'KOP-003', name: 'Americano Klasik', cat: 'Kopi', price: 22000, station: 'BAR_PRINTER', fav: false },
      { sku: 'NON-001', name: 'Matcha Latte Premium', cat: 'Non-Kopi', price: 28000, station: 'BAR_PRINTER', fav: true },
      { sku: 'MAK-001', name: 'Nasi Ayam Sambal Matah', cat: 'Makanan', price: 35000, station: 'KITCHEN_PRINTER', fav: true },
      { sku: 'CAM-001', name: 'French Fries Crispy', cat: 'Camilan', price: 22000, station: 'KITCHEN_PRINTER', fav: true },
      { sku: 'CAM-002', name: 'Butter Croissant Warm', cat: 'Camilan', price: 25000, station: 'KITCHEN_PRINTER', fav: false },
    ];

    for (const p of products) {
      await client.query(`
        INSERT INTO products (sku, name, category, price, print_target, is_favorite)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (sku) DO NOTHING;
      `, [p.sku, p.name, p.cat, p.price, p.station, p.fav]);
    }

    // 5. ATTACH RECIPES FOR ES KOPI SUSU AREN
    const kopsusRes = await client.query(`SELECT id FROM products WHERE sku = 'KOP-001'`);
    if (kopsusRes.rows.length > 0) {
      const pid = kopsusRes.rows[0].id;
      const getIngId = async (code: string) => {
        const r = await client.query(`SELECT id FROM ingredients WHERE code = $1`, [code]);
        return r.rows[0]?.id;
      };

      const coffeeId = await getIngId('ING-01');
      const milkId = await getIngId('ING-02');
      const palmId = await getIngId('ING-03');
      const iceId = await getIngId('ING-04');
      const cupId = await getIngId('ING-05');

      if (coffeeId && milkId && palmId && iceId && cupId) {
        await client.query(`
          INSERT INTO product_recipes (product_id, ingredient_id, quantity, is_packaging_only)
          VALUES 
            ($1, $2, 18, FALSE),   -- 18g Biji Kopi
            ($1, $3, 150, FALSE),  -- 150ml Susu
            ($1, $4, 25, FALSE),   -- 25ml Gula Aren
            ($1, $5, 120, FALSE),  -- 120g Es Batu
            ($1, $6, 1, TRUE)      -- 1 pcs Cup Plastik (HANYA DEDUKSI JIKA TAKEAWAY!)
          ON CONFLICT (product_id, ingredient_id) DO NOTHING;
        `, [pid, coffeeId, milkId, palmId, iceId, cupId]);

        // 6. ADD MODIFIERS
        const oatId = await getIngId('ING-07');
        await client.query(`
          INSERT INTO modifier_options (product_id, option_name, price_adjustment, action_type, target_ingredient_id, substitute_ingredient_id, quantity_delta)
          VALUES 
            ($1, 'Ganti Susu Oat (Oat Milk)', 8000, 'REPLACE', $2, $3, 150),
            ($1, 'Extra Shot Espresso', 6000, 'ADD', NULL, $4, 18),
            ($1, 'Less Sugar (50%)', 0, 'REMOVE', $5, NULL, 12.5),
            ($1, 'No Sugar', 0, 'REMOVE', $5, NULL, 25)
          ON CONFLICT DO NOTHING;
        `, [pid, milkId, oatId, coffeeId, palmId]);
      }
    }

    // 7. SEED PROMOS
    await client.query(`
      INSERT INTO promos (code, name, discount_type, discount_value, min_spend, max_discount, start_date, end_date, is_active)
      VALUES 
        ('TEMUKOPI', 'Promo Temu Kopi 20%', 'PERCENT', 20, 50000, 20000, CURRENT_DATE - INTERVAL '1 day', CURRENT_DATE + INTERVAL '30 days', TRUE)
      ON CONFLICT (code) DO NOTHING;
    `);

    await client.query('COMMIT');
    console.log('[Seed] Database successfully seeded with RUANG TEMU master data!');
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
