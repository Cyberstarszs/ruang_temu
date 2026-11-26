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
  cashSalesTotal?: number;
  totalCashIn?: number;
  totalCashOut?: number;
  expectedCash?: number;
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
  receipt_url?: string | null;
  created_at: string;
}

export interface ModifierOption {
  id: string;
  optionName: string;
  priceAdjustment: number;
  actionType: 'NONE' | 'REPLACE' | 'ADD' | 'REMOVE';
}

export interface ProductRecipeSummary {
  ingredient_id: string;
  name: string;
  code: string;
  quantity: number;
  unit: string;
  unit_cost: number;
  item_hpp: number;
  is_packaging_only: boolean;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: 'Kopi' | 'Non-Kopi' | 'Makanan' | 'Camilan' | 'Add-on';
  price: number;
  original_price?: number;
  has_promo?: boolean;
  promo_badge?: string;
  recipe_hpp?: number;
  recipe_count?: number;
  recipes?: ProductRecipeSummary[];
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

export type CustomerTier = 'CLASSIC' | 'SILVER' | 'GOLD' | 'PLATINUM';

export interface Customer {
  id: string;
  name: string;
  phone_number: string;
  tier: CustomerTier;
  loyalty_points: number;
  created_at: string;
  total_orders?: number;
  total_spent?: number | string;
  last_visit?: string | null;
}

export interface CustomerStats {
  totalCustomers: number;
  totalLoyaltyPoints: number;
  activeCustomers30d: number;
  totalCustomerRevenue: number;
  totalCustomerOrders: number;
  averageOrderValue: number;
  tierCounts: {
    CLASSIC: number;
    SILVER: number;
    GOLD: number;
    PLATINUM: number;
  };
}

export interface CustomerDetailOrderItem {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface CustomerDetailPayment {
  id: string;
  method: string;
  amountPaid: number | string;
}

export interface CustomerDetailOrder {
  id: string;
  order_number: string;
  order_type: 'DINE_IN' | 'TAKEAWAY';
  subtotal: number | string;
  discount_amount: number | string;
  total_amount: number | string;
  status: 'PENDING_PAYMENT_AT_CASHIER' | 'PAID' | 'CANCELLED' | 'EXPIRED';
  created_at: string;
  paid_at?: string | null;
  table_number?: string | null;
  items: CustomerDetailOrderItem[];
  payments: CustomerDetailPayment[];
}

export interface CustomerDetail extends Customer {
  recentOrders: CustomerDetailOrder[];
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
  created_at?: string;
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

// ==========================================
// ADMIN & OWNER REPORT / BACKOFFICE TYPES
// ==========================================

export interface DailySummary {
  date: string;
  totalTransactions: number;
  netSales: number;
  totalCogs: number;
  totalDiscounts?: number;
  grossProfit: number;
  grossMarginPercentage: string;
  averageBasketSize: number;
  topProducts: Array<{
    name: string;
    total_qty: string | number;
    total_revenue: string | number;
  }>;
}

export interface HourlyHeatmapItem {
  hour: number;
  transactionCount: number;
  salesVolume: number;
}

export interface Ingredient {
  id: string;
  code: string;
  name: string;
  usage_unit: 'gram' | 'ml' | 'pcs';
  purchase_unit: string;
  conversion_rate: number;
  stock_actual: number;
  safe_stock: number;
  unit_cost: number;
  is_low_stock?: boolean;
  is_out_of_stock?: boolean;
  updated_at?: string;
}

export interface ProductRecipeItem {
  id: string;
  product_id: string;
  ingredient_id: string;
  ingredient_name: string;
  ingredient_code: string;
  usage_unit: string;
  unit_cost: number;
  quantity: number;
  item_hpp: number;
  is_packaging_only: boolean;
}

export interface ProductRecipesResponse {
  recipes: ProductRecipeItem[];
  totalHpp: number;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  address?: string | null;
  payment_terms: string;
  is_active: boolean;
  created_at: string;
}

export interface PurchaseOrderItem {
  id: string;
  ingredient_id: string;
  ingredient_name: string;
  ingredient_code?: string;
  usage_unit?: string;
  purchase_unit?: string;
  unit_type?: string;
  conversion_rate?: number;
  ingredient_conversion_rate?: number;
  quantity: number;
  unit_cost: number;
  subtotal: number;
}

export interface PurchaseOrder {
  id: string;
  po_number: string;
  supplier_id: string;
  supplier_name: string;
  supplier_phone?: string;
  supplier_address?: string;
  status: 'DRAFT' | 'ORDERED' | 'RECEIVED' | 'CANCELLED';
  total_amount: number;
  payment_status: 'UNPAID' | 'PAID';
  notes?: string | null;
  ordered_by_user_id: string;
  ordered_by_name?: string;
  received_at?: string | null;
  created_at: string;
  items?: PurchaseOrderItem[];
}

export interface StoreSettings {
  id: string;
  store_name: string;
  tagline?: string;
  address?: string;
  phone?: string;
  receipt_footer?: string;
  rounding_rule: number;
  paper_size?: '58mm' | '80mm';
  tax_rate?: number;
  service_charge_rate?: number;
  auto_print_receipt?: boolean;
  auto_print_bar?: boolean;
  auto_print_kitchen?: boolean;
  cashier_printer_name?: string;
  bar_printer_name?: string;
  kitchen_printer_name?: string;
  wifi_ssid?: string;
  wifi_password?: string;
  instagram?: string;
  updated_at?: string;
}

export interface AuditLog {
  id: string;
  user_id?: string | null;
  actor_name?: string | null;
  actor_role?: string | null;
  action: string;
  target_table: string;
  target_id: string;
  details: any;
  created_at: string;
}

export interface ShiftAuditItem {
  id: string;
  cashier_id: string;
  cashier_name: string;
  opened_at: string;
  closed_at?: string | null;
  opening_cash: number;
  system_expected_cash?: number | null;
  blind_counted_cash?: number | null;
  cash_difference?: number | null;
  closing_notes?: string | null;
  approved_by_name?: string | null;
  status: 'OPEN' | 'CLOSED';
  total_orders: number;
  total_sales: number;
  cash_sales?: number;
  non_cash_sales?: number;
  total_cash_in?: number;
  total_cash_out?: number;
  movement_count: number;
}

export interface StaffUser {
  id: string;
  name: string;
  username: string;
  role: UserRole;
  has_pin: boolean;
  is_active: boolean;
  created_at: string;
}

