import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, Zap, ArrowRight, ShieldCheck, MapPin, ExternalLink, Copy, Check } from 'lucide-react';
import { Product, UserAddress } from '../types';

interface HandoffSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderInfo: {
    product: Product;
    address: UserAddress;
    totalAmount: number;
    orderId: string;
    trackingToken: string;
  } | null;
}

export const HandoffSuccessModal: React.FC<HandoffSuccessModalProps> = ({
  isOpen,
  onClose,
  orderInfo
}) => {
  const [copiedTracking, setCopiedTracking] = React.useState(false);

  if (!isOpen || !orderInfo) return null;

  const { product, address, totalAmount, orderId, trackingToken } = orderInfo;

  const handleCopy = () => {
    navigator.clipboard.writeText(trackingToken);
    setCopiedTracking(true);
    setTimeout(() => setCopiedTracking(false), 2000);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto p-4 sm:p-6 md:p-12 flex items-center justify-center font-sans">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-lg bg-white border border-red-300 rounded-3xl overflow-hidden shadow-2xl z-10 p-6 space-y-5 text-center text-slate-900"
        >
          {/* Top Success Badge */}
          <div className="mx-auto w-16 h-16 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg shadow-red-600/30">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-mono font-bold text-red-600 bg-red-50 px-2.5 py-0.5 rounded-full border border-red-200 uppercase">
              1-Click Direct Gateway Success
            </span>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              Direct Order Confirmed!
            </h2>
            <p className="text-xs text-slate-500 font-mono">
              Processed directly on <strong className="text-slate-800">{product.brand}</strong>'s official merchant server.
            </p>
          </div>

          {/* Order Details Card */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 text-left">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-200">
              <img
                src={product.images[0]}
                alt={product.name}
                className="w-12 h-12 rounded-xl object-cover border border-slate-200"
              />
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-mono text-red-600 font-bold uppercase">
                  {product.brand}
                </span>
                <h4 className="text-xs font-bold text-slate-900 truncate">
                  {product.name}
                </h4>
                <span className="text-xs font-bold font-mono text-slate-900">
                  ₹{totalAmount.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-1">
              <div>
                <span className="text-slate-500 text-[10px] block">ORDER REF</span>
                <span className="font-bold text-slate-900">{orderId}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] block">DELIVERY VAULT</span>
                <span className="font-bold text-slate-900 truncate block">{address.city}, {address.pincode}</span>
              </div>
            </div>

            {/* Tracking token */}
            <div className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between font-mono text-xs">
              <div>
                <span className="text-[9px] text-slate-400 block font-bold uppercase">D2C Direct Tracking ID</span>
                <span className="font-bold text-red-600">{trackingToken}</span>
              </div>
              <button
                onClick={handleCopy}
                className="p-1.5 rounded-lg bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600 transition-colors"
                title="Copy Token"
              >
                {copiedTracking ? <Check className="w-4 h-4 text-red-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full py-3.5 px-4 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black text-sm font-mono shadow-lg shadow-red-600/30 transition-all"
          >
            Back to Search Engine
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
