import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Calendar,
  Clock,
  User,
  Phone,
  Plus,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Sparkles,
  Scissors,
  Check,
  ChevronRight,
  MapPin,
  DollarSign,
  Trash2,
  Edit2,
  CalendarDays,
  Shirt,
  ArrowRight,
  Mic,
  Play,
  Pause,
  Search,
  X,
} from 'lucide-react';
import { BoutiqueAppointment, AppointmentType, TailorOrder } from '../../types';
import { getWhatsAppUrl } from '../../lib/phoneUtils';
import { useLanguage } from '../../lib/LanguageContext';
import {
  getLocalDateStr,
  normalizeDateStr,
  formatDisplayDate,
} from '../../lib/dateUtils';

interface BoutiqueAppointmentsSectionProps {
  appointments: BoutiqueAppointment[];
  orders?: TailorOrder[];
  onOpenBookAppointmentModal: (existing?: BoutiqueAppointment) => void;
  onSaveAppointment?: (appt: BoutiqueAppointment) => void;
  onDeleteAppointment?: (apptId: string) => void;
  onToggleAppointmentChecklist?: (
    apptId: string,
    field: 'garmentReady' | 'accessoriesReady' | 'measurementsLoaded',
    currentVal: boolean
  ) => void;
  onSelectOrder?: (order: TailorOrder) => void;
  onNavigateToManager?: () => void;
}

export const BoutiqueAppointmentsSection: React.FC<BoutiqueAppointmentsSectionProps> = ({
  appointments = [],
  orders = [],
  onOpenBookAppointmentModal,
  onSaveAppointment,
  onDeleteAppointment,
  onToggleAppointmentChecklist,
  onSelectOrder,
  onNavigateToManager,
}) => {
  const { t, isHindi } = useLanguage();
  const [filterTab, setFilterTab] = useState<'today' | 'upcoming' | 'all' | 'completed'>('today');
  const [searchQuery, setSearchQuery] = useState('');
  const [playingApptId, setPlayingApptId] = useState<string | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current = null;
      }
    };
  }, []);

  const todayStr = useMemo(() => getLocalDateStr(), []);

  // Filtered appointments list
  const filteredList = useMemo(() => {
    let list = [...appointments];

    if (filterTab === 'today') {
      list = list.filter((a) => normalizeDateStr(a.date) === todayStr && a.status !== 'Completed' && a.status !== 'Cancelled');
    } else if (filterTab === 'upcoming') {
      list = list.filter((a) => normalizeDateStr(a.date) > todayStr && a.status !== 'Completed' && a.status !== 'Cancelled');
    } else if (filterTab === 'completed') {
      list = list.filter((a) => a.status === 'Completed' || a.status === 'Cancelled');
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (a) =>
          Boolean(a.customerName && a.customerName.toLowerCase().includes(q)) ||
          Boolean(a.customerPhone && a.customerPhone.toLowerCase().includes(q)) ||
          Boolean(a.time && a.time.toLowerCase().includes(q)) ||
          Boolean(a.date && a.date.toLowerCase().includes(q)) ||
          Boolean(a.notes && a.notes.toLowerCase().includes(q)) ||
          Boolean(a.garmentName && a.garmentName.toLowerCase().includes(q)) ||
          Boolean(a.orderId && a.orderId.toLowerCase().includes(q))
      );
    }

    // Sort by date then time
    list.sort((a, b) => {
      const dateA = normalizeDateStr(a.date);
      const dateB = normalizeDateStr(b.date);
      if (dateA !== dateB) {
        return dateA.localeCompare(dateB);
      }
      return (a.time || '').localeCompare(b.time || '');
    });

    return list;
  }, [appointments, filterTab, searchQuery, todayStr]);

  const todayCount = useMemo(
    () => appointments.filter((a) => normalizeDateStr(a.date) === todayStr && a.status !== 'Completed' && a.status !== 'Cancelled').length,
    [appointments, todayStr]
  );
  const upcomingCount = useMemo(
    () => appointments.filter((a) => normalizeDateStr(a.date) > todayStr && a.status !== 'Completed' && a.status !== 'Cancelled').length,
    [appointments, todayStr]
  );

  const getTypeBadge = (type: AppointmentType) => {
    switch (type) {
      case 'Bridal Consultation':
      case 'Design Consultation':
        return {
          label: isHindi ? 'ब्राइडल डिज़ाइन मीटिंग' : 'Design Consultation',
          color: 'bg-[#0B4636] text-white',
        };
      case 'Trial & Fitting':
        return {
          label: isHindi ? 'ट्रायल व फिटिंग' : 'Trial & Fitting',
          color: 'bg-slate-900 text-white',
        };
      case 'Measurements':
        return {
          label: isHindi ? 'नाप (Measurements)' : 'Measurements',
          color: 'bg-emerald-700 text-white',
        };
      case 'Final Pickup & Delivery':
        return {
          label: isHindi ? 'डिलीवरी / पिकअप' : 'Pickup & Delivery',
          color: 'bg-emerald-600 text-white',
        };
      case 'Alteration':
        return {
          label: isHindi ? 'अल्टरेशन रिव्यू' : 'Alteration',
          color: 'bg-slate-800 text-white',
        };
      default:
        return {
          label: type,
          color: 'bg-emerald-800 text-white',
        };
    }
  };

  const handleSendReminder = (appt: BoutiqueAppointment, e: React.MouseEvent) => {
    e.stopPropagation();
    const phone = appt.customerPhone.replace(/\D/g, '');
    const cleanPhone = phone.startsWith('91') ? phone : `91${phone}`;
    const msg = isHindi
      ? `नमस्ते ${appt.customerName} जी, बुटीक से आपके ${appt.type} के अपॉइंटमेंट की याद दिलाने के लिए यह संदेश है। तारीख: ${formatDisplayDate(appt.date)}, समय: ${appt.time}। ${appt.trialRoomAssigned ? `स्थान: ${appt.trialRoomAssigned}। ` : ''}हम आपका स्वागत करने के लिए तैयार हैं!`
      : `Hello ${appt.customerName}, this is a gentle reminder from the boutique regarding your upcoming appointment for ${appt.type} on ${formatDisplayDate(appt.date)} at ${appt.time}.${appt.trialRoomAssigned ? ` (${appt.trialRoomAssigned})` : ''} We look forward to seeing you!`;
    window.open(getWhatsAppUrl(cleanPhone, msg), '_blank');
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden font-sans">
      {/* Header Bar */}
      <div className="p-3 sm:p-3.5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#0B4636] text-white flex items-center justify-center font-bold shrink-0 shadow-2xs">
            <Calendar className="w-3.5 h-3.5 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight">
                {t('appts.title', 'Appointments & Client Visits')}
              </h3>
              {todayCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold text-[10px] shadow-2xs">
                  {todayCount} {t('appts.todayCount', 'Today')}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              {t('appts.subtitle', 'Manage bridal consultations, trials, measurements & delivery visits')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Tabs Filter */}
          <div className="flex items-center bg-white p-0.5 rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => setFilterTab('today')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                filterTab === 'today'
                  ? 'bg-[#0B4636] text-white shadow-2xs'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              {t('appts.tabToday', 'Today')} {todayCount > 0 ? `(${todayCount})` : ''}
            </button>
            <button
              type="button"
              onClick={() => setFilterTab('upcoming')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                filterTab === 'upcoming'
                  ? 'bg-[#0B4636] text-white shadow-2xs'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              {t('appts.tabUpcoming', 'Upcoming')} ({upcomingCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab('all')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                filterTab === 'all'
                  ? 'bg-[#0B4636] text-white shadow-2xs'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              {t('appts.tabAll', 'All')}
            </button>
            <button
              type="button"
              onClick={() => setFilterTab('completed')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                filterTab === 'completed'
                  ? 'bg-[#0B4636] text-white shadow-2xs'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              {t('appts.tabCompleted', 'Completed')}
            </button>
          </div>

          {/* Book Appointment Action Button */}
          <button
            type="button"
            onClick={() => onOpenBookAppointmentModal()}
            className="h-7.5 px-3 bg-[#0B4636] hover:bg-[#073327] text-white rounded-lg text-[11px] font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer shrink-0 active:scale-95"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>{t('appts.newApptBtn', 'New Appointment')}</span>
          </button>
        </div>
      </div>

      {/* Quick Search & Count */}
      <div className="p-2 sm:p-2.5 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-2 border-b border-slate-200">
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search client, phone, purpose..."
            className="w-full pl-8 pr-7 py-1 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-900 focus:border-[#0B4636] outline-hidden placeholder:text-slate-400"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {searchQuery && (
          <div className="text-[11px] font-bold text-slate-500 self-start sm:self-center">
            Found {filteredList.length} match{filteredList.length === 1 ? '' : 'es'}
          </div>
        )}
      </div>

      {/* Appointment List */}
      <div className="p-2 sm:p-2.5 bg-slate-50/30">
        {filteredList.length === 0 ? (
          <div className="py-8 px-4 text-center bg-white rounded-lg border border-dashed border-slate-300 space-y-2">
            <CalendarDays className="w-6 h-6 text-slate-400 mx-auto" />
            <div className="text-xs font-bold text-slate-900">
              {t('appts.noAppts', 'No appointments scheduled for this view.')}
            </div>
            <p className="text-[11px] text-slate-500 max-w-md mx-auto">
              {t('appts.noApptsSub', 'Schedule client trials, measurements, and VIP visits here.')}
            </p>
            <button
              type="button"
              onClick={() => onOpenBookAppointmentModal()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0B4636] hover:bg-[#073327] text-white font-bold text-[11px] shadow-2xs cursor-pointer active:scale-95"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>{t('appts.addApptPrompt', 'Add Appointment')}</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-200 bg-white rounded-lg border border-slate-200 overflow-hidden shadow-2xs">
            {/* Table Header */}
            <div className="hidden lg:grid grid-cols-12 gap-2 px-3 py-1.5 bg-slate-50 text-[11px] font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200">
              <div className="col-span-4">Client & Contact</div>
              <div className="col-span-3">Time & Date</div>
              <div className="col-span-2">Visit Purpose</div>
              <div className="col-span-2 text-right">Balance & Room</div>
              <div className="col-span-1 text-center">Action</div>
            </div>

            {filteredList.map((appt) => {
              const isToday = normalizeDateStr(appt.date) === todayStr;
              const isCompleted = appt.status === 'Completed';
              const typeBadge = getTypeBadge(appt.type);

              return (
                <div
                  key={appt.id}
                  onClick={() => onOpenBookAppointmentModal(appt)}
                  className={`group transition-colors duration-150 cursor-pointer p-2.5 sm:py-2 sm:px-3 hover:bg-emerald-50/40 flex flex-col lg:grid lg:grid-cols-12 gap-2 items-start lg:items-center relative border-l-4 ${
                    isCompleted
                      ? 'border-l-[#0B4636] bg-slate-50/50'
                      : isToday
                      ? 'border-l-emerald-600'
                      : 'border-l-slate-400'
                  }`}
                >
                  {/* Column 1: Client & Contact */}
                  <div className="lg:col-span-4 flex items-center gap-2 min-w-0 w-full">
                    <div className="w-6 h-6 rounded-lg bg-emerald-50 text-[#0B4636] flex items-center justify-center font-bold text-xs shrink-0 border border-emerald-200">
                      <User className="w-3 h-3" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-slate-900 group-hover:text-[#0B4636] transition-colors truncate">
                          {appt.customerName}
                        </span>
                        {appt.garmentName && (
                          <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                            {appt.garmentName}
                          </span>
                        )}
                        {appt.orderId && (
                          <span className="text-[10px] font-mono text-slate-600 bg-white px-1 py-0.5 rounded border border-slate-200">
                            {appt.orderId}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-2">
                        {appt.customerPhone && (
                          <a
                            href={`tel:${appt.customerPhone}`}
                            onClick={(e) => e.stopPropagation()}
                            className="hover:text-[#0B4636]"
                          >
                            {appt.customerPhone}
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Column 2: Time & Date */}
                  <div className="lg:col-span-3 min-w-0 w-full">
                    <div className="flex items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-900 text-white font-mono">
                        <Clock className="w-2.5 h-2.5 text-emerald-400" />
                        <span>{appt.time}</span>
                      </span>
                      <span className="text-[11px] font-semibold text-slate-900">
                        {formatDisplayDate(appt.date)}
                      </span>
                    </div>
                    {appt.notes && (
                      <div className="text-[10px] text-slate-500 truncate mt-0.5">
                        {appt.notes}
                      </div>
                    )}
                  </div>

                  {/* Column 3: Visit Purpose Pill */}
                  <div className="lg:col-span-2 min-w-0 w-full">
                    <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded ${typeBadge.color}`}>
                      {typeBadge.label}
                    </span>
                  </div>

                  {/* Column 4: Balance & Location */}
                  <div className="lg:col-span-2 text-left lg:text-right min-w-0 w-full text-xs space-y-0.5">
                    {appt.balanceToCollect && appt.balanceToCollect > 0 ? (
                      <div className="text-xs font-bold font-mono text-rose-600">
                        Due: ₹{appt.balanceToCollect.toLocaleString('en-IN')}
                      </div>
                    ) : (
                      <div className="text-[11px] font-semibold text-emerald-700">
                        No Dues
                      </div>
                    )}
                    {appt.trialRoomAssigned && (
                      <div className="text-[10px] text-slate-500 flex items-center lg:justify-end gap-1">
                        <MapPin className="w-2.5 h-2.5 text-emerald-700" />
                        <span>{appt.trialRoomAssigned}</span>
                      </div>
                    )}
                  </div>

                  {/* Column 5: Action Button */}
                  <div className="lg:col-span-1 flex items-center justify-end gap-1 w-full lg:w-auto mt-2 lg:mt-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={(e) => handleSendReminder(appt, e)}
                      className="h-6.5 px-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-[10px] font-bold flex items-center gap-1 shadow-2xs cursor-pointer transition-colors"
                      title="Send WhatsApp Reminder"
                    >
                      <MessageSquare className="w-2.5 h-2.5 fill-white" />
                    </button>

                    <button
                      type="button"
                      onClick={() => onOpenBookAppointmentModal(appt)}
                      className="h-6.5 px-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-bold flex items-center gap-1 shadow-2xs cursor-pointer transition-colors"
                    >
                      <span>Open</span>
                      <ChevronRight className="w-2.5 h-2.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
