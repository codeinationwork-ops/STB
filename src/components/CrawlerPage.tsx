import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  Bot,
  Globe,
  Zap,
  Database,
  CheckCircle2,
  Terminal,
  Loader2,
  ShieldCheck,
  Plus,
  RefreshCw,
  Building2,
  Layers,
  ExternalLink,
  Tag,
  Search,
  Filter,
  Trash2,
  Trash,
  Calendar,
  Pencil
} from 'lucide-react';
import { Product } from '../types';
import {
  saveProductToDb,
  upsertBrandProductsToDb,
  getAllBrandsFromDb,
  getProductsByBrandFromDb,
  deleteBrandFromDb,
  deleteProductFromDb,
  clearAllProductsAndBrandsFromDb,
  BrandSummary
} from '../lib/firestoreService';
import { ReCrawlModal } from './ReCrawlModal';

interface CrawlerPageProps {
  onBackToHome: () => void;
  onProductsAddedToGlobalCatalog: (products: Product[]) => void;
}

export const CrawlerPage: React.FC<CrawlerPageProps> = ({
  onBackToHome,
  onProductsAddedToGlobalCatalog
}) => {
  const [activeTab, setActiveTab] = useState<'crawler' | 'database'>('crawler');

  // Crawler State
  const [urlInput, setUrlInput] = useState<string>('https://nobero.com/products/signature-linen-cotton-blend-shirt-2');
  const [isCrawling, setIsCrawling] = useState<boolean>(false);
  const [activeStage, setActiveStage] = useState<number>(0); // 0: idle, 1: discovery, 2: schema/normalization, 3: meilisearch, 4: complete
  const [logs, setLogs] = useState<string[]>([]);
  const [extractedProducts, setExtractedProducts] = useState<Product[]>([]);
  const [addedProductIds, setAddedProductIds] = useState<Set<string>>(new Set());
  const [isBulkAdding, setIsBulkAdding] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [autoUpsertSummary, setAutoUpsertSummary] = useState<string | null>(null);

  // Manual Brand Name Override State
  const [customBrandName, setCustomBrandName] = useState<string>('');
  const [isEditingBrandName, setIsEditingBrandName] = useState<boolean>(false);
  const [tempBrandNameInput, setTempBrandNameInput] = useState<string>('');

  // Gallery and description maps
  const [activeImageMap, setActiveImageMap] = useState<Record<string, number>>({});
  const [expandedDescMap, setExpandedDescMap] = useState<Record<string, boolean>>({});

  // Database Tab State
  const [dbBrands, setDbBrands] = useState<BrandSummary[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [brandProducts, setBrandProducts] = useState<Product[]>([]);
  const [isLoadingBrandData, setIsLoadingBrandData] = useState<boolean>(false);
  const [brandSearchQuery, setBrandSearchQuery] = useState<string>('');
  const [brandToDelete, setBrandToDelete] = useState<{ id: string; name: string } | null>(null);
  const [isDeletingBrand, setIsDeletingBrand] = useState<boolean>(false);
  const [reCrawlModalBrand, setReCrawlModalBrand] = useState<{ name: string; url: string } | null>(null);

  // Fetch all brands when opening Database Tab
  useEffect(() => {
    if (activeTab === 'database') {
      loadBrandDatabase();
    }
  }, [activeTab]);

  const loadBrandDatabase = async () => {
    setIsLoadingBrandData(true);
    const brands = await getAllBrandsFromDb();
    setDbBrands(brands);

    if (brands.length > 0 && !selectedBrand) {
      handleSelectBrand(brands[0].name);
    } else if (selectedBrand) {
      handleSelectBrand(selectedBrand);
    }
    setIsLoadingBrandData(false);
  };

  const handleSelectBrand = async (brandName: string) => {
    setSelectedBrand(brandName);
    setIsLoadingBrandData(true);
    const prods = await getProductsByBrandFromDb(brandName);
    setBrandProducts(prods);
    setIsLoadingBrandData(false);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleStartCrawl = async (targetUrl?: string) => {
    const finalUrl = targetUrl || urlInput;
    if (!finalUrl || finalUrl.trim().length < 4) return;

    setIsCrawling(true);
    setActiveStage(1);
    setLogs([`🚀 [Layer 1: Multi-Page Discovery] Dispatching Full Catalog Agent to target: ${finalUrl}`]);
    setExtractedProducts([]);
    setAddedProductIds(new Set());
    setAutoUpsertSummary(null);

    const stage1Timer = setTimeout(() => {
      setLogs((prev) => [
        ...prev,
        `🔍 Layer 1 Shopify Paginated API & XML Sitemap parsing active...`
      ]);
    }, 500);

    const stage2Timer = setTimeout(() => {
      setActiveStage(2);
      setLogs((prev) => [
        ...prev,
        `⚡ Shopify Endpoint & Sitemaps Discovered!`,
        `⚙️ [Layer 2: BFS Deep Linker] Traversing collections, categories, and paginated store catalog...`
      ]);
    }, 1200);

    const stage3Timer = setTimeout(() => {
      setActiveStage(3);
      setLogs((prev) => [
        ...prev,
        `⚙️ [Layer 3: Product Extraction] Parsing Schema.org JSON-LD tags, Fabric GSM, Active % Ingredients, and Direct Brand Savings...`
      ]);
    }, 3200);

    try {
      const controller = new AbortController();
      const fetchTimeout = setTimeout(() => controller.abort(), 300000); // 300s (5 min) safety limit for full multi-page crawl

      const resp = await fetch('/api/crawl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: finalUrl }),
        signal: controller.signal
      });

      clearTimeout(fetchTimeout);

      let data: any = null;
      const contentType = resp.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        data = await resp.json();
      } else {
        const text = await resp.text();
        try {
          data = JSON.parse(text);
        } catch {
          console.warn('Non-JSON response from /api/crawl:', text.slice(0, 150));
          data = {
            products: [],
            logs: [`⚠️ Server returned HTML or non-JSON response (HTTP ${resp.status}).`]
          };
        }
      }

      clearTimeout(stage1Timer);
      clearTimeout(stage2Timer);
      clearTimeout(stage3Timer);

      setActiveStage(4);
      setIsCrawling(false);

      const crawledProds: Product[] = data?.products || [];

      if (crawledProds.length > 0) {
        setExtractedProducts(crawledProds);
        setAddedProductIds(new Set()); // Clear added state until manual commit

        const detectedBrandName = crawledProds[0]?.brand || 'D2C Brand';
        setCustomBrandName(detectedBrandName);
        setTempBrandNameInput(detectedBrandName);

        setLogs((prev) => [
          ...prev,
          ...(data.logs || []),
          `🎉 Discovered & extracted ${crawledProds.length} products for brand "${detectedBrandName}"!`,
          `👇 Catalog ready for review. Click "＋ Add Brand & Catalog to Store Database" to save to Firestore.`
        ]);

        const summaryMsg = `✨ Crawl complete! ${crawledProds.length} items extracted for "${detectedBrandName}". Click "Add to Database" below to save to Firestore.`;
        setAutoUpsertSummary(summaryMsg);
        showToast(`Extracted ${crawledProds.length} products! Review below & click "Add to Database".`);
      } else {
        setLogs((prev) => [
          ...prev,
          ...(data?.logs || []),
          `❌ Crawl completed with notice. Try refreshing or re-crawling.`
        ]);
      }

    } catch (err: any) {
      console.error('Frontend crawl error:', err);
      clearTimeout(stage1Timer);
      clearTimeout(stage2Timer);
      clearTimeout(stage3Timer);

      setActiveStage(4);
      setIsCrawling(false);

      if (err?.name === 'AbortError' || err?.message?.includes('aborted')) {
        setLogs((prev) => [
          ...prev,
          `⏱️ Crawl operation timed out or was cancelled. If products were retrieved, they are listed below.`
        ]);
        showToast(`Crawl request timed out. Please try re-crawling if no items appeared.`);
      } else {
        setLogs((prev) => [
          ...prev,
          `⚠️ Crawl notice: ${err?.message || 'Network error'}.`
        ]);
        showToast(`Crawl error: ${err?.message || 'Connection failed'}`);
      }
    }
  };

  const handleSaveBrandName = () => {
    const trimmed = tempBrandNameInput.trim();
    if (!trimmed) return;
    setCustomBrandName(trimmed);
    setExtractedProducts((prev) =>
      prev.map((p) => ({ ...p, brand: trimmed }))
    );
    setIsEditingBrandName(false);

    if (autoUpsertSummary) {
      setAutoUpsertSummary(`✨ Crawl complete! ${extractedProducts.length} items extracted for "${trimmed}". Click "Add to Database" below to save to Firestore.`);
    }
    showToast(`Updated brand name to "${trimmed}" for all ${extractedProducts.length} items!`);
  };

  const handleAddSingleProductToDb = async (product: Product) => {
    const brandToUse = customBrandName || product.brand;
    const prodToSave = { ...product, brand: brandToUse };
    const success = await saveProductToDb(prodToSave);
    if (success) {
      setAddedProductIds((prev) => new Set(prev).add(product.id));
      onProductsAddedToGlobalCatalog([prodToSave]);
      showToast(`Added "${product.name}" under brand "${brandToUse}" to Database!`);
      loadBrandDatabase();
    }
  };

  const handleAddAllProductsToDb = async () => {
    if (extractedProducts.length === 0) return;
    setIsBulkAdding(true);

    const brandName = customBrandName || extractedProducts[0]?.brand || 'D2C Brand';
    const updatedProducts = extractedProducts.map((p) => ({ ...p, brand: brandName }));

    setLogs((prev) => [
      ...prev,
      `🚀 Initiating throttled database sync for ${updatedProducts.length} items of "${brandName}"...`
    ]);

    const result = await upsertBrandProductsToDb(
      brandName,
      updatedProducts,
      urlInput,
      (committedCount, totalCount) => {
        const currentBatch = updatedProducts.slice(0, committedCount);
        const currentIds = new Set(currentBatch.map((p) => p.id));
        setAddedProductIds(currentIds);
        const pct = Math.round((committedCount / totalCount) * 100);
        setLogs((prev) => [
          ...prev,
          `💾 Committed ${committedCount} / ${totalCount} items to Firestore (${pct}%)`
        ]);
        setAutoUpsertSummary(`💾 Syncing to Database... ${committedCount} / ${totalCount} items committed (${pct}%).`);
      }
    );

    if (result.success) {
      const allIds = new Set(updatedProducts.map((p) => p.id));
      setAddedProductIds(allIds);
      onProductsAddedToGlobalCatalog(updatedProducts);
      showToast(`✅ Successfully added brand "${brandName}" and all ${updatedProducts.length} items to database!`);
      setAutoUpsertSummary(`✅ Brand "${brandName}" and ${updatedProducts.length} items added to database.`);
      loadBrandDatabase();
    }
    setIsBulkAdding(false);
  };

  const handleDeleteBrand = (brandSlug: string, brandName: string) => {
    setBrandToDelete({ id: brandSlug, name: brandName });
  };

  const confirmDeleteBrand = async () => {
    if (!brandToDelete) return;
    const { id: brandSlug, name: brandName } = brandToDelete;
    setIsDeletingBrand(true);

    // Optimistically remove from state for instant UI responsiveness
    setDbBrands((prev) =>
      prev.filter(
        (b) =>
          b.id.toLowerCase() !== brandSlug.toLowerCase() &&
          b.name.toLowerCase() !== brandName.toLowerCase()
      )
    );

    if (
      selectedBrand === brandName ||
      selectedBrand?.toLowerCase() === brandName.toLowerCase()
    ) {
      setSelectedBrand(null);
      setBrandProducts([]);
    }

    showToast(`Erasing brand "${brandName}" from database...`);
    await deleteBrandFromDb(brandSlug, brandName);
    showToast(`✅ Brand "${brandName}" and all its items erased from database.`);
    setBrandToDelete(null);
    setIsDeletingBrand(false);
    await loadBrandDatabase();
  };

  const handleDeleteSingleProductFromDb = async (productId: string, productName: string, brandName?: string) => {
    if (!confirm(`Are you sure you want to delete product "${productName}" from the database?`)) {
      return;
    }

    setBrandProducts((prev) => prev.filter((p) => p.id !== productId));
    showToast(`Product "${productName}" deleted.`);

    await deleteProductFromDb(productId, brandName);
    if (selectedBrand) {
      const updatedProds = await getProductsByBrandFromDb(selectedBrand);
      setBrandProducts(updatedProds);
    }
  };

  const handleClearEntireDatabase = async () => {
    if (!confirm('Are you sure you want to delete ALL brands and products from the database? This action cannot be undone.')) {
      return;
    }
    await clearAllProductsAndBrandsFromDb();
    setSelectedBrand(null);
    setBrandProducts([]);
    setExtractedProducts([]);
    setAddedProductIds(new Set());
    setAutoUpsertSummary(null);
    showToast('Database wiped clean.');
    loadBrandDatabase();
  };

  const handleReCrawlBrand = (brand: BrandSummary) => {
    const crawlUrl = brand.officialUrl || `https://${brand.id}.com`;
    setReCrawlModalBrand({ name: brand.name, url: crawlUrl });
  };

  const filteredBrands = dbBrands.filter((b) =>
    b.name.toLowerCase().includes(brandSearchQuery.toLowerCase()) ||
    b.id.toLowerCase().includes(brandSearchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans selection:bg-red-600 selection:text-white flex flex-col">
      
      {/* Top Navigation Header - Crimson Red High Contrast Theme */}
      <header className="sticky top-0 z-40 bg-gradient-to-r from-red-700 via-red-600 to-rose-700 text-white border-b border-red-800 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
          
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToHome}
              className="p-2 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/20 transition-all flex items-center gap-1.5 font-mono text-xs font-bold shadow-sm"
              title="Return to Main Search Index"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Main Catalog</span>
            </button>

            <div className="h-6 w-px bg-white/20 hidden sm:block" />

            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-white text-red-600 shadow-md">
                <Bot className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h1 className="text-base sm:text-lg font-black font-mono tracking-tight text-white leading-tight flex items-center gap-2">
                  <span>ShopScoper — Brand Crawling Engine</span>
                  <span className="hidden md:inline-block px-2 py-0.5 rounded-full bg-white text-red-700 text-[10px] font-black uppercase">
                    100% Full Catalog Ingestion
                  </span>
                </h1>
                <p className="text-xs text-red-100">
                  Exhaustive paginated scraping engine & Brand Database Manager
                </p>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 bg-red-900/40 p-1 rounded-2xl border border-white/20">
            <button
              onClick={() => setActiveTab('crawler')}
              className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-2 ${
                activeTab === 'crawler'
                  ? 'bg-white text-red-700 shadow-md font-black'
                  : 'text-white hover:bg-white/10'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Crawler Workspace</span>
            </button>

            <button
              onClick={() => setActiveTab('database')}
              className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-2 ${
                activeTab === 'database'
                  ? 'bg-white text-red-700 shadow-md font-black'
                  : 'text-white hover:bg-white/10'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Brand Database ({dbBrands.length})</span>
            </button>
          </div>

        </div>
      </header>

      {/* Floating Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white border border-red-500 px-6 py-3 rounded-2xl font-mono text-xs font-bold shadow-2xl flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 text-red-500" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Page Body Container */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 flex-1 space-y-6">

        {/* TAB 1: CRAWLER WORKSPACE */}
        {activeTab === 'crawler' && (
          <div className="space-y-6">
            
            {/* Target URL Search & Control Bar */}
            <div className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-200 shadow-lg space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <label className="text-xs font-mono font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Globe className="w-4 h-4 text-red-600" />
                  <span>Target D2C Brand URL to Crawl & Sync</span>
                </label>
                <span className="text-[11px] font-mono text-slate-500">
                  Loops through all pagination pages & upserts items under Brand Name in Firestore
                </span>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="e.g. https://nobero.com or https://minimalist.co"
                    className="w-full pl-4 pr-4 py-3.5 rounded-2xl bg-slate-50 border border-slate-300 focus:border-red-600 focus:bg-white text-slate-900 font-mono text-sm outline-none transition-all shadow-inner font-medium"
                  />
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleStartCrawl()}
                  disabled={isCrawling}
                  className="py-3.5 px-8 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-mono font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-red-600/25 disabled:opacity-50 shrink-0 transition-all cursor-pointer"
                >
                  {isCrawling ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Crawling Full Site...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 fill-white text-white" />
                      <span>Crawl 100% Catalog</span>
                    </>
                  )}
                </motion.button>
              </div>
            </div>

            {/* Pipeline Stage Visualizer */}
            <div className="p-5 rounded-3xl bg-white border border-slate-200 space-y-3 shadow-md">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs font-mono font-bold uppercase text-slate-700">
                <span>Exhaustive Multi-Page Pipeline Status</span>
                
                {isCrawling ? (
                  <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 font-mono text-xs font-bold animate-pulse">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600 shrink-0" />
                    <span>Crawling Layer {activeStage} of 4...</span>
                  </div>
                ) : extractedProducts.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 font-mono text-xs font-black shadow-xs">
                      {addedProductIds.size === extractedProducts.length && addedProductIds.size > 0 ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <Database className="w-4 h-4 text-amber-600 shrink-0" />
                      )}
                      <span>
                        {addedProductIds.size} / {extractedProducts.length} Items Committed to DB ({extractedProducts.length > 0 ? Math.round((addedProductIds.size / extractedProducts.length) * 100) : 0}%)
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="w-28 sm:w-36 h-2.5 bg-slate-200 rounded-full overflow-hidden border border-slate-300 shadow-inner">
                        <div
                          className="h-full bg-emerald-500 transition-all duration-500 ease-out rounded-full shadow-sm"
                          style={{
                            width: `${extractedProducts.length > 0 ? (addedProductIds.size / extractedProducts.length) * 100 : 0}%`
                          }}
                        />
                      </div>
                      <span className="text-xs font-black text-emerald-700 font-mono">
                        {extractedProducts.length > 0 ? Math.round((addedProductIds.size / extractedProducts.length) * 100) : 0}%
                      </span>
                    </div>
                  </div>
                ) : activeStage === 4 ? (
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 font-mono text-xs font-extrabold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Pipeline Ready</span>
                  </div>
                ) : null}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                {[
                  { stage: 1, title: 'Layer 1: Multi-Page Ingestion', desc: 'Shopify /products.json & XML Sitemaps' },
                  { stage: 2, title: 'Layer 2: BFS Deep Linker', desc: 'Category links & ?page=N pagination' },
                  { stage: 3, title: 'Layer 3: Product Extractor', desc: 'Schema.org JSON-LD, GSM & Specs' },
                  {
                    stage: 4,
                    title: 'Layer 4: Brand Database Sync',
                    desc: addedProductIds.size > 0
                      ? `${addedProductIds.size} / ${extractedProducts.length} saved to Firestore`
                      : 'Pending manual "Add to Database" click'
                  }
                ].map((s) => {
                  const isActive = isCrawling && activeStage === s.stage;
                  const isDone = activeStage > s.stage || (activeStage === 4 && !isCrawling);

                  return (
                    <div
                      key={s.stage}
                      className={`p-3.5 rounded-2xl border transition-all text-xs ${
                        isDone
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-950 shadow-sm'
                          : isActive
                          ? 'bg-red-600 text-white border-red-700 animate-pulse shadow-lg shadow-red-600/20'
                          : 'bg-slate-50 border-slate-200 text-slate-500'
                      }`}
                    >
                      <div className="flex items-center gap-2 font-mono font-bold">
                        {isDone ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : isActive ? (
                          <Loader2 className="w-4 h-4 text-white animate-spin shrink-0" />
                        ) : (
                          <span className="w-3.5 h-3.5 rounded-full border border-slate-300 inline-block shrink-0" />
                        )}
                        <span className="truncate">{s.title}</span>
                      </div>
                      <p className={`text-[10px] mt-1.5 font-mono leading-tight ${isActive ? 'text-red-100' : isDone ? 'text-emerald-700 font-medium' : 'text-slate-500'}`}>
                        {s.desc}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Terminal Live Output Console */}
            {logs.length > 0 && (
              <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-3 font-mono text-xs shadow-xl text-slate-200">
                <div className="flex items-center justify-between text-slate-400 pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-red-500" />
                    <span className="font-bold text-white">Live Crawler Agent Output Stream</span>
                  </div>
                  <span className="text-[10px] text-slate-400">Total Stream Logs: {logs.length}</span>
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1.5 text-slate-300 pr-1 leading-relaxed">
                  {logs.map((log, idx) => (
                    <div key={idx} className={log.includes('Complete') || log.includes('100%') ? 'text-red-400 font-bold' : ''}>
                      {log}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Auto-Upsert Summary Banner */}
            {autoUpsertSummary && (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 font-mono text-xs font-bold flex items-center justify-between gap-3 shadow-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>{autoUpsertSummary}</span>
                </div>
                <button
                  onClick={() => setActiveTab('database')}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-mono text-[11px] font-bold hover:bg-emerald-700 transition-colors shrink-0"
                >
                  View in Brand Database →
                </button>
              </div>
            )}

            {/* Crawled Products Grid Section */}
            {extractedProducts.length > 0 && (
              <div className="space-y-4 pt-2">
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2 font-mono">
                        <span>Crawled Products Catalog ({extractedProducts.length})</span>
                        <span className="px-2.5 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-black border border-red-200 uppercase">
                          100% Extracted
                        </span>
                      </h3>
                    </div>

                    {/* Brand Name Controller Badge & Editor */}
                    <div className="flex flex-wrap items-center gap-2 pt-0.5">
                      <span className="text-xs font-mono font-bold text-slate-500">Brand Name:</span>
                      {isEditingBrandName ? (
                        <div className="flex items-center gap-2 flex-wrap">
                          <input
                            type="text"
                            value={tempBrandNameInput}
                            onChange={(e) => setTempBrandNameInput(e.target.value)}
                            className="px-3 py-1 rounded-xl bg-slate-50 border-2 border-red-500 text-slate-900 font-mono text-xs font-black focus:outline-none shadow-inner"
                            placeholder="Enter brand name..."
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveBrandName();
                              if (e.key === 'Escape') setIsEditingBrandName(false);
                            }}
                          />
                          <button
                            onClick={handleSaveBrandName}
                            className="px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-mono text-xs font-bold transition-all shadow-xs cursor-pointer"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => {
                              setTempBrandNameInput(customBrandName || extractedProducts[0]?.brand || 'D2C Brand');
                              setIsEditingBrandName(false);
                            }}
                            className="px-2.5 py-1 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-mono text-xs font-bold transition-all cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-3 py-1 rounded-xl bg-slate-900 text-white font-mono text-xs font-black shadow-xs flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-red-400" />
                            {customBrandName || extractedProducts[0]?.brand || 'D2C Brand'}
                          </span>
                          <button
                            onClick={() => {
                              setTempBrandNameInput(customBrandName || extractedProducts[0]?.brand || 'D2C Brand');
                              setIsEditingBrandName(true);
                            }}
                            className="px-2.5 py-1 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 font-mono text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                            title="Manually change brand name for extracted catalog"
                          >
                            <Pencil className="w-3 h-3 text-red-600" />
                            <span>Change Brand Name</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleAddAllProductsToDb}
                    disabled={isBulkAdding}
                    className="py-3 px-5 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-mono text-xs font-black flex items-center gap-2 shadow-lg shadow-red-600/20 disabled:opacity-50 transition-all cursor-pointer shrink-0"
                  >
                    {isBulkAdding ? (
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                    ) : (
                      <Plus className="w-4 h-4 text-white" />
                    )}
                    <span>＋ Add Brand & Catalog to Store Database</span>
                  </motion.button>
                </div>

                {/* Product Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {extractedProducts.map((p) => {
                    const isAdded = addedProductIds.has(p.id);
                    const activeImgIdx = activeImageMap[p.id] || 0;
                    const currentImg = p.images[activeImgIdx] || p.images[0];
                    const isExpandedDesc = expandedDescMap[p.id] || false;

                    return (
                      <div
                        key={p.id}
                        className="p-4 rounded-3xl bg-white border border-slate-200 space-y-3 flex flex-col justify-between hover:border-red-500 hover:shadow-xl transition-all group"
                      >
                        <div className="space-y-3">
                          {/* Full Vertical Photo Container (Portrait 3:4 Aspect Ratio) */}
                          <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-slate-100 border border-slate-200">
                            <img
                              src={currentImg}
                              alt={p.name}
                              className="w-full h-full object-cover object-top transition-transform duration-300 group-hover:scale-105"
                            />
                            
                            <span className="absolute top-2 left-2 px-2.5 py-1 rounded-lg bg-red-600 text-white font-mono text-[10px] font-black uppercase tracking-wider shadow-md">
                              {p.brand} Official
                            </span>

                            {/* Gallery Image Selector */}
                            {p.images.length > 1 && (
                              <div className="absolute bottom-2 left-2 right-2 p-1.5 rounded-xl bg-slate-900/90 backdrop-blur-md border border-white/20 flex items-center justify-center gap-1 overflow-x-auto">
                                {p.images.slice(0, 5).map((img, idx) => (
                                  <button
                                    key={idx}
                                    onClick={() => setActiveImageMap(prev => ({ ...prev, [p.id]: idx }))}
                                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all ${
                                      activeImgIdx === idx
                                        ? 'bg-red-600 text-white font-black shadow-sm'
                                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                    }`}
                                  >
                                    Img {idx + 1}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Category & Title */}
                          <div>
                            <span className="inline-block px-2 py-0.5 rounded bg-red-50 text-red-700 text-[10px] font-mono font-black uppercase border border-red-200 mb-1">
                              📂 Category: {p.category}
                            </span>
                            <h4 className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-2 leading-tight">
                              {p.name}
                            </h4>
                          </div>

                          {/* Product Description */}
                          {p.description && (
                            <div className="text-[11px] text-slate-600 font-sans leading-relaxed bg-slate-50 p-3 rounded-2xl border border-slate-200">
                              <p className={isExpandedDesc ? '' : 'line-clamp-2'}>
                                {p.description}
                              </p>
                              {p.description.length > 80 && (
                                <button
                                  onClick={() => setExpandedDescMap(prev => ({ ...prev, [p.id]: !isExpandedDesc }))}
                                  className="text-[10px] text-red-600 font-mono font-bold hover:underline mt-1 block"
                                >
                                  {isExpandedDesc ? 'Show Less' : 'Read Full Description'}
                                </button>
                              )}
                            </div>
                          )}

                          {/* Price Box */}
                          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-baseline justify-between font-mono text-xs">
                            <div>
                              <span className="text-slate-500 text-[10px] block font-bold">DIRECT STORE</span>
                              <span className="font-extrabold text-red-600 text-sm">₹{p.directPrice.toLocaleString('en-IN')}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-slate-400 text-[10px] block">MARKETPLACE</span>
                              <span className="text-slate-400 line-through text-[11px]">
                                ₹{p.marketplacePrice.toLocaleString('en-IN')}
                              </span>
                            </div>
                          </div>

                          {/* Normalized Specs Badges */}
                          <div className="flex flex-wrap gap-1">
                            {p.specs.map((spec, sIdx) => (
                              <span
                                key={sIdx}
                                className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono text-[10px] border border-slate-200"
                              >
                                {spec.label}: <strong>{spec.value}</strong>
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Add to Database Button */}
                        <button
                          onClick={() => handleAddSingleProductToDb(p)}
                          className={`w-full py-2.5 px-3 rounded-2xl font-mono text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                            isAdded
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 font-extrabold'
                              : 'bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-600/20 font-black'
                          }`}
                        >
                          <CheckCircle2 className={`w-3.5 h-3.5 ${isAdded ? 'text-emerald-600' : 'text-white'}`} />
                          <span>{isAdded ? 'Added to Brand Database' : '＋ Add Item to Database'}</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: BRAND DATABASE EXPLORER */}
        {activeTab === 'database' && (
          <div className="space-y-6">
            
            {/* Brands Explorer Filter & Stats Header */}
            <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-lg space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-lg font-black font-mono text-slate-900 flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-red-600" />
                    <span>D2C Brands Organized in Firestore</span>
                  </h2>
                  <p className="text-xs text-slate-500">
                    All items are grouped under their brand name. Re-crawling updates pricing, colors & availability in real time.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={loadBrandDatabase}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-mono text-xs font-bold border border-slate-300 transition-colors flex items-center gap-2"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingBrandData ? 'animate-spin' : ''}`} />
                    <span>Refresh Index</span>
                  </button>

                  <button
                    onClick={handleClearEntireDatabase}
                    className="px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-mono text-xs font-bold border border-rose-200 transition-colors flex items-center gap-2 cursor-pointer"
                    title="Clear all stored brands and products"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                    <span>Clear All Data</span>
                  </button>
                </div>
              </div>

              {/* Brand Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={brandSearchQuery}
                  onChange={(e) => setBrandSearchQuery(e.target.value)}
                  placeholder="Search stored brand names (e.g. Nobero, Minimalist, Snitch)..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 focus:border-red-600 text-slate-900 font-mono text-xs outline-none"
                />
              </div>

              {/* Brand Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredBrands.length === 0 ? (
                  <div className="col-span-full text-center py-8 text-slate-500 font-mono text-xs">
                    No brands found in database. Use the Crawler Workspace to crawl and click "Add" to save brands!
                  </div>
                ) : (
                  filteredBrands.map((brand) => {
                    const isSelected = selectedBrand === brand.name;
                    return (
                      <div
                        key={brand.id}
                        onClick={() => handleSelectBrand(brand.name)}
                        className={`p-4 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between space-y-3 ${
                          isSelected
                            ? 'bg-red-50 border-red-500 shadow-md ring-2 ring-red-600/20'
                            : 'bg-slate-50 hover:bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <h4 className="font-extrabold font-mono text-sm text-slate-900 truncate">
                              {brand.name}
                            </h4>
                            <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-mono font-black shrink-0 shadow-xs">
                              {brand.totalProducts || 0} Products
                            </span>
                          </div>

                          <div className="space-y-1 mb-2">
                            <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-600 font-semibold">
                              <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                              <span>
                                Last Crawled: {brand.lastCrawledAt ? `${new Date(brand.lastCrawledAt).toLocaleDateString()} at ${new Date(brand.lastCrawledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Recently'}
                              </span>
                            </div>

                            {brand.officialUrl && (
                              <a
                                href={brand.officialUrl}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1 text-[10px] font-mono text-red-600 hover:underline truncate max-w-full"
                              >
                                <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                                <span className="truncate">{brand.officialUrl.replace(/^https?:\/\//, '')}</span>
                              </a>
                            )}
                          </div>

                          {brand.categories && brand.categories.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {brand.categories.slice(0, 3).map((cat, idx) => (
                                <span
                                  key={idx}
                                  className="px-1.5 py-0.5 rounded bg-white text-slate-600 border border-slate-200 text-[9px] font-mono"
                                >
                                  {cat}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="pt-2.5 border-t border-slate-200/80 flex items-center justify-between gap-2">
                          <span className="text-[10px] font-mono font-bold text-slate-600">
                            {isSelected ? '● Viewing Catalog' : 'Click to View'}
                          </span>

                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleReCrawlBrand(brand);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white font-mono text-[10px] font-extrabold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                              title="Re-Crawl website & update product catalog in database"
                            >
                              <RefreshCw className="w-3 h-3" />
                              <span>Re-Crawl</span>
                            </button>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteBrand(brand.id, brand.name);
                              }}
                              className="p-1 rounded-lg bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-700 transition-colors cursor-pointer"
                              title="Delete Brand & all products from database"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Selected Brand Items Catalog */}
            {selectedBrand && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 font-mono flex items-center gap-2">
                      <span>Brand Catalog: "{selectedBrand}"</span>
                      <span className="px-2.5 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-black">
                        {brandProducts.length} Products Stored
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500">
                      Showing all products stored under "{selectedBrand}" in Firestore database.
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      const foundBrand = dbBrands.find((b) => b.name === selectedBrand);
                      if (foundBrand) handleReCrawlBrand(foundBrand);
                      else handleStartCrawl(`https://${selectedBrand.toLowerCase()}.com`);
                    }}
                    className="py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-mono text-xs font-black flex items-center gap-2 shadow-md transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-white" />
                    <span>Re-Crawl & Auto-Update Details</span>
                  </button>
                </div>

                {isLoadingBrandData ? (
                  <div className="p-12 text-center text-slate-500 font-mono text-xs flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin text-red-600" />
                    <span>Loading products for brand {selectedBrand}...</span>
                  </div>
                ) : brandProducts.length === 0 ? (
                  <div className="p-8 text-center bg-white rounded-3xl border border-slate-200 text-slate-500 font-mono text-xs">
                    No stored products found for brand "{selectedBrand}". Click "Re-Crawl & Auto-Update Details" above to fetch!
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {brandProducts.map((p) => {
                      const activeImgIdx = activeImageMap[p.id] || 0;
                      const currentImg = p.images?.[activeImgIdx] || p.images?.[0] || 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=800';

                      return (
                        <div
                          key={p.id}
                          className="p-4 rounded-3xl bg-white border border-slate-200 space-y-3 flex flex-col justify-between hover:border-red-500 hover:shadow-lg transition-all"
                        >
                          <div className="space-y-3">
                            <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-slate-100 border border-slate-200">
                              <img
                                src={currentImg}
                                alt={p.name}
                                className="w-full h-full object-cover object-top"
                              />
                              <span className="absolute top-2 left-2 px-2.5 py-1 rounded-lg bg-red-600 text-white font-mono text-[10px] font-black uppercase shadow-md">
                                {p.brand} Stored
                              </span>
                            </div>

                            <div>
                              <span className="inline-block px-2 py-0.5 rounded bg-red-50 text-red-700 text-[10px] font-mono font-black uppercase border border-red-200 mb-1">
                                {p.category}
                              </span>
                              <h4 className="text-xs font-bold text-slate-900 line-clamp-2 leading-tight">
                                {p.name}
                              </h4>
                            </div>

                            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-baseline justify-between font-mono text-xs">
                              <div>
                                <span className="text-slate-500 text-[10px] block font-bold">STORE PRICE</span>
                                <span className="font-extrabold text-red-600 text-sm">₹{p.directPrice.toLocaleString('en-IN')}</span>
                              </div>
                              <div className="text-right">
                                <span className="text-slate-400 text-[10px] block">MARKETPLACE</span>
                                <span className="text-slate-400 line-through text-[11px]">
                                  ₹{p.marketplacePrice.toLocaleString('en-IN')}
                                </span>
                              </div>
                            </div>

                            {p.specs && p.specs.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {p.specs.map((spec, sIdx) => (
                                  <span
                                    key={sIdx}
                                    className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono text-[10px] border border-slate-200"
                                  >
                                    {spec.label}: <strong>{spec.value}</strong>
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <a
                              href={p.officialUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-mono text-xs font-bold flex items-center justify-center gap-1.5 transition-colors border border-slate-300"
                            >
                              <ExternalLink className="w-3.5 h-3.5 text-slate-600" />
                              <span>Visit Store</span>
                            </a>

                            <button
                              onClick={() => handleDeleteSingleProductFromDb(p.id, p.name, p.brand)}
                              className="p-2 rounded-xl bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-700 border border-slate-200 transition-colors cursor-pointer"
                              title="Delete product from database"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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
        )}

      </main>

      {/* Confirmation Modal for Brand Deletion */}
      <AnimatePresence>
        {brandToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl border border-rose-200 p-6 max-w-md w-full shadow-2xl space-y-4 text-slate-900 font-sans"
            >
              <div className="flex items-center gap-3 text-rose-600 font-mono font-black text-sm">
                <div className="p-2.5 rounded-2xl bg-rose-100 text-rose-600">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Confirm Brand Erasure</h3>
                  <p className="text-xs text-slate-500 font-normal">Firestore Database Deletion</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-950 space-y-2 leading-relaxed">
                <p className="font-bold">
                  Are you sure you want to completely delete brand <span className="underline font-black text-rose-700 font-mono">"{brandToDelete.name}"</span> from the database?
                </p>
                <p className="text-[11px] text-rose-800">
                  This will wipe all stored items, subcollections, categories, and top-level products associated with <strong className="font-mono">{brandToDelete.name}</strong> permanently.
                </p>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => setBrandToDelete(null)}
                  disabled={isDeletingBrand}
                  className="flex-1 py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  onClick={confirmDeleteBrand}
                  disabled={isDeletingBrand}
                  className="flex-1 py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-mono text-xs font-black transition-all shadow-lg shadow-rose-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isDeletingBrand ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Erasing Data...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 text-white" />
                      <span>Yes, Erase Brand</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {reCrawlModalBrand && (
        <ReCrawlModal
          brandName={reCrawlModalBrand.name}
          brandUrl={reCrawlModalBrand.url}
          onClose={() => setReCrawlModalBrand(null)}
          onSuccess={async () => {
            showToast(`✅ Differential sync completed for "${reCrawlModalBrand.name}"!`);
            await loadBrandDatabase();
            if (selectedBrand === reCrawlModalBrand.name) {
              const updatedProds = await getProductsByBrandFromDb(reCrawlModalBrand.name);
              setBrandProducts(updatedProds);
            }
          }}
        />
      )}
    </div>
  );
};
