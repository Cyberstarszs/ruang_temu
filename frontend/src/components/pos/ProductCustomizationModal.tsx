'use client';

import React, { useState, useMemo } from 'react';
import { Product, CartCustomization } from '@/types';
import { rupiah } from '@/lib/utils';
import { X, Check } from 'lucide-react';

interface ProductCustomizationModalProps {
  product: Product;
  onClose: () => void;
  onConfirm: (product: Product, quantity: number, customization: CartCustomization) => void;
}

export function ProductCustomizationModal({
  product,
  onClose,
  onConfirm,
}: ProductCustomizationModalProps) {
  const dbVariants = useMemo(() => product.variants || [], [product.variants]);
  const hasDbVariants = dbVariants.length > 0;

  const initialVariantId = useMemo(() => {
    if (!hasDbVariants) return '';
    return dbVariants.find((v) => !v.is_auto_sold_out)?.id || dbVariants[0]?.id || '';
  }, [dbVariants, hasDbVariants]);

  const [quantity, setQuantity] = useState(1);
  const [selectedVariantId, setSelectedVariantId] = useState<string>(initialVariantId);
  const [fallbackSize, setFallbackSize] = useState<'Reguler' | 'Besar'>('Reguler');
  const [notes, setNotes] = useState('');

  const activeVariant = useMemo(() => {
    if (!hasDbVariants) return null;
    return dbVariants.find((v) => v.id === selectedVariantId) || dbVariants[0] || null;
  }, [dbVariants, hasDbVariants, selectedVariantId]);

  const isSelectedSoldOut = Boolean(activeVariant?.is_auto_sold_out);

  const finalUnitPrice = hasDbVariants
    ? Number(activeVariant?.price ?? product.price)
    : product.price + (fallbackSize === 'Besar' ? 8000 : 0);

  const grandTotal = finalUnitPrice * quantity;

  const handleAdd = () => {
    if (isSelectedSoldOut) return;

    const customization: CartCustomization = hasDbVariants && activeVariant
      ? {
          variantId: activeVariant.id,
          variantName: activeVariant.name,
          variantPrice: Number(activeVariant.price),
          size: activeVariant.name,
          unitPriceAdjustment: 0,
          notes: notes.trim() || undefined,
          selectedOptions: [activeVariant.name],
        }
      : {
          size: fallbackSize,
          unitPriceAdjustment: fallbackSize === 'Besar' ? 8000 : 0,
          notes: notes.trim() || undefined,
          selectedOptions: [
            fallbackSize === 'Besar' ? 'Ukuran Besar (+Rp 8.000)' : 'Ukuran Reguler',
          ],
        };

    onConfirm(product, quantity, customization);
    onClose();
  };

  return (
    <div className="bo-modal-layer" onClick={onClose}>
      <div
        className="bo-modal"
        role="dialog"
        aria-modal="true"
        style={{
          maxWidth: '440px',
          width: '92%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#ffffff',
          borderRadius: '14px',
          overflow: 'hidden',
          boxShadow: '0 16px 36px rgba(0, 0, 0, 0.16)',
          border: '1px solid #e7e8e3',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Minimalist Header */}
        <header
          style={{
            padding: '14px 18px',
            backgroundColor: '#ffffff',
            borderBottom: '1px solid #f0f0eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexShrink: 0,
          }}
        >
          <div style={{ minWidth: 0, flex: 1 }}>
            <h2
              style={{
                margin: '0 0 2px',
                fontSize: '15px',
                fontWeight: 700,
                color: '#1c2826',
                lineHeight: 1.3,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
              title={product.name}
            >
              {product.name}
            </h2>
            <span
              style={{
                fontSize: '13px',
                fontWeight: 700,
                color: '#57695b',
              }}
            >
              {rupiah(finalUnitPrice)}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: 'transparent',
              color: '#71717a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <X size={16} />
          </button>
        </header>

        {/* Body */}
        <div
          className="bo-custom-scroll"
          style={{
            padding: '16px 18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          {/* Varian / Porsi */}
          <section>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '8px',
              }}
            >
              <span style={{ fontSize: '12px', color: '#374151', fontWeight: 700 }}>
                {hasDbVariants ? 'Pilih Varian / Porsi' : 'Ukuran Gelas'}
              </span>
              <span
                style={{
                  fontSize: '10.5px',
                  color: '#57695b',
                  fontWeight: 600,
                }}
              >
                Wajib pilih 1
              </span>
            </div>

            {hasDbVariants ? (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))',
                  gap: '8px',
                }}
              >
                {dbVariants.map((v) => {
                  const active = activeVariant?.id === v.id;
                  const soldOut = Boolean(v.is_auto_sold_out);
                  return (
                    <button
                      key={v.id}
                      type="button"
                      disabled={soldOut}
                      onClick={() => setSelectedVariantId(v.id)}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: active ? '1.5px solid #57695b' : '1px solid #e2e4dc',
                        backgroundColor: soldOut
                          ? '#f5f5f5'
                          : active
                          ? '#f3f7f4'
                          : '#ffffff',
                        color: soldOut ? '#9ca3af' : active ? '#2b3b2e' : '#1c2826',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px',
                        cursor: soldOut ? 'not-allowed' : 'pointer',
                        textAlign: 'left',
                        opacity: soldOut ? 0.65 : 1,
                        transition: 'all 0.12s ease',
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: '12.5px',
                            fontWeight: active ? 700 : 600,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {v.name}
                        </div>
                        <div
                          style={{
                            fontSize: '11.5px',
                            color: soldOut ? '#b91c1c' : active ? '#57695b' : '#64746b',
                            fontWeight: 600,
                            marginTop: '1px',
                          }}
                        >
                          {soldOut ? 'Bahan Habis' : rupiah(v.price)}
                        </div>
                      </div>
                      {active && !soldOut && <Check size={15} color="#57695b" />}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {(['Reguler', 'Besar'] as const).map((s) => {
                  const active = fallbackSize === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setFallbackSize(s)}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: active ? '1.5px solid #57695b' : '1px solid #e2e4dc',
                        backgroundColor: active ? '#f3f7f4' : '#ffffff',
                        color: active ? '#2b3b2e' : '#1c2826',
                        fontWeight: active ? 700 : 600,
                        fontSize: '12.5px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <div>
                        <span style={{ display: 'block' }}>
                          {s === 'Reguler' ? 'Reguler (12oz)' : 'Besar (16oz)'}
                        </span>
                        {s === 'Besar' && (
                          <small style={{ fontSize: '11px', color: active ? '#57695b' : '#71717a', fontWeight: 600 }}>
                            +Rp 8.000
                          </small>
                        )}
                      </div>
                      {active && <Check size={15} color="#57695b" />}
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {/* Catatan Khusus */}
          <section>
            <div style={{ marginBottom: '6px' }}>
              <span style={{ fontSize: '12px', color: '#374151', fontWeight: 700 }}>
                Catatan (Opsional)
              </span>
            </div>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Cth: es sedikit, tidak pedas, pisah saus..."
              maxLength={80}
              style={{
                width: '100%',
                padding: '9px 12px',
                border: '1px solid #dcdfd5',
                borderRadius: '8px',
                fontSize: '12.5px',
                outline: 'none',
                backgroundColor: '#ffffff',
                boxSizing: 'border-box',
              }}
            />
          </section>
        </div>

        {/* Footer */}
        <footer
          style={{
            padding: '12px 18px',
            backgroundColor: '#fbfbf9',
            borderTop: '1px solid #f0f0eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              backgroundColor: '#ffffff',
              border: '1px solid #dcdfd5',
              borderRadius: '8px',
              padding: '2px 4px',
            }}
          >
            <button
              type="button"
              disabled={quantity <= 1}
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: quantity <= 1 ? 'transparent' : '#f2f4ef',
                color: quantity <= 1 ? '#c4c4c4' : '#57695b',
                fontSize: '15px',
                fontWeight: 700,
                cursor: quantity <= 1 ? 'default' : 'pointer',
              }}
            >
              −
            </button>
            <b style={{ minWidth: '22px', textAlign: 'center', fontSize: '13.5px', color: '#1c2826' }}>
              {quantity}
            </b>
            <button
              type="button"
              onClick={() => setQuantity(quantity + 1)}
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: '#f2f4ef',
                color: '#57695b',
                fontSize: '15px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              +
            </button>
          </div>

          <button
            type="button"
            disabled={isSelectedSoldOut}
            onClick={handleAdd}
            style={{
              flex: 1,
              height: '36px',
              padding: '0 16px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: isSelectedSoldOut ? '#d4d4d8' : '#57695b',
              color: '#ffffff',
              fontSize: '12.5px',
              fontWeight: 700,
              cursor: isSelectedSoldOut ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <span>{isSelectedSoldOut ? 'Varian Habis' : 'Tambah Pesanan'}</span>
            <span>·</span>
            <span>{rupiah(grandTotal)}</span>
          </button>
        </footer>
      </div>
    </div>
  );
}
