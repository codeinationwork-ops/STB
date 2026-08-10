import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Search, Heart, Sparkles, ShoppingBag } from 'lucide-react';
import { Product } from '../types';
import { BrandLogo } from './BrandLogo';

interface QuickViewModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  isWishlisted: boolean;
  onToggleWishlist: (product: Product) => void;
  onExpressBuy: (product: Product) => void;
  onTryOn?: (product: Product) => void;
  wishlistCount?: number;
  onOpenSearch?: () => void;
  onOpenWishlist?: () => void;
}

export const QuickViewModal: React.FC<QuickViewModalProps> = ({
  product,
  isOpen,
  onClose,
  isWishlisted,
  onToggleWishlist,
  onExpressBuy,
  onTryOn,
  wishlistCount = 0,
  onOpenSearch,
  onOpenWishlist,
}) => {
  const [selectedImgIndex, setSelectedImgIndex] = useState(0);

  if (!product || !isOpen) return null;

  const images = product.images && product.images.length > 0 ? product.images : ['/Female_SS.png'];
  const currentImg = images[selectedImgIndex % images.length] || images[0];
  const priceSavings = Math.max(0, product.marketplacePrice - product.directPrice);
  const savingsPercent = product.marketplacePrice > 0 
    ? Math.round((priceSavings / product.marketplacePrice) * 100) 
    : 31;

  const totalDots = 4;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4 bg-slate-950/80 backdrop-blur-md overflow-hidden font-sans select-none">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Mobile-First Full-Height Screen / Desktop Frame */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-md h-full md:h-[92vh] md:max-h-[860px] bg-slate-900 md:rounded-[36px] overflow-hidden shadow-2xl flex flex-col justify-between z-10"
        >
          {/* Background Hero Product Image (Fills ~85-90% of screen) */}
          <div className="absolute inset-0 w-full h-full bg-slate-900">
            <img
              src={currentImg}
              alt={product.name}
              className="w-full h-full object-cover object-top"
            />
            {/* Subtle Gradient Overlays for readability */}
            <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-slate-950/60 via-slate-950/20 to-transparent pointer-events-none" />
            <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-slate-950/70 via-slate-950/20 to-transparent pointer-events-none" />
          </div>

          {/* Floating Header */}
          <header className="relative z-30 flex items-center justify-between px-4 sm:px-5 pt-3 pb-2">
            {/* Back Button */}
            <button
              onClick={onClose}
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/80 hover:bg-white backdrop-blur-xl border border-white/60 text-slate-900 flex items-center justify-center shadow-lg transition-all active:scale-90 -translate-y-2.5 sm:-translate-y-3"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5 stroke-[2.5] text-slate-900" />
            </button>

            {/* Centered ShopScoper Brand Logo */}
            <div className="flex items-center justify-center h-10 px-2">
              <BrandLogo size="md" />
            </div>

            {/* Right Action Icons (Search & Wishlist) */}
            <div className="flex items-center gap-2 -translate-y-2.5 sm:-translate-y-3">
              {/* Search Button */}
              <button
                onClick={onOpenSearch}
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/80 hover:bg-white backdrop-blur-xl border border-white/60 text-slate-900 flex items-center justify-center shadow-lg transition-all active:scale-90"
                aria-label="Search"
              >
                <Search className="w-5 h-5 stroke-[2.5] text-slate-900" />
              </button>

              {/* Wishlist Button with Red Notification Badge */}
              <button
                onClick={onOpenWishlist || (() => onToggleWishlist(product))}
                className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/80 hover:bg-white backdrop-blur-xl border border-white/60 text-slate-900 flex items-center justify-center shadow-lg transition-all active:scale-90"
                aria-label="Wishlist"
              >
                <Heart className={`w-5 h-5 stroke-[2.5] ${isWishlisted ? 'fill-red-500 text-red-500' : 'text-slate-900'}`} />
                {wishlistCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-[#FF2D55] text-white font-mono text-[10px] font-extrabold w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center border-2 border-white shadow-md">
                    {wishlistCount}
                  </span>
                )}
              </button>
            </div>
          </header>

          {/* Lower Floating Overlay Elements */}
          <div className="relative z-30 mt-auto flex flex-col justify-end">
            
            {/* Product Image Counter (Lower Left) */}
            <div className="px-5 mb-2 flex items-center justify-between">
              <div className="px-3 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/20 text-white font-mono text-xs font-bold tracking-wider shadow-md">
                {selectedImgIndex + 1} / {images.length > 1 ? images.length : 6}
              </div>

              {/* Centered Four Carousel Dots */}
              <div className="flex items-center gap-1.5 mx-auto -ml-12">
                {Array.from({ length: totalDots }).map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImgIndex(idx % images.length)}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      (selectedImgIndex % totalDots) === idx 
                        ? 'w-5 bg-white shadow-md' 
                        : 'w-2 bg-white/50 hover:bg-white/80'
                    }`}
                    aria-label={`Slide ${idx + 1}`}
                  />
                ))}
              </div>
            </div>

            {/* Floating Glass Product Information Card - Ultra Transparent & Crystal Clear */}
            <div className="m-2.5 sm:m-3 p-3.5 sm:p-4 rounded-[26px] bg-slate-950/30 backdrop-blur-md border border-white/25 shadow-2xl text-white space-y-2.5">
              
              {/* Card Header & Price */}
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-0.5 pr-2">
                  {/* Brand */}
                  <p className="text-[#A855F7] font-extrabold text-[11px] tracking-wider uppercase drop-shadow-xs">
                    {product.brand || 'MULMUL'}
                  </p>

                  {/* Product Name */}
                  <h2 className="text-base sm:text-lg font-extrabold text-white leading-tight line-clamp-1 drop-shadow-sm">
                    {product.name}
                  </h2>

                  {/* Pricing Row */}
                  <div className="flex items-baseline gap-2 pt-0.5">
                    <span className="text-xl sm:text-2xl font-extrabold text-[#A855F7] tracking-tight drop-shadow-xs">
                      ₹{product.directPrice.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* Floating Wishlist Button on Top Right of Card */}
                <button
                  onClick={() => onToggleWishlist(product)}
                  className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/40 backdrop-blur-md shadow-lg border border-white/35 flex items-center justify-center shrink-0 active:scale-90 transition-all cursor-pointer"
                  aria-label="Toggle Wishlist"
                >
                  <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-[#FF2D55] text-[#FF2D55]' : 'text-white'}`} />
                </button>
              </div>

              {/* Action Buttons (Only 2 buttons: Try-On & Shop Now) */}
              <div className="grid grid-cols-2 gap-2.5 pt-0.5">
                {/* Try-On Button (Purple → Pink Gradient) */}
                <button
                  onClick={() => {
                    if (onTryOn) {
                      onTryOn(product);
                    } else {
                      onExpressBuy(product);
                    }
                  }}
                  className="py-2.5 sm:py-3 px-3.5 rounded-xl bg-gradient-to-r from-[#6C3BFF] via-[#8B5CFF] to-[#FF2D55] hover:opacity-95 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-md shadow-purple-500/20 active:scale-[0.98] transition-all"
                >
                  <Sparkles className="w-4 h-4 text-amber-300 fill-amber-300" />
                  <span>Try-On</span>
                </button>

                {/* Shop Now Button (Dark Navy) */}
                <button
                  onClick={() => {
                    const bestCode = (product.active_promo_code || product.couponCode || '').trim();
                    let storeDom = product.store_domain || product.officialUrl || '';
                    if (storeDom && !storeDom.startsWith('http://') && !storeDom.startsWith('https://')) {
                      storeDom = 'https://' + storeDom;
                    }
                    if (product.cart_permalink) {
                      let checkoutUrl = product.cart_permalink;
                      if (bestCode && !checkoutUrl.includes('/discount/')) {
                        const varId = product.variant_id;
                        if (varId && storeDom) {
                          checkoutUrl = `${storeDom}/discount/${encodeURIComponent(bestCode)}?redirect=/cart/${varId}:1`;
                        } else if (!checkoutUrl.includes('discount=')) {
                          checkoutUrl += (checkoutUrl.includes('?') ? '&' : '?') + `discount=${encodeURIComponent(bestCode)}`;
                        }
                      }
                      window.open(checkoutUrl, '_blank');
                    } else if (product.variant_id && storeDom) {
                      const checkoutUrl = bestCode
                        ? `${storeDom}/discount/${encodeURIComponent(bestCode)}?redirect=/cart/${product.variant_id}:1`
                        : `${storeDom}/cart/${product.variant_id}:1?checkout`;
                      window.open(checkoutUrl, '_blank');
                    } else {
                      onExpressBuy(product);
                    }
                    onClose();
                  }}
                  className="py-2.5 sm:py-3 px-3.5 rounded-xl bg-[#0B132B] hover:bg-slate-800 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-md shadow-slate-900/20 active:scale-[0.98] transition-all cursor-pointer"
                >
                  <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  <span>Shop Now</span>
                </button>
              </div>

            </div>

          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

