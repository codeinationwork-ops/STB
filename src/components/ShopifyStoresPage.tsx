import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Store,
  Bot,
  Zap,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Loader2,
  Terminal,
  RefreshCw,
  ExternalLink,
  Plus,
  Trash2,
  ShoppingCart,
  Tag,
  Code2,
  Database,
  Search,
  Sparkles,
  Copy,
  Check,
  Globe,
  Key,
  Layers,
  ChevronDown,
  ChevronUp,
  Eye,
  Pencil
} from 'lucide-react';
import { ShopifyStore, ShopifyProduct, Product } from '../types';
import {
  saveShopifyStoreToDb,
  getShopifyStoresFromDb,
  deleteShopifyStoreFromDb,
  saveShopifyProductsToDb,
  getShopifyProductsFromDb,
  deleteShopifyProductFromDb,
  upsertBrandProductsToDb,
  updateBrandNameInDb
} from '../lib/firestoreService';

interface ShopifyStoresPageProps {
  onProductsAddedToGlobalCatalog?: (products: Product[]) => void;
}

export const ShopifyStoresPage: React.FC<ShopifyStoresPageProps> = ({
  onProductsAddedToGlobalCatalog
}) => {
  // Store Form Inputs
  const [storeUrlInput, setStoreUrlInput] = useState<string>('https://gymshark.com');
  const [storeNameInput, setStoreNameInput] = useState<string>('Gymshark');
  const [apiKeyInput, setApiKeyInput] = useState<string>('');
  const [discountCodeInput, setDiscountCodeInput] = useState<string>('');

  // Page State
  const [isScraping, setIsScraping] = useState<boolean>(false);
  const [isSavingToDb, setIsSavingToDb] = useState<boolean>(false);
  const [scrapingLogs, setScrapingLogs] = useState<string[]>([]);
  const [stores, setStores] = useState<ShopifyStore[]>([]);
  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [scrapedResult, setScrapedResult] = useState<{
    store: ShopifyStore;
    products: ShopifyProduct[];
    masterProducts: Product[];
  } | null>(null);
  const [selectedStoreFilter, setSelectedStoreFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedScrapedCategory, setSelectedScrapedCategory] = useState<string>('ALL');
  const [selectedScrapedGenderFilter, setSelectedScrapedGenderFilter] = useState<'ALL' | 'Men' | 'Women' | 'Unisex' | 'N/A' | 'UNASSIGNED_ONLY'>('ALL');
  const [savedCategoryFilter, setSavedCategoryFilter] = useState<string>('ALL');
  const [savedGenderFilter, setSavedGenderFilter] = useState<'ALL' | 'Men' | 'Women' | 'Unisex' | 'N/A'>('ALL');
  const [assignedCategoryFilter, setAssignedCategoryFilter] = useState<string>('ALL');
  const [assignedGenderFilter, setAssignedGenderFilter] = useState<'ALL' | 'Men' | 'Women' | 'Unisex'>('ALL');
  const [assignedStoreFilter, setAssignedStoreFilter] = useState<string | null>(null);

  const isProductUnassigned = (p: { category?: string; gender?: string }) => {
    const isCatUnassigned = !p.category || p.category === 'Not Assigned' || p.category === 'Uncategorized' || p.category === 'Apparel & Goods';
    const isGenderUnassigned = !p.gender || p.gender === 'N/A' || p.gender === 'Not Assigned';
    return isCatUnassigned || isGenderUnassigned;
  };
  const [isLoadingStores, setIsLoadingStores] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedCodeIndex, setCopiedCodeIndex] = useState<number | null>(null);
  const [activeCodeTab, setActiveCodeTab] = useState<'python' | 'react'>('python');
  const [activeMainTab, setActiveMainTab] = useState<'connect' | 'connected_stores' | 'assigned_products' | 'saved_products'>('connect');
  const [recrawlingStoreId, setRecrawlingStoreId] = useState<string | null>(null);
  const [expandedStoreIds, setExpandedStoreIds] = useState<Record<string, boolean>>({});

  // Editable Brand Name States
  const [isEditingScrapedBrand, setIsEditingScrapedBrand] = useState<boolean>(false);
  const [scrapedBrandInput, setScrapedBrandInput] = useState<string>('');
  const [editingStoreId, setEditingStoreId] = useState<string | null>(null);
  const [editingStoreNameInput, setEditingStoreNameInput] = useState<string>('');
  const [isUpdatingStoreName, setIsUpdatingStoreName] = useState<boolean>(false);
  const [dbSaveProgress, setDbSaveProgress] = useState<{ current: number; total: number; stage: string } | null>(null);

  const toggleExpandStore = (storeId: string) => {
    setExpandedStoreIds((prev) => ({ ...prev, [storeId]: !prev[storeId] }));
  };

  // Edit brand name on scraped preview before storing to database
  const handleSaveNewScrapedBrandName = (newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed || !scrapedResult) return;

    const updatedStore = {
      ...scrapedResult.store,
      store_name: trimmed
    };

    const updatedProducts = scrapedResult.products.map((p) => ({
      ...p,
      vendor: trimmed
    }));

    const updatedMaster = scrapedResult.masterProducts.map((p) => ({
      ...p,
      brand: trimmed
    }));

    setScrapedResult({
      ...scrapedResult,
      store: updatedStore,
      products: updatedProducts,
      masterProducts: updatedMaster
    });

    setIsEditingScrapedBrand(false);
    showToast(`✨ Brand name updated to "${trimmed}" for database import!`);
  };

  // Edit brand name on existing connected store in database
  const handleUpdateExistingStoreName = async (store: ShopifyStore, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) {
      setEditingStoreId(null);
      return;
    }

    if (trimmed === store.store_name) {
      setEditingStoreId(null);
      return;
    }

    setIsUpdatingStoreName(true);
    const oldName = store.store_name;

    try {
      const updatedStore: ShopifyStore = {
        ...store,
        store_name: trimmed
      };

      // 1. INSTANTLY update UI state so user sees updated store name right away
      setStores((prev) =>
        prev.map((s) => (s.id === store.id || s.store_domain === store.store_domain ? updatedStore : s))
      );

      const cleanDom = store.store_domain.replace(/^https?:\/\//, '').toLowerCase().split('/')[0];
      setProducts((prev) =>
        prev.map((p) => (p.store_domain.toLowerCase().includes(cleanDom) ? { ...p, vendor: trimmed } : p))
      );

      // 2. Persist updated store record to Firestore
      await saveShopifyStoreToDb(updatedStore);

      // 3. Update harvested products in DB
      const storeProds = products.filter((p) => p.store_domain.toLowerCase().includes(cleanDom));
      if (storeProds.length > 0) {
        const updatedProds = storeProds.map((p) => ({ ...p, vendor: trimmed }));
        saveShopifyProductsToDb(updatedProds).catch((e) =>
          console.warn('Background shopify products vendor update notice:', e)
        );
      }

      // 4. Sync brand name update to Firestore BRANDS_COLLECTION & PRODUCTS_COLLECTION in background
      updateBrandNameInDb(oldName, trimmed, store.store_domain).catch((e) =>
        console.warn('Background brand name update in DB notice:', e)
      );

      showToast(`Updated store brand name to "${trimmed}" across database & discovery!`);
    } catch (err: any) {
      console.error('Error updating store brand name:', err);
      showToast(`Failed to update brand name: ${err.message || 'Error'}`);
    } finally {
      setIsUpdatingStoreName(false);
      setEditingStoreId(null);
    }
  };



  const handleUpdateSavedProductCategory = async (variantId: string | number, newCategory: string) => {
    const updated = products.map((p) => (String(p.variant_id) === String(variantId) ? { ...p, category: newCategory } : p));
    setProducts(updated);
    const target = updated.find((p) => String(p.variant_id) === String(variantId));
    if (target) {
      await saveShopifyProductsToDb([target]);
      showToast(`Updated category to "${newCategory}"`);
    }
  };

  const handleUpdateSavedProductGender = async (variantId: string | number, newGender: 'Men' | 'Women' | 'Unisex' | 'N/A') => {
    const updated = products.map((p) => (String(p.variant_id) === String(variantId) ? { ...p, gender: newGender } : p));
    setProducts(updated);
    const target = updated.find((p) => String(p.variant_id) === String(variantId));
    if (target) {
      await saveShopifyProductsToDb([target]);
      showToast(`Updated gender to "${newGender}"`);
    }
  };

  const ALL_TAXONOMY_CATEGORIES = [
    'Tops & Shirts',
    'Bottoms',
    'Outerwear',
    'Dresses & Rompers',
    'Suiting & Tailored Wear',
    'Traditional & Ethnic Wear',
    'Activewear & Gym',
    'Underwear & Intimates',
    'Sleepwear & Loungewear',
    'Swimwear',
    'Athletic Footwear',
    'Casual Shoes',
    'Boots',
    'Dress Shoes',
    'Sandals & Open-Toe',
    'Indoor Footwear',
    'Bags & Luggage',
    'Headwear',
    'Eyewear',
    'Neckwear',
    'Small Leather Goods',
    'Hosiery',
    'Watches',
    'Necklaces',
    'Rings',
    'Earrings',
    'Bracelets',
    'Body Jewelry',
    'Makeup - Face',
    'Makeup - Eyes',
    'Makeup - Lips',
    'Skincare',
    'Haircare',
    'Body Care',
    'Fragrance',
    'Tools & Brushes',
    'Shaving & Hair Removal',
    'Beard & Mustache Care',
    "Men's Hair Styling",
    'Pet Apparel',
    'Research & Specialty',
    'Not Assigned'
  ];

  // Load stores and products from Firestore on mount
  useEffect(() => {
    loadStoresAndProducts();
  }, []);

  const loadStoresAndProducts = async () => {
    setIsLoadingStores(true);
    try {
      const [dbStores, dbProducts] = await Promise.all([
        getShopifyStoresFromDb(),
        getShopifyProductsFromDb()
      ]);
      setStores(dbStores);
      setProducts(dbProducts);
    } catch (err) {
      console.error('Error loading Shopify stores data:', err);
    } finally {
      setIsLoadingStores(false);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Phase 1: Connect & Scrape Shopify Store (.json endpoint bypass)
  const handleConnectAndScrape = async (targetUrl?: string, customName?: string) => {
    const finalUrl = targetUrl || storeUrlInput;
    if (!finalUrl || finalUrl.trim().length < 3) {
      showToast('Please enter a valid Shopify store URL.');
      return;
    }

    setIsScraping(true);
    setScrapedResult(null);
    setScrapingLogs([
      `🚀 [Phase 1: Discovery] Initiating Shopify crawler for target: ${finalUrl}`
    ]);

    try {
      const resp = await fetch('/api/shopify/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_url: finalUrl,
          api_key: apiKeyInput.trim(),
          access_token: apiKeyInput.trim(),
          discount_code: discountCodeInput.trim()
        })
      });

      const data = await resp.json();

      if (!resp.ok || !data.success) {
        throw new Error(data.error || 'Failed to scrape Shopify store');
      }

      const fetchedLogs: string[] = data.logs || [];
      setScrapingLogs(fetchedLogs);

      const scrapedStore: ShopifyStore = data.store;
      const scrapedProducts: ShopifyProduct[] = data.shopify_products || [];
      const masterProds: Product[] = data.master_products || [];

      if (customName) {
        scrapedStore.store_name = customName;
      }

      // Auto-classify gender for all harvested products
      const autoClassifyGender = (title: string, desc?: string, category?: string): 'Men' | 'Women' | 'Unisex' | 'N/A' => {
        const text = `${title} ${desc || ''} ${category || ''}`.toLowerCase();
        const hasWomen = /\b(women|womens|women's|female|ladies|lady|girl|girls|dress|dresses|skirt|skirts|crop|bra|bras|leggings|gown|saree|sari|lehenga|kurti|bikini|monokini|camisole|frock|corset|blouse|midi|maxi|bodycon)\b/i.test(text);
        const hasMen = /\b(men|mens|men's|male|guys|boy|boys|boxer|boxers|trunks|sherwani|vest|chinos|briefs|suit|tuxedo)\b/i.test(text);
        const hasUnisex = /\b(unisex|genderless|all genders|unisexual)\b/i.test(text);

        if (hasWomen && !hasMen) return 'Women';
        if (hasMen && !hasWomen) return 'Men';
        if (hasUnisex) return 'Unisex';
        return 'N/A'; // Default to N/A (Unassigned)
      };

      const enrichedProducts = scrapedProducts.map((p, idx) => {
        const assignedGender = p.gender || autoClassifyGender(p.title, p.description, p.category);
        if (masterProds[idx]) {
          masterProds[idx].gender = assignedGender;
        }
        return { ...p, gender: assignedGender };
      });

      setScrapedResult({
        store: scrapedStore,
        products: enrichedProducts,
        masterProducts: masterProds
      });

      setScrapingLogs((prev) => [
        ...prev,
        `✨ [Scrape Finished] Successfully scraped ${scrapedProducts.length} items for "${scrapedStore.store_name}".`,
        `👉 Click the "Add to Database" button below to save these items into Firestore.`
      ]);

      showToast(`Scraped ${scrapedProducts.length} items! Click "Add to Database" to confirm.`);
    } catch (err: any) {
      console.error('Scrape error:', err);
      setScrapingLogs((prev) => [
        ...prev,
        `❌ Error: ${err.message || 'Scraping failed'}`
      ]);
      showToast(`Scraping error: ${err.message || 'Failed'}`);
    } finally {
      setIsScraping(false);
    }
  };

  // Explicit User Action: Commit Scraped Data to Firestore Database
  const handleSaveScrapedToDatabase = async () => {
    if (!scrapedResult) return;

    // Filter ONLY ready products (products that are assigned, i.e. NOT N/A and NOT Uncategorized)
    const readyProducts = scrapedResult.products.filter((p) => !isProductUnassigned(p));
    const unassignedProds = scrapedResult.products.filter(isProductUnassigned);

    const readyMaster = scrapedResult.masterProducts.filter((p) => !isProductUnassigned(p));
    const unassignedMaster = scrapedResult.masterProducts.filter(isProductUnassigned);

    if (readyProducts.length === 0) {
      showToast(`⚠️ Cannot save to database! All items have 'Not Assigned' details or N/A gender. Please assign details first.`);
      setSelectedScrapedGenderFilter('UNASSIGNED_ONLY');
      return;
    }

    setIsSavingToDb(true);
    setDbSaveProgress({ current: 0, total: readyProducts.length, stage: 'Connecting to Firestore database...' });

    try {
      setScrapingLogs((prev) => [
        ...prev,
        `💾 [Firestore] Syncing Store Metadata for "${scrapedResult.store.store_name}"...`
      ]);
      const savedStore = await saveShopifyStoreToDb(scrapedResult.store);

      setScrapingLogs((prev) => [
        ...prev,
        `💾 [Firestore] Writing ${readyProducts.length} assigned products to "shopify_products"...`
      ]);

      // Save only ready products with progress bar callback
      await saveShopifyProductsToDb(readyProducts, (current, total) => {
        setDbSaveProgress({
          current,
          total,
          stage: `Adding items to database (${current}/${total})...`
        });
      });

      if (readyMaster.length > 0) {
        await upsertBrandProductsToDb(
          scrapedResult.store.store_name,
          readyMaster,
          scrapedResult.store.store_domain,
          (current, total) => {
            setDbSaveProgress({
              current,
              total,
              stage: `Syncing brand catalog for discovery (${current}/${total})...`
            });
          }
        );
        if (onProductsAddedToGlobalCatalog) {
          onProductsAddedToGlobalCatalog(readyMaster);
        }
      }

      if (unassignedProds.length > 0) {
        // KEEP ONLY remaining unassigned N/A products in staging!
        setScrapedResult({
          store: scrapedResult.store,
          products: unassignedProds,
          masterProducts: unassignedMaster
        });

        setScrapingLogs((prev) => [
          ...prev,
          `🎉 [Database Sync] Saved ${readyProducts.length} assigned items to Firestore!`,
          `⚠️ [N/A Staging] ${unassignedProds.length} unassigned / N/A items kept in staging page for manual review.`
        ]);

        showToast(`🎉 Added ${readyProducts.length} newly ready items to DB! ${unassignedProds.length} N/A items remain in staging.`);
        setSelectedScrapedGenderFilter('UNASSIGNED_ONLY');
      } else {
        setScrapingLogs((prev) => [
          ...prev,
          `🎉 [Database Sync Complete] Store "${savedStore.store_name}" & ALL ${readyProducts.length} items saved to Firestore!`
        ]);

        showToast(`🎉 Successfully added all ${readyProducts.length} items for ${savedStore.store_name} to database!`);
        setScrapedResult(null);
      }

      await loadStoresAndProducts();
    } catch (err: any) {
      console.error('Error saving scraped data to DB:', err);
      showToast(`Failed to save to database: ${err.message || 'Error'}`);
    } finally {
      setIsSavingToDb(false);
      setDbSaveProgress(null);
    }
  };

  // Category Autonomy: Save specific category products directly to Firestore
  const handleSaveCategoryToDatabase = async (catName: string) => {
    if (!scrapedResult) return;

    const catProducts = scrapedResult.products.filter(
      (p) => (p.category || 'Uncategorized').toLowerCase() === catName.toLowerCase()
    );
    const catMaster = scrapedResult.masterProducts.filter(
      (p) => (p.category || 'Uncategorized').toLowerCase() === catName.toLowerCase()
    );

    const readyProducts = catProducts.filter((p) => !isProductUnassigned(p));
    const unassignedProds = catProducts.filter(isProductUnassigned);

    if (readyProducts.length === 0) {
      showToast(`⚠️ Category "${catName}" has ${catProducts.length} items with 'Not Assigned' details. Please assign Gender/Category before saving.`);
      setSelectedScrapedGenderFilter('UNASSIGNED_ONLY');
      return;
    }

    setIsSavingToDb(true);
    try {
      await saveShopifyStoreToDb(scrapedResult.store);
      await saveShopifyProductsToDb(readyProducts);

      const readyMaster = catMaster.filter((p) => !isProductUnassigned(p));
      if (readyMaster.length > 0) {
        await upsertBrandProductsToDb(scrapedResult.store.store_name, readyMaster);
        if (onProductsAddedToGlobalCatalog) {
          onProductsAddedToGlobalCatalog(readyMaster);
        }
      }

      // Remove saved ready products from current preview
      const remainingProducts = scrapedResult.products.filter(
        (p) => !readyProducts.some((rp) => String(rp.variant_id) === String(p.variant_id))
      );
      const remainingMaster = scrapedResult.masterProducts.filter(
        (p) => !readyMaster.some((rm) => String(rm.id) === String(p.id))
      );

      setScrapedResult({
        ...scrapedResult,
        products: remainingProducts,
        masterProducts: remainingMaster
      });

      showToast(`✅ Saved ${readyProducts.length} assigned items in "${catName}" to DB! ${unassignedProds.length > 0 ? `${unassignedProds.length} N/A items remain in staging.` : ''}`);
      await loadStoresAndProducts();
    } catch (err: any) {
      console.error('Error saving category to DB:', err);
      showToast(`Failed to save category: ${err.message || 'Error'}`);
    } finally {
      setIsSavingToDb(false);
    }
  };

  // Re-Crawl & Differential Re-Sync for Connected Stores
  const handleRecrawlStore = async (store: ShopifyStore) => {
    setRecrawlingStoreId(store.id || store.store_domain);
    showToast(`🔄 Initiating differential re-crawl for ${store.store_name}...`);

    try {
      const resp = await fetch('/api/shopify/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_url: store.store_domain,
          api_key: store.api_key || store.access_token || apiKeyInput.trim(),
          access_token: store.access_token || apiKeyInput.trim(),
          discount_code: store.discount_code || ''
        })
      });

      const data = await resp.json();
      if (!resp.ok || !data.success) {
        throw new Error(data.error || 'Re-crawl failed');
      }

      const freshProducts: ShopifyProduct[] = data.shopify_products || [];
      const freshMaster: Product[] = data.master_products || [];

      // Differential Sync Comparison
      const existingStoreProds = products.filter((p) => p.store_domain === store.store_domain);
      const existingMap = new Map<string, ShopifyProduct>();
      existingStoreProds.forEach((p) => existingMap.set(String(p.variant_id), p));

      let priceChangedCount = 0;
      let newItemsCount = 0;

      freshProducts.forEach((fp) => {
        const existing = existingMap.get(String(fp.variant_id));
        if (existing) {
          if (existing.price !== fp.price || existing.compare_at_price !== fp.compare_at_price) {
            priceChangedCount++;
            fp.price_dropped = fp.price < existing.price;
            fp.previous_price = existing.price;
          }
        } else {
          newItemsCount++;
        }
      });

      // Update store metadata & save updated products
      const updatedStore = {
        ...store,
        ...data.store,
        total_products: freshProducts.length,
        last_scraped_at: new Date().toISOString()
      };

      await saveShopifyStoreToDb(updatedStore);
      if (freshProducts.length > 0) {
        await saveShopifyProductsToDb(freshProducts);
        if (freshMaster.length > 0) {
          await upsertBrandProductsToDb(updatedStore.store_name, freshMaster);
          if (onProductsAddedToGlobalCatalog) {
            onProductsAddedToGlobalCatalog(freshMaster);
          }
        }
      }

      showToast(`🎉 Re-crawl complete for ${store.store_name}: ${freshProducts.length} items synced (${priceChangedCount} price updates, ${newItemsCount} new products)!`);
      await loadStoresAndProducts();
    } catch (err: any) {
      console.error('Re-crawl store error:', err);
      showToast(`Re-crawl error: ${err.message || 'Failed'}`);
    } finally {
      setRecrawlingStoreId(null);
    }
  };

  // Gender Customization Handlers for Scraped Products
  const handleSetAllScrapedGender = (gender: 'Men' | 'Women' | 'Unisex' | 'N/A') => {
    if (!scrapedResult) return;
    const updatedProducts = scrapedResult.products.map((p) => ({ ...p, gender }));
    const updatedMaster = scrapedResult.masterProducts.map((p) => ({ ...p, gender }));
    setScrapedResult({
      ...scrapedResult,
      products: updatedProducts,
      masterProducts: updatedMaster
    });
    showToast(`Set all ${updatedProducts.length} items to "${gender}"`);
  };

  const handleSetCategoryGender = (catName: string, gender: 'Men' | 'Women' | 'Unisex' | 'N/A') => {
    if (!scrapedResult) return;
    const updatedProducts = scrapedResult.products.map((p) => {
      const pCat = p.category || 'Uncategorized';
      if (pCat.toLowerCase() === catName.toLowerCase()) {
        return { ...p, gender };
      }
      return p;
    });
    const updatedMaster = scrapedResult.masterProducts.map((p) => {
      const pCat = p.category || 'Uncategorized';
      if (pCat.toLowerCase() === catName.toLowerCase()) {
        return { ...p, gender };
      }
      return p;
    });
    setScrapedResult({
      ...scrapedResult,
      products: updatedProducts,
      masterProducts: updatedMaster
    });
    showToast(`Set category "${catName}" to "${gender}"`);
  };

  const handleSetSingleProductGender = (variantId: string | number, gender: 'Men' | 'Women' | 'Unisex' | 'N/A') => {
    if (!scrapedResult) return;
    const updatedProducts = scrapedResult.products.map((p) => {
      if (String(p.variant_id) === String(variantId)) {
        return { ...p, gender };
      }
      return p;
    });
    const updatedMaster = scrapedResult.masterProducts.map((p) => {
      if (String(p.id) === String(`sp_${variantId}`) || String(p.id) === String(variantId)) {
        return { ...p, gender };
      }
      return p;
    });
    setScrapedResult({
      ...scrapedResult,
      products: updatedProducts,
      masterProducts: updatedMaster
    });
  };

  const handleRemoveCategory = (catName: string) => {
    if (!scrapedResult) return;
    const updatedProducts = scrapedResult.products.filter(
      (p) => (p.category || 'Uncategorized').toLowerCase() !== catName.toLowerCase()
    );
    const updatedMaster = scrapedResult.masterProducts.filter(
      (p) => (p.category || 'Uncategorized').toLowerCase() !== catName.toLowerCase()
    );
    setScrapedResult({
      ...scrapedResult,
      products: updatedProducts,
      masterProducts: updatedMaster
    });
    showToast(`Removed category "${catName}" and its items.`);
  };

  const handleRemoveSingleProduct = (variantId: string | number) => {
    if (!scrapedResult) return;
    const updatedProducts = scrapedResult.products.filter(
      (p) => String(p.variant_id) !== String(variantId)
    );
    const updatedMaster = scrapedResult.masterProducts.filter(
      (p) => String(p.id) !== String(`sp_${variantId}`) && String(p.id) !== String(variantId)
    );
    setScrapedResult({
      ...scrapedResult,
      products: updatedProducts,
      masterProducts: updatedMaster
    });
    showToast(`Removed item #${variantId}.`);
  };

  const handleSetSingleProductCategory = (variantId: string | number, newCategory: string) => {
    if (!scrapedResult) return;
    const updatedProducts = scrapedResult.products.map((p) => {
      if (String(p.variant_id) === String(variantId)) {
        return { ...p, category: newCategory };
      }
      return p;
    });
    const updatedMaster = scrapedResult.masterProducts.map((p) => {
      if (String(p.id) === String(`sp_${variantId}`) || String(p.id) === String(variantId)) {
        return { ...p, category: newCategory };
      }
      return p;
    });
    setScrapedResult({
      ...scrapedResult,
      products: updatedProducts,
      masterProducts: updatedMaster
    });
    showToast(`Updated item #${variantId} category to "${newCategory}"`);
  };



  // Phase 2: Direct Cart Permalink Checkout Action (Auto-applies best available store discount)
  const handleDirectCheckout = (storeDomain: string, variantId: string | number, discountCode?: string) => {
    let cleanDomain = storeDomain;
    if (!cleanDomain.startsWith('http://') && !cleanDomain.startsWith('https://')) {
      cleanDomain = 'https://' + cleanDomain;
    }

    // Determine best discount code available
    const activeCode = (discountCode || scrapedResult?.store?.discount_code || discountCodeInput || '').trim();

    let checkoutUrl = '';
    if (activeCode) {
      // Official Shopify Discount Permalink with auto-apply redirect
      checkoutUrl = `${cleanDomain}/discount/${encodeURIComponent(activeCode)}?redirect=/cart/${variantId}:1`;
    } else {
      checkoutUrl = `${cleanDomain}/cart/${variantId}:1?checkout`;
    }

    // Redirect user directly to merchant checkout screen in a new tab
    window.open(checkoutUrl, '_blank');
  };

  const handleDeleteStore = async (storeId: string, storeName: string, storeDomain: string) => {
    if (confirm(`Are you sure you want to delete "${storeName}" and all its harvested products from the database?`)) {
      // Optimistic state removal
      setStores((prev) => prev.filter((s) => s.id !== storeId && s.store_name !== storeName));
      const targetDom = storeDomain.replace(/^https?:\/\//, '').toLowerCase().split('/')[0];
      setProducts((prev) => prev.filter((p) => !p.store_domain.toLowerCase().includes(targetDom)));

      try {
        const success = await deleteShopifyStoreFromDb(storeId, storeDomain);
        if (success) {
          showToast(`Deleted ${storeName} from database.`);
        } else {
          showToast(`Notice: Store removed locally.`);
        }
      } catch (err: any) {
        console.error('Delete store error:', err);
      } finally {
        await loadStoresAndProducts();
      }
    }
  };

  const handleDeleteProduct = async (variantId: string | number, productTitle: string) => {
    if (confirm(`Delete product "${productTitle}"?`)) {
      setProducts((prev) => prev.filter((p) => String(p.variant_id) !== String(variantId)));
      await deleteShopifyProductFromDb(String(variantId));
      showToast(`Deleted "${productTitle}" from database.`);
      await loadStoresAndProducts();
    }
  };

  const handleCopyCode = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedCodeIndex(index);
    setTimeout(() => setCopiedCodeIndex(null), 2000);
  };

  const filteredProducts = products.filter((p) => {
    const matchesStore = selectedStoreFilter ? p.store_domain.includes(selectedStoreFilter) : true;
    const matchesCategory =
      savedCategoryFilter === 'UNASSIGNED_ONLY'
        ? isProductUnassigned(p)
        : savedCategoryFilter !== 'ALL'
        ? (p.category || '').toLowerCase().includes(savedCategoryFilter.toLowerCase())
        : true;
    const matchesGender =
      savedGenderFilter === 'UNASSIGNED_ONLY'
        ? isProductUnassigned(p)
        : savedGenderFilter !== 'ALL'
        ? (p.gender || 'N/A').toLowerCase() === savedGenderFilter.toLowerCase()
        : true;
    const matchesSearch = searchQuery
      ? p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(p.variant_id).includes(searchQuery)
      : true;
    return matchesStore && matchesCategory && matchesGender && matchesSearch;
  });

  const pythonSnippet = `import requests
import firebase_admin
from firebase_admin import credentials, firestore

# Initialize Firestore Connection
cred = credentials.Certificate('path/to/firebase-admin-key.json')
firebase_admin.initialize_app(cred)
db = firestore.client()

def scrape_shopify_product(product_url, discount_code="DIRECT10"):
    # Phase 1: Append .json to bypass HTML scraping
    json_url = f"{product_url}.json" if not product_url.endswith('.json') else product_url
    response = requests.get(json_url, headers={'User-Agent': 'Mozilla/5.0'})
    
    if response.status_code == 200:
        data = response.json().get('product', {})
        first_variant = data.get('variants', [])[0]
        variant_id = first_variant.get('id')
        price = float(first_variant.get('price', 0))
        compare_price = first_variant.get('compare_at_price')
        
        # Calculate Discount Percentage
        discount_pct = 0
        if compare_price:
            compare_price = float(compare_price)
            if compare_price > price:
                discount_pct = round(((compare_price - price) / compare_price) * 100)

        store_domain = product_url.split('/products')[0] # e.g., https://store.com
        cart_permalink = f"{store_domain}/cart/{variant_id}:1?discount={discount_code}"

        # Structure Payload
        product_payload = {
            "variant_id": variant_id,
            "title": data.get('title'),
            "description": data.get('body_html'),
            "category": data.get('product_type'),
            "images": [img.get('src') for img in data.get('images', [])],
            "price": price,
            "compare_at_price": compare_price,
            "discount_percentage": discount_pct,
            "store_domain": store_domain,
            "cart_permalink": cart_permalink
        }
        
        # Push to Firestore collection "shopify_products"
        db.collection('shopify_products').document(str(variant_id)).set(product_payload)
        print(f"Successfully synced: {product_payload['title']}")`;

  const reactSnippet = `// Phase 2: Direct Cart Permalink Checkout Integration
const handleDirectCheckout = (storeDomain: string, variantId: string, discountCode?: string) => {
  // Construct the base Cart Permalink URL
  let checkoutUrl = \`\${storeDomain}/cart/\${variantId}:1\`;
  
  // Append promo code if provided
  if (discountCode) {
    checkoutUrl += \`?discount=\${encodeURIComponent(discountCode)}\`;
  } else {
    checkoutUrl += \`?checkout\`; 
  }

  // Instantly redirect off-site directly to merchant's secure Shopify checkout
  window.open(checkoutUrl, '_blank');
};`;

  return (
    <div className="w-full min-h-screen bg-slate-950 text-slate-100 p-4 lg:p-8 space-y-8 font-sans">
      
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 right-6 z-50 px-4 py-3 rounded-xl bg-emerald-600 text-white font-mono text-xs font-bold shadow-2xl border border-emerald-400 flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 text-white" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-emerald-950/40 to-slate-900 border border-emerald-500/30 p-6 lg:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-mono font-bold tracking-wider uppercase">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Hybrid Shopify API & JSON Engine</span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-black font-display tracking-tight text-white">
              Shopify Stores & Cart Permalink Checkout
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              Connect any Shopify store via hidden <code className="bg-slate-800 text-emerald-300 px-1.5 py-0.5 rounded font-mono text-xs">.json</code> endpoints or Shopify API credentials. Scrapes clean product payloads, variant IDs, calculates original price discounts, and routes users directly to merchant checkouts via Cart Permalinks.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-4 py-3 rounded-xl bg-slate-900/90 border border-slate-800 text-center">
              <div className="text-2xl font-black text-emerald-400 font-mono">{stores.length}</div>
              <div className="text-[10px] font-mono uppercase text-slate-400">Shopify Stores</div>
            </div>
            <div className="px-4 py-3 rounded-xl bg-slate-900/90 border border-slate-800 text-center">
              <div className="text-2xl font-black text-emerald-400 font-mono">
                {products.filter((p) => !isProductUnassigned(p)).length}
              </div>
              <div className="text-[10px] font-mono uppercase text-slate-400">Assigned Products</div>
            </div>
            <div className="px-4 py-3 rounded-xl bg-slate-900/90 border border-slate-800 text-center">
              <div className="text-2xl font-black text-indigo-400 font-mono">{products.length}</div>
              <div className="text-[10px] font-mono uppercase text-slate-400">Total Harvested</div>
            </div>
          </div>
        </div>
      </div>

      {/* Page Navigation Tabs Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-800/80">
        <button
          onClick={() => setActiveMainTab('connect')}
          className={`px-4 py-2.5 rounded-xl font-mono text-xs font-bold flex items-center gap-2 cursor-pointer transition-all ${
            activeMainTab === 'connect'
              ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
              : 'bg-slate-900/90 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Bot className="w-4 h-4" />
          <span>Connect & Scrape New Store</span>
        </button>

        <button
          onClick={() => setActiveMainTab('connected_stores')}
          className={`px-4 py-2.5 rounded-xl font-mono text-xs font-bold flex items-center gap-2 cursor-pointer transition-all ${
            activeMainTab === 'connected_stores'
              ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
              : 'bg-slate-900/90 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Store className="w-4 h-4" />
          <span>Connected Stores in DB ({stores.length})</span>
        </button>

        <button
          onClick={() => setActiveMainTab('assigned_products')}
          className={`px-4 py-2.5 rounded-xl font-mono text-xs font-bold flex items-center gap-2 cursor-pointer transition-all ${
            activeMainTab === 'assigned_products'
              ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
              : 'bg-slate-900/90 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>All Assigned Products ({products.filter((p) => !isProductUnassigned(p)).length})</span>
        </button>

        <button
          onClick={() => setActiveMainTab('saved_products')}
          className={`px-4 py-2.5 rounded-xl font-mono text-xs font-bold flex items-center gap-2 cursor-pointer transition-all ${
            activeMainTab === 'saved_products'
              ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
              : 'bg-slate-900/90 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <ShoppingCart className="w-4 h-4" />
          <span>All Harvested Catalog ({products.length})</span>
        </button>
      </div>

      {/* Connect & Scrape Tab View */}
      {activeMainTab === 'connect' && (
        <div className="space-y-8">
          {/* Main Grid Section: Connect Form & Live Scraper Console */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left: Add / Connect Store Form */}
        <div className="lg:col-span-5 rounded-2xl bg-slate-900/90 border border-slate-800 p-6 space-y-5 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2">
              <Store className="w-5 h-5 text-emerald-400" />
              <h2 className="text-base font-bold text-white font-mono">Connect & Scrape Store</h2>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Phase 1
            </span>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleConnectAndScrape();
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1.5 font-semibold">
                Shopify Website URL <span className="text-emerald-400">*</span>
              </label>
              <div className="relative">
                <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={storeUrlInput}
                  onChange={(e) => {
                    setStoreUrlInput(e.target.value);
                    if (e.target.value.includes('.')) {
                      const host = e.target.value.replace(/^https?:\/\//, '').split('/')[0].split('.')[0];
                      if (host) setStoreNameInput(host.charAt(0).toUpperCase() + host.slice(1));
                    }
                  }}
                  placeholder="https://gymshark.com or aloyoga.com"
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 text-xs font-mono focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>
              <p className="text-[11px] text-emerald-400/90 mt-1.5 font-mono flex items-center gap-1">
                <span>⚡ Just paste the store URL — Automated HTML Announcement Bar Crawler & Price Drop Sync run automatically!</span>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="flex items-center justify-between text-xs font-mono text-slate-300 mb-1 font-semibold">
                  <span>Brand / Store Name</span>
                  <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">Editable</span>
                </label>
                <input
                  type="text"
                  value={storeNameInput}
                  onChange={(e) => setStoreNameInput(e.target.value)}
                  placeholder="e.g. Gymshark or Custom Brand Name"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 text-xs font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1 font-semibold">
                  Fallback Promo Code
                </label>
                <input
                  type="text"
                  value={discountCodeInput}
                  onChange={(e) => setDiscountCodeInput(e.target.value)}
                  placeholder="Auto-scraped from HTML"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-emerald-400 placeholder-slate-500 text-xs font-mono font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1 font-semibold">
                Shopify API Key / Storefront Access Token <span className="text-slate-500 font-normal">(Optional)</span>
              </label>
              <div className="relative">
                <Key className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="Enter Storefront Access Token / API Key"
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 text-xs font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-1 font-mono">
                Optional: If left empty, scraper automatically utilizes the public <code className="text-emerald-400">.json</code> endpoint bypass.
              </p>
            </div>

            <button
              type="submit"
              disabled={isScraping}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white font-mono font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-600/20"
            >
              {isScraping ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Crawling Shopify JSON API...</span>
                </>
              ) : (
                <>
                  <Bot className="w-4 h-4 text-white" />
                  <span>Connect & Scrape Shopify Store</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Presets for Instant Testing */}
          <div className="pt-2 border-t border-slate-800/80 space-y-2">
            <div className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider">
              Quick Test Store Presets:
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { name: 'Gymshark', url: 'https://gymshark.com' },
                { name: 'Alo Yoga', url: 'https://aloyoga.com' },
                { name: 'Kith', url: 'https://kith.com' },
                { name: 'Allbirds', url: 'https://allbirds.com' }
              ].map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => {
                    setStoreUrlInput(preset.url);
                    setStoreNameInput(preset.name);
                    handleConnectAndScrape(preset.url, preset.name);
                  }}
                  disabled={isScraping}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700/80 text-[11px] font-mono flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Plus className="w-3 h-3 text-emerald-400" />
                  <span>{preset.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Live Scraper Console */}
        <div className="lg:col-span-7 rounded-2xl bg-slate-900/90 border border-slate-800 p-6 space-y-4 shadow-xl flex flex-col">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Terminal className="w-5 h-5 text-emerald-400" />
              <h2 className="text-base font-bold text-white font-mono">Live Hybrid Crawler Output</h2>
            </div>
            {isScraping && (
              <div className="flex items-center gap-2 text-xs text-emerald-400 font-mono">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Active Fetching...</span>
              </div>
            )}
          </div>

          <div className="flex-1 bg-slate-950 rounded-xl p-4 border border-slate-800/80 font-mono text-xs text-slate-300 space-y-2 overflow-y-auto max-h-80 selection:bg-emerald-500 selection:text-white">
            {scrapingLogs.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center text-slate-600 space-y-2">
                <Code2 className="w-8 h-8 text-slate-700" />
                <p>Click "Connect & Scrape Shopify Store" to launch Phase 1 JSON scraper...</p>
              </div>
            ) : (
              scrapingLogs.map((log, idx) => (
                <div key={idx} className="leading-relaxed border-b border-slate-900/50 pb-1">
                  {log.includes('❌') ? (
                    <span className="text-rose-400 font-bold">{log}</span>
                  ) : log.includes('🎉') || log.includes('✅') ? (
                    <span className="text-emerald-400 font-bold">{log}</span>
                  ) : log.includes('🚀') || log.includes('⚡') ? (
                    <span className="text-indigo-300 font-semibold">{log}</span>
                  ) : (
                    <span>{log}</span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* 3 Types of Discounts & Differential Synchronization Feature Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
          <div className="flex items-center gap-2 text-emerald-400 font-mono font-bold text-xs">
            <span className="px-1.5 py-0.5 rounded bg-emerald-500/20">Type A</span>
            <span>Markdown Sale Price</span>
          </div>
          <p className="text-xs text-slate-400">
            Pulls <code className="text-emerald-300 font-mono">price</code> and <code className="text-emerald-300 font-mono">compare_at_price</code> directly from Shopify API/.json endpoints. Calculates percentage off automatically.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
          <div className="flex items-center gap-2 text-indigo-400 font-mono font-bold text-xs">
            <span className="px-1.5 py-0.5 rounded bg-indigo-500/20">Type C</span>
            <span>HTML Announcement Bar Promo Codes</span>
          </div>
          <p className="text-xs text-slate-400">
            Inspects site HTML for announcement header bars (e.g. <code className="text-indigo-300 font-mono">USE CODE SAVE20</code>) and appends codes directly to Cart Permalinks.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
          <div className="flex items-center gap-2 text-rose-400 font-mono font-bold text-xs">
            <span className="px-1.5 py-0.5 rounded bg-rose-500/20">Sync Engine</span>
            <span>Differential Price Drop Tracking</span>
          </div>
          <p className="text-xs text-slate-400">
            Compares newly crawled prices against Firestore records. Automatically flags <code className="text-rose-300 font-mono">🔥 Price Dropped</code> and records previous prices.
          </p>
        </div>
      </div>

      {/* Scraped Store Results Preview (Pending Save to Database) */}
      <AnimatePresence>
        {scrapedResult && (() => {
          // Calculate category groupings
          const categoriesMap: Record<string, number> = {};
          scrapedResult.products.forEach((p) => {
            const cat = p.category || 'Uncategorized';
            categoriesMap[cat] = (categoriesMap[cat] || 0) + 1;
          });
          const categoriesList = Object.entries(categoriesMap);

          const menCount = scrapedResult.products.filter((p) => p.gender === 'Men').length;
          const womenCount = scrapedResult.products.filter((p) => p.gender === 'Women').length;
          const unisexCount = scrapedResult.products.filter((p) => p.gender === 'Unisex').length;
          const naGenderCount = scrapedResult.products.filter((p) => p.gender === 'N/A' || !p.gender).length;

          const unassignedTotalCount = scrapedResult.products.filter(isProductUnassigned).length;
          const readyTotalCount = scrapedResult.products.length - unassignedTotalCount;

          return (
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: -10 }}
              className="rounded-2xl bg-gradient-to-r from-emerald-950/80 via-slate-900 to-emerald-950/80 border-2 border-emerald-500/60 p-6 shadow-2xl shadow-emerald-950/50 space-y-6"
            >
              {/* Header Bar */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-emerald-500/20 pb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase tracking-wide flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-400" />
                      <span>Scraped Details Review (Pending Database Import)</span>
                    </span>
                    {scrapedResult.store.discount_code && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        Promo Code: {scrapedResult.store.discount_code}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <Store className="w-5 h-5 text-emerald-400 shrink-0" />
                    {isEditingScrapedBrand ? (
                      <div className="flex items-center gap-2 my-1">
                        <input
                          type="text"
                          value={scrapedBrandInput}
                          onChange={(e) => setScrapedBrandInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleSaveNewScrapedBrandName(scrapedBrandInput);
                            } else if (e.key === 'Escape') {
                              setIsEditingScrapedBrand(false);
                            }
                          }}
                          placeholder="Enter Brand Name"
                          className="px-3 py-1.5 rounded-lg bg-slate-950 border border-emerald-500 text-white font-mono font-bold text-sm focus:outline-none"
                          autoFocus
                        />
                        <button
                          onClick={() => handleSaveNewScrapedBrandName(scrapedBrandInput)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono font-bold text-xs flex items-center gap-1 cursor-pointer shadow-md"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Apply Brand Name</span>
                        </button>
                        <button
                          onClick={() => setIsEditingScrapedBrand(false)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs font-mono cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2.5">
                        <h3 className="text-xl font-bold text-white font-mono">{scrapedResult.store.store_name}</h3>
                        <button
                          onClick={() => {
                            setScrapedBrandInput(scrapedResult.store.store_name);
                            setIsEditingScrapedBrand(true);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-slate-800/90 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm"
                          title="Edit Brand / Store Name before storing to database"
                        >
                          <Pencil className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Edit Brand Name</span>
                        </button>
                        <span className="text-xs font-normal text-slate-400 font-mono">({scrapedResult.store.store_domain})</span>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-slate-300">
                    Harvested <strong className="text-emerald-400 font-mono font-bold">{scrapedResult.products.length} items</strong> ({readyTotalCount} assigned, <span className="text-amber-400 font-bold">{unassignedTotalCount} unassigned/N/A</span>).
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setScrapedResult(null)}
                    disabled={isSavingToDb}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer transition-colors disabled:opacity-50"
                  >
                    Discard
                  </button>
                  <button
                    onClick={handleSaveScrapedToDatabase}
                    disabled={isSavingToDb || readyTotalCount === 0}
                    className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-mono font-bold text-xs flex items-center gap-2 cursor-pointer transition-all shadow-lg shadow-emerald-500/25"
                  >
                    {isSavingToDb ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                        <span>Saving ({readyTotalCount} Items)...</span>
                      </>
                    ) : (
                      <>
                        <Database className="w-4 h-4" />
                        <span>Add Newly Assigned to DB ({readyTotalCount} Ready)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* LIVE DATABASE SAVE PROGRESS BAR */}
              {dbSaveProgress && (
                <div className="p-4 rounded-xl bg-slate-900/95 border border-emerald-500/60 space-y-2.5 shadow-xl shadow-emerald-950/50 animate-fade-in my-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold">
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-400 shrink-0" />
                      <span>{dbSaveProgress.stage}</span>
                    </div>
                    <div className="text-emerald-300 font-bold bg-emerald-950 px-3 py-1 rounded-lg border border-emerald-800 shrink-0">
                      {dbSaveProgress.current} / {dbSaveProgress.total} items ({Math.round((dbSaveProgress.current / Math.max(1, dbSaveProgress.total)) * 100)}%)
                    </div>
                  </div>

                  <div className="w-full bg-slate-950 h-3.5 rounded-full overflow-hidden border border-slate-800 p-0.5 shadow-inner">
                    <div 
                      className="bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 h-full rounded-full transition-all duration-300 ease-out shadow-md shadow-emerald-500/50"
                      style={{ width: `${Math.round((dbSaveProgress.current / Math.max(1, dbSaveProgress.total)) * 100)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                    <span>Shopify Connect Engine</span>
                    <span>Firestore Batch Sync Active</span>
                  </div>
                </div>
              )}

              {/* UNASSIGNED ITEMS STAGING BANNER */}
              <div className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-3 transition-all ${
                unassignedTotalCount > 0 
                  ? 'bg-amber-950/70 border-amber-500/50 shadow-lg shadow-amber-950/40' 
                  : 'bg-emerald-950/50 border-emerald-500/30'
              }`}>
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg shrink-0 ${unassignedTotalCount > 0 ? 'bg-amber-900/60 text-amber-300' : 'bg-emerald-900/60 text-emerald-300'}`}>
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold font-mono text-white">
                        N/A Unassigned Staging: <span className="text-amber-400 font-extrabold">{unassignedTotalCount}</span> / {scrapedResult.products.length} Items
                      </h4>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                        Ready to Export: {readyTotalCount}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300">
                      {unassignedTotalCount > 0
                        ? 'Products with category "Not Assigned" or gender "N/A" will NOT be added to the database until details are assigned. They stay on this staging page for review.'
                        : 'All products have complete details assigned and are ready to be pushed to the database!'}
                    </p>
                  </div>
                </div>

                {unassignedTotalCount > 0 && (
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      onClick={() => setSelectedScrapedGenderFilter(selectedScrapedGenderFilter === 'UNASSIGNED_ONLY' ? 'ALL' : 'UNASSIGNED_ONLY')}
                      className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold cursor-pointer transition-all border flex items-center gap-1.5 ${
                        selectedScrapedGenderFilter === 'UNASSIGNED_ONLY'
                          ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
                          : 'bg-amber-900/60 hover:bg-amber-800 text-amber-200 border-amber-600/60'
                      }`}
                    >
                      <span>{selectedScrapedGenderFilter === 'UNASSIGNED_ONLY' ? 'Showing Unassigned Only' : `View ${unassignedTotalCount} Unassigned Items`}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* STORE / BRAND LEVEL GENDER PROMPT */}
              <div className="p-4 rounded-xl bg-slate-950/80 border border-emerald-500/30 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Tag className="w-4 h-4" />
                      <span>Set Store-Wide Gender Override ({scrapedResult.store.store_name})</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Currently assigned: <span className="text-indigo-400 font-bold">{menCount} Men</span>, <span className="text-pink-400 font-bold">{womenCount} Women</span>, <span className="text-amber-400 font-bold">{unisexCount} Unisex</span>, <span className="text-orange-400 font-bold">{naGenderCount} N/A (Unassigned)</span>
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => handleSetAllScrapedGender('Men')}
                      className="px-3 py-1.5 rounded-lg bg-indigo-900/50 hover:bg-indigo-800 text-indigo-200 border border-indigo-500/50 text-xs font-mono font-bold transition-all cursor-pointer"
                    >
                      Set All to Men
                    </button>
                    <button
                      onClick={() => handleSetAllScrapedGender('Women')}
                      className="px-3 py-1.5 rounded-lg bg-pink-900/50 hover:bg-pink-800 text-pink-200 border border-pink-500/50 text-xs font-mono font-bold transition-all cursor-pointer"
                    >
                      Set All to Women
                    </button>
                    <button
                      onClick={() => handleSetAllScrapedGender('Unisex')}
                      className="px-3 py-1.5 rounded-lg bg-amber-900/50 hover:bg-amber-800 text-amber-200 border border-amber-500/50 text-xs font-mono font-bold transition-all cursor-pointer"
                    >
                      Set All to Unisex
                    </button>
                    <button
                      onClick={() => handleSetAllScrapedGender('N/A')}
                      className="px-3 py-1.5 rounded-lg bg-orange-950/80 hover:bg-orange-900 text-orange-300 border border-orange-800 text-xs font-mono font-bold transition-all cursor-pointer"
                    >
                      Set All to N/A
                    </button>
                  </div>
                </div>
              </div>

              {/* CATEGORY-BY-CATEGORY PRODUCTS SECTION */}
              {categoriesList.length > 0 && (
                <div className="space-y-6 pt-2">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-t border-slate-800 pt-4">
                    <div className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                      <Layers className="w-4 h-4 text-emerald-400" />
                      <span>Category Breakdown & Gender Controls ({categoriesList.length} Categories, {scrapedResult.products.length} Items)</span>
                    </div>

                    {/* Quick Category & Gender Filters */}
                    <div className="flex flex-wrap items-center gap-2">


                      <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                        <span className="text-[10px] font-mono text-slate-500 px-1 font-bold">Category:</span>
                        <select
                          value={selectedScrapedCategory}
                          onChange={(e) => setSelectedScrapedCategory(e.target.value)}
                          className="bg-slate-900 text-emerald-400 font-mono text-xs px-2 py-0.5 rounded border border-slate-800 cursor-pointer outline-none"
                        >
                          <option value="ALL">Show All Categories ({categoriesList.length})</option>
                          {categoriesList.map(([cName, cCount]) => (
                            <option key={cName} value={cName}>{cName} ({cCount})</option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                        <span className="text-[10px] font-mono text-slate-500 px-1 font-bold">Gender:</span>
                        {(['ALL', 'Men', 'Women', 'Unisex', 'N/A', 'UNASSIGNED_ONLY'] as const).map((g) => (
                          <button
                            key={g}
                            onClick={() => setSelectedScrapedGenderFilter(g)}
                            className={`px-2 py-0.5 rounded-lg font-mono text-[10px] cursor-pointer transition-colors ${
                              selectedScrapedGenderFilter === g
                                ? 'bg-emerald-600 text-white font-bold'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            {g === 'UNASSIGNED_ONLY' ? `⚠️ N/A Staging (${unassignedTotalCount})` : g}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Render Each Category Block with its Products */}
                  <div className="space-y-6">
                    {categoriesList
                      .filter(([cName]) => selectedScrapedCategory === 'ALL' || selectedScrapedCategory.toLowerCase() === cName.toLowerCase())
                      .map(([catName, totalCount]) => {
                        const isUnassignedOnly = selectedScrapedGenderFilter === 'UNASSIGNED_ONLY';

                        const catProducts = scrapedResult.products.filter((p) => {
                          const pCat = p.category || 'Uncategorized';
                          if (selectedScrapedCategory !== 'ALL' && selectedScrapedCategory.toLowerCase() !== pCat.toLowerCase()) {
                            return false;
                          }
                          if ((p.category || 'Uncategorized').toLowerCase() !== catName.toLowerCase()) {
                            return false;
                          }
                          if (isUnassignedOnly) {
                            return isProductUnassigned(p);
                          }
                          if (selectedScrapedGenderFilter !== 'ALL') {
                            return (p.gender || 'N/A').toLowerCase() === selectedScrapedGenderFilter.toLowerCase();
                          }
                          return true;
                        });

                        if (catProducts.length === 0) return null;

                        // Calculate status
                        const firstGender = catProducts[0]?.gender || 'N/A';
                        const allSameGender = catProducts.every((p) => (p.gender || 'N/A') === firstGender);

                        return (
                          <div key={catName} className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 space-y-3 shadow-lg">
                            {/* CATEGORY SECTION HEADER & CONTROLS */}
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wide">
                                    {catName}
                                  </h3>
                                  <span className="text-[10px] font-mono bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded font-bold">
                                    {catProducts.length} {catProducts.length === 1 ? 'item' : 'items'}
                                  </span>

                                  {/* Gender Assignment Status Badge */}
                                  {allSameGender ? (
                                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold border flex items-center gap-1 ${
                                      firstGender === 'Men' ? 'bg-indigo-950 text-indigo-300 border-indigo-800' :
                                      firstGender === 'Women' ? 'bg-pink-950 text-pink-300 border-pink-800' :
                                      firstGender === 'Unisex' ? 'bg-amber-950 text-amber-300 border-amber-800' :
                                      'bg-orange-950 text-orange-300 border-orange-800'
                                    }`}>
                                      <Check className="w-3 h-3" />
                                      <span>Assigned: {firstGender}</span>
                                    </span>
                                  ) : (
                                    <span className="text-[10px] font-mono bg-slate-900 text-slate-400 border border-slate-800 px-2 py-0.5 rounded">
                                      Mixed Custom
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-slate-400 font-mono">
                                  Assign gender to all items in <span className="text-white font-bold">{catName}</span> or click Direct Buy below.
                                </p>
                              </div>

                              {/* Action Controls for Category */}
                              <div className="flex flex-wrap items-center gap-2 shrink-0">
                                {/* Gender Assignment Pills for this Category */}
                                <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
                                  <span className="text-[10px] font-mono text-slate-500 px-1">Assign:</span>
                                  <button
                                    onClick={() => handleSetCategoryGender(catName, 'Men')}
                                    className="px-2.5 py-1 rounded-lg bg-indigo-950 hover:bg-indigo-900 text-indigo-300 border border-indigo-800 text-[10px] font-mono font-bold cursor-pointer transition-all"
                                  >
                                    Men
                                  </button>
                                  <button
                                    onClick={() => handleSetCategoryGender(catName, 'Women')}
                                    className="px-2.5 py-1 rounded-lg bg-pink-950 hover:bg-pink-900 text-pink-300 border border-pink-800 text-[10px] font-mono font-bold cursor-pointer transition-all"
                                  >
                                    Women
                                  </button>
                                  <button
                                    onClick={() => handleSetCategoryGender(catName, 'Unisex')}
                                    className="px-2.5 py-1 rounded-lg bg-amber-950 hover:bg-amber-900 text-amber-300 border border-amber-800 text-[10px] font-mono font-bold cursor-pointer transition-all"
                                  >
                                    Unisex
                                  </button>
                                  <button
                                    onClick={() => handleSetCategoryGender(catName, 'N/A')}
                                    className="px-2.5 py-1 rounded-lg bg-orange-950 hover:bg-orange-900 text-orange-300 border border-orange-800 text-[10px] font-mono font-bold cursor-pointer transition-all"
                                  >
                                    N/A
                                  </button>
                                </div>

                                {/* Category Autonomy: Save Category directly to Database */}
                                <button
                                  onClick={() => handleSaveCategoryToDatabase(catName)}
                                  disabled={isSavingToDb}
                                  className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-mono font-bold text-[11px] flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-500/25 transition-all"
                                  title={`Save all items in category "${catName}" directly to the Firestore database`}
                                >
                                  {isSavingToDb ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-950" />
                                  ) : (
                                    <Database className="w-3.5 h-3.5" />
                                  )}
                                  <span>Add Category to Database</span>
                                </button>

                                {/* Direct Buy / Checkout Button for Category Sample */}
                                {catProducts[0] && (
                                  <button
                                    onClick={() => handleDirectCheckout(scrapedResult.store.store_domain, catProducts[0].variant_id, scrapedResult.store.discount_code)}
                                    className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono font-extrabold text-[11px] flex items-center gap-1.5 cursor-pointer shadow-md shadow-amber-500/20 transition-all"
                                    title="Open direct Shopify cart checkout for this category sample"
                                  >
                                    <Zap className="w-3.5 h-3.5 fill-slate-950 stroke-[2.5]" />
                                    <span>Direct Buy Sample</span>
                                  </button>
                                )}

                                {/* Remove Category Button */}
                                <button
                                  onClick={() => handleRemoveCategory(catName)}
                                  className="px-2.5 py-1.5 rounded-xl bg-red-950/80 hover:bg-red-900 text-red-300 border border-red-800/80 font-mono text-[11px] flex items-center gap-1 cursor-pointer transition-all"
                                  title={`Remove category "${catName}" and all its products`}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span className="hidden sm:inline">Remove Category</span>
                                </button>
                              </div>
                            </div>

                            {/* PRODUCTS GRID BELONGING TO THIS CATEGORY */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 pt-1">
                              {catProducts.map((p) => (
                                <div key={p.variant_id} className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2 flex flex-col justify-between hover:border-slate-700 transition-all">
                                  <div className="space-y-1.5">
                                    <div className="relative aspect-square rounded-lg overflow-hidden bg-slate-950 border border-slate-800">
                                      <img
                                        src={p.images?.[0] || 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=800'}
                                        alt={p.title}
                                        className="w-full h-full object-cover"
                                      />
                                      <div className="absolute top-1.5 right-1.5 px-2 py-0.5 rounded bg-black/80 text-emerald-400 font-mono text-[9px] font-bold border border-emerald-500/30">
                                        #{p.variant_id}
                                      </div>
                                      {isProductUnassigned(p) && (
                                        <div className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded bg-amber-950/90 text-amber-300 font-mono text-[9px] font-bold border border-amber-600/80 flex items-center gap-1">
                                          <AlertTriangle className="w-2.5 h-2.5" />
                                          <span>N/A Unassigned</span>
                                        </div>
                                      )}
                                      <button
                                        onClick={() => handleRemoveSingleProduct(p.variant_id)}
                                        className="absolute top-1.5 left-1.5 p-1 rounded-md bg-black/80 hover:bg-red-900 text-slate-400 hover:text-red-200 border border-slate-800 transition-colors cursor-pointer"
                                        title="Remove item"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>

                                    <div className="flex items-center gap-1">
                                      <select
                                        value={p.category || 'Not Assigned'}
                                        onChange={(e) => handleSetSingleProductCategory(p.variant_id, e.target.value)}
                                        className={`w-full font-mono text-[10px] px-1.5 py-0.5 rounded border cursor-pointer outline-none uppercase font-bold ${
                                          !p.category || p.category === 'Not Assigned' || p.category === 'Uncategorized'
                                            ? 'bg-amber-950 text-amber-300 border-amber-600'
                                            : 'bg-slate-950 text-emerald-400 border-slate-800'
                                        }`}
                                        title="Change product category"
                                      >
                                        <option value="Not Assigned">-- Not Assigned --</option>
                                        {ALL_TAXONOMY_CATEGORIES.map((cat) => (
                                          <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                      </select>
                                    </div>
                                    <h4 className="text-xs font-bold text-white line-clamp-2 leading-snug">
                                      {p.title}
                                    </h4>

                                    <div className="flex items-baseline gap-2 font-mono text-xs">
                                      <span className="font-extrabold text-emerald-400">₹{p.price.toLocaleString('en-IN')}</span>
                                      {p.compare_at_price && p.compare_at_price > p.price && (
                                        <span className="text-slate-500 line-through text-[11px]">₹{p.compare_at_price.toLocaleString('en-IN')}</span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Individual Product Controls */}
                                  <div className="pt-2 border-t border-slate-800 space-y-2">
                                    {/* Direct Shopify Checkout Button */}
                                    <button
                                      onClick={() => handleDirectCheckout(scrapedResult.store.store_domain, p.variant_id, scrapedResult.store.discount_code)}
                                      className="w-full py-1.5 px-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono text-[10px] font-extrabold flex items-center justify-center gap-1 cursor-pointer transition-all"
                                    >
                                      <Zap className="w-3 h-3 fill-emerald-400 stroke-none" />
                                      <span>Direct Checkout</span>
                                      <ExternalLink className="w-3 h-3 ml-auto text-emerald-400" />
                                    </button>

                                    {/* Gender Selector Pills */}
                                    <div className="space-y-1">
                                      <div className="text-[9px] font-mono text-slate-400 flex items-center justify-between">
                                        <span>Target Gender:</span>
                                        <span className={`font-bold ${p.gender === 'N/A' || !p.gender ? 'text-amber-400 font-extrabold' : 'text-white'}`}>
                                          {p.gender || 'N/A'}
                                        </span>
                                      </div>

                                      <div className="grid grid-cols-4 gap-1">
                                        <button
                                          onClick={() => handleSetSingleProductGender(p.variant_id, 'Men')}
                                          className={`py-1 rounded text-[9px] font-mono font-bold transition-all cursor-pointer ${
                                            p.gender === 'Men'
                                              ? 'bg-indigo-600 text-white shadow-md'
                                              : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                                          }`}
                                        >
                                          Men
                                        </button>
                                        <button
                                          onClick={() => handleSetSingleProductGender(p.variant_id, 'Women')}
                                          className={`py-1 rounded text-[9px] font-mono font-bold transition-all cursor-pointer ${
                                            p.gender === 'Women'
                                              ? 'bg-pink-600 text-white shadow-md'
                                              : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                                          }`}
                                        >
                                          Women
                                        </button>
                                        <button
                                          onClick={() => handleSetSingleProductGender(p.variant_id, 'Unisex')}
                                          className={`py-1 rounded text-[9px] font-mono font-bold transition-all cursor-pointer ${
                                            p.gender === 'Unisex'
                                              ? 'bg-amber-600 text-white shadow-md'
                                              : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                                          }`}
                                        >
                                          Unisex
                                        </button>
                                        <button
                                          onClick={() => handleSetSingleProductGender(p.variant_id, 'N/A')}
                                          className={`py-1 rounded text-[9px] font-mono font-bold transition-all cursor-pointer ${
                                            p.gender === 'N/A' || !p.gender
                                              ? 'bg-orange-600 text-white shadow-md font-extrabold'
                                              : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                                          }`}
                                        >
                                          N/A
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </motion.div>
          );
        })()}
      </AnimatePresence>
        </div>
      )}

      {/* Connected Stores Tab View */}
      {activeMainTab === 'connected_stores' && (
        <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-6 space-y-5 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-bold text-white font-mono">
              Connected Shopify Stores (<code className="text-emerald-400">shopify_stores</code>)
            </h2>
          </div>

          <button
            onClick={loadStoresAndProducts}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono flex items-center gap-1.5 border border-slate-700 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
            <span>Reload Stores</span>
          </button>
        </div>

        {isLoadingStores ? (
          <div className="py-12 flex justify-center items-center text-slate-400 text-xs font-mono gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
            <span>Loading Shopify stores from Firestore...</span>
          </div>
        ) : stores.length === 0 ? (
          <div className="py-12 text-center text-slate-500 font-mono text-xs space-y-2">
            <Store className="w-8 h-8 text-slate-700 mx-auto" />
            <p>No Shopify stores in database yet. Use the form above to add your first store.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {stores.map((s) => {
              const cleanDom = s.store_domain.replace(/^https?:\/\//, '').toLowerCase().split('/')[0];
              const storeProds = products.filter((p) => p.store_domain.toLowerCase().includes(cleanDom));
              const naStoreProds = storeProds.filter(isProductUnassigned);
              const isExpanded = !!expandedStoreIds[s.id || s.store_domain];

              return (
                <div
                  key={s.id || s.store_domain}
                  className="rounded-xl bg-slate-950 border border-slate-800 overflow-hidden shadow-lg transition-all"
                >
                  {/* Store Card Header */}
                  <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 border-b border-slate-800/80">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                        <Store className="w-5 h-5 text-emerald-400" />
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          {editingStoreId === (s.id || s.store_domain) ? (
                            <div className="flex items-center gap-1.5">
                              <input
                                type="text"
                                value={editingStoreNameInput}
                                disabled={isUpdatingStoreName}
                                onChange={(e) => setEditingStoreNameInput(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleUpdateExistingStoreName(s, editingStoreNameInput);
                                  } else if (e.key === 'Escape') {
                                    setEditingStoreId(null);
                                  }
                                }}
                                className="px-2 py-1 rounded bg-slate-950 border border-emerald-500 text-white font-mono font-bold text-xs focus:outline-none disabled:opacity-50"
                                autoFocus
                              />
                              <button
                                onClick={() => handleUpdateExistingStoreName(s, editingStoreNameInput)}
                                disabled={isUpdatingStoreName}
                                className="px-2.5 py-1 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono font-bold text-[10px] cursor-pointer flex items-center gap-1 transition-colors disabled:opacity-50"
                              >
                                {isUpdatingStoreName ? (
                                  <>
                                    <Loader2 className="w-3 h-3 animate-spin text-slate-950" />
                                    <span>Saving...</span>
                                  </>
                                ) : (
                                  <span>Save</span>
                                )}
                              </button>
                              <button
                                onClick={() => setEditingStoreId(null)}
                                disabled={isUpdatingStoreName}
                                className="px-2 py-1 rounded bg-slate-800 text-slate-400 hover:text-white font-mono text-[10px] cursor-pointer disabled:opacity-50"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <h3 className="text-sm font-bold text-white font-mono">{s.store_name}</h3>
                              <button
                                onClick={() => {
                                  setEditingStoreId(s.id || s.store_domain);
                                  setEditingStoreNameInput(s.store_name);
                                }}
                                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-emerald-400 cursor-pointer transition-colors"
                                title="Edit Store Brand Name"
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                          {s.discount_code && (
                            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono font-bold">
                              🎟️ {s.discount_code}
                            </span>
                          )}
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] uppercase font-mono font-bold">
                            {s.status}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 mt-1 text-xs font-mono text-slate-400">
                          <a
                            href={s.store_domain}
                            target="_blank"
                            rel="noreferrer"
                            className="hover:text-emerald-400 flex items-center gap-1 underline underline-offset-2"
                          >
                            <span>{cleanDom}</span>
                            <ExternalLink className="w-3 h-3 text-slate-500" />
                          </a>
                          <span>•</span>
                          <span className="text-emerald-400 font-bold">{storeProds.length} Products Harvested</span>
                          {naStoreProds.length > 0 && (
                            <span className="text-amber-400 font-bold flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-amber-400" />
                              {naStoreProds.length} N/A Status
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Store Level Actions */}
                    <div className="flex flex-wrap items-center gap-2">

                      <button
                        onClick={() => toggleExpandStore(s.id || s.store_domain)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-bold flex items-center gap-1.5 border border-slate-700 cursor-pointer"
                      >
                        <ShoppingCart className="w-3.5 h-3.5 text-emerald-400" />
                        <span>
                          {isExpanded ? 'Hide Store Products' : `Show All Store Products (${storeProds.length})`}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                        )}
                      </button>

                      <button
                        onClick={() => handleRecrawlStore(s)}
                        disabled={recrawlingStoreId === (s.id || s.store_domain)}
                        className="px-3 py-1.5 rounded-lg bg-indigo-600/90 hover:bg-indigo-500 disabled:opacity-50 text-white font-mono text-xs font-bold cursor-pointer inline-flex items-center gap-1 shadow-md shadow-indigo-600/20"
                        title="Re-crawl store products"
                      >
                        {recrawlingStoreId === (s.id || s.store_domain) ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                        ) : (
                          <RefreshCw className="w-3.5 h-3.5 text-white" />
                        )}
                      </button>

                      <button
                        onClick={() => handleDeleteStore(s.id, s.store_name, s.store_domain)}
                        className="px-2.5 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white text-xs cursor-pointer inline-flex items-center gap-1 border border-rose-500/30"
                        title="Delete store"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Expanded Products Grid under Connected Store */}
                  {isExpanded && (
                    <div className="p-4 space-y-4 bg-slate-950/80">
                      <div className="flex items-center justify-between text-xs font-mono text-slate-400 pb-2 border-b border-slate-800/60">
                        <span>All Harvested Products under <strong className="text-emerald-400">{s.store_name}</strong></span>
                        <span className="text-slate-500">{storeProds.length} total items</span>
                      </div>

                      {storeProds.length === 0 ? (
                        <div className="py-8 text-center text-slate-500 font-mono text-xs">
                          No harvested products found for this store yet.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                          {storeProds.map((p) => {
                            const isNA = isProductUnassigned(p);

                            return (
                              <div
                                key={p.id || p.variant_id}
                                className={`rounded-xl bg-slate-900 border p-3 flex flex-col justify-between space-y-3 shadow-md ${
                                  isNA ? 'border-amber-500/50 bg-amber-950/10' : 'border-slate-800'
                                }`}
                              >
                                <div className="space-y-2">
                                  <div className="relative aspect-square bg-slate-950 rounded-lg overflow-hidden">
                                    <img
                                      src={p.images?.[0] || 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=800'}
                                      alt={p.title}
                                      className="w-full h-full object-cover"
                                    />
                                    {isNA && (
                                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-amber-600 text-slate-950 font-mono font-bold text-[9px] flex items-center gap-1 shadow-md">
                                        <AlertTriangle className="w-3 h-3" />
                                        <span>N/A Status</span>
                                      </div>
                                    )}
                                    <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-slate-950/80 text-emerald-400 font-mono text-[9px] font-bold border border-slate-800">
                                      #{p.variant_id}
                                    </div>
                                  </div>

                                  <h4 className="text-xs font-bold text-white line-clamp-2 leading-snug font-sans">
                                    {p.title}
                                  </h4>

                                  <div className="flex items-center justify-between text-xs font-mono">
                                    <span className="text-emerald-400 font-black">₹{p.price.toLocaleString('en-IN')}</span>
                                    {p.compare_at_price && p.compare_at_price > p.price && (
                                      <span className="text-[10px] text-slate-500 line-through">₹{p.compare_at_price.toLocaleString('en-IN')}</span>
                                    )}
                                  </div>

                                  {/* Category Dropdown */}
                                  <div className="space-y-1">
                                    <label className="text-[9px] font-mono text-slate-400 uppercase font-bold">Category:</label>
                                    <select
                                      value={p.category || 'Not Assigned'}
                                      onChange={(e) => handleUpdateSavedProductCategory(p.variant_id, e.target.value)}
                                      className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-[11px] font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
                                    >
                                      {ALL_TAXONOMY_CATEGORIES.map((cat) => (
                                        <option key={cat} value={cat}>{cat}</option>
                                      ))}
                                    </select>
                                  </div>

                                  {/* Gender Controls */}
                                  <div className="space-y-1">
                                    <label className="text-[9px] font-mono text-slate-400 uppercase font-bold">Gender:</label>
                                    <div className="grid grid-cols-4 gap-1">
                                      {(['Men', 'Women', 'Unisex', 'N/A'] as const).map((g) => (
                                        <button
                                          key={g}
                                          onClick={() => handleUpdateSavedProductGender(p.variant_id, g)}
                                          className={`py-1 text-[10px] font-mono font-bold rounded cursor-pointer transition-colors ${
                                            p.gender === g
                                              ? g === 'Men'
                                                ? 'bg-indigo-600 text-white'
                                                : g === 'Women'
                                                ? 'bg-pink-600 text-white'
                                                : g === 'Unisex'
                                                ? 'bg-amber-600 text-slate-950'
                                                : 'bg-rose-600 text-white'
                                              : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
                                          }`}
                                        >
                                          {g}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5 pt-2 border-t border-slate-800">
                                  <button
                                    onClick={() => handleDirectCheckout(p.store_domain, p.variant_id, p.discount_code)}
                                    className="flex-1 py-1.5 px-2 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-[10px] flex items-center justify-center gap-1 cursor-pointer"
                                  >
                                    <Zap className="w-3 h-3 fill-current" />
                                    <span>Direct Checkout</span>
                                  </button>
                                  <button
                                    onClick={() => handleDeleteProduct(p.variant_id, p.title)}
                                    className="p-1.5 rounded bg-slate-950 hover:bg-rose-600 text-slate-400 hover:text-white border border-slate-800 cursor-pointer"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      )}

      {/* All Assigned Products Tab View */}
      {activeMainTab === 'assigned_products' && (() => {
        const assignedProductsList = products.filter((p) => !isProductUnassigned(p));
        const filteredAssignedProducts = assignedProductsList.filter((p) => {
          if (assignedStoreFilter && !p.store_domain.toLowerCase().includes(assignedStoreFilter.toLowerCase())) {
            return false;
          }
          if (assignedCategoryFilter !== 'ALL' && (p.category || '').toLowerCase() !== assignedCategoryFilter.toLowerCase()) {
            return false;
          }
          if (assignedGenderFilter !== 'ALL' && (p.gender || '').toLowerCase() !== assignedGenderFilter.toLowerCase()) {
            return false;
          }
          if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            const titleMatch = p.title.toLowerCase().includes(q);
            const vendorMatch = (p.vendor || '').toLowerCase().includes(q);
            const catMatch = (p.category || '').toLowerCase().includes(q);
            const variantMatch = String(p.variant_id).includes(q);
            return titleMatch || vendorMatch || catMatch || variantMatch;
          }
          return true;
        });

        return (
          <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-6 space-y-6 shadow-xl">
            {/* Header & Stats Banner */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 border-b border-slate-800 pb-6">
              <div className="space-y-1 max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-mono font-bold uppercase tracking-wider">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Categorized Catalog</span>
                </div>
                <h2 className="text-xl lg:text-2xl font-black font-mono text-white">
                  All Assigned Products ({assignedProductsList.length})
                </h2>
                <p className="text-xs text-slate-300 leading-relaxed font-mono">
                  Consolidated collection of all products with assigned Category and Gender across connected Shopify stores. Click "Direct Cart Checkout" to purchase directly.
                </p>
              </div>

              {/* Metrics Row */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
                  <div className="text-xl font-black text-emerald-400 font-mono">{assignedProductsList.length}</div>
                  <div className="text-[10px] font-mono uppercase text-slate-400">Total Assigned</div>
                </div>
                <div className="px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
                  <div className="text-xl font-black text-indigo-400 font-mono">
                    {assignedProductsList.filter((p) => p.gender === 'Men').length}
                  </div>
                  <div className="text-[10px] font-mono uppercase text-slate-400">Men</div>
                </div>
                <div className="px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
                  <div className="text-xl font-black text-pink-400 font-mono">
                    {assignedProductsList.filter((p) => p.gender === 'Women').length}
                  </div>
                  <div className="text-[10px] font-mono uppercase text-slate-400">Women</div>
                </div>
                <div className="px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
                  <div className="text-xl font-black text-amber-400 font-mono">
                    {assignedProductsList.filter((p) => p.gender === 'Unisex').length}
                  </div>
                  <div className="text-[10px] font-mono uppercase text-slate-400">Unisex</div>
                </div>
              </div>
            </div>

            {/* Search & Filter Controls */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div className="relative w-full lg:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search assigned products..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                {/* Store Domain Filter */}
                <div className="flex items-center gap-1 overflow-x-auto max-w-full">
                  <button
                    onClick={() => setAssignedStoreFilter(null)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                      assignedStoreFilter === null
                        ? 'bg-emerald-500 text-slate-950 font-bold'
                        : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    All Stores
                  </button>
                  {stores.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setAssignedStoreFilter(s.store_domain.replace(/^https?:\/\//, ''))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                        assignedStoreFilter && s.store_domain.includes(assignedStoreFilter)
                          ? 'bg-emerald-500 text-slate-950 font-bold'
                          : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                      }`}
                    >
                      {s.store_name}
                    </button>
                  ))}
                </div>

                {/* Gender Filter Pills */}
                <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
                  <span className="text-[10px] font-mono text-slate-500 px-1 font-bold">Gender:</span>
                  {(['ALL', 'Men', 'Women', 'Unisex'] as const).map((g) => (
                    <button
                      key={g}
                      onClick={() => setAssignedGenderFilter(g)}
                      className={`px-2.5 py-1 rounded text-xs font-mono transition-colors cursor-pointer ${
                        assignedGenderFilter === g
                          ? 'bg-indigo-600 text-white font-bold'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
              <span className="text-[10px] font-mono text-slate-500 uppercase font-bold shrink-0">Category:</span>
              {['ALL', 'Activewear', 'Footwear', 'Accessories', 'T-Shirts & Tops', 'Shirts & Polo', 'Bottoms & Joggers', 'Outerwear & Jackets', 'Dresses & Skirts'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setAssignedCategoryFilter(cat)}
                  className={`px-3 py-1 rounded-lg text-xs font-mono transition-colors shrink-0 cursor-pointer ${
                    assignedCategoryFilter.toLowerCase() === cat.toLowerCase()
                      ? 'bg-emerald-500 text-slate-950 font-bold'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Assigned Product Cards Grid */}
            {filteredAssignedProducts.length === 0 ? (
              <div className="py-16 text-center text-slate-500 font-mono text-xs space-y-2">
                <CheckCircle2 className="w-10 h-10 text-slate-700 mx-auto" />
                <p>No assigned products match the selected filters.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredAssignedProducts.map((p) => (
                  <div
                    key={p.id || p.variant_id}
                    className="rounded-xl bg-slate-950 border border-slate-800/80 hover:border-emerald-500/50 overflow-hidden flex flex-col justify-between group shadow-lg transition-all"
                  >
                    <div>
                      {/* Product Image */}
                      <div className="relative aspect-square bg-slate-900 overflow-hidden">
                        <img
                          src={p.images?.[0] || 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=800'}
                          alt={p.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        {p.discount_percentage > 0 && (
                          <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-rose-600 text-white font-mono font-bold text-[10px] shadow-md">
                            {p.discount_percentage}% OFF
                          </div>
                        )}
                        <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-slate-900/80 text-emerald-400 border border-slate-700 font-mono text-[9px] font-bold">
                          #{p.variant_id}
                        </div>
                      </div>

                      {/* Product Details */}
                      <div className="p-3.5 space-y-2.5">
                        <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider flex items-center justify-between">
                          <span className="text-emerald-400 font-bold">{p.store_name || p.brand || p.vendor || 'Shopify Store'}</span>
                          <span className="text-slate-300 font-bold">{p.category}</span>
                        </div>

                        <h3 className="text-xs font-bold text-slate-100 line-clamp-2 leading-snug">
                          {p.title}
                        </h3>

                        <div className="flex items-baseline gap-2 font-mono">
                          <span className="text-sm font-black text-emerald-400">₹{p.price.toLocaleString('en-IN')}</span>
                          {p.compare_at_price && p.compare_at_price > p.price && (
                            <span className="text-xs text-slate-500 line-through">₹{p.compare_at_price.toLocaleString('en-IN')}</span>
                          )}
                        </div>

                        {/* Category Dropdown */}
                        <div className="space-y-1 pt-1 border-t border-slate-900">
                          <label className="text-[9px] font-mono text-slate-400 uppercase font-bold">Category:</label>
                          <select
                            value={p.category || 'Not Assigned'}
                            onChange={(e) => handleUpdateSavedProductCategory(p.variant_id, e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-[11px] font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
                          >
                            {ALL_TAXONOMY_CATEGORIES.map((cat) => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                        </div>

                        {/* Gender Selector */}
                        <div className="space-y-1">
                          <label className="text-[9px] font-mono text-slate-400 uppercase font-bold">Gender:</label>
                          <div className="grid grid-cols-4 gap-1">
                            {(['Men', 'Women', 'Unisex', 'N/A'] as const).map((g) => (
                              <button
                                key={g}
                                onClick={() => handleUpdateSavedProductGender(p.variant_id, g)}
                                className={`py-1 rounded text-[9px] font-mono font-bold transition-all cursor-pointer ${
                                  p.gender === g
                                    ? g === 'Men' ? 'bg-indigo-600 text-white' : g === 'Women' ? 'bg-pink-600 text-white' : g === 'Unisex' ? 'bg-amber-600 text-white' : 'bg-slate-700 text-white'
                                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                                }`}
                              >
                                {g}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="p-3 bg-slate-900/80 border-t border-slate-800/80 flex items-center gap-1.5">
                      <button
                        onClick={() => handleDirectCheckout(p.store_domain, p.variant_id, p.discount_code)}
                        className="flex-1 py-1.5 px-2 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-[10px] flex items-center justify-center gap-1 cursor-pointer transition-all shadow-md shadow-emerald-950/40"
                      >
                        <Zap className="w-3 h-3 fill-current" />
                        <span>Direct Checkout</span>
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(p.variant_id, p.title)}
                        className="p-1.5 rounded bg-slate-950 hover:bg-rose-600 text-slate-400 hover:text-white border border-slate-800 cursor-pointer transition-colors"
                        title="Delete from Catalog"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* Harvested Shopify Products Catalog Tab View */}
      {activeMainTab === 'saved_products' && (
        <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-6 space-y-6 shadow-xl">
        {/* N/A Status Summary Banner */}
        {(() => {
          const naTotalCount = products.filter(isProductUnassigned).length;
          if (naTotalCount === 0) return null;

          return (
            <div className="p-4 rounded-xl bg-amber-950/50 border border-amber-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-amber-200 font-mono">
                    {naTotalCount} Products Currently Unassigned
                  </h3>
                  <p className="text-[11px] text-slate-300 font-mono">
                    You can set their Category & Gender directly on each product card using the dropdowns and buttons below.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSavedCategoryFilter('UNASSIGNED_ONLY')}
                className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono font-bold text-xs cursor-pointer shrink-0 transition-colors"
              >
                View {naTotalCount} Unassigned
              </button>
            </div>
          );
        })()}

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-emerald-400" />
              <h2 className="text-lg font-bold text-white font-mono">
                Harvested Shopify Catalog (<code className="text-emerald-400">shopify_products</code>)
              </h2>
            </div>
            <p className="text-xs text-slate-400 font-mono">
              Aggregated products across all connected stores. Click "⚡ Direct Cart Checkout" to purchase directly.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 lg:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search catalog or variant ID..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Store Filter Pills */}
            <div className="flex items-center gap-1 overflow-x-auto max-w-full pb-1">
              <button
                onClick={() => setSelectedStoreFilter(null)}
                className={`px-3 py-1 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                  selectedStoreFilter === null
                    ? 'bg-emerald-600 text-white font-bold'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                All Stores ({products.length})
              </button>
              {stores.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelectedStoreFilter(s.store_domain.replace(/^https?:\/\//, ''))}
                  className={`px-3 py-1 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                    selectedStoreFilter && s.store_domain.includes(selectedStoreFilter)
                      ? 'bg-emerald-600 text-white font-bold'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {s.store_name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Category & Gender Sub-Filters for Database Products */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1">
            <span className="text-[10px] font-mono text-slate-500 uppercase font-bold shrink-0">Category:</span>
            {['ALL', 'UNASSIGNED_ONLY', 'Activewear', 'Footwear', 'Accessories', 'T-Shirts & Tops', 'Shirts & Polo', 'Bottoms & Joggers', 'Outerwear & Jackets', 'Dresses & Skirts'].map((cat) => (
              <button
                key={cat}
                onClick={() => setSavedCategoryFilter(cat)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-colors shrink-0 cursor-pointer ${
                  savedCategoryFilter.toLowerCase() === cat.toLowerCase()
                    ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-950/50'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {cat === 'UNASSIGNED_ONLY' ? `⚠️ Unassigned / N/A (${products.filter(isProductUnassigned).length})` : cat}
              </button>
            ))}
          </div>

          {/* Gender Filter Pills */}
          <div className="flex items-center gap-1 shrink-0 bg-slate-900 p-1 rounded-lg border border-slate-800">
            <span className="text-[10px] font-mono text-slate-500 px-1 font-bold">Gender:</span>
            {(['ALL', 'Men', 'Women', 'Unisex', 'N/A'] as const).map((g) => (
              <button
                key={g}
                onClick={() => setSavedGenderFilter(g)}
                className={`px-2.5 py-0.5 rounded text-xs font-mono transition-colors cursor-pointer ${
                  savedGenderFilter === g
                    ? 'bg-indigo-600 text-white font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="py-16 text-center text-slate-500 font-mono text-xs space-y-2">
            <ShoppingCart className="w-10 h-10 text-slate-700 mx-auto" />
            <p>No products match your current filters. Run a Shopify scrape to harvest product items.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredProducts.map((p) => {
              const isNA = isProductUnassigned(p);

              return (
                <motion.div
                  key={p.id || p.variant_id}
                  whileHover={{ y: -3 }}
                  className={`rounded-xl bg-slate-950 border overflow-hidden flex flex-col justify-between group shadow-lg transition-all ${
                    isNA ? 'border-amber-500/50 bg-amber-950/10' : 'border-slate-800/80 hover:border-emerald-500/50'
                  }`}
                >
                  <div>
                    {/* Image & Discount Badge */}
                    <div className="relative aspect-square bg-slate-900 overflow-hidden">
                      <img
                        src={p.images?.[0] || 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=800'}
                        alt={p.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      {isNA ? (
                        <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-amber-600 text-slate-950 font-mono font-bold text-[10px] shadow-md flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          <span>N/A Status</span>
                        </div>
                      ) : (
                        p.discount_percentage > 0 && (
                          <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-rose-600 text-white font-mono font-bold text-[10px] shadow-md">
                            {p.discount_percentage}% OFF
                          </div>
                        )
                      )}
                      <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-slate-900/80 text-emerald-400 border border-slate-700 font-mono text-[9px] font-bold">
                        #{p.variant_id}
                      </div>
                    </div>

                    {/* Body Content */}
                    <div className="p-3.5 space-y-2.5">
                      <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider flex items-center justify-between">
                        <span className="text-emerald-400 font-bold">{p.store_name || p.brand || p.vendor || 'Shopify Store'}</span>
                        <span className="text-slate-500">{p.category}</span>
                      </div>

                      <h3 className="text-xs font-bold text-slate-100 line-clamp-2 leading-snug">
                        {p.title}
                      </h3>

                      {/* Pricing */}
                      <div className="flex items-baseline gap-2 font-mono">
                        <span className="text-sm font-black text-emerald-400">₹{p.price.toLocaleString('en-IN')}</span>
                        {p.compare_at_price && p.compare_at_price > p.price && (
                          <span className="text-xs text-slate-500 line-through">₹{p.compare_at_price.toLocaleString('en-IN')}</span>
                        )}
                      </div>

                      {/* Category Selector Dropdown */}
                      <div className="space-y-1 pt-1">
                        <label className="text-[9px] font-mono text-slate-400 uppercase font-bold">Category:</label>
                        <select
                          value={p.category || 'Not Assigned'}
                          onChange={(e) => handleUpdateSavedProductCategory(p.variant_id, e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-[11px] font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
                        >
                          {ALL_TAXONOMY_CATEGORIES.map((cat) => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>

                      {/* Gender Selector Buttons */}
                      <div className="space-y-1">
                        <label className="text-[9px] font-mono text-slate-400 uppercase font-bold">Gender:</label>
                        <div className="grid grid-cols-4 gap-1">
                          {(['Men', 'Women', 'Unisex', 'N/A'] as const).map((g) => (
                            <button
                              key={g}
                              onClick={() => handleUpdateSavedProductGender(p.variant_id, g)}
                              className={`py-0.5 text-[10px] font-mono font-bold rounded cursor-pointer transition-colors ${
                                p.gender === g
                                  ? g === 'Men'
                                    ? 'bg-indigo-600 text-white'
                                    : g === 'Women'
                                    ? 'bg-pink-600 text-white'
                                    : g === 'Unisex'
                                    ? 'bg-amber-600 text-slate-950'
                                    : 'bg-rose-600 text-white'
                                  : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
                              }`}
                            >
                              {g}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Phase 2 Cart Permalink Button & Delete Button */}
                  <div className="p-3 pt-0 flex items-center gap-2">
                    <button
                      onClick={() => handleDirectCheckout(p.store_domain, p.variant_id, p.discount_code)}
                      className="flex-1 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-[11px] flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md shadow-emerald-600/20"
                    >
                      <Zap className="w-3.5 h-3.5 fill-current text-white" />
                      <span>Direct Cart Checkout</span>
                      <ExternalLink className="w-3 h-3 text-emerald-200" />
                    </button>

                    <button
                      onClick={() => handleDeleteProduct(p.variant_id, p.title)}
                      title="Delete product from database"
                      className="p-2 rounded-lg bg-slate-800 hover:bg-rose-600/30 text-slate-400 hover:text-rose-300 border border-slate-700 hover:border-rose-500/50 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
      )}
    </div>
  );
};
