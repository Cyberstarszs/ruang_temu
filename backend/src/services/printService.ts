import net from 'net';
import { pool } from '../config/database';
import { emitToClients } from './websocketService';

export interface PrintJobData {
  orderId: string;
  orderNumber: string;
  tableNumber: string;
  orderType: string;
  items: Array<{
    name: string;
    quantity: number;
    notes?: string;
    modifiers?: string[];
  }>;
  docType: 'CHECKER_BAR' | 'CHECKER_KITCHEN' | 'VOID_BAR' | 'VOID_KITCHEN';
  specialNotes?: string;
}

export function formatEscPosChecker(job: PrintJobData): Buffer {
  const ESC = '\x1B';
  const GS = '\x1D';

  let text = '';
  // Initialize printer
  text += `${ESC}@`;
  // Center alignment
  text += `${ESC}a\x01`;
  
  if (job.docType.startsWith('VOID')) {
    // Double height & width, inverted for VOID
    text += `${ESC}!\x38`;
    text += `!!! BATAL / VOID !!!\n`;
    text += `${ESC}!\x00`;
    text += `JANGAN DIRACIK / STOP PRODUKSI\n`;
  } else {
    text += `${ESC}!\x18`; // Emphasized
    text += `RUANG TEMU\n`;
    text += `${ESC}!\x08`;
    text += `TIKET ${job.docType === 'CHECKER_BAR' ? 'BAR KOPI & MINUMAN' : 'DAPUR MAKANAN'}\n`;
  }
  
  text += `--------------------------------\n`;
  // Left alignment
  text += `${ESC}a\x00`;
  text += `${ESC}!\x00`; // Normal font
  text += `No. Pesanan : ${job.orderNumber}\n`;
  text += `Waktu       : ${new Date().toLocaleTimeString('id-ID')}\n`;
  text += `Tipe / Meja : ${job.orderType} / ${job.tableNumber}\n`;
  text += `--------------------------------\n`;

  // Item list with double-height item names
  for (const item of job.items) {
    text += `${ESC}!\x10`; // Double height
    text += `[ ] ${item.quantity} x ${item.name}\n`;
    text += `${ESC}!\x00`; // Normal

    if (item.modifiers && item.modifiers.length > 0) {
      for (const mod of item.modifiers) {
        text += `    * ${mod}\n`;
      }
    }
    if (item.notes) {
      text += `    Catatan: ${item.notes}\n`;
    }
    text += `\n`;
  }

  if (job.specialNotes) {
    text += `--------------------------------\n`;
    text += `Catatan Pesanan: ${job.specialNotes}\n`;
  }

  text += `================================\n\n\n\n`;
  // Partial cut
  text += `${GS}V\x00`;

  return Buffer.from(text, 'binary');
}

export async function queueAndSendPrintJob(
  orderId: string,
  docType: 'CHECKER_BAR' | 'CHECKER_KITCHEN' | 'VOID_BAR' | 'VOID_KITCHEN',
  targetIp: string,
  targetPort: number,
  jobData: PrintJobData
): Promise<void> {
  const payload = formatEscPosChecker(jobData);

  // Insert into print_queue in database
  const insertRes = await pool.query(
    `INSERT INTO print_queue (order_id, doc_type, target_ip, target_port, payload_escpos, status)
     VALUES ($1, $2, $3, $4, $5, 'PENDING')
     RETURNING id`,
    [orderId, docType, targetIp, targetPort, payload]
  );

  const jobId = insertRes.rows[0].id;

  // Asynchronously dispatch TCP print job
  dispatchSocketPrint(jobId, targetIp, targetPort, payload);
}

export function dispatchSocketPrint(jobId: string, ip: string, port: number, payload: Buffer) {
  const client = new net.Socket();
  client.setTimeout(3500);

  client.connect(port, ip, () => {
    client.write(payload, () => {
      client.end();
    });
  });

  client.on('close', async () => {
    await pool.query(
      `UPDATE print_queue SET status = 'SENT', updated_at = NOW() WHERE id = $1`,
      [jobId]
    );
    // console.log(`[Printer] Job ${jobId} successfully sent to ${ip}:${port}`);
  });

  client.on('error', async (err) => {
    client.destroy();
    console.error(`[Printer Warning] Unable to reach printer at ${ip}:${port} (${err.message}). Stored in queue.`);
    await pool.query(
      `UPDATE print_queue 
       SET status = 'FAILED', retry_count = retry_count + 1, error_message = $1, updated_at = NOW() 
       WHERE id = $2`,
      [err.message, jobId]
    );

    // Broadcast warning to POS Cashier interface via WebSocket
    emitToClients('printer:offline', {
      jobId,
      ip,
      port,
      errorMessage: err.message,
    });
  });

  client.on('timeout', () => {
    client.destroy();
    client.emit('error', new Error('Printer connection timed out'));
  });
}
