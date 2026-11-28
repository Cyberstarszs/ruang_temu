'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { CashierShift, ShiftSummary } from '@/types';
import { api } from '@/lib/api';
import { useAuth } from './AuthContext';

interface ShiftContextType {
  shift: CashierShift | null;
  summary: ShiftSummary | null;
  hasActiveShift: boolean;
  isLoading: boolean;
  refreshShift: () => Promise<void>;
  openShift: (openingCash: number) => Promise<{ success: boolean; message?: string }>;
  closeShift: (payload: {
    blindCountedCash: number;
    notes?: string;
    managerPin?: string;
  }) => Promise<{
    success: boolean;
    message?: string;
    requiresManagerPin?: boolean;
    reconciliation?: any;
  }>;
  recordCashMovement: (payload: {
    type: 'CASH_IN' | 'CASH_OUT';
    category: string;
    description?: string;
    amount: number;
    receipt_url?: string | null;
  }) => Promise<{ success: boolean; message?: string }>;
}

const ShiftContext = createContext<ShiftContextType | undefined>(undefined);

export function ShiftProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const [shift, setShift] = useState<CashierShift | null>(null);
  const [summary, setSummary] = useState<ShiftSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const refreshShift = useCallback(async () => {
    if (!isAuthenticated || user?.role === 'EMPLOYEE') {
      setShift(null);
      setSummary(null);
      return;
    }
    try {
      setIsLoading(true);
      const res = await api.shifts.getCurrent();
      if (res.success && res.data) {
        setShift(res.data.shift);
        setSummary(res.data.summary);
      } else {
        setShift(null);
        setSummary(null);
      }
    } catch (err: any) {
      if (err?.statusCode !== 401 && err?.statusCode !== 403) {
        console.warn('Unable to fetch current shift:', err?.message || err);
      }
      setShift(null);
      setSummary(null);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user?.role]);

  useEffect(() => {
    refreshShift();
  }, [refreshShift, user]);

  const openShift = async (openingCash: number) => {
    try {
      const res = await api.shifts.open(openingCash);
      if (res.success) {
        await refreshShift();
        return { success: true, message: res.message };
      }
      return { success: false, message: res.message || 'Gagal membuka sif.' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Gagal membuka sif kasir.' };
    }
  };

  const closeShift = async (payload: {
    blindCountedCash: number;
    notes?: string;
    managerPin?: string;
  }) => {
    if (!shift) return { success: false, message: 'Tidak ada sif aktif.' };
    try {
      const res = await api.shifts.close({
        shiftId: shift.id,
        ...payload,
      });

      if (res.success && res.data) {
        await refreshShift();
        return {
          success: true,
          message: res.message,
          reconciliation: res.data.reconciliation,
        };
      }
      return {
        success: false,
        message: res.message,
        requiresManagerPin: res.requiresManagerPin,
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.message,
        requiresManagerPin: err.data?.requiresManagerPin,
      };
    }
  };

  const recordCashMovement = async (payload: {
    type: 'CASH_IN' | 'CASH_OUT';
    category: string;
    description?: string;
    amount: number;
    receipt_url?: string | null;
  }) => {
    if (!shift) return { success: false, message: 'Tidak ada sif aktif.' };
    try {
      const res = await api.shifts.recordMovement({
        shiftId: shift.id,
        ...payload,
      });
      if (res.success) {
        await refreshShift();
        return { success: true, message: res.message };
      }
      return { success: false, message: res.message };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  };

  return (
    <ShiftContext.Provider
      value={{
        shift,
        summary,
        hasActiveShift: !!shift && shift.status === 'OPEN',
        isLoading,
        refreshShift,
        openShift,
        closeShift,
        recordCashMovement,
      }}
    >
      {children}
    </ShiftContext.Provider>
  );
}

export function useShift() {
  const context = useContext(ShiftContext);
  if (!context) {
    throw new Error('useShift must be used within a ShiftProvider');
  }
  return context;
}
