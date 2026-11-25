'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Promo } from '@/types';
import {
  BadgePercent,
  Plus,
  Check,
  X,
  Search,
  RotateCcw,
  Calendar,
  Tag,
} from 'lucide-react';

export function AdminPromosView() {
  const [promos, setPromos] = useState<Promo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Add Promo Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
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

  // Floating Popover for '...' details
  const [promoPopover, setPromoPopover] = useState<{
    title: string;
    details: Array<{ label: string; value: string }>;
    rect: { top: number; left: number };
  } | null>(null);

  const openPromoPopover = (e: React.MouseEvent, title: string, details: Array<{ label: string; value: string }>) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setPromoPopover({
      title,
      details,
      rect: { top: rect.bottom, left: rect.left },
    });
  };

  const loadPromos = async () => {
    setIsLoading(true);
    try {
      const res = await api.promos.getAdminList();
      if (res.success && res.data) {
        setPromos(res.data);
      }
    } catch (err) {
      console.error('Failed to load promos:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPromos();
  }, []);

  const handleTogglePromo = async (promo: Promo) => {
    try {
      const newStatus = !promo.is_active;
      const res = await api.promos.toggle(promo.id, newStatus);
      if (res.success) {
        setPromos(promos.map((p) => (p.id === promo.id ? { ...p, is_active: newStatus } : p)));
      }
    } catch (err: any) {
      alert(err.message || 'Gagal mengubah status promo.');
    }
  };

  const handleCreatePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim() || !discountValue) {
      setModalError('Kode, nama, dan nilai diskon promo wajib diisi.');
      return;
    }

    try {
      const res = await api.promos.create({
        code: code.trim().toUpperCase(),
        name: name.trim(),
        discount_type: discountType,
        discount_value: Number(discountValue),
        min_spend: Number(minSpend) || 0,
        max_discount: maxDiscount ? Number(maxDiscount) : null,
        quota: quota ? Number(quota) : null,
        start_date: startDate,
        end_date: endDate,
      });

      if (res.success) {
        alert('Promo berhasil dibuat!');
        setIsModalOpen(false);
        setCode('');
        setName('');
        loadPromos();
      }
    } catch (err: any) {
      setModalError(err.message || 'Gagal membuat voucher promo.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Minimal Action Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
        }}
      >
        <span style={{ fontSize: '13px', fontWeight: 600, color: '#71717a' }}>
          Daftar Voucher & Diskon ({promos.length})
        </span>

        <button
          onClick={() => {
            setIsModalOpen(true);
            setModalError('');
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
          Buat Promo
        </button>
      </div>

      {/* Promos Table */}
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
                <th style={{ padding: '0 14px', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Kode Promo</th>
                <th style={{ padding: '0 12px', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Nama Promo</th>
                <th style={{ padding: '0 12px', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Diskon</th>
                <th style={{ padding: '0 12px', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Min. Belanja</th>
                <th style={{ padding: '0 12px', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Kuota / Pakai</th>
                <th style={{ padding: '0 12px', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Periode</th>
                <th style={{ padding: '0 12px', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Status</th>
                <th style={{ padding: '0 14px', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'right' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} style={{ padding: '30px', textAlign: 'center', color: '#64746b' }}>
                    Memuat daftar promo...
                  </td>
                </tr>
              ) : promos.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '30px', textAlign: 'center', color: '#8b968f', fontStyle: 'italic' }}>
                    Belum ada voucher promo yang terdaftar.
                  </td>
                </tr>
              ) : (
                promos.map((p) => {
                  const discountLabel =
                    p.discount_type === 'PERCENT'
                      ? `${Number(p.discount_value)}%${p.max_discount ? ` (Maks Rp ${Number(p.max_discount).toLocaleString('id-ID')})` : ''}`
                      : `Rp ${Number(p.discount_value).toLocaleString('id-ID')}`;

                  const startStr = new Date(p.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
                  const endStr = new Date(p.end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: '2-digit' });

                  return (
                    <tr key={p.id} style={{ borderBottom: '1px solid #f0f0eb', height: '42px', whiteSpace: 'nowrap' }}>
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
                            letterSpacing: '0.05em',
                          }}
                        >
                          {p.code}
                        </span>
                      </td>

                      {/* 2. Nama Promo */}
                      <td style={{ padding: '0 12px', verticalAlign: 'middle', fontWeight: 600, color: '#1c2826', fontSize: '12px' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ maxWidth: '170px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {p.name}
                          </span>
                          {p.name.length > 20 && (
                            <button
                              onClick={(e) =>
                                openPromoPopover(e, `Voucher: ${p.code}`, [
                                  { label: 'Kode Voucher', value: p.code },
                                  { label: 'Nama Promo', value: p.name },
                                  { label: 'Tipe Diskon', value: p.discount_type === 'PERCENT' ? 'Persentase' : 'Potongan Nominal' },
                                  { label: 'Nilai Diskon', value: discountLabel },
                                  { label: 'Min. Belanja', value: `Rp ${Number(p.min_spend).toLocaleString('id-ID')}` },
                                  { label: 'Kuota / Pakai', value: `${p.used_count || 0} / ${p.quota || '∞'}` },
                                  { label: 'Mulai', value: new Date(p.start_date).toLocaleDateString('id-ID') },
                                  { label: 'Berakhir', value: new Date(p.end_date).toLocaleDateString('id-ID') },
                                  { label: 'Status', value: p.is_active ? 'Aktif' : 'Non-Aktif' },
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

                      {/* 3. Diskon */}
                      <td style={{ padding: '0 12px', verticalAlign: 'middle', fontWeight: 700, color: '#1c2826', fontSize: '12px' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {discountLabel}
                          </span>
                          {discountLabel.length > 20 && (
                            <button
                              onClick={(e) =>
                                openPromoPopover(e, `Diskon: ${p.code}`, [
                                  { label: 'Jenis Diskon', value: p.discount_type === 'PERCENT' ? 'Persentase' : 'Nominal Tetap' },
                                  { label: 'Nilai', value: discountLabel },
                                  { label: 'Maks. Diskon', value: p.max_discount ? `Rp ${Number(p.max_discount).toLocaleString('id-ID')}` : 'Tidak Dibatasi' },
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

                      {/* 4. Min. Belanja */}
                      <td style={{ padding: '0 12px', verticalAlign: 'middle', color: '#4b5563', fontSize: '12px' }}>
                        Rp {Number(p.min_spend).toLocaleString('id-ID')}
                      </td>

                      {/* 5. Kuota / Terpakai */}
                      <td style={{ padding: '0 12px', verticalAlign: 'middle', fontSize: '12px', color: '#1c2826', fontWeight: 600 }}>
                        {p.used_count || 0} / {p.quota ? p.quota : '∞'}
                      </td>

                      {/* 6. Periode */}
                      <td style={{ padding: '0 12px', verticalAlign: 'middle', fontSize: '11.5px', color: '#64746b' }}>
                        {startStr} – {endStr}
                      </td>

                      {/* 7. Status */}
                      <td style={{ padding: '0 12px', verticalAlign: 'middle' }}>
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: '5px',
                            background: p.is_active ? '#dcfce7' : '#f1f5f9',
                            color: p.is_active ? '#15803d' : '#64746b',
                            fontWeight: 700,
                            fontSize: '10.5px',
                          }}
                        >
                          {p.is_active ? 'Aktif' : 'Non-Aktif'}
                        </span>
                      </td>

                      {/* 8. Aksi */}
                      <td style={{ padding: '0 14px', verticalAlign: 'middle', textAlign: 'right' }}>
                        <button
                          onClick={() => handleTogglePromo(p)}
                          style={{
                            padding: '3px 10px',
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
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE PROMO MODAL */}
      {isModalOpen && (
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
              maxWidth: '500px',
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
                Tambah Voucher Promo
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
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

            <form onSubmit={handleCreatePromo} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {modalError && (
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
                  {modalError}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#4b5563', marginBottom: '6px' }}>
                    Kode Voucher
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="TEMUBERDUA"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid #d1d5db',
                      fontSize: '13px',
                      fontFamily: 'monospace',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#4b5563', marginBottom: '6px' }}>
                    Nama Promo
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="cth: Promo Spesial Nongkrong"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid #d1d5db',
                      fontSize: '13px',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#4b5563', marginBottom: '6px' }}>
                    Jenis Diskon
                  </label>
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as any)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid #d1d5db',
                      fontSize: '13px',
                      background: '#ffffff',
                    }}
                  >
                    <option value="PERCENT">Persentase (%)</option>
                    <option value="FIXED_AMOUNT">Potongan Tetap (Rp)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#4b5563', marginBottom: '6px' }}>
                    Nilai Diskon ({discountType === 'PERCENT' ? '%' : 'Rp'})
                  </label>
                  <input
                    type="number"
                    required
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid #d1d5db',
                      fontSize: '13px',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#4b5563', marginBottom: '6px' }}>
                    Min. Belanja (Rp)
                  </label>
                  <input
                    type="number"
                    value={minSpend}
                    onChange={(e) => setMinSpend(e.target.value)}
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
                    Maks. Diskon (Rp)
                  </label>
                  <input
                    type="number"
                    value={maxDiscount}
                    onChange={(e) => setMaxDiscount(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid #d1d5db',
                      fontSize: '13px',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#4b5563', marginBottom: '6px' }}>
                    Mulai Berlaku
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
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
                    Berakhir Pada
                  </label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid #d1d5db',
                      fontSize: '13px',
                    }}
                  />
                </div>
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
                  onClick={() => setIsModalOpen(false)}
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
                  Simpan Voucher
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FLOATING POPOVER FOR SINGLE LINE BREAKDOWN */}
      {promoPopover && (
        <div
          onClick={() => setPromoPopover(null)}
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
              top: Math.min(promoPopover.rect.top + 6, window.innerHeight - 260),
              left: Math.max(10, Math.min(promoPopover.rect.left, window.innerWidth - 320)),
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
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#1c2826' }}>{promoPopover.title}</span>
              <button
                onClick={() => setPromoPopover(null)}
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
              {promoPopover.details.map((d, i) => (
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
