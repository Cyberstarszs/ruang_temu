import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Calendar, DollarSign, CreditCard, ShoppingBag, RefreshCw } from 'lucide-react';
import { rupiah, formatDate } from '../utils/formatters';
import { reportApi } from '../api/client';
import type { DailySummary } from '../types';

export const ReportsView: React.FC = () => {
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [topProducts, setTopProducts] = useState<Array<{ name: string; quantity: number; revenue: number }>>([]);
  const [hourly, setHourly] = useState<Array<{ hour: number; total_orders: number; total_sales: number }>>([]);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [loading, setLoading] = useState<boolean>(false);

  const loadReports = async () => {
    setLoading(true);
    try {
      const [sumRes, topRes, hourRes] = await Promise.all([
        reportApi.getDailySummary(selectedDate),
        reportApi.getTopProducts(),
        reportApi.getHourlyHeatmap(selectedDate),
      ]);

      if (sumRes.success && sumRes.data) setSummary(sumRes.data);
      if (topRes.success && topRes.data) setTopProducts(topRes.data);
      if (hourRes.success && hourRes.data) setHourly(hourRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [selectedDate]);

  const netSales = (summary as any)?.netSales ?? (summary as any)?.total_net_sales ?? 0;
  const totalOrders = (summary as any)?.totalTransactions ?? (summary as any)?.total_orders ?? 0;
  const avgTicket = (summary as any)?.averageBasketSize ?? (summary as any)?.average_ticket_size ?? 0;
  const grossProfit = (summary as any)?.grossProfit ?? 0;

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-64px)] overflow-y-auto bg-[#121316] text-white p-6">
      <div className="max-w-7xl w-full mx-auto space-y-6">
        {/* Header & Date Picker */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <BarChart3 className="text-[#c59a68]" size={24} />
              <span>Laporan & Analisis Penjualan</span>
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Perhitungan Nett Pricing (Total = Subtotal - Promo - DP)
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-[#1e2026] border border-[#2e313c] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#c59a68]"
            />
            <button
              onClick={loadReports}
              disabled={loading}
              className="p-2 rounded-xl bg-[#1e2026] hover:bg-[#282b33] border border-[#2e313c] text-zinc-300 transition"
              title="Segarkan Laporan"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* 4 Primary KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#181a20] border border-[#262832] rounded-2xl p-4">
            <div className="text-xs text-zinc-400 flex items-center justify-between">
              <span>Total Omset Bersih (Net)</span>
              <DollarSign size={16} className="text-[#c59a68]" />
            </div>
            <div className="text-2xl font-black font-mono text-[#c59a68] mt-2">
              {rupiah(netSales)}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">
              Profit Kotor: {rupiah(grossProfit)}
            </div>
          </div>

          <div className="bg-[#181a20] border border-[#262832] rounded-2xl p-4">
            <div className="text-xs text-zinc-400 flex items-center justify-between">
              <span>Total Transaksi Selesai</span>
              <ShoppingBag size={16} className="text-emerald-400" />
            </div>
            <div className="text-2xl font-black font-mono text-zinc-100 mt-2">
              {totalOrders}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Pesanan lunas & terverifikasi</div>
          </div>

          <div className="bg-[#181a20] border border-[#262832] rounded-2xl p-4">
            <div className="text-xs text-zinc-400 flex items-center justify-between">
              <span>Rata-rata Transaksi (AOV)</span>
              <TrendingUp size={16} className="text-blue-400" />
            </div>
            <div className="text-2xl font-black font-mono text-blue-300 mt-2">
              {rupiah(avgTicket)}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Per tiket transaksi kasir</div>
          </div>

          <div className="bg-[#181a20] border border-[#262832] rounded-2xl p-4">
            <div className="text-xs text-zinc-400 flex items-center justify-between">
              <span>Laba Kotor (Gross Profit)</span>
              <CreditCard size={16} className="text-emerald-400" />
            </div>
            <div className="text-2xl font-black font-mono text-emerald-400 mt-2">
              {rupiah(grossProfit)}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Setelah HPP bahan baku</div>
          </div>
        </div>

        {/* Breakdown Payment Methods & Top Products */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Payment Method Breakdown */}
          <div className="bg-[#181a20] border border-[#262832] rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
              <CreditCard size={17} className="text-[#c59a68]" />
              <span>Distribusi Metode Pembayaran</span>
            </h3>

            <div className="space-y-3">
              {summary?.payment_breakdown &&
                Object.entries(summary.payment_breakdown).map(([method, amount]) => (
                  <div key={method} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-zinc-300">{method}</span>
                      <span className="font-mono text-[#c59a68]">{rupiah(amount)}</span>
                    </div>
                    <div className="w-full bg-[#121316] rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-[#c59a68] h-full rounded-full"
                        style={{
                          width: `${
                            summary.total_net_sales > 0
                              ? Math.min(100, (Number(amount) / summary.total_net_sales) * 100)
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              {(!summary?.payment_breakdown ||
                Object.keys(summary.payment_breakdown).length === 0) && (
                <div className="text-center py-6 text-xs text-zinc-500">
                  Belum ada data pembayaran pada tanggal ini.
                </div>
              )}
            </div>
          </div>

          {/* Top Selling Products */}
          <div className="bg-[#181a20] border border-[#262832] rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
              <ShoppingBag size={17} className="text-[#c59a68]" />
              <span>Menu Paling Laris (Top Products)</span>
            </h3>

            <div className="space-y-2">
              {topProducts.map((p, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-[#14151a] border border-[#262832]"
                >
                  <div className="flex items-center space-x-3">
                    <span className="w-6 h-6 rounded-lg bg-[#252834] text-[#c59a68] flex items-center justify-center font-mono font-bold text-xs">
                      {idx + 1}
                    </span>
                    <div>
                      <div className="text-xs font-bold text-zinc-200">{p.name}</div>
                      <div className="text-[11px] text-zinc-400 font-mono">
                        {p.quantity} porsi terjual
                      </div>
                    </div>
                  </div>
                  <div className="font-mono text-xs font-bold text-[#c59a68]">
                    {rupiah(p.revenue)}
                  </div>
                </div>
              ))}
              {topProducts.length === 0 && (
                <div className="text-center py-6 text-xs text-zinc-500">
                  Belum ada data menu terjual.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
