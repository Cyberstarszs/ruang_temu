'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  LayoutDashboard,
  ReceiptText,
  Wallet,
  Coffee,
  Boxes,
  Truck,
  BadgePercent,
  Users,
  ShieldAlert,
  Settings,
  LogOut,
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronDown,
  TrendingUp,
} from 'lucide-react';

import { AdminDashboardView } from './AdminDashboardView';
import { AdminProductsView } from './AdminProductsView';
import { AdminMenuMatrixView } from './AdminMenuMatrixView';
import { AdminInventoryView } from './AdminInventoryView';
import { AdminPurchasingView } from './AdminPurchasingView';
import { AdminShiftsView } from './AdminShiftsView';
import { AdminOrdersView } from './AdminOrdersView';
import { AdminPromosView } from './AdminPromosView';
import { AdminUsersView } from './AdminUsersView';
import { AdminAuditView } from './AdminAuditView';
import { AdminSettingsView } from './AdminSettingsView';

interface AdminLayoutProps {
  onSwitchToPos?: () => void;
  children?: React.ReactNode;
}

export type AdminTab =
  | 'dashboard'
  | 'orders'
  | 'shifts'
  | 'products'
  | 'matrix'
  | 'inventory'
  | 'purchasing'
  | 'promos'
  | 'users'
  | 'audit'
  | 'settings';

interface NavItem {
  id: AdminTab;
  label: string;
  icon: React.ElementType;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dasbor', icon: LayoutDashboard },
  { id: 'orders', label: 'Transaksi', icon: ReceiptText },
  { id: 'shifts', label: 'Sif', icon: Wallet },
  { id: 'products', label: 'Menu', icon: Coffee },
  { id: 'matrix', label: 'Matriks Menu', icon: TrendingUp },
  { id: 'inventory', label: 'Stok', icon: Boxes },
  { id: 'purchasing', label: 'Pengadaan', icon: Truck },
  { id: 'promos', label: 'Promo', icon: BadgePercent },
  { id: 'users', label: 'Karyawan', icon: Users },
  { id: 'audit', label: 'Audit', icon: ShieldAlert },
  { id: 'settings', label: 'Pengaturan', icon: Settings },
];

const TAB_SLUG_MAP: Record<AdminTab, string> = {
  dashboard: 'dasbor',
  orders: 'transaksi',
  shifts: 'sif',
  products: 'menu',
  matrix: 'matriks',
  inventory: 'stok',
  purchasing: 'pengadaan',
  promos: 'promo',
  users: 'karyawan',
  audit: 'audit',
  settings: 'pengaturan',
};

const SLUG_TAB_MAP: Record<string, AdminTab> = {
  dasbor: 'dashboard',
  dashboard: 'dashboard',
  transaksi: 'orders',
  orders: 'orders',
  sif: 'shifts',
  shifts: 'shifts',
  shift: 'shifts',
  menu: 'products',
  products: 'products',
  matriks: 'matrix',
  matrix: 'matrix',
  'matriks-menu': 'matrix',
  stok: 'inventory',
  inventory: 'inventory',
  pengadaan: 'purchasing',
  purchasing: 'purchasing',
  promo: 'promos',
  promos: 'promos',
  karyawan: 'users',
  users: 'users',
  staf: 'users',
  audit: 'audit',
  pengaturan: 'settings',
  settings: 'settings',
};

export function AdminLayout({ children }: AdminLayoutProps) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const currentSlug = pathname ? pathname.replace(/^\//, '').toLowerCase().split('/')[0] : '';
  const activeTab: AdminTab = SLUG_TAB_MAP[currentSlug] || 'dashboard';

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    if (isProfileOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isProfileOpen]);

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ruang_temu_sidebar_collapsed');
      if (saved === 'true') {
        setIsSidebarCollapsed(true);
      }
    }
  }, []);

  const toggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('ruang_temu_sidebar_collapsed', String(next));
      }
      return next;
    });
  };

  const handleSelectTab = (tab: AdminTab) => {
    const slug = TAB_SLUG_MAP[tab] || tab;
    router.push(`/${slug}`);
  };

  const getActiveTabTitle = () => {
    const item = NAV_ITEMS.find((n) => n.id === activeTab);
    return item ? item.label : 'Dasbor';
  };

  const renderActiveView = () => {
    switch (activeTab) {
      case 'dashboard':
        return <AdminDashboardView onNavigateTab={(tab) => handleSelectTab(tab as AdminTab)} />;
      case 'products':
        return <AdminProductsView />;
      case 'matrix':
        return <AdminMenuMatrixView />;
      case 'inventory':
        return <AdminInventoryView />;
      case 'purchasing':
        return <AdminPurchasingView />;
      case 'shifts':
        return <AdminShiftsView />;
      case 'orders':
        return <AdminOrdersView />;
      case 'promos':
        return <AdminPromosView />;
      case 'users':
        return <AdminUsersView />;
      case 'audit':
        return <AdminAuditView />;
      case 'settings':
        return <AdminSettingsView />;
      default:
        return <AdminDashboardView onNavigateTab={(tab) => handleSelectTab(tab as AdminTab)} />;
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        backgroundColor: '#f8f8f6',
        fontFamily: "'Plus Jakarta Sans', var(--font-jakarta), sans-serif",
        color: '#1c2826',
      }}
    >
      {/* SIDEBAR NAVIGATION - Warna Hijau Default Sistem (#57695b) */}
      <aside
        style={{
          width: isSidebarCollapsed ? '68px' : '230px',
          background: '#57695b',
          borderRight: '1px solid rgba(0, 0, 0, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          position: 'sticky',
          top: 0,
          height: '100vh',
          zIndex: 40,
          transition: 'width 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          overflow: 'hidden',
          boxShadow: '1px 0 10px rgba(0,0,0,0.05)',
        }}
        className="admin-desktop-sidebar"
      >
        {/* Brand Header Sidebar */}
        <div
          style={{
            height: '60px',
            minHeight: '60px',
            maxHeight: '60px',
            flexShrink: 0,
            padding: isSidebarCollapsed ? '0 10px' : '0 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: isSidebarCollapsed ? 'center' : 'space-between',
            borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
            boxSizing: 'border-box',
          }}
        >
          {!isSidebarCollapsed ? (
            <>
              <span
                style={{
                  fontSize: '15px',
                  fontWeight: 800,
                  color: '#ffffff',
                  letterSpacing: '-0.2px',
                }}
              >
                RUANG TEMU
              </span>
              <button
                onClick={toggleSidebar}
                title="Tutup / Ciutkan Sidebar"
                style={{
                  background: 'transparent',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '5px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'rgba(255, 255, 255, 0.75)',
                  transition: 'all 0.12s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                  e.currentTarget.style.color = '#ffffff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'rgba(255, 255, 255, 0.75)';
                }}
              >
                <PanelLeftClose size={17} />
              </button>
            </>
          ) : (
            <button
              onClick={toggleSidebar}
              title="Buka Sidebar"
              style={{
                background: 'rgba(255, 255, 255, 0.15)',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                borderRadius: '8px',
                padding: '7px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                transition: 'all 0.12s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
              }}
            >
              <PanelLeftOpen size={17} />
            </button>
          )}
        </div>

        {/* Navigation Items (Khusus Fungsi Owner) */}
        <nav
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: isSidebarCollapsed ? '10px 8px' : '10px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '3px',
          }}
        >
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const slug = TAB_SLUG_MAP[item.id] || item.id;
            return (
              <Link
                key={item.id}
                href={`/${slug}`}
                title={isSidebarCollapsed ? item.label : undefined}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: isSidebarCollapsed ? 'center' : 'flex-start',
                  gap: isSidebarCollapsed ? 0 : '11px',
                  padding: isSidebarCollapsed ? '10px 0' : '9px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  background: isActive ? 'rgba(0, 0, 0, 0.22)' : 'transparent',
                  color: isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.85)',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: '13.5px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.12s ease',
                  width: '100%',
                  textDecoration: 'none',
                  boxSizing: 'border-box',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
                    e.currentTarget.style.color = '#ffffff';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'rgba(255, 255, 255, 0.85)';
                  }
                }}
              >
                <Icon size={18} color={isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.75)'} />
                {!isSidebarCollapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* MAIN CONTENT WRAPPER */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          height: '100vh',
          overflowY: 'auto',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {/* DESKTOP TOPBAR - Presisi Pas, Minimalis, Tinggi 60px Sama Persis di Semua Halaman */}
        <header
          style={{
            height: '60px',
            minHeight: '60px',
            maxHeight: '60px',
            flexShrink: 0,
            background: '#ffffff',
            borderBottom: '1px solid #e8e8e4',
            padding: '0 28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            zIndex: 30,
            boxSizing: 'border-box',
          }}
          className="admin-desktop-header"
        >
          {/* Judul Halaman Saja (Bersih, Fokus & Elegan) */}
          <h1 style={{ fontSize: '17px', fontWeight: 700, color: '#1c2826', margin: 0, letterSpacing: '-0.2px' }}>
            {getActiveTabTitle()}
          </h1>

          {/* Profil Pengguna di Kanan Atas - Desain Kapsul / Pill Permanen */}
          <div ref={profileRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setIsProfileOpen((prev) => !prev)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '4px 12px 4px 5px',
                background: isProfileOpen ? '#e8ebe2' : '#f2f4ef',
                border: '1px solid #dce0d6',
                borderRadius: '9999px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: isProfileOpen ? '0 0 0 2px rgba(87, 105, 91, 0.15)' : 'none',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = isProfileOpen ? '#e3e7dc' : '#e8ebe2';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = isProfileOpen ? '#e8ebe2' : '#f2f4ef';
              }}
              title="Profil Pengguna"
            >
              {/* Avatar Inisial Bulat */}
              <div
                style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '50%',
                  background: '#57695b',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '13px',
                  flexShrink: 0,
                }}
              >
                {(user?.name ? user.name.replace(/\s*\((owner|kasir|admin)\)/gi, '').trim().charAt(0) : 'O').toUpperCase()}
              </div>

              {/* Tulisan Profil */}
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#1c2826', letterSpacing: '-0.1px' }}>
                Profil
              </span>

              <ChevronDown
                size={14}
                color="#57695b"
                style={{
                  transition: 'transform 0.18s ease',
                  transform: isProfileOpen ? 'rotate(180deg)' : 'none',
                }}
              />
            </button>

            {/* Dropdown Menu Saat Avatar Di-klik */}
            {isProfileOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: 0,
                  width: '220px',
                  background: '#ffffff',
                  borderRadius: '12px',
                  border: '1px solid #e8e8e4',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.1)',
                  padding: '12px',
                  zIndex: 50,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                {/* Info Detail User */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '50%',
                      background: '#57695b',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '14px',
                      flexShrink: 0,
                    }}
                  >
                    {(user?.name ? user.name.replace(/\s*\((owner|kasir|admin)\)/gi, '').trim().charAt(0) : 'O').toUpperCase()}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1, lineHeight: 1.25 }}>
                    <span
                      style={{
                        fontSize: '13.5px',
                        fontWeight: 700,
                        color: '#1c2826',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                      title={user?.name}
                    >
                      {user?.name ? user.name.replace(/\s*\((owner|kasir|admin)\)/gi, '').trim() : 'Owner'}
                    </span>
                    <span style={{ fontSize: '11px', color: '#71717a', fontWeight: 500 }}>
                      {user?.username ? `@${user.username}` : ''} • Owner
                    </span>
                  </div>
                </div>

                <div style={{ height: '1px', background: '#f0f0eb', margin: '2px 0' }} />

                {/* Tombol Logout */}
                <button
                  onClick={() => {
                    setIsProfileOpen(false);
                    logout();
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    width: '100%',
                    padding: '8px 10px',
                    background: 'transparent',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#dc2626',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'background 0.12s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#fef2f2';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <LogOut size={15} color="#dc2626" />
                  <span>Keluar</span>
                </button>
              </div>
            )}
          </div>
        </header>

        {/* MOBILE / TABLET HEADER */}
        <header
          style={{
            height: '56px',
            minHeight: '56px',
            maxHeight: '56px',
            flexShrink: 0,
            background: '#ffffff',
            borderBottom: '1px solid #e8e8e4',
            padding: '0 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            zIndex: 30,
            boxSizing: 'border-box',
          }}
          className="admin-mobile-header"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              style={{
                width: '38px',
                height: '38px',
                background: '#f4f5f1',
                border: '1px solid #e1e4dc',
                borderRadius: '8px',
                cursor: 'pointer',
                color: '#57695b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              aria-label="Buka Menu Navigasi"
            >
              <Menu size={18} />
            </button>
            <span style={{ fontWeight: 800, fontSize: '15px', color: '#1c2826', letterSpacing: '-0.2px' }}>
              {getActiveTabTitle()}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Initial Avatar */}
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: '#57695b',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '13px',
              }}
            >
              {(user?.name ? user.name.replace(/\s*\((owner|kasir|admin)\)/gi, '').trim().charAt(0) : 'O').toUpperCase()}
            </div>
            <button
              onClick={logout}
              style={{
                padding: '6px 10px',
                background: '#fee2e2',
                color: '#b91c1c',
                border: 'none',
                borderRadius: '7px',
                fontSize: '11.5px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Keluar
            </button>
          </div>
        </header>

        {/* Mobile Slide-Over Drawer with Backdrop */}
        {isMobileMenuOpen && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 99999 }}>
            {/* Backdrop */}
            <div
              onClick={() => setIsMobileMenuOpen(false)}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0, 0, 0, 0.55)',
                backdropFilter: 'blur(3px)',
                transition: 'opacity 0.2s ease',
              }}
            />

            {/* Drawer */}
            <div
              style={{
                position: 'fixed',
                top: 0,
                bottom: 0,
                left: 0,
                width: '82%',
                maxWidth: '290px',
                background: '#57695b',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '4px 0 24px rgba(0, 0, 0, 0.3)',
                animation: 'slideDrawerRight 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                zIndex: 100000,
              }}
            >
              {/* Drawer Header */}
              <div
                style={{
                  height: '60px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0 18px',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.15)',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '15px', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.2px' }}>
                    RUANG TEMU
                  </span>
                  <span style={{ fontSize: '10.5px', color: 'rgba(255, 255, 255, 0.7)', fontWeight: 500 }}>
                    Panel Pemilik (Owner)
                  </span>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  style={{
                    width: '34px',
                    height: '34px',
                    background: 'rgba(255, 255, 255, 0.15)',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                  aria-label="Tutup Menu"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Drawer Navigation Links */}
              <nav
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '12px 10px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}
              >
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  const slug = TAB_SLUG_MAP[item.id] || item.id;
                  return (
                    <Link
                      key={item.id}
                      href={`/${slug}`}
                      onClick={() => setIsMobileMenuOpen(false)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '11px 14px',
                        borderRadius: '8px',
                        background: isActive ? 'rgba(0, 0, 0, 0.25)' : 'transparent',
                        color: '#ffffff',
                        fontWeight: isActive ? 800 : 500,
                        fontSize: '14px',
                        textDecoration: 'none',
                        transition: 'background 0.12s ease',
                      }}
                    >
                      <Icon size={18} color={isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.8)'} />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>

              {/* Drawer Footer User Profile & Logout */}
              <div
                style={{
                  padding: '14px 16px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.15)',
                  background: 'rgba(0, 0, 0, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '9px', minWidth: 0 }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: '#ffffff',
                      color: '#57695b',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '13px',
                      flexShrink: 0,
                    }}
                  >
                    {(user?.name ? user.name.replace(/\s*\((owner|kasir|admin)\)/gi, '').trim().charAt(0) : 'O').toUpperCase()}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, lineHeight: 1.2 }}>
                    <span
                      style={{
                        fontSize: '12.5px',
                        fontWeight: 700,
                        color: '#ffffff',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {user?.name ? user.name.replace(/\s*\((owner|kasir|admin)\)/gi, '').trim() : 'Owner'}
                    </span>
                    <span style={{ fontSize: '10.5px', color: 'rgba(255, 255, 255, 0.7)' }}>
                      Pemilik Kafe
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    logout();
                  }}
                  style={{
                    padding: '6px 10px',
                    background: '#dc2626',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Keluar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* View Main Content Area */}
        <main
          className="admin-main-content"
          style={{
            flex: 1,
            maxWidth: '1440px',
            width: '100%',
            margin: '0 auto',
            boxSizing: 'border-box',
          }}
        >
          {children || renderActiveView()}
        </main>
      </div>
    </div>
  );
}
