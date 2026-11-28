'use client';

import React, { useState } from 'react';
import { useOfflineSync } from '@/context/OfflineSyncContext';
import { rupiah, formatDateTime } from '@/lib/utils';
import { Icon } from '@/components/common/Icons';

interface OfflineOrdersModalProps {
  onClose: () => void;
}

export function OfflineOrdersModal({ onClose }: OfflineOrdersModalProps) {
  const {
    isOnline,
    offlineOrders,
    isSyncing,
    pendingOfflineCount,
    failedCount,
    triggerSync,
    retryOrder,
    removePromoAndRetry,
    deleteOrder,
  } = useOfflineSync();

  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showFeedback = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedbackMsg({ text, type });
    setTimeout(() => setFeedbackMsg(null), 3500);
  };

  const handleRetry = async (id: string) => {
    setLoadingId(id);
    try {
      const res = await retryOrder(id);
      showFeedback(res.message, res.success ? 'success' : 'error');
    } finally {
      setLoadingId(null);
    }
  };

  const handleRemovePromoAndRetry = async (id: string) => {
    setLoadingId(id);
    try {
      const res = await removePromoAndRetry(id);
      showFeedback(res.message, res.success ? 'success' : 'error');
    } finally {
      setLoadingId(null);
    }
  };

  const handleDelete = async (id: string, orderNumber: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus antrean offline untuk struk ${orderNumber}? Transaksi ini tidak akan dicatat ke pembukuan.`)) {
      setLoadingId(id);
      try {
        await deleteOrder(id);
        showFeedback(`Antrean struk ${orderNumber} berhasil dihapus.`, 'success');
      } finally {
        setLoadingId(null);
      }
    }
  };

  const handleSyncAll = async () => {
    const res = await triggerSync();
    if (res.syncedCount > 0) {
      showFeedback(`Berhasil menyinkronkan ${res.syncedCount} transaksi ke server!`, 'success');
    } else if (res.failedCount > 0) {
      showFeedback(`${res.failedCount} transaksi gagal disinkronkan. Periksa rincian di bawah.`, 'error');
    } else {
      showFeedback('Tidak ada transaksi yang perlu disinkronkan.', 'success');
    }
  };

  return (
    <div className="bo-modal-layer" onClick={onClose}>
      <div
        className="bo-modal"
        role="dialog"
        aria-modal="true"
        style={{ maxWidth: '680px', width: '95%', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <header className="bo-modal-head">
          <div>
            <h2>Antrean Offline ({offlineOrders.length})</h2>
            <p>
              Status: <b style={{ color: isOnline ? '#15803d' : '#b91c1c' }}>{isOnline ? 'Online' : 'Offline'}</b>
            </p>
          </div>
          <button onClick={onClose} aria-label="Tutup">
            <Icon name="close" size={18} />
          </button>
        </header>

        {/* Feedback Alert */}
        {feedbackMsg && (
          <div
            style={{
              padding: '10px 18px',
              backgroundColor: feedbackMsg.type === 'success' ? '#f0fdf4' : '#fef2f2',
              color: feedbackMsg.type === 'success' ? '#15803d' : '#b91c1c',
              borderBottom: feedbackMsg.type === 'success' ? '1px solid #bbf7d0' : '1px solid #fecaca',
              fontSize: '12.5px',
              fontWeight: 600,
            }}
          >
            {feedbackMsg.text}
          </div>
        )}

        {/* Body Content */}
        <div className="bo-modal-body" style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {offlineOrders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#71717a', fontSize: '13px' }}>
              Semua transaksi tersinkron.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {offlineOrders.map((order) => {
                const isItemLoading = loadingId === order.id;
                const grandTotal = order.payload?.totalAmount || order.payload?.payments?.reduce((s: number, p: any) => s + Number(p.amount || 0), 0) || 0;
                const hasPromo = Boolean(order.payload?.promoCode || order.payload?.promoId);

                return (
                  <div
                    key={order.id}
                    style={{
                      border: order.status === 'FAILED' ? '1.5px solid #fca5a5' : '1px solid #e2e8f0',
                      borderRadius: '10px',
                      padding: '12px 14px',
                      backgroundColor: order.status === 'FAILED' ? '#fffafb' : '#ffffff',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '6px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 700, fontSize: '14px', color: '#1e293b' }}>
                            {order.orderNumber}
                          </span>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '6px',
                              backgroundColor:
                                order.status === 'SYNCED'
                                  ? '#dcfce7'
                                  : order.status === 'FAILED'
                                  ? '#fee2e2'
                                  : order.status === 'SYNCING'
                                  ? '#dbeafe'
                                  : '#fef3c7',
                              color:
                                order.status === 'SYNCED'
                                  ? '#15803d'
                                  : order.status === 'FAILED'
                                  ? '#b91c1c'
                                  : order.status === 'SYNCING'
                                  ? '#1d4ed8'
                                  : '#b45309',
                            }}
                          >
                            {order.status === 'SYNCED'
                              ? 'BERHASIL'
                              : order.status === 'FAILED'
                              ? 'GAGAL SINKRON'
                              : order.status === 'SYNCING'
                              ? 'MENYINKRONKAN...'
                              : 'MENUNGGU KONEKSI'}
                          </span>
                        </div>
                        <span style={{ fontSize: '11.5px', color: '#64748b', display: 'block', marginTop: '2px' }}>
                          {formatDateTime(order.createdAt)} • {order.payload?.orderType === 'TAKEAWAY' ? 'Takeaway' : `Meja ${order.payload?.tableNumberFallback || '-'}`}
                        </span>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '14px', fontWeight: 800, color: '#57695b' }}>
                          {rupiah(grandTotal)}
                        </span>
                        <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>
                          {order.payload?.items?.length || 0} item
                        </span>
                      </div>
                    </div>

                    {/* Error Box if FAILED */}
                    {order.status === 'FAILED' && order.errorMessage && (
                      <div
                        style={{
                          backgroundColor: '#fee2e2',
                          color: '#991b1b',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 500,
                          lineHeight: 1.4,
                        }}
                      >
                        <b>Penyebab Gagal:</b> {order.errorMessage}
                      </div>
                    )}

                    {/* Actions */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', alignItems: 'center', marginTop: '4px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => handleDelete(order.id, order.orderNumber)}
                        disabled={isItemLoading || isSyncing}
                        style={{
                          padding: '6px 10px',
                          fontSize: '11.5px',
                          color: '#dc2626',
                          backgroundColor: '#fef2f2',
                          border: '1px solid #fecaca',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontWeight: 600,
                        }}
                      >
                        Hapus Antrean
                      </button>

                      {hasPromo && order.status === 'FAILED' && (
                        <button
                          type="button"
                          onClick={() => handleRemovePromoAndRetry(order.id)}
                          disabled={isItemLoading || isSyncing || !isOnline}
                          style={{
                            padding: '6px 12px',
                            fontSize: '11.5px',
                            color: '#b45309',
                            backgroundColor: '#fffbeb',
                            border: '1px solid #fde68a',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontWeight: 700,
                          }}
                          title="Jika voucher promo habis atau kedaluwarsa, hapus voucher dan masukkan transaksi ke pembukuan"
                        >
                          Hapus Promo & Kirim Ulang
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleRetry(order.id)}
                        disabled={isItemLoading || isSyncing || !isOnline}
                        style={{
                          padding: '6px 14px',
                          fontSize: '11.5px',
                          color: '#ffffff',
                          backgroundColor: '#57695b',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: isOnline ? 'pointer' : 'not-allowed',
                          fontWeight: 700,
                          opacity: isOnline ? 1 : 0.6,
                        }}
                      >
                        {isItemLoading ? 'Memproses...' : 'Coba Sinkronkan'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <footer
          className="bo-modal-foot"
          style={{
            borderTop: '1px solid #eeece6',
            padding: '12px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: '12px', color: '#64748b' }}>
            {pendingOfflineCount > 0 ? `${pendingOfflineCount} transaksi belum tersinkron` : 'Semua data up-to-date'}
          </span>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: '1px solid #d1d5db',
                background: '#fff',
                color: '#374151',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Tutup
            </button>

            {pendingOfflineCount > 0 && isOnline && (
              <button
                type="button"
                onClick={handleSyncAll}
                disabled={isSyncing}
                style={{
                  padding: '8px 18px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#57695b',
                  color: '#fff',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: isSyncing ? 'not-allowed' : 'pointer',
                  opacity: isSyncing ? 0.7 : 1,
                }}
              >
                {isSyncing ? 'Menyinkronkan...' : 'Sinkronkan Semua Sekarang'}
              </button>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}
