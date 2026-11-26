'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function RootPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated || !user) {
      router.replace('/login');
      return;
    }

    if (user.role === 'CASHIER') {
      router.replace('/pos');
    } else {
      const savedMode = localStorage.getItem('ruang_temu_view_mode');
      if (savedMode === 'POS') {
        router.replace('/pos');
      } else {
        router.replace('/dashboard');
      }
    }
  }, [user, isAuthenticated, isLoading, router]);

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
            width: '40px',
            height: '40px',
            border: '3px solid #dcdfd5',
            borderTopColor: '#57695b',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 16px',
          }}
        />
        <p style={{ fontSize: '13.5px', fontWeight: 600 }}>Memuat Ruang Temu...</p>
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
