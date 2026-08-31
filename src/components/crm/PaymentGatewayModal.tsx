import React, { useState } from 'react';
import {
  ShieldCheck,
  X,
  Sparkles,
  ArrowRight,
  MessageSquare,
  ExternalLink,
  PhoneCall,
  CheckCircle2,
  Copy,
  Check,
} from 'lucide-react';
import { MONTHLY_PRICE, ANNUAL_PRICE } from '../../lib/subscriptionUtils';
import { ShopProfile } from '../../types';

interface PaymentGatewayModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPlan?: 'monthly' | 'annual';
  shopProfile: ShopProfile;
  onSuccess?: () => void;
}

export const PaymentGatewayModal: React.FC<PaymentGatewayModalProps> = ({
  isOpen,
  onClose,
  initialPlan = 'annual',
  shopProfile,
}) => {
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'annual'>(initialPlan);
  const [copiedPhone, setCopiedPhone] = useState(false);

  // Official Support WhatsApp & Phone
  const SUPPORT_WHATSAPP = '+917608807790';
  const SUPPORT_WHATSAPP_DISPLAY = '+91 76088 07790';

  if (!isOpen) return null;

  const currentPrice = selectedPlan === 'annual' ? ANNUAL_PRICE : MONTHLY_PRICE;

  const handleCopyPhone = () => {
    navigator.clipboard.writeText(SUPPORT_WHATSAPP);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2500);
  };

  const handleDirectWhatsAppConnect = () => {
    const planName =
      selectedPlan === 'annual'
        ? 'Annual Pro (₹1,999/yr - 365 Days Access)'
        : 'Monthly Pro (₹199/mo - 30 Days Access)';
    const text = `Hi ShopScopers Team! 👋\n\nI want to activate the *${planName}* for my boutique.\n\n🏪 *Boutique Name:* ${shopProfile.shopName}\n👤 *Owner Name:* ${shopProfile.ownerName}\n📱 *Registered Phone:* ${shopProfile.phoneNumber}\n💰 *Payable Amount:* ₹${currentPrice}\n\nPlease share the official UPI QR / payment details and activate my Pro subscription immediately.`;
    const cleanNumber = SUPPORT_WHATSAPP.replace(/\D/g, '');
    const url = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto font-sans">
      <div className="bg-white rounded-2xl sm:rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Header Bar */}
        <div className="bg-gradient-to-r from-[#0B4636] via-[#0d5945] to-slate-900 text-white px-5 py-4 relative">
          <button
            onClick={onClose}
            className="absolute top-3.5 right-3.5 p-1 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-1.5 mb-1">
            <span className="px-2 py-0.5 rounded-full bg-emerald-400/20 border border-emerald-400/30 text-[9px] font-black tracking-wide uppercase text-emerald-300">
              Verified Pro Plan
            </span>
            <span className="text-[10px] text-emerald-200/90 font-medium">Instant WhatsApp Activation</span>
          </div>

          <h2 className="text-base sm:text-lg font-black tracking-tight">Upgrade Boutique Portal</h2>
          <p className="text-[11px] text-emerald-100/85 mt-0.5 leading-snug">
            Unlock unlimited orders, multi-device cloud sync & instant customer WhatsApp slips.
          </p>
        </div>

        {/* Modal Content */}
        <div className="p-4 sm:p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Plan Selector */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                Select License Plan
              </label>
              <span className="text-[10px] text-emerald-700 font-semibold">1-Month Free Trial Over</span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {/* Annual Plan (1999) */}
              <div
                onClick={() => setSelectedPlan('annual')}
                className={`relative p-3 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                  selectedPlan === 'annual'
                    ? 'border-[#0B4636] bg-emerald-50/70 shadow-xs ring-1 ring-[#0B4636]'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="absolute -top-2.5 right-2 bg-amber-500 text-slate-950 text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full shadow-xs flex items-center gap-0.5">
                  <Sparkles className="w-2.5 h-2.5 fill-slate-950" />
                  <span>Best Value</span>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">Annual Pro</span>
                    <div
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        selectedPlan === 'annual' ? 'border-[#0B4636] bg-[#0B4636]' : 'border-slate-300'
                      }`}
                    >
                      {selectedPlan === 'annual' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                  </div>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-xl font-black text-slate-900">₹{ANNUAL_PRICE}</span>
                    <span className="text-[10px] text-slate-500 font-medium">/ yr</span>
                  </div>
                  <p className="text-[10px] text-emerald-800 font-bold mt-0.5">
                    ₹166/mo &bull; 365 Days Access
                  </p>
                </div>
              </div>

              {/* Monthly Plan (199) */}
              <div
                onClick={() => setSelectedPlan('monthly')}
                className={`relative p-3 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                  selectedPlan === 'monthly'
                    ? 'border-[#0B4636] bg-emerald-50/70 shadow-xs ring-1 ring-[#0B4636]'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">Monthly Pro</span>
                    <div
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        selectedPlan === 'monthly' ? 'border-[#0B4636] bg-[#0B4636]' : 'border-slate-300'
                      }`}
                    >
                      {selectedPlan === 'monthly' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                  </div>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-xl font-black text-slate-900">₹{MONTHLY_PRICE}</span>
                    <span className="text-[10px] text-slate-500 font-medium">/ mo</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Flexible &bull; 30 Days Access
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Pro Benefits Checklist */}
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-xs space-y-1.5">
            <div className="font-bold text-slate-800 text-[11px] mb-1">What's included in Pro:</div>
            <div className="grid grid-cols-1 gap-1 text-[11px] text-slate-700">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                <span>Unlimited Bespoke Orders, Alterations & Sales</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                <span>Customer WhatsApp Receipts & Status Updates</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                <span>Real-Time Cloud Firestore Sync Across All Devices</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                <span>Dedicated Priority Tailor CRM Support Desk</span>
              </div>
            </div>
          </div>

          {/* Direct WhatsApp Concierge CTA Card */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-100/70 border border-emerald-300 shadow-2xs space-y-2.5">
            <div className="flex items-start gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#25D366] text-white flex items-center justify-center shrink-0 shadow-xs">
                <MessageSquare className="w-5 h-5 fill-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-black text-emerald-950">WhatsApp Concierge Activation</span>
                  <span className="text-[9px] font-black uppercase bg-emerald-200 text-emerald-900 px-1.5 py-0.5 rounded">Instant</span>
                </div>
                <p className="text-[11px] text-emerald-900/90 mt-0.5 leading-snug">
                  Click below to message our activation desk. We will immediately provide the live UPI QR code and verify your Pro license.
                </p>
              </div>
            </div>

            {/* Direct WhatsApp Action Button */}
            <button
              type="button"
              onClick={handleDirectWhatsAppConnect}
              className="w-full py-3 px-4 rounded-xl bg-[#25D366] hover:bg-[#1ebc56] text-slate-950 font-black text-xs sm:text-sm shadow-sm hover:shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98"
            >
              <MessageSquare className="w-4 h-4 fill-slate-950" />
              <span>Connect on WhatsApp ({SUPPORT_WHATSAPP_DISPLAY})</span>
              <ArrowRight className="w-4 h-4 text-slate-950" />
            </button>
          </div>

          {/* Help & Contact Options */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <button
              type="button"
              onClick={handleCopyPhone}
              className="text-[11px] font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
            >
              {copiedPhone ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedPhone ? 'Copied Number!' : 'Copy Support Phone'}</span>
            </button>

            <a
              href={`tel:${SUPPORT_WHATSAPP}`}
              className="text-[11px] font-bold text-emerald-800 hover:text-emerald-900 flex items-center gap-1"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>Direct Call</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

