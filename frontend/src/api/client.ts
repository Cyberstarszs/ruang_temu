import type {
  User,
  CashierShift,
  CafeTable,
  Product,
  Ingredient,
  Order,
  Promo,
  DailySummary,
  Customer,
  Reservation,
  Supplier,
  PurchaseOrder,
  AttendanceRecord,
  AuditLog,
  StoreSettings,
  NotificationItem,
} from '../types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000/api/v1';

export function getAuthToken(): string | null {
  return localStorage.getItem('ruang_temu_token');
}

export function setAuthToken(token: string | null) {
  if (token) {
    localStorage.setItem('ruang_temu_token', token);
  } else {
    localStorage.removeItem('ruang_temu_token');
  }
}

export function getAuthUser(): User | null {
  const raw = localStorage.getItem('ruang_temu_user');
  return raw ? JSON.parse(raw) : null;
}

export function setAuthUser(user: User | null) {
  if (user) {
    localStorage.setItem('ruang_temu_user', JSON.stringify(user));
  } else {
    localStorage.removeItem('ruang_temu_user');
  }
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: any;
}

export async function apiRequest<T = any>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'GET',
  body?: any,
  customHeaders?: Record<string, string>
): Promise<ApiResponse<T>> {
  try {
    const token = getAuthToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...customHeaders,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json();
    if (!response.ok) {
      return {
        success: false,
        message: data.message || `Request failed with status ${response.status}`,
        error: data,
      };
    }

    return data;
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Gagal terhubung ke server backend.',
    };
  }
}

// 1. AUTH API
export const authApi = {
  login: (username: string, password: string) =>
    apiRequest<{ token: string; user: User }>('/auth/login', 'POST', { username, password }),
  verifyPin: (pin: string) =>
    apiRequest<{ valid: boolean; user?: User }>('/auth/verify-pin', 'POST', { pin }),
};

// 2. SHIFTS API
export const shiftApi = {
  getCurrent: () =>
    apiRequest<CashierShift | null>('/shifts/current', 'GET'),
  open: (openingCash: number) =>
    apiRequest<CashierShift>('/shifts/open', 'POST', { openingCash }),
  close: (shiftId: string, blindCountedCash: number, notes?: string, managerPin?: string) =>
    apiRequest('/shifts/close', 'POST', { shiftId, blindCountedCash, notes, managerPin }),
  recordCashMovement: (
    shiftId: string,
    type: 'CASH_IN' | 'CASH_OUT',
    category: string,
    description: string,
    amount: number
  ) =>
    apiRequest('/shifts/cash-movements', 'POST', { shiftId, type, category, description, amount }),
};

// 3. TABLES API
export const tableApi = {
  getAll: () =>
    apiRequest<CafeTable[]>('/tables', 'GET'),
  clear: (tableId: string) =>
    apiRequest<{ table: CafeTable }>(`/tables/${tableId}/clear`, 'POST'),
  updateStatus: (tableId: string, status: CafeTable['status']) =>
    apiRequest(`/tables/${tableId}/status`, 'PATCH', { status }),
};

// 4. PRODUCTS API
export const productApi = {
  getAll: async (category?: string) => {
    const res = await apiRequest<any[]>(`/products${category ? `?category=${category}` : ''}`, 'GET');
    if (res.success && Array.isArray(res.data)) {
      const normalized = res.data.map((p) => ({
        ...p,
        base_price: Number(p.base_price ?? p.price ?? 0),
        price: Number(p.price ?? p.base_price ?? 0),
        category_name: p.category_name ?? p.category ?? 'Kopi',
        category: p.category ?? p.category_name ?? 'Kopi',
      }));
      return { ...res, data: normalized as Product[] };
    }
    return res as ApiResponse<Product[]>;
  },
  getById: (id: string) =>
    apiRequest<Product>(`/products/${id}`, 'GET'),
  create: (product: Partial<Product>) =>
    apiRequest<Product>('/products', 'POST', product),
  update: (id: string, product: Partial<Product>) =>
    apiRequest<Product>(`/products/${id}`, 'PUT', product),
};

// 5. ORDERS & CHECKOUT API
export const orderApi = {
  checkoutDirect: (payload: {
    shiftId: string;
    tableId?: string | null;
    tableNumberFallback?: string | null;
    orderType: 'DINE_IN' | 'TAKEAWAY';
    customerId?: string | null;
    items: Array<{ productId: string; quantity: number; notes?: string; modifiers?: string[] }>;
    payments?: Array<{ method: string; amount: number; cashReceived?: number; cashChange?: number }>;
    paymentMethod?: string;
    cashReceived?: number;
    cashChange?: number;
    discountAmount?: number;
    promoId?: string | null;
    promoCode?: string | null;
    notes?: string;
  }) => apiRequest<Order>('/orders/checkout-direct', 'POST', payload),

  getOrders: (params?: { date?: string; status?: string; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.date) q.append('date', params.date);
    if (params?.status) q.append('status', params.status);
    if (params?.limit) q.append('limit', String(params.limit));
    return apiRequest<Order[]>(`/orders?${q.toString()}`, 'GET');
  },

  voidOrder: (orderId: string, managerPin: string, reason: string) =>
    apiRequest(`/orders/${orderId}/void`, 'POST', { managerPin, reason }),

  submitQr: (tableNumber: string, customerName?: string, items?: any[], notes?: string) =>
    apiRequest<{ id: string; order_number: string; status: string }>(
      '/orders/qr-submit',
      'POST',
      { tableNumber, customerName, items, notes }
    ),

  payQr: (orderId: string, payload: any) =>
    apiRequest<Order>(`/orders/${orderId}/cashier-pay`, 'POST', payload),
};

// 6. PROMOS API
export const promoApi = {
  getAll: () =>
    apiRequest<Promo[]>('/promos', 'GET'),
  validate: (code: string, subtotal: number) =>
    apiRequest<{ valid: boolean; discountAmount: number; finalAmount: number; message?: string }>(
      '/promos/validate',
      'POST',
      { code, subtotal }
    ),
  create: (promo: Partial<Promo>) =>
    apiRequest<Promo>('/promos', 'POST', promo),
};

// 7. INVENTORY API
export const inventoryApi = {
  getAll: () =>
    apiRequest<Ingredient[]>('/inventory', 'GET'),
  recordWastage: (ingredientId: string, quantity: number, reason: string) =>
    apiRequest('/inventory/wastage', 'POST', { ingredientId, quantity, reason }),
  stocktake: (items: Array<{ ingredientId: string; actualCount: number; notes?: string }>) =>
    apiRequest('/inventory/stocktake', 'POST', { items }),
};

// 8. REPORTS API
export const reportApi = {
  getDailySummary: (date?: string) =>
    apiRequest<DailySummary>(`/reports/daily-summary${date ? `?date=${date}` : ''}`, 'GET'),
  getHourlyHeatmap: (date?: string) =>
    apiRequest<Array<{ hour: number; total_orders: number; total_sales: number }>>(
      `/reports/hourly-heatmap${date ? `?date=${date}` : ''}`,
      'GET'
    ),
  getTopProducts: () =>
    apiRequest<Array<{ name: string; quantity: number; revenue: number }>>(
      '/reports/top-products',
      'GET'
    ),
};

// 9. CUSTOMERS CRM API
export const customerApi = {
  getAll: (phone?: string) =>
    apiRequest<Customer[]>(`/customers${phone ? `?phone=${phone}` : ''}`, 'GET'),
  create: (payload: { name: string; phoneNumber: string; email?: string }) =>
    apiRequest<Customer>('/customers', 'POST', payload),
};

// 10. RESERVATIONS API
export const reservationApi = {
  getAll: (date?: string) =>
    apiRequest<Reservation[]>(`/reservations${date ? `?date=${date}` : ''}`, 'GET'),
  create: (payload: {
    customerName: string;
    phoneNumber: string;
    guestCount: number;
    reservationTime: string;
    tableId?: string;
    downPayment?: number;
    notes?: string;
  }) => apiRequest<Reservation>('/reservations', 'POST', payload),
};

// 11. PURCHASING & SUPPLIERS API
export const purchasingApi = {
  getSuppliers: () =>
    apiRequest<Supplier[]>('/purchasing/suppliers', 'GET'),
  createSupplier: (payload: { name: string; contactPerson?: string; phone?: string; address?: string }) =>
    apiRequest<Supplier>('/purchasing/suppliers', 'POST', payload),
  getOrders: () =>
    apiRequest<PurchaseOrder[]>('/purchasing/orders', 'GET'),
  createOrder: (payload: {
    supplierId: string;
    items: Array<{ ingredientId: string; quantity: number; unitPrice: number }>;
    notes?: string;
  }) => apiRequest<PurchaseOrder>('/purchasing/orders', 'POST', payload),
  receiveOrder: (orderId: string, invoiceNumber?: string, notes?: string) =>
    apiRequest<{ message: string }>(`/purchasing/orders/${orderId}/receive`, 'POST', { invoiceNumber, notes }),
};

// 12. STAFF ATTENDANCE API
export const attendanceApi = {
  clockIn: (notes?: string) =>
    apiRequest<AttendanceRecord>('/attendance/clock-in', 'POST', { notes }),
  clockOut: (notes?: string) =>
    apiRequest<AttendanceRecord>('/attendance/clock-out', 'POST', { notes }),
  getToday: () =>
    apiRequest<AttendanceRecord | null>('/attendance/today', 'GET'),
  getList: (date?: string) =>
    apiRequest<AttendanceRecord[]>(`/attendance/list${date ? `?date=${date}` : ''}`, 'GET'),
};

// 13. AUDIT LOGS API
export const auditApi = {
  getAll: (limit: number = 50) =>
    apiRequest<AuditLog[]>(`/audit-logs?limit=${limit}`, 'GET'),
};

// 14. STORE & PRINTER SETTINGS API
export const settingsApi = {
  get: () =>
    apiRequest<StoreSettings>('/settings', 'GET'),
  update: (payload: Partial<StoreSettings>) =>
    apiRequest<StoreSettings>('/settings', 'PUT', payload),
};

// 15. NOTIFICATIONS API
export const notificationApi = {
  getAll: () =>
    apiRequest<NotificationItem[]>('/notifications', 'GET'),
};
