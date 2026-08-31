import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Calendar,
  Clock,
  User,
  Phone,
  Scissors,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Plus,
  Search,
  Filter,
  MessageCircle,
  Edit2,
  Trash2,
  Sparkles,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  Eye,
  DollarSign,
  Check,
  Mic,
  Play,
  Pause,
  Volume2,
  Table as TableIcon,
  LayoutGrid,
  X,
} from 'lucide-react';
import { BoutiqueAppointment, AppointmentType, TailorOrder } from '../../types';
import { useLanguage } from '../../lib/LanguageContext';
import { BoutiqueAppointmentModal } from './BoutiqueAppointmentModal';
import {
  getLocalDateStr,
  getOffsetDateStr,
  normalizeDateStr,
  formatDisplayDate,
} from '../../lib/dateUtils';

interface ScreenAppointmentsManagerProps {
  appointments: BoutiqueAppointment[];
  orders?: TailorOrder[];
  onSaveAppointment: (appt: BoutiqueAppointment) => Promise<void> | void;
  onDeleteAppointment: (apptId: string) => Promise<void> | void;
  onToggleAppointmentChecklist: (
    apptId: string,
    field: 'garmentReady' | 'accessoriesReady' | 'measurementsLoaded',
    val: boolean
  ) => Promise<void> | void;
  onSelectOrder?: (order: TailorOrder) => void;
  onNavigateToNewOrder?: () => void;
}

export const ScreenAppointmentsManager: React.FC<ScreenAppointmentsManagerProps> = ({
  appointments = [],
  orders = [],
  onSaveAppointment,
  onDeleteAppointment,
  onToggleAppointmentChecklist,
  onSelectOrder,
  onNavigateToNewOrder,
}) => {
  const { t, language } = useLanguage();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState<'today' | 'tomorrow' | 'this_week' | 'upcoming' | 'all' | 'completed' | 'cancelled'>('today');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [roomFilter, setRoomFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<BoutiqueAppointment | null>(null);
  const [playingApptId, setPlayingApptId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current = null;
      }
    };
  }, []);

  const formatVoiceDuration = (totalSec: number) => {
    if (!totalSec || totalSec <= 0) return '0:00';
    const mins = Math.floor(totalSec / 60);
    const secs = Math.round(totalSec % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleToggleApptVoice = (appt: BoutiqueAppointment) => {
    if (!appt.voiceNoteUrl) return;

    if (playingApptId === appt.id) {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
      setPlayingApptId(null);
      return;
    }

    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
    }

    const audio = new Audio(appt.voiceNoteUrl);
    audioPlayerRef.current = audio;
    setPlayingApptId(appt.id);

    audio.onended = () => {
      setPlayingApptId(null);
    };

    audio.onerror = () => {
      setPlayingApptId(null);
    };

    audio.play().catch((e) => {
      console.warn('Audio playback error:', e);
      setPlayingApptId(null);
    });
  };

  const todayStr = useMemo(() => getLocalDateStr(), []);
  const tomorrowStr = useMemo(() => getOffsetDateStr(1), []);
  const in7DaysStr = useMemo(() => getOffsetDateStr(7), []);

  // Top Metrics Calculation
  const metrics = useMemo(() => {
    let todayCount = 0;
    let upcomingCount = 0;
    let trialsReady = 0;
    let completedCount = 0;
    let pendingBalance = 0;

    appointments.forEach((a) => {
      const apptDate = normalizeDateStr(a.date);
      if (a.status === 'Completed') {
        completedCount++;
      } else if (a.status !== 'Cancelled') {
        if (apptDate === todayStr) {
          todayCount++;
        } else if (apptDate > todayStr) {
          upcomingCount++;
        }

        if (a.garmentReady && a.measurementsLoaded) {
          trialsReady++;
        }

        if (a.balanceToCollect && a.balanceToCollect > 0) {
          pendingBalance += a.balanceToCollect;
        }
      }
    });

    return {
      todayCount,
      upcomingCount,
      trialsReady,
      completedCount,
      pendingBalance,
    };
  }, [appointments, todayStr]);

  // Filter appointments
  const filteredAppointments = useMemo(() => {
    return appointments.filter((appt) => {
      const apptDate = normalizeDateStr(appt.date);

      // 1. Tab Filter
      if (selectedTab === 'today') {
        if (apptDate !== todayStr || appt.status === 'Completed' || appt.status === 'Cancelled') {
          return false;
        }
      } else if (selectedTab === 'tomorrow') {
        if (apptDate !== tomorrowStr || appt.status === 'Completed' || appt.status === 'Cancelled') {
          return false;
        }
      } else if (selectedTab === 'this_week') {
        if (apptDate < todayStr || apptDate > in7DaysStr || appt.status === 'Completed' || appt.status === 'Cancelled') {
          return false;
        }
      } else if (selectedTab === 'upcoming') {
        if (apptDate <= todayStr || appt.status === 'Completed' || appt.status === 'Cancelled') {
          return false;
        }
      } else if (selectedTab === 'completed') {
        if (appt.status !== 'Completed') {
          return false;
        }
      } else if (selectedTab === 'cancelled') {
        if (appt.status !== 'Cancelled') {
          return false;
        }
      }

      // 2. Type Filter
      if (typeFilter !== 'all' && appt.type !== typeFilter) {
        return false;
      }

      // 3. Room Filter
      if (roomFilter !== 'all' && (!appt.trialRoomAssigned || !appt.trialRoomAssigned.includes(roomFilter))) {
        return false;
      }

      // 4. Search Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = Boolean(appt.customerName && appt.customerName.toLowerCase().includes(q));
        const matchPhone = Boolean(appt.customerPhone && appt.customerPhone.toLowerCase().includes(q));
        const matchGarment = Boolean(appt.garmentName && appt.garmentName.toLowerCase().includes(q));
        const matchOrder = Boolean(appt.orderId && appt.orderId.toLowerCase().includes(q));
        const matchNotes = Boolean(appt.notes && appt.notes.toLowerCase().includes(q));
        if (!matchName && !matchPhone && !matchGarment && !matchOrder && !matchNotes) {
          return false;
        }
      }

      return true;
    });
  }, [appointments, selectedTab, typeFilter, roomFilter, searchQuery, todayStr, tomorrowStr, in7DaysStr]);

  const handleOpenNewModal = () => {
    setEditingAppointment(null);
    setIsModalOpen(true);
  };

  const handleEditAppointment = (appt: BoutiqueAppointment) => {
    setEditingAppointment(appt);
    setIsModalOpen(true);
  };

  const handleDeleteAppointment = (appt: BoutiqueAppointment) => {
    const confirmMsg = t('appts.deleteConfirm') || `Remove appointment for ${appt.customerName}?`;
    if (window.confirm(confirmMsg)) {
      onDeleteAppointment(appt.id);
    }
  };

  const handleStatusChange = async (appt: BoutiqueAppointment, newStatus: BoutiqueAppointment['status']) => {
    const isCompleted = newStatus === 'Completed';
    const nowIso = new Date().toISOString();
    const updated: BoutiqueAppointment = {
      ...appt,
      status: newStatus,
      updatedAt: nowIso,
      ...(isCompleted && !(appt as any).completedAt ? { completedAt: nowIso } : {}),
    };

    try {
      await onSaveAppointment(updated);
      if (isCompleted) {
        setToastMessage(`✓ Appointment for ${appt.customerName} marked Completed and synced to database!`);
      } else {
        setToastMessage(`Appointment for ${appt.customerName} status updated to "${newStatus}" in database.`);
      }
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err) {
      console.error('Failed to update appointment status in database:', err);
    }
  };

  // WhatsApp Reminder Generator
  const sendWhatsAppReminder = (appt: BoutiqueAppointment) => {
    const phoneClean = appt.customerPhone.replace(/[^0-9]/g, '');
    const formattedPhone = phoneClean.length === 10 ? `91${phoneClean}` : phoneClean;
    
    let text = '';
    if (language === 'hi') {
      text = `नमस्ते ${appt.customerName} जी, बुटीक में आपकी मुलाकात का समय:\n📅 तारीख: ${appt.date}\n⏰ समय: ${appt.time}\n👗 उद्देश्य: ${appt.type} ${appt.garmentName ? `(${appt.garmentName})` : ''}\n📍 ट्रायल रूम: ${appt.trialRoomAssigned || 'मेन स्टूडियो'}\n${appt.balanceToCollect ? `💰 बाकी पेमेंट: ₹${appt.balanceToCollect}\n` : ''}\nकृपया समय पर पधारें। धन्यवाद!`;
    } else if (language === 'bn') {
      text = `নমস্কার ${appt.customerName}, আমাদের বুটিকে আপনার সাক্ষাতের সময়সূচি:\n📅 তারিখ: ${appt.date}\n⏰ সময়: ${appt.time}\n👗 বিষয়: ${appt.type} ${appt.garmentName ? `(${appt.garmentName})` : ''}\n📍 ট্রায়াল রুম: ${appt.trialRoomAssigned || 'মেইন স্টুডিও'}\n${appt.balanceToCollect ? `💰 বকেয়া: ₹${appt.balanceToCollect}\n` : ''}\nঅনুগ্রহ করে সময়মতো আসবেন। ধন্যবাদ!`;
    } else if (language === 'or') {
      text = `ନମସ୍କାର ${appt.customerName}, ଆମ ବୁଟିକ୍ ରେ ଆପଣଙ୍କ ଭେଟ ସମୟସୂଚୀ:\n📅 ତାରିଖ: ${appt.date}\n⏰ ସମୟ: ${appt.time}\n👗 ଉଦ୍ଦେଶ୍ୟ: ${appt.type} ${appt.garmentName ? `(${appt.garmentName})` : ''}\n📍 ଟ୍ରାଏଲ୍ ରୁମ୍: ${appt.trialRoomAssigned || 'ମେନ୍ ଷ୍ଟୁଡିଓ'}\n${appt.balanceToCollect ? `💰 ବାକି ଟଙ୍କା: ₹${appt.balanceToCollect}\n` : ''}\nଦୟାକରି ଠିକ୍ ସମୟରେ ଆସନ୍ତୁ। ଧନ୍ୟବାଦ!`;
    } else {
      text = `Hello ${appt.customerName}, gentle reminder for your visit at our boutique:\n📅 Date: ${appt.date}\n⏰ Time: ${appt.time}\n👗 Purpose: ${appt.type} ${appt.garmentName ? `(${appt.garmentName})` : ''}\n📍 Room: ${appt.trialRoomAssigned || 'Main Studio'}\n${appt.balanceToCollect ? `💰 Balance Due: ₹${appt.balanceToCollect}\n` : ''}\nWe look forward to hosting you!`;
    }

    const url = `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const getStatusBadgeStyle = (status: BoutiqueAppointment['status']) => {
    switch (status) {
      case 'Scheduled':
        return 'bg-[#fdab3d] text-white hover:bg-[#e59b37]';
      case 'In Progress':
        return 'bg-[#0073ea] text-white hover:bg-[#0060c2]';
      case 'Completed':
        return 'bg-[#00c875] text-white hover:bg-[#00a35f]';
      case 'Cancelled':
        return 'bg-[#e2445c] text-white hover:bg-[#cb3e52]';
      case 'Rescheduled':
        return 'bg-[#a25ddc] text-white hover:bg-[#8e4ec2]';
      default:
        return 'bg-slate-500 text-white';
    }
  };

  const getTypeColor = (type: AppointmentType) => {
    switch (type) {
      case 'Bridal Consultation':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Trial & Fitting':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Final Pickup & Delivery':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Measurements':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Alteration':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'Others':
        return 'bg-teal-50 text-teal-700 border-teal-200';
      case 'Design Consultation':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'Style & Design Selection':
        return 'bg-cyan-50 text-cyan-700 border-cyan-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="p-3 sm:p-5 lg:p-6 space-y-3.5 max-w-7xl mx-auto font-sans bg-[#f5f6f8] min-h-screen">
      {/* ========================================================================= */}
      {/* 1. MONDAY.COM BOARD HEADER & TOOLBAR */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-xl border border-[#d0d4e4] p-3.5 sm:p-4.5 shadow-2xs space-y-3.5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#0073ea] text-white flex items-center justify-center shadow-xs font-black">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-[#323338] tracking-tight">
                  {t('appts.title', 'Client Appointments & Visits')}
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#e5f0ff] text-[#0073ea]">
                  {appointments.length} total
                </span>
              </div>
              <p className="text-xs text-[#676879] font-normal">
                {t('appts.subtitle', 'Manage bridal consultations, trials, measurements & delivery visits')}
              </p>
            </div>
          </div>

          {/* New Appointment Button */}
          <div className="flex items-center gap-2 self-stretch sm:self-auto">
            <button
              type="button"
              onClick={handleOpenNewModal}
              className="flex-1 sm:flex-none px-4 py-2 rounded-lg bg-[#0073ea] hover:bg-[#0060c2] text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>{t('appts.newApptBtn', 'New Appointment')}</span>
            </button>
          </div>
        </div>

        {/* Monday Style Quick Metric Strips */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1 border-t border-[#e6e9ef]">
          <div className="p-2.5 rounded-lg bg-[#f8f9fb] border border-[#e6e9ef] flex flex-col justify-between">
            <span className="text-[11px] text-[#676879] font-medium">Today's Visits</span>
            <span className="text-lg font-bold text-[#0073ea] font-mono">{metrics.todayCount}</span>
          </div>
          <div className="p-2.5 rounded-lg bg-[#f8f9fb] border border-[#e6e9ef] flex flex-col justify-between">
            <span className="text-[11px] text-[#676879] font-medium">Upcoming Queue</span>
            <span className="text-lg font-bold text-[#fdab3d] font-mono">{metrics.upcomingCount}</span>
          </div>
          <div className="p-2.5 rounded-lg bg-[#f8f9fb] border border-[#e6e9ef] flex flex-col justify-between">
            <span className="text-[11px] text-[#676879] font-medium">Trials Ready</span>
            <span className="text-lg font-bold text-[#00c875] font-mono">{metrics.trialsReady}</span>
          </div>
          <div className="p-2.5 rounded-lg bg-[#f8f9fb] border border-[#e6e9ef] flex flex-col justify-between">
            <span className="text-[11px] text-[#676879] font-medium">Completed</span>
            <span className="text-lg font-bold text-[#676879] font-mono">{metrics.completedCount}</span>
          </div>
          <div className="p-2.5 rounded-lg bg-[#f8f9fb] border border-[#e6e9ef] flex flex-col justify-between col-span-2 sm:col-span-1">
            <span className="text-[11px] text-[#676879] font-medium">Pending Dues</span>
            <span className="text-lg font-bold text-[#e2445c] font-mono">₹{metrics.pendingBalance.toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* Date Filter Tabs in Monday Board Style */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#e6e9ef] flex-wrap">
          <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
            {[
              { id: 'today', label: t('appts.tabToday', 'Today'), count: metrics.todayCount },
              { id: 'tomorrow', label: t('appts.tabTomorrow', 'Tomorrow') },
              { id: 'this_week', label: t('appts.tabThisWeek', 'This Week') },
              { id: 'upcoming', label: t('appts.tabUpcoming', 'Upcoming') },
              { id: 'all', label: t('appts.tabAll', 'All'), count: appointments.length },
              { id: 'completed', label: t('appts.tabCompleted', 'Completed'), count: metrics.completedCount },
              { id: 'cancelled', label: t('appts.tabCancelled', 'Cancelled') },
            ].map((tab) => {
              const isActive = selectedTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSelectedTab(tab.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-[#0073ea] text-white shadow-2xs'
                      : 'bg-[#f0f3f8] hover:bg-[#e6e9ef] text-[#323338]'
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                        isActive ? 'bg-white/20 text-white' : 'bg-black/10 text-[#676879]'
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center bg-[#f0f3f8] p-0.5 rounded-lg border border-[#d0d4e4] shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white text-[#0073ea] shadow-2xs'
                  : 'text-[#676879] hover:text-[#323338]'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Table</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'cards'
                  ? 'bg-white text-[#0073ea] shadow-2xs'
                  : 'text-[#676879] hover:text-[#323338]'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Cards</span>
            </button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 pt-1">
          <div className="sm:col-span-6 relative">
            <Search className="w-4 h-4 text-[#676879] absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder={t('appts.searchPlaceholder', 'Search client name, phone (98765...), garment or Order Ref...')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs bg-[#f8f9fb] border border-[#d0d4e4] rounded-lg focus:bg-white focus:border-[#0073ea] focus:ring-1 focus:ring-[#0073ea] outline-hidden text-[#323338] font-medium"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-[#676879] hover:text-[#323338] cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="sm:col-span-3">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs font-medium bg-[#f8f9fb] border border-[#d0d4e4] rounded-lg focus:bg-white focus:border-[#0073ea] outline-hidden text-[#323338]"
            >
              <option value="all">{t('appts.filterTypeAll', 'All Visit Types')}</option>
              <option value="Bridal Consultation">Bridal Consultation</option>
              <option value="Trial & Fitting">Trial & Fitting</option>
              <option value="Measurements">Measurements</option>
              <option value="Alteration">Alteration</option>
              <option value="Final Pickup & Delivery">Final Pickup & Delivery</option>
              <option value="Design Consultation">Design Consultation</option>
              <option value="Fabric Selection">Fabric Selection</option>
              <option value="VIP Walk-in">VIP Walk-in</option>
              <option value="Others">Others</option>
            </select>
          </div>

          <div className="sm:col-span-3">
            <select
              value={roomFilter}
              onChange={(e) => setRoomFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs font-medium bg-[#f8f9fb] border border-[#d0d4e4] rounded-lg focus:bg-white focus:border-[#0073ea] outline-hidden text-[#323338]"
            >
              <option value="all">{t('appts.filterRoomAll', 'All Trial Rooms')}</option>
              <option value="Suite 1">Suite 1 (Bridal)</option>
              <option value="Suite 2">Suite 2 (Mirror Room)</option>
              <option value="Station A">Station A (Fitting)</option>
              <option value="Front Desk">Front Desk</option>
            </select>
          </div>
        </div>
      </div>

      {/* Success Notification Banner */}
      {toastMessage && (
        <div className="p-3.5 bg-emerald-50 border border-[#00c875] rounded-xl flex items-center justify-between text-emerald-950 font-semibold text-xs shadow-2xs animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#00c875] shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-emerald-700 hover:text-emerald-950 p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. MONDAY.COM BOARD VIEWS (TABLE OR CARDS) */}
      {/* ========================================================================= */}
      {filteredAppointments.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center border border-[#d0d4e4] shadow-2xs space-y-3">
          <div className="w-14 h-14 rounded-full bg-[#f0f3f8] text-[#0073ea] mx-auto flex items-center justify-center">
            <Calendar className="w-7 h-7 stroke-[1.5]" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-[#323338]">{t('appts.noAppts', 'No Appointments Found')}</h3>
            <p className="text-xs text-[#676879] max-w-md mx-auto">{t('appts.noApptsSub', 'No visits match your active date filter or search criteria.')}</p>
          </div>
          <button
            type="button"
            onClick={handleOpenNewModal}
            className="px-4 py-2 rounded-lg bg-[#0073ea] hover:bg-[#0060c2] text-white font-semibold text-xs inline-flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>{t('appts.addApptPrompt', 'Create New Appointment')}</span>
          </button>
        </div>
      ) : viewMode === 'table' ? (
        /* ================= MONDAY.COM TABLE / BOARD VIEW (NO HORIZONTAL SCROLLBAR) ================= */
        <div className="bg-white rounded-xl border border-[#d0d4e4] shadow-2xs overflow-hidden">
          {/* Header Row */}
          <div className="hidden lg:grid grid-cols-12 gap-2 px-4 py-2.5 bg-[#f8f9fb] text-[11px] font-bold text-[#676879] uppercase tracking-wider border-b border-[#e6e9ef] items-center">
            <div className="col-span-4">Client & Contact</div>
            <div className="col-span-3">Purpose & Schedule</div>
            <div className="col-span-2">Pre-Visit Readiness</div>
            <div className="col-span-1">Status</div>
            <div className="col-span-2 text-right pr-2">Actions</div>
          </div>

          {/* Rows */}
          <div className="divide-y divide-[#e6e9ef]">
            {filteredAppointments.map((appt) => {
              const isToday = normalizeDateStr(appt.date) === todayStr;
              const isDone = appt.status === 'Completed';
              const isCancelled = appt.status === 'Cancelled';
              const matchedOrder = appt.orderId ? orders.find((o) => o.id === appt.orderId) : null;

              return (
                <div
                  key={appt.id}
                  className={`group transition-colors duration-150 hover:bg-[#f8fafd] flex flex-col lg:grid lg:grid-cols-12 gap-2.5 lg:gap-2 px-3.5 sm:px-4 py-3 items-stretch lg:items-center border-l-4 ${
                    isDone
                      ? 'border-l-[#00c875]'
                      : isCancelled
                      ? 'border-l-[#e2445c]'
                      : isToday
                      ? 'border-l-[#0073ea] bg-blue-50/10'
                      : 'border-l-[#fdab3d]'
                  }`}
                >
                  {/* Column 1: Client & Contact (Col 1-4) */}
                  <div className="lg:col-span-4 flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-[#e5f0ff] text-[#0073ea] font-bold text-xs flex items-center justify-center shrink-0 border border-[#cce1ff]">
                      {appt.customerName.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-xs text-[#323338] truncate flex items-center gap-1.5">
                        <span className="truncate">{appt.customerName}</span>
                        {isToday && (
                          <span className="px-1.5 py-0.2 rounded bg-[#0073ea] text-white text-[9px] font-bold uppercase shrink-0">
                            Today
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-[#676879] flex items-center gap-2 flex-wrap mt-0.5">
                        <a
                          href={`tel:${appt.customerPhone}`}
                          className="hover:text-[#0073ea] flex items-center gap-1 transition-colors"
                        >
                          <Phone className="w-2.5 h-2.5 text-[#676879]" />
                          <span>{appt.customerPhone}</span>
                        </a>
                        {appt.orderId && (
                          <>
                            <span className="text-slate-300">•</span>
                            <button
                              type="button"
                              onClick={() => {
                                if (matchedOrder && onSelectOrder) onSelectOrder(matchedOrder);
                              }}
                              className="text-[10px] font-bold text-[#0073ea] hover:underline flex items-center gap-0.5 truncate cursor-pointer"
                            >
                              <span>{appt.orderId}</span>
                              <ExternalLink className="w-2 h-2" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Column 2: Purpose & Schedule (Col 5-7) */}
                  <div className="lg:col-span-3 flex lg:flex-col items-center lg:items-start justify-between lg:justify-center gap-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold border ${getTypeColor(appt.type)} truncate`}>
                        {appt.type}
                      </span>
                      {appt.trialRoomAssigned && (
                        <span className="text-[10px] text-[#676879] inline-flex items-center gap-0.5 truncate">
                          <MapPin className="w-2.5 h-2.5 text-[#676879]" />
                          <span className="truncate">{appt.trialRoomAssigned}</span>
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-[#323338] font-medium">
                      <span className="flex items-center gap-1 font-semibold">
                        <Calendar className="w-3 h-3 text-[#0073ea]" />
                        <span>{formatDisplayDate(appt.date)}</span>
                      </span>
                      <span className="flex items-center gap-1 font-bold text-[#676879]">
                        <Clock className="w-3 h-3 text-[#fdab3d]" />
                        <span>{appt.time}</span>
                      </span>
                    </div>
                  </div>

                  {/* Column 3: Pre-Visit Checklist (Col 8-9) */}
                  <div className="lg:col-span-2 flex items-center gap-1 flex-wrap">
                    <button
                      type="button"
                      onClick={() => onToggleAppointmentChecklist(appt.id, 'garmentReady', !appt.garmentReady)}
                      className={`px-1.5 py-1 rounded text-[10px] font-semibold flex items-center gap-0.5 border transition-all cursor-pointer ${
                        appt.garmentReady
                          ? 'bg-[#e5f9f1] text-[#00854d] border-[#b3efd4] font-bold'
                          : 'bg-[#f8f9fb] text-[#676879] border-[#d0d4e4] hover:bg-[#e6e9ef]'
                      }`}
                      title="Garment Ready"
                    >
                      <Check className={`w-3 h-3 ${appt.garmentReady ? 'text-[#00854d]' : 'text-slate-400'}`} />
                      <span>Cloth</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onToggleAppointmentChecklist(appt.id, 'accessoriesReady', !appt.accessoriesReady)}
                      className={`px-1.5 py-1 rounded text-[10px] font-semibold flex items-center gap-0.5 border transition-all cursor-pointer ${
                        appt.accessoriesReady
                          ? 'bg-[#e5f9f1] text-[#00854d] border-[#b3efd4] font-bold'
                          : 'bg-[#f8f9fb] text-[#676879] border-[#d0d4e4] hover:bg-[#e6e9ef]'
                      }`}
                      title="Trims/Accessories Ready"
                    >
                      <Check className={`w-3 h-3 ${appt.accessoriesReady ? 'text-[#00854d]' : 'text-slate-400'}`} />
                      <span>Trims</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onToggleAppointmentChecklist(appt.id, 'measurementsLoaded', !appt.measurementsLoaded)}
                      className={`px-1.5 py-1 rounded text-[10px] font-semibold flex items-center gap-0.5 border transition-all cursor-pointer ${
                        appt.measurementsLoaded
                          ? 'bg-[#e5f9f1] text-[#00854d] border-[#b3efd4] font-bold'
                          : 'bg-[#f8f9fb] text-[#676879] border-[#d0d4e4] hover:bg-[#e6e9ef]'
                      }`}
                      title="Measurements on file"
                    >
                      <Check className={`w-3 h-3 ${appt.measurementsLoaded ? 'text-[#00854d]' : 'text-slate-400'}`} />
                      <span>Naap</span>
                    </button>
                  </div>

                  {/* Column 4: Status Selector (Col 10) */}
                  <div className="lg:col-span-1 flex items-center justify-between lg:justify-start gap-2 min-w-0">
                    <select
                      value={appt.status}
                      onChange={(e) => handleStatusChange(appt, e.target.value as any)}
                      className={`w-full min-w-[115px] max-w-[135px] text-[11px] font-bold px-2.5 py-1 rounded-md border-0 outline-hidden cursor-pointer shadow-2xs transition-all ${getStatusBadgeStyle(
                        appt.status
                      )}`}
                    >
                      <option value="Scheduled" className="bg-white text-[#323338]">Scheduled</option>
                      <option value="In Progress" className="bg-white text-[#323338]">In Progress</option>
                      <option value="Completed" className="bg-white text-[#323338]">Completed</option>
                      <option value="Rescheduled" className="bg-white text-[#323338]">Rescheduled</option>
                      <option value="Cancelled" className="bg-white text-[#323338]">Cancelled</option>
                    </select>
                  </div>

                  {/* Column 5: Quick Actions (Col 11-12) */}
                  <div className="lg:col-span-2 flex items-center justify-end gap-1.5 pt-2 lg:pt-0 border-t lg:border-t-0 border-[#e6e9ef] shrink-0">
                    {appt.customerPhone && (
                      <button
                        type="button"
                        onClick={() => sendWhatsAppReminder(appt)}
                        className="h-7 w-7 rounded-md bg-[#25D366] hover:bg-[#1faa4b] text-white flex items-center justify-center shadow-2xs cursor-pointer transition-transform active:scale-95 shrink-0"
                        title="WhatsApp Reminder"
                      >
                        <MessageCircle className="w-3.5 h-3.5 fill-white" />
                      </button>
                    )}

                    {appt.customerPhone && (
                      <a
                        href={`tel:${appt.customerPhone}`}
                        className="h-7 w-7 rounded-md bg-[#f0f3f8] hover:bg-[#e6e9ef] text-[#323338] border border-[#d0d4e4] flex items-center justify-center shadow-2xs transition-colors shrink-0"
                        title="Call Client"
                      >
                        <Phone className="w-3 h-3" />
                      </a>
                    )}

                    {appt.voiceNoteUrl && (
                      <button
                        type="button"
                        onClick={() => handleToggleApptVoice(appt)}
                        className={`h-7 px-1.5 rounded-md font-bold text-[10px] flex items-center gap-0.5 border transition-all cursor-pointer shrink-0 ${
                          playingApptId === appt.id
                            ? 'bg-[#0073ea] text-white border-[#0073ea]'
                            : 'bg-[#f0f3f8] hover:bg-[#e6e9ef] text-[#323338] border-[#d0d4e4]'
                        }`}
                        title="Voice Note"
                      >
                        {playingApptId === appt.id ? <Pause className="w-2.5 h-2.5" /> : <Play className="w-2.5 h-2.5" />}
                        <span className="text-[9px]">{appt.voiceNoteDuration ? formatVoiceDuration(appt.voiceNoteDuration) : 'Voice'}</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleEditAppointment(appt)}
                      className="h-7 w-7 rounded-md bg-[#f0f3f8] hover:bg-[#e6e9ef] text-[#323338] border border-[#d0d4e4] flex items-center justify-center shadow-2xs cursor-pointer transition-colors shrink-0"
                      title="Edit Appointment"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteAppointment(appt)}
                      className="h-7 w-7 rounded-md bg-[#f0f3f8] hover:bg-rose-50 text-[#676879] hover:text-[#e2445c] border border-[#d0d4e4] hover:border-rose-200 flex items-center justify-center shadow-2xs cursor-pointer transition-colors shrink-0"
                      title="Delete Appointment"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* ================= MONDAY.COM CARDS / KANBAN GRID VIEW ================= */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredAppointments.map((appt) => {
            const isToday = normalizeDateStr(appt.date) === todayStr;
            const isDone = appt.status === 'Completed';
            const isCancelled = appt.status === 'Cancelled';
            const matchedOrder = appt.orderId ? orders.find((o) => o.id === appt.orderId) : null;

            return (
              <div
                key={appt.id}
                className={`bg-white rounded-xl border border-[#d0d4e4] transition-all duration-200 overflow-hidden flex flex-col justify-between shadow-2xs hover:shadow-md border-l-4 ${
                  isDone
                    ? 'border-l-[#00c875]'
                    : isCancelled
                    ? 'border-l-[#e2445c]'
                    : isToday
                    ? 'border-l-[#0073ea] ring-1 ring-[#0073ea]/20'
                    : 'border-l-[#fdab3d]'
                }`}
              >
                {/* Card Header */}
                <div className="p-4 border-b border-[#e6e9ef] space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${getTypeColor(appt.type)}`}>
                        {appt.type}
                      </span>

                      {appt.trialRoomAssigned && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-[#f0f3f8] text-[#323338] border border-[#d0d4e4] inline-flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-[#676879]" />
                          <span>{appt.trialRoomAssigned}</span>
                        </span>
                      )}
                    </div>

                    {/* Status Badge */}
                    <select
                      value={appt.status}
                      onChange={(e) => handleStatusChange(appt, e.target.value as any)}
                      className={`text-[10px] font-bold px-2 py-1 rounded-md border-0 outline-hidden cursor-pointer shadow-2xs transition-all ${getStatusBadgeStyle(
                        appt.status
                      )}`}
                    >
                      <option value="Scheduled" className="bg-white text-[#323338]">Scheduled</option>
                      <option value="In Progress" className="bg-white text-[#323338]">In Progress</option>
                      <option value="Completed" className="bg-white text-[#323338]">Completed</option>
                      <option value="Rescheduled" className="bg-white text-[#323338]">Rescheduled</option>
                      <option value="Cancelled" className="bg-white text-[#323338]">Cancelled</option>
                    </select>
                  </div>

                  {/* Customer Info */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-[#323338] tracking-tight flex items-center gap-1.5">
                        <User className="w-4 h-4 text-[#0073ea]" />
                        <span>{appt.customerName}</span>
                      </h4>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-[#676879]">
                      {appt.customerPhone && (
                        <a
                          href={`tel:${appt.customerPhone}`}
                          className="hover:text-[#0073ea] transition-colors flex items-center gap-1 font-medium"
                        >
                          <Phone className="w-3 h-3 text-[#676879]" />
                          <span>{appt.customerPhone}</span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Body Details */}
                <div className="p-4 space-y-2.5 flex-1 text-xs">
                  {/* Date & Time Slot Row */}
                  <div className="flex items-center justify-between p-2 rounded-lg bg-[#f8f9fb] border border-[#e6e9ef]">
                    <div className="flex items-center gap-1.5 font-semibold text-[#323338]">
                      <Calendar className="w-3.5 h-3.5 text-[#0073ea]" />
                      <span>{formatDisplayDate(appt.date)}</span>
                      {isToday && (
                        <span className="px-1.5 py-0.2 rounded bg-[#0073ea] text-white text-[9px] font-bold uppercase">
                          Today
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 font-bold text-[#323338]">
                      <Clock className="w-3.5 h-3.5 text-[#fdab3d]" />
                      <span>{appt.time}</span>
                    </div>
                  </div>

                  {/* Garment / Order Link */}
                  {(appt.garmentName || appt.orderId) && (
                    <div className="flex items-center justify-between text-xs text-[#323338]">
                      <div className="flex items-center gap-1.5 font-medium truncate">
                        <Scissors className="w-3.5 h-3.5 text-[#676879] shrink-0" />
                        <span className="truncate">{appt.garmentName || 'Garment Consultation'}</span>
                      </div>

                      {appt.orderId && (
                        <button
                          type="button"
                          onClick={() => {
                            if (matchedOrder && onSelectOrder) onSelectOrder(matchedOrder);
                          }}
                          className="text-[11px] font-bold text-[#0073ea] hover:underline flex items-center gap-0.5 shrink-0 cursor-pointer"
                        >
                          <span>{appt.orderId}</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </div>
                  )}

                  {/* Pre-Visit Checklist Interactive Chips */}
                  <div className="pt-1">
                    <div className="text-[10px] font-bold text-[#676879] uppercase tracking-wider mb-1">
                      {t('appts.readinessChecklist', 'Pre-Visit Readiness')}
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        type="button"
                        onClick={() => onToggleAppointmentChecklist(appt.id, 'garmentReady', !appt.garmentReady)}
                        className={`py-1 px-1.5 rounded text-[10px] font-bold flex items-center justify-center gap-1 border transition-all cursor-pointer ${
                          appt.garmentReady
                            ? 'bg-[#e5f9f1] text-[#00854d] border-[#b3efd4]'
                            : 'bg-[#f8f9fb] text-[#676879] border-[#d0d4e4] hover:bg-[#e6e9ef]'
                        }`}
                      >
                        <Check className={`w-3 h-3 ${appt.garmentReady ? 'text-[#00854d]' : 'text-slate-400'}`} />
                        <span>Garment</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onToggleAppointmentChecklist(appt.id, 'accessoriesReady', !appt.accessoriesReady)}
                        className={`py-1 px-1.5 rounded text-[10px] font-bold flex items-center justify-center gap-1 border transition-all cursor-pointer ${
                          appt.accessoriesReady
                            ? 'bg-[#e5f9f1] text-[#00854d] border-[#b3efd4]'
                            : 'bg-[#f8f9fb] text-[#676879] border-[#d0d4e4] hover:bg-[#e6e9ef]'
                        }`}
                      >
                        <Check className={`w-3 h-3 ${appt.accessoriesReady ? 'text-[#00854d]' : 'text-slate-400'}`} />
                        <span>Trims</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onToggleAppointmentChecklist(appt.id, 'measurementsLoaded', !appt.measurementsLoaded)}
                        className={`py-1 px-1.5 rounded text-[10px] font-bold flex items-center justify-center gap-1 border transition-all cursor-pointer ${
                          appt.measurementsLoaded
                            ? 'bg-[#e5f9f1] text-[#00854d] border-[#b3efd4]'
                            : 'bg-[#f8f9fb] text-[#676879] border-[#d0d4e4] hover:bg-[#e6e9ef]'
                        }`}
                      >
                        <Check className={`w-3 h-3 ${appt.measurementsLoaded ? 'text-[#00854d]' : 'text-slate-400'}`} />
                        <span>Naap</span>
                      </button>
                    </div>
                  </div>

                  {/* Staff Notes */}
                  {appt.notes && (
                    <div className="p-2 rounded-lg bg-[#f8f9fb] border border-[#e6e9ef] text-[#323338] text-[11px] font-normal leading-relaxed">
                      <span className="font-bold text-[#676879]">Note: </span>
                      {appt.notes}
                    </div>
                  )}
                </div>

                {/* Card Footer Actions */}
                <div className="p-3 bg-[#f8f9fb] border-t border-[#e6e9ef] flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {appt.customerPhone && (
                      <button
                        type="button"
                        onClick={() => sendWhatsAppReminder(appt)}
                        className="px-2.5 py-1.5 rounded-lg bg-[#25D366] hover:bg-[#1faa4b] text-white text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer active:scale-95 shadow-2xs"
                        title={t('appts.sendWhatsapp', 'Send WhatsApp')}
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>WhatsApp</span>
                      </button>
                    )}

                    {appt.customerPhone && (
                      <a
                        href={`tel:${appt.customerPhone}`}
                        className="p-1.5 rounded-lg bg-white hover:bg-[#e6e9ef] text-[#323338] border border-[#d0d4e4] transition-colors"
                        title="Call Client"
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleEditAppointment(appt)}
                      className="p-1.5 rounded-lg bg-white hover:bg-[#e6e9ef] text-[#323338] border border-[#d0d4e4] transition-colors cursor-pointer"
                      title="Edit Appointment"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteAppointment(appt)}
                      className="p-1.5 rounded-lg bg-white hover:bg-rose-50 text-[#676879] hover:text-[#e2445c] border border-[#d0d4e4] hover:border-rose-200 transition-colors cursor-pointer"
                      title="Delete Appointment"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. Booking Modal */}
      <BoutiqueAppointmentModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingAppointment(null);
        }}
        onSaveAppointment={async (appt) => {
          await onSaveAppointment(appt);
          setIsModalOpen(false);
          setEditingAppointment(null);

          const apptDate = normalizeDateStr(appt.date);
          if (apptDate === todayStr) {
            setSelectedTab('today');
          } else if (apptDate === tomorrowStr) {
            setSelectedTab('tomorrow');
          } else if (apptDate >= todayStr && apptDate <= in7DaysStr) {
            setSelectedTab('this_week');
          } else {
            setSelectedTab('all');
          }

          setToastMessage(
            `Appointment successfully scheduled for ${appt.customerName} on ${formatDisplayDate(appt.date)} at ${appt.time} (${appt.type})!`
          );
          setTimeout(() => {
            setToastMessage(null);
          }, 8000);
        }}
        orders={orders}
        existingAppointment={editingAppointment}
      />
    </div>
  );
};
