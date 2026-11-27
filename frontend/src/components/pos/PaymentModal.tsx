'use client';

import React, { useState, useEffect } from 'react';
import { rupiah, formatThousands, parseThousands } from '@/lib/utils';
import { Icon } from '@/components/common/Icons';

interface PaymentModalProps {
  grandTotal: number;
  onClose: () => void;
  onProcessPayment: (paymentData: {
    payments: Array<{
      method: 'CASH' | 'QRIS' | 'DEBIT_CARD' | 'BANK_TRANSFER';
      amount: number;
      cashReceived?: number;
      cashChange?: number;
      referenceNumber?: string;
    }>;
    paymentMethod: 'CASH' | 'QRIS' | 'DEBIT_CARD' | 'BANK_TRANSFER';
    cashReceived?: number;
    cashChange?: number;
    referenceNumber?: string;
  }) => Promise<void>;
  claimedDownPayment?: number;
  orderNote?: string;
  orderType?: string;
  tableNumber?: string | null;
}

export function PaymentModal({
  grandTotal,
  onClose,
  onProcessPayment,
  claimedDownPayment = 0,
  orderNote,
  orderType,
  tableNumber,
}: PaymentModalProps) {
  const [method, setMethod] = useState<'CASH' | 'QRIS' | 'DEBIT_CARD' | 'BANK_TRANSFER' | 'SPLIT'>('CASH');
  const [cashReceived, setCashReceived] = useState<number>(Math.ceil(grandTotal / 10000) * 10000 || grandTotal);
  const [refNumber, setRefNumber] = useState('');
  const [splitCash, setSplitCash] = useState<number>(Math.round(grandTotal / 2));
  const [splitQris, setSplitQris] = useState<number>(grandTotal - Math.round(grandTotal / 2));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (cashReceived < grandTotal) {
      setCashReceived(grandTotal);
    }
  }, [grandTotal]);

  const cashChange = Math.max(0, cashReceived - grandTotal);
  const normalizedSplitQris = Math.min(grandTotal, Math.max(0, splitQris));
  const remainingCashDueAfterQris = Math.max(0, grandTotal - normalizedSplitQris);
  const normalizedSplitCash = Math.min(splitCash, remainingCashDueAfterQris);
  const splitCashChange = Math.max(0, splitCash - remainingCashDueAfterQris);
  const splitTotal = splitCash + normalizedSplitQris;
  const isSplitValid = normalizedSplitQris <= grandTotal && splitTotal >= grandTotal;

  const quickCashOptions = [
    { label: 'Uang Pas', value: grandTotal },
    { label: rupiah(Math.ceil(grandTotal / 50000) * 50000 || 50000), value: Math.ceil(grandTotal / 50000) * 50000 || 50000 },
    { label: 'Rp 50.000', value: 50000 },
    { label: 'Rp 100.000', value: 100000 },
    { label: 'Rp 200.000', value: 200000 },
  ].filter((opt, idx, self) => idx === self.findIndex((t) => t.value === opt.value));

  const handleSubmit = async () => {
    setErrorMessage('');
    setIsSubmitting(true);

    try {
      if (method === 'CASH') {
        if (cashReceived < grandTotal) {
          setErrorMessage('Uang tunai yang diterima kurang dari total pembayaran.');
          setIsSubmitting(false);
          return;
        }

        await onProcessPayment({
          paymentMethod: 'CASH',
          cashReceived,
          cashChange,
          payments: [
            {
              method: 'CASH',
              amount: grandTotal,
              cashReceived,
              cashChange,
            },
          ],
        });
      } else if (method === 'SPLIT') {
        if (!isSplitValid) {
          setErrorMessage('Jumlah pembayaran gabungan (Tunai + QRIS) belum mencukupi total belanja.');
          setIsSubmitting(false);
          return;
        }

        const splitLegs: any[] = [];
        if (normalizedSplitCash > 0 || normalizedSplitQris === 0) {
          splitLegs.push({
            method: 'CASH',
            amount: normalizedSplitCash,
            cashReceived: splitCash,
            cashChange: splitCashChange,
          });
        }
        if (normalizedSplitQris > 0) {
          splitLegs.push({
            method: 'QRIS',
            amount: normalizedSplitQris,
            referenceNumber: refNumber || undefined,
          });
        }

        await onProcessPayment({
          paymentMethod: normalizedSplitCash > 0 ? 'CASH' : 'QRIS',
          cashReceived: splitCash > 0 ? splitCash : undefined,
          cashChange: splitCashChange,
          referenceNumber: refNumber || undefined,
          payments: splitLegs,
        });
      } else {
        await onProcessPayment({
          paymentMethod: method,
          referenceNumber: refNumber || undefined,
          payments: [
            {
              method,
              amount: grandTotal,
              referenceNumber: refNumber || undefined,
            },
          ],
        });
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan pemrosesan pembayaran.');
      setIsSubmitting(false);
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
            <h2>Penyelesaian Pembayaran</h2>
            <p>Pilih metode pembayaran pelanggan RUANG TEMU (Pay-First).</p>
          </div>
          <button onClick={onClose} aria-label="Tutup">
            <Icon name="close" size={20} />
          </button>
        </header>

        <div style={{ flex: '1 1 auto', overflowY: 'auto', padding: '18px 20px' }}>
          {/* Total Tagihan */}
          <div
            style={{
              padding: '16px',
              backgroundColor: '#f3f6f3',
              borderRadius: '10px',
              border: '1px solid #d4e0d5',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px',
            }}
          >
            <div>
              <span style={{ fontSize: '12px', color: '#57695b', fontWeight: 600 }}>TOTAL HARUS DIBAYAR</span>
              {claimedDownPayment > 0 && (
                <small style={{ display: 'block', color: '#2d6a4f', fontSize: '11px' }}>
                  (Telah dipotong DP Reservasi: {rupiah(claimedDownPayment)})
                </small>
              )}
            </div>
            <b style={{ fontSize: '26px', color: '#57695b', fontWeight: 700 }}>{rupiah(grandTotal)}</b>
          </div>

          {/* Catatan Khusus Pesanan (Global Order Note) */}
          {orderNote && (
            <div
              style={{
                padding: '10px 14px',
                backgroundColor: '#fefce8',
                border: '1.5px solid #fde047',
                borderRadius: '8px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
              }}
            >
              <div style={{ color: '#ca8a04', marginTop: '1px', flexShrink: 0 }}>
                <Icon name="stickyNote" size={18} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span
                  style={{
                    display: 'block',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#854d0e',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  Catatan Pesanan {orderType === 'TAKEAWAY' ? '(Takeaway)' : tableNumber ? `(Meja ${tableNumber})` : ''}:
                </span>
                <p
                  style={{
                    margin: '2px 0 0',
                    fontSize: '13px',
                    color: '#713f12',
                    fontWeight: 600,
                    lineHeight: 1.4,
                    wordBreak: 'break-word',
                  }}
                >
                  "{orderNote}"
                </p>
              </div>
            </div>
          )}

          {/* Payment Method Tabs */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(95px, 1fr))',
              gap: '8px',
              marginBottom: '18px',
            }}
          >
            {[
              { id: 'CASH', label: 'Tunai', icon: 'wallet' },
              { id: 'QRIS', label: 'QRIS', icon: 'qrCode' },
              { id: 'DEBIT_CARD', label: 'Debit EDC', icon: 'creditCard' },
              { id: 'BANK_TRANSFER', label: 'Transfer', icon: 'send' },
              { id: 'SPLIT', label: 'Gabungan', icon: 'split' },
            ].map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMethod(m.id as any)}
                style={{
                  padding: '12px 6px',
                  borderRadius: '8px',
                  border: method === m.id ? '2px solid #57695b' : '1px solid #d1d1d1',
                  backgroundColor: method === m.id ? '#57695b' : '#ffffff',
                  color: method === m.id ? '#ffffff' : '#333333',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '6px',
                  fontWeight: 600,
                  fontSize: '12px',
                  transition: 'all 0.15s ease',
                }}
              >
                <Icon name={m.icon} size={20} />
                <span>{m.label}</span>
              </button>
            ))}
          </div>

          {/* CASH Form */}
          {method === 'CASH' && (
            <div className="cash-payment-panel">
              <label className="bo-field">
                <span style={{ fontWeight: 600 }}>Nominal Uang Tunai Diterima</span>
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
                    placeholder="0"
                    value={formatThousands(cashReceived)}
                    onChange={(e) => setCashReceived(parseThousands(e.target.value))}
                    autoFocus
                    style={{
                      fontSize: '18px',
                      fontWeight: 700,
                      padding: '10px 14px 10px 48px',
                      width: '100%',
                      border: '1.5px solid #57695b',
                      borderRadius: '8px',
                      outline: 'none',
                    }}
                  />
                </div>
              </label>

              {/* Quick Cash Chips */}
              <div className="quick-cash" style={{ marginTop: '8px', marginBottom: '14px' }}>
                {quickCashOptions.map((opt) => (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => setCashReceived(opt.value)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      border: '1px solid #d1d1d1',
                      backgroundColor: cashReceived === opt.value ? '#eef6ef' : '#fff',
                      color: cashReceived === opt.value ? '#57695b' : '#333',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Change / Kembalian */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 16px',
                  backgroundColor: '#f9f6ee',
                  border: '1px solid #e0d9cd',
                  borderRadius: '8px',
                }}
              >
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#4a4a4a' }}>Uang Kembalian Kasir</span>
                <b style={{ fontSize: '20px', color: '#272727', fontWeight: 700 }}>{rupiah(cashChange)}</b>
              </div>
            </div>
          )}

          {/* QRIS Panel */}
          {method === 'QRIS' && (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div
                style={{
                  width: '160px',
                  height: '160px',
                  margin: '0 auto 14px',
                  border: '2px dashed #57695b',
                  borderRadius: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#fff',
                }}
              >
                <Icon name="qrCode" size={72} className="text-[#57695b] mb-1 opacity-80" />
                <span style={{ fontSize: '11px', color: '#57695b', fontWeight: 600 }}>QRIS STATIS / DINAMIS</span>
              </div>
              <p style={{ fontSize: '13px', color: '#555', marginBottom: '12px' }}>
                Arahkan pelanggan untuk memindai QRIS di meja kasir RUANG TEMU sebesar{' '}
                <b style={{ color: '#57695b' }}>{rupiah(grandTotal)}</b>.
              </p>
              <label style={{ display: 'block', maxWidth: '320px', margin: '0 auto', textAlign: 'left' }}>
                <span style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>
                  Nomor Referensi Transaksi (Opsional)
                </span>
                <input
                  type="text"
                  value={refNumber}
                  onChange={(e) => setRefNumber(e.target.value)}
                  placeholder="Contoh: RRN-981247"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d1d1d1',
                    borderRadius: '6px',
                    fontSize: '13px',
                  }}
                />
              </label>
            </div>
          )}

          {/* DEBIT / EDC */}
          {method === 'DEBIT_CARD' && (
            <div style={{ padding: '14px 0' }}>
              <p style={{ fontSize: '13px', color: '#555', marginBottom: '14px' }}>
                Gesek atau tap kartu debit pada mesin EDC kasir sebesar <b style={{ color: '#57695b' }}>{rupiah(grandTotal)}</b>.
              </p>
              <label style={{ display: 'block' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  Nomor Approval Code / No. Kartu Terakhir
                </span>
                <input
                  type="text"
                  value={refNumber}
                  onChange={(e) => setRefNumber(e.target.value)}
                  placeholder="Contoh: APV-7341 / BCA 4821"
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '1px solid #d1d1d1',
                    borderRadius: '8px',
                    fontSize: '14px',
                  }}
                />
              </label>
            </div>
          )}

          {/* BANK TRANSFER */}
          {method === 'BANK_TRANSFER' && (
            <div style={{ padding: '14px 0' }}>
              <p style={{ fontSize: '13px', color: '#555', marginBottom: '14px' }}>
                Verifikasi mutasi rekening kas RUANG TEMU (BCA / Mandiri) sebesar{' '}
                <b style={{ color: '#57695b' }}>{rupiah(grandTotal)}</b>.
              </p>
              <label style={{ display: 'block' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  Nama Pengirim / Referensi Bank
                </span>
                <input
                  type="text"
                  value={refNumber}
                  onChange={(e) => setRefNumber(e.target.value)}
                  placeholder="Contoh: Bpk. Hendra Gunawan"
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '1px solid #d1d1d1',
                    borderRadius: '8px',
                    fontSize: '14px',
                  }}
                />
              </label>
            </div>
          )}

          {/* SPLIT PAYMENT */}
          {method === 'SPLIT' && (
            <div style={{ padding: '10px 0' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <label>
                  <span style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                    Porsi Tunai (CASH)
                  </span>
                  <div style={{ position: 'relative' }}>
                    <span
                      style={{
                        position: 'absolute',
                        left: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        fontSize: '12.5px',
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
                      placeholder="0"
                      value={formatThousands(splitCash)}
                      onChange={(e) => {
                        const val = parseThousands(e.target.value);
                        setSplitCash(val);
                        if (splitQris === 0 && val <= grandTotal) {
                          setSplitQris(Math.max(0, grandTotal - val));
                        }
                      }}
                      style={{
                        width: '100%',
                        padding: '8px 12px 8px 34px',
                        border: '1px solid #d1d1d1',
                        borderRadius: '6px',
                        fontSize: '14px',
                        fontWeight: 700,
                        outline: 'none',
                      }}
                    />
                  </div>
                </label>
                <label>
                  <span style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                    Porsi QRIS / Non-Tunai
                  </span>
                  <div style={{ position: 'relative' }}>
                    <span
                      style={{
                        position: 'absolute',
                        left: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        fontSize: '12.5px',
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
                      placeholder="0"
                      value={formatThousands(splitQris)}
                      onChange={(e) => {
                        const val = Math.min(grandTotal, parseThousands(e.target.value));
                        setSplitQris(val);
                        setSplitCash(Math.max(0, grandTotal - val));
                      }}
                      style={{
                        width: '100%',
                        padding: '8px 12px 8px 34px',
                        border: '1px solid #d1d1d1',
                        borderRadius: '6px',
                        fontSize: '14px',
                        fontWeight: 700,
                        outline: 'none',
                      }}
                    />
                  </div>
                </label>
              </div>
              <div
                style={{
                  fontSize: '12px',
                  color: isSplitValid ? '#2d6a4f' : '#a32424',
                  fontWeight: 600,
                  backgroundColor: isSplitValid ? '#eef6ef' : '#fde8e8',
                  padding: '8px 12px',
                  borderRadius: '6px',
                }}
              >
                <div>
                  Tagihan {rupiah(grandTotal)} — Tunai masuk {rupiah(normalizedSplitCash)} + QRIS {rupiah(normalizedSplitQris)}
                  {!isSplitValid && ` (Kurang ${rupiah(grandTotal - splitTotal)})`}
                </div>
                {splitCashChange > 0 && (
                  <div style={{ marginTop: '3px', color: '#1b4332', fontWeight: 700 }}>
                    Kembalian Tunai: {rupiah(splitCashChange)} (Tunai diterima {rupiah(splitCash)})
                  </div>
                )}
              </div>
            </div>
          )}

          {errorMessage && (
            <div
              style={{
                marginTop: '12px',
                padding: '8px 12px',
                backgroundColor: '#fde8e8',
                color: '#a32424',
                borderRadius: '6px',
                fontSize: '13px',
              }}
            >
              {errorMessage}
            </div>
          )}
        </div>

        <footer className="modal-actions" style={{ padding: '14px 20px', borderTop: '1px solid #eee' }}>
          <button type="button" onClick={onClose} disabled={isSubmitting}>
            Kembali ke Kasir
          </button>
          <button
            type="button"
            className="bo-primary"
            disabled={isSubmitting || (method === 'CASH' && cashReceived < grandTotal) || (method === 'SPLIT' && !isSplitValid)}
            onClick={handleSubmit}
          >
            {isSubmitting ? (
              'Memproses Transaksi...'
            ) : (
              <>
                <Icon name="check" size={18} />
                Selesaikan Transaksi ({rupiah(grandTotal)})
              </>
            )}
          </button>
        </footer>
      </div>
    </div>
  );
}
