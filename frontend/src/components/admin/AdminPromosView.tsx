'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { api } from '@/lib/api';
import { Promo } from '@/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { NumberInput } from '@/components/ui/number-input';
import {
  Plus,
  Check,
  X,
  Search,
  RotateCcw,
  Trash2,
  Pencil,
  AlertCircle,
  AlertTriangle,
} from 'lucide-react';

export function AdminPromosView() {
  const [promos, setPromos] = useState<Promo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'RUNNING' | 'EXPIRED' | 'INACTIVE'>('ALL');

  // Modal Tambah / Edit Promo
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<Promo | null>(null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [discountType, setDiscountType] = useState<'PERCENT' | 'FIXED_AMOUNT'>('PERCENT');
  const [discountValue, setDiscountValue] = useState('10');
  const [minSpend, setMinSpend] = useState('50000');
  const [maxDiscount, setMaxDiscount] = useState('20000');
  const [quota, setQuota] = useState('100');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  });
  const [modalError, setModalError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal Konfirmasi Hapus
  const [deletingPromo, setDeletingPromo] = useState<Promo | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Toast Feedback
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const loadPromos = async () => {
    setIsLoading(true);
    try {
      const res = await api.promos.getAdminList();
      if (res.success && res.data) {
        setPromos(res.data);
      }
    } catch (err: any) {
      console.error('Failed to load promos:', err);
      showToast('Gagal memuat daftar voucher promo.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPromos();
  }, []);

  // Operational status calculator
  const getPromoOperationalStatus = (p: Promo) => {
    const today = new Date().toISOString().slice(0, 10);
    const start = String(p.start_date).slice(0, 10);
    const end = String(p.end_date).slice(0, 10);

    if (!p.is_active) {
      return { key: 'INACTIVE', label: 'Dinonaktifkan', color: '#64746b', bg: '#f1f5f9' };
    }
    if (today > end) {
      return { key: 'EXPIRED', label: 'Kedaluwarsa', color: '#b91c1c', bg: '#fee2e2' };
    }
    if (today < start) {
      return { key: 'UPCOMING', label: 'Belum Mulai', color: '#0369a1', bg: '#e0f2fe' };
    }
    if (p.quota !== null && p.quota !== undefined && p.used_count >= p.quota) {
      return { key: 'QUOTA_FULL', label: 'Kuota Habis', color: '#b45309', bg: '#fef3c7' };
    }
    return { key: 'RUNNING', label: 'Aktif Berjalan', color: '#15803d', bg: '#dcfce7' };
  };

  // KPI Calculations
  const metrics = useMemo(() => {
    const total = promos.length;
    let running = 0;
    let totalUsed = 0;
    let expiredOrDepleted = 0;

    promos.forEach((p) => {
      totalUsed += Number(p.used_count || 0);
      const st = getPromoOperationalStatus(p);
      if (st.key === 'RUNNING') {
        running++;
      } else if (st.key === 'EXPIRED' || st.key === 'QUOTA_FULL') {
        expiredOrDepleted++;
      }
    });

    return {
      total,
      running,
      totalUsed,
      expiredOrDepleted,
    };
  }, [promos]);

  // Filtered List
  const filteredPromos = useMemo(() => {
    return promos.filter((p) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        p.code.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q);

      if (!matchSearch) return false;

      const st = getPromoOperationalStatus(p);
      if (statusFilter === 'RUNNING') return st.key === 'RUNNING';
      if (statusFilter === 'EXPIRED') return st.key === 'EXPIRED' || st.key === 'QUOTA_FULL';
      if (statusFilter === 'INACTIVE') return st.key === 'INACTIVE';
      return true;
    });
  }, [promos, searchQuery, statusFilter]);

  // Toggle Active/Inactive
  const handleTogglePromo = async (promo: Promo) => {
    try {
      const newStatus = !promo.is_active;
      const res = await api.promos.toggle(promo.id, newStatus);
      if (res.success) {
        setPromos((prev) =>
          prev.map((p) => (p.id === promo.id ? { ...p, is_active: newStatus } : p))
        );
        showToast(
          `Promo "${promo.name}" (${promo.code}) ${newStatus ? 'diaktifkan' : 'dinonaktifkan'}.`
        );
      }
    } catch (err: any) {
      alert(err.message || 'Gagal mengubah status promo.');
    }
  };

  // Open Modal Tambah
  const openAddModal = () => {
    setEditingPromo(null);
    setCode('');
    setName('');
    setDiscountType('PERCENT');
    setDiscountValue('10');
    setMinSpend('50000');
    setMaxDiscount('20000');
    setQuota('100');
    setStartDate(new Date().toISOString().slice(0, 10));
    const d = new Date();
    d.setDate(d.getDate() + 30);
    setEndDate(d.toISOString().slice(0, 10));
    setModalError('');
    setIsModalOpen(true);
  };

  // Open Modal Edit
  const openEditModal = (p: Promo) => {
    setEditingPromo(p);
    setCode(p.code);
    setName(p.name);
    setDiscountType(p.discount_type);

    const cleanNum = (val: any) => {
      if (val === null || val === undefined || val === '') return '';
      const num = Number(val);
      if (isNaN(num)) return '';
      return num % 1 === 0 ? String(Math.round(num)) : String(num);
    };

    setDiscountValue(cleanNum(p.discount_value));
    setMinSpend(cleanNum(p.min_spend || '0'));
    setMaxDiscount(p.max_discount ? cleanNum(p.max_discount) : '');
    setQuota(p.quota ? cleanNum(p.quota) : '');
    setStartDate(String(p.start_date).slice(0, 10));
    setEndDate(String(p.end_date).slice(0, 10));
    setModalError('');
    setIsModalOpen(true);
  };

  // Handle Save (Create or Update)
  const handleSavePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim() || !discountValue) {
      setModalError('Kode, nama, dan nilai diskon promo wajib diisi.');
      return;
    }

    const val = Number(discountValue);
    if (isNaN(val) || val <= 0) {
      setModalError('Nilai diskon harus lebih dari 0.');
      return;
    }

    if (discountType === 'PERCENT' && val > 100) {
      setModalError('Diskon persentase tidak boleh melebihi 100%.');
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      setModalError('Tanggal mulai tidak boleh melewati tanggal berakhir.');
      return;
    }

    setIsSubmitting(true);
    setModalError('');

    try {
      const payload = {
        code: code.trim().toUpperCase(),
        name: name.trim(),
        discount_type: discountType,
        discount_value: val,
        min_spend: minSpend ? Number(minSpend) : 0,
        max_discount: discountType === 'PERCENT' && maxDiscount ? Number(maxDiscount) : null,
        quota: quota ? parseInt(quota, 10) : null,
        start_date: startDate,
        end_date: endDate,
        ...(editingPromo ? { is_active: editingPromo.is_active } : {}),
      };

      if (editingPromo) {
        const res = await api.promos.update(editingPromo.id, payload);
        if (res.success) {
          showToast(`Promo "${payload.name}" berhasil diperbarui.`);
          setIsModalOpen(false);
          loadPromos();
        }
      } else {
        const res = await api.promos.create(payload);
        if (res.success) {
          showToast(`Promo "${payload.name}" berhasil dibuat.`);
          setIsModalOpen(false);
          loadPromos();
        }
      }
    } catch (err: any) {
      setModalError(err.message || 'Gagal menyimpan voucher promo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Delete
  const handleDeletePromo = async (force = false) => {
    if (!deletingPromo) return;
    setIsDeleting(true);
    setDeleteError('');

    try {
      const res = await api.promos.delete(deletingPromo.id, force);
      if (res.success) {
        showToast(res.message || `Promo "${deletingPromo.name}" berhasil dihapus.`);
        setDeletingPromo(null);
        loadPromos();
      }
    } catch (err: any) {
      setDeleteError(err.message || 'Gagal menghapus voucher promo.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Live simulation text inside modal
  const simulationText = useMemo(() => {
    const val = Number(discountValue) || 0;
    const testAmount = 100000;
    let disc = 0;

    if (discountType === 'PERCENT') {
      disc = (val / 100) * testAmount;
      if (maxDiscount && Number(maxDiscount) > 0) {
        disc = Math.min(disc, Number(maxDiscount));
      }
    } else {
      disc = Math.min(val, testAmount);
    }

    const pay = Math.max(0, testAmount - disc);
    return `Belanja Rp 100.000 hemat Rp ${Math.round(disc).toLocaleString('id-ID')} • Bayar Rp ${Math.round(pay).toLocaleString('id-ID')}`;
  }, [discountType, discountValue, maxDiscount]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '24px',
            zIndex: 99999,
            background: toastMessage.type === 'success' ? '#2e7d32' : '#c62828',
            color: '#ffffff',
            padding: '10px 18px',
            borderRadius: '8px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
            fontSize: '13px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          {toastMessage.type === 'success' ? <Check size={16} /> : <AlertTriangle size={16} />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* 4 TOP KPI CARDS */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))',
          gap: '14px',
        }}
      >
        <div
          style={{
            background: '#ffffff',
            padding: '14px 16px',
            borderRadius: '12px',
            border: '1px solid #e7e8e3',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#71717a', textTransform: 'uppercase' }}>Total Voucher Promo</span>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#1c2826' }}>
            {metrics.total} <span style={{ fontSize: '13px', fontWeight: 500, color: '#64746b' }}>Voucher</span>
          </div>
        </div>

        <div
          style={{
            background: '#ffffff',
            padding: '14px 16px',
            borderRadius: '12px',
            border: '1px solid #e7e8e3',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#71717a', textTransform: 'uppercase' }}>Promo Aktif Berjalan</span>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#15803d' }}>
            {metrics.running} <span style={{ fontSize: '13px', fontWeight: 500, color: '#64746b' }}>Aktif</span>
          </div>
        </div>

        <div
          style={{
            background: '#ffffff',
            padding: '14px 16px',
            borderRadius: '12px',
            border: '1px solid #e7e8e3',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#71717a', textTransform: 'uppercase' }}>Total Penggunaan</span>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#1c2826' }}>
            {metrics.totalUsed} <span style={{ fontSize: '13px', fontWeight: 500, color: '#64746b' }}>Kali</span>
          </div>
        </div>

        <div
          style={{
            background: '#ffffff',
            padding: '14px 16px',
            borderRadius: '12px',
            border: '1px solid #e7e8e3',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#71717a', textTransform: 'uppercase' }}>Kedaluwarsa / Habis</span>
          <div style={{ fontSize: '22px', fontWeight: 800, color: metrics.expiredOrDepleted > 0 ? '#b45309' : '#1c2826' }}>
            {metrics.expiredOrDepleted} <span style={{ fontSize: '13px', fontWeight: 500, color: '#64746b' }}>Promo</span>
          </div>
        </div>
      </div>

      {/* ACTION & FILTER BAR */}
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
        {/* Left: Search & Filter Tabs */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px' }}>
          {/* Search Box */}
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
              placeholder="Cari kode atau nama promo..."
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

          {/* Filter Status Tabs */}
          <div style={{ display: 'flex', gap: '4px', background: '#f5f6f2', padding: '3px', borderRadius: '8px' }}>
            {(
              [
                { id: 'ALL', label: 'Semua' },
                { id: 'RUNNING', label: 'Aktif Berjalan' },
                { id: 'EXPIRED', label: 'Kedaluwarsa' },
                { id: 'INACTIVE', label: 'Nonaktif' },
              ] as const
            ).map((tab) => {
              const isSelected = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
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

        {/* Right: Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={loadPromos}
            disabled={isLoading}
            title="Muat ulang data"
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '8px',
              border: '1px solid #dcdfd5',
              background: '#fbfbf9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#4b5563',
              cursor: 'pointer',
            }}
          >
            <RotateCcw size={14} className={isLoading ? 'animate-spin' : ''} />
          </button>

          <button
            onClick={openAddModal}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0 14px',
              height: '34px',
              background: '#57695b',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '12.5px',
              cursor: 'pointer',
              transition: 'background 0.1s ease',
            }}
          >
            <Plus size={15} />
            <span>Buat Promo Baru</span>
          </button>
        </div>
      </div>

      {/* PROMOS TABLE */}
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
                  Kode Voucher
                </th>
                <th style={{ padding: '0 12px', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Nama Promo
                </th>
                <th style={{ padding: '0 12px', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Skema Diskon
                </th>
                <th style={{ padding: '0 12px', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Min. Belanja
                </th>
                <th style={{ padding: '0 12px', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Kuota / Terpakai
                </th>
                <th style={{ padding: '0 12px', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Masa Berlaku
                </th>
                <th style={{ padding: '0 12px', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Status
                </th>
                <th style={{ padding: '0 14px', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'right' }}>
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} style={{ padding: '36px', textAlign: 'center', color: '#8b968f' }}>
                    Memuat daftar promo...
                  </td>
                </tr>
              ) : filteredPromos.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '40px 16px', textAlign: 'center', color: '#8b968f' }}>
                    <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#4b5563' }}>
                      {searchQuery ? 'Tidak ada voucher promo yang cocok.' : 'Belum ada voucher promo.'}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredPromos.map((p) => {
                  const status = getPromoOperationalStatus(p);
                  const isPercent = p.discount_type === 'PERCENT';
                  const valNum = Number(p.discount_value);
                  const minSpendNum = Number(p.min_spend || 0);
                  const maxDiscNum = p.max_discount ? Number(p.max_discount) : null;

                  const startStr = new Date(p.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
                  const endStr = new Date(p.end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

                  // Quota percentage
                  const quotaNum = p.quota ? Number(p.quota) : null;
                  const usedNum = Number(p.used_count || 0);
                  const isQuotaFull = quotaNum !== null && usedNum >= quotaNum;

                  return (
                    <tr
                      key={p.id}
                      style={{
                        borderBottom: '1px solid #f0f0eb',
                        height: '46px',
                        transition: 'background 0.1s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#fafbf9')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      {/* 1. Kode Promo */}
                      <td style={{ padding: '0 14px', verticalAlign: 'middle' }}>
                        <span
                          style={{
                            fontWeight: 800,
                            color: '#2d4334',
                            fontFamily: 'monospace',
                            fontSize: '12px',
                            background: '#f2f5f1',
                            padding: '3px 7px',
                            borderRadius: '5px',
                            border: '1px solid #dce2da',
                            letterSpacing: '0.04em',
                          }}
                        >
                          {p.code}
                        </span>
                      </td>

                      {/* 2. Nama Promo */}
                      <td style={{ padding: '0 12px', verticalAlign: 'middle' }}>
                        <div style={{ fontWeight: 600, color: '#1c2826' }}>{p.name}</div>
                        <div style={{ fontSize: '10.5px', color: '#8b968f' }}>
                          Dibuat {new Date(p.created_at || p.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                        </div>
                      </td>

                      {/* 3. Skema Diskon */}
                      <td style={{ padding: '0 12px', verticalAlign: 'middle' }}>
                        <div style={{ fontWeight: 700, color: '#1c2826' }}>
                          {isPercent ? `${valNum}%` : `Rp ${valNum.toLocaleString('id-ID')}`}
                        </div>
                        {isPercent && maxDiscNum && (
                          <div style={{ fontSize: '10.5px', color: '#64746b' }}>
                            Maks. Rp {maxDiscNum.toLocaleString('id-ID')}
                          </div>
                        )}
                      </td>

                      {/* 4. Min. Belanja */}
                      <td style={{ padding: '0 12px', verticalAlign: 'middle', color: '#4b5563' }}>
                        {minSpendNum > 0 ? `Rp ${minSpendNum.toLocaleString('id-ID')}` : 'Tanpa Minimum'}
                      </td>

                      {/* 5. Kuota / Terpakai */}
                      <td style={{ padding: '0 12px', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontWeight: 700, color: isQuotaFull ? '#b45309' : '#1c2826' }}>
                            {usedNum}
                          </span>
                          <span style={{ color: '#8b968f' }}>/ {quotaNum !== null ? quotaNum : '∞'}</span>
                          {isQuotaFull && (
                            <span
                              style={{
                                fontSize: '9.5px',
                                padding: '1px 5px',
                                borderRadius: '4px',
                                background: '#fef3c7',
                                color: '#b45309',
                                fontWeight: 700,
                              }}
                            >
                              Habis
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 6. Masa Berlaku */}
                      <td style={{ padding: '0 12px', verticalAlign: 'middle', color: '#4b5563', fontSize: '11.5px' }}>
                        {startStr} – {endStr}
                      </td>

                      {/* 7. Status */}
                      <td style={{ padding: '0 12px', verticalAlign: 'middle' }}>
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: '5px',
                            background: status.bg,
                            color: status.color,
                            fontWeight: 700,
                            fontSize: '11px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <span
                            style={{
                              width: '5px',
                              height: '5px',
                              borderRadius: '50%',
                              background: status.color,
                            }}
                          />
                          {status.label}
                        </span>
                      </td>

                      {/* 8. Aksi */}
                      <td style={{ padding: '0 14px', verticalAlign: 'middle', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          {/* Toggle Button */}
                          <button
                            onClick={() => handleTogglePromo(p)}
                            title={p.is_active ? 'Nonaktifkan Promo' : 'Aktifkan Promo'}
                            style={{
                              padding: '3px 8px',
                              borderRadius: '5px',
                              border: 'none',
                              background: p.is_active ? '#fee2e2' : '#dcfce7',
                              color: p.is_active ? '#b91c1c' : '#15803d',
                              fontWeight: 600,
                              fontSize: '11px',
                              cursor: 'pointer',
                            }}
                          >
                            {p.is_active ? 'Matikan' : 'Aktifkan'}
                          </button>

                          {/* Edit Button */}
                          <button
                            onClick={() => openEditModal(p)}
                            title="Edit Promo"
                            style={{
                              width: '26px',
                              height: '26px',
                              borderRadius: '5px',
                              border: '1px solid #dcdfd5',
                              background: '#fbfbf9',
                              color: '#57695b',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                            }}
                          >
                            <Pencil size={12} />
                          </button>

                          {/* Delete Button */}
                          <button
                            onClick={() => {
                              setDeletingPromo(p);
                              setDeleteError('');
                            }}
                            title="Hapus Promo"
                            style={{
                              width: '26px',
                              height: '26px',
                              borderRadius: '5px',
                              border: '1px solid #fecaca',
                              background: '#fef2f2',
                              color: '#b91c1c',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                            }}
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

      {/* MODAL 1: TAMBAH / EDIT VOUCHER PROMO */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(17, 24, 22, 0.42)',
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
              borderRadius: '12px',
              border: '1px solid #e7e8e3',
              maxWidth: '540px',
              width: '100%',
              maxHeight: '92vh',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 16px 36px rgba(0, 0, 0, 0.14)',
            }}
          >
            {/* Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 18px',
                borderBottom: '1px solid #f0f0eb',
              }}
            >
              <h3 style={{ fontSize: '14.5px', fontWeight: 700, color: '#1c2826', margin: 0 }}>
                {editingPromo ? 'Edit Voucher Promo' : 'Buat Voucher Promo'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  borderRadius: '6px',
                  width: '28px',
                  height: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#71717a',
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Form Content */}
            <form onSubmit={handleSavePromo} style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {modalError && (
                <div
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    color: '#b91c1c',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <AlertCircle size={14} style={{ flexShrink: 0 }} />
                  <span>{modalError}</span>
                </div>
              )}

              {/* Baris 1: Kode & Nama */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                    Kode Voucher <span style={{ color: '#b91c1c' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="TEMUKOPI"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: '1px solid #d1d5db',
                      fontSize: '12.5px',
                      fontFamily: 'monospace',
                      fontWeight: 700,
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                    Nama Promo <span style={{ color: '#b91c1c' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Diskon Ngopi Santai 20%"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
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

              {/* Baris 2: Jenis & Nilai Diskon */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                    Jenis Diskon <span style={{ color: '#b91c1c' }}>*</span>
                  </label>
                  <Select value={discountType} onValueChange={(val) => setDiscountType(val as any)}>
                    <SelectTrigger style={{ width: '100%', height: '36px', background: '#ffffff', borderRadius: '8px', border: '1px solid #d1d5db' }}>
                      <SelectValue placeholder="Pilih Jenis Diskon" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PERCENT">Persentase (%)</SelectItem>
                      <SelectItem value="FIXED_AMOUNT">Potongan Tetap (Rp)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                    Nilai Diskon ({discountType === 'PERCENT' ? '%' : 'Rp'}) <span style={{ color: '#b91c1c' }}>*</span>
                  </label>
                  <NumberInput
                    required
                    placeholder={discountType === 'PERCENT' ? '20' : '15.000'}
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: '1px solid #d1d5db',
                      fontSize: '12.5px',
                      fontWeight: 700,
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              {/* Baris 3: Minimal Belanja & Maksimal Diskon */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                    Minimal Belanja (Rp)
                  </label>
                  <NumberInput
                    placeholder="0 (Tanpa Minimum)"
                    value={minSpend}
                    onChange={(e) => setMinSpend(e.target.value)}
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
                    Maksimal Diskon (Rp) {discountType === 'PERCENT' ? '' : '(Tidak Berlaku)'}
                  </label>
                  <NumberInput
                    disabled={discountType === 'FIXED_AMOUNT'}
                    placeholder={discountType === 'PERCENT' ? 'Kosongkan jika bebas' : '-'}
                    value={discountType === 'PERCENT' ? maxDiscount : ''}
                    onChange={(e) => setMaxDiscount(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: '1px solid #d1d5db',
                      fontSize: '12.5px',
                      background: discountType === 'FIXED_AMOUNT' ? '#f4f5f1' : '#ffffff',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              {/* Baris 4: Kuota & Periode */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr 1.2fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                    Batas Kuota
                  </label>
                  <NumberInput
                    placeholder="∞ (Bebas)"
                    value={quota}
                    onChange={(e) => setQuota(e.target.value)}
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
                    Mulai Berlaku <span style={{ color: '#b91c1c' }}>*</span>
                  </label>
                  <DatePicker
                    value={startDate}
                    onChange={(val) => setStartDate(val)}
                    placeholder="Pilih tanggal mulai..."
                    fullWidth
                    position="top"
                    align="left"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                    Berakhir Pada <span style={{ color: '#b91c1c' }}>*</span>
                  </label>
                  <DatePicker
                    value={endDate}
                    onChange={(val) => setEndDate(val)}
                    placeholder="Pilih tanggal selesai..."
                    fullWidth
                    position="top"
                    align="right"
                  />
                </div>
              </div>

              {/* Rangkuman Simulasi */}
              <div
                style={{
                  background: '#f4f6f2',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid #e2e6de',
                  fontSize: '12px',
                  color: '#47564a',
                  lineHeight: '1.4',
                }}
              >
                <div style={{ wordBreak: 'break-word' }}>
                  <strong style={{ color: '#1c2826' }}>Simulasi: </strong>
                  <span>{simulationText}</span>
                </div>
              </div>

              {/* Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    padding: '6px 14px',
                    background: '#f0f0eb',
                    border: '1px solid #dcdfd5',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#4b5563',
                    cursor: 'pointer',
                  }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    padding: '6px 18px',
                    background: '#57695b',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: isSubmitting ? 'wait' : 'pointer',
                  }}
                >
                  {isSubmitting ? 'Menyimpan...' : editingPromo ? 'Perbarui Promo' : 'Simpan Promo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: KONFIRMASI HAPUS PROMO */}
      {deletingPromo && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(17, 24, 22, 0.42)',
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
              borderRadius: '12px',
              border: '1px solid #e7e8e3',
              maxWidth: '380px',
              width: '100%',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              boxShadow: '0 16px 36px rgba(0, 0, 0, 0.14)',
            }}
          >
            <h4 style={{ margin: 0, fontSize: '14.5px', fontWeight: 700, color: '#1c2826' }}>
              Hapus Voucher Promo?
            </h4>

            {deleteError && (
              <div
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#b91c1c',
                  fontSize: '11.5px',
                }}
              >
                {deleteError}
              </div>
            )}

            <div
              style={{
                background: '#fbfbf9',
                padding: '10px 12px',
                borderRadius: '6px',
                border: '1px solid #e7e8e3',
                fontSize: '12px',
              }}
            >
              <div style={{ fontWeight: 700, color: '#1c2826' }}>{deletingPromo.name}</div>
              <div style={{ color: '#71717a', marginTop: '2px', fontFamily: 'monospace' }}>
                Kode: {deletingPromo.code} • Digunakan: {deletingPromo.used_count || 0} kali
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                disabled={isDeleting}
                onClick={() => setDeletingPromo(null)}
                style={{
                  padding: '6px 14px',
                  background: '#f0f0eb',
                  border: '1px solid #dcdfd5',
                  borderRadius: '6px',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  color: '#4b5563',
                  cursor: 'pointer',
                }}
              >
                Batal
              </button>
              {deleteError ? (
                <button
                  disabled={isDeleting}
                  onClick={() => handleDeletePromo(true)}
                  style={{
                    padding: '6px 14px',
                    background: '#b91c1c',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    cursor: isDeleting ? 'wait' : 'pointer',
                  }}
                >
                  {isDeleting ? 'Menghapus...' : 'Tetap Hapus Paksa'}
                </button>
              ) : (
                <button
                  disabled={isDeleting}
                  onClick={() => handleDeletePromo(false)}
                  style={{
                    padding: '6px 16px',
                    background: '#b91c1c',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    cursor: isDeleting ? 'wait' : 'pointer',
                  }}
                >
                  {isDeleting ? 'Menghapus...' : 'Ya, Hapus'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
