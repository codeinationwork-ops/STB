import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { AuthSuitePage } from './AuthSuitePage';
import { BrandLogo } from './BrandLogo';

interface AuthModalProps {
  isOpen: boolean;
  initialTab?: 'signup' | 'login' | 'customer';
  onClose: () => void;
  onAuthSuccess: (phoneNumber: string, shopDetails?: { shopName: string; ownerName: string }) => void;
  onCustomerAuthSuccess?: (customerPhone: string) => void;
  onNavigatePolicy?: (policy: 'terms' | 'privacy' | 'refund') => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  initialTab = 'login',
  onClose,
  onAuthSuccess,
  onCustomerAuthSuccess,
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
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      {/* Backdrop click handler */}
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog Card: Bottom sheet on mobile, rounded card on desktop */}
      <div className="relative w-full max-w-[460px] bg-white text-slate-900 rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden z-10 my-auto transform transition-all duration-200 scale-100 max-h-[92vh] sm:max-h-[88vh] flex flex-col">
        {/* Top Header Controls */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-3.5 bg-slate-900 text-white border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <BrandLogo size="xs" variant="white" />
            <div>
              <h3 className="text-xs font-black text-white tracking-tight uppercase">ShopScopers Secure Auth</h3>
              <p className="text-[10px] text-emerald-400 font-medium">Boutique & Client Authentication</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Close popup"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Modal Body: Embedded AuthSuitePage */}
        <div className="p-4 sm:p-5 overflow-y-auto overscroll-contain">
          <AuthSuitePage
            initialTab={initialTab}
            onAuthSuccess={(phone, details) => {
              onAuthSuccess(phone, details);
              onClose();
            }}
            onCustomerAuthSuccess={(custPhone) => {
              if (onCustomerAuthSuccess) {
                onCustomerAuthSuccess(custPhone);
              } else {
                onAuthSuccess(custPhone, { isCustomer: true, customerPhone: custPhone } as any);
              }
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
