# DOKUMENTASI ARSITEKTUR & STRUKTUR FOLDER FRONTEND
**Ruang Temu — Coffee Shop Management & Smart POS System**

---

## 1. Pohon Struktur Direktori (`frontend/`)

```text
frontend/
├── public/                     # Aset statis (logo, favicon, audio alert)
├── src/
│   ├── app/                    # Next.js App Router Shell (Persistent Layout & Route Groups)
│   │   ├── globals.css         # Styling global & utilitas Tailwind CSS v4
│   │   ├── layout.tsx          # Root Server Layout, Google Font (Plus Jakarta Sans) & Provider wrapper
│   │   ├── providers.tsx       # Root Client Component wrapper (Auth, Socket, Shift, Cart)
│   │   ├── page.tsx            # Redirection otomatis berbasis peran (/pos, /dasbor, /login)
│   │   │
│   │   ├── login/              # Halaman Masuk Terisolasi
│   │   │   └── page.tsx        # Gerbang login pengguna (/login)
│   │   │
│   │   ├── (pos)/              # Route Group Kasir (Full-screen POS Layout)
│   │   │   ├── layout.tsx      # Auth guard & wrapper layar penuh kasir
│   │   │   ├── loading.tsx     # Skeleton loader saat bundle kasir dimuat
│   │   │   └── pos/
│   │   │       └── page.tsx    # Layar terminal kasir terpadu (/pos)
│   │   │
│   │   └── (admin)/            # Route Group Back-Office & Manajemen (Persistent Admin Layout)
│   │       ├── layout.tsx      # Persistent layout admin (Sidebar navigasi & role guard)
│   │       ├── loading.tsx     # Skeleton loader konten modul admin
│   │       ├── error.tsx       # Error boundary khusus modul admin dengan tombol muat ulang
│   │       ├── dasbor/page.tsx # Metrik omzet, laba kotor, & grafik jam sibuk (/dasbor)
│   │       ├── transaksi/page.tsx # Riwayat transaksi & aksi kasir (/transaksi)
│   │       ├── sif/page.tsx    # Rekonsiliasi kas & audit shift (/sif & alias /shift)
│   │       ├── shift/page.tsx  # Alias rute shift (/shift)
│   │       ├── menu/page.tsx   # Pengaturan menu, resep, & HPP (/menu)
│   │       ├── stok/page.tsx   # Stok bahan baku, limbah, & opname (/stok)
│   │       ├── pengadaan/page.tsx # Pengadaan PO & penerimaan barang (/pengadaan)
│   │       ├── promo/page.tsx  # Diskon, voucher, & loyalty (/promo)
│   │       ├── karyawan/page.tsx # Manajemen staf & PIN kasir (/karyawan & alias /staf)
│   │       ├── staf/page.tsx   # Alias rute staf (/staf)
│   │       ├── audit/page.tsx  # Rekam jejak audit keamanan (/audit)
│   │       └── pengaturan/page.tsx # Konfigurasi kafe, pajak, & struk (/pengaturan)
│   │
│   ├── components/             # Komponen UI Berbasis Peran (Role-Based Modular)
│   │   ├── admin/              # Modul Manajemen & Back-Office
│   │   │   ├── AdminLayout.tsx         # Layout shell, sidebar navigasi & header admin (next/link)
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
│   │   │   ├── PosScreen.tsx           # Layar kasir terpadu (katalog menu & keranjang via CartContext)
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
│   │   ├── SocketContext.tsx   # Koneksi Socket.io terpusat, JWT authenticated & auto-reconnect
│   │   ├── ShiftContext.tsx    # Siklus shift kasir, saldo laci kas, & rekonsiliasi
│   │   └── CartContext.tsx     # State keranjang POS terangkat (item, meja, diskon, hold bill)
│   │
│   ├── lib/                    # Utilitas, Klien Layanan, & Helper
│   │   ├── api.ts              # Klien HTTP terpadu (Facade Pattern) & typed endpoints
│   │   ├── socket.ts           # Konfigurasi klien WebSocket real-time (Socket.io)
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
┌─────────────────────────────────────────────────────────────────┐
│ Presentation Layer: components/ (admin, pos, auth, ui)          │
├─────────────────────────────────────────────────────────────────┤
│ Routing & Layout: app/(pos), app/(admin), providers.tsx         │
├─────────────────────────────────────────────────────────────────┤
│ State & Session Layer: context/ (Auth, Socket, Shift, Cart)     │
├─────────────────────────────────────────────────────────────────┤
│ Core Services & Facade: lib/api.ts, lib/socket.ts, lib/utils.ts │
├─────────────────────────────────────────────────────────────────┤
│ Type Contract Layer: types/index.ts                             │
└─────────────────────────────────────────────────────────────────┘
```

### A. Routing: Next.js App Router Persistent Layout dengan Route Groups
* **Struktur Routing:** Menggunakan fitur bawaan Next.js 16 App Router dengan **Route Groups** `(pos)` dan `(admin)`. Tanda kurung memberitahukan Next.js untuk mengabaikan segmen tersebut dalam URL, sehingga seluruh alamat rute tetap bersih dan *flat*:
  - **Layar Kasir POS:** `/pos`
  - **Modul Back-Office Admin:** `/dasbor`, `/transaksi`, `/sif` (alias `/shift`), `/menu`, `/stok`, `/pengadaan`, `/promo`, `/karyawan` (alias `/staf`), `/audit`, `/pengaturan`
  - **Gerbang Otentikasi:** `/login`
* **Persistent Layout Shell (`src/app/(admin)/layout.tsx`):**
  - Modul administratif dibungkus dalam *layout* persisten bersama `AdminLayout`.
  - Navigasi antar halaman admin (`/dasbor` ↔ `/stok` ↔ `/transaksi`) menggunakan komponen standar Next.js `<Link href="...">` dan status tautan aktif dideteksi secara reaktif melalui *hook* `usePathname()`.
  - Berpindah antar modul back-office **tidak pernah merender ulang (*re-mount*) sidebar, bar profil, maupun shell aplikasi**. Hanya komponen anak (`{children}`) yang dimuat ulang secara instan.
* **Redireksi Berbasis Peran Terpadu (`src/app/page.tsx`):**
  - Halaman root `/` secara otomatis memeriksa status otentikasi dan peran staf: mengarahkan kasir langsung ke `/pos`, owner/manajer ke `/dasbor`, atau tamu tanpa sesi ke `/login`.

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

### D. Manajemen State Terangkat & Siklus Hidup Socket (*Lifted State & Lifecycle*)
1. **Global Persistent Context (`src/app/providers.tsx`):**
   - Hierarki penyedia diletakkan pada level root: `AuthProvider -> SocketProvider -> ShiftProvider -> CartProvider`.
   - **`AuthContext`:** Menyimpan status sesi pengguna, hak akses peran (*Role-Based Access Control*), dan token JWT.
   - **`SocketContext`:** Mengelola koneksi WebSocket tunggal terotentikasi Bearer token JWT dengan strategi pemulihan otomatis (`reconnectionAttempts: Infinity`, interval dinamis 2–10 detik). Seluruh modul cukup memanggil *hook* `useSocket()`.
   - **`ShiftContext`:** Mengelola shift kasir aktif, modal awal laci, pencatatan mutasi kas masuk/keluar, dan status rekonsiliasi.
   - **`CartContext`:** Mengangkat seluruh *state* transaksi kasir (daftar item pesanan, tipe pesanan *dine-in/takeaway*, nomor meja, profil pelanggan, diskon, kupon promo, hingga pesanan tertahan / *hold bill*).
2. **Keuntungan Pengangkatan State Keranjang (*State Preservation*):**
   - Mengangkat `CartContext` ke lapisan root `AppProviders` menjamin bahwa ketika kasir atau pemilik berpindah sementara dari `/pos` ke `/dasbor` atau `/stok` untuk memeriksa inventaris, keranjang transaksi POS, nomor meja pelanggan, dan antrean *held orders* **tetap utuh di memori tanpa hilang atau ter-reset**.
3. **Local Component State:**
   - Dikelola melalui *hooks* standar React (`useState`, `useReducer`, `useMemo`, `useCallback`) untuk data temporer berumur pendek seperti status buka/tutup modal, filter input pencarian, dan formulir isian.

### E. Type Contract & Desain Visual
* **Kontrak Tipe Data:** Seluruh objek data (`Product`, `Ingredient`, `Order`, `CashierShift`, dll.) diatur secara terpusat di `src/types/index.ts` guna menjamin integritas tipe data (*type safety*) di seluruh lapisan aplikasi.
* **Sistem Desain Visual:** Menggunakan Tailwind CSS v4 dengan palet identitas Ruang Temu (*Signature Sage Green* `#57695b`, `#46554a`, latar netral `#f2f4ef`, serta tipografi *Plus Jakarta Sans*).

---

## 3. Evaluasi Teknis, Pertimbangan Desain, & Mitigasi Risiko

### A. Evolusi Desain: Dari Single-Shell `pushState` ke App Router Persistent Layout
* **Implementasi Sebelumnya:** Aplikasi sempat menggunakan manipulasi manual `window.history.pushState` dan rute dinamis `[slug]` demi mempertahankan state keranjang kasir dan koneksi socket.
* **Implementasi Saat Ini (Selesai Dimigrasikan):**
  - Mengadopsi **Next.js App Router Persistent Layout** dengan folder Route Groups `(pos)` dan `(admin)`.
  - **Pemisahan Bundle Otomatis (*Code Splitting*):** Setiap modul (`/dasbor`, `/stok`, `/pos`, dll.) kini memiliki berkas `page.tsx` terdedikasi, memungkinkan Next.js dan compiler Turbopack membagi bundle halaman secara independen.
  - **Streaming & Loading Skeleton:** Sub-rute admin kini didukung oleh `(admin)/loading.tsx` dan `(pos)/loading.tsx` untuk menampilkan skeleton placeholder seketika saat bundle JavaScript halaman baru diunduh.
  - **Error Boundary Terisolasi:** Berkas `(admin)/error.tsx` memastikan jika terjadi galat *runtime* pada salah satu tampilan analitik, seluruh aplikasi tidak mengalami *crash* dan pengguna dapat memulihkan tampilan dengan tombol muat ulang.
  - **State & Hardware Preservation:** Dengan meletakkan `CartProvider` dan `SocketProvider` di `providers.tsx` pada tingkat root server layout (`layout.tsx`), keuntungan utama mempertahankan transaksi kasir dan koneksi printer thermal tetap terjaga 100% tanpa kompromi.

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
