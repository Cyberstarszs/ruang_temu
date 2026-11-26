import React, { useState, useEffect, useMemo } from 'react';
import {
  Coffee,
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  Info,
} from 'lucide-react';
import { rupiah } from '../utils/formatters';
import { productApi, tableApi, orderApi } from '../api/client';
import { ModifierModal } from '../components/ModifierModal';
import type { Product, CafeTable } from '../types';

interface CustomerCartItem {
  product: Product;
  quantity: number;
  modifiers: string[];
  extraPrice: number;
  notes?: string;
}

export const CustomerMenuView: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [tables, setTables] = useState<CafeTable[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [cart, setCart] = useState<CustomerCartItem[]>([]);
  const [tableNumber, setTableNumber] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [submittedOrder, setSubmittedOrder] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [modifyingProduct, setModifyingProduct] = useState<Product | null>(null);

  // Auto-detect ?meja=XX from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mejaParam = params.get('meja') || params.get('table');
    if (mejaParam) {
      setTableNumber(mejaParam.toUpperCase());
    }
  }, []);

  // Fetch Products & Tables
  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        const [prodRes, tableRes] = await Promise.all([
          productApi.getAll(),
          tableApi.getAll(),
        ]);
        if (prodRes.success && prodRes.data) {
          setProducts(prodRes.data.filter((p: Product) => p.is_active));
        }
        if (tableRes.success && tableRes.data) {
          setTables(tableRes.data);
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchCatalog();
  }, []);

  const categories = ['Semua', 'Kopi', 'Non-Kopi', 'Makanan', 'Camilan'];

  const filteredProducts = useMemo(() => {
    if (selectedCategory === 'Semua') return products;
    return products.filter((p) => p.category_name === selectedCategory);
  }, [products, selectedCategory]);

  const totalCartCount = useMemo(() => {
    return cart.reduce((acc, it) => acc + it.quantity, 0);
  }, [cart]);

  const subtotal = useMemo(() => {
    return cart.reduce(
      (acc, it) => acc + (it.product.base_price + it.extraPrice) * it.quantity,
      0
    );
  }, [cart]);

  const handleAddToCart = (product: Product) => {
    if (product.category_name === 'Kopi' || product.category_name === 'Non-Kopi') {
      setModifyingProduct(product);
    } else {
      addItemToCart(product, [], 0, '');
    }
  };

  const addItemToCart = (
    product: Product,
    modifiers: string[],
    extraPrice: number,
    notes: string
  ) => {
    setCart((prev) => {
      const existingIdx = prev.findIndex(
        (it) =>
          it.product.id === product.id &&
          it.modifiers.join(',') === modifiers.join(',') &&
          it.notes === notes
      );

      if (existingIdx > -1) {
        const copy = [...prev];
        copy[existingIdx].quantity += 1;
        return copy;
      }

      return [
        ...prev,
        {
          product,
          quantity: 1,
          modifiers,
          extraPrice,
          notes,
        },
      ];
    });
  };

  const updateQuantity = (idx: number, delta: number) => {
    setCart((prev) => {
      const copy = [...prev];
      copy[idx].quantity += delta;
      if (copy[idx].quantity <= 0) {
        copy.splice(idx, 1);
      }
      return copy;
    });
  };

  // Submit Order from Table
  const handleSubmitQrOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tableNumber) {
      alert('Silakan isi nomor meja Anda.');
      return;
    }
    if (cart.length === 0) {
      alert('Keranjang Anda masih kosong.');
      return;
    }

    setLoading(true);
    try {
      const itemsPayload = cart.map((it) => ({
        productId: it.product.id,
        quantity: it.quantity,
        modifiers: it.modifiers,
        notes: it.notes,
      }));

      const res = await orderApi.submitQr(
        tableNumber,
        customerName || 'Tamu Meja ' + tableNumber,
        itemsPayload,
        `Telepon: ${customerPhone || '-'}`
      );

      if (res.success && res.data) {
        setSubmittedOrder(res.data);
        setCart([]);
        setIsCartOpen(false);
      } else {
        alert(res.message || 'Gagal mengirim pesanan.');
      }
    } catch (err: any) {
      alert(err.message || 'Terjadi kesalahan pemrosesan pesanan.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#111216] text-white flex flex-col">
      {/* Hero Cafe Branding */}
      <div className="bg-[#181920] border-b border-[#262832] p-5 text-center relative overflow-hidden">
        <a
          href="/"
          className="absolute top-4 left-4 z-10 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#242732] border border-[#343746] text-xs font-medium text-zinc-300 hover:text-white transition-colors"
        >
          <span>←</span>
          <span>Beranda</span>
        </a>
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#c59a68]/5 rounded-full blur-3xl pointer-events-none" />
        <div className="w-14 h-14 rounded-2xl bg-[#c59a68] text-black font-extrabold text-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-[#c59a68]/20">
          RT
        </div>
        <h1 className="text-xl font-extrabold tracking-wide text-zinc-100">RUANG TEMU</h1>
        <p className="text-xs text-zinc-400 font-mono mt-0.5">Coffee · Eatery · Community</p>

        {/* Table Badge */}
        <div className="inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full bg-[#242732] border border-[#343746] text-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="text-zinc-300 font-medium">
            {tableNumber ? `Meja ${tableNumber}` : 'Pesan dari Meja (QR)'}
          </span>
        </div>
      </div>

      {/* Category Navigation */}
      <div className="sticky top-0 z-30 bg-[#16171d]/90 backdrop-blur-md border-b border-[#262832] px-4 py-2.5 overflow-x-auto flex space-x-2 scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${
              selectedCategory === cat
                ? 'bg-[#c59a68] text-black shadow-md shadow-[#c59a68]/20'
                : 'bg-[#1f212a] text-zinc-400 hover:text-white border border-[#2b2e3a]'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Product List */}
      <main className="flex-1 max-w-3xl w-full mx-auto p-4 pb-28">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              onClick={() => handleAddToCart(product)}
              className="bg-[#171920] hover:bg-[#1e2029] border border-[#262832] hover:border-[#c59a68]/50 rounded-2xl p-4 flex flex-col justify-between cursor-pointer transition shadow-md select-none"
            >
              <div>
                <div className="flex items-start justify-between">
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[#252834] text-zinc-400">
                    {product.category_name}
                  </span>
                  <div className="w-8 h-8 rounded-full bg-[#252834] text-[#c59a68] flex items-center justify-center">
                    <Plus size={16} />
                  </div>
                </div>

                <h3 className="text-sm font-bold text-zinc-100 mt-2">{product.name}</h3>
                {product.description && (
                  <p className="text-xs text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                    {product.description}
                  </p>
                )}
              </div>

              <div className="mt-4 pt-2 border-t border-[#252832] flex items-center justify-between">
                <span className="text-sm font-extrabold text-[#c59a68] font-mono">
                  {rupiah(product.base_price)}
                </span>
                <span className="text-[11px] text-zinc-500">Harga Bersih (Nett)</span>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Floating Bottom Cart Bar */}
      {totalCartCount > 0 && !submittedOrder && (
        <div className="fixed bottom-4 left-4 right-4 z-40 max-w-md mx-auto">
          <button
            onClick={() => setIsCartOpen(true)}
            className="w-full bg-[#c59a68] hover:bg-[#d6a977] text-black font-extrabold py-3.5 px-5 rounded-2xl shadow-2xl shadow-black/80 flex items-center justify-between transition-transform active:scale-95"
          >
            <div className="flex items-center space-x-2.5">
              <span className="w-7 h-7 rounded-full bg-black text-[#c59a68] flex items-center justify-center text-xs font-bold font-mono">
                {totalCartCount}
              </span>
              <span className="text-sm">Lihat Pesanan</span>
            </div>
            <div className="flex items-center space-x-1.5 font-mono text-sm">
              <span>{rupiah(subtotal)}</span>
              <ArrowRight size={16} />
            </div>
          </button>
        </div>
      )}

      {/* Cart Drawer Modal */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4">
          <div className="bg-[#1a1c22] border-t sm:border border-[#2e313c] rounded-t-3xl sm:rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col text-white shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-200">
            {/* Header */}
            <div className="p-4 border-b border-[#2a2d37] flex items-center justify-between">
              <h3 className="font-bold text-base">Konfirmasi Pesanan Meja</h3>
              <button
                onClick={() => setIsCartOpen(false)}
                className="text-zinc-400 hover:text-white text-xs px-2.5 py-1 rounded-lg bg-[#252834]"
              >
                Tutup
              </button>
            </div>

            {/* Form & Items */}
            <form onSubmit={handleSubmitQrOrder} className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {/* Table & Customer Inputs */}
                <div className="bg-[#14151a] p-3 rounded-xl border border-[#272933] space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                        Nomor Meja:
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: 05"
                        value={tableNumber}
                        onChange={(e) => setTableNumber(e.target.value.toUpperCase())}
                        className="w-full bg-[#1b1c23] border border-[#2e313c] rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-[#c59a68]"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                        Nama Pemesan:
                      </label>
                      <input
                        type="text"
                        placeholder="Nama Anda"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="w-full bg-[#1b1c23] border border-[#2e313c] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#c59a68]"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <input
                      type="tel"
                      placeholder="No. WhatsApp (Opsional untuk status pesanan)"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full bg-[#1b1c23] border border-[#2e313c] rounded-xl px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#c59a68]"
                    />
                  </div>
                </div>

                {/* Items List */}
                <div className="space-y-2">
                  {cart.map((item, idx) => (
                    <div
                      key={idx}
                      className="bg-[#14151a] border border-[#272933] rounded-xl p-3 flex items-center justify-between"
                    >
                      <div className="flex-1 pr-2">
                        <div className="text-xs font-bold text-zinc-200">{item.product.name}</div>
                        <div className="text-[11px] text-[#c59a68] font-mono mt-0.5">
                          {rupiah(item.product.base_price + item.extraPrice)}
                        </div>
                        {item.modifiers.length > 0 && (
                          <div className="text-[10px] text-zinc-400 mt-0.5">
                            {item.modifiers.join(' · ')}
                          </div>
                        )}
                        {item.notes && (
                          <div className="text-[10px] text-amber-300/80 italic mt-0.5">
                            Catatan: {item.notes}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center space-x-2">
                        <div className="flex items-center space-x-1.5 bg-[#252834] rounded-lg px-2 py-1">
                          <button
                            type="button"
                            onClick={() => updateQuantity(idx, -1)}
                            className="text-zinc-300 hover:text-white"
                          >
                            <Minus size={13} />
                          </button>
                          <span className="text-xs font-bold font-mono px-1">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(idx, 1)}
                            className="text-zinc-300 hover:text-white"
                          >
                            <Plus size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom Submit */}
              <div className="p-4 bg-[#14151a] border-t border-[#282a34] space-y-3">
                <div className="flex justify-between items-center text-sm font-bold">
                  <span>TOTAL ESTIMASI:</span>
                  <span className="text-base font-mono text-[#c59a68]">{rupiah(subtotal)}</span>
                </div>

                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-[11px] text-amber-300 flex items-start gap-2">
                  <Info size={16} className="shrink-0 mt-0.5" />
                  <span>
                    Setelah menekan <strong>Kirim Pesanan</strong>, silakan menuju meja kasir untuk
                    melakukan pembayaran agar pesanan Anda langsung dicetak dan disiapkan oleh tim Bar/Dapur kami.
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 bg-[#c59a68] hover:bg-[#d6a977] text-black font-extrabold rounded-xl text-sm transition shadow-lg shadow-[#c59a68]/20"
                >
                  {loading ? 'Mengirim Pesanan...' : 'Kirim Pesanan ke Kasir'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {submittedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#1a1c22] border border-[#2e313c] rounded-2xl max-w-sm w-full p-6 text-center text-white shadow-2xl">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 size={32} />
            </div>
            <h3 className="text-lg font-bold">Pesanan Terkirim ke Kasir!</h3>
            <p className="text-xs text-zinc-400 font-mono mt-1">
              Nomor Pesanan: #{submittedOrder.order_number}
            </p>

            <div className="my-4 p-3 bg-[#131418] rounded-xl border border-[#272933] text-xs text-left space-y-1 text-zinc-300">
              <div>📍 <strong>Meja:</strong> {tableNumber}</div>
              <div>⏳ <strong>Status:</strong> Menunggu Pembayaran di Kasir</div>
              <div className="text-[11px] text-amber-300 mt-2 pt-2 border-t border-[#252834]">
                Silakan menuju meja kasir dengan menyebutkan <strong>Nomor Meja {tableNumber}</strong> atau <strong>#{submittedOrder.order_number}</strong>.
              </div>
            </div>

            <button
              onClick={() => setSubmittedOrder(null)}
              className="w-full py-2.5 bg-[#c59a68] text-black font-bold rounded-xl text-xs"
            >
              Pesan Lagi / Tutup
            </button>
          </div>
        </div>
      )}

      {/* Modifier Modal */}
      {modifyingProduct && (
        <ModifierModal
          product={modifyingProduct}
          onClose={() => setModifyingProduct(null)}
          onConfirm={(custom) => {
            addItemToCart(
              modifyingProduct,
              custom.modifiers,
              custom.extraPrice,
              custom.notes
            );
            setModifyingProduct(null);
          }}
        />
      )}
    </div>
  );
};
