'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { DailySummary, HourlyHeatmapItem, Ingredient, Order } from '@/types';
import { DateRangePicker, DateRange } from '@/components/ui/date-range-picker';
import { RotateCcw, TrendingUp } from 'lucide-react';

interface AdminDashboardViewProps {
  onNavigateTab?: (tab: string) => void;
}

export function AdminDashboardView({ onNavigateTab }: AdminDashboardViewProps) {
  const router = useRouter();
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
    return { from: today, to: today };
  });

  const [isLoading, setIsLoading] = useState(true);
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [heatmap, setHeatmap] = useState<HourlyHeatmapItem[]>([]);
  const [allIngredients, setAllIngredients] = useState<Ingredient[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [chartMode, setChartMode] = useState<'hourly' | 'daily'>('hourly');

  const todayStr = useMemo(() => {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
  }, []);

  const setQuickRange = (type: 'today' | '7days' | '30days') => {
    const today = new Date();
    const formatDate = (d: Date) =>
      new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(d);

    if (type === 'today') {
      const t = formatDate(today);
      setDateRange({ from: t, to: t });
      setChartMode('hourly');
    } else if (type === '7days') {
      const past = new Date(today);
      past.setDate(past.getDate() - 6);
      setDateRange({ from: formatDate(past), to: formatDate(today) });
      setChartMode('daily');
    } else if (type === '30days') {
      const past = new Date(today);
      past.setDate(past.getDate() - 29);
      setDateRange({ from: formatDate(past), to: formatDate(today) });
      setChartMode('daily');
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

  const loadData = async (range?: DateRange) => {
    const targetRange = range || dateRange;
    setIsLoading(true);
    try {
      const from = targetRange.from || todayStr;
      const to = targetRange.to || from;

      const [sumRes, heatRes, invRes, ordersRes] = await Promise.all([
        api.reports.getDailySummary({ from, to }),
        api.reports.getHourlyHeatmap({ from, to }),
        api.inventory.getAll(),
        api.orders.getOrders({ from, to, status: 'PAID', limit: 500 }),
      ]);

      if (sumRes.success && sumRes.data) {
        setSummary(sumRes.data);
      }
      if (heatRes.success && heatRes.data) {
        setHeatmap(heatRes.data);
      }
      if (invRes.success && invRes.data) {
        setAllIngredients(invRes.data);
      }
      if (ordersRes.success && ordersRes.data) {
        setOrders(ordersRes.data);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData(dateRange);
  }, [dateRange.from, dateRange.to]);

  const criticalIngredients = useMemo(() => {
    return allIngredients.filter(
      (ing) => Number(ing.stock_actual) <= Number(ing.safe_stock)
    );
  }, [allIngredients]);

  // Daily trend calculation
  const dailyTrend = useMemo(() => {
    if (!orders.length) return [];
    const map: Record<string, { date: string; label: string; revenue: number; count: number }> = {};

    for (const o of orders) {
      const rawDate = o.paid_at || o.created_at;
      if (!rawDate) continue;
      const dateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date(rawDate));
      if (!map[dateStr]) {
        const d = new Date(dateStr + 'T00:00:00+07:00');
        const label = new Intl.DateTimeFormat('id-ID', { weekday: 'short', day: 'numeric', month: 'short' }).format(d);
        map[dateStr] = { date: dateStr, label, revenue: 0, count: 0 };
      }
      map[dateStr].revenue += Number(o.total_amount || 0);
      map[dateStr].count += 1;
    }

    return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
  }, [orders]);

  const maxDailySales = useMemo(() => {
    return Math.max(1, ...dailyTrend.map((d) => d.revenue));
  }, [dailyTrend]);

  // Total discounts given
  const totalDiscounts = useMemo(() => {
    if (summary?.totalDiscounts !== undefined) {
      return Number(summary.totalDiscounts);
    }
    return orders.reduce((sum, o) => sum + Number(o.discount_amount || 0), 0);
  }, [summary, orders]);

  // 5 Recent Orders
  const recentOrders = useMemo(() => {
    return [...orders]
      .sort((a, b) => {
        const tA = new Date(a.paid_at || a.created_at).getTime();
        const tB = new Date(b.paid_at || b.created_at).getTime();
        return tB - tA;
      })
      .slice(0, 5);
  }, [orders]);

  const breakdown = useMemo(() => {
    let cashAmount = 0;
    let cashCount = 0;
    let qrisAmount = 0;
    let qrisCount = 0;
    let dineInCount = 0;
    let takeawayCount = 0;

    for (const o of orders) {
      if (o.order_type === 'DINE_IN') dineInCount++;
      else takeawayCount++;

      const payments = o.payments || [];
      if (payments.length > 0) {
        for (const p of payments) {
          const amt = Number(p.amountPaid || 0);
          const method = String(p.method || '').toUpperCase();
          if (method === 'CASH') {
            cashAmount += amt;
            cashCount++;
          } else {
            qrisAmount += amt;
            qrisCount++;
          }
        }
      } else {
        const total = Number(o.total_amount || 0);
        cashAmount += total;
        cashCount++;
      }
    }

    const totalRevenue = cashAmount + qrisAmount || 1;
    const totalOrders = orders.length || 1;

    return {
      cashAmount,
      cashCount,
      cashPct: Math.round((cashAmount / totalRevenue) * 100),
      qrisAmount,
      qrisCount,
      qrisPct: Math.round((qrisAmount / totalRevenue) * 100),
      dineInCount,
      dineInPct: Math.round((dineInCount / totalOrders) * 100),
      takeawayCount,
      takeawayPct: Math.round((takeawayCount / totalOrders) * 100),
    };
  }, [orders]);

  const maxHourlySales = Math.max(1, ...heatmap.map((h) => h.salesVolume));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 1. TOP BAR: Filter Rentang Tanggal Saja (Bersih Tanpa Badge Status) */}
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
            Ringkasan Performa
          </span>
          <button
            type="button"
            onClick={() => onNavigateTab ? onNavigateTab('matrix') : router.push('/matriks')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '4px 10px',
              borderRadius: '7px',
              border: '1px solid #2d6a4f',
              backgroundColor: '#eef6ef',
              color: '#2d6a4f',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.12s ease',
            }}
            title="Buka Halaman Analisis Matriks Menu BCG Lengkap"
          >
            <TrendingUp size={12} />
            Matriks Menu (BCG)
          </button>
        </div>

        {/* Filter Presets & Date Picker */}
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
            onClick={() => loadData(dateRange)}
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
            title="Segarkan data"
            onMouseEnter={(e) => (e.currentTarget.style.background = '#46554a')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#57695b')}
          >
            <RotateCcw size={13} className={isLoading ? 'animate-spin' : ''} />
            Perbarui
          </button>
        </div>
      </div>

      {/* 2. 4 KARTU METRIK UTAMA (Simpel, Minimalis, Tipografi Tajam) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '14px',
        }}
      >
        {/* Card 1: Penjualan Bersih */}
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
            Penjualan Bersih
          </span>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#1c2826' }}>
            Rp {Number(summary?.netSales || 0).toLocaleString('id-ID')}
          </div>
          <div style={{ fontSize: '12px', color: '#71717a' }}>
            {summary?.totalTransactions || 0} transaksi lunas
          </div>
        </div>

        {/* Card 2: Estimasi Laba Kotor */}
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
            Laba Kotor
          </span>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#2e7d32' }}>
            Rp {Number(summary?.grossProfit || 0).toLocaleString('id-ID')}
          </div>
          <div style={{ fontSize: '12px', color: '#71717a' }}>
            Margin {summary?.grossMarginPercentage || '0'}% • HPP Rp {Number(summary?.totalCogs || 0).toLocaleString('id-ID')}
          </div>
        </div>

        {/* Card 3: Nilai Rata-rata Keranjang */}
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
            Rp {Number(summary?.averageBasketSize || 0).toLocaleString('id-ID')}
          </div>
          <div style={{ fontSize: '12px', color: '#71717a' }}>
            Rata-rata per transaksi
          </div>
        </div>

        {/* Card 4: Bahan Baku Kritis */}
        <div
          style={{
            background: criticalIngredients.length > 0 ? '#fff8f6' : '#ffffff',
            padding: '16px 18px',
            borderRadius: '12px',
            border: criticalIngredients.length > 0 ? '1px solid #ffccbc' : '1px solid #e7e8e3',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          <span style={{ fontSize: '11.5px', fontWeight: 700, color: criticalIngredients.length > 0 ? '#c62828' : '#71717a', textTransform: 'uppercase' }}>
            Bahan Kritis
          </span>
          <div style={{ fontSize: '22px', fontWeight: 800, color: criticalIngredients.length > 0 ? '#c62828' : '#1c2826' }}>
            {criticalIngredients.length} Bahan
          </div>
          <div style={{ fontSize: '12px', color: '#71717a' }}>
            {criticalIngredients.length > 0 ? (
              <span
                onClick={() => onNavigateTab && onNavigateTab('inventory')}
                style={{ color: '#c62828', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
              >
                Periksa stok &rarr;
              </span>
            ) : (
              'Semua stok aman'
            )}
          </div>
        </div>
      </div>

      {/* 3. BARIS GRAFIK & KOMPOSISI PENJUALAN (2 Kolom Grid) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
          gap: '16px',
        }}
      >
        {/* Grafik: Jam Sibuk vs Tren Harian */}
        <div
          style={{
            background: '#ffffff',
            padding: '20px',
            borderRadius: '12px',
            border: '1px solid #e7e8e3',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#1c2826', margin: 0 }}>
                {chartMode === 'hourly' ? 'Jam Sibuk' : 'Tren Penjualan Harian'}
              </h3>
              <span style={{ fontSize: '11.5px', color: '#8b968f' }}>
                {chartMode === 'hourly' ? '(00:00 - 23:00)' : `(${dailyTrend.length} hari terdata)`}
              </span>
            </div>

            {/* Toggle Jam Sibuk vs Tren Harian */}
            <div
              style={{
                display: 'flex',
                background: '#f4f5f1',
                padding: '2px',
                borderRadius: '8px',
                border: '1px solid #e5e7e0',
              }}
            >
              <button
                onClick={() => setChartMode('hourly')}
                style={{
                  padding: '4px 10px',
                  fontSize: '11px',
                  fontWeight: 600,
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  background: chartMode === 'hourly' ? '#57695b' : 'transparent',
                  color: chartMode === 'hourly' ? '#ffffff' : '#4b5563',
                  transition: 'all 0.12s ease',
                }}
              >
                Jam Sibuk
              </button>
              <button
                onClick={() => setChartMode('daily')}
                style={{
                  padding: '4px 10px',
                  fontSize: '11px',
                  fontWeight: 600,
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  background: chartMode === 'daily' ? '#57695b' : 'transparent',
                  color: chartMode === 'daily' ? '#ffffff' : '#4b5563',
                  transition: 'all 0.12s ease',
                }}
              >
                Tren Harian
              </button>
            </div>
          </div>

          {/* Mode 1: Jam Sibuk Heatmap (00:00 - 23:00) */}
          {chartMode === 'hourly' && (
            <>
              {heatmap.length === 0 ? (
                <div
                  style={{
                    height: '170px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#8b968f',
                    fontSize: '13px',
                  }}
                >
                  Belum ada transaksi pada periode ini.
                </div>
              ) : (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-end',
                    gap: '3px',
                    height: '160px',
                    paddingTop: '16px',
                    borderBottom: '1px solid #e2e4dc',
                    width: '100%',
                  }}
                >
                  {Array.from({ length: 24 }).map((_, h) => {
                    const item = heatmap.find((x) => x.hour === h);
                    const sales = item ? item.salesVolume : 0;
                    const count = item ? item.transactionCount : 0;
                    const heightPct = maxHourlySales > 0 ? (sales / maxHourlySales) * 100 : 0;

                    return (
                      <div
                        key={h}
                        style={{
                          flex: '1 1 0',
                          minWidth: 0,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '4px',
                          height: '100%',
                          justifyContent: 'flex-end',
                          cursor: 'pointer',
                        }}
                        title={`Pukul ${h < 10 ? '0' + h : h}:00 - Rp ${sales.toLocaleString('id-ID')} (${count} pesanan)`}
                      >
                        {count > 0 ? (
                          <span style={{ fontSize: '9px', fontWeight: 700, color: '#57695b' }}>
                            {count}
                          </span>
                        ) : (
                          <span style={{ fontSize: '9px', opacity: 0 }}>0</span>
                        )}
                        <div
                          style={{
                            width: '100%',
                            height: `${Math.max(count > 0 ? 12 : 3, heightPct)}%`,
                            background: count > 0 ? '#57695b' : '#eceee8',
                            borderRadius: '2px 2px 0 0',
                            transition: 'height 0.2s ease',
                          }}
                        />
                        <span
                          style={{
                            fontSize: '9.5px',
                            color: count > 0 ? '#2d3830' : '#8b968f',
                            fontWeight: count > 0 ? 700 : 400,
                          }}
                        >
                          {h}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '11px',
                  color: '#8b968f',
                }}
              >
                <span>00:00</span>
                <span>06:00</span>
                <span>12:00</span>
                <span>18:00</span>
                <span>23:00</span>
              </div>
            </>
          )}

          {/* Mode 2: Tren Penjualan Harian */}
          {chartMode === 'daily' && (
            <>
              {dailyTrend.length === 0 ? (
                <div
                  style={{
                    height: '170px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#8b968f',
                    fontSize: '13px',
                  }}
                >
                  Belum ada data penjualan harian pada rentang ini.
                </div>
              ) : (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-end',
                    gap: dailyTrend.length > 15 ? '3px' : '8px',
                    height: '160px',
                    paddingTop: '16px',
                    borderBottom: '1px solid #e2e4dc',
                    width: '100%',
                  }}
                >
                  {dailyTrend.map((item) => {
                    const heightPct = maxDailySales > 0 ? (item.revenue / maxDailySales) * 100 : 0;

                    return (
                      <div
                        key={item.date}
                        style={{
                          flex: '1 1 0',
                          minWidth: 0,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '4px',
                          height: '100%',
                          justifyContent: 'flex-end',
                          cursor: 'pointer',
                        }}
                        title={`${item.label} (${item.date}): Rp ${item.revenue.toLocaleString('id-ID')} (${item.count} pesanan)`}
                      >
                        {dailyTrend.length <= 10 && item.count > 0 ? (
                          <span style={{ fontSize: '9px', fontWeight: 700, color: '#57695b', whiteSpace: 'nowrap' }}>
                            {item.count} trx
                          </span>
                        ) : (
                          <span style={{ fontSize: '9px', opacity: 0 }}>0</span>
                        )}
                        <div
                          style={{
                            width: '100%',
                            maxWidth: '38px',
                            height: `${Math.max(item.count > 0 ? 12 : 3, heightPct)}%`,
                            background: item.count > 0 ? '#57695b' : '#eceee8',
                            borderRadius: '3px 3px 0 0',
                            transition: 'height 0.2s ease',
                          }}
                        />
                        <span
                          style={{
                            fontSize: dailyTrend.length > 14 ? '8.5px' : '9.5px',
                            color: item.count > 0 ? '#2d3830' : '#8b968f',
                            fontWeight: item.count > 0 ? 700 : 400,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            width: '100%',
                            textAlign: 'center',
                          }}
                        >
                          {item.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '11px',
                  color: '#8b968f',
                }}
              >
                <span>Awal Periode</span>
                <span>
                  Rata-rata: Rp{' '}
                  {dailyTrend.length > 0
                    ? Math.round(
                        dailyTrend.reduce((s, i) => s + i.revenue, 0) / dailyTrend.length
                      ).toLocaleString('id-ID')
                    : '0'}{' '}
                  / hari
                </span>
                <span>Akhir Periode</span>
              </div>
            </>
          )}
        </div>

        {/* Ringkasan Metode Pembayaran */}
        <div
          style={{
            background: '#ffffff',
            padding: '20px',
            borderRadius: '12px',
            border: '1px solid #e7e8e3',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '16px',
          }}
        >
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#1c2826', margin: 0 }}>
            Metode Pembayaran
          </h3>

          {/* Pembayaran Tunai vs Non-Tunai */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', fontWeight: 600 }}>
              <span style={{ color: '#57695b' }}>
                Tunai: Rp {breakdown.cashAmount.toLocaleString('id-ID')} ({breakdown.cashPct}%)
              </span>
              <span style={{ color: '#2563eb' }}>
                Non-Tunai: Rp {breakdown.qrisAmount.toLocaleString('id-ID')} ({breakdown.qrisPct}%)
              </span>
            </div>
            <div style={{ height: '8px', width: '100%', background: '#e5e7eb', borderRadius: '4px', overflow: 'hidden', display: 'flex' }}>
              <div style={{ width: `${breakdown.cashPct}%`, background: '#57695b' }} />
              <div style={{ width: `${breakdown.qrisPct}%`, background: '#3b82f6' }} />
            </div>
          </div>

          <div style={{ height: '1px', background: '#f0f0eb' }} />

          {/* Tipe Layanan Dine In vs Takeaway */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', fontWeight: 600 }}>
              <span style={{ color: '#1c2826' }}>
                Dine In: {breakdown.dineInCount} ({breakdown.dineInPct}%)
              </span>
              <span style={{ color: '#d97706' }}>
                Takeaway: {breakdown.takeawayCount} ({breakdown.takeawayPct}%)
              </span>
            </div>
            <div style={{ height: '8px', width: '100%', background: '#e5e7eb', borderRadius: '4px', overflow: 'hidden', display: 'flex' }}>
              <div style={{ width: `${breakdown.dineInPct}%`, background: '#57695b' }} />
              <div style={{ width: `${breakdown.takeawayPct}%`, background: '#f59e0b' }} />
            </div>
          </div>

          <div style={{ height: '1px', background: '#f0f0eb' }} />

          {/* Info Potongan Diskon / Promo */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
            <span style={{ color: '#71717a' }}>Potongan Promo / Diskon:</span>
            <span style={{ fontWeight: 700, color: totalDiscounts > 0 ? '#dc2626' : '#1c2826' }}>
              Rp {totalDiscounts.toLocaleString('id-ID')}
            </span>
          </div>
        </div>
      </div>

      {/* 4. BARIS BAWAH: Menu Terlaris & Bahan Baku Kritis */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
          gap: '16px',
        }}
      >
        {/* Menu Terlaris */}
        <div
          style={{
            background: '#ffffff',
            padding: '20px',
            borderRadius: '12px',
            border: '1px solid #e7e8e3',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#1c2826', margin: 0 }}>
              Menu Terlaris
            </h3>
            <button
              type="button"
              onClick={() => onNavigateTab ? onNavigateTab('matrix') : router.push('/matriks')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '11px',
                fontWeight: 700,
                color: '#2d6a4f',
                background: '#eef6ef',
                border: '1px solid #c2e0c7',
                padding: '3px 8px',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
              title="Buka Halaman Analisis Matriks Menu BCG Lengkap"
            >
              <TrendingUp size={12} />
              Analisis BCG
            </button>
          </div>

          {!summary?.topProducts || summary.topProducts.length === 0 ? (
            <div
              style={{
                height: '140px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#8b968f',
                fontSize: '13px',
              }}
            >
              Belum ada penjualan menu pada periode ini.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {summary.topProducts.map((p, idx) => {
                const maxQty = Number(summary.topProducts[0]?.total_qty || 1);
                const pct = Math.round((Number(p.total_qty) / maxQty) * 100);

                return (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      background: '#fafbf9',
                      border: '1px solid #f0f2eb',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#1c2826' }}>
                        {idx + 1}. {p.name}
                      </span>
                      <div>
                        <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#57695b' }}>
                          Rp {Number(p.total_revenue).toLocaleString('id-ID')}
                        </span>
                        <span style={{ fontSize: '11.5px', color: '#71717a', marginLeft: '6px' }}>
                          ({p.total_qty} porsi)
                        </span>
                      </div>
                    </div>
                    <div style={{ height: '3px', width: '100%', background: '#ebece6', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: '#57695b' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Bahan Baku Kritis */}
        <div
          style={{
            background: '#ffffff',
            padding: '20px',
            borderRadius: '12px',
            border: '1px solid #e7e8e3',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#1c2826', margin: 0 }}>
              Bahan Baku Kritis
            </h3>
            {criticalIngredients.length > 0 && (
              <span
                onClick={() => onNavigateTab && onNavigateTab('inventory')}
                style={{ fontSize: '12px', color: '#57695b', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
              >
                Kelola Stok &rarr;
              </span>
            )}
          </div>

          {criticalIngredients.length === 0 ? (
            <div
              style={{
                height: '140px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#15803d',
                fontSize: '13px',
                fontWeight: 600,
              }}
            >
              Semua bahan baku aman di atas batas minimum.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {criticalIngredients.slice(0, 4).map((ing) => (
                <div
                  key={ing.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    background: '#fff8f6',
                    border: '1px solid #fee2e2',
                  }}
                >
                  <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#991b1b' }}>
                    {ing.name} ({ing.code || '-'})
                  </span>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#b91c1c' }}>
                    {Number(ing.stock_actual)} {ing.usage_unit} <span style={{ fontWeight: 400, color: '#71717a' }}>(Min: {Number(ing.safe_stock)})</span>
                  </span>
                </div>
              ))}
              {criticalIngredients.length > 4 && (
                <span style={{ fontSize: '11px', color: '#71717a', textAlign: 'center' }}>
                  +{criticalIngredients.length - 4} bahan lainnya
                </span>
              )}
            </div>
          )}

          {criticalIngredients.length > 0 && (
            <button
              onClick={() => onNavigateTab && onNavigateTab('inventory')}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                background: '#f4f5f1',
                border: '1px solid #e1e4dc',
                color: '#57695b',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Buka Manajemen Stok
            </button>
          )}
        </div>
      </div>

      {/* 5. BARIS TRANSAKSI TERKINI (Live Feed Transaksi Ringkas & Padat) */}
      <div
        style={{
          background: '#ffffff',
          padding: '20px',
          borderRadius: '12px',
          border: '1px solid #e7e8e3',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#1c2826', margin: 0 }}>
            Transaksi Terkini
          </h3>
          <span
            onClick={() => onNavigateTab && onNavigateTab('orders')}
            style={{
              fontSize: '12px',
              color: '#57695b',
              fontWeight: 600,
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            Lihat Semua Transaksi &rarr;
          </span>
        </div>

        {recentOrders.length === 0 ? (
          <div
            style={{
              height: '70px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#8b968f',
              fontSize: '13px',
            }}
          >
            Belum ada transaksi pada periode ini.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12.5px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #eef0ea', color: '#71717a', fontSize: '11px', textTransform: 'uppercase' }}>
                  <th style={{ padding: '8px 10px', fontWeight: 700 }}>Waktu</th>
                  <th style={{ padding: '8px 10px', fontWeight: 700 }}>No. Pesanan</th>
                  <th style={{ padding: '8px 10px', fontWeight: 700 }}>Layanan</th>
                  <th style={{ padding: '8px 10px', fontWeight: 700 }}>Pembayaran</th>
                  <th style={{ padding: '8px 10px', fontWeight: 700, textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((o) => {
                  const timeStr = o.paid_at
                    ? new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }).format(new Date(o.paid_at))
                    : '-';
                  const payMethod = o.payments?.[0]?.method || 'CASH';
                  const tableInfo = o.order_type === 'DINE_IN' ? `Dine In (${o.table_number ? `Meja ${o.table_number}` : 'Meja'})` : 'Takeaway';

                  return (
                    <tr key={o.id} style={{ borderBottom: '1px solid #f4f5f1' }}>
                      <td style={{ padding: '10px', color: '#71717a', whiteSpace: 'nowrap' }}>{timeStr}</td>
                      <td style={{ padding: '10px', fontWeight: 700, color: '#1c2826' }}>{o.order_number}</td>
                      <td style={{ padding: '10px', color: '#4b5563' }}>{tableInfo}</td>
                      <td style={{ padding: '10px' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 700,
                            background: payMethod === 'CASH' ? '#f0f5f1' : '#eff6ff',
                            color: payMethod === 'CASH' ? '#57695b' : '#2563eb',
                          }}
                        >
                          {payMethod}
                        </span>
                      </td>
                      <td style={{ padding: '10px', fontWeight: 700, color: '#1c2826', textAlign: 'right' }}>
                        Rp {Number(o.total_amount).toLocaleString('id-ID')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
