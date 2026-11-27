import { Request, Response, NextFunction } from 'express';
import { pool } from '../../config/database';

function getJakartaNowParts() {
  const now = new Date();
  const workDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(now);
  const timeParts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now);
  const hour = Number(timeParts.find((p) => p.type === 'hour')?.value ?? '0') % 24;
  const minute = Number(timeParts.find((p) => p.type === 'minute')?.value ?? '0');
  return { workDate, hour, minute };
}

// 1. CLOCK IN
export async function clockIn(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.id;
    const { notes, lateAfterHour } = req.body || {};
    const { workDate, hour } = getJakartaNowParts();

    // Check if already clocked in today (Asia/Jakarta date)
    const existing = await pool.query(`
      SELECT * FROM employee_attendances 
      WHERE user_id = $1 AND work_date = $2::date
    `, [userId, workDate]);

    if (existing.rows.length > 0) {
      res.status(400).json({
        success: false,
        message: 'Anda sudah melakukan presensi masuk hari ini.',
        data: existing.rows[0],
      });
      return;
    }

    // Determine status using explicit Asia/Jakarta hour (default cutoff 09:00 WIB)
    const parsedCutoff = Number(lateAfterHour);
    const cutoffHour = Number.isFinite(parsedCutoff) && parsedCutoff >= 0 && parsedCutoff <= 23 ? parsedCutoff : 9;
    const status = hour >= cutoffHour ? 'LATE' : 'PRESENT';

    const result = await pool.query(`
      INSERT INTO employee_attendances (user_id, work_date, clock_in, status, notes)
      VALUES ($1, $2::date, CURRENT_TIMESTAMP, $3, $4)
      RETURNING *
    `, [userId, workDate, status, notes || null]);

    res.status(201).json({
      success: true,
      message: `Presensi masuk berhasil dicatat. Status: ${status === 'LATE' ? 'Terlambat' : 'Tepat Waktu'}.`,
      data: result.rows[0],
    });
  } catch (err: any) {
    if (err?.code === '23505') {
      res.status(400).json({
        success: false,
        message: 'Anda sudah melakukan presensi masuk hari ini.',
      });
      return;
    }
    next(err);
  }
}

// 2. CLOCK OUT
export async function clockOut(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.id;
    const { workDate } = getJakartaNowParts();

    const existing = await pool.query(`
      SELECT * FROM employee_attendances 
      WHERE user_id = $1 AND work_date = $2::date
    `, [userId, workDate]);

    if (existing.rows.length === 0) {
      res.status(400).json({
        success: false,
        message: 'Anda belum melakukan presensi masuk hari ini.',
      });
      return;
    }

    if (existing.rows[0].clock_out) {
      res.status(400).json({
        success: false,
        message: 'Anda sudah melakukan presensi keluar hari ini.',
        data: existing.rows[0],
      });
      return;
    }

    const clockInTime = new Date(existing.rows[0].clock_in).getTime();
    const nowTime = Date.now();
    const totalHours = Math.max(0, Number(((nowTime - clockInTime) / (1000 * 60 * 60)).toFixed(2)));

    const result = await pool.query(`
      UPDATE employee_attendances
      SET clock_out = CURRENT_TIMESTAMP,
          total_hours = $1
      WHERE id = $2
      RETURNING *
    `, [totalHours, existing.rows[0].id]);

    res.json({
      success: true,
      message: `Presensi keluar berhasil. Total jam kerja hari ini: ${totalHours} jam.`,
      data: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
}

// 3. GET TODAY STATUS FOR CURRENT USER
export async function getTodayStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.id;
    const { workDate } = getJakartaNowParts();
    const result = await pool.query(`
      SELECT * FROM employee_attendances 
      WHERE user_id = $1 AND work_date = $2::date
    `, [userId, workDate]);

    res.json({
      success: true,
      data: result.rows[0] || null,
    });
  } catch (err) {
    next(err);
  }
}

// 4. GET ALL ATTENDANCES (For Manager/Owner)
export async function getAttendanceList(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { startDate, endDate } = req.query;
    const { workDate } = getJakartaNowParts();
    let query = `
      SELECT ea.*, u.name as employee_name, u.role as employee_role
      FROM employee_attendances ea
      JOIN users u ON ea.user_id = u.id
    `;
    const params: any[] = [];

    if (startDate && endDate) {
      query += ` WHERE ea.work_date BETWEEN $1 AND $2`;
      params.push(startDate, endDate);
    } else {
      query += ` WHERE ea.work_date = $1::date`;
      params.push(workDate);
    }

    query += ` ORDER BY ea.clock_in DESC`;

    const result = await pool.query(query, params);
    res.json({
      success: true,
      data: result.rows,
    });
  } catch (err) {
    next(err);
  }
}
