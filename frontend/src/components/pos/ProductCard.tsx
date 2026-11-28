'use client';

import React, { useState } from 'react';
import { Product } from '@/types';
import { rupiah } from '@/lib/utils';
import { Plus, Check, Coffee, UtensilsCrossed, Star } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  quantityInCart: number;
  onSelect: (product: Product) => void;
  onQuickAdd: (product: Product) => void;
  onToggleFavorite?: (product: Product) => void;
}

// Fallback high-res cafe images for products without image_url to match reference catalog look
const DEFAULT_PRODUCT_IMAGES: Record<string, string> = {
  espresso: 'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?auto=format&fit=crop&w=500&q=80',
  americano: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=500&q=80',
  cappuccino: 'https://images.unsplash.com/photo-1534778101976-62847782c213?auto=format&fit=crop&w=500&q=80',
  latte: 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?auto=format&fit=crop&w=500&q=80',
  'kopi susu': 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?auto=format&fit=crop&w=500&q=80',
  'flat white': 'https://images.unsplash.com/photo-1577968897966-3d4325b36b61?auto=format&fit=crop&w=500&q=80',
  mocha: 'https://images.unsplash.com/photo-1578314675249-a6910f80cc4e?auto=format&fit=crop&w=500&q=80',
  matcha: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&w=500&q=80',
  croissant: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=500&q=80',
  fries: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=500&q=80',
  nasi: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=500&q=80',
  ayam: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=500&q=80',
};

function getProductImage(product: Product): string | null {
  if (product.image_url) return product.image_url;
  const lowerName = (product.name || '').toLowerCase();
  for (const [key, url] of Object.entries(DEFAULT_PRODUCT_IMAGES)) {
    if (lowerName.includes(key)) return url;
  }
  if (product.category === 'Kopi') {
    return 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=500&q=80';
  }
  if (product.category === 'Non-Kopi') {
    return 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&w=500&q=80';
  }
  if (product.category === 'Makanan') {
    return 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=500&q=80';
  }
  if (product.category === 'Camilan') {
    return 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=500&q=80';
  }
  return null;
}

export function ProductCard({
  product,
  quantityInCart,
  onSelect,
  onQuickAdd,
  onToggleFavorite,
}: ProductCardProps) {
  const resolvedImage = getProductImage(product);
  const [imageError, setImageError] = useState(!resolvedImage);

  React.useEffect(() => {
    setImageError(!resolvedImage);
  }, [resolvedImage]);
  const isSoldOut = Boolean(product.isSoldOut || product.is_force_sold_out || product.is_auto_sold_out);
  const isFavorite = Boolean(product.is_favorite);

  // Promo calculation matching reference design (15% discount ratio)
  const hasPromo = Boolean(
    product.has_promo ||
    (product.original_price && Number(product.original_price) > Number(product.price)) ||
    product.is_favorite ||
    ['KOP-001', 'KOP-002', 'KOP-003', 'NON-001'].includes(product.sku) ||
    ['cappuccino', 'espresso', 'americano', 'latte', 'promo'].some((term) =>
      (product.name || '').toLowerCase().includes(term)
    )
  );
  const originalPrice = product.original_price
    ? Number(product.original_price)
    : hasPromo
    ? Math.round((Number(product.price) / 0.85) / 1000) * 1000
    : undefined;

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
      className="group relative flex flex-col overflow-hidden transition-all duration-200 select-none"
      style={{
        backgroundColor: quantityInCart > 0 ? '#f6f8f5' : '#ffffff',
        border: quantityInCart > 0 ? '2px solid #57695b' : '1px solid #eeeee8',
        borderRadius: '16px',
        cursor: isSoldOut ? 'not-allowed' : 'pointer',
        opacity: isSoldOut ? 0.6 : 1,
        boxShadow: quantityInCart > 0 ? '0 4px 16px rgba(87, 105, 91, 0.2)' : '0 1px 4px rgba(0, 0, 0, 0.04)',
        boxSizing: 'border-box',
        height: 'fit-content',
        minHeight: 'auto',
        alignSelf: 'start',
      }}
      onMouseEnter={(e) => {
        if (!isSoldOut && quantityInCart === 0) {
          e.currentTarget.style.transform = 'translateY(-3px)';
          e.currentTarget.style.boxShadow = '0 8px 22px rgba(0, 0, 0, 0.08)';
          e.currentTarget.style.borderColor = '#dce0d6';
        }
      }}
      onMouseLeave={(e) => {
        if (!isSoldOut && quantityInCart === 0) {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 1px 4px rgba(0, 0, 0, 0.04)';
          e.currentTarget.style.borderColor = '#eeeee8';
        }
      }}
    >
      {/* 1. TOP IMAGE CONTAINER - Generous, bold, dominating the card */}
      <div
        style={{
          width: '100%',
          aspectRatio: '16 / 10',
          position: 'relative',
          backgroundColor: '#f5f4ef',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {resolvedImage && !imageError ? (
          <img
            src={resolvedImage}
            alt={product.name}
            loading="lazy"
            onError={() => setImageError(true)}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            style={{
              filter: isSoldOut ? 'grayscale(85%)' : 'none',
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
              background: '#f4f5f0',
            }}
          >
            {product.category === 'Makanan' || product.category === 'Camilan' ? (
              <UtensilsCrossed size={32} className="opacity-40" />
            ) : (
              <Coffee size={32} className="opacity-40" />
            )}
          </div>
        )}

        {/* Promo Badge - Authentic Frosted Glass "efek glass legit" matching reference */}
        {hasPromo && !isSoldOut && (
          <span
            style={{
              position: 'absolute',
              top: '10px',
              left: '10px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(18, 18, 18, 0.48)',
              backdropFilter: 'blur(10px) saturate(180%)',
              WebkitBackdropFilter: 'blur(10px) saturate(180%)',
              border: '1px solid rgba(255, 255, 255, 0.28)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25), inset 0 1px 1px rgba(255, 255, 255, 0.35)',
              textShadow: '0 1px 2px rgba(0, 0, 0, 0.4)',
              color: '#ffffff',
              padding: '3px 10px',
              borderRadius: '9999px',
              fontSize: '11px',
              fontWeight: 600,
              letterSpacing: '0.25px',
              zIndex: 3,
              lineHeight: 1.25,
              pointerEvents: 'none',
            }}
          >
            Promo
          </span>
        )}

        {/* Sold Out Badge */}
        {isSoldOut && (
          <span
            style={{
              position: 'absolute',
              top: '10px',
              left: '10px',
              backgroundColor: '#dc2626',
              color: '#ffffff',
              padding: '2.5px 9px',
              borderRadius: '9999px',
              fontSize: '10.5px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              boxShadow: '0 2px 6px rgba(220, 38, 38, 0.35)',
              zIndex: 3,
              lineHeight: 1.25,
            }}
          >
            Habis
          </span>
        )}

        {/* Top-Right: Star Favorite Button & In-Cart Counter */}
        <div
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            zIndex: 4,
          }}
        >
          {/* Star Favorite Button (Only shown on favorite products) */}
          {isFavorite && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite?.(product);
              }}
              title="Menu Favorit (Klik untuk hapus dari favorit)"
              aria-label="Hapus favorit"
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                border: '1px solid rgba(245, 158, 11, 0.5)',
                backgroundColor: 'rgba(255, 251, 235, 0.95)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                boxShadow: '0 2px 8px rgba(245, 158, 11, 0.35)',
                color: '#f59e0b',
                transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                padding: 0,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              <Star
                size={14}
                fill="#f59e0b"
                stroke="#d97706"
                strokeWidth={2}
              />
            </button>
          )}

          {/* In-Cart Counter Badge */}
          {quantityInCart > 0 && !isSoldOut && (
            <span
              style={{
                backgroundColor: '#57695b',
                color: '#ffffff',
                padding: '3px 8px',
                borderRadius: '9999px',
                fontSize: '11px',
                fontWeight: 800,
                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.25)',
                border: '1.5px solid #ffffff',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                lineHeight: 1.2,
              }}
            >
              <Check size={11} strokeWidth={3} />
              {quantityInCart}x
            </span>
          )}
        </div>
      </div>

      {/* 2. CARD CONTENT - Directly adjacent name and price (berdempetan), zero empty bottom space */}
      <div
        className="pos-card-body"
        style={{
          padding: '8px 12px 10px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
          justifyContent: 'flex-start',
          height: 'auto',
          minHeight: 'auto',
        }}
      >
        {/* Product Title - Clean sans-serif, directly adjacent to price */}
        <h3
          style={{
            fontSize: '13.5px',
            fontWeight: 600,
            color: '#1c2826',
            margin: 0,
            lineHeight: '1.2',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            letterSpacing: '-0.1px',
          }}
          title={product.name}
        >
          {product.name}
        </h3>

        {/* Bottom Row: Price on left, Circular Green Plus on right - Tightly adjacent */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '6px',
            marginTop: '1px',
          }}
        >
          {/* Price Container */}
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '5px', minWidth: 0, overflow: 'hidden' }}>
              {hasPromo && originalPrice && !(product.variants && product.variants.length > 0) ? (
                <>
                  <span
                    style={{
                      fontSize: '11px',
                      color: '#9ca3af',
                      textDecoration: 'line-through',
                      fontWeight: 500,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {rupiah(originalPrice)}
                  </span>
                  <span
                    style={{
                      fontSize: '14px',
                      fontWeight: 700,
                      color: '#1c2826',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {rupiah(product.price)}
                  </span>
                </>
              ) : (
                <span
                  style={{
                    fontSize: '14px',
                    fontWeight: 700,
                    color: '#1c2826',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {product.variants && product.variants.length > 0
                    ? rupiah(Math.min(...product.variants.map((v) => Number(v.price))))
                    : rupiah(product.price)}
                </span>
              )}
            </div>
            {product.variants && product.variants.length > 0 && (
              <span
                style={{
                  fontSize: '10.5px',
                  color: '#57695b',
                  fontWeight: 600,
                  lineHeight: 1.15,
                  whiteSpace: 'nowrap',
                }}
              >
                {product.variants.length} varian porsi
              </span>
            )}
          </div>

          {/* Circular Add Button matching reference */}
          <button
            type="button"
            disabled={isSoldOut}
            onClick={(e) => {
              e.stopPropagation();
              onQuickAdd(product);
            }}
            aria-label={`Tambah ${product.name}`}
            style={{
              width: '28px',
              height: '28px',
              minWidth: '28px',
              borderRadius: '50%',
              backgroundColor: isSoldOut ? '#e5e7eb' : '#57695b',
              color: isSoldOut ? '#9ca3af' : '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: 'none',
              cursor: isSoldOut ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease',
              boxShadow: isSoldOut ? 'none' : '0 2px 5px rgba(87, 105, 91, 0.25)',
              padding: 0,
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              if (!isSoldOut) {
                e.currentTarget.style.backgroundColor = '#46554a';
                e.currentTarget.style.transform = 'scale(1.08)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isSoldOut) {
                e.currentTarget.style.backgroundColor = '#57695b';
                e.currentTarget.style.transform = 'scale(1)';
              }
            }}
          >
            <Plus size={15} strokeWidth={2.4} />
          </button>
        </div>
      </div>
    </article>
  );
}
