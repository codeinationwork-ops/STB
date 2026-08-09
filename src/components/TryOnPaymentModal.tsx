import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, ShieldCheck, Zap, CreditCard, QrCode, CheckCircle2, Lock, ArrowRight } from 'lucide-react';

interface TryOnPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPaymentSuccess: (addedCredits: number) => void;
  productName?: string;
}

export const TryOnPaymentModal: React.FC<TryOnPaymentModalProps> = ({
  isOpen,
  onClose,
  onPaymentSuccess,
  productName
}) => {
  const [selectedMethod, setSelectedMethod] = useState<'upi' | 'card' | 'netbanking'>('upi');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handlePay = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        onPaymentSuccess(10);
      }, 1000);
    }, 1200);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden"
        >
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-purple-700 via-indigo-700 to-pink-600 p-6 text-white relative">
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-yellow-300 font-mono text-xs font-bold uppercase tracking-wider mb-2">
              <Sparkles className="w-4 h-4 fill-yellow-300" />
              <span>Out of Free Try-On Credits</span>
            </div>

            <h3 className="text-xl font-extrabold tracking-tight">
              Unlock 10 AI Virtual Try-Ons
            </h3>

            {productName && (
              <p className="text-xs text-purple-200 mt-1 truncate">
                Item: <strong className="text-white">{productName}</strong>
              </p>
            )}

            {/* Price Badge */}
            <div className="mt-4 inline-flex items-baseline gap-2 bg-white/15 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/20">
              <span className="text-2xl font-black font-mono text-white">₹90</span>
              <span className="text-xs font-medium text-purple-200 line-through">₹499</span>
              <span className="text-[10px] font-bold bg-yellow-400 text-slate-900 px-1.5 py-0.5 rounded font-mono">
                SAVE 82%
              </span>
            </div>
          </div>

          {/* Body */}
          <div className="p-6 space-y-5">
            {/* Features list */}
            <div className="space-y-2.5 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs">
              <div className="flex items-center gap-2 text-slate-700 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span><strong>10 Credits</strong> added instantly to your user account</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>High-Precision Garment & Pattern Neural Fitting</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Valid on all D2C Brands & Store Catalog Items</span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider font-mono">
                Select Payment Method
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedMethod('upi')}
                  className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                    selectedMethod === 'upi'
                      ? 'border-purple-600 bg-purple-50 text-purple-900 shadow-xs'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <QrCode className="w-5 h-5 text-purple-600" />
                  <span>UPI / GPay</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedMethod('card')}
                  className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                    selectedMethod === 'card'
                      ? 'border-purple-600 bg-purple-50 text-purple-900 shadow-xs'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <CreditCard className="w-5 h-5 text-purple-600" />
                  <span>Cards</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedMethod('netbanking')}
                  className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                    selectedMethod === 'netbanking'
                      ? 'border-purple-600 bg-purple-50 text-purple-900 shadow-xs'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <Zap className="w-5 h-5 text-purple-600" />
                  <span>NetBanking</span>
                </button>
              </div>
            </div>

            {/* Payment Action Button */}
            <div className="pt-2">
              <button
                onClick={handlePay}
                disabled={isProcessing || isSuccess}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-purple-600/25 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-75"
              >
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Processing Payment via Gateway...</span>
                  </>
                ) : isSuccess ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-300" />
                    <span>Payment Successful! Adding 10 Credits...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 text-purple-200" />
                    <span>Pay ₹90 & Get 10 Try-Ons</span>
                    <ArrowRight className="w-4 h-4 text-purple-200" />
                  </>
                )}
              </button>
            </div>

            <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 font-mono">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>256-Bit SSL Encrypted Razorpay Gateway</span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
