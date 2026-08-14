import React, { useState } from 'react';
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
  Code2,
  Lock,
  Cloud,
  Smartphone,
  LogOut,
  Share2,
  ExternalLink,
  Trash2,
} from 'lucide-react';
import { ShopProfile, StaffTailor } from '../../types';

interface Screen7ProfileSettingsProps {
  profile: ShopProfile;
  tailors: StaffTailor[];
  onBack: () => void;
  onUpdateProfile: (profile: Partial<ShopProfile>) => void;
  onAddTailor: (name: string, phone: string, role: 'Owner' | 'Tailor') => void;
  onDeleteTailor?: (tailorId: string) => void;
  onTriggerSync: () => Promise<void>;
  onOpenSourceCodeModal: () => void;
  onLogout?: () => void;
  isDesktopView?: boolean;
}

export const Screen7ProfileSettings: React.FC<Screen7ProfileSettingsProps> = ({
  profile,
  tailors,
  onBack,
  onUpdateProfile,
  onAddTailor,
  onDeleteTailor,
  onTriggerSync,
  onOpenSourceCodeModal,
  onLogout,
  isDesktopView = false,
}) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [showEditShopModal, setShowEditShopModal] = useState(false);
  const [showAddTailorModal, setShowAddTailorModal] = useState(false);

  // Edit shop form
  const [shopName, setShopName] = useState(profile.shopName);
  const [ownerName, setOwnerName] = useState(profile.ownerName);
  const [phoneNumber, setPhoneNumber] = useState(profile.phoneNumber);
  const [address, setAddress] = useState(profile.address);
  const [upiId, setUpiId] = useState(profile.upiId);

  // New tailor form
  const [newTailorName, setNewTailorName] = useState('');
  const [newTailorPhone, setNewTailorPhone] = useState('');
  const [newTailorRole, setNewTailorRole] = useState<'Owner' | 'Tailor'>('Tailor');

  const handleSyncClick = async () => {
    setIsSyncing(true);
    await onTriggerSync();
    setIsSyncing(false);
  };

  const handleSaveShopDetails = () => {
    onUpdateProfile({
      shopName,
      ownerName,
      phoneNumber,
      address,
      upiId,
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
    <div className={`min-h-full bg-[#F8F9FA] text-slate-900 font-sans ${isDesktopView ? 'p-6' : 'pb-20'}`}>
      {/* Top Header (Mobile Only) */}
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
              <h1 className="text-base font-extrabold tracking-tight">Shop Profile & Settings</h1>
              <p className="text-[10px] text-amber-300">UPI, Workers, Sync & App Config</p>
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
            className="text-xs font-bold text-slate-600 hover:text-[#0B4636] flex items-center gap-1 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-sm cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </button>

          <button
            onClick={handleSyncClick}
            disabled={isSyncing}
            className="bg-[#0B4636] hover:bg-[#073024] text-amber-300 px-4 py-2 rounded-xl font-black text-xs shadow flex items-center gap-2 cursor-pointer border border-amber-300/30"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-amber-300 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing Firestore...' : 'Sync Cloud DB'}</span>
          </button>
        </div>
      )}

      <div className={`space-y-4 ${isDesktopView ? 'w-full max-w-none' : 'p-4 max-w-2xl mx-auto'}`}>
        {/* Real-time Cloud Sync Banner */}
        <div className="bg-gradient-to-r from-emerald-900 to-[#0B4636] text-white p-4 rounded-2xl shadow-md flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
              <Cloud className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h3 className="text-xs font-extrabold text-white">Room DB Local + Cloud Sync</h3>
              <p className="text-[11px] text-emerald-200">
                Last synced: <span className="font-bold text-amber-300">{profile.lastSyncedTimestamp}</span>
              </p>
            </div>
          </div>

          <button
            onClick={handleSyncClick}
            disabled={isSyncing}
            className="px-3 py-1.5 bg-amber-400 text-[#0B4636] rounded-xl font-extrabold text-xs shadow hover:bg-amber-300 transition-all cursor-pointer"
          >
            Sync Now
          </button>
        </div>

        {/* Section 1: Shop Details Card */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-[#0B4636] uppercase tracking-wider flex items-center gap-1.5">
              <Store className="w-4 h-4" />
              <span>Shop Details</span>
            </h2>

            <button
              onClick={() => setShowEditShopModal(true)}
              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1 cursor-pointer"
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
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Exact Shop Address</span>
                <span className="font-extrabold text-slate-900 block text-xs whitespace-pre-wrap">{profile.address || 'Address not set'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Payment Details & UPI Management */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3">
          <h2 className="text-xs font-bold text-[#0B4636] uppercase tracking-wider flex items-center gap-1.5">
            <QrCode className="w-4 h-4" />
            <span>UPI & Digital Payment Scanner</span>
          </h2>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Store UPI ID</span>
              <span className="text-xs font-extrabold text-slate-900 font-mono">{profile.upiId}</span>
              <p className="text-[10px] text-slate-500">GPay / PhonePe: {profile.gpayPhonePeNumber}</p>
            </div>

            <div className="w-16 h-16 rounded-xl border border-slate-300 overflow-hidden shrink-0 bg-white p-1">
              <img src={profile.upiQrCodeUrl} alt="UPI QR" className="w-full h-full object-contain" />
            </div>
          </div>
        </div>

        {/* Section 3: Staff & Tailors Management */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-[#0B4636] uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-4 h-4" />
              <span>Tailors & Master Staff ({tailors.length})</span>
            </h2>

            <button
              onClick={() => setShowAddTailorModal(true)}
              className="px-2.5 py-1 rounded-lg bg-[#0B4636] text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add Worker</span>
            </button>
          </div>

          <div className="space-y-2">
            {tailors.map((t) => {
              const isOwner = t.role === 'Owner' || t.name.includes('Owner') || t.id === 'tailor-owner';
              return (
                <div
                  key={t.id}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-[#0B4636] text-white font-bold flex items-center justify-center">
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

        {/* Section 4: Android Jetpack Compose Source Code Inspector */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-4 shadow-md space-y-3 border border-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Code2 className="w-5 h-5 text-amber-400" />
              <div>
                <h3 className="text-xs font-bold text-white">Android Jetpack Compose Code</h3>
                <p className="text-[10px] text-slate-400">Kotlin, Room SQLite, WorkManager & Compose Architecture</p>
              </div>
            </div>

            <button
              onClick={onOpenSourceCodeModal}
              className="px-3 py-1.5 bg-amber-400 text-slate-900 rounded-xl font-extrabold text-xs shadow hover:bg-amber-300 transition-all cursor-pointer"
            >
              View Source Code
            </button>
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
                <MapPin className="w-3.5 h-3.5 text-[#0B4636]" />
                <span>Exact Physical Shop Address</span>
              </label>
              <textarea
                rows={3}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. Shop No. 12, Main Market Road, Near Post Office, Sector 4, New Delhi - 110001"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-semibold text-slate-900 outline-none focus:border-[#0B4636] focus:bg-white resize-none"
              />
              <p className="text-[10px] text-slate-500 mt-0.5">
                Include shop no., street, landmark, city, and pincode for shoppers.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">UPI ID (Scan & Pay)</label>
              <input
                type="text"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="e.g. shopname@okicici"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setShowEditShopModal(false)}
                className="flex-1 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveShopDetails}
                className="flex-1 py-2 rounded-xl bg-[#0B4636] text-white font-bold text-xs"
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
                className="flex-1 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTailor}
                className="flex-1 py-2 rounded-xl bg-[#0B4636] text-white font-bold text-xs"
              >
                Add Worker
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
