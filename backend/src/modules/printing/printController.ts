import { Request, Response, NextFunction } from 'express';
import { pool } from '../../config/database';
import { dispatchSocketPrint } from '../../services/printService';

export async function getPrintQueue(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await pool.query(`
      SELECT pq.*, o.order_number, o.order_type, t.table_number
      FROM print_queue pq
      JOIN orders o ON pq.order_id = o.id
      LEFT JOIN dining_tables t ON o.table_id = t.id
      WHERE pq.status IN ('PENDING', 'FAILED')
      ORDER BY pq.created_at DESC
    `);

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (err) {
    next(err);
  }
}

export async function retryPrintJob(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const jobRes = await pool.query(`SELECT * FROM print_queue WHERE id = $1`, [id]);

    if (jobRes.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Tiket antrean cetak tidak ditemukan.' });
      return;
    }

    const job = jobRes.rows[0];
    dispatchSocketPrint(job.id, job.target_ip, job.target_port, job.payload_escpos);

    res.json({
      success: true,
      message: `Mencoba mengirim ulang tiket ke ${job.target_ip}:${job.target_port}.`,
    });
  } catch (err) {
    next(err);
  }
}

export async function fallbackPrintJob(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    const updated = await pool.query(`
      UPDATE print_queue 
      SET status = 'SENT', error_message = 'Dialihkan ke Printer Kasir (Fallback)', updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [id]);

    if (updated.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Tiket antrean cetak tidak ditemukan.' });
      return;
    }

    res.json({
      success: true,
      message: 'Tiket berhasil dialihkan untuk dicetak pada printer thermal kasir.',
      data: updated.rows[0],
    });
  } catch (err) {
    next(err);
  }
}
