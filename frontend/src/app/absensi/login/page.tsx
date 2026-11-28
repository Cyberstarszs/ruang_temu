'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Eye, EyeOff } from 'lucide-react';

export default function AttendanceLoginPage() {
  const { isAuthenticated, user, isLoading, login } = useAuth();
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      router.replace('/absensi');
    }
  }, [isAuthenticated, user, isLoading, router]);

  if (isLoading || (isAuthenticated && user)) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    const cleanUsername = username.trim();
    if (!cleanUsername || !password) {
      setErrorMessage('Username dan kata sandi wajib diisi.');
      return;
    }

    try {
      setProcessing(true);
      const res = await login(cleanUsername, password);
      if (res.success) {
        router.replace('/absensi');
      } else {
        setErrorMessage(res.message || 'Username atau kata sandi salah.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal masuk ke sistem absensi.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <main className="staff-login">
      {/* Brand Panel Kiri */}
      <section className="staff-login-brand">
        <div>
          <img src="/brand/ruang-temu-navbar.png" alt="RUANG TEMU" />
        </div>
      </section>

      {/* Form Login Khusus Absensi Karyawan */}
      <section className="staff-login-form">
        <form onSubmit={handleSubmit} noValidate>
          <header>
            <h1>Absensi Karyawan</h1>
            <i />
          </header>

          {errorMessage && (
            <div className="staff-login-error" role="alert">
              <span>{errorMessage}</span>
            </div>
          )}

          <label>
            <span>Username</span>
            <input
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Masukkan username karyawan"
              required
              autoFocus
              disabled={processing}
            />
          </label>

          <label>
            <span>Kata Sandi</span>
            <div className="staff-password-field">
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan kata sandi"
                required
                disabled={processing}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>

          <button type="submit" disabled={processing} className="staff-login-submit">
            {processing ? (
              <>
                <i />
                <span>Memproses...</span>
              </>
            ) : (
              <span>Masuk ke Absensi</span>
            )}
          </button>

          <div style={{ marginTop: '14px', textAlign: 'center' }}>
            <Link
              href="/login"
              style={{
                fontSize: '12px',
                color: '#64746b',
                textDecoration: 'none',
                fontWeight: 500,
              }}
            >
              Masuk Kasir / Owner →
            </Link>
          </div>
        </form>
      </section>
    </main>
  );
}
