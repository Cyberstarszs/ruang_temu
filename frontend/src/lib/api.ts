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
  const response = await fetch(url, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = data?.message || `Terjadi kesalahan server (${response.status})`;
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
    recordWastage: (payload: { ingredientId: string; quantity: number; reason: string }) =>
      request<{ success: boolean; data: any; message: string }>('/inventory/wastage', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    submitStocktake: (items: Array<{ ingredientId: string; actualCount: number; notes?: string }>) =>
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
    recordMovement: (payload: {
      shiftId: string;
      type: 'CASH_IN' | 'CASH_OUT';
      category: string;
      description?: string;
      amount: number;
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
    toggle: (id: string, is_active: boolean) =>
      request<{ success: boolean; data: any; message: string }>(`/promos/${id}/toggle`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active }),
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
    create: (payload: { name: string; phoneNumber: string }) =>
      request<{ success: boolean; data: any; message: string }>('/customers', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
  },

  // Reservations
  reservations: {
    getAll: () => request<{ success: boolean; data: any[] }>('/reservations'),
  },

  // Reports & Analytics
  reports: {
    getMenuMatrix: () =>
      request<{ success: boolean; data: any }>('/reports/menu-matrix'),
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
    getOrders: (params?: { date?: string; from?: string; to?: string; status?: string; limit?: number }) => {
      const q = new URLSearchParams();
      if (params?.date) q.append('date', params.date);
      if (params?.from) q.append('from', params.from);
      if (params?.to) q.append('to', params.to);
      if (params?.status) q.append('status', params.status);
      if (params?.limit) q.append('limit', params.limit.toString());
      const queryStr = q.toString() ? `?${q.toString()}` : '';
      return request<{ success: boolean; data: any[] }>(`/orders${queryStr}`);
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
