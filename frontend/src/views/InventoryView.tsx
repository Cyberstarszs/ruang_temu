import React, { useState, useEffect } from 'react';
import { Boxes, AlertTriangle, Plus, RefreshCw, Trash2, CheckCircle2, X } from 'lucide-react';
import { rupiah } from '../utils/formatters';
import { inventoryApi } from '../api/client';
import type { Ingredient } from '../types';

interface InventoryViewProps {
  onNotify: (msg: string) => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({ onNotify }) => {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [filterMode, setFilterMode] = useState<'ALL' | 'LOW'>('ALL');

  // Wastage Modal
  const [wastageItem, setWastageItem] = useState<Ingredient | null>(null);
  const [wastageQty, setWastageQty] = useState<string>('');
  const [wastageReason, setWastageReason] = useState<string>('Kadaluarsa / Rusak');

  // Stocktake Modal
  const [showStocktake, setShowStocktake] = useState<boolean>(false);
  const [stocktakeCounts, setStocktakeCounts] = useState<Record<string, string>>({});

  const loadInventory = async () => {
    setLoading(true);
    try {
      const res = await inventoryApi.getAll();
      if (res.success && res.data) {
        setIngredients(res.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInventory();
  }, []);

  const getStock = (i: Ingredient) => Number(i.stock_actual ?? i.current_stock ?? 0);
  const getSafe = (i: Ingredient) => Number(i.safe_stock ?? i.minimum_stock ?? 0);
  const getUnit = (i: Ingredient) => i.usage_unit || i.unit || 'pcs';
  const getCost = (i: Ingredient) => Number(i.unit_cost ?? i.cost_per_unit ?? 0);

  const filteredIngredients = ingredients.filter((item) => {
    if (filterMode === 'LOW') {
      return getStock(item) <= getSafe(item);
    }
    return true;
  });

  const lowStockCount = ingredients.filter(
    (item) => getStock(item) <= getSafe(item)
  ).length;

  const handleRecordWastage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wastageItem) return;
    const qty = Number(wastageQty);
    if (!qty || qty <= 0) {
      alert('Jumlah wastage harus lebih dari 0.');
      return;
    }

    try {
      const res = await inventoryApi.recordWastage(wastageItem.id, qty, wastageReason);
      if (res.success) {
        onNotify(`Wastage ${qty} ${getUnit(wastageItem)} ${wastageItem.name} berhasil dicatat.`);
        setWastageItem(null);
        setWastageQty('');
        loadInventory();
      } else {
        alert(res.message || 'Gagal mencatat wastage.');
      }
    } catch (err: any) {
      alert(err.message || 'Gagal mencatat wastage.');
    }
  };

  const handleStocktakeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const items = Object.entries(stocktakeCounts)
      .filter(([_, count]) => count !== '')
      .map(([id, count]) => ({
        ingredientId: id,
        actualCount: Number(count),
        notes: 'Opname fisik mandiri',
      }));

    if (items.length === 0) {
      alert('Isi minimal satu jumlah fisik bahan untuk opname.');
      return;
    }

    try {
      const res = await inventoryApi.stocktake(items);
      if (res.success) {
        onNotify('Penyesuaian stok fisik (Stock Opname) berhasil disimpan.');
        setShowStocktake(false);
        setStocktakeCounts({});
        loadInventory();
      } else {
        alert(res.message || 'Gagal menyimpan opname.');
      }
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan opname.');
    }
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-64px)] overflow-y-auto bg-[#121316] text-white p-6">
      <div className="max-w-7xl w-full mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Boxes className="text-[#c59a68]" size={24} />
              <span>Inventaris & Manajemen Bahan Baku</span>
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Stok berkurang otomatis saat menu terjual berdasarkan resep terverifikasi
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setShowStocktake(true)}
              className="px-3 py-1.5 bg-[#252834] hover:bg-[#313544] text-zinc-200 border border-[#353949] rounded-xl text-xs font-semibold transition"
            >
              Stock Opname
            </button>
            <button
              onClick={loadInventory}
              disabled={loading}
              className="p-2 rounded-xl bg-[#1e2026] hover:bg-[#282b33] border border-[#2e313c] text-zinc-300 transition"
              title="Segarkan Stok"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex space-x-2 border-b border-[#252832] pb-3">
          <button
            onClick={() => setFilterMode('ALL')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
              filterMode === 'ALL'
                ? 'bg-[#c59a68] text-black'
                : 'bg-[#1a1c22] text-zinc-400 hover:text-white border border-[#282a34]'
            }`}
          >
            Semua Bahan ({ingredients.length})
          </button>
          <button
            onClick={() => setFilterMode('LOW')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
              filterMode === 'LOW'
                ? 'bg-rose-500 text-white'
                : 'bg-[#1a1c22] text-zinc-400 hover:text-white border border-[#282a34]'
            }`}
          >
            <AlertTriangle size={13} className="text-rose-400" />
            <span>Stok Kritis ({lowStockCount})</span>
          </button>
        </div>

        {/* Inventory Table */}
        <div className="bg-[#181a20] border border-[#262832] rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#14151a] text-zinc-400 uppercase font-mono tracking-wider border-b border-[#262832]">
                <tr>
                  <th className="py-3 px-4">Nama Bahan</th>
                  <th className="py-3 px-4">Stok Sekarang</th>
                  <th className="py-3 px-4">Batas Aman</th>
                  <th className="py-3 px-4">Harga / Satuan</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#242630]">
                {filteredIngredients.map((item) => {
                  const isLow = getStock(item) <= getSafe(item);
                  const unit = getUnit(item);
                  return (
                    <tr key={item.id} className="hover:bg-[#1f212a] transition">
                      <td className="py-3 px-4 font-bold text-zinc-100">{item.name}</td>
                      <td className="py-3 px-4 font-mono font-bold text-sm">
                        {getStock(item).toLocaleString('id-ID')} {unit}
                      </td>
                      <td className="py-3 px-4 font-mono text-zinc-400">
                        {getSafe(item).toLocaleString('id-ID')} {unit}
                      </td>
                      <td className="py-3 px-4 font-mono text-zinc-300">
                        {rupiah(getCost(item))} / {unit}
                      </td>
                      <td className="py-3 px-4">
                        {isLow ? (
                          <span className="px-2 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 font-bold text-[10px] inline-flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
                            Stok Kritis
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold text-[10px] inline-flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            Aman
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setWastageItem(item)}
                          className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-lg text-[11px] font-semibold transition"
                        >
                          Catat Wastage
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Wastage Modal */}
      {wastageItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-[#1c1e24] border border-[#2d303a] rounded-2xl max-w-md w-full p-6 text-white shadow-2xl relative">
            <button
              onClick={() => setWastageItem(null)}
              className="absolute top-5 right-5 text-zinc-400 hover:text-white"
            >
              <X size={20} />
            </button>

            <h3 className="text-lg font-bold">Catat Wastage / Rusak</h3>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">{wastageItem.name}</p>

            <form onSubmit={handleRecordWastage} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Jumlah Terbuang ({wastageItem.unit}):
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder={`Contoh: 50 ${wastageItem.unit}`}
                  value={wastageQty}
                  onChange={(e) => setWastageQty(e.target.value)}
                  className="w-full bg-[#121316] border border-[#2e313b] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-400 font-mono"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Alasan Kerusakan:</label>
                <select
                  value={wastageReason}
                  onChange={(e) => setWastageReason(e.target.value)}
                  className="w-full bg-[#121316] border border-[#2e313b] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-400"
                >
                  <option value="Kadaluarsa / Rusak">Kadaluarsa / Rusak</option>
                  <option value="Tumpah saat pembuatan (Barista error)">Tumpah saat pembuatan (Barista error)</option>
                  <option value="Kualitas buruk dari supplier">Kualitas buruk dari supplier</option>
                  <option value="Kemasan sobek / bocor">Kemasan sobek / bocor</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-sm transition shadow-lg shadow-rose-600/20"
              >
                Konfirmasi Potong Stok Wastage
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Stocktake Modal */}
      {showStocktake && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-[#1c1e24] border border-[#2d303a] rounded-2xl max-w-xl w-full max-h-[85vh] flex flex-col text-white shadow-2xl relative overflow-hidden">
            <div className="p-4 border-b border-[#2d303a] flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">Stock Opname Fisik</h3>
                <p className="text-xs text-zinc-400">Masukkan jumlah fisik nyata hasil hitung gudang</p>
              </div>
              <button
                onClick={() => setShowStocktake(false)}
                className="text-zinc-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleStocktakeSubmit} className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {ingredients.map((it) => (
                  <div
                    key={it.id}
                    className="flex items-center justify-between p-2.5 bg-[#14151a] rounded-xl border border-[#262832]"
                  >
                    <div>
                      <div className="text-xs font-bold text-zinc-100">{it.name}</div>
                      <div className="text-[11px] text-zinc-400 font-mono">
                        Sistem: {Number(it.current_stock)} {it.unit}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        placeholder="Hitung riil"
                        value={stocktakeCounts[it.id] ?? ''}
                        onChange={(e) =>
                          setStocktakeCounts({ ...stocktakeCounts, [it.id]: e.target.value })
                        }
                        className="w-24 bg-[#1b1c23] border border-[#2e313c] rounded-lg px-2 py-1 text-xs text-white font-mono text-right focus:outline-none focus:border-[#c59a68]"
                      />
                      <span className="text-[11px] text-zinc-400 w-8">{it.unit}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 border-t border-[#2d303a] bg-[#14151a]">
                <button
                  type="submit"
                  className="w-full py-3 bg-[#c59a68] hover:bg-[#d6a977] text-black font-bold rounded-xl text-sm transition"
                >
                  Simpan Hasil Opname
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
