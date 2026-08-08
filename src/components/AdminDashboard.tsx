import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  ShieldCheck,
  LogOut,
  Bot,
  Globe,
  Database,
  ExternalLink,
  Store,
  Settings,
  User,
  Activity,
  Sparkles,
  Layers,
  BarChart3
} from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { CrawlerPage } from './CrawlerPage';
import { ShopifyStoresPage } from './ShopifyStoresPage';
import { Product, UserSession } from '../types';

interface AdminDashboardProps {
  currentUser: UserSession;
  onLogout: () => void;
  onNavigateHome: () => void;
  onProductsAddedToGlobalCatalog: (products: Product[]) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  currentUser,
  onLogout,
  onNavigateHome,
  onProductsAddedToGlobalCatalog
}) => {
  const [activeTab, setActiveTab] = useState<'crawler' | 'shopify'>('crawler');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-red-600 selection:text-white">
      
      {/* Top Admin Navigation Header */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-900/90 backdrop-blur-xl px-4 lg:px-8 py-3.5 flex items-center justify-between gap-4 shadow-xl">
        
        {/* Left: Brand Identity + Admin Badge */}
        <div className="flex items-center gap-3">
          <div 
            onClick={onNavigateHome}
            className="cursor-pointer group flex items-center gap-2"
          >
            <BrandLogo size="md" />
            <span className="px-2.5 py-0.5 rounded-full bg-red-600/20 text-red-400 border border-red-500/30 text-[10px] font-mono font-black tracking-wider uppercase">
              Admin Portal
            </span>
          </div>

          {/* Admin Section Tabs */}
          <div className="hidden sm:flex items-center gap-1.5 ml-4 pl-4 border-l border-slate-800">
            <button
              onClick={() => setActiveTab('crawler')}
              className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'crawler'
                  ? 'bg-red-600 text-white shadow-lg shadow-red-600/30 border border-red-500/50'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-700/80'
              }`}
            >
              <Bot className="w-3.5 h-3.5" />
              <span>AI Web Crawler</span>
            </button>

            <button
              onClick={() => setActiveTab('shopify')}
              className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'shopify'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 border border-emerald-500/50'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-700/80'
              }`}
            >
              <Store className="w-3.5 h-3.5 text-emerald-400" />
              <span>Shopify Connect & Scrape</span>
              <span className="px-1.5 py-0.2 rounded bg-emerald-500/30 text-emerald-200 text-[9px] font-black uppercase">
                NEW
              </span>
            </button>
          </div>
        </div>

        {/* Center: Mobile / Indicator Pills */}
        <div className="flex sm:hidden items-center gap-2">
          <button
            onClick={() => setActiveTab('crawler')}
            className={`px-2.5 py-1 rounded-lg font-mono text-[11px] ${
              activeTab === 'crawler' ? 'bg-red-600 text-white font-bold' : 'bg-slate-800 text-slate-400'
            }`}
          >
            Crawler
          </button>
          <button
            onClick={() => setActiveTab('shopify')}
            className={`px-2.5 py-1 rounded-lg font-mono text-[11px] ${
              activeTab === 'shopify' ? 'bg-emerald-600 text-white font-bold' : 'bg-slate-800 text-slate-400'
            }`}
          >
            Shopify
          </button>
        </div>

        {/* Right: Logged In Admin Info & Controls */}
        <div className="flex items-center gap-3">
          
          {/* Admin Email Badge */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/80 text-xs text-slate-200 font-mono">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-semibold">{currentUser.email}</span>
            <ShieldCheck className="w-3.5 h-3.5 text-red-400 ml-0.5" />
          </div>

          {/* Visit Main Store Front */}
          <button
            onClick={onNavigateHome}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs flex items-center gap-1.5 border border-slate-700 transition-colors cursor-pointer"
            title="View Public Store Front"
          >
            <Store className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden lg:inline">Store Front</span>
          </button>

          {/* Logout Button */}
          <button
            onClick={onLogout}
            className="px-3.5 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white font-mono font-bold text-xs flex items-center gap-1.5 border border-rose-500/40 transition-all cursor-pointer shadow-sm"
            title="Sign out of Admin Session"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* Main Admin Content View */}
      <main className="flex-1 flex flex-col w-full bg-slate-950">
        {activeTab === 'crawler' ? (
          <CrawlerPage
            onBackToHome={onNavigateHome}
            onProductsAddedToGlobalCatalog={onProductsAddedToGlobalCatalog}
          />
        ) : (
          <ShopifyStoresPage
            onProductsAddedToGlobalCatalog={onProductsAddedToGlobalCatalog}
          />
        )}
      </main>

    </div>
  );
};
