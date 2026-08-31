import React, { useState, useEffect } from 'react';
import {
  Lock,
  Clock,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  MessageSquare,
  Phone,
  Store,
  Scissors,
  Layers,
  Sparkles,
  LogOut,
  AlertCircle,
  FileText,
  Users,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { ShopProfile } from '../../types';
import { roomDb } from '../../lib/localRoomDb';
import { db } from '../../lib/firebase';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { clean10DigitPhone, getWhatsAppUrl } from '../../lib/phoneUtils';
import { BrandLogo } from './BrandLogo';

interface BoutiqueVerificationLockScreenProps {
  shopProfile: ShopProfile;
  userPhone?: string;
  onLogout: () => void;
  onVerificationApproved: () => void;
}

export const BoutiqueVerificationLockScreen: React.FC<BoutiqueVerificationLockScreenProps> = ({
  shopProfile,
  userPhone,
  onLogout,
  onVerificationApproved,
}) => {
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isApprovedCelebration, setIsApprovedCelebration] = useState(false);

  const cleanPhone = clean10DigitPhone(userPhone || shopProfile.phoneNumber || '');
  const boutiqueDocId = roomDb.getBoutiqueId() || `shop_${cleanPhone}`;

  // Real-time listener on the boutique document in Firestore
  useEffect(() => {
    if (!boutiqueDocId) return;

    try {
      const unsub = onSnapshot(
        doc(db, 'boutiques', boutiqueDocId),
        (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            const isVerified =
              data.isVerified === true ||
              data.status === 'Active' ||
              data.status === 'active' ||
              data.verificationStatus === 'verified';

            if (isVerified) {
              setIsApprovedCelebration(true);
              // Update local roomDb profile
              roomDb.updateShopProfile({
                isVerified: true,
                status: 'Active',
                verificationStatus: 'verified',
              });
              // Auto-trigger approval transition
              setTimeout(() => {
                onVerificationApproved();
              }, 1800);
            }
          }
        },
        (err) => {
          console.warn('Live verification listener note:', err);
        }
      );

      return () => unsub();
    } catch (e) {
      // ignore
    }
  }, [boutiqueDocId, onVerificationApproved]);

  const handleManualRefresh = async () => {
    setCheckingStatus(true);
    setStatusMessage(null);

    try {
      // Re-fetch from Firestore
      const docSnap = await getDoc(doc(db, 'boutiques', boutiqueDocId)).catch(() => null);
      if (docSnap && docSnap.exists()) {
        const data = docSnap.data();
        const isVerified =
          data.isVerified === true ||
          data.status === 'Active' ||
          data.status === 'active' ||
          data.verificationStatus === 'verified';

        if (isVerified) {
          setIsApprovedCelebration(true);
          roomDb.updateShopProfile({
            isVerified: true,
            status: 'Active',
            verificationStatus: 'verified',
          });
          setTimeout(() => {
            onVerificationApproved();
          }, 1500);
          return;
        }
      }

      // Check current local roomDb profile as fallback
      const local = roomDb.getShopProfile();
      if (local.isVerified === true || local.status === 'Active') {
        setIsApprovedCelebration(true);
        setTimeout(() => {
          onVerificationApproved();
        }, 1500);
        return;
      }

      setStatusMessage('Verification is currently still in review by the admin team. Please check back shortly or WhatsApp admin for expedited approval.');
    } catch (err) {
      setStatusMessage('Unable to connect to verification servers. Please try again or reach out on WhatsApp.');
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleBypassTestingUnlock = () => {
    roomDb.updateShopProfile({
      isVerified: true,
      status: 'Active',
      verificationStatus: 'verified',
    });
    setIsApprovedCelebration(true);
    setTimeout(() => {
      onVerificationApproved();
    }, 1000);
  };

  // WhatsApp link to Super Admin for expedited verification
  const adminWhatsAppUrl = getWhatsAppUrl(
    '7608807790',
    `Hello ShopScopers Super Admin, I have registered my boutique *${shopProfile.shopName || 'Boutique Shop'}* (Owner: ${shopProfile.ownerName || 'Owner'}, Phone: +91 ${cleanPhone}). Please verify and unlock my portal.`
  );

  const lockedFeatures = [
    { title: 'Master Orders & Measurements Matrix', desc: 'Full custom tailoring workflows, blouses, suits & alteration trackers.' },
    { title: 'Smart Karigar Capacity & Timelines', desc: 'Assign master cut/stitch jobs, monitor worker deadlines and piece rates.' },
    { title: 'Digital Inventory & Try-On Lookbooks', desc: 'Upload fabrics, catalog ready-mades & share live customer catalogues.' },
    { title: 'Instant Customer CRM & WhatsApp Alerts', desc: 'Automated order delivery updates, trial reminders and payment receipts.' },
    { title: 'Billing, Invoicing & UPI QR Payments', desc: 'Direct UPI collection, PDF invoices with GST and sales ledger analytics.' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between font-sans selection:bg-emerald-500 selection:text-white">
      {/* Top Navigation */}
      <header className="px-4 sm:px-8 py-4 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <BrandLogo size="sm" variant="white" />
          <div className="hidden sm:block">
            <h1 className="text-sm font-black text-white tracking-tight leading-none">ShopScopers CRM</h1>
            <p className="text-[11px] text-emerald-400 font-medium">Boutique Operating System</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold animate-pulse">
            <Clock className="w-3.5 h-3.5" />
            <span>Verification Pending</span>
          </div>

          <button
            onClick={onLogout}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5 border border-slate-700 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Log Out</span>
          </button>
        </div>
      </header>

      {/* Main Lockout Content */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12 flex flex-col justify-center">
        {/* Approved Celebration Overlay */}
        {isApprovedCelebration ? (
          <div className="bg-emerald-950/90 border border-emerald-500 text-white rounded-3xl p-8 sm:p-12 text-center shadow-2xl animate-fadeIn backdrop-blur-xl">
            <div className="w-20 h-20 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-400/40 flex items-center justify-center mx-auto mb-6 animate-bounce">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-black uppercase tracking-wider border border-emerald-500/30">
              Account Verified
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-white mt-3">
              🎉 Verification Approved!
            </h2>
            <p className="text-slate-300 text-sm sm:text-base mt-2 max-w-md mx-auto">
              Your boutique portal is now unlocked. Welcome to ShopScopers Master Tailor CRM. Launching your workspace...
            </p>
            <div className="mt-6 flex items-center justify-center gap-2 text-emerald-400 text-xs font-bold">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Redirecting to Dashboard...</span>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Primary Status Card */}
            <div className="bg-gradient-to-b from-slate-900 to-slate-900/90 rounded-3xl border border-slate-800 p-6 sm:p-8 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0 shadow-inner">
                    <Lock className="w-7 h-7" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                        Portal Locked for Verification
                      </h2>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                      Your boutique account has been created and is currently under Super Admin security review.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-center">
                  <button
                    onClick={handleManualRefresh}
                    disabled={checkingStatus}
                    className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-emerald-950 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${checkingStatus ? 'animate-spin' : ''}`} />
                    <span>{checkingStatus ? 'Checking Status...' : 'Check Status'}</span>
                  </button>
                </div>
              </div>

              {/* Status Message */}
              {statusMessage && (
                <div className="mt-4 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>{statusMessage}</span>
                </div>
              )}

              {/* 3-Step Verification Pipeline */}
              <div className="mt-6 pt-2">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">
                  Onboarding & Security Pipeline
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-emerald-500/40 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">1. Signup Submitted</h4>
                      <p className="text-[10px] text-emerald-400 font-medium">Completed</p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-amber-500/40 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center shrink-0 animate-pulse">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">2. Admin Verification</h4>
                      <p className="text-[10px] text-amber-400 font-medium">In Review</p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-700/60 flex items-center gap-3 opacity-60">
                    <div className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 border border-slate-700 flex items-center justify-center shrink-0">
                      <Lock className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-300">3. Portal Unlocked</h4>
                      <p className="text-[10px] text-slate-500 font-medium">Awaiting Step 2</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Boutique Details Summary */}
              <div className="mt-6 p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Registered Boutique Profile
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    ID: {cleanPhone ? `shop_${cleanPhone}` : 'shop_pending'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Boutique Name:</span>
                    <span className="font-bold text-white text-sm">{shopProfile.shopName || 'Boutique Shop'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Owner / Manager:</span>
                    <span className="font-semibold text-slate-200">{shopProfile.ownerName || 'Master Tailor'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Registered Contact:</span>
                    <span className="font-mono font-bold text-emerald-400">
                      {shopProfile.phoneNumber || `+91 ${cleanPhone}`}
                    </span>
                  </div>
                  {shopProfile.address && (
                    <div className="sm:col-span-2">
                      <span className="text-slate-400 block text-[11px]">Studio Address:</span>
                      <span className="text-slate-300 truncate block">{shopProfile.address}</span>
                    </div>
                  )}
                  {shopProfile.specialty && (
                    <div>
                      <span className="text-slate-400 block text-[11px]">Specialty:</span>
                      <span className="text-slate-300">{shopProfile.specialty}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Fast-Track & Support Action Bar */}
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span>Need Instant Fast-Track Verification?</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Send a quick message on WhatsApp to the Super Admin team to get approved in under 2 minutes.
                </p>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <a
                  href={adminWhatsAppUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-950 transition-all cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Fast-Track via WhatsApp</span>
                </a>

                <a
                  href="tel:+917608807790"
                  className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 border border-slate-700 transition-all cursor-pointer"
                  title="Call Support"
                >
                  <Phone className="w-4 h-4" />
                  <span className="hidden sm:inline">Call Admin</span>
                </a>
              </div>
            </div>

            {/* Locked Features Preview */}
            <div className="bg-slate-900/60 rounded-2xl border border-slate-800/80 p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-slate-400" />
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Features Locked Until Verification
                  </h3>
                </div>
                <span className="text-[10px] text-slate-400">5 Modules Inactive</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {lockedFeatures.map((feat, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/60 flex items-start gap-2.5 opacity-70"
                  >
                    <Lock className="w-4 h-4 text-amber-400/80 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-200 leading-tight">{feat.title}</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">{feat.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Test Bypass Footer for Developer / Testing */}
            <div className="pt-2 flex items-center justify-between text-xs text-slate-400">
              <span>Testing the application?</span>
              <button
                onClick={handleBypassTestingUnlock}
                className="text-[11px] text-slate-400 hover:text-emerald-400 transition-colors underline cursor-pointer"
              >
                Instant Test Unlock (Demo Bypass)
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="px-4 py-4 text-center text-xs text-slate-400 border-t border-slate-900 bg-slate-950/80">
        ShopScopers Multi-Tenant Operating System • Super Admin Verification Engine
      </footer>
    </div>
  );
};
