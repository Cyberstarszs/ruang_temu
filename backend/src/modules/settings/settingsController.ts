import { Request, Response, NextFunction } from 'express';
import { pool } from '../../config/database';

// 1. GET STORE SETTINGS
export async function getSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    let result = await pool.query(`SELECT * FROM store_settings LIMIT 1`);
    
    // Auto-create default settings if table is empty
    if (result.rows.length === 0) {
      result = await pool.query(`
        INSERT INTO store_settings (store_name, tagline, address, phone, receipt_footer, rounding_rule)
        VALUES ('RUANG TEMU', 'Coffee, Eatery, Community', 'Jl. Raya Pamekasan No. 24, Madura', '081234567890', 'Terima kasih telah berkunjung ke Ruang Temu! Follow IG: @ruangtemu.cafe', 100)
        RETURNING *
      `);
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
}

// 2. UPDATE STORE SETTINGS (Owner/Manager only)
export async function updateSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { store_name, tagline, address, phone, receipt_footer, rounding_rule } = req.body;
    const userId = req.user?.id;

    // Check if exists
    let existing = await pool.query(`SELECT id FROM store_settings LIMIT 1`);
    let result;

    if (existing.rows.length === 0) {
      result = await pool.query(`
        INSERT INTO store_settings (store_name, tagline, address, phone, receipt_footer, rounding_rule, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
        RETURNING *
      `, [
        store_name || 'RUANG TEMU',
        tagline || '',
        address || '',
        phone || '',
        receipt_footer || '',
        Number(rounding_rule) || 100,
      ]);
    } else {
      result = await pool.query(`
        UPDATE store_settings
        SET store_name = COALESCE($1, store_name),
            tagline = COALESCE($2, tagline),
            address = COALESCE($3, address),
            phone = COALESCE($4, phone),
            receipt_footer = COALESCE($5, receipt_footer),
            rounding_rule = COALESCE($6, rounding_rule),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $7
        RETURNING *
      `, [
        store_name,
        tagline,
        address,
        phone,
        receipt_footer,
        rounding_rule ? Number(rounding_rule) : undefined,
        existing.rows[0].id,
      ]);
    }

    // Log audit
    await pool.query(`
      INSERT INTO audit_logs (user_id, action, target_table, target_id, details)
      VALUES ($1, 'UPDATE_SETTINGS', 'store_settings', $2, $3)
    `, [userId, result.rows[0].id, JSON.stringify(req.body)]);

    res.json({
      success: true,
      message: 'Pengaturan toko berhasil diperbarui.',
      data: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
}
