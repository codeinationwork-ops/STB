import React, { useState, useMemo, useEffect } from 'react';
import {
  Users,
  Search,
  Phone,
  MessageSquare,
  Scissors,
  ArrowLeft,
  Plus,
  Edit3,
  ChevronRight,
  TrendingUp,
  UserCheck,
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
  AlertCircle,
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
    const totalPendingDues = allOrders.reduce((sum, o) => sum + (o.balanceDue || 0), 0);

    return { totalCustomers, repeatPercent, totalLifetimeRev, totalPendingDues };
  }, [allCustomers, allOrders]);

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
    <div className="min-h-full bg-[#F4F6F8] text-slate-900 font-sans p-3 sm:p-5 lg:p-6 max-w-7xl mx-auto pb-24">
      {/* ========================================================================= */}
      {/* COMPACT & RESPONSIVE UNIFIED TOP BAR */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-200/80 shadow-xs mb-3 sm:mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Left: Title & Quick Stats */}
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer shrink-0"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-1.5 truncate">
                <Users className="w-4 h-4 text-[#0B4636] shrink-0" />
                <span>Customers & Fit Books</span>
              </h1>
              <span className="bg-emerald-100 text-[#0B4636] text-[10px] font-black px-2 py-0.5 rounded-full border border-emerald-200 shrink-0">
                {allCustomers.length} Total
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
              Saved client measurements, physical slip photos & ledgers
            </p>
          </div>
        </div>

        {/* Right: View Mode Toggle & Actions */}
        <div className="flex items-center justify-between sm:justify-end gap-2 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100 shrink-0">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-[#0B4636] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span className="text-[11px]">List</span>
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-[#0B4636] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span className="text-[11px]">Grid</span>
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
              className="bg-[#0B4636] hover:bg-[#073024] text-white px-3 py-1.5 rounded-xl font-black text-xs shadow-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>+ New Order</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SLEEK 4-METRICS STATS CAROUSEL STRIP */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-3 sm:mb-4">
        <div className="bg-white p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Clients</span>
            <Users className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-base sm:text-lg font-black text-slate-900 mt-0.5">{stats.totalCustomers}</div>
          <div className="text-[10px] text-slate-500 font-medium mt-0.5">Active Directory</div>
        </div>

        <div className="bg-white p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-emerald-600">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">Repeat Rate</span>
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-base sm:text-lg font-black text-emerald-800 mt-0.5">{stats.repeatPercent}%</div>
          <div className="text-[10px] text-emerald-700 font-medium mt-0.5">Loyal Customers</div>
        </div>

        <div className="bg-white p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-blue-600">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-800">Total Booked</span>
            <Wallet className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <div className="text-base sm:text-lg font-black text-blue-900 mt-0.5">
            ₹{stats.totalLifetimeRev.toLocaleString()}
          </div>
          <div className="text-[10px] text-blue-700 font-medium mt-0.5">Lifetime Revenue</div>
        </div>

        <div className="bg-white p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-rose-600">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800">Pending Dues</span>
            <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
          </div>
          <div className="text-base sm:text-lg font-black text-rose-700 mt-0.5">
            ₹{stats.totalPendingDues.toLocaleString()}
          </div>
          <div className="text-[10px] text-rose-700 font-medium mt-0.5">To Collect</div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SEARCH & FILTER CONTROLS */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-xl sm:rounded-2xl p-2.5 sm:p-3 border border-slate-200/80 shadow-2xs mb-3 sm:mb-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by customer name or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B4636] font-medium"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 md:pb-0 scrollbar-none">
          {(
            [
              { id: 'all', label: `All (${allCustomers.length})` },
              {
                id: 'repeat',
                label: `Repeat (${allCustomers.filter((c) => c.isRepeat || c.ordersCount > 1).length})`,
              },
              {
                id: 'pending_balance',
                label: `Pending Dues (${
                  allCustomers.filter((c) => getCustomerOrders(c).some((o) => (o.balanceDue || 0) > 0)).length
                })`,
              },
              {
                id: 'high_spenders',
                label: `VIP (₹3k+) (${allCustomers.filter((c) => (c.totalSpent || 0) >= 3000).length})`,
              },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
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
      {/* CUSTOMERS LIST VIEW */}
      {/* ========================================================================= */}
      {viewMode === 'list' ? (
        <div className="space-y-2.5">
          {filteredCustomers.length === 0 ? (
            <div className="py-12 text-center bg-white rounded-2xl border border-slate-200 shadow-2xs px-4">
              <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <h3 className="text-sm font-black text-slate-700">No Customers Found</h3>
              <p className="text-xs text-slate-500 mt-1">Try adjusting your search query or active filter.</p>
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
                  className="bg-white rounded-2xl p-3 sm:p-3.5 border border-slate-200/90 shadow-2xs hover:border-[#0B4636]/40 transition-all space-y-2"
                >
                  {/* Top Row: Customer Avatar, Identity & Balance Pill */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div
                        onClick={() => handleOpenCustomer(cust, 'measurements')}
                        className="w-10 h-10 rounded-xl bg-emerald-50 text-[#0B4636] font-black text-xs sm:text-sm flex items-center justify-center border border-emerald-200 shrink-0 cursor-pointer shadow-2xs active:scale-95 transition-transform"
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
                            {custOrders.length} {custOrders.length === 1 ? 'Order' : 'Orders'}
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
                            Last: {lastOrder?.createdDate || cust.lastOrderDate || 'Recently'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: High-Contrast Financial Ledger Badges */}
                    <div className="flex flex-col items-end shrink-0 text-right">
                      <div className="text-[10px] font-bold text-slate-400 uppercase">
                        Spend: ₹{totalSpent.toLocaleString()}
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black mt-0.5 inline-block ${
                          totalDue > 0
                            ? 'bg-rose-100 text-rose-800 border border-rose-200'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        }`}
                      >
                        {totalDue > 0 ? `₹${totalDue.toLocaleString()} Due` : '✓ Cleared'}
                      </span>
                    </div>
                  </div>

                  {/* Middle Row: MEASUREMENTS & CAMERA SLIPS STRIP */}
                  <div className="bg-slate-50 rounded-xl p-2 border border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap mb-1">
                        <span className="font-black text-[10px] text-[#0B4636] flex items-center gap-0.5">
                          <Scissors className="w-3 h-3 text-emerald-700" />
                          <span>Fit Book:</span>
                        </span>

                        {hasMeasurements ? (
                          <span className="text-[9px] text-emerald-800 font-bold bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                            ✓ {Object.keys(cust.measurements || {}).filter((k) => !!cust.measurements[k]).length} Saved
                          </span>
                        ) : (
                          <span className="text-[9px] text-amber-800 font-bold bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                            ⚠️ Not recorded yet
                          </span>
                        )}
                      </div>

                      {highlights.length > 0 ? (
                        <div className="flex items-center gap-1 flex-wrap">
                          {highlights.slice(0, 5).map((h) => (
                            <span
                              key={h.label}
                              className="bg-white px-1.5 py-0.5 rounded-md border border-slate-200 text-[10px] font-bold text-slate-800 shadow-2xs"
                            >
                              <span className="text-slate-400 font-normal mr-0.5">{h.label}:</span>
                              {h.val}
                            </span>
                          ))}
                          {highlights.length > 5 && (
                            <span className="text-[9px] text-slate-400 font-medium">
                              +{highlights.length - 5}
                            </span>
                          )}
                          {cust.notes && (
                            <span className="bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded text-[9px] font-bold border border-amber-200 truncate max-w-[140px]">
                              📝 {cust.notes}
                            </span>
                          )}
                        </div>
                      ) : (
                        <p className="text-[10px] text-slate-400 italic">
                          Tap 'Fit Book' below to record custom measurements.
                        </p>
                      )}
                    </div>

                    {/* Camera Slips Preview */}
                    {custSlips.length > 0 && (
                      <div
                        onClick={() => handleOpenCustomer(cust, 'slips')}
                        className="flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-300 p-1 px-2 rounded-lg cursor-pointer transition-colors shrink-0 self-start sm:self-auto"
                        title="Click to view camera slip photos"
                      >
                        <div className="w-6 h-6 rounded bg-white border border-amber-200 overflow-hidden shrink-0">
                          <img src={custSlips[0].url} alt="Slip" className="w-full h-full object-cover" />
                        </div>
                        <div className="text-[10px] font-black text-amber-950 flex items-center gap-1">
                          <Camera className="w-3 h-3 text-amber-700" />
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
                        className="px-2.5 py-1 bg-[#0B4636] hover:bg-[#073024] active:scale-95 text-amber-300 font-bold rounded-lg text-[11px] flex items-center gap-1 shadow-2xs cursor-pointer"
                      >
                        <Scissors className="w-3 h-3" />
                        <span>Fit Book</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenCustomer(cust, 'slips')}
                        className="px-2 py-1 bg-white hover:bg-slate-50 active:scale-95 text-slate-700 border border-slate-200 font-bold rounded-lg text-[11px] flex items-center gap-1 shadow-2xs cursor-pointer"
                      >
                        <Camera className="w-3 h-3 text-amber-700" />
                        <span>Slips ({custSlips.length})</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => handleCopyMeasurements(cust, e)}
                        className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 border border-slate-200 cursor-pointer shadow-2xs"
                        title="Copy Measurements"
                      >
                        {copiedMeasurementsId === cust.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
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
                        className="p-1.5 sm:px-2.5 sm:py-1 bg-[#25D366] hover:bg-[#20bd5a] active:scale-95 text-white font-bold rounded-lg text-[11px] flex items-center gap-1 shadow-2xs cursor-pointer"
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
                          className="px-2.5 py-1 bg-amber-400 hover:bg-amber-300 active:scale-95 text-[#0B4636] font-black rounded-lg text-[11px] flex items-center gap-1 shadow-2xs cursor-pointer"
                        >
                          <Plus className="w-3 h-3 stroke-[3]" />
                          <span>Order</span>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredCustomers.length === 0 ? (
            <div className="col-span-full py-12 text-center bg-white rounded-2xl border border-slate-200 shadow-2xs px-4">
              <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <h3 className="text-sm font-black text-slate-700">No Customers Found</h3>
              <p className="text-xs text-slate-500 mt-1">Try adjusting your search or filter.</p>
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
                  className="bg-white rounded-2xl p-3.5 border border-slate-200/90 shadow-2xs hover:shadow-xs hover:border-[#0B4636]/40 transition-all flex flex-col justify-between space-y-2.5"
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
                            className="font-black text-xs sm:text-sm text-slate-900 hover:text-[#0B4636] transition-colors flex items-center gap-1 cursor-pointer truncate"
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
                    <div className="mt-2 p-1.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
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

      {/* ========================================================================= */}
      {/* DETAILED CUSTOMER PROFILE & MEASUREMENTS / SLIPS MODAL */}
      {/* ========================================================================= */}
      {selectedCustomer && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
            {/* Modal Header Banner */}
            <div className="bg-[#0B4636] text-white p-3.5 sm:p-4 flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-amber-400 text-[#0B4636] font-black text-sm flex items-center justify-center shadow shrink-0">
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
                  className="p-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white shadow-xs transition-all cursor-pointer"
                  title="WhatsApp"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                </a>

                <a
                  href={`tel:${clean10DigitPhone(selectedCustomer.phone)}`}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
                  title="Call"
                >
                  <Phone className="w-3.5 h-3.5" />
                </a>

                <button
                  onClick={() => setSelectedCustomer(null)}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Financial Ledger Quick Strip */}
            <div className="bg-amber-50 px-3.5 sm:px-4 py-2 border-b border-amber-200 flex items-center justify-between gap-2 text-xs shrink-0">
              <div className="grid grid-cols-3 gap-3 flex-1">
                <div>
                  <span className="text-[9px] font-bold text-slate-500 uppercase block">Booked</span>
                  <span className="font-black text-slate-900 text-xs">
                    ₹{customerFinancials.totalBooked.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-emerald-800 uppercase block">Advance</span>
                  <span className="font-black text-emerald-800 text-xs">
                    ₹{customerFinancials.advancePaid.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-rose-700 uppercase block">Balance Due</span>
                  <span className="font-black text-rose-700 text-xs">
                    ₹{customerFinancials.balanceDue.toLocaleString()}
                  </span>
                </div>
              </div>

              {onNewOrderForCustomer && (
                <button
                  onClick={() => {
                    const cust = selectedCustomer;
                    setSelectedCustomer(null);
                    onNewOrderForCustomer(cust);
                  }}
                  className="px-2.5 py-1 bg-[#0B4636] hover:bg-[#073024] text-amber-300 font-bold rounded-lg text-[11px] shadow-xs flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <Plus className="w-3 h-3 stroke-[3]" />
                  <span>New Order</span>
                </button>
              )}
            </div>

            {/* Sub-tab Navigation */}
            <div className="px-3.5 sm:px-4 pt-2 border-b border-slate-200 flex items-center gap-3 text-xs font-bold shrink-0 overflow-x-auto scrollbar-none">
              <button
                onClick={() => setCustomerModalTab('measurements')}
                className={`pb-2 border-b-2 transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                  customerModalTab === 'measurements'
                    ? 'border-[#0B4636] text-[#0B4636]'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Measurements</span>
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
                <span>Physical Slips ({selectedCustomerSlips.length})</span>
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
            <div className="p-3.5 sm:p-4 overflow-y-auto flex-1 space-y-3">
              {/* TAB 1: SAVED BODY MEASUREMENTS */}
              {customerModalTab === 'measurements' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between bg-emerald-900/5 p-2.5 rounded-xl border border-emerald-800/10 flex-wrap gap-2">
                    <div>
                      <h4 className="text-xs font-black text-[#0B4636] uppercase tracking-wider">
                        Customer Measurement Record
                      </h4>
                      <p className="text-[10px] text-slate-600">
                        Default saved body measurements for repeat orders.
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => handleCopyMeasurements(selectedCustomer, e)}
                        className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-800 font-bold rounded-lg text-[11px] flex items-center gap-1 border border-slate-200 shadow-2xs cursor-pointer"
                        title="Copy to Clipboard"
                      >
                        {copiedMeasurementsId === selectedCustomer.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span className="text-emerald-700">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>

                      {!isEditingMeasurements ? (
                        <button
                          type="button"
                          onClick={() => setIsEditingMeasurements(true)}
                          className="px-2.5 py-1 bg-[#0B4636] hover:bg-[#073024] text-amber-300 font-bold rounded-lg text-[11px] flex items-center gap-1 shadow-2xs cursor-pointer"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleSaveMeasurements}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[11px] flex items-center gap-1 shadow-2xs cursor-pointer"
                        >
                          <Save className="w-3 h-3" />
                          <span>Save</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Measurements Input / Display Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[
                      { key: 'chest', label: 'Chest / Bust (Inches)' },
                      { key: 'waist', label: 'Waist' },
                      { key: 'frontLength', label: 'Front Length' },
                      { key: 'backLength', label: 'Back Length' },
                      { key: 'shoulder', label: 'Shoulder' },
                      { key: 'sleeveLength', label: 'Sleeve Length' },
                      { key: 'armHole', label: 'Arm Hole' },
                      { key: 'neck', label: 'Neck Depth' },
                      { key: 'hip', label: 'Hip' },
                      { key: 'pantLength', label: 'Pant Length' },
                      { key: 'thigh', label: 'Thigh' },
                      { key: 'bottomHem', label: 'Bottom / Mori' },
                    ].map(({ key, label }) => {
                      const val = isEditingMeasurements
                        ? editedMeasurements[key] || ''
                        : selectedCustomer.measurements?.[key] || '';

                      return (
                        <div key={key} className="bg-slate-50 p-2 rounded-xl border border-slate-200">
                          <label className="text-[10px] font-bold text-slate-500 block truncate">{label}</label>
                          {isEditingMeasurements ? (
                            <input
                              type="number"
                              step="0.25"
                              value={val}
                              onChange={(e) =>
                                setEditedMeasurements((prev) => ({
                                  ...prev,
                                  [key]: e.target.value ? Number(e.target.value) : undefined,
                                }))
                              }
                              placeholder="0.0"
                              className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-black text-slate-900 mt-1 focus:ring-2 focus:ring-[#0B4636] focus:outline-none"
                            />
                          ) : (
                            <div className="text-xs font-black text-slate-900 mt-0.5">
                              {val ? `${val}"` : <span className="text-slate-300 font-normal">--</span>}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Notes / Fitting Preferences */}
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <label className="text-[10px] font-bold text-slate-500 block">Fitting Notes & Preferences</label>
                    {isEditingMeasurements ? (
                      <textarea
                        value={editNotes}
                        onChange={(e) => setEditNotes(e.target.value)}
                        placeholder="e.g., Deep back neck, loose armhole, preferred style..."
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-medium text-slate-800 mt-1 focus:ring-2 focus:ring-[#0B4636] focus:outline-none"
                        rows={2}
                      />
                    ) : (
                      <p className="text-xs text-slate-700 mt-0.5 italic">
                        {selectedCustomer.notes || 'No special fitting notes specified.'}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: PHYSICAL SLIP PHOTOS */}
              {customerModalTab === 'slips' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-black text-slate-900">Physical Order Slips & Receipts</h4>
                      <p className="text-[10px] text-slate-500">
                        Camera photos of handwritten measurement slips.
                      </p>
                    </div>
                  </div>

                  {selectedCustomerSlips.length === 0 ? (
                    <div className="py-8 text-center bg-slate-50 rounded-xl border border-slate-200 px-4">
                      <Camera className="w-8 h-8 text-slate-300 mx-auto mb-1.5" />
                      <p className="text-xs font-bold text-slate-600">No physical slips photographed</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Slips captured during order creation will appear here.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {selectedCustomerSlips.map((slip, idx) => (
                        <div
                          key={idx}
                          onClick={() => setZoomSlipUrl(slip.url)}
                          className="group relative bg-slate-900 rounded-xl overflow-hidden aspect-3/4 border border-slate-200 cursor-pointer shadow-xs"
                        >
                          <img
                            src={slip.url}
                            alt={slip.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-2 text-white">
                            <span className="text-[10px] font-bold truncate">{slip.title}</span>
                            <span className="text-[8px] text-slate-300">{slip.date}</span>
                          </div>
                          <div className="absolute top-1.5 right-1.5 p-1 bg-black/60 rounded-md text-white opacity-0 group-hover:opacity-100 transition-opacity">
                            <ZoomIn className="w-3 h-3" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: ORDER HISTORY */}
              {customerModalTab === 'orders' && (
                <div className="space-y-2">
                  <h4 className="text-xs font-black text-slate-900">
                    Order History ({selectedCustomerOrders.length})
                  </h4>

                  {selectedCustomerOrders.length === 0 ? (
                    <div className="py-8 text-center bg-slate-50 rounded-xl border border-slate-200">
                      <Scissors className="w-8 h-8 text-slate-300 mx-auto mb-1" />
                      <p className="text-xs font-bold text-slate-600">No orders placed yet</p>
                    </div>
                  ) : (
                    selectedCustomerOrders.map((ord) => (
                      <div
                        key={ord.id}
                        onClick={() => {
                          if (onSelectOrder) {
                            setSelectedCustomer(null);
                            onSelectOrder(ord);
                          }
                        }}
                        className="bg-slate-50 hover:bg-slate-100 p-2.5 rounded-xl border border-slate-200 flex items-center justify-between gap-2 cursor-pointer transition-colors"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[10px] font-bold text-slate-500">#{ord.id}</span>
                            <span className="font-bold text-xs text-slate-900 truncate">{ord.garmentType}</span>
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                                ord.status === 'Delivered'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : ord.status === 'Completed'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {ord.status}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                            Due: {ord.dueDate} • Assigned: {ord.assignedTailor || 'Self'}
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-xs font-black text-slate-900">₹{ord.totalAmount}</div>
                          <div
                            className={`text-[9px] font-bold ${
                              ord.balanceDue > 0 ? 'text-rose-600' : 'text-emerald-600'
                            }`}
                          >
                            {ord.balanceDue > 0 ? `₹${ord.balanceDue} Due` : 'Paid'}
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

      {/* ========================================================================= */}
      {/* ZOOM SLIP LIGHTBOX MODAL */}
      {/* ========================================================================= */}
      {zoomSlipUrl && (
        <div
          onClick={() => setZoomSlipUrl(null)}
          className="fixed inset-0 bg-black/90 z-60 flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="relative max-w-xl max-h-[85vh] bg-black rounded-2xl overflow-hidden border border-white/20">
            <img src={zoomSlipUrl} alt="Slip Full" className="w-full h-full object-contain" />
            <button
              onClick={() => setZoomSlipUrl(null)}
              className="absolute top-3 right-3 p-1.5 bg-black/70 hover:bg-black text-white rounded-full transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
