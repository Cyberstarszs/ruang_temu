'use client';

import React, { useState } from 'react';
import { useShift } from '@/context/ShiftContext';
import { useAuth } from '@/context/AuthContext';
import { rupiah, formatDateTime } from '@/lib/utils';
import { Icon } from '@/components/common/Icons';

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
        <header className="bo-modal-head" style={{ backgroundColor: '#fcfbf8' }}>
          <div>
            <h2 style={{ color: '#57695b' }}>
              {isMandatory ? 'Wajib Buka Sif Kasir' : 'Buka Sif Kasir Baru'}
            </h2>
            <p>
              {isMandatory
                ? `Halo ${user?.name || 'Kasir'}, masukkan modal kas awal untuk mulai transaksi.`
                : 'Masukkan modal uang kas kecil awal (float cash) di laci uang kasir.'}
            </p>
          </div>
          {!isMandatory && (
            <button onClick={onClose} aria-label="Tutup">
              <Icon name="close" size={20} />
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
              Modal Uang Awal di Laci Kasir (Rp)
            </span>
            <input
              type="number"
              value={openingCash || ''}
              onChange={(e) => setOpeningCash(Number(e.target.value))}
              autoFocus
              required
              min={0}
              style={{
                width: '100%',
                padding: '12px 14px',
                border: '1.5px solid #57695b',
                borderRadius: '8px',
                fontSize: '20px',
                fontWeight: 700,
                color: '#272727',
              }}
            />
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
            <h2>Rekap Sif Kasir Berjalan</h2>
            <p>Dibuka sejak {shift ? formatDateTime(shift.opened_at) : '—'}</p>
          </div>
          <button onClick={onClose} aria-label="Tutup">
            <Icon name="close" size={20} />
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
    </div>
  );
}

// 3. CASH MOVEMENT MODAL (CASH IN / OUT)
export function CashMovementModal({ onClose }: { onClose: () => void }) {
  const { recordCashMovement } = useShift();
  const [type, setType] = useState<'CASH_IN' | 'CASH_OUT'>('CASH_OUT');
  const [category, setCategory] = useState('Bahan Baku Darurat');
  const [amount, setAmount] = useState<number>(0);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const categories =
    type === 'CASH_OUT'
      ? ['Bahan Baku Darurat', 'Kembalian Kasir', 'Operasional Toko', 'Lain-lain']
      : ['Setoran Tambahan Modal', 'Pengembalian Uang', 'Lain-lain'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (amount <= 0) {
      setError('Nominal pergerakan kas harus lebih dari Rp 0.');
      return;
    }

    try {
      setLoading(true);
      const res = await recordCashMovement({
        type,
        category,
        description: description.trim() || category,
        amount,
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
        style={{ maxWidth: '480px', width: '92%' }}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="bo-modal-head">
          <div>
            <h2>Pencatatan Kas Masuk / Kas Keluar</h2>
            <p>Perubahan kas langsung dicatat ke buku kas operasional.</p>
          </div>
          <button onClick={onClose} aria-label="Tutup">
            <Icon name="close" size={20} />
          </button>
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

          <div className="pos-type-tabs" style={{ marginBottom: '14px' }}>
            <button
              type="button"
              className={type === 'CASH_OUT' ? 'active' : ''}
              onClick={() => {
                setType('CASH_OUT');
                setCategory('Bahan Baku Darurat');
              }}
            >
              Kas Keluar (Petty Cash)
            </button>
            <button
              type="button"
              className={type === 'CASH_IN' ? 'active' : ''}
              onClick={() => {
                setType('CASH_IN');
                setCategory('Setoran Tambahan Modal');
              }}
            >
              Kas Masuk (Cash In)
            </button>
          </div>

          <label style={{ display: 'block', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
              Kategori
            </span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                border: '1px solid #d1d1d1',
                borderRadius: '8px',
                fontSize: '14px',
              }}
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: 'block', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
              Nominal (Rp)
            </span>
            <input
              type="number"
              value={amount || ''}
              onChange={(e) => setAmount(Number(e.target.value))}
              placeholder="Rp 0"
              required
              min={1}
              style={{
                width: '100%',
                padding: '10px 14px',
                border: '1px solid #d1d1d1',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 700,
              }}
            />
          </label>

          <label style={{ display: 'block', marginBottom: '16px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
              Keterangan / Alasan
            </span>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Contoh: Beli es kristal tambahan 2 pak"
              style={{
                width: '100%',
                padding: '10px 14px',
                border: '1px solid #d1d1d1',
                borderRadius: '8px',
                fontSize: '14px',
              }}
            />
          </label>

          <div className="modal-actions">
            <button type="button" onClick={onClose} disabled={loading}>
              Batal
            </button>
            <button type="submit" className="bo-primary" disabled={loading || amount <= 0}>
              {loading ? 'Menyimpan...' : 'Simpan Mutasi Kas'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// 4. CLOSE SHIFT MODAL (TIDAK PERLU PIN OWNER & OTOMATIS LOGOUT)
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Compute calculated cash
  const calculatedFromDenominations = Object.entries(denominations).reduce((sum, [key, count]) => {
    if (key === 'coins') return sum + (count || 0);
    return sum + Number(key) * (count || 0);
  }, 0);

  const physicalCash = useDetailedDenomination ? calculatedFromDenominations : manualPhysicalCash;

  const handleDenomChange = (denom: string, val: number) => {
    setDenominations((prev) => ({
      ...prev,
      [denom]: Math.max(0, val),
    }));
  };

  const handleClose = async () => {
    setError('');
    setLoading(true);

    try {
      const res = await closeShift({
        blindCountedCash: physicalCash,
        notes: notes.trim() || undefined,
      });

      if (res.success) {
        // Otomatis logout setelah tutup sif berhasil!
        onClose();
        logout();
      } else {
        setError(res.message || 'Gagal menutup sif kasir.');
        setLoading(false);
      }
    } catch (err: any) {
      setError(err.message || 'Gagal menutup sif kasir.');
      setLoading(false);
    }
  };

  return (
    <div className="bo-modal-layer" onClick={onClose}>
      <div
        className="bo-modal"
        role="dialog"
        aria-modal="true"
        style={{ maxWidth: '580px', width: '92%' }}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="bo-modal-head">
          <div>
            <h2>Tutup Sif Kasir</h2>
            <p>Hitung total uang fisik di laci. Sif akan ditutup dan akun otomatis keluar.</p>
          </div>
          <button onClick={onClose} aria-label="Tutup">
            <Icon name="close" size={20} />
          </button>
        </header>

        <div style={{ flex: '1 1 auto', overflowY: 'auto', padding: '18px 20px' }}>
          {error && (
            <div
              style={{
                padding: '10px 14px',
                backgroundColor: '#fde8e8',
                color: '#a32424',
                borderRadius: '8px',
                fontSize: '13px',
                marginBottom: '14px',
                lineHeight: 1.4,
              }}
            >
              {error}
            </div>
          )}

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '12px',
            }}
          >
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#4a4a4a' }}>
              Metode Hitung Kas Fisik:
            </span>
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
              }}
            >
              {useDetailedDenomination ? 'Beralih ke Input Total Langsung' : 'Beralih ke Hitung Pecahan Lembar'}
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
                    type="number"
                    min={0}
                    value={denominations[key] || ''}
                    onChange={(e) => handleDenomChange(key, Number(e.target.value))}
                    placeholder="0"
                    style={{
                      width: '75px',
                      textAlign: 'right',
                      padding: '4px 6px',
                      border: '1px solid #ccc',
                      borderRadius: '4px',
                      fontWeight: 700,
                      fontSize: '13px',
                    }}
                  />
                </label>
              ))}
            </div>
          ) : (
            <label style={{ display: 'block', marginBottom: '14px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                Total Uang Tunai Fisik di Laci (Rp)
              </span>
              <input
                type="number"
                value={manualPhysicalCash || ''}
                onChange={(e) => setManualPhysicalCash(Number(e.target.value))}
                placeholder="Rp 0"
                min={0}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  border: '1.5px solid #57695b',
                  borderRadius: '8px',
                  fontSize: '18px',
                  fontWeight: 700,
                }}
              />
            </label>
          )}

          {/* Display Total Physical Cash */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '10px 14px',
              backgroundColor: '#f3f6f3',
              borderRadius: '8px',
              border: '1px solid #d4e0d5',
              marginBottom: '14px',
            }}
          >
            <span style={{ fontSize: '13px', color: '#57695b', fontWeight: 600 }}>Total Uang Fisik Laci:</span>
            <b style={{ fontSize: '18px', color: '#57695b' }}>{rupiah(physicalCash)}</b>
          </div>

          {/* Notes */}
          <label style={{ display: 'block', marginBottom: '14px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#444', display: 'block', marginBottom: '4px' }}>
              Catatan Tutup Sif (Opsional)
            </span>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: pergantian sif aman, laci kas rapi"
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d1d1',
                borderRadius: '6px',
                fontSize: '13px',
              }}
            />
          </label>

          <p style={{ fontSize: '12px', color: '#777', margin: 0 }}>
            * Setelah menekan tombol konfirmasi, laporan rekonsiliasi kas akan disimpan dan sesi kasir otomatis keluar.
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
            {loading ? 'Menutup Sif & Logout...' : 'Tutup Sif & Logout Otomatis'}
          </button>
        </footer>
      </div>
    </div>
  );
}
