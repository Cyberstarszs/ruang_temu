import { Request, Response, NextFunction } from 'express';
import { pool } from '../../config/database';
import { emitToClients } from '../../services/websocketService';

export async function getTables(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const queryStr = `
      SELECT 
        t.id,
        t.table_number,
        t.area,
        t.capacity,
        t.status,
        t.occupied_at,
        t.updated_at,
        EXTRACT(EPOCH FROM (NOW() - t.occupied_at)) / 60 as occupied_minutes,
        (
          SELECT json_agg(json_build_object(
            'orderId', o.id,
            'orderNumber', o.order_number,
            'status', o.status,
            'totalAmount', o.total_amount,
            'itemCount', (SELECT COUNT(*) FROM order_items WHERE order_id = o.id)
          ))
          FROM orders o 
          WHERE o.table_id = t.id AND o.status IN ('PAID', 'PENDING_PAYMENT_AT_CASHIER')
        ) as active_orders
      FROM dining_tables t
      ORDER BY t.area ASC, t.table_number ASC
    `;

    const result = await pool.query(queryStr);

    res.json({
      success: true,
      data: result.rows.map(row => ({
        ...row,
        occupied_minutes: row.occupied_minutes ? Math.floor(Number(row.occupied_minutes)) : 0,
      })),
    });
  } catch (err) {
    next(err);
  }
}

export async function clearTable(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    const tableRes = await pool.query(
      `SELECT * FROM dining_tables WHERE id = $1`,
      [id]
    );

    if (tableRes.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Meja tidak ditemukan.' });
      return;
    }

    // Set to AVAILABLE, clear occupied_at
    const updated = await pool.query(
      `UPDATE dining_tables 
       SET status = 'AVAILABLE', occupied_at = NULL, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    emitToClients('table:status_change', {
      tableId: id,
      tableNumber: updated.rows[0].table_number,
      status: 'AVAILABLE',
    });

    res.json({
      success: true,
      message: `Meja ${updated.rows[0].table_number} berhasil dikosongkan dan siap untuk tamu baru.`,
      data: updated.rows[0],
    });
  } catch (err) {
    next(err);
  }
}

export async function updateTableStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['AVAILABLE', 'OCCUPIED', 'RESERVED', 'CLEANING'];
    if (!validStatuses.includes(status)) {
      res.status(400).json({ success: false, message: 'Status meja tidak valid.' });
      return;
    }

    const updated = await pool.query(
      `UPDATE dining_tables 
       SET status = $1, 
           occupied_at = CASE WHEN $1 = 'OCCUPIED' AND occupied_at IS NULL THEN NOW() WHEN $1 = 'AVAILABLE' THEN NULL ELSE occupied_at END,
           updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [status, id]
    );

    if (updated.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Meja tidak ditemukan.' });
      return;
    }

    emitToClients('table:status_change', {
      tableId: id,
      tableNumber: updated.rows[0].table_number,
      status,
    });

    res.json({
      success: true,
      message: `Status Meja ${updated.rows[0].table_number} diubah menjadi ${status}.`,
      data: updated.rows[0],
    });
  } catch (err) {
    next(err);
  }
}
