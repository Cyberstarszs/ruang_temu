'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { api } from '@/lib/api';
import { MenuMatrixItem, MenuMatrixResponse } from '@/types';
import { rupiah } from '@/lib/utils';
import { DateRangePicker, DateRange } from '@/components/ui/date-range-picker';
import {
  RotateCcw,
  Search,
  X,
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
          title: 'Bintang',
          badge: '#57695b',
          bg: '#f2f4ef',
          border: '#dcdfd5',
          action: 'Pertahankan kualitas',
        };
      case 'POTENSIAL':
        return {
          title: 'Potensial',
          badge: '#d97706',
          bg: '#fff4d6',
          border: '#fed7aa',
          action: 'Dorong promosi',
        };
      case 'PEKERJA_KERAS':
        return {
          title: 'Pekerja Keras',
          badge: '#2563eb',
          bg: '#eff6ff',
          border: '#bfdbfe',
          action: 'Optimalkan HPP',
        };
      case 'EVALUASI':
        return {
          title: 'Evaluasi',
          badge: '#a32424',
          bg: '#fde8e8',
          border: '#fecaca',
          action: 'Evaluasi menu',
        };
      default:
        return {
          title: quadrant,
          badge: '#666',
          bg: '#f3f4f6',
          border: '#e5e7eb',
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', paddingBottom: '24px' }}>
      {/* Top Bar Minimalis */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
          flexWrap: 'wrap',
          background: '#ffffff',
          padding: '10px 14px',
          borderRadius: '12px',
          border: '1px solid #e7e8e3',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          {(
            [
              { key: 'today', label: 'Hari Ini' },
              { key: '7days', label: '7 Hari' },
              { key: '30days', label: '30 Hari' },
              { key: 'all', label: 'Semua' },
            ] as const
          ).map((preset) => {
            const active = isCurrentPreset(preset.key);
            return (
              <button
                key={preset.key}
                type="button"
                onClick={() => setQuickRange(preset.key)}
                style={{
                  padding: '0 10px',
                  height: '32px',
                  borderRadius: '8px',
                  border: active ? '1px solid #57695b' : '1px solid #e2e4dc',
                  background: active ? '#57695b' : '#f7f7f5',
                  color: active ? '#ffffff' : '#4b5563',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.12s ease',
                }}
              >
                {preset.label}
              </button>
            );
          })}

          <DateRangePicker
            value={dateRange}
            onChange={(r) => setDateRange(r)}
            placeholder="Pilih tanggal"
            align="left"
            showApplyButton={false}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: '#fbfbf9',
              border: '1px solid #dcdfd5',
              borderRadius: '8px',
              padding: '0 10px',
              height: '32px',
              width: '190px',
            }}
          >
            <Search size={13} color="#71717a" style={{ flexShrink: 0 }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari menu..."
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
                <X size={12} />
              </button>
            )}
          </div>

          <div
            style={{
              display: 'flex',
              backgroundColor: '#f5f6f2',
              borderRadius: '8px',
              padding: '3px',
            }}
          >
            <button
              type="button"
              onClick={() => setViewMode('chart')}
              style={{
                padding: '4px 12px',
                borderRadius: '6px',
                border: 'none',
                fontSize: '11.5px',
                fontWeight: viewMode === 'chart' ? 700 : 500,
                cursor: 'pointer',
                backgroundColor: viewMode === 'chart' ? '#ffffff' : 'transparent',
                color: viewMode === 'chart' ? '#1c2826' : '#64746b',
                boxShadow: viewMode === 'chart' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
              }}
            >
              Diagram
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              style={{
                padding: '4px 12px',
                borderRadius: '6px',
                border: 'none',
                fontSize: '11.5px',
                fontWeight: viewMode === 'table' ? 700 : 500,
                cursor: 'pointer',
                backgroundColor: viewMode === 'table' ? '#ffffff' : 'transparent',
                color: viewMode === 'table' ? '#1c2826' : '#64746b',
                boxShadow: viewMode === 'table' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
              }}
            >
              Tabel
            </button>
          </div>

          <button
            type="button"
            onClick={fetchMatrix}
            disabled={loading}
            title="Muat ulang"
            style={{
              width: '32px',
              height: '32px',
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
            <RotateCcw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* 4 Kartu Kuadran Minimalis (Sekaligus Filter Klik) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 190px), 1fr))',
          gap: '12px',
        }}
      >
        {(
          [
            { key: 'BINTANG', label: 'Bintang', count: quadrantCounts.BINTANG, accent: '#57695b' },
            { key: 'POTENSIAL', label: 'Potensial', count: quadrantCounts.POTENSIAL, accent: '#d97706' },
            { key: 'PEKERJA_KERAS', label: 'Pekerja Keras', count: quadrantCounts.PEKERJA_KERAS, accent: '#2563eb' },
            { key: 'EVALUASI', label: 'Evaluasi', count: quadrantCounts.EVALUASI, accent: '#b91c1c' },
          ] as const
        ).map((card) => {
          const isSelected = activeFilter === card.key;
          return (
            <div
              key={card.key}
              onClick={() => setActiveFilter((prev) => (prev === card.key ? 'ALL' : card.key))}
              style={{
                background: '#ffffff',
                padding: '14px 16px',
                borderRadius: '12px',
                border: isSelected ? `1.5px solid ${card.accent}` : '1px solid #e7e8e3',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                transition: 'border-color 0.12s ease',
              }}
            >
              <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                {card.label}
              </span>
              <div style={{ fontSize: '22px', fontWeight: 800, color: card.key === 'EVALUASI' && card.count > 0 ? '#b91c1c' : '#1c2826' }}>
                {card.count}
              </div>
            </div>
          );
        })}
      </div>

      {error && (
        <div style={{ padding: '10px 14px', backgroundColor: '#fde8e8', color: '#a32424', borderRadius: '8px', fontSize: '12.5px' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '72px 20px', background: '#fff', borderRadius: '12px', border: '1px solid #e7e8e3' }}>
          <RotateCcw size={22} className="animate-spin mx-auto mb-2" color="#57695b" />
          <p style={{ fontSize: '13px', fontWeight: 600, color: '#64746b', margin: 0 }}>
            Memuat data...
          </p>
        </div>
      ) : data ? (
        <>
          {/* View Mode: Diagram Sebaran */}
          {viewMode === 'chart' ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1.8fr) minmax(300px, 1.1fr)',
                gap: '14px',
                alignItems: 'start',
              }}
            >
              {/* Matriks 4 Kuadran */}
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  height: '440px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #e7e8e3',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  userSelect: 'none',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    left: '44px',
                    right: '24px',
                    top: '50%',
                    borderTop: '1px dashed #e2e4dc',
                    zIndex: 1,
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    top: '24px',
                    bottom: '34px',
                    left: '50%',
                    borderLeft: '1px dashed #e2e4dc',
                    zIndex: 1,
                  }}
                />

                <div
                  style={{
                    position: 'absolute',
                    left: '10px',
                    top: '50%',
                    transform: 'translateY(-50%) rotate(-90deg)',
                    fontSize: '10px',
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    color: '#a1a1aa',
                    zIndex: 2,
                  }}
                >
                  MARGIN (%)
                </div>
                <div
                  style={{
                    position: 'absolute',
                    bottom: '10px',
                    right: '24px',
                    fontSize: '10px',
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    color: '#a1a1aa',
                    zIndex: 2,
                  }}
                >
                  TERJUAL
                </div>

                <span style={{ position: 'absolute', top: '14px', left: '52px', fontSize: '11.5px', fontWeight: 700, color: '#d97706', opacity: 0.75, zIndex: 2 }}>
                  Potensial
                </span>
                <span style={{ position: 'absolute', top: '14px', right: '24px', fontSize: '11.5px', fontWeight: 700, color: '#57695b', opacity: 0.8, zIndex: 2 }}>
                  Bintang
                </span>
                <span style={{ position: 'absolute', bottom: '32px', left: '52px', fontSize: '11.5px', fontWeight: 700, color: '#b91c1c', opacity: 0.75, zIndex: 2 }}>
                  Evaluasi
                </span>
                <span style={{ position: 'absolute', bottom: '32px', right: '24px', fontSize: '11.5px', fontWeight: 700, color: '#2563eb', opacity: 0.75, zIndex: 2 }}>
                  Pekerja Keras
                </span>

                {data.products.map((p) => {
                  const maxQty = Math.max(1, data.benchmarks.maxQuantity);
                  const xPct = 12 + (p.quantity / maxQty) * 74;
                  const yPct = 12 + Math.min(74, Math.max(4, p.margin * 0.8));

                  const isSelected = selectedProduct?.id === p.id;
                  const isHovered = hoveredProduct?.id === p.id;
                  const matchesSearch = !searchQuery.trim() || p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.sku.toLowerCase().includes(searchQuery.toLowerCase());
                  const isFaded = (activeFilter !== 'ALL' && p.quadrant !== activeFilter) || !matchesSearch;

                  const qColor =
                    p.quadrant === 'BINTANG'
                      ? '#57695b'
                      : p.quadrant === 'POTENSIAL'
                      ? '#d97706'
                      : p.quadrant === 'PEKERJA_KERAS'
                      ? '#2563eb'
                      : '#b91c1c';

                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedProduct(p)}
                      onMouseEnter={() => setHoveredProduct(p)}
                      onMouseLeave={() => setHoveredProduct(null)}
                      title={`${p.name} · ${p.quantity} porsi · Margin ${p.margin}%`}
                      style={{
                        position: 'absolute',
                        left: `${xPct}%`,
                        bottom: `${yPct}%`,
                        transform: 'translate(-50%, 50%)',
                        width: isSelected ? '32px' : isHovered ? '26px' : '22px',
                        height: isSelected ? '32px' : isHovered ? '26px' : '22px',
                        borderRadius: '50%',
                        backgroundColor: qColor,
                        border: isSelected ? '2.5px solid #1c2826' : '2px solid #ffffff',
                        boxShadow: isSelected
                          ? '0 0 0 3px rgba(0,0,0,0.14)'
                          : '0 1px 4px rgba(0,0,0,0.16)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#ffffff',
                        fontSize: isSelected ? '12px' : '10px',
                        fontWeight: 700,
                        zIndex: isSelected ? 20 : isHovered ? 15 : 10,
                        opacity: isFaded ? 0.18 : 1,
                        transition: 'all 0.12s ease',
                      }}
                    >
                      {p.name.charAt(0)}
                    </button>
                  );
                })}
              </div>

              {/* Detail Menu Terpilih */}
              <div
                style={{
                  background: '#ffffff',
                  border: '1px solid #e7e8e3',
                  borderRadius: '12px',
                  padding: '18px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                {selectedProduct ? (
                  <>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 600, color: '#71717a' }}>
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
                      <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#1c2826', margin: '4px 0 0' }}>
                        {selectedProduct.name}
                      </h3>
                    </div>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '10px',
                        background: '#fafbf9',
                        padding: '12px',
                        borderRadius: '10px',
                        border: '1px solid #f0f0eb',
                      }}
                    >
                      <div>
                        <span style={{ fontSize: '11px', color: '#71717a' }}>Harga Jual</span>
                        <b style={{ fontSize: '14px', color: '#1c2826', display: 'block', marginTop: '1px' }}>
                          {rupiah(selectedProduct.price)}
                        </b>
                      </div>
                      <div>
                        <span style={{ fontSize: '11px', color: '#71717a' }}>
                          HPP{selectedProduct.isEstimatedCost ? ' (Est. 35%)' : ''}
                        </span>
                        <b style={{ fontSize: '14px', color: '#b91c1c', display: 'block', marginTop: '1px' }}>
                          {rupiah(selectedProduct.cost)}
                        </b>
                      </div>
                      <div>
                        <span style={{ fontSize: '11px', color: '#71717a' }}>Margin</span>
                        <b style={{ fontSize: '14px', color: '#15803d', display: 'block', marginTop: '1px' }}>
                          {selectedProduct.margin}%
                        </b>
                      </div>
                      <div>
                        <span style={{ fontSize: '11px', color: '#71717a' }}>Terjual</span>
                        <b style={{ fontSize: '14px', color: '#1c2826', display: 'block', marginTop: '1px' }}>
                          {selectedProduct.quantity} porsi
                        </b>
                      </div>
                    </div>

                    <div
                      style={{
                        padding: '10px 12px',
                        backgroundColor: '#f2f4ef',
                        borderRadius: '8px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <span style={{ fontSize: '12px', fontWeight: 600, color: '#57695b' }}>Total Omzet</span>
                      <b style={{ fontSize: '14px', fontWeight: 800, color: '#15803d' }}>
                        {rupiah(selectedProduct.revenue)}
                      </b>
                    </div>

                    {(() => {
                      const info = getQuadrantInfo(selectedProduct.quadrant);
                      return (
                        <div
                          style={{
                            padding: '8px 12px',
                            backgroundColor: info.bg,
                            border: `1px solid ${info.border}`,
                            borderRadius: '8px',
                            fontSize: '12px',
                            fontWeight: 600,
                            color: info.badge,
                          }}
                        >
                          Saran: {info.action}
                        </div>
                      );
                    })()}
                  </>
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px 10px', color: '#8b968f', fontSize: '12.5px' }}>
                    Pilih titik menu pada diagram
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
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px', whiteSpace: 'nowrap' }}>
                  <thead>
                    <tr style={{ background: '#fafbf9', borderBottom: '1px solid #e7e8e3', color: '#71717a', height: '40px' }}>
                      <th style={{ padding: '0 12px 0 16px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em' }}>SKU</th>
                      <th style={{ padding: '0 12px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Nama Menu</th>
                      <th style={{ padding: '0 12px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Kategori</th>
                      <th style={{ padding: '0 12px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em', textAlign: 'right' }}>Harga Jual</th>
                      <th style={{ padding: '0 12px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em', textAlign: 'right' }}>HPP Resep</th>
                      <th style={{ padding: '0 12px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em', textAlign: 'right' }}>Margin</th>
                      <th style={{ padding: '0 12px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em', textAlign: 'right' }}>Terjual</th>
                      <th style={{ padding: '0 12px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em', textAlign: 'right' }}>Total Omzet</th>
                      <th style={{ padding: '0 16px 0 12px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Kuadran</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedProducts.length === 0 && (
                      <tr>
                        <td colSpan={9} style={{ padding: '40px 20px', textAlign: 'center', color: '#64746b', whiteSpace: 'normal' }}>
                          Tidak ada data menu.
                        </td>
                      </tr>
                    )}
                    {displayedProducts.map((p) => {
                      const info = getQuadrantInfo(p.quadrant);
                      return (
                        <tr
                          key={p.id}
                          style={{
                            borderBottom: '1px solid #f0f0eb',
                            height: '46px',
                            backgroundColor: '#ffffff',
                            transition: 'background-color 0.1s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#fafbf9';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#ffffff';
                          }}
                        >
                          <td style={{ padding: '8px 12px 8px 16px', verticalAlign: 'middle', color: '#71717a', fontFamily: 'monospace', fontSize: '11.5px' }}>
                            {p.sku}
                          </td>
                          <td style={{ padding: '8px 12px', verticalAlign: 'middle', fontWeight: 600, color: '#1c2826', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis' }} title={p.name}>
                            {p.name}
                          </td>
                          <td style={{ padding: '8px 12px', verticalAlign: 'middle', color: '#4b5563' }}>{p.category}</td>
                          <td style={{ padding: '8px 12px', verticalAlign: 'middle', textAlign: 'right', fontWeight: 600, color: '#1c2826', fontVariantNumeric: 'tabular-nums' }}>{rupiah(p.price)}</td>
                          <td style={{ padding: '8px 12px', verticalAlign: 'middle', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                              <span style={{ color: '#b91c1c', fontWeight: 500 }}>{rupiah(p.cost)}</span>
                              {p.isEstimatedCost && (
                                <span
                                  style={{
                                    padding: '1px 6px',
                                    borderRadius: '4px',
                                    fontSize: '10px',
                                    fontWeight: 700,
                                    backgroundColor: '#fef3c7',
                                    color: '#92400e',
                                    border: '1px solid #fde68a',
                                  }}
                                  title="Menu belum memiliki resep bahan baku; menggunakan asumsi 35% harga jual"
                                >
                                  Est. 35%
                                </span>
                              )}
                            </div>
                          </td>
                          <td style={{ padding: '8px 12px', verticalAlign: 'middle', textAlign: 'right', fontWeight: 700, color: p.margin >= 70 ? '#15803d' : '#b45309', fontVariantNumeric: 'tabular-nums' }}>
                            {p.margin}%
                          </td>
                          <td style={{ padding: '8px 12px', verticalAlign: 'middle', textAlign: 'right', fontWeight: 600, color: '#374151', fontVariantNumeric: 'tabular-nums' }}>{p.quantity} porsi</td>
                          <td style={{ padding: '8px 12px', verticalAlign: 'middle', textAlign: 'right', fontWeight: 700, color: '#1c2826', fontVariantNumeric: 'tabular-nums' }}>{rupiah(p.revenue)}</td>
                          <td style={{ padding: '8px 16px 8px 12px', verticalAlign: 'middle' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '2px 8px',
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
