/**
 * Ruang Temu POS — IndexedDB Offline Queue & Cache Engine
 * Menyediakan kapabilitas offline-first untuk operasional kasir kafe:
 * 1. Menyimpan transaksi ke IndexedDB saat jaringan lokal / router Wi-Fi terputus.
 * 2. Meng-cache katalog produk, kategori, dan preferensi agar UI tetap dapat dimuat saat offline.
 * 3. Menyediakan background-sync otomatis saat jaringan internet/lokal terhubung kembali.
 */

export interface OfflineOrderRecord {
  id: string; // e.g. OFFLINE-1795712345678-abcd
  orderNumber: string; // e.g. RT-OFF-123456
  payload: any; // Full directCheckout payload
  receiptData: any; // Pre-calculated receipt data for instant printing
  status: 'PENDING' | 'SYNCING' | 'SYNCED' | 'FAILED';
  createdAt: string;
  syncedAt?: string | null;
  serverOrderId?: string | null;
  errorMessage?: string | null;
  retryCount: number;
}

const DB_NAME = 'ruang_temu_pos_offline';
const DB_VERSION = 1;
const STORE_ORDERS = 'offline_orders';
const STORE_CACHE = 'catalog_cache';

function getDB(): Promise<IDBDatabase | null> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      resolve(null);
      return;
    }

    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(STORE_ORDERS)) {
        const orderStore = db.createObjectStore(STORE_ORDERS, { keyPath: 'id' });
        orderStore.createIndex('status', 'status', { unique: false });
        orderStore.createIndex('createdAt', 'createdAt', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORE_CACHE)) {
        db.createObjectStore(STORE_CACHE, { keyPath: 'key' });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => {
      console.error('[IndexedDB] Gagal membuka database offline:', req.error);
      reject(req.error);
    };
  });
}

/**
 * Menyimpan transaksi offline baru ke antrean IndexedDB
 */
export async function saveOfflineOrder(
  payload: any,
  receiptData: any
): Promise<OfflineOrderRecord> {
  const db = await getDB();
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  const id = `OFFLINE-${timestamp}-${randomSuffix}`;
  const orderNumber = `RT-OFF-${timestamp.toString().slice(-6)}`;

  // Berikan penanda pada catatan pesanan bahwa ini adalah transaksi offline
  const enrichedPayload = {
    ...payload,
    notes: payload.notes
      ? `[OFFLINE SYNC] ${payload.notes}`
      : `[OFFLINE SYNC #${orderNumber}]`,
  };

  const record: OfflineOrderRecord = {
    id,
    orderNumber,
    payload: enrichedPayload,
    receiptData: {
      ...receiptData,
      orderNumber,
      isOffline: true,
      offlineStoredAt: new Date().toISOString(),
    },
    status: 'PENDING',
    createdAt: new Date().toISOString(),
    retryCount: 0,
  };

  if (!db) {
    // Fallback ke localStorage jika IndexedDB diblokir browser
    try {
      const existingStr = localStorage.getItem('ruang_temu_offline_orders_fallback') || '[]';
      const existing: OfflineOrderRecord[] = JSON.parse(existingStr);
      existing.push(record);
      localStorage.setItem('ruang_temu_offline_orders_fallback', JSON.stringify(existing));
    } catch (e) {
      console.error('LocalStorage fallback error:', e);
    }
    return record;
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_ORDERS], 'readwrite');
    const store = tx.objectStore(STORE_ORDERS);
    const req = store.add(record);

    req.onsuccess = () => resolve(record);
    req.onerror = () => {
      console.error('[IndexedDB] Gagal menyimpan pesanan offline:', req.error);
      reject(req.error);
    };
  });
}

/**
 * Mengambil seluruh pesanan offline yang belum berhasil disinkronkan ke server (PENDING atau FAILED)
 */
export async function getPendingOfflineOrders(): Promise<OfflineOrderRecord[]> {
  const db = await getDB();
  if (!db) {
    try {
      const existingStr = localStorage.getItem('ruang_temu_offline_orders_fallback') || '[]';
      const existing: OfflineOrderRecord[] = JSON.parse(existingStr);
      return existing.filter((o) => o.status === 'PENDING' || o.status === 'FAILED');
    } catch {
      return [];
    }
  }

  return new Promise((resolve) => {
    const tx = db.transaction([STORE_ORDERS], 'readonly');
    const store = tx.objectStore(STORE_ORDERS);
    const req = store.getAll();

    req.onsuccess = () => {
      const all: OfflineOrderRecord[] = req.result || [];
      const pending = all.filter(
        (o) => o.status === 'PENDING' || o.status === 'FAILED'
      );
      // Urutkan berdasarkan waktu transaksi (FIFO: First-In First-Out)
      pending.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      resolve(pending);
    };

    req.onerror = () => resolve([]);
  });
}

/**
 * Menghitung total transaksi offline yang belum tersinkronkan
 */
export async function getPendingOfflineCount(): Promise<number> {
  const pending = await getPendingOfflineOrders();
  return pending.length;
}

/**
 * Memperbarui status pesanan offline
 */
export async function updateOfflineOrderStatus(
  id: string,
  status: 'PENDING' | 'SYNCING' | 'SYNCED' | 'FAILED',
  errorMessage?: string | null,
  serverOrderId?: string | null
): Promise<void> {
  const db = await getDB();
  if (!db) return;

  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_ORDERS], 'readwrite');
    const store = tx.objectStore(STORE_ORDERS);
    const getReq = store.get(id);

    getReq.onsuccess = () => {
      const record: OfflineOrderRecord = getReq.result;
      if (!record) {
        resolve();
        return;
      }

      record.status = status;
      record.retryCount = (record.retryCount || 0) + 1;
      if (status === 'SYNCED') {
        record.syncedAt = new Date().toISOString();
        record.serverOrderId = serverOrderId || null;
        record.errorMessage = null;
      }
      if (status === 'FAILED') {
        record.errorMessage = errorMessage || 'Gagal sinkronisasi';
      }

      const putReq = store.put(record);
      putReq.onsuccess = () => resolve();
      putReq.onerror = () => reject(putReq.error);
    };

    getReq.onerror = () => reject(getReq.error);
  });
}

/**
 * Menghapus pesanan offline tertentu setelah terbukti tersinkron
 */
export async function deleteOfflineOrder(id: string): Promise<void> {
  const db = await getDB();
  if (!db) return;

  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_ORDERS], 'readwrite');
    const store = tx.objectStore(STORE_ORDERS);
    const req = store.delete(id);

    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/**
 * Membersihkan seluruh transaksi yang statusnya sudah 'SYNCED' agar IndexedDB tetap ramping
 */
export async function clearSyncedOfflineOrders(): Promise<void> {
  const db = await getDB();
  if (!db) return;

  return new Promise((resolve) => {
    const tx = db.transaction([STORE_ORDERS], 'readwrite');
    const store = tx.objectStore(STORE_ORDERS);
    const req = store.getAll();

    req.onsuccess = () => {
      const all: OfflineOrderRecord[] = req.result || [];
      all.forEach((record) => {
        if (record.status === 'SYNCED') {
          store.delete(record.id);
        }
      });
      resolve();
    };

    req.onerror = () => resolve();
  });
}

/**
 * Meng-cache data katalog / preferensi (produk, kategori, pengaturan toko)
 */
export async function cacheCatalogData(key: string, data: any): Promise<void> {
  const db = await getDB();
  if (!db) {
    try {
      localStorage.setItem(`ruang_temu_cache_${key}`, JSON.stringify(data));
    } catch {}
    return;
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_CACHE], 'readwrite');
    const store = tx.objectStore(STORE_CACHE);
    const req = store.put({ key, data, cachedAt: new Date().toISOString() });

    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/**
 * Mengambil data katalog yang dicache saat offline
 */
export async function getCachedCatalogData<T>(key: string): Promise<T | null> {
  const db = await getDB();
  if (!db) {
    try {
      const str = localStorage.getItem(`ruang_temu_cache_${key}`);
      return str ? JSON.parse(str) : null;
    } catch {
      return null;
    }
  }

  return new Promise((resolve) => {
    const tx = db.transaction([STORE_CACHE], 'readonly');
    const store = tx.objectStore(STORE_CACHE);
    const req = store.get(key);

    req.onsuccess = () => {
      if (req.result && req.result.data) {
        resolve(req.result.data as T);
      } else {
        resolve(null);
      }
    };

    req.onerror = () => resolve(null);
  });
}

/**
 * Melakukan sinkronisasi seluruh pesanan offline ke server backend secara sekuensial
 */
export async function syncAllOfflineOrders(
  checkoutApi: (payload: any) => Promise<any>
): Promise<{ syncedCount: number; failedCount: number; errors: string[] }> {
  const pendingOrders = await getPendingOfflineOrders();
  if (pendingOrders.length === 0) {
    return { syncedCount: 0, failedCount: 0, errors: [] };
  }

  let syncedCount = 0;
  let failedCount = 0;
  const errors: string[] = [];

  for (const order of pendingOrders) {
    try {
      await updateOfflineOrderStatus(order.id, 'SYNCING');
      const res = await checkoutApi(order.payload);

      if (res && (res.success || res.data)) {
        const serverOrderId = res.data?.order?.id || res.data?.id;
        await updateOfflineOrderStatus(order.id, 'SYNCED', null, serverOrderId);
        syncedCount++;
      } else {
        const msg = res?.message || 'Gagal sinkronisasi ke server';
        await updateOfflineOrderStatus(order.id, 'FAILED', msg);
        failedCount++;
        errors.push(`${order.orderNumber}: ${msg}`);
      }
    } catch (err: any) {
      const msg = err.message || 'Koneksi terputus saat mencoba sinkronisasi';
      await updateOfflineOrderStatus(order.id, 'FAILED', msg);
      failedCount++;
      errors.push(`${order.orderNumber}: ${msg}`);
    }
  }

  // Bersihkan transaksi yang telah terbukti berhasil disinkronkan
  if (syncedCount > 0) {
    await clearSyncedOfflineOrders();
  }

  return { syncedCount, failedCount, errors };
}
