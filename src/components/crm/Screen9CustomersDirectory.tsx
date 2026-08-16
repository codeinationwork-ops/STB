import React, { useState, useMemo, useEffect } from 'react';
import {
  Users,
  Search,
  Phone,
  MessageSquare,
  Calendar,
  Scissors,
  ArrowLeft,
  Plus,
  Edit3,
  FileText,
  ChevronRight,
  TrendingUp,
  UserCheck,
  Printer,
  X,
  Save,
  Camera,
  ShieldCheck,
  Copy,
  Check,
  Grid,
  List,
  ZoomIn,
  Wallet,
  Clock,
  Sparkles,
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
    propCustomers && propCustomers.length > 0 ? propCustomers : roomDb.getCustomers()
  );
  const [allOrders, setAllOrders] = useState<TailorOrder[]>(() =>
    propOrders && propOrders.length > 0 ? propOrders : roomDb.getOrders()
  );

  // Synchronize with database updates and props
  useEffect(() => {
    if (propCustomers && propCustomers.length > 0) {
      setAllCustomers(propCustomers);
    }
  }, [propCustomers]);

  useEffect(() => {
    if (propOrders && propOrders.length > 0) {
      setAllOrders(propOrders);
    }
  }, [propOrders]);

  useEffect(() => {
    const unsub = roomDb.subscribe(() => {
      setAllCustomers(roomDb.getCustomers());
      setAllOrders(roomDb.getOrders());
    });
    return unsub;
  }, []);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'repeat' | 'pending_balance' | 'high_spenders'>('all');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  // Customer Profile Modal State
  const [selectedCustomer, setSelectedCustomer] = useState<TailorCustomer | null>(null);
  const [customerModalTab, setCustomerModalTab] = useState<'measurements' | 'slips' | 'orders'>('measurements');

  // Measurement Edit State inside Customer Modal
  const [isEditingMeasurements, setIsEditingMeasurements] = useState(false);
  const [editedMeasurements, setEditedMeasurements] = useState<MeasurementMap>({});
  const [editNotes, setEditNotes] = useState('');

  // Receipt & Image Zoom State
  const [viewingReceiptOrder, setViewingReceiptOrder] = useState<TailorOrder | null>(null);
  const [zoomSlipUrl, setZoomSlipUrl] = useState<string | null>(null);
  const [copiedMeasurementsId, setCopiedMeasurementsId] = useState<string | null>(null);

  // Filter & Search logic
  const filteredCustomers = useMemo(() => {
    return allCustomers.filter((c) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || c.name.toLowerCase().includes(q) || c.phone.includes(q);

      if (!matchesSearch) return false;

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

  // Helper to extract customer orders
  const getCustomerOrders = (customer: TailorCustomer) => {
    return allOrders.filter(
      (o) => o.customerPhone === customer.phone || o.customerId === customer.id
    );
  };

  // Helper to get physical slip photos of a customer
  const getCustomerSlips = (customer: TailorCustomer) => {
    const custOrders = getCustomerOrders(customer);
    const slips: { order: TailorOrder; url: string; title: string; date: string }[] = [];
    custOrders.forEach((o) => {
      if (o.receiptImageUrl) {
        slips.push({
          order: o,
          url: o.receiptImageUrl,
          title: `Slip for ${o.garmentType} (#${o.id})`,
          date: o.createdDate,
        });
      }
    });
    return slips;
  };

  // Helper to format key measurements string for chips
  const getMeasurementHighlights = (measurements?: MeasurementMap) => {
    if (!measurements) return [];
    const highlights: { label: string; val: string }[] = [];
    if (measurements.chest) highlights.push({ label: 'Chest', val: `${measurements.chest}"` });
    if (measurements.waist) highlights.push({ label: 'Waist', val: `${measurements.waist}"` });
    if (measurements.frontLength || measurements.pantLength) {
      highlights.push({
        label: 'Length',
        val: `${measurements.frontLength || measurements.pantLength}"`,
      });
    }
    if (measurements.shoulder) highlights.push({ label: 'Shoulder', val: `${measurements.shoulder}"` });
    if (measurements.sleeveLength) highlights.push({ label: 'Sleeves', val: `${measurements.sleeveLength}"` });
    if (measurements.hip) highlights.push({ label: 'Hip', val: `${measurements.hip}"` });
    if (measurements.bottomHem) highlights.push({ label: 'Mori', val: `${measurements.bottomHem}"` });
    return highlights;
  };

  // Handle open customer details
  const handleOpenCustomer = (
    customer: TailorCustomer,
    defaultTab: 'measurements' | 'slips' | 'orders' = 'measurements'
  ) => {
    setSelectedCustomer(customer);
    setEditedMeasurements(customer.measurements || {});
    setEditNotes(customer.notes || '');
    setIsEditingMeasurements(false);
    setCustomerModalTab(defaultTab);
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

    setAllCustomers((prev) =>
      prev.map((c) => (c.phone === updatedCust.phone || c.id === updatedCust.id ? updatedCust : c))
    );
    setSelectedCustomer(updatedCust);
    setIsEditingMeasurements(false);
  };

  // Copy measurements to clipboard
  const handleCopyMeasurements = (customer: TailorCustomer, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const m = customer.measurements || {};
    const lines = [`📏 *Measurements for ${customer.name}* (${customer.phone}):`];
    if (m.chest) lines.push(`• Chest/Bust: ${m.chest}"`);
    if (m.shoulder) lines.push(`• Shoulder: ${m.shoulder}"`);
    if (m.frontLength) lines.push(`• Front Length: ${m.frontLength}"`);
    if (m.backLength) lines.push(`• Back Length: ${m.backLength}"`);
    if (m.waist) lines.push(`• Waist: ${m.waist}"`);
    if (m.hip) lines.push(`• Hip: ${m.hip}"`);
    if (m.sleeveLength) lines.push(`• Sleeves: ${m.sleeveLength}"`);
    if (m.pantLength) lines.push(`• Pant Length: ${m.pantLength}"`);
    if (m.bottomHem) lines.push(`• Bottom/Mori: ${m.bottomHem}"`);
    if (m.neck) lines.push(`• Neck: ${m.neck}"`);
    if (customer.notes) lines.push(`📝 *Notes*: ${customer.notes}`);

    navigator.clipboard.writeText(lines.join('\n'));
    setCopiedMeasurementsId(customer.id);
    setTimeout(() => setCopiedMeasurementsId(null), 2000);
  };

  // Selected customer computed data
  const selectedCustomerOrders = useMemo(() => {
    if (!selectedCustomer) return [];
    return getCustomerOrders(selectedCustomer);
  }, [selectedCustomer, allOrders]);

  const selectedCustomerSlips = useMemo(() => {
    if (!selectedCustomer) return [];
    return getCustomerSlips(selectedCustomer);
  }, [selectedCustomer, allOrders]);

  const customerFinancials = useMemo(() => {
    if (!selectedCustomer) return { totalBooked: 0, advancePaid: 0, balanceDue: 0 };
    const totalBooked = selectedCustomerOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const advancePaid = selectedCustomerOrders.reduce((sum, o) => sum + (o.advancePaid || 0), 0);
    const balanceDue = selectedCustomerOrders.reduce((sum, o) => sum + (o.balanceDue || 0), 0);
    return { totalBooked, advancePaid, balanceDue };
  }, [selectedCustomer, selectedCustomerOrders]);

  return (
    <div className={`min-h-full bg-[#F8F9FA] text-slate-900 font-sans ${isDesktopView ? 'p-6' : 'pb-24'}`}>
      {/* ========================================================================= */}
      {/* TOP HEADER (FULLY MOBILE OPTIMIZED) */}
      {/* ========================================================================= */}
      {!isDesktopView ? (
        <div className="bg-[#0B4636] text-white px-3.5 py-3 sticky top-0 z-30 shadow-md flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              onClick={onBack}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-white shrink-0 cursor-pointer"
              aria-label="Go Back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <h1 className="text-sm font-black tracking-tight flex items-center gap-1.5 truncate">
                <Users className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="truncate">Customers & Measurements</span>
              </h1>
              <p className="text-[10px] text-amber-300 font-medium truncate">
                {allCustomers.length} Clients • Saved Books & Slips
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-white/15 p-0.5 rounded-lg border border-white/20">
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded text-xs font-bold transition-all ${
                  viewMode === 'list' ? 'bg-amber-400 text-[#0B4636] shadow-xs' : 'text-white/80'
                }`}
                title="List View"
              >
                <List className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded text-xs font-bold transition-all ${
                  viewMode === 'grid' ? 'bg-amber-400 text-[#0B4636] shadow-xs' : 'text-white/80'
                }`}
                title="Cards View"
              >
                <Grid className="w-3.5 h-3.5" />
              </button>
            </div>

            {onNewOrderForCustomer && (
              <button
                onClick={() => {
                  if (allCustomers[0]) {
                    onNewOrderForCustomer(allCustomers[0]);
                  } else {
                    onBack();
                  }
                }}
                className="bg-amber-400 hover:bg-amber-300 active:scale-95 text-[#0B4636] px-2.5 py-1.5 rounded-xl font-black text-xs shadow-xs flex items-center gap-1 cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Order</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200">
          <div>
            <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
              <Users className="w-7 h-7 text-[#0B4636]" />
              <span>Customers Directory & Measurements</span>
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Browse customer lists, physical order slip photos, digital measurement charts, and financial ledgers.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'list' ? 'bg-[#0B4636] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <List className="w-4 h-4" />
                <span>List View</span>
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'grid' ? 'bg-[#0B4636] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Grid className="w-4 h-4" />
                <span>Cards View</span>
              </button>
            </div>

            <button
              onClick={onBack}
              className="text-xs font-bold text-slate-600 hover:text-[#0B4636] flex items-center gap-1 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-xs cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MAIN CONTENT WRAPPER */}
      {/* ========================================================================= */}
      <div className={`space-y-3 sm:space-y-4 ${isDesktopView ? 'w-full' : 'p-3 sm:p-4 max-w-5xl mx-auto'}`}>
        {/* KPI Metrics Bar (Mobile Compact) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
          <div className="bg-white p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl border border-slate-200/80 shadow-2xs">
            <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase block">Total Clients</span>
            <div className="text-base sm:text-xl font-black text-slate-900 mt-0.5">{stats.totalCustomers}</div>
            <span className="text-[9px] sm:text-[10px] font-bold text-[#0B4636] flex items-center gap-0.5 mt-0.5">
              <UserCheck className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              Profiles
            </span>
          </div>

          <div className="bg-white p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl border border-slate-200/80 shadow-2xs">
            <span className="text-[9px] sm:text-[10px] font-bold text-emerald-800 uppercase block">Repeat Rate</span>
            <div className="text-base sm:text-xl font-black text-emerald-800 mt-0.5">{stats.repeatPercent}%</div>
            <span className="text-[9px] sm:text-[10px] font-bold text-emerald-700 flex items-center gap-0.5 mt-0.5">
              <TrendingUp className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              Loyal
            </span>
          </div>

          <div className="bg-white p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl border border-slate-200/80 shadow-2xs">
            <span className="text-[9px] sm:text-[10px] font-bold text-blue-800 uppercase block">Total Rev</span>
            <div className="text-base sm:text-xl font-black text-blue-900 mt-0.5">₹{stats.totalLifetimeRev.toLocaleString()}</div>
            <span className="text-[9px] sm:text-[10px] font-bold text-blue-700 block mt-0.5 truncate">
              Lifetime Spend
            </span>
          </div>

          <div className="bg-white p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl border border-slate-200/80 shadow-2xs">
            <span className="text-[9px] sm:text-[10px] font-bold text-amber-800 uppercase block">Avg Ticket</span>
            <div className="text-base sm:text-xl font-black text-amber-900 mt-0.5">₹{stats.avgSpend.toLocaleString()}</div>
            <span className="text-[9px] sm:text-[10px] font-bold text-amber-700 block mt-0.5 truncate">
              Per Client
            </span>
          </div>
        </div>

        {/* Search & Filter Controls (Mobile Friendly Scroll) */}
        <div className="bg-white rounded-xl sm:rounded-2xl p-2.5 sm:p-3 border border-slate-200/80 shadow-2xs space-y-2 sm:space-y-0 sm:flex sm:items-center sm:justify-between sm:gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by customer name or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-7 py-1.5 sm:py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B4636] font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-0.5 sm:pb-0 scrollbar-none">
            {(
              [
                { id: 'all', label: 'All' },
                { id: 'repeat', label: 'Repeat' },
                { id: 'pending_balance', label: 'Pending Dues' },
                { id: 'high_spenders', label: 'VIP (₹3k+)' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterType(tab.id)}
                className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                  filterType === tab.id
                    ? 'bg-[#0B4636] text-white shadow-2xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* CUSTOMERS LIST VIEW (COMPACT & MOBILE RESPONSIVE) */}
        {/* ========================================================================= */}
        {viewMode === 'list' ? (
          <div className="space-y-2 sm:space-y-2.5">
            {filteredCustomers.length === 0 ? (
              <div className="py-10 sm:py-12 text-center bg-white rounded-2xl border border-slate-200 shadow-2xs px-4">
                <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <h3 className="text-xs sm:text-sm font-black text-slate-700">No Customers Found</h3>
                <p className="text-[11px] text-slate-500 mt-1">Try adjusting your search query or active filter.</p>
              </div>
            ) : (
              filteredCustomers.map((cust) => {
                const custOrders = getCustomerOrders(cust);
                const custSlips = getCustomerSlips(cust);
                const totalSpent = cust.totalSpent || custOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
                const totalDue = custOrders.reduce((sum, o) => sum + (o.balanceDue || 0), 0);
                const lastOrder = custOrders[0];
                const highlights = getMeasurementHighlights(cust.measurements);
                const hasMeasurements = Object.keys(cust.measurements || {}).filter(
                  (k) => !!cust.measurements[k]
                ).length > 0;

                return (
                  <div
                    key={cust.id || cust.phone}
                    className="bg-white rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 border border-slate-200 shadow-2xs hover:border-[#0B4636]/50 transition-all space-y-2"
                  >
                    {/* Top Row: Customer Identity & Financial Badges */}
                    <div className="flex items-start justify-between gap-2">
                      {/* Left: Avatar & Identity */}
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div
                          onClick={() => handleOpenCustomer(cust, 'measurements')}
                          className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-50 text-[#0B4636] font-black text-xs sm:text-sm flex items-center justify-center border border-emerald-200 shrink-0 cursor-pointer shadow-2xs active:scale-95"
                        >
                          {cust.name.slice(0, 2).toUpperCase()}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h3
                              onClick={() => handleOpenCustomer(cust, 'measurements')}
                              className="font-black text-xs sm:text-sm text-slate-900 hover:text-[#0B4636] cursor-pointer truncate"
                            >
                              {cust.name}
                            </h3>

                            {cust.isRepeat && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-amber-100 text-amber-900 border border-amber-300 shrink-0">
                                Repeat
                              </span>
                            )}

                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                              {custOrders.length} Ord
                            </span>
                          </div>

                          <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5 mt-0.5 flex-wrap">
                            <a
                              href={`tel:${clean10DigitPhone(cust.phone)}`}
                              className="flex items-center gap-1 hover:text-[#0B4636] transition-colors"
                            >
                              <Phone className="w-2.5 h-2.5 text-slate-400" />
                              <span>{formatDisplayPhone(cust.phone)}</span>
                            </a>
                            <span className="text-slate-300">•</span>
                            <span className="text-slate-400 text-[10px] truncate">
                              Last: {lastOrder?.createdDate || cust.lastOrderDate || 'Recent'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Quick Financial Badges */}
                      <div className="flex flex-col items-end shrink-0 text-right">
                        <div className="text-[9px] font-bold text-slate-400 uppercase">Spend: ₹{totalSpent.toLocaleString()}</div>
                        <span
                          className={`px-1.5 py-0.5 rounded-md text-[10px] font-black mt-0.5 inline-block ${
                            totalDue > 0
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          }`}
                        >
                          {totalDue > 0 ? `₹${totalDue.toLocaleString()} Due` : '✓ Cleared'}
                        </span>
                      </div>
                    </div>

                    {/* Middle Row: MEASUREMENTS & SLIPS INLINE SECTION */}
                    <div className="bg-slate-50 rounded-lg sm:rounded-xl p-2 border border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs">
                      {/* Measurements Chips Preview */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap mb-1">
                          <span className="font-black text-[10px] text-[#0B4636] flex items-center gap-0.5">
                            <ShieldCheck className="w-3 h-3 text-emerald-600" />
                            <span>Measurements:</span>
                          </span>

                          {hasMeasurements ? (
                            <span className="text-[9px] text-emerald-700 font-bold bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200">
                              ✓ {Object.keys(cust.measurements || {}).filter((k) => !!cust.measurements[k]).length} Saved
                            </span>
                          ) : (
                            <span className="text-[9px] text-amber-700 font-bold bg-amber-50 px-1 py-0.2 rounded border border-amber-200">
                              ⚠️ None
                            </span>
                          )}
                        </div>

                        {highlights.length > 0 ? (
                          <div className="flex items-center gap-1 flex-wrap">
                            {highlights.slice(0, 4).map((h) => (
                              <span
                                key={h.label}
                                className="bg-white px-1.5 py-0.5 rounded border border-slate-200 text-[10px] font-bold text-slate-800 shadow-2xs"
                              >
                                <span className="text-slate-400 font-normal mr-0.5">{h.label}:</span>
                                {h.val}
                              </span>
                            ))}
                            {highlights.length > 4 && (
                              <span className="text-[9px] text-slate-400 font-medium">+{highlights.length - 4}</span>
                            )}
                            {cust.notes && (
                              <span className="bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded text-[9px] font-bold border border-amber-200 truncate max-w-[120px]">
                                📝 {cust.notes}
                              </span>
                            )}
                          </div>
                        ) : (
                          <p className="text-[10px] text-slate-400 italic">
                            Tap below to record chest, waist, length, etc.
                          </p>
                        )}
                      </div>

                      {/* Slips Badge & Preview */}
                      {custSlips.length > 0 && (
                        <div
                          onClick={() => handleOpenCustomer(cust, 'slips')}
                          className="flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-300 p-1 rounded-lg cursor-pointer transition-colors shrink-0 self-start sm:self-auto"
                          title="Click to view camera slip photos"
                        >
                          <div className="w-6 h-6 rounded bg-white border border-amber-200 overflow-hidden shrink-0">
                            <img src={custSlips[0].url} alt="Slip" className="w-full h-full object-cover" />
                          </div>
                          <div className="text-[10px] font-black text-amber-950 flex items-center gap-0.5">
                            <Camera className="w-2.5 h-2.5 text-amber-700" />
                            <span>{custSlips.length} Slip{custSlips.length > 1 ? 's' : ''}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Bottom Action Row (Touch-Optimized for Mobile) */}
                    <div className="flex items-center justify-between gap-1.5 pt-1.5 border-t border-slate-100">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => handleOpenCustomer(cust, 'measurements')}
                          className="px-2.5 py-1.5 bg-[#0B4636] hover:bg-[#073024] active:scale-95 text-amber-300 font-bold rounded-lg text-[11px] flex items-center gap-1 shadow-2xs cursor-pointer"
                        >
                          <Scissors className="w-3 h-3" />
                          <span>Fit Book</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenCustomer(cust, 'slips')}
                          className="px-2 py-1.5 bg-white hover:bg-slate-50 active:scale-95 text-slate-700 border border-slate-200 font-bold rounded-lg text-[11px] flex items-center gap-1 shadow-2xs cursor-pointer"
                        >
                          <Camera className="w-3 h-3 text-amber-700" />
                          <span>Slips ({custSlips.length})</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => handleCopyMeasurements(cust, e)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 border border-slate-200 cursor-pointer shadow-2xs"
                          title="Copy Measurements"
                        >
                          {copiedMeasurementsId === cust.id ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <a
                          href={getWhatsAppUrl(
                            cust.phone,
                            `Hello ${cust.name}, greetings from your tailor boutique!`
                          )}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 sm:px-2.5 sm:py-1.5 bg-[#25D366] hover:bg-[#20bd5a] active:scale-95 text-white font-bold rounded-lg text-[11px] flex items-center gap-1 shadow-2xs cursor-pointer"
                          title="WhatsApp"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">WhatsApp</span>
                        </a>

                        <a
                          href={`tel:${clean10DigitPhone(cust.phone)}`}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 border border-slate-200 cursor-pointer shadow-2xs"
                          title="Call"
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </a>

                        {onNewOrderForCustomer && (
                          <button
                            type="button"
                            onClick={() => onNewOrderForCustomer(cust)}
                            className="px-2.5 py-1.5 bg-amber-400 hover:bg-amber-300 active:scale-95 text-[#0B4636] font-black rounded-lg text-[11px] flex items-center gap-1 shadow-2xs cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                            <span>New</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          /* ========================================================================= */
          /* CUSTOMERS GRID VIEW (CARDS VIEW) */
          /* ========================================================================= */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
            {filteredCustomers.length === 0 ? (
              <div className="col-span-full py-10 sm:py-12 text-center bg-white rounded-2xl border border-slate-200 shadow-2xs px-4">
                <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <h3 className="text-xs sm:text-sm font-black text-slate-700">No Customers Found</h3>
                <p className="text-[11px] text-slate-500 mt-1">Try adjusting your search or filter.</p>
              </div>
            ) : (
              filteredCustomers.map((cust) => {
                const custOrders = getCustomerOrders(cust);
                const custSlips = getCustomerSlips(cust);
                const totalSpent = cust.totalSpent || custOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
                const totalDue = custOrders.reduce((sum, o) => sum + (o.balanceDue || 0), 0);
                const lastOrder = custOrders[0];
                const highlights = getMeasurementHighlights(cust.measurements);

                return (
                  <div
                    key={cust.id || cust.phone}
                    className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-3.5 border border-slate-200 shadow-2xs hover:shadow-xs hover:border-[#0B4636]/40 transition-all flex flex-col justify-between space-y-2.5"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <div
                            onClick={() => handleOpenCustomer(cust, 'measurements')}
                            className="w-9 h-9 rounded-xl bg-emerald-50 text-[#0B4636] font-black text-xs flex items-center justify-center border border-emerald-200 shrink-0 cursor-pointer"
                          >
                            {cust.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div
                              onClick={() => handleOpenCustomer(cust, 'measurements')}
                              className="font-black text-xs text-slate-900 hover:text-[#0B4636] transition-colors flex items-center gap-1 cursor-pointer truncate"
                            >
                              <span className="truncate">{cust.name}</span>
                              {cust.isRepeat && (
                                <span className="px-1 py-0.2 rounded text-[8px] font-black bg-amber-100 text-amber-900 border border-amber-300 shrink-0">
                                  Repeat
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                              <Phone className="w-2.5 h-2.5 text-slate-400" />
                              <span>{formatDisplayPhone(cust.phone)}</span>
                            </div>
                          </div>
                        </div>

                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                          {custOrders.length} Ord
                        </span>
                      </div>

                      {/* Customer Stats Strip */}
                      <div className="grid grid-cols-2 gap-1.5 mt-2 pt-2 border-t border-slate-100 text-xs">
                        <div>
                          <span className="text-[9px] font-bold text-slate-400 uppercase block">Total Spend</span>
                          <span className="font-black text-[#0B4636] text-xs">₹{totalSpent.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-[9px] font-bold text-slate-400 uppercase block">Pending Due</span>
                          <span
                            className={`font-black text-xs ${
                              totalDue > 0 ? 'text-rose-600' : 'text-emerald-700'
                            }`}
                          >
                            {totalDue > 0 ? `₹${totalDue.toLocaleString()}` : 'Cleared'}
                          </span>
                        </div>
                      </div>

                      {/* Measurements & Slips Strip in Grid Card */}
                      <div className="mt-2 p-1.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                        <div className="flex items-center justify-between text-[9px] font-black text-slate-600">
                          <span className="flex items-center gap-0.5 text-[#0B4636]">
                            <Scissors className="w-2.5 h-2.5" />
                            <span>Measurements</span>
                          </span>
                          {custSlips.length > 0 && (
                            <span className="text-amber-800 font-bold flex items-center gap-0.5">
                              <Camera className="w-2.5 h-2.5" />
                              {custSlips.length} Slip{custSlips.length > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>

                        {highlights.length > 0 ? (
                          <div className="flex items-center gap-1 flex-wrap text-[9px] text-slate-700 font-bold">
                            {highlights.slice(0, 3).map((h) => (
                              <span key={h.label} className="bg-white px-1 py-0.2 rounded border border-slate-200">
                                {h.label[0]}: {h.val}
                              </span>
                            ))}
                            {highlights.length > 3 && (
                              <span className="text-slate-400 font-medium">+{highlights.length - 3}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[9px] text-slate-400 italic">No measurements</span>
                        )}
                      </div>
                    </div>

                    {/* Footer Bar */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                      <span className="truncate">
                        Last: {lastOrder?.createdDate || cust.lastOrderDate || 'Recently'}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleOpenCustomer(cust, 'measurements')}
                        className="text-[#0B4636] font-bold flex items-center gap-0.5 hover:underline cursor-pointer shrink-0"
                      >
                        <span>View</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* DETAILED CUSTOMER PROFILE & MEASUREMENTS / SLIPS MODAL (MOBILE FIRST) */}
      {/* ========================================================================= */}
      {selectedCustomer && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
            {/* Modal Header Banner */}
            <div className="bg-[#0B4636] text-white p-3.5 sm:p-5 flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-amber-400 text-[#0B4636] font-black text-base sm:text-lg flex items-center justify-center shadow shrink-0">
                  {selectedCustomer.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h2 className="text-sm sm:text-base font-black truncate">{selectedCustomer.name}</h2>
                    {selectedCustomer.isRepeat && (
                      <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-amber-300 text-[#0B4636]">
                        Repeat
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-amber-200 font-semibold flex items-center gap-2 mt-0.5">
                    <span className="flex items-center gap-1">
                      <Phone className="w-2.5 h-2.5" />
                      {formatDisplayPhone(selectedCustomer.phone)}
                    </span>
                    <span>•</span>
                    <span>{selectedCustomerOrders.length} Orders</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <a
                  href={getWhatsAppUrl(
                    selectedCustomer.phone,
                    `Hello ${selectedCustomer.name}, this is from your boutique.`
                  )}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white shadow-xs transition-all cursor-pointer"
                  title="WhatsApp"
                >
                  <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </a>

                <a
                  href={`tel:${clean10DigitPhone(selectedCustomer.phone)}`}
                  className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
                  title="Call"
                >
                  <Phone className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </a>

                <button
                  onClick={() => setSelectedCustomer(null)}
                  className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
                  aria-label="Close"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
            </div>

            {/* Financial Ledger Quick Strip */}
            <div className="bg-amber-50 px-3.5 sm:px-5 py-2 sm:py-2.5 border-b border-amber-200 flex items-center justify-between gap-2 text-xs shrink-0">
              <div className="grid grid-cols-3 gap-3 sm:gap-6 flex-1">
                <div>
                  <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase block">Booked</span>
                  <span className="font-black text-slate-900 text-xs sm:text-sm">₹{customerFinancials.totalBooked.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-[9px] sm:text-[10px] font-bold text-emerald-800 uppercase block">Advance</span>
                  <span className="font-black text-emerald-800 text-xs sm:text-sm">₹{customerFinancials.advancePaid.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-[9px] sm:text-[10px] font-bold text-rose-700 uppercase block">Balance Due</span>
                  <span className="font-black text-rose-700 text-xs sm:text-sm">₹{customerFinancials.balanceDue.toLocaleString()}</span>
                </div>
              </div>

              {onNewOrderForCustomer && (
                <button
                  onClick={() => {
                    const cust = selectedCustomer;
                    setSelectedCustomer(null);
                    onNewOrderForCustomer(cust);
                  }}
                  className="px-2.5 py-1.5 bg-[#0B4636] hover:bg-[#073024] text-amber-300 font-bold rounded-lg text-xs shadow-xs flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <Plus className="w-3 h-3" />
                  <span className="hidden sm:inline">New Order</span>
                </button>
              )}
            </div>

            {/* Sub-tab Navigation */}
            <div className="px-3.5 sm:px-5 pt-2 border-b border-slate-200 flex items-center gap-2 sm:gap-4 text-xs font-bold shrink-0 overflow-x-auto scrollbar-none">
              <button
                onClick={() => setCustomerModalTab('measurements')}
                className={`pb-2 border-b-2 transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                  customerModalTab === 'measurements'
                    ? 'border-[#0B4636] text-[#0B4636]'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Measurements Book</span>
              </button>

              <button
                onClick={() => setCustomerModalTab('slips')}
                className={`pb-2 border-b-2 transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                  customerModalTab === 'slips'
                    ? 'border-[#0B4636] text-[#0B4636]'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Camera className="w-3.5 h-3.5 text-amber-700" />
                <span>Slips ({selectedCustomerSlips.length})</span>
              </button>

              <button
                onClick={() => setCustomerModalTab('orders')}
                className={`pb-2 border-b-2 transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                  customerModalTab === 'orders'
                    ? 'border-[#0B4636] text-[#0B4636]'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Scissors className="w-3.5 h-3.5" />
                <span>Orders ({selectedCustomerOrders.length})</span>
              </button>
            </div>

            {/* Modal Body Content */}
            <div className="p-3.5 sm:p-5 overflow-y-auto flex-1 space-y-3 sm:space-y-4">
              {/* TAB 1: SAVED BODY MEASUREMENTS */}
              {customerModalTab === 'measurements' && (
                <div className="space-y-3 sm:space-y-4">
                  <div className="flex items-center justify-between bg-emerald-900/5 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border border-emerald-800/10 flex-wrap gap-2">
                    <div>
                      <h4 className="text-xs font-black text-[#0B4636] uppercase tracking-wider">
                        Tailoring Measurement Record
                      </h4>
                      <p className="text-[10px] sm:text-[11px] text-slate-600">
                        Default saved body measurements for rapid repeat order entries.
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => handleCopyMeasurements(selectedCustomer, e)}
                        className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-800 font-bold rounded-lg text-[11px] flex items-center gap-1 border border-slate-200 shadow-2xs cursor-pointer"
                        title="Copy to Clipboard"
                      >
                        {copiedMeasurementsId === selectedCustomer.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3 text-slate-500" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>

                      {!isEditingMeasurements ? (
                        <button
                          onClick={() => setIsEditingMeasurements(true)}
                          className="px-2.5 py-1 bg-[#0B4636] hover:bg-[#073024] text-amber-300 font-bold rounded-lg text-[11px] flex items-center gap-1 shadow-2xs cursor-pointer"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                      ) : (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setIsEditingMeasurements(false)}
                            className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg text-[11px] cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleSaveMeasurements}
                            className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg text-[11px] flex items-center gap-1 shadow-2xs cursor-pointer"
                          >
                            <Save className="w-3 h-3" />
                            <span>Save</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Upper Body Grid */}
                  <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-slate-200 shadow-2xs space-y-1.5">
                    <span className="text-[11px] sm:text-xs font-black text-slate-800 uppercase tracking-wider block">
                      1. Upper Body Measurements (Inches)
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
                        <div key={m.key} className="bg-slate-50 p-2 rounded-lg sm:rounded-xl border border-slate-200">
                          <label className="text-[9px] sm:text-[10px] font-bold text-slate-500 block truncate">{m.label}</label>
                          {isEditingMeasurements ? (
                            <input
                              type="text"
                              value={editedMeasurements[m.key] || ''}
                              onChange={(e) =>
                                setEditedMeasurements((prev) => ({ ...prev, [m.key]: e.target.value }))
                              }
                              placeholder="e.g. 38"
                              className="w-full mt-0.5 px-1.5 py-0.5 bg-white border border-slate-300 rounded text-xs font-black text-slate-900"
                            />
                          ) : (
                            <span className="text-xs sm:text-sm font-black text-slate-900 block mt-0.5">
                              {editedMeasurements[m.key] ? `${editedMeasurements[m.key]}"` : '—'}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Lower Body Grid */}
                  <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-slate-200 shadow-2xs space-y-1.5">
                    <span className="text-[11px] sm:text-xs font-black text-slate-800 uppercase tracking-wider block">
                      2. Lower Body & Trouser (Inches)
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { key: 'pantLength', label: 'Pant / Length' },
                        { key: 'inseam', label: 'Inseam' },
                        { key: 'thigh', label: 'Thigh' },
                        { key: 'knee', label: 'Knee' },
                        { key: 'bottomHem', label: 'Bottom Mori' },
                      ].map((m) => (
                        <div key={m.key} className="bg-slate-50 p-2 rounded-lg sm:rounded-xl border border-slate-200">
                          <label className="text-[9px] sm:text-[10px] font-bold text-slate-500 block truncate">{m.label}</label>
                          {isEditingMeasurements ? (
                            <input
                              type="text"
                              value={editedMeasurements[m.key] || ''}
                              onChange={(e) =>
                                setEditedMeasurements((prev) => ({ ...prev, [m.key]: e.target.value }))
                              }
                              placeholder="e.g. 40"
                              className="w-full mt-0.5 px-1.5 py-0.5 bg-white border border-slate-300 rounded text-xs font-black text-slate-900"
                            />
                          ) : (
                            <span className="text-xs sm:text-sm font-black text-slate-900 block mt-0.5">
                              {editedMeasurements[m.key] ? `${editedMeasurements[m.key]}"` : '—'}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Sleeves & Neck Grid */}
                  <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-slate-200 shadow-2xs space-y-1.5">
                    <span className="text-[11px] sm:text-xs font-black text-slate-800 uppercase tracking-wider block">
                      3. Sleeves & Neck (Inches)
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { key: 'sleeveLength', label: 'Sleeve Length' },
                        { key: 'bicep', label: 'Bicep' },
                        { key: 'wrist', label: 'Wrist / Cuff' },
                        { key: 'neck', label: 'Neck / Collar' },
                        { key: 'frontNeckDepth', label: 'Front Neck' },
                        { key: 'backNeckDepth', label: 'Back Neck' },
                      ].map((m) => (
                        <div key={m.key} className="bg-slate-50 p-2 rounded-lg sm:rounded-xl border border-slate-200">
                          <label className="text-[9px] sm:text-[10px] font-bold text-slate-500 block truncate">{m.label}</label>
                          {isEditingMeasurements ? (
                            <input
                              type="text"
                              value={editedMeasurements[m.key] || ''}
                              onChange={(e) =>
                                setEditedMeasurements((prev) => ({ ...prev, [m.key]: e.target.value }))
                              }
                              placeholder="e.g. 24"
                              className="w-full mt-0.5 px-1.5 py-0.5 bg-white border border-slate-300 rounded text-xs font-black text-slate-900"
                            />
                          ) : (
                            <span className="text-xs sm:text-sm font-black text-slate-900 block mt-0.5">
                              {editedMeasurements[m.key] ? `${editedMeasurements[m.key]}"` : '—'}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Fit Preferences & Notes */}
                  <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-slate-200 shadow-2xs space-y-1.5">
                    <label className="text-[11px] sm:text-xs font-black text-slate-800 uppercase tracking-wider block">
                      Fit Preferences & Notes
                    </label>
                    {isEditingMeasurements ? (
                      <textarea
                        rows={2}
                        value={editNotes}
                        onChange={(e) => setEditNotes(e.target.value)}
                        placeholder="e.g. Loose fit at waist, deep round neck..."
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-900"
                      />
                    ) : (
                      <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200 italic">
                        {editNotes || selectedCustomer.notes || 'No special fit notes recorded.'}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: PHYSICAL SLIPS & DIGITAL BILLS */}
              {customerModalTab === 'slips' && (
                <div className="space-y-3 sm:space-y-4">
                  <div>
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5 text-amber-700" />
                      <span>Camera-Captured Slips ({selectedCustomerSlips.length})</span>
                    </h4>

                    {selectedCustomerSlips.length === 0 ? (
                      <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200 px-4">
                        <Camera className="w-7 h-7 text-slate-300 mx-auto mb-1.5" />
                        <p className="text-xs font-bold text-slate-600">No Camera Slips Uploaded</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          When orders are created with "Camera Slip", physical slip photos appear here.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {selectedCustomerSlips.map((slip, idx) => (
                          <div
                            key={idx}
                            className="bg-white rounded-xl p-2.5 border border-slate-200 shadow-2xs space-y-2 group"
                          >
                            <div
                              onClick={() => setZoomSlipUrl(slip.url)}
                              className="w-full h-36 sm:h-44 rounded-lg bg-slate-900/5 overflow-hidden border border-slate-200 flex items-center justify-center relative cursor-pointer"
                            >
                              <img src={slip.url} alt={slip.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                              <div className="absolute inset-0 bg-slate-950/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <span className="px-2.5 py-1 rounded-lg bg-white/90 text-slate-900 font-bold text-xs flex items-center gap-1 shadow">
                                  <ZoomIn className="w-3.5 h-3.5" />
                                  <span>Tap to Zoom</span>
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between text-[11px] pt-0.5">
                              <span className="font-bold text-slate-800 truncate">{slip.title}</span>
                              <span className="text-[10px] text-slate-400 shrink-0">{slip.date}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: PLACED ORDERS & RECEIPTS */}
              {customerModalTab === 'orders' && (
                <div className="space-y-2.5">
                  {selectedCustomerOrders.length === 0 ? (
                    <div className="text-center py-8 bg-slate-50 rounded-2xl border border-slate-200 px-4">
                      <Scissors className="w-8 h-8 text-slate-300 mx-auto mb-1.5" />
                      <p className="text-xs font-bold text-slate-600">No Orders Placed Yet</p>
                    </div>
                  ) : (
                    selectedCustomerOrders.map((ord) => (
                      <div
                        key={ord.id}
                        className="bg-white rounded-xl sm:rounded-2xl p-3 border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                      >
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-black text-xs sm:text-sm text-slate-900">{ord.garmentType}</span>
                            <span className="text-[10px] font-mono font-bold text-slate-500">#{ord.id}</span>
                            <span
                              className={`px-1.5 py-0.2 rounded text-[9px] font-black ${
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
                              {ord.status}
                            </span>
                          </div>

                          <div className="text-[10px] sm:text-[11px] text-slate-500 flex flex-wrap items-center gap-2">
                            <span>Booked: {ord.createdDate}</span>
                            <span>•</span>
                            <span>Due: {ord.dueDate}</span>
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

                        <div className="flex items-center justify-between sm:justify-end gap-2 pt-1.5 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                          <div className="text-right">
                            <div className="text-[10px] font-bold text-slate-500">₹{ord.totalAmount}</div>
                            <div
                              className={`text-[10px] font-black ${
                                ord.balanceDue > 0 ? 'text-rose-600' : 'text-emerald-700'
                              }`}
                            >
                              {ord.balanceDue > 0 ? `Due: ₹${ord.balanceDue}` : 'Paid'}
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setViewingReceiptOrder(ord)}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-[11px] flex items-center gap-0.5 cursor-pointer"
                              title="Receipt"
                            >
                              <Printer className="w-3 h-3" />
                              <span>Bill</span>
                            </button>

                            {onSelectOrder && (
                              <button
                                onClick={() => {
                                  setSelectedCustomer(null);
                                  onSelectOrder(ord);
                                }}
                                className="px-2.5 py-1 bg-[#0B4636] hover:bg-[#073024] text-white font-bold rounded-lg text-[11px] flex items-center gap-0.5 cursor-pointer"
                              >
                                <span>View</span>
                                <ChevronRight className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= ZOOM PHYSICAL SLIP MODAL ================= */}
      {zoomSlipUrl && (
        <div
          className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 z-60"
          onClick={() => setZoomSlipUrl(null)}
        >
          <div
            className="bg-white rounded-2xl sm:rounded-3xl max-w-2xl w-full p-3 sm:p-4 space-y-2.5 shadow-2xl relative animate-in fade-in zoom-in duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-amber-700" />
                <h3 className="font-black text-xs sm:text-sm text-slate-900">Physical Order Slip / Fabric</h3>
              </div>
              <button
                onClick={() => setZoomSlipUrl(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-[65vh] overflow-auto rounded-xl border border-slate-200 bg-slate-950 flex items-center justify-center">
              <img src={zoomSlipUrl} alt="Zoomed physical slip" className="max-w-full max-h-[62vh] object-contain" />
            </div>

            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Pinch or scroll to zoom.</span>
              <button
                onClick={() => setZoomSlipUrl(null)}
                className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-lg cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= DIGITAL RECEIPT MODAL ================= */}
      {viewingReceiptOrder && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl sm:rounded-3xl w-full max-w-md p-4 sm:p-6 shadow-2xl border border-slate-200 space-y-3.5 my-auto animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Printer className="w-4 h-4 text-[#0B4636]" />
                <h3 className="font-extrabold text-sm sm:text-base text-slate-900">Order Receipt Slip</h3>
              </div>
              <button
                onClick={() => setViewingReceiptOrder(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5 font-mono text-xs">
              <div className="text-center pb-2 border-b border-dashed border-slate-300">
                <h4 className="font-black text-xs sm:text-sm text-[#0B4636] font-sans">BOUTIQUE STITCHING SLIP</h4>
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
                  <span>Advance:</span>
                  <span className="font-bold">₹{viewingReceiptOrder.advancePaid}</span>
                </div>
                <div className="flex justify-between font-black text-rose-700 text-xs sm:text-sm pt-1 border-t border-slate-200">
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
                className="flex-1 py-2 bg-[#0B4636] hover:bg-[#073024] text-white font-bold rounded-xl text-xs shadow flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print</span>
              </button>

              <button
                onClick={() => setViewingReceiptOrder(null)}
                className="py-2 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
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
