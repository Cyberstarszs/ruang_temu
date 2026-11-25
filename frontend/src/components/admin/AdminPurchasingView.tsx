'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Supplier, PurchaseOrder, Ingredient } from '@/types';
import {
  Truck,
  Plus,
  Search,
  PackageCheck,
  CheckCircle2,
  Clock,
  Phone,
  FileText,
  X,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';

export function AdminPurchasingView() {
  const [activeTab, setActiveTab] = useState<'PO' | 'SUPPLIERS'>('PO');
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Detail Modal
  const [selectedPo, setSelectedPo] = useState<PurchaseOrder | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  // Create PO Modal
  const [isCreatePoOpen, setIsCreatePoOpen] = useState(false);
  const [poSupplierId, setPoSupplierId] = useState('');
  const [poNotes, setPoNotes] = useState('');
  const [poItems, setPoItems] = useState<Array<{ ingredientId: string; quantity: number; unitCost: number }>>([]);
  const [poError, setPoError] = useState('');
  const [isSubmittingPo, setIsSubmittingPo] = useState(false);

  // Floating Popover for '...' details
  const [poPopover, setPoPopover] = useState<{
    title: string;
    details: Array<{ label: string; value: string }>;
    rect: { top: number; left: number };
  } | null>(null);

  const openPoPopover = (e: React.MouseEvent, title: string, details: Array<{ label: string; value: string }>) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setPoPopover({
      title,
      details,
      rect: { top: rect.bottom, left: rect.left },
    });
  };

  // Add Supplier Modal
  const [isAddSupplierOpen, setIsAddSupplierOpen] = useState(false);
  const [supName, setSupName] = useState('');
  const [supPhone, setSupPhone] = useState('');
  const [supEmail, setSupEmail] = useState('');
  const [supAddress, setSupAddress] = useState('');
  const [supTerms, setSupTerms] = useState('CASH');
  const [supError, setSupError] = useState('');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [poRes, supRes, ingRes] = await Promise.all([
        api.purchasing.getOrders(),
        api.purchasing.getSuppliers(),
        api.inventory.getAll(),
      ]);

      if (poRes.success && poRes.data) setPurchaseOrders(poRes.data);
      if (supRes.success && supRes.data) setSuppliers(supRes.data);
      if (ingRes.success && ingRes.data) setIngredients(ingRes.data);
    } catch (err) {
      console.error('Failed to load purchasing data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenPoDetail = async (id: string) => {
    setIsDetailLoading(true);
    try {
      const res = await api.purchasing.getOrderById(id);
      if (res.success && res.data) {
        setSelectedPo(res.data);
      }
    } catch (err) {
      console.error('Failed to load PO detail:', err);
    } finally {
      setIsDetailLoading(false);
    }
  };

  const handleReceivePo = async (poId: string) => {
    if (!confirm('Konfirmasi penerimaan barang untuk PO ini? Stok bahan baku akan otomatis bertambah ke sistem.')) {
      return;
    }

    try {
      const res = await api.purchasing.receiveOrder(poId);
      if (res.success) {
        alert(res.message || 'Barang PO berhasil diterima dan stok bahan telah diperbarui!');
        setSelectedPo(null);
        loadData();
      }
    } catch (err: any) {
      alert(err.message || 'Gagal memproses penerimaan PO.');
    }
  };

  const handleAddPoItemRow = () => {
    const firstIng = ingredients[0];
    if (!firstIng) return;
    setPoItems([
      ...poItems,
      {
        ingredientId: firstIng.id,
        quantity: 1000,
        unitCost: Number(firstIng.unit_cost) || 100,
      },
    ]);
  };

  const handleCreatePo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!poSupplierId) {
      setPoError('Pilih supplier pengadaan.');
      return;
    }
    if (poItems.length === 0) {
      setPoError('Tambahkan minimal satu bahan baku pada Purchase Order.');
      return;
    }

    setIsSubmittingPo(true);
    try {
      const res = await api.purchasing.createOrder({
        supplierId: poSupplierId,
        notes: poNotes,
        items: poItems,
      });

      if (res.success) {
        alert('Purchase Order berhasil diterbitkan!');
        setIsCreatePoOpen(false);
        setPoItems([]);
        setPoNotes('');
        loadData();
      }
    } catch (err: any) {
      setPoError(err.message || 'Gagal membuat Purchase Order.');
    } finally {
      setIsSubmittingPo(false);
    }
  };

  const handleAddSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supName.trim() || !supPhone.trim()) {
      setSupError('Nama supplier dan nomor telepon wajib diisi.');
      return;
    }

    try {
      const res = await api.purchasing.createSupplier({
        name: supName.trim(),
        phone: supPhone.trim(),
        email: supEmail.trim() || undefined,
        address: supAddress.trim() || undefined,
        payment_terms: supTerms,
      });

      if (res.success) {
        setIsAddSupplierOpen(false);
        setSupName('');
        setSupPhone('');
        setSupEmail('');
        setSupAddress('');
        loadData();
      }
    } catch (err: any) {
      setSupError(err.message || 'Gagal menambahkan supplier.');
    }
  };

  const totalPoEstimated = poItems.reduce((sum, item) => sum + item.quantity * item.unitCost, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Minimal Action & Tab Bar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          background: '#ffffff',
          padding: '12px 18px',
          borderRadius: '12px',
          border: '1px solid #e7e8e3',
        }}
      >
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={() => setActiveTab('PO')}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              border: activeTab === 'PO' ? '1px solid #57695b' : '1px solid #e2e4dc',
              background: activeTab === 'PO' ? '#57695b' : '#f7f7f5',
              color: activeTab === 'PO' ? '#ffffff' : '#4b5563',
              fontSize: '12.5px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Purchase Orders ({purchaseOrders.length})
          </button>

          <button
            onClick={() => setActiveTab('SUPPLIERS')}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              border: activeTab === 'SUPPLIERS' ? '1px solid #57695b' : '1px solid #e2e4dc',
              background: activeTab === 'SUPPLIERS' ? '#57695b' : '#f7f7f5',
              color: activeTab === 'SUPPLIERS' ? '#ffffff' : '#4b5563',
              fontSize: '12.5px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Supplier ({suppliers.length})
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => {
              setIsAddSupplierOpen(true);
              setSupError('');
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 12px',
              background: '#f2f4ef',
              color: '#57695b',
              border: '1px solid #dcdfd5',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '12.5px',
              cursor: 'pointer',
            }}
          >
            + Supplier Baru
          </button>

          <button
            onClick={() => {
              setIsCreatePoOpen(true);
              setPoSupplierId(suppliers[0]?.id || '');
              setPoItems([]);
              setPoError('');
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              background: '#57695b',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '12.5px',
              cursor: 'pointer',
            }}
          >
            <Plus size={15} />
            Buat PO
          </button>
        </div>
      </div>

      {/* TAB 1: PURCHASE ORDERS */}
      {activeTab === 'PO' && (
        <div
          style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e7e8e3',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            overflow: 'hidden',
          }}
        >
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px', whiteSpace: 'nowrap' }}>
              <thead>
                <tr style={{ background: '#fbfbf9', borderBottom: '1px solid #e7e8e3', color: '#71717a' }}>
                  <th style={{ padding: '9px 12px', fontWeight: 600, fontSize: '11.5px' }}>No. PO</th>
                  <th style={{ padding: '9px 12px', fontWeight: 600, fontSize: '11.5px' }}>Tanggal</th>
                  <th style={{ padding: '9px 12px', fontWeight: 600, fontSize: '11.5px' }}>Supplier</th>
                  <th style={{ padding: '9px 12px', fontWeight: 600, fontSize: '11.5px' }}>Dibuat Oleh</th>
                  <th style={{ padding: '9px 12px', fontWeight: 600, fontSize: '11.5px' }}>Total Nominal</th>
                  <th style={{ padding: '9px 12px', fontWeight: 600, fontSize: '11.5px' }}>Status Barang</th>
                  <th style={{ padding: '9px 14px', fontWeight: 600, fontSize: '11.5px', textAlign: 'right' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '36px', textAlign: 'center', color: '#64746b' }}>
                      Memuat daftar Purchase Orders...
                    </td>
                  </tr>
                ) : purchaseOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '36px', textAlign: 'center', color: '#8b968f', fontStyle: 'italic' }}>
                      Belum ada Purchase Order yang dibuat.
                    </td>
                  </tr>
                ) : (
                  purchaseOrders.map((po) => {
                    const isReceived = po.status === 'RECEIVED';
                    const dateFormatted = new Date(po.created_at).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    });

                    return (
                      <tr key={po.id} style={{ borderBottom: '1px solid #f0f0eb', height: '42px' }}>
                        {/* 1. No. PO */}
                        <td style={{ padding: '8px 12px', verticalAlign: 'middle' }}>
                          <span style={{ fontWeight: 700, color: '#1c2826', fontFamily: 'monospace', fontSize: '12px' }}>
                            {po.po_number}
                          </span>
                        </td>

                        {/* 2. Tanggal */}
                        <td style={{ padding: '8px 12px', verticalAlign: 'middle', color: '#6b7280', fontSize: '11.5px' }}>
                          {dateFormatted}
                        </td>

                        {/* 3. Supplier */}
                        <td style={{ padding: '8px 12px', verticalAlign: 'middle' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ fontWeight: 600, color: '#1c2826', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '12px' }}>
                              {po.supplier_name}
                            </span>
                            {po.supplier_phone && (
                              <button
                                onClick={(e) =>
                                  openPoPopover(e, `Kontak Supplier: ${po.supplier_name}`, [
                                    { label: 'Nama Supplier', value: po.supplier_name },
                                    { label: 'No. Telepon', value: po.supplier_phone || '-' },
                                    { label: 'Catatan PO', value: po.notes || '-' },
                                  ])
                                }
                                title="Rincian kontak supplier"
                                style={{
                                  padding: '1px 4px',
                                  fontSize: '10.5px',
                                  fontWeight: 700,
                                  borderRadius: '4px',
                                  background: '#f2f4ef',
                                  border: '1px solid #dcdfd5',
                                  color: '#57695b',
                                  cursor: 'pointer',
                                  lineHeight: '13px',
                                  height: '17px',
                                }}
                              >
                                ...
                              </button>
                            )}
                          </div>
                        </td>

                        {/* 4. Dibuat Oleh */}
                        <td style={{ padding: '8px 12px', verticalAlign: 'middle', color: '#4b5563', fontSize: '11.5px' }}>
                          {po.ordered_by_name || 'Owner'}
                        </td>

                        {/* 5. Total Nominal */}
                        <td style={{ padding: '8px 12px', verticalAlign: 'middle', fontWeight: 800, color: '#1c2826', fontSize: '12.5px' }}>
                          Rp {Number(po.total_amount).toLocaleString('id-ID')}
                        </td>

                        {/* 6. Status Barang */}
                        <td style={{ padding: '8px 12px', verticalAlign: 'middle' }}>
                          <span
                            style={{
                              padding: '2px 7px',
                              borderRadius: '5px',
                              background: isReceived ? '#dcfce7' : '#fef3c7',
                              color: isReceived ? '#15803d' : '#b45309',
                              fontWeight: 700,
                              fontSize: '10.5px',
                            }}
                          >
                            {isReceived ? 'Diterima' : 'Menunggu Kiriman'}
                          </span>
                        </td>

                        {/* 7. Aksi */}
                        <td style={{ padding: '8px 14px', verticalAlign: 'middle', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                            <button
                              onClick={() => handleOpenPoDetail(po.id)}
                              style={{
                                padding: '3px 8px',
                                background: '#f2f4ef',
                                color: '#57695b',
                                border: '1px solid #dcdfd5',
                                borderRadius: '5px',
                                fontWeight: 600,
                                fontSize: '11px',
                                cursor: 'pointer',
                              }}
                            >
                              Detail PO
                            </button>

                            {!isReceived && (
                              <button
                                onClick={() => handleReceivePo(po.id)}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  padding: '3px 8px',
                                  background: '#57695b',
                                  color: '#ffffff',
                                  border: 'none',
                                  borderRadius: '5px',
                                  fontWeight: 600,
                                  fontSize: '11px',
                                  cursor: 'pointer',
                                }}
                              >
                                <PackageCheck size={12} />
                                Terima
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: SUPPLIERS */}
      {activeTab === 'SUPPLIERS' && (
        <div
          style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e7e8e3',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            overflow: 'hidden',
          }}
        >
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px', whiteSpace: 'nowrap' }}>
              <thead>
                <tr style={{ background: '#fbfbf9', borderBottom: '1px solid #e7e8e3', color: '#64746b', height: '42px' }}>
                  <th style={{ padding: '0 14px', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Nama Supplier</th>
                  <th style={{ padding: '0 12px', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Kontak & Telepon</th>
                  <th style={{ padding: '0 12px', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Email</th>
                  <th style={{ padding: '0 12px', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Alamat</th>
                  <th style={{ padding: '0 12px', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Syarat Bayar</th>
                  <th style={{ padding: '0 14px', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'right' }}>Rincian</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '30px', textAlign: 'center', color: '#8b968f', fontStyle: 'italic' }}>
                      Belum ada pemasok terdaftar.
                    </td>
                  </tr>
                ) : (
                  suppliers.map((s) => (
                    <tr key={s.id} style={{ borderBottom: '1px solid #f0f0eb', height: '42px', whiteSpace: 'nowrap' }}>
                      <td style={{ padding: '0 14px', verticalAlign: 'middle', fontWeight: 700, color: '#1c2826', fontSize: '12px' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
                          {s.name.length > 20 && (
                            <button
                              onClick={(e) =>
                                openPoPopover(e, `Pemasok: ${s.name}`, [
                                  { label: 'Nama Lengkap', value: s.name },
                                  { label: 'Telepon / WA', value: s.phone },
                                  { label: 'Email', value: s.email || '-' },
                                  { label: 'Alamat', value: s.address || '-' },
                                  { label: 'Syarat Bayar', value: s.payment_terms || 'CASH' },
                                ])
                              }
                              style={{
                                border: '1px solid #dcdfd5',
                                background: '#f5f6f2',
                                color: '#57695b',
                                borderRadius: '4px',
                                padding: '1px 5px',
                                fontSize: '10px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                lineHeight: '13px',
                                height: '17px',
                              }}
                            >
                              ...
                            </button>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '0 12px', verticalAlign: 'middle', color: '#4b5563', fontSize: '12px' }}>
                        {s.phone}
                      </td>
                      <td style={{ padding: '0 12px', verticalAlign: 'middle', color: '#64746b', fontSize: '12px' }}>
                        {s.email || '-'}
                      </td>
                      <td style={{ padding: '0 12px', verticalAlign: 'middle', color: '#64746b', fontSize: '12px' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {s.address || '-'}
                          </span>
                          {s.address && s.address.length > 25 && (
                            <button
                              onClick={(e) =>
                                openPoPopover(e, `Alamat: ${s.name}`, [
                                  { label: 'Pemasok', value: s.name },
                                  { label: 'Alamat Lengkap', value: s.address || '-' },
                                  { label: 'Telepon', value: s.phone },
                                ])
                              }
                              style={{
                                border: '1px solid #dcdfd5',
                                background: '#f5f6f2',
                                color: '#57695b',
                                borderRadius: '4px',
                                padding: '1px 5px',
                                fontSize: '10px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                lineHeight: '13px',
                                height: '17px',
                              }}
                            >
                              ...
                            </button>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '0 12px', verticalAlign: 'middle' }}>
                        <span
                          style={{
                            padding: '2px 7px',
                            borderRadius: '5px',
                            background: '#f2f4ef',
                            color: '#415245',
                            fontWeight: 600,
                            fontSize: '11px',
                          }}
                        >
                          {s.payment_terms || 'CASH'}
                        </span>
                      </td>
                      <td style={{ padding: '0 14px', verticalAlign: 'middle', textAlign: 'right' }}>
                        <button
                          onClick={(e) =>
                            openPoPopover(e, `Detail Supplier: ${s.name}`, [
                              { label: 'Nama Supplier', value: s.name },
                              { label: 'Telepon / WhatsApp', value: s.phone },
                              { label: 'Email Kantor', value: s.email || '-' },
                              { label: 'Alamat Pengiriman/Gudang', value: s.address || '-' },
                              { label: 'Syarat Pembayaran', value: s.payment_terms || 'CASH' },
                            ])
                          }
                          style={{
                            padding: '3px 8px',
                            background: '#f2f4ef',
                            color: '#57695b',
                            border: '1px solid #dcdfd5',
                            borderRadius: '5px',
                            fontWeight: 600,
                            fontSize: '11px',
                            cursor: 'pointer',
                          }}
                        >
                          Info Lengkap
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PO DETAIL MODAL */}
      {selectedPo && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              maxWidth: '650px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '20px 24px',
                borderBottom: '1px solid #e7e8e3',
              }}
            >
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#1c2826', margin: 0 }}>
                  Rincian Purchase Order {selectedPo.po_number}
                </h3>
                <div style={{ fontSize: '12px', color: '#64746b', marginTop: '2px' }}>
                  Supplier: <strong>{selectedPo.supplier_name}</strong> ({selectedPo.supplier_phone})
                </div>
              </div>
              <button
                onClick={() => setSelectedPo(null)}
                style={{
                  background: '#f7f7f5',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '6px',
                  cursor: 'pointer',
                  color: '#64746b',
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div
                style={{
                  background: selectedPo.status === 'RECEIVED' ? '#f0fdf4' : '#fffbeb',
                  border: selectedPo.status === 'RECEIVED' ? '1px solid #bbf7d0' : '1px solid #fef3c7',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  fontSize: '13px',
                  color: selectedPo.status === 'RECEIVED' ? '#166534' : '#92400e',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <CheckCircle2 size={16} />
                <span>
                  Status:{' '}
                  <strong>
                    {selectedPo.status === 'RECEIVED'
                      ? `Telah diterima pada ${selectedPo.received_at ? new Date(selectedPo.received_at).toLocaleString('id-ID') : 'gudang'}`
                      : 'Menunggu konfirmasi kedatangan barang'}
                  </strong>
                </span>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', whiteSpace: 'nowrap' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e7e8e3', color: '#64746b', height: '36px' }}>
                    <th style={{ textAlign: 'left', padding: '0 8px', fontWeight: 600 }}>Bahan Baku</th>
                    <th style={{ textAlign: 'center', padding: '0 8px', fontWeight: 600 }}>Jumlah (Qty)</th>
                    <th style={{ textAlign: 'right', padding: '0 8px', fontWeight: 600 }}>Harga Satuan</th>
                    <th style={{ textAlign: 'right', padding: '0 8px', fontWeight: 600 }}>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedPo.items?.map((item) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid #f0f0eb', height: '38px', whiteSpace: 'nowrap' }}>
                      <td style={{ padding: '0 8px', verticalAlign: 'middle', fontWeight: 600, color: '#1c2826' }}>
                        {item.ingredient_name}
                      </td>
                      <td style={{ textAlign: 'center', padding: '0 8px', verticalAlign: 'middle' }}>
                        {Number(item.quantity).toLocaleString('id-ID')} {item.usage_unit || 'gram'}
                      </td>
                      <td style={{ textAlign: 'right', padding: '0 8px', verticalAlign: 'middle', color: '#64746b' }}>
                        Rp {Number(item.unit_cost).toLocaleString('id-ID')}
                      </td>
                      <td style={{ textAlign: 'right', padding: '0 8px', verticalAlign: 'middle', fontWeight: 700, color: '#1c2826' }}>
                        Rp {Number(item.subtotal).toLocaleString('id-ID')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '16px',
                  background: '#fbfbf9',
                  borderRadius: '12px',
                  border: '1px solid #e7e8e3',
                }}
              >
                <span style={{ fontWeight: 600, color: '#4b5563' }}>Total Biaya Pengadaan</span>
                <span style={{ fontSize: '18px', fontWeight: 800, color: '#1c2826' }}>
                  Rp {Number(selectedPo.total_amount).toLocaleString('id-ID')}
                </span>
              </div>

              {selectedPo.notes && (
                <div style={{ fontSize: '12px', color: '#64746b' }}>
                  Catatan PO: <em>{selectedPo.notes}</em>
                </div>
              )}
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '12px',
                padding: '16px 24px',
                borderTop: '1px solid #e7e8e3',
                background: '#fbfbf9',
              }}
            >
              <button
                onClick={() => setSelectedPo(null)}
                style={{
                  padding: '9px 16px',
                  background: '#f0f0eb',
                  border: '1px solid #dcdfd5',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Tutup
              </button>

              {selectedPo.status !== 'RECEIVED' && (
                <button
                  onClick={() => handleReceivePo(selectedPo.id)}
                  style={{
                    padding: '9px 18px',
                    background: '#57695b',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Konfirmasi Penerimaan Barang
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CREATE PO MODAL */}
      {isCreatePoOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              maxWidth: '680px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '18px 24px',
                borderBottom: '1px solid #e7e8e3',
              }}
            >
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#1c2826', margin: 0 }}>
                Penerbitan Purchase Order Baru
              </h3>
              <button
                onClick={() => setIsCreatePoOpen(false)}
                style={{
                  background: '#f7f7f5',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '6px',
                  cursor: 'pointer',
                  color: '#64746b',
                }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreatePo} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {poError && (
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    color: '#b91c1c',
                    fontSize: '13px',
                  }}
                >
                  {poError}
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#4b5563', marginBottom: '6px' }}>
                  Pilih Supplier
                </label>
                <select
                  value={poSupplierId}
                  onChange={(e) => setPoSupplierId(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    fontSize: '13px',
                    background: '#ffffff',
                  }}
                >
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.phone}) - {s.payment_terms}
                    </option>
                  ))}
                </select>
              </div>

              {/* Items in PO */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#4b5563' }}>
                    Daftar Item Bahan Baku
                  </label>
                  <button
                    type="button"
                    onClick={handleAddPoItemRow}
                    style={{
                      padding: '4px 10px',
                      background: '#f2f4ef',
                      color: '#57695b',
                      border: '1px solid #dcdfd5',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    + Tambah Baris Bahan
                  </button>
                </div>

                {poItems.length === 0 ? (
                  <div
                    style={{
                      padding: '24px',
                      textAlign: 'center',
                      background: '#fbfbf9',
                      border: '1px dashed #d1d5db',
                      borderRadius: '10px',
                      color: '#8b968f',
                      fontSize: '13px',
                    }}
                  >
                    Klik "+ Tambah Baris Bahan" untuk menyusun daftar pengadaan.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {poItems.map((item, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '3fr 2fr 2fr auto',
                          gap: '8px',
                          alignItems: 'center',
                        }}
                      >
                        <select
                          value={item.ingredientId}
                          onChange={(e) => {
                            const newItems = [...poItems];
                            newItems[idx].ingredientId = e.target.value;
                            const ing = ingredients.find((i) => i.id === e.target.value);
                            if (ing) newItems[idx].unitCost = Number(ing.unit_cost);
                            setPoItems(newItems);
                          }}
                          style={{
                            padding: '8px',
                            borderRadius: '6px',
                            border: '1px solid #d1d5db',
                            fontSize: '13px',
                          }}
                        >
                          {ingredients.map((ing) => (
                            <option key={ing.id} value={ing.id}>
                              {ing.name} ({ing.usage_unit})
                            </option>
                          ))}
                        </select>

                        <input
                          type="number"
                          placeholder="Jumlah"
                          value={item.quantity}
                          onChange={(e) => {
                            const newItems = [...poItems];
                            newItems[idx].quantity = Number(e.target.value);
                            setPoItems(newItems);
                          }}
                          style={{
                            padding: '8px',
                            borderRadius: '6px',
                            border: '1px solid #d1d5db',
                            fontSize: '13px',
                          }}
                        />

                        <input
                          type="number"
                          placeholder="Harga Satuan"
                          value={item.unitCost}
                          onChange={(e) => {
                            const newItems = [...poItems];
                            newItems[idx].unitCost = Number(e.target.value);
                            setPoItems(newItems);
                          }}
                          style={{
                            padding: '8px',
                            borderRadius: '6px',
                            border: '1px solid #d1d5db',
                            fontSize: '13px',
                          }}
                        />

                        <button
                          type="button"
                          onClick={() => setPoItems(poItems.filter((_, i) => i !== idx))}
                          style={{
                            background: '#fee2e2',
                            color: '#b91c1c',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '8px',
                            cursor: 'pointer',
                          }}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Total Calculation */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  background: '#fbfbf9',
                  borderRadius: '10px',
                  border: '1px solid #e7e8e3',
                  fontWeight: 700,
                  fontSize: '14px',
                }}
              >
                <span>Estimasi Total PO</span>
                <span style={{ color: '#57695b' }}>Rp {totalPoEstimated.toLocaleString('id-ID')}</span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#4b5563', marginBottom: '6px' }}>
                  Catatan Pengadaan
                </label>
                <textarea
                  placeholder="cth: Pengiriman diharapkan paling lambat besok sore..."
                  value={poNotes}
                  onChange={(e) => setPoNotes(e.target.value)}
                  rows={2}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    fontSize: '13px',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '12px',
                  marginTop: '12px',
                }}
              >
                <button
                  type="button"
                  onClick={() => setIsCreatePoOpen(false)}
                  style={{
                    padding: '10px 18px',
                    background: '#f0f0eb',
                    border: '1px solid #dcdfd5',
                    borderRadius: '10px',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#4b5563',
                    cursor: 'pointer',
                  }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPo}
                  style={{
                    padding: '10px 20px',
                    background: '#57695b',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {isSubmittingPo ? 'Menerbitkan...' : 'Terbitkan PO'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD SUPPLIER MODAL */}
      {isAddSupplierOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              maxWidth: '460px',
              width: '100%',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '18px 24px',
                borderBottom: '1px solid #e7e8e3',
              }}
            >
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#1c2826', margin: 0 }}>
                Tambah Supplier Baru
              </h3>
              <button
                onClick={() => setIsAddSupplierOpen(false)}
                style={{
                  background: '#f7f7f5',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '6px',
                  cursor: 'pointer',
                  color: '#64746b',
                }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddSupplier} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {supError && (
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    color: '#b91c1c',
                    fontSize: '13px',
                  }}
                >
                  {supError}
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#4b5563', marginBottom: '6px' }}>
                  Nama Supplier / Perusahaan
                </label>
                <input
                  type="text"
                  required
                  placeholder="cth: CV Kopi Madura Makmur"
                  value={supName}
                  onChange={(e) => setSupName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    fontSize: '13px',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#4b5563', marginBottom: '6px' }}>
                  Nomor WhatsApp / Telepon
                </label>
                <input
                  type="text"
                  required
                  placeholder="cth: 081234567890"
                  value={supPhone}
                  onChange={(e) => setSupPhone(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    fontSize: '13px',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#4b5563', marginBottom: '6px' }}>
                  Alamat Gudang / Kantor
                </label>
                <input
                  type="text"
                  placeholder="cth: Jl. Trunojoyo No. 45, Pamekasan"
                  value={supAddress}
                  onChange={(e) => setSupAddress(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    fontSize: '13px',
                  }}
                />
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '12px',
                  marginTop: '12px',
                }}
              >
                <button
                  type="button"
                  onClick={() => setIsAddSupplierOpen(false)}
                  style={{
                    padding: '10px 18px',
                    background: '#f0f0eb',
                    border: '1px solid #dcdfd5',
                    borderRadius: '10px',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#4b5563',
                    cursor: 'pointer',
                  }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '10px 20px',
                    background: '#57695b',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Simpan Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FLOATING POPOVER FOR SINGLE LINE BREAKDOWN */}
      {poPopover && (
        <div
          onClick={() => setPoPopover(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            background: 'transparent',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              top: Math.min(poPopover.rect.top + 6, window.innerHeight - 240),
              left: Math.max(10, Math.min(poPopover.rect.left, window.innerWidth - 320)),
              width: '300px',
              background: '#ffffff',
              borderRadius: '12px',
              boxShadow: '0 12px 32px rgba(0,0,0,0.18)',
              border: '1px solid #e2e4dc',
              padding: '14px 16px',
              animation: 'fadeIn 0.15s ease-out',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#1c2826' }}>{poPopover.title}</span>
              <button
                onClick={() => setPoPopover(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#9ca3af',
                  cursor: 'pointer',
                  padding: '2px',
                  display: 'flex',
                }}
              >
                <X size={14} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {poPopover.details.map((d, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', gap: '8px' }}>
                  <span style={{ color: '#64746b', flexShrink: 0 }}>{d.label}</span>
                  <span style={{ color: '#1c2826', fontWeight: 600, textAlign: 'right', wordBreak: 'break-word' }}>
                    {d.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
