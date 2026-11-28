'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { AttendanceConfig, AttendanceRecord } from '@/types';
import { FaceScanner, FaceScannerHandle, FaceDetectionStatus } from '@/components/common/FaceScanner';
import { MapPin, RefreshCw, LogOut, CheckCircle2, Clock, AlertCircle, Camera } from 'lucide-react';

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatWibTime(iso?: string | null): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jakarta',
  });
}

function WibClock() {
  const [nowClock, setNowClock] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNowClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{ fontSize: '28px', fontWeight: 800, fontFamily: 'monospace', color: '#1c2826', lineHeight: 1.1 }}>
      {nowClock.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZone: 'Asia/Jakarta',
      })}{' '}
      <span style={{ fontSize: '13px', fontWeight: 600, color: '#64746b' }}>WIB</span>
    </div>
  );
}

export default function AbsensiPage() {
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const router = useRouter();
  const scannerRef = useRef<FaceScannerHandle | null>(null);

  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [myRecent, setMyRecent] = useState<AttendanceRecord[]>([]);
  const [config, setConfig] = useState<AttendanceConfig | null>(null);
  const [hasFace, setHasFace] = useState<boolean>(true);
  const [faceDescriptor, setFaceDescriptor] = useState<number[] | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // GPS State
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);

  // Face Scanner live status
  const [faceStatus, setFaceStatus] = useState<FaceDetectionStatus>({
    modelsLoaded: false,
    cameraReady: false,
    faceDetected: false,
    faceMatched: null,
    distance: null,
    similarityPct: null,
    hint: null,
    error: null,
  });

  // Redirect to attendance login page if unauthenticated
  useEffect(() => {
    if (!authLoading && (!isAuthenticated || !user)) {
      router.replace('/absensi/login');
    }
  }, [authLoading, isAuthenticated, user, router]);

  const loadAttendanceData = useCallback(async () => {
    setLoadingData(true);
    try {
      const res = await api.attendance.getToday();
      if (res.success) {
        setTodayRecord(res.data || null);
        if (res.meta) {
          setConfig(res.meta.config);
          setHasFace(res.meta.hasFace);
          setFaceDescriptor(res.meta.faceDescriptor);
          setMyRecent(res.meta.myRecent || []);
        }
      }
    } catch (err: any) {
      setFeedback({ type: 'error', text: err?.message || 'Gagal memuat status absensi.' });
    } finally {
      setLoadingData(false);
    }
  }, []);

  const refreshGps = useCallback(() => {
    if (typeof window === 'undefined') return;
    if (!window.isSecureContext) {
      setGpsError('Deteksi GPS membutuhkan HTTPS atau akses melalui localhost.');
      return;
    }
    if (!navigator.geolocation) {
      setGpsError('Browser tidak mendukung deteksi lokasi GPS.');
      return;
    }
    setGpsLoading(true);
    setGpsError(null);

    let settled = false;
    const promptGuard = setTimeout(() => {
      if (!settled) {
        setGpsError('Menunggu izin lokasi browser. Klik Izinkan Lokasi lalu tekan Segarkan GPS.');
        setGpsLoading(false);
      }
    }, 8000);

    const onSuccess = (pos: GeolocationPosition) => {
      settled = true;
      clearTimeout(promptGuard);
      setGpsError(null);
      setGpsCoords({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: Math.round(pos.coords.accuracy),
      });
      setGpsLoading(false);
    };

    const onFallbackError = (err: GeolocationPositionError) => {
      settled = true;
      clearTimeout(promptGuard);
      const msg =
        err.code === 1
          ? 'Izin lokasi ditolak. Aktifkan GPS / izin lokasi di browser.'
          : 'Gagal mendeteksi koordinat GPS. Pastikan layanan lokasi aktif lalu segarkan GPS.';
      setGpsError(msg);
      setGpsLoading(false);
    };

    // High-accuracy first, automatic fallback to standard Wi-Fi/network location if GPS chip unavailable/timeout
    navigator.geolocation.getCurrentPosition(
      onSuccess,
      (err) => {
        if (err.code === 1) {
          onFallbackError(err);
          return;
        }
        navigator.geolocation.getCurrentPosition(onSuccess, onFallbackError, {
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 30000,
        });
      },
      { enableHighAccuracy: true, timeout: 7000, maximumAge: 0 }
    );
  }, []);

  useEffect(() => {
    if (isAuthenticated && user) {
      loadAttendanceData();
      refreshGps();
    }
  }, [isAuthenticated, user, loadAttendanceData, refreshGps]);

  if (authLoading || !isAuthenticated || !user) {
    return null;
  }

  const distanceMeters =
    gpsCoords && config
      ? Math.round(haversineMeters(gpsCoords.lat, gpsCoords.lng, config.lat, config.lng))
      : null;

  const isWithinRadius =
    distanceMeters !== null && config ? distanceMeters <= config.radiusMeters : false;

  const isCompletedToday = Boolean(todayRecord?.clock_in && todayRecord?.clock_out);
  const canClockIn = !todayRecord;
  const canClockOut = Boolean(todayRecord && !todayRecord.clock_out);

  const handleSubmitAttendance = async (action: 'IN' | 'OUT') => {
    setFeedback(null);

    if (!hasFace) {
      setFeedback({
        type: 'error',
        text: 'Wajah Anda belum didaftarkan oleh Owner di menu Karyawan.',
      });
      return;
    }

    if (!gpsCoords) {
      setFeedback({
        type: 'error',
        text: 'Lokasi GPS belum terdeteksi. Klik "Segarkan GPS" terlebih dahulu.',
      });
      return;
    }

    if (config && !isWithinRadius) {
      setFeedback({
        type: 'error',
        text: `Anda di luar area kafe (${distanceMeters}m, batas ${config.radiusMeters}m).`,
      });
      return;
    }

    setSubmitting(true);
    try {
      const captured = await scannerRef.current?.capture();
      if (!captured) {
        setFeedback({
          type: 'error',
          text: 'Wajah belum terbaca oleh kamera. Hadapkan wajah ke bingkai kamera.',
        });
        setSubmitting(false);
        return;
      }

      if (captured.distance !== undefined && captured.distance > 0.58) {
        setFeedback({
          type: 'error',
          text: 'Wajah tidak cocok dengan wajah karyawan yang login. Coba pencahayaan yang cukup.',
        });
        setSubmitting(false);
        return;
      }

      const payload = {
        latitude: gpsCoords.lat,
        longitude: gpsCoords.lng,
        photoBase64: captured.photoBase64,
        faceDescriptor: captured.descriptor,
        notes: notes.trim() || undefined,
      };

      const res =
        action === 'IN'
          ? await api.attendance.clockIn(payload)
          : await api.attendance.clockOut(payload);

      if (res.success) {
        setFeedback({ type: 'success', text: res.message });
        setNotes('');
        await loadAttendanceData();
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err?.message || 'Gagal mencatat absensi.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.replace('/absensi/login');
  };

  const roleLabel =
    user.role === 'OWNER' ? 'Owner' : user.role === 'CASHIER' ? 'Kasir' : 'Karyawan';

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f7f7f4',
        fontFamily: "'Plus Jakarta Sans', var(--font-jakarta), sans-serif",
        color: '#1c2826',
      }}
    >
      {/* Minimalist Top Bar */}
      <header
        style={{
          minHeight: '58px',
          background: '#ffffff',
          borderBottom: '1px solid #e7e8e3',
          padding: '8px 16px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
          position: 'sticky',
          top: 0,
          zIndex: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
          <img
            src="/brand/ruang-temu-navbar.png"
            alt="RUANG TEMU"
            style={{
              height: '28px',
              width: 'auto',
              maxWidth: '115px',
              objectFit: 'contain',
              filter: 'brightness(0.18)',
              display: 'block',
              flexShrink: 0,
            }}
          />
          <span style={{ color: '#d4d4d8' }}>|</span>
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#1c2826', whiteSpace: 'nowrap' }}>
            Absensi Karyawan
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {user.role === 'OWNER' && (
            <Link
              href="/karyawan"
              style={{
                padding: '6px 12px',
                borderRadius: '7px',
                border: '1px solid #dcdfd5',
                background: '#fbfbf9',
                color: '#374151',
                fontSize: '12px',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              Backoffice
            </Link>
          )}
          {user.role === 'CASHIER' && (
            <Link
              href="/pos"
              style={{
                padding: '6px 12px',
                borderRadius: '7px',
                border: '1px solid #dcdfd5',
                background: '#fbfbf9',
                color: '#374151',
                fontSize: '12px',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              Ke Kasir POS
            </Link>
          )}
          <div
            style={{
              padding: '5px 10px',
              borderRadius: '999px',
              background: '#f2f4ef',
              fontSize: '12px',
              fontWeight: 600,
              color: '#1c2826',
            }}
          >
            {user.name} · {roleLabel}
          </div>
          <button
            type="button"
            onClick={handleLogout}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '6px 11px',
              borderRadius: '7px',
              border: '1px solid #fecaca',
              background: '#fef2f2',
              color: '#b91c1c',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <LogOut size={13} />
            <span>Keluar</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main
        style={{
          maxWidth: '920px',
          margin: '0 auto',
          padding: '20px 16px 48px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        {/* Top Status & Clock Strip */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e7e8e3',
            padding: '16px 20px',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '14px',
          }}
        >
          <div>
            <WibClock />
            <div style={{ fontSize: '12.5px', color: '#64746b', marginTop: '4px' }}>
              {new Date().toLocaleDateString('id-ID', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                timeZone: 'Asia/Jakarta',
              })}
              {config && (
                <span>
                  {' · '}Jadwal: {config.clockInTime} (+{config.lateToleranceMinutes} mnt) – {config.clockOutTime}
                </span>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {!todayRecord ? (
              <span
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  background: '#f4f5f1',
                  color: '#4b5563',
                  fontSize: '12px',
                  fontWeight: 700,
                }}
              >
                Belum Absen Masuk
              </span>
            ) : (
              <>
                <span
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    background: todayRecord.status === 'LATE' ? '#fef3c7' : '#dcfce7',
                    color: todayRecord.status === 'LATE' ? '#b45309' : '#15803d',
                    fontSize: '12px',
                    fontWeight: 700,
                  }}
                >
                  Masuk: {formatWibTime(todayRecord.clock_in)} ({todayRecord.status === 'LATE' ? `Terlambat ${todayRecord.late_minutes || 0} mnt` : 'Tepat Waktu'})
                </span>
                {todayRecord.clock_out && (
                  <span
                    style={{
                      padding: '6px 12px',
                      borderRadius: '8px',
                      background: '#edf3ee',
                      color: '#2b3b2e',
                      fontSize: '12px',
                      fontWeight: 700,
                    }}
                  >
                    Pulang: {formatWibTime(todayRecord.clock_out)} ({todayRecord.total_hours || 0} jam)
                  </span>
                )}
              </>
            )}
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '10px',
              border: `1px solid ${feedback.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
              background: feedback.type === 'success' ? '#f0fdf4' : '#fef2f2',
              color: feedback.type === 'success' ? '#15803d' : '#b91c1c',
              fontSize: '12.5px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            {feedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{feedback.text}</span>
          </div>
        )}

        {/* Face Not Registered Warning */}
        {!loadingData && !hasFace && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: '10px',
              border: '1px solid #fde68a',
              background: '#fffbeb',
              color: '#92400e',
              fontSize: '12.5px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <AlertCircle size={16} />
            <span>
              Data wajah Anda belum terdaftar. Silakan minta Owner mendaftarkan wajah Anda di menu Karyawan terlebih dahulu.
            </span>
          </div>
        )}

        {/* Main Action Grid: Camera Verification & GPS Status */}
        {!isCompletedToday && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
              gap: '16px',
              alignItems: 'start',
            }}
          >
            {/* Camera Panel */}
            <div
              style={{
                background: '#ffffff',
                borderRadius: '12px',
                border: '1px solid #e7e8e3',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <strong style={{ fontSize: '13.5px', color: '#1c2826' }}>1. Verifikasi Kamera Wajah</strong>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color:
                      faceStatus.faceMatched === true
                        ? '#15803d'
                        : faceStatus.faceMatched === false
                        ? '#b91c1c'
                        : '#64746b',
                  }}
                >
                  {faceStatus.faceMatched === true
                    ? `Wajah Cocok (${faceStatus.similarityPct ?? 90}%) ✓`
                    : faceStatus.faceMatched === false
                    ? 'Tidak Cocok'
                    : faceStatus.faceDetected
                    ? 'Terdeteksi'
                    : 'Menunggu Wajah'}
                </span>
              </div>

              <FaceScanner
                ref={scannerRef}
                mode="verify"
                height={260}
                referenceDescriptor={faceDescriptor}
                onStatusChange={setFaceStatus}
              />
            </div>

            {/* GPS & Submit Panel */}
            <div
              style={{
                background: '#ffffff',
                borderRadius: '12px',
                border: '1px solid #e7e8e3',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <strong style={{ fontSize: '13.5px', color: '#1c2826' }}>2. Lokasi GPS & Konfirmasi</strong>
                <button
                  type="button"
                  disabled={gpsLoading}
                  onClick={refreshGps}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 9px',
                    borderRadius: '6px',
                    border: '1px solid #dcdfd5',
                    background: '#fbfbf9',
                    color: '#57695b',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    cursor: gpsLoading ? 'wait' : 'pointer',
                  }}
                >
                  <RefreshCw size={11} className={gpsLoading ? 'animate-spin' : ''} />
                  <span>Segarkan GPS</span>
                </button>
              </div>

              {/* GPS Card */}
              <div
                style={{
                  padding: '12px',
                  borderRadius: '10px',
                  border: `1px solid ${
                    gpsError ? '#fecaca' : gpsCoords && isWithinRadius ? '#bbf7d0' : '#fde68a'
                  }`,
                  background: gpsError ? '#fef2f2' : gpsCoords && isWithinRadius ? '#f0fdf4' : '#fffbeb',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: 700, color: gpsError ? '#b91c1c' : isWithinRadius ? '#15803d' : '#92400e' }}>
                  <MapPin size={14} />
                  <span>
                    {gpsError
                      ? 'GPS Tidak Aktif'
                      : !gpsCoords
                      ? 'Mendeteksi lokasi...'
                      : isWithinRadius
                      ? `Di Area Kafe (${distanceMeters} m)`
                      : `Di Luar Area Kafe (${distanceMeters} m)`}
                  </span>
                </div>
                {gpsError ? (
                  <div style={{ fontSize: '11.5px', color: '#991b1b' }}>{gpsError}</div>
                ) : (
                  gpsCoords &&
                  config && (
                    <div style={{ fontSize: '11.5px', color: '#4b5563' }}>
                      Jarak: <strong>{distanceMeters} m</strong> · Batas radius: {config.radiusMeters} m (akurasi ±{gpsCoords.accuracy}m)
                    </div>
                  )
                )}
              </div>

              {/* Note Input */}
              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#374151', marginBottom: '5px' }}>
                  Catatan (Opsional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Cth: Shift pagi, tugas bar..."
                  maxLength={120}
                  style={{
                    width: '100%',
                    padding: '9px 11px',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    fontSize: '12.5px',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Clock In / Out Action Button */}
              {canClockIn && (
                <button
                  type="button"
                  disabled={submitting || !hasFace || !gpsCoords || !isWithinRadius}
                  onClick={() => handleSubmitAttendance('IN')}
                  style={{
                    height: '42px',
                    borderRadius: '9px',
                    border: 'none',
                    background:
                      submitting || !hasFace || !gpsCoords || !isWithinRadius ? '#cbd5cc' : '#57695b',
                    color: '#ffffff',
                    fontSize: '13.5px',
                    fontWeight: 700,
                    cursor:
                      submitting || !hasFace || !gpsCoords || !isWithinRadius ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '7px',
                  }}
                >
                  <Camera size={16} />
                  <span>{submitting ? 'Memverifikasi...' : 'Absen Masuk (Clock In)'}</span>
                </button>
              )}

              {canClockOut && (
                <button
                  type="button"
                  disabled={submitting || !hasFace || !gpsCoords || !isWithinRadius}
                  onClick={() => handleSubmitAttendance('OUT')}
                  style={{
                    height: '42px',
                    borderRadius: '9px',
                    border: 'none',
                    background:
                      submitting || !hasFace || !gpsCoords || !isWithinRadius ? '#cbd5cc' : '#b45309',
                    color: '#ffffff',
                    fontSize: '13.5px',
                    fontWeight: 700,
                    cursor:
                      submitting || !hasFace || !gpsCoords || !isWithinRadius ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '7px',
                  }}
                >
                  <Clock size={16} />
                  <span>{submitting ? 'Memverifikasi...' : 'Absen Pulang (Clock Out)'}</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Completed Today Card */}
        {isCompletedToday && todayRecord && (
          <div
            style={{
              background: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #d4ded6',
              padding: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <CheckCircle2 size={22} color="#15803d" />
              <div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#1c2826' }}>
                  Absensi Hari Ini Selesai
                </div>
                <div style={{ fontSize: '12px', color: '#64746b', marginTop: '2px' }}>
                  Masuk {formatWibTime(todayRecord.clock_in)} · Pulang {formatWibTime(todayRecord.clock_out)} · Total {todayRecord.total_hours || 0} jam
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Personal Recent History Table */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e7e8e3',
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0eb' }}>
            <strong style={{ fontSize: '13px', color: '#1c2826' }}>Riwayat Absensi Saya</strong>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12.5px', whiteSpace: 'nowrap' }}>
              <thead>
                <tr style={{ background: '#fbfbf9', borderBottom: '1px solid #e7e8e3', color: '#64746b', height: '38px' }}>
                  <th style={{ padding: '0 14px', fontSize: '11px', textTransform: 'uppercase' }}>Tanggal</th>
                  <th style={{ padding: '0 12px', fontSize: '11px', textTransform: 'uppercase' }}>Masuk</th>
                  <th style={{ padding: '0 12px', fontSize: '11px', textTransform: 'uppercase' }}>Pulang</th>
                  <th style={{ padding: '0 12px', fontSize: '11px', textTransform: 'uppercase' }}>Total Jam</th>
                  <th style={{ padding: '0 14px', fontSize: '11px', textTransform: 'uppercase' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {myRecent.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: '#8b968f' }}>
                      Belum ada riwayat absensi.
                    </td>
                  </tr>
                ) : (
                  myRecent.map((r) => (
                    <tr key={r.id} style={{ borderBottom: '1px solid #f0f0eb', height: '42px' }}>
                      <td style={{ padding: '0 14px', fontWeight: 600 }}>
                        {new Date(String(r.work_date).slice(0, 10) + 'T00:00:00').toLocaleDateString('id-ID', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td style={{ padding: '0 12px', fontFamily: 'monospace' }}>{formatWibTime(r.clock_in)}</td>
                      <td style={{ padding: '0 12px', fontFamily: 'monospace' }}>
                        {r.clock_out ? formatWibTime(r.clock_out) : '-'}
                      </td>
                      <td style={{ padding: '0 12px' }}>
                        {r.total_hours !== null && r.total_hours !== undefined ? `${r.total_hours} jam` : '-'}
                      </td>
                      <td style={{ padding: '0 14px' }}>
                        <span
                          style={{
                            padding: '2px 7px',
                            borderRadius: '5px',
                            fontSize: '11px',
                            fontWeight: 700,
                            background: r.status === 'LATE' ? '#fef3c7' : '#dcfce7',
                            color: r.status === 'LATE' ? '#b45309' : '#15803d',
                          }}
                        >
                          {r.status === 'LATE' ? `Terlambat (${r.late_minutes || 0} mnt)` : 'Tepat Waktu'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
