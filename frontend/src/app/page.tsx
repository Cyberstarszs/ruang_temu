'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { LoginForm } from '@/components/auth/LoginForm';
import { PosScreen } from '@/components/pos/PosScreen';
import { AdminLayout } from '@/components/admin/AdminLayout';

export default function HomePage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [viewMode, setViewMode] = useState<'POS' | 'ADMIN'>('POS');

  const ADMIN_SLUGS = [
    'dasbor',
    'dashboard',
    'transaksi',
    'orders',
    'sif',
    'shifts',
    'menu',
    'products',
    'stok',
    'inventory',
    'pengadaan',
    'purchasing',
    'promo',
    'promos',
    'karyawan',
    'users',
    'audit',
    'pengaturan',
    'settings',
  ];

  useEffect(() => {
    if (user?.role === 'OWNER') {
      if (typeof window !== 'undefined') {
        const path = window.location.pathname.replace(/^\//, '').toLowerCase();
        if (path === 'pos') {
          setViewMode('POS');
          return;
        }
        if (path && ADMIN_SLUGS.includes(path)) {
          setViewMode('ADMIN');
          return;
        }

        const params = new URLSearchParams(window.location.search);
        if (params.get('tab')) {
          setViewMode('ADMIN');
          return;
        }
        if (params.get('view') === 'pos') {
          setViewMode('POS');
          return;
        }
      }
      const savedMode = localStorage.getItem('ruang_temu_view_mode') as 'POS' | 'ADMIN';
      if (savedMode === 'POS' || savedMode === 'ADMIN') {
        setViewMode(savedMode);
      } else {
        setViewMode('ADMIN');
      }
    } else {
      setViewMode('POS');
    }
  }, [user]);

  // Handle browser back/forward navigation between POS and Admin
  useEffect(() => {
    const handlePopState = () => {
      if (typeof window !== 'undefined' && user?.role === 'OWNER') {
        const path = window.location.pathname.replace(/^\//, '').toLowerCase();
        if (path === 'pos') {
          setViewMode('POS');
        } else if (path && ADMIN_SLUGS.includes(path)) {
          setViewMode('ADMIN');
        }
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [user]);

  const handleSwitchMode = (mode: 'POS' | 'ADMIN') => {
    setViewMode(mode);
    localStorage.setItem('ruang_temu_view_mode', mode);
    if (typeof window !== 'undefined') {
      if (mode === 'POS') {
        window.history.pushState(null, '', '/pos');
      } else {
        window.history.pushState(null, '', '/dasbor');
      }
    }
  };

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
          fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
        }}
      >
        <img
          src="/brand/ruang-temu-navbar.png"
          alt="RUANG TEMU"
          style={{ height: '40px', objectFit: 'contain', marginBottom: '20px' }}
        />
        <div style={{ color: '#57695b', fontWeight: 600, fontSize: '14px' }}>
          Memuat Sistem RUANG TEMU...
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginForm />;
  }

  // RBAC: If OWNER, allow switching between Admin Backoffice and POS Cashier
  if (user?.role === 'OWNER') {
    if (viewMode === 'ADMIN') {
      return <AdminLayout onSwitchToPos={() => handleSwitchMode('POS')} />;
    }
    return <PosScreen onSwitchToAdmin={() => handleSwitchMode('ADMIN')} />;
  }

  // CASHIER is locked to POS only (Security RBAC)
  return <PosScreen />;
}
