'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { api } from '@/lib/api';
import { Ingredient } from '@/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Combobox } from '@/components/ui/combobox';
import {
  Boxes,
  Plus,
  Search,
  ClipboardCheck,
  Trash2,
  Pencil,
  AlertTriangle,
  X,
  CheckCircle2,
  Scale,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';

const cleanNumStr = (val: any, fallback = '0') => {
  if (val === null || val === undefined || val === '') return fallback;
  const num = Number(val);
  if (isNaN(num)) return fallback;
  return String(Number(num.toFixed(4)));
};

const parseCleanNumber = (val: string) => {
  if (!val) return 0;
  const normalized = String(val).replace(',', '.');
  const n = parseFloat(normalized);
  return isNaN(n) ? 0 : n;
};

export function AdminInventoryView() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'CRITICAL' | 'SAFE'>('ALL');
  const [filterUnit, setFilterUnit] = useState<string>('ALL');

  // Stock Opname Modal State
  const [isOpnameModalOpen, setIsOpnameModalOpen] = useState(false);
  const [opnameSearch, setOpnameSearch] = useState('');
  const [opnameCounts, setOpnameCounts] = useState<{ [id: string]: string }>({});
  const [opnameNotes, setOpnameNotes] = useState<{ [id: string]: string }>({});
  const [isSubmittingOpname, setIsSubmittingOpname] = useState(false);

  // Wastage Modal State
  const [isWastageModalOpen, setIsWastageModalOpen] = useState(false);
  const [wasteIngredientId, setWasteIngredientId] = useState('');
  const [wasteQuantity, setWasteQuantity] = useState('');
  const [wasteReason, setWasteReason] = useState('Kedaluwarsa / Rusak');
  const [wasteError, setWasteError] = useState('');
  const [isSubmittingWastage, setIsSubmittingWastage] = useState(false);

  // Add / Edit Ingredient Modal State
  const [isIngModalOpen, setIsIngModalOpen] = useState(false);
  const [editingIng, setEditingIng] = useState<Ingredient | null>(null);
  const [ingCode, setIngCode] = useState('');
  const [ingName, setIngName] = useState('');
  const [ingUsageUnit, setIngUsageUnit] = useState<'gram' | 'ml' | 'pcs'>('gram');
  const [ingPurchaseUnit, setIngPurchaseUnit] = useState('kg');
  const [ingConversionRate, setIngConversionRate] = useState('1000');
  const [ingPurchasePrice, setIngPurchasePrice] = useState('150000');
  const [ingUnitCost, setIngUnitCost] = useState('150');
  const [ingStockActual, setIngStockActual] = useState('0');
  const [ingSafeStock, setIngSafeStock] = useState('500');
  const [ingError, setIngError] = useState('');
  const [isSubmittingIng, setIsSubmittingIng] = useState(false);

  // Delete Confirmation Modal State
  const [deleteIngTarget, setDeleteIngTarget] = useState<Ingredient | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [isDeletingIng, setIsDeletingIng] = useState(false);

  // Memoized options for Combobox
  const ingredientOptions = useMemo(() => {
    return ingredients.map((ing) => ({
      value: ing.id,
      label: ing.name,
      subLabel: `${ing.code ? ing.code + ' • ' : ''}Saldo: ${Number(ing.stock_actual).toLocaleString('id-ID')} ${ing.usage_unit}`,
      badge: ing.usage_unit,
      keywords: [ing.name, ing.code || '', ing.usage_unit || '', ing.purchase_unit || ''],
    }));
  }, [ingredients]);

  // Toast Notification
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ type, text });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
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
      showToast('Gagal memuat data inventaris.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Dual-sync handlers for Harga Beli & HPP
  const handlePurchasePriceChange = (val: string) => {
    setIngPurchasePrice(val);
    const p = parseCleanNumber(val);
    const rate = parseCleanNumber(ingConversionRate) || 1;
    setIngUnitCost(cleanNumStr(p / rate, '0'));
  };

  const handleUnitCostChange = (val: string) => {
    setIngUnitCost(val);
    const u = parseCleanNumber(val);
    const rate = parseCleanNumber(ingConversionRate) || 1;
    setIngPurchasePrice(cleanNumStr(u * rate, '0'));
  };

  const handleConversionRateChange = (val: string) => {
    setIngConversionRate(val);
    const rate = parseCleanNumber(val) || 1;
    const p = parseCleanNumber(ingPurchasePrice);
    if (p > 0) {
      setIngUnitCost(cleanNumStr(p / rate, '0'));
    }
  };

  const handleUsageUnitChange = (unit: 'gram' | 'ml' | 'pcs') => {
    setIngUsageUnit(unit);
    let purch = 'kg';
    let rate = 1000;
    if (unit === 'ml') {
      purch = 'liter';
      rate = 1000;
    } else if (unit === 'pcs') {
      purch = 'pcs';
      rate = 1;
    }
    setIngPurchaseUnit(purch);
    setIngConversionRate(String(rate));
    const p = parseCleanNumber(ingPurchasePrice);
    if (p > 0) {
      setIngUnitCost(cleanNumStr(p / rate, '0'));
    }
  };

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
    setOpnameSearch('');
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
        showToast('Stok opname berhasil disimpan.');
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
    setWasteIngredientId(preselectedId || (ingredients[0]?.id ?? ''));
    setWasteQuantity('');
    setWasteReason('Kedaluwarsa / Rusak');
    setWasteError('');
    setIsWastageModalOpen(true);
  };

  const handleSubmitWastage = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseCleanNumber(wasteQuantity);
    if (!wasteIngredientId || qty <= 0) {
      setWasteError('Pilih bahan dan masukkan jumlah yang valid (> 0).');
      return;
    }

    setIsSubmittingWastage(true);
    try {
      const res = await api.inventory.recordWastage({
        ingredientId: wasteIngredientId,
        quantity: qty,
        reason: wasteReason,
      });

      if (res.success) {
        showToast('Limbah bahan berhasil dicatat.');
        setIsWastageModalOpen(false);
        loadData();
      }
    } catch (err: any) {
      setWasteError(err.message || 'Gagal mencatat limbah.');
    } finally {
      setIsSubmittingWastage(false);
    }
  };

  // Add / Edit Handlers
  const openAddModal = () => {
    setEditingIng(null);
    setIngCode(`ING-${Math.floor(1000 + Math.random() * 9000)}`);
    setIngName('');
    setIngUsageUnit('gram');
    setIngPurchaseUnit('kg');
    setIngConversionRate('1000');
    setIngPurchasePrice('150000');
    setIngUnitCost('150');
    setIngStockActual('0');
    setIngSafeStock('500');
    setIngError('');
    setIsIngModalOpen(true);
  };

  const openEditModal = (ing: Ingredient) => {
    setEditingIng(ing);
    setIngCode(ing.code);
    setIngName(ing.name);
    setIngUsageUnit(ing.usage_unit);
    setIngPurchaseUnit(ing.purchase_unit);
    const conv = Number(ing.conversion_rate) || 1000;
    const unitC = Number(ing.unit_cost) || 0;
    const purchPrice = Math.round(unitC * conv);

    setIngConversionRate(cleanNumStr(conv, '1000'));
    setIngUnitCost(cleanNumStr(unitC, '150'));
    setIngPurchasePrice(cleanNumStr(purchPrice, '150000'));
    setIngStockActual(cleanNumStr(ing.stock_actual, '0'));
    setIngSafeStock(cleanNumStr(ing.safe_stock, '500'));
    setIngError('');
    setIsIngModalOpen(true);
  };

  const handleSaveIngredient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ingCode.trim() || !ingName.trim()) {
      setIngError('Kode dan nama bahan baku wajib diisi.');
      return;
    }

    setIsSubmittingIng(true);
    try {
      const payload = {
        code: ingCode.trim().toUpperCase(),
        name: ingName.trim(),
        usage_unit: ingUsageUnit,
        purchase_unit: ingPurchaseUnit.trim(),
        conversion_rate: parseCleanNumber(ingConversionRate),
        stock_actual: parseCleanNumber(ingStockActual),
        safe_stock: parseCleanNumber(ingSafeStock),
        unit_cost: parseCleanNumber(ingUnitCost),
      };

      if (editingIng) {
        const res = await api.inventory.update(editingIng.id, payload);
        if (res.success) {
          showToast(`Bahan baku "${payload.name}" diperbarui.`);
          setIsIngModalOpen(false);
          loadData();
        }
      } else {
        const res = await api.inventory.create(payload);
        if (res.success) {
          showToast(`Bahan baku "${payload.name}" ditambahkan.`);
          setIsIngModalOpen(false);
          loadData();
        }
      }
    } catch (err: any) {
      setIngError(err.message || 'Gagal menyimpan bahan.');
    } finally {
      setIsSubmittingIng(false);
    }
  };

  // Delete Handler
  const handleDeleteIngredient = async () => {
    if (!deleteIngTarget) return;
    setIsDeletingIng(true);
    setDeleteError('');
    try {
      const res = await api.inventory.delete(deleteIngTarget.id);
      if (res.success) {
        showToast(res.message || `Bahan baku "${deleteIngTarget.name}" dihapus.`);
        setDeleteIngTarget(null);
        loadData();
      }
    } catch (err: any) {
      setDeleteError(err.message || 'Gagal menghapus bahan.');
    } finally {
      setIsDeletingIng(false);
    }
  };

  // Metrics Calculations
  const metrics = useMemo(() => {
    const totalIngredients = ingredients.length;
    let outOfStock = 0;
    let lowStock = 0;
    let safeCount = 0;
    let totalValue = 0;

    let gramCount = 0;
    let mlCount = 0;
    let pcsCount = 0;

    ingredients.forEach((ing) => {
      const actual = Number(ing.stock_actual);
      const safe = Number(ing.safe_stock);
      const cost = Number(ing.unit_cost);

      totalValue += actual * cost;

      if (actual <= 0) {
        outOfStock++;
      } else if (actual <= safe) {
        lowStock++;
      } else {
        safeCount++;
      }

      if (ing.usage_unit === 'gram') gramCount++;
      else if (ing.usage_unit === 'ml') mlCount++;
      else if (ing.usage_unit === 'pcs') pcsCount++;
    });

    const criticalCount = outOfStock + lowStock;
    const safePercentage = totalIngredients > 0 ? Math.round((safeCount / totalIngredients) * 100) : 100;

    return {
      totalIngredients,
      outOfStock,
      lowStock,
      criticalCount,
      safeCount,
      safePercentage,
      totalValue,
      gramCount,
      mlCount,
      pcsCount,
    };
  }, [ingredients]);

  // Filtered ingredients
  const filteredIngredients = useMemo(() => {
    return ingredients.filter((ing) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        ing.name.toLowerCase().includes(q) ||
        ing.code.toLowerCase().includes(q);

      const actual = Number(ing.stock_actual);
      const safe = Number(ing.safe_stock);
      const isCritical = actual <= safe;

      const matchesStatus =
        filterStatus === 'ALL' ||
        (filterStatus === 'CRITICAL' && isCritical) ||
        (filterStatus === 'SAFE' && !isCritical);

      const matchesUnit = filterUnit === 'ALL' || ing.usage_unit === filterUnit;

      return matchesSearch && matchesStatus && matchesUnit;
    });
  }, [ingredients, searchQuery, filterStatus, filterUnit]);

  // Selected wastage item info
  const selectedWasteIng = useMemo(() => {
    return ingredients.find((i) => i.id === wasteIngredientId);
  }, [ingredients, wasteIngredientId]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '80px' }}>
      {/* Toast Alert Banner */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '24px',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '12px 18px',
            borderRadius: '10px',
            background: toastMessage.type === 'success' ? '#15803d' : '#b91c1c',
            color: '#ffffff',
            boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
            fontSize: '13px',
            fontWeight: 600,
          }}
        >
          {toastMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          <span>{toastMessage.text}</span>
          <button
            onClick={() => setToastMessage(null)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#ffffff',
              cursor: 'pointer',
              padding: 0,
              marginLeft: '6px',
            }}
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* 4 KPI Ringkasan Metrik Riil */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))',
          gap: '14px',
        }}
      >
        {/* Card 1: Total Bahan */}
        <div
          style={{
            background: '#ffffff',
            padding: '16px 18px',
            borderRadius: '14px',
            border: '1px solid #e7e8e3',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#64746b' }}>Total Bahan Baku</span>
            <div
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '8px',
                background: '#f2f4ef',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#57695b',
              }}
            >
              <Boxes size={16} />
            </div>
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#1c2826' }}>
            {metrics.totalIngredients} <span style={{ fontSize: '13px', fontWeight: 500, color: '#64746b' }}>Bahan</span>
          </div>
          <div style={{ fontSize: '11px', color: '#8b968f' }}>
            {metrics.gramCount} gram • {metrics.mlCount} ml • {metrics.pcsCount} pcs
          </div>
        </div>

        {/* Card 2: Stok Kritis */}
        <div
          style={{
            background: '#ffffff',
            padding: '16px 18px',
            borderRadius: '14px',
            border: '1px solid #e7e8e3',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#64746b' }}>Perlu Restok</span>
            <div
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '8px',
                background: metrics.criticalCount > 0 ? '#fee2e2' : '#dcfce7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: metrics.criticalCount > 0 ? '#b91c1c' : '#15803d',
              }}
            >
              <AlertTriangle size={16} />
            </div>
          </div>
          <div
            style={{
              fontSize: '22px',
              fontWeight: 800,
              color: metrics.criticalCount > 0 ? '#b91c1c' : '#15803d',
            }}
          >
            {metrics.criticalCount}{' '}
            <span style={{ fontSize: '13px', fontWeight: 500, color: '#64746b' }}>
              {metrics.criticalCount > 0 ? 'Bahan Kritis' : 'Semua Aman'}
            </span>
          </div>
          <div style={{ fontSize: '11px', color: '#8b968f' }}>
            {metrics.outOfStock} Habis • {metrics.lowStock} Menipis
          </div>
        </div>

        {/* Card 3: Nilai Aset */}
        <div
          style={{
            background: '#ffffff',
            padding: '16px 18px',
            borderRadius: '14px',
            border: '1px solid #e7e8e3',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#64746b' }}>Total Nilai Aset</span>
            <div
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '8px',
                background: '#f2f4ef',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#57695b',
              }}
            >
              <Scale size={16} />
            </div>
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#1c2826' }}>
            Rp {Math.round(metrics.totalValue).toLocaleString('id-ID')}
          </div>
          <div style={{ fontSize: '11px', color: '#8b968f' }}>
            Saldo fisik aktual &times; HPP
          </div>
        </div>

        {/* Card 4: Kesehatan Stok */}
        <div
          style={{
            background: '#ffffff',
            padding: '16px 18px',
            borderRadius: '14px',
            border: '1px solid #e7e8e3',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#64746b' }}>Status Stok</span>
            <div
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '8px',
                background: metrics.safePercentage >= 80 ? '#dcfce7' : '#fef3c7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: metrics.safePercentage >= 80 ? '#15803d' : '#b45309',
              }}
            >
              <ShieldCheck size={16} />
            </div>
          </div>
          <div
            style={{
              fontSize: '22px',
              fontWeight: 800,
              color: metrics.safePercentage >= 80 ? '#15803d' : '#b45309',
            }}
          >
            {metrics.safePercentage}%{' '}
            <span style={{ fontSize: '13px', fontWeight: 500, color: '#64746b' }}>Aman</span>
          </div>
          <div style={{ fontSize: '11px', color: '#8b968f' }}>
            {metrics.safeCount} dari {metrics.totalIngredients} bahan aman
          </div>
        </div>
      </div>

      {/* Filter & Action Bar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          background: '#ffffff',
          padding: '10px 16px',
          borderRadius: '12px',
          border: '1px solid #e7e8e3',
        }}
      >
        {/* Left Side: Filter Status & Search */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div
            style={{
              display: 'inline-flex',
              background: '#f4f5f1',
              borderRadius: '8px',
              padding: '2px',
              gap: '2px',
            }}
          >
            <button
              onClick={() => setFilterStatus('ALL')}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                border: 'none',
                background: filterStatus === 'ALL' ? '#57695b' : 'transparent',
                color: filterStatus === 'ALL' ? '#ffffff' : '#64746b',
                fontSize: '11.5px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Semua ({metrics.totalIngredients})
            </button>
            <button
              onClick={() => setFilterStatus('CRITICAL')}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                border: 'none',
                background: filterStatus === 'CRITICAL' ? '#b91c1c' : 'transparent',
                color: filterStatus === 'CRITICAL' ? '#ffffff' : '#64746b',
                fontSize: '11.5px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Kritis ({metrics.criticalCount})
            </button>
            <button
              onClick={() => setFilterStatus('SAFE')}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                border: 'none',
                background: filterStatus === 'SAFE' ? '#15803d' : 'transparent',
                color: filterStatus === 'SAFE' ? '#ffffff' : '#64746b',
                fontSize: '11.5px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Aman ({metrics.safeCount})
            </button>
          </div>

          <div style={{ width: '140px' }}>
            <Select value={filterUnit} onValueChange={setFilterUnit}>
              <SelectTrigger style={{ height: '30px', background: '#ffffff', fontSize: '11.5px' }}>
                <SelectValue placeholder="Semua Satuan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua Satuan</SelectItem>
                <SelectItem value="gram">gram</SelectItem>
                <SelectItem value="ml">ml</SelectItem>
                <SelectItem value="pcs">pcs</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: '#f7f7f5',
              padding: '0 10px',
              borderRadius: '8px',
              border: '1px solid #e2e4dc',
              flex: '1 1 180px',
              minWidth: '150px',
              height: '30px',
            }}
          >
            <Search size={13} color="#64746b" />
            <input
              type="text"
              placeholder="Cari kode atau nama..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: '11.5px',
                color: '#1c2826',
                width: '100%',
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{ background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer', padding: 0 }}
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Right Side: Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={openOpnameModal}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: '6px 12px',
              background: '#f2f4ef',
              color: '#57695b',
              border: '1px solid #dcdfd5',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '12px',
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
              gap: '5px',
              padding: '6px 12px',
              background: '#fff1f0',
              color: '#cf1322',
              border: '1px solid #ffa39e',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '12px',
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
              gap: '5px',
              padding: '6px 14px',
              background: '#57695b',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            <Plus size={14} />
            Tambah Bahan
          </button>
        </div>
      </div>

      {/* Table: Bahan Baku */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '14px',
          border: '1px solid #e7e8e3',
          overflow: 'hidden',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              textAlign: 'left',
              fontSize: '12px',
              whiteSpace: 'nowrap',
            }}
          >
            <thead>
              <tr style={{ background: '#fbfbf9', borderBottom: '1px solid #e7e8e3', color: '#71717a' }}>
                <th style={{ padding: '9px 12px', fontWeight: 600, fontSize: '11.5px' }}>Kode</th>
                <th style={{ padding: '9px 12px', fontWeight: 600, fontSize: '11.5px' }}>Nama Bahan Baku</th>
                <th style={{ padding: '9px 12px', fontWeight: 600, fontSize: '11.5px' }}>Satuan & Konversi</th>
                <th style={{ padding: '9px 12px', fontWeight: 600, fontSize: '11.5px' }}>Stok Aktual</th>
                <th style={{ padding: '9px 12px', fontWeight: 600, fontSize: '11.5px' }}>Batas Aman</th>
                <th style={{ padding: '9px 12px', fontWeight: 600, fontSize: '11.5px' }}>HPP / Satuan</th>
                <th style={{ padding: '9px 12px', fontWeight: 600, fontSize: '11.5px' }}>Total Nilai</th>
                <th style={{ padding: '9px 12px', fontWeight: 600, fontSize: '11.5px' }}>Status</th>
                <th style={{ padding: '9px 14px', fontWeight: 600, fontSize: '11.5px', textAlign: 'right' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={9} style={{ padding: '36px', textAlign: 'center', color: '#64746b' }}>
                    Memuat data inventaris...
                  </td>
                </tr>
              ) : filteredIngredients.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: '36px', textAlign: 'center', color: '#8b968f' }}>
                    Tidak ada bahan baku yang sesuai.
                  </td>
                </tr>
              ) : (
                filteredIngredients.map((ing) => {
                  const actual = Number(ing.stock_actual);
                  const safe = Number(ing.safe_stock);
                  const cost = Number(ing.unit_cost);
                  const totalAssetVal = actual * cost;
                  const isOut = actual <= 0;
                  const isLow = !isOut && actual <= safe;

                  return (
                    <tr
                      key={ing.id}
                      style={{
                        borderBottom: '1px solid #f0f0eb',
                        height: '42px',
                      }}
                    >
                      <td style={{ padding: '8px 12px', verticalAlign: 'middle' }}>
                        <span
                          style={{
                            fontFamily: 'monospace',
                            fontWeight: 700,
                            color: '#1c2826',
                            fontSize: '11.5px',
                            background: '#f2f4ef',
                            padding: '2px 5px',
                            borderRadius: '4px',
                          }}
                        >
                          {ing.code}
                        </span>
                      </td>

                      <td style={{ padding: '8px 12px', verticalAlign: 'middle', fontWeight: 700, color: '#1c2826' }}>
                        {ing.name}
                      </td>

                      <td style={{ padding: '8px 12px', verticalAlign: 'middle', color: '#4b5563' }}>
                        <span>{ing.usage_unit}</span>
                        <span style={{ fontSize: '10.5px', color: '#8b968f', marginLeft: '6px' }}>
                          (1 {ing.purchase_unit} = {Number(ing.conversion_rate).toLocaleString('id-ID')} {ing.usage_unit})
                        </span>
                      </td>

                      <td
                        style={{
                          padding: '8px 12px',
                          verticalAlign: 'middle',
                          fontWeight: 800,
                          color: isOut ? '#b91c1c' : isLow ? '#b45309' : '#15803d',
                        }}
                      >
                        {actual.toLocaleString('id-ID')} {ing.usage_unit}
                      </td>

                      <td style={{ padding: '8px 12px', verticalAlign: 'middle', color: '#6b7280' }}>
                        {safe.toLocaleString('id-ID')} {ing.usage_unit}
                      </td>

                      <td style={{ padding: '8px 12px', verticalAlign: 'middle', fontWeight: 600, color: '#1c2826' }}>
                        Rp {cost.toLocaleString('id-ID')} / {ing.usage_unit}
                      </td>

                      <td style={{ padding: '8px 12px', verticalAlign: 'middle', fontWeight: 700, color: '#1c2826' }}>
                        Rp {Math.round(totalAssetVal).toLocaleString('id-ID')}
                      </td>

                      <td style={{ padding: '8px 12px', verticalAlign: 'middle' }}>
                        {isOut ? (
                          <span
                            style={{
                              padding: '2px 6px',
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
                              padding: '2px 6px',
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
                              padding: '2px 6px',
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

                      <td style={{ padding: '8px 14px', verticalAlign: 'middle', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                          <button
                            type="button"
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
                            title="Catat limbah"
                          >
                            Limbah
                          </button>

                          <button
                            type="button"
                            onClick={() => openEditModal(ing)}
                            style={{
                              padding: '4px 7px',
                              background: '#f7f7f5',
                              color: '#4b5563',
                              border: '1px solid #e2e4dc',
                              borderRadius: '5px',
                              cursor: 'pointer',
                            }}
                            title="Edit bahan"
                          >
                            <Pencil size={12} />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setDeleteIngTarget(ing);
                              setDeleteError('');
                            }}
                            style={{
                              padding: '4px 7px',
                              background: '#fff5f5',
                              color: '#dc2626',
                              border: '1px solid #fed7d7',
                              borderRadius: '5px',
                              cursor: 'pointer',
                            }}
                            title="Hapus bahan"
                          >
                            <Trash2 size={12} />
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

      {/* MODAL: TAMBAH / EDIT BAHAN BAKU (SUPER SIMPLE & MINIMALIS) */}
      {isIngModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.45)',
            backdropFilter: 'blur(2px)',
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
              borderRadius: '16px',
              maxWidth: '520px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 40px rgba(0,0,0,0.18)',
            }}
          >
            {/* Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                borderBottom: '1px solid #e7e8e3',
              }}
            >
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1c2826', margin: 0 }}>
                {editingIng ? 'Edit Bahan Baku' : 'Tambah Bahan Baku'}
              </h3>
              <button
                type="button"
                onClick={() => setIsIngModalOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#64746b',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={handleSaveIngredient}
              style={{
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              }}
            >
              {ingError && (
                <div
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    color: '#b91c1c',
                    fontSize: '12px',
                  }}
                >
                  {ingError}
                </div>
              )}

              {/* Baris 1: Kode & Nama */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                    Kode SKU
                  </label>
                  <input
                    type="text"
                    required
                    value={ingCode}
                    onChange={(e) => setIngCode(e.target.value.toUpperCase())}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: '1px solid #d1d5db',
                      fontSize: '12.5px',
                      fontFamily: 'monospace',
                      fontWeight: 700,
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                    Nama Bahan Baku <span style={{ color: '#b91c1c' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Kopi House Blend"
                    value={ingName}
                    onChange={(e) => setIngName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: '1px solid #d1d5db',
                      fontSize: '12.5px',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              {/* Baris 2: Satuan Pakai, Satuan Beli & Rasio */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1.2fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                    Satuan Pakai (POS)
                  </label>
                  <Select value={ingUsageUnit} onValueChange={(val) => handleUsageUnitChange(val as any)}>
                    <SelectTrigger style={{ width: '100%', height: '36px', background: '#ffffff', borderRadius: '8px', border: '1px solid #d1d5db' }}>
                      <SelectValue placeholder="Pilih Satuan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gram">gram (gr)</SelectItem>
                      <SelectItem value="ml">mililiter (ml)</SelectItem>
                      <SelectItem value="pcs">pieces (pcs)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                    Satuan Beli
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="kg, liter, pack"
                    value={ingPurchaseUnit}
                    onChange={(e) => setIngPurchaseUnit(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: '1px solid #d1d5db',
                      fontSize: '12.5px',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                    Isi per {ingPurchaseUnit || 'Beli'}
                  </label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input
                      type="number"
                      step="any"
                      required
                      value={ingConversionRate}
                      onChange={(e) => handleConversionRateChange(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        paddingRight: '45px',
                        borderRadius: '8px',
                        border: '1px solid #d1d5db',
                        fontSize: '12.5px',
                        fontWeight: 600,
                        outline: 'none',
                      }}
                    />
                    <span style={{ position: 'absolute', right: '8px', fontSize: '11px', color: '#6b7280', fontWeight: 600 }}>
                      {ingUsageUnit}
                    </span>
                  </div>
                </div>
              </div>

              {/* Baris 3: Harga Beli & HPP Otomatis */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                    Harga Beli per {ingPurchaseUnit || 'Satuan'} (Rp)
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="Contoh: 150000"
                    value={ingPurchasePrice}
                    onChange={(e) => handlePurchasePriceChange(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: '1px solid #d1d5db',
                      fontSize: '12.5px',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                    Biaya HPP per {ingUsageUnit} (Rp)
                  </label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input
                      type="number"
                      step="any"
                      required
                      value={ingUnitCost}
                      onChange={(e) => handleUnitCostChange(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        paddingRight: '60px',
                        borderRadius: '8px',
                        border: '1px solid #57695b',
                        background: '#fcfdfb',
                        fontSize: '12.5px',
                        fontWeight: 700,
                        color: '#1c2826',
                        outline: 'none',
                      }}
                    />
                    <span style={{ position: 'absolute', right: '8px', fontSize: '10px', color: '#15803d', fontWeight: 700 }}>
                      Otomatis
                    </span>
                  </div>
                </div>
              </div>

              {/* Baris 4: Batas Aman & Stok Awal */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                    Batas Stok Aman ({ingUsageUnit})
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="500"
                    value={ingSafeStock}
                    onChange={(e) => setIngSafeStock(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: '1px solid #d1d5db',
                      fontSize: '12.5px',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                    {editingIng ? 'Stok Fisik Gudang' : 'Stok Awal'} ({ingUsageUnit})
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="0"
                    value={ingStockActual}
                    onChange={(e) => setIngStockActual(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: '1px solid #d1d5db',
                      fontSize: '12.5px',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              {/* Rangkuman 1 Baris Minimalis */}
              <div
                style={{
                  background: '#f4f6f2',
                  padding: '7px 12px',
                  borderRadius: '7px',
                  border: '1px solid #e2e6de',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '11.5px',
                  color: '#47564a',
                }}
              >
                <span>
                  1 {ingPurchaseUnit} = {Number(ingConversionRate).toLocaleString('id-ID')} {ingUsageUnit}
                </span>
                <strong>
                  HPP: Rp {Math.round(parseCleanNumber(ingUnitCost)).toLocaleString('id-ID')} / {ingUsageUnit}
                </strong>
              </div>

              {/* Tombol Aksi */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
                <button
                  type="button"
                  onClick={() => setIsIngModalOpen(false)}
                  style={{
                    padding: '7px 14px',
                    background: '#f0f0eb',
                    border: '1px solid #dcdfd5',
                    borderRadius: '8px',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    color: '#4b5563',
                    cursor: 'pointer',
                  }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingIng}
                  style={{
                    padding: '7px 18px',
                    background: '#57695b',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {isSubmittingIng ? 'Menyimpan...' : editingIng ? 'Perbarui Bahan' : 'Simpan Bahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: STOK OPNAME FISIK (MINIMALIS) */}
      {isOpnameModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.45)',
            backdropFilter: 'blur(2px)',
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
              borderRadius: '16px',
              maxWidth: '780px',
              width: '100%',
              maxHeight: '88vh',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 40px rgba(0,0,0,0.18)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                borderBottom: '1px solid #e7e8e3',
              }}
            >
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1c2826', margin: 0 }}>
                Stok Opname Fisik
              </h3>
              <button
                type="button"
                onClick={() => setIsOpnameModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#64746b', cursor: 'pointer', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            <div
              style={{
                padding: '10px 20px',
                background: '#fbfbf9',
                borderBottom: '1px solid #e7e8e3',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#ffffff',
                  padding: '0 10px',
                  borderRadius: '7px',
                  border: '1px solid #e2e4dc',
                  width: '240px',
                  height: '30px',
                }}
              >
                <Search size={13} color="#64746b" />
                <input
                  type="text"
                  placeholder="Cari bahan..."
                  value={opnameSearch}
                  onChange={(e) => setOpnameSearch(e.target.value)}
                  style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '11.5px', width: '100%' }}
                />
              </div>
              <span style={{ fontSize: '11.5px', color: '#64746b' }}>{ingredients.length} Bahan Baku</span>
            </div>

            <div style={{ padding: '16px 20px', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', whiteSpace: 'nowrap' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e7e8e3', color: '#64746b' }}>
                    <th style={{ textAlign: 'left', padding: '8px', fontSize: '11.5px', fontWeight: 600 }}>Bahan</th>
                    <th style={{ textAlign: 'right', padding: '8px', fontSize: '11.5px', fontWeight: 600 }}>Stok Sistem</th>
                    <th style={{ textAlign: 'center', padding: '8px', width: '130px', fontSize: '11.5px', fontWeight: 600 }}>Hitung Fisik</th>
                    <th style={{ textAlign: 'right', padding: '8px', fontSize: '11.5px', fontWeight: 600 }}>Selisih</th>
                    <th style={{ textAlign: 'left', padding: '8px', fontSize: '11.5px', fontWeight: 600 }}>Catatan</th>
                  </tr>
                </thead>
                <tbody>
                  {ingredients
                    .filter((ing) => {
                      if (!opnameSearch.trim()) return true;
                      const q = opnameSearch.toLowerCase();
                      return ing.name.toLowerCase().includes(q) || ing.code.toLowerCase().includes(q);
                    })
                    .map((ing) => {
                      const sysVal = Number(ing.stock_actual);
                      const countVal = Number(opnameCounts[ing.id] ?? sysVal);
                      const diff = countVal - sysVal;

                      return (
                        <tr key={ing.id} style={{ borderBottom: '1px solid #f0f0eb' }}>
                          <td style={{ padding: '8px', fontWeight: 600, color: '#1c2826' }}>
                            {ing.name}{' '}
                            <span style={{ fontSize: '10.5px', color: '#8b968f' }}>({ing.usage_unit})</span>
                          </td>
                          <td style={{ textAlign: 'right', padding: '8px', color: '#64746b' }}>
                            {sysVal.toLocaleString('id-ID')}
                          </td>
                          <td style={{ textAlign: 'center', padding: '8px' }}>
                            <input
                              type="number"
                              step="any"
                              value={opnameCounts[ing.id] ?? sysVal}
                              onChange={(e) => setOpnameCounts({ ...opnameCounts, [ing.id]: e.target.value })}
                              style={{
                                width: '100%',
                                padding: '5px 8px',
                                borderRadius: '6px',
                                border: '1px solid #ccd1c4',
                                textAlign: 'center',
                                fontWeight: 700,
                                fontSize: '12.5px',
                                outline: 'none',
                              }}
                            />
                          </td>
                          <td
                            style={{
                              textAlign: 'right',
                              padding: '8px',
                              fontWeight: 700,
                              color: diff === 0 ? '#15803d' : diff > 0 ? '#0284c7' : '#b91c1c',
                            }}
                          >
                            {diff === 0 ? '0' : diff > 0 ? `+${diff.toLocaleString('id-ID')}` : diff.toLocaleString('id-ID')}
                          </td>
                          <td style={{ padding: '8px' }}>
                            <input
                              type="text"
                              placeholder="Alasan..."
                              value={opnameNotes[ing.id] ?? ''}
                              onChange={(e) => setOpnameNotes({ ...opnameNotes, [ing.id]: e.target.value })}
                              style={{
                                width: '100%',
                                padding: '5px 8px',
                                borderRadius: '6px',
                                border: '1px solid #e2e4dc',
                                fontSize: '11.5px',
                                outline: 'none',
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
                gap: '8px',
                padding: '12px 20px',
                borderTop: '1px solid #e7e8e3',
                background: '#fbfbf9',
              }}
            >
              <button
                type="button"
                onClick={() => setIsOpnameModalOpen(false)}
                style={{
                  padding: '7px 14px',
                  background: '#f0f0eb',
                  border: '1px solid #dcdfd5',
                  borderRadius: '8px',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  color: '#4b5563',
                  cursor: 'pointer',
                }}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSubmitOpname}
                disabled={isSubmittingOpname}
                style={{
                  padding: '7px 18px',
                  background: '#57695b',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '12.5px',
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

      {/* MODAL: PENCATATAN LIMBAH (MINIMALIS) */}
      {isWastageModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.45)',
            backdropFilter: 'blur(2px)',
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
              borderRadius: '16px',
              maxWidth: '440px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 40px rgba(0,0,0,0.18)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                borderBottom: '1px solid #e7e8e3',
              }}
            >
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1c2826', margin: 0 }}>
                Catat Limbah Bahan
              </h3>
              <button
                type="button"
                onClick={() => setIsWastageModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#64746b', cursor: 'pointer', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitWastage} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {wasteError && (
                <div style={{ padding: '8px 12px', borderRadius: '7px', background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', fontSize: '12px' }}>
                  {wasteError}
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                  Pilih Bahan Baku <span style={{ color: '#b91c1c' }}>*</span>
                </label>
                <Combobox
                  options={ingredientOptions}
                  value={wasteIngredientId}
                  onChange={setWasteIngredientId}
                  placeholder="Pilih atau cari bahan baku..."
                  searchPlaceholder="Ketik nama bahan atau kode..."
                  emptyMessage="Bahan baku tidak ditemukan."
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                  Jumlah Terbuang ({selectedWasteIng?.usage_unit || 'satuan'}) <span style={{ color: '#b91c1c' }}>*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="Contoh: 250"
                  value={wasteQuantity}
                  onChange={(e) => setWasteQuantity(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    fontSize: '12.5px',
                    outline: 'none',
                  }}
                />
                {selectedWasteIng && parseCleanNumber(wasteQuantity) > 0 && (
                  <span style={{ display: 'block', fontSize: '11px', color: '#b91c1c', marginTop: '4px' }}>
                    Kerugian: Rp {Math.round(parseCleanNumber(wasteQuantity) * Number(selectedWasteIng.unit_cost)).toLocaleString('id-ID')}
                  </span>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                  Alasan Limbah
                </label>
                <Select value={wasteReason} onValueChange={setWasteReason}>
                  <SelectTrigger style={{ width: '100%', height: '36px', background: '#ffffff', borderRadius: '8px', border: '1px solid #d1d5db' }}>
                    <SelectValue placeholder="Pilih Alasan Limbah" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Kedaluwarsa / Rusak">Kedaluwarsa / Rusak</SelectItem>
                    <SelectItem value="Tumpah saat Barista Brewing">Tumpah saat Barista Brewing</SelectItem>
                    <SelectItem value="Salah Takaran / Reject QC">Salah Takaran / Reject QC</SelectItem>
                    <SelectItem value="Kemasan Rusak / Bocor">Kemasan Rusak / Bocor</SelectItem>
                    <SelectItem value="Kalibrasi Mesin & Trial">Kalibrasi Mesin & Trial</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setIsWastageModalOpen(false)}
                  style={{
                    padding: '7px 14px',
                    background: '#f0f0eb',
                    border: '1px solid #dcdfd5',
                    borderRadius: '8px',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    color: '#4b5563',
                    cursor: 'pointer',
                  }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingWastage}
                  style={{
                    padding: '7px 16px',
                    background: '#dc2626',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {isSubmittingWastage ? 'Mencatat...' : 'Catat & Kurangi Stok'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: KONFIRMASI HAPUS */}
      {deleteIngTarget && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.45)',
            backdropFilter: 'blur(2px)',
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
              borderRadius: '16px',
              maxWidth: '400px',
              width: '100%',
              boxShadow: '0 20px 40px rgba(0,0,0,0.18)',
              padding: '20px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  background: '#fee2e2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#b91c1c',
                  flexShrink: 0,
                }}
              >
                <Trash2 size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#1c2826', margin: 0 }}>
                  Hapus Bahan Baku?
                </h3>
                <span style={{ fontSize: '11px', color: '#687768' }}>Tindakan ini tidak dapat dibatalkan</span>
              </div>
            </div>

            <p style={{ fontSize: '12.5px', color: '#4b5563', lineHeight: '1.4', margin: '0 0 14px 0' }}>
              Apakah Anda yakin ingin menghapus bahan baku{' '}
              <strong style={{ color: '#1c2826' }}>{deleteIngTarget.name}</strong> ({deleteIngTarget.code})?
            </p>

            {deleteError && (
              <div
                style={{
                  padding: '8px 10px',
                  borderRadius: '7px',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#b91c1c',
                  fontSize: '11.5px',
                  lineHeight: '1.4',
                  marginBottom: '14px',
                }}
              >
                {deleteError}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                onClick={() => {
                  setDeleteIngTarget(null);
                  setDeleteError('');
                }}
                style={{
                  padding: '6px 14px',
                  background: '#f0f0eb',
                  border: '1px solid #dcdfd5',
                  borderRadius: '7px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#4b5563',
                  cursor: 'pointer',
                }}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteIngredient}
                disabled={isDeletingIng}
                style={{
                  padding: '6px 16px',
                  background: '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '7px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {isDeletingIng ? 'Menghapus...' : 'Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
