'use client';

import React, { useState, useEffect } from 'react';
import { PrintJob } from '@/types';
import { api } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';
import { Icon } from '@/components/common/Icons';

interface PrinterStatusModalProps {
  onClose: () => void;
}

export function PrinterStatusModal({ onClose }: PrinterStatusModalProps) {
  const [queue, setQueue] = useState<PrintJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchQueue = async () => {
    try {
      setLoading(true);
      const res = await api.print.getQueue();
      if (res.success && res.data) {
        setQueue(res.data);
      }
    } catch (err) {
      console.error('Error fetching print queue:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const handleRetry = async (jobId: string) => {
    try {
      setProcessingId(jobId);
      setActionMessage('');
      const res = await api.print.retry(jobId);
      setActionMessage(res.message);
      await fetchQueue();
    } catch (err: any) {
      setActionMessage(err.message || 'Gagal mencoba kirim ulang tiket.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleFallback = async (jobId: string) => {
    try {
      setProcessingId(jobId);
      setActionMessage('');
      const res = await api.print.fallback(jobId);
      setActionMessage('Tiket berhasil dialihkan ke Printer Kasir! Silakan sobek struk checker kasir.');
      await fetchQueue();
    } catch (err: any) {
      setActionMessage(err.message || 'Gagal mengalihkan tiket.');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="bo-modal-layer" onClick={onClose}>
      <div
        className="bo-modal"
        role="dialog"
        aria-modal="true"
        style={{ maxWidth: '640px', width: '92%' }}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="bo-modal-head">
          <h2>Status Printer & Antrean</h2>
          <button onClick={onClose} aria-label="Tutup">
            <Icon name="close" size={18} />
          </button>
        </header>

        <div style={{ flex: '1 1 auto', overflowY: 'auto', padding: '16px 18px' }}>
          {actionMessage && (
            <div
              style={{
                padding: '9px 12px',
                backgroundColor: '#f0fdf4',
                color: '#15803d',
                border: '1px solid #bbf7d0',
                borderRadius: '8px',
                fontSize: '12.5px',
                fontWeight: 600,
                marginBottom: '14px',
              }}
            >
              {actionMessage}
            </div>
          )}

          {/* Station Status Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '18px' }}>
            <div
              style={{
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #d4e0d5',
                backgroundColor: '#f3f6f3',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#2d6a4f' }} />
                <b style={{ fontSize: '13px' }}>Printer Kasir</b>
              </div>
              <small style={{ color: '#555', display: 'block' }}>Koneksi: USB / ESC-POS</small>
              <span style={{ fontSize: '11px', color: '#2d6a4f', fontWeight: 600 }}>STANDBY AKTIF</span>
            </div>

            <div
              style={{
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #d4e0d5',
                backgroundColor: '#f3f6f3',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#2d6a4f' }} />
                <b style={{ fontSize: '13px' }}>Printer Bar</b>
              </div>
              <small style={{ color: '#555', display: 'block' }}>RAW TCP : 9100</small>
              <span style={{ fontSize: '11px', color: '#2d6a4f', fontWeight: 600 }}>PORT AKTIF</span>
            </div>

            <div
              style={{
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #d4e0d5',
                backgroundColor: '#f3f6f3',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#2d6a4f' }} />
                <b style={{ fontSize: '13px' }}>Printer Dapur</b>
              </div>
              <small style={{ color: '#555', display: 'block' }}>RAW TCP : 9100</small>
              <span style={{ fontSize: '11px', color: '#2d6a4f', fontWeight: 600 }}>PORT AKTIF</span>
            </div>
          </div>

          {/* Pending or Failed Queue */}
          <h3 style={{ fontSize: '14px', margin: '0 0 10px', color: '#272727' }}>
            Daftar Antrean Tiket Tertunda / Gagal ({queue.length})
          </h3>

          <div style={{ maxHeight: '240px', overflowY: 'auto' }}>
            {loading ? (
              <p style={{ textAlign: 'center', color: '#888', padding: '20px' }}>Memeriksa antrean cetak...</p>
            ) : queue.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '24px',
                  backgroundColor: '#f9f6ee',
                  borderRadius: '8px',
                  border: '1px dashed #d1d1d1',
                }}
              >
                <Icon name="checkCheck" size={28} className="text-[#2d6a4f] mx-auto mb-1" />
                <b style={{ color: '#2d6a4f', display: 'block' }}>Seluruh Tiket Berhasil Terkirim</b>
                <p style={{ fontSize: '12px', color: '#666', margin: '4px 0 0' }}>
                  Tidak ada tiket checker pesanan yang tertunda di antrean background worker.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {queue.map((job) => (
                  <div
                    key={job.id}
                    style={{
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid #f8b4b4',
                      backgroundColor: '#fdf2f2',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '8px',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <b style={{ fontSize: '13px', color: '#a32424' }}>
                          {job.doc_type} · Order #{job.order_number}
                        </b>
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            padding: '1px 6px',
                            borderRadius: '4px',
                            backgroundColor: '#a32424',
                            color: '#fff',
                          }}
                        >
                          {job.status}
                        </span>
                      </div>
                      <small style={{ color: '#666', display: 'block' }}>
                        Tujuan: {job.target_ip}:{job.target_port} · Retry: {job.retry_count}x
                      </small>
                      {job.error_message && (
                        <small style={{ color: '#a32424', display: 'block', fontStyle: 'italic' }}>
                          Eror: {job.error_message}
                        </small>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        type="button"
                        disabled={processingId === job.id}
                        onClick={() => handleRetry(job.id)}
                        style={{
                          padding: '6px 10px',
                          borderRadius: '6px',
                          border: '1px solid #d1d1d1',
                          backgroundColor: '#fff',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        {processingId === job.id ? 'Mengirim...' : 'Cetak Ulang'}
                      </button>
                      <button
                        type="button"
                        disabled={processingId === job.id}
                        onClick={() => handleFallback(job.id)}
                        className="bo-primary"
                        style={{ padding: '6px 10px', fontSize: '12px' }}
                      >
                        Alihkan ke Kasir
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <footer className="modal-actions" style={{ padding: '14px 20px', borderTop: '1px solid #eee' }}>
          <button type="button" onClick={fetchQueue}>
            <Icon name="rotateCcw" size={16} />
            Perbarui Status
          </button>
          <button type="button" className="bo-primary" onClick={onClose}>
            Tutup
          </button>
        </footer>
      </div>
    </div>
  );
}
