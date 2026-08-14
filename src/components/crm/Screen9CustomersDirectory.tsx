import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  Phone,
  MessageSquare,
  Calendar,
  DollarSign,
  Scissors,
  CheckCircle,
  Clock,
  ArrowLeft,
  Filter,
  Plus,
  Edit3,
  FileText,
  ChevronRight,
  TrendingUp,
  UserCheck,
  Sparkles,
  AlertCircle,
  Printer,
  X,
  Save,
  Eye,
  Camera,
  Mic,
  ShieldCheck,
} from 'lucide-react';
import { TailorCustomer, TailorOrder, MeasurementMap } from '../../types';
import { roomDb } from '../../lib/localRoomDb';
import { getWhatsAppUrl, clean10DigitPhone, formatDisplayPhone } from '../../lib/phoneUtils';

interface Screen9CustomersDirectoryProps {
  customers: TailorCustomer[];
  orders: TailorOrder[];
  onBack: () => void;
  onSelectOrder?: (order: TailorOrder) => void;
  onNewOrderForCustomer?: (customer: TailorCustomer) => void;
  isDesktopView?: boolean;
}

export const Screen9CustomersDirectory: React.FC<Screen9CustomersDirectoryProps> = ({
  customers: propCustomers,
  orders: propOrders,
  onBack,
  onSelectOrder,
  onNewOrderForCustomer,
  isDesktopView = false,
}) => {
  const [allCustomers, setAllCustomers] = useState<TailorCustomer[]>(() =>
    propCustomers.length > 0 ? propCustomers : roomDb.getCustomers()
  );
  const [allOrders, setAllOrders] = useState<TailorOrder[]>(() =>
    propOrders.length > 0 ? propOrders : roomDb.getOrders()
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'repeat' | 'pending_balance' | 'high_spenders'>('all');
  const [selectedCustomer, setSelectedCustomer] = useState<TailorCustomer | null>(null);

  // Active sub-tab inside Customer Details modal
  const [customerModalTab, setCustomerModalTab] = useState<'orders' | 'measurements' | 'ledger'>('orders');

  // Measurement Edit State inside Customer Modal
  const [isEditingMeasurements, setIsEditingMeasurements] = useState(false);
  const [editedMeasurements, setEditedMeasurements] = useState<MeasurementMap>({});
  const [editNotes, setEditNotes] = useState('');

  // Receipt Modal State
  const [viewingReceiptOrder, setViewingReceiptOrder] = useState<TailorOrder | null>(null);

  // Filter & Search logic
  const filteredCustomers = useMemo(() => {
    return allCustomers.filter((c) => {
      const matchesSearch =
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.phone.includes(searchQuery);

      if (!matchesSearch) return false;

      // Customer orders
      const custOrders = allOrders.filter(
        (o) => o.customerPhone === c.phone || o.customerId === c.id
      );
      const totalDue = custOrders.reduce((sum, o) => sum + (o.balanceDue || 0), 0);

      if (filterType === 'repeat') return c.isRepeat || custOrders.length > 1;
      if (filterType === 'pending_balance') return totalDue > 0;
      if (filterType === 'high_spenders') return (c.totalSpent || 0) >= 3000;

      return true;
    });
  }, [allCustomers, allOrders, searchQuery, filterType]);

  // Overall Directory Metrics
  const stats = useMemo(() => {
    const totalCustomers = allCustomers.length;
    const repeatCount = allCustomers.filter((c) => c.isRepeat || c.ordersCount > 1).length;
    const repeatPercent = totalCustomers > 0 ? Math.round((repeatCount / totalCustomers) * 100) : 0;
    const totalLifetimeRev = allCustomers.reduce((sum, c) => sum + (c.totalSpent || 0), 0);
    const avgSpend = totalCustomers > 0 ? Math.round(totalLifetimeRev / totalCustomers) : 0;

    return { totalCustomers, repeatPercent, totalLifetimeRev, avgSpend };
  }, [allCustomers]);

  // Handle open customer details
  const handleOpenCustomer = (customer: TailorCustomer) => {
    setSelectedCustomer(customer);
    setEditedMeasurements(customer.measurements || {});
    setEditNotes(customer.notes || '');
    setIsEditingMeasurements(false);
    setCustomerModalTab('orders');
  };

  // Save updated measurements
  const handleSaveMeasurements = () => {
    if (!selectedCustomer) return;

    const updatedCust: TailorCustomer = {
      ...selectedCustomer,
      measurements: editedMeasurements,
      notes: editNotes,
    };

    roomDb.saveCustomer(updatedCust);

    // Update local state
    setAllCustomers((prev) =>
      prev.map((c) => (c.phone === updatedCust.phone || c.id === updatedCust.id ? updatedCust : c))
    );
    setSelectedCustomer(updatedCust);
    setIsEditingMeasurements(false);
    alert('Customer measurements and tailoring notes saved successfully!');
  };

  // Get orders of currently selected customer
  const selectedCustomerOrders = useMemo(() => {
    if (!selectedCustomer) return [];
    return allOrders.filter(
      (o) => o.customerPhone === selectedCustomer.phone || o.customerId === selectedCustomer.id
    );
  }, [selectedCustomer, allOrders]);

  // Selected customer financial tally
  const customerFinancials = useMemo(() => {
    if (!selectedCustomer) return { totalBooked: 0, advancePaid: 0, balanceDue: 0 };
    const totalBooked = selectedCustomerOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const advancePaid = selectedCustomerOrders.reduce((sum, o) => sum + (o.advancePaid || 0), 0);
    const balanceDue = selectedCustomerOrders.reduce((sum, o) => sum + (o.balanceDue || 0), 0);
    return { totalBooked, advancePaid, balanceDue };
  }, [selectedCustomer, selectedCustomerOrders]);

  return (
    <div className={`min-h-full bg-[#F8F9FA] text-slate-900 font-sans ${isDesktopView ? 'p-6' : 'pb-24'}`}>
      {/* Mobile Top Header */}
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
              <h1 className="text-base font-extrabold tracking-tight flex items-center gap-1.5">
                <Users className="w-4 h-4 text-amber-400" />
                <span>My Customers Directory</span>
              </h1>
              <p className="text-[10px] text-amber-300">Client Profiles, Saved Measurements & Order Slips</p>
            </div>
          </div>

          <button
            onClick={() => {
              if (allCustomers[0] && onNewOrderForCustomer) {
                onNewOrderForCustomer(allCustomers[0]);
              } else {
                onBack();
              }
            }}
            className="bg-amber-400 hover:bg-amber-300 text-[#0B4636] px-3 py-1.5 rounded-xl font-bold text-xs shadow flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Order</span>
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200">
          <div>
            <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
              <Users className="w-7 h-7 text-[#0B4636]" />
              <span>Customer Relationship Hub</span>
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Access customer order histories, digital measurement profiles, digital receipts, and lifetime spend.
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
          </div>
        </div>
      )}

      <div className={`space-y-4 ${isDesktopView ? 'w-full' : 'p-4 max-w-2xl mx-auto'}`}>
        {/* Top 4 KPI Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Total Customers</span>
            <div className="text-xl font-black text-slate-900 mt-0.5">{stats.totalCustomers}</div>
            <span className="text-[10px] font-bold text-[#0B4636] flex items-center gap-0.5 mt-0.5">
              <UserCheck className="w-3 h-3" />
              Verified Profiles
            </span>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-[10px] font-bold text-emerald-800 uppercase block">Repeat Rate</span>
            <div className="text-xl font-black text-emerald-800 mt-0.5">{stats.repeatPercent}%</div>
            <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-0.5 mt-0.5">
              <TrendingUp className="w-3 h-3" />
              Loyal Repeat Clients
            </span>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-[10px] font-bold text-blue-800 uppercase block">Customer Revenue</span>
            <div className="text-xl font-black text-blue-900 mt-0.5">₹{stats.totalLifetimeRev.toLocaleString()}</div>
            <span className="text-[10px] font-bold text-blue-700 flex items-center gap-0.5 mt-0.5">
              Lifetime Spend
            </span>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-[10px] font-bold text-amber-800 uppercase block">Avg. Ticket Size</span>
            <div className="text-xl font-black text-amber-900 mt-0.5">₹{stats.avgSpend.toLocaleString()}</div>
            <span className="text-[10px] font-bold text-amber-700 flex items-center gap-0.5 mt-0.5">
              Per Client Value
            </span>
          </div>
        </div>

        {/* Search & Filter Controls */}
        <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by customer name or phone number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B4636] font-medium"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            {(
              [
                { id: 'all', label: 'All Customers' },
                { id: 'repeat', label: 'Repeat Clients' },
                { id: 'pending_balance', label: 'Pending Dues' },
                { id: 'high_spenders', label: 'VIP (₹3k+)' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterType(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  filterType === tab.id
                    ? 'bg-[#0B4636] text-white shadow-sm'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Customers List Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredCustomers.length === 0 ? (
            <div className="col-span-full py-12 text-center bg-white rounded-2xl border border-slate-200 shadow-sm">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-2" />
              <h3 className="text-sm font-black text-slate-700">No Customers Found</h3>
              <p className="text-xs text-slate-500 mt-1">Try adjusting your search or filter criteria.</p>
            </div>
          ) : (
            filteredCustomers.map((cust) => {
              const custOrders = allOrders.filter(
                (o) => o.customerPhone === cust.phone || o.customerId === cust.id
              );
              const totalSpent = cust.totalSpent || custOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
              const totalDue = custOrders.reduce((sum, o) => sum + (o.balanceDue || 0), 0);
              const lastOrder = custOrders[0];

              return (
                <div
                  key={cust.id || cust.phone}
                  onClick={() => handleOpenCustomer(cust)}
                  className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm hover:shadow-md hover:border-[#0B4636]/40 transition-all cursor-pointer flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-full bg-[#0B4636]/10 text-[#0B4636] font-black text-sm flex items-center justify-center border border-[#0B4636]/20">
                          {cust.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-extrabold text-sm text-slate-900 group-hover:text-[#0B4636] transition-colors flex items-center gap-1.5">
                            <span>{cust.name}</span>
                            {cust.isRepeat && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-amber-100 text-amber-900 border border-amber-300">
                                Repeat
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{formatDisplayPhone(cust.phone)}</span>
                          </div>
                        </div>
                      </div>

                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                        {custOrders.length} Order{custOrders.length !== 1 ? 's' : ''}
                      </span>
                    </div>

                    {/* Customer Stats Strip */}
                    <div className="grid grid-cols-2 gap-2 mt-3.5 pt-3 border-t border-slate-100 text-xs">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Spend</span>
                        <span className="font-black text-[#0B4636] text-sm">₹{totalSpent.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Pending Due</span>
                        <span
                          className={`font-black text-sm ${
                            totalDue > 0 ? 'text-rose-600' : 'text-emerald-700'
                          }`}
                        >
                          {totalDue > 0 ? `₹${totalDue.toLocaleString()}` : 'Cleared'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Footer Bar */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <span className="flex items-center gap-1 font-medium">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      Last: {lastOrder?.createdDate || cust.lastOrderDate || 'Recently'}
                    </span>

                    <span className="text-[#0B4636] font-bold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                      View Profile
                      <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ================= DETAILED CUSTOMER PROFILE & ORDER HISTORY MODAL ================= */}
      {selectedCustomer && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in duration-150">
            {/* Modal Header Banner */}
            <div className="bg-[#0B4636] text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-400 text-[#0B4636] font-black text-lg flex items-center justify-center shadow">
                  {selectedCustomer.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-black">{selectedCustomer.name}</h2>
                    {selectedCustomer.isRepeat && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-300 text-[#0B4636]">
                        Repeat Client
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-amber-200 font-semibold flex items-center gap-3 mt-0.5">
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {formatDisplayPhone(selectedCustomer.phone)}
                    </span>
                    <span>•</span>
                    <span>{selectedCustomerOrders.length} Total Orders Placed</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={getWhatsAppUrl(
                    selectedCustomer.phone,
                    `Hello ${selectedCustomer.name}, this is from your boutique. Thank you for your continued patronage!`
                  )}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white shadow transition-all cursor-pointer"
                  title="WhatsApp Customer"
                >
                  <MessageSquare className="w-4 h-4" />
                </a>

                <a
                  href={`tel:${clean10DigitPhone(selectedCustomer.phone)}`}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
                  title="Call Customer"
                >
                  <Phone className="w-4 h-4" />
                </a>

                <button
                  onClick={() => setSelectedCustomer(null)}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Financial Ledger Quick Strip */}
            <div className="bg-amber-50 px-5 py-3 border-b border-amber-200 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-6">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Total Booked</span>
                  <span className="font-black text-slate-900 text-sm">₹{customerFinancials.totalBooked.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-emerald-800 uppercase block">Advance Paid</span>
                  <span className="font-black text-emerald-800 text-sm">₹{customerFinancials.advancePaid.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-rose-700 uppercase block">Pending Balance Due</span>
                  <span className="font-black text-rose-700 text-sm">₹{customerFinancials.balanceDue.toLocaleString()}</span>
                </div>
              </div>

              {onNewOrderForCustomer && (
                <button
                  onClick={() => {
                    const cust = selectedCustomer;
                    setSelectedCustomer(null);
                    onNewOrderForCustomer(cust);
                  }}
                  className="px-3 py-1.5 bg-[#0B4636] hover:bg-[#073024] text-amber-300 font-extrabold rounded-xl text-xs shadow flex items-center gap-1.5 cursor-pointer border border-amber-300/30"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create New Order</span>
                </button>
              )}
            </div>

            {/* Sub-tab Navigation: Orders / Saved Measurements / Ledger */}
            <div className="px-5 pt-3 border-b border-slate-200 flex items-center gap-4 text-xs font-bold">
              <button
                onClick={() => setCustomerModalTab('orders')}
                className={`pb-2.5 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                  customerModalTab === 'orders'
                    ? 'border-[#0B4636] text-[#0B4636]'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Scissors className="w-4 h-4" />
                <span>All Placed Orders ({selectedCustomerOrders.length})</span>
              </button>

              <button
                onClick={() => setCustomerModalTab('measurements')}
                className={`pb-2.5 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                  customerModalTab === 'measurements'
                    ? 'border-[#0B4636] text-[#0B4636]'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Saved Body Measurements</span>
              </button>
            </div>

            {/* Modal Body Content */}
            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              {/* TAB 1: PLACED ORDERS & RECEIPTS */}
              {customerModalTab === 'orders' && (
                <div className="space-y-3">
                  {selectedCustomerOrders.length === 0 ? (
                    <div className="text-center py-10 bg-slate-50 rounded-2xl border border-slate-200">
                      <Scissors className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs font-bold text-slate-600">No Orders Placed Yet</p>
                    </div>
                  ) : (
                    selectedCustomerOrders.map((ord) => (
                      <div
                        key={ord.id}
                        className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm hover:border-[#0B4636]/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-sm text-slate-900">{ord.garmentType}</span>
                            <span className="text-xs font-mono font-bold text-slate-500">#{ord.id}</span>
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                                ord.status === 'Delivered'
                                  ? 'bg-slate-800 text-white'
                                  : ord.status === 'Completed'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : ord.status === 'Stitching in Progress'
                                  ? 'bg-indigo-100 text-indigo-900 animate-pulse'
                                  : ord.status === 'Assigned'
                                  ? 'bg-blue-100 text-blue-900'
                                  : 'bg-amber-100 text-amber-900'
                              }`}
                            >
                              {ord.status === 'New / Cutting'
                                ? '1. Cutting'
                                : ord.status === 'Assigned'
                                ? '2. Assigned'
                                : ord.status === 'Stitching in Progress'
                                ? '3. Stitching'
                                : ord.status === 'Completed'
                                ? '4. Ready'
                                : ord.status === 'Delivered'
                                ? '5. Delivered'
                                : ord.status}
                            </span>
                          </div>

                          <div className="text-xs text-slate-500 flex flex-wrap items-center gap-3">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              Booked: {ord.createdDate}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              Due: {ord.dueDate}
                            </span>
                            {ord.assignedTailor && (
                              <>
                                <span>•</span>
                                <span className="text-[#0B4636] font-bold">
                                  Karigar: {ord.assignedTailor}
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                          <div className="text-right">
                            <div className="text-xs font-bold text-slate-500">Total: ₹{ord.totalAmount}</div>
                            <div
                              className={`text-xs font-black ${
                                ord.balanceDue > 0 ? 'text-rose-600' : 'text-emerald-700'
                              }`}
                            >
                              {ord.balanceDue > 0 ? `Due: ₹${ord.balanceDue}` : 'Fully Paid'}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => setViewingReceiptOrder(ord)}
                              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1 cursor-pointer"
                              title="View Digital Receipt Slip"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>Receipt</span>
                            </button>

                            {onSelectOrder && (
                              <button
                                onClick={() => {
                                  setSelectedCustomer(null);
                                  onSelectOrder(ord);
                                }}
                                className="px-3 py-1.5 bg-[#0B4636] hover:bg-[#073024] text-white font-bold rounded-xl text-xs flex items-center gap-1 cursor-pointer"
                              >
                                <span>View</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* TAB 2: SAVED BODY MEASUREMENTS */}
              {customerModalTab === 'measurements' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between bg-emerald-900/5 p-3 rounded-2xl border border-emerald-800/10">
                    <div>
                      <h4 className="text-xs font-black text-[#0B4636] uppercase tracking-wider">
                        Tailoring Measurement Record
                      </h4>
                      <p className="text-[11px] text-slate-600">
                        Default saved body measurements for rapid repeat order entries.
                      </p>
                    </div>

                    {!isEditingMeasurements ? (
                      <button
                        onClick={() => setIsEditingMeasurements(true)}
                        className="px-3 py-1.5 bg-[#0B4636] hover:bg-[#073024] text-amber-300 font-bold rounded-xl text-xs flex items-center gap-1 shadow cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit Measurements</span>
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setIsEditingMeasurements(false)}
                          className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveMeasurements}
                          className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs flex items-center gap-1 shadow cursor-pointer"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>Save Changes</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Upper Body Grid */}
                  <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-2">
                    <span className="text-xs font-black text-slate-800 uppercase tracking-wider block">
                      1. Upper Body Measurements (Inches)
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {[
                        { key: 'chest', label: 'Chest / Bust' },
                        { key: 'shoulder', label: 'Shoulder' },
                        { key: 'frontLength', label: 'Front Length' },
                        { key: 'backLength', label: 'Back Length' },
                        { key: 'waist', label: 'Waist' },
                        { key: 'stomach', label: 'Stomach' },
                        { key: 'hip', label: 'Hip' },
                        { key: 'armhole', label: 'Armhole' },
                      ].map((m) => (
                        <div key={m.key} className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                          <label className="text-[10px] font-bold text-slate-500 block">{m.label}</label>
                          {isEditingMeasurements ? (
                            <input
                              type="text"
                              value={editedMeasurements[m.key] || ''}
                              onChange={(e) =>
                                setEditedMeasurements((prev) => ({ ...prev, [m.key]: e.target.value }))
                              }
                              placeholder="e.g. 38"
                              className="w-full mt-1 px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-black text-slate-900"
                            />
                          ) : (
                            <span className="text-sm font-black text-slate-900 block mt-0.5">
                              {editedMeasurements[m.key] ? `${editedMeasurements[m.key]}"` : '—'}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Lower Body Grid */}
                  <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-2">
                    <span className="text-xs font-black text-slate-800 uppercase tracking-wider block">
                      2. Lower Body & Trouser Measurements (Inches)
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {[
                        { key: 'pantLength', label: 'Pant / Length' },
                        { key: 'inseam', label: 'Inseam' },
                        { key: 'thigh', label: 'Thigh' },
                        { key: 'knee', label: 'Knee' },
                        { key: 'bottomHem', label: 'Bottom Hem (Mori)' },
                      ].map((m) => (
                        <div key={m.key} className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                          <label className="text-[10px] font-bold text-slate-500 block">{m.label}</label>
                          {isEditingMeasurements ? (
                            <input
                              type="text"
                              value={editedMeasurements[m.key] || ''}
                              onChange={(e) =>
                                setEditedMeasurements((prev) => ({ ...prev, [m.key]: e.target.value }))
                              }
                              placeholder="e.g. 40"
                              className="w-full mt-1 px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-black text-slate-900"
                            />
                          ) : (
                            <span className="text-sm font-black text-slate-900 block mt-0.5">
                              {editedMeasurements[m.key] ? `${editedMeasurements[m.key]}"` : '—'}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Sleeves & Neck Grid */}
                  <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-2">
                    <span className="text-xs font-black text-slate-800 uppercase tracking-wider block">
                      3. Sleeves & Neck (Inches)
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {[
                        { key: 'sleeveLength', label: 'Sleeve Length' },
                        { key: 'bicep', label: 'Bicep / Muscle' },
                        { key: 'wrist', label: 'Wrist / Cuff' },
                        { key: 'neck', label: 'Collar / Neck' },
                        { key: 'frontNeckDepth', label: 'Front Neck Gala' },
                        { key: 'backNeckDepth', label: 'Back Neck Gala' },
                      ].map((m) => (
                        <div key={m.key} className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                          <label className="text-[10px] font-bold text-slate-500 block">{m.label}</label>
                          {isEditingMeasurements ? (
                            <input
                              type="text"
                              value={editedMeasurements[m.key] || ''}
                              onChange={(e) =>
                                setEditedMeasurements((prev) => ({ ...prev, [m.key]: e.target.value }))
                              }
                              placeholder="e.g. 24"
                              className="w-full mt-1 px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-black text-slate-900"
                            />
                          ) : (
                            <span className="text-sm font-black text-slate-900 block mt-0.5">
                              {editedMeasurements[m.key] ? `${editedMeasurements[m.key]}"` : '—'}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Special Tailoring Notes */}
                  <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-2">
                    <label className="text-xs font-black text-slate-800 uppercase tracking-wider block">
                      Fit Preferences & Notes
                    </label>
                    {isEditingMeasurements ? (
                      <textarea
                        rows={2}
                        value={editNotes}
                        onChange={(e) => setEditNotes(e.target.value)}
                        placeholder="e.g. Prefers loose fit at waist, deep round neck for blouse..."
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900"
                      />
                    ) : (
                      <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200 italic">
                        {editNotes || selectedCustomer.notes || 'No special fit notes recorded.'}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= DIGITAL RECEIPT MODAL ================= */}
      {viewingReceiptOrder && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl border border-slate-200 space-y-4 my-auto animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-[#0B4636]" />
                <h3 className="font-extrabold text-base text-slate-900">Digital Order Receipt Slip</h3>
              </div>
              <button
                onClick={() => setViewingReceiptOrder(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 font-mono text-xs">
              <div className="text-center pb-2 border-b border-dashed border-slate-300">
                <h4 className="font-black text-sm text-[#0B4636] font-sans">BOUTIQUE STITCHING SLIP</h4>
                <p className="text-[10px] text-slate-500 font-sans">Order Ref: #{viewingReceiptOrder.id}</p>
                <p className="text-[10px] text-slate-400 font-sans">Booked: {viewingReceiptOrder.createdDate}</p>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-600">Customer:</span>
                  <span className="font-bold text-slate-900">{viewingReceiptOrder.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Phone:</span>
                  <span className="font-bold text-slate-900">{formatDisplayPhone(viewingReceiptOrder.customerPhone)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Garment:</span>
                  <span className="font-bold text-[#0B4636]">{viewingReceiptOrder.garmentType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Promised Date:</span>
                  <span className="font-bold text-slate-900">{viewingReceiptOrder.dueDate}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-dashed border-slate-300 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-600">Total Bill:</span>
                  <span className="font-bold">₹{viewingReceiptOrder.totalAmount}</span>
                </div>
                <div className="flex justify-between text-emerald-800">
                  <span>Advance Received:</span>
                  <span className="font-bold">₹{viewingReceiptOrder.advancePaid}</span>
                </div>
                <div className="flex justify-between font-black text-rose-700 text-sm pt-1 border-t border-slate-200">
                  <span>Balance Due:</span>
                  <span>₹{viewingReceiptOrder.balanceDue}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  window.print();
                }}
                className="flex-1 py-2.5 bg-[#0B4636] hover:bg-[#073024] text-white font-bold rounded-xl text-xs shadow flex items-center justify-center gap-2 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print Slip</span>
              </button>

              <button
                onClick={() => setViewingReceiptOrder(null)}
                className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
