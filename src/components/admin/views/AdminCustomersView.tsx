import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  Filter,
  Phone,
  Calendar,
  Sparkles,
  Award,
  Scissors,
  DollarSign,
  Download,
  Eye,
  Send,
  X,
  CheckCircle2,
} from 'lucide-react';
import { TailorCustomer, TailorOrder } from '../../../types';
import { clean10DigitPhone, getWhatsAppUrl } from '../../../lib/phoneUtils';

interface AdminCustomersViewProps {
  customers: TailorCustomer[];
  orders: TailorOrder[];
}

export const AdminCustomersView: React.FC<AdminCustomersViewProps> = ({ customers, orders }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'REPEAT' | 'VIP' | 'RECENT'>('ALL');
  const [selectedCustomer, setSelectedCustomer] = useState<TailorCustomer | null>(null);

  // Aggregate Customer Metrics
  const customerListWithLTV = useMemo(() => {
    return customers.map((c) => {
      const custOrders = orders.filter((o) => o.customerPhone === c.phone || o.customerId === c.id);
      const totalSpentCalculated = custOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
      const ordersCount = Math.max(c.ordersCount || 0, custOrders.length);
      const isVip = totalSpentCalculated > 5000 || ordersCount >= 3;

      return {
        ...c,
        calculatedTotalSpent: totalSpentCalculated || c.totalSpent || 0,
        calculatedOrdersCount: ordersCount,
        isVip,
        custOrders,
      };
    });
  }, [customers, orders]);

  const filteredCustomers = useMemo(() => {
    return customerListWithLTV.filter((cust) => {
      const q = (searchQuery || '').toLowerCase();
      const matchSearch =
        !q ||
        Boolean(cust.name && typeof cust.name === 'string' && cust.name.toLowerCase().includes(q)) ||
        Boolean(cust.phone && typeof cust.phone === 'string' && cust.phone.includes(searchQuery));

      let matchFilter = true;
      if (filterType === 'REPEAT') matchFilter = cust.calculatedOrdersCount > 1 || cust.isRepeat;
      if (filterType === 'VIP') matchFilter = cust.isVip;

      return matchSearch && matchFilter;
    });
  }, [customerListWithLTV, searchQuery, filterType]);

  const handleExportCustomersCSV = () => {
    const headers = ['Customer ID', 'Name', 'Phone', 'Orders Count', 'Total Spent (INR)', 'VIP Status', 'Registered On'];
    const rows = filteredCustomers.map((c) => [
      c.id,
      `"${c.name}"`,
      `"${c.phone}"`,
      c.calculatedOrdersCount,
      c.calculatedTotalSpent,
      c.isVip ? 'VIP Customer' : 'Standard',
      `"${c.createdAt || ''}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ShopScopers_Customers_Directory_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Top Header Card */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Client Base</span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
              {customers.length} Profiles Saved
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Global Customer Directory & Lifetime Value
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Aggregated customer profiles, measurement vault sync, repeat engagement, and lifetime spending.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportCustomersCSV}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Client Directory</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Strip */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search customers by name or 10-digit mobile..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:border-transparent transition-all"
          />
        </div>

        <div className="flex items-center gap-1.5">
          {(['ALL', 'REPEAT', 'VIP'] as const).map((ft) => (
            <button
              key={ft}
              onClick={() => setFilterType(ft)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                filterType === ft
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {ft === 'ALL' ? 'All Clients' : ft === 'REPEAT' ? 'Repeat (2+ Orders)' : 'VIP High LTV'}
            </button>
          ))}
        </div>
      </div>

      {/* Customer Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCustomers.map((cust) => {
          const cleanPhone = clean10DigitPhone(cust.phone);
          const whatsappUrl = getWhatsAppUrl(cleanPhone, `Hello ${cust.name}, greetings from your tailoring master.`);

          return (
            <div
              key={cust.id}
              className="bg-white rounded-2xl border border-slate-200/80 hover:border-emerald-700/60 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-900 font-black text-sm flex items-center justify-center shrink-0">
                      {cust.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-bold text-slate-900 text-sm">{cust.name}</h3>
                        {cust.isVip && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 text-[9px] font-black uppercase">
                            VIP
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{cust.phone}</span>
                      </p>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      cust.calculatedOrdersCount > 1
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {cust.calculatedOrdersCount} {cust.calculatedOrdersCount === 1 ? 'Order' : 'Orders'}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 grid grid-cols-2 gap-2 text-xs mb-3">
                  <div>
                    <span className="text-slate-400 block text-[10px] font-semibold uppercase">Total Spent</span>
                    <span className="font-black text-emerald-800 text-sm">₹{cust.calculatedTotalSpent.toLocaleString('en-IN')}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] font-semibold uppercase">Measurements</span>
                    <span className="font-bold text-slate-800 text-xs">
                      {Object.keys(cust.measurements || {}).length} Parameters Saved
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-2 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center gap-1.5 transition-colors"
                >
                  <Send className="w-3 h-3" />
                  <span>WhatsApp</span>
                </a>

                <button
                  onClick={() => setSelectedCustomer(cust)}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs transition-colors cursor-pointer"
                >
                  View Fit Book
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Customer Profile & Fit Book Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 bg-emerald-800 text-white flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base">{selectedCustomer.name}</h3>
                  {selectedCustomer.isRepeat && (
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900">
                      Repeat Client
                    </span>
                  )}
                </div>
                <p className="text-xs text-emerald-200 mt-0.5">{selectedCustomer.phone}</p>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-700">
              {/* Measurement Matrix */}
              <div>
                <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                  <Scissors className="w-3.5 h-3.5 text-emerald-700" />
                  Saved Measurement Vault (Inches)
                </h4>
                {Object.keys(selectedCustomer.measurements || {}).length === 0 ? (
                  <p className="text-slate-400 italic">No measurements recorded yet.</p>
                ) : (
                  <div className="grid grid-cols-3 gap-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    {Object.entries(selectedCustomer.measurements).map(([param, val]) => (
                      <div key={param} className="bg-white p-2 rounded-lg border border-slate-200/60">
                        <span className="text-slate-400 block text-[10px] capitalize">{param.replace(/([A-Z])/g, ' $1')}</span>
                        <span className="font-black text-slate-900 text-sm">{val}"</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Order History */}
              <div>
                <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-purple-700" />
                  Order History ({selectedCustomer.ordersCount || 1})
                </h4>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex justify-between font-semibold text-slate-700">
                    <span>Lifetime Spending:</span>
                    <span className="font-black text-emerald-800">₹{selectedCustomer.totalSpent || 0}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Gender Category:</span>
                    <span className="font-medium text-slate-800">{selectedCustomer.gender || 'Female'}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Client Since:</span>
                    <span className="font-medium text-slate-800">
                      {selectedCustomer.createdAt ? new Date(selectedCustomer.createdAt).toLocaleDateString() : 'Active Member'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedCustomer(null)}
                className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs cursor-pointer transition-colors"
              >
                Close Fit Book
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
