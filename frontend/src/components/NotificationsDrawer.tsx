import React, { useState, useEffect } from 'react';
import { Bell, X, AlertTriangle, CalendarCheck, CheckCircle2, Clock } from 'lucide-react';
import { formatTime, formatDate } from '../utils/formatters';
import { notificationApi } from '../api/client';
import type { NotificationItem } from '../types';

interface NotificationsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onUnreadCountChange?: (count: number) => void;
}

export const NotificationsDrawer: React.FC<NotificationsDrawerProps> = ({
  isOpen,
  onClose,
  onUnreadCountChange,
}) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const res = await notificationApi.getAll();
      if (res.success && res.data) {
        setNotifications(res.data);
        if (onUnreadCountChange) {
          onUnreadCountChange(res.data.filter((n) => !n.is_read).length);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 15000);
    return () => clearInterval(interval);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-[#181920] border-l border-[#2c2f3b] h-full flex flex-col text-white shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-4 border-b border-[#262832] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bell size={18} className="text-[#c59a68]" />
            <h3 className="font-bold text-sm">Notifikasi & Peringatan Kafe</h3>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white p-1 rounded-lg">
            <X size={18} />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {notifications.map((n) => {
            const isStock = n.type.toLowerCase().includes('stock');
            const isResv = n.type.toLowerCase().includes('reservation');
            return (
              <div
                key={n.id}
                className="bg-[#131418] border border-[#252834] rounded-xl p-3 space-y-1 hover:border-[#383c4e] transition"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 font-bold text-xs text-zinc-200">
                    {isStock ? (
                      <AlertTriangle size={13} className="text-rose-400" />
                    ) : isResv ? (
                      <CalendarCheck size={13} className="text-blue-400" />
                    ) : (
                      <Clock size={13} className="text-[#c59a68]" />
                    )}
                    <span>{n.title}</span>
                  </div>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    {formatTime(n.created_at)}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">{n.message}</p>
              </div>
            );
          })}

          {notifications.length === 0 && (
            <div className="text-center py-16 text-zinc-500">
              <CheckCircle2 size={36} className="mx-auto mb-2 text-zinc-600" />
              <p className="text-xs">Tidak ada notifikasi baru.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
