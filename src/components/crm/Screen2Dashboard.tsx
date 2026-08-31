import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Plus,
  Search,
  Clock,
  CheckCircle2,
  Scissors,
  DollarSign,
  TrendingUp,
  Package,
  Layers,
  ChevronRight,
  Shirt,
  Play,
  Pause,
  Filter,
  Check,
  X,
  Sparkles,
  Calendar,
  AlertTriangle,
  ArrowUpRight,
  Phone,
  MessageSquare,
  Wallet,
  ShoppingBag,
  LayoutList,
  Grid,
  ChevronDown,
  ChevronUp,
  User,
  Tag,
  ArrowUpDown,
  PhoneCall,
  CheckCircle,
} from 'lucide-react';
import {
  TailorOrder,
  OrderStatus,
  StaffTailor,
  RevenueAnalytics,
  ShopProfile,
  PaymentMode,
  BoutiqueAppointment,
  InventoryItem,
} from '../../types';
import {
  generateWorkerScheduleForDays,
  getEstimatedHoursForGarment,
} from '../../lib/workerCapacity';
import { formatDisplayDate } from './PromisedDateTimeInput';
import { getWhatsAppUrl } from '../../lib/phoneUtils';
import { useLanguage } from '../../lib/LanguageContext';
import { roomDb } from '../../lib/localRoomDb';
import { isDateToday, getLocalDateStr, normalizeDateStr } from '../../lib/dateUtils';

// Boutique Subsystems
import { BoutiqueNeedsAttentionQueue } from './BoutiqueNeedsAttentionQueue';
import { BoutiqueAppointmentsSection } from './BoutiqueAppointmentsSection';
import { BoutiqueFloatingQuickAction } from './BoutiqueFloatingQuickAction';
import { BoutiqueSpeedNewModal } from './BoutiqueSpeedNewModal';
import { BoutiqueAppointmentModal } from './BoutiqueAppointmentModal';
import { BoutiqueQuickPaymentModal } from './BoutiqueQuickPaymentModal';

interface Screen2DashboardProps {
  orders: TailorOrder[];
  tailors?: StaffTailor[];
  analytics?: RevenueAnalytics;
  shopProfile?: ShopProfile;
  appointments?: BoutiqueAppointment[];
  onNewOrderClick: () => void;
  onNewStitchClick?: () => void;
  onNewAlterClick?: () => void;
  onNewSaleClick?: () => void;
  onNewAppointmentClick?: () => void;
  onSelectOrder: (order: TailorOrder) => void;
  onAssignTimelineClick: (order?: TailorOrder) => void;
  onProfileClick: () => void;
  onOverdueClick: () => void;
  onOrdersClick?: (tab?: 'all' | 'cutting' | 'stitching' | 'overdue' | 'completed' | 'archived') => void;
  onReportsClick?: () => void;
  onMarketplaceClick?: () => void;
  onCustomersClick?: () => void;
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
  onSaveAppointment?: (appt: BoutiqueAppointment) => void;
  onDeleteAppointment?: (apptId: string) => void;
  onToggleAppointmentChecklist?: (
    apptId: string,
    field: 'garmentReady' | 'accessoriesReady' | 'measurementsLoaded',
    currentVal: boolean
  ) => void;
  onRecordQuickPayment?: (orderId: string, amount: number, mode: PaymentMode, note?: string) => void;
  inventory?: InventoryItem[];
  onInventoryClick?: () => void;
  userPhone?: string;
  isDesktopView?: boolean;
}

export const Screen2Dashboard: React.FC<Screen2DashboardProps> = ({
  orders,
  tailors = [],
  analytics,
  shopProfile,
  appointments = [],
  onNewOrderClick,
  onNewStitchClick,
  onNewAlterClick,
  onNewSaleClick,
  onNewAppointmentClick,
  onSelectOrder,
  onAssignTimelineClick,
  onProfileClick,
  onOverdueClick,
  onOrdersClick,
  onReportsClick,
  onMarketplaceClick,
  onCustomersClick,
  onQuickAssignTailor,
  onUpdateOrderStatus,
  onDeliverOrder,
  onSaveAppointment,
  onDeleteAppointment,
  onToggleAppointmentChecklist,
  onRecordQuickPayment,
  inventory,
  onInventoryClick,
  userPhone = '+91 7608807790',
  isDesktopView = false,
}) => {
  const { t, isHindi, isBengali, isOdia, language } = useLanguage();

  // Navigation & filter states
  const [activeTab, setActiveTab] = useState<'All' | 'Stitch' | 'Alteration' | 'Sale'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSort, setSelectedSort] = useState<'latest' | 'due_earliest' | 'total_high' | 'balance_high'>('latest');
  const [selectedPaymentFilter, setSelectedPaymentFilter] = useState<'all' | 'paid' | 'due'>('all');
  const [selectedWorkerFilter, setSelectedWorkerFilter] = useState<string>('all');
  const [statusStageFilter, setStatusStageFilter] = useState<'all' | 'in_progress' | 'ready' | 'delivered'>('all');
  const [selectedDaysFilter, setSelectedDaysFilter] = useState<'all' | 'today' | '3days' | '7days' | '15days' | '30days'>('all');
  const [limitCount, setLimitCount] = useState<number | 'all'>(5);
  const [viewMode, setViewMode] = useState<'table' | 'grouped' | 'cards'>('table');
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const toggleGroupCollapse = (groupId: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  // Speed Action Modals
  const [showSpeedNewModal, setShowSpeedNewModal] = useState(false);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [selectedAppointmentForEdit, setSelectedAppointmentForEdit] = useState<BoutiqueAppointment | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [preselectedPaymentOrder, setPreselectedPaymentOrder] = useState<TailorOrder | null>(null);

  // Assignment Modal State
  const [assigningOrder, setAssigningOrder] = useState<TailorOrder | null>(null);
  const [selectedKarigar, setSelectedKarigar] = useState<string>('');
  const [assignEstHours, setAssignEstHours] = useState<number>(4);
  const [assignDueDate, setAssignDueDate] = useState<string>('');
  const [assignDueTime, setAssignDueTime] = useState<string>('18:00');

  // Voice Note Playback State
  const [playingVoiceOrderId, setPlayingVoiceOrderId] = useState<string | null>(null);
  const audioPlaybackRef = useRef<HTMLAudioElement | null>(null);

  // Quick Status Actions
  const handleQuickMarkReady = async (ord: TailorOrder, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await roomDb.updateOrderStatus(ord.id, 'Completed');
      if (onUpdateOrderStatus) {
        onUpdateOrderStatus(ord.id, 'Completed');
      }
    } catch (err) {
      console.error('Failed to mark order as Ready:', err);
    }
  };

  const handleQuickMarkDelivered = async (ord: TailorOrder, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await roomDb.updateOrderStatus(ord.id, 'Delivered');
      if (onUpdateOrderStatus) {
        onUpdateOrderStatus(ord.id, 'Delivered');
      }
    } catch (err) {
      console.error('Failed to mark order as Delivered:', err);
    }
  };
  // Active Orders (Excluding Archived)
  const activeOrders = useMemo(() => orders.filter((o) => !o.isArchived), [orders]);
  const overdueOrders = useMemo(() => activeOrders.filter((o) => o.isOverdue), [activeOrders]);
  const overdueCount = overdueOrders.length;

  const todayStr = useMemo(() => getLocalDateStr(), []);

  const isTodayDate = (dateVal?: any): boolean => {
    return isDateToday(dateVal);
  };

  const dueTodayOrders = useMemo(() => activeOrders.filter((o) => isTodayDate(o.dueDate)), [activeOrders]);

  // Daily Sales & Bookings (Orders created, booked, or updated today)
  const todayBookedOrders = useMemo(() => {
    return activeOrders.filter(
      (o) =>
        isTodayDate(o.createdAt) ||
        isTodayDate(o.createdDate) ||
        isTodayDate((o as any).orderDate) ||
        isTodayDate(o.updatedAt)
    );
  }, [activeOrders]);

  const todayBookedValue = useMemo(() => {
    return todayBookedOrders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);
  }, [todayBookedOrders]);

  // Today's total cash collected (advances from orders booked today + direct retail sale receipts + settlements logged today)
  const todayCollectedAmount = useMemo(() => {
    let sum = 0;
    for (const o of activeOrders) {
      const isCreatedToday = isTodayDate(o.createdAt) || isTodayDate(o.createdDate) || isTodayDate((o as any).orderDate);
      if (isCreatedToday) {
        // If it's a retail sale or fully paid order, count the paid portion
        if (o.category === 'Sale' || o.status === 'Completed' || o.status === 'Delivered') {
          const paid = Math.max(Number(o.advancePaid) || 0, (Number(o.totalAmount) || 0) - (Number(o.balanceDue) || 0));
          sum += paid;
        } else {
          sum += Number(o.advancePaid) || 0;
        }
      }
      if (o.paymentHistory && Array.isArray(o.paymentHistory)) {
        for (const p of o.paymentHistory) {
          if (isTodayDate(p.date) && !isCreatedToday) {
            sum += Number(p.amount) || 0;
          }
        }
      }
    }
    return sum;
  }, [activeOrders]);

  // Orders Delivered Today & Value
  const deliveredTodayOrders = useMemo(() => {
    return activeOrders.filter((o) => {
      return o.status === 'Delivered' && (isTodayDate((o as any).deliveredDate) || isTodayDate(o.updatedAt) || isTodayDate(o.createdDate));
    });
  }, [activeOrders]);

  const deliveredTodayValue = useMemo(() => {
    return deliveredTodayOrders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);
  }, [deliveredTodayOrders]);

  // Financial figures
  const totalRevenue = useMemo(() => activeOrders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0), [activeOrders]);
  const totalAdvanceCollected = useMemo(() => activeOrders.reduce((sum, o) => sum + (Number(o.advancePaid) || 0), 0), [activeOrders]);
  const totalBalanceDue = useMemo(() => activeOrders.reduce((sum, o) => sum + (Number(o.balanceDue) || 0), 0), [activeOrders]);

  // Total Realized Cash Inflow (Advances + settled balance on delivered/completed)
  const totalEarnedCash = useMemo(() => {
    return activeOrders.reduce((sum, o) => {
      const adv = Number(o.advancePaid) || 0;
      const total = Number(o.totalAmount) || 0;
      const bal = Number(o.balanceDue) || 0;
      const settled = Math.max(adv, total - bal);
      return sum + settled;
    }, 0);
  }, [activeOrders]);

  const collectionRate = useMemo(() => {
    if (totalRevenue <= 0) return 100;
    return Math.min(100, Math.round((totalEarnedCash / totalRevenue) * 100));
  }, [totalEarnedCash, totalRevenue]);

  const balanceOnReady = useMemo(
    () => activeOrders.filter((o) => o.status === 'Completed' || o.status === 'Trial').reduce((sum, o) => sum + (Number(o.balanceDue) || 0), 0),
    [activeOrders]
  );

  // Live Inventory Stock & Valuation metrics
  const inventoryList = useMemo(() => {
    return (inventory && inventory.length > 0) ? inventory : roomDb.getInventory();
  }, [inventory]);

  const inventoryMetrics = useMemo(() => {
    let totalUnits = 0;
    let totalValuation = 0;
    let totalRetail = 0;
    let lowStockCount = 0;

    inventoryList.forEach((item) => {
      const qty = Number(item.quantity) || 0;
      const cost = Number(item.costPrice) || (item.finalPrice ? Number(item.finalPrice) * 0.6 : (Number(item.price) || 0) * 0.5);
      const sell = Number(item.finalPrice) || Number(item.sellingPrice) || Number(item.price) || 0;

      totalUnits += qty;
      totalValuation += qty * cost;
      totalRetail += qty * sell;

      if (qty > 0 && qty <= (item.minStockAlert || 3)) {
        lowStockCount++;
      }
    });

    return {
      totalUnits,
      totalValuation,
      totalRetail,
      lowStockCount,
      itemCount: inventoryList.length,
    };
  }, [inventoryList]);

  const readyCount = useMemo(() => activeOrders.filter((o) => o.status === 'Completed').length, [activeOrders]);
  const inProgressCount = useMemo(
    () => activeOrders.filter((o) => o.status !== 'Completed' && o.status !== 'Delivered').length,
    [activeOrders]
  );
  const deliveredCount = useMemo(
    () => activeOrders.filter((o) => o.status === 'Delivered').length,
    [activeOrders]
  );

  // Staff list
  const staffList = useMemo(() => {
    const list = [...(tailors || [])];
    if (!list.some((s) => s.role === 'Owner' || s.name === 'Self (Owner)' || (s.name && s.name.includes('Owner')))) {
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
    return list.filter((s) => !mockNames.has((s.name || '').toLowerCase()) && !mockIds.has(s.id));
  }, [tailors]);

  // Filter & Sort Logic for Orders Workspace
  const filteredOrders = useMemo(() => {
    let result = activeOrders.filter((o) => {
      // Stage filter
      let matchesStage = true;
      if (statusStageFilter === 'in_progress') {
        matchesStage = o.status !== 'Completed' && o.status !== 'Delivered';
      } else if (statusStageFilter === 'ready') {
        matchesStage = o.status === 'Completed';
      } else if (statusStageFilter === 'delivered') {
        matchesStage = o.status === 'Delivered';
      }

      // Tab filter (Stitch, Alteration, Sale)
      let matchesTab = true;
      if (activeTab === 'Stitch') {
        matchesTab = o.orderCategory === 'Stitch' || o.orderCategory === 'New Stitch' || !o.orderCategory;
      } else if (activeTab === 'Alteration') {
        matchesTab =
          o.orderCategory === 'Alteration' ||
          o.orderCategory === 'Repair' ||
          Boolean(o.garmentType && typeof o.garmentType === 'string' && o.garmentType.toLowerCase().includes('alter'));
      } else if (activeTab === 'Sale') {
        matchesTab = o.orderCategory === 'Sale';
      }

      // Search Query
      const q = (searchQuery || '').toLowerCase();
      const matchesSearch =
        !q ||
        Boolean(o.customerName && typeof o.customerName === 'string' && o.customerName.toLowerCase().includes(q)) ||
        Boolean(o.customerPhone && typeof o.customerPhone === 'string' && o.customerPhone.includes(q)) ||
        Boolean(o.id && typeof o.id === 'string' && o.id.toLowerCase().includes(q)) ||
        Boolean(o.garmentType && typeof o.garmentType === 'string' && o.garmentType.toLowerCase().includes(q)) ||
        Boolean(o.assignedTailor && typeof o.assignedTailor === 'string' && o.assignedTailor.toLowerCase().includes(q)) ||
        Boolean(o.orderCategory && typeof o.orderCategory === 'string' && o.orderCategory.toLowerCase().includes(q));

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

      // Days Filter (Date Created / Due Range)
      let matchesDays = true;
      if (selectedDaysFilter !== 'all') {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const orderDateStr = o.createdAt || o.dueDate;
        if (orderDateStr) {
          const orderTime = new Date(orderDateStr).getTime();
          if (selectedDaysFilter === 'today') {
            matchesDays = orderTime >= startOfToday;
          } else if (selectedDaysFilter === '3days') {
            matchesDays = orderTime >= startOfToday - 3 * 24 * 60 * 60 * 1000;
          } else if (selectedDaysFilter === '7days') {
            matchesDays = orderTime >= startOfToday - 7 * 24 * 60 * 60 * 1000;
          } else if (selectedDaysFilter === '15days') {
            matchesDays = orderTime >= startOfToday - 15 * 24 * 60 * 60 * 1000;
          } else if (selectedDaysFilter === '30days') {
            matchesDays = orderTime >= startOfToday - 30 * 24 * 60 * 60 * 1000;
          }
        }
      }

      return matchesStage && matchesTab && matchesSearch && matchesPayment && matchesWorker && matchesDays;
    });

    // Robust helper to extract numerical timestamp for sorting latest order first
    const getOrderTimestamp = (order: TailorOrder): number => {
      if ((order as any).createdAt) {
        const t = new Date((order as any).createdAt).getTime();
        if (!isNaN(t) && t > 0) return t;
      }
      if (order.createdDate) {
        const dateTimeStr = order.createdTime ? `${order.createdDate}T${order.createdTime}` : order.createdDate;
        const t = new Date(dateTimeStr).getTime();
        if (!isNaN(t) && t > 0) return t;
      }
      if (order.updatedAt) {
        const t = new Date(order.updatedAt).getTime();
        if (!isNaN(t) && t > 0) return t;
      }
      if (order.id) {
        const match = order.id.match(/\d+/g);
        if (match) {
          const num = parseInt(match.join(''), 10);
          if (!isNaN(num)) return num;
        }
      }
      return 0;
    };

    // Sorting: default to newest / latest created order first
    result.sort((a, b) => {
      if (selectedSort === 'latest') {
        const timeDiff = getOrderTimestamp(b) - getOrderTimestamp(a);
        if (timeDiff !== 0) return timeDiff;
        return (b.id || '').localeCompare(a.id || '');
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
  }, [activeOrders, statusStageFilter, activeTab, searchQuery, selectedPaymentFilter, selectedWorkerFilter, selectedDaysFilter, selectedSort]);

  // Displayed orders considering limitCount (e.g. latest 5 orders by default)
  const displayedOrders = useMemo(() => {
    if (limitCount === 'all') return filteredOrders;
    return filteredOrders.slice(0, limitCount);
  }, [filteredOrders, limitCount]);

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
    const todayStrNow = new Date().toISOString().split('T')[0];
    const nextStatus: OrderStatus = assignDueDate === todayStrNow ? 'Stitching in Progress' : 'Assigned';
    if (onUpdateOrderStatus) {
      onUpdateOrderStatus(assigningOrder.id, nextStatus);
    }
    setAssigningOrder(null);
  };

  const handleSpeedActionSelect = (
    action:
      | 'custom_order'
      | 'alteration'
      | 'quick_sale'
      | 'book_appointment'
      | 'new_customer'
      | 'record_payment'
      | 'catalogue_upload'
  ) => {
    if (action === 'custom_order') {
      if (onNewStitchClick) onNewStitchClick();
      else onNewOrderClick();
    } else if (action === 'alteration') {
      if (onNewAlterClick) onNewAlterClick();
      else onNewOrderClick();
    } else if (action === 'quick_sale') {
      if (onNewSaleClick) onNewSaleClick();
      else onNewOrderClick();
    } else if (action === 'book_appointment') {
      if (onNewAppointmentClick) onNewAppointmentClick();
      else {
        setSelectedAppointmentForEdit(null);
        setShowAppointmentModal(true);
      }
    } else if (action === 'new_customer') {
      if (onCustomersClick) onCustomersClick();
      else onNewOrderClick();
    } else if (action === 'record_payment') {
      setPreselectedPaymentOrder(null);
      setShowPaymentModal(true);
    } else if (action === 'catalogue_upload') {
      if (onMarketplaceClick) onMarketplaceClick();
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
        console.warn('Audio playback notice:', err);
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

  return (
    <div className="space-y-6 font-sans animate-fadeIn">
      {/* ================= SECTION 1: INFORMATIVE FINANCIAL & OPERATIONAL KPI TILES ================= */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* 1. Daily Sales & Today's Cash Inflow */}
        <div
          onClick={onReportsClick}
          className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 border-l-4 border-l-[#0B4636] shadow-2xs hover:shadow-xs transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-slate-600 mb-1.5">
            <div>
              <span className="text-xs font-bold text-slate-900 group-hover:text-[#0B4636] transition-colors block">
                {t('stats.dailySales', 'Daily Sales (Today)')}
              </span>
              <span className="text-[10px] text-slate-500 font-medium">
                {t('stats.dailyInflow', 'Cash & UPI Inflow')}
              </span>
            </div>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-[#0B4636] flex items-center justify-center font-bold shrink-0 border border-emerald-200">
              <TrendingUp className="w-4 h-4 stroke-[2.5]" />
            </div>
          </div>
          <div className="pt-0.5">
            <div className="text-xl sm:text-2xl font-bold text-slate-950 font-mono tracking-tight">
              ₹{(todayBookedValue > 0 ? todayBookedValue : todayCollectedAmount).toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-[#0B4636] font-semibold mt-0.5 truncate">
              {todayBookedOrders.length > 0
                ? `${todayBookedOrders.length} ${todayBookedOrders.length === 1 ? 'order' : 'orders'} • ₹${todayCollectedAmount.toLocaleString('en-IN')} cash collected`
                : todayCollectedAmount > 0
                ? `₹${todayCollectedAmount.toLocaleString('en-IN')} collected today`
                : `₹${totalAdvanceCollected.toLocaleString('en-IN')} active advances`}
            </div>
          </div>
        </div>

        {/* 2. Sales Delivered Today & Handovers */}
        <div
          onClick={() => {
            setActiveTab('All');
            if (onOrdersClick) onOrdersClick('all');
          }}
          className={`p-3.5 sm:p-4 rounded-xl border border-slate-200 border-l-4 ${
            dueTodayOrders.length > 0 || overdueCount > 0 ? 'border-l-rose-500' : 'border-l-slate-900'
          } shadow-2xs hover:shadow-xs transition-all cursor-pointer group flex flex-col justify-between bg-white`}
        >
          <div className="flex items-center justify-between text-slate-600 mb-1.5">
            <div>
              <span className="text-xs font-bold text-slate-950 block">
                {t('stats.salesDeliveredToday', 'Delivered Today')}
              </span>
              <span className="text-[10px] text-slate-500 font-medium">
                {t('stats.salesDeliveredSub', 'Garments Handed Over')}
              </span>
            </div>
            <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-900 flex items-center justify-center font-bold shrink-0 border border-slate-200">
              <ShoppingBag className="w-4 h-4 stroke-[2.5]" />
            </div>
          </div>
          <div className="pt-0.5">
            <div className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-slate-950">
              {deliveredTodayOrders.length > 0 ? deliveredTodayOrders.length : readyCount}
            </div>
            <div className="text-[11px] font-semibold mt-0.5 truncate">
              {deliveredTodayOrders.length > 0 ? (
                <span className="text-emerald-700 font-bold">
                  ₹{deliveredTodayValue.toLocaleString('en-IN')} settled today
                </span>
              ) : overdueCount > 0 ? (
                <span className="text-rose-600 font-bold">
                  🚨 {overdueCount} {t('stats.overdueNotice', 'overdue orders')}
                </span>
              ) : (
                <span className="text-slate-600">
                  {readyCount > 0 ? `${readyCount} ready for pickup` : t('stats.onTrack', 'All deliveries on track')}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 3. Inventory Value & Live Stock Units */}
        <div
          onClick={onInventoryClick ? onInventoryClick : undefined}
          className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 border-l-4 border-l-[#0B4636] shadow-2xs hover:shadow-xs transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-slate-600 mb-1.5">
            <div>
              <span className="text-xs font-bold text-slate-900 group-hover:text-[#0B4636] transition-colors block">
                {t('stats.inventoryValuation', 'Inventory Value')}
              </span>
              <span className="text-[10px] text-slate-500 font-medium">
                {t('stats.inventoryStockSub', 'Ready Stock & Pieces')}
              </span>
            </div>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-[#0B4636] flex items-center justify-center font-bold shrink-0 border border-emerald-200">
              <Package className="w-4 h-4 stroke-[2.5]" />
            </div>
          </div>
          <div className="pt-0.5">
            <div className="text-xl sm:text-2xl font-bold text-slate-900 font-mono tracking-tight">
              ₹{inventoryMetrics.totalValuation.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-slate-600 font-medium mt-0.5 truncate">
              <span className="text-[#0B4636] font-semibold">
                {inventoryMetrics.totalUnits} {t('stats.stockUnits', 'pieces in stock')}
              </span>
              {inventoryMetrics.totalRetail > 0 && (
                <span className="text-slate-500 ml-1">
                  • ₹{inventoryMetrics.totalRetail.toLocaleString('en-IN')} {t('stats.retailPotential', 'retail')}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 4. Total Realized Revenue */}
        <div
          onClick={onReportsClick}
          className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 border-l-4 border-l-slate-900 shadow-2xs hover:shadow-xs transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-slate-600 mb-1.5">
            <div>
              <span className="text-xs font-bold text-slate-900 group-hover:text-slate-700 transition-colors block">
                {t('stats.totalEarned', 'Total Realized Revenue')}
              </span>
              <span className="text-[10px] text-slate-500 font-medium">
                {t('stats.totalEarnedSub', 'Net Inflow / Realized')}
              </span>
            </div>
            <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-900 flex items-center justify-center font-bold shrink-0 border border-slate-200">
              <Sparkles className="w-4 h-4 stroke-[2.5]" />
            </div>
          </div>
          <div className="pt-0.5">
            <div className="text-xl sm:text-2xl font-bold text-slate-950 font-mono tracking-tight">
              ₹{totalEarnedCash.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-slate-700 font-semibold mt-0.5 truncate">
              ₹{totalRevenue.toLocaleString('en-IN')} gross value ({collectionRate}% collected)
            </div>
          </div>
        </div>
      </div>

      {/* ================= COMPACT QUICK ACTION TOOLBAR ================= */}
      <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 text-slate-700">
          <div className="w-2 h-2 rounded-full bg-[#0B4636]" />
          <span className="text-xs font-bold tracking-wide text-slate-900 uppercase">
            {t('quick.title', 'Quick Actions')}
          </span>
          <span className="text-[11px] text-slate-500 font-medium hidden md:inline">
            &bull; Fast boutique operational entry
          </span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          {/* 1. Stitch Button */}
          <button
            type="button"
            onClick={onNewStitchClick || onNewOrderClick}
            className="h-8 px-3 rounded-lg bg-[#0B4636] hover:bg-[#073327] text-white font-semibold text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer active:scale-95"
            title="New Custom Stitching Order"
          >
            <Shirt className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>{t('quick.stitch', 'Stitch')}</span>
          </button>

          {/* 2. Alter Button */}
          <button
            type="button"
            onClick={onNewAlterClick || onNewOrderClick}
            className="h-8 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer active:scale-95"
            title="Quick Alteration / Fitting"
          >
            <Scissors className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>{t('quick.alter', 'Alter')}</span>
          </button>

          {/* 3. Sale Button */}
          <button
            type="button"
            onClick={onNewSaleClick || onNewOrderClick}
            className="h-8 px-3 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer active:scale-95"
            title="Express Ready-made Sale Bill"
          >
            <ShoppingBag className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>{t('quick.sale', 'Sale')}</span>
          </button>

          {/* 4. Appointment Button */}
          <button
            type="button"
            onClick={onNewAppointmentClick || (() => { setSelectedAppointmentForEdit(null); setShowAppointmentModal(true); })}
            className="h-8 px-3 rounded-lg bg-white hover:bg-slate-50 text-slate-800 font-semibold text-xs flex items-center gap-1.5 border border-slate-200 shadow-2xs transition-all cursor-pointer active:scale-95"
            title="Book Client Appointment / Fitting"
          >
            <Calendar className="w-3.5 h-3.5 text-slate-600" />
            <span>{t('quick.appointment', 'Appointment')}</span>
          </button>
        </div>
      </div>

      {/* ================= SECTION 4: ACTIVE ORDERS & WORKSPACE LIST (Structured CRM Data Grid) ================= */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-3 sm:p-5 space-y-4 font-sans">
        {/* Workspace Top Header & Stage Pipeline Counters */}
        <div className="flex flex-col gap-3 pb-3 border-b border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#0B4636] text-white flex items-center justify-center font-bold shadow-xs shrink-0">
                <Shirt className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                    {t('ledger.title', 'Orders')}
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 font-extrabold text-[11px] border border-slate-200">
                    {filteredOrders.length} {t('ledger.totalOrders', 'Total')}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium">
                  {t('ledger.subtitle', 'Track real-time production stages, trial schedules, tailor assignments, and payments')}
                </p>
              </div>
            </div>

            {/* View Layout Switcher (Table vs Grouped vs Cards) */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                title="Structured Table Grid"
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-white text-[#0B4636] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LayoutList className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Table</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('grouped')}
                title="Grouped by Production Stage"
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'grouped'
                    ? 'bg-white text-[#0B4636] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Grouped</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('cards')}
                title="Card Tiles"
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'cards'
                    ? 'bg-white text-[#0B4636] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Grid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Cards</span>
              </button>
            </div>
          </div>

          {/* Pipeline Stage Segments Bar & Days Filter */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
            {/* Days Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1 shrink-0 mr-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Days:</span>
              </span>
              {[
                { id: 'all', label: 'All Days' },
                { id: 'today', label: 'Today' },
                { id: '3days', label: 'Last 3 Days' },
                { id: '7days', label: 'Last 7 Days' },
                { id: '15days', label: 'Last 15 Days' },
                { id: '30days', label: 'Last 30 Days' },
              ].map((dayItem) => {
                const isActive = selectedDaysFilter === dayItem.id;
                return (
                  <button
                    key={dayItem.id}
                    type="button"
                    onClick={() => setSelectedDaysFilter(dayItem.id as any)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap border ${
                      isActive
                        ? 'bg-[#0B4636] text-white border-[#0B4636] shadow-xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {dayItem.label}
                  </button>
                );
              })}
            </div>

            {/* Orders View Limit Dropdown */}
            <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
              <span className="text-[11px] font-bold text-slate-500">Show:</span>
              <select
                value={limitCount === 'all' ? 'all' : String(limitCount)}
                onChange={(e) => {
                  const val = e.target.value;
                  setLimitCount(val === 'all' ? 'all' : Number(val));
                }}
                className="text-xs font-bold px-2.5 py-1 bg-slate-100 hover:bg-white border border-slate-200 rounded-lg text-slate-900 outline-hidden cursor-pointer shadow-2xs transition-colors"
              >
                <option value="5">Latest 5 Orders</option>
                <option value="10">Latest 10 Orders</option>
                <option value="20">Latest 20 Orders</option>
                <option value="50">Latest 50 Orders</option>
                <option value="all">Extend & Show All ({filteredOrders.length})</option>
              </select>
            </div>
          </div>
        </div>

        {/* ----------------- RENDER ORDERS ACCORDING TO VIEW MODE ----------------- */}
        {displayedOrders.length === 0 ? (
          <div className="p-10 text-center text-[#676879] text-xs font-medium space-y-2 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
            <Shirt className="w-8 h-8 text-slate-300 mx-auto" />
            <div className="font-bold text-[#323338] text-sm">{t('ledger.noOrders', 'No orders match this filter.')}</div>
            <p className="text-xs text-[#676879] max-w-sm mx-auto">
              Try adjusting your days filter, search query, or click &quot;New Order&quot; to create a new client entry.
            </p>
          </div>
        ) : viewMode === 'table' ? (
          /* ================= 1. STRUCTURED FULL-WIDTH TABLE / LIST VIEW ================= */
          <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
            {/* Desktop Table Header (Visible on lg+) */}
            <div className="hidden lg:grid grid-cols-12 gap-3 px-5 py-2.5 bg-slate-50/90 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider border-b border-slate-200">
              <div className="col-span-3 flex items-center gap-1.5">
                <Shirt className="w-3.5 h-3.5 text-slate-400" />
                <span>Order & Garment</span>
              </div>
              <div className="col-span-3 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>Customer & Contact</span>
              </div>
              <div className="col-span-2 flex items-center gap-1.5">
                <Scissors className="w-3.5 h-3.5 text-slate-400" />
                <span>Production Status</span>
              </div>
              <div className="col-span-2 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Promised Delivery & Tailor</span>
              </div>
              <div className="col-span-2 text-right flex items-center justify-end gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                <span>Balance & Settlement</span>
              </div>
            </div>

            {/* List Rows with Distinct Horizontal Dividing Lines */}
            <div className="divide-y-2 divide-slate-100">
              {displayedOrders.map((ord) => {
                const isOverdue = ord.isOverdue && ord.status !== 'Delivered';
                const cleanPhone = ord.customerPhone ? ord.customerPhone.replace(/\D/g, '') : '';
                const intlPhone = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;
                const whatsappGreeting = isHindi
                  ? `नमस्ते ${ord.customerName} जी, बुटीक से आपके ऑर्डर (${ord.garmentType}, ${ord.id}) के संबंध में:`
                  : isBengali
                  ? `নমস্কার ${ord.customerName}, বুটিক থেকে আপনার অর্ডার (${ord.garmentType}, ${ord.id}) সম্পর্কিত বার্তা:`
                  : isOdia
                  ? `ନମସ୍କାର ${ord.customerName}, ବୁଟିକ୍ ରୁ ଆପଣଙ୍କ ଅର୍ଡର (${ord.garmentType}, ${ord.id}) ସମ୍ପର୍କରେ:`
                  : `Hello ${ord.customerName}, regarding your boutique order (${ord.garmentType}, ${ord.id}):`;
                const whatsappUrl = getWhatsAppUrl(intlPhone, whatsappGreeting);

                // Category Icon & Color
                const isSale = ord.orderCategory === 'Sale';
                const isAlteration = ord.orderCategory === 'Alteration' || ord.orderCategory === 'Repair';
                const catLabel = isSale ? 'Sale' : isAlteration ? 'Alter' : 'Stitch';
                const catBg = isSale
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : isAlteration
                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                  : 'bg-blue-50 text-blue-700 border-blue-200';

                // Status styling
                const getStatusBadge = (status: string) => {
                  switch (status) {
                    case 'Completed':
                      return {
                        label: 'Ready for Pickup',
                        bg: 'bg-emerald-50 text-emerald-800 border-emerald-300',
                        dot: 'bg-emerald-500',
                      };
                    case 'Delivered':
                      return {
                        label: 'Delivered',
                        bg: 'bg-teal-50 text-teal-800 border-teal-300',
                        dot: 'bg-teal-500',
                      };
                    case 'Trial':
                      return {
                        label: 'Trial & Fitting',
                        bg: 'bg-purple-50 text-purple-800 border-purple-300',
                        dot: 'bg-purple-500',
                      };
                    case 'In Alteration / Fitting':
                      return {
                        label: 'In Alteration',
                        bg: 'bg-purple-50 text-purple-800 border-purple-300',
                        dot: 'bg-purple-500',
                      };
                    case 'Stitching in Progress':
                      return {
                        label: 'Stitching',
                        bg: 'bg-amber-50 text-amber-900 border-amber-300',
                        dot: 'bg-amber-500 animate-pulse',
                      };
                    case 'New / Cutting':
                      return {
                        label: 'New / Cutting',
                        bg: 'bg-sky-50 text-sky-800 border-sky-300',
                        dot: 'bg-sky-500',
                      };
                    case 'Assigned':
                    default:
                      return {
                        label: status,
                        bg: 'bg-indigo-50 text-indigo-800 border-indigo-300',
                        dot: 'bg-indigo-500',
                      };
                  }
                };

                const statusBadge = getStatusBadge(ord.status);

                // Customer initials for avatar
                const initials = ord.customerName
                  ? ord.customerName
                      .split(' ')
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((w) => w[0].toUpperCase())
                      .join('')
                  : 'C';

                return (
                  <div
                    key={ord.id}
                    onClick={() => onSelectOrder(ord)}
                    className={`w-full transition-all duration-150 cursor-pointer hover:bg-slate-50/90 relative group border-l-4 ${
                      isOverdue
                        ? 'border-l-rose-500 bg-rose-50/15'
                        : ord.status === 'Completed'
                        ? 'border-l-emerald-500'
                        : ord.status === 'Delivered'
                        ? 'border-l-slate-700'
                        : 'border-l-[#0B4636]'
                    }`}
                  >
                    {/* ================= DESKTOP / TABLET ROW (lg+) ================= */}
                    <div className="hidden lg:grid grid-cols-12 gap-3 items-center px-5 py-2.5 min-h-[56px]">
                      {/* 1. Order & Garment (col-span-3) */}
                      <div className="col-span-3 flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-sm shrink-0 border border-slate-200 shadow-2xs group-hover:scale-105 transition-transform">
                          {isSale ? '🛍️' : isAlteration ? '✂️' : '🧵'}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-nowrap">
                            <span className="text-[11px] font-mono font-bold text-slate-800 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200 shrink-0">
                              {ord.id}
                            </span>
                            <span className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded border shrink-0 ${catBg}`}>
                              {catLabel}
                            </span>
                            {isOverdue && (
                              <span className="px-1.5 py-0.2 bg-rose-600 text-white text-[9px] font-black rounded shadow-2xs shrink-0 animate-pulse">
                                OVERDUE
                              </span>
                            )}
                          </div>
                          <div className="text-xs font-bold text-slate-900 truncate group-hover:text-[#0B4636] transition-colors mt-0.5">
                            {ord.garmentType || 'Garment Item'}
                          </div>
                        </div>
                      </div>

                      {/* 2. Customer & Contact (col-span-3) */}
                      <div className="col-span-3 flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 text-[#0B4636] flex items-center justify-center text-[11px] font-black shrink-0 shadow-2xs">
                          {initials}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-slate-900 truncate">
                            {ord.customerName}
                          </div>
                          <div className="text-[11px] text-slate-500 font-medium font-mono truncate">
                            {ord.customerPhone ? ord.customerPhone : <span className="italic text-slate-400">No phone</span>}
                          </div>
                        </div>
                      </div>

                      {/* 3. Production Status (col-span-2) */}
                      <div className="col-span-2 min-w-0">
                        <span
                          className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full border shadow-2xs ${statusBadge.bg}`}
                        >
                          <span className={`w-2 h-2 rounded-full ${statusBadge.dot} shrink-0`} />
                          <span className="truncate">{statusBadge.label}</span>
                        </span>
                      </div>

                      {/* 4. Promised Delivery & Tailor (col-span-2) */}
                      <div className="col-span-2 min-w-0">
                        <div className="flex items-center gap-1 text-xs font-semibold text-slate-700">
                          <Clock className={`w-3 h-3 ${isOverdue ? 'text-rose-600' : 'text-slate-400'} shrink-0`} />
                          <span className={isOverdue ? 'text-rose-600 font-bold' : 'text-slate-800'}>
                            {formatDisplayDate(ord.dueDate)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                          {ord.assignedTailor && ord.assignedTailor !== 'Unassigned' ? (
                            <span className="text-[10px] text-slate-700 font-semibold bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200 flex items-center gap-1">
                              <User className="w-2.5 h-2.5 text-slate-500" />
                              <span className="truncate max-w-[90px]">{ord.assignedTailor}</span>
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic bg-slate-50 px-1.5 py-0.2 rounded border border-dashed border-slate-200">
                              Unassigned
                            </span>
                          )}

                          {ord.voiceNoteUrl && (
                            <button
                              type="button"
                              onClick={(e) => handleToggleVoicePlay(ord, e)}
                              className="inline-flex items-center gap-0.5 text-[#a25ddc] hover:text-purple-950 bg-purple-50 hover:bg-purple-100 px-1.5 py-0.2 rounded font-bold border border-purple-200 text-[10px] cursor-pointer"
                            >
                              {playingVoiceOrderId === ord.id ? (
                                <Pause className="w-2.5 h-2.5" />
                              ) : (
                                <Play className="w-2.5 h-2.5" />
                              )}
                              <span>Audio</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* 5. Balance & Settlement Actions (col-span-2) */}
                      <div className="col-span-2 flex items-center justify-end gap-2.5 min-w-0">
                        <div className="text-right">
                          <div className="text-xs font-black font-mono text-slate-900">
                            ₹{ord.totalAmount.toLocaleString('en-IN')}
                          </div>
                          {ord.balanceDue > 0 ? (
                            <div className="text-[9px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">
                              Due: ₹{ord.balanceDue.toLocaleString('en-IN')}
                            </div>
                          ) : (
                            <div className="text-[9px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                              ✓ Paid Full
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                          {ord.status !== 'Completed' && ord.status !== 'Delivered' && (
                            <button
                              type="button"
                              onClick={(e) => handleQuickMarkReady(ord, e)}
                              className="h-6.5 px-2 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold flex items-center gap-1 shadow-xs cursor-pointer active:scale-95 transition-all"
                              title="Mark Ready for Delivery"
                            >
                              <Check className="w-3 h-3 stroke-[3]" />
                              <span>Ready</span>
                            </button>
                          )}

                          {ord.status !== 'Delivered' && (
                            <button
                              type="button"
                              onClick={(e) => handleQuickMarkDelivered(ord, e)}
                              className="h-6.5 px-2 rounded bg-teal-700 hover:bg-teal-800 text-white text-[10px] font-bold flex items-center gap-1 shadow-xs cursor-pointer active:scale-95 transition-all"
                              title="Mark Delivered & Settle"
                            >
                              <span>Deliver</span>
                            </button>
                          )}

                          {ord.customerPhone && (
                            <a
                              href={whatsappUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="h-6.5 w-6.5 rounded-lg bg-[#25D366] hover:bg-[#1faa4b] text-white flex items-center justify-center shadow-xs transition-all hover:scale-105 active:scale-95"
                              title="Chat on WhatsApp"
                            >
                              <MessageSquare className="w-3 h-3 fill-white" />
                            </a>
                          )}

                          <button
                            type="button"
                            onClick={() => onSelectOrder(ord)}
                            className="h-6.5 px-1.5 rounded-lg bg-[#0B4636] hover:bg-[#073024] text-amber-300 font-bold text-xs flex items-center justify-center shadow-xs cursor-pointer transition-all hover:scale-105 active:scale-95 border border-amber-300/20"
                            title="Open Order Details"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* ================= MOBILE CARD VIEW (< lg) ================= */}
                    <div className="block lg:hidden p-3.5 space-y-2.5">
                      {/* Top Row: Order Tag + Status Badge */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[11px] font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                            {ord.id}
                          </span>
                          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border ${catBg}`}>
                            {catLabel}
                          </span>
                          {isOverdue && (
                            <span className="px-1.5 py-0.5 bg-rose-600 text-white text-[9px] font-black rounded shadow-2xs animate-pulse">
                              OVERDUE
                            </span>
                          )}
                        </div>
                        <span
                          className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full border shadow-2xs ${statusBadge.bg}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${statusBadge.dot} shrink-0`} />
                          <span>{statusBadge.label}</span>
                        </span>
                      </div>

                      {/* Middle Row: Garment & Customer Details */}
                      <div className="flex items-start justify-between gap-3 pt-1 border-t border-slate-100">
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-bold text-slate-900 truncate flex items-center gap-1.5">
                            <span>{isSale ? '🛍️' : isAlteration ? '✂️' : '🧵'}</span>
                            <span className="truncate">{ord.garmentType || 'Garment Item'}</span>
                          </div>
                          <div className="text-xs text-slate-600 font-medium flex items-center gap-1.5 mt-0.5 truncate">
                            <span className="font-semibold text-slate-800 truncate">{ord.customerName}</span>
                            {ord.customerPhone && (
                              <>
                                <span className="text-slate-300">•</span>
                                <span className="font-mono text-slate-500">{ord.customerPhone}</span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Amount */}
                        <div className="text-right shrink-0">
                          <div className="text-sm font-black font-mono text-slate-900">
                            ₹{ord.totalAmount.toLocaleString('en-IN')}
                          </div>
                          {ord.balanceDue > 0 ? (
                            <div className="text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">
                              Due: ₹{ord.balanceDue.toLocaleString('en-IN')}
                            </div>
                          ) : (
                            <div className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                              ✓ Paid Full
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Bottom Row: Delivery & Quick Action Buttons */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                        <div className="flex items-center gap-2 text-slate-600 text-[11px]">
                          <span className="flex items-center gap-1 font-semibold text-slate-700">
                            <Clock className={`w-3 h-3 ${isOverdue ? 'text-rose-600' : 'text-slate-400'}`} />
                            {formatDisplayDate(ord.dueDate)}
                          </span>
                          {ord.assignedTailor && ord.assignedTailor !== 'Unassigned' && (
                            <span className="text-slate-500 truncate max-w-[100px]">
                              • {ord.assignedTailor}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                          {ord.customerPhone && (
                            <a
                              href={whatsappUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="h-7 w-7 rounded-lg bg-[#25D366] hover:bg-[#1faa4b] text-white flex items-center justify-center shadow-xs"
                              title="WhatsApp"
                            >
                              <MessageSquare className="w-3.5 h-3.5 fill-white" />
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => onSelectOrder(ord)}
                            className="h-7 px-2.5 rounded-lg bg-[#0B4636] text-amber-300 text-xs font-bold flex items-center gap-1 shadow-xs"
                          >
                            <span>Details</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer extend button if there are more orders */}
            {limitCount !== 'all' && filteredOrders.length > displayedOrders.length && (
              <div className="p-3 bg-slate-50 border-t border-[#e6e9ef] flex items-center justify-between">
                <span className="text-xs text-slate-500 font-medium">
                  Showing {displayedOrders.length} of {filteredOrders.length} orders
                </span>
                <button
                  type="button"
                  onClick={() => setLimitCount('all')}
                  className="px-3 py-1 bg-white hover:bg-slate-100 text-[#0B4636] font-bold text-xs rounded-lg border border-slate-300 shadow-2xs cursor-pointer transition-colors"
                >
                  Extend & Show All ({filteredOrders.length}) ↓
                </button>
              </div>
            )}
          </div>
        ) : viewMode === 'grouped' ? (
          /* ================= 2. GROUPED STAGES ACCORDION VIEW ================= */
          <div className="space-y-4">
            {[
              {
                id: 'in_progress',
                title: '⏳ Active Production & Alterations',
                subtitle: 'Cutting, Stitching, and Trial fittings currently on work tables',
                orders: displayedOrders.filter((o) => o.status !== 'Completed' && o.status !== 'Delivered'),
                accentColor: 'border-amber-400',
                badgeBg: 'bg-amber-100 text-amber-900',
              },
              {
                id: 'ready',
                title: '✨ Ready for Pickup / Delivery',
                subtitle: 'Garments finished and waiting for client collection',
                orders: displayedOrders.filter((o) => o.status === 'Completed'),
                accentColor: 'border-emerald-400',
                badgeBg: 'bg-emerald-100 text-emerald-900',
              },
              {
                id: 'delivered',
                title: '✅ Delivered & Fulfilled Archive',
                subtitle: 'Completed boutique ledger items and history',
                orders: displayedOrders.filter((o) => o.status === 'Delivered'),
                accentColor: 'border-slate-400',
                badgeBg: 'bg-slate-200 text-slate-900',
              },
            ].map((group) => {
              const isCollapsed = Boolean(collapsedGroups[group.id]);
              const groupTotal = group.orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
              const groupDue = group.orders.reduce((sum, o) => sum + (o.balanceDue || 0), 0);

              return (
                <div key={group.id} className={`bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs border-l-4 ${group.accentColor}`}>
                  {/* Group Header */}
                  <button
                    type="button"
                    onClick={() => toggleGroupCollapse(group.id)}
                    className="w-full p-3 sm:px-4 sm:py-3 bg-[#f8fafc] flex items-center justify-between gap-3 text-left border-b border-slate-200 cursor-pointer hover:bg-slate-100/80 transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-xs sm:text-sm text-slate-900">{group.title}</span>
                        <span className={`px-2 py-0.2 rounded-full text-[10px] font-extrabold ${group.badgeBg}`}>
                          {group.orders.length} orders
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium">{group.subtitle}</p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right hidden sm:block">
                        <div className="text-xs font-bold font-mono text-slate-900">₹{groupTotal.toLocaleString('en-IN')}</div>
                        {groupDue > 0 && <div className="text-[10px] font-bold text-rose-600">₹{groupDue.toLocaleString('en-IN')} Due</div>}
                      </div>
                      <div className="w-6 h-6 rounded bg-white text-slate-600 flex items-center justify-center border border-slate-200">
                        {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                      </div>
                    </div>
                  </button>

                  {/* Group Body */}
                  {!isCollapsed && (
                    <div className="divide-y divide-slate-100">
                      {group.orders.length === 0 ? (
                        <div className="p-4 text-center text-xs text-slate-400 italic">
                          No orders currently in this stage.
                        </div>
                      ) : (
                        group.orders.map((ord) => (
                          <div
                            key={ord.id}
                            onClick={() => onSelectOrder(ord)}
                            className="p-3 sm:px-4 hover:bg-slate-50 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                                {ord.id}
                              </span>
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-slate-900 truncate">
                                  {ord.garmentType} · <span className="font-semibold text-slate-600">{ord.customerName}</span>
                                </div>
                                <div className="text-[11px] text-slate-500 flex items-center gap-2">
                                  <span>Due: {formatDisplayDate(ord.dueDate)}</span>
                                  {ord.assignedTailor && <span>· 👤 {ord.assignedTailor}</span>}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                              <div className="text-right">
                                <div className="text-xs font-bold font-mono text-slate-900">₹{ord.totalAmount.toLocaleString('en-IN')}</div>
                                {ord.balanceDue > 0 ? (
                                  <span className="text-[10px] font-bold text-rose-600">₹{ord.balanceDue} Due</span>
                                ) : (
                                  <span className="text-[10px] font-bold text-emerald-600">Paid</span>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => onSelectOrder(ord)}
                                className="px-2.5 py-1 rounded-lg bg-[#0B4636] hover:bg-[#073327] text-white text-[10px] font-bold cursor-pointer transition-colors"
                              >
                                Open
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* ================= 3. CARD TILES VIEW ================= */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {displayedOrders.map((ord) => {
              const isOverdue = ord.isOverdue && ord.status !== 'Delivered';
              const cleanPhone = ord.customerPhone ? ord.customerPhone.replace(/\D/g, '') : '';
              const intlPhone = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;
              const whatsappUrl = getWhatsAppUrl(intlPhone, `Hello ${ord.customerName}, regarding your order ${ord.id}:`);
              const isSale = ord.orderCategory === 'Sale';
              const isAlteration = ord.orderCategory === 'Alteration' || ord.orderCategory === 'Repair';

              return (
                <div
                  key={ord.id}
                  onClick={() => onSelectOrder(ord)}
                  className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3 shadow-xs hover:border-[#0B4636] hover:shadow-md transition-all cursor-pointer relative group flex flex-col justify-between"
                >
                  {/* Top: Header with ID, Category, Status */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                        {ord.id}
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                        {isSale ? 'Sale' : isAlteration ? 'Alter' : 'Stitch'}
                      </span>
                      {isOverdue && (
                        <span className="px-1.5 py-0.5 bg-rose-600 text-white text-[9px] font-black rounded shadow-2xs animate-pulse">
                          OVERDUE
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 border border-slate-200">
                      {ord.status}
                    </span>
                  </div>

                  {/* Middle: Garment & Customer */}
                  <div className="pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{isSale ? '🛍️' : isAlteration ? '✂️' : '🧵'}</span>
                      <h4 className="text-sm font-bold text-slate-900 truncate group-hover:text-[#0B4636] transition-colors">
                        {ord.garmentType || 'Garment Item'}
                      </h4>
                    </div>
                    <p className="text-xs text-slate-600 font-medium truncate mt-1">
                      <span className="font-semibold text-slate-900">{ord.customerName}</span> · {ord.customerPhone || 'No Phone'}
                    </p>
                  </div>

                  {/* Bottom: Date & Financials & Actions */}
                  <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                    <div>
                      <div className={`text-[11px] font-semibold flex items-center gap-1 ${isOverdue ? 'text-rose-600 font-bold' : 'text-slate-500'}`}>
                        <Clock className="w-3 h-3" />
                        <span>{formatDisplayDate(ord.dueDate)}</span>
                      </div>
                      {ord.assignedTailor && ord.assignedTailor !== 'Unassigned' && (
                        <div className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[120px]">
                          👤 {ord.assignedTailor}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <span className="font-mono font-bold text-slate-900 text-sm">₹{ord.totalAmount.toLocaleString('en-IN')}</span>
                        {ord.balanceDue > 0 ? (
                          <span className="text-[10px] font-bold text-rose-600 block">Due: ₹{ord.balanceDue.toLocaleString('en-IN')}</span>
                        ) : (
                          <span className="text-[10px] font-bold text-emerald-600 block">✓ Paid</span>
                        )}
                      </div>
                      {ord.customerPhone && (
                        <a
                          href={whatsappUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="h-7 w-7 rounded-lg bg-[#25D366] hover:bg-[#1faa4b] text-white flex items-center justify-center shadow-xs"
                          title="WhatsApp"
                        >
                          <MessageSquare className="w-3.5 h-3.5 fill-white" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ================= SECTION 2: FULL-WIDTH SLEEK "NEEDS ATTENTION" WORK QUEUE ================= */}
      <BoutiqueNeedsAttentionQueue
        orders={orders}
        onSelectOrder={onSelectOrder}
        onOpenAssignModal={handleOpenAssignModal}
        onQuickCollectPayment={(ord) => {
          setPreselectedPaymentOrder(ord);
          setShowPaymentModal(true);
        }}
        onUpdateStatus={onUpdateOrderStatus}
      />

      {/* ================= SECTION 3: APPOINTMENTS & CLIENT VISITS ================= */}
      <BoutiqueAppointmentsSection
        appointments={appointments}
        orders={activeOrders}
        onOpenBookAppointmentModal={(existing) => {
          setSelectedAppointmentForEdit(existing || null);
          setShowAppointmentModal(true);
        }}
        onSaveAppointment={onSaveAppointment}
        onDeleteAppointment={onDeleteAppointment}
        onToggleAppointmentChecklist={onToggleAppointmentChecklist}
        onSelectOrder={onSelectOrder}
        onNavigateToManager={onNewAppointmentClick}
      />

      {/* ================= MODAL FLOWS ================= */}
      {/* 1. Quick Action Hub Modal */}
      <BoutiqueSpeedNewModal
        isOpen={showSpeedNewModal}
        onClose={() => setShowSpeedNewModal(false)}
        onSelectAction={handleSpeedActionSelect}
      />

      {/* 2. Boutique Visit / Appointment Booking Modal */}
      <BoutiqueAppointmentModal
        isOpen={showAppointmentModal}
        onClose={() => {
          setShowAppointmentModal(false);
          setSelectedAppointmentForEdit(null);
        }}
        orders={activeOrders}
        existingAppointment={selectedAppointmentForEdit}
        onSaveAppointment={async (appt) => {
          if (onSaveAppointment) await onSaveAppointment(appt);
        }}
      />

      {/* 3. Quick Payment Settlement Modal */}
      <BoutiqueQuickPaymentModal
        isOpen={showPaymentModal}
        onClose={() => {
          setShowPaymentModal(false);
          setPreselectedPaymentOrder(null);
        }}
        orders={activeOrders}
        preselectedOrder={preselectedPaymentOrder}
        onRecordPayment={(orderId, amt, mode, note) => {
          if (onRecordQuickPayment) {
            onRecordQuickPayment(orderId, amt, mode, note);
          } else if (onDeliverOrder) {
            onDeliverOrder(orderId, amt, mode, [], note);
          }
        }}
      />

      {/* 4. Floating 'Quick Action' Speed-Dial Menu */}
      <BoutiqueFloatingQuickAction
        onNewStitch={() => {
          if (onNewStitchClick) onNewStitchClick();
          else onNewOrderClick();
        }}
        onNewAlter={() => {
          if (onNewAlterClick) onNewAlterClick();
          else onNewOrderClick();
        }}
        onNewSale={() => {
          if (onNewSaleClick) onNewSaleClick();
          else onNewOrderClick();
        }}
        onNewAppointment={() => {
          if (onNewAppointmentClick) onNewAppointmentClick();
          else {
            setSelectedAppointmentForEdit(null);
            setShowAppointmentModal(true);
          }
        }}
      />
    </div>
  );
};
