import { pool } from '../config/database';

/**
 * Ensures `product_variants` table and `variant_id` columns on `product_recipes`
 * and `order_items` exist cleanly, migrating legacy unique constraints to
 * variant-aware partial unique indexes.
 */
export async function ensureVariantSchema(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS product_variants (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        name VARCHAR(60) NOT NULL,
        price NUMERIC(12, 2) NOT NULL CHECK (price >= 0),
        sort_order INT NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_product_variants_product
      ON product_variants(product_id, is_active, sort_order);
    `);

    // Add variant_id to product_recipes
    await client.query(`
      ALTER TABLE product_recipes
      ADD COLUMN IF NOT EXISTS variant_id UUID NULL REFERENCES product_variants(id) ON DELETE CASCADE;
    `);

    // Drop legacy unique constraint on (product_id, ingredient_id) so different variants can share ingredients
    await client.query(`
      DO $$
      DECLARE
        c_name text;
      BEGIN
        SELECT con.conname INTO c_name
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        WHERE rel.relname = 'product_recipes'
          AND con.contype = 'u'
          AND pg_get_constraintdef(con.oid) LIKE '%product_id%'
          AND pg_get_constraintdef(con.oid) LIKE '%ingredient_id%'
          AND pg_get_constraintdef(con.oid) NOT LIKE '%variant_id%'
        LIMIT 1;

        IF c_name IS NOT NULL THEN
          EXECUTE format('ALTER TABLE product_recipes DROP CONSTRAINT %I', c_name);
        END IF;
      END $$;
    `);

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_product_recipes_base_unique
      ON product_recipes (product_id, ingredient_id)
      WHERE variant_id IS NULL;
    `);

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_product_recipes_variant_unique
      ON product_recipes (product_id, variant_id, ingredient_id)
      WHERE variant_id IS NOT NULL;
    `);

    // Add variant snapshot columns to order_items
    await client.query(`
      ALTER TABLE order_items
      ADD COLUMN IF NOT EXISTS variant_id UUID NULL REFERENCES product_variants(id) ON DELETE SET NULL;
    `);

    await client.query(`
      ALTER TABLE order_items
      ADD COLUMN IF NOT EXISTS variant_name_snapshot VARCHAR(60) NULL;
    `);

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
