'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import {
  getPendingOfflineCount,
  syncAllOfflineOrders,
} from '@/lib/offlineQueue';
import { api } from '@/lib/api';

interface OfflineSyncContextType {
  isOnline: boolean;
  pendingOfflineCount: number;
  isSyncing: boolean;
  lastSyncTime: Date | null;
  triggerSync: () => Promise<{ syncedCount: number; failedCount: number }>;
  refreshPendingCount: () => Promise<number>;
}

const OfflineSyncContext = createContext<OfflineSyncContextType | undefined>(undefined);

export function OfflineSyncProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [pendingOfflineCount, setPendingOfflineCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const isSyncingRef = useRef<boolean>(false);

  const refreshPendingCount = useCallback(async (): Promise<number> => {
    try {
      const count = await getPendingOfflineCount();
      setPendingOfflineCount(count);
      return count;
    } catch {
      return 0;
    }
  }, []);

  const triggerSync = useCallback(async (): Promise<{ syncedCount: number; failedCount: number }> => {
    if (isSyncingRef.current) {
      return { syncedCount: 0, failedCount: 0 };
    }

    try {
      isSyncingRef.current = true;
      setIsSyncing(true);

      const result = await syncAllOfflineOrders(async (payload) => {
        return await api.orders.checkoutDirect(payload);
      });

      await refreshPendingCount();
      setLastSyncTime(new Date());

      return {
        syncedCount: result.syncedCount,
        failedCount: result.failedCount,
      };
    } catch (err) {
      console.error('[OfflineSync] Gagal menjalankan sinkronisasi:', err);
      return { syncedCount: 0, failedCount: 0 };
    } finally {
      isSyncingRef.current = false;
      setIsSyncing(false);
    }
  }, [refreshPendingCount]);

  // Initial check & Listeners
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Register Service Worker for offline PWA app-shell caching
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('[OfflineSync] Service Worker aktif:', reg.scope);
        })
        .catch((err) => {
          console.warn('[OfflineSync] Gagal mendaftarkan Service Worker:', err);
        });
    }

    setIsOnline(navigator.onLine);
    refreshPendingCount();

    const handleOnline = () => {
      setIsOnline(true);
      // Auto background-sync when connection is restored!
      setTimeout(() => {
        triggerSync();
      }, 1000);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Heartbeat ping every 20 seconds to confirm actual connectivity to local backend
    const interval = setInterval(async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);
        const res = await fetch('http://localhost:5000/health', {
          method: 'GET',
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          if (!isOnline) {
            setIsOnline(true);
            triggerSync();
          }
        } else {
          setIsOnline(false);
        }
      } catch {
        // Network timeout / connection refused
        setIsOnline(false);
      }

      // Selalu perbarui hitungan antrean
      refreshPendingCount();
    }, 20000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [triggerSync, refreshPendingCount, isOnline]);

  return (
    <OfflineSyncContext.Provider
      value={{
        isOnline,
        pendingOfflineCount,
        isSyncing,
        lastSyncTime,
        triggerSync,
        refreshPendingCount,
      }}
    >
      {children}
    </OfflineSyncContext.Provider>
  );
}

export function useOfflineSync() {
  const context = useContext(OfflineSyncContext);
  if (!context) {
    throw new Error('useOfflineSync must be used within an OfflineSyncProvider');
  }
  return context;
}
