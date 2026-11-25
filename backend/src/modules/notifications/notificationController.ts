import { Request, Response, NextFunction } from 'express';
import { pool } from '../../config/database';

// AGGREGATE SYSTEM NOTIFICATIONS & OPERATIONAL ALERTS
export async function getNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // 1. Low stock ingredients
    const lowStockRes = await pool.query(`
      SELECT id, code, name, stock_actual, safe_stock, usage_unit
      FROM ingredients
      WHERE stock_actual <= safe_stock
      ORDER BY stock_actual ASC
    `);

    // 2. Failed print jobs
    const failedPrintsRes = await pool.query(`
      SELECT pq.id, pq.doc_type, pq.target_ip, pq.retry_count, pq.error_message, pq.created_at, o.order_number
      FROM print_queue pq
      JOIN orders o ON pq.order_id = o.id
      WHERE pq.status = 'FAILED'
      ORDER BY pq.created_at DESC
      LIMIT 10
    `);

    // 3. Today reservations
    const reservationsRes = await pool.query(`
      SELECT r.id, r.customer_name, r.phone_number, r.guest_count, r.reservation_time, r.status, dt.table_number
      FROM reservations r
      LEFT JOIN dining_tables dt ON r.table_id = dt.id
      WHERE DATE(r.reservation_time) = CURRENT_DATE AND r.status = 'CONFIRMED'
      ORDER BY r.reservation_time ASC
    `);

    const summary = {
      lowStockCount: lowStockRes.rows.length,
      failedPrintsCount: failedPrintsRes.rows.length,
      todayReservationsCount: reservationsRes.rows.length,
      totalAlerts: lowStockRes.rows.length + failedPrintsRes.rows.length,
    };

    res.json({
      success: true,
      data: {
        summary,
        lowStockItems: lowStockRes.rows,
        failedPrints: failedPrintsRes.rows,
        todayReservations: reservationsRes.rows,
      },
    });
  } catch (err) {
    next(err);
  }
}
