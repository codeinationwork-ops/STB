import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  ArrowRight,
  Search,
  Shirt,
  ShoppingBag,
  ExternalLink,
  Tag,
  CheckCircle2,
  Globe,
  PlusCircle,
  Trash2,
  ShieldCheck,
  Store,
  X
} from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { BrandRequestModals } from './BrandRequestModals';
import { ShopifyStoresPage } from './ShopifyStoresPage';

interface LandingPageProps {
  onNavigateLogin: () => void;
  onNavigateExplore: () => void;
  isAuthenticated: boolean;
  userName?: string;
  onLogout?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onNavigateLogin,
  onNavigateExplore,
  isAuthenticated,
  userName,
  onLogout
}) => {
  const [selectedBrandCategory, setSelectedBrandCategory] = useState<string>('All');
  const [removalModalOpen, setRemovalModalOpen] = useState(false);
  const [additionModalOpen, setAdditionModalOpen] = useState(false);
  const [isShopifyConnectOpen, setIsShopifyConnectOpen] = useState(false);

  // Direct D2C & High-Street Apparel Brands Catalog (Commercial marketplaces removed)
  const brandCatalog = [
    {
      id: 'snitch',
      name: 'Snitch',
      category: 'Streetwear',
      tagline: '380 GSM Heavyweight Hoodies & Cargos',
      badge: 'D2C Exclusive',
      badgeBg: 'bg-purple-50 text-purple-700 border-purple-200',
      logoText: 'SN',
      logoBg: 'bg-slate-900 text-white',
      items: 'Boxy Hoodies, Tactical Cargos',
      discount: 'Direct Official Store',
    },
    {
      id: 'souledstore',
      name: 'Souled Store',
      category: 'Streetwear',
      tagline: 'Licensed Pop Culture & Oversized Tees',
      badge: 'Viral Drops',
      badgeBg: 'bg-pink-50 text-pink-700 border-pink-200',
      logoText: 'TSS',
      logoBg: 'bg-red-600 text-white',
      items: 'Anime Hoodies, Street Cargos',
      discount: 'Up to 20% OFF',
    },
    {
      id: 'zara',
      name: 'Zara',
      category: 'Fast Fashion',
      tagline: 'High Street Fashion & Evening Wear',
      badge: 'Hot Drops',
      badgeBg: 'bg-slate-100 text-slate-800 border-slate-200',
      logoText: 'ZARA',
      logoBg: 'bg-black text-white',
      items: 'Dresses, Blazers, Co-ords',
      discount: 'Direct Official',
    },
    {
      id: 'hm',
      name: 'H&M',
      category: 'Fast Fashion',
      tagline: 'Trendy Everyday Essentials & Denim',
      badge: 'Live Deals',
      badgeBg: 'bg-rose-50 text-rose-600 border-rose-200',
      logoText: 'H&M',
      logoBg: 'bg-red-600 text-white',
      items: 'Summer Tops, Denim, Sweatshirts',
      discount: 'Up to 40% OFF',
    },
    {
      id: 'nike',
      name: 'Nike',
      category: 'Activewear',
      tagline: 'Athletic Performance & Sneakers',
      badge: 'Official',
      badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      logoText: 'N',
      logoBg: 'bg-black text-white',
      items: 'Sneakers, Leggings, Hoodies',
      discount: 'Direct Store',
    },
    {
      id: 'nobero',
      name: 'Nobero',
      category: 'Essentials',
      tagline: 'Minimalist Fleece Sweatshirts & Joggers',
      badge: 'Comfort Wear',
      badgeBg: 'bg-blue-50 text-blue-700 border-blue-200',
      logoText: 'NOB',
      logoBg: 'bg-indigo-900 text-white',
      items: 'Fleece Sweatshirts, Joggers',
      discount: 'Flat 10% OFF',
    },
    {
      id: 'uniqlo',
      name: 'Uniqlo',
      category: 'Essentials',
      tagline: 'Minimalist Japanese Lifewear',
      badge: 'Essentials',
      badgeBg: 'bg-slate-100 text-slate-800 border-slate-200',
      logoText: 'UQ',
      logoBg: 'bg-red-600 text-white',
      items: 'HEATTECH, Linen Shirts, Trousers',
      discount: 'Direct Store Price',
    },
    {
      id: 'urbanic',
      name: 'Urbanic',
      category: 'Fast Fashion',
      tagline: 'Y2K Aesthetics & Party Outfits',
      badge: 'Trending',
      badgeBg: 'bg-purple-50 text-purple-600 border-purple-200',
      logoText: 'U',
      logoBg: 'bg-purple-600 text-white',
      items: 'Cropped Tops, Tailored Trousers',
      discount: 'Flat 15% OFF',
    },
    {
      id: 'veirdo',
      name: 'Veirdo',
      category: 'Streetwear',
      tagline: 'Acid Wash Vintage Hoodies & Chinos',
      badge: 'Indie Style',
      badgeBg: 'bg-amber-50 text-amber-800 border-amber-200',
      logoText: 'VRD',
      logoBg: 'bg-amber-600 text-white',
      items: 'Puff Print Hoodies, Chino Trousers',
      discount: 'Up to 30% OFF',
    },
    {
      id: 'levis',
      name: 'Levi’s',
      category: 'Denim',
      tagline: 'Iconic Denim & Trucker Jackets',
      badge: 'Classic',
      badgeBg: 'bg-blue-50 text-blue-700 border-blue-200',
      logoText: '501',
      logoBg: 'bg-red-700 text-white',
      items: '501 Jeans, Jackets, Graphic Tees',
      discount: 'Best Fit Guaranteed',
    },
    {
      id: 'adidas',
      name: 'Adidas',
      category: 'Activewear',
      tagline: 'Sportswear & Street Originals',
      badge: 'Live',
      badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      logoText: 'ADI',
      logoBg: 'bg-black text-white',
      items: 'Ultraboost, Trackpants, Tees',
      discount: 'Official Outlet',
    },
    {
      id: 'puma',
      name: 'Puma',
      category: 'Activewear',
      tagline: 'Forever Faster Athleisure',
      badge: 'Hot Deals',
      badgeBg: 'bg-red-50 text-red-600 border-red-200',
      logoText: 'PMA',
      logoBg: 'bg-rose-900 text-white',
      items: 'Motorsport Wear, Sneakers',
      discount: 'Up to 40% OFF',
    }
  ];

  const brandFilterCategories = ['All', 'Streetwear', 'Fast Fashion', 'Activewear', 'Essentials', 'Denim'];

  const filteredBrands = selectedBrandCategory === 'All'
    ? brandCatalog
    : brandCatalog.filter(b => b.category === selectedBrandCategory);

  const handleAction = () => {
    if (isAuthenticated) {
      onNavigateExplore();
    } else {
      onNavigateLogin();
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9FF] text-slate-900 flex flex-col font-sans relative overflow-x-hidden selection:bg-[#6C3BFF] selection:text-white">
      
      {/* Background Atmosphere */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] sm:w-[1000px] h-[400px] sm:h-[600px] bg-gradient-to-b from-[#F6F2FF] via-[#F0E6FF]/50 to-transparent rounded-full blur-3xl opacity-80" />
        <div className="absolute inset-0 bg-[radial-gradient(#6C3BFF_1px,transparent_1px)] [background-size:28px_28px] opacity-[0.03]" />
      </div>

      {/* HEADER: Ultra Clean Header Bar */}
      <header className="sticky top-0 z-30 w-full border-b border-purple-100/80 bg-white/90 backdrop-blur-xl px-4 lg:px-8 h-[64px] sm:h-[70px] flex items-center justify-between gap-4 max-w-7xl mx-auto shadow-2xs">
        {/* Brand Logo */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <BrandLogo size="md" />
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => setIsShopifyConnectOpen(true)}
            className="h-[38px] sm:h-[42px] px-3.5 sm:px-4.5 rounded-full bg-slate-900 hover:bg-slate-800 text-emerald-400 font-mono font-bold text-xs sm:text-sm border border-slate-700 hover:border-emerald-500/50 shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
            title="Connect & Scrape Shopify Brand Store"
          >
            <Store className="w-4 h-4 text-emerald-400" />
            <span>Shopify Connect</span>
          </button>

          {isAuthenticated ? (
            <button
              onClick={onNavigateExplore}
              className="h-[38px] sm:h-[42px] px-4 sm:px-5 rounded-full bg-gradient-to-r from-[#6C3BFF] to-[#8B5CF6] hover:brightness-105 text-white font-mono font-bold text-xs sm:text-sm shadow-md shadow-purple-500/20 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <span>Studio Portal</span>
              <ArrowRight className="w-4 h-4 shrink-0" />
            </button>
          ) : (
            <button
              onClick={onNavigateLogin}
              className="h-[38px] sm:h-[42px] px-4 sm:px-5 rounded-full bg-gradient-to-r from-[#6C3BFF] to-[#8B5CF6] hover:brightness-105 text-white font-mono font-bold text-xs sm:text-sm shadow-md shadow-purple-500/20 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <span>Sign In / Register</span>
              <ArrowRight className="w-4 h-4 shrink-0" />
            </button>
          )}
        </div>
      </header>

      {/* SECTION 1: ANIMATED DISCOVER HERO HUB */}
      <main className="relative z-10 flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12 pb-16 flex flex-col gap-12 sm:gap-16">
        
        {/* Hero Title & Announcement Block */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="text-center max-w-4xl mx-auto flex flex-col items-center gap-4 pt-2 sm:pt-6"
        >
          {/* Animated Floating Pill Badge */}
          <motion.div
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-100/90 via-indigo-50/90 to-pink-100/90 border border-purple-200/80 text-[#6C3BFF] font-mono text-xs sm:text-sm font-bold shadow-sm"
          >
            <Sparkles className="w-4 h-4 text-[#6C3BFF] animate-spin" style={{ animationDuration: '6s' }} />
            <span>🇮🇳 India's #1 AI D2C Fashion Search &amp; Virtual Try-On Engine</span>
          </motion.div>

          {/* Main Hero Headline */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.12]">
            Discover Apparel &amp; Try On Outfits Across{' '}
            <span className="bg-gradient-to-r from-[#6C3BFF] via-purple-600 to-[#FF4D8D] bg-clip-text text-transparent">
              Top Direct D2C Brands
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-slate-600 text-sm sm:text-base font-medium max-w-2xl leading-relaxed">
            Instantly search and virtually fit dresses, hoodies, cargos, and streetwear across <strong>Snitch, Souled Store, Zara, H&amp;M, Nobero, Veirdo, Minimalist, and Urbanic</strong> with photorealistic AI fitting.
          </p>

          {/* Feature Micro-Pill Badges Row */}
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 pt-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-purple-100 text-slate-700 text-xs font-semibold shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
              100% Photorealistic AI Fitting
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-purple-100 text-slate-700 text-xs font-semibold shadow-2xs">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              50+ Verified D2C Brands
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-purple-100 text-slate-700 text-xs font-semibold shadow-2xs">
              <Globe className="w-3.5 h-3.5 text-blue-600" />
              Direct Store Prices &amp; Links
            </span>
          </div>

          {/* SHOPIFY CONNECT HOMEPAGE HERO CONNECTOR CARD */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            onClick={() => setIsShopifyConnectOpen(true)}
            className="w-full max-w-2xl mx-auto mt-2 p-4 sm:p-5 rounded-2xl bg-slate-950 border border-emerald-500/40 hover:border-emerald-400 shadow-xl shadow-emerald-950/20 hover:shadow-emerald-950/40 transition-all duration-300 cursor-pointer text-left group relative overflow-hidden"
          >
            {/* Ambient Background Radial Glow */}
            <div className="absolute -right-8 -bottom-8 w-36 h-36 bg-emerald-500/20 rounded-full blur-2xl group-hover:bg-emerald-500/30 transition-all pointer-events-none" />

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 relative z-10">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0 text-emerald-400 group-hover:scale-110 transition-transform">
                  <Store className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider">Shopify Connect</span>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">D2C Live Scraper</span>
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-white mt-0.5">Connect & Scrape Any Shopify Store</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Harvest items live, classify Men/Women/Unisex, & enable direct checkout on <strong className="text-slate-200">/</strong></p>
                </div>
              </div>

              <button className="w-full sm:w-auto px-4.5 py-2.5 rounded-xl bg-emerald-500 group-hover:bg-emerald-400 text-slate-950 font-mono font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 shrink-0 transition-all">
                <span>Launch Connector</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        </motion.div>

        {/* Animated Main Hero Try-On & Collection Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-7 items-stretch my-2 sm:my-4">
          
          {/* Virtual Try-On Studio Spotlight Card (Hero Main Box) */}
          <motion.div
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: 'easeOut' }}
            whileHover={{ y: -5, scale: 1.005 }}
            onClick={handleAction}
            className="lg:col-span-6 rounded-[28px] sm:rounded-[32px] bg-gradient-to-br from-purple-950 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 shadow-2xl shadow-purple-950/25 border border-purple-500/30 flex flex-col justify-between cursor-pointer relative overflow-hidden group min-h-[320px]"
          >
            {/* Background Glow Animation Mesh */}
            <motion.div
              animate={{ opacity: [0.3, 0.7, 0.3], scale: [0.9, 1.15, 0.9] }}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute -top-10 -right-10 w-72 h-72 bg-pink-500/30 rounded-full blur-3xl pointer-events-none"
            />
            <motion.div
              animate={{ opacity: [0.2, 0.6, 0.2], scale: [1.1, 0.85, 1.1] }}
              transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute -bottom-10 -left-10 w-72 h-72 bg-purple-500/30 rounded-full blur-3xl pointer-events-none"
            />

            <div className="relative z-10">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-pink-300 font-mono text-[11px] font-bold tracking-wider uppercase mb-4 shadow-inner">
                <Sparkles className="w-3.5 h-3.5 text-pink-400" />
                <span>AI VIRTUAL TRY-ON STUDIO</span>
              </div>

              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight leading-tight">
                Try On Any Outfit Virtually Before You Buy
              </h2>
              <p className="text-slate-300 text-xs sm:text-sm mt-3 max-w-md leading-relaxed">
                Upload your photo, select any dress or outfit from 50+ D2C fashion brands, and visualize how it fits on you with photorealistic AI precision.
              </p>
            </div>

            {/* Visual Try-On Preview Strip */}
            <div className="mt-8 pt-5 border-t border-white/15 flex items-center justify-between gap-3 relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 overflow-hidden shrink-0 flex items-center justify-center relative shadow-sm">
                  <img
                    src="/homegirl.png"
                    alt="Virtual Try On Model"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                  <Shirt className="w-6 h-6 text-pink-300" />
                </div>
                <div>
                  <div className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                    <span>Instant AI Outfit Fitting</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  </div>
                  <div className="text-[10px] sm:text-xs text-slate-300 font-mono mt-0.5">Snitch • Souled Store • Zara • Nobero</div>
                </div>
              </div>

              <div className="px-5 py-2.5 rounded-full bg-gradient-to-r from-[#FF4D8D] to-[#FF6BA8] text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-pink-500/25 group-hover:scale-105 transition-all shrink-0 cursor-pointer">
                <span>Try On Now</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </motion.div>

          {/* Men's Collection Card */}
          <motion.div
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
            whileHover={{ y: -5 }}
            onClick={handleAction}
            className="lg:col-span-3 rounded-[28px] sm:rounded-[32px] bg-white border border-[#ECE8FF] p-6 shadow-sm hover:shadow-xl hover:border-purple-200 transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden group min-h-[320px]"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-extrabold tracking-widest text-[#6C3BFF] uppercase font-mono bg-purple-50 px-2.5 py-1 rounded-full border border-purple-100">FOR HIM</span>
              <span className="text-[10px] px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 font-mono font-bold">12K+ Items</span>
            </div>

            <div className="my-3 flex justify-center items-center h-[150px] relative">
              <div className="absolute w-32 h-32 rounded-full bg-blue-50/80 -z-0 group-hover:scale-110 transition-transform duration-500" />
              <img
                src="/male_SS.png"
                alt="Men's Fashion India"
                className="relative z-10 max-h-[140px] object-contain group-hover:scale-108 transition-transform duration-300 filter drop-shadow-md"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?auto=format&fit=crop&w=400&q=80';
                }}
              />
            </div>

            <div>
              <h3 className="font-extrabold text-slate-900 text-base sm:text-lg">Men's Apparel &amp; Streetwear</h3>
              <p className="text-[11px] sm:text-xs text-slate-500 font-medium mt-0.5">Heavyweight Hoodies, Cargos &amp; Denim</p>
              
              <div className="mt-4 w-full py-2.5 rounded-2xl bg-purple-50 text-[#6C3BFF] font-bold text-xs flex items-center justify-center gap-1.5 group-hover:bg-[#6C3BFF] group-hover:text-white transition-all shadow-xs">
                <span>Explore Men's</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>
          </motion.div>

          {/* Women's Collection Card */}
          <motion.div
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease: 'easeOut' }}
            whileHover={{ y: -5 }}
            onClick={handleAction}
            className="lg:col-span-3 rounded-[28px] sm:rounded-[32px] bg-white border border-[#ECE8FF] p-6 shadow-sm hover:shadow-xl hover:border-pink-200 transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden group min-h-[320px]"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-extrabold tracking-widest text-[#FF4D8D] uppercase font-mono bg-pink-50 px-2.5 py-1 rounded-full border border-pink-100">FOR HER</span>
              <span className="text-[10px] px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 font-mono font-bold">18K+ Items</span>
            </div>

            <div className="my-3 flex justify-center items-center h-[150px] relative">
              <div className="absolute w-32 h-32 rounded-full bg-pink-50/80 -z-0 group-hover:scale-110 transition-transform duration-500" />
              <img
                src="/Female_SS.png"
                alt="Women's Fashion India"
                className="relative z-10 max-h-[140px] object-contain group-hover:scale-108 transition-transform duration-300 filter drop-shadow-md"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=400&q=80';
                }}
              />
            </div>

            <div>
              <h3 className="font-extrabold text-slate-900 text-base sm:text-lg">Women's Fashion &amp; Dresses</h3>
              <p className="text-[11px] sm:text-xs text-slate-500 font-medium mt-0.5">Dresses, Crop Tops &amp; Tailored Trousers</p>

              <div className="mt-4 w-full py-2.5 rounded-2xl bg-pink-50 text-[#FF4D8D] font-bold text-xs flex items-center justify-center gap-1.5 group-hover:bg-[#FF4D8D] group-hover:text-white transition-all shadow-xs">
                <span>Explore Women's</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>
          </motion.div>

        </div>

        {/* SECTION BREAK GAP & AI SEARCH LAUNCHPAD */}
        <div className="my-4 sm:my-8">
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            onClick={handleAction}
            className="rounded-[24px] sm:rounded-[28px] bg-gradient-to-r from-purple-50 via-white to-pink-50 border border-purple-200/90 p-5 sm:p-7 shadow-md flex flex-col lg:flex-row items-center justify-between gap-5 cursor-pointer hover:border-purple-300 hover:shadow-lg transition-all relative overflow-hidden group"
          >
            {/* Soft decorative background pulse */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-purple-200/30 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-center gap-4 w-full lg:w-auto relative z-10">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-[#6C3BFF] to-[#8B5CF6] text-white flex items-center justify-center shrink-0 shadow-md shadow-purple-500/20">
                <Search className="w-6 h-6 sm:w-7 sm:h-7" />
              </div>
              <div className="text-left">
                <div className="flex items-center gap-2">
                  <span className="text-sm sm:text-base font-extrabold text-slate-900">AI Natural Language Fashion Search</span>
                  <span className="px-2 py-0.5 rounded-full bg-purple-100 text-[#6C3BFF] text-[10px] font-mono font-bold">Gemini 2.5 Powered</span>
                </div>
                <div className="text-xs sm:text-sm text-slate-600 mt-1 font-medium">
                  Try searching: <span className="text-purple-700 font-semibold">"Snitch boxy hoodie under 1500"</span> or <span className="text-purple-700 font-semibold">"Floral evening dress for wedding"</span>
                </div>
              </div>
            </div>

            <button className="w-full lg:w-auto px-6 py-3.5 rounded-full bg-[#6C3BFF] hover:bg-purple-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shrink-0 shadow-md shadow-purple-500/20 transition-all cursor-pointer relative z-10">
              <Sparkles className="w-4 h-4 text-pink-300" />
              <span>Launch AI Search Engine</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>
        </div>

        {/* SECTION 2: ALL BRANDS & DIRECT SHOPPING CATALOG (WITH SPACIOUS VERTICAL GAP) */}
        <div className="pt-8 sm:pt-12 border-t border-purple-100/90 mt-4 sm:mt-8">
          
          {/* Header Row */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-[#6C3BFF] uppercase tracking-wider mb-1.5">
                <Globe className="w-4 h-4" />
                <span>DIRECT D2C BRAND CATALOG</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Explore &amp; Shop Directly From 50+ Top D2C Brands
              </h2>
              <p className="text-slate-500 text-xs sm:text-sm mt-1">Direct official brand stores indexed with zero marketplace markups</p>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 max-w-full no-scrollbar">
              {brandFilterCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedBrandCategory(cat)}
                  className={`px-4 py-2 rounded-full text-xs font-mono font-bold whitespace-nowrap transition-all cursor-pointer ${
                    selectedBrandCategory === cat
                      ? 'bg-[#6C3BFF] text-white shadow-md'
                      : 'bg-white border border-slate-200 text-slate-600 hover:border-purple-300 hover:text-slate-900'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Brands Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredBrands.map((brand) => (
              <motion.div
                key={brand.id}
                whileHover={{ y: -3 }}
                onClick={handleAction}
                className="bg-white border border-purple-100/90 rounded-[20px] p-4 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
              >
                <div>
                  {/* Brand Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <span className={`w-8 h-8 rounded-xl font-black text-xs flex items-center justify-center shrink-0 shadow-xs ${brand.logoBg}`}>
                        {brand.logoText}
                      </span>
                      <div>
                        <h3 className="font-extrabold text-slate-900 text-sm group-hover:text-[#6C3BFF] transition-colors">
                          {brand.name}
                        </h3>
                        <span className="text-[10px] text-slate-400 font-mono">{brand.category}</span>
                      </div>
                    </div>

                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold border ${brand.badgeBg}`}>
                      {brand.badge}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 font-medium line-clamp-1 mb-2">
                    {brand.tagline}
                  </p>

                  <div className="text-[11px] text-slate-500 font-mono bg-slate-50 p-2 rounded-xl border border-slate-100 mb-3 flex items-center justify-between">
                    <span className="truncate">{brand.items}</span>
                    <span className="text-emerald-600 font-bold shrink-0 ml-1">{brand.discount}</span>
                  </div>
                </div>

                {/* Shop Action Button */}
                <div className="w-full py-2 rounded-xl bg-slate-100 text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 group-hover:bg-[#6C3BFF] group-hover:text-white transition-all">
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>Shop {brand.name}</span>
                  <ExternalLink className="w-3 h-3 opacity-70" />
                </div>
              </motion.div>
            ))}
          </div>

        </div>

      </main>

      {/* FOOTER: With Brand Removal & Brand Addition Request Buttons */}
      <footer className="relative z-10 py-6 px-4 border-t border-purple-100 bg-white text-slate-500 text-xs font-mono">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span>© 2026 ShopScoper AI Inc. All rights reserved.</span>
          </div>

          {/* Brand Requests Links */}
          <div className="flex items-center gap-4 flex-wrap justify-center">
            <button
              onClick={() => setAdditionModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-50 hover:bg-purple-100 text-[#6C3BFF] font-bold text-xs transition-colors cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Add My Brand</span>
            </button>

            <span className="text-slate-300">•</span>

            <button
              onClick={() => setRemovalModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Remove Your Brand</span>
            </button>

            <span className="text-slate-300">•</span>

            <span className="text-slate-400">Virtual Try-On Enabled</span>
          </div>
        </div>
      </footer>

      {/* Brand Request Modals */}
      <BrandRequestModals
        removalOpen={removalModalOpen}
        additionOpen={additionModalOpen}
        onCloseRemoval={() => setRemovalModalOpen(false)}
        onCloseAddition={() => setAdditionModalOpen(false)}
      />

      {/* Shopify Connect Modal */}
      <AnimatePresence>
        {isShopifyConnectOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-6 overflow-y-auto"
          >
            <div className="relative w-full max-w-6xl max-h-[92vh] overflow-y-auto bg-slate-950 border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-2xl">
              <button
                onClick={() => setIsShopifyConnectOpen(false)}
                className="absolute top-4 right-4 z-10 p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              <ShopifyStoresPage />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

