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

export async function getUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await pool.query(`
      SELECT id, name, username, role, pin_code IS NOT NULL as has_pin, is_active, created_at, updated_at
      FROM users
      ORDER BY role ASC, name ASC
    `);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
}

export async function createUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name, username, password, role, pin_code } = req.body;
    if (!name || !username || !password || !role) {
      res.status(400).json({ success: false, message: 'Nama, username, password, dan peran (role) wajib diisi.' });
      return;
    }

    if (!['OWNER', 'CASHIER'].includes(role)) {
      res.status(400).json({ success: false, message: 'Role harus OWNER atau CASHIER.' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const result = await pool.query(`
      INSERT INTO users (name, username, password_hash, role, pin_code)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, name, username, role, is_active, created_at
    `, [name.trim(), username.trim().toLowerCase(), passwordHash, role, pin_code ? pin_code.trim() : null]);

    res.status(201).json({
      success: true,
      message: `Pengguna ${name} berhasil didaftarkan sebagai ${role}.`,
      data: result.rows[0],
    });
  } catch (err: any) {
    if (err.code === '23505') {
      res.status(409).json({ success: false, message: 'Username sudah digunakan.' });
      return;
    }
    next(err);
  }
}

export async function updateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { name, username, role, pin_code, password } = req.body;

    const userRes = await pool.query('SELECT id, name, username, role, pin_code, is_active FROM users WHERE id = $1', [id]);
    if (userRes.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan.' });
      return;
    }
    const targetUser = userRes.rows[0];

    // If changing role from OWNER to CASHIER, verify there is another active OWNER
    if (targetUser.role === 'OWNER' && role === 'CASHIER') {
      const activeOwners = await pool.query(
        `SELECT COUNT(*) as count FROM users WHERE role = 'OWNER' AND is_active = TRUE AND id != $1`,
        [id]
      );
      if (parseInt(activeOwners.rows[0].count, 10) === 0) {
        res.status(400).json({
          success: false,
          message: 'Keamanan Sistem: Tidak dapat mengubah peran Owner terakhir menjadi Kasir. Harus ada minimal satu Owner aktif.',
        });
        return;
      }
    }

    const updates: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (name && typeof name === 'string' && name.trim().length > 0) {
      updates.push(`name = $${idx++}`);
      values.push(name.trim());
    }

    if (username && typeof username === 'string' && username.trim().length > 0) {
      const cleanUsername = username.trim().toLowerCase();
      // Check collision
      const checkUname = await pool.query('SELECT id FROM users WHERE username = $1 AND id != $2', [cleanUsername, id]);
      if (checkUname.rows.length > 0) {
        res.status(409).json({ success: false, message: 'Username sudah digunakan oleh staf lain.' });
        return;
      }
      updates.push(`username = $${idx++}`);
      values.push(cleanUsername);
    }

    if (role && ['OWNER', 'CASHIER'].includes(role)) {
      updates.push(`role = $${idx++}`);
      values.push(role);
    }

    // PIN code handling:
    // If pin_code is provided as string: set or change PIN
    // If pin_code is null or empty string: reset/clear PIN
    if (pin_code !== undefined) {
      if (pin_code === null || (typeof pin_code === 'string' && pin_code.trim() === '')) {
        updates.push(`pin_code = NULL`);
      } else {
        updates.push(`pin_code = $${idx++}`);
        values.push(String(pin_code).trim());
      }
    }

    // Password handling:
    if (password && typeof password === 'string' && password.trim().length > 0) {
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(password.trim(), salt);
      updates.push(`password_hash = $${idx++}`);
      values.push(hash);
    }

    if (updates.length === 0) {
      res.status(400).json({ success: false, message: 'Tidak ada perubahan yang dikirimkan.' });
      return;
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const query = `
      UPDATE users
      SET ${updates.join(', ')}
      WHERE id = $${idx}
      RETURNING id, name, username, role, pin_code IS NOT NULL as has_pin, is_active, updated_at
    `;

    const result = await pool.query(query, values);

    res.json({
      success: true,
      message: `Data staf ${result.rows[0].name} berhasil diperbarui.`,
      data: result.rows[0],
    });
  } catch (err: any) {
    if (err.code === '23505') {
      res.status(409).json({ success: false, message: 'Username sudah digunakan.' });
      return;
    }
    next(err);
  }
}

export async function toggleUserActive(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    // Security Guard 1: Prevent user from deactivating their own account
    if (req.user && req.user.id === id && !is_active) {
      res.status(400).json({
        success: false,
        message: 'Keamanan Akun: Anda tidak dapat menonaktifkan akun Anda sendiri yang sedang digunakan.',
      });
      return;
    }

    // Security Guard 2: Prevent deactivating the last active OWNER
    const targetUser = await pool.query('SELECT role, is_active FROM users WHERE id = $1', [id]);
    if (targetUser.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan.' });
      return;
    }

    if (targetUser.rows[0].role === 'OWNER' && !is_active) {
      const activeOwners = await pool.query(
        `SELECT COUNT(*) as count FROM users WHERE role = 'OWNER' AND is_active = TRUE AND id != $1`,
        [id]
      );
      if (parseInt(activeOwners.rows[0].count, 10) === 0) {
        res.status(400).json({
          success: false,
          message: 'Keamanan Sistem: Tidak dapat menonaktifkan akun Owner terakhir. Harus ada minimal satu akun Owner aktif.',
        });
        return;
      }
    }

    const result = await pool.query(`
      UPDATE users SET is_active = $1, updated_at = NOW() WHERE id = $2
      RETURNING id, name, username, role, pin_code IS NOT NULL as has_pin, is_active
    `, [Boolean(is_active), id]);

    res.json({
      success: true,
      message: `Status akun ${result.rows[0].name} berhasil diubah menjadi ${Boolean(is_active) ? 'Aktif' : 'Nonaktif'}.`,
      data: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
}
