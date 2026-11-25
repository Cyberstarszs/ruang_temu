'use client';

import React, { useState } from 'react';
import { Product } from '@/types';
import { rupiah } from '@/lib/utils';
import { Icon } from '@/components/common/Icons';

interface ProductCardProps {
  product: Product;
  quantityInCart: number;
  onSelect: (product: Product) => void;
  onQuickAdd: (product: Product) => void;
}

export function ProductCard({
  product,
  quantityInCart,
  onSelect,
  onQuickAdd,
}: ProductCardProps) {
  const [imageError, setImageError] = useState(!product.image_url);
  const isSoldOut = Boolean(product.isSoldOut || product.is_force_sold_out || product.is_auto_sold_out);

  return (
    <article
      role="button"
      tabIndex={isSoldOut ? -1 : 0}
      onClick={() => {
        if (isSoldOut) return;
        onSelect(product);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !isSoldOut) {
          onSelect(product);
        }
      }}
      style={{
        backgroundColor: quantityInCart > 0 ? '#f2f6f3' : '#ffffff',
        border: quantityInCart > 0 ? '2px solid #57695b' : '1px solid #e5e5e3',
        borderRadius: '12px',
        overflow: 'hidden',
        cursor: isSoldOut ? 'not-allowed' : 'pointer',
        opacity: isSoldOut ? 0.6 : 1,
        transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        boxShadow: quantityInCart > 0 ? '0 4px 14px rgba(87, 105, 91, 0.22)' : '0 1px 3px rgba(0,0,0,0.03)',
      }}
    >
      {/* Media / Image Container */}
      <div
        style={{
          width: '100%',
          aspectRatio: '16 / 10',
          position: 'relative',
          backgroundColor: '#f5f4f0',
          overflow: 'hidden',
        }}
      >
        {!imageError && product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            loading="lazy"
            onError={() => setImageError(true)}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              filter: isSoldOut ? 'grayscale(80%)' : 'none',
              transition: 'transform 0.25s ease',
            }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#8b968e',
            }}
          >
            <Icon
              name={product.category === 'Makanan' || product.category === 'Camilan' ? 'cookie' : 'coffee'}
              size={32}
            />
          </div>
        )}

        {/* Sold Out Badge */}
        {isSoldOut && (
          <span
            style={{
              position: 'absolute',
              top: '8px',
              left: '8px',
              backgroundColor: '#a32424',
              color: '#ffffff',
              padding: '2px 8px',
              borderRadius: '4px',
              fontSize: '10px',
              fontWeight: 700,
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
            }}
          >
            Habis
          </span>
        )}

        {/* In-Cart Badge */}
        {quantityInCart > 0 && !isSoldOut && (
          <span
            style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              backgroundColor: '#3b4e40',
              color: '#ffffff',
              padding: '3px 8px',
              borderRadius: '999px',
              fontSize: '11px',
              fontWeight: 800,
              boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
              border: '1.5px solid #ffffff',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px',
            }}
          >
            ✓ {quantityInCart}x
          </span>
        )}
      </div>

      {/* Card Content */}
      <div
        style={{
          padding: '10px 12px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          flex: 1,
        }}
      >
        <div>
          <div style={{ fontSize: '10.5px', color: '#7a7a7a', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '2px' }}>
            {product.category}
          </div>
          <b
            style={{
              fontSize: '13.5px',
              fontWeight: 700,
              color: '#1c2826',
              lineHeight: '17px',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              minHeight: '34px',
            }}
          >
            {product.name}
          </b>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: '8px',
            paddingTop: '6px',
            borderTop: '1px solid #f2f1ed',
          }}
        >
          <strong style={{ fontSize: '14px', fontWeight: 700, color: '#57695b' }}>
            {rupiah(product.price)}
          </strong>

          <button
            type="button"
            disabled={isSoldOut}
            onClick={(e) => {
              e.stopPropagation();
              onQuickAdd(product);
            }}
            aria-label={`Tambah ${product.name}`}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: isSoldOut ? '#e5e5e3' : quantityInCart > 0 ? '#3b4e40' : '#57695b',
              color: isSoldOut ? '#999' : '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: 'none',
              cursor: isSoldOut ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease',
              touchAction: 'manipulation',
              boxShadow: quantityInCart > 0 ? '0 2px 6px rgba(59, 78, 64, 0.3)' : 'none',
            }}
          >
            <Icon name="plus" size={15} />
          </button>
        </div>
      </div>
    </article>
  );
}
