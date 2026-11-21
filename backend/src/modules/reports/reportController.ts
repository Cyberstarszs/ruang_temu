import { Request, Response, NextFunction } from 'express';
import { pool } from '../../config/database';

export async function getDailySummary(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { date } = req.query; // YYYY-MM-DD (optional, defaults to today)
    const targetDate = date ? String(date) : new Date().toISOString().slice(0, 10);

    const summaryRes = await pool.query(
      `SELECT 
         COUNT(*) as total_transactions,
         COALESCE(SUM(total_amount), 0) as net_sales,
         COALESCE(SUM(total_hpp), 0) as total_cogs,
         COALESCE(SUM(discount_amount), 0) as total_discounts
       FROM orders 
       WHERE status = 'PAID' AND DATE(paid_at) = $1`,
      [targetDate]
    );

    const topProductsRes = await pool.query(
      `SELECT 
         oi.product_name_snapshot as name,
         SUM(oi.quantity) as total_qty,
         SUM(oi.subtotal) as total_revenue
       FROM order_items oi
       JOIN orders o ON oi.order_id = o.id
       WHERE o.status = 'PAID' AND DATE(o.paid_at) = $1
       GROUP BY oi.product_name_snapshot
       ORDER BY total_qty DESC
       LIMIT 5`,
      [targetDate]
    );

    const s = summaryRes.rows[0];
    const totalTransactions = Number(s.total_transactions);
    const netSales = Number(s.net_sales);
    const totalCogs = Number(s.total_cogs);
    const grossProfit = netSales - totalCogs;
    const avgBasket = totalTransactions > 0 ? Math.round(netSales / totalTransactions) : 0;

    res.json({
      success: true,
      data: {
        date: targetDate,
        totalTransactions,
        netSales,
        totalCogs,
        grossProfit,
        grossMarginPercentage: netSales > 0 ? ((grossProfit / netSales) * 100).toFixed(1) : '0',
        averageBasketSize: avgBasket,
        topProducts: topProductsRes.rows,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getHourlyHeatmap(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { date } = req.query;
    const targetDate = date ? String(date) : new Date().toISOString().slice(0, 10);

    const result = await pool.query(
      `SELECT 
         EXTRACT(HOUR FROM paid_at) as hour,
         COUNT(*) as transaction_count,
         COALESCE(SUM(total_amount), 0) as sales_volume
       FROM orders
       WHERE status = 'PAID' AND DATE(paid_at) = $1
       GROUP BY EXTRACT(HOUR FROM paid_at)
       ORDER BY hour ASC`,
      [targetDate]
    );

    res.json({
      success: true,
      data: result.rows.map((r) => ({
        hour: Number(r.hour),
        transactionCount: Number(r.transaction_count),
        salesVolume: Number(r.sales_volume),
      })),
    });
  } catch (err) {
    next(err);
  }
}
