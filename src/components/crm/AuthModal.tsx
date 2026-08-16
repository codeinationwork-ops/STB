import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { AuthSuitePage } from './AuthSuitePage';
import { BrandLogo } from './BrandLogo';

interface AuthModalProps {
  isOpen: boolean;
  initialTab?: 'signup' | 'login';
  onClose: () => void;
  onAuthSuccess: (phoneNumber: string, shopDetails?: { shopName: string; ownerName: string }) => void;
  onNavigatePolicy?: (policy: 'terms' | 'privacy' | 'refund') => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  initialTab = 'login',
  onClose,
  onAuthSuccess,
  onNavigatePolicy,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      {/* Backdrop click handler */}
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog Card */}
      <div className="relative w-full max-w-lg bg-white text-slate-900 rounded-3xl shadow-2xl border border-slate-200 overflow-hidden z-10 my-auto transform transition-all duration-200 scale-100">
        {/* Top Header Controls */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-emerald-950 to-[#0B4636] text-white border-b border-amber-300/20">
          <div className="flex items-center gap-2.5">
            <BrandLogo size="xs" variant="glass" />
            <div>
              <h3 className="text-xs font-black text-white tracking-tight uppercase">ShopScopers Secure Auth</h3>
              <p className="text-[10px] text-amber-300 font-medium">OTP Mobile Authentication</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Close popup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body: Embedded AuthSuitePage */}
        <div className="p-4 sm:p-6 max-h-[85vh] overflow-y-auto no-scrollbar">
          <AuthSuitePage
            initialTab={initialTab}
            onAuthSuccess={(phone, details) => {
              onAuthSuccess(phone, details);
              onClose();
            }}
            onBackToLanding={onClose}
            onNavigatePolicy={(policy) => {
              if (onNavigatePolicy) {
                onNavigatePolicy(policy);
                onClose();
              }
            }}
          />
        </div>
      </div>
    </div>
  );
};
