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
  ChevronRight,
  ChevronDown,
  Headphones,
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
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const handleSyncClick = async () => {
    setIsSyncing(true);
    await onTriggerSync();
    setTimeout(() => setIsSyncing(false), 800);
  };

  // If Not Authenticated or on Auth screen: Render the LandingScreen with pop-in Auth Modal
  if (!isAuthenticated || currentScreen === 'auth') {
    return <div className="min-h-screen bg-[#071D17] text-slate-100 font-sans">{children}</div>;
  }

  // If Authenticated: Render Main Desktop-First SaaS Workspace
  return (
    <div className="min-h-screen bg-[#F4F6F8] text-slate-900 flex flex-col lg:flex-row font-sans selection:bg-[#0B4636] selection:text-white relative">
      
      {/* 1. Desktop Fixed Left Sidebar (260px) */}
      <aside className={`hidden lg:flex ${isSidebarCollapsed ? 'w-20' : 'w-64'} bg-[#072C21] text-white flex-col justify-between shrink-0 shadow-xl border-r border-[#0A3D2F] fixed inset-y-0 left-0 z-40 transition-all duration-200`}>
        <div>
          {/* Shop Brand Header */}
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <BrandLogo size="md" variant="glass" />
              {!isSidebarCollapsed && (
                <div className="min-w-0">
                  <h1 className="text-base font-black tracking-tight leading-none text-white truncate">
                    Shop<span className="text-amber-400">Scopers</span>
                  </h1>
                  <p className="text-[10px] font-bold text-amber-300 uppercase tracking-widest mt-1 truncate">
                    TAILOR MASTER CRM
                  </p>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-slate-200 flex items-center justify-center cursor-pointer transition-colors shrink-0"
              title={isSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
              <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${isSidebarCollapsed ? '' : 'rotate-180'}`} />
            </button>
          </div>

          {/* Compact Shop Profile Card */}
          {!isSidebarCollapsed ? (
            <div 
              onClick={() => onNavigate('profile')}
              className="p-3 mx-3 my-3 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/10 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-amber-400 text-[#072C21] font-black text-xs flex items-center justify-center shrink-0 shadow-sm">
                    {shopProfile.ownerName ? shopProfile.ownerName.slice(0, 2).toUpperCase() : 'SS'}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-black text-white truncate group-hover:text-amber-300 transition-colors">
                      {shopProfile.shopName || 'Royal Tailor'}
                    </div>
                    <div className="text-[11px] text-slate-300 truncate">
                      {shopProfile.ownerName || 'Rohit'} (Master)
                    </div>
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-white shrink-0" />
              </div>

              <div className="inline-flex items-center gap-1.5 mt-2 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Room DB Active</span>
              </div>
            </div>
          ) : (
            <div 
              onClick={() => onNavigate('profile')}
              className="p-2 mx-auto my-3 w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 text-amber-300 font-black text-xs flex items-center justify-center cursor-pointer transition-colors"
              title={`${shopProfile.shopName} (${shopProfile.ownerName})`}
            >
              {shopProfile.ownerName ? shopProfile.ownerName.slice(0, 2).toUpperCase() : 'SS'}
            </div>
          )}

          {/* Navigation Links */}
          <nav className="px-3 space-y-1 mt-2">
            <button
              onClick={() => onNavigate('dashboard')}
              title="Dashboard Overview"
              className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-0' : 'gap-3 px-3.5'} py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                currentScreen === 'dashboard'
                  ? 'bg-amber-400 text-slate-950 font-black shadow-md'
                  : 'text-slate-200 hover:bg-white/10'
              }`}
            >
              <Home className="w-4 h-4 shrink-0" />
              {!isSidebarCollapsed && <span>Dashboard Overview</span>}
            </button>

            <button
              onClick={() => onNavigate('new_order')}
              title="New Order Entry"
              className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-0' : 'gap-3 px-3.5'} py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                currentScreen === 'new_order'
                  ? 'bg-amber-400 text-slate-950 font-black shadow-md'
                  : 'text-slate-200 hover:bg-white/10'
              }`}
            >
              <Plus className="w-4 h-4 stroke-[3] shrink-0" />
              {!isSidebarCollapsed && <span>New Order Entry</span>}
            </button>

            <button
              onClick={() => onNavigate('assign_timeline')}
              title="Worker Capacity & Assign"
              className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-0' : 'gap-3 px-3.5'} py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                currentScreen === 'assign_timeline'
                  ? 'bg-amber-400 text-slate-950 font-black shadow-md'
                  : 'text-slate-200 hover:bg-white/10'
              }`}
            >
              <Scissors className="w-4 h-4 shrink-0" />
              {!isSidebarCollapsed && <span>Worker Capacity & Assign</span>}
            </button>

            <button
              onClick={() => onNavigate('orders')}
              title="Orders Manager"
              className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-0' : 'justify-between px-3.5'} py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                currentScreen === 'orders' || currentScreen === 'overdue'
                  ? 'bg-amber-400 text-slate-950 font-black shadow-md'
                  : 'text-slate-200 hover:bg-white/10'
              }`}
            >
              <div className="flex items-center gap-3">
                <Package className="w-4 h-4 shrink-0" />
                {!isSidebarCollapsed && <span>Orders Manager</span>}
              </div>
              {!isSidebarCollapsed && overdueCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white font-black text-[10px]" title={`${overdueCount} Overdue Orders`}>
                  {overdueCount}
                </span>
              )}
            </button>

            <button
              onClick={() => onNavigate('customers')}
              title="My Customers Hub"
              className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-0' : 'gap-3 px-3.5'} py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                currentScreen === 'customers'
                  ? 'bg-amber-400 text-slate-950 font-black shadow-md'
                  : 'text-slate-200 hover:bg-white/10'
              }`}
            >
              <Users className="w-4 h-4 shrink-0" />
              {!isSidebarCollapsed && <span>My Customers Hub</span>}
            </button>

            <button
              onClick={() => onNavigate('reports')}
              title="Revenue Reports"
              className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-0' : 'gap-3 px-3.5'} py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                currentScreen === 'reports'
                  ? 'bg-amber-400 text-slate-950 font-black shadow-md'
                  : 'text-slate-200 hover:bg-white/10'
              }`}
            >
              <BarChart3 className="w-4 h-4 shrink-0" />
              {!isSidebarCollapsed && <span>Revenue Reports</span>}
            </button>

            <button
              onClick={() => onNavigate('profile')}
              title="Shop Settings"
              className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-0' : 'gap-3 px-3.5'} py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                currentScreen === 'profile'
                  ? 'bg-amber-400 text-slate-950 font-black shadow-md'
                  : 'text-slate-200 hover:bg-white/10'
              }`}
            >
              <SettingsIcon className="w-4 h-4 shrink-0" />
              {!isSidebarCollapsed && <span>Shop Settings</span>}
            </button>
          </nav>
        </div>

        {/* Sidebar Bottom Secondary Controls */}
        <div className="p-3 border-t border-white/10 space-y-1.5">
          <button
            onClick={() => onNavigate('profile')}
            className="w-full py-2 px-3 rounded-xl hover:bg-white/10 text-slate-300 font-medium text-xs flex items-center gap-2 transition-all cursor-pointer"
            title="Help & Support"
          >
            <Headphones className="w-4 h-4 shrink-0 text-slate-400" />
            {!isSidebarCollapsed && <span>Help & Support</span>}
          </button>

          <button
            onClick={onLogout}
            className="w-full py-2 px-3 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer border border-rose-500/30"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4 text-rose-400 shrink-0" />
            {!isSidebarCollapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* 2. Mobile Header Bar - Visible only on Mobile (< lg) */}
      <header className="lg:hidden bg-[#072C21] text-white px-3.5 py-2.5 sticky top-0 z-40 shadow-md flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <BrandLogo size="sm" variant="glass" />
          <div className="flex flex-col min-w-0">
            <h1 className="text-sm font-black text-white leading-tight truncate">{shopProfile.shopName || 'ShopScopers CRM'}</h1>
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
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white rounded-full text-[9px] font-black flex items-center justify-center border border-[#072C21]">
                {overdueCount}
              </span>
            )}
          </button>

          <button
            onClick={() => onNavigate('profile')}
            className="w-8 h-8 rounded-xl bg-amber-400 text-[#072C21] font-black text-xs flex items-center justify-center shadow cursor-pointer border border-amber-300 active:scale-95 transition-transform"
          >
            {shopProfile.ownerName ? shopProfile.ownerName.slice(0, 2).toUpperCase() : 'SS'}
          </button>
        </div>
      </header>

      {/* 3. Main Content Workspace Area */}
      <div className={`flex-1 ${isSidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'} flex flex-col min-w-0 min-h-screen transition-all duration-200`}>
        
        {/* Top Desktop Workspace Header - Sticky on Desktop (>= lg) */}
        <header className="hidden lg:flex bg-white border-b border-slate-200/90 px-6 lg:px-8 py-3.5 items-center justify-between sticky top-0 z-30 shadow-xs">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-black text-slate-900 tracking-tight">
              {currentScreen === 'dashboard' ? 'Shop Dashboard & Orders' : currentScreen.replace(/_/g, ' ')}
            </h2>
            <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
              Web Workspace
            </span>
          </div>

          <div className="flex items-center gap-3.5">
            <button
              onClick={() => onNavigate('new_order')}
              className="px-4 py-2 bg-[#0B4636] hover:bg-[#072C21] text-white rounded-xl text-xs font-black shadow-sm flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>+ New Order</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('orders')}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 relative cursor-pointer transition-colors"
              title="Notifications & Overdue Orders"
            >
              <Bell className="w-4 h-4" />
              {overdueCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white rounded-full text-[9px] font-black flex items-center justify-center">
                  {overdueCount}
                </span>
              )}
            </button>

            <div className="h-6 w-px bg-slate-200" />

            {/* Profile Pill Dropdown */}
            <div 
              onClick={() => onNavigate('profile')}
              className="flex items-center gap-2.5 p-1.5 pr-2.5 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer border border-transparent hover:border-slate-200"
            >
              <div className="w-8 h-8 rounded-xl bg-[#072C21] text-amber-400 font-black text-xs flex items-center justify-center shadow-xs">
                {shopProfile.ownerName ? shopProfile.ownerName.slice(0, 2).toUpperCase() : 'RT'}
              </div>
              <div className="text-left leading-none">
                <div className="text-xs font-black text-slate-900">{shopProfile.shopName || 'Royal Tailor'}</div>
                <div className="text-[10px] text-slate-500 font-medium mt-0.5">{userPhone || '+91 7608807790'}</div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
            </div>
          </div>
        </header>

        {/* Inner Canvas Area (Clean Light Grey Backdrop) */}
        <main className="flex-1 p-3 sm:p-4 md:p-6 lg:p-8 pb-28 lg:pb-8 max-w-7xl w-full mx-auto">
          {children}
        </main>

        {/* Desktop Footer */}
        <footer className="hidden lg:flex bg-slate-100 border-t border-slate-200 px-8 py-3 text-center text-xs text-slate-500 items-center justify-between">
          <div className="flex items-center gap-2 font-medium">
            <Shield className="w-3.5 h-3.5 text-[#0B4636]" />
            <span>ShopScopers Tailor CRM & Ledger</span>
            <span>•</span>
            <span className="text-emerald-700 font-bold">Android Room DB & Cloud Synchronized</span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <button onClick={() => onNavigate('terms')} className="hover:underline">Terms</button>
            <span>•</span>
            <button onClick={() => onNavigate('privacy')} className="hover:underline">Privacy</button>
            <span>•</span>
            <button onClick={() => onNavigate('refund')} className="hover:underline">Refund</button>
          </div>
        </footer>
      </div>

      {/* 4. Mobile Bottom Persistent Navigation Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#072C21] text-white border-t border-emerald-800/80 px-1.5 py-1.5 flex items-center justify-around z-50 shadow-2xl safe-area-bottom">
        <button
          onClick={() => onNavigate('dashboard')}
          className={`flex-1 py-1 px-1 flex flex-col items-center justify-center gap-0.5 rounded-xl transition-all cursor-pointer ${
            currentScreen === 'dashboard'
              ? 'text-amber-300 font-black'
              : 'text-emerald-100/70 hover:text-white'
          }`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px] sm:text-[11px] font-bold">Home</span>
        </button>

        <button
          onClick={() => onNavigate('orders')}
          className={`flex-1 py-1 px-1 flex flex-col items-center justify-center gap-0.5 rounded-xl transition-all cursor-pointer relative ${
            currentScreen === 'orders' || currentScreen === 'overdue'
              ? 'text-amber-300 font-black'
              : 'text-emerald-100/70 hover:text-white'
          }`}
        >
          <Package className="w-5 h-5" />
          {overdueCount > 0 && (
            <span className="absolute 0 top-0 right-2 px-1.5 py-0.2 bg-rose-500 text-white rounded-full text-[9px] font-black border-2 border-[#072C21]">
              {overdueCount}
            </span>
          )}
          <span className="text-[10px] sm:text-[11px] font-bold">Orders</span>
        </button>

        <button
          onClick={() => onNavigate('new_order')}
          className={`flex-1 py-1 px-1 flex flex-col items-center justify-center gap-0.5 rounded-xl transition-all cursor-pointer ${
            currentScreen === 'new_order'
              ? 'text-amber-300 font-black'
              : 'text-emerald-100/70 hover:text-white'
          }`}
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
          <span className="text-[10px] sm:text-[11px] font-bold">New Order</span>
        </button>

        <button
          onClick={() => onNavigate('customers')}
          className={`flex-1 py-1 px-1 flex flex-col items-center justify-center gap-0.5 rounded-xl transition-all cursor-pointer ${
            currentScreen === 'customers'
              ? 'text-amber-300 font-black'
              : 'text-emerald-100/70 hover:text-white'
          }`}
        >
          <Users className="w-5 h-5" />
          <span className="text-[10px] sm:text-[11px] font-bold">Customers</span>
        </button>

        <button
          onClick={() => onNavigate('assign_timeline')}
          className={`flex-1 py-1 px-1 flex flex-col items-center justify-center gap-0.5 rounded-xl transition-all cursor-pointer ${
            currentScreen === 'assign_timeline'
              ? 'text-amber-300 font-black'
              : 'text-emerald-100/70 hover:text-white'
          }`}
        >
          <Scissors className="w-5 h-5" />
          <span className="text-[10px] sm:text-[11px] font-bold">Assign</span>
        </button>
      </div>
    </div>
  );
};
