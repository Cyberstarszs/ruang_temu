import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { pool } from '../../config/database';

export async function getProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const productsRes = await pool.query(`
      SELECT 
        p.*,
        -- Check if any required recipe ingredient is exhausted
        EXISTS (
          SELECT 1 
          FROM product_recipes pr
          JOIN ingredients i ON pr.ingredient_id = i.id
          WHERE pr.product_id = p.id 
            AND pr.is_packaging_only = FALSE
            AND i.stock_actual < pr.quantity
        ) as is_auto_sold_out,
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

    const products = productsRes.rows.map((row) => ({
      ...row,
      price: Number(row.price),
      isSoldOut: row.is_force_sold_out || row.is_auto_sold_out,
    }));

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
    if (!sku || !name || !category || price === undefined) {
      res.status(400).json({ success: false, message: 'SKU, nama, kategori, dan harga produk wajib diisi.' });
      return;
    }

    const result = await pool.query(`
      INSERT INTO products (sku, name, category, price, print_target, is_favorite, image_url)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [
      sku.trim().toUpperCase(),
      name.trim(),
      category,
      Number(price),
      print_target || 'BAR_PRINTER',
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
      category,
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
    const result = await pool.query(`
      SELECT 
        pr.*,
        i.name as ingredient_name,
        i.code as ingredient_code,
        i.usage_unit,
        i.unit_cost,
        (pr.quantity * i.unit_cost) as item_hpp
      FROM product_recipes pr
      JOIN ingredients i ON pr.ingredient_id = i.id
      WHERE pr.product_id = $1
      ORDER BY pr.is_packaging_only ASC, i.name ASC
    `, [id]);

    const totalHpp = result.rows.reduce((sum, r) => sum + Number(r.item_hpp), 0);

    res.json({
      success: true,
      data: {
        recipes: result.rows,
        totalHpp,
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
    const { recipes } = req.body; // Array of { ingredient_id, quantity, is_packaging_only }

    if (!Array.isArray(recipes)) {
      res.status(400).json({ success: false, message: 'Daftar resep (recipes) harus berupa array.' });
      return;
    }

    await client.query('BEGIN');

    // Remove existing recipes for this product
    await client.query(`DELETE FROM product_recipes WHERE product_id = $1`, [id]);

    // Insert new recipes
    for (const r of recipes) {
      if (r.ingredient_id && Number(r.quantity) > 0) {
        await client.query(`
          INSERT INTO product_recipes (product_id, ingredient_id, quantity, is_packaging_only)
          VALUES ($1, $2, $3, $4)
        `, [id, r.ingredient_id, Number(r.quantity), Boolean(r.is_packaging_only)]);
      }
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Resep produk berhasil diperbarui.',
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
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
