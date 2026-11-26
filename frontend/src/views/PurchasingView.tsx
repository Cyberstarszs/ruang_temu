import React, { useState, useEffect } from 'react';
import { Truck, Plus, CheckCircle2, Clock, PackageCheck, AlertCircle, RefreshCw, X } from 'lucide-react';
import { rupiah, formatDate } from '../utils/formatters';
import { purchasingApi, inventoryApi } from '../api/client';
import type { PurchaseOrder, Supplier, Ingredient } from '../types';

interface PurchasingViewProps {
  onNotify: (msg: string) => void;
}

export const PurchasingView: React.FC<PurchasingViewProps> = ({ onNotify }) => {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [activeTab, setActiveTab] = useState<'ORDERS' | 'SUPPLIERS'>('ORDERS');
  const [loading, setLoading] = useState<boolean>(false);

  // New PO Modal
  const [showPoModal, setShowPoModal] = useState<boolean>(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [poNotes, setPoNotes] = useState<string>('');
  const [poItems, setPoItems] = useState<Array<{ ingredientId: string; quantity: number; unitPrice: number }>>([]);

  // New Supplier Modal
  const [showSupplierModal, setShowSupplierModal] = useState<boolean>(false);
  const [supplierName, setSupplierName] = useState<string>('');
  const [supplierContact, setSupplierContact] = useState<string>('');
  const [supplierPhone, setSupplierPhone] = useState<string>('');
  const [supplierAddress, setSupplierAddress] = useState<string>('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [orderRes, suppRes, ingRes] = await Promise.all([
        purchasingApi.getOrders(),
        purchasingApi.getSuppliers(),
        inventoryApi.getAll(),
      ]);
      if (orderRes.success && orderRes.data) setOrders(orderRes.data);
      if (suppRes.success && suppRes.data) setSuppliers(suppRes.data);
      if (ingRes.success && ingRes.data) setIngredients(ingRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Add Item Line to New PO
  const handleAddItemLine = () => {
    if (ingredients.length === 0) return;
    setPoItems([
      ...poItems,
      { ingredientId: ingredients[0].id, quantity: 1, unitPrice: Number(ingredients[0].cost_per_unit) || 10000 },
    ]);
  };

  const handleUpdateItemLine = (idx: number, field: string, val: any) => {
    const copy = [...poItems];
    (copy[idx] as any)[field] = val;
    if (field === 'ingredientId') {
      const ing = ingredients.find((i) => i.id === val);
      if (ing) copy[idx].unitPrice = Number(ing.cost_per_unit) || 10000;
    }
    setPoItems(copy);
  };

  const handleRemoveItemLine = (idx: number) => {
    setPoItems(poItems.filter((_, i) => i !== idx));
  };

  // Submit New PO
  const handleCreatePo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierId) {
      alert('Pilih pemasok / supplier.');
      return;
    }
    if (poItems.length === 0) {
      alert('Tambahkan minimal satu bahan yang dibeli.');
      return;
    }

    try {
      const res = await purchasingApi.createOrder({
        supplierId: selectedSupplierId,
        items: poItems,
        notes: poNotes,
      });
      if (res.success && res.data) {
        onNotify(`Pesanan Pembelian #${res.data.po_number} berhasil dibuat.`);
        setShowPoModal(false);
        setPoItems([]);
        setPoNotes('');
        loadData();
      } else {
        alert(res.message || 'Gagal membuat PO.');
      }
    } catch (err: any) {
      alert(err.message || 'Terjadi kesalahan sistem.');
    }
  };

  // Receive PO
  const handleReceivePo = async (orderId: string, poNumber: string) => {
    const invoiceNumber = prompt('Masukkan Nomor Faktur / Invoice dari Supplier (Opsional):') || undefined;
    try {
      const res = await purchasingApi.receiveOrder(orderId, invoiceNumber, 'Diterima oleh Kasir/Manajer');
      if (res.success) {
        onNotify(`PO #${poNumber} berhasil diterima! Stok bahan baku otomatis bertambah.`);
        loadData();
      } else {
        alert(res.message || 'Gagal menerima pesanan.');
      }
    } catch (err: any) {
      alert(err.message || 'Terjadi kesalahan pemrosesan barang masuk.');
    }
  };

  // Submit New Supplier
  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierName.trim()) return;

    try {
      const res = await purchasingApi.createSupplier({
        name: supplierName.trim(),
        contactPerson: supplierContact || undefined,
        phone: supplierPhone || undefined,
        address: supplierAddress || undefined,
      });
      if (res.success) {
        onNotify(`Supplier ${supplierName} berhasil didaftarkan.`);
        setShowSupplierModal(false);
        setSupplierName('');
        setSupplierContact('');
        setSupplierPhone('');
        setSupplierAddress('');
        loadData();
      } else {
        alert(res.message || 'Gagal menambah supplier.');
      }
    } catch (err: any) {
      alert(err.message || 'Terjadi kesalahan.');
    }
  };

  const poTotalAmount = poItems.reduce((acc, it) => acc + it.quantity * it.unitPrice, 0);

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-64px)] overflow-y-auto bg-[#121316] text-white p-6">
      <div className="max-w-7xl w-full mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Truck className="text-[#c59a68]" size={24} />
              <span>Pengadaan & Pembelian Bahan (Purchasing)</span>
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Penerimaan Purchase Order (PO) otomatis menambah stok bahan baku ke gudang
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {activeTab === 'ORDERS' ? (
              <button
                onClick={() => {
                  setShowPoModal(true);
                  if (poItems.length === 0 && ingredients.length > 0) {
                    setPoItems([{ ingredientId: ingredients[0].id, quantity: 1, unitPrice: Number(ingredients[0].cost_per_unit) || 10000 }]);
                  }
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#c59a68] hover:bg-[#d6a977] text-black rounded-xl text-xs font-bold transition shadow-sm"
              >
                <Plus size={15} />
                <span>Buat PO Baru</span>
              </button>
            ) : (
              <button
                onClick={() => setShowSupplierModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#c59a68] hover:bg-[#d6a977] text-black rounded-xl text-xs font-bold transition shadow-sm"
              >
                <Plus size={15} />
                <span>Tambah Supplier</span>
              </button>
            )}

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

        {/* Tab Switcher */}
        <div className="flex space-x-2 border-b border-[#252832] pb-3">
          <button
            onClick={() => setActiveTab('ORDERS')}
            className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition ${
              activeTab === 'ORDERS'
                ? 'bg-[#c59a68] text-black shadow-md shadow-[#c59a68]/20'
                : 'bg-[#1a1c22] text-zinc-400 hover:text-white border border-[#282a34]'
            }`}
          >
            Daftar Purchase Orders ({orders.length})
          </button>
          <button
            onClick={() => setActiveTab('SUPPLIERS')}
            className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition ${
              activeTab === 'SUPPLIERS'
                ? 'bg-[#c59a68] text-black shadow-md shadow-[#c59a68]/20'
                : 'bg-[#1a1c22] text-zinc-400 hover:text-white border border-[#282a34]'
            }`}
          >
            Daftar Pemasok / Supplier ({suppliers.length})
          </button>
        </div>

        {/* TAB 1: PO LIST */}
        {activeTab === 'ORDERS' && (
          <div className="bg-[#181a20] border border-[#262832] rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#14151a] text-zinc-400 uppercase font-mono tracking-wider border-b border-[#262832]">
                  <tr>
                    <th className="py-3 px-4">No. PO</th>
                    <th className="py-3 px-4">Pemasok</th>
                    <th className="py-3 px-4">Tanggal Order</th>
                    <th className="py-3 px-4">Total Biaya</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#242630]">
                  {orders.map((po) => {
                    const isReceived = po.status === 'RECEIVED';
                    return (
                      <tr key={po.id} className="hover:bg-[#1f212a] transition">
                        <td className="py-3 px-4 font-mono font-bold text-zinc-100">
                          {po.po_number}
                        </td>
                        <td className="py-3 px-4 font-medium text-zinc-200">
                          {po.supplier_name || 'Supplier Umum'}
                        </td>
                        <td className="py-3 px-4 text-zinc-400 font-mono">
                          {formatDate(po.created_at)}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-[#c59a68]">
                          {rupiah(po.total_amount)}
                        </td>
                        <td className="py-3 px-4">
                          {isReceived ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold text-[10px] inline-flex items-center gap-1">
                              <CheckCircle2 size={12} />
                              Diterima (Stok Masuk)
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 font-bold text-[10px] inline-flex items-center gap-1">
                              <Clock size={12} />
                              Menunggu Barang Datang
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {!isReceived && (
                            <button
                              onClick={() => handleReceivePo(po.id, po.po_number)}
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-[11px] transition inline-flex items-center gap-1 shadow-sm"
                            >
                              <PackageCheck size={13} />
                              <span>Terima Barang</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {orders.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-10 text-zinc-500">
                        Belum ada riwayat Purchase Order (PO).
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: SUPPLIERS LIST */}
        {activeTab === 'SUPPLIERS' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {suppliers.map((sup) => (
              <div
                key={sup.id}
                className="bg-[#181a20] border border-[#262832] rounded-2xl p-4 flex flex-col justify-between shadow-lg"
              >
                <div>
                  <h4 className="font-bold text-sm text-zinc-100">{sup.name}</h4>
                  {sup.contact_person && (
                    <p className="text-xs text-[#c59a68] mt-0.5 font-medium">
                      PIC: {sup.contact_person}
                    </p>
                  )}
                  {sup.phone && (
                    <p className="text-xs text-zinc-400 font-mono mt-1">Telp: {sup.phone}</p>
                  )}
                  {sup.address && (
                    <p className="text-[11px] text-zinc-500 mt-1 line-clamp-2">{sup.address}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CREATE PO MODAL */}
      {showPoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-[#1c1e24] border border-[#2d303a] rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col text-white shadow-2xl relative overflow-hidden">
            <div className="p-4 border-b border-[#2d303a] flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">Buat Purchase Order (PO) Baru</h3>
                <p className="text-xs text-zinc-400">Pemesanan bahan baku resmi ke pemasok</p>
              </div>
              <button onClick={() => setShowPoModal(false)} className="text-zinc-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreatePo} className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Supplier selection */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Pilih Pemasok:</label>
                  <select
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                    className="w-full bg-[#121316] border border-[#2e313b] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#c59a68]"
                    required
                  >
                    <option value="">-- Pilih Supplier --</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.contact_person || 'No PIC'})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Items to order */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-zinc-300">Daftar Bahan yang Dipesan:</label>
                    <button
                      type="button"
                      onClick={handleAddItemLine}
                      className="px-2.5 py-1 rounded-lg bg-[#252834] hover:bg-[#323644] text-[11px] font-semibold text-[#c59a68] border border-[#363a4b] transition flex items-center gap-1"
                    >
                      <Plus size={13} />
                      <span>Tambah Item</span>
                    </button>
                  </div>

                  <div className="space-y-2">
                    {poItems.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-2 bg-[#14151a] rounded-xl border border-[#262832]">
                        <select
                          value={item.ingredientId}
                          onChange={(e) => handleUpdateItemLine(idx, 'ingredientId', e.target.value)}
                          className="flex-1 bg-[#1c1e24] border border-[#2e313b] rounded-lg px-2 py-1.5 text-xs text-white"
                        >
                          {ingredients.map((ing) => (
                            <option key={ing.id} value={ing.id}>
                              {ing.name} ({ing.unit})
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          min="1"
                          placeholder="Qty"
                          value={item.quantity}
                          onChange={(e) => handleUpdateItemLine(idx, 'quantity', Number(e.target.value))}
                          className="w-20 bg-[#1c1e24] border border-[#2e313b] rounded-lg px-2 py-1.5 text-xs text-white font-mono text-center"
                        />
                        <input
                          type="number"
                          min="100"
                          step="500"
                          placeholder="Harga Satuan"
                          value={item.unitPrice}
                          onChange={(e) => handleUpdateItemLine(idx, 'unitPrice', Number(e.target.value))}
                          className="w-28 bg-[#1c1e24] border border-[#2e313b] rounded-lg px-2 py-1.5 text-xs text-white font-mono text-right"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveItemLine(idx)}
                          className="text-zinc-500 hover:text-rose-400 p-1"
                        >
                          <X size={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Catatan PO (Opsional):</label>
                  <input
                    type="text"
                    placeholder="Contoh: Pengiriman sebelum hari Jumat"
                    value={poNotes}
                    onChange={(e) => setPoNotes(e.target.value)}
                    className="w-full bg-[#121316] border border-[#2e313b] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#c59a68]"
                  />
                </div>
              </div>

              <div className="p-4 border-t border-[#2d303a] bg-[#14151a] flex items-center justify-between">
                <div>
                  <span className="text-xs text-zinc-400">Total Nilai PO:</span>
                  <div className="font-mono text-base font-bold text-[#c59a68]">{rupiah(poTotalAmount)}</div>
                </div>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#c59a68] hover:bg-[#d6a977] text-black font-bold rounded-xl text-xs transition"
                >
                  Kirim Purchase Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE SUPPLIER MODAL */}
      {showSupplierModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-[#1c1e24] border border-[#2d303a] rounded-2xl max-w-md w-full p-6 text-white shadow-2xl relative">
            <button onClick={() => setShowSupplierModal(false)} className="absolute top-5 right-5 text-zinc-400 hover:text-white">
              <X size={20} />
            </button>

            <h3 className="text-lg font-bold">Daftarkan Pemasok Baru</h3>
            <p className="text-xs text-zinc-400 mt-0.5">Supplier biji kopi, susu, sirup, atau packaging</p>

            <form onSubmit={handleCreateSupplier} className="space-y-3.5 mt-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Nama Usaha / PT / Supplier:</label>
                <input
                  type="text"
                  placeholder="Contoh: PT Sumber Biji Kopi Nusantara"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  className="w-full bg-[#121316] border border-[#2e313b] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#c59a68]"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Nama Kontak PIC:</label>
                <input
                  type="text"
                  placeholder="Contoh: Budi Santoso"
                  value={supplierContact}
                  onChange={(e) => setSupplierContact(e.target.value)}
                  className="w-full bg-[#121316] border border-[#2e313b] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#c59a68]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Nomor Telepon / WhatsApp:</label>
                <input
                  type="tel"
                  placeholder="Contoh: 081234567890"
                  value={supplierPhone}
                  onChange={(e) => setSupplierPhone(e.target.value)}
                  className="w-full bg-[#121316] border border-[#2e313b] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#c59a68]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Alamat Supplier:</label>
                <textarea
                  rows={2}
                  placeholder="Alamat kantor / gudang supplier..."
                  value={supplierAddress}
                  onChange={(e) => setSupplierAddress(e.target.value)}
                  className="w-full bg-[#121316] border border-[#2e313b] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#c59a68]"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-[#c59a68] hover:bg-[#d6a977] text-black font-bold rounded-xl text-sm transition mt-2"
              >
                Simpan Data Pemasok
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
