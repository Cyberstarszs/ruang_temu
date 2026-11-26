import { useState, useEffect, useCallback } from 'react';
import type { User } from '../types';

export type RouteId =
  | 'landing'
  | 'menu'
  | 'login'
  | 'pos'
  | 'tables'
  | 'kitchen'
  | 'inventory'
  | 'reservations'
  | 'customers'
  | 'attendance'
  | 'purchasing'
  | 'reports'
  | 'audit'
  | 'settings';

export type AccessLevel = 'PUBLIC' | 'STAFF' | 'OWNER_ONLY';

export interface RouteMeta {
  id: RouteId;
  path: string;
  title: string;
  access: AccessLevel;
}

export const ROUTES: Record<RouteId, RouteMeta> = {
  landing: { id: 'landing', path: '/', title: 'Beranda — RUANG TEMU', access: 'PUBLIC' },
  menu: { id: 'menu', path: '/menu', title: 'Menu Pelanggan — RUANG TEMU', access: 'PUBLIC' },
  login: { id: 'login', path: '/login', title: 'Masuk Staf — RUANG TEMU', access: 'PUBLIC' },
  pos: { id: 'pos', path: '/pos', title: 'POS Kasir — RUANG TEMU', access: 'STAFF' },
  tables: { id: 'tables', path: '/tables', title: 'Denah Meja — RUANG TEMU', access: 'STAFF' },
  kitchen: { id: 'kitchen', path: '/kitchen', title: 'Antrean Bar & Dapur — RUANG TEMU', access: 'STAFF' },
  inventory: { id: 'inventory', path: '/inventory', title: 'Stok Bahan Baku — RUANG TEMU', access: 'STAFF' },
  reservations: { id: 'reservations', path: '/reservations', title: 'Kelola Reservasi — RUANG TEMU', access: 'STAFF' },
  customers: { id: 'customers', path: '/customers', title: 'CRM Member — RUANG TEMU', access: 'STAFF' },
  attendance: { id: 'attendance', path: '/attendance', title: 'Presensi Kerja — RUANG TEMU', access: 'STAFF' },
  purchasing: { id: 'purchasing', path: '/purchasing', title: 'Purchasing & PO — RUANG TEMU', access: 'OWNER_ONLY' },
  reports: { id: 'reports', path: '/reports', title: 'Laporan Keuangan — RUANG TEMU', access: 'OWNER_ONLY' },
  audit: { id: 'audit', path: '/audit', title: 'Audit Trail Keamanan — RUANG TEMU', access: 'OWNER_ONLY' },
  settings: { id: 'settings', path: '/settings', title: 'Pengaturan Toko — RUANG TEMU', access: 'OWNER_ONLY' },
};

export function parsePath(pathname: string, search: string): { route: RouteId; params: URLSearchParams } {
  const params = new URLSearchParams(search);

  // If table parameter exists (?meja=XX or ?table=XX), route to customer menu
  if (params.get('meja') || params.get('table')) {
    return { route: 'menu', params };
  }

  // Clean pathname
  const cleanPath = pathname.replace(/\/+$/, '') || '/';

  for (const r of Object.values(ROUTES)) {
    if (r.path === cleanPath) {
      return { route: r.id, params };
    }
  }

  // Fallback check based on pathname substring
  if (cleanPath.startsWith('/menu')) return { route: 'menu', params };
  if (cleanPath.startsWith('/pos')) return { route: 'pos', params };
  if (cleanPath.startsWith('/tables')) return { route: 'tables', params };
  if (cleanPath.startsWith('/kitchen')) return { route: 'kitchen', params };
  if (cleanPath.startsWith('/inventory')) return { route: 'inventory', params };
  if (cleanPath.startsWith('/reservations')) return { route: 'reservations', params };
  if (cleanPath.startsWith('/customers')) return { route: 'customers', params };
  if (cleanPath.startsWith('/attendance')) return { route: 'attendance', params };
  if (cleanPath.startsWith('/purchasing')) return { route: 'purchasing', params };
  if (cleanPath.startsWith('/reports')) return { route: 'reports', params };
  if (cleanPath.startsWith('/audit')) return { route: 'audit', params };
  if (cleanPath.startsWith('/settings')) return { route: 'settings', params };
  if (cleanPath.startsWith('/login')) return { route: 'login', params };

  return { route: 'landing', params };
}

export function checkRouteAccess(
  route: RouteId,
  user: User | null
): { allowed: boolean; reason?: string; redirect: RouteId } {
  const meta = ROUTES[route] || ROUTES.landing;

  // 1. Public route: always allowed
  if (meta.access === 'PUBLIC') {
    return { allowed: true, redirect: route };
  }

  // 2. User is not logged in
  if (!user) {
    return {
      allowed: false,
      reason: 'Akses Dibatasi: Silakan masuk sebagai Kasir atau Owner untuk membuka halaman ini.',
      redirect: 'landing',
    };
  }

  // 3. Owner-only route
  if (meta.access === 'OWNER_ONLY' && user.role !== 'OWNER') {
    return {
      allowed: false,
      reason: 'Akses Ditolak: Halaman ini khusus untuk Pemilik Kafe (Owner).',
      redirect: 'pos',
    };
  }

  // 4. Staff route: allowed for CASHIER and OWNER
  return { allowed: true, redirect: route };
}
