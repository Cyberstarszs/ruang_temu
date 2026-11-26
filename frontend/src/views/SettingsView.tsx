import React, { useState, useEffect } from 'react';
import { Settings, Printer, Store, Wifi, Save, RefreshCw } from 'lucide-react';
import { settingsApi } from '../api/client';
import type { StoreSettings } from '../types';

interface SettingsViewProps {
  onNotify: (msg: string) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onNotify }) => {
  const [settings, setSettings] = useState<StoreSettings>({
    store_name: 'RUANG TEMU',
    address: 'Jl. Raya Cafe No. 88, Kota Anda',
    phone: '(021) 789-0123',
    wifi_ssid: 'RuangTemu-Guest',
    wifi_password: 'kopihitam2024',
    receipt_footer: 'Harga sudah termasuk pajak (Nett Pricing)',
    bar_printer_ip: '192.168.1.200',
    kitchen_printer_ip: '192.168.1.201',
    paper_size: '58mm',
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const res = await settingsApi.get();
      if (res.success && res.data) {
        setSettings((prev) => ({ ...prev, ...res.data }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await settingsApi.update(settings);
      if (res.success) {
        onNotify('Pengaturan toko dan hardware printer berhasil diperbarui!');
      } else {
        alert(res.message || 'Gagal menyimpan pengaturan.');
      }
    } catch (err: any) {
      alert(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-64px)] overflow-y-auto bg-[#121316] text-white p-6">
      <div className="max-w-4xl w-full mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Settings className="text-[#c59a68]" size={24} />
              <span>Pengaturan Kafe & Hardware Printer</span>
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Konfigurasi profil kafe, footer struk belanja, dan IP printer checker Bar & Kitchen
            </p>
          </div>
          <button
            onClick={loadSettings}
            disabled={loading}
            className="p-2 rounded-xl bg-[#1e2026] hover:bg-[#282b33] border border-[#2e313c] text-zinc-300 transition"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Section 1: Profil Toko */}
          <div className="bg-[#181a20] border border-[#262832] rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2 pb-2 border-b border-[#252832]">
              <Store size={17} className="text-[#c59a68]" />
              <span>Profil Kafe & Header Struk</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Nama Bisnis / Kafe:</label>
                <input
                  type="text"
                  value={settings.store_name}
                  onChange={(e) => setSettings({ ...settings, store_name: e.target.value })}
                  className="w-full bg-[#121316] border border-[#2e313b] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#c59a68]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Nomor Telepon Kafe:</label>
                <input
                  type="text"
                  value={settings.phone}
                  onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                  className="w-full bg-[#121316] border border-[#2e313b] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#c59a68]"
                  required
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Alamat Lengkap:</label>
                <input
                  type="text"
                  value={settings.address}
                  onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                  className="w-full bg-[#121316] border border-[#2e313b] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#c59a68]"
                  required
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Catatan Footer Struk Kasir:</label>
                <input
                  type="text"
                  value={settings.receipt_footer}
                  onChange={(e) => setSettings({ ...settings, receipt_footer: e.target.value })}
                  className="w-full bg-[#121316] border border-[#2e313b] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#c59a68]"
                />
              </div>
            </div>
          </div>

          {/* Section 2: WiFi Pelanggan */}
          <div className="bg-[#181a20] border border-[#262832] rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2 pb-2 border-b border-[#252832]">
              <Wifi size={17} className="text-[#c59a68]" />
              <span>Informasi WiFi Pelanggan (Tercetak di Struk)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Nama WiFi (SSID):</label>
                <input
                  type="text"
                  value={settings.wifi_ssid}
                  onChange={(e) => setSettings({ ...settings, wifi_ssid: e.target.value })}
                  className="w-full bg-[#121316] border border-[#2e313b] rounded-xl px-3 py-2 text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Password WiFi:</label>
                <input
                  type="text"
                  value={settings.wifi_password}
                  onChange={(e) => setSettings({ ...settings, wifi_password: e.target.value })}
                  className="w-full bg-[#121316] border border-[#2e313b] rounded-xl px-3 py-2 text-xs text-white font-mono"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Hardware ESC/POS Network Printers */}
          <div className="bg-[#181a20] border border-[#262832] rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2 pb-2 border-b border-[#252832]">
              <Printer size={17} className="text-[#c59a68]" />
              <span>Konfigurasi Network Checker Printer (RAW TCP Port 9100)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">IP Printer Bar Minuman:</label>
                <input
                  type="text"
                  value={settings.bar_printer_ip}
                  onChange={(e) => setSettings({ ...settings, bar_printer_ip: e.target.value })}
                  className="w-full bg-[#121316] border border-[#2e313b] rounded-xl px-3 py-2 text-xs text-white font-mono"
                  required
                />
                <span className="text-[10px] text-zinc-500 mt-1 block">Port 9100 over WiFi/LAN</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">IP Printer Dapur Makanan:</label>
                <input
                  type="text"
                  value={settings.kitchen_printer_ip}
                  onChange={(e) => setSettings({ ...settings, kitchen_printer_ip: e.target.value })}
                  className="w-full bg-[#121316] border border-[#2e313b] rounded-xl px-3 py-2 text-xs text-white font-mono"
                  required
                />
                <span className="text-[10px] text-zinc-500 mt-1 block">Port 9100 over WiFi/LAN</span>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-4 bg-[#c59a68] hover:bg-[#d6a977] text-black font-extrabold rounded-2xl text-sm transition shadow-lg shadow-[#c59a68]/20 flex items-center justify-center gap-2"
          >
            <Save size={18} />
            <span>{saving ? 'Menyimpan Pengaturan...' : 'Simpan Seluruh Pengaturan'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
