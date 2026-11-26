import React, { useState, useEffect } from 'react';
import { UtensilsCrossed, Coffee, Clock, CheckCircle2, RefreshCw, Printer } from 'lucide-react';
import { orderApi } from '../api/client';
import { formatTime } from '../utils/formatters';
import type { Order } from '../types';

interface KitchenBarQueueViewProps {
  onNotify: (msg: string) => void;
}

export const KitchenBarQueueView: React.FC<KitchenBarQueueViewProps> = ({ onNotify }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState<'ALL' | 'BAR' | 'KITCHEN'>('ALL');
  const [loading, setLoading] = useState<boolean>(false);

  const loadPaidOrders = async () => {
    setLoading(true);
    try {
      const res = await orderApi.getOrders({ status: 'PAID', limit: 30 });
      if (res.success && res.data) {
        setOrders(res.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPaidOrders();
    const interval = setInterval(loadPaidOrders, 8000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-64px)] overflow-y-auto bg-[#121316] text-white p-6">
      <div className="max-w-7xl w-full mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <UtensilsCrossed className="text-[#c59a68]" size={24} />
              <span>Antrian Produksi Bar & Dapur</span>
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Pesanan lunas yang dicetak otomatis ke Network Printer Bar (Port 9100) & Kitchen (Port 9100)
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadPaidOrders}
              disabled={loading}
              className="p-2 rounded-xl bg-[#1e2026] hover:bg-[#282b33] border border-[#2e313c] text-zinc-300 transition"
              title="Segarkan Antrian"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>

            {/* Station Filter */}
            <div className="flex bg-[#1a1c22] p-1 rounded-xl border border-[#282a34]">
              {[
                { id: 'ALL', label: 'Semua Station' },
                { id: 'BAR', label: 'Bar Minuman' },
                { id: 'KITCHEN', label: 'Dapur Makanan' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    activeTab === tab.id
                      ? 'bg-[#c59a68] text-black shadow-sm'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Live Orders Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {orders.map((ord) => {
            const hasDrink = ord.items.some((i) =>
              /kopi|tea|latte|espresso|americano|soda|mocktail|ice|jus/i.test(i.product_name)
            );
            const hasFood = ord.items.some(
              (i) => !/kopi|tea|latte|espresso|americano|soda|mocktail|ice|jus/i.test(i.product_name)
            );

            if (activeTab === 'BAR' && !hasDrink) return null;
            if (activeTab === 'KITCHEN' && !hasFood) return null;

            return (
              <div
                key={ord.id}
                className="bg-[#181a20] border border-[#2a2d38] rounded-2xl p-4 flex flex-col justify-between shadow-lg"
              >
                <div>
                  <div className="flex items-start justify-between pb-3 border-b border-[#252832]">
                    <div>
                      <div className="font-mono text-base font-extrabold text-[#c59a68]">
                        #{ord.order_number}
                      </div>
                      <div className="text-xs text-zinc-300 mt-0.5">
                        {ord.table_number ? `Meja ${ord.table_number}` : 'Takeaway'}
                        {ord.customer_name ? ` · ${ord.customer_name}` : ''}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[11px] text-zinc-400 flex items-center gap-1">
                        <Clock size={12} />
                        <span>{formatTime(ord.created_at)}</span>
                      </div>
                      <span className="text-[10px] uppercase font-bold text-emerald-400 mt-0.5 inline-block">
                        Lunas
                      </span>
                    </div>
                  </div>

                  {/* Items to Make */}
                  <div className="py-3 space-y-2">
                    {ord.items.map((it, idx) => (
                      <div key={idx} className="bg-[#131418] p-2.5 rounded-xl border border-[#22242c]">
                        <div className="flex items-center justify-between text-xs font-bold text-zinc-100">
                          <span>
                            {it.quantity}x {it.product_name}
                          </span>
                        </div>
                        {it.modifiers && it.modifiers.length > 0 && (
                          <div className="text-[10px] text-zinc-400 mt-1 flex flex-wrap gap-1">
                            {it.modifiers.map((m, mi) => (
                              <span key={mi} className="px-1.5 py-0.5 bg-[#20222a] rounded text-amber-300/90">
                                {m}
                              </span>
                            ))}
                          </div>
                        )}
                        {it.notes && (
                          <div className="text-[10px] text-rose-300/80 italic mt-1">
                            Catatan: {it.notes}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t border-[#252832] flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                    <Printer size={13} className="text-[#c59a68]" />
                    <span>Checker Network ESC/POS OK</span>
                  </div>
                  <button
                    onClick={() => onNotify(`Order #${ord.order_number} disajikan.`)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs transition flex items-center gap-1"
                  >
                    <CheckCircle2 size={13} />
                    <span>Siap Saji</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {orders.length === 0 && (
          <div className="text-center py-20 text-zinc-500">
            <UtensilsCrossed size={40} className="mx-auto mb-2 text-zinc-600" />
            <p className="text-sm">Semua pesanan telah diproses.</p>
            <p className="text-xs text-zinc-600 mt-1">Pesanan lunas baru akan otomatis muncul di sini.</p>
          </div>
        )}
      </div>
    </div>
  );
};
