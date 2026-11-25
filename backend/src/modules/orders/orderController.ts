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

// 2. VOID ORDER
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
    const { date, from, to, status, limit, offset } = req.query;
    const orders = await orderService.getOrders({
      date: date as string,
      from: from as string,
      to: to as string,
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
