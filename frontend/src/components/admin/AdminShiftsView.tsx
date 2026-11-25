'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { ShiftAuditItem, CashMovement } from '@/types';
import { DateRangePicker, DateRange } from '@/components/ui/date-range-picker';
import {
  Wallet,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ArrowDownLeft,
  ArrowUpRight,
  User,
  X,
  FileSpreadsheet,
  ChevronDown,
  Filter,
  Search,
  ShieldAlert,
  Info,
  BookOpen,
} from 'lucide-react';

export function AdminShiftsView() {
  const [shifts, setShifts] = useState<ShiftAuditItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Shift Movements Modal
  const [selectedShift, setSelectedShift] = useState<ShiftAuditItem | null>(null);
  const [movements, setMovements] = useState<CashMovement[]>([]);
  const [isLoadingMovements, setIsLoadingMovements] = useState(false);

  // Floating Popover for shift & cash reconciliation details
  const [shiftPopover, setShiftPopover] = useState<{
    title: string;
    subtitle?: string;
    details: Array<{ label: string; value: string; isHighlight?: boolean; color?: string }>;
    rect: { top: number; left: number };
  } | null>(null);

  // Filter States: Default tanggal adalah hari ini (Asia/Jakarta)
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
    return { from: today, to: today };
  });
  const [diffFilter, setDiffFilter] = useState<'ALL' | 'BALANCED' | 'OVER' | 'SHORT' | 'OPEN'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Force Close Shift Modal (Owner Only)
  const [forceCloseTarget, setForceCloseTarget] = useState<ShiftAuditItem | null>(null);
  const [forceCloseActualCash, setForceCloseActualCash] = useState<string>('');
  const [forceCloseNotes, setForceCloseNotes] = useState<string>('Kasir lupa tutup sif');
  const [isSubmittingForceClose, setIsSubmittingForceClose] = useState<boolean>(false);
  const [forceCloseError, setForceCloseError] = useState<string | null>(null);

  const handleOpenForceClose = (shift: ShiftAuditItem) => {
    setForceCloseTarget(shift);
    const runningExp =
      Number(shift.opening_cash || 0) +
      Number(shift.cash_sales || 0) +
      Number(shift.total_cash_in || 0) -
      Number(shift.total_cash_out || 0);
    setForceCloseActualCash(String(runningExp));
    setForceCloseNotes('Kasir lupa tutup sif');
    setForceCloseError(null);
  };

  const handleConfirmForceClose = async () => {
    if (!forceCloseTarget) return;
    setIsSubmittingForceClose(true);
    setForceCloseError(null);
    try {
      const res = await api.shifts.forceClose(forceCloseTarget.id, {
        actualCash: forceCloseActualCash !== '' ? Number(forceCloseActualCash) : undefined,
        notes: forceCloseNotes,
      });
      if (res.success) {
        setForceCloseTarget(null);
        await loadShifts();
      } else {
        setForceCloseError(res.message || 'Gagal menutup sif paksa.');
      }
    } catch (err: any) {
      setForceCloseError(err?.message || 'Terjadi kesalahan sistem saat menutup sif.');
    } finally {
      setIsSubmittingForceClose(false);
    }
  };

  const openShiftPopover = (
    e: React.MouseEvent,
    title: string,
    details: Array<{ label: string; value: string; isHighlight?: boolean; color?: string }>,
    subtitle?: string
  ) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setShiftPopover({
      title,
      subtitle,
      details,
      rect: { top: rect.bottom, left: rect.left },
    });
  };

  const loadShifts = async () => {
    setIsLoading(true);
    try {
      const params: { limit?: number; from?: string; to?: string } = { limit: 100 };
      if (dateRange.from) params.from = dateRange.from;
      if (dateRange.to) params.to = dateRange.to;

      const res = await api.shifts.getHistory(params);
      if (res.success && res.data) {
        setShifts(res.data);
      }
    } catch (err) {
      console.error('Failed to load shift history:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadShifts();
  }, [dateRange.from, dateRange.to]);

  const handleOpenMovements = async (shift: ShiftAuditItem) => {
    setSelectedShift(shift);
    setIsLoadingMovements(true);
    try {
      const res = await api.shifts.getMovements(shift.id);
      if (res.success && res.data) {
        setMovements(res.data);
      }
    } catch (err) {
      console.error('Failed to load movements:', err);
    } finally {
      setIsLoadingMovements(false);
    }
  };

  // Filter Shifts Logic
  const filteredShifts = shifts.filter((s) => {
    // 1. Date Range Filter
    if (dateRange.from) {
      const openD = new Date(s.opened_at).toLocaleDateString('en-CA');
      const closeD = s.closed_at ? new Date(s.closed_at).toLocaleDateString('en-CA') : openD;
      const from = dateRange.from;
      const to = dateRange.to || dateRange.from;

      const inRange = (openD >= from && openD <= to) || (closeD >= from && closeD <= to);
      if (!inRange) {
        return false;
      }
    }

    // 2. Difference Filter
    const isOpen = s.status === 'OPEN';
    const diff = Number(s.cash_difference || 0);

    if (diffFilter === 'OPEN' && !isOpen) return false;
    if (diffFilter === 'BALANCED' && (isOpen || diff !== 0)) return false;
    if (diffFilter === 'OVER' && (isOpen || diff <= 0)) return false;
    if (diffFilter === 'SHORT' && (isOpen || diff >= 0)) return false;

    // 3. Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = s.cashier_name?.toLowerCase().includes(q);
      const matchNotes = s.closing_notes?.toLowerCase().includes(q);
      if (!matchName && !matchNotes) return false;
    }

    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Comprehensive Filter Toolbar (with Shadcn UI DateRangePicker & Selisih Filter) */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          background: '#ffffff',
          padding: '12px 18px',
          borderRadius: '14px',
          border: '1px solid #e7e8e3',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px' }}>
          {/* 1. Shadcn UI DateRangePicker */}
          <DateRangePicker
            value={dateRange}
            onChange={(r) => setDateRange(r)}
            placeholder="Rentang Tanggal Sif..."
          />

          {/* 2. Selisih Kas Filter Dropdown */}
          <div style={{ position: 'relative' }}>
            <select
              value={diffFilter}
              onChange={(e) => setDiffFilter(e.target.value as any)}
              style={{
                height: '34px',
                padding: '0 28px 0 10px',
                background: '#ffffff',
                border: '1px solid #e2e4dc',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 600,
                color: diffFilter === 'ALL' ? '#52525b' : '#1c2826',
                cursor: 'pointer',
                outline: 'none',
                appearance: 'none',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
              }}
            >
              <option value="ALL">Semua Status Selisih ({shifts.length})</option>
              <option value="BALANCED">✓ Seimbang (Rp 0)</option>
              <option value="OVER">+ Selisih Lebih (Kas Surplus)</option>
              <option value="SHORT">- Selisih Kurang (Kas Defisit)</option>
              <option value="OPEN">⏱ Sif Aktif (Berjalan)</option>
            </select>
            <div style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
              <ChevronDown size={14} color="#71717a" />
            </div>
          </div>

          {/* 3. Search Kasir / Catatan */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              height: '34px',
              padding: '0 10px',
              background: '#ffffff',
              border: '1px solid #e2e4dc',
              borderRadius: '8px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
            }}
          >
            <Search size={13} color="#71717a" />
            <input
              type="text"
              placeholder="Cari kasir / catatan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: '12px',
                color: '#1c2826',
                width: '185px',
                fontFamily: 'inherit',
              }}
            />
            {searchQuery && (
              <span
                onClick={() => setSearchQuery('')}
                style={{ cursor: 'pointer', color: '#9ca3af', display: 'flex' }}
              >
                <X size={12} />
              </span>
            )}
          </div>

          {/* Counter & Reset */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                fontSize: '11.5px',
                padding: '3px 8px',
                borderRadius: '6px',
                background: '#f4f5f1',
                color: '#57695b',
                fontWeight: 600,
              }}
            >
              Ditampilkan: {filteredShifts.length}
            </span>
            {(dateRange.from || diffFilter !== 'ALL' || searchQuery) && (
              <button
                onClick={() => {
                  setDateRange({ from: '', to: '' });
                  setDiffFilter('ALL');
                  setSearchQuery('');
                }}
                style={{
                  fontSize: '11px',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  background: '#fee2e2',
                  border: 'none',
                  color: '#b91c1c',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Reset Filter
              </button>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={loadShifts}
            disabled={isLoading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              background: '#57695b',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            <RotateCcw size={13} className={isLoading ? 'animate-spin' : ''} />
            Segarkan
          </button>
        </div>
      </div>

      {/* Shifts History Table */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e7e8e3',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          overflow: 'hidden',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px', whiteSpace: 'nowrap' }}>
            <thead>
              <tr style={{ background: '#fbfbf9', borderBottom: '1px solid #e7e8e3', color: '#71717a' }}>
                <th style={{ padding: '9px 6px', fontWeight: 600, fontSize: '11.5px' }}>Kasir</th>
                <th style={{ padding: '9px 6px', fontWeight: 600, fontSize: '11.5px' }}>Waktu Sif</th>
                <th style={{ padding: '9px 6px', fontWeight: 600, fontSize: '11.5px' }}>Modal Awal</th>
                <th style={{ padding: '9px 6px', fontWeight: 600, fontSize: '11.5px' }}>Ekspektasi</th>
                <th style={{ padding: '9px 6px', fontWeight: 600, fontSize: '11.5px' }}>Hitung Fisik</th>
                <th style={{ padding: '9px 6px', fontWeight: 600, fontSize: '11.5px' }}>Selisih</th>
                <th style={{ padding: '9px 6px', fontWeight: 600, fontSize: '11.5px' }}>Penjualan</th>
                <th style={{ padding: '9px 6px', fontWeight: 600, fontSize: '11.5px' }}>Status</th>
                <th style={{ padding: '9px 8px', fontWeight: 600, fontSize: '11.5px', textAlign: 'right' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={9} style={{ padding: '36px', textAlign: 'center', color: '#64746b' }}>
                    Memuat riwayat sif kasir...
                  </td>
                </tr>
              ) : filteredShifts.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: '36px', textAlign: 'center', color: '#8b968f', fontStyle: 'italic' }}>
                    {shifts.length === 0
                      ? 'Belum ada riwayat sif kasir yang tercatat.'
                      : 'Tidak ada riwayat sif yang cocok dengan filter tanggal/selisih terpilih.'}
                  </td>
                </tr>
              ) : (
                filteredShifts.map((s) => {
                  const isOpen = s.status === 'OPEN';
                  const diff = Number(s.cash_difference || 0);
                  const openDate = new Date(s.opened_at);
                  const closeDate = s.closed_at ? new Date(s.closed_at) : null;

                  // Perhitungan Durasi Kerja
                  const durationMs = closeDate ? Math.max(0, closeDate.getTime() - openDate.getTime()) : Math.max(0, Date.now() - openDate.getTime());
                  const totalMinutes = Math.floor(durationMs / 60000);
                  const durationHours = Math.floor(totalMinutes / 60);
                  const durationMins = totalMinutes % 60;
                  const durationLabel = durationHours > 0 ? `${durationHours}j ${durationMins}m` : totalMinutes >= 1 ? `${totalMinutes}m` : '< 1 mnt';

                  const openTimeStr = openDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
                  const closeTimeStr = closeDate ? closeDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : null;
                  const dateStr = openDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });

                  // Tampilan waktu cerdas: cegah kerancuan jam mulai == jam selesai (misal 10.45 - 10.45)
                  let timeDisplay = '';
                  if (isOpen) {
                    timeDisplay = `${dateStr} ${openTimeStr}`;
                  } else if (closeTimeStr) {
                    if (openTimeStr === closeTimeStr || totalMinutes < 1) {
                      timeDisplay = `${dateStr} ${openTimeStr} (${durationLabel})`;
                    } else {
                      timeDisplay = `${dateStr} ${openTimeStr} - ${closeTimeStr}`;
                    }
                  } else {
                    timeDisplay = `${dateStr} ${openTimeStr}`;
                  }

                  const openingCashNum = Number(s.opening_cash || 0);
                  const cashSalesNum = Number(s.cash_sales || 0);
                  const nonCashSalesNum = Number(s.non_cash_sales || 0);
                  const cashInNum = Number(s.total_cash_in || 0);
                  const cashOutNum = Number(s.total_cash_out || 0);
                  const totalSalesNum = Number(s.total_sales || 0);

                  // Real-time or recorded system expected physical cash
                  const calculatedExpected = openingCashNum + cashSalesNum + cashInNum - cashOutNum;
                  const displayExpected = isOpen ? calculatedExpected : Number(s.system_expected_cash ?? calculatedExpected);

                  return (
                    <tr key={s.id} style={{ borderBottom: '1px solid #f0f0eb', height: '46px' }}>
                      {/* 1. Kasir */}
                      <td style={{ padding: '8px 10px', verticalAlign: 'middle', fontWeight: 700, color: '#1c2826' }}>
                        {s.cashier_name}
                      </td>

                      {/* 2. Waktu Sif (Jelas, durasi akurat, tanpa '...' ambigu) */}
                      <td style={{ padding: '8px 10px', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                            <span
                              style={{
                                fontSize: '11.5px',
                                fontWeight: 600,
                                color: '#1c2826',
                                whiteSpace: 'nowrap',
                              }}
                              title={`Buka: ${openDate.toLocaleString('id-ID')}${closeDate ? ` | Tutup: ${closeDate.toLocaleString('id-ID')}` : ' (Masih Berjalan)'}`}
                            >
                              {timeDisplay}
                            </span>
                            <button
                              onClick={(e) =>
                                openShiftPopover(
                                  e,
                                  `Audit Waktu Sif`,
                                  [
                                    { label: 'Waktu Buka Sif', value: openDate.toLocaleString('id-ID') },
                                    { label: 'Waktu Tutup Sif', value: closeDate ? closeDate.toLocaleString('id-ID') : 'Masih Berjalan (Sif Aktif)' },
                                    { label: 'Total Durasi Kerja', value: durationLabel, isHighlight: true },
                                    { label: 'Catatan Penutupan', value: s.closing_notes || 'Tidak ada catatan' },
                                  ],
                                  `Kasir: ${s.cashier_name}`
                                )
                              }
                              title="Klik untuk rincian audit waktu & catatan penutupan"
                              style={{
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '2px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                color: '#57695b',
                                borderRadius: '4px',
                              }}
                            >
                              <Clock size={12} />
                            </button>
                          </div>
                          {isOpen ? (
                            <span style={{ fontSize: '10px', color: '#b45309', fontWeight: 600 }}>
                              ⏱ Berjalan ({durationLabel})
                            </span>
                          ) : s.closing_notes ? (
                            <span
                              style={{
                                fontSize: '10px',
                                color: '#71717a',
                                fontStyle: 'italic',
                                maxWidth: '160px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                              title={s.closing_notes}
                            >
                              * {s.closing_notes}
                            </span>
                          ) : (
                            <span style={{ fontSize: '10px', color: '#8b968f' }}>
                              Durasi: {durationLabel}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 3. Modal Awal */}
                      <td style={{ padding: '8px 10px', verticalAlign: 'middle', color: '#4b5563', fontSize: '12px' }}>
                        Rp {openingCashNum.toLocaleString('id-ID')}
                      </td>

                      {/* 4. Ekspektasi Sistem (Klik nominal untuk rumus kas laci, tanpa '...' ambigu) */}
                      <td style={{ padding: '8px 10px', verticalAlign: 'middle' }}>
                        <button
                          onClick={(e) =>
                            openShiftPopover(
                              e,
                              `Ekspektasi Kas Laci`,
                              [
                                { label: 'Modal Awal Kasir', value: `Rp ${openingCashNum.toLocaleString('id-ID')}` },
                                { label: '(+) Penjualan Tunai', value: `+Rp ${cashSalesNum.toLocaleString('id-ID')}`, color: '#15803d' },
                                { label: '(+) Kas Masuk Operasional', value: `+Rp ${cashInNum.toLocaleString('id-ID')}`, color: '#15803d' },
                                { label: '(-) Kas Keluar Operasional', value: `-Rp ${cashOutNum.toLocaleString('id-ID')}`, color: '#b91c1c' },
                                { label: '(=) Total Ekspektasi Kas', value: `Rp ${displayExpected.toLocaleString('id-ID')}`, isHighlight: true },
                                { label: 'Status Sif', value: isOpen ? 'Sedang Berjalan (Real-time)' : 'Selesai Direkonsiliasi' },
                              ],
                              `Kasir: ${s.cashier_name}`
                            )
                          }
                          title="Klik untuk melihat rumus & rincian ekspektasi laci kas"
                          style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '2px 4px',
                            borderRadius: '5px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            textAlign: 'left',
                            transition: 'background 0.15s ease',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = '#f2f4ef'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                        >
                          <span style={{ fontWeight: 700, color: '#1c2826', fontSize: '12px', textDecoration: 'underline', textDecorationStyle: 'dotted', textUnderlineOffset: '3px' }}>
                            Rp {displayExpected.toLocaleString('id-ID')}
                          </span>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '15px',
                              height: '15px',
                              borderRadius: '50%',
                              background: '#f2f4ef',
                              color: '#57695b',
                              fontSize: '9.5px',
                              fontWeight: 700,
                            }}
                          >
                            ⓘ
                          </span>
                          {isOpen && (
                            <span style={{ fontSize: '9px', color: '#b45309', background: '#fef3c7', padding: '1px 5px', borderRadius: '4px', fontWeight: 700 }}>
                              Real-time
                            </span>
                          )}
                        </button>
                      </td>

                      {/* 5. Hitung Fisik */}
                      <td style={{ padding: '8px 10px', verticalAlign: 'middle', fontWeight: 600, color: '#1c2826', fontSize: '12px' }}>
                        {isOpen ? (
                          <span style={{ color: '#8b968f', fontStyle: 'italic' }}>-</span>
                        ) : (
                          `Rp ${Number(s.blind_counted_cash || 0).toLocaleString('id-ID')}`
                        )}
                      </td>

                      {/* 6. Selisih */}
                      <td style={{ padding: '8px 10px', verticalAlign: 'middle' }}>
                        {isOpen ? (
                          <span style={{ color: '#8b968f', fontStyle: 'italic' }}>-</span>
                        ) : diff === 0 ? (
                          <span
                            style={{
                              padding: '2px 7px',
                              borderRadius: '5px',
                              background: '#dcfce7',
                              color: '#15803d',
                              fontWeight: 700,
                              fontSize: '10.5px',
                            }}
                          >
                            Seimbang (Rp 0)
                          </span>
                        ) : diff > 0 ? (
                          <span
                            style={{
                              padding: '2px 7px',
                              borderRadius: '5px',
                              background: '#e0f2fe',
                              color: '#0369a1',
                              fontWeight: 700,
                              fontSize: '10.5px',
                            }}
                          >
                            Lebih (+Rp {diff.toLocaleString('id-ID')})
                          </span>
                        ) : (
                          <span
                            style={{
                              padding: '2px 7px',
                              borderRadius: '5px',
                              background: '#fee2e2',
                              color: '#b91c1c',
                              fontWeight: 700,
                              fontSize: '10.5px',
                            }}
                          >
                            Kurang (-Rp {Math.abs(diff).toLocaleString('id-ID')})
                          </span>
                        )}
                      </td>

                      {/* 7. Penjualan (Tampil jelas total & rasio tunai/non-tunai langsung di tabel) */}
                      <td style={{ padding: '8px 10px', verticalAlign: 'middle' }}>
                        <button
                          onClick={(e) =>
                            openShiftPopover(
                              e,
                              `Rincian Penjualan & Order`,
                              [
                                { label: 'Total Penjualan (Omzet)', value: `Rp ${totalSalesNum.toLocaleString('id-ID')}`, isHighlight: true },
                                { label: '• Penjualan Tunai (Kas Laci)', value: `Rp ${cashSalesNum.toLocaleString('id-ID')}`, color: '#15803d' },
                                { label: '• QRIS / Non-Tunai', value: `Rp ${nonCashSalesNum.toLocaleString('id-ID')}`, color: '#0369a1' },
                                { label: 'Jumlah Transaksi Order', value: `${s.total_orders || 0} struk order` },
                                { label: 'Frekuensi Mutasi Kas', value: `${s.movement_count || 0} kali mutasi` },
                              ],
                              `Kasir: ${s.cashier_name}`
                            )
                          }
                          title="Klik untuk melihat rincian penjualan Tunai vs QRIS & order"
                          style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '2px 4px',
                            borderRadius: '5px',
                            textAlign: 'left',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '1px',
                            transition: 'background 0.15s ease',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = '#f2f4ef'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                        >
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ fontWeight: 700, color: '#1c2826', fontSize: '12px' }}>
                              Rp {totalSalesNum.toLocaleString('id-ID')}
                            </span>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '14px',
                                height: '14px',
                                borderRadius: '50%',
                                background: '#f2f4ef',
                                color: '#57695b',
                                fontSize: '9px',
                                fontWeight: 700,
                              }}
                            >
                              ⓘ
                            </span>
                          </div>
                          <span style={{ fontSize: '10px', color: '#71717a', whiteSpace: 'nowrap' }}>
                            Tunai: Rp {cashSalesNum.toLocaleString('id-ID')} · QRIS: Rp {nonCashSalesNum.toLocaleString('id-ID')}
                          </span>
                        </button>
                      </td>

                      {/* 8. Status */}
                      <td style={{ padding: '8px 10px', verticalAlign: 'middle' }}>
                        <span
                          style={{
                            padding: '2px 7px',
                            borderRadius: '5px',
                            background: isOpen ? '#fef3c7' : '#f1f5f9',
                            color: isOpen ? '#b45309' : '#475569',
                            fontWeight: 700,
                            fontSize: '10.5px',
                          }}
                        >
                          {isOpen ? 'Aktif' : 'Selesai'}
                        </span>
                      </td>

                      {/* 9. Aksi (Jurnal Kas & Tutup Paksa dengan pemisah jelas & dialog aman) */}
                      <td style={{ padding: '8px 10px', verticalAlign: 'middle', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => handleOpenMovements(s)}
                            style={{
                              padding: '3px 8px',
                              background: '#f2f4ef',
                              color: '#57695b',
                              border: '1px solid #dcdfd5',
                              borderRadius: '5px',
                              fontWeight: 600,
                              fontSize: '11px',
                              cursor: 'pointer',
                              whiteSpace: 'nowrap',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                            title="Buka jurnal mutasi kas masuk / keluar"
                          >
                            <BookOpen size={12} />
                            Jurnal Kas
                          </button>
                          {isOpen && (
                            <>
                              <div style={{ width: '1px', height: '16px', background: '#e5e7eb' }} />
                              <button
                                onClick={() => handleOpenForceClose(s)}
                                title="Tutup sif ini secara paksa oleh Owner (penutupan administratif)"
                                style={{
                                  padding: '3px 8px',
                                  background: '#fff1f2',
                                  color: '#be123c',
                                  border: '1px solid #fecdd3',
                                  borderRadius: '5px',
                                  fontWeight: 700,
                                  fontSize: '11px',
                                  cursor: 'pointer',
                                  whiteSpace: 'nowrap',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  transition: 'all 0.15s ease',
                                }}
                              >
                                <ShieldAlert size={12} color="#be123c" />
                                Tutup Paksa
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CASH MOVEMENTS MODAL */}
      {selectedShift && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              maxWidth: '620px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '18px 24px',
                borderBottom: '1px solid #e7e8e3',
              }}
            >
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#1c2826', margin: 0 }}>
                  Jurnal Mutasi Kas Sif: {selectedShift.cashier_name}
                </h3>
                <div style={{ fontSize: '12px', color: '#64746b', marginTop: '2px' }}>
                  Modal Awal: Rp {Number(selectedShift.opening_cash).toLocaleString('id-ID')}
                </div>
              </div>
              <button
                onClick={() => setSelectedShift(null)}
                style={{
                  background: '#f7f7f5',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '6px',
                  cursor: 'pointer',
                  color: '#64746b',
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {selectedShift.closing_notes && (
                <div
                  style={{
                    padding: '12px 16px',
                    borderRadius: '10px',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    fontSize: '13px',
                    color: '#334155',
                  }}
                >
                  <strong>Catatan Penutupan Sif:</strong> {selectedShift.closing_notes}
                </div>
              )}

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', whiteSpace: 'nowrap' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e7e8e3', color: '#64746b', height: '36px' }}>
                    <th style={{ textAlign: 'left', padding: '0 8px', fontWeight: 600 }}>Tipe</th>
                    <th style={{ textAlign: 'left', padding: '0 8px', fontWeight: 600 }}>Kategori</th>
                    <th style={{ textAlign: 'left', padding: '0 8px', fontWeight: 600 }}>Keterangan</th>
                    <th style={{ textAlign: 'right', padding: '0 8px', fontWeight: 600 }}>Nominal</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoadingMovements ? (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', padding: '24px', color: '#64746b' }}>
                        Memuat data mutasi kas...
                      </td>
                    </tr>
                  ) : movements.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', padding: '24px', color: '#8b968f', fontStyle: 'italic' }}>
                        Tidak ada transaksi kas masuk / kas keluar (petty cash) pada sif ini.
                      </td>
                    </tr>
                  ) : (
                    movements.map((m) => {
                      const isCashIn = m.type === 'CASH_IN';
                      return (
                        <tr key={m.id} style={{ borderBottom: '1px solid #f0f0eb', height: '38px', whiteSpace: 'nowrap' }}>
                          <td style={{ padding: '0 8px', verticalAlign: 'middle' }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '2px 7px',
                                borderRadius: '4px',
                                background: isCashIn ? '#dcfce7' : '#fee2e2',
                                color: isCashIn ? '#15803d' : '#b91c1c',
                                fontWeight: 700,
                                fontSize: '10.5px',
                              }}
                            >
                              {isCashIn ? <ArrowDownLeft size={11} /> : <ArrowUpRight size={11} />}
                              {isCashIn ? 'Kas Masuk' : 'Kas Keluar'}
                            </span>
                          </td>
                          <td style={{ padding: '0 8px', verticalAlign: 'middle', fontWeight: 600, color: '#1c2826' }}>
                            {m.category}
                          </td>
                          <td style={{ padding: '0 8px', verticalAlign: 'middle', color: '#64746b' }}>
                            <div style={{ maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={m.description || '-'}>
                              {m.description || '-'}
                            </div>
                          </td>
                          <td
                            style={{
                              textAlign: 'right',
                              padding: '0 8px',
                              verticalAlign: 'middle',
                              fontWeight: 700,
                              color: isCashIn ? '#15803d' : '#b91c1c',
                            }}
                          >
                            {isCashIn ? '+' : '-'}Rp {Number(m.amount).toLocaleString('id-ID')}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                padding: '16px 24px',
                borderTop: '1px solid #e7e8e3',
                background: '#fbfbf9',
              }}
            >
              <button
                onClick={() => setSelectedShift(null)}
                style={{
                  padding: '9px 18px',
                  background: '#57695b',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FORCE CLOSE MODAL (OWNER ONLY) */}
      {forceCloseTarget && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              maxWidth: '540px',
              width: '100%',
              boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '18px 24px',
                borderBottom: '1px solid #fee2e2',
                background: '#fff7f7',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: '#fee2e2',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#b91c1c',
                  }}
                >
                  <ShieldAlert size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#991b1b', margin: 0 }}>
                    Tutup Sif Paksa (Otoritas Owner)
                  </h3>
                  <div style={{ fontSize: '12px', color: '#b91c1c', marginTop: '2px' }}>
                    Kasir: <strong>{forceCloseTarget.cashier_name}</strong>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setForceCloseTarget(null)}
                disabled={isSubmittingForceClose}
                style={{
                  background: '#fef2f2',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '6px',
                  cursor: 'pointer',
                  color: '#991b1b',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {(() => {
                const openTime = new Date(forceCloseTarget.opened_at);
                const durationMs = Math.max(0, Date.now() - openTime.getTime());
                const totalMinutes = Math.floor(durationMs / 60000);
                const hours = Math.floor(totalMinutes / 60);
                const mins = totalMinutes % 60;
                const activeDuration = hours > 0 ? `${hours} jam ${mins} menit` : totalMinutes >= 1 ? `${totalMinutes} menit` : '< 1 menit';

                return (
                  <div
                    style={{
                      padding: '12px 14px',
                      borderRadius: '10px',
                      background: '#fff1f2',
                      border: '1px solid #fecdd3',
                      fontSize: '12px',
                      color: '#9f1239',
                      lineHeight: '1.5',
                      display: 'flex',
                      gap: '10px',
                      alignItems: 'flex-start',
                    }}
                  >
                    <ShieldAlert size={18} color="#be123c" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div>
                      <strong style={{ color: '#881337' }}>Peringatan Penghentian Sif Aktif:</strong>
                      <div style={{ marginTop: '2px', color: '#9f1239' }}>
                        Menutup paksa sif kasir <strong>{forceCloseTarget.cashier_name}</strong> (berjalan selama {activeDuration}) akan langsung mengakhiri sesi kasir ini secara administratif. Kasir di terminal POS akan keluar dari sesi saat ini.
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Sif Breakdown Summary */}
              {(() => {
                const op = Number(forceCloseTarget.opening_cash || 0);
                const cs = Number(forceCloseTarget.cash_sales || 0);
                const ncs = Number(forceCloseTarget.non_cash_sales || 0);
                const cin = Number(forceCloseTarget.total_cash_in || 0);
                const cout = Number(forceCloseTarget.total_cash_out || 0);
                const exp = op + cs + cin - cout;

                return (
                  <div style={{ background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '14px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b', marginBottom: '8px' }}>
                      Ringkasan Kas Sif Kasir (Real-time):
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
                      <div style={{ color: '#475569', fontWeight: 600 }}>Modal Awal Kasir:</div>
                      <div style={{ textAlign: 'right', fontWeight: 700, color: '#1e293b' }}>Rp {op.toLocaleString('id-ID')}</div>

                      <div style={{ color: '#475569', fontWeight: 600 }}>Penjualan Tunai:</div>
                      <div style={{ textAlign: 'right', fontWeight: 700, color: '#15803d' }}>+Rp {cs.toLocaleString('id-ID')}</div>

                      <div style={{ color: '#475569', fontWeight: 600 }}>QRIS / Non-Tunai:</div>
                      <div style={{ textAlign: 'right', fontWeight: 700, color: '#0369a1' }}>Rp {ncs.toLocaleString('id-ID')}</div>

                      <div style={{ color: '#475569', fontWeight: 600 }}>Mutasi Kas Operasional:</div>
                      <div style={{ textAlign: 'right', fontWeight: 700, color: '#475569' }}>
                        +{cin.toLocaleString('id-ID')} / -{cout.toLocaleString('id-ID')}
                      </div>

                      <div style={{ color: '#0f172a', fontWeight: 800, borderTop: '1px solid #cbd5e1', paddingTop: '6px' }}>
                        Ekspektasi Uang Fisik:
                      </div>
                      <div style={{ textAlign: 'right', fontWeight: 800, color: '#0f172a', borderTop: '1px solid #cbd5e1', paddingTop: '6px', fontSize: '13px' }}>
                        Rp {exp.toLocaleString('id-ID')}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Input Actual Cash */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#1c2826', marginBottom: '6px' }}>
                  Hitung Uang Fisik di Laci Kas (Rp):
                </label>
                <input
                  type="number"
                  value={forceCloseActualCash}
                  onChange={(e) => setForceCloseActualCash(e.target.value)}
                  placeholder="Masukkan nominal uang di laci kas..."
                  style={{
                    width: '100%',
                    height: '38px',
                    padding: '0 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    fontWeight: 700,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                {(() => {
                  const op = Number(forceCloseTarget.opening_cash || 0);
                  const cs = Number(forceCloseTarget.cash_sales || 0);
                  const cin = Number(forceCloseTarget.total_cash_in || 0);
                  const cout = Number(forceCloseTarget.total_cash_out || 0);
                  const exp = op + cs + cin - cout;
                  const actualNum = forceCloseActualCash !== '' ? Number(forceCloseActualCash) : exp;
                  const diffNum = actualNum - exp;

                  return (
                    <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>
                        Default diisi otomatis sesuai ekspektasi kas.
                      </span>
                      {diffNum === 0 ? (
                        <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#15803d', background: '#dcfce7', padding: '2px 8px', borderRadius: '5px' }}>
                          ✓ Seimbang (Rp 0)
                        </span>
                      ) : diffNum > 0 ? (
                        <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#0369a1', background: '#e0f2fe', padding: '2px 8px', borderRadius: '5px' }}>
                          + Lebih (+Rp {diffNum.toLocaleString('id-ID')})
                        </span>
                      ) : (
                        <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#b91c1c', background: '#fee2e2', padding: '2px 8px', borderRadius: '5px' }}>
                          - Kurang (-Rp {Math.abs(diffNum).toLocaleString('id-ID')})
                        </span>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Input Notes */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#1c2826', marginBottom: '6px' }}>
                  Catatan Alasan Penutupan Paksa:
                </label>
                <input
                  type="text"
                  value={forceCloseNotes}
                  onChange={(e) => setForceCloseNotes(e.target.value)}
                  placeholder="Contoh: Kasir lupa tutup sif sebelum pulang"
                  style={{
                    width: '100%',
                    height: '38px',
                    padding: '0 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '12px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {forceCloseError && (
                <div style={{ padding: '8px 12px', borderRadius: '6px', background: '#fee2e2', color: '#b91c1c', fontSize: '12px', fontWeight: 600 }}>
                  {forceCloseError}
                </div>
              )}
            </div>

            {/* Footer */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '10px',
                padding: '16px 24px',
                borderTop: '1px solid #e7e8e3',
                background: '#fbfbf9',
              }}
            >
              <button
                type="button"
                onClick={() => setForceCloseTarget(null)}
                disabled={isSubmittingForceClose}
                style={{
                  padding: '9px 16px',
                  background: '#f1f5f9',
                  color: '#475569',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmForceClose}
                disabled={isSubmittingForceClose}
                style={{
                  padding: '9px 18px',
                  background: '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: isSubmittingForceClose ? 'not-allowed' : 'pointer',
                  opacity: isSubmittingForceClose ? 0.7 : 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <ShieldAlert size={14} />
                {isSubmittingForceClose ? 'Memproses...' : 'Konfirmasi Tutup Sif Paksa'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QUICK DETAILS POPOVER FOR SHIFT & CASH DETAILS */}
      {shiftPopover && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99990,
            background: 'transparent',
          }}
          onClick={() => setShiftPopover(null)}
        >
          <div
            style={{
              position: 'fixed',
              top: Math.min(shiftPopover.rect.top + 6, typeof window !== 'undefined' ? window.innerHeight - 280 : 400),
              left: Math.max(16, Math.min(shiftPopover.rect.left - 40, typeof window !== 'undefined' ? window.innerWidth - 340 : 400)),
              width: '320px',
              background: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #dcdfd5',
              boxShadow: '0 16px 36px rgba(0,0,0,0.18)',
              padding: '14px 16px',
              zIndex: 99991,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid #f0f0eb',
                paddingBottom: '8px',
                marginBottom: '10px',
              }}
            >
              <div>
                <strong style={{ fontSize: '13px', color: '#1c2826', display: 'block' }}>{shiftPopover.title}</strong>
                {shiftPopover.subtitle && (
                  <span style={{ fontSize: '11px', color: '#57695b', fontWeight: 600 }}>
                    {shiftPopover.subtitle}
                  </span>
                )}
              </div>
              <button
                onClick={() => setShiftPopover(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#888',
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <X size={14} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
              {shiftPopover.details.map((it, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: it.isHighlight ? '6px 8px' : '3px 0',
                    background: it.isHighlight ? '#f2f5f1' : 'transparent',
                    border: it.isHighlight ? '1px solid #d4ddd1' : 'none',
                    borderRadius: it.isHighlight ? '6px' : '0',
                    borderBottom: it.isHighlight ? '1px solid #d4ddd1' : '1px dashed #e5e7eb',
                  }}
                >
                  <span style={{ color: it.isHighlight ? '#1c2826' : '#374151', fontWeight: it.isHighlight ? 700 : 600 }}>
                    {it.label}:
                  </span>
                  <strong
                    style={{
                      color: it.color || (it.isHighlight ? '#1c2826' : '#111827'),
                      textAlign: 'right',
                      maxWidth: '170px',
                      fontSize: it.isHighlight ? '13px' : '12px',
                      fontWeight: 800,
                    }}
                  >
                    {it.value}
                  </strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
