'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Customer, CustomerStats, CustomerDetail, CustomerTier } from '@/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { NumberInput } from '@/components/ui/number-input';
import {
  Search,
  Plus,
  RotateCcw,
  Pencil,
  Trash2,
  X,
  AlertCircle,
  MessageCircle,
} from 'lucide-react';

export function AdminCustomersView() {
  const { user } = useAuth();
  const canDeleteCustomer = user?.role === 'OWNER';
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stats, setStats] = useState<CustomerStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Search & Filter & Sort state
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState<'ALL' | CustomerTier>('ALL');
  const [sortBy, setSortBy] = useState<'spent' | 'visits' | 'points' | 'recent' | 'newest' | 'name'>('spent');

  // Detail Modal / Drawer state
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // Add / Edit Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formTier, setFormTier] = useState<CustomerTier>('CLASSIC');
  const [formPoints, setFormPoints] = useState<number>(0);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete Confirmation state
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Toast notification
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  // Load Data
  const loadData = useCallback(async (quiet = false) => {
    if (!quiet) setIsLoading(true);
    try {
      const [custRes, statsRes] = await Promise.all([
        api.customers.getAll({
          search: searchQuery,
          tier: tierFilter,
          sortBy: sortBy,
        }),
        api.customers.getStats(),
      ]);

      if (custRes.success) {
        setCustomers(custRes.data);
      }
      if (statsRes.success) {
        setStats(statsRes.data);
      }
    } catch (err: any) {
      console.error('Failed to load customers:', err);
      showToast(err.message || 'Gagal memuat data pelanggan');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [searchQuery, tierFilter, sortBy]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadData(true);
  };

  // Open Detail
  const handleOpenDetail = async (customer: Customer) => {
    setIsLoadingDetail(true);
    setSelectedCustomer(null);
    try {
      const res = await api.customers.getById(customer.id);
      if (res.success) {
        setSelectedCustomer(res.data);
      } else {
        showToast('Gagal memuat riwayat transaksi');
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Gagal memuat detail pelanggan');
    } finally {
      setIsLoadingDetail(false);
    }
  };

  // Open Add Modal
  const handleOpenAdd = () => {
    setFormName('');
    setFormPhone('');
    setFormTier('CLASSIC');
    setFormPoints(0);
    setFormError('');
    setIsAddModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormName(customer.name);
    setFormPhone(customer.phone_number);
    setFormTier(customer.tier || 'CLASSIC');
    setFormPoints(customer.loyalty_points || 0);
    setFormError('');
  };

  // Save Add / Edit
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formPhone.trim()) {
      setFormError('Nama dan nomor telepon pelanggan wajib diisi.');
      return;
    }

    const cleanPhone = formPhone.replace(/\D/g, '');
    if (cleanPhone.length < 8 || cleanPhone.length > 15) {
      setFormError('Nomor telepon harus terdiri dari 8 hingga 15 digit angka.');
      return;
    }

    setIsSubmitting(true);
    setFormError('');
    try {
      if (editingCustomer) {
        const res = await api.customers.update(editingCustomer.id, {
          name: formName.trim(),
          phoneNumber: cleanPhone,
          tier: formTier,
          loyaltyPoints: formPoints,
        });
        if (res.success) {
          showToast(`Pelanggan "${formName}" berhasil diperbarui!`);
          setEditingCustomer(null);
          loadData(true);
          if (selectedCustomer && selectedCustomer.id === editingCustomer.id) {
            handleOpenDetail(res.data);
          }
        }
      } else {
        const res = await api.customers.create({
          name: formName.trim(),
          phoneNumber: cleanPhone,
          tier: formTier,
          loyaltyPoints: formPoints,
        });
        if (res.success) {
          showToast(`Pelanggan "${formName}" berhasil didaftarkan!`);
          setIsAddModalOpen(false);
          loadData(true);
        }
      }
    } catch (err: any) {
      setFormError(err.message || 'Terjadi kesalahan saat menyimpan data');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Customer
  const handleDeleteCustomer = async () => {
    if (!deletingCustomer) return;
    setIsDeleting(true);
    try {
      const res = await api.customers.delete(deletingCustomer.id);
      if (res.success) {
        showToast(res.message || 'Pelanggan berhasil dihapus');
        if (selectedCustomer?.id === deletingCustomer.id) {
          setSelectedCustomer(null);
        }
        setDeletingCustomer(null);
        loadData(true);
      }
    } catch (err: any) {
      showToast(err.message || 'Gagal menghapus data pelanggan');
    } finally {
      setIsDeleting(false);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (customers.length === 0) {
      showToast('Tidak ada data pelanggan untuk diekspor.');
      return;
    }

    const headers = ['ID', 'Nama', 'Nomor Telepon', 'Tier', 'Poin Loyalitas', 'Total Pesanan', 'Total Belanja (Rp)', 'Kunjungan Terakhir', 'Terdaftar Pada'];
    const rows = customers.map((c) => [
      c.id,
      `"${c.name.replace(/"/g, '""')}"`,
      `"${c.phone_number}"`,
      c.tier,
      c.loyalty_points,
      c.total_orders || 0,
      Number(c.total_spent) || 0,
      c.last_visit ? new Date(c.last_visit).toLocaleString('id-ID') : 'Belum Pernah',
      new Date(c.created_at).toLocaleString('id-ID'),
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
    link.setAttribute('download', `ruang_temu_pelanggan_${today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Data pelanggan berhasil diunduh dalam format CSV!');
  };

  // Helpers
  const formatRupiah = (val: number | string | undefined) => {
    const num = Number(val) || 0;
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return 'Belum Pernah';
    try {
      const date = new Date(dateStr);
      return new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date);
    } catch {
      return dateStr;
    }
  };

  const getTierBadge = (tier: string) => {
    switch (tier?.toUpperCase()) {
      case 'PLATINUM':
        return {
          bg: '#faf5ff',
          text: '#7e22ce',
          border: '#e9d5ff',
          label: 'Platinum',
          glow: 'rgba(126, 34, 206, 0.1)',
        };
      case 'GOLD':
        return {
          bg: '#fffbeb',
          text: '#b45309',
          border: '#fde68a',
          label: 'Gold',
          glow: 'rgba(180, 83, 9, 0.1)',
        };
      case 'SILVER':
        return {
          bg: '#f1f5f9',
          text: '#475569',
          border: '#cbd5e1',
          label: 'Silver',
          glow: 'transparent',
        };
      default:
        return {
          bg: '#f2f4ef',
          text: '#57695b',
          border: '#dcdfd5',
          label: 'Classic',
          glow: 'transparent',
        };
    }
  };

  const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return (name.substring(0, 2) || 'RT').toUpperCase();
  };

  const getWhatsAppLink = (phone: string, customerName: string) => {
    let clean = phone.replace(/\D/g, '');
    if (clean.startsWith('0')) {
      clean = '62' + clean.slice(1);
    }
    const message = encodeURIComponent(`Halo Kak ${customerName}, terima kasih telah menjadi pelanggan setia Ruang Temu! ☕`);
    return `https://wa.me/${clean}?text=${message}`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Toast Alert */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '24px',
            background: '#1c2826',
            color: '#ffffff',
            padding: '10px 16px',
            borderRadius: '8px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
            zIndex: 99999,
            fontSize: '12.5px',
            fontWeight: 600,
          }}
        >
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 4 KPI Cards Minimalis */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 190px), 1fr))', gap: '12px' }}>
        <div
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '14px 16px',
            border: '1px solid #e7e8e3',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#71717a', textTransform: 'uppercase' }}>Total Pelanggan</span>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#1c2826' }}>
            {stats ? stats.totalCustomers.toLocaleString('id-ID') : '—'}
          </div>
        </div>

        <div
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '14px 16px',
            border: '1px solid #e7e8e3',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#71717a', textTransform: 'uppercase' }}>Total Poin</span>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#1c2826' }}>
            {stats ? stats.totalLoyaltyPoints.toLocaleString('id-ID') : '—'}
          </div>
        </div>

        <div
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '14px 16px',
            border: '1px solid #e7e8e3',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#71717a', textTransform: 'uppercase' }}>Omzet Member</span>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#15803d' }}>
            {stats ? formatRupiah(stats.totalCustomerRevenue) : '—'}
          </div>
        </div>

        <div
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '14px 16px',
            border: '1px solid #e7e8e3',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#71717a', textTransform: 'uppercase' }}>Rata-rata Belanja</span>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#1c2826' }}>
            {stats ? formatRupiah(stats.averageOrderValue) : '—'}
          </div>
        </div>
      </div>

      {/* Search, Filter & Action Bar */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '10px 14px',
          border: '1px solid #e7e8e3',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 300px', flexWrap: 'wrap' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '0 10px',
                background: '#fbfbf9',
                border: '1px solid #dcdfd5',
                borderRadius: '8px',
                height: '34px',
                flex: '1 1 200px',
                maxWidth: '300px',
                minWidth: '170px',
              }}
            >
              <Search size={14} color="#71717a" style={{ flexShrink: 0 }} />
              <input
                type="text"
                placeholder="Cari nama / WhatsApp..."
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
                  type="button"
                  onClick={() => setSearchQuery('')}
                  style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#9ca3af', padding: 0 }}
                >
                  <X size={13} />
                </button>
              )}
            </div>

            <div style={{ width: '170px' }}>
              <Select value={sortBy} onValueChange={(val: any) => setSortBy(val)}>
                <SelectTrigger style={{ height: '34px', background: '#f7f7f5', fontSize: '12px', fontWeight: 600 }}>
                  <SelectValue placeholder="Urutkan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="spent">Belanja Terbanyak</SelectItem>
                  <SelectItem value="visits">Kunjungan Terbanyak</SelectItem>
                  <SelectItem value="points">Poin Terbanyak</SelectItem>
                  <SelectItem value="recent">Kunjungan Terbaru</SelectItem>
                  <SelectItem value="newest">Terbaru Terdaftar</SelectItem>
                  <SelectItem value="name">Nama (A-Z)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handleExportCSV}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '0 12px',
                height: '34px',
                background: '#f7f7f5',
                color: '#374151',
                border: '1px solid #dcdfd5',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
              title="Ekspor CSV"
            >
              Ekspor CSV
            </button>

            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              title="Muat ulang"
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                border: '1px solid #dcdfd5',
                background: '#fbfbf9',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#4b5563',
                cursor: 'pointer',
              }}
            >
              <RotateCcw size={14} className={isRefreshing ? 'animate-spin' : ''} />
            </button>

            <button
              type="button"
              onClick={handleOpenAdd}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '0 14px',
                height: '34px',
                background: '#57695b',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#46554a')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#57695b')}
            >
              <Plus size={14} />
              Tambah
            </button>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px',
            paddingTop: '8px',
            borderTop: '1px solid #f0f0eb',
          }}
        >
          <div style={{ display: 'flex', gap: '3px', background: '#f5f6f2', padding: '3px', borderRadius: '8px', flexWrap: 'wrap' }}>
            {(['ALL', 'CLASSIC', 'SILVER', 'GOLD', 'PLATINUM'] as const).map((t) => {
              const isActive = tierFilter === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTierFilter(t)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    border: 'none',
                    background: isActive ? '#ffffff' : 'transparent',
                    color: isActive ? '#1c2826' : '#64746b',
                    fontSize: '11.5px',
                    fontWeight: isActive ? 700 : 500,
                    cursor: 'pointer',
                    boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                    transition: 'all 0.1s ease',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {t === 'ALL' ? 'Semua' : t.charAt(0) + t.slice(1).toLowerCase()}
                </button>
              );
            })}
          </div>

          <span style={{ fontSize: '11.5px', color: '#71717a', fontWeight: 500 }}>
            {isLoading ? 'Memuat...' : `${customers.length} data`}
          </span>
        </div>
      </div>

      {/* Main Customers Table */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e7e8e3',
          overflow: 'hidden',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px', whiteSpace: 'nowrap' }}>
            <thead>
              <tr style={{ background: '#fafbf9', borderBottom: '1px solid #e7e8e3', color: '#71717a', height: '40px' }}>
                <th style={{ padding: '0 12px 0 16px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  Pelanggan
                </th>
                <th style={{ padding: '0 12px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  WhatsApp
                </th>
                <th style={{ padding: '0 12px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  Tier
                </th>
                <th style={{ padding: '0 12px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em', textAlign: 'right' }}>
                  Poin
                </th>
                <th style={{ padding: '0 12px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em', textAlign: 'right' }}>
                  Pesanan
                </th>
                <th style={{ padding: '0 12px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em', textAlign: 'right' }}>
                  Total Belanja
                </th>
                <th style={{ padding: '0 12px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  Kunjungan Terakhir
                </th>
                <th style={{ padding: '0 16px 0 12px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em', textAlign: 'right' }}>
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#64746b' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                      <RotateCcw size={16} className="animate-spin" color="#57695b" />
                      <span style={{ fontSize: '12.5px', fontWeight: 600 }}>Memuat data...</span>
                    </div>
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '40px 20px', textAlign: 'center', color: '#64746b', whiteSpace: 'normal' }}>
                    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '12.5px', fontWeight: 600 }}>
                        {searchQuery || tierFilter !== 'ALL' ? 'Pelanggan tidak ditemukan.' : 'Belum ada data pelanggan.'}
                      </span>
                      {(!searchQuery && tierFilter === 'ALL') && (
                        <button
                          type="button"
                          onClick={handleOpenAdd}
                          style={{
                            padding: '6px 12px',
                            background: '#57695b',
                            color: '#ffffff',
                            borderRadius: '8px',
                            border: 'none',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          + Tambah Pelanggan
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                customers.map((c) => {
                  const badge = getTierBadge(c.tier);
                  const isSelected = selectedCustomer?.id === c.id;

                  return (
                    <tr
                      key={c.id}
                      style={{
                        borderBottom: '1px solid #f0f0eb',
                        height: '46px',
                        backgroundColor: isSelected ? '#f4f7f4' : '#ffffff',
                        transition: 'background-color 0.1s ease',
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) e.currentTarget.style.backgroundColor = '#fafbf9';
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) e.currentTarget.style.backgroundColor = '#ffffff';
                      }}
                    >
                      {/* Pelanggan */}
                      <td style={{ padding: '8px 12px 8px 16px', verticalAlign: 'middle' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            style={{
                              width: '26px',
                              height: '26px',
                              borderRadius: '50%',
                              background: '#f2f4ef',
                              color: '#57695b',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '10.5px',
                              flexShrink: 0,
                            }}
                          >
                            {getInitials(c.name)}
                          </span>
                          <span
                            style={{
                              fontWeight: 600,
                              color: '#1c2826',
                              maxWidth: '180px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                            title={c.name}
                          >
                            {c.name}
                          </span>
                        </div>
                      </td>

                      {/* WhatsApp */}
                      <td style={{ padding: '8px 12px', verticalAlign: 'middle', color: '#4b5563', fontVariantNumeric: 'tabular-nums' }}>
                        {c.phone_number}
                      </td>

                      {/* Tier */}
                      <td style={{ padding: '8px 12px', verticalAlign: 'middle' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            borderRadius: '999px',
                            fontSize: '11px',
                            fontWeight: 700,
                            background: badge.bg,
                            color: badge.text,
                            border: `1px solid ${badge.border}`,
                          }}
                        >
                          {badge.label}
                        </span>
                      </td>

                      {/* Poin */}
                      <td style={{ padding: '8px 12px', verticalAlign: 'middle', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        <span style={{ fontWeight: 700, color: '#1c2826' }}>
                          {c.loyalty_points.toLocaleString('id-ID')}
                        </span>{' '}
                        <span style={{ fontSize: '11px', color: '#71717a' }}>pts</span>
                      </td>

                      {/* Pesanan */}
                      <td style={{ padding: '8px 12px', verticalAlign: 'middle', textAlign: 'right', fontWeight: 600, color: '#374151', fontVariantNumeric: 'tabular-nums' }}>
                        {c.total_orders ? `${c.total_orders}x` : '0x'}
                      </td>

                      {/* Total Belanja */}
                      <td style={{ padding: '8px 12px', verticalAlign: 'middle', textAlign: 'right', fontWeight: 700, color: '#15803d', fontVariantNumeric: 'tabular-nums' }}>
                        {formatRupiah(c.total_spent)}
                      </td>

                      {/* Kunjungan Terakhir */}
                      <td
                        style={{ padding: '8px 12px', verticalAlign: 'middle', color: '#52525b' }}
                        title={`Bergabung: ${new Date(c.created_at).toLocaleDateString('id-ID')}`}
                      >
                        {formatDate(c.last_visit)}
                      </td>

                      {/* Aksi */}
                      <td style={{ padding: '8px 16px 8px 12px', verticalAlign: 'middle', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                          <a
                            href={getWhatsAppLink(c.phone_number, c.name)}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '26px',
                              height: '26px',
                              borderRadius: '6px',
                              background: '#f0fdf4',
                              color: '#15803d',
                              border: '1px solid #bbf7d0',
                              cursor: 'pointer',
                              textDecoration: 'none',
                            }}
                            title={`Kirim pesan WhatsApp ke ${c.name}`}
                          >
                            <MessageCircle size={13} />
                          </a>

                          <button
                            type="button"
                            onClick={() => handleOpenDetail(c)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              height: '26px',
                              padding: '0 9px',
                              background: '#f2f4ef',
                              color: '#57695b',
                              border: '1px solid #dcdfd5',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                            title="Lihat riwayat transaksi belanja"
                          >
                            Riwayat
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenEdit(c)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '26px',
                              height: '26px',
                              borderRadius: '6px',
                              background: '#fbfbf9',
                              color: '#57695b',
                              border: '1px solid #dcdfd5',
                              cursor: 'pointer',
                            }}
                            title="Edit data pelanggan"
                          >
                            <Pencil size={12} />
                          </button>

                          {canDeleteCustomer && (
                            <button
                              type="button"
                              onClick={() => setDeletingCustomer(c)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '26px',
                                height: '26px',
                                borderRadius: '6px',
                                background: '#fef2f2',
                                color: '#b91c1c',
                                border: '1px solid #fecaca',
                                cursor: 'pointer',
                              }}
                              title="Hapus pelanggan"
                            >
                              <Trash2 size={12} />
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

      {/* Drawer / Modal Detail Pelanggan & Riwayat Transaksi */}
      {(selectedCustomer || isLoadingDetail) && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(17, 24, 22, 0.42)',
            display: 'flex',
            justifyContent: 'flex-end',
            zIndex: 1000,
            backdropFilter: 'blur(2px)',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedCustomer(null);
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '520px',
              height: '100%',
              background: '#ffffff',
              borderLeft: '1px solid #e7e8e3',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '-8px 0 28px rgba(0, 0, 0, 0.12)',
              animation: 'slideInRight 0.2s ease',
            }}
          >
            {/* Drawer Header */}
            <div
              style={{
                padding: '14px 20px',
                borderBottom: '1px solid #f0f0eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: '#ffffff',
              }}
            >
              <span style={{ fontSize: '14.5px', fontWeight: 700, color: '#1c2826' }}>
                Detail Pelanggan
              </span>
              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  color: '#71717a',
                  width: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Drawer Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {isLoadingDetail || !selectedCustomer ? (
                <div style={{ padding: '60px', textAlign: 'center', color: '#64746b' }}>
                  <RotateCcw size={26} className="animate-spin" color="#57695b" />
                  <p style={{ marginTop: '12px', fontSize: '13px', fontWeight: 600 }}>Memuat riwayat transaksi...</p>
                </div>
              ) : (
                <>
                  {/* Customer Identity Card */}
                  <div
                    style={{
                      background: '#fafaf8',
                      borderRadius: '12px',
                      padding: '16px',
                      border: '1px solid #e7e8e3',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div
                          style={{
                            width: '44px',
                            height: '44px',
                            borderRadius: '50%',
                            background: '#57695b',
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: '15px',
                          }}
                        >
                          {getInitials(selectedCustomer.name)}
                        </div>
                        <div>
                          <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#1c2826', margin: 0 }}>
                            {selectedCustomer.name}
                          </h2>
                          <span style={{ fontSize: '12.5px', color: '#64746b', display: 'block', marginTop: '2px' }}>
                            {selectedCustomer.phone_number}
                          </span>
                        </div>
                      </div>

                      <span
                        style={{
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 700,
                          background: getTierBadge(selectedCustomer.tier).bg,
                          color: getTierBadge(selectedCustomer.tier).text,
                          border: `1px solid ${getTierBadge(selectedCustomer.tier).border}`,
                        }}
                      >
                        {getTierBadge(selectedCustomer.tier).label}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', paddingTop: '8px', borderTop: '1px solid #e7e8e3' }}>
                      <div>
                        <span style={{ fontSize: '11px', color: '#64746b' }}>Poin Reward</span>
                        <div style={{ fontSize: '14px', fontWeight: 800, color: '#b45309', marginTop: '2px' }}>
                          {selectedCustomer.loyalty_points} pts
                        </div>
                      </div>
                      <div>
                        <span style={{ fontSize: '11px', color: '#64746b' }}>Total Pesanan</span>
                        <div style={{ fontSize: '14px', fontWeight: 800, color: '#1c2826', marginTop: '2px' }}>
                          {selectedCustomer.total_orders || 0}x
                        </div>
                      </div>
                      <div>
                        <span style={{ fontSize: '11px', color: '#64746b' }}>Total Belanja</span>
                        <div style={{ fontSize: '14px', fontWeight: 800, color: '#15803d', marginTop: '2px' }}>
                          {formatRupiah(selectedCustomer.total_spent)}
                        </div>
                      </div>
                    </div>

                    <div style={{ paddingTop: '6px' }}>
                      <a
                        href={getWhatsAppLink(selectedCustomer.phone_number, selectedCustomer.name)}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '7px 12px',
                          background: '#f0fdf4',
                          color: '#16a34a',
                          border: '1px solid #bbf7d0',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: 700,
                          textDecoration: 'none',
                        }}
                      >
                        Chat WhatsApp
                      </a>
                    </div>
                  </div>

                  {/* Order History Timeline */}
                  <div>
                    <h3 style={{ fontSize: '13.5px', fontWeight: 800, color: '#1c2826', marginBottom: '12px' }}>
                      Riwayat Transaksi ({selectedCustomer.recentOrders?.length || 0})
                    </h3>

                    {!selectedCustomer.recentOrders || selectedCustomer.recentOrders.length === 0 ? (
                      <div style={{ padding: '24px', textAlign: 'center', background: '#fafafa', borderRadius: '10px', color: '#71717a', fontSize: '12.5px' }}>
                        Belum ada riwayat transaksi.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {selectedCustomer.recentOrders.map((ord) => (
                          <div
                            key={ord.id}
                            style={{
                              background: '#ffffff',
                              border: '1px solid #e8e8e4',
                              borderRadius: '10px',
                              padding: '12px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '8px',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <div>
                                <span style={{ fontSize: '13px', fontWeight: 800, color: '#1c2826' }}>
                                  #{ord.order_number}
                                </span>
                                <div style={{ fontSize: '11px', color: '#71717a', marginTop: '2px' }}>
                                  {formatDate(ord.created_at)} • {ord.order_type === 'DINE_IN' ? `Dine-In (${ord.table_number || 'Meja'})` : 'Takeaway'}
                                </div>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <span style={{ fontSize: '13.5px', fontWeight: 800, color: '#15803d' }}>
                                  {formatRupiah(ord.total_amount)}
                                </span>
                                <div style={{ fontSize: '10.5px', fontWeight: 700, color: ord.status === 'PAID' ? '#16a34a' : '#ea580c' }}>
                                  {ord.status === 'PAID' ? 'Lunas' : ord.status}
                                </div>
                              </div>
                            </div>

                            {/* Item list */}
                            {ord.items && ord.items.length > 0 && (
                              <div style={{ background: '#f8f8f6', borderRadius: '7px', padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {ord.items.map((item, idx) => (
                                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px' }}>
                                    <span style={{ color: '#3f3f46' }}>
                                      {item.quantity}x {item.productName}
                                    </span>
                                    <span style={{ fontWeight: 600, color: '#1c2826' }}>
                                      {formatRupiah(item.subtotal)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Tambah / Edit Pelanggan */}
      {(isAddModalOpen || editingCustomer) && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(17, 24, 22, 0.42)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px',
            backdropFilter: 'blur(2px)',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !isSubmitting) {
              setIsAddModalOpen(false);
              setEditingCustomer(null);
            }
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '440px',
              background: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e7e8e3',
              boxShadow: '0 16px 36px rgba(0, 0, 0, 0.14)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 18px',
                borderBottom: '1px solid #f0f0eb',
              }}
            >
              <h2 style={{ fontSize: '14.5px', fontWeight: 700, color: '#1c2826', margin: 0 }}>
                {editingCustomer ? 'Edit Pelanggan' : 'Tambah Pelanggan'}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingCustomer(null);
                }}
                disabled={isSubmitting}
                style={{
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  color: '#71717a',
                  width: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {formError && (
                <div
                  style={{
                    padding: '9px 12px',
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '8px',
                    color: '#dc2626',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <AlertCircle size={14} />
                  {formError}
                </div>
              )}

              <form onSubmit={handleSubmitForm} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#3f3f46' }}>
                  Nama *
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Dimas Anggara"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                  style={{
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #e4e4e7',
                    fontSize: '13px',
                    outline: 'none',
                    color: '#1c2826',
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#3f3f46' }}>
                  No. WhatsApp *
                </label>
                <input
                  type="tel"
                  placeholder="081234567890"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  required
                  style={{
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #e4e4e7',
                    fontSize: '13px',
                    outline: 'none',
                    width: '100%',
                    boxSizing: 'border-box',
                    color: '#1c2826',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#3f3f46' }}>
                    Tier
                  </label>
                  <Select value={formTier} onValueChange={(val: any) => setFormTier(val)}>
                    <SelectTrigger style={{ width: '100%', height: '38px', background: '#ffffff', borderRadius: '8px', border: '1px solid #e4e4e7', fontSize: '13px', fontWeight: 600 }}>
                      <SelectValue placeholder="Pilih Tier" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CLASSIC">Classic</SelectItem>
                      <SelectItem value="SILVER">Silver</SelectItem>
                      <SelectItem value="GOLD">Gold</SelectItem>
                      <SelectItem value="PLATINUM">Platinum</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#3f3f46' }}>
                    Poin
                  </label>
                  <NumberInput
                    value={formPoints}
                    onChange={(e) => setFormPoints(Math.max(0, parseInt(e.target.value) || 0))}
                    style={{
                      padding: '9px 14px',
                      borderRadius: '8px',
                      border: '1px solid #e4e4e7',
                      fontSize: '13px',
                      outline: 'none',
                      color: '#1c2826',
                    }}
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingCustomer(null);
                  }}
                  disabled={isSubmitting}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: '1px solid #e4e4e7',
                    background: '#ffffff',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#71717a',
                    cursor: 'pointer',
                  }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#57695b',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    color: '#ffffff',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <RotateCcw size={14} className="spin" />
                      Menyimpan...
                    </>
                  ) : (
                    <span>{editingCustomer ? 'Perbarui Data' : 'Simpan Pelanggan'}</span>
                  )}
                </button>
              </div>
            </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus Pelanggan */}
      {deletingCustomer && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(17, 24, 22, 0.42)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px',
            backdropFilter: 'blur(2px)',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !isDeleting) setDeletingCustomer(null);
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '380px',
              background: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e7e8e3',
              padding: '20px',
              boxShadow: '0 16px 36px rgba(0, 0, 0, 0.14)',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              textAlign: 'center',
            }}
          >
            <div>
              <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#1c2826', margin: 0 }}>
                Hapus Pelanggan?
              </h2>
              <p style={{ fontSize: '12.5px', color: '#71717a', margin: '6px 0 0 0', lineHeight: 1.45 }}>
                <strong>{deletingCustomer.name}</strong> ({deletingCustomer.phone_number}) akan dihapus permanen.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setDeletingCustomer(null)}
                disabled={isDeleting}
                style={{
                  height: '36px',
                  padding: '0 14px',
                  borderRadius: '8px',
                  border: '1px solid #dcdfd5',
                  background: '#ffffff',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  color: '#4b5563',
                  cursor: 'pointer',
                  flex: 1,
                }}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteCustomer}
                disabled={isDeleting}
                style={{
                  height: '36px',
                  padding: '0 14px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#dc2626',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  color: '#ffffff',
                  cursor: 'pointer',
                  flex: 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                {isDeleting ? (
                  <>
                    <RotateCcw size={14} className="spin" />
                    Menghapus...
                  </>
                ) : (
                  'Ya, Hapus'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
