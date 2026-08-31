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
  UserCheck,
  QrCode,
  Menu,
  X,
} from 'lucide-react';
import { AuthModal } from './AuthModal';
import { BrandLogo } from './BrandLogo';

interface LandingScreenProps {
  onGoToSignUp: () => void;
  onGoToLogin: () => void;
  onNavigatePolicy?: (policy: 'terms' | 'privacy' | 'refund') => void;
  onAuthSuccess?: (phone: string, shopDetails?: { shopName: string; ownerName: string }) => void;
  onCustomerAuthSuccess?: (customerPhone: string) => void;
  onNavigateCatalogue?: () => void;
  onNavigateCustomerIndex?: () => void;
  initialAuthModal?: 'login' | 'signup' | 'customer' | null;
  initialSection?: string;
}

export const LandingScreen: React.FC<LandingScreenProps> = ({
  onGoToSignUp,
  onGoToLogin,
  onNavigatePolicy,
  onAuthSuccess,
  onCustomerAuthSuccess,
  onNavigateCatalogue,
  onNavigateCustomerIndex,
  initialAuthModal,
  initialSection,
}) => {
  const [authModalOpen, setAuthModalOpen] = useState(() => !!initialAuthModal);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'signup' | 'customer'>(() => initialAuthModal || 'login');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Handle URL deep-linking on initial mount and keep page firmly at top on first open
  React.useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }

    if (initialAuthModal) {
      setAuthModalTab(initialAuthModal);
      setAuthModalOpen(true);
    } else if (initialSection) {
      const el = document.getElementById(initialSection);
      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: 'smooth' });
        }, 150);
      }
    } else {
      // Keep strictly at top of the page on initial landing
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
  }, [initialAuthModal, initialSection]);

  const openAuthModal = (tab: 'login' | 'signup' | 'customer') => {
    setAuthModalTab(tab);
    setAuthModalOpen(true);
    setMobileMenuOpen(false);
  };

  const closeAuthModal = () => {
    setAuthModalOpen(false);
    try {
      window.history.replaceState(null, '', '/');
    } catch {
      // ignore
    }
  };

  const scrollToSection = (sectionId: string) => {
    setMobileMenuOpen(false);
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
    try {
      window.history.replaceState(null, '', '/');
    } catch {
      // ignore
    }
  };

  const handleAuthComplete = (phone: string, shopDetails?: { shopName: string; ownerName: string }) => {
    if (onAuthSuccess) {
      onAuthSuccess(phone, shopDetails);
    } else {
      onGoToLogin();
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 font-sans flex flex-col justify-between selection:bg-emerald-200 selection:text-emerald-950 overflow-x-hidden pb-16 sm:pb-0">
      {/* 1. Header Navigation Bar */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 px-3.5 sm:px-8 py-2.5 sm:py-3.5 shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo & Brand */}
          <div
            className="flex items-center gap-2 sm:gap-3 cursor-pointer select-none"
            onClick={() => {
              window.scrollTo({ top: 0, behavior: 'smooth' });
              try {
                window.history.replaceState(null, '', '/');
              } catch {
                // ignore
              }
            }}
          >
            <BrandLogo size="sm" variant="default" />
            <div>
              <h1 className="text-sm sm:text-lg font-black tracking-tight text-slate-900 flex items-center gap-1.5 sm:gap-2">
                <span>ShopScopers</span>
                <span className="bg-emerald-600 text-white text-[9px] sm:text-[10px] font-extrabold px-1.5 sm:px-2 py-0.5 rounded-full uppercase tracking-wider">
                  CRM
                </span>
              </h1>
              <p className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider sm:tracking-widest hidden xs:block">
                Boutique & Designer Studio CRM
              </p>
            </div>
          </div>

          {/* Desktop Navigation Anchors */}
          <nav className="hidden lg:flex items-center gap-6 text-xs font-bold text-slate-600">
            <button
              onClick={() => scrollToSection('features')}
              className="hover:text-emerald-700 transition-colors cursor-pointer"
            >
              Features
            </button>
            <button
              onClick={() => scrollToSection('how-it-works')}
              className="hover:text-emerald-700 transition-colors cursor-pointer"
            >
              How It Works
            </button>
            <button
              onClick={() => scrollToSection('pricing')}
              className="hover:text-emerald-700 transition-colors cursor-pointer"
            >
              Pricing
            </button>
            <button
              onClick={() => scrollToSection('testimonials')}
              className="hover:text-emerald-700 transition-colors cursor-pointer"
            >
              Testimonials
            </button>
          </nav>

          {/* Header Action CTAs */}
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            <button
              onClick={() => (onNavigateCustomerIndex ? onNavigateCustomerIndex() : openAuthModal('customer'))}
              className="min-h-[38px] px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-900 text-xs font-bold flex items-center gap-1 sm:gap-1.5 transition-all cursor-pointer border border-teal-200 shadow-2xs active:scale-95"
              title="Track customer order status and measurements at /customerindex"
            >
              <UserCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-teal-700 shrink-0" />
              <span className="text-[11px] sm:text-xs">Customer Portal</span>
            </button>

            <button
              onClick={() => openAuthModal('login')}
              className="min-h-[38px] px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold flex items-center gap-1 sm:gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
            >
              <LogIn className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 shrink-0" />
              <span className="text-[11px] sm:text-xs">Shop Login</span>
            </button>

            <button
              onClick={() => openAuthModal('signup')}
              className="min-h-[38px] px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs items-center gap-1.5 transition-all cursor-pointer active:scale-95 hidden sm:flex"
            >
              <UserPlus className="w-4 h-4 shrink-0" />
              <span>Register</span>
            </button>

            {/* Mobile Navigation Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="min-h-[38px] min-w-[38px] p-2 rounded-xl text-slate-700 hover:bg-slate-100 flex lg:hidden items-center justify-center cursor-pointer border border-slate-200"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden mt-2 pt-2 border-t border-slate-100 pb-2 space-y-1.5 animate-fadeIn">
            <button
              onClick={() => scrollToSection('features')}
              className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 rounded-lg flex items-center justify-between"
            >
              <span>Features & Tools</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
            <button
              onClick={() => scrollToSection('how-it-works')}
              className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 rounded-lg flex items-center justify-between"
            >
              <span>How It Works</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
            <button
              onClick={() => scrollToSection('pricing')}
              className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 rounded-lg flex items-center justify-between"
            >
              <span>Pricing Plans</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
            <button
              onClick={() => scrollToSection('testimonials')}
              className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 rounded-lg flex items-center justify-between"
            >
              <span>Boutique Reviews</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3.5 sm:p-6 lg:p-8 space-y-8 sm:space-y-12">
        {/* 2. Hero Showcase Section */}
        <section className="relative rounded-2xl sm:rounded-3xl bg-gradient-to-br from-emerald-50/80 via-white to-teal-50/60 p-4 sm:p-8 lg:p-10 text-slate-900 shadow-sm overflow-hidden border border-emerald-200/70">
          <div className="absolute top-0 right-0 opacity-5 translate-x-12 -translate-y-12 pointer-events-none">
            <Scissors className="w-48 h-48 sm:w-80 sm:h-80 text-emerald-800" />
          </div>

          <div className="max-w-3xl space-y-4 sm:space-y-5 relative z-10">
            <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full bg-emerald-100/80 border border-emerald-300/80 text-emerald-800 text-[10px] sm:text-xs font-extrabold shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 shrink-0" />
              <span>#1 Smart Ledger & Vault for Fashion Boutiques</span>
            </div>

            <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black leading-tight sm:leading-tight tracking-tight text-slate-900">
              Manage Customer Measurements, Orders & Payments <span className="text-emerald-700 block sm:inline">For Your Boutique</span>
            </h2>

            <p className="text-xs sm:text-base text-slate-600 leading-relaxed max-w-2xl font-normal">
              Replace physical measurement notebooks with an offline-first mobile CRM. Track boutique garment measurements, worker wage payouts, advance payments & trial dates with instant WhatsApp order slips.
            </p>

            {/* Hero CTAs */}
            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3.5 max-w-2xl">
              <button
                onClick={() => openAuthModal('signup')}
                className="min-h-[48px] px-5 sm:px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.99]"
              >
                <UserPlus className="w-4 h-4 shrink-0" />
                <span>Register Boutique</span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </button>

              <button
                onClick={() => openAuthModal('login')}
                className="min-h-[48px] px-4 sm:px-5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm rounded-xl shadow-2xs flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.99]"
              >
                <LogIn className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Boutique Login</span>
              </button>

              <button
                onClick={() => (onNavigateCustomerIndex ? onNavigateCustomerIndex() : openAuthModal('customer'))}
                className="min-h-[48px] px-4 sm:px-5 bg-teal-50 hover:bg-teal-100 text-teal-900 font-bold text-xs sm:text-sm rounded-xl border border-teal-200 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.99]"
              >
                <UserCheck className="w-4 h-4 text-teal-700 shrink-0" />
                <span>Customer Login & FitBook</span>
              </button>
            </div>

            {/* Trust badge */}
            <div className="pt-2 flex flex-wrap items-center gap-2 sm:gap-3 text-[11px] sm:text-xs text-slate-500 font-medium">
              <span className="text-emerald-700 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" /> 100% Free Starter Plan
              </span>
              <span>•</span>
              <span className="text-slate-600 flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Offline Room SQLite + Cloud Sync</span>
              </span>
            </div>
          </div>
        </section>

        {/* 3. Live Interactive Mockup Showcase */}
        <section className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl p-4 sm:p-8 shadow-sm">
          <div className="text-center max-w-2xl mx-auto mb-6 sm:mb-8">
            <span className="text-[10px] sm:text-xs font-extrabold text-emerald-800 uppercase tracking-widest bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              Boutique CRM Live Preview
            </span>
            <h3 className="text-xl sm:text-3xl font-black text-slate-900 mt-2.5 sm:mt-3">
              Everything Your Boutique Needs in One Modern Screen
            </h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Live Order Card Mockup */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200">
                  ORD-8492
                </span>
                <span className="text-xs font-bold text-amber-800 bg-amber-100 px-2.5 py-1 rounded-full border border-amber-200 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  Trial Tomorrow
                </span>
              </div>

              <div>
                <h4 className="text-sm sm:text-base font-bold text-slate-900">Rajesh Verma</h4>
                <p className="text-[11px] sm:text-xs text-slate-500">+91 98765 43210 • Delhi</p>
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200 text-xs space-y-1">
                <div className="flex justify-between font-bold text-slate-800">
                  <span>Garment: Gents 3-Piece Tuxedo</span>
                  <span className="text-emerald-700 font-extrabold">₹6,500</span>
                </div>
                <div className="flex justify-between text-slate-500 text-[11px]">
                  <span>Advance Paid: ₹2,500</span>
                  <span className="text-rose-600 font-bold">Balance: ₹4,000</span>
                </div>
              </div>

              <div className="pt-1">
                <div className="text-[10px] font-bold text-slate-500 mb-1 flex justify-between">
                  <span>Stitching Workflow Progress</span>
                  <span className="text-emerald-700 font-semibold">Stitching Stage</span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full w-[60%]" />
                </div>
              </div>
            </div>

            {/* Saved Measurements Vault Preview */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <span>📏 Measurement Vault</span>
                </h4>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                  Suits & Blazers
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-500 block font-bold">Chest</span>
                  <span className="font-extrabold text-emerald-700 text-xs sm:text-sm">40.5 Inches</span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-500 block font-bold">Waist</span>
                  <span className="font-extrabold text-emerald-700 text-xs sm:text-sm">34.0 Inches</span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-500 block font-bold">Shoulder</span>
                  <span className="font-extrabold text-emerald-700 text-xs sm:text-sm">18.5 Inches</span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-500 block font-bold">Inseam</span>
                  <span className="font-extrabold text-emerald-700 text-xs sm:text-sm">31.0 Inches</span>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 italic">
                * Pre-built spec templates for Kurtas, Sherwanis, Blouses, Shirts & Trousers.
              </p>
            </div>

            {/* WhatsApp Order Slip & Location Sharing */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-3">
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <MessageCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>WhatsApp Order Slip</span>
                  </h4>
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                    1-Click Share
                  </span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed mb-3">
                  Send digital order receipts directly to client WhatsApp with order specs, advance paid, due date, and your shop's Google Maps link.
                </p>

                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-[11px] font-mono leading-tight space-y-1">
                  <div>🧵 <strong>Rohit Couture Boutique - Order Slip #ORD-8492</strong></div>
                  <div>Client: Rajesh Verma</div>
                  <div>Trial Date: 14 Aug 2026</div>
                  <div className="text-emerald-700 font-semibold">📍 Google Maps Boutique Navigation attached</div>
                </div>
              </div>

              <button
                onClick={() => openAuthModal('signup')}
                className="min-h-[44px] w-full py-2.5 mt-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
              >
                <span>Try WhatsApp Order Slips</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </section>

        {/* 4. Detailed Feature Grid */}
        <section id="features" className="space-y-4 sm:space-y-6">
          <div className="text-center max-w-2xl mx-auto">
            <h3 className="text-xl sm:text-3xl font-black text-slate-900">
              Why 5,000+ Boutiques & Fashion Studios Rely on ShopScoper
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 mt-1.5 sm:mt-2">
              Designed specifically for designer boutique stitching, master artisan assignments, and daily ledger management.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 hover:border-emerald-300 hover:shadow-sm transition-all space-y-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-lg border border-emerald-100">
                📏
              </div>
              <h4 className="text-sm font-bold text-slate-900">Full Measurement Vault</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Chest, waist, inseam, collar, shoulder, sleeve & armhole specs for Suits, Sherwanis, Blouses & Kurtas.
              </p>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 hover:border-emerald-300 hover:shadow-sm transition-all space-y-2">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold text-lg border border-amber-100">
                ⏰
              </div>
              <h4 className="text-sm font-bold text-slate-900">Trial & Overdue Alerts</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Get real-time overdue alerts for pending trial dates so customer dresses are ready right on time.
              </p>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 hover:border-emerald-300 hover:shadow-sm transition-all space-y-2">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-lg border border-blue-100">
                👥
              </div>
              <h4 className="text-sm font-bold text-slate-900">Karigar & Artisan Staff Assignment</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Assign garments to master tailors and artisans, track estimated stitching hours, and log piece-rate wage payouts.
              </p>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 hover:border-emerald-300 hover:shadow-sm transition-all space-y-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-lg border border-emerald-100">
                💬
              </div>
              <h4 className="text-sm font-bold text-slate-900">WhatsApp Order Slips</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Send professional digital order receipts to customer mobile with attached Google Maps boutique location.
              </p>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 hover:border-emerald-300 hover:shadow-sm transition-all space-y-2">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-lg border border-indigo-100">
                📊
              </div>
              <h4 className="text-sm font-bold text-slate-900">Revenue & Advance Ledger</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Track cash/UPI advance payments, pending balance recoveries, and monthly boutique profit analytics.
              </p>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 hover:border-emerald-300 hover:shadow-sm transition-all space-y-2">
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-lg border border-teal-100">
                ⚡
              </div>
              <h4 className="text-sm font-bold text-slate-900">Offline Room SQLite DB</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Functions 100% offline in studio basements with automatic background Firebase Cloud synchronization.
              </p>
            </div>
          </div>
        </section>

        {/* 5. How It Works (3 Steps) */}
        <section id="how-it-works" className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl p-5 sm:p-10 text-center space-y-6 sm:space-y-8 shadow-sm">
          <div className="max-w-xl mx-auto">
            <span className="text-[10px] sm:text-xs font-extrabold text-emerald-800 uppercase tracking-widest bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              Simple 3-Step Setup
            </span>
            <h3 className="text-xl sm:text-3xl font-black text-slate-900 mt-2.5 sm:mt-3">
              Get Your Boutique Running Digitally in 2 Minutes
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 text-left">
            <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200 relative">
              <span className="w-8 h-8 rounded-full bg-emerald-600 text-white font-black text-sm flex items-center justify-center mb-3">
                1
              </span>
              <h4 className="text-sm font-bold text-slate-900 mb-1">Register Boutique with Mobile OTP</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Enter boutique name, city, and phone number. Get instant 6-digit OTP verification.
              </p>
            </div>

            <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200 relative">
              <span className="w-8 h-8 rounded-full bg-emerald-600 text-white font-black text-sm flex items-center justify-center mb-3">
                2
              </span>
              <h4 className="text-sm font-bold text-slate-900 mb-1">Add Customers & Measurements</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Save body measurements for Suits, Kurtas, or Blouses in your encrypted offline vault.
              </p>
            </div>

            <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200 relative">
              <span className="w-8 h-8 rounded-full bg-emerald-600 text-white font-black text-sm flex items-center justify-center mb-3">
                3
              </span>
              <h4 className="text-sm font-bold text-slate-900 mb-1">Track Orders & Send Slips</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Assign artisans, manage trial dates, and send 1-click WhatsApp order receipts to clients.
              </p>
            </div>
          </div>
        </section>

        {/* 6. Pricing Plans */}
        <section id="pricing" className="space-y-4 sm:space-y-6">
          <div className="text-center max-w-xl mx-auto">
            <h3 className="text-xl sm:text-3xl font-black text-slate-900">
              Transparent, Boutique-Friendly Pricing
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              Start 100% free with local Room DB, or upgrade for cloud backup.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 max-w-4xl mx-auto">
            {/* Free Trial Plan */}
            <div className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl p-5 sm:p-6 space-y-4 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-200">
                  1-Month Free Trial
                </span>
                <div className="mt-4">
                  <span className="text-3xl sm:text-4xl font-black text-slate-900">₹0</span>
                  <span className="text-xs text-slate-500"> / First 30 Days Free</span>
                </div>
                <p className="text-xs text-slate-600 mt-2">
                  Complete access to all boutique tools for 1 full month from registration date.
                </p>

                <ul className="mt-5 sm:mt-6 space-y-2 sm:space-y-2.5 text-xs text-slate-600">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Unlimited Stitch Orders & FitBook Measurements</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Real-time Multi-Device Cloud Sync</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>1-Click WhatsApp Receipts & Fitting Slips</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Artisan Worker Ledger & Wage Tracking</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={() => openAuthModal('signup')}
                className="min-h-[44px] w-full py-3 mt-4 sm:mt-6 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-xs active:scale-95"
              >
                Start 1-Month Free Trial
              </button>
            </div>

            {/* Pro Plan */}
            <div className="bg-gradient-to-b from-emerald-50/80 via-white to-teal-50/50 border-2 border-emerald-600 rounded-2xl sm:rounded-3xl p-5 sm:p-6 space-y-4 shadow-md relative flex flex-col justify-between">
              <span className="absolute -top-3.5 right-4 sm:right-6 text-[10px] font-black text-white bg-emerald-800 px-3 py-1 rounded-full uppercase tracking-wider shadow-xs">
                ⭐ Best Value • Save ₹389
              </span>

              <div>
                <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-200">
                  Boutique Pro License
                </span>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-black text-slate-900">₹199</span>
                  <span className="text-xs text-slate-500 font-medium">/ month</span>
                  <span className="text-xs text-slate-400">or</span>
                  <span className="text-lg font-black text-emerald-800">₹1,999</span>
                  <span className="text-xs text-slate-500 font-medium">/ year</span>
                </div>
                <p className="text-xs text-slate-600 mt-2">
                  For established boutiques, couture designers, and high-volume master tailoring shops.
                </p>

                <ul className="mt-5 sm:mt-6 space-y-2 sm:space-y-2.5 text-xs text-slate-700">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span><strong>Unlimited</strong> Stitch Orders & Customer Profiles</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Artisan Worker Assignment & Wage Tracker</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Firebase Cloud Auto-Backup & Sync</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>UPI & Instant QR Payment Gateway</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Revenue & Monthly Profit Analytics</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={() => openAuthModal('signup')}
                className="min-h-[44px] w-full py-3 mt-4 sm:mt-6 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer active:scale-95"
              >
                Upgrade to Pro (₹199/mo | ₹1,999/yr)
              </button>
            </div>
          </div>
        </section>

        {/* 7. Customer Testimonials */}
        <section id="testimonials" className="space-y-4 sm:space-y-6">
          <div className="text-center max-w-xl mx-auto">
            <h3 className="text-xl sm:text-3xl font-black text-slate-900">
              Loved by Boutique Designers Across India
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 sm:gap-4">
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-2.5 sm:space-y-3 shadow-2xs">
              <div className="flex text-amber-500 gap-1 text-sm">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              </div>
              <p className="text-xs text-slate-600 leading-relaxed italic">
                "No more lost paper notebooks! The WhatsApp order slips with my Google Maps boutique link made my brand look super professional."
              </p>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Rohit Sharma</h4>
                <p className="text-[10px] text-slate-500">Rohit Couture Studio, New Delhi</p>
              </div>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-2.5 sm:space-y-3 shadow-2xs">
              <div className="flex text-amber-500 gap-1 text-sm">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              </div>
              <p className="text-xs text-slate-600 leading-relaxed italic">
                "Managing 5 karigars and tracking trial dates was a headache before. ShopScoper overdue alerts saved my boutique reputation!"
              </p>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Ananya Rathore</h4>
                <p className="text-[10px] text-slate-500">Ethnic Couture Studio, Jaipur</p>
              </div>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-2.5 sm:space-y-3 shadow-2xs sm:col-span-2 md:col-span-1">
              <div className="flex text-amber-500 gap-1 text-sm">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              </div>
              <p className="text-xs text-slate-600 leading-relaxed italic">
                "Works completely offline in my studio basement where mobile signal is weak. Best app for Indian fashion boutiques!"
              </p>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Haji Abdul Qadir</h4>
                <p className="text-[10px] text-slate-500">Royal Sherwani Boutique, Hyderabad</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* 8. Bottom Footer */}
      <footer className="border-t border-slate-200 bg-white px-4 sm:px-8 py-6 sm:py-8 text-xs text-slate-500 mt-8 sm:mt-12">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 sm:gap-6 text-center sm:text-left">
          <div className="flex items-center gap-3">
            <BrandLogo size="sm" variant="default" />
            <div>
              <span className="font-bold text-slate-900 block">ShopScopers Boutique CRM & Ledger</span>
              <span className="text-[11px] text-slate-500">Offline Room SQLite & Firebase Cloud Synchronized</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 font-semibold text-slate-600 text-xs">
            <button
              onClick={() => onNavigatePolicy && onNavigatePolicy('terms')}
              className="hover:text-emerald-700 transition-colors cursor-pointer py-1"
            >
              Terms of Service
            </button>
            <button
              onClick={() => onNavigatePolicy && onNavigatePolicy('privacy')}
              className="hover:text-emerald-700 transition-colors cursor-pointer py-1"
            >
              Privacy Policy
            </button>
            <button
              onClick={() => onNavigatePolicy && onNavigatePolicy('refund')}
              className="hover:text-emerald-700 transition-colors cursor-pointer py-1"
            >
              Refund Policy
            </button>
            <button
              onClick={() => (onNavigateCustomerIndex ? onNavigateCustomerIndex() : openAuthModal('customer'))}
              className="text-teal-700 font-bold hover:underline transition-colors cursor-pointer py-1"
            >
              Customer Portal (/customerindex)
            </button>
          </div>

          <p className="text-slate-400 text-[11px]">© 2026 ShopScoper Inc. All Rights Reserved.</p>
        </div>
      </footer>

      {/* Mobile Sticky Quick Action Bar (Only on small screens) */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-3 py-2 sm:hidden flex items-center justify-around gap-2 shadow-lg">
        <button
          onClick={() => openAuthModal('signup')}
          className="flex-1 min-h-[44px] bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition-transform active:scale-95"
        >
          <UserPlus className="w-3.5 h-3.5 shrink-0" />
          <span>Register Boutique</span>
        </button>
        <button
          onClick={() => openAuthModal('login')}
          className="flex-1 min-h-[44px] bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition-transform active:scale-95"
        >
          <LogIn className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>Boutique Login</span>
        </button>
        <button
          onClick={() => (onNavigateCustomerIndex ? onNavigateCustomerIndex() : openAuthModal('customer'))}
          className="min-h-[44px] px-3 bg-teal-50 hover:bg-teal-100 active:bg-teal-200 text-teal-900 font-bold text-xs rounded-xl flex items-center justify-center gap-1 border border-teal-200 transition-transform active:scale-95"
          title="Track customer order at /customerindex"
        >
          <UserCheck className="w-3.5 h-3.5 text-teal-700 shrink-0" />
          <span>Customer</span>
        </button>
      </div>

      {/* 9. Interactive Auth Pop-in Modal */}
      <AuthModal
        isOpen={authModalOpen}
        initialTab={authModalTab}
        onClose={closeAuthModal}
        onAuthSuccess={handleAuthComplete}
        onCustomerAuthSuccess={onCustomerAuthSuccess}
        onNavigatePolicy={onNavigatePolicy}
      />
    </div>
  );
};

