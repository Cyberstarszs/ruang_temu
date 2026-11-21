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
