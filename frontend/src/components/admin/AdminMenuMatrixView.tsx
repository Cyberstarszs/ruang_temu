'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { api } from '@/lib/api';
import { MenuMatrixItem, MenuMatrixResponse } from '@/types';
import { rupiah } from '@/lib/utils';
import { DateRangePicker, DateRange } from '@/components/ui/date-range-picker';
import {
  TrendingUp,
  RotateCcw,
  HelpCircle,
  Table as TableIcon,
  ScatterChart,
  Search,
  Star,
  Lightbulb,
  Zap,
  AlertTriangle,
  ArrowUpRight,
  Boxes,
  CheckCircle2,
  Calendar,
} from 'lucide-react';

export function AdminMenuMatrixView() {
  const [data, setData] = useState<MenuMatrixResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<MenuMatrixItem | null>(null);
  const [hoveredProduct, setHoveredProduct] = useState<MenuMatrixItem | null>(null);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'BINTANG' | 'POTENSIAL' | 'PEKERJA_KERAS' | 'EVALUASI'>('ALL');
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');

  // Filter Tanggal (Default: 30 Hari Terakhir untuk analisis F&B yang representatif)
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const today = new Date();
    const formatDate = (d: Date) =>
      new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(d);
    const past = new Date(today);
    past.setDate(past.getDate() - 29);
    return { from: formatDate(past), to: formatDate(today) };
  });

  const setQuickRange = (type: 'today' | '7days' | '30days' | 'all') => {
    const today = new Date();
    const formatDate = (d: Date) =>
      new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(d);

    if (type === 'today') {
      const t = formatDate(today);
      setDateRange({ from: t, to: t });
    } else if (type === '7days') {
      const past = new Date(today);
      past.setDate(past.getDate() - 6);
      setDateRange({ from: formatDate(past), to: formatDate(today) });
    } else if (type === '30days') {
      const past = new Date(today);
      past.setDate(past.getDate() - 29);
      setDateRange({ from: formatDate(past), to: formatDate(today) });
    } else if (type === 'all') {
      setDateRange({ from: '', to: '' });
    }
  };

  const isCurrentPreset = (type: 'today' | '7days' | '30days' | 'all') => {
    if (type === 'all') {
      return !dateRange.from && !dateRange.to;
    }
    if (!dateRange.from || !dateRange.to) return false;
    const today = new Date();
    const formatDate = (d: Date) =>
      new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(d);

    if (type === 'today') {
      return dateRange.from === dateRange.to && dateRange.from === formatDate(today);
    }
    if (type === '7days') {
      const past = new Date(today);
      past.setDate(past.getDate() - 6);
      return dateRange.from === formatDate(past) && dateRange.to === formatDate(today);
    }
    if (type === '30days') {
      const past = new Date(today);
      past.setDate(past.getDate() - 29);
      return dateRange.from === formatDate(past) && dateRange.to === formatDate(today);
    }
    return false;
  };

  const fetchMatrix = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const params =
        dateRange.from && dateRange.to
          ? { from: dateRange.from, to: dateRange.to }
          : undefined;
      const res = await api.reports.getMenuMatrix(params);
      if (res.success && res.data) {
        setData(res.data);
        if (res.data.products && res.data.products.length > 0) {
          const star =
            res.data.products.find((p: MenuMatrixItem) => p.quadrant === 'BINTANG') ||
            res.data.products[0];
          setSelectedProduct(star);
        }
      } else {
        setError('Gagal memuat data matriks menu.');
      }
    } catch (err: any) {
      setError(err.message || 'Gagal memuat matriks menu dari backend.');
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchMatrix();
  }, [fetchMatrix]);

  const getQuadrantInfo = (quadrant: string) => {
    switch (quadrant) {
      case 'BINTANG':
        return {
          title: 'Menu Bintang (Star)',
          badge: '#2d6a4f',
          bg: '#eef6ef',
          border: '#c2e0c7',
          dotColor: '#2d6a4f',
          icon: Star,
          desc: 'Menu sangat laris dengan margin keuntungan tinggi. Pertahankan konsistensi rasa, standarisasi takaran, dan kepastian pasokan bahan baku.',
          action: 'Pertahankan Kualitas & Pasokan',
        };
      case 'POTENSIAL':
        return {
          title: 'Menu Potensial (Puzzle)',
          badge: '#d97706',
          bg: '#fff4d6',
          border: '#fed7aa',
          dotColor: '#d97706',
          icon: Lightbulb,
          desc: 'Margin keuntungan sangat tinggi, namun volume penjualan masih rendah. Tingkatkan visibilitas promosi, letakkan di banner utama menu, atau rekomendasikan sebagai Upselling di kasir.',
          action: 'Tingkatkan Promosi & Upselling',
        };
      case 'PEKERJA_KERAS':
        return {
          title: 'Menu Pekerja Keras (Plowhorse)',
          badge: '#2563eb',
          bg: '#eff6ff',
          border: '#bfdbfe',
          dotColor: '#2563eb',
          icon: Zap,
          desc: 'Volume pesanan sangat tinggi tetapi margin tipis. Pertimbangkan sedikit renegosiasi harga bahan baku dengan supplier, optimalkan porsi, atau naikkan harga bertahap 3-5%.',
          action: 'Efisiensi HPP & Naikkan Harga Bertahap',
        };
      case 'EVALUASI':
        return {
          title: 'Menu Evaluasi (Dog)',
          badge: '#a32424',
          bg: '#fde8e8',
          border: '#fecaca',
          dotColor: '#a32424',
          icon: AlertTriangle,
          desc: 'Penjualan rendah dan margin tipis. Pertimbangkan untuk merevisi resep, bundling promo dengan Menu Bintang, atau mengganti menu ini di rotasi musim berikutnya.',
          action: 'Revisi Resep atau Hapus Menu',
        };
      default:
        return {
          title: quadrant,
          badge: '#666',
          bg: '#f3f4f6',
          border: '#e5e7eb',
          dotColor: '#61432c',
          icon: Boxes,
          desc: '',
          action: '-',
        };
    }
  };

  const quadrantCounts = useMemo(() => {
    if (!data?.products) return { ALL: 0, BINTANG: 0, POTENSIAL: 0, PEKERJA_KERAS: 0, EVALUASI: 0 };
    return {
      ALL: data.products.length,
      BINTANG: data.products.filter((p) => p.quadrant === 'BINTANG').length,
      POTENSIAL: data.products.filter((p) => p.quadrant === 'POTENSIAL').length,
      PEKERJA_KERAS: data.products.filter((p) => p.quadrant === 'PEKERJA_KERAS').length,
      EVALUASI: data.products.filter((p) => p.quadrant === 'EVALUASI').length,
    };
  }, [data]);

  const displayedProducts = useMemo(() => {
    if (!data?.products) return [];
    let list = data.products;
    if (activeFilter !== 'ALL') {
      list = list.filter((p) => p.quadrant === activeFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q));
    }
    return list;
  }, [data, activeFilter, searchQuery]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '30px' }}>
      {/* 1. HEADER SECTION (STANDALONE PAGE) */}
      <div
        style={{
          background: '#ffffff',
          padding: '18px 24px',
          borderRadius: '12px',
          border: '1px solid #e7e8e3',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '14px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: '#eef6ef',
                color: '#2d6a4f',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <TrendingUp size={18} />
            </span>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: '18px', fontWeight: 800, color: '#1c2826', margin: 0 }}>
                  Matriks Menu (Menu Engineering — BCG Matrix)
                </h1>
                <span
                  style={{
                    fontSize: '11px',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    background: '#eef6ef',
                    color: '#2d6a4f',
                    border: '1px solid #c2e0c7',
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Calendar size={11} />
                  {dateRange.from && dateRange.to ? `${dateRange.from} s.d. ${dateRange.to}` : 'Semua Waktu'}
                </span>
              </div>
              <p style={{ fontSize: '12.5px', color: '#6b7280', margin: '2px 0 0' }}>
                Analisis strategis portofolio menu kafe: membandingkan volume penjualan riil terhadap margin laba HPP.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls: Date Filters, View Mode & Refresh */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Quick Range Presets - Persis seperti AdminOrdersView */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              type="button"
              onClick={() => setQuickRange('today')}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                border: isCurrentPreset('today') ? '1px solid #57695b' : '1px solid #e2e4dc',
                background: isCurrentPreset('today') ? '#57695b' : '#f7f7f5',
                color: isCurrentPreset('today') ? '#ffffff' : '#4b5563',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.12s ease',
              }}
            >
              Hari Ini
            </button>

            <button
              type="button"
              onClick={() => setQuickRange('7days')}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                border: isCurrentPreset('7days') ? '1px solid #57695b' : '1px solid #e2e4dc',
                background: isCurrentPreset('7days') ? '#57695b' : '#f7f7f5',
                color: isCurrentPreset('7days') ? '#ffffff' : '#4b5563',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.12s ease',
              }}
            >
              7 Hari
            </button>

            <button
              type="button"
              onClick={() => setQuickRange('30days')}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                border: isCurrentPreset('30days') ? '1px solid #57695b' : '1px solid #e2e4dc',
                background: isCurrentPreset('30days') ? '#57695b' : '#f7f7f5',
                color: isCurrentPreset('30days') ? '#ffffff' : '#4b5563',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.12s ease',
              }}
            >
              30 Hari
            </button>

            <button
              type="button"
              onClick={() => setQuickRange('all')}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                border: isCurrentPreset('all') ? '1px solid #57695b' : '1px solid #e2e4dc',
                background: isCurrentPreset('all') ? '#57695b' : '#f7f7f5',
                color: isCurrentPreset('all') ? '#ffffff' : '#4b5563',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.12s ease',
              }}
            >
              Semua
            </button>
          </div>

          <div style={{ width: '1px', height: '22px', background: '#e2e4dc', margin: '0 2px' }} />

          {/* DateRangePicker */}
          <DateRangePicker
            value={dateRange}
            onChange={(r) => setDateRange(r)}
            placeholder="Pilih Tanggal..."
            align="right"
            showApplyButton={false}
          />

          <div style={{ width: '1px', height: '22px', background: '#e2e4dc', margin: '0 2px' }} />

          {/* Switcher Grafik vs Tabel */}
          <div
            style={{
              display: 'flex',
              backgroundColor: '#f1f2ed',
              borderRadius: '8px',
              padding: '3px',
              border: '1px solid #e2e4dc',
            }}
          >
            <button
              type="button"
              onClick={() => setViewMode('chart')}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: 'none',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                backgroundColor: viewMode === 'chart' ? '#ffffff' : 'transparent',
                color: viewMode === 'chart' ? '#1c2826' : '#6b7280',
                boxShadow: viewMode === 'chart' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.12s ease',
              }}
            >
              <ScatterChart size={14} />
              <span>Diagram Sebaran</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: 'none',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                backgroundColor: viewMode === 'table' ? '#ffffff' : 'transparent',
                color: viewMode === 'table' ? '#1c2826' : '#6b7280',
                boxShadow: viewMode === 'table' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.12s ease',
              }}
            >
              <TableIcon size={14} />
              <span>Tabel Rincian</span>
            </button>
          </div>

          <button
            type="button"
            onClick={fetchMatrix}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0 14px',
              background: '#57695b',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '12px',
              cursor: 'pointer',
              height: '36px',
              transition: 'background 0.12s ease',
            }}
            title="Segarkan data analisis matriks"
          >
            <RotateCcw size={13} className={loading ? 'animate-spin' : ''} />
            Perbarui
          </button>
        </div>
      </div>

      {/* 2. 4 KARTU RINGKASAN KUADRAN STRATEGIS */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '14px',
        }}
      >
        {/* Card 1: Bintang */}
        <div
          onClick={() => setActiveFilter('BINTANG')}
          style={{
            background: activeFilter === 'BINTANG' ? '#eef6ef' : '#ffffff',
            padding: '16px 18px',
            borderRadius: '12px',
            border: activeFilter === 'BINTANG' ? '2px solid #2d6a4f' : '1px solid #e7e8e3',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#2d6a4f', textTransform: 'uppercase' }}>
              ⭐ Bintang (Stars)
            </span>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#2d6a4f',
                backgroundColor: '#d8ecdc',
                padding: '2px 8px',
                borderRadius: '999px',
              }}
            >
              {quadrantCounts.BINTANG} Menu
            </span>
          </div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#1c2826' }}>
            Margin Tinggi · Volume Tinggi
          </div>
          <small style={{ fontSize: '11px', color: '#6b7280', display: 'block', marginTop: '4px' }}>
            Menu unggulan utama. Pertahankan kualitas & pasokan bahan baku.
          </small>
        </div>

        {/* Card 2: Potensial */}
        <div
          onClick={() => setActiveFilter('POTENSIAL')}
          style={{
            background: activeFilter === 'POTENSIAL' ? '#fff4d6' : '#ffffff',
            padding: '16px 18px',
            borderRadius: '12px',
            border: activeFilter === 'POTENSIAL' ? '2px solid #d97706' : '1px solid #e7e8e3',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#d97706', textTransform: 'uppercase' }}>
              💡 Potensial (Puzzles)
            </span>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#d97706',
                backgroundColor: '#fed7aa',
                padding: '2px 8px',
                borderRadius: '999px',
              }}
            >
              {quadrantCounts.POTENSIAL} Menu
            </span>
          </div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#1c2826' }}>
            Margin Tinggi · Volume Rendah
          </div>
          <small style={{ fontSize: '11px', color: '#6b7280', display: 'block', marginTop: '4px' }}>
            Untung tebal tapi kurang laku. Tingkatkan promosi & upselling kasir.
          </small>
        </div>

        {/* Card 3: Pekerja Keras */}
        <div
          onClick={() => setActiveFilter('PEKERJA_KERAS')}
          style={{
            background: activeFilter === 'PEKERJA_KERAS' ? '#eff6ff' : '#ffffff',
            padding: '16px 18px',
            borderRadius: '12px',
            border: activeFilter === 'PEKERJA_KERAS' ? '2px solid #2563eb' : '1px solid #e7e8e3',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase' }}>
              ⚡ Pekerja Keras (Plowhorses)
            </span>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#2563eb',
                backgroundColor: '#dbeafe',
                padding: '2px 8px',
                borderRadius: '999px',
              }}
            >
              {quadrantCounts.PEKERJA_KERAS} Menu
            </span>
          </div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#1c2826' }}>
            Margin Tipis · Volume Tinggi
          </div>
          <small style={{ fontSize: '11px', color: '#6b7280', display: 'block', marginTop: '4px' }}>
            Sangat disukai tamu. Tekan HPP, beli bahan grosir, atau naikkan harga bertahap.
          </small>
        </div>

        {/* Card 4: Evaluasi */}
        <div
          onClick={() => setActiveFilter('EVALUASI')}
          style={{
            background: activeFilter === 'EVALUASI' ? '#fde8e8' : '#ffffff',
            padding: '16px 18px',
            borderRadius: '12px',
            border: activeFilter === 'EVALUASI' ? '2px solid #a32424' : '1px solid #e7e8e3',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#a32424', textTransform: 'uppercase' }}>
              ⚠️ Evaluasi (Dogs)
            </span>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#a32424',
                backgroundColor: '#fecaca',
                padding: '2px 8px',
                borderRadius: '999px',
              }}
            >
              {quadrantCounts.EVALUASI} Menu
            </span>
          </div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#1c2826' }}>
            Margin Tipis · Volume Rendah
          </div>
          <small style={{ fontSize: '11px', color: '#6b7280', display: 'block', marginTop: '4px' }}>
            Jarang laku dan keuntungan kecil. Evaluasi resep atau hapus dari menu.
          </small>
        </div>
      </div>

      {/* 3. MAIN SECTION (CHART OR TABLE) */}
      {error && (
        <div style={{ padding: '12px 16px', backgroundColor: '#fde8e8', color: '#a32424', borderRadius: '8px', fontSize: '13px' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '100px 20px', background: '#fff', borderRadius: '12px', border: '1px solid #e7e8e3' }}>
          <TrendingUp size={36} className="text-[#57695b] mx-auto mb-2 opacity-50 animate-pulse" />
          <p style={{ fontSize: '14px', fontWeight: 600, color: '#4b5563' }}>
            Menganalisis matriks menu dan margin HPP dari database transaksi...
          </p>
        </div>
      ) : data ? (
        <>
          {/* Filter Pills & Search Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#4b5563' }}>
                Filter Tampilan:
              </span>
              {[
                { key: 'ALL', label: `Semua Menu (${quadrantCounts.ALL})` },
                { key: 'BINTANG', label: `⭐ Bintang (${quadrantCounts.BINTANG})` },
                { key: 'POTENSIAL', label: `💡 Potensial (${quadrantCounts.POTENSIAL})` },
                { key: 'PEKERJA_KERAS', label: `⚡ Pekerja Keras (${quadrantCounts.PEKERJA_KERAS})` },
                { key: 'EVALUASI', label: `⚠️ Evaluasi (${quadrantCounts.EVALUASI})` },
              ].map((tab) => {
                const isActive = activeFilter === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveFilter(tab.key as any)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '8px',
                      border: isActive ? '1px solid #57695b' : '1px solid #e2e4dc',
                      backgroundColor: isActive ? '#57695b' : '#ffffff',
                      color: isActive ? '#ffffff' : '#4b5563',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.12s ease',
                    }}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Pencarian Menu */}
            <div style={{ position: 'relative', minWidth: '220px' }}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama menu / SKU..."
                style={{
                  width: '100%',
                  padding: '7px 12px 7px 32px',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  fontSize: '12.5px',
                  backgroundColor: '#ffffff',
                  outline: 'none',
                }}
              />
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
            </div>
          </div>

          {/* View Mode: Diagram Sebaran (Chart) */}
          {viewMode === 'chart' ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1.8fr) minmax(320px, 1.2fr)',
                gap: '16px',
                alignItems: 'start',
              }}
            >
              {/* Kolom Kiri: Matriks 4 Kuadran */}
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  height: '480px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #e7e8e3',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  userSelect: 'none',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                }}
              >
                {/* Garis Pembagi Kuadran Sumbu X & Y */}
                <div
                  style={{
                    position: 'absolute',
                    left: '50px',
                    right: '30px',
                    top: '50%',
                    borderTop: '1px dashed #d1d5db',
                    zIndex: 1,
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    top: '30px',
                    bottom: '40px',
                    left: '50%',
                    borderLeft: '1px dashed #d1d5db',
                    zIndex: 1,
                  }}
                />

                {/* Indikator Label Sumbu */}
                <div
                  style={{
                    position: 'absolute',
                    left: '14px',
                    top: '50%',
                    transform: 'translateY(-50%) rotate(-90deg)',
                    fontSize: '10px',
                    fontWeight: 800,
                    letterSpacing: '1px',
                    color: '#9ca3af',
                    zIndex: 2,
                  }}
                >
                  MARGIN LABA (%) →
                </div>
                <div
                  style={{
                    position: 'absolute',
                    bottom: '12px',
                    right: '30px',
                    fontSize: '10px',
                    fontWeight: 800,
                    letterSpacing: '1px',
                    color: '#9ca3af',
                    zIndex: 2,
                  }}
                >
                  VOLUME TERJUAL (POPULARITAS) →
                </div>

                {/* Label 4 Kuadran */}
                <div style={{ position: 'absolute', top: '16px', left: '56px', zIndex: 2 }}>
                  <b style={{ fontSize: '13px', color: '#d97706' }}>💡 Potensial (Puzzle)</b>
                  <small style={{ fontSize: '11px', color: '#6b7280', display: 'block' }}>Margin Tinggi · Volume Rendah</small>
                </div>

                <div style={{ position: 'absolute', top: '16px', right: '30px', textAlign: 'right', zIndex: 2 }}>
                  <b style={{ fontSize: '13px', color: '#2d6a4f' }}>⭐ Bintang (Star)</b>
                  <small style={{ fontSize: '11px', color: '#6b7280', display: 'block' }}>Margin Tinggi · Volume Tinggi</small>
                </div>

                <div style={{ position: 'absolute', bottom: '40px', left: '56px', zIndex: 2 }}>
                  <b style={{ fontSize: '13px', color: '#a32424' }}>⚠️ Evaluasi (Dog)</b>
                  <small style={{ fontSize: '11px', color: '#6b7280', display: 'block' }}>Margin Tipis · Volume Rendah</small>
                </div>

                <div style={{ position: 'absolute', bottom: '40px', right: '30px', textAlign: 'right', zIndex: 2 }}>
                  <b style={{ fontSize: '13px', color: '#2563eb' }}>⚡ Pekerja Keras (Plowhorse)</b>
                  <small style={{ fontSize: '11px', color: '#6b7280', display: 'block' }}>Margin Tipis · Volume Tinggi</small>
                </div>

                {/* Plot Titik Menu */}
                {data.products.map((p) => {
                  const maxQty = Math.max(1, data.benchmarks.maxQuantity);
                  const xPct = 12 + (p.quantity / maxQty) * 74;
                  const yPct = 12 + Math.min(74, Math.max(4, p.margin * 0.8));

                  const isSelected = selectedProduct?.id === p.id;
                  const isHovered = hoveredProduct?.id === p.id;
                  const isFaded = activeFilter !== 'ALL' && p.quadrant !== activeFilter;

                  const qColor =
                    p.quadrant === 'BINTANG'
                      ? '#2d6a4f'
                      : p.quadrant === 'POTENSIAL'
                      ? '#d97706'
                      : p.quadrant === 'PEKERJA_KERAS'
                      ? '#2563eb'
                      : '#a32424';

                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedProduct(p)}
                      onMouseEnter={() => setHoveredProduct(p)}
                      onMouseLeave={() => setHoveredProduct(null)}
                      title={`${p.name}: ${p.quantity} porsi terjual (${p.margin}% margin)`}
                      style={{
                        position: 'absolute',
                        left: `${xPct}%`,
                        bottom: `${yPct}%`,
                        transform: 'translate(-50%, 50%)',
                        width: isSelected ? '34px' : isHovered ? '28px' : '22px',
                        height: isSelected ? '34px' : isHovered ? '28px' : '22px',
                        borderRadius: '50%',
                        backgroundColor: qColor,
                        border: isSelected ? '3px solid #1c2826' : '2px solid #ffffff',
                        boxShadow: isSelected
                          ? '0 0 0 3px rgba(0,0,0,0.2), 0 4px 10px rgba(0,0,0,0.3)'
                          : '0 2px 6px rgba(0,0,0,0.18)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#ffffff',
                        fontSize: isSelected ? '13px' : '10px',
                        fontWeight: 800,
                        zIndex: isSelected ? 20 : isHovered ? 15 : 10,
                        opacity: isFaded ? 0.2 : 1,
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {p.name.charAt(0)}
                    </button>
                  );
                })}
              </div>

              {/* Kolom Kanan: Detail & Rekomendasi Menu Terpilih */}
              <div
                style={{
                  background: '#ffffff',
                  border: '1px solid #e7e8e3',
                  borderRadius: '12px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                }}
              >
                {selectedProduct ? (
                  <>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>
                          {selectedProduct.sku} · {selectedProduct.category}
                        </span>
                        {(() => {
                          const info = getQuadrantInfo(selectedProduct.quadrant);
                          return (
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 700,
                                color: info.badge,
                                backgroundColor: info.bg,
                                border: `1px solid ${info.border}`,
                                padding: '2px 8px',
                                borderRadius: '999px',
                              }}
                            >
                              {info.title}
                            </span>
                          );
                        })()}
                      </div>
                      <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#1c2826', margin: '4px 0 0' }}>
                        {selectedProduct.name}
                      </h3>
                    </div>

                    {/* Metrik Finansial Menu */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '8px',
                        background: '#f8f9fa',
                        padding: '12px',
                        borderRadius: '10px',
                        border: '1px solid #edf0f2',
                      }}
                    >
                      <div>
                        <span style={{ fontSize: '11px', color: '#6b7280' }}>Harga Jual</span>
                        <b style={{ fontSize: '14px', color: '#1c2826', display: 'block', marginTop: '1px' }}>
                          {rupiah(selectedProduct.price)}
                        </b>
                      </div>
                      <div>
                        <span style={{ fontSize: '11px', color: '#6b7280' }}>HPP Bahan Baku</span>
                        <b style={{ fontSize: '14px', color: '#b91c1c', display: 'block', marginTop: '1px' }}>
                          {rupiah(selectedProduct.cost)}
                        </b>
                      </div>
                      <div>
                        <span style={{ fontSize: '11px', color: '#6b7280' }}>Margin Laba</span>
                        <b style={{ fontSize: '15px', color: '#2d6a4f', display: 'block', marginTop: '1px' }}>
                          {selectedProduct.margin}%
                        </b>
                      </div>
                      <div>
                        <span style={{ fontSize: '11px', color: '#6b7280' }}>Terjual</span>
                        <b style={{ fontSize: '14px', color: '#1c2826', display: 'block', marginTop: '1px' }}>
                          {selectedProduct.quantity} porsi
                        </b>
                      </div>
                    </div>

                    {/* Total Pendapatan Menu */}
                    <div
                      style={{
                        padding: '10px 12px',
                        backgroundColor: '#f3f6f3',
                        border: '1px solid #d4e0d5',
                        borderRadius: '8px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <span style={{ fontSize: '12px', fontWeight: 600, color: '#57695b' }}>Total Omzet Menu</span>
                      <b style={{ fontSize: '15px', fontWeight: 800, color: '#2d6a4f' }}>
                        {rupiah(selectedProduct.revenue)}
                      </b>
                    </div>

                    {/* Kotak Rekomendasi Aksi Strategis Owner */}
                    {(() => {
                      const info = getQuadrantInfo(selectedProduct.quadrant);
                      return (
                        <div
                          style={{
                            padding: '14px',
                            backgroundColor: info.bg,
                            border: `1.5px solid ${info.border}`,
                            borderRadius: '10px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <CheckCircle2 size={16} color={info.badge} />
                            <b style={{ fontSize: '12.5px', color: info.badge, textTransform: 'uppercase' }}>
                              Aksi Strategis: {info.action}
                            </b>
                          </div>
                          <p style={{ margin: 0, fontSize: '12px', color: '#374151', lineHeight: 1.45 }}>
                            {info.desc}
                          </p>
                        </div>
                      );
                    })()}
                  </>
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px 10px', color: '#888' }}>
                    <p style={{ fontSize: '13px' }}>Klik salah satu titik menu pada diagram untuk melihat rekomendasi aksi.</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* View Mode: Tabel Rincian Data */
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e7e8e3',
                borderRadius: '12px',
                overflow: 'hidden',
              }}
            >
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12.5px' }}>
                  <thead>
                    <tr style={{ background: '#fafaf8', borderBottom: '1px solid #e7e8e3', color: '#6b7280', fontSize: '11px', textTransform: 'uppercase' }}>
                      <th style={{ padding: '12px 16px' }}>Menu & SKU</th>
                      <th style={{ padding: '12px 14px' }}>Kategori</th>
                      <th style={{ padding: '12px 14px' }}>Harga Jual</th>
                      <th style={{ padding: '12px 14px' }}>HPP Resep</th>
                      <th style={{ padding: '12px 14px' }}>Margin Laba</th>
                      <th style={{ padding: '12px 14px' }}>Terjual</th>
                      <th style={{ padding: '12px 14px' }}>Total Omzet</th>
                      <th style={{ padding: '12px 16px' }}>Kuadran & Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedProducts.map((p, idx) => {
                      const info = getQuadrantInfo(p.quadrant);
                      return (
                        <tr
                          key={p.id}
                          style={{
                            borderBottom: '1px solid #f1f2ed',
                            backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fcfcfb',
                          }}
                        >
                          <td style={{ padding: '12px 16px' }}>
                            <b style={{ color: '#1c2826', display: 'block' }}>{p.name}</b>
                            <small style={{ color: '#9ca3af' }}>{p.sku}</small>
                          </td>
                          <td style={{ padding: '12px 14px', color: '#4b5563' }}>{p.category}</td>
                          <td style={{ padding: '12px 14px', fontWeight: 600 }}>{rupiah(p.price)}</td>
                          <td style={{ padding: '12px 14px', color: '#b91c1c' }}>{rupiah(p.cost)}</td>
                          <td style={{ padding: '12px 14px', fontWeight: 700, color: p.margin >= 70 ? '#2d6a4f' : '#b45309' }}>
                            {p.margin}%
                          </td>
                          <td style={{ padding: '12px 14px', fontWeight: 600 }}>{p.quantity} porsi</td>
                          <td style={{ padding: '12px 14px', fontWeight: 700, color: '#1c2826' }}>{rupiah(p.revenue)}</td>
                          <td style={{ padding: '12px 16px' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '3px 9px',
                                borderRadius: '999px',
                                fontSize: '11px',
                                fontWeight: 700,
                                color: info.badge,
                                backgroundColor: info.bg,
                                border: `1px solid ${info.border}`,
                              }}
                            >
                              {info.title}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
