import React, { useState, useEffect } from 'react';
import { Armchair, CheckCircle2, AlertCircle, RefreshCw, Sparkles, Clock, Users } from 'lucide-react';
import { tableApi } from '../api/client';
import type { CafeTable } from '../types';

interface TableLayoutViewProps {
  onNotify: (msg: string) => void;
}

export const TableLayoutView: React.FC<TableLayoutViewProps> = ({ onNotify }) => {
  const [tables, setTables] = useState<CafeTable[]>([]);
  const [selectedArea, setSelectedArea] = useState<string>('SEMUA');
  const [loading, setLoading] = useState<boolean>(false);
  const [clearingId, setClearingId] = useState<string | null>(null);

  const loadTables = async () => {
    setLoading(true);
    try {
      const res = await tableApi.getAll();
      if (res.success && res.data) {
        setTables(res.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTables();
    const interval = setInterval(loadTables, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleClearTable = async (tableId: string, tableNumber: string) => {
    setClearingId(tableId);
    try {
      const res = await tableApi.clear(tableId);
      if (res.success) {
        onNotify(`Meja ${tableNumber} telah dibersihkan & kembali siap digunakan.`);
        loadTables();
      } else {
        onNotify(res.message || 'Gagal membersihkan meja.');
      }
    } catch (err: any) {
      onNotify('Terjadi kesalahan membersihkan meja.');
    } finally {
      setClearingId(null);
    }
  };

  const areas = ['SEMUA', 'INDOOR', 'OUTDOOR', 'BAR'];

  const filteredTables = tables.filter((t) => {
    if (selectedArea === 'SEMUA') return true;
    return t.area === selectedArea;
  });

  const countAvailable = tables.filter((t) => t.status === 'AVAILABLE').length;
  const countOccupied = tables.filter((t) => t.status === 'OCCUPIED').length;
  const countReserved = tables.filter((t) => t.status === 'RESERVED').length;

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-64px)] overflow-y-auto bg-[#121316] text-white p-6">
      <div className="max-w-7xl w-full mx-auto space-y-6">
        {/* Header & KPI Statistics */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Armchair className="text-[#c59a68]" size={24} />
              <span>Denah & Manajemen Meja</span>
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Pantau okupansi meja makan di tempat (Dine In) secara langsung
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadTables}
              disabled={loading}
              className="p-2 rounded-xl bg-[#1e2026] hover:bg-[#282b33] border border-[#2e313c] text-zinc-300 transition"
              title="Segarkan Denah"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>

            {/* KPI Badges */}
            <div className="flex items-center gap-2 text-xs">
              <span className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                {countAvailable} Kosong
              </span>
              <span className="px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 font-semibold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
                {countOccupied} Terisi
              </span>
              <span className="px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 font-semibold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-400" />
                {countReserved} Reservasi
              </span>
            </div>
          </div>
        </div>

        {/* Area Filter Buttons */}
        <div className="flex space-x-2 border-b border-[#252832] pb-3">
          {areas.map((a) => (
            <button
              key={a}
              onClick={() => setSelectedArea(a)}
              className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition ${
                selectedArea === a
                  ? 'bg-[#c59a68] text-black shadow-md shadow-[#c59a68]/20'
                  : 'bg-[#1a1c22] text-zinc-400 hover:text-white border border-[#282a34]'
              }`}
            >
              Area {a}
            </button>
          ))}
        </div>

        {/* Tables Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredTables.map((t) => {
            const isOccupied = t.status === 'OCCUPIED';
            const isReserved = t.status === 'RESERVED';
            const isClearing = clearingId === t.id;

            return (
              <div
                key={t.id}
                className={`relative rounded-2xl p-4 border flex flex-col justify-between transition-all duration-200 ${
                  isOccupied
                    ? 'bg-gradient-to-b from-[#241717] to-[#1a1313] border-rose-500/40 shadow-lg shadow-rose-950/20'
                    : isReserved
                    ? 'bg-[#161a24] border-blue-500/40'
                    : 'bg-[#16181f] border-[#262832] hover:border-emerald-500/40'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/40 text-zinc-400 border border-white/5">
                      {t.area}
                    </span>
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        isOccupied
                          ? 'bg-rose-500 animate-pulse'
                          : isReserved
                          ? 'bg-blue-400'
                          : 'bg-emerald-400'
                      }`}
                    />
                  </div>

                  <div className="text-center py-2">
                    <div className="text-2xl font-black font-mono text-zinc-100">
                      {t.table_number}
                    </div>
                    <div className="text-[11px] text-zinc-400 flex items-center justify-center gap-1 mt-1">
                      <Users size={12} />
                      <span>Kapasitas {t.capacity} Kursi</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-white/5">
                  <div className="text-center text-xs mb-3">
                    {isOccupied && (
                      <span className="text-rose-400 font-semibold flex items-center justify-center gap-1">
                        <Clock size={12} />
                        <span>Sedang Digunakan</span>
                      </span>
                    )}
                    {isReserved && (
                      <span className="text-blue-400 font-semibold">Telah Direservasi</span>
                    )}
                    {!isOccupied && !isReserved && (
                      <span className="text-emerald-400 font-semibold">Siap Digunakan</span>
                    )}
                  </div>

                  {isOccupied ? (
                    <button
                      onClick={() => handleClearTable(t.id, t.table_number)}
                      disabled={isClearing}
                      className="w-full py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
                    >
                      <Sparkles size={13} />
                      <span>{isClearing ? 'Membersihkan...' : 'Selesai & Bersihkan'}</span>
                    </button>
                  ) : (
                    <div className="text-center py-1.5 text-[11px] text-zinc-500">
                      Tersedia untuk tamu
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {filteredTables.length === 0 && (
          <div className="text-center py-16 text-zinc-500">
            <Armchair size={36} className="mx-auto mb-2 text-zinc-600" />
            <p className="text-sm">Tidak ada meja pada area ini.</p>
          </div>
        )}
      </div>
    </div>
  );
};
