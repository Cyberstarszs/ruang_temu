export type UserRole = 'OWNER' | 'CASHIER' | 'MANAGER' | 'STAFF';

export interface User {
  id: string;
  name: string;
  username: string;
  role: UserRole;
  hasPin?: boolean;
}

export interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
}

export interface ShiftSummary {
  openingCash: number;
  orderCount: number;
}

export interface CashierShift {
  id: string;
  cashier_id: string;
  cashier_name?: string;
  opened_at: string;
  closed_at?: string | null;
  opening_cash: number | string;
  system_expected_cash?: number | string | null;
  blind_counted_cash?: number | string | null;
  cash_difference?: number | string | null;
  closing_notes?: string | null;
  status: 'OPEN' | 'CLOSED';
}

export interface CashMovement {
  id: string;
  shift_id: string;
  type: 'CASH_IN' | 'CASH_OUT';
  category: string;
  description?: string;
  amount: number | string;
  created_at: string;
}

export interface ModifierOption {
  id: string;
  optionName: string;
  priceAdjustment: number;
  actionType: 'NONE' | 'REPLACE' | 'ADD' | 'REMOVE';
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: 'Kopi' | 'Non-Kopi' | 'Makanan' | 'Camilan' | 'Add-on';
  price: number;
  image_url?: string | null;
  print_target: 'BAR_PRINTER' | 'KITCHEN_PRINTER' | 'NONE';
  is_active: boolean;
  is_force_sold_out: boolean;
  is_auto_sold_out?: boolean;
  isSoldOut?: boolean;
  is_favorite?: boolean;
  modifiers?: ModifierOption[];
}

export type TableStatus = 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'CLEANING';

export interface DiningTable {
  id: string;
  table_number: string;
  area: 'Indoor' | 'Outdoor' | string;
  capacity: number;
  status: TableStatus;
  occupied_at?: string | null;
  occupied_minutes?: number;
  active_orders?: Array<{
    orderId: string;
    orderNumber: string;
    status: string;
    totalAmount: number;
    itemCount: number;
  }> | null;
}

export interface Customer {
  id: string;
  name: string;
  phone_number: string;
  tier: 'CLASSIC' | 'SILVER' | 'GOLD';
  loyalty_points: number;
  created_at: string;
}

export interface Promo {
  id: string;
  code: string;
  name: string;
  description?: string;
  discount_type: 'PERCENT' | 'FIXED_AMOUNT';
  discount_value: number | string;
  min_spend: number | string;
  max_discount?: number | string | null;
  start_date: string;
  end_date: string;
  quota?: number | null;
  used_count: number;
  is_active: boolean;
}

export interface CartCustomization {
  size: 'Reguler' | 'Besar';
  unitPriceAdjustment: number;
  sugarLevel?: 'Normal (100%)' | 'Less Sugar (70%)' | 'Half Sugar (50%)' | 'No Sugar (0%)';
  iceLevel?: 'Normal Ice' | 'Less Ice' | 'No Ice' | 'Hot';
  milkType?: 'Fresh Milk' | 'Oat Milk (+Rp 6.000)' | 'Almond Milk (+Rp 8.000)';
  extraShot?: boolean;
  notes?: string;
  selectedOptions: string[];
}

export interface CartItem {
  product: Product;
  quantity: number;
  customization?: CartCustomization;
  itemSubtotal: number;
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  printTarget: 'BAR_PRINTER' | 'KITCHEN_PRINTER' | 'NONE';
  notes?: string | null;
  modifiers?: any;
}

export interface OrderPayment {
  id: string;
  method: 'CASH' | 'QRIS' | 'DEBIT_CARD' | 'BANK_TRANSFER';
  amountPaid: number;
  cashReceived?: number | null;
  cashChange?: number | null;
  referenceNumber?: string | null;
}

export interface Order {
  id: string;
  order_number: string;
  shift_id: string;
  cashier_id?: string | null;
  cashier_name?: string | null;
  table_id?: string | null;
  table_number?: string | null;
  customer_id?: string | null;
  customer_name?: string | null;
  reservation_id?: string | null;
  order_type: 'DINE_IN' | 'TAKEAWAY';
  subtotal: number | string;
  discount_amount: number | string;
  claimed_down_payment: number | string;
  total_amount: number | string;
  status: 'PENDING_PAYMENT_AT_CASHIER' | 'PAID' | 'CANCELLED' | 'EXPIRED';
  notes?: string | null;
  created_at: string;
  paid_at?: string | null;
  items?: OrderItem[];
  payments?: OrderPayment[];
}

export interface PrintJob {
  id: string;
  order_id: string;
  order_number: string;
  order_type: string;
  table_number?: string | null;
  doc_type: 'CHECKER_BAR' | 'CHECKER_KITCHEN' | 'VOID_BAR' | 'VOID_KITCHEN';
  target_ip: string;
  target_port: number;
  status: 'PENDING' | 'SENT' | 'FAILED';
  retry_count: number;
  error_message?: string | null;
  created_at: string;
  updated_at: string;
}

export interface MenuMatrixItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  price: number;
  cost: number;
  margin: number;
  quantity: number;
  revenue: number;
  quadrant: 'BINTANG' | 'POTENSIAL' | 'PEKERJA_KERAS' | 'EVALUASI';
  popularityPercentage: number;
}

export interface MenuMatrixResponse {
  products: MenuMatrixItem[];
  benchmarks: {
    averageMargin: number;
    averageQuantity: number;
    maxQuantity: number;
    totalProducts: number;
  };
}

export interface DirectCheckoutPayload {
  shiftId: string;
  tableId?: string | null;
  tableNumberFallback?: string | null;
  orderType: 'DINE_IN' | 'TAKEAWAY';
  customerId?: string | null;
  reservationId?: string | null;
  items: Array<{
    productId: string;
    quantity: number;
    notes?: string;
    modifiers?: string[];
  }>;
  payments?: Array<{
    method: 'CASH' | 'QRIS' | 'DEBIT_CARD' | 'BANK_TRANSFER';
    amount: number;
    cashReceived?: number;
    cashChange?: number;
    referenceNumber?: string;
  }>;
  paymentMethod?: 'CASH' | 'QRIS' | 'DEBIT_CARD' | 'BANK_TRANSFER';
  cashReceived?: number;
  cashChange?: number;
  referenceNumber?: string;
  discountAmount?: number;
  claimedDownPayment?: number;
  notes?: string;
}

export interface HeldOrder {
  id: string;
  heldAt: string;
  orderType: 'DINE_IN' | 'TAKEAWAY';
  selectedTable: { id?: string; number: string } | null;
  customer: Customer | null;
  takeawayName: string;
  orderNote: string;
  items: CartItem[];
  subtotal: number;
  discountAmount: number;
  promoCode: string;
  claimedDownPayment: number;
  grandTotal: number;
}

