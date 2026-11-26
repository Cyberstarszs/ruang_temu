import { Request, Response, NextFunction } from 'express';
import { pool } from '../../config/database';

export async function getCustomers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { search } = req.query;
    let queryStr = `SELECT * FROM customers`;
    const params: any[] = [];

    if (search) {
      queryStr += ` WHERE name ILIKE $1 OR phone_number ILIKE $1`;
      params.push(`%${search}%`);
    }

    queryStr += ` ORDER BY created_at DESC LIMIT 50`;

    const result = await pool.query(queryStr, params);
    res.json({
      success: true,
      data: result.rows,
    });
  } catch (err) {
    next(err);
  }
}

export async function createCustomer(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name, phoneNumber } = req.body;
    if (!name || !phoneNumber) {
      res.status(400).json({ success: false, message: 'Nama dan nomor telepon pelanggan wajib diisi.' });
      return;
    }

    const cleanPhone = phoneNumber.trim().replace(/\D/g, '');
    if (cleanPhone.length < 8 || cleanPhone.length > 15) {
      res.status(400).json({ success: false, message: 'Nomor telepon harus terdiri dari 8 hingga 15 digit angka.' });
      return;
    }

    const result = await pool.query(
      `INSERT INTO customers (name, phone_number, tier, loyalty_points)
       VALUES ($1, $2, 'CLASSIC', 0)
       ON CONFLICT (phone_number) 
       DO UPDATE SET name = EXCLUDED.name
       RETURNING *`,
      [name.trim(), cleanPhone]
    );

    res.status(201).json({
      success: true,
      message: 'Data pelanggan berhasil disimpan.',
      data: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
}
