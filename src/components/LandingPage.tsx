import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  ArrowRight,
  Download,
  Users,
  CheckCircle2,
  Phone,
  MessageSquare,
  ShieldCheck,
  TrendingUp,
  Layers,
  ShoppingBag,
  Scissors,
  Smartphone,
  Zap,
  Package,
  Sparkle,
  FileText,
  Clock,
  MapPin,
  X
} from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { PolicyPages, PolicyType } from './PolicyPages';
import { Product } from '../types';

interface LandingPageProps {
  onNavigateLogin: () => void;
  onNavigateExplore: () => void;
  onNavigateAdmin?: () => void;
  onNavigatePolicy?: (policy: PolicyType) => void;
  isAuthenticated: boolean;
  userName?: string;
  onLogout?: () => void;
  onProductsAddedToGlobalCatalog?: (products: Product[]) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onNavigateLogin,
  onNavigateExplore,
  onNavigateAdmin,
  onNavigatePolicy,
  isAuthenticated,
  userName,
  onLogout
}) => {
  const [partnerModalOpen, setPartnerModalOpen] = useState(false);
  const [partnerSuccess, setPartnerSuccess] = useState(false);
  const [partnerForm, setPartnerForm] = useState({ name: '', phone: '', shopName: '', city: '' });

  const handlePartnerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnerForm.phone || !partnerForm.name) return;
    setPartnerSuccess(true);
    setTimeout(() => {
      setPartnerSuccess(false);
      setPartnerModalOpen(false);
      setPartnerForm({ name: '', phone: '', shopName: '', city: '' });
    }, 2500);
  };

  const handleDownloadClick = () => {
    setPartnerModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#FDFCFB] text-slate-900 flex flex-col font-sans relative overflow-x-hidden selection:bg-amber-500 selection:text-white">
      
      {/* Background Atmosphere Mesh */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] sm:w-[1100px] h-[500px] bg-gradient-to-b from-amber-100/60 via-orange-50/40 to-transparent rounded-full blur-3xl opacity-80" />
        <div className="absolute inset-0 bg-[radial-gradient(#d97706_0.8px,transparent_0.8px)] [background-size:32px_32px] opacity-[0.04]" />
      </div>

      {/* HEADER: Professional Sticky Header Bar */}
      <header className="sticky top-0 z-30 w-full border-b border-amber-200/60 bg-white/90 backdrop-blur-xl px-4 lg:px-8 h-[68px] sm:h-[76px] flex items-center justify-between gap-4 max-w-7xl mx-auto shadow-2xs">
        {/* Brand Logo */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <BrandLogo size="md" />
          </div>
        </div>

        {/* Center Navigation Links */}
        <div className="hidden lg:flex items-center gap-6 font-mono text-xs font-bold text-slate-700">
          <a href="#features" className="hover:text-amber-600 transition-colors">Features</a>
          <a href="#why-choose" className="hover:text-amber-600 transition-colors">Why ShopScoper</a>
          <a href="#how-it-works" className="hover:text-amber-600 transition-colors">How It Works</a>
          <a href="#b2b-wholesale" className="hover:text-amber-600 transition-colors">B2B Wholesale</a>
          <button onClick={() => setPartnerModalOpen(true)} className="text-amber-600 hover:text-amber-700 font-extrabold flex items-center gap-1 cursor-pointer">
            <Zap className="w-3.5 h-3.5 fill-amber-500" />
            <span>Tailor Partner Program</span>
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => setPartnerModalOpen(true)}
            className="h-[38px] sm:h-[42px] px-4 sm:px-5 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-mono font-bold text-xs sm:text-sm shadow-md flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <span>Partner Onboarding</span>
            <ArrowRight className="w-4 h-4 shrink-0 text-amber-400" />
          </button>
        </div>
      </header>

      <main className="relative z-10 flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-8 sm:pt-14 pb-16 flex flex-col gap-16 sm:gap-24">

        {/* 1. HERO SECTION (Above the Fold) */}
        <section className="text-center max-w-4xl mx-auto flex flex-col items-center gap-6 pt-2 sm:pt-6">
          {/* Animated Badge */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-50 border border-amber-200/90 text-amber-800 font-mono text-xs sm:text-sm font-extrabold shadow-2xs"
          >
            <Scissors className="w-4 h-4 text-amber-600" />
            <span>Tailor Ledger &amp; Direct B2B Supply Platform</span>
          </motion.div>

          {/* Main Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-950 tracking-tight leading-[1.12]"
          >
            Digitize Your Tailoring Shop.{' '}
            <span className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 bg-clip-text text-transparent">
              Zero Upfront Costs. Zero Risk.
            </span>
          </motion.h1>

          {/* Sub-headline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-slate-600 text-base sm:text-lg font-medium max-w-3xl leading-relaxed"
          >
            The ultimate workflow ledger and commerce platform built for local tailors and boutiques. Manage daily customer orders effortlessly, automate WhatsApp updates, and unlock high-margin wholesale fabric supplies—all from one app.
          </motion.p>

          {/* Call to Action (CTA) Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3.5 sm:gap-4 w-full sm:w-auto pt-2"
          >
            <button
              onClick={handleDownloadClick}
              className="w-full sm:w-auto h-[52px] sm:h-[58px] px-8 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 hover:brightness-105 text-white font-mono font-black text-sm sm:text-base shadow-xl shadow-amber-500/25 flex items-center justify-center gap-2.5 transition-all cursor-pointer group"
            >
              <Download className="w-5 h-5 group-hover:translate-y-0.5 transition-transform" />
              <span>Download ShopScoper Free</span>
            </button>

            <button
              onClick={() => setPartnerModalOpen(true)}
              className="w-full sm:w-auto h-[52px] sm:h-[58px] px-8 rounded-2xl bg-white hover:bg-slate-50 text-slate-900 border-2 border-slate-200 font-mono font-bold text-sm sm:text-base shadow-sm flex items-center justify-center gap-2.5 transition-all cursor-pointer"
            >
              <Users className="w-5 h-5 text-amber-600" />
              <span>Partner With Us as a Tailor</span>
            </button>
          </motion.div>

          {/* Micro-Trust Badges */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 pt-4 text-xs font-mono font-bold text-slate-500"
          >
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Pay Only ₹3 Per Order
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> 100% Free Setup &amp; Training
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Direct Mill Wholesale Fabric Access
            </span>
          </motion.div>
        </section>

        {/* 2. VALUE PROPOSITION GRID (Why Choose ShopScoper?) */}
        <section id="why-choose" className="scroll-mt-24">
          <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-14">
            <span className="text-xs font-mono font-extrabold tracking-widest text-amber-600 uppercase bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
              WHY CHOOSE SHOPSCOPER?
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-slate-950 tracking-tight mt-3">
              Engineered Specifically for Modern Tailoring Businesses
            </h2>
            <p className="text-slate-600 text-sm sm:text-base mt-2">
              Transforming traditional tailor shops with cutting-edge digital efficiency and direct wholesale power.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
            {/* Value Prop 1 */}
            <motion.div
              whileHover={{ y: -4 }}
              className="bg-white rounded-3xl p-7 border border-slate-200/90 shadow-sm hover:shadow-xl hover:border-amber-300 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center font-black text-xl mb-5 shadow-xs">
                  ₹3
                </div>
                <h3 className="text-xl font-extrabold text-slate-950 mb-2">No Heavy SaaS Fees</h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Unlike legacy software that charges expensive annual license fees, ShopScoper operates on a transparent pay-per-order model (just ₹3 per order). You only pay when your business makes money.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-mono font-bold text-amber-700">
                <span>Transparent Pay-Per-Order</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
            </motion.div>

            {/* Value Prop 2 */}
            <motion.div
              whileHover={{ y: -4 }}
              className="bg-white rounded-3xl p-7 border border-slate-200/90 shadow-sm hover:shadow-xl hover:border-amber-300 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center font-black text-xl mb-5 shadow-xs">
                  <Smartphone className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-extrabold text-slate-950 mb-2">Built for Local Realities</h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Designed specifically for unorganized and semi-organized tailors. If you know how to use WhatsApp, you can master ShopScoper in under 2 minutes.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-mono font-bold text-emerald-700">
                <span>Zero Training Needed</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
            </motion.div>

            {/* Value Prop 3 */}
            <motion.div
              whileHover={{ y: -4 }}
              className="bg-white rounded-3xl p-7 border border-slate-200/90 shadow-sm hover:shadow-xl hover:border-amber-300 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center font-black text-xl mb-5 shadow-xs">
                  <Package className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-extrabold text-slate-950 mb-2">Direct B2B Supply Chain</h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Stop running around local wholesale markets. Source high-demand fabrics, linings, threads, and accessories directly through the app at direct-mill wholesale pricing.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-mono font-bold text-blue-700">
                <span>Direct Mill Wholesale Pricing</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
            </motion.div>

            {/* Value Prop 4 */}
            <motion.div
              whileHover={{ y: -4 }}
              className="bg-white rounded-3xl p-7 border border-slate-200/90 shadow-sm hover:shadow-xl hover:border-amber-300 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="w-14 h-14 rounded-2xl bg-purple-50 border border-purple-200 text-purple-600 flex items-center justify-center font-black text-xl mb-5 shadow-xs">
                  <Sparkles className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-extrabold text-slate-950 mb-2">Virtual Try-Ons &amp; Custom Fashion</h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Empower your customers with cutting-edge virtual try-on technology, bridging custom tailoring with modern e-commerce convenience.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-mono font-bold text-purple-700">
                <span>Interactive AI Fitting Studio</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
            </motion.div>
          </div>
        </section>

        {/* 3. HOW IT WORKS (3-Step Simplicity) */}
        <section id="how-it-works" className="scroll-mt-24 bg-gradient-to-br from-slate-900 via-slate-950 to-amber-950 rounded-[36px] p-8 sm:p-12 text-white border border-amber-500/30 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16 relative z-10">
            <span className="text-xs font-mono font-extrabold tracking-widest text-amber-400 uppercase bg-amber-500/20 px-3.5 py-1.5 rounded-full border border-amber-500/30">
              3-STEP SIMPLICITY
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight mt-4">
              How ShopScoper Transforms Your Store
            </h2>
            <p className="text-slate-300 text-sm sm:text-base mt-2">
              Replace messy paper notebooks with a frictionless 3-step digital workflow.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
            {/* Step 1 */}
            <div className="bg-white/5 border border-white/10 rounded-3xl p-7 flex flex-col justify-between hover:bg-white/10 transition-all">
              <div>
                <div className="flex items-center justify-between mb-6">
                  <span className="w-12 h-12 rounded-2xl bg-amber-500 text-slate-950 font-black text-lg flex items-center justify-center shadow-lg shadow-amber-500/20">
                    01
                  </span>
                  <Scissors className="w-6 h-6 text-amber-400" />
                </div>
                <h3 className="text-xl font-extrabold text-white mb-2.5">Log Daily Orders</h3>
                <p className="text-slate-300 text-sm leading-relaxed">
                  Record customer measurements, due dates, and design notes digitally in seconds—replacing messy paper registers forever.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-white/10 text-xs font-mono text-amber-300">
                ✓ Paper Register Replacement
              </div>
            </div>

            {/* Step 2 */}
            <div className="bg-white/5 border border-white/10 rounded-3xl p-7 flex flex-col justify-between hover:bg-white/10 transition-all">
              <div>
                <div className="flex items-center justify-between mb-6">
                  <span className="w-12 h-12 rounded-2xl bg-emerald-500 text-slate-950 font-black text-lg flex items-center justify-center shadow-lg shadow-emerald-500/20">
                    02
                  </span>
                  <MessageSquare className="w-6 h-6 text-emerald-400" />
                </div>
                <h3 className="text-xl font-extrabold text-white mb-2.5">Automate &amp; Delight</h3>
                <p className="text-slate-300 text-sm leading-relaxed">
                  Send instant WhatsApp order updates, tracking alerts, and professional invoices directly to your clients.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-white/10 text-xs font-mono text-emerald-300">
                ✓ Automated WhatsApp Alerts
              </div>
            </div>

            {/* Step 3 */}
            <div className="bg-white/5 border border-white/10 rounded-3xl p-7 flex flex-col justify-between hover:bg-white/10 transition-all">
              <div>
                <div className="flex items-center justify-between mb-6">
                  <span className="w-12 h-12 rounded-2xl bg-purple-500 text-white font-black text-lg flex items-center justify-center shadow-lg shadow-purple-500/20">
                    03
                  </span>
                  <TrendingUp className="w-6 h-6 text-purple-400" />
                </div>
                <h3 className="text-xl font-extrabold text-white mb-2.5">Scale Your Earnings</h3>
                <p className="text-slate-300 text-sm leading-relaxed">
                  Access integrated raw material procurement and bulk fabric catalogs to increase your profit margins on every single garment stitched.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-white/10 text-xs font-mono text-purple-300">
                ✓ Wholesale Profit Booster
              </div>
            </div>
          </div>
        </section>

        {/* 4. B2B WHOLESALE BANNER SECTION */}
        <section id="b2b-wholesale" className="scroll-mt-24 rounded-3xl bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 text-white p-8 sm:p-12 shadow-xl flex flex-col lg:flex-row items-center justify-between gap-8 relative overflow-hidden">
          <div className="space-y-3 max-w-2xl relative z-10">
            <span className="px-3.5 py-1 rounded-full bg-white/20 text-white font-mono text-xs font-black uppercase tracking-wider">
              DIRECT MILL ACCESS
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight">
              Source Premium Fabrics &amp; Trims At Wholesale Mill Rates
            </h2>
            <p className="text-amber-100 text-sm sm:text-base font-medium">
              Eliminate middleman commissions. Order premium cotton, silk, linen, linings, buttons, and zips delivered directly to your shop counter.
            </p>
          </div>

          <button
            onClick={() => setPartnerModalOpen(true)}
            className="px-8 py-4 rounded-2xl bg-slate-950 hover:bg-slate-900 text-white font-mono font-black text-sm shadow-2xl flex items-center gap-2.5 shrink-0 transition-all cursor-pointer relative z-10"
          >
            <span>Access Wholesale Catalog</span>
            <ArrowRight className="w-4 h-4 text-amber-400" />
          </button>
        </section>

      </main>

      {/* 5. FOOTER & CONTACT BAR */}
      <footer className="relative z-10 bg-slate-950 text-slate-400 pt-12 pb-8 border-t border-slate-800 text-xs font-mono">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          
          {/* Top Row: Brand & Support Line */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-8 border-b border-slate-800">
            <div className="space-y-2">
              <BrandLogo size="md" />
              <p className="text-slate-400 text-xs font-sans max-w-md pt-1">
                ShopScoper operates as a workflow ledger and direct B2B supply ecosystem designed for local tailors, designers, and custom clothing boutiques.
              </p>
            </div>

            <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-1.5 font-sans">
              <div className="text-xs font-extrabold text-amber-400 uppercase font-mono tracking-wider flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5" /> Support &amp; WhatsApp Inquiry Line
              </div>
              <div className="text-slate-200 text-sm font-bold">Phone: 7608807790</div>
              <div className="text-slate-400 text-xs flex items-center gap-1">
                <Clock className="w-3 h-3 text-amber-500" /> Operating Hours: Monday - Friday (9:00 - 18:00)
              </div>
              <div className="text-slate-400 text-xs flex items-center gap-1">
                <MapPin className="w-3 h-3 text-amber-500" /> Office: Rajendrapur, Bhadrak- 756112, Orissa
              </div>
            </div>
          </div>

          {/* Quick Links Navigation Row */}
          <div className="flex flex-wrap items-center justify-between gap-4 font-bold text-slate-300">
            <div className="flex items-center gap-6 flex-wrap">
              <a href="#why-choose" className="hover:text-amber-400 transition-colors">Features</a>
              <span className="text-slate-700">•</span>
              <a href="#b2b-wholesale" className="hover:text-amber-400 transition-colors">B2B Wholesale</a>
              <span className="text-slate-700">•</span>
              <button onClick={() => setPartnerModalOpen(true)} className="hover:text-amber-400 transition-colors cursor-pointer">
                Tailor Partner Program
              </button>
              <span className="text-slate-700">•</span>
              <button onClick={() => onNavigatePolicy?.('privacy')} className="hover:text-amber-400 transition-colors cursor-pointer">
                Privacy Policy
              </button>
              <span className="text-slate-700">•</span>
              <button onClick={() => onNavigatePolicy?.('terms')} className="hover:text-amber-400 transition-colors cursor-pointer">
                Terms of Service
              </button>
              <span className="text-slate-700">•</span>
              <button onClick={() => onNavigatePolicy?.('refund')} className="hover:text-amber-400 transition-colors cursor-pointer">
                Refund &amp; Cancellation
              </button>
            </div>

            <div className="text-slate-500 text-[11px]">
              Platform Owner: 7608807790
            </div>
          </div>

          {/* Copyright Notice */}
          <div className="pt-4 border-t border-slate-900 text-center text-slate-500 text-xs">
            © 2026 ShopScoper Technologies. Empowering Local Tailoring Ecosystems.
          </div>
        </div>
      </footer>

      {/* Partner Registration Modal */}
      <AnimatePresence>
        {partnerModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-200 relative"
            >
              <button
                onClick={() => setPartnerModalOpen(false)}
                className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2 mb-2">
                <Scissors className="w-5 h-5 text-amber-600" />
                <span className="text-xs font-mono font-extrabold text-amber-600 uppercase">Tailor Partner Onboarding</span>
              </div>

              <h3 className="text-xl font-extrabold text-slate-900">Partner With ShopScoper</h3>
              <p className="text-xs text-slate-600 mt-1 mb-6">
                Register your store details to get free agent onboarding, software setup, and direct wholesale pricing access.
              </p>

              {partnerSuccess ? (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-5 rounded-2xl text-center space-y-2">
                  <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                  <h4 className="font-extrabold text-base">Application Received!</h4>
                  <p className="text-xs">Our store onboarding specialist will contact you on WhatsApp shortly.</p>
                </div>
              ) : (
                <form onSubmit={handlePartnerSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Owner Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Master Rajesh Kumar"
                      value={partnerForm.name}
                      onChange={(e) => setPartnerForm(f => ({ ...f, name: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">WhatsApp Mobile Number *</label>
                    <input
                      type="tel"
                      required
                      placeholder="e.g. 7608807790"
                      value={partnerForm.phone}
                      onChange={(e) => setPartnerForm(f => ({ ...f, phone: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Tailor / Shop Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Royal Crafts Boutique"
                      value={partnerForm.shopName}
                      onChange={(e) => setPartnerForm(f => ({ ...f, shopName: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">City / Location</label>
                    <input
                      type="text"
                      placeholder="e.g. Bhadrak, Orissa"
                      value={partnerForm.city}
                      onChange={(e) => setPartnerForm(f => ({ ...f, city: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-mono font-bold text-sm shadow-md transition-colors cursor-pointer mt-2"
                  >
                    Submit Partner Request
                  </button>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
