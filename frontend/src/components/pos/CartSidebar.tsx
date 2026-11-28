'use client';

import React, { useEffect, useState } from 'react';
import { CartItem, Customer } from '@/types';
import { useCart } from '@/context/CartContext';
import { rupiah } from '@/lib/utils';
import {
  Pause,
  Trash2,
  Utensils,
  ShoppingBag,
  MapPin,
  X,
  User,
  ChevronRight,
  Coffee,
  Minus,
  Plus,
  Percent,
  StickyNote,
  Split,
  CreditCard,
} from 'lucide-react';

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
  onClearPromo?: () => void;
  promoError?: string;
  promoSuccess?: string;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onCloseCart?: () => void;
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
  onClearPromo,
  promoError,
  promoSuccess,
  mobileOpen,
  onCloseMobile,
  onCloseCart,
}: CartSidebarProps) {
  const [promoInput, setPromoInput] = useState(promoCode);
  const [validatingPromo, setValidatingPromo] = useState(false);
  const [clearConfirm, setClearConfirm] = useState(false);
  const [showPromoBox, setShowPromoBox] = useState(false);
  const [showNoteBox, setShowNoteBox] = useState(false);
  const [showFeeDetails, setShowFeeDetails] = useState(false);

  useEffect(() => {
    setPromoInput(promoCode);
  }, [promoCode]);

  const {
    taxRate,
    taxAmount,
    serviceChargeRate,
    serviceChargeAmount,
    roundingAmount,
    redeemPoints,
    setRedeemPoints,
    pointsDiscountAmount,
    maxRedeemablePoints,
    grandTotal: calculatedGrandTotal,
  } = useCart();

  const subtotal = cart.reduce((sum, item) => sum + item.itemSubtotal, 0);
  const grandTotal = calculatedGrandTotal;
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

  const handleRemovePromo = () => {
    setPromoInput('');
    if (onClearPromo) {
      onClearPromo();
    }
  };

  return (
    <>
      <aside
        className={`new-pos-cart pos-cart-compact ${mobileOpen ? 'open' : ''}`}
        style={{
          backgroundColor: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          maxHeight: '100%',
          overflow: 'hidden',
          borderRadius: '16px',
          border: '1px solid #e5e5e3',
          boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
          position: 'relative',
        }}
      >
        <button
          className="pos-sheet-handle"
          onClick={onCloseMobile}
          aria-label="Tutup pesanan"
        />

        {/* 1. COMPACT CART HEADER */}
        <div
          style={{
            padding: '8px 12px',
            borderBottom: '1px solid #f0efe9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#ffffff',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 700, margin: 0, color: '#1c2826' }}>
              Pesanan Aktif
            </h2>
            {totalItemCount > 0 && (
              <span
                style={{
                  background: '#57695b',
                  color: '#ffffff',
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '1px 7px',
                  borderRadius: '10px',
                  lineHeight: '16px',
                }}
              >
                {totalItemCount}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              type="button"
              onClick={onHoldOrder}
              disabled={cart.length === 0}
              title="Tahan/parkir pesanan ini sementara"
              style={{
                background: cart.length === 0 ? '#fafaf8' : '#f0f4f1',
                border: '1px solid #dcdfd5',
                color: cart.length === 0 ? '#9ca3af' : '#57695b',
                fontSize: '11px',
                fontWeight: 600,
                cursor: cart.length === 0 ? 'default' : 'pointer',
                padding: '3px 8px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <Pause size={11} />
              <span>Tahan</span>
            </button>

            <div style={{ width: '1px', height: '14px', backgroundColor: '#e5e7eb' }} />

            {cart.length > 0 && (
              <button
                type="button"
                onClick={() => setClearConfirm(true)}
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '6px',
                  border: '1px solid #fecaca',
                  background: '#fef2f2',
                  color: '#b91c1c',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                }}
                title="Kosongkan seluruh isi keranjang"
                aria-label="Kosongkan pesanan"
              >
                <Trash2 size={12} />
              </button>
            )}

            {onCloseCart && (
              <button
                type="button"
                onClick={onCloseCart}
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '6px',
                  border: '1px solid #e5e7eb',
                  background: '#ffffff',
                  color: '#4b5563',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                }}
                title="Tutup Panel Keranjang"
                aria-label="Tutup Panel Keranjang"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {/* 2. COMPACT ORDER CONTROLS (Tipe Order + Meja / Pelanggan) */}
        <div
          style={{
            padding: '6px 12px',
            background: '#fafaf8',
            borderBottom: '1px solid #f0efe9',
            display: 'flex',
            flexDirection: 'column',
            gap: '5px',
            flexShrink: 0,
          }}
        >
          {/* Row 1: Order Type Tabs (Dine-in vs Takeaway) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '3px',
              backgroundColor: '#eeeee9',
              padding: '2px',
              borderRadius: '7px',
            }}
          >
            <button
              type="button"
              onClick={() => onSetOrderType('DINE_IN')}
              style={{
                padding: '4px 8px',
                borderRadius: '5px',
                border: 'none',
                backgroundColor: orderType === 'DINE_IN' ? '#ffffff' : 'transparent',
                color: orderType === 'DINE_IN' ? '#57695b' : '#6b7280',
                fontWeight: orderType === 'DINE_IN' ? 700 : 500,
                fontSize: '11.5px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
                cursor: 'pointer',
                boxShadow: orderType === 'DINE_IN' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.12s ease',
              }}
            >
              <Utensils size={12} />
              <span>Dine In</span>
            </button>

            <button
              type="button"
              onClick={() => onSetOrderType('TAKEAWAY')}
              style={{
                padding: '4px 8px',
                borderRadius: '5px',
                border: 'none',
                backgroundColor: orderType === 'TAKEAWAY' ? '#ffffff' : 'transparent',
                color: orderType === 'TAKEAWAY' ? '#57695b' : '#6b7280',
                fontWeight: orderType === 'TAKEAWAY' ? 700 : 500,
                fontSize: '11.5px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
                cursor: 'pointer',
                boxShadow: orderType === 'TAKEAWAY' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.12s ease',
              }}
            >
              <ShoppingBag size={12} />
              <span>Takeaway</span>
            </button>
          </div>

          {/* Row 2: Table / Takeaway input (55%) & Customer CRM button (45%) */}
          <div style={{ display: 'flex', gap: '6px' }}>
            <div style={{ flex: '1 1 55%', position: 'relative' }}>
              {orderType === 'DINE_IN' ? (
                <>
                  <input
                    id="pos-table-number-input"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={4}
                    value={selectedTable?.number || ''}
                    onChange={(e) => {
                      const digitsOnly = e.target.value.replace(/\D/g, '');
                      onSetManualTable(digitsOnly);
                    }}
                    onKeyDown={(e) => {
                      if (
                        ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight'].includes(e.key) ||
                        e.ctrlKey ||
                        e.metaKey
                      ) {
                        return;
                      }
                      if (!/^\d$/.test(e.key)) {
                        e.preventDefault();
                      }
                    }}
                    placeholder="No. Meja (angka)..."
                    title="Ketik nomor meja (hanya angka)"
                    style={{
                      width: '100%',
                      height: '30px',
                      padding: '0 24px 0 26px',
                      borderRadius: '6px',
                      border: selectedTable?.number ? '1.5px solid #57695b' : '1px solid #d1cfc7',
                      fontSize: '12px',
                      fontWeight: selectedTable?.number ? 700 : 500,
                      backgroundColor: selectedTable?.number ? '#f3f6f3' : '#ffffff',
                      color: selectedTable?.number ? '#57695b' : '#1f2937',
                      outline: 'none',
                    }}
                  />
                  <span
                    style={{
                      position: 'absolute',
                      left: '8px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: selectedTable?.number ? '#57695b' : '#9ca3af',
                      pointerEvents: 'none',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <MapPin size={12} />
                  </span>
                  {selectedTable?.number && (
                    <button
                      type="button"
                      onClick={() => onSetManualTable('')}
                      style={{
                        position: 'absolute',
                        right: '6px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: '#9ca3af',
                        cursor: 'pointer',
                        padding: '2px',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                      title="Hapus nomor meja"
                    >
                      <X size={12} />
                    </button>
                  )}
                </>
              ) : (
                <input
                  type="text"
                  value={takeawayName}
                  onChange={(e) => onSetTakeawayName(e.target.value)}
                  placeholder="Nama Pemesan..."
                  style={{
                    width: '100%',
                    height: '30px',
                    padding: '0 8px',
                    borderRadius: '6px',
                    border: takeawayName ? '1.5px solid #57695b' : '1px solid #d1cfc7',
                    fontSize: '12px',
                    fontWeight: takeawayName ? 600 : 400,
                    backgroundColor: '#ffffff',
                    outline: 'none',
                  }}
                />
              )}
            </div>

            {/* Customer CRM Pill */}
            <button
              type="button"
              onClick={onOpenCustomerModal}
              style={{
                flex: '1 1 45%',
                height: '30px',
                padding: '0 8px',
                borderRadius: '6px',
                border: customer ? '1.5px solid #57695b' : '1px solid #d1cfc7',
                backgroundColor: customer ? '#f3f6f3' : '#ffffff',
                color: customer ? '#57695b' : '#4b5563',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                fontSize: '11.5px',
                fontWeight: customer ? 700 : 500,
                overflow: 'hidden',
              }}
              title={customer ? `${customer.name} (${customer.tier})` : 'Pilih Pelanggan Member'}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                <User size={12} color={customer ? '#57695b' : '#9ca3af'} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {customer ? customer.name : '+ Member CRM'}
                </span>
              </span>
              <ChevronRight size={12} color={customer ? '#57695b' : '#9ca3af'} />
            </button>
          </div>
        </div>

        {/* 3. HERO SECTION: SCROLLABLE CART ITEMS LIST (ROOMY & LEGIBLE) */}
        <div
          style={{
            flex: '1 1 0%',
            overflowY: 'auto',
            minHeight: 0,
            padding: '6px 10px',
            scrollbarWidth: 'thin',
          }}
        >
          {cart.length === 0 ? (
            <div
              style={{
                height: '100%',
                minHeight: '140px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                padding: '20px 10px',
                color: '#8b8b8b',
              }}
            >
              <Coffee size={28} color="#cbd5e1" style={{ marginBottom: '8px' }} />
              <b style={{ fontSize: '13px', color: '#4b5563', display: 'block' }}>Keranjang Kosong</b>
              <p style={{ fontSize: '11px', color: '#9ca3af', margin: '3px 0 0' }}>
                Pilih menu di sebelah kiri atau tekan <kbd style={{ padding: '1px 4px', background: '#e5e7eb', borderRadius: '3px', fontSize: '10px' }}>F2</kbd>
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {cart.map((item, index) => {
                const basePrice = item.customization?.variantPrice ?? item.product.price;
                const unitPrice = item.customization
                  ? basePrice + (item.customization.unitPriceAdjustment || 0)
                  : item.product.price;
                const optionText =
                  item.customization?.selectedOptions && item.customization.selectedOptions.length > 0
                    ? item.customization.selectedOptions.join(' · ')
                    : '';

                return (
                  <div
                    key={`${item.product.id}-${index}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '5px 8px',
                      borderRadius: '8px',
                      backgroundColor: '#fafaf8',
                      border: '1px solid #efeee8',
                      gap: '8px',
                      transition: 'background 0.1s ease',
                    }}
                  >
                    {/* Thumbnail Foto Menu Compact */}
                    <div
                      style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '6px',
                        overflow: 'hidden',
                        border: '1px solid #e5e7eb',
                        backgroundColor: '#f3f4f6',
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {item.product.image_url ? (
                        <img
                          src={item.product.image_url}
                          alt={item.product.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <Coffee size={15} color="#9ca3af" />
                      )}
                    </div>

                    {/* Deskripsi 2 Baris Ringkas & Lega */}
                    <div style={{ flex: '1 1 0%', minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: '12.5px',
                          fontWeight: 700,
                          color: '#1f2937',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          lineHeight: '16px',
                        }}
                        title={item.product.name}
                      >
                        {item.product.name}
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          fontSize: '11px',
                          lineHeight: '15px',
                          marginTop: '1px',
                          overflow: 'hidden',
                          whiteSpace: 'nowrap',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        <span style={{ fontWeight: 700, color: '#57695b', flexShrink: 0 }}>
                          {rupiah(item.itemSubtotal)}
                        </span>
                        {item.quantity > 1 && (
                          <span style={{ color: '#9ca3af', flexShrink: 0 }}>
                            ({rupiah(unitPrice)})
                          </span>
                        )}
                        {optionText && (
                          <span
                            style={{
                              color: '#6b7280',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                            title={optionText}
                          >
                            · {optionText}
                          </span>
                        )}
                      </div>

                      {item.customization?.notes && (
                        <div
                          style={{
                            fontSize: '10.5px',
                            color: '#57695b',
                            fontStyle: 'italic',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            lineHeight: '14px',
                          }}
                        >
                          "{item.customization.notes}"
                        </div>
                      )}
                    </div>

                    {/* Stepper Buttons (Compact & Touch-Friendly 28x28px) */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
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
                          width: '28px',
                          height: '28px',
                          borderRadius: '6px',
                          border: '1.5px solid #d1d5db',
                          backgroundColor: '#ffffff',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#1f2937',
                          padding: 0,
                          touchAction: 'manipulation',
                        }}
                        title={item.quantity === 1 ? 'Hapus item' : 'Kurangi jumlah'}
                      >
                        <Minus size={13} strokeWidth={2.5} />
                      </button>

                      <b style={{ minWidth: '20px', textAlign: 'center', fontSize: '13px', fontWeight: 800, color: '#111827' }}>
                        {item.quantity}
                      </b>

                      <button
                        type="button"
                        onClick={() => onUpdateQuantity(index, item.quantity + 1)}
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '6px',
                          border: '1.5px solid #57695b',
                          backgroundColor: '#57695b',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#ffffff',
                          padding: 0,
                          touchAction: 'manipulation',
                        }}
                        title="Tambah jumlah"
                      >
                        <Plus size={13} strokeWidth={2.5} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 4. COMPACT FOOTER SUMMARY & CHECKOUT */}
        <div
          style={{
            padding: '8px 12px 10px',
            backgroundColor: '#ffffff',
            borderTop: '1px solid #f0efe9',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            flexShrink: 0,
          }}
        >
          {/* Quick Actions for Promo & Notes */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '6px',
              width: '100%',
            }}
          >
            {/* Box 1: Promo Button */}
            <button
              type="button"
              onClick={() => {
                setShowPromoBox(!showPromoBox);
                if (showNoteBox) setShowNoteBox(false);
              }}
              style={{
                height: '30px',
                padding: '0 9px',
                borderRadius: '6px',
                border: promoCode
                  ? '1.5px solid #2e7d32'
                  : showPromoBox
                  ? '1.5px solid #57695b'
                  : '1px solid #d1cfc7',
                backgroundColor: promoCode ? '#edf7ed' : showPromoBox ? '#f3f6f3' : '#ffffff',
                color: promoCode ? '#1e4620' : '#374151',
                fontSize: '11.5px',
                fontWeight: promoCode || showPromoBox ? 700 : 500,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                overflow: 'hidden',
              }}
              title={promoCode ? `Promo Aktif: ${promoCode}` : 'Masukkan Kode Promo Diskon'}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                <Percent size={13} color={promoCode ? '#2e7d32' : '#57695b'} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {promoCode ? `Promo: ${promoCode}` : '+ Promo'}
                </span>
              </span>
              <ChevronRight
                size={12}
                color={promoCode ? '#2e7d32' : '#9ca3af'}
                style={{
                  transform: showPromoBox ? 'rotate(90deg)' : 'none',
                  transition: 'transform 0.15s ease',
                  flexShrink: 0,
                }}
              />
            </button>

            {/* Box 2: Catatan Button */}
            <button
              type="button"
              onClick={() => {
                setShowNoteBox(!showNoteBox);
                if (showPromoBox) setShowPromoBox(false);
              }}
              style={{
                height: '30px',
                padding: '0 9px',
                borderRadius: '6px',
                border: orderNote
                  ? '1.5px solid #57695b'
                  : showNoteBox
                  ? '1.5px solid #57695b'
                  : '1px solid #d1cfc7',
                backgroundColor: orderNote ? '#f3f6f3' : showNoteBox ? '#f3f6f3' : '#ffffff',
                color: orderNote ? '#1c2826' : '#374151',
                fontSize: '11.5px',
                fontWeight: orderNote || showNoteBox ? 700 : 500,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                overflow: 'hidden',
              }}
              title={orderNote ? `Catatan: ${orderNote}` : 'Tambahkan Catatan Pesanan'}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                <StickyNote size={13} color={orderNote ? '#57695b' : '#6b7280'} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {orderNote ? 'Catatan Aktif' : '+ Catatan'}
                </span>
              </span>
              <ChevronRight
                size={12}
                color={orderNote ? '#57695b' : '#9ca3af'}
                style={{
                  transform: showNoteBox ? 'rotate(90deg)' : 'none',
                  transition: 'transform 0.15s ease',
                  flexShrink: 0,
                }}
              />
            </button>
          </div>

          {/* Active Note Preview Pill if closed */}
          {orderNote && !showNoteBox && (
            <div
              onClick={() => setShowNoteBox(true)}
              style={{
                padding: '6px 10px',
                backgroundColor: '#f8faf9',
                border: '1px dashed #57695b',
                borderRadius: '6px',
                fontSize: '11px',
                color: '#57695b',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '6px',
              }}
              title="Klik untuk mengubah catatan pesanan"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden', minWidth: 0 }}>
                <span style={{ fontSize: '12px', flexShrink: 0 }}>📝</span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontStyle: 'italic', fontWeight: 600 }}>
                  "{orderNote}"
                </span>
              </div>
              <small style={{ color: '#57695b', fontWeight: 700, flexShrink: 0, textDecoration: 'underline' }}>
                Ubah
              </small>
            </div>
          )}

          {/* Collapsible Promo Input Box */}
          {showPromoBox && (
            <div
              style={{
                background: '#f8faf9',
                padding: '8px 10px',
                borderRadius: '8px',
                border: '1.5px solid #57695b',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}
            >
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="text"
                  value={promoInput}
                  onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                  placeholder="KODE PROMO..."
                  style={{
                    flex: 1,
                    height: '32px',
                    padding: '0 10px',
                    borderRadius: '6px',
                    border: '1px solid #d1d5db',
                    fontSize: '12px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    fontFamily: 'monospace',
                    backgroundColor: '#ffffff',
                    outline: 'none',
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleApplyPromo();
                    }
                  }}
                />
                <button
                  type="button"
                  disabled={validatingPromo || !promoInput.trim()}
                  onClick={handleApplyPromo}
                  style={{
                    height: '32px',
                    padding: '0 12px',
                    backgroundColor: '#57695b',
                    color: '#fff',
                    borderRadius: '6px',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: validatingPromo || !promoInput.trim() ? 'not-allowed' : 'pointer',
                    opacity: validatingPromo || !promoInput.trim() ? 0.6 : 1,
                  }}
                >
                  {validatingPromo ? '...' : 'Terapkan'}
                </button>
                {promoCode && (
                  <button
                    type="button"
                    onClick={handleRemovePromo}
                    style={{
                      height: '32px',
                      padding: '0 10px',
                      backgroundColor: '#fee2e2',
                      color: '#b91c1c',
                      borderRadius: '6px',
                      border: '1px solid #fecaca',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                    title="Hapus Promo"
                  >
                    Hapus
                  </button>
                )}
              </div>
              {promoError && <small style={{ color: '#b91c1c', fontSize: '11px', fontWeight: 600 }}>{promoError}</small>}
              {promoSuccess && <small style={{ color: '#2e7d32', fontSize: '11px', fontWeight: 600 }}>{promoSuccess}</small>}
            </div>
          )}

          {/* Collapsible Note Input Box */}
          {showNoteBox && (
            <div
              style={{
                background: '#f8faf9',
                padding: '8px 10px',
                borderRadius: '8px',
                border: '1.5px solid #57695b',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}
            >
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="text"
                  value={orderNote}
                  onChange={(e) => onSetOrderNote(e.target.value)}
                  placeholder="Catatan ke koki / barista..."
                  style={{
                    flex: 1,
                    height: '32px',
                    padding: '0 10px',
                    borderRadius: '6px',
                    border: '1px solid #d1d5db',
                    fontSize: '12px',
                    backgroundColor: '#ffffff',
                    outline: 'none',
                  }}
                />
                {orderNote && (
                  <button
                    type="button"
                    onClick={() => onSetOrderNote('')}
                    style={{
                      height: '32px',
                      padding: '0 10px',
                      backgroundColor: '#fee2e2',
                      color: '#b91c1c',
                      borderRadius: '6px',
                      border: '1px solid #fecaca',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                    title="Hapus Catatan"
                  >
                    Hapus
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Loyalty Point Redemption Toggle (when Member with points is selected) */}
          {customer && Number(customer.loyalty_points || 0) > 0 && maxRedeemablePoints > 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
                padding: '6px 10px',
                borderRadius: '8px',
                border: redeemPoints > 0 ? '1px solid #15803d' : '1px dashed #c8cfc4',
                backgroundColor: redeemPoints > 0 ? '#f0fdf4' : '#f8faf8',
                fontSize: '11px',
              }}
            >
              <span style={{ color: '#374151', fontWeight: 600 }}>
                Poin: <strong>{customer.loyalty_points}</strong> ({rupiah(customer.loyalty_points * 100)})
              </span>
              <button
                type="button"
                onClick={() => setRedeemPoints(redeemPoints > 0 ? 0 : maxRedeemablePoints)}
                style={{
                  padding: '3px 8px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: redeemPoints > 0 ? '#dc2626' : '#57695b',
                  color: '#ffffff',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {redeemPoints > 0 ? 'Batal Poin' : `Tukar ${maxRedeemablePoints} pts`}
              </button>
            </div>
          )}

          {/* Price Breakdown */}
          <div style={{ fontSize: '11.5px', color: '#6b7280', display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Subtotal ({totalItemCount} item):</span>
              <b style={{ color: '#1f2937' }}>{rupiah(subtotal)}</b>
            </div>

            {discountAmount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#2e7d32' }}>
                <span>Diskon Kupon:</span>
                <b>− {rupiah(discountAmount)}</b>
              </div>
            )}

            {pointsDiscountAmount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#2e7d32' }}>
                <span>Tukar Poin ({redeemPoints} pts):</span>
                <b>− {rupiah(pointsDiscountAmount)}</b>
              </div>
            )}

            {claimedDownPayment > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#2e7d32' }}>
                <span>Uang Muka (DP):</span>
                <b>− {rupiah(claimedDownPayment)}</b>
              </div>
            )}

            {(serviceChargeAmount > 0 || taxAmount > 0 || roundingAmount !== 0) && (() => {
              const netAdjustments = serviceChargeAmount + taxAmount + roundingAmount;
              const feeLabels = [
                serviceChargeAmount > 0 ? `Servis ${serviceChargeRate}%` : '',
                taxAmount > 0 ? `PB1 ${taxRate}%` : '',
                roundingAmount !== 0 ? 'Pembulatan' : '',
              ]
                .filter(Boolean)
                .join(' · ');

              return (
                <>
                  <button
                    type="button"
                    onClick={() => setShowFeeDetails((prev) => !prev)}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      width: '100%',
                      padding: 0,
                      border: 'none',
                      background: 'transparent',
                      color: '#6b7280',
                      fontSize: '11px',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                    title="Klik untuk melihat/sembunyikan rincian pajak, servis & pembulatan"
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <span>{feeLabels}</span>
                      <span style={{ fontSize: '9.5px', opacity: 0.8 }}>{showFeeDetails ? '▾' : '▸'}</span>
                    </span>
                    <b style={{ color: '#4b5563', flexShrink: 0 }}>
                      {netAdjustments > 0
                        ? `+ ${rupiah(netAdjustments)}`
                        : netAdjustments < 0
                        ? `− ${rupiah(Math.abs(netAdjustments))}`
                        : rupiah(0)}
                    </b>
                  </button>

                  {showFeeDetails && (
                    <div
                      style={{
                        padding: '3px 6px',
                        borderRadius: '5px',
                        backgroundColor: '#fafaf8',
                        border: '1px solid #efeee8',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1px',
                        fontSize: '10.5px',
                      }}
                    >
                      {serviceChargeAmount > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#4b5563' }}>
                          <span>Service Charge ({serviceChargeRate}%):</span>
                          <b>+ {rupiah(serviceChargeAmount)}</b>
                        </div>
                      )}
                      {taxAmount > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#4b5563' }}>
                          <span>PB1 Resto ({taxRate}%):</span>
                          <b>+ {rupiah(taxAmount)}</b>
                        </div>
                      )}
                      {roundingAmount !== 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#6b7280' }}>
                          <span>Pembulatan:</span>
                          <b>{roundingAmount > 0 ? `+ ${rupiah(roundingAmount)}` : `− ${rupiah(Math.abs(roundingAmount))}`}</b>
                        </div>
                      )}
                    </div>
                  )}
                </>
              );
            })()}
          </div>

          {/* Total Bayar Headline */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: '4px',
              borderTop: '1.5px dashed #e5e7eb',
            }}
          >
            <span style={{ fontSize: '12px', fontWeight: 800, color: '#1f2937', letterSpacing: '0.3px' }}>
              TOTAL BAYAR
            </span>
            <b style={{ fontSize: '17.5px', fontWeight: 800, color: '#57695b' }}>{rupiah(grandTotal)}</b>
          </div>

          {/* Action Buttons (Split + Checkout) */}
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              type="button"
              disabled={cart.length === 0}
              onClick={onOpenSplitBill}
              title="Pisah tagihan sama rata (Split Bill)"
              style={{
                width: '36px',
                height: '38px',
                borderRadius: '8px',
                border: '1px solid #d1d5db',
                backgroundColor: '#ffffff',
                color: '#4b5563',
                cursor: cart.length === 0 ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Split size={15} />
            </button>

            {(() => {
              const isTableNeeded = orderType === 'DINE_IN' && !selectedTable?.number?.trim();
              const isCartEmpty = cart.length === 0;
              const isDisabled = isCartEmpty || isTableNeeded;

              return (
                <button
                  type="button"
                  disabled={isDisabled}
                  onClick={onOpenPayment}
                  style={{
                    flex: 1,
                    height: '38px',
                    borderRadius: '8px',
                    backgroundColor: isDisabled ? '#f3f4f6' : '#57695b',
                    color: isDisabled ? '#4b5563' : '#ffffff',
                    border: isDisabled ? '1.5px dashed #cbd5e1' : 'none',
                    fontWeight: 700,
                    fontSize: '12.5px',
                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    boxShadow: !isDisabled ? '0 2px 6px rgba(87, 105, 91, 0.25)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <CreditCard size={15} />
                  <span>
                    {isCartEmpty
                      ? 'Pilih Menu Terlebih Dahulu'
                      : isTableNeeded
                      ? 'Masukkan Nomor Meja (Angka)'
                      : `Bayar ${rupiah(grandTotal)} (F4)`}
                  </span>
                </button>
              );
            })()}
          </div>
        </div>
      </aside>

      {/* Clear Cart Confirmation Dialog */}
      {clearConfirm && (
        <div className="bo-modal-layer">
          <div className="bo-confirm" role="alertdialog">
            <h2>Kosongkan Keranjang?</h2>
            <p>Semua item dalam keranjang saat ini akan dihapus.</p>
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
