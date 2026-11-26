'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { api } from '@/lib/api';
import { Order } from '@/types';
import { DateRangePicker, DateRange } from '@/components/ui/date-range-picker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search,
  RotateCcw,
  Printer,
  Download,
  X,
  ChevronDown,
  Eye,
  AlertTriangle,
} from 'lucide-react';

// Helper to safely format modifiers (can be array of objects or strings)
const formatModifiers = (modifiers: any): string => {
  if (!modifiers) return '';
  if (Array.isArray(modifiers)) {
    return modifiers
      .map((m: any) => {
        if (!m) return '';
        if (typeof m === 'string') return m;
        return m.name || '';
      })
      .filter(Boolean)
      .join(', ');
  }
  if (typeof modifiers === 'string') return modifiers;
  return '';
};

export function AdminOrdersView() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PAID' | 'CANCELLED'>('ALL');
  const [paymentFilter, setPaymentFilter] = useState<string>('ALL');
  const [cashierFilter, setCashierFilter] = useState<string>('ALL');

  // Filter States: Default tanggal adalah hari ini (Asia/Jakarta)
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
    return { from: today, to: today };
  });

  // Modals
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);
  const [voidingOrder, setVoidingOrder] = useState<Order | null>(null);
  const [managerPin, setManagerPin] = useState('');
  const [voidReason, setVoidReason] = useState('Kesalahan Pesanan Pelanggan');
  const [restockStock, setRestockStock] = useState(true);
  const [voidError, setVoidError] = useState('');
  const [isVoiding, setIsVoiding] = useState(false);

  // Floating Popover for multi-item menu details
  const [popover, setPopover] = useState<{
    orderNumber: string;
    items: Array<{ name: string; qty: number; subtotal: number; modifiers?: string; notes?: string | null }>;
    totalQty: number;
    totalAmount: number;
    order: Order;
    rect: { top: number; left: number };
  } | null>(null);

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

  const handleOpenMenuPopover = (e: React.MouseEvent, o: Order) => {
    e.stopPropagation();
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const orderItems = o.items || [];
    const totalQty = orderItems.reduce((sum, it) => sum + (it.quantity || 1), 0);
    const totalAmount = orderItems.reduce((sum, it) => sum + Number(it.subtotal || 0), 0);

    setPopover({
      orderNumber: o.order_number,
      items: orderItems.map((i) => ({
        name: i.productName,
        qty: i.quantity,
        subtotal: Number(i.subtotal),
        modifiers: formatModifiers(i.modifiers),
        notes: i.notes,
      })),
      totalQty,
      totalAmount,
      order: o,
      rect: { top: rect.bottom, left: rect.left },
    });
  };

  const loadOrders = async () => {
    setIsLoading(true);
    try {
      const params: { limit?: number; from?: string; to?: string } = { limit: 300 };
      if (dateRange.from) params.from = dateRange.from;
      if (dateRange.to) params.to = dateRange.to;

      const res = await api.orders.getOrders(params);
      if (res.success && res.data) {
        setOrders(res.data);
      }
    } catch (err) {
      console.error('Failed to load orders ledger:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [dateRange.from, dateRange.to]);

  const handleExecuteVoid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voidingOrder || !managerPin.trim() || !voidReason.trim()) {
      setVoidError('PIN Owner dan alasan pembatalan (void) wajib diisi.');
      return;
    }

    setIsVoiding(true);
    try {
      const res = await api.orders.voidOrder(voidingOrder.id, {
        managerPin: managerPin.trim(),
        reason: voidReason.trim(),
        restock: restockStock,
      });

      if (res.success) {
        alert(res.message || 'Transaksi berhasil dibatalkan (void).');
        setVoidingOrder(null);
        setSelectedOrder(null);
        setManagerPin('');
        loadOrders();
      }
    } catch (err: any) {
      setVoidError(err.message || 'Gagal membatalkan transaksi.');
    } finally {
      setIsVoiding(false);
    }
  };

  // Unique Cashier List
  const cashierList = useMemo(() => {
    const names = new Set<string>();
    for (const o of orders) {
      if (o.cashier_name) names.add(o.cashier_name);
    }
    return Array.from(names).sort();
  }, [orders]);

  // Filtered Orders logic
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (cashierFilter !== 'ALL' && o.cashier_name !== cashierFilter) {
        return false;
      }

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        o.order_number.toLowerCase().includes(q) ||
        (o.table_number && o.table_number.toLowerCase().includes(q)) ||
        (o.customer_name && o.customer_name.toLowerCase().includes(q)) ||
        (o.cashier_name && o.cashier_name.toLowerCase().includes(q)) ||
        (o.items && o.items.some((item) => item.productName?.toLowerCase().includes(q)));

      const matchesStatus = statusFilter === 'ALL' || o.status === statusFilter;

      let matchesPayment = true;
      if (paymentFilter !== 'ALL') {
        matchesPayment = Boolean(
          o.payments &&
            o.payments.some((p) => {
              const m = String(p.method || '').toUpperCase();
              if (paymentFilter === 'DEBIT_CARD') {
                return m === 'DEBIT_CARD' || m === 'DEBIT';
              }
              if (paymentFilter === 'BANK_TRANSFER') {
                return m === 'BANK_TRANSFER' || m === 'TRANSFER';
              }
              return m === paymentFilter;
            })
        );
      }

      return matchesSearch && matchesStatus && matchesPayment;
    });
  }, [orders, cashierFilter, searchQuery, statusFilter, paymentFilter]);

  // KPI Calculations
  const paidOrders = useMemo(() => orders.filter((o) => o.status === 'PAID'), [orders]);
  const voidOrders = useMemo(() => orders.filter((o) => o.status === 'CANCELLED'), [orders]);
  const totalRevenue = useMemo(
    () => paidOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0),
    [paidOrders]
  );
  const totalVoidAmount = useMemo(
    () => voidOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0),
    [voidOrders]
  );
  const dineInCount = useMemo(
    () => paidOrders.filter((o) => o.order_type === 'DINE_IN').length,
    [paidOrders]
  );
  const takeawayCount = useMemo(
    () => paidOrders.filter((o) => o.order_type === 'TAKEAWAY').length,
    [paidOrders]
  );
  const aov = useMemo(
    () => (paidOrders.length > 0 ? Math.round(totalRevenue / paidOrders.length) : 0),
    [paidOrders, totalRevenue]
  );

  // Export to CSV
  const handleExportCsv = () => {
    if (filteredOrders.length === 0) {
      alert('Tidak ada data transaksi untuk diekspor.');
      return;
    }

    const headers = [
      'No Order',
      'Tanggal',
      'Jam',
      'Tipe Layanan',
      'Meja',
      'Pelanggan',
      'Kasir',
      'Total Belanja (Rp)',
      'Status',
      'Metode Bayar',
      'Daftar Menu',
    ];

    const rows = filteredOrders.map((o) => {
      const d = new Date(o.paid_at || o.created_at);
      const dateStr = d.toLocaleDateString('id-ID');
      const timeStr = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      const itemsSummary = o.items
        ? o.items
            .map((i) => {
              const mods = formatModifiers(i.modifiers);
              return `${i.quantity}x ${i.productName}${mods ? ` (${mods})` : ''}${i.notes ? ` [${i.notes}]` : ''}`;
            })
            .join('; ')
        : '-';
      const methods =
        o.payments && o.payments.length > 0
          ? Array.from(new Set(o.payments.map((p) => p.method))).join(' + ')
          : '-';

      return [
        `"${o.order_number}"`,
        `"${dateStr}"`,
        `"${timeStr}"`,
        `"${o.order_type}"`,
        `"${o.table_number || '-'}"`,
        `"${o.customer_name || 'Umum'}"`,
        `"${o.cashier_name || '-'}"`,
        Number(o.total_amount),
        `"${o.status}"`,
        `"${methods}"`,
        `"${itemsSummary.replace(/"/g, '""')}"`,
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    const dateSuffix = dateRange.from
      ? `${dateRange.from}${dateRange.to && dateRange.to !== dateRange.from ? `_sd_${dateRange.to}` : ''}`
      : 'Semua';
    link.setAttribute('download', `Ruang_Temu_Transaksi_${dateSuffix}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* 1. TOP BAR KONTROL: Rentang Tanggal & Tombol Aksi */}
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
            Riwayat Transaksi
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
            {filteredOrders.length} Struk
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
            placeholder="Pilih Tanggal..."
            align="right"
            showApplyButton={false}
          />

          <button
            onClick={handleExportCsv}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0 12px',
              background: '#f7f7f5',
              color: '#374151',
              border: '1px solid #dcdfd5',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '12px',
              cursor: 'pointer',
              height: '36px',
              transition: 'all 0.12s ease',
              whiteSpace: 'nowrap',
            }}
            title="Ekspor laporan transaksi ke CSV"
          >
            <Download size={13} />
            Ekspor CSV
          </button>

          <button
            onClick={loadOrders}
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
            title="Segarkan data transaksi"
            onMouseEnter={(e) => (e.currentTarget.style.background = '#46554a')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#57695b')}
          >
            <RotateCcw size={13} className={isLoading ? 'animate-spin' : ''} />
            Perbarui
          </button>
        </div>
      </div>

      {/* 2. 4 KARTU METRIK UTAMA (Simpel, Minimalis & Elegan Sama Seperti Dasbor) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))',
          gap: '14px',
        }}
      >
        {/* Card 1: Total Omzet Lunas */}
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
            Penjualan Lunas
          </span>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#2e7d32' }}>
            Rp {totalRevenue.toLocaleString('id-ID')}
          </div>
          <div style={{ fontSize: '12px', color: '#71717a' }}>
            {paidOrders.length} transaksi berhasil
          </div>
        </div>

        {/* Card 2: Total Struk */}
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
            Total Struk
          </span>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#1c2826' }}>
            {paidOrders.length} Struk
          </div>
          <div style={{ fontSize: '12px', color: '#71717a' }}>
            {dineInCount} Dine In • {takeawayCount} Takeaway
          </div>
        </div>

        {/* Card 3: Nilai Rata-rata Keranjang (AOV) */}
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
            Rata-rata Keranjang
          </span>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#1c2826' }}>
            Rp {aov.toLocaleString('id-ID')}
          </div>
          <div style={{ fontSize: '12px', color: '#71717a' }}>
            Rata-rata per struk belanja
          </div>
        </div>

        {/* Card 4: Transaksi Void */}
        <div
          style={{
            background: voidOrders.length > 0 ? '#fff8f6' : '#ffffff',
            padding: '16px 18px',
            borderRadius: '12px',
            border: voidOrders.length > 0 ? '1px solid #ffccbc' : '1px solid #e7e8e3',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          <span style={{ fontSize: '11.5px', fontWeight: 700, color: voidOrders.length > 0 ? '#c62828' : '#71717a', textTransform: 'uppercase' }}>
            Dibatalkan (Void)
          </span>
          <div style={{ fontSize: '22px', fontWeight: 800, color: voidOrders.length > 0 ? '#c62828' : '#1c2826' }}>
            {voidOrders.length} Order
          </div>
          <div style={{ fontSize: '12px', color: voidOrders.length > 0 ? '#c62828' : '#71717a' }}>
            {voidOrders.length > 0 ? `Total Rp ${totalVoidAmount.toLocaleString('id-ID')}` : 'Nol pembatalan'}
          </div>
        </div>
      </div>

      {/* 3. BAR FILTER & PENCARIAN (Ramping, Responsif & To-The-Point) */}
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
            {(['ALL', 'PAID', 'CANCELLED'] as const).map((s) => {
              const active = statusFilter === s;
              const label =
                s === 'ALL'
                  ? `Semua (${orders.length})`
                  : s === 'PAID'
                  ? `Lunas (${paidOrders.length})`
                  : `Void (${voidOrders.length})`;
              return (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
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
                  {label}
                </button>
              );
            })}
          </div>

          {/* Payment Method Select (Shadcn UI) */}
          <div style={{ width: '180px' }}>
            <Select value={paymentFilter} onValueChange={setPaymentFilter}>
              <SelectTrigger style={{ height: '34px', background: '#f7f7f5' }}>
                <SelectValue placeholder="Metode Pembayaran" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua Pembayaran</SelectItem>
                <SelectItem value="CASH">Tunai (CASH)</SelectItem>
                <SelectItem value="QRIS">QRIS</SelectItem>
                <SelectItem value="DEBIT_CARD">Debit / EDC</SelectItem>
                <SelectItem value="BANK_TRANSFER">Transfer Bank</SelectItem>
              </SelectContent>
            </Select>
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
              placeholder="Cari order, meja, kasir..."
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
          {(searchQuery || statusFilter !== 'ALL' || paymentFilter !== 'ALL' || cashierFilter !== 'ALL') && (
            <button
              onClick={() => {
                setStatusFilter('ALL');
                setPaymentFilter('ALL');
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

      {/* 4. TABEL TRANSAKSI KASIR (Bersih, Rapi & Responsif) */}
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
                  No. Order
                </th>
                <th style={{ padding: '10px 12px', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase' }}>
                  Waktu
                </th>
                <th style={{ padding: '10px 12px', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase' }}>
                  Layanan
                </th>
                <th style={{ padding: '10px 12px', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase' }}>
                  Pelanggan / Kasir
                </th>
                <th style={{ padding: '10px 12px', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase' }}>
                  Menu Dipesan
                </th>
                <th style={{ padding: '10px 12px', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase' }}>
                  Metode
                </th>
                <th style={{ padding: '10px 12px', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', textAlign: 'right' }}>
                  Total
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
                    Memuat data transaksi...
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: '36px', textAlign: 'center', color: '#9ca3af' }}>
                    Tidak ada transaksi pada periode atau filter yang dipilih.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((o) => {
                  const isPaid = o.status === 'PAID';
                  const isVoid = o.status === 'CANCELLED';
                  const paymentMethods =
                    o.payments && o.payments.length > 0
                      ? Array.from(new Set(o.payments.map((p) => p.method))).join(' + ')
                      : '-';

                  const d = new Date(o.paid_at || o.created_at);
                  const timeFormatted = `${d.toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                  })}, ${d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`;
                  const orderItems = o.items || [];
                  const firstItem = orderItems[0];
                  const hasMultipleItems = orderItems.length > 1;
                  const remainingCount = orderItems.length - 1;
                  const fullMenuSummary = orderItems.map((i) => `${i.quantity}x ${i.productName}`).join(', ');

                  return (
                    <tr key={o.id} style={{ borderBottom: '1px solid #f2f4ef', height: '44px' }}>
                      {/* 1. No. Order */}
                      <td style={{ padding: '8px 12px', verticalAlign: 'middle' }}>
                        <span style={{ fontWeight: 700, color: '#1c2826', fontFamily: 'monospace', fontSize: '12px' }}>
                          {o.order_number}
                        </span>
                      </td>

                      {/* 2. Waktu */}
                      <td style={{ padding: '8px 12px', verticalAlign: 'middle', color: '#6b7280', fontSize: '11.5px' }}>
                        {timeFormatted}
                      </td>

                      {/* 3. Layanan */}
                      <td style={{ padding: '8px 12px', verticalAlign: 'middle' }}>
                        <span style={{ fontWeight: 600, color: '#1c2826', fontSize: '11.5px' }}>
                          {o.order_type === 'DINE_IN' ? `Dine In • ${o.table_number || '-'}` : 'Takeaway'}
                        </span>
                      </td>

                      {/* 4. Pelanggan & Kasir */}
                      <td style={{ padding: '8px 12px', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                          <span
                            style={{
                              fontSize: '11.5px',
                              fontWeight: 600,
                              color: '#1c2826',
                              maxWidth: '150px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                            title={o.customer_name || 'Pelanggan Umum'}
                          >
                            {o.customer_name || 'Umum'}
                          </span>
                          <span
                            style={{
                              fontSize: '10px',
                              color: '#71717a',
                              whiteSpace: 'nowrap',
                            }}
                            title={`Kasir: ${o.cashier_name || 'Kasir'}`}
                          >
                            Kasir: {o.cashier_name || 'Kasir'}
                          </span>
                        </div>
                      </td>

                      {/* 5. Rincian Menu */}
                      <td style={{ padding: '8px 12px', verticalAlign: 'middle' }}>
                        {orderItems.length === 0 ? (
                          <span style={{ fontSize: '11px', color: '#9ca3af' }}>-</span>
                        ) : !hasMultipleItems ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                            <span
                              style={{
                                fontSize: '11.5px',
                                fontWeight: 600,
                                color: '#1c2826',
                                maxWidth: '180px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                              title={`${firstItem.quantity}x ${firstItem.productName}`}
                            >
                              {firstItem.quantity}x {firstItem.productName}
                            </span>
                            {firstItem.modifiers && formatModifiers(firstItem.modifiers) && (
                              <span
                                style={{
                                  fontSize: '10px',
                                  color: '#57695b',
                                  maxWidth: '180px',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                                title={formatModifiers(firstItem.modifiers)}
                              >
                                + {formatModifiers(firstItem.modifiers)}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span
                              style={{
                                fontSize: '11.5px',
                                fontWeight: 600,
                                color: '#1c2826',
                                maxWidth: '120px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                              title={fullMenuSummary}
                            >
                              {firstItem.quantity}x {firstItem.productName}
                            </span>

                            <button
                              onClick={(e) => handleOpenMenuPopover(e, o)}
                              title={`Total ${orderItems.length} menu dipesan`}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                padding: '2px 6px',
                                fontSize: '10px',
                                fontWeight: 600,
                                borderRadius: '5px',
                                background: '#f2f4ef',
                                border: '1px solid #dcdfd5',
                                color: '#3f5243',
                                cursor: 'pointer',
                                lineHeight: '13px',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              <span>+{remainingCount}</span>
                              <ChevronDown size={10} color="#57695b" />
                            </button>
                          </div>
                        )}
                      </td>

                      {/* 6. Metode Bayar */}
                      <td style={{ padding: '8px 12px', verticalAlign: 'middle' }}>
                        {paymentMethods !== '-' ? (
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              background:
                                paymentMethods === 'CASH'
                                  ? '#f0f5f1'
                                  : paymentMethods.includes('QRIS')
                                  ? '#eff6ff'
                                  : '#faf5ff',
                              color:
                                paymentMethods === 'CASH'
                                  ? '#57695b'
                                  : paymentMethods.includes('QRIS')
                                  ? '#2563eb'
                                  : '#7c3aed',
                              fontWeight: 700,
                              fontSize: '11px',
                            }}
                          >
                            {paymentMethods}
                          </span>
                        ) : (
                          <span style={{ fontSize: '11px', color: '#9ca3af' }}>-</span>
                        )}
                      </td>

                      {/* 7. Total Tagihan */}
                      <td
                        style={{
                          padding: '8px 12px',
                          verticalAlign: 'middle',
                          fontWeight: 800,
                          color: '#1c2826',
                          fontSize: '12.5px',
                          textAlign: 'right',
                        }}
                      >
                        Rp {Number(o.total_amount).toLocaleString('id-ID')}
                      </td>

                      {/* 8. Status */}
                      <td style={{ padding: '8px 12px', verticalAlign: 'middle' }}>
                        {isPaid ? (
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
                            Lunas
                          </span>
                        ) : isVoid ? (
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
                            Void
                          </span>
                        ) : (
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: '6px',
                              background: '#fef3c7',
                              color: '#b45309',
                              fontWeight: 700,
                              fontSize: '11px',
                            }}
                          >
                            Pending
                          </span>
                        )}
                      </td>

                      {/* 9. Aksi */}
                      <td style={{ padding: '8px 12px', verticalAlign: 'middle', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <button
                            onClick={() => setSelectedOrder(o)}
                            style={{
                              padding: '4px 8px',
                              background: '#f2f4ef',
                              color: '#57695b',
                              border: '1px solid #dcdfd5',
                              borderRadius: '6px',
                              fontWeight: 600,
                              fontSize: '11px',
                              cursor: 'pointer',
                              transition: 'all 0.12s ease',
                            }}
                            title="Lihat detail transaksi"
                          >
                            Detail
                          </button>

                          <button
                            onClick={() => setReceiptOrder(o)}
                            style={{
                              padding: '4px 6px',
                              background: '#ffffff',
                              color: '#374151',
                              border: '1px solid #d1d5db',
                              borderRadius: '6px',
                              fontSize: '11px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                            }}
                            title="Cetak ulang struk kasir"
                          >
                            <Printer size={12} />
                          </button>

                          {isPaid && (
                            <button
                              onClick={() => {
                                setVoidingOrder(o);
                                setManagerPin('');
                                setVoidError('');
                              }}
                              style={{
                                padding: '4px 8px',
                                background: '#fff1f0',
                                color: '#cf1322',
                                border: '1px solid #ffa39e',
                                borderRadius: '6px',
                                fontWeight: 600,
                                fontSize: '11px',
                                cursor: 'pointer',
                              }}
                              title="Batalkan pesanan (Void)"
                            >
                              Void
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

      {/* 5. ORDER DETAIL MODAL */}
      {selectedOrder && (
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
          onClick={() => setSelectedOrder(null)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              maxWidth: '520px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
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
                borderBottom: '1px solid #e7e8e3',
                background: '#fafaf8',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#1c2826', margin: 0, fontFamily: 'monospace' }}>
                    {selectedOrder.order_number}
                  </h3>
                  <span
                    style={{
                      padding: '2px 7px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 700,
                      background: selectedOrder.status === 'PAID' ? '#dcfce7' : '#fee2e2',
                      color: selectedOrder.status === 'PAID' ? '#15803d' : '#b91c1c',
                    }}
                  >
                    {selectedOrder.status === 'PAID' ? 'Lunas' : 'Void'}
                  </span>
                </div>
                <div style={{ fontSize: '11.5px', color: '#71717a', marginTop: '2px' }}>
                  {new Date(selectedOrder.paid_at || selectedOrder.created_at).toLocaleString('id-ID')} ·{' '}
                  {selectedOrder.order_type === 'DINE_IN' ? `Meja ${selectedOrder.table_number || '-'}` : 'Takeaway'}
                </div>
              </div>

              <button
                onClick={() => setSelectedOrder(null)}
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

            {/* Body */}
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Order Info Pills */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '8px',
                  background: '#f8f8f6',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              >
                <div>
                  <span style={{ color: '#71717a' }}>Pelanggan: </span>
                  <strong style={{ color: '#1c2826' }}>{selectedOrder.customer_name || 'Umum'}</strong>
                </div>
                <div>
                  <span style={{ color: '#71717a' }}>Kasir: </span>
                  <strong style={{ color: '#1c2826' }}>{selectedOrder.cashier_name || '-'}</strong>
                </div>
              </div>

              {/* Items List */}
              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>
                  Menu Dipesan ({selectedOrder.items?.length || 0}):
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {selectedOrder.items?.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        background: '#fafaf8',
                        borderRadius: '8px',
                        border: '1px solid #eeece6',
                        fontSize: '12.5px',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, color: '#1c2826' }}>
                          {item.quantity}x {item.productName}
                        </div>
                        {formatModifiers(item.modifiers) && (
                          <div style={{ fontSize: '11px', color: '#57695b', fontWeight: 600 }}>
                            {formatModifiers(item.modifiers)}
                          </div>
                        )}
                        {item.notes && (
                          <div style={{ fontSize: '11px', color: '#71717a', fontStyle: 'italic' }}>
                            Catatan: {item.notes}
                          </div>
                        )}
                      </div>
                      <div style={{ fontWeight: 700, color: '#1c2826' }}>
                        Rp {Number(item.subtotal).toLocaleString('id-ID')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Price Breakdown */}
              <div
                style={{
                  padding: '12px 14px',
                  background: '#f9f9f7',
                  borderRadius: '8px',
                  border: '1px solid #e7e8e3',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '5px',
                  fontSize: '12.5px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64746b' }}>
                  <span>Subtotal</span>
                  <span>Rp {Number(selectedOrder.subtotal).toLocaleString('id-ID')}</span>
                </div>
                {Number(selectedOrder.discount_amount) > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#15803d', fontWeight: 600 }}>
                    <span>Potongan Diskon</span>
                    <span>-Rp {Number(selectedOrder.discount_amount).toLocaleString('id-ID')}</span>
                  </div>
                )}
                {Number(selectedOrder.claimed_down_payment) > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#0369a1', fontWeight: 600 }}>
                    <span>Klaim DP</span>
                    <span>-Rp {Number(selectedOrder.claimed_down_payment).toLocaleString('id-ID')}</span>
                  </div>
                )}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontWeight: 800,
                    fontSize: '14.5px',
                    color: '#1c2826',
                    borderTop: '1px solid #e0ded8',
                    paddingTop: '6px',
                    marginTop: '2px',
                  }}
                >
                  <span>Total Bayar</span>
                  <span>Rp {Number(selectedOrder.total_amount).toLocaleString('id-ID')}</span>
                </div>
              </div>

              {/* Payment Details */}
              {selectedOrder.payments && selectedOrder.payments.length > 0 && (
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>
                    Pembayaran:
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {selectedOrder.payments.map((p, pIdx) => (
                      <div
                        key={pIdx}
                        style={{
                          padding: '6px 12px',
                          background: '#eef4ef',
                          color: '#57695b',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 600,
                        }}
                      >
                        {p.method}: Rp {Number(p.amountPaid).toLocaleString('id-ID')}
                        {p.cashChange ? ` (Kembalian: Rp ${Number(p.cashChange).toLocaleString('id-ID')})` : ''}
                        {p.referenceNumber ? ` · Ref: ${p.referenceNumber}` : ''}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 20px',
                borderTop: '1px solid #e7e8e3',
                background: '#fafaf8',
              }}
            >
              <button
                onClick={() => {
                  setReceiptOrder(selectedOrder);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 14px',
                  background: '#ffffff',
                  color: '#374151',
                  border: '1px solid #d1d5db',
                  borderRadius: '7px',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <Printer size={14} />
                Cetak Struk
              </button>

              <div style={{ display: 'flex', gap: '8px' }}>
                {selectedOrder.status === 'PAID' && (
                  <button
                    onClick={() => {
                      setVoidingOrder(selectedOrder);
                      setManagerPin('');
                      setVoidError('');
                    }}
                    style={{
                      padding: '7px 14px',
                      background: '#fff1f0',
                      color: '#cf1322',
                      border: '1px solid #ffa39e',
                      borderRadius: '7px',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Void Transaksi
                  </button>
                )}

                <button
                  onClick={() => setSelectedOrder(null)}
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
        </div>
      )}

      {/* 6. RECEIPT PRINT MODAL */}
      {receiptOrder && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '16px',
          }}
          onClick={() => setReceiptOrder(null)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              maxWidth: '380px',
              width: '100%',
              overflow: 'hidden',
              boxShadow: '0 20px 48px rgba(0,0,0,0.25)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Action Bar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 18px',
                background: '#fafaf8',
                borderBottom: '1px solid #e7e8e3',
              }}
            >
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#1c2826' }}>
                Pratinjau Struk Kasir
              </span>
              <button
                onClick={() => setReceiptOrder(null)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  color: '#64746b',
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Printable Paper Body */}
            <div
              id="printable-receipt"
              style={{
                padding: '24px 20px',
                background: '#ffffff',
                fontFamily: 'monospace',
                fontSize: '12px',
                color: '#111827',
                lineHeight: 1.5,
              }}
            >
              {/* Header */}
              <div style={{ textAlign: 'center', marginBottom: '14px' }}>
                <div style={{ fontSize: '16px', fontWeight: 800, letterSpacing: '1px' }}>
                  RUANG TEMU
                </div>
                <div style={{ fontSize: '11px', color: '#4b5563' }}>
                  Integrated Cafe &amp; Roastery
                </div>
                <div style={{ fontSize: '10.5px', color: '#6b7280' }}>
                  Jl. Cempaka Putih No. 18, Jakarta
                </div>
                <div style={{ borderBottom: '1px dashed #9ca3af', margin: '10px 0' }} />
              </div>

              {/* Meta */}
              <div style={{ fontSize: '11px', marginBottom: '10px', color: '#374151' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>No: {receiptOrder.order_number}</span>
                  <span>{receiptOrder.order_type}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>
                    {new Date(receiptOrder.paid_at || receiptOrder.created_at).toLocaleDateString('id-ID')}{' '}
                    {new Date(receiptOrder.paid_at || receiptOrder.created_at).toLocaleTimeString('id-ID', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  <span>Meja: {receiptOrder.table_number || '-'}</span>
                </div>
                <div>Kasir: {receiptOrder.cashier_name || 'Kasir'}</div>
                <div style={{ borderBottom: '1px dashed #9ca3af', margin: '8px 0' }} />
              </div>

              {/* Items */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '10px' }}>
                {receiptOrder.items?.map((item, idx) => (
                  <div key={idx}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                      <span>
                        {item.quantity}x {item.productName}
                      </span>
                      <span>Rp {Number(item.subtotal).toLocaleString('id-ID')}</span>
                    </div>
                    {formatModifiers(item.modifiers) && (
                      <div style={{ fontSize: '10px', color: '#4b5563', paddingLeft: '8px' }}>
                        + {formatModifiers(item.modifiers)}
                      </div>
                    )}
                    {item.notes && (
                      <div style={{ fontSize: '10px', color: '#6b7280', fontStyle: 'italic', paddingLeft: '8px' }}>
                        * {item.notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div style={{ borderBottom: '1px dashed #9ca3af', margin: '8px 0' }} />

              {/* Calculation */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '11.5px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Subtotal:</span>
                  <span>Rp {Number(receiptOrder.subtotal).toLocaleString('id-ID')}</span>
                </div>
                {Number(receiptOrder.discount_amount) > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Diskon Promo:</span>
                    <span>-Rp {Number(receiptOrder.discount_amount).toLocaleString('id-ID')}</span>
                  </div>
                )}
                {Number(receiptOrder.claimed_down_payment) > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Klaim DP:</span>
                    <span>-Rp {Number(receiptOrder.claimed_down_payment).toLocaleString('id-ID')}</span>
                  </div>
                )}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontWeight: 800,
                    fontSize: '13px',
                    borderTop: '1px solid #111827',
                    paddingTop: '4px',
                    marginTop: '2px',
                  }}
                >
                  <span>TOTAL:</span>
                  <span>Rp {Number(receiptOrder.total_amount).toLocaleString('id-ID')}</span>
                </div>
              </div>

              {/* Payment */}
              {receiptOrder.payments && receiptOrder.payments.length > 0 && (
                <div style={{ marginTop: '8px', fontSize: '11px', color: '#374151' }}>
                  <div style={{ borderBottom: '1px dashed #9ca3af', margin: '6px 0' }} />
                  {receiptOrder.payments.map((p, pIdx) => (
                    <div key={pIdx}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Bayar ({p.method}):</span>
                        <span>Rp {Number(p.amountPaid).toLocaleString('id-ID')}</span>
                      </div>
                      {p.cashChange && Number(p.cashChange) > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Kembalian:</span>
                          <span>Rp {Number(p.cashChange).toLocaleString('id-ID')}</span>
                        </div>
                      )}
                      {p.referenceNumber && (
                        <div style={{ fontSize: '10px', color: '#6b7280' }}>
                          Ref: {p.referenceNumber}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Footer */}
              <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '10.5px', color: '#6b7280' }}>
                <div style={{ borderBottom: '1px dashed #9ca3af', marginBottom: '8px' }} />
                <div>Terima Kasih Atas Kunjungan Anda</div>
                <div>Wifi: RUANG_TEMU_GUEST / Password: kopiindonesia</div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div
              style={{
                display: 'flex',
                gap: '8px',
                padding: '12px 18px',
                background: '#fafaf8',
                borderTop: '1px solid #e7e8e3',
              }}
            >
              <button
                onClick={handlePrintReceipt}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '9px 14px',
                  background: '#57695b',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                <Printer size={14} />
                Cetak ke Printer
              </button>
              <button
                onClick={() => setReceiptOrder(null)}
                style={{
                  padding: '9px 16px',
                  background: '#ffffff',
                  color: '#4b5563',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
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

      {/* 7. VOID CONFIRMATION MODAL */}
      {voidingOrder && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '16px',
          }}
          onClick={() => setVoidingOrder(null)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              maxWidth: '440px',
              width: '100%',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#cf1322' }}>
                <AlertTriangle size={18} />
                <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>
                  Otorisasi Void Transaksi
                </h3>
              </div>
              <button
                onClick={() => setVoidingOrder(null)}
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

            <form onSubmit={handleExecuteVoid} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ fontSize: '12.5px', color: '#4b5563', lineHeight: 1.5 }}>
                Membatalkan pesanan <strong>{voidingOrder.order_number}</strong> senilai{' '}
                <strong style={{ color: '#1c2826' }}>
                  Rp {Number(voidingOrder.total_amount).toLocaleString('id-ID')}
                </strong>
                . Stok bahan baku akan otomatis dikembalikan jika opsi restock dicentang.
              </div>

              {voidError && (
                <div
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    color: '#b91c1c',
                    fontSize: '12px',
                  }}
                >
                  {voidError}
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                  PIN Owner (4 - 6 Digit)
                </label>
                <input
                  type="password"
                  required
                  minLength={4}
                  maxLength={6}
                  placeholder="******"
                  value={managerPin}
                  onChange={(e) => setManagerPin(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '7px',
                    border: '1px solid #d1d5db',
                    fontSize: '15px',
                    letterSpacing: '4px',
                    textAlign: 'center',
                    fontWeight: 800,
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                  Alasan Pembatalan
                </label>
                <Select value={voidReason} onValueChange={setVoidReason}>
                  <SelectTrigger style={{ width: '100%', height: '38px', background: '#ffffff', borderRadius: '7px', border: '1px solid #d1d5db' }}>
                    <SelectValue placeholder="Pilih Alasan Pembatalan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Kesalahan Pesanan Pelanggan">Kesalahan Pesanan Pelanggan</SelectItem>
                    <SelectItem value="Salah Input Meja / Menu Kasir">Salah Input Meja / Menu Kasir</SelectItem>
                    <SelectItem value="Pelanggan Batal Beli / Pergi">Pelanggan Batal Beli / Pergi</SelectItem>
                    <SelectItem value="Menu Dapur / Bar Habis Mendadak">Menu Dapur / Bar Habis Mendadak</SelectItem>
                    <SelectItem value="Transaksi Ganda (Double Payment)">Transaksi Ganda (Double Payment)</SelectItem>
                    <SelectItem value="Uji Coba Sistem">Uji Coba Sistem</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0' }}>
                <input
                  type="checkbox"
                  id="admin-void-restock"
                  checked={restockStock}
                  onChange={(e) => setRestockStock(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: '#1b4332', cursor: 'pointer' }}
                />
                <label
                  htmlFor="admin-void-restock"
                  style={{ fontSize: '12.5px', fontWeight: 600, color: '#374151', cursor: 'pointer', userSelect: 'none' }}
                >
                  Kembalikan bahan baku ke stok (Restock)
                </label>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '8px',
                  marginTop: '6px',
                }}
              >
                <button
                  type="button"
                  onClick={() => setVoidingOrder(null)}
                  style={{
                    padding: '8px 16px',
                    background: '#f4f4f0',
                    border: '1px solid #dcdfd5',
                    borderRadius: '7px',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    color: '#4b5563',
                    cursor: 'pointer',
                  }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isVoiding}
                  style={{
                    padding: '8px 18px',
                    background: '#dc2626',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '7px',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {isVoiding ? 'Memproses...' : 'Setujui & Void'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. QUICK DETAILS POPOVER FOR MULTI-ITEM ORDERS */}
      {popover && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99990,
            background: 'transparent',
          }}
          onClick={() => setPopover(null)}
        >
          <div
            style={{
              position: 'fixed',
              top: Math.min(popover.rect.top + 6, typeof window !== 'undefined' ? window.innerHeight - 340 : 400),
              left: Math.max(16, Math.min(popover.rect.left - 30, typeof window !== 'undefined' ? window.innerWidth - 350 : 400)),
              width: '330px',
              background: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e2e4dc',
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
                <strong style={{ fontSize: '13px', color: '#1c2826', display: 'block' }}>
                  Rincian Menu ({popover.items.length} Item)
                </strong>
                <span style={{ fontSize: '10.5px', color: '#71717a', fontFamily: 'monospace' }}>
                  Pesanan #{popover.orderNumber}
                </span>
              </div>
              <button
                onClick={() => setPopover(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#888',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  borderRadius: '4px',
                }}
                title="Tutup rincian menu"
              >
                <X size={15} />
              </button>
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                maxHeight: '210px',
                overflowY: 'auto',
                paddingRight: '4px',
              }}
            >
              {popover.items.map((it, idx) => (
                <div
                  key={idx}
                  style={{
                    fontSize: '12px',
                    borderBottom: idx === popover.items.length - 1 ? 'none' : '1px dashed #f0f0eb',
                    paddingBottom: idx === popover.items.length - 1 ? '0' : '6px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                    <span style={{ fontWeight: 600, color: '#1c2826', flex: 1 }}>
                      {it.qty}x {it.name}
                    </span>
                    <span style={{ fontWeight: 700, color: '#1c2826', whiteSpace: 'nowrap' }}>
                      Rp {it.subtotal.toLocaleString('id-ID')}
                    </span>
                  </div>
                  {it.modifiers && (
                    <div style={{ fontSize: '11px', color: '#57695b', marginTop: '2px' }}>
                      + {it.modifiers}
                    </div>
                  )}
                  {it.notes && (
                    <div style={{ fontSize: '10.5px', color: '#71717a', fontStyle: 'italic', marginTop: '1px' }}>
                      Catatan: {it.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div
              style={{
                marginTop: '10px',
                paddingTop: '8px',
                borderTop: '1px solid #f0f0eb',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '11.5px',
              }}
            >
              <span style={{ color: '#71717a' }}>Total {popover.totalQty} Pesanan</span>
              <span style={{ fontWeight: 800, color: '#1c2826', fontSize: '12.5px' }}>
                Rp {popover.totalAmount.toLocaleString('id-ID')}
              </span>
            </div>

            {popover.order && (
              <button
                onClick={() => {
                  setSelectedOrder(popover.order);
                  setPopover(null);
                }}
                style={{
                  marginTop: '10px',
                  width: '100%',
                  padding: '7px 12px',
                  background: '#57695b',
                  color: '#ffffff',
                  borderRadius: '7px',
                  border: 'none',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'background 0.15s ease',
                }}
              >
                <Eye size={13} />
                Buka Detail Struk &amp; Bayar
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
