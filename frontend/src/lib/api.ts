const API_BASE = '/api/v1';

export class ApiError extends Error {
  statusCode: number;
  data?: any;

  constructor(message: string, statusCode: number, data?: any) {
    super(message);
    this.statusCode = statusCode;
    this.data = data;
    this.name = 'ApiError';
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  // Retrieve token from localStorage in browser environment
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('ruang_temu_token');
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  const url = `${API_BASE}${endpoint}`;
  const method = (options.method || 'GET').toUpperCase();
  let response = await fetch(url, {
    ...options,
    headers,
  });

  let data = await response.json().catch(() => null);

  // Retry once on transient proxy network failure (e.g. ECONNRESET / server restart -> non-JSON 500/502/503/504) for idempotent GET calls
  if (!response.ok && !data && response.status >= 500 && method === 'GET') {
    await new Promise((resolve) => setTimeout(resolve, 200));
    response = await fetch(url, {
      ...options,
      headers,
    });
    data = await response.json().catch(() => null);
  }

  if (!response.ok) {
    const message = data?.message || `Terjadi kesalahan server (${response.status})`;
    if (typeof window !== 'undefined') {
      const isLoginEndpoint = endpoint.startsWith('/auth/login');
      const isAccountDeactivated =
        response.status === 403 &&
        typeof message === 'string' &&
        message.toLowerCase().includes('dinonaktifkan');

      if ((response.status === 401 && !isLoginEndpoint) || isAccountDeactivated) {
        localStorage.removeItem('ruang_temu_token');
        localStorage.removeItem('ruang_temu_user');
        window.dispatchEvent(
          new CustomEvent('ruang-temu:auth-revoked', {
            detail: { status: response.status, message },
          })
        );
      }
    }
    throw new ApiError(message, response.status, data);
  }

  return data;
}

export const api = {
  // Auth
  auth: {
    login: (username: string, password: string) =>
      request<{ success: boolean; data: { token: string; user: any }; message: string }>(
        '/auth/login',
        {
          method: 'POST',
          body: JSON.stringify({ username, password }),
        }
      ),
    verifyPin: (pin: string) =>
      request<{ success: boolean; data: { authorizedId: string; authorizedName: string }; message: string }>(
        '/auth/verify-pin',
        {
          method: 'POST',
          body: JSON.stringify({ pin }),
        }
      ),
  },

  // Products
  products: {
    getAll: () => request<{ success: boolean; data: any[] }>('/products'),
    toggleSoldOut: (id: string, isForceSoldOut: boolean) =>
      request<{ success: boolean; data: any; message: string }>(`/products/${id}/toggle-soldout`, {
        method: 'PATCH',
        body: JSON.stringify({ isForceSoldOut }),
      }),
    uploadImage: (image: string, filename?: string) =>
      request<{ success: boolean; data: { url: string; filename: string; size: number }; message: string }>('/products/upload-image', {
        method: 'POST',
        body: JSON.stringify({ image, filename }),
      }),
    create: (payload: { sku: string; name: string; category: string; price: number; print_target?: string; is_favorite?: boolean; image_url?: string | null }) =>
      request<{ success: boolean; data: any; message: string }>('/products', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    update: (id: string, payload: any) =>
      request<{ success: boolean; data: any; message: string }>(`/products/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
    delete: (id: string) =>
      request<{ success: boolean; data: any; message: string }>(`/products/${id}`, {
        method: 'DELETE',
      }),
    getRecipes: (id: string) =>
      request<{ success: boolean; data: { recipes: any[]; totalHpp: number } }>(`/products/${id}/recipes`),
    updateRecipes: (id: string, recipes: Array<{ ingredient_id: string; quantity: number; is_packaging_only?: boolean }>) =>
      request<{ success: boolean; message: string }>(`/products/${id}/recipes`, {
        method: 'PUT',
        body: JSON.stringify({ recipes }),
      }),
  },

  // Inventory
  inventory: {
    getAll: () => request<{ success: boolean; data: any[] }>('/inventory'),
    create: (payload: any) =>
      request<{ success: boolean; data: any; message: string }>('/inventory', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    update: (id: string, payload: any) =>
      request<{ success: boolean; data: any; message: string }>(`/inventory/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
    delete: (id: string) =>
      request<{ success: boolean; data?: any; message: string }>(`/inventory/${id}`, {
        method: 'DELETE',
      }),
    recordWastage: (payload: { ingredientId: string; quantity: number; reason: string }) =>
      request<{ success: boolean; data: any; message: string }>('/inventory/wastage', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    submitStocktake: (items: Array<{ ingredientId: string; actualCount: number; systemCountSnapshot?: number; notes?: string }>) =>
      request<{ success: boolean; data: any; message: string }>('/inventory/stocktake', {
        method: 'POST',
        body: JSON.stringify({ items }),
      }),
  },

  // Purchasing & Suppliers
  purchasing: {
    getSuppliers: () => request<{ success: boolean; data: any[] }>('/purchasing/suppliers'),
    createSupplier: (payload: { name: string; phone: string; email?: string; address?: string; payment_terms?: string }) =>
      request<{ success: boolean; data: any; message: string }>('/purchasing/suppliers', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    updateSupplier: (id: string, payload: { name: string; phone: string; email?: string; address?: string; payment_terms?: string }) =>
      request<{ success: boolean; data: any; message: string }>(`/purchasing/suppliers/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
    deleteSupplier: (id: string) =>
      request<{ success: boolean; data?: any; message: string }>(`/purchasing/suppliers/${id}`, {
        method: 'DELETE',
      }),
    getOrders: (status?: string) =>
      request<{ success: boolean; data: any[] }>(`/purchasing/orders${status ? `?status=${status}` : ''}`),
    getOrderById: (id: string) =>
      request<{ success: boolean; data: any }>(`/purchasing/orders/${id}`),
    createOrder: (payload: { supplierId: string; notes?: string; items: Array<{ ingredientId: string; quantity: number; unitCost: number }> }) =>
      request<{ success: boolean; data: any; message: string }>('/purchasing/orders', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    receiveOrder: (id: string) =>
      request<{ success: boolean; data: any; message: string }>(`/purchasing/orders/${id}/receive`, {
        method: 'POST',
      }),
    payOrder: (id: string, payload?: { paymentMethod?: string; notes?: string; deductFromActiveShift?: boolean }) =>
      request<{ success: boolean; data: any; message: string }>(`/purchasing/orders/${id}/pay`, {
        method: 'POST',
        body: JSON.stringify(payload || {}),
      }),
    cancelOrder: (id: string) =>
      request<{ success: boolean; data?: any; message: string }>(`/purchasing/orders/${id}/cancel`, {
        method: 'POST',
      }),
  },

  // Shifts
  shifts: {
    getCurrent: () =>
      request<{ success: boolean; data: { shift: any; summary: { openingCash: number; orderCount: number } } | null }>(
        '/shifts/current'
      ),
    open: (openingCash: number) =>
      request<{ success: boolean; data: any; message: string }>('/shifts/open', {
        method: 'POST',
        body: JSON.stringify({ openingCash }),
      }),
    close: (payload: { shiftId: string; blindCountedCash: number; notes?: string; managerPin?: string }) =>
      request<{
        success: boolean;
        message: string;
        data?: {
          shift: any;
          reconciliation: {
            openingCash: number;
            cashSales: number;
            cashIn: number;
            cashOut: number;
            systemExpected: number;
            blindCountedCash: number;
            difference: number;
            status: string;
          };
        };
        requiresManagerPin?: boolean;
      }>('/shifts/close', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    uploadReceipt: (payload: { image: string; filename?: string }) =>
      request<{ success: boolean; data: { url: string; filename: string; size: number }; message: string }>('/shifts/upload-receipt', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    recordMovement: (payload: {
      shiftId: string;
      type: 'CASH_IN' | 'CASH_OUT';
      category: string;
      description?: string;
      amount: number;
      receipt_url?: string | null;
    }) =>
      request<{ success: boolean; data: any; message: string }>('/shifts/cash-movements', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    getMovements: (shiftId: string) =>
      request<{ success: boolean; data: any[] }>(`/shifts/cash-movements?shiftId=${shiftId}`),
    getHistory: (params?: { limit?: number; from?: string; to?: string } | number) => {
      if (typeof params === 'number') {
        return request<{ success: boolean; data: any[] }>(`/shifts/history?limit=${params}`);
      }
      const q = new URLSearchParams();
      if (params?.limit) q.append('limit', params.limit.toString());
      if (params?.from) q.append('from', params.from);
      if (params?.to) q.append('to', params.to);
      const queryStr = q.toString() ? `?${q.toString()}` : '';
      return request<{ success: boolean; data: any[] }>(`/shifts/history${queryStr}`);
    },
    forceClose: (shiftId: string, payload?: { actualCash?: number; notes?: string }) =>
      request<{ success: boolean; data: any; message: string }>(`/shifts/${shiftId}/force-close`, {
        method: 'POST',
        body: JSON.stringify(payload || {}),
      }),
  },

  // Promos
  promos: {
    getAll: () => request<{ success: boolean; data: any[] }>('/promos'),
    getAdminList: () => request<{ success: boolean; data: any[] }>('/promos/admin'),
    validate: (code: string, subtotal: number) =>
      request<{ success: boolean; data: { id: string; code: string; name: string; discountAmount: number }; message: string }>(
        '/promos/validate',
        {
          method: 'POST',
          body: JSON.stringify({ code, subtotal }),
        }
      ),
    create: (payload: any) =>
      request<{ success: boolean; data: any; message: string }>('/promos', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    update: (id: string, payload: any) =>
      request<{ success: boolean; data: any; message: string }>(`/promos/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
    toggle: (id: string, is_active: boolean) =>
      request<{ success: boolean; data: any; message: string }>(`/promos/${id}/toggle`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active }),
      }),
    delete: (id: string, force = false) =>
      request<{ success: boolean; message: string; canForce?: boolean }>(`/promos/${id}${force ? '?force=true' : ''}`, {
        method: 'DELETE',
      }),
  },

  // Store Settings
  settings: {
    get: () => request<{ success: boolean; data: any }>('/settings'),
    update: (payload: any) =>
      request<{ success: boolean; data: any; message: string }>('/settings', {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
  },

  // Audit Logs
  audit: {
    getLogs: (params?: { action?: string; limit?: number }) => {
      const q = new URLSearchParams();
      if (params?.action) q.append('action', params.action);
      if (params?.limit) q.append('limit', params.limit.toString());
      const queryStr = q.toString() ? `?${q.toString()}` : '';
      return request<{ success: boolean; data: any[] }>(`/audit-logs${queryStr}`);
    },
  },

  // Users & Staff
  users: {
    getAll: () => request<{ success: boolean; data: any[] }>('/auth/users'),
    create: (payload: { name: string; username: string; password: string; role: string; pin_code?: string }) =>
      request<{ success: boolean; data: any; message: string }>('/auth/users', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    update: (id: string, payload: { name?: string; username?: string; role?: string; pin_code?: string | null; password?: string }) =>
      request<{ success: boolean; data: any; message: string }>(`/auth/users/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    toggleActive: (id: string, is_active: boolean) =>
      request<{ success: boolean; data: any; message: string }>(`/auth/users/${id}/toggle-active`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active }),
      }),
  },

  // Tables
  tables: {
    getAll: () => request<{ success: boolean; data: any[] }>('/tables'),
    clear: (id: string) =>
      request<{ success: boolean; data: any; message: string }>(`/tables/${id}/clear`, {
        method: 'POST',
      }),
    updateStatus: (id: string, status: string) =>
      request<{ success: boolean; data: any; message: string }>(`/tables/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
  },

  // Customers
  customers: {
    search: (query = '') =>
      request<{ success: boolean; data: any[] }>(`/customers${query ? `?search=${encodeURIComponent(query)}` : ''}`),
    getAll: (params?: { search?: string; tier?: string; sortBy?: string; limit?: number; offset?: number }) => {
      const q = new URLSearchParams();
      if (params?.search) q.append('search', params.search);
      if (params?.tier && params.tier !== 'ALL') q.append('tier', params.tier);
      if (params?.sortBy) q.append('sortBy', params.sortBy);
      if (params?.limit) q.append('limit', String(params.limit));
      if (params?.offset) q.append('offset', String(params.offset));
      const qs = q.toString();
      return request<{ success: boolean; data: any[]; meta?: any }>(`/customers${qs ? `?${qs}` : ''}`);
    },
    getStats: () =>
      request<{ success: boolean; data: any }>('/customers/stats'),
    getById: (id: string) =>
      request<{ success: boolean; data: any }>(`/customers/${id}`),
    create: (payload: { name: string; phoneNumber: string; tier?: string; loyaltyPoints?: number }) =>
      request<{ success: boolean; data: any; message: string }>('/customers', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    update: (id: string, payload: { name: string; phoneNumber: string; tier?: string; loyaltyPoints?: number }) =>
      request<{ success: boolean; data: any; message: string }>(`/customers/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
    delete: (id: string) =>
      request<{ success: boolean; message: string; data?: any }>(`/customers/${id}`, {
        method: 'DELETE',
      }),
  },

  // Reservations
  reservations: {
    getAll: () => request<{ success: boolean; data: any[] }>('/reservations'),
    create: (payload: {
      customerName: string;
      phoneNumber: string;
      tableId: string;
      reservationTime: string;
      guestCount?: number;
      downPaymentAmount?: number;
    }) =>
      request<{ success: boolean; data: any; message?: string }>('/reservations', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    cancel: (id: string, payload?: { reason?: string; refundDp?: boolean }) =>
      request<{ success: boolean; data: any; message?: string }>(`/reservations/${id}/cancel`, {
        method: 'PATCH',
        body: JSON.stringify(payload || {}),
      }),
  },

  // Reports & Analytics
  reports: {
    getMenuMatrix: (params?: { from?: string; to?: string; date?: string }) => {
      let q = '';
      if (params) {
        const urlParams = new URLSearchParams();
        if (params.from) urlParams.append('from', params.from);
        if (params.to) urlParams.append('to', params.to);
        if (params.date) urlParams.append('date', params.date);
        q = urlParams.toString() ? `?${urlParams.toString()}` : '';
      }
      return request<{ success: boolean; data: any }>(`/reports/menu-matrix${q}`);
    },
    getDailySummary: (dateOrParams?: string | { date?: string; from?: string; to?: string }) => {
      let q = '';
      if (typeof dateOrParams === 'string') {
        q = dateOrParams ? `?date=${encodeURIComponent(dateOrParams)}` : '';
      } else if (dateOrParams) {
        const params = new URLSearchParams();
        if (dateOrParams.date) params.append('date', dateOrParams.date);
        if (dateOrParams.from) params.append('from', dateOrParams.from);
        if (dateOrParams.to) params.append('to', dateOrParams.to);
        q = params.toString() ? `?${params.toString()}` : '';
      }
      return request<{ success: boolean; data: any }>(`/reports/daily-summary${q}`);
    },
    getHourlyHeatmap: (dateOrParams?: string | { date?: string; from?: string; to?: string }) => {
      let q = '';
      if (typeof dateOrParams === 'string') {
        q = dateOrParams ? `?date=${encodeURIComponent(dateOrParams)}` : '';
      } else if (dateOrParams) {
        const params = new URLSearchParams();
        if (dateOrParams.date) params.append('date', dateOrParams.date);
        if (dateOrParams.from) params.append('from', dateOrParams.from);
        if (dateOrParams.to) params.append('to', dateOrParams.to);
        q = params.toString() ? `?${params.toString()}` : '';
      }
      return request<{ success: boolean; data: any }>(`/reports/hourly-heatmap${q}`);
    },
  },

  // Orders
  orders: {
    checkoutDirect: (payload: any) =>
      request<{ success: boolean; data: any; message: string }>('/orders/checkout-direct', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    getOrders: (params?: { date?: string; from?: string; to?: string; status?: string; limit?: number; offset?: number }) => {
      const q = new URLSearchParams();
      if (params?.date) q.append('date', params.date);
      if (params?.from) q.append('from', params.from);
      if (params?.to) q.append('to', params.to);
      if (params?.status) q.append('status', params.status);
      if (params?.limit !== undefined) q.append('limit', params.limit.toString());
      if (params?.offset !== undefined) q.append('offset', params.offset.toString());
      const queryStr = q.toString() ? `?${q.toString()}` : '';
      return request<{
        success: boolean;
        data: any[];
        meta?: {
          total: number;
          limit: number;
          offset: number;
          summary?: {
            paidCount: number;
            voidCount: number;
            totalRevenue: number;
            totalVoidAmount: number;
            dineInCount: number;
            takeawayCount: number;
            aov: number;
          };
        };
      }>(`/orders${queryStr}`);
    },
    voidOrder: (id: string, payload: { managerPin: string; reason: string; restock?: boolean }) =>
      request<{ success: boolean; data: any; message: string }>(`/orders/${id}/void`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
  },

  // Printing
  print: {
    getQueue: () => request<{ success: boolean; data: any[] }>('/print/queue'),
    retry: (id: string) =>
      request<{ success: boolean; message: string }>(`/print/retry/${id}`, {
        method: 'POST',
      }),
    fallback: (id: string) =>
      request<{ success: boolean; data: any; message: string }>(`/print/fallback/${id}`, {
        method: 'POST',
      }),
  },
};
