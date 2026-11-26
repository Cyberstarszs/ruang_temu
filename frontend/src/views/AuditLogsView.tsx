import React, { useState, useEffect } from 'react';
import { ShieldAlert, RefreshCw, KeyRound, AlertTriangle, FileText, CheckCircle2 } from 'lucide-react';
import { formatDate, formatTime } from '../utils/formatters';
import { auditApi } from '../api/client';
import type { AuditLog } from '../types';

export const AuditLogsView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const res = await auditApi.getAll(100);
      if (res.success && res.data) {
        setLogs(res.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-64px)] overflow-y-auto bg-[#121316] text-white p-6">
      <div className="max-w-7xl w-full mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <ShieldAlert className="text-[#c59a68]" size={24} />
              <span>Audit Trail & Log Keamanan Sistem</span>
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Rekaman otomatis seluruh aktivitas sensitif: Void transaksi, selisih kas kasir, perubahan stok
            </p>
          </div>
          <button
            onClick={loadLogs}
            disabled={loading}
            className="p-2 rounded-xl bg-[#1e2026] hover:bg-[#282b33] border border-[#2e313c] text-zinc-300 transition"
            title="Segarkan Log"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Audit Log Table */}
        <div className="bg-[#181a20] border border-[#262832] rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#14151a] text-zinc-400 uppercase font-mono tracking-wider border-b border-[#262832]">
                <tr>
                  <th className="py-3 px-4">Waktu Kejadian</th>
                  <th className="py-3 px-4">Aksi / Aktivitas</th>
                  <th className="py-3 px-4">Entitas Terkait</th>
                  <th className="py-3 px-4">Pengguna (Staf)</th>
                  <th className="py-3 px-4">Rincian / Catatan</th>
                  <th className="py-3 px-4">IP Klien</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#242630]">
                {logs.map((log) => {
                  const isVoid = log.action.toLowerCase().includes('void') || log.action.toLowerCase().includes('cancel');
                  const isShift = log.action.toLowerCase().includes('shift');
                  return (
                    <tr key={log.id} className="hover:bg-[#1f212a] transition">
                      <td className="py-3 px-4 font-mono text-zinc-400">
                        {formatDate(log.created_at)} {formatTime(log.created_at)}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-bold ${
                            isVoid
                              ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                              : isShift
                              ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                              : 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                          }`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-zinc-300">{log.entity_type}</td>
                      <td className="py-3 px-4 font-semibold text-zinc-200">{log.user_name || 'Sistem'}</td>
                      <td className="py-3 px-4 text-zinc-400 max-w-xs truncate">
                        {typeof log.details === 'object' ? JSON.stringify(log.details) : String(log.details || '—')}
                      </td>
                      <td className="py-3 px-4 font-mono text-zinc-500 text-[11px]">{log.ip_address || '127.0.0.1'}</td>
                    </tr>
                  );
                })}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-zinc-500">
                      Belum ada catatan aktivitas keamanan.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
