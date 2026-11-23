import { pool } from '../../config/database';
import { eventBus } from '../../core/eventBus';
import { ORDER_EVENTS, PreparedOrderItem } from './orderEvents';
import { AuthUser } from '../../middlewares/auth';

function generateOrderNumber(): string {
  const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const timeMs = Date.now().toString().slice(-4);
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `RT-${todayStr}-${timeMs}${rand}`;
}

export interface DirectCheckoutInput {
  shiftId: string;
  tableId?: string | null;
  tableNumberFallback?: string | null;
  orderType?: 'DINE_IN' | 'TAKEAWAY';
  customerId?: string | null;
  reservationId?: string | null;
  items: Array<{
    productId: string;
    quantity: number;
    notes?: string;
    modifiers?: string[];
  }>;
  payments?: Array<{
    method: 'CASH' | 'QRIS' | 'DEBIT_CARD' | 'BANK_TRANSFER';
    amount: number;
    cashReceived?: number;
    cashChange?: number;
    referenceNumber?: string;
  }>;
  paymentMethod?: 'CASH' | 'QRIS' | 'DEBIT_CARD' | 'BANK_TRANSFER';
  cashReceived?: number;
  cashChange?: number;
  referenceNumber?: string;
  discountAmount?: number;
  claimedDownPayment?: number;
  notes?: string;
}

export class OrderService {
  // 1. POS DIRECT CHECKOUT (PAY-FIRST)
  async directCheckout(input: DirectCheckoutInput, user?: AuthUser) {
    const client = await pool.connect();
    try {
      const {
        shiftId,
        tableId,
        tableNumberFallback,
        orderType = 'DINE_IN',
        customerId,
        reservationId,
        items,
        paymentMethod,
        cashReceived,
        cashChange,
        referenceNumber,
        discountAmount = 0,
        claimedDownPayment = 0,
        notes,
      } = input;

      let paymentsList = input.payments;

      if (!items || items.length === 0) {
        throw { statusCode: 400, message: 'Keranjang belanja tidak boleh kosong.' };
      }

      if ((!paymentsList || paymentsList.length === 0) && !paymentMethod) {
        throw { statusCode: 400, message: 'Informasi pembayaran wajib diisi.' };
      }

      await client.query('BEGIN');

      // 1. Verify active shift
      const shiftRes = await client.query(
        `SELECT id FROM cashier_shifts WHERE id = $1 AND status = 'OPEN'`,
        [shiftId]
      );
      if (shiftRes.rows.length === 0) {
        throw { statusCode: 400, message: 'Sif kasir tidak aktif atau sudah ditutup.' };
      }

      // 2. Prepare items & compute HPP
      let subtotal = 0;
      let totalHpp = 0;
      const preparedItems: PreparedOrderItem[] = [];
      const stockDeductions: Array<{ ingredientId: string; quantity: number }> = [];

      for (const item of items) {
        const prodRes = await client.query(
          `SELECT id, name, price, print_target, is_force_sold_out 
           FROM products WHERE id = $1 AND is_active = TRUE`,
          [item.productId]
        );

        if (prodRes.rows.length === 0) {
          throw { statusCode: 404, message: `Produk ID ${item.productId} tidak ditemukan.` };
        }

        const product = prodRes.rows[0];
        if (product.is_force_sold_out) {
          throw { statusCode: 400, message: `Menu "${product.name}" sedang habis (Force Sold Out).` };
        }

        let itemFinalUnitPrice = Number(product.price);
        let itemBaseHpp = 0;
        const selectedModifiersJson: any[] = [];
        let parsedTextModifierDeltaSum = 0;

        // Modifiers (UUID or Custom Text)
        if (item.modifiers && item.modifiers.length > 0) {
          for (const modId of item.modifiers) {
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(modId);
            if (isUuid) {
              const modRes = await client.query(
                `SELECT * FROM modifier_options WHERE id = $1 AND (product_id = $2 OR product_id IS NULL)`,
                [modId, product.id]
              );
              if (modRes.rows.length > 0) {
                const mod = modRes.rows[0];
                itemFinalUnitPrice += Number(mod.price_adjustment);
                selectedModifiersJson.push({
                  id: mod.id,
                  name: mod.option_name,
                  price: Number(mod.price_adjustment),
                  action: mod.action_type,
                });

                if (mod.substitute_ingredient_id && Number(mod.quantity_delta) > 0) {
                  stockDeductions.push({
                    ingredientId: mod.substitute_ingredient_id,
                    quantity: Number(mod.quantity_delta) * item.quantity,
                  });
                }
              }
            } else {
              // Custom text modifier (e.g., "Ukuran Besar (+Rp 8.000)", "Oat Milk (+Rp 6.000)", "Extra Shot (+Rp 5.000)")
              let modPrice = 0;
              const match = modId.match(/\(\+Rp\s*([\d\.,]+)\)/i);
              if (match) {
                modPrice = Number(match[1].replace(/[^\d]/g, ''));
              }
              parsedTextModifierDeltaSum += modPrice;
              selectedModifiersJson.push({
                name: modId,
                price: modPrice,
              });
            }
          }
        }

        // Apply price adjustment: use explicit unitPriceAdjustment if provided, or fallback to parsed custom modifier deltas
        if (item.unitPriceAdjustment !== undefined && item.unitPriceAdjustment !== null) {
          itemFinalUnitPrice = Number(product.price) + Number(item.unitPriceAdjustment);
        } else {
          itemFinalUnitPrice += parsedTextModifierDeltaSum;
        }

        const itemSubtotal = itemFinalUnitPrice * item.quantity;
        subtotal += itemSubtotal;

        // Recipes
        const recipesRes = await client.query(
          `SELECT pr.*, i.unit_cost, i.name as ing_name 
           FROM product_recipes pr
           JOIN ingredients i ON pr.ingredient_id = i.id
           WHERE pr.product_id = $1`,
          [product.id]
        );

        for (const rec of recipesRes.rows) {
          // REAL-WORLD CAFE FILTER: Packaging only deducted if TAKEAWAY!
          if (rec.is_packaging_only && orderType !== 'TAKEAWAY') {
            continue;
          }

          const qtyNeeded = Number(rec.quantity) * item.quantity;
          itemBaseHpp += Number(rec.unit_cost) * Number(rec.quantity);
          stockDeductions.push({
            ingredientId: rec.ingredient_id,
            quantity: qtyNeeded,
          });
        }

        totalHpp += itemBaseHpp * item.quantity;

        preparedItems.push({
          productId: product.id,
          productName: product.name,
          quantity: item.quantity,
          unitPrice: itemFinalUnitPrice,
          unitHpp: itemBaseHpp,
          subtotal: itemSubtotal,
          printTarget: product.print_target,
          notes: item.notes || null,
          modifiers: selectedModifiersJson,
        });
      }

      // 3. Final amounts
      const totalAmount = Math.max(0, subtotal - Number(discountAmount) - Number(claimedDownPayment));

      // 4. Verify payments
      if ((!paymentsList || paymentsList.length === 0) && paymentMethod) {
        const rec = cashReceived !== undefined ? Number(cashReceived) : totalAmount;
        const chg = cashChange !== undefined ? Number(cashChange) : Math.max(0, rec - totalAmount);
        paymentsList = [{
          method: paymentMethod,
          amount: totalAmount,
          cashReceived: rec,
          cashChange: chg,
          referenceNumber: referenceNumber || undefined,
        }];
      }

      const totalPaid = paymentsList!.reduce((sum: number, p: any) => sum + Number(p.amount), 0);
      if (totalPaid < totalAmount) {
        throw {
          statusCode: 400,
          message: `Nominal pembayaran (Rp ${totalPaid.toLocaleString()}) kurang dari total tagihan (Rp ${totalAmount.toLocaleString()}).`,
        };
      }

      // 5. Resolve Table ID if fallback string matches table_number
      let resolvedTableId = tableId || null;
      if (!resolvedTableId && tableNumberFallback) {
        const findTbl = await client.query(
          `SELECT id FROM dining_tables WHERE UPPER(table_number) = UPPER($1) LIMIT 1`,
          [tableNumberFallback.trim()]
        );
        if (findTbl.rows.length > 0) {
          resolvedTableId = findTbl.rows[0].id;
        }
      }

      // 6. Create Order
      const orderNumber = generateOrderNumber();
      const orderRes = await client.query(
        `INSERT INTO orders (
          order_number, shift_id, cashier_id, table_id, customer_id, reservation_id,
          order_type, subtotal, discount_amount, claimed_down_payment, total_amount, total_hpp,
          status, notes, paid_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'PAID', $13, NOW())
        RETURNING *`,
        [
          orderNumber,
          shiftId,
          user?.id || null,
          resolvedTableId,
          customerId || null,
          reservationId || null,
          orderType,
          subtotal,
          discountAmount,
          claimedDownPayment,
          totalAmount,
          totalHpp,
          notes || null,
        ]
      );

      const order = orderRes.rows[0];

      // 6. Insert Order Items
      for (const pi of preparedItems) {
        await client.query(
          `INSERT INTO order_items (
            order_id, product_id, product_name_snapshot, quantity, unit_price_snapshot, unit_hpp_snapshot,
            subtotal, print_target, item_notes, selected_modifiers
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            order.id,
            pi.productId,
            pi.productName,
            pi.quantity,
            pi.unitPrice,
            pi.unitHpp,
            pi.subtotal,
            pi.printTarget,
            pi.notes,
            JSON.stringify(pi.modifiers),
          ]
        );
      }

      // 7. Insert Payments
      for (const pay of paymentsList!) {
        await client.query(
          `INSERT INTO order_payments (
            order_id, payment_method, amount_paid, cash_received, cash_change, reference_number
          ) VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            order.id,
            pay.method,
            pay.amount,
            pay.cashReceived || null,
            pay.cashChange || null,
            pay.referenceNumber || null,
          ]
        );
      }

      // 8. Deduct Ingredient Stock Atomically
      for (const ded of stockDeductions) {
        const updateStockRes = await client.query(
          `UPDATE ingredients 
           SET stock_actual = stock_actual - $1, updated_at = NOW()
           WHERE id = $2 
           RETURNING stock_actual`,
          [ded.quantity, ded.ingredientId]
        );

        if (updateStockRes.rows.length > 0) {
          const newBal = updateStockRes.rows[0].stock_actual;
          await client.query(
            `INSERT INTO stock_movements (ingredient_id, movement_type, quantity_change, resulting_balance, reference_id)
             VALUES ($1, 'SALE', $2, $3, $4)`,
            [ded.ingredientId, -ded.quantity, newBal, order.order_number]
          );
        }
      }

      // 9. Update Table Status to OCCUPIED
      let displayTableNumber = tableNumberFallback || 'Bawa Pulang';
      if (resolvedTableId && orderType === 'DINE_IN') {
        const tableUpdate = await client.query(
          `UPDATE dining_tables 
           SET status = 'OCCUPIED', occupied_at = NOW(), updated_at = NOW() 
           WHERE id = $1 
           RETURNING table_number`,
          [resolvedTableId]
        );
        if (tableUpdate.rows.length > 0) {
          displayTableNumber = tableUpdate.rows[0].table_number;
        }
      }

      // 10. Claim Reservation if applicable
      if (reservationId) {
        await client.query(
          `UPDATE reservations SET is_dp_claimed = TRUE, status = 'COMPLETED' WHERE id = $1`,
          [reservationId]
        );
      }

      // 11. Customer Loyalty Points (+1 point per Rp 10.000)
      if (customerId && totalAmount > 0) {
        const pointsEarned = Math.floor(totalAmount / 10000);
        if (pointsEarned > 0) {
          await client.query(
            `UPDATE customers SET loyalty_points = loyalty_points + $1 WHERE id = $2`,
            [pointsEarned, customerId]
          );
        }
      }

      await client.query('COMMIT');

      // 12. Dispatch Domain Event to In-Process EventBus
      eventBus.emit(ORDER_EVENTS.ORDER_PAID, {
        orderId: order.id,
        orderNumber: order.order_number,
        orderType,
        displayTableNumber,
        totalAmount: order.total_amount,
        tableId: resolvedTableId,
        items: preparedItems,
        payments: paymentsList,
        notes,
      });

      return {
        ...order,
        order,
        cash_change: paymentsList![0]?.cashChange ?? (paymentsList![0] as any)?.cash_change ?? 0,
        items: preparedItems,
        payments: paymentsList,
        receipt: {
          storeName: 'RUANG TEMU',
          tagline: 'Coffee, Eatery, Community',
          orderNumber: order.order_number,
          orderType: order.order_type,
          table: displayTableNumber,
          date: order.created_at,
          cashierName: user?.name || 'Kasir',
          subtotal,
          discountAmount,
          claimedDownPayment,
          totalAmount,
          payments: paymentsList,
        },
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // 2. SUBMIT QR CUSTOMER ORDER
  async submitQrOrder(body: { tableNumber: string; customerName?: string; items: any[]; notes?: string }) {
    const client = await pool.connect();
    try {
      const { tableNumber, customerName, items, notes } = body;

      if (!tableNumber || !items || items.length === 0) {
        throw { statusCode: 400, message: 'Nomor meja dan pesanan menu wajib diisi.' };
      }

      await client.query('BEGIN');

      const tableRes = await client.query(
        `SELECT id, table_number FROM dining_tables WHERE table_number = $1`,
        [tableNumber.trim().toUpperCase()]
      );

      if (tableRes.rows.length === 0) {
        throw { statusCode: 404, message: `Meja ${tableNumber} tidak ditemukan.` };
      }
      const table = tableRes.rows[0];

      const shiftRes = await client.query(
        `SELECT id FROM cashier_shifts WHERE status = 'OPEN' ORDER BY opened_at DESC LIMIT 1`
      );
      if (shiftRes.rows.length === 0) {
        throw { statusCode: 400, message: 'Kasir belum membuka sif hari ini. Silakan pesan langsung ke kasir.' };
      }
      const shiftId = shiftRes.rows[0].id;

      let subtotal = 0;
      const preparedItems: any[] = [];

      for (const item of items) {
        const prodRes = await client.query(
          `SELECT id, name, price, print_target, is_force_sold_out 
           FROM products WHERE id = $1 AND is_active = TRUE`,
          [item.productId]
        );

        if (prodRes.rows.length === 0) {
          throw { statusCode: 404, message: `Produk ID ${item.productId} tidak tersedia.` };
        }

        const product = prodRes.rows[0];
        if (product.is_force_sold_out) {
          throw { statusCode: 400, message: `Maaf, "${product.name}" sedang habis.` };
        }

        const itemSubtotal = Number(product.price) * item.quantity;
        subtotal += itemSubtotal;

        preparedItems.push({
          productId: product.id,
          productName: product.name,
          quantity: item.quantity,
          unitPrice: Number(product.price),
          subtotal: itemSubtotal,
          printTarget: product.print_target,
          notes: item.notes || null,
        });
      }

      const orderNumber = generateOrderNumber();
      const orderRes = await client.query(
        `INSERT INTO orders (
          order_number, shift_id, table_id, order_type, subtotal, total_amount,
          status, notes
        ) VALUES ($1, $2, $3, 'DINE_IN', $4, $4, 'PENDING_PAYMENT_AT_CASHIER', $5)
        RETURNING *`,
        [orderNumber, shiftId, table.id, subtotal, notes || null]
      );

      const order = orderRes.rows[0];

      for (const pi of preparedItems) {
        await client.query(
          `INSERT INTO order_items (
            order_id, product_id, product_name_snapshot, quantity, unit_price_snapshot, unit_hpp_snapshot,
            subtotal, print_target, item_notes
          ) VALUES ($1, $2, $3, $4, $5, 0, $6, $7, $8)`,
          [order.id, pi.productId, pi.productName, pi.quantity, pi.unitPrice, pi.subtotal, pi.printTarget, pi.notes]
        );
      }

      await client.query(
        `UPDATE dining_tables SET status = 'OCCUPIED', occupied_at = NOW(), updated_at = NOW() WHERE id = $1`,
        [table.id]
      );

      await client.query('COMMIT');

      // Dispatch event
      eventBus.emit(ORDER_EVENTS.QR_ORDER_RECEIVED, {
        orderId: order.id,
        orderNumber: order.order_number,
        tableNumber: table.table_number,
        totalAmount: subtotal,
      });

      return {
        id: order.id,
        orderId: order.id,
        orderNumber: order.order_number,
        order_number: order.order_number,
        tableNumber: table.table_number,
        totalAmount: subtotal,
        status: 'PENDING_PAYMENT_AT_CASHIER',
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // 3. CASHIER PAY QR ORDER
  async payQrOrder(id: string, body: any, user?: AuthUser) {
    const client = await pool.connect();
    try {
      const cashierId = user?.id;
      const { payments, paymentMethod, amountPaid, cashReceived, cashChange, referenceNumber } = body;

      let paymentsList = payments;
      if ((!paymentsList || paymentsList.length === 0) && paymentMethod) {
        paymentsList = [{
          method: paymentMethod,
          amount: amountPaid || cashReceived || 0,
          cashReceived: cashReceived || amountPaid || null,
          cashChange: cashChange || 0,
          referenceNumber: referenceNumber || null,
        }];
      }

      if (!paymentsList || paymentsList.length === 0) {
        throw { statusCode: 400, message: 'Informasi pembayaran wajib diisi.' };
      }

      await client.query('BEGIN');

      const orderRes = await client.query(
        `SELECT o.*, t.table_number FROM orders o LEFT JOIN dining_tables t ON o.table_id = t.id WHERE o.id = $1`,
        [id]
      );

      if (orderRes.rows.length === 0) {
        throw { statusCode: 404, message: 'Pesanan tidak ditemukan.' };
      }

      const order = orderRes.rows[0];
      if (order.status !== 'PENDING_PAYMENT_AT_CASHIER') {
        throw { statusCode: 400, message: `Status pesanan saat ini adalah ${order.status}, bukan menunggu pembayaran.` };
      }

      if (paymentsList && paymentsList.length === 1 && (!paymentsList[0].amount || Number(paymentsList[0].amount) === 0)) {
        paymentsList[0].amount = Number(order.total_amount);
      }

      const totalPaid = paymentsList.reduce((sum: number, p: any) => sum + Number(p.amount), 0);
      if (totalPaid < Number(order.total_amount)) {
        throw { statusCode: 400, message: 'Nominal pembayaran kurang dari total tagihan.' };
      }

      await client.query(
        `UPDATE orders SET status = 'PAID', cashier_id = $1, shift_id = COALESCE($3, shift_id), paid_at = NOW(), updated_at = NOW() WHERE id = $2`,
        [cashierId, order.id, body.shiftId || null]
      );

      for (const pay of paymentsList) {
        await client.query(
          `INSERT INTO order_payments (order_id, payment_method, amount_paid, cash_received, cash_change, reference_number)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [order.id, pay.method, pay.amount, pay.cashReceived || null, pay.cashChange || null, pay.referenceNumber || null]
        );
      }

      // Deduct stock for all items
      const itemsRes = await client.query(
        `SELECT oi.*, p.id as product_id, p.print_target 
         FROM order_items oi 
         JOIN products p ON oi.product_id = p.id 
         WHERE oi.order_id = $1`,
        [order.id]
      );

      for (const item of itemsRes.rows) {
        const recRes = await client.query(
          `SELECT ingredient_id, quantity, is_packaging_only FROM product_recipes WHERE product_id = $1`,
          [item.product_id]
        );

        for (const rec of recRes.rows) {
          if (rec.is_packaging_only && order.order_type !== 'TAKEAWAY') continue;
          const qtyToDeduct = Number(rec.quantity) * item.quantity;
          await client.query(
            `UPDATE ingredients SET stock_actual = stock_actual - $1, updated_at = NOW() WHERE id = $2`,
            [qtyToDeduct, rec.ingredient_id]
          );
          await client.query(
            `INSERT INTO stock_movements (ingredient_id, movement_type, quantity_change, resulting_balance, reference_id)
             VALUES ($1, 'SALE', $2, (SELECT stock_actual FROM ingredients WHERE id = $1), $3)`,
            [rec.ingredient_id, -qtyToDeduct, order.order_number]
          );
        }
      }

      await client.query('COMMIT');

      // Dispatch event to EventBus
      const preparedItems = itemsRes.rows.map((i) => ({
        productId: i.product_id,
        productName: i.product_name_snapshot,
        quantity: i.quantity,
        unitPrice: Number(i.unit_price_snapshot),
        unitHpp: Number(i.unit_hpp_snapshot),
        subtotal: Number(i.subtotal),
        printTarget: i.print_target,
        notes: i.item_notes,
        modifiers: [],
      }));

      eventBus.emit(ORDER_EVENTS.ORDER_PAID, {
        orderId: order.id,
        orderNumber: order.order_number,
        orderType: order.order_type,
        displayTableNumber: order.table_number || 'Bawa Pulang',
        totalAmount: order.total_amount,
        tableId: order.table_id,
        items: preparedItems,
        payments: paymentsList,
        notes: order.notes,
      });

      return {
        id: order.id,
        orderNumber: order.order_number,
        status: 'PAID',
        totalAmount: order.total_amount,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // 4. VOID ORDER (Requires Owner PIN Authorization)
  async voidOrder(id: string, body: { managerPin: string; reason: string }) {
    const client = await pool.connect();
    try {
      const { managerPin, reason } = body;

      if (!managerPin || !reason) {
        throw { statusCode: 400, message: 'PIN Owner dan alasan pembatalan wajib diisi.' };
      }

      const mgrRes = await client.query(
        `SELECT id, name FROM users WHERE role = 'OWNER' AND pin_code = $1 AND is_active = TRUE`,
        [managerPin.trim()]
      );

      if (mgrRes.rows.length === 0) {
        throw { statusCode: 403, message: 'PIN Owner tidak valid untuk otorisasi pembatalan.' };
      }
      const manager = mgrRes.rows[0];

      await client.query('BEGIN');

      const orderRes = await client.query(
        `SELECT o.*, t.table_number
         FROM orders o
         LEFT JOIN dining_tables t ON o.table_id = t.id
         WHERE o.id = $1`,
        [id]
      );

      if (orderRes.rows.length === 0) {
        throw { statusCode: 404, message: 'Pesanan tidak ditemukan.' };
      }

      const order = orderRes.rows[0];
      if (order.status === 'CANCELLED') {
        throw { statusCode: 400, message: 'Pesanan ini sudah pernah dibatalkan.' };
      }

      const itemsRes = await client.query(
        `SELECT oi.*, p.print_target
         FROM order_items oi
         JOIN products p ON oi.product_id = p.id
         WHERE oi.order_id = $1`,
        [order.id]
      );

      await client.query(
        `UPDATE orders SET status = 'CANCELLED', updated_at = NOW() WHERE id = $1`,
        [order.id]
      );

      await client.query(
        `INSERT INTO audit_logs (user_id, action, target_table, target_id, details)
         VALUES ($1, 'VOID_ORDER', 'orders', $2, $3)`,
        [
          manager.id,
          order.id,
          JSON.stringify({
            orderNumber: order.order_number,
            reason,
            authorizedBy: manager.name,
            totalAmount: order.total_amount,
          }),
        ]
      );

      await client.query('COMMIT');

      // Dispatch event
      eventBus.emit(ORDER_EVENTS.ORDER_VOIDED, {
        orderId: order.id,
        orderNumber: order.order_number,
        orderType: order.order_type,
        displayTableNumber: order.table_number || 'Bawa Pulang',
        reason,
        authorizedBy: manager.name,
        totalAmount: order.total_amount,
        items: itemsRes.rows.map((i) => ({
          name: i.product_name_snapshot,
          quantity: i.quantity,
          printTarget: i.print_target,
        })),
      });

      return {
        orderId: order.id,
        orderNumber: order.order_number,
        status: 'CANCELLED',
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // 5. GET ORDERS LIST
  async getOrders(filters: { date?: string; status?: string; limit?: number; offset?: number }) {
    const { date, status, limit = 50, offset = 0 } = filters;
    let query = `
      SELECT o.*, t.table_number, u.name as cashier_name, c.name as customer_name,
        COALESCE(
          (SELECT json_agg(json_build_object(
            'id', oi.id,
            'productId', oi.product_id,
            'productName', oi.product_name_snapshot,
            'quantity', oi.quantity,
            'unitPrice', oi.unit_price_snapshot,
            'subtotal', oi.subtotal,
            'printTarget', oi.print_target,
            'notes', oi.item_notes,
            'modifiers', oi.selected_modifiers
          )) FROM order_items oi WHERE oi.order_id = o.id),
          '[]'::json
        ) as items,
        COALESCE(
          (SELECT json_agg(json_build_object(
            'id', op.id,
            'method', op.payment_method,
            'amountPaid', op.amount_paid,
            'cashReceived', op.cash_received,
            'cashChange', op.cash_change,
            'referenceNumber', op.reference_number
          )) FROM order_payments op WHERE op.order_id = o.id),
          '[]'::json
        ) as payments
      FROM orders o
      LEFT JOIN dining_tables t ON o.table_id = t.id
      LEFT JOIN users u ON o.cashier_id = u.id
      LEFT JOIN customers c ON o.customer_id = c.id
    `;
    const params: any[] = [];
    const conditions: string[] = [];

    if (date) {
      conditions.push(`DATE(o.created_at) = $${params.length + 1}`);
      params.push(date);
    }

    if (status) {
      conditions.push(`o.status = $${params.length + 1}`);
      params.push(status);
    }

    if (conditions.length > 0) {
      query += ` WHERE ` + conditions.join(' AND ');
    }

    query += ` ORDER BY o.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    return result.rows;
  }
}

export const orderService = new OrderService();
