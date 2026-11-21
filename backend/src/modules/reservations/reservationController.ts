import { Request, Response, NextFunction } from 'express';
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

    const insertRes = await pool.query(`
      INSERT INTO reservations (customer_name, phone_number, table_id, reservation_time, guest_count, down_payment_amount, status)
      VALUES ($1, $2, $3, $4, $5, $6, 'CONFIRMED')
      RETURNING *
    `, [customerName.trim(), phoneNumber.trim(), tableId, reservationTime, guestCount, downPaymentAmount]);

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
