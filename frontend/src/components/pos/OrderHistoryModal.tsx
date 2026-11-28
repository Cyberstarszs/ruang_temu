'use client';

import React, { useState, useEffect } from 'react';
import { Order } from '@/types';
import { api } from '@/lib/api';
import { rupiah, formatDateTime } from '@/lib/utils';
import { Icon } from '@/components/common/Icons';

interface OrderHistoryModalProps {
  onClose: () => void;
  onReprintReceipt: (order: Order) => void;
  onRefreshOrders?: () => void;
}

export function OrderHistoryModal({
  onClose,
  onReprintReceipt,
  onRefreshOrders,
}: OrderHistoryModalProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PAID' | 'CANCELLED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Void Dialog State
  const [voidDialogOpen, setVoidDialogOpen] = useState(false);
  const [orderToVoid, setOrderToVoid] = useState<Order | null>(null);
  const [voidPin, setVoidPin] = useState('');
  const [voidReason, setVoidReason] = useState('');
  const [restockStock, setRestockStock] = useState(true);
  const [voiding, setVoiding] = useState(false);
  const [voidError, setVoidError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await api.orders.getOrders({ limit: 50 });
      if (res.success && res.data) {
        setOrders(res.data);
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const filteredOrders = orders.filter((o) => {
    const matchesStatus =
      statusFilter === 'ALL'
        ? true
        : statusFilter === 'PAID'
        ? o.status === 'PAID'
        : o.status === 'CANCELLED';

    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      o.order_number.toLowerCase().includes(q) ||
      (o.customer_name && o.customer_name.toLowerCase().includes(q)) ||
      (o.table_number && o.table_number.toLowerCase().includes(q));

    return matchesStatus && matchesSearch;
  });

  const handleOpenVoid = (order: Order) => {
    setOrderToVoid(order);
    setVoidPin('');
    setVoidReason('');
    setVoidError('');
    setVoidDialogOpen(true);
  };

  const handleConfirmVoid = async () => {
    if (!orderToVoid) return;
    setVoidError('');
    if (!voidPin.trim() || voidPin.length < 4) {
      setVoidError('PIN Owner (minimal 4 digit) wajib diisi untuk otorisasi void.');
      return;
    }
    if (!voidReason.trim() || voidReason.length < 3) {
      setVoidError('Alasan pembatalan wajib diisi minimal 3 karakter.');
      return;
    }

    try {
      setVoiding(true);
      const res = await api.orders.voidOrder(orderToVoid.id, {
        managerPin: voidPin.trim(),
        reason: voidReason.trim(),
        restock: restockStock,
      });

      if (res.success) {
        setSuccessMessage(`Pesanan ${orderToVoid.order_number} berhasil dibatalkan (VOID). Tiket batal otomatis dikirim ke Bar & Dapur.`);
        setVoidDialogOpen(false);
        setOrderToVoid(null);
        await fetchOrders();
        if (onRefreshOrders) onRefreshOrders();
      } else {
        setVoidError(res.message || 'Gagal membatalkan transaksi.');
      }
    } catch (err: any) {
      setVoidError(err.message || 'Gagal membatalkan transaksi.');
    } finally {
      setVoiding(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return { label: 'Lunas', bg: '#eef6ef', text: '#2d6a4f' };
      case 'PENDING_PAYMENT_AT_CASHIER':
        return { label: 'Menunggu Bayar (QR)', bg: '#fff4d6', text: '#7a4e00' };
      case 'CANCELLED':
        return { label: 'Dibatalkan (VOID)', bg: '#fde8e8', text: '#a32424' };
      case 'EXPIRED':
        return { label: 'Kedaluwarsa', bg: '#e5e7eb', text: '#4b5563' };
      default:
        return { label: status, bg: '#f3f4f6', text: '#374151' };
    }
  };

  return (
    <>
      <div className="bo-modal-layer" onClick={onClose}>
        <div
          className="bo-modal"
          role="dialog"
          aria-modal="true"
          style={{ maxWidth: '820px', width: '94%' }}
          onClick={(e) => e.stopPropagation()}
        >
          <header className="bo-modal-head">
            <h2>Riwayat Transaksi</h2>
            <button onClick={onClose} aria-label="Tutup">
              <Icon name="close" size={18} />
            </button>
          </header>

          <div style={{ flex: '1 1 auto', overflowY: 'auto', padding: '16px 18px' }}>
            {successMessage && (
              <div
                style={{
                  padding: '9px 12px',
                  backgroundColor: '#f0fdf4',
                  color: '#15803d',
                  border: '1px solid #bbf7d0',
                  borderRadius: '8px',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  marginBottom: '12px',
                }}
              >
                {successMessage}
              </div>
            )}

            {/* Filter and Search Bar */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '14px', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari no. struk / nama pelanggan / meja..."
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 34px',
                    border: '1px solid #d1d1d1',
                    borderRadius: '6px',
                    fontSize: '13px',
                  }}
                />
                <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#888' }}>
                  <Icon name="search" size={16} />
                </span>
              </div>

              <div className="pos-category-tabs" style={{ margin: 0 }}>
                {(['ALL', 'PAID', 'CANCELLED'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={statusFilter === s ? 'active' : ''}
                    onClick={() => setStatusFilter(s)}
                    style={{ padding: '6px 12px', fontSize: '12px' }}
                  >
                    {s === 'ALL'
                      ? 'Semua'
                      : s === 'PAID'
                      ? 'Lunas'
                      : 'Void'}
                  </button>
                ))}
              </div>
            </div>

            {/* Order Table / List */}
            <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
              {loading ? (
                <p style={{ textAlign: 'center', color: '#888', padding: '30px' }}>Memuat riwayat transaksi...</p>
              ) : filteredOrders.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#888', padding: '30px' }}>
                  Tidak ada transaksi yang cocok dengan filter.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {filteredOrders.map((order) => {
                    const badge = getStatusBadge(order.status);
                    const isExpanded = selectedOrder?.id === order.id;

                    return (
                      <div
                        key={order.id}
                        style={{
                          border: isExpanded ? '2px solid #57695b' : '1px solid #e2e2e2',
                          borderRadius: '8px',
                          backgroundColor: '#fff',
                          overflow: 'hidden',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {/* Summary Header */}
                        <div
                          onClick={() => setSelectedOrder(isExpanded ? null : order)}
                          style={{
                            padding: '12px 16px',
                            cursor: 'pointer',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: '8px',
                          }}
                        >
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <b style={{ fontSize: '14px', color: '#272727' }}>{order.order_number}</b>
                              <span
                                style={{
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  backgroundColor: badge.bg,
                                  color: badge.text,
                                }}
                              >
                                {badge.label}
                              </span>
                            </div>
                            <small style={{ color: '#666', fontSize: '12px' }}>
                              {formatDateTime(order.created_at)} · {order.order_type === 'DINE_IN' ? 'Dine In' : 'Takeaway'}
                              {order.table_number ? ` (${order.table_number})` : ''} · Kasir: {order.cashier_name || 'Kasir'}
                            </small>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                            <b style={{ fontSize: '16px', color: '#57695b' }}>{rupiah(order.total_amount)}</b>
                            <Icon name={isExpanded ? 'chevronDown' : 'chevron'} size={18} />
                          </div>
                        </div>

                        {/* Expanded Items & Actions */}
                        {isExpanded && (
                          <div style={{ padding: '12px 16px', backgroundColor: '#fcfcfc', borderTop: '1px solid #eee' }}>
                            <h4 style={{ margin: '0 0 8px', fontSize: '12px', color: '#666', textTransform: 'uppercase' }}>
                              Rincian Item Menu
                            </h4>
                            <div style={{ marginBottom: '12px' }}>
                              {order.items && order.items.length > 0 ? (
                                order.items.map((item, idx) => (
                                  <div
                                    key={idx}
                                    style={{
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      fontSize: '13px',
                                      padding: '4px 0',
                                      borderBottom: '1px dotted #e5e5e5',
                                    }}
                                  >
                                    <div>
                                      <span>
                                        {item.quantity}x <b>{item.productName}</b>
                                      </span>
                                      {item.notes && (
                                        <small style={{ display: 'block', color: '#777', fontSize: '11px' }}>
                                          Catatan: {item.notes}
                                        </small>
                                      )}
                                    </div>
                                    <span>{rupiah(item.subtotal)}</span>
                                  </div>
                                ))
                              ) : (
                                <p style={{ fontSize: '12px', color: '#888' }}>Rincian item tercatat di database.</p>
                              )}
                            </div>

                            {/* Actions toolbar */}
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                              {order.status === 'PAID' && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => onReprintReceipt(order)}
                                    style={{
                                      padding: '6px 12px',
                                      borderRadius: '6px',
                                      border: '1px solid #d1d1d1',
                                      background: '#fff',
                                      fontSize: '12px',
                                      fontWeight: 600,
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '6px',
                                    }}
                                  >
                                    <Icon name="printer" size={14} />
                                    Cetak Ulang Struk
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleOpenVoid(order)}
                                    style={{
                                      padding: '6px 12px',
                                      borderRadius: '6px',
                                      border: '1px solid #f8b4b4',
                                      background: '#fde8e8',
                                      color: '#a32424',
                                      fontSize: '12px',
                                      fontWeight: 600,
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '6px',
                                    }}
                                  >
                                    <Icon name="trash" size={14} />
                                    Void / Batalkan Transaksi
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <footer className="modal-actions" style={{ padding: '14px 20px', borderTop: '1px solid #eee' }}>
            <button type="button" onClick={fetchOrders} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Icon name="rotateCcw" size={16} />
              Muat Ulang
            </button>
            <button type="button" className="bo-primary" onClick={onClose}>
              Tutup
            </button>
          </footer>
        </div>
      </div>

      {/* Void Authorization Dialog */}
      {voidDialogOpen && orderToVoid && (
        <div className="bo-modal-layer" style={{ zIndex: 1100 }}>
          <div
            className="bo-modal"
            role="dialog"
            aria-modal="true"
            style={{ maxWidth: '440px', width: '92%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <header className="bo-modal-head">
              <div>
                <h2 style={{ color: '#b91c1c' }}>Void #{orderToVoid.order_number}</h2>
                <p>Masukkan PIN Owner (4–6 digit) untuk otorisasi.</p>
              </div>
              <button onClick={() => setVoidDialogOpen(false)} aria-label="Tutup">
                <Icon name="close" size={18} />
              </button>
            </header>

            <div style={{ flex: '1 1 auto', overflowY: 'auto', padding: '16px 18px' }}>

              {voidError && (
                <div
                  style={{
                    padding: '8px 12px',
                    backgroundColor: '#fde8e8',
                    color: '#a32424',
                    borderRadius: '6px',
                    fontSize: '12px',
                    marginBottom: '12px',
                  }}
                >
                  {voidError}
                </div>
              )}

              <label style={{ display: 'block', marginBottom: '12px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  Alasan Pembatalan
                </span>
                <input
                  type="text"
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  placeholder="Contoh: Tamu salah pesan / Urusan mendadak"
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d1d1d1',
                    borderRadius: '6px',
                    fontSize: '13px',
                  }}
                />
              </label>

              <label style={{ display: 'block', marginBottom: '16px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#a32424', display: 'block', marginBottom: '4px' }}>
                  PIN Otorisasi Owner (6 Digit)
                </span>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={voidPin}
                  onChange={(e) => setVoidPin(e.target.value)}
                  placeholder="PIN Owner (Contoh: 123456)"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '2px solid #a32424',
                    borderRadius: '6px',
                    fontSize: '16px',
                    fontWeight: 700,
                    letterSpacing: '3px',
                  }}
                />
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', cursor: 'pointer', userSelect: 'none' }}>
                <input
                  type="checkbox"
                  checked={restockStock}
                  onChange={(e) => setRestockStock(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: '#1b4332' }}
                />
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#1c2826' }}>
                  Kembalikan bahan baku ke stok (Restock)
                </span>
              </label>

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setVoidDialogOpen(false)}
                  disabled={voiding}
                  style={{ padding: '8px 14px', borderRadius: '6px', border: '1px solid #ccc', background: '#fff' }}
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmVoid}
                  disabled={voiding || voidPin.length < 4 || !voidReason.trim()}
                  className="bo-primary danger"
                  style={{ padding: '8px 16px', borderRadius: '6px' }}
                >
                  {voiding ? 'Memproses Void...' : 'Konfirmasi Batal & Cetak Void Ticket'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
