'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { CartItem, CartCustomization, Customer, DiningTable, HeldOrder, Product } from '@/types';
import { api } from '@/lib/api';

interface CartContextValue {
  // State
  cart: CartItem[];
  orderType: 'DINE_IN' | 'TAKEAWAY';
  selectedTable: { id?: string; number: string } | null;
  customer: Customer | null;
  orderNote: string;
  takeawayName: string;
  discountAmount: number;
  promoId: string | null;
  promoCode: string;
  promoError: string;
  promoSuccess: string;
  redeemPoints: number;
  pointsDiscountAmount: number;
  maxRedeemablePoints: number;
  claimedDownPayment: number;
  reservationId: string | null;
  heldOrders: HeldOrder[];

  // Computations
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  serviceChargeRate: number;
  serviceChargeAmount: number;
  roundingAmount: number;
  effectiveDownPayment: number;
  grandTotal: number;
  itemCount: number;

  // Setters
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  setOrderType: React.Dispatch<React.SetStateAction<'DINE_IN' | 'TAKEAWAY'>>;
  setSelectedTable: React.Dispatch<React.SetStateAction<{ id?: string; number: string } | null>>;
  setCustomer: React.Dispatch<React.SetStateAction<Customer | null>>;
  setOrderNote: React.Dispatch<React.SetStateAction<string>>;
  setTakeawayName: React.Dispatch<React.SetStateAction<string>>;
  setDiscountAmount: React.Dispatch<React.SetStateAction<number>>;
  setPromoId: React.Dispatch<React.SetStateAction<string | null>>;
  setPromoCode: React.Dispatch<React.SetStateAction<string>>;
  setPromoError: React.Dispatch<React.SetStateAction<string>>;
  setPromoSuccess: React.Dispatch<React.SetStateAction<string>>;
  setRedeemPoints: React.Dispatch<React.SetStateAction<number>>;
  setClaimedDownPayment: React.Dispatch<React.SetStateAction<number>>;
  setReservationId: React.Dispatch<React.SetStateAction<string | null>>;

  // Cart Operations
  handleQuickAdd: (product: Product, onNeedsCustomization?: (product: Product) => void) => void;
  handleCustomizationConfirm: (product: Product, quantity: number, customization: CartCustomization) => void;
  handleUpdateQuantity: (index: number, newQty: number) => void;
  handleRemoveItem: (index: number) => void;
  handleClearCart: () => void;

  // Held Orders Operations
  updateHeldOrders: (newOrders: HeldOrder[]) => void;
  handleHoldOrder: () => { success: boolean; message: string };
  handleRecallHeldOrder: (heldOrder: HeldOrder, confirmReplace?: boolean) => boolean;
  handleDeleteHeldOrder: (id: string) => void;

  // Table Helpers
  handleSetManualTable: (tableNumber: string, tables?: DiningTable[]) => void;
}

const ACTIVE_CART_STORAGE_KEY = 'ruang_temu_active_cart_v1';

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderType, setOrderType] = useState<'DINE_IN' | 'TAKEAWAY'>('DINE_IN');
  const [selectedTable, setSelectedTable] = useState<{ id?: string; number: string } | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [orderNote, setOrderNote] = useState('');
  const [takeawayName, setTakeawayName] = useState('');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [promoId, setPromoId] = useState<string | null>(null);
  const [promoCode, setPromoCode] = useState('');
  const [promoError, setPromoError] = useState('');
  const [promoSuccess, setPromoSuccess] = useState('');
  const [redeemPoints, setRedeemPoints] = useState(0);
  const [claimedDownPayment, setClaimedDownPayment] = useState(0);
  const [reservationId, setReservationId] = useState<string | null>(null);
  const [heldOrders, setHeldOrders] = useState<HeldOrder[]>([]);
  const [isCartHydrated, setIsCartHydrated] = useState(false);
  const prevCustomerIdRef = useRef<string | undefined>(undefined);

  // Load held orders & active cart from localStorage on initial client mount
  useEffect(() => {
    try {
      const savedHeld = localStorage.getItem('ruang_temu_held_orders_v2');
      if (savedHeld) {
        setHeldOrders(JSON.parse(savedHeld));
      }
    } catch (e) {
      console.error('Error loading held orders:', e);
    }

    try {
      const savedCartRaw = localStorage.getItem(ACTIVE_CART_STORAGE_KEY);
      if (savedCartRaw) {
        const parsed = JSON.parse(savedCartRaw);
        if (parsed && typeof parsed === 'object') {
          if (Array.isArray(parsed.cart)) setCart(parsed.cart);
          if (parsed.orderType === 'DINE_IN' || parsed.orderType === 'TAKEAWAY') {
            setOrderType(parsed.orderType);
          }
          if (parsed.selectedTable !== undefined) setSelectedTable(parsed.selectedTable);
          if (parsed.customer !== undefined) {
            setCustomer(parsed.customer);
            prevCustomerIdRef.current = parsed.customer?.id;
          }
          if (typeof parsed.orderNote === 'string') setOrderNote(parsed.orderNote);
          if (typeof parsed.takeawayName === 'string') setTakeawayName(parsed.takeawayName);
          if (typeof parsed.discountAmount === 'number') setDiscountAmount(parsed.discountAmount);
          if (parsed.promoId !== undefined) setPromoId(parsed.promoId);
          if (typeof parsed.promoCode === 'string') setPromoCode(parsed.promoCode);
          if (typeof parsed.promoSuccess === 'string') setPromoSuccess(parsed.promoSuccess);
          if (typeof parsed.redeemPoints === 'number') setRedeemPoints(parsed.redeemPoints);
          if (typeof parsed.claimedDownPayment === 'number') setClaimedDownPayment(parsed.claimedDownPayment);
          if (parsed.reservationId !== undefined) setReservationId(parsed.reservationId);
        }
      }
    } catch (e) {
      console.error('Error loading persisted cart:', e);
    } finally {
      setIsCartHydrated(true);
    }
  }, []);

  // Reset redeemed points only when the selected customer actually changes after hydration
  useEffect(() => {
    if (!isCartHydrated) return;
    if (prevCustomerIdRef.current !== customer?.id) {
      prevCustomerIdRef.current = customer?.id;
      setRedeemPoints(0);
    }
  }, [customer?.id, isCartHydrated]);

  // Persist active cart across browser refreshes
  useEffect(() => {
    if (!isCartHydrated) return;
    try {
      const hasContent =
        cart.length > 0 ||
        Boolean(selectedTable) ||
        Boolean(customer) ||
        Boolean(orderNote) ||
        Boolean(takeawayName) ||
        Boolean(promoCode) ||
        claimedDownPayment > 0 ||
        Boolean(reservationId);

      if (!hasContent) {
        localStorage.removeItem(ACTIVE_CART_STORAGE_KEY);
        return;
      }

      localStorage.setItem(
        ACTIVE_CART_STORAGE_KEY,
        JSON.stringify({
          cart,
          orderType,
          selectedTable,
          customer,
          orderNote,
          takeawayName,
          discountAmount,
          promoId,
          promoCode,
          promoSuccess,
          redeemPoints,
          claimedDownPayment,
          reservationId,
        })
      );
    } catch (e) {
      console.error('Error saving persisted cart:', e);
    }
  }, [
    isCartHydrated,
    cart,
    orderType,
    selectedTable,
    customer,
    orderNote,
    takeawayName,
    discountAmount,
    promoId,
    promoCode,
    promoSuccess,
    redeemPoints,
    claimedDownPayment,
    reservationId,
  ]);

  const updateHeldOrders = useCallback((newOrders: HeldOrder[]) => {
    setHeldOrders(newOrders);
    try {
      localStorage.setItem('ruang_temu_held_orders_v2', JSON.stringify(newOrders));
    } catch (e) {
      console.error('Error saving held orders:', e);
    }
  }, []);

  const [storeSettings, setStoreSettings] = useState<{ tax_rate?: number; service_charge_rate?: number; rounding_rule?: number } | null>(null);

  useEffect(() => {
    let isMounted = true;
    api.settings.get()
      .then((res) => {
        if (isMounted && res.success && res.data) {
          setStoreSettings(res.data);
          try {
            localStorage.setItem('ruang_temu_store_settings_cache', JSON.stringify(res.data));
          } catch {}
        }
      })
      .catch(() => {
        try {
          const cached = localStorage.getItem('ruang_temu_store_settings_cache');
          if (cached && isMounted) setStoreSettings(JSON.parse(cached));
        } catch {}
      });
    return () => { isMounted = false; };
  }, []);

  const taxRate = Number(storeSettings?.tax_rate) || 0;
  const serviceChargeRate = Number(storeSettings?.service_charge_rate) || 0;
  const roundingRule = Number(storeSettings?.rounding_rule) || 1;

  // Price calculations (DPP = Subtotal - Diskon - Poin; Servis & PB1 dihitung sebelum pemotongan DP)
  const subtotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.itemSubtotal, 0);
  }, [cart]);

  const maxRedeemablePoints = useMemo(() => {
    if (!customer || Number(customer.loyalty_points || 0) <= 0) return 0;
    const remainingAfterPromo = Math.max(0, subtotal - discountAmount);
    return Math.min(Number(customer.loyalty_points || 0), Math.floor(remainingAfterPromo / 100));
  }, [customer, subtotal, discountAmount]);

  const activeRedeemPoints = useMemo(() => {
    return Math.min(Math.max(0, redeemPoints), maxRedeemablePoints);
  }, [redeemPoints, maxRedeemablePoints]);

  const pointsDiscountAmount = activeRedeemPoints * 100;

  const afterDiscount = useMemo(() => {
    return Math.max(0, subtotal - discountAmount - pointsDiscountAmount);
  }, [subtotal, discountAmount, pointsDiscountAmount]);

  const serviceChargeAmount = useMemo(() => {
    return serviceChargeRate > 0 ? Math.round((afterDiscount * serviceChargeRate) / 100) : 0;
  }, [afterDiscount, serviceChargeRate]);

  const taxAmount = useMemo(() => {
    return taxRate > 0 ? Math.round(((afterDiscount + serviceChargeAmount) * taxRate) / 100) : 0;
  }, [afterDiscount, serviceChargeAmount, taxRate]);

  const grossBillBeforeDp = useMemo(() => {
    return afterDiscount + serviceChargeAmount + taxAmount;
  }, [afterDiscount, serviceChargeAmount, taxAmount]);

  const effectiveDownPayment = useMemo(() => {
    return Math.min(claimedDownPayment, grossBillBeforeDp);
  }, [claimedDownPayment, grossBillBeforeDp]);

  const { grandTotal, roundingAmount } = useMemo(() => {
    const raw = Math.max(0, grossBillBeforeDp - effectiveDownPayment);
    if (roundingRule > 1 && raw > 0) {
      const rounded = Math.round(raw / roundingRule) * roundingRule;
      return { grandTotal: Math.max(0, rounded), roundingAmount: rounded - raw };
    }
    return { grandTotal: Math.max(0, raw), roundingAmount: 0 };
  }, [grossBillBeforeDp, effectiveDownPayment, roundingRule]);

  const itemCount = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.quantity, 0);
  }, [cart]);

  const handleQuickAdd = useCallback((product: Product, onNeedsCustomization?: (product: Product) => void) => {
    if ((product.category === 'Kopi' || product.category === 'Non-Kopi') && onNeedsCustomization) {
      onNeedsCustomization(product);
      return;
    }

    setCart((prev) => {
      const existingIdx = prev.findIndex((i) => i.product.id === product.id && !i.customization);
      if (existingIdx > -1) {
        const next = [...prev];
        const item = next[existingIdx];
        const newQty = item.quantity + 1;
        next[existingIdx] = {
          ...item,
          quantity: newQty,
          itemSubtotal: product.price * newQty,
        };
        return next;
      }
      return [
        ...prev,
        {
          product,
          quantity: 1,
          itemSubtotal: product.price,
        },
      ];
    });
  }, []);

  const handleCustomizationConfirm = useCallback((
    product: Product,
    quantity: number,
    customization: CartCustomization
  ) => {
    const finalUnitPrice = product.price + customization.unitPriceAdjustment;
    setCart((prev) => [
      ...prev,
      {
        product,
        quantity,
        customization,
        itemSubtotal: finalUnitPrice * quantity,
      },
    ]);
  }, []);

  const handleUpdateQuantity = useCallback((index: number, newQty: number) => {
    setCart((prev) => {
      const next = [...prev];
      const item = next[index];
      if (!item) return prev;
      const unitPrice = item.customization
        ? item.product.price + item.customization.unitPriceAdjustment
        : item.product.price;
      next[index] = {
        ...item,
        quantity: newQty,
        itemSubtotal: unitPrice * newQty,
      };
      return next;
    });
  }, []);

  const handleRemoveItem = useCallback((index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleClearCart = useCallback(() => {
    setCart([]);
    setSelectedTable(null);
    setCustomer(null);
    setOrderNote('');
    setTakeawayName('');
    setDiscountAmount(0);
    setPromoId(null);
    setPromoCode('');
    setPromoError('');
    setPromoSuccess('');
    setRedeemPoints(0);
    setClaimedDownPayment(0);
    setReservationId(null);
    try {
      localStorage.removeItem(ACTIVE_CART_STORAGE_KEY);
    } catch {}
  }, []);

  const handleHoldOrder = useCallback((): { success: boolean; message: string } => {
    if (cart.length === 0) {
      return { success: false, message: 'Keranjang masih kosong, tidak ada pesanan untuk ditahan.' };
    }

    const newHeld: HeldOrder = {
      id: `HOLD-${Date.now().toString().slice(-6)}`,
      heldAt: new Date().toISOString(),
      orderType,
      selectedTable,
      customer,
      takeawayName,
      orderNote,
      items: [...cart],
      subtotal,
      discountAmount,
      promoId,
      promoCode,
      claimedDownPayment,
      grandTotal,
    };

    updateHeldOrders([newHeld, ...heldOrders]);
    handleClearCart();
    return { success: true, message: `Pesanan berhasil ditahan (${newHeld.id}).` };
  }, [cart, orderType, selectedTable, customer, takeawayName, orderNote, subtotal, discountAmount, promoId, promoCode, claimedDownPayment, grandTotal, heldOrders, updateHeldOrders, handleClearCart]);

  const handleRecallHeldOrder = useCallback((heldOrder: HeldOrder, confirmReplace = true): boolean => {
    if (cart.length > 0 && !confirmReplace) {
      return false;
    }

    setCart(heldOrder.items);
    setOrderType(heldOrder.orderType);
    setSelectedTable(heldOrder.selectedTable);
    setCustomer(heldOrder.customer);
    setTakeawayName(heldOrder.takeawayName || '');
    setOrderNote(heldOrder.orderNote || '');
    setDiscountAmount(heldOrder.discountAmount || 0);
    setPromoId(heldOrder.promoId || null);
    setPromoCode(heldOrder.promoCode || '');
    setClaimedDownPayment(heldOrder.claimedDownPayment || 0);

    const updated = heldOrders.filter((o) => o.id !== heldOrder.id);
    updateHeldOrders(updated);
    return true;
  }, [cart.length, heldOrders, updateHeldOrders]);

  const handleDeleteHeldOrder = useCallback((id: string) => {
    const updated = heldOrders.filter((o) => o.id !== id);
    updateHeldOrders(updated);
  }, [heldOrders, updateHeldOrders]);

  const handleSetManualTable = useCallback((tableNumber: string, tables: DiningTable[] = []) => {
    const digitsOnly = tableNumber.replace(/\D/g, '');
    if (!digitsOnly) {
      setSelectedTable(null);
      return;
    }

    const intVal = parseInt(digitsOnly, 10);
    const matched = tables.find((t) => {
      const tableDigits = t.table_number.replace(/\D/g, '');
      return (
        t.table_number.toLowerCase() === digitsOnly.toLowerCase() ||
        t.table_number.toLowerCase() === `m${digitsOnly.padStart(2, '0')}`.toLowerCase() ||
        (tableDigits && parseInt(tableDigits, 10) === intVal)
      );
    });

    if (matched) {
      setSelectedTable({ id: matched.id, number: digitsOnly });
    } else {
      setSelectedTable({ number: digitsOnly });
    }
  }, []);

  return (
    <CartContext.Provider
      value={{
        cart,
        orderType,
        selectedTable,
        customer,
        orderNote,
        takeawayName,
        discountAmount,
        promoId,
        promoCode,
        promoError,
        promoSuccess,
        redeemPoints: activeRedeemPoints,
        pointsDiscountAmount,
        maxRedeemablePoints,
        claimedDownPayment,
        reservationId,
        heldOrders,

        subtotal,
        taxRate,
        taxAmount,
        serviceChargeRate,
        serviceChargeAmount,
        roundingAmount,
        effectiveDownPayment,
        grandTotal,
        itemCount,

        setCart,
        setOrderType,
        setSelectedTable,
        setCustomer,
        setOrderNote,
        setTakeawayName,
        setDiscountAmount,
        setPromoId,
        setPromoCode,
        setPromoError,
        setPromoSuccess,
        setRedeemPoints,
        setClaimedDownPayment,
        setReservationId,

        handleQuickAdd,
        handleCustomizationConfirm,
        handleUpdateQuantity,
        handleRemoveItem,
        handleClearCart,

        updateHeldOrders,
        handleHoldOrder,
        handleRecallHeldOrder,
        handleDeleteHeldOrder,
        handleSetManualTable,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
