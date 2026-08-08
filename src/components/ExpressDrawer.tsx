import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Zap, ShieldCheck, MapPin, CheckCircle2, Lock, ArrowRight, Tag, Loader2 } from 'lucide-react';
import { Product, UserAddress } from '../types';

interface ExpressDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  userAddress: UserAddress;
  onOpenAddressVault: () => void;
  onHandoffSuccess: (product: Product, address: UserAddress, finalTotal: number) => void;
}

export const ExpressDrawer: React.FC<ExpressDrawerProps> = ({
  isOpen,
  onClose,
  product,
  userAddress,
  onOpenAddressVault,
  onHandoffSuccess
}) => {
  const [selectedSize, setSelectedSize] = useState<string>(product?.sizes ? product.sizes[0] : '');
  const [promoApplied, setPromoApplied] = useState<boolean>(true);
  const [isHandoffProgress, setIsHandoffProgress] = useState<boolean>(false);
  const [handoffStep, setHandoffStep] = useState<number>(0);

  if (!product) return null;

  const basePrice = product.directPrice;
  const promoDiscount = promoApplied ? (product.couponDiscount || 150) : 0;
  const shippingFee = 0; // FREE Express Shipping
  const finalTotal = basePrice - promoDiscount + shippingFee;
  const totalSavedVsMarketplace = (product.marketplacePrice - product.directPrice) + promoDiscount;

  const handleStartHandoff = () => {
    setIsHandoffProgress(true);
    setHandoffStep(1); // Verifying stock

    setTimeout(() => {
      setHandoffStep(2); // Generating Direct Merchant Token
    }, 1200);

    setTimeout(() => {
      setHandoffStep(3); // Connecting to Merchant Payment Gateway
    }, 2400);

    setTimeout(() => {
      setIsHandoffProgress(false);
      setHandoffStep(0);

      // Auto-apply best available discount code on merchant's checkout screen
      const activeCode = (promoApplied ? (product.active_promo_code || product.couponCode || 'D2C100') : '').trim();
      let storeDom = product.store_domain || product.officialUrl || '';
      if (storeDom && !storeDom.startsWith('http://') && !storeDom.startsWith('https://')) {
        storeDom = 'https://' + storeDom;
      }

      let checkoutUrl = product.cart_permalink || '';
      if (!checkoutUrl && storeDom && product.variant_id) {
        checkoutUrl = activeCode
          ? `${storeDom}/discount/${encodeURIComponent(activeCode)}?redirect=/cart/${product.variant_id}:1`
          : `${storeDom}/cart/${product.variant_id}:1?checkout`;
      } else if (checkoutUrl && activeCode && !checkoutUrl.includes('/discount/')) {
        const varId = product.variant_id;
        if (varId && storeDom) {
          checkoutUrl = `${storeDom}/discount/${encodeURIComponent(activeCode)}?redirect=/cart/${varId}:1`;
        } else if (!checkoutUrl.includes('discount=')) {
          checkoutUrl += (checkoutUrl.includes('?') ? '&' : '?') + `discount=${encodeURIComponent(activeCode)}`;
        }
      }

      if (checkoutUrl) {
        window.open(checkoutUrl, '_blank');
      }

      onHandoffSuccess(product, userAddress, finalTotal);
    }, 3600);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
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
                    <Zap className="w-5 h-5 fill-white" />
                  </div>
                  <div>
                    <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                      Express Direct Checkout
                    </h2>
                    <p className="text-xs text-slate-500 font-mono">
                      Official Gateway: <strong className="text-slate-800">{product.brand}</strong>
                    </p>
                  </div>
                </div>

                <button
                  onClick={onClose}
                  className="p-2 rounded-xl bg-slate-100 text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Scrollable Content */}
              <div className="p-5 overflow-y-auto flex-1 space-y-6">
                
                {/* Product Summary Card */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex gap-4">
                  <img
                    src={product.images[0]}
                    alt={product.name}
                    className="w-20 h-20 rounded-xl object-cover border border-slate-200 shrink-0"
                  />
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <span className="text-[10px] font-mono text-red-600 font-extrabold uppercase">
                      {product.brand}
                    </span>
                    <h4 className="text-xs font-bold text-slate-900 truncate">
                      {product.name}
                    </h4>

                    <div className="flex items-baseline gap-2">
                      <span className="text-base font-black font-mono text-red-600">
                        ₹{product.directPrice.toLocaleString('en-IN')}
                      </span>
                      <span className="text-xs font-mono text-slate-400 line-through">
                        ₹{product.marketplacePrice.toLocaleString('en-IN')}
                      </span>
                    </div>

                    {product.sizes && (
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-600 pt-1">
                        <span>Size:</span>
                        {product.sizes.map((sz) => (
                          <button
                            key={sz}
                            onClick={() => setSelectedSize(sz)}
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                              selectedSize === sz ? 'bg-red-600 text-white' : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {sz}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Express Address Vault */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-900">
                      <MapPin className="w-4 h-4 text-red-600" />
                      <span>Saved Address Vault</span>
                    </div>
                    <button
                      onClick={onOpenAddressVault}
                      className="text-[11px] font-mono text-red-600 hover:underline font-bold"
                    >
                      Change
                    </button>
                  </div>

                  <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-1">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                      <span>{userAddress.name}</span>
                      <span className="text-[10px] font-mono text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-200 font-bold">
                        {userAddress.label}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-tight">
                      {userAddress.street}, {userAddress.city}, {userAddress.state} - {userAddress.pincode}
                    </p>
                    <p className="text-[11px] text-slate-500 font-mono pt-0.5">
                      Phone: {userAddress.phone}
                    </p>
                  </div>
                </div>

                {/* Direct Promo Coupon */}
                {(product.couponCode || product.active_promo_code) && (
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-mono font-bold text-emerald-700">
                        <Tag className="w-4 h-4 text-emerald-600" />
                        <span>Best Storefront Discount Auto-Applied</span>
                      </div>
                      <button
                        onClick={() => setPromoApplied(!promoApplied)}
                        className="text-[11px] font-mono text-slate-500 hover:text-emerald-700 font-bold cursor-pointer"
                      >
                        {promoApplied ? 'Remove' : 'Apply'}
                      </button>
                    </div>

                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-900 font-bold bg-white px-2 py-0.5 rounded border border-emerald-200">
                        {product.active_promo_code || product.couponCode}
                      </span>
                      <span className="text-emerald-700 font-extrabold">-₹{product.couponDiscount || 150}</span>
                    </div>
                    <p className="text-[10px] text-emerald-800 font-mono">
                      ✨ Code will be auto-submitted via Storefront API redirect on checkout.
                    </p>
                  </div>
                )}

                {/* Price Breakdown */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5 text-xs font-mono">
                  <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                    Direct Price Breakdown
                  </h4>

                  <div className="flex justify-between text-slate-600">
                    <span>Base Store Price</span>
                    <span>₹{basePrice.toLocaleString('en-IN')}</span>
                  </div>

                  {promoApplied && (
                    <div className="flex justify-between text-red-600 font-bold">
                      <span>Brand Promo Token</span>
                      <span>-₹{promoDiscount}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-slate-600">
                    <span>Direct Express Delivery</span>
                    <span className="text-red-600 font-bold">FREE</span>
                  </div>

                  <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline text-sm font-bold text-slate-900">
                    <span>Final Payable Total</span>
                    <span className="text-xl font-black font-mono text-red-600">
                      ₹{finalTotal.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="p-2 rounded-lg bg-red-50 text-red-700 text-[11px] text-center font-bold border border-red-200">
                    🎉 You Save Total ₹{totalSavedVsMarketplace} vs Marketplace!
                  </div>
                </div>

              </div>

              {/* Footer Actions */}
              <div className="p-5 border-t border-slate-200 bg-slate-50 space-y-3">
                
                {isHandoffProgress ? (
                  <div className="p-4 rounded-xl bg-white border border-red-300 space-y-3 text-center shadow-sm">
                    <div className="flex items-center justify-center gap-2 text-red-600 font-mono text-xs font-bold">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>
                        {handoffStep === 1 && `Verifying Stock on ${product.brand}...`}
                        {handoffStep === 2 && `Issuing Express Token (${product.couponCode || 'D2C100'})...`}
                        {handoffStep === 3 && `Connecting to ${product.brand} Gateway...`}
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <motion.div
                        className="bg-red-600 h-full"
                        initial={{ width: '10%' }}
                        animate={{ width: handoffStep === 1 ? '35%' : handoffStep === 2 ? '70%' : '100%' }}
                        transition={{ duration: 0.8 }}
                      />
                    </div>
                  </div>
                ) : (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleStartHandoff}
                    className="w-full p-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-red-600/30"
                  >
                    <span>Proceed to {product.brand} Checkout</span>
                    <ArrowRight className="w-4 h-4 stroke-[3]" />
                  </motion.button>
                )}

                <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500 font-mono text-center">
                  <Lock className="w-3 h-3 text-red-600 shrink-0" />
                  <span>Payment processed securely on merchant's official gateway.</span>
                </div>

              </div>

            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};
