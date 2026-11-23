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
      request<{ success: boolean; data: any; message: string }>('/shifts/movements', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    getMovements: (shiftId: string) =>
      request<{ success: boolean; data: any[] }>(`/shifts/movements?shiftId=${shiftId}`),
  },

  // Products
  products: {
    getAll: () => request<{ success: boolean; data: any[] }>('/products'),
    toggleSoldOut: (id: string, isForceSoldOut: boolean) =>
      request<{ success: boolean; data: any; message: string }>(`/products/${id}/toggle-sold-out`, {
        method: 'POST',
        body: JSON.stringify({ isForceSoldOut }),
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

  // Promos
  promos: {
    getAll: () => request<{ success: boolean; data: any[] }>('/promos'),
    validate: (code: string, subtotal: number) =>
      request<{ success: boolean; data: { id: string; code: string; name: string; discountAmount: number }; message: string }>(
        '/promos/validate',
        {
          method: 'POST',
          body: JSON.stringify({ code, subtotal }),
        }
      ),
  },

  // Reservations
  reservations: {
    getAll: () => request<{ success: boolean; data: any[] }>('/reservations'),
  },

  // Reports & Analytics
  reports: {
    getMenuMatrix: () =>
      request<{ success: boolean; data: any }>('/reports/menu-matrix'),
  },

  // Orders
  orders: {
    checkoutDirect: (payload: any) =>
      request<{ success: boolean; data: any; message: string }>('/orders/checkout-direct', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    getOrders: (params?: { date?: string; status?: string; limit?: number }) => {
      const q = new URLSearchParams();
      if (params?.date) q.append('date', params.date);
      if (params?.status) q.append('status', params.status);
      if (params?.limit) q.append('limit', params.limit.toString());
      const queryStr = q.toString() ? `?${q.toString()}` : '';
      return request<{ success: boolean; data: any[] }>(`/orders${queryStr}`);
    },
    payQr: (id: string, payload: any) =>
      request<{ success: boolean; data: any; message: string }>(`/orders/${id}/cashier-pay`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    voidOrder: (id: string, payload: { managerPin: string; reason: string }) =>
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
