'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Icon } from '@/components/common/Icons';

export function LoginForm() {
  const { login } = useAuth();
  const [username, setUsername] = useState('kasir');
  const [password, setPassword] = useState('kasir123');
  const [showPassword, setShowPassword] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (!username.trim() || !password) {
      setErrorMessage('Username dan password wajib diisi.');
      return;
    }

    try {
      setProcessing(true);
      const res = await login(username.trim(), password);
      if (!res.success) {
        setErrorMessage(res.message || 'Username atau password salah.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal masuk ke sistem.');
    } finally {
      setProcessing(false);
    }
  };

  const handleDemoFill = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setErrorMessage('');
  };

  return (
    <main className="staff-login">
      {/* Left Brand Panel */}
      <section className="staff-login-brand">
        <div>
          <img
            src="/brand/ruang-temu-navbar.png"
            alt="RUANG TEMU"
            style={{ maxWidth: '280px', marginBottom: '24px' }}
          />
          <p style={{ color: '#f9f6ee', fontSize: '15px', lineHeight: 1.6, opacity: 0.9 }}>
            Integrated Point of Sale & Cafe Operational Management System.
          </p>
          <div
            style={{
              marginTop: '32px',
              padding: '14px 18px',
              backgroundColor: 'rgba(255,255,255,0.1)',
              borderRadius: '10px',
              backdropFilter: 'blur(4px)',
            }}
          >
            <div style={{ fontSize: '12px', color: '#e8f0e9', fontWeight: 600, marginBottom: '6px' }}>
              AKUN CEPAT (1-KLIK):
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => handleDemoFill('kasir', 'kasir123')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid rgba(255,255,255,0.4)',
                  backgroundColor: username === 'kasir' ? '#fff' : 'transparent',
                  color: username === 'kasir' ? '#57695b' : '#fff',
                  fontWeight: 600,
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                Kasir POS
              </button>
              <button
                type="button"
                onClick={() => handleDemoFill('owner', 'owner123')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid rgba(255,255,255,0.4)',
                  backgroundColor: username === 'owner' ? '#fff' : 'transparent',
                  color: username === 'owner' ? '#57695b' : '#fff',
                  fontWeight: 600,
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                Owner / Manajer
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Right Login Form */}
      <section className="staff-login-form">
        <form onSubmit={handleSubmit} noValidate style={{ maxWidth: '400px', width: '100%', margin: '0 auto' }}>
          <header style={{ marginBottom: '24px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#57695b', textTransform: 'uppercase' }}>
              Terminal Kasir
            </span>
            <h1 style={{ fontSize: '24px', margin: '4px 0 8px', color: '#272727' }}>Masuk ke Sistem</h1>
            <p style={{ fontSize: '13px', color: '#666', margin: 0 }}>
              Gunakan kredensial staf yang telah terdaftar di database RUANG TEMU.
            </p>
          </header>

          {errorMessage && (
            <div
              style={{
                padding: '10px 14px',
                backgroundColor: '#fde8e8',
                color: '#a32424',
                borderRadius: '8px',
                fontSize: '13px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Icon name="circleAlert" size={18} />
              <span>{errorMessage}</span>
            </div>
          )}

          <label style={{ display: 'block', marginBottom: '14px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#4a4a4a', display: 'block', marginBottom: '6px' }}>
              Username Kasir
            </span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Masukkan username (contoh: kasir)"
              required
              autoFocus
              style={{
                width: '100%',
                padding: '12px 14px',
                border: '1px solid #d1d1d1',
                borderRadius: '8px',
                fontSize: '14px',
              }}
            />
          </label>

          <label style={{ display: 'block', marginBottom: '20px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#4a4a4a', display: 'block', marginBottom: '6px' }}>
              Kata Sandi
            </span>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan kata sandi"
                required
                style={{
                  width: '100%',
                  padding: '12px 42px 12px 14px',
                  border: '1px solid #d1d1d1',
                  borderRadius: '8px',
                  fontSize: '14px',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#888',
                  cursor: 'pointer',
                }}
              >
                <Icon name={showPassword ? 'lock' : 'circleHelp'} size={18} />
              </button>
            </div>
          </label>

          <button
            type="submit"
            disabled={processing}
            className="bo-primary"
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '8px',
              fontSize: '15px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            {processing ? (
              'Memverifikasi Akun...'
            ) : (
              <>
                <span>Masuk ke Kasir POS</span>
                <Icon name="arrow" size={18} />
              </>
            )}
          </button>
        </form>
      </section>
    </main>
  );
}
