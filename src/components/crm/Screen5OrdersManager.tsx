import React, { useState, useMemo } from 'react';
import {
  Package,
  AlertTriangle,
  ArrowLeft,
  Calendar,
  Phone,
  MessageSquare,
  Search,
  Archive,
  RefreshCw,
  MoreVertical,
  ChevronRight,
  Clock,
  Filter,
  Check,
  CheckCircle2,
  Scissors,
  DollarSign,
  Send,
  UserCheck,
  Eye,
  Plus,
  SlidersHorizontal,
  ChevronDown,
  Copy,
  Camera,
  ShoppingBag,
  X,
} from 'lucide-react';
import {
  TailorOrder,
  OrderStatus,
  ShopProfile,
  PaymentMode,
  StaffTailor,
} from '../../types';
import { OrderStatusTracker } from './OrderStatusTracker';
import { OrderCompletedModal } from './OrderCompletedModal';
import { OrderDeliveryModal } from './OrderDeliveryModal';
import {
  PromisedDateTimeInput,
  formatDisplayDate,
  formatDisplayTime,
  formatFullReadableDate,
} from './PromisedDateTimeInput';
import { getWhatsAppUrl, clean10DigitPhone, formatDisplayPhone } from '../../lib/phoneUtils';
import { roomDb } from '../../lib/localRoomDb';

interface Screen5OrdersManagerProps {
  orders: TailorOrder[];
  shopProfile?: ShopProfile;
  tailors?: StaffTailor[];
  onBack: () => void;
  onSelectOrder: (order: TailorOrder) => void;
  onArchiveOrder: (orderId: string) => void;
  onUnarchiveOrder?: (orderId: string) => void;
  onExtendDueDate: (orderId: string, newDate: string) => void;
  onUpdateStatus?: (orderId: string, status: OrderStatus) => void;
  onDeliverOrder?: (
    orderId: string,
    balancePaid: number,
    paymentMode: PaymentMode,
    stitchedPhotos: string[],
    notes?: string
  ) => void;
  onAssignTimelineClick?: (order?: TailorOrder) => void;
  onNewOrderClick?: () => void;
  initialTab?: 'all' | 'cutting' | 'stitching' | 'overdue' | 'completed' | 'archived';
  isDesktopView?: boolean;
}

type OrderTabFilter = 'all' | 'cutting' | 'stitching' | 'overdue' | 'completed' | 'archived';

export const Screen5OrdersManager: React.FC<Screen5OrdersManagerProps> = ({
  orders,
  shopProfile,
  tailors = [],
  onBack,
  onSelectOrder,
  onArchiveOrder,
  onUnarchiveOrder,
  onExtendDueDate,
  onUpdateStatus,
  onDeliverOrder,
  onAssignTimelineClick,
  onNewOrderClick,
  initialTab = 'all',
  isDesktopView = false,
}) => {
  const [activeTab, setActiveTab] = useState<OrderTabFilter>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTailorFilter, setSelectedTailorFilter] = useState<string>('ALL');
  const [selectedGarmentFilter, setSelectedGarmentFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'due_soonest' | 'newest' | 'oldest' | 'balance_high' | 'overdue_most'>('due_soonest');
  
  // Extension date modal state
  const [extendingOrderId, setExtendingOrderId] = useState<string | null>(null);
  const [newDueDate, setNewDueDate] = useState<string>(
    new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [newDueTime, setNewDueTime] = useState<string>('18:00');

  // Status Change Workflow Modals
  const [completedModalOrder, setCompletedModalOrder] = useState<TailorOrder | null>(null);
  const [deliveryModalOrder, setDeliveryModalOrder] = useState<TailorOrder | null>(null);
  const [expandedPhotoUrl, setExpandedPhotoUrl] = useState<string | null>(null);
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);

  // Active vs Archived orders
  const activeOrders = useMemo(() => orders.filter((o) => !o.isArchived), [orders]);
  const archivedOrders = useMemo(() => orders.filter((o) => o.isArchived), [orders]);

  // Specific groups
  const overdueOrders = useMemo(() => activeOrders.filter((o) => o.isOverdue), [activeOrders]);
  const cuttingOrders = useMemo(() => activeOrders.filter((o) => o.status === 'New / Cutting'), [activeOrders]);
  const stitchingOrders = useMemo(
    () => activeOrders.filter((o) => o.status === 'Stitching in Progress' || o.status === 'Trial'),
    [activeOrders]
  );
  const completedOrders = useMemo(
    () => activeOrders.filter((o) => o.status === 'Completed' || o.status === 'Delivered'),
    [activeOrders]
  );

  // Get unique tailors and garments for filters
  const uniqueTailors = useMemo(() => {
    const set = new Set<string>();
    orders.forEach((o) => {
      if (o.assignedTailor) set.add(o.assignedTailor);
    });
    return Array.from(set);
  }, [orders]);

  const uniqueGarments = useMemo(() => {
    const set = new Set<string>();
    orders.forEach((o) => {
      if (o.garmentType) set.add(o.garmentType);
    });
    return Array.from(set);
  }, [orders]);

  // Tab-filtered base list
  const tabFilteredOrders = useMemo(() => {
    switch (activeTab) {
      case 'all':
        return activeOrders;
      case 'cutting':
        return cuttingOrders;
      case 'stitching':
        return stitchingOrders;
      case 'overdue':
        return overdueOrders;
      case 'completed':
        return completedOrders;
      case 'archived':
        return archivedOrders;
      default:
        return activeOrders;
    }
  }, [activeTab, activeOrders, cuttingOrders, stitchingOrders, overdueOrders, completedOrders, archivedOrders]);

  // Search and dropdown filters
  const filteredOrders = useMemo(() => {
    return tabFilteredOrders.filter((o) => {
      const matchesSearch =
        o.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.customerPhone.includes(searchQuery) ||
        o.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.garmentType.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (o.assignedTailor && o.assignedTailor.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesTailor = selectedTailorFilter === 'ALL' || o.assignedTailor === selectedTailorFilter;
      const matchesGarment = selectedGarmentFilter === 'ALL' || o.garmentType === selectedGarmentFilter;

      return matchesSearch && matchesTailor && matchesGarment;
    });
  }, [tabFilteredOrders, searchQuery, selectedTailorFilter, selectedGarmentFilter]);

  // Sorting
  const sortedOrders = useMemo(() => {
    const list = [...filteredOrders];
    list.sort((a, b) => {
      if (sortBy === 'due_soonest') {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      if (sortBy === 'newest') {
        return new Date(b.createdDate || 0).getTime() - new Date(a.createdDate || 0).getTime();
      }
      if (sortBy === 'oldest') {
        return new Date(a.createdDate || 0).getTime() - new Date(b.createdDate || 0).getTime();
      }
      if (sortBy === 'balance_high') {
        return b.balanceDue - a.balanceDue;
      }
      if (sortBy === 'overdue_most') {
        return (b.daysOverdue || 0) - (a.daysOverdue || 0);
      }
      return 0;
    });
    return list;
  }, [filteredOrders, sortBy]);

  // Total balance in current filtered view
  const totalBalanceDue = useMemo(() => {
    return tabFilteredOrders.reduce((sum, o) => sum + (o.balanceDue || 0), 0);
  }, [tabFilteredOrders]);

  // WhatsApp reminder generator
  const handleSendReminder = (order: TailorOrder) => {
    let msg = `Hello ${order.customerName}! Greetings from ${shopProfile?.shopName || 'Royal Tailors'}. `;
    if (order.isOverdue) {
      msg += `Your ${order.garmentType} (Order #${order.id}) is ready for trial/collection. Please visit our shop at your earliest convenience. Balance Due: ₹${order.balanceDue}.`;
    } else if (order.status === 'Completed' || order.status === 'Delivered') {
      msg += `Your ${order.garmentType} (Order #${order.id}) is completely ready! Balance Due: ₹${order.balanceDue}. Thank you for choosing us!`;
    } else {
      msg += `Update on your ${order.garmentType} (Order #${order.id}): Status is "${order.status}". Promised Due Date: ${order.dueDate}.`;
    }

    const waUrl = getWhatsAppUrl(order.customerPhone, msg);
    window.open(waUrl, '_blank');
  };

  // Status badge renderer
  const renderStatusBadge = (order: TailorOrder) => {
    if (order.isOverdue) {
      return (
        <span className="px-2.5 py-1 rounded-lg bg-rose-100 text-rose-900 text-xs font-black border border-rose-300 flex items-center gap-1 shadow-2xs">
          🔥 {order.daysOverdue}d Overdue
        </span>
      );
    }

    switch (order.status) {
      case 'New / Cutting':
        return (
          <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-amber-500 inline-block animate-pulse" />
            <span>1. Received & Cutting</span>
          </span>
        );
      case 'Assigned':
        return (
          <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-blue-100 text-blue-900 border border-blue-300 flex items-center gap-1 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-blue-600 inline-block" />
            <span>2. Assigned</span>
          </span>
        );
      case 'Stitching in Progress':
      case 'Trial':
        return (
          <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-indigo-100 text-indigo-950 border border-indigo-300 flex items-center gap-1 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-indigo-600 inline-block animate-ping" />
            <span>3. Stitching in Progress</span>
          </span>
        );
      case 'Completed':
        return (
          <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-emerald-100 text-emerald-950 border border-emerald-300 flex items-center gap-1 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block" />
            <span>4. Ready for Pickup</span>
          </span>
        );
      case 'Delivered':
        return (
          <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-[#0B4636]/10 text-[#0B4636] border border-[#0B4636]/30 flex items-center gap-1 shadow-2xs">
            <Check className="w-3.5 h-3.5 text-[#0B4636]" />
            <span>5. Delivered & Settled</span>
          </span>
        );
      default:
        return null;
    }
  };

  const handleStatusChangeRequest = (order: TailorOrder, targetStatus: OrderStatus) => {
    if (targetStatus === 'Assigned') {
      if (onAssignTimelineClick) {
        onAssignTimelineClick(order);
      } else if (onUpdateStatus) {
        onUpdateStatus(order.id, 'Assigned');
      }
    } else if (targetStatus === 'Completed') {
      setCompletedModalOrder(order);
    } else if (targetStatus === 'Delivered') {
      setDeliveryModalOrder(order);
    } else {
      if (onUpdateStatus) {
        onUpdateStatus(order.id, targetStatus);
      }
    }
  };

  const handleConfirmDeliverySettlement = (
    orderId: string,
    balancePaid: number,
    paymentMode: PaymentMode,
    stitchedPhotos: string[],
    notes?: string
  ) => {
    if (onDeliverOrder) {
      onDeliverOrder(orderId, balancePaid, paymentMode, stitchedPhotos, notes);
    } else if (onUpdateStatus) {
      onUpdateStatus(orderId, 'Delivered');
    }
    setDeliveryModalOrder(null);
  };

  const handleConfirmCompleted = (orderId: string) => {
    if (onUpdateStatus) {
      onUpdateStatus(orderId, 'Completed');
    }
    setCompletedModalOrder(null);
  };

  const handleCopyOrderId = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedOrderId(id);
    setTimeout(() => setCopiedOrderId(null), 2000);
  };

  return (
    <div className={`min-h-full bg-[#F8F9FA] text-slate-900 font-sans ${isDesktopView ? 'p-6' : 'pb-24'}`}>
      {/* Top Header Navigation (Mobile Only) */}
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
              <h1 className="text-base font-black tracking-tight flex items-center gap-2">
                <span>Orders Manager</span>
                <span className="text-[10px] bg-amber-400 text-[#0B4636] px-2 py-0.5 rounded-full font-black">
                  {activeOrders.length} ACTIVE
                </span>
              </h1>
              <p className="text-[10px] text-amber-300">Search, filter & track customer deliveries</p>
            </div>
          </div>

          {onNewOrderClick && (
            <button
              onClick={onNewOrderClick}
              className="bg-amber-400 text-[#0B4636] px-2.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1 shadow cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>New</span>
            </button>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200">
          <div>
            <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <Package className="w-6 h-6 text-[#0B4636]" />
              <span>Customer Orders & Deliveries</span>
            </h1>
            <p className="text-xs text-slate-500">
              Manage complete customer lifecycle from cutting to delivery, overdue alerts, and archives.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {onNewOrderClick && (
              <button
                onClick={onNewOrderClick}
                className="bg-[#0B4636] hover:bg-[#073024] text-white px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>+ New Order Entry</span>
              </button>
            )}

            <button
              onClick={onBack}
              className="text-xs font-bold text-slate-600 hover:text-[#0B4636] flex items-center gap-1.5 bg-white px-3.5 py-2.5 rounded-xl border border-slate-200 shadow-sm cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          </div>
        </div>
      )}

      <div className={`space-y-4 ${isDesktopView ? 'w-full max-w-none' : 'p-3 max-w-3xl mx-auto'}`}>
        
        {/* ================= TOP METRICS KPI ROW ================= */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div
            onClick={() => setActiveTab('all')}
            className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
              activeTab === 'all'
                ? 'bg-[#0B4636] text-white border-[#0B4636] shadow-md ring-2 ring-amber-300'
                : 'bg-white border-slate-200 text-slate-800 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between text-[11px] font-bold opacity-80 mb-1">
              <span>All Active</span>
              <Package className="w-4 h-4" />
            </div>
            <div className="text-2xl font-black">{activeOrders.length}</div>
            <div className="text-[10px] opacity-75 mt-0.5">Total active pipeline</div>
          </div>

          <div
            onClick={() => setActiveTab('stitching')}
            className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
              activeTab === 'stitching'
                ? 'bg-[#0B4636] text-white border-[#0B4636] shadow-md ring-2 ring-amber-300'
                : 'bg-white border-slate-200 text-slate-800 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between text-[11px] font-bold opacity-80 mb-1">
              <span>In Progress</span>
              <Scissors className="w-4 h-4" />
            </div>
            <div className="text-2xl font-black">{stitchingOrders.length + cuttingOrders.length}</div>
            <div className="text-[10px] opacity-75 mt-0.5">{cuttingOrders.length} cut • {stitchingOrders.length} sew</div>
          </div>

          <div
            onClick={() => setActiveTab('overdue')}
            className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
              activeTab === 'overdue'
                ? 'bg-rose-600 text-white border-rose-600 shadow-md ring-2 ring-rose-300'
                : overdueOrders.length > 0
                ? 'bg-rose-50 border-rose-200 text-rose-900 hover:bg-rose-100'
                : 'bg-white border-slate-200 text-slate-800'
            }`}
          >
            <div className="flex items-center justify-between text-[11px] font-black opacity-90 mb-1">
              <span>Overdue</span>
              <AlertTriangle className="w-4 h-4 text-amber-300" />
            </div>
            <div className="text-2xl font-black">{overdueOrders.length}</div>
            <div className="text-[10px] opacity-80 mt-0.5">Past promised date</div>
          </div>

          <div
            onClick={() => setActiveTab('completed')}
            className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
              activeTab === 'completed'
                ? 'bg-[#0B4636] text-white border-[#0B4636] shadow-md ring-2 ring-amber-300'
                : 'bg-white border-slate-200 text-slate-800 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between text-[11px] font-bold opacity-80 mb-1">
              <span>Completed</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-black">{completedOrders.length}</div>
            <div className="text-[10px] opacity-75 mt-0.5">Ready or delivered</div>
          </div>
        </div>

        {/* Urgent Overdue Banner if viewing Overdue tab or have overdue orders */}
        {activeTab === 'overdue' && overdueOrders.length > 0 && (
          <div className="bg-gradient-to-r from-rose-900 via-red-800 to-rose-950 text-white p-4 rounded-3xl shadow-md border border-rose-700 flex items-start gap-3.5">
            <div className="p-2.5 rounded-2xl bg-white/10 shrink-0">
              <AlertTriangle className="w-6 h-6 text-amber-300 animate-pulse" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-amber-300">
                  {overdueOrders.length} Urgent Overdue Deliveries
                </h3>
                <span className="text-[11px] font-black bg-white/20 px-2 py-0.5 rounded-full">
                  ₹{overdueOrders.reduce((sum, o) => sum + o.balanceDue, 0)} Balance
                </span>
              </div>
              <p className="text-xs text-rose-100 mt-1 leading-relaxed">
                These customer garments have crossed promised delivery dates. Use 1-tap WhatsApp reminders or call them directly.
              </p>
            </div>
          </div>
        )}

        {/* ================= TAB CONTROLS & FILTER BAR ================= */}
        <div className="bg-white rounded-3xl p-3 sm:p-4 border border-slate-200 shadow-sm space-y-3">
          {/* Main Segmented Pill Tabs */}
          <div className="flex items-center bg-slate-100 p-1 rounded-2xl gap-1 overflow-x-auto no-scrollbar text-xs font-extrabold">
            <button
              onClick={() => setActiveTab('all')}
              className={`py-2 px-3 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                activeTab === 'all'
                  ? 'bg-[#0B4636] text-amber-300 shadow-md'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>All Orders ({activeOrders.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('cutting')}
              className={`py-2 px-3 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                activeTab === 'cutting'
                  ? 'bg-[#0B4636] text-amber-300 shadow-md'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Scissors className="w-3.5 h-3.5" />
              <span>1. Cutting ({cuttingOrders.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('stitching')}
              className={`py-2 px-3 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                activeTab === 'stitching'
                  ? 'bg-[#0B4636] text-amber-300 shadow-md'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>2-3. Stitching ({stitchingOrders.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('overdue')}
              className={`py-2 px-3 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                activeTab === 'overdue'
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>⚠️ Overdue ({overdueOrders.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('completed')}
              className={`py-2 px-3 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                activeTab === 'completed'
                  ? 'bg-[#0B4636] text-amber-300 shadow-md'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>4. Ready ({completedOrders.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('archived')}
              className={`py-2 px-3 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                activeTab === 'archived'
                  ? 'bg-slate-800 text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Archive className="w-3.5 h-3.5" />
              <span>5. Delivered ({archivedOrders.length})</span>
            </button>
          </div>

          {/* Search and Dropdown Filter Row */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 pt-1">
            {/* Search Input */}
            <div className="sm:col-span-6 relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by customer name, phone, order #, tailor..."
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-3 py-2 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#0B4636] focus:bg-white transition-all shadow-2xs"
              />
            </div>

            {/* Tailor Filter */}
            <div className="sm:col-span-3">
              <select
                value={selectedTailorFilter}
                onChange={(e) => setSelectedTailorFilter(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#0B4636] shadow-2xs"
              >
                <option value="ALL">All Tailors</option>
                {uniqueTailors.map((t) => (
                  <option key={t} value={t}>
                    Tailor: {t}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort Dropdown */}
            <div className="sm:col-span-3">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#0B4636] shadow-2xs"
              >
                <option value="due_soonest">Due Date (Earliest)</option>
                <option value="newest">Created (Newest)</option>
                <option value="oldest">Created (Oldest)</option>
                <option value="balance_high">Highest Balance Due</option>
                <option value="overdue_most">Most Overdue</option>
              </select>
            </div>
          </div>
        </div>

        {/* ================= ORDER CARDS LIST ================= */}
        <div className="space-y-3">
          {sortedOrders.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 text-center border border-slate-200 shadow-sm space-y-3">
              <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                <Package className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-800">
                  No orders found in "{activeTab.toUpperCase()}" view
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  {searchQuery
                    ? `No matching records for search "${searchQuery}".`
                    : 'All customer records are organized properly.'}
                </p>
              </div>
              {onNewOrderClick && (
                <button
                  onClick={onNewOrderClick}
                  className="px-4 py-2 rounded-xl bg-[#0B4636] text-amber-300 font-extrabold text-xs inline-flex items-center gap-1.5 shadow cursor-pointer"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>Create First Order</span>
                </button>
              )}
            </div>
          ) : (
            sortedOrders.map((order) => {
              const isExtending = extendingOrderId === order.id;
              const hasStitchedPhotos = order.stitchedPhotos && order.stitchedPhotos.length > 0;

              return (
                <div
                  key={order.id}
                  className={`bg-white rounded-3xl p-4 sm:p-5 border transition-all space-y-3.5 shadow-sm hover:shadow-md relative overflow-hidden ${
                    order.isOverdue
                      ? 'border-rose-300 ring-1 ring-rose-200'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {/* Top Color Urgency Indicator Strip */}
                  {order.isOverdue && <div className="absolute top-0 left-0 right-0 h-1.5 bg-rose-500" />}

                  {/* Header Row: Copyable ID, Badges, Category, Due Pill & Financial Breakdown */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={(e) => handleCopyOrderId(order.id, e)}
                        className="text-xs font-mono font-black text-slate-800 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-xl border border-slate-200 flex items-center gap-1 cursor-pointer transition-colors"
                        title="Click to copy Order ID"
                      >
                        <span>{order.id}</span>
                        <Copy className="w-3 h-3 text-slate-400" />
                        {copiedOrderId === order.id && (
                          <span className="text-[10px] text-emerald-700 font-bold ml-1">Copied!</span>
                        )}
                      </button>

                      {renderStatusBadge(order)}

                      {order.orderCategory && (
                        <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                          {order.orderCategory}
                        </span>
                      )}

                      {order.isRepeatCustomer && (
                        <span className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 text-[10px] font-black border border-emerald-200 flex items-center gap-1">
                          <UserCheck className="w-3 h-3" />
                          Repeat
                        </span>
                      )}
                    </div>

                    <div className="text-right">
                      <div className="text-[11px] font-black text-slate-900">Total: ₹{order.totalAmount}</div>
                      {order.balanceDue > 0 ? (
                        <span className="px-2 py-0.5 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-black inline-block">
                          Due: ₹{order.balanceDue}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-black inline-block">
                          ✓ Paid in Full
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Main Content Info Row */}
                  <div className="flex items-center gap-3">
                    <div
                      onClick={() => onSelectOrder(order)}
                      className="w-16 h-16 rounded-2xl bg-emerald-900/5 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity relative"
                    >
                      {hasStitchedPhotos && order.stitchedPhotos ? (
                        <img
                          src={order.stitchedPhotos[0]}
                          alt="Stitched dress"
                          className="w-full h-full object-cover"
                        />
                      ) : order.fabricPhotos && order.fabricPhotos[0] ? (
                        <img src={order.fabricPhotos[0]} alt="Fabric" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-2xl">🧵</span>
                      )}

                      {hasStitchedPhotos && (
                        <span className="absolute bottom-0 right-0 bg-[#0B4636] text-amber-300 text-[9px] font-black px-1 rounded-tl-md">
                          Stitched
                        </span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0" onClick={() => onSelectOrder(order)}>
                      <h3 className="text-sm font-extrabold text-slate-900 truncate hover:text-[#0B4636] cursor-pointer">
                        {order.customerName}
                      </h3>
                      <p className="text-xs font-semibold text-slate-500 truncate">{order.customerPhone}</p>
                      <p className="text-xs font-black text-[#0B4636] mt-0.5 truncate">
                        {order.garmentType}{' '}
                        {order.subTypeStyle && (
                          <span className="font-normal text-slate-500">({order.subTypeStyle})</span>
                        )}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Promised Delivery</div>
                      <div className="text-xs font-black text-slate-900 mt-0.5">{order.dueDate}</div>
                      <div className="text-[10px] text-slate-500">{order.dueTime || '18:00'}</div>
                    </div>
                  </div>

                  {/* Stitched Photos Strip (if uploaded upon delivery/completion) */}
                  {hasStitchedPhotos && order.stitchedPhotos && (
                    <div className="p-2.5 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[10px] font-black text-emerald-900 flex items-center gap-1">
                          <Camera className="w-3 h-3 text-emerald-700" />
                          <span>Finished Stitched Garment Photos ({order.stitchedPhotos.length}):</span>
                        </span>
                        <span className="text-[10px] font-bold text-emerald-700">Click to zoom</span>
                      </div>
                      <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
                        {order.stitchedPhotos.map((photo, pIdx) => (
                          <div
                            key={pIdx}
                            onClick={() => setExpandedPhotoUrl(photo)}
                            className="w-12 h-12 rounded-xl overflow-hidden border border-emerald-300 bg-white shrink-0 cursor-pointer hover:scale-105 transition-transform shadow-2xs"
                          >
                            <img src={photo} alt={`Stitched ${pIdx + 1}`} className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Staff Tailor Assignment Strip */}
                  {(() => {
                    const isUnassigned =
                      !order.assignedTailor ||
                      order.assignedTailor === 'Unassigned' ||
                      order.assignedTailor === 'Not Assigned';

                    const isInProgress = order.status === 'Stitching in Progress' || order.status === 'Trial';
                    const isCompleted = order.status === 'Completed';
                    const isDelivered = order.status === 'Delivered';

                    return (
                      <div
                        className={`rounded-2xl p-2.5 border flex items-center justify-between text-xs gap-2 transition-all ${
                          isInProgress
                            ? 'bg-indigo-50/80 border-indigo-200'
                            : isCompleted
                            ? 'bg-emerald-50/70 border-emerald-200'
                            : isUnassigned
                            ? 'bg-amber-50/80 border-amber-200'
                            : 'bg-slate-50 border-slate-200/80'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-7 h-7 rounded-full font-black text-xs flex items-center justify-center shrink-0 ${
                              isCompleted
                                ? 'bg-emerald-600 text-white'
                                : isInProgress
                                ? 'bg-indigo-600 text-white'
                                : isUnassigned
                                ? 'bg-amber-400 text-slate-950 font-extrabold'
                                : 'bg-[#0B4636] text-amber-300'
                            }`}
                          >
                            {isCompleted ? '✓' : isInProgress ? '🧵' : isUnassigned ? '✂️' : order.assignedTailor[0]}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span
                                className={`font-black ${
                                  isInProgress
                                    ? 'text-indigo-950'
                                    : isCompleted
                                    ? 'text-emerald-950'
                                    : isUnassigned
                                    ? 'text-amber-900'
                                    : 'text-slate-800'
                                }`}
                              >
                                {isInProgress && isUnassigned
                                  ? 'In-Shop Stitching (Master Workshop)'
                                  : isUnassigned
                                  ? 'Karigar Not Assigned Yet'
                                  : `${order.assignedTailor}`}
                              </span>
                              
                              <span className="text-[10px] px-1.5 py-0.5 rounded-md font-bold bg-white/80 border border-slate-200 text-slate-600">
                                {isInProgress
                                  ? 'In Progress'
                                  : isCompleted
                                  ? 'Stitching Done'
                                  : isDelivered
                                  ? 'Delivered'
                                  : isUnassigned
                                  ? 'Cutting Stage'
                                  : 'Assigned'}
                              </span>
                            </div>
                            {order.estimatedHours ? (
                              <span className="text-[10px] text-slate-500">• ~{order.estimatedHours}h stitching</span>
                            ) : null}
                          </div>
                        </div>

                        {onAssignTimelineClick && !isDelivered && (
                          <button
                            type="button"
                            onClick={() => onAssignTimelineClick(order)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-black shadow-2xs cursor-pointer flex items-center gap-1 transition-all active:scale-95 shrink-0 ${
                              isUnassigned
                                ? 'bg-amber-500 hover:bg-amber-600 text-slate-950'
                                : 'bg-white border border-slate-300 text-slate-800 hover:bg-slate-100'
                            }`}
                          >
                            <Scissors className="w-3.5 h-3.5" />
                            <span>{isUnassigned ? 'Assign Tailor' : 'Change'}</span>
                          </button>
                        )}
                      </div>
                    );
                  })()}

                  {/* 5-Stage Interactive Status Pipeline Tracker with Voice Note, Measurements & Receipt Quick Actions */}
                  <OrderStatusTracker
                    order={order}
                    onStatusChangeRequest={handleStatusChangeRequest}
                    shopProfile={shopProfile}
                  />

                  {/* Extended Due Date Modal Inline Accordion */}
                  {isExtending && (
                    <div className="bg-amber-50 rounded-2xl p-3 border border-amber-300 space-y-2 animate-fade-in">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-amber-950">Extend Promised Due Date</span>
                        <button
                          onClick={() => setExtendingOrderId(null)}
                          className="text-[11px] font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="date"
                          value={newDueDate}
                          onChange={(e) => setNewDueDate(e.target.value)}
                          className="flex-1 bg-white border border-amber-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900"
                        />
                        <button
                          onClick={() => {
                            onExtendDueDate(order.id, newDueDate);
                            setExtendingOrderId(null);
                          }}
                          className="px-3.5 py-1.5 rounded-xl bg-[#0B4636] text-amber-300 font-black text-xs cursor-pointer shadow-sm"
                        >
                          Save Date
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Quick Action Footer Buttons - Google-Grade Streamlined for 30-50+ Non-Tech Users */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-xs flex-wrap">
                    {/* Direct Contact Buttons (Instant Call & WhatsApp) */}
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleSendReminder(order)}
                        className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-1.5 shadow-sm cursor-pointer transition-all active:scale-95"
                        title="Send WhatsApp Update"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>WhatsApp</span>
                      </button>

                      <a
                        href={`tel:${clean10DigitPhone(order.customerPhone)}`}
                        className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 flex items-center justify-center cursor-pointer border border-slate-200"
                        title="Call Customer Directly"
                      >
                        <Phone className="w-4 h-4 text-slate-700" />
                      </a>

                      <button
                        onClick={() => {
                          setExtendingOrderId(order.id);
                          setNewDueDate(order.dueDate);
                        }}
                        className="px-2.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1 transition-all cursor-pointer border border-slate-200/60"
                        title="Extend Due Date"
                      >
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        <span className="hidden sm:inline">Date</span>
                      </button>
                    </div>

                    {/* Prominent Contextual Stage Action Button */}
                    <div className="flex items-center gap-1.5 ml-auto">
                      {(order.status === 'Assigned' || order.status === 'Stitching in Progress' || order.status === 'Trial') && (
                        <button
                          type="button"
                          onClick={() => handleStatusChangeRequest(order, 'Completed')}
                          className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-1.5 shadow-sm cursor-pointer active:scale-95 transition-all"
                        >
                          <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                          <span>Ready for Pickup</span>
                        </button>
                      )}

                      {order.status === 'Completed' && (
                        <button
                          type="button"
                          onClick={() => handleStatusChangeRequest(order, 'Delivered')}
                          className="px-3 py-2 rounded-xl bg-[#0B4636] hover:bg-[#073024] text-amber-300 font-black text-xs flex items-center gap-1.5 shadow-sm cursor-pointer active:scale-95 transition-all"
                        >
                          <ShoppingBag className="w-4 h-4 stroke-[2.5]" />
                          <span>Deliver & Collect ₹{order.balanceDue}</span>
                        </button>
                      )}

                      {order.status === 'Delivered' && (
                        <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 font-black text-xs border border-emerald-200 flex items-center gap-1">
                          <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                          <span>Delivered</span>
                        </span>
                      )}

                      {order.isArchived ? (
                        <button
                          onClick={() => onUnarchiveOrder && onUnarchiveOrder(order.id)}
                          className="px-2.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1 cursor-pointer"
                          title="Restore Order"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Restore</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => onArchiveOrder(order.id)}
                          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer border border-slate-200"
                          title="Archive Order"
                        >
                          <Archive className="w-4 h-4" />
                        </button>
                      )}

                      <button
                        onClick={() => onSelectOrder(order)}
                        className="px-3 py-2 rounded-xl bg-[#0B4636] hover:bg-[#073024] text-amber-300 font-black text-xs flex items-center gap-1 shadow-sm cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Details</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ================= RESCHEDULE PROMISED DATE & TIME MODAL ================= */}
      {extendingOrderId && (() => {
        const targetOrder = orders.find((o) => o.id === extendingOrderId);
        if (!targetOrder) return null;

        const handleSaveReschedule = () => {
          onExtendDueDate(extendingOrderId, newDueDate);
          // Also update dueTime if changed
          roomDb.updateOrderDueDate(extendingOrderId, newDueDate, newDueTime);
          setExtendingOrderId(null);
        };

        return (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-3xl w-full max-w-md p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 my-auto animate-in fade-in zoom-in duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[#0B4636]" />
                  <div>
                    <h3 className="font-extrabold text-base text-slate-900">Reschedule Delivery</h3>
                    <p className="text-[10px] text-slate-500">Order #{targetOrder.id} • {targetOrder.customerName}</p>
                  </div>
                </div>
                <button
                  onClick={() => setExtendingOrderId(null)}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <PromisedDateTimeInput
                  date={newDueDate}
                  time={newDueTime}
                  onDateChange={(d) => setNewDueDate(d)}
                  onTimeChange={(t) => setNewDueTime(t)}
                  showPresets={true}
                  showStatusBanner={true}
                  label="Promised Date & Time"
                />
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={handleSaveReschedule}
                  className="flex-1 py-2.5 bg-[#0B4636] hover:bg-[#073024] text-amber-300 font-extrabold rounded-xl text-xs shadow flex items-center justify-center gap-2 cursor-pointer border border-amber-300/30"
                >
                  <Check className="w-4 h-4 text-amber-300" />
                  <span>Update Promised Schedule</span>
                </button>

                <button
                  type="button"
                  onClick={() => setExtendingOrderId(null)}
                  className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ================= ORDER COMPLETED MODAL (WHATSAPP NOTIFICATION) ================= */}
      {completedModalOrder && (
        <OrderCompletedModal
          order={completedModalOrder}
          shopProfile={shopProfile}
          onClose={() => setCompletedModalOrder(null)}
          onConfirmCompleted={handleConfirmCompleted}
        />
      )}

      {/* ================= ORDER DELIVERY MODAL (SETTLEMENT & PHOTOS) ================= */}
      {deliveryModalOrder && (
        <OrderDeliveryModal
          order={deliveryModalOrder}
          shopProfile={shopProfile}
          onClose={() => setDeliveryModalOrder(null)}
          onConfirmDelivery={handleConfirmDeliverySettlement}
        />
      )}

      {/* ================= FULL SCREEN PHOTO ZOOM MODAL ================= */}
      {expandedPhotoUrl && (
        <div
          onClick={() => setExpandedPhotoUrl(null)}
          className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center z-50 p-4 cursor-pointer"
        >
          <div className="relative max-w-2xl max-h-[90vh] bg-slate-900 rounded-3xl overflow-hidden shadow-2xl p-2">
            <button
              onClick={() => setExpandedPhotoUrl(null)}
              className="absolute top-4 right-4 p-2 bg-black/60 text-white rounded-full hover:bg-black"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={expandedPhotoUrl}
              alt="Zoomed stitched dress"
              className="w-full h-auto max-h-[85vh] object-contain rounded-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
};
