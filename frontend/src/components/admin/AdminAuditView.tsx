'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { api } from '@/lib/api';
import { AuditLog } from '@/types';
import {
  ShieldCheck,
  Search,
  RotateCcw,
  Clock,
  User,
  X,
  AlertTriangle,
  ClipboardCheck,
  Trash2,
  PackageCheck,
  ShoppingCart,
  Sliders,
  FileText,
  Boxes,
  BadgePercent,
  Coffee,
  CheckCircle2,
  ArrowRight,
  Eye,
  Info,
} from 'lucide-react';

// Kamus Penerjemah Aksi Sistem -> Bahasa Bisnis Ramah Pemilik/Manajer
interface ActionMeta {
  title: string;
  category: string;
  categoryKey: 'SALES' | 'INVENTORY' | 'PURCHASING' | 'SETTINGS' | 'OTHER';
  color: string;
  bg: string;
  icon: React.ElementType;
  formatSummary: (details: any, targetId?: string) => string;
}

const ACTION_DICTIONARY: { [key: string]: ActionMeta } = {
  VOID_ORDER: {
    title: 'Pembatalan Transaksi (Void)',
    category: 'Kasir & Penjualan',
    categoryKey: 'SALES',
    color: '#b91c1c',
    bg: '#fee2e2',
    icon: AlertTriangle,
    formatSummary: (d) => {
      const num = d?.orderNumber || 'Pesanan Kasir';
      const amt = d?.totalAmount ? `Rp ${Number(d.totalAmount).toLocaleString('id-ID')}` : '';
      const rsn = d?.reason ? ` • Alasan: "${d.reason}"` : '';
      return `${num} dibatalkan ${amt ? `senilai ${amt}` : ''}${rsn}`;
    },
  },
  ORDER_VOID: {
    title: 'Pembatalan Transaksi (Void)',
    category: 'Kasir & Penjualan',
    categoryKey: 'SALES',
    color: '#b91c1c',
    bg: '#fee2e2',
    icon: AlertTriangle,
    formatSummary: (d) => {
      const num = d?.orderNumber || 'Pesanan';
      const rsn = d?.reason ? ` • Alasan: "${d.reason}"` : '';
      return `${num} dibatalkan${rsn}`;
    },
  },
  RECORD_WASTAGE: {
    title: 'Bahan Rusak / Terbuang (Limbah)',
    category: 'Stok & Gudang',
    categoryKey: 'INVENTORY',
    color: '#c2410c',
    bg: '#ffedd5',
    icon: Trash2,
    formatSummary: (d) => {
      const ing = d?.ingredient || 'Bahan baku';
      const qty = d?.quantityLost !== undefined ? `${d.quantityLost} ${d?.unit || ''}` : '';
      const loss = d?.estimatedCostLoss ? ` • Beban rugi: Rp ${Number(d.estimatedCostLoss).toLocaleString('id-ID')}` : '';
      const rsn = d?.reason ? ` • Alasan: "${d.reason}"` : '';
      return `${ing} terbuang ${qty}${loss}${rsn}`;
    },
  },
  STOCKTAKE_SUBMIT: {
    title: 'Pencatatan Stock Opname Fisik',
    category: 'Stok & Gudang',
    categoryKey: 'INVENTORY',
    color: '#047857',
    bg: '#d1fae5',
    icon: ClipboardCheck,
    formatSummary: (d) => {
      if (Array.isArray(d)) {
        return `Penyesuaian saldo fisik untuk ${d.length} item bahan di gudang kafe`;
      }
      return 'Penyesuaian saldo fisik riil inventaris gudang';
    },
  },
  RECEIVE_PO: {
    title: 'Penerimaan Barang Pemasok (PO Masuk)',
    category: 'Pengadaan & Pemasok',
    categoryKey: 'PURCHASING',
    color: '#15803d',
    bg: '#dcfce7',
    icon: PackageCheck,
    formatSummary: (d) => {
      const po = d?.po_number || 'Pengadaan';
      const items = d?.received_items ? ` (${d.received_items} jenis bahan)` : '';
      return `Barang ${po} tiba di gudang dan stok fisik bertambah${items}`;
    },
  },
  CREATE_PO: {
    title: 'Pembuatan Pesanan Pengadaan (PO)',
    category: 'Pengadaan & Pemasok',
    categoryKey: 'PURCHASING',
    color: '#0369a1',
    bg: '#e0f2fe',
    icon: ShoppingCart,
    formatSummary: (d) => {
      const po = d?.po_number || 'Order baru';
      const amt = d?.total_amount ? ` senilai Rp ${Number(d.total_amount).toLocaleString('id-ID')}` : '';
      return `Pesanan pengadaan ${po} diterbitkan ke supplier${amt}`;
    },
  },
  CANCEL_PO: {
    title: 'Pembatalan Pesanan Pengadaan (PO)',
    category: 'Pengadaan & Pemasok',
    categoryKey: 'PURCHASING',
    color: '#b91c1c',
    bg: '#fee2e2',
    icon: X,
    formatSummary: (d) => {
      const po = d?.po_number || 'Pengadaan';
      return `Pesanan pembelian ${po} telah dibatalkan oleh pemilik`;
    },
  },
  UPDATE_SETTINGS: {
    title: 'Pembaruan Pengaturan Kafe',
    category: 'Pengaturan & Profil',
    categoryKey: 'SETTINGS',
    color: '#57695b',
    bg: '#f2f4ef',
    icon: Sliders,
    formatSummary: (d) => {
      const keys = Object.keys(d || {});
      if (keys.length > 0) {
        return `Memperbarui konfigurasi kafe (${keys.slice(0, 3).join(', ')}${keys.length > 3 ? '...' : ''})`;
      }
      return 'Perubahan data profil outlet, printer, atau pembulatan kasir';
    },
  },
  CREATE_PRODUCT: {
    title: 'Penambahan Menu Baru',
    category: 'Katalog Menu & Resep',
    categoryKey: 'SETTINGS',
    color: '#4338ca',
    bg: '#e0e7ff',
    icon: Coffee,
    formatSummary: (d) => `Menu "${d?.name || 'Baru'}" ditambahkan ke daftar katalog kasir`,
  },
  UPDATE_PRODUCT: {
    title: 'Perubahan Data Menu',
    category: 'Katalog Menu & Resep',
    categoryKey: 'SETTINGS',
    color: '#4338ca',
    bg: '#e0e7ff',
    icon: Coffee,
    formatSummary: (d) => `Perubahan informasi atau harga jual pada menu "${d?.name || ''}"`,
  },
  UPDATE_RECIPE: {
    title: 'Formulasi Resep & HPP',
    category: 'Katalog Menu & Resep',
    categoryKey: 'SETTINGS',
    color: '#0284c7',
    bg: '#e0f2fe',
    icon: Coffee,
    formatSummary: (d) => `Pembaruan takaran bahan baku resep & kalkulasi HPP`,
  },
  CREATE_PROMO: {
    title: 'Pembuatan Voucher Promo Baru',
    category: 'Program Promosi',
    categoryKey: 'SETTINGS',
    color: '#b45309',
    bg: '#fef3c7',
    icon: BadgePercent,
    formatSummary: (d) => `Voucher promo "${d?.name || d?.code || ''}" mulai didaftarkan`,
  },
  UPDATE_PROMO: {
    title: 'Perubahan Voucher Promo',
    category: 'Program Promosi',
    categoryKey: 'SETTINGS',
    color: '#b45309',
    bg: '#fef3c7',
    icon: BadgePercent,
    formatSummary: (d) => `Pembaruan syarat atau potongan diskon pada voucher "${d?.name || ''}"`,
  },
  SHIFT_OPEN: {
    title: 'Buka Sif Kasir Baru',
    category: 'Kasir & Penjualan',
    categoryKey: 'SALES',
    color: '#15803d',
    bg: '#dcfce7',
    icon: Clock,
    formatSummary: (d) => `Kasir membuka sif kerja baru dengan modal awal kas`,
  },
  SHIFT_CLOSE: {
    title: 'Tutup Sif & Rekonsiliasi Kas',
    category: 'Kasir & Penjualan',
    categoryKey: 'SALES',
    color: '#15803d',
    bg: '#dcfce7',
    icon: CheckCircle2,
    formatSummary: (d) => `Sif kasir ditutup dan rekonsiliasi setoran kas telah dicatat`,
  },
};

// Fallback jika ada aksi baru di masa depan
function getActionMeta(rawAction: string, targetTable?: string): ActionMeta {
  if (ACTION_DICTIONARY[rawAction]) {
    return ACTION_DICTIONARY[rawAction];
  }

  // Auto-format format nama aksi Title Case ramah pengguna
  const formatted = rawAction
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  let cat = 'Operasional Kafe';
  let catKey: ActionMeta['categoryKey'] = 'OTHER';

  if (targetTable?.includes('order')) {
    cat = 'Kasir & Penjualan';
    catKey = 'SALES';
  } else if (targetTable?.includes('ingredient') || targetTable?.includes('stock')) {
    cat = 'Stok & Gudang';
    catKey = 'INVENTORY';
  } else if (targetTable?.includes('purchase') || targetTable?.includes('supplier')) {
    cat = 'Pengadaan & Pemasok';
    catKey = 'PURCHASING';
  } else if (targetTable?.includes('setting') || targetTable?.includes('product')) {
    cat = 'Pengaturan & Menu';
    catKey = 'SETTINGS';
  }

  return {
    title: formatted,
    category: cat,
    categoryKey: catKey,
    color: '#475569',
    bg: '#f1f5f9',
    icon: Info,
    formatSummary: () => `Aktivitas sistem pada bagian ${cat.toLowerCase()}`,
  };
}

// Terjemahan Peran Karyawan
function getRoleLabel(role?: string | null): { label: string; bg: string; color: string } {
  const r = (role || '').toUpperCase();
  if (r === 'OWNER') {
    return { label: 'Pemilik (Owner)', bg: '#fef3c7', color: '#92400e' };
  }
  if (r === 'MANAGER') {
    return { label: 'Manajer Outlet', bg: '#e0f2fe', color: '#0369a1' };
  }
  if (r === 'CASHIER') {
    return { label: 'Kasir', bg: '#dcfce7', color: '#15803d' };
  }
  if (r === 'BARISTA') {
    return { label: 'Barista', bg: '#f3e8ff', color: '#6b21a8' };
  }
  if (r === 'KITCHEN') {
    return { label: 'Staf Dapur', bg: '#ffedd5', color: '#c2410c' };
  }
  return { label: role || 'Staf', bg: '#f1f5f9', color: '#475569' };
}

export function AdminAuditView() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'SALES' | 'INVENTORY' | 'PURCHASING' | 'SETTINGS'>('ALL');
  const [viewJsonMode, setViewJsonMode] = useState(false);

  const loadLogs = async () => {
    setIsLoading(true);
    try {
      const res = await api.audit.getLogs({ limit: 150 });
      if (res.success && res.data) {
        setLogs(res.data);
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  // Metrik Ringkasan Cepat
  const metrics = useMemo(() => {
    let voidCount = 0;
    let inventoryOps = 0;
    let purchasingOps = 0;

    logs.forEach((l) => {
      const meta = getActionMeta(l.action, l.target_table);
      if (l.action.includes('VOID')) voidCount++;
      if (meta.categoryKey === 'INVENTORY') inventoryOps++;
      if (meta.categoryKey === 'PURCHASING') purchasingOps++;
    });

    return {
      total: logs.length,
      voidCount,
      inventoryOps,
      purchasingOps,
    };
  }, [logs]);

  // Filter Log
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const meta = getActionMeta(log.action, log.target_table);
      const summary = meta.formatSummary(log.details, log.target_id);
      const q = searchQuery.toLowerCase().trim();

      const matchSearch =
        !q ||
        meta.title.toLowerCase().includes(q) ||
        meta.category.toLowerCase().includes(q) ||
        (log.actor_name && log.actor_name.toLowerCase().includes(q)) ||
        summary.toLowerCase().includes(q);

      if (!matchSearch) return false;

      if (categoryFilter === 'SALES') return meta.categoryKey === 'SALES';
      if (categoryFilter === 'INVENTORY') return meta.categoryKey === 'INVENTORY';
      if (categoryFilter === 'PURCHASING') return meta.categoryKey === 'PURCHASING';
      if (categoryFilter === 'SETTINGS') return meta.categoryKey === 'SETTINGS';

      return true;
    });
  }, [logs, searchQuery, categoryFilter]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 4 TOP KPI CARDS */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))',
          gap: '14px',
        }}
      >
        {/* Card 1: Total Riwayat */}
        <div
          style={{
            background: '#ffffff',
            padding: '16px 18px',
            borderRadius: '12px',
            border: '1px solid #e7e8e3',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#64746b' }}>Total Catatan Aktivitas</span>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: '#f2f4ef',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#57695b',
              }}
            >
              <ShieldCheck size={17} />
            </div>
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#1c2826' }}>
            {metrics.total} <span style={{ fontSize: '13px', fontWeight: 500, color: '#64746b' }}>Kejadian</span>
          </div>
          <div style={{ fontSize: '11px', color: '#8b968f', marginTop: '4px' }}>
            Terekam permanen untuk audit keamanan
          </div>
        </div>

        {/* Card 2: Pembatalan Transaksi */}
        <div
          style={{
            background: '#ffffff',
            padding: '16px 18px',
            borderRadius: '12px',
            border: '1px solid #e7e8e3',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#64746b' }}>Pembatalan Transaksi (Void)</span>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: metrics.voidCount > 0 ? '#fee2e2' : '#f2f4ef',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: metrics.voidCount > 0 ? '#b91c1c' : '#57695b',
              }}
            >
              <AlertTriangle size={17} />
            </div>
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: metrics.voidCount > 0 ? '#b91c1c' : '#1c2826' }}>
            {metrics.voidCount} <span style={{ fontSize: '13px', fontWeight: 500, color: '#64746b' }}>Transaksi</span>
          </div>
          <div style={{ fontSize: '11px', color: metrics.voidCount > 0 ? '#b91c1c' : '#8b968f', marginTop: '4px' }}>
            {metrics.voidCount > 0 ? 'Perlu dipantau secara berkala' : 'Tidak ada transaksi dibatalkan'}
          </div>
        </div>

        {/* Card 3: Aktivitas Stok & Opname */}
        <div
          style={{
            background: '#ffffff',
            padding: '16px 18px',
            borderRadius: '12px',
            border: '1px solid #e7e8e3',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#64746b' }}>Aktivitas Stok & Gudang</span>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: '#f2f4ef',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#57695b',
              }}
            >
              <Boxes size={17} />
            </div>
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#1c2826' }}>
            {metrics.inventoryOps} <span style={{ fontSize: '13px', fontWeight: 500, color: '#64746b' }}>Aktivitas</span>
          </div>
          <div style={{ fontSize: '11px', color: '#8b968f', marginTop: '4px' }}>
            Opname fisik dan pencatatan limbah
          </div>
        </div>

        {/* Card 4: Pengadaan & Pemasok */}
        <div
          style={{
            background: '#ffffff',
            padding: '16px 18px',
            borderRadius: '12px',
            border: '1px solid #e7e8e3',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#64746b' }}>Pengadaan Barang (PO)</span>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: '#f2f4ef',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#57695b',
              }}
            >
              <PackageCheck size={17} />
            </div>
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#1c2826' }}>
            {metrics.purchasingOps} <span style={{ fontSize: '13px', fontWeight: 500, color: '#64746b' }}>Pengadaan</span>
          </div>
          <div style={{ fontSize: '11px', color: '#8b968f', marginTop: '4px' }}>
            Order pembelian & penerimaan barang
          </div>
        </div>
      </div>

      {/* FILTER & PENCARIAN RAMAH PENGGUNA */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          background: '#ffffff',
          padding: '12px 16px',
          borderRadius: '12px',
          border: '1px solid #e7e8e3',
        }}
      >
        {/* Left: Search Box & Category Tabs */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px' }}>
          {/* Kotak Pencarian */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: '#fbfbf9',
              border: '1px solid #dcdfd5',
              borderRadius: '8px',
              padding: '0 10px',
              height: '34px',
              flex: '1 1 180px',
              minWidth: '150px',
            }}
          >
            <Search size={14} color="#71717a" style={{ flexShrink: 0 }} />
            <input
              type="text"
              placeholder="Cari nama staf, aktivitas, bahan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: '12px',
                width: '100%',
                color: '#1c2826',
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{ background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer', padding: 0 }}
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Filter Tab Sederhana */}
          <div style={{ display: 'flex', gap: '4px', background: '#f5f6f2', padding: '3px', borderRadius: '8px' }}>
            {(
              [
                { id: 'ALL', label: 'Semua Aktivitas' },
                { id: 'SALES', label: 'Kasir & Penjualan' },
                { id: 'INVENTORY', label: 'Stok & Gudang' },
                { id: 'PURCHASING', label: 'Pengadaan (PO)' },
                { id: 'SETTINGS', label: 'Menu & Sistem' },
              ] as const
            ).map((tab) => {
              const isSelected = categoryFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setCategoryFilter(tab.id)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    border: 'none',
                    background: isSelected ? '#ffffff' : 'transparent',
                    color: isSelected ? '#1c2826' : '#64746b',
                    fontWeight: isSelected ? 700 : 500,
                    fontSize: '11.5px',
                    cursor: 'pointer',
                    boxShadow: isSelected ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                    transition: 'all 0.1s ease',
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Tombol Segarkan */}
        <button
          onClick={loadLogs}
          disabled={isLoading}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '0 12px',
            height: '34px',
            background: '#fbfbf9',
            border: '1px solid #dcdfd5',
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: 600,
            color: '#4b5563',
            cursor: 'pointer',
          }}
        >
          <RotateCcw size={13} className={isLoading ? 'animate-spin' : ''} />
          <span>Segarkan Data</span>
        </button>
      </div>

      {/* TABEL CATATAN AKTIVITAS (BAHASA MANUSIA) */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e7e8e3',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          overflow: 'hidden',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px', whiteSpace: 'nowrap' }}>
            <thead>
              <tr style={{ background: '#fbfbf9', borderBottom: '1px solid #e7e8e3', color: '#64746b', height: '40px' }}>
                <th style={{ padding: '0 14px', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Waktu & Tanggal
                </th>
                <th style={{ padding: '0 12px', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Pelaksana (Staf)
                </th>
                <th style={{ padding: '0 12px', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Aktivitas yang Terjadi
                </th>
                <th style={{ padding: '0 12px', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Bagian / Kategori
                </th>
                <th style={{ padding: '0 12px', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Rangkuman Kejadian
                </th>
                <th style={{ padding: '0 14px', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'right' }}>
                  Rincian
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} style={{ padding: '36px', textAlign: 'center', color: '#8b968f' }}>
                    Memuat catatan aktivitas kafe...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '40px 16px', textAlign: 'center', color: '#8b968f' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <ShieldCheck size={28} color="#ccd1c4" />
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#4b5563' }}>
                        {searchQuery ? 'Tidak ada catatan aktivitas yang cocok dengan pencarian.' : 'Belum ada catatan aktivitas baru.'}
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#9ca3af' }}>
                        Semua aksi staf, transaksi kasir, dan opname stok akan tercatat otomatis di sini.
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const meta = getActionMeta(log.action, log.target_table);
                  const role = getRoleLabel(log.actor_role);
                  const Icon = meta.icon;
                  const summary = meta.formatSummary(log.details, log.target_id);

                  const dateObj = new Date(log.created_at);
                  const dateStr = dateObj.toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  });
                  const timeStr = dateObj.toLocaleTimeString('id-ID', {
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <tr
                      key={log.id}
                      style={{
                        borderBottom: '1px solid #f0f0eb',
                        height: '46px',
                        transition: 'background 0.1s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#fafbf9')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      {/* 1. Waktu & Tanggal */}
                      <td style={{ padding: '0 14px', verticalAlign: 'middle', color: '#4b5563', fontSize: '11.5px' }}>
                        <div style={{ fontWeight: 600, color: '#1c2826' }}>{dateStr}</div>
                        <div style={{ fontSize: '10.5px', color: '#8b968f' }}>{timeStr} WIB</div>
                      </td>

                      {/* 2. Pelaksana / Staf */}
                      <td style={{ padding: '0 12px', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontWeight: 600, color: '#1c2826' }}>
                            {log.actor_name || 'Sistem Otomatis'}
                          </span>
                          <span
                            style={{
                              fontSize: '9.5px',
                              padding: '1px 5px',
                              borderRadius: '4px',
                              background: role.bg,
                              color: role.color,
                              fontWeight: 700,
                            }}
                          >
                            {role.label}
                          </span>
                        </div>
                      </td>

                      {/* 3. Aktivitas yang Terjadi */}
                      <td style={{ padding: '0 12px', verticalAlign: 'middle' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '3px 8px',
                            borderRadius: '5px',
                            background: meta.bg,
                            color: meta.color,
                            fontWeight: 700,
                            fontSize: '11px',
                          }}
                        >
                          <Icon size={12} />
                          {meta.title}
                        </span>
                      </td>

                      {/* 4. Bagian / Kategori */}
                      <td style={{ padding: '0 12px', verticalAlign: 'middle', color: '#64746b', fontSize: '11.5px' }}>
                        {meta.category}
                      </td>

                      {/* 5. Rangkuman Kejadian (Bahasa Manusia) */}
                      <td style={{ padding: '0 12px', verticalAlign: 'middle', maxWidth: '360px' }}>
                        <div
                          style={{
                            color: '#1c2826',
                            fontSize: '11.5px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={summary}
                        >
                          {summary}
                        </div>
                      </td>

                      {/* 6. Tombol Rincian */}
                      <td style={{ padding: '0 14px', verticalAlign: 'middle', textAlign: 'right' }}>
                        <button
                          onClick={() => {
                            setSelectedLog(log);
                            setViewJsonMode(false);
                          }}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '4px 9px',
                            background: '#f2f5f1',
                            color: '#57695b',
                            border: '1px solid #dce2da',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.1s ease',
                          }}
                        >
                          <Eye size={12} />
                          <span>Rincian</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL RINCIAN AKTIVITAS RAMAH PENGGUNA (BUKAN LAYAR HITAM JSON) */}
      {selectedLog && (() => {
        const meta = getActionMeta(selectedLog.action, selectedLog.target_table);
        const role = getRoleLabel(selectedLog.actor_role);
        const Icon = meta.icon;
        const details = selectedLog.details;

        return (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.45)',
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
                borderRadius: '14px',
                maxWidth: '540px',
                width: '100%',
                maxHeight: '85vh',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 20px 40px rgba(0,0,0,0.18)',
                overflow: 'hidden',
              }}
            >
              {/* Header Modal */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 18px',
                  borderBottom: '1px solid #e7e8e3',
                  background: '#fbfbf9',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: meta.bg,
                      color: meta.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon size={16} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#1c2826', margin: 0 }}>
                      {meta.title}
                    </h3>
                    <div style={{ fontSize: '11px', color: '#64746b', marginTop: '2px' }}>
                      Bagian: {meta.category}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedLog(null)}
                  style={{
                    background: '#f0f0eb',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '5px',
                    cursor: 'pointer',
                    color: '#64746b',
                  }}
                >
                  <X size={16} />
                </button>
              </div>

              {/* Body Modal */}
              <div style={{ padding: '16px 18px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Kartu Informasi Pelaksana */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '10px',
                    background: '#f8f9f6',
                    padding: '12px 14px',
                    borderRadius: '8px',
                    border: '1px solid #e2e5dc',
                  }}
                >
                  <div>
                    <span style={{ fontSize: '10.5px', color: '#71717a', textTransform: 'uppercase', fontWeight: 600 }}>
                      Waktu Kejadian
                    </span>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#1c2826', marginTop: '2px' }}>
                      {new Date(selectedLog.created_at).toLocaleString('id-ID', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}{' '}
                      WIB
                    </div>
                  </div>

                  <div>
                    <span style={{ fontSize: '10.5px', color: '#71717a', textTransform: 'uppercase', fontWeight: 600 }}>
                      Pelaksana / Penanggung Jawab
                    </span>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#1c2826', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span>{selectedLog.actor_name || 'Sistem Otomatis'}</span>
                      <span style={{ fontSize: '9.5px', padding: '1px 5px', borderRadius: '4px', background: role.bg, color: role.color }}>
                        {role.label}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Tampilan Manusia (Default) */}
                {!viewJsonMode ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#1c2826' }}>
                      Rincian Informasi Aktivitas:
                    </div>

                    {/* Jika Stock Opname Array */}
                    {Array.isArray(details) ? (
                      <div style={{ border: '1px solid #e7e8e3', borderRadius: '8px', overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px' }}>
                          <thead>
                            <tr style={{ background: '#fbfbf9', borderBottom: '1px solid #e7e8e3', color: '#64746b' }}>
                              <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 600 }}>Bahan Baku</th>
                              <th style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 600 }}>Stok Sistem</th>
                              <th style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 600 }}>Stok Fisik Riil</th>
                              <th style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 600 }}>Selisih</th>
                            </tr>
                          </thead>
                          <tbody>
                            {details.map((item: any, idx: number) => {
                              const diff = Number(item.difference || 0);
                              return (
                                <tr key={idx} style={{ borderBottom: '1px solid #f0f0eb' }}>
                                  <td style={{ padding: '6px 10px', fontWeight: 600, color: '#1c2826' }}>
                                    {item.name || item.ingredient_name || 'Bahan'}
                                  </td>
                                  <td style={{ padding: '6px 8px', textAlign: 'center', color: '#64746b' }}>
                                    {Number(item.previousStock || 0).toLocaleString('id-ID')} {item.unit}
                                  </td>
                                  <td style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 600, color: '#1c2826' }}>
                                    {Number(item.physicalStock || 0).toLocaleString('id-ID')} {item.unit}
                                  </td>
                                  <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 700, color: diff < 0 ? '#b91c1c' : diff > 0 ? '#15803d' : '#64746b' }}>
                                    {diff > 0 ? `+${diff}` : diff} {item.unit}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : typeof details === 'object' && details !== null ? (
                      /* Jika Object Details */
                      <div
                        style={{
                          background: '#ffffff',
                          border: '1px solid #e7e8e3',
                          borderRadius: '8px',
                          padding: '12px 14px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                        }}
                      >
                        {/* 1. Alasan / Keterangan Khusus (Jika ada) */}
                        {details.reason && (
                          <div style={{ background: '#fef2f2', padding: '8px 10px', borderRadius: '6px', border: '1px solid #fecaca', fontSize: '11.5px', color: '#991b1b' }}>
                            <strong>Alasan Tercatat:</strong> &quot;{details.reason}&quot;
                          </div>
                        )}

                        {/* 2. Daftar Pasangan Keterangan Ramah */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '6px', fontSize: '12px' }}>
                          {details.orderNumber && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f0f0eb', paddingBottom: '4px' }}>
                              <span style={{ color: '#64746b' }}>Nomor Pesanan:</span>
                              <strong style={{ color: '#1c2826', fontFamily: 'monospace' }}>{details.orderNumber}</strong>
                            </div>
                          )}
                          {details.totalAmount !== undefined && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f0f0eb', paddingBottom: '4px' }}>
                              <span style={{ color: '#64746b' }}>Nominal Transaksi:</span>
                              <strong style={{ color: '#1c2826' }}>Rp {Number(details.totalAmount).toLocaleString('id-ID')}</strong>
                            </div>
                          )}
                          {details.authorizedBy && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f0f0eb', paddingBottom: '4px' }}>
                              <span style={{ color: '#64746b' }}>Disetujui Oleh:</span>
                              <strong style={{ color: '#1c2826' }}>{details.authorizedBy}</strong>
                            </div>
                          )}
                          {details.ingredient && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f0f0eb', paddingBottom: '4px' }}>
                              <span style={{ color: '#64746b' }}>Nama Bahan Baku:</span>
                              <strong style={{ color: '#1c2826' }}>{details.ingredient}</strong>
                            </div>
                          )}
                          {details.quantityLost !== undefined && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f0f0eb', paddingBottom: '4px' }}>
                              <span style={{ color: '#64746b' }}>Jumlah Terbuang / Rusak:</span>
                              <strong style={{ color: '#c2410c' }}>
                                {details.quantityLost} {details.unit || ''}
                              </strong>
                            </div>
                          )}
                          {details.estimatedCostLoss !== undefined && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f0f0eb', paddingBottom: '4px' }}>
                              <span style={{ color: '#64746b' }}>Beban Kerugian Biaya:</span>
                              <strong style={{ color: '#b91c1c' }}>
                                Rp {Number(details.estimatedCostLoss).toLocaleString('id-ID')}
                              </strong>
                            </div>
                          )}
                          {details.po_number && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f0f0eb', paddingBottom: '4px' }}>
                              <span style={{ color: '#64746b' }}>Nomor Dokumen PO:</span>
                              <strong style={{ color: '#1c2826', fontFamily: 'monospace' }}>{details.po_number}</strong>
                            </div>
                          )}
                          {details.items_count !== undefined && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f0f0eb', paddingBottom: '4px' }}>
                              <span style={{ color: '#64746b' }}>Total Jenis Bahan:</span>
                              <strong style={{ color: '#1c2826' }}>{details.items_count} Jenis Bahan</strong>
                            </div>
                          )}
                          {details.received_items !== undefined && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f0f0eb', paddingBottom: '4px' }}>
                              <span style={{ color: '#64746b' }}>Bahan Diterima Masuk Stok:</span>
                              <strong style={{ color: '#15803d' }}>{details.received_items} Jenis Bahan</strong>
                            </div>
                          )}
                          {details.total_amount !== undefined && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f0f0eb', paddingBottom: '4px' }}>
                              <span style={{ color: '#64746b' }}>Nilai Total Pengadaan:</span>
                              <strong style={{ color: '#1c2826' }}>Rp {Number(details.total_amount).toLocaleString('id-ID')}</strong>
                            </div>
                          )}
                          {details.store_name && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f0f0eb', paddingBottom: '4px' }}>
                              <span style={{ color: '#64746b' }}>Nama Outlet:</span>
                              <strong style={{ color: '#1c2826' }}>{details.store_name}</strong>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div style={{ color: '#8b968f', fontSize: '11.5px', fontStyle: 'italic', padding: '12px', textAlign: 'center' }}>
                        Tidak ada data tambahan khusus untuk aktivitas ini.
                      </div>
                    )}
                  </div>
                ) : (
                  /* Tampilan Teknis JSON (Hanya jika dibutuhkan tim IT/auditor teknis) */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ fontSize: '11.5px', color: '#64746b' }}>Data Mentah Sistem (Database Payload):</div>
                    <pre
                      style={{
                        background: '#1c2826',
                        color: '#a7f3d0',
                        padding: '12px 14px',
                        borderRadius: '8px',
                        fontSize: '11.5px',
                        overflowX: 'auto',
                        maxHeight: '260px',
                        fontFamily: 'monospace',
                        margin: 0,
                      }}
                    >
                      {JSON.stringify(details, null, 2)}
                    </pre>
                  </div>
                )}
              </div>

              {/* Footer Modal */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 18px',
                  borderTop: '1px solid #e7e8e3',
                  background: '#fbfbf9',
                }}
              >
                <button
                  type="button"
                  onClick={() => setViewJsonMode(!viewJsonMode)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#57695b',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  {viewJsonMode ? 'Tampilkan Mode Ringkasan Ramah' : 'Lihat Data Teknis (JSON)'}
                </button>

                <button
                  onClick={() => setSelectedLog(null)}
                  style={{
                    padding: '6px 16px',
                    background: '#57695b',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
