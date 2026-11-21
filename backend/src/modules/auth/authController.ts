import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../../config/database';

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      res.status(400).json({ success: false, message: 'Username dan password wajib diisi.' });
      return;
    }

    const userRes = await pool.query(
      `SELECT id, name, username, password_hash, role, pin_code, is_active FROM users WHERE username = $1`,
      [username.trim().toLowerCase()]
    );

    if (userRes.rows.length === 0) {
      res.status(401).json({ success: false, message: 'Username atau password salah.' });
      return;
    }

    const user = userRes.rows[0];
    if (!user.is_active) {
      res.status(403).json({ success: false, message: 'Akun ini dinonaktifkan. Hubungi manajer.' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      res.status(401).json({ success: false, message: 'Username atau password salah.' });
      return;
    }

    const payload = {
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role,
    };

    const secret = process.env.JWT_SECRET || 'ruang_temu_production_key_38f2b8491e0a84e27f';
    const token = jwt.sign(payload, secret, {
      algorithm: 'HS256',
      expiresIn: (process.env.JWT_EXPIRES_IN || '12h') as any,
    });

    res.json({
      success: true,
      message: 'Berhasil masuk ke sistem.',
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          username: user.username,
          role: user.role,
          hasPin: !!user.pin_code,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function verifyPin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { pin } = req.body;
    if (!pin) {
      res.status(400).json({ success: false, message: 'PIN otorisasi wajib diisi.' });
      return;
    }

    // Check if any active Owner has this PIN (Owner Authorization)
    const authRes = await pool.query(
      `SELECT id, name, role FROM users WHERE role = 'OWNER' AND pin_code = $1 AND is_active = TRUE`,
      [pin.trim()]
    );

    if (authRes.rows.length === 0) {
      res.status(403).json({ success: false, message: 'PIN otorisasi Owner tidak valid.' });
      return;
    }

    const authorizedUser = authRes.rows[0];
    res.json({
      success: true,
      message: `Otorisasi disetujui oleh Owner (${authorizedUser.name}).`,
      data: {
        authorizedId: authorizedUser.id,
        authorizedName: authorizedUser.name,
        managerId: authorizedUser.id,
        managerName: authorizedUser.name,
        role: authorizedUser.role,
      },
    });
  } catch (err) {
    next(err);
  }
}
