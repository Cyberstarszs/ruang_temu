'use client';

import React, { useState, useEffect } from 'react';
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
  heldOrdersCount?: number;
  pendingQrCount?: number;
  printerOnline?: boolean;
}

export function PosHeader({
  onOpenHistory,
  onOpenPrinter,
  onOpenMatrix,
  onOpenShiftModal,
  onOpenHeldOrders,
  heldOrdersCount = 0,
  pendingQrCount = 0,
  printerOnline = true,
}: PosHeaderProps) {
  const { user, logout } = useAuth();
  const { shift, summary, hasActiveShift } = useShift();
  const [shiftDropdownOpen, setShiftDropdownOpen] = useState(false);
  const [shiftMinutes, setShiftMinutes] = useState(0);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);

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

  const hours = Math.floor(shiftMinutes / 60);
  const mins = shiftMinutes % 60;

  return (
    <>
      <header className="pos-navbar">
        {/* Left: Cashier Profile & Shift Trigger */}
        <button
          className="pos-shift"
          onClick={() => setShiftDropdownOpen(!shiftDropdownOpen)}
          title="Menu Sif Kasir"
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
                <span style={{ color: '#a32424', fontWeight: 600 }}>Sif Belum Dibuka</span>
              )}
            </small>
          </span>
          <Icon name="chevronDown" size={16} />
        </button>

        {/* Center: Brand Wordmark */}
        <div className="pos-brand-center">
          <img
            src="/brand/ruang-temu-navbar.png"
            alt="RUANG TEMU"
            className="brand-wordmark"
            style={{ maxHeight: '34px', objectFit: 'contain' }}
          />
        </div>

        {/* Right: Quick Tools */}
        <div className="pos-navbar-actions">
          {/* Held Orders (Pesanan Ditahan) */}
          <button
            className="pos-icon relative"
            onClick={onOpenHeldOrders}
            title="Daftar Pesanan Ditahan (Parked Orders)"
            aria-label="Pesanan Ditahan"
          >
            <Icon name="pause" size={19} />
            {heldOrdersCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  background: '#57695b',
                  color: '#fff',
                  borderRadius: '999px',
                  fontSize: '11px',
                  fontWeight: 700,
                  width: '18px',
                  height: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                }}
              >
                {heldOrdersCount}
              </span>
            )}
          </button>

          {/* Menu Matrix BCG Decision Analytics */}
          <button
            className="pos-icon"
            onClick={onOpenMatrix}
            title="Keputusan Menu (Matriks BCG & Analisis Profit)"
            aria-label="Matriks Menu"
          >
            <Icon name="trendingUp" size={20} />
          </button>

          {/* Order History */}
          <button
            className="pos-icon relative"
            onClick={onOpenHistory}
            title="Riwayat Transaksi & Antrean QR"
            aria-label="Riwayat Transaksi"
          >
            <Icon name="history" size={20} />
            {pendingQrCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  background: '#a32424',
                  color: '#fff',
                  borderRadius: '999px',
                  fontSize: '11px',
                  fontWeight: 700,
                  width: '18px',
                  height: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {pendingQrCount}
              </span>
            )}
          </button>

          {/* Printer Status */}
          <button
            className="pos-printer-control"
            onClick={onOpenPrinter}
            title="Status Stasiun Printer Kitchen & Bar"
            aria-label="Status Printer"
          >
            <Icon name="printer" size={20} />
            <span>
              <i style={{ backgroundColor: printerOnline ? '#57695b' : '#a32424' }} />
              <i style={{ backgroundColor: printerOnline ? '#57695b' : '#a32424' }} />
            </span>
          </button>

          {/* Logout */}
          <button
            className="pos-icon"
            onClick={() => setLogoutConfirmOpen(true)}
            title="Keluar dari Akun Kasir"
            aria-label="Keluar"
          >
            <Icon name="logout" size={20} />
          </button>
        </div>

        {/* Shift Popover Dropdown */}
        {shiftDropdownOpen && (
          <aside className="shift-popover">
            <header>
              <img
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=160&h=160&q=80"
                alt={user?.name || 'Kasir'}
              />
              <span>
                <small>Halo, {user?.name?.split(' ')[0]}</small>
                <b>{user?.name}</b>
                <em>Peran: {user?.role === 'CASHIER' ? 'Kasir Operasional' : user?.role}</em>
              </span>
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

            <button
              onClick={() => {
                setShiftDropdownOpen(false);
                setLogoutConfirmOpen(true);
              }}
            >
              <Icon name="close" size={18} />
              Keluar Sesi
            </button>
          </aside>
        )}
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
