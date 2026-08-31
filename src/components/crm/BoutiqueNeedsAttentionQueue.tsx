import React, { useState, useMemo } from 'react';
import {
  Clock,
  CheckCircle2,
  ChevronRight,
  MessageSquare,
  DollarSign,
  Scissors,
  Eye,
  Phone,
  AlertCircle,
  Zap,
  PackageCheck,
  CheckCheck,
  UserCheck,
  Check,
  Truck,
  Sparkles,
} from 'lucide-react';
import { TailorOrder, OrderStatus } from '../../types';
import { getWhatsAppUrl, formatDisplayPhone } from '../../lib/phoneUtils';
import { useLanguage } from '../../lib/LanguageContext';
import { roomDb } from '../../lib/localRoomDb';
import { formatDisplayDate } from '../../lib/dateUtils';

export interface AttentionItem {
  id: string;
  orderId: string;
  customerName: string;
  customerPhone: string;
  garmentName: string;
  issueType: 'overdue' | 'design_approval' | 'pending_cutting' | 'due_today_stitching' | 'balance_pending' | 'ready_for_trial';
  urgency: 'critical' | 'high' | 'medium' | 'info';
  title: string;
  subtitle: string;
  actionLabel: string;
  amount?: number;
  order?: TailorOrder;
}

interface BoutiqueNeedsAttentionQueueProps {
  orders: TailorOrder[];
  onSelectOrder: (order: TailorOrder) => void;
  onOpenAssignModal?: (order: TailorOrder) => void;
  onQuickCollectPayment?: (order: TailorOrder) => void;
  onUpdateStatus?: (orderId: string, status: OrderStatus) => void;
}

export const BoutiqueNeedsAttentionQueue: React.FC<BoutiqueNeedsAttentionQueueProps> = ({
  orders,
  onSelectOrder,
  onOpenAssignModal,
  onQuickCollectPayment,
  onUpdateStatus,
}) => {
  const { t, isHindi } = useLanguage();
  const [filterTab, setFilterTab] = useState<'all' | 'critical' | 'assign' | 'payment'>('all');
  const [actionSuccessMsg, setActionSuccessMsg] = useState<{ id: string; text: string } | null>(null);

  const showToast = (id: string, text: string) => {
    setActionSuccessMsg({ id, text });
    setTimeout(() => {
      setActionSuccessMsg((curr) => (curr?.id === id ? null : curr));
    }, 3000);
  };

  // 1-Click Action: Mark Ready to Deliver (Completed)
  const handleMarkReadyToDeliver = async (order: TailorOrder, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await roomDb.updateOrderStatus(order.id, 'Completed');
      if (onUpdateStatus) {
        onUpdateStatus(order.id, 'Completed');
      }
      showToast(order.id, 'Marked as Ready to Deliver! 🎉');
    } catch (err) {
      console.error('Failed to update status to Completed:', err);
    }
  };

  // 1-Click Action: Mark Delivered (Auto-settles remaining dues)
  const handleMarkDelivered = async (order: TailorOrder, e: React.MouseEvent) => {
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
          : 'Order Delivered Successfully! ✅'
      );
    } catch (err) {
      console.error('Failed to update status to Delivered:', err);
    }
  };

  // Synthesize intelligent attention queue items from active orders
  const attentionItems = useMemo<AttentionItem[]>(() => {
    const active = orders.filter((o) => !o.isArchived && o.status !== 'Delivered');
    const todayStr = new Date().toISOString().split('T')[0];
    const items: AttentionItem[] = [];

    active.forEach((ord) => {
      // 1. Overdue Deliveries or Trials (CRITICAL - RED)
      if (ord.isOverdue && ord.status !== 'Delivered') {
        const daysBehind = `${ord.daysOverdue || 1} ${t('attention.daysBehind', 'day(s) behind schedule')}`;
        items.push({
          id: `attn-overdue-${ord.id}`,
          orderId: ord.id,
          customerName: ord.customerName,
          customerPhone: ord.customerPhone,
          garmentName: ord.garmentType,
          issueType: 'overdue',
          urgency: 'critical',
          title: `${t('attention.overdueTitle', 'Overdue Delivery')} • ${daysBehind}`,
          subtitle: `${t('attention.statusCurrently', 'Currently in')} "${ord.status}" (${ord.assignedTailor || t('attention.unassignedTailor', 'Unassigned')})`,
          actionLabel: t('attention.openOrder', 'Open Order'),
          amount: ord.balanceDue,
          order: ord,
        });
        return;
      }

      // 2. Orders in Initial Cutting / Processing (HIGH - AMBER)
      if (ord.status === 'New / Cutting') {
        items.push({
          id: `attn-unassigned-${ord.id}`,
          orderId: ord.id,
          customerName: ord.customerName,
          customerPhone: ord.customerPhone,
          garmentName: ord.garmentType,
          issueType: 'pending_cutting',
          urgency: 'high',
          title: t('attention.unassignedTitle', 'New Order in Shop • Pending Cutting / Processing'),
          subtitle: `${t('attention.bookedOn', 'Booked')}: ${ord.createdDate} • ${t('attention.dueBy', 'Delivery due by')}: ${ord.dueDate}`,
          actionLabel: t('attention.openOrder', 'Open Order'),
          amount: ord.totalAmount,
          order: ord,
        });
        return;
      }

      // 3. Due Today while still in Stitching / Making (HIGH - AMBER)
      if (ord.dueDate === todayStr && ord.status !== 'Delivered' && ord.status !== 'Completed') {
        items.push({
          id: `attn-duetoday-${ord.id}`,
          orderId: ord.id,
          customerName: ord.customerName,
          customerPhone: ord.customerPhone,
          garmentName: ord.garmentType,
          issueType: 'due_today_stitching',
          urgency: 'high',
          title: t('attention.dueTodayTitle', 'Due Today • Still in Production'),
          subtitle: `${t('attention.statusCurrently', 'Currently in')} "${ord.status}"`,
          actionLabel: t('attention.openOrder', 'Open Order'),
          amount: ord.balanceDue,
          order: ord,
        });
        return;
      }

      // 4. Completed Garment with Pending Balance (MEDIUM - AMBER/GREEN)
      if ((ord.status === 'Completed' || ord.status === 'Trial') && ord.balanceDue > 0) {
        items.push({
          id: `attn-balance-${ord.id}`,
          orderId: ord.id,
          customerName: ord.customerName,
          customerPhone: ord.customerPhone,
          garmentName: ord.garmentType,
          issueType: 'balance_pending',
          urgency: 'medium',
          title: `₹${ord.balanceDue.toLocaleString('en-IN')} ${t('attention.balanceTitle', 'Balance to Collect')}`,
          subtitle: `${t('attention.readyInBoutique', 'Ready in boutique')} • ${t('attention.advanceCollected', 'Advance')}: ₹${ord.advancePaid}`,
          actionLabel: t('attention.collectBalance', 'Collect Balance'),
          amount: ord.balanceDue,
          order: ord,
        });
        return;
      }

      // 5. Special Notes mentioning approval or sample
      const notes = typeof ord.specialNotes === 'string' ? ord.specialNotes.toLowerCase() : '';
      if (
        notes &&
        (notes.includes('approval') ||
          notes.includes('sample') ||
          notes.includes('urgent') ||
          notes.includes('swatch'))
      ) {
        items.push({
          id: `attn-approval-${ord.id}`,
          orderId: ord.id,
          customerName: ord.customerName,
          customerPhone: ord.customerPhone,
          garmentName: ord.garmentType,
          issueType: 'design_approval',
          urgency: 'medium',
          title: t('attention.approvalTitle', 'Design / Swatch Approval Pending'),
          subtitle: ord.specialNotes,
          actionLabel: t('attention.openOrder', 'Open Order'),
          amount: ord.totalAmount,
          order: ord,
        });
      }
    });

    return items;
  }, [orders, t]);

  // Filtered queue
  const filteredItems = useMemo(() => {
    if (filterTab === 'critical') return attentionItems.filter((i) => i.urgency === 'critical');
    if (filterTab === 'assign') return attentionItems.filter((i) => i.issueType === 'pending_cutting' || i.issueType === 'due_today_stitching');
    if (filterTab === 'payment') return attentionItems.filter((i) => i.issueType === 'balance_pending');
    return attentionItems;
  }, [attentionItems, filterTab]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden font-sans">
      {/* Header bar */}
      <div className="p-3.5 sm:p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/75">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-800 text-white flex items-center justify-center font-bold shrink-0 shadow-xs">
            <Zap className="w-4 h-4 text-white fill-white" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xs sm:text-sm font-extrabold text-slate-900 tracking-tight">
                {t('attention.title', 'Needs Attention')}
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-900 text-white text-[10px] font-bold shadow-xs">
                {attentionItems.length} {t('attention.pendingTasks', 'Tasks')}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              {t('attention.subtitle', 'Urgent actions for deliveries, assignments, ready items, and pending balances')}
            </p>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            type="button"
            onClick={() => setFilterTab('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              filterTab === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {t('attention.all', 'All')} ({attentionItems.length})
          </button>

          <button
            type="button"
            onClick={() => setFilterTab('critical')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              filterTab === 'critical'
                ? 'bg-rose-700 text-white shadow-xs'
                : 'bg-white text-rose-700 hover:bg-rose-50 border border-rose-200'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{t('attention.overdue', 'Overdue Deliveries')} ({attentionItems.filter((i) => i.urgency === 'critical').length})</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterTab('assign')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              filterTab === 'assign'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-white text-amber-800 hover:bg-amber-50 border border-amber-200'
            }`}
          >
            <Scissors className="w-3.5 h-3.5" />
            <span>{t('attention.productionQueue', 'In Production')}</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterTab('payment')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              filterTab === 'payment'
                ? 'bg-emerald-800 text-white shadow-xs'
                : 'bg-white text-emerald-800 hover:bg-emerald-50 border border-emerald-200'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>{t('attention.balance', 'Pending Balances')}</span>
          </button>
        </div>
      </div>

      {/* Needs Attention Items Container */}
      <div className="p-3 bg-slate-50/50">
        {filteredItems.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs font-medium space-y-2 bg-white rounded-xl border border-dashed border-slate-200">
            <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto border border-emerald-200">
              <CheckCircle2 className="w-5 h-5 opacity-90" />
            </div>
            <div className="font-extrabold text-slate-900 text-sm">{t('attention.allClear', 'All clear! No pending urgent items.')}</div>
            <p className="text-xs text-slate-500">{t('attention.allClearSub', 'Everything in this category is up to date and on track.')}</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            {/* ================= DESKTOP / TABLET HORIZONTAL TABLE VIEW (md+) ================= */}
            <div className="hidden md:block overflow-x-auto">
              <div className="min-w-[1020px] divide-y divide-slate-100">
                {/* Table Header */}
                <div className="grid grid-cols-[minmax(230px,1.2fr)_minmax(220px,1.2fr)_minmax(140px,0.8fr)_minmax(140px,0.8fr)_minmax(250px,1.3fr)] gap-4 px-4 py-3 bg-slate-50 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider border-b border-slate-200 items-center">
                  <div>Item & Customer</div>
                  <div>Attention Reason</div>
                  <div>Due Date & Karigar</div>
                  <div className="text-right">Balance & Total</div>
                  <div className="text-right pr-2">Quick Actions</div>
                </div>

                {/* Table Rows */}
                {filteredItems.map((item) => {
                  const isRed = item.urgency === 'critical';
                  const isAmber = item.urgency === 'high';
                  const isCompleted = item.order?.status === 'Completed';

                  const cleanPhone = (item.customerPhone || '').replace(/\D/g, '');
                  const intlPhone = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;
                  const whatsappUrl = getWhatsAppUrl(
                    intlPhone,
                    isHindi
                      ? `नमस्ते ${item.customerName || 'ग्राहक'} जी, बुटीक से आपके ऑर्डर (${item.garmentName || 'Garment'}, ${item.orderId || ''}) के संबंध में:`
                      : `Hello ${item.customerName || 'Customer'}, regarding your boutique order (${item.garmentName || 'Garment'}, ${item.orderId || ''}):`
                  );

                  const isSuccess = actionSuccessMsg?.id === item.order?.id;

                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        if (item.order) {
                          onSelectOrder(item.order);
                        }
                      }}
                      className={`group transition-colors duration-150 cursor-pointer py-3.5 px-4 hover:bg-slate-50 grid grid-cols-[minmax(230px,1.2fr)_minmax(220px,1.2fr)_minmax(140px,0.8fr)_minmax(140px,0.8fr)_minmax(250px,1.3fr)] gap-4 items-center relative border-l-4 ${
                        isRed
                          ? 'border-l-rose-500 bg-rose-50/20'
                          : isAmber
                          ? 'border-l-amber-500 bg-amber-50/15'
                          : 'border-l-emerald-600 bg-emerald-50/15'
                      }`}
                    >
                      {/* Column 1: Customer & Item info */}
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 font-bold text-xs shadow-xs ${
                            isRed
                              ? 'bg-rose-100 text-rose-700'
                              : item.issueType === 'balance_pending'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {isRed ? (
                            <AlertCircle className="w-3.5 h-3.5" />
                          ) : item.issueType === 'balance_pending' ? (
                            <DollarSign className="w-3.5 h-3.5" />
                          ) : (
                            <Scissors className="w-3.5 h-3.5" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1 space-y-0.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-bold text-slate-900 group-hover:text-emerald-800 transition-colors truncate max-w-[140px]">
                              {item.customerName}
                            </span>
                            <span className="text-[10px] font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 shrink-0">
                              {item.garmentName}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-slate-500">
                            <span className="font-mono font-semibold bg-white px-1 py-0.2 rounded border border-slate-200">
                              {item.orderId}
                            </span>
                            {item.customerPhone && (
                              <span className="font-medium">
                                {formatDisplayPhone(item.customerPhone)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Column 2: Attention Reason Tag */}
                      <div className="min-w-0 pr-2">
                        <div
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border shadow-xs max-w-full ${
                            isRed
                              ? 'bg-rose-50 text-rose-800 border-rose-200'
                              : isAmber
                              ? 'bg-amber-50 text-amber-900 border-amber-200'
                              : 'bg-emerald-50 text-emerald-900 border-emerald-200'
                          }`}
                          title={item.subtitle ? `${item.title} • ${item.subtitle}` : item.title}
                        >
                          <span className={`w-2 h-2 rounded-full shrink-0 ${
                            isRed ? 'bg-rose-600 animate-pulse' : isAmber ? 'bg-amber-500' : 'bg-emerald-500'
                          }`} />
                          <span className="truncate">{item.title}</span>
                        </div>
                      </div>

                      {/* Column 3: Dates & Karigar */}
                      <div className="min-w-0 space-y-0.5 pr-2">
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-900 font-semibold">
                          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{item.order?.dueDate ? formatDisplayDate(item.order.dueDate) : 'No due date'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                          <UserCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{item.order?.assignedTailor || 'Unassigned'}</span>
                        </div>
                      </div>

                      {/* Column 4: Financials */}
                      <div className="text-right min-w-0 space-y-1 pr-2">
                        <div className="flex items-center justify-end gap-1">
                          <span className="text-[10px] text-slate-500 uppercase font-semibold">Total:</span>
                          <span className="text-xs font-bold font-mono text-slate-900">
                            ₹{(item.order?.totalAmount || 0).toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div>
                          {item.order && item.order.balanceDue > 0 ? (
                            <span className="inline-flex items-center text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 shadow-xs whitespace-nowrap">
                              Due ₹{item.order.balanceDue.toLocaleString('en-IN')}
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 shadow-xs whitespace-nowrap">
                              Paid
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Column 5: Ready to Deliver & Quick Action Buttons */}
                      <div
                        className="flex items-center justify-end gap-1.5 shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {isSuccess ? (
                          <span className="text-[11px] font-bold text-emerald-900 bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200 animate-pulse">
                            {actionSuccessMsg?.text}
                          </span>
                        ) : (
                          <>
                            {/* If NOT completed yet: Show 'Ready' (Completed) Button */}
                            {item.order && item.order.status !== 'Completed' && item.order.status !== 'Delivered' && (
                              <button
                                type="button"
                                onClick={(e) => handleMarkReadyToDeliver(item.order!, e)}
                                className="h-8 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition-all active:scale-95 whitespace-nowrap shrink-0"
                                title="Mark Ready to Deliver (Completed)"
                              >
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                                <span>Ready</span>
                              </button>
                            )}

                            {/* Direct 'Deliver' Button (Auto-settles remaining balance) */}
                            {item.order && item.order.status !== 'Delivered' && (
                              <button
                                type="button"
                                onClick={(e) => handleMarkDelivered(item.order!, e)}
                                className="h-8 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition-all active:scale-95 whitespace-nowrap shrink-0"
                                title="Mark Delivered (Auto settles remaining balance)"
                              >
                                <Truck className="w-3.5 h-3.5 stroke-[2.5]" />
                                <span>Deliver</span>
                              </button>
                            )}

                            {/* WhatsApp Button */}
                            <a
                              href={whatsappUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="h-8 w-8 rounded-xl bg-[#25D366] hover:bg-[#1faa4b] text-white text-xs font-bold flex items-center justify-center shadow-xs shrink-0 transition-transform active:scale-95"
                              title="Message Customer on WhatsApp"
                            >
                              <MessageSquare className="w-3.5 h-3.5 fill-white" />
                            </a>

                            {/* Open Button */}
                            <button
                              type="button"
                              onClick={() => {
                                if (item.order) onSelectOrder(item.order);
                              }}
                              className="h-8 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-bold flex items-center gap-1 shadow-xs cursor-pointer shrink-0 whitespace-nowrap transition-all active:scale-95 border border-slate-200"
                              title="Open Order Details"
                            >
                              <span>Open</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ================= MOBILE CARD VIEW (< md) ================= */}
            <div className="md:hidden divide-y divide-slate-100">
              {filteredItems.map((item) => {
                const isRed = item.urgency === 'critical';
                const isAmber = item.urgency === 'high';
                const isCompleted = item.order?.status === 'Completed';

                const cleanPhone = (item.customerPhone || '').replace(/\D/g, '');
                const intlPhone = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;
                const whatsappUrl = getWhatsAppUrl(
                  intlPhone,
                  isHindi
                    ? `नमस्ते ${item.customerName || 'ग्राहक'} जी, बुटीक से आपके ऑर्डर (${item.garmentName || 'Garment'}, ${item.orderId || ''}) के संबंध में:`
                    : `Hello ${item.customerName || 'Customer'}, regarding your boutique order (${item.garmentName || 'Garment'}, ${item.orderId || ''}):`
                );

                const isSuccess = actionSuccessMsg?.id === item.order?.id;

                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      if (item.order) {
                        onSelectOrder(item.order);
                      }
                    }}
                    className={`p-3.5 space-y-2.5 relative border-l-4 transition-colors ${
                      isRed
                        ? 'border-l-rose-500 bg-rose-50/20'
                        : isAmber
                        ? 'border-l-amber-500 bg-amber-50/15'
                        : 'border-l-emerald-600 bg-emerald-50/15'
                    }`}
                  >
                    {/* Top Row: Customer info + ID */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 font-bold text-xs ${
                            isRed
                              ? 'bg-rose-100 text-rose-700'
                              : item.issueType === 'balance_pending'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {isRed ? (
                            <AlertCircle className="w-3.5 h-3.5" />
                          ) : item.issueType === 'balance_pending' ? (
                            <DollarSign className="w-3.5 h-3.5" />
                          ) : (
                            <Scissors className="w-3.5 h-3.5" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-900 truncate">{item.customerName}</div>
                          <div className="text-[10px] text-slate-500 flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-slate-700 bg-slate-100 px-1 rounded border border-slate-200">{item.garmentName}</span>
                            <span className="font-mono text-slate-500">{item.orderId}</span>
                          </div>
                        </div>
                      </div>

                      {/* Total & Status */}
                      <div className="text-right shrink-0">
                        <div className="text-xs font-bold font-mono text-slate-900">₹{(item.order?.totalAmount || 0).toLocaleString('en-IN')}</div>
                        {item.order && item.order.balanceDue > 0 ? (
                          <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">
                            Due ₹{item.order.balanceDue}
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                            Paid
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Middle: Attention Reason Pill */}
                    <div>
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold border ${
                          isRed
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : isAmber
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                          isRed ? 'bg-rose-600' : isAmber ? 'bg-amber-600' : 'bg-emerald-600'
                        }`} />
                        <span>{item.title}</span>
                      </span>
                    </div>

                    {/* Date & Karigar tags */}
                    <div className="flex items-center gap-3 text-[11px] text-slate-600 bg-white/80 p-2 rounded-xl border border-slate-200/80">
                      <div className="flex items-center gap-1 font-semibold text-slate-700">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{item.order?.dueDate ? formatDisplayDate(item.order.dueDate) : 'No due date'}</span>
                      </div>
                      <span className="text-slate-300">•</span>
                      <div className="flex items-center gap-1 truncate">
                        <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                        <span className="truncate">{item.order?.assignedTailor || 'Unassigned'}</span>
                      </div>
                    </div>

                    {/* Bottom Action Buttons */}
                    <div className="flex items-center justify-end gap-1.5 pt-1" onClick={(e) => e.stopPropagation()}>
                      {isSuccess ? (
                        <span className="text-xs font-bold text-emerald-900 bg-emerald-100 px-2.5 py-1.5 rounded-xl border border-emerald-200 animate-pulse w-full text-center">
                          {actionSuccessMsg?.text}
                        </span>
                      ) : (
                        <>
                          {item.order && item.order.status !== 'Completed' && item.order.status !== 'Delivered' && (
                            <button
                              type="button"
                              onClick={(e) => handleMarkReadyToDeliver(item.order!, e)}
                              className="h-8 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-bold flex items-center gap-1 shadow-xs active:scale-95"
                            >
                              <Check className="w-3 h-3 stroke-[3]" />
                              <span>Ready</span>
                            </button>
                          )}

                          {item.order && item.order.status !== 'Delivered' && (
                            <button
                              type="button"
                              onClick={(e) => handleMarkDelivered(item.order!, e)}
                              className="h-8 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold flex items-center gap-1 shadow-xs active:scale-95"
                            >
                              <Truck className="w-3 h-3 stroke-[2.5]" />
                              <span>Deliver</span>
                            </button>
                          )}

                          <a
                            href={whatsappUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="h-8 w-8 rounded-xl bg-[#25D366] hover:bg-[#1faa4b] text-white flex items-center justify-center shadow-xs"
                          >
                            <MessageSquare className="w-3.5 h-3.5 fill-white" />
                          </a>

                          <button
                            type="button"
                            onClick={() => {
                              if (item.order) onSelectOrder(item.order);
                            }}
                            className="h-8 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-bold flex items-center gap-1 shadow-xs border border-slate-200"
                          >
                            <span>Open</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
