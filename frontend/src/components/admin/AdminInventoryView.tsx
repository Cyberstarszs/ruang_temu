'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Ingredient } from '@/types';
import {
  Boxes,
  Plus,
  Search,
  ClipboardCheck,
  Trash2,
  Pencil,
  AlertTriangle,
  RotateCcw,
  X,
  CheckCircle2,
} from 'lucide-react';

export function AdminInventoryView() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'CRITICAL' | 'SAFE'>('ALL');

  // Stock Opname Modal State
  const [isOpnameModalOpen, setIsOpnameModalOpen] = useState(false);
  const [opnameCounts, setOpnameCounts] = useState<{ [id: string]: string }>({});
  const [opnameNotes, setOpnameNotes] = useState<{ [id: string]: string }>({});
  const [isSubmittingOpname, setIsSubmittingOpname] = useState(false);

  // Wastage Modal State
  const [isWastageModalOpen, setIsWastageModalOpen] = useState(false);
  const [wasteIngredientId, setWasteIngredientId] = useState('');
  const [wasteQuantity, setWasteQuantity] = useState('');
  const [wasteReason, setWasteReason] = useState('Kedaluwarsa / Rusak');
  const [wasteError, setWasteError] = useState('');

  // Add / Edit Ingredient Modal State
  const [isIngModalOpen, setIsIngModalOpen] = useState(false);
  const [editingIng, setEditingIng] = useState<Ingredient | null>(null);
  const [ingCode, setIngCode] = useState('');
  const [ingName, setIngName] = useState('');
  const [ingUsageUnit, setIngUsageUnit] = useState<'gram' | 'ml' | 'pcs'>('gram');
  const [ingPurchaseUnit, setIngPurchaseUnit] = useState('kg');
  const [ingConversionRate, setIngConversionRate] = useState('1000');
  const [ingStockActual, setIngStockActual] = useState('0');
  const [ingSafeStock, setIngSafeStock] = useState('500');
  const [ingUnitCost, setIngUnitCost] = useState('150');
  const [ingError, setIngError] = useState('');

  // Floating Popover for '...' details
  const [ingPopover, setIngPopover] = useState<{
    title: string;
    details: Array<{ label: string; value: string }>;
    rect: { top: number; left: number };
  } | null>(null);

  const openIngPopover = (e: React.MouseEvent, title: string, details: Array<{ label: string; value: string }>) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setIngPopover({
      title,
      details,
      rect: { top: rect.bottom, left: rect.left },
    });
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const res = await api.inventory.getAll();
      if (res.success && res.data) {
        setIngredients(res.data);
      }
    } catch (err) {
      console.error('Failed to load ingredients:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Opname Handlers
  const openOpnameModal = () => {
    const initialCounts: { [id: string]: string } = {};
    const initialNotes: { [id: string]: string } = {};
    ingredients.forEach((ing) => {
      initialCounts[ing.id] = ing.stock_actual.toString();
      initialNotes[ing.id] = '';
    });
    setOpnameCounts(initialCounts);
    setOpnameNotes(initialNotes);
    setIsOpnameModalOpen(true);
  };

  const handleSubmitOpname = async () => {
    setIsSubmittingOpname(true);
    try {
      const items = ingredients.map((ing) => ({
        ingredientId: ing.id,
        actualCount: Number(opnameCounts[ing.id] ?? ing.stock_actual),
        notes: opnameNotes[ing.id]?.trim() || 'Stok Opname Rutin',
      }));

      const res = await api.inventory.submitStocktake(items);
      if (res.success) {
        alert('Stok opname berhasil disimpan dan mutasi stok telah dicatat.');
        setIsOpnameModalOpen(false);
        loadData();
      }
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan stok opname.');
    } finally {
      setIsSubmittingOpname(false);
    }
  };

  // Wastage Handlers
  const openWastageModal = (preselectedId?: string) => {
    setWasteIngredientId(preselectedId || (ingredients[0]?.id || ''));
    setWasteQuantity('');
    setWasteReason('Kedaluwarsa / Rusak');
    setWasteError('');
    setIsWastageModalOpen(true);
  };

  const handleSubmitWastage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wasteIngredientId || !wasteQuantity || Number(wasteQuantity) <= 0) {
      setWasteError('Pilih bahan dan masukkan jumlah limbah valid (> 0).');
      return;
    }

    try {
      const res = await api.inventory.recordWastage({
        ingredientId: wasteIngredientId,
        quantity: Number(wasteQuantity),
        reason: wasteReason,
      });

      if (res.success) {
        alert(res.message || 'Limbah bahan berhasil dicatat.');
        setIsWastageModalOpen(false);
        loadData();
      }
    } catch (err: any) {
      setWasteError(err.message || 'Gagal mencatat limbah.');
    }
  };

  // Add / Edit Handlers
  const openAddModal = () => {
    setEditingIng(null);
    setIngCode(`ING-${Date.now().toString().slice(-4)}`);
    setIngName('');
    setIngUsageUnit('gram');
    setIngPurchaseUnit('kg');
    setIngConversionRate('1000');
    setIngStockActual('0');
    setIngSafeStock('500');
    setIngUnitCost('150');
    setIngError('');
    setIsIngModalOpen(true);
  };

  const openEditModal = (ing: Ingredient) => {
    setEditingIng(ing);
    setIngCode(ing.code);
    setIngName(ing.name);
    setIngUsageUnit(ing.usage_unit);
    setIngPurchaseUnit(ing.purchase_unit);
    setIngConversionRate(ing.conversion_rate.toString());
    setIngStockActual(ing.stock_actual.toString());
    setIngSafeStock(ing.safe_stock.toString());
    setIngUnitCost(ing.unit_cost.toString());
    setIngError('');
    setIsIngModalOpen(true);
  };

  const handleSaveIngredient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ingCode.trim() || !ingName.trim()) {
      setIngError('Kode dan nama bahan baku wajib diisi.');
      return;
    }

    try {
      const payload = {
        code: ingCode.trim(),
        name: ingName.trim(),
        usage_unit: ingUsageUnit,
        purchase_unit: ingPurchaseUnit.trim(),
        conversion_rate: Number(ingConversionRate),
        stock_actual: Number(ingStockActual),
        safe_stock: Number(ingSafeStock),
        unit_cost: Number(ingUnitCost),
      };

      if (editingIng) {
        const res = await api.inventory.update(editingIng.id, payload);
        if (res.success) {
          setIsIngModalOpen(false);
          loadData();
        }
      } else {
        const res = await api.inventory.create(payload);
        if (res.success) {
          setIsIngModalOpen(false);
          loadData();
        }
      }
    } catch (err: any) {
      setIngError(err.message || 'Gagal menyimpan bahan baku.');
    }
  };

  const filteredIngredients = ingredients.filter((ing) => {
    const matchesSearch =
      ing.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ing.code.toLowerCase().includes(searchQuery.toLowerCase());

    const isCritical = Number(ing.stock_actual) <= Number(ing.safe_stock);
    const matchesFilter =
      filterStatus === 'ALL' ||
      (filterStatus === 'CRITICAL' && isCritical) ||
      (filterStatus === 'SAFE' && !isCritical);

    return matchesSearch && matchesFilter;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Header Controls */}
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
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => setFilterStatus('ALL')}
            style={{
              padding: '5px 12px',
              borderRadius: '8px',
              border: filterStatus === 'ALL' ? '1px solid #57695b' : '1px solid #e2e4dc',
              background: filterStatus === 'ALL' ? '#57695b' : '#f7f7f5',
              color: filterStatus === 'ALL' ? '#ffffff' : '#4b5563',
              fontSize: '12.5px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Semua ({ingredients.length})
          </button>

          <button
            onClick={() => setFilterStatus('CRITICAL')}
            style={{
              padding: '5px 12px',
              borderRadius: '8px',
              border: filterStatus === 'CRITICAL' ? '1px solid #b91c1c' : '1px solid #e2e4dc',
              background: filterStatus === 'CRITICAL' ? '#fee2e2' : '#f7f7f5',
              color: filterStatus === 'CRITICAL' ? '#b91c1c' : '#4b5563',
              fontSize: '12.5px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Kritis ({ingredients.filter((i) => Number(i.stock_actual) <= Number(i.safe_stock)).length})
          </button>

          <button
            onClick={() => setFilterStatus('SAFE')}
            style={{
              padding: '5px 12px',
              borderRadius: '8px',
              border: filterStatus === 'SAFE' ? '1px solid #15803d' : '1px solid #e2e4dc',
              background: filterStatus === 'SAFE' ? '#dcfce7' : '#f7f7f5',
              color: filterStatus === 'SAFE' ? '#15803d' : '#4b5563',
              fontSize: '12.5px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Aman
          </button>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: '#f7f7f5',
              padding: '5px 12px',
              borderRadius: '8px',
              border: '1px solid #e2e4dc',
              minWidth: '180px',
              marginLeft: '4px',
            }}
          >
            <Search size={14} color="#64746b" />
            <input
              type="text"
              placeholder="Cari bahan..."
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
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={openOpnameModal}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 12px',
              background: '#f2f4ef',
              color: '#57695b',
              border: '1px solid #dcdfd5',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '12.5px',
              cursor: 'pointer',
            }}
          >
            <ClipboardCheck size={14} />
            Opname
          </button>

          <button
            onClick={() => openWastageModal()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 12px',
              background: '#fff1f0',
              color: '#cf1322',
              border: '1px solid #ffa39e',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '12.5px',
              cursor: 'pointer',
            }}
          >
            <Trash2 size={14} />
            Limbah
          </button>

          <button
            onClick={openAddModal}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              background: '#57695b',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '12.5px',
              cursor: 'pointer',
            }}
          >
            <Plus size={15} />
            Tambah Bahan
          </button>
        </div>
      </div>

      {/* Ingredients Table */}
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
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px', whiteSpace: 'nowrap' }}>
            <thead>
              <tr style={{ background: '#fbfbf9', borderBottom: '1px solid #e7e8e3', color: '#71717a' }}>
                <th style={{ padding: '9px 12px', fontWeight: 600, fontSize: '11.5px' }}>Kode</th>
                <th style={{ padding: '9px 12px', fontWeight: 600, fontSize: '11.5px' }}>Nama Bahan</th>
                <th style={{ padding: '9px 12px', fontWeight: 600, fontSize: '11.5px' }}>Satuan</th>
                <th style={{ padding: '9px 12px', fontWeight: 600, fontSize: '11.5px' }}>Stok Aktual</th>
                <th style={{ padding: '9px 12px', fontWeight: 600, fontSize: '11.5px' }}>Batas Aman</th>
                <th style={{ padding: '9px 12px', fontWeight: 600, fontSize: '11.5px' }}>Biaya HPP</th>
                <th style={{ padding: '9px 12px', fontWeight: 600, fontSize: '11.5px' }}>Status</th>
                <th style={{ padding: '9px 14px', fontWeight: 600, fontSize: '11.5px', textAlign: 'right' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} style={{ padding: '36px', textAlign: 'center', color: '#64746b' }}>
                    Memuat data bahan baku...
                  </td>
                </tr>
              ) : filteredIngredients.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '36px', textAlign: 'center', color: '#8b968f', fontStyle: 'italic' }}>
                    Tidak ada bahan baku yang cocok dengan pencarian.
                  </td>
                </tr>
              ) : (
                filteredIngredients.map((ing) => {
                  const actual = Number(ing.stock_actual);
                  const safe = Number(ing.safe_stock);
                  const isOut = actual <= 0;
                  const isLow = !isOut && actual <= safe;

                  return (
                    <tr key={ing.id} style={{ borderBottom: '1px solid #f0f0eb', height: '42px' }}>
                      {/* 1. Kode */}
                      <td style={{ padding: '8px 12px', verticalAlign: 'middle' }}>
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1c2826', fontSize: '11.5px' }}>
                          {ing.code}
                        </span>
                      </td>

                      {/* 2. Nama Bahan */}
                      <td style={{ padding: '8px 12px', verticalAlign: 'middle' }}>
                        <span
                          style={{
                            fontWeight: 700,
                            color: '#1c2826',
                            maxWidth: '180px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            display: 'inline-block',
                            fontSize: '12px',
                          }}
                          title={ing.name}
                        >
                          {ing.name}
                        </span>
                      </td>

                      {/* 3. Satuan */}
                      <td style={{ padding: '8px 12px', verticalAlign: 'middle' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ color: '#4b5563', fontSize: '11.5px' }}>{ing.usage_unit}</span>
                          <button
                            onClick={(e) =>
                              openIngPopover(e, `Satuan Konversi: ${ing.name}`, [
                                { label: 'Satuan Pakai (POS)', value: ing.usage_unit },
                                { label: 'Satuan Beli (PO)', value: ing.purchase_unit },
                                { label: 'Rasio Konversi', value: `1 ${ing.purchase_unit} = ${Number(ing.conversion_rate).toLocaleString('id-ID')} ${ing.usage_unit}` },
                                { label: 'Biaya per ' + ing.usage_unit, value: `Rp ${Number(ing.unit_cost).toLocaleString('id-ID')}` },
                              ])
                            }
                            title="Rincian konversi satuan beli & pakai"
                            style={{
                              padding: '1px 4px',
                              fontSize: '10.5px',
                              fontWeight: 700,
                              borderRadius: '4px',
                              background: '#f2f4ef',
                              border: '1px solid #dcdfd5',
                              color: '#57695b',
                              cursor: 'pointer',
                              lineHeight: '13px',
                              height: '17px',
                            }}
                          >
                            ...
                          </button>
                        </div>
                      </td>

                      {/* 4. Stok Aktual */}
                      <td style={{ padding: '8px 12px', verticalAlign: 'middle', fontWeight: 800, fontSize: '12.5px', color: isOut ? '#b91c1c' : isLow ? '#b45309' : '#1c2826' }}>
                        {Number(ing.stock_actual).toLocaleString('id-ID')} {ing.usage_unit}
                      </td>

                      {/* 5. Batas Aman */}
                      <td style={{ padding: '8px 12px', verticalAlign: 'middle', color: '#6b7280', fontSize: '11.5px' }}>
                        {Number(ing.safe_stock).toLocaleString('id-ID')} {ing.usage_unit}
                      </td>

                      {/* 6. Biaya HPP */}
                      <td style={{ padding: '8px 12px', verticalAlign: 'middle', fontWeight: 600, color: '#1c2826', fontSize: '12px' }}>
                        Rp {Number(ing.unit_cost).toLocaleString('id-ID')} / {ing.usage_unit}
                      </td>

                      {/* 7. Status */}
                      <td style={{ padding: '8px 12px', verticalAlign: 'middle' }}>
                        {isOut ? (
                          <span
                            style={{
                              padding: '2px 7px',
                              borderRadius: '5px',
                              background: '#fee2e2',
                              color: '#b91c1c',
                              fontWeight: 700,
                              fontSize: '10.5px',
                            }}
                          >
                            Habis
                          </span>
                        ) : isLow ? (
                          <span
                            style={{
                              padding: '2px 7px',
                              borderRadius: '5px',
                              background: '#fef3c7',
                              color: '#b45309',
                              fontWeight: 700,
                              fontSize: '10.5px',
                            }}
                          >
                            Menipis
                          </span>
                        ) : (
                          <span
                            style={{
                              padding: '2px 7px',
                              borderRadius: '5px',
                              background: '#dcfce7',
                              color: '#15803d',
                              fontWeight: 700,
                              fontSize: '10.5px',
                            }}
                          >
                            Aman
                          </span>
                        )}
                      </td>

                      {/* 8. Aksi */}
                      <td style={{ padding: '8px 14px', verticalAlign: 'middle', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                          <button
                            onClick={() => openWastageModal(ing.id)}
                            style={{
                              padding: '3px 8px',
                              background: '#fff1f0',
                              color: '#cf1322',
                              border: '1px solid #ffa39e',
                              borderRadius: '5px',
                              fontSize: '11px',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                            title="Catat pemborosan atau bahan tumpah/rusak"
                          >
                            Limbah
                          </button>

                          <button
                            onClick={() => openEditModal(ing)}
                            style={{
                              padding: '4px 6px',
                              background: '#f7f7f5',
                              color: '#64746b',
                              border: '1px solid #e2e4dc',
                              borderRadius: '5px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                            }}
                            title="Edit Bahan Baku"
                          >
                            <Pencil size={12} />
                          </button>
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

      {/* STOCK OPNAME MODAL */}
      {isOpnameModalOpen && (
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
              maxWidth: '780px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '20px 24px',
                borderBottom: '1px solid #e7e8e3',
              }}
            >
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#1c2826', margin: 0 }}>
                  Formulir Stok Opname Fisik
                </h3>
                <p style={{ fontSize: '12px', color: '#64746b', margin: '4px 0 0 0' }}>
                  Isi jumlah hitung fisik aktual di gudang kafe. Sistem akan menghitung selisih dan menyesuaikan saldo.
                </p>
              </div>
              <button
                onClick={() => setIsOpnameModalOpen(false)}
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
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', whiteSpace: 'nowrap' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e7e8e3', color: '#64746b' }}>
                    <th style={{ textAlign: 'left', padding: '8px' }}>Bahan Baku</th>
                    <th style={{ textAlign: 'right', padding: '8px' }}>Stok Sistem</th>
                    <th style={{ textAlign: 'center', padding: '8px', width: '140px' }}>Hitungan Fisik</th>
                    <th style={{ textAlign: 'right', padding: '8px' }}>Selisih</th>
                    <th style={{ textAlign: 'left', padding: '8px' }}>Catatan</th>
                  </tr>
                </thead>
                <tbody>
                  {ingredients.map((ing) => {
                    const sysVal = Number(ing.stock_actual);
                    const countVal = Number(opnameCounts[ing.id] ?? sysVal);
                    const diff = countVal - sysVal;

                    return (
                      <tr key={ing.id} style={{ borderBottom: '1px solid #f0f0eb' }}>
                        <td style={{ padding: '10px 8px', fontWeight: 600, color: '#1c2826' }}>
                          {ing.name} <span style={{ fontSize: '11px', color: '#8b968f' }}>({ing.usage_unit})</span>
                        </td>

                        <td style={{ textAlign: 'right', padding: '10px 8px', color: '#64746b' }}>
                          {sysVal.toLocaleString('id-ID')}
                        </td>

                        <td style={{ textAlign: 'center', padding: '10px 8px' }}>
                          <input
                            type="number"
                            step="0.1"
                            value={opnameCounts[ing.id] ?? sysVal}
                            onChange={(e) =>
                              setOpnameCounts({ ...opnameCounts, [ing.id]: e.target.value })
                            }
                            style={{
                              width: '100%',
                              padding: '6px 8px',
                              borderRadius: '6px',
                              border: '1px solid #ccd1c4',
                              textAlign: 'center',
                              fontWeight: 700,
                              fontSize: '13px',
                            }}
                          />
                        </td>

                        <td
                          style={{
                            textAlign: 'right',
                            padding: '10px 8px',
                            fontWeight: 700,
                            color: diff === 0 ? '#15803d' : diff > 0 ? '#0284c7' : '#b91c1c',
                          }}
                        >
                          {diff > 0 ? `+${diff}` : diff}
                        </td>

                        <td style={{ padding: '10px 8px' }}>
                          <input
                            type="text"
                            placeholder="Alasan penyesuaian..."
                            value={opnameNotes[ing.id] ?? ''}
                            onChange={(e) =>
                              setOpnameNotes({ ...opnameNotes, [ing.id]: e.target.value })
                            }
                            style={{
                              width: '100%',
                              padding: '6px 8px',
                              borderRadius: '6px',
                              border: '1px solid #e2e4dc',
                              fontSize: '12px',
                            }}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '12px',
                padding: '16px 24px',
                borderTop: '1px solid #e7e8e3',
                background: '#fbfbf9',
              }}
            >
              <button
                onClick={() => setIsOpnameModalOpen(false)}
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
                onClick={handleSubmitOpname}
                disabled={isSubmittingOpname}
                style={{
                  padding: '10px 20px',
                  background: '#57695b',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {isSubmittingOpname ? 'Menyimpan...' : 'Terapkan Hasil Opname'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RECORD WASTAGE MODAL */}
      {isWastageModalOpen && (
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
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#1c2826', margin: 0 }}>
                Pencatatan Limbah (Wastage)
              </h3>
              <button
                onClick={() => setIsWastageModalOpen(false)}
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

            <form onSubmit={handleSubmitWastage} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {wasteError && (
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    color: '#b91c1c',
                    fontSize: '13px',
                  }}
                >
                  {wasteError}
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#4b5563', marginBottom: '6px' }}>
                  Pilih Bahan Baku
                </label>
                <select
                  value={wasteIngredientId}
                  onChange={(e) => setWasteIngredientId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    fontSize: '13px',
                    background: '#ffffff',
                  }}
                >
                  {ingredients.map((ing) => (
                    <option key={ing.id} value={ing.id}>
                      {ing.name} ({ing.code}) — Saldo: {Number(ing.stock_actual).toLocaleString('id-ID')} {ing.usage_unit}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#4b5563', marginBottom: '6px' }}>
                  Jumlah Bahan Terbuang / Rusak
                </label>
                <input
                  type="number"
                  step="0.1"
                  required
                  placeholder="cth: 250"
                  value={wasteQuantity}
                  onChange={(e) => setWasteQuantity(e.target.value)}
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
                  Alasan Kerusakan / Limbah
                </label>
                <select
                  value={wasteReason}
                  onChange={(e) => setWasteReason(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    fontSize: '13px',
                    background: '#ffffff',
                  }}
                >
                  <option value="Kedaluwarsa / Rusak">Kedaluwarsa / Rusak</option>
                  <option value="Tumpah saat Barista Brewing">Tumpah saat Barista Brewing</option>
                  <option value="Salah Takaran / Reject Rasa">Salah Takaran / Reject Rasa</option>
                  <option value="Kemasan Rusak / Bocor">Kemasan Rusak / Bocor</option>
                  <option value="Trial / Kalibrasi Mesin Kopi">Trial / Kalibrasi Mesin Kopi</option>
                </select>
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
                  onClick={() => setIsWastageModalOpen(false)}
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
                    background: '#dc2626',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Catat & Kurangi Stok
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD / EDIT INGREDIENT MODAL */}
      {isIngModalOpen && (
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
              maxWidth: '520px',
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
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#1c2826', margin: 0 }}>
                {editingIng ? 'Edit Bahan Baku' : 'Tambah Bahan Baku Baru'}
              </h3>
              <button
                onClick={() => setIsIngModalOpen(false)}
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

            <form onSubmit={handleSaveIngredient} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {ingError && (
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    color: '#b91c1c',
                    fontSize: '13px',
                  }}
                >
                  {ingError}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#4b5563', marginBottom: '6px' }}>
                    Kode Bahan
                  </label>
                  <input
                    type="text"
                    required
                    value={ingCode}
                    onChange={(e) => setIngCode(e.target.value)}
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
                    Nama Bahan
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="cth: Kopi Arabika House Blend"
                    value={ingName}
                    onChange={(e) => setIngName(e.target.value)}
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#4b5563', marginBottom: '6px' }}>
                    Satuan Pemakaian
                  </label>
                  <select
                    value={ingUsageUnit}
                    onChange={(e) => setIngUsageUnit(e.target.value as any)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid #d1d5db',
                      fontSize: '13px',
                      background: '#ffffff',
                    }}
                  >
                    <option value="gram">gram (gr)</option>
                    <option value="ml">mililiter (ml)</option>
                    <option value="pcs">pieces (pcs)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#4b5563', marginBottom: '6px' }}>
                    Satuan Pembelian
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="cth: kg / botol / dus"
                    value={ingPurchaseUnit}
                    onChange={(e) => setIngPurchaseUnit(e.target.value)}
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#4b5563', marginBottom: '6px' }}>
                    Biaya / Satuan (Rp)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="150"
                    value={ingUnitCost}
                    onChange={(e) => setIngUnitCost(e.target.value)}
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
                    Batas Stok Aman
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="500"
                    value={ingSafeStock}
                    onChange={(e) => setIngSafeStock(e.target.value)}
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
                    Stok Aktual
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="1000"
                    value={ingStockActual}
                    onChange={(e) => setIngStockActual(e.target.value)}
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
                  onClick={() => setIsIngModalOpen(false)}
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
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {editingIng ? 'Perbarui Bahan' : 'Simpan Bahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK DETAILS POPOVER FOR '...' */}
      {ingPopover && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99990,
            background: 'transparent',
          }}
          onClick={() => setIngPopover(null)}
        >
          <div
            style={{
              position: 'fixed',
              top: Math.min(ingPopover.rect.top + 6, typeof window !== 'undefined' ? window.innerHeight - 240 : 400),
              left: Math.max(16, Math.min(ingPopover.rect.left - 40, typeof window !== 'undefined' ? window.innerWidth - 320 : 400)),
              width: '300px',
              background: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e2e4dc',
              boxShadow: '0 16px 36px rgba(0,0,0,0.2)',
              padding: '14px 16px',
              zIndex: 99991,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid #f0f0eb',
                paddingBottom: '8px',
                marginBottom: '10px',
              }}
            >
              <strong style={{ fontSize: '12.5px', color: '#1c2826' }}>{ingPopover.title}</strong>
              <button
                onClick={() => setIngPopover(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#888',
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <X size={14} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
              {ingPopover.details.map((it, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #f5f5f2', paddingBottom: '3px' }}>
                  <span style={{ color: '#71717a' }}>{it.label}:</span>
                  <strong style={{ color: '#1c2826', textAlign: 'right', maxWidth: '170px' }}>{it.value}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
