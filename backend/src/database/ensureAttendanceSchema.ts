import { pool } from '../config/database';

/**
 * Ensures PostgreSQL enums, tables, and columns required for:
 * - EMPLOYEE role and face recognition enrollment (`users.face_descriptor`, `face_photo_url`)
 * - GPS geofencing and attendance schedule settings (`store_settings`)
 * - Photo, GPS, radius, and lateness tracking (`employee_attendances`)
 */
export async function ensureAttendanceSchema(): Promise<void> {
  // ALTER TYPE ADD VALUE cannot execute reliably inside a multi-statement transaction block on all PG configs
  await pool.query(`ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'EMPLOYEE';`);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. User face enrollment columns
    await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS face_descriptor JSONB NULL,
      ADD COLUMN IF NOT EXISTS face_photo_url TEXT NULL;
    `);

    // 2. Store attendance GPS & schedule settings
    await client.query(`
      ALTER TABLE store_settings
      ADD COLUMN IF NOT EXISTS attendance_lat NUMERIC(10, 7) NULL DEFAULT -7.160500,
      ADD COLUMN IF NOT EXISTS attendance_lng NUMERIC(10, 7) NULL DEFAULT 113.479500,
      ADD COLUMN IF NOT EXISTS attendance_radius_meters INT NOT NULL DEFAULT 100,
      ADD COLUMN IF NOT EXISTS attendance_clock_in_time VARCHAR(5) NOT NULL DEFAULT '09:00',
      ADD COLUMN IF NOT EXISTS attendance_clock_out_time VARCHAR(5) NOT NULL DEFAULT '17:00',
      ADD COLUMN IF NOT EXISTS attendance_late_tolerance_minutes INT NOT NULL DEFAULT 15;
    `);

    // 3. Employee attendance GPS, photo & face audit columns
    await client.query(`
      ALTER TABLE employee_attendances
      ADD COLUMN IF NOT EXISTS clock_in_photo TEXT NULL,
      ADD COLUMN IF NOT EXISTS clock_out_photo TEXT NULL,
      ADD COLUMN IF NOT EXISTS clock_in_lat NUMERIC(10, 7) NULL,
      ADD COLUMN IF NOT EXISTS clock_in_lng NUMERIC(10, 7) NULL,
      ADD COLUMN IF NOT EXISTS clock_out_lat NUMERIC(10, 7) NULL,
      ADD COLUMN IF NOT EXISTS clock_out_lng NUMERIC(10, 7) NULL,
      ADD COLUMN IF NOT EXISTS clock_in_distance_meters NUMERIC(8, 2) NULL,
      ADD COLUMN IF NOT EXISTS clock_out_distance_meters NUMERIC(8, 2) NULL,
      ADD COLUMN IF NOT EXISTS clock_in_within_radius BOOLEAN NOT NULL DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS clock_out_within_radius BOOLEAN NULL,
      ADD COLUMN IF NOT EXISTS late_minutes INT NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS face_match_score NUMERIC(5, 3) NULL,
      ADD COLUMN IF NOT EXISTS clock_out_face_match_score NUMERIC(5, 3) NULL;
    `);

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
