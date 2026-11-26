'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Product, DiningTable, Customer, CartItem, CartCustomization, Order, HeldOrder } from '@/types';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { useShift } from '@/context/ShiftContext';
import { useCart } from '@/context/CartContext';
import { PosHeader } from './PosHeader';
import { ProductCard } from './ProductCard';
import { ProductCustomizationModal } from './ProductCustomizationModal';
import { CartSidebar } from './CartSidebar';
import { CustomerModal } from './CustomerModal';
import { PaymentModal } from './PaymentModal';
import { ReceiptModal } from './ReceiptModal';
import { OpenShiftModal, ShiftRecapModal, CashMovementModal, CloseShiftModal } from './ShiftModals';
import { OrderHistoryModal } from './OrderHistoryModal';
import { PrinterStatusModal } from './PrinterStatusModal';
import { MenuMatrixModal } from './MenuMatrixModal';
import { HeldOrdersModal } from './HeldOrdersModal';
import { Icon } from '@/components/common/Icons';
import { rupiah } from '@/lib/utils';

interface PosScreenProps {
  onSwitchToAdmin?: () => void;
}

export function PosScreen({ onSwitchToAdmin }: PosScreenProps = {}) {
  const { shift, hasActiveShift, isLoading: shiftLoading, refreshShift } = useShift();

  // State: Data from Backend
  const [products, setProducts] = useState<Product[]>([]);
  const [tables, setTables] = useState<DiningTable[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [printerOnline, setPrinterOnline] = useState(true);

  // State: Filters
  const [activeCategory, setActiveCategory] = useState<string>('Semua');
  const [searchQuery, setSearchQuery] = useState('');

  // State: Cart from CartContext (Persistent across App Router navigation)
  const {
    cart,
    setCart,
    orderType,
    setOrderType,
    selectedTable,
    setSelectedTable,
    customer,
    setCustomer,
    orderNote,
    setOrderNote,
    takeawayName,
    setTakeawayName,
    discountAmount,
    setDiscountAmount,
    promoCode,
    setPromoCode,
    promoError,
    setPromoError,
    promoSuccess,
    setPromoSuccess,
    claimedDownPayment,
    setClaimedDownPayment,
    reservationId,
    setReservationId,
    heldOrders,
    updateHeldOrders,
    subtotal,
    grandTotal,
    handleQuickAdd: cartQuickAdd,
    handleCustomizationConfirm: cartCustomizationConfirm,
    handleUpdateQuantity: cartUpdateQuantity,
    handleRemoveItem: cartRemoveItem,
    handleClearCart: cartClearCart,
    handleHoldOrder: cartHoldOrder,
    handleRecallHeldOrder: cartRecallHeldOrder,
    handleDeleteHeldOrder: cartDeleteHeldOrder,
    handleSetManualTable: cartSetManualTable,
  } = useCart();

  // State: Modals
  const [customizingProduct, setCustomizingProduct] = useState<Product | null>(null);
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [receiptData, setReceiptData] = useState<any | null>(null);
  const [activeShiftModal, setActiveShiftModal] = useState<'open' | 'recap' | 'cash' | 'close' | null>(null);
  const [orderHistoryOpen, setOrderHistoryOpen] = useState(false);
  const [printerStatusOpen, setPrinterStatusOpen] = useState(false);
  const [menuMatrixOpen, setMenuMatrixOpen] = useState(false);
  const [heldOrdersModalOpen, setHeldOrdersModalOpen] = useState(false);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(true);
  const [splitBillOpen, setSplitBillOpen] = useState(false);
  const [splitCount, setSplitCount] = useState(2);


  // Toast Notification
  const [toastMessage, setToastMessage] = useState('');
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 2500);
  };

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Fetch initial products, tables, and pending QR count
  const loadData = useCallback(async () => {
    try {
      setLoadingData(true);
      const [prodRes, tableRes] = await Promise.all([
        api.products.getAll(),
        api.tables.getAll(),
      ]);

      if (prodRes.success && prodRes.data) {
        setProducts(prodRes.data);
      }
      if (tableRes.success && tableRes.data) {
        setTables(tableRes.data);
      }
    } catch (err) {
      console.error('Error loading master data:', err);
      showToast('Gagal memuat data dari server backend.');
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // WebSocket real-time updates
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleTableChange = (data: { tableId: string; tableNumber: string; status: any }) => {
      setTables((prev) =>
        prev.map((t) => (t.id === data.tableId ? { ...t, status: data.status } : t))
      );
    };

    const handlePrinterError = () => {
      setPrinterOnline(false);
      showToast('Peringatan: Salah satu printer thermal offline.');
    };

    socket.on('table:status_change', handleTableChange);
    socket.on('printer:error', handlePrinterError);

    return () => {
      socket.off('table:status_change', handleTableChange);
      socket.off('printer:error', handlePrinterError);
    };
  }, []);

  // Keyboard Shortcuts (F2: search, F4: pay, Escape: close)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === 'F4') {
        if (cart.length > 0 && !paymentModalOpen) {
          e.preventDefault();
          setIsCartOpen(true);
          if (orderType === 'DINE_IN' && !selectedTable?.number?.trim()) {
            document.getElementById('pos-table-number-input')?.focus();
            showToast('Ketik nomor meja terlebih dahulu.');
          } else {
            setPaymentModalOpen(true);
          }
        }
      } else if (e.key === 'Escape') {
        setCustomizingProduct(null);
        setCustomerModalOpen(false);
        setPaymentModalOpen(false);
        setReceiptData(null);
        setActiveShiftModal(null);
        setOrderHistoryOpen(false);
        setPrinterStatusOpen(false);
        setMenuMatrixOpen(false);
        setHeldOrdersModalOpen(false);
        setSplitBillOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart.length, paymentModalOpen, orderType, selectedTable]);

  // Auto-revalidate promo if cart items change or subtotal changes
  useEffect(() => {
    if (!promoCode || subtotal === 0) return;

    let isMounted = true;
    api.promos
      .validate(promoCode, subtotal)
      .then((res) => {
        if (!isMounted) return;
        if (res.success && res.data) {
          setDiscountAmount(res.data.discountAmount);
          setPromoSuccess(`${res.data.name}: Potongan ${rupiah(res.data.discountAmount)}`);
          setPromoError('');
        } else {
          setDiscountAmount(0);
          setPromoCode('');
          setPromoSuccess('');
          setPromoError(res.message || 'Promo dibatalkan karena syarat minimum belanja tidak terpenuhi.');
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setDiscountAmount(0);
        setPromoCode('');
        setPromoSuccess('');
        setPromoError(err.message || 'Syarat kupon promo tidak lagi terpenuhi.');
      });

    return () => {
      isMounted = false;
    };
  }, [subtotal, promoCode]);

  // Cart handlers delegating to CartContext
  const handleQuickAdd = (product: Product) => {
    if (product.category === 'Kopi' || product.category === 'Non-Kopi') {
      setCustomizingProduct(product);
      return;
    }
    cartQuickAdd(product);
    showToast(`${product.name} ditambahkan ke pesanan.`);
  };

  const handleCustomizationConfirm = (
    product: Product,
    quantity: number,
    customization: CartCustomization
  ) => {
    cartCustomizationConfirm(product, quantity, customization);
    showToast(`${product.name} (+pilihan) ditambahkan.`);
  };

  const handleUpdateQuantity = (index: number, newQty: number) => {
    cartUpdateQuantity(index, newQty);
  };

  const handleRemoveItem = (index: number) => {
    cartRemoveItem(index);
  };

  const handleClearCart = () => {
    cartClearCart();
    showToast('Keranjang belanja dikosongkan.');
  };

  // Tahan Pesanan (Park Order)
  const handleHoldOrder = () => {
    const res = cartHoldOrder();
    showToast(res.message);
  };

  // Muat Pesanan Tahanan (Recall Held Order)
  const handleRecallHeldOrder = (heldOrder: HeldOrder) => {
    const ok = cartRecallHeldOrder(heldOrder, true);
    if (ok) {
      setHeldOrdersModalOpen(false);
      showToast(`Pesanan #${heldOrder.id} dimuat kembali ke kasir.`);
    }
  };

  // Hapus Pesanan Tahanan
  const handleDeleteHeldOrder = (id: string) => {
    cartDeleteHeldOrder(id);
    showToast('Pesanan tahanan dihapus.');
  };

  // Input Manual Nomor Meja (Hanya Angka)
  const handleSetManualTable = (tableNumber: string) => {
    cartSetManualTable(tableNumber, tables);
  };

  // Clear table handler
  const handleClearTable = async (tableId: string) => {
    try {
      const res = await api.tables.clear(tableId);
      if (res.success) {
        setTables((prev) =>
          prev.map((t) => (t.id === tableId ? { ...t, status: 'AVAILABLE', occupied_at: null } : t))
        );
        showToast(res.message);
      }
    } catch (err: any) {
      showToast(err.message || 'Gagal mengosongkan meja.');
    }
  };

  // Promo code validation
  const handleValidatePromo = async (code: string) => {
    setPromoError('');
    setPromoSuccess('');
    try {
      const res = await api.promos.validate(code, subtotal);
      if (res.success && res.data) {
        setDiscountAmount(res.data.discountAmount);
        setPromoCode(res.data.code);
        setPromoSuccess(`${res.data.name} diterapkan: Potongan ${rupiah(res.data.discountAmount)}`);
      } else {
        setPromoError(res.message || 'Kode promo tidak valid.');
      }
    } catch (err: any) {
      setPromoError(err.message || 'Kode promo tidak valid.');
    }
  };

  // Direct Checkout Execution
  const handleProcessPayment = async (paymentData: any) => {
    if (!hasActiveShift || !shift) {
      setActiveShiftModal('open');
      throw new Error('Sif kasir belum dibuka. Silakan masukkan modal awal kasir.');
    }

    const payload = {
      shiftId: shift.id,
      tableId: selectedTable?.id || null,
      tableNumberFallback: selectedTable?.number || null,
      orderType,
      customerId: customer?.id || null,
      reservationId: reservationId || null,
      items: cart.map((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
        notes: item.customization?.notes || undefined,
        modifiers: item.customization?.selectedOptions || undefined,
        unitPriceAdjustment: item.customization?.unitPriceAdjustment || 0,
      })),
      payments: paymentData.payments,
      paymentMethod: paymentData.paymentMethod,
      cashReceived: paymentData.cashReceived,
      cashChange: paymentData.cashChange,
      referenceNumber: paymentData.referenceNumber,
      discountAmount,
      claimedDownPayment,
      notes: orderNote.trim() || (orderType === 'TAKEAWAY' && takeawayName ? `Takeaway: ${takeawayName}` : undefined),
    };

    const res = await api.orders.checkoutDirect(payload);

    if (res.success && res.data) {
      const createdOrder = res.data.order;
      setReceiptData({
        orderNumber: createdOrder.order_number,
        orderType: createdOrder.order_type,
        tableNumber: selectedTable?.number || null,
        cashierName: shift.cashier_name || 'Kasir',
        customerName: customer?.name || (orderType === 'TAKEAWAY' ? takeawayName : undefined),
        createdAt: createdOrder.created_at,
        items: cart.map((item) => ({
          productName: item.product.name,
          quantity: item.quantity,
          unitPrice: item.customization
            ? item.product.price + item.customization.unitPriceAdjustment
            : item.product.price,
          subtotal: item.itemSubtotal,
          printTarget: item.product.print_target,
          notes: item.customization?.notes || item.customization?.selectedOptions?.join(', '),
        })),
        subtotal,
        discountAmount,
        claimedDownPayment,
        totalAmount: grandTotal,
        paymentMethod: paymentData.paymentMethod,
        cashReceived: paymentData.cashReceived,
        cashChange: paymentData.cashChange,
      });

      // Clear cart
      handleClearCart();
      setPaymentModalOpen(false);
      showToast('Transaksi Berhasil! Tiket otomatis dikirim ke stasiun cetak.');
      await Promise.all([loadData(), refreshShift()]);
    } else {
      throw new Error(res.message || 'Gagal menyelesaikan checkout.');
    }
  };

  // Reprint Receipt from Order History
  const handleReprintReceipt = (order: Order) => {
    const payment = order.payments?.[0];
    setReceiptData({
      orderNumber: order.order_number,
      orderType: order.order_type,
      tableNumber: order.table_number || null,
      cashierName: order.cashier_name || 'Kasir',
      customerName: order.customer_name || undefined,
      createdAt: order.created_at,
      items: (order.items || []).map((i) => ({
        productName: i.productName,
        quantity: i.quantity,
        unitPrice: Number(i.unitPrice),
        subtotal: Number(i.subtotal),
        printTarget: i.printTarget,
        notes: i.notes,
      })),
      subtotal: Number(order.subtotal),
      discountAmount: Number(order.discount_amount),
      claimedDownPayment: Number(order.claimed_down_payment),
      totalAmount: Number(order.total_amount),
      paymentMethod: payment?.method || 'CASH',
      cashReceived: payment?.cashReceived,
      cashChange: payment?.cashChange,
    });
  };

  // Toggle product favorite status
  const handleToggleFavorite = async (product: Product) => {
    const newStatus = !product.is_favorite;
    // Optimistic UI update
    setProducts((prev) =>
      prev.map((p) => (p.id === product.id ? { ...p, is_favorite: newStatus } : p))
    );
    showToast(newStatus ? `"${product.name}" ditandai favorit ⭐` : `"${product.name}" dihapus dari favorit`);

    try {
      await api.products.update(product.id, { is_favorite: newStatus });
    } catch {
      // Revert on error
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, is_favorite: !newStatus } : p))
      );
      showToast('Gagal memperbarui status favorit.');
    }
  };

  // Filter products by category & search query
  const filteredProducts = products.filter((p) => {
    const matchesCategory =
      activeCategory === 'Semua'
        ? true
        : activeCategory === 'Favorit'
        ? Boolean(p.is_favorite)
        : p.category === activeCategory;
    const matchesSearch =
      !searchQuery.trim() ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const categories = ['Semua', 'Favorit', 'Kopi', 'Non-Kopi', 'Makanan', 'Camilan', 'Add-on'];

  return (
    <div className="new-pos">
      {/* Top Navbar */}
      <PosHeader
        onOpenHistory={() => setOrderHistoryOpen(true)}
        onOpenPrinter={() => setPrinterStatusOpen(true)}
        onOpenMatrix={() => setMenuMatrixOpen(true)}
        onOpenShiftModal={(modal) => setActiveShiftModal(modal)}
        onOpenHeldOrders={() => setHeldOrdersModalOpen(true)}
        onSwitchToAdmin={onSwitchToAdmin}
        heldOrdersCount={heldOrders.length}
        printerOnline={printerOnline}
        isCartOpen={isCartOpen}
        onToggleCart={() => setIsCartOpen(!isCartOpen)}
        cartItemCount={cart.reduce((s, i) => s + i.quantity, 0)}
        cartGrandTotal={grandTotal}
      />

      {/* Main Layout: Products Catalog + Cart */}
      <main
        className={isCartOpen ? '' : 'cart-closed'}
        style={{
          gridTemplateColumns: isCartOpen ? 'minmax(0, 1fr) 380px' : '1fr',
          transition: 'grid-template-columns 0.25s ease',
        }}
      >
        {/* Catalog Section */}
        <section className="new-pos-products">
          <div className="pos-catalog-tools">
            {/* Search Input with F2 shortcut badge */}
            <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
              <input
                ref={searchInputRef}
                id="pos-product-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari menu kafe (Tekan F2)..."
                style={{
                  width: '100%',
                  padding: '12px 40px 12px 40px',
                  borderRadius: '10px',
                  border: '1px solid #d1d1d1',
                  fontSize: '14px',
                  backgroundColor: '#ffffff',
                }}
              />
              <span
                style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#777',
                }}
              >
                <Icon name="search" size={18} />
              </span>
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#888',
                    cursor: 'pointer',
                  }}
                >
                  <Icon name="close" size={16} />
                </button>
              ) : (
                <span
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    backgroundColor: '#eee',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#666',
                  }}
                >
                  F2
                </span>
              )}
            </div>

            {/* Category Tabs */}
            <div className="pos-category-tabs">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className={activeCategory === cat ? 'active' : ''}
                  onClick={() => setActiveCategory(cat)}
                >
                  <Icon
                    name={
                      cat === 'Favorit'
                        ? 'star'
                        : cat === 'Kopi'
                        ? 'coffee'
                        : cat === 'Non-Kopi'
                        ? 'cupSoda'
                        : cat === 'Makanan'
                        ? 'utensils'
                        : cat === 'Camilan'
                        ? 'cookie'
                        : 'grid'
                    }
                    size={16}
                  />
                  <span>{cat}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Product Grid */}
          <div className="new-product-grid" style={{ marginTop: '16px', alignItems: 'start' }}>
            {loadingData ? (
              <p style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: '#888' }}>
                Memuat daftar menu RUANG TEMU...
              </p>
            ) : filteredProducts.length === 0 ? (
              <div
                style={{
                  gridColumn: '1 / -1',
                  textAlign: 'center',
                  padding: '50px 20px',
                  backgroundColor: '#ffffff',
                  borderRadius: '12px',
                  border: '1px dashed #d1d1d1',
                }}
              >
                <Icon name="coffee" size={36} className="text-[#888] mx-auto mb-2 opacity-50" />
                <b style={{ color: '#555', display: 'block' }}>Menu tidak ditemukan</b>
                <p style={{ color: '#888', fontSize: '13px', margin: '4px 0 0' }}>
                  Tidak ada menu dengan kategori "{activeCategory}" atau kata kunci "{searchQuery}".
                </p>
              </div>
            ) : (
              filteredProducts.map((p) => {
                const inCart = cart
                  .filter((item) => item.product.id === p.id)
                  .reduce((sum, item) => sum + item.quantity, 0);

                return (
                  <ProductCard
                    key={p.id}
                    product={p}
                    quantityInCart={inCart}
                    onSelect={(prod) => {
                      if (prod.category === 'Kopi' || prod.category === 'Non-Kopi') {
                        setCustomizingProduct(prod);
                      } else {
                        handleQuickAdd(prod);
                      }
                    }}
                    onQuickAdd={handleQuickAdd}
                    onToggleFavorite={handleToggleFavorite}
                  />
                );
              })
            )}
          </div>
        </section>

        {/* Right Cart Sidebar */}
        {isCartOpen && (
          <CartSidebar
            cart={cart}
            orderType={orderType}
            selectedTable={selectedTable}
            customer={customer}
            orderNote={orderNote}
            takeawayName={takeawayName}
            discountAmount={discountAmount}
            promoCode={promoCode}
            claimedDownPayment={claimedDownPayment}
            onUpdateQuantity={handleUpdateQuantity}
            onRemoveItem={handleRemoveItem}
            onClearCart={handleClearCart}
            onHoldOrder={handleHoldOrder}
            onSetOrderType={setOrderType}
            onSetManualTable={handleSetManualTable}
            onOpenCustomerModal={() => setCustomerModalOpen(true)}
            onSetOrderNote={setOrderNote}
            onSetTakeawayName={setTakeawayName}
            onOpenPayment={() => {
              if (orderType === 'DINE_IN' && !selectedTable?.number?.trim()) {
                document.getElementById('pos-table-number-input')?.focus();
                showToast('Wajib mengisi nomor meja terlebih dahulu.');
              } else {
                setPaymentModalOpen(true);
              }
            }}
            onOpenSplitBill={() => setSplitBillOpen(true)}
            onValidatePromo={handleValidatePromo}
            onClearPromo={() => {
              setPromoCode('');
              setDiscountAmount(0);
              setPromoSuccess('');
              setPromoError('');
            }}
            promoError={promoError}
            promoSuccess={promoSuccess}
            mobileOpen={mobileCartOpen}
            onCloseMobile={() => setMobileCartOpen(false)}
            onCloseCart={() => setIsCartOpen(false)}
          />
        )}
      </main>

      {/* Floating Open Cart Pill when Cart is Closed (Desktop) */}
      {!isCartOpen && (
        <button
          type="button"
          onClick={() => setIsCartOpen(true)}
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 60,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '12px 20px',
            backgroundColor: '#57695b',
            color: '#ffffff',
            border: 'none',
            borderRadius: '999px',
            boxShadow: '0 8px 24px rgba(87, 105, 91, 0.35)',
            cursor: 'pointer',
            fontWeight: 700,
            fontSize: '13.5px',
            transition: 'all 0.15s ease',
          }}
          title="Buka Panel Keranjang Pesanan (F4)"
        >
          <Icon name="bag" size={18} />
          <span>Buka Keranjang</span>
          {cart.length > 0 && (
            <span
              style={{
                backgroundColor: '#ffffff',
                color: '#57695b',
                padding: '2px 8px',
                borderRadius: '999px',
                fontSize: '12px',
                fontWeight: 800,
              }}
            >
              {cart.reduce((s, i) => s + i.quantity, 0)} item · {rupiah(grandTotal)}
            </span>
          )}
        </button>
      )}

      {/* Floating Bottom Cart Bar for Mobile View */}
      <button className="pos-mobile-cart-bar" onClick={() => setMobileCartOpen(true)}>
        <Icon name="shoppingBag" size={20} />
        <span>
          Lihat Pesanan · {cart.reduce((s, i) => s + i.quantity, 0)} item
        </span>
        <b>{rupiah(grandTotal)}</b>
      </button>

      {/* Toast Alert */}
      {toastMessage && (
        <div className="pos-warm-toast">
          <Icon name="circleCheck" size={20} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* MODALS */}

      {/* Product Customization Modal */}
      {customizingProduct && (
        <ProductCustomizationModal
          product={customizingProduct}
          onClose={() => setCustomizingProduct(null)}
          onConfirm={handleCustomizationConfirm}
        />
      )}

      {/* Customer CRM Modal */}
      {customerModalOpen && (
        <CustomerModal
          onSelectCustomer={(c) => {
            setCustomer(c);
            if (c) {
              showToast(`Pelanggan aktif: ${c.name} (${c.tier})`);
            }
          }}
          onClose={() => setCustomerModalOpen(false)}
        />
      )}

      {/* Payment Modal */}
      {paymentModalOpen && (
        <PaymentModal
          grandTotal={grandTotal}
          onClose={() => setPaymentModalOpen(false)}
          onProcessPayment={handleProcessPayment}
          claimedDownPayment={claimedDownPayment}
        />
      )}

      {/* Thermal Receipt Preview Modal */}
      {receiptData && (
        <ReceiptModal
          orderData={receiptData}
          onClose={() => setReceiptData(null)}
        />
      )}

      {/* Shift Management Modals: Mandatory on first login */}
      {!hasActiveShift && !shiftLoading && (
        <OpenShiftModal isMandatory={true} onClose={() => {}} />
      )}
      {activeShiftModal === 'open' && hasActiveShift && (
        <OpenShiftModal onClose={() => setActiveShiftModal(null)} />
      )}
      {activeShiftModal === 'recap' && (
        <ShiftRecapModal onClose={() => setActiveShiftModal(null)} />
      )}
      {activeShiftModal === 'cash' && (
        <CashMovementModal onClose={() => setActiveShiftModal(null)} />
      )}
      {activeShiftModal === 'close' && (
        <CloseShiftModal onClose={() => setActiveShiftModal(null)} />
      )}

      {/* Held Orders Modal (Tahan Pesanan) */}
      {heldOrdersModalOpen && (
        <HeldOrdersModal
          heldOrders={heldOrders}
          onRecall={handleRecallHeldOrder}
          onDelete={handleDeleteHeldOrder}
          onClose={() => setHeldOrdersModalOpen(false)}
        />
      )}

      {/* Order History & Void Modal */}
      {orderHistoryOpen && (
        <OrderHistoryModal
          onClose={() => setOrderHistoryOpen(false)}
          onReprintReceipt={handleReprintReceipt}
          onRefreshOrders={loadData}
        />
      )}

      {/* Printer Stations & Print Queue Modal */}
      {printerStatusOpen && (
        <PrinterStatusModal onClose={() => setPrinterStatusOpen(false)} />
      )}

      {/* Menu Matrix BCG Decision Analytics Modal */}
      {menuMatrixOpen && (
        <MenuMatrixModal onClose={() => setMenuMatrixOpen(false)} />
      )}

      {/* Split Bill Modal */}
      {splitBillOpen && (
        <div className="bo-modal-layer" onClick={() => setSplitBillOpen(false)}>
          <div
            className="bo-modal"
            role="dialog"
            aria-modal="true"
            style={{ maxWidth: '440px', width: '92%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <header className="bo-modal-head">
              <div>
                <h2>Pisah Tagihan (Split Bill)</h2>
                <p>Bagi rata total belanja untuk pembayaran rombongan.</p>
              </div>
              <button onClick={() => setSplitBillOpen(false)} aria-label="Tutup">
                <Icon name="close" size={20} />
              </button>
            </header>

            <div style={{ flex: '1 1 auto', overflowY: 'auto', padding: '18px 20px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  backgroundColor: '#f3f6f3',
                  borderRadius: '8px',
                  marginBottom: '16px',
                }}
              >
                <span>Jumlah Orang:</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setSplitCount(Math.max(2, splitCount - 1))}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      border: '1px solid #ccc',
                      background: '#fff',
                      cursor: 'pointer',
                    }}
                  >
                    −
                  </button>
                  <b style={{ fontSize: '18px', minWidth: '24px', textAlign: 'center' }}>{splitCount}</b>
                  <button
                    type="button"
                    onClick={() => setSplitCount(splitCount + 1)}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      border: '1px solid #ccc',
                      background: '#fff',
                      cursor: 'pointer',
                    }}
                  >
                    +
                  </button>
                </div>
              </div>

              <div
                style={{
                  padding: '14px',
                  border: '1px solid #d1d1d1',
                  borderRadius: '8px',
                  textAlign: 'center',
                }}
              >
                <span style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>
                  Nominal per orang:
                </span>
                <b style={{ fontSize: '22px', color: '#57695b' }}>
                  {rupiah(Math.round(grandTotal / splitCount))}
                </b>
              </div>
            </div>

            <footer className="modal-actions" style={{ padding: '14px 20px', borderTop: '1px solid #eee' }}>
              <button type="button" onClick={() => setSplitBillOpen(false)}>
                Batal
              </button>
              <button
                type="button"
                className="bo-primary"
                onClick={() => {
                  setSplitBillOpen(false);
                  setPaymentModalOpen(true);
                }}
              >
                Lanjutkan Pembayaran
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
