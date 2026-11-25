'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { LoginForm } from '@/components/auth/LoginForm';

export default function LoginPage() {
  const { isAuthenticated, user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      if (user.role === 'CASHIER') {
        router.replace('/pos');
      } else {
        const savedMode = localStorage.getItem('ruang_temu_view_mode');
        if (savedMode === 'POS') {
          router.replace('/pos');
        } else {
          router.replace('/dasbor');
        }
      }
    }
  }, [isAuthenticated, user, isLoading, router]);

  return <LoginForm />;
}
