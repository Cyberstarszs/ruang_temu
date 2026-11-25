'use client';

import React, { useEffect } from 'react';
import { RotateCcw, AlertTriangle } from 'lucide-react';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[AdminError Boundary]:', error);
  }, [error]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '360px',
        padding: '32px',
        background: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #fee2e2',
        textAlign: 'center',
        gap: '16px',
      }}
    >
      <div
        style={{
          width: '48px',
          height: '48px',
          borderRadius: '12px',
          background: '#fef2f2',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#dc2626',
        }}
      >
        <AlertTriangle size={24} />
      </div>
      <div>
        <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1c2826', margin: '0 0 6px' }}>
          Gagal Memuat Konten Modul
        </h3>
        <p style={{ fontSize: '13px', color: '#6b7280', margin: 0, maxWidth: '420px' }}>
          {error?.message || 'Terjadi gangguan tak terduga saat memuat data modul.'}
        </p>
      </div>
      <button
        onClick={() => reset()}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 18px',
          borderRadius: '8px',
          border: 'none',
          background: '#57695b',
          color: '#ffffff',
          fontSize: '13px',
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        <RotateCcw size={14} />
        Coba Muat Ulang
      </button>
    </div>
  );
}
