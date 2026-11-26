'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { AdminDashboardView } from '@/components/admin/AdminDashboardView';

export default function DashboardPage() {
  const router = useRouter();

  const handleNavigateTab = (tab: string) => {
    const slugMap: Record<string, string> = {
      dashboard: 'dashboard',
      orders: 'transaksi',
      customers: 'pelanggan',
      shifts: 'shift',
      products: 'menu',
      matrix: 'matriks',
      inventory: 'stok',
      purchasing: 'pengadaan',
      promos: 'promo',
      users: 'karyawan',
      audit: 'audit',
      settings: 'pengaturan',
    };
    router.push(`/${slugMap[tab] || tab}`);
  };

  return <AdminDashboardView onNavigateTab={handleNavigateTab} />;
}
