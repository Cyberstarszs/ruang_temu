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
        AND reservation_time BETWEEN ($2::timestamp - INTERVAL '2 hours') AND ($2::timestamp + INTERVAL '2 hours')
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

    // Update table status to RESERVED if within today
    await pool.query(`
      UPDATE dining_tables SET status = 'RESERVED' WHERE id = $1 AND status = 'AVAILABLE'
    `, [tableId]);

    res.status(201).json({
      success: true,
      message: 'Reservasi meja berhasil disimpan.',
      data: insertRes.rows[0],
    });
  } catch (err) {
    next(err);
  }
}
