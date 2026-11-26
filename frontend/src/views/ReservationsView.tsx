import React, { useState, useEffect } from 'react';
import { CalendarCheck, Plus, Clock, Users, Phone, DollarSign, RefreshCw, X, CheckCircle2 } from 'lucide-react';
import { rupiah, formatDate, formatTime } from '../utils/formatters';
import { reservationApi, tableApi } from '../api/client';
import type { Reservation, CafeTable } from '../types';

interface ReservationsViewProps {
  onNotify: (msg: string) => void;
}

export const ReservationsView: React.FC<ReservationsViewProps> = ({ onNotify }) => {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [tables, setTables] = useState<CafeTable[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState<boolean>(false);

  // New Reservation Modal
  const [showModal, setShowModal] = useState<boolean>(false);
  const [customerName, setCustomerName] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [guestCount, setGuestCount] = useState<number>(2);
  const [reservationTime, setReservationTime] = useState<string>('');
  const [tableId, setTableId] = useState<string>('');
  const [downPayment, setDownPayment] = useState<string>('50000');
  const [notes, setNotes] = useState<string>('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [resRes, tableRes] = await Promise.all([
        reservationApi.getAll(selectedDate),
        tableApi.getAll(),
      ]);
      if (resRes.success && resRes.data) setReservations(resRes.data);
      if (tableRes.success && tableRes.data) setTables(tableRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedDate]);

  const handleCreateReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !phoneNumber.trim()) {
      alert('Nama pelanggan dan nomor telepon wajib diisi.');
      return;
    }

    try {
      const res = await reservationApi.create({
        customerName: customerName.trim(),
        phoneNumber: phoneNumber.trim(),
        guestCount: Number(guestCount),
        reservationTime: reservationTime || `${selectedDate} 19:00:00`,
        tableId: tableId || undefined,
        downPayment: Number(downPayment) || 0,
        notes: notes || undefined,
      });

      if (res.success && res.data) {
        onNotify(`Reservasi untuk ${customerName} berhasil disimpan dengan DP ${rupiah(Number(downPayment))}.`);
        setShowModal(false);
        setCustomerName('');
        setPhoneNumber('');
        setGuestCount(2);
        setDownPayment('50000');
        setNotes('');
        loadData();
      } else {
        alert(res.message || 'Gagal membuat reservasi.');
      }
    } catch (err: any) {
      alert(err.message || 'Terjadi kesalahan sistem.');
    }
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-64px)] overflow-y-auto bg-[#121316] text-white p-6">
      <div className="max-w-7xl w-full mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <CalendarCheck className="text-[#c59a68]" size={24} />
              <span>Reservasi Meja & Down Payment (DP)</span>
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              DP yang dibayarkan tamu dapat dipotongkan langsung saat pelunasan tagihan di kasir POS
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-[#1e2026] border border-[#2e313c] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#c59a68]"
            />
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#c59a68] hover:bg-[#d6a977] text-black rounded-xl text-xs font-bold transition shadow-sm"
            >
              <Plus size={15} />
              <span>Reservasi Baru</span>
            </button>
            <button
              onClick={loadData}
              disabled={loading}
              className="p-2 rounded-xl bg-[#1e2026] hover:bg-[#282b33] border border-[#2e313c] text-zinc-300 transition"
              title="Segarkan Data"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Reservations Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reservations.map((r) => {
            const isSeated = r.status === 'SEATED';
            return (
              <div
                key={r.id}
                className={`rounded-2xl p-4 border flex flex-col justify-between shadow-lg transition ${
                  isSeated
                    ? 'bg-[#151916] border-emerald-500/30'
                    : 'bg-[#181a20] border-[#262832]'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between pb-2 border-b border-[#252832]">
                    <div>
                      <h4 className="font-bold text-sm text-zinc-100">{r.customer_name}</h4>
                      <div className="text-xs text-zinc-400 flex items-center gap-1 mt-0.5">
                        <Phone size={12} className="text-[#c59a68]" />
                        <span>{r.phone_number}</span>
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        isSeated
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                      }`}
                    >
                      {r.status}
                    </span>
                  </div>

                  <div className="py-3 space-y-1.5 text-xs text-zinc-300">
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Waktu Kedatangan:</span>
                      <span className="font-mono text-zinc-200">{formatTime(r.reservation_time)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Jumlah Tamu:</span>
                      <span className="font-semibold text-zinc-200">{r.guest_count} Orang</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Meja:</span>
                      <span className="font-semibold text-zinc-200">{r.table_number || 'Bebas / Siapkan'}</span>
                    </div>
                    <div className="flex justify-between font-bold text-[#c59a68]">
                      <span>DP Terbayar:</span>
                      <span className="font-mono">{rupiah(r.down_payment)}</span>
                    </div>
                    {r.notes && (
                      <div className="text-[11px] text-zinc-400 italic mt-1 pt-1 border-t border-[#252832]">
                        Catatan: {r.notes}
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-[#252832] flex items-center justify-between">
                  <span className="text-[11px] text-zinc-500">DP otomatis terpotong di POS</span>
                  {!isSeated && (
                    <button
                      onClick={() => onNotify(`Tamu ${r.customer_name} telah hadir & siap memesan di meja.`)}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-bold transition flex items-center gap-1"
                    >
                      <CheckCircle2 size={12} />
                      <span>Tamu Hadir</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {reservations.length === 0 && (
            <div className="col-span-full text-center py-16 text-zinc-500">
              <CalendarCheck size={36} className="mx-auto mb-2 text-zinc-600" />
              <p className="text-sm">Belum ada reservasi untuk tanggal {formatDate(selectedDate)}.</p>
            </div>
          )}
        </div>
      </div>

      {/* CREATE RESERVATION MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-[#1c1e24] border border-[#2d303a] rounded-2xl max-w-md w-full p-6 text-white shadow-2xl relative">
            <button onClick={() => setShowModal(false)} className="absolute top-5 right-5 text-zinc-400 hover:text-white">
              <X size={20} />
            </button>

            <h3 className="text-lg font-bold">Buat Reservasi Meja</h3>
            <p className="text-xs text-zinc-400 mt-0.5">Catat booking tempat & uang muka (DP)</p>

            <form onSubmit={handleCreateReservation} className="space-y-3.5 mt-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Nama Pemesan:</label>
                <input
                  type="text"
                  placeholder="Contoh: Aruna Wijaya"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full bg-[#121316] border border-[#2e313b] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#c59a68]"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Nomor WhatsApp:</label>
                <input
                  type="tel"
                  placeholder="Contoh: 081298765432"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full bg-[#121316] border border-[#2e313b] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#c59a68]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Jumlah Orang:</label>
                  <input
                    type="number"
                    min="1"
                    value={guestCount}
                    onChange={(e) => setGuestCount(Number(e.target.value))}
                    className="w-full bg-[#121316] border border-[#2e313b] rounded-xl px-3 py-2 text-xs text-white font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Pilih Meja (Opsional):</label>
                  <select
                    value={tableId}
                    onChange={(e) => setTableId(e.target.value)}
                    className="w-full bg-[#121316] border border-[#2e313b] rounded-xl px-2 py-2 text-xs text-white"
                  >
                    <option value="">-- Bebas --</option>
                    {tables.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.table_number} ({t.capacity} org)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Waktu Reservasi:</label>
                <input
                  type="datetime-local"
                  value={reservationTime}
                  onChange={(e) => setReservationTime(e.target.value)}
                  className="w-full bg-[#121316] border border-[#2e313b] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#c59a68]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Uang Muka (Down Payment):</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2 text-zinc-400 text-xs font-semibold">Rp</span>
                  <input
                    type="number"
                    min="0"
                    step="10000"
                    placeholder="Contoh: 50000"
                    value={downPayment}
                    onChange={(e) => setDownPayment(e.target.value)}
                    className="w-full bg-[#121316] border border-[#2e313b] rounded-xl pl-9 pr-3 py-2 text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Catatan Tambahan:</label>
                <input
                  type="text"
                  placeholder="Contoh: Meja dekat colokan listrik / area outdoor"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-[#121316] border border-[#2e313b] rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-[#c59a68] hover:bg-[#d6a977] text-black font-bold rounded-xl text-sm transition mt-2 shadow-lg shadow-[#c59a68]/20"
              >
                Konfirmasi Reservasi
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
