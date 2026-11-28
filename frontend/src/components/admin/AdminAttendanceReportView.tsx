'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { AttendanceRecord, StaffUser } from '@/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Download, Printer, RotateCcw, X, Camera } from 'lucide-react';

const API_ORIGIN = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1').replace(/\/api\/v1\/?$/, '');

function resolveAssetUrl(path: string | null | undefined): string {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
    return path;
  }
  return `${API_ORIGIN}${path.startsWith('/') ? '' : '/'}${path}`;
}

function getTodayJakartaYmd(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
}

function addDaysYmd(ymd: string, deltaDays: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + deltaDays);
  return dt.toISOString().slice(0, 10);
}

function formatClockTime(iso?: string | null): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jakarta',
  });
}

function formatRoleLabel(role?: string): string {
  if (role === 'OWNER') return 'Owner';
  if (role === 'CASHIER') return 'Kasir';
  return 'Karyawan';
}

function escapeCsvCell(val: string | number | null | undefined): string {
  const str = String(val ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

interface AdminAttendanceReportViewProps {
  users: StaffUser[];
}

export function AdminAttendanceReportView({ users }: AdminAttendanceReportViewProps) {
  const todayYmd = getTodayJakartaYmd();
  const [startDate, setStartDate] = useState<string>(addDaysYmd(todayYmd, -6));
  const [endDate, setEndDate] = useState<string>(todayYmd);
  const [selectedUserId, setSelectedUserId] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PRESENT' | 'LATE'>('ALL');

  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [summary, setSummary] = useState({
    total: 0,
    presentCount: 0,
    lateCount: 0,
    completedCount: 0,
    avgHours: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [photoPreviewRecord, setPhotoPreviewRecord] = useState<AttendanceRecord | null>(null);

  const loadReport = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.attendance.getList({
        startDate,
        endDate,
        userId: selectedUserId,
        status: statusFilter,
      });
      if (res.success && Array.isArray(res.data)) {
        setRecords(res.data);
        if (res.meta) {
          setSummary(res.meta);
        }
      }
    } catch (err) {
      console.error('Failed to load attendance report:', err);
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate, selectedUserId, statusFilter]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const applyDatePreset = (preset: 'TODAY' | '7D' | 'MONTH') => {
    const t = getTodayJakartaYmd();
    if (preset === 'TODAY') {
      setStartDate(t);
      setEndDate(t);
    } else if (preset === '7D') {
      setStartDate(addDaysYmd(t, -6));
      setEndDate(t);
    } else {
      setStartDate(`${t.slice(0, 7)}-01`);
      setEndDate(t);
    }
  };

  const handleExportCsv = () => {
    const headers = [
      'Tanggal',
      'Nama Karyawan',
      'Username',
      'Peran',
      'Jam Masuk (WIB)',
      'Status Kehadiran',
      'Terlambat (Menit)',
      'Jarak GPS Masuk (m)',
      'Jam Pulang (WIB)',
      'Jarak GPS Pulang (m)',
      'Total Jam Kerja',
      'Catatan',
    ];

    const csvRows = records.map((r) => [
      String(r.work_date).slice(0, 10),
      r.employee_name || '-',
      r.employee_username || '-',
      formatRoleLabel(r.employee_role),
      formatClockTime(r.clock_in),
      r.status === 'LATE' ? 'Terlambat' : 'Tepat Waktu',
      r.late_minutes || 0,
      r.clock_in_distance_meters !== null && r.clock_in_distance_meters !== undefined
        ? Math.round(r.clock_in_distance_meters)
        : '-',
      r.clock_out ? formatClockTime(r.clock_out) : '-',
      r.clock_out_distance_meters !== null && r.clock_out_distance_meters !== undefined
        ? Math.round(r.clock_out_distance_meters)
        : '-',
      r.total_hours !== null && r.total_hours !== undefined ? r.total_hours : '-',
      r.notes || '-',
    ]);

    const csvContent = [headers, ...csvRows]
      .map((row) => row.map(escapeCsvCell).join(','))
      .join('\r\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Laporan-Absensi-${startDate}-sd-${endDate}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePrintReport = () => {
    const printWin = window.open('', '_blank', 'width=960,height=700');
    if (!printWin) return;

    const selectedEmpName =
      selectedUserId === 'ALL'
        ? 'Semua Karyawan'
        : users.find((u) => u.id === selectedUserId)?.name || 'Karyawan';

    const rowsHtml = records
      .map(
        (r, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td>${String(r.work_date).slice(0, 10)}</td>
          <td><strong>${r.employee_name || '-'}</strong></td>
          <td>${formatRoleLabel(r.employee_role)}</td>
          <td>${formatClockTime(r.clock_in)}</td>
          <td>${r.clock_out ? formatClockTime(r.clock_out) : '-'}</td>
          <td>${r.total_hours !== null && r.total_hours !== undefined ? `${r.total_hours} jam` : '-'}</td>
          <td>${r.clock_in_distance_meters != null ? `${Math.round(r.clock_in_distance_meters)}m` : '-'}</td>
          <td>${r.status === 'LATE' ? `Terlambat (${r.late_minutes || 0} mnt)` : 'Tepat Waktu'}</td>
        </tr>
      `
      )
      .join('');

    printWin.document.write(`
      <html>
        <head>
          <title>Laporan Absensi Karyawan (${startDate} - ${endDate})</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #1c2826; font-size: 12px; }
            h2 { margin: 0 0 4px; font-size: 18px; }
            .meta { color: #64746b; margin-bottom: 16px; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #d1d5db; padding: 7px 9px; text-align: left; }
            th { background: #f3f4f6; font-size: 11px; text-transform: uppercase; }
          </style>
        </head>
        <body>
          <h2>Laporan Absensi Karyawan — RUANG TEMU</h2>
          <div class="meta">Periode: ${startDate} s/d ${endDate} • Karyawan: ${selectedEmpName} • Total: ${records.length} catatan</div>
          <table>
            <thead>
              <tr>
                <th>No</th>
                <th>Tanggal</th>
                <th>Nama Karyawan</th>
                <th>Peran</th>
                <th>Masuk</th>
                <th>Pulang</th>
                <th>Durasi</th>
                <th>GPS</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml || '<tr><td colspan="9" style="text-align:center;">Tidak ada data.</td></tr>'}
            </tbody>
          </table>
          <script>window.onload = function() { window.print(); };</script>
        </body>
      </html>
    `);
    printWin.document.close();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Summary KPI Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 175px), 1fr))',
          gap: '12px',
        }}
      >
        <div style={{ background: '#ffffff', padding: '14px 16px', borderRadius: '12px', border: '1px solid #e7e8e3' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#71717a', textTransform: 'uppercase' }}>Total Presensi</span>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#1c2826', marginTop: '2px' }}>{summary.total}</div>
        </div>
        <div style={{ background: '#ffffff', padding: '14px 16px', borderRadius: '12px', border: '1px solid #e7e8e3' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#71717a', textTransform: 'uppercase' }}>Tepat Waktu</span>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#15803d', marginTop: '2px' }}>{summary.presentCount}</div>
        </div>
        <div style={{ background: '#ffffff', padding: '14px 16px', borderRadius: '12px', border: '1px solid #e7e8e3' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#71717a', textTransform: 'uppercase' }}>Terlambat</span>
          <div style={{ fontSize: '22px', fontWeight: 800, color: summary.lateCount > 0 ? '#b45309' : '#1c2826', marginTop: '2px' }}>{summary.lateCount}</div>
        </div>
        <div style={{ background: '#ffffff', padding: '14px 16px', borderRadius: '12px', border: '1px solid #e7e8e3' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#71717a', textTransform: 'uppercase' }}>Rata-rata Kerja</span>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#1c2826', marginTop: '2px' }}>{summary.avgHours} jam</div>
        </div>
      </div>

      {/* Filter & Export Toolbar */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e7e8e3',
          padding: '12px 16px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}>
          {/* Quick Presets */}
          <div style={{ display: 'flex', background: '#f4f5f1', padding: '3px', borderRadius: '8px', gap: '2px' }}>
            <button
              type="button"
              onClick={() => applyDatePreset('TODAY')}
              style={{
                padding: '5px 9px',
                borderRadius: '6px',
                border: 'none',
                fontSize: '11.5px',
                fontWeight: startDate === todayYmd && endDate === todayYmd ? 700 : 500,
                background: startDate === todayYmd && endDate === todayYmd ? '#ffffff' : 'transparent',
                color: '#1c2826',
                cursor: 'pointer',
              }}
            >
              Hari Ini
            </button>
            <button
              type="button"
              onClick={() => applyDatePreset('7D')}
              style={{
                padding: '5px 9px',
                borderRadius: '6px',
                border: 'none',
                fontSize: '11.5px',
                fontWeight: startDate === addDaysYmd(todayYmd, -6) && endDate === todayYmd ? 700 : 500,
                background: startDate === addDaysYmd(todayYmd, -6) && endDate === todayYmd ? '#ffffff' : 'transparent',
                color: '#1c2826',
                cursor: 'pointer',
              }}
            >
              7 Hari
            </button>
            <button
              type="button"
              onClick={() => applyDatePreset('MONTH')}
              style={{
                padding: '5px 9px',
                borderRadius: '6px',
                border: 'none',
                fontSize: '11.5px',
                fontWeight: startDate === `${todayYmd.slice(0, 7)}-01` && endDate === todayYmd ? 700 : 500,
                background: startDate === `${todayYmd.slice(0, 7)}-01` && endDate === todayYmd ? '#ffffff' : 'transparent',
                color: '#1c2826',
                cursor: 'pointer',
              }}
            >
              Bulan Ini
            </button>
          </div>

          {/* Date Range */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{
                height: '34px',
                padding: '0 8px',
                borderRadius: '8px',
                border: '1px solid #dcdfd5',
                fontSize: '12px',
                color: '#1c2826',
                background: '#fafafa',
              }}
            />
            <span style={{ fontSize: '12px', color: '#71717a' }}>–</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{
                height: '34px',
                padding: '0 8px',
                borderRadius: '8px',
                border: '1px solid #dcdfd5',
                fontSize: '12px',
                color: '#1c2826',
                background: '#fafafa',
              }}
            />
          </div>

          {/* Filter Karyawan */}
          <div style={{ width: '185px' }}>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger style={{ height: '34px', background: '#ffffff', fontSize: '12px' }}>
                <SelectValue placeholder="Semua Karyawan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua Karyawan</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name} ({formatRoleLabel(u.role)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Filter Status */}
          <div style={{ width: '145px' }}>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
              <SelectTrigger style={{ height: '34px', background: '#ffffff', fontSize: '12px' }}>
                <SelectValue placeholder="Semua Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua Status</SelectItem>
                <SelectItem value="PRESENT">Tepat Waktu</SelectItem>
                <SelectItem value="LATE">Terlambat</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(selectedUserId !== 'ALL' || statusFilter !== 'ALL') && (
            <button
              type="button"
              onClick={() => {
                setSelectedUserId('ALL');
                setStatusFilter('ALL');
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                height: '34px',
                padding: '0 10px',
                borderRadius: '8px',
                border: '1px solid #e2e4dc',
                background: '#fafafa',
                fontSize: '12px',
                color: '#71717a',
                cursor: 'pointer',
              }}
            >
              <RotateCcw size={12} />
              Reset
            </button>
          )}
        </div>

        {/* Export Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            disabled={records.length === 0}
            onClick={handlePrintReport}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              height: '34px',
              padding: '0 12px',
              borderRadius: '8px',
              border: '1px solid #dcdfd5',
              background: '#ffffff',
              color: records.length === 0 ? '#a1a1aa' : '#374151',
              fontSize: '12px',
              fontWeight: 600,
              cursor: records.length === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            <Printer size={13} />
            <span>Cetak</span>
          </button>

          <button
            type="button"
            disabled={records.length === 0}
            onClick={handleExportCsv}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              height: '34px',
              padding: '0 14px',
              borderRadius: '8px',
              border: 'none',
              background: records.length === 0 ? '#cbd5cc' : '#57695b',
              color: '#ffffff',
              fontSize: '12px',
              fontWeight: 700,
              cursor: records.length === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            <Download size={13} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '14px',
          border: '1px solid #e7e8e3',
          overflow: 'hidden',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px', whiteSpace: 'nowrap' }}>
            <thead>
              <tr style={{ background: '#fbfbf9', borderBottom: '1px solid #e7e8e3', color: '#64746b', height: '42px' }}>
                <th style={{ padding: '0 14px', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>Karyawan</th>
                <th style={{ padding: '0 12px', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>Peran</th>
                <th style={{ padding: '0 12px', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>Tanggal</th>
                <th style={{ padding: '0 12px', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>Masuk</th>
                <th style={{ padding: '0 12px', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>Pulang</th>
                <th style={{ padding: '0 12px', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>Durasi</th>
                <th style={{ padding: '0 12px', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>GPS</th>
                <th style={{ padding: '0 12px', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>Foto</th>
                <th style={{ padding: '0 14px', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={9} style={{ padding: '32px', textAlign: 'center', color: '#64746b' }}>
                    Memuat laporan absensi...
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: '32px', textAlign: 'center', color: '#8b968f' }}>
                    Belum ada data absensi pada filter yang dipilih.
                  </td>
                </tr>
              ) : (
                records.map((r) => {
                  const inDist =
                    r.clock_in_distance_meters !== null && r.clock_in_distance_meters !== undefined
                      ? `${Math.round(r.clock_in_distance_meters)}m`
                      : '-';

                  return (
                    <tr key={r.id} style={{ borderBottom: '1px solid #f0f0eb', height: '46px' }}>
                      <td style={{ padding: '0 14px', fontWeight: 700, color: '#1c2826', fontSize: '12.5px' }}>
                        {r.employee_name || '-'}
                      </td>
                      <td style={{ padding: '0 12px' }}>
                        <span
                          style={{
                            padding: '2px 7px',
                            borderRadius: '5px',
                            fontSize: '11px',
                            fontWeight: 700,
                            background:
                              r.employee_role === 'OWNER'
                                ? '#fef3c7'
                                : r.employee_role === 'CASHIER'
                                ? '#e0f2fe'
                                : '#dcfce7',
                            color:
                              r.employee_role === 'OWNER'
                                ? '#92400e'
                                : r.employee_role === 'CASHIER'
                                ? '#0369a1'
                                : '#15803d',
                          }}
                        >
                          {formatRoleLabel(r.employee_role)}
                        </span>
                      </td>
                      <td style={{ padding: '0 12px', fontSize: '12px', color: '#4b5563' }}>
                        {new Date(String(r.work_date).slice(0, 10) + 'T00:00:00').toLocaleDateString('id-ID', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td style={{ padding: '0 12px', fontFamily: 'monospace', fontWeight: 600, fontSize: '12px', color: '#1c2826' }}>
                        {formatClockTime(r.clock_in)}
                      </td>
                      <td style={{ padding: '0 12px', fontFamily: 'monospace', fontWeight: 600, fontSize: '12px', color: r.clock_out ? '#1c2826' : '#a1a1aa' }}>
                        {r.clock_out ? formatClockTime(r.clock_out) : '-'}
                      </td>
                      <td style={{ padding: '0 12px', fontSize: '12px', color: '#374151', fontWeight: 600 }}>
                        {r.total_hours !== null && r.total_hours !== undefined ? `${r.total_hours} jam` : '-'}
                      </td>
                      <td style={{ padding: '0 12px', fontSize: '11.5px', color: r.clock_in_within_radius === false ? '#b91c1c' : '#15803d', fontWeight: 600 }}>
                        {inDist}
                      </td>
                      <td style={{ padding: '0 12px' }}>
                        {r.clock_in_photo || r.clock_out_photo ? (
                          <button
                            type="button"
                            onClick={() => setPhotoPreviewRecord(r)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              border: '1px solid #dcdfd5',
                              background: '#f8f9f6',
                              color: '#57695b',
                              fontSize: '11px',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            <Camera size={12} />
                            Lihat
                          </button>
                        ) : (
                          <span style={{ color: '#a1a1aa', fontSize: '11px' }}>-</span>
                        )}
                      </td>
                      <td style={{ padding: '0 14px' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '6px',
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
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Photo Preview Modal */}
      {photoPreviewRecord && (
        <div
          onClick={() => setPhotoPreviewRecord(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(17, 24, 22, 0.48)',
            backdropFilter: 'blur(2px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e7e8e3',
              maxWidth: '520px',
              width: '100%',
              overflow: 'hidden',
              boxShadow: '0 16px 36px rgba(0,0,0,0.16)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                borderBottom: '1px solid #f0f0eb',
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#1c2826' }}>
                  Bukti Foto Absensi — {photoPreviewRecord.employee_name}
                </h3>
                <div style={{ fontSize: '11px', color: '#64746b' }}>
                  Tanggal: {String(photoPreviewRecord.work_date).slice(0, 10)}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPhotoPreviewRecord(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#71717a',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ border: '1px solid #e7e8e3', borderRadius: '10px', padding: '10px', background: '#fbfbf9' }}>
                <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#1c2826', marginBottom: '6px' }}>
                  Masuk · {formatClockTime(photoPreviewRecord.clock_in)}
                </div>
                {photoPreviewRecord.clock_in_photo ? (
                  <img
                    src={resolveAssetUrl(photoPreviewRecord.clock_in_photo)}
                    alt="Foto Masuk"
                    style={{ width: '100%', height: '160px', objectFit: 'cover', borderRadius: '8px' }}
                  />
                ) : (
                  <div style={{ height: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: '12px', background: '#f3f4f6', borderRadius: '8px' }}>
                    Tidak ada foto
                  </div>
                )}
                {photoPreviewRecord.clock_in_distance_meters != null && (
                  <div style={{ fontSize: '11px', color: '#57695b', marginTop: '6px', fontWeight: 600 }}>
                    Jarak GPS: {Math.round(photoPreviewRecord.clock_in_distance_meters)} meter
                  </div>
                )}
              </div>

              <div style={{ border: '1px solid #e7e8e3', borderRadius: '10px', padding: '10px', background: '#fbfbf9' }}>
                <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#1c2826', marginBottom: '6px' }}>
                  Pulang · {photoPreviewRecord.clock_out ? formatClockTime(photoPreviewRecord.clock_out) : '-'}
                </div>
                {photoPreviewRecord.clock_out_photo ? (
                  <img
                    src={resolveAssetUrl(photoPreviewRecord.clock_out_photo)}
                    alt="Foto Pulang"
                    style={{ width: '100%', height: '160px', objectFit: 'cover', borderRadius: '8px' }}
                  />
                ) : (
                  <div style={{ height: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: '12px', background: '#f3f4f6', borderRadius: '8px' }}>
                    Belum absen pulang
                  </div>
                )}
                {photoPreviewRecord.clock_out_distance_meters != null && (
                  <div style={{ fontSize: '11px', color: '#57695b', marginTop: '6px', fontWeight: 600 }}>
                    Jarak GPS: {Math.round(photoPreviewRecord.clock_out_distance_meters)} meter
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
