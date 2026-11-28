'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { MenuMatrixItem, MenuMatrixResponse } from '@/types';
import { api } from '@/lib/api';
import { rupiah } from '@/lib/utils';
import { Icon } from '@/components/common/Icons';

interface MenuMatrixModalProps {
  onClose: () => void;
}

export function MenuMatrixModal({ onClose }: MenuMatrixModalProps) {
  const [data, setData] = useState<MenuMatrixResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<MenuMatrixItem | null>(null);
  const [hoveredProduct, setHoveredProduct] = useState<MenuMatrixItem | null>(null);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'BINTANG' | 'POTENSIAL' | 'PEKERJA_KERAS' | 'EVALUASI'>('ALL');
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');
  const [error, setError] = useState('');

  const fetchMatrix = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.reports.getMenuMatrix();
      if (res.success && res.data) {
        setData(res.data);
        if (res.data.products && res.data.products.length > 0) {
          // Default select the top star product
          const star = res.data.products.find((p: MenuMatrixItem) => p.quadrant === 'BINTANG') || res.data.products[0];
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
  };

  useEffect(() => {
    fetchMatrix();
  }, []);

  const getQuadrantRecommendation = (quadrant: string) => {
    switch (quadrant) {
      case 'BINTANG':
        return {
          title: 'Menu Bintang (Star)',
          badge: '#2d6a4f',
          bg: '#eef6ef',
          dotColor: '#2d6a4f',
          desc: 'Menu sangat laris dengan margin keuntungan tinggi. Pertahankan konsistensi rasa, standarisasi takaran, dan kepastian pasokan bahan baku.',
        };
      case 'POTENSIAL':
        return {
          title: 'Menu Potensial (Puzzle)',
          badge: '#d97706',
          bg: '#fff4d6',
          dotColor: '#d97706',
          desc: 'Margin keuntungan sangat tinggi, namun volume penjualan masih rendah. Tingkatkan visibilitas promosi, letakkan di banner utama menu, atau rekomendasikan sebagai Upselling di meja kasir.',
        };
      case 'PEKERJA_KERAS':
        return {
          title: 'Menu Pekerja Keras (Plowhorse)',
          badge: '#2563eb',
          bg: '#eff6ff',
          dotColor: '#2563eb',
          desc: 'Volume pesanan sangat tinggi tetapi margin tipis. Pertimbangkan sedikit renegosiasi harga bahan baku dengan supplier, optimalkan porsi, atau naikkan harga bertahap 3-5%.',
        };
      case 'EVALUASI':
        return {
          title: 'Menu Evaluasi (Dog)',
          badge: '#a32424',
          bg: '#fde8e8',
          dotColor: '#a32424',
          desc: 'Penjualan rendah dan margin tipis. Pertimbangkan untuk merevisi resep, bundling promo dengan Menu Bintang, atau mengganti menu ini di rotasi musim berikutnya.',
        };
      default:
        return { title: quadrant, badge: '#666', bg: '#f3f4f6', dotColor: '#61432c', desc: '' };
    }
  };

  // Group counts for filter tabs
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
    if (activeFilter === 'ALL') return data.products;
    return data.products.filter((p) => p.quadrant === activeFilter);
  }, [data, activeFilter]);

  return (
    <div className="bo-modal-layer" onClick={onClose}>
      <div
        className="bo-modal"
        role="dialog"
        aria-modal="true"
        style={{
          maxWidth: '880px',
          width: '95%',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 24px 60px rgba(0,0,0,0.22)',
          border: '1px solid #e2e0d8',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <header className="bo-modal-head">
          <h2>Matriks Menu</h2>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* View Switcher: Chart vs Table */}
            <div
              style={{
                display: 'flex',
                backgroundColor: '#eeece6',
                borderRadius: '8px',
                padding: '2px',
              }}
            >
              <button
                type="button"
                onClick={() => setViewMode('chart')}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  backgroundColor: viewMode === 'chart' ? '#ffffff' : 'transparent',
                  color: viewMode === 'chart' ? '#272727' : '#777777',
                  boxShadow: viewMode === 'chart' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.12s ease',
                }}
              >
                <Icon name="trendingUp" size={14} />
                <span>Grafik Scatter</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  backgroundColor: viewMode === 'table' ? '#ffffff' : 'transparent',
                  color: viewMode === 'table' ? '#272727' : '#777777',
                  boxShadow: viewMode === 'table' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.12s ease',
                }}
              >
                <Icon name="receipt" size={14} />
                <span>Tabel Data</span>
              </button>
            </div>

            <button
              onClick={onClose}
              aria-label="Tutup"
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                border: '1px solid #dcdad2',
                backgroundColor: '#ffffff',
                color: '#666666',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <Icon name="close" size={18} />
            </button>
          </div>
        </header>

        {/* Content Body */}
        <div style={{ padding: '18px 24px', flex: 1, overflowY: 'auto' }}>
          {error && (
            <div
              style={{
                padding: '10px 14px',
                backgroundColor: '#fde8e8',
                color: '#a32424',
                borderRadius: '8px',
                fontSize: '13px',
                marginBottom: '16px',
              }}
            >
              {error}
            </div>
          )}

          {loading ? (
            <div style={{ textAlign: 'center', padding: '70px 20px', color: '#888' }}>
              <Icon name="trendingUp" size={36} className="text-[#57695b] mx-auto mb-2 opacity-50" />
              <p style={{ fontSize: '14px', fontWeight: 500 }}>
                Menganalisis performa menu dan margin laba dari database...
              </p>
            </div>
          ) : data ? (
            <>
              {/* Quadrant Filter Pills */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '14px',
                  flexWrap: 'wrap',
                }}
              >
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#666', marginRight: '4px' }}>
                  Filter Kuadran:
                </span>
                {[
                  { key: 'ALL', label: `Semua (${quadrantCounts.ALL})`, color: '#57695b' },
                  { key: 'BINTANG', label: `⭐ Bintang (${quadrantCounts.BINTANG})`, color: '#2d6a4f' },
                  { key: 'POTENSIAL', label: `💡 Potensial (${quadrantCounts.POTENSIAL})`, color: '#d97706' },
                  { key: 'PEKERJA_KERAS', label: `⚡ Pekerja Keras (${quadrantCounts.PEKERJA_KERAS})`, color: '#2563eb' },
                  { key: 'EVALUASI', label: `⚠️ Evaluasi (${quadrantCounts.EVALUASI})`, color: '#a32424' },
                ].map((tab) => {
                  const isActive = activeFilter === tab.key;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setActiveFilter(tab.key as any)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '20px',
                        border: isActive ? `1.5px solid ${tab.color}` : '1px solid #dcdad2',
                        backgroundColor: isActive ? `${tab.color}14` : '#ffffff',
                        color: isActive ? tab.color : '#555555',
                        fontSize: '12px',
                        fontWeight: isActive ? 700 : 500,
                        cursor: 'pointer',
                        transition: 'all 0.12s ease',
                      }}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {viewMode === 'chart' ? (
                /* SCATTER PLOT VIEW */
                <div
                  style={{
                    position: 'relative',
                    width: '100%',
                    height: '340px',
                    backgroundColor: '#fafaf7',
                    border: '1px solid #e4e2da',
                    borderRadius: '12px',
                    boxSizing: 'border-box',
                    overflow: 'hidden',
                    userSelect: 'none',
                  }}
                >
                  {/* Axis Crosshairs */}
                  <div
                    style={{
                      position: 'absolute',
                      left: '50px',
                      right: '30px',
                      top: '50%',
                      borderTop: '1px dashed #cfccc3',
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      top: '25px',
                      bottom: '40px',
                      left: '50%',
                      borderLeft: '1px dashed #cfccc3',
                    }}
                  />

                  {/* Axis Indicators */}
                  <div
                    style={{
                      position: 'absolute',
                      left: '12px',
                      top: '50%',
                      transform: 'translateY(-50%) rotate(-90deg)',
                      fontSize: '10px',
                      fontWeight: 800,
                      letterSpacing: '1px',
                      color: '#8c8c8c',
                    }}
                  >
                    MARGIN LABA →
                  </div>
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '10px',
                      right: '25px',
                      fontSize: '10px',
                      fontWeight: 800,
                      letterSpacing: '1px',
                      color: '#8c8c8c',
                    }}
                  >
                    POPULARITAS (VOLUME) →
                  </div>

                  {/* 4 Quadrants Labels */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '16px',
                      left: '56px',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    <b style={{ fontSize: '12px', color: '#d97706' }}>💡 Potensial (Puzzle)</b>
                    <small style={{ fontSize: '10px', color: '#999' }}>Margin Tinggi · Volume Rendah</small>
                  </div>

                  <div
                    style={{
                      position: 'absolute',
                      top: '16px',
                      right: '25px',
                      textAlign: 'right',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-end',
                    }}
                  >
                    <b style={{ fontSize: '12px', color: '#2d6a4f' }}>⭐ Bintang (Star)</b>
                    <small style={{ fontSize: '10px', color: '#999' }}>Margin Tinggi · Volume Tinggi</small>
                  </div>

                  <div
                    style={{
                      position: 'absolute',
                      bottom: '36px',
                      left: '56px',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    <b style={{ fontSize: '12px', color: '#a32424' }}>⚠️ Evaluasi (Dog)</b>
                    <small style={{ fontSize: '10px', color: '#999' }}>Margin Tipis · Volume Rendah</small>
                  </div>

                  <div
                    style={{
                      position: 'absolute',
                      bottom: '36px',
                      right: '25px',
                      textAlign: 'right',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-end',
                    }}
                  >
                    <b style={{ fontSize: '12px', color: '#2563eb' }}>⚡ Pekerja Keras (Plowhorse)</b>
                    <small style={{ fontSize: '10px', color: '#999' }}>Margin Tipis · Volume Tinggi</small>
                  </div>

                  {/* Plotted Products (Clean circular pins with hover tooltip) */}
                  {data.products.map((p) => {
                    const maxQty = Math.max(1, data.benchmarks.maxQuantity);
                    // Map volume: 12% to 88%
                    const xPct = 12 + (p.quantity / maxQty) * 74;
                    // Map margin: 12% to 84%
                    const yPct = 12 + Math.min(72, Math.max(4, p.margin * 0.8));

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
                      <div
                        key={p.id}
                        style={{
                          position: 'absolute',
                          left: `${xPct}%`,
                          bottom: `${yPct}%`,
                          transform: 'translate(-50%, 50%)',
                          zIndex: isSelected ? 20 : isHovered ? 15 : 2,
                          opacity: isFaded ? 0.2 : 1,
                          transition: 'opacity 0.2s ease, transform 0.15s ease',
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => setSelectedProduct(p)}
                          onMouseEnter={() => setHoveredProduct(p)}
                          onMouseLeave={() => setHoveredProduct(null)}
                          title={`${p.name} · ${p.quantity} porsi · Margin ${p.margin}%`}
                          style={{
                            background: 'none',
                            border: 'none',
                            padding: 0,
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                          }}
                        >
                          {/* Dot */}
                          <span
                            style={{
                              width: isSelected ? '18px' : isHovered ? '16px' : '12px',
                              height: isSelected ? '18px' : isHovered ? '16px' : '12px',
                              borderRadius: '50%',
                              backgroundColor: qColor,
                              border: isSelected ? '3px solid #1c1917' : '2px solid #ffffff',
                              boxShadow: isSelected
                                ? '0 0 0 4px rgba(87,105,91,0.3), 0 2px 6px rgba(0,0,0,0.3)'
                                : isHovered
                                ? '0 2px 8px rgba(0,0,0,0.35)'
                                : '0 1px 3px rgba(0,0,0,0.25)',
                              display: 'block',
                              transition: 'all 0.12s ease',
                            }}
                          />

                          {/* Floating badge ONLY when selected or hovered - prevents overlapping! */}
                          {(isSelected || isHovered) && (
                            <div
                              style={{
                                position: 'absolute',
                                bottom: '22px',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                backgroundColor: '#1f2421',
                                color: '#ffffff',
                                padding: '4px 8px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: 600,
                                whiteSpace: 'nowrap',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
                                pointerEvents: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                              }}
                            >
                              <span>{p.name}</span>
                              <span style={{ color: '#a3e635', fontWeight: 700 }}>{p.margin}%</span>
                              <span style={{ color: '#bbb', fontSize: '10px' }}>({p.quantity}x)</span>
                            </div>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* TABULAR VIEW - Clean and Sortable */
                <div
                  style={{
                    maxHeight: '340px',
                    overflowY: 'auto',
                    border: '1px solid #e4e2da',
                    borderRadius: '12px',
                    backgroundColor: '#ffffff',
                  }}
                >
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', textAlign: 'left' }}>
                    <thead style={{ position: 'sticky', top: 0, backgroundColor: '#f5f5f2', zIndex: 5 }}>
                      <tr style={{ borderBottom: '1px solid #e0ded8', color: '#555' }}>
                        <th style={{ padding: '10px 14px', fontWeight: 700 }}>Menu</th>
                        <th style={{ padding: '10px 14px', fontWeight: 700 }}>Kategori</th>
                        <th style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'right' }}>Terjual</th>
                        <th style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'right' }}>Harga</th>
                        <th style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'right' }}>Margin %</th>
                        <th style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'center' }}>Kuadran</th>
                        <th style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'center' }}>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayedProducts.map((p) => {
                        const rec = getQuadrantRecommendation(p.quadrant);
                        const isSelected = selectedProduct?.id === p.id;
                        return (
                          <tr
                            key={p.id}
                            onClick={() => setSelectedProduct(p)}
                            style={{
                              borderBottom: '1px solid #f0eee9',
                              backgroundColor: isSelected ? '#f2f7f3' : 'transparent',
                              cursor: 'pointer',
                              transition: 'background-color 0.1s ease',
                            }}
                          >
                            <td style={{ padding: '10px 14px', fontWeight: isSelected ? 700 : 500, color: '#272727' }}>
                              {p.name}
                            </td>
                            <td style={{ padding: '10px 14px', color: '#666' }}>{p.category}</td>
                            <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600 }}>
                              {p.quantity} Porsi
                            </td>
                            <td style={{ padding: '10px 14px', textAlign: 'right', color: '#444' }}>
                              {rupiah(p.price)}
                            </td>
                            <td
                              style={{
                                padding: '10px 14px',
                                textAlign: 'right',
                                fontWeight: 700,
                                color: p.margin >= data.benchmarks.averageMargin ? '#2d6a4f' : '#a32424',
                              }}
                            >
                              {p.margin}%
                            </td>
                            <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                              <span
                                style={{
                                  fontSize: '10.5px',
                                  fontWeight: 700,
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  backgroundColor: rec.badge,
                                  color: '#ffffff',
                                  display: 'inline-block',
                                }}
                              >
                                {rec.title.split(' ')[1]}
                              </span>
                            </td>
                            <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedProduct(p);
                                }}
                                style={{
                                  padding: '3px 8px',
                                  borderRadius: '4px',
                                  border: '1px solid #d1d1d1',
                                  backgroundColor: isSelected ? '#57695b' : '#ffffff',
                                  color: isSelected ? '#ffffff' : '#444444',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                }}
                              >
                                {isSelected ? 'Dipilih' : 'Detail'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Benchmarks Bar */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '10px 16px',
                  backgroundColor: '#f4f4f1',
                  borderRadius: '8px',
                  marginTop: '12px',
                  fontSize: '11.5px',
                  color: '#444',
                  flexWrap: 'wrap',
                  gap: '8px',
                }}
              >
                <span>
                  Total Menu: <b>{data.benchmarks.totalProducts} Produk</b>
                </span>
                <span>
                  Titik Potong Rata-rata Margin: <b>{data.benchmarks.averageMargin}%</b>
                </span>
                <span>
                  Titik Potong Rata-rata Penjualan: <b>{data.benchmarks.averageQuantity} Porsi</b>
                </span>
                <span>
                  Penjualan Tertinggi: <b>{data.benchmarks.maxQuantity} Porsi</b>
                </span>
              </div>

              {/* Selected Menu Item Details & Recommendation */}
              {selectedProduct ? (
                (() => {
                  const rec = getQuadrantRecommendation(selectedProduct.quadrant);
                  return (
                    <div
                      style={{
                        marginTop: '14px',
                        padding: '14px 18px',
                        borderRadius: '10px',
                        border: `1px solid ${rec.badge}33`,
                        backgroundColor: rec.bg,
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          marginBottom: '8px',
                          flexWrap: 'wrap',
                          gap: '8px',
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#272727' }}>
                              {selectedProduct.name}
                            </h3>
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: '4px',
                                backgroundColor: rec.badge,
                                color: '#fff',
                              }}
                            >
                              {rec.title}
                            </span>
                          </div>
                          <small style={{ color: '#666' }}>
                            SKU: {selectedProduct.sku} · Kategori: {selectedProduct.category}
                          </small>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <b style={{ fontSize: '17px', color: '#57695b' }}>{rupiah(selectedProduct.price)}</b>
                          <small style={{ display: 'block', color: '#666', fontSize: '11px' }}>
                            HPP: {rupiah(selectedProduct.cost)} (Margin {selectedProduct.margin}%)
                          </small>
                        </div>
                      </div>

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                          gap: '8px',
                          padding: '8px 0',
                          borderTop: '1px solid rgba(0,0,0,0.06)',
                          borderBottom: '1px solid rgba(0,0,0,0.06)',
                          marginBottom: '8px',
                          fontSize: '12px',
                        }}
                      >
                        <div>
                          <span style={{ color: '#666', display: 'block' }}>Terjual Riil:</span>
                          <b>{selectedProduct.quantity} Porsi</b>
                        </div>
                        <div>
                          <span style={{ color: '#666', display: 'block' }}>Total Omzet:</span>
                          <b>{rupiah(selectedProduct.revenue)}</b>
                        </div>
                        <div>
                          <span style={{ color: '#666', display: 'block' }}>Estimasi Laba Kotor:</span>
                          <b>{rupiah(selectedProduct.revenue - selectedProduct.cost * selectedProduct.quantity)}</b>
                        </div>
                      </div>

                      <p style={{ margin: 0, fontSize: '12.5px', color: '#2f3e33', lineHeight: 1.45 }}>
                        <b>Rekomendasi Strategis:</b> {rec.desc}
                      </p>
                    </div>
                  );
                })()
              ) : (
                <p style={{ textAlign: 'center', color: '#888', fontSize: '12px', marginTop: '12px' }}>
                  Arahkan kursor atau klik salah satu titik pada diagram di atas untuk melihat detail rekayasa menu.
                </p>
              )}
            </>
          ) : null}
        </div>

        {/* Footer */}
        <footer
          className="modal-actions"
          style={{
            padding: '12px 24px',
            borderTop: '1px solid #e7e5dc',
            backgroundColor: '#fafaf8',
          }}
        >
          <button type="button" onClick={fetchMatrix} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Icon name="rotateCcw" size={16} />
            Segarkan Data
          </button>
          <button type="button" className="bo-primary" onClick={onClose}>
            Tutup
          </button>
        </footer>
      </div>
    </div>
  );
}
