import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Heart, Trash2, Zap, Sparkles, ShoppingBag, Store, ExternalLink } from 'lucide-react';
import { Product } from '../types';
import { normalizeStoreAndBrandName } from '../lib/firestoreService';

interface WishlistDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  wishlistProducts: Product[];
  onRemoveFromWishlist: (productId: string) => void;
  onExpressBuy: (product: Product) => void;
  onTryOn?: (product: Product) => void;
}

export const WishlistDrawer: React.FC<WishlistDrawerProps> = ({
  isOpen,
  onClose,
  wishlistProducts,
  onRemoveFromWishlist,
  onExpressBuy,
  onTryOn
}) => {
  if (!isOpen) return null;

  const totalWishlistSavings = wishlistProducts.reduce(
    (acc, p) => acc + (p.marketplacePrice - p.directPrice),
    0
  );

  // Group wishlist items by Brand/Store name
  const brandGroups: Record<string, Product[]> = {};
  wishlistProducts.forEach((p) => {
    const brandName = normalizeStoreAndBrandName(
      p.brand,
      p.officialUrl || p.store_domain,
      (p as any).vendor || (p as any).store_name
    );
    if (!brandGroups[brandName]) {
      brandGroups[brandName] = [];
    }
    brandGroups[brandName].push(p);
  });

  const brandEntries = Object.entries(brandGroups);

  // Helper to trigger Shop Direct for single or multiple items from a brand
  const handleShopDirectForBrand = (products: Product[]) => {
    if (!products || products.length === 0) return;

    if (products.length === 1) {
      onExpressBuy(products[0]);
      onClose();
      return;
    }

    // Multiple products from the same store: build Shopify bulk cart permalink or express link
    const firstProd = products[0];
    let storeDom = firstProd.store_domain || firstProd.officialUrl || '';
    if (storeDom && !storeDom.startsWith('http://') && !storeDom.startsWith('https://')) {
      storeDom = 'https://' + storeDom;
    }
    
    // Extract base store origin
    try {
      if (storeDom) {
        const parsed = new URL(storeDom);
        storeDom = parsed.origin;
      }
    } catch (e) {
      // fallback
    }

    const variantPairs: string[] = [];
    products.forEach((p) => {
      if (p.variant_id) {
        variantPairs.push(`${p.variant_id}:1`);
      } else if (p.id && /^\d+$/.test(p.id)) {
        variantPairs.push(`${p.id}:1`);
      }
    });

    const activeCode = (firstProd.active_promo_code || firstProd.couponCode || 'D2C100').trim();

    if (variantPairs.length > 0 && storeDom) {
      const cartItemsPath = variantPairs.join(',');
      const cartUrl = activeCode
        ? `${storeDom}/discount/${encodeURIComponent(activeCode)}?redirect=/cart/${cartItemsPath}`
        : `${storeDom}/cart/${cartItemsPath}?checkout`;
      
      window.open(cartUrl, '_blank');
    } else {
      // Fallback if no variant IDs exist
      products.forEach((p, idx) => {
        let url = p.cart_permalink || p.officialUrl || p.store_domain || '';
        if (url && !url.startsWith('http')) url = 'https://' + url;
        if (url) {
          setTimeout(() => window.open(url, '_blank'), idx * 350);
        }
      });
    }

    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-hidden">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        />

        <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            className="w-screen max-w-md bg-white border-l border-slate-200 shadow-2xl flex flex-col justify-between text-slate-900 font-sans"
          >
            {/* Header */}
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-red-600 text-white shadow-md">
                  <Heart className="w-5 h-5 fill-white" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-slate-900">
                    Wishlist
                  </h2>
                  <p className="text-xs text-slate-500 font-mono">
                    Track items & direct store checkouts
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-2 rounded-xl bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content List */}
            <div className="p-5 overflow-y-auto flex-1 space-y-5">
              {wishlistProducts.length === 0 ? (
                <div className="text-center py-16 space-y-3">
                  <Heart className="w-12 h-12 text-slate-300 mx-auto stroke-1" />
                  <h3 className="text-sm font-bold text-slate-900">Your Wishlist is Empty</h3>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">
                    Click the heart icon on any product card to save items and shop direct!
                  </p>
                </div>
              ) : (
                <>
                  <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-center justify-between text-xs font-mono">
                    <span className="text-red-700 font-bold">Potential Direct Savings:</span>
                    <span className="text-red-600 font-black text-sm">
                      ₹{totalWishlistSavings.toLocaleString('en-IN')}
                    </span>
                  </div>

                  {brandEntries.map(([brandName, brandProducts]) => {
                    const groupSavings = brandProducts.reduce(
                      (acc, p) => acc + (p.marketplacePrice - p.directPrice),
                      0
                    );

                    return (
                      <div
                        key={brandName}
                        className="rounded-2xl bg-slate-50 border border-slate-200 overflow-hidden shadow-xs space-y-0"
                      >
                        {/* Brand Section Header */}
                        <div className="p-3.5 bg-slate-100/90 border-b border-slate-200 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Store className="w-4 h-4 text-purple-600" />
                            <h3 className="text-xs font-black font-mono text-slate-900 uppercase tracking-wide">
                              {brandName}
                            </h3>
                          </div>
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                            {brandProducts.length} {brandProducts.length === 1 ? 'item' : 'items'}
                          </span>
                        </div>

                        {/* Items under this Brand */}
                        <div className="p-3.5 space-y-3 divide-y divide-slate-200/60">
                          {brandProducts.map((p, idx) => (
                            <div key={p.id} className={`${idx > 0 ? 'pt-3' : ''} space-y-2.5`}>
                              <div className="flex items-center gap-3">
                                <img
                                  src={p.images[0]}
                                  alt={p.name}
                                  className="w-16 h-16 rounded-xl object-cover border border-slate-200 shrink-0"
                                />
                                <div className="flex-1 min-w-0">
                                  <h4 className="text-xs font-bold text-slate-900 truncate">
                                    {p.name}
                                  </h4>
                                  <div className="flex items-baseline gap-1.5 font-mono text-xs mt-1">
                                    <span className="font-extrabold text-purple-600">
                                      ₹{p.directPrice.toLocaleString('en-IN')}
                                    </span>
                                    <span className="text-slate-400 line-through text-[11px]">
                                      ₹{p.marketplacePrice.toLocaleString('en-IN')}
                                    </span>
                                  </div>
                                </div>

                                <button
                                  onClick={() => onRemoveFromWishlist(p.id)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                  title="Remove item"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>

                              {/* Individual Item Action Buttons */}
                              <div className="grid grid-cols-2 gap-2">
                                <button
                                  onClick={() => {
                                    if (onTryOn) {
                                      onTryOn(p);
                                      onClose();
                                    }
                                  }}
                                  className="py-1.5 px-2.5 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:to-pink-600 text-white font-mono text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs"
                                >
                                  <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                                  <span>Try-On</span>
                                </button>

                                <button
                                  onClick={() => {
                                    onExpressBuy(p);
                                    onClose();
                                  }}
                                  className="py-1.5 px-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-mono text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                                >
                                  <ShoppingBag className="w-3.5 h-3.5 text-emerald-400" />
                                  <span>Shop Direct</span>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* If multiple items from the same brand, show bulk Send-All-To-Cart bar */}
                        {brandProducts.length > 1 && (
                          <div className="p-3 bg-purple-50 border-t border-purple-100">
                            <button
                              onClick={() => handleShopDirectForBrand(brandProducts)}
                              className="w-full py-2.5 px-3 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-mono text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md shadow-purple-700/20"
                            >
                              <ShoppingBag className="w-4 h-4 text-emerald-300" />
                              <span>Shop Direct — Send All {brandProducts.length} Items to Cart</span>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </>
              )}
            </div>

          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
};

