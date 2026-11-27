import { Request, Response, NextFunction } from 'express';
import { pool } from '../../config/database';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export async function getCurrentShift(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.id;
    const shiftRes = await pool.query(
      `SELECT s.*, u.name as cashier_name
       FROM cashier_shifts s
       JOIN users u ON s.cashier_id = u.id
       WHERE s.cashier_id = $1 AND s.status = 'OPEN'
       ORDER BY s.opened_at DESC LIMIT 1`,
      [userId]
    );

    if (shiftRes.rows.length === 0) {
      res.json({
        success: true,
        data: null,
        message: 'Tidak ada sif aktif untuk kasir ini.',
      });
      return;
    }

    const shift = shiftRes.rows[0];

    // Calculate current running cash sales & total order count across all payment methods
    const salesRes = await pool.query(
      `SELECT 
         COALESCE(SUM(CASE WHEN op.payment_method = 'CASH' THEN op.amount_paid ELSE 0 END), 0) as cash_sales_total,
         COUNT(DISTINCT o.id) as order_count
       FROM orders o
       LEFT JOIN order_payments op ON o.id = op.order_id
       WHERE o.shift_id = $1 AND o.status = 'PAID'`,
      [shift.id]
    );

    // Calculate petty cash in / out
    const pettyRes = await pool.query(
      `SELECT 
         COALESCE(SUM(CASE WHEN type = 'CASH_IN' THEN amount ELSE 0 END), 0) as total_cash_in,
         COALESCE(SUM(CASE WHEN type = 'CASH_OUT' THEN amount ELSE 0 END), 0) as total_cash_out
       FROM cash_movements
       WHERE shift_id = $1`,
      [shift.id]
    );

    const openingCash = Number(shift.opening_cash || 0);
    const cashSalesTotal = Number(salesRes.rows[0]?.cash_sales_total || 0);
    const totalCashIn = Number(pettyRes.rows[0]?.total_cash_in || 0);
    const totalCashOut = Number(pettyRes.rows[0]?.total_cash_out || 0);
    const expectedCash = openingCash + cashSalesTotal + totalCashIn - totalCashOut;

    res.json({
      success: true,
      data: {
        shift,
        summary: {
          openingCash,
          cashSalesTotal,
          totalCashIn,
          totalCashOut,
          expectedCash,
          orderCount: Number(salesRes.rows[0]?.order_count || 0),
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function openShift(req: Request, res: Response, next: NextFunction): Promise<void> {
  const client = await pool.connect();
  try {
    const userId = req.user?.id;
    const { openingCash } = req.body;

    if (openingCash === undefined || Number(openingCash) < 0 || isNaN(Number(openingCash))) {
      res.status(400).json({ success: false, message: 'Nominal modal awal kasir wajib diisi (minimal 0).' });
      return;
    }

    await client.query('BEGIN');

    // Lock the cashier row so concurrent double-clicks / multi-tab calls serialize cleanly
    const userLock = await client.query(
      `SELECT id FROM users WHERE id = $1 FOR UPDATE`,
      [userId]
    );
    if (userLock.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ success: false, message: 'Akun kasir tidak ditemukan.' });
      return;
    }

    // Check if cashier already has an open shift
    const existing = await client.query(
      `SELECT id FROM cashier_shifts WHERE cashier_id = $1 AND status = 'OPEN' FOR UPDATE`,
      [userId]
    );

    if (existing.rows.length > 0) {
      await client.query('ROLLBACK');
      res.status(409).json({ success: false, message: 'Anda sudah memiliki sif kasir yang sedang aktif.' });
      return;
    }

    const insertRes = await client.query(
      `INSERT INTO cashier_shifts (cashier_id, opening_cash, status)
       VALUES ($1, $2, 'OPEN')
       RETURNING *`,
      [userId, Number(openingCash)]
    );

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Sif kasir berhasil dibuka.',
      data: insertRes.rows[0],
    });
  } catch (err: any) {
    await client.query('ROLLBACK').catch(() => {});
    if (err?.code === '23505') {
      res.status(409).json({ success: false, message: 'Anda sudah memiliki sif kasir yang sedang aktif.' });
      return;
    }
    next(err);
  } finally {
    client.release();
  }
}

export async function closeShift(req: Request, res: Response, next: NextFunction): Promise<void> {
  const client = await pool.connect();
  try {
    const userId = req.user?.id;
    const { shiftId, blindCountedCash, notes, managerPin } = req.body;

    if (!shiftId || blindCountedCash === undefined || Number(blindCountedCash) < 0 || isNaN(Number(blindCountedCash))) {
      res.status(400).json({ success: false, message: 'ID Sif dan jumlah uang fisik hasil hitung (minimal 0) wajib diisi.' });
      return;
    }

    await client.query('BEGIN');

    const shiftRes = await client.query(
      `SELECT * FROM cashier_shifts WHERE id = $1 AND cashier_id = $2 AND status = 'OPEN' FOR UPDATE`,
      [shiftId, userId]
    );

    if (shiftRes.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ success: false, message: 'Sif aktif tidak ditemukan.' });
      return;
    }

    const shift = shiftRes.rows[0];

    // Compute actual system expected cash:
    // Expected = Opening Cash + Cash Payments Received + Cash In - Cash Out
    const salesRes = await client.query(
      `SELECT COALESCE(SUM(op.amount_paid), 0) as cash_sales
       FROM orders o
       JOIN order_payments op ON o.id = op.order_id
       WHERE o.shift_id = $1 AND o.status = 'PAID' AND op.payment_method = 'CASH'`,
      [shift.id]
    );

    const pettyRes = await client.query(
      `SELECT 
         COALESCE(SUM(CASE WHEN type = 'CASH_IN' THEN amount ELSE 0 END), 0) as cash_in,
         COALESCE(SUM(CASE WHEN type = 'CASH_OUT' THEN amount ELSE 0 END), 0) as cash_out
       FROM cash_movements WHERE shift_id = $1`,
      [shift.id]
    );

    const opening = Number(shift.opening_cash);
    const cashSales = Number(salesRes.rows[0].cash_sales);
    const cashIn = Number(pettyRes.rows[0].cash_in);
    const cashOut = Number(pettyRes.rows[0].cash_out);

    const systemExpected = opening + cashSales + cashIn - cashOut;
    const counted = Number(blindCountedCash);
    const diff = counted - systemExpected;

    let managerId: string | null = null;
    let managerName: string | null = null;

    if (diff !== 0) {
      const cleanPin = managerPin ? String(managerPin).trim() : '';
      if (!cleanPin) {
        await client.query('ROLLBACK');
        res.status(403).json({
          success: false,
          requiresManagerPin: true,
          message: 'Terdeteksi selisih kas fisik dengan sistem. Panggil Owner untuk memasukkan PIN otorisasi dan isi catatan selisih.',
        });
        return;
      }

      const mgrRes = await client.query(
        `SELECT id, name FROM users WHERE role = 'OWNER' AND pin_code = $1 AND is_active = TRUE`,
        [cleanPin]
      );
      if (mgrRes.rows.length === 0) {
        await client.query('ROLLBACK');
        res.status(403).json({
          success: false,
          requiresManagerPin: true,
          message: 'PIN Owner tidak valid untuk otorisasi penutupan sif dengan selisih kas.',
        });
        return;
      }

      if (!notes || !String(notes).trim()) {
        await client.query('ROLLBACK');
        res.status(400).json({
          success: false,
          requiresManagerPin: true,
          message: 'Catatan alasan selisih kas wajib diisi sebelum menutup sif.',
        });
        return;
      }

      managerId = mgrRes.rows[0].id;
      managerName = mgrRes.rows[0].name;
    } else if (managerPin && String(managerPin).trim()) {
      const mgrRes = await client.query(
        `SELECT id, name FROM users WHERE role = 'OWNER' AND pin_code = $1 AND is_active = TRUE`,
        [String(managerPin).trim()]
      );
      if (mgrRes.rows.length === 0) {
        await client.query('ROLLBACK');
        res.status(403).json({
          success: false,
          requiresManagerPin: true,
          message: 'PIN Owner yang dimasukkan tidak valid.',
        });
        return;
      }
      managerId = mgrRes.rows[0].id;
      managerName = mgrRes.rows[0].name;
    }

    const updated = await client.query(
      `UPDATE cashier_shifts
       SET closed_at = NOW(),
           system_expected_cash = $1,
           blind_counted_cash = $2,
           cash_difference = $3,
           closing_notes = $4,
           approved_by_manager_id = $5,
           status = 'CLOSED'
       WHERE id = $6
       RETURNING *`,
      [systemExpected, counted, diff, notes?.trim() || null, managerId, shiftId]
    );

    await client.query(
      `INSERT INTO audit_logs (user_id, action, target_table, target_id, details)
       VALUES ($1, 'CLOSE_SHIFT', 'cashier_shifts', $2, $3)`,
      [
        managerId || userId,
        shiftId,
        JSON.stringify({
          openingCash: opening,
          cashSales,
          cashIn,
          cashOut,
          systemExpected,
          blindCountedCash: counted,
          difference: diff,
          approvedByOwner: managerName,
          notes: notes?.trim() || null,
        }),
      ]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Sif kasir berhasil ditutup dan direkonsiliasi.',
      data: {
        shift: updated.rows[0],
        reconciliation: {
          openingCash: opening,
          cashSales,
          cashIn,
          cashOut,
          systemExpected,
          blindCountedCash: counted,
          difference: diff,
          status: diff === 0 ? 'SEIMBANG' : diff > 0 ? 'LEBIH' : 'KURANG',
        },
      },
    });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    next(err);
  } finally {
    client.release();
  }
}

export async function recordCashMovement(req: Request, res: Response, next: NextFunction): Promise<void> {
  const client = await pool.connect();
  try {
    const userId = req.user?.id;
    const { shiftId, type, category, description, amount, receipt_url } = req.body;
    const numericAmount = Number(amount);

    if (!shiftId || !type || !category || amount === undefined || isNaN(numericAmount) || numericAmount <= 0) {
      res.status(400).json({ success: false, message: 'ID Sif, jenis (CASH_IN/CASH_OUT), kategori, dan nominal (> 0) wajib diisi.' });
      return;
    }

    if (!['CASH_IN', 'CASH_OUT'].includes(type)) {
      res.status(400).json({ success: false, message: 'Jenis pergerakan kas harus CASH_IN atau CASH_OUT.' });
      return;
    }

    await client.query('BEGIN');

    // Verify shift exists and is currently OPEN with row lock
    const shiftCheck = await client.query(
      `SELECT id, status, opening_cash FROM cashier_shifts WHERE id = $1 FOR UPDATE`,
      [shiftId]
    );
    if (shiftCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ success: false, message: 'Sif kasir tidak ditemukan.' });
      return;
    }
    const shift = shiftCheck.rows[0];
    if (shift.status !== 'OPEN') {
      await client.query('ROLLBACK');
      res.status(400).json({ success: false, message: 'Tidak dapat mencatat mutasi kas pada sif yang sudah ditutup.' });
      return;
    }

    // Balance Check for CASH_OUT against live expected cash in drawer
    if (type === 'CASH_OUT') {
      const salesRes = await client.query(
        `SELECT COALESCE(SUM(op.amount_paid), 0) as cash_sales
         FROM orders o
         JOIN order_payments op ON o.id = op.order_id
         WHERE o.shift_id = $1 AND o.status = 'PAID' AND op.payment_method = 'CASH'`,
        [shiftId]
      );
      const pettyRes = await client.query(
        `SELECT 
           COALESCE(SUM(CASE WHEN type = 'CASH_IN' THEN amount ELSE 0 END), 0) as cash_in,
           COALESCE(SUM(CASE WHEN type = 'CASH_OUT' THEN amount ELSE 0 END), 0) as cash_out
         FROM cash_movements WHERE shift_id = $1`,
        [shiftId]
      );
      const availableDrawerCash =
        Number(shift.opening_cash || 0) +
        Number(salesRes.rows[0].cash_sales || 0) +
        Number(pettyRes.rows[0].cash_in || 0) -
        Number(pettyRes.rows[0].cash_out || 0);

      if (numericAmount > availableDrawerCash) {
        await client.query('ROLLBACK');
        res.status(400).json({
          success: false,
          message: `Saldo kas tunai di laci tidak mencukupi untuk pengeluaran ini (tersedia Rp ${Math.max(0, availableDrawerCash).toLocaleString('id-ID')}, diminta Rp ${numericAmount.toLocaleString('id-ID')}).`,
        });
        return;
      }
    }

    const insertRes = await client.query(
      `INSERT INTO cash_movements (shift_id, type, category, description, amount, receipt_url)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [shiftId, type, category, description || category, numericAmount, receipt_url || null]
    );

    await client.query(
      `INSERT INTO audit_logs (user_id, action, target_table, target_id, details)
       VALUES ($1, 'CASH_MOVEMENT', 'cash_movements', $2, $3)`,
      [
        userId || null,
        insertRes.rows[0].id,
        JSON.stringify({ shiftId, type, category, amount: numericAmount, hasReceipt: Boolean(receipt_url) }),
      ]
    );

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: `Pencatatan kas operasional (${type}) berhasil disimpan.`,
      data: insertRes.rows[0],
    });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    next(err);
  } finally {
    client.release();
  }
}

export async function uploadReceiptImage(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { image, filename } = req.body;
    if (!image || typeof image !== 'string') {
      res.status(400).json({ success: false, message: 'Data bukti foto (base64) wajib dikirimkan.' });
      return;
    }

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
    };

    const ext = mimeToExt[mimeType.toLowerCase()] || (filename ? path.extname(filename).toLowerCase() : '.jpg');
    if (!['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
      res.status(400).json({ success: false, message: 'Format gambar tidak didukung. Gunakan JPG, PNG, atau WebP.' });
      return;
    }

    const buffer = Buffer.from(base64Data, 'base64');
    if (buffer.length > 5 * 1024 * 1024) {
      res.status(400).json({ success: false, message: 'Ukuran file foto bukti melebihi batas 5MB.' });
      return;
    }

    const uploadsDir = path.resolve(__dirname, '../../..', 'uploads', 'receipts');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const safeUniqueName = `receipt_${Date.now()}_${crypto.randomBytes(4).toString('hex')}${ext}`;
    const targetPath = path.join(uploadsDir, safeUniqueName);

    await fs.promises.writeFile(targetPath, buffer);

    const publicUrl = `/uploads/receipts/${safeUniqueName}`;

    res.json({
      success: true,
      message: 'Foto bukti pengeluaran berhasil diunggah.',
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

export async function getCashMovements(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { shiftId } = req.query;
    if (!shiftId) {
      res.status(400).json({ success: false, message: 'shiftId wajib disertakan.' });
      return;
    }

    const result = await pool.query(
      `SELECT * FROM cash_movements WHERE shift_id = $1 ORDER BY created_at DESC`,
      [shiftId]
    );

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (err) {
    next(err);
  }
}

export async function getShiftHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { limit = 50, from, to } = req.query;
    const params: any[] = [];
    const conditions: string[] = [];

    if (from && to) {
      params.push(String(to));
      const pTo = params.length;
      params.push(String(from));
      const pFrom = params.length;
      conditions.push(`(DATE(s.opened_at AT TIME ZONE 'Asia/Jakarta') <= $${pTo} AND (s.closed_at IS NULL OR DATE(s.closed_at AT TIME ZONE 'Asia/Jakarta') >= $${pFrom}))`);
    } else if (from) {
      params.push(String(from));
      conditions.push(`(s.closed_at IS NULL OR DATE(s.closed_at AT TIME ZONE 'Asia/Jakarta') >= $${params.length} OR DATE(s.opened_at AT TIME ZONE 'Asia/Jakarta') >= $${params.length})`);
    } else if (to) {
      params.push(String(to));
      conditions.push(`DATE(s.opened_at AT TIME ZONE 'Asia/Jakarta') <= $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    params.push(Number(limit));

    const result = await pool.query(`
      SELECT 
        s.*,
        u.name as cashier_name,
        m.name as approved_by_name,
        (SELECT COUNT(*) FROM orders o WHERE o.shift_id = s.id AND o.status = 'PAID') as total_orders,
        (SELECT COALESCE(SUM(total_amount), 0) FROM orders o WHERE o.shift_id = s.id AND o.status = 'PAID') as total_sales,
        (SELECT COALESCE(SUM(op.amount_paid), 0) FROM orders o JOIN order_payments op ON o.id = op.order_id WHERE o.shift_id = s.id AND o.status = 'PAID' AND op.payment_method = 'CASH') as cash_sales,
        (SELECT COALESCE(SUM(op.amount_paid), 0) FROM orders o JOIN order_payments op ON o.id = op.order_id WHERE o.shift_id = s.id AND o.status = 'PAID' AND op.payment_method != 'CASH') as non_cash_sales,
        (SELECT COALESCE(SUM(CASE WHEN type = 'CASH_IN' THEN amount ELSE 0 END), 0) FROM cash_movements cm WHERE cm.shift_id = s.id) as total_cash_in,
        (SELECT COALESCE(SUM(CASE WHEN type = 'CASH_OUT' THEN amount ELSE 0 END), 0) FROM cash_movements cm WHERE cm.shift_id = s.id) as total_cash_out,
        (SELECT COUNT(*) FROM cash_movements cm WHERE cm.shift_id = s.id) as movement_count,
        (SELECT COUNT(*) FROM orders o WHERE o.shift_id = s.id AND o.status = 'CANCELLED') as void_orders_count,
        (SELECT COALESCE(SUM(op.amount_paid), 0) FROM orders o JOIN order_payments op ON o.id = op.order_id WHERE o.shift_id = s.id AND o.status = 'CANCELLED' AND s.closed_at IS NOT NULL AND o.updated_at > s.closed_at AND op.payment_method = 'CASH') as post_close_void_cash,
        (SELECT COALESCE(SUM(o.total_amount), 0) FROM orders o WHERE o.shift_id = s.id AND o.status = 'CANCELLED' AND s.closed_at IS NOT NULL AND o.updated_at > s.closed_at) as post_close_void_sales
      FROM cashier_shifts s
      JOIN users u ON s.cashier_id = u.id
      LEFT JOIN users m ON s.approved_by_manager_id = m.id
      ${whereClause}
      ORDER BY s.opened_at DESC
      LIMIT $${params.length}
    `, params);

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (err) {
    next(err);
  }
}

export async function forceCloseShift(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const ownerId = req.user?.id;
    const { id: shiftId } = req.params;
    const { actualCash, notes } = req.body;

    if (actualCash !== undefined && actualCash !== null && actualCash !== '' && Number(actualCash) < 0) {
      res.status(400).json({ success: false, message: 'Nominal uang fisik tidak boleh bernilai negatif.' });
      return;
    }

    const shiftRes = await pool.query(
      `SELECT s.*, u.name as cashier_name 
       FROM cashier_shifts s 
       JOIN users u ON s.cashier_id = u.id 
       WHERE s.id = $1 AND s.status = 'OPEN'`,
      [shiftId]
    );

    if (shiftRes.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Sif aktif tidak ditemukan atau sudah ditutup sebelumnya.' });
      return;
    }

    const shift = shiftRes.rows[0];

    // Compute actual system expected cash:
    // Expected = Opening Cash + Cash Payments Received + Cash In - Cash Out
    const salesRes = await pool.query(
      `SELECT 
         COALESCE(SUM(CASE WHEN op.payment_method = 'CASH' THEN op.amount_paid ELSE 0 END), 0) as cash_sales,
         COALESCE(SUM(CASE WHEN op.payment_method != 'CASH' THEN op.amount_paid ELSE 0 END), 0) as non_cash_sales,
         COALESCE(SUM(op.amount_paid), 0) as total_sales,
         COUNT(DISTINCT o.id) as order_count
       FROM orders o
       JOIN order_payments op ON o.id = op.order_id
       WHERE o.shift_id = $1 AND o.status = 'PAID'`,
      [shift.id]
    );

    const pettyRes = await pool.query(
      `SELECT 
         COALESCE(SUM(CASE WHEN type = 'CASH_IN' THEN amount ELSE 0 END), 0) as cash_in,
         COALESCE(SUM(CASE WHEN type = 'CASH_OUT' THEN amount ELSE 0 END), 0) as cash_out
       FROM cash_movements WHERE shift_id = $1`,
      [shift.id]
    );

    const opening = Number(shift.opening_cash);
    const cashSales = Number(salesRes.rows[0].cash_sales);
    const nonCashSales = Number(salesRes.rows[0].non_cash_sales);
    const cashIn = Number(pettyRes.rows[0].cash_in);
    const cashOut = Number(pettyRes.rows[0].cash_out);

    const systemExpected = opening + cashSales + cashIn - cashOut;
    const counted = actualCash !== undefined && actualCash !== null && actualCash !== '' ? Number(actualCash) : systemExpected;
    const diff = counted - systemExpected;

    const closingReason = notes && notes.trim()
      ? `Ditutup paksa oleh Owner: ${notes.trim()}`
      : 'Ditutup paksa oleh Owner (penutupan administratif sif terbengkalai)';

    const updated = await pool.query(
      `UPDATE cashier_shifts
       SET closed_at = NOW(),
           system_expected_cash = $1,
           blind_counted_cash = $2,
           cash_difference = $3,
           closing_notes = $4,
           approved_by_manager_id = $5,
           status = 'CLOSED'
       WHERE id = $6
       RETURNING *`,
      [systemExpected, counted, diff, closingReason, ownerId, shiftId]
    );

    // Audit log
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, target_table, target_id, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        ownerId,
        'FORCE_CLOSE_SHIFT',
        'cashier_shifts',
        shiftId,
        JSON.stringify({
          cashierId: shift.cashier_id,
          cashierName: shift.cashier_name,
          openingCash: opening,
          cashSales,
          nonCashSales,
          cashIn,
          cashOut,
          systemExpected,
          blindCountedCash: counted,
          difference: diff,
          notes: closingReason,
        }),
      ]
    );

    res.json({
      success: true,
      message: `Sif kasir ${shift.cashier_name} berhasil ditutup paksa oleh Owner.`,
      data: {
        shift: updated.rows[0],
        reconciliation: {
          openingCash: opening,
          cashSales,
          nonCashSales,
          cashIn,
          cashOut,
          systemExpected,
          blindCountedCash: counted,
          difference: diff,
          status: diff === 0 ? 'SEIMBANG' : diff > 0 ? 'LEBIH' : 'KURANG',
        },
      },
    });
  } catch (err) {
    next(err);
  }
}
