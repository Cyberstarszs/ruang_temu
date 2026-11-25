'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Product, Ingredient, ProductRecipeItem } from '@/types';
import {
  Coffee,
  Plus,
  Search,
  SlidersHorizontal,
  Flame,
  Check,
  X,
  AlertCircle,
  Pencil,
  Trash2,
  Boxes,
  RotateCcw,
  UploadCloud,
  ImageIcon,
  Loader2,
  ChevronDown,
} from 'lucide-react';

export function AdminProductsView() {
  const [products, setProducts] = useState<Product[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Recipe Formulation Modal
  const [formulatingProduct, setFormulatingProduct] = useState<Product | null>(null);
  const [currentRecipes, setCurrentRecipes] = useState<ProductRecipeItem[]>([]);
  const [recipeTotalHpp, setRecipeTotalHpp] = useState(0);
  const [isRecipeLoading, setIsRecipeLoading] = useState(false);
  const [newIngredientId, setNewIngredientId] = useState('');
  const [newIngredientQty, setNewIngredientQty] = useState('');
  const [newIsPackaging, setNewIsPackaging] = useState(false);
  const [ingredientSearch, setIngredientSearch] = useState('');
  const [isIngredientDropdownOpen, setIsIngredientDropdownOpen] = useState(false);

  // Add / Edit Product Modal
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formSku, setFormSku] = useState('');
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<'Kopi' | 'Non-Kopi' | 'Makanan' | 'Camilan' | 'Add-on'>('Kopi');
  const [formPrice, setFormPrice] = useState('');
  const [formPrintTarget, setFormPrintTarget] = useState<'BAR_PRINTER' | 'KITCHEN_PRINTER' | 'NONE'>('BAR_PRINTER');
  const [formIsFavorite, setFormIsFavorite] = useState(false);
  const [formImageUrl, setFormImageUrl] = useState('');
  const [showManualUrlInput, setShowManualUrlInput] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [modalError, setModalError] = useState('');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [prodRes, ingRes] = await Promise.all([
        api.products.getAll(),
        api.inventory.getAll(),
      ]);
      if (prodRes.success && prodRes.data) {
        setProducts(prodRes.data);
      }
      if (ingRes.success && ingRes.data) {
        setIngredients(ingRes.data);
      }
    } catch (err) {
      console.error('Failed to load products/ingredients:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleSoldOut = async (product: Product) => {
    try {
      const newStatus = !product.is_force_sold_out;
      const res = await api.products.toggleSoldOut(product.id, newStatus);
      if (res.success) {
        setProducts((prev) =>
          prev.map((p) =>
            p.id === product.id
              ? { ...p, is_force_sold_out: newStatus, isSoldOut: newStatus || p.is_auto_sold_out }
              : p
          )
        );
      }
    } catch (err: any) {
      alert(err.message || 'Gagal mengubah status ketersediaan.');
    }
  };

  // Recipe Formulation Handlers
  const openRecipeModal = async (product: Product) => {
    setFormulatingProduct(product);
    setIsRecipeLoading(true);
    setNewIngredientId('');
    setNewIngredientQty('');
    setNewIsPackaging(false);
    setIngredientSearch('');
    setIsIngredientDropdownOpen(false);
    try {
      const res = await api.products.getRecipes(product.id);
      if (res.success && res.data) {
        setCurrentRecipes(res.data.recipes);
        setRecipeTotalHpp(res.data.totalHpp);
      }
    } catch (err) {
      console.error('Failed to fetch recipes:', err);
    } finally {
      setIsRecipeLoading(false);
    }
  };

  const handleAddRecipeIngredient = () => {
    if (!newIngredientId || !newIngredientQty || Number(newIngredientQty) <= 0) {
      alert('Pilih bahan baku dan masukkan takaran valid (> 0).');
      return;
    }

    const ing = ingredients.find((i) => i.id === newIngredientId);
    if (!ing) return;

    const qty = Number(newIngredientQty);
    const cost = Number(ing.unit_cost);
    const itemHpp = qty * cost;

    const existingIndex = currentRecipes.findIndex((r) => r.ingredient_id === newIngredientId);
    if (existingIndex >= 0) {
      const updated = [...currentRecipes];
      updated[existingIndex] = {
        ...updated[existingIndex],
        quantity: qty,
        item_hpp: itemHpp,
        is_packaging_only: newIsPackaging,
      };
      setCurrentRecipes(updated);
    } else {
      const newItem: ProductRecipeItem = {
        id: `temp-${Date.now()}`,
        product_id: formulatingProduct!.id,
        ingredient_id: ing.id,
        ingredient_name: ing.name,
        ingredient_code: ing.code,
        usage_unit: ing.usage_unit,
        unit_cost: cost,
        quantity: qty,
        item_hpp: itemHpp,
        is_packaging_only: newIsPackaging,
      };
      setCurrentRecipes([...currentRecipes, newItem]);
    }

    setNewIngredientId('');
    setNewIngredientQty('');
    setNewIsPackaging(false);
    setIngredientSearch('');
    setIsIngredientDropdownOpen(false);
  };

  const handleRemoveRecipeIngredient = (ingredientId: string) => {
    setCurrentRecipes(currentRecipes.filter((r) => r.ingredient_id !== ingredientId));
  };

  const handleSaveRecipes = async () => {
    if (!formulatingProduct) return;
    try {
      const payload = currentRecipes.map((r) => ({
        ingredient_id: r.ingredient_id,
        quantity: Number(r.quantity),
        is_packaging_only: Boolean(r.is_packaging_only),
      }));

      const res = await api.products.updateRecipes(formulatingProduct.id, payload);
      if (res.success) {
        alert('Resep dan takaran HPP produk berhasil disimpan!');
        setFormulatingProduct(null);
        loadData();
      }
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan resep.');
    }
  };

  // Product Add / Edit Handlers
  const openAddProductModal = () => {
    setEditingProduct(null);
    setFormSku(`SKU-${Date.now().toString().slice(-4)}`);
    setFormName('');
    setFormCategory('Kopi');
    setFormPrice('');
    setFormPrintTarget('BAR_PRINTER');
    setFormIsFavorite(false);
    setFormImageUrl('');
    setShowManualUrlInput(false);
    setModalError('');
    setIsProductModalOpen(true);
  };

  const openEditProductModal = (product: Product) => {
    setEditingProduct(product);
    setFormSku(product.sku);
    setFormName(product.name);
    setFormCategory(product.category as any);
    setFormPrice(product.price.toString());
    setFormPrintTarget(product.print_target as any);
    setFormIsFavorite(Boolean(product.is_favorite));
    setFormImageUrl(product.image_url || '');
    setShowManualUrlInput(false);
    setModalError('');
    setIsProductModalOpen(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setModalError('File yang dipilih harus berupa gambar (JPG, PNG, atau WebP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setModalError('Ukuran file gambar maksimal 5MB.');
      return;
    }

    setModalError('');
    setIsUploadingImage(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = reader.result as string;
        const res = await api.products.uploadImage(base64, file.name);
        if (res.success && res.data?.url) {
          setFormImageUrl(res.data.url);
        } else {
          setModalError(res.message || 'Gagal mengunggah gambar produk.');
        }
      } catch (err: any) {
        setModalError(err.message || 'Terjadi kesalahan saat memproses gambar.');
      } finally {
        setIsUploadingImage(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };
    reader.onerror = () => {
      setModalError('Gagal membaca file gambar.');
      setIsUploadingImage(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formSku.trim() || !formName.trim() || !formPrice) {
      setModalError('SKU, nama produk, dan harga wajib diisi.');
      return;
    }

    try {
      const payload = {
        sku: formSku.trim(),
        name: formName.trim(),
        category: formCategory,
        price: Number(formPrice),
        print_target: formPrintTarget,
        is_favorite: formIsFavorite,
        image_url: formImageUrl.trim() || null,
      };

      if (editingProduct) {
        const res = await api.products.update(editingProduct.id, payload);
        if (res.success) {
          setIsProductModalOpen(false);
          loadData();
        }
      } else {
        const res = await api.products.create(payload);
        if (res.success) {
          setIsProductModalOpen(false);
          loadData();
        }
      }
    } catch (err: any) {
      setModalError(err.message || 'Gagal menyimpan produk.');
    }
  };

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'ALL' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = ['ALL', 'Kopi', 'Non-Kopi', 'Makanan', 'Camilan', 'Add-on'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '60px' }}>
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
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{
                padding: '5px 12px',
                borderRadius: '8px',
                border: selectedCategory === cat ? '1px solid #57695b' : '1px solid #e2e4dc',
                background: selectedCategory === cat ? '#57695b' : '#f7f7f5',
                color: selectedCategory === cat ? '#ffffff' : '#4b5563',
                fontSize: '12.5px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {cat === 'ALL' ? 'Semua' : cat}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: '#f7f7f5',
              padding: '6px 12px',
              borderRadius: '8px',
              border: '1px solid #e2e4dc',
              minWidth: '280px',
            }}
          >
            <Search size={14} color="#71717a" />
            <input
              type="text"
              placeholder="Cari SKU atau nama menu..."
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
            onClick={openAddProductModal}
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
            Tambah Menu
          </button>
        </div>
      </div>

      {/* Products Table */}
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
                <th style={{ padding: '9px 12px', fontWeight: 600, fontSize: '11.5px', width: '48px' }}>Foto</th>
                <th style={{ padding: '9px 12px', fontWeight: 600, fontSize: '11.5px' }}>SKU</th>
                <th style={{ padding: '9px 12px', fontWeight: 600, fontSize: '11.5px' }}>Nama Menu</th>
                <th style={{ padding: '9px 12px', fontWeight: 600, fontSize: '11.5px' }}>Kategori</th>
                <th style={{ padding: '9px 12px', fontWeight: 600, fontSize: '11.5px' }}>Harga Jual</th>
                <th style={{ padding: '9px 12px', fontWeight: 600, fontSize: '11.5px' }}>Target Station</th>
                <th style={{ padding: '9px 12px', fontWeight: 600, fontSize: '11.5px' }}>Ketersediaan</th>
                <th style={{ padding: '9px 14px', fontWeight: 600, fontSize: '11.5px', textAlign: 'right' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} style={{ padding: '36px', textAlign: 'center', color: '#64746b' }}>
                    Memuat data menu...
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '36px', textAlign: 'center', color: '#8b968f', fontStyle: 'italic' }}>
                    Tidak ada produk yang sesuai dengan pencarian atau filter.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const isSoldOut = Boolean(p.is_force_sold_out || p.is_auto_sold_out);
                  return (
                    <tr
                      key={p.id}
                      style={{
                        borderBottom: '1px solid #f0f0eb',
                        height: '42px',
                        transition: 'background 0.15s',
                      }}
                    >
                      {/* 0. Foto Thumbnail */}
                      <td style={{ padding: '6px 12px', verticalAlign: 'middle', width: '48px' }}>
                        <div
                          style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '8px',
                            overflow: 'hidden',
                            border: '1px solid #e2e4dc',
                            background: '#f4f4f2',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          {p.image_url ? (
                            <img
                              src={p.image_url}
                              alt={p.name}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              onError={(e) => {
                                (e.currentTarget as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <Coffee size={15} color="#8b968f" />
                          )}
                        </div>
                      </td>

                      {/* 1. SKU */}
                      <td style={{ padding: '8px 12px', verticalAlign: 'middle' }}>
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1c2826', fontSize: '11.5px' }}>
                          {p.sku}
                        </span>
                      </td>

                      {/* 2. Nama Menu */}
                      <td style={{ padding: '8px 12px', verticalAlign: 'middle' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <span
                            style={{
                              fontWeight: 700,
                              color: '#1c2826',
                              maxWidth: '180px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              fontSize: '12px',
                            }}
                            title={p.name}
                          >
                            {p.name}
                          </span>
                          {p.is_favorite && (
                            <span style={{ color: '#d97706', fontSize: '11px' }} title="Produk Favorit">
                              ★
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 3. Kategori */}
                      <td style={{ padding: '8px 12px', verticalAlign: 'middle' }}>
                        <span
                          style={{
                            padding: '2px 7px',
                            borderRadius: '5px',
                            background: '#f2f4ef',
                            color: '#415245',
                            fontWeight: 600,
                            fontSize: '11px',
                          }}
                        >
                          {p.category}
                        </span>
                      </td>

                      {/* 4. Harga Jual */}
                      <td style={{ padding: '8px 12px', verticalAlign: 'middle', fontWeight: 700, color: '#1c2826', fontSize: '12.5px' }}>
                        Rp {Number(p.price).toLocaleString('id-ID')}
                      </td>

                      {/* 5. Target Station */}
                      <td style={{ padding: '8px 12px', verticalAlign: 'middle', color: '#64746b', fontSize: '11.5px' }}>
                        {p.print_target === 'BAR_PRINTER'
                          ? 'Bar (Kopi)'
                          : p.print_target === 'KITCHEN_PRINTER'
                          ? 'Dapur'
                          : 'Tanpa Cetak'}
                      </td>

                      {/* 6. Ketersediaan */}
                      <td style={{ padding: '8px 12px', verticalAlign: 'middle' }}>
                        <button
                          onClick={() => handleToggleSoldOut(p)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '2px 8px',
                            borderRadius: '5px',
                            border: 'none',
                            background: isSoldOut ? '#fee2e2' : '#dcfce7',
                            color: isSoldOut ? '#b91c1c' : '#15803d',
                            fontWeight: 700,
                            fontSize: '10.5px',
                            cursor: 'pointer',
                          }}
                          title="Klik untuk mengubah ketersediaan produk di kasir"
                        >
                          {isSoldOut ? (
                            <>
                              <X size={11} /> Habis
                            </>
                          ) : (
                            <>
                              <Check size={11} /> Tersedia
                            </>
                          )}
                        </button>
                      </td>

                      {/* 7. Aksi */}
                      <td style={{ padding: '8px 14px', verticalAlign: 'middle', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                          <button
                            onClick={() => openRecipeModal(p)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
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
                            <Boxes size={12} /> Resep
                          </button>

                          <button
                            onClick={() => openEditProductModal(p)}
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
                            title="Edit Data Produk"
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

      {/* RECIPE FORMULATION MODAL */}
      {formulatingProduct && (
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
              maxWidth: '680px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            }}
          >
            {/* Modal Header */}
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
                  Formulasi Resep & Kalkulasi HPP
                </h3>
                <div style={{ fontSize: '13px', color: '#57695b', fontWeight: 600, marginTop: '2px' }}>
                  {formulatingProduct.name} ({formulatingProduct.sku}) — Harga Jual: Rp{' '}
                  {Number(formulatingProduct.price).toLocaleString('id-ID')}
                </div>
              </div>
              <button
                onClick={() => setFormulatingProduct(null)}
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

            {/* Modal Content */}
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Costing Summary Banner */}
              {(() => {
                const totalHpp = Math.round(currentRecipes.reduce((sum, r) => sum + r.item_hpp, 0));
                const grossProfit = Math.max(0, formulatingProduct.price - totalHpp);
                const marginPct = formulatingProduct.price > 0 ? ((grossProfit / formulatingProduct.price) * 100).toFixed(1) : '0';
                const zeroCostItems = currentRecipes.filter((r) => Number(r.unit_cost) === 0);

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: '12px',
                        background: '#fbfbf9',
                        padding: '16px',
                        borderRadius: '12px',
                        border: '1px solid #e7e8e3',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '11px', color: '#64746b', textTransform: 'uppercase', fontWeight: 600 }}>
                          Total HPP (Bahan)
                        </div>
                        <div style={{ fontSize: '18px', fontWeight: 800, color: '#1c2826', marginTop: '4px' }}>
                          Rp {totalHpp.toLocaleString('id-ID')}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', color: '#64746b', textTransform: 'uppercase', fontWeight: 600 }}>
                          Laba Kotor / Porsi
                        </div>
                        <div style={{ fontSize: '18px', fontWeight: 800, color: '#2e7d32', marginTop: '4px' }}>
                          Rp {grossProfit.toLocaleString('id-ID')}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', color: '#64746b', textTransform: 'uppercase', fontWeight: 600 }}>
                          Marjin Margin (%)
                        </div>
                        <div style={{ fontSize: '18px', fontWeight: 800, color: '#2e7d32', marginTop: '4px' }}>
                          {marginPct}%
                        </div>
                      </div>
                    </div>

                    {zeroCostItems.length > 0 && (
                      <div
                        style={{
                          padding: '10px 14px',
                          background: '#fffbeb',
                          border: '1px solid #fef08a',
                          borderRadius: '8px',
                          fontSize: '12px',
                          color: '#92400e',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                        }}
                      >
                        <AlertCircle size={16} color="#b45309" style={{ flexShrink: 0 }} />
                        <div>
                          <strong>Peringatan Biaya Satuan Rp 0:</strong> Terdapat{' '}
                          <strong>{zeroCostItems.length} bahan baku</strong> dalam resep ini yang biaya per satuannya masih Rp 0 (belum diatur pada menu Stok). Persentase marjin ({marginPct}%) belum mencerminkan HPP riil.
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Add Ingredient Form with Searchable Combobox */}
              <div
                style={{
                  background: '#f2f4ef',
                  padding: '16px',
                  borderRadius: '12px',
                  border: '1px solid #dce0d5',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#415245' }}>
                  Tambah Takaran Bahan ke Resep
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                  {/* Searchable Combobox */}
                  <div style={{ position: 'relative', flex: '2 1 260px' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: '#ffffff',
                        border: '1px solid #ccd1c4',
                        borderRadius: '8px',
                        padding: '0 10px',
                        height: '38px',
                        cursor: 'pointer',
                      }}
                      onClick={() => setIsIngredientDropdownOpen(true)}
                    >
                      <Search size={14} color="#71717a" style={{ flexShrink: 0 }} />
                      <input
                        type="text"
                        placeholder="Ketik cari bahan baku (nama / kode)..."
                        value={ingredientSearch}
                        onFocus={() => setIsIngredientDropdownOpen(true)}
                        onChange={(e) => {
                          setIngredientSearch(e.target.value);
                          if (newIngredientId) setNewIngredientId('');
                          setIsIngredientDropdownOpen(true);
                        }}
                        style={{
                          border: 'none',
                          background: 'transparent',
                          outline: 'none',
                          fontSize: '13px',
                          width: '100%',
                          color: '#1c2826',
                          fontWeight: newIngredientId ? 600 : 400,
                        }}
                      />
                      {newIngredientId && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setNewIngredientId('');
                            setIngredientSearch('');
                          }}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#9ca3af',
                            cursor: 'pointer',
                            padding: '2px',
                          }}
                        >
                          <X size={13} />
                        </button>
                      )}
                      <ChevronDown size={14} color="#71717a" style={{ flexShrink: 0 }} />
                    </div>

                    {/* Searchable Dropdown Menu */}
                    {isIngredientDropdownOpen && (
                      <>
                        <div
                          style={{ position: 'fixed', inset: 0, zIndex: 99991 }}
                          onClick={() => setIsIngredientDropdownOpen(false)}
                        />
                        <div
                          style={{
                            position: 'absolute',
                            top: '42px',
                            left: 0,
                            right: 0,
                            maxHeight: '220px',
                            overflowY: 'auto',
                            background: '#ffffff',
                            borderRadius: '8px',
                            border: '1px solid #ccd1c4',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                            zIndex: 99992,
                          }}
                        >
                          {ingredients.filter((ing) => {
                            if (!ingredientSearch.trim()) return true;
                            const q = ingredientSearch.toLowerCase();
                            return ing.name.toLowerCase().includes(q) || ing.code.toLowerCase().includes(q);
                          }).length === 0 ? (
                            <div style={{ padding: '12px', fontSize: '12px', color: '#9ca3af', textAlign: 'center', fontStyle: 'italic' }}>
                              Bahan baku tidak ditemukan.
                            </div>
                          ) : (
                            ingredients
                              .filter((ing) => {
                                if (!ingredientSearch.trim()) return true;
                                const q = ingredientSearch.toLowerCase();
                                return ing.name.toLowerCase().includes(q) || ing.code.toLowerCase().includes(q);
                              })
                              .map((ing) => {
                                const cost = Number(ing.unit_cost);
                                const isZeroCost = cost === 0;
                                const isSelected = ing.id === newIngredientId;

                                return (
                                  <div
                                    key={ing.id}
                                    onClick={() => {
                                      setNewIngredientId(ing.id);
                                      setIngredientSearch(`${ing.name} (${ing.code})`);
                                      setIsIngredientDropdownOpen(false);
                                    }}
                                    style={{
                                      padding: '9px 12px',
                                      borderBottom: '1px solid #f0f0eb',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      gap: '8px',
                                      background: isSelected ? '#f2f4ef' : '#ffffff',
                                      fontSize: '12.5px',
                                      transition: 'background 0.1s ease',
                                    }}
                                    onMouseEnter={(e) => {
                                      if (!isSelected) e.currentTarget.style.background = '#f9fafb';
                                    }}
                                    onMouseLeave={(e) => {
                                      if (!isSelected) e.currentTarget.style.background = '#ffffff';
                                    }}
                                  >
                                    <div>
                                      <span style={{ fontWeight: 600, color: '#1c2826' }}>{ing.name}</span>
                                      <span style={{ marginLeft: '6px', fontSize: '11px', color: '#71717a', fontFamily: 'monospace' }}>
                                        ({ing.code})
                                      </span>
                                    </div>
                                    <div>
                                      {!isZeroCost ? (
                                        <span style={{ fontSize: '11.5px', color: '#57695b', fontWeight: 600 }}>
                                          Rp {cost.toLocaleString('id-ID')} / {ing.usage_unit}
                                        </span>
                                      ) : (
                                        <span
                                          style={{
                                            fontSize: '10px',
                                            background: '#fef3c7',
                                            color: '#b45309',
                                            padding: '2px 6px',
                                            borderRadius: '4px',
                                            fontWeight: 700,
                                          }}
                                          title="Bahan ini belum memiliki biaya/satuan di inventaris stok"
                                        >
                                          ⚠️ Biaya Rp 0
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  <input
                    type="number"
                    step="0.1"
                    placeholder="Takaran Qty"
                    value={newIngredientQty}
                    onChange={(e) => setNewIngredientQty(e.target.value)}
                    style={{
                      flex: '1 1 100px',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #ccd1c4',
                      fontSize: '13px',
                      height: '38px',
                      boxSizing: 'border-box',
                    }}
                  />

                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '12px',
                      color: '#415245',
                      cursor: 'pointer',
                      height: '38px',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={newIsPackaging}
                      onChange={(e) => setNewIsPackaging(e.target.checked)}
                    />
                    Hanya Kemasan (Takeaway)
                  </label>

                  <button
                    onClick={handleAddRecipeIngredient}
                    style={{
                      padding: '0 16px',
                      height: '38px',
                      background: '#57695b',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    + Masukkan
                  </button>
                </div>
              </div>

              {/* Recipe Ingredients Table */}
              <div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', whiteSpace: 'nowrap' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e7e8e3', color: '#64746b' }}>
                      <th style={{ textAlign: 'left', padding: '8px 4px' }}>Bahan Baku</th>
                      <th style={{ textAlign: 'center', padding: '8px 4px' }}>Takaran</th>
                      <th style={{ textAlign: 'right', padding: '8px 4px' }}>Biaya/Satuan</th>
                      <th style={{ textAlign: 'right', padding: '8px 4px' }}>Subtotal HPP</th>
                      <th style={{ textAlign: 'center', padding: '8px 4px' }}>Tipe</th>
                      <th style={{ textAlign: 'center', padding: '8px 4px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentRecipes.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: '#8b968f', fontStyle: 'italic' }}>
                          Belum ada bahan baku yang didaftarkan pada resep ini.
                        </td>
                      </tr>
                    ) : (
                      currentRecipes.map((r) => (
                        <tr key={r.ingredient_id} style={{ borderBottom: '1px solid #f0f0eb' }}>
                          <td style={{ padding: '10px 4px', fontWeight: 600, color: '#1c2826' }}>
                            {r.ingredient_name}
                          </td>
                          <td style={{ textAlign: 'center', padding: '10px 4px' }}>
                            {r.quantity} {r.usage_unit}
                          </td>
                          <td style={{ textAlign: 'right', padding: '10px 4px', color: '#64746b' }}>
                            {Number(r.unit_cost) > 0 ? (
                              `Rp ${Number(r.unit_cost).toLocaleString('id-ID')}`
                            ) : (
                              <span
                                style={{
                                  fontSize: '10px',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  background: '#fef3c7',
                                  color: '#b45309',
                                  fontWeight: 700,
                                }}
                                title="Biaya per satuan bahan belum ditentukan di menu Stok"
                              >
                                ⚠️ Biaya Rp 0
                              </span>
                            )}
                          </td>
                          <td style={{ textAlign: 'right', padding: '10px 4px', fontWeight: 700, color: '#1c2826' }}>
                            Rp {Math.round(r.item_hpp).toLocaleString('id-ID')}
                          </td>
                          <td style={{ textAlign: 'center', padding: '10px 4px' }}>
                            <span
                              style={{
                                fontSize: '10px',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                background: r.is_packaging_only ? '#fef3c7' : '#e0f2fe',
                                color: r.is_packaging_only ? '#92400e' : '#0369a1',
                                fontWeight: 600,
                              }}
                            >
                              {r.is_packaging_only ? 'Kemasan' : 'Resep Utama'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center', padding: '10px 4px' }}>
                            <button
                              onClick={() => handleRemoveRecipeIngredient(r.ingredient_id)}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#ef4444',
                                cursor: 'pointer',
                                padding: '4px',
                              }}
                              title="Hapus bahan dari resep"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
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
                onClick={() => setFormulatingProduct(null)}
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
                onClick={handleSaveRecipes}
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
                Simpan Resep & HPP
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD / EDIT PRODUCT MODAL */}
      {isProductModalOpen && (
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
              overflow: 'hidden',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
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
                {editingProduct ? 'Edit Data Menu' : 'Tambah Menu Baru'}
              </h3>
              <button
                onClick={() => setIsProductModalOpen(false)}
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

            <form onSubmit={handleSaveProduct} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {modalError && (
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
                  {modalError}
                </div>
              )}

              {/* Upload Gambar Menu */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#4b5563', marginBottom: '6px' }}>
                  Foto Produk Menu
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  style={{ display: 'none' }}
                  onChange={handleFileUpload}
                />
                {formImageUrl ? (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px',
                      padding: '12px 14px',
                      background: '#f9fafb',
                      borderRadius: '10px',
                      border: '1px solid #e5e7eb',
                    }}
                  >
                    <div
                      style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        border: '1px solid #d1d5db',
                        background: '#f3f4f6',
                        flexShrink: 0,
                      }}
                    >
                      <img
                        src={formImageUrl}
                        alt="Preview Menu"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#1f2937' }}>
                          Foto Terpasang
                        </span>
                        <span style={{ fontSize: '10px', background: '#dcfce7', color: '#15803d', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
                          {formImageUrl.startsWith('/uploads/') ? 'Unggahan Lokal' : 'Tautan Web'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          disabled={isUploadingImage}
                          onClick={() => fileInputRef.current?.click()}
                          style={{
                            padding: '4px 10px',
                            fontSize: '11.5px',
                            fontWeight: 600,
                            background: '#ffffff',
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            color: '#374151',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          {isUploadingImage ? <Loader2 size={12} className="animate-spin" /> : <UploadCloud size={12} />}
                          Ganti Foto
                        </button>
                        <button
                          type="button"
                          disabled={isUploadingImage}
                          onClick={() => {
                            setFormImageUrl('');
                            setShowManualUrlInput(false);
                          }}
                          style={{
                            padding: '4px 10px',
                            fontSize: '11.5px',
                            fontWeight: 600,
                            background: '#fef2f2',
                            border: '1px solid #fecaca',
                            borderRadius: '6px',
                            color: '#b91c1c',
                            cursor: 'pointer',
                          }}
                        >
                          Hapus Foto
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowManualUrlInput(!showManualUrlInput)}
                          style={{
                            padding: '4px 8px',
                            fontSize: '11px',
                            background: 'transparent',
                            border: 'none',
                            color: '#6b7280',
                            cursor: 'pointer',
                            textDecoration: 'underline',
                          }}
                        >
                          {showManualUrlInput ? 'Sembunyikan URL' : 'Edit URL Manual'}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div
                      onClick={() => !isUploadingImage && fileInputRef.current?.click()}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '18px',
                        borderRadius: '10px',
                        border: '1.5px dashed #cbd5e1',
                        background: '#fbfbf9',
                        cursor: isUploadingImage ? 'wait' : 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#57695b'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#cbd5e1'; }}
                    >
                      {isUploadingImage ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                          <Loader2 size={22} color="#57695b" className="animate-spin" />
                          <span style={{ fontSize: '12px', fontWeight: 600, color: '#57695b' }}>
                            Mengunggah foto menu...
                          </span>
                        </div>
                      ) : (
                        <>
                          <UploadCloud size={24} color="#57695b" style={{ marginBottom: '6px' }} />
                          <div style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>
                            Klik untuk Upload Foto Menu
                          </div>
                          <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>
                            Format JPG, PNG, atau WebP (Maksimal 5MB)
                          </div>
                        </>
                      )}
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() => setShowManualUrlInput(!showManualUrlInput)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          fontSize: '11.5px',
                          color: '#57695b',
                          cursor: 'pointer',
                          fontWeight: 600,
                          textDecoration: 'underline',
                        }}
                      >
                        {showManualUrlInput ? 'Tutup Input URL' : 'Atau gunakan tautan URL gambar eksternal'}
                      </button>
                    </div>
                  </div>
                )}

                {showManualUrlInput && (
                  <div style={{ marginTop: '8px', background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                      Tautan URL Gambar Manual (https://...):
                    </label>
                    <input
                      type="text"
                      placeholder="Tempel tautan URL gambar..."
                      value={formImageUrl}
                      onChange={(e) => setFormImageUrl(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        fontSize: '12px',
                        color: '#1e293b',
                        background: '#ffffff',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#4b5563', marginBottom: '6px' }}>
                    SKU Produk
                  </label>
                  <input
                    type="text"
                    required
                    value={formSku}
                    onChange={(e) => setFormSku(e.target.value)}
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
                    Nama Menu
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="cth: Aren Latte Double Shot"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
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
                    Kategori
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as any)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid #d1d5db',
                      fontSize: '13px',
                      background: '#ffffff',
                    }}
                  >
                    <option value="Kopi">Kopi</option>
                    <option value="Non-Kopi">Non-Kopi</option>
                    <option value="Makanan">Makanan</option>
                    <option value="Camilan">Camilan</option>
                    <option value="Add-on">Add-on</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#4b5563', marginBottom: '6px' }}>
                    Harga Bersih (Rp)
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="25000"
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
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

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#4b5563', marginBottom: '6px' }}>
                  Target Cetak Checker (Station)
                </label>
                <select
                  value={formPrintTarget}
                  onChange={(e) => setFormPrintTarget(e.target.value as any)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    fontSize: '13px',
                    background: '#ffffff',
                  }}
                >
                  <option value="BAR_PRINTER">Bar Printer (Station Minuman / Kopi)</option>
                  <option value="KITCHEN_PRINTER">Kitchen Printer (Station Dapur / Makanan)</option>
                  <option value="NONE">Tanpa Cetak Checker</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  id="formFavorite"
                  checked={formIsFavorite}
                  onChange={(e) => setFormIsFavorite(e.target.checked)}
                />
                <label htmlFor="formFavorite" style={{ fontSize: '13px', color: '#374151', cursor: 'pointer' }}>
                  Tandai sebagai Menu Favorit (Tampil prioritas di POS)
                </label>
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
                  onClick={() => setIsProductModalOpen(false)}
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
                  {editingProduct ? 'Perbarui Menu' : 'Simpan Menu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
