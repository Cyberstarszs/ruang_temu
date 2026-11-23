'use client';

import React, { useState } from 'react';
import { CartItem, Customer, Order } from '@/types';
import { rupiah } from '@/lib/utils';
import { Icon } from '@/components/common/Icons';

interface CartSidebarProps {
  cart: CartItem[];
  orderType: 'DINE_IN' | 'TAKEAWAY';
  selectedTable: { id?: string; number: string } | null;
  customer: Customer | null;
  orderNote: string;
  takeawayName: string;
  discountAmount: number;
  promoCode: string;
  claimedDownPayment: number;
  activeQrOrder?: Order | null;
  onCancelQrOrder?: () => void;
  onUpdateQuantity: (index: number, newQty: number) => void;
  onRemoveItem: (index: number) => void;
  onClearCart: () => void;
  onHoldOrder: () => void;
  onSetOrderType: (type: 'DINE_IN' | 'TAKEAWAY') => void;
  onSetManualTable: (tableNumber: string) => void;
  onOpenCustomerModal: () => void;
  onSetOrderNote: (note: string) => void;
  onSetTakeawayName: (name: string) => void;
  onOpenPayment: () => void;
  onOpenSplitBill: () => void;
  onValidatePromo: (code: string) => Promise<void>;
  promoError?: string;
  promoSuccess?: string;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function CartSidebar({
  cart,
  orderType,
  selectedTable,
  customer,
  orderNote,
  takeawayName,
  discountAmount,
  promoCode,
  claimedDownPayment,
  activeQrOrder,
  onCancelQrOrder,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onHoldOrder,
  onSetOrderType,
  onSetManualTable,
  onOpenCustomerModal,
  onSetOrderNote,
  onSetTakeawayName,
  onOpenPayment,
  onOpenSplitBill,
  onValidatePromo,
  promoError,
  promoSuccess,
  mobileOpen,
  onCloseMobile,
}: CartSidebarProps) {
  const [promoInput, setPromoInput] = useState(promoCode);
  const [validatingPromo, setValidatingPromo] = useState(false);
  const [clearConfirm, setClearConfirm] = useState(false);
  const [showPromoBox, setShowPromoBox] = useState(false);
  const [showNoteBox, setShowNoteBox] = useState(false);

  const subtotal = cart.reduce((sum, item) => sum + item.itemSubtotal, 0);
  const grandTotal = Math.max(0, subtotal - discountAmount - claimedDownPayment);
  const totalItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleApplyPromo = async () => {
    if (!promoInput.trim()) return;
    try {
      setValidatingPromo(true);
      await onValidatePromo(promoInput.trim());
    } finally {
      setValidatingPromo(false);
    }
  };

  return (
    <>
      <aside
        className={`new-pos-cart ${mobileOpen ? 'open' : ''}`}
        style={{
          backgroundColor: '#ffffff',
          borderLeft: '1px solid #e5e5e3',
          display: 'flex',
          flexDirection: 'column',
          height: 'calc(100vh - 64px)',
          overflow: 'hidden',
        }}
      >
        <button
          className="pos-sheet-handle"
          onClick={onCloseMobile}
          aria-label="Tutup pesanan"
        />

        {/* Cart Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #f0efe9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#272727' }}>
              Pesanan Aktif
            </h2>
            <small style={{ color: '#7a7a7a', fontSize: '12px' }}>
              {totalItemCount} item terpilih
            </small>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              type="button"
              onClick={onHoldOrder}
              disabled={cart.length === 0}
              title="Tahan/parkir pesanan ini sementara"
              style={{
                background: cart.length === 0 ? 'transparent' : '#f3f6f3',
                border: '1px solid #d1d1d1',
                color: cart.length === 0 ? '#bbb' : '#57695b',
                fontSize: '12px',
                fontWeight: 600,
                cursor: cart.length === 0 ? 'default' : 'pointer',
                padding: '4px 10px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <Icon name="pause" size={13} />
              <span>Tahan</span>
            </button>

            <button
              type="button"
              onClick={() => setClearConfirm(true)}
              disabled={cart.length === 0}
              style={{
                background: 'none',
                border: 'none',
                color: cart.length === 0 ? '#bbb' : '#a32424',
                fontSize: '12px',
                fontWeight: 600,
                cursor: cart.length === 0 ? 'default' : 'pointer',
                padding: '4px 8px',
                borderRadius: '6px',
              }}
            >
              Kosongkan
            </button>
          </div>
        </div>

        {/* Active QR Order Banner */}
        {activeQrOrder && (
          <div
            style={{
              padding: '10px 16px',
              backgroundColor: '#eef6ef',
              borderBottom: '1px solid #d4e7d7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '12px',
              color: '#2d6a4f',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
              <Icon name="qrCode" size={16} />
              <div style={{ minWidth: 0 }}>
                <b style={{ display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  QR #{activeQrOrder.order_number} {activeQrOrder.table_number ? `(Meja ${activeQrOrder.table_number})` : ''}
                </b>
                <span style={{ fontSize: '11px', color: '#57695b' }}>
                  Selesaikan pembayaran di kasir
                </span>
              </div>
            </div>
            {onCancelQrOrder && (
              <button
                type="button"
                onClick={onCancelQrOrder}
                title="Batal bayar pesanan QR ini"
                style={{
                  background: 'none',
                  border: '1px solid #d4e7d7',
                  borderRadius: '4px',
                  backgroundColor: '#ffffff',
                  color: '#a32424',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: '2px 8px',
                  flexShrink: 0,
                }}
              >
                Batal
              </button>
            )}
          </div>
        )}

        {/* Order Type Tabs (Dine-in vs Takeaway) */}
        <div style={{ padding: '12px 20px 8px' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '4px',
              backgroundColor: '#f5f4f0',
              padding: '4px',
              borderRadius: '8px',
            }}
          >
            <button
              type="button"
              onClick={() => onSetOrderType('DINE_IN')}
              style={{
                padding: '8px 10px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: orderType === 'DINE_IN' ? '#ffffff' : 'transparent',
                color: orderType === 'DINE_IN' ? '#57695b' : '#666',
                fontWeight: orderType === 'DINE_IN' ? 700 : 500,
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                cursor: 'pointer',
                boxShadow: orderType === 'DINE_IN' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <Icon name="utensils" size={15} />
              <span>Dine In</span>
            </button>

            <button
              type="button"
              onClick={() => onSetOrderType('TAKEAWAY')}
              style={{
                padding: '8px 10px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: orderType === 'TAKEAWAY' ? '#ffffff' : 'transparent',
                color: orderType === 'TAKEAWAY' ? '#57695b' : '#666',
                fontWeight: orderType === 'TAKEAWAY' ? 700 : 500,
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                cursor: 'pointer',
                boxShadow: orderType === 'TAKEAWAY' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <Icon name="shoppingBag" size={15} />
              <span>Takeaway</span>
            </button>
          </div>
        </div>

        {/* Table Selector / Takeaway Name */}
        <div style={{ padding: '0 20px 8px' }}>
          {orderType === 'DINE_IN' ? (
            <div style={{ position: 'relative' }}>
              <input
                id="pos-table-number-input"
                type="text"
                value={selectedTable?.number || ''}
                onChange={(e) => onSetManualTable(e.target.value)}
                placeholder="Ketik Nomor Meja (Contoh: 01, M05, Akrilik 2)..."
                style={{
                  width: '100%',
                  padding: '10px 36px 10px 36px',
                  borderRadius: '8px',
                  border: selectedTable?.number ? '1.5px solid #57695b' : '1px solid #d1cfc7',
                  fontSize: '13px',
                  fontWeight: selectedTable?.number ? 700 : 500,
                  backgroundColor: selectedTable?.number ? '#f3f6f3' : '#fafaf8',
                  color: selectedTable?.number ? '#57695b' : '#333',
                  outline: 'none',
                }}
              />
              <span
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: selectedTable?.number ? '#57695b' : '#888',
                  pointerEvents: 'none',
                }}
              >
                <Icon name="pin" size={16} />
              </span>
              {selectedTable?.number && (
                <button
                  type="button"
                  onClick={() => onSetManualTable('')}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#888',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  title="Hapus nomor meja"
                  aria-label="Hapus nomor meja"
                >
                  <Icon name="close" size={14} />
                </button>
              )}
            </div>
          ) : (
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                value={takeawayName}
                onChange={(e) => onSetTakeawayName(e.target.value)}
                placeholder="Nama Pemesan (Contoh: Dimas)..."
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid #e0dfd8',
                  fontSize: '13px',
                  backgroundColor: '#fafaf8',
                }}
              />
            </div>
          )}
        </div>

        {/* Customer Loyalty (CRM) Chip */}
        <div style={{ padding: '0 20px 10px' }}>
          <button
            type="button"
            onClick={onOpenCustomerModal}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '8px',
              border: customer ? '1px solid #57695b' : '1px solid #e5e5e3',
              backgroundColor: customer ? '#f7f9f7' : '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Icon name="user" size={16} className={customer ? 'text-[#57695b]' : 'text-[#888]'} />
              <div>
                <span style={{ fontSize: '12px', fontWeight: 600, color: customer ? '#57695b' : '#555' }}>
                  {customer ? customer.name : 'Tambah Pelanggan (Member CRM)'}
                </span>
                {customer && (
                  <small style={{ display: 'block', fontSize: '10px', color: '#666' }}>
                    Tier {customer.tier} · {customer.loyalty_points} poin
                  </small>
                )}
              </div>
            </div>
            <Icon name="chevron" size={14} className="text-[#888]" />
          </button>
        </div>

        {/* Scrollable Cart Items */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '0 20px',
            borderTop: '1px solid #f2f1ed',
            borderBottom: '1px solid #f2f1ed',
          }}
        >
          {cart.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '40px 10px',
                color: '#8b8b8b',
              }}
            >
              <Icon name="coffee" size={36} className="text-[#bbb] mx-auto mb-2 opacity-50" />
              <b style={{ fontSize: '13px', color: '#555', display: 'block' }}>Keranjang Kosong</b>
              <p style={{ fontSize: '11px', margin: '4px 0 0' }}>
                Pilih menu di sebelah kiri atau tekan <kbd style={{ padding: '1px 4px', background: '#eee', borderRadius: '3px' }}>F2</kbd> untuk mencari.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px 0' }}>
              {cart.map((item, index) => (
                <div
                  key={`${item.product.id}-${index}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    backgroundColor: '#fafaf8',
                    border: '1px solid #f0efe9',
                  }}
                >
                  <div style={{ flex: 1, paddingRight: '8px' }}>
                    <b style={{ fontSize: '13px', color: '#272727', display: 'block' }}>
                      {item.product.name}
                    </b>
                    {item.customization && (
                      <small style={{ fontSize: '11px', color: '#666', display: 'block', marginTop: '1px' }}>
                        {item.customization.selectedOptions.join(' · ')}
                      </small>
                    )}
                    {item.customization?.notes && (
                      <small style={{ fontSize: '11px', color: '#57695b', fontStyle: 'italic', display: 'block' }}>
                        "{item.customization.notes}"
                      </small>
                    )}
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#57695b', marginTop: '2px', display: 'block' }}>
                      {rupiah(item.itemSubtotal)}
                    </span>
                  </div>

                  {/* Stepper Buttons */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        if (item.quantity > 1) {
                          onUpdateQuantity(index, item.quantity - 1);
                        } else {
                          onRemoveItem(index);
                        }
                      }}
                      style={{
                        width: '30px',
                        height: '30px',
                        borderRadius: '6px',
                        border: '1px solid #dcdbd5',
                        backgroundColor: '#fff',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#444',
                        fontSize: '15px',
                        fontWeight: 700,
                        touchAction: 'manipulation',
                      }}
                    >
                      −
                    </button>
                    <b style={{ minWidth: '22px', textAlign: 'center', fontSize: '13.5px' }}>
                      {item.quantity}
                    </b>
                    <button
                      type="button"
                      onClick={() => onUpdateQuantity(index, item.quantity + 1)}
                      style={{
                        width: '30px',
                        height: '30px',
                        borderRadius: '6px',
                        border: '1px solid #dcdbd5',
                        backgroundColor: '#fff',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#444',
                        fontSize: '15px',
                        fontWeight: 700,
                        touchAction: 'manipulation',
                      }}
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Summary & Checkout */}
        <div style={{ padding: '14px 20px', backgroundColor: '#ffffff' }}>
          {/* Quick toggle for Promo & Notes */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '10px' }}>
            <button
              type="button"
              onClick={() => setShowPromoBox(!showPromoBox)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '11px',
                fontWeight: 600,
                color: promoCode ? '#2d6a4f' : '#666',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <Icon name="percent" size={13} />
              {promoCode ? `Kupon: ${promoCode}` : '+ Tambah Promo'}
            </button>

            <button
              type="button"
              onClick={() => setShowNoteBox(!showNoteBox)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '11px',
                fontWeight: 600,
                color: orderNote ? '#57695b' : '#666',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <Icon name="stickyNote" size={13} />
              {orderNote ? 'Catatan Aktif' : '+ Catatan Dapur/Bar'}
            </button>
          </div>

          {/* Collapsible Promo Box */}
          {showPromoBox && (
            <div style={{ marginBottom: '10px' }}>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="text"
                  value={promoInput}
                  onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                  placeholder="KODE PROMO..."
                  style={{
                    flex: 1,
                    padding: '6px 10px',
                    borderRadius: '6px',
                    border: '1px solid #d1cfc7',
                    fontSize: '12px',
                    textTransform: 'uppercase',
                  }}
                />
                <button
                  type="button"
                  disabled={validatingPromo || !promoInput.trim()}
                  onClick={handleApplyPromo}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: '#57695b',
                    color: '#fff',
                    borderRadius: '6px',
                    border: 'none',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {validatingPromo ? '...' : 'Terapkan'}
                </button>
              </div>
              {promoError && <small style={{ color: '#a32424', fontSize: '10px', display: 'block', marginTop: '3px' }}>{promoError}</small>}
              {promoSuccess && <small style={{ color: '#2d6a4f', fontSize: '10px', display: 'block', marginTop: '3px' }}>{promoSuccess}</small>}
            </div>
          )}

          {/* Collapsible Note Box */}
          {showNoteBox && (
            <div style={{ marginBottom: '10px' }}>
              <input
                type="text"
                value={orderNote}
                onChange={(e) => onSetOrderNote(e.target.value)}
                placeholder="Catatan ke koki/barista..."
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: '1px solid #d1cfc7',
                  fontSize: '12px',
                }}
              />
            </div>
          )}

          {/* Price Breakdown */}
          <div style={{ fontSize: '12px', color: '#555', marginBottom: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span>Subtotal:</span>
              <b style={{ color: '#272727' }}>{rupiah(subtotal)}</b>
            </div>

            {discountAmount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', color: '#2d6a4f' }}>
                <span>Diskon Kupon:</span>
                <b>− {rupiah(discountAmount)}</b>
              </div>
            )}

            {claimedDownPayment > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', color: '#2d6a4f' }}>
                <span>Uang Muka Reservasi (DP):</span>
                <b>− {rupiah(claimedDownPayment)}</b>
              </div>
            )}
          </div>

          {/* Total Nett */}
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              paddingTop: '8px',
              borderTop: '1.5px solid #272727',
              marginBottom: '12px',
            }}
          >
            <div>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#272727', display: 'block' }}>
                TOTAL BAYAR
              </span>
              <small style={{ fontSize: '10px', color: '#777' }}>Nett (0% Pajak, 0% Servis)</small>
            </div>
            <b style={{ fontSize: '22px', fontWeight: 700, color: '#57695b' }}>{rupiah(grandTotal)}</b>
          </div>

          {/* Primary Action Button (Bayar F4) */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              disabled={cart.length === 0}
              onClick={onOpenSplitBill}
              title="Pisah tagihan sama rata"
              style={{
                padding: '12px 14px',
                borderRadius: '8px',
                border: '1px solid #d1d1d1',
                backgroundColor: '#ffffff',
                color: '#444',
                cursor: cart.length === 0 ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="split" size={18} />
            </button>

            <button
              type="button"
              disabled={cart.length === 0 || (orderType === 'DINE_IN' && !selectedTable)}
              onClick={onOpenPayment}
              style={{
                flex: 1,
                padding: '12px 16px',
                borderRadius: '8px',
                backgroundColor: cart.length === 0 || (orderType === 'DINE_IN' && !selectedTable) ? '#d1d5db' : '#57695b',
                color: '#ffffff',
                border: 'none',
                fontWeight: 700,
                fontSize: '14px',
                cursor: cart.length === 0 || (orderType === 'DINE_IN' && !selectedTable) ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: cart.length > 0 ? '0 2px 6px rgba(87, 105, 91, 0.25)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <Icon name="creditCard" size={18} />
              <span>
                {cart.length === 0
                  ? 'Pilih Menu Dulu'
                  : orderType === 'DINE_IN' && !selectedTable
                  ? 'Pilih Nomor Meja'
                  : `Bayar ${rupiah(grandTotal)} (F4)`}
              </span>
            </button>
          </div>
        </div>
      </aside>

      {/* Clear Cart Confirmation Dialog */}
      {clearConfirm && (
        <div className="bo-modal-layer">
          <div className="bo-confirm" role="alertdialog">
            <span>
              <Icon name="trash" size={28} />
            </span>
            <h2>Kosongkan Pesanan?</h2>
            <p>Seluruh item dalam keranjang belanja saat ini akan dihapus.</p>
            <div>
              <button type="button" onClick={() => setClearConfirm(false)}>
                Batal
              </button>
              <button
                type="button"
                className="danger"
                onClick={() => {
                  onClearCart();
                  setClearConfirm(false);
                }}
              >
                Kosongkan
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
