import React, { useState, useMemo } from 'react';
import {
  Store,
  Search,
  Filter,
  Plus,
  Phone,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  MoreVertical,
  ExternalLink,
  Shield,
  CreditCard,
  Scissors,
  DollarSign,
  Users,
  Download,
  Check,
  Edit2,
  X,
  QrCode,
  Trash2,
  Loader2,
} from 'lucide-react';
import { PlatformShop } from '../../../types';
import { AdminPlatformService } from '../../../lib/adminPlatformData';
import { clean10DigitPhone, getWhatsAppUrl } from '../../../lib/phoneUtils';
import { ShopScoperScanCode } from '../../crm/ShopScoperScanCode';
import { roomDb } from '../../../lib/localRoomDb';

interface AdminShopsViewProps {
  shops: PlatformShop[];
  onUpdateShops: (shops: PlatformShop[]) => void;
}

export const AdminShopsView: React.FC<AdminShopsViewProps> = ({ shops, onUpdateShops }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Active' | 'Pending Verification' | 'Suspended'>('ALL');
  const [planFilter, setPlanFilter] = useState<'ALL' | 'Starter Free' | 'Pro Multi-Device' | 'Boutique Enterprise'>('ALL');

  // Selected shop for drawer/modal
  const [selectedShop, setSelectedShop] = useState<PlatformShop | null>(null);

  // Delete modal state
  const [deleteModalShop, setDeleteModalShop] = useState<PlatformShop | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  // Add Shop Modal State
  const [showAddShopModal, setShowAddShopModal] = useState(false);
  const [newShopName, setNewShopName] = useState('');
  const [newOwnerName, setNewOwnerName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newCity, setNewCity] = useState('Bhubaneswar');
  const [newState, setNewState] = useState('Odisha');
  const [newPlan, setNewPlan] = useState<PlatformShop['planTier']>('Pro Multi-Device');

  const triggerToast = (msg: string) => {
    setActionSuccessMessage(msg);
    setTimeout(() => setActionSuccessMessage(null), 4000);
  };

  const filteredShops = useMemo(() => {
    return shops.filter((shop) => {
      const q = (searchQuery || '').toLowerCase();
      const matchSearch =
        !q ||
        Boolean(shop.shopName && typeof shop.shopName === 'string' && shop.shopName.toLowerCase().includes(q)) ||
        Boolean(shop.ownerName && typeof shop.ownerName === 'string' && shop.ownerName.toLowerCase().includes(q)) ||
        Boolean(shop.phoneNumber && typeof shop.phoneNumber === 'string' && shop.phoneNumber.includes(searchQuery)) ||
        Boolean(shop.city && typeof shop.city === 'string' && shop.city.toLowerCase().includes(q));

      const matchStatus = statusFilter === 'ALL' || shop.status === statusFilter;
      const matchPlan = planFilter === 'ALL' || shop.planTier === planFilter;

      return matchSearch && matchStatus && matchPlan;
    });
  }, [shops, searchQuery, statusFilter, planFilter]);

  const handleStatusChange = (shopId: string, status: PlatformShop['status']) => {
    const updated = AdminPlatformService.updateShopStatus(shopId, status);
    onUpdateShops(updated);
    if (selectedShop && selectedShop.id === shopId) {
      setSelectedShop({ ...selectedShop, status });
    }
  };

  const handlePlanChange = (shopId: string, planTier: PlatformShop['planTier']) => {
    const updated = AdminPlatformService.updateShopPlan(shopId, planTier);
    onUpdateShops(updated);
    if (selectedShop && selectedShop.id === shopId) {
      setSelectedShop({ ...selectedShop, planTier });
    }
  };

  const handleCreateShop = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShopName || !newPhone) return;

    const newShop: PlatformShop = {
      id: `shop-${Date.now()}`,
      shopName: newShopName.trim(),
      ownerName: newOwnerName.trim() || 'Shop Owner',
      phoneNumber: newPhone.trim(),
      city: newCity,
      state: newState,
      planTier: newPlan,
      status: 'Active',
      isVerified: true,
      verificationStatus: 'verified',
      totalOrders: 0,
      grossRevenue: 0,
      activeKarigarsCount: 1,
      lastActive: 'Just registered',
      createdAt: new Date().toISOString(),
    };

    const updated = [newShop, ...shops];
    AdminPlatformService.saveShops(updated);
    onUpdateShops(updated);
    setShowAddShopModal(false);
    setNewShopName('');
    setNewOwnerName('');
    setNewPhone('');
    triggerToast(`🎉 New boutique "${newShop.shopName}" onboarded.`);
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

      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Store className="w-6 h-6 text-emerald-800" />
            <span>Boutique Directory</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 font-bold border border-emerald-300">
              {filteredShops.length} Registered
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Real-time multi-tenant management for all registered boutique tailoring studios.
          </p>
        </div>

        <button
          onClick={() => setShowAddShopModal(true)}
          className="px-4 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Onboard Boutique</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search boutique name, owner, phone, city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-700 text-slate-900"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-700 focus:outline-hidden"
            >
              <option value="ALL">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Pending Verification">Pending Verification</option>
              <option value="Suspended">Suspended</option>
            </select>

            {/* Plan Tier Filter */}
            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value as any)}
              className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-700 focus:outline-hidden"
            >
              <option value="ALL">All Plan Tiers</option>
              <option value="Starter Free">Starter Free</option>
              <option value="Pro Multi-Device">Pro Multi-Device</option>
              <option value="Boutique Enterprise">Boutique Enterprise</option>
            </select>
          </div>
        </div>
      </div>

      {/* Boutique Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredShops.map((shop) => {
          const cleanPhone = clean10DigitPhone(shop.phoneNumber);
          const whatsappUrl = getWhatsAppUrl(
            cleanPhone,
            `Hello ${shop.ownerName || 'Boutique Owner'}! This is the ShopScopers Super Admin reaching out regarding *${shop.shopName}*.`
          );

          return (
            <div
              key={shop.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                {/* Header info */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider mb-1.5 ${
                        shop.status === 'Active'
                          ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                          : shop.status === 'Suspended'
                          ? 'bg-rose-100 text-rose-800 border border-rose-300'
                          : 'bg-amber-100 text-amber-900 border border-amber-300'
                      }`}
                    >
                      {shop.status === 'Active' && <CheckCircle2 className="w-3 h-3" />}
                      {shop.status === 'Suspended' && <XCircle className="w-3 h-3" />}
                      {shop.status === 'Pending Verification' && <Clock className="w-3 h-3" />}
                      <span>{shop.status}</span>
                    </span>
                    <h3 className="font-bold text-base text-slate-900 leading-tight">{shop.shopName}</h3>
                    <p className="text-xs text-slate-500 font-medium">Owner: {shop.ownerName}</p>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 block border border-slate-200">
                      {shop.planTier}
                    </span>
                  </div>
                </div>

                {/* Info row */}
                <div className="space-y-1.5 text-xs text-slate-600 my-3">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{shop.phoneNumber}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      {shop.city}, {shop.state}
                    </span>
                  </div>
                </div>

                {/* Metrics ribbon */}
                <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-center my-3">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Orders</span>
                    <span className="font-black text-slate-900 text-sm">{shop.totalOrders}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Revenue</span>
                    <span className="font-black text-emerald-800 text-sm">
                      ₹{shop.grossRevenue.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Karigars</span>
                    <span className="font-black text-slate-900 text-sm">{shop.activeKarigarsCount}</span>
                  </div>
                </div>
              </div>

              {/* Action Bar */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center gap-1.5 transition-colors shrink-0"
                >
                  <Phone className="w-3 h-3" />
                  <span>WhatsApp</span>
                </a>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setSelectedShop(shop)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs transition-colors cursor-pointer"
                  >
                    Manage
                  </button>

                  <button
                    onClick={() => setDeleteModalShop(shop)}
                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 border border-slate-200 transition-colors cursor-pointer"
                    title="Delete Boutique Store & Data"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Shop Details / Management Modal Drawer */}
      {selectedShop && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 bg-emerald-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">{selectedShop.shopName}</h3>
                <p className="text-xs text-emerald-200 mt-0.5">Tenant Administration & Access Controls</p>
              </div>
              <button
                onClick={() => setSelectedShop(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-700">
              {/* Status Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-2">Shop Operational Status</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Active', 'Pending Verification', 'Suspended'] as const).map((st) => (
                    <button
                      key={st}
                      onClick={() => handleStatusChange(selectedShop.id, st)}
                      className={`p-2.5 rounded-xl font-bold text-xs border text-center transition-all cursor-pointer ${
                        selectedShop.status === st
                          ? 'bg-emerald-800 text-white border-emerald-800 shadow-xs'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Plan Tier Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-2">Subscription & Cloud Tier</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Starter Free', 'Pro Multi-Device', 'Boutique Enterprise'] as const).map((tier) => (
                    <button
                      key={tier}
                      onClick={() => handlePlanChange(selectedShop.id, tier)}
                      className={`p-2.5 rounded-xl font-bold text-xs border text-center transition-all cursor-pointer ${
                        selectedShop.planTier === tier
                          ? 'bg-emerald-700 text-white border-emerald-800 shadow-xs'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {tier}
                    </button>
                  ))}
                </div>
              </div>

              {/* Shop info summary */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Shop ID:</span>
                  <span className="font-mono font-bold text-slate-800">{selectedShop.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Owner Contact:</span>
                  <span className="font-bold text-slate-800">
                    {selectedShop.ownerName} ({selectedShop.phoneNumber})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">UPI ID:</span>
                  <span className="font-mono text-slate-800">{selectedShop.upiId || 'Not set'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Address:</span>
                  <span className="text-slate-800 text-right max-w-xs">
                    {selectedShop.address || `${selectedShop.city}, ${selectedShop.state}`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Onboarded:</span>
                  <span className="text-slate-800">{new Date(selectedShop.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Unique ShopScoper ScanCode & Inventory Viewer for this Boutique */}
              <div className="pt-2">
                <ShopScoperScanCode shop={selectedShop} inventory={roomDb.getInventory()} />
              </div>
            </div>

            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                onClick={() => setDeleteModalShop(selectedShop)}
                className="px-3.5 py-2 rounded-xl text-rose-600 hover:bg-rose-50 font-bold text-xs border border-rose-200 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Store Data</span>
              </button>

              <button
                onClick={() => setSelectedShop(null)}
                className="px-4 py-2 rounded-xl bg-emerald-700 text-white font-bold text-xs cursor-pointer hover:bg-emerald-800 transition-colors"
              >
                Close & Save Changes
              </button>
            </div>
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

      {/* Onboard New Shop Modal */}
      {showAddShopModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-emerald-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">Onboard New Boutique</h3>
                <p className="text-xs text-emerald-200 mt-0.5">Register a tenant tailor shop onto the platform</p>
              </div>
              <button
                onClick={() => setShowAddShopModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateShop} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-800 mb-1">Shop / Boutique Name *</label>
                <input
                  type="text"
                  value={newShopName}
                  onChange={(e) => setNewShopName(e.target.value)}
                  placeholder="e.g. Royal Tailor & Boutique"
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-700 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">Owner Name</label>
                <input
                  type="text"
                  value={newOwnerName}
                  onChange={(e) => setNewOwnerName(e.target.value)}
                  placeholder="e.g. Master Shabbir"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-700 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">Owner Mobile Phone *</label>
                <input
                  type="tel"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-700 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">City</label>
                  <input
                    type="text"
                    value={newCity}
                    onChange={(e) => setNewCity(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-700 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-800 mb-1">State</label>
                  <input
                    type="text"
                    value={newState}
                    onChange={(e) => setNewState(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-700 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">Cloud Plan Tier</label>
                <select
                  value={newPlan}
                  onChange={(e) => setNewPlan(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-700 focus:outline-hidden"
                >
                  <option value="Starter Free">Starter Free</option>
                  <option value="Pro Multi-Device">Pro Multi-Device (Recommended)</option>
                  <option value="Boutique Enterprise">Boutique Enterprise</option>
                </select>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddShopModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-700 text-white font-bold hover:bg-emerald-800 cursor-pointer transition-colors"
                >
                  Confirm Registration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
