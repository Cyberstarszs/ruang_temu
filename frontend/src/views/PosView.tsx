import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  Receipt,
  QrCode,
  CreditCard,
  Banknote,
  Send,
  Coffee,
  CheckCircle2,
  Clock,
  Sparkles,
  AlertCircle,
  Users,
} from 'lucide-react';
import { rupiah } from '../utils/formatters';
import { printBrowserThermalReceipt } from '../utils/thermalPrinter';
import { ModifierModal } from '../components/ModifierModal';
import { productApi, tableApi, promoApi, orderApi } from '../api/client';
import type { Product, CafeTable, CashierShift, Order, OrderType } from '../types';

interface CartItem {
  product: Product;
  quantity: number;
  modifiers: string[];
  extraPrice: number;
  notes?: string;
}

interface PosViewProps {
  currentShift: CashierShift | null;
  onOpenShift: () => void;
  onNotify: (msg: string) => void;
}

export const PosView: React.FC<PosViewProps> = ({ currentShift, onOpenShift, onNotify }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [tables, setTables] = useState<CafeTable[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderType, setOrderType] = useState<OrderType>('DINE_IN');
  const [selectedTableId, setSelectedTableId] = useState<string>('');
  const [tableNumberFallback, setTableNumberFallback] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [promoCode, setPromoCode] = useState<string>('');
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [appliedPromo, setAppliedPromo] = useState<string>('');

  // Payment State
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'QRIS' | 'DEBIT' | 'TRANSFER'>('CASH');
  const [cashReceived, setCashReceived] = useState<string>('');

  // Modifier Modal
  const [modifyingProduct, setModifyingProduct] = useState<Product | null>(null);

  // Pending QR Orders Drawer
  const [pendingQrOrders, setPendingQrOrders] = useState<Order[]>([]);
  const [showPendingDrawer, setShowPendingDrawer] = useState<boolean>(false);
  const [loadingCheckout, setLoadingCheckout] = useState<boolean>(false);

  // Load Products & Tables
  const loadData = async () => {
    try {
      const [prodRes, tableRes] = await Promise.all([
        productApi.getAll(),
        tableApi.getAll(),
      ]);
      if (prodRes.success && prodRes.data) {
        setProducts(prodRes.data);
      }
      if (tableRes.success && tableRes.data) {
        setTables(tableRes.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Load Pending QR Orders
  const loadPendingOrders = async () => {
    try {
      const res = await orderApi.getOrders({ status: 'PENDING_PAYMENT_AT_CASHIER' });
      if (res.success && res.data) {
        setPendingQrOrders(res.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
    loadPendingOrders();
    const interval = setInterval(loadPendingOrders, 10000);
    return () => clearInterval(interval);
  }, []);

  // Filter Products
  const categories = ['Semua', 'Kopi', 'Non-Kopi', 'Makanan', 'Camilan', 'Add-on'];

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCat =
        selectedCategory === 'Semua' || p.category_name === selectedCategory;
      const matchSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.code.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  // Available Tables
  const availableTables = useMemo(() => {
    return tables.filter((t) => t.status === 'AVAILABLE');
  }, [tables]);

  // Cart Calculations (Nett Pricing: 0% PB1, 0% Service)
  const subtotal = useMemo(() => {
    return cart.reduce((acc, item) => {
      const unit = item.product.base_price + item.extraPrice;
      return acc + unit * item.quantity;
    }, 0);
  }, [cart]);

  const totalAmount = Math.max(0, subtotal - discountAmount);
  const numCashReceived = Number(cashReceived) || totalAmount;
  const cashChange = Math.max(0, numCashReceived - totalAmount);

  // Add Product to Cart
  const handleAddProduct = (product: Product) => {
    if (product.category_name === 'Kopi' || product.category_name === 'Non-Kopi') {
      setModifyingProduct(product);
    } else {
      addToCartWithModifiers(product, [], 0, '');
    }
  };

  const addToCartWithModifiers = (
    product: Product,
    modifiers: string[],
    extraPrice: number,
    notes: string
  ) => {
    setCart((prev) => {
      const existingIdx = prev.findIndex(
        (item) =>
          item.product.id === product.id &&
          item.modifiers.join(',') === modifiers.join(',') &&
          item.notes === notes
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

  const removeCartItem = (idx: number) => {
    setCart((prev) => prev.filter((_, i) => i !== idx));
  };

  // Apply Promo
  const handleApplyPromo = async () => {
    if (!promoCode.trim()) return;
    try {
      const res = await promoApi.validate(promoCode.trim(), subtotal);
      if (res.success && res.data?.valid) {
        setDiscountAmount(res.data.discountAmount);
        setAppliedPromo(promoCode.trim());
        onNotify(`Promo ${promoCode.toUpperCase()} berhasil diterapkan! Hemat ${rupiah(res.data.discountAmount)}`);
      } else {
        onNotify(res.message || 'Kode promo tidak valid atau syarat belum terpenuhi.');
      }
    } catch (e: any) {
      onNotify('Gagal memvalidasi promo.');
    }
  };

  // Direct Checkout
  const handleCheckout = async () => {
    if (!currentShift) {
      onNotify('Shift kasir belum dibuka! Silakan buka shift terlebih dahulu.');
      onOpenShift();
      return;
    }

    if (cart.length === 0) {
      onNotify('Keranjang belanja masih kosong.');
      return;
    }

    if (orderType === 'DINE_IN' && !selectedTableId && !tableNumberFallback) {
      onNotify('Pilih meja untuk pesanan Makan di Tempat (Dine In).');
      return;
    }

    if (paymentMethod === 'CASH' && numCashReceived < totalAmount) {
      onNotify('Nominal uang tunai diterima kurang dari total tagihan.');
      return;
    }

    setLoadingCheckout(true);
    try {
      const itemsPayload = cart.map((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
        modifiers: item.modifiers,
        notes: item.notes,
      }));

      const res = await orderApi.checkoutDirect({
        shiftId: currentShift.id,
        tableId: orderType === 'DINE_IN' ? selectedTableId || null : null,
        tableNumberFallback: orderType === 'DINE_IN' ? tableNumberFallback || null : null,
        orderType,
        items: itemsPayload,
        paymentMethod,
        cashReceived: paymentMethod === 'CASH' ? numCashReceived : totalAmount,
        cashChange: paymentMethod === 'CASH' ? cashChange : 0,
        discountAmount,
        promoCode: appliedPromo || undefined,
        notes: customerName ? `Pelanggan: ${customerName}` : undefined,
      });

      if (res.success && res.data) {
        onNotify(`Transaksi #${res.data.order_number} berhasil dibayar & checker terkirim!`);
        // Trigger thermal receipt print
        printBrowserThermalReceipt(res.data);
        // Reset Cart
        setCart([]);
        setDiscountAmount(0);
        setAppliedPromo('');
        setPromoCode('');
        setCustomerName('');
        setSelectedTableId('');
        setTableNumberFallback('');
        setCashReceived('');
        // Refresh tables and pending
        loadData();
      } else {
        onNotify(res.message || 'Gagal memproses transaksi.');
      }
    } catch (err: any) {
      onNotify(err.message || 'Terjadi kesalahan sistem saat checkout.');
    } finally {
      setLoadingCheckout(false);
    }
  };

  // Pay Pending QR Order
  const handlePayPendingOrder = async (order: Order) => {
    if (!currentShift) {
      onNotify('Shift kasir belum dibuka!');
      onOpenShift();
      return;
    }

    try {
      const res = await orderApi.payQr(order.id, {
        shiftId: currentShift.id,
        paymentMethod: 'CASH',
        cashReceived: order.total_amount,
        cashChange: 0,
      });

      if (res.success && res.data) {
        onNotify(`Order QR #${order.order_number} berhasil dilunasi & dicetak ke kitchen!`);
        printBrowserThermalReceipt(res.data);
        loadPendingOrders();
        loadData();
      } else {
        onNotify(res.message || 'Gagal memproses order QR.');
      }
    } catch (e: any) {
      onNotify(e.message || 'Gagal memproses order QR.');
    }
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row h-[calc(100vh-64px)] overflow-hidden bg-[#121316] text-white">
      {/* LEFT: Product Catalog & Category Bar */}
      <div className="flex-1 flex flex-col border-r border-[#262831] overflow-hidden">
        {/* Top Controls: Search & Category Filter */}
        <div className="p-4 bg-[#16171c] border-b border-[#262831] space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-3.5 top-2.5 text-zinc-400" />
              <input
                type="text"
                placeholder="Cari menu kopi, makanan, camilan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#1e2026] border border-[#2e313c] rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#c59a68]"
              />
            </div>

            {/* Pending QR Orders Notification Button */}
            <button
              onClick={() => setShowPendingDrawer(true)}
              className="relative flex items-center space-x-1.5 px-3 py-2 bg-[#20232b] hover:bg-[#2a2d37] border border-[#353945] rounded-xl text-xs font-semibold text-amber-300 transition"
            >
              <QrCode size={16} />
              <span>Order QR</span>
              {pendingQrOrders.length > 0 && (
                <span className="w-5 h-5 rounded-full bg-amber-500 text-black text-[10px] font-bold flex items-center justify-center animate-bounce">
                  {pendingQrOrders.length}
                </span>
              )}
            </button>
          </div>

          {/* Category Pills */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                  selectedCategory === cat
                    ? 'bg-[#c59a68] text-black shadow-md shadow-[#c59a68]/20'
                    : 'bg-[#1e2026] text-zinc-400 hover:text-white hover:bg-[#282b33] border border-[#2e313c]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
            {filteredProducts.map((p) => (
              <div
                key={p.id}
                onClick={() => handleAddProduct(p)}
                className="group relative bg-[#181a20] hover:bg-[#1f222a] border border-[#262831] hover:border-[#c59a68]/60 rounded-2xl p-3.5 flex flex-col justify-between cursor-pointer transition-all duration-200 hover:shadow-xl hover:shadow-black/40 hover:-translate-y-0.5 select-none"
              >
                <div>
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-md bg-[#252832] text-zinc-400 border border-[#313542]">
                      {p.category_name}
                    </span>
                    <button className="w-7 h-7 rounded-lg bg-[#252832] group-hover:bg-[#c59a68] group-hover:text-black text-zinc-300 flex items-center justify-center transition">
                      <Plus size={15} />
                    </button>
                  </div>
                  <h4 className="text-sm font-bold text-zinc-100 group-hover:text-white line-clamp-2 leading-snug">
                    {p.name}
                  </h4>
                  {p.description && (
                    <p className="text-[11px] text-zinc-400 line-clamp-1 mt-1">{p.description}</p>
                  )}
                </div>

                <div className="mt-3 pt-2 border-t border-[#252832] flex items-center justify-between">
                  <span className="text-xs font-extrabold text-[#c59a68] font-mono">
                    {rupiah(p.base_price)}
                  </span>
                  <span className="text-[10px] text-zinc-400">Nett</span>
                </div>
              </div>
            ))}
          </div>

          {filteredProducts.length === 0 && (
            <div className="text-center py-16 text-zinc-400">
              <Coffee size={36} className="mx-auto mb-2 text-zinc-400" />
              <p className="text-sm">Tidak ada menu yang sesuai dengan pencarian Anda.</p>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: Active Order Cart & Payment Breakdown */}
      <div className="w-full lg:w-[420px] bg-[#16171c] border-l border-[#262831] flex flex-col h-full overflow-hidden">
        {/* Cart Header */}
        <div className="p-4 border-b border-[#262831] space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-zinc-100 flex items-center gap-1.5">
              <span>Pesanan Aktif</span>
              <span className="text-xs text-zinc-400 font-mono">({cart.length} item)</span>
            </h3>

            {/* Dine-in vs Takeaway Switcher */}
            <div className="flex bg-[#1e2026] p-0.5 rounded-lg border border-[#2e313c]">
              <button
                onClick={() => setOrderType('DINE_IN')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition ${
                  orderType === 'DINE_IN'
                    ? 'bg-[#c59a68] text-black shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Dine In
              </button>
              <button
                onClick={() => setOrderType('TAKEAWAY')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition ${
                  orderType === 'TAKEAWAY'
                    ? 'bg-[#c59a68] text-black shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Takeaway
              </button>
            </div>
          </div>

          {/* Dine-in Table Selector */}
          {orderType === 'DINE_IN' && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                  Pilih Meja Tersedia:
                </label>
                <select
                  value={selectedTableId}
                  onChange={(e) => {
                    setSelectedTableId(e.target.value);
                    const sel = tables.find((t) => t.id === e.target.value);
                    if (sel) setTableNumberFallback(sel.table_number);
                  }}
                  className="w-full bg-[#1e2026] border border-[#2e313c] rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#c59a68]"
                >
                  <option value="">-- Pilih Meja --</option>
                  {availableTables.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.table_number} ({t.area} - {t.capacity} org)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                  Atau No Meja Manual:
                </label>
                <input
                  type="text"
                  placeholder="Misal: Meja 12"
                  value={tableNumberFallback}
                  onChange={(e) => setTableNumberFallback(e.target.value)}
                  className="w-full bg-[#1e2026] border border-[#2e313c] rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#c59a68]"
                />
              </div>
            </div>
          )}

          {/* Customer Name */}
          <div>
            <input
              type="text"
              placeholder="Nama Pelanggan (Opsional)"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full bg-[#1e2026] border border-[#2e313c] rounded-xl px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#c59a68]"
            />
          </div>
        </div>

        {/* Cart Item List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {cart.map((item, idx) => (
            <div
              key={idx}
              className="bg-[#1b1c22] border border-[#282a34] rounded-xl p-3 flex flex-col justify-between"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 pr-2">
                  <div className="text-xs font-bold text-zinc-100">{item.product.name}</div>
                  <div className="text-[11px] text-[#c59a68] font-mono mt-0.5">
                    {rupiah(item.product.base_price + item.extraPrice)}
                  </div>
                  {item.modifiers.length > 0 && (
                    <div className="text-[10px] text-zinc-400 mt-1 flex flex-wrap gap-1">
                      {item.modifiers.map((m, mi) => (
                        <span key={mi} className="px-1.5 py-0.5 bg-[#252732] rounded text-zinc-300">
                          {m}
                        </span>
                      ))}
                    </div>
                  )}
                  {item.notes && (
                    <div className="text-[10px] text-amber-300/80 italic mt-0.5">
                      Catatan: {item.notes}
                    </div>
                  )}
                </div>

                {/* Subtotal */}
                <div className="text-right">
                  <div className="text-xs font-bold text-zinc-200 font-mono">
                    {rupiah((item.product.base_price + item.extraPrice) * item.quantity)}
                  </div>
                </div>
              </div>

              {/* Quantity Controls */}
              <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-[#252732]">
                <button
                  onClick={() => removeCartItem(idx)}
                  className="text-zinc-500 hover:text-rose-400 p-1 transition"
                >
                  <Trash2 size={13} />
                </button>
                <div className="flex items-center space-x-2 bg-[#252732] rounded-lg px-2 py-0.5">
                  <button
                    onClick={() => updateQuantity(idx, -1)}
                    className="text-zinc-300 hover:text-white p-0.5"
                  >
                    <Minus size={12} />
                  </button>
                  <span className="text-xs font-bold font-mono text-zinc-100 px-1">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(idx, 1)}
                    className="text-zinc-300 hover:text-white p-0.5"
                  >
                    <Plus size={12} />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {cart.length === 0 && (
            <div className="text-center py-12 text-zinc-500">
              <Receipt size={32} className="mx-auto mb-2 text-zinc-600" />
              <p className="text-xs">Belum ada item dalam pesanan.</p>
              <p className="text-[11px] text-zinc-600 mt-1">Pilih menu dari katalog di sebelah kiri.</p>
            </div>
          )}
        </div>

        {/* Financial Summary & Checkout Action */}
        <div className="p-4 bg-[#14151a] border-t border-[#262831] space-y-3">
          {/* Promo Coupon Bar */}
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              placeholder="Kode Kupon Promo..."
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
              className="flex-1 bg-[#1e2026] border border-[#2e313c] rounded-xl px-3 py-1.5 text-xs text-white font-mono uppercase focus:outline-none focus:border-[#c59a68]"
            />
            <button
              onClick={handleApplyPromo}
              className="px-3 py-1.5 bg-[#252832] hover:bg-[#323642] text-amber-300 border border-[#353945] rounded-xl text-xs font-semibold transition"
            >
              Gunakan
            </button>
          </div>

          {/* Pricing Breakdown: Nett Pricing Formula: Total = Subtotal - Promo */}
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between text-zinc-400">
              <span>Subtotal:</span>
              <span className="font-mono text-zinc-200">{rupiah(subtotal)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-rose-400 font-semibold">
                <span>Diskon ({appliedPromo}):</span>
                <span className="font-mono">-{rupiah(discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-[11px] text-zinc-500">
              <span>Pajak Resto (0% PB1):</span>
              <span className="font-mono">Rp 0 (Nett)</span>
            </div>
            <div className="flex justify-between text-[11px] text-zinc-500">
              <span>Service Charge:</span>
              <span className="font-mono">Rp 0 (Nett)</span>
            </div>
            <div className="flex justify-between text-base font-bold text-white pt-1.5 border-t border-[#262831]">
              <span>TOTAL TAGIHAN:</span>
              <span className="font-mono text-[#c59a68]">{rupiah(totalAmount)}</span>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div className="grid grid-cols-4 gap-1.5">
            {[
              { id: 'CASH', label: 'Tunai', icon: Banknote },
              { id: 'QRIS', label: 'QRIS', icon: QrCode },
              { id: 'DEBIT', label: 'EDC', icon: CreditCard },
              { id: 'TRANSFER', label: 'Transfer', icon: Send },
            ].map((pm) => {
              const Icon = pm.icon;
              const isSel = paymentMethod === pm.id;
              return (
                <button
                  key={pm.id}
                  onClick={() => setPaymentMethod(pm.id as any)}
                  className={`flex flex-col items-center justify-center py-2 rounded-xl border text-[11px] font-semibold transition ${
                    isSel
                      ? 'bg-[#c59a68] text-black border-[#c59a68] shadow-sm'
                      : 'bg-[#1a1c22] border-[#292c36] text-zinc-400 hover:text-white hover:border-zinc-500'
                  }`}
                >
                  <Icon size={14} className="mb-0.5" />
                  <span>{pm.label}</span>
                </button>
              );
            })}
          </div>

          {/* Cash Change Calculator (if CASH) */}
          {paymentMethod === 'CASH' && (
            <div className="space-y-1.5 bg-[#1a1c22] border border-[#282a35] rounded-xl p-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-zinc-400">Tunai Diterima:</span>
                <input
                  type="number"
                  placeholder={String(totalAmount)}
                  value={cashReceived}
                  onChange={(e) => setCashReceived(e.target.value)}
                  className="w-32 bg-[#121316] border border-[#2e313c] rounded-lg px-2 py-1 text-xs text-white font-mono text-right focus:outline-none focus:border-[#c59a68]"
                />
              </div>

              {/* Quick Cash Buttons */}
              <div className="flex gap-1 justify-end">
                {[
                  { label: 'Uang Pas', val: totalAmount },
                  { label: '50rb', val: 50000 },
                  { label: '100rb', val: 100000 },
                ].map((qb) => (
                  <button
                    key={qb.label}
                    onClick={() => setCashReceived(String(qb.val))}
                    className="px-2 py-0.5 rounded bg-[#252832] text-[10px] text-zinc-300 hover:bg-[#323642]"
                  >
                    {qb.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between text-xs font-semibold text-emerald-400 pt-1 border-t border-[#252832]">
                <span>Kembalian:</span>
                <span className="font-mono">{rupiah(cashChange)}</span>
              </div>
            </div>
          )}

          {/* Checkout & Print Button */}
          <button
            onClick={handleCheckout}
            disabled={loadingCheckout || cart.length === 0}
            className="w-full py-3.5 bg-[#c59a68] hover:bg-[#d6a977] disabled:bg-zinc-800 disabled:text-zinc-600 text-black font-extrabold rounded-xl text-sm transition shadow-lg shadow-[#c59a68]/20 flex items-center justify-center gap-2"
          >
            <Receipt size={17} />
            <span>{loadingCheckout ? 'Memproses Transaksi...' : `Bayar & Cetak Struk (${rupiah(totalAmount)})`}</span>
          </button>
        </div>
      </div>

      {/* Modifier Modal */}
      {modifyingProduct && (
        <ModifierModal
          product={modifyingProduct}
          onClose={() => setModifyingProduct(null)}
          onConfirm={(custom) => {
            addToCartWithModifiers(
              modifyingProduct,
              custom.modifiers,
              custom.extraPrice,
              custom.notes
            );
            setModifyingProduct(null);
          }}
        />
      )}

      {/* Pending QR Orders Modal/Drawer */}
      {showPendingDrawer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-[#1c1e24] border border-[#2d303a] rounded-2xl max-w-lg w-full max-h-[85vh] flex flex-col text-white shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-[#2d303a] flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <QrCode size={18} className="text-[#c59a68]" />
                <h3 className="font-bold text-sm">Pesanan QR Pelanggan (Menunggu Pembayaran)</h3>
              </div>
              <button
                onClick={() => setShowPendingDrawer(false)}
                className="text-zinc-400 hover:text-white text-xs px-2 py-1 rounded bg-[#252832]"
              >
                Tutup
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {pendingQrOrders.map((ord) => (
                <div
                  key={ord.id}
                  className="bg-[#14151a] border border-[#2a2d37] rounded-xl p-3.5 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-mono font-bold text-xs text-amber-400">
                        #{ord.order_number}
                      </span>
                      <span className="ml-2 text-xs text-zinc-300">
                        {ord.table_number ? `Meja ${ord.table_number}` : 'Takeaway'}
                      </span>
                    </div>
                    <span className="text-xs font-mono font-bold text-[#c59a68]">
                      {rupiah(ord.total_amount)}
                    </span>
                  </div>

                  <div className="text-[11px] text-zinc-400 space-y-0.5">
                    {ord.items.map((it, idx) => (
                      <div key={idx} className="flex justify-between">
                        <span>
                          {it.quantity}x {it.product_name}
                        </span>
                        <span className="font-mono">{rupiah(it.subtotal)}</span>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => handlePayPendingOrder(ord)}
                    className="w-full mt-2 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs transition flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 size={14} />
                    <span>Terima Pembayaran & Cetak Checker</span>
                  </button>
                </div>
              ))}

              {pendingQrOrders.length === 0 && (
                <div className="text-center py-10 text-zinc-500">
                  <p className="text-xs">Tidak ada antrian order QR yang belum dibayar.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
