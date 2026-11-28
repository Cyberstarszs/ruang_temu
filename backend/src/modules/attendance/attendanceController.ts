import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { pool } from '../../config/database';

const FACE_MATCH_MAX_DISTANCE = 0.58;

function getJakartaNowParts() {
  const now = new Date();
  const workDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(now);
  const timeParts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now);
  const hour = Number(timeParts.find((p) => p.type === 'hour')?.value ?? '0') % 24;
  const minute = Number(timeParts.find((p) => p.type === 'minute')?.value ?? '0');
  return { workDate, hour, minute };
}

function parseTimeToMinutes(hhmm: string | null | undefined, fallbackMinutes: number): number {
  if (!hhmm || !/^\d{2}:\d{2}$/.test(hhmm.trim())) return fallbackMinutes;
  const [h, m] = hhmm.trim().split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m) || h < 0 || h > 23 || m < 0 || m > 59) {
    return fallbackMinutes;
  }
  return h * 60 + m;
}

function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function euclideanDistance(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

function parseDescriptor(raw: any): number[] | null {
  if (!Array.isArray(raw) || raw.length !== 128) return null;
  const arr = raw.map(Number);
  if (arr.some((n) => !Number.isFinite(n))) return null;
  return arr;
}

function saveAttendancePhoto(base64Str: string | undefined, prefix: string): string | null {
  if (!base64Str || typeof base64Str !== 'string') return null;
  const matches = base64Str.trim().match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/i);
  if (!matches) return null;
  const ext = matches[1].toLowerCase() === 'jpeg' ? 'jpg' : matches[1].toLowerCase();
  const buffer = Buffer.from(matches[2], 'base64');
  if (buffer.length > 5 * 1024 * 1024) {
    throw { statusCode: 400, message: 'Ukuran foto presensi maksimal 5MB.' };
  }
  const dir = path.resolve(__dirname, '../../../uploads/attendances');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const filename = `${prefix}_${Date.now()}_${crypto.randomBytes(3).toString('hex')}.${ext}`;
  fs.writeFileSync(path.join(dir, filename), buffer);
  return `/uploads/attendances/${filename}`;
}

async function getAttendanceConfig() {
  const res = await pool.query(`
    SELECT store_name, attendance_lat, attendance_lng, attendance_radius_meters,
           attendance_clock_in_time, attendance_clock_out_time, attendance_late_tolerance_minutes
    FROM store_settings
    LIMIT 1
  `);
  const s = res.rows[0] || {};
  return {
    storeName: s.store_name || 'RUANG TEMU',
    lat: s.attendance_lat !== null && s.attendance_lat !== undefined ? Number(s.attendance_lat) : -7.1605,
    lng: s.attendance_lng !== null && s.attendance_lng !== undefined ? Number(s.attendance_lng) : 113.4795,
    radiusMeters: Number(s.attendance_radius_meters) || 100,
    clockInTime: s.attendance_clock_in_time || '09:00',
    clockOutTime: s.attendance_clock_out_time || '17:00',
    lateToleranceMinutes:
      s.attendance_late_tolerance_minutes !== null && s.attendance_late_tolerance_minutes !== undefined
        ? Number(s.attendance_late_tolerance_minutes)
        : 15,
  };
}

async function verifyUserFaceAndGps(
  userId: string,
  body: any,
  config: Awaited<ReturnType<typeof getAttendanceConfig>>
) {
  // 1. Verify User Registered Face
  const userRes = await pool.query(
    `SELECT id, face_descriptor FROM users WHERE id = $1`,
    [userId]
  );
  const storedRaw = userRes.rows[0]?.face_descriptor;
  const storedDescriptor = parseDescriptor(
    typeof storedRaw === 'string' ? JSON.parse(storedRaw) : storedRaw
  );

  if (!storedDescriptor) {
    throw {
      statusCode: 400,
      message: 'Wajah Anda belum didaftarkan. Minta Owner melakukan scan wajah di menu Karyawan terlebih dahulu.',
    };
  }

  const liveDescriptor = parseDescriptor(body?.faceDescriptor);
  if (!liveDescriptor) {
    throw {
      statusCode: 400,
      message: 'Wajah belum terdeteksi kamera. Pastikan wajah berada di bingkai kamera lalu coba lagi.',
    };
  }

  const faceScore = Number(euclideanDistance(liveDescriptor, storedDescriptor).toFixed(3));
  if (faceScore > FACE_MATCH_MAX_DISTANCE) {
    throw {
      statusCode: 403,
      message: 'Wajah tidak cocok dengan data wajah karyawan yang terdaftar.',
    };
  }

  // 2. Verify GPS Location & Radius
  const lat = Number(body?.latitude);
  const lng = Number(body?.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    throw {
      statusCode: 400,
      message: 'Koordinat GPS tidak valid. Aktifkan izin lokasi browser lalu segarkan GPS.',
    };
  }

  const distanceMeters = Number(calculateDistanceMeters(lat, lng, config.lat, config.lng).toFixed(2));
  const isWithinRadius = distanceMeters <= config.radiusMeters;

  if (!isWithinRadius) {
    throw {
      statusCode: 403,
      message: `Anda berada di luar radius lokasi kafe (${Math.round(distanceMeters)} m dari lokasi, batas ${config.radiusMeters} m).`,
    };
  }

  return { lat, lng, distanceMeters, isWithinRadius, faceScore };
}

// 1. CLOCK IN (Absen Masuk - Camera Face Verification + GPS + Schedule Tolerance)
export async function clockIn(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Autentikasi diperlukan.' });
      return;
    }

    const { notes, photoBase64 } = req.body || {};
    const { workDate, hour, minute } = getJakartaNowParts();

    const existing = await pool.query(
      `SELECT * FROM employee_attendances WHERE user_id = $1 AND work_date = $2::date`,
      [userId, workDate]
    );

    if (existing.rows.length > 0) {
      res.status(400).json({
        success: false,
        message: 'Anda sudah melakukan absen masuk hari ini.',
        data: existing.rows[0],
      });
      return;
    }

    const config = await getAttendanceConfig();
    const verified = await verifyUserFaceAndGps(userId, req.body, config);
    const photoUrl = saveAttendancePhoto(photoBase64, `in_${userId}`);
    if (!photoUrl) {
      res.status(400).json({ success: false, message: 'Foto wajah kamera wajib diambil saat absen masuk.' });
      return;
    }

    const scheduleInMinutes = parseTimeToMinutes(config.clockInTime, 9 * 60);
    const nowMinutes = hour * 60 + minute;
    const deadlineMinutes = scheduleInMinutes + config.lateToleranceMinutes;

    const isLate = nowMinutes > deadlineMinutes;
    const status = isLate ? 'LATE' : 'PRESENT';
    const lateMinutes = isLate ? Math.max(1, nowMinutes - scheduleInMinutes) : 0;

    const result = await pool.query(
      `INSERT INTO employee_attendances (
        user_id, work_date, clock_in, status, late_minutes, notes,
        clock_in_photo, clock_in_lat, clock_in_lng,
        clock_in_distance_meters, clock_in_within_radius, face_match_score
      )
      VALUES ($1, $2::date, CURRENT_TIMESTAMP, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        userId,
        workDate,
        status,
        lateMinutes,
        notes?.trim() || null,
        photoUrl,
        verified.lat,
        verified.lng,
        verified.distanceMeters,
        verified.isWithinRadius,
        verified.faceScore,
      ]
    );

    res.status(201).json({
      success: true,
      message: isLate
        ? `Absen masuk tercatat (Terlambat ${lateMinutes} menit).`
        : 'Absen masuk berhasil dicatat (Tepat Waktu).',
      data: result.rows[0],
    });
  } catch (err: any) {
    if (err?.statusCode) {
      res.status(err.statusCode).json({ success: false, message: err.message });
      return;
    }
    if (err?.code === '23505') {
      res.status(400).json({
        success: false,
        message: 'Anda sudah melakukan absen masuk hari ini.',
      });
      return;
    }
    next(err);
  }
}

// 2. CLOCK OUT (Absen Pulang - Camera Face Verification + GPS)
export async function clockOut(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Autentikasi diperlukan.' });
      return;
    }

    const { photoBase64, notes } = req.body || {};
    const { workDate } = getJakartaNowParts();

    const existing = await pool.query(
      `SELECT * FROM employee_attendances WHERE user_id = $1 AND work_date = $2::date`,
      [userId, workDate]
    );

    if (existing.rows.length === 0) {
      res.status(400).json({
        success: false,
        message: 'Anda belum melakukan absen masuk hari ini.',
      });
      return;
    }

    if (existing.rows[0].clock_out) {
      res.status(400).json({
        success: false,
        message: 'Anda sudah melakukan absen pulang hari ini.',
        data: existing.rows[0],
      });
      return;
    }

    const config = await getAttendanceConfig();
    const verified = await verifyUserFaceAndGps(userId, req.body, config);
    const photoUrl = saveAttendancePhoto(photoBase64, `out_${userId}`);
    if (!photoUrl) {
      res.status(400).json({ success: false, message: 'Foto wajah kamera wajib diambil saat absen pulang.' });
      return;
    }

    const clockInTime = new Date(existing.rows[0].clock_in).getTime();
    const nowTime = Date.now();
    const totalHours = Math.max(0, Number(((nowTime - clockInTime) / (1000 * 60 * 60)).toFixed(2)));

    const mergedNotes = notes?.trim()
      ? [existing.rows[0].notes, `Pulang: ${notes.trim()}`].filter(Boolean).join(' | ')
      : existing.rows[0].notes;

    const result = await pool.query(
      `UPDATE employee_attendances
       SET clock_out = CURRENT_TIMESTAMP,
           total_hours = $1,
           clock_out_photo = $2,
           clock_out_lat = $3,
           clock_out_lng = $4,
           clock_out_distance_meters = $5,
           clock_out_within_radius = $6,
           clock_out_face_match_score = $7,
           notes = $8
       WHERE id = $9
       RETURNING *`,
      [
        totalHours,
        photoUrl,
        verified.lat,
        verified.lng,
        verified.distanceMeters,
        verified.isWithinRadius,
        verified.faceScore,
        mergedNotes,
        existing.rows[0].id,
      ]
    );

    res.json({
      success: true,
      message: `Absen pulang berhasil dicatat. Total jam kerja hari ini: ${totalHours} jam.`,
      data: result.rows[0],
    });
  } catch (err: any) {
    if (err?.statusCode) {
      res.status(err.statusCode).json({ success: false, message: err.message });
      return;
    }
    next(err);
  }
}

// 3. GET TODAY STATUS, USER FACE PROFILE, SCHEDULE & PERSONAL HISTORY
export async function getTodayStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.id;
    const { workDate } = getJakartaNowParts();

    const [todayRes, userRes, historyRes, config] = await Promise.all([
      pool.query(
        `SELECT * FROM employee_attendances WHERE user_id = $1 AND work_date = $2::date`,
        [userId, workDate]
      ),
      pool.query(
        `SELECT id, name, username, role, face_descriptor, face_photo_url FROM users WHERE id = $1`,
        [userId]
      ),
      pool.query(
        `SELECT * FROM employee_attendances WHERE user_id = $1 ORDER BY work_date DESC LIMIT 14`,
        [userId]
      ),
      getAttendanceConfig(),
    ]);

    const userRow = userRes.rows[0];
    const parsedDescriptor = userRow?.face_descriptor
      ? parseDescriptor(
          typeof userRow.face_descriptor === 'string'
            ? JSON.parse(userRow.face_descriptor)
            : userRow.face_descriptor
        )
      : null;

    res.json({
      success: true,
      data: todayRes.rows[0] || null,
      meta: {
        workDate,
        config,
        hasFace: Boolean(parsedDescriptor),
        facePhotoUrl: userRow?.face_photo_url || null,
        faceDescriptor: parsedDescriptor,
        myRecent: historyRes.rows,
      },
    });
  } catch (err) {
    next(err);
  }
}

// 4. GET ATTENDANCE REPORT (Owner / Manager with Employee, Date Range, Status, Role Filters)
export async function getAttendanceList(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { startDate, endDate, userId, status, role } = req.query;
    const { workDate } = getJakartaNowParts();

    const conditions: string[] = [];
    const params: any[] = [];

    if (startDate && endDate) {
      conditions.push(`ea.work_date BETWEEN $${params.length + 1}::date AND $${params.length + 2}::date`);
      params.push(String(startDate), String(endDate));
    } else if (startDate) {
      conditions.push(`ea.work_date >= $${params.length + 1}::date`);
      params.push(String(startDate));
    } else if (endDate) {
      conditions.push(`ea.work_date <= $${params.length + 1}::date`);
      params.push(String(endDate));
    } else {
      conditions.push(`ea.work_date = $${params.length + 1}::date`);
      params.push(workDate);
    }

    if (userId && userId !== 'ALL') {
      conditions.push(`ea.user_id = $${params.length + 1}::uuid`);
      params.push(String(userId));
    }

    if (status && status !== 'ALL') {
      conditions.push(`ea.status = $${params.length + 1}`);
      params.push(String(status));
    }

    if (role && role !== 'ALL') {
      conditions.push(`u.role = $${params.length + 1}`);
      params.push(String(role));
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await pool.query(
      `SELECT ea.*,
              u.name as employee_name,
              u.username as employee_username,
              u.role as employee_role,
              u.face_photo_url as registered_face_url
       FROM employee_attendances ea
       JOIN users u ON ea.user_id = u.id
       ${whereClause}
       ORDER BY ea.work_date DESC, ea.clock_in DESC`,
      params
    );

    const rows = result.rows.map((r) => ({
      ...r,
      total_hours: r.total_hours !== null && r.total_hours !== undefined ? Number(r.total_hours) : null,
      clock_in_distance_meters:
        r.clock_in_distance_meters !== null && r.clock_in_distance_meters !== undefined
          ? Number(r.clock_in_distance_meters)
          : null,
      clock_out_distance_meters:
        r.clock_out_distance_meters !== null && r.clock_out_distance_meters !== undefined
          ? Number(r.clock_out_distance_meters)
          : null,
      late_minutes: Number(r.late_minutes || 0),
    }));

    const presentCount = rows.filter((r) => r.status === 'PRESENT').length;
    const lateCount = rows.filter((r) => r.status === 'LATE').length;
    const completedRows = rows.filter((r) => r.clock_out && r.total_hours !== null);
    const avgHours =
      completedRows.length > 0
        ? Number(
            (
              completedRows.reduce((s, r) => s + Number(r.total_hours || 0), 0) / completedRows.length
            ).toFixed(2)
          )
        : 0;

    res.json({
      success: true,
      data: rows,
      meta: {
        total: rows.length,
        presentCount,
        lateCount,
        completedCount: completedRows.length,
        avgHours,
      },
    });
  } catch (err) {
    next(err);
  }
}
