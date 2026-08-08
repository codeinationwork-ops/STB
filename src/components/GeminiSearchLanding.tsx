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
  Trash2,
  SlidersHorizontal,
  Check,
  RotateCcw,
  X
} from 'lucide-react';
import { Product, UserAddress, UserSession } from '../types';
import { logSearchQueryToDb, getLiveProductsFromDb, safeNumber } from '../lib/firestoreService';
import { verifyProductsWithGeminiAI, getAICachedVerification } from '../lib/geminiCategoryVerifier';
import { BrandLogo } from './BrandLogo';
import { VirtualTryOnStudio } from './VirtualTryOnStudio';
import { BrandRequestModals } from './BrandRequestModals';
import { ShopifyStoresPage } from './ShopifyStoresPage';

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

export const MALE_CATEGORIES = [
  { id: 'All', label: 'All Male Categories', keywords: [] },
  { id: 'Tops & Shirts', label: 'Tops & Shirts', keywords: ['top', 'tops', 'shirt', 'shirts', 't-shirt', 'tshirt', 'tee', 'tees', 'polo', 'polos', 'henley', 'overshirt', 'sweatshirt', 'sweater', 'hoodie', 'cardigan', 'turtleneck'] },
  { id: 'Bottoms', label: 'Bottoms & Pants', keywords: ['bottom', 'bottoms', 'pant', 'pants', 'jeans', 'jean', 'denim', 'trouser', 'trousers', 'cargo', 'cargos', 'jogger', 'joggers', 'short', 'shorts', 'chino', 'chinos', 'sweatpants', 'trackpant', 'trackpants', 'slacks'] },
  { id: 'Outerwear', label: 'Outerwear & Jackets', keywords: ['outerwear', 'jacket', 'jackets', 'coat', 'coats', 'blazer', 'blazers', 'vest', 'vests', 'parka', 'windbreaker', 'trench', 'puffer', 'bomber', 'fleece'] },
  { id: 'Suiting & Tailored Wear', label: 'Suiting & Tailored Wear', keywords: ['suit', 'suits', 'suiting', 'blazer', 'blazers', 'tuxedo', 'tuxedos', 'waistcoat', 'dress pants', 'formal'] },
  { id: 'Traditional & Ethnic Wear', label: 'Traditional & Ethnic Wear', keywords: ['ethnic', 'kurta', 'kurtas', 'sherwani', 'sherwanis', 'pyjama', 'pajama', 'dhoti', 'traditional'] },
  { id: 'Activewear & Gym', label: 'Activewear & Gym', keywords: ['activewear', 'gym', 'tracksuit', 'sportswear', 'athletic', 'running', 'workout', 'compression'] },
  { id: 'Underwear & Intimates', label: 'Underwear & Loungewear', keywords: ['underwear', 'boxer', 'boxers', 'briefs', 'trunks', 'pajama', 'sleepwear', 'loungewear', 'robe'] },
  { id: 'Sleepwear & Loungewear', label: 'Sleepwear & Loungewear', keywords: ['sleepwear', 'loungewear', 'pajama', 'pajamas', 'robe', 'nightshirt'] },
  { id: 'Swimwear', label: 'Swimwear & Trunks', keywords: ['swimwear', 'swim', 'trunks', 'boardshorts', 'swimsuit'] },
  { id: 'Footwear', label: 'Footwear & Shoes', keywords: ['shoe', 'shoes', 'footwear', 'sneaker', 'sneakers', 'boot', 'boots', 'sandal', 'sandals', 'slides', 'slide', 'loafer', 'loafers', 'clog', 'clogs', 'oxford', 'derby'] },
  { id: 'Accessories & Watches', label: 'Accessories & Watches', keywords: ['watch', 'watches', 'bag', 'bags', 'backpack', 'wallet', 'belt', 'belts', 'cap', 'caps', 'hat', 'sunglasses', 'eyewear', 'fragrance', 'cologne', 'grooming'] }
];

export const FEMALE_CATEGORIES = [
  { id: 'All', label: 'All Female Categories', keywords: [] },
  { id: 'Dresses & Rompers', label: 'Dresses & Rompers', keywords: ['dress', 'dresses', 'gown', 'gowns', 'maxi', 'midi', 'bodycon', 'frock', 'romper', 'rompers', 'jumpsuit', 'jumpsuits', 'sundress', 'cocktail'] },
  { id: 'Tops & Shirts', label: 'Tops & Crop Tops', keywords: ['top', 'tops', 'crop top', 'crop', 'shirt', 'shirts', 't-shirt', 'tshirt', 'tee', 'tees', 'blouse', 'blouses', 'cami', 'camisole', 'sweatshirt', 'sweater', 'hoodie', 'cardigan', 'bodysuit', 'turtleneck'] },
  { id: 'Bottoms', label: 'Bottoms & Skirts', keywords: ['bottom', 'bottoms', 'pant', 'pants', 'jeans', 'jean', 'denim', 'trouser', 'trousers', 'cargo', 'cargos', 'jogger', 'joggers', 'short', 'shorts', 'skirt', 'skirts', 'skort', 'leggings', 'palazzo', 'culottes', 'slacks'] },
  { id: 'Outerwear', label: 'Outerwear & Jackets', keywords: ['outerwear', 'jacket', 'jackets', 'coat', 'coats', 'blazer', 'blazers', 'shrug', 'cardigan', 'parka', 'windbreaker', 'trench', 'puffer', 'fleece'] },
  { id: 'Suiting & Tailored Wear', label: 'Suiting & Tailored Wear', keywords: ['suit', 'suits', 'suiting', 'blazer', 'blazers', 'tuxedo', 'waistcoat', 'tailored'] },
  { id: 'Traditional & Ethnic Wear', label: 'Traditional & Ethnic Wear', keywords: ['ethnic', 'saree', 'sari', 'lehenga', 'kurti', 'kurtis', 'kurta', 'anarkali', 'salwar', 'dupatta', 'choli', 'traditional'] },
  { id: 'Activewear & Gym', label: 'Activewear & Gym', keywords: ['activewear', 'gym', 'sports bra', 'leggings', 'tracksuit', 'sportswear', 'athletic', 'yoga', 'workout'] },
  { id: 'Underwear & Intimates', label: 'Lingerie & Intimates', keywords: ['lingerie', 'bra', 'bras', 'panties', 'panty', 'shapewear', 'corset', 'bodysuit', 'underwear', 'sleepwear', 'pajama', 'robe'] },
  { id: 'Sleepwear & Loungewear', label: 'Sleepwear & Loungewear', keywords: ['sleepwear', 'loungewear', 'pajama', 'pajamas', 'robe', 'nightgown'] },
  { id: 'Swimwear', label: 'Swimwear & Bikinis', keywords: ['swimwear', 'swim', 'bikini', 'bikinis', 'swimsuit', 'monokini', 'cover-up'] },
  { id: 'Footwear', label: 'Footwear & Shoes', keywords: ['shoe', 'shoes', 'footwear', 'heels', 'pumps', 'flats', 'sandals', 'sandal', 'sneaker', 'sneakers', 'boots', 'boot', 'slides', 'mules'] },
  { id: 'Bags & Accessories', label: 'Bags & Accessories', keywords: ['bag', 'bags', 'handbag', 'tote', 'clutch', 'crossbody', 'backpack', 'wallet', 'jewelry', 'necklace', 'earrings', 'ring', 'bracelet', 'sunglasses', 'eyewear', 'perfume', 'makeup', 'skincare'] }
];

export const getCategoryKeywords = (catName: string, genderMode: 'Men' | 'Women' | null): string[] => {
  if (!catName || catName === 'All') return [];
  const list = genderMode === 'Women' ? FEMALE_CATEGORIES : MALE_CATEGORIES;
  const found = list.find((c) => c.id === catName || c.label === catName);
  if (found && found.keywords.length > 0) {
    return found.keywords;
  }
  const altList = genderMode === 'Women' ? MALE_CATEGORIES : FEMALE_CATEGORIES;
  const altFound = altList.find((c) => c.id === catName || c.label === catName);
  if (altFound && altFound.keywords.length > 0) {
    return altFound.keywords;
  }
  return catName
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2);
};

export const matchesCategoryFilter = (p: Product, catName: string, genderMode: 'Men' | 'Women' | null): boolean => {
  if (!catName || catName === 'All') return true;
  const catLower = catName.toLowerCase().trim();
  const pCatLower = (p.category || '').toLowerCase().trim();

  // Direct category equality or substring match
  if (pCatLower) {
    if (pCatLower === catLower || pCatLower.includes(catLower) || catLower.includes(pCatLower)) {
      return true;
    }
  }

  // Conflict prevention: if product's explicit category belongs to a conflicting main category, reject
  if (pCatLower) {
    const isTopCategory = /\b(top|shirt|tee|polo|blouse|sweater|hoodie|sweatshirt)\b/i.test(pCatLower);
    const isBottomCategory = /\b(bottom|pant|jeans|trouser|cargo|jogger|short|skirt|slacks|leggings)\b/i.test(pCatLower);
    const isOuterwearCategory = /\b(outerwear|jacket|coat|blazer|parka|trench|windbreaker)\b/i.test(pCatLower);
    const isDressCategory = /\b(dress|gown|romper|jumpsuit)\b/i.test(pCatLower);
    const isShoeCategory = /\b(shoe|footwear|sneaker|boot|sandal|heels|flats|slides)\b/i.test(pCatLower);

    const targetIsTop = /\b(top|shirt|tee|polo|blouse|sweater|hoodie|sweatshirt)\b/i.test(catLower);
    const targetIsBottom = /\b(bottom|pant|jeans|trouser|cargo|jogger|short|skirt|slacks|leggings)\b/i.test(catLower);
    const targetIsOuterwear = /\b(outerwear|jacket|coat|blazer|parka|trench|windbreaker)\b/i.test(catLower);
    const targetIsDress = /\b(dress|gown|romper|jumpsuit)\b/i.test(catLower);
    const targetIsShoe = /\b(shoe|footwear|sneaker|boot|sandal|heels|flats|slides)\b/i.test(catLower);

    if (
      (targetIsTop && (isBottomCategory || isOuterwearCategory || isDressCategory || isShoeCategory)) ||
      (targetIsBottom && (isTopCategory || isOuterwearCategory || isDressCategory || isShoeCategory)) ||
      (targetIsOuterwear && (isBottomCategory || isShoeCategory)) ||
      (targetIsDress && (isBottomCategory || isTopCategory || isShoeCategory)) ||
      (targetIsShoe && (isTopCategory || isBottomCategory || isOuterwearCategory || isDressCategory))
    ) {
      return false;
    }
  }

  // Check keyword matches against title, description, category, and specs
  const keywords = getCategoryKeywords(catName, genderMode);
  if (keywords.length > 0) {
    const pName = (p.name || '').toLowerCase();
    const pDesc = (p.description || '').toLowerCase();
    const pSpecs = (p.specs || []).map((s) => `${s.label} ${s.value}`).join(' ').toLowerCase();

    return keywords.some((kw) => pName.includes(kw) || pDesc.includes(kw) || pCatLower.includes(kw) || pSpecs.includes(kw));
  }

  return false;
};

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
  const [selectedGenderMode, setSelectedGenderMode] = useState<'Men' | 'Women' | null>(() => {
    if (typeof window !== 'undefined' && window.location.pathname.toLowerCase().startsWith('/products')) {
      return 'Men';
    }
    return null;
  });

  // Vertical Side Budget Filter State
  const [minBudget, setMinBudget] = useState<number>(0);
  const [maxBudget, setMaxBudget] = useState<number>(10000);
  const [appliedMinBudget, setAppliedMinBudget] = useState<number | null>(null);
  const [appliedMaxBudget, setAppliedMaxBudget] = useState<number | null>(null);
  const [isBudgetApplied, setIsBudgetApplied] = useState<boolean>(false);
  const [isBudgetSidebarOpen, setIsBudgetSidebarOpen] = useState<boolean>(false);
  const [isPriceFiltering, setIsPriceFiltering] = useState<boolean>(false);
  const [noBudgetMatchError, setNoBudgetMatchError] = useState<string | null>(null);
  const [isShopifyConnectOpen, setIsShopifyConnectOpen] = useState<boolean>(false);

  const applyActiveFilters = (
    genderMode: 'Men' | 'Women' | null,
    minP: number | null,
    maxP: number | null
  ) => {
    if (!genderMode) return;

    let filtered = products.filter((p) => {
      // 1. Gender check
      const matchesGender = genderMode === 'Men' ? isMaleProduct(p) : isFemaleProduct(p);
      if (!matchesGender) return false;

      // 2. Budget check
      if (minP !== null && maxP !== null) {
        const price = safeNumber(p.directPrice ?? p.price ?? 0);
        if (price < minP || price > maxP) return false;
      }

      return true;
    });

    if (filtered.length > 0) {
      setNoBudgetMatchError(null);
      setMatchedProducts(filtered);
      let unseen = filtered.filter((p) => !seenProductIdsRef.current.has(p.id));
      if (unseen.length === 0) {
        filtered.forEach((p) => seenProductIdsRef.current.delete(p.id));
        unseen = filtered;
      }
      const nextItem = unseen[Math.floor(Math.random() * unseen.length)];
      seenProductIdsRef.current.add(nextItem.id);
      setSelectedRandomProduct(nextItem);
      setActiveImageIndex(0);
    } else {
      setMatchedProducts([]);
      setSelectedRandomProduct(null);

      const errText = minP !== null && maxP !== null
        ? `No ${genderMode.toLowerCase()}'s products found matching budget ₹${minP.toLocaleString('en-IN')} - ₹${maxP.toLocaleString('en-IN')}`
        : `No ${genderMode.toLowerCase()}'s products found`;

      setNoBudgetMatchError(errText);
    }
  };

  const handleApplyBudget = async (customMin?: number, customMax?: number) => {
    const minP = customMin !== undefined ? customMin : minBudget;
    const maxP = customMax !== undefined ? customMax : maxBudget;

    const finalMin = Math.min(minP, maxP);
    const finalMax = Math.max(minP, maxP);

    setMinBudget(finalMin);
    setMaxBudget(finalMax);
    setAppliedMinBudget(finalMin);
    setAppliedMaxBudget(finalMax);
    setIsBudgetApplied(true);
    setIsPriceFiltering(true);
    setIsBudgetSidebarOpen(false);

    applyActiveFilters(selectedGenderMode, finalMin, finalMax);

    setIsPriceFiltering(false);
  };

  const handleResetBudget = () => {
    setMinBudget(0);
    setMaxBudget(10000);
    setAppliedMinBudget(null);
    setAppliedMaxBudget(null);
    setIsBudgetApplied(false);
    setIsBudgetSidebarOpen(false);

    applyActiveFilters(selectedGenderMode, null, null);
  };

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

  // Shuffle to next product within active category & filters
  const handleShuffleNextProduct = () => {
    if (matchedProducts.length > 0) {
      let unseen = matchedProducts.filter((p) => !seenProductIdsRef.current.has(p.id));
      if (unseen.length === 0) {
        matchedProducts.forEach((p) => seenProductIdsRef.current.delete(p.id));
        unseen = matchedProducts;
      }
      const currentId = selectedRandomProduct?.id;
      const candidates = unseen.filter((p) => p.id !== currentId);
      const pool = candidates.length > 0 ? candidates : unseen;
      const nextItem = pool[Math.floor(Math.random() * pool.length)];
      if (nextItem) {
        seenProductIdsRef.current.add(nextItem.id);
        setSelectedRandomProduct(nextItem);
        setActiveImageIndex(0);
      }
    } else if (selectedGenderMode) {
      applyActiveFilters(
        selectedGenderMode,
        isBudgetApplied ? appliedMinBudget : null,
        isBudgetApplied ? appliedMaxBudget : null
      );
    }
  };

  // Single click (shuffle next product within active category)
  const handleShowcaseScreenClick = (e: React.MouseEvent) => {
    // If click was on interactive input or button, ignore screen action
    if ((e.target as HTMLElement).closest('button, input, form, a')) {
      return;
    }

    // Instant shuffle to next product in active category filter!
    handleShuffleNextProduct();
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
    if (p.gender === 'Men') return true;
    if (p.gender === 'Women') return false;
    const text = `${p.name} ${p.category} ${p.description || ''} ${(p.specs || []).map(s => `${s.label} ${s.value}`).join(' ')}`.toLowerCase();
    
    // Female specific garments & apparel items block
    const isFemaleSpecific = /\b(women|womens|women's|female|ladies|lady|girl|girls|dress|dresses|skirt|skirts|saree|sari|lehenga|bra|bras|crop top|kurti|kurtis|gown|gowns|bikini|monokini|frock|blouse|heels|handbag|lingerie)\b/i.test(text);
    if (isFemaleSpecific) return false;

    return true;
  };

  const isFemaleProduct = (p: Product) => {
    if (p.gender === 'Women') return true;
    if (p.gender === 'Men') return false;
    const text = `${p.name} ${p.category} ${p.description || ''} ${(p.specs || []).map(s => `${s.label} ${s.value}`).join(' ')}`.toLowerCase();

    // Male specific garments & apparel items block
    const isMaleSpecific = /\b(men's|menswear|gents|boys|boy|sherwani|boxer|boxers|trunks|briefs)\b/i.test(text);
    if (isMaleSpecific) return false;

    return true;
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

  // Dynamic Category list merging base categories with actual Shopify product categories
  const activeCategoryList = useMemo(() => {
    const baseList = selectedGenderMode === 'Women' ? FEMALE_CATEGORIES : MALE_CATEGORIES;
    const existingIds = new Set(baseList.map((c) => c.id.toLowerCase()));

    const extraCats: { id: string; label: string; keywords: string[] }[] = [];

    const sourceProducts = matchedProducts.length > 0 ? matchedProducts : products;

    (sourceProducts || []).forEach((p) => {
      if (selectedGenderMode === 'Women' && !isFemaleProduct(p)) return;
      if (selectedGenderMode === 'Men' && !isMaleProduct(p)) return;

      const cat = p.category?.trim();
      if (cat && !existingIds.has(cat.toLowerCase())) {
        existingIds.add(cat.toLowerCase());
        extraCats.push({
          id: cat,
          label: cat,
          keywords: [cat.toLowerCase()],
        });
      }
    });

    return [...baseList, ...extraCats];
  }, [products, matchedProducts, selectedGenderMode]);

  // Dynamic Budget bounds derived directly from catalog prices
  const catalogBounds = useMemo(() => {
    const sourceProducts = matchedProducts.length > 0 ? matchedProducts : products;
    if (!sourceProducts || sourceProducts.length === 0) return { min: 0, max: 25000 };
    const prices = sourceProducts
      .map((p) => safeNumber(p.directPrice ?? p.price ?? 0))
      .filter((pr) => pr > 0);
    if (prices.length === 0) return { min: 0, max: 25000 };
    return {
      min: Math.floor(Math.min(...prices)),
      max: Math.ceil(Math.max(...prices)),
    };
  }, [products, matchedProducts]);

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

  /**
   * Normalizes queries to handle common clothing terms, hyphens, and plurals.
   */
  const normalizeQuery = (query: string): string => {
    if (!query) return '';
    let cleaned = query.trim().toLowerCase();
    // Normalize T-Shirt & Tee variations to a single token 'tshirt'
    cleaned = cleaned.replace(/\b(t[\s\-]?shirts?|tees?)\b/gi, 'tshirt');
    return cleaned;
  };

  /**
   * Prepares product text fields for strict keyword scanning.
   */
  const normalizeText = (text: string): string => {
    if (!text) return '';
    let cleaned = text.toLowerCase();
    // Convert "t-shirt", "t shirt", "t-shirts", "tee", "tees" in product text to "tshirt"
    cleaned = cleaned.replace(/\b(t[\s\-]?shirts?|tees?)\b/gi, 'tshirt');
    return cleaned;
  };

  // Strict Search Matching Engine (Exact Word Boundaries, No Cross-Category Leakage)
  const filterProductsBySearchIntent = (
    allProducts: Product[],
    rawQuery: string,
    genderMode: 'Men' | 'Women' | null
  ): Product[] => {
    if (!rawQuery || !rawQuery.trim()) return [];

    const rawLower = rawQuery.trim().toLowerCase();

    // 1. Price Limit Extraction
    let maxPrice: number | null = null;
    const priceMatch = rawLower.match(/(?:under|below|less than|within|max|<=?)\s*₹?\s*(\d+)/i);
    if (priceMatch && priceMatch[1]) {
      maxPrice = parseInt(priceMatch[1], 10);
    }

    // 2. Gender Intent Extraction
    let queryGender: 'Men' | 'Women' | null = null;
    if (/\b(women|womens|female|ladies|girls|girl)\b/i.test(rawLower)) {
      queryGender = 'Women';
    } else if (/\b(men|mens|male|guys|gents|boys|boy)\b/i.test(rawLower)) {
      queryGender = 'Men';
    }

    const effectiveGender = queryGender || genderMode;

    // 3. Clean keywords (remove budget and gender filler phrases)
    const cleanKeywords = rawLower
      .replace(/(?:under|below|less than|above|over|more than|within|max|min)\s*₹?\s*\d+/gi, '')
      .replace(/\b(for men|for women|for guys|for ladies|for girls|for boys|for gents|men|women|mens|womens)\b/gi, '')
      .replace(/\b(show me|find me|looking for|buy|cheap|best|need|i want|give me|products|items)\b/gi, '')
      .trim();

    // 4. Normalize query text
    const normalizedQueryStr = normalizeQuery(cleanKeywords || rawLower);
    const queryTokens = normalizedQueryStr.split(/\s+/).filter((t) => t.length > 0);

    if (queryTokens.length === 0) return [];

    const scoredCandidates = allProducts.map((p) => {
      const dPrice = Number(p.directPrice ?? p.price ?? 0);

      // Hard Price Limit Check
      if (maxPrice !== null && dPrice > maxPrice) {
        return { product: p, score: -1 };
      }

      // Strict Gender Check
      if (effectiveGender === 'Men' && !isMaleProduct(p)) {
        return { product: p, score: -1 };
      }
      if (effectiveGender === 'Women' && !isFemaleProduct(p)) {
        return { product: p, score: -1 };
      }

      // Normalize Product Fields
      const normName = normalizeText(p.name || (p as any).title || '');
      const normDesc = normalizeText(p.description || '');
      const normCat = normalizeText(p.category || '');
      const normBrand = normalizeText(p.brand || '');
      const normSpecs = normalizeText((p.specs || []).map((s) => `${s.label} ${s.value}`).join(' '));

      const combinedText = `${normName} ${normCat} ${normDesc} ${normBrand} ${normSpecs}`;

      // STRICT CHECK: Every query token MUST match as a full word boundary (\btoken\b) in combinedText
      const matchesAllTokens = queryTokens.every((token) => {
        const escapedToken = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`\\b${escapedToken}\\b`, 'i');
        return regex.test(combinedText);
      });

      if (!matchesAllTokens) {
        return { product: p, score: -1 };
      }

      // FIELD SCORING & WEIGHTING
      let score = 0;
      queryTokens.forEach((token) => {
        const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const reg = new RegExp(`\\b${escaped}\\b`, 'i');

        if (reg.test(normName)) score += 20;      // Title match receives highest priority
        if (reg.test(normCat)) score += 12;       // Category match
        if (reg.test(normSpecs)) score += 8;      // Specs match
        if (reg.test(normBrand)) score += 5;      // Brand match
        if (reg.test(normDesc)) score += 3;       // Description match
      });

      return { product: p, score: Math.max(score, 1) };
    }).filter((c) => c.score > 0);

    scoredCandidates.sort((a, b) => b.score - a.score);

    const matched = scoredCandidates.map((c) => c.product);

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

    return mixedResults;
  };

  // Perform AI Search with Real-Time Instant Local Match & Progressive Stream
  const handlePerformSearch = async (searchPrompt: string) => {
    if (!searchPrompt.trim()) return;

    const trimmed = searchPrompt.trim();
    setActiveSearchQuery(trimmed);
    setIsSearching(true);
    setSearchResult(null);

    // Log search query to Firestore DB
    logSearchQueryToDb('demo-user-1', trimmed);

    // 1. INSTANT SIMULTANEOUS LOCAL MATCH (In Milliseconds!)
    const pool = products.length > 0 ? products : await getLiveProductsFromDb(products);
    const instantMatches = filterProductsBySearchIntent(pool, trimmed, selectedGenderMode);

    setMatchedProducts(instantMatches);
    if (instantMatches.length > 0) {
      setSelectedRandomProduct(instantMatches[0]);
      if (!selectedGenderMode) {
        setSelectedGenderMode(isMaleProduct(instantMatches[0]) ? 'Men' : 'Women');
      }
    } else {
      setSelectedRandomProduct(null);
    }
    setIsSearching(false);

    // 2. Fetch progressive stream from server to append/enrich results
    try {
      const response = await fetch('/api/v1/search/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: trimmed, category: selectedCategoryFilter })
      });

      if (response.ok && response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';
        let streamedRaw: Product[] = [];

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const data = JSON.parse(line);

              if (data.type === 'INTENT_HEADER') {
                const maxP = data.intent?.max_price;
                const kw = data.intent?.search_keywords || trimmed;

                setSearchResult({
                  summary: data.summary || `AI Engine parsed "${trimmed}" with hard price constraint ≤ ₹${maxP || 'N/A'}.`,
                  intent: {
                    clean_query: kw,
                    category: selectedCategoryFilter || 'Streetwear & Apparel',
                    max_price: maxP,
                    min_price: null,
                    gender_target: data.intent?.gender_target || null,
                    spec_tags: maxP ? [`Max Price ≤ ₹${maxP}`, 'Verified D2C'] : ['Verified D2C'],
                    expanded_synonyms: data.intent?.synonyms || [],
                    boosted_brand: null
                  },
                  reasoningSteps: [
                    `🤖 Stage 1: AI Intent Parsed -> Clean Keyword "${kw}"`,
                    '🎯 Stage 2: Category & Gender Conflict Filter Applied (Strict Matching)',
                    '⚡ Stage 3: Instant Display Enabled'
                  ],
                  recommendationTips: ['Direct brand checkout available with fast delivery.'],
                  suggestedFollowUps: ['Filter by price', 'Compare fabric specs']
                });
              } else if (data.type === 'PRODUCT_BATCH') {
                const batch: Product[] = data.products || [];
                streamedRaw = [...streamedRaw, ...batch];
                const filteredStreamed = filterProductsBySearchIntent(streamedRaw, trimmed, selectedGenderMode);
                if (filteredStreamed.length > 0) {
                  setMatchedProducts(filteredStreamed);
                  if (!selectedRandomProduct) {
                    setSelectedRandomProduct(filteredStreamed[0]);
                  }
                }
              }
            } catch (err) {
              console.warn('Stream parse error:', err);
            }
          }
        }
      }
    } catch (err) {
      console.warn('Server streaming search endpoint notice:', err);
    }

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

    if (typeof window !== 'undefined' && !window.location.pathname.toLowerCase().startsWith('/products')) {
      window.history.pushState({}, '', '/products');
    }

    applyActiveFilters(
      gender,
      isBudgetApplied ? appliedMinBudget : null,
      isBudgetApplied ? appliedMaxBudget : null
    );
  };

  useEffect(() => {
    if (products.length > 0 && selectedGenderMode) {
      applyActiveFilters(
        selectedGenderMode,
        isBudgetApplied ? appliedMinBudget : null,
        isBudgetApplied ? appliedMaxBudget : null
      );
    }
  }, [products]);

  // Sync state on browser back/forward buttons between /explore and /products
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.toLowerCase();
      if (path.startsWith('/explore')) {
        setSelectedGenderMode(null);
        setSelectedRandomProduct(null);
      } else if (path.startsWith('/products')) {
        if (!selectedGenderMode) {
          handleSelectGender('Men');
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [selectedGenderMode, products]);

  const handleResetSearch = () => {
    setActiveSearchQuery(null);
    setSearchResult(null);
    setQuery('');
    setMatchedProducts([]);
    setSelectedRandomProduct(null);
    setSelectedGenderMode(null);
    if (typeof window !== 'undefined' && !window.location.pathname.toLowerCase().startsWith('/explore')) {
      window.history.pushState({}, '', '/explore');
    }
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

            {/* Shopify Connect Scraper Modal Button */}
            <button
              onClick={() => setIsShopifyConnectOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-emerald-400 font-mono text-xs font-bold flex items-center gap-1.5 border border-slate-700 hover:border-emerald-500/50 shadow-sm cursor-pointer transition-all"
              title="Connect & Scrape Shopify Store"
            >
              <Store className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Shopify Connect</span>
            </button>

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
          {selectedRandomProduct ? (
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
                      if (typeof window !== 'undefined' && !window.location.pathname.toLowerCase().startsWith('/explore')) {
                        window.history.pushState({}, '', '/explore');
                      }
                    }}
                    className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/80 hover:bg-white backdrop-blur-xl border border-white/60 text-slate-900 flex items-center justify-center shrink-0 shadow-lg transition-all active:scale-95 cursor-pointer -translate-y-2.5 sm:-translate-y-3"
                    title="Back"
                  >
                    <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
                  </button>

                  {/* Center: ShopScoper Brand Logo */}
                  <div className="flex items-center justify-center flex-1 h-10 px-2">
                    <BrandLogo size="md" />
                  </div>

                  {/* Right Action Icons: Search Icon (Q), and Wishlist Heart (❤️) */}
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

                {/* Active Search Filter Badge */}
                {activeSearchQuery && (
                  <div 
                    onClick={(e) => e.stopPropagation()}
                    className="relative z-30 w-full max-w-xl lg:max-w-2xl mx-auto mt-2 px-1 flex items-center justify-center"
                  >
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 text-white border border-purple-400/40 shadow-xl backdrop-blur-md text-xs font-mono font-semibold">
                      <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse shrink-0" />
                      <span className="truncate">Search: <strong className="text-purple-300 font-sans">"{activeSearchQuery}"</strong> ({matchedProducts.length} items)</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleResetSearch();
                        }}
                        className="ml-1 w-4 h-4 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center cursor-pointer transition-colors shrink-0"
                        title="Clear Search"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )}

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

                  {/* Floating Glass Product Information Card - Ultra Transparent & Crystal Clear */}
                  <div className="m-2 sm:m-2.5 p-3.5 sm:p-4 rounded-[26px] bg-slate-950/30 backdrop-blur-md border border-white/25 shadow-2xl text-white space-y-2.5">
                    
                    {/* Card Header & Pricing */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-0.5 pr-2">
                        {/* Brand */}
                        <p className="text-[#A855F7] font-extrabold text-[11px] tracking-wider uppercase drop-shadow-xs">
                          {selectedRandomProduct.brand || 'MULMUL'}
                        </p>

                        {/* Product Name */}
                        <h2 className="text-base sm:text-lg font-extrabold text-white leading-tight line-clamp-1 drop-shadow-sm">
                          {selectedRandomProduct.name}
                        </h2>

                        {/* Pricing Row */}
                        <div className="flex items-baseline gap-2 pt-0.5">
                          <span className="text-xl sm:text-2xl font-extrabold text-[#A855F7] tracking-tight drop-shadow-xs">
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
                        className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/40 backdrop-blur-md shadow-lg border border-white/35 flex items-center justify-center shrink-0 active:scale-90 transition-all cursor-pointer"
                        title="Toggle Wishlist"
                      >
                        <Heart className={`w-4 h-4 ${wishlistIds.includes(selectedRandomProduct.id) ? 'fill-[#FF2D55] text-[#FF2D55]' : 'text-white'}`} />
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
                        className="py-2.5 sm:py-3 px-3.5 rounded-xl bg-gradient-to-r from-[#6C3BFF] via-[#8B5CFF] to-[#FF2D55] hover:opacity-95 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-md shadow-purple-500/30 active:scale-[0.98] transition-all cursor-pointer"
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
                        className="py-2.5 sm:py-3 px-3.5 rounded-xl bg-[#0B132B]/90 hover:bg-[#0B132B] text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-md shadow-slate-900/30 active:scale-[0.98] transition-all cursor-pointer border border-white/10"
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
                        src="/male_SS.png"
                        loading="eager"
                        decoding="async"
                        onError={(e) => {
                          const target = e.currentTarget;
                          if (!target.dataset.triedFallback) {
                            target.dataset.triedFallback = 'true';
                            target.src = '/male_ss.png';
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
                        src="/Female_SS.png"
                        loading="eager"
                        decoding="async"
                        onError={(e) => {
                          const target = e.currentTarget;
                          if (!target.dataset.triedFallback) {
                            target.dataset.triedFallback = 'true';
                            target.src = '/female_ss.png';
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

                {/* SHOPIFY CONNECT HOMEPAGE CARD & BANNER */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="mt-6 w-full max-w-sm sm:max-w-xl md:max-w-2xl mx-auto px-2 sm:px-4"
                >
                  <div 
                    onClick={() => setIsShopifyConnectOpen(true)}
                    className="group relative rounded-2xl bg-slate-900 border border-slate-800 hover:border-emerald-500/50 p-4 sm:p-5 shadow-xl shadow-slate-950/20 hover:shadow-emerald-950/20 cursor-pointer transition-all duration-300 flex flex-col sm:flex-row items-center justify-between gap-4 overflow-hidden"
                  >
                    {/* Background Subtle Gradient Glow */}
                    <div className="absolute -right-10 -bottom-10 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all pointer-events-none" />

                    <div className="flex items-center gap-3.5 z-10 text-left">
                      <div className="w-11 h-11 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0 text-emerald-400 group-hover:scale-110 transition-transform">
                        <Store className="w-6 h-6 text-emerald-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider">Shopify Connect</span>
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">D2C Live Scraper</span>
                        </div>
                        <h4 className="text-sm sm:text-base font-bold text-white mt-0.5">Connect & Import Any Shopify Brand Store</h4>
                        <p className="text-xs text-slate-400 mt-0.5">Scrape products, auto-classify gender, and enable direct brand checkout permanently on <strong className="text-slate-200">/</strong> page.</p>
                      </div>
                    </div>

                    <div className="z-10 shrink-0 w-full sm:w-auto">
                      <button className="w-full sm:w-auto px-4 py-2 rounded-xl bg-emerald-500 group-hover:bg-emerald-400 text-slate-950 font-mono font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all">
                        <span>Launch Connector</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
        </AnimatePresence>

      </main>



      {/* Small Compact Floating Price Budget Trigger Tab (Pinned to Left Edge) - ONLY on Products Page */}
      {Boolean(selectedGenderMode || selectedRandomProduct) && (
        <>
          <div className="fixed left-0 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-2">
            {/* Budget Trigger Tab */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsBudgetSidebarOpen((prev) => !prev);
              }}
              className={`py-2 px-1.5 rounded-r-xl border border-l-0 shadow-lg flex flex-col items-center gap-1.5 cursor-pointer transition-all active:scale-95 backdrop-blur-xl ${
                isBudgetApplied
                  ? 'bg-[#6C3BFF] text-white border-purple-300 shadow-purple-500/30'
                  : 'bg-white/80 text-slate-900 border-white/80 hover:bg-white shadow-md'
              }`}
              title="Open Budget Filter"
            >
              <SlidersHorizontal className={`w-3.5 h-3.5 ${isBudgetApplied ? 'text-amber-300' : 'text-[#6C3BFF]'}`} />
              <span className="font-mono text-[10px] font-bold tracking-wider uppercase [writing-mode:vertical-lr] rotate-180">
                {isBudgetApplied ? `₹${appliedMinBudget}-₹${appliedMaxBudget}` : 'Budget'}
              </span>
              {isBudgetApplied && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              )}
            </button>
          </div>

          {/* Small Compact Translucent White Budget Popup Modal */}
          <AnimatePresence>
            {isBudgetSidebarOpen && (
              <>
                {/* Backdrop Overlay */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsBudgetSidebarOpen(false)}
                  className="fixed inset-0 bg-slate-950/30 backdrop-blur-xs z-50 cursor-pointer"
                />

                {/* Ultra-Compact Translucent White Popup Box */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, x: -15 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.9, x: -15 }}
                  transition={{ type: 'spring', damping: 25, stiffness: 320 }}
                  className="fixed left-2 sm:left-4 top-1/2 -translate-y-1/2 z-50 w-56 sm:w-64 bg-white/80 text-slate-900 backdrop-blur-2xl border border-white/90 p-3 rounded-2xl shadow-xl flex flex-col space-y-2.5 max-h-[85vh] overflow-y-auto scrollbar-none"
                >
                  {/* Header Row */}
                  <div className="flex items-center justify-between pb-1 border-b border-slate-200/60">
                    <div className="flex items-center gap-1.5">
                      <SlidersHorizontal className="w-3.5 h-3.5 text-[#6C3BFF]" />
                      <h3 className="font-extrabold text-xs text-slate-900">Budget Filter</h3>
                    </div>
                    <button
                      onClick={() => setIsBudgetSidebarOpen(false)}
                      className="w-5 h-5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Active Status Badge */}
                  {isBudgetApplied && (
                    <div className="px-2 py-1 rounded-lg bg-purple-50 border border-purple-200/80 flex items-center justify-between text-[10px] font-mono">
                      <span className="text-purple-700 font-bold flex items-center gap-1">
                        <Check className="w-3 h-3 text-emerald-600" /> Active
                      </span>
                      <button
                        onClick={handleResetBudget}
                        className="text-rose-600 hover:underline font-bold cursor-pointer"
                      >
                        Reset
                      </button>
                    </div>
                  )}

                  {/* Price Range Display */}
                  <div className="py-1 px-2 rounded-xl bg-slate-100/80 border border-slate-200/60 text-center">
                    <span className="text-[9px] text-slate-400 font-mono font-bold uppercase tracking-wider block">Budget Range</span>
                    <span className="text-sm font-extrabold text-[#6C3BFF] font-mono">
                      ₹{minBudget.toLocaleString('en-IN')} - ₹{maxBudget.toLocaleString('en-IN')}
                    </span>
                  </div>

                  {/* Min Price Slider */}
                  <div className="space-y-0.5">
                    <div className="flex justify-between text-[10px] font-mono">
                      <span className="text-slate-500">Min:</span>
                      <span className="text-purple-700 font-bold">₹{minBudget.toLocaleString('en-IN')}</span>
                    </div>
                    <input
                      type="range"
                      min={catalogBounds.min}
                      max={catalogBounds.max}
                      step="100"
                      value={minBudget}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setMinBudget(val);
                        if (val > maxBudget) setMaxBudget(val + 100);
                      }}
                      className="w-full accent-[#6C3BFF] cursor-pointer h-1 bg-slate-200 rounded-lg"
                    />
                  </div>

                  {/* Max Price Slider */}
                  <div className="space-y-0.5">
                    <div className="flex justify-between text-[10px] font-mono">
                      <span className="text-slate-500">Max:</span>
                      <span className="text-emerald-600 font-bold">₹{maxBudget.toLocaleString('en-IN')}</span>
                    </div>
                    <input
                      type="range"
                      min={catalogBounds.min}
                      max={catalogBounds.max}
                      step="100"
                      value={maxBudget}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setMaxBudget(val);
                        if (val < minBudget) setMinBudget(Math.max(catalogBounds.min, val - 100));
                      }}
                      className="w-full accent-emerald-600 cursor-pointer h-1 bg-slate-200 rounded-lg"
                    />
                  </div>

                  {/* Quick Presets */}
                  <div className="pt-0.5">
                    <div className="grid grid-cols-2 gap-1">
                      {[
                        { label: '< ₹1.5k', min: 0, max: 1500 },
                        { label: '₹1.5k-3.5k', min: 1500, max: 3500 },
                        { label: '₹3.5k-7k', min: 3500, max: 7000 },
                        { label: '> ₹7k', min: 7000, max: 25000 }
                      ].map((p) => (
                        <button
                          key={p.label}
                          onClick={() => {
                            setMinBudget(p.min);
                            setMaxBudget(p.max);
                            handleApplyBudget(p.min, p.max);
                          }}
                          className={`py-1 px-1.5 rounded-lg text-[10px] font-mono font-bold transition-all border cursor-pointer ${
                            appliedMinBudget === p.min && appliedMaxBudget === p.max
                              ? 'bg-[#6C3BFF] text-white border-purple-500 shadow-2xs'
                              : 'bg-white/80 hover:bg-white text-slate-700 border-slate-200/80'
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Apply Action Button */}
                  <div className="pt-1">
                    <button
                      onClick={() => handleApplyBudget()}
                      disabled={isPriceFiltering}
                      className="w-full py-1.5 px-2 rounded-xl bg-gradient-to-r from-[#6C3BFF] to-[#FF2D55] hover:opacity-95 text-white font-extrabold text-xs flex items-center justify-center gap-1 shadow-sm cursor-pointer active:scale-98 transition-all"
                    >
                      {isPriceFiltering ? (
                        <span className="animate-pulse font-mono text-[10px]">Filtering...</span>
                      ) : (
                        <>
                          <Check className="w-3 h-3" />
                          <span>Apply Filter</span>
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </>
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

      {/* Shopify Connect Modal */}
      <AnimatePresence>
        {isShopifyConnectOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-6 overflow-y-auto"
          >
            <div className="relative w-full max-w-6xl max-h-[92vh] overflow-y-auto bg-slate-950 border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-2xl">
              <button
                onClick={() => setIsShopifyConnectOpen(false)}
                className="absolute top-4 right-4 z-10 p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              <ShopifyStoresPage />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};
