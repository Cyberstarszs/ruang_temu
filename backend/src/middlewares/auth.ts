import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthUser {
  id: string;
  name: string;
  username: string;
  role: 'OWNER' | 'CASHIER';
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
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
    req.user = decoded;
    next();
  } catch (err: any) {
    res.status(401).json({ success: false, message: 'Sesi telah kedaluwarsa atau token tidak valid.' });
  }
}

export function requireRoles(...roles: Array<'OWNER' | 'CASHIER'>) {
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
