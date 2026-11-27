import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool, types } = pg;

// Kembalikan tipe DATE (OID 1082) sebagai string YYYY-MM-DD agar bebas pergeseran timezone saat dibandingkan dengan tanggal Asia/Jakarta
types.setTypeParser(1082, (val: string) => val);

export const pool = new Pool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'ruang_temu',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('[PostgreSQL] Unexpected client error:', err.message);
});

export async function query(text: string, params?: any[]) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  if (process.env.NODE_ENV === 'development') {
    // console.log(`[SQL] ${text.slice(0, 80)}... (${duration}ms, rows: ${res.rowCount})`);
  }
  return res;
}

export async function getClient() {
  const client = await pool.connect();
  return client;
}

export async function testConnection(): Promise<boolean> {
  try {
    const res = await pool.query('SELECT NOW() as current_time, current_database() as db_name');
    console.log(`[PostgreSQL] Connected successfully to ${res.rows[0].db_name} at ${res.rows[0].current_time}`);
    return true;
  } catch (err: any) {
    console.error('[PostgreSQL] Connection test failed:', err.message);
    return false;
  }
}
