import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, X, Sparkles, TrendingUp, ShieldCheck, ArrowUpRight, Zap, Filter } from 'lucide-react';
import { Product } from '../types';
import { strictProductSearch } from '../lib/strictSearch';

interface OmniSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onSelectProduct: (product: Product) => void;
  onSelectCategory: (category: string) => void;
}

export const OmniSearchModal: React.FC<OmniSearchModalProps> = ({
  isOpen,
  onClose,
  products,
  onSelectProduct,
  onSelectCategory
}) => {
  const [query, setQuery] = useState('');

  const popularSearches = [
    'Boxy Heavyweight Hoodie',
    'Niacinamide 10%',
    'Comet Chunky Sneakers',
    'Dark Roast Whole Beans',
    'MagSafe Armor Case',
    'Merino Wool Shoes'
  ];

  const results = !query.trim() ? [] : strictProductSearch(products, query);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          // Open search modal
        }
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto p-4 sm:p-6 md:p-20">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          className="relative mx-auto max-w-2xl overflow-hidden rounded-2xl bg-[#09090B] border border-[#27272A] shadow-2xl z-10"
        >
          {/* Input Header */}
          <div className="relative flex items-center border-b border-[#27272A] px-4 py-3 bg-[#18181B]">
            <Search className="w-5 h-5 text-indigo-400 shrink-0 mr-3" />
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search D2C products, specs, GSM, ingredients, brands..."
              className="w-full bg-transparent text-white placeholder-zinc-500 focus:outline-none text-sm font-medium"
            />
            {query && (
              <button onClick={() => setQuery('')} className="p-1 text-zinc-400 hover:text-white mr-2">
                <X className="w-4 h-4" />
              </button>
            )}
            <kbd className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono text-zinc-400 bg-[#27272A] rounded border border-zinc-700">
              ESC
            </kbd>
          </div>

          {/* Results or Quick Suggestions */}
          <div className="p-4 max-h-[60vh] overflow-y-auto space-y-4">
            
            {/* When Query is Empty */}
            {!query ? (
              <div className="space-y-4">
                <div>
                  <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-400 mb-2 flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                    Popular Direct D2C Searches
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {popularSearches.map((term) => (
                      <button
                        key={term}
                        onClick={() => setQuery(term)}
                        className="px-3 py-1.5 rounded-xl bg-[#18181B] border border-[#27272A] text-xs text-zinc-300 hover:text-white hover:border-indigo-500/50 transition-colors flex items-center gap-1.5"
                      >
                        <span>{term}</span>
                        <ArrowUpRight className="w-3 h-3 text-zinc-500" />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t border-[#27272A]">
                  <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-400 mb-2 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                    Direct Brand Quick Links
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {['Streetwear & Oversized', 'Clean Beauty & Skincare', 'Indie Footwear', 'Artisanal Coffee'].map((cat) => (
                      <button
                        key={cat}
                        onClick={() => {
                          onSelectCategory(cat);
                          onClose();
                        }}
                        className="p-3 rounded-xl bg-[#18181B] border border-[#27272A] hover:border-indigo-500/40 text-left text-zinc-300 hover:text-white flex items-center justify-between"
                      >
                        <span>{cat}</span>
                        <ArrowUpRight className="w-3.5 h-3.5 text-indigo-400" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : results.length === 0 ? (
              <div className="text-center py-8 text-zinc-400 space-y-2">
                <p className="text-sm">No items found matching "{query}"</p>
                <p className="text-xs text-zinc-500">
                  Try searching for "Snitch", "Serum", "Coffee", or "Sneakers".
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <h4 className="text-xs font-mono text-zinc-400 uppercase tracking-wider mb-2">
                  {results.length} Product Matches Found
                </h4>
                {results.map((product) => {
                  const savings = product.marketplacePrice - product.directPrice;
                  return (
                    <motion.div
                      key={product.id}
                      whileHover={{ scale: 1.01 }}
                      onClick={() => {
                        onSelectProduct(product);
                        onClose();
                      }}
                      className="p-3 rounded-xl bg-[#18181B] border border-[#27272A] hover:border-emerald-500/50 cursor-pointer flex items-center justify-between gap-3 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={product.images[0]}
                          alt=""
                          className="w-12 h-12 rounded-lg object-cover border border-[#27272A] shrink-0"
                        />
                        <div className="min-w-0">
                          <span className="text-[10px] font-mono text-indigo-400 font-bold uppercase">
                            {product.brand}
                          </span>
                          <h5 className="text-xs font-bold text-white truncate">
                            {product.name}
                          </h5>
                          <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-400">
                            <span>₹{product.directPrice}</span>
                            <span className="line-through text-zinc-600">₹{product.marketplacePrice}</span>
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        <span className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 text-xs font-mono font-bold border border-emerald-500/20">
                          Save ₹{savings}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}

          </div>

          {/* Footer Info */}
          <div className="px-4 py-2.5 bg-[#18181B] border-t border-[#27272A] text-[11px] font-mono text-zinc-500 flex justify-between items-center">
            <span>D2C Index Omni-Search Matrix</span>
            <span className="text-emerald-400 font-bold">12,400+ Live Products</span>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
};
