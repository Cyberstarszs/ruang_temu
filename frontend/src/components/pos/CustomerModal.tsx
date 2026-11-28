'use client';

import React, { useState, useEffect } from 'react';
import { Customer } from '@/types';
import { api } from '@/lib/api';
import { Icon } from '@/components/common/Icons';

interface CustomerModalProps {
  onSelectCustomer: (customer: Customer | null) => void;
  onClose: () => void;
}

export function CustomerModal({ onSelectCustomer, onClose }: CustomerModalProps) {
  const [query, setQuery] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const fetchCustomers = async (search = '') => {
    try {
      setLoading(true);
      const res = await api.customers.search(search);
      if (res.success && res.data) {
        setCustomers(res.data);
      }
    } catch (err) {
      console.error('Error fetching customers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCustomers(query);
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!newName.trim() || !newPhone.trim()) {
      setError('Nama dan nomor telepon WhatsApp wajib diisi.');
      return;
    }

    try {
      setCreating(true);
      const res = await api.customers.create({
        name: newName.trim(),
        phoneNumber: newPhone.trim(),
      });
      if (res.success && res.data) {
        onSelectCustomer(res.data);
        onClose();
      } else {
        setError(res.message || 'Gagal menyimpan data pelanggan.');
      }
    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan data pelanggan.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="bo-modal-layer" onClick={onClose}>
      <div
        className="bo-modal"
        role="dialog"
        aria-modal="true"
        style={{ maxWidth: '520px', width: '92%' }}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="bo-modal-head">
          <h2>Pilih Pelanggan</h2>
          <button onClick={onClose} aria-label="Tutup">
            <Icon name="close" size={18} />
          </button>
        </header>

        <div style={{ flex: '1 1 auto', overflowY: 'auto', padding: '18px 20px' }}>
          {!showAddForm ? (
            <>
              {/* Search input */}
              <div style={{ position: 'relative', marginBottom: '14px' }}>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Cari nama atau nomor WhatsApp..."
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '10px 14px 10px 38px',
                    border: '1px solid #d1d1d1',
                    borderRadius: '8px',
                    fontSize: '14px',
                  }}
                />
                <span
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#888',
                  }}
                >
                  <Icon name="search" size={18} />
                </span>
              </div>

              {/* Action: Add new customer */}
              <button
                type="button"
                onClick={() => setShowAddForm(true)}
                style={{
                  width: '100%',
                  padding: '10px',
                  backgroundColor: '#f3f6f3',
                  border: '1px dashed #57695b',
                  borderRadius: '8px',
                  color: '#57695b',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  marginBottom: '16px',
                }}
              >
                <Icon name="plus" size={16} />
                Daftarkan Pelanggan Baru
              </button>

              {/* Customer List */}
              <div style={{ maxHeight: '280px', overflowY: 'auto' }} className="cashier-choice-list">
                {loading ? (
                  <p style={{ textAlign: 'center', color: '#888', padding: '20px' }}>Mencari data pelanggan...</p>
                ) : customers.length === 0 ? (
                  <p style={{ textAlign: 'center', color: '#888', padding: '20px' }}>
                    Pelanggan tidak ditemukan. Silakan tambahkan baru.
                  </p>
                ) : (
                  customers.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        onSelectCustomer(c);
                        onClose();
                      }}
                    >
                      <span style={{ backgroundColor: '#57695b', color: '#fff' }}>
                        {c.name.slice(0, 2).toUpperCase()}
                      </span>
                      <span>
                        <b>{c.name}</b>
                        <small>
                          {c.phone_number} · Tier {c.tier} · {c.loyalty_points} poin
                        </small>
                      </span>
                      <Icon name="chevron" size={16} />
                    </button>
                  ))
                )}
              </div>
            </>
          ) : (
            <form onSubmit={handleCreate}>
              <h3 style={{ margin: '0 0 12px', fontSize: '15px', color: '#272727' }}>Registrasi Pelanggan Baru</h3>

              {error && (
                <div
                  style={{
                    padding: '8px 12px',
                    backgroundColor: '#fde8e8',
                    color: '#a32424',
                    borderRadius: '6px',
                    fontSize: '13px',
                    marginBottom: '12px',
                  }}
                >
                  {error}
                </div>
              )}

              <label style={{ display: 'block', marginBottom: '12px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#4a4a4a', display: 'block', marginBottom: '4px' }}>
                  Nama Lengkap
                </span>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Contoh: Dina Maharani"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '1px solid #d1d1d1',
                    borderRadius: '8px',
                    fontSize: '14px',
                  }}
                />
              </label>

              <label style={{ display: 'block', marginBottom: '16px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#4a4a4a', display: 'block', marginBottom: '4px' }}>
                  Nomor WhatsApp
                </span>
                <input
                  type="tel"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="Contoh: 081234567890"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '1px solid #d1d1d1',
                    borderRadius: '8px',
                    fontSize: '14px',
                  }}
                />
              </label>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: '1px solid #d1d1d1',
                    background: '#fff',
                    cursor: 'pointer',
                  }}
                >
                  Kembali
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="bo-primary"
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {creating ? 'Menyimpan...' : 'Simpan & Pilih'}
                </button>
              </div>
            </form>
          )}
        </div>

        <footer className="modal-actions" style={{ padding: '12px 20px', borderTop: '1px solid #eee' }}>
          <button
            type="button"
            onClick={() => {
              onSelectCustomer(null);
              onClose();
            }}
            style={{ color: '#a32424' }}
          >
            Hapus Pelanggan Terpilih
          </button>
          <button type="button" onClick={onClose}>
            Tutup
          </button>
        </footer>
      </div>
    </div>
  );
}
