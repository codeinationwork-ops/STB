import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TrendingDown, Zap, ShieldAlert, Sparkles, ArrowUpRight, CheckCircle2, ChevronRight, BarChart3, Users } from 'lucide-react';
import { CommunitySavings, SavingsChartPoint } from '../types';

interface SavingsRadarProps {
  savingsData: SavingsChartPoint[];
  communitySavings: CommunitySavings[];
  activePriceAlertsCount: number;
  onFilterPriceDrops: () => void;
  onOpenSavingsAnalyticsModal: () => void;
}

export const SavingsRadar: React.FC<SavingsRadarProps> = ({
  savingsData,
  communitySavings,
  activePriceAlertsCount,
  onFilterPriceDrops,
  onOpenSavingsAnalyticsModal
}) => {
  const [currentFeedIndex, setCurrentFeedIndex] = useState(0);
  const [hoveredChartPoint, setHoveredChartPoint] = useState<SavingsChartPoint | null>(null);

  // Rotate community feed ticker every 3.5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFeedIndex((prev) => (prev + 1) % communitySavings.length);
    }, 3800);
    return () => clearInterval(interval);
  }, [communitySavings]);

  const activeFeed = communitySavings[currentFeedIndex];

  // SVG Area Chart calculations for Lifetime Savings
  const maxSavings = Math.max(...savingsData.map((d) => d.savings));
  const svgWidth = 260;
  const svgHeight = 65;
  const points = savingsData.map((d, i) => {
    const x = (i / (savingsData.length - 1)) * svgWidth;
    const y = svgHeight - (d.savings / maxSavings) * (svgHeight - 12);
    return `${x},${y}`;
  }).join(' ');

  const areaPoints = `0,${svgHeight} ${points} ${svgWidth},${svgHeight}`;

  return (
    <section className="w-full pt-6 pb-2">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
        
        {/* Live Community Savings Ticker Banner */}
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-[#18181B] via-[#27272A]/80 to-[#18181B] border border-[#27272A] p-2.5 sm:px-4 sm:py-3 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xl">
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0">
              <Users className="w-4 h-4 animate-bounce" />
            </div>
            <div className="flex items-center gap-2 text-xs text-zinc-300">
              <span className="font-mono text-emerald-400 font-bold uppercase tracking-wider text-[11px] bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                Live Pulse
              </span>
              <span className="text-zinc-500 hidden sm:inline">•</span>
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeFeed.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="flex items-center gap-2"
                >
                  <img
                    src={activeFeed.userAvatar}
                    alt={activeFeed.userHandle}
                    className="w-5 h-5 rounded-full object-cover border border-emerald-500/40"
                  />
                  <span>
                    <strong className="text-white">{activeFeed.userHandle}</strong> saved{' '}
                    <strong className="text-emerald-400 font-mono">₹{activeFeed.amountSaved}</strong> on{' '}
                    <span className="text-zinc-200 font-medium">{activeFeed.brand} {activeFeed.productName}</span>{' '}
                    <span className="text-zinc-500 text-[10px]">({activeFeed.timeAgo})</span>
                  </span>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs text-zinc-400 shrink-0 w-full sm:w-auto justify-end border-t sm:border-t-0 border-[#27272A] pt-2 sm:pt-0">
            <span className="text-emerald-400 font-mono font-medium flex items-center gap-1 text-[11px]">
              <Sparkles className="w-3.5 h-3.5" />
              Aggregated D2C Savings Radar Active
            </span>
          </div>
        </div>

        {/* 3 Hero Analytics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Card 1: Lifetime D2C Savings with SVG Area Chart */}
          <motion.div
            whileHover={{ y: -3 }}
            onClick={onOpenSavingsAnalyticsModal}
            className="group relative overflow-hidden rounded-2xl bg-[#18181B] border border-[#27272A] hover:border-emerald-500/40 p-5 transition-all duration-300 shadow-xl cursor-pointer"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-all"></div>
            
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Zap className="w-5 h-5 fill-emerald-400/20" />
                </div>
                <div>
                  <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-400 font-semibold">
                    Lifetime D2C Savings
                  </h3>
                  <div className="text-2xl font-black font-mono text-white tracking-tight flex items-baseline gap-2">
                    ₹4,850
                    <span className="text-xs font-normal text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded font-mono border border-emerald-500/20">
                      +28% vs Mktplace
                    </span>
                  </div>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-zinc-500 group-hover:text-emerald-400 transition-colors" />
            </div>

            <p className="text-[11px] text-zinc-400 mb-3">
              Direct brand orders avoid marketplace listing fees & commission markups.
            </p>

            {/* Interactive SVG Area Chart */}
            <div className="relative pt-2">
              <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 mb-1">
                <span>Mar 2026</span>
                <span>
                  {hoveredChartPoint ? `${hoveredChartPoint.month}: ₹${hoveredChartPoint.savings}` : 'Aug 2026 (Peak)'}
                </span>
              </div>
              <svg className="w-full h-16 overflow-visible" viewBox={`0 0 ${svgWidth} ${svgHeight}`}>
                <defs>
                  <linearGradient id="emeraldGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10B981" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <polygon points={areaPoints} fill="url(#emeraldGradient)" />
                <polyline
                  fill="none"
                  stroke="#10B981"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={points}
                />
                {savingsData.map((d, i) => {
                  const x = (i / (savingsData.length - 1)) * svgWidth;
                  const y = svgHeight - (d.savings / maxSavings) * (svgHeight - 12);
                  return (
                    <circle
                      key={d.month}
                      cx={x}
                      cy={y}
                      r={hoveredChartPoint?.month === d.month ? 5 : 3}
                      fill="#10B981"
                      className="cursor-pointer transition-all hover:r-6 stroke-[#09090B] stroke-2"
                      onMouseEnter={() => setHoveredChartPoint(d)}
                      onMouseLeave={() => setHoveredChartPoint(null)}
                    />
                  );
                })}
              </svg>
            </div>
          </motion.div>

          {/* Card 2: Average Price Gap */}
          <motion.div
            whileHover={{ y: -3 }}
            className="group relative overflow-hidden rounded-2xl bg-[#18181B] border border-[#27272A] hover:border-indigo-500/40 p-5 transition-all duration-300 shadow-xl"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl group-hover:bg-indigo-500/10 transition-all"></div>
            
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <TrendingDown className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-400 font-semibold">
                    Average Direct Price Gap
                  </h3>
                  <div className="text-2xl font-black font-mono text-white tracking-tight flex items-baseline gap-2">
                    ~22.4% Off
                    <span className="text-xs font-normal text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded font-mono border border-indigo-500/20">
                      Avg ₹420 / item
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-zinc-400 mb-4">
              Direct sites auto-apply merchant checkout promo tokens that marketplaces strip out.
            </p>

            <div className="space-y-2 bg-[#09090B]/60 rounded-xl p-3 border border-[#27272A]">
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-400">Official Brand Price</span>
                <span className="text-emerald-400 font-mono font-bold">₹1,199</span>
              </div>
              <div className="w-full bg-[#27272A] h-2 rounded-full overflow-hidden flex">
                <div className="bg-emerald-500 h-full w-[78%]" title="Brand Price"></div>
                <div className="bg-rose-500/80 h-full w-[22%]" title="Marketplace Markup"></div>
              </div>
              <div className="flex justify-between items-center text-[11px] text-zinc-500 font-mono">
                <span>D2C Direct (78%)</span>
                <span className="text-rose-400">Marketplace Markup (+22%)</span>
              </div>
            </div>
          </motion.div>

          {/* Card 3: Active Price Drop Alerts */}
          <motion.div
            whileHover={{ y: -3 }}
            onClick={onFilterPriceDrops}
            className="group relative overflow-hidden rounded-2xl bg-[#18181B] border border-[#27272A] hover:border-rose-500/40 p-5 transition-all duration-300 shadow-xl cursor-pointer"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-2xl group-hover:bg-rose-500/10 transition-all"></div>
            
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  <ShieldAlert className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-400 font-semibold">
                    Live Price Drop Radar
                  </h3>
                  <div className="text-2xl font-black font-mono text-white tracking-tight flex items-baseline gap-2">
                    {activePriceAlertsCount} Active Drops
                    <span className="text-xs font-normal text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded font-mono border border-rose-500/20">
                      Click to Filter
                    </span>
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-rose-400 transition-colors" />
            </div>

            <p className="text-[11px] text-zinc-400 mb-3">
              Direct brand sites updated flash discounts within the last 2 hours.
            </p>

            <div className="p-3 rounded-xl bg-rose-500/5 border border-rose-500/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                </span>
                <span className="text-xs text-rose-200 font-medium">Snitch, Comet & Minimalist drop alerts live</span>
              </div>
              <span className="text-[11px] text-rose-400 font-mono font-bold underline">
                View All
              </span>
            </div>

          </motion.div>

        </div>

      </div>
    </section>
  );
};
