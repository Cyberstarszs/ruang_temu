import { Request, Response, NextFunction } from 'express';
import { pool } from '../../config/database';

// 1. GET ALL SUPPLIERS
export async function getSuppliers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await pool.query(`
      SELECT * FROM suppliers 
      ORDER BY name ASC
    `);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
}

// 2. CREATE SUPPLIER
export async function createSupplier(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name, phone, email, address, payment_terms } = req.body;
    if (!name?.trim() || !phone?.trim()) {
      res.status(400).json({ success: false, message: 'Nama supplier dan nomor telepon wajib diisi.' });
      return;
    }

    const result = await pool.query(`
      INSERT INTO suppliers (name, phone, email, address, payment_terms)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [name.trim(), phone.trim(), email?.trim() || null, address?.trim() || null, payment_terms || 'CASH']);

    res.status(201).json({
      success: true,
      message: 'Supplier berhasil ditambahkan.',
      data: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
}

// 2b. UPDATE SUPPLIER
export async function updateSupplier(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { name, phone, email, address, payment_terms } = req.body;
    if (!name?.trim() || !phone?.trim()) {
      res.status(400).json({ success: false, message: 'Nama supplier dan nomor telepon wajib diisi.' });
      return;
    }

    const result = await pool.query(`
      UPDATE suppliers
      SET name = $1, phone = $2, email = $3, address = $4, payment_terms = $5
      WHERE id = $6
      RETURNING *
    `, [name.trim(), phone.trim(), email?.trim() || null, address?.trim() || null, payment_terms || 'CASH', id]);

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Supplier tidak ditemukan.' });
      return;
    }

    res.json({
      success: true,
      message: 'Data supplier berhasil diperbarui.',
      data: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
}

// 2c. DELETE SUPPLIER
export async function deleteSupplier(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    const supCheck = await pool.query(`SELECT name FROM suppliers WHERE id = $1`, [id]);
    if (supCheck.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Supplier tidak ditemukan.' });
      return;
    }
    const supName = supCheck.rows[0].name;

    // Check if supplier has POs
    const poCheck = await pool.query(`SELECT COUNT(*) FROM purchase_orders WHERE supplier_id = $1`, [id]);
    if (parseInt(poCheck.rows[0].count) > 0) {
      res.status(400).json({
        success: false,
        message: `Supplier "${supName}" memiliki riwayat pesanan (PO) dalam sistem sehingga tidak dapat dihapus permanen demi audit trail pembukuan.`,
      });
      return;
    }

    await pool.query(`DELETE FROM suppliers WHERE id = $1`, [id]);

    res.json({
      success: true,
      message: `Supplier "${supName}" berhasil dihapus.`,
    });
  } catch (err) {
    next(err);
  }
}

// 3. GET PURCHASE ORDERS
export async function getPurchaseOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { status } = req.query;
    let query = `
      SELECT 
        po.*, 
        COALESCE(s.name, 'Supplier Dihapus') as supplier_name, 
        s.phone as supplier_phone, 
        COALESCE(u.name, 'Owner') as ordered_by_name
      FROM purchase_orders po
      LEFT JOIN suppliers s ON po.supplier_id = s.id
      LEFT JOIN users u ON po.ordered_by_user_id = u.id
    `;
    const params: any[] = [];
    if (status) {
      query += ` WHERE po.status = $1`;
      params.push(status);
    }
    query += ` ORDER BY po.created_at DESC`;

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
}

// 4. GET PO DETAIL
export async function getPurchaseOrderById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const poRes = await pool.query(`
      SELECT 
        po.*, 
        COALESCE(s.name, 'Supplier Dihapus') as supplier_name, 
        s.phone as supplier_phone, 
        s.address as supplier_address, 
        COALESCE(u.name, 'Owner') as ordered_by_name
      FROM purchase_orders po
      LEFT JOIN suppliers s ON po.supplier_id = s.id
      LEFT JOIN users u ON po.ordered_by_user_id = u.id
      WHERE po.id = $1
    `, [id]);

    if (poRes.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Purchase Order tidak ditemukan.' });
      return;
    }

    const itemsRes = await pool.query(`
      SELECT 
        poi.*, 
        COALESCE(i.name, 'Bahan Dihapus') as ingredient_name, 
        i.code as ingredient_code, 
        COALESCE(i.usage_unit::text, 'gram') as usage_unit, 
        i.purchase_unit
      FROM purchase_order_items poi
      LEFT JOIN ingredients i ON poi.ingredient_id = i.id
      WHERE poi.purchase_order_id = $1
    `, [id]);

    res.json({
      success: true,
      data: {
        ...poRes.rows[0],
        items: itemsRes.rows,
      },
    });
  } catch (err) {
    next(err);
  }
}

// 5. CREATE PURCHASE ORDER
export async function createPurchaseOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
  const supplier_id = req.body.supplier_id || req.body.supplierId;
  const items = req.body.items;
  const notes = req.body.notes;
  const userId = req.user?.id;

  if (!supplier_id || !Array.isArray(items) || items.length === 0) {
    res.status(400).json({ success: false, message: 'Supplier dan daftar item pembelian wajib diisi.' });
    return;
  }

  const processedItems: Array<{ ingredient_id: string; quantity: number; unit_cost: number }> = [];

  for (const item of items) {
    const ingId = item.ingredient_id || item.ingredientId;
    const q = Number(item.quantity);
    const c = Number(item.unit_cost ?? item.unitPrice ?? 0);
    if (!ingId || isNaN(q) || q <= 0 || isNaN(c) || c < 0) {
      res.status(400).json({ success: false, message: 'Setiap item pembelian wajib memiliki kuantitas (> 0) dan harga satuan (>= 0) yang valid.' });
      return;
    }
    processedItems.push({ ingredient_id: ingId, quantity: q, unit_cost: c });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const timeMs = Date.now().toString().slice(-4);
    const randSuffix = Math.floor(1000 + Math.random() * 9000);
    const poNumber = `PO-${todayStr}-${timeMs}${randSuffix}`;

    let totalAmount = 0;
    for (const item of processedItems) {
      totalAmount += item.quantity * item.unit_cost;
    }

    const poRes = await client.query(`
      INSERT INTO purchase_orders (po_number, supplier_id, status, total_amount, payment_status, notes, ordered_by_user_id)
      VALUES ($1, $2, 'ORDERED', $3, 'UNPAID', $4, $5)
      RETURNING *
    `, [poNumber, supplier_id, totalAmount, notes || null, userId]);

    const poId = poRes.rows[0].id;

    for (const item of processedItems) {
      const subtotal = item.quantity * item.unit_cost;
      await client.query(`
        INSERT INTO purchase_order_items (purchase_order_id, ingredient_id, quantity, unit_cost, subtotal)
        VALUES ($1, $2, $3, $4, $5)
      `, [poId, item.ingredient_id, item.quantity, item.unit_cost, subtotal]);
    }

    await client.query(`
      INSERT INTO audit_logs (user_id, action, target_table, target_id, details)
      VALUES ($1, 'CREATE_PO', 'purchase_orders', $2, $3)
    `, [userId, poId, JSON.stringify({ po_number: poNumber, total_amount: totalAmount, items_count: items.length })]);

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: `Purchase order ${poNumber} berhasil dibuat.`,
      data: poRes.rows[0],
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

// 6. RECEIVE PURCHASE ORDER (Auto update inventory & stock movements)
export async function receivePurchaseOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
  const { id } = req.params;
  const userId = req.user?.id;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const poRes = await client.query(`SELECT * FROM purchase_orders WHERE id = $1 FOR UPDATE`, [id]);
    if (poRes.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ success: false, message: 'Purchase Order tidak ditemukan.' });
      return;
    }

    const po = poRes.rows[0];
    if (po.status === 'RECEIVED') {
      await client.query('ROLLBACK');
      res.status(400).json({ success: false, message: 'PO ini sudah pernah diterima sebelumnya.' });
      return;
    }

    if (po.status === 'CANCELLED') {
      await client.query('ROLLBACK');
      res.status(400).json({ success: false, message: 'PO yang telah dibatalkan tidak dapat diterima.' });
      return;
    }

    // Get PO items
    const itemsRes = await client.query(`
      SELECT poi.*, i.conversion_rate, i.stock_actual
      FROM purchase_order_items poi
      JOIN ingredients i ON poi.ingredient_id = i.id
      WHERE poi.purchase_order_id = $1
    `, [id]);

    for (const item of itemsRes.rows) {
      const qtyToAdd = Number(item.quantity);
      
      const updateIngRes = await client.query(`
        UPDATE ingredients
        SET stock_actual = stock_actual + $1,
            unit_cost = CASE WHEN $2::numeric > 0 THEN $2::numeric ELSE unit_cost END,
            updated_at = NOW()
        WHERE id = $3
        RETURNING stock_actual
      `, [qtyToAdd, item.unit_cost, item.ingredient_id]);

      if (updateIngRes.rows.length > 0) {
        const newBalance = updateIngRes.rows[0].stock_actual;

        // Record stock movement
        await client.query(`
          INSERT INTO stock_movements (ingredient_id, movement_type, quantity_change, resulting_balance, reference_id)
          VALUES ($1, 'PURCHASE_RECEIPT', $2, $3, $4)
        `, [item.ingredient_id, qtyToAdd, newBalance, po.po_number]);
      }
    }

    // Update PO status
    const updatedPo = await client.query(`
      UPDATE purchase_orders
      SET status = 'RECEIVED', received_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `, [id]);

    await client.query(`
      INSERT INTO audit_logs (user_id, action, target_table, target_id, details)
      VALUES ($1, 'RECEIVE_PO', 'purchase_orders', $2, $3)
    `, [userId, id, JSON.stringify({ po_number: po.po_number, received_items: itemsRes.rows.length })]);

    await client.query('COMMIT');

    res.json({
      success: true,
      message: `Purchase Order ${po.po_number} berhasil diterima. Saldo stok telah ditambahkan ke sistem!`,
      data: updatedPo.rows[0],
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

// 7. CANCEL PURCHASE ORDER
export async function cancelPurchaseOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const poRes = await pool.query(`SELECT * FROM purchase_orders WHERE id = $1`, [id]);
    if (poRes.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Purchase Order tidak ditemukan.' });
      return;
    }

    const po = poRes.rows[0];
    if (po.status === 'RECEIVED') {
      res.status(400).json({ success: false, message: 'PO yang sudah diterima tidak dapat dibatalkan karena stok fisik sudah masuk ke gudang.' });
      return;
    }

    if (po.status === 'CANCELLED') {
      res.status(400).json({ success: false, message: 'PO ini sudah dibatalkan sebelumnya.' });
      return;
    }

    await pool.query(`UPDATE purchase_orders SET status = 'CANCELLED' WHERE id = $1`, [id]);

    await pool.query(`
      INSERT INTO audit_logs (user_id, action, target_table, target_id, details)
      VALUES ($1, 'CANCEL_PO', 'purchase_orders', $2, $3)
    `, [userId, id, JSON.stringify({ po_number: po.po_number })]);

    res.json({
      success: true,
      message: `Purchase Order ${po.po_number} berhasil dibatalkan.`,
    });
  } catch (err) {
    next(err);
  }
}
