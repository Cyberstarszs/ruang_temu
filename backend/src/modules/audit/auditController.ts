import { Request, Response, NextFunction } from 'express';
import { pool } from '../../config/database';

export async function getAuditLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { action, limit = 50 } = req.query;
    let queryStr = `
      SELECT 
        al.*,
        u.name as actor_name,
        u.role as actor_role
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
    `;
    const params: any[] = [];

    if (action) {
      queryStr += ` WHERE al.action = $1`;
      params.push(action);
    }

    queryStr += ` ORDER BY al.created_at DESC LIMIT $${params.length + 1}`;
    params.push(Number(limit));

    const result = await pool.query(queryStr, params);
    res.json({
      success: true,
      data: result.rows,
    });
  } catch (err) {
    next(err);
  }
}
