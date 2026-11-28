'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { AdminLayout } from '@/components/admin/AdminLayout';

export default function AdminGroupLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated || !user) {
      router.replace('/login');
    } else if (user.role === 'CASHIER') {
      router.replace('/pos');
    } else if (user.role === 'EMPLOYEE') {
      router.replace('/absensi');
    }
  }, [user, isAuthenticated, isLoading, router]);

  if (isLoading || !isAuthenticated || !user || user.role === 'CASHIER' || user.role === 'EMPLOYEE') {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          background: '#f8f8f6',
          color: '#57695b',
          fontFamily: "'Plus Jakarta Sans', var(--font-jakarta), sans-serif",
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              border: '3px solid #dcdfd5',
              borderTopColor: '#57695b',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto 12px',
            }}
          />
          <p style={{ fontSize: '13px', fontWeight: 600 }}>Memuat Modul Manajemen...</p>
        </div>
        <style jsx>{`
          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    );
  }

  const handleSwitchToPos = () => {
    localStorage.setItem('ruang_temu_view_mode', 'POS');
    router.push('/pos');
  };

  return <AdminLayout onSwitchToPos={handleSwitchToPos}>{children}</AdminLayout>;
}
