import { pool } from '../../config/database';
import { eventBus } from '../../core/eventBus';
import { ORDER_EVENTS, PreparedOrderItem } from './orderEvents';
import { AuthUser } from '../../middlewares/auth';

function toJakartaYmd(val: string | Date): string {
  if (typeof val === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(val.trim())) return val.trim();
    const parsed = new Date(val);
    if (!isNaN(parsed.getTime())) {
      return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(parsed);
    }
    return val.slice(0, 10);
  }
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(val);
}

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
    variantId?: string | null;
    variantName?: string;
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
  discountAuthorizerPin?: string | null;
  managerPin?: string | null;
  claimedDownPayment?: number;
  promoId?: string | null;
  promoCode?: string | null;
  redeemPoints?: number;
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
        discountAuthorizerPin,
        managerPin,
        claimedDownPayment = 0,
        promoId,
        promoCode,
        redeemPoints = 0,
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

      const isOfflineSyncOrder = Boolean(notes && notes.includes('[OFFLINE SYNC]'));
      let offlineReroutedFromShiftId: string | null = null;

      // 1. Verify active shift (with offline sync auto-reroute to current active shift when original shift closed)
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

      const shiftRes = effectiveShiftId
        ? await client.query(
            `SELECT id, status FROM cashier_shifts WHERE id = $1 FOR SHARE`,
            [effectiveShiftId]
          )
        : { rows: [] };

      const shiftIsOpen = shiftRes.rows.length > 0 && shiftRes.rows[0].status === 'OPEN';

      if (!shiftIsOpen) {
        if (isOfflineSyncOrder) {
          // Prefer syncing cashier's active shift first, then any open store shift
          let rerouteRes = user?.id
            ? await client.query(
                `SELECT id FROM cashier_shifts WHERE cashier_id = $1 AND status = 'OPEN' ORDER BY opened_at DESC LIMIT 1 FOR SHARE`,
                [user.id]
              )
            : { rows: [] };

          if (rerouteRes.rows.length === 0) {
            rerouteRes = await client.query(
              `SELECT id FROM cashier_shifts WHERE status = 'OPEN' ORDER BY opened_at DESC LIMIT 1 FOR SHARE`
            );
          }

          if (rerouteRes.rows.length > 0) {
            offlineReroutedFromShiftId = effectiveShiftId || shiftId || null;
            effectiveShiftId = rerouteRes.rows[0].id;
            notes = `${notes} [Auto-Reroute: Dialihkan dari sif lama yang sudah tutup ke sif aktif]`;
          } else {
            throw {
              statusCode: 400,
              message: 'Sif asal transaksi offline sudah ditutup dan belum ada sif aktif saat ini. Silakan buka sif kasir terlebih dahulu lalu tekan Sinkronkan Ulang.',
            };
          }
        } else {
          throw { statusCode: 400, message: 'Sif kasir tidak aktif atau sudah ditutup. Silakan buka sif terlebih dahulu.' };
        }
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

        let resolvedVariantId: string | null = null;
        let resolvedVariantName: string | null = item.variantName?.trim() || null;
        let baseUnitPrice = Number(product.price);

        if (item.variantId) {
          const variantRes = await client.query(
            `SELECT id, name, price FROM product_variants WHERE id = $1 AND product_id = $2 AND is_active = TRUE`,
            [item.variantId, product.id]
          );
          if (variantRes.rows.length === 0) {
            throw { statusCode: 404, message: `Varian untuk menu "${product.name}" tidak ditemukan atau tidak aktif.` };
          }
          const variant = variantRes.rows[0];
          resolvedVariantId = variant.id;
          resolvedVariantName = variant.name;
          baseUnitPrice = Number(variant.price);
        }

        let itemFinalUnitPrice = baseUnitPrice;
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
              // Variant label passed in modifiers array uses variant's DB price, not regex adjustment
              if (resolvedVariantName && modId === resolvedVariantName) {
                selectedModifiersJson.push({
                  name: modId,
                  price: 0,
                  isVariant: true,
                });
                continue;
              }

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

        if (resolvedVariantName && !selectedModifiersJson.some((m) => m.name === resolvedVariantName)) {
          selectedModifiersJson.unshift({
            name: resolvedVariantName,
            price: 0,
            isVariant: true,
          });
        }

        // Apply price adjustment: use explicit unitPriceAdjustment relative to baseUnitPrice if provided, or fallback to parsed deltas
        if (item.unitPriceAdjustment !== undefined && item.unitPriceAdjustment !== null) {
          itemFinalUnitPrice = baseUnitPrice + Number(item.unitPriceAdjustment);
        } else {
          itemFinalUnitPrice += parsedTextModifierDeltaSum;
        }

        const itemSubtotal = itemFinalUnitPrice * item.quantity;
        subtotal += itemSubtotal;

        // Recipes: prioritize variant recipe if variantId exists; fallback to base product recipe (variant_id IS NULL)
        let recipesRes = resolvedVariantId
          ? await client.query(
              `SELECT pr.*, i.unit_cost, i.name as ing_name 
               FROM product_recipes pr
               JOIN ingredients i ON pr.ingredient_id = i.id
               WHERE pr.product_id = $1 AND pr.variant_id = $2`,
              [product.id, resolvedVariantId]
            )
          : null;

        if (!recipesRes || recipesRes.rows.length === 0) {
          recipesRes = await client.query(
            `SELECT pr.*, i.unit_cost, i.name as ing_name 
             FROM product_recipes pr
             JOIN ingredients i ON pr.ingredient_id = i.id
             WHERE pr.product_id = $1 AND pr.variant_id IS NULL`,
            [product.id]
          );
        }

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
          variantId: resolvedVariantId,
          variantName: resolvedVariantName,
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
      let manualDiscountAuthorizer: { id: string; name: string } | null = null;

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
          const startYmd = promo.start_date ? toJakartaYmd(promo.start_date) : null;
          const endYmd = promo.end_date ? toJakartaYmd(promo.end_date) : null;

          let isPromoValid = true;
          let promoInvalidReason = '';

          if (!promo.is_active) {
            isPromoValid = false;
            promoInvalidReason = `Promo "${promo.code}" sedang tidak aktif.`;
          } else if (startYmd && todayJakarta < startYmd) {
            isPromoValid = false;
            promoInvalidReason = `Promo "${promo.code}" belum mulai berlaku.`;
          } else if (endYmd && todayJakarta > endYmd) {
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
        } else {
          throw { statusCode: 404, message: 'Kode promo tidak ditemukan di sistem.' };
        }
      } else if (Number(discountAmount) > 0) {
        // Direct manual discount MUST be authorized by an active Owner PIN
        const pinToVerify = String(discountAuthorizerPin || managerPin || '').trim();
        if (!pinToVerify) {
          throw { statusCode: 403, message: 'Diskon manual di luar kode promo wajib otorisasi PIN Owner.' };
        }

        const authOwnerRes = await client.query(
          `SELECT id, name FROM users WHERE role = 'OWNER' AND pin_code = $1 AND is_active = TRUE`,
          [pinToVerify]
        );
        if (authOwnerRes.rows.length === 0) {
          throw { statusCode: 403, message: 'PIN Owner tidak valid untuk otorisasi diskon manual.' };
        }
        manualDiscountAuthorizer = authOwnerRes.rows[0];
        verifiedDiscountAmount = Math.min(Math.round(Number(discountAmount)), subtotal);
      }

      // 3b. Verify & apply loyalty point redemption (1 point = Rp 100)
      let verifiedRedeemPoints = 0;
      let pointsDiscountAmount = 0;
      const requestedPoints = Math.max(0, Math.floor(Number(redeemPoints || 0)));

      if (requestedPoints > 0) {
        if (!customerId) {
          throw {
            statusCode: 400,
            message: 'Penukaran poin loyalitas memerlukan data member pelanggan.',
          };
        }

        const custLockRes = await client.query(
          `SELECT id, name, loyalty_points, tier FROM customers WHERE id = $1 FOR UPDATE`,
          [customerId]
        );
        if (custLockRes.rows.length === 0) {
          throw { statusCode: 404, message: 'Data pelanggan tidak ditemukan.' };
        }

        const custRow = custLockRes.rows[0];
        const availablePoints = Math.max(0, Number(custRow.loyalty_points || 0));

        if (!isOfflineSyncOrder && requestedPoints > availablePoints) {
          throw {
            statusCode: 400,
            message: `Saldo poin ${custRow.name} tidak mencukupi (tersedia ${availablePoints} poin).`,
          };
        }

        const usableByBalance = Math.min(requestedPoints, availablePoints);
        const remainingAfterPromo = Math.max(0, subtotal - verifiedDiscountAmount);
        const maxPointsForBill = Math.floor(remainingAfterPromo / 100);
        verifiedRedeemPoints = Math.min(usableByBalance, maxPointsForBill);
        pointsDiscountAmount = verifiedRedeemPoints * 100;
      }

      const totalOrderDiscount = Math.min(subtotal, verifiedDiscountAmount + pointsDiscountAmount);

      // Fetch store settings for tax, service charge, and rounding
      const settingsRes = await client.query(`SELECT tax_rate, service_charge_rate, rounding_rule FROM store_settings LIMIT 1`);
      const storeSettings = settingsRes.rows[0] || { tax_rate: 0, service_charge_rate: 0, rounding_rule: 1 };

      const taxRateNum = Number(storeSettings.tax_rate) || 0;
      const serviceChargeRateNum = Number(storeSettings.service_charge_rate) || 0;
      const roundingRuleNum = Number(storeSettings.rounding_rule) || 1;

      // Dasar Pengenaan Pajak (DPP / Net Revenue) = Subtotal - Total Diskon (TIDAK dikurangi DP karena DP adalah pelunasan muka)
      const afterDiscountSubtotal = Math.max(0, subtotal - totalOrderDiscount);

      const serviceChargeAmount = serviceChargeRateNum > 0
        ? Math.round((afterDiscountSubtotal * serviceChargeRateNum) / 100)
        : 0;

      const taxAmount = taxRateNum > 0
        ? Math.round(((afterDiscountSubtotal + serviceChargeAmount) * taxRateNum) / 100)
        : 0;

      const grossBillBeforeDp = afterDiscountSubtotal + serviceChargeAmount + taxAmount;
      const appliedDownPayment = Math.min(verifiedDownPayment, grossBillBeforeDp);
      const unusedDownPayment = Math.max(0, verifiedDownPayment - appliedDownPayment);
      if (unusedDownPayment > 0) {
        notes = `${notes ? notes + ' ' : ''}[DP Reservasi Rp ${verifiedDownPayment.toLocaleString('id-ID')}: Terpakai Rp ${appliedDownPayment.toLocaleString('id-ID')}, Sisa DP Rp ${unusedDownPayment.toLocaleString('id-ID')}]`;
      }
      verifiedDownPayment = appliedDownPayment;

      const rawTotal = Math.max(0, grossBillBeforeDp - verifiedDownPayment);

      let roundedTotal = rawTotal;
      let roundingAmount = 0;
      if (roundingRuleNum > 1 && rawTotal > 0) {
        roundedTotal = Math.round(rawTotal / roundingRuleNum) * roundingRuleNum;
        roundingAmount = roundedTotal - rawTotal;
      }

      const totalAmount = Math.max(0, roundedTotal);

      // 4. Verify & normalize payments so SUM(amount_paid) === totalAmount (prevent overpayment shift inflation)
      if ((!paymentsList || paymentsList.length === 0) && paymentMethod) {
        const isCash = paymentMethod === 'CASH';
        const rec = isCash && cashReceived !== undefined ? Math.max(totalAmount, Number(cashReceived)) : undefined;
        const chg = isCash && rec !== undefined ? Math.max(0, rec - totalAmount) : 0;
        paymentsList = [{
          method: paymentMethod,
          amount: totalAmount,
          cashReceived: rec,
          cashChange: chg,
          referenceNumber: referenceNumber || undefined,
        }];
      }

      const rawPayments = paymentsList!.map((p: any) => ({
        ...p,
        amount: Math.max(0, Number(p.amount || 0)),
      }));

      const nonCashTotal = rawPayments
        .filter((p: any) => p.method !== 'CASH')
        .reduce((sum: number, p: any) => sum + p.amount, 0);

      if (nonCashTotal > totalAmount) {
        throw {
          statusCode: 400,
          message: `Nominal pembayaran non-tunai (Rp ${nonCashTotal.toLocaleString('id-ID')}) tidak boleh melebihi total tagihan (Rp ${totalAmount.toLocaleString('id-ID')}).`,
        };
      }

      const totalPaid = rawPayments.reduce((sum: number, p: any) => sum + p.amount, 0);
      if (totalPaid < totalAmount) {
        throw {
          statusCode: 400,
          message: `Nominal pembayaran (Rp ${totalPaid.toLocaleString('id-ID')}) kurang dari total tagihan (Rp ${totalAmount.toLocaleString('id-ID')}).`,
        };
      }

      let remainingCashNeeded = Math.max(0, totalAmount - nonCashTotal);
      const normalizedPayments: Array<{
        method: 'CASH' | 'QRIS' | 'DEBIT_CARD' | 'BANK_TRANSFER';
        amount: number;
        cashReceived?: number;
        cashChange?: number;
        referenceNumber?: string;
      }> = [];

      for (const p of rawPayments) {
        if (p.method !== 'CASH') {
          if (p.amount > 0 || totalAmount === 0) {
            normalizedPayments.push({
              method: p.method,
              amount: p.amount,
              cashChange: 0,
              referenceNumber: p.referenceNumber || undefined,
            });
          }
        } else {
          const tenderedRaw =
            p.cashReceived !== undefined && p.cashReceived !== null
              ? Math.max(Number(p.cashReceived), p.amount)
              : p.amount;
          const appliedCash = Math.min(remainingCashNeeded, p.amount);
          remainingCashNeeded = Math.max(0, remainingCashNeeded - appliedCash);
          const computedChange = Math.max(0, tenderedRaw - appliedCash);

          if (appliedCash > 0 || tenderedRaw > 0 || normalizedPayments.length === 0) {
            normalizedPayments.push({
              method: 'CASH',
              amount: appliedCash,
              cashReceived: tenderedRaw,
              cashChange: computedChange,
            });
          }
        }
      }

      // Drop redundant 0-amount legs if totalAmount > 0 and other legs already cover it
      paymentsList =
        totalAmount > 0
          ? normalizedPayments.filter((p) => p.amount > 0)
          : normalizedPayments.slice(0, 1);

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
          order_type, subtotal, discount_amount, redeemed_points, points_discount_amount, claimed_down_payment,
          tax_rate, tax_amount, service_charge_rate, service_charge_amount, rounding_amount,
          total_amount, total_hpp, status, notes, paid_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, 'PAID', $21, NOW())
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
          totalOrderDiscount,
          verifiedRedeemPoints,
          pointsDiscountAmount,
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
            order_id, product_id, variant_id, variant_name_snapshot, product_name_snapshot, quantity, unit_price_snapshot, unit_hpp_snapshot,
            subtotal, print_target, item_notes, selected_modifiers
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [
            order.id,
            pi.productId,
            pi.variantId || null,
            pi.variantName || null,
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

      // 8. Deduct Ingredient Stock Atomically (aggregated, sorted to avoid deadlocks, locked FOR UPDATE, zero negative balance allowed)
      const aggregatedDeductions = new Map<string, number>();
      for (const ded of stockDeductions) {
        const currentTotal = aggregatedDeductions.get(ded.ingredientId) || 0;
        aggregatedDeductions.set(ded.ingredientId, Number((currentTotal + ded.quantity).toFixed(3)));
      }

      const sortedDeductions = Array.from(aggregatedDeductions.entries()).sort((a, b) =>
        a[0].localeCompare(b[0])
      );

      for (const [ingredientId, totalQtyNeeded] of sortedDeductions) {
        if (totalQtyNeeded <= 0) continue;

        const ingLockRes = await client.query(
          `SELECT id, name, stock_actual, usage_unit FROM ingredients WHERE id = $1 FOR UPDATE`,
          [ingredientId]
        );

        if (ingLockRes.rows.length > 0) {
          const ing = ingLockRes.rows[0];
          const availableStock = Number(ing.stock_actual || 0);
          if (availableStock < totalQtyNeeded) {
            throw {
              statusCode: 400,
              message: `Stok bahan "${ing.name}" tidak mencukupi (tersedia ${availableStock.toLocaleString('id-ID')} ${ing.usage_unit}, dibutuhkan ${totalQtyNeeded.toLocaleString('id-ID')} ${ing.usage_unit}).`,
            };
          }

          const updateStockRes = await client.query(
            `UPDATE ingredients 
             SET stock_actual = stock_actual - $1, updated_at = NOW()
             WHERE id = $2 
             RETURNING stock_actual`,
            [totalQtyNeeded, ingredientId]
          );

          const newBal = updateStockRes.rows[0].stock_actual;
          await client.query(
            `INSERT INTO stock_movements (ingredient_id, movement_type, quantity_change, resulting_balance, reference_id)
             VALUES ($1, 'SALE', $2, $3, $4)`,
            [ingredientId, -totalQtyNeeded, newBal, order.order_number]
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

      // 11. Customer Loyalty Points (+1 point per Rp 10.000 of pre-tax net spend, -redeemedPoints, and auto tier upgrade)
      if (customerId) {
        const custRes = await client.query(
          `SELECT id, tier, loyalty_points FROM customers WHERE id = $1 FOR UPDATE`,
          [customerId]
        );
        if (custRes.rows.length > 0) {
          const cust = custRes.rows[0];
          const pointsEarned = afterDiscountSubtotal > 0 ? Math.floor(afterDiscountSubtotal / 10000) : 0;
          const netPointChange = pointsEarned - verifiedRedeemPoints;

          const spendRes = await client.query(
            `SELECT COALESCE(SUM(total_amount), 0) as lifetime_spend
             FROM orders
             WHERE customer_id = $1 AND status = 'PAID'`,
            [customerId]
          );
          const lifetimeSpend = Number(spendRes.rows[0]?.lifetime_spend || 0);

          let computedTier = 'CLASSIC';
          if (lifetimeSpend >= 2000000) computedTier = 'PLATINUM';
          else if (lifetimeSpend >= 750000) computedTier = 'GOLD';
          else if (lifetimeSpend >= 250000) computedTier = 'SILVER';

          const TIER_RANK: Record<string, number> = { CLASSIC: 1, SILVER: 2, GOLD: 3, PLATINUM: 4 };
          const currentTier = String(cust.tier || 'CLASSIC').toUpperCase();
          const finalTier = (TIER_RANK[computedTier] || 1) > (TIER_RANK[currentTier] || 1) ? computedTier : currentTier;

          await client.query(
            `UPDATE customers
             SET loyalty_points = GREATEST(0, loyalty_points + $1),
                 tier = $2
             WHERE id = $3`,
            [netPointChange, finalTier, customerId]
          );
        }
      }

      // 11b. Audit log for authorized manual discount outside promo code
      if (manualDiscountAuthorizer && verifiedDiscountAmount > 0) {
        await client.query(
          `INSERT INTO audit_logs (user_id, action, target_table, target_id, details)
           VALUES ($1, 'MANUAL_DISCOUNT', 'orders', $2, $3)`,
          [
            manualDiscountAuthorizer.id,
            order.id,
            JSON.stringify({
              orderNumber: order.order_number,
              subtotal,
              discountAmount: verifiedDiscountAmount,
              authorizedBy: manualDiscountAuthorizer.name,
              cashierId: user?.id || null,
            }),
          ]
        );
      }

      // 11c. Audit log when an offline sync order was rerouted to an active open shift
      if (offlineReroutedFromShiftId) {
        await client.query(
          `INSERT INTO audit_logs (user_id, action, target_table, target_id, details)
           VALUES ($1, 'OFFLINE_SHIFT_REROUTE', 'orders', $2, $3)`,
          [
            user?.id || null,
            order.id,
            JSON.stringify({
              orderNumber: order.order_number,
              originalShiftId: offlineReroutedFromShiftId,
              reroutedShiftId: effectiveShiftId,
            }),
          ]
        );
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
          discountAmount: totalOrderDiscount,
          promoDiscountAmount: verifiedDiscountAmount,
          redeemedPoints: verifiedRedeemPoints,
          pointsDiscountAmount,
          netSalesAmount: afterDiscountSubtotal,
          serviceChargeRate: serviceChargeRateNum,
          serviceChargeAmount,
          taxRate: taxRateNum,
          taxAmount,
          roundingAmount,
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
         WHERE o.id = $1 FOR UPDATE OF o`,
        [id]
      );

      if (orderRes.rows.length === 0) {
        throw { statusCode: 404, message: 'Pesanan tidak ditemukan.' };
      }

      const order = orderRes.rows[0];
      if (order.status === 'CANCELLED') {
        throw { statusCode: 400, message: 'Pesanan ini sudah pernah dibatalkan.' };
      }

      // Check shift status & payment methods for cross-shift cash refund reconciliation
      const shiftOriginRes = await client.query(
        `SELECT id, status FROM cashier_shifts WHERE id = $1`,
        [order.shift_id]
      );
      const originShiftStatus = shiftOriginRes.rows[0]?.status || 'OPEN';

      const orderPayRes = await client.query(
        `SELECT COALESCE(SUM(amount_paid), 0) as cash_paid
         FROM order_payments
         WHERE order_id = $1 AND payment_method = 'CASH'`,
        [order.id]
      );
      const cashPaidAmount = Number(orderPayRes.rows[0]?.cash_paid || 0);
      let refundMovementShiftId: string | null = null;
      let crossShiftCashNote = '';

      if (originShiftStatus === 'CLOSED' && cashPaidAmount > 0) {
        // Record CASH_OUT refund on currently open cashier drawer if available & sufficient
        const activeOpenShiftRes = await client.query(
          `SELECT id, opening_cash FROM cashier_shifts WHERE status = 'OPEN' ORDER BY opened_at DESC LIMIT 1 FOR UPDATE`
        );
        if (activeOpenShiftRes.rows.length > 0) {
          const activeShift = activeOpenShiftRes.rows[0];
          const sCashRes = await client.query(
            `SELECT COALESCE(SUM(op.amount_paid), 0) as cash_sales
             FROM orders o JOIN order_payments op ON o.id = op.order_id
             WHERE o.shift_id = $1 AND o.status = 'PAID' AND op.payment_method = 'CASH'`,
            [activeShift.id]
          );
          const pCashRes = await client.query(
            `SELECT
               COALESCE(SUM(CASE WHEN type = 'CASH_IN' THEN amount ELSE 0 END), 0) as cash_in,
               COALESCE(SUM(CASE WHEN type = 'CASH_OUT' THEN amount ELSE 0 END), 0) as cash_out
             FROM cash_movements WHERE shift_id = $1`,
            [activeShift.id]
          );
          const drawerBalance =
            Number(activeShift.opening_cash || 0) +
            Number(sCashRes.rows[0].cash_sales || 0) +
            Number(pCashRes.rows[0].cash_in || 0) -
            Number(pCashRes.rows[0].cash_out || 0);

          if (drawerBalance >= cashPaidAmount) {
            await client.query(
              `INSERT INTO cash_movements (shift_id, type, category, description, amount)
               VALUES ($1, 'CASH_OUT', 'VOID_REFUND', $2, $3)`,
              [
                activeShift.id,
                `Refund tunai VOID lintas sif (${order.order_number}): ${reason}`,
                cashPaidAmount,
              ]
            );
            refundMovementShiftId = activeShift.id;
            crossShiftCashNote = 'Refund tunai dicatat pada mutasi kas keluar sif aktif.';
          } else {
            crossShiftCashNote = 'Saldo laci sif aktif tidak mencukupi untuk potong laci otomatis (dicatat di audit void sebagai pengembalian kas besar/transfer).';
          }
        } else {
          crossShiftCashNote = 'Tidak ada sif aktif terbuka saat void; pengembalian dana ditangani dari kas besar/transfer.';
        }
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

      // 3. Rollback earned loyalty points & restore any redeemed points on customer row lock
      if (order.customer_id) {
        await client.query(`SELECT id FROM customers WHERE id = $1 FOR UPDATE`, [order.customer_id]);
        const orderNetSpend = Math.max(0, Number(order.subtotal || 0) - Number(order.discount_amount || 0));
        const pointsEarnedToDeduct = Math.floor(orderNetSpend / 10000);
        const pointsRedeemedToRefund = Math.max(0, Number(order.redeemed_points || 0));
        if (pointsEarnedToDeduct > 0 || pointsRedeemedToRefund > 0) {
          await client.query(
            `UPDATE customers SET loyalty_points = GREATEST(0, loyalty_points - $1 + $2) WHERE id = $3`,
            [pointsEarnedToDeduct, pointsRedeemedToRefund, order.customer_id]
          );
        }
      }

      // 4. Restock ingredients if requested
      if (restock) {
        for (const item of itemsRes.rows) {
          // Variant recipe if recorded (fallback to base product recipe)
          let recRes = item.variant_id
            ? await client.query(
                `SELECT ingredient_id, quantity, is_packaging_only FROM product_recipes WHERE product_id = $1 AND variant_id = $2`,
                [item.product_id, item.variant_id]
              )
            : null;

          if (!recRes || recRes.rows.length === 0) {
            recRes = await client.query(
              `SELECT ingredient_id, quantity, is_packaging_only FROM product_recipes WHERE product_id = $1 AND variant_id IS NULL`,
              [item.product_id]
            );
          }

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
            originShiftId: order.shift_id,
            originShiftStatus,
            crossShiftVoid: originShiftStatus === 'CLOSED',
            cashRefundAmount: cashPaidAmount,
            refundMovementShiftId,
            crossShiftCashNote: crossShiftCashNote || undefined,
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
  async getOrdersWithMeta(filters: { date?: string; from?: string; to?: string; status?: string; limit?: number; offset?: number }) {
    const { date, from, to, status, limit = 50, offset = 0 } = filters;
    const baseFrom = `
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

    const whereClause = conditions.length > 0 ? ` WHERE ` + conditions.join(' AND ') : '';

    const summaryRes = await pool.query(
      `SELECT
         COUNT(*)::int as total,
         COUNT(*) FILTER (WHERE o.status = 'PAID')::int as paid_count,
         COUNT(*) FILTER (WHERE o.status = 'CANCELLED')::int as void_count,
         COALESCE(SUM(o.total_amount) FILTER (WHERE o.status = 'PAID'), 0) as total_revenue,
         COALESCE(SUM(o.total_amount) FILTER (WHERE o.status = 'CANCELLED'), 0) as total_void_amount,
         COUNT(*) FILTER (WHERE o.status = 'PAID' AND o.order_type = 'DINE_IN')::int as dine_in_count,
         COUNT(*) FILTER (WHERE o.status = 'PAID' AND o.order_type = 'TAKEAWAY')::int as takeaway_count
       ${baseFrom}${whereClause}`,
      params
    );

    const query = `
      SELECT o.*, t.table_number, u.name as cashier_name, c.name as customer_name,
        COALESCE(
          (SELECT json_agg(json_build_object(
            'id', oi.id,
            'productId', oi.product_id,
            'variantId', oi.variant_id,
            'variantName', oi.variant_name_snapshot,
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
      ${baseFrom}${whereClause}
      ORDER BY o.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    const result = await pool.query(query, [...params, limit, offset]);
    const s = summaryRes.rows[0] || {};
    const paidCount = Number(s.paid_count || 0);
    const totalRevenue = Number(s.total_revenue || 0);

    return {
      rows: result.rows,
      meta: {
        total: Number(s.total || 0),
        limit,
        offset,
        summary: {
          paidCount,
          voidCount: Number(s.void_count || 0),
          totalRevenue,
          totalVoidAmount: Number(s.total_void_amount || 0),
          dineInCount: Number(s.dine_in_count || 0),
          takeawayCount: Number(s.takeaway_count || 0),
          aov: paidCount > 0 ? Math.round(totalRevenue / paidCount) : 0,
        },
      },
    };
  }

  async getOrders(filters: { date?: string; from?: string; to?: string; status?: string; limit?: number; offset?: number }) {
    const { rows } = await this.getOrdersWithMeta(filters);
    return rows;
  }
}

export const orderService = new OrderService();
