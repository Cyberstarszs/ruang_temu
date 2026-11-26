import { Request, Response, NextFunction } from 'express';
import { pool } from '../../config/database';

export async function getPromos(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await pool.query(`
      SELECT * FROM promos 
      WHERE is_active = TRUE 
        AND CURRENT_DATE BETWEEN start_date AND end_date
        AND (quota IS NULL OR used_count < quota)
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
      SELECT *, 
        (CURRENT_DATE < start_date) as is_upcoming,
        (CURRENT_DATE > end_date) as is_expired
      FROM promos 
      WHERE UPPER(code) = $1
    `, [code.trim().toUpperCase()]);

    if (promoRes.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Kode promo tidak ditemukan.' });
      return;
    }

    const promo = promoRes.rows[0];

    if (!promo.is_active) {
      res.status(422).json({ success: false, message: 'Kode promo sedang tidak aktif.' });
      return;
    }

    if (promo.is_upcoming) {
      const startFormatted = new Date(promo.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
      res.status(422).json({ success: false, message: `Promo baru mulai berlaku pada ${startFormatted}.` });
      return;
    }

    if (promo.is_expired) {
      const endFormatted = new Date(promo.end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
      res.status(422).json({ success: false, message: `Promo telah berakhir pada ${endFormatted}.` });
      return;
    }

    if (promo.quota !== null && promo.used_count >= promo.quota) {
      res.status(422).json({ success: false, message: 'Kuota penggunaan promo ini sudah habis.' });
      return;
    }

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
    const result = await pool.query(`
      SELECT *,
        (CURRENT_DATE < start_date) as is_upcoming,
        (CURRENT_DATE > end_date) as is_expired,
        (quota IS NOT NULL AND used_count >= quota) as is_quota_full,
        (is_active = TRUE AND CURRENT_DATE BETWEEN start_date AND end_date AND (quota IS NULL OR used_count < quota)) as is_running
      FROM promos 
      ORDER BY created_at DESC
    `);
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

    if (!['PERCENT', 'FIXED_AMOUNT'].includes(discount_type)) {
      res.status(400).json({ success: false, message: 'Jenis diskon harus PERCENT atau FIXED_AMOUNT.' });
      return;
    }

    const val = Number(discount_value);
    if (isNaN(val) || val <= 0) {
      res.status(400).json({ success: false, message: 'Nilai diskon harus berupa angka lebih dari 0.' });
      return;
    }

    if (discount_type === 'PERCENT' && val > 100) {
      res.status(400).json({ success: false, message: 'Diskon persentase tidak boleh melebihi 100%.' });
      return;
    }

    if (new Date(start_date) > new Date(end_date)) {
      res.status(400).json({ success: false, message: 'Tanggal mulai tidak boleh melebihi tanggal berakhir.' });
      return;
    }

    const minSpendNum = min_spend !== undefined && min_spend !== '' ? Math.max(0, Number(min_spend)) : 0;
    const maxDiscountNum = max_discount !== undefined && max_discount !== null && max_discount !== '' ? Math.max(0, Number(max_discount)) : null;
    const quotaNum = quota !== undefined && quota !== null && quota !== '' ? Math.max(1, parseInt(quota, 10)) : null;

    const result = await pool.query(`
      INSERT INTO promos (code, name, discount_type, discount_value, min_spend, max_discount, quota, start_date, end_date, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE)
      RETURNING *
    `, [
      code.trim().toUpperCase(),
      name.trim(),
      discount_type,
      val,
      minSpendNum,
      maxDiscountNum,
      quotaNum,
      start_date,
      end_date,
    ]);

    res.status(201).json({
      success: true,
      message: `Promo "${name}" berhasil dibuat.`,
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

export async function updatePromo(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { code, name, discount_type, discount_value, min_spend, max_discount, quota, start_date, end_date, is_active } = req.body;

    if (!code || !name || !discount_type || discount_value === undefined || !start_date || !end_date) {
      res.status(400).json({ success: false, message: 'Kode, nama, jenis diskon, nilai diskon, tanggal mulai dan berakhir wajib diisi.' });
      return;
    }

    if (!['PERCENT', 'FIXED_AMOUNT'].includes(discount_type)) {
      res.status(400).json({ success: false, message: 'Jenis diskon harus PERCENT atau FIXED_AMOUNT.' });
      return;
    }

    const val = Number(discount_value);
    if (isNaN(val) || val <= 0) {
      res.status(400).json({ success: false, message: 'Nilai diskon harus berupa angka lebih dari 0.' });
      return;
    }

    if (discount_type === 'PERCENT' && val > 100) {
      res.status(400).json({ success: false, message: 'Diskon persentase tidak boleh melebihi 100%.' });
      return;
    }

    if (new Date(start_date) > new Date(end_date)) {
      res.status(400).json({ success: false, message: 'Tanggal mulai tidak boleh melebihi tanggal berakhir.' });
      return;
    }

    const minSpendNum = min_spend !== undefined && min_spend !== '' ? Math.max(0, Number(min_spend)) : 0;
    const maxDiscountNum = max_discount !== undefined && max_discount !== null && max_discount !== '' ? Math.max(0, Number(max_discount)) : null;
    const quotaNum = quota !== undefined && quota !== null && quota !== '' ? Math.max(1, parseInt(quota, 10)) : null;

    const result = await pool.query(`
      UPDATE promos 
      SET 
        code = $1, 
        name = $2, 
        discount_type = $3, 
        discount_value = $4, 
        min_spend = $5, 
        max_discount = $6, 
        quota = $7, 
        start_date = $8, 
        end_date = $9,
        is_active = COALESCE($10, is_active)
      WHERE id = $11
      RETURNING *
    `, [
      code.trim().toUpperCase(),
      name.trim(),
      discount_type,
      val,
      minSpendNum,
      maxDiscountNum,
      quotaNum,
      start_date,
      end_date,
      is_active !== undefined ? Boolean(is_active) : null,
      id,
    ]);

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Promo tidak ditemukan.' });
      return;
    }

    res.json({
      success: true,
      message: `Promo "${result.rows[0].name}" berhasil diperbarui.`,
      data: result.rows[0],
    });
  } catch (err: any) {
    if (err.code === '23505') {
      res.status(409).json({ success: false, message: 'Kode promo sudah digunakan pada promo lain.' });
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
      message: `Status promo "${result.rows[0].name}" diubah menjadi ${result.rows[0].is_active ? 'Aktif' : 'Nonaktif'}.`,
      data: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
}

export async function deletePromo(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    const checkRes = await pool.query(`SELECT * FROM promos WHERE id = $1`, [id]);
    if (checkRes.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Promo tidak ditemukan.' });
      return;
    }

    const promo = checkRes.rows[0];

    // If promo has already been used in transactions, recommend deactivating instead of deleting
    const force = req.query.force === 'true';
    if (promo.used_count > 0 && !force) {
      res.status(400).json({
        success: false,
        message: `Promo "${promo.name}" sudah pernah digunakan sebanyak ${promo.used_count} kali. Disarankan untuk menonaktifkannya saja agar riwayat audit transaksi tetap akurat.`,
        canForce: true,
      });
      return;
    }

    await pool.query(`DELETE FROM promos WHERE id = $1`, [id]);

    res.json({
      success: true,
      message: `Promo "${promo.name}" (${promo.code}) berhasil dihapus.`,
    });
  } catch (err) {
    next(err);
  }
}

