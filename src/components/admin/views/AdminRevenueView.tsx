import React, { useMemo } from 'react';
import {
  TrendingUp,
  DollarSign,
  CreditCard,
  Download,
  ArrowUpRight,
  PieChart,
  Calendar,
  Layers,
  CheckCircle2,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { PlatformShop, TailorOrder, RevenueAnalytics } from '../../../types';

interface AdminRevenueViewProps {
  shops: PlatformShop[];
  orders: TailorOrder[];
  analytics: RevenueAnalytics;
}

export const AdminRevenueView: React.FC<AdminRevenueViewProps> = ({
  shops,
  orders,
  analytics,
}) => {
  // Aggregate Financial Statistics across all shops
  const financials = useMemo(() => {
    const totalShopGMV = shops.reduce((sum, s) => sum + (s.grossRevenue || 0), 0);
    const activeOrderTotal = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const totalGrossRevenue = totalShopGMV > 0 ? totalShopGMV : activeOrderTotal;

    const totalAdvanceReceived = orders.reduce((sum, o) => sum + (o.advancePaid || 0), 0);
    const totalBalanceDue = orders.reduce((sum, o) => sum + (o.balanceDue || 0), 0);

    // Payment Modes
    const paymentModeCounts: Record<string, number> = {
      'UPI (Scan & Pay)': 0,
      Cash: 0,
      'Other (Card/Wallet)': 0,
    };

    orders.forEach((o) => {
      const mode = o.paymentMode || 'Cash';
      paymentModeCounts[mode] = (paymentModeCounts[mode] || 0) + o.advancePaid;
    });

    const totalAdvance = totalAdvanceReceived || 1;
    const upiPercent = Math.round(((paymentModeCounts['UPI (Scan & Pay)'] || 0) / totalAdvance) * 100);
    const cashPercent = Math.round(((paymentModeCounts['Cash'] || 0) / totalAdvance) * 100);
    const otherPercent = Math.max(0, 100 - upiPercent - cashPercent);

    return {
      totalGrossRevenue,
      totalAdvanceReceived,
      totalBalanceDue,
      upiPercent,
      cashPercent,
      otherPercent,
      paymentModeCounts,
    };
  }, [shops, orders]);

  const handleExportFinancialsCSV = () => {
    const headers = ['Metric', 'Amount (INR) / Value'];
    const rows = [
      ['Gross Platform Transaction Volume (GMV)', financials.totalGrossRevenue],
      ['Total Advance Collected', financials.totalAdvanceReceived],
      ['Pending Balance Collections Due', financials.totalBalanceDue],
      ['UPI Share %', `${financials.upiPercent}%`],
      ['Cash Share %', `${financials.cashPercent}%`],
      ['Card / Other Share %', `${financials.otherPercent}%`],
      ['Generated On', new Date().toISOString()],
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ShopScopers_Financial_Settlement_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header Card */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Financials & Settlements</span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
              Audit & Ledger Ready
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Revenue Analytics, UPI Settlement & Cash Flow
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time multi-tenant GMV, advance receipts, pending customer dues, and payment gateway distributions.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportFinancialsCSV}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Financial Ledger</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Total Platform GMV</span>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            ₹{financials.totalGrossRevenue.toLocaleString('en-IN')}
          </div>
          <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 mt-1">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Across all tenant shops</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Advance Received</span>
          <div className="text-2xl font-black text-emerald-700 tracking-tight">
            ₹{financials.totalAdvanceReceived.toLocaleString('en-IN')}
          </div>
          <span className="text-[11px] text-slate-500 font-medium">Secured booking advances</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Pending Balance Dues</span>
          <div className="text-2xl font-black text-amber-700 tracking-tight">
            ₹{financials.totalBalanceDue.toLocaleString('en-IN')}
          </div>
          <span className="text-[11px] text-amber-800 font-medium">Collectable at delivery/trials</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Digital UPI Share</span>
          <div className="text-2xl font-black text-emerald-800 tracking-tight">
            {financials.upiPercent}%
          </div>
          <span className="text-[11px] text-slate-500 font-medium">Scan & Pay / GPay PhonePe</span>
        </div>
      </div>

      {/* Payment Modes & Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Channels Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-700" />
                Payment Channels Distribution
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">UPI Scan & Pay vs Cash settlement ratios</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-800">UPI Scan & Pay (GPay / PhonePe / Paytm)</span>
                <span className="font-bold text-emerald-800">{financials.upiPercent}%</span>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-700 rounded-full" style={{ width: `${Math.max(5, financials.upiPercent)}%` }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-800">Direct Physical Cash</span>
                <span className="font-bold text-amber-700">{financials.cashPercent}%</span>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full" style={{ width: `${Math.max(5, financials.cashPercent)}%` }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-800">Credit / Debit Card / Digital Wallets</span>
                <span className="font-bold text-blue-700">{financials.otherPercent}%</span>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.max(5, financials.otherPercent)}%` }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Shop Revenue Performance Rankings */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-700" />
                Top Revenue Boutiques
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Stitching and retail gross volume contributions</p>
            </div>
          </div>

          <div className="space-y-3">
            {shops
              .slice()
              .sort((a, b) => b.grossRevenue - a.grossRevenue)
              .slice(0, 4)
              .map((shop, idx) => (
                <div key={shop.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 text-xs">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-slate-200 font-bold text-slate-700 flex items-center justify-center text-[10px]">
                      #{idx + 1}
                    </span>
                    <div>
                      <div className="font-bold text-slate-900">{shop.shopName}</div>
                      <div className="text-slate-500 text-[11px]">{shop.city} • {shop.planTier}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-emerald-800 text-sm">₹{shop.grossRevenue.toLocaleString('en-IN')}</span>
                    <span className="text-[10px] text-slate-400 block">{shop.totalOrders} Orders</span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
};
