'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useShift } from '@/context/ShiftContext';
import { Icon } from '@/components/common/Icons';
import { rupiah, formatTime } from '@/lib/utils';

interface PosHeaderProps {
  onOpenHistory: () => void;
  onOpenPrinter: () => void;
  onOpenMatrix: () => void;
  onOpenShiftModal: (modal: 'open' | 'recap' | 'cash' | 'close') => void;
  onOpenHeldOrders: () => void;
  onSwitchToAdmin?: () => void;
  heldOrdersCount?: number;
  printerOnline?: boolean;
  isCartOpen?: boolean;
  onToggleCart?: () => void;
  cartItemCount?: number;
  cartGrandTotal?: number;
}

export function PosHeader({
  onOpenHistory,
  onOpenPrinter,
  onOpenMatrix,
  onOpenShiftModal,
  onOpenHeldOrders,
  onSwitchToAdmin,
  heldOrdersCount = 0,
  printerOnline = true,
  isCartOpen = true,
  onToggleCart,
  cartItemCount = 0,
  cartGrandTotal = 0,
}: PosHeaderProps) {
  const { user, logout } = useAuth();
  const { shift, summary, hasActiveShift } = useShift();
  const [shiftDropdownOpen, setShiftDropdownOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [shiftMinutes, setShiftMinutes] = useState(0);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);

  const shiftRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!shift?.opened_at) return;
    const updateDuration = () => {
      const opened = new Date(shift.opened_at).getTime();
      const now = Date.now();
      const mins = Math.max(0, Math.floor((now - opened) / 60000));
      setShiftMinutes(mins);
    };
    updateDuration();
    const interval = setInterval(updateDuration, 60000);
    return () => clearInterval(interval);
  }, [shift?.opened_at]);

  // Click outside & Escape listeners to close popovers smoothly on both mouse and touchscreen
  useEffect(() => {
    const handleCloseOutside = (e: MouseEvent | PointerEvent) => {
      const target = e.target as Node;
      if (shiftRef.current && !shiftRef.current.contains(target)) {
        setShiftDropdownOpen(false);
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(target)) {
        setMoreMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShiftDropdownOpen(false);
        setMoreMenuOpen(false);
      }
    };
    document.addEventListener('pointerdown', handleCloseOutside);
    document.addEventListener('mousedown', handleCloseOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handleCloseOutside);
      document.removeEventListener('mousedown', handleCloseOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const hours = Math.floor(shiftMinutes / 60);
  const mins = shiftMinutes % 60;

  return (
    <>
      <header className="pos-navbar">
        {/* Left: Cashier Profile & Shift Trigger */}
        <div ref={shiftRef} style={{ position: 'relative' }}>
          <button
            className={`pos-shift ${shiftDropdownOpen ? 'pos-shift-open' : ''}`}
            onClick={() => setShiftDropdownOpen((prev) => !prev)}
            title={shiftDropdownOpen ? 'Tutup Menu Sif Kasir (Esc)' : 'Buka Menu Sif & Profil Kasir'}
            aria-expanded={shiftDropdownOpen}
          >
            <img
              className="shift-photo"
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=160&h=160&q=80"
              alt={user?.name || 'Kasir'}
            />
            <span>
              <b>{user?.name || 'Kasir RUANG TEMU'}</b>
              <small>
                {hasActiveShift ? (
                  <>Sif Aktif · {hours > 0 ? `${hours}j ` : ''}{mins}m</>
                ) : (
                  <span style={{ color: '#ffb4b4', fontWeight: 600 }}>Sif Belum Dibuka</span>
                )}
              </small>
            </span>
            <span className={`pos-shift-chevron ${shiftDropdownOpen ? 'is-open' : ''}`} aria-hidden="true">
              <Icon name="chevronDown" size={15} />
            </span>
          </button>

          {/* Shift Popover Dropdown */}
          {shiftDropdownOpen && (
            <aside className="shift-popover">
              <header>
                <img
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=160&h=160&q=80"
                  alt={user?.name || 'Kasir'}
                />
                <div className="shift-popover-user-info">
                  <b>{user?.name}</b>
                  <em>{user?.role === 'OWNER' ? 'Owner / Pengelola' : 'Kasir Operasional'}</em>
                </div>
                <button
                  type="button"
                  className="shift-popover-close"
                  onClick={() => setShiftDropdownOpen(false)}
                  title="Tutup Menu Sif (Esc)"
                  aria-label="Tutup Menu Sif"
                >
                  <Icon name="close" size={16} />
                </button>
              </header>

              {hasActiveShift && shift ? (
                <div className="shift-summary">
                  <span>
                    Mulai Sif<b>{formatTime(shift.opened_at)}</b>
                  </span>
                  <span>
                    Durasi Sif
                    <b>
                      {hours}j {mins}m
                    </b>
                  </span>
                  <span>
                    Modal Awal<b>{rupiah(shift.opening_cash)}</b>
                  </span>
                  <span>
                    Transaksi Sif<b>{summary?.orderCount || 0} struk</b>
                  </span>
                </div>
              ) : (
                <div
                  style={{
                    padding: '12px 14px',
                    background: '#fff4d6',
                    color: '#7a4e00',
                    borderRadius: '8px',
                    fontSize: '13px',
                    margin: '8px 12px',
                  }}
                >
                  Kasir belum membuka sif hari ini. Silakan buka sif untuk mulai melayani transaksi.
                </div>
              )}

              {!hasActiveShift ? (
                <button
                  onClick={() => {
                    setShiftDropdownOpen(false);
                    onOpenShiftModal('open');
                  }}
                  style={{ color: '#57695b', fontWeight: 600 }}
                >
                  <Icon name="wallet" size={18} />
                  Buka Sif Kasir Baru
                </button>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setShiftDropdownOpen(false);
                      onOpenShiftModal('recap');
                    }}
                  >
                    <Icon name="receipt" size={18} />
                    Rekap Sif Kasir
                  </button>
                  <button
                    onClick={() => {
                      setShiftDropdownOpen(false);
                      onOpenShiftModal('cash');
                    }}
                  >
                    <Icon name="wallet" size={18} />
                    Kas Masuk / Kas Keluar Operasional
                  </button>
                  <button
                    onClick={() => {
                      setShiftDropdownOpen(false);
                      onOpenShiftModal('close');
                    }}
                    style={{ color: '#a32424' }}
                  >
                    <Icon name="calculator" size={18} />
                    Tutup Sif Kasir (Blind Cash Close)
                  </button>
                </>
              )}

              {/* Quick links to Management Tools */}
              <div style={{ padding: '6px 0', borderTop: '1px solid #e5e7eb', marginTop: '6px' }}>
                <button
                  onClick={() => {
                    setShiftDropdownOpen(false);
                    onOpenMatrix();
                  }}
                  style={{ fontSize: '13px', width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <Icon name="trendingUp" size={16} />
                  Matriks Keputusan Menu (BCG)
                </button>

                {user?.role === 'OWNER' && onSwitchToAdmin && (
                  <button
                    onClick={() => {
                      setShiftDropdownOpen(false);
                      onSwitchToAdmin();
                    }}
                    style={{ fontSize: '13px', color: '#57695b', fontWeight: 600, width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}
                  >
                    <Icon name="dashboard" size={16} />
                    Masuk Mode Backoffice
                  </button>
                )}
              </div>

              <button
                onClick={() => {
                  setShiftDropdownOpen(false);
                  setLogoutConfirmOpen(true);
                }}
                style={{ color: '#a32424', borderTop: '1px solid #e5e7eb', marginTop: '4px' }}
              >
                <Icon name="logout" size={16} />
                Keluar Sesi Kasir
              </button>
            </aside>
          )}
        </div>

        {/* Center: Brand Wordmark (Mathematically Centered, Safe Zone Protected) */}
        <div className="pos-brand-center" aria-label="Ruang Temu Brand">
          <img
            src="/brand/ruang-temu-navbar.png"
            alt="ruang temu."
            className="brand-wordmark"
          />
        </div>

        {/* Right: Quick Operational Tools */}
        <div className="pos-navbar-actions">
          {/* Held Orders (Pesanan Ditahan) */}
          <button
            onClick={onOpenHeldOrders}
            className={`pos-nav-btn ${heldOrdersCount > 0 ? 'pos-nav-btn-active' : ''}`}
            title="Daftar Pesanan Ditahan (Parked Orders)"
            aria-label="Pesanan Ditahan"
          >
            <Icon name="pause" size={14} />
            <span className="pos-nav-text">Tahan</span>
            {heldOrdersCount > 0 && (
              <span className="pos-nav-badge">
                {heldOrdersCount}
              </span>
            )}
          </button>

          {/* Order History */}
          <button
            onClick={onOpenHistory}
            className="pos-nav-btn"
            title="Riwayat Transaksi POS & Cetak Ulang Struk"
            aria-label="Riwayat Transaksi"
          >
            <Icon name="history" size={14} />
            <span className="pos-nav-text">Riwayat</span>
          </button>

          {/* Printer Status */}
          <button
            onClick={onOpenPrinter}
            className="pos-nav-btn"
            title={`Status Printer: ${printerOnline ? 'Dapur & Bar Online' : 'Printer Offline'}`}
            aria-label="Status Printer"
          >
            <Icon name="printer" size={14} />
            <span className="pos-nav-text">Printer</span>
            <span className="pos-printer-dots">
              <i style={{ backgroundColor: printerOnline ? '#2e7d32' : '#c62828' }} />
              <i style={{ backgroundColor: printerOnline ? '#2e7d32' : '#c62828' }} />
            </span>
          </button>

          {/* Cart Indicator / Toggle Button */}
          {onToggleCart && (
            <button
              onClick={onToggleCart}
              className={`pos-nav-btn pos-nav-cart-btn ${isCartOpen ? 'pos-nav-cart-open' : ''}`}
              title={isCartOpen ? 'Sembunyikan Panel Keranjang' : 'Buka Panel Keranjang'}
              aria-label="Toggle Keranjang"
            >
              <Icon name="bag" size={14} />
              <span className="pos-nav-text">Keranjang</span>
              {cartItemCount > 0 && (
                <span className="pos-nav-badge-accent">
                  {cartItemCount}
                </span>
              )}
            </button>
          )}

          {/* Secondary Tools: More Menu (⋯) */}
          <div ref={moreMenuRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setMoreMenuOpen(!moreMenuOpen)}
              className={`pos-nav-btn pos-nav-icon-btn ${moreMenuOpen ? 'pos-nav-btn-active' : ''}`}
              title="Menu Lainnya & Alat Manajemen"
              aria-label="Menu Lainnya"
              aria-expanded={moreMenuOpen}
            >
              <Icon name="moreVertical" size={16} />
            </button>

            {moreMenuOpen && (
              <div className="pos-nav-dropdown">
                {/* Matriks Keputusan Menu BCG */}
                <button
                  onClick={() => {
                    setMoreMenuOpen(false);
                    onOpenMatrix();
                  }}
                  className="pos-dropdown-item"
                >
                  <Icon name="trendingUp" size={16} />
                  <div>
                    <strong>Matriks Menu (BCG)</strong>
                    <small>Analisis kontribusi & strategi menu</small>
                  </div>
                </button>

                {/* Backoffice (Khusus Owner) */}
                {user?.role === 'OWNER' && onSwitchToAdmin && (
                  <button
                    onClick={() => {
                      setMoreMenuOpen(false);
                      onSwitchToAdmin();
                    }}
                    className="pos-dropdown-item"
                  >
                    <Icon name="dashboard" size={16} />
                    <div>
                      <strong>Mode Backoffice</strong>
                      <small>Dashboard manajemen & stok</small>
                    </div>
                  </button>
                )}

                <hr className="pos-dropdown-divider" />

                {/* Logout */}
                <button
                  onClick={() => {
                    setMoreMenuOpen(false);
                    setLogoutConfirmOpen(true);
                  }}
                  className="pos-dropdown-item pos-dropdown-danger"
                >
                  <Icon name="logout" size={16} />
                  <div>
                    <strong>Keluar Kasir</strong>
                    <small>Tutup sesi login terminal</small>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* Quick Logout Button */}
          <button
            onClick={() => setLogoutConfirmOpen(true)}
            className="pos-nav-btn pos-nav-icon-btn"
            title="Keluar dari Akun Kasir"
            aria-label="Keluar"
          >
            <Icon name="logout" size={15} />
          </button>
        </div>
      </header>

      {/* Logout Confirmation Dialog */}
      {logoutConfirmOpen && (
        <div className="bo-modal-layer">
          <div className="bo-confirm pos-logout-confirm" role="alertdialog">
            <span>
              <Icon name="logout" size={28} />
            </span>
            <h2>Keluar dari Akun Kasir?</h2>
            <p>
              Pastikan Anda telah menyelesaikan transaksi aktif sebelum keluar dari terminal kasir.
            </p>
            <div>
              <button onClick={() => setLogoutConfirmOpen(false)}>Batal</button>
              <button
                className="bo-primary"
                onClick={() => {
                  setLogoutConfirmOpen(false);
                  logout();
                }}
              >
                Keluar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
