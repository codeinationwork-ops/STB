import React, { useState } from 'react';
import {
  Scissors,
  Shield,
  Smartphone,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Store,
  Users,
  BarChart3,
  Clock,
  Zap,
  Award,
  ChevronRight,
  UserPlus,
  LogIn,
  Layers,
  Cloud,
  FileSpreadsheet,
  MapPin,
  MessageCircle,
  HelpCircle,
  Star,
  Check,
  Phone,
} from 'lucide-react';
import { AuthModal } from './AuthModal';
import { BrandLogo } from './BrandLogo';

interface LandingScreenProps {
  onGoToSignUp: () => void;
  onGoToLogin: () => void;
  onDemoAccess: () => void;
  onNavigatePolicy?: (policy: 'terms' | 'privacy' | 'refund') => void;
  onAuthSuccess?: (phone: string, shopDetails?: { shopName: string; ownerName: string }) => void;
}

export const LandingScreen: React.FC<LandingScreenProps> = ({
  onGoToSignUp,
  onGoToLogin,
  onDemoAccess,
  onNavigatePolicy,
  onAuthSuccess,
}) => {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'signup'>('login');

  const openAuthModal = (tab: 'login' | 'signup') => {
    setAuthModalTab(tab);
    setAuthModalOpen(true);
  };

  const handleAuthComplete = (phone: string, shopDetails?: { shopName: string; ownerName: string }) => {
    if (onAuthSuccess) {
      onAuthSuccess(phone, shopDetails);
    } else {
      onGoToLogin();
    }
  };

  return (
    <div className="min-h-screen bg-[#071D17] text-slate-100 font-sans flex flex-col justify-between selection:bg-amber-400 selection:text-slate-950 overflow-x-hidden">
      {/* 1. Header Navigation Bar */}
      <header className="sticky top-0 z-50 bg-[#0B4636]/95 backdrop-blur-md border-b border-amber-300/20 px-4 sm:px-8 py-3.5 shadow-xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <BrandLogo size="md" variant="glass" />
            <div>
              <h1 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                <span>SilaiHub</span>
                <span className="bg-amber-400 text-slate-950 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  CRM
                </span>
              </h1>
              <p className="text-[10px] font-bold text-amber-200/80 uppercase tracking-widest">
                Tailor & Boutique Master Ledger
              </p>
            </div>
          </div>

          {/* Desktop Navigation Anchors */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-bold text-slate-200">
            <a href="#features" className="hover:text-amber-300 transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-amber-300 transition-colors">How It Works</a>
            <a href="#pricing" className="hover:text-amber-300 transition-colors">Pricing</a>
            <a href="#testimonials" className="hover:text-amber-300 transition-colors">Testimonials</a>
          </nav>

          {/* Header Action CTAs: Login & Sign Up (Pop-in Modals) */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => openAuthModal('login')}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer border border-white/20"
            >
              <LogIn className="w-4 h-4 text-amber-300" />
              <span>Log In</span>
            </button>

            <button
              onClick={() => openAuthModal('signup')}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 text-xs font-black shadow-md shadow-amber-400/20 flex items-center gap-1.5 transition-all cursor-pointer border border-amber-300/40 active:scale-95"
            >
              <UserPlus className="w-4 h-4" />
              <span className="hidden sm:inline">Register Shop</span>
              <span className="sm:hidden">Sign Up</span>
            </button>

            <button
              onClick={onDemoAccess}
              className="hidden lg:flex px-3 py-2 rounded-xl bg-emerald-950/90 hover:bg-emerald-900 text-emerald-300 text-xs font-bold items-center gap-1.5 border border-emerald-500/40 cursor-pointer"
              title="Instant Demo Access"
            >
              <Zap className="w-4 h-4 text-amber-300 animate-pulse" />
              <span>Demo</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-12">
        {/* 2. Hero Showcase Section */}
        <section className="relative rounded-3xl bg-gradient-to-br from-[#0B4636] via-[#083529] to-[#041a14] p-6 sm:p-10 text-white shadow-2xl overflow-hidden border border-amber-300/30">
          <div className="absolute top-0 right-0 opacity-10 translate-x-12 -translate-y-12 pointer-events-none">
            <Scissors className="w-80 h-80 text-amber-300" />
          </div>

          <div className="max-w-3xl space-y-5 relative z-10">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-400/20 border border-amber-300/40 text-amber-300 text-xs font-extrabold shadow-sm">
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>#1 Smart Ledger & Measurement Vault for Boutique & Tailor Shops</span>
            </div>

            <h2 className="text-3xl sm:text-5xl font-black leading-tight tracking-tight text-white">
              Manage Customer Measurements, Orders & Payments <span className="text-amber-300">On Any Device</span>
            </h2>

            <p className="text-sm sm:text-base text-slate-200/90 leading-relaxed max-w-2xl font-medium">
              Replace physical measurement notebooks with an offline-first mobile CRM. Track garment measurements, worker wage payouts, advance payments & trial dates with instant WhatsApp order slips.
            </p>

            {/* CTAs */}
            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 max-w-xl">
              <button
                onClick={() => openAuthModal('signup')}
                className="h-13 px-6 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-sm sm:text-base rounded-2xl shadow-xl shadow-amber-400/25 flex items-center justify-center gap-2.5 transition-all cursor-pointer active:scale-[0.99] border border-amber-200"
              >
                <UserPlus className="w-5 h-5" />
                <span>Create Free Shop Account</span>
                <ArrowRight className="w-5 h-5" />
              </button>

              <button
                onClick={() => openAuthModal('login')}
                className="h-13 px-6 bg-white/10 hover:bg-white/20 text-white font-bold text-sm rounded-2xl backdrop-blur-md border border-white/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <LogIn className="w-5 h-5 text-amber-300" />
                <span>Sign In to Shop</span>
              </button>
            </div>

            {/* Quick Demo Option */}
            <div className="pt-2 flex items-center gap-3 text-xs text-slate-300">
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> 100% Free Starter Plan
              </span>
              <span>•</span>
              <button
                onClick={onDemoAccess}
                className="text-amber-300 font-extrabold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Try Instant Demo Account</span>
              </button>
            </div>
          </div>
        </section>

        {/* 3. Live Interactive Mockup Showcase */}
        <section className="bg-[#0B4636]/40 border border-amber-300/20 rounded-3xl p-6 sm:p-8 shadow-xl">
          <div className="text-center max-w-2xl mx-auto mb-8">
            <span className="text-xs font-extrabold text-amber-300 uppercase tracking-widest bg-amber-400/10 px-3 py-1 rounded-full border border-amber-300/30">
              Tailor CRM Live Preview
            </span>
            <h3 className="text-2xl sm:text-3xl font-black text-white mt-3">
              Everything Your Shop Needs in One Mobile Screen
            </h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Live Order Card Mockup */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-amber-300 bg-amber-400/10 px-2.5 py-1 rounded-lg border border-amber-300/30">
                  ORD-8492
                </span>
                <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Trial Tomorrow
                </span>
              </div>

              <div>
                <h4 className="text-base font-black text-white">Rajesh Verma</h4>
                <p className="text-xs text-slate-400">+91 98765 43210 • Delhi</p>
              </div>

              <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/80 text-xs space-y-1">
                <div className="flex justify-between font-bold text-slate-200">
                  <span>Garment: Gents 3-Piece Tuxedo</span>
                  <span className="text-amber-300">₹6,500</span>
                </div>
                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>Advance Paid: ₹2,500</span>
                  <span className="text-rose-400 font-bold">Balance: ₹4,000</span>
                </div>
              </div>

              <div className="pt-1">
                <div className="text-[10px] font-bold text-slate-400 mb-1 flex justify-between">
                  <span>Stitching Workflow Progress</span>
                  <span className="text-amber-300">Stitching Stage</span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-gradient-to-r from-amber-400 to-emerald-400 h-full w-[60%]" />
                </div>
              </div>
            </div>

            {/* Saved Measurements Vault Preview */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-lg">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                  <span>📏 Measurement Vault</span>
                </h4>
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  Suits & Blazers
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-800/90 p-2.5 rounded-xl border border-slate-700">
                  <span className="text-[10px] text-slate-400 block font-bold">Chest</span>
                  <span className="font-black text-amber-300 text-sm">40.5 Inches</span>
                </div>
                <div className="bg-slate-800/90 p-2.5 rounded-xl border border-slate-700">
                  <span className="text-[10px] text-slate-400 block font-bold">Waist</span>
                  <span className="font-black text-amber-300 text-sm">34.0 Inches</span>
                </div>
                <div className="bg-slate-800/90 p-2.5 rounded-xl border border-slate-700">
                  <span className="text-[10px] text-slate-400 block font-bold">Shoulder</span>
                  <span className="font-black text-amber-300 text-sm">18.5 Inches</span>
                </div>
                <div className="bg-slate-800/90 p-2.5 rounded-xl border border-slate-700">
                  <span className="text-[10px] text-slate-400 block font-bold">Inseam</span>
                  <span className="font-black text-amber-300 text-sm">31.0 Inches</span>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 italic">
                * Pre-built spec templates for Kurtas, Sherwanis, Blouses, Shirts & Trousers.
              </p>
            </div>

            {/* WhatsApp Order Slip & Location Sharing */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-lg flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
                  <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                    <MessageCircle className="w-4 h-4 text-emerald-400" />
                    <span>WhatsApp Order Slip</span>
                  </h4>
                  <span className="text-[10px] font-bold text-amber-300 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-300/30">
                    1-Click Share
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed mb-3">
                  Send digital order receipts directly to client WhatsApp with order specs, advance paid, due date, and your shop's Google Maps link.
                </p>

                <div className="p-3 bg-emerald-950/60 border border-emerald-500/30 rounded-xl text-emerald-300 text-[11px] font-mono leading-tight space-y-1">
                  <div>🧵 <strong>Rohit Tailors - Order Slip #ORD-8492</strong></div>
                  <div>Client: Rajesh Verma</div>
                  <div>Trial Date: 14 Aug 2026</div>
                  <div className="text-amber-300">📍 Google Maps Shop Navigation attached</div>
                </div>
              </div>

              <button
                onClick={() => openAuthModal('signup')}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Try WhatsApp Order Slips</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </section>

        {/* 4. Detailed Feature Grid */}
        <section id="features" className="space-y-6">
          <div className="text-center max-w-2xl mx-auto">
            <h3 className="text-2xl sm:text-3xl font-black text-white">
              Why 5,000+ Tailor Shops & Boutiques Rely on ShopScoper
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 mt-2">
              Designed specifically for custom garment stitching, master tailor assignments, and daily ledger management.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 hover:border-amber-400/40 transition-all space-y-2">
              <div className="w-10 h-10 rounded-xl bg-amber-400/20 text-amber-300 flex items-center justify-center font-bold text-lg border border-amber-300/30">
                📏
              </div>
              <h4 className="text-sm font-black text-white">Full Measurement Vault</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Chest, waist, inseam, collar, shoulder, sleeve & armhole specs for Suits, Sherwanis, Blouses & Kurtas.
              </p>
            </div>

            <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 hover:border-amber-400/40 transition-all space-y-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-lg border border-emerald-500/30">
                ⏰
              </div>
              <h4 className="text-sm font-black text-white">Trial & Overdue Alerts</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Get real-time overdue alerts for pending trial dates so customer dresses are ready right on time.
              </p>
            </div>

            <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 hover:border-amber-400/40 transition-all space-y-2">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-lg border border-blue-500/30">
                👥
              </div>
              <h4 className="text-sm font-black text-white">Karigar Staff Assignment</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Assign garments to master tailors, track estimated stitching hours, and log piece-rate wage payouts.
              </p>
            </div>

            <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 hover:border-amber-400/40 transition-all space-y-2">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-lg border border-purple-500/30">
                💬
              </div>
              <h4 className="text-sm font-black text-white">WhatsApp Order Slips</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Send professional digital order receipts to customer mobile with attached Google Maps location.
              </p>
            </div>

            <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 hover:border-amber-400/40 transition-all space-y-2">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold text-lg border border-rose-500/30">
                📊
              </div>
              <h4 className="text-sm font-black text-white">Revenue & Advance Ledger</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Track cash/UPI advance payments, pending balance recoveries, and monthly shop profit analytics.
              </p>
            </div>

            <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 hover:border-amber-400/40 transition-all space-y-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold text-lg border border-emerald-500/30">
                ⚡
              </div>
              <h4 className="text-sm font-black text-white">Offline Room SQLite DB</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Functions 100% offline in shop basements with automatic background Firebase Cloud synchronization.
              </p>
            </div>
          </div>
        </section>

        {/* 5. How It Works (3 Steps) */}
        <section id="how-it-works" className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 text-center space-y-8">
          <div className="max-w-xl mx-auto">
            <span className="text-xs font-extrabold text-amber-300 uppercase tracking-widest bg-amber-400/10 px-3 py-1 rounded-full border border-amber-300/30">
              Simple 3-Step Setup
            </span>
            <h3 className="text-2xl sm:text-3xl font-black text-white mt-3">
              Get Your Shop Running Digitally in 2 Minutes
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            <div className="bg-slate-800/80 p-5 rounded-2xl border border-slate-700/80 relative">
              <span className="w-8 h-8 rounded-full bg-amber-400 text-slate-950 font-black text-sm flex items-center justify-center mb-3">
                1
              </span>
              <h4 className="text-sm font-black text-white mb-1">Register Shop with Mobile OTP</h4>
              <p className="text-xs text-slate-300">
                Enter shop name, city, and phone number. Get instant 6-digit OTP verification.
              </p>
            </div>

            <div className="bg-slate-800/80 p-5 rounded-2xl border border-slate-700/80 relative">
              <span className="w-8 h-8 rounded-full bg-amber-400 text-slate-950 font-black text-sm flex items-center justify-center mb-3">
                2
              </span>
              <h4 className="text-sm font-black text-white mb-1">Add Customers & Measurements</h4>
              <p className="text-xs text-slate-300">
                Save body measurements for Suits, Kurtas, or Blouses in your encrypted offline vault.
              </p>
            </div>

            <div className="bg-slate-800/80 p-5 rounded-2xl border border-slate-700/80 relative">
              <span className="w-8 h-8 rounded-full bg-amber-400 text-slate-950 font-black text-sm flex items-center justify-center mb-3">
                3
              </span>
              <h4 className="text-sm font-black text-white mb-1">Track Orders & Send Slips</h4>
              <p className="text-xs text-slate-300">
                Assign tailors, manage trial dates, and send 1-click WhatsApp order receipts to clients.
              </p>
            </div>
          </div>
        </section>

        {/* 6. Pricing Plans */}
        <section id="pricing" className="space-y-6">
          <div className="text-center max-w-xl mx-auto">
            <h3 className="text-2xl sm:text-3xl font-black text-white">
              Transparent, Tailor-Friendly Pricing
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              Start 100% free with local Room DB, or upgrade for cloud backup.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* Free Plan */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl flex flex-col justify-between">
              <div>
                <span className="text-xs font-black text-emerald-400 bg-emerald-950 px-3 py-1 rounded-full border border-emerald-500/30">
                  Starter Plan
                </span>
                <div className="mt-4">
                  <span className="text-4xl font-black text-white">₹0</span>
                  <span className="text-xs text-slate-400"> / Free Forever</span>
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  Perfect for single-tailor shops and boutique owners getting started.
                </p>

                <ul className="mt-6 space-y-2.5 text-xs text-slate-300">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Up to 100 Active Stitch Orders / Month</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Full Garment Measurement Vault</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Offline Room SQLite DB Storage</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>WhatsApp Order Slip Generator</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={() => openAuthModal('signup')}
                className="w-full py-3 mt-6 bg-slate-800 hover:bg-slate-700 text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer border border-slate-700"
              >
                Register Free Account
              </button>
            </div>

            {/* Pro Plan */}
            <div className="bg-gradient-to-b from-[#0B4636] to-[#041a14] border-2 border-amber-400 rounded-3xl p-6 space-y-4 shadow-2xl relative flex flex-col justify-between">
              <span className="absolute -top-3.5 right-6 text-[10px] font-black text-slate-950 bg-amber-400 px-3 py-1 rounded-full uppercase tracking-wider shadow-md">
                Most Popular
              </span>

              <div>
                <span className="text-xs font-black text-amber-300 bg-amber-400/20 px-3 py-1 rounded-full border border-amber-300/40">
                  Pro Boutique Cloud
                </span>
                <div className="mt-4">
                  <span className="text-4xl font-black text-white">₹299</span>
                  <span className="text-xs text-amber-200"> / Month</span>
                </div>
                <p className="text-xs text-slate-200/90 mt-2">
                  For growing boutiques, custom design studios, & multi-tailor shops.
                </p>

                <ul className="mt-6 space-y-2.5 text-xs text-slate-100">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-amber-300 shrink-0" />
                    <span><strong>Unlimited</strong> Stitch Orders & Customer Profiles</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-amber-300 shrink-0" />
                    <span>Multi-Tailor Worker Assignment & Wage Tracker</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-amber-300 shrink-0" />
                    <span>Firebase Cloud Auto-Backup & Sync</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-amber-300 shrink-0" />
                    <span>Google Maps Shop Location Integration</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-amber-300 shrink-0" />
                    <span>Revenue & Monthly Profit Analytics</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={() => openAuthModal('signup')}
                className="w-full py-3 mt-6 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all cursor-pointer border border-amber-200"
              >
                Get Pro Cloud Access
              </button>
            </div>
          </div>
        </section>

        {/* 7. Customer Testimonials */}
        <section id="testimonials" className="space-y-6">
          <div className="text-center max-w-xl mx-auto">
            <h3 className="text-2xl sm:text-3xl font-black text-white">
              Loved by Master Tailors Across India
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex text-amber-400 gap-1 text-sm">
                <Star className="w-4 h-4 fill-amber-400" />
                <Star className="w-4 h-4 fill-amber-400" />
                <Star className="w-4 h-4 fill-amber-400" />
                <Star className="w-4 h-4 fill-amber-400" />
                <Star className="w-4 h-4 fill-amber-400" />
              </div>
              <p className="text-xs text-slate-300 leading-relaxed italic">
                "No more lost paper notebooks! The WhatsApp order slips with my Google Maps shop link made my boutique look super professional."
              </p>
              <div>
                <h4 className="text-xs font-black text-white">Master Rohit Sharma</h4>
                <p className="text-[10px] text-slate-400">Rohit Suitings, New Delhi</p>
              </div>
            </div>

            <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex text-amber-400 gap-1 text-sm">
                <Star className="w-4 h-4 fill-amber-400" />
                <Star className="w-4 h-4 fill-amber-400" />
                <Star className="w-4 h-4 fill-amber-400" />
                <Star className="w-4 h-4 fill-amber-400" />
                <Star className="w-4 h-4 fill-amber-400" />
              </div>
              <p className="text-xs text-slate-300 leading-relaxed italic">
                "Managing 5 karigars and tracking trial dates was a headache before. ShopScoper overdue alerts saved my boutique reputation!"
              </p>
              <div>
                <h4 className="text-xs font-black text-white">Ananya Rathore</h4>
                <p className="text-[10px] text-slate-400">Ethnic Couture Studio, Jaipur</p>
              </div>
            </div>

            <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex text-amber-400 gap-1 text-sm">
                <Star className="w-4 h-4 fill-amber-400" />
                <Star className="w-4 h-4 fill-amber-400" />
                <Star className="w-4 h-4 fill-amber-400" />
                <Star className="w-4 h-4 fill-amber-400" />
                <Star className="w-4 h-4 fill-amber-400" />
              </div>
              <p className="text-xs text-slate-300 leading-relaxed italic">
                "Works completely offline in my shop basement where mobile signal is weak. Best app for Indian tailors!"
              </p>
              <div>
                <h4 className="text-xs font-black text-white">Haji Abdul Qadir</h4>
                <p className="text-[10px] text-slate-400">Royal Sherwani House, Hyderabad</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* 8. Bottom Footer */}
      <footer className="border-t border-slate-800 bg-[#04130f] px-4 sm:px-8 py-8 text-xs text-slate-400 mt-12">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <BrandLogo size="sm" variant="glass" />
            <div>
              <span className="font-bold text-white block">SilaiHub Tailor CRM & Ledger</span>
              <span className="text-[11px] text-slate-500">Android Room SQLite & Firebase Cloud Synchronized</span>
            </div>
          </div>

          <div className="flex items-center gap-6 font-semibold text-slate-300 text-xs">
            <button
              onClick={() => onNavigatePolicy && onNavigatePolicy('terms')}
              className="hover:text-amber-300 transition-colors cursor-pointer"
            >
              Terms of Service
            </button>
            <button
              onClick={() => onNavigatePolicy && onNavigatePolicy('privacy')}
              className="hover:text-amber-300 transition-colors cursor-pointer"
            >
              Privacy Policy
            </button>
            <button
              onClick={() => onNavigatePolicy && onNavigatePolicy('refund')}
              className="hover:text-amber-300 transition-colors cursor-pointer"
            >
              Refund Policy
            </button>
          </div>

          <p className="text-slate-500 text-[11px]">© 2026 ShopScoper Inc. All Rights Reserved.</p>
        </div>
      </footer>

      {/* 9. Interactive Auth Pop-in Modal */}
      <AuthModal
        isOpen={authModalOpen}
        initialTab={authModalTab}
        onClose={() => setAuthModalOpen(false)}
        onAuthSuccess={handleAuthComplete}
        onNavigatePolicy={onNavigatePolicy}
      />
    </div>
  );
};
