'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useShift } from '@/context/ShiftContext';
import { useAuth } from '@/context/AuthContext';
import { rupiah, formatDateTime, formatThousands, parseThousands } from '@/lib/utils';
import { Icon } from '@/components/common/Icons';
import { api } from '@/lib/api';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// 1. OPEN SHIFT MODAL (MANDATORY ON FIRST LOGIN)
export function OpenShiftModal({
  onClose,
  isMandatory = false,
}: {
  onClose: () => void;
  isMandatory?: boolean;
}) {
  const { openShift } = useShift();
  const { user, logout } = useAuth();
  const [openingCash, setOpeningCash] = useState<number>(500000);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const quickFloats = [200000, 300000, 500000, 1000000];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (openingCash < 0) {
      setError('Nominal modal awal kasir tidak boleh minus.');
      return;
    }

    try {
      setLoading(true);
      const res = await openShift(openingCash);
      if (res.success) {
        onClose();
      } else {
        setError(res.message || 'Gagal membuka sif kasir.');
      }
    } catch (err: any) {
      setError(err.message || 'Gagal membuka sif kasir.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="bo-modal-layer"
      style={{ zIndex: 1200 }}
      onClick={() => {
        if (!isMandatory) onClose();
      }}
    >
      <div
        className="bo-modal"
        role="dialog"
        aria-modal="true"
        style={{ maxWidth: '480px', width: '92%' }}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="bo-modal-head">
          <div>
            <h2>{isMandatory ? 'Buka Sif Kasir' : 'Buka Sif Baru'}</h2>
            {isMandatory && (
              <p>Halo {user?.name || 'Kasir'}, masukkan modal awal laci kasir.</p>
            )}
          </div>
          {!isMandatory && (
            <button onClick={onClose} aria-label="Tutup">
              <Icon name="close" size={18} />
            </button>
          )}
        </header>

        <form onSubmit={handleSubmit} style={{ flex: '1 1 auto', overflowY: 'auto', padding: '18px 20px', display: 'flex', flexDirection: 'column' }}>
          {error && (
            <div
              style={{
                padding: '8px 12px',
                backgroundColor: '#fde8e8',
                color: '#a32424',
                borderRadius: '6px',
                fontSize: '13px',
                marginBottom: '12px',
              }}
            >
              {error}
            </div>
          )}

          <label style={{ display: 'block', marginBottom: '14px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#4a4a4a', display: 'block', marginBottom: '6px' }}>
              Modal Uang Awal di Laci Kasir
            </span>
            <div style={{ position: 'relative' }}>
              <span
                style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: '18px',
                  fontWeight: 700,
                  color: '#57695b',
                  pointerEvents: 'none',
                }}
              >
                Rp
              </span>
              <input
                type="text"
                inputMode="numeric"
                value={formatThousands(openingCash)}
                onChange={(e) => setOpeningCash(parseThousands(e.target.value))}
                autoFocus
                required
                placeholder="0"
                style={{
                  width: '100%',
                  padding: '12px 14px 12px 48px',
                  border: '1.5px solid #57695b',
                  borderRadius: '8px',
                  fontSize: '20px',
                  fontWeight: 700,
                  color: '#272727',
                  outline: 'none',
                }}
              />
            </div>
          </label>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
            {quickFloats.map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => setOpeningCash(val)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid #d1d1d1',
                  backgroundColor: openingCash === val ? '#eef6ef' : '#fff',
                  color: openingCash === val ? '#57695b' : '#333',
                  fontWeight: 600,
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                {rupiah(val)}
              </button>
            ))}
          </div>

          <p style={{ fontSize: '12px', color: '#666', lineHeight: 1.4 }}>
            Uang modal awal ini wajib dihitung fisik saat mulai bertugas dan akan dicocokkan saat kasir melakukan tutup sif.
          </p>

          <div className="modal-actions" style={{ marginTop: '20px' }}>
            {isMandatory ? (
              <button
                type="button"
                onClick={() => logout()}
                style={{ color: '#a32424' }}
              >
                Batal & Keluar Akun
              </button>
            ) : (
              <button type="button" onClick={onClose} disabled={loading}>
                Batal
              </button>
            )}

            <button type="submit" className="bo-primary" disabled={loading}>
              {loading ? 'Membuka Sif...' : 'Konfirmasi Buka Sif Kasir'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// 2. SHIFT RECAP MODAL
export function ShiftRecapModal({ onClose }: { onClose: () => void }) {
  const { shift, summary } = useShift();
  const [movements, setMovements] = useState<any[]>([]);
  const [loadingMovements, setLoadingMovements] = useState(false);
  const [viewingReceipt, setViewingReceipt] = useState<string | null>(null);

  useEffect(() => {
    if (!shift?.id) return;
    setLoadingMovements(true);
    api.shifts
      .getMovements(shift.id)
      .then((res) => {
        if (res.success && res.data) {
          setMovements(res.data);
        }
      })
      .catch((err) => console.error('Failed to load movements:', err))
      .finally(() => setLoadingMovements(false));
  }, [shift?.id]);

  return (
    <div className="bo-modal-layer" onClick={onClose}>
      <div
        className="bo-modal"
        role="dialog"
        aria-modal="true"
        style={{ maxWidth: '520px', width: '92%' }}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="bo-modal-head">
          <div>
            <h2>Rekap Sif</h2>
            <p>{shift ? formatDateTime(shift.opened_at) : '—'}</p>
          </div>
          <button onClick={onClose} aria-label="Tutup">
            <Icon name="close" size={18} />
          </button>
        </header>

        <div style={{ flex: '1 1 auto', overflowY: 'auto', padding: '18px 20px' }}>
          <div className="shift-recap-grid">
            <span>
              Modal Awal Laci
              <b>{rupiah(shift?.opening_cash)}</b>
            </span>
            <span>
              Total Transaksi Selesai
              <b>{summary?.orderCount || 0} struk</b>
            </span>
            <span>
              Kasir Penanggung Jawab
              <b>{shift?.cashier_name || 'Kasir'}</b>
            </span>
            <span>
              Status Sif
              <b style={{ color: '#2d6a4f' }}>AKTIF BERJALAN</b>
            </span>
          </div>

          {/* Riwayat Mutasi Kas Sif Ini (Pengeluaran & Kas Masuk) */}
          <div style={{ marginTop: '16px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b', display: 'block', marginBottom: '8px' }}>
              Riwayat Kas Masuk & Kas Keluar (Petty Cash):
            </span>
            {loadingMovements ? (
              <p style={{ fontSize: '12px', color: '#64748b', margin: '6px 0' }}>Memuat mutasi kas...</p>
            ) : movements.length === 0 ? (
              <p style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic', margin: '6px 0' }}>
                Belum ada mutasi kas masuk / pengeluaran tercatat pada sif ini.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '180px', overflowY: 'auto' }}>
                {movements.map((m) => {
                  const isCashIn = m.type === 'CASH_IN';
                  return (
                    <div
                      key={m.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 10px',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                        <span
                          style={{
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: isCashIn ? '#dcfce7' : '#fee2e2',
                            color: isCashIn ? '#15803d' : '#b91c1c',
                            fontWeight: 700,
                            fontSize: '10.5px',
                            flexShrink: 0,
                          }}
                        >
                          {isCashIn ? '+ Masuk' : '- Keluar'}
                        </span>
                        <div style={{ minWidth: 0 }}>
                          <b style={{ color: '#1e293b', display: 'block', fontSize: '12px' }}>{m.category}</b>
                          <small style={{ color: '#64748b', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {m.description || '-'}
                          </small>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                        {m.receipt_url && (
                          <button
                            type="button"
                            onClick={() => setViewingReceipt(m.receipt_url)}
                            style={{
                              padding: '2px 7px',
                              borderRadius: '4px',
                              background: '#edf3ee',
                              border: '1px solid #cbd5e1',
                              color: '#57695b',
                              fontSize: '11px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                            }}
                            title="Lihat foto nota"
                          >
                            <Icon name="receipt" size={11} />
                            Foto
                          </button>
                        )}
                        <b style={{ color: isCashIn ? '#15803d' : '#b91c1c', fontSize: '12.5px' }}>
                          {isCashIn ? '+' : '-'}{rupiah(m.amount)}
                        </b>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div
            style={{
              marginTop: '16px',
              padding: '12px',
              backgroundColor: '#f3f6f3',
              borderRadius: '8px',
              fontSize: '12px',
              color: '#4a4a4a',
            }}
          >
            Sistem menerapkan <b>Blind Close</b> (Rekonsiliasi Kas Buta). Jumlah uang kas riil di laci kasir wajib
            dihitung fisik tanpa melihat estimasi sistem untuk mencegah manipulasi.
          </div>
        </div>

        <footer className="modal-actions" style={{ padding: '14px 20px', borderTop: '1px solid #eee' }}>
          <button type="button" onClick={onClose}>
            Tutup
          </button>
          <button type="button" className="bo-primary" onClick={() => window.print()}>
            <Icon name="printer" size={16} />
            Cetak Rekap Sif
          </button>
        </footer>
      </div>

      {/* Lightbox Pratinjau Foto Bukti Nota */}
      {viewingReceipt && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(4px)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={() => setViewingReceipt(null)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              overflow: 'hidden',
              maxWidth: '520px',
              width: '100%',
              boxShadow: '0 25px 50px rgba(0,0,0,0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 18px',
                borderBottom: '1px solid #f1f5f9',
              }}
            >
              <b style={{ fontSize: '14px', color: '#1e293b' }}>Foto Bukti Nota Pembelian</b>
              <button
                onClick={() => setViewingReceipt(null)}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '50%',
                  width: '28px',
                  height: '28px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name="close" size={15} />
              </button>
            </div>
            <div style={{ padding: '16px', textAlign: 'center', background: '#0f172a', maxHeight: '65vh', overflowY: 'auto' }}>
              <img
                src={viewingReceipt}
                alt="Foto Bukti Nota"
                style={{
                  maxWidth: '100%',
                  maxHeight: '55vh',
                  objectFit: 'contain',
                  borderRadius: '8px',
                  margin: '0 auto',
                  display: 'block',
                }}
              />
            </div>
            <div style={{ padding: '12px 18px', display: 'flex', justifyContent: 'flex-end', background: '#fafaf8' }}>
              <button
                onClick={() => setViewingReceipt(null)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  border: 'none',
                  background: '#57695b',
                  color: '#ffffff',
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
      )}
    </div>
  );
}

// 3. CASH MOVEMENT MODAL (CASH IN / OUT - PENGELUARAN KASIR)
export function CashMovementModal({ onClose }: { onClose: () => void }) {
  const { recordCashMovement, hasActiveShift } = useShift();
  const [type, setType] = useState<'CASH_IN' | 'CASH_OUT'>('CASH_OUT');
  const [category, setCategory] = useState('Bahan Baku Darurat');
  const [amount, setAmount] = useState<number>(0);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [receiptFileName, setReceiptFileName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categories =
    type === 'CASH_OUT'
      ? ['Bahan Baku Darurat', 'Kembalian Kasir', 'Operasional Toko', 'Lain-lain']
      : ['Setoran Tambahan Modal', 'Pengembalian Uang', 'Lain-lain'];

  const quickExpenseTemplates = [
    { label: '🧊 Beli Es Batu', desc: 'Beli es batu kristal', cat: 'Bahan Baku Darurat', defaultAmount: 15000 },
    { label: '💧 Air Galon', desc: 'Beli air galon isi ulang', cat: 'Bahan Baku Darurat', defaultAmount: 20000 },
    { label: '🔥 Gas LPG', desc: 'Beli tabung gas LPG', cat: 'Operasional Toko', defaultAmount: 25000 },
    { label: '🥛 Bahan Darurat', desc: 'Beli bahan baku darurat', cat: 'Bahan Baku Darurat', defaultAmount: 30000 },
    { label: '🧹 Perlengkapan Toko', desc: 'Beli kantong plastik / tissue / kebersihan', cat: 'Operasional Toko', defaultAmount: 20000 },
    { label: '🪙 Uang Pecahan Kasir', desc: 'Tukar uang receh kasir', cat: 'Kembalian Kasir', defaultAmount: 50000 },
  ];

  const handleApplyTemplate = (tpl: typeof quickExpenseTemplates[0]) => {
    setDescription(tpl.desc);
    setCategory(tpl.cat);
    if (amount <= 0) {
      setAmount(tpl.defaultAmount);
    }
  };

  const handleAddAmount = (addVal: number) => {
    setAmount((prev) => (prev || 0) + addVal);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('File harus berupa foto atau gambar (JPG, PNG, WebP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Ukuran foto bukti tidak boleh melebihi 5MB.');
      return;
    }

    setError('');
    setReceiptFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setReceiptImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (amount <= 0) {
      setError('Nominal pengeluaran kas harus lebih dari Rp 0.');
      return;
    }

    try {
      setLoading(true);
      let receiptUrl: string | null = null;
      if (receiptImage) {
        try {
          const upRes = await api.shifts.uploadReceipt({
            image: receiptImage,
            filename: receiptFileName,
          });
          if (upRes.success && upRes.data?.url) {
            receiptUrl = upRes.data.url;
          }
        } catch {
          // If dedicated upload route fails, receiptImage base64 still captured
          receiptUrl = receiptImage;
        }
      }

      const res = await recordCashMovement({
        type,
        category,
        description: description.trim() || category,
        amount,
        receipt_url: receiptUrl,
      });
      if (res.success) {
        onClose();
      } else {
        setError(res.message || 'Gagal mencatat mutasi kas.');
      }
    } catch (err: any) {
      setError(err.message || 'Gagal mencatat mutasi kas.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bo-modal-layer" onClick={onClose}>
      <div
        className="bo-modal"
        role="dialog"
        aria-modal="true"
        style={{
          maxWidth: '520px',
          width: '92%',
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="bo-modal-head">
          <h2>{type === 'CASH_OUT' ? 'Catat Kas Keluar' : 'Catat Kas Masuk'}</h2>
          <button onClick={onClose} aria-label="Tutup">
            <Icon name="close" size={18} />
          </button>
        </header>

        <form onSubmit={handleSubmit} style={{ flex: '1 1 auto', overflowY: 'auto', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {error && (
            <div
              style={{
                padding: '10px 14px',
                backgroundColor: '#fef2f2',
                color: '#b91c1c',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 500,
              }}
            >
              {error}
            </div>
          )}

          {!hasActiveShift && (
            <div
              style={{
                padding: '10px 14px',
                backgroundColor: '#fffbeb',
                color: '#92400e',
                border: '1px solid #fde68a',
                borderRadius: '8px',
                fontSize: '12.5px',
                lineHeight: 1.4,
              }}
            >
              ⚠️ Kasir belum membuka sesi sif. Harap buka sif terlebih dahulu agar pencatatan ini masuk ke rekap kas kasir.
            </div>
          )}

          {/* Type Switcher Tabs */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '6px',
              background: '#f1f5f9',
              padding: '4px',
              borderRadius: '10px',
            }}
          >
            <button
              type="button"
              onClick={() => {
                setType('CASH_OUT');
                setCategory('Bahan Baku Darurat');
              }}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: 'none',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
                background: type === 'CASH_OUT' ? '#ffffff' : 'transparent',
                color: type === 'CASH_OUT' ? '#b91c1c' : '#64748b',
                boxShadow: type === 'CASH_OUT' ? '0 1px 3px rgba(0, 0, 0, 0.1)' : 'none',
              }}
            >
              💸 Kas Keluar (Pengeluaran)
            </button>
            <button
              type="button"
              onClick={() => {
                setType('CASH_IN');
                setCategory('Setoran Tambahan Modal');
              }}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: 'none',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
                background: type === 'CASH_IN' ? '#ffffff' : 'transparent',
                color: type === 'CASH_IN' ? '#57695b' : '#64748b',
                boxShadow: type === 'CASH_IN' ? '0 1px 3px rgba(0, 0, 0, 0.1)' : 'none',
              }}
            >
              💰 Kas Masuk (Modal / Setor)
            </button>
          </div>

          {/* Quick Expense Suggestion Chips (Only for Cash Out) */}
          {type === 'CASH_OUT' && (
            <div>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '6px' }}>
                Pengeluaran Cepat Operasional:
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {quickExpenseTemplates.map((tpl) => (
                  <button
                    key={tpl.label}
                    type="button"
                    onClick={() => handleApplyTemplate(tpl)}
                    style={{
                      padding: '5px 10px',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      background: description === tpl.desc ? '#edf3ee' : '#ffffff',
                      borderColor: description === tpl.desc ? '#57695b' : '#e2e8f0',
                      color: description === tpl.desc ? '#57695b' : '#334155',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    {tpl.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Nominal Input & Live Preview */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
                Nominal {type === 'CASH_OUT' ? 'Pengeluaran' : 'Kas Masuk'}
              </span>
              {amount > 0 && (
                <b style={{ fontSize: '13px', color: type === 'CASH_OUT' ? '#b91c1c' : '#57695b' }}>
                  {rupiah(amount)}
                </b>
              )}
            </div>
            <div style={{ position: 'relative' }}>
              <span
                style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: '15px',
                  fontWeight: 700,
                  color: '#94a3b8',
                  pointerEvents: 'none',
                }}
              >
                Rp
              </span>
              <input
                type="text"
                inputMode="numeric"
                value={formatThousands(amount)}
                onChange={(e) => setAmount(parseThousands(e.target.value))}
                placeholder="0"
                required
                style={{
                  width: '100%',
                  padding: '10px 14px 10px 42px',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: '10px',
                  fontSize: '17px',
                  fontWeight: 700,
                  color: '#0f172a',
                  outline: 'none',
                  backgroundColor: '#ffffff',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Quick Add Nominal Pills */}
            <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
              {[10000, 20000, 50000, 100000].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleAddAmount(val)}
                  style={{
                    padding: '4px 9px',
                    borderRadius: '6px',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    color: '#475569',
                    cursor: 'pointer',
                  }}
                >
                  +{val / 1000}rb
                </button>
              ))}
              {amount > 0 && (
                <button
                  type="button"
                  onClick={() => setAmount(0)}
                  style={{
                    padding: '4px 9px',
                    borderRadius: '6px',
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    color: '#b91c1c',
                    cursor: 'pointer',
                  }}
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Kategori Select */}
          <div>
            <span style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px', color: '#1e293b' }}>
              Kategori
            </span>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger style={{ width: '100%', height: '42px', background: '#ffffff', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '14px' }}>
                <SelectValue placeholder="Pilih Kategori" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Keterangan / Catatan */}
          <div>
            <span style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px', color: '#1e293b' }}>
              Keterangan Pengeluaran
            </span>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Contoh: Beli es kristal tambahan 2 pak"
              style={{
                width: '100%',
                padding: '10px 14px',
                border: '1.5px solid #cbd5e1',
                borderRadius: '10px',
                fontSize: '14px',
                color: '#0f172a',
                outline: 'none',
                backgroundColor: '#ffffff',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Upload Bukti Nota / Struk Fisik (Agar Akuntabel & Terpercaya) */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
                Foto Bukti Nota / Struk Pembelian
              </span>
              <span style={{ fontSize: '11px', color: '#64748b' }}>
                {type === 'CASH_OUT' ? 'Dianjurkan (Bukti Fisik)' : 'Opsional'}
              </span>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />

            {!receiptImage ? (
              <div
                role="button"
                tabIndex={0}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') fileInputRef.current?.click();
                }}
                style={{
                  border: '1.5px dashed #cbd5e1',
                  borderRadius: '10px',
                  padding: '14px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  backgroundColor: '#f8fafc',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#57695b';
                  e.currentTarget.style.backgroundColor = '#edf3ee';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#cbd5e1';
                  e.currentTarget.style.backgroundColor = '#f8fafc';
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: '#edf3ee',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#57695b',
                    }}
                  >
                    <Icon name="receipt" size={18} />
                  </div>
                  <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#1e293b' }}>
                    📸 Ambil Foto / Unggah Bukti Nota
                  </span>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>
                    Lampirkan foto nota (es batu, galon, dll) agar pengeluaran terpercaya
                  </span>
                </div>
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '8px 12px',
                  border: '1.5px solid #86efac',
                  backgroundColor: '#f0fdf4',
                  borderRadius: '10px',
                }}
              >
                <img
                  src={receiptImage}
                  alt="Bukti Nota"
                  style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '8px',
                    objectFit: 'cover',
                    border: '1px solid #bbf7d0',
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#15803d', display: 'block' }}>
                    ✓ Bukti Nota Terlampir
                  </span>
                  <span
                    style={{
                      fontSize: '11.5px',
                      color: '#334155',
                      display: 'block',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      marginTop: '2px',
                    }}
                    title={receiptFileName}
                  >
                    {receiptFileName || 'nota_pengeluaran.jpg'}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '5px' }}>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: '#475569',
                      cursor: 'pointer',
                    }}
                  >
                    Ganti
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setReceiptImage(null);
                      setReceiptFileName('');
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '6px',
                      border: '1px solid #fecaca',
                      background: '#fef2f2',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: '#dc2626',
                      cursor: 'pointer',
                    }}
                  >
                    Hapus
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div
            className="modal-actions"
            style={{
              display: 'flex',
              gap: '10px',
              justifyContent: 'flex-end',
              marginTop: '6px',
              paddingTop: '12px',
              borderTop: '1px solid #f1f5f9',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                padding: '9px 18px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#475569',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading || amount <= 0}
              style={{
                padding: '9px 20px',
                borderRadius: '8px',
                border: 'none',
                background: type === 'CASH_OUT' ? '#b91c1c' : '#57695b',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: 600,
                cursor: loading || amount <= 0 ? 'not-allowed' : 'pointer',
                opacity: loading || amount <= 0 ? 0.6 : 1,
                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.15)',
              }}
            >
              {loading
                ? 'Menyimpan...'
                : type === 'CASH_OUT'
                ? 'Simpan Pengeluaran'
                : 'Simpan Kas Masuk'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// 4. CLOSE SHIFT MODAL (BLIND CLOSE SEJATI + WAJIB PIN OWNER JIKA SELISIH + RINGKASAN AKHIR PASCA TUTUP)
export function CloseShiftModal({ onClose }: { onClose: () => void }) {
  const { closeShift } = useShift();
  const { logout } = useAuth();

  // Denominasi Lembaran
  const [denominations, setDenominations] = useState<{ [key: string]: number }>({
    '100000': 0,
    '50000': 0,
    '20000': 0,
    '10000': 0,
    '5000': 0,
    '2000': 0,
    '1000': 0,
    'coins': 0,
  });

  const [useDetailedDenomination, setUseDetailedDenomination] = useState(true);
  const [manualPhysicalCash, setManualPhysicalCash] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [managerPin, setManagerPin] = useState('');
  const [requiresPin, setRequiresPin] = useState(false);
  const [rejectedCashAmount, setRejectedCashAmount] = useState<number | null>(null);
  const [closedReconciliation, setClosedReconciliation] = useState<{
    openingCash: number;
    cashSales: number;
    cashIn: number;
    cashOut: number;
    systemExpected: number;
    blindCountedCash: number;
    difference: number;
    status: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Compute calculated physical cash (Blind Drop: tidak menampilkan ekspektasi sistem sebelumnya)
  const calculatedFromDenominations = Object.entries(denominations).reduce((sum, [key, count]) => {
    if (key === 'coins') return sum + (count || 0);
    return sum + Number(key) * (count || 0);
  }, 0);

  const physicalCash = useDetailedDenomination ? calculatedFromDenominations : manualPhysicalCash;

  // Reset PIN authorization prompt automatically whenever the cashier corrects the physical cash input
  useEffect(() => {
    if (rejectedCashAmount !== null && physicalCash !== rejectedCashAmount) {
      setRequiresPin(false);
      setRejectedCashAmount(null);
      setManagerPin('');
      setError('');
    }
  }, [physicalCash, rejectedCashAmount]);

  const handleDenomChange = (denom: string, val: number) => {
    setDenominations((prev) => ({
      ...prev,
      [denom]: Math.max(0, val),
    }));
  };

  // Aksi Reset: Kosongkan Hitungan Kas
  const handleResetCash = () => {
    setManualPhysicalCash(0);
    setDenominations({
      '100000': 0,
      '50000': 0,
      '20000': 0,
      '10000': 0,
      '5000': 0,
      '2000': 0,
      '1000': 0,
      'coins': 0,
    });
    setRequiresPin(false);
    setRejectedCashAmount(null);
    setManagerPin('');
    setError('');
  };

  const handleFinishAndLogout = () => {
    onClose();
    logout();
  };

  const handleClose = async () => {
    setError('');
    if (physicalCash < 0) {
      setError('Nominal uang fisik di laci tidak boleh negatif.');
      return;
    }

    if (requiresPin && (!managerPin.trim() || managerPin.trim().length < 4)) {
      setError('PIN Otorisasi Owner (minimal 4 digit) wajib diisi untuk menutup sif dengan selisih kas.');
      return;
    }

    if (requiresPin && !notes.trim()) {
      setError('Catatan alasan selisih kas wajib diisi sebelum menutup sif.');
      return;
    }

    setLoading(true);

    try {
      const res = await closeShift({
        blindCountedCash: physicalCash,
        notes: notes.trim() || undefined,
        managerPin: requiresPin ? managerPin.trim() || undefined : undefined,
      });

      if (res.success && res.reconciliation) {
        setClosedReconciliation(res.reconciliation);
        setLoading(false);
      } else if (res.success) {
        handleFinishAndLogout();
      } else {
        if (res.requiresManagerPin) {
          setRequiresPin(true);
          setRejectedCashAmount(physicalCash);
        }
        setError(res.message || 'Gagal menutup sif kasir.');
        setLoading(false);
      }
    } catch (err: any) {
      setError(err.message || 'Gagal menutup sif kasir.');
      setLoading(false);
    }
  };

  // View setelah sif berhasil ditutup: tampilkan hasil rekonsiliasi final lalu logout
  if (closedReconciliation) {
    const isBalanced = closedReconciliation.difference === 0;
    const isOver = closedReconciliation.difference > 0;
    return (
      <div className="bo-modal-layer" onClick={handleFinishAndLogout}>
        <div
          className="bo-modal"
          role="dialog"
          aria-modal="true"
          style={{ maxWidth: '520px', width: '92%' }}
          onClick={(e) => e.stopPropagation()}
        >
          <header className="bo-modal-head">
            <h2>Rekap Akhir Sif</h2>
            <button onClick={handleFinishAndLogout} aria-label="Tutup & Keluar">
              <Icon name="close" size={18} />
            </button>
          </header>

          <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div
              style={{
                padding: '12px 14px',
                borderRadius: '10px',
                backgroundColor: isBalanced ? '#f0fdf4' : isOver ? '#eff6ff' : '#fef2f2',
                border: `1.5px solid ${isBalanced ? '#86efac' : isOver ? '#93c5fd' : '#fca5a5'}`,
                color: isBalanced ? '#166534' : isOver ? '#1e40af' : '#991b1b',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontWeight: 700,
                fontSize: '14px',
              }}
            >
              <span>Status Rekonsiliasi: {closedReconciliation.status}</span>
              <span>
                {closedReconciliation.difference === 0
                  ? 'Rp 0'
                  : closedReconciliation.difference > 0
                  ? `+${rupiah(closedReconciliation.difference)}`
                  : `-${rupiah(Math.abs(closedReconciliation.difference))}`}
              </span>
            </div>

            <div
              style={{
                background: '#f8faf9',
                borderRadius: '10px',
                border: '1px solid #dce4dd',
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                fontSize: '13px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#4b5563' }}>Modal Awal Laci:</span>
                <b>{rupiah(closedReconciliation.openingCash)}</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#15803d' }}>
                <span>(+) Penjualan Tunai:</span>
                <b>+{rupiah(closedReconciliation.cashSales)}</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#166534' }}>
                <span>(+) Kas Masuk Operasional:</span>
                <b>+{rupiah(closedReconciliation.cashIn)}</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#b91c1c' }}>
                <span>(-) Kas Keluar Operasional:</span>
                <b>-{rupiah(closedReconciliation.cashOut)}</b>
              </div>
              <div style={{ height: '1px', background: '#dce4dd', margin: '4px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 700 }}>Ekspektasi Kas Sistem:</span>
                <b>{rupiah(closedReconciliation.systemExpected)}</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#2d6a4f' }}>
                <span style={{ fontWeight: 700 }}>Hitung Fisik Kasir:</span>
                <b>{rupiah(closedReconciliation.blindCountedCash)}</b>
              </div>
            </div>
          </div>

          <footer className="modal-actions" style={{ padding: '14px 20px', borderTop: '1px solid #eee' }}>
            <button type="button" className="bo-primary" onClick={handleFinishAndLogout}>
              Selesai & Keluar Akun (Logout)
            </button>
          </footer>
        </div>
      </div>
    );
  }

  return (
    <div className="bo-modal-layer" onClick={onClose}>
      <div
        className="bo-modal"
        role="dialog"
        aria-modal="true"
        style={{ maxWidth: '600px', width: '92%' }}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="bo-modal-head">
          <h2>Tutup Sif Kasir</h2>
          <button onClick={onClose} aria-label="Tutup">
            <Icon name="close" size={18} />
          </button>
        </header>

        <div style={{ flex: '1 1 auto', overflowY: 'auto', padding: '16px 18px' }}>
          {error && (
            <div
              style={{
                padding: '9px 12px',
                backgroundColor: '#fef2f2',
                color: '#b91c1c',
                borderRadius: '8px',
                fontSize: '12.5px',
                marginBottom: '14px',
                lineHeight: 1.4,
                border: '1px solid #fecaca',
              }}
            >
              {error}
            </div>
          )}

          {/* 2. METODE HITUNG FISIK (PECAHAN LEMBAR vs TOTAL LANGSUNG) */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '12px',
            }}
          >
            <button
              type="button"
              onClick={() => setUseDetailedDenomination(!useDetailedDenomination)}
              style={{
                fontSize: '12px',
                color: '#57695b',
                background: 'none',
                border: 'none',
                fontWeight: 600,
                cursor: 'pointer',
                textDecoration: 'underline',
                padding: 0,
              }}
            >
              {useDetailedDenomination ? 'Input Total Langsung' : 'Hitung Pecahan Lembar'}
            </button>
            <button
              type="button"
              onClick={handleResetCash}
              style={{
                height: '28px',
                padding: '0 10px',
                borderRadius: '6px',
                border: '1px solid #dcdfd5',
                background: '#fbfbf9',
                color: '#64746b',
                fontSize: '11.5px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
              title="Kosongkan hitungan kas fisik"
            >
              Reset
            </button>
          </div>

          {useDetailedDenomination ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
              {[
                ['100000', 'Rp 100.000'],
                ['50000', 'Rp 50.000'],
                ['20000', 'Rp 20.000'],
                ['10000', 'Rp 10.000'],
                ['5000', 'Rp 5.000'],
                ['2000', 'Rp 2.000'],
                ['1000', 'Rp 1.000'],
                ['coins', 'Koin / Receh (Rp)'],
              ].map(([key, label]) => (
                <label
                  key={key}
                  style={{
                    padding: '6px 10px',
                    border: '1px solid #d1d1d1',
                    borderRadius: '6px',
                    backgroundColor: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span style={{ fontSize: '11px', color: '#444' }}>{label}</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={key === 'coins' ? formatThousands(denominations[key]) : (denominations[key] || '')}
                    onChange={(e) =>
                      handleDenomChange(
                        key,
                        key === 'coins' ? parseThousands(e.target.value) : Number(e.target.value.replace(/\D/g, ''))
                      )
                    }
                    placeholder="0"
                    style={{
                      width: key === 'coins' ? '95px' : '75px',
                      textAlign: 'right',
                      padding: '4px 6px',
                      border: '1px solid #ccc',
                      borderRadius: '4px',
                      fontWeight: 700,
                      fontSize: '13px',
                      outline: 'none',
                    }}
                  />
                </label>
              ))}
            </div>
          ) : (
            <label style={{ display: 'block', marginBottom: '14px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px', color: '#374151' }}>
                Total Uang Tunai Fisik di Laci
              </span>
              <div style={{ position: 'relative' }}>
                <span
                  style={{
                    position: 'absolute',
                    left: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: '18px',
                    fontWeight: 700,
                    color: '#57695b',
                    pointerEvents: 'none',
                  }}
                >
                  Rp
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={formatThousands(manualPhysicalCash)}
                  onChange={(e) => setManualPhysicalCash(parseThousands(e.target.value))}
                  placeholder="0"
                  style={{
                    width: '100%',
                    padding: '10px 14px 10px 48px',
                    border: '1.5px solid #57695b',
                    borderRadius: '8px',
                    fontSize: '18px',
                    fontWeight: 700,
                    outline: 'none',
                  }}
                />
              </div>
            </label>
          )}

          {/* 3. TOTAL UANG FISIK LACI */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '10px 14px',
              backgroundColor: '#f3f6f3',
              borderRadius: '8px',
              border: '1px solid #d4e0d5',
              marginBottom: '12px',
            }}
          >
            <span style={{ fontSize: '13px', color: '#57695b', fontWeight: 600 }}>Total Uang Fisik Dihitung:</span>
            <b style={{ fontSize: '18px', color: '#57695b' }}>{rupiah(physicalCash)}</b>
          </div>

          {/* 4. PANEL OTORISASI PIN OWNER (Muncul otomatis jika terdeteksi selisih saat submit) */}
          {requiresPin && (
            <div
              style={{
                padding: '12px 14px',
                backgroundColor: '#fffbeb',
                border: '1.5px solid #f59e0b',
                borderRadius: '8px',
                marginBottom: '14px',
              }}
            >
              <b style={{ fontSize: '12.5px', color: '#92400e', display: 'block', marginBottom: '4px' }}>
                ⚠️ Otorisasi PIN Owner Diperlukan (Terdeteksi Selisih Kas)
              </b>
              <p style={{ fontSize: '11.5px', color: '#78350f', margin: '0 0 8px' }}>
                Silakan cek kembali atau koreksi nominal uang laci di atas (panel PIN otomatis tertutup bila nominal diubah), atau panggil Owner untuk memasukkan PIN 6-digit dan isi alasan selisih di bawah.
              </p>
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={managerPin}
                onChange={(e) => setManagerPin(e.target.value)}
                placeholder="Masukkan PIN Owner..."
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1.5px solid #d97706',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: 700,
                  letterSpacing: '2px',
                  backgroundColor: '#ffffff',
                  outline: 'none',
                }}
              />
            </div>
          )}

          {/* 5. CATATAN TUTUP SIF */}
          <label style={{ display: 'block', marginBottom: '14px' }}>
            <span
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: requiresPin ? '#b91c1c' : '#444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '4px',
              }}
            >
              <span>{requiresPin ? 'Catatan Alasan Selisih Kas (Wajib Diisi)' : 'Catatan Tutup Sif (Opsional)'}</span>
              {requiresPin && <span style={{ color: '#dc2626', fontSize: '11px' }}>* Wajib isi alasan</span>}
            </span>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                requiresPin
                  ? 'Contoh: Selisih kembalian saat jam ramai, sudah diverifikasi Owner'
                  : 'Contoh: pergantian sif aman, laci kas rapi'
              }
              style={{
                width: '100%',
                padding: '8px 12px',
                border: requiresPin ? '1.5px solid #f87171' : '1px solid #d1d1d1',
                borderRadius: '6px',
                fontSize: '13px',
                backgroundColor: requiresPin ? '#fffbfb' : '#ffffff',
                outline: 'none',
              }}
            />
          </label>

          <p style={{ fontSize: '12px', color: '#777', margin: 0 }}>
            * Setelah sif dikunci dan direkonsiliasi, hasil laporan akhir akan ditampilkan sebelum sesi keluar otomatis.
          </p>
        </div>

        <footer className="modal-actions" style={{ padding: '14px 20px', borderTop: '1px solid #eee' }}>
          <button type="button" onClick={onClose} disabled={loading}>
            Batal
          </button>
          <button
            type="button"
            className="bo-primary danger"
            disabled={loading}
            onClick={handleClose}
          >
            {loading ? 'Memverifikasi & Menutup Sif...' : requiresPin ? 'Verifikasi PIN & Tutup Sif' : 'Tutup Sif & Rekonsiliasi'}
          </button>
        </footer>
      </div>
    </div>
  );
}
