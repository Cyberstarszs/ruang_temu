import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { ShiftModal } from './components/ShiftModal';
import { NotificationsDrawer } from './components/NotificationsDrawer';
import { LoginView } from './views/LoginView';
import { LandingView } from './views/LandingView';
import { PosView } from './views/PosView';
import { CustomerMenuView } from './views/CustomerMenuView';
import { TableLayoutView } from './views/TableLayoutView';
import { KitchenBarQueueView } from './views/KitchenBarQueueView';
import { InventoryView } from './views/InventoryView';
import { ReportsView } from './views/ReportsView';
import { PurchasingView } from './views/PurchasingView';
import { ReservationsView } from './views/ReservationsView';
import { CustomersView } from './views/CustomersView';
import { AttendanceView } from './views/AttendanceView';
import { AuditLogsView } from './views/AuditLogsView';
import { SettingsView } from './views/SettingsView';
import {
  getAuthUser,
  setAuthUser,
  setAuthToken,
  shiftApi,
} from './api/client';
import type { RouteId } from './router';
import {
  ROUTES,
  parsePath,
  checkRouteAccess,
} from './router';
import type { User, CashierShift } from './types';

export function App() {
  const [currentRoute, setCurrentRoute] = useState<RouteId>('landing');
  const [pendingRoute, setPendingRoute] = useState<RouteId | null>(null);
  const [user, setUser] = useState<User | null>(() => getAuthUser());
  const [currentShift, setCurrentShift] = useState<CashierShift | null>(null);

  // Modals & Drawers
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState<number>(0);
  const [shiftModalType, setShiftModalType] = useState<'OPEN' | 'CLOSE' | 'CASH_MOVEMENT' | null>(
    null
  );

  // Notification Toast
  const [toastMessage, setToastMessage] = useState<string>('');

  const notify = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage('');
    }, 3800);
  };

  // Synchronize route with browser URL & check access rules
  const syncRouteWithUrl = useCallback((currentUser: User | null) => {
    const { route, params } = parsePath(window.location.pathname, window.location.search);
    const access = checkRouteAccess(route, currentUser);

    if (!access.allowed) {
      if (!currentUser) {
        setPendingRoute(route);
        setShowLoginModal(true);
        notify(access.reason || 'Silakan masuk terlebih dahulu.');
        setCurrentRoute('landing');
        window.history.replaceState({}, '', '/');
        document.title = ROUTES.landing.title;
      } else {
        notify(access.reason || 'Akses ditolak.');
        setCurrentRoute(access.redirect);
        const targetPath = ROUTES[access.redirect].path;
        window.history.replaceState({}, '', targetPath);
        document.title = ROUTES[access.redirect].title;
      }
      return;
    }

    setCurrentRoute(route);
    document.title = ROUTES[route]?.title || 'RUANG TEMU';
  }, []);

  // Listen to browser Back/Forward (popstate)
  useEffect(() => {
    syncRouteWithUrl(user);

    const handlePopState = () => {
      syncRouteWithUrl(getAuthUser());
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [syncRouteWithUrl, user]);

  // Programmatic Navigate function
  const navigate = (targetRoute: RouteId, queryParams?: string) => {
    if (targetRoute === 'login') {
      setShowLoginModal(true);
      return;
    }

    const meta = ROUTES[targetRoute] || ROUTES.landing;
    const access = checkRouteAccess(targetRoute, user);

    if (!access.allowed) {
      if (!user) {
        setPendingRoute(targetRoute);
        setShowLoginModal(true);
        notify(access.reason || 'Silakan masuk terlebih dahulu.');
      } else {
        notify(access.reason || 'Akses ditolak.');
        navigate(access.redirect);
      }
      return;
    }

    const fullPath = queryParams ? `${meta.path}?${queryParams}` : meta.path;
    window.history.pushState({}, '', fullPath);
    document.title = meta.title;
    setCurrentRoute(targetRoute);
  };

  // Fetch Current Shift from Backend
  const loadShift = async () => {
    try {
      const res = await shiftApi.getCurrent();
      if (res.success && res.data) {
        const s = (res.data as any).shift || res.data;
        setCurrentShift(s);
      } else {
        setCurrentShift(null);
      }
    } catch (e) {
      console.error('Failed to load current shift:', e);
    }
  };

  useEffect(() => {
    if (user) {
      loadShift();
    }
  }, [user]);

  // Shift Handlers
  const handleConfirmOpenShift = async (openingCash: number) => {
    const res = await shiftApi.open(openingCash);
    if (res.success && res.data) {
      const s = (res.data as any).shift || res.data;
      setCurrentShift(s);
      notify(`Shift #${s.id.slice(0, 6)} dibuka dengan modal Rp ${openingCash.toLocaleString('id-ID')}.`);
    } else {
      throw new Error(res.message || 'Gagal membuka shift kasir.');
    }
  };

  const handleConfirmCloseShift = async (
    actualCash: number,
    notes: string,
    managerPin?: string
  ) => {
    if (!currentShift) throw new Error('Tidak ada shift aktif.');
    const res = await shiftApi.close(currentShift.id, actualCash, notes, managerPin);
    if (res.success && res.data) {
      const r = res.data as any;
      const discrepancy = r.discrepancy || 0;
      setCurrentShift(null);
      if (discrepancy === 0) {
        notify('Shift ditutup: Uang kas fisik SESUAI (Selisih Rp 0).');
      } else {
        notify(
          `Shift ditutup: Ada selisih ${discrepancy > 0 ? '+' : ''}Rp ${discrepancy.toLocaleString(
            'id-ID'
          )}. Dicatat di audit.`
        );
      }
    } else {
      throw new Error(res.message || 'Gagal menutup shift kasir.');
    }
  };

  const handleConfirmCashMovement = async (
    type: 'CASH_IN' | 'CASH_OUT',
    category: string,
    description: string,
    amount: number
  ) => {
    if (!currentShift) throw new Error('Buka shift kasir terlebih dahulu.');
    const res = await shiftApi.recordCashMovement(
      currentShift.id,
      type,
      category,
      description,
      amount
    );
    if (res.success) {
      loadShift();
      notify(
        `Kas kecil dicatat: ${type === 'CASH_IN' ? '+' : '-'}Rp ${amount.toLocaleString(
          'id-ID'
        )} (${category} - ${description}).`
      );
    } else {
      throw new Error(res.message || 'Gagal mencatat kas masuk/keluar.');
    }
  };

  const handleLogout = () => {
    setAuthToken(null);
    setAuthUser(null);
    setUser(null);
    setCurrentShift(null);
    notify('Anda telah keluar dari sistem.');
    navigate('landing');
  };

  return (
    <div
      className={
        currentRoute === 'landing'
          ? 'app mode-website'
          : 'min-h-screen bg-[#111216] text-white flex flex-col font-sans select-none'
      }
    >
      {/* Top Navbar (Only shown when inside Staff & Backoffice Views and user is logged in) */}
      {currentRoute !== 'landing' && user && (
        <Navbar
          currentView={currentRoute}
          onViewChange={(targetView) => {
            if (targetView === 'login') {
              setShowLoginModal(true);
            } else {
              navigate(targetView as RouteId);
            }
          }}
          user={user}
          currentShift={currentShift}
          unreadCount={unreadNotificationsCount}
          onOpenShift={() => setShiftModalType('OPEN')}
          onCloseShift={() => setShiftModalType('CLOSE')}
          onCashMovement={() => setShiftModalType('CASH_MOVEMENT')}
          onOpenNotifications={() => setShowNotifications(true)}
          onLogout={handleLogout}
        />
      )}

      {/* Main View Router */}
      <main className={currentRoute === 'landing' ? '' : 'flex-1 flex flex-col overflow-hidden'}>
        {currentRoute === 'landing' && (
          <LandingView
            onOpenMenu={() => navigate('menu')}
            onOpenPos={() => navigate('pos')}
            onOpenLogin={() => setShowLoginModal(true)}
          />
        )}
        {currentRoute === 'pos' && (
          <PosView
            currentShift={currentShift}
            onOpenShift={() => setShiftModalType('OPEN')}
            onNotify={notify}
          />
        )}
        {currentRoute === 'menu' && <CustomerMenuView />}
        {currentRoute === 'tables' && <TableLayoutView onNotify={notify} />}
        {currentRoute === 'kitchen' && <KitchenBarQueueView onNotify={notify} />}
        {currentRoute === 'inventory' && <InventoryView onNotify={notify} />}
        {currentRoute === 'purchasing' && <PurchasingView onNotify={notify} />}
        {currentRoute === 'reservations' && <ReservationsView onNotify={notify} />}
        {currentRoute === 'customers' && <CustomersView onNotify={notify} />}
        {currentRoute === 'attendance' && <AttendanceView onNotify={notify} />}
        {currentRoute === 'reports' && <ReportsView />}
        {currentRoute === 'audit' && <AuditLogsView />}
        {currentRoute === 'settings' && <SettingsView onNotify={notify} />}
      </main>

      {/* Notifications Drawer */}
      <NotificationsDrawer
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
        onUnreadCountChange={setUnreadNotificationsCount}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-[#1c1e26] border border-[#c59a68]/50 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center space-x-2.5 animate-in fade-in slide-in-from-bottom duration-200">
          <span className="w-2.5 h-2.5 rounded-full bg-[#c59a68] animate-pulse" />
          <span className="text-xs font-semibold text-zinc-100">{toastMessage}</span>
        </div>
      )}

      {/* Shift Modal */}
      {shiftModalType && (
        <ShiftModal
          type={shiftModalType}
          currentShift={currentShift}
          onClose={() => setShiftModalType(null)}
          onConfirmOpen={handleConfirmOpenShift}
          onConfirmClose={handleConfirmCloseShift}
          onConfirmMovement={handleConfirmCashMovement}
        />
      )}

      {/* Login Modal */}
      {showLoginModal && (
        <LoginView
          onSuccess={(u) => {
            setUser(u);
            setShowLoginModal(false);
            const roleLabel = u.role === 'OWNER' ? 'Owner (Pemilik Toko)' : 'Kasir Operasional';
            notify(`Selamat datang, ${u.name}! Anda masuk sebagai ${roleLabel}.`);
            if (pendingRoute) {
              const dest = pendingRoute;
              setPendingRoute(null);
              navigate(dest);
            } else if (u.role === 'OWNER') {
              navigate('reports');
            } else {
              navigate('pos');
            }
          }}
          onCancel={() => {
            setShowLoginModal(false);
            setPendingRoute(null);
          }}
        />
      )}
    </div>
  );
}

export default App;
