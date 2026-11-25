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
