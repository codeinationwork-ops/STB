import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SlidersHorizontal, ArrowUpDown, Filter, Sparkles, Grid, LayoutGrid, Check, RefreshCw, Bot, ShieldCheck } from 'lucide-react';
import { Product } from '../types';
import { ProductCard } from './ProductCard';
import { safeNumber } from '../lib/firestoreService';
import { matchesCategoryFilter, MALE_CATEGORIES, FEMALE_CATEGORIES } from './GeminiSearchLanding';
import { verifyProductsWithGeminiAI, getAICachedVerification } from '../lib/geminiCategoryVerifier';

interface ProductGridProps {
  products: Product[];
  wishlistIds: string[];
  selectedCategory?: string;
  onSelectCategory?: (categoryName: string) => void;
  onToggleWishlist: (product: Product) => void;
  onExpressBuy: (product: Product) => void;
  onQuickView: (product: Product) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  showOnlyPriceDrops: boolean;
  setShowOnlyPriceDrops: (show: boolean) => void;
}

export const ProductGrid: React.FC<ProductGridProps> = ({
  products,
  wishlistIds,
  onToggleWishlist,
  onExpressBuy,
  onQuickView,
  searchQuery,
  setSearchQuery,
  showOnlyPriceDrops,
  setShowOnlyPriceDrops
}) => {
  const [sortBy, setSortBy] = useState<'savings' | 'price-asc' | 'price-desc' | 'rating'>('savings');
  const [minPriceInput, setMinPriceInput] = useState<number>(0);
  const [maxPriceInput, setMaxPriceInput] = useState<number>(25000);
  const [appliedMinPrice, setAppliedMinPrice] = useState<number>(0);
  const [appliedMaxPrice, setAppliedMaxPrice] = useState<number>(25000);
  const [isPriceFilterApplied, setIsPriceFilterApplied] = useState<boolean>(false);
  const [isCompactLayout, setIsCompactLayout] = useState<boolean>(false);
  const [selectedGender, setSelectedGender] = useState<'All' | 'Men' | 'Women' | 'Unisex'>('All');

  // Dynamic Min & Max Prices calculated from Shopify / Catalog Products
  const { minCatalogPrice, maxCatalogPrice } = useMemo(() => {
    if (!products || products.length === 0) return { minCatalogPrice: 0, maxCatalogPrice: 20000 };
    const prices = products
      .map((p) => safeNumber(p.directPrice ?? p.price ?? 0))
      .filter((pr) => pr > 0);

    if (prices.length === 0) return { minCatalogPrice: 0, maxCatalogPrice: 20000 };

    return {
      minCatalogPrice: Math.floor(Math.min(...prices)),
      maxCatalogPrice: Math.ceil(Math.max(...prices)),
    };
  }, [products]);

  // Sync inputs with catalog bounds initially or when catalog changes
  useEffect(() => {
    if (!isPriceFilterApplied) {
      setMinPriceInput(minCatalogPrice);
      setMaxPriceInput(maxCatalogPrice);
    }
  }, [minCatalogPrice, maxCatalogPrice, isPriceFilterApplied]);

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

  // Dynamic Categories derived directly from Shopify products for selected gender
  const categories = useMemo(() => {
    const baseList = selectedGender === 'Women' ? FEMALE_CATEGORIES : MALE_CATEGORIES;
    const catLabels = baseList.map((c) => c.id);
    const existingSet = new Set(catLabels.map((c) => c.toLowerCase()));

    const relevantProducts = products.filter((p) => {
      if (selectedGender === 'Men') return isMaleProduct(p);
      if (selectedGender === 'Women') return isFemaleProduct(p);
      if (selectedGender === 'Unisex') return p.gender === 'Unisex';
      return true;
    });

    relevantProducts.forEach((p) => {
      const c = p.category?.trim();
      if (c && !existingSet.has(c.toLowerCase())) {
        existingSet.add(c.toLowerCase());
        catLabels.push(c);
      }
    });

    return catLabels;
  }, [products, selectedGender]);



  // Filtered & Sorted Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Gender Filter
      if (selectedGender !== 'All') {
        if (selectedGender === 'Men') {
          if (!isMaleProduct(p)) return false;
        } else if (selectedGender === 'Women') {
          if (!isFemaleProduct(p)) return false;
        } else if (selectedGender === 'Unisex') {
          if (p.gender !== 'Unisex') return false;
        }
      }
      // Search Query Filter
      if (searchQuery.trim() !== '') {
        const queryTokens = searchQuery.toLowerCase().split(/\s+/).filter(Boolean);
        const searchable = `${p.name} ${p.brand} ${p.category} ${p.description || ''} ${p.specs.map(s => `${s.label} ${s.value}`).join(' ')}`.toLowerCase();
        
        const matchesAllTokens = queryTokens.every((token) => {
          if (searchable.includes(token)) return true;
          if ((token === 'hoodie' || token === 'hoodies') && (searchable.includes('hoodie') || searchable.includes('hoodies') || searchable.includes('sweatshirt') || searchable.includes('pullover'))) {
            return true;
          }
          return false;
        });

        if (!matchesAllTokens) return false;
      }
      // Price Drop Filter
      if (showOnlyPriceDrops) {
        const hasPriceDrop = p.badge?.includes('Drop') || (p.marketplacePrice - p.directPrice) > 300;
        if (!hasPriceDrop) return false;
      }
      // Budget Range Filter
      if (isPriceFilterApplied) {
        if (p.directPrice < appliedMinPrice || p.directPrice > appliedMaxPrice) {
          return false;
        }
      }
      return true;
    }).sort((a, b) => {
      if (sortBy === 'savings') {
        const savingsA = a.marketplacePrice - a.directPrice;
        const savingsB = b.marketplacePrice - b.directPrice;
        return savingsB - savingsA;
      }
      if (sortBy === 'price-asc') {
        return a.directPrice - b.directPrice;
      }
      if (sortBy === 'price-desc') {
        return b.directPrice - a.directPrice;
      }
      if (sortBy === 'rating') {
        return b.rating - a.rating;
      }
      return 0;
    });
  }, [products, searchQuery, showOnlyPriceDrops, isPriceFilterApplied, appliedMinPrice, appliedMaxPrice, sortBy, selectedGender]);

  return (
    <section id="products-matrix" className="w-full py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        
        {/* Header Controls & Filter Tabs */}
        <div className="space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            
            {/* Title & Stats */}
            <div>
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono font-bold uppercase tracking-widest">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                Live Product Comparison Matrix
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
                Direct Brand Catalog
                <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                  {filteredProducts.length} Items Match
                </span>
              </h2>


            </div>

            {/* Controls Bar: Sort, Price Filter, View Toggle */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">

              {/* Gender Filter Tabs */}
              <div className="flex items-center gap-1 bg-[#18181B] border border-[#27272A] p-1 rounded-xl">
                <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase px-2">Audience:</span>
                {(['All', 'Men', 'Women', 'Unisex'] as const).map((gender) => (
                  <button
                    key={gender}
                    onClick={() => setSelectedGender(gender)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                      selectedGender === gender
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-zinc-400 hover:text-white hover:bg-[#27272A]'
                    }`}
                  >
                    {gender === 'All' ? 'All Genders' : gender}
                  </button>
                ))}
              </div>
              
              {/* Price Drop Filter Toggle */}
              <button
                onClick={() => setShowOnlyPriceDrops(!showOnlyPriceDrops)}
                className={`px-3 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-all border ${
                  showOnlyPriceDrops
                    ? 'bg-rose-500 text-white border-rose-400 shadow-lg shadow-rose-500/30'
                    : 'bg-[#18181B] text-zinc-400 border-[#27272A] hover:text-white'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${showOnlyPriceDrops ? 'bg-white animate-ping' : 'bg-rose-500'}`}></span>
                Price Drops Only
              </button>

              {/* Price Range Budget Bar with Min/Max and Apply Button */}
              <div className="flex flex-wrap items-center gap-2 bg-[#18181B] border border-[#27272A] px-3 py-2 rounded-xl text-xs font-mono text-zinc-300">
                <span className="text-zinc-400 font-bold whitespace-nowrap">Budget Range:</span>
                
                {/* Min Slider */}
                <div className="flex items-center gap-1">
                  <span className="text-zinc-500 text-[10px]">Min: ₹{minPriceInput.toLocaleString('en-IN')}</span>
                  <input
                    type="range"
                    min={minCatalogPrice}
                    max={maxCatalogPrice}
                    step="100"
                    value={minPriceInput}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setMinPriceInput(val);
                      if (val > maxPriceInput) setMaxPriceInput(val + 100);
                    }}
                    className="w-16 sm:w-20 accent-indigo-500 cursor-pointer"
                  />
                </div>

                {/* Max Slider */}
                <div className="flex items-center gap-1">
                  <span className="text-emerald-400 text-[10px] font-bold">Max: ₹{maxPriceInput.toLocaleString('en-IN')}</span>
                  <input
                    type="range"
                    min={minCatalogPrice}
                    max={maxCatalogPrice}
                    step="100"
                    value={maxPriceInput}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setMaxPriceInput(val);
                      if (val < minPriceInput) setMinPriceInput(Math.max(minCatalogPrice, val - 100));
                    }}
                    className="w-16 sm:w-20 accent-emerald-500 cursor-pointer"
                  />
                </div>

                {/* Apply Button */}
                <button
                  onClick={() => {
                    setAppliedMinPrice(minPriceInput);
                    setAppliedMaxPrice(maxPriceInput);
                    setIsPriceFilterApplied(true);
                  }}
                  className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs transition-all shadow-sm cursor-pointer active:scale-95 flex items-center gap-1"
                >
                  <Filter className="w-3 h-3" />
                  <span>Apply</span>
                </button>

                {isPriceFilterApplied && (
                  <button
                    onClick={() => {
                      setMinPriceInput(minCatalogPrice);
                      setMaxPriceInput(maxCatalogPrice);
                      setAppliedMinPrice(minCatalogPrice);
                      setAppliedMaxPrice(maxCatalogPrice);
                      setIsPriceFilterApplied(false);
                    }}
                    className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white font-mono text-[11px] cursor-pointer"
                  >
                    Reset
                  </button>
                )}
              </div>

              {/* Sort Selector */}
              <div className="flex items-center gap-2 bg-[#18181B] border border-[#27272A] px-3 py-2 rounded-xl text-xs font-mono text-zinc-300">
                <ArrowUpDown className="w-3.5 h-3.5 text-indigo-400" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-transparent text-white focus:outline-none cursor-pointer"
                >
                  <option value="savings" className="bg-[#18181B]">Highest Savings %</option>
                  <option value="price-asc" className="bg-[#18181B]">Price: Low to High</option>
                  <option value="price-desc" className="bg-[#18181B]">Price: High to Low</option>
                  <option value="rating" className="bg-[#18181B]">Top Customer Rated</option>
                </select>
              </div>

              {/* Compact / Grid Layout Toggle */}
              <div className="flex items-center bg-[#18181B] border border-[#27272A] p-1 rounded-xl">
                <button
                  onClick={() => setIsCompactLayout(false)}
                  className={`p-1.5 rounded-lg transition-colors ${!isCompactLayout ? 'bg-[#27272A] text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                  title="Standard Grid"
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsCompactLayout(true)}
                  className={`p-1.5 rounded-lg transition-colors ${isCompactLayout ? 'bg-[#27272A] text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                  title="Dense Grid"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
              </div>

            </div>

          </div>
        </div>

        {/* Product Cards Grid */}
        {filteredProducts.length === 0 ? (
          <div className="rounded-2xl bg-[#18181B] border border-[#27272A] p-12 text-center space-y-4">
            <RefreshCw className="w-10 h-10 text-zinc-500 mx-auto animate-spin" />
            <h3 className="text-lg font-bold text-white">No D2C Items Match Your Filter Criteria</h3>
            <p className="text-xs text-zinc-400 max-w-md mx-auto">
              Try adjusting your max price range slider or searching for broader terms like "hoodie" or "pants".
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setShowOnlyPriceDrops(false);
                setMinPriceInput(0);
                setMaxPriceInput(15000);
                setAppliedMinPrice(0);
                setAppliedMaxPrice(15000);
                setIsPriceFilterApplied(false);
              }}
              className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-mono text-xs font-bold hover:bg-indigo-500 transition-colors"
            >
              Reset All Matrix Filters
            </button>
          </div>
        ) : (
          <motion.div
            layout
            className={`grid gap-6 ${
              isCompactLayout
                ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
                : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
            }`}
          >
            <AnimatePresence>
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  isWishlisted={wishlistIds.includes(product.id)}
                  onToggleWishlist={onToggleWishlist}
                  onExpressBuy={onExpressBuy}
                  onQuickView={onQuickView}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}

      </div>
    </section>
  );
};
