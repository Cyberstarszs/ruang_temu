import React, { useState } from 'react';
import { rupiah } from '../utils/formatters';
import { X, ShieldAlert, ArrowDownRight, ArrowUpRight, DollarSign } from 'lucide-react';
import type { CashierShift } from '../types';

interface ShiftModalProps {
  type: 'OPEN' | 'CLOSE' | 'CASH_MOVEMENT';
  currentShift: CashierShift | null;
  onClose: () => void;
  onConfirmOpen: (openingCash: number) => Promise<void>;
  onConfirmClose: (actualCash: number, notes: string, managerPin?: string) => Promise<void>;
  onConfirmMovement: (
    type: 'CASH_IN' | 'CASH_OUT',
    category: string,
    description: string,
    amount: number
  ) => Promise<void>;
}

export const ShiftModal: React.FC<ShiftModalProps> = ({
  type,
  currentShift,
  onClose,
  onConfirmOpen,
  onConfirmClose,
  onConfirmMovement,
}) => {
  const [amount, setAmount] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [managerPin, setManagerPin] = useState<string>('');
  const [movementType, setMovementType] = useState<'CASH_IN' | 'CASH_OUT'>('CASH_OUT');
  const [category, setCategory] = useState<string>('Operasional Toko');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const numAmount = Number(amount) || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (type === 'OPEN') {
        if (numAmount < 0) throw new Error('Modal awal tidak boleh negatif.');
        await onConfirmOpen(numAmount);
      } else if (type === 'CLOSE') {
        if (numAmount < 0) throw new Error('Penghitungan fisik uang tunai tidak boleh negatif.');
        await onConfirmClose(numAmount, notes, managerPin || undefined);
      } else if (type === 'CASH_MOVEMENT') {
        if (numAmount <= 0) throw new Error('Nominal pergerakan kas harus lebih dari 0.');
        await onConfirmMovement(movementType, category, notes || 'Pengeluaran petty cash kasir', numAmount);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan pemrosesan shift.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#1c1e24] border border-[#2d303a] rounded-2xl max-w-md w-full p-6 text-white shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-zinc-400 hover:text-white p-1 rounded-lg transition"
        >
          <X size={20} />
        </button>

        {type === 'OPEN' && (
          <>
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-xl">
                <DollarSign size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold">Buka Shift Kasir</h3>
                <p className="text-xs text-zinc-400">Masukkan modal kembalian awal di laci kasir</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Modal Awal Kasir (Kas di Laci):
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-zinc-400 text-sm font-semibold">Rp</span>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    placeholder="Contoh: 200000"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-[#121316] border border-[#2e313b] rounded-xl pl-10 pr-4 py-2.5 text-white font-mono text-base focus:outline-none focus:border-[#c59a68]"
                    required
                    autoFocus
                  />
                </div>
                <div className="flex gap-2 mt-2">
                  {[100000, 200000, 300000, 500000].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setAmount(String(val))}
                      className="px-2.5 py-1 text-xs rounded-lg bg-[#252830] hover:bg-[#323642] text-zinc-300 border border-[#353945]"
                    >
                      {rupiah(val)}
                    </button>
                  ))}
                </div>
              </div>

              {error && <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded-xl">{error}</div>}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-[#c59a68] hover:bg-[#d6a977] text-black font-bold rounded-xl text-sm transition mt-2 shadow-lg shadow-[#c59a68]/20"
              >
                {loading ? 'Membuka Shift...' : 'Mulai Shift Kasir'}
              </button>
            </form>
          </>
        )}

        {type === 'CLOSE' && (
          <>
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl">
                <ShieldAlert size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold">Tutup Shift Kasir (Blind Cash Drop)</h3>
                <p className="text-xs text-zinc-400">
                  Hitung fisik uang tunai di laci tanpa melihat saldo ekspektasi sistem
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl text-xs text-amber-300/90 leading-relaxed">
                💡 <strong>Blind Cash Drop:</strong> Anda diminta memasukkan hasil hitungan fisik riil. Sistem di backend akan memvalidasi selisih kas secara objektif demi pencegahan manipulasi.
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Total Uang Tunai Fisik di Laci:
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-zinc-400 text-sm font-semibold">Rp</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="Hitung fisik uang tunai..."
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-[#121316] border border-[#2e313b] rounded-xl pl-10 pr-4 py-2.5 text-white font-mono text-base focus:outline-none focus:border-rose-400"
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Catatan Penutupan Shift:
                </label>
                <textarea
                  rows={2}
                  placeholder="Keterangan kondisi kas / shift..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-[#121316] border border-[#2e313b] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  PIN Otorisasi Owner (Diperlukan jika terdapat selisih kas):
                </label>
                <input
                  type="password"
                  maxLength={6}
                  placeholder="PIN Owner 6 digit"
                  value={managerPin}
                  onChange={(e) => setManagerPin(e.target.value)}
                  className="w-full bg-[#121316] border border-[#2e313b] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-500 font-mono tracking-widest"
                />
              </div>

              {error && <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded-xl">{error}</div>}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-sm transition mt-2 shadow-lg shadow-rose-600/20"
              >
                {loading ? 'Menutup Shift...' : 'Konfirmasi Tutup Shift'}
              </button>
            </form>
          </>
        )}

        {type === 'CASH_MOVEMENT' && (
          <>
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-3 bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded-xl">
                <DollarSign size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold">Catat Kas Masuk / Keluar (Petty Cash)</h3>
                <p className="text-xs text-zinc-400">Pengeluaran dadakan (es batu, galon, token) atau tambah modal</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMovementType('CASH_OUT')}
                  className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold border ${
                    movementType === 'CASH_OUT'
                      ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                      : 'bg-[#121316] border-[#2e313b] text-zinc-400'
                  }`}
                >
                  <ArrowUpRight size={16} />
                  <span>Kas Keluar (Petty Cash)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMovementType('CASH_IN')}
                  className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold border ${
                    movementType === 'CASH_IN'
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                      : 'bg-[#121316] border-[#2e313b] text-zinc-400'
                  }`}
                >
                  <ArrowDownRight size={16} />
                  <span>Kas Masuk (Tambah Modal)</span>
                </button>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Kategori Keperluan:</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-[#121316] border border-[#2e313b] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#c59a68]"
                >
                  <option value="Operasional Toko">Operasional Toko (Es Batu, Galon, Sedotan Darurat)</option>
                  <option value="Bahan Baku Mendesak">Bahan Baku Mendesak (Susu UHT, Lemon)</option>
                  <option value="Perlengkapan Kasir">Perlengkapan Kasir (Kertas Struk Thermal)</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Nominal:</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-zinc-400 text-sm font-semibold">Rp</span>
                  <input
                    type="number"
                    min="1000"
                    step="1000"
                    placeholder="Contoh: 35000"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-[#121316] border border-[#2e313b] rounded-xl pl-10 pr-4 py-2.5 text-white font-mono text-base focus:outline-none focus:border-blue-400"
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Keterangan / Alasan:</label>
                <input
                  type="text"
                  placeholder="Misal: Beli 2 kantong es batu kristal"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-[#121316] border border-[#2e313b] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-500"
                  required
                />
              </div>

              {error && <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded-xl">{error}</div>}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm transition mt-2 shadow-lg shadow-blue-600/20"
              >
                {loading ? 'Menyimpan...' : 'Simpan Pergerakan Kas'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};
