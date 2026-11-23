'use client';

import React, { useState } from 'react';
import { Product, CartCustomization } from '@/types';
import { rupiah } from '@/lib/utils';
import { Icon } from '@/components/common/Icons';

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
  const [quantity, setQuantity] = useState(1);
  const [size, setSize] = useState<'Reguler' | 'Besar'>('Reguler');
  const [notes, setNotes] = useState('');

  // Hitung penyesuaian harga berdasarkan ukuran
  const unitAdjustment = size === 'Besar' ? 8000 : 0;
  const selectedOptions: string[] = [
    size === 'Besar' ? 'Ukuran Besar (+Rp 8.000)' : 'Ukuran Reguler',
  ];

  const finalUnitPrice = product.price + unitAdjustment;
  const grandTotal = finalUnitPrice * quantity;

  const handleAdd = () => {
    const customization: CartCustomization = {
      size,
      unitPriceAdjustment: unitAdjustment,
      notes: notes.trim() || undefined,
      selectedOptions,
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
          maxWidth: '460px',
          width: '92%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 20px 48px rgba(0, 0, 0, 0.2)',
          border: '1px solid #e5e4de',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <header
          style={{
            padding: '16px 20px',
            backgroundColor: '#fafaf8',
            borderBottom: '1px solid #eeece6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
            {product.image_url ? (
              <img
                src={product.image_url}
                alt={product.name}
                style={{ width: '44px', height: '44px', borderRadius: '10px', objectFit: 'cover', flexShrink: 0 }}
              />
            ) : (
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '10px',
                  backgroundColor: '#eef4ef',
                  color: '#57695b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Icon name="coffee" size={22} />
              </div>
            )}
            <div style={{ minWidth: 0, flex: 1 }}>
              <h2
                style={{
                  margin: '0 0 3px',
                  fontSize: '16.5px',
                  fontWeight: 700,
                  color: '#272727',
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
                  display: 'inline-block',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  backgroundColor: '#eef4ef',
                  color: '#57695b',
                  fontSize: '12.5px',
                  fontWeight: 700,
                }}
              >
                {rupiah(finalUnitPrice)}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              border: '1px solid #e5e4de',
              backgroundColor: '#ffffff',
              color: '#666666',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'background-color 0.12s ease',
              flexShrink: 0,
            }}
          >
            <Icon name="close" size={18} />
          </button>
        </header>

        {/* Options Body: Cukup Ukuran Gelas / Porsi dan Catatan Pesanan Khusus */}
        <div
          className="bo-custom-scroll"
          style={{
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          {/* 1. Ukuran Gelas / Porsi */}
          <section>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '10px',
              }}
            >
              <b style={{ fontSize: '13.5px', color: '#272727', fontWeight: 700 }}>
                Ukuran Gelas / Porsi
              </b>
              <span
                style={{
                  fontSize: '11px',
                  color: '#57695b',
                  fontWeight: 600,
                  backgroundColor: '#eef4ef',
                  padding: '2px 8px',
                  borderRadius: '4px',
                }}
              >
                Wajib
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {(['Reguler', 'Besar'] as const).map((s) => {
                const active = size === s;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSize(s)}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '10px',
                      border: active ? '2px solid #57695b' : '1px solid #e0ded8',
                      backgroundColor: active ? '#f3f7f4' : '#ffffff',
                      color: active ? '#57695b' : '#333333',
                      fontWeight: active ? 700 : 500,
                      fontSize: '13.5px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.12s ease',
                    }}
                  >
                    <div>
                      <span style={{ display: 'block' }}>{s === 'Reguler' ? 'Reguler (12oz)' : 'Besar (16oz)'}</span>
                      {s === 'Besar' && (
                        <small style={{ fontSize: '11px', color: active ? '#57695b' : '#777777', fontWeight: 600 }}>
                          +Rp 8.000
                        </small>
                      )}
                    </div>
                    {active && <Icon name="circleCheck" size={18} className="text-[#57695b]" />}
                  </button>
                );
              })}
            </div>
          </section>

          {/* 2. Catatan Pesanan Khusus */}
          <section>
            <div style={{ marginBottom: '8px' }}>
              <b style={{ fontSize: '13.5px', color: '#272727', fontWeight: 700 }}>
                Catatan Pesanan Khusus
              </b>
            </div>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: jangan terlalu manis, es sedikit, dipisah..."
              maxLength={80}
              style={{
                width: '100%',
                padding: '11px 14px',
                border: '1px solid #d1cfc7',
                borderRadius: '8px',
                fontSize: '13.5px',
                outline: 'none',
                backgroundColor: '#ffffff',
                boxSizing: 'border-box',
              }}
            />
          </section>
        </div>

        {/* Sticky Footer */}
        <footer
          style={{
            padding: '14px 20px',
            backgroundColor: '#fafaf8',
            borderTop: '1px solid #eeece6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexShrink: 0,
          }}
        >
          {/* Quantity Selector */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#ffffff',
              border: '1px solid #dcdad2',
              borderRadius: '999px',
              padding: '3px 6px',
            }}
          >
            <button
              type="button"
              disabled={quantity <= 1}
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                border: 'none',
                backgroundColor: quantity <= 1 ? '#f5f5f5' : '#eef4ef',
                color: quantity <= 1 ? '#bbb' : '#57695b',
                fontSize: '16px',
                fontWeight: 700,
                cursor: quantity <= 1 ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              −
            </button>
            <b style={{ minWidth: '22px', textAlign: 'center', fontSize: '15px', color: '#272727' }}>
              {quantity}
            </b>
            <button
              type="button"
              onClick={() => setQuantity(quantity + 1)}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                border: 'none',
                backgroundColor: '#eef4ef',
                color: '#57695b',
                fontSize: '16px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              +
            </button>
          </div>

          {/* Add to Order Button */}
          <button
            type="button"
            onClick={handleAdd}
            style={{
              flex: 1,
              padding: '12px 18px',
              borderRadius: '10px',
              border: 'none',
              backgroundColor: '#57695b',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: '0 2px 6px rgba(87,105,91,0.25)',
              transition: 'background-color 0.15s ease',
            }}
          >
            <span>Tambahkan ke Pesanan</span>
            <span>·</span>
            <span>{rupiah(grandTotal)}</span>
          </button>
        </footer>
      </div>
    </div>
  );
}
