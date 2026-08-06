import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Lock, ArrowRight, AlertCircle, Sparkles, ShieldCheck, Zap, Shirt, CheckCircle2, Globe, Star } from 'lucide-react';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { saveUserProfileToDb } from '../lib/firestoreService';
import { BrandLogo } from './BrandLogo';
import { UserSession } from '../types';

interface LoginPageProps {
  onLoginSuccess: (session: UserSession) => void;
  onNavigateHome: () => void;
  initialErrorMessage?: string | null;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onLoginSuccess,
  onNavigateHome,
  initialErrorMessage
}) => {
  const [error, setError] = useState<string | null>(initialErrorMessage || null);
  const [isLoading, setIsLoading] = useState(false);

  // Real Google OAuth Popup via Firebase Auth
  const handleRealGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const isAuthorizedAdmin = user.email?.trim().toLowerCase() === 'imamir760@gmail.com';

      const userSession: UserSession = {
        email: user.email?.trim().toLowerCase() || 'user@gmail.com',
        name: user.displayName || user.email?.split('@')[0] || 'Google User',
        role: isAuthorizedAdmin ? 'admin' : 'user',
        avatar: user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`
      };

      // Store authenticated user in Firestore database 'users' collection
      await saveUserProfileToDb(userSession);

      onLoginSuccess(userSession);
    } catch (err: any) {
      console.warn('Firebase Google Auth popup notice:', err);
      if (err?.code === 'auth/popup-closed-by-user') {
        setError('Google Sign-In window was closed. Please try again.');
      } else if (err?.code === 'auth/popup-blocked') {
        setError('Popup blocked by browser. Please allow popups to sign in with Google.');
      } else {
        setError('Unable to complete Google Sign-In. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9FF] text-slate-900 flex flex-col justify-center items-center px-3.5 sm:px-6 py-6 sm:py-12 relative overflow-x-hidden font-sans selection:bg-[#6C3BFF] selection:text-white">
      
      {/* 1. Background Atmosphere: Ambient Lavender & Pink Radial Blobs + Dot Grid Pattern */}
      <div className="fixed inset-0 pointer-events-none z-0">
        {/* Soft Lavender Radial Glow Top Center */}
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] sm:w-[900px] lg:w-[1200px] h-[400px] sm:h-[650px] bg-gradient-to-b from-[#F2E8FF] via-[#E8D8FF]/60 to-transparent rounded-full blur-2xl sm:blur-3xl opacity-80" />
        
        {/* Soft Pink Ambient Glow Top Right */}
        <div className="absolute top-5 right-[-60px] w-[350px] sm:w-[600px] lg:w-[800px] h-[350px] sm:h-[600px] bg-gradient-to-br from-[#FFF0F4] via-[#FFE2EB]/60 to-transparent rounded-full blur-2xl sm:blur-3xl opacity-70" />

        {/* Soft Purple Glow Bottom Left */}
        <div className="absolute bottom-[-80px] left-[-80px] w-[400px] sm:w-[700px] lg:w-[900px] h-[400px] sm:h-[700px] bg-gradient-to-tr from-[#F4EDFF] via-[#E6D9FF]/50 to-transparent rounded-full blur-2xl sm:blur-3xl opacity-80" />

        {/* Geometric Dot Grid Overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(#6C3BFF_1px,transparent_1px)] [background-size:20px_20px] sm:[background-size:28px_28px] opacity-[0.035]" />
      </div>

      {/* Main Login Container: Single Card on Mobile, Dual Column Showcase on Desktop (lg:) */}
      <div className="w-full max-w-[400px] sm:max-w-[560px] lg:max-w-5xl relative z-10 my-auto">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* DESKTOP EXCLUSIVE LEFT SHOWCASE PANEL (lg:block hidden - Mobile untouched!) */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="hidden lg:flex lg:col-span-6 flex-col justify-between p-8 xl:p-10 bg-gradient-to-br from-slate-950 via-indigo-950 to-purple-950 text-white rounded-[32px] border border-purple-500/25 shadow-2xl shadow-purple-950/30 relative overflow-hidden min-h-[580px]"
          >
            {/* Background Glow Mesh */}
            <div className="absolute -top-10 -right-10 w-64 h-64 bg-pink-500/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-64 h-64 bg-purple-500/30 rounded-full blur-3xl pointer-events-none" />

            {/* Top Brand & Badge Row */}
            <div className="relative z-10">
              <div 
                onClick={onNavigateHome}
                className="cursor-pointer mb-6 inline-block hover:opacity-90 transition-opacity"
              >
                <BrandLogo size="lg" className="brightness-200 invert-0" />
              </div>

              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-pink-300 font-mono text-xs font-bold mb-4">
                <Sparkles className="w-3.5 h-3.5 text-pink-400" />
                <span>AI D2C Fashion Search Engine</span>
              </div>

              <h2 className="text-3xl xl:text-4xl font-black text-white tracking-tight leading-tight">
                Discover Clothing &amp; Try On Outfits Virtually
              </h2>
              <p className="text-slate-300 text-sm mt-3 leading-relaxed">
                Unlock instant AI fitting across 50+ top D2C apparel brands including <strong>Snitch, Souled Store, Zara, H&amp;M, Nobero, and Veirdo</strong> with official store checkout.
              </p>
            </div>

            {/* Middle Feature Preview Graphic Card */}
            <div className="relative z-10 my-6 p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md shadow-lg">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-purple-300">
                    <Shirt className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Photorealistic AI Fitting</div>
                    <div className="text-[10px] text-slate-400 font-mono">99.4% Accurate Fit Simulation</div>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-mono text-[10px] font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Live Verified
                </span>
              </div>

              {/* D2C Brand Logos Strip */}
              <div className="flex items-center justify-between text-[11px] font-mono font-bold text-slate-300 pt-2 border-t border-white/10">
                <span className="px-2 py-0.5 rounded bg-white/10">SNITCH</span>
                <span className="px-2 py-0.5 rounded bg-white/10">ZARA</span>
                <span className="px-2 py-0.5 rounded bg-white/10">SOULED STORE</span>
                <span className="px-2 py-0.5 rounded bg-white/10">NOBERO</span>
              </div>
            </div>

            {/* Bottom Proof Stats Grid */}
            <div className="relative z-10 grid grid-cols-3 gap-3 pt-4 border-t border-white/10 text-center">
              <div>
                <div className="text-lg font-black text-white">50+</div>
                <div className="text-[10px] text-slate-400 font-mono">D2C Stores</div>
              </div>
              <div>
                <div className="text-lg font-black text-pink-300">Instant</div>
                <div className="text-[10px] text-slate-400 font-mono">AI Try-On</div>
              </div>
              <div>
                <div className="text-lg font-black text-emerald-300">0%</div>
                <div className="text-[10px] text-slate-400 font-mono">Price Markups</div>
              </div>
            </div>
          </motion.div>

          {/* LOGIN CARD PANEL (Identical layout on Mobile, optimized on Desktop) */}
          <div className="lg:col-span-6 w-full">
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="w-full bg-white/95 backdrop-blur-2xl border border-[#EEE8FF] rounded-[24px] sm:rounded-[32px] shadow-[0_12px_40px_rgba(108,59,255,0.06)] sm:shadow-[0_20px_70px_rgba(108,59,255,0.08)] p-5 xs:p-6 sm:p-10 lg:p-10 relative overflow-hidden"
            >
              {/* Top Subtle Light Accent Line */}
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-[#6C3BFF]/20 via-[#8B5CFF] to-[#FF2D55]/30" />

              {/* Header & Logo */}
              <div className="text-center flex flex-col items-center">
                
                {/* Logo Clickable - Scaled on mobile to ~190px */}
                <div 
                  onClick={onNavigateHome}
                  className="cursor-pointer mb-3.5 sm:mb-8 inline-flex items-center justify-center hover:scale-[1.02] transition-transform duration-200 max-w-[190px] sm:max-w-none lg:hidden"
                  title="Return to ShopScoper"
                >
                  <BrandLogo size="lg" />
                </div>

                {/* Sparkle Divider under Logo (Mobile view only) */}
                <div className="w-full max-w-[160px] sm:max-w-[220px] flex items-center justify-center gap-2.5 sm:gap-3 mb-3.5 sm:mb-8 lg:hidden">
                  <div className="h-px bg-gradient-to-r from-transparent via-purple-200 to-purple-200 flex-1" />
                  <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#6C3BFF]" />
                  <div className="h-px bg-gradient-to-l from-transparent via-purple-200 to-purple-200 flex-1" />
                </div>

                {/* Main Headline */}
                <h1 className="text-[30px] xs:text-[34px] sm:text-[40px] lg:text-[42px] font-extrabold text-slate-900 tracking-tight leading-[1.05] sm:leading-[1.1]">
                  Welcome to ShopScoper
                </h1>
                
                {/* Subtitle */}
                <p className="text-slate-500 text-[14px] sm:text-base mt-2 sm:mt-3 leading-snug sm:leading-relaxed max-w-[280px] sm:max-w-[420px] font-medium">
                  Sign in with Google to access your personalized discovery feed &amp; AI try-on studio.
                </p>
              </div>

              {/* Error Alert */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 sm:mt-6 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm flex items-center gap-2 font-medium"
                >
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>{error}</span>
                </motion.div>
              )}

              {/* Actions Section */}
              <div className="mt-5 sm:mt-8">
                
                {/* Google Login Button */}
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={handleRealGoogleLogin}
                  className="w-full h-[56px] sm:h-[68px] px-4 sm:px-6 rounded-[18px] sm:rounded-[20px] bg-white hover:bg-slate-50/80 active:scale-[0.98] text-slate-900 font-bold text-sm sm:text-lg shadow-[0_6px_24px_rgba(108,59,255,0.06)] hover:shadow-[0_12px_36px_rgba(108,59,255,0.12)] hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-between cursor-pointer disabled:opacity-50 border border-[#E8E8F5] group relative overflow-hidden"
                >
                  {isLoading ? (
                    <div className="w-full flex items-center justify-center gap-2.5 py-1">
                      <div className="w-4.5 h-4.5 border-2 border-purple-300 border-t-[#6C3BFF] rounded-full animate-spin" />
                      <span className="text-xs sm:text-base font-bold text-slate-800">Connecting to Google...</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3 sm:gap-4">
                        {/* Official Google Color SVG Icon */}
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 shadow-sm">
                          <svg className="w-4.5 h-4.5 sm:w-5.5 sm:h-5.5" viewBox="0 0 24 24">
                            <path
                              fill="#4285F4"
                              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            />
                            <path
                              fill="#34A853"
                              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            />
                            <path
                              fill="#FBBC05"
                              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                            />
                            <path
                              fill="#EA4335"
                              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                            />
                          </svg>
                        </div>
                        <span className="text-slate-900 font-extrabold text-sm sm:text-base lg:text-lg">
                          Continue with Google
                        </span>
                      </div>
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-purple-50 text-[#6C3BFF] flex items-center justify-center group-hover:bg-[#6C3BFF] group-hover:text-white transition-all">
                        <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </>
                  )}
                </button>

                {/* Streamlined Benefits Row - 3 Compact Side-by-Side Feature Columns */}
                <div className="grid grid-cols-3 gap-2 sm:gap-4 my-5 sm:my-8 text-center">
                  
                  {/* Card 1: 256-bit Encrypted */}
                  <div className="flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-2xl bg-[#FAF9FF]/80 sm:bg-transparent border border-purple-100/60 sm:border-none min-h-[80px] sm:min-h-0">
                    <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-purple-100/70 text-[#6C3BFF] flex items-center justify-center mb-1.5 sm:mb-2.5 shadow-sm shrink-0">
                      <ShieldCheck className="w-4 h-4 sm:w-5.5 sm:h-5.5" />
                    </div>
                    <div className="font-extrabold text-slate-900 text-[11px] xs:text-xs sm:text-sm leading-tight">256-bit Encrypted</div>
                    <div className="text-[10px] sm:text-xs text-slate-500 mt-0.5 leading-tight hidden xs:block">Your data is secure</div>
                  </div>

                  {/* Card 2: Instant Access */}
                  <div className="flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-2xl bg-[#FAF9FF]/80 sm:bg-transparent border border-purple-100/60 sm:border-none min-h-[80px] sm:min-h-0">
                    <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-pink-100/70 text-[#FF2D55] flex items-center justify-center mb-1.5 sm:mb-2.5 shadow-sm shrink-0">
                      <Zap className="w-4 h-4 sm:w-5.5 sm:h-5.5" />
                    </div>
                    <div className="font-extrabold text-slate-900 text-[11px] xs:text-xs sm:text-sm leading-tight">Instant Access</div>
                    <div className="text-[10px] sm:text-xs text-slate-500 mt-0.5 leading-tight hidden xs:block">Login in 1 click</div>
                  </div>

                  {/* Card 3: AI Powered */}
                  <div className="flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-2xl bg-[#FAF9FF]/80 sm:bg-transparent border border-purple-100/60 sm:border-none min-h-[80px] sm:min-h-0">
                    <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-purple-100/70 text-[#6C3BFF] flex items-center justify-center mb-1.5 sm:mb-2.5 shadow-sm shrink-0">
                      <Sparkles className="w-4 h-4 sm:w-5.5 sm:h-5.5" />
                    </div>
                    <div className="font-extrabold text-slate-900 text-[11px] xs:text-xs sm:text-sm leading-tight">AI Powered</div>
                    <div className="text-[10px] sm:text-xs text-slate-500 mt-0.5 leading-tight hidden xs:block">Smart &amp; personalized</div>
                  </div>

                </div>

                {/* Lock Divider Line */}
                <div className="relative border-t border-purple-100 flex items-center justify-center my-4 sm:my-6">
                  <div className="absolute bg-white px-2.5 sm:px-3 text-[#6C3BFF] flex items-center justify-center">
                    <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#6C3BFF]" />
                  </div>
                </div>

                {/* Return Link */}
                <div className="text-center pt-1 sm:pt-2">
                  <button
                    type="button"
                    onClick={onNavigateHome}
                    className="text-[#6C3BFF] hover:text-purple-800 font-bold text-xs sm:text-base hover:underline underline-offset-4 cursor-pointer inline-flex items-center gap-1.5 sm:gap-2 transition-all"
                  >
                    <span>← Return to Landing Page</span>
                  </button>
                </div>

              </div>
            </motion.div>
          </div>

        </div>

      </div>

    </div>
  );
};

