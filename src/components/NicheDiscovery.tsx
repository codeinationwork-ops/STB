import React, { useRef } from 'react';
import { motion } from 'motion/react';
import { Sparkles, ArrowRight, Store, ChevronLeft, ChevronRight, Layers } from 'lucide-react';
import { CategoryItem } from '../types';

interface NicheDiscoveryProps {
  categories: CategoryItem[];
  selectedCategory: string;
  onSelectCategory: (categoryName: string) => void;
}

export const NicheDiscovery: React.FC<NicheDiscoveryProps> = ({
  categories,
  selectedCategory,
  onSelectCategory
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = direction === 'left' ? -340 : 340;
      scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <section className="w-full py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
        
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-mono font-bold uppercase tracking-widest">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              Direct Brand Categories
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              Niche Discovery Stream
              <span className="text-xs font-mono font-normal text-zinc-400 bg-[#18181B] px-2 py-0.5 rounded border border-[#27272A]">
                400+ Verified Native Stores
              </span>
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onSelectCategory('All')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium font-mono transition-all border ${
                selectedCategory === 'All'
                  ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-600/30'
                  : 'bg-[#18181B] text-zinc-400 border-[#27272A] hover:text-white'
              }`}
            >
              Show All Categories
            </button>
            <div className="hidden sm:flex items-center gap-1.5 pl-2">
              <button
                onClick={() => handleScroll('left')}
                className="p-2 rounded-xl bg-[#18181B] border border-[#27272A] text-zinc-400 hover:text-white hover:border-zinc-600 transition-colors"
                title="Scroll Left"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleScroll('right')}
                className="p-2 rounded-xl bg-[#18181B] border border-[#27272A] text-zinc-400 hover:text-white hover:border-zinc-600 transition-colors"
                title="Scroll Right"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Horizontal Scrollable Carousel */}
        <div
          ref={scrollContainerRef}
          className="flex gap-4 overflow-x-auto pb-4 scrollbar-none snap-x snap-mandatory"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.name;

            return (
              <motion.div
                key={cat.id}
                whileHover={{ y: -4, scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onSelectCategory(cat.name)}
                className={`snap-start shrink-0 w-[280px] sm:w-[320px] rounded-2xl overflow-hidden cursor-pointer border relative group transition-all duration-300 shadow-xl ${
                  isSelected
                    ? 'border-indigo-500 ring-2 ring-indigo-500/50 shadow-indigo-950/50'
                    : 'border-[#27272A] hover:border-indigo-500/50'
                }`}
              >
                {/* Background Image Overlay */}
                <div className="relative h-48 w-full overflow-hidden bg-zinc-900">
                  <img
                    src={cat.image}
                    alt={cat.name}
                    className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-700 brightness-75"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#18181B] via-[#18181B]/60 to-transparent"></div>

                  {/* Category Tag Badge */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#09090B]/80 backdrop-blur-md border border-[#27272A] text-emerald-400 text-[10px] font-mono font-bold uppercase tracking-wider">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    {cat.tag}
                  </div>

                  {/* Store Count Badge */}
                  <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#09090B]/80 backdrop-blur-md border border-[#27272A] text-zinc-300 text-[11px] font-mono">
                    <Store className="w-3 h-3 text-indigo-400" />
                    <span>{cat.storeCount} Stores</span>
                  </div>
                </div>

                {/* Content Footer */}
                <div className="p-4 bg-[#18181B] space-y-2">
                  <h3 className="text-lg font-bold text-white group-hover:text-indigo-400 transition-colors flex items-center justify-between">
                    <span>{cat.name}</span>
                    <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
                  </h3>

                  <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                    {cat.description}
                  </p>

                  {/* Popular Brand Pills */}
                  <div className="pt-2 flex flex-wrap gap-1">
                    {cat.popularBrands.map((brand) => (
                      <span
                        key={brand}
                        className="text-[10px] font-mono bg-[#09090B] text-zinc-300 px-2 py-0.5 rounded border border-[#27272A]"
                      >
                        {brand}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
