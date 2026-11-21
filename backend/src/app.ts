import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { errorHandler } from './middlewares/errorHandler';
import { generalLimiter } from './middlewares/rateLimiter';

import authRoutes from './modules/auth/authRoutes';
import shiftRoutes from './modules/shifts/shiftRoutes';
import tableRoutes from './modules/tables/tableRoutes';
import productRoutes from './modules/products/productRoutes';
import orderRoutes from './modules/orders/orderRoutes';
import inventoryRoutes from './modules/inventory/inventoryRoutes';
import reportRoutes from './modules/reports/reportRoutes';
import promoRoutes from './modules/promos/promoRoutes';
import customerRoutes from './modules/customers/customerRoutes';
import reservationRoutes from './modules/reservations/reservationRoutes';
import printRoutes from './modules/printing/printRoutes';
import auditRoutes from './modules/audit/auditRoutes';
import purchasingRoutes from './modules/purchasing/purchasingRoutes';
import attendanceRoutes from './modules/attendance/attendanceRoutes';
import settingsRoutes from './modules/settings/settingsRoutes';
import notificationRoutes from './modules/notifications/notificationRoutes';

export function createApp(): Application {
  const app = express();

  // Security & Hardening
  app.disable('x-powered-by');
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));

  // Safe CORS with allowed origins
  const allowedOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
  ];

  app.use(cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Origin tidak diizinkan oleh kebijakan keamanan CORS.'));
      }
    },
    credentials: true,
  }));

  // DoS Protection
  app.use(generalLimiter);

  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));

  // Health Check
  app.get('/health', (req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'RUANG TEMU Backend API',
      timestamp: new Date().toISOString(),
    });
  });

  // API v1 Routes
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/shifts', shiftRoutes);
  app.use('/api/v1/tables', tableRoutes);
  app.use('/api/v1/products', productRoutes);
  app.use('/api/v1/orders', orderRoutes);
  app.use('/api/v1/inventory', inventoryRoutes);
  app.use('/api/v1/reports', reportRoutes);
  app.use('/api/v1/promos', promoRoutes);
  app.use('/api/v1/customers', customerRoutes);
  app.use('/api/v1/reservations', reservationRoutes);
  app.use('/api/v1/print', printRoutes);
  app.use('/api/v1/audit-logs', auditRoutes);
  app.use('/api/v1/purchasing', purchasingRoutes);
  app.use('/api/v1/attendance', attendanceRoutes);
  app.use('/api/v1/settings', settingsRoutes);
  app.use('/api/v1/notifications', notificationRoutes);

  // Global Error Handler
  app.use(errorHandler);

  return app;
}
