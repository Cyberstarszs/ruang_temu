'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { AuditLog } from '@/types';
import {
  ShieldAlert,
  Search,
  RotateCcw,
  Clock,
  User,
  Database,
  FileCode,
  X,
} from 'lucide-react';

export function AdminAuditView() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Floating Popover for '...' details
  const [auditPopover, setAuditPopover] = useState<{
    title: string;
    details: Array<{ label: string; value: string }>;
    rect: { top: number; left: number };
  } | null>(null);

  const openAuditPopover = (e: React.MouseEvent, title: string, details: Array<{ label: string; value: string }>) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setAuditPopover({
      title,
      details,
      rect: { top: rect.bottom, left: rect.left },
    });
  };

  const loadLogs = async () => {
    setIsLoading(true);
    try {
      const res = await api.audit.getLogs({ limit: 100 });
      if (res.success && res.data) {
        setLogs(res.data);
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const filteredLogs = logs.filter((l) => {
    const q = searchQuery.toLowerCase();
    return (
      l.action.toLowerCase().includes(q) ||
      (l.actor_name && l.actor_name.toLowerCase().includes(q)) ||
      l.target_table.toLowerCase().includes(q)
    );
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Minimal Action & Filter Bar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          background: '#ffffff',
          padding: '12px 18px',
          borderRadius: '12px',
          border: '1px solid #e7e8e3',
        }}
      >
        <span style={{ fontSize: '13px', fontWeight: 600, color: '#71717a' }}>
          Rekam Jejak Log ({logs.length})
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: '#f7f7f5',
              padding: '5px 12px',
              borderRadius: '8px',
              border: '1px solid #e2e4dc',
              minWidth: '220px',
            }}
          >
            <Search size={14} color="#64746b" />
            <input
              type="text"
              placeholder="Cari aksi, staf, tabel..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: '12.5px',
                color: '#1c2826',
                width: '100%',
                fontFamily: 'inherit',
              }}
            />
          </div>

          <button
            onClick={loadLogs}
            disabled={isLoading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              background: '#57695b',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '12.5px',
              cursor: 'pointer',
            }}
          >
            <RotateCcw size={13} className={isLoading ? 'animate-spin' : ''} />
            Segarkan
          </button>
        </div>
      </div>

      {/* Audit Log Table */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e7e8e3',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          overflow: 'hidden',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px', whiteSpace: 'nowrap' }}>
            <thead>
              <tr style={{ background: '#fbfbf9', borderBottom: '1px solid #e7e8e3', color: '#64746b', height: '42px' }}>
                <th style={{ padding: '0 14px', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Waktu Kejadian</th>
                <th style={{ padding: '0 12px', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Pelaku Aksi</th>
                <th style={{ padding: '0 12px', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Peran</th>
                <th style={{ padding: '0 12px', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Aksi (Action)</th>
                <th style={{ padding: '0 12px', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Target Entitas</th>
                <th style={{ padding: '0 14px', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'right' }}>Rincian</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} style={{ padding: '30px', textAlign: 'center', color: '#64746b' }}>
                    Memuat catatan audit...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '30px', textAlign: 'center', color: '#8b968f', fontStyle: 'italic' }}>
                    Tidak ada catatan audit yang cocok.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const dateStr = new Date(log.created_at).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                  });
                  const timeStr = new Date(log.created_at).toLocaleTimeString('id-ID', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  });

                  return (
                    <tr key={log.id} style={{ borderBottom: '1px solid #f0f0eb', height: '42px', whiteSpace: 'nowrap' }}>
                      {/* 1. Waktu Kejadian */}
                      <td style={{ padding: '0 14px', verticalAlign: 'middle', color: '#4b5563', fontSize: '11.5px' }}>
                        <span style={{ fontWeight: 600, color: '#1c2826' }}>{dateStr}</span>, {timeStr}
                      </td>

                      {/* 2. Pelaku Aksi */}
                      <td style={{ padding: '0 12px', verticalAlign: 'middle', fontWeight: 700, color: '#1c2826', fontSize: '12px' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {log.actor_name || 'System / Manager'}
                          </span>
                          {(log.actor_name || 'System').length > 18 && (
                            <button
                              onClick={(e) =>
                                openAuditPopover(e, `Pelaku: ${log.actor_name || 'System'}`, [
                                  { label: 'Nama Staf', value: log.actor_name || 'System / Manager' },
                                  { label: 'Role / Jabatan', value: log.actor_role || 'ADMIN' },
                                  { label: 'Aksi Dilakukan', value: log.action },
                                  { label: 'Waktu Audit', value: new Date(log.created_at).toLocaleString('id-ID') },
                                ])
                              }
                              style={{
                                border: '1px solid #dcdfd5',
                                background: '#f5f6f2',
                                color: '#57695b',
                                borderRadius: '4px',
                                padding: '1px 5px',
                                fontSize: '10px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                lineHeight: '13px',
                                height: '17px',
                              }}
                            >
                              ...
                            </button>
                          )}
                        </div>
                      </td>

                      {/* 3. Peran */}
                      <td style={{ padding: '0 12px', verticalAlign: 'middle' }}>
                        <span
                          style={{
                            padding: '2px 7px',
                            borderRadius: '5px',
                            background: log.actor_role === 'OWNER' ? '#fef3c7' : '#e0f2fe',
                            color: log.actor_role === 'OWNER' ? '#92400e' : '#0369a1',
                            fontWeight: 700,
                            fontSize: '10.5px',
                          }}
                        >
                          {log.actor_role || 'ADMIN'}
                        </span>
                      </td>

                      {/* 4. Nama Aksi */}
                      <td style={{ padding: '0 12px', verticalAlign: 'middle' }}>
                        <span
                          style={{
                            padding: '2px 7px',
                            borderRadius: '5px',
                            background: '#f2f4ef',
                            color: '#344738',
                            fontWeight: 700,
                            fontSize: '11px',
                            fontFamily: 'monospace',
                            border: '1px solid #dce2da',
                          }}
                        >
                          {log.action}
                        </span>
                      </td>

                      {/* 5. Target Entitas */}
                      <td style={{ padding: '0 12px', verticalAlign: 'middle', color: '#4b5563', fontSize: '11.5px' }}>
                        <code style={{ background: '#f5f5f5', padding: '1px 5px', borderRadius: '4px', color: '#1c2826' }}>
                          {log.target_table}
                        </code>{' '}
                        #{log.target_id ? log.target_id.slice(0, 8) : '-'}
                      </td>

                      {/* 6. Rincian */}
                      <td style={{ padding: '0 14px', verticalAlign: 'middle', textAlign: 'right' }}>
                        <button
                          onClick={() => setSelectedLog(log)}
                          style={{
                            padding: '3px 8px',
                            background: '#f2f4ef',
                            color: '#57695b',
                            border: '1px solid #dcdfd5',
                            borderRadius: '5px',
                            fontWeight: 600,
                            fontSize: '11px',
                            cursor: 'pointer',
                          }}
                        >
                          Lihat JSON
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* JSON DETAILS MODAL */}
      {selectedLog && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              maxWidth: '600px',
              width: '100%',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '18px 24px',
                borderBottom: '1px solid #e7e8e3',
              }}
            >
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#1c2826', margin: 0 }}>
                  Audit Details: {selectedLog.action}
                </h3>
                <div style={{ fontSize: '12px', color: '#64746b', marginTop: '2px' }}>
                  {new Date(selectedLog.created_at).toLocaleString('id-ID')} by {selectedLog.actor_name || 'System'}
                </div>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                style={{
                  background: '#f7f7f5',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '6px',
                  cursor: 'pointer',
                  color: '#64746b',
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '24px' }}>
              <pre
                style={{
                  background: '#1c2826',
                  color: '#86efac',
                  padding: '16px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  overflowX: 'auto',
                  maxHeight: '350px',
                  fontFamily: 'monospace',
                }}
              >
                {JSON.stringify(selectedLog.details, null, 2)}
              </pre>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                padding: '16px 24px',
                borderTop: '1px solid #e7e8e3',
                background: '#fbfbf9',
              }}
            >
              <button
                onClick={() => setSelectedLog(null)}
                style={{
                  padding: '9px 18px',
                  background: '#57695b',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING POPOVER FOR SINGLE LINE BREAKDOWN */}
      {auditPopover && (
        <div
          onClick={() => setAuditPopover(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            background: 'transparent',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              top: Math.min(auditPopover.rect.top + 6, window.innerHeight - 240),
              left: Math.max(10, Math.min(auditPopover.rect.left, window.innerWidth - 320)),
              width: '300px',
              background: '#ffffff',
              borderRadius: '12px',
              boxShadow: '0 12px 32px rgba(0,0,0,0.18)',
              border: '1px solid #e2e4dc',
              padding: '14px 16px',
              animation: 'fadeIn 0.15s ease-out',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#1c2826' }}>{auditPopover.title}</span>
              <button
                onClick={() => setAuditPopover(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#9ca3af',
                  cursor: 'pointer',
                  padding: '2px',
                  display: 'flex',
                }}
              >
                <X size={14} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {auditPopover.details.map((d, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', gap: '8px' }}>
                  <span style={{ color: '#64746b', flexShrink: 0 }}>{d.label}</span>
                  <span style={{ color: '#1c2826', fontWeight: 600, textAlign: 'right', wordBreak: 'break-word' }}>
                    {d.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
