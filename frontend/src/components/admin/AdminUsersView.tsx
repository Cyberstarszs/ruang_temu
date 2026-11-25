'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { api } from '@/lib/api';
import { StaffUser, UserRole } from '@/types';
import { useAuth } from '@/context/AuthContext';
import {
  Users,
  Plus,
  Shield,
  UserCheck,
  UserX,
  Lock,
  RotateCcw,
  X,
  Search,
  Pencil,
  Key,
  Check,
} from 'lucide-react';

export function AdminUsersView() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | UserRole>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Add User Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('CASHIER');
  const [pinCode, setPinCode] = useState('');
  const [modalError, setModalError] = useState('');

  // Edit / Detail Modal State
  const [editingUser, setEditingUser] = useState<StaffUser | null>(null);
  const [editName, setEditName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('CASHIER');
  const [editPassword, setEditPassword] = useState('');
  const [editPinMode, setEditPinMode] = useState<'keep' | 'change' | 'reset'>('keep');
  const [editPinCode, setEditPinCode] = useState('');
  const [editError, setEditError] = useState('');
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // Toast / Status Notification
  const [toastMessage, setToastMessage] = useState('');
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  // Floating Popover for '...' details
  const [userPopover, setUserPopover] = useState<{
    title: string;
    details: Array<{ label: string; value: string }>;
    rect: { top: number; left: number };
  } | null>(null);

  const openUserPopover = (e: React.MouseEvent, title: string, details: Array<{ label: string; value: string }>) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setUserPopover({
      title,
      details,
      rect: { top: rect.bottom, left: rect.left },
    });
  };

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const res = await api.users.getAll();
      if (res.success && res.data) {
        setUsers(res.data);
      }
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // Filtered Users List
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // Role filter
      if (roleFilter !== 'ALL' && u.role !== roleFilter) {
        return false;
      }
      // Status filter
      if (statusFilter === 'ACTIVE' && !u.is_active) {
        return false;
      }
      if (statusFilter === 'INACTIVE' && u.is_active) {
        return false;
      }
      // Search query (name or username)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = u.name.toLowerCase().includes(q);
        const matchUsername = u.username.toLowerCase().includes(q);
        if (!matchName && !matchUsername) {
          return false;
        }
      }
      return true;
    });
  }, [users, roleFilter, statusFilter, searchQuery]);

  // Counts for filter pills
  const totalCount = users.length;
  const cashierCount = users.filter((u) => u.role === 'CASHIER').length;
  const ownerCount = users.filter((u) => u.role === 'OWNER').length;
  const activeCount = users.filter((u) => u.is_active).length;
  const inactiveCount = users.filter((u) => !u.is_active).length;

  const handleToggleActive = async (user: StaffUser) => {
    // Safety Guard 1: Prevent user from deactivating their own account
    if (currentUser?.id === user.id) {
      alert('Tindakan Dicegah: Anda tidak dapat menonaktifkan akun Anda sendiri yang sedang digunakan.');
      return;
    }

    // Safety Guard 2: Warn when deactivating another OWNER
    if (user.role === 'OWNER' && user.is_active) {
      const confirmed = window.confirm(
        `Perhatian Keamanan: Anda akan menonaktifkan akun Owner "${user.name}".\nPastikan masih ada akun Owner aktif lainnya untuk mengelola sistem. Lanjutkan?`
      );
      if (!confirmed) return;
    }

    try {
      const newStatus = !user.is_active;
      const res = await api.users.toggleActive(user.id, newStatus);
      if (res.success) {
        setUsers(users.map((u) => (u.id === user.id ? { ...u, is_active: newStatus } : u)));
        showToast(`Status akun ${user.name} berhasil diubah.`);
      }
    } catch (err: any) {
      alert(err.message || 'Gagal mengubah status staf.');
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !username.trim() || !password) {
      setModalError('Nama, username, dan password wajib diisi.');
      return;
    }

    try {
      const res = await api.users.create({
        name: name.trim(),
        username: username.trim().toLowerCase(),
        password,
        role,
        pin_code: pinCode.trim() || undefined,
      });

      if (res.success) {
        showToast(`Staf baru "${name}" berhasil didaftarkan!`);
        setIsModalOpen(false);
        setName('');
        setUsername('');
        setPassword('');
        setPinCode('');
        loadUsers();
      }
    } catch (err: any) {
      setModalError(err.message || 'Gagal mendaftarkan pengguna.');
    }
  };

  // Open Edit Modal
  const openEditModal = (user: StaffUser) => {
    setEditingUser(user);
    setEditName(user.name);
    setEditUsername(user.username);
    setEditRole(user.role);
    setEditPassword('');
    setEditPinMode('keep');
    setEditPinCode('');
    setEditError('');
  };

  // Save Edit User
  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    if (!editName.trim() || !editUsername.trim()) {
      setEditError('Nama dan username wajib diisi.');
      return;
    }

    setIsSubmittingEdit(true);
    setEditError('');

    try {
      const payload: {
        name: string;
        username: string;
        role: string;
        pin_code?: string | null;
        password?: string;
      } = {
        name: editName.trim(),
        username: editUsername.trim().toLowerCase(),
        role: editRole,
      };

      // PIN logic
      if (editPinMode === 'change') {
        if (!editPinCode.trim()) {
          setEditError('Masukkan PIN baru yang valid (4-6 digit angka).');
          setIsSubmittingEdit(false);
          return;
        }
        payload.pin_code = editPinCode.trim();
      } else if (editPinMode === 'reset') {
        payload.pin_code = null;
      }

      // Password logic
      if (editPassword.trim()) {
        payload.password = editPassword.trim();
      }

      const res = await api.users.update(editingUser.id, payload);

      if (res.success) {
        showToast(`Data staf "${editName}" berhasil diperbarui.`);
        setEditingUser(null);
        loadUsers();
      }
    } catch (err: any) {
      setEditError(err.message || 'Gagal memperbarui data staf.');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 99999,
            background: '#2e3830',
            color: '#ffffff',
            padding: '12px 18px',
            borderRadius: '10px',
            fontSize: '13px',
            fontWeight: 600,
            boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            animation: 'fadeIn 0.2s ease-out',
          }}
        >
          <Check size={16} color="#4ade80" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Action Bar: Title, Search, and Add Button */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#1c2826', margin: 0 }}>
            Manajemen Karyawan & Hak Akses
          </h2>
          <span
            style={{
              fontSize: '12px',
              fontWeight: 700,
              color: '#57695b',
              background: '#edf3ee',
              padding: '2px 8px',
              borderRadius: '999px',
            }}
          >
            {users.length} Total Staf
          </span>
        </div>

        <button
          onClick={() => {
            setIsModalOpen(true);
            setModalError('');
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            background: '#57695b',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            fontWeight: 700,
            fontSize: '13px',
            cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(87, 105, 91, 0.2)',
            transition: 'background 0.15s ease',
          }}
        >
          <Plus size={16} />
          Tambah Staf Baru
        </button>
      </div>

      {/* FILTER & SEARCH TOOLBAR */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e7e8e3',
          padding: '12px 16px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
        }}
      >
        {/* Search Input */}
        <div
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            flex: '1 1 240px',
            maxWidth: '360px',
          }}
        >
          <Search size={15} color="#8b968f" style={{ position: 'absolute', left: '12px' }} />
          <input
            type="text"
            placeholder="Cari nama atau username staf..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 32px 8px 34px',
              borderRadius: '8px',
              border: '1px solid #dcdfd5',
              fontSize: '12.5px',
              color: '#1f2937',
              outline: 'none',
              background: '#fafafa',
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute',
                right: '8px',
                background: 'transparent',
                border: 'none',
                color: '#9ca3af',
                cursor: 'pointer',
                padding: '2px',
              }}
              title="Hapus pencarian"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Role & Status Filter Pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}>
          {/* Role Filter Tabs */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              background: '#f4f5f1',
              padding: '3px',
              borderRadius: '8px',
              gap: '2px',
            }}
          >
            <button
              onClick={() => setRoleFilter('ALL')}
              style={{
                padding: '5px 10px',
                borderRadius: '6px',
                border: 'none',
                fontSize: '12px',
                fontWeight: roleFilter === 'ALL' ? 700 : 500,
                background: roleFilter === 'ALL' ? '#ffffff' : 'transparent',
                color: roleFilter === 'ALL' ? '#1c2826' : '#52525b',
                boxShadow: roleFilter === 'ALL' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                cursor: 'pointer',
              }}
            >
              Semua Peran ({totalCount})
            </button>
            <button
              onClick={() => setRoleFilter('CASHIER')}
              style={{
                padding: '5px 10px',
                borderRadius: '6px',
                border: 'none',
                fontSize: '12px',
                fontWeight: roleFilter === 'CASHIER' ? 700 : 500,
                background: roleFilter === 'CASHIER' ? '#ffffff' : 'transparent',
                color: roleFilter === 'CASHIER' ? '#0369a1' : '#52525b',
                boxShadow: roleFilter === 'CASHIER' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                cursor: 'pointer',
              }}
            >
              Kasir ({cashierCount})
            </button>
            <button
              onClick={() => setRoleFilter('OWNER')}
              style={{
                padding: '5px 10px',
                borderRadius: '6px',
                border: 'none',
                fontSize: '12px',
                fontWeight: roleFilter === 'OWNER' ? 700 : 500,
                background: roleFilter === 'OWNER' ? '#ffffff' : 'transparent',
                color: roleFilter === 'OWNER' ? '#92400e' : '#52525b',
                boxShadow: roleFilter === 'OWNER' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                cursor: 'pointer',
              }}
            >
              Owner ({ownerCount})
            </button>
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            style={{
              padding: '6px 10px',
              borderRadius: '8px',
              border: '1px solid #dcdfd5',
              fontSize: '12px',
              fontWeight: 600,
              color: '#374151',
              background: '#ffffff',
              cursor: 'pointer',
            }}
          >
            <option value="ALL">Semua Status ({totalCount})</option>
            <option value="ACTIVE">Aktif Saja ({activeCount})</option>
            <option value="INACTIVE">Nonaktif Saja ({inactiveCount})</option>
          </select>

          {/* Reset button if filter is active */}
          {(searchQuery || roleFilter !== 'ALL' || statusFilter !== 'ALL') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setRoleFilter('ALL');
                setStatusFilter('ALL');
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '6px 10px',
                borderRadius: '8px',
                border: '1px solid #e2e4dc',
                background: '#fafafa',
                fontSize: '12px',
                color: '#71717a',
                cursor: 'pointer',
              }}
              title="Reset seluruh filter pencarian"
            >
              <RotateCcw size={12} />
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Filter Result Counter */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px' }}>
        <span style={{ fontSize: '12px', color: '#71717a', fontWeight: 600 }}>
          Menampilkan {filteredUsers.length} dari {users.length} staf
        </span>
      </div>

      {/* Users Table */}
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
                <th style={{ padding: '0 14px', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Nama Staf</th>
                <th style={{ padding: '0 12px', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Username</th>
                <th style={{ padding: '0 12px', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Peran (Role)</th>
                <th style={{ padding: '0 12px', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>PIN Kasir</th>
                <th style={{ padding: '0 12px', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Status Akun</th>
                <th style={{ padding: '0 12px', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Terdaftar</th>
                <th style={{ padding: '0 14px', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'right' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} style={{ padding: '36px', textAlign: 'center', color: '#64746b' }}>
                    Memuat daftar karyawan...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '36px', textAlign: 'center', color: '#8b968f' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 600 }}>Tidak ada staf yang sesuai</span>
                      <small style={{ fontSize: '12px', color: '#a1a1aa' }}>
                        Coba ubah kata kunci pencarian atau reset filter peran/status di atas.
                      </small>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isOwner = u.role === 'OWNER';
                  const isSelf = currentUser?.id === u.id;
                  const cleanDisplayName = u.name.replace(/\s*\((owner|kasir|admin)\)/gi, '').trim();

                  return (
                    <tr
                      key={u.id}
                      style={{
                        borderBottom: '1px solid #f0f0eb',
                        height: '46px',
                        whiteSpace: 'nowrap',
                        background: isSelf ? '#fcfdfb' : 'transparent',
                      }}
                    >
                      {/* 1. Nama Staf */}
                      <td style={{ padding: '0 14px', verticalAlign: 'middle', fontWeight: 700, color: '#1c2826', fontSize: '12.5px' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={u.name}>
                            {cleanDisplayName}
                          </span>
                          {isSelf && (
                            <span
                              style={{
                                fontSize: '10px',
                                fontWeight: 800,
                                color: '#57695b',
                                background: '#edf3ee',
                                padding: '1px 5px',
                                borderRadius: '4px',
                                border: '1px solid #d4ded6',
                              }}
                            >
                              Anda
                            </span>
                          )}
                          {u.name.length > 20 && (
                            <button
                              onClick={(e) =>
                                openUserPopover(e, `Staf: ${cleanDisplayName}`, [
                                  { label: 'Nama Lengkap', value: u.name },
                                  { label: 'Username Login', value: `@${u.username}` },
                                  { label: 'Peran', value: u.role === 'OWNER' ? 'Owner (Pemilik Toko)' : 'Kasir (Operator POS)' },
                                  { label: 'PIN Otorisasi', value: u.has_pin ? 'Aktif' : 'Belum Dipasang' },
                                  { label: 'Status Akun', value: u.is_active ? 'Aktif' : 'Dinonaktifkan' },
                                  { label: 'Terdaftar', value: new Date(u.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) },
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

                      {/* 2. Username */}
                      <td style={{ padding: '0 12px', verticalAlign: 'middle' }}>
                        <span
                          style={{
                            fontFamily: 'monospace',
                            fontSize: '11.5px',
                            color: '#4b5563',
                            background: '#f4f5f1',
                            padding: '3px 7px',
                            borderRadius: '5px',
                          }}
                        >
                          @{u.username}
                        </span>
                      </td>

                      {/* 3. Peran */}
                      <td style={{ padding: '0 12px', verticalAlign: 'middle' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 9px',
                            borderRadius: '6px',
                            background: isOwner ? '#fef3c7' : '#e0f2fe',
                            color: isOwner ? '#92400e' : '#0369a1',
                            fontWeight: 700,
                            fontSize: '11px',
                          }}
                        >
                          <Shield size={12} />
                          {isOwner ? 'OWNER' : 'KASIR'}
                        </span>
                      </td>

                      {/* 4. PIN */}
                      <td style={{ padding: '0 12px', verticalAlign: 'middle' }}>
                        {u.has_pin ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              color: '#15803d',
                              fontWeight: 700,
                              fontSize: '11.5px',
                            }}
                          >
                            <Key size={12} />
                            Terpasang
                          </span>
                        ) : (
                          <span style={{ color: '#a1a1aa', fontSize: '11.5px' }}>-</span>
                        )}
                      </td>

                      {/* 5. Status Akun */}
                      <td style={{ padding: '0 12px', verticalAlign: 'middle' }}>
                        <span
                          style={{
                            padding: '3px 9px',
                            borderRadius: '6px',
                            background: u.is_active ? '#dcfce7' : '#fee2e2',
                            color: u.is_active ? '#15803d' : '#b91c1c',
                            fontWeight: 700,
                            fontSize: '11px',
                          }}
                        >
                          {u.is_active ? 'Aktif' : 'Dinonaktifkan'}
                        </span>
                      </td>

                      {/* 6. Terdaftar */}
                      <td style={{ padding: '0 12px', verticalAlign: 'middle', color: '#64746b', fontSize: '11.5px' }}>
                        {new Date(u.created_at).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>

                      {/* 7. Aksi (Edit + Aman Nonaktifkan) */}
                      <td style={{ padding: '0 14px', verticalAlign: 'middle', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end' }}>
                          {/* Tombol Edit / Detail */}
                          <button
                            onClick={() => openEditModal(u)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '4px 10px',
                              borderRadius: '6px',
                              border: '1px solid #dcdfd5',
                              background: '#ffffff',
                              color: '#374151',
                              fontWeight: 600,
                              fontSize: '11.5px',
                              cursor: 'pointer',
                              boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                              transition: 'all 0.15s ease',
                            }}
                            title={`Edit profil, peran, atau reset PIN staf ${cleanDisplayName}`}
                          >
                            <Pencil size={12} color="#57695b" />
                            <span>Edit</span>
                          </button>

                          {/* Tombol Nonaktifkan: Diamankan untuk akun sendiri */}
                          {isSelf ? (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '4px 9px',
                                borderRadius: '6px',
                                background: '#f4f5f1',
                                color: '#71717a',
                                fontWeight: 600,
                                fontSize: '11px',
                                border: '1px solid #e4e7e2',
                                cursor: 'not-allowed',
                              }}
                              title="Anda sedang masuk dengan akun ini. Akun sendiri tidak dapat dinonaktifkan demi keamanan sistem."
                            >
                              <Shield size={11} color="#57695b" />
                              Akun Anda
                            </span>
                          ) : (
                            <button
                              onClick={() => handleToggleActive(u)}
                              style={{
                                padding: '4px 10px',
                                borderRadius: '6px',
                                border: 'none',
                                background: u.is_active ? '#fee2e2' : '#dcfce7',
                                color: u.is_active ? '#b91c1c' : '#15803d',
                                fontWeight: 700,
                                fontSize: '11px',
                                cursor: 'pointer',
                                transition: 'opacity 0.15s ease',
                              }}
                              title={
                                u.is_active
                                  ? `Nonaktifkan akun staf ${cleanDisplayName}`
                                  : `Aktifkan kembali akun staf ${cleanDisplayName}`
                              }
                            >
                              {u.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* EDIT / DETAIL USER MODAL */}
      {editingUser && (
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
              maxWidth: '480px',
              width: '100%',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
              overflow: 'hidden',
              animation: 'fadeIn 0.15s ease-out',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '18px 24px',
                borderBottom: '1px solid #e7e8e3',
                background: '#fafafa',
              }}
            >
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#1c2826', margin: 0 }}>
                  Edit Data & Akses Staf
                </h3>
                <small style={{ color: '#71717a', fontSize: '12px' }}>
                  Perbarui profil, ganti peran, atau kelola PIN kasir.
                </small>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                style={{
                  background: '#f0f0eb',
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

            <form onSubmit={handleUpdateUser} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {editError && (
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    color: '#b91c1c',
                    fontSize: '12.5px',
                    fontWeight: 600,
                  }}
                >
                  {editError}
                </div>
              )}

              {/* Nama Lengkap */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '5px' }}>
                  Nama Lengkap Staf
                </label>
                <input
                  type="text"
                  required
                  placeholder="Nama staf"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    fontSize: '13px',
                    color: '#1f2937',
                  }}
                />
              </div>

              {/* Username & Peran (Role) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '5px' }}>
                    Username Login
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="username"
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #d1d5db',
                      fontSize: '13px',
                      fontFamily: 'monospace',
                      color: '#1f2937',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '5px' }}>
                    Peran (Role)
                  </label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as any)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #d1d5db',
                      fontSize: '13px',
                      background: '#ffffff',
                      color: '#1f2937',
                      fontWeight: 600,
                    }}
                  >
                    <option value="CASHIER">Kasir (POS Kasir)</option>
                    <option value="OWNER">Owner (Akses Penuh)</option>
                  </select>
                </div>
              </div>

              {/* PIN Kasir Management */}
              <div
                style={{
                  background: '#f9fafb',
                  border: '1px solid #e5e7eb',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#374151', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Key size={13} color="#57695b" />
                    PIN Kasir / Otorisasi
                  </label>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      color: editingUser.has_pin ? '#15803d' : '#8b968f',
                    }}
                  >
                    {editingUser.has_pin ? '✓ PIN Terpasang' : 'Belum Ada PIN'}
                  </span>
                </div>

                {/* Option Selector */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => setEditPinMode('keep')}
                    style={{
                      flex: 1,
                      padding: '6px 8px',
                      borderRadius: '6px',
                      border: editPinMode === 'keep' ? '1.5px solid #57695b' : '1px solid #dcdfd5',
                      background: editPinMode === 'keep' ? '#edf3ee' : '#ffffff',
                      color: editPinMode === 'keep' ? '#334437' : '#52525b',
                      fontSize: '11.5px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Pertahankan
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditPinMode('change')}
                    style={{
                      flex: 1,
                      padding: '6px 8px',
                      borderRadius: '6px',
                      border: editPinMode === 'change' ? '1.5px solid #57695b' : '1px solid #dcdfd5',
                      background: editPinMode === 'change' ? '#edf3ee' : '#ffffff',
                      color: editPinMode === 'change' ? '#334437' : '#52525b',
                      fontSize: '11.5px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Ganti / Pasang Baru
                  </button>

                  {editingUser.has_pin && (
                    <button
                      type="button"
                      onClick={() => setEditPinMode('reset')}
                      style={{
                        flex: 1,
                        padding: '6px 8px',
                        borderRadius: '6px',
                        border: editPinMode === 'reset' ? '1.5px solid #b91c1c' : '1px solid #dcdfd5',
                        background: editPinMode === 'reset' ? '#fee2e2' : '#ffffff',
                        color: editPinMode === 'reset' ? '#991b1b' : '#52525b',
                        fontSize: '11.5px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Reset / Hapus PIN
                    </button>
                  )}
                </div>

                {/* Input for new PIN if changing */}
                {editPinMode === 'change' && (
                  <div style={{ marginTop: '4px' }}>
                    <input
                      type="password"
                      maxLength={6}
                      placeholder="Masukkan 4-6 digit PIN baru"
                      value={editPinCode}
                      onChange={(e) => setEditPinCode(e.target.value.replace(/\D/g, ''))}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid #57695b',
                        fontSize: '13px',
                        letterSpacing: '0.1em',
                      }}
                    />
                    <small style={{ color: '#6b7280', fontSize: '11px', marginTop: '2px', display: 'block' }}>
                      Gunakan 4–6 angka rahasia untuk otorisasi void dan kasir.
                    </small>
                  </div>
                )}

                {editPinMode === 'reset' && (
                  <small style={{ color: '#b91c1c', fontSize: '11px', fontWeight: 600 }}>
                    Perhatian: PIN otorisasi staf ini akan dihapus. Staf tidak akan dapat melakukan otorisasi tanpa PIN.
                  </small>
                )}
              </div>

              {/* Password Baru (Opsional) */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '5px' }}>
                  Ganti Kata Sandi (Opsional)
                </label>
                <input
                  type="password"
                  placeholder="Kosongkan jika tidak ingin mengubah password"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    fontSize: '13px',
                  }}
                />
                <small style={{ color: '#71717a', fontSize: '11px', marginTop: '2px', display: 'block' }}>
                  Hanya isi field ini bila kasir lupa kata sandi login.
                </small>
              </div>

              {/* Modal Buttons */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '10px',
                  marginTop: '8px',
                  paddingTop: '12px',
                  borderTop: '1px solid #f0f0eb',
                }}
              >
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  disabled={isSubmittingEdit}
                  style={{
                    padding: '9px 16px',
                    background: '#f0f0eb',
                    border: '1px solid #dcdfd5',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#4b5563',
                    cursor: 'pointer',
                  }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdit}
                  style={{
                    padding: '9px 18px',
                    background: '#57695b',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 1px 3px rgba(87, 105, 91, 0.25)',
                    opacity: isSubmittingEdit ? 0.7 : 1,
                  }}
                >
                  {isSubmittingEdit ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD USER MODAL */}
      {isModalOpen && (
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
              maxWidth: '460px',
              width: '100%',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
              overflow: 'hidden',
              animation: 'fadeIn 0.15s ease-out',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '18px 24px',
                borderBottom: '1px solid #e7e8e3',
                background: '#fafafa',
              }}
            >
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#1c2826', margin: 0 }}>
                Tambah Akun Staf Kafe
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{
                  background: '#f0f0eb',
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

            <form onSubmit={handleCreateUser} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {modalError && (
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    color: '#b91c1c',
                    fontSize: '13px',
                    fontWeight: 600,
                  }}
                >
                  {modalError}
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#4b5563', marginBottom: '6px' }}>
                  Nama Lengkap Karyawan
                </label>
                <input
                  type="text"
                  required
                  placeholder="cth: Rian Barista"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    fontSize: '13px',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#4b5563', marginBottom: '6px' }}>
                    Username Login
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="rian"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid #d1d5db',
                      fontSize: '13px',
                      fontFamily: 'monospace',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#4b5563', marginBottom: '6px' }}>
                    Peran (Role)
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid #d1d5db',
                      fontSize: '13px',
                      background: '#ffffff',
                      fontWeight: 600,
                    }}
                  >
                    <option value="CASHIER">Kasir (POS Only)</option>
                    <option value="OWNER">Owner / Manajer</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#4b5563', marginBottom: '6px' }}>
                    Kata Sandi (Password)
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid #d1d5db',
                      fontSize: '13px',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#4b5563', marginBottom: '6px' }}>
                    PIN Otorisasi (6 Angka)
                  </label>
                  <input
                    type="password"
                    maxLength={6}
                    placeholder="Opsional"
                    value={pinCode}
                    onChange={(e) => setPinCode(e.target.value.replace(/\D/g, ''))}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid #d1d5db',
                      fontSize: '13px',
                    }}
                  />
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '12px',
                  marginTop: '12px',
                }}
              >
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    padding: '10px 18px',
                    background: '#f0f0eb',
                    border: '1px solid #dcdfd5',
                    borderRadius: '10px',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#4b5563',
                    cursor: 'pointer',
                  }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '10px 20px',
                    background: '#57695b',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 2px 5px rgba(87, 105, 91, 0.25)',
                  }}
                >
                  Daftarkan Staf
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FLOATING POPOVER FOR SINGLE LINE BREAKDOWN */}
      {userPopover && (
        <div
          onClick={() => setUserPopover(null)}
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
              top: Math.min(userPopover.rect.top + 6, window.innerHeight - 240),
              left: Math.max(10, Math.min(userPopover.rect.left, window.innerWidth - 320)),
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
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#1c2826' }}>{userPopover.title}</span>
              <button
                onClick={() => setUserPopover(null)}
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
              {userPopover.details.map((d, i) => (
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
