import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bot,
  Globe,
  Zap,
  CheckCircle2,
  Plus,
  Trash2,
  Pencil,
  Sparkles,
  Layers,
  ExternalLink,
  Tag,
  Filter,
  Search,
  RefreshCw,
  Store,
  ChevronRight,
  ChevronLeft,
  X,
  Palette,
  Eye,
  Database,
  SlidersHorizontal,
  ArrowRight,
  ShieldCheck,
  PackageCheck,
  Check,
  Copy,
  FolderPlus,
  CheckSquare
} from 'lucide-react';
import { Product, ProductSpec } from '../types';
import { saveProductToDb, upsertBrandProductsToDb } from '../lib/firestoreService';

interface CuratedCrawlerStudioProps {
  onProductsAddedToGlobalCatalog?: (products: Product[]) => void;
}

export const CuratedCrawlerStudio: React.FC<CuratedCrawlerStudioProps> = ({
  onProductsAddedToGlobalCatalog
}) => {
  // 1. Crawler Input & Staging State
  const [targetUrl, setTargetUrl] = useState<string>('https://nobero.com/products/signature-linen-cotton-blend-shirt-2');
  const [defaultGender, setDefaultGender] = useState<'Auto' | 'Men' | 'Women'>('Auto');
  const [isCrawling, setIsCrawling] = useState<boolean>(false);
  const [crawlProgressLog, setCrawlProgressLog] = useState<string[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Custom user collections state
  const [customCollections, setCustomCollections] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('curated_custom_collections');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isAddCollectionModalOpen, setIsAddCollectionModalOpen] = useState<boolean>(false);
  const [newCollectionInput, setNewCollectionInput] = useState<string>('');
  const [isAssignCollectionModalOpen, setIsAssignCollectionModalOpen] = useState<boolean>(false);

  // Temporary Staging Buffer (In-Memory & LocalStorage Persisted until committed)
  const [stagedArticles, setStagedArticles] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem('curated_staged_articles');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Track which article IDs have been committed to Firestore database
  const [committedArticleIds, setCommittedArticleIds] = useState<Set<string>>(new Set());
  const [selectedArticleIds, setSelectedArticleIds] = useState<Set<string>>(new Set());
  const [isClassifyingGemini, setIsClassifyingGemini] = useState<boolean>(false);

  // 2. Hierarchy Navigation Filters: Collection >> Brand >> Gender >> Category >> Item
  const [selectedArticleCollectionFilter, setSelectedArticleCollectionFilter] = useState<string>('ALL');
  const [targetArticleCollection, setTargetArticleCollection] = useState<string>('Auto-Detect');
  const [overrideBrandName, setOverrideBrandName] = useState<string>('');
  const [isBrandModalOpen, setIsBrandModalOpen] = useState<boolean>(false);
  const [newBulkBrandName, setNewBulkBrandName] = useState<string>('');
  const [selectedBrandFilter, setSelectedBrandFilter] = useState<string>('ALL');
  const [selectedGenderFilter, setSelectedGenderFilter] = useState<string>('ALL');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // 3. Curator Edit Modal State
  const [editingArticle, setEditingArticle] = useState<Product | null>(null);
  const [isManualAddModalOpen, setIsManualAddModalOpen] = useState<boolean>(false);

  // Active Image Carousel Index Map for preview cards
  const [activeImageMap, setActiveImageMap] = useState<Record<string, number>>({});

  // Persist temporary staged articles to localStorage whenever changed
  useEffect(() => {
    try {
      localStorage.setItem('curated_staged_articles', JSON.stringify(stagedArticles));
    } catch (e) {
      console.warn('Failed to persist staged articles to localStorage:', e);
    }
  }, [stagedArticles]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Preset store URLs for fast testing
  const presetStores = [
    { name: 'Nobero', url: 'https://nobero.com/products/signature-linen-cotton-blend-shirt-2' },
    { name: 'Snitch', url: 'https://snitch.co.in' },
    { name: 'Zara', url: 'https://zara.com' },
    { name: 'Veirdo', url: 'https://veirdo.in' },
    { name: 'H&M', url: 'https://www2.hm.com' }
  ];

  // Articles Collections Taxonomy
  const articleCollectionsList = [
    'Sarees — Women',
    'Kurti — Women',
    'Formal',
    'Drips',
    'Coffee & Code',
    'Smart Casual Workwear',
    'Minimalist Everyday',
    'Techwear & Lounge',
    'Weekend Cafe Vibe'
  ];

  // Helper to match text against keywords (supports both spaced and snake_case keywords)
  const matchKeywords = (text: string, keywords: string[]): boolean => {
    const normalizedText = text.toLowerCase().replace(/_/g, ' ');
    return keywords.some(kw => {
      const kwClean = kw.toLowerCase().replace(/_/g, ' ');
      return normalizedText.includes(kwClean);
    });
  };

  // 1. Sarees — Women Keywords
  const SAREES_WOMEN_KEYWORDS = [
    'saree', 'sari', 'silk_saree', 'cotton_saree', 'linen_saree', 'organza_saree',
    'georgette_saree', 'chiffon_saree', 'crepe_saree', 'satin_saree', 'chanderi_saree',
    'banarasi_saree', 'kanjeevaram_saree', 'kanjivaram_saree', 'chikankari_saree',
    'handloom_saree', 'handwoven_saree', 'printed_saree', 'embroidered_saree',
    'sequin_saree', 'designer_saree', 'pre_draped_saree', 'ready_to_wear_saree',
    'wedding_saree', 'bridal_saree', 'festive_saree', 'party_saree', 'reception_saree',
    'puja_saree', 'office_saree', 'work_saree', 'casual_saree', 'daily_wear_saree',
    'traditional_saree', 'modern_saree', 'evening_saree', 'minimal_saree',
    'contemporary_saree', 'luxury_saree', 'elegant_saree', 'statement_saree',
    'classic_saree', 'fusion_saree', 'minimalist_ethnic', 'modern_ethnic'
  ];

  // 2. Kurti — Women Keywords
  const KURTI_WOMEN_KEYWORDS = [
    'kurti', 'kurta', 'kurta_women', 'women_kurta', 'kurti_set', 'kurta_set',
    'ethnic_kurti', 'indian_kurti', 'straight_kurti', 'a_line_kurti', 'anarkali',
    'anarkali_kurti', 'long_kurti', 'short_kurti', 'asymmetric_kurti', 'flared_kurti',
    'shirt_kurti', 'angrakha_kurti', 'peplum_kurti', 'high_low_kurti', 'kurta_pant_set',
    'kurta_palazzo_set', 'kurta_dupatta_set', 'three_piece_kurta_set', 'kurti_bottom_set',
    'kurti_with_dupatta', 'co_ord_kurta_set', 'cotton_kurti', 'linen_kurti', 'rayon_kurti',
    'silk_kurti', 'chanderi_kurti', 'chikankari_kurti', 'block_print_kurti', 'ajrakh_kurti',
    'handblock_kurti', 'embroidered_kurti', 'printed_kurti', 'daily_wear_kurti',
    'office_kurti', 'work_kurti', 'casual_kurti', 'festive_kurti', 'party_kurti',
    'wedding_kurti', 'puja_kurti', 'college_kurti'
  ];

  // 3. Formal Keywords
  const FORMAL_KEYWORDS = [
    'formal', 'formalwear', 'formal_wear', 'office_wear', 'business_wear', 'business_formal',
    'corporate_wear', 'professional_wear', 'workwear', 'office_outfit', 'formal_shirt',
    'dress_shirt', 'formal_trousers', 'suit', 'blazer', 'formal_blazer', 'three_piece_suit',
    'two_piece_suit', 'waistcoat', 'formal_pants', 'dress_pants', 'formal_shoes',
    'oxford_shoes', 'derby_shoes', 'formal_women', 'women_formalwear', 'women_office_wear',
    'women_workwear', 'formal_dress', 'office_dress', 'blazer_women', 'women_blazer',
    'tailored_trousers', 'pencil_skirt', 'formal_skirt', 'work_shirt', 'tailored',
    'structured', 'polished', 'professional', 'minimal_formal', 'modern_formal',
    'classic_formal', 'corporate', 'business_casual', 'smart_formal'
  ];

  // 4. Drips Keywords
  const DRIPS_KEYWORDS = [
    'drip', 'drippy', 'streetwear', 'street_style', 'urban_style', 'urbanwear',
    'street_fashion', 'hypebeast', 'gen_z_fashion', 'y2k', 'trendy', 'trend_fashion',
    'statement_fashion', 'oversized', 'baggy', 'relaxed_fit', 'boxy_fit', 'cropped',
    'wide_leg', 'loose_fit', 'drop_shoulder', 'oversized_tshirt', 'oversized_hoodie',
    'baggy_jeans', 'cargo_pants', 'wide_leg_pants', 'graphic_tshirt', 'graphic_tee',
    'hoodie', 'zip_hoodie', 'bomber_jacket', 'varsity_jacket', 'denim_jacket',
    'cargo_jeans', 'parachute_pants', 'track_pants', 'high_top_sneakers',
    'chunky_sneakers', 'edgy', 'grunge', 'skater', 'hip_hop', 'minimal_streetwear',
    'luxury_streetwear'
  ];

  // 5. Coffee & Code Keywords
  const COFFEE_CODE_KEYWORDS = [
    'smart casual', 'modern casual', 'relaxed smart casual', 'minimal casual', 'minimalist outfit',
    'casual workwear', 'creative workwear', 'techwear casual', 'office casual', 'business casual',
    'casual office outfit', 'work from cafe', 'cafe outfit', 'coffee shop outfit', 'work from coffee shop',
    'coffee shop', 'developer outfit', 'programmer outfit', 'tech outfit',
    'mens smart casual', 'mens casual workwear', 'mens minimalist outfit', 'mens cafe outfit',
    'mens coffee shop outfit', 'mens developer outfit', 'mens programmer outfit', 'mens tech outfit',
    'mens office casual', 'mens relaxed workwear', 'mens overshirt outfit', 'mens polo outfit',
    'mens relaxed trousers', 'mens straight fit trousers', 'mens sneakers outfit',
    'men smart casual', 'men casual workwear', 'men minimalist outfit', 'men cafe outfit',
    'womens smart casual', 'womens casual workwear', 'womens minimalist outfit', 'womens cafe outfit',
    'womens coffee shop outfit', 'womens developer outfit', 'womens tech outfit', 'womens office casual',
    'womens relaxed workwear', 'womens overshirt outfit', 'womens knit outfit', 'womens wide leg trousers',
    'womens straight trousers', 'womens sneakers outfit',
    'women smart casual', 'women casual workwear', 'women minimalist outfit',
    'overshirt', 'oxford shirt', 'linen shirt', 'cotton shirt', 'relaxed fit shirt', 'boxy shirt',
    'polo t shirt', 'polo t-shirt', 'knitted polo', 'knit polo', 'basic t shirt', 'basic t-shirt',
    'minimal t shirt', 'minimal t-shirt', 'heavyweight t shirt', 'heavyweight t-shirt',
    'crew neck t shirt', 'crew neck t-shirt', 'crewneck', 'henley', 'quarter zip', '1/4 zip',
    'lightweight sweater', 'cardigan',
    'straight fit trousers', 'relaxed fit trousers', 'pleated trousers', 'wide leg trousers',
    'chinos', 'cotton trousers', 'linen trousers', 'straight fit jeans', 'relaxed jeans', 'dark denim',
    'white sneakers', 'minimal sneakers', 'retro sneakers', 'canvas sneakers', 'loafers',
    'derby shoes', 'casual loafers', 'minimal shoes', 'slip on shoes', 'slip-on shoes',
    'minimal watch', 'leather watch', 'tote bag', 'laptop bag', 'crossbody bag', 'backpack',
    'leather belt', 'minimal belt', 'sunglasses', 'baseball cap',
    'coffee brown', 'chocolate brown', 'earth tones', 'earth tone', 'warm tones', 'warm tone',
    'off white', 'off-white', 'beige', 'cream', 'khaki', 'tan', 'charcoal', 'olive', 'monochrome'
  ];

  const isSareesWomenMatch = (product: Partial<Product>): boolean => {
    const prodTags = (product as any).tags;
    const tagsStr = Array.isArray(prodTags) ? prodTags.join(' ') : (prodTags || '');
    const text = `${product.name || ''} ${product.description || ''} ${product.category || ''} ${JSON.stringify(product.specs || [])} ${product.brand || ''} ${tagsStr}`;
    return matchKeywords(text, SAREES_WOMEN_KEYWORDS);
  };

  const isKurtiWomenMatch = (product: Partial<Product>): boolean => {
    const prodTags = (product as any).tags;
    const tagsStr = Array.isArray(prodTags) ? prodTags.join(' ') : (prodTags || '');
    const text = `${product.name || ''} ${product.description || ''} ${product.category || ''} ${JSON.stringify(product.specs || [])} ${product.brand || ''} ${tagsStr}`;
    return matchKeywords(text, KURTI_WOMEN_KEYWORDS);
  };

  const isFormalMatch = (product: Partial<Product>): boolean => {
    const prodTags = (product as any).tags;
    const tagsStr = Array.isArray(prodTags) ? prodTags.join(' ') : (prodTags || '');
    const text = `${product.name || ''} ${product.description || ''} ${product.category || ''} ${JSON.stringify(product.specs || [])} ${product.brand || ''} ${tagsStr}`;
    return matchKeywords(text, FORMAL_KEYWORDS);
  };

  const isDripsMatch = (product: Partial<Product>): boolean => {
    const prodTags = (product as any).tags;
    const tagsStr = Array.isArray(prodTags) ? prodTags.join(' ') : (prodTags || '');
    const text = `${product.name || ''} ${product.description || ''} ${product.category || ''} ${JSON.stringify(product.specs || [])} ${product.brand || ''} ${tagsStr}`;
    return matchKeywords(text, DRIPS_KEYWORDS);
  };

  const isCoffeeAndCodeMatch = (product: Partial<Product>): boolean => {
    const prodTags = (product as any).tags;
    const tagsStr = Array.isArray(prodTags) ? prodTags.join(' ') : (prodTags || '');
    const text = `${product.name || ''} ${product.description || ''} ${product.category || ''} ${JSON.stringify(product.specs || [])} ${product.brand || ''} ${tagsStr}`;
    
    if (matchKeywords(text, COFFEE_CODE_KEYWORDS)) return true;

    const aestheticColors = ['beige', 'cream', 'off white', 'coffee brown', 'chocolate brown', 'olive', 'khaki', 'tan', 'charcoal', 'earth tones', 'warm tones'];
    const productTypes = ['shirt', 'trousers', 'pants', 'jeans', 'sweater', 'jacket', 'polo', 'sneakers', 'loafers', 'cardigan', 'hoodie', 'tote bag', 'backpack'];
    
    const textLower = text.toLowerCase();
    const hasColor = aestheticColors.some(c => textLower.includes(c));
    const hasProductType = productTypes.some(pt => textLower.includes(pt));

    return hasColor && hasProductType;
  };

  const detectArticleCollection = (article: Partial<Product>): string => {
    const current = article.articleCollection;
    if (current && ['Sarees — Women', 'Kurti — Women', 'Formal', 'Drips', 'Coffee & Code'].includes(current)) {
      return current;
    }

    if (isSareesWomenMatch(article)) return 'Sarees — Women';
    if (isKurtiWomenMatch(article)) return 'Kurti — Women';
    if (isFormalMatch(article)) return 'Formal';
    if (isDripsMatch(article)) return 'Drips';
    if (isCoffeeAndCodeMatch(article)) return 'Coffee & Code';

    if (current && current !== 'Auto-Detect' && current !== 'General') {
      return current;
    }

    return 'General';
  };

  const getArticleCollection = (article: Partial<Product>): string => {
    if (article.articleCollection && article.articleCollection !== 'General' && article.articleCollection !== 'Auto-Detect') {
      return article.articleCollection;
    }
    return detectArticleCollection(article);
  };

  const getCollectionEmoji = (coll: string) => {
    switch (coll) {
      case 'Sarees — Women': return '🥻';
      case 'Kurti — Women': return '💃';
      case 'Formal': return '💼';
      case 'Drips': return '🔥';
      case 'Coffee & Code': return '☕';
      default: return '✨';
    }
  };

  // Common Fashion Categories Taxonomy
  const categoriesList = [
    'T-Shirts & Tees',
    'Co-Ord Sets',
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
    'Casual Shoes',
    'Athletic Footwear',
    'Accessories & Jewelry'
  ];

  // Helper to extract colors array from product specs or tags
  const getProductColors = (product: Product): string[] => {
    const colorSpec = product.specs?.find(s => 
      s.label.toLowerCase().includes('color') || 
      s.label.toLowerCase().includes('shade')
    );

    if (colorSpec && colorSpec.value) {
      return colorSpec.value.split(/[,/|&]/).map(c => c.trim()).filter(Boolean);
    }

    // Fallback: look for common color keywords in product name or description
    const commonColors = [
      'Black', 'White', 'Olive', 'Navy', 'Blue', 'Beige', 'Grey', 'Gray',
      'Red', 'Green', 'Yellow', 'Brown', 'Cream', 'Khaki', 'Charcoal', 'Maroon', 'Pink', 'Lavender'
    ];
    const found: string[] = [];
    const text = `${product.name} ${product.description || ''}`;
    for (const col of commonColors) {
      if (new RegExp(`\\b${col}\\b`, 'i').test(text)) {
        found.push(col);
      }
    }
    return found.length > 0 ? Array.from(new Set(found)) : ['Standard / Multi-color'];
  };

  // Helper to extract gender from product specs or category
  const getProductGender = (product: Product): 'Men' | 'Women' => {
    const genderSpec = product.specs?.find(s => s.label.toLowerCase().includes('gender'));
    if (genderSpec) {
      const val = genderSpec.value.toLowerCase();
      if (val.includes('women') || val.includes('female')) return 'Women';
      if (val.includes('men') || val.includes('male')) return 'Men';
    }

    const text = `${product.name} ${product.category} ${product.description || ''} ${product.articleCollection || ''}`.toLowerCase();
    if (/\b(women|woman|ladies|female|girl|girls|dress|skirt|saree|sari|kurti|lehenga|croptop|blouse|heels|flats|handbag|purse|jewelry)\b/i.test(text)) {
      return 'Women';
    }
    if (/\b(men|man|gentlemen|male|boy|boys|sherwani|kurta|boxers|suit|blazer|trousers|tie)\b/i.test(text)) {
      return 'Men';
    }
    if (text.includes('women')) return 'Women';
    return 'Men';
  };

  // Update gender on a staged product
  const handleUpdateProductGender = (productId: string, newGender: 'Men' | 'Women') => {
    setStagedArticles(prev => prev.map(p => {
      if (p.id !== productId) return p;
      const specs = p.specs ? [...p.specs] : [];
      const genderIdx = specs.findIndex(s => s.label.toLowerCase().includes('gender'));
      if (genderIdx >= 0) {
        specs[genderIdx] = { label: 'Gender', value: newGender };
      } else {
        specs.push({ label: 'Gender', value: newGender });
      }
      return { ...p, specs };
    }));
    showToast(`Updated gender to "${newGender}"`);
  };

  // Update category on a staged product
  const handleUpdateProductCategory = (productId: string, newCategory: string) => {
    setStagedArticles(prev => prev.map(p => p.id === productId ? { ...p, category: newCategory } : p));
    showToast(`Updated category to "${newCategory}"`);
  };

  // Save or batch-change Brand Name across staged/selected articles
  const handleApplyBrandName = (brandNameToApply: string) => {
    const trimmed = brandNameToApply.trim();
    if (!trimmed) {
      showToast('Please enter a valid brand name.');
      return;
    }
    if (stagedArticles.length === 0) {
      showToast('No staged articles to update.');
      return;
    }

    const targetIds = selectedArticleIds.size > 0 ? selectedArticleIds : null;
    let count = 0;

    setStagedArticles(prev => prev.map(art => {
      if (!targetIds || targetIds.has(art.id)) {
        count++;
        return {
          ...art,
          brand: trimmed,
          marketplaceName: `${trimmed} Direct Store`
        };
      }
      return art;
    }));

    showToast(`🏷️ Updated brand name to "${trimmed}" for ${count} article${count === 1 ? '' : 's'}!`);
    setIsBrandModalOpen(false);
    setNewBulkBrandName('');
  };

  // 4. Trigger Web Crawling into Temporary Setup
  const handleStartCrawl = async (customUrl?: string, customBrand?: string) => {
    const finalUrl = customUrl || targetUrl;
    const activeBrandOverride = customBrand !== undefined ? customBrand : overrideBrandName;
    if (!finalUrl || finalUrl.trim().length < 4) return;

    setIsCrawling(true);
    setCrawlProgressLog([
      `🚀 Initiating AI Web Crawler for URL: ${finalUrl}`,
      `🌐 Scanning page DOM, JSON-LD schemas, images, and product catalog...`
    ]);

    try {
      const resp = await fetch('/api/crawl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: finalUrl })
      });

      let data: any = null;
      if (resp.ok) {
        data = await resp.json();
      } else {
        const txt = await resp.text();
        data = { products: [], logs: [`⚠️ Crawl returned status ${resp.status}: ${txt.slice(0, 100)}`] };
      }

      const crawledProducts: Product[] = data?.products || [];

      if (crawledProducts.length > 0) {
        // Enforce defaultGender, brand, and targetArticleCollection
        const formatted = crawledProducts.map(p => {
          let updated = { ...p };
          if (defaultGender !== 'Auto') {
            const specs = p.specs ? [...p.specs] : [];
            const genderIdx = specs.findIndex(s => s.label.toLowerCase().includes('gender'));
            if (genderIdx >= 0) {
              specs[genderIdx] = { label: 'Gender', value: defaultGender };
            } else {
              specs.push({ label: 'Gender', value: defaultGender });
            }
            updated.specs = specs;
          }
          if (activeBrandOverride && activeBrandOverride.trim()) {
            updated.brand = activeBrandOverride.trim();
            updated.marketplaceName = `${activeBrandOverride.trim()} Direct Store`;
          }
          // Default or auto-match article collection
          updated.articleCollection = targetArticleCollection && targetArticleCollection !== 'Auto-Detect'
            ? targetArticleCollection
            : detectArticleCollection(p);
          return updated;
        });

        // Deduplicate against existing staged articles by id or title
        setStagedArticles(prev => {
          const existingIds = new Set(prev.map(item => item.id));
          const newUnique = formatted.filter(item => !existingIds.has(item.id));
          return [...newUnique, ...prev];
        });

        setCrawlProgressLog(prev => [
          ...prev,
          ...(data.logs || []),
          `🎉 Extracted ${crawledProducts.length} articles! Loaded into Temporary Staging Workspace.`
        ]);
        showToast(`Extracted ${crawledProducts.length} articles into Temporary Staging!`);
      } else {
        setCrawlProgressLog(prev => [
          ...prev,
          ...(data.logs || []),
          `⚠️ No direct products extracted. Try pasting a direct product URL or Shopify store link.`
        ]);
        showToast('No products extracted. Please verify website URL.');
      }
    } catch (err: any) {
      console.error('Crawl Error:', err);
      setCrawlProgressLog(prev => [...prev, `❌ Crawl Error: ${err.message || 'Connection failed'}`]);
      showToast(`Crawl failed: ${err.message || 'Network error'}`);
    } finally {
      setIsCrawling(false);
    }
  };

  // 5. Gemini AI Auto-Classify Staged Articles
  const handleGeminiAutoClassify = async () => {
    if (stagedArticles.length === 0) return;
    setIsClassifyingGemini(true);
    showToast('🤖 Running Gemini AI to classify brand, gender, categories, and colors...');

    try {
      const resp = await fetch('/api/shopify/recategorize-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products: stagedArticles })
      });

      if (resp.ok) {
        const result = await resp.json();
        const updatedList: Product[] = result.classifiedProducts || [];
        if (updatedList.length > 0) {
          // Merge classified fields
          setStagedArticles(prev => prev.map(p => {
            const classified = updatedList.find(u => u.id === p.id);
            if (classified) {
              return {
                ...p,
                category: classified.category || p.category,
                specs: classified.specs || p.specs
              };
            }
            return p;
          }));
          showToast(`✨ Gemini AI successfully re-classified ${updatedList.length} articles!`);
        }
      } else {
        showToast('Gemini AI classification notice: Using rule-based auto-classification.');
      }
    } catch (err) {
      console.warn('Gemini classification notice:', err);
    } finally {
      setIsClassifyingGemini(false);
    }
  };

  // 6. Commit Curated Article to Main Database
  const handleCommitSingleArticleToDb = async (article: Product) => {
    const success = await saveProductToDb(article);
    if (success) {
      setCommittedArticleIds(prev => new Set(prev).add(article.id));
      if (onProductsAddedToGlobalCatalog) {
        onProductsAddedToGlobalCatalog([article]);
      }
      showToast(`✅ Article "${article.name}" published to main database!`);
    } else {
      showToast('❌ Failed to save article to database.');
    }
  };

  // Commit selected batch of articles to DB
  const handleCommitSelectedArticlesToDb = async () => {
    const toCommit = stagedArticles.filter(p => selectedArticleIds.has(p.id));
    if (toCommit.length === 0) {
      showToast('Please select at least one article to publish.');
      return;
    }

    let successCount = 0;
    for (const article of toCommit) {
      const ok = await saveProductToDb(article);
      if (ok) {
        successCount++;
        setCommittedArticleIds(prev => new Set(prev).add(article.id));
      }
    }

    if (onProductsAddedToGlobalCatalog && toCommit.length > 0) {
      onProductsAddedToGlobalCatalog(toCommit);
    }

    showToast(`🎉 Successfully published ${successCount} curated articles to Firestore DB!`);
    setSelectedArticleIds(new Set());
  };

  // Remove article from temporary staging
  const handleRemoveStagedArticle = (productId: string) => {
    setStagedArticles(prev => prev.filter(p => p.id !== productId));
    setSelectedArticleIds(prev => {
      const next = new Set(prev);
      next.delete(productId);
      return next;
    });
    showToast('Article removed from temporary staging.');
  };

  // Clear all temporary staging
  const handleClearStaging = () => {
    if (window.confirm('Clear all temporary staged articles?')) {
      setStagedArticles([]);
      setCommittedArticleIds(new Set());
      setSelectedArticleIds(new Set());
      localStorage.removeItem('curated_staged_articles');
      showToast('Temporary staging cleared.');
    }
  };

  // Toggle selection for batch commit
  const handleToggleSelectArticle = (productId: string) => {
    setSelectedArticleIds(prev => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  };

  const handleSelectAllStaged = () => {
    if (selectedArticleIds.size === stagedArticles.length) {
      setSelectedArticleIds(new Set());
    } else {
      setSelectedArticleIds(new Set(stagedArticles.map(a => a.id)));
    }
  };

  // Auto-tag all staged articles into matching Article Collections
  const handleAutoTagAllCollections = () => {
    if (stagedArticles.length === 0) {
      showToast('No articles in temporary staging to auto-tag.');
      return;
    }
    let matchedCount = 0;
    const collectionCounts: Record<string, number> = {};

    setStagedArticles(prev => prev.map(p => {
      const detected = detectArticleCollection(p);
      if (detected && detected !== 'General') {
        matchedCount++;
        collectionCounts[detected] = (collectionCounts[detected] || 0) + 1;
        return { ...p, articleCollection: detected };
      }
      return p;
    }));

    if (matchedCount > 0) {
      const summary = Object.entries(collectionCounts).map(([coll, count]) => `${getCollectionEmoji(coll)} ${coll}: ${count}`).join(', ');
      showToast(`✨ Auto-tagged ${matchedCount} articles! (${summary})`);
    } else {
      showToast('No articles matched taxonomy rules.');
    }
  };

  // Handle Custom Collections & Bulk Collection Assignment
  const handleCreateCustomCollection = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (!customCollections.includes(trimmed)) {
      const updated = [...customCollections, trimmed];
      setCustomCollections(updated);
      try {
        localStorage.setItem('curated_custom_collections', JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to save custom collections', e);
      }
    }
    setSelectedArticleCollectionFilter(trimmed);
    setNewCollectionInput('');
    setIsAddCollectionModalOpen(false);
    showToast(`Added collection "${trimmed}"!`);
  };

  const handleAssignCollectionToArticles = (targetColl: string) => {
    if (stagedArticles.length === 0) {
      showToast('No articles in temporary staging to update.');
      return;
    }

    const isFilteredOrSelected = selectedArticleIds.size > 0;
    const targetIds = isFilteredOrSelected ? selectedArticleIds : null;

    let updatedCount = 0;
    setStagedArticles(prev => prev.map(p => {
      if (targetIds && !targetIds.has(p.id)) return p;
      updatedCount++;
      return { ...p, articleCollection: targetColl };
    }));

    setIsAssignCollectionModalOpen(false);
    showToast(`Updated ${updatedCount} articles to collection "${targetColl}"!`);
  };

  const handleToggleSelectAllInCollection = () => {
    const visibleArticleIds = filteredArticles.map(a => a.id);
    if (visibleArticleIds.length === 0) return;

    const allSelected = visibleArticleIds.every(id => selectedArticleIds.has(id));
    if (allSelected) {
      setSelectedArticleIds(prev => {
        const next = new Set(prev);
        visibleArticleIds.forEach(id => next.delete(id));
        return next;
      });
      showToast(`Deselected ${visibleArticleIds.length} items`);
    } else {
      setSelectedArticleIds(prev => {
        const next = new Set(prev);
        visibleArticleIds.forEach(id => next.add(id));
        return next;
      });
      showToast(`Selected all ${visibleArticleIds.length} items in current view`);
    }
  };

  // 7. Extract Unique Article Collections, Brands, Genders, Categories for Hierarchy Filter
  const uniqueArticleCollections = Array.from(new Set([
    'ALL',
    'Sarees — Women',
    'Kurti — Women',
    'Formal',
    'Drips',
    'Coffee & Code',
    'General',
    ...customCollections,
    ...stagedArticles.map(a => getArticleCollection(a))
  ]));
  const uniqueBrands = Array.from(new Set(stagedArticles.map(a => a.brand || 'D2C Brand')));
  const uniqueGenders = ['ALL', 'Men', 'Women'];
  const uniqueCategories = Array.from(new Set(stagedArticles.map(a => a.category || 'Tops & Shirts')));

  // Filter Staged Articles according to Hierarchy selection
  const filteredArticles = stagedArticles.filter(article => {
    // Article Collection filter
    if (selectedArticleCollectionFilter !== 'ALL') {
      const artColl = getArticleCollection(article);
      if (artColl !== selectedArticleCollectionFilter) return false;
    }

    // Brand filter
    if (selectedBrandFilter !== 'ALL' && article.brand !== selectedBrandFilter) return false;

    // Gender filter
    if (selectedGenderFilter !== 'ALL') {
      const g = getProductGender(article);
      if (g !== selectedGenderFilter) return false;
    }

    // Category filter
    if (selectedCategoryFilter !== 'ALL' && article.category !== selectedCategoryFilter) return false;

    // Search query filter
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase();
      const nameMatch = article.name.toLowerCase().includes(q);
      const brandMatch = article.brand.toLowerCase().includes(q);
      const catMatch = article.category.toLowerCase().includes(q);
      const collMatch = (article.articleCollection || '').toLowerCase().includes(q);
      const descMatch = (article.description || '').toLowerCase().includes(q);
      const colorMatch = getProductColors(article).some(c => c.toLowerCase().includes(q));
      if (!nameMatch && !brandMatch && !catMatch && !collMatch && !descMatch && !colorMatch) return false;
    }

    return true;
  });

  return (
    <div className="w-full min-h-screen bg-slate-950 text-slate-100 p-3 sm:p-6 lg:p-8 font-sans">
      
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="fixed top-5 right-5 z-50 px-4 py-3 rounded-2xl bg-emerald-500 text-slate-950 font-mono font-bold text-xs sm:text-sm shadow-2xl flex items-center gap-2.5 border border-emerald-300"
          >
            <CheckCircle2 className="w-5 h-5 text-slate-950 shrink-0" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto space-y-6">

        {/* Studio Title Banner */}
        <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-5 sm:p-7 shadow-2xl relative overflow-hidden">
          <div className="absolute -right-16 -bottom-16 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
            <div>
              <div className="flex items-center gap-2.5 mb-1.5">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-extrabold uppercase tracking-wider">
                  Temporary Setup & Staging Workspace
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-mono font-bold">
                  Hierarchy: Brand &gt; Gender &gt; Category &gt; Item
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-white font-mono flex items-center gap-2.5">
                <Bot className="w-7 h-7 text-emerald-400" />
                Curated AI Web Crawler Studio
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
                Crawl any fashion store URL. Products are loaded into a <strong className="text-emerald-400">Temporary Staging Buffer</strong>. Review, refine details (colors, gender, images, specs), and manually curate articles before committing to the main database.
              </p>
            </div>

            {/* Quick Action Badges */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setIsManualAddModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs font-bold flex items-center gap-2 border border-slate-700 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4 text-emerald-400" />
                <span>＋ Manual Curated Article</span>
              </button>
            </div>
          </div>

          {/* Crawler URL Input Form */}
          <div className="mt-5 p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 space-y-3">
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
              <div className="flex-1 relative">
                <Globe className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  placeholder="Paste website URL (e.g. https://nobero.com, https://snitch.co.in, or direct product URL)"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 focus:border-emerald-500 text-white font-mono text-xs sm:text-sm focus:outline-none transition-all placeholder:text-slate-600"
                />
              </div>

              {/* Brand Name Field (Optional Override) */}
              <div className="w-full sm:w-48 relative shrink-0">
                <Tag className="w-3.5 h-3.5 text-indigo-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={overrideBrandName}
                  onChange={(e) => setOverrideBrandName(e.target.value)}
                  placeholder="Brand Name (e.g. Snitch)"
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-indigo-500/40 focus:border-indigo-400 text-indigo-200 font-mono text-xs focus:outline-none transition-all placeholder:text-slate-500"
                />
              </div>

              {/* Gender Preference Selector */}
              <div className="flex items-center gap-1.5 shrink-0 bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1">
                <span className="text-[11px] font-mono text-slate-400 font-semibold">Gender:</span>
                {(['Auto', 'Men', 'Women'] as const).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setDefaultGender(g)}
                    className={`px-2 py-1 rounded-lg font-mono text-[11px] font-bold transition-all ${
                      defaultGender === g
                        ? 'bg-emerald-500 text-slate-950'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>

              {/* Target Collection Selector */}
              <div className="flex items-center gap-1.5 shrink-0 bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1">
                <span className="text-[11px] font-mono text-amber-400 font-semibold">Collection:</span>
                <select
                  value={targetArticleCollection}
                  onChange={(e) => setTargetArticleCollection(e.target.value)}
                  className="bg-slate-950 text-amber-300 font-mono text-xs font-bold py-1 px-2 rounded-lg border border-amber-500/30 focus:outline-none cursor-pointer"
                >
                  <option value="Auto-Detect">✨ Auto-Detect</option>
                  <option value="Sarees — Women">🥻 Sarees — Women</option>
                  <option value="Kurti — Women">💃 Kurti — Women</option>
                  <option value="Formal">💼 Formal</option>
                  <option value="Drips">🔥 Drips</option>
                  <option value="Coffee & Code">☕ Coffee & Code</option>
                </select>
              </div>

              {/* Crawl Trigger Button */}
              <button
                onClick={() => handleStartCrawl()}
                disabled={isCrawling}
                className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 transition-all cursor-pointer disabled:opacity-50 shrink-0"
              >
                {isCrawling ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Crawling Store...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    <span>⚡ AI Crawl to Staging</span>
                  </>
                )}
              </button>
            </div>

            {/* Quick Presets */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-mono text-slate-400">
              <span className="text-slate-500 shrink-0">Quick Presets:</span>
              {presetStores.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => {
                    setTargetUrl(preset.url);
                    setOverrideBrandName(preset.name);
                    handleStartCrawl(preset.url, preset.name);
                  }}
                  disabled={isCrawling}
                  className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-[11px] hover:border-emerald-500/50 transition-colors shrink-0 cursor-pointer"
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          {/* Crawl Logs Stream */}
          {crawlProgressLog.length > 0 && (
            <div className="mt-3 p-3 rounded-xl bg-slate-950 font-mono text-[11px] text-emerald-400/90 border border-slate-800 max-h-28 overflow-y-auto space-y-1">
              {crawlProgressLog.map((log, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-slate-600">&gt;</span>
                  <span>{log}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* TEMPORARY STAGING CONTROL BAR */}
        <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0 text-emerald-400 font-extrabold text-lg">
              📦
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white font-mono">
                  Temporary Staging Buffer ({stagedArticles.length} Draft Articles)
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Uncommitted Draft Setup
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Items below exist only in temporary setup. Curate details & click <strong className="text-emerald-400">"＋ Add Article to DB"</strong> to save to Firestore.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
            {/* Select All */}
            {stagedArticles.length > 0 && (
              <button
                onClick={handleSelectAllStaged}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs flex items-center gap-1.5 border border-slate-700 transition-colors cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
                <span>
                  {selectedArticleIds.size === stagedArticles.length ? 'Deselect All' : 'Select All'}
                </span>
              </button>
            )}

            {/* Change / Save Brand Name */}
            {stagedArticles.length > 0 && (
              <button
                onClick={() => {
                  const initialName = selectedArticleIds.size > 0
                    ? stagedArticles.find(a => selectedArticleIds.has(a.id))?.brand || ''
                    : (selectedBrandFilter !== 'ALL' ? selectedBrandFilter : (stagedArticles[0]?.brand || ''));
                  setNewBulkBrandName(initialName);
                  setIsBrandModalOpen(true);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-indigo-600/30 hover:bg-indigo-600 text-indigo-200 hover:text-white font-mono text-xs font-bold flex items-center gap-1.5 border border-indigo-500/40 transition-all cursor-pointer shadow-sm"
              >
                <Tag className="w-3.5 h-3.5 text-indigo-400" />
                <span>🏷️ Save/Change Brand Name</span>
              </button>
            )}

            {/* Auto-Tag All Collections */}
            {stagedArticles.length > 0 && (
              <button
                onClick={handleAutoTagAllCollections}
                className="px-3.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 font-mono text-xs font-bold flex items-center gap-1.5 border border-amber-500/40 transition-all cursor-pointer shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>✨ Auto-Tag Collections</span>
              </button>
            )}

            {/* Gemini AI Auto-Classify */}
            {stagedArticles.length > 0 && (
              <button
                onClick={handleGeminiAutoClassify}
                disabled={isClassifyingGemini}
                className="px-3.5 py-1.5 rounded-xl bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white font-mono text-xs font-bold flex items-center gap-1.5 border border-indigo-500/40 transition-all cursor-pointer disabled:opacity-50"
              >
                <Sparkles className={`w-3.5 h-3.5 text-indigo-400 ${isClassifyingGemini ? 'animate-spin' : ''}`} />
                <span>{isClassifyingGemini ? 'Classifying...' : 'Gemini AI Auto-Classify'}</span>
              </button>
            )}

            {/* Commit Selected Batch */}
            {selectedArticleIds.size > 0 && (
              <button
                onClick={handleCommitSelectedArticlesToDb}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono font-extrabold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
              >
                <Database className="w-3.5 h-3.5" />
                <span>Publish Selected ({selectedArticleIds.size}) to DB</span>
              </button>
            )}

            {/* Clear Staging */}
            {stagedArticles.length > 0 && (
              <button
                onClick={handleClearStaging}
                className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-600 text-rose-300 hover:text-white font-mono text-xs flex items-center gap-1.5 border border-rose-500/30 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Staging</span>
              </button>
            )}
          </div>
        </div>

        {/* HIERARCHICAL COLLECTION BROWSER: Collection >> Brand >> Gender >> Category >> Item */}
        <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 space-y-4 shadow-xl">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2 font-mono text-xs font-extrabold text-emerald-400 uppercase tracking-wider">
              <Filter className="w-4 h-4 text-emerald-400" />
              <span>Hierarchical Curator: Collection ➔ Brand ➔ Gender ➔ Category ➔ Item</span>
            </div>

            {/* Search Input */}
            <div className="w-full lg:w-72 relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search draft items by color, brand, or name..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500 text-white font-mono text-xs focus:outline-none placeholder:text-slate-600"
              />
            </div>
          </div>

          {/* Level 0: Article Collection Tabs */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span>0. Article Collection:</span>
              </div>

              {/* Action Buttons: Add Collection, Assign All to Collection, Select All */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddCollectionModalOpen(true)}
                  className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 border border-amber-500/40 text-[11px] font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-amber-400 hover:text-slate-950" />
                  <span>+ New Collection</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsAssignCollectionModalOpen(true)}
                  className="px-2.5 py-1 rounded-lg bg-indigo-500/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/40 text-[11px] font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                >
                  <Tag className="w-3.5 h-3.5 text-indigo-400" />
                  <span>
                    {selectedArticleIds.size > 0
                      ? `Assign ${selectedArticleIds.size} Selected to Collection`
                      : `Assign All (${stagedArticles.length}) to Collection`}
                  </span>
                </button>

                {filteredArticles.length > 0 && (
                  <button
                    type="button"
                    onClick={handleToggleSelectAllInCollection}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-[11px] font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
                    <span>
                      {filteredArticles.every(a => selectedArticleIds.has(a.id))
                        ? `Deselect All (${filteredArticles.length})`
                        : `Select All (${filteredArticles.length})`}
                    </span>
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {uniqueArticleCollections.map(coll => {
                const count = coll === 'ALL'
                  ? stagedArticles.length
                  : stagedArticles.filter(a => getArticleCollection(a) === coll).length;
                return (
                  <button
                    key={coll}
                    onClick={() => setSelectedArticleCollectionFilter(coll)}
                    className={`px-3 py-1 rounded-xl font-mono text-xs font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
                      selectedArticleCollectionFilter === coll
                        ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                        : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    <span>{getCollectionEmoji(coll)}</span>
                    <span>{coll === 'ALL' ? 'All Collections' : coll}</span>
                    <span className="text-[10px] opacity-80">({count})</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Level 1: Brand Tabs */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>1. Brand Selection:</span>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <button
                onClick={() => setSelectedBrandFilter('ALL')}
                className={`px-3 py-1 rounded-xl font-mono text-xs font-bold shrink-0 transition-all cursor-pointer ${
                  selectedBrandFilter === 'ALL'
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                All Brands ({stagedArticles.length})
              </button>
              {uniqueBrands.map(b => {
                const count = stagedArticles.filter(a => a.brand === b).length;
                return (
                  <button
                    key={b}
                    onClick={() => setSelectedBrandFilter(b)}
                    className={`px-3 py-1 rounded-xl font-mono text-xs font-bold shrink-0 transition-all cursor-pointer ${
                      selectedBrandFilter === b
                        ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                        : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    {b} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Level 2: Gender Tabs */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-400" />
              <span>2. Gender Target:</span>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {uniqueGenders.map(g => {
                const count = g === 'ALL' 
                  ? stagedArticles.length 
                  : stagedArticles.filter(a => getProductGender(a) === g).length;
                return (
                  <button
                    key={g}
                    onClick={() => setSelectedGenderFilter(g)}
                    className={`px-3 py-1 rounded-xl font-mono text-xs font-bold shrink-0 transition-all cursor-pointer ${
                      selectedGenderFilter === g
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                        : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    {g === 'ALL' ? 'All Genders' : g} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Level 3: Category Tabs */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>3. Product Category:</span>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <button
                onClick={() => setSelectedCategoryFilter('ALL')}
                className={`px-3 py-1 rounded-xl font-mono text-xs font-bold shrink-0 transition-all cursor-pointer ${
                  selectedCategoryFilter === 'ALL'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                All Categories ({stagedArticles.length})
              </button>
              {uniqueCategories.map(cat => {
                const count = stagedArticles.filter(a => a.category === cat).length;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategoryFilter(cat)}
                    className={`px-3 py-1 rounded-xl font-mono text-xs font-bold shrink-0 transition-all cursor-pointer ${
                      selectedCategoryFilter === cat
                        ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                        : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    {cat} ({count})
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ARTICLES GRID VIEW */}
        {filteredArticles.length === 0 ? (
          <div className="rounded-3xl bg-slate-900/60 border border-slate-800 p-12 text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-slate-500">
              <PackageCheck className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-white font-mono">No Staged Articles Found</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Paste a website URL above and click <strong className="text-emerald-400">"⚡ AI Crawl to Staging"</strong> to extract products into this temporary staging setup, or clear your filters.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
            {filteredArticles.map((article) => {
              const colors = getProductColors(article);
              const gender = getProductGender(article);
              const isCommitted = committedArticleIds.has(article.id);
              const isSelected = selectedArticleIds.has(article.id);
              const currentImgIdx = activeImageMap[article.id] || 0;
              const imagesList = article.images && article.images.length > 0 ? article.images : ['https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=800'];

              return (
                <div
                  key={article.id}
                  className={`rounded-2xl bg-slate-900 border transition-all duration-300 flex flex-col justify-between overflow-hidden group relative ${
                    isSelected
                      ? 'border-emerald-500 ring-2 ring-emerald-500/30 shadow-xl shadow-emerald-950/30'
                      : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* Card Header Media & Badges */}
                  <div className="relative aspect-[4/5] bg-slate-950 overflow-hidden group">
                    <img
                      src={imagesList[currentImgIdx]}
                      alt={article.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />

                    {/* Batch Selection Checkbox */}
                    <button
                      onClick={() => handleToggleSelectArticle(article.id)}
                      className={`absolute top-2.5 left-2.5 z-10 w-6 h-6 rounded-lg flex items-center justify-center border shadow-md transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                          : 'bg-slate-900/80 border-slate-700 text-slate-400 hover:text-white'
                      }`}
                    >
                      {isSelected ? <Check className="w-4 h-4 stroke-[3]" /> : null}
                    </button>

                    {/* Image Carousel Controls */}
                    {imagesList.length > 1 && (
                      <div className="absolute inset-x-2 bottom-2.5 z-10 flex items-center justify-between pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveImageMap(prev => ({
                              ...prev,
                              [article.id]: (currentImgIdx - 1 + imagesList.length) % imagesList.length
                            }));
                          }}
                          className="p-1 rounded-lg bg-slate-900/80 hover:bg-slate-900 text-white pointer-events-auto backdrop-blur-md cursor-pointer"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="px-2 py-0.5 rounded-md bg-black/70 text-[10px] font-mono text-white pointer-events-auto backdrop-blur-md">
                          {currentImgIdx + 1} / {imagesList.length}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveImageMap(prev => ({
                              ...prev,
                              [article.id]: (currentImgIdx + 1) % imagesList.length
                            }));
                          }}
                          className="p-1 rounded-lg bg-slate-900/80 hover:bg-slate-900 text-white pointer-events-auto backdrop-blur-md cursor-pointer"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    {/* Top Right Status Badge */}
                    <div className="absolute top-2.5 right-2.5 z-10 flex flex-col items-end gap-1">
                      {isCommitted ? (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-extrabold bg-emerald-500 text-slate-950 border border-emerald-300 shadow-md flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Published to DB</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-amber-500/30 text-amber-300 border border-amber-500/40 backdrop-blur-md">
                          Draft Staged
                        </span>
                      )}
                    </div>

                    {/* Bottom Gender & Category Pills */}
                    <div className="absolute bottom-2.5 left-2.5 z-10 flex items-center gap-1.5 flex-wrap">
                      {/* Gender Selector Pill */}
                      <select
                        value={gender}
                        onChange={(e) => handleUpdateProductGender(article.id, e.target.value as any)}
                        className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-900/90 text-indigo-300 border border-indigo-500/40 cursor-pointer backdrop-blur-md focus:outline-none"
                      >
                        <option value="Men">Men</option>
                        <option value="Women">Women</option>
                      </select>

                      {/* Category Selector Pill */}
                      <select
                        value={article.category}
                        onChange={(e) => handleUpdateProductCategory(article.id, e.target.value)}
                        className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-900/90 text-amber-300 border border-amber-500/40 cursor-pointer backdrop-blur-md focus:outline-none max-w-[130px] truncate"
                      >
                        {categoriesList.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Card Content & Details */}
                  <div className="p-3.5 space-y-2.5 flex-1 flex flex-col justify-between">
                    <div>
                      {/* Collection & Brand Tag */}
                      <div className="flex items-center justify-between gap-1 text-[10px] font-mono font-black uppercase tracking-wider mb-1">
                        <span className="text-emerald-400 truncate">{article.brand}</span>
                        <span className="px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] shrink-0 font-bold flex items-center gap-1">
                          <span>{getCollectionEmoji(getArticleCollection(article))}</span>
                          <span>{getArticleCollection(article)}</span>
                        </span>
                      </div>

                      {/* Title */}
                      <h4 className="text-xs sm:text-sm font-bold text-white line-clamp-2 mt-0.5">
                        {article.name}
                      </h4>

                      {/* Color Swatches / Badges */}
                      <div className="flex items-center gap-1 flex-wrap mt-2">
                        <Palette className="w-3 h-3 text-slate-500 shrink-0" />
                        {colors.slice(0, 3).map((col, idx) => (
                          <span
                            key={idx}
                            className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-slate-800 text-slate-300 border border-slate-700"
                          >
                            {col}
                          </span>
                        ))}
                        {colors.length > 3 && (
                          <span className="text-[9px] font-mono text-slate-500">+{colors.length - 3}</span>
                        )}
                      </div>

                      {/* Price Box */}
                      <div className="flex items-baseline gap-2 mt-2 font-mono">
                        <span className="text-sm font-black text-white">₹{article.directPrice}</span>
                        {article.marketplacePrice > article.directPrice && (
                          <span className="text-xs text-slate-500 line-through">₹{article.marketplacePrice}</span>
                        )}
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="pt-2 border-t border-slate-800 space-y-1.5">
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          onClick={() => setEditingArticle(article)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-[11px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                        >
                          <Pencil className="w-3 h-3 text-amber-400" />
                          <span>Curate</span>
                        </button>

                        <button
                          onClick={() => handleRemoveStagedArticle(article.id)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/50 text-slate-400 hover:text-rose-300 font-mono text-[11px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3 text-rose-400" />
                          <span>Remove</span>
                        </button>
                      </div>

                      {/* Primary Commit to DB Button */}
                      <button
                        onClick={() => handleCommitSingleArticleToDb(article)}
                        disabled={isCommitted}
                        className={`w-full py-2 rounded-xl font-mono text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          isCommitted
                            ? 'bg-slate-800 text-emerald-400 border border-emerald-500/30'
                            : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20'
                        }`}
                      >
                        {isCommitted ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Saved in Database</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            <span>＋ Add Article to DB</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* CURATOR ARTICLE EDITOR MODAL */}
      <AnimatePresence>
        {editingArticle && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-2xl space-y-5 my-auto max-h-[90vh] overflow-y-auto"
            >
              <button
                onClick={() => setEditingArticle(null)}
                className="absolute top-4 right-4 p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <Pencil className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white font-mono">Curate Article Details</h3>
                  <p className="text-xs text-slate-400">Refine Brand, Gender, Category, Colors, Pricing, and Media before committing to DB.</p>
                </div>
              </div>

              <div className="space-y-4 text-xs font-mono">
                {/* Articles Collection & Product Name Row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-slate-400 mb-1 block">Articles Collection:</label>
                    <input
                      type="text"
                      list="articles-collections-list"
                      value={editingArticle.articleCollection || 'Coffee & Code'}
                      onChange={(e) => setEditingArticle({ ...editingArticle, articleCollection: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-amber-500/50 text-amber-300 focus:border-amber-400 focus:outline-none font-bold"
                    />
                    <datalist id="articles-collections-list">
                      {articleCollectionsList.map(ac => (
                        <option key={ac} value={ac} />
                      ))}
                    </datalist>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-slate-400 mb-1 block">Product Title / Name:</label>
                    <input
                      type="text"
                      value={editingArticle.name}
                      onChange={(e) => setEditingArticle({ ...editingArticle, name: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Brand & Gender Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-400 mb-1 block">Brand Name:</label>
                    <input
                      type="text"
                      value={editingArticle.brand}
                      onChange={(e) => setEditingArticle({ ...editingArticle, brand: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 mb-1 block">Target Gender:</label>
                    <select
                      value={getProductGender(editingArticle)}
                      onChange={(e) => {
                        const newGender = e.target.value as 'Men' | 'Women';
                        const specs = editingArticle.specs ? [...editingArticle.specs] : [];
                        const idx = specs.findIndex(s => s.label.toLowerCase().includes('gender'));
                        if (idx >= 0) specs[idx] = { label: 'Gender', value: newGender };
                        else specs.push({ label: 'Gender', value: newGender });
                        setEditingArticle({ ...editingArticle, specs });
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:border-emerald-500 focus:outline-none"
                    >
                      <option value="Men">Men</option>
                      <option value="Women">Women</option>
                    </select>
                  </div>
                </div>

                {/* Category & Price Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-400 mb-1 block">Category:</label>
                    <select
                      value={editingArticle.category}
                      onChange={(e) => setEditingArticle({ ...editingArticle, category: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:border-emerald-500 focus:outline-none"
                    >
                      {categoriesList.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-400 mb-1 block">Direct Buy Price (₹):</label>
                    <input
                      type="number"
                      value={editingArticle.directPrice}
                      onChange={(e) => setEditingArticle({ ...editingArticle, directPrice: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Color Swatches Input */}
                <div>
                  <label className="text-slate-400 mb-1 block">Product Colors (Comma Separated):</label>
                  <input
                    type="text"
                    value={getProductColors(editingArticle).join(', ')}
                    onChange={(e) => {
                      const colorsVal = e.target.value;
                      const specs = editingArticle.specs ? [...editingArticle.specs] : [];
                      const idx = specs.findIndex(s => s.label.toLowerCase().includes('color'));
                      if (idx >= 0) specs[idx] = { label: 'Colors', value: colorsVal };
                      else specs.push({ label: 'Colors', value: colorsVal });
                      setEditingArticle({ ...editingArticle, specs });
                    }}
                    placeholder="e.g. Olive Green, Onyx Black, Chalk White"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                {/* Hero Image URL */}
                <div>
                  <label className="text-slate-400 mb-1 block">Primary Hero Image URL:</label>
                  <input
                    type="text"
                    value={editingArticle.images?.[0] || ''}
                    onChange={(e) => {
                      const newImgs = [...(editingArticle.images || [])];
                      newImgs[0] = e.target.value;
                      setEditingArticle({ ...editingArticle, images: newImgs });
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                {/* Official Direct Link */}
                <div>
                  <label className="text-slate-400 mb-1 block">Official Checkout Product URL:</label>
                  <input
                    type="text"
                    value={editingArticle.officialUrl}
                    onChange={(e) => setEditingArticle({ ...editingArticle, officialUrl: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="text-slate-400 mb-1 block">Description & Details:</label>
                  <textarea
                    rows={3}
                    value={editingArticle.description}
                    onChange={(e) => setEditingArticle({ ...editingArticle, description: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  onClick={() => {
                    // Update in staged list
                    setStagedArticles(prev => prev.map(p => p.id === editingArticle.id ? editingArticle : p));
                    setEditingArticle(null);
                    showToast('Draft changes saved in temporary staging.');
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs font-bold cursor-pointer transition-colors"
                >
                  Save Draft Changes
                </button>

                <button
                  onClick={async () => {
                    setStagedArticles(prev => prev.map(p => p.id === editingArticle.id ? editingArticle : p));
                    await handleCommitSingleArticleToDb(editingArticle);
                    setEditingArticle(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono font-black text-xs cursor-pointer shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-1.5"
                >
                  <Database className="w-4 h-4" />
                  <span>Save & Publish Article to DB</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MANUAL ARTICLE CREATION MODAL */}
      <AnimatePresence>
        {isManualAddModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-2xl space-y-4 my-auto"
            >
              <button
                onClick={() => setIsManualAddModalOpen(false)}
                className="absolute top-4 right-4 p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white font-mono">Create Curated Article Manually</h3>
                  <p className="text-xs text-slate-400">Add a custom product article into temporary staging for curation.</p>
                </div>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = e.currentTarget;
                  const collection = (form.elements.namedItem('artCollection') as HTMLInputElement).value || 'Coffee & Code';
                  const name = (form.elements.namedItem('artName') as HTMLInputElement).value;
                  const brand = (form.elements.namedItem('artBrand') as HTMLInputElement).value;
                  const gender = (form.elements.namedItem('artGender') as HTMLSelectElement).value;
                  const category = (form.elements.namedItem('artCategory') as HTMLSelectElement).value;
                  const colors = (form.elements.namedItem('artColors') as HTMLInputElement).value;
                  const price = parseFloat((form.elements.namedItem('artPrice') as HTMLInputElement).value) || 1299;
                  const img = (form.elements.namedItem('artImg') as HTMLInputElement).value || 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=800';
                  const url = (form.elements.namedItem('artUrl') as HTMLInputElement).value || 'https://nobero.com';

                  const newArticle: Product = {
                    id: `curated_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                    name,
                    brand,
                    category,
                    articleCollection: collection,
                    directPrice: price,
                    marketplacePrice: Math.round(price * 1.3),
                    marketplaceName: `${brand} Direct Store`,
                    images: [img],
                    specs: [
                      { label: 'Gender', value: gender },
                      { label: 'Colors', value: colors || 'Standard' },
                      { label: 'Fabric', value: '100% Premium Cotton' }
                    ],
                    stockLeft: 10,
                    rating: 4.8,
                    reviewsCount: 42,
                    trendingScore: 95,
                    officialUrl: url,
                    description: `Curated ${name} from ${brand}.`
                  };

                  setStagedArticles(prev => [newArticle, ...prev]);
                  setIsManualAddModalOpen(false);
                  showToast(`Added "${name}" to Temporary Staging!`);
                }}
                className="space-y-3 font-mono text-xs"
              >
                <div>
                  <label className="text-amber-400 mb-1 block font-bold">Articles Collection *:</label>
                  <input name="artCollection" defaultValue="Coffee & Code" required type="text" placeholder="e.g. Coffee & Code" className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-amber-500/50 text-amber-300 font-bold focus:outline-none focus:border-amber-400" />
                </div>

                <div>
                  <label className="text-slate-400 mb-1 block">Article Title *:</label>
                  <input name="artName" required type="text" placeholder="e.g. Oversized Linen Blend Shirt" className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-indigo-500" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-400 mb-1 block">Brand Name *:</label>
                    <input name="artBrand" required type="text" placeholder="e.g. Snitch / Zara" className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="text-slate-400 mb-1 block">Gender *:</label>
                    <select name="artGender" className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-indigo-500">
                      <option value="Men">Men</option>
                      <option value="Women">Women</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-400 mb-1 block">Category *:</label>
                    <select name="artCategory" className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-indigo-500">
                      {categoriesList.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-400 mb-1 block">Price (₹) *:</label>
                    <input name="artPrice" required type="number" defaultValue="1499" className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-indigo-500" />
                  </div>
                </div>

                <div>
                  <label className="text-slate-400 mb-1 block">Colors (Comma separated):</label>
                  <input name="artColors" type="text" placeholder="e.g. Olive, Black, Beige" className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-indigo-500" />
                </div>

                <div>
                  <label className="text-slate-400 mb-1 block">Hero Image URL:</label>
                  <input name="artImg" type="text" placeholder="https://..." className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-indigo-500" />
                </div>

                <div>
                  <label className="text-slate-400 mb-1 block">Product URL:</label>
                  <input name="artUrl" type="text" placeholder="https://..." className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-indigo-500" />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsManualAddModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white font-mono text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-mono font-bold text-xs cursor-pointer shadow-lg shadow-indigo-600/20"
                  >
                    ＋ Add to Staging
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* BULK BRAND NAME SAVE / CHANGE MODAL */}
      <AnimatePresence>
        {isBrandModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-indigo-500/30 rounded-3xl p-6 max-w-md w-full shadow-2xl relative space-y-4"
            >
              <button
                onClick={() => setIsBrandModalOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 shrink-0">
                  <Tag className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white font-mono">Save or Change Brand Name</h3>
                  <p className="text-xs text-slate-400">
                    {selectedArticleIds.size > 0
                      ? `Updating brand name for ${selectedArticleIds.size} selected articles.`
                      : `Updating brand name across all ${stagedArticles.length} staged articles.`}
                  </p>
                </div>
              </div>

              <div className="space-y-3 font-mono text-xs">
                <div>
                  <label className="text-slate-300 mb-1.5 block font-bold">New Brand / Merchant Name *</label>
                  <input
                    type="text"
                    value={newBulkBrandName}
                    onChange={(e) => setNewBulkBrandName(e.target.value)}
                    placeholder="e.g. Snitch, Nobero, Overlays, Zara..."
                    autoFocus
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-indigo-500/50 text-white font-bold text-sm focus:outline-none focus:border-indigo-400"
                  />
                </div>

                <div>
                  <span className="text-[11px] text-slate-500 block mb-1.5 font-semibold">Quick Brand Suggestions:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {['Snitch', 'Nobero', 'Zara', 'Veirdo', 'Zudio', 'Powerlook', 'Overlays', 'H&M', 'Minimalist'].map(bName => (
                      <button
                        key={bName}
                        type="button"
                        onClick={() => setNewBulkBrandName(bName)}
                        className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-indigo-900/40 text-slate-300 hover:text-indigo-200 border border-slate-800 hover:border-indigo-500/40 text-[11px] transition-colors cursor-pointer"
                      >
                        {bName}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-3 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsBrandModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white font-mono text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyBrandName(newBulkBrandName)}
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-mono font-bold text-xs cursor-pointer shadow-lg shadow-indigo-600/20"
                  >
                    Save Brand Name
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CREATE NEW CUSTOM COLLECTION MODAL */}
      <AnimatePresence>
        {isAddCollectionModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-amber-500/30 rounded-3xl p-6 max-w-md w-full shadow-2xl relative space-y-4"
            >
              <button
                onClick={() => setIsAddCollectionModalOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
                  <FolderPlus className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white font-mono">Create New Article Collection</h3>
                  <p className="text-xs text-slate-400">Add a custom collection tag to organize curated products.</p>
                </div>
              </div>

              <div className="space-y-3 font-mono text-xs">
                <div>
                  <label className="text-slate-300 mb-1.5 block font-bold">Collection Name *</label>
                  <input
                    type="text"
                    value={newCollectionInput}
                    onChange={(e) => setNewCollectionInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleCreateCustomCollection(newCollectionInput);
                      }
                    }}
                    placeholder="e.g. Partywear, Ethnic Co-ords, Activewear..."
                    autoFocus
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-amber-500/50 text-white font-bold text-sm focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <span className="text-[11px] text-slate-500 block mb-1.5 font-semibold">Quick Collection Suggestions:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      'Sarees — Women',
                      'Kurti — Women',
                      'Formal',
                      'Drips',
                      'Coffee & Code',
                      'Party & Festive',
                      'Ethnic Co-ords',
                      'Minimalist Essentials',
                      'Summer Casuals',
                      'Footwear'
                    ].map(cName => (
                      <button
                        key={cName}
                        type="button"
                        onClick={() => setNewCollectionInput(cName)}
                        className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-amber-900/40 text-slate-300 hover:text-amber-200 border border-slate-800 hover:border-amber-500/40 text-[11px] transition-colors cursor-pointer"
                      >
                        {getCollectionEmoji(cName)} {cName}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-3 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddCollectionModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white font-mono text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCreateCustomCollection(newCollectionInput)}
                    className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono font-bold text-xs cursor-pointer shadow-lg shadow-amber-500/20"
                  >
                    Add Collection
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* BULK ASSIGN COLLECTION TO ALL STAGED / SELECTED ARTICLES MODAL */}
      <AnimatePresence>
        {isAssignCollectionModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-indigo-500/30 rounded-3xl p-6 max-w-lg w-full shadow-2xl relative space-y-4"
            >
              <button
                onClick={() => setIsAssignCollectionModalOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 shrink-0">
                  <Tag className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white font-mono">Assign Collection to Articles</h3>
                  <p className="text-xs text-amber-300 font-mono">
                    {selectedArticleIds.size > 0
                      ? `Assigning collection to ${selectedArticleIds.size} selected articles.`
                      : `Assigning collection to all ${stagedArticles.length} staged articles.`}
                  </p>
                </div>
              </div>

              <div className="space-y-3 font-mono text-xs">
                <div>
                  <span className="text-[11px] text-slate-400 block mb-2 font-bold uppercase tracking-wider">Select Collection to Apply:</span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-60 overflow-y-auto pr-1">
                    {uniqueArticleCollections.filter(c => c !== 'ALL').map(coll => (
                      <button
                        key={coll}
                        type="button"
                        onClick={() => handleAssignCollectionToArticles(coll)}
                        className="p-3 rounded-xl bg-slate-950 hover:bg-amber-500 text-slate-300 hover:text-slate-950 border border-slate-800 hover:border-amber-400 font-mono text-xs font-bold flex items-center gap-2 transition-all cursor-pointer text-left shadow-sm"
                      >
                        <span className="text-base">{getCollectionEmoji(coll)}</span>
                        <span className="truncate">{coll}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2">
                  <span className="text-[11px] text-slate-400 block mb-1 font-bold">Or Type Custom Collection Name:</span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. Winter Overcoats"
                      id="customAssignInput"
                      className="flex-1 px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-amber-400"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const val = (document.getElementById('customAssignInput') as HTMLInputElement)?.value;
                        if (val) handleAssignCollectionToArticles(val);
                      }}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-mono font-bold text-xs cursor-pointer"
                    >
                      Apply
                    </button>
                  </div>
                </div>

                <div className="pt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setIsAssignCollectionModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white font-mono text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};
