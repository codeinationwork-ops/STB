import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Zap, Heart, ShieldCheck, ShoppingBag, Sparkles, SlidersHorizontal, MapPin, ChevronDown, Bell, Bot, Globe, Store } from 'lucide-react';
import { UserAddress } from '../types';
import { BrandLogo } from './BrandLogo';

interface HeaderProps {
  onOpenSearch: () => void;
  onOpenWishlist: () => void;
  onOpenExpressDrawer: () => void;
  onOpenAddressVault: () => void;
  onOpenCrawler: () => void;
  onOpenGptTryOn?: (product?: any, imageUrl?: string) => void;
  wishlistCount: number;
  cartCount: number;
  totalSaved: number;
  defaultAddress: UserAddress;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenSearch,
  onOpenWishlist,
  onOpenExpressDrawer,
  onOpenAddressVault,
  onOpenCrawler,
  onOpenGptTryOn,
  wishlistCount,
  cartCount,
  totalSaved,
  defaultAddress
}) => {
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const placeholders = [
    'Search 380 GSM oversized hoodies...',
    'Search 10% Niacinamide serum...',
    'Search Retro chunky sneakers...',
    'Search Single-origin dark roast beans...',
    'Search MagSafe clear cases...'
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % placeholders.length);
    }, 3200);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#27272A]/80 bg-[#09090B]/85 backdrop-blur-xl">
      {/* Top Banner Ticker */}
      <div className="bg-gradient-to-r from-emerald-950/40 via-indigo-950/40 to-rose-950/40 border-b border-[#27272A]/50 px-4 py-1.5 text-xs text-zinc-300">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 overflow-hidden">
          <div className="flex items-center gap-2 text-emerald-400 font-mono text-[11px] truncate">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>LIVE INDEX: 12,400+ Direct Brand Gateways Synced</span>
          </div>

          <div className="hidden md:flex items-center gap-4 text-zinc-400 text-[11px]">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              100% Direct Brand Price Guarantee
            </span>
            <span className="text-zinc-600">•</span>
            <span className="text-zinc-300 font-medium">Zero Marketplace Platform Fees</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-4">
          
          {/* Brand Identity */}
          <div className="flex items-center shrink-0">
            <motion.div 
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="cursor-pointer group inline-block"
            >
              <BrandLogo size="md" />
            </motion.div>
          </div>

          {/* Omni Search Trigger Button */}
          <div className="flex-1 max-w-xl mx-2 sm:mx-4">
            <motion.button
              onClick={onOpenSearch}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="relative w-full group overflow-hidden rounded-xl bg-[#18181B] border border-[#27272A] hover:border-indigo-500/50 p-2 sm:px-4 sm:py-2.5 flex items-center justify-between text-left transition-all duration-300 shadow-inner"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 via-emerald-500/5 to-rose-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              
              <div className="flex items-center gap-2.5 text-zinc-400 text-sm overflow-hidden min-w-0">
                <Search className="w-4 h-4 text-indigo-400 shrink-0 group-hover:scale-110 transition-transform" />
                <AnimatePresence mode="wait">
                  <motion.span
                    key={placeholderIndex}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.25 }}
                    className="truncate text-zinc-400 text-xs sm:text-sm font-normal"
                  >
                    {placeholders[placeholderIndex]}
                  </motion.span>
                </AnimatePresence>
              </div>

              <div className="flex items-center gap-2 shrink-0 pl-2">
                <span className="hidden lg:flex items-center gap-1 text-[11px] font-mono bg-[#27272A] text-zinc-400 px-2 py-0.5 rounded border border-zinc-700">
                  <kbd>Ctrl</kbd> + <kbd>K</kbd>
                </span>
                <span className="p-1 rounded-lg bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-500/20">
                  <Sparkles className="w-3.5 h-3.5" />
                </span>
              </div>
            </motion.button>
          </div>

          {/* Dopamine Savings Ticker + Express User Vault */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">

            {/* Dopamine Savings Ticker Widget */}
            <motion.div
              whileHover={{ scale: 1.03 }}
              className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500/10 to-emerald-900/20 border border-emerald-500/30 text-emerald-400 text-xs shadow-lg shadow-emerald-950/20 cursor-default"
            >
              <div className="p-1 rounded-md bg-emerald-500/20 text-emerald-400">
                <Zap className="w-3.5 h-3.5 fill-emerald-400 animate-pulse" />
              </div>
              <div className="leading-tight">
                <div className="text-[10px] text-zinc-400 font-mono uppercase tracking-wider">Total Saved</div>
                <div className="font-bold text-sm text-emerald-400 font-mono">
                  ₹{totalSaved.toLocaleString('en-IN')}
                </div>
              </div>
            </motion.div>

            {/* Shopify Connect Button */}
            <motion.button
              onClick={onOpenCrawler}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#18181B] hover:bg-slate-800 border border-[#27272A] hover:border-emerald-500/50 text-emerald-400 font-mono font-bold text-xs transition-all cursor-pointer shadow-md"
              title="Connect & Scrape Shopify Store"
            >
              <Store className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Shopify Connect</span>
            </motion.button>

            {/* GPT TryOn Button */}
            {onOpenGptTryOn && (
              <motion.button
                onClick={onOpenGptTryOn}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-500/20 via-indigo-500/20 to-purple-500/20 border border-emerald-500/40 text-emerald-400 hover:border-emerald-400 transition-all font-mono font-bold text-xs shadow-md shadow-emerald-950/20 cursor-pointer"
                title="Launch OpenAI GPT TryOn AI"
              >
                <Zap className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400 animate-pulse" />
                <span className="hidden sm:inline">GPT TryOn</span>
                <span className="px-1 py-0.2 text-[9px] bg-emerald-500 text-black font-extrabold rounded">AI</span>
              </motion.button>
            )}

            {/* Wishlist Button */}
            <motion.button
              onClick={onOpenWishlist}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="relative p-2.5 rounded-xl bg-[#18181B] border border-[#27272A] text-zinc-300 hover:text-rose-400 hover:border-rose-500/40 transition-colors"
              title="View Wishlist & Price Alerts"
            >
              <Heart className={`w-5 h-5 ${wishlistCount > 0 ? 'fill-rose-500 text-rose-500' : ''}`} />
              {wishlistCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-rose-500 text-white font-mono text-[10px] font-bold flex items-center justify-center border-2 border-[#09090B]"
                >
                  {wishlistCount}
                </motion.span>
              )}
            </motion.button>

            {/* User Vault / Address Badge */}
            <motion.button
              onClick={onOpenAddressVault}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-2 rounded-xl bg-[#18181B] border border-[#27272A] hover:border-emerald-500/40 text-left transition-colors"
            >
              <div className="relative">
                <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg bg-gradient-to-tr from-indigo-600 to-emerald-500 p-0.5">
                  <img
                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
                    alt="User Avatar"
                    className="h-full w-full rounded-[6px] object-cover"
                  />
                </div>
                <span className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full bg-emerald-500 flex items-center justify-center border border-[#09090B]">
                  <ShieldCheck className="w-2.5 h-2.5 text-black stroke-[3]" />
                </span>
              </div>

              <div className="hidden xl:block leading-tight pr-1">
                <div className="flex items-center gap-1 text-xs font-semibold text-white">
                  <span>{defaultAddress.name}</span>
                  <span className="px-1 text-[9px] bg-emerald-500/20 text-emerald-400 font-mono rounded">
                    Express 1-Click
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-zinc-400 truncate max-w-[130px]">
                  <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span className="truncate">{defaultAddress.city}</span>
                </div>
              </div>

              <ChevronDown className="w-3.5 h-3.5 text-zinc-400 hidden xl:block" />
            </motion.button>

          </div>

        </div>
      </div>
    </header>
  );
};
