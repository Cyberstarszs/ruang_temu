'use client';

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Product, Ingredient, ProductRecipeItem, ProductVariant } from '@/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { NumberInput } from '@/components/ui/number-input';
import {
  Coffee,
  Plus,
  Search,
  X,
  AlertCircle,
  Pencil,
  Trash2,
  UploadCloud,
  Loader2,
  ChevronDown,
} from 'lucide-react';

export function AdminProductsView() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [availabilityFilter, setAvailabilityFilter] = useState<'ALL' | 'AVAILABLE' | 'SOLDOUT'>('ALL');
  const [recipeFilter, setRecipeFilter] = useState<'ALL' | 'HAS_RECIPE' | 'NO_RECIPE'>('ALL');
  const [stationFilter, setStationFilter] = useState<'ALL' | 'BAR_PRINTER' | 'KITCHEN_PRINTER' | 'NONE'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeRecipePopover, setActiveRecipePopover] = useState<string | null>(null);

  // Recipe Formulation & Variant Modal
  const [formulatingProduct, setFormulatingProduct] = useState<Product | null>(null);
  const [activeVariantId, setActiveVariantId] = useState<string | null>(null);
  const [currentRecipes, setCurrentRecipes] = useState<ProductRecipeItem[]>([]);
  const [recipeTotalHpp, setRecipeTotalHpp] = useState(0);
  const [isRecipeLoading, setIsRecipeLoading] = useState(false);
  const [newIngredientId, setNewIngredientId] = useState('');
  const [newIngredientQty, setNewIngredientQty] = useState('');
  const [newIsPackaging, setNewIsPackaging] = useState(false);
  const [ingredientSearch, setIngredientSearch] = useState('');
  const [isIngredientDropdownOpen, setIsIngredientDropdownOpen] = useState(false);
  const [recipeError, setRecipeError] = useState('');
  const [recipeSavedBanner, setRecipeSavedBanner] = useState('');
  const qtyInputRef = useRef<HTMLInputElement | null>(null);

  // Variant inline form inside Recipe modal
  const [isVariantFormOpen, setIsVariantFormOpen] = useState(false);
  const [editingVariantId, setEditingVariantId] = useState<string | null>(null);
  const [variantFormName, setVariantFormName] = useState('');
  const [variantFormPrice, setVariantFormPrice] = useState('');
  const [isSavingVariant, setIsSavingVariant] = useState(false);
  const [confirmDeleteVariantId, setConfirmDeleteVariantId] = useState<string | null>(null);

  // Add / Edit Product Modal
  const [categoryItems, setCategoryItems] = useState<Array<{ name: string; default_print_target?: 'BAR_PRINTER' | 'KITCHEN_PRINTER' | 'NONE' }>>([]);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formSku, setFormSku] = useState('');
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<string>('Kopi');
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isSavingCategory, setIsSavingCategory] = useState(false);
  const [formPrice, setFormPrice] = useState('');
  const [formPrintTarget, setFormPrintTarget] = useState<'BAR_PRINTER' | 'KITCHEN_PRINTER' | 'NONE'>('BAR_PRINTER');
  const [formIsFavorite, setFormIsFavorite] = useState(false);
  const [formImageUrl, setFormImageUrl] = useState('');
  const [showManualUrlInput, setShowManualUrlInput] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [modalError, setModalError] = useState('');

  // Delete Confirmation Modal
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Auto-detect printer station from category
  const getAutoStation = (category: string): 'BAR_PRINTER' | 'KITCHEN_PRINTER' | 'NONE' => {
    const matched = categoryItems.find((c) => c.name === category);
    if (matched?.default_print_target) {
      return matched.default_print_target;
    }
    if (category === 'Makanan' || category === 'Camilan') {
      return 'KITCHEN_PRINTER';
    }
    return 'BAR_PRINTER';
  };

  // Load Initial Data
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [prodRes, ingRes, catRes] = await Promise.all([
        api.products.getAll(),
        api.inventory.getAll(),
        api.products.getCategories().catch(() => ({ success: false, data: [] })),
      ]);
      if (prodRes.success && prodRes.data) {
        setProducts(prodRes.data);
      }
      if (ingRes.success && ingRes.data) {
        setIngredients(ingRes.data);
      }
      if (catRes.success && Array.isArray(catRes.data)) {
        setCategoryItems(catRes.data);
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

  // Quick Toggle Sold Out
  const handleToggleSoldOut = async (product: Product) => {
    try {
      const newStatus = !product.is_force_sold_out;
      // Optimistic Update
      setProducts((prev) =>
        prev.map((p) =>
          p.id === product.id
            ? { ...p, is_force_sold_out: newStatus, isSoldOut: newStatus || p.is_auto_sold_out }
            : p
        )
      );
      const res = await api.products.toggleSoldOut(product.id, newStatus);
      if (!res.success) {
        loadData();
      }
    } catch (err: any) {
      alert(err.message || 'Gagal mengubah status ketersediaan.');
      loadData();
    }
  };

  // Recipe Formulation & Variant Handlers
  const loadRecipeForTarget = async (productId: string, variantId: string | null) => {
    setActiveVariantId(variantId);
    setIsRecipeLoading(true);
    setNewIngredientId('');
    setNewIngredientQty('');
    setNewIsPackaging(false);
    setIngredientSearch('');
    setIsIngredientDropdownOpen(false);
    setRecipeError('');
    setRecipeSavedBanner('');
    setConfirmDeleteVariantId(null);
    try {
      const res = await api.products.getRecipes(productId, variantId);
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

  const openRecipeModal = async (product: Product) => {
    setFormulatingProduct(product);
    setIsVariantFormOpen(false);
    setEditingVariantId(null);
    setVariantFormName('');
    setVariantFormPrice('');
    const initialVariantId =
      (product.recipe_count || 0) === 0 && product.variants && product.variants.length > 0
        ? product.variants[0].id
        : null;
    await loadRecipeForTarget(product.id, initialVariantId);
  };

  const handleOpenAddVariant = () => {
    setEditingVariantId(null);
    setVariantFormName('');
    setVariantFormPrice(formulatingProduct ? String(formulatingProduct.price) : '');
    setIsVariantFormOpen(true);
    setRecipeError('');
    setRecipeSavedBanner('');
    setConfirmDeleteVariantId(null);
  };

  const handleOpenEditVariant = (variant: ProductVariant) => {
    setEditingVariantId(variant.id);
    setVariantFormName(variant.name);
    setVariantFormPrice(String(variant.price));
    setIsVariantFormOpen(true);
    setRecipeError('');
    setRecipeSavedBanner('');
    setConfirmDeleteVariantId(null);
  };

  const handleSaveVariant = async () => {
    if (!formulatingProduct) return;
    const trimmedName = variantFormName.trim();
    const numericPrice = Number(variantFormPrice);
    if (!trimmedName) {
      setRecipeError('Nama varian wajib diisi.');
      return;
    }
    if (!variantFormPrice || Number.isNaN(numericPrice) || numericPrice < 0) {
      setRecipeError('Harga jual varian tidak valid.');
      return;
    }

    setIsSavingVariant(true);
    setRecipeError('');
    try {
      if (editingVariantId) {
        const res = await api.products.updateVariant(formulatingProduct.id, editingVariantId, {
          name: trimmedName,
          price: numericPrice,
        });
        if (res.success && res.data) {
          const updatedVariants = (formulatingProduct.variants || []).map((v) =>
            v.id === editingVariantId ? { ...v, name: trimmedName, price: numericPrice } : v
          );
          setFormulatingProduct({ ...formulatingProduct, variants: updatedVariants });
          setIsVariantFormOpen(false);
          setEditingVariantId(null);
          setRecipeSavedBanner(`Varian "${trimmedName}" diperbarui.`);
          loadData();
        }
      } else {
        const res = await api.products.createVariant(formulatingProduct.id, {
          name: trimmedName,
          price: numericPrice,
        });
        if (res.success && res.data) {
          const newVar: ProductVariant = res.data;
          const updatedVariants = [...(formulatingProduct.variants || []), newVar];
          setFormulatingProduct({ ...formulatingProduct, variants: updatedVariants });
          setIsVariantFormOpen(false);
          setActiveVariantId(newVar.id);
          setCurrentRecipes([]);
          setRecipeTotalHpp(0);
          setRecipeSavedBanner(`Varian "${newVar.name}" dibuat. Silakan isi resepnya.`);
          loadData();
        }
      }
    } catch (err: any) {
      setRecipeError(err.message || 'Gagal menyimpan varian.');
    } finally {
      setIsSavingVariant(false);
    }
  };

  const handleDeleteVariant = async (variantId: string) => {
    if (!formulatingProduct) return;
    setIsSavingVariant(true);
    setRecipeError('');
    try {
      const res = await api.products.deleteVariant(formulatingProduct.id, variantId);
      if (res.success) {
        const remaining = (formulatingProduct.variants || []).filter((v) => v.id !== variantId);
        setFormulatingProduct({ ...formulatingProduct, variants: remaining });
        setConfirmDeleteVariantId(null);
        setIsVariantFormOpen(false);
        const nextTargetId = remaining.length > 0 && (formulatingProduct.recipe_count || 0) === 0
          ? remaining[0].id
          : null;
        await loadRecipeForTarget(formulatingProduct.id, nextTargetId);
        loadData();
      }
    } catch (err: any) {
      setRecipeError(err.message || 'Gagal menghapus varian.');
    } finally {
      setIsSavingVariant(false);
    }
  };

  const selectedIngredientObj = useMemo(() => {
    return ingredients.find((i) => i.id === newIngredientId) || null;
  }, [ingredients, newIngredientId]);

  const handleAddRecipeIngredient = () => {
    if (!newIngredientId || !newIngredientQty || Number(newIngredientQty) <= 0) {
      setRecipeError('Pilih bahan baku dan masukkan takaran yang valid (> 0).');
      return;
    }
    setRecipeError('');

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
    setRecipeError('');
    setRecipeSavedBanner('');
  };

  const handleRemoveRecipeIngredient = (ingredientId: string) => {
    setCurrentRecipes(currentRecipes.filter((r) => r.ingredient_id !== ingredientId));
    setRecipeSavedBanner('');
  };

  const handleSaveRecipes = async () => {
    if (!formulatingProduct) return;
    try {
      const payload = currentRecipes.map((r) => ({
        ingredient_id: r.ingredient_id,
        quantity: Number(r.quantity),
        is_packaging_only: Boolean(r.is_packaging_only),
      }));

      const res = await api.products.updateRecipes(formulatingProduct.id, payload, activeVariantId);
      if (res.success) {
        const savedHpp = Math.round(currentRecipes.reduce((sum, r) => sum + Number(r.item_hpp || 0), 0));
        const savedCount = payload.filter((r) => r.quantity > 0).length;

        if (activeVariantId) {
          const updatedVariants = (formulatingProduct.variants || []).map((v) =>
            v.id === activeVariantId
              ? { ...v, recipe_hpp: savedHpp, recipe_count: savedCount }
              : v
          );
          setFormulatingProduct({ ...formulatingProduct, variants: updatedVariants });
        } else {
          setFormulatingProduct({
            ...formulatingProduct,
            recipe_hpp: savedHpp,
            recipe_count: savedCount,
          });
        }

        setRecipeError('');
        loadData();

        if ((formulatingProduct.variants?.length || 0) > 0) {
          const targetLabel = activeVariantId
            ? formulatingProduct.variants?.find((v) => v.id === activeVariantId)?.name || 'Varian'
            : 'Standar';
          setRecipeSavedBanner(`Resep "${targetLabel}" tersimpan.`);
        } else {
          setFormulatingProduct(null);
        }
      }
    } catch (err: any) {
      setRecipeError(err.message || 'Gagal menyimpan resep.');
    }
  };

  // Product Add / Edit Handlers
  const openAddProductModal = () => {
    setEditingProduct(null);
    setFormSku(`SKU-${Date.now().toString().slice(-4)}`);
    setFormName('');
    const defaultCat = availableCategories[0] || 'Kopi';
    setFormCategory(defaultCat);
    setIsAddingCategory(false);
    setNewCategoryName('');
    setFormPrice('');
    setFormPrintTarget(getAutoStation(defaultCat));
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
    setFormCategory(product.category);
    setIsAddingCategory(false);
    setNewCategoryName('');
    setFormPrice(product.price.toString());
    setFormPrintTarget((product.print_target as any) || getAutoStation(product.category));
    setFormIsFavorite(Boolean(product.is_favorite));
    setFormImageUrl(product.image_url || '');
    setShowManualUrlInput(false);
    setModalError('');
    setIsProductModalOpen(true);
  };

  // Saat kategori diubah, otomatis perbarui target cetak checker
  const handleCategoryChange = (newCat: string) => {
    if (newCat === '__ADD_CATEGORY__') {
      setIsAddingCategory(true);
      setNewCategoryName('');
      setModalError('');
      return;
    }
    setFormCategory(newCat);
    setFormPrintTarget(getAutoStation(newCat));
  };

  const handleSaveNewCategory = async () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) {
      setModalError('Nama kategori baru wajib diisi.');
      return;
    }
    if (trimmed.length > 50) {
      setModalError('Nama kategori maksimal 50 karakter.');
      return;
    }

    const existing = availableCategories.find(
      (c) => c.toLowerCase() === trimmed.toLowerCase()
    );
    if (existing) {
      handleCategoryChange(existing);
      setIsAddingCategory(false);
      setNewCategoryName('');
      setModalError('');
      return;
    }

    setIsSavingCategory(true);
    setModalError('');
    try {
      const res = await api.products.createCategory({
        name: trimmed,
        default_print_target: formPrintTarget,
      });
      if (res.success && res.data) {
        const createdName = res.data.name || trimmed;
        setCategoryItems((prev) => [
          ...prev.filter((c) => c.name.toLowerCase() !== createdName.toLowerCase()),
          res.data,
        ]);
        setFormCategory(createdName);
        setIsAddingCategory(false);
        setNewCategoryName('');
      } else {
        setModalError(res.message || 'Gagal menyimpan kategori baru.');
      }
    } catch (err: any) {
      setModalError(err.message || 'Gagal menyimpan kategori baru.');
    } finally {
      setIsSavingCategory(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setModalError('Format file harus berupa gambar (JPG, PNG, atau WebP).');
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
      setModalError('SKU, nama menu, dan harga jual wajib diisi.');
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
      setModalError(err.message || 'Gagal menyimpan menu.');
    }
  };

  // Delete Product Handler
  const handleDeleteProduct = async () => {
    if (!deletingProduct) return;
    setIsDeleting(true);
    try {
      const res = await api.products.delete(deletingProduct.id);
      if (res.success) {
        setProducts((prev) => prev.filter((p) => p.id !== deletingProduct.id));
        setDeletingProduct(null);
      } else {
        alert(res.message || 'Gagal menghapus produk.');
      }
    } catch (err: any) {
      alert(err.message || 'Terjadi kesalahan saat menghapus produk.');
    } finally {
      setIsDeleting(false);
    }
  };

  const hasAnyRecipe = (p: Product) =>
    (p.recipe_count || 0) > 0 || Boolean(p.variants?.some((v) => (v.recipe_count || 0) > 0));

  // KPI Calculations
  const totalProducts = products.length;
  const availableCount = products.filter((p) => !p.isSoldOut).length;
  const soldOutCount = products.filter((p) => p.isSoldOut).length;
  const formulatedCount = products.filter((p) => hasAnyRecipe(p)).length;
  const unformulatedCount = totalProducts - formulatedCount;

  // Average margin of formulated products with valid HPP
  const formulatedWithCost = products.filter((p) => {
    if ((p.recipe_count || 0) > 0 && (p.recipe_hpp || 0) > 0 && p.price > 0) return true;
    return Boolean(p.variants?.some((v) => (v.recipe_count || 0) > 0 && (v.recipe_hpp || 0) > 0 && v.price > 0));
  });
  const avgMargin =
    formulatedWithCost.length > 0
      ? Math.round(
          formulatedWithCost.reduce((sum, p) => {
            if ((p.recipe_count || 0) > 0 && p.price > 0) {
              return sum + ((p.price - (p.recipe_hpp || 0)) / p.price) * 100;
            }
            const firstVar = p.variants?.find((v) => (v.recipe_count || 0) > 0 && v.price > 0);
            if (!firstVar) return sum;
            return sum + ((firstVar.price - (firstVar.recipe_hpp || 0)) / firstVar.price) * 100;
          }, 0) / formulatedWithCost.length
        )
      : 0;

  const avgPrice =
    totalProducts > 0
      ? Math.round(products.reduce((sum, p) => sum + p.price, 0) / totalProducts)
      : 0;

  // Dynamic categories list (seeded defaults + persisted + used by products)
  const availableCategories = useMemo(() => {
    const base =
      categoryItems.length > 0
        ? categoryItems.map((c) => c.name)
        : ['Kopi', 'Non-Kopi', 'Makanan', 'Camilan', 'Add-on'];
    const merged = [...base, ...products.map((p) => p.category)];
    const seen = new Set<string>();
    const unique: string[] = [];
    for (const c of merged) {
      const clean = c?.trim();
      if (clean && !seen.has(clean)) {
        seen.add(clean);
        unique.push(clean);
      }
    }
    return unique;
  }, [categoryItems, products]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      ALL: products.length,
    };
    for (const cat of availableCategories) {
      counts[cat] = 0;
    }
    for (const p of products) {
      counts[p.category] = (counts[p.category] || 0) + 1;
    }
    return counts;
  }, [products, availableCategories]);

  const categories = useMemo(() => ['ALL', ...availableCategories], [availableCategories]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (selectedCategory !== 'ALL' && p.category !== selectedCategory) return false;
      if (availabilityFilter === 'AVAILABLE' && p.isSoldOut) return false;
      if (availabilityFilter === 'SOLDOUT' && !p.isSoldOut) return false;
      if (recipeFilter === 'HAS_RECIPE' && !hasAnyRecipe(p)) return false;
      if (recipeFilter === 'NO_RECIPE' && hasAnyRecipe(p)) return false;
      if (stationFilter !== 'ALL' && p.print_target !== stationFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = p.name.toLowerCase().includes(q);
        const matchSku = p.sku.toLowerCase().includes(q);
        const matchCategory = p.category.toLowerCase().includes(q);
        if (!matchName && !matchSku && !matchCategory) return false;
      }

      return true;
    });
  }, [products, selectedCategory, availabilityFilter, recipeFilter, stationFilter, searchQuery]);

  const isFilterActive =
    selectedCategory !== 'ALL' ||
    availabilityFilter !== 'ALL' ||
    recipeFilter !== 'ALL' ||
    stationFilter !== 'ALL' ||
    Boolean(searchQuery.trim());

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '60px' }}>
      {/* 1. KARTU KPI RINGKASAN PRODUK (Minimalis & Ringkas) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))',
          gap: '14px',
        }}
      >
        {/* Card 1: Total Menu */}
        <div
          style={{
            background: '#ffffff',
            padding: '16px 18px',
            borderRadius: '12px',
            border: '1px solid #e7e8e3',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#71717a', textTransform: 'uppercase' }}>
            Total Menu
          </span>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#1c2826' }}>
            {totalProducts} Menu
          </div>
          <div style={{ fontSize: '12px', color: '#71717a' }}>
            Kopi: {categoryCounts['Kopi']} • Non-Kopi: {categoryCounts['Non-Kopi']} • Makanan: {categoryCounts['Makanan']}
          </div>
        </div>

        {/* Card 2: Ketersediaan di Kasir */}
        <div
          style={{
            background: '#ffffff',
            padding: '16px 18px',
            borderRadius: '12px',
            border: '1px solid #e7e8e3',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#71717a', textTransform: 'uppercase' }}>
            Ketersediaan Kasir
          </span>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#2e7d32' }}>
            {availableCount} Siap Jual
          </div>
          <div style={{ fontSize: '12px', color: soldOutCount > 0 ? '#b91c1c' : '#71717a' }}>
            {soldOutCount > 0 ? `${soldOutCount} Menu Habis` : 'Semua menu siap jual'}
          </div>
        </div>

        {/* Card 3: Formulasi Resep & HPP */}
        <div
          style={{
            background: '#ffffff',
            padding: '16px 18px',
            borderRadius: '12px',
            border: '1px solid #e7e8e3',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#71717a', textTransform: 'uppercase' }}>
            Resep & HPP
          </span>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#1c2826' }}>
            {formulatedCount} Ber-Resep
          </div>
          <div style={{ fontSize: '12px', color: unformulatedCount > 0 ? '#d97706' : '#71717a' }}>
            {unformulatedCount > 0 ? `${unformulatedCount} belum diisi resep` : 'Semua resep terhubung'}
          </div>
        </div>

        {/* Card 4: Rata-rata Laba Kotor (Margin) */}
        <div
          style={{
            background: '#ffffff',
            padding: '16px 18px',
            borderRadius: '12px',
            border: '1px solid #e7e8e3',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#71717a', textTransform: 'uppercase' }}>
            Rata-rata Margin
          </span>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#2e7d32' }}>
            {avgMargin > 0 ? `${avgMargin}%` : '-'}
          </div>
          <div style={{ fontSize: '12px', color: '#71717a' }}>
            Rata-rata harga: Rp {avgPrice.toLocaleString('id-ID')}
          </div>
        </div>
      </div>

      {/* 2. BAR FILTER & PENCARIAN */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          background: '#ffffff',
          padding: '14px 18px',
          borderRadius: '12px',
          border: '1px solid #e7e8e3',
        }}
      >
        {/* Baris Atas: Kategori Tabs & Tambah Menu */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
          }}
        >
          {/* Category Tabs */}
          <div
            style={{
              display: 'flex',
              gap: '4px',
              background: '#f4f5f1',
              padding: '2px',
              borderRadius: '8px',
              border: '1px solid #e5e7e0',
              flexWrap: 'wrap',
            }}
          >
            {categories.map((cat) => {
              const active = selectedCategory === cat;
              const count = categoryCounts[cat] || 0;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    border: 'none',
                    background: active ? '#57695b' : 'transparent',
                    color: active ? '#ffffff' : '#4b5563',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.12s ease',
                  }}
                >
                  {cat === 'ALL' ? 'Semua' : cat} ({count})
                </button>
              );
            })}
          </div>

          {/* Tombol Aksi Kanan: Matriks BCG & Tambah Menu */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={() => router.push('/matriks')}
              style={{
                padding: '7px 14px',
                background: '#f2f4ef',
                color: '#57695b',
                border: '1px solid #dcdfd5',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '12px',
                cursor: 'pointer',
              }}
              title="Buka Halaman Analisis Matriks Menu (BCG)"
            >
              Matriks Menu
            </button>

            {/* Tombol Tambah Menu */}
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
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              <Plus size={14} />
              Tambah Menu
            </button>
          </div>
        </div>

        {/* Baris Bawah: Dropdown Filter & Pencarian */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          {/* Filter Ketersediaan (Shadcn UI) */}
          <div style={{ width: '180px' }}>
            <Select value={availabilityFilter} onValueChange={(val) => setAvailabilityFilter(val as any)}>
              <SelectTrigger style={{ height: '34px', background: '#f7f7f5' }}>
                <SelectValue placeholder="Semua Ketersediaan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua Ketersediaan</SelectItem>
                <SelectItem value="AVAILABLE">Tersedia ({availableCount})</SelectItem>
                <SelectItem value="SOLDOUT">Habis ({soldOutCount})</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Filter Status Resep (Shadcn UI) */}
          <div style={{ width: '185px' }}>
            <Select value={recipeFilter} onValueChange={(val) => setRecipeFilter(val as any)}>
              <SelectTrigger style={{ height: '34px', background: '#f7f7f5' }}>
                <SelectValue placeholder="Semua Resep" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua Resep</SelectItem>
                <SelectItem value="HAS_RECIPE">Sudah Ada Resep ({formulatedCount})</SelectItem>
                <SelectItem value="NO_RECIPE">Belum Ada Resep ({unformulatedCount})</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Filter Station Cetak (Shadcn UI) */}
          <div style={{ width: '175px' }}>
            <Select value={stationFilter} onValueChange={(val) => setStationFilter(val as any)}>
              <SelectTrigger style={{ height: '34px', background: '#f7f7f5' }}>
                <SelectValue placeholder="Semua Station" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua Station</SelectItem>
                <SelectItem value="BAR_PRINTER">Bar (Minuman)</SelectItem>
                <SelectItem value="KITCHEN_PRINTER">Dapur (Makanan)</SelectItem>
                <SelectItem value="NONE">Tanpa Cetak</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Kotak Pencarian */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: '#f7f7f5',
              padding: '0 12px',
              borderRadius: '8px',
              border: '1px solid #e2e4dc',
              height: '34px',
              flex: '1 1 200px',
              minWidth: '180px',
            }}
          >
            <Search size={13} color="#71717a" />
            <input
              type="text"
              placeholder="Cari nama menu, SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: '12px',
                color: '#1c2826',
                width: '100%',
              }}
            />
            {searchQuery && (
              <span
                onClick={() => setSearchQuery('')}
                style={{ cursor: 'pointer', color: '#9ca3af', display: 'flex' }}
                title="Hapus pencarian"
              >
                <X size={12} />
              </span>
            )}
          </div>

          {/* Reset Filter Button */}
          {isFilterActive && (
            <button
              onClick={() => {
                setSelectedCategory('ALL');
                setAvailabilityFilter('ALL');
                setRecipeFilter('ALL');
                setStationFilter('ALL');
                setSearchQuery('');
              }}
              style={{
                fontSize: '11px',
                padding: '4px 10px',
                borderRadius: '6px',
                background: '#fee2e2',
                border: 'none',
                color: '#b91c1c',
                fontWeight: 600,
                cursor: 'pointer',
                height: '32px',
              }}
            >
              Reset Filter
            </button>
          )}
        </div>
      </div>

      {/* 3. TABEL KATALOG MENU */}
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
                <th style={{ padding: '10px 12px', fontWeight: 600, fontSize: '11.5px', width: '44px' }}>Foto</th>
                <th style={{ padding: '10px 12px', fontWeight: 600, fontSize: '11.5px' }}>SKU</th>
                <th style={{ padding: '10px 12px', fontWeight: 600, fontSize: '11.5px' }}>Nama Menu</th>
                <th style={{ padding: '10px 12px', fontWeight: 600, fontSize: '11.5px' }}>Kategori</th>
                <th style={{ padding: '10px 12px', fontWeight: 600, fontSize: '11.5px' }}>Harga Jual</th>
                <th style={{ padding: '10px 12px', fontWeight: 600, fontSize: '11.5px' }}>Resep & HPP Bahan</th>
                <th style={{ padding: '10px 12px', fontWeight: 600, fontSize: '11.5px' }}>Station</th>
                <th style={{ padding: '10px 12px', fontWeight: 600, fontSize: '11.5px' }}>Ketersediaan</th>
                <th style={{ padding: '10px 14px', fontWeight: 600, fontSize: '11.5px', textAlign: 'right' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={9} style={{ padding: '36px', textAlign: 'center', color: '#71717a' }}>
                    Memuat data menu...
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: '36px', textAlign: 'center', color: '#9ca3af', fontStyle: 'italic' }}>
                    Tidak ada menu yang sesuai.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const isSoldOut = Boolean(p.is_force_sold_out || p.is_auto_sold_out);
                  const variants = p.variants || [];
                  const hasBaseRecipe = (p.recipe_count || 0) > 0;
                  const variantsWithRecipe = variants.filter((v) => (v.recipe_count || 0) > 0);
                  const hasRecipe = hasBaseRecipe || variantsWithRecipe.length > 0;
                  const hpp = hasBaseRecipe
                    ? (p.recipe_hpp || 0)
                    : variantsWithRecipe.length > 0
                    ? (variantsWithRecipe[0].recipe_hpp || 0)
                    : 0;
                  const refPrice = hasBaseRecipe
                    ? Number(p.price)
                    : variantsWithRecipe.length > 0
                    ? Number(variantsWithRecipe[0].price)
                    : Number(p.price);
                  const marginPct =
                    hasRecipe && hpp > 0 && refPrice > 0
                      ? Math.round(((refPrice - hpp) / refPrice) * 100)
                      : null;

                  return (
                    <tr
                      key={p.id}
                      style={{
                        borderBottom: '1px solid #f0f0eb',
                        height: '46px',
                        transition: 'background 0.12s',
                      }}
                    >
                      {/* Foto */}
                      <td style={{ padding: '6px 12px', verticalAlign: 'middle', width: '44px' }}>
                        <div
                          style={{
                            width: '34px',
                            height: '34px',
                            borderRadius: '6px',
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
                            <Coffee size={14} color="#8b968f" />
                          )}
                        </div>
                      </td>

                      {/* SKU */}
                      <td style={{ padding: '8px 12px', verticalAlign: 'middle' }}>
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1c2826', fontSize: '11.5px' }}>
                          {p.sku}
                        </span>
                      </td>

                      {/* Nama Menu */}
                      <td style={{ padding: '8px 12px', verticalAlign: 'middle' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <span
                            style={{
                              fontWeight: 700,
                              color: '#1c2826',
                              fontSize: '12px',
                            }}
                          >
                            {p.name}
                          </span>
                          {p.is_favorite && (
                            <span
                              style={{
                                fontSize: '10px',
                                background: '#fef3c7',
                                color: '#b45309',
                                padding: '1px 5px',
                                borderRadius: '4px',
                                fontWeight: 700,
                              }}
                              title="Menu Favorit"
                            >
                              ★ Favorit
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Kategori */}
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

                      {/* Harga Jual */}
                      <td style={{ padding: '8px 12px', verticalAlign: 'middle' }}>
                        {variants.length > 0 ? (() => {
                          const prices = variants.map((v) => Number(v.price));
                          const minP = Math.min(...prices);
                          const maxP = Math.max(...prices);
                          return (
                            <div>
                              <div style={{ fontWeight: 700, color: '#1c2826', fontSize: '12px' }}>
                                {minP === maxP
                                  ? `Rp ${minP.toLocaleString('id-ID')}`
                                  : `Rp ${minP.toLocaleString('id-ID')} – ${maxP.toLocaleString('id-ID')}`}
                              </div>
                              <div style={{ fontSize: '10.5px', color: '#64746b', marginTop: '1px' }}>
                                {variants.length} varian
                              </div>
                            </div>
                          );
                        })() : (
                          <span style={{ fontWeight: 700, color: '#1c2826', fontSize: '12px' }}>
                            Rp {Number(p.price).toLocaleString('id-ID')}
                          </span>
                        )}
                      </td>

                      {/* Resep & HPP Bahan */}
                      <td style={{ padding: '8px 12px', verticalAlign: 'middle', position: 'relative' }}>
                        {hasRecipe ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <span style={{ fontWeight: 700, color: '#1c2826', fontSize: '12px' }}>
                                  Rp {hpp.toLocaleString('id-ID')}
                                </span>
                                {marginPct !== null && (
                                  <span
                                    style={{
                                      fontSize: '10px',
                                      padding: '1px 5px',
                                      borderRadius: '4px',
                                      background: marginPct < 0 ? '#fee2e2' : marginPct >= 50 ? '#dcfce7' : '#fef3c7',
                                      color: marginPct < 0 ? '#b91c1c' : marginPct >= 50 ? '#15803d' : '#b45309',
                                      fontWeight: 700,
                                    }}
                                    title={
                                      marginPct < 0
                                        ? `Defisit: Biaya HPP (Rp ${hpp.toLocaleString('id-ID')}) melebihi harga jual (Rp ${refPrice.toLocaleString('id-ID')})`
                                        : `Laba Kotor: Rp ${(refPrice - hpp).toLocaleString('id-ID')}`
                                    }
                                  >
                                    {marginPct < 0 ? `${marginPct}% Rugi` : `${marginPct}% Laba`}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Tombol Simbol Detail Resep (Klik untuk lihat popup rincian) */}
                            <div style={{ position: 'relative' }}>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveRecipePopover(activeRecipePopover === p.id ? null : p.id);
                                }}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  padding: '2px 7px',
                                  borderRadius: '5px',
                                  border: '1px solid #e2e4dc',
                                  background: activeRecipePopover === p.id ? '#57695b' : '#f7f7f5',
                                  color: activeRecipePopover === p.id ? '#ffffff' : '#4b5563',
                                  fontSize: '10.5px',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  transition: 'all 0.1s ease',
                                }}
                                title="Klik untuk melihat rincian bahan resep"
                              >
                                <span>
                                  {variants.length > 0
                                    ? `${variants.length} Varian`
                                    : `${p.recipe_count} Bahan`}
                                </span>
                                <ChevronDown size={11} />
                              </button>

                              {/* Popover Detail Resep (Floating, Simple, Rapi) */}
                              {activeRecipePopover === p.id && (
                                <>
                                  <div
                                    style={{ position: 'fixed', inset: 0, zIndex: 998 }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveRecipePopover(null);
                                    }}
                                  />
                                  <div
                                    onClick={(e) => e.stopPropagation()}
                                    style={{
                                      position: 'absolute',
                                      top: 'calc(100% + 4px)',
                                      left: 0,
                                      background: '#ffffff',
                                      borderRadius: '8px',
                                      border: '1px solid #e2e4dc',
                                      boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                                      padding: '10px 12px',
                                      zIndex: 999,
                                      minWidth: '250px',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: '8px',
                                    }}
                                  >
                                    <div
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        paddingBottom: '4px',
                                        borderBottom: '1px solid #f0f0eb',
                                      }}
                                    >
                                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#1c2826' }}>
                                        Komposisi Resep
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setActiveRecipePopover(null);
                                          openRecipeModal(p);
                                        }}
                                        style={{
                                          background: 'transparent',
                                          border: 'none',
                                          color: '#57695b',
                                          fontSize: '10.5px',
                                          fontWeight: 600,
                                          cursor: 'pointer',
                                          textDecoration: 'underline',
                                          padding: 0,
                                        }}
                                      >
                                        Atur Resep & Varian
                                      </button>
                                    </div>

                                    {p.recipes && p.recipes.length > 0 && (
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        {variants.length > 0 && (
                                          <div style={{ fontSize: '10px', fontWeight: 700, color: '#71717a', textTransform: 'uppercase' }}>
                                            Standar · Rp {Number(p.price).toLocaleString('id-ID')}
                                          </div>
                                        )}
                                        {p.recipes.map((r, idx) => (
                                          <div
                                            key={idx}
                                            style={{
                                              display: 'flex',
                                              alignItems: 'center',
                                              justifyContent: 'space-between',
                                              gap: '8px',
                                              fontSize: '11px',
                                            }}
                                          >
                                            <span style={{ color: '#374151' }}>
                                              {r.name}
                                              {r.is_packaging_only && (
                                                <span style={{ fontSize: '9px', color: '#92400e', background: '#fef3c7', padding: '1px 4px', borderRadius: '3px', marginLeft: '4px' }}>
                                                  Kemasan
                                                </span>
                                              )}
                                            </span>
                                            <span style={{ color: '#57695b', fontWeight: 600 }}>
                                              {Number(r.quantity).toLocaleString('id-ID', { maximumFractionDigits: 3 })} {r.unit}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    )}

                                    {variants.map((v) => (
                                      <div
                                        key={v.id}
                                        style={{
                                          display: 'flex',
                                          flexDirection: 'column',
                                          gap: '3px',
                                          paddingTop: '4px',
                                          borderTop: '1px dashed #eeece6',
                                        }}
                                      >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10.5px' }}>
                                          <strong style={{ color: '#1c2826' }}>{v.name}</strong>
                                          <span style={{ color: '#57695b', fontWeight: 600 }}>
                                            HPP Rp {(v.recipe_hpp || 0).toLocaleString('id-ID')} / Rp {Number(v.price).toLocaleString('id-ID')}
                                          </span>
                                        </div>
                                        {v.recipes && v.recipes.length > 0 ? (
                                          v.recipes.map((r, idx) => (
                                            <div
                                              key={idx}
                                              style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                gap: '8px',
                                                fontSize: '11px',
                                              }}
                                            >
                                              <span style={{ color: '#4b5563' }}>{r.name}</span>
                                              <span style={{ color: '#57695b', fontWeight: 600 }}>
                                                {Number(r.quantity).toLocaleString('id-ID', { maximumFractionDigits: 3 })} {r.unit}
                                              </span>
                                            </div>
                                          ))
                                        ) : (
                                          <span style={{ fontSize: '10.5px', color: '#9ca3af', fontStyle: 'italic' }}>
                                            Ikut resep standar
                                          </span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => openRecipeModal(p)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#9ca3af',
                              fontSize: '11px',
                              cursor: 'pointer',
                              textDecoration: 'underline',
                              padding: 0,
                            }}
                          >
                            + Atur Resep
                          </button>
                        )}
                      </td>

                      {/* Station Cetak */}
                      <td style={{ padding: '8px 12px', verticalAlign: 'middle', color: '#64746b', fontSize: '11.5px' }}>
                        {p.print_target === 'BAR_PRINTER'
                          ? 'Bar'
                          : p.print_target === 'KITCHEN_PRINTER'
                          ? 'Dapur'
                          : '-'}
                      </td>

                      {/* Ketersediaan */}
                      <td style={{ padding: '8px 12px', verticalAlign: 'middle' }}>
                        <button
                          onClick={() => handleToggleSoldOut(p)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 8px',
                            borderRadius: '5px',
                            border: 'none',
                            background: isSoldOut ? '#fee2e2' : '#dcfce7',
                            color: isSoldOut ? '#b91c1c' : '#15803d',
                            fontWeight: 700,
                            fontSize: '11px',
                            cursor: 'pointer',
                          }}
                          title={
                            p.is_auto_sold_out && !p.is_force_sold_out
                              ? 'Otomatis habis karena ada stok bahan resep yang kurang di inventaris.'
                              : p.is_force_sold_out
                              ? 'Status habis diatur manual oleh kasir/admin.'
                              : 'Klik untuk mengubah ketersediaan di kasir'
                          }
                        >
                          {isSoldOut
                            ? (p.is_auto_sold_out && !p.is_force_sold_out ? 'Habis (Stok)' : 'Habis')
                            : 'Tersedia'}
                        </button>
                      </td>

                      {/* Aksi */}
                      <td style={{ padding: '8px 14px', verticalAlign: 'middle', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                          <button
                            onClick={() => openRecipeModal(p)}
                            style={{
                              padding: '3px 9px',
                              background: '#f2f4ef',
                              color: '#57695b',
                              border: '1px solid #dcdfd5',
                              borderRadius: '5px',
                              fontWeight: 600,
                              fontSize: '11px',
                              cursor: 'pointer',
                            }}
                            title="Aturan Resep & HPP"
                          >
                            Resep
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
                            title="Edit Data Menu"
                          >
                            <Pencil size={12} />
                          </button>

                          <button
                            onClick={() => setDeletingProduct(p)}
                            style={{
                              padding: '4px 6px',
                              background: '#fef2f2',
                              color: '#b91c1c',
                              border: '1px solid #fecaca',
                              borderRadius: '5px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                            }}
                            title="Nonaktifkan Menu"
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

      {/* MODAL 1: ATURAN RESEP & HPP (Desain Baru: Ringkas, Compact & User-Friendly) */}
      {formulatingProduct && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(17, 24, 22, 0.42)',
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
              borderRadius: '12px',
              border: '1px solid #e7e8e3',
              maxWidth: '620px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 16px 36px rgba(0, 0, 0, 0.14)',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 18px',
                borderBottom: '1px solid #f0f0eb',
              }}
            >
              <div>
                <h3 style={{ fontSize: '14.5px', fontWeight: 700, color: '#1c2826', margin: 0 }}>
                  Resep & Varian: {formulatingProduct.name}
                </h3>
                <div style={{ fontSize: '11.5px', color: '#71717a', marginTop: '2px' }}>
                  {formulatingProduct.sku} · Harga dasar Rp{' '}
                  {Number(formulatingProduct.price).toLocaleString('id-ID')}
                </div>
              </div>
              <button
                onClick={() => setFormulatingProduct(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  borderRadius: '6px',
                  width: '28px',
                  height: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#71717a',
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Content */}
            <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Bar Varian / Porsi Minimalis */}
              {(() => {
                const productVariants = formulatingProduct.variants || [];
                const activeVariant = activeVariantId
                  ? productVariants.find((v) => v.id === activeVariantId) || null
                  : null;
                const activeSellingPrice = activeVariant
                  ? Number(activeVariant.price)
                  : Number(formulatingProduct.price);

                const totalHpp = Math.round(currentRecipes.reduce((sum, r) => sum + Number(r.item_hpp || 0), 0));
                const grossProfit = activeSellingPrice - totalHpp;
                const isLoss = grossProfit < 0;
                const marginPct =
                  activeSellingPrice > 0
                    ? ((grossProfit / activeSellingPrice) * 100).toFixed(1)
                    : '0';
                const zeroCostItems = currentRecipes.filter((r) => Number(r.unit_cost) === 0);

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {/* Pill Tabs Varian */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          onClick={() => loadRecipeForTarget(formulatingProduct.id, null)}
                          style={{
                            padding: '5px 10px',
                            borderRadius: '7px',
                            border: activeVariantId === null ? '1.5px solid #57695b' : '1px solid #e2e4dc',
                            background: activeVariantId === null ? '#eef3ef' : '#ffffff',
                            color: activeVariantId === null ? '#2b3b2e' : '#4b5563',
                            fontSize: '11.5px',
                            fontWeight: activeVariantId === null ? 700 : 600,
                            cursor: 'pointer',
                          }}
                        >
                          Standar · Rp {Number(formulatingProduct.price).toLocaleString('id-ID')}
                        </button>

                        {productVariants.map((v) => {
                          const isActive = activeVariantId === v.id;
                          return (
                            <button
                              key={v.id}
                              type="button"
                              onClick={() => loadRecipeForTarget(formulatingProduct.id, v.id)}
                              style={{
                                padding: '5px 10px',
                                borderRadius: '7px',
                                border: isActive ? '1.5px solid #57695b' : '1px solid #e2e4dc',
                                background: isActive ? '#eef3ef' : '#ffffff',
                                color: isActive ? '#2b3b2e' : '#4b5563',
                                fontSize: '11.5px',
                                fontWeight: isActive ? 700 : 600,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                              }}
                            >
                              <span>{v.name} · Rp {Number(v.price).toLocaleString('id-ID')}</span>
                              {(v.recipe_count || 0) > 0 && (
                                <span
                                  style={{
                                    width: '6px',
                                    height: '6px',
                                    borderRadius: '50%',
                                    background: '#57695b',
                                  }}
                                  title={`${v.recipe_count} bahan`}
                                />
                              )}
                            </button>
                          );
                        })}

                        <button
                          type="button"
                          onClick={handleOpenAddVariant}
                          style={{
                            padding: '5px 10px',
                            borderRadius: '7px',
                            border: '1px dashed #b9c1b9',
                            background: '#fbfbf9',
                            color: '#57695b',
                            fontSize: '11.5px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <Plus size={12} />
                          Varian
                        </button>
                      </div>

                      {/* Aksi Ubah / Hapus untuk Varian Aktif */}
                      {activeVariant && !isVariantFormOpen && (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '5px 10px',
                            background: '#f7f8f5',
                            borderRadius: '6px',
                            fontSize: '11.5px',
                            color: '#4b5563',
                          }}
                        >
                          <span>
                            Varian: <strong style={{ color: '#1c2826' }}>{activeVariant.name}</strong> (Harga Rp {Number(activeVariant.price).toLocaleString('id-ID')})
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {confirmDeleteVariantId === activeVariant.id ? (
                              <>
                                <span style={{ color: '#b91c1c', fontWeight: 600 }}>Hapus varian?</span>
                                <button
                                  type="button"
                                  disabled={isSavingVariant}
                                  onClick={() => handleDeleteVariant(activeVariant.id)}
                                  style={{
                                    padding: '2px 8px',
                                    borderRadius: '4px',
                                    border: 'none',
                                    background: '#dc2626',
                                    color: '#ffffff',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                  }}
                                >
                                  Ya
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteVariantId(null)}
                                  style={{
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    border: '1px solid #d1d5db',
                                    background: '#ffffff',
                                    color: '#4b5563',
                                    fontSize: '11px',
                                    cursor: 'pointer',
                                  }}
                                >
                                  Batal
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditVariant(activeVariant)}
                                  style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#57695b',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                    padding: 0,
                                  }}
                                >
                                  <Pencil size={11} />
                                  Ubah
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteVariantId(activeVariant.id)}
                                  style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#b91c1c',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                    padding: 0,
                                  }}
                                >
                                  <Trash2 size={11} />
                                  Hapus
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Form Inline Tambah / Ubah Varian */}
                      {isVariantFormOpen && (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 10px',
                            background: '#f7f8f5',
                            border: '1px solid #dce0d6',
                            borderRadius: '8px',
                            flexWrap: 'wrap',
                          }}
                        >
                          <input
                            type="text"
                            placeholder="Nama varian (cth: Besar 16oz / Jumbo)"
                            value={variantFormName}
                            onChange={(e) => setVariantFormName(e.target.value)}
                            maxLength={60}
                            autoFocus
                            style={{
                              flex: 1,
                              minWidth: '170px',
                              height: '32px',
                              padding: '0 10px',
                              borderRadius: '6px',
                              border: '1px solid #ccd1c4',
                              background: '#ffffff',
                              fontSize: '12px',
                              outline: 'none',
                            }}
                          />
                          <div style={{ width: '130px' }}>
                            <NumberInput
                              placeholder="Harga jual (Rp)"
                              min={0}
                              value={variantFormPrice}
                              onValueChange={(val) => setVariantFormPrice(val)}
                              style={{ height: '32px', fontSize: '12px' }}
                            />
                          </div>
                          <button
                            type="button"
                            disabled={isSavingVariant}
                            onClick={handleSaveVariant}
                            style={{
                              height: '32px',
                              padding: '0 12px',
                              borderRadius: '6px',
                              border: 'none',
                              background: '#57695b',
                              color: '#ffffff',
                              fontSize: '12px',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            {isSavingVariant ? '...' : editingVariantId ? 'Perbarui' : 'Simpan'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setIsVariantFormOpen(false);
                              setEditingVariantId(null);
                            }}
                            style={{
                              height: '32px',
                              width: '30px',
                              borderRadius: '6px',
                              border: '1px solid #dcdfd5',
                              background: '#ffffff',
                              color: '#6b7280',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                            }}
                            aria-label="Batal varian"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Ringkasan Biaya Compact (1 Baris Rapi, mengikuti harga varian aktif) */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: '#fbfbf9',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: '1px solid #e7e8e3',
                      }}
                    >
                      <div>
                        <span style={{ fontSize: '11px', color: '#71717a' }}>Total HPP: </span>
                        <strong style={{ fontSize: '14px', color: '#1c2826' }}>
                          Rp {totalHpp.toLocaleString('id-ID')}
                        </strong>
                      </div>
                      <div>
                        <span style={{ fontSize: '11px', color: '#71717a' }}>
                          {isLoss ? 'Rugi / Porsi: ' : 'Laba / Porsi: '}
                        </span>
                        <strong style={{ fontSize: '14px', color: isLoss ? '#b91c1c' : '#2e7d32' }}>
                          {isLoss ? `-Rp ${Math.abs(grossProfit).toLocaleString('id-ID')}` : `Rp ${grossProfit.toLocaleString('id-ID')}`}
                        </strong>
                      </div>
                      <div>
                        <span style={{ fontSize: '11px', color: '#71717a' }}>Margin: </span>
                        <span
                          style={{
                            fontSize: '12px',
                            fontWeight: 800,
                            color: isLoss ? '#b91c1c' : '#2e7d32',
                            background: isLoss ? '#fee2e2' : '#dcfce7',
                            padding: '2px 7px',
                            borderRadius: '5px',
                          }}
                        >
                          {marginPct}% {isLoss ? 'Rugi' : ''}
                        </span>
                      </div>
                    </div>

                    {isLoss && (
                      <div
                        style={{
                          padding: '8px 12px',
                          background: '#fef2f2',
                          border: '1px solid #fecaca',
                          borderRadius: '8px',
                          fontSize: '11.5px',
                          color: '#b91c1c',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <AlertCircle size={14} color="#b91c1c" style={{ flexShrink: 0 }} />
                        <span>
                          <strong>Peringatan Defisit:</strong> Total HPP bahan (Rp {totalHpp.toLocaleString('id-ID')}) melebihi harga jual {activeVariant ? activeVariant.name : 'menu'} (Rp {activeSellingPrice.toLocaleString('id-ID')}). Setiap porsi merugi Rp {Math.abs(grossProfit).toLocaleString('id-ID')}.
                        </span>
                      </div>
                    )}

                    {zeroCostItems.length > 0 && (
                      <div
                        style={{
                          padding: '8px 12px',
                          background: '#fffbeb',
                          border: '1px solid #fef08a',
                          borderRadius: '8px',
                          fontSize: '11.5px',
                          color: '#92400e',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <AlertCircle size={14} color="#b45309" style={{ flexShrink: 0 }} />
                        <span>
                          <strong>Perhatian:</strong> {zeroCostItems.length} bahan baku memiliki biaya satuan Rp 0 di inventaris stok.
                        </span>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Saved confirmation pill */}
              {recipeSavedBanner && (
                <div
                  style={{
                    padding: '6px 10px',
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    borderRadius: '7px',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    color: '#15803d',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>{recipeSavedBanner}</span>
                  <button
                    type="button"
                    onClick={() => setRecipeSavedBanner('')}
                    style={{ background: 'transparent', border: 'none', color: '#15803d', cursor: 'pointer', padding: 0 }}
                  >
                    <X size={13} />
                  </button>
                </div>
              )}

              {/* Recipe Error Banner */}
              {recipeError && (
                <div
                  style={{
                    marginBottom: '10px',
                    padding: '8px 12px',
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    color: '#991b1b',
                    fontSize: '12px',
                  }}
                >
                  <AlertCircle size={15} style={{ flexShrink: 0, color: '#dc2626' }} />
                  <span style={{ flex: 1, fontWeight: 500 }}>{recipeError}</span>
                  <button
                    type="button"
                    onClick={() => setRecipeError('')}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#991b1b',
                      cursor: 'pointer',
                      padding: '2px',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              {/* Input Tambah Bahan (Sederhana, Bersih & Tidak Sempit) */}
              <div
                style={{
                  background: '#f8f9f6',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #e2e5dc',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                {/* Combobox Bahan Baku */}
                <div style={{ position: 'relative', flex: 1, minWidth: '180px' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: '#ffffff',
                      border: '1px solid #ccd1c4',
                      borderRadius: '6px',
                      padding: '0 8px',
                      height: '34px',
                      cursor: 'pointer',
                    }}
                    onClick={() => setIsIngredientDropdownOpen(true)}
                  >
                    <Search size={13} color="#71717a" style={{ flexShrink: 0 }} />
                    <input
                      type="text"
                      placeholder="Pilih bahan baku..."
                      value={ingredientSearch}
                      onFocus={() => setIsIngredientDropdownOpen(true)}
                      onChange={(e) => {
                        setIngredientSearch(e.target.value);
                        if (newIngredientId) setNewIngredientId('');
                        if (recipeError) setRecipeError('');
                        setIsIngredientDropdownOpen(true);
                      }}
                      style={{
                        border: 'none',
                        background: 'transparent',
                        outline: 'none',
                        fontSize: '12px',
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
                          padding: '1px',
                        }}
                      >
                        <X size={12} />
                      </button>
                    )}
                    <ChevronDown size={13} color="#71717a" style={{ flexShrink: 0 }} />
                  </div>

                  {isIngredientDropdownOpen && (
                    <>
                      <div
                        style={{ position: 'fixed', inset: 0, zIndex: 99991 }}
                        onClick={() => setIsIngredientDropdownOpen(false)}
                      />
                      <div
                        style={{
                          position: 'absolute',
                          top: '38px',
                          left: 0,
                          width: '100%',
                          minWidth: '320px',
                          maxHeight: '230px',
                          overflowY: 'auto',
                          background: '#ffffff',
                          borderRadius: '8px',
                          border: '1px solid #ccd1c4',
                          boxShadow: '0 8px 24px rgba(0,0,0,0.14)',
                          zIndex: 99992,
                        }}
                      >
                        {ingredients.filter((ing) => {
                          if (!ingredientSearch.trim()) return true;
                          const q = ingredientSearch.toLowerCase();
                          return ing.name.toLowerCase().includes(q) || ing.code.toLowerCase().includes(q);
                        }).length === 0 ? (
                          <div style={{ padding: '10px 14px', fontSize: '11.5px', color: '#9ca3af', textAlign: 'center' }}>
                            Bahan baku tidak ditemukan
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
                              const isSelected = ing.id === newIngredientId;

                              return (
                                <div
                                  key={ing.id}
                                  onClick={() => {
                                    setNewIngredientId(ing.id);
                                    setIngredientSearch(ing.name);
                                    setIsIngredientDropdownOpen(false);
                                    setTimeout(() => qtyInputRef.current?.focus(), 50);
                                  }}
                                  style={{
                                    padding: '8px 12px',
                                    borderBottom: '1px solid #f0f0eb',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: '10px',
                                    background: isSelected ? '#f2f4ef' : '#ffffff',
                                    fontSize: '12px',
                                    transition: 'background 0.1s ease',
                                  }}
                                  onMouseEnter={(e) => {
                                    if (!isSelected) e.currentTarget.style.background = '#f9fafb';
                                  }}
                                  onMouseLeave={(e) => {
                                    if (!isSelected) e.currentTarget.style.background = '#ffffff';
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, overflow: 'hidden' }}>
                                    <span style={{ fontWeight: 600, color: '#1c2826', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                      {ing.name}
                                    </span>
                                    <span style={{ fontSize: '10px', color: '#71717a', background: '#f4f4f2', padding: '1px 5px', borderRadius: '4px', flexShrink: 0 }}>
                                      {ing.code}
                                    </span>
                                  </div>
                                  <span style={{ fontSize: '11.5px', color: '#57695b', fontWeight: 600, flexShrink: 0, whiteSpace: 'nowrap' }}>
                                    Rp {cost.toLocaleString('id-ID')} <span style={{ color: '#9ca3af', fontWeight: 400 }}>/ {ing.usage_unit}</span>
                                  </span>
                                </div>
                              );
                            })
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* Input Qty Takaran */}
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '110px', flexShrink: 0 }}>
                  <NumberInput
                    ref={qtyInputRef}
                    allowDecimal
                    placeholder="Takaran"
                    value={newIngredientQty}
                    onChange={(e) => {
                      setNewIngredientQty(e.target.value);
                      if (recipeError) setRecipeError('');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddRecipeIngredient();
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '0 8px',
                      paddingRight: selectedIngredientObj ? '38px' : '8px',
                      borderRadius: '6px',
                      border: '1px solid #ccd1c4',
                      fontSize: '12px',
                      height: '34px',
                      boxSizing: 'border-box',
                      outline: 'none',
                    }}
                  />
                  {selectedIngredientObj && (
                    <span style={{ position: 'absolute', right: '8px', fontSize: '11px', color: '#57695b', fontWeight: 600, pointerEvents: 'none' }}>
                      {selectedIngredientObj.usage_unit}
                    </span>
                  )}
                </div>

                {/* Checkbox Kemasan */}
                <label
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '11.5px',
                    color: '#415245',
                    cursor: 'pointer',
                    userSelect: 'none',
                    flexShrink: 0,
                  }}
                  title="Tandai jika bahan ini adalah kemasan/cup (tidak dihitung stok baku utama)"
                >
                  <input
                    type="checkbox"
                    checked={newIsPackaging}
                    onChange={(e) => setNewIsPackaging(e.target.checked)}
                    style={{ cursor: 'pointer', accentColor: '#57695b' }}
                  />
                  Kemasan
                </label>

                {/* Tombol Tambah */}
                <button
                  type="button"
                  onClick={handleAddRecipeIngredient}
                  style={{
                    padding: '0 12px',
                    height: '34px',
                    background: '#57695b',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    flexShrink: 0,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Plus size={13} />
                  <span>Tambah</span>
                </button>
              </div>

              {/* Tabel Resep Bahan */}
              <div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px', whiteSpace: 'nowrap' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e7e8e3', color: '#71717a' }}>
                      <th style={{ textAlign: 'left', padding: '6px 4px', fontWeight: 600 }}>Bahan</th>
                      <th style={{ textAlign: 'center', padding: '6px 4px', fontWeight: 600 }}>Takaran</th>
                      <th style={{ textAlign: 'right', padding: '6px 4px', fontWeight: 600 }}>Biaya Satuan</th>
                      <th style={{ textAlign: 'right', padding: '6px 4px', fontWeight: 600 }}>Subtotal</th>
                      <th style={{ textAlign: 'center', padding: '6px 4px', fontWeight: 600 }}>Tipe</th>
                      <th style={{ textAlign: 'center', padding: '6px 4px', width: '24px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentRecipes.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '16px', color: '#9ca3af', fontStyle: 'italic' }}>
                          Belum ada bahan baku. Pilih bahan di atas untuk memulai resep.
                        </td>
                      </tr>
                    ) : (
                      currentRecipes.map((r) => (
                        <tr key={r.ingredient_id} style={{ borderBottom: '1px solid #f0f0eb' }}>
                          <td style={{ padding: '7px 4px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontWeight: 600, color: '#1c2826' }}>{r.ingredient_name}</span>
                              {r.ingredient_code && (
                                <span
                                  style={{
                                    fontSize: '9.5px',
                                    color: '#71717a',
                                    background: '#f4f4f2',
                                    padding: '1px 4px',
                                    borderRadius: '3px',
                                  }}
                                >
                                  {r.ingredient_code}
                                </span>
                              )}
                            </div>
                          </td>
                          <td style={{ textAlign: 'center', padding: '7px 4px' }}>
                            {Number(r.quantity).toLocaleString('id-ID', { maximumFractionDigits: 3 })} {r.usage_unit}
                          </td>
                          <td style={{ textAlign: 'right', padding: '7px 4px', color: '#64746b' }}>
                            Rp {Number(r.unit_cost).toLocaleString('id-ID')}
                          </td>
                          <td style={{ textAlign: 'right', padding: '7px 4px', fontWeight: 700, color: '#1c2826' }}>
                            Rp {Math.round(r.item_hpp).toLocaleString('id-ID')}
                          </td>
                          <td style={{ textAlign: 'center', padding: '7px 4px' }}>
                            <span
                              style={{
                                fontSize: '9.5px',
                                padding: '1px 5px',
                                borderRadius: '4px',
                                background: r.is_packaging_only ? '#fef3c7' : '#e0f2fe',
                                color: r.is_packaging_only ? '#92400e' : '#0369a1',
                                fontWeight: 600,
                              }}
                            >
                              {r.is_packaging_only ? 'Kemasan' : 'Utama'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center', padding: '7px 4px' }}>
                            <button
                              onClick={() => handleRemoveRecipeIngredient(r.ingredient_id)}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#ef4444',
                                cursor: 'pointer',
                                padding: '2px',
                              }}
                              title="Hapus"
                            >
                              <Trash2 size={12} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {currentRecipes.length > 0 && (
                    <tfoot>
                      <tr style={{ borderTop: '2px solid #e7e8e3', background: '#fbfbf9' }}>
                        <td style={{ padding: '8px 4px', fontWeight: 700, color: '#1c2826' }}>
                          Total ({currentRecipes.length} Bahan)
                        </td>
                        <td colSpan={2}></td>
                        <td style={{ textAlign: 'right', padding: '8px 4px', fontWeight: 800, color: '#1c2826', fontSize: '12px' }}>
                          Rp {Math.round(currentRecipes.reduce((sum, r) => sum + r.item_hpp, 0)).toLocaleString('id-ID')}
                        </td>
                        <td colSpan={2}></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '8px',
                padding: '12px 18px',
                borderTop: '1px solid #e7e8e3',
                background: '#fbfbf9',
              }}
            >
              <button
                onClick={() => setFormulatingProduct(null)}
                style={{
                  padding: '6px 14px',
                  background: '#f0f0eb',
                  border: '1px solid #dcdfd5',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#4b5563',
                  cursor: 'pointer',
                }}
              >
                {(formulatingProduct.variants?.length || 0) > 0 ? 'Tutup' : 'Batal'}
              </button>
              <button
                onClick={handleSaveRecipes}
                style={{
                  padding: '6px 16px',
                  background: '#57695b',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {activeVariantId
                  ? `Simpan Resep ${formulatingProduct.variants?.find((v) => v.id === activeVariantId)?.name || 'Varian'}`
                  : 'Simpan Resep & HPP'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: TAMBAH / EDIT MENU (Desain Simple, Minimalis & Otomatis Printer Station) */}
      {isProductModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(17, 24, 22, 0.42)',
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
              borderRadius: '12px',
              border: '1px solid #e7e8e3',
              maxWidth: '460px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 16px 36px rgba(0, 0, 0, 0.14)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 18px',
                borderBottom: '1px solid #f0f0eb',
              }}
            >
              <h3 style={{ fontSize: '14.5px', fontWeight: 700, color: '#1c2826', margin: 0 }}>
                {editingProduct ? 'Edit Menu' : 'Tambah Menu'}
              </h3>
              <button
                onClick={() => setIsProductModalOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  borderRadius: '6px',
                  width: '28px',
                  height: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#71717a',
                }}
              >
                <X size={16} />
              </button>
            </div>

            <form
              onSubmit={handleSaveProduct}
              style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '12px' }}
            >
              {modalError && (
                <div
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    color: '#b91c1c',
                    fontSize: '11.5px',
                  }}
                >
                  {modalError}
                </div>
              )}

              {/* Upload Foto Menu (Compact & Ramping) */}
              <div>
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
                      gap: '10px',
                      padding: '8px 10px',
                      background: '#f9fafb',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb',
                    }}
                  >
                    <div
                      style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '6px',
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
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <button
                        type="button"
                        disabled={isUploadingImage}
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                          padding: '3px 8px',
                          fontSize: '11px',
                          fontWeight: 600,
                          background: '#ffffff',
                          border: '1px solid #d1d5db',
                          borderRadius: '5px',
                          color: '#374151',
                          cursor: 'pointer',
                        }}
                      >
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
                          padding: '3px 8px',
                          fontSize: '11px',
                          fontWeight: 600,
                          background: '#fef2f2',
                          border: '1px solid #fecaca',
                          borderRadius: '5px',
                          color: '#b91c1c',
                          cursor: 'pointer',
                        }}
                      >
                        Hapus Foto
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => !isUploadingImage && fileInputRef.current?.click()}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      padding: '10px',
                      borderRadius: '8px',
                      border: '1.5px dashed #cbd5e1',
                      background: '#fbfbf9',
                      cursor: isUploadingImage ? 'wait' : 'pointer',
                    }}
                  >
                    {isUploadingImage ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Loader2 size={14} color="#57695b" className="animate-spin" />
                        <span style={{ fontSize: '11px', fontWeight: 600, color: '#57695b' }}>
                          Mengunggah foto...
                        </span>
                      </div>
                    ) : (
                      <>
                        <UploadCloud size={16} color="#57695b" />
                        <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#374151' }}>
                          Upload Foto (Opsional, maks. 5MB)
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* SKU & Nama Menu */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '8px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#4b5563', marginBottom: '3px' }}>
                    SKU
                  </label>
                  <input
                    type="text"
                    required
                    value={formSku}
                    onChange={(e) => setFormSku(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '7px 8px',
                      borderRadius: '6px',
                      border: '1px solid #d1d5db',
                      fontSize: '11.5px',
                      fontFamily: 'monospace',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#4b5563', marginBottom: '3px' }}>
                    Nama Menu
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Nama menu..."
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '7px 8px',
                      borderRadius: '6px',
                      border: '1px solid #d1d5db',
                      fontSize: '11.5px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              {/* Kategori & Harga Jual */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#4b5563', marginBottom: '3px' }}>
                    Kategori
                  </label>
                  {isAddingCategory ? (
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                      <input
                        type="text"
                        autoFocus
                        maxLength={50}
                        placeholder="Kategori baru..."
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            e.stopPropagation();
                            handleSaveNewCategory();
                          } else if (e.key === 'Escape') {
                            e.preventDefault();
                            setIsAddingCategory(false);
                            setNewCategoryName('');
                          }
                        }}
                        style={{
                          flex: 1,
                          minWidth: 0,
                          height: '34px',
                          padding: '0 8px',
                          borderRadius: '6px',
                          border: '1px solid #57695b',
                          fontSize: '12px',
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                      <button
                        type="button"
                        disabled={isSavingCategory}
                        onClick={handleSaveNewCategory}
                        style={{
                          height: '34px',
                          padding: '0 9px',
                          borderRadius: '6px',
                          border: 'none',
                          background: '#57695b',
                          color: '#ffffff',
                          fontSize: '11.5px',
                          fontWeight: 600,
                          cursor: isSavingCategory ? 'wait' : 'pointer',
                          flexShrink: 0,
                        }}
                      >
                        {isSavingCategory ? '...' : 'Simpan'}
                      </button>
                      <button
                        type="button"
                        disabled={isSavingCategory}
                        onClick={() => {
                          setIsAddingCategory(false);
                          setNewCategoryName('');
                        }}
                        title="Batal"
                        style={{
                          width: '30px',
                          height: '34px',
                          borderRadius: '6px',
                          border: '1px solid #d1d5db',
                          background: '#f7f7f5',
                          color: '#6b7280',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          flexShrink: 0,
                        }}
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <Select value={formCategory} onValueChange={handleCategoryChange}>
                          <SelectTrigger style={{ width: '100%', height: '34px', background: '#ffffff', borderRadius: '6px', border: '1px solid #d1d5db' }}>
                            <SelectValue placeholder="Pilih Kategori" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableCategories.map((cat) => (
                              <SelectItem key={cat} value={cat}>
                                {cat}
                              </SelectItem>
                            ))}
                            <SelectItem value="__ADD_CATEGORY__">
                              + Tambah Kategori
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingCategory(true);
                          setNewCategoryName('');
                          setModalError('');
                        }}
                        title="Tambah kategori baru"
                        aria-label="Tambah kategori baru"
                        style={{
                          width: '34px',
                          height: '34px',
                          flexShrink: 0,
                          borderRadius: '6px',
                          border: '1px solid #d1d5db',
                          background: '#f7f7f5',
                          color: '#57695b',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                        }}
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#4b5563', marginBottom: '3px' }}>
                    Harga Jual (Rp)
                  </label>
                  <NumberInput
                    required
                    placeholder="cth: 25.000"
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '7px 8px',
                      borderRadius: '6px',
                      border: '1px solid #d1d5db',
                      fontSize: '11.5px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              {/* Cetak Pesanan (Station) - Otomatis Mengikuti Kategori */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '3px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: '#4b5563' }}>
                    Cetak Pesanan (Station)
                  </label>
                  <span style={{ fontSize: '10.5px', color: '#57695b', fontWeight: 600 }}>
                    {getAutoStation(formCategory) === 'KITCHEN_PRINTER'
                      ? 'Otomatis: Dapur'
                      : 'Otomatis: Bar'}
                  </span>
                </div>
                <Select value={formPrintTarget} onValueChange={(val) => setFormPrintTarget(val as any)}>
                  <SelectTrigger style={{ width: '100%', height: '34px', background: '#ffffff', borderRadius: '6px', border: '1px solid #d1d5db' }}>
                    <SelectValue placeholder="Pilih Station" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BAR_PRINTER">Bar (Minuman)</SelectItem>
                    <SelectItem value="KITCHEN_PRINTER">Dapur (Makanan)</SelectItem>
                    <SelectItem value="NONE">Tanpa Cetak</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Checkbox Menu Favorit */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <input
                  type="checkbox"
                  id="formFavorite"
                  checked={formIsFavorite}
                  onChange={(e) => setFormIsFavorite(e.target.checked)}
                />
                <label htmlFor="formFavorite" style={{ fontSize: '11.5px', color: '#374151', cursor: 'pointer' }}>
                  Menu Favorit (Prioritas di kasir)
                </label>
              </div>

              {/* Tombol Simpan / Batal */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '8px',
                  marginTop: '6px',
                }}
              >
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  style={{
                    padding: '6px 14px',
                    background: '#f0f0eb',
                    border: '1px solid #dcdfd5',
                    borderRadius: '6px',
                    fontSize: '12px',
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
                    padding: '6px 16px',
                    background: '#57695b',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {editingProduct ? 'Perbarui' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: KONFIRMASI HAPUS MENU */}
      {deletingProduct && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(17, 24, 22, 0.42)',
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
              borderRadius: '12px',
              border: '1px solid #e7e8e3',
              maxWidth: '380px',
              width: '100%',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              boxShadow: '0 16px 36px rgba(0, 0, 0, 0.14)',
            }}
          >
            <h4 style={{ margin: 0, fontSize: '14.5px', fontWeight: 700, color: '#1c2826' }}>
              Nonaktifkan Menu?
            </h4>

            <div
              style={{
                background: '#fbfbf9',
                padding: '10px 12px',
                borderRadius: '6px',
                border: '1px solid #e7e8e3',
                fontSize: '11.5px',
              }}
            >
              <div style={{ fontWeight: 700, color: '#1c2826' }}>{deletingProduct.name}</div>
              <div style={{ color: '#71717a', marginTop: '2px' }}>
                SKU: {deletingProduct.sku} • Rp {Number(deletingProduct.price).toLocaleString('id-ID')}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                disabled={isDeleting}
                onClick={() => setDeletingProduct(null)}
                style={{
                  padding: '6px 14px',
                  background: '#f0f0eb',
                  border: '1px solid #dcdfd5',
                  borderRadius: '6px',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  color: '#4b5563',
                  cursor: 'pointer',
                }}
              >
                Batal
              </button>
              <button
                disabled={isDeleting}
                onClick={handleDeleteProduct}
                style={{
                  padding: '6px 16px',
                  background: '#b91c1c',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  cursor: isDeleting ? 'wait' : 'pointer',
                }}
              >
                {isDeleting ? 'Menonaktifkan...' : 'Ya, Nonaktifkan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
