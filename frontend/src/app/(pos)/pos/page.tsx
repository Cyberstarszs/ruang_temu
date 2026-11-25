'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { PosScreen } from '@/components/pos/PosScreen';

export default function PosPage() {
  const router = useRouter();

  const handleSwitchToAdmin = () => {
    localStorage.setItem('ruang_temu_view_mode', 'ADMIN');
    router.push('/dasbor');
  };

  return <PosScreen onSwitchToAdmin={handleSwitchToAdmin} />;
}
