import { Request, Response, NextFunction } from 'express';
import { pool } from '../../config/database';

export async function getCustomers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { search, tier, sortBy, limit = 100, offset = 0 } = req.query;
    const params: any[] = [];
    const whereConditions: string[] = [];

    if (search && typeof search === 'string' && search.trim() !== '') {
      params.push(`%${search.trim()}%`);
      whereConditions.push(`(c.name ILIKE $${params.length} OR c.phone_number ILIKE $${params.length})`);
    }

    if (tier && typeof tier === 'string' && tier !== 'ALL') {
      params.push(tier.toUpperCase());
      whereConditions.push(`c.tier = $${params.length}`);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    let orderClause = 'ORDER BY c.created_at DESC';
    if (sortBy === 'spent') {
      orderClause = 'ORDER BY total_spent DESC, total_orders DESC';
    } else if (sortBy === 'visits') {
      orderClause = 'ORDER BY total_orders DESC, total_spent DESC';
    } else if (sortBy === 'points') {
      orderClause = 'ORDER BY c.loyalty_points DESC';
    } else if (sortBy === 'recent') {
      orderClause = 'ORDER BY last_visit DESC NULLS LAST, c.created_at DESC';
    } else if (sortBy === 'name') {
      orderClause = 'ORDER BY c.name ASC';
    } else if (sortBy === 'newest') {
      orderClause = 'ORDER BY c.created_at DESC';
    }

    params.push(Number(limit) || 100);
    const limitParam = `$${params.length}`;
    params.push(Number(offset) || 0);
    const offsetParam = `$${params.length}`;

    const queryStr = `
      SELECT 
        c.id,
        c.name,
        c.phone_number,
        c.tier,
        c.loyalty_points,
        c.created_at,
        COUNT(o.id) FILTER (WHERE o.status = 'PAID')::int AS total_orders,
        COALESCE(SUM(o.total_amount) FILTER (WHERE o.status = 'PAID'), 0)::numeric AS total_spent,
        MAX(o.paid_at) FILTER (WHERE o.status = 'PAID') AS last_visit
      FROM customers c
      LEFT JOIN orders o ON o.customer_id = c.id
      ${whereClause}
      GROUP BY c.id
      ${orderClause}
      LIMIT ${limitParam} OFFSET ${offsetParam}
    `;

    const result = await pool.query(queryStr, params);

    res.json({
      success: true,
      data: result.rows,
      meta: {
        total: result.rowCount,
        limit: Number(limit) || 100,
        offset: Number(offset) || 0,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getCustomerStats(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const customerStatsQuery = `
      SELECT 
        COUNT(*)::int AS total_customers,
        COALESCE(SUM(loyalty_points), 0)::int AS total_loyalty_points,
        COUNT(*) FILTER (WHERE tier = 'CLASSIC')::int AS classic_count,
        COUNT(*) FILTER (WHERE tier = 'SILVER')::int AS silver_count,
        COUNT(*) FILTER (WHERE tier = 'GOLD')::int AS gold_count,
        COUNT(*) FILTER (WHERE tier = 'PLATINUM')::int AS platinum_count
      FROM customers
    `;
    const customerStatsResult = await pool.query(customerStatsQuery);

    const orderStatsQuery = `
      SELECT
        COUNT(DISTINCT customer_id) FILTER (
          WHERE COALESCE(paid_at, created_at) >= (NOW() - INTERVAL '30 days')
        )::int AS active_customers_30d,
        COALESCE(SUM(total_amount), 0)::numeric AS total_customer_revenue,
        COUNT(id)::int AS total_customer_orders
      FROM orders
      WHERE customer_id IS NOT NULL AND status = 'PAID'
    `;
    const orderStatsResult = await pool.query(orderStatsQuery);

    const cRow = customerStatsResult.rows[0] || {};
    const oRow = orderStatsResult.rows[0] || {};

    const totalRevenue = Number(oRow.total_customer_revenue) || 0;
    const totalOrders = Number(oRow.total_customer_orders) || 0;
    const averageOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

    res.json({
      success: true,
      data: {
        totalCustomers: Number(cRow.total_customers) || 0,
        totalLoyaltyPoints: Number(cRow.total_loyalty_points) || 0,
        activeCustomers30d: Number(oRow.active_customers_30d) || 0,
        totalCustomerRevenue: totalRevenue,
        totalCustomerOrders: totalOrders,
        averageOrderValue,
        tierCounts: {
          CLASSIC: Number(cRow.classic_count) || 0,
          SILVER: Number(cRow.silver_count) || 0,
          GOLD: Number(cRow.gold_count) || 0,
          PLATINUM: Number(cRow.platinum_count) || 0,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getCustomerDetail(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    const customerQuery = `
      SELECT 
        c.id,
        c.name,
        c.phone_number,
        c.tier,
        c.loyalty_points,
        c.created_at,
        COUNT(o.id) FILTER (WHERE o.status = 'PAID')::int AS total_orders,
        COALESCE(SUM(o.total_amount) FILTER (WHERE o.status = 'PAID'), 0)::numeric AS total_spent,
        MAX(o.paid_at) FILTER (WHERE o.status = 'PAID') AS last_visit
      FROM customers c
      LEFT JOIN orders o ON o.customer_id = c.id
      WHERE c.id = $1
      GROUP BY c.id
    `;
    const customerResult = await pool.query(customerQuery, [id]);

    if (customerResult.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Pelanggan tidak ditemukan.' });
      return;
    }

    const customer = customerResult.rows[0];

    const ordersQuery = `
      SELECT 
        o.id,
        o.order_number,
        o.order_type,
        o.subtotal,
        o.discount_amount,
        o.total_amount,
        o.status,
        o.created_at,
        o.paid_at,
        t.table_number,
        COALESCE(
          (
            SELECT json_agg(json_build_object(
              'id', oi.id,
              'productName', oi.product_name_snapshot,
              'quantity', oi.quantity,
              'unitPrice', oi.unit_price_snapshot,
              'subtotal', oi.subtotal
            ))
            FROM order_items oi
            WHERE oi.order_id = o.id
          ),
          '[]'::json
        ) AS items,
        COALESCE(
          (
            SELECT json_agg(json_build_object(
              'id', op.id,
              'method', op.payment_method,
              'amountPaid', op.amount_paid
            ))
            FROM order_payments op
            WHERE op.order_id = o.id
          ),
          '[]'::json
        ) AS payments
      FROM orders o
      LEFT JOIN dining_tables t ON t.id = o.table_id
      WHERE o.customer_id = $1
      ORDER BY o.created_at DESC
      LIMIT 25
    `;
    const ordersResult = await pool.query(ordersQuery, [id]);

    res.json({
      success: true,
      data: {
        ...customer,
        recentOrders: ordersResult.rows,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function createCustomer(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name, phoneNumber, tier = 'CLASSIC', loyaltyPoints = 0 } = req.body;
    if (!name || !phoneNumber) {
      res.status(400).json({ success: false, message: 'Nama dan nomor telepon pelanggan wajib diisi.' });
      return;
    }

    const cleanPhone = phoneNumber.trim().replace(/\D/g, '');
    if (cleanPhone.length < 8 || cleanPhone.length > 15) {
      res.status(400).json({ success: false, message: 'Nomor telepon harus terdiri dari 8 hingga 15 digit angka.' });
      return;
    }

    const validTier = ['CLASSIC', 'SILVER', 'GOLD', 'PLATINUM'].includes(tier?.toUpperCase())
      ? tier.toUpperCase()
      : 'CLASSIC';
    const points = Math.max(0, parseInt(loyaltyPoints, 10) || 0);

    const result = await pool.query(
      `INSERT INTO customers (name, phone_number, tier, loyalty_points)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (phone_number) 
       DO UPDATE SET 
         name = EXCLUDED.name,
         tier = CASE WHEN EXCLUDED.tier <> 'CLASSIC' THEN EXCLUDED.tier ELSE customers.tier END
       RETURNING *`,
      [name.trim(), cleanPhone, validTier, points]
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

export async function updateCustomer(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { name, phoneNumber, tier, loyaltyPoints } = req.body;

    if (!name || !phoneNumber) {
      res.status(400).json({ success: false, message: 'Nama dan nomor telepon wajib diisi.' });
      return;
    }

    const cleanPhone = phoneNumber.trim().replace(/\D/g, '');
    if (cleanPhone.length < 8 || cleanPhone.length > 15) {
      res.status(400).json({ success: false, message: 'Nomor telepon harus terdiri dari 8 hingga 15 digit angka.' });
      return;
    }

    const validTier = ['CLASSIC', 'SILVER', 'GOLD', 'PLATINUM'].includes(tier?.toUpperCase())
      ? tier.toUpperCase()
      : 'CLASSIC';
    const points = Math.max(0, parseInt(loyaltyPoints, 10) || 0);

    const result = await pool.query(
      `UPDATE customers
       SET name = $1, phone_number = $2, tier = $3, loyalty_points = $4
       WHERE id = $5
       RETURNING *`,
      [name.trim(), cleanPhone, validTier, points, id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Pelanggan tidak ditemukan.' });
      return;
    }

    res.json({
      success: true,
      message: 'Data pelanggan berhasil diperbarui.',
      data: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteCustomer(req: Request, res: Response, next: NextFunction): Promise<void> {
  const client = await pool.connect();
  try {
    const id = req.params.id as string;

    await client.query('BEGIN');

    const custRes = await client.query(
      `SELECT id, name, phone_number, tier, loyalty_points FROM customers WHERE id = $1 FOR UPDATE`,
      [id]
    );
    if (custRes.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ success: false, message: 'Pelanggan tidak ditemukan.' });
      return;
    }

    const cust = custRes.rows[0];

    // Unlink customer from historical orders to keep financial reports clean
    await client.query(`UPDATE orders SET customer_id = NULL WHERE customer_id = $1`, [id]);

    await client.query(`DELETE FROM customers WHERE id = $1`, [id]);

    await client.query(
      `INSERT INTO audit_logs (user_id, action, target_table, target_id, details)
       VALUES ($1, 'DELETE_CUSTOMER', 'customers', $2, $3)`,
      [
        req.user?.id || null,
        id,
        JSON.stringify({
          deletedName: cust.name,
          deletedPhone: cust.phone_number,
          tier: cust.tier,
          loyaltyPoints: cust.loyalty_points,
        }),
      ]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: `Pelanggan ${cust.name} berhasil dihapus.`,
      data: { id: cust.id, name: cust.name },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}
