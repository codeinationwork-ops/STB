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
  ChevronDown,
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
  LayoutGrid,
  Table as TableIcon,
  Kanban,
  User,
  ArrowUpDown,
  Layers,
  Shirt,
} from 'lucide-react';
import {
  TailorOrder,
  OrderStatus,
  ShopProfile,
  PaymentMode,
  StaffTailor,
  TailorCustomer,
} from '../../types';
import { OrderCompletedModal } from './OrderCompletedModal';
import { OrderDeliveryModal } from './OrderDeliveryModal';
import { OrderReceiptModal } from './OrderReceiptModal';
import { ModernOrderPopups, ModernOrderPopupType } from './ModernOrderPopups';
import {
  PromisedDateTimeInput,
  formatDisplayDate,
  formatDisplayTime,
} from './PromisedDateTimeInput';
import { getWhatsAppUrl, clean10DigitPhone, formatDisplayPhone } from '../../lib/phoneUtils';
import { roomDb } from '../../lib/localRoomDb';
import { useLanguage } from '../../lib/LanguageContext';

interface Screen5OrdersManagerProps {
  orders: TailorOrder[];
  shopProfile?: ShopProfile;
  tailors?: StaffTailor[];
  existingCustomers?: TailorCustomer[];
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
  onNewStitchClick?: () => void;
  onNewAlterClick?: () => void;
  onNewSaleClick?: () => void;
  onNewAppointmentClick?: () => void;
  onSaveOrder?: (order: TailorOrder) => void;
  initialTab?: 'all' | 'cutting' | 'stitching' | 'overdue' | 'completed' | 'archived';
  isDesktopView?: boolean;
}

type OrderTabFilter = 'all' | 'cutting' | 'stitching' | 'overdue' | 'completed' | 'archived';
type ViewMode = 'table' | 'kanban' | 'cards';

// Monday.com Status Palette Colors & Labels
const MONDAY_STATUS_COLORS: Record<OrderStatus, { bg: string; text: string; label: string }> = {
  'New / Cutting': { bg: 'bg-[#579bfc]', text: 'text-white', label: 'Cutting / New' },
  'Assigned': { bg: 'bg-[#579bfc]', text: 'text-white', label: 'Assigned' },
  'Stitching in Progress': { bg: 'bg-[#fdab3d]', text: 'text-white', label: 'Working on it' },
  'Trial': { bg: 'bg-[#a25ddc]', text: 'text-white', label: 'Trial / Fitting' },
  'In Alteration / Fitting': { bg: 'bg-[#a25ddc]', text: 'text-white', label: 'In Alteration' },
  'Completed': { bg: 'bg-[#00c875]', text: 'text-white', label: 'Ready / Done' },
  'Delivered': { bg: 'bg-[#008060]', text: 'text-white', label: 'Delivered' },
};

export const Screen5OrdersManager: React.FC<Screen5OrdersManagerProps> = ({
  orders,
  shopProfile,
  tailors = [],
  existingCustomers = [],
  onBack,
  onSelectOrder,
  onArchiveOrder,
  onUnarchiveOrder,
  onExtendDueDate,
  onUpdateStatus,
  onDeliverOrder,
  onAssignTimelineClick,
  onNewOrderClick,
  onNewStitchClick,
  onNewAlterClick,
  onNewSaleClick,
  onNewAppointmentClick,
  onSaveOrder,
  initialTab = 'all',
  isDesktopView = false,
}) => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<OrderTabFilter>(initialTab);
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [activePopupType, setActivePopupType] = useState<ModernOrderPopupType>(null);

  // Sync tab when initialTab changes
  useEffect(() => {
    if (initialTab && initialTab !== activeTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const handleTabChange = (tab: OrderTabFilter) => {
    setActiveTab(tab);
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGarmentFilter, setSelectedGarmentFilter] = useState<string>('ALL');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<'ALL' | 'Stitch' | 'Alteration' | 'Sale'>('ALL');
  const [sortBy, setSortBy] = useState<'newest' | 'due_soonest' | 'oldest' | 'balance_high' | 'overdue_most'>('newest');
  
  // Collapsed group states
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({
    'overdue': false,
    'stitch': false,
    'alteration': false,
    'sale': false,
    'completed': false,
  });

  const toggleGroup = (groupId: string) => {
    setCollapsedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

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
  const [activeStatusMenuOrderId, setActiveStatusMenuOrderId] = useState<string | null>(null);
  const [playingVoiceOrderId, setPlayingVoiceOrderId] = useState<string | null>(null);
  const audioPlaybackRef = useRef<HTMLAudioElement | null>(null);

  // Toast Feedback State
  const [toastMsg, setToastMsg] = useState<{ id: string; text: string } | null>(null);

  const showToast = (id: string, text: string) => {
    setToastMsg({ id, text });
    setTimeout(() => {
      setToastMsg((curr) => (curr?.id === id ? null : curr));
    }, 3000);
  };

  // 1-Click Action: Mark Ready (Completed)
  const handleQuickMarkReady = async (order: TailorOrder, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await roomDb.updateOrderStatus(order.id, 'Completed');
      if (onUpdateStatus) {
        onUpdateStatus(order.id, 'Completed');
      }
      showToast(order.id, 'Marked as Ready! 🎉');
    } catch (err) {
      console.error('Failed to mark order as Ready:', err);
    }
  };

  // 1-Click Action: Mark Delivered (Auto-settles any remaining balance)
  const handleQuickMarkDelivered = async (order: TailorOrder, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const settledAmount = order.balanceDue;
      await roomDb.updateOrderStatus(order.id, 'Delivered');
      if (onUpdateStatus) {
        onUpdateStatus(order.id, 'Delivered');
      }
      showToast(
        order.id,
        settledAmount > 0
          ? `Delivered & Settled ₹${settledAmount.toLocaleString('en-IN')} Due! ✅`
          : 'Order Delivered! ✅'
      );
    } catch (err) {
      console.error('Failed to mark order as Delivered:', err);
    }
  };
  // Active vs Archived orders
  const activeOrders = useMemo(() => orders.filter((o) => !o.isArchived), [orders]);
  const archivedOrders = useMemo(() => orders.filter((o) => o.isArchived), [orders]);

  // Overdue count
  const overdueCount = useMemo(() => activeOrders.filter((o) => o.isOverdue).length, [activeOrders]);

  // Tab-filtered base list
  const tabFilteredOrders = useMemo(() => {
    switch (activeTab) {
      case 'all':
        return activeOrders;
      case 'cutting':
        return activeOrders.filter((o) => o.status === 'New / Cutting');
      case 'stitching':
        return activeOrders.filter((o) => o.status === 'Stitching in Progress' || o.status === 'Trial');
      case 'overdue':
        return activeOrders.filter((o) => o.isOverdue);
      case 'completed':
        return activeOrders.filter((o) => o.status === 'Completed' || o.status === 'Delivered');
      case 'archived':
        return archivedOrders;
      default:
        return activeOrders;
    }
  }, [activeTab, activeOrders, archivedOrders]);

  // Search and dropdown filters
  const filteredOrders = useMemo(() => {
    return tabFilteredOrders.filter((o) => {
      const q = (searchQuery || '').toLowerCase();
      const matchesSearch =
        !q ||
        Boolean(o.customerName && typeof o.customerName === 'string' && o.customerName.toLowerCase().includes(q)) ||
        Boolean(o.customerPhone && typeof o.customerPhone === 'string' && o.customerPhone.includes(searchQuery)) ||
        Boolean(o.id && typeof o.id === 'string' && o.id.toLowerCase().includes(q)) ||
        Boolean(o.garmentType && typeof o.garmentType === 'string' && o.garmentType.toLowerCase().includes(q));

      const matchesGarment = selectedGarmentFilter === 'ALL' || o.garmentType === selectedGarmentFilter;
      const matchesCategory =
        selectedCategoryFilter === 'ALL' ||
        (selectedCategoryFilter === 'Stitch' && (o.orderCategory === 'Stitch' || o.orderCategory === 'New Stitch' || !o.orderCategory)) ||
        (selectedCategoryFilter === 'Alteration' && (o.orderCategory === 'Alteration' || o.orderCategory === 'Repair')) ||
        (selectedCategoryFilter === 'Sale' && o.orderCategory === 'Sale');

      return matchesSearch && matchesGarment && matchesCategory;
    });
  }, [tabFilteredOrders, searchQuery, selectedGarmentFilter, selectedCategoryFilter]);

  // Helper to extract numerical timestamp for sorting
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

  // Sorting
  const sortedOrders = useMemo(() => {
    const list = [...filteredOrders];
    list.sort((a, b) => {
      if (sortBy === 'newest') {
        const timeDiff = getOrderTimestamp(b) - getOrderTimestamp(a);
        if (timeDiff !== 0) return timeDiff;
        return (b.id || '').localeCompare(a.id || '');
      }
      if (sortBy === 'oldest') {
        const timeDiff = getOrderTimestamp(a) - getOrderTimestamp(b);
        if (timeDiff !== 0) return timeDiff;
        return (a.id || '').localeCompare(b.id || '');
      }
      if (sortBy === 'due_soonest') {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
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

  // Grouping for Monday.com Tables
  const groupedOrders = useMemo(() => {
    const overdueList = sortedOrders.filter((o) => o.isOverdue && o.status !== 'Delivered');
    const stitchList = sortedOrders.filter((o) => 
      (!o.isOverdue || o.status === 'Delivered') && 
      (o.status !== 'Completed' && o.status !== 'Delivered') && 
      (o.orderCategory === 'Stitch' || o.orderCategory === 'New Stitch' || !o.orderCategory)
    );
    const alterationList = sortedOrders.filter((o) => 
      (!o.isOverdue || o.status === 'Delivered') && 
      (o.status !== 'Completed' && o.status !== 'Delivered') && 
      (o.orderCategory === 'Alteration' || o.orderCategory === 'Repair')
    );
    const saleList = sortedOrders.filter((o) => 
      (!o.isOverdue || o.status === 'Delivered') && 
      (o.status !== 'Completed' && o.status !== 'Delivered') && 
      (o.orderCategory === 'Sale')
    );
    const completedList = sortedOrders.filter((o) => 
      o.status === 'Completed' || o.status === 'Delivered'
    );

    return {
      overdue: overdueList,
      stitch: stitchList,
      alteration: alterationList,
      sale: saleList,
      completed: completedList,
    };
  }, [sortedOrders]);

  // Financial aggregates
  const totalRevenue = useMemo(() => orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0), [orders]);
  const totalBalanceDue = useMemo(() => sortedOrders.reduce((sum, o) => sum + (o.balanceDue || 0), 0), [sortedOrders]);

  const uniqueGarments = useMemo(() => {
    const set = new Set<string>();
    orders.forEach((o) => {
      if (o.garmentType) set.add(o.garmentType);
    });
    return Array.from(set);
  }, [orders]);

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
        console.warn('Audio playback error:', err);
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
    setActiveStatusMenuOrderId(null);
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

  const formatDueDisplay = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    } catch {
      return dateStr;
    }
  };

  // Render a Single Table Group
  const renderMondayTableGroup = (
    groupId: string,
    title: string,
    icon: string,
    colorHex: string,
    orderList: TailorOrder[],
    emptyMessage: string
  ) => {
    if (orderList.length === 0 && (groupId === 'overdue' || searchQuery)) return null;

    const isCollapsed = collapsedGroups[groupId];
    const groupTotal = orderList.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const groupBalance = orderList.reduce((sum, o) => sum + (o.balanceDue || 0), 0);
    const groupAdvance = orderList.reduce((sum, o) => sum + (o.advancePaid || 0), 0);

    const getStatusBadgeStyle = (status: OrderStatus) => {
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

    return (
      <div key={groupId} className="mb-5 rounded-2xl bg-white shadow-xs border border-slate-200 overflow-hidden">
        {/* Group Header Bar */}
        <div 
          onClick={() => toggleGroup(groupId)}
          className="px-4 py-2.5 flex items-center justify-between cursor-pointer hover:bg-slate-50/90 transition-colors border-b border-slate-200 select-none bg-slate-50/50"
        >
          <div className="flex items-center gap-2.5">
            <button 
              type="button" 
              className="p-1 rounded-md text-slate-500 hover:bg-slate-200/80 transition-colors"
              style={{ color: colorHex }}
            >
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isCollapsed ? '-rotate-90' : ''}`} />
            </button>
            <span className="text-lg leading-none">{icon}</span>
            <h3 className="font-extrabold text-xs sm:text-sm tracking-tight text-slate-900">
              {title}
            </h3>
            <span className="text-[11px] font-bold text-slate-600 bg-white border border-slate-200 px-2.5 py-0.5 rounded-full shadow-2xs">
              {orderList.length} {orderList.length === 1 ? 'order' : 'orders'}
            </span>
          </div>

          <div className="flex items-center gap-2.5 text-xs font-semibold">
            <span className="hidden sm:inline text-slate-600">Total: <strong className="text-slate-900 font-bold font-mono">₹{groupTotal.toLocaleString('en-IN')}</strong></span>
            {groupBalance > 0 ? (
              <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200 text-[10px] font-bold">
                Due: ₹{groupBalance.toLocaleString('en-IN')}
              </span>
            ) : (
              <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 text-[10px] font-bold hidden sm:inline-block">
                ✓ Fully Settled
              </span>
            )}
          </div>
        </div>

        {/* Group Content Body */}
        {!isCollapsed && (
          <div>
            {/* ================= DESKTOP TABLE VIEW (md+) ================= */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                {/* Header Row */}
                <thead>
                  <tr className="bg-slate-50/80 text-slate-500 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200 select-none">
                    <th className="w-10 px-3 py-2.5 text-center border-r border-slate-200/80">
                      <input type="checkbox" className="rounded border-slate-300 text-emerald-700 focus:ring-0 cursor-pointer" />
                    </th>
                    <th className="px-3.5 py-2.5 min-w-[240px] border-r border-slate-200/80">Customer / Order</th>
                    <th className="px-3 py-2.5 min-w-[150px] text-center border-r border-slate-200/80">Status</th>
                    <th className="px-3 py-2.5 min-w-[110px] border-r border-slate-200/80">Promised Date</th>
                    <th className="px-3 py-2.5 min-w-[85px] text-right border-r border-slate-200/80">Total (₹)</th>
                    <th className="px-3 py-2.5 min-w-[85px] text-right border-r border-slate-200/80">Advance (₹)</th>
                    <th className="px-3 py-2.5 min-w-[90px] text-right border-r border-slate-200/80">Balance (₹)</th>
                    <th className="px-3 py-2.5 min-w-[170px] text-center">Ready / Deliver Actions</th>
                  </tr>
                </thead>

                {/* Rows */}
                <tbody className="divide-y divide-slate-100">
                  {orderList.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-6 text-center text-xs text-slate-400">
                        {emptyMessage}
                      </td>
                    </tr>
                  ) : (
                    orderList.map((order) => {
                      const statusStyle = getStatusBadgeStyle(order.status);
                      const isVoicePlaying = playingVoiceOrderId === order.id;
                      const isSale = order.orderCategory === 'Sale';
                      const isAlteration = order.orderCategory === 'Alteration';
                      const catLabel = isSale ? 'Sale' : isAlteration ? 'Alter' : 'Stitch';
                      const catBg = isSale
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : isAlteration
                        ? 'bg-purple-50 text-purple-700 border-purple-200'
                        : 'bg-emerald-50 text-emerald-800 border-emerald-200';

                      const initials = order.customerName
                        ? order.customerName
                            .split(' ')
                            .filter(Boolean)
                            .slice(0, 2)
                            .map((w) => w[0].toUpperCase())
                            .join('')
                        : 'C';

                      const cleanPhone = order.customerPhone ? order.customerPhone.replace(/\D/g, '') : '';
                      const intlPhone = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;
                      const whatsappUrl = getWhatsAppUrl(
                        intlPhone,
                        `Hello ${order.customerName}, update regarding your order #${order.id} (${order.garmentType || 'Garment'}) from ${shopProfile?.shopName || 'our shop'}: Status: ${order.status}, Due: ${order.dueDate}, Total: ₹${order.totalAmount}, Balance: ₹${order.balanceDue}.`
                      );

                      return (
                        <tr 
                          key={order.id} 
                          className="h-11 hover:bg-slate-50/90 transition-colors group cursor-pointer"
                          onClick={() => setReceiptModalOrder(order)}
                        >
                          {/* Checkbox Column with Group Left Border Indicator */}
                          <td 
                            className="px-3 py-1.5 text-center border-r border-slate-100 relative"
                            style={{ borderLeft: `4px solid ${colorHex}` }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input type="checkbox" className="rounded border-slate-300 text-emerald-700 focus:ring-0 cursor-pointer" />
                          </td>

                          {/* Customer / Order Column */}
                          <td className="px-3.5 py-1.5 border-r border-slate-100">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 text-[#0B4636] flex items-center justify-center text-[10px] font-black shrink-0 shadow-2xs">
                                {initials}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 flex-nowrap">
                                  <span className="font-bold text-slate-900 truncate group-hover:text-emerald-800 transition-colors text-xs">
                                    {order.customerName}
                                  </span>
                                  <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
                                    {order.id}
                                  </span>
                                  <span className={`px-1.5 py-0.2 rounded text-[9px] font-extrabold border shrink-0 ${catBg}`}>
                                    {catLabel}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium mt-0.5 truncate">
                                  <span className="text-slate-800 font-semibold truncate">
                                    {isSale ? '🛍️' : isAlteration ? '✂️' : '🧵'} {order.garmentType || 'Garment'}
                                  </span>
                                  {order.customerPhone && (
                                    <>
                                      <span className="text-slate-300">•</span>
                                      <span className="font-mono text-[10px] text-slate-500">{order.customerPhone}</span>
                                    </>
                                  )}
                                  {order.voiceNoteUrl && (
                                    <button
                                      type="button"
                                      onClick={(e) => handleToggleVoicePlay(order, e)}
                                      className={`px-1 py-0.2 rounded text-[9px] font-bold flex items-center gap-0.5 shrink-0 border ${
                                        isVoicePlaying
                                          ? 'bg-purple-600 text-white border-purple-600 animate-pulse'
                                          : 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'
                                      }`}
                                      title="Play Voice Audio Note"
                                    >
                                      {isVoicePlaying ? <Pause className="w-2.5 h-2.5" /> : <Play className="w-2.5 h-2.5" />}
                                      <span>Audio</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Status Column (Modern Rounded Pill with Dropdown Trigger) */}
                          <td className="px-3 py-1.5 border-r border-slate-100 text-center relative" onClick={(e) => e.stopPropagation()}>
                            <button 
                              type="button" 
                              onClick={() => setActiveStatusMenuOrderId(activeStatusMenuOrderId === order.id ? null : order.id)}
                              className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full border shadow-2xs transition-all hover:scale-102 cursor-pointer ${statusStyle.bg}`}
                            >
                              <span className={`w-2 h-2 rounded-full ${statusStyle.dot} shrink-0`} />
                              <span className="truncate max-w-[100px]">{statusStyle.label}</span>
                              <ChevronDown className="w-2.5 h-2.5 opacity-60 ml-0.5" />
                            </button>

                            {/* Status Picker Popup */}
                            {activeStatusMenuOrderId === order.id && (
                              <div className="absolute z-50 top-full left-1/2 -translate-x-1/2 mt-1 w-48 bg-white rounded-xl shadow-xl border border-slate-200 p-1.5 space-y-1 animate-in fade-in zoom-in-95 duration-100">
                                <div className="text-[10px] font-extrabold text-slate-400 uppercase px-2 py-0.5 tracking-wider">Change Status</div>
                                {(['New / Cutting', 'Stitching in Progress', 'Trial', 'Completed', 'Delivered'] as OrderStatus[]).map((st) => {
                                  const cfg = getStatusBadgeStyle(st);
                                  return (
                                    <button
                                      key={st}
                                      type="button"
                                      onClick={() => handleStatusChangeRequest(order, st)}
                                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-bold ${cfg.bg} border flex items-center justify-between cursor-pointer hover:brightness-95 transition-all`}
                                    >
                                      <div className="flex items-center gap-1.5">
                                        <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                                        <span>{cfg.label}</span>
                                      </div>
                                      {order.status === st && <Check className="w-3 h-3" />}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </td>

                          {/* Promised Date Column */}
                          <td className="px-3 py-1.5 border-r border-slate-100">
                            <div className="flex items-center gap-1.5">
                              <Calendar className={`w-3.5 h-3.5 ${order.isOverdue ? 'text-rose-600' : 'text-slate-400'} shrink-0`} />
                              <span className={`text-[11px] font-semibold ${order.isOverdue ? 'text-rose-600 font-bold' : 'text-slate-700'}`}>
                                {formatDueDisplay(order.dueDate)}
                              </span>
                              {order.isOverdue && (
                                <span className="px-1 py-0.2 rounded text-[9px] font-black bg-rose-600 text-white animate-pulse">
                                  LATE
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Total Amount (₹) */}
                          <td className="px-3 py-1.5 text-right font-black font-mono text-slate-900 border-r border-slate-100 text-xs">
                            ₹{order.totalAmount.toLocaleString('en-IN')}
                          </td>

                          {/* Advance Paid (₹) */}
                          <td className="px-3 py-1.5 text-right text-slate-600 border-r border-slate-100 font-mono text-[11px]">
                            ₹{order.advancePaid.toLocaleString('en-IN')}
                          </td>

                          {/* Balance Due (₹) */}
                          <td className="px-3 py-1.5 text-right border-r border-slate-100">
                            {order.balanceDue > 0 ? (
                              <span className="font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200 text-[10px] font-mono">
                                ₹{order.balanceDue.toLocaleString('en-IN')}
                              </span>
                            ) : (
                              <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 font-bold text-[10px]">
                                Paid
                              </span>
                            )}
                          </td>

                          {/* Actions Column */}
                          <td className="px-2 py-1.5 text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1 flex-nowrap">
                              {/* Toast Notification Inline when updated */}
                              {toastMsg?.id === order.id ? (
                                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 animate-pulse">
                                  {toastMsg.text}
                                </span>
                              ) : (
                                <>
                                  {/* Ready Button */}
                                  {order.status !== 'Completed' && order.status !== 'Delivered' && (
                                    <button
                                      type="button"
                                      onClick={(e) => handleQuickMarkReady(order, e)}
                                      className="h-6.5 px-2 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold flex items-center gap-0.5 shadow-2xs cursor-pointer active:scale-95 transition-all whitespace-nowrap"
                                      title="Mark Ready to Deliver (Completed)"
                                    >
                                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                                      <span>Ready</span>
                                    </button>
                                  )}

                                  {/* Deliver Button */}
                                  {order.status !== 'Delivered' && (
                                    <button
                                      type="button"
                                      onClick={(e) => handleQuickMarkDelivered(order, e)}
                                      className="h-6.5 px-2 rounded-md bg-teal-700 hover:bg-teal-800 text-white text-[10px] font-bold flex items-center gap-0.5 shadow-2xs cursor-pointer active:scale-95 transition-all whitespace-nowrap"
                                      title="Mark Delivered (Auto-settles balance)"
                                    >
                                      <span>Deliver</span>
                                    </button>
                                  )}

                                  {order.customerPhone && (
                                    <a
                                      href={whatsappUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="h-6.5 w-6.5 rounded-md bg-[#25D366] hover:bg-[#1faa4b] text-white flex items-center justify-center shadow-2xs transition-transform hover:scale-105"
                                      title="Send WhatsApp Update"
                                    >
                                      <MessageSquare className="w-3 h-3 fill-white" />
                                    </a>
                                  )}

                                  {order.customerPhone && (
                                    <a
                                      href={`tel:${order.customerPhone}`}
                                      className="h-6.5 w-6.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors"
                                      title="Call Customer"
                                    >
                                      <Phone className="w-3 h-3" />
                                    </a>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => setReceiptModalOrder(order)}
                                    className="h-6.5 w-6.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors"
                                    title="View Bill / Receipt"
                                  >
                                    <FileText className="w-3 h-3" />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => setReceiptModalOrder(order)}
                                    className="h-6.5 px-2 rounded-md bg-[#0B4636] hover:bg-[#073024] text-amber-300 flex items-center justify-center gap-1 transition-all hover:scale-105 shadow-2xs font-bold text-xs"
                                    title="View Order Receipt Slip"
                                  >
                                    <span>Receipt</span>
                                    <ChevronRight className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}

                  {/* + Add Order Row */}
                  {onNewOrderClick && (
                    <tr className="h-9 hover:bg-slate-50/80 transition-colors">
                      <td colSpan={8} className="px-3.5 py-1">
                        <button
                          type="button"
                          onClick={onNewOrderClick}
                          className="text-xs font-bold text-emerald-800 hover:text-emerald-900 flex items-center gap-1.5 cursor-pointer py-1 px-2 rounded-md hover:bg-emerald-50 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>+ Add Order to this group</span>
                        </button>
                      </td>
                    </tr>
                  )}

                  {/* Summary / Calculation Row */}
                  <tr className="bg-slate-50/90 text-slate-700 font-bold text-[11px] border-t border-slate-200 select-none">
                    <td className="px-3 py-2 text-center border-r border-slate-200 text-slate-400">∑</td>
                    <td className="px-3.5 py-2 border-r border-slate-200 text-slate-600 font-medium">
                      {orderList.length} items
                    </td>
                    <td className="px-3 py-2 border-r border-slate-200"></td>
                    <td className="px-3 py-2 border-r border-slate-200"></td>
                    <td className="px-3 py-2 text-right text-slate-900 border-r border-slate-200 font-mono font-black">
                      ₹{groupTotal.toLocaleString('en-IN')}
                    </td>
                    <td className="px-3 py-2 text-right text-slate-600 border-r border-slate-200 font-mono">
                      ₹{groupAdvance.toLocaleString('en-IN')}
                    </td>
                    <td className="px-3 py-2 text-right border-r border-slate-200 font-mono">
                      <span className={groupBalance > 0 ? 'text-rose-700' : 'text-emerald-700'}>
                        ₹{groupBalance.toLocaleString('en-IN')}
                      </span>
                    </td>
                    <td className="px-3 py-2"></td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* ================= MOBILE VIEW (< md) ================= */}
            <div className="block md:hidden divide-y-2 divide-slate-100">
              {orderList.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  {emptyMessage}
                </div>
              ) : (
                orderList.map((order) => {
                  const statusStyle = getStatusBadgeStyle(order.status);
                  const isSale = order.orderCategory === 'Sale';
                  const isAlteration = order.orderCategory === 'Alteration';
                  const catLabel = isSale ? 'Sale' : isAlteration ? 'Alter' : 'Stitch';
                  const catBg = isSale
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : isAlteration
                    ? 'bg-purple-50 text-purple-700 border-purple-200'
                    : 'bg-blue-50 text-blue-700 border-blue-200';

                  const cleanPhone = order.customerPhone ? order.customerPhone.replace(/\D/g, '') : '';
                  const intlPhone = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;
                  const whatsappUrl = getWhatsAppUrl(
                    intlPhone,
                    `Hello ${order.customerName}, update regarding order #${order.id}: Status: ${order.status}, Balance Due: ₹${order.balanceDue}.`
                  );

                  return (
                    <div
                      key={order.id}
                      onClick={() => onSelectOrder(order)}
                      className="p-3.5 space-y-2.5 hover:bg-slate-50 transition-colors cursor-pointer relative"
                      style={{ borderLeft: `4px solid ${colorHex}` }}
                    >
                      {/* Top Row: Order ID, Category, Status Badge */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[11px] font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                            {order.id}
                          </span>
                          <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-md border ${catBg}`}>
                            {catLabel}
                          </span>
                          {order.isOverdue && (
                            <span className="px-1.5 py-0.5 bg-rose-600 text-white text-[9px] font-black rounded shadow-2xs animate-pulse">
                              LATE
                            </span>
                          )}
                        </div>

                        <span
                          className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-0.5 rounded-full border shadow-2xs ${statusStyle.bg}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot} shrink-0`} />
                          <span>{statusStyle.label}</span>
                        </span>
                      </div>

                      {/* Middle Row: Garment & Customer */}
                      <div className="flex items-start justify-between gap-3 pt-1 border-t border-slate-100">
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-bold text-slate-900 truncate flex items-center gap-1.5">
                            <span>{isSale ? '🛍️' : isAlteration ? '✂️' : '🧵'}</span>
                            <span className="truncate">{order.garmentType || 'Garment Item'}</span>
                          </div>
                          <div className="text-xs text-slate-600 font-medium flex items-center gap-1.5 mt-0.5 truncate">
                            <span className="font-semibold text-slate-800 truncate">{order.customerName}</span>
                            {order.customerPhone && (
                              <>
                                <span className="text-slate-300">•</span>
                                <span className="font-mono text-slate-500 text-[11px]">{order.customerPhone}</span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Amount & Settlement */}
                        <div className="text-right shrink-0">
                          <div className="text-sm font-black font-mono text-slate-900">
                            ₹{order.totalAmount.toLocaleString('en-IN')}
                          </div>
                          {order.balanceDue > 0 ? (
                            <div className="text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">
                              Due: ₹{order.balanceDue.toLocaleString('en-IN')}
                            </div>
                          ) : (
                            <div className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                              ✓ Paid Full
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Bottom Row: Delivery date & Actions */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                        <div className="flex items-center gap-2 text-slate-600 text-[11px]">
                          <span className="flex items-center gap-1 font-semibold text-slate-700">
                            <Calendar className={`w-3 h-3 ${order.isOverdue ? 'text-rose-600' : 'text-slate-400'}`} />
                            {formatDueDisplay(order.dueDate)}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                          {order.customerPhone && (
                            <a
                              href={whatsappUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="h-7 w-7 rounded-lg bg-[#25D366] hover:bg-[#1faa4b] text-white flex items-center justify-center shadow-xs"
                              title="WhatsApp"
                            >
                              <MessageSquare className="w-3.5 h-3.5 fill-white" />
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => setReceiptModalOrder(order)}
                            className="h-7 w-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center"
                            title="Bill"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setReceiptModalOrder(order)}
                            className="h-7 px-2.5 rounded-lg bg-[#0B4636] text-amber-300 text-xs font-bold flex items-center gap-1 shadow-xs"
                          >
                            <span>Receipt</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}

              {/* Mobile Summary */}
              <div className="p-3 bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-between border-t border-slate-200">
                <span>{orderList.length} items</span>
                <div className="flex items-center gap-3">
                  <span className="font-mono">Total: ₹{groupTotal.toLocaleString('en-IN')}</span>
                  {groupBalance > 0 && (
                    <span className="text-rose-700 font-mono">Due: ₹{groupBalance.toLocaleString('en-IN')}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render Kanban Board View
  const renderKanbanView = () => {
    const columns: { status: OrderStatus; label: string; color: string }[] = [
      { status: 'New / Cutting', label: 'Cutting / New', color: '#579bfc' },
      { status: 'Stitching in Progress', label: 'Stitching', color: '#fdab3d' },
      { status: 'Trial', label: 'Trial & Fitting', color: '#a25ddc' },
      { status: 'Completed', label: 'Completed / Ready', color: '#00c875' },
      { status: 'Delivered', label: 'Delivered', color: '#008060' },
    ];

    return (
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3.5 pb-6 overflow-x-auto">
        {columns.map((col) => {
          const colOrders = sortedOrders.filter((o) => o.status === col.status);
          const colTotal = colOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

          return (
            <div key={col.status} className="bg-[#f0f3f7] rounded-lg p-2.5 border border-[#d0d4e4] flex flex-col min-h-[500px]">
              {/* Column Header */}
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#d0d4e4]">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: col.color }} />
                  <h4 className="font-bold text-xs text-slate-800">{col.label}</h4>
                  <span className="text-[10px] font-bold bg-white text-slate-600 px-1.5 py-0.2 rounded-full shadow-2xs">
                    {colOrders.length}
                  </span>
                </div>
                <span className="text-[10px] font-bold text-slate-500">₹{colTotal.toLocaleString('en-IN')}</span>
              </div>

              {/* Cards List */}
              <div className="space-y-2 flex-1 overflow-y-auto max-h-[70vh]">
                {colOrders.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-400 italic">No orders in this stage</div>
                ) : (
                  colOrders.map((order) => (
                    <div
                      key={order.id}
                      onClick={() => setReceiptModalOrder(order)}
                      className="bg-white rounded-lg p-2.5 border border-[#d0d4e4] shadow-2xs hover:shadow-sm hover:border-emerald-700 transition-all cursor-pointer space-y-2 group"
                    >
                      <div className="flex items-start justify-between gap-1">
                        <div className="min-w-0">
                          <h5 className="font-bold text-xs text-slate-900 truncate group-hover:text-emerald-800">
                            {order.customerName}
                          </h5>
                          <span className="text-[10px] text-slate-500 font-mono">#{order.id.slice(0, 8)}</span>
                        </div>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#f0f3f7] text-slate-700 shrink-0">
                          {order.garmentType}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] pt-1 border-t border-[#f0f3f7]">
                        <span className="font-bold text-slate-900">₹{order.totalAmount}</span>
                        {order.balanceDue > 0 ? (
                          <span className="text-[#e2445c] font-bold text-[10px]">Due: ₹{order.balanceDue}</span>
                        ) : (
                          <span className="text-[#00c875] font-bold text-[10px]">Paid</span>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-500">
                        <span className={`font-semibold ${order.isOverdue ? 'text-[#e2445c] font-bold' : ''}`}>
                          Due: {formatDueDisplay(order.dueDate)}
                        </span>
                      </div>

                      {/* Kanban Action Buttons */}
                      <div className="flex items-center justify-end gap-1 pt-1.5 border-t border-[#f0f3f7]" onClick={(e) => e.stopPropagation()}>
                        {order.status !== 'Completed' && order.status !== 'Delivered' && (
                          <button
                            type="button"
                            onClick={(e) => handleQuickMarkReady(order, e)}
                            className="h-5.5 px-2 rounded bg-[#00c875] hover:bg-[#00a35f] text-white text-[10px] font-bold flex items-center gap-1 shadow-2xs cursor-pointer active:scale-95 transition-all"
                            title="Mark Ready to Deliver"
                          >
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                            <span>Ready</span>
                          </button>
                        )}

                        {order.status !== 'Delivered' && (
                          <button
                            type="button"
                            onClick={(e) => handleQuickMarkDelivered(order, e)}
                            className="h-5.5 px-2 rounded bg-[#008060] hover:bg-[#006048] text-white text-[10px] font-bold flex items-center gap-1 shadow-2xs cursor-pointer active:scale-95 transition-all"
                            title="Mark Delivered & Settle Balance"
                          >
                            <span>Deliver</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Add Order quick trigger */}
              {onNewOrderClick && (
                <button
                  type="button"
                  onClick={onNewOrderClick}
                  className="mt-2 w-full py-1.5 rounded bg-white hover:bg-slate-100 text-emerald-800 font-semibold text-xs border border-dashed border-slate-300 flex items-center justify-center gap-1 cursor-pointer transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Order</span>
                </button>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-full font-sans pb-12">
      {/* ================= 1. MONDAY.COM BOARD HEADER & TOOLBAR ================= */}
      <div className="bg-white rounded-lg p-3.5 sm:p-4 border border-[#d0d4e4] shadow-2xs mb-4 space-y-3">
        {/* Board Title & Top Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#e6e9ef]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-800 text-white flex items-center justify-center font-bold shadow-2xs">
              <TableIcon className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  Orders & Deliveries Board
                </h1>
                <span className="text-xs font-semibold bg-[#f0f3f7] text-slate-600 px-2 py-0.5 rounded-full">
                  {orders.length} total
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Track tailor capacity, cut-to-stitch lifecycle, client fittings, and payment settlement.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap self-end sm:self-auto">
            {/* Quick Action 1: Stitch Popup */}
            <button
              type="button"
              onClick={() => {
                if (onNewStitchClick) onNewStitchClick();
                else setActivePopupType('stitch');
              }}
              className="bg-[#0B4636] hover:bg-[#073327] text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
              title="Open Bespoke Stitching Popup"
            >
              <Shirt className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>+ Stitch</span>
            </button>

            {/* Quick Action 2: Alter Popup */}
            <button
              type="button"
              onClick={() => {
                if (onNewAlterClick) onNewAlterClick();
                else setActivePopupType('alter');
              }}
              className="bg-sky-700 hover:bg-sky-800 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
              title="Open Alteration & Fitting Popup"
            >
              <Scissors className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>+ Alter</span>
            </button>

            {/* Quick Action 3: Sale Popup */}
            <button
              type="button"
              onClick={() => {
                if (onNewSaleClick) onNewSaleClick();
                else setActivePopupType('sale');
              }}
              className="bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
              title="Open Retail Ready-Made Sale Popup"
            >
              <ShoppingBag className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>+ Sale</span>
            </button>

            {/* Quick Action 4: Appointment Popup */}
            <button
              type="button"
              onClick={() => {
                if (onNewAppointmentClick) onNewAppointmentClick();
                else setActivePopupType('appointment');
              }}
              className="bg-purple-700 hover:bg-purple-800 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
              title="Book Client Appointment / Fitting"
            >
              <Calendar className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>+ Appt</span>
            </button>

            <button
              type="button"
              onClick={onBack}
              className="text-xs font-semibold text-slate-700 hover:bg-[#f0f3f7] px-3 py-1.5 rounded-lg border border-[#d0d4e4] flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          </div>
        </div>

        {/* View Tabs & Search Filter Toolbar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-0.5">
          {/* View Modes (Main Table, Kanban, Cards) */}
          <div className="flex items-center gap-1 bg-[#f0f3f7] p-1 rounded-md border border-[#d0d4e4] w-fit">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`px-3 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white text-emerald-800 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Main Table</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'kanban'
                  ? 'bg-white text-emerald-800 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              <span>Kanban Board</span>
            </button>
          </div>

          {/* Search, Filter, and Sort Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search this board..."
                className="bg-white border border-[#d0d4e4] rounded-md pl-8 pr-2.5 py-1 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-emerald-700 w-48 sm:w-56"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Vertical Filter Pills */}
            <div className="flex items-center gap-1 bg-[#f0f3f7] p-0.5 rounded-md border border-[#d0d4e4]">
              <button
                type="button"
                onClick={() => setSelectedCategoryFilter('ALL')}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                  selectedCategoryFilter === 'ALL'
                    ? 'bg-white text-slate-900 font-bold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setSelectedCategoryFilter('Stitch')}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                  selectedCategoryFilter === 'Stitch'
                    ? 'bg-emerald-800 text-white font-bold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Stitch
              </button>
              <button
                type="button"
                onClick={() => setSelectedCategoryFilter('Alteration')}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                  selectedCategoryFilter === 'Alteration'
                    ? 'bg-[#a25ddc] text-white font-bold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Alter
              </button>
              <button
                type="button"
                onClick={() => setSelectedCategoryFilter('Sale')}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                  selectedCategoryFilter === 'Sale'
                    ? 'bg-[#0086c0] text-white font-bold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Retail
              </button>
            </div>

            {/* Sort Select */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-white border border-[#d0d4e4] rounded-md px-2 py-1 text-xs font-medium text-slate-700 focus:outline-none focus:border-emerald-700 cursor-pointer"
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

      {/* ================= 2. MAIN CONTENT VIEW ================= */}
      {viewMode === 'kanban' ? (
        renderKanbanView()
      ) : (
        <div className="space-y-4">
          {/* Overdue Attention Group (if any overdue) */}
          {groupedOrders.overdue.length > 0 && (
            renderMondayTableGroup(
              'overdue',
              '🚨 Overdue & Urgent Attention',
              '⚠️',
              '#e2445c',
              groupedOrders.overdue,
              'No overdue orders.'
            )
          )}

          {/* Stitching & Custom Tailoring Orders Group */}
          {renderMondayTableGroup(
            'stitch',
            '⚡ Active Stitching Orders',
            '🧵',
            '#047857',
            groupedOrders.stitch,
            'No active stitching orders in this filter.'
          )}

          {/* Alterations & Fittings Group */}
          {renderMondayTableGroup(
            'alteration',
            '✂️ Alterations & Fitting Repairs',
            '✂️',
            '#a25ddc',
            groupedOrders.alteration,
            'No alteration orders.'
          )}

          {/* Ready-Made Retail & Boutique Sales Group */}
          {renderMondayTableGroup(
            'sale',
            '🛍️ Ready-Made Retail & Boutique Sales',
            '🛍️',
            '#0086c0',
            groupedOrders.sale,
            'No retail sales records.'
          )}

          {/* Completed & Delivered Archive Group */}
          {renderMondayTableGroup(
            'completed',
            '✅ Completed & Delivered Orders',
            '🎉',
            '#00c875',
            groupedOrders.completed,
            'No completed orders yet.'
          )}
        </div>
      )}

      {/* ================= MODAL: RECEIPT / BILL MODAL ================= */}
      {receiptModalOrder && (
        <OrderReceiptModal
          order={receiptModalOrder}
          shopProfile={shopProfile}
          onClose={() => setReceiptModalOrder(null)}
          onUpdateStatus={onUpdateStatus}
          onDeliverOrder={onDeliverOrder}
          onRecordPayment={(orderId, amount, mode, note) => {
            roomDb.recordPayment(orderId, amount, mode, note);
          }}
          onAssignTimelineClick={(ord) => {
            setReceiptModalOrder(null);
            if (onAssignTimelineClick) onAssignTimelineClick(ord);
          }}
        />
      )}

      {/* ================= MODAL: ORDER COMPLETED MODAL ================= */}
      {completedModalOrder && (
        <OrderCompletedModal
          order={completedModalOrder}
          shopProfile={shopProfile}
          onClose={() => setCompletedModalOrder(null)}
          onConfirmCompleted={handleConfirmCompleted}
        />
      )}

      {/* ================= MODAL: ORDER DELIVERY MODAL ================= */}
      {deliveryModalOrder && (
        <OrderDeliveryModal
          order={deliveryModalOrder}
          shopProfile={shopProfile}
          onClose={() => setDeliveryModalOrder(null)}
          onConfirmDelivery={handleConfirmDeliverySettlement}
        />
      )}

      {/* ================= MODERN ORDER POPUPS (Stitch, Alter, Sale, Appointment) ================= */}
      <ModernOrderPopups
        isOpen={activePopupType !== null}
        activeType={activePopupType}
        onClose={() => setActivePopupType(null)}
        onSaveOrder={(ord) => {
          if (onSaveOrder) {
            onSaveOrder(ord);
          } else {
            roomDb.saveOrder(ord);
          }
          setActivePopupType(null);
        }}
        shopProfile={shopProfile}
        existingCustomers={existingCustomers}
        tailors={tailors}
        isDesktopView={isDesktopView}
      />
    </div>
  );
};
