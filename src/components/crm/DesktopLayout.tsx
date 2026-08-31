import React, { useState, useEffect } from 'react';
import {
  Scissors,
  Home,
  Plus,
  BarChart3,
  Settings as SettingsIcon,
  Shield,
  Smartphone,
  LogOut,
  Code2,
  CheckCircle2,
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
  ShoppingBag,
  Calendar,
  DollarSign,
  Globe,
  Boxes,
  Crown,
  AlertTriangle,
  CreditCard,
} from 'lucide-react';
import { TailorOrder, ShopProfile, StaffTailor, RevenueAnalytics, BoutiqueSubscription } from '../../types';
import { AuthSuitePage } from './AuthSuitePage';
import { BrandLogo } from './BrandLogo';
import { useLanguage } from '../../lib/LanguageContext';
import { getSubscriptionStatus } from '../../lib/subscriptionUtils';
import { SubscriptionService } from '../../lib/subscriptionService';
import { PaymentGatewayModal } from './PaymentGatewayModal';

interface DesktopLayoutProps {
  isAuthenticated: boolean;
  userPhone: string;
  shopProfile: ShopProfile;
  currentScreen: string;
  overdueCount: number;
  todayAppointmentCount?: number;
  lowStockCount?: number;
  onNavigate: (screen: any) => void;
  onAuthSuccess: (phone: string, shopDetails?: { shopName: string; ownerName: string }) => void;
  onLogout: () => void;
  onTriggerSync: () => Promise<void>;
  onNewStitchClick?: () => void;
  onNewAlterClick?: () => void;
  onNewSaleClick?: () => void;
  onNewAppointmentClick?: () => void;
  children: React.ReactNode;
}

export const DesktopLayout: React.FC<DesktopLayoutProps> = ({
  isAuthenticated,
  userPhone,
  shopProfile,
  currentScreen,
  overdueCount,
  todayAppointmentCount = 0,
  lowStockCount = 0,
  onNavigate,
  onAuthSuccess,
  onLogout,
  onTriggerSync,
  onNewStitchClick,
  onNewAlterClick,
  onNewSaleClick,
  onNewAppointmentClick,
  children,
}) => {
  const { language, setLanguage, isHindi, t } = useLanguage();
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradePlan, setUpgradePlan] = useState<'monthly' | 'annual'>('annual');
  const [subscriptionDoc, setSubscriptionDoc] = useState<BoutiqueSubscription | null>(null);

  const boutiqueId = (shopProfile as any).id || (shopProfile as any).boutiqueId || shopProfile.phoneNumber || 'boutique_main';

  useEffect(() => {
    if (!boutiqueId) return;
    const unsub = SubscriptionService.subscribeToBoutiqueSubscription(boutiqueId, (sub) => {
      setSubscriptionDoc(sub);
    });
    return () => unsub();
  }, [boutiqueId]);

  const subscription = getSubscriptionStatus(shopProfile, subscriptionDoc);

  const handleSyncClick = async () => {
    setIsSyncing(true);
    await onTriggerSync();
    setTimeout(() => setIsSyncing(false), 800);
  };

  // If Not Authenticated or on Auth screen, Customer Portal, or Public Live Catalogue: Render standalone page without shop management sidebar
  if (!isAuthenticated || currentScreen === 'auth' || currentScreen === 'customer_portal' || currentScreen === 'public_catalogue') {
    return <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col lg:flex-row font-sans selection:bg-emerald-600 selection:text-white relative">
      
      {/* 1. Desktop Fixed Left Sidebar (Workspace Style) */}
      <aside className={`hidden lg:flex ${isSidebarCollapsed ? 'w-[72px]' : 'w-64'} bg-white text-slate-800 flex-col justify-between shrink-0 border-r border-slate-200 fixed inset-y-0 left-0 z-40 transition-all duration-200 shadow-2xs`}>
        <div>
          {/* Shop / Workspace Header */}
          <div className="p-3.5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-emerald-700 text-white font-bold flex items-center justify-center text-sm shadow-xs shrink-0">
                <Scissors className="w-4 h-4" />
              </div>
              {!isSidebarCollapsed && (
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h1 className="text-sm font-bold text-slate-900 truncate">
                      {shopProfile.shopName || 'ShopScopers'}
                    </h1>
                  </div>
                  <p className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wider truncate">
                    Boutique Workspace
                  </p>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="w-6 h-6 rounded-md hover:bg-slate-100 text-slate-500 flex items-center justify-center cursor-pointer transition-colors shrink-0"
              title={isSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
              <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-200 ${isSidebarCollapsed ? '' : 'rotate-180'}`} />
            </button>
          </div>

          {/* Compact Shop Profile Card */}
          {!isSidebarCollapsed ? (
            <div 
              onClick={() => onNavigate('profile')}
              className="p-2.5 mx-2.5 my-2.5 rounded-lg bg-slate-50 hover:bg-emerald-50/50 border border-slate-200 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 rounded-full bg-emerald-700 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                    {shopProfile.ownerName ? shopProfile.ownerName.slice(0, 2).toUpperCase() : 'SS'}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 truncate">
                      {shopProfile.ownerName || 'Boutique Owner'}
                    </div>
                    <div className="text-[10px] text-slate-500 truncate">
                      {shopProfile.shopName || 'Main Studio'}
                    </div>
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 shrink-0" />
              </div>
            </div>
          ) : (
            <div 
              onClick={() => onNavigate('profile')}
              className="p-1.5 mx-auto my-2.5 w-8 h-8 rounded-full bg-emerald-700 text-white font-bold text-xs flex items-center justify-center cursor-pointer shadow-2xs"
              title={`${shopProfile.shopName} (${shopProfile.ownerName})`}
            >
              {shopProfile.ownerName ? shopProfile.ownerName.slice(0, 2).toUpperCase() : 'SS'}
            </div>
          )}

          {/* Navigation Links */}
          <nav className="px-2 space-y-1 mt-1">
            <button
              onClick={() => onNavigate('dashboard')}
              title="Dashboard"
              className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-0' : 'gap-2.5 px-3'} py-2 rounded-lg font-semibold text-xs transition-all cursor-pointer ${
                currentScreen === 'dashboard'
                  ? 'bg-emerald-50 text-emerald-800 font-bold border border-emerald-200 shadow-2xs'
                  : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Home className={`w-4 h-4 shrink-0 ${currentScreen === 'dashboard' ? 'text-emerald-700' : 'text-slate-500'}`} />
              {!isSidebarCollapsed && <span>{t('nav.dashboard', 'Main Dashboard')}</span>}
            </button>

            <button
              onClick={() => onNavigate('orders')}
              title="Orders Board"
              className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-0' : 'justify-between px-3'} py-2 rounded-lg font-semibold text-xs transition-all cursor-pointer ${
                currentScreen === 'orders' || currentScreen === 'overdue'
                  ? 'bg-emerald-50 text-emerald-800 font-bold border border-emerald-200 shadow-2xs'
                  : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Package className={`w-4 h-4 shrink-0 ${currentScreen === 'orders' || currentScreen === 'overdue' ? 'text-emerald-700' : 'text-slate-500'}`} />
                {!isSidebarCollapsed && <span>{t('nav.orders', 'Orders & Stitching Board')}</span>}
              </div>
              {!isSidebarCollapsed && overdueCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white font-bold text-[9px]" title={`${overdueCount} Overdue Orders`}>
                  {overdueCount}
                </span>
              )}
            </button>

            <button
              onClick={() => onNavigate('appointments')}
              title="Appointments & Visits"
              className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-0' : 'justify-between px-3'} py-2 rounded-lg font-semibold text-xs transition-all cursor-pointer ${
                currentScreen === 'appointments'
                  ? 'bg-emerald-50 text-emerald-800 font-bold border border-emerald-200 shadow-2xs'
                  : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Calendar className={`w-4 h-4 shrink-0 ${currentScreen === 'appointments' ? 'text-emerald-700' : 'text-slate-500'}`} />
                {!isSidebarCollapsed && <span>{t('nav.appointments', 'Appointments & Trials')}</span>}
              </div>
              {!isSidebarCollapsed && todayAppointmentCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-white font-bold text-[9px]" title={`${todayAppointmentCount} Today`}>
                  {todayAppointmentCount}
                </span>
              )}
            </button>

            <button
              onClick={() => onNavigate('inventory')}
              title="Stock & Inventory"
              className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-0' : 'justify-between px-3'} py-2 rounded-lg font-semibold text-xs transition-all cursor-pointer ${
                currentScreen === 'inventory'
                  ? 'bg-emerald-50 text-emerald-800 font-bold border border-emerald-200 shadow-2xs'
                  : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Boxes className={`w-4 h-4 shrink-0 ${currentScreen === 'inventory' ? 'text-emerald-700' : 'text-slate-500'}`} />
                {!isSidebarCollapsed && <span>{t('nav.inventory', 'Stock & Inventory')}</span>}
              </div>
              {!isSidebarCollapsed && lowStockCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white font-bold text-[9px]" title={`${lowStockCount} Low Stock`}>
                  {lowStockCount}
                </span>
              )}
            </button>

            <button
              onClick={() => onNavigate('customers')}
              title="Clients Directory"
              className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-0' : 'gap-2.5 px-3'} py-2 rounded-lg font-semibold text-xs transition-all cursor-pointer ${
                currentScreen === 'customers'
                  ? 'bg-emerald-50 text-emerald-800 font-bold border border-emerald-200 shadow-2xs'
                  : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Users className={`w-4 h-4 shrink-0 ${currentScreen === 'customers' ? 'text-emerald-700' : 'text-slate-500'}`} />
              {!isSidebarCollapsed && <span>{t('nav.customers', 'Clients Directory')}</span>}
            </button>

            <button
              onClick={() => onNavigate('reports')}
              title="Revenue Reports"
              className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-0' : 'gap-2.5 px-3'} py-2 rounded-lg font-semibold text-xs transition-all cursor-pointer ${
                currentScreen === 'reports'
                  ? 'bg-emerald-50 text-emerald-800 font-bold border border-emerald-200 shadow-2xs'
                  : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <BarChart3 className={`w-4 h-4 shrink-0 ${currentScreen === 'reports' ? 'text-emerald-700' : 'text-slate-500'}`} />
              {!isSidebarCollapsed && <span>{t('nav.reports', 'Revenue Reports')}</span>}
            </button>

            <button
              onClick={() => onNavigate('profile')}
              title="Settings"
              className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-0' : 'gap-2.5 px-3'} py-2 rounded-lg font-semibold text-xs transition-all cursor-pointer ${
                currentScreen === 'profile'
                  ? 'bg-emerald-50 text-emerald-800 font-bold border border-emerald-200 shadow-2xs'
                  : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <SettingsIcon className={`w-4 h-4 shrink-0 ${currentScreen === 'profile' ? 'text-emerald-700' : 'text-slate-500'}`} />
              {!isSidebarCollapsed && <span>{t('nav.settings', 'Settings')}</span>}
            </button>
          </nav>
        </div>

        {/* Sidebar Bottom Secondary Controls */}
        <div className="p-2.5 border-t border-slate-100 space-y-1.5">
          {/* Upgrade Plan Button near Sign Out */}
          <button
            type="button"
            onClick={() => {
              setUpgradePlan(subscription.isTrialExpired ? 'annual' : 'annual');
              setShowUpgradeModal(true);
            }}
            className={`w-full py-2 px-2.5 rounded-xl font-bold text-xs flex items-center justify-between transition-all cursor-pointer shadow-2xs ${
              subscription.isSubscribed
                ? 'bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-200'
                : subscription.isTrialExpired
                ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse'
                : 'bg-emerald-800 hover:bg-emerald-900 text-white'
            }`}
            title="Upgrade Boutique Subscription Plan"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Crown className={`w-3.5 h-3.5 shrink-0 ${subscription.isSubscribed ? 'text-amber-600 fill-amber-500' : 'text-amber-300 fill-amber-300'}`} />
              {!isSidebarCollapsed && (
                <div className="text-left min-w-0">
                  <div className="text-[11px] leading-tight truncate font-bold">
                    {subscription.isSubscribed ? 'Pro Active' : 'Upgrade to Pro'}
                  </div>
                  <div className="text-[9px] opacity-80 leading-tight truncate">
                    {subscription.isSubscribed ? '👑 Active License' : '₹199/mo • ₹1,999/yr'}
                  </div>
                </div>
              )}
            </div>

            {!isSidebarCollapsed && !subscription.isSubscribed && (
              <span className={`text-[9px] px-1.5 py-0.5 rounded font-black ${subscription.isTrialExpired ? 'bg-white text-rose-700' : 'bg-white/20 text-amber-200'}`}>
                {subscription.isTrialExpired ? 'EXPIRED' : `${subscription.daysLeft}d left`}
              </span>
            )}
          </button>

          <button
            onClick={onLogout}
            className="w-full py-1.5 px-2.5 rounded-lg hover:bg-rose-50 text-rose-600 font-semibold text-xs flex items-center gap-2 transition-all cursor-pointer"
            title="Sign Out"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-500 shrink-0" />
            {!isSidebarCollapsed && <span>{t('nav.signOut', 'Sign Out')}</span>}
          </button>
        </div>
      </aside>

      {/* 2. Mobile Header Bar - Visible only on Mobile (< lg) */}
      <header className="lg:hidden bg-white text-slate-900 px-3.5 py-2.5 sticky top-0 z-40 shadow-xs flex items-center justify-between border-b border-slate-200">
        <div className="flex items-center gap-2.5">
          <BrandLogo size="sm" variant="luxury" />
          <div className="flex flex-col min-w-0">
            <h1 className="text-sm font-black text-slate-900 leading-tight truncate">{shopProfile.shopName || 'Boutique Control Desk'}</h1>
            <p className="text-[10px] text-slate-500 font-semibold truncate">{userPhone || shopProfile.ownerName || 'Active Desk'}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Mobile Free Trial / Upgrade Pill */}
          {subscription.isSubscribed ? (
            <div className="px-2 py-0.5 rounded-lg bg-amber-50 text-amber-900 border border-amber-300 text-[10px] font-bold flex items-center gap-1">
              <Crown className="w-2.5 h-2.5 text-amber-600 fill-amber-500" />
              <span>Pro ({subscription.paidDaysLeft}d)</span>
            </div>
          ) : subscription.isPendingConfirmation ? (
            <button
              type="button"
              onClick={() => setShowUpgradeModal(true)}
              className="px-2 py-1 rounded-lg text-[10px] font-bold border border-amber-300 bg-amber-50 text-amber-900 flex items-center gap-1 cursor-pointer"
            >
              <Clock className="w-2.5 h-2.5 text-amber-600 animate-spin" />
              <span>Verifying</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowUpgradeModal(true)}
              className={`px-2 py-1 rounded-lg text-[10px] font-black border flex items-center gap-1 cursor-pointer transition-all ${
                subscription.isTrialExpired
                  ? 'bg-rose-50 text-rose-800 border-rose-300 animate-pulse'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-300'
              }`}
            >
              <Sparkles className="w-2.5 h-2.5 text-amber-500" />
              <span>{subscription.isTrialExpired ? 'Trial Expired' : `Trial: ${subscription.daysLeft}d`}</span>
            </button>
          )}
          {/* Language Switcher Pill */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[10px] font-bold">
            <button
              type="button"
              onClick={() => setLanguage('en')}
              className={`px-1.5 py-0.5 rounded transition-colors ${
                language === 'en' ? 'bg-emerald-700 text-white font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => setLanguage('hi')}
              className={`px-1.5 py-0.5 rounded transition-colors ${
                language === 'hi' ? 'bg-emerald-700 text-white font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              हिन्दी
            </button>
            <button
              type="button"
              onClick={() => setLanguage('bn')}
              className={`px-1.5 py-0.5 rounded transition-colors ${
                language === 'bn' ? 'bg-emerald-700 text-white font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              বাংলা
            </button>
            <button
              type="button"
              onClick={() => setLanguage('or')}
              className={`px-1.5 py-0.5 rounded transition-colors ${
                language === 'or' ? 'bg-emerald-700 text-white font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ଓଡ଼ିଆ
            </button>
          </div>

          <button
            onClick={() => onNavigate('orders')}
            className="p-2 rounded-xl bg-slate-100 text-slate-700 relative cursor-pointer hover:bg-emerald-50 hover:text-emerald-800 transition-all active:scale-95 border border-slate-200"
            title="Orders & Deliveries"
          >
            <Package className="w-4 h-4" />
            {overdueCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white rounded-full text-[9px] font-black flex items-center justify-center border border-white">
                {overdueCount}
              </span>
            )}
          </button>

          <button
            onClick={() => onNavigate('profile')}
            className="w-8 h-8 rounded-xl bg-emerald-700 text-white font-black text-xs flex items-center justify-center shadow-xs cursor-pointer border border-emerald-800 active:scale-95 transition-transform"
          >
            {shopProfile.ownerName ? shopProfile.ownerName.slice(0, 2).toUpperCase() : 'SS'}
          </button>
        </div>
      </header>

      {/* 3. Main Content Workspace Area */}
      <div className={`flex-1 ${isSidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'} flex flex-col min-w-0 min-h-screen transition-all duration-200`}>
        
        {/* Top Desktop Workspace Header - Sticky on Desktop (>= lg) */}
        <header className="hidden lg:flex bg-white border-b border-slate-200 px-6 lg:px-8 py-2.5 items-center justify-between sticky top-0 z-30 shadow-2xs">
          {/* Header Left Title / Status Indicator */}
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-slate-800 tracking-tight">
              {shopProfile.shopName || 'ShopScopers Boutique Studio'}
            </span>

            {/* Trial / Subscription Status Pill */}
            {subscription.isSubscribed ? (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-300 rounded-lg text-xs font-bold text-amber-950 shadow-2xs">
                <Crown className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
                <span>{subscription.planTier} • <strong className="text-emerald-800 font-extrabold">{subscription.paidDaysLeft} Days Active</strong></span>
              </div>
            ) : subscription.isPendingConfirmation ? (
              <div
                onClick={() => {
                  setShowUpgradeModal(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-lg text-xs font-bold text-amber-950 cursor-pointer transition-colors"
                title="Payment submitted. Waiting for Admin confirmation."
              >
                <Clock className="w-3.5 h-3.5 text-amber-600 animate-spin" />
                <span>Payment Submitted • <strong className="text-amber-900">Waiting for Admin Confirmation</strong></span>
              </div>
            ) : subscription.isTrialActive ? (
              <div
                onClick={() => {
                  setUpgradePlan('annual');
                  setShowUpgradeModal(true);
                }}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg text-xs font-bold text-emerald-900 cursor-pointer transition-colors"
                title="Click to view subscription plans and upgrade"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>1-Month Free Trial: <strong className="text-emerald-950">{subscription.daysLeft} Days Left</strong></span>
                <span className="text-[10px] bg-emerald-800 text-white px-2 py-0.5 rounded font-extrabold ml-1">
                  Upgrade
                </span>
              </div>
            ) : (
              <div
                onClick={() => {
                  setUpgradePlan('annual');
                  setShowUpgradeModal(true);
                }}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-rose-50 hover:bg-rose-100 border border-rose-300 rounded-lg text-xs font-bold text-rose-800 cursor-pointer transition-colors animate-pulse"
                title="1-Month Free Trial Expired - Click to upgrade"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                <span>Free Trial Expired</span>
                <span className="text-[10px] bg-rose-600 text-white px-2 py-0.5 rounded font-extrabold ml-1">
                  Upgrade ₹199/-
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            {/* Quick Order Popups Action Bar on Desktop */}
            <div className="flex items-center gap-1.5 bg-slate-100/90 p-1 rounded-xl border border-slate-200 shadow-2xs">
              <button
                type="button"
                onClick={onNewStitchClick || (() => onNavigate('new_order'))}
                className="h-7 px-2.5 rounded-lg bg-[#0B4636] hover:bg-[#073327] text-white text-[11px] font-bold flex items-center gap-1 shadow-2xs transition-all cursor-pointer active:scale-95"
                title="Bespoke Stitch Order Popup"
              >
                <Scissors className="w-3 h-3 stroke-[2.5]" />
                <span>+ Stitch</span>
              </button>

              <button
                type="button"
                onClick={onNewAlterClick || (() => onNavigate('new_order'))}
                className="h-7 px-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold flex items-center gap-1 shadow-2xs transition-all cursor-pointer active:scale-95"
                title="Quick Garment Alteration Popup"
              >
                <Scissors className="w-3 h-3 text-sky-300" />
                <span>+ Alter</span>
              </button>

              <button
                type="button"
                onClick={onNewSaleClick || (() => onNavigate('new_order'))}
                className="h-7 px-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-bold flex items-center gap-1 shadow-2xs transition-all cursor-pointer active:scale-95"
                title="Express Retail Sale Bill Popup"
              >
                <ShoppingBag className="w-3 h-3 text-amber-300" />
                <span>+ Sale</span>
              </button>

              <button
                type="button"
                onClick={onNewAppointmentClick || (() => onNavigate('appointments'))}
                className="h-7 px-2.5 rounded-lg bg-white hover:bg-slate-50 text-slate-800 text-[11px] font-bold flex items-center gap-1 border border-slate-200 shadow-2xs transition-all cursor-pointer active:scale-95"
                title="Schedule Client Appointment Popup"
              >
                <Calendar className="w-3 h-3 text-purple-700" />
                <span>+ Appt</span>
              </button>
            </div>

            {/* Compact Language Selector Dropdown */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 transition-colors">
              <Globe className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as any)}
                className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer pr-1"
                title="Select Interface Language"
              >
                <option value="en">English</option>
                <option value="hi">हिन्दी (Hindi)</option>
                <option value="bn">বাংলা (Bengali)</option>
                <option value="or">ଓଡ଼ିଆ (Odia)</option>
              </select>
            </div>

            <button
              onClick={() => onNavigate('orders')}
              className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
            >
              <Package className="w-3.5 h-3.5" />
              <span>{t('nav.ordersOnly', 'Orders')}</span>
            </button>

            <div className="h-5 w-px bg-slate-200" />

            {/* Profile Pill Dropdown */}
            <div 
              onClick={() => onNavigate('profile')}
              className="flex items-center gap-2 p-1 pr-2 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer border border-transparent hover:border-slate-200"
            >
              <div className="w-6 h-6 rounded-full bg-emerald-700 text-white font-bold text-[10px] flex items-center justify-center shadow-2xs">
                {shopProfile.ownerName ? shopProfile.ownerName.slice(0, 2).toUpperCase() : 'SS'}
              </div>
              <div className="text-left leading-none">
                <div className="text-xs font-bold text-slate-900">{shopProfile.shopName || 'Boutique Studio'}</div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
            </div>
          </div>
        </header>

        {/* Pending Admin Confirmation Alert Banner */}
        {subscription.isPendingConfirmation && (
          <div className="bg-gradient-to-r from-amber-900 via-amber-800 to-slate-900 text-white px-4 py-2.5 text-xs font-medium flex flex-col sm:flex-row items-center justify-between gap-2 shadow-xs border-b border-amber-700">
            <div className="flex items-center gap-2 text-center sm:text-left">
              <Clock className="w-4 h-4 text-amber-300 shrink-0 animate-pulse" />
              <span>
                Payment of <strong>{subscription.priceFormatted}</strong> received (Ref: {shopProfile.paymentId || 'Pending'}). Waiting for Admin confirmation. Pro features will be unlocked once confirmed.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowUpgradeModal(true)}
              className="px-3.5 py-1 bg-white hover:bg-amber-50 text-slate-900 font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer shrink-0"
            >
              View Payment Slip
            </button>
          </div>
        )}

        {/* Trial Expired Alert Banner */}
        {subscription.isTrialExpired && !subscription.isSubscribed && !subscription.isPendingConfirmation && (
          <div className="bg-gradient-to-r from-rose-900 via-rose-800 to-amber-950 text-white px-4 py-2.5 text-xs font-medium flex flex-col sm:flex-row items-center justify-between gap-2 shadow-xs border-b border-rose-700">
            <div className="flex items-center gap-2 text-center sm:text-left">
              <AlertTriangle className="w-4 h-4 text-amber-300 shrink-0" />
              <span>
                Your <strong>1-Month Free Trial</strong> period has completed from signup. Upgrade to Pro (₹199/mo or ₹1,999/yr) to keep multi-device cloud synchronization & WhatsApp receipts active.
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setUpgradePlan('annual');
                setShowUpgradeModal(true);
              }}
              className="px-4 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-xl shadow-sm transition-all cursor-pointer shrink-0 flex items-center gap-1"
            >
              <Crown className="w-3 h-3 fill-slate-950" />
              <span>Upgrade to Pro (₹199/-)</span>
            </button>
          </div>
        )}

        {/* Inner Canvas Area (Clean Light Canvas) */}
        <main className="flex-1 p-3 sm:p-4 md:p-5 lg:p-6 pb-28 lg:pb-8 max-w-[1440px] w-full mx-auto">
          {children}
        </main>

        {/* Desktop Footer */}
        <footer className="hidden lg:flex bg-white border-t border-slate-200 px-8 py-3 text-center text-xs text-slate-500 items-center justify-between">
          <div className="flex items-center gap-2 font-medium">
            <Shield className="w-3.5 h-3.5 text-emerald-700" />
            <span>ShopScopers Boutique Control Desk & Ledger</span>
            <span>•</span>
            <span className="text-emerald-800 font-bold">Android Room DB & Cloud Synchronized</span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <button onClick={() => onNavigate('terms')} className="hover:underline cursor-pointer">Terms</button>
            <span>•</span>
            <button onClick={() => onNavigate('privacy')} className="hover:underline cursor-pointer">Privacy</button>
            <span>•</span>
            <button onClick={() => onNavigate('refund')} className="hover:underline cursor-pointer">Refund</button>
          </div>
        </footer>
      </div>

      {/* 4. Mobile Bottom Persistent Navigation Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white text-slate-700 border-t border-slate-200 px-1.5 py-1.5 flex items-center justify-around z-50 shadow-xl safe-area-bottom">
        <button
          onClick={() => onNavigate('dashboard')}
          className={`flex-1 py-1 px-1 flex flex-col items-center justify-center gap-0.5 rounded-xl transition-all cursor-pointer ${
            currentScreen === 'dashboard'
              ? 'text-emerald-800 font-bold'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Home className={`w-5 h-5 ${currentScreen === 'dashboard' ? 'text-emerald-700' : 'text-slate-400'}`} />
          <span className="text-[10px] sm:text-[11px] font-bold">{t('nav.dashboard', 'Desk')}</span>
        </button>

        <button
          onClick={() => onNavigate('orders')}
          className={`flex-1 py-1 px-1 flex flex-col items-center justify-center gap-0.5 rounded-xl transition-all cursor-pointer relative ${
            currentScreen === 'orders' || currentScreen === 'overdue'
              ? 'text-emerald-800 font-bold'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Package className={`w-5 h-5 ${currentScreen === 'orders' || currentScreen === 'overdue' ? 'text-emerald-700' : 'text-slate-400'}`} />
          <span className="text-[10px] sm:text-[11px] font-bold">{t('nav.orders', 'Orders')}</span>
          {overdueCount > 0 && (
            <span className="absolute top-1 right-2 w-3.5 h-3.5 bg-rose-500 text-white rounded-full text-[8px] font-black flex items-center justify-center">
              {overdueCount}
            </span>
          )}
        </button>

        <button
          onClick={onNewStitchClick || (() => onNavigate('new_order'))}
          className="flex-1 py-1 px-1 flex flex-col items-center justify-center gap-0.5 text-emerald-900 font-bold transition-all cursor-pointer active:scale-95"
          title="Create New Order Entry"
        >
          <div className="w-9 h-9 rounded-full bg-[#0B4636] hover:bg-[#073327] text-white flex items-center justify-center shadow-lg -mt-3 border-2 border-white">
            <Plus className="w-5 h-5 stroke-[3]" />
          </div>
          <span className="text-[9px] font-bold text-[#0B4636] uppercase tracking-tight">{t('nav.newOrder', 'Order')}</span>
        </button>

        <button
          onClick={() => onNavigate('inventory')}
          className={`flex-1 py-1 px-1 flex flex-col items-center justify-center gap-0.5 rounded-xl transition-all cursor-pointer relative ${
            currentScreen === 'inventory'
              ? 'text-emerald-800 font-bold'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Boxes className={`w-5 h-5 ${currentScreen === 'inventory' ? 'text-emerald-700' : 'text-slate-400'}`} />
          <span className="text-[10px] sm:text-[11px] font-bold">{t('nav.inventory', 'Inventory')}</span>
          {lowStockCount > 0 && (
            <span className="absolute top-1 right-2 w-3.5 h-3.5 bg-rose-500 text-white rounded-full text-[8px] font-black flex items-center justify-center animate-pulse">
              {lowStockCount}
            </span>
          )}
        </button>

        <button
          onClick={() => onNavigate('customers')}
          className={`flex-1 py-1 px-1 flex flex-col items-center justify-center gap-0.5 rounded-xl transition-all cursor-pointer relative ${
            currentScreen === 'customers'
              ? 'text-emerald-800 font-bold'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Users className={`w-5 h-5 ${currentScreen === 'customers' ? 'text-emerald-700' : 'text-slate-400'}`} />
          <span className="text-[10px] sm:text-[11px] font-bold">{t('nav.customers', 'Clients')}</span>
        </button>
      </div>

      {/* Boutique Pro Subscription & Payment Gateway Modal */}
      <PaymentGatewayModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        shopProfile={shopProfile}
        initialPlan={upgradePlan}
        onSuccess={() => {
          onTriggerSync();
        }}
      />
    </div>
  );
};
