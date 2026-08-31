import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Boxes,
  Plus,
  Search,
  Filter,
  AlertTriangle,
  ArrowUpDown,
  TrendingDown,
  Layers,
  Sparkles,
  Download,
  Edit,
  Trash2,
  Phone,
  MessageSquare,
  MapPin,
  CheckCircle2,
  X,
  RefreshCw,
  PlusCircle,
  MinusCircle,
  Tag,
  Scissors,
  DollarSign,
  Package,
  ShoppingBag,
  Camera,
  Upload,
  Eye,
  Check,
  Share2,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  User,
  SlidersHorizontal,
  Info,
  Loader2,
  ChevronDown,
} from 'lucide-react';
import {
  InventoryItem,
  InventoryGender,
  InventorySizeQuantity,
  InventoryUnit,
} from '../../types';
import { LocalRoomDatabase } from '../../lib/localRoomDb';
import { useLanguage } from '../../lib/LanguageContext';
import { getWhatsAppUrl } from '../../lib/phoneUtils';

interface ScreenInventoryManagerProps {
  roomDb: LocalRoomDatabase;
  onNavigateBack?: () => void;
}

// Comprehensive Boutique Category Dictionaries by Gender
export const MEN_CATEGORIES = [
  'Kurta Pajama',
  'Sherwani',
  'Nehru / Modi Jacket',
  'Blazer & Coat',
  'Suit (Coat + Pant)',
  'Bandhgala / Jodhpuri Suit',
  'Indo-Western Set',
  'Formal Shirt',
  'Casual Shirt',
  'Trousers / Chinos',
  'Pathani Suit',
  'Dhoti Kurta / Dhoti Set',
  'Safari Suit',
  'Tuxedo',
  'Waistcoat / Sadri',
  'Kurta with Jacket',
  'Pagri / Safa & Stole',
  'Other Men\'s Wear',
];

export const WOMEN_CATEGORIES = [
  'Lehenga Choli',
  'Saree / Designer Saree',
  'Blouse / Designer Blouse',
  'Anarkali Suit',
  'Salwar Kameez',
  'Kurti & Tunics',
  'Evening Gown / Bridal Gown',
  'Sharara / Gharara Suit',
  'Crop Top & Skirt / Palazzo',
  'Indo-Western Dress',
  'Co-ord Set',
  'Kaftan',
  'Dupatta & Stole',
  'Jacket Lehenga',
  'Peplum Top & Dhoti Set',
  'Western Dress / Maxi Dress',
  'Bridal Ensemble',
  'Other Women\'s Wear',
];

export const UNISEX_KIDS_CATEGORIES = [
  'Boys Kurta Pajama',
  'Boys Sherwani',
  'Boys Suit & Blazer',
  'Girls Lehenga Choli',
  'Girls Frock & Gown',
  'Girls Anarkali',
  'Boutique Fabric / Unstitched',
  'Trims, Laces & Borders',
  'Buttons & Accessories',
  'Threads & Interlining',
  'Other Accessories',
];

export const STANDARD_SIZES = [
  { size: 'XS', label: 'XS (34)' },
  { size: 'S', label: 'S (36)' },
  { size: 'M', label: 'M (38)' },
  { size: 'L', label: 'L (40)' },
  { size: 'XL', label: 'XL (42)' },
  { size: 'XXL', label: 'XXL (44)' },
  { size: '3XL', label: '3XL (46)' },
  { size: '4XL', label: '4XL (48)' },
  { size: 'Free Size', label: 'Free Size' },
];

export const ScreenInventoryManager: React.FC<ScreenInventoryManagerProps> = ({
  roomDb,
}) => {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenderFilter, setSelectedGenderFilter] = useState<'ALL' | InventoryGender>('ALL');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');
  const [stockStatusFilter, setStockStatusFilter] = useState<'ALL' | 'LOW' | 'HEALTHY' | 'OUT'>('ALL');
  const [sortBy, setSortBy] = useState<'name' | 'price_asc' | 'price_desc' | 'stock_asc' | 'stock_desc'>('name');

  // Real-time reactive inventory state
  const [inventory, setInventory] = useState<InventoryItem[]>(() => roomDb.getInventory());
  const [lastSyncedTime, setLastSyncedTime] = useState<string>(() =>
    new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  );

  // Active Board View Tab: 'table' (Main Table) | 'cards' (Lookbook Cards) | 'metrics' (Stock KPIs)
  const [activeBoardView, setActiveBoardView] = useState<'table' | 'cards' | 'metrics'>('table');
  const [groupBy, setGroupBy] = useState<'gender' | 'category' | 'status' | 'none'>('gender');
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [inlineNewItemName, setInlineNewItemName] = useState<Record<string, string>>({});
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  const toggleGroupCollapse = (groupKey: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [groupKey]: !prev[groupKey] }));
  };
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isClearModalOpen, setIsClearModalOpen] = useState<boolean>(false);

  // Lookbook / Image Viewer Modal
  const [viewerItem, setViewerItem] = useState<InventoryItem | null>(null);
  const [viewerActiveIdx, setViewerActiveIdx] = useState<number>(0);

  // Quick Stock Adjust Modal
  const [adjustingItem, setAdjustingItem] = useState<InventoryItem | null>(null);
  const [adjustDelta, setAdjustDelta] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState<string>('');

  // ---------------- FORM STATE (Add / Edit Inventory Item) ----------------
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  const [formName, setFormName] = useState('');
  const [formGender, setFormGender] = useState<InventoryGender>('Women');
  const [formCategory, setFormCategory] = useState<string>(WOMEN_CATEGORIES[0]);
  
  // Sizes & Quantities map
  const [selectedSizes, setSelectedSizes] = useState<Record<string, { enabled: boolean; quantity: number }>>(() => {
    const init: Record<string, { enabled: boolean; quantity: number }> = {};
    STANDARD_SIZES.forEach((s) => {
      init[s.size] = { enabled: false, quantity: 1 };
    });
    return init;
  });

  // Photos (2 to 6 garment photos)
  const [formGarmentPhotos, setFormGarmentPhotos] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Subscribe to live RoomDb inventory changes and initial Firestore sync
  useEffect(() => {
    setInventory(roomDb.getInventory());
    roomDb.syncInventoryFromFirestoreNow();

    const unsub = roomDb.subscribe(() => {
      setInventory(roomDb.getInventory());
      setLastSyncedTime(
        new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    });
    return () => unsub();
  }, [roomDb]);

  // Pricing & Discounts
  const [formPrice, setFormPrice] = useState<number | ''>('');
  const [formDiscountPercent, setFormDiscountPercent] = useState<number | ''>('');
  const [formCostPrice, setFormCostPrice] = useState<number | ''>('');
  const [formMinAlert, setFormMinAlert] = useState<number | ''>(3);
  const [formLocation, setFormLocation] = useState<string>('');
  const [formSupplier, setFormSupplier] = useState<string>('');
  const [formSupplierPhone, setFormSupplierPhone] = useState<string>('');
  const [formNotes, setFormNotes] = useState<string>('');

  const shopProfile = roomDb.getShopProfile();

  // Dynamic categories based on gender
  const dynamicFormCategories = useMemo(() => {
    if (formGender === 'Men') return MEN_CATEGORIES;
    if (formGender === 'Women') return WOMEN_CATEGORIES;
    return UNISEX_KIDS_CATEGORIES;
  }, [formGender]);

  // Ensure category is valid when gender changes
  const handleGenderChange = (newGender: InventoryGender) => {
    setFormGender(newGender);
    const newCategories = newGender === 'Men' ? MEN_CATEGORIES : newGender === 'Women' ? WOMEN_CATEGORIES : UNISEX_KIDS_CATEGORIES;
    if (!newCategories.includes(formCategory)) {
      setFormCategory(newCategories[0]);
    }
  };

  // Calculate total quantity across selected sizes
  const totalSelectedQuantity = useMemo(() => {
    let sum = 0;
    Object.keys(selectedSizes).forEach((sizeKey) => {
      const entry = selectedSizes[sizeKey];
      if (entry && entry.enabled) {
        sum += Math.max(0, Number(entry.quantity) || 0);
      }
    });
    return sum;
  }, [selectedSizes]);

  // Calculate net final price after discount
  const calculatedFinalPrice = useMemo(() => {
    const p = Math.max(0, Number(formPrice) || 0);
    const dPct = Math.max(0, Math.min(100, Number(formDiscountPercent) || 0));
    const discountVal = (p * dPct) / 100;
    return Math.max(0, Math.round(p - discountVal));
  }, [formPrice, formDiscountPercent]);

  // Dynamic filter categories based on selected gender filter
  const filterCategories = useMemo(() => {
    if (selectedGenderFilter === 'Men') return MEN_CATEGORIES;
    if (selectedGenderFilter === 'Women') return WOMEN_CATEGORIES;
    if (selectedGenderFilter === 'Unisex' || selectedGenderFilter === 'Kids') return UNISEX_KIDS_CATEGORIES;
    return [...MEN_CATEGORIES, ...WOMEN_CATEGORIES, ...UNISEX_KIDS_CATEGORIES];
  }, [selectedGenderFilter]);

  // Summary Metrics & Live Financial Analysis
  const metrics = useMemo(() => {
    const totalItems = inventory.length;
    let totalStockUnits = 0;
    let totalValuation = 0;
    let totalRetailPotential = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    inventory.forEach((item) => {
      const qty = item.quantity || 0;
      const cost = item.costPrice || (item.finalPrice ? item.finalPrice * 0.6 : (item.price || 0) * 0.5);
      const sell = item.finalPrice || item.sellingPrice || item.price || 0;

      totalStockUnits += qty;
      totalValuation += qty * cost;
      totalRetailPotential += qty * sell;

      if (qty <= 0) {
        outOfStockCount++;
      } else if (qty <= (item.minStockAlert || 3)) {
        lowStockCount++;
      }
    });

    const grossProfitPotential = Math.max(0, totalRetailPotential - totalValuation);

    return {
      totalItems,
      totalStockUnits,
      totalValuation,
      totalRetailPotential,
      grossProfitPotential,
      lowStockCount,
      outOfStockCount,
    };
  }, [inventory]);

  // Filtered & Sorted items
  const filteredItems = useMemo(() => {
    let result = [...inventory];

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (i) =>
          Boolean(i.name && i.name.toLowerCase().includes(q)) ||
          Boolean(i.category && i.category.toLowerCase().includes(q)) ||
          Boolean(i.gender && i.gender.toLowerCase().includes(q)) ||
          Boolean(i.supplier && i.supplier.toLowerCase().includes(q)) ||
          Boolean(i.location && i.location.toLowerCase().includes(q)) ||
          Boolean(i.notes && i.notes.toLowerCase().includes(q))
      );
    }

    // Gender filter
    if (selectedGenderFilter !== 'ALL') {
      result = result.filter((i) => (i.gender || 'Women') === selectedGenderFilter);
    }

    // Category filter
    if (selectedCategoryFilter !== 'ALL') {
      result = result.filter((i) => i.category === selectedCategoryFilter);
    }

    // Stock status filter
    if (stockStatusFilter === 'LOW') {
      result = result.filter((i) => i.quantity > 0 && i.quantity <= (i.minStockAlert || 3));
    } else if (stockStatusFilter === 'OUT') {
      result = result.filter((i) => i.quantity <= 0);
    } else if (stockStatusFilter === 'HEALTHY') {
      result = result.filter((i) => i.quantity > (i.minStockAlert || 3));
    }

    // Sorting
    result.sort((a, b) => {
      const priceA = a.finalPrice || a.price || 0;
      const priceB = b.finalPrice || b.price || 0;
      if (sortBy === 'price_asc') return priceA - priceB;
      if (sortBy === 'price_desc') return priceB - priceA;
      if (sortBy === 'stock_asc') return a.quantity - b.quantity;
      if (sortBy === 'stock_desc') return b.quantity - a.quantity;
      return a.name.localeCompare(b.name);
    });

    return result;
  }, [inventory, searchQuery, selectedGenderFilter, selectedCategoryFilter, stockStatusFilter, sortBy]);

  // Instant 1-tap Stock Stepper (+1, -1)
  const handleInstantAdjust = async (item: InventoryItem, delta: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const updated = await roomDb.adjustInventoryStock(
      item.id,
      delta,
      delta > 0 ? t('inventory.quickRestock', 'Quick restock') : t('inventory.quickDeduction', 'Quick deduction')
    );
    if (updated) {
      setToastMessage(`${item.name}: Stock ${updated.quantity} pcs`);
      setTimeout(() => setToastMessage(null), 2500);
    }
  };

  // Open Add Modal
  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormName('');
    setFormGender('Women');
    setFormCategory(WOMEN_CATEGORIES[0]);

    const initSizes: Record<string, { enabled: boolean; quantity: number }> = {};
    STANDARD_SIZES.forEach((s) => {
      initSizes[s.size] = {
        enabled: false,
        quantity: 1,
      };
    });
    setSelectedSizes(initSizes);

    setFormGarmentPhotos([]);
    setFormPrice('');
    setFormDiscountPercent('');
    setFormCostPrice('');
    setFormMinAlert(3);
    setFormLocation('');
    setFormSupplier('');
    setFormSupplierPhone('');
    setFormNotes('');
    setIsAddModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setFormName(item.name);
    setFormGender(item.gender || 'Women');
    setFormCategory(item.category || WOMEN_CATEGORIES[0]);

    const loadedSizes: Record<string, { enabled: boolean; quantity: number }> = {};
    STANDARD_SIZES.forEach((s) => {
      loadedSizes[s.size] = { enabled: false, quantity: 1 };
    });

    if (item.sizes && Array.isArray(item.sizes) && item.sizes.length > 0) {
      item.sizes.forEach((sz) => {
        loadedSizes[sz.size] = { enabled: true, quantity: sz.quantity || 1 };
      });
    } else {
      loadedSizes['M'] = { enabled: true, quantity: item.quantity || 1 };
    }
    setSelectedSizes(loadedSizes);

    const garmentPhotos = item.photos && item.photos.length > 0 ? item.photos : item.image ? [item.image] : [];
    setFormGarmentPhotos(garmentPhotos);

    setFormPrice(item.price !== undefined ? item.price : item.sellingPrice !== undefined ? item.sellingPrice : '');
    setFormDiscountPercent(item.discountPercent !== undefined ? item.discountPercent : '');
    setFormCostPrice(item.costPrice !== undefined ? item.costPrice : '');
    setFormMinAlert(item.minStockAlert || 3);
    setFormLocation(item.location || '');
    setFormSupplier(item.supplier || '');
    setFormSupplierPhone(item.supplierPhone || '');
    setFormNotes(item.notes || '');
    setIsAddModalOpen(true);
  };

  // Toggle size checkbox
  const handleToggleSize = (sizeKey: string) => {
    setSelectedSizes((prev) => {
      const current = prev[sizeKey] || { enabled: false, quantity: 1 };
      return {
        ...prev,
        [sizeKey]: {
          ...current,
          enabled: !current.enabled,
          quantity: current.quantity > 0 ? current.quantity : 1,
        },
      };
    });
  };

  // Update size quantity
  const handleSizeQuantityChange = (sizeKey: string, newQty: number) => {
    const safeQty = Math.max(1, Math.round(newQty));
    setSelectedSizes((prev) => {
      const current = prev[sizeKey] || { enabled: true, quantity: 1 };
      return {
        ...prev,
        [sizeKey]: {
          ...current,
          quantity: safeQty,
        },
      };
    });
  };

  // Photo Upload Handler with compression
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = 6 - formGarmentPhotos.length;
    if (remainingSlots <= 0) {
      alert('Maximum 6 photos allowed.');
      return;
    }

    const filesToRead = Array.from(files).slice(0, remainingSlots) as File[];
    filesToRead.forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const rawBase64 = uploadEvent.target?.result as string;
        if (!rawBase64) return;

        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_DIMENSION = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_DIMENSION) {
              height = Math.round((height * MAX_DIMENSION) / width);
              width = MAX_DIMENSION;
            }
          } else {
            if (height > MAX_DIMENSION) {
              width = Math.round((width * MAX_DIMENSION) / height);
              height = MAX_DIMENSION;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressed = canvas.toDataURL('image/jpeg', 0.65);
            setFormGarmentPhotos((prev) => {
              if (prev.length >= 6) return prev;
              return [...prev, compressed];
            });
          } else {
            setFormGarmentPhotos((prev) => {
              if (prev.length >= 6) return prev;
              return [...prev, rawBase64];
            });
          }
        };
        img.onerror = () => {
          setFormGarmentPhotos((prev) => {
            if (prev.length >= 6) return prev;
            return [...prev, rawBase64];
          });
        };
        img.src = rawBase64;
      };
      reader.readAsDataURL(file);
    });

    if (e.target) e.target.value = '';
  };

  const handleRemoveGarmentPhoto = (index: number) => {
    setFormGarmentPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  // Submit Save Item
  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      alert('Please enter Item Name.');
      return;
    }

    let activeSizes: InventorySizeQuantity[] = [];
    Object.keys(selectedSizes).forEach((sizeKey) => {
      const entry = selectedSizes[sizeKey];
      if (entry && entry.enabled && entry.quantity > 0) {
        activeSizes.push({
          size: sizeKey,
          quantity: Number(entry.quantity),
        });
      }
    });

    if (activeSizes.length === 0) {
      activeSizes = [{ size: 'Free Size', quantity: 1 }];
    }

    const effectiveTotalQty =
      totalSelectedQuantity > 0
        ? totalSelectedQuantity
        : activeSizes.reduce((sum, s) => sum + s.quantity, 0);

    const calculatedDiscountAmount = Math.round(
      ((Number(formPrice) || 0) * (Number(formDiscountPercent) || 0)) / 100
    );

    const itemData: InventoryItem = {
      id: editingItem ? editingItem.id : `inv-${Date.now()}`,
      name: formName.trim(),
      gender: formGender,
      category: formCategory,
      sizes: activeSizes,
      quantity: effectiveTotalQty,
      unit: 'Pieces',
      price: Number(formPrice) || 0,
      discountPercent: Number(formDiscountPercent) || 0,
      discountAmount: calculatedDiscountAmount,
      finalPrice: calculatedFinalPrice,
      sellingPrice: calculatedFinalPrice,
      costPrice: Number(formCostPrice) || 0,
      minStockAlert: Number(formMinAlert) || 3,
      photos: formGarmentPhotos,
      selectedPhotos: formGarmentPhotos,
      hasTryOn: false,
      image: formGarmentPhotos[0] || undefined,
      location: formLocation.trim() || undefined,
      supplier: formSupplier.trim() || undefined,
      supplierPhone: formSupplierPhone.trim() || undefined,
      notes: formNotes.trim() || undefined,
      boutiqueId: roomDb.getBoutiqueId(),
      lastRestockedDate: new Date().toISOString().split('T')[0],
      createdAt: editingItem ? editingItem.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setIsAddModalOpen(false);
    setEditingItem(null);
    setFormName('');
    setFormGarmentPhotos([]);
    setFormPrice('');
    setFormDiscountPercent('');

    await roomDb.saveInventoryItem(itemData);
    setToastMessage(`Saved "${itemData.name}"`);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleDeleteItem = async (itemId: string, name: string) => {
    if (window.confirm(`Delete "${name}" from inventory?`)) {
      await roomDb.deleteInventoryItem(itemId);
      setToastMessage(`Deleted "${name}"`);
      setTimeout(() => setToastMessage(null), 2500);
    }
  };

  const handleConfirmClearAll = async () => {
    await roomDb.clearAllInventory();
    setIsClearModalOpen(false);
    setToastMessage('All items removed');
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleOpenAdjust = (item: InventoryItem, defaultDelta: number = 0) => {
    setAdjustingItem(item);
    setAdjustDelta(defaultDelta);
    setAdjustReason(defaultDelta > 0 ? 'Restock shipment' : 'Sale fulfilled');
  };

  const handleApplyAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingItem || adjustDelta === 0) return;

    const updated = await roomDb.adjustInventoryStock(adjustingItem.id, adjustDelta, adjustReason);
    setAdjustingItem(null);
    if (updated) {
      setToastMessage(`Updated ${adjustingItem.name} (${adjustDelta > 0 ? '+' : ''}${adjustDelta} pcs)`);
      setTimeout(() => setToastMessage(null), 2500);
    }
  };

  // Grouped items calculation
  const groupedInventory = useMemo(() => {
    if (groupBy === 'none') {
      return [{ key: 'all', title: t('inventory.allGarments', 'All Garments'), color: '#0B4636', items: filteredItems }];
    }

    if (groupBy === 'status') {
      const healthy = filteredItems.filter((i) => i.quantity > (i.minStockAlert || 3));
      const low = filteredItems.filter((i) => i.quantity > 0 && i.quantity <= (i.minStockAlert || 3));
      const out = filteredItems.filter((i) => i.quantity <= 0);
      return [
        { key: 'healthy', title: t('inventory.inStockHealthy', 'In Stock (Healthy)'), color: '#047857', items: healthy },
        { key: 'low', title: t('inventory.lowStockAlert', 'Low Stock Alert'), color: '#d97706', items: low },
        { key: 'out', title: t('inventory.outOfStock', 'Out of Stock'), color: '#dc2626', items: out },
      ].filter((g) => g.items.length > 0 || stockStatusFilter === 'ALL');
    }

    if (groupBy === 'category') {
      const catMap = new Map<string, InventoryItem[]>();
      filteredItems.forEach((it) => {
        const cat = it.category || 'Uncategorized';
        if (!catMap.has(cat)) catMap.set(cat, []);
        catMap.get(cat)!.push(it);
      });

      const colors = ['#0B4636', '#047857', '#0f172a', '#059669', '#18181b', '#064e3b', '#334155', '#10b981'];
      let idx = 0;
      const groups: Array<{ key: string; title: string; color: string; items: InventoryItem[] }> = [];
      catMap.forEach((items, cat) => {
        groups.push({
          key: cat,
          title: cat,
          color: colors[idx % colors.length],
          items,
        });
        idx++;
      });
      return groups;
    }

    // Default: Group by Gender
    const womenItems = filteredItems.filter((i) => (i.gender || 'Women') === 'Women');
    const menItems = filteredItems.filter((i) => i.gender === 'Men');
    const kidsItems = filteredItems.filter((i) => i.gender === 'Kids' || i.gender === 'Unisex');

    return [
      { key: 'women', title: t('inventory.womensCollection', "Women's Collection"), color: '#0B4636', items: womenItems },
      { key: 'men', title: t('inventory.mensCollection', "Men's Collection"), color: '#0f172a', items: menItems },
      { key: 'kids', title: t('inventory.kidsCollection', 'Kids & Unisex Collection'), color: '#047857', items: kidsItems },
    ].filter((g) => g.items.length > 0 || selectedGenderFilter === 'ALL');
  }, [filteredItems, groupBy, stockStatusFilter, selectedGenderFilter, t]);

  // Quick inline add handler
  const handleInlineQuickAdd = (groupKey: string, defaultGender?: InventoryGender, defaultCategory?: string) => {
    const rawName = inlineNewItemName[groupKey]?.trim();
    if (!rawName) return;

    setEditingItem(null);
    setFormName(rawName);
    const targetGender: InventoryGender = defaultGender || (groupKey === 'men' ? 'Men' : groupKey === 'kids' ? 'Kids' : 'Women');
    setFormGender(targetGender);
    setFormCategory(defaultCategory || (targetGender === 'Men' ? MEN_CATEGORIES[0] : targetGender === 'Women' ? WOMEN_CATEGORIES[0] : UNISEX_KIDS_CATEGORIES[0]));
    
    setInlineNewItemName((prev) => ({ ...prev, [groupKey]: '' }));
    setIsAddModalOpen(true);
  };

  return (
    <div className="space-y-3.5 pb-24 max-w-7xl mx-auto font-sans relative px-1 sm:px-2">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl border border-slate-700 flex items-center gap-2.5 text-xs font-bold animate-in fade-in slide-in-from-top-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ================= BOARD HEADER ================= */}
      <div className="bg-white rounded-2xl p-3.5 sm:p-5 border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0B4636] text-white flex items-center justify-center font-bold shadow-xs shrink-0 mt-0.5 sm:mt-0">
              <Boxes className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-xl font-black text-slate-900 tracking-tight">
                  {t('inventory.title', 'Stock & Inventory')}
                </h1>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-[#0B4636] border border-emerald-200">
                  {inventory.length} {t('inventory.stylesCount', 'Styles')}
                </span>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-extrabold">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#047857] animate-pulse" />
                  <span>{t('inventory.liveBoard', 'Live Board')}</span>
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 font-medium mt-0.5 line-clamp-1">
                {t('inventory.subtitle', 'Garment styles, sizes, photos, prices & real-time inventory')}
              </p>
            </div>
          </div>

          {/* Primary Action "+ New Item" Button */}
          <div className="flex items-center gap-2 self-stretch sm:self-auto">
            <button
              type="button"
              onClick={handleOpenAdd}
              className="w-full sm:w-auto h-10 sm:h-9.5 px-4 rounded-xl bg-[#0B4636] hover:bg-[#073327] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-95 cursor-pointer touch-manipulation"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>{t('inventory.newItem', '+ New Item')}</span>
            </button>
          </div>
        </div>

        {/* ================= VIEW TABS ================= */}
        <div className="flex items-center gap-1.5 mt-3 sm:mt-4 pt-3 border-t border-slate-100 overflow-x-auto no-scrollbar py-0.5">
          <button
            type="button"
            onClick={() => setActiveBoardView('table')}
            className={`flex items-center gap-1.5 px-3.5 py-2 sm:py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 min-h-[36px] touch-manipulation ${
              activeBoardView === 'table'
                ? 'bg-emerald-50 text-[#0B4636] border border-emerald-300 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{t('inventory.mainTable', 'Main Table')}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveBoardView('cards')}
            className={`flex items-center gap-1.5 px-3.5 py-2 sm:py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 min-h-[36px] touch-manipulation ${
              activeBoardView === 'cards'
                ? 'bg-emerald-50 text-[#0B4636] border border-emerald-300 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>{t('inventory.cardsGallery', 'Cards / Gallery')}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveBoardView('metrics')}
            className={`flex items-center gap-1.5 px-3.5 py-2 sm:py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 min-h-[36px] touch-manipulation ${
              activeBoardView === 'metrics'
                ? 'bg-emerald-50 text-[#0B4636] border border-emerald-300 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>{t('inventory.valuationKpis', 'Valuation & KPIs')}</span>
            {metrics.lowStockCount + metrics.outOfStockCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-500" />
            )}
          </button>
        </div>
      </div>

      {/* ================= SEARCH & RESPONSIVE TOOLBAR ================= */}
      <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-xs space-y-2.5">
        {/* Top row: Search input + Mobile filter toggle */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={t('inventory.searchPlaceholder', 'Search garments, category, location...')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9.5 pl-9 pr-8 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-[#0B4636] focus:outline-hidden transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter toggle button on mobile */}
          <button
            type="button"
            onClick={() => setIsFiltersOpen(!isFiltersOpen)}
            className={`md:hidden h-9.5 px-3 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer touch-manipulation transition-colors shrink-0 ${
              isFiltersOpen || selectedGenderFilter !== 'ALL' || selectedCategoryFilter !== 'ALL' || stockStatusFilter !== 'ALL'
                ? 'bg-emerald-50 text-[#0B4636] border-emerald-300'
                : 'bg-slate-50 text-slate-700 border-slate-200'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>{t('inventory.filters', 'Filters')}</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isFiltersOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Filter Dropdowns (always visible on md+, collapsible on mobile) */}
        <div className={`grid grid-cols-2 sm:grid-cols-3 md:flex md:flex-wrap items-center gap-2 pt-1 ${isFiltersOpen ? 'block' : 'hidden md:flex'}`}>
          {/* Gender Filter */}
          <div className="w-full md:w-auto">
            <select
              value={selectedGenderFilter}
              onChange={(e) => {
                setSelectedGenderFilter(e.target.value as any);
                setSelectedCategoryFilter('ALL');
              }}
              className="w-full h-9 px-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 focus:outline-hidden cursor-pointer hover:bg-slate-100"
            >
              <option value="ALL">👤 {t('inventory.allGenders', 'All Genders')}</option>
              <option value="Women">👩 {t('inventory.women', 'Women')}</option>
              <option value="Men">👨 {t('inventory.men', 'Men')}</option>
              <option value="Kids">👶 {t('inventory.kids', 'Kids / Unisex')}</option>
            </select>
          </div>

          {/* Category Filter */}
          <div className="w-full md:w-auto">
            <select
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              className="w-full h-9 px-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 focus:outline-hidden cursor-pointer hover:bg-slate-100 md:max-w-[150px] truncate"
            >
              <option value="ALL">🏷️ {t('inventory.allCategories', 'All Categories')}</option>
              {filterCategories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Stock Level Filter */}
          <div className="w-full md:w-auto">
            <select
              value={stockStatusFilter}
              onChange={(e) => setStockStatusFilter(e.target.value as any)}
              className="w-full h-9 px-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 focus:outline-hidden cursor-pointer hover:bg-slate-100"
            >
              <option value="ALL">⚡ {t('inventory.allStockLevels', 'All Stock Levels')}</option>
              <option value="HEALTHY">🟢 {t('inventory.inStockHealthy', 'In Stock (Healthy)')}</option>
              <option value="LOW">🟡 {t('inventory.lowStockAlert', 'Low Stock Alert')}</option>
              <option value="OUT">🔴 {t('inventory.outOfStock', 'Out of Stock')}</option>
            </select>
          </div>

          {/* Group By Filter */}
          <div className="w-full md:w-auto flex items-center gap-1">
            <span className="text-[11px] font-bold text-slate-400 hidden md:inline">{t('inventory.groupBy', 'Group by')}:</span>
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as any)}
              className="w-full h-9 px-2.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold text-slate-800 focus:outline-hidden cursor-pointer"
            >
              <option value="gender">🗂️ {t('inventory.groupGender', 'Gender')}</option>
              <option value="category">📁 {t('inventory.groupCategory', 'Category')}</option>
              <option value="status">📊 {t('inventory.groupStatus', 'Stock Health')}</option>
              <option value="none">📋 {t('inventory.groupNone', 'Single Table')}</option>
            </select>
          </div>

          {/* Sort Selector */}
          <div className="w-full md:w-auto">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full h-9 px-2.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold text-slate-800 focus:outline-hidden cursor-pointer"
            >
              <option value="name">{t('inventory.sortAZ', 'Sort: A-Z')}</option>
              <option value="price_asc">{t('inventory.priceLowHigh', 'Price: Low-High')}</option>
              <option value="price_desc">{t('inventory.priceHighLow', 'Price: High-Low')}</option>
              <option value="stock_asc">{t('inventory.stockLowHigh', 'Stock: Low-High')}</option>
              <option value="stock_desc">{t('inventory.stockHighLow', 'Stock: High-Low')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* ================= VIEW 1: MAIN TABLE / MOBILE-OPTIMIZED CARDS ================= */}
      {activeBoardView === 'table' && (
        <div className="space-y-4">
          {filteredItems.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 sm:p-12 text-center border border-slate-200 shadow-xs space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-800 flex items-center justify-center mx-auto border border-emerald-200">
                <Boxes className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="font-extrabold text-slate-900 text-base">
                  {t('inventory.noGarmentsFound', 'No matching garments found')}
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  {t('inventory.noGarmentsSub', 'Add items to your boutique inventory board or adjust filters above.')}
                </p>
              </div>
              <button
                type="button"
                onClick={handleOpenAdd}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-800 text-white text-xs font-bold rounded-xl hover:bg-emerald-900 transition-all shadow-xs cursor-pointer active:scale-95 touch-manipulation"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>{t('inventory.addFirstGarment', '+ Add First Garment')}</span>
              </button>
            </div>
          ) : (
            groupedInventory.map((group) => {
              const isCollapsed = Boolean(collapsedGroups[group.key]);
              const groupTotalUnits = group.items.reduce((sum, i) => sum + (i.quantity || 0), 0);
              const groupTotalValue = group.items.reduce(
                (sum, i) => sum + (i.quantity || 0) * (i.finalPrice || i.sellingPrice || i.price || 0),
                0
              );

              return (
                <div
                  key={group.key}
                  className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden"
                >
                  {/* Group Header Bar */}
                  <div
                    className="px-3 sm:px-4 py-3 bg-slate-50/90 border-b border-slate-200 flex items-center justify-between cursor-pointer select-none hover:bg-slate-100/80 transition-colors touch-manipulation"
                    onClick={() => toggleGroupCollapse(group.key)}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <button
                        type="button"
                        className="w-5 h-5 rounded flex items-center justify-center text-slate-500 hover:text-slate-800 shrink-0"
                      >
                        <ChevronRight
                          className={`w-4 h-4 transition-transform duration-200 ${
                            !isCollapsed ? 'rotate-90' : ''
                          }`}
                        />
                      </button>

                      <span
                        className="w-3 h-3 rounded-sm shrink-0"
                        style={{ backgroundColor: group.color }}
                      />

                      <h3
                        className="font-black text-xs sm:text-sm text-slate-900 tracking-tight truncate flex items-center gap-1.5"
                        style={{ color: group.color }}
                      >
                        <span>{group.title}</span>
                      </h3>

                      <span className="text-[10px] sm:text-[11px] font-bold px-1.5 sm:px-2 py-0.2 rounded-full bg-slate-200/80 text-slate-700 shrink-0">
                        {group.items.length} {t('inventory.itemsCount', 'items')}
                      </span>
                    </div>

                    {/* Group Metrics Summary */}
                    <div className="flex items-center gap-2 sm:gap-4 text-[11px] sm:text-xs font-bold text-slate-600 shrink-0">
                      <span className="hidden sm:inline">
                        {t('inventory.units', 'Units')}: <strong className="text-slate-900">{groupTotalUnits}</strong> {t('inventory.pcs', 'pcs')}
                      </span>
                      <span>
                        {t('inventory.value', 'Value')}:{' '}
                        <strong className="text-[#0B4636]">₹{groupTotalValue.toLocaleString('en-IN')}</strong>
                      </span>
                    </div>
                  </div>

                  {!isCollapsed && (
                    <>
                      {/* 1. DESKTOP VIEW: Clean Non-Overflowing Table (Visible on md and above) */}
                      <div className="hidden md:block overflow-x-auto w-full">
                        <table className="w-full text-left border-collapse text-xs table-auto">
                          <thead>
                            <tr className="bg-slate-100/80 border-b border-slate-200 text-[11px] font-extrabold text-slate-600 uppercase tracking-wider">
                              <th className="w-1.5 p-0" style={{ backgroundColor: group.color }} />
                              <th className="py-2.5 px-3 min-w-[180px]">{t('inventory.colItem', 'Item / Garment')}</th>
                              <th className="py-2.5 px-2.5 text-center whitespace-nowrap">{t('inventory.colStatus', 'Status')}</th>
                              <th className="py-2.5 px-2.5 whitespace-nowrap">{t('inventory.colGender', 'Gender')}</th>
                              <th className="py-2.5 px-2.5 whitespace-nowrap">{t('inventory.colCategory', 'Category')}</th>
                              <th className="py-2.5 px-2.5">{t('inventory.colSizes', 'Sizes')}</th>
                              <th className="py-2.5 px-2.5 text-right whitespace-nowrap">{t('inventory.colMrp', 'MRP (₹)')}</th>
                              <th className="py-2.5 px-2 text-center whitespace-nowrap">{t('inventory.colDiscount', 'Discount')}</th>
                              <th className="py-2.5 px-2.5 text-right whitespace-nowrap">{t('inventory.colSellingPrice', 'Selling Price')}</th>
                              <th className="py-2.5 px-2.5 text-center whitespace-nowrap">{t('inventory.colStock', 'Stock')}</th>
                              <th className="py-2.5 px-3 text-right whitespace-nowrap">{t('inventory.colActions', 'Actions')}</th>
                            </tr>
                          </thead>

                          <tbody className="divide-y divide-slate-100">
                            {group.items.map((item) => {
                              const isLowStock = item.quantity > 0 && item.quantity <= (item.minStockAlert || 3);
                              const isOutOfStock = item.quantity <= 0;

                              const displayPhotos =
                                item.selectedPhotos && item.selectedPhotos.length > 0
                                  ? item.selectedPhotos
                                  : item.photos && item.photos.length > 0
                                  ? item.photos
                                  : item.image
                                  ? [item.image]
                                  : [];
                              const photo = displayPhotos[0];

                              const regularPrice = item.price || item.sellingPrice || 0;
                              const netSellingPrice = item.finalPrice || item.sellingPrice || item.price || 0;
                              const discountPct =
                                item.discountPercent ||
                                (regularPrice > netSellingPrice
                                  ? Math.round(((regularPrice - netSellingPrice) / regularPrice) * 100)
                                  : 0);

                              const cleanPhone = (item.supplierPhone || '').replace(/\D/g, '');
                              const intlPhone = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;
                              const reorderMsg = `Hello ${item.supplier || 'Supplier'}, regarding stock for ${shopProfile.shopName || 'Boutique'}:\nWe need to reorder "${item.name}" (${item.category}). Current stock is ${item.quantity} pcs.`;
                              const whatsappUrl = item.supplierPhone ? getWhatsAppUrl(intlPhone, reorderMsg) : '';

                              return (
                                <tr
                                  key={item.id}
                                  className="hover:bg-emerald-50/20 transition-colors group/row"
                                >
                                  <td
                                    className="w-1.5 p-0"
                                    style={{ backgroundColor: group.color }}
                                  />

                                  {/* Item Name & Photo */}
                                  <td className="py-2.5 px-3">
                                    <div className="flex items-center gap-2.5">
                                      <div
                                        onClick={() => {
                                          setViewerItem(item);
                                          setViewerActiveIdx(0);
                                        }}
                                        className="w-8 h-8 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 shrink-0 cursor-pointer hover:scale-105 transition-transform"
                                        title={t('inventory.viewLookbook', 'View Lookbook')}
                                      >
                                        {photo ? (
                                          <img
                                            src={photo}
                                            alt={item.name}
                                            referrerPolicy="no-referrer"
                                            className="w-full h-full object-cover"
                                          />
                                        ) : (
                                          <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-slate-400 bg-slate-100">
                                            {(item.category || 'GT').slice(0, 2).toUpperCase()}
                                          </div>
                                        )}
                                      </div>
                                      <div className="min-w-0">
                                        <span
                                          onClick={() => handleOpenEdit(item)}
                                          className="font-bold text-slate-900 hover:text-[#0B4636] cursor-pointer block truncate"
                                          title={item.name}
                                        >
                                          {item.name}
                                        </span>
                                        {item.location && (
                                          <span className="text-[10px] text-slate-400 block truncate">
                                            📍 {item.location}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </td>

                                  {/* Status */}
                                  <td className="py-2.5 px-2.5 text-center">
                                    <button
                                      type="button"
                                      onClick={() => handleOpenAdjust(item, 0)}
                                      title={t('inventory.adjustTitle', 'Adjust Garment Stock')}
                                      className={`inline-block w-auto min-w-[76px] py-1 px-2 rounded-full font-black text-[10px] uppercase tracking-wider cursor-pointer transition-transform active:scale-95 shadow-2xs ${
                                        isOutOfStock
                                          ? 'bg-rose-100 text-rose-800 border border-rose-200 hover:bg-rose-200'
                                          : isLowStock
                                          ? 'bg-amber-100 text-amber-900 border border-amber-200 hover:bg-amber-200'
                                          : 'bg-emerald-100 text-emerald-900 border border-emerald-300 hover:bg-emerald-200'
                                      }`}
                                    >
                                      {isOutOfStock ? t('inventory.outOfStock', 'Out of Stock') : isLowStock ? t('inventory.lowStock', 'Low Stock') : t('inventory.inStock', 'In Stock')}
                                    </button>
                                  </td>

                                  {/* Gender */}
                                  <td className="py-2.5 px-2.5">
                                    <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-slate-100 text-slate-700 border border-slate-200">
                                      {item.gender === 'Women' ? t('inventory.women', 'Women') : item.gender === 'Men' ? t('inventory.men', 'Men') : t('inventory.kids', 'Kids')}
                                    </span>
                                  </td>

                                  {/* Category */}
                                  <td className="py-2.5 px-2.5">
                                    <span className="font-semibold text-slate-700 text-[11px] truncate block max-w-[120px]" title={item.category}>
                                      {item.category}
                                    </span>
                                  </td>

                                  {/* Sizes */}
                                  <td className="py-2.5 px-2.5">
                                    <div className="flex items-center gap-1 flex-wrap">
                                      {item.sizes && item.sizes.length > 0 ? (
                                        item.sizes.map((sz) => (
                                          <span
                                            key={sz.size}
                                            className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-slate-100 text-[10px] font-bold text-slate-700 border border-slate-200"
                                          >
                                            <span>{sz.size}</span>
                                            <span className="text-[9px] text-slate-500 font-semibold bg-white px-0.5 rounded">
                                              {sz.quantity}
                                            </span>
                                          </span>
                                        ))
                                      ) : (
                                        <span className="text-[10px] text-slate-400">{t('inventory.freeSize', 'Free Size')} ({item.quantity})</span>
                                      )}
                                    </div>
                                  </td>

                                  {/* MRP */}
                                  <td className="py-2.5 px-2.5 text-right font-medium text-slate-500">
                                    ₹{regularPrice.toLocaleString('en-IN')}
                                  </td>

                                  {/* Discount */}
                                  <td className="py-2.5 px-2 text-center">
                                    {discountPct > 0 ? (
                                      <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-[#0B4636] font-black text-[10px] border border-emerald-200">
                                        {discountPct}% OFF
                                      </span>
                                    ) : (
                                      <span className="text-slate-300">-</span>
                                    )}
                                  </td>

                                  {/* Final Selling Price */}
                                  <td className="py-2.5 px-2.5 text-right font-black text-slate-900">
                                    ₹{netSellingPrice.toLocaleString('en-IN')}
                                  </td>

                                  {/* Stock Units & Stepper */}
                                  <td className="py-2.5 px-2.5">
                                    <div className="flex items-center justify-center gap-1">
                                      <button
                                        type="button"
                                        onClick={(e) => handleInstantAdjust(item, -1, e)}
                                        title="Decrease 1 pc"
                                        className="w-5 h-5 rounded bg-slate-100 hover:bg-rose-100 hover:text-rose-700 text-slate-600 font-bold flex items-center justify-center text-[10px] cursor-pointer transition-colors"
                                      >
                                        -
                                      </button>
                                      <span
                                        className={`w-7 text-center font-black text-xs ${
                                          isOutOfStock
                                            ? 'text-rose-600'
                                            : isLowStock
                                            ? 'text-amber-600'
                                            : 'text-slate-900'
                                        }`}
                                      >
                                        {item.quantity}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={(e) => handleInstantAdjust(item, 1, e)}
                                        title="Increase 1 pc"
                                        className="w-5 h-5 rounded bg-slate-100 hover:bg-emerald-100 hover:text-emerald-800 text-slate-600 font-bold flex items-center justify-center text-[10px] cursor-pointer transition-colors"
                                      >
                                        +
                                      </button>
                                    </div>
                                  </td>

                                  {/* Actions */}
                                  <td className="py-2.5 px-3 text-right">
                                    <div className="flex items-center justify-end gap-1">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setViewerItem(item);
                                          setViewerActiveIdx(0);
                                        }}
                                        title={t('inventory.viewLookbook', 'View Lookbook')}
                                        className="w-6.5 h-6.5 rounded-md bg-slate-100 hover:bg-emerald-50 hover:text-[#0B4636] text-slate-600 flex items-center justify-center cursor-pointer transition-colors"
                                      >
                                        <Eye className="w-3.5 h-3.5" />
                                      </button>

                                      {item.supplierPhone && (
                                        <a
                                          href={whatsappUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          title={t('inventory.whatsappReorder', 'WhatsApp Reorder')}
                                          className="w-6.5 h-6.5 rounded-md bg-emerald-700 hover:bg-emerald-800 text-white flex items-center justify-center cursor-pointer shadow-2xs"
                                        >
                                          <MessageSquare className="w-3.5 h-3.5 fill-white" />
                                        </a>
                                      )}

                                      <button
                                        type="button"
                                        onClick={() => handleOpenEdit(item)}
                                        title={t('inventory.editGarment', 'Edit Garment')}
                                        className="w-6.5 h-6.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center cursor-pointer transition-colors"
                                      >
                                        <Edit className="w-3.5 h-3.5" />
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => handleDeleteItem(item.id, item.name)}
                                        title={t('inventory.deleteItem', 'Delete Item')}
                                        className="w-6.5 h-6.5 rounded-md bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-500 flex items-center justify-center cursor-pointer transition-colors"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}

                            {/* Desktop Inline Add Row */}
                            <tr className="bg-slate-50/50 hover:bg-slate-100/50">
                              <td className="w-1.5 p-0" style={{ backgroundColor: group.color }} />
                              <td colSpan={10} className="py-2 px-3">
                                <form
                                  onSubmit={(e) => {
                                    e.preventDefault();
                                    handleInlineQuickAdd(group.key);
                                  }}
                                  className="flex items-center gap-2"
                                >
                                  <Plus className="w-3.5 h-3.5 text-slate-400" />
                                  <input
                                    type="text"
                                    placeholder={`${t('inventory.inlineAddPlaceholder', '+ Add Item to')} ${group.title}...`}
                                    value={inlineNewItemName[group.key] || ''}
                                    onChange={(e) =>
                                      setInlineNewItemName((prev) => ({
                                        ...prev,
                                        [group.key]: e.target.value,
                                      }))
                                    }
                                    className="flex-1 bg-transparent border-none text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-hidden"
                                  />
                                  {inlineNewItemName[group.key]?.trim() && (
                                    <button
                                      type="submit"
                                      className="px-2.5 py-1 rounded bg-[#0B4636] hover:bg-[#073327] text-white font-bold text-[10px] cursor-pointer"
                                    >
                                      {t('inventory.addBtn', 'Add')}
                                    </button>
                                  )}
                                </form>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* 2. MOBILE VIEW: Touch-Friendly Garment Card List (Visible on < md) */}
                      <div className="md:hidden divide-y divide-slate-100">
                        {group.items.map((item) => {
                          const isLowStock = item.quantity > 0 && item.quantity <= (item.minStockAlert || 3);
                          const isOutOfStock = item.quantity <= 0;

                          const displayPhotos =
                            item.selectedPhotos && item.selectedPhotos.length > 0
                              ? item.selectedPhotos
                              : item.photos && item.photos.length > 0
                              ? item.photos
                              : item.image
                              ? [item.image]
                              : [];
                          const photo = displayPhotos[0];

                          const regularPrice = item.price || item.sellingPrice || 0;
                          const netSellingPrice = item.finalPrice || item.sellingPrice || item.price || 0;
                          const discountPct =
                            item.discountPercent ||
                            (regularPrice > netSellingPrice
                              ? Math.round(((regularPrice - netSellingPrice) / regularPrice) * 100)
                              : 0);

                          const cleanPhone = (item.supplierPhone || '').replace(/\D/g, '');
                          const intlPhone = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;
                          const reorderMsg = `Hello ${item.supplier || 'Supplier'}, regarding stock for ${shopProfile.shopName || 'Boutique'}:\nWe need to reorder "${item.name}" (${item.category}). Current stock is ${item.quantity} pcs.`;
                          const whatsappUrl = item.supplierPhone ? getWhatsAppUrl(intlPhone, reorderMsg) : '';

                          return (
                            <div
                              key={item.id}
                              className="p-3.5 space-y-2.5 hover:bg-slate-50/50 transition-colors"
                            >
                              {/* Top row: Photo, Title, Category, and Stock Status Pill */}
                              <div className="flex items-start gap-3">
                                {/* Photo thumbnail */}
                                <div
                                  onClick={() => {
                                    setViewerItem(item);
                                    setViewerActiveIdx(0);
                                  }}
                                  className="w-14 h-14 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0 cursor-pointer shadow-2xs active:scale-95 transition-transform"
                                >
                                  {photo ? (
                                    <img
                                      src={photo}
                                      alt={item.name}
                                      referrerPolicy="no-referrer"
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center text-[10px] font-bold text-slate-400 bg-slate-100">
                                      <ImageIcon className="w-4 h-4 text-slate-300 mb-0.5" />
                                      <span>{(item.category || 'GT').slice(0, 3)}</span>
                                    </div>
                                  )}
                                </div>

                                {/* Title, location, category badges */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-1.5">
                                    <h4
                                      onClick={() => handleOpenEdit(item)}
                                      className="font-bold text-xs text-slate-900 hover:text-emerald-800 line-clamp-2 cursor-pointer leading-snug"
                                    >
                                      {item.name}
                                    </h4>

                                    {/* Status Pill */}
                                    <button
                                      type="button"
                                      onClick={() => handleOpenAdjust(item, 0)}
                                      className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shrink-0 touch-manipulation ${
                                        isOutOfStock
                                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                          : isLowStock
                                          ? 'bg-amber-100 text-amber-900 border border-amber-200'
                                          : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                      }`}
                                    >
                                      {isOutOfStock ? t('inventory.outOfStock', 'Out of Stock') : isLowStock ? t('inventory.lowStock', 'Low Stock') : t('inventory.inStock', 'In Stock')}
                                    </button>
                                  </div>

                                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                    <span className="px-1.5 py-0.2 rounded bg-slate-100 text-[10px] font-bold text-slate-600 border border-slate-200">
                                      {item.gender === 'Women' ? t('inventory.women', 'Women') : item.gender === 'Men' ? t('inventory.men', 'Men') : t('inventory.kids', 'Kids')}
                                    </span>
                                    <span className="text-[10px] font-semibold text-slate-500">
                                      {item.category}
                                    </span>
                                    {item.location && (
                                      <span className="text-[10px] text-slate-400">
                                        • 📍 {item.location}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Middle row: Sizes breakdown */}
                              <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                                {item.sizes && item.sizes.length > 0 ? (
                                  item.sizes.map((sz) => (
                                    <span
                                      key={sz.size}
                                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-100 text-[10px] font-bold text-slate-700 border border-slate-200"
                                    >
                                      <span>{sz.size}</span>
                                      <span className="text-[9px] text-slate-600 font-black bg-white px-1 py-0.2 rounded">
                                        {sz.quantity}
                                      </span>
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-[10px] font-medium text-slate-500">
                                    {t('inventory.freeSize', 'Free Size')}: {item.quantity} {t('inventory.pcs', 'pcs')}
                                  </span>
                                )}
                              </div>

                              {/* Bottom row: Price, Stock Stepper, and Action Controls */}
                              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                                {/* Pricing */}
                                <div>
                                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                                    {t('inventory.sellingPrice', 'Selling Price')}
                                  </span>
                                  <div className="flex items-baseline gap-1.5">
                                    <span className="text-sm font-black text-slate-900">
                                      ₹{netSellingPrice.toLocaleString('en-IN')}
                                    </span>
                                    {discountPct > 0 && regularPrice > netSellingPrice && (
                                      <span className="text-[10px] text-slate-400 line-through">
                                        ₹{regularPrice.toLocaleString('en-IN')}
                                      </span>
                                    )}
                                    {discountPct > 0 && (
                                      <span className="text-[9px] font-black text-emerald-700 bg-emerald-50 px-1 rounded border border-emerald-200">
                                        {discountPct}% OFF
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Stock Stepper with 44px touch targets */}
                                <div className="flex items-center bg-slate-100 rounded-xl p-0.5 border border-slate-200">
                                  <button
                                    type="button"
                                    onClick={(e) => handleInstantAdjust(item, -1, e)}
                                    className="w-8 h-8 rounded-lg bg-white hover:bg-rose-50 hover:text-rose-700 text-slate-700 font-black text-xs flex items-center justify-center cursor-pointer shadow-2xs touch-manipulation active:scale-90"
                                    title="Decrease 1"
                                  >
                                    -
                                  </button>
                                  <span className="w-8 text-center font-black text-xs text-slate-900">
                                    {item.quantity}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(e) => handleInstantAdjust(item, 1, e)}
                                    className="w-8 h-8 rounded-lg bg-white hover:bg-emerald-50 hover:text-emerald-800 text-slate-700 font-black text-xs flex items-center justify-center cursor-pointer shadow-2xs touch-manipulation active:scale-90"
                                    title="Increase 1"
                                  >
                                    +
                                  </button>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setViewerItem(item);
                                      setViewerActiveIdx(0);
                                    }}
                                    className="w-8 h-8 rounded-xl bg-emerald-50 text-[#0B4636] border border-emerald-200 hover:bg-emerald-100 flex items-center justify-center cursor-pointer touch-manipulation transition-colors"
                                    title={t('inventory.viewLookbook', 'View Lookbook')}
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>

                                  {item.supplierPhone && (
                                    <a
                                      href={whatsappUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="w-8 h-8 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white flex items-center justify-center cursor-pointer touch-manipulation shadow-2xs"
                                      title={t('inventory.whatsappReorder', 'WhatsApp Reorder')}
                                    >
                                      <MessageSquare className="w-4 h-4 fill-white" />
                                    </a>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => handleOpenEdit(item)}
                                    className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center cursor-pointer touch-manipulation transition-colors"
                                    title={t('inventory.editGarment', 'Edit Garment')}
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleDeleteItem(item.id, item.name)}
                                    className="w-8 h-8 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center cursor-pointer touch-manipulation transition-colors"
                                    title={t('inventory.deleteItem', 'Delete Item')}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}

                        {/* Mobile Inline Quick Add Row */}
                        <div className="p-3 bg-slate-50/70 border-t border-slate-100">
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              handleInlineQuickAdd(group.key);
                            }}
                            className="flex items-center gap-2"
                          >
                            <Plus className="w-4 h-4 text-slate-400 shrink-0" />
                            <input
                              type="text"
                              placeholder={`${t('inventory.inlineAddPlaceholder', '+ Add Item to')} ${group.title}...`}
                              value={inlineNewItemName[group.key] || ''}
                              onChange={(e) =>
                                setInlineNewItemName((prev) => ({
                                  ...prev,
                                  [group.key]: e.target.value,
                                }))
                              }
                              className="flex-1 bg-white h-8.5 px-3 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-hidden"
                            />
                            {inlineNewItemName[group.key]?.trim() && (
                              <button
                                type="submit"
                                className="h-8.5 px-3 rounded-xl bg-[#0B4636] hover:bg-[#073327] text-white font-bold text-xs cursor-pointer touch-manipulation"
                              >
                                {t('inventory.addBtn', 'Add')}
                              </button>
                            )}
                          </form>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ================= VIEW 2: CARDS / LOOKBOOK GALLERY ================= */}
      {activeBoardView === 'cards' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
          {filteredItems.map((item) => {
            const isLowStock = item.quantity <= (item.minStockAlert || 3);
            const isOutOfStock = item.quantity <= 0;

            const displayPhotos =
              item.selectedPhotos && item.selectedPhotos.length > 0
                ? item.selectedPhotos
                : item.photos && item.photos.length > 0
                ? item.photos
                : item.image
                ? [item.image]
                : [];
            const primaryPhoto =
              displayPhotos[0] ||
              'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=600&auto=format&fit=crop&q=80';

            const regularPrice = item.price || item.sellingPrice || 0;
            const netSellingPrice = item.finalPrice || item.sellingPrice || item.price || 0;
            const discountPct =
              item.discountPercent ||
              (regularPrice > netSellingPrice
                ? Math.round(((regularPrice - netSellingPrice) / regularPrice) * 100)
                : 0);

            const cleanPhone = (item.supplierPhone || '').replace(/\D/g, '');
            const intlPhone = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;
            const reorderMsg = `Hello ${item.supplier || 'Supplier'}, regarding stock for ${shopProfile.shopName || 'Boutique'}:\nWe need to reorder "${item.name}". Current stock: ${item.quantity} pcs.`;
            const whatsappUrl = item.supplierPhone ? getWhatsAppUrl(intlPhone, reorderMsg) : '';

            return (
              <div
                key={item.id}
                className={`bg-white rounded-2xl p-3.5 sm:p-4 border transition-all shadow-xs flex flex-col justify-between relative group ${
                  isOutOfStock
                    ? 'border-rose-300 bg-rose-50/15'
                    : isLowStock
                    ? 'border-amber-300 bg-amber-50/15'
                    : 'border-slate-200 hover:border-slate-400 hover:shadow-md'
                }`}
              >
                <div>
                  {/* Photo Thumbnail */}
                  <div
                    onClick={() => {
                      setViewerItem(item);
                      setViewerActiveIdx(0);
                    }}
                    className="relative aspect-4/3 rounded-xl overflow-hidden bg-slate-100 border border-slate-200/80 mb-3 cursor-pointer group/img"
                  >
                    <img
                      src={primaryPhoto}
                      alt={item.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-300"
                    />

                    {/* Gender & Category */}
                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                      <span className="text-[10px] font-black uppercase tracking-wider bg-slate-900/90 backdrop-blur-xs text-white px-2.5 py-0.5 rounded-full shadow-xs">
                        {item.gender === 'Women' ? t('inventory.women', 'Women') : item.gender === 'Men' ? t('inventory.men', 'Men') : t('inventory.kids', 'Kids')}
                      </span>
                      <span className="text-[10px] font-bold bg-white/95 backdrop-blur-xs text-slate-800 px-2 py-0.5 rounded-full shadow-xs border border-slate-200">
                        {item.category}
                      </span>
                    </div>

                    {/* Stock Status Badge */}
                    <div className="absolute top-2.5 right-2.5">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs text-white ${
                          isOutOfStock ? 'bg-[#e2445c]' : isLowStock ? 'bg-[#fdab3d] text-slate-950 font-black' : 'bg-[#00c875]'
                        }`}
                      >
                        {isOutOfStock ? t('inventory.outOfStock', 'Out of Stock') : isLowStock ? `${t('inventory.lowStock', 'Low')} (${item.quantity})` : `${item.quantity} ${t('inventory.inStock', 'in Stock')}`}
                      </span>
                    </div>
                  </div>

                  {/* Name */}
                  <h3
                    onClick={() => handleOpenEdit(item)}
                    className="font-black text-slate-900 text-sm sm:text-base leading-snug hover:text-[#0B4636] transition-colors cursor-pointer"
                  >
                    {item.name}
                  </h3>

                  {/* Sizes */}
                  <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center gap-1.5 flex-wrap">
                    {item.sizes && item.sizes.length > 0 ? (
                      item.sizes.map((sz) => (
                        <span
                          key={sz.size}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-[11px] font-bold text-slate-800"
                        >
                          <span>{sz.size}</span>
                          <span className="text-[10px] text-slate-500 font-semibold bg-white px-1 rounded">
                            {sz.quantity}
                          </span>
                        </span>
                      ))
                    ) : (
                      <span className="text-[11px] font-bold text-slate-600">{t('inventory.freeSize', 'Free Size')}: {item.quantity} pcs</span>
                    )}
                  </div>

                  {/* Pricing */}
                  <div className="mt-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200/70 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">
                        {t('inventory.sellingPrice', 'Selling Price')}
                      </span>
                      <div className="flex items-baseline gap-1.5 mt-0.5">
                        <span className="text-base font-black text-slate-900">
                          ₹{netSellingPrice.toLocaleString('en-IN')}
                        </span>
                        {discountPct > 0 && regularPrice > netSellingPrice && (
                          <span className="text-xs font-semibold text-slate-400 line-through">
                            ₹{regularPrice.toLocaleString('en-IN')}
                          </span>
                        )}
                      </div>
                    </div>

                    {discountPct > 0 && (
                      <span className="text-[10px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300 px-2 py-1 rounded-lg">
                        {discountPct}% OFF
                      </span>
                    )}
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-0.5 border border-slate-200">
                    <button
                      type="button"
                      onClick={(e) => handleInstantAdjust(item, -1, e)}
                      title="Quick -1"
                      className="w-7 h-7 rounded-lg bg-white hover:bg-rose-50 hover:text-rose-700 text-slate-700 font-black text-xs flex items-center justify-center cursor-pointer touch-manipulation shadow-2xs"
                    >
                      -1
                    </button>
                    <span className="w-7 text-center font-black text-xs text-slate-900">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => handleInstantAdjust(item, 1, e)}
                      title="Quick +1"
                      className="w-7 h-7 rounded-lg bg-white hover:bg-emerald-50 hover:text-emerald-800 text-slate-700 font-black text-xs flex items-center justify-center cursor-pointer touch-manipulation shadow-2xs"
                    >
                      +1
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setViewerItem(item);
                        setViewerActiveIdx(0);
                      }}
                      className="w-8 h-8 rounded-xl bg-emerald-50 text-[#0B4636] border border-emerald-200 hover:bg-emerald-100 flex items-center justify-center cursor-pointer touch-manipulation transition-colors"
                      title={t('inventory.viewLookbook', 'View Lookbook')}
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    {item.supplierPhone && (
                      <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-8 h-8 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white flex items-center justify-center cursor-pointer touch-manipulation shadow-2xs"
                        title={t('inventory.whatsappReorder', 'WhatsApp Reorder')}
                      >
                        <MessageSquare className="w-4 h-4 fill-white" />
                      </a>
                    )}

                    <button
                      type="button"
                      onClick={() => handleOpenEdit(item)}
                      className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center cursor-pointer touch-manipulation transition-colors"
                      title={t('inventory.editGarment', 'Edit Garment')}
                    >
                      <Edit className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteItem(item.id, item.name)}
                      className="w-8 h-8 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center cursor-pointer touch-manipulation transition-colors"
                      title={t('inventory.deleteItem', 'Delete Item')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ================= VIEW 3: FINANCIAL KPIS & VALUATION ================= */}
      {activeBoardView === 'metrics' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-tight">
                {t('inventory.totalStockUnits', 'Total Stock Units')}
              </span>
              <div className="text-2xl font-black text-slate-900 mt-1.5">
                {metrics.totalStockUnits} <span className="text-sm font-medium text-slate-400">{t('inventory.pcs', 'Pcs')}</span>
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {t('inventory.totalStyles', `Across ${metrics.totalItems} unique styles`).replace('{count}', String(metrics.totalItems))}
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-tight">
                {t('inventory.acquisitionCost', 'Acquisition Cost')}
              </span>
              <div className="text-2xl font-black text-slate-900 mt-1.5">
                ₹{metrics.totalValuation.toLocaleString('en-IN')}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {t('inventory.investedCapital', 'Total invested capital')}
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-tight">
                {t('inventory.retailValue', 'Retail Value')}
              </span>
              <div className="text-2xl font-black text-[#0B4636] mt-1.5">
                ₹{metrics.totalRetailPotential.toLocaleString('en-IN')}
              </div>
              <div className="text-xs text-emerald-700 font-bold mt-1">
                +₹{metrics.grossProfitPotential.toLocaleString('en-IN')} {t('inventory.grossProfitPotential', 'Gross Profit Potential')}
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-tight">
                {t('inventory.lowStockAlertsCount', 'Low Stock Alerts')}
              </span>
              <div
                className={`text-2xl font-black mt-1.5 ${
                  metrics.lowStockCount + metrics.outOfStockCount > 0 ? 'text-amber-600' : 'text-slate-900'
                }`}
              >
                {metrics.lowStockCount + metrics.outOfStockCount} <span className="text-sm font-medium text-slate-400">{t('inventory.stylesCount', 'Styles')}</span>
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {metrics.outOfStockCount > 0 ? `${metrics.outOfStockCount} ${t('inventory.outOfStockAlert', 'out of stock')}` : t('inventory.requireReordering', 'Require reordering')}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= ADD / EDIT INVENTORY ITEM MODAL ================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-4 sm:p-6 shadow-2xl border border-slate-100 my-4 max-h-[92vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#0B4636] text-white font-black flex items-center justify-center shadow-xs shrink-0">
                  <Boxes className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
                    {editingItem ? t('inventory.modalEditTitle', 'Edit Inventory Garment') : t('inventory.modalAddTitle', 'Add New Garment to Inventory')}
                  </h3>
                  <p className="text-[11px] text-slate-500 hidden sm:block">
                    {t('inventory.modalSub', 'Configure garment details, sizes, photos, stock inventory, and pricing.')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer touch-manipulation"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Form Content */}
            <form onSubmit={handleSaveItem} className="space-y-4 text-xs overflow-y-auto pr-1 flex-1">
              {/* 1. Item Name */}
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  {t('inventory.itemName', 'Item Name *')}
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Banarasi Raw Silk Bridal Lehenga with Hand Zari Work"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full h-10 px-3.5 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#0B4636] font-semibold text-slate-900 outline-hidden"
                />
              </div>

              {/* 2. Gender Selection & Dynamic Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Gender */}
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    {t('inventory.gender', 'Gender *')}
                  </label>
                  <div className="grid grid-cols-3 gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
                    {(['Women', 'Men', 'Kids'] as const).map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => handleGenderChange(g)}
                        className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer touch-manipulation ${
                          formGender === g
                            ? 'bg-slate-900 text-white shadow-xs'
                            : 'text-slate-700 hover:bg-slate-200/60'
                        }`}
                      >
                        {g === 'Women' ? `👩 ${t('inventory.women', 'Women')}` : g === 'Men' ? `👨 ${t('inventory.men', 'Men')}` : `👶 ${t('inventory.kids', 'Kids')}`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Category */}
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    {t('inventory.category', 'Category')} *
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-800 focus:bg-white focus:border-[#0B4636] focus:outline-hidden cursor-pointer"
                  >
                    {dynamicFormCategories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 3. Sizes Checklist with Quantity Input */}
              <div className="bg-slate-50 p-3 sm:p-3.5 rounded-xl border border-slate-200/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-black text-slate-900 text-xs block">
                      {t('inventory.selectSizes', 'Select Sizes & Quantities *')}
                    </span>
                    <span className="text-[10px] sm:text-[11px] text-slate-500">
                      {t('inventory.sizesSub', 'Tick available sizes and enter stock quantity.')}
                    </span>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-900 border border-emerald-200 font-black text-xs shrink-0">
                    {t('inventory.total', 'Total')}: {totalSelectedQuantity} {t('inventory.pcs', 'Pcs')}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                  {STANDARD_SIZES.map((sz) => {
                    const entry = selectedSizes[sz.size] || { enabled: false, quantity: 1 };
                    return (
                      <div
                        key={sz.size}
                        className={`p-2 rounded-xl border transition-all flex items-center justify-between gap-1.5 ${
                          entry.enabled
                            ? 'bg-white border-[#0B4636] shadow-xs'
                            : 'bg-slate-100/70 border-slate-200 opacity-60'
                        }`}
                      >
                        <label className="flex items-center gap-1.5 cursor-pointer select-none min-w-0">
                          <input
                            type="checkbox"
                            checked={entry.enabled}
                            onChange={() => handleToggleSize(sz.size)}
                            className="w-4 h-4 rounded text-[#0B4636] focus:ring-[#0B4636] cursor-pointer shrink-0"
                          />
                          <span className="font-bold text-slate-900 text-[11px] sm:text-xs truncate">
                            {sz.label}
                          </span>
                        </label>

                        {entry.enabled ? (
                          <div className="flex items-center gap-0.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleSizeQuantityChange(sz.size, entry.quantity - 1)}
                              className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-xs touch-manipulation"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min={1}
                              value={entry.quantity}
                              onChange={(e) =>
                                handleSizeQuantityChange(sz.size, parseInt(e.target.value, 10) || 1)
                              }
                              className="w-8 h-6 text-center font-black text-slate-900 bg-slate-50 border border-slate-200 rounded text-xs focus:bg-white outline-hidden"
                            />
                            <button
                              type="button"
                              onClick={() => handleSizeQuantityChange(sz.size, entry.quantity + 1)}
                              className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-xs touch-manipulation"
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-medium">Off</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 4. Photos */}
              <div className="bg-slate-50 p-3 sm:p-3.5 rounded-xl border border-slate-200/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-black text-slate-900 text-xs block">
                      {t('inventory.garmentPhotos', 'Garment Photos (2 to 6 Photos) *')}
                    </span>
                    <span className="text-[10px] sm:text-[11px] text-slate-500">
                      {t('inventory.photosSub', 'Upload clear photos of the garment.')}
                    </span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-black shrink-0 ${
                      formGarmentPhotos.length >= 2
                        ? 'bg-emerald-100 text-emerald-900'
                        : 'bg-amber-100 text-amber-900'
                    }`}
                  >
                    {formGarmentPhotos.length} / 6
                  </span>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 pt-1">
                  {formGarmentPhotos.map((photoUrl, idx) => (
                    <div
                      key={idx}
                      className="relative aspect-square rounded-xl overflow-hidden bg-slate-200 border border-slate-300 group shadow-xs"
                    >
                      <img
                        src={photoUrl}
                        alt={`Garment ${idx + 1}`}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-1 left-1 bg-slate-900/80 text-white text-[9px] font-bold px-1 rounded">
                        #{idx + 1}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveGarmentPhoto(idx)}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center opacity-90 hover:opacity-100 cursor-pointer shadow-xs"
                        title="Remove"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}

                  {formGarmentPhotos.length < 6 && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="aspect-square rounded-xl border-2 border-dashed border-slate-300 hover:border-[#0B4636] bg-white hover:bg-emerald-50/40 text-slate-500 hover:text-[#0B4636] flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer touch-manipulation"
                    >
                      <Upload className="w-4 h-4" />
                      <span className="text-[10px] font-bold">{t('inventory.addPhoto', '+ Add Photo')}</span>
                    </button>
                  )}
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </div>

              {/* 5. Pricing, Discount & Margin */}
              <div className="bg-slate-50 p-3 sm:p-3.5 rounded-xl border border-slate-200/80 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-800 mb-1">
                      {t('inventory.priceMrp', 'Price / MRP (₹) *')}
                    </label>
                    <input
                      type="number"
                      required
                      min={0}
                      placeholder="0"
                      value={formPrice}
                      onChange={(e) => setFormPrice(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full h-10 px-3.5 rounded-xl bg-white border border-slate-200 font-black text-slate-900 text-sm focus:border-[#0B4636] outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-800 mb-1">
                      {t('inventory.discount', 'Discount (%)')}
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      placeholder="0"
                      value={formDiscountPercent}
                      onChange={(e) => setFormDiscountPercent(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full h-10 px-3.5 rounded-xl bg-white border border-slate-200 font-bold text-slate-900 text-sm focus:border-[#0B4636] outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-800 mb-1">
                      {t('inventory.finalSellingPrice', 'Final Selling Price (₹)')}
                    </label>
                    <div className="w-full h-10 px-3.5 rounded-xl bg-emerald-50 border border-emerald-300 font-black text-[#0B4636] text-base flex items-center justify-between">
                      <span>₹{calculatedFinalPrice.toLocaleString('en-IN')}</span>
                      {Number(formDiscountPercent) > 0 && (
                        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-200/80 px-1.5 py-0.5 rounded">
                          Save ₹{Math.round(((Number(formPrice) || 0) * (Number(formDiscountPercent) || 0)) / 100)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* 6. Location, Supplier, Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    {t('inventory.location', 'Shelf / Rack Location')}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Rack A-3, Top Shelf"
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    className="w-full h-9 px-3 rounded-xl bg-slate-50 border border-slate-200 font-medium text-slate-900 focus:bg-white outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    {t('inventory.supplier', 'Supplier / Vendor Name')}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Surat Silks Wholesale"
                    value={formSupplier}
                    onChange={(e) => setFormSupplier(e.target.value)}
                    className="w-full h-9 px-3 rounded-xl bg-slate-50 border border-slate-200 font-medium text-slate-900 focus:bg-white outline-hidden"
                  />
                </div>
              </div>

              {/* Sticky Submit Bar */}
              <div className="flex items-center justify-between gap-2.5 pt-3 border-t border-slate-100 shrink-0">
                {editingItem ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (editingItem) {
                        setIsAddModalOpen(false);
                        handleDeleteItem(editingItem.id, editingItem.name);
                      }
                    }}
                    className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-rose-200"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{t('inventory.deleteItem', 'Delete Item')}</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddModalOpen(false);
                      setEditingItem(null);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors cursor-pointer touch-manipulation"
                  >
                    {t('inventory.cancel', 'Cancel')}
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs shadow-md transition-transform active:scale-95 cursor-pointer flex items-center gap-1.5 touch-manipulation"
                  >
                    <Plus className="w-4 h-4 stroke-[3]" />
                    <span>{editingItem ? t('inventory.saveChanges', 'Save Changes') : t('inventory.addToInventory', 'Add to Inventory')}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= LOOKBOOK / PHOTO VIEWER MODAL ================= */}
      {viewerItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
          <div className="bg-slate-900 text-white rounded-2xl max-w-3xl w-full p-4 sm:p-5 shadow-2xl border border-slate-800 relative flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase bg-emerald-500 text-white px-2 py-0.5 rounded-md">
                    {viewerItem.gender === 'Women' ? t('inventory.women', 'Women') : viewerItem.gender === 'Men' ? t('inventory.men', 'Men') : t('inventory.kids', 'Kids')}
                  </span>
                  <span className="text-xs font-bold text-slate-300 truncate">
                    {viewerItem.category}
                  </span>
                </div>
                <h3 className="font-extrabold text-sm sm:text-base text-white mt-0.5 truncate">
                  {viewerItem.name}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setViewerItem(null)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center cursor-pointer shrink-0 touch-manipulation"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Main Stage Image */}
            {(() => {
              const allPhotos = viewerItem.selectedPhotos && viewerItem.selectedPhotos.length > 0
                ? viewerItem.selectedPhotos
                : viewerItem.photos || (viewerItem.image ? [viewerItem.image] : []);
              const currentPhoto = allPhotos[viewerActiveIdx] || allPhotos[0] || 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=600&auto=format&fit=crop&q=80';

              return (
                <div className="flex-1 my-3 flex flex-col items-center justify-center overflow-hidden">
                  <div className="relative max-h-[45vh] sm:max-h-[50vh] w-full flex items-center justify-center rounded-xl overflow-hidden bg-slate-950 border border-slate-800">
                    <img
                      src={currentPhoto}
                      alt={viewerItem.name}
                      referrerPolicy="no-referrer"
                      className="max-h-[45vh] sm:max-h-[50vh] max-w-full object-contain"
                    />

                    {/* Nav Arrows */}
                    {allPhotos.length > 1 && (
                      <>
                        <button
                          type="button"
                          onClick={() => setViewerActiveIdx((prev) => (prev > 0 ? prev - 1 : allPhotos.length - 1))}
                          className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-slate-900/80 text-white flex items-center justify-center hover:bg-slate-900 cursor-pointer shadow-lg touch-manipulation"
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setViewerActiveIdx((prev) => (prev < allPhotos.length - 1 ? prev + 1 : 0))}
                          className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-slate-900/80 text-white flex items-center justify-center hover:bg-slate-900 cursor-pointer shadow-lg touch-manipulation"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      </>
                    )}
                  </div>

                  {/* Thumbnail Strip */}
                  {allPhotos.length > 1 && (
                    <div className="flex items-center gap-2 mt-3 overflow-x-auto max-w-full pb-1">
                      {allPhotos.map((url, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setViewerActiveIdx(i)}
                          className={`w-12 h-12 sm:w-14 sm:h-14 rounded-lg overflow-hidden border-2 shrink-0 transition-all cursor-pointer touch-manipulation ${
                            viewerActiveIdx === i
                              ? 'border-emerald-400 scale-105 shadow-md'
                              : 'border-slate-800 opacity-60 hover:opacity-100'
                          }`}
                        >
                          <img
                            src={url}
                            alt={`Thumb ${i + 1}`}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Footer Information */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">{t('inventory.sellingPrice', 'Selling Price')}</span>
                <span className="text-lg font-black text-emerald-400">
                  ₹{(viewerItem.finalPrice || viewerItem.price || 0).toLocaleString('en-IN')}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const item = viewerItem;
                    setViewerItem(null);
                    handleDeleteItem(item.id, item.name);
                  }}
                  className="px-3 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer touch-manipulation border border-rose-500/30"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{t('inventory.deleteItem', 'Delete')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const item = viewerItem;
                    setViewerItem(null);
                    handleOpenEdit(item);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer touch-manipulation"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>{t('inventory.editGarment', 'Edit Garment')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= QUICK STOCK ADJUST MODAL ================= */}
      {adjustingItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-4 sm:p-5 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900">{t('inventory.adjustTitle', 'Adjust Garment Stock')}</h3>
                <span className="text-[11px] text-slate-500 font-medium line-clamp-1">{adjustingItem.name}</span>
              </div>
              <button
                type="button"
                onClick={() => setAdjustingItem(null)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer touch-manipulation"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <form onSubmit={handleApplyAdjustment} className="space-y-3 text-xs">
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex items-center justify-between">
                <span className="text-slate-500 font-bold">{t('inventory.currentStock', 'Current Stock')}:</span>
                <span className="font-black text-slate-900 text-sm">
                  {adjustingItem.quantity} {t('inventory.pcs', 'pcs')}
                </span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {t('inventory.adjustment', 'Adjustment (+ for restock, - for sale)')}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="1"
                    required
                    value={adjustDelta}
                    onChange={(e) => setAdjustDelta(Number(e.target.value))}
                    className="flex-1 h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 font-black text-slate-900 focus:bg-white outline-hidden text-center text-sm"
                  />
                  <span className="font-bold text-slate-600 text-xs">{t('inventory.pcs', 'pcs')}</span>
                </div>

                {/* Presets */}
                <div className="flex items-center gap-1.5 flex-wrap mt-2">
                  <span className="text-[10px] font-bold text-slate-400">{t('inventory.presets', 'Presets')}:</span>
                  {[
                    { label: '+1', val: 1 },
                    { label: '+5', val: 5 },
                    { label: '+10', val: 10 },
                    { label: '-1', val: -1 },
                    { label: '-5', val: -5 },
                  ].map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => setAdjustDelta(p.val)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors cursor-pointer touch-manipulation ${
                        adjustDelta === p.val
                          ? 'bg-[#0B4636] text-white border-[#0B4636]'
                          : p.val > 0
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                          : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {t('inventory.reason', 'Reason / Order Note')}
                </label>
                <input
                  type="text"
                  placeholder="e.g. Fresh stock shipment received"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white outline-hidden"
                />
              </div>

              <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-200 flex items-center justify-between">
                <span className="text-emerald-900 font-bold">{t('inventory.newTotalStock', 'New Total Stock')}:</span>
                <span className="font-black text-emerald-950 text-sm">
                  {Math.max(0, adjustingItem.quantity + adjustDelta)} {t('inventory.pcs', 'pcs')}
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAdjustingItem(null)}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors cursor-pointer touch-manipulation"
                >
                  {t('inventory.cancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black shadow-xs cursor-pointer touch-manipulation"
                >
                  {t('inventory.applyStockChange', 'Apply Stock Change')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= CLEAR ALL INVENTORY MODAL ================= */}
      {isClearModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="font-black text-slate-900 text-base">
                {t('inventory.clearAllTitle', 'Clear All Inventory Items?')}
              </h3>
              <p className="text-xs text-slate-500">
                {t('inventory.clearAllSub', 'This will remove all garments from inventory. This action cannot be undone.')}
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsClearModalOpen(false)}
                className="flex-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer touch-manipulation"
              >
                {t('inventory.cancel', 'Cancel')}
              </button>
              <button
                type="button"
                onClick={handleConfirmClearAll}
                className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs shadow-xs transition-colors cursor-pointer touch-manipulation"
              >
                {t('inventory.yesClearAll', 'Yes, Clear All')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
