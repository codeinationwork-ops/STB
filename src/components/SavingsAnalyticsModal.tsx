import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Zap, TrendingDown, ArrowUpRight, BarChart3, ShieldCheck, Sparkles } from 'lucide-react';
import { SAVINGS_CHART_DATA } from '../constants';

interface SavingsAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SavingsAnalyticsModal: React.FC<SavingsAnalyticsModalProps> = ({
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto p-4 sm:p-6 md:p-12 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-md"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-2xl bg-[#09090B] border border-[#27272A] rounded-3xl overflow-hidden shadow-2xl z-10 p-6 space-y-5"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#27272A] pb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Lifetime Direct Savings Analytics</h3>
                <p className="text-xs text-zinc-400 font-mono">Aggregated D2C vs Marketplace Cost Audit</p>
              </div>
            </div>

            <button onClick={onClose} className="p-2 text-zinc-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Key Metric Blocks */}
          <div className="grid grid-cols-3 gap-3 font-mono">
            <div className="p-3.5 rounded-2xl bg-[#18181B] border border-[#27272A]">
              <span className="text-[10px] text-zinc-500 block uppercase">Total Saved</span>
              <span className="text-xl font-extrabold text-emerald-400">₹4,850</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-[#18181B] border border-[#27272A]">
              <span className="text-[10px] text-zinc-500 block uppercase">Total Orders</span>
              <span className="text-xl font-extrabold text-white">14 Orders</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-[#18181B] border border-[#27272A]">
              <span className="text-[10px] text-zinc-500 block uppercase">Avg Savings/Item</span>
              <span className="text-xl font-extrabold text-indigo-400">₹346</span>
            </div>
          </div>

          {/* Monthly Breakdown Table */}
          <div className="space-y-2">
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-400">
              6-Month Cumulative Savings History
            </h4>
            <div className="rounded-2xl bg-[#18181B] border border-[#27272A] overflow-hidden text-xs font-mono">
              <div className="grid grid-cols-3 p-3 bg-[#09090B] text-zinc-500 font-bold border-b border-[#27272A]">
                <span>Month</span>
                <span>Direct Orders</span>
                <span className="text-right">Saved vs Mktplace</span>
              </div>
              {SAVINGS_CHART_DATA.map((row) => (
                <div key={row.month} className="grid grid-cols-3 p-3 border-b border-[#27272A]/50 text-zinc-300">
                  <span className="text-white font-bold">{row.month} 2026</span>
                  <span>{row.orders} Fulfilled</span>
                  <span className="text-right text-emerald-400 font-bold">₹{row.savings}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Explanation Footer */}
          <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-200 leading-relaxed font-mono">
            💡 D2C Index tracks official merchant pricing APIs to capture direct checkout coupon tokens (`DIRECT15`, `EXPRESS200`) and free shipping perks that traditional marketplaces charge listing fees for.
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
};
