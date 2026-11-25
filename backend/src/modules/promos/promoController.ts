import { Request, Response, NextFunction } from 'express';
import { pool } from '../../config/database';

export async function getPromos(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await pool.query(`
      SELECT * FROM promos 
      WHERE is_active = TRUE AND CURRENT_DATE BETWEEN start_date AND end_date
      ORDER BY name ASC
    `);

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (err) {
    next(err);
  }
}

export async function validatePromo(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { code, subtotal } = req.body;
    if (!code || subtotal === undefined) {
      res.status(400).json({ success: false, message: 'Kode promo dan subtotal belanja wajib diisi.' });
      return;
    }

    const promoRes = await pool.query(`
      SELECT * FROM promos 
      WHERE UPPER(code) = $1 AND is_active = TRUE AND CURRENT_DATE BETWEEN start_date AND end_date
    `, [code.trim().toUpperCase()]);

    if (promoRes.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Kode promo tidak valid atau telah kedaluwarsa.' });
      return;
    }

    const promo = promoRes.rows[0];
    const sub = Number(subtotal);

    if (isNaN(sub) || sub < 0) {
      res.status(400).json({ success: false, message: 'Nominal subtotal belanja tidak valid.' });
      return;
    }

    if (sub < Number(promo.min_spend)) {
      res.status(422).json({
        success: false,
        message: `Minimal belanja untuk promo ini adalah Rp ${Number(promo.min_spend).toLocaleString('id-ID')}.`,
      });
      return;
    }

    if (promo.quota !== null && promo.used_count >= promo.quota) {
      res.status(422).json({ success: false, message: 'Kuota penggunaan promo ini sudah habis.' });
      return;
    }

    let discount = 0;
    if (promo.discount_type === 'PERCENT') {
      discount = (Number(promo.discount_value) / 100) * sub;
      if (promo.max_discount && discount > Number(promo.max_discount)) {
        discount = Number(promo.max_discount);
      }
    } else if (promo.discount_type === 'FIXED_AMOUNT') {
      discount = Math.min(Number(promo.discount_value), sub);
    }

    res.json({
      success: true,
      message: `Promo ${promo.name} berhasil diterapkan.`,
      data: {
        id: promo.id,
        code: promo.code,
        name: promo.name,
        discountAmount: Math.round(discount),
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getAllPromosForAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await pool.query(`SELECT * FROM promos ORDER BY created_at DESC`);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
}

export async function createPromo(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { code, name, discount_type, discount_value, min_spend, max_discount, quota, start_date, end_date } = req.body;
    if (!code || !name || !discount_type || discount_value === undefined || !start_date || !end_date) {
      res.status(400).json({ success: false, message: 'Kode, nama, jenis diskon, nilai diskon, tanggal mulai dan berakhir wajib diisi.' });
      return;
    }

    const result = await pool.query(`
      INSERT INTO promos (code, name, discount_type, discount_value, min_spend, max_discount, quota, start_date, end_date, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE)
      RETURNING *
    `, [
      code.trim().toUpperCase(),
      name.trim(),
      discount_type,
      Number(discount_value),
      min_spend !== undefined ? Number(min_spend) : 0,
      max_discount !== undefined && max_discount !== null ? Number(max_discount) : null,
      quota !== undefined && quota !== null ? Number(quota) : null,
      start_date,
      end_date,
    ]);

    res.status(201).json({
      success: true,
      message: `Promo ${name} berhasil dibuat.`,
      data: result.rows[0],
    });
  } catch (err: any) {
    if (err.code === '23505') {
      res.status(409).json({ success: false, message: 'Kode promo sudah terdaftar.' });
      return;
    }
    next(err);
  }
}

export async function togglePromo(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    const result = await pool.query(`
      UPDATE promos SET is_active = $1 WHERE id = $2 RETURNING *
    `, [Boolean(is_active), id]);

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Promo tidak ditemukan.' });
      return;
    }

    res.json({
      success: true,
      message: `Status promo ${result.rows[0].name} berhasil diperbarui.`,
      data: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
}
