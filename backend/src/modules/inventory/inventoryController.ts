import { Request, Response, NextFunction } from 'express';
import { pool, getClient } from '../../config/database';

export async function getInventory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await pool.query(`
      SELECT 
        i.*,
        (i.stock_actual <= i.safe_stock) as is_low_stock,
        (i.stock_actual = 0) as is_out_of_stock
      FROM ingredients i
      ORDER BY i.name ASC
    `);

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (err) {
    next(err);
  }
}

export async function recordWastage(req: Request, res: Response, next: NextFunction): Promise<void> {
  const client = await getClient();
  try {
    const userId = req.user?.id;
    const { ingredientId, quantity, reason } = req.body;

    const qty = Number(quantity);
    if (!ingredientId || isNaN(qty) || qty <= 0 || !reason?.trim()) {
      res.status(400).json({ success: false, message: 'Bahan baku, jumlah valid (> 0), dan alasan kerusakan wajib diisi.' });
      return;
    }

    await client.query('BEGIN');

    // Deduct stock
    const updateRes = await client.query(
      `UPDATE ingredients 
       SET stock_actual = stock_actual - $1, updated_at = NOW() 
       WHERE id = $2 
       RETURNING *`,
      [Number(quantity), ingredientId]
    );

    if (updateRes.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ success: false, message: 'Bahan baku tidak ditemukan.' });
      return;
    }

    const ing = updateRes.rows[0];

    // Record movement
    await client.query(
      `INSERT INTO stock_movements (
        ingredient_id, movement_type, quantity_change, resulting_balance, reference_id
      ) VALUES ($1, 'WASTAGE', $2, $3, $4)`,
      [ingredientId, -Number(quantity), ing.stock_actual, `WASTAGE: ${reason}`]
    );

    // Record audit
    await client.query(
      `INSERT INTO audit_logs (user_id, action, target_table, target_id, details)
       VALUES ($1, 'RECORD_WASTAGE', 'ingredients', $2, $3)`,
      [
        userId,
        ingredientId,
        JSON.stringify({
          ingredient: ing.name,
          quantityLost: Number(quantity),
          unit: ing.usage_unit,
          reason,
          estimatedCostLoss: Number(quantity) * Number(ing.unit_cost),
        }),
      ]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: `Pencatatan limbah ${ing.name} sebesar ${quantity} ${ing.usage_unit} berhasil disimpan.`,
      data: ing,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

export async function submitStocktake(req: Request, res: Response, next: NextFunction): Promise<void> {
  const client = await getClient();
  try {
    const userId = req.user?.id;
    const { items } = req.body; // array of { ingredientId, actualCount, notes }

    if (!items || items.length === 0) {
      res.status(400).json({ success: false, message: 'Daftar hitungan fisik stok opname tidak boleh kosong.' });
      return;
    }

    await client.query('BEGIN');

    const adjustments: any[] = [];

    for (const item of items) {
      const curRes = await client.query(
        `SELECT id, name, usage_unit, stock_actual, unit_cost FROM ingredients WHERE id = $1`,
        [item.ingredientId]
      );

      if (curRes.rows.length > 0) {
        const ing = curRes.rows[0];
        const prev = Number(ing.stock_actual);
        const actual = Number(item.actualCount);
        const delta = actual - prev;

        await client.query(
          `UPDATE ingredients SET stock_actual = $1, updated_at = NOW() WHERE id = $2`,
          [actual, ing.id]
        );

        await client.query(
          `INSERT INTO stock_movements (
            ingredient_id, movement_type, quantity_change, resulting_balance, reference_id
          ) VALUES ($1, 'STOCKTAKE', $2, $3, $4)`,
          [ing.id, delta, actual, `OPNAME: ${item.notes || 'Penyesuaian Fisik'}`]
        );

        adjustments.push({
          name: ing.name,
          previousStock: prev,
          physicalStock: actual,
          difference: delta,
          unit: ing.usage_unit,
        });
      }
    }

    await client.query(
      `INSERT INTO audit_logs (user_id, action, target_table, target_id, details)
       VALUES ($1, 'STOCKTAKE_SUBMIT', 'ingredients', 'BATCH', $2)`,
      [userId, JSON.stringify(adjustments)]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Hasil stok opname berhasil disimpan dan saldo inventori telah disesuaikan.',
      data: adjustments,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}
