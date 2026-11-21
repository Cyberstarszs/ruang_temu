import { Request, Response, NextFunction } from 'express';
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
