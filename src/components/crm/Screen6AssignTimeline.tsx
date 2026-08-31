import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  Scissors,
  Clock,
  Calendar as CalendarIcon,
  UserCheck,
  Check,
  Send,
  AlertCircle,
  Sparkles,
  Search,
  Filter,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Phone,
  Grid,
  List,
  User,
  Users,
  X,
  Zap,
  Plus,
  ArrowRight,
  TrendingUp,
  DollarSign,
  Layers,
  CheckCircle,
  HelpCircle,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Award,
  Wallet,
  Activity,
  Trash2,
} from 'lucide-react';
import { TailorOrder, StaffTailor, OrderStatus } from '../../types';
import {
  calculateWorkerPerformances,
  getEstimatedHoursForGarment,
  checkAndEnrichOrderOverdue,
  generateWorkerScheduleForDays,
  PROCESS_STAGES,
  ProcessStage,
  WorkerPerformanceSummary,
} from '../../lib/workerCapacity';
import { roomDb } from '../../lib/localRoomDb';
import {
  PromisedDateTimeInput,
  formatDisplayDate,
  formatDisplayTime,
  formatFullReadableDate,
} from './PromisedDateTimeInput';
import { getWhatsAppUrl, clean10DigitPhone, formatDisplayPhone } from '../../lib/phoneUtils';
import { useLanguage } from '../../lib/LanguageContext';

interface Screen6AssignTimelineProps {
  order?: TailorOrder | null;
  orders?: TailorOrder[];
  tailors: StaffTailor[];
  onBack: () => void;
  onConfirmAssignment: (
    orderId: string,
    assignedTailor: string,
    estimatedHours: number,
    offerMessage: string,
    dueDate: string,
    dueTime: string
  ) => void;
  onUpdateOrderStatus?: (orderId: string, status: OrderStatus) => void;
  onSelectOrder?: (order: TailorOrder) => void;
  isDesktopView?: boolean;
}

type MainTab = 'karigar_workload' | 'slot_calendar' | 'unassigned_queue' | 'karigars_ledger';

export const Screen6AssignTimeline: React.FC<Screen6AssignTimelineProps> = ({
  order: propOrder,
  orders: propOrders = [],
  tailors: propTailors,
  onBack,
  onConfirmAssignment,
  onUpdateOrderStatus,
  onSelectOrder,
  isDesktopView = false,
}) => {
  const { t } = useLanguage();
  const [allOrders, setAllOrders] = useState<TailorOrder[]>(() =>
    (propOrders.length > 0 ? propOrders : roomDb.getOrders()).map(checkAndEnrichOrderOverdue)
  );

  const [allTailors, setAllTailors] = useState<StaffTailor[]>(() =>
    propTailors.length > 0 ? propTailors : roomDb.getTailors()
  );

  const [activeMainTab, setActiveMainTab] = useState<MainTab>('karigar_workload');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWorkerFilter, setSelectedWorkerFilter] = useState<string>('ALL');

  // Currently focused order for assignment modal/drawer
  const [editingOrder, setEditingOrder] = useState<TailorOrder | null>(propOrder || null);

  // Add Karigar Modal State
  const [showAddKarigarModal, setShowAddKarigarModal] = useState(false);
  const [newKarigarName, setNewKarigarName] = useState('');
  const [newKarigarPhone, setNewKarigarPhone] = useState('');
  const [newKarigarRole, setNewKarigarRole] = useState<'Tailor' | 'Owner'>('Tailor');

  // Modal form states
  const [modalAssignedTailor, setModalAssignedTailor] = useState<string>('Self (Owner)');
  const [modalEstimatedHours, setModalEstimatedHours] = useState<number>(4);
  const [modalDueDate, setModalDueDate] = useState<string>(
    new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [modalDueTime, setModalDueTime] = useState<string>('18:00');
  const [modalOfferMsg, setModalOfferMsg] = useState<string>('');

  // Expanded karigars state for accordion/toggle
  const [expandedKarigars, setExpandedKarigars] = useState<Record<string, boolean>>({
    'Self (Owner)': true,
    'Master Rajesh': true,
  });

  // Calculate worker summaries with 8h/day Mon-Sat model
  const workerSummaries = useMemo(() => {
    return calculateWorkerPerformances(allTailors, allOrders);
  }, [allTailors, allOrders]);

  // Overall shop queue metrics
  const queueMetrics = useMemo(() => {
    const unassigned = allOrders.filter(
      (o) =>
        !o.isArchived &&
        o.status !== 'Completed' &&
        o.status !== 'Delivered' &&
        (!o.assignedTailor || o.assignedTailor === 'Unassigned')
    );
    const inProgress = allOrders.filter(
      (o) => !o.isArchived && o.status !== 'Completed' && o.status !== 'Delivered' && o.assignedTailor && o.assignedTailor !== 'Unassigned'
    );
    const completed = allOrders.filter((o) => o.status === 'Completed' || o.status === 'Delivered');

    const totalHoursBooked = inProgress.reduce(
      (sum, o) => sum + (o.estimatedHours || getEstimatedHoursForGarment(o.garmentType, o.orderCategory)),
      0
    );

    // Total daily shop capacity = active workers * 8 hours
    const totalDailyCapacity = Math.max(8, allTailors.length * 8);
    const totalFreeHoursToday = workerSummaries.reduce((sum, w) => sum + w.freeHoursToday, 0);
    const shopUtilizationRate = Math.min(100, Math.round(((totalDailyCapacity - totalFreeHoursToday) / totalDailyCapacity) * 100));

    return {
      unassignedCount: unassigned.length,
      inProgressCount: inProgress.length,
      completedCount: completed.length,
      totalHoursBooked,
      totalDailyCapacity,
      totalFreeHoursToday,
      shopUtilizationRate: isNaN(shopUtilizationRate) ? 0 : Math.max(0, shopUtilizationRate),
    };
  }, [allOrders, allTailors, workerSummaries]);

  // Handle Quick Stepper Process Status Transition
  const handleUpdateProcessStatus = (orderId: string, targetStatus: OrderStatus) => {
    roomDb.updateOrderStatus(orderId, targetStatus);
    if (onUpdateOrderStatus) {
      onUpdateOrderStatus(orderId, targetStatus);
    }

    // Update local state
    setAllOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: targetStatus, updatedAt: new Date().toISOString() } : o))
    );
  };

  // Open order assignment modal
  const handleOpenAssignModal = (ord: TailorOrder, preselectedTailor?: string, preselectedDate?: string) => {
    setEditingOrder(ord);
    const targetTailor = preselectedTailor || ord.assignedTailor || allTailors[0]?.name || 'Self (Owner)';
    const targetDate =
      ord.dueDate || preselectedDate || new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const targetHours = ord.estimatedHours || getEstimatedHoursForGarment(ord.garmentType, ord.orderCategory);
    const targetTime = ord.dueTime || '18:00';

    setModalAssignedTailor(targetTailor);
    setModalDueDate(targetDate);
    setModalDueTime(targetTime);
    setModalEstimatedHours(targetHours);

    const formattedD = formatDisplayDate(targetDate);
    const formattedT = formatDisplayTime(targetTime);
    setModalOfferMsg(
      `Hello ${ord.customerName}, your ${ord.garmentType} order (${ord.id}) is assigned to ${targetTailor}. Promised delivery: ${formattedD} at ${formattedT}.`
    );
  };

  // Confirm Assignment Submit
  const handleConfirmAssignmentSubmit = () => {
    if (!editingOrder) return;

    onConfirmAssignment(
      editingOrder.id,
      modalAssignedTailor,
      modalEstimatedHours,
      modalOfferMsg || `Your ${editingOrder.garmentType} order will be ready on ${modalDueDate}.`,
      modalDueDate,
      modalDueTime
    );

    // Update local state
    setAllOrders((prev) =>
      prev.map((o) =>
        o.id === editingOrder.id
          ? {
              ...o,
              assignedTailor: modalAssignedTailor,
              estimatedHours: modalEstimatedHours,
              dueDate: modalDueDate,
              dueTime: modalDueTime,
              offerMessage: modalOfferMsg,
              status: o.status === 'New / Cutting' ? 'Stitching in Progress' : o.status,
            }
          : o
      )
    );

    setEditingOrder(null);
  };

  // Add Karigar Handler
  const handleAddKarigar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKarigarName.trim()) return;

    roomDb.addTailor(newKarigarName.trim(), newKarigarPhone.trim() || '9876543210', newKarigarRole);
    setAllTailors(roomDb.getTailors());
    setNewKarigarName('');
    setNewKarigarPhone('');
    setShowAddKarigarModal(false);
  };

  // Toggle Karigar accordion
  const toggleKarigarExpanded = (tailorName: string) => {
    setExpandedKarigars((prev) => ({
      ...prev,
      [tailorName]: !prev[tailorName],
    }));
  };

  // Filtered worker list
  const visibleWorkers = useMemo(() => {
    return workerSummaries.filter(
      (w) => selectedWorkerFilter === 'ALL' || w.tailorName === selectedWorkerFilter
    );
  }, [workerSummaries, selectedWorkerFilter]);

  // Five distinct workflow pipeline stages for live tracking
  const PIPELINE_STAGES: { id: OrderStatus; label: string; icon: string }[] = [
    { id: 'New / Cutting', label: 'Cutting', icon: '✂️' },
    { id: 'Stitching in Progress', label: 'Stitching', icon: '🧵' },
    { id: 'Trial', label: 'Trial / Fit', icon: '👔' },
    { id: 'Completed', label: 'Ready', icon: '✨' },
    { id: 'Delivered', label: 'Delivered', icon: '📦' },
  ];

  return (
    <div className={`min-h-full bg-[#F8F9FA] text-slate-900 font-sans ${isDesktopView ? 'p-6' : 'pb-24'}`}>
      {/* Top Header */}
      {!isDesktopView ? (
        <div className="bg-[#0B4636] text-white p-3.5 sticky top-0 z-20 shadow-md flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              onClick={onBack}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 transition-all text-white cursor-pointer shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h1 className="text-sm font-extrabold tracking-tight flex items-center gap-1.5 truncate">
                <Scissors className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="truncate">Workshop & Assign</span>
              </h1>
              <p className="text-[10px] text-amber-300 truncate">Staff Workload & Timeline</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setShowAddKarigarModal(true)}
              className="bg-amber-400 hover:bg-amber-300 text-[#0B4636] px-2.5 py-1.5 rounded-xl font-black text-xs shadow flex items-center gap-1 cursor-pointer transition-all active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Karigar</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200">
          <div>
            <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
              <Scissors className="w-7 h-7 text-[#0B4636]" />
              <span>{t('workshop.title', 'Workshop Assign & Karigar Capacity')}</span>
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-1">
              {t('workshop.subtitle', 'Live karigar task boards, 8-hour shift calendar, unassigned order dispatching, and piece-rate ledgers.')}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAddKarigarModal(true)}
              className="bg-[#0B4636] hover:bg-[#073024] text-amber-300 px-4 py-2 rounded-xl font-black text-xs shadow flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 border border-amber-300/30"
            >
              <Plus className="w-4 h-4" />
              <span>Add Staff Karigar</span>
            </button>

            <button
              onClick={onBack}
              className="text-xs font-bold text-slate-600 hover:text-[#0B4636] flex items-center gap-1 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-sm cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{t('nav.backToDashboard', 'Back')}</span>
            </button>
          </div>
        </div>
      )}

      <div className={`space-y-4 ${isDesktopView ? 'w-full' : 'p-4 max-w-5xl mx-auto'}`}>
        {/* Top 4 KPI Capacity Bar (Interactive Clickable Quick-Switchers) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {/* Card 1: Unassigned Orders -> Unassigned Queue */}
          <button
            type="button"
            onClick={() => setActiveMainTab('unassigned_queue')}
            className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer shadow-2xs group active:scale-[0.98] ${
              activeMainTab === 'unassigned_queue'
                ? 'bg-amber-50/90 border-amber-500 ring-2 ring-amber-400/30'
                : 'bg-white border-slate-200 hover:border-amber-400 hover:shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">
                Unassigned Orders
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-amber-600 opacity-0 group-hover:opacity-100 transition-opacity -translate-x-1 group-hover:translate-x-0" />
            </div>
            <div className="text-xl font-black text-amber-950 mt-0.5">{queueMetrics.unassignedCount}</div>
            <span className="text-[10px] font-bold text-amber-700 mt-0.5 flex items-center gap-1">
              <AlertCircle className="w-3 h-3 text-amber-600 shrink-0" />
              <span>Waiting for Karigar</span>
            </span>
          </button>

          {/* Card 2: Active Stitches -> Karigar Live Workload */}
          <button
            type="button"
            onClick={() => {
              setActiveMainTab('karigar_workload');
              setSelectedWorkerFilter('ALL');
            }}
            className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer shadow-2xs group active:scale-[0.98] ${
              activeMainTab === 'karigar_workload'
                ? 'bg-blue-50/90 border-blue-500 ring-2 ring-blue-400/30'
                : 'bg-white border-slate-200 hover:border-blue-400 hover:shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider block">
                Active Stitches
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity -translate-x-1 group-hover:translate-x-0" />
            </div>
            <div className="text-xl font-black text-blue-950 mt-0.5">{queueMetrics.inProgressCount}</div>
            <span className="text-[10px] font-bold text-blue-700 mt-0.5 flex items-center gap-1">
              <Clock className="w-3 h-3 shrink-0" />
              <span>~{queueMetrics.totalHoursBooked} Hours Booked</span>
            </span>
          </button>

          {/* Card 3: Free Capacity Today -> 14-Day Slot Calendar */}
          <button
            type="button"
            onClick={() => setActiveMainTab('slot_calendar')}
            className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer shadow-2xs group active:scale-[0.98] ${
              activeMainTab === 'slot_calendar'
                ? 'bg-emerald-50/90 border-emerald-500 ring-2 ring-emerald-400/30'
                : 'bg-white border-slate-200 hover:border-emerald-400 hover:shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                Free Capacity Today
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity -translate-x-1 group-hover:translate-x-0" />
            </div>
            <div className="text-xl font-black text-emerald-900 mt-0.5">{queueMetrics.totalFreeHoursToday}h Open</div>
            <span className="text-[10px] font-bold text-emerald-700 mt-0.5 flex items-center gap-1">
              <Zap className="w-3 h-3 shrink-0" />
              <span>Out of {queueMetrics.totalDailyCapacity}h Total</span>
            </span>
          </button>

          {/* Card 4: Staff Karigars -> Karigars Ledger & Staff Directory */}
          <button
            type="button"
            onClick={() => setActiveMainTab('karigars_ledger')}
            className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer shadow-2xs group active:scale-[0.98] ${
              activeMainTab === 'karigars_ledger'
                ? 'bg-teal-50/90 border-[#0B4636] ring-2 ring-emerald-400/30'
                : 'bg-white border-slate-200 hover:border-[#0B4636] hover:shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[#0B4636] uppercase tracking-wider block">
                Staff Karigars
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-[#0B4636] opacity-0 group-hover:opacity-100 transition-opacity -translate-x-1 group-hover:translate-x-0" />
            </div>
            <div className="text-xl font-black text-[#0B4636] mt-0.5">{allTailors.length} Active</div>
            <span className="text-[10px] font-bold text-slate-500 mt-0.5 flex items-center justify-between">
              <span>8h Shifts (Mon–Sat)</span>
            </span>
          </button>
        </div>

        {/* Unassigned Banner Alert if orders are waiting */}
        {queueMetrics.unassignedCount > 0 && activeMainTab !== 'unassigned_queue' && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-3.5 rounded-2xl border border-amber-300 shadow-2xs flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-400 text-amber-950 flex items-center justify-center font-black shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-black text-amber-950">
                  {queueMetrics.unassignedCount} Order{queueMetrics.unassignedCount > 1 ? 's' : ''} Need Karigar Assignment
                </h4>
                <p className="text-[11px] text-amber-800">
                  Customer deadlines are counting down. Assign to an available tailor slot now.
                </p>
              </div>
            </div>

            <button
              onClick={() => setActiveMainTab('unassigned_queue')}
              className="px-3 py-1.5 bg-[#0B4636] hover:bg-[#073024] text-amber-300 text-xs font-black rounded-xl shadow-2xs flex items-center gap-1 cursor-pointer transition-all active:scale-95"
            >
              <span>View Unassigned Queue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Main Section Tabs */}
        <div className="bg-white rounded-2xl p-1.5 border border-slate-200 shadow-2xs flex items-center gap-1 overflow-x-auto">
          {(
            [
              { id: 'karigar_workload', label: 'Karigars & Live Workload', icon: Users },
              { id: 'slot_calendar', label: '14-Day Free Slot Calendar', icon: CalendarIcon },
              { id: 'unassigned_queue', label: `Unassigned Queue (${queueMetrics.unassignedCount})`, icon: AlertCircle },
              { id: 'karigars_ledger', label: `Staff Directory & Earnings`, icon: Award },
            ] as const
          ).map((tab) => {
            const Icon = tab.icon;
            const isActive = activeMainTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveMainTab(tab.id)}
                className={`flex-1 min-w-[150px] py-2.5 px-3 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-[#0B4636] text-white shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Filter Karigar & Search Strip */}
        <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by order #, customer, garment, or notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B4636] font-medium"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs font-bold text-slate-500 whitespace-nowrap">Filter Karigar:</span>
            <select
              value={selectedWorkerFilter}
              onChange={(e) => setSelectedWorkerFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B4636]"
            >
              <option value="ALL">All Staff Karigars ({allTailors.length})</option>
              {allTailors.map((w) => (
                <option key={w.id} value={w.name}>
                  {w.name} ({w.role})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: KARIGARS & LIVE WORKLOAD (PRIMARY WORKSTATION) */}
        {/* ========================================================================= */}
        {activeMainTab === 'karigar_workload' && (
          <div className="space-y-4">
            {visibleWorkers.map((worker) => {
              const isExpanded = expandedKarigars[worker.tailorName] ?? true;
              const filteredWorkerOrders = worker.activeOrders.filter((o) => {
                if (!searchQuery) return true;
                const q = searchQuery.toLowerCase();
                return (
                  (o.customerName && o.customerName.toLowerCase().includes(q)) ||
                  (o.id && o.id.toLowerCase().includes(q)) ||
                  (o.garmentType && o.garmentType.toLowerCase().includes(q))
                );
              });

              // Capacity utilization calculation
              const shiftCapacity = 8;
              const bookedToday = Math.max(0, shiftCapacity - worker.freeHoursToday);
              const percentUsed = Math.min(100, Math.round((bookedToday / shiftCapacity) * 100));

              return (
                <div
                  key={worker.tailorId}
                  className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden transition-all"
                >
                  {/* Worker Card Top Header */}
                  <div className="bg-gradient-to-r from-slate-50 to-white p-4 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0B4636] to-[#062920] text-amber-300 font-black text-sm flex items-center justify-center shadow-2xs shrink-0 border border-emerald-900">
                        {worker.initials || worker.tailorName.slice(0, 2).toUpperCase()}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-black text-sm text-slate-900 truncate">{worker.tailorName}</h3>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-slate-100 text-slate-700 border border-slate-200">
                            {worker.role}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-black border ${
                              worker.freeHoursToday >= 4
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                : worker.freeHoursToday > 0
                                ? 'bg-amber-50 text-amber-900 border-amber-300'
                                : 'bg-rose-50 text-rose-800 border-rose-300'
                            }`}
                          >
                            {worker.freeHoursToday}h Free Today (out of 8h)
                          </span>
                        </div>

                        <div className="text-xs text-slate-500 font-medium flex items-center gap-2.5 mt-1 flex-wrap">
                          <span className="font-bold text-slate-700">
                            {worker.activeOrdersCount} Active Stitches
                          </span>
                          <span>•</span>
                          <span>{worker.activeWorkloadHours} Hours Booked</span>
                          <span>•</span>
                          <span className="text-emerald-800 font-bold">
                            {worker.completedOrdersCount} Finished (₹{worker.completedRevenueGenerated.toLocaleString()})
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right Controls: WhatsApp, Call, Expand/Collapse */}
                    <div className="flex items-center gap-2 ml-auto sm:ml-0">
                      {worker.phone && (
                        <>
                          <a
                            href={getWhatsAppUrl(
                              worker.phone,
                              `Hello ${worker.tailorName}, here is your workshop stitch queue update.`
                            )}
                            target="_blank"
                            rel="noreferrer"
                            className="p-2 rounded-xl bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366] hover:text-white transition-all cursor-pointer border border-[#25D366]/30 shadow-2xs"
                            title="WhatsApp Karigar"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </a>

                          <a
                            href={`tel:${clean10DigitPhone(worker.phone)}`}
                            className="p-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all cursor-pointer border border-slate-200 shadow-2xs"
                            title="Call Karigar"
                          >
                            <Phone className="w-4 h-4" />
                          </a>
                        </>
                      )}

                      <button
                        type="button"
                        onClick={() => toggleKarigarExpanded(worker.tailorName)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-all border border-slate-200"
                      >
                        <span>{isExpanded ? 'Collapse' : `Expand (${worker.activeOrdersCount})`}</span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* 8-Hour Capacity Progress Line */}
                  <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 flex-1 max-w-xs">
                      <span className="text-[10px] font-bold text-slate-500 uppercase whitespace-nowrap">
                        Today's 8h Shift:
                      </span>
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            percentUsed >= 100
                              ? 'bg-rose-500'
                              : percentUsed >= 60
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                          style={{ width: `${percentUsed}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-black text-slate-700 shrink-0">{percentUsed}%</span>
                    </div>

                    {worker.earliestFreeDate && (
                      <div className="text-[11px] font-semibold text-slate-600">
                        Next Open Slot:{' '}
                        <span className="font-bold text-[#0B4636] bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          {worker.earliestFreeDate}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Worker's Assigned Orders List */}
                  {isExpanded && (
                    <div className="p-4 space-y-3">
                      {filteredWorkerOrders.length === 0 ? (
                        <div className="py-8 text-center bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
                          <Scissors className="w-8 h-8 text-slate-300 mx-auto mb-1.5" />
                          <p className="text-xs font-bold text-slate-600">No Active Stitches in Queue</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            This karigar is available for new garment allocations.
                          </p>
                        </div>
                      ) : (
                        filteredWorkerOrders.map((ord) => {
                          const currentStageIdx = PIPELINE_STAGES.findIndex(
                            (stg) => stg.id === ord.status
                          );

                          return (
                            <div
                              key={ord.id}
                              className="bg-slate-50/80 rounded-2xl p-3.5 sm:p-4 border border-slate-200 hover:border-[#0B4636]/40 transition-all space-y-3"
                            >
                              {/* Order Info Row */}
                              <div className="flex items-start justify-between gap-3 flex-wrap">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-black text-sm text-slate-900">{ord.garmentType}</span>
                                    <span className="text-xs font-mono font-bold text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                                      #{ord.id}
                                    </span>
                                    <span className="text-xs text-slate-700 font-semibold">
                                      Client: <strong>{ord.customerName}</strong>
                                    </span>

                                    {ord.isOverdue && (
                                      <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-rose-500 text-white animate-pulse">
                                        Overdue {ord.daysOverdue}d
                                      </span>
                                    )}

                                    {ord.orderCategory && (
                                      <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                                        {ord.orderCategory}
                                      </span>
                                    )}
                                  </div>

                                  <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2.5">
                                    <span className="flex items-center gap-1 font-semibold text-slate-700">
                                      <CalendarIcon className="w-3.5 h-3.5 text-slate-400" />
                                      Promised: {ord.dueDate} ({ord.dueTime || '18:00'})
                                    </span>
                                    <span>•</span>
                                    <span className="flex items-center gap-1 font-bold text-amber-800">
                                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                                      ~{ord.estimatedHours || 4} Hours Effort
                                    </span>
                                    <span>•</span>
                                    <span className="font-black text-slate-900">₹{ord.totalAmount}</span>
                                  </div>

                                  {ord.specialInstructions && (
                                    <p className="text-[11px] text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 italic max-w-lg">
                                      📝 Note: {ord.specialInstructions}
                                    </p>
                                  )}
                                </div>

                                {/* Reassign & Details Buttons */}
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenAssignModal(ord, worker.tailorName)}
                                    className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold rounded-xl text-xs flex items-center gap-1 cursor-pointer shadow-2xs transition-all active:scale-95"
                                    title="Change Assigned Karigar or Reschedule Date"
                                  >
                                    <Scissors className="w-3.5 h-3.5 text-[#0B4636]" />
                                    <span>Reschedule / Reassign</span>
                                  </button>

                                  {onSelectOrder && (
                                    <button
                                      type="button"
                                      onClick={() => onSelectOrder(ord)}
                                      className="px-3 py-1.5 bg-[#0B4636] hover:bg-[#073024] text-white font-bold rounded-xl text-xs flex items-center gap-1 cursor-pointer shadow-2xs transition-all active:scale-95"
                                    >
                                      <span>Order View</span>
                                      <ArrowRight className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Interactive 5-Node Connected Stepper (Matching Screenshot) */}
                              {(() => {
                                let stageIdx = 0;
                                if (ord.status === 'Delivered') stageIdx = 4;
                                else if (ord.status === 'Completed') stageIdx = 3;
                                else if (ord.status === 'Stitching in Progress' || ord.status === 'Trial') stageIdx = 2;
                                else if (ord.status === 'Assigned' || (ord.assignedTailor && ord.assignedTailor !== 'Unassigned' && ord.assignedTailor !== 'Not Assigned' && ord.status !== 'New / Cutting')) stageIdx = 2;
                                else if (ord.assignedTailor && ord.assignedTailor !== 'Unassigned' && ord.assignedTailor !== 'Not Assigned') stageIdx = 1;

                                const STAGE_NODES = [
                                  { stage: 'Cutting', label: 'Cutting', targetStatus: 'New / Cutting' as OrderStatus },
                                  { stage: 'Assigned', label: 'Assigned', targetStatus: 'Assigned' as OrderStatus },
                                  { stage: 'Stitching', label: 'Stitching', targetStatus: 'Stitching in Progress' as OrderStatus },
                                  { stage: 'Ready', label: 'Ready', targetStatus: 'Completed' as OrderStatus },
                                  { stage: 'Delivered', label: 'Delivered', targetStatus: 'Delivered' as OrderStatus },
                                ];

                                const workerInitial = (ord.assignedTailor && ord.assignedTailor !== 'Unassigned'
                                  ? ord.assignedTailor[0]
                                  : worker.tailorName[0] || 'R').toUpperCase();

                                return (
                                  <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-200/90 shadow-2xs space-y-3.5">
                                    {/* Top Info Bar */}
                                    <div className="flex items-center justify-between text-xs flex-wrap gap-2">
                                      <div className="flex items-center gap-2 min-w-0">
                                        <div className="w-6 h-6 rounded-md bg-[#072C21] text-amber-300 text-xs font-black flex items-center justify-center shrink-0 shadow-2xs">
                                          {workerInitial}
                                        </div>
                                        <span className="font-black text-slate-900 text-sm truncate">
                                          {ord.assignedTailor && ord.assignedTailor !== 'Unassigned' ? ord.assignedTailor : worker.tailorName}
                                        </span>
                                        <span
                                          className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                                            ord.status === 'Stitching in Progress'
                                              ? 'bg-indigo-100 text-indigo-800'
                                              : ord.status === 'Completed' || ord.status === 'Delivered'
                                              ? 'bg-emerald-100 text-emerald-800'
                                              : ord.status === 'New / Cutting'
                                              ? 'bg-amber-100 text-amber-900'
                                              : 'bg-indigo-100 text-indigo-800'
                                          }`}
                                        >
                                          {ord.status}
                                        </span>
                                      </div>

                                      <div className="text-xs text-slate-500 font-semibold flex items-center gap-1">
                                        <span>⏱</span>
                                        <span>~{ord.estimatedHours || 4.5}h stitching</span>
                                      </div>
                                    </div>

                                    {/* 5-Node Stepper Connected Line */}
                                    <div className="relative flex items-center justify-between pt-1 pb-1">
                                      {/* Background Track Line */}
                                      <div className="absolute top-[18px] left-6 right-6 h-0.5 bg-slate-200 -z-0" />
                                      {/* Filled Emerald Line */}
                                      <div
                                        className="absolute top-[18px] left-6 h-0.5 bg-emerald-500 -z-0 transition-all duration-300"
                                        style={{
                                          width: `${Math.min(100, Math.max(0, (stageIdx / 4) * 100))}%`,
                                        }}
                                      />

                                      {STAGE_NODES.map((node, nIdx) => {
                                        const isDone = nIdx < stageIdx;
                                        const isCurrent = nIdx === stageIdx;
                                        const isUpcoming = nIdx > stageIdx;

                                        return (
                                          <button
                                            key={node.stage}
                                            type="button"
                                            onClick={() => handleUpdateProcessStatus(ord.id, node.targetStatus)}
                                            className="flex flex-col items-center cursor-pointer relative z-10 group bg-transparent border-0 p-0"
                                            title={`Click to set stage to ${node.stage}`}
                                          >
                                            {/* Circle Node */}
                                            <div
                                              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                                                isDone
                                                  ? 'bg-emerald-500 text-white shadow-2xs'
                                                  : isCurrent
                                                  ? 'bg-indigo-600 text-white ring-4 ring-indigo-100 shadow-md scale-110'
                                                  : 'bg-white border-2 border-slate-300 text-slate-400 group-hover:border-slate-400'
                                              }`}
                                            >
                                              {isDone ? (
                                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                                              ) : isCurrent ? (
                                                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                                              ) : (
                                                <span className="text-[11px] font-bold">{nIdx + 1}</span>
                                              )}
                                            </div>

                                            {/* Node Label */}
                                            <span
                                              className={`text-xs mt-1.5 font-black ${
                                                isCurrent
                                                  ? 'text-indigo-950'
                                                  : isDone
                                                  ? 'text-slate-800'
                                                  : 'text-slate-400'
                                              }`}
                                            >
                                              {node.label}
                                            </span>

                                            {/* Sublabel */}
                                            <span className="text-[10px] text-slate-400 font-medium">
                                              {isCurrent ? 'In Progress' : isDone ? 'Done' : 'Upcoming'}
                                            </span>
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: 14-DAY CALENDAR & FREE SLOTS MATRIX (8H/DAY SHIFT MODEL) */}
        {/* ========================================================================= */}
        {activeMainTab === 'slot_calendar' && (
          <div className="space-y-4">
            <div className="bg-emerald-900/5 p-4 rounded-2xl border border-emerald-800/15 flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-xs font-black text-[#0B4636] uppercase tracking-wider flex items-center gap-1.5">
                  <CalendarIcon className="w-4 h-4" />
                  <span>Workshop Availability Calendar (8 Working Hours / Day)</span>
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Click any date slot below to quickly schedule or assign unassigned stitches to that specific date.
                </p>
              </div>

              <div className="flex items-center gap-3 text-xs font-bold">
                <span className="flex items-center gap-1 text-emerald-800">
                  <span className="w-3 h-3 rounded bg-emerald-200 inline-block border border-emerald-400"></span>
                  Free Slot
                </span>
                <span className="flex items-center gap-1 text-amber-800">
                  <span className="w-3 h-3 rounded bg-amber-200 inline-block border border-amber-400"></span>
                  Partially Booked
                </span>
                <span className="flex items-center gap-1 text-rose-800">
                  <span className="w-3 h-3 rounded bg-rose-200 inline-block border border-rose-400"></span>
                  Full
                </span>
              </div>
            </div>

            {visibleWorkers.map((worker) => (
              <div key={worker.tailorId} className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-[#0B4636] text-amber-300 font-black text-xs flex items-center justify-center">
                      {worker.initials}
                    </div>
                    <div>
                      <h4 className="font-black text-sm text-slate-900">{worker.tailorName}</h4>
                      <span className="text-[10px] text-slate-500 font-bold">Standard 8h/day (Mon–Sat)</span>
                    </div>
                  </div>

                  <span className="text-xs font-black text-[#0B4636]">
                    {worker.activeOrdersCount} Total Active Orders
                  </span>
                </div>

                {/* 14-Day Horizontal Slots Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-7 gap-2">
                  {worker.upcomingSchedule.map((slot) => {
                    if (slot.isDayOff) {
                      return (
                        <div
                          key={slot.dateStr}
                          className="bg-slate-100 p-2.5 rounded-xl border border-slate-200 text-center opacity-60 flex flex-col justify-between min-h-[90px]"
                        >
                          <div>
                            <div className="text-[10px] font-bold text-slate-500">{slot.dayLabel}</div>
                            <div className="text-xs font-black text-slate-700">{slot.formattedDate}</div>
                          </div>
                          <div className="text-[9px] font-black text-rose-600 uppercase">Sunday Off</div>
                        </div>
                      );
                    }

                    const unassignedOrder = allOrders.find(
                      (o) =>
                        !o.isArchived &&
                        o.status !== 'Completed' &&
                        o.status !== 'Delivered' &&
                        (!o.assignedTailor || o.assignedTailor === 'Unassigned')
                    );

                    return (
                      <div
                        key={slot.dateStr}
                        onClick={() => {
                          if (unassignedOrder) {
                            handleOpenAssignModal(unassignedOrder, worker.tailorName, slot.dateStr);
                          } else if (slot.ordersOnDate.length > 0) {
                            const firstOrd = allOrders.find((o) => o.id === slot.ordersOnDate[0].orderId);
                            if (firstOrd) {
                              handleOpenAssignModal(firstOrd, worker.tailorName, slot.dateStr);
                            }
                          }
                        }}
                        className={`p-2.5 rounded-xl border text-center transition-all flex flex-col justify-between cursor-pointer min-h-[90px] hover:shadow-md hover:scale-[1.02] ${
                          slot.hasNoOrders
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-900 shadow-2xs'
                            : slot.isFullyBooked
                            ? 'bg-rose-50 border-rose-300 text-rose-900'
                            : 'bg-amber-50 border-amber-300 text-amber-900'
                        }`}
                      >
                        <div>
                          <div className="text-[10px] font-bold opacity-75">{slot.dayLabel}</div>
                          <div className="text-xs font-black">{slot.formattedDate}</div>
                        </div>

                        <div className="my-1">
                          {slot.hasNoOrders ? (
                            <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-emerald-200 text-emerald-900 block">
                              8h Free (Open)
                            </span>
                          ) : slot.isFullyBooked ? (
                            <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-rose-200 text-rose-900 block">
                              8h Fully Booked
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-amber-200 text-amber-900 block">
                              {slot.freeHours}h Free ({slot.bookedHours}h Booked)
                            </span>
                          )}
                        </div>

                        <div className="text-[10px] font-bold opacity-80 flex items-center justify-center gap-1">
                          <span>{slot.ordersOnDate.length} Order{slot.ordersOnDate.length !== 1 ? 's' : ''}</span>
                          <span className="text-[9px] text-[#0B4636] font-extrabold underline">⚡ Assign</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: UNASSIGNED ORDERS QUEUE */}
        {/* ========================================================================= */}
        {activeMainTab === 'unassigned_queue' && (
          <div className="space-y-3">
            {allOrders
              .filter(
                (o) =>
                  !o.isArchived &&
                  o.status !== 'Completed' &&
                  o.status !== 'Delivered' &&
                  (!o.assignedTailor || o.assignedTailor === 'Unassigned')
              )
              .map((ord) => {
                let stageIdx = 0;
                if (ord.status === 'Delivered') stageIdx = 4;
                else if (ord.status === 'Completed') stageIdx = 3;
                else if (ord.status === 'Stitching in Progress' || ord.status === 'Trial') stageIdx = 2;
                else if (ord.status === 'Assigned' || (ord.assignedTailor && ord.assignedTailor !== 'Unassigned' && ord.assignedTailor !== 'Not Assigned' && ord.status !== 'New / Cutting')) stageIdx = 2;
                else if (ord.assignedTailor && ord.assignedTailor !== 'Unassigned' && ord.assignedTailor !== 'Not Assigned') stageIdx = 1;

                const STAGE_NODES = [
                  { stage: 'Cutting', label: 'Cutting', targetStatus: 'New / Cutting' as OrderStatus },
                  { stage: 'Assigned', label: 'Assigned', targetStatus: 'Assigned' as OrderStatus },
                  { stage: 'Stitching', label: 'Stitching', targetStatus: 'Stitching in Progress' as OrderStatus },
                  { stage: 'Ready', label: 'Ready', targetStatus: 'Completed' as OrderStatus },
                  { stage: 'Delivered', label: 'Delivered', targetStatus: 'Delivered' as OrderStatus },
                ];

                return (
                  <div
                    key={ord.id}
                    className="bg-white rounded-2xl p-4 border border-amber-300 shadow-2xs space-y-3 hover:shadow-xs transition-all"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-black text-sm text-slate-900">{ord.garmentType}</span>
                          <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                            #{ord.id}
                          </span>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300">
                            ⚠️ Needs Tailor
                          </span>
                          {ord.orderCategory && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-purple-100 text-purple-800">
                              {ord.orderCategory}
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-slate-500 flex items-center gap-3 flex-wrap">
                          <span>Customer: <strong>{ord.customerName}</strong></span>
                          <span>•</span>
                          <span>Promised: {ord.dueDate} ({ord.dueTime || '18:00'})</span>
                          <span>•</span>
                          <span className="font-bold text-[#0B4636]">₹{ord.totalAmount}</span>
                        </div>

                        {ord.specialInstructions && (
                          <p className="text-[11px] text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 italic max-w-lg">
                            📝 {ord.specialInstructions}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenAssignModal(ord)}
                          className="px-4 py-2 bg-[#0B4636] hover:bg-[#073024] text-amber-300 font-black rounded-xl text-xs shadow-2xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 border border-amber-300/30"
                        >
                          <Scissors className="w-3.5 h-3.5" />
                          <span>Assign Karigar Now</span>
                        </button>
                      </div>
                    </div>

                    {/* 5-Node Stepper Card */}
                    <div className="bg-slate-50/80 rounded-2xl p-3.5 border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between text-xs flex-wrap gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-6 h-6 rounded-md bg-[#072C21] text-amber-300 text-xs font-black flex items-center justify-center shrink-0 shadow-2xs">
                            ✂️
                          </div>
                          <span className="font-black text-slate-900 text-sm truncate">
                            Unassigned
                          </span>
                          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900">
                            {ord.status}
                          </span>
                        </div>

                        <div className="text-xs text-slate-500 font-semibold flex items-center gap-1">
                          <span>⏱</span>
                          <span>~{ord.estimatedHours || 4.5}h stitching</span>
                        </div>
                      </div>

                      <div className="relative flex items-center justify-between pt-1 pb-1">
                        <div className="absolute top-[18px] left-6 right-6 h-0.5 bg-slate-200 -z-0" />
                        <div
                          className="absolute top-[18px] left-6 h-0.5 bg-emerald-500 -z-0 transition-all duration-300"
                          style={{
                            width: `${Math.min(100, Math.max(0, (stageIdx / 4) * 100))}%`,
                          }}
                        />

                        {STAGE_NODES.map((node, nIdx) => {
                          const isDone = nIdx < stageIdx;
                          const isCurrent = nIdx === stageIdx;

                          return (
                            <button
                              key={node.stage}
                              type="button"
                              onClick={() => {
                                if (node.stage === 'Assigned' || node.stage === 'Stitching') {
                                  handleOpenAssignModal(ord);
                                } else {
                                  handleUpdateProcessStatus(ord.id, node.targetStatus);
                                }
                              }}
                              className="flex flex-col items-center cursor-pointer relative z-10 group bg-transparent border-0 p-0"
                              title={`Click to set stage to ${node.stage}`}
                            >
                              <div
                                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                                  isDone
                                    ? 'bg-emerald-500 text-white shadow-2xs'
                                    : isCurrent
                                    ? 'bg-indigo-600 text-white ring-4 ring-indigo-100 shadow-md scale-110'
                                    : 'bg-white border-2 border-slate-300 text-slate-400 group-hover:border-slate-400'
                                }`}
                              >
                                {isDone ? (
                                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                                ) : isCurrent ? (
                                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                                ) : (
                                  <span className="text-[11px] font-bold">{nIdx + 1}</span>
                                )}
                              </div>

                              <span
                                className={`text-xs mt-1.5 font-black ${
                                  isCurrent
                                    ? 'text-indigo-950'
                                    : isDone
                                    ? 'text-slate-800'
                                    : 'text-slate-400'
                                }`}
                              >
                                {node.label}
                              </span>

                              <span className="text-[10px] text-slate-400 font-medium">
                                {isCurrent ? 'In Progress' : isDone ? 'Done' : 'Upcoming'}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}

            {queueMetrics.unassignedCount === 0 && (
              <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-2">
                <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
                <h4 className="text-sm font-black text-slate-800">All Orders are Assigned!</h4>
                <p className="text-xs text-slate-500">
                  Every order has an allocated staff tailor and confirmed delivery schedule.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: KARIGARS ROSTER & PAYOUT EARNINGS LEDGER */}
        {/* ========================================================================= */}
        {activeMainTab === 'karigars_ledger' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs flex items-center justify-between flex-wrap gap-3">
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Award className="w-4 h-4 text-[#0B4636]" />
                  <span>Staff Karigars Directory & Completed Work Audit</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Track completed garment counts, total revenue generated, and contact information.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowAddKarigarModal(true)}
                className="bg-[#0B4636] hover:bg-[#073024] text-amber-300 px-3.5 py-1.5 rounded-xl font-bold text-xs shadow-2xs flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add New Karigar</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {allTailors.map((tailor) => {
                const summary = workerSummaries.find((w) => w.tailorName === tailor.name);
                const completedStitches = summary?.completedOrdersCount || 0;
                const completedRevenue = summary?.completedRevenueGenerated || 0;
                const activeStitches = summary?.activeOrdersCount || 0;

                return (
                  <div
                    key={tailor.id}
                    className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-3 flex flex-col justify-between"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-teal-50 to-emerald-100 text-[#0B4636] font-black text-sm flex items-center justify-center border border-teal-200">
                          {tailor.initials || tailor.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-black text-sm text-slate-900 flex items-center gap-1.5">
                            <span>{tailor.name}</span>
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                              {tailor.role}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{formatDisplayPhone(tailor.phone || '9876543210')}</span>
                          </div>
                        </div>
                      </div>

                      {tailor.role !== 'Owner' && (
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Remove ${tailor.name} from staff list?`)) {
                              roomDb.deleteTailor(tailor.id);
                              setAllTailors(roomDb.getTailors());
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                          title="Delete Karigar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-center text-xs">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Active</span>
                        <span className="font-black text-slate-900 text-sm">{activeStitches} Stitches</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-emerald-800 uppercase block">Completed</span>
                        <span className="font-black text-emerald-800 text-sm">{completedStitches}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-[#0B4636] uppercase block">Revenue</span>
                        <span className="font-black text-[#0B4636] text-sm">₹{completedRevenue.toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                      <a
                        href={getWhatsAppUrl(
                          tailor.phone,
                          `Hello ${tailor.name}, your workshop update:`
                        )}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 py-1.5 bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366] hover:text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1 transition-all cursor-pointer"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>WhatsApp</span>
                      </a>

                      <a
                        href={`tel:${clean10DigitPhone(tailor.phone)}`}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>Call</span>
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* ASSIGN WORKER & PROMISED TIMELINE MODAL */}
      {/* ========================================================================= */}
      {editingOrder && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-lg p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 my-auto animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#0B4636] text-amber-300 flex items-center justify-center">
                  <Scissors className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">Assign Worker & Set Schedule</h3>
                  <p className="text-[10px] text-slate-500 font-medium">Order #{editingOrder.id} • {editingOrder.customerName} ({editingOrder.garmentType})</p>
                </div>
              </div>
              <button
                onClick={() => setEditingOrder(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Select Staff Tailor */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-[#0B4636]" />
                  <span>1. Select Staff Karigar ({allTailors.length} Available)</span>
                </label>
                <span className="text-[10px] font-bold text-[#0B4636] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  8h shift model
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {workerSummaries.map((w) => {
                  const isSelected = modalAssignedTailor === w.tailorName;
                  return (
                    <button
                      key={w.tailorId}
                      type="button"
                      onClick={() => {
                        setModalAssignedTailor(w.tailorName);
                        // Auto calculate recommended slot
                        const sched = generateWorkerScheduleForDays(w.tailorName, allOrders, 8);
                        const match = sched.find((s) => !s.isDayOff && s.freeHours >= modalEstimatedHours) || sched.find((s) => !s.isDayOff) || sched[0];
                        if (match) {
                          setModalDueDate(match.dateStr);
                        }
                      }}
                      className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between relative overflow-hidden ${
                        isSelected
                          ? 'bg-[#0B4636] text-white border-[#0B4636] shadow-md ring-2 ring-amber-300'
                          : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800'
                      }`}
                    >
                      <div className="min-w-0 pr-1">
                        <div className="font-extrabold text-xs truncate">{w.tailorName}</div>
                        <div className={`text-[10px] ${isSelected ? 'text-amber-200' : 'text-slate-500'}`}>
                          {w.activeOrdersCount} Active Stitches
                        </div>
                      </div>
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-full shrink-0 ${
                          isSelected
                            ? 'bg-amber-400 text-[#0B4636]'
                            : w.freeHoursToday > 3
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {w.freeHoursToday}h Free
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Clickable Free Dates & Time Slots for selected karigar */}
            {(() => {
              const selectedSched = generateWorkerScheduleForDays(modalAssignedTailor, allOrders, 8);
              const bestSlot = selectedSched.find((s) => !s.isDayOff && s.freeHours >= modalEstimatedHours) || selectedSched.find((s) => !s.isDayOff) || selectedSched[0];

              const handleSelectDateAndOrTime = (newDate: string, newTime?: string) => {
                setModalDueDate(newDate);
                const targetTime = newTime || modalDueTime;
                if (newTime) setModalDueTime(newTime);
                
                if (editingOrder) {
                  const formattedD = formatDisplayDate(newDate);
                  const formattedT = formatDisplayTime(targetTime);
                  setModalOfferMsg(
                    `Hello ${editingOrder.customerName}, your ${editingOrder.garmentType} order (${editingOrder.id}) is assigned to ${modalAssignedTailor}. Promised delivery: ${formattedD} at ${formattedT}.`
                  );
                }
              };

              return (
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                      <CalendarIcon className="w-3.5 h-3.5 text-[#0B4636]" />
                      <span>2. Click Date & Slot ({modalAssignedTailor}):</span>
                    </label>
                    <span className="text-[10px] text-[#0B4636] font-bold bg-emerald-50 px-2 py-0.5 rounded-full">
                      Tap date to pick
                    </span>
                  </div>

                  {/* Best slot chip */}
                  {bestSlot && !bestSlot.isDayOff && (
                    <div className="p-2.5 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                        <div className="text-xs leading-tight min-w-0">
                          <span className="font-bold text-amber-900 block truncate">
                            Recommended: {bestSlot.dayLabel} ({bestSlot.formattedDate})
                          </span>
                          <span className="text-[10px] text-amber-700 font-medium">
                            {bestSlot.freeHours}h free capacity available
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSelectDateAndOrTime(bestSlot.dateStr, '18:00')}
                        className={`px-2.5 py-1 rounded-xl text-[10px] font-black shrink-0 transition-all cursor-pointer ${
                          modalDueDate === bestSlot.dateStr
                            ? 'bg-[#0B4636] text-amber-300'
                            : 'bg-amber-400 text-[#0B4636] hover:bg-amber-300 shadow-xs'
                        }`}
                      >
                        {modalDueDate === bestSlot.dateStr ? '✓ Selected' : '⚡ Pick Slot'}
                      </button>
                    </div>
                  )}

                  {/* 8-Day Carousel / Grid with Direct Date Selection */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {selectedSched.map((slot, idx) => {
                      const isDateSelected = modalDueDate === slot.dateStr;
                      const isToday = idx === 0;
                      const fitsOrder = !slot.isDayOff && slot.freeHours >= modalEstimatedHours;
                      const isTight = !slot.isDayOff && slot.freeHours > 0 && slot.freeHours < modalEstimatedHours;

                      return (
                        <div
                          key={slot.dateStr}
                          onClick={() => {
                            if (!slot.isDayOff) {
                              handleSelectDateAndOrTime(slot.dateStr);
                            }
                          }}
                          className={`p-2 rounded-2xl border transition-all text-left space-y-1.5 flex flex-col justify-between cursor-pointer ${
                            isDateSelected
                              ? 'bg-[#0B4636] text-white border-[#0B4636] shadow-md ring-2 ring-amber-300 scale-[1.02]'
                              : slot.isDayOff
                              ? 'bg-slate-100 border-slate-200 opacity-60 text-slate-400 cursor-not-allowed'
                              : slot.isFullyBooked
                              ? 'bg-rose-50 border-rose-200 text-rose-900 hover:border-rose-400'
                              : fitsOrder
                              ? 'bg-emerald-50/50 border-emerald-200 text-slate-800 hover:border-[#0B4636]'
                              : 'bg-slate-50 border-slate-200 text-slate-800 hover:border-slate-400'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between">
                              <span
                                className={`text-[11px] font-black ${
                                  isDateSelected ? 'text-amber-300' : isToday ? 'text-[#0B4636]' : 'text-slate-700'
                                }`}
                              >
                                {isToday ? 'Today' : slot.dayLabel}
                              </span>
                              <span className={`text-[10px] font-bold ${isDateSelected ? 'text-emerald-200' : 'text-slate-500'}`}>
                                {slot.formattedDate}
                              </span>
                            </div>

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
                                {slot.bookedHours > 0 ? `${slot.bookedHours}h` : 'Open'}
                              </span>
                            </div>

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

                          {/* Quick Time Chips for this date */}
                          {!slot.isDayOff && (
                            <div className="grid grid-cols-2 gap-1 pt-1 border-t border-slate-200/40" onClick={(e) => e.stopPropagation()}>
                              {[
                                { label: '10 AM', time: '10:00' },
                                { label: '2 PM', time: '14:00' },
                                { label: '6 PM', time: '18:00' },
                                { label: '8 PM', time: '20:00' },
                              ].map((t) => {
                                const isThisSlotActive = isDateSelected && modalDueTime === t.time;
                                return (
                                  <button
                                    key={t.time}
                                    type="button"
                                    onClick={() => handleSelectDateAndOrTime(slot.dateStr, t.time)}
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

                  {/* Dedicated Promised Date & Time Input */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 mt-2">
                    <PromisedDateTimeInput
                      date={modalDueDate}
                      time={modalDueTime}
                      onDateChange={(d) => handleSelectDateAndOrTime(d)}
                      onTimeChange={(t) => handleSelectDateAndOrTime(modalDueDate, t)}
                      showPresets={true}
                      showStatusBanner={false}
                      label="3. Promised Date & Time"
                    />
                  </div>
                </div>
              );
            })()}

            {/* Estimated Effort Hours */}
            <div className="pt-2 border-t border-slate-100">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Stitching Duration (Hours)
              </label>
              <input
                type="number"
                min={1}
                max={16}
                value={modalEstimatedHours}
                onChange={(e) => setModalEstimatedHours(Number(e.target.value) || 4)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-black text-slate-900"
              />
            </div>

            {/* Customer WhatsApp Notification preview */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Customer Update Message (Auto-synced with Date & Time)
              </label>
              <textarea
                rows={2}
                value={modalOfferMsg}
                onChange={(e) => setModalOfferMsg(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900"
              />
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={handleConfirmAssignmentSubmit}
                className="flex-1 py-2.5 bg-[#0B4636] hover:bg-[#073024] text-amber-300 font-extrabold rounded-xl text-xs shadow flex items-center justify-center gap-2 cursor-pointer border border-amber-300/30 transition-all active:scale-95"
              >
                <Check className="w-4 h-4 text-amber-300" />
                <span>Confirm Assignment</span>
              </button>

              <button
                type="button"
                onClick={() => setEditingOrder(null)}
                className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ADD STAFF KARIGAR MODAL */}
      {/* ========================================================================= */}
      {showAddKarigarModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-md p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 my-auto animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#0B4636] text-amber-300 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
                <h3 className="font-extrabold text-base text-slate-900">Add Staff Karigar</h3>
              </div>
              <button
                onClick={() => setShowAddKarigarModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddKarigar} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Karigar / Tailor Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Master Aslam, Ramesh Tailor"
                  value={newKarigarName}
                  onChange={(e) => setNewKarigarName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B4636]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Phone Number (for WhatsApp assignments)
                </label>
                <input
                  type="tel"
                  placeholder="e.g., 9876543210"
                  value={newKarigarPhone}
                  onChange={(e) => setNewKarigarPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B4636]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Role / Specialization
                </label>
                <select
                  value={newKarigarRole}
                  onChange={(e) => setNewKarigarRole(e.target.value as 'Tailor' | 'Owner')}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B4636]"
                >
                  <option value="Tailor">Staff Tailor / Karigar</option>
                  <option value="Owner">Shop Master / Owner</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#0B4636] hover:bg-[#073024] text-amber-300 font-extrabold rounded-xl text-xs shadow flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
                >
                  <Plus className="w-4 h-4 text-amber-300" />
                  <span>Add to Workshop</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowAddKarigarModal(false)}
                  className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
