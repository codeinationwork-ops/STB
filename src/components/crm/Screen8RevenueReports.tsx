import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  TrendingUp,
  Calendar,
  Download,
  Scissors,
  CreditCard,
  BarChart3,
  Users,
  Search,
} from 'lucide-react';
import { RevenueAnalytics, TailorCustomer, StaffTailor, TailorOrder } from '../../types';
import { roomDb } from '../../lib/localRoomDb';
import { calculateWorkerPerformances } from '../../lib/workerCapacity';
import {
  computeRevenueForTimeframe,
  RevenueTimeframe,
  RevenueChartDataPoint,
} from '../../lib/revenueCalculator';

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
  const [timeframe, setTimeframe] = useState<RevenueTimeframe>('daily');
  const [reportSubTab, setReportSubTab] = useState<'trends' | 'customers' | 'workers'>('trends');
  const [customerSearch, setCustomerSearch] = useState('');
  const [hoveredPoint, setHoveredPoint] = useState<RevenueChartDataPoint | null>(null);

  const customers = roomDb.getCustomers();
  const orders = roomDb.getOrders();
  const tailors = roomDb.getTailors();

  // Multi-period revenue summary calculated on the fly from real orders
  const periodSummary = useMemo(() => {
    return computeRevenueForTimeframe(orders, timeframe);
  }, [orders, timeframe]);

  // Worker Performances & Revenue Breakdown
  const workerPerformances = useMemo(() => {
    return calculateWorkerPerformances(tailors, orders);
  }, [tailors, orders]);

  // Customer Revenue Rankings
  const customerRevenueList = useMemo(() => {
    return customers
      .map((c) => {
        const custOrders = orders.filter(
          (o) => o.customerPhone === c.phone || o.customerId === c.id
        );
        const totalSpent = custOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
        const totalPaid = custOrders.reduce((sum, o) => sum + (o.advancePaid || 0), 0);
        const balanceDue = custOrders.reduce((sum, o) => sum + (o.balanceDue || 0), 0);

        return {
          id: c.id,
          name: c.name,
          phone: c.phone,
          isRepeat: c.isRepeat || custOrders.length > 1,
          ordersCount: custOrders.length,
          totalSpent,
          totalPaid,
          balanceDue,
          lastOrderDate: custOrders[0]?.createdDate || c.lastOrderDate || 'Recently',
        };
      })
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .filter(
        (c) =>
          c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
          c.phone.includes(customerSearch)
      );
  }, [customers, orders, customerSearch]);

  // Max value for Chart scaling
  const maxPeriodTotal = useMemo(() => {
    const maxVal = Math.max(...periodSummary.chartPoints.map((p) => p.total), 100);
    return maxVal;
  }, [periodSummary]);

  // Download CSV export
  const handleDownloadReport = () => {
    const rows = [
      ['Timeframe', timeframe.toUpperCase()],
      ['Generated On', new Date().toLocaleString('en-IN')],
      ['Total Revenue', `₹${periodSummary.totalRevenue}`],
      ['Advance Received', `₹${periodSummary.advanceReceived}`],
      ['Balance Due', `₹${periodSummary.balanceReceived}`],
      ['Total Orders', periodSummary.ordersCount],
      [''],
      ['Period / Date', 'Total (₹)', 'Advance (₹)', 'Balance (₹)', 'Orders Count', 'Completed'],
      ...periodSummary.chartPoints.map((pt) => [
        pt.label,
        pt.total,
        pt.advance,
        pt.balance,
        pt.ordersCount,
        pt.completedCount,
      ]),
    ];

    const csvContent =
      'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ShopScoper_Revenue_Report_${timeframe}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={`min-h-full bg-[#F8F9FA] text-slate-900 font-sans ${isDesktopView ? 'p-6' : 'pb-24'}`}>
      {/* Top Header (Mobile Only) */}
      {!isDesktopView ? (
        <div className="bg-[#0B4636] text-white p-4 sticky top-0 z-20 shadow-md flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 transition-all text-white cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-base font-extrabold tracking-tight">Revenue & Financial Analytics</h1>
              <p className="text-[10px] text-amber-300">Daily, Weekly, Monthly, Yearly & Total</p>
            </div>
          </div>

          <button
            onClick={handleDownloadReport}
            className="bg-amber-400 hover:bg-amber-300 text-[#0B4636] px-3 py-1.5 rounded-xl font-bold text-xs shadow flex items-center gap-1 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200">
          <div>
            <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
              <BarChart3 className="w-7 h-7 text-[#0B4636]" />
              <span>Financial Ledger & Revenue Intelligence</span>
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Analyze real-time earnings across Day, Week, Month, Year, and Total Lifetimes with advance vs. balance trends.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="text-xs font-bold text-slate-600 hover:text-[#0B4636] flex items-center gap-1 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-sm cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>

            <button
              onClick={handleDownloadReport}
              className="bg-[#0B4636] hover:bg-[#073024] text-amber-300 px-4 py-2 rounded-xl font-black text-xs shadow flex items-center gap-2 cursor-pointer border border-amber-300/30"
            >
              <Download className="w-4 h-4 text-amber-300" />
              <span>Export {timeframe.toUpperCase()} Ledger (CSV)</span>
            </button>
          </div>
        </div>
      )}

      <div className={`space-y-4 ${isDesktopView ? 'w-full' : 'p-4 max-w-2xl mx-auto'}`}>
        {/* Navigation Tabs (Trends vs Customers vs Workers) */}
        <div className="bg-white rounded-2xl p-1.5 border border-slate-200 shadow-sm flex items-center gap-1 overflow-x-auto">
          <button
            onClick={() => setReportSubTab('trends')}
            className={`flex-1 min-w-[130px] py-2.5 px-3 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
              reportSubTab === 'trends'
                ? 'bg-[#0B4636] text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Revenue Trends</span>
          </button>

          <button
            onClick={() => setReportSubTab('customers')}
            className={`flex-1 min-w-[130px] py-2.5 px-3 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
              reportSubTab === 'customers'
                ? 'bg-[#0B4636] text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>By Customer</span>
          </button>

          <button
            onClick={() => setReportSubTab('workers')}
            className={`flex-1 min-w-[130px] py-2.5 px-3 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
              reportSubTab === 'workers'
                ? 'bg-[#0B4636] text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Scissors className="w-3.5 h-3.5" />
            <span>By Worker</span>
          </button>
        </div>

        {/* ================= TAB 1: REVENUE TRENDS & CHARTS ================= */}
        {reportSubTab === 'trends' && (
          <div className="space-y-4">
            {/* Timeframe Filter Bar */}
            <div className="bg-white rounded-2xl p-2 border border-slate-200 shadow-sm flex items-center justify-between gap-2 overflow-x-auto">
              <div className="flex items-center gap-1 text-xs font-bold text-slate-500 px-2">
                <Calendar className="w-4 h-4 text-[#0B4636]" />
                <span className="hidden sm:inline">Timeframe:</span>
              </div>

              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                {(
                  [
                    { id: 'daily', label: 'Daily (7d)' },
                    { id: 'weekly', label: 'Weekly (8w)' },
                    { id: 'monthly', label: 'Monthly (12m)' },
                    { id: 'yearly', label: 'Yearly' },
                    { id: 'total', label: 'All-Time Total' },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTimeframe(t.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                      timeframe === t.id
                        ? 'bg-[#0B4636] text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* KPI Cards Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">
                  {timeframe.toUpperCase()} Revenue
                </span>
                <div className="text-xl font-black text-slate-900 mt-0.5">
                  ₹{periodSummary.totalRevenue.toLocaleString()}
                </div>
                <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-0.5 mt-0.5">
                  <TrendingUp className="w-3 h-3" />
                  {periodSummary.ordersCount} Total Orders
                </span>
              </div>

              <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
                <span className="text-[10px] font-bold text-emerald-800 uppercase block">Advance Paid</span>
                <div className="text-xl font-black text-emerald-800 mt-0.5">
                  ₹{periodSummary.advanceReceived.toLocaleString()}
                </div>
                <span className="text-[10px] font-bold text-emerald-700 mt-0.5 block">
                  {periodSummary.collectionRate}% Collection Rate
                </span>
              </div>

              <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
                <span className="text-[10px] font-bold text-blue-800 uppercase block">Balance Due</span>
                <div className="text-xl font-black text-blue-800 mt-0.5">
                  ₹{periodSummary.balanceReceived.toLocaleString()}
                </div>
                <span className="text-[10px] font-bold text-blue-700 mt-0.5 block">
                  {periodSummary.pendingCount} Pending Stitches
                </span>
              </div>

              <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
                <span className="text-[10px] font-bold text-amber-800 uppercase block">Avg Ticket</span>
                <div className="text-xl font-black text-amber-900 mt-0.5">
                  ₹{periodSummary.avgOrderValue.toLocaleString()}
                </div>
                <span className="text-[10px] font-bold text-amber-700 mt-0.5 block">
                  {periodSummary.completedCount} Completed Ready
                </span>
              </div>
            </div>

            {/* Main Interactive Revenue Graph Box */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-black text-[#0B4636] uppercase tracking-wider flex items-center gap-1.5">
                    <BarChart3 className="w-4 h-4 text-emerald-700" />
                    <span>{periodSummary.title}</span>
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">{periodSummary.subtitle}</p>
                </div>

                <div className="flex items-center gap-3 text-xs font-bold">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-md bg-[#0B4636]" />
                    <span>Advance Received</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-md bg-emerald-400" />
                    <span>Balance Pending / Due</span>
                  </span>
                </div>
              </div>

              {/* Hover Tooltip display if active */}
              {hoveredPoint && (
                <div className="bg-slate-900 text-white px-3.5 py-2 rounded-xl text-xs flex items-center justify-between shadow-lg animate-in fade-in">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-amber-300">{hoveredPoint.label}</span>
                    <span className="text-slate-400">•</span>
                    <span>{hoveredPoint.ordersCount} Orders</span>
                  </div>
                  <div className="flex items-center gap-3 font-mono font-bold">
                    <span className="text-emerald-400">Adv: ₹{hoveredPoint.advance.toLocaleString()}</span>
                    <span className="text-amber-300">Bal: ₹{hoveredPoint.balance.toLocaleString()}</span>
                    <span className="text-white">Total: ₹{hoveredPoint.total.toLocaleString()}</span>
                  </div>
                </div>
              )}

              {/* Visual Dynamic Bar & Stack Chart */}
              <div className="h-60 pt-6 pb-2 flex items-end justify-between gap-2 sm:gap-4 px-2 border-b border-slate-200 relative">
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
                  const totalHeight = Math.min(100, Math.max(8, advHeight + balHeight));

                  return (
                    <div
                      key={idx}
                      onMouseEnter={() => setHoveredPoint(pt)}
                      onMouseLeave={() => setHoveredPoint(null)}
                      className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group cursor-pointer relative z-10"
                    >
                      {/* Order Count / Value Pill above Bar */}
                      <span className="text-[10px] font-black text-slate-700 opacity-80 group-hover:opacity-100 group-hover:text-[#0B4636] transition-all whitespace-nowrap">
                        {pt.total > 0 ? `₹${pt.total >= 1000 ? `${(pt.total / 1000).toFixed(1)}k` : pt.total}` : '₹0'}
                      </span>

                      {/* Stacked Bar */}
                      <div className="w-full max-w-[42px] flex flex-col items-center justify-end h-full rounded-t-xl overflow-hidden bg-slate-100 group-hover:ring-2 group-hover:ring-[#0B4636]/40 transition-all shadow-xs">
                        {pt.total === 0 ? (
                          <div className="h-1 w-full bg-slate-300" />
                        ) : (
                          <>
                            <div
                              style={{ height: `${balHeight}%` }}
                              className="w-full bg-emerald-400 transition-all duration-300 group-hover:brightness-110"
                              title={`Balance Due: ₹${pt.balance}`}
                            />
                            <div
                              style={{ height: `${advHeight}%` }}
                              className="w-full bg-[#0B4636] transition-all duration-300 group-hover:brightness-110"
                              title={`Advance Paid: ₹${pt.advance}`}
                            />
                          </>
                        )}
                      </div>

                      {/* X-Axis Label */}
                      <span className="text-[10px] font-bold text-slate-600 mt-1 whitespace-nowrap group-hover:font-black group-hover:text-slate-900 transition-all">
                        {pt.shortLabel}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Chart Footer Highlights */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500">Period Order Count:</span>
                  <span className="text-xs font-black text-slate-900">{periodSummary.ordersCount} Orders</span>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500">Advance Cleared:</span>
                  <span className="text-xs font-black text-emerald-800">
                    ₹{periodSummary.advanceReceived.toLocaleString()}
                  </span>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500">Pending Balance:</span>
                  <span className="text-xs font-black text-blue-800">
                    ₹{periodSummary.balanceReceived.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Top Stitching Services & Payment Modes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Top Services */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3">
                <h3 className="text-xs font-bold text-[#0B4636] uppercase tracking-wider flex items-center gap-1.5">
                  <Scissors className="w-4 h-4 text-[#0B4636]" />
                  <span>Top Stitching Garments</span>
                </h3>

                <div className="space-y-2.5">
                  {periodSummary.topServices.length === 0 ? (
                    <p className="text-xs text-slate-400 py-3 text-center">No service orders recorded yet.</p>
                  ) : (
                    periodSummary.topServices.slice(0, 5).map((svc, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className="text-slate-800">
                            {idx + 1}. {svc.name} ({svc.count} orders)
                          </span>
                          <span className="text-[#0B4636]">
                            ₹{svc.revenue.toLocaleString()} ({svc.percentage}%)
                          </span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#0B4636] rounded-full transition-all duration-300"
                            style={{ width: `${svc.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Payment Mode Split */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3">
                <h3 className="text-xs font-bold text-[#0B4636] uppercase tracking-wider flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-[#0B4636]" />
                  <span>Payment Channels</span>
                </h3>

                <div className="space-y-2.5">
                  {periodSummary.paymentModeBreakdown.map((pm, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-slate-800">{pm.name}</span>
                        <span className="text-emerald-800">
                          ₹{pm.amount.toLocaleString()} ({pm.percentage}%)
                        </span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                          style={{ width: `${pm.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 2: REVENUE BY CUSTOMER ================= */}
        {reportSubTab === 'customers' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-sm flex items-center gap-3">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search customers by name or phone..."
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                className="w-full text-xs font-medium bg-transparent focus:outline-none"
              />
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-slate-50 p-3.5 border-b border-slate-200 flex items-center justify-between">
                <h3 className="text-xs font-black text-[#0B4636] uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-4 h-4" />
                  <span>Customer Lifetime Spend Leaderboard</span>
                </h3>
                <span className="text-xs font-bold text-slate-500">
                  {customerRevenueList.length} Customers
                </span>
              </div>

              <div className="divide-y divide-slate-100">
                {customerRevenueList.map((c, idx) => (
                  <div
                    key={c.id || c.phone}
                    className="p-3.5 flex items-center justify-between hover:bg-slate-50 transition-all text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-[#0B4636]/10 text-[#0B4636] font-black text-xs flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <div>
                        <div className="font-extrabold text-slate-900 flex items-center gap-1.5">
                          <span>{c.name}</span>
                          {c.isRepeat && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-amber-100 text-amber-900 border border-amber-300">
                              Repeat
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          +91 {c.phone} • {c.ordersCount} Orders • Last: {c.lastOrderDate}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-black text-sm text-[#0B4636]">₹{c.totalSpent.toLocaleString()}</div>
                      <div className="text-[10px] text-slate-400 font-bold">
                        {c.balanceDue > 0 ? (
                          <span className="text-rose-600">Due: ₹{c.balanceDue.toLocaleString()}</span>
                        ) : (
                          <span className="text-emerald-700">Cleared</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 4: REVENUE BY WORKER ================= */}
        {reportSubTab === 'workers' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {workerPerformances.map((w) => {
                const sharePercent =
                  periodSummary.totalRevenue > 0
                    ? Math.round((w.totalRevenueGenerated / periodSummary.totalRevenue) * 100)
                    : 0;

                return (
                  <div
                    key={w.tailorId}
                    className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3"
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-2xl bg-[#0B4636] text-amber-300 font-black text-sm flex items-center justify-center">
                          {w.initials}
                        </div>
                        <div>
                          <h4 className="font-extrabold text-sm text-slate-900">{w.tailorName}</h4>
                          <span className="text-[11px] text-slate-500 font-medium">{w.role}</span>
                        </div>
                      </div>

                      <span className="px-2.5 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-900 border border-amber-300">
                        {sharePercent}% Production Share
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Production</span>
                        <span className="font-black text-[#0B4636] text-sm mt-0.5 block">
                          ₹{w.totalRevenueGenerated.toLocaleString()}
                        </span>
                      </div>

                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Completed</span>
                        <span className="font-black text-slate-900 text-sm mt-0.5 block">
                          {w.completedOrdersCount} Stitches
                        </span>
                      </div>

                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">In-Progress</span>
                        <span className="font-black text-blue-900 text-sm mt-0.5 block">
                          {w.activeOrdersCount} Stitches
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
