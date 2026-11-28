import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { pool } from '../config/database';

export interface AuthUser {
  id: string;
  name: string;
  username: string;
  role: 'OWNER' | 'CASHIER' | 'EMPLOYEE';
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, message: 'Autentikasi diperlukan. Token tidak ditemukan.' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const secret = process.env.JWT_SECRET || 'ruang_temu_production_key_38f2b8491e0a84e27f';
    const decoded = jwt.verify(token, secret, {
      algorithms: ['HS256'],
    }) as AuthUser;

    // Security Check: Verify user is still active in database (Immediate Revocation Check)
    const userCheck = await pool.query(
      'SELECT id, name, username, role, is_active FROM users WHERE id = $1',
      [decoded.id]
    );

    if (userCheck.rows.length === 0 || !userCheck.rows[0].is_active) {
      res.status(403).json({ success: false, message: 'Akun Anda telah dinonaktifkan. Silakan hubungi pemilik toko.' });
      return;
    }

    const liveUser = userCheck.rows[0];
    req.user = {
      id: liveUser.id,
      name: liveUser.name,
      username: liveUser.username,
      role: liveUser.role,
    };
    next();
  } catch (err: any) {
    res.status(401).json({ success: false, message: 'Sesi telah kedaluwarsa atau token tidak valid.' });
  }
}

export function requireRoles(...roles: Array<'OWNER' | 'CASHIER' | 'EMPLOYEE'>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Autentikasi diperlukan.' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ success: false, message: 'Akses ditolak. Anda tidak memiliki izin untuk tindakan ini.' });
      return;
    }
    next();
  };
}
