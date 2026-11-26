'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { api } from '@/lib/api';
import { Supplier, PurchaseOrder, Ingredient } from '@/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  Building2,
  Receipt,
  Mail,
  MapPin,
  RefreshCw,
  Ban,
  Pencil,
  Trash2,
} from 'lucide-react';

export function AdminPurchasingView() {
  const [activeTab, setActiveTab] = useState<'PO' | 'SUPPLIERS'>('PO');
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPoStatus, setFilterPoStatus] = useState<'ALL' | 'ORDERED' | 'RECEIVED' | 'CANCELLED'>('ALL');

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

  // Add / Edit Supplier Modal
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [supName, setSupName] = useState('');
  const [supPhone, setSupPhone] = useState('');
  const [supEmail, setSupEmail] = useState('');
  const [supAddress, setSupAddress] = useState('');
  const [supTerms, setSupTerms] = useState('CASH');
  const [supError, setSupError] = useState('');
  const [isSubmittingSup, setIsSubmittingSup] = useState(false);

  // Toast Notification
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ type, text });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

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
      showToast('Gagal memuat data pengadaan & supplier.', 'error');
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
      showToast('Gagal memuat rincian PO.', 'error');
    } finally {
      setIsDetailLoading(false);
    }
  };

  const handleReceivePo = async (poId: string) => {
    if (!confirm('Konfirmasi penerimaan barang untuk PO ini? Stok bahan baku di halaman /stok akan otomatis bertambah ke sistem.')) {
      return;
    }

    try {
      const res = await api.purchasing.receiveOrder(poId);
      if (res.success) {
        showToast(res.message || 'Barang PO berhasil diterima! Stok inventaris telah otomatis ditambahkan.');
        setSelectedPo(null);
        loadData();
      }
    } catch (err: any) {
      alert(err.message || 'Gagal memproses penerimaan PO.');
    }
  };

  const handleCancelPo = async (poId: string) => {
    if (!confirm('Apakah Anda yakin ingin membatalkan Purchase Order ini?')) {
      return;
    }

    try {
      const res = await api.purchasing.cancelOrder(poId);
      if (res.success) {
        showToast(res.message || 'Purchase Order berhasil dibatalkan.');
        setSelectedPo(null);
        loadData();
      }
    } catch (err: any) {
      alert(err.message || 'Gagal membatalkan PO.');
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

    for (const item of poItems) {
      if (!item.ingredientId || item.quantity <= 0 || item.unitCost < 0) {
        setPoError('Setiap item pesanan harus memiliki jumlah (> 0) dan harga yang valid.');
        return;
      }
    }

    setIsSubmittingPo(true);
    try {
      const res = await api.purchasing.createOrder({
        supplierId: poSupplierId,
        notes: poNotes.trim() || undefined,
        items: poItems,
      });

      if (res.success) {
        showToast('Purchase Order berhasil diterbitkan!');
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

  const openAddSupplierModal = () => {
    setEditingSupplier(null);
    setSupName('');
    setSupPhone('');
    setSupEmail('');
    setSupAddress('');
    setSupTerms('CASH');
    setSupError('');
    setIsSupplierModalOpen(true);
  };

  const openEditSupplierModal = (s: Supplier) => {
    setEditingSupplier(s);
    setSupName(s.name);
    setSupPhone(s.phone);
    setSupEmail(s.email || '');
    setSupAddress(s.address || '');
    setSupTerms(s.payment_terms || 'CASH');
    setSupError('');
    setIsSupplierModalOpen(true);
  };

  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supName.trim() || !supPhone.trim()) {
      setSupError('Nama supplier dan nomor telepon wajib diisi.');
      return;
    }

    setIsSubmittingSup(true);
    try {
      const payload = {
        name: supName.trim(),
        phone: supPhone.trim(),
        email: supEmail.trim() || undefined,
        address: supAddress.trim() || undefined,
        payment_terms: supTerms,
      };

      if (editingSupplier) {
        const res = await api.purchasing.updateSupplier(editingSupplier.id, payload);
        if (res.success) {
          showToast(`Supplier "${payload.name}" berhasil diperbarui.`);
          setIsSupplierModalOpen(false);
          loadData();
        }
      } else {
        const res = await api.purchasing.createSupplier(payload);
        if (res.success) {
          showToast(`Supplier "${payload.name}" berhasil ditambahkan.`);
          setIsSupplierModalOpen(false);
          loadData();
        }
      }
    } catch (err: any) {
      setSupError(err.message || 'Gagal menyimpan supplier.');
    } finally {
      setIsSubmittingSup(false);
    }
  };

  const handleDeleteSupplier = async (supplierId: string, name: string) => {
    if (!confirm(`Hapus supplier "${name}"?`)) return;

    try {
      const res = await api.purchasing.deleteSupplier(supplierId);
      if (res.success) {
        showToast(res.message || `Supplier "${name}" berhasil dihapus.`);
        loadData();
      }
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus supplier.');
    }
  };

  // Metrics Calculations
  const metrics = useMemo(() => {
    const totalPoCount = purchaseOrders.length;
    let pendingPoCount = 0;
    let receivedPoCount = 0;
    let cancelledPoCount = 0;
    let totalSpend = 0;

    purchaseOrders.forEach((po) => {
      if (po.status === 'RECEIVED') {
        receivedPoCount++;
        totalSpend += Number(po.total_amount) || 0;
      } else if (po.status === 'CANCELLED') {
        cancelledPoCount++;
      } else {
        pendingPoCount++;
      }
    });

    return {
      totalPoCount,
      pendingPoCount,
      receivedPoCount,
      cancelledPoCount,
      totalSpend,
      supplierCount: suppliers.length,
    };
  }, [purchaseOrders, suppliers]);

  // Filtered POs
  const filteredPurchaseOrders = useMemo(() => {
    return purchaseOrders.filter((po) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        po.po_number.toLowerCase().includes(q) ||
        po.supplier_name.toLowerCase().includes(q);

      const matchesStatus =
        filterPoStatus === 'ALL' ||
        (filterPoStatus === 'ORDERED' && po.status === 'ORDERED') ||
        (filterPoStatus === 'RECEIVED' && po.status === 'RECEIVED') ||
        (filterPoStatus === 'CANCELLED' && po.status === 'CANCELLED');

      return matchesSearch && matchesStatus;
    });
  }, [purchaseOrders, searchQuery, filterPoStatus]);

  // Filtered Suppliers
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((s) => {
      const q = searchQuery.toLowerCase().trim();
      return (
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.phone.toLowerCase().includes(q) ||
        (s.email && s.email.toLowerCase().includes(q)) ||
        (s.address && s.address.toLowerCase().includes(q))
      );
    });
  }, [suppliers, searchQuery]);

  const totalPoEstimated = poItems.reduce((sum, item) => sum + item.quantity * item.unitCost, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '80px' }}>
      {/* Toast Alert Banner */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '24px',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '12px 18px',
            borderRadius: '10px',
            background: toastMessage.type === 'success' ? '#15803d' : '#b91c1c',
            color: '#ffffff',
            boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
            fontSize: '13px',
            fontWeight: 600,
          }}
        >
          {toastMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{toastMessage.text}</span>
          <button
            onClick={() => setToastMessage(null)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#ffffff',
              cursor: 'pointer',
              padding: 0,
              marginLeft: '6px',
            }}
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* 4 KPI Ringkasan Metrik Pengadaan */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))',
          gap: '14px',
        }}
      >
        {/* Card 1: Total PO */}
        <div
          style={{
            background: '#ffffff',
            padding: '16px 18px',
            borderRadius: '14px',
            border: '1px solid #e7e8e3',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#64746b' }}>Total Pengadaan</span>
            <div
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '8px',
                background: '#f2f4ef',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#57695b',
              }}
            >
              <Truck size={16} />
            </div>
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#1c2826' }}>
            {metrics.totalPoCount} <span style={{ fontSize: '13px', fontWeight: 500, color: '#64746b' }}>PO</span>
          </div>
          <div style={{ fontSize: '11px', color: '#8b968f' }}>
            {metrics.receivedPoCount} Diterima • {metrics.pendingPoCount} Menunggu
          </div>
        </div>

        {/* Card 2: Menunggu Kiriman */}
        <div
          style={{
            background: '#ffffff',
            padding: '16px 18px',
            borderRadius: '14px',
            border: '1px solid #e7e8e3',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#64746b' }}>Menunggu Kiriman</span>
            <div
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '8px',
                background: metrics.pendingPoCount > 0 ? '#fef3c7' : '#dcfce7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: metrics.pendingPoCount > 0 ? '#b45309' : '#15803d',
              }}
            >
              <Clock size={16} />
            </div>
          </div>
          <div
            style={{
              fontSize: '22px',
              fontWeight: 800,
              color: metrics.pendingPoCount > 0 ? '#b45309' : '#15803d',
            }}
          >
            {metrics.pendingPoCount}{' '}
            <span style={{ fontSize: '13px', fontWeight: 500, color: '#64746b' }}>
              {metrics.pendingPoCount > 0 ? 'Perlu Diterima' : 'Semua Diterima'}
            </span>
          </div>
          <div style={{ fontSize: '11px', color: '#8b968f' }}>
            Menunggu konfirmasi kedatangan barang fisik
          </div>
        </div>

        {/* Card 3: Total Belanja PO */}
        <div
          style={{
            background: '#ffffff',
            padding: '16px 18px',
            borderRadius: '14px',
            border: '1px solid #e7e8e3',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#64746b' }}>Total Belanja Selesai</span>
            <div
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '8px',
                background: '#f2f4ef',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#57695b',
              }}
            >
              <Receipt size={16} />
            </div>
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#1c2826' }}>
            Rp {Math.round(metrics.totalSpend).toLocaleString('id-ID')}
          </div>
          <div style={{ fontSize: '11px', color: '#8b968f' }}>
            Total nominal PO yang telah berhasil diterima
          </div>
        </div>

        {/* Card 4: Mitra Supplier */}
        <div
          style={{
            background: '#ffffff',
            padding: '16px 18px',
            borderRadius: '14px',
            border: '1px solid #e7e8e3',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#64746b' }}>Mitra Supplier</span>
            <div
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '8px',
                background: '#f2f4ef',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#57695b',
              }}
            >
              <Building2 size={16} />
            </div>
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#1c2826' }}>
            {metrics.supplierCount}{' '}
            <span style={{ fontSize: '13px', fontWeight: 500, color: '#64746b' }}>Pemasok</span>
          </div>
          <div style={{ fontSize: '11px', color: '#8b968f' }}>
            Pemasok bahan baku aktif terdaftar
          </div>
        </div>
      </div>

      {/* Filter & Action Bar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          background: '#ffffff',
          padding: '10px 16px',
          borderRadius: '12px',
          border: '1px solid #e7e8e3',
        }}
      >
        {/* Left Side: Tabs, Status Filter & Search */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Main Tab Switcher */}
          <div
            style={{
              display: 'inline-flex',
              background: '#f4f5f1',
              borderRadius: '8px',
              padding: '2px',
              gap: '2px',
            }}
          >
            <button
              onClick={() => {
                setActiveTab('PO');
                setSearchQuery('');
              }}
              style={{
                padding: '5px 12px',
                borderRadius: '6px',
                border: 'none',
                background: activeTab === 'PO' ? '#57695b' : 'transparent',
                color: activeTab === 'PO' ? '#ffffff' : '#64746b',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Purchase Orders ({purchaseOrders.length})
            </button>
            <button
              onClick={() => {
                setActiveTab('SUPPLIERS');
                setSearchQuery('');
              }}
              style={{
                padding: '5px 12px',
                borderRadius: '6px',
                border: 'none',
                background: activeTab === 'SUPPLIERS' ? '#57695b' : 'transparent',
                color: activeTab === 'SUPPLIERS' ? '#ffffff' : '#64746b',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Mitra Supplier ({suppliers.length})
            </button>
          </div>

          {/* Status Filter (Only in PO Tab) (Shadcn UI) */}
          {activeTab === 'PO' && (
            <div style={{ width: '175px' }}>
              <Select value={filterPoStatus} onValueChange={(val) => setFilterPoStatus(val as any)}>
                <SelectTrigger style={{ height: '30px', background: '#ffffff', fontSize: '11.5px' }}>
                  <SelectValue placeholder="Semua Status PO" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Semua Status PO</SelectItem>
                  <SelectItem value="ORDERED">Menunggu Kiriman</SelectItem>
                  <SelectItem value="RECEIVED">Selesai Diterima</SelectItem>
                  <SelectItem value="CANCELLED">Dibatalkan</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Search Box */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: '#f7f7f5',
              padding: '0 10px',
              borderRadius: '8px',
              border: '1px solid #e2e4dc',
              flex: '1 1 180px',
              minWidth: '150px',
              height: '30px',
            }}
          >
            <Search size={13} color="#64746b" />
            <input
              type="text"
              placeholder={activeTab === 'PO' ? 'Cari no. PO atau supplier...' : 'Cari nama, telp, alamat...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: '11.5px',
                color: '#1c2826',
                width: '100%',
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{ background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer', padding: 0 }}
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Right Side: Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={openAddSupplierModal}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: '6px 12px',
              background: '#f2f4ef',
              color: '#57695b',
              border: '1px solid #dcdfd5',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            <Building2 size={13} />
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
              gap: '5px',
              padding: '6px 14px',
              background: '#57695b',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            <Plus size={14} />
            Buat PO
          </button>
        </div>
      </div>

      {/* TAB 1: PURCHASE ORDERS */}
      {activeTab === 'PO' && (
        <div
          style={{
            background: '#ffffff',
            borderRadius: '14px',
            border: '1px solid #e7e8e3',
            overflow: 'hidden',
          }}
        >
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                textAlign: 'left',
                fontSize: '12px',
                whiteSpace: 'nowrap',
              }}
            >
              <thead>
                <tr style={{ background: '#fbfbf9', borderBottom: '1px solid #e7e8e3', color: '#71717a' }}>
                  <th style={{ padding: '9px 12px', fontWeight: 600, fontSize: '11.5px' }}>No. PO</th>
                  <th style={{ padding: '9px 12px', fontWeight: 600, fontSize: '11.5px' }}>Tanggal</th>
                  <th style={{ padding: '9px 12px', fontWeight: 600, fontSize: '11.5px' }}>Supplier</th>
                  <th style={{ padding: '9px 12px', fontWeight: 600, fontSize: '11.5px' }}>Dibuat Oleh</th>
                  <th style={{ padding: '9px 12px', fontWeight: 600, fontSize: '11.5px' }}>Total Biaya</th>
                  <th style={{ padding: '9px 12px', fontWeight: 600, fontSize: '11.5px' }}>Status Barang</th>
                  <th style={{ padding: '9px 14px', fontWeight: 600, fontSize: '11.5px', textAlign: 'right' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '36px', textAlign: 'center', color: '#64746b' }}>
                      Memuat daftar Purchase Order...
                    </td>
                  </tr>
                ) : filteredPurchaseOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '36px', textAlign: 'center', color: '#8b968f' }}>
                      Tidak ada Purchase Order yang sesuai.
                    </td>
                  </tr>
                ) : (
                  filteredPurchaseOrders.map((po) => {
                    const isReceived = po.status === 'RECEIVED';
                    const isCancelled = po.status === 'CANCELLED';
                    const dateFormatted = new Date(po.created_at).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    });

                    return (
                      <tr
                        key={po.id}
                        style={{
                          borderBottom: '1px solid #f0f0eb',
                          height: '42px',
                          opacity: isCancelled ? 0.6 : 1,
                        }}
                      >
                        {/* 1. No. PO */}
                        <td style={{ padding: '8px 12px', verticalAlign: 'middle' }}>
                          <span
                            style={{
                              fontFamily: 'monospace',
                              fontWeight: 700,
                              color: '#1c2826',
                              fontSize: '11.5px',
                              background: '#f2f4ef',
                              padding: '2px 5px',
                              borderRadius: '4px',
                            }}
                          >
                            {po.po_number}
                          </span>
                        </td>

                        {/* 2. Tanggal */}
                        <td style={{ padding: '8px 12px', verticalAlign: 'middle', color: '#6b7280' }}>
                          {dateFormatted}
                        </td>

                        {/* 3. Supplier */}
                        <td style={{ padding: '8px 12px', verticalAlign: 'middle' }}>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <strong style={{ color: '#1c2826', fontSize: '12px' }}>{po.supplier_name}</strong>
                            {po.supplier_phone && (
                              <span style={{ fontSize: '10.5px', color: '#8b968f' }}>{po.supplier_phone}</span>
                            )}
                          </div>
                        </td>

                        {/* 4. Dibuat Oleh */}
                        <td style={{ padding: '8px 12px', verticalAlign: 'middle', color: '#4b5563' }}>
                          {po.ordered_by_name || 'Owner'}
                        </td>

                        {/* 5. Total Biaya */}
                        <td style={{ padding: '8px 12px', verticalAlign: 'middle', fontWeight: 700, color: '#1c2826' }}>
                          Rp {Number(po.total_amount).toLocaleString('id-ID')}
                        </td>

                        {/* 6. Status Barang */}
                        <td style={{ padding: '8px 12px', verticalAlign: 'middle' }}>
                          {isReceived ? (
                            <span
                              style={{
                                padding: '2px 7px',
                                borderRadius: '5px',
                                background: '#dcfce7',
                                color: '#15803d',
                                fontWeight: 700,
                                fontSize: '10.5px',
                                display: 'inline-block',
                              }}
                            >
                              Diterima
                            </span>
                          ) : isCancelled ? (
                            <span
                              style={{
                                padding: '2px 7px',
                                borderRadius: '5px',
                                background: '#fee2e2',
                                color: '#b91c1c',
                                fontWeight: 700,
                                fontSize: '10.5px',
                                display: 'inline-block',
                              }}
                            >
                              Dibatalkan
                            </span>
                          ) : (
                            <span
                              style={{
                                padding: '2px 7px',
                                borderRadius: '5px',
                                background: '#fef3c7',
                                color: '#b45309',
                                fontWeight: 700,
                                fontSize: '10.5px',
                                display: 'inline-block',
                              }}
                            >
                              Menunggu Kiriman
                            </span>
                          )}
                        </td>

                        {/* 7. Aksi */}
                        <td style={{ padding: '8px 14px', verticalAlign: 'middle', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                            <button
                              type="button"
                              onClick={() => handleOpenPoDetail(po.id)}
                              style={{
                                padding: '4px 8px',
                                background: '#f7f7f5',
                                color: '#4b5563',
                                border: '1px solid #e2e4dc',
                                borderRadius: '5px',
                                fontWeight: 600,
                                fontSize: '11px',
                                cursor: 'pointer',
                              }}
                            >
                              Detail
                            </button>

                            {!isReceived && !isCancelled && (
                              <button
                                type="button"
                                onClick={() => handleReceivePo(po.id)}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  padding: '4px 9px',
                                  background: '#57695b',
                                  color: '#ffffff',
                                  border: 'none',
                                  borderRadius: '5px',
                                  fontWeight: 600,
                                  fontSize: '11px',
                                  cursor: 'pointer',
                                }}
                                title="Klik untuk mengonfirmasi penerimaan barang dan menambah stok ke /stok"
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

      {/* TAB 2: MITRA SUPPLIER */}
      {activeTab === 'SUPPLIERS' && (
        <div
          style={{
            background: '#ffffff',
            borderRadius: '14px',
            border: '1px solid #e7e8e3',
            overflow: 'hidden',
          }}
        >
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                textAlign: 'left',
                fontSize: '12px',
                whiteSpace: 'nowrap',
              }}
            >
              <thead>
                <tr style={{ background: '#fbfbf9', borderBottom: '1px solid #e7e8e3', color: '#71717a' }}>
                  <th style={{ padding: '9px 12px', fontWeight: 600, fontSize: '11.5px' }}>Nama Supplier</th>
                  <th style={{ padding: '9px 12px', fontWeight: 600, fontSize: '11.5px' }}>Telepon / WhatsApp</th>
                  <th style={{ padding: '9px 12px', fontWeight: 600, fontSize: '11.5px' }}>Email</th>
                  <th style={{ padding: '9px 12px', fontWeight: 600, fontSize: '11.5px' }}>Alamat Gudang / Kantor</th>
                  <th style={{ padding: '9px 12px', fontWeight: 600, fontSize: '11.5px' }}>Syarat Bayar</th>
                  <th style={{ padding: '9px 14px', fontWeight: 600, fontSize: '11.5px', textAlign: 'right' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredSuppliers.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '36px', textAlign: 'center', color: '#8b968f' }}>
                      Tidak ada data supplier yang sesuai.
                    </td>
                  </tr>
                ) : (
                  filteredSuppliers.map((s) => {
                    const poCount = purchaseOrders.filter((po) => po.supplier_id === s.id).length;

                    return (
                      <tr
                        key={s.id}
                        style={{
                          borderBottom: '1px solid #f0f0eb',
                          height: '42px',
                        }}
                      >
                        <td style={{ padding: '8px 12px', verticalAlign: 'middle', fontWeight: 700, color: '#1c2826' }}>
                          <div>{s.name}</div>
                          <span style={{ fontSize: '10.5px', color: '#8b968f', fontWeight: 500 }}>
                            {poCount} PO Terkait
                          </span>
                        </td>
                        <td style={{ padding: '8px 12px', verticalAlign: 'middle', color: '#4b5563' }}>
                          {s.phone}
                        </td>
                        <td style={{ padding: '8px 12px', verticalAlign: 'middle', color: '#64746b' }}>
                          {s.email || '-'}
                        </td>
                        <td style={{ padding: '8px 12px', verticalAlign: 'middle', color: '#64746b', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {s.address || '-'}
                        </td>
                        <td style={{ padding: '8px 12px', verticalAlign: 'middle' }}>
                          <span
                            style={{
                              padding: '2px 7px',
                              borderRadius: '5px',
                              background: '#f2f4ef',
                              color: '#57695b',
                              fontWeight: 600,
                              fontSize: '11px',
                              display: 'inline-block',
                            }}
                          >
                            {s.payment_terms || 'CASH'}
                          </span>
                        </td>
                        <td style={{ padding: '8px 14px', verticalAlign: 'middle', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                            <button
                              type="button"
                              onClick={() => openEditSupplierModal(s)}
                              style={{
                                padding: '4px 7px',
                                background: '#f7f7f5',
                                color: '#4b5563',
                                border: '1px solid #e2e4dc',
                                borderRadius: '5px',
                                cursor: 'pointer',
                              }}
                              title="Edit Supplier"
                            >
                              <Pencil size={12} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteSupplier(s.id, s.name)}
                              style={{
                                padding: '4px 7px',
                                background: '#fff5f5',
                                color: '#dc2626',
                                border: '1px solid #fed7d7',
                                borderRadius: '5px',
                                cursor: 'pointer',
                              }}
                              title="Hapus Supplier"
                            >
                              <Trash2 size={12} />
                            </button>
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

      {/* MODAL 1: RINCIAN PURCHASE ORDER */}
      {selectedPo && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.45)',
            backdropFilter: 'blur(2px)',
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
              borderRadius: '16px',
              maxWidth: '580px',
              width: '100%',
              maxHeight: '88vh',
              overflowY: 'auto',
              boxShadow: '0 20px 40px rgba(0,0,0,0.18)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                borderBottom: '1px solid #e7e8e3',
              }}
            >
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1c2826', margin: 0 }}>
                  Rincian {selectedPo.po_number}
                </h3>
                <span style={{ fontSize: '11.5px', color: '#64746b' }}>
                  Supplier: <strong>{selectedPo.supplier_name}</strong> ({selectedPo.supplier_phone || '-'})
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPo(null)}
                style={{ background: 'transparent', border: 'none', color: '#64746b', cursor: 'pointer', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  background:
                    selectedPo.status === 'RECEIVED'
                      ? '#dcfce7'
                      : selectedPo.status === 'CANCELLED'
                      ? '#fee2e2'
                      : '#fef3c7',
                  color:
                    selectedPo.status === 'RECEIVED'
                      ? '#15803d'
                      : selectedPo.status === 'CANCELLED'
                      ? '#b91c1c'
                      : '#b45309',
                  fontSize: '12px',
                  fontWeight: 600,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {selectedPo.status === 'RECEIVED' ? (
                    <CheckCircle2 size={15} />
                  ) : selectedPo.status === 'CANCELLED' ? (
                    <Ban size={15} />
                  ) : (
                    <Clock size={15} />
                  )}
                  <span>
                    Status:{' '}
                    {selectedPo.status === 'RECEIVED'
                      ? `Telah Diterima (${selectedPo.received_at ? new Date(selectedPo.received_at).toLocaleDateString('id-ID') : 'Selesai'})`
                      : selectedPo.status === 'CANCELLED'
                      ? 'Dibatalkan (Pesanan tidak diproses)'
                      : 'Menunggu Kiriman Barang dari Supplier'}
                  </span>
                </div>
              </div>

              {/* Items Table */}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', whiteSpace: 'nowrap' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e7e8e3', color: '#64746b', height: '32px' }}>
                      <th style={{ textAlign: 'left', padding: '0 6px', fontWeight: 600 }}>Bahan Baku</th>
                      <th style={{ textAlign: 'center', padding: '0 6px', fontWeight: 600 }}>Jumlah</th>
                      <th style={{ textAlign: 'right', padding: '0 6px', fontWeight: 600 }}>Harga Satuan</th>
                      <th style={{ textAlign: 'right', padding: '0 6px', fontWeight: 600 }}>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedPo.items?.map((item) => (
                      <tr key={item.id} style={{ borderBottom: '1px solid #f0f0eb', height: '36px' }}>
                        <td style={{ padding: '0 6px', verticalAlign: 'middle', fontWeight: 600, color: '#1c2826' }}>
                          {item.ingredient_name}
                        </td>
                        <td style={{ textAlign: 'center', padding: '0 6px', verticalAlign: 'middle' }}>
                          {Number(item.quantity).toLocaleString('id-ID')} {item.usage_unit || 'gram'}
                        </td>
                        <td style={{ textAlign: 'right', padding: '0 6px', verticalAlign: 'middle', color: '#64746b' }}>
                          Rp {Number(item.unit_cost).toLocaleString('id-ID')}
                        </td>
                        <td style={{ textAlign: 'right', padding: '0 6px', verticalAlign: 'middle', fontWeight: 700, color: '#1c2826' }}>
                          Rp {Number(item.subtotal).toLocaleString('id-ID')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Total Summary */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 14px',
                  background: '#fbfbf9',
                  borderRadius: '10px',
                  border: '1px solid #e7e8e3',
                }}
              >
                <span style={{ fontWeight: 600, color: '#4b5563', fontSize: '12.5px' }}>Total Biaya Pengadaan</span>
                <span style={{ fontSize: '16px', fontWeight: 800, color: '#1c2826' }}>
                  Rp {Number(selectedPo.total_amount).toLocaleString('id-ID')}
                </span>
              </div>

              {selectedPo.notes && (
                <div style={{ fontSize: '11.5px', color: '#64746b' }}>
                  Catatan: <em>{selectedPo.notes}</em>
                </div>
              )}
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '8px',
                padding: '12px 20px',
                borderTop: '1px solid #e7e8e3',
                background: '#fbfbf9',
              }}
            >
              <button
                type="button"
                onClick={() => setSelectedPo(null)}
                style={{
                  padding: '7px 14px',
                  background: '#f0f0eb',
                  border: '1px solid #dcdfd5',
                  borderRadius: '8px',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  color: '#4b5563',
                  cursor: 'pointer',
                }}
              >
                Tutup
              </button>

              {selectedPo.status === 'ORDERED' && (
                <>
                  <button
                    type="button"
                    onClick={() => handleCancelPo(selectedPo.id)}
                    style={{
                      padding: '7px 14px',
                      background: '#fff5f5',
                      color: '#dc2626',
                      border: '1px solid #fed7d7',
                      borderRadius: '8px',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Batalkan PO
                  </button>

                  <button
                    type="button"
                    onClick={() => handleReceivePo(selectedPo.id)}
                    style={{
                      padding: '7px 16px',
                      background: '#57695b',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Konfirmasi Terima Barang
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: BUAT PURCHASE ORDER BARU */}
      {isCreatePoOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.45)',
            backdropFilter: 'blur(2px)',
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
              borderRadius: '16px',
              maxWidth: '620px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 40px rgba(0,0,0,0.18)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                borderBottom: '1px solid #e7e8e3',
              }}
            >
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1c2826', margin: 0 }}>
                Buat Purchase Order Baru
              </h3>
              <button
                type="button"
                onClick={() => setIsCreatePoOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#64746b', cursor: 'pointer', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreatePo} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {poError && (
                <div style={{ padding: '8px 12px', borderRadius: '7px', background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', fontSize: '12px' }}>
                  {poError}
                </div>
              )}

              {/* Supplier Selection */}
              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                  Pilih Supplier <span style={{ color: '#b91c1c' }}>*</span>
                </label>
                <Select value={poSupplierId} onValueChange={setPoSupplierId}>
                  <SelectTrigger style={{ width: '100%', height: '36px', background: '#ffffff', borderRadius: '8px', border: '1px solid #d1d5db' }}>
                    <SelectValue placeholder="Pilih Supplier..." />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} ({s.phone}) - {s.payment_terms || 'CASH'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* PO Items */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '11.5px', fontWeight: 600, color: '#374151' }}>
                    Daftar Item Bahan Baku
                  </label>
                  <button
                    type="button"
                    onClick={handleAddPoItemRow}
                    style={{
                      padding: '3px 8px',
                      background: '#f2f4ef',
                      color: '#57695b',
                      border: '1px solid #dcdfd5',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    + Tambah Bahan
                  </button>
                </div>

                {poItems.length === 0 ? (
                  <div
                    style={{
                      padding: '20px',
                      textAlign: 'center',
                      background: '#fbfbf9',
                      border: '1px dashed #d1d5db',
                      borderRadius: '8px',
                      color: '#8b968f',
                      fontSize: '12px',
                    }}
                  >
                    Klik &quot;+ Tambah Bahan&quot; untuk menyusun item pesanan.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {poItems.map((item, idx) => {
                      const selectedIng = ingredients.find((i) => i.id === item.ingredientId);
                      const subtotal = item.quantity * item.unitCost;

                      return (
                        <div
                          key={idx}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px',
                            background: '#fbfbf9',
                            padding: '8px 10px',
                            borderRadius: '8px',
                            border: '1px solid #e7e8e3',
                          }}
                        >
                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '2.5fr 1.5fr 1.5fr 1.5fr auto',
                              gap: '6px',
                              alignItems: 'center',
                            }}
                          >
                            <Select
                              value={item.ingredientId}
                              onValueChange={(val) => {
                                const newItems = [...poItems];
                                newItems[idx].ingredientId = val;
                                const ing = ingredients.find((i) => i.id === val);
                                if (ing) newItems[idx].unitCost = Number(ing.unit_cost);
                                setPoItems(newItems);
                              }}
                            >
                              <SelectTrigger style={{ height: '32px', background: '#ffffff', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '12px' }}>
                                <SelectValue placeholder="Pilih Bahan" />
                              </SelectTrigger>
                              <SelectContent>
                                {ingredients.map((ing) => (
                                  <SelectItem key={ing.id} value={ing.id}>
                                    {ing.name} ({ing.usage_unit})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                              <input
                                type="number"
                                step="any"
                                placeholder="Qty"
                                value={item.quantity}
                                onChange={(e) => {
                                  const newItems = [...poItems];
                                  newItems[idx].quantity = Number(e.target.value);
                                  setPoItems(newItems);
                                }}
                                style={{
                                  width: '100%',
                                  padding: '6px',
                                  paddingRight: '28px',
                                  borderRadius: '6px',
                                  border: '1px solid #d1d5db',
                                  fontSize: '12px',
                                  outline: 'none',
                                }}
                              />
                              <span style={{ position: 'absolute', right: '6px', fontSize: '10px', color: '#888' }}>
                                {selectedIng?.usage_unit || ''}
                              </span>
                            </div>

                            <input
                              type="number"
                              step="any"
                              placeholder="Harga"
                              value={item.unitCost}
                              onChange={(e) => {
                                const newItems = [...poItems];
                                newItems[idx].unitCost = Number(e.target.value);
                                setPoItems(newItems);
                              }}
                              style={{
                                width: '100%',
                                padding: '6px',
                                borderRadius: '6px',
                                border: '1px solid #d1d5db',
                                fontSize: '12px',
                                outline: 'none',
                              }}
                            />

                            <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#1c2826', textAlign: 'right' }}>
                              Rp {Math.round(subtotal).toLocaleString('id-ID')}
                            </div>

                            <button
                              type="button"
                              onClick={() => setPoItems(poItems.filter((_, i) => i !== idx))}
                              style={{
                                background: '#fee2e2',
                                color: '#b91c1c',
                                border: 'none',
                                borderRadius: '6px',
                                padding: '6px',
                                cursor: 'pointer',
                              }}
                            >
                              <X size={13} />
                            </button>
                          </div>

                          {selectedIng && (
                            <div style={{ fontSize: '11px', color: '#64746b', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                              <span style={{ background: '#edf3ee', color: '#57695b', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
                                1 {selectedIng.purchase_unit} = {Number(selectedIng.conversion_rate).toLocaleString('id-ID')} {selectedIng.usage_unit}
                              </span>
                              <span>
                                (HPP saat ini: Rp {Math.round(Number(selectedIng.unit_cost)).toLocaleString('id-ID')} / {selectedIng.usage_unit})
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Total Calculation */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  background: '#f4f6f2',
                  borderRadius: '8px',
                  border: '1px solid #e2e6de',
                  fontWeight: 700,
                  fontSize: '13px',
                }}
              >
                <span style={{ color: '#4b5563' }}>Estimasi Total PO</span>
                <span style={{ color: '#57695b' }}>Rp {totalPoEstimated.toLocaleString('id-ID')}</span>
              </div>

              {/* Notes */}
              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                  Catatan Pengadaan
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Pengiriman paling lambat besok sore..."
                  value={poNotes}
                  onChange={(e) => setPoNotes(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    fontSize: '12px',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setIsCreatePoOpen(false)}
                  style={{
                    padding: '7px 14px',
                    background: '#f0f0eb',
                    border: '1px solid #dcdfd5',
                    borderRadius: '8px',
                    fontSize: '12.5px',
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
                    padding: '7px 18px',
                    background: '#57695b',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '12.5px',
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

      {/* MODAL 3: TAMBAH / EDIT SUPPLIER */}
      {isSupplierModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.45)',
            backdropFilter: 'blur(2px)',
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
              borderRadius: '16px',
              maxWidth: '460px',
              width: '100%',
              boxShadow: '0 20px 40px rgba(0,0,0,0.18)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                borderBottom: '1px solid #e7e8e3',
              }}
            >
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1c2826', margin: 0 }}>
                {editingSupplier ? 'Edit Data Supplier' : 'Tambah Supplier Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setIsSupplierModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#64746b', cursor: 'pointer', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveSupplier} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {supError && (
                <div style={{ padding: '8px 12px', borderRadius: '7px', background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', fontSize: '12px' }}>
                  {supError}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                    Nama Supplier <span style={{ color: '#b91c1c' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: PT Kopi Nusantara"
                    value={supName}
                    onChange={(e) => setSupName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: '1px solid #d1d5db',
                      fontSize: '12.5px',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                    Telepon / WA <span style={{ color: '#b91c1c' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="08123456789"
                    value={supPhone}
                    onChange={(e) => setSupPhone(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: '1px solid #d1d5db',
                      fontSize: '12.5px',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                    Email Kantor
                  </label>
                  <input
                    type="email"
                    placeholder="sales@kopinusantara.id"
                    value={supEmail}
                    onChange={(e) => setSupEmail(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: '1px solid #d1d5db',
                      fontSize: '12.5px',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                    Syarat Bayar
                  </label>
                  <Select value={supTerms} onValueChange={setSupTerms}>
                    <SelectTrigger style={{ width: '100%', height: '36px', background: '#ffffff', borderRadius: '8px', border: '1px solid #d1d5db' }}>
                      <SelectValue placeholder="Pilih Syarat Bayar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CASH">CASH (Tunai)</SelectItem>
                      <SelectItem value="TOP 7 Hari">TOP 7 Hari</SelectItem>
                      <SelectItem value="TOP 14 Hari">TOP 14 Hari</SelectItem>
                      <SelectItem value="TOP 30 Hari">TOP 30 Hari</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                  Alamat Gudang / Kantor
                </label>
                <input
                  type="text"
                  placeholder="Jl. Merdeka No. 45, Jakarta"
                  value={supAddress}
                  onChange={(e) => setSupAddress(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    fontSize: '12.5px',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setIsSupplierModalOpen(false)}
                  style={{
                    padding: '7px 14px',
                    background: '#f0f0eb',
                    border: '1px solid #dcdfd5',
                    borderRadius: '8px',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    color: '#4b5563',
                    cursor: 'pointer',
                  }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingSup}
                  style={{
                    padding: '7px 18px',
                    background: '#57695b',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {isSubmittingSup ? 'Menyimpan...' : editingSupplier ? 'Perbarui Supplier' : 'Simpan Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
