'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
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
  promoCode: string;
  promoError: string;
  promoSuccess: string;
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
  setPromoCode: React.Dispatch<React.SetStateAction<string>>;
  setPromoError: React.Dispatch<React.SetStateAction<string>>;
  setPromoSuccess: React.Dispatch<React.SetStateAction<string>>;
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

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderType, setOrderType] = useState<'DINE_IN' | 'TAKEAWAY'>('DINE_IN');
  const [selectedTable, setSelectedTable] = useState<{ id?: string; number: string } | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [orderNote, setOrderNote] = useState('');
  const [takeawayName, setTakeawayName] = useState('');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [promoCode, setPromoCode] = useState('');
  const [promoError, setPromoError] = useState('');
  const [promoSuccess, setPromoSuccess] = useState('');
  const [claimedDownPayment, setClaimedDownPayment] = useState(0);
  const [reservationId, setReservationId] = useState<string | null>(null);
  const [heldOrders, setHeldOrders] = useState<HeldOrder[]>([]);

  // Load held orders from localStorage on initial client mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('ruang_temu_held_orders_v2');
      if (saved) {
        setHeldOrders(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Error loading held orders:', e);
    }
  }, []);

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

  // Price calculations
  const subtotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.itemSubtotal, 0);
  }, [cart]);

  const netSubtotal = useMemo(() => {
    return Math.max(0, subtotal - discountAmount - claimedDownPayment);
  }, [subtotal, discountAmount, claimedDownPayment]);

  const serviceChargeAmount = useMemo(() => {
    return serviceChargeRate > 0 ? Math.round((netSubtotal * serviceChargeRate) / 100) : 0;
  }, [netSubtotal, serviceChargeRate]);

  const taxAmount = useMemo(() => {
    return taxRate > 0 ? Math.round(((netSubtotal + serviceChargeAmount) * taxRate) / 100) : 0;
  }, [netSubtotal, serviceChargeAmount, taxRate]);

  const { grandTotal, roundingAmount } = useMemo(() => {
    const raw = netSubtotal + serviceChargeAmount + taxAmount;
    if (roundingRule > 1 && raw > 0) {
      const rounded = Math.round(raw / roundingRule) * roundingRule;
      return { grandTotal: Math.max(0, rounded), roundingAmount: rounded - raw };
    }
    return { grandTotal: Math.max(0, raw), roundingAmount: 0 };
  }, [netSubtotal, serviceChargeAmount, taxAmount, roundingRule]);

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
    setPromoCode('');
    setPromoError('');
    setPromoSuccess('');
    setClaimedDownPayment(0);
    setReservationId(null);
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
      promoCode,
      claimedDownPayment,
      grandTotal,
    };

    updateHeldOrders([newHeld, ...heldOrders]);
    handleClearCart();
    return { success: true, message: `Pesanan berhasil ditahan (${newHeld.id}).` };
  }, [cart, orderType, selectedTable, customer, takeawayName, orderNote, subtotal, discountAmount, promoCode, claimedDownPayment, grandTotal, heldOrders, updateHeldOrders, handleClearCart]);

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
        promoCode,
        promoError,
        promoSuccess,
        claimedDownPayment,
        reservationId,
        heldOrders,

        subtotal,
        taxRate,
        taxAmount,
        serviceChargeRate,
        serviceChargeAmount,
        roundingAmount,
        grandTotal,
        itemCount,

        setCart,
        setOrderType,
        setSelectedTable,
        setCustomer,
        setOrderNote,
        setTakeawayName,
        setDiscountAmount,
        setPromoCode,
        setPromoError,
        setPromoSuccess,
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
