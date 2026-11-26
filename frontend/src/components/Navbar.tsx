import React from 'react';
import {
  Store,
  QrCode,
  Armchair,
  UtensilsCrossed,
  Boxes,
  Truck,
  CalendarCheck,
  Users,
  UserCheck,
  BarChart3,
  ShieldAlert,
  Settings,
  Bell,
  LogOut,
  UserRound,
  Clock,
  DollarSign,
  Globe,
  Crown,
  KeyRound,
} from 'lucide-react';
import type { User, CashierShift } from '../types';

interface NavbarProps {
  currentView: string;
  onViewChange: (view: string) => void;
  user: User | null;
  currentShift: CashierShift | null;
  unreadCount: number;
  onOpenShift: () => void;
  onCloseShift: () => void;
  onCashMovement: () => void;
  onOpenNotifications: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onViewChange,
  user,
  currentShift,
  unreadCount,
  onOpenShift,
  onCloseShift,
  onCashMovement,
  onOpenNotifications,
  onLogout,
}) => {
  const isOwner = user?.role === 'OWNER';

  // Strictly segregated navigation items:
  // KASIR: Frontline order taking, table management, kitchen queue, shifts, customer bookings, clock-in
  const cashierNavItems = [
    { id: 'pos', label: 'POS Kasir', icon: Store, badge: 'Utama' },
    { id: 'tables', label: 'Meja Resto', icon: Armchair },
    { id: 'kitchen', label: 'Bar & Dapur', icon: UtensilsCrossed },
    { id: 'reservations', label: 'Reservasi', icon: CalendarCheck },
    { id: 'customers', label: 'Member CRM', icon: Users },
    { id: 'attendance', label: 'Presensi', icon: UserCheck },
    { id: 'inventory', label: 'Log Wastage', icon: Boxes },
    { id: 'menu', label: 'Menu QR', icon: QrCode },
  ];

  // OWNER: Executive financial dashboard, purchasing PO, full inventory, audit trail, settings
  const ownerNavItems = [
    { id: 'reports', label: 'Laporan & Omzet', icon: BarChart3, badge: 'Utama' },
    { id: 'purchasing', label: 'Purchasing PO', icon: Truck },
    { id: 'inventory', label: 'Stok & Opname', icon: Boxes },
    { id: 'audit', label: 'Audit Trail', icon: ShieldAlert },
    { id: 'settings', label: 'Pengaturan Toko', icon: Settings },
    { id: 'reservations', label: 'Data Reservasi', icon: CalendarCheck },
    { id: 'customers', label: 'Database CRM', icon: Users },
    { id: 'pos', label: 'Tinjau Kasir', icon: Store },
    { id: 'tables', label: 'Tinjau Meja', icon: Armchair },
  ];

  const visibleNavItems = isOwner ? ownerNavItems : cashierNavItems;

  return (
    <header className="sticky top-0 z-40 bg-[#16171b] border-b border-[#2b2d35] text-white select-none">
      <div className="max-w-[1650px] mx-auto px-4 h-16 flex items-center justify-between gap-3">
        {/* Brand Lockup */}
        <div className="flex items-center space-x-3 shrink-0">
          <div
            className="flex items-center space-x-2.5 cursor-pointer"
            onClick={() => onViewChange(isOwner ? 'reports' : 'pos')}
            title={isOwner ? 'Buka Dashboard Owner' : 'Buka POS Kasir'}
          >
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold tracking-wider text-base shadow-md ${
                isOwner
                  ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-black shadow-amber-500/20'
                  : 'bg-gradient-to-br from-[#c59a68] to-[#9e7647] text-black shadow-[#c59a68]/20'
              }`}
            >
              {isOwner ? <Crown size={19} /> : 'RT'}
            </div>
            <div>
              <div className="text-xs font-bold tracking-wider uppercase text-zinc-100 flex items-center gap-1.5">
                Ruang Temu
                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded font-bold border tracking-wider ${
                    isOwner
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                  }`}
                >
                  {isOwner ? '👑 OWNER' : '💼 KASIR'}
                </span>
              </div>
              <div className="text-[10px] text-zinc-400 font-mono">
                {isOwner
                  ? 'Executive Financial & Toko Control'
                  : 'Frontline Kasir & Shift Operasional'}
              </div>
            </div>
          </div>

          {/* Quick back to Landing Page Button */}
          <button
            onClick={() => onViewChange('landing')}
            className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[#57695b] bg-[#57695b]/20 hover:bg-[#57695b]/40 text-[#f9f6ee] text-xs font-semibold transition-colors"
            title="Kembali ke Landing Page Website Publik"
          >
            <Globe size={13} className="text-[#a5bca9]" />
            <span>Landing Page</span>
          </button>
        </div>

        {/* Navigation Tabs (Scrollable & Responsive) */}
        <nav className="hidden lg:flex items-center space-x-1 bg-[#1e2026] p-1 rounded-xl border border-[#2e313a] overflow-x-auto">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? isOwner
                      ? 'bg-amber-500 text-black shadow-sm font-bold'
                      : 'bg-[#c59a68] text-black shadow-sm font-bold'
                    : 'text-zinc-300 hover:text-white hover:bg-[#282b33]'
                }`}
              >
                <Icon size={14} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right Section: Notification, Shift & User */}
        <div className="flex items-center space-x-2.5 shrink-0">
          {/* Owner PIN Badge (Only on Owner login) */}
          {isOwner && (
            <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-950/40 border border-amber-800/40 text-amber-300 text-xs font-mono">
              <KeyRound size={13} className="text-amber-400" />
              <span>PIN Otorisasi: 123456</span>
            </div>
          )}

          {/* Notifications Bell */}
          <button
            onClick={onOpenNotifications}
            className="relative p-2 rounded-xl bg-[#1e2026] hover:bg-[#282b33] border border-[#2e313c] text-zinc-300 transition"
            title="Pemberitahuan Sistem"
          >
            <Bell size={16} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Shift Status Badge (Crucial for Cashier, also visible for Owner if monitoring POS) */}
          {(!isOwner || currentView === 'pos') && (
            currentShift ? (
              <div className="flex items-center bg-[#1e2026] border border-[#2e313c] rounded-xl p-1 space-x-1">
                <div className="px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-800/40 text-emerald-400 text-xs font-semibold flex items-center space-x-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  <span>Shift #{currentShift.id.slice(0, 6)}</span>
                </div>
                <button
                  onClick={onCashMovement}
                  className="px-2 py-1 rounded-lg hover:bg-[#282b33] text-zinc-300 text-xs flex items-center space-x-1"
                  title="Input Kas Masuk / Keluar"
                >
                  <DollarSign size={13} className="text-[#c59a68]" />
                  <span className="hidden md:inline">Kas Kecil</span>
                </button>
                <button
                  onClick={onCloseShift}
                  className="px-2.5 py-1 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/40 text-rose-300 text-xs font-medium"
                >
                  Tutup Shift
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenShift}
                className="px-3 py-1.5 rounded-xl bg-[#c59a68]/20 hover:bg-[#c59a68]/30 border border-[#c59a68]/40 text-[#c59a68] text-xs font-semibold flex items-center space-x-1.5 transition"
              >
                <Clock size={14} />
                <span>Buka Shift</span>
              </button>
            )
          )}

          {/* User Profile & Logout */}
          {user ? (
            <div className="flex items-center space-x-2 pl-2 border-l border-[#2e313c]">
              <div className="hidden sm:block text-right">
                <div className="text-xs font-semibold text-zinc-200">{user.name}</div>
                <div
                  className={`text-[10px] font-mono uppercase font-bold ${
                    isOwner ? 'text-amber-400' : 'text-emerald-400'
                  }`}
                >
                  {isOwner ? 'PEMILIK (OWNER)' : 'KASIR OPERASIONAL'}
                </div>
              </div>
              <button
                onClick={onLogout}
                className="p-2 rounded-xl bg-[#1e2026] hover:bg-rose-950/40 hover:border-rose-800/40 hover:text-rose-400 border border-[#2e313c] text-zinc-400 transition"
                title="Keluar (Logout)"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => onViewChange('login')}
              className="px-3 py-1.5 rounded-xl bg-[#1e2026] hover:bg-[#282b33] border border-[#2e313c] text-zinc-300 text-xs font-medium flex items-center space-x-1.5"
            >
              <UserRound size={14} />
              <span>Masuk</span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile / Tablet Horizontal Navigation Menu */}
      <div className="lg:hidden px-4 py-2 bg-[#181a1f] border-t border-[#262830] overflow-x-auto flex space-x-1 scrollbar-none">
        {visibleNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap ${
                isActive
                  ? isOwner
                    ? 'bg-amber-500 text-black font-bold'
                    : 'bg-[#c59a68] text-black font-bold'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#22242c]'
              }`}
            >
              <Icon size={13} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
};
