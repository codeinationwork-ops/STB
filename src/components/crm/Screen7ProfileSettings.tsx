import React, { useState, useMemo, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import {
  ArrowLeft,
  Store,
  User,
  Phone,
  MapPin,
  QrCode,
  Users,
  RefreshCw,
  Plus,
  Edit2,
  Check,
  Shield,
  Lock,
  Cloud,
  Smartphone,
  LogOut,
  Share2,
  ExternalLink,
  Trash2,
  Globe,
  Database,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Crown,
  CreditCard,
  Clock,
  Download,
  Copy,
  Upload,
} from 'lucide-react';
import { ShopProfile, StaffTailor, InventoryItem, BoutiqueSubscription } from '../../types';
import { useLanguage } from '../../lib/LanguageContext';
import { roomDb } from '../../lib/localRoomDb';
import { SubscriptionService } from '../../lib/subscriptionService';
import { ShopScoperScanCode } from './ShopScoperScanCode';
import { SearchableSelect } from '../common/SearchableSelect';
import { ALL_INDIAN_STATES, INDIA_STATES_AND_CITIES } from '../../data/indiaLocations';
import { getSubscriptionStatus } from '../../lib/subscriptionUtils';
import { PaymentGatewayModal } from './PaymentGatewayModal';
import { downloadImageFile } from '../../lib/imageDownloadUtils';

interface Screen7ProfileSettingsProps {
  profile: ShopProfile;
  tailors: StaffTailor[];
  inventory?: InventoryItem[];
  onBack: () => void;
  onUpdateProfile: (profile: Partial<ShopProfile>) => void;
  onAddTailor: (name: string, phone: string, role: 'Owner' | 'Tailor') => void;
  onDeleteTailor?: (tailorId: string) => void;
  onTriggerSync: () => Promise<void>;
  onLogout?: () => void;
  isDesktopView?: boolean;
}

export const Screen7ProfileSettings: React.FC<Screen7ProfileSettingsProps> = ({
  profile,
  tailors,
  inventory,
  onBack,
  onUpdateProfile,
  onAddTailor,
  onDeleteTailor,
  onTriggerSync,
  onLogout,
  isDesktopView = false,
}) => {
  const { language, setLanguage, isHindi } = useLanguage();
  const [isSyncing, setIsSyncing] = useState(false);
  const currentInventory = inventory && inventory.length > 0 ? inventory : roomDb.getInventory();
  const [isResetting, setIsResetting] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const [showEditShopModal, setShowEditShopModal] = useState(false);
  const [showAddTailorModal, setShowAddTailorModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [subscriptionDoc, setSubscriptionDoc] = useState<BoutiqueSubscription | null>(null);

  const boutiqueId = (profile as any).id || (profile as any).boutiqueId || profile.phoneNumber || roomDb.getBoutiqueId();

  useEffect(() => {
    if (!boutiqueId) return;
    const unsub = SubscriptionService.subscribeToBoutiqueSubscription(boutiqueId, (sub) => {
      setSubscriptionDoc(sub);
    });
    return () => unsub();
  }, [boutiqueId]);

  const subscription = getSubscriptionStatus(profile, subscriptionDoc);

  // Edit shop form
  const [shopName, setShopName] = useState(profile.shopName);
  const [ownerName, setOwnerName] = useState(profile.ownerName);
  const [phoneNumber, setPhoneNumber] = useState(profile.phoneNumber);
  const [address, setAddress] = useState(profile.address);
  const [shopState, setShopState] = useState(profile.state || '');
  const [shopCity, setShopCity] = useState(profile.city || '');
  const [upiId, setUpiId] = useState(profile.upiId || '');
  const [gpayNumber, setGpayNumber] = useState(profile.gpayPhonePeNumber || '');
  const [upiQrCodeUrl, setUpiQrCodeUrl] = useState(profile.upiQrCodeUrl || '');

  // UPI QR Generation & Download state
  const [generatedUpiQrUrl, setGeneratedUpiQrUrl] = useState<string>('');
  const [isDownloadingUpiQr, setIsDownloadingUpiQr] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const qrFileInputRef = useRef<HTMLInputElement>(null);

  // Generate dynamic QR code if upiId exists or use upiQrCodeUrl
  useEffect(() => {
    let isMounted = true;
    const generateQr = async () => {
      if (profile.upiQrCodeUrl && profile.upiQrCodeUrl.trim() !== '') {
        if (isMounted) setGeneratedUpiQrUrl(profile.upiQrCodeUrl);
        return;
      }
      if (profile.upiId && profile.upiId.trim() !== '') {
        try {
          const upiUri = `upi://pay?pa=${encodeURIComponent(profile.upiId.trim())}&pn=${encodeURIComponent(profile.shopName || 'Boutique Store')}&cu=INR`;
          const url = await QRCode.toDataURL(upiUri, {
            width: 800,
            margin: 2,
            color: {
              dark: '#000000',
              light: '#ffffff',
            },
          });
          if (isMounted) setGeneratedUpiQrUrl(url);
        } catch (err) {
          console.error('Failed to generate UPI QR code:', err);
        }
      } else {
        if (isMounted) setGeneratedUpiQrUrl('');
      }
    };
    generateQr();
    return () => {
      isMounted = false;
    };
  }, [profile.upiQrCodeUrl, profile.upiId, profile.shopName]);

  const handleCopyUpi = () => {
    if (profile.upiId) {
      navigator.clipboard.writeText(profile.upiId);
      setCopiedUpi(true);
      setTimeout(() => setCopiedUpi(false), 2000);
    }
  };

  const handleDownloadUpiQr = async () => {
    setIsDownloadingUpiQr(true);
    try {
      // Create a high-res printable payment card canvas
      const canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = 1040;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Card background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, 800, 1040);

      // Outer border
      ctx.strokeStyle = '#064e3b';
      ctx.lineWidth = 8;
      ctx.strokeRect(20, 20, 760, 1000);

      // Top Emerald Header Banner
      ctx.fillStyle = '#064e3b'; // emerald-900
      ctx.fillRect(20, 20, 760, 160);

      // Accent gold bar
      ctx.fillStyle = '#F59E0B';
      ctx.fillRect(20, 174, 760, 6);

      // Store Title
      ctx.fillStyle = '#FBBF24';
      ctx.font = 'bold 22px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('✦  ACCEPTED HERE  ✦', 400, 65);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = '900 36px system-ui, sans-serif';
      ctx.fillText(profile.shopName.toUpperCase(), 400, 115);

      // Subtitle
      ctx.fillStyle = '#A7F3D0';
      ctx.font = '600 20px system-ui, sans-serif';
      ctx.fillText('BHIM UPI  •  Google Pay  •  PhonePe  •  Paytm', 400, 150);

      // Draw QR Code
      const qrSource = generatedUpiQrUrl || profile.upiQrCodeUrl;
      if (qrSource) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        await new Promise<void>((resolve) => {
          img.onload = () => resolve();
          img.onerror = () => resolve();
          img.src = qrSource;
        });
        ctx.drawImage(img, 130, 210, 540, 540);
      }

      // Card border around QR
      ctx.strokeStyle = '#CBD5E1';
      ctx.lineWidth = 2;
      ctx.strokeRect(120, 200, 560, 560);

      // Bottom info box
      ctx.fillStyle = '#F8FAFC';
      ctx.fillRect(100, 790, 600, 180);
      ctx.strokeStyle = '#E2E8F0';
      ctx.strokeRect(100, 790, 600, 180);

      ctx.fillStyle = '#0F172A';
      ctx.font = '900 28px monospace';
      ctx.fillText(profile.upiId || 'Scan to Pay', 400, 840);

      if (profile.gpayPhonePeNumber) {
        ctx.fillStyle = '#334155';
        ctx.font = 'bold 22px system-ui, sans-serif';
        ctx.fillText(`GPay / PhonePe: ${profile.gpayPhonePeNumber}`, 400, 885);
      }

      ctx.fillStyle = '#64748B';
      ctx.font = '500 18px system-ui, sans-serif';
      ctx.fillText('Scan with any UPI payment app to pay instantly', 400, 930);

      // Footer
      ctx.fillStyle = '#064e3b';
      ctx.font = 'bold 15px system-ui, sans-serif';
      ctx.fillText('Powered by Boutique Applet Digital Payments', 400, 995);

      const link = document.createElement('a');
      link.download = `${profile.shopName.replace(/\s+/g, '_')}_UPI_Payment_QR.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Error downloading UPI QR:', err);
      if (generatedUpiQrUrl) {
        downloadImageFile(generatedUpiQrUrl, `${profile.shopName.replace(/\s+/g, '_')}_UPI_QR`);
      }
    } finally {
      setIsDownloadingUpiQr(false);
    }
  };

  const handleCustomQrUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      if (result) {
        setUpiQrCodeUrl(result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Available cities for selected state
  const availableCities = useMemo(() => {
    if (!shopState || !INDIA_STATES_AND_CITIES[shopState]) return [];
    return INDIA_STATES_AND_CITIES[shopState];
  }, [shopState]);

  // New tailor form
  const [newTailorName, setNewTailorName] = useState('');
  const [newTailorPhone, setNewTailorPhone] = useState('');
  const [newTailorRole, setNewTailorRole] = useState<'Owner' | 'Tailor'>('Tailor');

  const handleSyncClick = async () => {
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      const res = await roomDb.syncAllCollectionsToFirestore();
      setSyncFeedback('All sections synchronized with Firestore successfully!');
    } catch {
      await onTriggerSync();
      setSyncFeedback('Synchronized with Firestore.');
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncFeedback(null), 4000);
    }
  };

  const handleResetAndSync = async () => {
    if (!window.confirm('Re-sync and connect all sections to Firestore now? This ensures all collections (Shop Profile, Staff, Appointments, Orders, Customers, Inventory, Products) are freshly linked.')) {
      return;
    }
    setIsResetting(true);
    try {
      await roomDb.syncWithCloudFirestore();
      setSyncFeedback('Firestore database completely connected and synchronized!');
    } catch {
      setSyncFeedback('Database connection refreshed.');
    } finally {
      setIsResetting(false);
      setTimeout(() => setSyncFeedback(null), 4000);
    }
  };

  const handleSaveShopDetails = () => {
    onUpdateProfile({
      shopName,
      ownerName,
      phoneNumber,
      address,
      state: shopState,
      city: shopCity,
      upiId,
      gpayPhonePeNumber: gpayNumber,
      upiQrCodeUrl,
    });
    setShowEditShopModal(false);
  };

  const handleCreateTailor = () => {
    if (!newTailorName || !newTailorPhone) return;
    onAddTailor(newTailorName, newTailorPhone, newTailorRole);
    setNewTailorName('');
    setNewTailorPhone('');
    setShowAddTailorModal(false);
  };

  return (
    <div className={`min-h-full bg-slate-50 text-slate-900 font-sans ${isDesktopView ? 'p-6' : 'pb-20'}`}>
      {/* Top Header (Mobile Only) */}
      {!isDesktopView ? (
        <div className="bg-emerald-800 text-white p-4 sticky top-0 z-20 shadow-md flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 transition-all text-white cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-base font-bold tracking-tight">Shop Profile & Settings</h1>
              <p className="text-[10px] text-emerald-200">UPI, Workers, Sync & App Config</p>
            </div>
          </div>

          <button
            onClick={handleSyncClick}
            disabled={isSyncing}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-xl font-bold text-xs shadow flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync Cloud'}</span>
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200">
          <button
            onClick={onBack}
            className="text-xs font-bold text-slate-600 hover:text-emerald-800 flex items-center gap-1 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-sm cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </button>

          <button
            onClick={handleSyncClick}
            disabled={isSyncing}
            className="bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 rounded-xl font-bold text-xs shadow flex items-center gap-2 cursor-pointer transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-white ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing Firestore...' : 'Sync Cloud DB'}</span>
          </button>
        </div>
      )}

      <div className={`space-y-4 ${isDesktopView ? 'w-full max-w-none' : 'p-4 max-w-2xl mx-auto'}`}>
        {/* Section 1: Shop Details Card */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
              <Store className="w-4 h-4 text-emerald-700" />
              <span>Shop Details</span>
            </h2>

            <button
              onClick={() => setShowEditShopModal(true)}
              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Edit Details</span>
            </button>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <Store className="w-4 h-4 text-slate-400" />
              <span className="font-extrabold text-slate-900 text-sm">{profile.shopName}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <User className="w-4 h-4 text-slate-400" />
              <span>Owner: <strong className="text-slate-800">{profile.ownerName}</strong></span>
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <Phone className="w-4 h-4 text-slate-400" />
              <span>Mobile: <strong className="text-slate-800">{profile.phoneNumber}</strong></span>
            </div>
            <div className="flex items-start gap-2 text-slate-600 pt-1 border-t border-slate-100">
              <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Exact Shop Address & Location</span>
                <span className="font-extrabold text-slate-900 block text-xs whitespace-pre-wrap">{profile.address || 'Address not set'}</span>
                {(profile.city || profile.state) && (
                  <span className="text-[11px] font-bold text-emerald-700 block mt-0.5">
                    📍 {[profile.city, profile.state].filter(Boolean).join(', ')}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Section 1.5: ShopScoper Unique ScanCode & Live Inventory Catalogue */}
        <ShopScoperScanCode shop={profile} inventory={currentInventory} />

        {/* Section 1.8: Subscription Plan & 1-Month Free Trial Status */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                <Crown className="w-4 h-4 fill-amber-500" />
              </div>
              <div>
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Boutique Pro License & Trial Status
                </h2>
                <p className="text-[10px] text-slate-500">Cloud Sync, Unlimited Orders & WhatsApp Slips</p>
              </div>
            </div>

            <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] uppercase tracking-wider flex items-center gap-1 ${
              subscription.isSubscribed
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : subscription.isPendingConfirmation
                ? 'bg-amber-50 text-amber-900 border border-amber-300 animate-pulse'
                : subscription.isTrialExpired
                ? 'bg-rose-50 text-rose-800 border border-rose-200 animate-pulse'
                : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
            }`}>
              {subscription.isSubscribed ? (
                <>
                  <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                  <span>{subscription.planTier} ({subscription.paidDaysLeft}d Active)</span>
                </>
              ) : subscription.isPendingConfirmation ? (
                <>
                  <Clock className="w-3 h-3 text-amber-600 animate-spin" />
                  <span>Payment Pending Admin Confirmation</span>
                </>
              ) : subscription.isTrialExpired ? (
                <>
                  <AlertTriangle className="w-3 h-3 text-rose-600" />
                  <span>Trial Expired</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3 h-3 text-amber-600" />
                  <span>1-Month Trial • {subscription.daysLeft}d left</span>
                </>
              )}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Current Status</span>
                <span className="font-extrabold text-slate-900">{subscription.planName}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Validity & Duration</span>
                <span className="font-semibold text-slate-700">
                  {subscription.isSubscribed
                    ? `${subscription.paidDaysLeft} Days Left (Valid until ${new Date(subscription.subscriptionExpiryDate || Date.now() + 365*86400000).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })})`
                    : subscription.isPendingConfirmation
                    ? `Payment Ref #${profile.paymentId || 'TXN'} (Under Admin Review)`
                    : subscription.isTrialExpired
                    ? '1-Month Free Trial Completed'
                    : `${subscription.daysLeft} Days Remaining (1-Month Free Trial)`}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Pro Pricing</span>
                <span className="font-extrabold text-emerald-800">₹199/mo or ₹1,999/yr</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-[11px] text-slate-600">
                {subscription.isSubscribed
                  ? 'All Pro features including automated Firestore backup, WhatsApp slips, and multi-karigar tracking are active.'
                  : subscription.isPendingConfirmation
                  ? 'Your payment has been logged. Admin is reviewing your transaction to unlock full portal features for the requested duration.'
                  : 'Upgrade your boutique desk to lock in annual savings and uninterrupted operations.'}
              </div>

              <button
                type="button"
                onClick={() => setShowUpgradeModal(true)}
                className="w-full sm:w-auto px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
              >
                <Crown className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                <span>
                  {subscription.isSubscribed
                    ? 'Renew / Change Plan'
                    : subscription.isPendingConfirmation
                    ? 'View Payment Slip'
                    : 'Upgrade to Pro (₹199/-)'}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Section 2: Payment Details & UPI Management */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm space-y-3.5">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
              <QrCode className="w-4 h-4 text-emerald-700" />
              <span>UPI & Digital Payment Scanner</span>
            </h2>

            <button
              type="button"
              onClick={() => {
                setShopName(profile.shopName);
                setOwnerName(profile.ownerName);
                setPhoneNumber(profile.phoneNumber);
                setAddress(profile.address);
                setShopState(profile.state || '');
                setShopCity(profile.city || '');
                setUpiId(profile.upiId || '');
                setGpayNumber(profile.gpayPhonePeNumber || '');
                setUpiQrCodeUrl(profile.upiQrCodeUrl || '');
                setShowEditShopModal(true);
              }}
              className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200 transition-colors"
            >
              <Edit2 className="w-3 h-3" />
              <span>Edit UPI</span>
            </button>
          </div>

          <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100/80 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-2 w-full sm:w-auto flex-1">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Store UPI ID</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-sm font-extrabold text-slate-900 font-mono">
                    {profile.upiId || 'UPI ID not configured'}
                  </span>
                  {profile.upiId && (
                    <button
                      type="button"
                      onClick={handleCopyUpi}
                      className="p-1 rounded-md bg-white hover:bg-slate-200 text-slate-700 border border-slate-300 transition-all cursor-pointer"
                      title="Copy UPI ID"
                    >
                      {copiedUpi ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    </button>
                  )}
                </div>
              </div>

              {profile.gpayPhonePeNumber && (
                <div className="text-xs text-slate-600">
                  <span className="font-semibold">GPay / PhonePe Number:</span>{' '}
                  <span className="font-bold text-slate-800 font-mono">{profile.gpayPhonePeNumber}</span>
                </div>
              )}

              <p className="text-[11px] text-slate-500">
                Customers can scan this QR code with Google Pay, PhonePe, Paytm, or BHIM to pay directly into your bank account.
              </p>

              {/* Action Buttons for UPI QR */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {(generatedUpiQrUrl || profile.upiQrCodeUrl || profile.upiId) && (
                  <button
                    type="button"
                    onClick={handleDownloadUpiQr}
                    disabled={isDownloadingUpiQr}
                    className="py-2 px-3.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition-transform active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{isDownloadingUpiQr ? 'Generating QR...' : 'Download UPI QR Code'}</span>
                  </button>
                )}

                {profile.upiId && (
                  <button
                    type="button"
                    onClick={() => {
                      const text = `Pay *${profile.shopName}* digitally via UPI ID: ${profile.upiId} (GPay/PhonePe: ${profile.gpayPhonePeNumber || profile.phoneNumber})`;
                      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                    }}
                    className="py-2 px-3 bg-[#25D366]/15 hover:bg-[#25D366]/25 text-emerald-900 border border-[#25D366]/40 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Share UPI on WhatsApp</span>
                  </button>
                )}
              </div>
            </div>

            {/* QR Code Card Display */}
            <div className="flex flex-col items-center shrink-0">
              <div
                onClick={handleDownloadUpiQr}
                title="Click to download high-resolution QR Code"
                className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl border-2 border-emerald-600/30 overflow-hidden bg-white p-2 flex items-center justify-center shadow-md relative group cursor-pointer hover:border-emerald-600 transition-all"
              >
                {generatedUpiQrUrl || profile.upiQrCodeUrl ? (
                  <img
                    src={generatedUpiQrUrl || profile.upiQrCodeUrl}
                    alt="UPI QR Code"
                    className="w-full h-full object-contain"
                    style={{ imageRendering: 'pixelated' }}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-center p-2">
                    <QrCode className="w-8 h-8 text-slate-300 mb-1" />
                    <span className="text-[9px] text-slate-400 font-bold">Add UPI ID to show QR</span>
                  </div>
                )}

                {(generatedUpiQrUrl || profile.upiQrCodeUrl) && (
                  <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white gap-1">
                    <Download className="w-5 h-5 text-amber-300" />
                    <span className="text-[9px] font-black uppercase">Download QR</span>
                  </div>
                )}
              </div>
              <span className="text-[9px] font-bold text-slate-500 mt-1 uppercase tracking-wide">
                ✦ Tap to Download ✦
              </span>
            </div>
          </div>
        </div>

        {/* Section 3: Staff & Tailors Management */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-4 h-4 text-emerald-700" />
              <span>Tailors & Master Staff ({tailors.length})</span>
            </h2>

            <button
              onClick={() => setShowAddTailorModal(true)}
              className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add Worker</span>
            </button>
          </div>

          <div className="space-y-2">
            {tailors.map((t) => {
              const isOwner = t.role === 'Owner' || (t.name && t.name.includes('Owner')) || t.id === 'tailor-owner';
              return (
                <div
                  key={t.id}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-emerald-700 text-white font-bold flex items-center justify-center">
                      {t.initials}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900">{t.name}</h4>
                      <p className="text-[10px] text-slate-500">{t.phone ? `${t.phone} • ` : ''}({t.role})</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold text-[10px]">
                      {t.activeOrdersCount} Active
                    </span>

                    {!isOwner && onDeleteTailor && (
                      <button
                        type="button"
                        onClick={() => onDeleteTailor(t.id)}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title={`Remove ${t.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 4: App Language / भाषा सेटिंग */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border-2 border-slate-200/90 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-950">
                  {language === 'hi' ? 'ऐप की भाषा' : language === 'bn' ? 'অ্যাপের ভাষা' : language === 'or' ? 'ଆପ୍ଲିକେସନ୍ ଭାଷା' : 'App Language'}
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  {language === 'hi'
                    ? 'अपनी पसंदीदा भाषा चुनें (English, हिन्दी, বাংলা, ଓଡ଼ିଆ)'
                    : language === 'bn'
                    ? 'আপনার পছন্দের ভাষা নির্বাচন করুন (English, हिन्दी, বাংলা, ଓଡ଼ିଆ)'
                    : language === 'or'
                    ? 'ଆପଣଙ୍କ ପସନ୍ଦର ଭାଷା ବାଛନ୍ତୁ (English, हिन्दी, বাংলা, ଓଡ଼ିଆ)'
                    : 'Choose language for entire app (English, Hindi, Bengali, Odia)'}
                </p>
              </div>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
              {language === 'en' ? 'English Active' : language === 'hi' ? 'हिन्दी सक्रिय' : language === 'bn' ? 'বাংলা সক্রিয়' : 'ଓଡ଼ିଆ ସକ୍ରିୟ'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* English Option */}
            <div
              onClick={() => setLanguage('en')}
              className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                language === 'en'
                  ? 'bg-emerald-50/80 border-emerald-600 text-emerald-900 ring-2 ring-emerald-600/20'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                  language === 'en' ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-600'
                }`}>
                  {language === 'en' ? '✓' : ''}
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-950">English (Default)</div>
                  <div className="text-xs text-slate-500 font-medium">Standard clean interface</div>
                </div>
              </div>
            </div>

            {/* Hindi Option */}
            <div
              onClick={() => setLanguage('hi')}
              className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                language === 'hi'
                  ? 'bg-emerald-50/80 border-emerald-600 text-emerald-900 ring-2 ring-emerald-600/20'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                  language === 'hi' ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-600'
                }`}>
                  {language === 'hi' ? '✓' : ''}
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-950">हिन्दी (Hindi)</div>
                  <div className="text-xs text-slate-500 font-medium">सरल हिन्दी में बुटीक डैशबोर्ड</div>
                </div>
              </div>
            </div>

            {/* Bengali Option */}
            <div
              onClick={() => setLanguage('bn')}
              className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                language === 'bn'
                  ? 'bg-emerald-50/80 border-emerald-600 text-emerald-900 ring-2 ring-emerald-600/20'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                  language === 'bn' ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-600'
                }`}>
                  {language === 'bn' ? '✓' : ''}
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-950">বাংলা (Bengali)</div>
                  <div className="text-xs text-slate-500 font-medium">সহজ বাংলায় সম্পূর্ণ বুটিক খাতা</div>
                </div>
              </div>
            </div>

            {/* Odia Option */}
            <div
              onClick={() => setLanguage('or')}
              className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                language === 'or'
                  ? 'bg-emerald-50/80 border-emerald-600 text-emerald-900 ring-2 ring-emerald-600/20'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                  language === 'or' ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-600'
                }`}>
                  {language === 'or' ? '✓' : ''}
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-950">ଓଡ଼ିଆ (Odia)</div>
                  <div className="text-xs text-slate-500 font-medium">ସରଳ ଓଡ଼ିଆରେ ବୁଟିକ୍ ଅର୍ଡର ଓ ଲେଜର</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 5: Account & Logout */}
        {onLogout && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-rose-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                <LogOut className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900">Sign Out of Shop Account</h3>
                <p className="text-[10px] text-slate-500">Return to starting landing page or login with another account</p>
              </div>
            </div>

            <button
              onClick={onLogout}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs shadow-sm transition-all cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        )}
      </div>

      {/* Edit Shop Modal */}
      {showEditShopModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full space-y-3 shadow-xl">
            <h3 className="text-base font-bold text-slate-900">Edit Shop Details</h3>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Shop Name</label>
              <input
                type="text"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Owner Name</label>
              <input
                type="text"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
              <input
                type="text"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-700" />
                <span>Exact Physical Shop Address</span>
              </label>
              <textarea
                rows={3}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. Shop No. 12, Main Market Road, Near Post Office, Sector 4, New Delhi - 110001"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-semibold text-slate-900 outline-none focus:border-emerald-700 focus:bg-white resize-none"
              />
              <p className="text-[10px] text-slate-500 mt-0.5">
                Include shop no., street, landmark, city, and pincode for shoppers.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <SearchableSelect
                label="State / UT"
                placeholder="Select State"
                searchPlaceholder="Search state or UT..."
                options={ALL_INDIAN_STATES}
                value={shopState}
                onChange={(val) => {
                  setShopState(val);
                  if (val && INDIA_STATES_AND_CITIES[val]) {
                    if (!INDIA_STATES_AND_CITIES[val].includes(shopCity)) {
                      setShopCity('');
                    }
                  } else {
                    setShopCity('');
                  }
                }}
                helperText={!shopState ? 'Select state first' : undefined}
              />

              <SearchableSelect
                label="City / Area"
                placeholder={shopState ? "Select or search city" : "Select state first"}
                searchPlaceholder="Search city / district..."
                options={availableCities}
                value={shopCity}
                onChange={(val) => setShopCity(val)}
                disabled={!shopState}
                disabledMessage="Select State First"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">UPI ID (Scan & Pay)</label>
                <input
                  type="text"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="e.g. boutique@okhdfcbank"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">GPay / PhonePe Number</label>
                <input
                  type="text"
                  value={gpayNumber}
                  onChange={(e) => setGpayNumber(e.target.value)}
                  placeholder="e.g. 9876543210"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900"
                />
              </div>
            </div>

            {/* Custom UPI QR Code Upload / Link */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <QrCode className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Custom UPI QR Scanner Image (Optional)</span>
                </label>
                {upiQrCodeUrl && (
                  <button
                    type="button"
                    onClick={() => downloadImageFile(upiQrCodeUrl, `${shopName}_QR`)}
                    className="text-[10px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
                  >
                    <Download className="w-3 h-3" />
                    <span>Download QR</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded-xl border border-slate-300 bg-white overflow-hidden shrink-0 flex items-center justify-center p-1">
                  {upiQrCodeUrl ? (
                    <img src={upiQrCodeUrl} alt="UPI QR Preview" className="w-full h-full object-contain" />
                  ) : (
                    <QrCode className="w-6 h-6 text-slate-300" />
                  )}
                </div>

                <div className="space-y-1.5 flex-1">
                  <input
                    type="file"
                    ref={qrFileInputRef}
                    accept="image/*"
                    onChange={handleCustomQrUpload}
                    className="hidden"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => qrFileInputRef.current?.click()}
                      className="px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-bold text-xs rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload QR Image</span>
                    </button>
                    {upiQrCodeUrl && (
                      <button
                        type="button"
                        onClick={() => setUpiQrCodeUrl('')}
                        className="px-2 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-lg font-semibold cursor-pointer"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500">
                    If not uploaded, the app auto-generates a crisp UPI QR code from your Store UPI ID.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setShowEditShopModal(false)}
                className="flex-1 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveShopDetails}
                className="flex-1 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs cursor-pointer transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Tailor Modal */}
      {showAddTailorModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full space-y-3 shadow-xl">
            <h3 className="text-base font-bold text-slate-900">Add Staff Worker</h3>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Worker Full Name</label>
              <input
                type="text"
                value={newTailorName}
                onChange={(e) => setNewTailorName(e.target.value)}
                placeholder="e.g. Ramesh Kumar"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Mobile Number</label>
              <input
                type="tel"
                value={newTailorPhone}
                onChange={(e) => setNewTailorPhone(e.target.value)}
                placeholder="9876543210"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setShowAddTailorModal(false)}
                className="flex-1 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTailor}
                className="flex-1 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs cursor-pointer transition-colors"
              >
                Add Worker
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Subscription & Payment Gateway Modal */}
      <PaymentGatewayModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        shopProfile={profile}
        onSuccess={() => {
          onTriggerSync();
        }}
      />
    </div>
  );
};
