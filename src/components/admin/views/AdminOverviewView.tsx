import React, { useMemo } from 'react';
import {
  Store,
  Scissors,
  Users,
  TrendingUp,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  ShieldCheck,
  Zap,
  Activity,
  Layers,
  Sparkles,
  DollarSign,
  ChevronRight,
  CheckCircle2,
  Bell,
  RefreshCw,
  Eye,
  Calendar,
} from 'lucide-react';
import { PlatformShop, TailorOrder, StaffTailor, TailorCustomer, AdminTab } from '../../../types';

interface AdminOverviewViewProps {
  shops: PlatformShop[];
  orders: TailorOrder[];
  customers: TailorCustomer[];
  tailors: StaffTailor[];
  onNavigateTab: (tab: AdminTab) => void;
  onSelectOrder?: (order: TailorOrder) => void;
  onRefresh: () => void;
}

export const AdminOverviewView: React.FC<AdminOverviewViewProps> = ({
  shops,
  orders,
  customers,
  tailors,
  onNavigateTab,
  onSelectOrder,
  onRefresh,
}) => {
  // Aggregate Platform Metrics purely from real data
  const metrics = useMemo(() => {
    const totalShops = shops.length || 1;
    const activeShops = shops.filter((s) => s.status === 'Active').length || (shops.length > 0 ? shops.length : 1);
    const enterpriseShops = shops.filter((s) => s.planTier === 'Boutique Enterprise').length;

    const totalOrdersCount = orders.length;
    const activeOrdersInQueue = orders.filter((o) => o.status !== 'Completed' && o.status !== 'Delivered' && !o.isArchived).length;
    const overdueOrders = orders.filter((o) => o.isOverdue && !o.isArchived).length;

    // Real GMV from actual orders
    const gmvAcrossPlatform = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const totalCustomersCount = customers.length;
    const totalKarigarsCount = tailors.length || 1;

    // Real workload capacity
    const activeBookedHours = orders
      .filter((o) => o.status !== 'Completed' && o.status !== 'Delivered' && !o.isArchived)
      .reduce((sum, o) => sum + (o.estimatedHours || 4), 0);
    const totalAvailableHours = Math.max(8, totalKarigarsCount * 8);
    const capacityUtilization = Math.min(100, Math.round((activeBookedHours / totalAvailableHours) * 100));

    return {
      totalShops,
      activeShops,
      enterpriseShops,
      totalOrdersCount,
      activeOrdersInQueue,
      overdueOrders,
      gmvAcrossPlatform,
      totalCustomersCount,
      totalKarigarsCount,
      capacityUtilization,
      activeBookedHours,
    };
  }, [shops, orders, customers, tailors]);

  // Stage distribution
  const statusCounts = useMemo(() => {
    const map: Record<string, number> = {
      'New / Cutting': 0,
      Assigned: 0,
      'Stitching in Progress': 0,
      Trial: 0,
      Completed: 0,
      Delivered: 0,
    };
    orders.forEach((o) => {
      if (map[o.status] !== undefined) map[o.status]++;
    });
    return map;
  }, [orders]);

  return (
    <div className="space-y-6">
      {/* Top Banner / Pulse Header */}
      <div className="bg-emerald-900 rounded-2xl p-6 text-white shadow-xl shadow-emerald-950/20 border border-emerald-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-800/80 border border-emerald-600/40 text-emerald-200 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Platform Live Hub
              </span>
              <span className="text-emerald-200/70 text-xs">• Real-Time Multi-Tenant Network</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Platform Administration & Operations
            </h1>
            <p className="text-xs sm:text-sm text-emerald-100/90 mt-1 max-w-2xl leading-relaxed">
              Global control panel for tenant tailor shops, master multi-shop orders ledger, workforce capacity allocation, and financial settlements.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onRefresh}
              className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-emerald-100 text-xs font-semibold flex items-center gap-2 border border-white/10 transition-all cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Pulse</span>
            </button>
            <button
              onClick={() => onNavigateTab('broadcasts')}
              className="px-4 py-2.5 rounded-xl bg-white hover:bg-emerald-50 text-emerald-900 font-bold text-xs flex items-center gap-2 shadow-md transition-all cursor-pointer"
            >
              <Bell className="w-3.5 h-3.5 text-emerald-700" />
              <span>Broadcast Alert</span>
            </button>
          </div>
        </div>

        {/* Quick Highlights Bar */}
        <div className="mt-6 pt-5 border-t border-emerald-800 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div className="bg-emerald-950/40 p-3 rounded-xl border border-emerald-800/50">
            <span className="text-emerald-300/70 block text-[11px]">Sync Protocol</span>
            <span className="text-white font-bold flex items-center gap-1 mt-0.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Room DB ↔ Cloud Sync
            </span>
          </div>
          <div className="bg-emerald-950/40 p-3 rounded-xl border border-emerald-800/50">
            <span className="text-emerald-300/70 block text-[11px]">Active Tenants</span>
            <span className="text-white font-bold flex items-center gap-1 mt-0.5">
              <Store className="w-3.5 h-3.5 text-emerald-300" />
              {metrics.activeShops} Active Boutique{metrics.activeShops !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="bg-emerald-950/40 p-3 rounded-xl border border-emerald-800/50">
            <span className="text-emerald-300/70 block text-[11px]">Workforce Size</span>
            <span className="text-white font-bold flex items-center gap-1 mt-0.5">
              <Scissors className="w-3.5 h-3.5 text-emerald-300" />
              {metrics.totalKarigarsCount} Staff Artisan{metrics.totalKarigarsCount !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="bg-emerald-950/40 p-3 rounded-xl border border-emerald-800/50">
            <span className="text-emerald-300/70 block text-[11px]">Security Grade</span>
            <span className="text-white font-bold flex items-center gap-1 mt-0.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Enterprise Strict
            </span>
          </div>
        </div>
      </div>

      {/* Primary KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Card 1: Total Shops */}
        <div
          onClick={() => onNavigateTab('shops')}
          className="bg-white p-4 rounded-2xl border border-slate-200/80 hover:border-emerald-700 shadow-xs hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tenant Shops</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:bg-emerald-700 group-hover:text-white transition-colors">
              <Store className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">{metrics.totalShops}</div>
          <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 mt-1">
            <span>{metrics.activeShops} active</span>
            {metrics.enterpriseShops > 0 && (
              <>
                <span className="text-slate-400">•</span>
                <span className="text-slate-500">{metrics.enterpriseShops} Enterprise</span>
              </>
            )}
          </div>
        </div>

        {/* Card 2: Active Orders */}
        <div
          onClick={() => onNavigateTab('orders')}
          className="bg-white p-4 rounded-2xl border border-slate-200/80 hover:border-emerald-700 shadow-xs hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Active Pipeline</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:bg-emerald-700 group-hover:text-white transition-colors">
              <Scissors className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {metrics.activeOrdersInQueue}
            <span className="text-xs font-medium text-slate-400 ml-1.5">orders</span>
          </div>
          <div className="text-[11px] font-semibold text-slate-500 mt-1 flex items-center gap-1">
            <span>{metrics.totalOrdersCount} lifetime total</span>
          </div>
        </div>

        {/* Card 3: Platform GMV */}
        <div
          onClick={() => onNavigateTab('revenue')}
          className="bg-white p-4 rounded-2xl border border-slate-200/80 hover:border-emerald-700 shadow-xs hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Gross Volume (GMV)</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:bg-emerald-700 group-hover:text-white transition-colors">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            ₹{metrics.gmvAcrossPlatform.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] font-semibold text-emerald-700 mt-1 flex items-center gap-1">
            <ArrowUpRight className="w-3 h-3" />
            <span>Total order volume</span>
          </div>
        </div>

        {/* Card 4: Workforce Capacity */}
        <div
          onClick={() => onNavigateTab('workforce')}
          className="bg-white p-4 rounded-2xl border border-slate-200/80 hover:border-emerald-700 shadow-xs hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Workforce Load</span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center group-hover:bg-slate-700 group-hover:text-white transition-colors">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {metrics.capacityUtilization}%
          </div>
          <div className="text-[11px] font-semibold text-slate-500 mt-1">
            <span>{metrics.totalKarigarsCount} karigar{metrics.totalKarigarsCount !== 1 ? 's' : ''} on-duty</span>
          </div>
        </div>

        {/* Card 5: Overdue Flag */}
        <div
          onClick={() => onNavigateTab('orders')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer group ${
            metrics.overdueOrders > 0
              ? 'bg-rose-50/50 border-rose-200 hover:border-rose-400'
              : 'bg-white border-slate-200/80 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">Overdue Alert</span>
            <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center group-hover:bg-rose-600 group-hover:text-white transition-colors">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-950 tracking-tight">{metrics.overdueOrders}</div>
          <div className="text-[11px] font-semibold text-rose-700 mt-1">
            {metrics.overdueOrders > 0 ? 'Requires attention' : 'All orders on track'}
          </div>
        </div>

        {/* Card 6: Total Customers */}
        <div
          onClick={() => onNavigateTab('customers')}
          className="bg-white p-4 rounded-2xl border border-slate-200/80 hover:border-emerald-700 shadow-xs hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Clients</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:bg-emerald-700 group-hover:text-white transition-colors">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {metrics.totalCustomersCount}
          </div>
          <div className="text-[11px] font-semibold text-slate-500 mt-1">
            <span>Saved client profiles</span>
          </div>
        </div>
      </div>

      {/* Middle Section: Shop Performance & Production Stage Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Tenant Shop Registry Snapshot */}
        <div className="lg:col-span-2 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Store className="w-4 h-4 text-emerald-700" />
                Top Tenant Shops by Volume
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Real-time status across multi-tenant boutiques</p>
            </div>
            <button
              onClick={() => onNavigateTab('shops')}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 cursor-pointer"
            >
              <span>View All ({shops.length})</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {shops.slice(0, 4).map((shop) => (
              <div
                key={shop.id}
                onClick={() => onNavigateTab('shops')}
                className="p-3.5 rounded-xl bg-slate-50 hover:bg-emerald-50/40 border border-slate-200/60 hover:border-emerald-200 transition-all flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-800 text-white flex items-center justify-center font-black text-sm shrink-0">
                    {shop.shopName.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">{shop.shopName}</span>
                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                          shop.status === 'Active'
                            ? 'bg-emerald-100 text-emerald-800'
                            : shop.status === 'Pending Verification'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {shop.status}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                      <span>{shop.ownerName}</span>
                      <span>•</span>
                      <span>{shop.city}, {shop.state}</span>
                      <span>•</span>
                      <span className="font-semibold text-slate-700">{shop.planTier}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-6 text-xs shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/60">
                  <div className="text-left sm:text-right">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Orders</span>
                    <span className="font-bold text-slate-800 text-sm">{shop.totalOrders}</span>
                  </div>
                  <div className="text-left sm:text-right">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Volume</span>
                    <span className="font-bold text-emerald-800 text-sm">₹{shop.grossRevenue.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="text-left sm:text-right">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Staff</span>
                    <span className="font-bold text-slate-800 text-sm">{shop.activeKarigarsCount}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right 1 Col: Production Pipeline Stage Distribution */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-700" />
                  Order Pipeline Stages
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">Active shop workload distribution</p>
              </div>
            </div>

            <div className="space-y-3">
              {[
                { stage: 'New / Cutting', count: statusCounts['New / Cutting'], color: 'bg-emerald-600', text: 'text-emerald-700', bg: 'bg-emerald-50' },
                { stage: 'Assigned', count: statusCounts['Assigned'], color: 'bg-slate-600', text: 'text-slate-700', bg: 'bg-slate-50' },
                { stage: 'Stitching in Progress', count: statusCounts['Stitching in Progress'], color: 'bg-emerald-700', text: 'text-emerald-800', bg: 'bg-emerald-50' },
                { stage: 'Trial', count: statusCounts['Trial'], color: 'bg-teal-600', text: 'text-teal-700', bg: 'bg-teal-50' },
                { stage: 'Completed', count: statusCounts['Completed'], color: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50' },
                { stage: 'Delivered', count: statusCounts['Delivered'], color: 'bg-slate-400', text: 'text-slate-600', bg: 'bg-slate-100' },
              ].map((item) => {
                const total = orders.length || 1;
                const pct = Math.round((item.count / total) * 100);

                return (
                  <div key={item.stage} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700">{item.stage}</span>
                      <span className="font-bold text-slate-900">
                        {item.count} <span className="text-slate-400 font-normal">({pct}%)</span>
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${item.color}`}
                        style={{ width: `${Math.max(4, pct)}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100">
            <button
              onClick={() => onNavigateTab('workforce')}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-emerald-700 text-slate-700 hover:text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <span>Inspect Workforce Capacity Matrix</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Section: Recent Orders & Quick Management Tools */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Scissors className="w-4 h-4 text-emerald-700" />
              Recent Live Orders Stream
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Multi-tenant order feed from synchronized Room & Cloud databases</p>
          </div>
          <button
            onClick={() => onNavigateTab('orders')}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 cursor-pointer"
          >
            <span>Open Master Orders Ledger</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {orders.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            No live orders found in the database.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200/80 text-slate-400 uppercase tracking-wider font-bold text-[10px]">
                  <th className="pb-3 pl-2">Order ID</th>
                  <th className="pb-3">Customer</th>
                  <th className="pb-3">Garment</th>
                  <th className="pb-3">Promised Due</th>
                  <th className="pb-3">Assigned Tailor</th>
                  <th className="pb-3">Amount</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 pr-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.slice(0, 5).map((ord) => (
                  <tr key={ord.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 pl-2 font-mono font-bold text-emerald-800">{ord.id}</td>
                    <td className="py-3">
                      <div className="font-bold text-slate-900">{ord.customerName}</div>
                      <div className="text-slate-400 text-[11px]">{ord.customerPhone}</div>
                    </td>
                    <td className="py-3 font-medium text-slate-700">{ord.garmentType}</td>
                    <td className="py-3">
                      <div className={`font-semibold ${ord.isOverdue ? 'text-rose-600' : 'text-slate-800'}`}>
                        {ord.dueDate || 'Standard'}
                      </div>
                      <div className="text-slate-400 text-[10px]">{ord.dueTime || '18:00'}</div>
                    </td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium text-[11px]">
                        {ord.assignedTailor || 'Unassigned'}
                      </span>
                    </td>
                    <td className="py-3 font-bold text-slate-900">
                      ₹{ord.totalAmount}
                      {ord.balanceDue > 0 && (
                        <span className="text-[10px] text-amber-600 font-normal block">Due: ₹{ord.balanceDue}</span>
                      )}
                    </td>
                    <td className="py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          ord.status === 'Delivered'
                            ? 'bg-slate-100 text-slate-700'
                            : ord.status === 'Completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : ord.status === 'Trial'
                            ? 'bg-teal-100 text-teal-800'
                            : ord.status === 'Stitching in Progress'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {ord.status}
                      </span>
                    </td>
                    <td className="py-3 pr-2 text-right">
                      <button
                        onClick={() => {
                          if (onSelectOrder) onSelectOrder(ord);
                          onNavigateTab('orders');
                        }}
                        className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-700 text-emerald-800 hover:text-white font-bold text-[11px] transition-colors cursor-pointer"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
