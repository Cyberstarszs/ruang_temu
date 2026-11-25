'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { DailySummary, HourlyHeatmapItem, Ingredient } from '@/types';
import { DateRangePicker, DateRange } from '@/components/ui/date-range-picker';
import {
  TrendingUp,
  ReceiptText,
  Wallet,
  ShoppingBag,
  AlertTriangle,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

interface AdminDashboardViewProps {
  onNavigateTab?: (tab: string) => void;
}

export function AdminDashboardView({ onNavigateTab }: AdminDashboardViewProps) {
  // Default tanggal: hari ini (Asia/Jakarta), diseragamkan dengan halaman sif dan transaksi
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
    return { from: today, to: today };
  });
  const [isLoading, setIsLoading] = useState(true);
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [heatmap, setHeatmap] = useState<HourlyHeatmapItem[]>([]);
  const [criticalIngredients, setCriticalIngredients] = useState<Ingredient[]>([]);

  const loadData = async (range?: DateRange) => {
    const targetRange = range || dateRange;
    setIsLoading(true);
    try {
      const from = targetRange.from || new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
      const to = targetRange.to || from;

      const [sumRes, heatRes, invRes] = await Promise.all([
        api.reports.getDailySummary({ from, to }),
        api.reports.getHourlyHeatmap({ from, to }),
        api.inventory.getAll(),
      ]);

      if (sumRes.success && sumRes.data) {
        setSummary(sumRes.data);
      }
      if (heatRes.success && heatRes.data) {
        setHeatmap(heatRes.data);
      }
      if (invRes.success && invRes.data) {
        const critical = invRes.data.filter(
          (ing: Ingredient) => Number(ing.stock_actual) <= Number(ing.safe_stock)
        );
        setCriticalIngredients(critical);
      }
    } catch (err) {
      console.error('Failed to load executive summary:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData(dateRange);
  }, [dateRange.from, dateRange.to]);

  const maxHourlySales = Math.max(1, ...heatmap.map((h) => h.salesVolume));

  const dateDisplay = dateRange.from
    ? dateRange.from === dateRange.to || !dateRange.to
      ? dateRange.from
      : `${dateRange.from} s.d. ${dateRange.to}`
    : 'hari ini';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '80px' }}>
      {/* Minimal Filter Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          flexWrap: 'wrap',
        }}
      >
        <span style={{ fontSize: '13px', fontWeight: 600, color: '#71717a' }}>
          Ringkasan Performa Kafe
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <DateRangePicker
            value={dateRange}
            onChange={(r) => setDateRange(r)}
            placeholder="Rentang Tanggal Dasbor..."
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
              padding: '0 16px',
              background: '#57695b',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '12.5px',
              cursor: 'pointer',
              height: '38px',
              boxShadow: '0 1px 3px rgba(87, 105, 91, 0.25)',
              transition: 'background 0.15s ease',
              whiteSpace: 'nowrap',
            }}
            title="Muat ulang data performa"
            onMouseEnter={(e) => (e.currentTarget.style.background = '#46554a')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#57695b')}
          >
            <RotateCcw size={13} className={isLoading ? 'animate-spin' : ''} />
            Perbarui
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px',
        }}
      >
        {/* Card 1: Net Sales */}
        <div
          style={{
            background: '#ffffff',
            padding: '20px',
            borderRadius: '16px',
            border: '1px solid #e7e8e3',
            boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#64746b', textTransform: 'uppercase' }}>
              Penjualan Bersih
            </span>
            <div style={{ padding: '8px', background: 'rgba(87, 105, 91, 0.1)', borderRadius: '10px' }}>
              <Wallet size={18} color="#57695b" />
            </div>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#1c2826' }}>
            Rp {Number(summary?.netSales || 0).toLocaleString('id-ID')}
          </div>
          <div style={{ fontSize: '12px', color: '#64746b' }}>
            Total {summary?.totalTransactions || 0} transaksi berhasil
          </div>
        </div>

        {/* Card 2: Gross Profit & Margin */}
        <div
          style={{
            background: '#ffffff',
            padding: '20px',
            borderRadius: '16px',
            border: '1px solid #e7e8e3',
            boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#64746b', textTransform: 'uppercase' }}>
              Estimasi Laba Kotor
            </span>
            <div style={{ padding: '8px', background: 'rgba(46, 125, 50, 0.1)', borderRadius: '10px' }}>
              <TrendingUp size={18} color="#2e7d32" />
            </div>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#2e7d32' }}>
            Rp {Number(summary?.grossProfit || 0).toLocaleString('id-ID')}
          </div>
          <div style={{ fontSize: '12px', color: '#64746b' }}>
            Margin: <strong style={{ color: '#2e7d32' }}>{summary?.grossMarginPercentage || '0'}%</strong> (HPP: Rp {Number(summary?.totalCogs || 0).toLocaleString('id-ID')})
          </div>
        </div>

        {/* Card 3: Average Basket Size */}
        <div
          style={{
            background: '#ffffff',
            padding: '20px',
            borderRadius: '16px',
            border: '1px solid #e7e8e3',
            boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#64746b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Nilai Rata-rata Keranjang
            </span>
            <div style={{ padding: '8px', background: 'rgba(21, 101, 192, 0.1)', borderRadius: '10px' }}>
              <ShoppingBag size={18} color="#1565c0" />
            </div>
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#1c2826', whiteSpace: 'nowrap' }}>
            Rp {Number(summary?.averageBasketSize || 0).toLocaleString('id-ID')}
          </div>
        </div>

        {/* Card 4: Critical Stock Alert */}
        <div
          style={{
            background: criticalIngredients.length > 0 ? '#fff8f6' : '#ffffff',
            padding: '20px',
            borderRadius: '16px',
            border: criticalIngredients.length > 0 ? '1px solid #ffccbc' : '1px solid #e7e8e3',
            boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: criticalIngredients.length > 0 ? '#c62828' : '#64746b', textTransform: 'uppercase' }}>
              Bahan Baku Kritis
            </span>
            <div style={{ padding: '8px', background: criticalIngredients.length > 0 ? 'rgba(198, 40, 40, 0.1)' : 'rgba(87, 105, 91, 0.1)', borderRadius: '10px' }}>
              <AlertTriangle size={18} color={criticalIngredients.length > 0 ? '#c62828' : '#57695b'} />
            </div>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: criticalIngredients.length > 0 ? '#c62828' : '#1c2826' }}>
            {criticalIngredients.length} Bahan
          </div>
          <div style={{ fontSize: '12px', color: '#64746b' }}>
            {criticalIngredients.length > 0 ? (
              <span
                onClick={() => onNavigateTab && onNavigateTab('inventory')}
                style={{ color: '#c62828', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
              >
                Lihat dan buat Purchase Order segera &rarr;
              </span>
            ) : (
              'Semua bahan baku di atas stok aman'
            )}
          </div>
        </div>
      </div>

      {/* Main Grid: Heatmap + Top Selling Products */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
          gap: '24px',
        }}
      >
        {/* Hourly Peak Heatmap Chart */}
        <div
          style={{
            background: '#ffffff',
            padding: '24px',
            borderRadius: '16px',
            border: '1px solid #e7e8e3',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#1c2826', margin: 0 }}>
              Jam Sibuk (Hourly Heatmap)
            </h3>
            <Sparkles size={16} color="#57695b" />
          </div>

          {heatmap.length === 0 ? (
            <div
              style={{
                height: '220px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#8b968f',
                fontSize: '13px',
                fontStyle: 'italic',
              }}
            >
              Belum ada transaksi tercatat pada periode {dateDisplay}.
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                gap: '3px',
                height: '190px',
                paddingTop: '20px',
                borderBottom: '2px solid #e2e4dc',
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
                      <span style={{ fontSize: '9.5px', fontWeight: 700, color: '#57695b' }}>
                        {count}
                      </span>
                    ) : (
                      <span style={{ fontSize: '9px', opacity: 0 }}>0</span>
                    )}
                    <div
                      style={{
                        width: '100%',
                        height: `${Math.max(count > 0 ? 12 : 3, heightPct)}%`,
                        background: count > 0 ? '#57695b' : '#e7e8e3',
                        borderRadius: '3px 3px 0 0',
                        transition: 'height 0.3s ease, background 0.15s ease',
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
              paddingTop: '2px',
            }}
          >
            <span>00:00 (Malam)</span>
            <span>06:00 (Pagi)</span>
            <span>12:00 (Siang)</span>
            <span>18:00 (Sore)</span>
            <span>23:00 (Malam)</span>
          </div>
          <div
            style={{
              fontSize: '11px',
              color: '#687768',
              background: '#f8faf6',
              padding: '6px 12px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>💡 Arahkan kursor ke tiap batang jam (0–23) untuk melihat rincian omzet &amp; jumlah pesanan.</span>
          </div>
        </div>

        {/* Top 5 Best Sellers */}
        <div
          style={{
            background: '#ffffff',
            padding: '24px',
            borderRadius: '16px',
            border: '1px solid #e7e8e3',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#1c2826', margin: 0 }}>
              Menu Terlaris Periode Ini
            </h3>
            <ReceiptText size={16} color="#57695b" />
          </div>

          {!summary?.topProducts || summary.topProducts.length === 0 ? (
            <div
              style={{
                height: '220px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#8b968f',
                fontSize: '13px',
                fontStyle: 'italic',
              }}
            >
              Belum ada penjualan menu pada periode {dateDisplay}.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {summary.topProducts.map((p, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    background: '#fbfbf9',
                    border: '1px solid #eceee6',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '8px',
                        background: idx === 0 ? '#57695b' : '#e2e4dc',
                        color: idx === 0 ? '#ffffff' : '#57695b',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '13px',
                      }}
                    >
                      {idx + 1}
                    </div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#1c2826' }}>
                        {p.name}
                      </div>
                      <div style={{ fontSize: '12px', color: '#64746b' }}>
                        Terjual: <strong>{p.total_qty} porsi</strong>
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#57695b' }}>
                      Rp {Number(p.total_revenue).toLocaleString('id-ID')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
