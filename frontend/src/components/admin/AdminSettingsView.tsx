'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { StoreSettings } from '@/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { NumberInput } from '@/components/ui/number-input';
import {
  Store,
  Printer,
  Receipt,
  Save,
  CheckCircle2,
  RotateCcw,
  Coffee,
  MapPin,
} from 'lucide-react';

export function AdminSettingsView() {
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'PROFILE' | 'CASHIER' | 'PRINTERS' | 'ATTENDANCE'>('PROFILE');
  const [previewStation, setPreviewStation] = useState<'CASHIER' | 'BAR' | 'KITCHEN'>('CASHIER');

  // Form Fields: Profil
  const [storeName, setStoreName] = useState('RUANG TEMU');
  const [tagline, setTagline] = useState('Coffee, Eatery, Community');
  const [address, setAddress] = useState('Jl. Raya Pamekasan No. 24, Madura');
  const [phone, setPhone] = useState('081234567890');
  const [instagram, setInstagram] = useState('@ruangtemu.cafe');
  const [wifiSsid, setWifiSsid] = useState('Ruang Temu Cafe');
  const [wifiPassword, setWifiPassword] = useState('temudulu123');

  // Form Fields: Kasir & Struk
  const [receiptFooter, setReceiptFooter] = useState('Terima kasih telah berkunjung ke Ruang Temu! Follow IG: @ruangtemu.cafe');
  const [roundingRule, setRoundingRule] = useState('100');
  const [taxRate, setTaxRate] = useState('0');
  const [serviceChargeRate, setServiceChargeRate] = useState('0');

  // Form Fields: Printer Stasion
  const [paperSize, setPaperSize] = useState<'58mm' | '80mm'>('58mm');
  const [autoPrintReceipt, setAutoPrintReceipt] = useState(true);
  const [autoPrintBar, setAutoPrintBar] = useState(true);
  const [autoPrintKitchen, setAutoPrintKitchen] = useState(true);
  const [cashierPrinterName, setCashierPrinterName] = useState('Printer Kasir');
  const [barPrinterName, setBarPrinterName] = useState('Printer Bar Checker');
  const [kitchenPrinterName, setKitchenPrinterName] = useState('Printer Dapur Checker');

  // Form Fields: Absensi & GPS
  const [attendanceLat, setAttendanceLat] = useState('-7.160500');
  const [attendanceLng, setAttendanceLng] = useState('113.479500');
  const [attendanceRadius, setAttendanceRadius] = useState('100');
  const [attendanceClockInTime, setAttendanceClockInTime] = useState('09:00');
  const [attendanceClockOutTime, setAttendanceClockOutTime] = useState('17:00');
  const [attendanceLateTolerance, setAttendanceLateTolerance] = useState('15');
  const [isGettingGps, setIsGettingGps] = useState(false);

  // Feedback Toast
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const res = await api.settings.get();
      if (res.success && res.data) {
        const d = res.data;
        setSettings(d);
        setStoreName(d.store_name || 'RUANG TEMU');
        setTagline(d.tagline || 'Coffee, Eatery, Community');
        setAddress(d.address || 'Jl. Raya Pamekasan No. 24, Madura');
        setPhone(d.phone || '081234567890');
        setInstagram(d.instagram || '@ruangtemu.cafe');
        setWifiSsid(d.wifi_ssid || 'Ruang Temu Cafe');
        setWifiPassword(d.wifi_password || '');
        setReceiptFooter(d.receipt_footer || 'Terima kasih telah berkunjung ke Ruang Temu!');
        setRoundingRule(d.rounding_rule?.toString() || '100');
        setTaxRate(d.tax_rate?.toString() || '0');
        setServiceChargeRate(d.service_charge_rate?.toString() || '0');
        setPaperSize(d.paper_size || '58mm');
        setAutoPrintReceipt(d.auto_print_receipt !== false);
        setAutoPrintBar(d.auto_print_bar !== false);
        setAutoPrintKitchen(d.auto_print_kitchen !== false);
        setCashierPrinterName(d.cashier_printer_name || 'Printer Kasir');
        setBarPrinterName(d.bar_printer_name || 'Printer Bar Checker');
        setKitchenPrinterName(d.kitchen_printer_name || 'Printer Dapur Checker');
        setAttendanceLat(
          d.attendance_lat !== null && d.attendance_lat !== undefined ? String(d.attendance_lat) : '-7.160500'
        );
        setAttendanceLng(
          d.attendance_lng !== null && d.attendance_lng !== undefined ? String(d.attendance_lng) : '113.479500'
        );
        setAttendanceRadius(
          d.attendance_radius_meters !== null && d.attendance_radius_meters !== undefined
            ? String(d.attendance_radius_meters)
            : '100'
        );
        setAttendanceClockInTime(d.attendance_clock_in_time || '09:00');
        setAttendanceClockOutTime(d.attendance_clock_out_time || '17:00');
        setAttendanceLateTolerance(
          d.attendance_late_tolerance_minutes !== null && d.attendance_late_tolerance_minutes !== undefined
            ? String(d.attendance_late_tolerance_minutes)
            : '15'
        );
      }
    } catch (err: any) {
      console.error('Failed to load store settings:', err);
      showToast('Gagal memuat pengaturan toko.', 'error');
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

    try {
      const payload = {
        store_name: storeName.trim(),
        tagline: tagline.trim(),
        address: address.trim(),
        phone: phone.trim(),
        instagram: instagram.trim(),
        wifi_ssid: wifiSsid.trim(),
        wifi_password: wifiPassword.trim(),
        receipt_footer: receiptFooter.trim(),
        rounding_rule: Number(roundingRule) || 100,
        tax_rate: Number(taxRate) || 0,
        service_charge_rate: Number(serviceChargeRate) || 0,
        paper_size: paperSize,
        auto_print_receipt: autoPrintReceipt,
        auto_print_bar: autoPrintBar,
        auto_print_kitchen: autoPrintKitchen,
        cashier_printer_name: cashierPrinterName.trim(),
        bar_printer_name: barPrinterName.trim(),
        kitchen_printer_name: kitchenPrinterName.trim(),
        attendance_lat: attendanceLat.trim() !== '' ? Number(attendanceLat) : undefined,
        attendance_lng: attendanceLng.trim() !== '' ? Number(attendanceLng) : undefined,
        attendance_radius_meters: Math.max(10, Number(attendanceRadius) || 100),
        attendance_clock_in_time: attendanceClockInTime || '09:00',
        attendance_clock_out_time: attendanceClockOutTime || '17:00',
        attendance_late_tolerance_minutes: Math.max(0, Number(attendanceLateTolerance) || 0),
      };

      const res = await api.settings.update(payload);
      if (res.success) {
        showToast('Pengaturan kafe & absensi berhasil disimpan!');
        setSettings(res.data);
      }
    } catch (err: any) {
      showToast(err.message || 'Gagal menyimpan pengaturan.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUseCurrentGps = () => {
    if (!navigator.geolocation) {
      showToast('Browser tidak mendukung geolokasi GPS.', 'error');
      return;
    }
    setIsGettingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setAttendanceLat(pos.coords.latitude.toFixed(6));
        setAttendanceLng(pos.coords.longitude.toFixed(6));
        setIsGettingGps(false);
        showToast('Koordinat lokasi kafe saat ini berhasil diambil.');
      },
      (err) => {
        setIsGettingGps(false);
        showToast(`Gagal mengambil lokasi GPS: ${err.message}`, 'error');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Test Print active preview
  const handleTestPrint = () => {
    const printWindow = window.open('', '_blank', 'width=380,height=600');
    if (!printWindow) {
      alert('Izinkan pop-up peramban untuk melihat pratinjau cetak printer.');
      return;
    }

    const previewElement = document.getElementById('thermal-ticket-preview');
    if (!previewElement) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Test Print - ${previewStation}</title>
          <style>
            @page { margin: 0; size: ${paperSize === '80mm' ? '80mm' : '58mm'} auto; }
            body {
              font-family: monospace;
              font-size: 11px;
              line-height: 1.4;
              margin: 4px;
              color: #000;
              width: ${paperSize === '80mm' ? '280px' : '200px'};
            }
            .dashed { border-bottom: 1px dashed #000; margin: 6px 0; }
          </style>
        </head>
        <body>
          ${previewElement.innerHTML}
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '24px',
            zIndex: 99999,
            background: toastMessage.type === 'success' ? '#2e7d32' : '#c62828',
            color: '#ffffff',
            padding: '10px 18px',
            borderRadius: '8px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
            fontSize: '13px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <CheckCircle2 size={16} />
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* ACTION & HEADER BAR */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          background: '#ffffff',
          padding: '14px 18px',
          borderRadius: '12px',
          border: '1px solid #e7e8e3',
        }}
      >
        <div>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#1c2826', margin: 0 }}>
            Pengaturan Kafe & Format Printer
          </h2>
          <div style={{ fontSize: '11.5px', color: '#71717a', marginTop: '2px' }}>
            Atur identitas outlet, format struk kasir, serta target tiket pesanan stasion Bar dan Dapur
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={loadSettings}
            disabled={isLoading}
            title="Muat ulang pengaturan"
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '8px',
              border: '1px solid #dcdfd5',
              background: '#fbfbf9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#4b5563',
              cursor: 'pointer',
            }}
          >
            <RotateCcw size={14} className={isLoading ? 'animate-spin' : ''} />
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0 16px',
              height: '34px',
              background: '#57695b',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '12.5px',
              cursor: isSaving ? 'wait' : 'pointer',
              transition: 'background 0.1s ease',
            }}
          >
            <Save size={14} />
            <span>{isSaving ? 'Menyimpan...' : 'Simpan Pengaturan'}</span>
          </button>
        </div>
      </div>

      {/* 2-COLUMN GRID: FORM CONFIG (LEFT) & LIVE TICKET PREVIEW (RIGHT) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
          gap: '20px',
          alignItems: 'start',
        }}
      >
        {/* LEFT COLUMN: SETTINGS TABS & FORM */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e7e8e3',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            overflow: 'hidden',
          }}
        >
          {/* Tab Switcher */}
          <div
            style={{
              display: 'flex',
              borderBottom: '1px solid #e7e8e3',
              background: '#fbfbf9',
              padding: '4px 6px',
              gap: '4px',
            }}
          >
            {(
              [
                { id: 'PROFILE', label: 'Profil Kafe', icon: Store },
                { id: 'CASHIER', label: 'Kasir & Struk', icon: Receipt },
                { id: 'PRINTERS', label: 'Stasion Printer', icon: Printer },
                { id: 'ATTENDANCE', label: 'Absensi & GPS', icon: MapPin },
              ] as const
            ).map((t) => {
              const isSelected = activeTab === t.id;
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveTab(t.id)}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '8px 12px',
                    borderRadius: '7px',
                    border: 'none',
                    background: isSelected ? '#ffffff' : 'transparent',
                    color: isSelected ? '#1c2826' : '#64746b',
                    fontWeight: isSelected ? 700 : 500,
                    fontSize: '12px',
                    cursor: 'pointer',
                    boxShadow: isSelected ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                    transition: 'all 0.1s ease',
                  }}
                >
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>

          {/* Form Fields by Active Tab */}
          <form onSubmit={handleSave} style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* TAB 1: PROFIL KAFE */}
            {activeTab === 'PROFILE' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                      Nama Outlet / Kafe <span style={{ color: '#b91c1c' }}>*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={storeName}
                      onChange={(e) => setStoreName(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '8px',
                        border: '1px solid #d1d5db',
                        fontSize: '12.5px',
                        fontWeight: 600,
                        outline: 'none',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                      Slogan / Tagline
                    </label>
                    <input
                      type="text"
                      value={tagline}
                      onChange={(e) => setTagline(e.target.value)}
                      placeholder="Coffee, Eatery, Community"
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '8px',
                        border: '1px solid #d1d5db',
                        fontSize: '12.5px',
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                    Alamat Lengkap Outlet
                  </label>
                  <textarea
                    rows={2}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: '1px solid #d1d5db',
                      fontSize: '12px',
                      outline: 'none',
                      fontFamily: 'inherit',
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                      No. Telepon / WhatsApp
                    </label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="081234567890"
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '8px',
                        border: '1px solid #d1d5db',
                        fontSize: '12.5px',
                        outline: 'none',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                      Instagram Kafe
                    </label>
                    <input
                      type="text"
                      value={instagram}
                      onChange={(e) => setInstagram(e.target.value)}
                      placeholder="@ruangtemu.cafe"
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '8px',
                        border: '1px solid #d1d5db',
                        fontSize: '12.5px',
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                      Nama WiFi Kafe (SSID)
                    </label>
                    <input
                      type="text"
                      value={wifiSsid}
                      onChange={(e) => setWifiSsid(e.target.value)}
                      placeholder="Ruang Temu Cafe"
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '8px',
                        border: '1px solid #d1d5db',
                        fontSize: '12.5px',
                        outline: 'none',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                      Password WiFi
                    </label>
                    <input
                      type="text"
                      value={wifiPassword}
                      onChange={(e) => setWifiPassword(e.target.value)}
                      placeholder="temudulu123"
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '8px',
                        border: '1px solid #d1d5db',
                        fontSize: '12.5px',
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: KASIR & STRUK */}
            {activeTab === 'CASHIER' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                      Pembulatan Tunai Kasir
                    </label>
                    <Select value={roundingRule} onValueChange={setRoundingRule}>
                      <SelectTrigger style={{ width: '100%', height: '36px', background: '#ffffff', borderRadius: '8px', border: '1px solid #d1d5db' }}>
                        <SelectValue placeholder="Pilih Pembulatan" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Tanpa Pembulatan (Rp 1)</SelectItem>
                        <SelectItem value="100">Bulat ke Rp 100 terdekat</SelectItem>
                        <SelectItem value="500">Bulat ke Rp 500 terdekat</SelectItem>
                        <SelectItem value="1000">Bulat ke Rp 1.000 terdekat</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                      Pajak Resto / PB1 (%)
                    </label>
                    <NumberInput
                      allowDecimal
                      value={taxRate}
                      onChange={(e) => setTaxRate(e.target.value)}
                      placeholder="0"
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '8px',
                        border: '1px solid #d1d5db',
                        fontSize: '12.5px',
                        outline: 'none',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                      Service Charge (%)
                    </label>
                    <NumberInput
                      allowDecimal
                      value={serviceChargeRate}
                      onChange={(e) => setServiceChargeRate(e.target.value)}
                      placeholder="0"
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '8px',
                        border: '1px solid #d1d5db',
                        fontSize: '12.5px',
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                    Pesan Kaki Struk (Receipt Footer)
                  </label>
                  <textarea
                    rows={2}
                    value={receiptFooter}
                    onChange={(e) => setReceiptFooter(e.target.value)}
                    placeholder="Terima kasih telah berkunjung ke Ruang Temu!"
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: '1px solid #d1d5db',
                      fontSize: '12px',
                      outline: 'none',
                      fontFamily: 'inherit',
                    }}
                  />
                </div>
              </div>
            )}

            {/* TAB 3: STASION PRINTER & CHECKER */}
            {activeTab === 'PRINTERS' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                    Lebar Kertas Thermal Standar
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {(['58mm', '80mm'] as const).map((sz) => {
                      const isSel = paperSize === sz;
                      return (
                        <button
                          key={sz}
                          type="button"
                          onClick={() => setPaperSize(sz)}
                          style={{
                            flex: 1,
                            padding: '8px 12px',
                            borderRadius: '8px',
                            border: `1px solid ${isSel ? '#57695b' : '#d1d5db'}`,
                            background: isSel ? '#f2f5f1' : '#ffffff',
                            color: isSel ? '#2d4334' : '#4b5563',
                            fontWeight: isSel ? 700 : 500,
                            fontSize: '12px',
                            cursor: 'pointer',
                          }}
                        >
                          {sz === '58mm' ? '58 mm (Struk Kecil POS)' : '80 mm (Struk Lebar / Meja)'}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Stasion 1: Kasir */}
                <div style={{ background: '#fbfbf9', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e7e8e3' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <strong style={{ fontSize: '12px', color: '#1c2826' }}>Printer Kasir (Customer Bill)</strong>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11.5px', color: '#415245', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={autoPrintReceipt}
                        onChange={(e) => setAutoPrintReceipt(e.target.checked)}
                      />
                      Auto-Cetak
                    </label>
                  </div>
                  <input
                    type="text"
                    value={cashierPrinterName}
                    onChange={(e) => setCashierPrinterName(e.target.value)}
                    placeholder="Nama printer kasir (ESC/POS)"
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      border: '1px solid #d1d5db',
                      fontSize: '12px',
                      outline: 'none',
                    }}
                  />
                </div>

                {/* Stasion 2: Bar Checker */}
                <div style={{ background: '#fbfbf9', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e7e8e3' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <strong style={{ fontSize: '12px', color: '#1c2826' }}>Printer Bar (Checker Minuman)</strong>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11.5px', color: '#415245', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={autoPrintBar}
                        onChange={(e) => setAutoPrintBar(e.target.checked)}
                      />
                      Auto-Cetak
                    </label>
                  </div>
                  <input
                    type="text"
                    value={barPrinterName}
                    onChange={(e) => setBarPrinterName(e.target.value)}
                    placeholder="Printer Bar Checker (ESC/POS)"
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      border: '1px solid #d1d5db',
                      fontSize: '12px',
                      outline: 'none',
                    }}
                  />
                </div>

                {/* Stasion 3: Dapur Checker */}
                <div style={{ background: '#fbfbf9', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e7e8e3' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <strong style={{ fontSize: '12px', color: '#1c2826' }}>Printer Dapur (Checker Makanan)</strong>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11.5px', color: '#415245', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={autoPrintKitchen}
                        onChange={(e) => setAutoPrintKitchen(e.target.checked)}
                      />
                      Auto-Cetak
                    </label>
                  </div>
                  <input
                    type="text"
                    value={kitchenPrinterName}
                    onChange={(e) => setKitchenPrinterName(e.target.value)}
                    placeholder="Printer Dapur Checker (ESC/POS)"
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      border: '1px solid #d1d5db',
                      fontSize: '12px',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>
            )}

            {/* TAB 4: ABSENSI KARYAWAN (GPS & JADWAL) */}
            {activeTab === 'ATTENDANCE' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div
                  style={{
                    background: '#fbfbf9',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid #e7e8e3',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                    <strong style={{ fontSize: '12px', color: '#1c2826' }}>Titik Lokasi GPS Kafe</strong>
                    <button
                      type="button"
                      disabled={isGettingGps}
                      onClick={handleUseCurrentGps}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '5px 10px',
                        borderRadius: '6px',
                        border: '1px solid #ccd5cd',
                        background: '#ffffff',
                        color: '#57695b',
                        fontSize: '11.5px',
                        fontWeight: 600,
                        cursor: isGettingGps ? 'wait' : 'pointer',
                      }}
                    >
                      <MapPin size={12} />
                      <span>{isGettingGps ? 'Mengambil GPS...' : 'Gunakan Lokasi Saat Ini'}</span>
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#4b5563', marginBottom: '4px' }}>
                        Latitude
                      </label>
                      <input
                        type="text"
                        value={attendanceLat}
                        onChange={(e) => setAttendanceLat(e.target.value)}
                        placeholder="-7.160500"
                        style={{
                          width: '100%',
                          padding: '7px 9px',
                          borderRadius: '7px',
                          border: '1px solid #d1d5db',
                          fontSize: '12px',
                          fontFamily: 'monospace',
                          outline: 'none',
                          background: '#ffffff',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#4b5563', marginBottom: '4px' }}>
                        Longitude
                      </label>
                      <input
                        type="text"
                        value={attendanceLng}
                        onChange={(e) => setAttendanceLng(e.target.value)}
                        placeholder="113.479500"
                        style={{
                          width: '100%',
                          padding: '7px 9px',
                          borderRadius: '7px',
                          border: '1px solid #d1d5db',
                          fontSize: '12px',
                          fontFamily: 'monospace',
                          outline: 'none',
                          background: '#ffffff',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#4b5563', marginBottom: '4px' }}>
                        Radius (meter)
                      </label>
                      <NumberInput
                        min={10}
                        value={attendanceRadius}
                        onValueChange={(v) => setAttendanceRadius(v)}
                        placeholder="100"
                        style={{
                          width: '100%',
                          padding: '7px 9px',
                          borderRadius: '7px',
                          border: '1px solid #d1d5db',
                          fontSize: '12px',
                          background: '#ffffff',
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    background: '#fbfbf9',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid #e7e8e3',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  <strong style={{ fontSize: '12px', color: '#1c2826' }}>Jadwal Jam Kerja & Toleransi</strong>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#4b5563', marginBottom: '4px' }}>
                        Jam Masuk
                      </label>
                      <input
                        type="time"
                        value={attendanceClockInTime}
                        onChange={(e) => setAttendanceClockInTime(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '7px 9px',
                          borderRadius: '7px',
                          border: '1px solid #d1d5db',
                          fontSize: '12px',
                          outline: 'none',
                          background: '#ffffff',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#4b5563', marginBottom: '4px' }}>
                        Jam Pulang
                      </label>
                      <input
                        type="time"
                        value={attendanceClockOutTime}
                        onChange={(e) => setAttendanceClockOutTime(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '7px 9px',
                          borderRadius: '7px',
                          border: '1px solid #d1d5db',
                          fontSize: '12px',
                          outline: 'none',
                          background: '#ffffff',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#4b5563', marginBottom: '4px' }}>
                        Toleransi (menit)
                      </label>
                      <NumberInput
                        min={0}
                        value={attendanceLateTolerance}
                        onValueChange={(v) => setAttendanceLateTolerance(v)}
                        placeholder="15"
                        style={{
                          width: '100%',
                          padding: '7px 9px',
                          borderRadius: '7px',
                          border: '1px solid #d1d5db',
                          fontSize: '12px',
                          background: '#ffffff',
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* RIGHT COLUMN: INTERACTIVE PRINT PREVIEWS OR ATTENDANCE SUMMARY */}
        {activeTab === 'ATTENDANCE' ? (
          <div
            style={{
              background: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e7e8e3',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '12px 16px',
                borderBottom: '1px solid #e7e8e3',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <strong style={{ fontSize: '13px', color: '#1c2826' }}>Ringkasan Aturan Absensi</strong>
              <a
                href={`https://maps.google.com/?q=${attendanceLat},${attendanceLng}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: '11.5px', fontWeight: 600, color: '#57695b', textDecoration: 'underline' }}
              >
                Lihat di Maps
              </a>
            </div>
            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12.5px' }}>
              {(() => {
                const [h, m] = (attendanceClockInTime || '09:00').split(':').map(Number);
                const tol = Number(attendanceLateTolerance) || 0;
                const totalMin = (Number.isFinite(h) ? h : 9) * 60 + (Number.isFinite(m) ? m : 0) + tol;
                const dH = String(Math.floor(totalMin / 60) % 24).padStart(2, '0');
                const dM = String(totalMin % 60).padStart(2, '0');
                return (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', background: '#fbfbf9', borderRadius: '8px', border: '1px solid #efeee8' }}>
                      <span style={{ color: '#64746b' }}>Koordinat Pusat Kafe</span>
                      <strong style={{ fontFamily: 'monospace', color: '#1c2826' }}>{attendanceLat}, {attendanceLng}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', background: '#fbfbf9', borderRadius: '8px', border: '1px solid #efeee8' }}>
                      <span style={{ color: '#64746b' }}>Radius Valid Absensi</span>
                      <strong style={{ color: '#15803d' }}>{attendanceRadius || 100} meter</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', background: '#fbfbf9', borderRadius: '8px', border: '1px solid #efeee8' }}>
                      <span style={{ color: '#64746b' }}>Jadwal Masuk & Pulang</span>
                      <strong style={{ color: '#1c2826' }}>{attendanceClockInTime || '09:00'} – {attendanceClockOutTime || '17:00'} WIB</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', background: '#fbfbf9', borderRadius: '8px', border: '1px solid #efeee8' }}>
                      <span style={{ color: '#64746b' }}>Batas Tepat Waktu</span>
                      <strong style={{ color: '#b45309' }}>{dH}:{dM} WIB (+{tol} mnt)</strong>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        ) : (
        <div
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e7e8e3',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            overflow: 'hidden',
          }}
        >
          {/* Header Preview & Station Switcher */}
          <div
            style={{
              padding: '12px 16px',
              borderBottom: '1px solid #e7e8e3',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
            }}
          >
            <strong style={{ fontSize: '13px', color: '#1c2826' }}>Pratinjau Cetak Tiket ({paperSize})</strong>

            <button
              type="button"
              onClick={handleTestPrint}
              style={{
                padding: '4px 10px',
                background: '#f2f5f1',
                color: '#57695b',
                border: '1px solid #dcdfd5',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Uji Coba Cetak
            </button>
          </div>

          {/* 3 Station Segmented Control */}
          <div
            style={{
              display: 'flex',
              padding: '6px 12px',
              background: '#fbfbf9',
              borderBottom: '1px solid #e7e8e3',
              gap: '6px',
            }}
          >
            {(
              [
                { id: 'CASHIER', label: 'Struk Kasir' },
                { id: 'BAR', label: 'Checker Bar' },
                { id: 'KITCHEN', label: 'Checker Dapur' },
              ] as const
            ).map((s) => {
              const isSelected = previewStation === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setPreviewStation(s.id)}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '6px 8px',
                    borderRadius: '6px',
                    border: 'none',
                    background: isSelected ? '#57695b' : '#f0f0eb',
                    color: isSelected ? '#ffffff' : '#64746b',
                    fontWeight: isSelected ? 700 : 500,
                    fontSize: '11px',
                    cursor: 'pointer',
                    transition: 'all 0.1s ease',
                  }}
                >
                  <span>{s.label}</span>
                </button>
              );
            })}
          </div>

          {/* Thermal Ticket Container */}
          <div style={{ padding: '18px', display: 'flex', justifyContent: 'center', background: '#f5f6f2' }}>
            <div
              id="thermal-ticket-preview"
              style={{
                width: paperSize === '80mm' ? '320px' : '260px',
                background: '#ffffff',
                border: '1px solid #e2e4dc',
                borderRadius: '4px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
                padding: '16px 14px',
                fontFamily: 'monospace',
                fontSize: '11px',
                lineHeight: '1.45',
                color: '#1e293b',
                transition: 'width 0.2s ease',
              }}
            >
              {/* VIEW 1: STRUK PEMBAYARAN KASIR */}
              {previewStation === 'CASHIER' && (
                <>
                  <div style={{ textAlign: 'center', borderBottom: '1px dashed #94a3b8', paddingBottom: '10px', marginBottom: '10px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#000000' }}>{storeName || 'RUANG TEMU'}</div>
                    <div style={{ fontSize: '10px', color: '#475569' }}>{tagline}</div>
                    <div style={{ fontSize: '9.5px', color: '#64748b', marginTop: '2px' }}>{address}</div>
                    <div style={{ fontSize: '9.5px', color: '#64748b' }}>Telp: {phone}</div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#475569' }}>
                    <span>26/11/2026 14:35</span>
                    <span>RT-20261126-0042</span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '10px',
                      color: '#475569',
                      borderBottom: '1px dashed #cbd5e1',
                      paddingBottom: '6px',
                      marginBottom: '8px',
                    }}
                  >
                    <span>Kasir: Rian</span>
                    <span>Meja: 04 (Dine-in)</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderBottom: '1px dashed #94a3b8', paddingBottom: '10px', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>2x Iced Americano Klasik</span>
                      <span>44.000</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>1x Hot Matcha Latte Oat</span>
                      <span>32.000</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>1x Beef Rice Bowl Sambal Matah</span>
                      <span>38.000</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>1x Truffle Fries Crispy</span>
                      <span>24.000</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', borderBottom: '1px dashed #94a3b8', paddingBottom: '10px', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Subtotal:</span>
                      <span>138.000</span>
                    </div>
                    {Number(taxRate) > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                        <span>PB1 Resto ({taxRate}%):</span>
                        <span>{Math.round((138000 * Number(taxRate)) / 100).toLocaleString('id-ID')}</span>
                      </div>
                    )}
                    {Number(serviceChargeRate) > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                        <span>Service Charge ({serviceChargeRate}%):</span>
                        <span>{Math.round((138000 * Number(serviceChargeRate)) / 100).toLocaleString('id-ID')}</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '12.5px', marginTop: '2px' }}>
                      <span>TOTAL:</span>
                      <span>Rp 138.000</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                      <span>Pembulatan:</span>
                      <span>Rp 0</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Metode Pembayaran:</span>
                      <span>QRIS (LUNAS)</span>
                    </div>
                  </div>

                  {/* WiFi & Instagram Banner */}
                  {(wifiSsid || instagram) && (
                    <div style={{ textAlign: 'center', fontSize: '9.5px', color: '#475569', marginBottom: '8px' }}>
                      {wifiSsid && <div>WiFi: {wifiSsid} {wifiPassword ? `| Pass: ${wifiPassword}` : ''}</div>}
                      {instagram && <div>Instagram: {instagram}</div>}
                    </div>
                  )}

                  <div style={{ textAlign: 'center', fontSize: '9.5px', color: '#64748b', whiteSpace: 'pre-wrap' }}>
                    {receiptFooter || 'Terima kasih telah berkunjung ke Ruang Temu!'}
                  </div>
                </>
              )}

              {/* VIEW 2: TIKET CHECKER BAR (MINUMAN) */}
              {previewStation === 'BAR' && (
                <>
                  <div style={{ textAlign: 'center', borderBottom: '1px dashed #000000', paddingBottom: '8px', marginBottom: '8px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#000000' }}>*** TIKET CHECKER BAR ***</div>
                    <div style={{ fontSize: '10px', color: '#475569' }}>Pesanan Minuman (Bar Station)</div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', fontWeight: 700 }}>
                    <span>ORDER: RT-20261126-0042</span>
                    <span>14:35 WIB</span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '11px',
                      fontWeight: 800,
                      borderBottom: '1px dashed #000000',
                      paddingBottom: '6px',
                      marginBottom: '8px',
                    }}
                  >
                    <span>DINE IN • MEJA 04</span>
                    <span>Waiter: Rian</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderBottom: '1px dashed #000000', paddingBottom: '10px', marginBottom: '10px' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '12px' }}>
                        <span>2x Iced Americano Klasik</span>
                        <span>[BAR]</span>
                      </div>
                      <div style={{ fontSize: '10px', color: '#475569', paddingLeft: '8px' }}>
                        - Less Ice, Normal Sugar
                      </div>
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '12px' }}>
                        <span>1x Hot Matcha Latte Oat</span>
                        <span>[BAR]</span>
                      </div>
                      <div style={{ fontSize: '10px', color: '#475569', paddingLeft: '8px' }}>
                        - Oatmilk Barista (Plant-based)
                      </div>
                    </div>
                  </div>

                  <div style={{ background: '#f1f5f9', padding: '6px', borderRadius: '4px', fontSize: '9.5px', marginBottom: '8px' }}>
                    <strong>Catatan Bar:</strong> Semua gelas take away double cup
                  </div>

                  <div style={{ textAlign: 'center', fontSize: '9px', color: '#64748b' }}>
                    Target: {barPrinterName} • Status: ANTRIAN BAR
                  </div>
                </>
              )}

              {/* VIEW 3: TIKET CHECKER DAPUR (MAKANAN) */}
              {previewStation === 'KITCHEN' && (
                <>
                  <div style={{ textAlign: 'center', borderBottom: '1px dashed #000000', paddingBottom: '8px', marginBottom: '8px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#000000' }}>*** TIKET CHECKER DAPUR ***</div>
                    <div style={{ fontSize: '10px', color: '#475569' }}>Pesanan Makanan (Kitchen Station)</div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', fontWeight: 700 }}>
                    <span>ORDER: RT-20261126-0042</span>
                    <span>14:35 WIB</span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '11px',
                      fontWeight: 800,
                      borderBottom: '1px dashed #000000',
                      paddingBottom: '6px',
                      marginBottom: '8px',
                    }}
                  >
                    <span>DINE IN • MEJA 04</span>
                    <span>Waiter: Rian</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderBottom: '1px dashed #000000', paddingBottom: '10px', marginBottom: '10px' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '12px' }}>
                        <span>1x Beef Rice Bowl Sambal Matah</span>
                        <span>[DAPUR]</span>
                      </div>
                      <div style={{ fontSize: '10px', color: '#475569', paddingLeft: '8px' }}>
                        - Pedas Level 2
                        <br />- Telur Setengah Matang
                      </div>
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '12px' }}>
                        <span>1x Truffle Fries Crispy</span>
                        <span>[DAPUR]</span>
                      </div>
                      <div style={{ fontSize: '10px', color: '#475569', paddingLeft: '8px' }}>
                        - Saus Keju Dipisah
                      </div>
                    </div>
                  </div>

                  <div style={{ background: '#f1f5f9', padding: '6px', borderRadius: '4px', fontSize: '9.5px', marginBottom: '8px' }}>
                    <strong>Catatan Dapur:</strong> Sambal matah jangan terlalu asin
                  </div>

                  <div style={{ textAlign: 'center', fontSize: '9px', color: '#64748b' }}>
                    Target: {kitchenPrinterName} • Status: MASUK DAPUR
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}
