import { pool } from '../config/database';

export const DEFAULT_PRODUCT_CATEGORIES: Array<{
  name: string;
  default_print_target: 'BAR_PRINTER' | 'KITCHEN_PRINTER' | 'NONE';
  sort_order: number;
}> = [
  { name: 'Kopi', default_print_target: 'BAR_PRINTER', sort_order: 1 },
  { name: 'Non-Kopi', default_print_target: 'BAR_PRINTER', sort_order: 2 },
  { name: 'Makanan', default_print_target: 'KITCHEN_PRINTER', sort_order: 3 },
  { name: 'Camilan', default_print_target: 'KITCHEN_PRINTER', sort_order: 4 },
  { name: 'Add-on', default_print_target: 'BAR_PRINTER', sort_order: 5 },
];

/**
 * Ensures `product_categories` table exists and migrates legacy `products.category`
 * enum column to `VARCHAR(50)` so owner-created categories persist cleanly.
 */
export async function ensureCategorySchema(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS product_categories (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(50) UNIQUE NOT NULL,
        default_print_target target_station_printer NOT NULL DEFAULT 'BAR_PRINTER',
        sort_order INT NOT NULL DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      DO $$ BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'products'
            AND column_name = 'category'
            AND data_type = 'USER-DEFINED'
        ) THEN
          ALTER TABLE products
            ALTER COLUMN category TYPE VARCHAR(50) USING category::text;
        END IF;
      END $$;
    `);

    await client.query(`DROP TYPE IF EXISTS product_category;`);

    for (const cat of DEFAULT_PRODUCT_CATEGORIES) {
      await client.query(
        `INSERT INTO product_categories (name, default_print_target, sort_order)
         VALUES ($1, $2::target_station_printer, $3)
         ON CONFLICT (name) DO NOTHING`,
        [cat.name, cat.default_print_target, cat.sort_order]
      );
    }

    await client.query(`
      INSERT INTO product_categories (name, default_print_target, sort_order)
      SELECT DISTINCT TRIM(p.category),
        CASE WHEN p.print_target = 'KITCHEN_PRINTER' THEN 'KITCHEN_PRINTER'::target_station_printer ELSE 'BAR_PRINTER'::target_station_printer END,
        100
      FROM products p
      WHERE TRIM(p.category) <> ''
      ON CONFLICT (name) DO NOTHING;
    `);

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
