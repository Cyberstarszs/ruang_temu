# DOKUMENTASI ARSITEKTUR & STRUKTUR FOLDER FRONTEND
**Ruang Temu — Coffee Shop Management & Smart POS System**

---

## 1. Pohon Struktur Direktori (`frontend/`)

```text
frontend/
├── public/                     # Aset statis (logo, favicon, audio alert)
├── src/
│   ├── app/                    # Next.js App Router Shell
│   │   ├── globals.css         # Styling global & utilitas Tailwind CSS v4
│   │   ├── layout.tsx          # Root HTML layout, font loader & Provider wrapper
│   │   ├── page.tsx            # Single-shell router & persona switcher (POS vs Admin)
│   │   └── [slug]/
│   │       └── page.tsx        # Dynamic slug bridge (/dasbor, /transaksi, /stok, dll.)
│   │
│   ├── components/             # Komponen UI Berbasis Peran (Role-Based Modular)
│   │   ├── admin/              # Modul Manajemen & Back-Office
│   │   │   ├── AdminLayout.tsx         # Layout shell, sidebar navigasi & header admin
│   │   │   ├── AdminDashboardView.tsx  # Metrik omzet, laba kotor, & grafik jam sibuk
│   │   │   ├── AdminOrdersView.tsx     # Riwayat transaksi, pembatalan/void, & filter
│   │   │   ├── AdminShiftsView.tsx     # Rekonsiliasi kas, jurnal mutasi, & audit shift
│   │   │   ├── AdminProductsView.tsx   # Pengaturan menu, formulasi resep, & kalkulasi HPP
│   │   │   ├── AdminInventoryView.tsx  # Stok bahan baku, pencatatan limbah, & opname
│   │   │   ├── AdminPurchasingView.tsx # Pengadaan (Purchase Order) & penerimaan barang
│   │   │   ├── AdminPromosView.tsx     # Manajemen kupon diskon, voucher, & loyalty
│   │   │   ├── AdminUsersView.tsx      # Manajemen pengguna, peran (Owner/Kasir), & PIN
│   │   │   ├── AdminAuditView.tsx      # Jejak rekam aktivitas keamanan & audit trail
│   │   │   └── AdminSettingsView.tsx   # Preferensi kafe, pajak, & konfigurasi struk
│   │   │
│   │   ├── pos/                # Modul Operasional Kasir (Point of Sale)
│   │   │   ├── PosScreen.tsx           # Layar kasir terpadu (katalog menu & keranjang)
│   │   │   ├── PosHeader.tsx           # Bar status (shift kasir, printer, jam, aksi)
│   │   │   ├── CartSidebar.tsx         # Keranjang transaksi, diskon, & kalkulasi pajak
│   │   │   ├── ProductCard.tsx         # Kartu menu, lencana ketersediaan, & harga
│   │   │   ├── ProductCustomizationModal.tsx # Pengaturan varian & modifier pesanan
│   │   │   ├── PaymentModal.tsx        # Modal pembayaran (Tunai, QRIS, Split Bill)
│   │   │   ├── CustomerModal.tsx       # Input nomor meja & profil pelanggan
│   │   │   ├── ShiftModals.tsx         # Buka shift, mutasi kas, & tutup laci kas
│   │   │   ├── HeldOrdersModal.tsx     # Pengelolaan pesanan tertahan (hold bill)
│   │   │   ├── OrderHistoryModal.tsx   # Riwayat pesanan kasir shift aktif
│   │   │   ├── ReceiptModal.tsx        # Pratinjau & pencetakan struk belanja
│   │   │   ├── PrinterStatusModal.tsx  # Diagnostik koneksi printer thermal
│   │   │   └── MenuMatrixModal.tsx     # Analisis matriks penjualan produk (BCG Matrix)
│   │   │
│   │   ├── auth/               # Modul Gerbang Masuk
│   │   │   └── LoginForm.tsx           # Form otentikasi username & password
│   │   │
│   │   ├── common/             # Komponen Bersama
│   │   │   └── Icons.tsx               # Wrapper ikon SVG & penanganan fallback
│   │   │
│   │   └── ui/                 # Primitif UI Reusable (shadcn/ui convention)
│   │       ├── date-picker.tsx         # Input kalender tanggal tunggal
│   │       └── date-range-picker.tsx   # Popover kalender rentang tanggal (dual-month)
│   │
│   ├── context/                # Pengelola State Global (React Context API)
│   │   ├── AuthContext.tsx     # Sesi pengguna, hak akses peran, & token JWT
│   │   └── ShiftContext.tsx    # Siklus shift kasir, saldo laci kas, & rekonsiliasi
│   │
│   ├── lib/                    # Utilitas, Klien Layanan, & Helper
│   │   ├── api.ts              # Klien HTTP terpadu (Facade Pattern) & typed endpoints
│   │   ├── socket.ts           # Klien WebSocket real-time (Socket.io)
│   │   └── utils.ts            # Helper pemformatan (Rupiah, tanggal, sanitasi angka)
│   │
│   └── types/                  # Definisi Tipe Data Statis
│       └── index.ts            # TypeScript interfaces terpadu untuk semua entitas
│
├── next.config.mjs             # Konfigurasi Next.js 16 (Turbopack, asset prefix)
├── package.json                # Dependensi (React 19, Next.js 16, Lucide React)
├── postcss.config.mjs          # Konfigurasi PostCSS untuk Tailwind CSS v4
└── tsconfig.json               # Konfigurasi compiler TypeScript & path aliases (@/*)
```

> [!NOTE]
> **Catatan Konvensi Penamaan File:**  
> Seluruh komponen domain aplikasi menggunakan konvensi **`PascalCase`** (contoh: `LoginForm.tsx`, `CartSidebar.tsx`). Khusus pada direktori `components/ui/`, penamaan menggunakan **`kebab-case`** (contoh: `date-range-picker.tsx`) guna menyelaraskan dengan konvensi ekosistem *shadcn/ui* dan komponen primitif *headless*.

---

## 2. Arsitektur Penulisan Kode (*Code Architecture*)

Frontend Ruang Temu dibangun menggunakan pola **Layered Modular Architecture** (Arsitektur Modular Berlapis) dengan pemisahan tanggung jawab (*separation of concerns*) sebagai berikut:

```
┌────────────────────────────────────────────────────────┐
│  Presentation Layer: components/ (admin, pos, auth)   │
├────────────────────────────────────────────────────────┤
│  State & Session Layer: context/ (AuthContext, Shift)  │
├────────────────────────────────────────────────────────┤
│  Core Services & Facade: lib/api.ts, lib/socket.ts     │
├────────────────────────────────────────────────────────┤
│  Type Contract Layer: types/index.ts                   │
└────────────────────────────────────────────────────────┘
```

### A. Routing: Single-Shell SPA di Atas Next.js App Router
* **Lokasi Berkas:** `src/app/page.tsx` dan `src/app/[slug]/page.tsx`
* **Mekanisme:** Aplikasi menggunakan satu cangkang utama (*single shell*) yang merender antarmuka berbeda berdasarkan peran pengguna:
  1. **Mode POS (`/pos`):** Untuk staf kasir harian yang memprioritaskan latensi rendah, pemilihan meja cepat, penyesuaian pesanan, dan transaksi kasir.
  2. **Mode Admin (`/dasbor`, `/transaksi`, `/stok`, dll.):** Untuk pemilik/manajer dalam mengelola laporan, stok, resep, dan audit.
* **Sinkronisasi URL:** Perpindahan antar sub-halaman menggunakan `window.history.pushState` dan listener `popstate`.

### B. Struktur Komponen Berbasis Peran (*Role-Based Modular Structure*)
* Komponen dikelompokkan berdasarkan **wilayah wewenang pengguna (Role)**:
  - Direktori `components/pos/`: Mengisolasi seluruh interaksi operasional kasir di meja depan.
  - Direktori `components/admin/`: Mengisolasi modul administratif dan analitik pemilik kafe.
  - Direktori `components/ui/`: Mengisolasi komponen independen tanpa logika bisnis (*pure UI primitives*).

### C. Abstraksi Klien HTTP: Centralized API Service (*Facade Pattern*)
* **Lokasi Berkas:** `src/lib/api.ts`
* Seluruh permintaan jaringan dibungkus dalam modul tunggal terstruktur melalui fungsi dasar `request<T>()`.
* Berfungsi sebagai *Facade* yang menyederhanakan komunikasi backend:
  - Menyuntikkan *header* `Authorization: Bearer <token>` secara otomatis dari media penyimpanan.
  - Menyeragamkan penanganan galat jaringan via kelas kustom `ApiError(message, statusCode, data)`.
  - Mengelompokkan fungsi pemanggilan berdasarkan *namespace* domain bisnis (`api.auth`, `api.inventory`, `api.orders`, `api.shifts`, dll.).

### D. Manajemen State Berjenjang (*Layered State Management*)
1. **Global Persistent Context:**
   - `AuthContext`: Menyimpan status autentikasi, token, identitas staf, dan fungsi `login`/`logout`.
   - `ShiftContext`: Mengelola shift aktif kasir, modal awal laci, pencatatan kas masuk/keluar operasional, serta data rekonsiliasi.
2. **Local Component State:**
   - Dikelola melalui *hooks* standar React (`useState`, `useReducer`, `useMemo`, `useCallback`) untuk data yang berumur pendek seperti isi keranjang belanja, status modal, dan *filter* pencarian.

### E. Type Contract & Desain Visual
* **Kontrak Tipe Data:** Seluruh objek data (`Product`, `Ingredient`, `Order`, `CashierShift`, dll.) diatur secara terpusat di `src/types/index.ts` guna menjamin integritas tipe data (*type safety*) di seluruh lapisan aplikasi.
* **Sistem Desain Visual:** Menggunakan Tailwind CSS v4 dengan palet identitas Ruang Temu (*Signature Sage Green* `#57695b`, `#46554a`, latar netral `#f2f4ef`, serta tipografi *Plus Jakarta Sans*).

---

## 3. Evaluasi Teknis, Pertimbangan Desain, & Mitigasi Risiko

### A. Alasan Desain Routing Manual (`pushState`) di Atas Next.js App Router
Pilihan mempertahankan *Single-Shell Architecture* dengan manipulasi `pushState` memiliki pertimbangan operasional kafe yang spesifik:
* **Alasan Utama (State Preservation):** Mencegah *unmount* pada *state* keranjang POS (`cartItems`), pesanan tertahan (*held orders*), dan data sesi kasir saat manajer berpindah sejenak memeriksa stok atau laporan, lalu kembali ke layar kasir.
* **Koneksi Hardware & Socket Stabil:** Mencegah terjadinya *handshake* ulang koneksi WebSocket (`socket.io`) dan *polling* status printer thermal yang dapat terputus jika terjadi navigasi rute penuh (*full page unmount*).
* **Konsekuensi / Trade-off:**
  - Kehilangan optimasi *route-based code splitting* bawaan Next.js.
  - Fitur bawaan App Router seperti `loading.tsx` dan `error.tsx` per sub-rute tidak berjalan otomatis.
* **Rekomendasi Skala Lanjut:** Melakukan refaktorisasi ke pola **Next.js Parallel / Nested Routes dengan Persistent Layout** (`app/(pos)` dan `app/(admin)`) agar mendapatkan kedua keuntungan: pemisahan *bundle* per halaman sekaligus mempertahankan *state* POS pada *layout shell*.

### B. Analisis Penyimpanan Token JWT di `localStorage`
* **Kondisi Saat Ini:** Token JWT disimpan di `localStorage` (`ruang_temu_token`) untuk kemudahan akses sinkron saat klien API (`lib/api.ts`) mengonstruksi *header* permintaan.
* **Risiko Keamanan:** Media penyimpanan ini rentan dibaca oleh skrip berbahaya jika terjadi celah **Cross-Site Scripting (XSS)** melalui dependensi pihak ketiga atau manipulasi DOM.
* **Mitigasi Saat Ini:**
  - Aplikasi dilindungi oleh *Content Security Policy* (CSP) dan *HTTP Security Headers* (Helmet) dari backend.
  - Implementasi operasional ditujukan untuk perangkat POS terminal kafe pada jaringan lokal (*isolated environment*).
* **Rencana Produksi:** Migrasi penyimpanan sesi ke **Cookie bertipe `HttpOnly`, `Secure`, dan `SameSite=Strict`** melalui Next.js Route Handler atau *middleware* terbalik (*reverse proxy*).

### C. Skalabilitas Berkas Monolitik (`api.ts`, `types/index.ts`, dan Modal Kasir)
* **Temuan:**
  - `src/lib/api.ts` (370+ baris) dan `src/types/index.ts` menampung seluruh endpoint dan definisi data dari 11 modul berbeda.
  - Direktori `components/pos/` menampung 8 berkas modal sejajar dengan layar utama kasir.
* **Rencana Dekomposisi:**
  1. Pecah `lib/api.ts` menjadi subdirektori `lib/api/` (`orders.ts`, `inventory.ts`, `shifts.ts`) dengan `index.ts` sebagai *barrel export*.
  2. Pecah `types/index.ts` menjadi modul tipe per domain (`types/order.ts`, `types/inventory.ts`).
  3. Pindahkan berkas-berkas modal kasir ke subdirektori `components/pos/modals/` untuk memperjelas hierarki komponen.

### D. Penempatan Modul `MenuMatrixModal.tsx` (Analisis BCG)
* **Konteks Operasional:**
  - Modal ini sengaja diletakkan pada layar kasir (`PosHeader.tsx`) untuk memfasilitasi **kasir senior / supervisor** saat melakukan *briefing* sebelum shift atau memandu kasir baru dalam strategi *suggestive selling* (mengetahui item mana yang berstatus *Stars* atau *Cash Cows* untuk ditawarkan kepada pelanggan).
* **Evaluasi Arsitektur:** Secara hierarki analitik laba kotor dan margin, fitur ini berorientasi pada manajerial. Ke depan, modul ini disarankan dipindahkan ke `components/common/` atau diintegrasikan penuh ke dalam `components/admin/AdminDashboardView.tsx` dengan hak akses berbasis PIN manajer.

### E. Mekanisme Detail Teknis Fitur Kasir & Jaringan
1. **Resiliensi WebSocket (`src/lib/socket.ts`):**
   - Menggunakan konfigurasi `transports: ['websocket', 'polling']` dengan `reconnectionAttempts: 5` dan `reconnectionDelay: 2000` (2 detik).
   - Menjamin bahwa jika koneksi Wi-Fi kafe mengalami gangguan sesaat, *socket* secara otomatis mencoba menyambung kembali tanpa memutus sesi aktif pengguna.
2. **Persistensi Pesanan Ditahan / *Hold Bill* (`HeldOrdersModal.tsx`):**
   - Pada implementasi saat ini, data transaksi ditahan disimpan di **`localStorage` perangkat kasir** (`ruang_temu_held_orders_v2`), bukan di basis data pusat.
   - **Karakteristik:** Bersifat *Terminal-Local* (tahan pesanan bekerja sangat cepat dan tetap dapat dibuka kembali meskipun jaringan server lokal sedang lambat).
   - **Batasan:** Pesanan yang ditahan di Kasir A tidak dapat ditarik (*recall*) dari Kasir B pada skenario kafe multi-terminal. Untuk mendukung multi-terminal sinkron, daftar *held orders* perlu dipindahkan ke tabel backend (`held_orders`).
