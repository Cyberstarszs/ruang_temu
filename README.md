# RUANG TEMU - Cafe & POS Management System

Sistem Manajemen Kafe Terintegrasi (Point of Sale, Kitchen/Bar Checker, Manajemen Inventaris, Pembelian/PO, CRM & Laporan Eksekutif) untuk **RUANG TEMU** (*Coffee, Eatery, Community*).

---

## 🚀 Cara Menjalankan Semua Program dari Root

Anda tidak perlu lagi masuk satu per satu ke folder `backend` atau `frontend`. Cukup buka terminal di folder root (`D:\xampp\htdocs\ruang_temu`):

### 1. Menjalankan Mode Development (Backend + Frontend)
```bash
npm run dev
```
* Backend otomatis aktif di: `http://localhost:5000` (dengan auto-reload TSX)
* Frontend otomatis aktif di: `http://localhost:3000` (dengan Vite HMR)
* Log kedua service langsung tampil berdampingan dengan label warna: `[BACKEND]` (cyan) dan `[FRONTEND]` (magenta).

---

### 2. Cara Cepat untuk Windows (Double-Click)
Cukup klik ganda file:
```
start.bat
```
File ini akan otomatis mendeteksi dependensi dan langsung menjalankan Backend + Frontend sekaligus.

---

### 3. Perintah Lainnya yang Tersedia di Root

| Perintah | Deskripsi |
|---|---|
| `npm run dev` | Menjalankan Backend & Frontend secara bersamaan (dev mode) |
| `npm start` | Menjalankan Backend (production) & Frontend bersamaan |
| `npm run build` | Melakukan build otomatis untuk Backend (`tsc`) dan Frontend (`vite build`) |
| `npm run install:all` | Menginstall semua dependensi (root, backend, dan frontend) |
| `npm run migrate` | Menjalankan migrasi database PostgreSQL |
| `npm run seed` | Mengisi data dummy default (menu, meja, pengguna) |
| `npm run test:full` | Menjalankan pengujian 16 modul sistem secara menyeluruh |

---

## 🌐 Akses Sistem

- **Aplikasi Web / Kasir POS & Backoffice:** [http://localhost:3000](http://localhost:3000)
- **Backend API & Health Check:** [http://localhost:5000/health](http://localhost:5000/health)

### Akun Demo 1-Klik di Halaman Login:
- **Kasir:** Username: `kasir` (Password: `kasir123`) - Akses POS kasir, sif kasir, transaksi bayar di kasir, denah meja, kas kecil.
- **Owner:** Username: `owner` (Password: `owner123` | PIN Otorisasi: `123456`) - Akses penuh termasuk laporan eksekutif (laba kotor, ringkasan harian, heatmap), matriks BCG menu, inventaris & opname, purchasing PO, otorisasi void transaksi, manajemen pengguna, audit log, dan pengaturan toko.

---

## 📚 Dokumentasi Teknis & Arsitektur

- **[Arsitektur & Struktur Folder Frontend](docs/FRONTEND_ARCHITECTURE.md):** Penjelasan struktur modular berlapis, desain perutean single-shell, klien API terpusat, dan evaluasi teknis.
- **[Software Requirements Specification (SRS)](SRS_RUANG_TEMU.md):** Dokumen spesifikasi kebutuhan sistem dan analisis kelayakan teknis Ruang Temu.
