'use client';

import React, { useState } from 'react';
import { rupiah, formatDateTime } from '@/lib/utils';
import { Icon } from '@/components/common/Icons';

interface ReceiptModalProps {
  orderData: {
    orderNumber: string;
    orderType: string;
    tableNumber?: string | null;
    cashierName?: string;
    customerName?: string;
    createdAt?: string;
    items: Array<{
      productName: string;
      quantity: number;
      unitPrice: number;
      subtotal: number;
      printTarget?: string;
      notes?: string | null;
      modifiers?: any;
    }>;
    subtotal: number;
    discountAmount: number;
    claimedDownPayment: number;
    totalAmount: number;
    paymentMethod: string;
    cashReceived?: number | null;
    cashChange?: number | null;
    isOffline?: boolean;
    notes?: string | null;
  };
  onClose: () => void;
}

export function ReceiptModal({ orderData, onClose }: ReceiptModalProps) {
  const [activeTab, setActiveTab] = useState<'CUSTOMER' | 'BAR' | 'KITCHEN'>('CUSTOMER');

  const barItems = orderData.items.filter((i) => i.printTarget === 'BAR_PRINTER');
  const kitchenItems = orderData.items.filter((i) => i.printTarget === 'KITCHEN_PRINTER');

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="bo-modal-layer" onClick={onClose}>
      <div
        className="bo-modal"
        role="dialog"
        aria-modal="true"
        style={{ maxWidth: '640px', width: '92%' }}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="bo-modal-head">
          <div>
            <h2>Struk Transaksi Selesai</h2>
            <p>ID Transaksi: {orderData.orderNumber}</p>
          </div>
          <button onClick={onClose} aria-label="Tutup">
            <Icon name="close" size={20} />
          </button>
        </header>

        {/* Offline Notification Banner */}
        {orderData.isOffline && (
          <div
            style={{
              margin: '12px 20px 0',
              padding: '10px 14px',
              backgroundColor: '#fffbeb',
              border: '1px solid #fde68a',
              borderRadius: '8px',
              color: '#92400e',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              lineHeight: 1.4,
            }}
          >
            <Icon name="circleAlert" size={18} />
            <span>
              <strong>Mode Offline:</strong> Transaksi tersimpan lokal di kasir (IndexedDB). Struk tetap dapat dicetak dan transaksi akan otomatis disinkronkan ke server pusat saat koneksi pulih.
            </span>
          </div>
        )}

        {/* Global Order Note Banner */}
        {orderData.notes && (
          <div
            style={{
              margin: '12px 20px 0',
              padding: '10px 14px',
              backgroundColor: '#fefce8',
              border: '1px solid #fef08a',
              borderRadius: '8px',
              color: '#854d0e',
              fontSize: '12.5px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
              lineHeight: 1.4,
            }}
          >
            <Icon name="stickyNote" size={16} />
            <div>
              <strong style={{ display: 'block', fontSize: '11px', color: '#a16207', textTransform: 'uppercase' }}>
                Catatan Pesanan:
              </strong>
              <span>"{orderData.notes}"</span>
            </div>
          </div>
        )}

        {/* Tab switchers */}
        <div className="pos-type-tabs" style={{ margin: '12px 20px 0' }}>
          <button
            type="button"
            className={activeTab === 'CUSTOMER' ? 'active' : ''}
            onClick={() => setActiveTab('CUSTOMER')}
          >
            <Icon name="receipt" size={16} />
            <span>Struk Pelanggan</span>
          </button>
          {barItems.length > 0 && (
            <button
              type="button"
              className={activeTab === 'BAR' ? 'active' : ''}
              onClick={() => setActiveTab('BAR')}
            >
              <Icon name="coffee" size={16} />
              <span>Checker Bar ({barItems.length})</span>
            </button>
          )}
          {kitchenItems.length > 0 && (
            <button
              type="button"
              className={activeTab === 'KITCHEN' ? 'active' : ''}
              onClick={() => setActiveTab('KITCHEN')}
            >
              <Icon name="utensils" size={16} />
              <span>Checker Dapur ({kitchenItems.length})</span>
            </button>
          )}
        </div>

        {/* Printable Paper Preview */}
        <div style={{ flex: '1 1 auto', overflowY: 'auto', padding: '16px 20px' }}>
          <div
            id="printable-receipt"
            style={{
              width: '320px',
              margin: '0 auto',
              backgroundColor: '#fff',
              border: '1px solid #d1d1d1',
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              padding: '20px 16px',
              fontFamily: 'monospace',
              fontSize: '12px',
              color: '#111',
              lineHeight: 1.4,
            }}
          >
            {activeTab === 'CUSTOMER' && (
              <>
                <div style={{ textAlign: 'center', marginBottom: '14px' }}>
                  <b style={{ fontSize: '16px', letterSpacing: '1px', display: 'block' }}>RUANG TEMU</b>
                  <span style={{ fontSize: '11px', display: 'block' }}>Coffee, Eatery, Community</span>
                  <span style={{ fontSize: '10px', color: '#555' }}>Jl. Ruang Temu No. 1</span>
                  {orderData.isOffline && (
                    <div
                      style={{
                        margin: '6px 0 2px',
                        padding: '3px 0',
                        border: '1px dashed #111',
                        fontSize: '11px',
                        fontWeight: 700,
                        letterSpacing: '0.5px',
                      }}
                    >
                      [ STRUK TRANSAKSI OFFLINE ]
                    </div>
                  )}
                  <div style={{ margin: '8px 0', borderBottom: '1px dashed #888' }} />
                </div>

                <div style={{ fontSize: '11px', marginBottom: '10px' }}>
                  <div>No : {orderData.orderNumber}</div>
                  <div>Tgl: {formatDateTime(orderData.createdAt || new Date().toISOString())}</div>
                  <div>Kasir: {orderData.cashierName || 'Kasir'}</div>
                  <div>
                    Tipe: {orderData.orderType === 'DINE_IN' ? 'Dine In' : 'Takeaway'}
                    {orderData.tableNumber ? ` | Meja: ${orderData.tableNumber}` : ''}
                  </div>
                  {orderData.customerName && <div>Tamu: {orderData.customerName}</div>}
                  <div style={{ margin: '8px 0', borderBottom: '1px dashed #888' }} />
                </div>

                {/* Items */}
                <div style={{ marginBottom: '10px' }}>
                  {orderData.items.map((item, idx) => (
                    <div key={idx} style={{ marginBottom: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>
                          {item.quantity}x {item.productName}
                        </span>
                        <span>{rupiah(item.subtotal)}</span>
                      </div>
                      {item.notes && (
                        <div style={{ fontSize: '10px', color: '#555', paddingLeft: '14px' }}>
                          * {item.notes}
                        </div>
                      )}
                    </div>
                  ))}
                  <div style={{ margin: '8px 0', borderBottom: '1px dashed #888' }} />
                </div>

                {/* Totals */}
                <div style={{ fontSize: '11px', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Subtotal:</span>
                    <span>{rupiah(orderData.subtotal)}</span>
                  </div>
                  {orderData.discountAmount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#2d6a4f' }}>
                      <span>Diskon:</span>
                      <span>− {rupiah(orderData.discountAmount)}</span>
                    </div>
                  )}
                  {orderData.claimedDownPayment > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#2d6a4f' }}>
                      <span>Potongan DP:</span>
                      <span>− {rupiah(orderData.claimedDownPayment)}</span>
                    </div>
                  )}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontWeight: 700,
                      fontSize: '13px',
                      marginTop: '4px',
                      borderTop: '1px solid #111',
                      paddingTop: '4px',
                    }}
                  >
                    <span>TOTAL:</span>
                    <span>{rupiah(orderData.totalAmount)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                    <span>Bayar ({orderData.paymentMethod}):</span>
                    <span>{rupiah(orderData.cashReceived || orderData.totalAmount)}</span>
                  </div>
                  {orderData.cashChange !== undefined && orderData.cashChange !== null && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Kembalian:</span>
                      <span>{rupiah(orderData.cashChange)}</span>
                    </div>
                  )}
                  <div style={{ margin: '8px 0', borderBottom: '1px dashed #888' }} />
                </div>

                {/* Global Order Note on Customer Receipt */}
                {orderData.notes && (
                  <div
                    style={{
                      marginBottom: '10px',
                      padding: '6px 8px',
                      border: '1px dashed #888',
                      backgroundColor: '#fafafa',
                      fontSize: '11px',
                    }}
                  >
                    <b>Catatan Pesanan:</b>
                    <div style={{ marginTop: '2px', fontStyle: 'italic' }}>"{orderData.notes}"</div>
                  </div>
                )}

                <div style={{ textAlign: 'center', fontSize: '10px', color: '#444' }}>
                  <div>Harga sudah bersih (0% Pajak, 0% Layanan)</div>
                  <div>Terima kasih atas kunjungan Anda!</div>
                  <div style={{ marginTop: '4px', fontWeight: 700 }}>WiFi: RuangTemuGuest / temu2026</div>
                </div>
              </>
            )}

            {activeTab === 'BAR' && (
              <>
                <div style={{ textAlign: 'center', marginBottom: '12px', borderBottom: '2px solid #111', paddingBottom: '6px' }}>
                  <b style={{ fontSize: '15px' }}>CHECKER: BAR KOPI</b>
                  {orderData.isOffline && (
                    <div style={{ fontSize: '10px', fontWeight: 700, marginTop: '2px' }}>
                      [ OFFLINE - TERSIMPAN LOKAL ]
                    </div>
                  )}
                  <div style={{ fontSize: '11px', marginTop: '4px' }}>
                    {orderData.tableNumber ? `MEJA: ${orderData.tableNumber}` : 'TAKEAWAY'}
                  </div>
                  <div style={{ fontSize: '10px', color: '#555' }}>
                    {orderData.orderNumber} · {formatDateTime(orderData.createdAt || new Date().toISOString())}
                  </div>
                </div>
                <div style={{ fontSize: '13px' }}>
                  {barItems.map((item, idx) => (
                    <div key={idx} style={{ marginBottom: '8px', borderBottom: '1px dotted #ccc', paddingBottom: '4px' }}>
                      <div style={{ fontWeight: 700 }}>
                        [ ] {item.quantity}x {item.productName}
                      </div>
                      {item.notes && <div style={{ fontSize: '11px', color: '#333' }}>Catatan: {item.notes}</div>}
                    </div>
                  ))}
                </div>
                {orderData.notes && (
                  <div style={{ marginTop: '10px', paddingTop: '6px', borderTop: '2px solid #111', fontSize: '11px' }}>
                    <b>CATATAN PESANAN:</b>
                    <div style={{ marginTop: '2px' }}>"{orderData.notes}"</div>
                  </div>
                )}
              </>
            )}

            {activeTab === 'KITCHEN' && (
              <>
                <div style={{ textAlign: 'center', marginBottom: '12px', borderBottom: '2px solid #111', paddingBottom: '6px' }}>
                  <b style={{ fontSize: '15px' }}>CHECKER: DAPUR MAKANAN</b>
                  {orderData.isOffline && (
                    <div style={{ fontSize: '10px', fontWeight: 700, marginTop: '2px' }}>
                      [ OFFLINE - TERSIMPAN LOKAL ]
                    </div>
                  )}
                  <div style={{ fontSize: '11px', marginTop: '4px' }}>
                    {orderData.tableNumber ? `MEJA: ${orderData.tableNumber}` : 'TAKEAWAY'}
                  </div>
                  <div style={{ fontSize: '10px', color: '#555' }}>
                    {orderData.orderNumber} · {formatDateTime(orderData.createdAt || new Date().toISOString())}
                  </div>
                </div>
                <div style={{ fontSize: '13px' }}>
                  {kitchenItems.map((item, idx) => (
                    <div key={idx} style={{ marginBottom: '8px', borderBottom: '1px dotted #ccc', paddingBottom: '4px' }}>
                      <div style={{ fontWeight: 700 }}>
                        [ ] {item.quantity}x {item.productName}
                      </div>
                      {item.notes && <div style={{ fontSize: '11px', color: '#333' }}>Catatan: {item.notes}</div>}
                    </div>
                  ))}
                </div>
                {orderData.notes && (
                  <div style={{ marginTop: '10px', paddingTop: '6px', borderTop: '2px solid #111', fontSize: '11px' }}>
                    <b>CATATAN PESANAN:</b>
                    <div style={{ marginTop: '2px' }}>"{orderData.notes}"</div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <footer className="modal-actions" style={{ padding: '14px 20px', borderTop: '1px solid #eee' }}>
          <button type="button" onClick={handlePrint}>
            <Icon name="printer" size={16} />
            Cetak ke Printer
          </button>
          <button type="button" className="bo-primary" onClick={onClose}>
            <Icon name="check" size={16} />
            Pesanan Baru Selesai
          </button>
        </footer>
      </div>
    </div>
  );
}
