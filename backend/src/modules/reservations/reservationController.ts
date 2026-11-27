import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { pool } from '../../config/database';

export async function getReservations(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await pool.query(`
      SELECT 
        r.*,
        t.table_number,
        t.area
      FROM reservations r
      JOIN dining_tables t ON r.table_id = t.id
      ORDER BY r.reservation_time ASC
    `);

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (err) {
    next(err);
  }
}

export async function createReservation(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { customerName, phoneNumber, tableId, reservationTime, guestCount = 2, downPaymentAmount = 0 } = req.body;

    if (!customerName || !phoneNumber || !tableId || !reservationTime) {
      res.status(400).json({ success: false, message: 'Nama pelanggan, no telepon, meja, dan waktu reservasi wajib diisi.' });
      return;
    }

    const resvDate = new Date(reservationTime);
    if (isNaN(resvDate.getTime())) {
      res.status(400).json({ success: false, message: 'Format waktu reservasi tidak valid.' });
      return;
    }

    // Verify table exists
    const tableRes = await pool.query(`SELECT id, table_number FROM dining_tables WHERE id = $1`, [tableId]);
    if (tableRes.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Meja yang dipilih tidak ditemukan.' });
      return;
    }

    // Check table conflict within 2 hours
    const conflictRes = await pool.query(`
      SELECT id FROM reservations 
      WHERE table_id = $1 
        AND status = 'CONFIRMED'
        AND reservation_time BETWEEN ($2::timestamptz - INTERVAL '2 hours') AND ($2::timestamptz + INTERVAL '2 hours')
    `, [tableId, reservationTime]);

    if (conflictRes.rows.length > 0) {
      res.status(409).json({ success: false, message: 'Meja ini sudah dipesan oleh tamu lain pada rentang jam tersebut.' });
      return;
    }

    // Security Guard: Public guests cannot self-declare down payments without staff confirmation
    let isStaff = false;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const secret = process.env.JWT_SECRET || 'ruang_temu_production_key_38f2b8491e0a84e27f';
        const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] }) as any;
        if (decoded?.id) isStaff = true;
      } catch {
        isStaff = false;
      }
    }

    const verifiedDp = isStaff ? Math.max(0, Number(downPaymentAmount) || 0) : 0;
    const guests = Math.max(1, Math.min(50, Number(guestCount) || 2));

    const insertRes = await pool.query(`
      INSERT INTO reservations (customer_name, phone_number, table_id, reservation_time, guest_count, down_payment_amount, status)
      VALUES ($1, $2, $3, $4, $5, $6, 'CONFIRMED')
      RETURNING *
    `, [customerName.trim(), phoneNumber.trim(), tableId, reservationTime, guests, verifiedDp]);

    // Update table status to RESERVED only if reservation is for TODAY in Asia/Jakarta
    const todayJakarta = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
    const resvJakarta = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(resvDate);

    if (todayJakarta === resvJakarta) {
      await pool.query(`
        UPDATE dining_tables SET status = 'RESERVED' WHERE id = $1 AND status = 'AVAILABLE'
      `, [tableId]);
    }

    res.status(201).json({
      success: true,
      message: 'Reservasi meja berhasil disimpan.',
      data: insertRes.rows[0],
    });
  } catch (err) {
    next(err);
  }
}

export async function cancelReservation(req: Request, res: Response, next: NextFunction): Promise<void> {
  const client = await pool.connect();
  try {
    const id = req.params.id as string;
    const { reason = 'Dibatalkan oleh tamu / staf', refundDp = false } = req.body || {};

    await client.query('BEGIN');

    const resvRes = await client.query(
      `SELECT r.*, t.table_number
       FROM reservations r
       JOIN dining_tables t ON r.table_id = t.id
       WHERE r.id = $1
       FOR UPDATE OF r`,
      [id]
    );

    if (resvRes.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ success: false, message: 'Data reservasi tidak ditemukan.' });
      return;
    }

    const resv = resvRes.rows[0];
    if (resv.status === 'CANCELLED') {
      await client.query('ROLLBACK');
      res.status(400).json({ success: false, message: 'Reservasi ini sudah dibatalkan sebelumnya.' });
      return;
    }

    if (resv.status === 'COMPLETED' || resv.is_dp_claimed) {
      await client.query('ROLLBACK');
      res.status(400).json({ success: false, message: 'Reservasi yang DP-nya sudah diklaim tidak dapat dibatalkan.' });
      return;
    }

    const updatedResv = await client.query(
      `UPDATE reservations SET status = 'CANCELLED' WHERE id = $1 RETURNING *`,
      [id]
    );

    // Release RESERVED table if no other active confirmed reservation exists for today (Asia/Jakarta)
    await client.query(
      `UPDATE dining_tables
       SET status = 'AVAILABLE', updated_at = NOW()
       WHERE id = $1
         AND status = 'RESERVED'
         AND NOT EXISTS (
           SELECT 1 FROM reservations
           WHERE table_id = $1
             AND id <> $2
             AND status = 'CONFIRMED'
             AND DATE(reservation_time AT TIME ZONE 'Asia/Jakarta') = DATE(NOW() AT TIME ZONE 'Asia/Jakarta')
         )`,
      [resv.table_id, id]
    );

    const dpAmount = Number(resv.down_payment_amount || 0);
    let refundMovementShiftId: string | null = null;

    if (refundDp && dpAmount > 0) {
      const openShiftRes = await client.query(
        `SELECT id, opening_cash FROM cashier_shifts WHERE status = 'OPEN' ORDER BY opened_at DESC LIMIT 1 FOR UPDATE`
      );
      if (openShiftRes.rows.length === 0) {
        await client.query('ROLLBACK');
        res.status(400).json({
          success: false,
          message: 'Tidak ada sif kasir aktif untuk mencatat refund tunai DP reservasi.',
        });
        return;
      }

      const activeShift = openShiftRes.rows[0];
      const salesRes = await client.query(
        `SELECT COALESCE(SUM(op.amount_paid), 0) as cash_sales
         FROM orders o JOIN order_payments op ON o.id = op.order_id
         WHERE o.shift_id = $1 AND o.status = 'PAID' AND op.payment_method = 'CASH'`,
        [activeShift.id]
      );
      const cashMovRes = await client.query(
        `SELECT
           COALESCE(SUM(CASE WHEN type = 'CASH_IN' THEN amount ELSE 0 END), 0) as cash_in,
           COALESCE(SUM(CASE WHEN type = 'CASH_OUT' THEN amount ELSE 0 END), 0) as cash_out
         FROM cash_movements WHERE shift_id = $1`,
        [activeShift.id]
      );

      const currentDrawerCash =
        Number(activeShift.opening_cash || 0) +
        Number(salesRes.rows[0]?.cash_sales || 0) +
        Number(cashMovRes.rows[0]?.cash_in || 0) -
        Number(cashMovRes.rows[0]?.cash_out || 0);

      if (currentDrawerCash < dpAmount) {
        await client.query('ROLLBACK');
        res.status(400).json({
          success: false,
          message: `Saldo tunai laci sif aktif (Rp ${currentDrawerCash.toLocaleString('id-ID')}) tidak mencukupi untuk refund DP (Rp ${dpAmount.toLocaleString('id-ID')}).`,
        });
        return;
      }

      await client.query(
        `INSERT INTO cash_movements (shift_id, type, category, description, amount)
         VALUES ($1, 'CASH_OUT', 'RESERVATION_REFUND', $2, $3)`,
        [
          activeShift.id,
          `Refund DP Batal Reservasi (${resv.customer_name} - Meja ${resv.table_number}): ${reason}`,
          dpAmount,
        ]
      );
      refundMovementShiftId = activeShift.id;
    }

    await client.query(
      `INSERT INTO audit_logs (user_id, action, target_table, target_id, details)
       VALUES ($1, 'CANCEL_RESERVATION', 'reservations', $2, $3)`,
      [
        req.user?.id || null,
        id,
        JSON.stringify({
          customerName: resv.customer_name,
          tableNumber: resv.table_number,
          downPaymentAmount: dpAmount,
          refundDp: Boolean(refundDp),
          refundMovementShiftId,
          reason: String(reason),
        }),
      ]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: `Reservasi ${resv.customer_name} berhasil dibatalkan${refundMovementShiftId ? ' & DP dikembalikan dari kas laci' : ''}.`,
      data: updatedResv.rows[0],
    });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    next(err);
  } finally {
    client.release();
  }
}
