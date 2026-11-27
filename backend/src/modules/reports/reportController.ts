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
         COALESCE(SUM(subtotal), 0) as gross_sales,
         COALESCE(SUM(discount_amount), 0) as total_discounts,
         COALESCE(SUM(GREATEST(0, subtotal - discount_amount)), 0) as net_sales,
         COALESCE(SUM(total_hpp), 0) as total_cogs,
         COALESCE(SUM(tax_amount), 0) as total_tax,
         COALESCE(SUM(service_charge_amount), 0) as total_service_charge,
         COALESCE(SUM(rounding_amount), 0) as total_rounding,
         COALESCE(SUM(claimed_down_payment), 0) as total_dp_claimed,
         COALESCE(SUM(total_amount), 0) as total_collected
       FROM orders 
       WHERE status = 'PAID' 
         AND DATE(COALESCE(paid_at, created_at) AT TIME ZONE 'Asia/Jakarta') >= $1 
         AND DATE(COALESCE(paid_at, created_at) AT TIME ZONE 'Asia/Jakarta') <= $2`,
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
         AND DATE(COALESCE(o.paid_at, o.created_at) AT TIME ZONE 'Asia/Jakarta') >= $1 
         AND DATE(COALESCE(o.paid_at, o.created_at) AT TIME ZONE 'Asia/Jakarta') <= $2
       GROUP BY oi.product_name_snapshot
       ORDER BY total_qty DESC
       LIMIT 5`,
      [fromDate, toDate]
    );

    const dailyTrendRes = await pool.query(
      `SELECT
         TO_CHAR(DATE(COALESCE(paid_at, created_at) AT TIME ZONE 'Asia/Jakarta'), 'YYYY-MM-DD') as date,
         COUNT(*)::int as count,
         COALESCE(SUM(GREATEST(0, subtotal - discount_amount)), 0) as revenue
       FROM orders
       WHERE status = 'PAID'
         AND DATE(COALESCE(paid_at, created_at) AT TIME ZONE 'Asia/Jakarta') >= $1
         AND DATE(COALESCE(paid_at, created_at) AT TIME ZONE 'Asia/Jakarta') <= $2
       GROUP BY DATE(COALESCE(paid_at, created_at) AT TIME ZONE 'Asia/Jakarta')
       ORDER BY DATE(COALESCE(paid_at, created_at) AT TIME ZONE 'Asia/Jakarta') ASC`,
      [fromDate, toDate]
    );

    const paymentBreakdownRes = await pool.query(
      `SELECT
         CASE WHEN op.payment_method IS NULL OR UPPER(op.payment_method::text) = 'CASH' THEN 'CASH' ELSE 'NON_CASH' END as channel,
         COALESCE(SUM(COALESCE(op.amount_paid, o.total_amount)), 0) as amount,
         COUNT(*)::int as tx_count
       FROM orders o
       LEFT JOIN order_payments op ON op.order_id = o.id
       WHERE o.status = 'PAID'
         AND DATE(COALESCE(o.paid_at, o.created_at) AT TIME ZONE 'Asia/Jakarta') >= $1
         AND DATE(COALESCE(o.paid_at, o.created_at) AT TIME ZONE 'Asia/Jakarta') <= $2
       GROUP BY 1`,
      [fromDate, toDate]
    );

    const orderTypeBreakdownRes = await pool.query(
      `SELECT
         o.order_type,
         COUNT(*)::int as count
       FROM orders o
       WHERE o.status = 'PAID'
         AND DATE(COALESCE(o.paid_at, o.created_at) AT TIME ZONE 'Asia/Jakarta') >= $1
         AND DATE(COALESCE(o.paid_at, o.created_at) AT TIME ZONE 'Asia/Jakarta') <= $2
       GROUP BY o.order_type`,
      [fromDate, toDate]
    );

    let cashAmount = 0;
    let cashCount = 0;
    let nonCashAmount = 0;
    let nonCashCount = 0;
    for (const row of paymentBreakdownRes.rows) {
      if (row.channel === 'CASH') {
        cashAmount += Number(row.amount || 0);
        cashCount += Number(row.tx_count || 0);
      } else {
        nonCashAmount += Number(row.amount || 0);
        nonCashCount += Number(row.tx_count || 0);
      }
    }

    let dineInCount = 0;
    let takeawayCount = 0;
    for (const row of orderTypeBreakdownRes.rows) {
      if (row.order_type === 'DINE_IN') {
        dineInCount += Number(row.count || 0);
      } else {
        takeawayCount += Number(row.count || 0);
      }
    }

    const s = summaryRes.rows[0];
    const totalTransactions = Number(s.total_transactions);
    const grossSales = Number(s.gross_sales || 0);
    const totalDiscounts = Number(s.total_discounts || 0);
    const netSales = Number(s.net_sales || 0);
    const totalCogs = Number(s.total_cogs || 0);
    const totalTax = Number(s.total_tax || 0);
    const totalServiceCharge = Number(s.total_service_charge || 0);
    const totalRounding = Number(s.total_rounding || 0);
    const totalDownPaymentClaimed = Number(s.total_dp_claimed || 0);
    const totalCollected = Number(s.total_collected || 0);
    const grossProfit = netSales - totalCogs;
    const avgBasket = totalTransactions > 0 ? Math.round(netSales / totalTransactions) : 0;

    res.json({
      success: true,
      data: {
        date: fromDate === toDate ? fromDate : `${fromDate} s.d. ${toDate}`,
        fromDate,
        toDate,
        totalTransactions,
        grossSales,
        netSales,
        totalCogs,
        totalDiscounts,
        totalTax,
        totalServiceCharge,
        totalRounding,
        totalDownPaymentClaimed,
        totalCollected,
        grossProfit,
        grossMarginPercentage: netSales > 0 ? ((grossProfit / netSales) * 100).toFixed(1) : '0',
        averageBasketSize: avgBasket,
        topProducts: topProductsRes.rows,
        dailyTrend: dailyTrendRes.rows.map((r) => ({
          date: r.date,
          count: Number(r.count || 0),
          revenue: Number(r.revenue || 0),
        })),
        paymentBreakdown: {
          cashAmount,
          cashCount,
          nonCashAmount,
          nonCashCount,
        },
        orderTypeBreakdown: {
          dineInCount,
          takeawayCount,
        },
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
         EXTRACT(HOUR FROM COALESCE(paid_at, created_at) AT TIME ZONE 'Asia/Jakarta') as hour,
         COUNT(*) as transaction_count,
         COALESCE(SUM(GREATEST(0, subtotal - discount_amount)), 0) as sales_volume
       FROM orders
       WHERE status = 'PAID' 
         AND DATE(COALESCE(paid_at, created_at) AT TIME ZONE 'Asia/Jakarta') >= $1 
         AND DATE(COALESCE(paid_at, created_at) AT TIME ZONE 'Asia/Jakarta') <= $2
       GROUP BY EXTRACT(HOUR FROM COALESCE(paid_at, created_at) AT TIME ZONE 'Asia/Jakarta')
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
    const { from, to, date } = req.query;
    const fromDate = from ? String(from) : (date ? String(date) : null);
    const toDate = to ? String(to) : fromDate;

    const productsRes = await pool.query(
      `SELECT 
        p.id,
        p.sku,
        p.name,
        p.category,
        p.price,
        EXISTS (SELECT 1 FROM product_recipes pr WHERE pr.product_id = p.id) as has_recipe,
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
              AND ($1::text IS NULL OR DATE(COALESCE(o.paid_at, o.created_at) AT TIME ZONE 'Asia/Jakarta') >= $1::date)
              AND ($2::text IS NULL OR DATE(COALESCE(o.paid_at, o.created_at) AT TIME ZONE 'Asia/Jakarta') <= $2::date)
          ),
          0
        ) as total_quantity_sold,
        COALESCE(
          (
            SELECT SUM(oi.subtotal)
            FROM order_items oi
            JOIN orders o ON oi.order_id = o.id
            WHERE oi.product_id = p.id AND o.status = 'PAID'
              AND ($1::text IS NULL OR DATE(COALESCE(o.paid_at, o.created_at) AT TIME ZONE 'Asia/Jakarta') >= $1::date)
              AND ($2::text IS NULL OR DATE(COALESCE(o.paid_at, o.created_at) AT TIME ZONE 'Asia/Jakarta') <= $2::date)
          ),
          0
        ) as total_revenue
      FROM products p
      WHERE p.is_active = TRUE
      ORDER BY total_quantity_sold DESC, p.name ASC`,
      [fromDate, toDate]
    );

    const rawList = productsRes.rows.map((row) => {
      const price = Number(row.price);
      const cost = Number(row.cost);
      const qty = Number(row.total_quantity_sold);
      const rev = Number(row.total_revenue);
      const hasRecipe = Boolean(row.has_recipe);
      const margin = price > 0 ? Math.max(0, ((price - cost) / price) * 100) : 0;
      return {
        id: row.id,
        sku: row.sku,
        name: row.name,
        category: row.category,
        price,
        cost: Math.round(cost),
        hasRecipe,
        isEstimatedCost: !hasRecipe,
        margin: Math.round(margin * 10) / 10,
        quantity: qty,
        revenue: rev,
      };
    });

    const totalQty = rawList.reduce((sum, item) => sum + item.quantity, 0);
    const avgQty = rawList.length > 0 ? totalQty / rawList.length : 1;
    const avgMargin = rawList.length > 0 ? rawList.reduce((sum, item) => sum + item.margin, 0) / rawList.length : 50;
    const maxQty = Math.max(1, ...rawList.map((i) => i.quantity));
    const unrecipiedCount = rawList.filter((i) => !i.hasRecipe).length;

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
          unrecipiedCount,
        },
        dateRange: {
          from: fromDate,
          to: toDate,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}
