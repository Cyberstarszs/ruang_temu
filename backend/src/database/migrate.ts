import fs from 'fs';
import path from 'path';
import { pool, testConnection } from '../config/database';

export async function runMigration() {
  console.log('[Migration] Checking database connection...');
  const connected = await testConnection();
  if (!connected) {
    console.error('[Migration] Aborting migration due to database connection error.');
    process.exit(1);
  }

  const schemaPath = path.join(__dirname, 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf-8');

  console.log('[Migration] Executing schema.sql...');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(schemaSql);
    await client.query('COMMIT');
    console.log('[Migration] Schema migration completed successfully!');
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('[Migration] Migration failed:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  runMigration()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
