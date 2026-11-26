'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { api } from '@/lib/api';
import { Customer, CustomerStats, CustomerDetail, CustomerTier } from '@/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Users,
  Search,
  Plus,
  RotateCcw,
  Download,
  Award,
  Coins,
  TrendingUp,
  ShoppingBag,
  ExternalLink,
  Pencil,
  Trash2,
  X,
  Check,
  AlertCircle,
  Phone,
  Calendar,
  ChevronRight,
  Clock,
  Sparkles,
  MessageCircle,
} from 'lucide-react';

export function AdminCustomersView() {
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
          bg: '#eef6ef',
          text: '#2d6a4f',
          border: '#c2e0c7',
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
    <div style={{ padding: '24px 32px', maxWidth: '1440px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Toast Alert */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            background: '#1c2826',
            color: '#ffffff',
            padding: '12px 20px',
            borderRadius: '10px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            zIndex: 9999,
            fontSize: '13.5px',
            fontWeight: 600,
            animation: 'fadeIn 0.2s ease',
          }}
        >
          <Sparkles size={16} color="#d4a373" />
          {toastMessage}
        </div>
      )}

      {/* Header Section */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: '#eef6ef',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#2d6a4f',
              }}
            >
              <Users size={20} />
            </div>
            <div>
              <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#1c2826', margin: 0, letterSpacing: '-0.3px' }}>
                Data Pelanggan & CRM
              </h1>
              <p style={{ fontSize: '13px', color: '#71717a', margin: '2px 0 0 0' }}>
                Direktori loyalitas pelanggan, riwayat belanja, dan analisis nilai pelanggan Ruang Temu.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              background: '#ffffff',
              color: '#3f3f46',
              border: '1px solid #e4e4e7',
              borderRadius: '9px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            title="Muat ulang data"
          >
            <RotateCcw size={14} className={isRefreshing ? 'spin' : ''} />
            Segarkan
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              background: '#ffffff',
              color: '#2d6a4f',
              border: '1.5px solid #2d6a4f',
              borderRadius: '9px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            title="Unduh data dalam format file Excel/CSV"
          >
            <Download size={14} />
            Export CSV
          </button>

          <button
            type="button"
            onClick={handleOpenAdd}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 18px',
              background: '#2d6a4f',
              color: '#ffffff',
              border: 'none',
              borderRadius: '9px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(45, 106, 79, 0.25)',
              transition: 'all 0.15s ease',
            }}
          >
            <Plus size={16} />
            Tambah Pelanggan
          </button>
        </div>
      </div>

      {/* KPI Cards (4 Cards) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
        {/* Card 1: Total Pelanggan */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '14px',
            padding: '20px',
            border: '1px solid #e8e8e4',
            boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#71717a' }}>Total Pelanggan</span>
            <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: '#eef6ef', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2d6a4f' }}>
              <Users size={18} />
            </div>
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#1c2826' }}>
            {stats ? stats.totalCustomers.toLocaleString('id-ID') : '...'}
          </div>
          <div style={{ fontSize: '12px', color: '#57695b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e' }} />
            {stats ? `${stats.activeCustomers30d} aktif 30 hari terakhir` : 'Memuat data...'}
          </div>
        </div>

        {/* Card 2: Poin Loyalitas Beredar */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '14px',
            padding: '20px',
            border: '1px solid #e8e8e4',
            boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#71717a' }}>Poin Loyalitas Beredar</span>
            <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#b45309' }}>
              <Coins size={18} />
            </div>
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#1c2826' }}>
            {stats ? stats.totalLoyaltyPoints.toLocaleString('id-ID') : '...'} <span style={{ fontSize: '14px', fontWeight: 600, color: '#a1a1aa' }}>Pts</span>
          </div>
          <div style={{ fontSize: '12px', color: '#71717a', fontWeight: 500 }}>
            {stats ? `Gold: ${stats.tierCounts.GOLD} • Silver: ${stats.tierCounts.SILVER}` : 'Memuat tier...'}
          </div>
        </div>

        {/* Card 3: Total Omzet dari Member */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '14px',
            padding: '20px',
            border: '1px solid #e8e8e4',
            boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#71717a' }}>Total Omzet Pelanggan</span>
            <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a' }}>
              <TrendingUp size={18} />
            </div>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#1c2826' }}>
            {stats ? formatRupiah(stats.totalCustomerRevenue) : '...'}
          </div>
          <div style={{ fontSize: '12px', color: '#71717a', fontWeight: 500 }}>
            {stats ? `Dari ${stats.totalCustomerOrders} transaksi member` : 'Memuat transaksi...'}
          </div>
        </div>

        {/* Card 4: Rata-rata Belanja (AOV) */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '14px',
            padding: '20px',
            border: '1px solid #e8e8e4',
            boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#71717a' }}>Rata-rata Belanja (AOV)</span>
            <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: '#f4f4f5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#52525b' }}>
              <ShoppingBag size={18} />
            </div>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#1c2826' }}>
            {stats ? formatRupiah(stats.averageOrderValue) : '...'}
          </div>
          <div style={{ fontSize: '12px', color: '#71717a', fontWeight: 500 }}>
            Rata-rata per transaksi member
          </div>
        </div>
      </div>

      {/* Filter, Search & Sorting Controls */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '14px',
          padding: '16px 20px',
          border: '1px solid #e8e8e4',
          boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '14px',
        }}
      >
        {/* Search Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1 1 300px', minWidth: '240px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 14px',
              background: '#f8f8f6',
              border: '1px solid #e4e4e7',
              borderRadius: '9px',
              width: '100%',
            }}
          >
            <Search size={16} color="#71717a" />
            <input
              type="text"
              placeholder="Cari nama pelanggan atau nomor WhatsApp..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: '13px',
                width: '100%',
                color: '#1c2826',
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#a1a1aa' }}
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Filter Tier Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          {(['ALL', 'CLASSIC', 'SILVER', 'GOLD', 'PLATINUM'] as const).map((t) => {
            const isActive = tierFilter === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setTierFilter(t)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '7px',
                  border: isActive ? '1px solid #2d6a4f' : '1px solid #e4e4e7',
                  background: isActive ? '#eef6ef' : '#ffffff',
                  color: isActive ? '#2d6a4f' : '#71717a',
                  fontSize: '12px',
                  fontWeight: isActive ? 700 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.12s ease',
                }}
              >
                {t === 'ALL' ? 'Semua Tier' : t.charAt(0) + t.slice(1).toLowerCase()}
              </button>
            );
          })}
        </div>

        {/* Sort By Dropdown (Shadcn UI Select seragam seperti halaman lainnya) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#71717a', whiteSpace: 'nowrap' }}>Urutkan:</span>
          <div style={{ width: '185px' }}>
            <Select value={sortBy} onValueChange={(val: any) => setSortBy(val)}>
              <SelectTrigger style={{ height: '34px', background: '#f7f7f5', fontSize: '12px', fontWeight: 600 }}>
                <SelectValue placeholder="Pilih Urutan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="spent">Belanja Terbanyak</SelectItem>
                <SelectItem value="visits">Kunjungan Terbanyak</SelectItem>
                <SelectItem value="points">Poin Loyalitas Terbanyak</SelectItem>
                <SelectItem value="recent">Kunjungan Terbaru</SelectItem>
                <SelectItem value="newest">Paling Baru Terdaftar</SelectItem>
                <SelectItem value="name">Nama (A-Z)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Main Customers Table */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '14px',
          border: '1px solid #e8e8e4',
          boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
          overflow: 'hidden',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
            <thead>
              <tr style={{ background: '#fcfcfb', borderBottom: '1px solid #e8e8e4' }}>
                <th style={{ padding: '14px 20px', fontSize: '12px', fontWeight: 700, color: '#71717a', textTransform: 'uppercase' }}>
                  Pelanggan
                </th>
                <th style={{ padding: '14px 16px', fontSize: '12px', fontWeight: 700, color: '#71717a', textTransform: 'uppercase' }}>
                  Tier Member
                </th>
                <th style={{ padding: '14px 16px', fontSize: '12px', fontWeight: 700, color: '#71717a', textTransform: 'uppercase' }}>
                  Poin Loyalitas
                </th>
                <th style={{ padding: '14px 16px', fontSize: '12px', fontWeight: 700, color: '#71717a', textTransform: 'uppercase' }}>
                  Frekuensi Belanja
                </th>
                <th style={{ padding: '14px 16px', fontSize: '12px', fontWeight: 700, color: '#71717a', textTransform: 'uppercase' }}>
                  Total Kontribusi
                </th>
                <th style={{ padding: '14px 16px', fontSize: '12px', fontWeight: 700, color: '#71717a', textTransform: 'uppercase' }}>
                  Kunjungan Terakhir
                </th>
                <th style={{ padding: '14px 20px', fontSize: '12px', fontWeight: 700, color: '#71717a', textTransform: 'uppercase', textAlign: 'right' }}>
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} style={{ padding: '48px', textAlign: 'center', color: '#71717a' }}>
                    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <RotateCcw size={24} className="spin" color="#2d6a4f" />
                      <span style={{ fontSize: '13px', fontWeight: 600 }}>Memuat daftar pelanggan...</span>
                    </div>
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '56px 20px', textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '50%',
                          background: '#f4f4f5',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#a1a1aa',
                        }}
                      >
                        <Users size={24} />
                      </div>
                      <span style={{ fontSize: '15px', fontWeight: 700, color: '#1c2826' }}>
                        Tidak Ada Pelanggan Ditemukan
                      </span>
                      <p style={{ fontSize: '13px', color: '#71717a', margin: 0, maxWidth: '360px' }}>
                        {searchQuery || tierFilter !== 'ALL'
                          ? 'Coba sesuaikan kata kunci pencarian atau filter tier Anda.'
                          : 'Belum ada data pelanggan yang terdaftar. Klik tombol Tambah Pelanggan di atas untuk mulai mencatat member.'}
                      </p>
                      {(!searchQuery && tierFilter === 'ALL') && (
                        <button
                          type="button"
                          onClick={handleOpenAdd}
                          style={{
                            marginTop: '8px',
                            padding: '8px 16px',
                            background: '#2d6a4f',
                            color: '#ffffff',
                            borderRadius: '8px',
                            border: 'none',
                            fontSize: '12.5px',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          + Tambah Pelanggan Pertama
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
                        borderBottom: '1px solid #f4f4f5',
                        background: isSelected ? '#f7faf7' : 'transparent',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) e.currentTarget.style.backgroundColor = '#fafafa';
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      {/* Customer Info */}
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div
                            style={{
                              width: '38px',
                              height: '38px',
                              borderRadius: '50%',
                              background: '#eef6ef',
                              color: '#2d6a4f',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 800,
                              fontSize: '13px',
                              flexShrink: 0,
                            }}
                          >
                            {getInitials(c.name)}
                          </div>
                          <div>
                            <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#1c2826' }}>
                              {c.name}
                            </div>
                            <div style={{ fontSize: '12px', color: '#71717a', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                              <Phone size={11} />
                              {c.phone_number}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Tier */}
                      <td style={{ padding: '14px 16px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 9px',
                            borderRadius: '6px',
                            fontSize: '11.5px',
                            fontWeight: 700,
                            background: badge.bg,
                            color: badge.text,
                            border: `1px solid ${badge.border}`,
                          }}
                        >
                          <Award size={12} />
                          {badge.label}
                        </span>
                      </td>

                      {/* Loyalty Points */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <Coins size={14} color="#b45309" />
                          <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#1c2826' }}>
                            {c.loyalty_points.toLocaleString('id-ID')}
                          </span>
                          <span style={{ fontSize: '11px', color: '#a1a1aa' }}>pts</span>
                        </div>
                      </td>

                      {/* Frequency */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#1c2826' }}>
                          {c.total_orders ? `${c.total_orders}x Pesanan` : '0x'}
                        </div>
                        <span style={{ fontSize: '11px', color: '#71717a' }}>Transaksi Lunas</span>
                      </td>

                      {/* Total Spent */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#2d6a4f' }}>
                          {formatRupiah(c.total_spent)}
                        </div>
                        <span style={{ fontSize: '11px', color: '#71717a' }}>Akumulasi Belanja</span>
                      </td>

                      {/* Last Visit */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#1c2826' }}>
                          {formatDate(c.last_visit)}
                        </div>
                        <span style={{ fontSize: '11px', color: '#a1a1aa' }}>
                          Gabung: {new Date(c.created_at).toLocaleDateString('id-ID')}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          {/* WhatsApp Chat Button */}
                          <a
                            href={getWhatsAppLink(c.phone_number, c.name)}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '32px',
                              height: '32px',
                              borderRadius: '7px',
                              background: '#f0fdf4',
                              color: '#16a34a',
                              border: '1px solid #bbf7d0',
                              cursor: 'pointer',
                              textDecoration: 'none',
                            }}
                            title={`Kirim pesan WhatsApp ke ${c.name}`}
                          >
                            <MessageCircle size={15} />
                          </a>

                          {/* Detail Button */}
                          <button
                            type="button"
                            onClick={() => handleOpenDetail(c)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '6px 12px',
                              background: '#eef6ef',
                              color: '#2d6a4f',
                              border: '1px solid #c2e0c7',
                              borderRadius: '7px',
                              fontSize: '12px',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                            title="Lihat riwayat transaksi belanja"
                          >
                            Riwayat
                            <ChevronRight size={14} />
                          </button>

                          {/* Edit Button */}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(c)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '32px',
                              height: '32px',
                              borderRadius: '7px',
                              background: '#f4f4f5',
                              color: '#52525b',
                              border: '1px solid #e4e4e7',
                              cursor: 'pointer',
                            }}
                            title="Edit data pelanggan"
                          >
                            <Pencil size={14} />
                          </button>

                          {/* Delete Button */}
                          <button
                            type="button"
                            onClick={() => setDeletingCustomer(c)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '32px',
                              height: '32px',
                              borderRadius: '7px',
                              background: '#fef2f2',
                              color: '#dc2626',
                              border: '1px solid #fecaca',
                              cursor: 'pointer',
                            }}
                            title="Hapus pelanggan"
                          >
                            <Trash2 size={14} />
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

      {/* Drawer / Modal Detail Pelanggan & Riwayat Transaksi */}
      {(selectedCustomer || isLoadingDetail) && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.45)',
            display: 'flex',
            justifyContent: 'flex-end',
            zIndex: 1000,
            backdropFilter: 'blur(3px)',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedCustomer(null);
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '560px',
              height: '100%',
              background: '#ffffff',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '-8px 0 32px rgba(0, 0, 0, 0.15)',
              animation: 'slideInRight 0.25s ease',
            }}
          >
            {/* Drawer Header */}
            <div
              style={{
                padding: '20px 24px',
                borderBottom: '1px solid #e8e8e4',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: '#fafafa',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <ShoppingBag size={20} color="#2d6a4f" />
                <span style={{ fontSize: '16px', fontWeight: 800, color: '#1c2826' }}>
                  Profil & Riwayat Transaksi
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  color: '#71717a',
                  padding: '4px',
                  borderRadius: '6px',
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Drawer Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {isLoadingDetail || !selectedCustomer ? (
                <div style={{ padding: '60px', textAlign: 'center', color: '#71717a' }}>
                  <RotateCcw size={28} className="spin" color="#2d6a4f" />
                  <p style={{ marginTop: '12px', fontSize: '13px', fontWeight: 600 }}>Memuat riwayat transaksi...</p>
                </div>
              ) : (
                <>
                  {/* Customer Identity Card */}
                  <div
                    style={{
                      background: '#f8f8f6',
                      borderRadius: '12px',
                      padding: '16px',
                      border: '1px solid #e8e8e4',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div
                          style={{
                            width: '46px',
                            height: '46px',
                            borderRadius: '50%',
                            background: '#2d6a4f',
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: '16px',
                          }}
                        >
                          {getInitials(selectedCustomer.name)}
                        </div>
                        <div>
                          <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#1c2826', margin: 0 }}>
                            {selectedCustomer.name}
                          </h2>
                          <span style={{ fontSize: '12.5px', color: '#71717a', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                            <Phone size={12} /> {selectedCustomer.phone_number}
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

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', paddingTop: '8px', borderTop: '1px solid #e8e8e4' }}>
                      <div>
                        <span style={{ fontSize: '11px', color: '#71717a' }}>Poin Reward</span>
                        <div style={{ fontSize: '14px', fontWeight: 800, color: '#b45309', marginTop: '2px' }}>
                          ⭐ {selectedCustomer.loyalty_points} pts
                        </div>
                      </div>
                      <div>
                        <span style={{ fontSize: '11px', color: '#71717a' }}>Total Pesanan</span>
                        <div style={{ fontSize: '14px', fontWeight: 800, color: '#1c2826', marginTop: '2px' }}>
                          {selectedCustomer.total_orders || 0}x
                        </div>
                      </div>
                      <div>
                        <span style={{ fontSize: '11px', color: '#71717a' }}>Total Belanja</span>
                        <div style={{ fontSize: '14px', fontWeight: 800, color: '#2d6a4f', marginTop: '2px' }}>
                          {formatRupiah(selectedCustomer.total_spent)}
                        </div>
                      </div>
                    </div>

                    {/* WhatsApp Fast Contact */}
                    <div style={{ paddingTop: '6px' }}>
                      <a
                        href={getWhatsAppLink(selectedCustomer.phone_number, selectedCustomer.name)}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
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
                        <MessageCircle size={14} />
                        Kirim Pesan Promo / Sapaan WhatsApp
                      </a>
                    </div>
                  </div>

                  {/* Order History Timeline */}
                  <div>
                    <h3 style={{ fontSize: '14px', fontWeight: 800, color: '#1c2826', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Clock size={16} color="#71717a" />
                      Riwayat Transaksi Terakhir ({selectedCustomer.recentOrders?.length || 0})
                    </h3>

                    {!selectedCustomer.recentOrders || selectedCustomer.recentOrders.length === 0 ? (
                      <div style={{ padding: '32px', textAlign: 'center', background: '#fafafa', borderRadius: '10px', color: '#71717a' }}>
                        <ShoppingBag size={24} style={{ margin: '0 auto 8px', color: '#a1a1aa' }} />
                        <div style={{ fontSize: '13px', fontWeight: 600 }}>Belum ada riwayat pesanan</div>
                        <span style={{ fontSize: '11.5px', color: '#a1a1aa' }}>
                          Pesanan kasir yang terhubung dengan pelanggan ini akan muncul di sini.
                        </span>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {selectedCustomer.recentOrders.map((ord) => (
                          <div
                            key={ord.id}
                            style={{
                              background: '#ffffff',
                              border: '1px solid #e8e8e4',
                              borderRadius: '10px',
                              padding: '14px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '10px',
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
                                <span style={{ fontSize: '13.5px', fontWeight: 800, color: '#2d6a4f' }}>
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
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px',
            backdropFilter: 'blur(3px)',
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
              maxWidth: '460px',
              background: '#ffffff',
              borderRadius: '16px',
              padding: '24px',
              boxShadow: '0 12px 36px rgba(0, 0, 0, 0.2)',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#eef6ef', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2d6a4f' }}>
                  {editingCustomer ? <Pencil size={18} /> : <Plus size={18} />}
                </div>
                <div>
                  <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#1c2826', margin: 0 }}>
                    {editingCustomer ? 'Edit Data Pelanggan' : 'Daftarkan Pelanggan Baru'}
                  </h2>
                  <span style={{ fontSize: '12px', color: '#71717a' }}>
                    {editingCustomer ? 'Perbarui informasi profil dan tier member' : 'Catat profil member baru Ruang Temu'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingCustomer(null);
                }}
                disabled={isSubmitting}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#71717a' }}
              >
                <X size={20} />
              </button>
            </div>

            {formError && (
              <div
                style={{
                  padding: '10px 14px',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '8px',
                  color: '#dc2626',
                  fontSize: '12.5px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <AlertCircle size={16} />
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmitForm} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Nama */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#3f3f46' }}>
                  Nama Lengkap Pelanggan *
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Dimas Anggara"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
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

              {/* No WhatsApp / Telepon */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#3f3f46' }}>
                  Nomor WhatsApp / Telepon *
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="tel"
                    placeholder="Contoh: 081234567890"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    required
                    style={{
                      padding: '9px 14px',
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
                <span style={{ fontSize: '11px', color: '#71717a' }}>
                  Gunakan nomor WhatsApp aktif untuk kemudahan pengiriman struk digital & promo.
                </span>
              </div>

              {/* Tier & Poin */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#3f3f46' }}>
                    Tier Keanggotaan
                  </label>
                  <Select value={formTier} onValueChange={(val: any) => setFormTier(val)}>
                    <SelectTrigger style={{ width: '100%', height: '38px', background: '#ffffff', borderRadius: '8px', border: '1px solid #e4e4e7', fontSize: '13px', fontWeight: 600 }}>
                      <SelectValue placeholder="Pilih Tier" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CLASSIC">Classic (Standar)</SelectItem>
                      <SelectItem value="SILVER">Silver</SelectItem>
                      <SelectItem value="GOLD">Gold</SelectItem>
                      <SelectItem value="PLATINUM">Platinum</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#3f3f46' }}>
                    Poin Loyalitas
                  </label>
                  <input
                    type="number"
                    min={0}
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
                    padding: '8px 20px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#2d6a4f',
                    fontSize: '13px',
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
                    <>
                      <Check size={16} />
                      {editingCustomer ? 'Perbarui Data' : 'Simpan Pelanggan'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus Pelanggan */}
      {deletingCustomer && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px',
            backdropFilter: 'blur(3px)',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !isDeleting) setDeletingCustomer(null);
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '420px',
              background: '#ffffff',
              borderRadius: '16px',
              padding: '24px',
              boxShadow: '0 12px 36px rgba(0, 0, 0, 0.2)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: '#fef2f2',
                color: '#dc2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto',
              }}
            >
              <Trash2 size={24} />
            </div>

            <div>
              <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#1c2826', margin: 0 }}>
                Hapus Data Pelanggan?
              </h2>
              <p style={{ fontSize: '13px', color: '#71717a', margin: '6px 0 0 0', lineHeight: 1.5 }}>
                Apakah Anda yakin ingin menghapus data <strong>{deletingCustomer.name}</strong> ({deletingCustomer.phone_number})?
                Riwayat transaksi masa lalu tetap tersimpan secara aman dalam rekap keuangan.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginTop: '6px' }}>
              <button
                type="button"
                onClick={() => setDeletingCustomer(null)}
                disabled={isDeleting}
                style={{
                  padding: '9px 18px',
                  borderRadius: '8px',
                  border: '1px solid #e4e4e7',
                  background: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#71717a',
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
                  padding: '9px 18px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#dc2626',
                  fontSize: '13px',
                  fontWeight: 700,
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
