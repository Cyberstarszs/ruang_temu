'use client';

import React, { useState } from 'react';
import { HeldOrder } from '@/types';
import { rupiah, formatDateTime } from '@/lib/utils';
import { Icon } from '@/components/common/Icons';

interface HeldOrdersModalProps {
  heldOrders: HeldOrder[];
  onRecall: (order: HeldOrder) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export function HeldOrdersModal({
  heldOrders,
  onRecall,
  onDelete,
  onClose,
}: HeldOrdersModalProps) {
  const [orderToDelete, setOrderToDelete] = useState<HeldOrder | null>(null);
  return (
    <div className="bo-modal-layer" onClick={onClose}>
      <div
        className="bo-modal"
        role="dialog"
        aria-modal="true"
        style={{ maxWidth: '640px', width: '94%', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <header className="bo-modal-head" style={{ borderBottom: '1px solid #eeece6' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: '#f0f4f0',
                  color: '#57695b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name="pause" size={16} />
              </div>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#272727' }}>
                Pesanan Ditahan ({heldOrders.length})
              </h2>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#777' }}>
              Daftar transaksi yang diparkir sementara oleh kasir untuk memproses antrean lain.
            </p>
          </div>
          <button onClick={onClose} aria-label="Tutup" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <Icon name="close" size={20} />
          </button>
        </header>

        {/* Content Body */}
        <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1 }}>
          {heldOrders.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '60px 20px',
                backgroundColor: '#fbfbfa',
                borderRadius: '12px',
                border: '1px dashed #dedcd5',
              }}
            >
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  backgroundColor: '#f3f4f1',
                  color: '#8b8a85',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 12px',
                }}
              >
                <Icon name="pause" size={24} />
              </div>
              <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#333', margin: '0 0 6px' }}>
                Belum Ada Pesanan yang Ditahan
              </h3>
              <p style={{ fontSize: '13px', color: '#888', maxWidth: '340px', margin: '0 auto', lineHeight: 1.5 }}>
                Saat kasir sedang menyusun pesanan pelanggan dan pelanggan ingin menunggu atau menambah teman, klik tombol <b>"Tahan"</b> di bilah keranjang.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {heldOrders.map((order) => {
                const totalQty = order.items.reduce((s, i) => s + i.quantity, 0);
                const orderLabel =
                  order.orderType === 'DINE_IN'
                    ? order.selectedTable
                      ? `Meja ${order.selectedTable.number}`
                      : 'Meja (Belum Ditentukan)'
                    : `Takeaway (${order.takeawayName || 'Tanpa Nama'})`;

                return (
                  <div
                    key={order.id}
                    style={{
                      border: '1px solid #e7e5dc',
                      borderRadius: '10px',
                      backgroundColor: '#ffffff',
                      padding: '16px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {/* Card Header */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderBottom: '1px solid #f3f2ee',
                        paddingBottom: '10px',
                        marginBottom: '10px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 700,
                            letterSpacing: '0.3px',
                            backgroundColor: order.orderType === 'DINE_IN' ? '#eef4ef' : '#f3f1e9',
                            color: order.orderType === 'DINE_IN' ? '#2d6a4f' : '#6b5e3f',
                          }}
                        >
                          {orderLabel}
                        </span>
                        {order.customer && (
                          <span
                            style={{
                              padding: '3px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 600,
                              backgroundColor: '#f0f3f6',
                              color: '#3d5a80',
                            }}
                          >
                            Member: {order.customer.name}
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#888' }}>
                        <Icon name="clock" size={13} />
                        <span>{formatDateTime(order.heldAt)}</span>
                      </div>
                    </div>

                    {/* Items Summary */}
                    <div style={{ marginBottom: '12px' }}>
                      <div
                        style={{
                          fontSize: '12px',
                          color: '#555',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px',
                          maxHeight: '120px',
                          overflowY: 'auto',
                        }}
                      >
                        {order.items.map((item, idx) => (
                          <div
                            key={idx}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              padding: '2px 0',
                            }}
                          >
                            <span>
                              <b>{item.quantity}x</b> {item.product.name}
                              {item.customization && (
                                <span style={{ color: '#888', fontSize: '11px', marginLeft: '4px' }}>
                                  ({item.customization.size}
                                  {item.customization.iceLevel ? `, ${item.customization.iceLevel}` : ''})
                                </span>
                              )}
                            </span>
                            <span style={{ fontWeight: 600 }}>{rupiah(item.itemSubtotal)}</span>
                          </div>
                        ))}
                      </div>

                      {order.orderNote && (
                        <p
                          style={{
                            fontSize: '11px',
                            color: '#777',
                            margin: '8px 0 0',
                            fontStyle: 'italic',
                            backgroundColor: '#fafaf8',
                            padding: '4px 8px',
                            borderRadius: '4px',
                          }}
                        >
                          Catatan: {order.orderNote}
                        </p>
                      )}
                    </div>

                    {/* Footer / Total & Actions */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderTop: '1px solid #f3f2ee',
                        paddingTop: '12px',
                      }}
                    >
                      <div>
                        <span style={{ fontSize: '11px', color: '#888', display: 'block' }}>
                          Total ({totalQty} item)
                        </span>
                        <b style={{ fontSize: '16px', color: '#272727' }}>
                          {rupiah(order.grandTotal)}
                        </b>
                      </div>

                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => setOrderToDelete(order)}
                          style={{
                            padding: '7px 12px',
                            borderRadius: '6px',
                            border: '1px solid #f5c2c7',
                            backgroundColor: '#fff',
                            color: '#a32424',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <Icon name="trash" size={14} />
                          <span>Hapus</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onRecall(order)}
                          style={{
                            padding: '7px 14px',
                            borderRadius: '6px',
                            border: 'none',
                            backgroundColor: '#57695b',
                            color: '#ffffff',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: '0 1px 2px rgba(87,105,91,0.2)',
                          }}
                        >
                          <Icon name="rotateCcw" size={14} />
                          <span>Muat ke Kasir</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <footer
          style={{
            padding: '12px 20px',
            borderTop: '1px solid #eeece6',
            backgroundColor: '#fafaf8',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: '1px solid #d1d1d1',
              backgroundColor: '#ffffff',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Tutup
          </button>
        </footer>
      </div>

      {/* Dialog Konfirmasi Hapus Pesanan Tahanan Kustom */}
      {orderToDelete && (
        <div
          className="bo-modal-layer"
          style={{ zIndex: 1100 }}
          onClick={() => setOrderToDelete(null)}
        >
          <div
            className="bo-confirm"
            role="alertdialog"
            onClick={(e) => e.stopPropagation()}
          >
            <span>
              <Icon name="trash" size={26} />
            </span>
            <h2>Hapus Pesanan Tahanan?</h2>
            <p>
              Pesanan untuk{' '}
              <strong>
                {orderToDelete.customer?.name
                  ? orderToDelete.customer.name
                  : orderToDelete.orderType === 'DINE_IN'
                  ? orderToDelete.selectedTable?.number
                    ? `Meja ${orderToDelete.selectedTable.number}`
                    : 'Dine-In'
                  : orderToDelete.takeawayName
                  ? `Takeaway (${orderToDelete.takeawayName})`
                  : 'Takeaway'}
              </strong>{' '}
              ({rupiah(orderToDelete.grandTotal)}) akan dihapus permanen dari daftar antrean tahan.
            </p>
            <div>
              <button
                type="button"
                onClick={() => setOrderToDelete(null)}
              >
                Batal
              </button>
              <button
                type="button"
                className="danger"
                onClick={() => {
                  onDelete(orderToDelete.id);
                  setOrderToDelete(null);
                }}
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
