import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Heart, Trash2, Zap, Tag } from 'lucide-react';
import { Product } from '../types';

interface WishlistDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  wishlistProducts: Product[];
  onRemoveFromWishlist: (productId: string) => void;
  onExpressBuy: (product: Product) => void;
}

export const WishlistDrawer: React.FC<WishlistDrawerProps> = ({
  isOpen,
  onClose,
  wishlistProducts,
  onRemoveFromWishlist,
  onExpressBuy
}) => {
  if (!isOpen) return null;

  const totalWishlistSavings = wishlistProducts.reduce(
    (acc, p) => acc + (p.marketplacePrice - p.directPrice),
    0
  );

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
                    Wishlist Price Radar
                  </h2>
                  <p className="text-xs text-slate-500 font-mono">
                    Track price drops on official brand sites
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
            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              {wishlistProducts.length === 0 ? (
                <div className="text-center py-16 space-y-3">
                  <Heart className="w-12 h-12 text-slate-300 mx-auto stroke-1" />
                  <h3 className="text-sm font-bold text-slate-900">Your Wishlist is Empty</h3>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">
                    Click the heart icon on any product card to track direct site price drops!
                  </p>
                </div>
              ) : (
                <>
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 flex items-center justify-between text-xs font-mono">
                    <span className="text-red-700 font-bold">Potential Direct Savings:</span>
                    <span className="text-red-600 font-black text-sm">
                      ₹{totalWishlistSavings.toLocaleString('en-IN')}
                    </span>
                  </div>

                  {wishlistProducts.map((p) => {
                    const savings = p.marketplacePrice - p.directPrice;
                    return (
                      <div
                        key={p.id}
                        className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3"
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={p.images[0]}
                            alt={p.name}
                            className="w-16 h-16 rounded-xl object-cover border border-slate-200 shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <span className="text-[10px] font-mono text-red-600 font-extrabold uppercase">
                              {p.brand}
                            </span>
                            <h4 className="text-xs font-bold text-slate-900 truncate">
                              {p.name}
                            </h4>
                            <div className="flex items-baseline gap-1.5 font-mono text-xs">
                              <span className="font-bold text-red-600">₹{p.directPrice.toLocaleString('en-IN')}</span>
                              <span className="text-slate-400 line-through text-[11px]">₹{p.marketplacePrice.toLocaleString('en-IN')}</span>
                            </div>
                          </div>

                          <button
                            onClick={() => onRemoveFromWishlist(p.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Remove"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <button
                          onClick={() => {
                            onExpressBuy(p);
                            onClose();
                          }}
                          className="w-full py-2 px-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-mono text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-md shadow-red-600/20"
                        >
                          <Zap className="w-3.5 h-3.5 fill-white" />
                          <span>Buy Direct (Save ₹{savings})</span>
                        </button>
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
