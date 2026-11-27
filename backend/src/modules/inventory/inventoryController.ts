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
    const { items } = req.body; // array of { ingredientId, actualCount, systemCountSnapshot?, notes }

    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ success: false, message: 'Daftar hitungan fisik stok opname tidak boleh kosong.' });
      return;
    }

    // Sort deterministically by ingredientId to prevent lock-order deadlocks
    const sortedItems = [...items].sort((a, b) =>
      String(a.ingredientId || '').localeCompare(String(b.ingredientId || ''))
    );

    await client.query('BEGIN');

    const adjustments: any[] = [];

    for (const item of sortedItems) {
      const countedPhysical = Number(item.actualCount);
      if (isNaN(countedPhysical) || countedPhysical < 0) {
        await client.query('ROLLBACK');
        res.status(400).json({ success: false, message: 'Nilai hitungan fisik stok opname harus berupa angka >= 0.' });
        return;
      }

      const curRes = await client.query(
        `SELECT id, name, usage_unit, stock_actual, unit_cost FROM ingredients WHERE id = $1 FOR UPDATE`,
        [item.ingredientId]
      );

      if (curRes.rows.length > 0) {
        const ing = curRes.rows[0];
        const liveStock = Number(ing.stock_actual);

        // Lindungi mutasi transaksi/PO yang terjadi bersamaan selama form opname dibuka
        const hasSnapshot =
          item.systemCountSnapshot !== undefined &&
          item.systemCountSnapshot !== null &&
          !isNaN(Number(item.systemCountSnapshot));
        const concurrentDelta = hasSnapshot ? Number((liveStock - Number(item.systemCountSnapshot)).toFixed(3)) : 0;
        const adjustedTarget = Math.max(0, Number((countedPhysical + concurrentDelta).toFixed(3)));
        const delta = Number((adjustedTarget - liveStock).toFixed(3));

        if (delta !== 0) {
          await client.query(
            `UPDATE ingredients SET stock_actual = $1, updated_at = NOW() WHERE id = $2`,
            [adjustedTarget, ing.id]
          );

          await client.query(
            `INSERT INTO stock_movements (
              ingredient_id, movement_type, quantity_change, resulting_balance, reference_id
            ) VALUES ($1, 'STOCKTAKE', $2, $3, $4)`,
            [ing.id, delta, adjustedTarget, `OPNAME: ${item.notes || 'Penyesuaian Fisik'}`]
          );

          adjustments.push({
            name: ing.name,
            previousStock: liveStock,
            countedPhysical,
            concurrentDelta,
            physicalStock: adjustedTarget,
            difference: delta,
            unit: ing.usage_unit,
          });
        }
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
    await client.query('ROLLBACK').catch(() => {});
    next(err);
  } finally {
    client.release();
  }
}

export async function createIngredient(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { code, name, usage_unit, purchase_unit, conversion_rate, stock_actual, safe_stock, unit_cost } = req.body;
    if (!code || !name || !usage_unit || !purchase_unit) {
      res.status(400).json({ success: false, message: 'Kode, nama bahan, satuan pakai, dan satuan beli wajib diisi.' });
      return;
    }

    const result = await pool.query(`
      INSERT INTO ingredients (code, name, usage_unit, purchase_unit, conversion_rate, stock_actual, safe_stock, unit_cost)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      code.trim().toUpperCase(),
      name.trim(),
      usage_unit,
      purchase_unit.trim(),
      conversion_rate ? Number(conversion_rate) : 1000,
      stock_actual !== undefined ? Number(stock_actual) : 0,
      safe_stock !== undefined ? Number(safe_stock) : 0,
      unit_cost !== undefined ? Number(unit_cost) : 0,
    ]);

    res.status(201).json({
      success: true,
      message: `Bahan baku ${name} berhasil ditambahkan.`,
      data: result.rows[0],
    });
  } catch (err: any) {
    if (err.code === '23505') {
      res.status(409).json({ success: false, message: 'Kode bahan baku sudah terdaftar.' });
      return;
    }
    next(err);
  }
}

export async function updateIngredient(req: Request, res: Response, next: NextFunction): Promise<void> {
  const client = await getClient();
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const { code, name, usage_unit, purchase_unit, conversion_rate, safe_stock, unit_cost, stock_actual } = req.body;

    const convNum = conversion_rate !== undefined ? Number(conversion_rate) : null;
    const safeNum = safe_stock !== undefined ? Number(safe_stock) : null;
    const costNum = unit_cost !== undefined ? Number(unit_cost) : null;
    const stockNum = stock_actual !== undefined ? Number(stock_actual) : null;

    if (
      (convNum !== null && (isNaN(convNum) || convNum <= 0)) ||
      (safeNum !== null && (isNaN(safeNum) || safeNum < 0)) ||
      (costNum !== null && (isNaN(costNum) || costNum < 0)) ||
      (stockNum !== null && (isNaN(stockNum) || stockNum < 0))
    ) {
      res.status(400).json({ success: false, message: 'Nilai rasio konversi harus > 0 serta stok dan harga pokok tidak boleh negatif.' });
      return;
    }

    await client.query('BEGIN');

    const prevRes = await client.query(`SELECT * FROM ingredients WHERE id = $1 FOR UPDATE`, [id]);
    if (prevRes.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ success: false, message: 'Bahan baku tidak ditemukan.' });
      return;
    }
    const prev = prevRes.rows[0];
    const oldStock = Number(prev.stock_actual || 0);
    const oldCost = Number(prev.unit_cost || 0);

    const result = await client.query(`
      UPDATE ingredients
      SET code = COALESCE($1, code),
          name = COALESCE($2, name),
          usage_unit = COALESCE($3, usage_unit),
          purchase_unit = COALESCE($4, purchase_unit),
          conversion_rate = COALESCE($5, conversion_rate),
          safe_stock = COALESCE($6, safe_stock),
          unit_cost = COALESCE($7, unit_cost),
          stock_actual = COALESCE($8, stock_actual),
          updated_at = NOW()
      WHERE id = $9
      RETURNING *
    `, [
      code?.trim()?.toUpperCase(),
      name?.trim(),
      usage_unit,
      purchase_unit?.trim(),
      convNum,
      safeNum,
      costNum,
      stockNum,
      id,
    ]);

    const updated = result.rows[0];
    const newStock = Number(updated.stock_actual || 0);
    const newCost = Number(updated.unit_cost || 0);
    const stockDelta = Number((newStock - oldStock).toFixed(3));

    if (stockDelta !== 0) {
      await client.query(
        `INSERT INTO stock_movements (ingredient_id, movement_type, quantity_change, resulting_balance, reference_id)
         VALUES ($1, 'MANUAL_ADJUSTMENT', $2, $3, $4)`,
        [id, stockDelta, newStock, `EDIT_MASTER: ${updated.code}`]
      );
    }

    await client.query(
      `INSERT INTO audit_logs (user_id, action, target_table, target_id, details)
       VALUES ($1, 'UPDATE_INGREDIENT', 'ingredients', $2, $3)`,
      [
        userId || null,
        id,
        JSON.stringify({
          code: updated.code,
          name: updated.name,
          oldStock,
          newStock,
          stockDelta,
          oldUnitCost: oldCost,
          newUnitCost: newCost,
          oldSafeStock: Number(prev.safe_stock || 0),
          newSafeStock: Number(updated.safe_stock || 0),
        }),
      ]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: `Bahan baku ${updated.name} berhasil diperbarui.`,
      data: updated,
    });
  } catch (err: any) {
    await client.query('ROLLBACK').catch(() => {});
    if (err.code === '23505') {
      res.status(409).json({ success: false, message: 'Kode bahan baku sudah digunakan oleh bahan lain.' });
      return;
    }
    next(err);
  } finally {
    client.release();
  }
}

export async function deleteIngredient(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    const checkRes = await pool.query(`SELECT id, name FROM ingredients WHERE id = $1`, [id]);
    if (checkRes.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Bahan baku tidak ditemukan.' });
      return;
    }
    const ingName = checkRes.rows[0].name;

    // Cek apakah bahan digunakan di resep menu aktif
    const recipeUsage = await pool.query(
      `SELECT p.name FROM product_recipes pr JOIN products p ON pr.product_id = p.id WHERE pr.ingredient_id = $1 LIMIT 5`,
      [id]
    );
    if (recipeUsage.rows.length > 0) {
      const names = recipeUsage.rows.map((r: any) => r.name).join(', ');
      res.status(400).json({
        success: false,
        message: `Bahan "${ingName}" tidak dapat dihapus karena masih digunakan pada resep menu: ${names}. Hapus bahan dari resep menu terkait terlebih dahulu.`,
      });
      return;
    }

    // Cek riwayat mutasi stok atau purchase orders
    const movementCheck = await pool.query(`SELECT COUNT(*) FROM stock_movements WHERE ingredient_id = $1`, [id]);
    const poCheck = await pool.query(`SELECT COUNT(*) FROM purchase_order_items WHERE ingredient_id = $1`, [id]);
    const hasMovements = parseInt(movementCheck.rows[0].count) > 0;
    const hasPOs = parseInt(poCheck.rows[0].count) > 0;

    if (hasMovements || hasPOs) {
      res.status(400).json({
        success: false,
        message: `Bahan "${ingName}" memiliki riwayat mutasi stok / pesanan pembelian untuk pembukuan. Tidak dapat dihapus permanen demi audit trail. Anda dapat menonaktifkan atau mengatur stoknya menjadi 0.`,
      });
      return;
    }

    await pool.query(`DELETE FROM ingredients WHERE id = $1`, [id]);

    res.json({
      success: true,
      message: `Bahan baku "${ingName}" berhasil dihapus.`,
    });
  } catch (err) {
    next(err);
  }
}
