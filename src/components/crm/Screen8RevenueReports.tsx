import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  TrendingUp,
  Calendar,
  Scissors,
  CreditCard,
  BarChart3,
  PieChart,
  Sparkles,
  ShoppingBag,
  Layers,
} from 'lucide-react';
import { RevenueAnalytics } from '../../types';
import { roomDb } from '../../lib/localRoomDb';
import { calculateWorkerPerformances } from '../../lib/workerCapacity';
import {
  computeRevenueForTimeframe,
  RevenueTimeframe,
  RevenueChartDataPoint,
} from '../../lib/revenueCalculator';
import { useLanguage } from '../../lib/LanguageContext';

interface Screen8RevenueReportsProps {
  analytics?: RevenueAnalytics;
  onBack: () => void;
  isDesktopView?: boolean;
}

export const Screen8RevenueReports: React.FC<Screen8RevenueReportsProps> = ({
  analytics: propAnalytics,
  onBack,
  isDesktopView = false,
}) => {
  const { t, language } = useLanguage();
  const [timeframe, setTimeframe] = useState<RevenueTimeframe>('daily');
  const [reportSubTab, setReportSubTab] = useState<'trends' | 'sources'>('trends');
  const [hoveredPoint, setHoveredPoint] = useState<RevenueChartDataPoint | null>(null);

  const orders = roomDb.getOrders();
  const tailors = roomDb.getTailors();

  // Multi-period revenue summary calculated dynamically from real orders
  const periodSummary = useMemo(() => {
    return computeRevenueForTimeframe(orders, timeframe);
  }, [orders, timeframe]);

  // Worker Performances & Revenue Breakdown
  const workerPerformances = useMemo(() => {
    return calculateWorkerPerformances(tailors, orders);
  }, [tailors, orders]);

  // Real delivered/fulfilled revenue
  const deliveredRevenue = useMemo(() => {
    return periodSummary.filteredOrders
      .filter((o) => o.status === 'Delivered' || o.status === 'Completed')
      .reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  }, [periodSummary.filteredOrders]);

  // Max value for Chart scaling
  const maxPeriodTotal = useMemo(() => {
    const maxVal = Math.max(...periodSummary.chartPoints.map((p) => p.total), 100);
    return maxVal;
  }, [periodSummary]);

  // Timeframe Tab Configuration
  const timeframeOptions = [
    { id: 'daily' as const, label: t('revenue.daily', 'Daily (7D)'), shortLabel: '7D' },
    { id: 'weekly' as const, label: t('revenue.weekly', 'Weekly (8W)'), shortLabel: '8W' },
    { id: 'monthly' as const, label: t('revenue.monthly', 'Monthly (12M)'), shortLabel: '12M' },
    { id: 'yearly' as const, label: t('revenue.yearly', 'Yearly'), shortLabel: 'Year' },
    { id: 'total' as const, label: t('revenue.allTime', 'All-Time Total'), shortLabel: 'All' },
  ];

  return (
    <div className={`min-h-full bg-slate-50 text-slate-900 font-sans ${isDesktopView ? 'p-6' : 'pb-24'}`}>
      {/* Top Header (Mobile & Desktop) */}
      {!isDesktopView ? (
        <div className="bg-emerald-800 text-white p-3.5 sticky top-0 z-20 shadow-md flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              onClick={onBack}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 transition-all text-white cursor-pointer shrink-0"
              title="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h1 className="text-sm font-bold tracking-tight truncate flex items-center gap-1.5">
                <BarChart3 className="w-4 h-4 text-emerald-200" />
                <span>{t('revenue.title', 'Revenue Intelligence & Analytics')}</span>
              </h1>
              <p className="text-[10px] text-emerald-200/90 truncate font-medium">
                {t('revenue.subtitle', 'Real-time revenue flow & D/W/M/Y analytics')}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
                BoutiqueOS Intelligence
              </span>
              <span className="text-xs text-slate-400 font-bold">•</span>
              <span className="text-xs text-slate-500 font-bold">
                {periodSummary.ordersCount} Total Transactions Tracked
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5 mt-1">
              <div className="w-9 h-9 rounded-xl bg-emerald-700 text-white flex items-center justify-center shadow-sm">
                <BarChart3 className="w-5 h-5" />
              </div>
              <span>{t('revenue.title', 'Revenue Intelligence & Analytics')}</span>
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-1">
              {t('revenue.subtitle', 'Real-time cashflow, service verticals, revenue sources, and D/W/M/Y analytics')}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="text-xs font-bold text-slate-600 hover:text-emerald-800 flex items-center gap-1.5 bg-white px-3.5 py-2.5 rounded-xl border border-slate-200 shadow-sm cursor-pointer transition-all hover:bg-slate-50"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{t('nav.backToDashboard', 'Back')}</span>
            </button>
          </div>
        </div>
      )}

      <div className={`space-y-4 ${isDesktopView ? 'w-full' : 'p-3.5 max-w-3xl mx-auto'}`}>
        {/* ================= TIMEFRAME SELECTOR PILLS ================= */}
        <div className="bg-white rounded-2xl p-2.5 border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 px-1">
            <Calendar className="w-4 h-4 text-emerald-700" />
            <span>{t('revenue.timeframe', 'Timeframe:')}</span>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100/90 p-1 rounded-xl overflow-x-auto max-w-full">
            {timeframeOptions.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setTimeframe(opt.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  timeframe === opt.id
                    ? 'bg-emerald-700 text-white shadow-sm ring-1 ring-emerald-600/30'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* ================= ESSENTIAL REQUIRED KPI CARDS STRIP ================= */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Card 1: Gross Booked Revenue */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                {t('revenue.grossRevenue', 'Gross Booked')}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-800 border border-slate-200">
                {timeframe.toUpperCase()}
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-2 font-mono">
              ₹{periodSummary.totalRevenue.toLocaleString('en-IN')}
            </div>
            <div className="text-xs font-bold text-emerald-800 flex items-center gap-1.5 mt-2">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-700" />
              <span>
                {periodSummary.ordersCount} Total {periodSummary.ordersCount === 1 ? 'Order' : 'Orders'}
              </span>
            </div>
          </div>

          {/* Card 2: Cash Inflow (Advances Paid) */}
          <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200 shadow-xs flex flex-col justify-between hover:border-emerald-300 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold text-emerald-900 uppercase tracking-wider">
                {t('revenue.cashInflow', 'Cash Inflow (Advances)')}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-200 text-emerald-950 border border-emerald-300">
                {periodSummary.collectionRate}% Paid
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-950 tracking-tight mt-2 font-mono">
              ₹{periodSummary.advanceReceived.toLocaleString('en-IN')}
            </div>
            <div className="text-xs font-bold text-emerald-900 mt-2">
              Collected In Hand ({periodSummary.collectionRate}%)
            </div>
          </div>

          {/* Card 3: Outstanding Receivables / Balance Due */}
          <div className={`p-4 rounded-2xl border shadow-xs flex flex-col justify-between transition-colors ${
            periodSummary.balanceReceived > 0
              ? 'bg-amber-50/70 border-amber-200 hover:border-amber-300'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-[11px] font-extrabold uppercase tracking-wider ${
                periodSummary.balanceReceived > 0 ? 'text-amber-950' : 'text-slate-600'
              }`}>
                {t('revenue.balanceReceivable', 'Outstanding Balance Due')}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                periodSummary.pendingCount > 0
                  ? 'bg-amber-200 text-amber-950 border-amber-300'
                  : 'bg-slate-100 text-slate-700 border-slate-200'
              }`}>
                {periodSummary.pendingCount} Pending
              </span>
            </div>
            <div className={`text-2xl sm:text-3xl font-black tracking-tight mt-2 font-mono ${
              periodSummary.balanceReceived > 0 ? 'text-amber-950' : 'text-slate-900'
            }`}>
              ₹{periodSummary.balanceReceived.toLocaleString('en-IN')}
            </div>
            <div className={`text-xs font-bold mt-2 ${
              periodSummary.balanceReceived > 0 ? 'text-amber-900' : 'text-slate-500'
            }`}>
              {periodSummary.balanceReceived > 0 ? 'To Collect on Handover / Delivery' : 'All Orders Fully Settled'}
            </div>
          </div>

          {/* Card 4: Delivered & Fulfilled Orders */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">
                {t('revenue.deliveredSettled', 'Delivered & Fulfilled')}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-800 border border-slate-200">
                {periodSummary.completedCount} Ready / Done
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-2 font-mono">
              ₹{deliveredRevenue.toLocaleString('en-IN')}
            </div>
            <div className="text-xs font-bold text-slate-600 mt-2">
              {periodSummary.completedCount} fulfilled • {periodSummary.pendingCount} in production
            </div>
          </div>
        </div>

        {/* ================= PRIMARY NAVIGATION SUB-TABS ================= */}
        <div className="bg-white rounded-2xl p-1.5 border border-slate-200/80 shadow-xs flex items-center gap-1 overflow-x-auto">
          <button
            onClick={() => setReportSubTab('trends')}
            className={`flex-1 min-w-[130px] py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              reportSubTab === 'trends'
                ? 'bg-emerald-700 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>{t('revenue.tabTrends', 'Revenue Analytics')}</span>
          </button>

          <button
            onClick={() => setReportSubTab('sources')}
            className={`flex-1 min-w-[140px] py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              reportSubTab === 'sources'
                ? 'bg-emerald-700 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <PieChart className="w-3.5 h-3.5" />
            <span>{t('revenue.tabSources', 'Revenue Sources')}</span>
          </button>
        </div>

        {/* ================= TAB 1: REVENUE TRENDS & CHARTS ================= */}
        {reportSubTab === 'trends' && (
          <div className="space-y-4">
            {/* Interactive Dynamic Stacked Revenue Chart */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-emerald-700" />
                    <span>{periodSummary.title}</span>
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">{periodSummary.subtitle}</p>
                </div>

                <div className="flex items-center gap-3 text-xs font-bold">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-md bg-emerald-700" />
                    <span className="text-slate-700">{t('revenue.cashInflow', 'Advance Received')}</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-md bg-amber-400" />
                    <span className="text-slate-700">{t('revenue.balanceReceivable', 'Balance Due')}</span>
                  </span>
                </div>
              </div>

              {/* Hover Tooltip display if active */}
              {hoveredPoint && (
                <div className="bg-slate-900 text-white px-3.5 py-2.5 rounded-xl text-xs flex flex-wrap items-center justify-between gap-2 shadow-lg animate-in fade-in">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-emerald-300">{hoveredPoint.label}</span>
                    <span className="text-slate-400">•</span>
                    <span>{hoveredPoint.ordersCount} Orders</span>
                  </div>
                  <div className="flex items-center gap-3 font-mono font-bold">
                    <span className="text-emerald-400">Advance: ₹{hoveredPoint.advance.toLocaleString()}</span>
                    <span className="text-amber-300">Due: ₹{hoveredPoint.balance.toLocaleString()}</span>
                    <span className="text-white">Total: ₹{hoveredPoint.total.toLocaleString()}</span>
                  </div>
                </div>
              )}

              {/* Visual Dynamic Bar & Stack Chart */}
              <div className="h-64 pt-6 pb-2 flex items-end justify-between gap-2 sm:gap-4 px-2 border-b border-slate-200 relative">
                {/* Background Grid Lines */}
                <div className="absolute inset-0 pointer-events-none flex flex-col justify-between opacity-15">
                  <div className="border-b border-dashed border-slate-600 w-full" />
                  <div className="border-b border-dashed border-slate-600 w-full" />
                  <div className="border-b border-dashed border-slate-600 w-full" />
                  <div className="border-b border-dashed border-slate-600 w-full" />
                </div>

                {periodSummary.chartPoints.map((pt, idx) => {
                  const advHeight = maxPeriodTotal > 0 ? (pt.advance / maxPeriodTotal) * 100 : 0;
                  const balHeight = maxPeriodTotal > 0 ? (pt.balance / maxPeriodTotal) * 100 : 0;

                  return (
                    <div
                      key={idx}
                      onMouseEnter={() => setHoveredPoint(pt)}
                      onMouseLeave={() => setHoveredPoint(null)}
                      className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group cursor-pointer relative z-10"
                    >
                      {/* Order Count / Value Pill above Bar */}
                      <span className="text-[10px] font-bold text-slate-700 opacity-85 group-hover:opacity-100 group-hover:text-emerald-800 transition-all whitespace-nowrap">
                        {pt.total > 0 ? `₹${pt.total >= 1000 ? `${(pt.total / 1000).toFixed(1)}k` : pt.total}` : '₹0'}
                      </span>

                      {/* Stacked Bar */}
                      <div className="w-full max-w-[44px] flex flex-col items-center justify-end h-full rounded-t-xl overflow-hidden bg-slate-100 group-hover:ring-2 group-hover:ring-emerald-700/40 transition-all shadow-2xs">
                        {pt.total === 0 ? (
                          <div className="h-1.5 w-full bg-slate-300" />
                        ) : (
                          <>
                            <div
                              style={{ height: `${balHeight}%` }}
                              className="w-full bg-amber-400 transition-all duration-300 group-hover:brightness-110"
                              title={`Balance Due: ₹${pt.balance}`}
                            />
                            <div
                              style={{ height: `${advHeight}%` }}
                              className="w-full bg-emerald-700 transition-all duration-300 group-hover:brightness-110"
                              title={`Advance Paid: ₹${pt.advance}`}
                            />
                          </>
                        )}
                      </div>

                      {/* X-Axis Label */}
                      <span className="text-[10px] font-bold text-slate-600 mt-1 whitespace-nowrap group-hover:font-bold group-hover:text-slate-900 transition-all">
                        {pt.shortLabel}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Chart Footer Quick Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-600">Total Period Orders:</span>
                  <span className="text-xs font-bold text-slate-900">{periodSummary.ordersCount} Orders</span>
                </div>

                <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-200/60 flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-800">Advance Cleared:</span>
                  <span className="text-xs font-bold text-emerald-900">
                    ₹{periodSummary.advanceReceived.toLocaleString()}
                  </span>
                </div>

                <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-200/60 flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-900">Pending Receivables:</span>
                  <span className="text-xs font-bold text-amber-950">
                    ₹{periodSummary.balanceReceived.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Business Verticals Summary Widget in Trends */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {periodSummary.verticalBreakdown.map((vert) => (
                <div
                  key={vert.id}
                  className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">{t(vert.labelKey, vert.defaultLabel)}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                      {vert.percentage}%
                    </span>
                  </div>
                  <div className="text-lg font-bold text-emerald-800">
                    ₹{vert.revenue.toLocaleString()}
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${vert.percentage}%`, backgroundColor: vert.color }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold">
                    <span>{vert.count} Orders</span>
                    <span>Bal: ₹{vert.balance.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= TAB 2: REVENUE SOURCES & CHANNELS ================= */}
        {reportSubTab === 'sources' && (
          <div className="space-y-4">
            {/* 1. Revenue by Business Vertical (Where is revenue coming from) */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-emerald-700" />
                  <span>{t('revenue.byVertical', 'Where Revenue is Coming From (Business Verticals)')}</span>
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Detailed distribution across custom stitching, alterations, ready-made retail, and fabrics.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {periodSummary.verticalBreakdown.map((vert) => (
                  <div
                    key={vert.id}
                    className={`p-4 rounded-2xl border ${vert.bgColor} space-y-3`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {vert.id === 'stitching' && <Scissors className="w-4 h-4 text-emerald-800" />}
                        {vert.id === 'alteration' && <Sparkles className="w-4 h-4 text-amber-800" />}
                        {vert.id === 'retail' && <ShoppingBag className="w-4 h-4 text-blue-800" />}
                        {vert.id === 'fabric' && <Layers className="w-4 h-4 text-purple-800" />}
                        <span className="font-extrabold text-sm">{t(vert.labelKey, vert.defaultLabel)}</span>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-white/80 shadow-2xs">
                        {vert.percentage}% Share
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="bg-white/80 p-2.5 rounded-xl">
                        <span className="text-[10px] font-bold text-slate-500 uppercase block">Total Value</span>
                        <span className="font-bold text-sm text-slate-900 mt-0.5 block">
                          ₹{vert.revenue.toLocaleString()}
                        </span>
                      </div>
                      <div className="bg-white/80 p-2.5 rounded-xl">
                        <span className="text-[10px] font-bold text-slate-500 uppercase block">Advance Paid</span>
                        <span className="font-bold text-sm text-emerald-800 mt-0.5 block">
                          ₹{vert.advance.toLocaleString()}
                        </span>
                      </div>
                      <div className="bg-white/80 p-2.5 rounded-xl">
                        <span className="text-[10px] font-bold text-slate-500 uppercase block">Balance Due</span>
                        <span className="font-bold text-sm text-amber-900 mt-0.5 block">
                          ₹{vert.balance.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                        <span>{vert.count} Total Orders Booked</span>
                        <span>{vert.percentage}% of shop gross</span>
                      </div>
                      <div className="h-2 w-full bg-white/60 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${vert.percentage}%`, backgroundColor: vert.color }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. Top Garment Categories & Payment Channels Side-by-Side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Garment Categories Breakdown */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-2">
                    <Scissors className="w-4 h-4 text-emerald-700" />
                    <span>{t('revenue.topGarments', 'Revenue by Garment Category')}</span>
                  </h3>
                  <span className="text-xs font-bold text-slate-500">
                    {periodSummary.garmentCategories.length} Types
                  </span>
                </div>

                <div className="space-y-3">
                  {periodSummary.garmentCategories.length === 0 ? (
                    <p className="text-xs text-slate-400 py-4 text-center">No garment orders recorded in this timeframe.</p>
                  ) : (
                    periodSummary.garmentCategories.map((g, idx) => (
                      <div key={idx} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className="text-slate-800 flex items-center gap-1.5">
                            <span
                              className="w-2.5 h-2.5 rounded-full"
                              style={{ backgroundColor: g.color }}
                            />
                            <span>{g.category}</span>
                            <span className="text-[10px] text-slate-400">({g.count} pcs)</span>
                          </span>
                          <span className="text-emerald-800 font-bold">
                            ₹{g.revenue.toLocaleString()} ({g.percentage}%)
                          </span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{ width: `${g.percentage}%`, backgroundColor: g.color }}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Payment Methods Breakdown */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-emerald-700" />
                    <span>{t('revenue.paymentChannels', 'Payment Channels Distribution')}</span>
                  </h3>
                  <span className="text-xs font-bold text-slate-500">
                    ₹{periodSummary.advanceReceived.toLocaleString()} Total Inflow
                  </span>
                </div>

                <div className="space-y-3.5">
                  {periodSummary.paymentModeBreakdown.map((pm, idx) => (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-slate-800 flex items-center gap-1.5">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: pm.color }}
                          />
                          <span>{pm.name}</span>
                          <span className="text-[10px] text-slate-400">({pm.count} payments)</span>
                        </span>
                        <span className="text-emerald-900 font-bold">
                          ₹{pm.amount.toLocaleString()} ({pm.percentage}%)
                        </span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{ width: `${pm.percentage}%`, backgroundColor: pm.color }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Instant Verification Hint */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60 flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-bold">Digital vs Cash Ratio:</span>
                  <span className="font-bold text-emerald-800">
                    {periodSummary.paymentModeBreakdown[0]?.percentage || 0}% Digital / UPI
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
