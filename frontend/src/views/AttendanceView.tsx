import React, { useState, useEffect } from 'react';
import { UserCheck, Clock, CheckCircle2, ArrowRight, RefreshCw, Calendar } from 'lucide-react';
import { formatTime, formatDate } from '../utils/formatters';
import { attendanceApi } from '../api/client';
import type { AttendanceRecord } from '../types';

interface AttendanceViewProps {
  onNotify: (msg: string) => void;
}

export const AttendanceView: React.FC<AttendanceViewProps> = ({ onNotify }) => {
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [historyList, setHistoryList] = useState<AttendanceRecord[]>([]);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  // Live Clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadAttendance = async () => {
    setLoading(true);
    try {
      const [todayRes, listRes] = await Promise.all([
        attendanceApi.getToday(),
        attendanceApi.getList(),
      ]);
      if (todayRes.success) setTodayRecord(todayRes.data || null);
      if (listRes.success && listRes.data) setHistoryList(listRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAttendance();
  }, []);

  const handleClockIn = async () => {
    try {
      const res = await attendanceApi.clockIn(notes || undefined);
      if (res.success && res.data) {
        onNotify('Absen Masuk (Clock In) berhasil dicatat.');
        setNotes('');
        loadAttendance();
      } else {
        alert(res.message || 'Gagal clock in.');
      }
    } catch (err: any) {
      alert(err.message || 'Terjadi kesalahan sistem.');
    }
  };

  const handleClockOut = async () => {
    try {
      const res = await attendanceApi.clockOut(notes || undefined);
      if (res.success && res.data) {
        onNotify('Absen Keluar (Clock Out) berhasil dicatat. Terima kasih atas kerja keras hari ini!');
        setNotes('');
        loadAttendance();
      } else {
        alert(res.message || 'Gagal clock out.');
      }
    } catch (err: any) {
      alert(err.message || 'Terjadi kesalahan sistem.');
    }
  };

  const isClockedIn = todayRecord?.status === 'CLOCKED_IN';

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-64px)] overflow-y-auto bg-[#121316] text-white p-6">
      <div className="max-w-5xl w-full mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <UserCheck className="text-[#c59a68]" size={24} />
              <span>Presensi & Jam Kerja Karyawan</span>
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Pencatatan waktu kehadiran harian barista, staf dapur, dan kasir
            </p>
          </div>
          <button
            onClick={loadAttendance}
            disabled={loading}
            className="p-2 rounded-xl bg-[#1e2026] hover:bg-[#282b33] border border-[#2e313c] text-zinc-300 transition"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Live Clock & Action Card */}
        <div className="bg-gradient-to-r from-[#181a20] to-[#1e212b] border border-[#282a35] rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <span className="text-[11px] font-mono uppercase tracking-widest text-[#c59a68] font-bold">
              WAKTU SERVER
            </span>
            <div className="text-4xl sm:text-5xl font-black font-mono text-zinc-100 tracking-tight mt-1">
              {currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
            <div className="text-xs text-zinc-400 mt-1 flex items-center gap-1.5 font-medium">
              <Calendar size={13} className="text-[#c59a68]" />
              <span>
                {currentTime.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </div>

            {todayRecord && (
              <div className="mt-4 p-3 bg-black/30 rounded-xl border border-white/5 text-xs space-y-1">
                <div className="text-zinc-400">
                  Status Hari Ini: <span className="font-bold text-emerald-400">{todayRecord.status}</span>
                </div>
                <div className="text-zinc-400">
                  Jam Masuk: <span className="font-mono text-zinc-200">{formatTime(todayRecord.clock_in)}</span>
                </div>
                {todayRecord.clock_out && (
                  <div className="text-zinc-400">
                    Jam Keluar: <span className="font-mono text-zinc-200">{formatTime(todayRecord.clock_out)}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="w-full sm:w-72 space-y-3">
            <input
              type="text"
              placeholder="Catatan presensi (Opsional)..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-[#121316] border border-[#2e313b] rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#c59a68]"
            />

            {!isClockedIn ? (
              <button
                onClick={handleClockIn}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-2xl text-sm transition shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2"
              >
                <CheckCircle2 size={18} />
                <span>Absen Masuk (Clock In)</span>
              </button>
            ) : (
              <button
                onClick={handleClockOut}
                className="w-full py-4 bg-rose-600 hover:bg-rose-500 text-white font-extrabold rounded-2xl text-sm transition shadow-lg shadow-rose-600/20 flex items-center justify-center gap-2"
              >
                <Clock size={18} />
                <span>Absen Pulang (Clock Out)</span>
              </button>
            )}
          </div>
        </div>

        {/* History Table */}
        <div className="bg-[#181a20] border border-[#262832] rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-[#262832] flex items-center justify-between">
            <h3 className="text-sm font-bold text-zinc-200">Riwayat Kehadiran Tim Kafe</h3>
            <span className="text-xs text-zinc-500 font-mono">{historyList.length} Catatan</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#14151a] text-zinc-400 uppercase font-mono tracking-wider border-b border-[#262832]">
                <tr>
                  <th className="py-3 px-4">Nama Staf</th>
                  <th className="py-3 px-4">Tanggal</th>
                  <th className="py-3 px-4">Jam Masuk</th>
                  <th className="py-3 px-4">Jam Pulang</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#242630]">
                {historyList.map((rec) => (
                  <tr key={rec.id} className="hover:bg-[#1f212a] transition">
                    <td className="py-3 px-4 font-bold text-zinc-100">{rec.user_name || 'Staf Kafe'}</td>
                    <td className="py-3 px-4 text-zinc-400 font-mono">{formatDate(rec.clock_in)}</td>
                    <td className="py-3 px-4 font-mono text-emerald-400 font-semibold">
                      {formatTime(rec.clock_in)}
                    </td>
                    <td className="py-3 px-4 font-mono text-zinc-300">
                      {rec.clock_out ? formatTime(rec.clock_out) : '— (Masih Bekerja)'}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          rec.status === 'CLOCKED_IN'
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : 'bg-zinc-700/50 text-zinc-300 border border-zinc-600'
                        }`}
                      >
                        {rec.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {historyList.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-zinc-500">
                      Belum ada riwayat presensi hari ini.
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
