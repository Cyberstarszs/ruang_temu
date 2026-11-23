import { z } from 'zod';

export const directCheckoutSchema = z.object({
  shiftId: z.string().uuid({ message: 'Shift ID wajib berupa UUID yang valid' }),
  tableId: z.string().uuid().nullable().optional(),
  tableNumberFallback: z.string().optional(),
  orderType: z.enum(['DINE_IN', 'TAKEAWAY']).default('DINE_IN'),
  customerId: z.string().uuid().nullable().optional(),
  reservationId: z.string().uuid().nullable().optional(),
  items: z.array(
    z.object({
      productId: z.string().uuid({ message: 'Product ID wajib berupa UUID yang valid' }),
      quantity: z.number().int().positive({ message: 'Kuantitas harus bilangan positif' }),
      notes: z.string().optional(),
      modifiers: z.array(z.string()).optional(),
      unitPriceAdjustment: z.number().optional(),
    })
  ).min(1, { message: 'Keranjang belanja tidak boleh kosong' }),
  payments: z.array(
    z.object({
      method: z.enum(['CASH', 'QRIS', 'DEBIT', 'DEBIT_CARD', 'CREDIT', 'TRANSFER', 'BANK_TRANSFER']),
      amount: z.number().nonnegative(),
      cashReceived: z.number().nonnegative().optional(),
      cashChange: z.number().nonnegative().optional(),
      referenceNumber: z.string().optional(),
    })
  ).optional(),
  paymentMethod: z.enum(['CASH', 'QRIS', 'DEBIT', 'DEBIT_CARD', 'CREDIT', 'TRANSFER', 'BANK_TRANSFER']).optional(),
  cashReceived: z.number().nonnegative().optional(),
  cashChange: z.number().nonnegative().optional(),
  referenceNumber: z.string().optional(),
  discountAmount: z.number().nonnegative().default(0),
  claimedDownPayment: z.number().nonnegative().default(0),
  notes: z.string().optional(),
});

export const submitQrSchema = z.object({
  tableNumber: z.string().min(1, { message: 'Nomor meja wajib diisi' }),
  customerName: z.string().optional(),
  items: z.array(
    z.object({
      productId: z.string().uuid(),
      quantity: z.number().int().positive(),
      notes: z.string().optional(),
    })
  ).min(1, { message: 'Daftar pesanan wajib diisi' }),
  notes: z.string().optional(),
});

export const voidOrderSchema = z.object({
  managerPin: z.string().min(4, { message: 'PIN Owner wajib diisi' }),
  reason: z.string().min(3, { message: 'Alasan pembatalan wajib diisi minimal 3 karakter' }),
});
