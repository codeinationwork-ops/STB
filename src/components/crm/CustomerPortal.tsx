import React, { useState, useEffect, useMemo } from 'react';
import {
  Shirt,
  Scissors,
  CheckCircle2,
  Clock,
  Calendar,
  Phone,
  MessageSquare,
  Copy,
  Check,
  Download,
  Share2,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  Sparkles,
  QrCode,
  CreditCard,
  Layers,
  FileText,
  User,
  LogOut,
  ArrowLeft,
  AlertCircle,
  RefreshCw,
  Search,
  ShoppingBag,
  Maximize2,
  MapPin,
  Play,
  Pause,
  Film,
  Package,
} from 'lucide-react';
import {
  TailorOrder,
  TailorCustomer,
  ShopProfile,
  BoutiqueAppointment,
  MeasurementMap,
} from '../../types';
import { roomDb } from '../../lib/localRoomDb';
import { getClean10DigitPhone } from './AuthSuitePage';
import { getWhatsAppUrl, formatDisplayPhone } from '../../lib/phoneUtils';
import { buildOrderReceiptPdf, downloadReceiptPdf, sendWhatsAppWithPdfReceipt } from '../../lib/pdfReceiptGenerator';
import { BrandLogo } from './BrandLogo';
import { DiscoverReels } from './DiscoverReels';

interface CustomerPortalProps {
  customerPhone?: string;
  onExitToLogin: () => void;
  onNavigateHome?: () => void;
}

export const CustomerPortal: React.FC<CustomerPortalProps> = ({
  customerPhone: propPhone,
  onExitToLogin,
  onNavigateHome,
}) => {
  const [phone, setPhone] = useState<string>(() => {
    if (propPhone) return getClean10DigitPhone(propPhone);
    const session = roomDb.getAuthSession();
    return session ? getClean10DigitPhone(session.phoneNumber) : '';
  });

  const [activeTab, setActiveTab] = useState<'discover' | 'orders' | 'fitbook' | 'receipts' | 'appointments' | 'payment'>('discover');
  const [selectedOrderForSlip, setSelectedOrderForSlip] = useState<TailorOrder | null>(null);
  const [copiedFitBook, setCopiedFitBook] = useState(false);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [audioInstance, setAudioInstance] = useState<HTMLAudioElement | null>(null);
  const [orderFilter, setOrderFilter] = useState<'all' | 'in_progress' | 'ready' | 'delivered'>('all');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Live Database Sync
  const [allOrders, setAllOrders] = useState<TailorOrder[]>(() => roomDb.getOrders());
  const [allCustomers, setAllCustomers] = useState<TailorCustomer[]>(() => roomDb.getCustomers());
  const [allAppointments, setAllAppointments] = useState<BoutiqueAppointment[]>(() => roomDb.getAppointments());
  const [shopProfile, setShopProfile] = useState<ShopProfile>(() => roomDb.getShopProfile());
  const [inventory, setInventory] = useState(() => roomDb.getInventory());

  useEffect(() => {
    const unsub = roomDb.subscribe(() => {
      setAllOrders(roomDb.getOrders());
      setAllCustomers(roomDb.getCustomers());
      setAllAppointments(roomDb.getAppointments());
      setShopProfile(roomDb.getShopProfile());
      setInventory(roomDb.getInventory());
    });
    return unsub;
  }, []);

  const cleanCurrentPhone = useMemo(() => getClean10DigitPhone(phone), [phone]);

  // Find Customer Profile
  const customerProfile = useMemo(() => {
    if (!cleanCurrentPhone) return null;
    return allCustomers.find((c) => {
      const p = getClean10DigitPhone(c.phone || c.phoneNumber || '');
      return p === cleanCurrentPhone;
    }) || null;
  }, [allCustomers, cleanCurrentPhone]);

  // Filter Orders for this Customer
  const customerOrders = useMemo(() => {
    if (!cleanCurrentPhone) return [];
    return allOrders.filter((o) => {
      const p = getClean10DigitPhone(o.customerPhone || '');
      if (p && p === cleanCurrentPhone) return true;
      if (customerProfile && o.customerId && o.customerId === customerProfile.id) return true;
      return false;
    }).sort((a, b) => {
      const dateA = new Date(a.createdAt || a.createdDate || '').getTime() || 0;
      const dateB = new Date(b.createdAt || b.createdDate || '').getTime() || 0;
      return dateB - dateA;
    });
  }, [allOrders, cleanCurrentPhone, customerProfile]);

  // Filter Appointments for this Customer
  const customerAppointments = useMemo(() => {
    if (!cleanCurrentPhone) return [];
    return allAppointments.filter((a) => {
      const p = getClean10DigitPhone(a.phone || a.customerPhone || '');
      return p === cleanCurrentPhone;
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [allAppointments, cleanCurrentPhone]);

  // Metrics
  const inProgressOrders = customerOrders.filter((o) => o.status !== 'Completed' && o.status !== 'Delivered');
  const readyOrders = customerOrders.filter((o) => o.status === 'Completed');
  const deliveredOrders = customerOrders.filter((o) => o.status === 'Delivered');
  const totalBalanceDue = customerOrders.reduce((sum, o) => sum + (o.balanceDue || 0), 0);
  const totalSpent = customerOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

  // Customer Name fallback
  const customerDisplayName = customerProfile?.name || customerOrders[0]?.customerName || 'Valued Customer';

  // Measurements from customer profile or most recent stitched order
  const effectiveMeasurements: MeasurementMap = useMemo(() => {
    if (customerProfile?.measurements && Object.keys(customerProfile.measurements).length > 0) {
      return customerProfile.measurements;
    }
    const stitchOrder = customerOrders.find((o) => o.measurements && Object.keys(o.measurements).length > 0);
    return stitchOrder?.measurements || {};
  }, [customerProfile, customerOrders]);

  // Audio voice note playback handler
  const handleToggleVoice = (orderId: string, url?: string | null) => {
    if (!url) return;
    if (playingVoiceId === orderId) {
      if (audioInstance) {
        audioInstance.pause();
        audioInstance.currentTime = 0;
      }
      setPlayingVoiceId(null);
      setAudioInstance(null);
    } else {
      if (audioInstance) {
        audioInstance.pause();
      }
      const newAudio = new Audio(url);
      newAudio.onended = () => {
        setPlayingVoiceId(null);
        setAudioInstance(null);
      };
      newAudio.onerror = () => {
        setPlayingVoiceId(null);
        setAudioInstance(null);
      };
      newAudio.play().catch(() => {});
      setAudioInstance(newAudio);
      setPlayingVoiceId(orderId);
    }
  };

  // Copy FitBook formatted text to clipboard
  const handleCopyFitBook = () => {
    const lines: string[] = [
      `📏 FitBook Measurements for ${customerDisplayName}`,
      `📱 Phone: +91 ${cleanCurrentPhone}`,
      `🏬 Boutique: ${shopProfile.shopName}`,
      '------------------------------',
    ];

    Object.entries(effectiveMeasurements).forEach(([key, val]) => {
      if (val && typeof val === 'string' && val.trim()) {
        const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase());
        lines.push(`${formattedKey}: ${val}`);
      }
    });

    if (customerProfile?.notes) {
      lines.push(`📝 Notes: ${customerProfile.notes}`);
    }

    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      setCopiedFitBook(true);
      setTimeout(() => setCopiedFitBook(false), 2500);
    });
  };

  // Download PDF slip
  const handleDownloadSlip = async (order: TailorOrder) => {
    setIsGeneratingPdf(true);
    try {
      const doc = buildOrderReceiptPdf(order, shopProfile);
      const filename = `Receipt_${order.id}_${order.customerName.replace(/\s+/g, '_')}.pdf`;
      doc.save(filename);
    } catch (err) {
      console.error('PDF generation error:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // WhatsApp Enquiry for Order
  const handleWhatsAppBoutique = (order?: TailorOrder) => {
    const boutiquePhone = shopProfile.phoneNumber ? shopProfile.phoneNumber.replace(/\D/g, '') : '';
    const cleanBoutique = boutiquePhone.startsWith('91') ? boutiquePhone : `91${boutiquePhone}`;
    let msg = `Hello ${shopProfile.shopName}, I am ${customerDisplayName} (+91 ${cleanCurrentPhone}).`;
    if (order) {
      msg += ` Inquiring regarding my order ${order.garmentType} (#${order.id}).`;
    }
    const url = getWhatsAppUrl(cleanBoutique, msg);
    window.open(url, '_blank');
  };

  // Filtered orders list
  const displayedOrders = useMemo(() => {
    switch (orderFilter) {
      case 'in_progress':
        return inProgressOrders;
      case 'ready':
        return readyOrders;
      case 'delivered':
        return deliveredOrders;
      case 'all':
      default:
        return customerOrders;
    }
  }, [orderFilter, customerOrders, inProgressOrders, readyOrders, deliveredOrders]);

  // Stage pipeline helper
  const getStageStep = (status: string) => {
    switch (status) {
      case 'New / Cutting':
        return { step: 1, label: 'Fabric Cut & Patterned', desc: 'Garment cut & prepared for master tailor' };
      case 'Assigned':
        return { step: 2, label: 'Tailor Assigned', desc: 'Assigned to specialist master karigar' };
      case 'Stitching in Progress':
        return { step: 3, label: 'Stitching in Progress', desc: 'Tailor actively stitching & assembling pieces' };
      case 'Trial':
      case 'In Alteration / Fitting':
        return { step: 4, label: 'Trial & Fitting Ready', desc: 'Ready for fitting check & custom adjustments' };
      case 'Completed':
        return { step: 5, label: 'Ready for Pickup', desc: 'Finely pressed, packaged & ready for collection' };
      case 'Delivered':
        return { step: 6, label: 'Delivered & Fulfilled', desc: 'Handed over & payment settled' };
      default:
        return { step: 1, label: status, desc: 'Under production at boutique' };
    }
  };

  return (
    <div className="min-h-screen bg-[#072d23] text-slate-900 font-sans flex flex-col justify-between selection:bg-amber-400 selection:text-slate-950 pb-16 sm:pb-0">
      {/* 1. TOP HEADER & BOUTIQUE BRANDING (Desktop only - removed on mobile to keep pure Reels experience) */}
      <header className="hidden sm:block sticky top-0 z-40 bg-[#0B4636] text-white border-b border-amber-300/30 px-4 sm:px-6 py-3.5 shadow-md">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          {/* Brand & Boutique Link */}
          <div className="flex items-center gap-3">
            <BrandLogo size="sm" variant="glass" />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-sm sm:text-base font-black text-white tracking-tight">
                  {shopProfile.shopName || 'Boutique Customer Portal'}
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[10px] uppercase tracking-wider">
                  Customer Portal
                </span>
              </div>
              <p className="text-[11px] text-amber-200/90 font-medium">
                {shopProfile.ownerName ? `Proprietor: ${shopProfile.ownerName}` : 'Custom Tailoring & Designer Studio'}
              </p>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-2">
            {shopProfile.phoneNumber && (
              <button
                type="button"
                onClick={() => handleWhatsAppBoutique()}
                className="px-3 py-1.5 rounded-xl bg-[#25D366] hover:bg-[#1faa4b] text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                title="Message Boutique on WhatsApp"
              >
                <MessageSquare className="w-3.5 h-3.5 fill-white" />
                <span>WhatsApp Boutique</span>
              </button>
            )}

            <button
              type="button"
              onClick={onExitToLogin}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-1.5 transition-all border border-white/20 cursor-pointer"
              title="Sign Out / Switch"
            >
              <LogOut className="w-3.5 h-3.5 text-amber-300" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. MAIN PORTAL NAVIGATION & CONTENT CONTAINER */}
      <main className={`w-full mx-auto flex-1 ${activeTab === 'discover' ? 'p-0 sm:p-6 max-w-5xl' : 'p-3 sm:p-6 max-w-6xl space-y-4'}`}>
        {/* Desktop Navigation Tabs Pill Bar */}
        <div className="hidden sm:flex bg-white rounded-2xl p-1.5 shadow-md border border-slate-200 items-center gap-1 overflow-x-auto scrollbar-none mb-6">
          {[
            { id: 'discover', label: '🎬 Discover & Reels', count: 'Live' },
            { id: 'orders', label: '📦 My Orders & Tracking', count: customerOrders.length },
            { id: 'fitbook', label: '📐 My FitBook Measurements', count: Object.keys(effectiveMeasurements).length },
            { id: 'receipts', label: '🧾 Invoices & Slips', count: customerOrders.length },
            { id: 'appointments', label: '🗓️ Trial Appointments', count: customerAppointments.length },
            { id: 'payment', label: '💳 UPI Settlement & QR', count: totalBalanceDue > 0 ? `₹${totalBalanceDue}` : 'Paid' },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 min-w-[140px] sm:min-w-0 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap ${
                  isActive
                    ? 'bg-[#0B4636] text-amber-300 shadow-sm border border-[#0B4636]'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Mobile Header when NOT on Discover tab (Provides a clean back button to Reels) */}
        {activeTab !== 'discover' && (
          <div className="sm:hidden bg-[#0B4636] text-white p-3.5 rounded-2xl shadow-md flex items-center justify-between gap-2 border border-amber-300/30">
            <button
              type="button"
              onClick={() => setActiveTab('discover')}
              className="flex items-center gap-1.5 text-xs font-black text-amber-300 px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Watch Reels</span>
            </button>
            <div className="text-right">
              <div className="text-xs font-black text-white">{customerDisplayName}</div>
              <div className="text-[10px] text-amber-200/80 font-mono">{formatDisplayPhone(cleanCurrentPhone)}</div>
            </div>
          </div>
        )}

        {/* 4. TAB CONTENT PANELS */}

        {/* ================= TAB 0: DISCOVER REELS (DEFAULT PURE REELS VIEW) ================= */}
        {activeTab === 'discover' && (
          <DiscoverReels
            shopProfile={shopProfile}
            inventory={inventory}
            customerPhone={cleanCurrentPhone}
            customerName={customerDisplayName}
            onNavigateToTab={(tab) => setActiveTab(tab as any)}
          />
        )}

        {/* ================= TAB 1: MY ORDERS & LIVE PRODUCTION TRACKER ================= */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            {/* Orders Header & Filter Chips */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div>
                <h3 className="text-sm sm:text-base font-black text-slate-900">
                  Active Orders & Live Progress Tracking
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Real-time visibility into cutting, stitching, trials, and delivery schedules
                </p>
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                {[
                  { id: 'all', label: `All (${customerOrders.length})` },
                  { id: 'in_progress', label: `⏳ In Production (${inProgressOrders.length})` },
                  { id: 'ready', label: `✨ Ready (${readyOrders.length})` },
                  { id: 'delivered', label: `✅ Delivered (${deliveredOrders.length})` },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setOrderFilter(f.id as any)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      orderFilter === f.id
                        ? 'bg-[#0B4636] text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Orders Listing */}
            {displayedOrders.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center space-y-3">
                <Shirt className="w-10 h-10 text-slate-300 mx-auto" />
                <div className="font-bold text-slate-800 text-sm">No orders found under this filter</div>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  When you place custom stitching, alteration, or purchase orders with the boutique, your live progress will show up here.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {displayedOrders.map((ord) => {
                  const stage = getStageStep(ord.status);
                  const isReady = ord.status === 'Completed';
                  const isDelivered = ord.status === 'Delivered';
                  const isAlter = ord.orderCategory === 'Alteration' || ord.orderType?.includes('alter');
                  const isSale = ord.orderCategory === 'Sale' || ord.orderType?.includes('sale');

                  return (
                    <div
                      key={ord.id}
                      className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition-shadow"
                    >
                      {/* Top Order Card Header */}
                      <div className="p-4 sm:px-6 sm:py-4 bg-slate-50/80 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-[#0B4636] text-amber-300 flex items-center justify-center font-black text-sm shrink-0 shadow-xs">
                            {isSale ? '🛍️' : isAlter ? '✂️' : '🧵'}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-sm text-slate-900">
                                {ord.garmentType || 'Custom Garment'}
                              </span>
                              <span className="font-mono text-xs font-bold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                                #{ord.id}
                              </span>
                              <span
                                className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                                  isReady
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                    : isDelivered
                                    ? 'bg-blue-100 text-blue-800 border border-blue-300'
                                    : 'bg-amber-100 text-amber-900 border border-amber-300'
                                }`}
                              >
                                {ord.status}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 font-medium flex items-center gap-2 mt-0.5">
                              <span>Created: {ord.createdDate || ord.createdAt?.split('T')[0] || 'Recently'}</span>
                              {ord.assignedTailor && <span>· 👤 Assigned to: <strong>{ord.assignedTailor}</strong></span>}
                            </div>
                          </div>
                        </div>

                        {/* Financial summary & Promised Delivery */}
                        <div className="flex items-center justify-between sm:justify-end gap-4">
                          <div className="text-left sm:text-right">
                            <div className="text-xs font-bold text-slate-500">Promised Delivery</div>
                            <div className="text-xs font-black text-slate-900 flex items-center gap-1 sm:justify-end">
                              <Clock className="w-3 h-3 text-amber-600" />
                              <span>{ord.dueDate ? `${ord.dueDate} at ${ord.dueTime || '18:00'}` : 'To be scheduled'}</span>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="text-xs font-mono font-bold text-slate-900">
                              ₹{ord.totalAmount.toLocaleString('en-IN')}
                            </div>
                            {ord.balanceDue > 0 ? (
                              <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">
                                Due: ₹{ord.balanceDue}
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                                ✓ Fully Paid
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Visual Production Timeline Bar */}
                      <div className="p-4 sm:p-6 space-y-4">
                        <div>
                          <div className="text-xs font-bold text-slate-700 mb-3 flex items-center justify-between">
                            <span>Production Progress Stage:</span>
                            <span className="text-[#0B4636] font-extrabold">{stage.label}</span>
                          </div>

                          {/* 5-Step Pipeline Indicators */}
                          <div className="grid grid-cols-5 gap-2 relative">
                            {[
                              { num: 1, label: 'Cutting' },
                              { num: 2, label: 'Assigned' },
                              { num: 3, label: 'Stitching' },
                              { num: 4, label: 'Trial Ready' },
                              { num: 5, label: isDelivered ? 'Delivered' : 'Ready' },
                            ].map((s) => {
                              const isPassed = stage.step >= s.num;
                              const isCurrent = stage.step === s.num;
                              return (
                                <div key={s.num} className="text-center space-y-1.5">
                                  <div
                                    className={`h-2 rounded-full transition-all ${
                                      isPassed
                                        ? 'bg-[#0B4636]'
                                        : 'bg-slate-200'
                                    }`}
                                  />
                                  <div
                                    className={`text-[10px] font-bold ${
                                      isCurrent
                                        ? 'text-[#0B4636] font-black'
                                        : isPassed
                                        ? 'text-slate-800'
                                        : 'text-slate-400'
                                    }`}
                                  >
                                    {s.label}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Special Instructions & Fabric / Garment Details */}
                        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 text-xs text-slate-700 space-y-2">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <span className="font-semibold text-slate-600">
                              Style & Notes: {ord.specialNotes || ord.subTypeStyle || 'Standard custom fitting as per measurements.'}
                            </span>

                            {ord.voiceNoteUrl && (
                              <button
                                type="button"
                                onClick={() => handleToggleVoice(ord.id, ord.voiceNoteUrl)}
                                className="px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 border border-purple-200 text-[11px] font-bold flex items-center gap-1.5 hover:bg-purple-100 cursor-pointer"
                              >
                                {playingVoiceId === ord.id ? (
                                  <Pause className="w-3 h-3 text-purple-700" />
                                ) : (
                                  <Play className="w-3 h-3 text-purple-700" />
                                )}
                                <span>Voice Instruction</span>
                              </button>
                            )}
                          </div>

                          {/* Fabric Photos preview if attached */}
                          {ord.fabricPhotos && ord.fabricPhotos.length > 0 && (
                            <div className="flex items-center gap-2 pt-2 overflow-x-auto">
                              <span className="text-[11px] font-bold text-slate-500">Fabric Ref:</span>
                              {ord.fabricPhotos.map((photo, idx) => (
                                <img
                                  key={idx}
                                  src={photo}
                                  alt="Fabric"
                                  className="w-10 h-10 object-cover rounded-lg border border-slate-300"
                                />
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center justify-between gap-3 pt-2 flex-wrap">
                          <button
                            type="button"
                            onClick={() => handleDownloadSlip(ord)}
                            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200"
                          >
                            <Download className="w-3.5 h-3.5 text-slate-600" />
                            <span>Download Invoice Slip (PDF)</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleWhatsAppBoutique(ord)}
                            className="px-3.5 py-2 rounded-xl bg-[#0B4636] hover:bg-[#073327] text-amber-300 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>Chat with Boutique regarding #{ord.id}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 2: MY FITBOOK MEASUREMENTS ================= */}
        {activeTab === 'fitbook' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-xs space-y-6">
            {/* Header & Copy Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Scissors className="w-5 h-5 text-[#0B4636]" />
                  <span>My Personal FitBook Measurements Vault</span>
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Official body measurements recorded by {shopProfile.shopName} for custom tailoring
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyFitBook}
                  className="px-4 py-2 rounded-xl bg-[#0B4636] hover:bg-[#073024] text-amber-300 font-bold text-xs flex items-center gap-2 transition-all shadow-xs cursor-pointer active:scale-95"
                >
                  {copiedFitBook ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Copied to Clipboard!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Measurements</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Measurement Grid */}
            {Object.keys(effectiveMeasurements).length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300 space-y-2">
                <Scissors className="w-8 h-8 text-slate-300 mx-auto" />
                <div className="font-bold text-slate-700 text-sm">No measurements recorded yet</div>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Visit the boutique for physical measurement taking, or share your measurements directly over WhatsApp.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Upper Body / Topwear */}
                <div>
                  <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#0B4636]" />
                    <span>Upper Body & Topwear (Kurti / Blouse / Shirt / Suit)</span>
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {[
                      { key: 'totalLength', label: 'Total Length' },
                      { key: 'shoulder', label: 'Shoulder' },
                      { key: 'upperChest', label: 'Upper Chest' },
                      { key: 'chest', label: 'Chest / Full Bust' },
                      { key: 'waist', label: 'Waist' },
                      { key: 'hip', label: 'Hip' },
                      { key: 'armhole', label: 'Armhole' },
                      { key: 'sleeveLength', label: 'Sleeve Length' },
                      { key: 'bicep', label: 'Bicep / Round' },
                      { key: 'frontNeckDepth', label: 'Front Neck' },
                      { key: 'backNeckDepth', label: 'Back Neck' },
                    ].map((item) => {
                      const val = effectiveMeasurements[item.key] || effectiveMeasurements[item.key.toLowerCase()];
                      if (!val) return null;
                      return (
                        <div key={item.key} className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{item.label}</div>
                          <div className="text-sm font-black text-slate-900 font-mono mt-0.5">{val}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Lower Body / Bottomwear */}
                <div>
                  <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    <span>Lower Body & Bottomwear (Pant / Salwar / Trouser / Lehenga)</span>
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {[
                      { key: 'outseamLength', label: 'Pant Length' },
                      { key: 'inseam', label: 'Inseam' },
                      { key: 'thigh', label: 'Thigh Round' },
                      { key: 'knee', label: 'Knee' },
                      { key: 'bottomHem', label: 'Bottom Hem' },
                      { key: 'crotchFork', label: 'Crotch / Fork' },
                    ].map((item) => {
                      const val = effectiveMeasurements[item.key] || effectiveMeasurements[item.key.toLowerCase()];
                      if (!val) return null;
                      return (
                        <div key={item.key} className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{item.label}</div>
                          <div className="text-sm font-black text-slate-900 font-mono mt-0.5">{val}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Additional / Custom Measurements */}
                {customerProfile?.notes && (
                  <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 text-xs text-amber-950 space-y-1">
                    <div className="font-bold flex items-center gap-1 text-amber-900">
                      <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                      <span>Special Fit & Style Preferences</span>
                    </div>
                    <p className="font-medium text-amber-900/90 leading-relaxed">
                      {customerProfile.notes}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 3: INVOICES & SLIPS VAULT ================= */}
        {activeTab === 'receipts' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-xs space-y-4">
            <div>
              <h3 className="text-base font-black text-slate-900">
                Official Digital Invoices & Order Slips
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Download verified tax slips, receipts, and view payment settlements
              </p>
            </div>

            <div className="divide-y divide-slate-100">
              {customerOrders.map((ord) => (
                <div key={ord.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center font-bold text-xs border border-slate-200 shrink-0">
                      <FileText className="w-5 h-5 text-[#0B4636]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-xs sm:text-sm text-slate-900">
                          {ord.garmentType} Receipt
                        </span>
                        <span className="font-mono text-xs font-bold text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                          #{ord.id}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Date: {ord.createdDate || 'Recent'} · Status: {ord.status}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4">
                    <div className="text-right">
                      <div className="text-xs font-mono font-bold text-slate-900">₹{ord.totalAmount}</div>
                      <span className="text-[10px] font-bold text-slate-500">Advance: ₹{ord.advancePaid || 0}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDownloadSlip(ord)}
                      className="px-3 py-1.5 rounded-xl bg-[#0B4636] hover:bg-[#073024] text-amber-300 font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                    >
                      <Download className="w-3 h-3" />
                      <span>Download PDF</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= TAB 4: TRIAL APPOINTMENTS ================= */}
        {activeTab === 'appointments' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Scheduled Trial & Fitting Visits
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Trial dates set by the boutique to ensure perfect garment fit before final delivery
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleWhatsAppBoutique()}
                className="px-3.5 py-2 rounded-xl bg-[#0B4636] hover:bg-[#073024] text-amber-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Request Reschedule via WhatsApp</span>
              </button>
            </div>

            {customerAppointments.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300 space-y-2">
                <Calendar className="w-8 h-8 text-slate-300 mx-auto" />
                <div className="font-bold text-slate-700 text-sm">No upcoming appointments found</div>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  When your boutique schedules a trial session, it will automatically appear here with reminders.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {customerAppointments.map((appt) => (
                  <div
                    key={appt.id}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">{appt.purpose || 'Trial & Fitting'}</span>
                        <span className="px-2 py-0.2 rounded-full bg-amber-100 text-amber-900 font-extrabold text-[10px]">
                          {appt.status || 'Confirmed'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-600 flex items-center gap-3">
                        <span className="font-bold text-slate-800">📅 {appt.date}</span>
                        <span>⏰ {appt.timeSlot || 'During boutique hours'}</span>
                      </div>
                      {appt.notes && <p className="text-[11px] text-slate-500">{appt.notes}</p>}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleWhatsAppBoutique()}
                      className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold self-start sm:self-auto cursor-pointer"
                    >
                      Confirm / Message
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 5: UPI SETTLEMENT & QR ================= */}
        {activeTab === 'payment' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-xs space-y-6">
            <div>
              <h3 className="text-base font-black text-slate-900">
                Online Payment & Balance Settlement
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Pay directly to {shopProfile.shopName} via UPI (Google Pay, PhonePe, Paytm, BHIM)
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Financial Balance summary */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">
                  Account Settlement Summary
                </h4>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Total Orders Value:</span>
                    <span className="font-mono font-bold text-slate-900">₹{totalSpent.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Total Advance Paid:</span>
                    <span className="font-mono font-bold text-emerald-700">₹{(totalSpent - totalBalanceDue).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-sm">
                    <span className="font-bold text-slate-900">Current Balance Due:</span>
                    <span className={`font-mono font-black ${totalBalanceDue > 0 ? 'text-rose-600 text-base' : 'text-emerald-600'}`}>
                      ₹{totalBalanceDue.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {shopProfile.upiId && (
                  <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Boutique UPI ID</div>
                    <div className="text-xs font-mono font-black text-[#0B4636] select-all">
                      {shopProfile.upiId}
                    </div>
                  </div>
                )}
              </div>

              {/* QR Code & Pay Action */}
              <div className="bg-gradient-to-br from-[#0B4636] to-[#062920] text-white p-5 rounded-2xl border border-amber-300/30 flex flex-col items-center justify-center text-center space-y-4">
                <QrCode className="w-12 h-12 text-amber-300" />
                <div>
                  <h4 className="text-sm font-black text-white">Instant UPI Scan & Pay</h4>
                  <p className="text-xs text-amber-200/90 font-medium">
                    Scan with any UPI app to settle your tailoring dues
                  </p>
                </div>

                {shopProfile.upiId ? (
                  <a
                    href={`upi://pay?pa=${encodeURIComponent(shopProfile.upiId)}&pn=${encodeURIComponent(shopProfile.shopName)}&am=${totalBalanceDue > 0 ? totalBalanceDue : ''}&cu=INR`}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs shadow-md transition-all active:scale-95 cursor-pointer"
                  >
                    Open UPI Payment App
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleWhatsAppBoutique()}
                    className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 cursor-pointer"
                  >
                    Request Payment QR on WhatsApp
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 5. MOBILE FLOATING BOTTOM DOCK NAVIGATION */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-slate-950/95 backdrop-blur-xl border-t border-white/10 px-3 py-2 flex items-center justify-around sm:hidden shadow-2xl">
        <button
          type="button"
          onClick={() => setActiveTab('discover')}
          className={`flex flex-col items-center gap-0.5 text-[10px] font-black transition-all active:scale-95 cursor-pointer ${
            activeTab === 'discover' ? 'text-amber-400' : 'text-slate-400 hover:text-white'
          }`}
        >
          <div className={`p-1 rounded-full ${activeTab === 'discover' ? 'bg-amber-400/20' : ''}`}>
            <Film className="w-5 h-5" />
          </div>
          <span>Reels</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('orders')}
          className={`flex flex-col items-center gap-0.5 text-[10px] font-black transition-all active:scale-95 cursor-pointer relative ${
            activeTab === 'orders' ? 'text-amber-400' : 'text-slate-400 hover:text-white'
          }`}
        >
          <div className={`p-1 rounded-full ${activeTab === 'orders' ? 'bg-amber-400/20' : ''}`}>
            <Package className="w-5 h-5" />
          </div>
          <span>Orders</span>
          {customerOrders.length > 0 && (
            <span className="absolute -top-1 right-2 w-4 h-4 rounded-full bg-amber-400 text-slate-950 text-[9px] font-black flex items-center justify-center">
              {customerOrders.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('fitbook')}
          className={`flex flex-col items-center gap-0.5 text-[10px] font-black transition-all active:scale-95 cursor-pointer ${
            activeTab === 'fitbook' ? 'text-amber-400' : 'text-slate-400 hover:text-white'
          }`}
        >
          <div className={`p-1 rounded-full ${activeTab === 'fitbook' ? 'bg-amber-400/20' : ''}`}>
            <Scissors className="w-5 h-5" />
          </div>
          <span>FitBook</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('receipts')}
          className={`flex flex-col items-center gap-0.5 text-[10px] font-black transition-all active:scale-95 cursor-pointer ${
            activeTab === 'receipts' ? 'text-amber-400' : 'text-slate-400 hover:text-white'
          }`}
        >
          <div className={`p-1 rounded-full ${activeTab === 'receipts' ? 'bg-amber-400/20' : ''}`}>
            <FileText className="w-5 h-5" />
          </div>
          <span>Invoices</span>
        </button>

        <button
          type="button"
          onClick={onExitToLogin}
          className="flex flex-col items-center gap-0.5 text-[10px] font-black text-slate-400 hover:text-rose-400 transition-all active:scale-95 cursor-pointer"
        >
          <div className="p-1 rounded-full">
            <LogOut className="w-5 h-5 text-rose-400/80" />
          </div>
          <span>Exit</span>
        </button>
      </div>

      {/* 6. FOOTER (Desktop only) */}
      <footer className="hidden sm:block bg-slate-900 text-slate-400 text-xs py-6 px-4 border-t border-slate-800 mt-12">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <BrandLogo size="xs" variant="glass" />
            <span className="font-bold text-slate-200">ShopScopers CRM</span>
            <span>· Secure Customer Portal</span>
          </div>

          <div className="text-slate-500 text-[11px]">
            Connected to <strong>{shopProfile.shopName}</strong> · Room SQLite Encrypted
          </div>
        </div>
      </footer>
    </div>
  );
};
