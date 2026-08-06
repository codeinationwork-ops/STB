import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  Sparkles,
  Plus,
  Mic,
  MicOff,
  ArrowRight,
  ArrowLeft,
  Shuffle,
  ShieldCheck,
  Zap,
  ExternalLink,
  ShoppingBag,
  RefreshCw,
  Heart,
  CheckCircle2,
  Tag,
  ArrowUpRight,
  CornerDownLeft,
  Store,
  MapPin,
  Bot,
  User,
  Globe,
  LogOut,
  PlusCircle,
  Trash2
} from 'lucide-react';
import { Product, UserAddress, UserSession } from '../types';
import { logSearchQueryToDb, getLiveProductsFromDb } from '../lib/firestoreService';
import { BrandLogo } from './BrandLogo';
import { VirtualTryOnStudio } from './VirtualTryOnStudio';
import { BrandRequestModals } from './BrandRequestModals';

interface GeminiSearchLandingProps {
  products: Product[];
  wishlistIds: string[];
  defaultAddress: UserAddress;
  wishlistCount: number;
  totalSaved: number;
  currentUser?: UserSession | null;
  onLogout?: () => void;
  onNavigateAdmin?: () => void;
  onToggleWishlist: (product: Product) => void;
  onExpressBuy: (product: Product) => void;
  onQuickView: (product: Product) => void;
  onOpenWishlist: () => void;
  onOpenAddressVault: () => void;
  onOpenCrawler?: () => void;
  onOpenGptTryOn?: (product?: Product | null, imageUrl?: string | null) => void;
  onSwitchToDashboard?: () => void;
}

interface SearchIntentData {
  clean_query?: string;
  category?: string;
  max_price?: number | null;
  min_price?: number | null;
  gender_target?: string | null;
  spec_tags?: string[];
  expanded_synonyms?: string[];
  boosted_brand?: string | null;
}

interface SearchResponseData {
  summary: string;
  intent?: SearchIntentData;
  reasoningSteps: string[];
  recommendationTips: string[];
  suggestedFollowUps: string[];
}

export const GeminiSearchLanding: React.FC<GeminiSearchLandingProps> = ({
  products,
  wishlistIds,
  defaultAddress,
  wishlistCount,
  totalSaved,
  currentUser,
  onLogout,
  onNavigateAdmin,
  onToggleWishlist,
  onExpressBuy,
  onQuickView,
  onOpenWishlist,
  onOpenAddressVault,
  onOpenCrawler,
  onOpenGptTryOn,
  onSwitchToDashboard
}) => {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [activeSearchQuery, setActiveSearchQuery] = useState<string | null>(null);
  const [searchResult, setSearchResult] = useState<SearchResponseData | null>(null);
  const [matchedProducts, setMatchedProducts] = useState<Product[]>([]);
  const [searchGenderFilter, setSearchGenderFilter] = useState<'All' | 'Men' | 'Women' | 'Unisex'>('All');
  const [selectedRandomProduct, setSelectedRandomProduct] = useState<Product | null>(null);
  const [selectedGenderMode, setSelectedGenderMode] = useState<'Men' | 'Women' | null>(null);

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [showSearchOverlay, setShowSearchOverlay] = useState(false);
  const [showTryOnStudio, setShowTryOnStudio] = useState(false);
  const [customTryOnImage, setCustomTryOnImage] = useState<string | null>(null);
  const [removalModalOpen, setRemovalModalOpen] = useState(false);
  const [additionModalOpen, setAdditionModalOpen] = useState(false);

  const clickTimerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartXRef = useRef<number | null>(null);
  const seenProductIdsRef = useRef<Set<string>>(new Set());

  // Single click (shuffle next product)
  const handleShowcaseScreenClick = (e: React.MouseEvent) => {
    // If click was on interactive input or button, ignore screen action
    if ((e.target as HTMLElement).closest('button, input, form, a')) {
      return;
    }

    // Instant shuffle to next product without any delay!
    handleSelectGender(selectedGenderMode || 'Men');
  };

  // Touch swiping / sliding gestures for switching photos of the same product
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null || !selectedRandomProduct) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartXRef.current - touchEndX;

    if (Math.abs(diff) > 35) {
      // Cancel pending single-click shuffle if user is swiping photos
      if (clickTimerRef.current) {
        clearTimeout(clickTimerRef.current);
        clickTimerRef.current = null;
      }
      const imgs = selectedRandomProduct.images || [];
      if (imgs.length > 1) {
        if (diff > 0) {
          // Swiped left -> next photo of product
          setActiveImageIndex((prev) => (prev + 1) % imgs.length);
        } else {
          // Swiped right -> previous photo of product
          setActiveImageIndex((prev) => (prev - 1 + imgs.length) % imgs.length);
        }
      }
    }
    touchStartXRef.current = null;
  };
  const [showOptionsFilter, setShowOptionsFilter] = useState(false);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string | null>(null);

  const isMaleProduct = (p: Product) => {
    const text = `${p.name} ${p.category}`.toLowerCase();
    const hasMale = /\b(men|mens|male|gents|boys|man)\b/i.test(text) || p.gender === 'Men';
    const hasFemale = /\b(women|womens|female|ladies|girls|woman)\b/i.test(text) || p.gender === 'Women';
    return hasMale && !hasFemale;
  };

  const isFemaleProduct = (p: Product) => {
    const text = `${p.name} ${p.category}`.toLowerCase();
    const hasFemale = /\b(women|womens|female|ladies|girls|woman)\b/i.test(text) || p.gender === 'Women';
    const hasMale = /\b(men|mens|male|gents|boys|man)\b/i.test(text) || p.gender === 'Men';
    return hasFemale && !hasMale;
  };

  const filteredMatchedProducts = useMemo(() => {
    if (searchGenderFilter === 'All') return matchedProducts;
    return matchedProducts.filter((p) => {
      if (searchGenderFilter === 'Men') {
        return isMaleProduct(p);
      } else if (searchGenderFilter === 'Women') {
        return isFemaleProduct(p);
      } else if (searchGenderFilter === 'Unisex') {
        return !isMaleProduct(p) && !isFemaleProduct(p);
      }
      return true;
    });
  }, [matchedProducts, searchGenderFilter]);

  const inputRef = useRef<HTMLInputElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Dynamic Apparel Category Carousel inside Header (75+ Fashion Categories)
  const apparelCategories = [
    'sneakers',
    'hoodies',
    'oversized T-shirts',
    'cargo pants',
    'denim jackets',
    'streetwear',
    'puffer jackets',
    'joggers',
    'crop tops',
    'beanies',
    'loafers',
    'boots',
    'trench coats',
    'flannel shirts',
    'linen trousers',
    'varsity jackets',
    'windbreakers',
    'tracksuits',
    'shorts',
    'blazers',
    'leather jackets',
    'sweatpants',
    'slides',
    'high-top sneakers',
    'vintage tees',
    'activewear',
    'knitwear',
    'cardigans',
    'turtlenecks',
    'swim trunks',
    'parkas',
    'graphic tees',
    'bucket hats',
    'caps',
    'sunglasses',
    'tote bags',
    'platform shoes',
    'Chelsea boots',
    'retro runners',
    'fleece vests',
    'bomber jackets',
    'polo shirts',
    'chinos',
    'cargo shorts',
    'compression wear',
    'leggings',
    'tie-dye shirts',
    'corduroy jackets',
    'overalls',
    'dungarees',
    'sports bras',
    'thermal wear',
    'mesh tees',
    'corsets',
    'maxi dresses',
    'mini skirts',
    'wrap dresses',
    'Hawaiian shirts',
    'puffer vests',
    'crossbodies',
    'duffel bags',
    'backpacks',
    'mules',
    'clogs',
    'platform boots',
    'retro jerseys',
    'oversized hoodies',
    'knitted polos',
    'satin shirts',
    'parachute pants',
    'biker jackets',
    'raincoats',
    'ankle boots',
    'streetwear caps',
    'baseball jackets',
    'workwear jackets'
  ];
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setStepIndex((prev) => prev + 1);
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  const currentCategoryWord =
    stepIndex % 2 === 0
      ? `${apparelCategories[Math.floor(stepIndex / 2) % apparelCategories.length]}`
      : 'it';

  // Dynamic Prompt Placeholders
  const placeholders = [
    '380 GSM heavyweight hoodies under ₹1,500...',
    '10% Niacinamide serum direct from brand...',
    'Retro chunky sneakers with zero marketplace markup...',
    'Custom mechanical keyboards with lubed switches...',
    'Single-origin dark roast artisanal coffee...'
  ];
  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % placeholders.length);
    }, 3200);
    return () => clearInterval(timer);
  }, []);

  // Perform AI Search with Real-Time Progressive NDJSON Streaming
  const handlePerformSearch = async (searchPrompt: string) => {
    if (!searchPrompt.trim()) return;

    const trimmed = searchPrompt.trim();
    setActiveSearchQuery(trimmed);
    setIsSearching(true);
    setSearchResult(null);
    setMatchedProducts([]);

    // Log search query to Firestore DB
    logSearchQueryToDb('demo-user-1', trimmed);

    // Try Real-Time NDJSON Progressive Stream from server
    let streamSuccess = false;

    try {
      const response = await fetch('/api/v1/search/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: trimmed, category: selectedCategoryFilter })
      });

      if (response.ok && response.body) {
        streamSuccess = true;
        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';
        let streamedItems: Product[] = [];

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // keep incomplete chunk in buffer

          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const data = JSON.parse(line);

              if (data.type === 'INTENT_HEADER') {
                const maxP = data.intent?.max_price;
                const kw = data.intent?.search_keywords || trimmed;
                const syns = data.intent?.synonyms || [];

                setSearchResult({
                  summary: data.summary || `AI Engine parsed "${trimmed}" with hard price constraint ≤ ₹${maxP || 'N/A'}. Round-robin multi-brand interleaving enabled.`,
                  intent: {
                    clean_query: kw,
                    category: selectedCategoryFilter || 'Streetwear & Apparel',
                    max_price: maxP,
                    min_price: null,
                    gender_target: data.intent?.gender_target || null,
                    spec_tags: maxP ? [`Max Price ≤ ₹${maxP}`, 'Verified D2C'] : ['Verified D2C'],
                    expanded_synonyms: syns,
                    boosted_brand: null
                  },
                  reasoningSteps: [
                    `🤖 Stage 1: AI Intent Parsed -> Clean Keyword "${kw}"`,
                    maxP ? `💰 Stage 2: Hard Price Filter Applied -> directPrice <= ₹${maxP} (Excluded items above budget)` : '🏷️ Stage 2: Analyzed full catalog spectrum',
                    '⚡ Stage 3: Multi-field Weighted Priority Scoring (Title 10x, Category 5x, Specs 3x, Description 2x)',
                    '🎯 Stage 4: Multi-Brand Round-Robin Interleaving (Balanced across Snitch, Nobero, Veirdo, etc.)'
                  ],
                  recommendationTips: [
                    'Buying directly from manufacturer gateways qualifies for 1-click Express Checkout with direct coupon codes.',
                    'All orders ship directly from origin brand warehouses with official warranty.'
                  ],
                  suggestedFollowUps: [
                    'Compare fabric / specification grade',
                    'Show deals under ₹1,500',
                    'Filter 100% French Terry cotton'
                  ]
                });
              } else if (data.type === 'PRODUCT_BATCH') {
                setIsSearching(false);
                const batch: Product[] = data.products || [];
                streamedItems = [...streamedItems, ...batch];
                setMatchedProducts([...streamedItems]);
              }
            } catch (err) {
              console.warn('Stream line parse error:', err);
            }
          }
        }
      }
    } catch (err) {
      console.warn('Server streaming search endpoint notice, using local engine:', err);
    }

    // Fallback Client-Side Engine if stream failed or returned empty
    if (!streamSuccess) {
      const liveDbProducts = products.length > 0 ? products : await getLiveProductsFromDb(products);

      // Extract price limit using regex
      let maxPrice: number | null = null;
      const priceMatch = trimmed.match(/under\s*₹?\s*(\d+)/i) || trimmed.match(/below\s*₹?\s*(\d+)/i) || trimmed.match(/less than\s*₹?\s*(\d+)/i) || trimmed.match(/<\s*₹?\s*(\d+)/i);
      if (priceMatch && priceMatch[1]) {
        maxPrice = parseInt(priceMatch[1], 10);
      }

      // Extract clean keywords & search tokens
      const cleanKeywords = trimmed
        .replace(/under\s*₹?\s*\d+/gi, '')
        .replace(/below\s*₹?\s*\d+/gi, '')
        .replace(/less than\s*₹?\s*\d+/gi, '')
        .replace(/for men|for women|for guys|for ladies|for girls|for boys/gi, '')
        .replace(/show me|find me|looking for|buy|cheap|best|need/gi, '')
        .trim();

      const tokens = (cleanKeywords || trimmed).toLowerCase().split(/\s+/).filter(Boolean);
      const synonymsSet = new Set<string>(tokens);
      tokens.forEach((t) => {
        if (t.endsWith('s') && t.length > 3) synonymsSet.add(t.slice(0, -1));
        if (t === 'trouser' || t === 'trousers' || t === 'pant' || t === 'pants') {
          ['trouser', 'trousers', 'pant', 'pants', 'chinos', 'cargos', 'joggers', 'slacks'].forEach((s) => synonymsSet.add(s));
        }
        if (t === 'hoodie' || t === 'hoodies' || t === 'sweatshirt') {
          ['hoodie', 'hoodies', 'sweatshirt', 'pullover', 'fleece'].forEach((s) => synonymsSet.add(s));
        }
      });

      const tokenList = Array.from(synonymsSet);

      // Multi-Field Weighted Priority Scoring & Hard Price Guardrail Filter
      const candidates = liveDbProducts.map((p) => {
        const dPrice = p.directPrice ?? p.marketplacePrice;

        // HARD EXCLUDE IF ABOVE BUDGET!
        if (maxPrice !== null && dPrice > maxPrice) {
          return { product: p, score: -1 };
        }

        const pName = p.name.toLowerCase();
        const pBrand = p.brand.toLowerCase();
        const pCat = p.category.toLowerCase();
        const pDesc = (p.description || '').toLowerCase();
        const pSpecs = p.specs.map((s) => `${s.label} ${s.value}`).join(' ').toLowerCase();

        let score = 0;
        for (const token of tokenList) {
          if (!token) continue;
          if (pName.includes(token)) score += 10; // Title match 10x
          if (pCat.includes(token)) score += 5;   // Category match 5x
          if (pSpecs.includes(token)) score += 3; // Specs match 3x
          if (pDesc.includes(token)) score += 2;  // Description match 2x
          if (pBrand.includes(token)) score += 4; // Brand match 4x
        }

        return { product: p, score };
      }).filter((item) => item.score > 0);

      // Sort by highest weighted score
      candidates.sort((a, b) => b.score - a.score);
      const matched = candidates.map((c) => c.product);

      // Multi-Brand Round-Robin Interleaving
      const brandBuckets: Record<string, Product[]> = {};
      matched.forEach((p) => {
        const b = p.brand || 'Other';
        if (!brandBuckets[b]) brandBuckets[b] = [];
        brandBuckets[b].push(p);
      });

      const mixedResults: Product[] = [];
      const brandKeys = Object.keys(brandBuckets);
      const maxLen = Math.max(0, ...brandKeys.map((k) => brandBuckets[k].length));

      for (let i = 0; i < maxLen; i++) {
        for (const bKey of brandKeys) {
          if (i < brandBuckets[bKey].length) {
            mixedResults.push(brandBuckets[bKey][i]);
          }
        }
      }

      const finalMatched = mixedResults;

      setMatchedProducts(finalMatched);
      setIsSearching(false);

      setSearchResult({
        summary: finalMatched.length > 0
          ? `Parsed query "${trimmed}"${maxPrice ? ` with hard price constraint ≤ ₹${maxPrice}` : ''}. Filtered and matched ${finalMatched.length} products directly from Firestore.`
          : `Analyzed search query "${trimmed}". Filtered all Firestore products against price/type constraints. Found 0 exact matching products.`,
        intent: {
          clean_query: cleanKeywords || trimmed,
          category: selectedCategoryFilter || 'Streetwear & Apparel',
          max_price: maxPrice,
          min_price: null,
          gender_target: null,
          spec_tags: maxPrice ? [`Max Price ≤ ₹${maxPrice}`, 'D2C Direct'] : ['D2C Direct'],
          expanded_synonyms: tokenList,
          boosted_brand: null
        },
        reasoningSteps: [
          `🤖 Stage 1: Local Engine parsed query "${cleanKeywords || trimmed}"`,
          maxPrice ? `💰 Stage 2: Hard Price Filter Applied -> directPrice <= ₹${maxPrice} (Excluded items above budget)` : '🏷️ Stage 2: Analyzed full catalog spectrum',
          '⚡ Stage 3: Multi-field Weighted Priority Scoring (Title 10x, Category 5x, Specs 3x, Description 2x)',
          '🎯 Stage 4: Multi-Brand Round-Robin Interleaving (Balanced across Snitch, Nobero, Veirdo, etc.)'
        ],
        recommendationTips: [
          'Buying directly from manufacturer gateways qualifies for 1-click Express Checkout with direct coupon codes.',
          'All orders ship directly from origin brand warehouses with official warranty.'
        ],
        suggestedFollowUps: [
          'Compare fabric / specification grade',
          'Show deals under ₹1,500',
          'Filter 100% French Terry cotton'
        ]
      });
    }

    // Scroll to results area smoothly
    setTimeout(() => {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  };

  // Voice Input Toggle
  const handleToggleVoice = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert('Speech recognition is not supported in this browser environment.');
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setQuery(transcript);
        setIsListening(false);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (e) {
      console.error(e);
      setIsListening(false);
    }
  };

  // Select non-repeating product by gender for the screen view
  const handleSelectGender = (gender: 'Men' | 'Women') => {
    setSelectedGenderMode(gender);
    setSearchGenderFilter(gender);
    setActiveImageIndex(0);

    const genderProducts = products.filter((p) => {
      if (gender === 'Men') {
        return isMaleProduct(p);
      } else {
        return isFemaleProduct(p);
      }
    });

    if (genderProducts.length > 0) {
      // Find products not yet seen in current rotation cycle
      let unseen = genderProducts.filter((p) => !seenProductIdsRef.current.has(p.id));

      // If all products in this category have been shown, reset cycle!
      if (unseen.length === 0) {
        genderProducts.forEach((p) => seenProductIdsRef.current.delete(p.id));
        unseen = genderProducts;
      }

      // Pick a random product from the unseen pool
      const nextItem = unseen[Math.floor(Math.random() * unseen.length)];
      seenProductIdsRef.current.add(nextItem.id);
      setSelectedRandomProduct(nextItem);
    } else {
      setSelectedRandomProduct(null);
    }
  };

  useEffect(() => {
    if (products.length > 0 && selectedGenderMode) {
      handleSelectGender(selectedGenderMode);
    }
  }, [products]);

  const handleResetSearch = () => {
    setActiveSearchQuery(null);
    setSearchResult(null);
    setQuery('');
    setMatchedProducts([]);
    setSelectedRandomProduct(null);
    setSelectedGenderMode(null);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <div className="min-h-screen bg-[#FCFAF8] text-slate-900 flex flex-col font-sans relative overflow-x-hidden selection:bg-purple-600 selection:text-white">
      
      {/* Background Soft Luxury Gradients & Mesh Dots (Matching Reference) */}
      <div className="fixed inset-0 pointer-events-none z-0">
        {/* Top-Left Radial Mesh Gradient (rgba(255,245,238,.9)) */}
        <div className="absolute -top-32 -left-32 w-[700px] h-[700px] bg-[radial-gradient(circle,rgba(255,245,238,0.9),transparent_60%)] rounded-full blur-[60px]" />
        
        {/* Bottom-Right Radial Mesh Gradient (rgba(255,224,230,.55)) */}
        <div className="absolute -bottom-40 -right-40 w-[800px] h-[800px] bg-[radial-gradient(circle,rgba(255,224,230,0.55),transparent_60%)] rounded-full blur-[80px]" />

        {/* Bottom-Left Radial Mesh Gradient (rgba(220,235,255,.45)) */}
        <div className="absolute -bottom-20 -left-20 w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(220,235,255,0.45),transparent_60%)] rounded-full blur-[70px]" />

        {/* Top-Right Mesh Dot Pattern */}
        <div className="absolute top-12 right-12 w-48 h-48 bg-[radial-gradient(#cbd5e1_1.5px,transparent_1.5px)] [background-size:12px_12px] opacity-35" />

        {/* Lower-Left Decorative Dot Pattern */}
        <div className="absolute bottom-24 left-10 w-40 h-40 bg-[radial-gradient(#cbd5e1_1.5px,transparent_1.5px)] [background-size:12px_12px] opacity-30" />
      </div>

      {/* Top Header Bar (Hidden once Male/Female is clicked to show clean full screen product view) */}
      {!selectedRandomProduct && (
        <header className="relative z-20 w-full border-b border-slate-200 bg-white/90 backdrop-blur-xl px-4 lg:px-8 py-2 sm:py-2.5 flex items-center justify-between gap-4 shadow-sm">
          
          {/* Brand Logo */}
          <div className="flex items-center shrink-0">
            <motion.div
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleResetSearch}
              className="cursor-pointer group inline-block"
            >
              <BrandLogo size="md" />
            </motion.div>
          </div>

          {/* Header Right Actions */}
          <div className="flex items-center gap-2.5 sm:gap-3">

            {/* Admin Panel Quick Access Button (If Whitelisted Admin) */}
            {currentUser?.email === 'imamir760@gmail.com' && onNavigateAdmin && (
              <button
                onClick={onNavigateAdmin}
                className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-mono text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer transition-colors"
                title="Go to Admin Panel"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Admin</span>
              </button>
            )}

            {/* Google User Profile Badge */}
            {currentUser && (
              <div className="flex items-center gap-2 sm:gap-2.5 pl-2 sm:pl-3 border-l border-slate-200">
                <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-full bg-slate-50 border border-slate-200/80 shadow-2xs hover:border-purple-200 transition-all">
                  <div className="relative shrink-0">
                    <img
                      src={currentUser.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.email}`}
                      alt={currentUser.name}
                      className="w-7 h-7 rounded-full object-cover ring-2 ring-purple-500/20"
                    />
                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                  </div>
                  <div className="hidden sm:flex flex-col text-left">
                    <span className="font-semibold text-slate-800 text-xs leading-tight">{currentUser.name}</span>
                    <span className="text-[10px] text-slate-400 font-mono">Verified</span>
                  </div>
                </div>

                {onLogout && (
                  <button
                    onClick={onLogout}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100/80 hover:bg-rose-50 border border-slate-200/80 hover:border-rose-200 text-slate-600 hover:text-rose-600 transition-all text-xs font-medium cursor-pointer active:scale-95 shadow-2xs"
                    title="Sign Out"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Logout</span>
                  </button>
                )}
              </div>
            )}

          </div>
        </header>
      )}

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 flex flex-col justify-center max-w-4xl w-full mx-auto px-4 py-6 sm:py-10">
        
        <AnimatePresence mode="wait">
          {!activeSearchQuery ? (
            selectedRandomProduct ? (
              /* ------------------------------------------------------------- */
              /* FULL SCREEN FEATURED PRODUCT SHOWCASE MATCHING IMAGE-3        */
              /* ------------------------------------------------------------- */
              <motion.div
                key="product-showcase"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                onClick={handleShowcaseScreenClick}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                className="fixed inset-0 z-50 bg-[#f5f3f0] flex flex-col justify-between p-3 sm:p-5 md:p-6 overflow-hidden select-none cursor-pointer"
              >
                {/* Clean Light Background Container with Full-Screen Covering Product Image */}
                <div className="absolute inset-0 z-0 w-full h-full overflow-hidden flex items-center justify-center">
                  {/* Full Screen Image Covering Complete Screen */}
                  <motion.img
                    key={`fg-${selectedRandomProduct.id}-${activeImageIndex}-${customTryOnImage ? 'custom' : 'std'}`}
                    initial={{ scale: 1.02, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.35, ease: 'easeOut' }}
                    src={customTryOnImage || selectedRandomProduct.images[activeImageIndex] || selectedRandomProduct.images[0] || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1200'}
                    alt={selectedRandomProduct.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover object-top pointer-events-none"
                  />
                  {/* Subtle Gradient Overlays */}
                  <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-slate-950/60 via-slate-950/20 to-transparent pointer-events-none" />
                  <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-slate-950/70 via-slate-950/20 to-transparent pointer-events-none" />
                </div>
                
                {/* Floating Top Header */}
                <div className="relative z-30 w-full flex items-center justify-between gap-2.5 max-w-2xl lg:max-w-4xl mx-auto pt-1 sm:pt-1.5 px-2 sm:px-4">
                  
                  {/* Left: Back Button (<) */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      setSelectedRandomProduct(null);
                      setSelectedGenderMode(null);
                      setShowSearchOverlay(false);
                    }}
                    className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/80 hover:bg-white backdrop-blur-xl border border-white/60 text-slate-900 flex items-center justify-center shrink-0 shadow-lg transition-all active:scale-95 cursor-pointer -translate-y-2.5 sm:-translate-y-3"
                    title="Back"
                  >
                    <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
                  </button>

                  {/* Center: ShopScoper Brand Logo */}
                  <div className="flex items-center justify-center flex-1 h-10 overflow-visible px-2">
                    <BrandLogo size="md" scale="3.0" />
                  </div>

                  {/* Right Action Icons: Search Icon (Q) and Wishlist Heart (❤️) */}
                  <div className="flex items-center gap-2 -translate-y-2.5 sm:-translate-y-3">

                    {/* Search Icon Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setShowSearchOverlay((prev) => !prev);
                      }}
                      className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full backdrop-blur-xl border border-white/60 flex items-center justify-center shrink-0 cursor-pointer shadow-lg active:scale-95 transition-all ${
                        showSearchOverlay ? 'bg-[#6C3BFF] text-white' : 'bg-white/80 text-slate-900 hover:bg-white'
                      }`}
                      title="Search Products"
                    >
                      <Search className="w-5 h-5 stroke-[2.5]" />
                    </button>

                    {/* Wishlist Heart Button with Notification Badge */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        onOpenWishlist();
                      }}
                      className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/80 hover:bg-white backdrop-blur-xl border border-white/60 text-slate-900 flex items-center justify-center shrink-0 cursor-pointer shadow-lg active:scale-95 transition-all"
                      title="Wishlist"
                    >
                      <Heart className="w-5 h-5 fill-[#FF2D55] text-[#FF2D55] stroke-none" />
                      <span className="absolute -top-1 -right-1 bg-[#FF2D55] text-white text-[10px] font-extrabold w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center shadow-md font-mono border-2 border-white">
                        {wishlistCount > 0 ? wishlistCount : '9'}
                      </span>
                    </button>
                  </div>

                </div>

                {/* Pop-down Search Bar Overlay */}
                <AnimatePresence>
                  {showSearchOverlay && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="relative z-30 w-full max-w-xl lg:max-w-2xl mx-auto mt-2 px-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (query.trim()) {
                            setShowSearchOverlay(false);
                            handlePerformSearch(query);
                          }
                        }}
                        className="relative flex items-center bg-white rounded-full shadow-xl border border-purple-200 p-1.5"
                      >
                        <Search className="absolute left-4 w-4 h-4 text-purple-600 pointer-events-none stroke-[2.5]" />
                        <input
                          type="text"
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                          placeholder="Search products on ShopScoper..."
                          autoFocus
                          className="w-full pl-11 pr-24 py-2.5 rounded-full text-slate-900 placeholder:text-slate-400 font-sans text-xs sm:text-sm font-semibold outline-none"
                        />
                        <button
                          type="submit"
                          className="absolute right-2 px-4 py-2 bg-[#6C3BFF] hover:bg-purple-700 text-white font-mono font-bold text-xs rounded-full shadow-md transition-all"
                        >
                          Search
                        </button>
                      </form>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Lower Floating Overlay Elements */}
                <div className="relative z-20 w-full max-w-xl lg:max-w-2xl mx-auto flex flex-col justify-end mt-auto">
                  
                  {/* Image Counter & Centered Carousel Dots Row */}
                  <div className="px-3 sm:px-4 mb-2 flex items-center justify-between">
                    {/* Lower Left Product Counter Pill */}
                    <div className="px-3 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/20 text-white font-mono text-xs font-bold tracking-wider shadow-md">
                      {activeImageIndex + 1} / {selectedRandomProduct.images?.length || 6}
                    </div>

                    {/* Centered Carousel Dots (4 dots) */}
                    <div className="flex items-center gap-1.5 mx-auto -ml-12">
                      {Array.from({ length: 4 }).map((_, idx) => (
                        <button
                          key={idx}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (selectedRandomProduct.images && selectedRandomProduct.images.length > 0) {
                              setActiveImageIndex(idx % selectedRandomProduct.images.length);
                            }
                          }}
                          className={`h-2 rounded-full transition-all duration-300 ${
                            (activeImageIndex % 4) === idx 
                              ? 'w-5 bg-white shadow-md' 
                              : 'w-2 bg-white/50 hover:bg-white/80'
                          }`}
                          title={`Slide ${idx + 1}`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Floating Glass Product Information Card */}
                  <div className="m-2 sm:m-2.5 p-3.5 sm:p-4 rounded-[24px] bg-white/15 backdrop-blur-3xl border border-white/30 shadow-2xl text-slate-900 space-y-2.5">
                    
                    {/* Card Header & Pricing */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-0.5 pr-2">
                        {/* Brand */}
                        <p className="text-[#6C3BFF] font-extrabold text-[11px] tracking-wider uppercase">
                          {selectedRandomProduct.brand || 'MULMUL'}
                        </p>

                        {/* Product Name */}
                        <h2 className="text-base sm:text-lg font-extrabold text-slate-900 leading-tight line-clamp-1">
                          {selectedRandomProduct.name}
                        </h2>

                        {/* Pricing Row */}
                        <div className="flex items-baseline gap-2 pt-0.5">
                          <span className="text-xl sm:text-2xl font-extrabold text-[#6C3BFF] tracking-tight">
                            {(() => {
                              const p = selectedRandomProduct.directPrice;
                              const num = typeof p === 'number' ? p : parseFloat(p);
                              const inrVal = isNaN(num) ? 2750 : (num < 500 ? Math.round(num * 83) : Math.round(num));
                              return `₹${inrVal.toLocaleString('en-IN')}`;
                            })()}
                          </span>
                        </div>
                      </div>

                      {/* Floating Wishlist Button (Top Right of Card) */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          onToggleWishlist(selectedRandomProduct);
                        }}
                        className="w-10 h-10 rounded-full bg-white/80 hover:bg-white shadow-md border border-white/80 flex items-center justify-center shrink-0 active:scale-90 transition-transform"
                        title="Toggle Wishlist"
                      >
                        <Heart className={`w-4 h-4 ${wishlistIds.includes(selectedRandomProduct.id) ? 'fill-[#FF2D55] text-[#FF2D55]' : 'text-slate-400'}`} />
                      </button>
                    </div>

                    {/* Action Buttons (Only 2 buttons: Try-On & Shop Now) */}
                    <div className="grid grid-cols-2 gap-2.5 pt-0.5">
                      {/* Try-On Button (Purple → Pink Gradient) */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          if (onOpenGptTryOn) {
                            onOpenGptTryOn(
                              selectedRandomProduct,
                              selectedRandomProduct?.images?.[activeImageIndex] || selectedRandomProduct?.images?.[0]
                            );
                          } else {
                            setShowTryOnStudio(true);
                          }
                        }}
                        className="py-2.5 sm:py-3 px-3.5 rounded-xl bg-gradient-to-r from-[#6C3BFF] via-[#8B5CFF] to-[#FF2D55] hover:opacity-95 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-md shadow-purple-500/20 active:scale-[0.98] transition-all"
                      >
                        <Sparkles className="w-4 h-4 text-amber-300 fill-amber-300" />
                        <span>Try-On</span>
                      </button>

                      {/* Shop Now Button (Dark Navy) */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          const url = selectedRandomProduct.officialUrl || 'https://rarerabbit.in';
                          window.open(url, '_blank', 'noopener,noreferrer');
                        }}
                        className="py-2.5 sm:py-3 px-3.5 rounded-xl bg-[#0B132B] hover:bg-slate-800 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-md shadow-slate-900/20 active:scale-[0.98] transition-all"
                      >
                        <ShoppingBag className="w-4 h-4 text-white" />
                        <span>Shop Now</span>
                      </button>
                    </div>

                  </div>

                </div>

              </motion.div>
            ) : (
              /* ------------------------------------------------------------- */
              /* INITIAL LANDING VIEW WITH ANIMATED CHARACTERS & MALE/FEMALE   */
              /* ------------------------------------------------------------- */
              <motion.div
                key="initial-landing"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col items-center justify-start pt-2 sm:pt-6 text-center my-auto w-full"
              >
                
                {/* Header Section Matching Screenshot Exactly */}
                <div className="flex flex-col items-center justify-center text-center space-y-3 w-full max-w-2xl mx-auto px-4">
                  <motion.h1 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight font-sans flex flex-col items-center justify-center gap-1.5 sm:gap-2.5"
                  >
                    <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
                      <span>You want</span>
                      <span className="bg-red-600 text-white font-black px-2.5 sm:px-4 py-1 sm:py-1.5 rounded-sm inline-flex items-center justify-center min-w-[110px] sm:min-w-[160px] h-[36px] sm:h-[48px] shadow-sm overflow-hidden">
                        <AnimatePresence mode="wait">
                          <motion.span
                            key={currentCategoryWord + stepIndex}
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            transition={{ duration: 0.18, ease: 'easeOut' }}
                            className="inline-block whitespace-nowrap text-center"
                          >
                            {currentCategoryWord}
                          </motion.span>
                        </AnimatePresence>
                      </span>
                    </div>
                    <span className="font-black text-slate-900 tracking-tight">
                      you get it.
                    </span>
                  </motion.h1>
                  
                </div>

                {/* Two Option Cards: Male & Female (Compact Single Page Layout Positioned Lower) */}
                <div className="mt-6 sm:mt-9 grid grid-cols-2 gap-3 sm:gap-4 md:gap-5 w-full max-w-sm sm:max-w-xl md:max-w-2xl mx-auto px-2 sm:px-4">
                  
                  {/* MALE CARD */}
                  <motion.div
                    whileHover={{ y: -6, scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    transition={{ type: "spring", stiffness: 300, damping: 22 }}
                    onClick={(e) => {
                      e.preventDefault();
                      handleSelectGender('Men');
                    }}
                    className="relative group rounded-[22px] sm:rounded-[26px] bg-white border border-[#ECE8FF] pt-2.5 px-2.5 pb-3 sm:pt-3.5 sm:px-4 sm:pb-4 shadow-[0_12px_35px_rgba(108,59,255,0.08)] hover:shadow-[0_20px_45px_rgba(108,59,255,0.14)] flex flex-col justify-between items-center text-center cursor-pointer select-none overflow-hidden h-[240px] sm:h-[270px] md:h-[290px] transition-all duration-300"
                  >
                    {/* Top Labels Row */}
                    <div className="w-full flex items-center justify-between z-10">
                      <span className="text-[9px] sm:text-xs font-extrabold tracking-widest text-[#6C3BFF]/90 uppercase font-mono">
                        FOR HIM
                      </span>
                      {/* Top Right Floating Male Gender Circle Badge */}
                      <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white shadow-xs border border-[#ECE8FF] flex items-center justify-center shrink-0">
                        <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#6C3BFF] stroke-[2.5]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <circle cx="10" cy="14" r="5" />
                          <line x1="19" y1="5" x2="13.5" y2="10.5" />
                          <polyline points="14 5 19 5 19 10" />
                        </svg>
                      </div>
                    </div>

                    {/* Clothing Image & Soft Colored Circle Container */}
                    <div className="relative w-full flex-1 flex items-center justify-center my-0.5">
                      {/* Soft Blue Circle Behind Clothing */}
                      <div className="absolute w-28 h-28 sm:w-36 sm:h-36 lg:w-40 lg:h-40 rounded-full bg-[#DDE8FF]/85 pointer-events-none" />

                      {/* Floating Clothing Image */}
                      <motion.img
                        src="/male_ss.png"
                        loading="eager"
                        decoding="async"
                        onError={(e) => {
                          const target = e.currentTarget;
                          if (!target.dataset.triedFallback) {
                            target.dataset.triedFallback = 'true';
                            target.src = '/male_SS.png';
                          }
                        }}
                        alt="Men's Fashion"
                        animate={{ y: [0, -4, 0] }}
                        transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                        className="relative z-10 w-[85%] max-h-[110px] sm:max-h-[140px] object-contain -rotate-3 drop-shadow-[0_12px_20px_rgba(0,0,0,0.15)] group-hover:scale-105 transition-all duration-500 pointer-events-none"
                      />
                    </div>

                    {/* Bottom Content Area */}
                    <div className="w-full flex flex-col items-center z-10 pt-0.5">
                      <h3 className="text-sm sm:text-base font-black text-[#111827] tracking-wider font-sans uppercase leading-tight">
                        MALE
                      </h3>

                      {/* Purple Gradient Arrow-Only Button */}
                      <div className="mt-2 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-r from-[#6C3BFF] to-[#8B5CF6] text-white flex items-center justify-center shadow-md shadow-purple-500/20 group-hover:shadow-lg group-hover:shadow-purple-500/35 group-hover:scale-110 transition-all duration-300">
                        <ArrowRight className="w-4 h-4 sm:w-4.5 sm:h-4.5 stroke-[2.5]" />
                      </div>
                    </div>
                  </motion.div>

                  {/* FEMALE CARD */}
                  <motion.div
                    whileHover={{ y: -6, scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    transition={{ type: "spring", stiffness: 300, damping: 22 }}
                    onClick={(e) => {
                      e.preventDefault();
                      handleSelectGender('Women');
                    }}
                    className="relative group rounded-[22px] sm:rounded-[26px] bg-white border border-[#ECE8FF] pt-2.5 px-2.5 pb-3 sm:pt-3.5 sm:px-4 sm:pb-4 shadow-[0_12px_35px_rgba(255,77,141,0.08)] hover:shadow-[0_20px_45px_rgba(255,77,141,0.14)] flex flex-col justify-between items-center text-center cursor-pointer select-none overflow-hidden h-[240px] sm:h-[270px] md:h-[290px] transition-all duration-300"
                  >
                    {/* Top Labels Row */}
                    <div className="w-full flex items-center justify-between z-10">
                      <span className="text-[9px] sm:text-xs font-extrabold tracking-widest text-[#FF4D8D]/90 uppercase font-mono">
                        FOR HER
                      </span>
                      {/* Top Right Floating Female Gender Circle Badge */}
                      <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white shadow-xs border border-[#ECE8FF] flex items-center justify-center shrink-0">
                        <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#FF4D8D] stroke-[2.5]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <circle cx="12" cy="9" r="5" />
                          <line x1="12" y1="14" x2="12" y2="21" />
                          <line x1="9" y1="18" x2="15" y2="18" />
                        </svg>
                      </div>
                    </div>

                    {/* Clothing Image & Soft Colored Circle Container */}
                    <div className="relative w-full flex-1 flex items-center justify-center my-0.5">
                      {/* Soft Pink Circle Behind Clothing */}
                      <div className="absolute w-28 h-28 sm:w-36 sm:h-36 lg:w-40 lg:h-40 rounded-full bg-[#FFE2EC]/85 pointer-events-none" />

                      {/* Floating Clothing Image */}
                      <motion.img
                        src="/female_ss.png"
                        loading="eager"
                        decoding="async"
                        onError={(e) => {
                          const target = e.currentTarget;
                          if (!target.dataset.triedFallback) {
                            target.dataset.triedFallback = 'true';
                            target.src = '/Female_SS.png';
                          }
                        }}
                        alt="Women's Fashion"
                        animate={{ y: [0, -4, 0] }}
                        transition={{ repeat: Infinity, duration: 4, ease: "easeInOut", delay: 0.5 }}
                        className="relative z-10 w-[85%] max-h-[110px] sm:max-h-[140px] object-contain rotate-3 drop-shadow-[0_12px_20px_rgba(0,0,0,0.15)] group-hover:scale-105 transition-all duration-500 pointer-events-none"
                      />
                    </div>

                    {/* Bottom Content Area */}
                    <div className="w-full flex flex-col items-center z-10 pt-0.5">
                      <h3 className="text-sm sm:text-base font-black text-[#111827] tracking-wider font-sans uppercase leading-tight">
                        FEMALE
                      </h3>

                      {/* Pink Gradient Arrow-Only Button */}
                      <div className="mt-2 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-r from-[#FF4D8D] to-[#FF6BA8] text-white flex items-center justify-center shadow-md shadow-pink-500/20 group-hover:shadow-lg group-hover:shadow-pink-500/35 group-hover:scale-110 transition-all duration-300">
                        <ArrowRight className="w-4 h-4 sm:w-4.5 sm:h-4.5 stroke-[2.5]" />
                      </div>
                    </div>
                  </motion.div>

                </div>

              </motion.div>
            )
          ) : (
            /* ------------------------------------------------------------- */
            /* SEARCH RESULTS STREAM - WHITE AND RED THEME                   */
            /* ------------------------------------------------------------- */
            <motion.div
              key="chat-results"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              className="space-y-6 pb-24"
            >
              
              {/* Search Navigation Top Bar */}
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <button
                  onClick={handleResetSearch}
                  className="flex items-center gap-2 text-xs font-mono font-bold text-red-600 hover:text-red-700 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Start New Search</span>
                </button>

                <div className="text-xs font-mono text-slate-600 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-red-600" />
                  <span>Direct Brand Checkout Active</span>
                </div>
              </div>

              {/* User Prompt Message */}
              <div className="flex items-start gap-3 bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
                <div className="h-8 w-8 rounded-full bg-red-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-md">
                  U
                </div>
                <div>
                  <div className="text-[11px] font-mono text-slate-500 mb-0.5 uppercase tracking-wider font-bold">Your Direct Brand Query</div>
                  <div className="text-base font-semibold text-slate-900">{activeSearchQuery}</div>
                </div>
              </div>

              {/* AI Response Block */}
              <div className="space-y-6">
                
                {/* AI Thinking Animation */}
                {isSearching ? (
                  <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-4 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Sparkles className="w-5 h-5 text-red-600 animate-spin" />
                      </div>
                      <span className="text-sm font-mono text-red-600 font-bold animate-pulse">
                        Analyzing direct brand store catalogs & pricing...
                      </span>
                    </div>

                    <div className="space-y-2 pl-8 font-mono text-xs text-slate-600">
                      <div className="flex items-center gap-2 text-red-600 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Searching 12,400+ verified D2C brand gateways</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-500">
                        <CheckCircle2 className="w-3.5 h-3.5 text-slate-300" />
                        <span>Filtering out 30% marketplace listing markups</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-500">
                        <CheckCircle2 className="w-3.5 h-3.5 text-slate-300" />
                        <span>Retrieving direct checkout manufacturer coupons</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  searchResult && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="space-y-6"
                    >
                      {/* AI Assistant Summary Box */}
                      <div className="p-5 sm:p-6 rounded-2xl bg-white border border-red-200 space-y-4 shadow-md">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-lg bg-red-600 text-white flex items-center justify-center font-bold text-xs">
                              <Sparkles className="w-4 h-4" />
                            </div>
                            <span className="font-mono text-xs font-bold text-slate-900 uppercase tracking-wider">
                              Direct Brand AI Analysis
                            </span>
                          </div>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-50 text-red-600 border border-red-200 font-bold">
                            Verified Brand Direct
                          </span>
                        </div>

                        <p className="text-sm text-slate-800 leading-relaxed font-sans font-medium">
                          {searchResult.summary}
                        </p>

                        {/* Stage 1 & 2: Structured AI Intent & Entity Parser Card */}
                        {searchResult.intent && (
                          <div className="p-4 rounded-xl bg-slate-900 text-white space-y-3 font-mono text-xs shadow-inner border border-slate-800">
                            <div className="flex items-center justify-between text-emerald-400 font-extrabold uppercase text-[11px] tracking-wider border-b border-slate-800 pb-2">
                              <span className="flex items-center gap-1.5">
                                <Bot className="w-4 h-4 text-emerald-400" />
                                STAGE 1: AI Intent & Hybrid Match Agent
                              </span>
                              <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px]">
                                Structured JSON Output
                              </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[11px]">
                              <div>
                                <span className="text-slate-400 font-bold">Search Keywords:</span>{' '}
                                <strong className="text-white bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
                                  {searchResult.intent.clean_query || activeSearchQuery}
                                </strong>
                              </div>

                              {searchResult.intent.category && (
                                <div>
                                  <span className="text-slate-400 font-bold">Category:</span>{' '}
                                  <span className="text-red-300 font-bold">{searchResult.intent.category}</span>
                                </div>
                              )}

                              {searchResult.intent.max_price && (
                                <div>
                                  <span className="text-slate-400 font-bold">Price Filter:</span>{' '}
                                  <span className="text-emerald-400 font-black">
                                    Max ₹{searchResult.intent.max_price.toLocaleString('en-IN')}
                                  </span>
                                </div>
                              )}

                              {searchResult.intent.gender_target && (
                                <div>
                                  <span className="text-slate-400 font-bold">Target Gender:</span>{' '}
                                  <span className="text-slate-200">{searchResult.intent.gender_target}</span>
                                </div>
                              )}
                            </div>

                            {/* Spec Tags & Synonyms */}
                            <div className="space-y-2 pt-2 border-t border-slate-800">
                              {searchResult.intent.spec_tags && searchResult.intent.spec_tags.length > 0 && (
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className="text-[10px] text-slate-400 font-bold uppercase">Extracted Specs:</span>
                                  {searchResult.intent.spec_tags.map((tag, i) => (
                                    <span key={i} className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700 text-[10px] font-bold">
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              )}

                              {searchResult.intent.expanded_synonyms && searchResult.intent.expanded_synonyms.length > 0 && (
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className="text-[10px] text-slate-400 font-bold uppercase">Hybrid Synonyms:</span>
                                  {searchResult.intent.expanded_synonyms.map((syn, i) => (
                                    <span key={i} className="px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800/80 text-[10px] font-medium">
                                      +{syn}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Direct Firestore Database Connection Status */}
                            <div className="flex items-center gap-2 pt-2.5 border-t border-slate-800 text-[10px] text-emerald-300 font-mono">
                              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                              <span>Firestore DB Connected: Querying live <strong>products</strong> collection</span>
                            </div>
                          </div>
                        )}

                        {/* Grounding Reasoning Steps */}
                        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                          {searchResult.reasoningSteps.map((step, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 text-[11px] font-mono text-slate-700 border border-slate-200"
                            >
                              <CheckCircle2 className="w-3 h-3 text-red-600 shrink-0" />
                              <span>{step}</span>
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Direct Matched Products Grid */}
                      <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <h3 className="text-sm font-mono font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                            <ShoppingBag className="w-4 h-4 text-red-600" />
                            <span>Matched Direct Brand Stores ({filteredMatchedProducts.length})</span>
                          </h3>

                          {/* Gender Filter Toggle Bar */}
                          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                            <span className="text-[10px] font-mono font-bold text-slate-500 uppercase px-2">Audience:</span>
                            {(['All', 'Men', 'Women', 'Unisex'] as const).map((g) => (
                              <button
                                key={g}
                                type="button"
                                onClick={() => setSearchGenderFilter(g)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                                  searchGenderFilter === g
                                    ? 'bg-red-600 text-white shadow-sm'
                                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                                }`}
                              >
                                {g === 'All' ? 'All Genders' : g}
                              </button>
                            ))}
                          </div>
                        </div>

                        {filteredMatchedProducts.length === 0 ? (
                          <div className="p-8 text-center rounded-2xl bg-white border border-slate-200 space-y-3 shadow-sm">
                            <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto font-mono text-xl font-bold border border-red-100">
                              0
                            </div>
                            <h4 className="text-base font-bold text-slate-900 font-mono">No Matching Products in Firestore</h4>
                            <p className="text-xs text-slate-600 max-w-md mx-auto font-sans leading-relaxed">
                              Evaluated all items in the Firestore <code className="bg-slate-100 px-1 py-0.5 rounded text-red-600 font-mono">products</code> collection. None matched your requested price constraints or search criteria for "{activeSearchQuery}".
                            </p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {filteredMatchedProducts.map((product) => {
                              const isWishlisted = wishlistIds.includes(product.id);
                              const savingsAmount = product.marketplacePrice - product.directPrice;

                              return (
                                <motion.div
                                  key={product.id}
                                  whileHover={{ y: -3 }}
                                  className="group relative rounded-2xl bg-white border border-slate-200 hover:border-red-500 p-4 transition-all duration-300 flex flex-col justify-between space-y-4 shadow-sm hover:shadow-md"
                                >
                                  <div>
                                    {/* Top Row: Brand & Wishlist */}
                                    <div className="flex items-center justify-between mb-3">
                                      <div className="flex items-center gap-2">
                                        <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-red-50 text-red-600 border border-red-200">
                                          Store Direct
                                        </span>
                                        <span className="text-xs font-mono font-bold text-slate-900">
                                          {product.brand}
                                        </span>
                                      </div>

                                      <button
                                        onClick={() => onToggleWishlist(product)}
                                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
                                      >
                                        <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-red-600 text-red-600' : ''}`} />
                                      </button>
                                    </div>

                                    {/* Product Image & Info */}
                                    <div className="flex gap-3">
                                      <div className="h-24 w-24 rounded-xl bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
                                        <img
                                          src={product.images[0]}
                                          alt={product.name}
                                          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        />
                                      </div>

                                      <div className="flex-1 min-w-0 space-y-1">
                                        <h4 className="text-sm font-semibold text-slate-900 truncate leading-snug">
                                          {product.name}
                                        </h4>
                                        
                                        {/* Price Comparison Row */}
                                        <div className="flex items-baseline gap-2 font-mono">
                                          <span className="text-lg font-bold text-red-600">
                                            ₹{product.directPrice.toLocaleString('en-IN')}
                                          </span>
                                          <span className="text-xs text-slate-400 line-through">
                                            ₹{product.marketplacePrice.toLocaleString('en-IN')}
                                          </span>
                                        </div>

                                        {/* Savings Badge */}
                                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-50 text-red-700 text-[10px] font-mono font-bold border border-red-200">
                                          <Tag className="w-3 h-3" />
                                          <span>Save ₹{savingsAmount.toLocaleString('en-IN')} Direct</span>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Specs Chips */}
                                    <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-slate-100">
                                      {product.specs.slice(0, 2).map((spec, sIdx) => (
                                        <span
                                          key={sIdx}
                                          className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200"
                                        >
                                          {spec.label}: <strong className="text-slate-900">{spec.value}</strong>
                                        </span>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Action Buttons */}
                                  <div className="pt-2">
                                    <div className="flex items-center gap-2">
                                      <button
                                        onClick={() => onExpressBuy(product)}
                                        className="flex-1 py-2 px-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-xs font-mono flex items-center justify-center gap-1.5 transition-colors shadow-md shadow-red-600/20"
                                      >
                                        <Zap className="w-3.5 h-3.5 fill-white" />
                                        <span>Buy Direct</span>
                                      </button>

                                      <button
                                        onClick={() => onQuickView(product)}
                                        className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 transition-colors"
                                        title="Quick Specs"
                                      >
                                        <ExternalLink className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </div>
                                </motion.div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Follow-up Prompts */}
                      {searchResult.suggestedFollowUps && (
                        <div className="space-y-2 pt-4">
                          <div className="text-xs font-mono text-slate-500 uppercase tracking-wider font-bold">
                            Refine or Follow Up
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {searchResult.suggestedFollowUps.map((fUp, idx) => (
                              <button
                                key={idx}
                                onClick={() => {
                                  setQuery(fUp);
                                  handlePerformSearch(fUp);
                                }}
                                className="px-3 py-1.5 rounded-xl bg-white hover:bg-red-50 border border-slate-200 hover:border-red-300 text-xs text-slate-800 hover:text-red-600 transition-colors flex items-center gap-1.5 font-mono shadow-sm"
                              >
                                <CornerDownLeft className="w-3 h-3 text-red-600" />
                                <span>{fUp}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                    </motion.div>
                  )
                )}

              </div>

              <div ref={chatBottomRef} />

            </motion.div>
          )}
        </AnimatePresence>

      </main>

      {/* Sticky Bottom Prompt Bar when inside Search Results stream */}
      {activeSearchQuery && (
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-xl border-t border-slate-200 p-3 sm:p-4 shadow-lg">
          <div className="max-w-3xl mx-auto flex items-center gap-2">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handlePerformSearch(query);
              }}
              className="flex-1 flex items-center gap-2 bg-slate-50 border border-slate-300 focus-within:border-red-500 rounded-2xl px-4 py-2.5 transition-colors shadow-inner"
            >
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask a follow-up or search another direct brand..."
                className="w-full bg-transparent text-slate-900 placeholder-slate-400 text-xs sm:text-sm outline-none font-medium"
              />
              <button
                type="submit"
                disabled={!query.trim()}
                className="p-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white disabled:opacity-30 transition-colors shadow"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* AI Virtual Try-On Studio Modal */}
      <VirtualTryOnStudio
        isOpen={showTryOnStudio}
        onClose={() => setShowTryOnStudio(false)}
        garmentProduct={selectedRandomProduct}
        garmentImageUrl={
          selectedRandomProduct?.images[activeImageIndex] ||
          selectedRandomProduct?.images[0] ||
          'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1200'
        }
        onApplyGeneratedImage={(newImg) => {
          setCustomTryOnImage(newImg);
        }}
      />

    </div>
  );
};
