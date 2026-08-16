import React, { useState, useMemo, useRef, useEffect } from 'react';
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
  MoreVertical,
  Printer,
  Edit,
  Share2,
  CheckCheck,
  RotateCcw,
  Layers,
  ArrowRight,
  Mic,
  Play,
  Pause,
  Headphones,
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
  onAddTailor?: (tailor: { name: string; phone: string; role: 'Master Tailor' | 'Cutting Master' | 'Stitching Karigar' | 'Helper / Finisher' }) => void;
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
  onAddTailor,
  userPhone = '+91 7608807790',
  isDesktopView = false,
}) => {
  const [activeTab, setActiveTab] = useState<'All' | 'Cutting' | 'Stitching' | 'Completed' | 'Alteration'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSort, setSelectedSort] = useState<'latest' | 'due_earliest' | 'total_high' | 'balance_high'>('latest');
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [selectedPaymentFilter, setSelectedPaymentFilter] = useState<'all' | 'paid' | 'due'>('all');
  const [selectedWorkerFilter, setSelectedWorkerFilter] = useState<string>('all');
  
  // Modals
  const [assigningOrder, setAssigningOrder] = useState<TailorOrder | null>(null);
  const [selectedKarigar, setSelectedKarigar] = useState<string>('');
  const [assignEstHours, setAssignEstHours] = useState<number>(4);
  const [assignDueDate, setAssignDueDate] = useState<string>('');
  const [assignDueTime, setAssignDueTime] = useState<string>('18:00');
  
  const [completedModalOrder, setCompletedModalOrder] = useState<TailorOrder | null>(null);
  const [deliveryModalOrder, setDeliveryModalOrder] = useState<TailorOrder | null>(null);
  const [receiptModalOrder, setReceiptModalOrder] = useState<TailorOrder | null>(null);
  const [slipModalOrder, setSlipModalOrder] = useState<TailorOrder | null>(null);
  const [expandedPhotoUrl, setExpandedPhotoUrl] = useState<string | null>(null);
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);
  const [openCardMenuId, setOpenCardMenuId] = useState<string | null>(null);
  
  // Voice Note Playback State for Cards
  const [playingVoiceOrderId, setPlayingVoiceOrderId] = useState<string | null>(null);
  const audioPlaybackRef = useRef<HTMLAudioElement | null>(null);

  // Add Worker Modal
  const [showAddWorkerModal, setShowAddWorkerModal] = useState(false);
  const [newWorkerName, setNewWorkerName] = useState('');
  const [newWorkerPhone, setNewWorkerPhone] = useState('');
  const [newWorkerRole, setNewWorkerRole] = useState<'Master Tailor' | 'Cutting Master' | 'Stitching Karigar' | 'Helper / Finisher'>('Stitching Karigar');

  // Active vs. Archived Orders
  const activeOrders = useMemo(() => orders.filter((o) => !o.isArchived), [orders]);
  const overdueOrders = useMemo(() => activeOrders.filter((o) => o.isOverdue), [activeOrders]);
  const overdueCount = overdueOrders.length;
  
  const cuttingCount = useMemo(() => activeOrders.filter((o) => o.status === 'New / Cutting').length, [activeOrders]);
  const stitchingCount = useMemo(() => activeOrders.filter((o) => o.status === 'Stitching in Progress' || o.status === 'Trial' || o.status === 'Assigned').length, [activeOrders]);
  const completedCount = useMemo(() => activeOrders.filter((o) => o.status === 'Completed' || o.status === 'Delivered').length, [activeOrders]);
  const alterationCount = useMemo(() => activeOrders.filter((o) => o.orderCategory === 'Alteration' || o.orderCategory === 'Repair' || (o.garmentType && o.garmentType.toLowerCase().includes('alter'))).length, [activeOrders]);

  // Unassigned Orders
  const unassignedOrders = useMemo(
    () => activeOrders.filter((o) => !o.assignedTailor || o.assignedTailor === '' || o.assignedTailor === 'Unassigned' || o.assignedTailor === 'Not Assigned'),
    [activeOrders]
  );

  // Financial & Revenue Aggregations
  const totalRevenue = useMemo(() => activeOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0), [activeOrders]);
  const totalAdvanceCollected = useMemo(() => activeOrders.reduce((sum, o) => sum + (o.advancePaid || 0), 0), [activeOrders]);
  const totalBalanceDue = useMemo(() => activeOrders.reduce((sum, o) => sum + (o.balanceDue || 0), 0), [activeOrders]);
  const collectedPercentage = totalRevenue > 0 ? Math.round((totalAdvanceCollected / totalRevenue) * 100) : 0;

  // Staff list
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

  // Selected karigar schedule
  const selectedKarigarSchedule = useMemo(() => {
    const targetWorker = selectedKarigar || staffList[0]?.name || 'Self (Owner)';
    return generateWorkerScheduleForDays(targetWorker, activeOrders, 8);
  }, [selectedKarigar, staffList, activeOrders]);

  const recommendedSlot = useMemo(() => {
    if (!selectedKarigarSchedule || selectedKarigarSchedule.length === 0) return null;
    const match = selectedKarigarSchedule.find((s) => !s.isDayOff && s.freeHours >= assignEstHours);
    return match || selectedKarigarSchedule.find((s) => !s.isDayOff && s.freeHours > 0) || selectedKarigarSchedule[0];
  }, [selectedKarigarSchedule, assignEstHours]);

  // Filter & Sort Logic
  const filteredOrders = useMemo(() => {
    let result = activeOrders.filter((o) => {
      // Tab filter
      let matchesTab = true;
      if (activeTab === 'Cutting') {
        matchesTab = o.status === 'New / Cutting';
      } else if (activeTab === 'Stitching') {
        matchesTab = o.status === 'Stitching in Progress' || o.status === 'Trial' || o.status === 'Assigned';
      } else if (activeTab === 'Completed') {
        matchesTab = o.status === 'Completed' || o.status === 'Delivered';
      } else if (activeTab === 'Alteration') {
        matchesTab = o.orderCategory === 'Alteration' || o.orderCategory === 'Repair' || (o.garmentType && o.garmentType.toLowerCase().includes('alter'));
      }

      // Search Query
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        o.customerName.toLowerCase().includes(q) ||
        o.customerPhone.includes(q) ||
        o.id.toLowerCase().includes(q) ||
        o.garmentType.toLowerCase().includes(q) ||
        (o.assignedTailor && o.assignedTailor.toLowerCase().includes(q)) ||
        (o.orderCategory && o.orderCategory.toLowerCase().includes(q));

      // Payment filter
      let matchesPayment = true;
      if (selectedPaymentFilter === 'paid') {
        matchesPayment = o.balanceDue === 0;
      } else if (selectedPaymentFilter === 'due') {
        matchesPayment = o.balanceDue > 0;
      }

      // Worker filter
      let matchesWorker = true;
      if (selectedWorkerFilter !== 'all') {
        matchesWorker = o.assignedTailor === selectedWorkerFilter;
      }

      return matchesTab && matchesSearch && matchesPayment && matchesWorker;
    });

    // Sorting
    result.sort((a, b) => {
      if (selectedSort === 'latest') {
        return new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime();
      } else if (selectedSort === 'due_earliest') {
        return new Date(a.dueDate || '').getTime() - new Date(b.dueDate || '').getTime();
      } else if (selectedSort === 'total_high') {
        return (b.totalAmount || 0) - (a.totalAmount || 0);
      } else if (selectedSort === 'balance_high') {
        return (b.balanceDue || 0) - (a.balanceDue || 0);
      }
      return 0;
    });

    return result;
  }, [activeOrders, activeTab, searchQuery, selectedPaymentFilter, selectedWorkerFilter, selectedSort]);

  const handleOpenAssignModal = (order: TailorOrder) => {
    setAssigningOrder(order);
    const initialKarigar =
      order.assignedTailor && order.assignedTailor !== 'Unassigned'
        ? order.assignedTailor
        : staffList[0]?.name || 'Self (Owner)';
    setSelectedKarigar(initialKarigar);
    const est = order.estimatedHours || getEstimatedHoursForGarment(order.garmentType, order.orderCategory);
    setAssignEstHours(est);
    
    const sched = generateWorkerScheduleForDays(initialKarigar, activeOrders, 8);
    const best = sched.find((s) => !s.isDayOff && s.freeHours >= est) || sched.find((s) => !s.isDayOff) || sched[0];
    const initialDate = order.dueDate || (best ? best.dateStr : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    setAssignDueDate(initialDate);
    setAssignDueTime(order.dueTime || '18:00');
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

  const handleCreateWorker = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkerName.trim()) return;
    if (onAddTailor) {
      onAddTailor({
        name: newWorkerName.trim(),
        phone: newWorkerPhone.trim(),
        role: newWorkerRole,
      });
    }
    setNewWorkerName('');
    setNewWorkerPhone('');
    setShowAddWorkerModal(false);
  };

  // Helper for Stepper Stage Index
  const getStageIndex = (status: OrderStatus) => {
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

  return (
    <div className="space-y-5 font-sans">
      
      {/* ================= SECTION 1: SHOP REVENUE & CASHFLOW ================= */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200 shadow-2xs">
              <TrendingUp className="w-4 h-4 text-emerald-700" />
            </div>
            <div>
              <h2 className="text-xs font-black tracking-wider uppercase text-slate-900">Shop Revenue & Cashflow</h2>
              <p className="text-[11px] text-slate-400 font-medium">Live active ledger summary</p>
            </div>
          </div>

          {onReportsClick && (
            <button
              onClick={onReportsClick}
              className="text-xs font-black text-slate-700 hover:text-slate-950 bg-white hover:bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
            >
              <span>Full Reports</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-500" />
            </button>
          )}
        </div>

        {/* 4 KPI Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          
          {/* 1. Total Booked */}
          <div className="bg-[#F8FAFC] rounded-xl p-3.5 border border-slate-200/80 flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-xs font-semibold text-slate-500">Total Booked</div>
              <div className="text-2xl font-black text-slate-900">₹{totalRevenue.toLocaleString()}</div>
              <div className="text-[11px] text-slate-500 font-medium">{activeOrders.length} active orders</div>
            </div>
            {/* Sparkline SVG */}
            <div className="w-16 h-8 flex items-center justify-end">
              <svg className="w-14 h-7 stroke-emerald-500 fill-none" viewBox="0 0 60 30">
                <path d="M0 25 Q 15 22, 25 15 T 45 10 T 60 3" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M0 25 Q 15 22, 25 15 T 45 10 T 60 3 L 60 30 L 0 30 Z" className="fill-emerald-50 opacity-40" />
              </svg>
            </div>
          </div>

          {/* 2. Advance Collected */}
          <div className="bg-[#F8FAFC] rounded-xl p-3.5 border border-slate-200/80 flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-xs font-semibold text-slate-500">Advance Collected</div>
              <div className="text-2xl font-black text-slate-900">₹{totalAdvanceCollected.toLocaleString()}</div>
              <div className="text-[11px] text-emerald-600 font-bold">{collectedPercentage}% recovered</div>
            </div>
            {/* Sparkline SVG */}
            <div className="w-16 h-8 flex items-center justify-end">
              <svg className="w-14 h-7 stroke-emerald-600 fill-none" viewBox="0 0 60 30">
                <path d="M0 20 Q 20 25, 30 12 T 50 8 T 60 2" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M0 20 Q 20 25, 30 12 T 50 8 T 60 2 L 60 30 L 0 30 Z" className="fill-emerald-100 opacity-40" />
              </svg>
            </div>
          </div>

          {/* 3. Pending Balance */}
          <div className="bg-[#F8FAFC] rounded-xl p-3.5 border border-slate-200/80 flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-xs font-semibold text-slate-500">Pending Balance</div>
              <div className="text-2xl font-black text-rose-600">₹{totalBalanceDue.toLocaleString()}</div>
              <div className="text-[11px] text-slate-500 font-medium">To collect on delivery</div>
            </div>
            {/* Sparkline SVG */}
            <div className="w-16 h-8 flex items-center justify-end">
              <svg className="w-14 h-7 stroke-rose-500 fill-none" viewBox="0 0 60 30">
                <path d="M0 8 Q 20 5, 35 18 T 50 22 T 60 26" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M0 8 Q 20 5, 35 18 T 50 22 T 60 26 L 60 30 L 0 30 Z" className="fill-rose-50 opacity-40" />
              </svg>
            </div>
          </div>

          {/* 4. Collection Health */}
          <div className="bg-[#F8FAFC] rounded-xl p-3.5 border border-slate-200/80 flex items-center gap-3">
            {/* Circular Gauge Ring */}
            <div className="relative w-12 h-12 shrink-0 flex items-center justify-center">
              <svg className="w-12 h-12 -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-slate-200"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-emerald-500 transition-all duration-700"
                  strokeDasharray={`${collectedPercentage}, 100`}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <span className="absolute text-[11px] font-black text-slate-800">{collectedPercentage}%</span>
            </div>

            <div className="space-y-1 min-w-0 flex-1">
              <div className="text-xs font-semibold text-slate-500 truncate">Collection Health</div>
              <div className="text-xs font-black text-slate-900 truncate">Cash In-Hand</div>
              <div className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Good progress</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ================= SECTION 2: WORKER CAPACITY & ASSIGNMENTS ================= */}
      <div className="bg-gradient-to-r from-[#072C21] via-[#0B3B2C] to-[#08291F] rounded-2xl p-4 sm:p-5 border border-emerald-700/50 shadow-md space-y-3.5 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center border border-emerald-400/30 shadow-2xs">
              <Scissors className="w-4 h-4 text-emerald-300" />
            </div>
            <div>
              <h3 className="text-xs font-black text-white uppercase tracking-wider">Worker Capacity & Assignments</h3>
              <p className="text-[11px] text-emerald-200/80 font-medium">Live Karigar queue & workloads</p>
            </div>
          </div>

          <button
            onClick={() => onAssignTimelineClick()}
            className="text-xs font-black text-white hover:text-emerald-100 bg-white/10 hover:bg-white/20 border border-white/20 px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
          >
            <span>Assign Timeline</span>
            <ChevronRight className="w-3.5 h-3.5 text-emerald-200" />
          </button>
        </div>

        {/* Unassigned Warning Banner */}
        {unassignedOrders.length > 0 && (
          <div className="bg-amber-400/15 border border-amber-300/40 rounded-xl p-3 flex items-center justify-between gap-3 text-amber-100">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-amber-400 text-slate-950 font-black flex items-center justify-center text-xs shrink-0 shadow-2xs">
                {unassignedOrders.length}
              </div>
              <div className="text-xs">
                <span className="font-black text-amber-200">{unassignedOrders.length} Order{unassignedOrders.length > 1 ? 's' : ''} Need Karigar Assignment</span>
                <span className="text-amber-100/80 hidden sm:inline"> — Assign workers to maintain on-time delivery schedule.</span>
              </div>
            </div>

            <button
              onClick={() => handleOpenAssignModal(unassignedOrders[0])}
              className="bg-amber-400 hover:bg-amber-300 text-slate-950 px-3 py-1.5 rounded-xl font-black text-xs shrink-0 shadow-2xs cursor-pointer transition-all active:scale-95"
            >
              Assign #{unassignedOrders[0]?.id}
            </button>
          </div>
        )}

        {/* Worker Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
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

            const isHigh = staffOrdersCount >= 3;
            const loadPercent = Math.min(100, Math.round((staffOrdersCount / 4) * 100));

            return (
              <div
                key={staff.id}
                onClick={() => onAssignTimelineClick()}
                className="bg-white/10 hover:bg-white/15 p-3 rounded-xl border border-white/15 hover:border-white/30 transition-all cursor-pointer space-y-2 group shadow-2xs backdrop-blur-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-emerald-400 text-[#072C21] text-xs font-black flex items-center justify-center shrink-0 shadow-2xs">
                      {staff.name.replace('Self (Owner)', 'SO')[0]}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-black text-white truncate group-hover:text-emerald-200">
                        {staff.name}
                      </div>
                      <div className="text-[10px] text-emerald-100/70 truncate">
                        {staff.role} • {isHigh ? 'High Load' : staffOrdersCount > 0 ? 'Optimal' : 'Available'}
                      </div>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-black px-2 py-0.5 rounded-md shrink-0 ${
                      staffOrdersCount > 0
                        ? 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/40'
                        : 'bg-white/10 text-white/70 border border-white/15'
                    }`}
                  >
                    {staffOrdersCount} Active
                  </span>
                </div>

                {/* Mini Workload bar */}
                <div className="w-full bg-white/15 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      isHigh ? 'bg-amber-400' : 'bg-emerald-400'
                    }`}
                    style={{ width: `${Math.max(10, loadPercent)}%` }}
                  />
                </div>
              </div>
            );
          })}

          {/* Add Worker Action Card */}
          <div
            onClick={() => setShowAddWorkerModal(true)}
            className="bg-white/5 hover:bg-white/10 p-3 rounded-xl border border-dashed border-emerald-400/30 hover:border-emerald-300/60 transition-all cursor-pointer flex items-center justify-center gap-2 group text-emerald-200 hover:text-white"
          >
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-300 group-hover:bg-emerald-400 group-hover:text-[#072C21] flex items-center justify-center transition-colors shadow-2xs">
              <Plus className="w-4 h-4" />
            </div>
            <div className="text-left leading-tight">
              <div className="text-xs font-black">+ Add Worker</div>
              <div className="text-[10px] text-emerald-200/60">Add new karigar or helper</div>
            </div>
          </div>
        </div>
      </div>

      {/* ================= SECTION 3: ORDERS MANAGEMENT HUB ================= */}
      <div className="space-y-3.5">
        
        {/* Tabs Bar & Orders Hub Link */}
        <div className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-200/90 shadow-xs space-y-3">
          
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 overflow-x-auto no-scrollbar gap-2">
            <div className="flex items-center gap-1 sm:gap-2">
              {[
                { id: 'All', label: `All Orders (${activeOrders.length})` },
                { id: 'Cutting', label: `Cutting (${cuttingCount})` },
                { id: 'Stitching', label: `Stitching (${stitchingCount})` },
                { id: 'Completed', label: `Completed (${completedCount})` },
                { id: 'Alteration', label: `Repair / Alteration (${alterationCount})` },
              ].map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                      isActive
                        ? 'bg-[#072C21] text-amber-300 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {onOrdersClick && (
              <button
                onClick={() => onOrdersClick('all')}
                className="text-xs font-black text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-xl hover:bg-slate-100 flex items-center gap-1 transition-all cursor-pointer shrink-0 ml-auto"
              >
                <span>Orders Hub</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              </button>
            )}
          </div>

          {/* Search, Filter & Sort Toolbar */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by order #, customer name, phone, garment, tailor..."
                className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#072C21] focus:bg-white transition-all shadow-2xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Trigger Button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowFilterMenu(!showFilterMenu)}
                className={`px-3 py-2 rounded-xl text-xs font-black border flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs ${
                  selectedPaymentFilter !== 'all' || selectedWorkerFilter !== 'all'
                    ? 'bg-amber-100 text-amber-950 border-amber-300'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Filter</span>
                {(selectedPaymentFilter !== 'all' || selectedWorkerFilter !== 'all') && (
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                )}
              </button>

              {/* Filter Popover Dropdown */}
              {showFilterMenu && (
                <div className="absolute right-0 mt-1.5 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 p-3 z-30 space-y-3 animate-in fade-in zoom-in duration-150">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-xs font-black text-slate-900">Filter Orders</span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPaymentFilter('all');
                        setSelectedWorkerFilter('all');
                      }}
                      className="text-[10px] text-slate-500 hover:text-slate-800 font-bold"
                    >
                      Reset All
                    </button>
                  </div>

                  {/* Payment Filter */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-600">Payment Status:</label>
                    <div className="grid grid-cols-3 gap-1">
                      {['all', 'paid', 'due'].map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setSelectedPaymentFilter(p as any)}
                          className={`py-1 text-[10px] font-black rounded-lg capitalize ${
                            selectedPaymentFilter === p
                              ? 'bg-[#072C21] text-amber-300'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          {p === 'all' ? 'All' : p === 'paid' ? 'Paid' : 'Balance Due'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Worker Filter */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-600">Assigned Worker:</label>
                    <select
                      value={selectedWorkerFilter}
                      onChange={(e) => setSelectedWorkerFilter(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 rounded-xl p-2 focus:outline-none"
                    >
                      <option value="all">All Workers</option>
                      {staffList.map((s) => (
                        <option key={s.id} value={s.name}>{s.name}</option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowFilterMenu(false)}
                    className="w-full py-1.5 bg-[#072C21] text-white text-xs font-black rounded-xl hover:bg-[#06231a]"
                  >
                    Apply Filter
                  </button>
                </div>
              )}
            </div>

            {/* Sort Select Button */}
            <div className="relative">
              <select
                value={selectedSort}
                onChange={(e) => setSelectedSort(e.target.value as any)}
                className="bg-white hover:bg-slate-50 border border-slate-200 text-xs font-black text-slate-700 rounded-xl px-3 py-2 cursor-pointer shadow-2xs focus:outline-none"
              >
                <option value="latest">⇅ Latest First</option>
                <option value="due_earliest">📅 Due Date Earliest</option>
                <option value="total_high">💰 Total Amount (High to Low)</option>
                <option value="balance_high">⚠️ Balance Due (High to Low)</option>
              </select>
            </div>
          </div>
        </div>

        {/* ================= ORDER CARDS LIST (DESKTOP HORIZONTAL CARDS) ================= */}
        <div className="space-y-3.5">
          {filteredOrders.length === 0 ? (
            <div className="bg-white rounded-2xl p-10 text-center border border-slate-200 shadow-xs space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-black text-slate-900">No matching orders found</h3>
              <p className="text-xs text-slate-500">Try adjusting your filters or search keywords.</p>
              <button
                onClick={onNewOrderClick}
                className="mt-2 px-4 py-2 bg-[#072C21] hover:bg-[#06231a] text-white rounded-xl text-xs font-black shadow cursor-pointer inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>+ Create New Order</span>
              </button>
            </div>
          ) : (
            filteredOrders.map((order) => {
              const hasStitchedPhotos = order.stitchedPhotos && order.stitchedPhotos.length > 0;
              const isUnassigned = !order.assignedTailor || order.assignedTailor === 'Unassigned' || order.assignedTailor === 'Not Assigned';
              const currentStageIdx = getStageIndex(order.status);
              const isCardMenuOpen = openCardMenuId === order.id;
              const isVoicePlaying = playingVoiceOrderId === order.id;

              // Card background tint based on category & status
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
                      <span className={`px-1.5 py-0.2 rounded text-[9px] font-black border shadow-2xs ${
                        order.orderCategory === 'Alteration' || order.orderCategory === 'Repair'
                          ? 'bg-fuchsia-100 text-fuchsia-900 border-fuchsia-300'
                          : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                      }`}>
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
                          🔥 Overdue
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
                              className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-slate-100 flex items-center gap-2"
                            >
                              <FileText className="w-3.5 h-3.5 text-slate-500" />
                              <span>View Full Details</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setOpenCardMenuId(null);
                                handleOpenAssignModal(order);
                              }}
                              className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-slate-100 flex items-center gap-2"
                            >
                              <Scissors className="w-3.5 h-3.5 text-slate-500" />
                              <span>Change Tailor / Due Date</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setOpenCardMenuId(null);
                                setReceiptModalOrder(order);
                              }}
                              className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-slate-100 flex items-center gap-2"
                            >
                              <Printer className="w-3.5 h-3.5 text-slate-500" />
                              <span>Print / Share Bill</span>
                            </button>

                            {order.status !== 'Delivered' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenCardMenuId(null);
                                  handleCardStatusChangeRequest(order, 'Delivered');
                                }}
                                className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-emerald-50 text-emerald-800 font-black flex items-center gap-2"
                              >
                                <ShoppingBag className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Mark Delivered</span>
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
                            className="text-xs font-black text-slate-900 truncate hover:text-[#072C21] cursor-pointer leading-tight"
                          >
                            {order.customerName}
                          </h4>
                          <div className="text-[10px] text-slate-500 font-medium truncate">{order.customerPhone}</div>
                          <div className="text-[11px] font-black text-[#072C21] truncate">
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
                          <div className="w-4 h-4 rounded bg-[#072C21] text-amber-300 text-[9px] font-black flex items-center justify-center shrink-0">
                            {isUnassigned ? '✂️' : order.assignedTailor[0]}
                          </div>
                          <span className="font-black text-slate-900 text-[11px] truncate">
                            {isUnassigned ? 'Unassigned' : order.assignedTailor}
                          </span>
                          <span className={`text-[8px] font-bold px-1.5 py-0.2 rounded-full ${
                            order.status === 'Stitching in Progress'
                              ? 'bg-indigo-100 text-indigo-800'
                              : order.status === 'Completed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-200 text-slate-700'
                          }`}>
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
                                if (node.stage === 'Cutting') handleCardStatusChangeRequest(order, 'New / Cutting');
                                if (node.stage === 'Assigned') handleCardStatusChangeRequest(order, 'Assigned');
                                if (node.stage === 'Stitching') handleCardStatusChangeRequest(order, 'Stitching in Progress');
                                if (node.stage === 'Ready') handleCardStatusChangeRequest(order, 'Completed');
                                if (node.stage === 'Delivered') handleCardStatusChangeRequest(order, 'Delivered');
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

      {/* ================= MODAL 1: QUICK ASSIGN KARIGAR MODAL ================= */}
      {assigningOrder && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl p-5 sm:p-6 max-w-lg w-full shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in duration-150 my-auto max-h-[92vh] overflow-y-auto">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-[#072C21] text-amber-300 flex items-center justify-center font-black shadow-xs">
                  <Scissors className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Assign Order #{assigningOrder.id}</h3>
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

            {/* Step 1: Select Karigar */}
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[#072C21]" />
                <span>1. Select Karigar / Worker:</span>
              </label>

              <div className="grid grid-cols-2 gap-2">
                {staffList.map((staff) => {
                  const isSelected = selectedKarigar === staff.name;
                  const staffSched = generateWorkerScheduleForDays(staff.name, activeOrders, 1);
                  const todayFree = staffSched[0]?.freeHours ?? 8;

                  return (
                    <button
                      key={staff.id}
                      type="button"
                      onClick={() => {
                        setSelectedKarigar(staff.name);
                        const sched = generateWorkerScheduleForDays(staff.name, activeOrders, 8);
                        const match = sched.find((s) => !s.isDayOff && s.freeHours >= assignEstHours) || sched[0];
                        if (match) setAssignDueDate(match.dateStr);
                      }}
                      className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer space-y-1 ${
                        isSelected
                          ? 'bg-[#072C21] text-white border-[#072C21] shadow-md ring-2 ring-amber-300'
                          : 'bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black truncate">{staff.name}</span>
                        {isSelected && <Check className="w-4 h-4 text-amber-300 shrink-0" />}
                      </div>
                      <div className="text-[10px] opacity-80">{todayFree}h Free Today</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Date & Slot */}
            <div className="space-y-2 pt-1 border-t border-slate-100">
              <label className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                <CalendarIcon className="w-3.5 h-3.5 text-[#072C21]" />
                <span>2. Promised Date & Delivery Slot:</span>
              </label>

              <PromisedDateTimeInput
                date={assignDueDate}
                time={assignDueTime}
                onDateChange={(d) => setAssignDueDate(d)}
                onTimeChange={(t) => setAssignDueTime(t)}
                showPresets={true}
                showStatusBanner={false}
                label="Select Promised Date & Time"
              />
            </div>

            {/* Step 3: Estimated Hours */}
            <div className="space-y-1.5 pt-1 border-t border-slate-100">
              <div className="flex items-center justify-between text-xs">
                <span className="font-black text-slate-800">3. Estimated Stitching Effort:</span>
                <span className="font-black text-[#072C21] bg-emerald-100 px-2 py-0.5 rounded-md">
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
                className="w-full accent-[#072C21] cursor-pointer"
              />
            </div>

            {/* Action Buttons */}
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
                className="flex-1 py-2.5 rounded-xl bg-[#072C21] hover:bg-[#06231a] font-black text-xs text-amber-300 shadow-md cursor-pointer flex items-center justify-center gap-1.5 transition-all active:scale-98"
              >
                <Check className="w-4 h-4 text-amber-300" />
                <span>Assign to {selectedKarigar}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 2: ADD WORKER MODAL ================= */}
      {showAddWorkerModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#072C21] text-amber-300 flex items-center justify-center font-black">
                  <Scissors className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-black text-slate-900">Add New Karigar / Tailor</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddWorkerModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateWorker} className="space-y-3">
              <div>
                <label className="text-xs font-black text-slate-800">Worker Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Bhai"
                  value={newWorkerName}
                  onChange={(e) => setNewWorkerName(e.target.value)}
                  className="w-full mt-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#072C21]"
                />
              </div>

              <div>
                <label className="text-xs font-black text-slate-800">Mobile Number (Optional)</label>
                <input
                  type="tel"
                  placeholder="e.g. 9876543210"
                  value={newWorkerPhone}
                  onChange={(e) => setNewWorkerPhone(e.target.value)}
                  className="w-full mt-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#072C21]"
                />
              </div>

              <div>
                <label className="text-xs font-black text-slate-800">Skill / Specialization</label>
                <select
                  value={newWorkerRole}
                  onChange={(e) => setNewWorkerRole(e.target.value as any)}
                  className="w-full mt-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#072C21]"
                >
                  <option value="Stitching Karigar">Stitching Karigar</option>
                  <option value="Master Tailor">Master Tailor</option>
                  <option value="Cutting Master">Cutting Master</option>
                  <option value="Helper / Finisher">Helper / Finisher</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddWorkerModal(false)}
                  className="py-2.5 px-4 rounded-xl border border-slate-200 font-bold text-xs text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#072C21] hover:bg-[#06231a] text-white font-black text-xs rounded-xl shadow cursor-pointer"
                >
                  Save Worker
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 3: RECEIPT / BILL MODAL ================= */}
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
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Receipt Body */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 font-mono text-xs space-y-3 text-slate-800">
              <div className="text-center border-b border-slate-200 pb-2">
                <div className="font-black text-sm text-slate-900">{shopProfile?.shopName || 'ShopScopers Tailor'}</div>
                <div className="text-[10px] text-slate-500">{shopProfile?.address || 'Master Boutique & Tailors'}</div>
                <div className="text-[10px] text-slate-500">Phone: {userPhone || '+91 7608807790'}</div>
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
                  <span className="font-bold text-[#072C21]">{receiptModalOrder.dueDate}</span>
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
                className="flex-1 py-2.5 bg-[#25D366] hover:bg-[#20bd5a] text-white font-black text-xs rounded-xl flex items-center justify-center gap-1.5 shadow"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send WhatsApp Receipt</span>
              </a>

              <button
                type="button"
                onClick={() => window.print()}
                className="py-2.5 px-4 rounded-xl border border-slate-200 font-bold text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>Print</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 4: SLIP PHOTO MODAL ================= */}
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
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
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
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* ================= MODAL 5: ORDER COMPLETED MODAL ================= */}
      {completedModalOrder && (
        <OrderCompletedModal
          order={completedModalOrder}
          shopProfile={shopProfile}
          onClose={() => setCompletedModalOrder(null)}
          onConfirmCompleted={handleConfirmCompleted}
        />
      )}

      {/* ================= MODAL 6: ORDER DELIVERY MODAL ================= */}
      {deliveryModalOrder && (
        <OrderDeliveryModal
          order={deliveryModalOrder}
          shopProfile={shopProfile}
          onClose={() => setDeliveryModalOrder(null)}
          onConfirmDelivery={handleConfirmDeliverySettlement}
        />
      )}

      {/* ================= MODAL 7: PHOTO ZOOM ================= */}
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
              alt="Zoomed"
              className="w-full h-auto max-h-[85vh] object-contain rounded-2xl"
            />
          </div>
        </div>
      )}

    </div>
  );
};
