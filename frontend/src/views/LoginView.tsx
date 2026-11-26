import React, { useState } from 'react';
import {
  LockKeyhole,
  UserRound,
  ArrowRight,
  Eye,
  EyeOff,
  X,
  ShieldCheck,
  Store,
} from 'lucide-react';
import { authApi, setAuthToken, setAuthUser } from '../api/client';
import type { User } from '../types';

interface LoginViewProps {
  onSuccess: (user: User) => void;
  onCancel: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onSuccess, onCancel }) => {
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [capsLock, setCapsLock] = useState<boolean>(false);
  const [processing, setProcessing] = useState<boolean>(false);
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setErrorMessage('');

    if (!username.trim() || !password) return;

    setProcessing(true);
    try {
      const res = await authApi.login(username.trim(), password);
      if (res.success && res.data) {
        setAuthToken(res.data.token);
        setAuthUser(res.data.user);
        onSuccess(res.data.user);
      } else {
        setErrorMessage(res.message || 'Nama pengguna atau kata sandi tidak sesuai.');
        setPassword('');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal terhubung ke server autentikasi.');
    } finally {
      setProcessing(false);
    }
  };

  const handleQuickLogin = async (user: string, pass: string) => {
    setUsername(user);
    setPassword(pass);
    setProcessing(true);
    setErrorMessage('');
    try {
      const res = await authApi.login(user, pass);
      if (res.success && res.data) {
        setAuthToken(res.data.token);
        setAuthUser(res.data.user);
        onSuccess(res.data.user);
      } else {
        setErrorMessage(res.message || 'Gagal masuk akun demonstrasi.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal terhubung ke server.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6"
      style={{
        background: 'rgba(39, 39, 39, 0.75)',
        backdropFilter: 'blur(8px)',
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-4xl overflow-hidden rounded-2xl shadow-2xl"
        style={{
          background: 'var(--surface)',
          display: 'grid',
          gridTemplateColumns: 'minmax(280px, 42%) 1fr',
          minHeight: '520px',
        }}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onCancel}
          className="absolute top-4 right-4 z-20 flex h-9 w-9 items-center justify-center rounded-full transition-colors"
          style={{
            background: 'var(--green-soft)',
            color: 'var(--ink)',
            border: '1px solid var(--border)',
          }}
          aria-label="Tutup"
        >
          <X size={18} />
        </button>

        {/* Left Brand Panel (Sage Green #57695b) */}
        <section className="staff-login-brand" style={{ minHeight: '100%' }}>
          <div>
            <img
              src="/brand/ruang-temu-navbar.png"
              alt="Ruang Temu"
              style={{ maxHeight: '110px' }}
            />
          </div>
        </section>

        {/* Right Form Panel */}
        <section
          className="staff-login-form"
          style={{
            padding: '36px 40px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          <form onSubmit={submit} noValidate style={{ width: '100%', maxWidth: '360px' }}>
            <header>
              <h1>Masuk Staf</h1>
              <i />
            </header>

            <label>
              <span>Nama pengguna</span>
              <div className="staff-input-field">
                <input
                  autoFocus
                  autoComplete="username"
                  inputMode="text"
                  placeholder="owner atau kasir"
                  value={username}
                  disabled={processing}
                  aria-invalid={submitted && !username.trim()}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setErrorMessage('');
                  }}
                />
              </div>
              {submitted && !username.trim() && (
                <small>Isi nama pengguna terlebih dahulu.</small>
              )}
            </label>

            <label>
              <span>Kata sandi</span>
              <div className="staff-password-field">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  disabled={processing}
                  aria-invalid={(submitted && !password) || Boolean(errorMessage)}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setErrorMessage('');
                  }}
                  onKeyUp={(e) => setCapsLock(e.getModifierState('CapsLock'))}
                  onKeyDown={(e) => setCapsLock(e.getModifierState('CapsLock'))}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {submitted && !password && (
                <small>Isi kata sandi terlebih dahulu.</small>
              )}
              {capsLock && password && <em>Caps Lock aktif.</em>}
            </label>

            {errorMessage && (
              <p className="staff-login-error">
                <X size={16} /> {errorMessage}
              </p>
            )}

            <button className="staff-login-submit" disabled={processing} type="submit">
              <span>{processing ? 'Memverifikasi…' : 'Masuk ke Sistem'}</span>
              {!processing && <ArrowRight size={18} />}
            </button>

            {/* Quick 1-Click Role Login for Convenience */}
            <div
              style={{
                marginTop: '20px',
                paddingTop: '16px',
                borderTop: '1px solid var(--border)',
                display: 'grid',
                gap: '8px',
              }}
            >
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                }}
              >
                Pilih Akses Masuk (2 Role Berbeda):
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => handleQuickLogin('owner', 'owner123')}
                  disabled={processing}
                  style={{
                    padding: '10px 10px',
                    borderRadius: '8px',
                    border: '1px solid #d99a4e',
                    background: 'rgba(217, 154, 78, 0.12)',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: 'var(--ink)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                    textAlign: 'center',
                  }}
                  title="Masuk sebagai Owner: Laporan Finansial, Purchasing PO, Audit Keamanan, Pengaturan Toko"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <ShieldCheck size={16} style={{ color: '#b07936' }} />
                    <span style={{ fontWeight: 800 }}>👑 OWNER</span>
                  </div>
                  <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                    Laporan, PO & Audit
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickLogin('kasir', 'kasir123')}
                  disabled={processing}
                  style={{
                    padding: '10px 10px',
                    borderRadius: '8px',
                    border: '1px solid var(--green)',
                    background: 'rgba(87, 105, 91, 0.12)',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: 'var(--ink)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                    textAlign: 'center',
                  }}
                  title="Masuk sebagai Kasir: POS Transaksi, Buka/Tutup Shift, Meja Resto, Kitchen KDS"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Store size={16} style={{ color: 'var(--green)' }} />
                    <span style={{ fontWeight: 800 }}>💼 KASIR</span>
                  </div>
                  <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                    POS, Shift & Meja
                  </span>
                </button>
              </div>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
};
