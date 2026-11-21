import { Request, Response, NextFunction } from 'express';
import { orderService } from './orderService';

// 1. DIRECT CHECKOUT AT POS (PAY-FIRST)
export async function checkoutDirect(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await orderService.directCheckout(req.body, req.user);
    res.status(201).json({
      success: true,
      message: 'Transaksi kasir berhasil diselesaikan.',
      data: result,
    });
  } catch (err: any) {
    if (err.statusCode) {
      res.status(err.statusCode).json({ success: false, message: err.message });
      return;
    }
    next(err);
  }
}

// 2. SUBMIT QR CUSTOMER ORDER
export async function submitQrOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await orderService.submitQrOrder(req.body);
    res.status(201).json({
      success: true,
      message: 'Pesanan berhasil dikirim ke kasir. Silakan sebutkan nomor meja Anda di kasir untuk menyelesaikan pembayaran.',
      data: result,
    });
  } catch (err: any) {
    if (err.statusCode) {
      res.status(err.statusCode).json({ success: false, message: err.message });
      return;
    }
    next(err);
  }
}

// 3. CASHIER PAY QR ORDER
export async function cashierPayQrOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await orderService.payQrOrder(req.params.id as string, req.body, req.user);
    res.json({
      success: true,
      message: 'Pembayaran pesanan QR berhasil dikonfirmasi. Tiket pesanan otomatis dikirim ke Bar & Dapur.',
      data: result,
    });
  } catch (err: any) {
    if (err.statusCode) {
      res.status(err.statusCode).json({ success: false, message: err.message });
      return;
    }
    next(err);
  }
}

// 4. VOID ORDER
export async function voidOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await orderService.voidOrder(req.params.id as string, req.body);
    res.json({
      success: true,
      message: 'Pesanan berhasil dibatalkan (VOID). Tiket pembatalan terkirim ke printer produksi.',
      data: result,
    });
  } catch (err: any) {
    if (err.statusCode) {
      res.status(err.statusCode).json({ success: false, message: err.message });
      return;
    }
    next(err);
  }
}

// 5. GET ORDERS
export async function getOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { date, status, limit, offset } = req.query;
    const orders = await orderService.getOrders({
      date: date as string,
      status: status as string,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
    res.json({
      success: true,
      data: orders,
    });
  } catch (err) {
    next(err);
  }
}
