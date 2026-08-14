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

type MainTab = 'matrix' | 'schedule_calendar' | 'completed_history' | 'unassigned_queue';

export const Screen6AssignTimeline: React.FC<Screen6AssignTimelineProps> = ({
  order: propOrder,
  orders: propOrders = [],
  tailors,
  onBack,
  onConfirmAssignment,
  onUpdateOrderStatus,
  onSelectOrder,
  isDesktopView = false,
}) => {
  const [allOrders, setAllOrders] = useState<TailorOrder[]>(() =>
    (propOrders.length > 0 ? propOrders : roomDb.getOrders()).map(checkAndEnrichOrderOverdue)
  );

  const [activeMainTab, setActiveMainTab] = useState<MainTab>('matrix');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWorkerFilter, setSelectedWorkerFilter] = useState<string>('ALL');

  // Currently focused order for assignment modal/drawer
  const [editingOrder, setEditingOrder] = useState<TailorOrder | null>(propOrder || null);

  // Modal form states
  const [modalAssignedTailor, setModalAssignedTailor] = useState<string>('Self (Owner)');
  const [modalEstimatedHours, setModalEstimatedHours] = useState<number>(4);
  const [modalDueDate, setModalDueDate] = useState<string>(
    new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [modalDueTime, setModalDueTime] = useState<string>('18:00');
  const [modalOfferMsg, setModalOfferMsg] = useState<string>('');

  // Status updating dropdown modal
  const [statusMenuOrderId, setStatusMenuOrderId] = useState<string | null>(null);

  // Calculate worker summaries with 8h/day Mon-Sat model
  const workerSummaries = useMemo(() => {
    return calculateWorkerPerformances(tailors, allOrders);
  }, [tailors, allOrders]);

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
      (o) => !o.isArchived && o.status !== 'Completed' && o.status !== 'Delivered' && o.assignedTailor
    );
    const completed = allOrders.filter((o) => o.status === 'Completed' || o.status === 'Delivered');

    const totalHoursBooked = inProgress.reduce(
      (sum, o) => sum + (o.estimatedHours || getEstimatedHoursForGarment(o.garmentType, o.orderCategory)),
      0
    );

    return {
      unassignedCount: unassigned.length,
      inProgressCount: inProgress.length,
      completedCount: completed.length,
      totalHoursBooked,
    };
  }, [allOrders]);

  // Handle Quick Process Status Update
  const handleUpdateProcessStatus = (orderId: string, newStatus: string) => {
    // Map process status to OrderStatus
    let targetStatus: OrderStatus = 'New / Cutting';
    if (newStatus.includes('Stitching') || newStatus.includes('Cutting Completed')) {
      targetStatus = 'Stitching in Progress';
    } else if (newStatus.includes('Trial') || newStatus.includes('Alterations')) {
      targetStatus = 'Trial';
    } else if (newStatus === 'Completed') {
      targetStatus = 'Completed';
    } else if (newStatus === 'Delivered') {
      targetStatus = 'Delivered';
    }

    // Update in roomDb
    roomDb.updateOrderStatus(orderId, targetStatus);
    if (onUpdateOrderStatus) {
      onUpdateOrderStatus(orderId, targetStatus);
    }

    // Update local state
    setAllOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: targetStatus, updatedAt: new Date().toISOString() } : o))
    );
    setStatusMenuOrderId(null);
  };

  // Open order assignment modal
  const handleOpenAssignModal = (ord: TailorOrder, preselectedTailor?: string, preselectedDate?: string) => {
    setEditingOrder(ord);
    const targetTailor = preselectedTailor || ord.assignedTailor || tailors[0]?.name || 'Self (Owner)';
    // Always prioritize the promised date entered while creating/typing the order
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
            }
          : o
      )
    );

    setEditingOrder(null);
  };

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
                <Scissors className="w-4 h-4 text-amber-400" />
                <span>Worker Capacity & Timelines</span>
              </h1>
              <p className="text-[10px] text-amber-300">8h/day Schedule (Mon-Sat), Free Dates & Live Process</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200">
          <div>
            <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
              <Scissors className="w-7 h-7 text-[#0B4636]" />
              <span>Worker Capacity, Timelines & Process Control</span>
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Manage tailor allocations based on 8 hours/day (Mon–Sat) shift limits, track stage statuses, and identify free slots.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="text-xs font-bold text-slate-600 hover:text-[#0B4636] flex items-center gap-1 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-sm cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Dashboard</span>
            </button>
          </div>
        </div>
      )}

      <div className={`space-y-4 ${isDesktopView ? 'w-full' : 'p-4 max-w-2xl mx-auto'}`}>
        {/* KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-[10px] font-bold text-amber-800 uppercase block">Unassigned Orders</span>
            <div className="text-xl font-black text-amber-900 mt-0.5">{queueMetrics.unassignedCount}</div>
            <span className="text-[10px] font-bold text-amber-700 mt-0.5 block">Waiting for Karigar</span>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-[10px] font-bold text-blue-800 uppercase block">Active In-Progress</span>
            <div className="text-xl font-black text-blue-900 mt-0.5">{queueMetrics.inProgressCount}</div>
            <span className="text-[10px] font-bold text-blue-700 mt-0.5 block">
              ~{queueMetrics.totalHoursBooked} Stitching Hours
            </span>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-[10px] font-bold text-emerald-800 uppercase block">Completed Stitches</span>
            <div className="text-xl font-black text-emerald-800 mt-0.5">{queueMetrics.completedCount}</div>
            <span className="text-[10px] font-bold text-emerald-700 mt-0.5 block">Delivered / Ready</span>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Shift Schedule</span>
            <div className="text-sm font-black text-[#0B4636] mt-1">8 Hours / Day</div>
            <span className="text-[10px] font-bold text-slate-500 mt-0.5 block">Monday – Saturday</span>
          </div>
        </div>

        {/* Main Section Tabs */}
        <div className="bg-white rounded-2xl p-1.5 border border-slate-200 shadow-sm flex items-center gap-1 overflow-x-auto">
          {(
            [
              { id: 'matrix', label: 'Worker Load & Status', icon: Users },
              { id: 'schedule_calendar', label: '14-Day Free Slot Calendar (8h/day)', icon: CalendarIcon },
              { id: 'unassigned_queue', label: `Unassigned Queue (${queueMetrics.unassignedCount})`, icon: AlertCircle },
              { id: 'completed_history', label: `Completed Orders (${queueMetrics.completedCount})`, icon: CheckCircle },
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
                    ? 'bg-[#0B4636] text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Worker Filter Dropdown & Search */}
        <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by order #, customer name, or garment type..."
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
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
            >
              <option value="ALL">All Staff Workers ({workerSummaries.length})</option>
              {workerSummaries.map((w) => (
                <option key={w.tailorId} value={w.tailorName}>
                  {w.tailorName} ({w.activeOrdersCount} active)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ================= TAB 1: WORKER LOAD & PROCESS STATUS MATRIX ================= */}
        {activeMainTab === 'matrix' && (
          <div className="space-y-4">
            {workerSummaries
              .filter((w) => selectedWorkerFilter === 'ALL' || w.tailorName === selectedWorkerFilter)
              .map((worker) => {
                const filteredWorkerOrders = worker.activeOrders.filter((o) => {
                  if (!searchQuery) return true;
                  return (
                    o.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    o.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    o.garmentType.toLowerCase().includes(searchQuery.toLowerCase())
                  );
                });

                return (
                  <div
                    key={worker.tailorId}
                    className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
                  >
                    {/* Worker Banner */}
                    <div className="bg-slate-50 p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-[#0B4636] text-amber-300 font-black text-sm flex items-center justify-center shadow">
                          {worker.initials || worker.tailorName.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-extrabold text-sm text-slate-900">{worker.tailorName}</h3>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-200 text-slate-800">
                              {worker.role}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                worker.freeHoursToday > 3
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : worker.freeHoursToday > 0
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {worker.freeHoursToday}h Free Today (out of 8h)
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 font-medium flex items-center gap-3 mt-0.5">
                            <span>{worker.activeOrdersCount} Active Stitches</span>
                            <span>•</span>
                            <span>{worker.activeWorkloadHours} Hours Booked</span>
                            <span>•</span>
                            <span className="text-emerald-800 font-bold">
                              {worker.completedOrdersCount} Completed ({worker.completedRevenueGenerated > 0 ? `₹${worker.completedRevenueGenerated.toLocaleString()}` : '—'})
                            </span>
                          </div>
                        </div>
                      </div>

                      {worker.earliestFreeDate && (
                        <div className="text-right">
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">
                            Earliest Free Slot
                          </span>
                          <span className="text-xs font-black text-emerald-800 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200">
                            {worker.earliestFreeDate}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Worker Orders List */}
                    <div className="p-4 space-y-3">
                      {filteredWorkerOrders.length === 0 ? (
                        <div className="py-6 text-center text-xs font-bold text-slate-400">
                          No active stitches currently assigned to {worker.tailorName}.
                        </div>
                      ) : (
                        filteredWorkerOrders.map((ord) => (
                          <div
                            key={ord.id}
                            className="bg-slate-50 rounded-xl p-3 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-[#0B4636]/40 transition-all"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-extrabold text-sm text-slate-900">{ord.garmentType}</span>
                                <span className="text-xs font-mono font-bold text-slate-500">#{ord.id}</span>
                                <span className="text-xs text-slate-700 font-semibold">({ord.customerName})</span>
                                {ord.isOverdue && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-rose-500 text-white animate-pulse">
                                    Overdue {ord.daysOverdue}d
                                  </span>
                                )}
                              </div>

                              <div className="text-xs text-slate-500 flex flex-wrap items-center gap-3">
                                <span className="flex items-center gap-1">
                                  <CalendarIcon className="w-3 h-3 text-slate-400" />
                                  Due: {ord.dueDate} ({ord.dueTime || '18:00'})
                                </span>
                                <span>•</span>
                                <span className="flex items-center gap-1 font-bold text-amber-800">
                                  <Clock className="w-3 h-3 text-amber-600" />
                                  ~{ord.estimatedHours || 4} Hours Effort
                                </span>
                                <span>•</span>
                                <span>₹{ord.totalAmount} Total</span>
                              </div>
                            </div>

                            {/* Process Status Selector & Actions */}
                            <div className="flex items-center justify-between sm:justify-end gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200">
                              {/* Inline Process Status Dropdown */}
                              <div className="relative">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setStatusMenuOrderId(statusMenuOrderId === ord.id ? null : ord.id)
                                  }
                                  className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
                                    ord.status === 'Completed' || ord.status === 'Delivered'
                                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                      : ord.status === 'Trial'
                                      ? 'bg-blue-100 text-blue-800 border border-blue-300'
                                      : ord.status === 'Stitching in Progress'
                                      ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                      : 'bg-slate-200 text-slate-800 border border-slate-300'
                                  }`}
                                >
                                  <Layers className="w-3.5 h-3.5" />
                                  <span>{ord.status}</span>
                                </button>

                                {/* Dropdown menu for updating process */}
                                {statusMenuOrderId === ord.id && (
                                  <div className="absolute right-0 bottom-full sm:bottom-auto sm:top-full mb-1 sm:mt-1 w-52 bg-white rounded-2xl shadow-xl border border-slate-200 p-1.5 z-30 space-y-1">
                                    <div className="text-[10px] font-black text-slate-400 uppercase px-2 py-1">
                                      Update Stitch Process Stage
                                    </div>
                                    {PROCESS_STAGES.map((stg) => (
                                      <button
                                        key={stg}
                                        onClick={() => handleUpdateProcessStatus(ord.id, stg)}
                                        className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-bold hover:bg-emerald-50 hover:text-[#0B4636] transition-all cursor-pointer flex items-center justify-between"
                                      >
                                        <span>{stg}</span>
                                        {ord.status.includes(stg.split(' ')[0]) && (
                                          <Check className="w-3.5 h-3.5 text-emerald-700" />
                                        )}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>

                              <button
                                onClick={() => handleOpenAssignModal(ord, worker.tailorName)}
                                className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs flex items-center gap-1 cursor-pointer"
                                title="Reassign Worker or Change Promised Due Date"
                              >
                                <Scissors className="w-3.5 h-3.5" />
                                <span>Reassign</span>
                              </button>

                              {onSelectOrder && (
                                <button
                                  onClick={() => onSelectOrder(ord)}
                                  className="px-2.5 py-1.5 bg-[#0B4636] hover:bg-[#073024] text-white font-bold rounded-xl text-xs flex items-center gap-1 cursor-pointer"
                                >
                                  <span>View</span>
                                  <ArrowRight className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        )}

        {/* ================= TAB 2: 14-DAY CALENDAR & FREE DATE SLOTS (8H/DAY MON-SAT) ================= */}
        {activeMainTab === 'schedule_calendar' && (
          <div className="space-y-4">
            <div className="bg-emerald-900/5 p-4 rounded-2xl border border-emerald-800/15 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-black text-[#0B4636] uppercase tracking-wider flex items-center gap-1.5">
                  <CalendarIcon className="w-4 h-4" />
                  <span>Tailor Availability Calendar (8 Working Hours/Day)</span>
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Workers operate on an 8-hour shift Monday to Saturday (Sundays off). Green dates indicate free hours where orders have not been taken yet.
                </p>
              </div>
            </div>

            {workerSummaries
              .filter((w) => selectedWorkerFilter === 'ALL' || w.tailorName === selectedWorkerFilter)
              .map((worker) => (
                <div key={worker.tailorId} className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-[#0B4636] text-amber-300 font-black text-xs flex items-center justify-center">
                        {worker.initials}
                      </div>
                      <div>
                        <h4 className="font-black text-sm text-slate-900">{worker.tailorName}</h4>
                        <span className="text-[10px] text-slate-500 font-bold">Standard 8h/day (Mon-Sat)</span>
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
                            className="bg-slate-100 p-2.5 rounded-xl border border-slate-200 text-center opacity-60"
                          >
                            <div className="text-[10px] font-bold text-slate-500">{slot.dayLabel}</div>
                            <div className="text-xs font-black text-slate-700">{slot.formattedDate}</div>
                            <div className="text-[9px] font-black text-rose-600 mt-1 uppercase">Sunday Off</div>
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
                          className={`p-2.5 rounded-xl border text-center transition-all flex flex-col justify-between cursor-pointer hover:shadow-md hover:scale-[1.02] ${
                            slot.hasNoOrders
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-900 shadow-xs'
                              : slot.isFullyBooked
                              ? 'bg-rose-50 border-rose-300 text-rose-900'
                              : 'bg-amber-50 border-amber-300 text-amber-900'
                          }`}
                        >
                          <div>
                            <div className="text-[10px] font-bold opacity-75">{slot.dayLabel}</div>
                            <div className="text-xs font-black">{slot.formattedDate}</div>
                          </div>

                          <div className="my-1.5">
                            {slot.hasNoOrders ? (
                              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-emerald-200 text-emerald-900 block">
                                8h Free (No Orders)
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

        {/* ================= TAB 3: UNASSIGNED QUEUE ================= */}
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
              .map((ord) => (
                <div
                  key={ord.id}
                  className="bg-white rounded-2xl p-4 border border-amber-300 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm text-slate-900">{ord.garmentType}</span>
                      <span className="text-xs font-mono font-bold text-slate-500">#{ord.id}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900">
                        Unassigned
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1 flex items-center gap-3">
                      <span>Customer: {ord.customerName}</span>
                      <span>•</span>
                      <span>Promised: {ord.dueDate}</span>
                      <span>•</span>
                      <span className="font-bold text-[#0B4636]">₹{ord.totalAmount}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleOpenAssignModal(ord)}
                    className="px-4 py-2 bg-[#0B4636] hover:bg-[#073024] text-amber-300 font-extrabold rounded-xl text-xs shadow flex items-center gap-1.5 cursor-pointer"
                  >
                    <Scissors className="w-3.5 h-3.5" />
                    <span>Assign Karigar Now</span>
                  </button>
                </div>
              ))}

            {queueMetrics.unassignedCount === 0 && (
              <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 shadow-sm">
                <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto mb-2" />
                <h4 className="text-sm font-black text-slate-800">All Orders are Assigned!</h4>
                <p className="text-xs text-slate-500 mt-1">No unassigned orders pending in your queue.</p>
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 4: COMPLETED ORDERS BY WORKER ================= */}
        {activeMainTab === 'completed_history' && (
          <div className="space-y-4">
            {workerSummaries
              .filter((w) => selectedWorkerFilter === 'ALL' || w.tailorName === selectedWorkerFilter)
              .map((worker) => (
                <div key={worker.tailorId} className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-emerald-800 text-white font-black text-xs flex items-center justify-center">
                        {worker.initials}
                      </div>
                      <div>
                        <h4 className="font-black text-sm text-slate-900">{worker.tailorName}</h4>
                        <span className="text-xs text-emerald-800 font-bold">
                          {worker.completedOrdersCount} Completed Orders • Total Revenue:{' '}
                          ₹{worker.completedRevenueGenerated.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {worker.completedOrders.length === 0 ? (
                      <div className="py-4 text-center text-xs font-bold text-slate-400">
                        No completed orders recorded yet for {worker.tailorName}.
                      </div>
                    ) : (
                      worker.completedOrders.map((ord) => (
                        <div
                          key={ord.id}
                          className="bg-slate-50 rounded-xl p-3 border border-slate-200 flex items-center justify-between text-xs"
                        >
                          <div>
                            <div className="font-extrabold text-slate-900">
                              {ord.garmentType} <span className="font-mono text-slate-500 font-normal">#{ord.id}</span>
                            </div>
                            <div className="text-[11px] text-slate-500">
                              Customer: {ord.customerName} • Date: {ord.createdDate}
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="font-black text-emerald-800">₹{ord.totalAmount}</span>
                            <span className="block text-[10px] font-bold text-slate-400">{ord.status}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* ================= ASSIGN WORKER & PROMISED TIMELINE MODAL ================= */}
      {editingOrder && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-lg p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 my-auto animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Scissors className="w-5 h-5 text-[#0B4636]" />
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">Assign Worker & Set Schedule</h3>
                  <p className="text-[10px] text-slate-500">Order #{editingOrder.id} • {editingOrder.customerName}</p>
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
                  <span>1. Select Staff Karigar ({workerSummaries.length} Available)</span>
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
                      <span>2. Click a Date & Assign Time ({modalAssignedTailor}):</span>
                    </label>
                    <span className="text-[10px] text-[#0B4636] font-bold bg-emerald-50 px-2 py-0.5 rounded-full">
                      Tap date to assign
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

                  {/* Dedicated Promised Date & Time Twin Pill Section */}
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
                max={12}
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
                className="flex-1 py-2.5 bg-[#0B4636] hover:bg-[#073024] text-amber-300 font-extrabold rounded-xl text-xs shadow flex items-center justify-center gap-2 cursor-pointer border border-amber-300/30"
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
    </div>
  );
};
