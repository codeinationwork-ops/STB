import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Zap, Heart, ShieldCheck, Sparkles, ShoppingBag, Eye, TrendingDown, Clock, CheckCircle2, Star, ArrowUpRight, Copy, Check } from 'lucide-react';
import { Product } from '../types';
import { getOptimizedImageUrl, DEFAULT_PRODUCT_FALLBACK } from '../lib/imageUtils';

interface ProductCardProps {
  product: Product;
  isWishlisted: boolean;
  onToggleWishlist: (product: Product) => void;
  onExpressBuy: (product: Product) => void;
  onQuickView: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  isWishlisted,
  onToggleWishlist,
  onExpressBuy,
  onQuickView
}) => {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState(product.sizes ? product.sizes[0] : '');
  const [copiedCoupon, setCopiedCoupon] = useState(false);

  const priceSavings = product.marketplacePrice - product.directPrice;
  const savingsPercent = Math.round((priceSavings / product.marketplacePrice) * 100);

  const handleCopyCoupon = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (product.couponCode) {
      navigator.clipboard.writeText(product.couponCode);
      setCopiedCoupon(true);
      setTimeout(() => setCopiedCoupon(false), 2000);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      whileHover={{ y: -6 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className="group relative rounded-2xl bg-[#18181B] border border-[#27272A] hover:border-emerald-500/50 overflow-hidden shadow-xl hover:shadow-2xl hover:shadow-emerald-950/20 transition-all duration-300 flex flex-col justify-between"
    >
      {/* Top Media Container */}
      <div className="relative aspect-square w-full overflow-hidden bg-[#09090B] group/image cursor-pointer" onClick={() => onQuickView(product)}>
        
        {/* Main Product Image with Zoom on Hover */}
        <img
          src={getOptimizedImageUrl(product.images[activeImageIndex], 600)}
          alt={product.name}
          loading="lazy"
          decoding="async"
          onError={(e) => {
            const target = e.currentTarget;
            if (!target.dataset.triedFallback) {
              target.dataset.triedFallback = 'true';
              target.src = DEFAULT_PRODUCT_FALLBACK;
            }
          }}
          className="h-full w-full object-cover group-hover/image:scale-108 transition-transform duration-500 ease-out"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-[#18181B] via-transparent to-black/30"></div>

        {/* Top Badges Row */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 z-10">
          <div className="flex flex-col gap-1 items-start">
            {product.badge && (
              <span className="px-2.5 py-1 rounded-lg bg-[#09090B]/90 backdrop-blur-md border border-emerald-500/30 text-emerald-400 font-mono text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 shadow-lg">
                <Sparkles className="w-3 h-3 text-emerald-400" />
                {product.badge}
              </span>
            )}

            {/* Savings Tag */}
            <span className="px-2.5 py-0.5 rounded-md bg-emerald-500 text-black font-mono text-[11px] font-black uppercase tracking-tight shadow-md">
              Save ₹{priceSavings} ({savingsPercent}% OFF)
            </span>
          </div>

          {/* Wishlist Heart Button */}
          <motion.button
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.85 }}
            onClick={(e) => {
              e.stopPropagation();
              onToggleWishlist(product);
            }}
            className="p-2.5 rounded-xl bg-[#09090B]/80 backdrop-blur-md border border-[#27272A] hover:border-rose-500 text-zinc-300 hover:text-rose-400 transition-colors shadow-lg"
            title="Add to Wishlist"
          >
            <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-rose-500 text-rose-500' : ''}`} />
          </motion.button>
        </div>

        {/* Thumbnail Switcher Pill (Hover Overlay) */}
        {product.images.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 opacity-0 group-hover/image:opacity-100 transition-opacity duration-200 flex items-center gap-1.5 p-1 rounded-xl bg-[#09090B]/90 backdrop-blur-md border border-[#27272A] shadow-xl">
            {product.images.map((img, idx) => (
              <button
                key={idx}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveImageIndex(idx);
                }}
                className={`h-7 w-7 rounded-lg overflow-hidden border transition-all ${
                  activeImageIndex === idx ? 'border-emerald-400 scale-105' : 'border-transparent opacity-60 hover:opacity-100'
                }`}
              >
                <img src={img} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}

        {/* Quick View Button Overlay */}
        <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover/image:opacity-100 transition-opacity bg-black/40 backdrop-blur-[2px]">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onQuickView(product);
            }}
            className="px-3.5 py-2 rounded-xl bg-[#09090B] border border-zinc-700 text-white font-mono text-xs font-semibold flex items-center gap-1.5 hover:bg-zinc-800 transition-colors shadow-xl"
          >
            <Eye className="w-3.5 h-3.5 text-indigo-400" />
            <span>Specs</span>
          </button>
        </div>
      </div>

      {/* Product Information Body */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-4">
        
        <div>
          {/* Brand & Category Row */}
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-1.5 font-mono">
            <span className="text-indigo-400 font-bold uppercase tracking-wider flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              {product.brand}
            </span>
            <div className="flex items-center gap-1 text-amber-400 font-bold">
              <Star className="w-3.5 h-3.5 fill-amber-400" />
              <span>{product.rating}</span>
              <span className="text-zinc-500 font-normal">({product.reviewsCount})</span>
            </div>
          </div>

          {/* Title */}
          <h3
            onClick={() => onQuickView(product)}
            className="text-sm sm:text-base font-bold text-white line-clamp-2 hover:text-indigo-300 cursor-pointer transition-colors leading-snug"
          >
            {product.name}
          </h3>

          {/* PRICE COMPARISON MATRIX BADGE */}
          <div className="mt-3 p-3 rounded-xl bg-[#09090B] border border-[#27272A] space-y-2">
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-[10px] text-emerald-400 font-mono font-bold uppercase tracking-widest block">
                  Official Direct Price
                </span>
                <span className="text-xl font-black font-mono text-white tracking-tight">
                  ₹{product.directPrice.toLocaleString('en-IN')}
                </span>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest block line-through">
                  Original / Compare Price
                </span>
                <span className="text-sm font-bold font-mono text-zinc-500 line-through">
                  ₹{(product.compare_at_price || product.marketplacePrice).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Price Drop Indicator */}
            {(product.price_dropped || (product.compare_at_price && product.compare_at_price > product.directPrice)) && (
              <div className="px-2 py-1 rounded bg-rose-500/20 text-rose-400 text-[11px] font-mono font-bold border border-rose-500/30 flex items-center gap-1">
                <span>🔥 Price Dropped</span>
                {product.previous_price && (
                  <span className="text-zinc-400 font-normal">(Was ₹{product.previous_price.toLocaleString('en-IN')})</span>
                )}
              </div>
            )}

            {/* Active Auto-Apply Promo Code Badge */}
            {(product.active_promo_code || product.couponCode) && (
              <div className="pt-1 flex items-center justify-between border-t border-[#27272A] text-xs">
                <div className="flex items-center gap-1.5 text-indigo-400 font-mono text-[11px]">
                  <Zap className="w-3 h-3 fill-indigo-400" />
                  <span>Use code <strong>{product.active_promo_code || product.couponCode}</strong> at checkout</span>
                </div>
                <button
                  onClick={handleCopyCoupon}
                  className="px-2 py-0.5 rounded bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-mono flex items-center gap-1 transition-colors cursor-pointer"
                >
                  {copiedCoupon ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copiedCoupon ? 'Copied!' : 'Copy Code'}
                </button>
              </div>
            )}
          </div>

          {/* SPEC COMPARISON PILLS */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {product.specs.map((spec, idx) => (
              <span
                key={idx}
                className="px-2.5 py-1 rounded-lg bg-[#27272A]/60 text-zinc-300 text-[11px] font-medium border border-[#27272A] flex items-center gap-1"
              >
                <span className="text-zinc-500 font-normal">{spec.label}:</span>
                <span className="text-white font-semibold">{spec.value}</span>
              </span>
            ))}
          </div>

          {/* Size Selector if available */}
          {product.sizes && product.sizes.length > 0 && (
            <div className="mt-3 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              <span className="text-[10px] text-zinc-500 font-mono uppercase mr-1">Size:</span>
              {product.sizes.map((sz) => (
                <button
                  key={sz}
                  onClick={() => setSelectedSize(sz)}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                    selectedSize === sz
                      ? 'bg-indigo-600 text-white font-bold'
                      : 'bg-[#27272A] text-zinc-400 hover:text-white'
                  }`}
                >
                  {sz}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions & Stock Pulse */}
        <div className="pt-2 border-t border-[#27272A]/60 space-y-2.5">
          
          {/* Live Inventory Stock Pulse */}
          <div className="flex items-center justify-between text-xs text-zinc-400 font-mono">
            <div className="flex items-center gap-1.5 text-rose-400">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
              </span>
              <span className="font-semibold text-[11px]">
                Only {product.stockLeft} left at official site
              </span>
            </div>

            <span className="text-emerald-400 text-[11px] flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Express Dispatch
            </span>
          </div>

          {/* Primary Action Button: ⚡ Buy Direct (1-Click) */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              const bestCode = (product.active_promo_code || product.couponCode || '').trim();
              if (product.cart_permalink) {
                let checkoutUrl = product.cart_permalink;
                if (bestCode && !checkoutUrl.includes('/discount/')) {
                  const storeDom = product.store_domain || product.officialUrl || '';
                  const cleanDom = storeDom.startsWith('http') ? storeDom : `https://${storeDom}`;
                  const varId = product.variant_id;
                  if (varId) {
                    checkoutUrl = `${cleanDom}/discount/${encodeURIComponent(bestCode)}?redirect=/cart/${varId}:1`;
                  } else if (!checkoutUrl.includes('discount=')) {
                    checkoutUrl += (checkoutUrl.includes('?') ? '&' : '?') + `discount=${encodeURIComponent(bestCode)}`;
                  }
                }
                window.open(checkoutUrl, '_blank');
              } else if (product.store_domain && product.variant_id) {
                const storeDom = product.store_domain.startsWith('http') ? product.store_domain : `https://${product.store_domain}`;
                const checkoutUrl = bestCode
                  ? `${storeDom}/discount/${encodeURIComponent(bestCode)}?redirect=/cart/${product.variant_id}:1`
                  : `${storeDom}/cart/${product.variant_id}:1?checkout`;
                window.open(checkoutUrl, '_blank');
              } else {
                onExpressBuy(product);
              }
            }}
            className="w-full relative overflow-hidden rounded-xl bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-500 p-3 text-black font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all duration-300 cursor-pointer"
          >
            <div className="absolute inset-0 bg-white/20 opacity-0 hover:opacity-100 transition-opacity"></div>
            <Zap className="w-4 h-4 fill-black stroke-[2.5]" />
            <span>{(product.cart_permalink || product.variant_id) ? '⚡ Direct Shopify Checkout (Discount Auto-Applied)' : '⚡ Buy Direct (1-Click Express)'}</span>
            <ArrowUpRight className="w-4 h-4 ml-auto stroke-[2.5]" />
          </motion.button>

        </div>

      </div>
    </motion.div>
  );
};
