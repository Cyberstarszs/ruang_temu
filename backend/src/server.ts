import http from 'http';
import dotenv from 'dotenv';
import { createApp } from './app';
import { initializeWebSocket, emitToClients } from './services/websocketService';
import { testConnection, pool } from './config/database';
import { initializePrintListener } from './modules/printing/printListener';
import { initializeOrderSocketListener } from './modules/orders/orderSocketListener';

dotenv.config();

const PORT = parseInt(process.env.PORT || '5000', 10);
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

function startQrOrderCleanupWorker() {
  // Check every 60 seconds for unpaid QR orders older than 15 minutes
  setInterval(async () => {
    try {
      const expiredRes = await pool.query(`
        UPDATE orders
        SET status = 'EXPIRED', updated_at = NOW()
        WHERE status = 'PENDING_PAYMENT_AT_CASHIER'
          AND created_at < (NOW() - INTERVAL '15 minutes')
        RETURNING id, table_id, order_number
      `);

      for (const exp of expiredRes.rows) {
        if (exp.table_id) {
          const otherOrders = await pool.query(
            `SELECT id FROM orders WHERE table_id = $1 AND status IN ('PAID', 'PENDING_PAYMENT_AT_CASHIER') AND id != $2`,
            [exp.table_id, exp.id]
          );
          if (otherOrders.rows.length === 0) {
            await pool.query(
              `UPDATE dining_tables SET status = 'AVAILABLE', occupied_at = NULL WHERE id = $1`,
              [exp.table_id]
            );
            emitToClients('table:status_change', { tableId: exp.table_id, status: 'AVAILABLE' });
          }
        }
        emitToClients('order:expired', { orderId: exp.id, orderNumber: exp.order_number });
      }
    } catch (err: any) {
      console.error('[Worker Warning] QR order expiration check failed:', err.message);
    }
  }, 60000);
}

async function bootstrap() {
  const app = createApp();
  const server = http.createServer(app);

  // Initialize Real-time WebSocket Service
  initializeWebSocket(server, FRONTEND_URL);

  // Initialize In-Process Domain Event Subscribers
  initializePrintListener();
  initializeOrderSocketListener();

  // Test Database Connection
  console.log('[System] Verifying database connectivity...');
  await testConnection();

  // Start Background Workers
  startQrOrderCleanupWorker();

  server.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`   RUANG TEMU BACKEND API (POS & BACKOFFICE)`);
    console.log(`   Status     : ONLINE`);
    console.log(`   Port       : ${PORT}`);
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`   Health     : http://localhost:${PORT}/health`);
    console.log(`====================================================`);
  });
}

bootstrap().catch((err) => {
  console.error('[System Fatal Error] Failed to bootstrap server:', err);
  process.exit(1);
});
