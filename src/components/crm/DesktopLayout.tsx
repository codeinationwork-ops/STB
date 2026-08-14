import React, { useState } from 'react';
import {
  Scissors,
  Home,
  Bell,
  Plus,
  BarChart3,
  Settings as SettingsIcon,
  Shield,
  Smartphone,
  LogOut,
  Code2,
  CheckCircle2,
  Search,
  Sparkles,
  Users,
  Clock,
  Layers,
  Cloud,
  FileSpreadsheet,
  Monitor,
  Zap,
  Package,
} from 'lucide-react';
import { TailorOrder, ShopProfile, StaffTailor, RevenueAnalytics } from '../../types';
import { AuthSuitePage } from './AuthSuitePage';
import { BrandLogo } from './BrandLogo';

interface DesktopLayoutProps {
  isAuthenticated: boolean;
  userPhone: string;
  shopProfile: ShopProfile;
  currentScreen: string;
  overdueCount: number;
  onNavigate: (screen: any) => void;
  onAuthSuccess: (phone: string, shopDetails?: { shopName: string; ownerName: string }) => void;
  onLogout: () => void;
  onTriggerSync: () => Promise<void>;
  onOpenCodeModal: () => void;
  children: React.ReactNode;
}

export const DesktopLayout: React.FC<DesktopLayoutProps> = ({
  isAuthenticated,
  userPhone,
  shopProfile,
  currentScreen,
  overdueCount,
  onNavigate,
  onAuthSuccess,
  onLogout,
  onTriggerSync,
  onOpenCodeModal,
  children,
}) => {
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSyncClick = async () => {
    setIsSyncing(true);
    await onTriggerSync();
    setTimeout(() => setIsSyncing(false), 800);
  };

  // If Not Authenticated or on Auth screen: Render the LandingScreen with pop-in Auth Modal
  if (!isAuthenticated || currentScreen === 'auth') {
    return <div className="min-h-screen bg-[#071D17] text-slate-100 font-sans">{children}</div>;
  }

  // If Authenticated: Render Main Responsive Workspace
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col lg:flex-row font-sans selection:bg-[#0B4636] selection:text-white relative">
      
      {/* 1. Desktop Fixed Left Sidebar (260px) - Hidden on Mobile */}
      <aside className="hidden lg:flex w-64 bg-[#0B4636] text-white flex-col justify-between shrink-0 shadow-2xl border-r border-[#083529] fixed inset-y-0 left-0 z-40">
        <div>
          {/* Shop Brand Header */}
          <div className="p-5 border-b border-white/10 flex items-center gap-3">
            <BrandLogo size="md" variant="glass" />
            <div>
              <h1 className="text-base font-black tracking-tight leading-none text-white">Silai<span className="text-amber-400">Hub</span></h1>
              <p className="text-[10px] font-bold text-amber-300 uppercase tracking-widest mt-1">
                Tailor Master CRM
              </p>
            </div>
          </div>

          {/* Active Shop Profile Info Card */}
          <div className="p-4 mx-3 my-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15">
            <div className="text-xs font-black text-white truncate">{shopProfile.shopName}</div>
            <div className="text-[11px] text-amber-200 truncate mt-0.5">{shopProfile.ownerName} (Master)</div>
            <div className="inline-flex items-center gap-1.5 mt-2 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-extrabold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Room DB Active</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="px-3 space-y-1 mt-2">
            <button
              onClick={() => onNavigate('dashboard')}
              className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl font-extrabold text-xs transition-all cursor-pointer ${
                currentScreen === 'dashboard'
                  ? 'bg-amber-400 text-slate-950 shadow-md'
                  : 'text-slate-200 hover:bg-white/10'
              }`}
            >
              <Home className="w-4 h-4" />
              <span>Dashboard Overview</span>
            </button>

            <button
              onClick={() => onNavigate('new_order')}
              className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl font-extrabold text-xs transition-all cursor-pointer ${
                currentScreen === 'new_order'
                  ? 'bg-amber-400 text-slate-950 shadow-md'
                  : 'text-slate-200 hover:bg-white/10'
              }`}
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>New Order Entry</span>
            </button>

            <button
              onClick={() => onNavigate('assign_timeline')}
              className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl font-extrabold text-xs transition-all cursor-pointer ${
                currentScreen === 'assign_timeline'
                  ? 'bg-amber-400 text-slate-950 shadow-md'
                  : 'text-slate-200 hover:bg-white/10'
              }`}
            >
              <Scissors className="w-4 h-4" />
              <span>Worker Capacity & Assign</span>
            </button>

            <button
              onClick={() => onNavigate('orders')}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl font-extrabold text-xs transition-all cursor-pointer ${
                currentScreen === 'orders' || currentScreen === 'overdue'
                  ? 'bg-amber-400 text-slate-950 shadow-md'
                  : 'text-slate-200 hover:bg-white/10'
              }`}
            >
              <div className="flex items-center gap-3">
                <Package className="w-4 h-4" />
                <span>Orders Manager</span>
              </div>
              {overdueCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white font-black text-[10px]" title={`${overdueCount} Overdue Orders`}>
                  {overdueCount}
                </span>
              )}
            </button>

            <button
              onClick={() => onNavigate('customers')}
              className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl font-extrabold text-xs transition-all cursor-pointer ${
                currentScreen === 'customers'
                  ? 'bg-amber-400 text-slate-950 shadow-md'
                  : 'text-slate-200 hover:bg-white/10'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>My Customers Hub</span>
            </button>

            <button
              onClick={() => onNavigate('reports')}
              className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl font-extrabold text-xs transition-all cursor-pointer ${
                currentScreen === 'reports'
                  ? 'bg-amber-400 text-slate-950 shadow-md'
                  : 'text-slate-200 hover:bg-white/10'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Revenue Reports</span>
            </button>

            <button
              onClick={() => onNavigate('profile')}
              className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl font-extrabold text-xs transition-all cursor-pointer ${
                currentScreen === 'profile'
                  ? 'bg-amber-400 text-slate-950 shadow-md'
                  : 'text-slate-200 hover:bg-white/10'
              }`}
            >
              <SettingsIcon className="w-4 h-4" />
              <span>Shop Settings</span>
            </button>
          </nav>
        </div>

        {/* Sidebar Footer Controls */}
        <div className="p-3 border-t border-white/10 space-y-2">
          <button
            onClick={handleSyncClick}
            disabled={isSyncing}
            className="w-full py-2 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 font-bold text-xs flex items-center justify-between transition-all cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Cloud className={`w-4 h-4 text-emerald-300 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing Firestore...' : 'Sync Cloud DB'}</span>
            </div>
            <span className="text-[10px] text-amber-300 font-mono">Sync</span>
          </button>

          <button
            onClick={onOpenCodeModal}
            className="w-full py-2 px-3 rounded-xl bg-amber-400/20 text-amber-300 font-extrabold text-xs flex items-center gap-2 hover:bg-amber-400/30 transition-all cursor-pointer border border-amber-300/30"
          >
            <Code2 className="w-4 h-4" />
            <span>Android Code Inspector</span>
          </button>

          <button
            onClick={onLogout}
            className="w-full py-2 px-3 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer border border-rose-500/30"
          >
            <LogOut className="w-4 h-4 text-rose-400" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* 2. Mobile Header Bar - Visible only on Mobile (< lg) */}
      <header className="lg:hidden bg-[#0B4636] text-white px-3.5 py-2.5 sticky top-0 z-40 shadow-md flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <BrandLogo size="sm" variant="glass" />
          <div className="flex flex-col min-w-0">
            <h1 className="text-sm font-black text-white leading-tight truncate">{shopProfile.shopName || 'SilaiHub CRM'}</h1>
            <p className="text-[10px] text-amber-300 font-semibold truncate">{userPhone || shopProfile.ownerName || 'Active Session'}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onNavigate('orders')}
            className="p-2 rounded-xl bg-white/10 text-white relative cursor-pointer hover:bg-white/20 transition-all active:scale-95"
            title="Orders & Deliveries"
          >
            <Package className="w-4 h-4" />
            {overdueCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white rounded-full text-[9px] font-black flex items-center justify-center border border-[#0B4636]">
                {overdueCount}
              </span>
            )}
          </button>

          <button
            onClick={() => onNavigate('profile')}
            className="w-8 h-8 rounded-xl bg-amber-400 text-[#0B4636] font-black text-xs flex items-center justify-center shadow cursor-pointer border border-amber-300 active:scale-95 transition-transform"
          >
            {shopProfile.ownerName ? shopProfile.ownerName.slice(0, 2).toUpperCase() : 'ST'}
          </button>
        </div>
      </header>

      {/* 3. Main Content Workspace Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0 min-h-screen">
        
        {/* Top Desktop Workspace Header - Visible only on Desktop (>= lg) */}
        <header className="hidden lg:flex bg-white border-b border-slate-200 px-8 py-3.5 items-center justify-between sticky top-0 z-30 shadow-sm">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-black text-slate-900 capitalize">
              {currentScreen === 'dashboard' ? 'Shop Dashboard & Orders' : currentScreen.replace('_', ' ')}
            </h2>
            <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
              Web Workspace
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('new_order')}
              className="px-4 py-2 bg-[#0B4636] hover:bg-[#073024] text-white rounded-xl text-xs font-extrabold shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>+ New Order</span>
            </button>

            <div className="h-6 w-px bg-slate-200" />

            <div className="flex items-center gap-2">
              <BrandLogo size="xs" variant="dark" />
              <div className="text-xs">
                <div className="font-extrabold text-slate-900">{shopProfile.shopName}</div>
                <div className="text-[10px] text-slate-500">{userPhone}</div>
              </div>
            </div>
          </div>
        </header>

        {/* Inner Responsive Content Area */}
        <main className="flex-1 p-2 sm:p-3 md:p-6 pb-28 lg:pb-6 max-w-7xl w-full mx-auto">
          <div className="bg-white rounded-2xl md:rounded-3xl shadow-sm border border-slate-200/80 overflow-hidden min-h-[500px] md:min-h-[750px] p-2 sm:p-3 md:p-4">
            {children}
          </div>
        </main>

        {/* Desktop Footer */}
        <footer className="hidden lg:flex bg-slate-200/60 border-t border-slate-300 px-8 py-3 text-center text-xs text-slate-600 items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-3.5 h-3.5 text-[#0B4636]" />
            <span>Encrypted Tailor CRM • Room Local DB Active</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => onNavigate('terms')} className="hover:underline">Terms</button>
            <span>•</span>
            <button onClick={() => onNavigate('privacy')} className="hover:underline">Privacy</button>
            <span>•</span>
            <button onClick={() => onNavigate('refund')} className="hover:underline">Refund</button>
          </div>
        </footer>
      </div>

      {/* 4. Mobile Bottom Persistent Navigation Bar - Google Material 3 / Non-Tech 30-50+ Optimized */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#0B4636] text-white border-t border-emerald-800/80 px-2 py-1.5 flex items-center justify-around z-50 shadow-2xl safe-area-bottom">
        {/* 1. Dashboard */}
        <button
          onClick={() => onNavigate('dashboard')}
          className={`flex-1 py-1 px-1 flex flex-col items-center justify-center gap-0.5 rounded-xl transition-all cursor-pointer ${
            currentScreen === 'dashboard'
              ? 'text-amber-300 font-black scale-105'
              : 'text-emerald-100/70 hover:text-white'
          }`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[11px] font-bold">Home</span>
        </button>

        {/* 2. Orders */}
        <button
          onClick={() => onNavigate('orders')}
          className={`flex-1 py-1 px-1 flex flex-col items-center justify-center gap-0.5 rounded-xl transition-all cursor-pointer relative ${
            currentScreen === 'orders' || currentScreen === 'overdue'
              ? 'text-amber-300 font-black scale-105'
              : 'text-emerald-100/70 hover:text-white'
          }`}
        >
          <Package className="w-5 h-5" />
          {overdueCount > 0 && (
            <span className="absolute 0 top-0 right-3 px-1.5 py-0.2 bg-rose-500 text-white rounded-full text-[9px] font-black border-2 border-[#0B4636]">
              {overdueCount}
            </span>
          )}
          <span className="text-[11px] font-bold">Orders</span>
        </button>

        {/* 3. BIG ELEVATED CENTER NEW ORDER BUTTON (Thumb-Friendly for 30-50+ Users) */}
        <div className="relative -top-4 flex flex-col items-center px-1">
          <button
            onClick={() => onNavigate('new_order')}
            className="w-14 h-14 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-950 flex items-center justify-center shadow-lg shadow-amber-400/40 border-4 border-[#071D17] active:scale-95 transition-all cursor-pointer group"
            title="Create New Order (नया ऑर्डर)"
          >
            <Plus className="w-7 h-7 stroke-[3] text-slate-950 group-hover:rotate-90 transition-transform duration-200" />
          </button>
          <span className="text-[10px] font-black text-amber-300 mt-0.5 tracking-tight">
            + New Order
          </span>
        </div>

        {/* 4. Customers */}
        <button
          onClick={() => onNavigate('customers')}
          className={`flex-1 py-1 px-1 flex flex-col items-center justify-center gap-0.5 rounded-xl transition-all cursor-pointer ${
            currentScreen === 'customers'
              ? 'text-amber-300 font-black scale-105'
              : 'text-emerald-100/70 hover:text-white'
          }`}
        >
          <Users className="w-5 h-5" />
          <span className="text-[11px] font-bold">Customers</span>
        </button>

        {/* 5. Assign & Timeline */}
        <button
          onClick={() => onNavigate('assign_timeline')}
          className={`flex-1 py-1 px-1 flex flex-col items-center justify-center gap-0.5 rounded-xl transition-all cursor-pointer ${
            currentScreen === 'assign_timeline'
              ? 'text-amber-300 font-black scale-105'
              : 'text-emerald-100/70 hover:text-white'
          }`}
        >
          <Scissors className="w-5 h-5" />
          <span className="text-[11px] font-bold">Assign</span>
        </button>

        {/* 6. Settings / More */}
        <button
          onClick={() => onNavigate('profile')}
          className={`flex-1 py-1 px-1 flex flex-col items-center justify-center gap-0.5 rounded-xl transition-all cursor-pointer ${
            currentScreen === 'profile' || currentScreen === 'reports'
              ? 'text-amber-300 font-black scale-105'
              : 'text-emerald-100/70 hover:text-white'
          }`}
        >
          <SettingsIcon className="w-5 h-5" />
          <span className="text-[11px] font-bold">Shop</span>
        </button>
      </div>
    </div>
  );
};
