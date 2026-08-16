import React, { useState, useMemo, useRef, useEffect } from 'react';
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
  FileText,
  Mic,
  Play,
  Pause,
  Printer,
  Sparkles,
} from 'lucide-react';
import {
  TailorOrder,
  OrderStatus,
  ShopProfile,
  PaymentMode,
  StaffTailor,
} from '../../types';
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
  const [receiptModalOrder, setReceiptModalOrder] = useState<TailorOrder | null>(null);
  const [slipModalOrder, setSlipModalOrder] = useState<TailorOrder | null>(null);
  const [expandedPhotoUrl, setExpandedPhotoUrl] = useState<string | null>(null);
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);
  const [openCardMenuId, setOpenCardMenuId] = useState<string | null>(null);
  const [playingVoiceOrderId, setPlayingVoiceOrderId] = useState<string | null>(null);
  const audioPlaybackRef = useRef<HTMLAudioElement | null>(null);

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

  const getStageIndex = (status: OrderStatus): number => {
    switch (status) {
      case 'New / Cutting':
        return 0;
      case 'Assigned':
        return 1;
      case 'Stitching in Progress':
      case 'Trial':
        return 2;
      case 'Completed':
        return 3;
      case 'Delivered':
        return 4;
      default:
        return 0;
    }
  };

  const handleToggleVoicePlay = (order: TailorOrder, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!order.voiceNoteUrl) return;

    if (playingVoiceOrderId === order.id) {
      if (audioPlaybackRef.current) {
        audioPlaybackRef.current.pause();
        audioPlaybackRef.current = null;
      }
      setPlayingVoiceOrderId(null);
    } else {
      if (audioPlaybackRef.current) {
        audioPlaybackRef.current.pause();
      }
      const audio = new Audio(order.voiceNoteUrl);
      audioPlaybackRef.current = audio;
      setPlayingVoiceOrderId(order.id);
      audio.play().catch((err) => {
        console.warn('Audio playback not allowed or failed:', err);
      });
      audio.onended = () => {
        setPlayingVoiceOrderId(null);
        audioPlaybackRef.current = null;
      };
      audio.onerror = () => {
        setPlayingVoiceOrderId(null);
        audioPlaybackRef.current = null;
      };
    }
  };

  useEffect(() => {
    return () => {
      if (audioPlaybackRef.current) {
        audioPlaybackRef.current.pause();
        audioPlaybackRef.current = null;
      }
    };
  }, []);

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

        {/* ================= ORDER CARDS LIST (DASHBOARD-ALIGNED RICH COLOR THEMES) ================= */}
        <div className="space-y-3.5">
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
              const hasStitchedPhotos = order.stitchedPhotos && order.stitchedPhotos.length > 0;
              const isUnassigned =
                !order.assignedTailor ||
                order.assignedTailor === 'Unassigned' ||
                order.assignedTailor === 'Not Assigned';
              const currentStageIdx = getStageIndex(order.status);
              const isCardMenuOpen = openCardMenuId === order.id;
              const isVoicePlaying = playingVoiceOrderId === order.id;

              // Card background tint based on category & status matching dashboard
              const cardBgStyle = order.isOverdue
                ? 'bg-gradient-to-br from-[#FFF1F2] via-[#FFF8F8] to-[#FFE4E6] border-rose-300 ring-1 ring-rose-300/70 shadow-sm'
                : order.orderCategory === 'Alteration' || order.orderCategory === 'Repair'
                ? 'bg-gradient-to-br from-[#FAF5FF] via-[#FDFBFE] to-[#F3E8FF]/80 border-fuchsia-200/90 hover:border-fuchsia-300 hover:shadow-md'
                : order.status === 'Completed' || order.status === 'Delivered'
                ? 'bg-gradient-to-br from-[#F0FDF4] via-[#F9FDFB] to-[#DCFCE7]/70 border-emerald-200/90 hover:border-emerald-300 hover:shadow-md'
                : order.status === 'Stitching in Progress'
                ? 'bg-gradient-to-br from-[#EEF2FF] via-[#F8FAFF] to-[#E0E7FF]/80 border-indigo-200/90 hover:border-indigo-300 hover:shadow-md'
                : 'bg-gradient-to-br from-[#F0FDF9] via-[#FAFCFB] to-[#E2F7EE]/70 border-teal-200/90 hover:border-teal-300 hover:shadow-md';

              return (
                <div
                  key={order.id}
                  className={`rounded-xl p-2.5 sm:p-3 border transition-all space-y-1.5 shadow-2xs ${cardBgStyle}`}
                >
                  {/* Top Header Row of Card */}
                  <div className="flex items-center justify-between gap-1.5 flex-wrap border-b border-slate-200/50 pb-1.5">
                    {/* Left Badges */}
                    <div className="flex items-center gap-1 flex-wrap">
                      <button
                        type="button"
                        onClick={(e) => handleCopyOrderId(order.id, e)}
                        className="bg-white/90 hover:bg-white px-1.5 py-0.5 rounded-md text-[11px] font-mono font-black text-slate-800 border border-slate-200/90 flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                        title="Click to copy Order #"
                      >
                        <span>#{order.id}</span>
                        <Copy className="w-2.5 h-2.5 text-slate-400" />
                        {copiedOrderId === order.id && (
                          <span className="text-[9px] text-emerald-700 font-bold ml-0.5">Copied!</span>
                        )}
                      </button>

                      {/* Category Pill */}
                      <span
                        className={`px-1.5 py-0.2 rounded text-[9px] font-black border shadow-2xs ${
                          order.orderCategory === 'Alteration' || order.orderCategory === 'Repair'
                            ? 'bg-fuchsia-100 text-fuchsia-900 border-fuchsia-300'
                            : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                        }`}
                      >
                        {order.orderCategory || 'New Stitch'}
                      </span>

                      {order.isRepeatCustomer && (
                        <span className="px-1.5 py-0.2 rounded bg-blue-100 text-blue-900 text-[9px] font-bold border border-blue-300 flex items-center gap-0.5 shadow-2xs">
                          <UserCheck className="w-2.5 h-2.5" />
                          Repeat
                        </span>
                      )}

                      {order.isOverdue && (
                        <span className="px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 text-[9px] font-black border border-rose-300 flex items-center gap-0.5 shadow-2xs animate-pulse">
                          🔥 Overdue ({order.daysOverdue}d)
                        </span>
                      )}
                    </div>

                    {/* Right Payment Status & 3-Dot Menu */}
                    <div className="flex items-center gap-1.5">
                      <div className="text-right flex items-center gap-1.5">
                        <span className="text-xs font-black text-slate-900">Total: ₹{order.totalAmount}</span>
                        {order.balanceDue > 0 ? (
                          <span className="px-1.5 py-0.2 rounded bg-rose-100 border border-rose-300 text-rose-800 text-[9px] font-black inline-block shadow-2xs">
                            Due: ₹{order.balanceDue}
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.2 rounded bg-emerald-100 border border-emerald-300 text-emerald-800 text-[9px] font-black inline-block shadow-2xs">
                            ✓ Paid in Full
                          </span>
                        )}
                      </div>

                      {/* 3-Dot Options Dropdown */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setOpenCardMenuId(isCardMenuOpen ? null : order.id)}
                          className="p-1 rounded bg-white/80 hover:bg-white text-slate-600 hover:text-slate-900 border border-slate-200/80 transition-colors cursor-pointer shadow-2xs"
                        >
                          <MoreVertical className="w-3 h-3" />
                        </button>

                        {isCardMenuOpen && (
                          <div className="absolute right-0 mt-1 w-48 bg-white rounded-xl shadow-xl border border-slate-200 p-1 z-30 space-y-0.5 text-xs font-bold text-slate-700 animate-in fade-in zoom-in duration-150">
                            <button
                              type="button"
                              onClick={() => {
                                setOpenCardMenuId(null);
                                onSelectOrder(order);
                              }}
                              className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-slate-100 flex items-center gap-2 cursor-pointer"
                            >
                              <FileText className="w-3.5 h-3.5 text-slate-500" />
                              <span>View Full Details</span>
                            </button>

                            {onAssignTimelineClick && (
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenCardMenuId(null);
                                  onAssignTimelineClick(order);
                                }}
                                className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-slate-100 flex items-center gap-2 cursor-pointer"
                              >
                                <Scissors className="w-3.5 h-3.5 text-slate-500" />
                                <span>Change Tailor / Due Date</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => {
                                setOpenCardMenuId(null);
                                setReceiptModalOrder(order);
                              }}
                              className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-slate-100 flex items-center gap-2 cursor-pointer"
                            >
                              <Printer className="w-3.5 h-3.5 text-slate-500" />
                              <span>Print / Share Bill</span>
                            </button>

                            {order.status !== 'Delivered' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenCardMenuId(null);
                                  handleStatusChangeRequest(order, 'Delivered');
                                }}
                                className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-emerald-50 text-emerald-800 font-black flex items-center gap-2 cursor-pointer"
                              >
                                <ShoppingBag className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Mark Delivered</span>
                              </button>
                            )}

                            {order.isArchived ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenCardMenuId(null);
                                  if (onUnarchiveOrder) onUnarchiveOrder(order.id);
                                }}
                                className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-slate-100 text-slate-700 flex items-center gap-2 cursor-pointer"
                              >
                                <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                                <span>Restore Order</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenCardMenuId(null);
                                  onArchiveOrder(order.id);
                                }}
                                className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-rose-50 text-rose-700 flex items-center gap-2 cursor-pointer"
                              >
                                <Archive className="w-3.5 h-3.5 text-rose-500" />
                                <span>Archive Order</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Middle Row (3 Horizontal Columns on Desktop) */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 items-center">
                    
                    {/* Column 1: Customer & Garment (4 cols) */}
                    <div className="lg:col-span-4 flex flex-col justify-center space-y-1">
                      <div className="flex items-center gap-2">
                        {/* Photo Box */}
                        <div
                          onClick={() => {
                            if (order.receiptImageUrl || (order.fabricPhotos && order.fabricPhotos[0])) {
                              setSlipModalOrder(order);
                            } else {
                              onSelectOrder(order);
                            }
                          }}
                          className="w-9 h-9 rounded-lg bg-white border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center cursor-pointer hover:opacity-90 relative group shadow-2xs"
                          title="Click to view slip / fabric photo"
                        >
                          {hasStitchedPhotos && order.stitchedPhotos ? (
                            <img src={order.stitchedPhotos[0]} alt="Stitched" className="w-full h-full object-cover" />
                          ) : order.fabricPhotos && order.fabricPhotos[0] ? (
                            <img src={order.fabricPhotos[0]} alt="Fabric" className="w-full h-full object-cover" />
                          ) : order.receiptImageUrl ? (
                            <img src={order.receiptImageUrl} alt="Slip" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-sm">🧵</span>
                          )}
                        </div>

                        {/* Customer Info */}
                        <div className="min-w-0 flex-1">
                          <h4
                            onClick={() => onSelectOrder(order)}
                            className="text-xs font-black text-slate-900 truncate hover:text-[#0B4636] cursor-pointer leading-tight"
                          >
                            {order.customerName}
                          </h4>
                          <div className="text-[10px] text-slate-500 font-medium truncate">{order.customerPhone}</div>
                          <div className="text-[11px] font-black text-[#0B4636] truncate">
                            {order.garmentType} {order.subTypeStyle && <span className="font-semibold text-slate-500">({order.subTypeStyle})</span>}
                          </div>
                        </div>
                      </div>

                      {/* Special Notes banner if present */}
                      {order.specialNotes && (
                        <div className="bg-amber-50/90 border border-amber-200/90 rounded-md p-1 flex items-center gap-1 text-[9px] text-amber-950 shadow-2xs">
                          <span className="font-black text-amber-800 shrink-0">📝</span>
                          <span className="truncate font-semibold">{order.specialNotes}</span>
                        </div>
                      )}
                    </div>

                    {/* Column 2: Worker & 5-Node Stepper (6 cols) */}
                    <div className="lg:col-span-6 space-y-1 bg-white/90 backdrop-blur-xs p-1.5 sm:p-2 rounded-xl border border-slate-200/70 shadow-2xs">
                      {/* Worker Header Info */}
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <div className="w-4 h-4 rounded bg-[#0B4636] text-amber-300 text-[9px] font-black flex items-center justify-center shrink-0">
                            {isUnassigned ? '✂️' : (order.assignedTailor ? order.assignedTailor[0] : 'S')}
                          </div>
                          <span className="font-black text-slate-900 text-[11px] truncate">
                            {isUnassigned ? 'Unassigned' : order.assignedTailor}
                          </span>
                          <span
                            className={`text-[8px] font-bold px-1.5 py-0.2 rounded-full ${
                              order.status === 'Stitching in Progress'
                                ? 'bg-indigo-100 text-indigo-800'
                                : order.status === 'Completed'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {order.status}
                          </span>
                        </div>

                        <div className="text-[9px] text-slate-400 font-medium">
                          ⏱ ~{order.estimatedHours || 4}h
                        </div>
                      </div>

                      {/* 5-Node Stepper */}
                      <div className="relative flex items-center justify-between pt-0.5">
                        {/* Connecting track line */}
                        <div className="absolute top-[10px] left-3 right-3 h-0.5 bg-slate-200 -z-0" />
                        <div
                          className="absolute top-[10px] left-3 h-0.5 bg-emerald-500 -z-0 transition-all duration-300"
                          style={{ width: `${Math.min(100, Math.max(0, (currentStageIdx / 4) * 100))}%` }}
                        />

                        {[
                          { stage: 'Cutting', label: 'Cutting' },
                          { stage: 'Assigned', label: 'Assigned' },
                          { stage: 'Stitching', label: 'Stitching' },
                          { stage: 'Ready', label: 'Ready' },
                          { stage: 'Delivered', label: 'Delivered' },
                        ].map((node, nIdx) => {
                          const isDone = nIdx < currentStageIdx;
                          const isCurrent = nIdx === currentStageIdx;

                          return (
                            <div
                              key={node.stage}
                              onClick={() => {
                                if (node.stage === 'Cutting') handleStatusChangeRequest(order, 'New / Cutting');
                                if (node.stage === 'Assigned') handleStatusChangeRequest(order, 'Assigned');
                                if (node.stage === 'Stitching') handleStatusChangeRequest(order, 'Stitching in Progress');
                                if (node.stage === 'Ready') handleStatusChangeRequest(order, 'Completed');
                                if (node.stage === 'Delivered') handleStatusChangeRequest(order, 'Delivered');
                              }}
                              className="flex flex-col items-center cursor-pointer relative z-10 group"
                              title={`Click to switch status to ${node.stage}`}
                            >
                              {/* Node Circle */}
                              <div
                                className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black transition-all ${
                                  isDone
                                    ? 'bg-emerald-500 text-white shadow-2xs'
                                    : isCurrent
                                    ? 'bg-indigo-600 text-white ring-2 ring-indigo-200 shadow-xs scale-105'
                                    : 'bg-white border border-slate-300 text-slate-400 group-hover:border-slate-400'
                                }`}
                              >
                                {isDone ? (
                                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                                ) : isCurrent ? (
                                  <Sparkles className="w-2.5 h-2.5 text-amber-300" />
                                ) : (
                                  <span>{nIdx + 1}</span>
                                )}
                              </div>

                              {/* Label */}
                              <span
                                className={`text-[9px] mt-0.5 font-bold ${
                                  isCurrent
                                    ? 'text-indigo-950 font-black'
                                    : isDone
                                    ? 'text-slate-800'
                                    : 'text-slate-400'
                                }`}
                              >
                                {node.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Column 3: Delivery Info Box (2 cols) */}
                    <div className="lg:col-span-2 bg-white/90 backdrop-blur-xs p-1.5 rounded-xl border border-slate-200/70 text-center sm:text-right flex lg:flex-col justify-between items-center lg:items-end shadow-2xs">
                      <div className="flex items-center gap-1 text-[8px] font-bold text-slate-400 uppercase tracking-wider">
                        <Calendar className="w-2 h-2" />
                        <span>Delivery</span>
                      </div>
                      <div>
                        <div className="text-xs font-black text-slate-900">{order.dueDate}</div>
                        <div className="text-[9px] text-slate-500 font-medium">{order.dueTime || '18:00'}</div>
                      </div>
                      {order.isOverdue ? (
                        <span className="text-[8px] font-black text-rose-600">🔴 Overdue</span>
                      ) : (
                        <span className="text-[8px] font-bold text-emerald-600">🟢 On Track</span>
                      )}
                    </div>
                  </div>

                  {/* Stitched Photos Strip (if finished dress photos attached) */}
                  {hasStitchedPhotos && order.stitchedPhotos && (
                    <div className="p-1.5 rounded-xl bg-emerald-50/60 border border-emerald-200/80 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[9px] font-black text-emerald-900 flex items-center gap-1">
                          <Camera className="w-2.5 h-2.5 text-emerald-700" />
                          <span>Finished Garment ({order.stitchedPhotos.length}):</span>
                        </span>
                        <span className="text-[8px] font-bold text-emerald-700">Click to zoom</span>
                      </div>
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                        {order.stitchedPhotos.map((photo, pIdx) => (
                          <div
                            key={pIdx}
                            onClick={() => setExpandedPhotoUrl(photo)}
                            className="w-8 h-8 rounded-md overflow-hidden border border-emerald-300 bg-white shrink-0 cursor-pointer hover:scale-105 transition-transform shadow-2xs"
                          >
                            <img src={photo} alt={`Stitched ${pIdx + 1}`} className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Bottom Action Buttons Row */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/50 gap-1 flex-wrap">
                    {/* Left Actions: Slip Photo, Receipt, & Single Voice Note button */}
                    <div className="flex items-center gap-1 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setSlipModalOrder(order)}
                        className="px-2 py-0.5 rounded-md bg-white/90 hover:bg-white text-amber-900 border border-amber-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                      >
                        <Camera className="w-3 h-3 text-amber-800" />
                        <span>Slip</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setReceiptModalOrder(order)}
                        className="px-2 py-0.5 rounded-md bg-white/90 hover:bg-white text-teal-900 border border-teal-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                      >
                        <FileText className="w-3 h-3 text-teal-800" />
                        <span>Receipt</span>
                      </button>

                      {/* Single Voice Note Play Button */}
                      {order.voiceNoteUrl && (
                        <button
                          type="button"
                          onClick={(e) => handleToggleVoicePlay(order, e)}
                          className={`px-2 py-0.5 rounded-md border text-[11px] font-black flex items-center gap-1 cursor-pointer transition-all shadow-2xs ${
                            isVoicePlaying
                              ? 'bg-purple-600 text-white border-purple-500 shadow-md ring-2 ring-purple-300 animate-pulse'
                              : 'bg-purple-100 hover:bg-purple-200 text-purple-900 border-purple-300'
                          }`}
                          title={isVoicePlaying ? 'Pause Voice Instruction' : 'Play Voice Instruction'}
                        >
                          <Mic className={`w-3 h-3 ${isVoicePlaying ? 'text-white' : 'text-purple-800'}`} />
                          <span>{isVoicePlaying ? 'Playing...' : `Voice (${order.voiceNoteDurationSec || 12}s)`}</span>
                          {isVoicePlaying ? (
                            <Pause className="w-3 h-3 fill-current" />
                          ) : (
                            <Play className="w-3 h-3 fill-current ml-0.5" />
                          )}
                        </button>
                      )}
                    </div>

                    {/* Right Actions: WhatsApp & Phone Call */}
                    <div className="flex items-center gap-1">
                      {order.status === 'Completed' && (
                        <button
                          type="button"
                          onClick={() => handleStatusChangeRequest(order, 'Delivered')}
                          className="px-2 py-0.5 rounded-md bg-[#0B4636] hover:bg-[#073024] text-amber-300 font-black text-[11px] flex items-center gap-1 shadow-2xs cursor-pointer active:scale-95 transition-all"
                        >
                          <ShoppingBag className="w-3 h-3 stroke-[2.5]" />
                          <span>Deliver (₹{order.balanceDue})</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setExtendingOrderId(order.id);
                          setNewDueDate(order.dueDate);
                          setNewDueTime(order.dueTime || '18:00');
                        }}
                        className="p-1 rounded bg-white/90 hover:bg-white text-slate-700 border border-slate-200 cursor-pointer shadow-2xs"
                        title="Reschedule Promised Date"
                      >
                        <Calendar className="w-3 h-3" />
                      </button>

                      <a
                        href={getWhatsAppUrl(
                          order.customerPhone,
                          `Hello ${order.customerName}, update from ${shopProfile?.shopName || 'ShopScopers Tailor'} regarding your ${order.garmentType} (Order #${order.id}): Current status is "${order.status}". Balance due at pickup: ₹${order.balanceDue}.`
                        )}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-0.5 rounded-md bg-[#25D366] hover:bg-[#20bd5a] text-white font-black text-[11px] flex items-center gap-1 shadow-2xs cursor-pointer transition-all active:scale-95"
                      >
                        <Send className="w-3 h-3" />
                        <span>WhatsApp</span>
                      </a>

                      <a
                        href={`tel:${clean10DigitPhone(order.customerPhone)}`}
                        className="p-1 rounded bg-white/90 hover:bg-white text-slate-700 border border-slate-200 cursor-pointer shadow-2xs"
                        title="Call Customer Directly"
                      >
                        <Phone className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ================= MODAL 1: RESCHEDULE PROMISED DATE & TIME MODAL ================= */}
      {extendingOrderId && (() => {
        const targetOrder = orders.find((o) => o.id === extendingOrderId);
        if (!targetOrder) return null;

        const handleSaveReschedule = () => {
          onExtendDueDate(extendingOrderId, newDueDate);
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

      {/* ================= MODAL 2: RECEIPT / BILL MODAL ================= */}
      {receiptModalOrder && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Order Invoice / Receipt</h3>
                  <p className="text-[10px] text-slate-500 font-mono">#{receiptModalOrder.id}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReceiptModalOrder(null)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Receipt Body */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 font-mono text-xs space-y-3 text-slate-800">
              <div className="text-center border-b border-slate-200 pb-2">
                <div className="font-black text-sm text-slate-900">{shopProfile?.shopName || 'ShopScopers Tailor'}</div>
                <div className="text-[10px] text-slate-500">{shopProfile?.address || 'Master Boutique & Tailors'}</div>
                <div className="text-[10px] text-slate-500">Phone: {shopProfile?.phone || '+91 7608807790'}</div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Customer:</span>
                  <span className="font-bold">{receiptModalOrder.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Mobile:</span>
                  <span>{receiptModalOrder.customerPhone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Garment:</span>
                  <span className="font-bold">{receiptModalOrder.garmentType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Promised Date:</span>
                  <span className="font-bold text-[#0B4636]">{receiptModalOrder.dueDate}</span>
                </div>
              </div>

              <div className="border-t border-b border-slate-200 py-2 space-y-1">
                <div className="flex justify-between">
                  <span>Stitching Charges:</span>
                  <span className="font-bold">₹{receiptModalOrder.totalAmount}</span>
                </div>
                <div className="flex justify-between text-emerald-700">
                  <span>Advance Received:</span>
                  <span>- ₹{receiptModalOrder.advancePaid}</span>
                </div>
                <div className="flex justify-between font-black text-sm text-slate-900 pt-1 border-t border-slate-200">
                  <span>Balance Due on Delivery:</span>
                  <span className={receiptModalOrder.balanceDue > 0 ? 'text-rose-600' : 'text-emerald-600'}>
                    ₹{receiptModalOrder.balanceDue}
                  </span>
                </div>
              </div>

              <div className="text-center text-[10px] text-slate-400">
                Thank you for choosing {shopProfile?.shopName || 'ShopScopers'}!
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2">
              <a
                href={getWhatsAppUrl(
                  receiptModalOrder.customerPhone,
                  `🧾 *Receipt from ${shopProfile?.shopName || 'ShopScopers'}*\nOrder #${receiptModalOrder.id}\nGarment: ${receiptModalOrder.garmentType}\nTotal: ₹${receiptModalOrder.totalAmount}\nAdvance: ₹${receiptModalOrder.advancePaid}\nBalance Due: ₹${receiptModalOrder.balanceDue}\nPromised Date: ${receiptModalOrder.dueDate}`
                )}
                target="_blank"
                rel="noreferrer"
                className="flex-1 py-2.5 bg-[#25D366] hover:bg-[#20bd5a] text-white font-black text-xs rounded-xl flex items-center justify-center gap-1.5 shadow cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send WhatsApp Receipt</span>
              </a>

              <button
                type="button"
                onClick={() => window.print()}
                className="py-2.5 px-4 rounded-xl border border-slate-200 font-bold text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 3: SLIP PHOTO MODAL ================= */}
      {slipModalOrder && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-5 max-w-md w-full shadow-2xl border border-slate-200 space-y-3 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div>
                <h3 className="text-sm font-black text-slate-900">Order Slip / Fabric Photo</h3>
                <p className="text-[11px] text-slate-500 font-mono">#{slipModalOrder.id} • {slipModalOrder.customerName}</p>
              </div>
              <button
                type="button"
                onClick={() => setSlipModalOrder(null)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 max-h-[60vh] flex items-center justify-center">
              {slipModalOrder.receiptImageUrl || (slipModalOrder.fabricPhotos && slipModalOrder.fabricPhotos[0]) ? (
                <img
                  src={slipModalOrder.receiptImageUrl || slipModalOrder.fabricPhotos[0]}
                  alt="Order Slip"
                  className="w-full h-auto object-contain"
                />
              ) : (
                <div className="p-8 text-center text-slate-400 space-y-2">
                  <Camera className="w-8 h-8 mx-auto" />
                  <p className="text-xs">No physical slip photo was captured for this order.</p>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setSlipModalOrder(null)}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* ================= MODAL 4: ORDER COMPLETED MODAL ================= */}
      {completedModalOrder && (
        <OrderCompletedModal
          order={completedModalOrder}
          shopProfile={shopProfile}
          onClose={() => setCompletedModalOrder(null)}
          onConfirmCompleted={handleConfirmCompleted}
        />
      )}

      {/* ================= MODAL 5: ORDER DELIVERY MODAL ================= */}
      {deliveryModalOrder && (
        <OrderDeliveryModal
          order={deliveryModalOrder}
          shopProfile={shopProfile}
          onClose={() => setDeliveryModalOrder(null)}
          onConfirmDelivery={handleConfirmDeliverySettlement}
        />
      )}

      {/* ================= MODAL 6: FULL SCREEN PHOTO ZOOM MODAL ================= */}
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
