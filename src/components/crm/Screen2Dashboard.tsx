import React, { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  Bell,
  Clock,
  CheckCircle,
  CheckCircle2,
  Scissors,
  MessageSquare,
  Volume2,
  ChevronRight,
  Phone,
  AlertTriangle,
  FileText,
  UserCheck,
  Calendar,
  TrendingUp,
  DollarSign,
  Wallet,
  ArrowUpRight,
  User,
  Users,
  Check,
  X,
  Send,
  SlidersHorizontal,
  ChevronDown,
  Sparkles,
  Calendar as CalendarIcon,
  Zap,
  Sun,
  Moon,
  Copy,
  Camera,
  ShoppingBag,
  ExternalLink,
  Image as ImageIcon,
} from 'lucide-react';
import {
  TailorOrder,
  OrderStatus,
  StaffTailor,
  RevenueAnalytics,
  ShopProfile,
  PaymentMode,
} from '../../types';
import {
  generateWorkerScheduleForDays,
  getEstimatedHoursForGarment,
} from '../../lib/workerCapacity';
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
import { BrandLogo } from './BrandLogo';

interface Screen2DashboardProps {
  orders: TailorOrder[];
  tailors?: StaffTailor[];
  analytics?: RevenueAnalytics;
  shopProfile?: ShopProfile;
  onNewOrderClick: () => void;
  onSelectOrder: (order: TailorOrder) => void;
  onAssignTimelineClick: (order?: TailorOrder) => void;
  onProfileClick: () => void;
  onOverdueClick: () => void;
  onOrdersClick?: (tab?: 'all' | 'cutting' | 'stitching' | 'overdue' | 'completed' | 'archived') => void;
  onReportsClick?: () => void;
  onQuickAssignTailor?: (
    orderId: string,
    tailorName: string,
    estimatedHours?: number,
    dueDate?: string,
    dueTime?: string
  ) => void;
  onUpdateOrderStatus?: (orderId: string, status: OrderStatus) => void;
  onDeliverOrder?: (
    orderId: string,
    balancePaid: number,
    paymentMode: PaymentMode,
    stitchedPhotos: string[],
    notes?: string
  ) => void;
  userPhone?: string;
  isDesktopView?: boolean;
}

export const Screen2Dashboard: React.FC<Screen2DashboardProps> = ({
  orders,
  tailors = [],
  analytics,
  shopProfile,
  onNewOrderClick,
  onSelectOrder,
  onAssignTimelineClick,
  onProfileClick,
  onOverdueClick,
  onOrdersClick,
  onReportsClick,
  onQuickAssignTailor,
  onUpdateOrderStatus,
  onDeliverOrder,
  userPhone = '+91 91234 56789',
  isDesktopView = false,
}) => {
  const [activeTab, setActiveTab] = useState<'All' | OrderStatus>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  
  // Quick Assign Modal State
  const [assigningOrder, setAssigningOrder] = useState<TailorOrder | null>(null);
  const [selectedKarigar, setSelectedKarigar] = useState<string>('');
  const [assignEstHours, setAssignEstHours] = useState<number>(4);
  const [assignDueDate, setAssignDueDate] = useState<string>('');
  const [assignDueTime, setAssignDueTime] = useState<string>('18:00');
  const [showCustomDateTime, setShowCustomDateTime] = useState<boolean>(false);

  // Status Change Workflow Modals
  const [completedModalOrder, setCompletedModalOrder] = useState<TailorOrder | null>(null);
  const [deliveryModalOrder, setDeliveryModalOrder] = useState<TailorOrder | null>(null);
  const [expandedPhotoUrl, setExpandedPhotoUrl] = useState<string | null>(null);
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);

  // Active vs. Archived Orders
  const activeOrders = useMemo(() => orders.filter((o) => !o.isArchived), [orders]);
  const overdueOrders = useMemo(() => activeOrders.filter((o) => o.isOverdue), [activeOrders]);
  const overdueCount = overdueOrders.length;
  const cuttingCount = useMemo(() => activeOrders.filter((o) => o.status === 'New / Cutting').length, [activeOrders]);
  const stitchingCount = useMemo(() => activeOrders.filter((o) => o.status === 'Stitching in Progress' || o.status === 'Trial').length, [activeOrders]);
  const completedCount = useMemo(() => activeOrders.filter((o) => o.status === 'Completed' || o.status === 'Delivered').length, [activeOrders]);

  // Unassigned Orders (needs karigar assignment)
  const unassignedOrders = useMemo(
    () => activeOrders.filter((o) => !o.assignedTailor || o.assignedTailor === '' || o.assignedTailor === 'Unassigned'),
    [activeOrders]
  );

  // Financial & Revenue Aggregations
  const totalRevenue = useMemo(() => activeOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0), [activeOrders]);
  const totalAdvanceCollected = useMemo(() => activeOrders.reduce((sum, o) => sum + (o.advancePaid || 0), 0), [activeOrders]);
  const totalBalanceDue = useMemo(() => activeOrders.reduce((sum, o) => sum + (o.balanceDue || 0), 0), [activeOrders]);
  const collectedPercentage = totalRevenue > 0 ? Math.round((totalAdvanceCollected / totalRevenue) * 100) : 0;

  // Complete Tailors summary ensuring only Self (Owner) and tailors added by the owner are present
  const staffList = useMemo(() => {
    const list = [...(tailors || [])];
    if (!list.some((s) => s.role === 'Owner' || s.name === 'Self (Owner)' || s.name.includes('Owner'))) {
      list.unshift({
        id: 'tailor-owner',
        name: 'Self (Owner)',
        phone: '',
        role: 'Owner' as const,
        initials: 'SO',
        activeOrdersCount: 0,
      });
    }
    const mockNames = new Set(['master ramesh', 'rafiq bhai', 'suresh kumar', 'mohan lal']);
    const mockIds = new Set(['tailor-1', 'tailor-2', 'tailor-3', 'tailor-4', 't1', 't2', 't3', 't4']);
    return list.filter((s) => !mockNames.has(s.name.toLowerCase()) && !mockIds.has(s.id));
  }, [tailors]);

  // Live upcoming 8-day schedule for the selected karigar
  const selectedKarigarSchedule = useMemo(() => {
    const targetWorker = selectedKarigar || staffList[0]?.name || 'Self (Owner)';
    return generateWorkerScheduleForDays(targetWorker, activeOrders, 8);
  }, [selectedKarigar, staffList, activeOrders]);

  // Recommended earliest free slot that fits the stitching hours
  const recommendedSlot = useMemo(() => {
    if (!selectedKarigarSchedule || selectedKarigarSchedule.length === 0) return null;
    const match = selectedKarigarSchedule.find((s) => !s.isDayOff && s.freeHours >= assignEstHours);
    return match || selectedKarigarSchedule.find((s) => !s.isDayOff && s.freeHours > 0) || selectedKarigarSchedule[0];
  }, [selectedKarigarSchedule, assignEstHours]);

  // Filtered orders based on selected tab and search query
  const filteredOrders = useMemo(() => {
    return activeOrders.filter((o) => {
      const matchesTab = activeTab === 'All' ? true : o.status === activeTab;
      const matchesSearch =
        o.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.customerPhone.includes(searchQuery) ||
        o.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.garmentType.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (o.assignedTailor && o.assignedTailor.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesTab && matchesSearch;
    });
  }, [activeOrders, activeTab, searchQuery]);

  const toggleVoicePlay = (orderId: string, url: string | null) => {
    if (!url) return;
    if (playingVoiceId === orderId) {
      setPlayingVoiceId(null);
    } else {
      setPlayingVoiceId(orderId);
      const audio = new Audio(url);
      audio.play().catch(() => {});
      audio.onended = () => setPlayingVoiceId(null);
    }
  };

  const handleOpenAssignModal = (order: TailorOrder) => {
    setAssigningOrder(order);
    const initialKarigar =
      order.assignedTailor && order.assignedTailor !== 'Unassigned'
        ? order.assignedTailor
        : staffList[0]?.name || 'Self (Owner)';
    setSelectedKarigar(initialKarigar);
    const est = order.estimatedHours || getEstimatedHoursForGarment(order.garmentType, order.orderCategory);
    setAssignEstHours(est);
    
    // Calculate best free slot
    const sched = generateWorkerScheduleForDays(initialKarigar, activeOrders, 8);
    const best = sched.find((s) => !s.isDayOff && s.freeHours >= est) || sched.find((s) => !s.isDayOff) || sched[0];
    const initialDate = order.dueDate || (best ? best.dateStr : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    setAssignDueDate(initialDate);
    setAssignDueTime(order.dueTime || '18:00');
    setShowCustomDateTime(false);
  };

  const handleConfirmQuickAssign = () => {
    if (!assigningOrder || !selectedKarigar) return;
    if (onQuickAssignTailor) {
      onQuickAssignTailor(
        assigningOrder.id,
        selectedKarigar,
        assignEstHours,
        assignDueDate,
        assignDueTime
      );
    }
    // If assigned date is today or assigned, update status accordingly
    const todayStr = new Date().toISOString().split('T')[0];
    const nextStatus: OrderStatus = assignDueDate === todayStr ? 'Stitching in Progress' : 'Assigned';
    if (onUpdateOrderStatus) {
      onUpdateOrderStatus(assigningOrder.id, nextStatus);
    }
    setAssigningOrder(null);
  };

  const handleCardStatusChangeRequest = (order: TailorOrder, targetStatus: OrderStatus) => {
    if (targetStatus === 'Assigned') {
      handleOpenAssignModal(order);
    } else if (targetStatus === 'Completed') {
      setCompletedModalOrder(order);
    } else if (targetStatus === 'Delivered') {
      setDeliveryModalOrder(order);
    } else {
      if (onUpdateOrderStatus) {
        onUpdateOrderStatus(order.id, targetStatus);
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
    } else if (onUpdateOrderStatus) {
      onUpdateOrderStatus(orderId, 'Delivered');
    }
    setDeliveryModalOrder(null);
  };

  const handleConfirmCompleted = (orderId: string) => {
    if (onUpdateOrderStatus) {
      onUpdateOrderStatus(orderId, 'Completed');
    }
    setCompletedModalOrder(null);
  };

  const handleCopyOrderId = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedOrderId(id);
    setTimeout(() => setCopiedOrderId(null), 2000);
  };

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
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
            <CheckCircle2 className="w-3.5 h-3.5 text-[#0B4636]" />
            <span>5. Delivered & Settled</span>
          </span>
        );
    }
  };

  return (
    <div className={`min-h-full bg-[#F8F9FA] text-slate-900 font-sans ${isDesktopView ? 'p-6' : 'pb-24'}`}>
      {/* Mobile Top Header */}
      {!isDesktopView && (
        <div className="bg-[#0B4636] text-white px-3.5 py-3 sticky top-0 z-30 shadow-md">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <BrandLogo size="sm" variant="glass" />
              <div className="min-w-0">
                <h1 className="text-sm sm:text-base font-black tracking-tight leading-tight truncate">
                  {shopProfile?.shopName || 'SilaiHub CRM'}
                </h1>
                <p className="text-[10px] text-amber-300 font-bold tracking-wide uppercase truncate">
                  Live Orders & Karigar Hub
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => (onOrdersClick ? onOrdersClick('overdue') : onOverdueClick())}
                className="relative p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-all text-white cursor-pointer active:scale-95"
                title="Orders & Overdue Alerts"
              >
                <Bell className="w-4 h-4" />
                {overdueCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white rounded-full text-[9px] font-black flex items-center justify-center border border-[#0B4636]">
                    {overdueCount}
                  </span>
                )}
              </button>

              <button
                onClick={onNewOrderClick}
                className="bg-amber-400 hover:bg-amber-300 text-[#0B4636] px-3 py-2 rounded-xl text-xs font-black flex items-center gap-1 shadow cursor-pointer active:scale-95 transition-all"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span className="font-black">+ Order</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={`space-y-4 ${isDesktopView ? 'w-full max-w-none' : 'p-3 max-w-3xl mx-auto'}`}>
        
        {/* ================= 1. REVENUE & FINANCIAL SUMMARY CARD ================= */}
        <div className="bg-gradient-to-br from-[#0B4636] via-[#0D5744] to-[#073024] text-white rounded-3xl p-4 sm:p-5 shadow-lg border border-emerald-800/40 relative overflow-hidden space-y-3">
          {/* Header row with shortcut to full reports */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-400/20 text-amber-300 flex items-center justify-center border border-amber-400/30">
                <TrendingUp className="w-4 h-4 text-amber-300" />
              </div>
              <div>
                <h2 className="text-xs font-black tracking-wider uppercase text-amber-300">Shop Revenue & Cashflow</h2>
                <p className="text-[11px] text-emerald-100">Live active ledger summary</p>
              </div>
            </div>

            {onReportsClick && (
              <button
                onClick={onReportsClick}
                className="text-[11px] font-extrabold text-amber-300 bg-white/10 hover:bg-white/20 border border-amber-300/30 px-3 py-1.5 rounded-xl flex items-center gap-1 transition-all cursor-pointer"
              >
                <span>Full Reports</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* 3 Major Financial KPIs */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 pt-1">
            <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-2.5 sm:p-3 border border-white/10">
              <div className="text-[10px] font-bold text-emerald-200">Total Booked</div>
              <div className="text-base sm:text-xl font-black text-white mt-0.5 truncate">₹{totalRevenue.toLocaleString()}</div>
              <div className="text-[9px] text-amber-300 font-medium mt-0.5">{activeOrders.length} active orders</div>
            </div>

            <div className="bg-emerald-500/20 rounded-2xl p-2.5 sm:p-3 border border-emerald-400/30">
              <div className="text-[10px] font-bold text-emerald-200">Advance Collected</div>
              <div className="text-base sm:text-xl font-black text-emerald-300 mt-0.5 truncate">₹{totalAdvanceCollected.toLocaleString()}</div>
              <div className="text-[9px] text-emerald-200 font-medium mt-0.5">{collectedPercentage}% recovered</div>
            </div>

            <div className="bg-rose-500/20 rounded-2xl p-2.5 sm:p-3 border border-rose-400/30">
              <div className="text-[10px] font-bold text-rose-200">Pending Balance</div>
              <div className="text-base sm:text-xl font-black text-rose-300 mt-0.5 truncate">₹{totalBalanceDue.toLocaleString()}</div>
              <div className="text-[9px] text-rose-200 font-medium mt-0.5">To collect on delivery</div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-emerald-200 font-bold">
              <span>Collection Health</span>
              <span>{collectedPercentage}% Cash In-Hand</span>
            </div>
            <div className="w-full h-2 bg-black/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-400 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(5, collectedPercentage))}%` }}
              />
            </div>
          </div>
        </div>

        {/* ================= 2. WORKER CAPACITY & QUICK ASSIGN HUB ================= */}
        <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-[#0B4636]/10 text-[#0B4636] flex items-center justify-center">
                <Scissors className="w-4 h-4 text-[#0B4636]" />
              </div>
              <div>
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Worker Capacity & Assignments</h3>
                <p className="text-[10px] text-slate-500">Live Karigar queue & workloads</p>
              </div>
            </div>

            <button
              onClick={() => onAssignTimelineClick()}
              className="text-[11px] font-extrabold text-[#0B4636] hover:text-[#073024] bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl flex items-center gap-1 border border-emerald-200 transition-all cursor-pointer"
            >
              <span>Assign Timeline</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Unassigned Orders Warning Banner if any */}
          {unassignedOrders.length > 0 && (
            <div className="bg-amber-50 border border-amber-300 rounded-2xl p-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-amber-400 text-[#0B4636] font-black flex items-center justify-center text-xs shrink-0">
                  {unassignedOrders.length}
                </div>
                <div>
                  <div className="text-xs font-black text-amber-950">
                    {unassignedOrders.length} Order{unassignedOrders.length > 1 ? 's' : ''} Need Tailor Assignment
                  </div>
                  <div className="text-[10px] text-amber-800">Assign karigars to avoid delivery delays.</div>
                </div>
              </div>

              <button
                onClick={() => handleOpenAssignModal(unassignedOrders[0])}
                className="bg-[#0B4636] text-amber-300 px-3 py-1.5 rounded-xl font-black text-xs shrink-0 shadow-sm cursor-pointer hover:bg-[#073024]"
              >
                Assign #{unassignedOrders[0]?.id}
              </button>
            </div>
          )}

          {/* Staff Karigars Capacity Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {staffList.map((staff) => {
              // Count orders assigned to this staff
              const staffOrdersCount = activeOrders.filter((o) => o.assignedTailor === staff.name).length;
              const isOverloaded = staffOrdersCount >= 4;

              return (
                <div
                  key={staff.id}
                  onClick={() => onAssignTimelineClick()}
                  className="bg-slate-50 hover:bg-slate-100/80 p-2.5 rounded-2xl border border-slate-200 transition-all cursor-pointer space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-6 h-6 rounded-full bg-[#0B4636] text-amber-300 text-[10px] font-black flex items-center justify-center">
                      {staff.name[0]}
                    </div>
                    <span
                      className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${
                        isOverloaded
                          ? 'bg-rose-100 text-rose-800'
                          : staffOrdersCount > 0
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {staffOrdersCount} Active
                    </span>
                  </div>

                  <div className="text-xs font-black text-slate-800 truncate">{staff.name}</div>
                  <div className="text-[10px] text-slate-500 font-medium">
                    {staff.role} • {staffOrdersCount > 2 ? 'High Load' : staffOrdersCount > 0 ? 'Normal' : 'Available'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Urgent Overdue Alert Bar if any */}
        {overdueCount > 0 && (
          <div
            onClick={() => (onOrdersClick ? onOrdersClick('overdue') : onOverdueClick())}
            className="bg-rose-50 border border-rose-200 p-3.5 rounded-3xl flex items-center justify-between cursor-pointer hover:bg-rose-100 transition-all shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                <AlertTriangle className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="text-xs font-black text-rose-900">
                  {overdueCount} Order{overdueCount > 1 ? 's' : ''} Overdue for Delivery!
                </h3>
                <p className="text-[11px] text-rose-700">Tap to send 1-tap WhatsApp reminders or change dates.</p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs font-black text-rose-800">
              <span>View</span>
              <ChevronRight className="w-4 h-4 text-rose-600" />
            </div>
          </div>
        )}

        {/* ================= 3. PIPELINE STATUS PILLS & SEARCH ================= */}
        <div className="bg-white rounded-3xl p-3 sm:p-4 border border-slate-200 shadow-sm space-y-3">
          {/* Segmented Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 text-xs font-extrabold">
            <button
              onClick={() => setActiveTab('All')}
              className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'All'
                  ? 'bg-[#0B4636] text-amber-300 shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>All ({activeOrders.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('New / Cutting')}
              className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'New / Cutting'
                  ? 'bg-[#0B4636] text-amber-300 shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>Cutting ({cuttingCount})</span>
            </button>

            <button
              onClick={() => setActiveTab('Stitching in Progress')}
              className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'Stitching in Progress'
                  ? 'bg-[#0B4636] text-amber-300 shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>Stitching ({stitchingCount})</span>
            </button>

            <button
              onClick={() => setActiveTab('Completed')}
              className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'Completed'
                  ? 'bg-[#0B4636] text-amber-300 shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>Completed ({completedCount})</span>
            </button>

            {onOrdersClick && (
              <button
                onClick={() => onOrdersClick('all')}
                className="px-3 py-1.5 rounded-xl whitespace-nowrap text-slate-500 hover:text-slate-800 transition-all cursor-pointer flex items-center gap-1 ml-auto"
              >
                <span>Orders Hub</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search order #, customer name, phone, garment, tailor..."
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-2.5 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#0B4636] focus:bg-white transition-all shadow-2xs"
            />
          </div>
        </div>

        {/* ================= 4. DETAILED ORDER CARDS LIST ================= */}
        <div className="space-y-3">
          {filteredOrders.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 text-center border border-slate-200 shadow-sm space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-black text-slate-800">No matching orders found</h3>
              <p className="text-xs text-slate-500">Try adjusting your search query or pipeline filter.</p>
              <button
                onClick={onNewOrderClick}
                className="mt-2 px-4 py-2 bg-[#0B4636] text-amber-300 rounded-xl text-xs font-black shadow cursor-pointer inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>+ Create New Order</span>
              </button>
            </div>
          ) : (
            filteredOrders.map((order) => {
              const isVoicePlaying = playingVoiceId === order.id;
              const hasStitchedPhotos = order.stitchedPhotos && order.stitchedPhotos.length > 0;

              return (
                <div
                  key={order.id}
                  className={`bg-white rounded-3xl p-4 sm:p-5 border transition-all space-y-3.5 shadow-sm hover:shadow-md ${
                    order.isOverdue
                      ? 'border-rose-300 ring-1 ring-rose-200'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {/* Top Row: Order ID (Copyable), Category, Repeat Badge, Due Pill, and Financial Status */}
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

                      {order.orderCategory && (
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-slate-100 text-slate-700 border border-slate-200">
                          {order.orderCategory}
                        </span>
                      )}

                      {order.isRepeatCustomer && (
                        <span className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 text-[10px] font-black border border-emerald-200 flex items-center gap-1">
                          <UserCheck className="w-3 h-3" />
                          Repeat
                        </span>
                      )}

                      {order.isOverdue ? (
                        <span className="px-2 py-0.5 rounded-lg bg-rose-100 text-rose-800 text-[10px] font-black border border-rose-300 flex items-center gap-1">
                          🔥 {order.daysOverdue}d Overdue
                        </span>
                      ) : order.dueDate === new Date().toISOString().split('T')[0] ? (
                        <span className="px-2 py-0.5 rounded-lg bg-amber-100 text-amber-900 text-[10px] font-black border border-amber-300 flex items-center gap-1">
                          ⚡ Due Today
                        </span>
                      ) : null}
                    </div>

                    {/* Financial Breakdown Pill */}
                    <div className="flex items-center gap-2">
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
                  </div>

                  {/* Main Garment & Customer Details */}
                  <div className="flex items-center gap-3">
                    <div
                      onClick={() => onSelectOrder(order)}
                      className="w-16 h-16 rounded-2xl bg-emerald-900/5 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity relative group"
                    >
                      {hasStitchedPhotos && order.stitchedPhotos ? (
                        <img
                          src={order.stitchedPhotos[0]}
                          alt="Stitched dress"
                          className="w-full h-full object-cover"
                        />
                      ) : order.fabricPhotos && order.fabricPhotos[0] ? (
                        <img
                          src={order.fabricPhotos[0]}
                          alt={order.garmentType}
                          className="w-full h-full object-cover"
                        />
                      ) : order.receiptImageUrl ? (
                        <img src={order.receiptImageUrl} alt="Receipt" className="w-full h-full object-cover" />
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
                      <h4 className="text-sm font-black text-slate-900 truncate hover:text-[#0B4636] cursor-pointer">
                        {order.customerName}
                      </h4>
                      <p className="text-xs font-semibold text-slate-500 truncate">{order.customerPhone}</p>
                      <p className="text-xs font-black text-[#0B4636] mt-0.5 truncate">
                        {order.garmentType}{' '}
                        {order.subTypeStyle && <span className="font-medium text-slate-500">({order.subTypeStyle})</span>}
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
                        <span className="text-[10px] font-bold text-emerald-700">Click photo to zoom</span>
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

                  {/* Assigned Karigar / In-Progress Stitching Strip */}
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

                        {/* Quick Assign / Change Button */}
                        {!isDelivered && (
                          <button
                            type="button"
                            onClick={() => handleOpenAssignModal(order)}
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

                  {/* Special Note (if present) */}
                  {order.specialNotes && (
                    <div className="p-2.5 rounded-2xl bg-amber-50/70 border border-amber-200/80 flex items-center justify-between text-xs gap-2">
                      <p className="text-[11px] text-amber-900 line-clamp-1 flex-1">
                        <span className="font-bold text-amber-950">Note: </span>
                        {order.specialNotes}
                      </p>
                    </div>
                  )}

                  {/* 5-Stage Interactive Status Pipeline Tracker with Voice Note, Measurement & Receipt Actions */}
                  <OrderStatusTracker
                    order={order}
                    onStatusChangeRequest={handleCardStatusChangeRequest}
                    onToggleVoicePlay={(ord) => toggleVoicePlay(ord.id, ord.voiceNoteUrl)}
                    isVoicePlaying={playingVoiceId === order.id}
                    shopProfile={shopProfile}
                  />

                  {/* Action Buttons Footer - Google-Grade Streamlined for 30-50+ Non-Tech Users */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-xs flex-wrap">
                    {/* Direct Contact Buttons (Instant Call & WhatsApp) */}
                    <div className="flex items-center gap-1.5">
                      <a
                        href={getWhatsAppUrl(
                          order.customerPhone,
                          `Hello ${order.customerName}, update from ${shopProfile?.shopName || 'Royal Tailors'} regarding your ${order.garmentType} (Order #${order.id}): Current status is "${order.status}". Balance due at pickup: ₹${order.balanceDue}.`
                        )}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-1.5 shadow-sm cursor-pointer transition-all active:scale-95"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>WhatsApp</span>
                      </a>

                      <a
                        href={`tel:${clean10DigitPhone(order.customerPhone)}`}
                        className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 flex items-center justify-center cursor-pointer border border-slate-200"
                        title="Call Customer Directly"
                      >
                        <Phone className="w-4 h-4 text-slate-700" />
                      </a>
                    </div>

                    {/* Prominent Contextual Stage Action Button */}
                    <div className="flex items-center gap-1.5 ml-auto">
                      {order.status === 'New / Cutting' && (
                        <button
                          type="button"
                          onClick={() => handleOpenAssignModal(order)}
                          className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-sm cursor-pointer active:scale-95 transition-all"
                        >
                          <Scissors className="w-4 h-4 stroke-[2.5]" />
                          <span>Assign Karigar</span>
                        </button>
                      )}

                      {(order.status === 'Assigned' || order.status === 'Stitching in Progress' || order.status === 'Trial') && (
                        <button
                          type="button"
                          onClick={() => handleCardStatusChangeRequest(order, 'Completed')}
                          className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-1.5 shadow-sm cursor-pointer active:scale-95 transition-all"
                        >
                          <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                          <span>Ready for Pickup</span>
                        </button>
                      )}

                      {order.status === 'Completed' && (
                        <button
                          type="button"
                          onClick={() => handleCardStatusChangeRequest(order, 'Delivered')}
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

                      <button
                        type="button"
                        onClick={() => onSelectOrder(order)}
                        className="px-2.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1 cursor-pointer transition-all"
                        title="View Complete Order Details"
                      >
                        <span>Details</span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ================= INLINE QUICK ASSIGN MODAL ================= */}
      {assigningOrder && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl p-5 sm:p-6 max-w-lg w-full shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in duration-150 my-auto max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-[#0B4636] text-amber-300 flex items-center justify-center font-black shadow">
                  <Scissors className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                    <span>Assign Order #{assigningOrder.id}</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 font-semibold">
                    {assigningOrder.customerName} • <strong className="text-slate-800">{assigningOrder.garmentType}</strong>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setAssigningOrder(null)}
                className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Step 1: Select Karigar / Tailor */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-[#0B4636]" />
                  <span>1. Select Karigar / Tailor ({staffList.length} Available):</span>
                </label>
                <span className="text-[10px] text-[#0B4636] font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  8h shift capacity
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {staffList.map((staff) => {
                  const staffOrdersCount = activeOrders.filter((o) => {
                    if (staff.role === 'Owner' || staff.name.includes('Owner') || staff.name.includes('Self')) {
                      return (
                        o.assignedTailor === staff.name ||
                        o.assignedTailor === 'Self (Owner)' ||
                        o.assignedTailor === 'Owner'
                      );
                    }
                    return o.assignedTailor === staff.name;
                  }).length;
                  const isSelected = selectedKarigar === staff.name;

                  // Today's free hours for this worker
                  const staffSched = generateWorkerScheduleForDays(staff.name, activeOrders, 1);
                  const todayFree = staffSched[0]?.freeHours ?? 8;

                  return (
                    <button
                      key={staff.id}
                      type="button"
                      onClick={() => {
                        setSelectedKarigar(staff.name);
                        // Auto-adjust date if slot fits
                        const sched = generateWorkerScheduleForDays(staff.name, activeOrders, 8);
                        const match = sched.find((s) => !s.isDayOff && s.freeHours >= assignEstHours) || sched.find((s) => !s.isDayOff) || sched[0];
                        if (match) {
                          setAssignDueDate(match.dateStr);
                        }
                      }}
                      className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer space-y-1.5 relative overflow-hidden ${
                        isSelected
                          ? 'bg-[#0B4636] text-white border-[#0B4636] shadow-md ring-2 ring-amber-300'
                          : 'bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <div
                            className={`w-6 h-6 rounded-lg text-[10px] font-black flex items-center justify-center shrink-0 ${
                              isSelected ? 'bg-amber-400 text-[#0B4636]' : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {staff.initials || staff.name.slice(0, 2).toUpperCase()}
                          </div>
                          <span className="text-xs font-black truncate">{staff.name}</span>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-amber-300 shrink-0" />}
                      </div>

                      <div className="flex items-center justify-between text-[10px]">
                        <span className={isSelected ? 'text-emerald-200 font-medium' : 'text-slate-500'}>
                          {staffOrdersCount} Active
                        </span>
                        <span
                          className={`font-black px-1.5 py-0.2 rounded text-[9px] ${
                            isSelected
                              ? 'bg-emerald-900/60 text-emerald-200'
                              : todayFree > 3
                              ? 'bg-emerald-100 text-emerald-800'
                              : todayFree > 0
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {todayFree}h Free Today
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Live Free Dates & Clickable Time Slots */}
            <div className="space-y-2 pt-1 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                  <CalendarIcon className="w-3.5 h-3.5 text-[#0B4636]" />
                  <span>2. Free Dates & Clickable Time Slots for {selectedKarigar}:</span>
                </label>
                <span className="text-[10px] text-slate-500 font-bold">
                  Click slot to select
                </span>
              </div>

              {/* Recommended Best Slot Banner */}
              {recommendedSlot && !recommendedSlot.isDayOff && (
                <div className="p-2.5 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                    <div className="text-xs leading-tight min-w-0">
                      <span className="font-black text-amber-900 block truncate">
                        Recommended: {recommendedSlot.dayLabel} ({recommendedSlot.formattedDate})
                      </span>
                      <span className="text-[10px] text-amber-700 font-medium">
                        {recommendedSlot.freeHours}h free • Easily fits {assignEstHours}h stitching
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setAssignDueDate(recommendedSlot.dateStr);
                      setAssignDueTime('18:00');
                    }}
                    className={`px-2.5 py-1 rounded-xl text-[10px] font-black shrink-0 transition-all cursor-pointer ${
                      assignDueDate === recommendedSlot.dateStr
                        ? 'bg-[#0B4636] text-amber-300'
                        : 'bg-amber-400 text-[#0B4636] hover:bg-amber-300 shadow-xs'
                    }`}
                  >
                    {assignDueDate === recommendedSlot.dateStr ? '✓ Selected' : '⚡ Pick Slot'}
                  </button>
                </div>
              )}

              {/* Upcoming 8-Day Schedule Grid with Clickable Slots */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {selectedKarigarSchedule.map((slot, idx) => {
                  const isDateSelected = assignDueDate === slot.dateStr;
                  const isToday = idx === 0;
                  const fitsOrder = !slot.isDayOff && slot.freeHours >= assignEstHours;
                  const isTight = !slot.isDayOff && slot.freeHours > 0 && slot.freeHours < assignEstHours;

                  return (
                    <div
                      key={slot.dateStr}
                      onClick={() => {
                        if (!slot.isDayOff) {
                          setAssignDueDate(slot.dateStr);
                        }
                      }}
                      className={`p-2 rounded-2xl border transition-all text-left space-y-1.5 flex flex-col justify-between cursor-pointer ${
                        isDateSelected
                          ? 'bg-[#0B4636] text-white border-[#0B4636] shadow-md ring-2 ring-amber-300 scale-[1.02]'
                          : slot.isDayOff
                          ? 'bg-slate-100 border-slate-200 opacity-60 text-slate-400 cursor-not-allowed'
                          : slot.isFullyBooked
                          ? 'bg-rose-50 border-rose-200 text-rose-900'
                          : fitsOrder
                          ? 'bg-emerald-50/50 border-emerald-200 text-slate-800 hover:border-[#0B4636]'
                          : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-[11px] font-black ${
                              isDateSelected
                                ? 'text-amber-300'
                                : isToday
                                ? 'text-[#0B4636]'
                                : 'text-slate-700'
                            }`}
                          >
                            {isToday ? 'Today' : slot.dayLabel}
                          </span>
                          <span className={`text-[10px] font-bold ${isDateSelected ? 'text-emerald-200' : 'text-slate-500'}`}>
                            {slot.formattedDate}
                          </span>
                        </div>

                        {/* Free Hours indicator */}
                        <div className="mt-1 flex items-center justify-between text-[10px]">
                          {slot.isDayOff ? (
                            <span className="font-bold text-slate-400">Sunday Off</span>
                          ) : (
                            <span
                              className={`font-black ${
                                isDateSelected
                                  ? 'text-emerald-200'
                                  : fitsOrder
                                  ? 'text-emerald-700'
                                  : isTight
                                  ? 'text-amber-700'
                                  : 'text-rose-600'
                              }`}
                            >
                              {slot.freeHours}h Free
                            </span>
                          )}
                          <span className={`text-[9px] ${isDateSelected ? 'text-slate-300' : 'text-slate-400'}`}>
                            {slot.bookedHours > 0 ? `${slot.bookedHours}h booked` : 'Open'}
                          </span>
                        </div>

                        {/* Mini capacity bar */}
                        {!slot.isDayOff && (
                          <div className="w-full bg-slate-200/60 rounded-full h-1.5 overflow-hidden mt-1">
                            <div
                              className={`h-full rounded-full transition-all ${
                                isDateSelected
                                  ? 'bg-amber-300'
                                  : fitsOrder
                                  ? 'bg-emerald-500'
                                  : isTight
                                  ? 'bg-amber-500'
                                  : 'bg-rose-500'
                              }`}
                              style={{ width: `${Math.min(100, (slot.bookedHours / 8) * 100)}%` }}
                            />
                          </div>
                        )}
                      </div>

                      {/* Clickable Time Slots for this day */}
                      {!slot.isDayOff && (
                        <div className="grid grid-cols-2 gap-1 pt-1 border-t border-slate-200/40" onClick={(e) => e.stopPropagation()}>
                          {[
                            { label: '10 AM', time: '10:00' },
                            { label: '2 PM', time: '14:00' },
                            { label: '6 PM', time: '18:00' },
                            { label: '8 PM', time: '20:00' },
                          ].map((t) => {
                            const isThisSlotActive = isDateSelected && assignDueTime === t.time;
                            return (
                              <button
                                key={t.time}
                                type="button"
                                onClick={() => {
                                  setAssignDueDate(slot.dateStr);
                                  setAssignDueTime(t.time);
                                }}
                                className={`py-0.5 px-1 rounded-lg text-[9px] font-black text-center transition-all cursor-pointer ${
                                  isThisSlotActive
                                    ? 'bg-amber-300 text-[#0B4636] shadow-xs ring-1 ring-[#0B4636]'
                                    : isDateSelected
                                    ? 'bg-white/20 hover:bg-white/30 text-white'
                                    : 'bg-white hover:bg-emerald-100 text-slate-700 border border-slate-200/80 shadow-xs'
                                }`}
                              >
                                {t.label}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Promised Date & Time Component */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <PromisedDateTimeInput
                  date={assignDueDate}
                  time={assignDueTime}
                  onDateChange={(d) => setAssignDueDate(d)}
                  onTimeChange={(t) => setAssignDueTime(t)}
                  showPresets={true}
                  showStatusBanner={false}
                  label="Promised Date & Time"
                />
              </div>
            </div>

            {/* Step 3: Estimated Stitching Hours */}
            <div className="space-y-1.5 pt-1 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#0B4636]" />
                  <span>3. Estimated Stitching Effort:</span>
                </label>
                <span className="text-xs font-black text-[#0B4636] bg-emerald-100/60 px-2 py-0.5 rounded-lg border border-emerald-200">
                  {assignEstHours} Hours
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="12"
                step="0.5"
                value={assignEstHours}
                onChange={(e) => setAssignEstHours(parseFloat(e.target.value))}
                className="w-full accent-[#0B4636] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                <span onClick={() => setAssignEstHours(1.5)} className="hover:text-slate-700 cursor-pointer">1.5h (Alteration)</span>
                <span onClick={() => setAssignEstHours(3)} className="hover:text-slate-700 cursor-pointer">3h (Shirt)</span>
                <span onClick={() => setAssignEstHours(4)} className="hover:text-slate-700 cursor-pointer">4h (Kurta/Suit)</span>
                <span onClick={() => setAssignEstHours(8)} className="hover:text-slate-700 cursor-pointer">8h (Heavy/Lehenga)</span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setAssigningOrder(null)}
                className="py-2.5 px-4 rounded-xl border border-slate-200 font-bold text-xs text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmQuickAssign}
                className="flex-1 py-2.5 rounded-xl bg-[#0B4636] hover:bg-[#073024] font-black text-xs text-amber-300 shadow-md cursor-pointer flex items-center justify-center gap-1.5 transition-all active:scale-98"
              >
                <Check className="w-4 h-4 text-amber-300" />
                <span>Assign to {selectedKarigar} ({assignDueDate})</span>
              </button>
            </div>
          </div>
        </div>
      )}

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
