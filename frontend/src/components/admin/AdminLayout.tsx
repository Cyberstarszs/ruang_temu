'use client';

import React, { useState, useEffect } from 'react';
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
  ShoppingCart,
  LogOut,
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';

import { AdminDashboardView } from './AdminDashboardView';
import { AdminProductsView } from './AdminProductsView';
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
}

export type AdminTab =
  | 'dashboard'
  | 'orders'
  | 'shifts'
  | 'products'
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
  menu: 'products',
  products: 'products',
  stok: 'inventory',
  inventory: 'inventory',
  pengadaan: 'purchasing',
  purchasing: 'purchasing',
  promo: 'promos',
  promos: 'promos',
  karyawan: 'users',
  users: 'users',
  audit: 'audit',
  pengaturan: 'settings',
  settings: 'settings',
};

export function AdminLayout({ onSwitchToPos }: AdminLayoutProps) {
  const { user, logout } = useAuth();

  const getInitialTab = (): AdminTab => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.replace(/^\//, '').toLowerCase();
      if (path && SLUG_TAB_MAP[path]) {
        return SLUG_TAB_MAP[path];
      }
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab')?.toLowerCase();
      if (tabParam && SLUG_TAB_MAP[tabParam]) {
        return SLUG_TAB_MAP[tabParam];
      }
    }
    return 'dashboard';
  };

  const [activeTab, setActiveTab] = useState<AdminTab>(getInitialTab);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('ruang_temu_sidebar_collapsed') === 'true';
    }
    return false;
  });

  const toggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('ruang_temu_sidebar_collapsed', String(next));
      }
      return next;
    });
  };

  // Sync tab change with browser clean URL (e.g. /transaksi, /menu, /stok)
  const handleSelectTab = (tab: AdminTab) => {
    setActiveTab(tab);
    if (typeof window !== 'undefined') {
      const slug = TAB_SLUG_MAP[tab] || tab;
      window.history.pushState({ tab }, '', `/${slug}`);
    }
  };

  // Sync on mount: read tab from clean URL pathname or legacy query param
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.replace(/^\//, '').toLowerCase();
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab')?.toLowerCase();

      if (path && SLUG_TAB_MAP[path]) {
        setActiveTab(SLUG_TAB_MAP[path]);
      } else if (tabParam && SLUG_TAB_MAP[tabParam]) {
        const resolved = SLUG_TAB_MAP[tabParam];
        setActiveTab(resolved);
        const slug = TAB_SLUG_MAP[resolved] || tabParam;
        window.history.replaceState({ tab: resolved }, '', `/${slug}`);
      } else {
        const slug = TAB_SLUG_MAP[activeTab] || 'dasbor';
        window.history.replaceState({ tab: activeTab }, '', `/${slug}`);
      }
    }
  }, []);

  // Listen to browser Back / Forward buttons
  useEffect(() => {
    const onPopState = () => {
      if (typeof window !== 'undefined') {
        const path = window.location.pathname.replace(/^\//, '').toLowerCase();
        if (path && SLUG_TAB_MAP[path]) {
          setActiveTab(SLUG_TAB_MAP[path]);
          return;
        }
        const params = new URLSearchParams(window.location.search);
        const tabParam = params.get('tab')?.toLowerCase();
        if (tabParam && SLUG_TAB_MAP[tabParam]) {
          setActiveTab(SLUG_TAB_MAP[tabParam]);
        } else {
          setActiveTab('dashboard');
        }
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

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
      {/* SIDEBAR NAVIGATION (Desktop & Tablet) */}
      <aside
        style={{
          width: isSidebarCollapsed ? '68px' : '230px',
          background: '#ffffff',
          borderRight: '1px solid #e8e8e4',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          position: 'sticky',
          top: 0,
          height: '100vh',
          zIndex: 40,
          transition: 'width 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          overflow: 'hidden',
        }}
        className="admin-desktop-sidebar"
      >
        {/* Brand Header */}
        <div
          style={{
            padding: isSidebarCollapsed ? '16px 10px' : '18px 16px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: isSidebarCollapsed ? 'center' : 'space-between',
            borderBottom: '1px solid #f0f0eb',
          }}
        >
          {!isSidebarCollapsed ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: '#57695b',
                    display: 'inline-block',
                  }}
                />
                <span
                  style={{
                    fontSize: '14.5px',
                    fontWeight: 800,
                    color: '#1c2826',
                    letterSpacing: '-0.3px',
                  }}
                >
                  RUANG TEMU
                </span>
                <span
                  style={{
                    fontSize: '10.5px',
                    fontWeight: 600,
                    color: '#57695b',
                    background: '#f0f3ee',
                    padding: '2px 6px',
                    borderRadius: '4px',
                  }}
                >
                  Owner
                </span>
              </div>
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
                  color: '#71717a',
                  transition: 'all 0.12s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#f4f5f1';
                  e.currentTarget.style.color = '#18181b';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#71717a';
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
                background: '#f4f5f1',
                border: '1px solid #e1e4dc',
                borderRadius: '8px',
                padding: '7px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#57695b',
                transition: 'all 0.12s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#ebece6';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#f4f5f1';
              }}
            >
              <PanelLeftOpen size={17} />
            </button>
          )}
        </div>

        {/* Navigation Items */}
        <nav
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: isSidebarCollapsed ? '10px 8px' : '8px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '3px',
          }}
        >
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelectTab(item.id)}
                title={isSidebarCollapsed ? item.label : undefined}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: isSidebarCollapsed ? 'center' : 'flex-start',
                  gap: isSidebarCollapsed ? 0 : '10px',
                  padding: isSidebarCollapsed ? '9px 0' : '8px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  background: isActive ? '#57695b' : 'transparent',
                  color: isActive ? '#ffffff' : '#52525b',
                  fontWeight: isActive ? 600 : 500,
                  fontSize: '13px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.12s ease',
                  width: '100%',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = '#f4f5f1';
                    e.currentTarget.style.color = '#18181b';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = '#52525b';
                  }
                }}
              >
                <Icon size={17} color={isActive ? '#ffffff' : '#71717a'} />
                {!isSidebarCollapsed && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* User Footer */}
        <div
          style={{
            padding: isSidebarCollapsed ? '12px 8px' : '12px 14px',
            borderTop: '1px solid #f0f0eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: isSidebarCollapsed ? 'center' : 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '9px', minWidth: 0, flex: 1 }}>
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
                fontWeight: 700,
                fontSize: '13px',
                flexShrink: 0,
              }}
              title={user?.name || 'Owner'}
            >
              {(user?.name ? user.name.replace(/\s*\((owner|kasir|admin)\)/gi, '').trim().charAt(0) : 'O').toUpperCase()}
            </div>
            {!isSidebarCollapsed && (
              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1, lineHeight: 1.25 }}>
                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: 700,
                    color: '#1c2826',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                  title={user?.name || 'Owner'}
                >
                  {user?.name ? user.name.replace(/\s*\((owner|kasir|admin)\)/gi, '').trim() : 'Budi Santoso'}
                </div>
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#71717a',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {user?.role === 'OWNER' ? 'Owner / Pemilik' : 'Kasir Operasional'}
                </div>
              </div>
            )}
          </div>

          {!isSidebarCollapsed && (
            <button
              onClick={logout}
              style={{
                padding: '6px',
                background: 'transparent',
                border: 'none',
                borderRadius: '6px',
                color: '#888888',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="Keluar"
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#dc2626';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#888888';
              }}
            >
              <LogOut size={16} />
            </button>
          )}
        </div>
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
        }}
      >
        {/* DESKTOP TOPBAR */}
        <header
          style={{
            height: '56px',
            background: '#ffffff',
            borderBottom: '1px solid #e8e8e4',
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            zIndex: 30,
          }}
          className="admin-desktop-sidebar"
        >
          {/* Active Title & Sidebar Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={toggleSidebar}
              title={isSidebarCollapsed ? 'Buka Sidebar' : 'Tutup Sidebar'}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '6px',
                background: '#f4f5f1',
                border: '1px solid #e1e4dc',
                borderRadius: '7px',
                cursor: 'pointer',
                color: '#57695b',
                transition: 'all 0.12s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#ebece6';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#f4f5f1';
              }}
            >
              {isSidebarCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
            </button>
            <div style={{ fontSize: '15.5px', fontWeight: 700, color: '#1c2826' }}>
              {getActiveTabTitle()}
            </div>
          </div>

          {/* Quick Switch Button */}
          {onSwitchToPos && (
            <button
              onClick={onSwitchToPos}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                background: '#f2f4ef',
                border: '1px solid #e1e5dc',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 600,
                color: '#57695b',
                cursor: 'pointer',
              }}
            >
              <ShoppingCart size={14} />
              <span>Kasir</span>
            </button>
          )}
        </header>

        {/* MOBILE / TABLET HEADER */}
        <header
          style={{
            background: '#ffffff',
            borderBottom: '1px solid #e8e8e4',
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            zIndex: 30,
          }}
          className="admin-mobile-header"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              style={{
                padding: '6px',
                background: '#f7f7f5',
                border: '1px solid #e2e4dc',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              {isMobileMenuOpen ? <X size={16} /> : <Menu size={16} />}
            </button>
            <span style={{ fontWeight: 700, fontSize: '14px' }}>{getActiveTabTitle()}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {onSwitchToPos && (
              <button
                onClick={onSwitchToPos}
                style={{
                  padding: '5px 10px',
                  background: '#f2f4ef',
                  color: '#57695b',
                  border: '1px solid #dcdfd5',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <ShoppingCart size={13} /> Kasir
              </button>
            )}
            <button
              onClick={logout}
              style={{
                padding: '5px 8px',
                background: '#fee2e2',
                color: '#b91c1c',
                border: 'none',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
              }}
            >
              Keluar
            </button>
          </div>
        </header>

        {/* Mobile Dropdown Menu */}
        {isMobileMenuOpen && (
          <div
            style={{
              background: '#ffffff',
              borderBottom: '1px solid #e8e8e4',
              padding: '10px',
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
            }}
            className="admin-mobile-header"
          >
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    handleSelectTab(item.id);
                    setIsMobileMenuOpen(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: 'none',
                    background: isActive ? '#57695b' : 'transparent',
                    color: isActive ? '#ffffff' : '#374151',
                    fontWeight: isActive ? 600 : 500,
                    fontSize: '13px',
                    textAlign: 'left',
                  }}
                >
                  <Icon size={15} color={isActive ? '#ffffff' : '#64746b'} />
                  {item.label}
                </button>
              );
            })}
          </div>
        )}

        {/* View Main Content Area (Extra bottom padding to ensure floating elements never cover bottom table rows) */}
        <main
          style={{
            flex: 1,
            padding: '24px 28px 84px 28px',
            maxWidth: '1440px',
            width: '100%',
            margin: '0 auto',
          }}
        >
          {renderActiveView()}
        </main>
      </div>
    </div>
  );
}
