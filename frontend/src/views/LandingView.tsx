import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowRight,
  ArrowLeft,
  ShoppingBag,
  CalendarCheck,
  CheckCheck,
  Clock3,
  X,
  Coffee,
  Cookie,
  LayoutGrid,
  MapPin,
  UserRound,
  UtensilsCrossed,
  Menu,
} from 'lucide-react';
import { productApi, tableApi, reservationApi, settingsApi } from '../api/client';
import type { Product, CafeTable, StoreSettings } from '../types';

interface LandingViewProps {
  onOpenMenu: () => void;
  onOpenPos: () => void;
  onOpenLogin: () => void;
}

// Curated high-resolution cafe imagery matching refrensi_ui
const images = {
  hero: 'https://images.unsplash.com/photo-1565650839149-2c48a094196c?auto=format&fit=crop&w=1800&q=88',
  room: 'https://images.unsplash.com/photo-1624878359797-3fa83912b96a?auto=format&fit=crop&w=1200&q=85',
  people: 'https://images.unsplash.com/photo-1642100817658-7decd438e197?auto=format&fit=crop&w=1200&q=85',
  barista: 'https://images.unsplash.com/photo-1676028793913-d1b089954d10?auto=format&fit=crop&w=1200&q=85',
  community: 'https://images.unsplash.com/photo-1617529503942-e3dd0ef38ee5?auto=format&fit=crop&w=1200&q=84',
  gathering: 'https://images.unsplash.com/photo-1689956189183-9a4387f03d6c?auto=format&fit=crop&w=1200&q=84',
  counter: 'https://images.unsplash.com/photo-1567880905822-56f8e06fe630?auto=format&fit=crop&w=1200&q=84',
  details: 'https://images.unsplash.com/photo-1579341560277-4dfaddaf6e98?auto=format&fit=crop&w=1200&q=84',
};

// Fallback high-resolution photos for menu items
const productPhotoMap: Record<string, string> = {
  'Americano Klasik': 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=800&q=85',
  'Cappuccino Hot/Ice': 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?auto=format&fit=crop&w=800&q=85',
  'Es Kopi Susu Aren': 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?auto=format&fit=crop&w=800&q=85',
  'Matcha Latte Premium': 'https://images.unsplash.com/photo-1520903304654-28bd223f96d7?auto=format&fit=crop&w=800&q=85',
  'Nasi Ayam Sambal Matah': 'https://images.unsplash.com/photo-1699976103130-c8dd94816248?auto=format&fit=crop&w=800&q=85',
  'Butter Croissant Warm': 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=800&q=85',
  'French Fries Crispy': 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=800&q=85',
};

// 6 bento gallery photos matching refrensi_ui
const gallery: [string, string][] = [
  [images.room, 'Area Dalam · 16 kursi'],
  [images.counter, 'Coffee Bar · 8 kursi'],
  [images.people, 'Communal Table · 10 kursi'],
  [images.details, 'Sudut Jendela · 4 kursi'],
  [images.gathering, 'Ruang Temu · 12 kursi'],
  [images.barista, 'Brew Counter · 6 kursi'],
];

// Reusable Icon component matching refrensi_ui Icon helper
function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const map: Record<string, React.FC<any>> = {
    arrow: ArrowRight,
    back: ArrowLeft,
    bag: ShoppingBag,
    calendar: CalendarCheck,
    check: CheckCheck,
    clock: Clock3,
    close: X,
    coffee: Coffee,
    cookie: Cookie,
    grid: LayoutGrid,
    menu: Menu,
    pin: MapPin,
    user: UserRound,
    utensils: UtensilsCrossed,
  };
  const Lucide = map[name] || Coffee;
  return <Lucide size={size} strokeWidth={1.75} aria-hidden="true" />;
}

// Brand Logo Component
function Logo({ light = false }: { light?: boolean }) {
  return (
    <button
      className={`logo ${light ? 'logo-light' : ''}`}
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="RUANG TEMU — kembali ke atas"
      title="RUANG TEMU"
    >
      <img
        loading="lazy"
        decoding="async"
        className="brand-wordmark"
        src="/brand/ruang-temu-navbar.png"
        alt="ruang temu."
      />
    </button>
  );
}

export const LandingView: React.FC<LandingViewProps> = ({
  onOpenMenu,
  onOpenPos,
  onOpenLogin,
}) => {
  // Navigation & Scroll state
  const [navOpen, setNavOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Live database states
  const [products, setProducts] = useState<Product[]>([]);
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [tables, setTables] = useState<CafeTable[]>([]);
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null);

  // Interactive section states
  const [openPillar, setOpenPillar] = useState<number | null>(null);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [eventRegistered, setEventRegistered] = useState<string>('');
  const [joinedNewsletter, setJoinedNewsletter] = useState<boolean>(false);

  // Real Postgres Table Reservation States
  const [reserveDate, setReserveDate] = useState<string>(
    () => new Date().toISOString().split('T')[0]
  );
  const [reserveTime, setReserveTime] = useState<string>('19:00');
  const [reserveGuests, setReserveGuests] = useState<string>('2');
  const [selectedTableId, setSelectedTableId] = useState<string>('');
  const [selectedTableNumber, setSelectedTableNumber] = useState<string>('');
  const [guestName, setGuestName] = useState<string>('');
  const [guestPhone, setGuestPhone] = useState<string>('');
  const [submittingReservation, setSubmittingReservation] = useState<boolean>(false);
  const [reservationError, setReservationError] = useState<string>('');
  const [savedSeatCode, setSavedSeatCode] = useState<string>('');

  // Live store opening hours check (09:00 — 24:00)
  const hour = new Date().getHours();
  const isOpen = hour >= 9 && hour < 24;

  // Track window scroll for transparent/solid header switch
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 48);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fetch real PostgreSQL data on mount
  useEffect(() => {
    let isMounted = true;
    const fetchCatalog = async () => {
      try {
        const [prodRes, tableRes, setRes] = await Promise.all([
          productApi.getAll(),
          tableApi.getAll(),
          settingsApi.get(),
        ]);

        if (isMounted) {
          if (prodRes.success && prodRes.data && prodRes.data.length > 0) {
            setProducts(prodRes.data);
            setActiveProduct(prodRes.data[0]);
          }
          if (tableRes.success && tableRes.data) {
            setTables(tableRes.data);
            if (tableRes.data.length > 0) {
              setSelectedTableId(tableRes.data[0].id);
              setSelectedTableNumber(tableRes.data[0].table_number);
            }
          }
          if (setRes.success && setRes.data) {
            setStoreSettings(setRes.data);
          }
        }
      } catch (err) {
        console.error('Failed to load catalog:', err);
      }
    };
    fetchCatalog();
    return () => {
      isMounted = false;
    };
  }, []);

  // Filtered categories
  const categories = useMemo(() => {
    const rawCategories = products.map(
      (p) => (p as any).category || p.category_name || 'Kopi'
    );
    const unique = Array.from(new Set(rawCategories));
    return ['Semua', ...unique];
  }, [products]);

  // Filtered products list
  const visibleProducts = useMemo(() => {
    return products.filter((p) => {
      if (selectedCategory === 'Semua') return true;
      const cat = (p as any).category || p.category_name;
      return cat === selectedCategory;
    });
  }, [products, selectedCategory]);

  // Smooth scroll helper
  const scrollToSection = (id: string) => {
    setNavOpen(false);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Submit real reservation to PostgreSQL
  const handleConfirmReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim()) {
      setReservationError('Mohon isi nama lengkap pemesan.');
      return;
    }
    if (!guestPhone.trim()) {
      setReservationError('Mohon isi nomor telepon/WhatsApp pemesan.');
      return;
    }

    setSubmittingReservation(true);
    setReservationError('');

    try {
      const reservationTimeStr = `${reserveDate}T${reserveTime}:00`;
      const res = await reservationApi.create({
        customerName: guestName.trim(),
        phoneNumber: guestPhone.trim(),
        tableId: selectedTableId || (tables[0] ? tables[0].id : undefined),
        guestCount: parseInt(reserveGuests, 10) || 2,
        reservationTime: reservationTimeStr,
        notes: `Online reservation via Landing Page Website (Meja: ${selectedTableNumber || 'Tersedia'})`,
      });

      if (res.success && res.data) {
        const code =
          (res.data as any).booking_code ||
          `RSV-${Math.floor(1000 + Math.random() * 9000)}`;
        setSavedSeatCode(code);
      } else {
        setReservationError(res.message || 'Gagal menyimpan reservasi meja.');
      }
    } catch (err: any) {
      setReservationError(err.message || 'Terjadi kesalahan sistem reservasi.');
    } finally {
      setSubmittingReservation(false);
    }
  };

  return (
    <>
      {/* 1. SITE HEADER (Matches refrensi_ui styles.css) */}
      <header
        className={`site-header ${
          !scrolled ? 'header-transparent' : 'header-solid'
        }`}
      >
        <Logo />
        <nav className={navOpen ? 'open' : ''}>
          <div className="mobile-nav-brand">
            <b>There’s always a seat for you.</b>
          </div>
          {[
            ['Beranda', 'home'],
            ['Tentang', 'about'],
            ['Menu', 'menu-preview'],
            ['Suasana', 'space'],
            ['Reservasi', 'reserve-inline'],
            ['Kontak', 'contact'],
          ].map(([label, target]) => (
            <button
              key={target}
              onClick={() => {
                scrollToSection(target);
                setNavOpen(false);
              }}
            >
              {label}
            </button>
          ))}
          <div className="mobile-nav-hours">
            <span>BUKA SETIAP HARI</span>
            <b>09.00—24.00 · Pamekasan</b>
          </div>
        </nav>

        <div className="header-actions">
          {/* Masuk Staf (Owner / Kasir) */}
          <button
            className="icon-button account-button"
            aria-label="Masuk Staf"
            title="Masuk Staf (Kasir & Owner)"
            onClick={onOpenLogin}
          >
            <Icon name="user" />
          </button>

          {/* Pesan Sekarang (Menu Pelanggan) */}
          <button className="cart-button" onClick={onOpenMenu}>
            <Icon name="bag" />
            <span>Pesan Sekarang</span>
          </button>

          {/* Mobile hamburger toggle */}
          <button
            className="mobile-menu icon-button"
            onClick={() => setNavOpen(!navOpen)}
            aria-label="Menu Navigasi"
          >
            <Icon name={navOpen ? 'close' : 'menu'} />
          </button>
        </div>
      </header>

      {/* 2. MAIN HOMEPAGE CONTENT (Matches refrensi_ui styles.css) */}
      <main className="premium-home">
        {/* HERO SECTION */}
        <section className="hero premium-hero" id="home">
          <img
            loading="eager"
            decoding="async"
            src={images.hero}
            alt="Interior hangat RUANG TEMU"
          />
          <div className="hero-shade" />
          <div className="hero-content">
            <p className="eyebrow light">COFFEE · EATERY · COMMUNITY</p>
            <h1>
              A Place to Meet,
              <br />
              <em>A Story to Begin.</em>
            </h1>
            <p>
              Ruang hangat untuk percakapan yang berarti, gagasan baru, dan
              sajian yang dibuat sepenuh hati.
            </p>
            <div className="hero-actions">
              <button className="btn btn-cream" onClick={onOpenMenu}>
                Lihat Menu Kami <Icon name="arrow" />
              </button>
              <button
                className="btn btn-ghost reserve-button"
                onClick={() => scrollToSection('reserve-inline')}
              >
                <span>Reservasi Meja</span>
                <Icon name="arrow" />
              </button>
            </div>
          </div>
          <div className="hero-scroll-cue">
            <span /> SCROLL TO GATHER
          </div>
          <div className="hero-meta">
            <span>
              <Icon name="clock" /> Buka setiap hari · 09.00—24.00
            </span>
            <span>
              <Icon name="pin" /> Jl Parteker Slatan, Pamekasan
            </span>
            <span className={isOpen ? 'open-now' : 'closed-now'}>
              <i /> {isOpen ? 'Buka sekarang' : 'Tutup'}
            </span>
          </div>
        </section>

        {/* BRAND MARQUEE */}
        <div
          className="brand-marquee"
          aria-label="Coffee, eatery, community, open daily, Pamekasan"
        >
          <div>
            <span>COFFEE</span>
            <i /> <span>EATERY</span>
            <i /> <span>COMMUNITY</span>
            <i />
            <span>BUKA SETIAP HARI</span>
            <i /> <span>PAMEKASAN</span>
            <i />
            <span>COFFEE</span>
            <i /> <span>EATERY</span>
            <i /> <span>COMMUNITY</span>
            <i />
            <span>BUKA SETIAP HARI</span>
            <i /> <span>PAMEKASAN</span>
            <i />
          </div>
        </div>

        {/* CERITA KAMI (STORY EDITORIAL) */}
        <section className="story-editorial section reveal-section" id="about">
          <div className="story-collage">
            <img
              loading="lazy"
              decoding="async"
              src={images.people}
              alt="Percakapan hangat di RUANG TEMU"
            />
            <img
              loading="lazy"
              decoding="async"
              src={images.barista}
              alt="Barista menyiapkan kopi"
            />
            <span className="story-stamp">
              MADE FOR
              <br />
              MEETING
            </span>
          </div>
          <div className="story-editorial-copy">
            <p className="eyebrow">CERITA KAMI</p>
            <h2>
              More Than a Room.
              <br />
              <em>It’s Where It Begins.</em>
            </h2>
            <p>
              Di RUANG TEMU, secangkir kopi hanyalah alasan. Yang sebenarnya kami
              sajikan adalah pertemuan: obrolan yang mengalir, gagasan yang
              tumbuh, dan kenangan yang tinggal lebih lama dari aroma kopinya.
            </p>
            <div className="story-numbers">
              <span>
                <b>09.00</b>buka
              </span>
              <span>
                <b>3</b>ruang
              </span>
              <span>
                <b>1</b>komunitas
              </span>
            </div>
          </div>
        </section>

        {/* PILLARS SECTION */}
        <section className="pillars-section section reveal-section">
          <header className="editorial-heading">
            <p className="eyebrow">WHAT BRINGS US TOGETHER</p>
            <h2>
              Coffee. Eatery. <em>Community.</em>
            </h2>
          </header>
          <div className="pillars-grid">
            {[
              [
                '01',
                'Coffee',
                images.barista,
                'Biji Nusantara, diseduh untuk percakapan yang tak terburu-buru.',
                'Kami bekerja dengan roaster lokal dan menyeduh setiap cangkir dengan ritme yang tenang.',
              ],
              [
                '02',
                'Eatery',
                images.details,
                'Sajian hangat yang terasa akrab, dibuat untuk dinikmati bersama.',
                'Menu kami mengikuti musim, bahan lokal, dan kebiasaan makan yang dekat dengan meja Indonesia.',
              ],
              [
                '03',
                'Community',
                images.community,
                'Ruang kecil bagi gagasan, karya, dan pertemanan untuk tumbuh.',
                'Dari diskusi buku sampai kelas seduh, setiap agenda dirancang agar orang pulang membawa koneksi baru.',
              ],
            ].map(([number, title, image, copy, detail], index) => (
              <button
                className={`pillar pillar-${index + 1} ${
                  openPillar === index ? 'open' : ''
                }`}
                key={title}
                onClick={() =>
                  setOpenPillar(openPillar === index ? null : index)
                }
              >
                <div className="pillar-image">
                  <img
                    loading="lazy"
                    decoding="async"
                    src={image}
                    alt={`${title} di RUANG TEMU`}
                  />
                </div>
                <span>
                  {number} {title}
                </span>
                <p>{copy}</p>
                <small>
                  {openPillar === index
                    ? detail
                    : 'Ketuk untuk membaca cerita'}
                </small>
              </button>
            ))}
          </div>
        </section>

        {/* EDITORIAL MENU (CONNECTED TO REAL DATABASE) */}
        <section
          className="editorial-menu section reveal-section"
          id="menu-preview"
        >
          <div className="editorial-menu-list">
            <header className="editorial-heading">
              <p className="eyebrow">THE MENU</p>
              <h2>
                Tastes Worth
                <br />
                <em>Gathering For</em>
              </h2>
            </header>
            <div className="menu-filter-row">
              {categories.map((category) => (
                <button
                  className={selectedCategory === category ? 'active' : ''}
                  onClick={() => setSelectedCategory(category)}
                  key={category}
                >
                  <Icon
                    name={
                      category === 'Makanan'
                        ? 'utensils'
                        : category === 'Camilan' || category === 'Desserts'
                        ? 'cookie'
                        : category === 'Semua' || category === 'All'
                        ? 'grid'
                        : 'coffee'
                    }
                    size={16}
                  />
                  {category}
                </button>
              ))}
            </div>
            <div className="menu-book">
              {visibleProducts.map((item) => (
                <button
                  className={activeProduct?.id === item.id ? 'active' : ''}
                  onMouseEnter={() => setActiveProduct(item)}
                  onFocus={() => setActiveProduct(item)}
                  onClick={() => setActiveProduct(item)}
                  key={item.id}
                >
                  <span>
                    <b>{item.name}</b>
                    <small>
                      {(item as any).category || item.category_name || 'Menu Pilihan'}
                    </small>
                  </span>
                  <i />
                  <strong>
                    Rp{' '}
                    {(
                      item.base_price ||
                      (item as any).price ||
                      0
                    ).toLocaleString('id-ID')}
                  </strong>
                </button>
              ))}
            </div>
            <button className="text-link" onClick={onOpenMenu}>
              Lihat Menu Lengkap <Icon name="arrow" />
            </button>
          </div>

          {activeProduct && (
            <div className="editorial-menu-photo" key={activeProduct.id}>
              <img
                loading="lazy"
                decoding="async"
                src={
                  activeProduct.image_url ||
                  productPhotoMap[activeProduct.name] ||
                  images.counter
                }
                alt={activeProduct.name}
              />
              <span className="table-tag light">
                {(activeProduct as any).category ||
                  activeProduct.category_name ||
                  'House Pick'}
              </span>
              <div>
                <b>{activeProduct.name}</b>
                <small>
                  {activeProduct.description ||
                    'Sajian istimewa diracik dari bahan lokal segar pilihan untuk momen kebersamaan yang hangat.'}
                </small>
              </div>
            </div>
          )}
        </section>

        {/* THE SPACE (BENTO GRID GALLERY) */}
        <section className="space-section section reveal-section" id="space">
          <header className="editorial-heading split-heading">
            <div>
              <p className="eyebrow">THE SPACE</p>
              <h2>
                Come In. <em>Stay Awhile.</em>
              </h2>
            </div>
            <p>
              Setiap sudut punya ritmenya sendiri—untuk bekerja, berbagi makan,
              atau sekadar tinggal sedikit lebih lama.
            </p>
          </header>
          <div className="space-bento">
            {gallery.map(([image, caption], index) => (
              <button key={caption} onClick={() => setLightbox(index)}>
                <img loading="lazy" decoding="async" src={image} alt={caption} />
                <span>
                  {String(index + 1).padStart(2, '0')} · {caption}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* COMMUNITY EVENTS SECTION */}
        <section className="events-section section reveal-section">
          <header className="editorial-heading">
            <p className="eyebrow">EVENTS</p>
            <h2>
              Moments, <em>Shared</em>
            </h2>
          </header>
          <div className="event-list">
            {[
              [
                '23',
                'NOV',
                'Kelas Seduh: V60 untuk Rumah',
                '10.00—12.00',
                'Bersama Bayu · 12 kursi',
              ],
              [
                '29',
                'NOV',
                'Diskusi Buku: Kota dan Ingatan',
                '19.00—21.00',
                'Bersama Klub Baca Selatan',
              ],
              [
                '06',
                'DES',
                'Acoustic Table: Rintik Malam',
                '20.00—22.00',
                'Musik akustik · Tanpa tiket',
              ],
            ].map(([date, month, title, time, note]) => (
              <article key={title}>
                <time>
                  <b>{date}</b>
                  <span>{month}</span>
                </time>
                <div>
                  <span className="table-tag">Community Table</span>
                  <h3>{title}</h3>
                  <p>
                    {time} · {note}
                  </p>
                </div>
                <button onClick={() => setEventRegistered(title)}>
                  {eventRegistered === title ? 'Terdaftar' : 'Daftar'}
                  <Icon name="arrow" size={16} />
                </button>
              </article>
            ))}
          </div>
        </section>

        {/* ONLINE TABLE RESERVATION (REAL POSTGRES INTEGRATION) */}
        <section
          className="reserve-section section reveal-section"
          id="reserve-inline"
        >
          <div className="reserve-intro">
            <p className="eyebrow light">RESERVE</p>
            <h2>
              Save <em>Your Seat</em>
            </h2>
            <p>
              Pilih waktu terbaikmu. Kami akan menyiapkan meja, cahaya yang
              hangat, dan ruang untuk cerita berikutnya.
            </p>
          </div>
          <div className="table-reservation-card">
            {savedSeatCode ? (
              <div className="seat-saved">
                <span>SEAT SAVED</span>
                <b>{selectedTableNumber || 'Meja Pilihan'}</b>
                <h3>{savedSeatCode}</h3>
                <p>
                  {reserveDate} · {reserveTime} · {reserveGuests} tamu ({guestName})
                </p>
                <button onClick={() => setSavedSeatCode('')}>
                  Buat Reservasi Lain <Icon name="arrow" />
                </button>
              </div>
            ) : (
              <>
                <div className="reservation-card-head">
                  <span>TABLE CARD</span>
                </div>
                <div className="reservation-inline-fields">
                  <label>
                    <span>Tanggal</span>
                    <input
                      type="date"
                      value={reserveDate}
                      onChange={(e) => setReserveDate(e.target.value)}
                    />
                  </label>
                  <label>
                    <span>Jam</span>
                    <select
                      value={reserveTime}
                      onChange={(e) => setReserveTime(e.target.value)}
                    >
                      <option>10:00</option>
                      <option>12:30</option>
                      <option>16:00</option>
                      <option>19:00</option>
                      <option>20:30</option>
                    </select>
                  </label>
                  <label>
                    <span>Tamu</span>
                    <select
                      value={reserveGuests}
                      onChange={(e) => setReserveGuests(e.target.value)}
                    >
                      <option value="2">2 Tamu</option>
                      <option value="4">4 Tamu</option>
                      <option value="6">6 Tamu</option>
                      <option value="8">8 Tamu</option>
                    </select>
                  </label>
                </div>

                {/* Real Guest Contacts */}
                <div
                  className="reservation-inline-fields"
                  style={{ marginTop: '12px' }}
                >
                  <label>
                    <span>Nama Pemesan</span>
                    <input
                      type="text"
                      placeholder="Nama lengkap Anda"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                    />
                  </label>
                  <label>
                    <span>No. WhatsApp</span>
                    <input
                      type="tel"
                      placeholder="0812-XXXX-XXXX"
                      value={guestPhone}
                      onChange={(e) => setGuestPhone(e.target.value)}
                    />
                  </label>
                </div>

                {/* Available Tables from PostgreSQL */}
                <div className="available-tables">
                  <span>Meja tersedia</span>
                  <div>
                    {tables.map((table) => (
                      <button
                        className={
                          selectedTableId === table.id ? 'active' : ''
                        }
                        onClick={() => {
                          setSelectedTableId(table.id);
                          setSelectedTableNumber(table.table_number);
                        }}
                        key={table.id}
                      >
                        {table.table_number} ({table.capacity}k)
                      </button>
                    ))}
                  </div>
                </div>

                {reservationError && (
                  <p
                    className="reservation-conflict"
                    style={{ color: '#d9534f', fontSize: '13px' }}
                  >
                    {reservationError}
                  </p>
                )}

                <button
                  className="reserve-submit"
                  onClick={handleConfirmReservation}
                  disabled={submittingReservation}
                >
                  {submittingReservation
                    ? 'Menyimpan Meja...'
                    : 'Konfirmasi Meja'}{' '}
                  <Icon name="arrow" />
                </button>
              </>
            )}
          </div>
        </section>

        {/* FIND US SECTION */}
        <section className="find-section section reveal-section" id="contact">
          <div className="map-illustration">
            <div className="map-grid" />
            <span className="map-pin-label">
              <Icon name="pin" /> {storeSettings?.store_name || 'RUANG TEMU'}
            </span>
            <small>
              {storeSettings?.address?.toUpperCase() ||
                'JL PARTEKER SLATAN · PAMEKASAN'}
            </small>
          </div>
          <div className="find-copy">
            <p className="eyebrow">TEMUKAN KAMI</p>
            <h2>
              See You at
              <br />
              <em>the Table</em>
            </h2>
            <p>{storeSettings?.address || 'Jl Parteker Slatan, Pamekasan'}</p>
            <dl>
              <div>
                <dt>Senin—Minggu</dt>
                <dd>09.00—24.00</dd>
              </div>
              <div>
                <dt>Kontak</dt>
                <dd>{storeSettings?.phone || '+62 812 3456 7890'}</dd>
              </div>
            </dl>
            <button
              className="btn btn-dark"
              onClick={() =>
                window.open(
                  `https://maps.google.com/?q=${encodeURIComponent(
                    storeSettings?.address || 'Jl Parteker Slatan Pamekasan'
                  )}`,
                  '_blank'
                )
              }
            >
              Petunjuk Arah <Icon name="arrow" />
            </button>
          </div>
        </section>

        {/* LIGHTBOX MODAL */}
        {lightbox !== null && (
          <div
            className="space-lightbox"
            role="dialog"
            aria-modal="true"
            onMouseDown={() => setLightbox(null)}
          >
            <button
              className="lightbox-close"
              onClick={() => setLightbox(null)}
              aria-label="Tutup galeri"
            >
              <Icon name="close" />
            </button>
            <button
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() =>
                setLightbox((lightbox - 1 + gallery.length) % gallery.length)
              }
              aria-label="Foto sebelumnya"
            >
              <Icon name="back" />
            </button>
            <figure onMouseDown={(e) => e.stopPropagation()}>
              <img src={gallery[lightbox][0]} alt={gallery[lightbox][1]} />
              <figcaption>{gallery[lightbox][1]}</figcaption>
            </figure>
            <button
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => setLightbox((lightbox + 1) % gallery.length)}
              aria-label="Foto berikutnya"
            >
              <Icon name="arrow" />
            </button>
          </div>
        )}
      </main>

      {/* 3. PREMIUM FOOTER (Matches refrensi_ui styles.css) */}
      <footer className="premium-footer">
        <div className="footer-invitation">
          <h2>
            There’s always
            <br />
            <em>a seat for you.</em>
          </h2>
          <div className="join-table">
            <p>JOIN THE TABLE</p>
            {joinedNewsletter ? (
              <b>Terima kasih. Kabar dari meja kami akan segera datang.</b>
            ) : (
              <label>
                <input
                  type="email"
                  placeholder="Alamat email Anda"
                  aria-label="Alamat email Join the Table"
                />
                <button
                  type="button"
                  onClick={() => setJoinedNewsletter(true)}
                  aria-label="Kirim"
                >
                  <Icon name="arrow" />
                </button>
              </label>
            )}
          </div>
        </div>
        <div className="footer-main">
          <div>
            <p>EXPLORE</p>
            <button onClick={() => scrollToSection('about')}>Our Story</button>
            <button onClick={onOpenMenu}>Menu</button>
            <button onClick={() => scrollToSection('reserve-inline')}>
              Reservations
            </button>
          </div>
          <div>
            <p>KUNJUNGI KAMI</p>
            <span>
              Jl Parteker Slatan
              <br />
              Pamekasan
            </span>
            <span>Open Daily · 09.00—24.00</span>
          </div>
          <div>
            <p>FOLLOW THE TABLE</p>
            <button
              onClick={() => window.open('https://instagram.com', '_blank')}
            >
              Instagram
            </button>
            <button onClick={() => window.open('https://tiktok.com', '_blank')}>
              TikTok
            </button>
            <button
              onClick={() =>
                window.open('https://wa.me/6281234567890', '_blank')
              }
            >
              WhatsApp
            </button>
          </div>
        </div>
        <div className="footer-wordmark">ruang temu.</div>
        <div className="footer-bottom">
          <span>
            © 2026 {storeSettings?.store_name || 'RUANG TEMU'} · Crafted with care
            in Indonesia.
          </span>
          <span>Instagram · TikTok · WhatsApp</span>
        </div>
      </footer>
    </>
  );
};
