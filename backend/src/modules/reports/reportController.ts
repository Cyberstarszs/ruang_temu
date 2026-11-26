import { Request, Response, NextFunction } from 'express';
import { pool } from '../../config/database';

function getTodayJakartaDate(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
}

export async function getDailySummary(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { date, from, to } = req.query; // Supports single 'date' or range 'from' & 'to' (defaults to today in Asia/Jakarta)
    const fromDate = from ? String(from) : (date ? String(date) : getTodayJakartaDate());
    const toDate = to ? String(to) : fromDate;

    const summaryRes = await pool.query(
      `SELECT 
         COUNT(*) as total_transactions,
         COALESCE(SUM(total_amount), 0) as net_sales,
         COALESCE(SUM(total_hpp), 0) as total_cogs,
         COALESCE(SUM(discount_amount), 0) as total_discounts
       FROM orders 
       WHERE status = 'PAID' 
         AND DATE(paid_at AT TIME ZONE 'Asia/Jakarta') >= $1 
         AND DATE(paid_at AT TIME ZONE 'Asia/Jakarta') <= $2`,
      [fromDate, toDate]
    );

    const topProductsRes = await pool.query(
      `SELECT 
         oi.product_name_snapshot as name,
         SUM(oi.quantity) as total_qty,
         SUM(oi.subtotal) as total_revenue
       FROM order_items oi
       JOIN orders o ON oi.order_id = o.id
       WHERE o.status = 'PAID' 
         AND DATE(o.paid_at AT TIME ZONE 'Asia/Jakarta') >= $1 
         AND DATE(o.paid_at AT TIME ZONE 'Asia/Jakarta') <= $2
       GROUP BY oi.product_name_snapshot
       ORDER BY total_qty DESC
       LIMIT 5`,
      [fromDate, toDate]
    );

    const s = summaryRes.rows[0];
    const totalTransactions = Number(s.total_transactions);
    const netSales = Number(s.net_sales);
    const totalCogs = Number(s.total_cogs);
    const totalDiscounts = Number(s.total_discounts || 0);
    const grossProfit = netSales - totalCogs;
    const avgBasket = totalTransactions > 0 ? Math.round(netSales / totalTransactions) : 0;

    res.json({
      success: true,
      data: {
        date: fromDate === toDate ? fromDate : `${fromDate} s.d. ${toDate}`,
        fromDate,
        toDate,
        totalTransactions,
        netSales,
        totalCogs,
        totalDiscounts,
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
    const { date, from, to } = req.query;
    const fromDate = from ? String(from) : (date ? String(date) : getTodayJakartaDate());
    const toDate = to ? String(to) : fromDate;

    const result = await pool.query(
      `SELECT 
         EXTRACT(HOUR FROM paid_at AT TIME ZONE 'Asia/Jakarta') as hour,
         COUNT(*) as transaction_count,
         COALESCE(SUM(total_amount), 0) as sales_volume
       FROM orders
       WHERE status = 'PAID' 
         AND DATE(paid_at AT TIME ZONE 'Asia/Jakarta') >= $1 
         AND DATE(paid_at AT TIME ZONE 'Asia/Jakarta') <= $2
       GROUP BY EXTRACT(HOUR FROM paid_at AT TIME ZONE 'Asia/Jakarta')
       ORDER BY hour ASC`,
      [fromDate, toDate]
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

export async function getMenuMatrix(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const productsRes = await pool.query(`
      SELECT 
        p.id,
        p.sku,
        p.name,
        p.category,
        p.price,
        COALESCE(
          (
            SELECT SUM(pr.quantity * i.unit_cost)
            FROM product_recipes pr
            JOIN ingredients i ON pr.ingredient_id = i.id
            WHERE pr.product_id = p.id
          ),
          p.price * 0.35
        ) as cost,
        COALESCE(
          (
            SELECT SUM(oi.quantity)
            FROM order_items oi
            JOIN orders o ON oi.order_id = o.id
            WHERE oi.product_id = p.id AND o.status = 'PAID'
          ),
          0
        ) as total_quantity_sold,
        COALESCE(
          (
            SELECT SUM(oi.subtotal)
            FROM order_items oi
            JOIN orders o ON oi.order_id = o.id
            WHERE oi.product_id = p.id AND o.status = 'PAID'
          ),
          0
        ) as total_revenue
      FROM products p
      WHERE p.is_active = TRUE
      ORDER BY total_quantity_sold DESC, p.name ASC
    `);

    const rawList = productsRes.rows.map((row) => {
      const price = Number(row.price);
      const cost = Number(row.cost);
      const qty = Number(row.total_quantity_sold);
      const rev = Number(row.total_revenue);
      const margin = price > 0 ? Math.max(0, ((price - cost) / price) * 100) : 0;
      return {
        id: row.id,
        sku: row.sku,
        name: row.name,
        category: row.category,
        price,
        cost: Math.round(cost),
        margin: Math.round(margin * 10) / 10,
        quantity: qty,
        revenue: rev,
      };
    });

    const totalQty = rawList.reduce((sum, item) => sum + item.quantity, 0);
    const avgQty = rawList.length > 0 ? totalQty / rawList.length : 1;
    const avgMargin = rawList.length > 0 ? rawList.reduce((sum, item) => sum + item.margin, 0) / rawList.length : 50;
    const maxQty = Math.max(1, ...rawList.map((i) => i.quantity));

    const categorized = rawList.map((item) => {
      let quadrant: 'BINTANG' | 'POTENSIAL' | 'PEKERJA_KERAS' | 'EVALUASI';
      if (item.quantity >= avgQty && item.margin >= avgMargin) {
        quadrant = 'BINTANG';
      } else if (item.quantity < avgQty && item.margin >= avgMargin) {
        quadrant = 'POTENSIAL';
      } else if (item.quantity >= avgQty && item.margin < avgMargin) {
        quadrant = 'PEKERJA_KERAS';
      } else {
        quadrant = 'EVALUASI';
      }
      return {
        ...item,
        quadrant,
        popularityPercentage: Math.round((item.quantity / maxQty) * 100),
      };
    });

    res.json({
      success: true,
      data: {
        products: categorized,
        benchmarks: {
          averageMargin: Math.round(avgMargin * 10) / 10,
          averageQuantity: Math.round(avgQty * 10) / 10,
          maxQuantity: maxQty,
          totalProducts: categorized.length,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}
