'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { api } from '@/lib/api';
import { ShiftAuditItem, CashMovement } from '@/types';
import { DateRangePicker, DateRange } from '@/components/ui/date-range-picker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { NumberInput } from '@/components/ui/number-input';
import {
  RotateCcw,
  Search,
  X,
  Clock,
  BookOpen,
  ShieldAlert,
  ArrowDownLeft,
  ArrowUpRight,
  Camera,
} from 'lucide-react';

export function AdminShiftsView() {
  const [shifts, setShifts] = useState<ShiftAuditItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Shift Movements Modal
  const [selectedShift, setSelectedShift] = useState<ShiftAuditItem | null>(null);
  const [movements, setMovements] = useState<CashMovement[]>([]);
  const [isLoadingMovements, setIsLoadingMovements] = useState(false);
  const [viewingReceipt, setViewingReceipt] = useState<string | null>(null);

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
  const [diffFilter, setDiffFilter] = useState<'ALL' | 'BALANCED' | 'DIFF' | 'OPEN'>('ALL');
  const [cashierFilter, setCashierFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Force Close Shift Modal (Owner Only)
  const [forceCloseTarget, setForceCloseTarget] = useState<ShiftAuditItem | null>(null);
  const [forceCloseActualCash, setForceCloseActualCash] = useState<string>('');
  const [forceCloseNotes, setForceCloseNotes] = useState<string>('Kasir lupa tutup shift');
  const [isSubmittingForceClose, setIsSubmittingForceClose] = useState<boolean>(false);
  const [forceCloseError, setForceCloseError] = useState<string | null>(null);

  const setQuickRange = (type: 'today' | '7days' | '30days') => {
    const today = new Date();
    const formatDate = (d: Date) =>
      new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(d);

    if (type === 'today') {
      const t = formatDate(today);
      setDateRange({ from: t, to: t });
    } else if (type === '7days') {
      const past = new Date(today);
      past.setDate(past.getDate() - 6);
      setDateRange({ from: formatDate(past), to: formatDate(today) });
    } else if (type === '30days') {
      const past = new Date(today);
      past.setDate(past.getDate() - 29);
      setDateRange({ from: formatDate(past), to: formatDate(today) });
    }
  };

  const isCurrentPreset = (type: 'today' | '7days' | '30days') => {
    if (!dateRange.from || !dateRange.to) return false;
    const today = new Date();
    const formatDate = (d: Date) =>
      new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(d);

    if (type === 'today') {
      return dateRange.from === dateRange.to && dateRange.from === formatDate(today);
    }
    if (type === '7days') {
      const past = new Date(today);
      past.setDate(past.getDate() - 6);
      return dateRange.from === formatDate(past) && dateRange.to === formatDate(today);
    }
    if (type === '30days') {
      const past = new Date(today);
      past.setDate(past.getDate() - 29);
      return dateRange.from === formatDate(past) && dateRange.to === formatDate(today);
    }
    return false;
  };

  const loadShifts = async () => {
    setIsLoading(true);
    try {
      const params: { limit?: number; from?: string; to?: string } = { limit: 150 };
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

  const handleOpenForceClose = (shift: ShiftAuditItem) => {
    setForceCloseTarget(shift);
    const runningExp =
      Number(shift.opening_cash || 0) +
      Number(shift.cash_sales || 0) +
      Number(shift.total_cash_in || 0) -
      Number(shift.total_cash_out || 0);
    setForceCloseActualCash(String(runningExp));
    setForceCloseNotes('Kasir lupa tutup shift');
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
        setForceCloseError(res.message || 'Gagal menutup shift paksa.');
      }
    } catch (err: any) {
      setForceCloseError(err?.message || 'Terjadi kesalahan sistem saat menutup shift.');
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

  // Unique Cashier List
  const cashierList = useMemo(() => {
    const names = new Set<string>();
    for (const s of shifts) {
      if (s.cashier_name) names.add(s.cashier_name);
    }
    return Array.from(names).sort();
  }, [shifts]);

  // Filter Shifts Logic
  const filteredShifts = useMemo(() => {
    return shifts.filter((s) => {
      if (cashierFilter !== 'ALL' && s.cashier_name !== cashierFilter) {
        return false;
      }

      const isOpen = s.status === 'OPEN';
      const diff = Number(s.cash_difference || 0);

      if (diffFilter === 'OPEN' && !isOpen) return false;
      if (diffFilter === 'BALANCED' && (isOpen || diff !== 0)) return false;
      if (diffFilter === 'DIFF' && (isOpen || diff === 0)) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = s.cashier_name?.toLowerCase().includes(q);
        const matchNotes = s.closing_notes?.toLowerCase().includes(q);
        if (!matchName && !matchNotes) return false;
      }

      return true;
    });
  }, [shifts, cashierFilter, diffFilter, searchQuery]);

  // KPI Calculations
  const closedShifts = useMemo(() => shifts.filter((s) => s.status === 'CLOSED'), [shifts]);
  const openShifts = useMemo(() => shifts.filter((s) => s.status === 'OPEN'), [shifts]);
  const balancedShifts = useMemo(
    () => closedShifts.filter((s) => Number(s.cash_difference || 0) === 0),
    [closedShifts]
  );
  const diffShifts = useMemo(
    () => closedShifts.filter((s) => Number(s.cash_difference || 0) !== 0),
    [closedShifts]
  );
  const totalNetDiff = useMemo(
    () => closedShifts.reduce((sum, s) => sum + Number(s.cash_difference || 0), 0),
    [closedShifts]
  );
  const totalCashSales = useMemo(
    () => shifts.reduce((sum, s) => sum + Number(s.cash_sales || 0), 0),
    [shifts]
  );
  const totalAllSales = useMemo(
    () => shifts.reduce((sum, s) => sum + Number(s.total_sales || 0), 0),
    [shifts]
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* 1. TOP BAR KONTROL: Rentang Tanggal & Tombol Segarkan */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          flexWrap: 'wrap',
          background: '#ffffff',
          padding: '12px 18px',
          borderRadius: '12px',
          border: '1px solid #e7e8e3',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '14px', fontWeight: 700, color: '#1c2826' }}>
            Riwayat Shift Kasir
          </span>
          <span
            style={{
              fontSize: '11px',
              padding: '2px 8px',
              borderRadius: '6px',
              background: '#f2f4ef',
              color: '#57695b',
              fontWeight: 700,
            }}
          >
            {filteredShifts.length} Shift
          </span>
        </div>

        {/* Presets & Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setQuickRange('today')}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              border: isCurrentPreset('today') ? '1px solid #57695b' : '1px solid #e2e4dc',
              background: isCurrentPreset('today') ? '#57695b' : '#f7f7f5',
              color: isCurrentPreset('today') ? '#ffffff' : '#4b5563',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.12s ease',
            }}
          >
            Hari Ini
          </button>

          <button
            onClick={() => setQuickRange('7days')}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              border: isCurrentPreset('7days') ? '1px solid #57695b' : '1px solid #e2e4dc',
              background: isCurrentPreset('7days') ? '#57695b' : '#f7f7f5',
              color: isCurrentPreset('7days') ? '#ffffff' : '#4b5563',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.12s ease',
            }}
          >
            7 Hari
          </button>

          <button
            onClick={() => setQuickRange('30days')}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              border: isCurrentPreset('30days') ? '1px solid #57695b' : '1px solid #e2e4dc',
              background: isCurrentPreset('30days') ? '#57695b' : '#f7f7f5',
              color: isCurrentPreset('30days') ? '#ffffff' : '#4b5563',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.12s ease',
            }}
          >
            30 Hari
          </button>

          <div style={{ width: '1px', height: '20px', background: '#e5e7eb', margin: '0 2px' }} />

          <DateRangePicker
            value={dateRange}
            onChange={(r) => setDateRange(r)}
            placeholder="Pilih Tanggal Shift..."
            align="right"
            showApplyButton={false}
          />

          <button
            onClick={loadShifts}
            disabled={isLoading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0 14px',
              background: '#57695b',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '12px',
              cursor: 'pointer',
              height: '36px',
              transition: 'background 0.12s ease',
              whiteSpace: 'nowrap',
            }}
            title="Segarkan data shift"
            onMouseEnter={(e) => (e.currentTarget.style.background = '#46554a')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#57695b')}
          >
            <RotateCcw size={13} className={isLoading ? 'animate-spin' : ''} />
            Perbarui
          </button>
        </div>
      </div>

      {/* 2. 4 KARTU METRIK UTAMA (Simpel & Minimalis) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))',
          gap: '14px',
        }}
      >
        {/* Card 1: Total Shift */}
        <div
          style={{
            background: '#ffffff',
            padding: '16px 18px',
            borderRadius: '12px',
            border: '1px solid #e7e8e3',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#71717a', textTransform: 'uppercase' }}>
            Total Shift Kasir
          </span>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#1c2826' }}>
            {shifts.length} Shift
          </div>
          <div style={{ fontSize: '12px', color: '#71717a' }}>
            {closedShifts.length} Selesai • {openShifts.length} Aktif Berjalan
          </div>
        </div>

        {/* Card 2: Kas Seimbang */}
        <div
          style={{
            background: '#ffffff',
            padding: '16px 18px',
            borderRadius: '12px',
            border: '1px solid #e7e8e3',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#71717a', textTransform: 'uppercase' }}>
            Kas Seimbang
          </span>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#2e7d32' }}>
            {balancedShifts.length} Shift
          </div>
          <div style={{ fontSize: '12px', color: '#71717a' }}>
            Rekonsiliasi akurat (Rp 0 selisih)
          </div>
        </div>

        {/* Card 3: Selisih Kas Fisik */}
        <div
          style={{
            background: diffShifts.length > 0 ? '#fff8f6' : '#ffffff',
            padding: '16px 18px',
            borderRadius: '12px',
            border: diffShifts.length > 0 ? '1px solid #ffccbc' : '1px solid #e7e8e3',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          <span
            style={{
              fontSize: '11.5px',
              fontWeight: 700,
              color: diffShifts.length > 0 ? '#c62828' : '#71717a',
              textTransform: 'uppercase',
            }}
          >
            Selisih Kas Fisik
          </span>
          <div
            style={{
              fontSize: '22px',
              fontWeight: 800,
              color: totalNetDiff < 0 ? '#c62828' : totalNetDiff > 0 ? '#0284c7' : '#1c2826',
            }}
          >
            {totalNetDiff < 0 ? `-Rp ${Math.abs(totalNetDiff).toLocaleString('id-ID')}` : `Rp ${totalNetDiff.toLocaleString('id-ID')}`}
          </div>
          <div style={{ fontSize: '12px', color: diffShifts.length > 0 ? '#c62828' : '#71717a' }}>
            {diffShifts.length > 0 ? `${diffShifts.length} shift memiliki selisih` : 'Semua rekonsiliasi pas'}
          </div>
        </div>

        {/* Card 4: Total Kas Masuk Shift */}
        <div
          style={{
            background: '#ffffff',
            padding: '16px 18px',
            borderRadius: '12px',
            border: '1px solid #e7e8e3',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#71717a', textTransform: 'uppercase' }}>
            Kas Tunai Shift
          </span>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#1c2826' }}>
            Rp {totalCashSales.toLocaleString('id-ID')}
          </div>
          <div style={{ fontSize: '12px', color: '#71717a' }}>
            Total omzet: Rp {totalAllSales.toLocaleString('id-ID')}
          </div>
        </div>
      </div>

      {/* 3. BAR FILTER & PENCARIAN (Ramping & Responsif) */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
          background: '#ffffff',
          padding: '12px 18px',
          borderRadius: '12px',
          border: '1px solid #e7e8e3',
        }}
      >
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Status Tabs */}
          <div
            style={{
              display: 'flex',
              background: '#f4f5f1',
              padding: '2px',
              borderRadius: '8px',
              border: '1px solid #e5e7e0',
            }}
          >
            {(
              [
                { id: 'ALL', label: `Semua (${shifts.length})` },
                { id: 'BALANCED', label: `Seimbang (${balancedShifts.length})` },
                { id: 'DIFF', label: `Selisih (${diffShifts.length})` },
                { id: 'OPEN', label: `Aktif (${openShifts.length})` },
              ] as const
            ).map((s) => {
              const active = diffFilter === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setDiffFilter(s.id)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    border: 'none',
                    background: active ? '#57695b' : 'transparent',
                    color: active ? '#ffffff' : '#4b5563',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.12s ease',
                  }}
                >
                  {s.label}
                </button>
              );
            })}
          </div>

          {/* Cashier Filter Dropdown (Shadcn UI) */}
          <div style={{ width: '180px' }}>
            <Select value={cashierFilter} onValueChange={setCashierFilter}>
              <SelectTrigger style={{ height: '34px', background: '#f7f7f5' }}>
                <SelectValue placeholder="Semua Kasir" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua Kasir ({cashierList.length})</SelectItem>
                {cashierList.map((cName) => (
                  <SelectItem key={cName} value={cName}>
                    Kasir: {cName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Search Box */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: '#f7f7f5',
              padding: '0 12px',
              borderRadius: '8px',
              border: '1px solid #e2e4dc',
              height: '34px',
              flex: '1 1 180px',
              minWidth: '160px',
            }}
          >
            <Search size={13} color="#71717a" />
            <input
              type="text"
              placeholder="Cari kasir / catatan shift..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: '12px',
                color: '#1c2826',
                width: '100%',
              }}
            />
            {searchQuery && (
              <span
                onClick={() => setSearchQuery('')}
                style={{ cursor: 'pointer', color: '#9ca3af', display: 'flex' }}
                title="Hapus pencarian"
              >
                <X size={12} />
              </span>
            )}
          </div>

          {/* Reset Filter Button */}
          {(searchQuery || diffFilter !== 'ALL' || cashierFilter !== 'ALL') && (
            <button
              onClick={() => {
                setDiffFilter('ALL');
                setCashierFilter('ALL');
                setSearchQuery('');
              }}
              style={{
                fontSize: '11px',
                padding: '4px 10px',
                borderRadius: '6px',
                background: '#fee2e2',
                border: 'none',
                color: '#b91c1c',
                fontWeight: 600,
                cursor: 'pointer',
                height: '32px',
              }}
            >
              Reset Filter
            </button>
          )}
        </div>
      </div>

      {/* 4. TABEL RIWAYAT SHIFT (Bersih, Presisi & Informatif) */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e7e8e3',
          overflow: 'hidden',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              textAlign: 'left',
              fontSize: '12px',
              whiteSpace: 'nowrap',
            }}
          >
            <thead>
              <tr style={{ background: '#fafbf9', borderBottom: '1px solid #e7e8e3', color: '#71717a' }}>
                <th style={{ padding: '10px 12px', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase' }}>
                  Kasir
                </th>
                <th style={{ padding: '10px 12px', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase' }}>
                  Waktu Shift
                </th>
                <th style={{ padding: '10px 12px', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase' }}>
                  Modal Awal
                </th>
                <th style={{ padding: '10px 12px', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase' }}>
                  Ekspektasi Kas
                </th>
                <th style={{ padding: '10px 12px', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase' }}>
                  Hitung Fisik
                </th>
                <th style={{ padding: '10px 12px', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase' }}>
                  Selisih Kas
                </th>
                <th style={{ padding: '10px 12px', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase' }}>
                  Penjualan Kasir
                </th>
                <th style={{ padding: '10px 12px', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase' }}>
                  Status
                </th>
                <th style={{ padding: '10px 12px', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', textAlign: 'right' }}>
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={9} style={{ padding: '36px', textAlign: 'center', color: '#71717a' }}>
                    Memuat riwayat shift kasir...
                  </td>
                </tr>
              ) : filteredShifts.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: '36px', textAlign: 'center', color: '#9ca3af' }}>
                    Tidak ada riwayat shift pada periode atau filter yang dipilih.
                  </td>
                </tr>
              ) : (
                filteredShifts.map((s) => {
                  const isOpen = s.status === 'OPEN';
                  const diff = Number(s.cash_difference || 0);
                  const openDate = new Date(s.opened_at);
                  const closeDate = s.closed_at ? new Date(s.closed_at) : null;

                  // Durasi Kerja
                  const durationMs = closeDate
                    ? Math.max(0, closeDate.getTime() - openDate.getTime())
                    : Math.max(0, Date.now() - openDate.getTime());
                  const totalMinutes = Math.floor(durationMs / 60000);
                  const durationHours = Math.floor(totalMinutes / 60);
                  const durationMins = totalMinutes % 60;
                  const durationLabel =
                    durationHours > 0
                      ? `${durationHours}j ${durationMins}m`
                      : totalMinutes >= 1
                      ? `${totalMinutes}m`
                      : '< 1 mnt';

                  const openTimeStr = openDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
                  const closeTimeStr = closeDate
                    ? closeDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
                    : null;
                  const dateStr = openDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });

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

                  const calculatedExpected = openingCashNum + cashSalesNum + cashInNum - cashOutNum;
                  const displayExpected = isOpen ? calculatedExpected : Number(s.system_expected_cash ?? calculatedExpected);

                  return (
                    <tr key={s.id} style={{ borderBottom: '1px solid #f2f4ef', height: '46px' }}>
                      {/* 1. Kasir */}
                      <td style={{ padding: '8px 12px', verticalAlign: 'middle', fontWeight: 700, color: '#1c2826' }}>
                        {s.cashier_name}
                      </td>

                      {/* 2. Waktu Sif */}
                      <td style={{ padding: '8px 12px', verticalAlign: 'middle' }}>
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
                                  `Audit Waktu Shift`,
                                  [
                                    { label: 'Waktu Buka Shift', value: openDate.toLocaleString('id-ID') },
                                    { label: 'Waktu Tutup Shift', value: closeDate ? closeDate.toLocaleString('id-ID') : 'Masih Berjalan (Shift Aktif)' },
                                    { label: 'Total Durasi Kerja', value: durationLabel, isHighlight: true },
                                    { label: 'Catatan Penutupan', value: s.closing_notes || 'Tidak ada catatan' },
                                  ],
                                  `Kasir: ${s.cashier_name}`
                                )
                              }
                              title="Klik untuk rincian waktu & catatan penutupan"
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
                              Berjalan ({durationLabel})
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
                      <td style={{ padding: '8px 12px', verticalAlign: 'middle', color: '#4b5563', fontSize: '12px' }}>
                        Rp {openingCashNum.toLocaleString('id-ID')}
                      </td>

                      {/* 4. Ekspektasi Kas */}
                      <td style={{ padding: '8px 12px', verticalAlign: 'middle' }}>
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
                                { label: 'Status Shift', value: isOpen ? 'Sedang Berjalan (Real-time)' : 'Selesai Direkonsiliasi' },
                              ],
                              `Kasir: ${s.cashier_name}`
                            )
                          }
                          title="Klik untuk melihat rincian rumus kas laci"
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
                          }}
                        >
                          <span style={{ fontWeight: 700, color: '#1c2826', fontSize: '12px', textDecoration: 'underline', textDecorationStyle: 'dotted' }}>
                            Rp {displayExpected.toLocaleString('id-ID')}
                          </span>
                          {isOpen && (
                            <span style={{ fontSize: '9px', color: '#b45309', background: '#fef3c7', padding: '1px 5px', borderRadius: '4px', fontWeight: 700 }}>
                              Real-time
                            </span>
                          )}
                        </button>
                      </td>

                      {/* 5. Hitung Fisik (Blind Count) */}
                      <td style={{ padding: '8px 12px', verticalAlign: 'middle', fontWeight: 600, color: '#1c2826', fontSize: '12px' }}>
                        {isOpen ? (
                          <span style={{ color: '#8b968f', fontStyle: 'italic' }}>-</span>
                        ) : (
                          `Rp ${Number(s.blind_counted_cash || 0).toLocaleString('id-ID')}`
                        )}
                      </td>

                      {/* 6. Selisih Kas */}
                      <td style={{ padding: '8px 12px', verticalAlign: 'middle' }}>
                        {isOpen ? (
                          <span style={{ color: '#8b968f', fontStyle: 'italic' }}>-</span>
                        ) : diff === 0 ? (
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: '6px',
                              background: '#dcfce7',
                              color: '#15803d',
                              fontWeight: 700,
                              fontSize: '11px',
                            }}
                          >
                            Seimbang (Rp 0)
                          </span>
                        ) : diff > 0 ? (
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: '6px',
                              background: '#e0f2fe',
                              color: '#0369a1',
                              fontWeight: 700,
                              fontSize: '11px',
                            }}
                          >
                            +Rp {diff.toLocaleString('id-ID')}
                          </span>
                        ) : (
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: '6px',
                              background: '#fee2e2',
                              color: '#b91c1c',
                              fontWeight: 700,
                              fontSize: '11px',
                            }}
                          >
                            -Rp {Math.abs(diff).toLocaleString('id-ID')}
                          </span>
                        )}
                      </td>

                      {/* 7. Penjualan */}
                      <td style={{ padding: '8px 12px', verticalAlign: 'middle' }}>
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
                          title="Klik untuk rincian penjualan Tunai vs QRIS"
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
                          }}
                        >
                          <span style={{ fontWeight: 700, color: '#1c2826', fontSize: '12px' }}>
                            Rp {totalSalesNum.toLocaleString('id-ID')}
                          </span>
                          <span style={{ fontSize: '10px', color: '#71717a', whiteSpace: 'nowrap' }}>
                            Tunai: Rp {cashSalesNum.toLocaleString('id-ID')} · QRIS: Rp {nonCashSalesNum.toLocaleString('id-ID')}
                          </span>
                        </button>
                      </td>

                      {/* 8. Status Shift */}
                      <td style={{ padding: '8px 12px', verticalAlign: 'middle' }}>
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: '6px',
                            background: isOpen ? '#fef3c7' : '#f1f5f9',
                            color: isOpen ? '#b45309' : '#475569',
                            fontWeight: 700,
                            fontSize: '11px',
                          }}
                        >
                          {isOpen ? 'Aktif' : 'Selesai'}
                        </span>
                      </td>

                      {/* 9. Aksi */}
                      <td style={{ padding: '8px 12px', verticalAlign: 'middle', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => handleOpenMovements(s)}
                            style={{
                              padding: '4px 8px',
                              background: '#f2f4ef',
                              color: '#57695b',
                              border: '1px solid #dcdfd5',
                              borderRadius: '6px',
                              fontWeight: 600,
                              fontSize: '11px',
                              cursor: 'pointer',
                              whiteSpace: 'nowrap',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                            title="Buka jurnal mutasi kas"
                          >
                            <BookOpen size={12} />
                            Jurnal Kas
                          </button>

                          {isOpen && (
                            <button
                              onClick={() => handleOpenForceClose(s)}
                              title="Tutup shift ini secara paksa oleh Owner"
                              style={{
                                padding: '4px 8px',
                                background: '#fff1f2',
                                color: '#be123c',
                                border: '1px solid #fecdd3',
                                borderRadius: '6px',
                                fontWeight: 700,
                                fontSize: '11px',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              <ShieldAlert size={12} color="#be123c" />
                              Tutup Paksa
                            </button>
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

      {/* 5. CASH MOVEMENTS MODAL */}
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
          onClick={() => setSelectedShift(null)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              maxWidth: '580px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                borderBottom: '1px solid #e7e8e3',
                background: '#fafaf8',
              }}
            >
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#1c2826', margin: 0 }}>
                  Jurnal Mutasi Kas: {selectedShift.cashier_name}
                </h3>
                <div style={{ fontSize: '11.5px', color: '#71717a', marginTop: '2px' }}>
                  Modal Awal: Rp {Number(selectedShift.opening_cash).toLocaleString('id-ID')}
                </div>
              </div>
              <button
                onClick={() => setSelectedShift(null)}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e4dc',
                  borderRadius: '6px',
                  padding: '5px',
                  cursor: 'pointer',
                  color: '#64746b',
                }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {selectedShift.closing_notes && (
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    fontSize: '12.5px',
                    color: '#334155',
                  }}
                >
                  <strong>Catatan Penutupan:</strong> {selectedShift.closing_notes}
                </div>
              )}

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', whiteSpace: 'nowrap' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e7e8e3', color: '#71717a', height: '34px' }}>
                    <th style={{ textAlign: 'left', padding: '0 8px', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase' }}>
                      Tipe
                    </th>
                    <th style={{ textAlign: 'left', padding: '0 8px', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase' }}>
                      Kategori
                    </th>
                    <th style={{ textAlign: 'left', padding: '0 8px', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase' }}>
                      Keterangan
                    </th>
                    <th style={{ textAlign: 'center', padding: '0 8px', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase' }}>
                      Bukti Nota
                    </th>
                    <th style={{ textAlign: 'right', padding: '0 8px', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase' }}>
                      Nominal
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {isLoadingMovements ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: '#71717a' }}>
                        Memuat data mutasi kas...
                      </td>
                    </tr>
                  ) : movements.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: '#8b968f' }}>
                        Tidak ada transaksi kas masuk / kas keluar (petty cash) pada shift ini.
                      </td>
                    </tr>
                  ) : (
                    movements.map((m) => {
                      const isCashIn = m.type === 'CASH_IN';
                      return (
                        <tr key={m.id} style={{ borderBottom: '1px solid #f0f0eb', height: '38px' }}>
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
                            <div style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={m.description || '-'}>
                              {m.description || '-'}
                            </div>
                          </td>
                          <td style={{ padding: '0 8px', verticalAlign: 'middle', textAlign: 'center' }}>
                            {m.receipt_url ? (
                              <button
                                type="button"
                                onClick={() => setViewingReceipt(m.receipt_url!)}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '3px 8px',
                                  borderRadius: '6px',
                                  background: '#edf3ee',
                                  border: '1px solid #cbd5e1',
                                  color: '#57695b',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                }}
                                title="Klik untuk melihat foto bukti nota fisik"
                              >
                                <Camera size={12} />
                                <span>Lihat Nota</span>
                              </button>
                            ) : (
                              <span style={{ color: '#94a3b8', fontSize: '11px' }}>-</span>
                            )}
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
                padding: '14px 20px',
                borderTop: '1px solid #e7e8e3',
                background: '#fafaf8',
              }}
            >
              <button
                onClick={() => setSelectedShift(null)}
                style={{
                  padding: '7px 16px',
                  background: '#57695b',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '7px',
                  fontSize: '12.5px',
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

      {/* Lightbox Modal Foto Bukti Nota Fisik */}
      {viewingReceipt && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(4px)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={() => setViewingReceipt(null)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              overflow: 'hidden',
              maxWidth: '560px',
              width: '100%',
              boxShadow: '0 25px 50px rgba(0,0,0,0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 18px',
                borderBottom: '1px solid #f1f5f9',
              }}
            >
              <b style={{ fontSize: '14px', color: '#1e293b' }}>Foto Bukti Nota / Kwitansi Fisik</b>
              <button
                onClick={() => setViewingReceipt(null)}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '50%',
                  width: '28px',
                  height: '28px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={15} />
              </button>
            </div>
            <div style={{ padding: '16px', textAlign: 'center', background: '#0f172a', maxHeight: '70vh', overflowY: 'auto' }}>
              <img
                src={viewingReceipt}
                alt="Bukti Nota Pengeluaran"
                style={{
                  maxWidth: '100%',
                  maxHeight: '60vh',
                  objectFit: 'contain',
                  borderRadius: '8px',
                  margin: '0 auto',
                  display: 'block',
                }}
              />
            </div>
            <div style={{ padding: '12px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fafaf8' }}>
              <a
                href={viewingReceipt}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: '12px', color: '#57695b', fontWeight: 600, textDecoration: 'underline' }}
              >
                Buka di Tab Baru ↗
              </a>
              <button
                onClick={() => setViewingReceipt(null)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  border: 'none',
                  background: '#57695b',
                  color: '#ffffff',
                  fontSize: '12px',
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

      {/* 6. FORCE CLOSE MODAL (OWNER ONLY) */}
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
          onClick={() => setForceCloseTarget(null)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              maxWidth: '500px',
              width: '100%',
              boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                borderBottom: '1px solid #fee2e2',
                background: '#fff5f5',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#991b1b' }}>
                <ShieldAlert size={18} />
                <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>
                  Tutup Shift Paksa (Otoritas Owner)
                </h3>
              </div>
              <button
                onClick={() => setForceCloseTarget(null)}
                disabled={isSubmittingForceClose}
                style={{
                  background: 'transparent',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '4px',
                  cursor: 'pointer',
                  color: '#64746b',
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Content */}
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  background: '#fff1f2',
                  border: '1px solid #fecdd3',
                  fontSize: '12px',
                  color: '#9f1239',
                  lineHeight: '1.5',
                }}
              >
                Menutup paksa sesi kasir <strong>{forceCloseTarget.cashier_name}</strong> secara administratif. Terminal kasir akan otomatis keluar dari sesi saat ini.
              </div>

              {/* Shift Breakdown Summary */}
              {(() => {
                const op = Number(forceCloseTarget.opening_cash || 0);
                const cs = Number(forceCloseTarget.cash_sales || 0);
                const ncs = Number(forceCloseTarget.non_cash_sales || 0);
                const cin = Number(forceCloseTarget.total_cash_in || 0);
                const cout = Number(forceCloseTarget.total_cash_out || 0);
                const exp = op + cs + cin - cout;

                return (
                  <div style={{ background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '12px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
                      Ringkasan Kas Laci Real-time:
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '12px' }}>
                      <div style={{ color: '#64748b' }}>Modal Awal:</div>
                      <div style={{ textAlign: 'right', fontWeight: 700, color: '#1e293b' }}>
                        Rp {op.toLocaleString('id-ID')}
                      </div>

                      <div style={{ color: '#64748b' }}>Penjualan Tunai:</div>
                      <div style={{ textAlign: 'right', fontWeight: 700, color: '#15803d' }}>
                        +Rp {cs.toLocaleString('id-ID')}
                      </div>

                      <div style={{ color: '#64748b' }}>QRIS / Non-Tunai:</div>
                      <div style={{ textAlign: 'right', fontWeight: 700, color: '#0369a1' }}>
                        Rp {ncs.toLocaleString('id-ID')}
                      </div>

                      <div style={{ color: '#64748b' }}>Mutasi Kas:</div>
                      <div style={{ textAlign: 'right', fontWeight: 700, color: '#64748b' }}>
                        +{cin.toLocaleString('id-ID')} / -{cout.toLocaleString('id-ID')}
                      </div>

                      <div style={{ color: '#0f172a', fontWeight: 800, borderTop: '1px solid #cbd5e1', paddingTop: '6px' }}>
                        Ekspektasi Uang Fisik:
                      </div>
                      <div style={{ textAlign: 'right', fontWeight: 800, color: '#0f172a', borderTop: '1px solid #cbd5e1', paddingTop: '6px' }}>
                        Rp {exp.toLocaleString('id-ID')}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Input Actual Cash */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#1c2826', marginBottom: '4px' }}>
                  Hitung Uang Fisik di Laci Kas (Rp):
                </label>
                <NumberInput
                  value={forceCloseActualCash}
                  onChange={(e) => setForceCloseActualCash(e.target.value)}
                  placeholder="Contoh: 500.000"
                  style={{
                    width: '100%',
                    height: '36px',
                    padding: '0 12px',
                    borderRadius: '7px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    fontWeight: 700,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Input Notes */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#1c2826', marginBottom: '4px' }}>
                  Alasan Penutupan Paksa:
                </label>
                <input
                  type="text"
                  value={forceCloseNotes}
                  onChange={(e) => setForceCloseNotes(e.target.value)}
                  placeholder="Contoh: Kasir lupa tutup shift sebelum pulang"
                  style={{
                    width: '100%',
                    height: '36px',
                    padding: '0 12px',
                    borderRadius: '7px',
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
                gap: '8px',
                padding: '14px 20px',
                borderTop: '1px solid #e7e8e3',
                background: '#fafaf8',
              }}
            >
              <button
                type="button"
                onClick={() => setForceCloseTarget(null)}
                disabled={isSubmittingForceClose}
                style={{
                  padding: '8px 16px',
                  background: '#f1f5f9',
                  color: '#475569',
                  border: '1px solid #cbd5e1',
                  borderRadius: '7px',
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
                  padding: '8px 18px',
                  background: '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '7px',
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
                {isSubmittingForceClose ? 'Memproses...' : 'Tutup Shift Paksa'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. QUICK DETAILS POPOVER */}
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
