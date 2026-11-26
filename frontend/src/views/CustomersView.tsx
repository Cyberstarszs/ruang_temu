import React, { useState, useEffect } from 'react';
import { Users, Plus, Phone, Mail, Award, Search, RefreshCw, X } from 'lucide-react';
import { rupiah, formatDate } from '../utils/formatters';
import { customerApi } from '../api/client';
import type { Customer } from '../types';

interface CustomersViewProps {
  onNotify: (msg: string) => void;
}

export const CustomersView: React.FC<CustomersViewProps> = ({ onNotify }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchPhone, setSearchPhone] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  // New Customer Modal
  const [showModal, setShowModal] = useState<boolean>(false);
  const [name, setName] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [email, setEmail] = useState<string>('');

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const res = await customerApi.getAll(searchPhone.trim() || undefined);
      if (res.success && res.data) {
        setCustomers(res.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, [searchPhone]);

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phoneNumber.trim()) {
      alert('Nama dan nomor HP wajib diisi.');
      return;
    }

    try {
      const res = await customerApi.create({
        name: name.trim(),
        phoneNumber: phoneNumber.trim(),
        email: email.trim() || undefined,
      });

      if (res.success) {
        onNotify(`Pelanggan member ${name} berhasil didaftarkan.`);
        setShowModal(false);
        setName('');
        setPhoneNumber('');
        setEmail('');
        loadCustomers();
      } else {
        alert(res.message || 'Gagal mendaftarkan pelanggan.');
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
              <Users className="text-[#c59a68]" size={24} />
              <span>Database Pelanggan & CRM Loyalty</span>
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Pantau riwayat belanja, frekuensi kunjungan kafe, dan poin loyalitas pelanggan
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-2.5 text-zinc-400" />
              <input
                type="text"
                placeholder="Cari nomor HP / nama..."
                value={searchPhone}
                onChange={(e) => setSearchPhone(e.target.value)}
                className="bg-[#1e2026] border border-[#2e313c] rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#c59a68]"
              />
            </div>

            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#c59a68] hover:bg-[#d6a977] text-black rounded-xl text-xs font-bold transition shadow-sm"
            >
              <Plus size={15} />
              <span>Tambah Member</span>
            </button>

            <button
              onClick={loadCustomers}
              disabled={loading}
              className="p-2 rounded-xl bg-[#1e2026] hover:bg-[#282b33] border border-[#2e313c] text-zinc-300 transition"
              title="Segarkan Data"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Customer Table */}
        <div className="bg-[#181a20] border border-[#262832] rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#14151a] text-zinc-400 uppercase font-mono tracking-wider border-b border-[#262832]">
                <tr>
                  <th className="py-3 px-4">Nama Pelanggan</th>
                  <th className="py-3 px-4">No. WhatsApp</th>
                  <th className="py-3 px-4">Total Kunjungan</th>
                  <th className="py-3 px-4">Total Belanja</th>
                  <th className="py-3 px-4">Poin Loyalitas</th>
                  <th className="py-3 px-4">Terdaftar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#242630]">
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-[#1f212a] transition">
                    <td className="py-3 px-4 font-bold text-zinc-100 flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-[#c59a68]/20 text-[#c59a68] font-mono font-bold flex items-center justify-center text-xs">
                        {c.name.slice(0, 1)}
                      </div>
                      <span>{c.name}</span>
                    </td>
                    <td className="py-3 px-4 font-mono text-zinc-300">{c.phone_number}</td>
                    <td className="py-3 px-4 font-mono font-bold text-zinc-200">
                      {c.visit_count}x Kunjungan
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-[#c59a68]">
                      {rupiah(c.total_spend)}
                    </td>
                    <td className="py-3 px-4 font-mono text-emerald-400 font-bold flex items-center gap-1">
                      <Award size={13} />
                      <span>{c.points_balance} Poin</span>
                    </td>
                    <td className="py-3 px-4 font-mono text-zinc-500">
                      {formatDate(c.created_at)}
                    </td>
                  </tr>
                ))}
                {customers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-zinc-500">
                      Belum ada data pelanggan member.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* CREATE MEMBER MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-[#1c1e24] border border-[#2d303a] rounded-2xl max-w-md w-full p-6 text-white shadow-2xl relative">
            <button onClick={() => setShowModal(false)} className="absolute top-5 right-5 text-zinc-400 hover:text-white">
              <X size={20} />
            </button>

            <h3 className="text-lg font-bold">Daftarkan Member Kafe Baru</h3>
            <p className="text-xs text-zinc-400 mt-0.5">Dapatkan poin belanja setiap transaksi di POS</p>

            <form onSubmit={handleCreateCustomer} className="space-y-3.5 mt-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Nama Lengkap:</label>
                <input
                  type="text"
                  placeholder="Contoh: Nadya Aruna"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#121316] border border-[#2e313b] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#c59a68]"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Nomor WhatsApp:</label>
                <input
                  type="tel"
                  placeholder="Contoh: 081234567890"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full bg-[#121316] border border-[#2e313b] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#c59a68]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Email (Opsional):</label>
                <input
                  type="email"
                  placeholder="Contoh: nadya@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#121316] border border-[#2e313b] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#c59a68]"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-[#c59a68] hover:bg-[#d6a977] text-black font-bold rounded-xl text-sm transition mt-2 shadow-lg shadow-[#c59a68]/20"
              >
                Daftarkan Pelanggan
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
