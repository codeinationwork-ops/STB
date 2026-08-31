import React, { useState, useMemo } from 'react';
import {
  Search,
  Smartphone,
  UserCheck,
  ArrowRight,
  Shield,
  Scissors,
  Sparkles,
  Shirt,
  Calendar,
  Clock,
  Download,
  FileText,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  Phone,
  LogIn,
  Store,
  ChevronDown,
} from 'lucide-react';
import { roomDb } from '../../lib/localRoomDb';
import { TailorOrder, TailorCustomer, ShopProfile } from '../../types';
import { BrandLogo } from './BrandLogo';
import { getClean10DigitPhone } from './AuthSuitePage';
import { formatDisplayPhone } from '../../lib/phoneUtils';

interface CustomerIndexPageProps {
  onCustomerAuthSuccess: (phoneNumber: string) => void;
  onNavigateOwnerLogin: () => void;
  onNavigatePolicy?: (policy: 'terms' | 'privacy' | 'refund') => void;
  onNavigateCatalogue?: () => void;
}

export const CustomerIndexPage: React.FC<CustomerIndexPageProps> = ({
  onCustomerAuthSuccess,
  onNavigateOwnerLogin,
  onNavigatePolicy,
  onNavigateCatalogue,
}) => {
  const [phoneInput, setPhoneInput] = useState('');
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [searchedOrder, setSearchedOrder] = useState<TailorOrder | null>(null);
  const [searchHasRun, setSearchHasRun] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  // Live data subscriptions
  const allOrders = useMemo(() => roomDb.getOrders(), []);
  const allCustomers = useMemo(() => roomDb.getCustomers(), []);
  const shopProfile = useMemo(() => roomDb.getShopProfile(), []);

  // Demo suggestions from existing database
  const demoCustomers = useMemo(() => {
    const list: { name: string; phone: string; count: number }[] = [];
    const seen = new Set<string>();

    allOrders.forEach((o) => {
      const clean = getClean10DigitPhone(o.customerPhone);
      if (clean && !seen.has(clean)) {
        seen.add(clean);
        list.push({
          name: o.customerName || 'Customer',
          phone: clean,
          count: allOrders.filter((ord) => getClean10DigitPhone(ord.customerPhone) === clean).length,
        });
      }
    });

    if (list.length === 0) {
      return [
        { name: 'Rajesh Verma', phone: '9876543210', count: 2 },
        { name: 'Priya Sharma', phone: '9811223344', count: 1 },
      ];
    }
    return list.slice(0, 4);
  }, [allOrders]);

  const handlePhoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = getClean10DigitPhone(phoneInput);
    if (!clean || clean.length !== 10) {
      setErrorMsg('Please enter a valid 10-digit mobile number.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');
    setTimeout(() => {
      setIsSubmitting(false);
      onCustomerAuthSuccess(clean);
    }, 400);
  };

  const handleOrderLookup = (e: React.FormEvent) => {
    e.preventDefault();
    const q = orderSearchQuery.trim().toLowerCase().replace(/^#+/, '');
    if (!q) return;

    setSearchHasRun(true);
    const cleanQ = getClean10DigitPhone(q);

    const found = allOrders.find((o) => {
      const idMatch = o.id.toLowerCase().replace(/^#+/, '') === q || o.id.toLowerCase() === q;
      const phoneMatch = cleanQ && getClean10DigitPhone(o.customerPhone) === cleanQ;
      return idMatch || phoneMatch;
    });

    setSearchedOrder(found || null);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 font-sans flex flex-col justify-between selection:bg-emerald-200 selection:text-emerald-950 overflow-x-hidden pb-16 sm:pb-0">
      {/* 1. Header Navigation */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 px-3.5 sm:px-8 py-2.5 sm:py-3.5 shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo & Brand */}
          <div
            className="flex items-center gap-2 sm:gap-3 cursor-pointer select-none"
            onClick={() => {
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          >
            <BrandLogo size="sm" variant="default" />
            <div>
              <h1 className="text-sm sm:text-lg font-black tracking-tight text-slate-900 flex items-center gap-1.5 sm:gap-2">
                <span>ShopScopers</span>
                <span className="bg-teal-600 text-white text-[9px] sm:text-[10px] font-extrabold px-1.5 sm:px-2 py-0.5 rounded-full uppercase tracking-wider">
                  FitBook Portal
                </span>
              </h1>
              <p className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider sm:tracking-widest hidden xs:block">
                Customer Order Tracking & Measurements Vault
              </p>
            </div>
          </div>

          {/* Header Action: Shop Owner Switch Button */}
          <div className="flex items-center gap-2">
            <button
              onClick={onNavigateOwnerLogin}
              className="min-h-[38px] px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
            >
              <Store className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="text-[11px] sm:text-xs">Boutique Login</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-3.5 sm:p-6 lg:p-8 space-y-6 sm:space-y-10">
        {/* Banner: Notice about separation */}
        <div className="bg-emerald-50/90 border border-emerald-200/80 rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 shadow-2xs">
          <div className="flex items-center gap-2.5 text-xs text-emerald-950">
            <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              <strong>Customer Hub:</strong> Look up order progress, fit trial dates, and personal body measurement vaults.
            </span>
          </div>
          <button
            onClick={onNavigateOwnerLogin}
            className="text-[11px] font-extrabold text-emerald-800 hover:text-emerald-950 underline flex items-center gap-1 cursor-pointer shrink-0"
          >
            <span>Are you a Boutique Owner? Log In Here</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {/* 3. Hero & Login Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Customer Login Form */}
          <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl sm:rounded-3xl p-5 sm:p-7 shadow-sm space-y-5">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-[10px] font-extrabold uppercase tracking-wider mb-2">
                <span>🧵 Secure Customer Access</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Log In to Your FitBook & Orders
              </h2>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Enter the mobile number you shared with your fashion boutique when placing your stitch or alteration order.
              </p>
            </div>

            <form onSubmit={handlePhoneSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-teal-700" />
                  <span>Your 10-Digit Mobile Number</span>
                </label>
                <div className="flex items-center border-2 border-slate-200 rounded-xl bg-slate-50/50 overflow-hidden focus-within:border-teal-600 focus-within:bg-white transition-all shadow-2xs">
                  <span className="px-3 py-2.5 text-xs font-extrabold text-slate-700 bg-slate-100 border-r border-slate-200">
                    🇮🇳 +91
                  </span>
                  <input
                    type="tel"
                    maxLength={10}
                    required
                    autoFocus
                    value={phoneInput}
                    onChange={(e) => {
                      setPhoneInput(e.target.value.replace(/\D/g, ''));
                      setErrorMsg('');
                    }}
                    placeholder="Enter 10-digit mobile number"
                    className="w-full bg-transparent px-3 py-2.5 text-sm font-bold text-slate-900 outline-none"
                  />
                </div>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting || phoneInput.length < 10}
                className="w-full min-h-[48px] bg-teal-700 hover:bg-teal-800 active:bg-teal-900 disabled:opacity-50 text-white font-bold text-xs sm:text-sm rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.99]"
              >
                <UserCheck className="w-4 h-4 shrink-0" />
                <span>Open FitBook & Orders</span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </button>
            </form>

            {/* Quick Demo Customer Quick-Select */}
            {demoCustomers.length > 0 && (
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Quick Demo Phone Fill:
                </span>
                <div className="flex flex-wrap gap-2">
                  {demoCustomers.map((c, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setPhoneInput(c.phone);
                        setErrorMsg('');
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-teal-50 hover:text-teal-900 hover:border-teal-300 border border-slate-200 text-[11px] font-semibold text-slate-700 transition-all cursor-pointer text-left"
                    >
                      <span>{c.name}</span>
                      <span className="text-[10px] text-slate-400 block font-mono">
                        {formatDisplayPhone(c.phone)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium pt-1">
              <Shield className="w-3.5 h-3.5 text-teal-600 shrink-0" />
              <span>No password required • Direct verification with your registered phone number</span>
            </div>
          </div>

          {/* Right Column: Quick Single-Order Search by Order ID */}
          <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl sm:rounded-3xl p-5 sm:p-7 shadow-sm space-y-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-800 text-[10px] font-extrabold uppercase tracking-wider mb-2">
                <Search className="w-3 h-3 text-slate-600" />
                <span>Instant Slip Lookup</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Track by Order Number
              </h2>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Enter your Order ID (e.g. <strong>ORD-8492</strong> or <strong>8492</strong>) printed on your receipt.
              </p>
            </div>

            <form onSubmit={handleOrderLookup} className="space-y-3">
              <div className="flex items-center border-2 border-slate-200 rounded-xl bg-slate-50/50 overflow-hidden focus-within:border-slate-800 focus-within:bg-white transition-all shadow-2xs">
                <input
                  type="text"
                  value={orderSearchQuery}
                  onChange={(e) => setOrderSearchQuery(e.target.value)}
                  placeholder="e.g. ORD-8492 or ORD-2026-1001"
                  className="w-full bg-transparent px-3 py-2.5 text-sm font-bold text-slate-900 outline-none"
                />
                <button
                  type="submit"
                  className="min-h-[44px] px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Track</span>
                </button>
              </div>
            </form>

            {/* Lookup Result Box */}
            {searchHasRun && (
              <div className="mt-4 pt-4 border-t border-slate-100 animate-fadeIn">
                {searchedOrder ? (
                  <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-emerald-900 bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200">
                        {searchedOrder.id}
                      </span>
                      <span className="text-xs font-extrabold uppercase px-2.5 py-1 rounded-lg bg-emerald-600 text-white">
                        {searchedOrder.status}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{searchedOrder.customerName}</h4>
                      <p className="text-xs text-slate-600">{searchedOrder.garmentType} • {searchedOrder.fabricDetails || 'Custom Fabric'}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs bg-white p-3 rounded-xl border border-emerald-100">
                      <div>
                        <span className="text-[10px] text-slate-500 block font-semibold">Promised Delivery</span>
                        <span className="font-bold text-slate-800">{searchedOrder.dueDate || 'In 3 Days'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block font-semibold">Balance Due</span>
                        <span className={`font-bold ${searchedOrder.balanceDue > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                          ₹{searchedOrder.balanceDue || 0}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => onCustomerAuthSuccess(searchedOrder.customerPhone)}
                      className="w-full min-h-[40px] py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                    >
                      <span>View Full Order Details & FitBook</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 space-y-2">
                    <p className="font-bold flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-amber-700" />
                      <span>Order not found with code "{orderSearchQuery}"</span>
                    </p>
                    <p className="text-[11px] text-amber-800">
                      Please check the Order ID on your receipt slip or enter your 10-digit mobile number on the left.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Quick Helper features */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2 text-xs text-slate-600">
              <div className="font-bold text-slate-800 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                <span>What you can do in Customer Portal:</span>
              </div>
              <ul className="space-y-1 text-[11px] text-slate-600 pl-4 list-disc">
                <li>View live tailoring progress (Cutting, Stitching, Trial, Ready)</li>
                <li>Access your exact stored measurements anytime</li>
                <li>Download and share official GST / digital invoice slips</li>
                <li>One-tap WhatsApp direct contact with your boutique designer</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 4. Feature Highlights Grid for Customers */}
        <section className="space-y-4 pt-2">
          <div className="text-center max-w-xl mx-auto">
            <h3 className="text-xl sm:text-2xl font-black text-slate-900">
              Why Customers Love ShopScoper FitBook
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Your personalized digital tailoring locker in your pocket
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-2 shadow-2xs">
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-lg border border-teal-100">
                📏
              </div>
              <h4 className="text-sm font-bold text-slate-900">Portable FitBook</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Never get measured twice. Access your blouses, suits, and pants measurements anytime to share with any boutique.
              </p>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-2 shadow-2xs">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-lg border border-emerald-100">
                ⏱️
              </div>
              <h4 className="text-sm font-bold text-slate-900">Live Stitch Tracker</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Check whether your outfit is under fabric cutting, active stitching, or ready for trial fitting.
              </p>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-2 shadow-2xs">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold text-lg border border-amber-100">
                🧾
              </div>
              <h4 className="text-sm font-bold text-slate-900">Digital Invoices</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                View total stitch prices, advance deposits paid, and remaining balance due with downloadable PDF slips.
              </p>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-2 shadow-2xs">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-lg border border-blue-100">
                💬
              </div>
              <h4 className="text-sm font-bold text-slate-900">1-Tap WhatsApp</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Direct WhatsApp connectivity with boutique designers and master artisans for alterations, fitting changes & updates.
              </p>
            </div>
          </div>
        </section>

        {/* 5. Frequently Asked Questions */}
        <section className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl p-5 sm:p-8 space-y-4 shadow-sm">
          <div className="max-w-xl">
            <h3 className="text-lg sm:text-xl font-black text-slate-900">
              Customer Frequently Asked Questions
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Quick answers about your orders, measurement privacy, and tracking.
            </p>
          </div>

          <div className="space-y-2.5 pt-2">
            {[
              {
                q: 'How do I log in to see my measurements?',
                a: 'Simply enter the 10-digit mobile number you gave to your boutique when placing your order. No password is required.',
              },
              {
                q: 'Where can I find my Order ID?',
                a: 'Your Order ID (e.g. ORD-8492) is sent to you via WhatsApp SMS and printed at the top of your physical or digital receipt.',
              },
              {
                q: 'Can I share my FitBook measurements with other shops?',
                a: 'Yes! Inside the FitBook tab, you can click "Copy Measurements" or "Share on WhatsApp" to send your complete body measurements to any boutique.',
              },
              {
                q: 'Are my personal measurements private?',
                a: 'Yes. All measurements and contact records are encrypted and only accessible by entering your verified mobile number.',
              },
            ].map((item, idx) => (
              <div key={idx} className="border border-slate-200 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                  className="w-full p-3.5 text-left font-bold text-xs sm:text-sm text-slate-900 flex items-center justify-between bg-slate-50/50 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <span>{item.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${
                      activeFaq === idx ? 'transform rotate-180' : ''
                    }`}
                  />
                </button>
                {activeFaq === idx && (
                  <div className="p-3.5 text-xs text-slate-600 bg-white border-t border-slate-200 leading-relaxed animate-fadeIn">
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* 6. Footer */}
      <footer className="border-t border-slate-200 bg-white px-4 sm:px-8 py-6 text-xs text-slate-500 mt-8">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex items-center gap-3">
            <BrandLogo size="sm" variant="default" />
            <div>
              <p className="font-bold text-slate-800">ShopScopers FitBook Customer Portal</p>
              <p className="text-[10px] text-slate-400">© 2026 ShopScoper Technologies. All rights reserved.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 font-semibold text-slate-600 text-xs">
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
              onClick={onNavigateOwnerLogin}
              className="text-teal-700 font-bold hover:underline transition-colors cursor-pointer py-1"
            >
              Boutique Login (/)
            </button>
          </div>
        </div>
      </footer>

      {/* 7. Mobile Sticky Quick Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-3 py-2 sm:hidden flex items-center justify-around gap-2 shadow-lg">
        <button
          onClick={() => {
            const input = document.querySelector('input[type="tel"]') as HTMLInputElement;
            if (input) {
              input.focus();
              input.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }}
          className="flex-1 min-h-[44px] bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition-transform active:scale-95"
        >
          <Smartphone className="w-3.5 h-3.5 shrink-0" />
          <span>Enter Mobile</span>
        </button>
        <button
          onClick={onNavigateOwnerLogin}
          className="flex-1 min-h-[44px] bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition-transform active:scale-95"
        >
          <Store className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>Boutique Login</span>
        </button>
      </div>
    </div>
  );
};
