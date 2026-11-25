'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { StoreSettings } from '@/types';
import {
  Settings,
  Store,
  Printer,
  Receipt,
  Save,
  CheckCircle2,
  RotateCcw,
} from 'lucide-react';

export function AdminSettingsView() {
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Form Fields
  const [storeName, setStoreName] = useState('');
  const [tagline, setTagline] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [receiptFooter, setReceiptFooter] = useState('');
  const [roundingRule, setRoundingRule] = useState('100');

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const res = await api.settings.get();
      if (res.success && res.data) {
        setSettings(res.data);
        setStoreName(res.data.store_name || 'RUANG TEMU');
        setTagline(res.data.tagline || 'Coffee, Eatery, Community');
        setAddress(res.data.address || 'Jl. Raya Pamekasan No. 24, Madura');
        setPhone(res.data.phone || '081234567890');
        setReceiptFooter(res.data.receipt_footer || 'Terima kasih telah berkunjung ke Ruang Temu!');
        setRoundingRule(res.data.rounding_rule?.toString() || '100');
      }
    } catch (err) {
      console.error('Failed to load store settings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const payload = {
        store_name: storeName.trim(),
        tagline: tagline.trim(),
        address: address.trim(),
        phone: phone.trim(),
        receipt_footer: receiptFooter.trim(),
        rounding_rule: Number(roundingRule) || 100,
      };

      const res = await api.settings.update(payload);
      if (res.success) {
        setSuccessMsg('Pengaturan profil kafe & struk kasir berhasil disimpan!');
        setSettings(res.data);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menyimpan pengaturan.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Minimal Action Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
        }}
      >
        <span style={{ fontSize: '13px', fontWeight: 600, color: '#71717a' }}>
          Konfigurasi Kafe & Format Struk
        </span>

        <button
          onClick={loadSettings}
          disabled={isLoading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 14px',
            background: '#f2f4ef',
            color: '#57695b',
            border: '1px solid #dcdfd5',
            borderRadius: '8px',
            fontWeight: 600,
            fontSize: '12.5px',
            cursor: 'pointer',
          }}
        >
          <RotateCcw size={13} className={isLoading ? 'animate-spin' : ''} />
          Reset Nilai
        </button>
      </div>

      {/* Main Form + Live Preview Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '24px',
          alignItems: 'start',
        }}
      >
        {/* Form Settings */}
        <div
          style={{
            background: '#ffffff',
            padding: '24px',
            borderRadius: '16px',
            border: '1px solid #e7e8e3',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {successMsg && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  color: '#15803d',
                  fontSize: '13px',
                }}
              >
                <CheckCircle2 size={16} />
                <span>{successMsg}</span>
              </div>
            )}

            {errorMsg && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#b91c1c',
                  fontSize: '13px',
                }}
              >
                {errorMsg}
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#4b5563', marginBottom: '6px' }}>
                Nama Kafe / Outlet
              </label>
              <input
                type="text"
                required
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  fontSize: '13px',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#4b5563', marginBottom: '6px' }}>
                Slogan / Tagline
              </label>
              <input
                type="text"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  fontSize: '13px',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#4b5563', marginBottom: '6px' }}>
                Alamat Kafe
              </label>
              <textarea
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  fontSize: '13px',
                  fontFamily: 'inherit',
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#4b5563', marginBottom: '6px' }}>
                  No. Telepon / WhatsApp
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    fontSize: '13px',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#4b5563', marginBottom: '6px' }}>
                  Aturan Pembulatan Kasir
                </label>
                <select
                  value={roundingRule}
                  onChange={(e) => setRoundingRule(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    fontSize: '13px',
                    background: '#ffffff',
                  }}
                >
                  <option value="1">Tanpa Pembulatan (Rp 1)</option>
                  <option value="100">Bulat ke Rp 100 terdekat</option>
                  <option value="500">Bulat ke Rp 500 terdekat</option>
                  <option value="1000">Bulat ke Rp 1.000 terdekat</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#4b5563', marginBottom: '6px' }}>
                Pesan Kaki Struk (Receipt Footer Note)
              </label>
              <textarea
                rows={3}
                placeholder="cth: Terima kasih telah berkunjung ke Ruang Temu! Follow Instagram @ruangtemu.cafe"
                value={receiptFooter}
                onChange={(e) => setReceiptFooter(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  fontSize: '13px',
                  fontFamily: 'inherit',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button
                type="submit"
                disabled={isSaving}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '10px 22px',
                  background: '#57695b',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(87, 105, 91, 0.25)',
                }}
              >
                <Save size={16} />
                {isSaving ? 'Menyimpan...' : 'Simpan Pengaturan'}
              </button>
            </div>
          </form>
        </div>

        {/* Live Thermal Receipt Preview */}
        <div
          style={{
            background: '#ffffff',
            padding: '24px',
            borderRadius: '16px',
            border: '1px solid #e7e8e3',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#1c2826', margin: 0 }}>
              Pratinjau Struk Kasir Termal (ESC/POS)
            </h3>
            <Receipt size={18} color="#57695b" />
          </div>

          <div
            style={{
              background: '#fbfbf9',
              border: '1px dashed #cbd5e1',
              borderRadius: '12px',
              padding: '20px',
              fontFamily: 'monospace',
              fontSize: '12px',
              lineHeight: '1.5',
              color: '#1e293b',
              boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.02)',
            }}
          >
            <div style={{ textAlign: 'center', borderBottom: '1px dashed #94a3b8', paddingBottom: '12px', marginBottom: '12px' }}>
              <div style={{ fontSize: '15px', fontWeight: 800 }}>{storeName || 'RUANG TEMU'}</div>
              <div style={{ fontSize: '11px', color: '#64746b' }}>{tagline}</div>
              <div style={{ fontSize: '10px', color: '#64746b', marginTop: '2px' }}>{address}</div>
              <div style={{ fontSize: '10px', color: '#64746b' }}>Telp: {phone}</div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64746b' }}>
              <span>24/11/2026 14:30</span>
              <span>RT-20261124-0012</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64746b', borderBottom: '1px dashed #cbd5e1', paddingBottom: '8px', marginBottom: '8px' }}>
              <span>Kasir: Rian</span>
              <span>Meja: 04</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderBottom: '1px dashed #94a3b8', paddingBottom: '12px', marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>1x Cappuccino Hot (Reguler)</span>
                <span>27.000</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>1x Beef Rice Bowl Sambal Matah</span>
                <span>38.000</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderBottom: '1px dashed #94a3b8', paddingBottom: '12px', marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Subtotal:</span>
                <span>65.000</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '13px' }}>
                <span>TOTAL:</span>
                <span>Rp 65.000</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64746b' }}>
                <span>Pembulatan:</span>
                <span>Rp 0</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>QRIS:</span>
                <span>65.000</span>
              </div>
            </div>

            <div style={{ textAlign: 'center', fontSize: '10px', color: '#64746b', whiteSpace: 'pre-wrap' }}>
              {receiptFooter || 'Terima kasih telah berkunjung ke Ruang Temu!'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
