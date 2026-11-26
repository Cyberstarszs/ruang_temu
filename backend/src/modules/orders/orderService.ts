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
    unitPriceAdjustment?: number;
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
  promoId?: string | null;
  promoCode?: string | null;
  notes?: string;
}

export class OrderService {
  // 1. POS DIRECT CHECKOUT (PAY-FIRST)
  async directCheckout(input: DirectCheckoutInput, user?: AuthUser) {
    const client = await pool.connect();
    try {
      let {
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
        promoId,
        promoCode,
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

      // 1. Verify active shift (with auto-fallback to cashier's active shift)
      let effectiveShiftId = shiftId;
      if (!effectiveShiftId && user?.id) {
        const activeShift = await client.query(
          `SELECT id FROM cashier_shifts WHERE cashier_id = $1 AND status = 'OPEN' ORDER BY opened_at DESC LIMIT 1`,
          [user.id]
        );
        if (activeShift.rows.length > 0) {
          effectiveShiftId = activeShift.rows[0].id;
        }
      }

      const shiftRes = await client.query(
        `SELECT id FROM cashier_shifts WHERE id = $1 AND status = 'OPEN'`,
        [effectiveShiftId]
      );
      if (shiftRes.rows.length === 0) {
        throw { statusCode: 400, message: 'Sif kasir tidak aktif atau sudah ditutup. Silakan buka sif terlebih dahulu.' };
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

      // 3. Verify Down Payment and Promo Discounts Server-Side
      let verifiedDownPayment = 0;
      if (reservationId) {
        const resvRes = await client.query(
          `SELECT id, down_payment_amount, is_dp_claimed, status 
           FROM reservations 
           WHERE id = $1 FOR UPDATE`,
          [reservationId]
        );

        if (resvRes.rows.length === 0) {
          throw { statusCode: 404, message: 'Data reservasi tidak ditemukan.' };
        }

        const resv = resvRes.rows[0];
        if (resv.status !== 'CONFIRMED') {
          throw { statusCode: 400, message: `Reservasi ini berstatus "${resv.status}" dan tidak dapat digunakan untuk klaim DP.` };
        }

        if (resv.is_dp_claimed) {
          throw { statusCode: 400, message: 'Uang muka (DP) untuk reservasi ini sudah pernah diklaim sebelumnya.' };
        }

        const maxDp = Number(resv.down_payment_amount);
        const reqDp = Number(claimedDownPayment || 0);

        if (reqDp > maxDp) {
          throw {
            statusCode: 400,
            message: `Klaim uang muka (Rp ${reqDp.toLocaleString('id-ID')}) melebihi DP tercatat reservasi (Rp ${maxDp.toLocaleString('id-ID')}).`,
          };
        }

        verifiedDownPayment = reqDp > 0 ? reqDp : maxDp;
      } else if (Number(claimedDownPayment) > 0) {
        throw {
          statusCode: 400,
          message: 'Klaim uang muka (DP) hanya dapat dilakukan dengan menyertakan ID Reservasi yang valid.',
        };
      }

      let verifiedDiscountAmount = 0;
      let verifiedPromoId: string | null = null;
      const isOfflineSyncOrder = Boolean(notes && notes.includes('[OFFLINE SYNC]'));

      if (promoId || promoCode) {
        const promoRes = await client.query(
          `SELECT * FROM promos 
           WHERE (id = $1 OR UPPER(code) = UPPER($2))
           FOR UPDATE`,
          [promoId || null, promoCode ? String(promoCode).trim() : null]
        );

        if (promoRes.rows.length > 0) {
          const promo = promoRes.rows[0];
          const todayJakarta = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());

          let isPromoValid = true;
          let promoInvalidReason = '';

          if (!promo.is_active) {
            isPromoValid = false;
            promoInvalidReason = `Promo "${promo.code}" sedang tidak aktif.`;
          } else if (promo.start_date && todayJakarta < promo.start_date) {
            isPromoValid = false;
            promoInvalidReason = `Promo "${promo.code}" belum mulai berlaku.`;
          } else if (promo.end_date && todayJakarta > promo.end_date) {
            isPromoValid = false;
            promoInvalidReason = `Promo "${promo.code}" sudah kedaluwarsa.`;
          } else if (promo.quota !== null && promo.used_count >= promo.quota) {
            isPromoValid = false;
            promoInvalidReason = `Kuota penggunaan promo "${promo.code}" telah habis.`;
          } else if (subtotal < Number(promo.min_spend || 0)) {
            isPromoValid = false;
            promoInvalidReason = `Subtotal pesanan (Rp ${subtotal.toLocaleString('id-ID')}) belum mencapai minimal belanja promo (Rp ${Number(promo.min_spend).toLocaleString('id-ID')}).`;
          }

          if (!isPromoValid) {
            if (isOfflineSyncOrder) {
              // Graceful offline tolerance: Don't reject the offline customer transaction that was already completed
              verifiedDiscountAmount = Math.min(Number(discountAmount || 0), subtotal);
              notes = `${notes || ''} [Offline Sync: Diskon ${promo.code} disetujui toleransi offline (${promoInvalidReason})]`;
            } else {
              throw { statusCode: 422, message: promoInvalidReason };
            }
          } else {
            let calculatedDiscount = 0;
            if (promo.discount_type === 'PERCENT') {
              calculatedDiscount = (Number(promo.discount_value) / 100) * subtotal;
              if (promo.max_discount && calculatedDiscount > Number(promo.max_discount)) {
                calculatedDiscount = Number(promo.max_discount);
              }
            } else if (promo.discount_type === 'FIXED_AMOUNT') {
              calculatedDiscount = Math.min(Number(promo.discount_value), subtotal);
            }

            verifiedDiscountAmount = Math.round(calculatedDiscount);
            verifiedPromoId = promo.id;

            // Atomically increment promo usage counter
            await client.query(
              `UPDATE promos SET used_count = used_count + 1, updated_at = NOW() WHERE id = $1`,
              [promo.id]
            );
          }
        } else if (isOfflineSyncOrder && Number(discountAmount) > 0) {
          verifiedDiscountAmount = Math.min(Number(discountAmount), subtotal);
        }
      } else if (Number(discountAmount) > 0) {
        // Direct manual discount (capped at subtotal)
        verifiedDiscountAmount = Math.min(Number(discountAmount), subtotal);
      }

      // Fetch store settings for tax, service charge, and rounding
      const settingsRes = await client.query(`SELECT tax_rate, service_charge_rate, rounding_rule FROM store_settings LIMIT 1`);
      const storeSettings = settingsRes.rows[0] || { tax_rate: 0, service_charge_rate: 0, rounding_rule: 1 };

      const taxRateNum = Number(storeSettings.tax_rate) || 0;
      const serviceChargeRateNum = Number(storeSettings.service_charge_rate) || 0;
      const roundingRuleNum = Number(storeSettings.rounding_rule) || 1;

      const netSubtotal = Math.max(0, subtotal - verifiedDiscountAmount - verifiedDownPayment);
      
      const serviceChargeAmount = serviceChargeRateNum > 0
        ? Math.round((netSubtotal * serviceChargeRateNum) / 100)
        : 0;

      const taxAmount = taxRateNum > 0
        ? Math.round(((netSubtotal + serviceChargeAmount) * taxRateNum) / 100)
        : 0;

      const rawTotal = netSubtotal + serviceChargeAmount + taxAmount;

      let roundedTotal = rawTotal;
      let roundingAmount = 0;
      if (roundingRuleNum > 1 && rawTotal > 0) {
        roundedTotal = Math.round(rawTotal / roundingRuleNum) * roundingRuleNum;
        roundingAmount = roundedTotal - rawTotal;
      }

      const totalAmount = Math.max(0, roundedTotal);

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
        const rawTbl = tableNumberFallback.trim();
        const digits = rawTbl.replace(/\D/g, '');
        const findTbl = await client.query(
          `SELECT id FROM dining_tables 
           WHERE UPPER(table_number) = UPPER($1)
              OR (NULLIF($2, '') IS NOT NULL AND (
                   UPPER(table_number) = UPPER('M' || $2)
                OR UPPER(table_number) = UPPER('M' || LPAD($2, 2, '0'))
                OR REGEXP_REPLACE(table_number, '\\D', '', 'g') = $2
              ))
           LIMIT 1`,
          [rawTbl, digits]
        );
        if (findTbl.rows.length > 0) {
          resolvedTableId = findTbl.rows[0].id;
        }
      }

      // 6. Create Order
      const orderNumber = generateOrderNumber();
      const orderRes = await client.query(
        `INSERT INTO orders (
          order_number, shift_id, cashier_id, table_id, customer_id, reservation_id, promo_id,
          order_type, subtotal, discount_amount, claimed_down_payment,
          tax_rate, tax_amount, service_charge_rate, service_charge_amount, rounding_amount,
          total_amount, total_hpp, status, notes, paid_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, 'PAID', $19, NOW())
        RETURNING *`,
        [
          orderNumber,
          effectiveShiftId,
          user?.id || null,
          resolvedTableId,
          customerId || null,
          reservationId || null,
          verifiedPromoId,
          orderType,
          subtotal,
          verifiedDiscountAmount,
          verifiedDownPayment,
          taxRateNum,
          taxAmount,
          serviceChargeRateNum,
          serviceChargeAmount,
          roundingAmount,
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
          discountAmount: verifiedDiscountAmount,
          claimedDownPayment: verifiedDownPayment,
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

  // 2. VOID ORDER (Requires Owner PIN Authorization, with optional restock)
  async voidOrder(id: string, body: { managerPin: string; reason: string; restock?: boolean }) {
    const client = await pool.connect();
    try {
      const { managerPin, reason, restock = false } = body;

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

      // 1. Rollback promo voucher usage count
      if (order.promo_id) {
        await client.query(
          `UPDATE promos SET used_count = GREATEST(0, used_count - 1), updated_at = NOW() WHERE id = $1`,
          [order.promo_id]
        );
      }

      // 2. Unclaim reservation down payment
      if (order.reservation_id) {
        await client.query(
          `UPDATE reservations SET is_dp_claimed = FALSE, status = 'CONFIRMED' WHERE id = $1`,
          [order.reservation_id]
        );
      }

      // 3. Rollback earned loyalty points from customer
      if (order.customer_id && Number(order.total_amount) > 0) {
        const pointsToDeduct = Math.floor(Number(order.total_amount) / 10000);
        if (pointsToDeduct > 0) {
          await client.query(
            `UPDATE customers SET loyalty_points = GREATEST(0, loyalty_points - $1) WHERE id = $2`,
            [pointsToDeduct, order.customer_id]
          );
        }
      }

      // 4. Restock ingredients if requested
      if (restock) {
        for (const item of itemsRes.rows) {
          // Base recipe ingredients
          const recRes = await client.query(
            `SELECT ingredient_id, quantity, is_packaging_only FROM product_recipes WHERE product_id = $1`,
            [item.product_id]
          );

          for (const rec of recRes.rows) {
            if (rec.is_packaging_only && order.order_type !== 'TAKEAWAY') continue;
            const qtyToReturn = Number(rec.quantity) * item.quantity;
            await client.query(
              `UPDATE ingredients SET stock_actual = stock_actual + $1, updated_at = NOW() WHERE id = $2`,
              [qtyToReturn, rec.ingredient_id]
            );
            await client.query(
              `INSERT INTO stock_movements (ingredient_id, movement_type, quantity_change, resulting_balance, reference_id)
               VALUES ($1, 'VOID_RESTOCK', $2, (SELECT stock_actual FROM ingredients WHERE id = $1), $3)`,
              [rec.ingredient_id, qtyToReturn, order.order_number]
            );
          }

          // Modifiers substitute ingredients
          if (item.selected_modifiers) {
            try {
              const mods = typeof item.selected_modifiers === 'string'
                ? JSON.parse(item.selected_modifiers)
                : item.selected_modifiers;

              if (Array.isArray(mods)) {
                for (const mod of mods) {
                  if (mod.id) {
                    const modOptRes = await client.query(
                      `SELECT substitute_ingredient_id, quantity_delta FROM modifier_options WHERE id = $1`,
                      [mod.id]
                    );
                    if (modOptRes.rows.length > 0) {
                      const mOpt = modOptRes.rows[0];
                      if (mOpt.substitute_ingredient_id && Number(mOpt.quantity_delta) > 0) {
                        const modQtyToReturn = Number(mOpt.quantity_delta) * item.quantity;
                        await client.query(
                          `UPDATE ingredients SET stock_actual = stock_actual + $1, updated_at = NOW() WHERE id = $2`,
                          [modQtyToReturn, mOpt.substitute_ingredient_id]
                        );
                        await client.query(
                          `INSERT INTO stock_movements (ingredient_id, movement_type, quantity_change, resulting_balance, reference_id)
                           VALUES ($1, 'VOID_RESTOCK', $2, (SELECT stock_actual FROM ingredients WHERE id = $1), $3)`,
                          [mOpt.substitute_ingredient_id, modQtyToReturn, `${order.order_number} (Restock: ${mod.name})`]
                        );
                      }
                    }
                  }
                }
              }
            } catch (err) {
              console.warn('[Void Order] Gagal memulihkan stok modifier:', err);
            }
          }
        }
      }

      // Free table if no other active paid orders on that table
      if (order.table_id) {
        const otherOrders = await client.query(
          `SELECT id FROM orders WHERE table_id = $1 AND status = 'PAID' AND id != $2`,
          [order.table_id, order.id]
        );
        if (otherOrders.rows.length === 0) {
          await client.query(
            `UPDATE dining_tables SET status = 'AVAILABLE', occupied_at = NULL, updated_at = NOW() WHERE id = $1`,
            [order.table_id]
          );
          eventBus.emit(ORDER_EVENTS.TABLE_STATUS_CHANGED, {
            tableId: order.table_id,
            tableNumber: order.table_number || '',
            status: 'AVAILABLE',
          });
        }
      }

      await client.query(
        `INSERT INTO audit_logs (user_id, action, target_table, target_id, details)
         VALUES ($1, 'VOID_ORDER', 'orders', $2, $3)`,
        [
          manager.id,
          order.id,
          JSON.stringify({
            orderNumber: order.order_number,
            reason,
            restock: Boolean(restock),
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
        reason: `${reason}${restock ? ' (Bahan Dikembalikan ke Stok)' : ' (Bahan Dianggap Limbah)'}`,
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
        restocked: Boolean(restock),
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // 3. GET ORDERS LIST
  async getOrders(filters: { date?: string; from?: string; to?: string; status?: string; limit?: number; offset?: number }) {
    const { date, from, to, status, limit = 50, offset = 0 } = filters;
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

    if (from && to) {
      conditions.push(`DATE(COALESCE(o.paid_at, o.created_at) AT TIME ZONE 'Asia/Jakarta') >= $${params.length + 1}`);
      params.push(from);
      conditions.push(`DATE(COALESCE(o.paid_at, o.created_at) AT TIME ZONE 'Asia/Jakarta') <= $${params.length + 1}`);
      params.push(to);
    } else if (from) {
      conditions.push(`DATE(COALESCE(o.paid_at, o.created_at) AT TIME ZONE 'Asia/Jakarta') >= $${params.length + 1}`);
      params.push(from);
    } else if (to) {
      conditions.push(`DATE(COALESCE(o.paid_at, o.created_at) AT TIME ZONE 'Asia/Jakarta') <= $${params.length + 1}`);
      params.push(to);
    } else if (date) {
      conditions.push(`DATE(COALESCE(o.paid_at, o.created_at) AT TIME ZONE 'Asia/Jakarta') = $${params.length + 1}`);
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
