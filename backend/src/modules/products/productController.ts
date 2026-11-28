import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { pool } from '../../config/database';

export async function getCategories(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await pool.query(`
      SELECT id, name, default_print_target, sort_order, created_at
      FROM product_categories
      ORDER BY sort_order ASC, name ASC
    `);

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (err) {
    next(err);
  }
}

export async function createCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const rawName = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    const rawTarget = req.body?.default_print_target;
    const printTarget: 'BAR_PRINTER' | 'KITCHEN_PRINTER' | 'NONE' =
      rawTarget === 'KITCHEN_PRINTER' || rawTarget === 'NONE' ? rawTarget : 'BAR_PRINTER';

    if (!rawName) {
      res.status(400).json({ success: false, message: 'Nama kategori wajib diisi.' });
      return;
    }

    if (rawName.length > 50) {
      res.status(400).json({ success: false, message: 'Nama kategori maksimal 50 karakter.' });
      return;
    }

    const existing = await pool.query(
      `SELECT id, name, default_print_target, sort_order FROM product_categories WHERE LOWER(name) = LOWER($1) LIMIT 1`,
      [rawName]
    );
    if (existing.rows.length > 0) {
      res.status(409).json({
        success: false,
        message: `Kategori "${existing.rows[0].name}" sudah tersedia.`,
        data: existing.rows[0],
      });
      return;
    }

    const maxOrderRes = await pool.query(
      `SELECT COALESCE(MAX(sort_order), 0)::int AS max_order FROM product_categories WHERE sort_order < 100`
    );
    const nextOrder = (maxOrderRes.rows[0]?.max_order || 0) + 1;

    const inserted = await pool.query(
      `INSERT INTO product_categories (name, default_print_target, sort_order)
       VALUES ($1, $2::target_station_printer, $3)
       RETURNING id, name, default_print_target, sort_order, created_at`,
      [rawName, printTarget, nextOrder]
    );

    res.status(201).json({
      success: true,
      message: `Kategori "${rawName}" berhasil ditambahkan.`,
      data: inserted.rows[0],
    });
  } catch (err: any) {
    if (err.code === '23505') {
      res.status(409).json({ success: false, message: 'Kategori tersebut sudah tersedia.' });
      return;
    }
    next(err);
  }
}

export async function getProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const productsRes = await pool.query(`
      SELECT 
        p.*,
        -- Check if base recipe or all active variants are exhausted
        CASE
          WHEN EXISTS (SELECT 1 FROM product_recipes pr WHERE pr.product_id = p.id AND pr.variant_id IS NULL) THEN
            EXISTS (
              SELECT 1 
              FROM product_recipes pr
              JOIN ingredients i ON pr.ingredient_id = i.id
              WHERE pr.product_id = p.id
                AND pr.variant_id IS NULL
                AND pr.is_packaging_only = FALSE
                AND i.stock_actual < pr.quantity
            )
          WHEN EXISTS (SELECT 1 FROM product_variants pv WHERE pv.product_id = p.id AND pv.is_active = TRUE) THEN
            NOT EXISTS (
              SELECT 1
              FROM product_variants pv
              WHERE pv.product_id = p.id
                AND pv.is_active = TRUE
                AND NOT EXISTS (
                  SELECT 1
                  FROM product_recipes pr
                  JOIN ingredients i ON pr.ingredient_id = i.id
                  WHERE pr.product_id = p.id
                    AND pr.variant_id = pv.id
                    AND pr.is_packaging_only = FALSE
                    AND i.stock_actual < pr.quantity
                )
            )
          ELSE FALSE
        END as is_auto_sold_out,
        -- Base Recipe Total HPP (variant_id IS NULL)
        COALESCE(
          (
            SELECT SUM(pr.quantity * i.unit_cost)
            FROM product_recipes pr
            JOIN ingredients i ON pr.ingredient_id = i.id
            WHERE pr.product_id = p.id AND pr.variant_id IS NULL
          ),
          0
        ) as recipe_hpp,
        -- Base Recipe Ingredient Count (variant_id IS NULL)
        (
          SELECT COUNT(*)
          FROM product_recipes pr
          WHERE pr.product_id = p.id AND pr.variant_id IS NULL
        )::int as recipe_count,
        -- Base Recipe Ingredients List
        COALESCE(
          (
            SELECT json_agg(json_build_object(
              'ingredient_id', pr.ingredient_id,
              'name', i.name,
              'code', i.code,
              'quantity', pr.quantity,
              'unit', i.usage_unit,
              'unit_cost', i.unit_cost,
              'item_hpp', (pr.quantity * i.unit_cost),
              'is_packaging_only', pr.is_packaging_only
            ) ORDER BY pr.is_packaging_only ASC, i.name ASC)
            FROM product_recipes pr
            JOIN ingredients i ON pr.ingredient_id = i.id
            WHERE pr.product_id = p.id AND pr.variant_id IS NULL
          ),
          '[]'::json
        ) as recipes,
        -- Product Variants with individual selling prices & recipes
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', pv.id,
                'product_id', pv.product_id,
                'name', pv.name,
                'price', pv.price,
                'sort_order', pv.sort_order,
                'is_active', pv.is_active,
                'recipe_hpp', COALESCE((
                  SELECT ROUND(SUM(pr.quantity * i.unit_cost))::int
                  FROM product_recipes pr
                  JOIN ingredients i ON pr.ingredient_id = i.id
                  WHERE pr.product_id = p.id AND pr.variant_id = pv.id
                ), 0),
                'recipe_count', (
                  SELECT COUNT(*)::int
                  FROM product_recipes pr
                  WHERE pr.product_id = p.id AND pr.variant_id = pv.id
                ),
                'is_auto_sold_out', EXISTS (
                  SELECT 1
                  FROM product_recipes pr
                  JOIN ingredients i ON pr.ingredient_id = i.id
                  WHERE pr.product_id = p.id
                    AND pr.variant_id = pv.id
                    AND pr.is_packaging_only = FALSE
                    AND i.stock_actual < pr.quantity
                ),
                'recipes', COALESCE((
                  SELECT json_agg(json_build_object(
                    'ingredient_id', pr.ingredient_id,
                    'name', i.name,
                    'code', i.code,
                    'quantity', pr.quantity,
                    'unit', i.usage_unit,
                    'unit_cost', i.unit_cost,
                    'item_hpp', (pr.quantity * i.unit_cost),
                    'is_packaging_only', pr.is_packaging_only
                  ) ORDER BY pr.is_packaging_only ASC, i.name ASC)
                  FROM product_recipes pr
                  JOIN ingredients i ON pr.ingredient_id = i.id
                  WHERE pr.product_id = p.id AND pr.variant_id = pv.id
                ), '[]'::json)
              )
              ORDER BY pv.sort_order ASC, pv.created_at ASC, pv.name ASC
            )
            FROM product_variants pv
            WHERE pv.product_id = p.id AND pv.is_active = TRUE
          ),
          '[]'::json
        ) as variants,
        -- Modifiers
        COALESCE(
          (
            SELECT json_agg(json_build_object(
              'id', mo.id,
              'optionName', mo.option_name,
              'priceAdjustment', mo.price_adjustment,
              'actionType', mo.action_type
            ))
            FROM modifier_options mo
            WHERE mo.product_id = p.id
          ),
          '[]'::json
        ) as modifiers
      FROM products p
      WHERE p.is_active = TRUE
      ORDER BY p.category ASC, p.name ASC
    `);

    const products = productsRes.rows.map((row) => {
      const variants = Array.isArray(row.variants)
        ? row.variants.map((v: any) => ({
            ...v,
            price: Number(v.price),
            sort_order: Number(v.sort_order || 0),
            recipe_hpp: Math.round(Number(v.recipe_hpp) || 0),
            recipe_count: Number(v.recipe_count) || 0,
            is_auto_sold_out: Boolean(v.is_auto_sold_out),
            recipes: v.recipes || [],
          }))
        : [];

      return {
        ...row,
        price: Number(row.price),
        recipe_hpp: Math.round(Number(row.recipe_hpp) || 0),
        recipe_count: Number(row.recipe_count) || 0,
        recipes: row.recipes || [],
        variants,
        isSoldOut: Boolean(row.is_force_sold_out || row.is_auto_sold_out),
      };
    });

    res.json({
      success: true,
      data: products,
    });
  } catch (err) {
    next(err);
  }
}

export async function toggleSoldOut(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { isForceSoldOut } = req.body;

    const updated = await pool.query(
      `UPDATE products 
       SET is_force_sold_out = $1, updated_at = NOW() 
       WHERE id = $2 
       RETURNING *`,
      [Boolean(isForceSoldOut), id]
    );

    if (updated.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Produk tidak ditemukan.' });
      return;
    }

    res.json({
      success: true,
      message: `Status ketersediaan ${updated.rows[0].name} berhasil diperbarui.`,
      data: updated.rows[0],
    });
  } catch (err) {
    next(err);
  }
}

export async function createProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { sku, name, category, price, print_target, is_favorite, image_url } = req.body;
    const cleanCategory = typeof category === 'string' ? category.trim() : '';
    if (!sku || !name || !cleanCategory || price === undefined) {
      res.status(400).json({ success: false, message: 'SKU, nama, kategori, dan harga produk wajib diisi.' });
      return;
    }

    const station = print_target || 'BAR_PRINTER';
    await pool.query(
      `INSERT INTO product_categories (name, default_print_target, sort_order)
       VALUES ($1, $2::target_station_printer, 100)
       ON CONFLICT (name) DO NOTHING`,
      [cleanCategory.slice(0, 50), station]
    );

    const result = await pool.query(`
      INSERT INTO products (sku, name, category, price, print_target, is_favorite, image_url)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [
      sku.trim().toUpperCase(),
      name.trim(),
      cleanCategory.slice(0, 50),
      Number(price),
      station,
      Boolean(is_favorite),
      image_url || null,
    ]);

    res.status(201).json({
      success: true,
      message: `Produk ${name} berhasil ditambahkan.`,
      data: result.rows[0],
    });
  } catch (err: any) {
    if (err.code === '23505') {
      res.status(409).json({ success: false, message: 'SKU produk sudah digunakan.' });
      return;
    }
    next(err);
  }
}

export async function updateProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { sku, name, category, price, print_target, is_favorite, is_force_sold_out, image_url } = req.body;
    const cleanCategory = typeof category === 'string' ? category.trim().slice(0, 50) : category;

    if (cleanCategory) {
      const station = print_target || 'BAR_PRINTER';
      await pool.query(
        `INSERT INTO product_categories (name, default_print_target, sort_order)
         VALUES ($1, $2::target_station_printer, 100)
         ON CONFLICT (name) DO NOTHING`,
        [cleanCategory, station]
      );
    }

    const result = await pool.query(`
      UPDATE products
      SET sku = COALESCE($1, sku),
          name = COALESCE($2, name),
          category = COALESCE($3, category),
          price = COALESCE($4, price),
          print_target = COALESCE($5, print_target),
          is_favorite = COALESCE($6, is_favorite),
          is_force_sold_out = COALESCE($7, is_force_sold_out),
          image_url = COALESCE($8, image_url),
          updated_at = NOW()
      WHERE id = $9
      RETURNING *
    `, [
      sku?.trim()?.toUpperCase(),
      name?.trim(),
      cleanCategory,
      price !== undefined ? Number(price) : null,
      print_target,
      is_favorite !== undefined ? Boolean(is_favorite) : null,
      is_force_sold_out !== undefined ? Boolean(is_force_sold_out) : null,
      image_url,
      id,
    ]);

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Produk tidak ditemukan.' });
      return;
    }

    res.json({
      success: true,
      message: `Produk ${result.rows[0].name} berhasil diperbarui.`,
      data: result.rows[0],
    });
  } catch (err: any) {
    if (err.code === '23505') {
      res.status(409).json({ success: false, message: 'SKU produk sudah digunakan oleh produk lain.' });
      return;
    }
    next(err);
  }
}

export async function deleteProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      UPDATE products SET is_active = FALSE, updated_at = NOW()
      WHERE id = $1 RETURNING *
    `, [id]);

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Produk tidak ditemukan.' });
      return;
    }

    res.json({
      success: true,
      message: `Produk ${result.rows[0].name} berhasil dinonaktifkan.`,
      data: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
}

export async function getProductRecipes(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const rawVariantId = typeof req.query.variantId === 'string' ? req.query.variantId.trim() : '';
    const variantId = rawVariantId && rawVariantId !== 'null' && rawVariantId !== 'undefined' ? rawVariantId : null;

    const result = variantId
      ? await pool.query(
          `SELECT 
            pr.*,
            i.name as ingredient_name,
            i.code as ingredient_code,
            i.usage_unit,
            i.unit_cost,
            (pr.quantity * i.unit_cost) as item_hpp
          FROM product_recipes pr
          JOIN ingredients i ON pr.ingredient_id = i.id
          WHERE pr.product_id = $1 AND pr.variant_id = $2
          ORDER BY pr.is_packaging_only ASC, i.name ASC`,
          [id, variantId]
        )
      : await pool.query(
          `SELECT 
            pr.*,
            i.name as ingredient_name,
            i.code as ingredient_code,
            i.usage_unit,
            i.unit_cost,
            (pr.quantity * i.unit_cost) as item_hpp
          FROM product_recipes pr
          JOIN ingredients i ON pr.ingredient_id = i.id
          WHERE pr.product_id = $1 AND pr.variant_id IS NULL
          ORDER BY pr.is_packaging_only ASC, i.name ASC`,
          [id]
        );

    const totalHpp = result.rows.reduce((sum, r) => sum + Number(r.item_hpp), 0);

    res.json({
      success: true,
      data: {
        recipes: result.rows,
        totalHpp,
        variantId,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function updateProductRecipes(req: Request, res: Response, next: NextFunction): Promise<void> {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { recipes, variantId } = req.body; // Array of { ingredient_id, quantity, is_packaging_only }, optional variantId
    const resolvedVariantId = typeof variantId === 'string' && variantId.trim() ? variantId.trim() : null;

    if (!Array.isArray(recipes)) {
      res.status(400).json({ success: false, message: 'Daftar resep (recipes) harus berupa array.' });
      return;
    }

    await client.query('BEGIN');

    if (resolvedVariantId) {
      const varCheck = await client.query(
        `SELECT id FROM product_variants WHERE id = $1 AND product_id = $2 AND is_active = TRUE`,
        [resolvedVariantId, id]
      );
      if (varCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        res.status(404).json({ success: false, message: 'Varian produk tidak ditemukan.' });
        return;
      }
      await client.query(`DELETE FROM product_recipes WHERE product_id = $1 AND variant_id = $2`, [id, resolvedVariantId]);
    } else {
      await client.query(`DELETE FROM product_recipes WHERE product_id = $1 AND variant_id IS NULL`, [id]);
    }

    // Insert new recipes
    for (const r of recipes) {
      if (r.ingredient_id && Number(r.quantity) > 0) {
        await client.query(`
          INSERT INTO product_recipes (product_id, variant_id, ingredient_id, quantity, is_packaging_only)
          VALUES ($1, $2, $3, $4, $5)
        `, [id, resolvedVariantId, r.ingredient_id, Number(r.quantity), Boolean(r.is_packaging_only)]);
      }
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      message: resolvedVariantId ? 'Resep varian produk berhasil diperbarui.' : 'Resep produk berhasil diperbarui.',
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

export async function createProductVariant(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const rawName = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    const parsedPrice = Number(req.body?.price);

    if (!rawName) {
      res.status(400).json({ success: false, message: 'Nama varian wajib diisi.' });
      return;
    }

    if (rawName.length > 60) {
      res.status(400).json({ success: false, message: 'Nama varian maksimal 60 karakter.' });
      return;
    }

    if (Number.isNaN(parsedPrice) || parsedPrice < 0) {
      res.status(400).json({ success: false, message: 'Harga jual varian tidak valid.' });
      return;
    }

    const prodCheck = await pool.query(`SELECT id FROM products WHERE id = $1 AND is_active = TRUE`, [id]);
    if (prodCheck.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Produk tidak ditemukan.' });
      return;
    }

    const dupCheck = await pool.query(
      `SELECT id FROM product_variants WHERE product_id = $1 AND is_active = TRUE AND LOWER(name) = LOWER($2) LIMIT 1`,
      [id, rawName]
    );
    if (dupCheck.rows.length > 0) {
      res.status(409).json({ success: false, message: `Varian "${rawName}" sudah ada pada menu ini.` });
      return;
    }

    const orderRes = await pool.query(
      `SELECT COALESCE(MAX(sort_order), 0)::int AS max_order FROM product_variants WHERE product_id = $1 AND is_active = TRUE`,
      [id]
    );
    const nextOrder = (orderRes.rows[0]?.max_order || 0) + 1;

    const inserted = await pool.query(
      `INSERT INTO product_variants (product_id, name, price, sort_order)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [id, rawName, parsedPrice, nextOrder]
    );

    const row = inserted.rows[0];
    res.status(201).json({
      success: true,
      message: `Varian "${rawName}" berhasil ditambahkan.`,
      data: {
        ...row,
        price: Number(row.price),
        recipe_hpp: 0,
        recipe_count: 0,
        is_auto_sold_out: false,
        recipes: [],
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function updateProductVariant(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id, variantId } = req.params;
    const rawName = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    const parsedPrice = Number(req.body?.price);

    if (!rawName) {
      res.status(400).json({ success: false, message: 'Nama varian wajib diisi.' });
      return;
    }

    if (rawName.length > 60) {
      res.status(400).json({ success: false, message: 'Nama varian maksimal 60 karakter.' });
      return;
    }

    if (Number.isNaN(parsedPrice) || parsedPrice < 0) {
      res.status(400).json({ success: false, message: 'Harga jual varian tidak valid.' });
      return;
    }

    const dupCheck = await pool.query(
      `SELECT id FROM product_variants WHERE product_id = $1 AND id <> $2 AND is_active = TRUE AND LOWER(name) = LOWER($3) LIMIT 1`,
      [id, variantId, rawName]
    );
    if (dupCheck.rows.length > 0) {
      res.status(409).json({ success: false, message: `Varian "${rawName}" sudah ada pada menu ini.` });
      return;
    }

    const updated = await pool.query(
      `UPDATE product_variants
       SET name = $1, price = $2, updated_at = NOW()
       WHERE id = $3 AND product_id = $4 AND is_active = TRUE
       RETURNING *`,
      [rawName, parsedPrice, variantId, id]
    );

    if (updated.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Varian produk tidak ditemukan.' });
      return;
    }

    const row = updated.rows[0];
    res.json({
      success: true,
      message: `Varian "${rawName}" berhasil diperbarui.`,
      data: {
        ...row,
        price: Number(row.price),
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteProductVariant(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id, variantId } = req.params;
    const deleted = await pool.query(
      `DELETE FROM product_variants WHERE id = $1 AND product_id = $2 RETURNING *`,
      [variantId, id]
    );

    if (deleted.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Varian produk tidak ditemukan.' });
      return;
    }

    res.json({
      success: true,
      message: `Varian "${deleted.rows[0].name}" berhasil dihapus.`,
      data: deleted.rows[0],
    });
  } catch (err) {
    next(err);
  }
}

export async function uploadProductImage(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { image, filename } = req.body;
    if (!image || typeof image !== 'string') {
      res.status(400).json({ success: false, message: 'Data gambar (base64) wajib dikirimkan.' });
      return;
    }

    // Match data URL pattern e.g. data:image/png;base64,...
    const matches = image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    let mimeType = 'image/jpeg';
    let base64Data = image;

    if (matches && matches.length === 3) {
      mimeType = matches[1];
      base64Data = matches[2];
    }

    const mimeToExt: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/jpg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
      'image/gif': '.gif',
    };

    const ext = mimeToExt[mimeType.toLowerCase()] || (filename ? path.extname(filename).toLowerCase() : '.jpg');
    if (!['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext)) {
      res.status(400).json({ success: false, message: 'Format gambar tidak didukung. Gunakan JPG, PNG, atau WebP.' });
      return;
    }

    const buffer = Buffer.from(base64Data, 'base64');

    if (buffer.length > 5 * 1024 * 1024) {
      res.status(400).json({ success: false, message: 'Ukuran file gambar melebihi batas 5MB.' });
      return;
    }

    const uploadsDir = path.resolve(__dirname, '../../..', 'uploads', 'products');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const safeUniqueName = `prod_${Date.now()}_${crypto.randomBytes(4).toString('hex')}${ext}`;
    const targetPath = path.join(uploadsDir, safeUniqueName);

    await fs.promises.writeFile(targetPath, buffer);

    const publicUrl = `/uploads/products/${safeUniqueName}`;

    res.json({
      success: true,
      message: 'Gambar produk berhasil diunggah.',
      data: {
        url: publicUrl,
        filename: safeUniqueName,
        size: buffer.length,
      },
    });
  } catch (err) {
    next(err);
  }
}
