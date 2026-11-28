'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useShift } from '@/context/ShiftContext';
import { useOfflineSync } from '@/context/OfflineSyncContext';
import { OfflineOrdersModal } from '@/components/pos/OfflineOrdersModal';
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
  const { isOnline, pendingOfflineCount, failedCount, isSyncing, triggerSync } = useOfflineSync();
  const [offlineModalOpen, setOfflineModalOpen] = useState(false);
  const [shiftDropdownOpen, setShiftDropdownOpen] = useState(false);
  const [shiftMinutes, setShiftMinutes] = useState(0);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);

  const shiftRef = useRef<HTMLDivElement>(null);

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
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShiftDropdownOpen(false);
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
        {/* Left: Cashier Profile & Shift Trigger + Fitur Pengeluaran */}
        <div className="pos-navbar-left">
          <div ref={shiftRef} style={{ position: 'relative' }}>
            <button
              className={`pos-shift ${shiftDropdownOpen ? 'pos-shift-open' : ''}`}
            onClick={() => setShiftDropdownOpen((prev) => !prev)}
            title={shiftDropdownOpen ? 'Tutup Menu Sif Kasir (Esc)' : 'Buka Menu Sif & Profil Kasir'}
            aria-expanded={shiftDropdownOpen}
            style={{
              height: '34px',
              width: 'fit-content',
              minWidth: 'unset',
              maxWidth: 'fit-content',
              display: 'inline-flex',
              alignItems: 'center',
              padding: '0 9px 0 4px',
              gap: '6px',
              borderRadius: '9999px',
              background: 'rgba(255, 255, 255, 0.12)',
              border: '1px solid rgba(255, 255, 255, 0.22)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.12)',
            }}
          >
            <div style={{ position: 'relative', width: '24px', height: '24px', flexShrink: 0 }}>
              <img
                className="shift-photo"
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=160&h=160&q=80"
                alt={user?.name || 'Kasir'}
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  border: '1.5px solid #d4a373',
                  display: 'block',
                }}
              />
              {hasActiveShift && (
                <span
                  style={{
                    position: 'absolute',
                    bottom: '-1px',
                    right: '-1px',
                    width: '7px',
                    height: '7px',
                    backgroundColor: '#22c55e',
                    borderRadius: '50%',
                    border: '1.5px solid #324036',
                  }}
                  title="Sif Aktif"
                />
              )}
            </div>
            <span style={{ textAlign: 'left', lineHeight: '1.15' }}>
              <b style={{ fontSize: '12px', fontWeight: 600, color: '#ffffff', display: 'block' }}>
                {user?.name || 'Kasir RUANG TEMU'}
              </b>
              <small style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.82)', display: 'block' }}>
                {hasActiveShift ? (
                  <>Sif Aktif · {hours > 0 ? `${hours}j ` : ''}{mins}m</>
                ) : (
                  <span style={{ color: '#ffb4b4', fontWeight: 600 }}>Sif Belum Dibuka</span>
                )}
              </small>
            </span>
            <span className={`pos-shift-chevron ${shiftDropdownOpen ? 'is-open' : ''}`} aria-hidden="true" style={{ color: '#ffffff' }}>
              <Icon name="chevronDown" size={12} />
            </span>
          </button>

          {/* Shift Popover Dropdown - Modern, Professional, Clean Presentation */}
          {shiftDropdownOpen && (
            <aside
              className="shift-popover"
              style={{
                width: '320px',
                padding: '16px',
                borderRadius: '16px',
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.16), 0 4px 12px rgba(0, 0, 0, 0.08)',
                border: '1px solid #e2e8f0',
                background: '#ffffff',
              }}
            >
              {/* Header: User Profile Info + Close Button */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingBottom: '12px',
                  borderBottom: '1px solid #f1f5f9',
                  gap: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                  <img
                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=160&h=160&q=80"
                    alt={user?.name || 'Kasir'}
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      border: '2px solid #57695b',
                      objectFit: 'cover',
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ minWidth: 0 }}>
                    <b
                      style={{
                        fontSize: '14px',
                        fontWeight: 700,
                        color: '#1e293b',
                        display: 'block',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {user?.name || 'Kasir'}
                    </b>
                    <span
                      style={{
                        display: 'inline-block',
                        fontSize: '11px',
                        fontWeight: 600,
                        color: '#57695b',
                        backgroundColor: '#edf3ee',
                        padding: '1.5px 7px',
                        borderRadius: '999px',
                        marginTop: '2px',
                      }}
                    >
                      {user?.role === 'OWNER' ? 'Owner / Pengelola' : 'Kasir Operasional'}
                    </span>
                  </div>
                </div>

                {/* Circular Clean Close Button */}
                <button
                  type="button"
                  className="shift-popover-close"
                  onClick={() => setShiftDropdownOpen(false)}
                  title="Tutup Menu Sif (Esc)"
                  aria-label="Tutup Menu Sif"
                  style={{
                    width: '28px',
                    height: '28px',
                    minWidth: '28px',
                    maxWidth: '28px',
                    minHeight: '28px',
                    maxHeight: '28px',
                    padding: 0,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#f1f5f9',
                    border: '1px solid #e2e8f0',
                    color: '#64748b',
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                >
                  <Icon name="close" size={14} />
                </button>
              </div>

              {/* Shift Metrics 2x2 Grid */}
              {hasActiveShift && shift ? (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '8px',
                    padding: '12px 0',
                    borderBottom: '1px dashed #e2e8f0',
                  }}
                >
                  <div
                    style={{
                      padding: '8px 10px',
                      backgroundColor: '#f8faf9',
                      borderRadius: '10px',
                      border: '1px solid #edf2ee',
                    }}
                  >
                    <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Mulai Sif</span>
                    <b style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b', marginTop: '2px', display: 'block' }}>
                      {formatTime(shift.opened_at)}
                    </b>
                  </div>
                  <div
                    style={{
                      padding: '8px 10px',
                      backgroundColor: '#f8faf9',
                      borderRadius: '10px',
                      border: '1px solid #edf2ee',
                    }}
                  >
                    <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Durasi Sif</span>
                    <b style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b', marginTop: '2px', display: 'block' }}>
                      {hours}j {mins}m
                    </b>
                  </div>
                  <div
                    style={{
                      padding: '8px 10px',
                      backgroundColor: '#f8faf9',
                      borderRadius: '10px',
                      border: '1px solid #edf2ee',
                    }}
                  >
                    <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Modal Awal</span>
                    <b style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b', marginTop: '2px', display: 'block' }}>
                      {rupiah(shift.opening_cash)}
                    </b>
                  </div>
                  <div
                    style={{
                      padding: '8px 10px',
                      backgroundColor: '#f8faf9',
                      borderRadius: '10px',
                      border: '1px solid #edf2ee',
                    }}
                  >
                    <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Transaksi</span>
                    <b style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b', marginTop: '2px', display: 'block' }}>
                      {summary?.orderCount || 0} struk
                    </b>
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    padding: '10px 12px',
                    background: '#fffbeb',
                    color: '#92400e',
                    border: '1px solid #fef3c7',
                    borderRadius: '10px',
                    fontSize: '12px',
                    margin: '10px 0',
                    lineHeight: '1.4',
                  }}
                >
                  Kasir belum membuka sif hari ini. Silakan buka sif untuk mulai melayani transaksi.
                </div>
              )}

              {/* Action Buttons List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginTop: '8px' }}>
                {!hasActiveShift ? (
                  <button
                    type="button"
                    className="shift-action-btn"
                    onClick={() => {
                      setShiftDropdownOpen(false);
                      onOpenShiftModal('open');
                    }}
                    style={{
                      color: '#57695b',
                      fontWeight: 600,
                      backgroundColor: '#edf3ee',
                      borderRadius: '8px',
                      padding: '8px 10px',
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      width: '100%',
                    }}
                  >
                    <Icon name="wallet" size={17} />
                    Buka Sif Kasir Baru
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      className="shift-action-btn"
                      onClick={() => {
                        setShiftDropdownOpen(false);
                        onOpenShiftModal('recap');
                      }}
                      style={{
                        padding: '8px 10px',
                        border: 'none',
                        background: 'transparent',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        color: '#334155',
                        fontSize: '13px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        width: '100%',
                        textAlign: 'left',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <Icon name="receipt" size={17} className="text-slate-500" />
                      Rekap Sif Kasir
                    </button>
                    <button
                      type="button"
                      className="shift-action-btn"
                      onClick={() => {
                        setShiftDropdownOpen(false);
                        onOpenShiftModal('cash');
                      }}
                      style={{
                        padding: '8px 10px',
                        border: 'none',
                        background: 'transparent',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        color: '#334155',
                        fontSize: '13px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        width: '100%',
                        textAlign: 'left',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <Icon name="wallet" size={17} className="text-slate-500" />
                      Kas Masuk / Kas Keluar Operasional
                    </button>
                    <button
                      type="button"
                      className="shift-action-btn"
                      onClick={() => {
                        setShiftDropdownOpen(false);
                        onOpenShiftModal('close');
                      }}
                      style={{
                        padding: '8px 10px',
                        border: 'none',
                        background: 'transparent',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        color: '#dc2626',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        width: '100%',
                        textAlign: 'left',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fef2f2')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <Icon name="calculator" size={17} className="text-red-600" />
                      Tutup Sif Kasir (Blind Cash Close)
                    </button>
                  </>
                )}

                {/* Secondary tools & shortcuts */}
                <div style={{ padding: '6px 0 2px 0', borderTop: '1px solid #f1f5f9', marginTop: '6px' }}>
                  {user?.role === 'OWNER' && (
                    <button
                      type="button"
                      onClick={() => {
                        setShiftDropdownOpen(false);
                        onOpenMatrix();
                      }}
                      style={{
                        padding: '7px 10px',
                        border: 'none',
                        background: 'transparent',
                        borderRadius: '8px',
                        fontSize: '12.5px',
                        color: '#475569',
                        width: '100%',
                        textAlign: 'left',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <Icon name="trendingUp" size={15} />
                      Matriks Keputusan Menu (BCG)
                    </button>
                  )}

                  {user?.role === 'OWNER' && onSwitchToAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        setShiftDropdownOpen(false);
                        onSwitchToAdmin();
                      }}
                      style={{
                        padding: '7px 10px',
                        border: 'none',
                        background: 'transparent',
                        borderRadius: '8px',
                        fontSize: '12.5px',
                        color: '#57695b',
                        fontWeight: 600,
                        width: '100%',
                        textAlign: 'left',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        cursor: 'pointer',
                        marginTop: '2px',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#edf3ee')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <Icon name="dashboard" size={15} />
                      Masuk Mode Backoffice
                    </button>
                  )}
                </div>

                {/* Logout Button */}
                <button
                  type="button"
                  onClick={() => {
                    setShiftDropdownOpen(false);
                    setLogoutConfirmOpen(true);
                  }}
                  style={{
                    padding: '8px 10px',
                    border: 'none',
                    borderTop: '1px solid #f1f5f9',
                    background: 'transparent',
                    borderRadius: '8px',
                    fontSize: '12.5px',
                    color: '#dc2626',
                    fontWeight: 600,
                    width: '100%',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    marginTop: '4px',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fef2f2')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <Icon name="logout" size={15} />
                  Keluar Sesi Kasir
                </button>
              </div>
            </aside>
          )}
        </div>

        {/* Fitur Pengeluaran Kas Operasional (Beli Es Batu, Gas LPG, dll) */}
        <button
          type="button"
          onClick={() => {
            if (!hasActiveShift) {
              onOpenShiftModal('open');
            } else {
              onOpenShiftModal('cash');
            }
          }}
          className="pos-nav-btn pos-nav-expense-btn"
          title="Catat Pengeluaran Kas Operasional (Beli Es Batu, Gas LPG, Bahan Baku, dll)"
          aria-label="Catat Pengeluaran Kas Operasional"
        >
          <Icon name="wallet" size={13} />
          <span className="pos-nav-text">Pengeluaran</span>
        </button>

        {/* Status Offline Badge (Berdampingan dengan Pengeluaran di Kiri) */}
        {!isOnline && (
          <button
            type="button"
            onClick={() => setOfflineModalOpen(true)}
            className="pos-nav-btn"
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.18)',
              border: '1px solid #ef4444',
              color: '#ef4444',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '0 8px',
              cursor: 'pointer',
            }}
            title="Koneksi terputus! Mode Offline aktif. Klik untuk melihat antrean transaksi offline."
          >
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                backgroundColor: '#ef4444',
                boxShadow: '0 0 6px #ef4444',
              }}
            />
            <span className="pos-nav-text">Offline</span>
          </button>
        )}

        {/* Pending Offline Orders Sync Button */}
        {pendingOfflineCount > 0 && (
          <button
            type="button"
            onClick={() => setOfflineModalOpen(true)}
            className="pos-nav-btn"
            style={{
              backgroundColor:
                failedCount > 0
                  ? 'rgba(239, 68, 68, 0.18)'
                  : isSyncing
                  ? 'rgba(59, 130, 246, 0.2)'
                  : 'rgba(245, 158, 11, 0.2)',
              border:
                failedCount > 0
                  ? '1.5px solid #ef4444'
                  : isSyncing
                  ? '1px solid #3b82f6'
                  : '1px solid #f59e0b',
              color:
                failedCount > 0
                  ? '#dc2626'
                  : isSyncing
                  ? '#2563eb'
                  : '#b45309',
              fontWeight: 700,
              cursor: 'pointer',
            }}
            title="Klik untuk membuka pengelola dan resolusi transaksi offline"
          >
            <Icon name="rotateCcw" size={13} className={isSyncing ? 'spin' : ''} />
            <span className="pos-nav-text">
              {failedCount > 0
                ? `Sinkron Bermasalah (${failedCount})`
                : isSyncing
                ? 'Sinkron...'
                : `Sinkron (${pendingOfflineCount})`}
            </span>
          </button>
        )}
      </div>

      {/* Center: Brand Wordmark (Mathematically Centered, Safe Zone Protected) */}
        <div className="pos-brand-center" aria-label="Ruang Temu Brand">
          <img
            src="/brand/ruang-temu-navbar.png"
            alt="ruang temu."
            className="brand-wordmark"
            style={{
              height: '32px',
              maxHeight: '34px',
              width: 'auto',
              objectFit: 'contain',
              display: 'block',
              filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.22))',
              transition: 'all 0.2s ease',
            }}
          />
        </div>

        {/* Right: Quick Operational Tools */}
        <div className="pos-navbar-actions">
          {/* Order History */}
          <button
            onClick={onOpenHistory}
            className="pos-nav-btn"
            title="Riwayat Transaksi POS & Cetak Ulang Struk"
            aria-label="Riwayat Transaksi"
          >
            <Icon name="history" size={13} />
            <span className="pos-nav-text">Riwayat</span>
          </button>

          {/* Printer Status */}
          <button
            onClick={onOpenPrinter}
            className="pos-nav-btn"
            title={`Status Printer: ${printerOnline ? 'Dapur & Bar Online' : 'Printer Offline'}`}
            aria-label="Status Printer"
          >
            <Icon name="printer" size={13} />
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
              <Icon name="bag" size={13} />
              <span className="pos-nav-text">Keranjang</span>
              {cartItemCount > 0 && (
                <span className="pos-nav-badge-accent">
                  {cartItemCount}
                </span>
              )}
            </button>
          )}

          {/* Quick Logout Button */}
          <button
            onClick={() => setLogoutConfirmOpen(true)}
            className="pos-nav-btn pos-nav-icon-btn"
            title="Keluar dari Akun Kasir"
            aria-label="Keluar"
          >
            <Icon name="logout" size={13} />
          </button>
        </div>
      </header>

      {/* Logout Confirmation Dialog */}
      {logoutConfirmOpen && (
        <div className="bo-modal-layer">
          <div className="bo-confirm pos-logout-confirm" role="alertdialog">
            <h2>Keluar dari Akun Kasir?</h2>
            <p>Pastikan transaksi aktif sudah selesai.</p>
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
      {offlineModalOpen && (
        <OfflineOrdersModal onClose={() => setOfflineModalOpen(false)} />
      )}
    </>
  );
}
