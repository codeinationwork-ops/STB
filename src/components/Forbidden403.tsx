import React from 'react';
import { motion } from 'motion/react';
import { ShieldAlert, ArrowLeft, LogOut, Lock } from 'lucide-react';
import { UserSession } from '../types';

interface Forbidden403Props {
  currentUser: UserSession | null;
  onNavigateHome: () => void;
  onLogout: () => void;
  onSwitchUser: () => void;
}

export const Forbidden403: React.FC<Forbidden403Props> = ({
  currentUser,
  onNavigateHome,
  onLogout,
  onSwitchUser
}) => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden font-sans">
      
      {/* Background Red Glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-rose-600/15 rounded-full blur-[160px]" />
      </div>

      <div className="w-full max-w-lg relative z-10 text-center">
        
        {/* Shield Icon Header */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-20 h-20 rounded-3xl bg-rose-500/10 border border-rose-500/30 text-rose-500 flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-rose-600/20"
        >
          <ShieldAlert className="w-10 h-10 animate-pulse" />
        </motion.div>

        <span className="px-3 py-1 rounded-full bg-rose-500/20 text-rose-400 font-mono text-xs font-bold uppercase tracking-widest border border-rose-500/30">
          403 Access Forbidden
        </span>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mt-4">
          Access Restricted
        </h1>

        <p className="text-slate-300 text-sm sm:text-base mt-3 max-w-md mx-auto leading-relaxed">
          You do not have permission to access the admin panel.
        </p>

        {/* Logged in User Badge */}
        {currentUser && (
          <div className="mt-6 p-4 rounded-2xl bg-slate-900 border border-slate-800 inline-block text-left text-xs max-w-xs w-full">
            <div className="text-slate-400 font-mono text-[11px]">Currently signed in as:</div>
            <div className="font-bold text-slate-200 text-sm font-mono truncate mt-0.5">{currentUser.email}</div>
            <div className="text-rose-400 text-[11px] font-mono mt-1 flex items-center gap-1">
              <Lock className="w-3 h-3" />
              <span>Not in Admin Whitelist (imamir760@gmail.com)</span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 max-w-sm mx-auto">
          <button
            onClick={onNavigateHome}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-mono font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer border border-slate-700"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Main Store</span>
          </button>

          <button
            onClick={onSwitchUser}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-mono font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-rose-600/20"
          >
            <LogOut className="w-4 h-4" />
            <span>Switch / Login as Admin</span>
          </button>
        </div>

      </div>
    </div>
  );
};
