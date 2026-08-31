import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Phone,
  MessageSquare,
  MapPin,
  Store,
  Sparkles,
  AlertTriangle,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  Eye,
  Check,
  X,
  UserCheck,
  Building2,
  Mail,
  Calendar,
  Trash2,
  Loader2,
  Crown,
  CreditCard,
} from 'lucide-react';
import { PlatformShop } from '../../../types';
import { AdminPlatformService } from '../../../lib/adminPlatformData';
import { clean10DigitPhone, getWhatsAppUrl } from '../../../lib/phoneUtils';

interface AdminVerificationViewProps {
  shops: PlatformShop[];
  onUpdateShops: (shops: PlatformShop[]) => void;
  onNavigateToVerifiedShops?: () => void;
}

export const AdminVerificationView: React.FC<AdminVerificationViewProps> = ({
  shops,
  onUpdateShops,
  onNavigateToVerifiedShops,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'pending' | 'payments' | 'rejected' | 'all'>('pending');
  const [selectedShop, setSelectedShop] = useState<PlatformShop | null>(null);
  const [rejectModalShop, setRejectModalShop] = useState<PlatformShop | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [deleteModalShop, setDeleteModalShop] = useState<PlatformShop | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  // Subscription Approval Modal State
  const [paymentApprovalShop, setPaymentApprovalShop] = useState<PlatformShop | null>(null);
  const [unlockDays, setUnlockDays] = useState<number>(365);

  // Filter pending vs payments vs others
  const pendingShops = useMemo(() => {
    return shops.filter((s) => s.status === 'Pending Verification' || s.isVerified === false);
  }, [shops]);

  const pendingPayments = useMemo(() => {
    return shops.filter((s) => s.subscriptionStatus === 'pending_confirmation');
  }, [shops]);

  const rejectedShops = useMemo(() => {
    return shops.filter((s) => s.status === 'Rejected' || s.verificationStatus === 'rejected');
  }, [shops]);

  const verifiedCount = useMemo(() => {
    return shops.filter((s) => s.status === 'Active' || s.isVerified === true).length;
  }, [shops]);

  const displayedShops = useMemo(() => {
    const list =
      filterTab === 'pending'
        ? pendingShops
        : filterTab === 'payments'
        ? pendingPayments
        : filterTab === 'rejected'
        ? rejectedShops
        : shops;

    return list.filter((shop) => {
      const q = (searchQuery || '').toLowerCase();
      if (!q) return true;
      return (
        (shop.shopName || '').toLowerCase().includes(q) ||
        (shop.ownerName || '').toLowerCase().includes(q) ||
        (shop.phoneNumber || '').includes(searchQuery) ||
        (shop.city || '').toLowerCase().includes(q) ||
        (shop.specialty || '').toLowerCase().includes(q) ||
        (shop.paymentId || '').toLowerCase().includes(q)
      );
    });
  }, [filterTab, pendingShops, pendingPayments, rejectedShops, shops, searchQuery]);

  const triggerToast = (msg: string) => {
    setActionSuccessMessage(msg);
    setTimeout(() => setActionSuccessMessage(null), 4000);
  };

  const handleVerify = (shop: PlatformShop) => {
    const updated = AdminPlatformService.verifyBoutique(shop.id);
    onUpdateShops(updated);
    if (selectedShop?.id === shop.id) {
      setSelectedShop(null);
    }
    triggerToast(`🎉 "${shop.shopName}" has been successfully verified! Portal access unlocked.`);
  };

  const handleOpenPaymentApproval = (shop: PlatformShop) => {
    setPaymentApprovalShop(shop);
    // Default unlock days based on requested plan
    if (shop.subscriptionPlan === 'monthly' || shop.planTier === 'Pro Multi-Device') {
      setUnlockDays(30);
    } else {
      setUnlockDays(365);
    }
  };

  const handleConfirmPaymentApproval = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentApprovalShop) return;
    const updated = AdminPlatformService.approveBoutiqueSubscription(paymentApprovalShop.id, unlockDays);
    onUpdateShops(updated);
    triggerToast(`💰 Subscription confirmed for "${paymentApprovalShop.shopName}"! Portal unlocked for ${unlockDays} days.`);
    setPaymentApprovalShop(null);
  };

  const handleRejectPayment = (shop: PlatformShop) => {
    const updated = AdminPlatformService.rejectBoutiqueSubscription(shop.id);
    onUpdateShops(updated);
    triggerToast(`⚠️ Subscription payment for "${shop.shopName}" was rejected.`);
  };

  const handleReject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectModalShop) return;
    const updated = AdminPlatformService.rejectBoutique(rejectModalShop.id, rejectionReason);
    onUpdateShops(updated);
    if (selectedShop?.id === rejectModalShop.id) {
      setSelectedShop(null);
    }
    setRejectModalShop(null);
    setRejectionReason('');
    triggerToast(`⚠️ "${rejectModalShop.shopName}" verification was rejected.`);
  };

  const handleConfirmDelete = async () => {
    if (!deleteModalShop) return;
    setIsDeleting(true);
    try {
      const deletedShopName = deleteModalShop.shopName;
      const updated = await AdminPlatformService.deleteBoutique(deleteModalShop.id);
      onUpdateShops(updated);
      if (selectedShop?.id === deleteModalShop.id) {
        setSelectedShop(null);
      }
      setDeleteModalShop(null);
      triggerToast(`🗑️ "${deletedShopName}" and all associated backend data were permanently deleted.`);
    } catch (err) {
      console.error('Failed to delete boutique:', err);
      triggerToast('❌ Error deleting boutique. Please check network connection.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Toast alert */}
      {actionSuccessMessage && (
        <div className="bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-lg flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2 text-sm font-bold">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{actionSuccessMessage}</span>
          </div>
          <button
            onClick={() => setActionSuccessMessage(null)}
            className="p-1 hover:bg-white/20 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Banner & Quick Metrics */}
      <div className="bg-gradient-to-r from-emerald-900 via-slate-900 to-emerald-950 text-white p-6 rounded-2xl border border-emerald-800/60 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider">
                Access Control & Subscription Verification
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Boutique Verification Queue
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl">
              Review and approve newly registered boutiques and confirm subscription payments. Once confirmed, boutique features unlock for the exact validity duration and the free trial badge disappears.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-white/10 backdrop-blur-xs border border-white/10 px-4 py-2.5 rounded-xl text-center min-w-[110px]">
              <span className="text-[11px] text-amber-300 font-bold block uppercase tracking-wider">Pending Signups</span>
              <span className="text-2xl font-black text-amber-400">{pendingShops.length}</span>
            </div>
            <div className="bg-white/10 backdrop-blur-xs border border-amber-400/30 px-4 py-2.5 rounded-xl text-center min-w-[110px]">
              <span className="text-[11px] text-amber-300 font-bold block uppercase tracking-wider">💰 Pending Payments</span>
              <span className="text-2xl font-black text-amber-300">{pendingPayments.length}</span>
            </div>
            <div className="bg-white/10 backdrop-blur-xs border border-white/10 px-4 py-2.5 rounded-xl text-center min-w-[110px]">
              <span className="text-[11px] text-emerald-300 font-bold block uppercase tracking-wider">Verified Active</span>
              <span className="text-2xl font-black text-emerald-400">{verifiedCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Tab Switcher */}
        <div className="flex items-center p-1 bg-slate-100 rounded-lg w-full sm:w-auto overflow-x-auto">
          <button
            onClick={() => setFilterTab('pending')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
              filterTab === 'pending'
                ? 'bg-amber-500 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Pending Signups</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
              {pendingShops.length}
            </span>
          </button>
          <button
            onClick={() => setFilterTab('payments')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
              filterTab === 'payments'
                ? 'bg-emerald-700 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Crown className="w-3.5 h-3.5" />
            <span>Subscription Payments</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${pendingPayments.length > 0 ? 'bg-amber-400 text-slate-950 font-black animate-pulse' : 'bg-white/20'}`}>
              {pendingPayments.length}
            </span>
          </button>
          <button
            onClick={() => setFilterTab('rejected')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
              filterTab === 'rejected'
                ? 'bg-rose-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Rejected</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
              {rejectedShops.length}
            </span>
          </button>
          <button
            onClick={() => setFilterTab('all')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
              filterTab === 'all'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>All ({shops.length})</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by shop, owner, phone, payment ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all text-slate-900"
          />
        </div>
      </div>

      {/* Main List / Cards */}
      {displayedShops.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">
            {filterTab === 'pending'
              ? 'No Pending Signups'
              : filterTab === 'payments'
              ? 'No Pending Subscription Payments'
              : 'No Boutiques Found'}
          </h3>
          <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
            {filterTab === 'pending' || filterTab === 'payments'
              ? 'All requests have been reviewed and processed! New submissions will appear here automatically.'
              : 'Try clearing your search query or switching tabs.'}
          </p>
          {onNavigateToVerifiedShops && (
            <button
              onClick={onNavigateToVerifiedShops}
              className="mt-4 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Store className="w-4 h-4" />
              <span>View Verified Boutique Directory</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayedShops.map((shop) => {
            const isPending = shop.status === 'Pending Verification' || shop.isVerified === false;
            const isPendingPayment = shop.subscriptionStatus === 'pending_confirmation';
            const isRejected = shop.status === 'Rejected' || shop.verificationStatus === 'rejected';
            const cleanPhone = clean10DigitPhone(shop.phoneNumber);
            const waUrl = getWhatsAppUrl(
              cleanPhone,
              `Hello ${shop.ownerName || 'Boutique Owner'}! This is the ShopScopers Admin regarding your boutique *${shop.shopName}* (Payment Ref: ${shop.paymentId || 'N/A'}).`
            );

            return (
              <div
                key={shop.id}
                className={`bg-white rounded-2xl border transition-all duration-200 shadow-2xs hover:shadow-md flex flex-col justify-between overflow-hidden ${
                  isPendingPayment
                    ? 'border-amber-400 ring-2 ring-amber-200 bg-amber-50/10'
                    : isPending
                    ? 'border-amber-200 ring-1 ring-amber-100'
                    : isRejected
                    ? 'border-rose-200'
                    : 'border-slate-200'
                }`}
              >
                {/* Card Top */}
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-11 h-11 rounded-xl flex items-center justify-center font-black text-sm shrink-0 shadow-2xs ${
                          isPendingPayment
                            ? 'bg-amber-200 text-amber-950 border border-amber-400'
                            : isPending
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : isRejected
                            ? 'bg-rose-100 text-rose-800 border border-rose-300'
                            : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                        }`}
                      >
                        {shop.shopName
                          ? shop.shopName
                              .split(' ')
                              .map((w) => w[0])
                              .join('')
                              .slice(0, 2)
                              .toUpperCase()
                          : 'BT'}
                      </div>
                      <div>
                        <h3 className="font-bold text-base text-slate-900 leading-tight">
                          {shop.shopName}
                        </h3>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                          Owner: <span className="text-slate-800 font-semibold">{shop.ownerName}</span>
                        </p>
                      </div>
                    </div>

                    {/* Status Pill */}
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 flex items-center gap-1 ${
                        isPendingPayment
                          ? 'bg-amber-100 text-amber-950 border border-amber-400 font-black animate-pulse'
                          : isPending
                          ? 'bg-amber-100 text-amber-900 border border-amber-300 animate-pulse'
                          : isRejected
                          ? 'bg-rose-100 text-rose-800 border border-rose-300'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      }`}
                    >
                      {isPendingPayment ? (
                        <>
                          <Crown className="w-3 h-3 text-amber-600 fill-amber-500" />
                          <span>Payment Review</span>
                        </>
                      ) : isPending ? (
                        <>
                          <Clock className="w-3 h-3" />
                          <span>Pending</span>
                        </>
                      ) : isRejected ? (
                        <>
                          <XCircle className="w-3 h-3" />
                          <span>Rejected</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Verified</span>
                        </>
                      )}
                    </span>
                  </div>

                  {/* Payment Verification Highlight Block */}
                  {isPendingPayment && (
                    <div className="bg-amber-100/90 border border-amber-300 p-3 rounded-xl mb-3 space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-bold text-amber-950">
                        <span className="flex items-center gap-1">
                          <Crown className="w-3.5 h-3.5 text-amber-700 fill-amber-500" />
                          <span>Pro Upgrade Payment</span>
                        </span>
                        <span className="text-emerald-800 font-black bg-white px-2 py-0.5 rounded border border-emerald-300 text-[11px]">
                          ₹{shop.subscriptionPrice || (shop.subscriptionPlan === 'Monthly Pro' ? '199' : '1,999')}
                        </span>
                      </div>
                      <div className="text-[11px] text-amber-900 font-medium">
                        Plan: <strong>{shop.subscriptionPlan || 'Annual Pro (₹1,999/-)'}</strong>
                      </div>
                      {shop.paymentId && (
                        <div className="text-[11px] text-slate-800 font-mono bg-white/80 px-2 py-1 rounded border border-amber-200">
                          Ref / UTR: <strong className="text-slate-950">{shop.paymentId}</strong>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Details Grid */}
                  <div className="space-y-2 text-xs text-slate-600 bg-slate-50/80 p-3 rounded-xl border border-slate-100 mt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-medium">Contact Phone:</span>
                      <span className="font-mono font-bold text-slate-900">{shop.phoneNumber}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-medium">Location:</span>
                      <span className="font-semibold text-slate-800 truncate max-w-[170px] text-right">
                        {shop.city || 'City'}, {shop.state || 'State'}
                      </span>
                    </div>

                    {shop.specialty && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 font-medium">Specialty:</span>
                        <span className="font-medium text-slate-800 truncate max-w-[170px] text-right">
                          {shop.specialty}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-medium">Plan Status:</span>
                      <span className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                        shop.isSubscribed
                          ? 'bg-amber-50 text-amber-950 border border-amber-300'
                          : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      }`}>
                        {shop.isSubscribed ? `${shop.planTier} (Active)` : `${shop.planTier} (Trial)`}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-medium">Submitted:</span>
                      <span className="text-slate-500 font-medium text-[11px]">
                        {new Date(shop.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>

                    {isRejected && shop.rejectionReason && (
                      <div className="pt-1 text-[11px] text-rose-700 border-t border-rose-200/60 mt-1">
                        <span className="font-bold">Reason:</span> {shop.rejectionReason}
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center gap-2">
                  {/* WhatsApp Quick Chat */}
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-xl bg-white hover:bg-emerald-50 text-emerald-700 border border-slate-200 transition-colors shadow-2xs cursor-pointer flex items-center justify-center shrink-0"
                    title="Chat on WhatsApp"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </a>

                  {/* Phone Call */}
                  <a
                    href={`tel:${shop.phoneNumber}`}
                    className="p-2 rounded-xl bg-white hover:bg-blue-50 text-blue-700 border border-slate-200 transition-colors shadow-2xs cursor-pointer flex items-center justify-center shrink-0"
                    title="Call Boutique"
                  >
                    <Phone className="w-4 h-4" />
                  </a>

                  {/* Subscription Confirmation Action */}
                  {isPendingPayment ? (
                    <>
                      <button
                        onClick={() => handleOpenPaymentApproval(shop)}
                        className="flex-1 py-2 px-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-xs transition-all cursor-pointer truncate"
                      >
                        <Crown className="w-4 h-4 text-amber-300 fill-amber-300 shrink-0" />
                        <span className="truncate">Confirm Payment & Unlock</span>
                      </button>

                      <button
                        onClick={() => handleRejectPayment(shop)}
                        className="p-2 rounded-xl bg-white hover:bg-rose-50 text-rose-600 border border-slate-200 transition-colors shadow-2xs cursor-pointer shrink-0"
                        title="Reject Payment"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  ) : isPending ? (
                    <>
                      <button
                        onClick={() => handleVerify(shop)}
                        className="flex-1 py-2 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-xs transition-all cursor-pointer truncate"
                      >
                        <Check className="w-4 h-4 stroke-[3] shrink-0" />
                        <span className="truncate">Verify & Unlock</span>
                      </button>

                      <button
                        onClick={() => {
                          setRejectModalShop(shop);
                          setRejectionReason('');
                        }}
                        className="p-2 rounded-xl bg-white hover:bg-amber-50 text-amber-600 border border-slate-200 transition-colors shadow-2xs cursor-pointer shrink-0"
                        title="Reject Registration"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  ) : isRejected ? (
                    <button
                      onClick={() => handleVerify(shop)}
                      className="flex-1 py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer truncate"
                    >
                      <RefreshCw className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">Re-verify & Approve</span>
                    </button>
                  ) : (
                    <div className="flex-1 flex items-center justify-between pl-2">
                      <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1 truncate">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span className="truncate">Portal Unlocked</span>
                      </span>
                      <button
                        onClick={() => {
                          const updated = AdminPlatformService.updateShopStatus(shop.id, 'Pending Verification');
                          onUpdateShops(updated);
                          triggerToast(`"${shop.shopName}" status reset to Pending.`);
                        }}
                        className="text-[11px] font-bold text-slate-500 hover:text-amber-700 transition-colors cursor-pointer shrink-0 ml-2"
                      >
                        Lock
                      </button>
                    </div>
                  )}

                  {/* Delete Store Button */}
                  <button
                    onClick={() => setDeleteModalShop(shop)}
                    className="p-2 rounded-xl bg-white hover:bg-rose-50 text-rose-600 border border-slate-200 transition-colors shadow-2xs cursor-pointer shrink-0"
                    title="Permanently Delete Boutique & Purge Data"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Subscription Payment Approval Modal */}
      {paymentApprovalShop && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl border border-amber-300 p-4 sm:p-5 overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-amber-700">
                <div className="p-1.5 rounded-lg bg-amber-100 text-amber-800">
                  <Crown className="w-4 h-4 fill-amber-500" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-900 leading-tight">Confirm Payment</h3>
                  <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Unlock Boutique</span>
                </div>
              </div>
              <button
                onClick={() => setPaymentApprovalShop(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-xl text-xs space-y-1 mb-3 text-amber-950">
              <div className="flex justify-between">
                <span className="text-slate-600 font-medium">Boutique:</span>
                <span className="font-extrabold text-slate-950 truncate max-w-[180px]">{paymentApprovalShop.shopName}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-600 font-medium">Contact:</span>
                <span className="font-bold text-slate-900">{paymentApprovalShop.phoneNumber}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-600 font-medium">Plan / Txn:</span>
                <span className="font-bold text-emerald-800 font-mono">{paymentApprovalShop.paymentId || 'TXN-PAID'}</span>
              </div>
            </div>

            <form onSubmit={handleConfirmPaymentApproval} className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-700 mb-1">
                  Validity Period:
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setUnlockDays(30)}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                      unlockDays === 30
                        ? 'bg-emerald-800 text-white border-emerald-800 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    30 D
                  </button>
                  <button
                    type="button"
                    onClick={() => setUnlockDays(365)}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                      unlockDays === 365
                        ? 'bg-emerald-800 text-white border-emerald-800 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    365 D
                  </button>
                  <button
                    type="button"
                    onClick={() => setUnlockDays(730)}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                      unlockDays === 730
                        ? 'bg-emerald-800 text-white border-emerald-800 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    730 D
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-700 mb-0.5">
                  Custom Days:
                </label>
                <input
                  type="number"
                  min={1}
                  max={3650}
                  value={unlockDays}
                  onChange={(e) => setUnlockDays(Number(e.target.value) || 30)}
                  className="w-full p-2 text-xs font-bold border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden text-slate-900 bg-slate-50"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPaymentApprovalShop(null)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg text-xs font-bold bg-emerald-800 hover:bg-emerald-900 text-white shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Unlock {unlockDays} Days</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModalShop && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-amber-600">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="font-bold text-base text-slate-900">Reject Boutique Registration</h3>
              </div>
              <button
                onClick={() => setRejectModalShop(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 mb-4">
              You are rejecting the registration for <strong className="text-slate-900">{rejectModalShop.shopName}</strong> ({rejectModalShop.ownerName}). The boutique portal will remain locked.
            </p>

            <form onSubmit={handleReject} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Reason for rejection / missing details (optional)
                </label>
                <textarea
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g. Incomplete boutique address, invalid contact phone number, please re-submit with correct shop photos..."
                  className="w-full p-2.5 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-hidden text-slate-900 bg-slate-50"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectModalShop(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white shadow-xs transition-colors cursor-pointer"
                >
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalShop && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-rose-200 p-6 overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-rose-600">
                <div className="p-2 rounded-xl bg-rose-100 text-rose-700">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900 leading-tight">Delete Boutique Store</h3>
                  <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider">Destructive Action</span>
                </div>
              </div>
              <button
                disabled={isDeleting}
                onClick={() => setDeleteModalShop(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-700 mb-5">
              <p>
                Are you sure you want to permanently delete <strong className="text-slate-950 font-bold">{deleteModalShop.shopName}</strong> ({deleteModalShop.ownerName} &bull; {deleteModalShop.phoneNumber})?
              </p>
              <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl space-y-1 text-rose-900">
                <p className="font-bold flex items-center gap-1.5 text-rose-950">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>The following backend data will be permanently erased:</span>
                </p>
                <ul className="list-disc list-inside space-y-0.5 text-[11px] text-rose-800 pl-1">
                  <li>Boutique profile & registration credentials</li>
                  <li>All orders, alterations, and job card history</li>
                  <li>Customer list, measurement logs & contact details</li>
                  <li>Karigar staff directory & capacity allocations</li>
                  <li>Inventory stock items & boutique catalog files</li>
                </ul>
              </div>
              <p className="text-[11px] text-slate-500 italic">
                This action is immediate and cannot be undone.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeleteModalShop(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Deleting Store Data...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Permanently Delete Store</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
