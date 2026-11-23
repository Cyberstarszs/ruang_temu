'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { LoginForm } from '@/components/auth/LoginForm';
import { PosScreen } from '@/components/pos/PosScreen';

export default function HomePage() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#ebebeb',
          fontFamily: 'var(--font-montserrat, sans-serif)',
        }}
      >
        <img
          src="/brand/ruang-temu-navbar.png"
          alt="RUANG TEMU"
          style={{ height: '40px', objectFit: 'contain', marginBottom: '20px' }}
        />
        <div style={{ color: '#57695b', fontWeight: 600, fontSize: '14px' }}>
          Memuat Sistem Kasir RUANG TEMU...
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginForm />;
  }

  return <PosScreen />;
}
