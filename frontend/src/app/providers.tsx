'use client';

import React from 'react';
import { AuthProvider } from '@/context/AuthContext';
import { SocketProvider } from '@/context/SocketContext';
import { OfflineSyncProvider } from '@/context/OfflineSyncContext';
import { ShiftProvider } from '@/context/ShiftContext';
import { CartProvider } from '@/context/CartContext';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <SocketProvider>
        <OfflineSyncProvider>
          <ShiftProvider>
            <CartProvider>
              {children}
            </CartProvider>
          </ShiftProvider>
        </OfflineSyncProvider>
      </SocketProvider>
    </AuthProvider>
  );
}
