import React, { useState } from 'react';
import {
  ShieldCheck,
  Store,
  LogOut,
  Menu,
  X,
  ExternalLink,
  ChevronRight,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { AdminTab, AdminUser } from '../../types';

interface AdminLayoutProps {
  currentTab: AdminTab;
  onSelectTab: (tab: AdminTab) => void;
  adminUser: AdminUser | null;
  pendingCount?: number;
  verifiedCount?: number;
  onLogout: () => void;
  onExitToShop: () => void;
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  currentTab,
  onSelectTab,
  adminUser,
  pendingCount = 0,
  verifiedCount = 0,
  onLogout,
  onExitToShop,
  children,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // ONLY TWO navigation options as explicitly instructed
  const navItems: {
    id: AdminTab;
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
    badgeColor?: string;
  }[] = [
    {
      id: 'verifications',
      label: 'Boutique Approvals & Verification',
      description: 'Review and verify boutique signups',
      icon: ShieldCheck,
      badge: pendingCount,
      badgeColor: 'bg-amber-500 text-white',
    },
    {
      id: 'shops',
      label: 'Verified Boutiques & Directory',
      description: 'Manage active verified boutiques',
      icon: Store,
      badge: verifiedCount,
      badgeColor: 'bg-emerald-600 text-white',
    },
  ];

  const handleNavClick = (tab: AdminTab) => {
    onSelectTab(tab);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-900">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-emerald-900 border-b border-emerald-950 text-white px-4 sm:px-6 py-3 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-xl bg-white/10 hover:bg-white/15 text-emerald-100 cursor-pointer"
            aria-label="Toggle navigation"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-black text-base shadow-xs">
              SS
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-sm sm:text-base tracking-tight text-white">ShopScopers</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-800 text-emerald-100 border border-emerald-700 text-[10px] font-black uppercase tracking-wider">
                  Admin Panel
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-emerald-200/80 -mt-0.5 hidden sm:block">
                Master Multi-Tenant Operations & Capacity Engine
              </p>
            </div>
          </div>
        </div>

        {/* Right action tools */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={onExitToShop}
            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-emerald-100 hover:text-white text-xs font-bold flex items-center gap-1.5 border border-white/10 transition-all cursor-pointer"
            title="Open Tailor Shop Workspace"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Shop CRM Workspace</span>
          </button>

          <div className="h-6 w-px bg-emerald-700/60 hidden sm:block"></div>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-700 text-white font-bold text-xs flex items-center justify-center shadow-inner">
              {adminUser?.name?.substring(0, 2).toUpperCase() || 'AD'}
            </div>
            <div className="hidden md:block text-left text-xs leading-tight">
              <div className="font-bold text-white">{adminUser?.name || 'Administrator'}</div>
              <div className="text-[10px] text-emerald-300/80">{adminUser?.role || 'Super Admin'}</div>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="p-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 hover:text-white border border-rose-400/30 text-xs font-bold flex items-center transition-all cursor-pointer ml-1"
            title="Sign Out of Admin Console"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar for Desktop */}
        <aside className="hidden lg:flex w-64 bg-white border-r border-slate-200/80 flex-col justify-between shrink-0 shadow-xs z-30">
          <div className="p-4 space-y-1.5 overflow-y-auto">
            <div className="px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-400">
              Platform Controls
            </div>

            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl font-bold text-xs transition-all cursor-pointer text-left ${
                    isActive
                      ? 'bg-emerald-800 text-white shadow-xs ring-1 ring-emerald-700'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-1.5 rounded-lg ${
                        isActive ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold leading-tight">{item.label}</div>
                      <div
                        className={`text-[10px] font-normal leading-tight mt-0.5 ${
                          isActive ? 'text-emerald-200' : 'text-slate-400'
                        }`}
                      >
                        {item.description}
                      </div>
                    </div>
                  </div>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-black shrink-0 ${
                        item.badgeColor || 'bg-slate-200 text-slate-800'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Bottom Sidebar Info */}
          <div className="p-4 border-t border-slate-100 bg-slate-50 text-[11px] space-y-2">
            <div className="flex items-center justify-between text-slate-500">
              <span className="font-semibold">Security Grade:</span>
              <span className="font-bold text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                PCI / SOC2 Type II
              </span>
            </div>
            <div className="text-slate-400 text-[10px]">
              ShopScopers Platform v2.8 (Room DB Synced)
            </div>
          </div>
        </aside>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex">
            <div className="w-72 bg-white h-full p-4 flex flex-col justify-between shadow-2xl">
              <div className="space-y-2">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="font-black text-sm text-emerald-900 flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-emerald-800 text-white flex items-center justify-center text-xs">
                      SS
                    </span>
                    <span>Admin Navigation</span>
                  </div>
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-1 pt-2">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentTab === item.id;

                    return (
                      <button
                        key={item.id}
                        onClick={() => handleNavClick(item.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-xs transition-all ${
                          isActive
                            ? 'bg-emerald-800 text-white'
                            : 'text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-300' : 'text-slate-400'}`} />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 space-y-2">
                <button
                  onClick={onExitToShop}
                  className="w-full py-2.5 px-3 rounded-xl bg-slate-100 text-slate-800 font-bold text-xs flex items-center justify-center gap-2"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Shop CRM Workspace</span>
                </button>
                <button
                  onClick={onLogout}
                  className="w-full py-2.5 px-3 rounded-xl bg-rose-50 text-rose-700 font-bold text-xs flex items-center justify-center gap-2"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
            <div className="flex-1" onClick={() => setMobileMenuOpen(false)} />
          </div>
        )}

        {/* Content View Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
};
