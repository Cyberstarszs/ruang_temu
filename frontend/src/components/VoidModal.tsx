import React, { useState } from 'react';
import { X, AlertTriangle, KeyRound } from 'lucide-react';
import type { Order } from '../types';

interface VoidModalProps {
  order: Order;
  onClose: () => void;
  onConfirmVoid: (orderId: string, managerPin: string, reason: string) => Promise<void>;
}

export const VoidModal: React.FC<VoidModalProps> = ({ order, onClose, onConfirmVoid }) => {
  const [managerPin, setManagerPin] = useState<string>('');
  const [reason, setReason] = useState<string>('Pelanggan salah pesan');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const handleVoid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!managerPin) {
      setError('PIN Owner wajib diisi untuk otorisasi pembatalan.');
      return;
    }
    if (!reason.trim()) {
      setError('Alasan pembatalan wajib diisi untuk log audit.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await onConfirmVoid(order.id, managerPin, reason);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Gagal membatalkan transaksi.');
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

        <div className="flex items-center space-x-3 mb-4">
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl">
            <AlertTriangle size={24} />
          </div>
          <div>
            <h3 className="text-lg font-bold">Otorisasi Void / Pembatalan</h3>
            <p className="text-xs text-zinc-400">Order #{order.order_number}</p>
          </div>
        </div>

        <div className="p-3 bg-rose-500/5 border border-rose-500/20 rounded-xl text-xs text-rose-300/90 mb-4 leading-relaxed">
          ⚠️ Pembatalan order akan mengembalikan stok bahan baku ke gudang secara otomatis dan dicatat dalam audit trail keamanan.
        </div>

        <form onSubmit={handleVoid} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">
              Alasan Pembatalan (Audit Trail):
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-[#121316] border border-[#2e313b] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-400"
            >
              <option value="Pelanggan salah pesan">Pelanggan salah pesan / minta ubah</option>
              <option value="Pelanggan membatalkan pesanan">Pelanggan membatalkan pesanan</option>
              <option value="Kesalahan input kasir">Kesalahan input kasir</option>
              <option value="Bahan baku mendadak habis">Bahan baku mendadak habis</option>
              <option value="Lainnya">Lainnya (Tulis di catatan)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">
              PIN Otorisasi Owner (Pemilik Kafe):
            </label>
            <div className="relative">
              <KeyRound size={16} className="absolute left-3.5 top-3 text-zinc-400" />
              <input
                type="password"
                maxLength={6}
                placeholder="Masukkan 6 Digit PIN Owner"
                value={managerPin}
                onChange={(e) => setManagerPin(e.target.value)}
                className="w-full bg-[#121316] border border-[#2e313b] rounded-xl pl-10 pr-3 py-2.5 text-sm text-white focus:outline-none focus:border-rose-400 font-mono tracking-widest"
                required
                autoFocus
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded-xl">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-sm transition shadow-lg shadow-rose-600/20"
          >
            {loading ? 'Memvalidasi PIN...' : 'Konfirmasi Pembatalan (Void)'}
          </button>
        </form>
      </div>
    </div>
  );
};
