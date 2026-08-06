import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SlidersHorizontal, ArrowUpDown, Filter, Sparkles, Grid, LayoutGrid, Check, RefreshCw } from 'lucide-react';
import { Product } from '../types';
import { ProductCard } from './ProductCard';

interface ProductGridProps {
  products: Product[];
  wishlistIds: string[];
  selectedCategory: string;
  onSelectCategory: (categoryName: string) => void;
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
  selectedCategory,
  onSelectCategory,
  onToggleWishlist,
  onExpressBuy,
  onQuickView,
  searchQuery,
  setSearchQuery,
  showOnlyPriceDrops,
  setShowOnlyPriceDrops
}) => {
  const [sortBy, setSortBy] = useState<'savings' | 'price-asc' | 'price-desc' | 'rating'>('savings');
  const [maxPriceFilter, setMaxPriceFilter] = useState<number>(15000);
  const [isCompactLayout, setIsCompactLayout] = useState<boolean>(false);
  const [selectedGender, setSelectedGender] = useState<'All' | 'Men' | 'Women' | 'Unisex'>('All');

  const categories = ['All', 'Streetwear & Oversized', 'Clean Beauty & Skincare', 'Indie Footwear', 'Artisanal Coffee', 'Tech & EDC'];

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
          if (isMaleProduct(p) || isFemaleProduct(p)) return false;
        }
      }
      // Category Filter
      if (selectedCategory !== 'All' && p.category !== selectedCategory) {
        return false;
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
      // Max Price Filter
      if (p.directPrice > maxPriceFilter) {
        return false;
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
  }, [products, selectedCategory, searchQuery, showOnlyPriceDrops, maxPriceFilter, sortBy, selectedGender]);

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

              {/* Price Slider Dropdown / Filter */}
              <div className="flex items-center gap-2 bg-[#18181B] border border-[#27272A] px-3 py-1.5 rounded-xl text-xs font-mono text-zinc-300">
                <span className="text-zinc-500">Max:</span>
                <span className="text-emerald-400 font-bold">₹{maxPriceFilter}</span>
                <input
                  type="range"
                  min="500"
                  max="4000"
                  step="250"
                  value={maxPriceFilter}
                  onChange={(e) => setMaxPriceFilter(Number(e.target.value))}
                  className="w-20 accent-emerald-500 cursor-pointer"
                />
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

          {/* Category Tabs Scrollbar */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => onSelectCategory(cat)}
                  className={`px-4 py-2 rounded-xl text-xs font-mono font-bold whitespace-nowrap transition-all border ${
                    isSelected
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-black border-emerald-400 shadow-lg shadow-emerald-500/20'
                      : 'bg-[#18181B] text-zinc-400 border-[#27272A] hover:text-white hover:border-zinc-600'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>

        </div>

        {/* Product Cards Grid */}
        {filteredProducts.length === 0 ? (
          <div className="rounded-2xl bg-[#18181B] border border-[#27272A] p-12 text-center space-y-4">
            <RefreshCw className="w-10 h-10 text-zinc-500 mx-auto animate-spin" />
            <h3 className="text-lg font-bold text-white">No D2C Items Match Your Filter Criteria</h3>
            <p className="text-xs text-zinc-400 max-w-md mx-auto">
              Try adjusting your max price range slider, resetting category filters, or searching for broader terms like "hoodie" or "serum".
            </p>
            <button
              onClick={() => {
                onSelectCategory('All');
                setSearchQuery('');
                setShowOnlyPriceDrops(false);
                setMaxPriceFilter(4000);
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
